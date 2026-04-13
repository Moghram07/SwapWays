import type { ReactNode } from "react";

function FeatureRow({ icon, children }: { icon: string; children: ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="text-lg">{icon}</span>
      <span className="text-sm text-gray-700">{children}</span>
    </li>
  );
}

export default function UpgradePage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-2 text-center text-3xl font-bold text-gray-900">Upgrade to Premium</h1>
      <p className="mb-8 text-center text-gray-700">
        Get the most out of SwapWays with unlimited features
      </p>

      <div className="mx-auto mb-8 max-w-md rounded-2xl border-2 border-[#2668B0] bg-white p-8 shadow-lg">
        <div className="mb-6 text-center">
          <span className="mb-3 inline-block rounded-full bg-[#E3EFF9] px-3 py-1 text-xs font-semibold text-[#2668B0]">
            MOST POPULAR
          </span>
          <h2 className="mb-1 text-2xl font-bold text-gray-900">Premium</h2>
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-4xl font-bold text-gray-900">30</span>
            <span className="text-gray-500">SR / month</span>
          </div>
        </div>

        <ul className="mb-6 space-y-3">
          <FeatureRow icon="🎯">Exact match percentages with detailed breakdown</FeatureRow>
          <FeatureRow icon="💬">Unlimited parallel conversations</FeatureRow>
          <FeatureRow icon="📋">Post line swaps (whole-month trades)</FeatureRow>
          <FeatureRow icon="🏖️">Post vacation swaps</FeatureRow>
          <FeatureRow icon="📝">Full notes visible on all swap cards</FeatureRow>
          <FeatureRow icon="📅">Posts stay active until trip date (not 7 days)</FeatureRow>
          <FeatureRow icon="⭐">Priority placement on Trade Board</FeatureRow>
          <FeatureRow icon="🔔">Push notifications for 70%+ matches</FeatureRow>
          <FeatureRow icon="🔍">Advanced Trade Board filters</FeatureRow>
          <FeatureRow icon="📂">Unlimited schedule uploads per month</FeatureRow>
        </ul>

        <button
          disabled
          className="w-full cursor-not-allowed rounded-xl bg-gray-300 py-3 font-medium text-gray-700"
        >
          Upgrade Coming Soon
        </button>
        <p className="mt-2 text-center text-xs text-gray-500">Payments will be available at launch</p>
      </div>

      <div className="mx-auto max-w-md rounded-xl bg-gray-50 p-6 text-center">
        <h3 className="mb-3 font-semibold text-gray-900">Free Tier includes:</h3>
        <ul className="space-y-1.5 text-left text-sm text-gray-700">
          <li>✓ Post unlimited trip swaps</li>
          <li>✓ Browse Trade Board</li>
          <li>✓ 1 active conversation at a time</li>
          <li>✓ Upload 1 schedule per month</li>
          <li>✓ Basic match indicators (low/medium/high)</li>
          <li className="text-gray-500">✗ Line & vacation swaps</li>
          <li className="text-gray-500">✗ Exact match percentages</li>
          <li className="text-gray-500">✗ Full notes on posts</li>
        </ul>
      </div>
    </div>
  );
}
