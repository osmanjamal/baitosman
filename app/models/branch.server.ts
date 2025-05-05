import { prisma } from "~/db.server";
import type { Branch } from "@prisma/client";

export async function getAllBranches() {
  return prisma.branch.findMany();
}

export async function getBranchById(id: string) {
  return prisma.branch.findUnique({
    where: { id },
    include: { menuItems: true }
  });
}

export async function getBranchByDeviceId(deviceId: string) {
  return prisma.branch.findUnique({
    where: { deviceId }
  });
}

export async function createBranch(data: Pick<Branch, "name" | "description" | "address" | "deviceId">) {
  return prisma.branch.create({
    data
  });
}

export async function updateBranch(id: string, data: Partial<Pick<Branch, "name" | "description" | "address" | "deviceId">>) {
  return prisma.branch.update({
    where: { id },
    data
  });
}
