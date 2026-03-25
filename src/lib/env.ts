export function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

export function assertProductionEnvSafety(required: string[] = []) {
  if (process.env.NODE_ENV !== "production") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  for (const name of required) {
    if (!process.env[name]) {
      throw new Error(`${name} must be configured in production.`);
    }
  }

  if (process.env.ALLOW_ANY_EMAIL_FOR_TESTING === "true") {
    throw new Error("ALLOW_ANY_EMAIL_FOR_TESTING must never be true in production.");
  }
}

export function assertStrongSecret(name: string, minLength = 32) {
  if (process.env.NODE_ENV !== "production") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required in production.`);
  }
  if (value.length < minLength) {
    throw new Error(`${name} must be at least ${minLength} characters in production.`);
  }
}

