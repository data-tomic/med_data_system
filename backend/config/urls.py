# backend/config/urls.py

from django.contrib import admin
from django.urls import path, include

# Импорты для Simple JWT
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

urlpatterns = [
    path('admin/', admin.site.urls),

    # Пути для аутентификации JWT
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'), # Получение пары токенов по логину/паролю
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'), # Обновление Access токена по Refresh токену

    # Подключение URL-путей вашего API приложения (например, 'core')
    # Убедитесь, что префикс 'api/' не дублируется, если он уже есть в core.urls
    path('api/', include('core.urls')), # <--- Замените 'core.urls' на ваш файл URL API

    # Можно добавить другие пути вашего проекта
]

# Обработка медиа файлов в режиме разработки (если используете)
# from django.conf import settings
# from django.conf.urls.static import static
# if settings.DEBUG:
#     urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
