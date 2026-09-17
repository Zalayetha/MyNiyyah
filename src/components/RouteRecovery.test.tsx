import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type * as React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	AppRouteError,
	AppRouteNotFound,
	AppRoutePending,
} from "./RouteRecovery";

vi.mock("@tanstack/react-router", () => ({
	Link: ({
		children,
		className,
		to,
	}: {
		children: React.ReactNode;
		className?: string;
		to: string;
	}) => (
		<a className={className} href={to}>
			{children}
		</a>
	),
}));

afterEach(() => {
	cleanup();
});

describe("route recovery components", () => {
	it("renders pending route feedback", () => {
		render(<AppRoutePending />);

		expect(screen.getByText("Memuat halaman...")).toBeTruthy();
		expect(screen.getByText("Mohon tunggu sebentar.")).toBeTruthy();
	});

	it("renders loader error recovery with retry", () => {
		const reset = vi.fn();
		render(
			<AppRouteError
				error={new Error("Loader gagal")}
				reset={reset}
				info={undefined}
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: "Coba lagi" }));

		expect(screen.getByRole("alert").textContent).toContain("Loader gagal");
		expect(reset).toHaveBeenCalledTimes(1);
	});

	it("renders not-found recovery navigation", () => {
		render(<AppRouteNotFound isNotFound routeId="/" data={undefined} />);

		expect(screen.getByText("Halaman tidak ditemukan")).toBeTruthy();
		expect(
			screen
				.getByRole("link", { name: /Kembali ke Beranda/i })
				.getAttribute("href"),
		).toBe("/");
	});
});
