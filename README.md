# Career Code Advisor 👩‍💻✨

> **A Redis-powered, AI-augmented job board that matches talent to roles in real-time.**  
> Technologies: Next.js 14 · Redis Stack 8 (Vector + Search + Streams) · OpenAI · Grafana · Docker

## 🚀 Live Demo
**COMING SOON TO THEATRES** – will add once deployed.

## 🎯 Key Features
| ⚡ | Feature | Wow-Factor |
|---|---------|-----------|
| 🔍 | **Hybrid & vector search** (`/api/search`) with typo-tolerance, filters & embeddings | Finds “react remote senior” even if you typo “recat” |
| ✨ | **AI-tagged metadata** (`skills_ai`, `seniority_ai`, …) | Badges like `Senior • HealthTech` auto-generated from JD text |
| ⭐ | **Real-time favorites stream** (Redis Streams → Grafana) | Live metric proves full data pipe |
| 💾 | **Semantic answer cache** | Cuts GPT cost; banner shows when served from cache |
| 🧭 | **RedisSearch facets** | Company / Skill check-boxes with instant counts |
| 🎯 | **Resume skill matching** | Highlights overlapping skills in green |

*(More details below.)*

## 📸 Screenshots
| UI area | Preview |
|---------|---------|
| Home with Search | ![Home](docs/screens/01-home-search.png) |
| AI-rich Job Modal | ![Modal](docs/screens/02-job-modal.gif) |

## 🏗️ Architecture
<!-- we’ll fill this later with a diagram -->

## 🛠️ Local Development
<!-- docker compose up etc. -->

## 📝 License
MIT
