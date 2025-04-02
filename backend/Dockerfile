# Используем официальный образ Python
FROM python:3.12-slim

# Устанавливаем переменные окружения
ENV PYTHONDONTWRITEBYTECODE 1  # Предотвращает создание .pyc файлов
ENV PYTHONUNBUFFERED 1      # Выводит логи Python сразу в консоль Docker

# Устанавливаем рабочую директорию в контейнере
WORKDIR /app

# Устанавливаем системные зависимости, если они понадобятся
# Например, build-essential и libpq-dev могут понадобиться для psycopg2
# Хотя psycopg2-binary обычно не требует их
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
  && rm -rf /var/lib/apt/lists/*

# Копируем файл с зависимостями и устанавливаем их
# Копируем сначала, чтобы использовать кэш Docker при изменении кода
COPY requirements.txt .
RUN pip install --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

# Копируем весь код проекта в рабочую директорию
COPY . .

# Примечание: Порт 8000 будет открыт через docker-compose.yml
# Команда запуска будет указана в docker-compose.yml
