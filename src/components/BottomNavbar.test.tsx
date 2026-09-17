import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BottomNavbarView, navItems } from "./BottomNavbar";

afterEach(() => {
	cleanup();
});

describe("BottomNavbarView", () => {
	it("uses navigation semantics with accessible names and current page", () => {
		const onNavigate = vi.fn();
		render(
			<BottomNavbarView currentSection="journal" onNavigate={onNavigate} />,
		);

		const nav = screen.getByRole("navigation", { name: "Navigasi utama" });
		expect(nav).toBeTruthy();

		for (const item of navItems) {
			expect(screen.getByRole("button", { name: item.label })).toBeTruthy();
		}

		expect(
			screen
				.getByRole("button", { name: "Muhasabah" })
				.getAttribute("aria-current"),
		).toBe("page");

		fireEvent.click(screen.getByRole("button", { name: "Akun" }));
		expect(onNavigate).toHaveBeenCalledWith("account");
	});

	it("keeps each nav action at least 44px wide and tall", () => {
		render(<BottomNavbarView currentSection="home" onNavigate={() => {}} />);

		for (const item of navItems) {
			const button = screen.getByRole("button", { name: item.label });
			expect(button.className).toContain("min-h-11");
			expect(button.className).toContain("min-w-11");
		}
	});
});
