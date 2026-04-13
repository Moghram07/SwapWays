"use client";

import useSWR from "swr";
import type { UserAccess } from "@/utils/featureGates";

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(`Failed to fetch ${url}`);
  return res.json();
};

type UserAccessResponse = {
  data?: UserAccess;
};

export function useUserAccess() {
  const { data, error, isLoading, mutate } = useSWR<UserAccessResponse>(
    "/api/user/access",
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60_000,
    }
  );

  return {
    access: data?.data,
    isLoading,
    error,
    refreshAccess: mutate,
  };
}
