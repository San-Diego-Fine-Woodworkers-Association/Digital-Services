"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@sdfwa/ui/components/button";
import { Card, CardContent } from "@sdfwa/ui/components/card";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@sdfwa/ui/components/field";
import { Input } from "@sdfwa/ui/components/input";
import { useSession, memberSignIn } from "@/lib/auth-client";

export default function LoginForm() {
	const session = useSession();
	const router = useRouter();
	const searchParams = useSearchParams();
	const redirect = searchParams.get("redirect") || "/fair-registration";

	const [email, setEmail] = useState("");
	const [memberId, setMemberId] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError(null);
		setLoading(true);

		try {
			const result = await memberSignIn({
				email,
				memberId,
			});

			if (result.error) {
				setError(result.error.message || "Invalid email or member ID");
			} else {
				await session.refetch(); // Ensure session state is updated
				router.push(redirect);
			}
		} catch {
			setError("An unexpected error occurred. Please try again.");
		} finally {
			setLoading(false);
		}
	}

	return (
		<Card>
			<CardContent className="p-6">
				<form onSubmit={handleSubmit}>
					<FieldGroup>
						<div className="flex flex-col items-center gap-2 text-center">
							<h1 className="text-2xl font-bold">Volunteer Sign In</h1>
							<p className="text-muted-foreground text-balance text-sm">
								Sign in with your SDFWA membership credentials
							</p>
						</div>

						{error && <FieldError>{error}</FieldError>}

						<Field>
							<FieldLabel htmlFor="email">Email</FieldLabel>
							<Input
								id="email"
								type="email"
								placeholder="you@example.com"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								required
							/>
						</Field>

						<Field>
							<FieldLabel htmlFor="memberId">Member ID</FieldLabel>
							<Input
								id="memberId"
								type="password"
								placeholder="Your SDFWA Member ID"
								value={memberId}
								onChange={(e) => setMemberId(e.target.value)}
								required
							/>
						</Field>

						<Field>
							<Button type="submit" className="w-full" disabled={loading}>
								{loading ? "Signing in..." : "Sign In"}
							</Button>
						</Field>
					</FieldGroup>
				</form>
			</CardContent>
		</Card>
	);
}