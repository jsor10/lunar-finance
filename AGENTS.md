# Base44 development notes

- Run the app with `docker compose -f docker-compose.base44.yml up -d`.
- The preview is Expo web on host port 3000; FastAPI is exposed on host port 8000 and MongoDB stays internal.
- The frontend must receive the API's public preview URL because browser requests originate outside Docker. Compose derives it from `BASE44_PUBLIC_HOST_SUFFIX`.
- The backend's production requirements file contains a large generated toolchain; the development service installs only the direct packages used by `backend/server.py` to keep startup focused and reliable.
- No external credential is required to render the app. Google sign-in is mediated by the app's existing hosted Emergent auth endpoints.
- Verify with `curl -f http://localhost:8000/docs`, `curl -f http://localhost:3000/`, and an external Host header against port 3000.
