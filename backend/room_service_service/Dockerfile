FROM python:3.11-slim
WORKDIR /app
COPY room_service_service/requirements.txt room_service_service/requirements.txt
RUN pip install --no-cache-dir -r room_service_service/requirements.txt
COPY shared/ shared/
COPY room_service_service/ room_service_service/
ENV PYTHONPATH=/app
CMD ["uvicorn", "room_service_service.main:app", "--host", "0.0.0.0", "--port", "8003"]
