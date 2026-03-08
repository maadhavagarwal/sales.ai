# 🚀 NeuralBI: Enterprise Statutory AI & Logistics platform

A high-performance, **Tally-grade** Generative AI Financial & Logistics platform. Upload a `CSV`, let the AI auto-structure your statutory data, run ML forecasting, and instantly manage enterprise-grade accounting and warehouse logistics.

## 🌟 Capabilities
- **Universal Schema Mapping:** Automatically identifies Revenue, COGS, Dimensions, and statutory KPIs without manual configuration.
- **Enterprise Statutory Reporting:** Hierarchical Profit & Loss (P&L) statements, solvent-mapped Balance Sheets, and real-time Trial Balances.
- **Autonomous Bank Reconciliation (BRS):** Neural Matching engine that aligns bank statements with internal ledgers using fuzzy-logic scoring.
- **GST Compliance Engine:** Integrated GSTR-1 and GSTR-3B summary generation with automated tax-liability and ITC offset mapping.
- **Predictive Logistics:** AI-driven inventory health monitoring with autonomous "Days-to-Stock-Out" forecasting and Restock Quantum recommendations.
- **Recursive AI Copilot:** A true strategic partner that understands business context and offers proactive fiscal recommendations.
- **Executive Summaries:** An `autonomous_analyst` writes plain-English logic about driving factors behind your financial KPIs.

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
