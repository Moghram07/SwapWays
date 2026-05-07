"use client";

interface NotesDisplayProps {
  notes: string | null;
  isTruncated: boolean;
  onUpgradeClick?: () => void;
}

export function NotesDisplay({ notes, isTruncated, onUpgradeClick }: NotesDisplayProps) {
  if (!notes) return null;

  return (
    <div className="border-t border-slate-100 px-2.5 py-1.5 sm:px-3 sm:py-2">
      <p className="relative text-sm italic text-slate-600">
        &quot;{notes}
        {isTruncated && (
          <>
            <span className="select-none blur-[2px]"> hidden content hidden content hidden content</span>
            {onUpgradeClick && (
              <button
                onClick={onUpgradeClick}
                className="ms-1 text-xs font-semibold not-italic text-[#2668B0] hover:underline"
              >
                Upgrade to read
              </button>
            )}
          </>
        )}
        {!isTruncated && "\""}
      </p>
    </div>
  );
}
