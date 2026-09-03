"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type ActiveRepo = {
  id: number;
  name: string;
  url: string;
  language: string;
  framework: string;
  local_path: string;
};

type RepoContextType = {
  activeRepo: ActiveRepo | null;
  setActiveRepo: (repo: ActiveRepo | null) => void;
  clearActiveRepo: () => void;
};

const STORAGE_KEY = "repomind_active_repo";

const RepoContext = createContext<RepoContextType>({
  activeRepo: null,
  setActiveRepo: () => {},
  clearActiveRepo: () => {},
});

export function RepoProvider({ children }: { children: React.ReactNode }) {
  const [activeRepo, setActiveRepoState] = useState<ActiveRepo | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setActiveRepoState(JSON.parse(stored));
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  const setActiveRepo = (repo: ActiveRepo | null) => {
    setActiveRepoState(repo);
    if (repo) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(repo));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const clearActiveRepo = () => setActiveRepo(null);

  return <RepoContext.Provider value={{ activeRepo, setActiveRepo, clearActiveRepo }}>{children}</RepoContext.Provider>;
}

export function useRepo() {
  return useContext(RepoContext);
}
