import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import {
	ArrowLeft,
	Check,
	Compass,
	Crosshair,
	LoaderCircle,
	MapPin,
	Search,
} from "lucide-react";
import { useMemo, useState } from "react";
import { AppInlineError } from "#/components/AppState";
import { Button, buttonVariants } from "#/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import {
	getLocationSettingsData,
	type LocationPreference,
	type LocationSettingsData,
	saveLocationPreferenceAction,
} from "#/lib/location-server";
import { getTimezoneOffsetHours } from "#/lib/timezone";

export const Route = createFileRoute("/location")({
	loader: () => getLocationSettingsData(),
	component: LocationPage,
});

type LocationMode = "manual" | "gps";
type GpsStatus =
	| "idle"
	| "locating"
	| "ready"
	| "denied"
	| "timeout"
	| "error"
	| "unsupported";

interface GpsDraft {
	latitude: number;
	longitude: number;
	timezone: string;
	timezoneOffset: number;
}

function getBrowserTimezone(): string {
	try {
		const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
		if (timezone) return timezone;
	} catch {}
	return "Asia/Jakarta";
}

export function getGeolocationErrorMessage(status: GpsStatus): string {
	switch (status) {
		case "unsupported":
			return "Browser ini belum mendukung deteksi lokasi. Pilih kota secara manual untuk menyimpan pengaturan.";
		case "denied":
			return "Izin lokasi ditolak. Aktifkan izin lokasi di browser atau pilih kota secara manual.";
		case "timeout":
			return "Deteksi lokasi terlalu lama. Coba lagi di area dengan sinyal lebih baik atau pilih kota manual.";
		case "error":
			return "Lokasi belum bisa dideteksi. Coba lagi atau gunakan pilihan kota manual.";
		default:
			return "";
	}
}

function formatCoordinate(value: number, axis: "lat" | "lng") {
	const direction =
		axis === "lat" ? (value < 0 ? "S" : "N") : value < 0 ? "W" : "E";
	return `${Math.abs(value).toFixed(4)}° ${direction}`;
}

function formatCoordinates(
	latitude?: number | null,
	longitude?: number | null,
) {
	if (
		latitude === null ||
		latitude === undefined ||
		longitude === null ||
		longitude === undefined
	) {
		return "Koordinat belum tersedia";
	}
	return `${formatCoordinate(latitude, "lat")}, ${formatCoordinate(longitude, "lng")}`;
}

function LocationPage() {
	const data = Route.useLoaderData();
	return <LocationPageView data={data} />;
}

