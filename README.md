# Behavioral Biometric Authentication Web Application (PWA)

A production-ready **Behavioral Biometric Authentication Web Application** built with Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui, Prisma ORM, PostgreSQL (Neon ready), WebAuthn Passkeys, and Progressive Web App (PWA) support.

---

## 🌟 Key Features

1. **Multi-Step Behavioral Registration & Verification Flow**:
   - **Account Details**: Secure credentials setup with bcrypt password hashing.
   - **Typing Dynamics**: Analyzes inter-key timing intervals, hold times, characters per minute (CPM), pause duration, backspace rate, and consistency score across 2 enrollment attempts.
   - **Swipe Pattern Dynamics**: Analyzes normalized gesture sequence (e.g. `Left -> Right -> Down -> Right`), relative distance vectors, gesture duration, and movement speed profiles. Screen resolution independent.
   - **Hardware WebAuthn Passkeys**: Integrates platform authenticators (Android Fingerprint, iPhone Touch ID/Face ID, Windows Hello) via W3C WebAuthn (`@simplewebauthn`). Zero raw biometric secrets stored on server.

2. **Zero-Knowledge Biometric Privacy**:
   - Never stores raw fingerprint data, images, or platform biometric secrets in PostgreSQL.
   - Only stores cryptographic public keys, credential IDs, and normalized derived behavioral feature vectors.

3. **Progressive Web App (PWA)**:
   - Fully installable on Mobile (iOS/Android) and Desktop.
   - Offline static app shell fallback with strict non-caching of sensitive authentication endpoints.

4. **Security & Production Safeguards**:
   - Multi-factor verification flow enforced via HTTP-only state tokens.
   - Brute-force rate limiting protection.
   - Password hashing with bcrypt.
   - Generic security failure messages for unauthenticated attackers.
   - PostgreSQL database schema with Prisma ORM.

---

## 🛠️ Technology Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router, Server Actions & API Routes)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- **Database & ORM**: [PostgreSQL](https://www.postgresql.org/) & [Prisma ORM](https://www.prisma.io/)
- **Passkeys / WebAuthn**: [`@simplewebauthn/server`](https://simplewebauthn.dev/) & [`@simplewebauthn/browser`](https://simplewebauthn.dev/)
- **Session & Token Management**: [`jose`](https://github.com/panva/jose) & [`bcryptjs`](https://github.com/dcodeIO/bcrypt.js)
- **Deployment**: [Vercel](https://vercel.com/) + [Neon Database](https://neon.tech/)

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v18.x or higher
- **npm**: v9.x or higher
- **PostgreSQL Database**: Local PostgreSQL instance or cloud database (e.g., Neon PostgreSQL)

### 1. Installation

Clone the repository and install dependencies:

```bash
npm install
```

### 2. Environment Configuration

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Update variables in `.env`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/biometric_db?schema=public"
AUTH_SECRET="your-super-secret-32-character-key"

WEBAUTHN_RP_ID="localhost"
WEBAUTHN_RP_NAME="Behavioral Biometric Auth App"
WEBAUTHN_ORIGIN="http://localhost:3000"

NEXT_PUBLIC_APP_URL="http://localhost:3000"

TYPING_SIMILARITY_THRESHOLD="60"
SWIPE_SIMILARITY_THRESHOLD="60"
MAX_LOGIN_ATTEMPTS="5"
RATE_LIMIT_DURATION_MINUTES="15"
```

### 3. Database Migration

Generate Prisma client and push schema to PostgreSQL:

```bash
npx prisma generate
npx prisma db push
```

### 4. Running the Application

Start the local development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your web browser.

---

## 📱 Progressive Web App (PWA) Support

This application is fully configured as a Progressive Web App:
- **Manifest**: Located at `public/manifest.json`.
- **Service Worker**: Located at `public/sw.js` (caching static shell, never sensitive auth data).
- **Icons**: Located in `public/icons/`.
- **Install Prompt**: Interactive "Install App" button in navigation bar.

---

## ☁️ Deploying to Vercel

1. Push your code to GitHub / GitLab / Bitbucket.
2. Connect your repository to [Vercel](https://vercel.com/).
3. Create a free PostgreSQL database on [Neon](https://neon.tech/) or Vercel Postgres.
4. Set Environment Variables in Vercel settings:
   - `DATABASE_URL`: Your Neon PostgreSQL connection string.
   - `AUTH_SECRET`: Random 32+ character string.
   - `WEBAUTHN_RP_ID`: Your production domain (e.g., `your-app.vercel.app`).
   - `WEBAUTHN_RP_NAME`: `Behavioral Biometric Auth App`.
   - `WEBAUTHN_ORIGIN`: `https://your-app.vercel.app`.
   - `NEXT_PUBLIC_APP_URL`: `https://your-app.vercel.app`.
5. Deploy! Vercel will run `prisma generate && next build` automatically.

---

## 🔒 Security Architecture

```
User Registration:
Account Info -> Typing Enrollment (Attempt 1 + 2) -> Swipe Enrollment (Attempt 1 + 2) -> WebAuthn Passkey -> DB

User Login:
Password Step -> Typing Verification -> Swipe Verification -> Device Biometric -> Finalize Session -> Dashboard
```

- **Passkeys**: Private keys never leave the user's device enclave.
- **Derived Metrics**: Inter-key timings, velocity vectors, and normalized distance features are stored without sensitive raw keystroke text.
- **Fail-Safe Response**: Generic security feedback prevents unauthorized actors from learning which specific factor failed.
