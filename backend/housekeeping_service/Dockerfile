FROM python:3.11-slim
WORKDIR /app
COPY housekeeping_service/requirements.txt housekeeping_service/requirements.txt
RUN pip install --no-cache-dir -r housekeeping_service/requirements.txt
COPY shared/ shared/
COPY housekeeping_service/ housekeeping_service/
ENV PYTHONPATH=/app
CMD ["uvicorn", "housekeeping_service.main:app", "--host", "0.0.0.0", "--port", "8002"]
