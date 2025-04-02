# backend/core/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
# --- Импортируем ВСЕ необходимые Views ---
from .views import (
    PatientViewSet,
    ParameterCodeListView,
    ResearchQueryView,
    MKBCodeSearchView
    # Оставляем импорты для ViewSet'ов, которые используются в роутере
    # (Убедитесь, что эти ViewSet'ы действительно существуют в views.py)
    # HospitalizationEpisodeViewSet,
    # ObservationTypeViewSet,
    # ObservationViewSet
)

# Создаем роутер и регистрируем ViewSet'ы, которые должны управляться роутером
router = DefaultRouter()
router.register(r'patients', PatientViewSet, basename='patient')
# router.register(r'episodes', HospitalizationEpisodeViewSet, basename='episode')
# router.register(r'observation-types', ObservationTypeViewSet, basename='observationtype')
# router.register(r'observations', ObservationViewSet, basename='observation')


urlpatterns = [
    # Путь для списка кодов параметров
    path('parameters/', ParameterCodeListView.as_view(), name='parametercode-list'),

    # --- ДОБАВЛЯЕМ ПУТЬ ДЛЯ ЗАПРОСА ИССЛЕДОВАНИЙ ---
    # Этот путь будет доступен как /api/research/query/
    path('research/query/', ResearchQueryView.as_view(), name='research-query'),
    # ------------------------------------------------
    # --- ДОБАВЛЯЕМ ПУТЬ ДЛЯ ПОИСКА МКБ ---
    path('mkb-codes/', MKBCodeSearchView.as_view(), name='mkbcode-search'),
    # ------------------------------------

    # Включаем URL, сгенерированные роутером (для /api/patients/ и т.д.)
    # Порядок между явными путями и роутером здесь не важен, т.к. нет конфликтов имен
    path('', include(router.urls)),
]
