"use client";

import { useEffect, useState } from "react";

type Device = "ios" | "android";

export default function InstallGuidePage() {
  const [device, setDevice] = useState<Device>("ios");
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    if (/android/.test(ua)) setDevice("android");
    else setDevice("ios");

    const handleInstalled = () => {
      setIsInstalled(true);
    };

    window.addEventListener("appinstalled", handleInstalled);

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  if (isInstalled) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="mb-4 text-5xl">✅</div>
        <h1 className="mb-2 text-2xl font-bold text-content">SwapWays is installed!</h1>
        <p className="text-content-soft">
          You&apos;re using the installed version. Enjoy the fast experience and share feedback to help us improve.
        </p>
        <p className="mt-3 text-sm text-muted">All features are unlocked for everyone during free beta.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4">
      <h1 className="mb-2 text-2xl font-bold text-content">Install SwapWays on your phone</h1>
      <p className="mb-6 text-sm text-content-soft">
        Add SwapWays to your home screen. It opens instantly like a regular app - no App Store
        download needed.
      </p>

      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setDevice("ios")}
          className={`flex-1 rounded-lg py-2.5 text-sm font-medium ${
            device === "ios" ? "bg-[#2668B0] text-white" : "bg-surface-2 text-muted"
          }`}
        >
          📱 iPhone / iPad
        </button>
        <button
          onClick={() => setDevice("android")}
          className={`flex-1 rounded-lg py-2.5 text-sm font-medium ${
            device === "android" ? "bg-[#3BA34A] text-white" : "bg-surface-2 text-muted"
          }`}
        >
          🤖 Android
        </button>
      </div>

      {device === "ios" && (
        <div className="space-y-4">
          <Step number={1} title="Open SwapWays in Safari">
            This only works in Safari on iPhone, not Chrome or other browsers.
          </Step>
          <Step number={2} title="Tap the Share button">
            At the bottom of Safari, tap the Share icon - the square with an arrow pointing up.
          </Step>
          <Step number={3} title="Tap 'Add to Home Screen'">
            Scroll down in the share menu until you see &quot;Add to Home Screen&quot; and tap
            it.
          </Step>
          <Step number={4} title="Tap 'Add' in the top right">
            You&apos;ll see a preview of the SwapWays icon. Tap &quot;Add&quot; to confirm.
          </Step>
          <Step number={5} title="Done - open SwapWays from your home screen">
            The icon is now on your home screen. Tap it anytime to open SwapWays in full screen.
          </Step>
        </div>
      )}

      {device === "android" && (
        <div className="space-y-4">
          <Step number={1} title="Open SwapWays in Chrome">
            Make sure you&apos;re using Chrome. Other browsers may not show the install option.
          </Step>
          <Step number={2} title="Tap the three-dot menu">
            At the top right of Chrome, tap the menu button (⋮).
          </Step>
          <Step number={3} title="Tap 'Install app' or 'Add to Home screen'">
            Look for &quot;Install app&quot; or &quot;Add to Home screen&quot; in the menu and
            tap it.
          </Step>
          <Step number={4} title="Tap 'Install' to confirm">
            Chrome will add SwapWays to your home screen.
          </Step>
          <Step number={5} title="Done - find SwapWays on your home screen">
            Tap the SwapWays icon on your home screen to open the app in full screen.
          </Step>
        </div>
      )}

      <div className="mt-8 rounded-xl bg-brand-blue-soft p-5">
        <h3 className="mb-2 font-semibold text-[#2668B0]">Why install SwapWays?</h3>
        <ul className="space-y-1.5 text-sm text-content-soft">
          <li>⚡ Opens instantly, no browser bar</li>
          <li>🏠 One-tap access from your home screen</li>
          <li>📱 Feels like a regular app</li>
          <li>🔔 Push notifications (coming soon)</li>
        </ul>
      </div>
    </div>
  );
}

function Step({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#2668B0] text-sm font-bold text-white">
        {number}
      </div>
      <div className="flex-1">
        <h3 className="mb-1 font-semibold text-content">{title}</h3>
        <div className="text-sm text-muted">{children}</div>
      </div>
    </div>
  );
}
