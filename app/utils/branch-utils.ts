// app/utils/branch-utils.ts
import type { Branch } from "@prisma/client";

// Default branch data for initial setup
export const DEFAULT_BRANCHES = [
  {
    name: "الدهان",
    description: "فرع الدهان الرئيسي",
    deviceId: "device_dahan_main"
  },
  {
    name: "النخيل",
    description: "فرع النخيل",
    deviceId: "device_nakheel_main"
  },
  {
    name: "الزيت",
    description: "فرع الزيت",
    deviceId: "device_zait_main"
  }
];

// Get branch by ID from array of branches
export function getBranchById(branches: Branch[], branchId: string): Branch | undefined {
  return branches.find(branch => branch.id === branchId);
}

// Get browser's language preference for default branch selection
export function getBrowserLanguage(): string {
  if (typeof navigator === "undefined") return "en";

  return (
    navigator.language ||
    (navigator as any).userLanguage ||
    (navigator as any).browserLanguage ||
    "en"
  );
}

// Format branch information for display
export function formatBranchInfo(branch: Branch): { label: string; info: string } {
  return {
    label: branch.name,
    info: branch.description || ""
  };
}

// Check if a device ID is registered to a specific branch
export function isDeviceRegisteredToBranch(deviceId: string, branch: Branch): boolean {
  return branch.deviceId === deviceId;
}

// Generate a unique device ID
export function generateDeviceId(): string {
  const timestamp = new Date().getTime();
  const random = Math.floor(Math.random() * 1000000);
  return `device_${timestamp}_${random}`;
}

// Check if local storage is available
export function isLocalStorageAvailable(): boolean {
  try {
    const testKey = "__test__";
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
}

// Save selected branch to local storage
export function saveSelectedBranch(branchId: string): void {
  if (isLocalStorageAvailable()) {
    localStorage.setItem("selectedBranchId", branchId);
  }
}

// Get selected branch from local storage
export function getSelectedBranch(): string | null {
  if (!isLocalStorageAvailable()) return null;

  return localStorage.getItem("selectedBranchId");
}

// Clear selected branch from local storage
export function clearSelectedBranch(): void {
  if (isLocalStorageAvailable()) {
    localStorage.removeItem("selectedBranchId");
  }
}
