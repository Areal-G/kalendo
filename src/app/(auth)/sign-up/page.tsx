import { redirect } from "next/navigation";

/** Accounts can't outlive the demo's in-memory data, so sign-up leads to the demo sign-in. */
export default function SignUpPage() {
  redirect("/sign-in");
}
