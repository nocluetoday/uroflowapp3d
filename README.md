# UroFlow

Urine flow simulation through the male prostatic urethra using:
- React + Vite frontend (standalone, no backend required)
- Optional FastAPI backend (`/simulate`) if API deployment is needed
- A phenomenological uroflow model that estimates `Q_max` and average flow velocity from:
  - detrusor pressure (`p_det`)
  - prostate length (`length`)
  - prostate volume (`volume`)
  - IPP grade (`ipp_grade`)

## Project Structure

- `main.py`: FastAPI app and `/simulate` endpoint
- `simulation.py`: uroflow simulation model
- `frontend/`: React frontend
- `Dockerfile`, `docker-compose.yml`: containerized backend setup

## Requirements

- Python 3.11+ (local backend run)
- Node.js 18+ and npm (frontend run)
- Docker Desktop (optional, for containerized backend)

## Run Locally (Backend)

From project root:

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Backend will be available at:
- `http://localhost:8000`
- OpenAPI docs: `http://localhost:8000/docs`

## Run Locally (Standalone App)

From `frontend/`:

```bash
npm install
npm run dev
```

Frontend runs entirely in-browser using the local simulation model in:
- `frontend/src/simulation.js`

No backend process is required for normal app usage.

## Run with Docker (Backend)

From project root:

```bash
docker compose up --build
```

The backend will be exposed on `http://localhost:8000`.

## API Usage

Endpoint:
- `POST /simulate`

Example request:

```bash
curl -X POST http://localhost:8000/simulate \
  -H "Content-Type: application/json" \
  -d '{
    "p_det": 50,
    "length": 4.5,
    "volume": 40,
    "ipp_grade": 2
  }'
```

Example response:

```json
{
  "q_max": 23.67,
  "average_velocity": 218.46,
  "p_det_used": 50.0
}
```

## Notes

- `q_max` is reported in mL/s.
- `average_velocity` is reported in cm/s.
- This is a simplified phenomenological model, not a full CFD/FSI solver.

## License

This project is licensed under the MIT License. See `LICENSE`.
