<p align="center">
    <picture>
        <source srcset="./public/logo.svg" width="140" />
        <img alt="MyNiyyah logo" src="./public/logo.svg" width="140" />
    </picture>
</p>

<p align="center">
  <a href="#license"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License: MIT"></a>
  <a href="https://github.com/pnpm/pnpm"><img src="https://img.shields.io/badge/pnpm-v11-orange.svg" alt="pnpm"></a>
  <a href="https://react.dev"><img src="https://img.shields.io/badge/Frontend-React%2019-61DAFB.svg" alt="React 19"></a>
  <a href="https://tanstack.com/start"><img src="https://img.shields.io/badge/Framework-TanStack%20Start-FF4154.svg" alt="TanStack Start"></a>
  <a href="https://tailwindcss.com"><img src="https://img.shields.io/badge/Styling-Tailwind%20CSS%20v4-38B2AC.svg" alt="Tailwind CSS"></a>
  <a href="https://biomejs.dev"><img src="https://img.shields.io/badge/Linter-Biome-60A5FA.svg" alt="Biome"></a>
</p>

<h1 align="center">MyNiyyah</h1>

<p align="center">
  <a href="#-features"><b>Features</b></a> ·
  <a href="#-project-structure"><b>Structure</b></a> ·
  <a href="#-quick-start"><b>Quick Start</b></a> ·
  <a href="#-tech-stack"><b>Tech Stack</b></a> ·
  <a href="#-deployment"><b>Deployment</b></a>
</p>

<p align="center">
  <strong>Teman Ibadah & Muhasabah Harian.</strong><br>
  A modern, mindful Islamic companion app designed to build consistent prayer habits, track daily worship progress, and foster spiritual self-reflection.
</p>

---

MyNiyyah combines precision prayer schedule tracking, interactive visual progression, structured daily muhasabah journaling, and curated Qur'anic wisdom into a seamless, high-performance web and mobile-first experience.

---

## ✨ Features

- 🕌 **Waktu Solat & Pelacak Ibadah** — Accurate prayer times and interactive slide-to-confirm prayer tracker with multi-method calculation support (KEMENAG RI, Muslim World League, Egyptian, etc.).
- 🏠 **Visual House-Building Progression** — An SVG-driven animated house powered by Framer Motion that progressively constructs foundation, walls, roof, and door as each salah is completed.
- 📖 **Jurnal Muhasabah Harian** — Step-by-step reflection journaling across key life themes (*Pekerjaan*, *Keluarga*, *Kesehatan*, *Teman*) with mood check-ins and Qur'anic ayat attachment.
- 📊 **Statistik & Analisis Kekhusyuan** — Comprehensive weekly progress charts, prayer consistency rates, khusyu' percentages, and streak tracking.
- 💎 **Khazanah Ayat & Hadits** — Categorized inspirational verses with Arabic typography, Indonesian translations, and reflective insights.
- 🎨 **Modern Glassmorphic UI & Dark Theme** — Built with Tailwind CSS v4, smooth spring physics, floating capsule bottom navigation, and tactile mobile haptics.
- 🔐 **Authentication & Profile Management** — Integrated Better Auth session management with PostgreSQL storage and notification preference toggles.
- ⚡ **Full-Stack SSR Performance** — Powered by TanStack Start, TanStack Router with type-safe routing, and Nitro server engine for instant hydration.

---

## 🏗️ Project Structure

MyNiyyah is organized with a clean, feature-driven architectural layout:

### Core Directories

| Directory | Description |
| :--- | :--- |
| [`src/routes/`](./src/routes) | File-based routes powered by TanStack Router (Home, Journal, Prayer Tracker, Khazanah, Settings) |
| [`src/components/`](./src/components) | UI primitives, section layouts, dynamic floating navbar, and interactive animations |
| [`src/components/ui/`](./src/components/ui) | Accessible headless component primitives based on `@base-ui/react` and Tailwind CSS |
| [`src/lib/`](./src/lib) | Shared utilities, Better Auth configuration, database clients, and Khazanah datasets |
| [`prisma/`](./prisma) | Prisma ORM schema definitions, database migrations, and seed scripts |
| [`public/`](./public) | Static brand assets, SVG logo, web app manifest, and icons |

