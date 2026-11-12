import { UsersPanel } from "@/components/admin/Panels";
import { requirePerm } from "@/lib/auth";
import { plain } from "@/lib/data";
import { db } from "@/lib/db";
import { PERMISSIONS, User } from "@/lib/models";

export default async function Users() {
  await requirePerm("users");
  await db();
  const users = plain(await User.find().select("-passwordHash").sort({ role: -1, username: 1 }).lean());
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
