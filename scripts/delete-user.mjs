import { readFileSync } from "fs";
import pg from "pg";

const EMAIL = "test@saudia.com";

// Parse DATABASE_URL from .env.local (production Supabase)
const envLocal = readFileSync(".env.local", "utf8");
const match = envLocal.match(/^DATABASE_URL\s*=\s*"?([^\s"]+)/m);
if (!match) { console.error("DATABASE_URL not found in .env.local"); process.exit(1); }

const DATABASE_URL = match[1];
const pool = new pg.Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function main() {
  const { rows } = await pool.query(
    `SELECT id, "firstName", "lastName", email FROM "User" WHERE email = $1`, [EMAIL]
  );
  if (rows.length === 0) { console.log(`No user found with email: ${EMAIL}`); return; }

  const user = rows[0];
  const uid = user.id;
  console.log(`Found user: ${user.firstName} ${user.lastName} (${user.email}) — id: ${uid}`);
  console.log("Deleting all related data inside a transaction...\n");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const del = async (label, sql, params) => {
      const r = await client.query(sql, params);
      console.log(`  ${label.padEnd(30)} ${r.rowCount}`);
    };

    await del("Messages (sent):", `DELETE FROM "Message" WHERE "senderId" = $1`, [uid]);

    const convRes = await client.query(
      `SELECT id FROM "Conversation" WHERE "initiatorId" = $1 OR "tradeOwnerId" = $1 OR "postOwnerId" = $1`, [uid]
    );
    const convoIds = convRes.rows.map(r => r.id);
    if (convoIds.length > 0) {
      await del("Messages (in user convos):", `DELETE FROM "Message" WHERE "conversationId" = ANY($1)`, [convoIds]);
      await del("Conversations:", `DELETE FROM "Conversation" WHERE id = ANY($1)`, [convoIds]);
    }

    await del("Matches:", `DELETE FROM "Match" WHERE "offererId" = $1 OR "receiverId" = $1`, [uid]);

    const postRes = await client.query(`SELECT id FROM "SwapPost" WHERE "userId" = $1`, [uid]);
    const postIds = postRes.rows.map(r => r.id);
    if (postIds.length > 0) {
      await del("MatchCache (by post):", `DELETE FROM "MatchCache" WHERE "postId" = ANY($1)`, [postIds]);
      await del("SwapPostTrips:", `DELETE FROM "SwapPostTrip" WHERE "swapPostId" = ANY($1)`, [postIds]);
    }
    await del("MatchCache (as viewer):", `DELETE FROM "MatchCache" WHERE "viewerId" = $1`, [uid]);

    await del("SwapPosts:", `DELETE FROM "SwapPost" WHERE "userId" = $1`, [uid]);
    await del("Trades:", `DELETE FROM "Trade" WHERE "userId" = $1`, [uid]);
    await del("LineSwapPosts:", `DELETE FROM "LineSwapPost" WHERE "userId" = $1`, [uid]);
    await del("Notifications:", `DELETE FROM "Notification" WHERE "userId" = $1`, [uid]);

    const fbRes = await client.query(`SELECT id FROM "Feedback" WHERE "userId" = $1`, [uid]);
    const fbIds = fbRes.rows.map(r => r.id);
    if (fbIds.length > 0) {
      await del("FeedbackMessages:", `DELETE FROM "FeedbackMessage" WHERE "feedbackId" = ANY($1)`, [fbIds]);
    }
    await del("Feedback:", `DELETE FROM "Feedback" WHERE "userId" = $1`, [uid]);
    await del("FeedbackMessages (sent):", `DELETE FROM "FeedbackMessage" WHERE "senderId" = $1`, [uid]);

    await del("AppEvents:", `DELETE FROM "AppEvent" WHERE "userId" = $1`, [uid]);
    await del("UserSessions:", `DELETE FROM "UserSession" WHERE "userId" = $1`, [uid]);
    await del("UserQualifications:", `DELETE FROM "UserQualification" WHERE "userId" = $1`, [uid]);

    const schedRes = await client.query(`SELECT id FROM "Schedule" WHERE "userId" = $1`, [uid]);
    const schedIds = schedRes.rows.map(r => r.id);
    if (schedIds.length > 0) {
      const tripRes = await client.query(`SELECT id FROM "ScheduleTrip" WHERE "scheduleId" = ANY($1)`, [schedIds]);
      const tripIds = tripRes.rows.map(r => r.id);
      if (tripIds.length > 0) {
        await del("ScheduleTripLegs:", `DELETE FROM "ScheduleTripLeg" WHERE "scheduleTripId" = ANY($1)`, [tripIds]);
        await del("ScheduleTripLayovers:", `DELETE FROM "ScheduleTripLayover" WHERE "scheduleTripId" = ANY($1)`, [tripIds]);
      }
      await del("ScheduleTrips:", `DELETE FROM "ScheduleTrip" WHERE "scheduleId" = ANY($1)`, [schedIds]);
      await del("Schedules:", `DELETE FROM "Schedule" WHERE id = ANY($1)`, [schedIds]);
    }

    await del("AccountFlags:", `DELETE FROM "AccountFlag" WHERE "userId" = $1`, [uid]);
    await del("TrialRewards:", `DELETE FROM "TrialReward" WHERE "userId" = $1`, [uid]);
    await del("Referrals:", `DELETE FROM "Referral" WHERE "referrerUserId" = $1 OR "referredUserId" = $1`, [uid]);

    await client.query(`UPDATE "Feedback" SET "assigneeId" = NULL WHERE "assigneeId" = $1`, [uid]);
    await del("EmailVerificationCodes:", `DELETE FROM "EmailVerificationCode" WHERE "userId" = $1`, [uid]);
    await del("PasswordResetTokens:", `DELETE FROM "PasswordResetToken" WHERE "userId" = $1`, [uid]);
    await del("AdminActions (actor):", `DELETE FROM "AdminAction" WHERE "adminUserId" = $1`, [uid]);
    await client.query(`UPDATE "AdminAction" SET "targetUserId" = NULL WHERE "targetUserId" = $1`, [uid]);

    await client.query(`DELETE FROM "User" WHERE id = $1`, [uid]);
    console.log(`\n  User DELETED: ${user.email}`);

    await client.query("COMMIT");
    console.log("\nDone. All data for this account has been removed.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Transaction failed, rolled back:", err);
  } finally {
    client.release();
  }
}

main().catch(console.error).finally(() => pool.end());
