FROM python:3.11-slim
WORKDIR /app
COPY dashboard_service/requirements.txt dashboard_service/requirements.txt
RUN pip install --no-cache-dir -r dashboard_service/requirements.txt
COPY shared/ shared/
COPY dashboard_service/ dashboard_service/
ENV PYTHONPATH=/app
CMD ["uvicorn", "dashboard_service.main:app", "--host", "0.0.0.0", "--port", "8000"]
