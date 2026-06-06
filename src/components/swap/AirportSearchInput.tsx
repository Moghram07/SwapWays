"use client";

import { useState, useRef, useEffect } from "react";

export interface AirportOption {
  code: string;
  city: string;
}

interface AirportSearchInputProps {
  airports: AirportOption[];
  value: string;
  onChange: (code: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

export function AirportSearchInput({
  airports,
  value,
  onChange,
  placeholder = "Search by city or code…",
  className = "",
  required,
}: AirportSearchInputProps) {
  const selected = airports.find((a) => a.code === value);
  const [query, setQuery] = useState(selected ? `${selected.code} – ${selected.city}` : "");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = query.trim()
    ? airports.filter((a) => {
        const q = query.toLowerCase();
        return a.code.toLowerCase().includes(q) || a.city.toLowerCase().includes(q);
      })
    : airports;

  useEffect(() => {
    const current = airports.find((a) => a.code === value);
    setQuery(current ? `${current.code} – ${current.city}` : "");
  }, [value, airports]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        const current = airports.find((a) => a.code === value);
        setQuery(current ? `${current.code} – ${current.city}` : "");
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [value, airports]);

  function select(code: string, city: string) {
    onChange(code);
    setQuery(`${code} – ${city}`);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <input
        type="text"
        value={query}
        required={required && !value}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          if (!e.target.value.trim()) onChange("");
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-content focus:outline-none focus:ring-1 focus:ring-[#2668B0]"
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-line bg-surface shadow-lg">
          {filtered.slice(0, 60).map((a) => (
            <li key={a.code}>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface-2"
                onMouseDown={(e) => { e.preventDefault(); select(a.code, a.city); }}
              >
                <span className="font-semibold text-content">{a.code}</span>
                <span className="text-muted">{a.city}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
