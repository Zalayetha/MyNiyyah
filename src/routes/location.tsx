import { Icon } from "@iconify/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ArrowLeft,
	Check,
	Compass,
	Crosshair,
	MapPin,
	Search,
} from "lucide-react";
import { useState } from "react";
import { Button, buttonVariants } from "#/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";

export const Route = createFileRoute("/location")({
	component: LocationPage,
});

interface CityOption {
	id: string;
	name: string;
	province: string;
	tz: string;
}

const CITIES: CityOption[] = [
	{
		id: "jkt",
		name: "Jakarta Pusat",
		province: "DKI Jakarta",
		tz: "WIB (UTC+7)",
	},
	{
		id: "bdg",
		name: "Bandung",
		province: "Jawa Barat",
		tz: "WIB (UTC+7)",
	},
	{
		id: "sby",
		name: "Surabaya",
		province: "Jawa Timur",
		tz: "WIB (UTC+7)",
	},
	{
		id: "yk",
		name: "Yogyakarta",
		province: "DI Yogyakarta",
		tz: "WIB (UTC+7)",
	},
	{
		id: "smg",
		name: "Semarang",
		province: "Jawa Tengah",
		tz: "WIB (UTC+7)",
	},
	{
		id: "mdn",
		name: "Medan",
		province: "Sumatera Utara",
		tz: "WIB (UTC+7)",
	},
	{
		id: "mks",
		name: "Makassar",
		province: "Sulawesi Selatan",
		tz: "WITA (UTC+8)",
	},
];

const CALC_METHODS = [
	{
		id: "kemenag",
		name: "Kementerian Agama RI (Kemenag)",
		desc: "Standar resmi Republik Indonesia (Fajr 20°, Isha 18°)",
	},
	{
		id: "mwl",
		name: "Muslim World League (MWL)",
		desc: "Fajr 18°, Isha 17°",
	},
	{
		id: "makkah",
		name: "Umm Al-Qura University (Makkah)",
		desc: "Fajr 18.5°, Isha 90 min after Maghrib",
	},
];

