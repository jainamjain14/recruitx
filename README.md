# RecruitX - Recruitment Platform

RecruitX is a full-stack recruitment and hiring management platform built with React, Node.js, Express, TypeScript, and Socket.io.

## Project Structure

```
├── client/          # Frontend application (React 19, Vite, Tailwind CSS, TypeScript)
├── server/          # Backend API & WebSocket server (Node.js, Express, TypeScript, Socket.io, Firebase)
└── Project Synopsis (1) 1.docx
```

## Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- npm or yarn

### Setup Backend (Server)
1. Navigate to the server folder:
   ```bash
   cd server
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables:
   - Create a `.env` file based on `.env.example`
   - Add your Firebase `serviceAccountKey.json` if required
4. Run in development mode:
   ```bash
   npm run dev
   ```

### Setup Frontend (Client)
1. Navigate to the client folder:
   ```bash
   cd client
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
