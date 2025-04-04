# backend/core/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
# --- Импортируем ВСЕ необходимые Views, включая новые ---
from .views import (
    PatientViewSet,
    ParameterCodeListView,
    ResearchQueryView,
    MKBCodeSearchView,
    MedicalTestViewSet,
    ObservationViewSet,            # <--- ДОБАВЛЕН ИМПОРТ
    HospitalizationEpisodeViewSet  # <--- ДОБАВЛЕН ИМПОРТ
)

# Создаем роутер и регистрируем ViewSet'ы
router = DefaultRouter()
router.register(r'patients', PatientViewSet, basename='patient')
router.register(r'medical-tests', MedicalTestViewSet, basename='medicaltest')
# --- РЕГИСТРИРУЕМ НОВЫЕ ViewSet'ы В РОУТЕРЕ ---
router.register(r'observations', ObservationViewSet, basename='observation')
router.register(r'episodes', HospitalizationEpisodeViewSet, basename='episode')
# ----------------------------------------------

# router.register(r'observation-types', ObservationTypeViewSet, basename='observationtype') # Удалено/закомментировано ранее

urlpatterns = [
    # Явные пути для ListAPIView и APIView (остаются без изменений)
    path('parameters/', ParameterCodeListView.as_view(), name='parametercode-list'),
    path('research/query/', ResearchQueryView.as_view(), name='research-query'),
    path('mkb-codes/', MKBCodeSearchView.as_view(), name='mkbcode-search'),

    # Включаем URL, сгенерированные роутером.
    # Теперь он включает:
    # /api/patients/ (+ actions dynamics, tests, episodes)
    # /api/medical-tests/
    # /api/observations/ (с фильтрацией по ?patient_id=...)
    # /api/episodes/ (с фильтрацией по ?patient_id=...)
    path('', include(router.urls)),
]