function LocationPage() {
	const [selectedCity, setSelectedCity] = useState("jkt");
	const [selectedMethod, setSelectedMethod] = useState("kemenag");
	const [searchQuery, setSearchQuery] = useState("");
	const [isLocating, setIsLocating] = useState(false);
	const [isSaved, setIsSaved] = useState(false);

	const handleAutoGPS = () => {
		setIsLocating(true);
		setTimeout(() => {
			setIsLocating(false);
			setSelectedCity("jkt");
		}, 1200);
	};

	const handleSave = () => {
		setIsSaved(true);
		if ("vibrate" in navigator) navigator.vibrate(10);
		setTimeout(() => setIsSaved(false), 2500);
	};

	const filteredCities = CITIES.filter(
		(c) =>
			c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			c.province.toLowerCase().includes(searchQuery.toLowerCase()),
	);

	const activeCity = CITIES.find((c) => c.id === selectedCity) ?? CITIES[0];

	return (
		<div className="mx-auto min-h-screen max-w-md bg-background pb-12">
			{/* Header */}
			<div className="flex flex-row items-center justify-between px-4 py-8">
				<Link to="/" search={{ section: "account" }}>
					<ArrowLeft className="text-foreground size-6" />
				</Link>
				<div className="font-semibold text-lg text-foreground">
					Pengaturan Lokasi
				</div>
				<div className="w-6" />
			</div>

			<div className="px-6 flex flex-col gap-6">
				{/* Current Active Location Card */}
				<Card className="border-0 gradient-primary text-primary-foreground p-5">
					<div className="flex items-start justify-between">
						<div className="flex flex-col gap-1">
							<div className="text-xs font-semibold uppercase tracking-wider text-primary-foreground/80">
								Lokasi Aktif Saat Ini
							</div>
							<div className="text-2xl font-bold text-primary-foreground flex items-center gap-2">
								<MapPin className="size-5 shrink-0" />
								{activeCity.name}
							</div>
							<div className="text-sm text-primary-foreground/90 font-medium">
								{activeCity.province}, Indonesia
							</div>
						</div>
						<div className="rounded-full bg-background/20 px-2.5 py-1 text-xs font-semibold backdrop-blur-sm">
							{activeCity.tz}
						</div>
					</div>

					<div className="mt-4 pt-3 border-t border-primary-foreground/20 flex items-center justify-between text-xs text-primary-foreground/90">
						<span>Koordinat: -6.2088° S, 106.8456° E</span>
						<span>Akurasi: GPS</span>
					</div>
				</Card>

				{/* GPS Auto Detect Action */}
				<button
					type="button"
					onClick={handleAutoGPS}
					disabled={isLocating}
					className="flex items-center justify-center gap-2.5 w-full p-4 rounded-2xl bg-card border border-border hover:bg-muted/50 transition-all active:scale-98"
				>
					<Crosshair
						className={`size-5 text-primary ${isLocating ? "animate-spin" : ""}`}
					/>
					<span className="font-semibold text-sm text-foreground">
						{isLocating ? "Mendeteksi GPS..." : "Gunakan Lokasi Otomatis (GPS)"}
					</span>
				</button>

				{/* Search City */}
				<div className="flex flex-col gap-3">
					<label
						htmlFor="city-search"
						className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1"
					>
						Cari Kota / Kabupaten
					</label>
					<div className="relative">
						<Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
						<input
							id="city-search"
							type="text"
							placeholder="Ketik nama kota..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="w-full pl-10 pr-4 py-3 rounded-2xl bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
						/>
					</div>
				</div>

				{/* City Selection List */}
				<Card className="bg-card border-0">
					<CardHeader className="pb-2">
						<CardTitle className="text-base text-foreground">
							Daftar Kota Populer
						</CardTitle>
					</CardHeader>
					<CardContent className="flex flex-col gap-1.5 max-h-60 overflow-y-auto">
						{filteredCities.map((city) => {
							const isSelected = city.id === selectedCity;
							return (
								<button
									key={city.id}
									type="button"
									onClick={() => setSelectedCity(city.id)}
									className={`flex items-center justify-between p-3 rounded-xl transition-colors text-left ${
										isSelected
											? "bg-primary/10 border border-primary/40 text-primary"
											: "hover:bg-muted/40 text-foreground"
									}`}
								>
									<div className="flex flex-col">
										<div className="text-sm font-semibold">{city.name}</div>
										<div className="text-xs text-muted-foreground">
											{city.province} • {city.tz}
										</div>
									</div>
									{isSelected && <Check className="size-4 text-primary" />}
								</button>
							);
						})}
					</CardContent>
				</Card>

				{/* Calculation Method Selection */}
				<Card className="bg-card border-0">
					<CardHeader className="pb-2">
						<div className="flex items-center gap-2">
							<Compass className="size-4 text-primary" />
							<CardTitle className="text-base text-foreground">
								Metode Perhitungan
							</CardTitle>
						</div>
					</CardHeader>
					<CardContent className="flex flex-col gap-2">
						{CALC_METHODS.map((method) => {
							const isSelected = method.id === selectedMethod;
							return (
								<button
									key={method.id}
									type="button"
									onClick={() => setSelectedMethod(method.id)}
									className={`flex flex-col gap-1 p-3.5 rounded-xl transition-colors text-left border ${
										isSelected
											? "bg-primary/10 border-primary/40"
											: "border-transparent bg-muted/30 hover:bg-muted/50"
									}`}
								>
									<div className="flex items-center justify-between">
										<div
											className={`text-sm font-semibold ${isSelected ? "text-primary" : "text-foreground"}`}
										>
											{method.name}
										</div>
										{isSelected && <Check className="size-4 text-primary" />}
									</div>
									<div className="text-xs text-muted-foreground">
										{method.desc}
									</div>
								</button>
							);
						})}
					</CardContent>
				</Card>

				{/* Save Button */}
				<div className="flex flex-col gap-2 pt-2">
					<Button
						type="button"
						onClick={handleSave}
						className="w-full bg-primary text-primary-foreground font-semibold rounded-full py-3 hover:bg-primary/90 transition-all active:scale-98"
					>
						{isSaved ? (
							<span className="flex items-center gap-2">
								<Icon icon="ph:check-bold" fontSize={18} />
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
								"w-full text-muted-foreground font-medium rounded-full",
						})}
					>
						Batal
					</Link>
				</div>
			</div>
		</div>
	);
}
