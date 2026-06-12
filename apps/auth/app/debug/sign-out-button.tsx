"use client";

export function SignOutButton() {
  async function handleClick() {
    await fetch("/api/auth/sign-out", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: "{}",
    });
    window.location.reload();
  }
  return (
    <button className="underline" type="button" onClick={handleClick}>
      sign out
    </button>
  );
}
