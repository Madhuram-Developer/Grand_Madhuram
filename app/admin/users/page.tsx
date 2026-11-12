import { UsersPanel } from "@/components/admin/Panels";
import { connection } from "next/server";
import { requirePerm } from "@/lib/auth";
import { plain } from "@/lib/data";
import { db } from "@/lib/db";
import { PERMISSIONS, User } from "@/lib/models";

export default async function Users() {
  await connection(); // per-request page: lets auth + data load in parallel below
  await db();
  const [, docs] = await Promise.all([requirePerm("users"), User.find().select("-passwordHash").sort({ role: -1, username: 1 }).lean()]);
  const users = plain(docs);
  return (
    <div className="grid max-w-4xl gap-4">
      <h1 className="text-xl font-bold">Users</h1>
      <UsersPanel
        allPerms={PERMISSIONS}
        users={users.map((u) => ({ id: u._id, username: u.username, role: u.role ?? "admin", permissions: u.permissions ?? [], active: !!u.active, lastLoginAt: u.lastLoginAt ?? undefined }))}
      />
    </div>
  );
}
