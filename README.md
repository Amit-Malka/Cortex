# Cortex
### Intelligent Drive Management & Analytics

Cortex is a powerful, full-stack application designed to transform how you interact with your cloud storage. By seamlessly syncing with Google Drive and leveraging advanced AI (GPT-5-nano), Cortex provides a smart conversational interface, deep analytics, and efficient file management capabilities—all wrapped in a beautiful, organic UI.

## ✨ Key Features

*   **🔄 Bi-directional Sync:** Instantly fetches and synchronizes files, folders, and rich metadata (owners, starred status, modification times) from your Google Drive.
*   **🤖 Intelligent Chat (RAG-lite):** Ask natural language questions about your data. Cortex analyzes your file metadata to answer queries like *"Who owns the most files?"* or *"Show me starred PDFs from last month."*
*   **📊 Analytics Dashboard:** Gain insights into your storage with interactive visualizations for file type distribution, storage usage, activity timelines, and top collaborators using Chart.js.
*   **🎨 Organic UI/UX:** A modern, responsive interface built with Vue 3 and Tailwind CSS, featuring a custom "Organic" theme with seamless Light/Dark mode switching.
*   **⚡ Advanced Data Table:** A robust file explorer with column sorting, truncation for long names, tooltips, and optimized performance for large datasets.
*   **🛠️ Full CRUD Operations:** Rename and delete files directly within Cortex, with changes instantly reflected in your Google Drive.

---

## 🛠️ Tech Stack

**Frontend:**
*   Vue 3 (Composition API)
*   Pinia (State Management)
*   Vue Router
*   Tailwind CSS
*   Chart.js / vue-chartjs
*   Lucide Icons

**Backend:**
*   Node.js & Express
*   TypeScript
*   OpenAI API (GPT-5-nano via Responses API)
*   Google Drive API (v3)

**Database:**
*   PostgreSQL
*   Prisma ORM

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
*   **Node.js** (v18+ recommended)
*   **Docker** (for running the PostgreSQL database)
*   **Google Cloud Console Project:** You need a project with the **Google Drive API** enabled and OAuth 2.0 credentials set up.

---

## 🚀 Installation Guide

### 1. Clone the Repository

```bash
git clone <https://github.com/Amit-Malka/Cortex>
cd Cortex
```

### 2. Backend Setup

Navigate to the server directory:

```bash
cd server
```

Install dependencies:

```bash
npm install
```

Set up your environment variables. Create a `.env` file in the `server` directory (see reference below).

Start the PostgreSQL database using Docker:

```bash
# From the project root or server directory, depending on your docker-compose location
docker-compose up -d
```

Run Prisma migrations to create the database schema:

```bash
npx prisma migrate dev
```

Start the backend server:

```bash
npm run dev
```

### 3. Frontend Setup

Open a new terminal and navigate to the client directory:

```bash
cd client
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Visit `http://localhost:5173` (or the port shown in your terminal) to view the app.

---

## 🔑 Environment Variables

Create a `.env` file in the `server` directory with the following variables:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/cortex_db?schema=public"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_REDIRECT_URI="http://localhost:5173/auth/callback" # Or your production URL

# OpenAI
OPENAI_API_KEY="your-openai-api-key"
OPENAI_MODEL="gpt-5-nano"

# Server
PORT=3000
JWT_SECRET="your-super-secret-jwt-key"
CLIENT_URL="http://localhost:5173"
```

---

## 🛡️ License

This project is open-source and available under the [MIT License](LICENSE).
