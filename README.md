# SentinelOps: Enterprise AI-Powered Server Failure Prediction System

## Overview

SentinelOps is an enterprise-grade predictive maintenance platform designed to identify potential hardware and software failures before they impact production systems.

The platform combines Machine Learning, Real-Time Telemetry, Explainable AI (XAI), and Event-Driven Architecture to provide proactive infrastructure monitoring, intelligent failure prediction, and automated remediation for enterprise environments.

## Problem Statement

Traditional infrastructure monitoring systems detect issues only after they occur, often leading to service degradation and unplanned downtime.

SentinelOps addresses this limitation by continuously analyzing server telemetry and predicting failures before they occur, enabling operations teams to take preventive actions and improve system reliability.

## Key Features

### AI-Powered Failure Prediction

- Predicts server failures using Machine Learning models.
- Calculates Failure Risk Score.
- Generates Prediction Confidence.
- Tracks prediction history for each server.

### Real-Time Telemetry Monitoring

- Continuous collection of server metrics.
- Event-driven data ingestion using Apache Kafka (Redpanda).
- Live infrastructure monitoring.

### Explainable AI (XAI)

- SHAP-based feature importance analysis.
- Root cause identification for every prediction.
- Transparent AI decision-making.

### Auto-Healing Simulation

- Rule-based remediation engine.
- Automated recovery workflows.
- Severity-aware incident handling.

### Enterprise Monitoring Dashboard

- Fleet Health Monitoring
- Server Registry
- AI Risk Analysis
- SHAP Analysis
- Telemetry Visualization
- Prediction History
- Auto-Healing Timeline
- Remediation Activity

### MLOps Pipeline

- Feast Feature Store
- MLflow Model Registry
- Evidently AI Drift Detection
- Continuous model evaluation

### Deployment

- Docker Compose
- Kubernetes Ready
- Containerized Microservices

---

## System Architecture

```text
Monitoring Agents
        │
        ▼
Apache Kafka (Redpanda)
        │
        ▼
Stream Processing
        │
        ▼
Feature Store (Feast)
        │
        ▼
Machine Learning Inference API (FastAPI)
        │
        ├────────► Alert Engine
        │
        ├────────► AI Recommendation Engine
        │
        ├────────► Auto-Healing Service
        │
        ▼
React Enterprise Dashboard
```
## Technology Stack

### Frontend

- React.js
- TypeScript
- Tailwind CSS
- Recharts
- Framer Motion

### Backend

- FastAPI
- Python
- SQLAlchemy
- REST APIs
- WebSocket

### Machine Learning

- Scikit-learn
- SHAP
- Feast
- MLflow
- Evidently AI

### Data Streaming

- Apache Kafka (Redpanda)

### Database

- PostgreSQL

### DevOps

- Docker
- Docker Compose
- Kubernetes

---

## Project Structure

```text
SentinelOps/
│
├── frontend/
├── backend/
├── deployment/
├── data_pipeline/
├── models/
├── feature_store/
├── monitoring/
├── docs/
└── README.md
```

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>

cd SentinelOps
```

---

### 2. Start Infrastructure

```bash
cd deployment

docker-compose up -d
```

Services Started:

- Apache Kafka (Redpanda)
- PostgreSQL
- MLflow

---

### 3. Start Backend

```bash
pip install -r requirements.txt

uvicorn backend.main:app --reload
```

Backend API

```
http://localhost:8000
```

Swagger Documentation

```
http://localhost:8000/docs
```

---

### 4. Start Frontend

```bash
cd frontend

npm install

npm run dev
```

Frontend

```
http://localhost:5173
```

---

### 5. Start Data Simulation

```bash
python -m data_pipeline.ingestion
```

The simulator continuously generates realistic server telemetry and streams it through Kafka.

---

## Core Capabilities

- Predict infrastructure failures before downtime occurs.
- Monitor enterprise server health in real time.
- Explain AI predictions using SHAP.
- Detect feature and data drift.
- Simulate automated remediation workflows.
- Visualize infrastructure health through enterprise dashboards.
- Support scalable deployment using Docker and Kubernetes.

---

## Planned Enhancements

The following enterprise features are planned for future releases:

- AI Recommendation Engine
- WebSocket-Based Live Monitoring
- Interactive Log Management
- Prediction Confidence Dashboard
- Search, Filtering, and Sorting
- PDF and CSV Report Generation
- Audit Logging
- Role-Based Access Control
- Cloud Deployment

---

## Developer

**Yuvraj Singh**

MCA Graduate

**Skills**

- Python
- FastAPI
- React.js
- Machine Learning
- Apache Kafka
- PostgreSQL
- Docker
- Kubernetes
---
## License

This project is developed for educational, research, and portfolio purposes.
