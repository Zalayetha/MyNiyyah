import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	AppDestructiveConfirmDialog,
	AppEmptyState,
	AppInlineError,
	AppLoadingState,
	AppPendingSaveStatus,
	AppTopBar,
} from "./AppState";

afterEach(() => {
	cleanup();
});

describe("shared app state primitives", () => {
	it("renders a compact top bar with accessible back action", () => {
		const onBack = vi.fn();
		render(
			<AppTopBar
				title="Pengaturan Lokasi"
				subtitle="Pilih kota dan metode perhitungan jadwal solat."
				onBack={onBack}
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: "Kembali" }));

		expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
			"Pengaturan Lokasi",
		);
		expect(onBack).toHaveBeenCalledTimes(1);
	});

	it("renders loading state with polite status semantics", () => {
		render(
			<AppLoadingState
				title="Memuat jurnal..."
				description="Kami sedang menyiapkan catatan muhasabah Anda."
			/>,
		);

		const status = screen.getByRole("status");
		expect(status.getAttribute("aria-live")).toBe("polite");
		expect(status.textContent).toContain("Memuat jurnal...");
	});

	it("handles long empty-state copy and primary recovery action", () => {
		const onAction = vi.fn();
		render(
			<AppEmptyState
				title="Belum ada catatan muhasabah"
				description="Mulai dengan satu refleksi singkat setelah Isya agar statistik kualitas ibadah Anda terasa lebih bermakna dari waktu ke waktu."
				action={{ label: "Buat jurnal", onClick: onAction }}
			/>,
		);

		const action = screen.getByRole("button", { name: "Buat jurnal" });
		fireEvent.click(action);

		expect(screen.getByText("Belum ada catatan muhasabah")).toBeTruthy();
		expect(action.className).toContain("min-h-11");
		expect(onAction).toHaveBeenCalledTimes(1);
	});

	it("renders inline error with retry action", () => {
		const onRetry = vi.fn();
		render(
			<AppInlineError
				description="Data belum bisa dimuat. Coba lagi sebentar lagi."
				retry={{ label: "Muat ulang", onClick: onRetry }}
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: "Muat ulang" }));

		expect(screen.getByRole("alert").textContent).toContain(
			"Data belum bisa dimuat",
		);
		expect(onRetry).toHaveBeenCalledTimes(1);
	});

	it("renders pending-save states for saving, saved, and error", () => {
		const { rerender } = render(<AppPendingSaveStatus state="saving" />);
		expect(screen.getByRole("status").textContent).toContain("Menyimpan");

		rerender(<AppPendingSaveStatus state="saved" />);
		expect(screen.getByRole("status").textContent).toContain("Tersimpan");

		rerender(
			<AppPendingSaveStatus
				state="error"
				errorMessage="Koneksi terputus. Perubahan belum tersimpan."
			/>,
		);
		expect(screen.getByRole("alert").textContent).toContain("Koneksi terputus");
	});

	it("renders destructive confirmation with disabled pending controls", () => {
		const onOpenChange = vi.fn();
		const onConfirm = vi.fn();
		render(
			<AppDestructiveConfirmDialog
				open
				onOpenChange={onOpenChange}
				title="Hapus jurnal?"
				description="Tindakan ini akan menghapus catatan jurnal, tetapi tidak menghapus riwayat solat."
				confirmLabel="Hapus jurnal"
				onConfirm={onConfirm}
				isPending
			/>,
		);

		expect(screen.getByRole("dialog").textContent).toContain("Hapus jurnal?");
		expect(
			screen
				.getByRole("button", { name: "Menghapus..." })
				.hasAttribute("disabled"),
		).toBe(true);
		expect(
			screen.getByRole("button", { name: "Batal" }).hasAttribute("disabled"),
		).toBe(true);
	});
});
