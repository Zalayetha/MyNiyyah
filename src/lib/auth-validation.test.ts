import { describe, expect, it } from "vitest";
import {
	hasFormErrors,
	safeRedirect,
	validateLoginForm,
	validateRegisterForm,
} from "./auth-validation";

describe("auth validation", () => {
	it("requires valid login credentials", () => {
		const errors = validateLoginForm({ email: "bad", password: "" });

		expect(errors).toEqual({
			email: "Enter a valid email address.",
			password: "Password is required.",
		});
		expect(hasFormErrors(errors)).toBe(true);
	});

	it("accepts valid login credentials", () => {
		const errors = validateLoginForm({
			email: "fulan@example.com",
			password: "password123",
		});

		expect(errors).toEqual({});
		expect(hasFormErrors(errors)).toBe(false);
	});

	it("requires complete registration credentials", () => {
		const errors = validateRegisterForm({
			name: "",
			email: "fulan@example.com",
			password: "short",
			confirmPassword: "different",
		});

		expect(errors).toEqual({
			name: "Name is required.",
			password: "Password must be at least 8 characters.",
			confirmPassword: "Passwords do not match.",
		});
	});

	it("sanitizes redirects safely", () => {
		expect(safeRedirect(undefined)).toBe("/");
		expect(safeRedirect("")).toBe("/");
		expect(safeRedirect("https://example.com")).toBe("/");
		expect(safeRedirect("//example.com")).toBe("/");
		expect(safeRedirect("/login")).toBe("/");
		expect(safeRedirect("/register")).toBe("/");
		expect(safeRedirect("/login?redirect=/home")).toBe("/");
		expect(safeRedirect("/register?redirect=/home")).toBe("/");
		expect(safeRedirect("/prayer-tracker")).toBe("/prayer-tracker");
		expect(safeRedirect("/khazanah")).toBe("/khazanah");
	});
});
