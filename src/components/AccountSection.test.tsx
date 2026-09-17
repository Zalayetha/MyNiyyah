import { cleanup, render, screen } from "@testing-library/react";
import type * as React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AccountSection } from "./AccountSection";

vi.mock("@tanstack/react-router", () => ({
	Link: ({
		children,
		className,
		to,
		"aria-label": ariaLabel,
	}: {
		children: React.ReactNode;
		className?: string;
		to: string;
		"aria-label"?: string;
	}) => (
		<a aria-label={ariaLabel} className={className} href={to}>
			{children}
		</a>
	),
	useNavigate: () => vi.fn(),
}));

vi.mock("#/lib/auth-client", () => ({
	authClient: {
		signOut: vi.fn(),
	},
}));

afterEach(() => {
	cleanup();
});

describe("AccountSection", () => {
	it("renders profile edit as one accessible link without nested edit button", () => {
		render(
			<AccountSection
				user={{
					name: "Zaghy",
					email: "zaghy@example.com",
					avatar: "/logo.svg",
				}}
				stats={{ totalPrayers: 12, streak: 3, journalEntries: 4 }}
			/>,
		);

		expect(
			screen.getByRole("link", { name: "Edit profil Zaghy" }),
		).toBeTruthy();
		expect(screen.queryByRole("button", { name: /edit profile/i })).toBeNull();
		expect(screen.getByRole("button", { name: "Keluar" }).className).toContain(
			"min-h-14",
		);
	});
});
