<div align="center">

# Polla Mundialista

### FIFA World Cup 2026 Fantasy Prediction Platform

![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)

</div>

---

## About

A complete web application for predicting and tracking FIFA World Cup 2026 matches. Users can create predictions, track scores in real-time, and compete with friends in a fantasy-style prediction league.

## Features

- **Match Predictions** — Predict scores for all World Cup 2026 matches
- **Real-time Scoring** — Live updates as matches progress
- **Leaderboard** — Compete with friends and see global rankings
- **Responsive Design** — Beautiful UI that works on all devices
- **Docker Support** — Easy deployment with Docker

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, TypeScript, TailwindCSS |
| Backend | Next.js API Routes |
| Database | PostgreSQL + Prisma ORM |
| Testing | Playwright (E2E) |
| Deployment | Docker, Docker Compose |

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL
- Docker (optional)

### Installation

```bash
# Clone the repository
git clone https://github.com/Joker8-h/polla-mundialista.git
cd polla-mundialista

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database credentials

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev
```

### Docker

```bash
docker-compose up -d
```

## Project Structure

```
polla-mundialista/
├── src/              # Application source code
├── prisma/           # Database schema and migrations
├── public/           # Static assets
├── scripts/          # Utility scripts
├── Dockerfile        # Docker configuration
├── docker-compose.yml
└── playwright.config.ts
```

---

<div align="center">

[![View Repository](https://img.shields.io/badge/View-Repository-0d1117?style=for-the-badge&logo=github)](https://github.com/Joker8-h/polla-mundialista)

</div>