---

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) (>= 20.x)
- [pnpm](https://pnpm.io/) (>= 10.x / 11.x)
- [PostgreSQL](https://www.postgresql.org/) (optional for local database persistence)

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/Zalayetha/my-niyyah.git
cd my-niyyah
pnpm install
```

### 2. Configure Environment

Create your local environment file:

```bash
cp .env.example .env
```

Generate a secure authentication secret:

```bash
# Set BETTER_AUTH_SECRET in .env
pnpm dlx @better-auth/cli secret
```

Configure your `.env`:

```env
DATABASE_URL="postgresql://myniyyah:replace-with-postgres-password@localhost:5432/myniyyah"
BETTER_AUTH_SECRET="your-generated-secret"
BETTER_AUTH_URL="http://localhost:3000"
```

### 3. Database Setup (Optional)

Generate the Prisma contract and initialize or update the database:

```bash
pnpm contract:emit
pnpm db:init # fresh database
pnpm db:update # existing database
```

### 4. Run Development Server

Start the local development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Code Quality & Tooling

Run code quality and formatting checks powered by Biome and Vitest:

```bash
# Check code formatting and lint rules
pnpm check

# Automatically apply safe fixes and formatting
pnpm check:fix

# Run linter only
pnpm lint

# Format codebase
pnpm format

# Run test suites
pnpm test
```

---

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Framework** | [TanStack Start](https://tanstack.com/start), [TanStack Router](https://tanstack.com/router) |
| **Frontend Library** | [React 19](https://react.dev/), [Vite](https://vitejs.dev/) |
| **Styling & Design** | [Tailwind CSS v4](https://tailwindcss.com/), [`@base-ui/react`](https://base-ui.com/), Glassmorphism |
| **Animation** | [Framer Motion](https://www.framer.com/motion/), Responsive SVG Path Morphing |
| **Icons** | [Lucide React](https://lucide.dev/), [Iconify React](https://iconify.design/) |
| **Server Engine** | [Nitro](https://nitro.build/) |
| **Database & ORM** | [PostgreSQL](https://www.postgresql.org/), [Prisma ORM](https://www.prisma.io/) |
| **Authentication** | [Better Auth](https://www.better-auth.com/) |
| **Tooling & Linter** | [Biome](https://biomejs.dev/), [pnpm](https://pnpm.io/), [Husky](https://typicode.github.io/husky/) |

---

## 🐳 Deployment

### Build for Production

Compile client assets and the Nitro server bundle:

```bash
pnpm build
```

Preview the production build locally:

```bash
pnpm preview
```

### Deploy with Nitro

Nitro produces a self-contained output in `.output/`:

```bash
# Run standalone production Node server
node .output/server/index.mjs
```

The output can be deployed to any modern cloud provider:
- **Node.js Hosts** (VPS, Render, Railway, Fly.io)
- **Serverless & Edge** (Vercel, Netlify, Cloudflare Workers/Pages, AWS Lambda)

Refer to [Nitro Deployment Documentation](https://nitro.build/deploy) for platform-specific adapters.

---

## 🤝 Contributing

Contributions, bug reports, and feature suggestions are welcome!

1. Fork the repository and create your feature branch: `git checkout -b feature/amazing-feature`.
2. Ensure linting and formatting pass: `pnpm check`.
3. Commit your changes using Conventional Commits: `git commit -m 'feat: add monthly reflection view'`.
4. Open a Pull Request with a clear summary of your changes.

---

## 📄 License

Distributed under the [MIT License](https://opensource.org/licenses/MIT). © 2026 MyNiyyah. Dibuat untuk kemaslahatan bersama.
