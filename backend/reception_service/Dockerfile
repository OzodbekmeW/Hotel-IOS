FROM python:3.11-slim
WORKDIR /app
COPY reception_service/requirements.txt reception_service/requirements.txt
RUN pip install --no-cache-dir -r reception_service/requirements.txt
COPY shared/ shared/
COPY reception_service/ reception_service/
ENV PYTHONPATH=/app
CMD ["uvicorn", "reception_service.main:app", "--host", "0.0.0.0", "--port", "8001"]
