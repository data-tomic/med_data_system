# backend/config/urls.py
from django.contrib import admin
from django.urls import path, include
# --- ДОБАВЛЯЕМ ИМПОРТЫ ДЛЯ РАЗДАЧИ МЕДИА ---
from django.conf import settings
from django.conf.urls.static import static
# -------------------------------------------

# Импорты для Simple JWT
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

urlpatterns = [
    path('admin/', admin.site.urls),

    # Пути для аутентификации JWT
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # Подключение URL-путей вашего API приложения ('core')
    path('api/', include('core.urls')),

    # Можно добавить другие пути вашего проекта
]

# --- ДОБАВЛЯЕМ ОБРАБОТКУ МЕДИА-ФАЙЛОВ В РЕЖИМЕ РАЗРАБОТКИ ---
# В режиме DEBUG=True Django будет сам раздавать файлы из MEDIA_ROOT по MEDIA_URL
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
# ВНИМАНИЕ: Этот способ НЕ подходит для продакшена!
# В продакшене медиа-файлы должен раздавать веб-сервер (Nginx).
# ----------------------------------------------------------

# --- ОПЦИОНАЛЬНО: ОБРАБОТКА СТАТИЧЕСКИХ ФАЙЛОВ (если нужно) ---
# Если вы собираете статику Django Admin или других приложений
# и хотите, чтобы Django раздавал ее в DEBUG режиме
# (обычно статику раздает Nginx на фронтенде)
# if settings.DEBUG:
#     urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
# ------------------------------------------------------------
