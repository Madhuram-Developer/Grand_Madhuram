import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/Panels";
import { Logo } from "@/components/Chrome";
import { getUser } from "@/lib/auth";

export default async function Login() {
  if (await getUser()) redirect("/admin");
  return (
    <div className="mx-auto mt-16 max-w-xs">
      <Logo className="mx-auto mb-6 h-24 w-auto" preload />
      <h1 className="mb-4 text-center text-xl font-bold">Sign in</h1>
      <LoginForm />
    </div>
  );
}
