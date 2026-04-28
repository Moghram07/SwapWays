"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import type { UserAccess } from "@/utils/featureGates";

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(`Failed to fetch ${url}`);
  return res.json();
};

type UserAccessResponse = {
  data?: UserAccess;
  error?: string | null;
  meta?: { degraded?: boolean };
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
  const [lastStableAccess, setLastStableAccess] = useState<UserAccess | undefined>(undefined);

  useEffect(() => {
    const isDegraded = data?.error === "ServiceUnavailable" || data?.meta?.degraded === true;
    if (!isDegraded && data?.data) {
      setLastStableAccess(data.data);
    }
  }, [data]);

  const access = useMemo(() => {
    const isDegraded = data?.error === "ServiceUnavailable" || data?.meta?.degraded === true;
    return !isDegraded && data?.data ? data.data : lastStableAccess;
  }, [data, lastStableAccess]);

  return {
    access,
    isLoading,
    error,
    refreshAccess: mutate,
  };
}
