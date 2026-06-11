FROM python:3.11-slim
WORKDIR /app
COPY maintenance_service/requirements.txt maintenance_service/requirements.txt
RUN pip install --no-cache-dir -r maintenance_service/requirements.txt
COPY shared/ shared/
COPY maintenance_service/ maintenance_service/
ENV PYTHONPATH=/app
CMD ["uvicorn", "maintenance_service.main:app", "--host", "0.0.0.0", "--port", "8004"]