export function LocationPageView({ data }: { data: LocationSettingsData }) {
	const router = useRouter();
	const [preference, setPreference] = useState<LocationPreference>(
		data.preference,
	);
	const [locationMode, setLocationMode] = useState<LocationMode>(
		data.preference.source === "auto" ? "gps" : "manual",
	);
	const [selectedCity, setSelectedCity] = useState(
		data.preference.cityId ?? data.cities[0]?.id ?? "",
	);
	const [selectedMethod, setSelectedMethod] = useState(
		data.preference.calculationMethodId ?? data.methods[0]?.id ?? "",
	);
	const [searchQuery, setSearchQuery] = useState("");
	const [gpsStatus, setGpsStatus] = useState<GpsStatus>(
		data.preference.source === "auto" ? "ready" : "idle",
	);
	const [gpsDraft, setGpsDraft] = useState<GpsDraft | null>(
		data.preference.source === "auto" &&
			data.preference.latitude !== null &&
			data.preference.longitude !== null
			? {
					latitude: data.preference.latitude,
					longitude: data.preference.longitude,
					timezone: data.preference.timezone,
					timezoneOffset: data.preference.timezoneOffset,
				}
			: null,
	);
	const [isSaving, setIsSaving] = useState(false);
	const [saveError, setSaveError] = useState("");
	const [isSaved, setIsSaved] = useState(false);

	const filteredCities = useMemo(() => {
		const query = searchQuery.trim().toLowerCase();
		if (!query) return data.cities;
		return data.cities.filter(
			(city) =>
				city.name.toLowerCase().includes(query) ||
				city.province.toLowerCase().includes(query),
		);
	}, [data.cities, searchQuery]);

	const activeCity = data.cities.find((city) => city.id === selectedCity);
	const activeMethod = data.methods.find(
		(method) => method.id === selectedMethod,
	);
	const activeGps =
		locationMode === "gps"
			? (gpsDraft ??
				(preference.latitude !== null && preference.longitude !== null
					? {
							latitude: preference.latitude,
							longitude: preference.longitude,
							timezone: preference.timezone,
							timezoneOffset: preference.timezoneOffset,
						}
					: null))
			: null;
	const activeTitle =
		locationMode === "gps"
			? "Koordinat GPS"
			: (activeCity?.name ?? "Pilih kota");
	const activeSubtitle =
		locationMode === "gps"
			? (activeGps?.timezone ?? "Zona waktu perangkat")
			: activeCity
				? `${activeCity.province}, ${activeCity.country}`
				: "Belum ada kota dipilih";
	const activeTimezoneLabel =
		locationMode === "gps"
			? activeGps
				? `${activeGps.timezone} (UTC${activeGps.timezoneOffset >= 0 ? "+" : ""}${activeGps.timezoneOffset})`
				: preference.timezoneLabel
			: (activeCity?.timezoneLabel ?? preference.timezoneLabel);
	const activeCoordinates =
		locationMode === "gps"
			? formatCoordinates(activeGps?.latitude, activeGps?.longitude)
			: formatCoordinates(activeCity?.latitude, activeCity?.longitude);
	const gpsErrorMessage = getGeolocationErrorMessage(gpsStatus);
	const canSave =
		Boolean(selectedMethod) &&
		(locationMode === "manual" ? Boolean(selectedCity) : Boolean(activeGps));

	const handleSelectCity = (cityId: string) => {
		setLocationMode("manual");
		setSelectedCity(cityId);
		setSaveError("");
		setIsSaved(false);
	};

	const handleAutoGPS = () => {
		setSaveError("");
		setIsSaved(false);
		if (!("geolocation" in navigator)) {
			setGpsStatus("unsupported");
			setLocationMode("manual");
			return;
		}

		setLocationMode("gps");
		setGpsStatus("locating");
		navigator.geolocation.getCurrentPosition(
			(position) => {
				const timezone = getBrowserTimezone();
				setGpsDraft({
					latitude: position.coords.latitude,
					longitude: position.coords.longitude,
					timezone,
					timezoneOffset: getTimezoneOffsetHours(new Date(), timezone),
				});
				setGpsStatus("ready");
			},
			(error) => {
				setGpsStatus(
					error.code === error.PERMISSION_DENIED
						? "denied"
						: error.code === error.TIMEOUT
							? "timeout"
							: "error",
				);
			},
			{ enableHighAccuracy: true, maximumAge: 60_000, timeout: 10_000 },
		);
	};

	const handleSave = async () => {
		if (!canSave || isSaving) return;
		setIsSaving(true);
		setSaveError("");
		setIsSaved(false);

		try {
			const result = await saveLocationPreferenceAction({
				data:
					locationMode === "manual"
						? {
								source: "manual",
								cityId: selectedCity,
								calculationMethodId: selectedMethod,
							}
						: {
								source: "auto",
								latitude: activeGps?.latitude,
								longitude: activeGps?.longitude,
								timezone: activeGps?.timezone,
								timezoneOffset: activeGps?.timezoneOffset,
								calculationMethodId: selectedMethod,
							},
			});
			setPreference(result.preference);
			setLocationMode(result.preference.source === "auto" ? "gps" : "manual");
			setSelectedCity(result.preference.cityId ?? selectedCity);
			setSelectedMethod(result.preference.calculationMethodId);
			if (
				result.preference.source === "auto" &&
				result.preference.latitude !== null &&
				result.preference.longitude !== null
			) {
				setGpsDraft({
					latitude: result.preference.latitude,
					longitude: result.preference.longitude,
					timezone: result.preference.timezone,
					timezoneOffset: result.preference.timezoneOffset,
				});
				setGpsStatus("ready");
			}
			setIsSaved(true);
			if (data.hapticsEnabled && "vibrate" in navigator) navigator.vibrate(10);
			await router.invalidate();
			window.setTimeout(() => setIsSaved(false), 2500);
		} catch (error) {
			setSaveError(
				error instanceof Error
					? error.message
					: "Pengaturan lokasi belum bisa disimpan.",
			);
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<div className="mx-auto min-h-screen max-w-md bg-background pb-12">
			<div className="flex min-h-20 flex-row items-center justify-between px-4 py-5">
				<Link
					to="/"
					search={{ section: "account" }}
					aria-label="Kembali ke akun"
					className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-foreground hover:bg-muted"
				>
					<ArrowLeft aria-hidden="true" className="size-6" />
				</Link>
				<div className="font-semibold text-foreground text-lg">
					Pengaturan Lokasi
				</div>
				<div className="w-11" />
			</div>

			<div className="flex flex-col gap-6 px-6">
				<Card className="border-0 bg-primary p-5 text-primary-foreground">
					<div className="flex items-start justify-between gap-3">
						<div className="flex min-w-0 flex-col gap-1">
							<div className="font-semibold text-primary-foreground/80 text-xs uppercase tracking-wider">
								Lokasi Aktif Saat Ini
							</div>
							<div className="flex items-center gap-2 font-bold text-2xl text-primary-foreground">
								<MapPin aria-hidden="true" className="size-5 shrink-0" />
								<span className="truncate">{activeTitle}</span>
							</div>
							<div className="font-medium text-primary-foreground/90 text-sm">
								{activeSubtitle}
							</div>
						</div>
						<div className="shrink-0 rounded-full bg-background/20 px-2.5 py-1 font-semibold text-xs backdrop-blur-sm">
							{activeTimezoneLabel}
						</div>
					</div>

					<div className="mt-4 flex items-center justify-between gap-3 border-primary-foreground/20 border-t pt-3 text-primary-foreground/90 text-xs">
						<span>Koordinat: {activeCoordinates}</span>
						<span>{locationMode === "gps" ? "GPS" : "Katalog"}</span>
					</div>
				</Card>

				<button
					type="button"
					onClick={handleAutoGPS}
					disabled={gpsStatus === "locating"}
					className="flex min-h-14 w-full items-center justify-center gap-2.5 rounded-2xl border border-border bg-card p-4 transition-all hover:bg-muted/50 active:scale-98 disabled:opacity-70"
				>
					<Crosshair
						aria-hidden="true"
						className={`size-5 text-primary ${gpsStatus === "locating" ? "animate-spin" : ""}`}
					/>
					<span className="font-semibold text-foreground text-sm">
						{gpsStatus === "locating"
							? "Mendeteksi GPS..."
							: "Gunakan Lokasi Otomatis (GPS)"}
					</span>
				</button>

				{gpsErrorMessage ? (
					<AppInlineError
						title="GPS belum tersedia"
						description={gpsErrorMessage}
						retry={{
							label: "Coba GPS lagi",
							onClick: handleAutoGPS,
							disabled: gpsStatus === "locating",
							icon: Crosshair,
						}}
					/>
				) : null}

				<div className="flex flex-col gap-3">
					<label
						htmlFor="city-search"
						className="px-1 font-semibold text-muted-foreground text-xs uppercase tracking-wider"
					>
						Cari Kota / Kabupaten
					</label>
					<div className="relative">
						<Search
							aria-hidden="true"
							className="-translate-y-1/2 absolute top-1/2 left-3.5 size-4 text-muted-foreground"
						/>
						<input
							id="city-search"
							type="text"
							placeholder="Ketik nama kota..."
							value={searchQuery}
							onChange={(event) => setSearchQuery(event.target.value)}
							className="w-full rounded-2xl border border-border bg-card py-3 pr-4 pl-10 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
						/>
					</div>
				</div>

				<Card className="border-0 bg-card">
					<CardHeader className="pb-2">
						<CardTitle className="text-base text-foreground">
							Daftar Kota Populer
						</CardTitle>
					</CardHeader>
					<CardContent className="flex max-h-60 flex-col gap-1.5 overflow-y-auto">
						{filteredCities.map((city) => {
							const isSelected =
								locationMode === "manual" && city.id === selectedCity;
							return (
								<button
									key={city.id}
									type="button"
									onClick={() => handleSelectCity(city.id)}
									className={`flex min-h-14 items-center justify-between rounded-xl p-3 text-left transition-colors ${
										isSelected
											? "border border-primary/40 bg-primary/10 text-primary"
											: "text-foreground hover:bg-muted/40"
									}`}
								>
									<div className="flex min-w-0 flex-col">
										<div className="truncate font-semibold text-sm">
											{city.name}
										</div>
										<div className="truncate text-muted-foreground text-xs">
											{city.province} • {city.timezoneLabel}
										</div>
									</div>
									{isSelected ? (
										<Check aria-hidden="true" className="size-4 text-primary" />
									) : null}
								</button>
							);
						})}
					</CardContent>
				</Card>

				<Card className="border-0 bg-card">
					<CardHeader className="pb-2">
						<div className="flex items-center gap-2">
							<Compass aria-hidden="true" className="size-4 text-primary" />
							<CardTitle className="text-base text-foreground">
								Metode Perhitungan
							</CardTitle>
						</div>
					</CardHeader>
					<CardContent className="flex flex-col gap-2">
						{data.methods.map((method) => {
							const isSelected = method.id === selectedMethod;
							return (
								<button
									key={method.id}
									type="button"
									onClick={() => {
										setSelectedMethod(method.id);
										setSaveError("");
										setIsSaved(false);
									}}
									className={`flex min-h-16 flex-col gap-1 rounded-xl border p-3.5 text-left transition-colors ${
										isSelected
											? "border-primary/40 bg-primary/10"
											: "border-transparent bg-muted/30 hover:bg-muted/50"
									}`}
								>
									<div className="flex items-center justify-between gap-3">
										<div
											className={`font-semibold text-sm ${isSelected ? "text-primary" : "text-foreground"}`}
										>
											{method.name}
										</div>
										{isSelected ? (
											<Check
												aria-hidden="true"
												className="size-4 shrink-0 text-primary"
											/>
										) : null}
									</div>
									<div className="text-muted-foreground text-xs">
										{method.description}
									</div>
								</button>
							);
						})}
						{activeMethod ? (
							<p className="px-1 text-muted-foreground text-xs">
								Dipilih: {activeMethod.name}
							</p>
						) : null}
					</CardContent>
				</Card>

				{saveError ? (
					<AppInlineError title="Gagal menyimpan" description={saveError} />
				) : null}

				<div className="flex flex-col gap-2 pt-2">
					<Button
						type="button"
						onClick={handleSave}
						disabled={!canSave || isSaving}
						className="min-h-12 w-full rounded-full bg-primary py-3 font-semibold text-primary-foreground transition-all hover:bg-primary/90 active:scale-98"
					>
						{isSaving ? (
							<span className="flex items-center gap-2">
								<LoaderCircle
									aria-hidden="true"
									className="size-4 animate-spin"
								/>
								Menyimpan...
							</span>
						) : isSaved ? (
							<span className="flex items-center gap-2">
								<Check aria-hidden="true" className="size-4" />
								Lokasi Berhasil Disimpan
							</span>
						) : (
							"Simpan Pengaturan Lokasi"
						)}
					</Button>

					<Link
						to="/"
						search={{ section: "account" }}
						className={buttonVariants({
							variant: "ghost",
							className:
								"min-h-11 w-full rounded-full font-medium text-muted-foreground",
						})}
					>
						Batal
					</Link>
				</div>
			</div>
		</div>
	);
}
