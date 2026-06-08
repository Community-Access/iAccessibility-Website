"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, hasDatabase } from "@/db";
import { users } from "@/db/schema";
import { canAdmin, getCurrentAppUser, type AppRole } from "@/lib/auth/server";

const ROLES = ["admin", "moderator", "member"] as const;

export type UpdateUserRoleState = {
  status: "idle" | "success" | "error";
  message: string;
};

export const initialUpdateUserRoleState: UpdateUserRoleState = {
  status: "idle",
  message: ""
};

function roleFromForm(value: FormDataEntryValue | null): AppRole | null {
  return typeof value === "string" && ROLES.includes(value as AppRole)
    ? (value as AppRole)
    : null;
}

export async function updateUserRole(
  _state: UpdateUserRoleState,
  formData: FormData
): Promise<UpdateUserRoleState> {
  const currentUser = await getCurrentAppUser();

  if (!currentUser || !canAdmin(currentUser.role)) {
    return {
      status: "error",
      message: "You are not authorized to manage users."
    };
  }

  if (!hasDatabase || !db) {
    return { status: "error", message: "Database is not configured." };
  }

  const userId = Number(formData.get("id"));
  const role = roleFromForm(formData.get("role"));

  if (!Number.isInteger(userId) || userId <= 0 || !role) {
    return { status: "error", message: "Choose a valid user and role." };
  }

  if (userId === currentUser.id && role !== "admin") {
    return {
      status: "error",
      message: "You cannot remove your own administrator access."
    };
  }

  await db
    .update(users)
    .set({ role, updatedAt: new Date() })
    .where(eq(users.id, userId));

  revalidatePath("/admin");
  revalidatePath("/admin/users");

  return { status: "success", message: "Role updated." };
}
