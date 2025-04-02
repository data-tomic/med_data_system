# Используем официальный образ Node.js (выберите LTS версию, например 20 или 22)
FROM node:20-alpine AS builder
# Используем alpine для меньшего размера образа

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json и package-lock.json (или yarn.lock)
# Копируем их отдельно, чтобы использовать кэш Docker при установке зависимостей
COPY package*.json ./
# Если используете yarn:
# COPY yarn.lock ./
# COPY package.json ./

# Устанавливаем зависимости
RUN npm install
# Если используете yarn:
# RUN yarn install --frozen-lockfile

# Копируем остальной код приложения
COPY . .

# Собираем приложение для продакшена
# Переменные окружения для сборки можно передать через --build-arg или .env файлы
RUN npm run build

# --- Этап 2: Сервер для раздачи статики ---
# Используем легковесный Nginx для раздачи собранных файлов
FROM nginx:stable-alpine

# Копируем собранные файлы из этапа 'builder'
COPY --from=builder /app/build /usr/share/nginx/html

# Копируем кастомный конфиг Nginx (создадим его ниже)
# Он нужен, чтобы React Router работал корректно (все запросы направлял на index.html)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Открываем порт 80 (стандартный для Nginx)
EXPOSE 80

# Запускаем Nginx
CMD ["nginx", "-g", "daemon off;"]
