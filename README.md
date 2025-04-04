# Oncology Patient Data Management System (MVP)

A system for organizing, storing, and analyzing information about the course of oncological diseases in patients during remission. Allows tracking indicator dynamics, managing hospitalization episodes, and creating cohorts for research.

## Technologies Used

*   **Backend:** Python, Django (v4.2+), Django REST Framework, PostgreSQL (v14), DRF Simple JWT (for authentication)
*   **Frontend:** React (v18), TypeScript, Material UI (MUI v5), Recharts (for charts), Axios, React Router (v6)
*   **Orchestration:** Docker, Docker Compose

## Prerequisites

*   [Git](https://git-scm.com/)
*   [Docker](https://docs.docker.com/engine/install/)
*   [Docker Compose](https://docs.docker.com/compose/install/) (usually included with Docker Desktop)

## Installation and Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/data-tomic/med_data_system.git # Или ваш URL
    cd med_data_system
    ```

2.  **Configure Environment Variables:**
    *   Copy the `.env.example` file (if it exists) to a new file named `.env`. If not, create `.env` based on the required variables below.
        ```bash
        # cp .env.example .env # Если есть .env.example
        # touch .env # Если .env.example нет
        ```
    *   **Edit the `.env` file** and ensure these variables are set:
        ```dotenv
        SECRET_KEY=YOUR_DJANGO_SECRET_KEY_HERE # Generate a new strong key!
        DEBUG=True # Set to False for production

        POSTGRES_DB=meddata
        POSTGRES_USER=meduser
        POSTGRES_PASSWORD=your_strong_password_here # Use a strong password
        DATABASE_HOST=db # Should match the service name in docker-compose.yml
        DATABASE_PORT=5432
        ```
        *   Generate a `SECRET_KEY` using (if Python is installed locally):
            ```bash
            python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'
            ```
        *   **Never use default or weak keys/passwords in production!**

3.  **Build and Run Containers:**
    This command builds/rebuilds images and starts all services (`db`, `backend`, `frontend`).
    ```bash
    docker compose up -d --build
    ```
    The first run might take some time.

4.  **Initialize the Database:**
    *   Apply Django migrations:
        ```bash
        docker compose exec backend python manage.py migrate
        ```
    *   Create a superuser (for Django Admin access):
        ```bash
        docker compose exec backend python manage.py createsuperuser
        ```
        (Follow the prompts).

## Initial Data Setup (Optional but Recommended)

For the application to be useful, you need some reference data:

1.  **Log in to Django Admin:** `http://localhost:8000/admin/` (use superuser credentials).
2.  **Add Parameter Codes (`ParameterCode`):**
    *   Navigate to "CORE" -> "Коды показателей".
    *   Add essential indicators (e.g., 'HB' - Гемоглобин, 'WEIGHT' - Вес, 'TEMP' - Температура, 'KARNOFSKY' - Шкала Карновского).
    *   **Crucially, set the "Числовой?" (`is_numeric`) flag correctly** for each parameter. This flag determines if the parameter's values will be used for chart generation.
3.  **Add ICD Codes (`MKBCode`):**
    *   Navigate to "CORE" -> "Коды МКБ".
    *   Add relevant diagnosis codes (e.g., 'C71.0'). *(Ideally, implement bulk loading later).*

## Using the Application

1.  **Access Frontend:** Open `http://localhost:3000/` in your browser.
2.  **Login:** Use the superuser credentials (or create other users via Admin/API). The login form should use the `/api/token/` endpoint.
3.  **Navigate:** Go to the patient list (`/patients`) and select a patient or create a new one.
4.  **Patient Detail Page (`/patients/<id>`):**
    *   View patient information.
    *   View existing hospitalization episodes and observations.
    *   **Add New Episode:** Use the "Добавить эпизод" form.
    *   **Add New Observation:** Use the "Добавить наблюдение" form (select parameter, enter value, optionally select episode).
    *   **View Dynamics:** Select one or more numeric parameters using the checkboxes to display their dynamics on the chart. The chart now supports multiple Y-axes for parameters with different scales (configure `getYAxisIdForParam` in `PatientDetailPage.tsx` if needed).
    *   *(Functionality for adding/viewing Medical Tests might be present but needs similar UI integration)*.

## Accessing Services Directly

*   **Frontend App:** `http://localhost:3000/`
*   **Backend API (Browsable):** `http://localhost:8000/api/` (Requires login via Django session for browsable API if SessionAuthentication were enabled; JWT is used for app interaction).
*   **Backend Admin:** `http://localhost:8000/admin/`
*   **Database (e.g., via DBeaver/pgAdmin):** Host `localhost`, Port `5432`, Database `meddata`, User `meduser`, Password from `.env`.

## Stopping the Application

```bash
docker compose down
