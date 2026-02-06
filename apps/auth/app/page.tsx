"use client";

import Link from "next/link";
import { DashboardLayout } from "@sdfwa/ui";

export default function AuthIndex() {
	return (
		<DashboardLayout
			sidebar={
				<div className="p-6">
					<h2 className="text-white text-xl font-bold mb-8">SDFWA Auth</h2>
					<nav className="space-y-4">
						<a
							href="/"
							className="block text-slate-200 hover:text-white transition-colors"
						>
							Dashboard
						</a>
						<a
							href="/auth/signin"
							className="block text-slate-200 hover:text-white transition-colors"
						>
							Sign In
						</a>
						<a
							href="/users"
							className="block text-slate-200 hover:text-white transition-colors"
						>
							Users
						</a>
					</nav>
				</div>
			}
			header={
				<div className="flex items-center justify-between">
					<h1 className="text-2xl font-bold text-slate-900">
						Authentication Dashboard
					</h1>
					<span className="text-sm text-slate-600">SDFWA Admin</span>
				</div>
			}
		>
			<div>
				<h2 className="text-3xl font-bold mb-4">Auth Dashboard</h2>
				<p className="text-slate-600 mb-6">
					This is the Identity Provider app for SDFWA
				</p>
				<Link
					href="/auth/signin"
					className="text-primary-600 hover:text-primary-700 font-medium"
				>
					→ Go to Sign In
				</Link>
			</div>
		</DashboardLayout>
	);
}
