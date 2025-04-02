# Oncology Patient Data Management System (Prototype)

A prototype system for organizing, storing, and analyzing information about the course of oncological diseases in patients during remission. Allows tracking indicator dynamics and creating cohorts for research.

## Technologies Used

*   **Backend:** Python, Django, Django REST Framework, PostgreSQL
*   **Frontend:** React, TypeScript, Recharts (for charts), Axios
*   **Orchestration:** Docker, Docker Compose

## Prerequisites

*   [Git](https://git-scm.com/)
*   [Docker](https://docs.docker.com/engine/install/)
*   [Docker Compose](https://docs.docker.com/compose/install/) (usually included with Docker Desktop)

## Installation and Setup

1.  **Clone the repository:**
    ```bash
    git clone <Your repository URL>
    cd med_data_system
    ```

2.  **Configure Environment Variables:**
    *   Copy the `.env.example` file to a new file named `.env`:
        ```bash
        cp .env.example .env
        ```
    *   **Edit the `.env` file:**
        *   Replace `YOUR_DJANGO_SECRET_KEY` with a **newly generated** secret key. You can generate one using:
            ```bash
            python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'
            ```
            (If Python is installed locally) or just create a long, random string. **NEVER use the default key in real projects!**
        *   Set a strong database password instead of `your_strong_password`.
        *   The other default values (`POSTGRES_DB`, `POSTGRES_USER`, `DATABASE_HOST`, `DATABASE_PORT`, `DEBUG=True`) can usually be kept for local development.

3.  **Build and Run Containers:**
    This command will build the Docker images for the backend and frontend (if they don't exist) and start all services (`db`, `backend`, `frontend`) in detached mode.
    ```bash
    docker compose up -d --build
    ```
    The first run might take some time to download base images and install dependencies.

4.  **Initialize the Database:**
    *   Apply Django migrations to create the necessary tables in the PostgreSQL database:
        ```bash
        docker compose exec backend python manage.py migrate
        ```
    *   Create a superuser to access the Django Admin interface:
        ```bash
        docker compose exec backend python manage.py createsuperuser
        ```
        (Follow the prompts in the terminal to enter a username, email, and password).

## Seeding Test Data (via Django Admin)

After successfully starting the application and initializing the database, you can populate it with test data to verify functionality.

1.  **Log in to Django Admin:**
    *   Open your browser to: `http://localhost:8000/admin/`
    *   Use the superuser credentials created in the previous step.

2.  **Add Parameter Codes (`ParameterCode`):**
    *   Navigate to "CORE" -> "Parameter Codes".
    *   Click "Add Parameter code".
    *   Add several indicators, for example:
        *   Code: `HB`, Name: `Hemoglobin`, Unit: `g/L`
        *   Code: `TEMP`, Name: `Body Temperature`, Unit: `°C`
        *   Code: `WEIGHT`, Name: `Weight`, Unit: `kg`
        *   Code: `KARNOFSKY`, Name: `Karnofsky Score`, Unit: `points`
        *   ... and others as needed.
    *   Save each one.

3.  **Add ICD Codes (`MKBCode`) (if implemented):**
    *   Navigate to "CORE" -> "MKB Codes".
    *   Click "Add MKB code".
    *   Add a few diagnoses, for example:
        *   Code: `C71.0`, Name: `Malignant neoplasm of cerebrum, except lobes and ventricles`
        *   Code: `C40.2`, Name: `Malignant neoplasm of long bones of lower limb`
    *   Save each one. *(Ideally, there should be a command for bulk loading).*

4.  **Add Patients (`Patient`):**
    *   Navigate to "CORE" -> "Patients".
    *   Click "Add Patient".
    *   Add 2-3 test patients, providing First Name, Last Name, Date of Birth, and selecting the "Primary diagnosis (MKB)" from the list (if the ForeignKey/autocomplete is implemented). Examples:
        *   Ivanov Ivan Ivanovich, 2010-05-15, Diagnosis: C71.0
        *   Petrova Maria Sergeevna, 2008-11-22, Diagnosis: C40.2
    *   Save each one. Note their IDs.

5.  **Add Observations (`Observation`):**
    *   Navigate to "CORE" -> "Observations".
    *   Click "Add Observation".
    *   For different patients, add several observations for the parameter codes created earlier (`HB`, `WEIGHT`, etc.). **Make sure to:**
        *   Select the correct Patient and Parameter.
        *   Use **different Dates and Times (`Timestamp`)** for observations of the same parameter for a single patient to see the dynamics.
        *   Fill in the **Value** field (e.g., '120', '45.5').
        *   Fill in the **Value numeric** field with a number (e.g., 120, 45.5) for indicators that should be plotted on the chart.
    *   Add at least 2-3 records for 1-2 parameters for 1-2 patients.

## Accessing the Application

*   **Frontend (Main App):** `http://localhost:3000/`
*   **Django Admin:** `http://localhost:8000/admin/`
*   **API (via DRF Browsable API if SessionAuthentication is enabled):** `http://localhost:8000/api/`

## Stopping the Application

To stop all running containers:

```bash
docker compose down
