# 🚀 AI Decision Intelligence Platform

A high-performance, Generative AI Data Pipeline & Dashboard platform. Upload a `CSV`, let the AI auto-structure the data, run ML forecasting, detect anomalies, cluster performance segments, and instantly build an editable Next.js/React Power BI dashboard.

## 🌟 Capabilities
- **Universal Schema Mapping:** Automatically figures out what variables are Revenue, Dimensions, Dates, and KPIs without manual configuration.
- **Deep ML Pipeline:** Instant Time-Series Forecasting (Random Forests), Anomaly Detection (Isolation Forest), and Category Clustering (K-Means).
- **Executive Summaries:** An `autonomous_analyst` writes plain-English logic about what is driving the data.
- **Full BI Dashboard Editor:** Move, edit, drag, and configure dynamic widgets.
- **Export to PDF:** Download crisp board-ready reports.

---

## 💻 Local Development Setup

To run this platform directly on your laptop without Docker:

**1. Start the FastAPI Backend**
```bash
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
*(The backend runs on `localhost:8000`)*

**2. Start the Next.js Frontend**
```bash
cd frontend/ai-bi-frontend
npm install
npm run dev
```
*(The frontend runs on `localhost:3000`)*

---

## 🐳 Docker Deployment Setup (Production)

This platform is container-ready for immediate deployment to AWS EC2, DigitalOcean, or Render.

```bash
docker-compose up --build -d
```
This single command will:
1. Wrap the Python AI backend and install all required standard library data dependencies.
2. Build the Next.js frontend into a highly optimized, static production build.
3. Network them securely over localhost bridged connections.

You can then view the production app at `http://localhost:3000`.

---

## 🗃️ Folder Architecture
* `/main.py` -> Core FastAPI Server Entrypoint & Data Controller
* `/pipeline_controller.py` -> Orchestrates ML models, Analyst, and Recommendations.
* `/frontend/ai-bi-frontend/` -> Next.js / Tailwind App Router frontend.
* `advanced_ai_models.py` -> Sklearn isolation forests and clustering.
* `copilot_engine.py` -> Uses dynamic Pandas extraction to interpret human English questions against generated `dataset_ids`.
