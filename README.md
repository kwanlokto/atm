# 🚀 Getting Started – Banking App

## 🐳 Prerequisites

- [Docker](https://docs.docker.com/get-docker/) must be installed on your machine.

---

## ⚙️ Setup Instructions

### 1. Create a Docker volume for PostgreSQL

```bash
docker volume create postgres_db
```

### 2. Build the Docker containers:
```bash
docker compose build
```

### 3. Start the services in detached mode:
```bash
docker compose up -d
```

## 💻 Running the Frontend

Once the app is running, the frontend will be available at:

➡️ [http://localhost:3000](http://localhost:3000)

EMAIL: dummy@dummy.com
PASS: password


## 🛠️ Database Migrations
Downgrade database by a specific number of revisions:

```bash
docker exec -i backend alembic downgrade -x <number_of_revisions>
```

Upgrade database to the latest (head) revision:
```bash
docker exec -i backend alembic upgrade head
```
