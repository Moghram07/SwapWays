import { create } from "zustand";

type TimeFormat = "zulu" | "local";

interface TimeFormatStore {
  format: TimeFormat;
  toggle: () => void;
  setFormat: (format: TimeFormat) => void;
}

export const useTimeFormat = create<TimeFormatStore>((set) => ({
  format: "local",
  toggle: () =>
    set((state) => ({
      format: state.format === "zulu" ? "local" : "zulu",
    })),
  setFormat: (format) => set({ format }),
}));

