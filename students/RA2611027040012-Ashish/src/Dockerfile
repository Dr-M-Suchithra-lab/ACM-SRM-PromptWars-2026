# FairShift: single container for Google Cloud Run.
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /srv

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY app ./app
COPY static ./static

# Run as an unprivileged user.
RUN useradd --create-home --uid 10001 fairshift
USER fairshift

# Cloud Run sets $PORT (default 8080). Secure cookies are on because Cloud Run serves HTTPS.
ENV PORT=8080 SECURE_COOKIES=true
EXPOSE 8080
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT} --proxy-headers --forwarded-allow-ips='*'"]
