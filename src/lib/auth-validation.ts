const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

export interface LoginFormValues {
	email: string;
	password: string;
}

export interface RegisterFormValues extends LoginFormValues {
	name: string;
	confirmPassword: string;
}

export type LoginFormErrors = Partial<Record<keyof LoginFormValues, string>>;
export type RegisterFormErrors = Partial<
	Record<keyof RegisterFormValues, string>
>;

export function validateLoginForm(values: LoginFormValues): LoginFormErrors {
	const errors: LoginFormErrors = {};
	const email = values.email.trim();

	if (!email) {
		errors.email = "Email is required.";
	} else if (!EMAIL_PATTERN.test(email)) {
		errors.email = "Enter a valid email address.";
	}

	if (!values.password) {
		errors.password = "Password is required.";
	}

	return errors;
}

export function validateRegisterForm(
	values: RegisterFormValues,
): RegisterFormErrors {
	const errors: RegisterFormErrors = { ...validateLoginForm(values) };

	if (!values.name.trim()) {
		errors.name = "Name is required.";
	}

	if (values.password && values.password.length < MIN_PASSWORD_LENGTH) {
		errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
	}

	if (!values.confirmPassword) {
		errors.confirmPassword = "Confirm your password.";
	} else if (values.password !== values.confirmPassword) {
		errors.confirmPassword = "Passwords do not match.";
	}

	return errors;
}

export function hasFormErrors(errors: Record<string, string | undefined>) {
	return Object.values(errors).some(Boolean);
}

export function toSafeAuthError(message?: string | null) {
	if (!message) return "Authentication failed. Please try again.";
	return message;
}

export function safeRedirect(
	value: string | undefined,
	fallback = "/",
): string {
	if (!value) return fallback;
	if (value.startsWith("/") && !value.startsWith("//")) {
		if (
			value === "/login" ||
			value === "/register" ||
			value.startsWith("/login?") ||
			value.startsWith("/register?")
		) {
			return fallback;
		}
		return value;
	}
	return fallback;
}
