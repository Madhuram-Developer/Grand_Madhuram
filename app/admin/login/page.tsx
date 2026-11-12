import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/Panels";
import { getUser } from "@/lib/auth";

export default async function Login() {
  if (await getUser()) redirect("/admin");
  return (
    <div className="mx-auto mt-16 max-w-xs">
      <h1 className="mb-4 text-xl font-bold">Sign in</h1>
      <LoginForm />
    </div>
  );
}
