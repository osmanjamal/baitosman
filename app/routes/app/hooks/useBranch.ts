import { useState, useEffect, useCallback } from "react";
import type { Branch } from "@prisma/client";

interface UseBranchOptions {
  initialBranchId?: string;
  saveToStorage?: boolean;
}

export function useBranch(options: UseBranchOptions = {}) {
  const { initialBranchId, saveToStorage = true } = options;

  // Initialize from localStorage if available
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(() => {
    if (typeof window === "undefined") return initialBranchId || null;

    const storedBranchId = window.localStorage.getItem("selectedBranchId");
    return storedBranchId || initialBranchId || null;
  });

  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all branches
  const fetchBranches = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/branches");

      if (!response.ok) {
        throw new Error("Failed to fetch branches");
      }

      const data = await response.json();
      setBranches(data.branches || []);

      // If no branch is selected but we have branches, select first one
      if (!selectedBranchId && data.branches.length > 0) {
        const defaultBranch = data.branches[0];
        setSelectedBranchId(defaultBranch.id);

        if (saveToStorage && typeof window !== "undefined") {
          window.localStorage.setItem("selectedBranchId", defaultBranch.id);
        }
      }
    } catch (err) {
      console.error("Error fetching branches:", err);
      setError("Failed to load branches. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  }, [selectedBranchId, saveToStorage]);

  // Select a branch
  const selectBranch = useCallback((branchId: string) => {
    setSelectedBranchId(branchId);

    if (saveToStorage && typeof window !== "undefined") {
      window.localStorage.setItem("selectedBranchId", branchId);
    }
  }, [saveToStorage]);

  // Get the currently selected branch
  const getSelectedBranch = useCallback(() => {
    if (!selectedBranchId) return null;
    return branches.find(branch => branch.id === selectedBranchId) || null;
  }, [branches, selectedBranchId]);

  // Fetch branches on mount
  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  return {
    branches,
    selectedBranchId,
    selectedBranch: getSelectedBranch(),
    selectBranch,
    isLoading,
    error,
    refetchBranches: fetchBranches
  };
}
