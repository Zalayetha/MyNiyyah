export type ServerErrorCode =
	| "VALIDATION_ERROR"
	| "UNAUTHORIZED"
	| "NOT_FOUND"
	| "CONFLICT"
	| "TEMPORARY_ERROR";

export class ServerError extends Error {
	readonly code: ServerErrorCode;
	readonly status: number;

	constructor(code: ServerErrorCode, message: string) {
		super(message);
		this.name = "ServerError";
		this.code = code;
		this.status =
			code === "UNAUTHORIZED"
				? 401
				: code === "NOT_FOUND"
					? 404
					: code === "CONFLICT"
						? 409
						: code === "TEMPORARY_ERROR"
							? 503
							: 400;
	}
}

export const validationError = (message = "Invalid request") =>
	new ServerError("VALIDATION_ERROR", message);
export const unauthorizedError = () =>
	new ServerError("UNAUTHORIZED", "You must be signed in.");
export const notFoundError = (message = "Resource not found") =>
	new ServerError("NOT_FOUND", message);
export const conflictError = (message = "Resource already exists") =>
	new ServerError("CONFLICT", message);
export const temporaryError = (message = "Please try again later") =>
	new ServerError("TEMPORARY_ERROR", message);

export function toSafeServerError(error: unknown): ServerError {
	if (error instanceof ServerError) return error;
	return temporaryError();
}
