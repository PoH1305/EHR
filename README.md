# EHI: Secure Decentralized Health Record Platform

EHI is a production-ready Electronic Health Record (EHR) application focused on patient autonomy, data minimization, and decentralized security.

## Core Features

- **AI Data Minimization**: patient-side filtering of clinical records based on doctor specialty (Cardiology, Oncology, etc.).
- **Secure Handshake**: Zero-knowledge clinical data sharing via an encrypted relay service.
- **Break-Glass Emergency Access**: Auditable, time-limited emergency overrides for critical situations.
- **Biometric Security**: WebAuthn/Biometric gates for all high-value data operations.
- **Local-First Architecture**: Clinical records are stored locally on the patient's device using IndexedDB (Dexie.js), ensuring the user is the sole owner of their data.

## Tech Stack

- **Frontend**: Next.js (App Router), React, Tailwind CSS, Framer Motion.
- **State Management**: Zustand (Immer for immutable state).
- **Storage**: Dexie.js (IndexedDB).
- **Security**: Web Crypto API (AES-GCM), WebAuthn.

## Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Run the development server**:
   ```bash
   npm run dev
   ```

3. **Open the app**:
   Navigate to [http://localhost:3000](http://localhost:3000).

## Architecture Note

This platform operates on a **Server-Blinded** model. The central server facilitates the handshake and stores metadata but never has access to the decrypted clinical content of the patients' records.
