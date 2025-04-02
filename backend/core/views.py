# backend/core/views.py
# Убираем неиспользуемый импорт
# from django.shortcuts import render

# --- Необходимые импорты ---
from rest_framework import generics, viewsets, permissions, status, filters
from rest_framework.views import APIView # <--- Добавляем импорт APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from django.utils import timezone # <--- Добавляем импорт timezone
from datetime import timedelta # <--- Добавляем импорт timedelta
# --------------------------------------------------


# --- Импорты моделей и сериализаторов ---
from .models import Patient, ParameterCode, Observation, MKBCode
from .serializers import (
    PatientSerializer,
    ParameterCodeSerializer,
    ObservationSerializer,
    MKBCodeSerializer
)
# ----------------------------------------------------


# --- PatientViewSet с action ---
class PatientViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows patients to be viewed or edited.
    """
    queryset = Patient.objects.all().order_by('last_name', 'first_name')
    serializer_class = PatientSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=True, methods=['get'], url_path='dynamics')
    def get_patient_dynamics(self, request, pk=None):
        """
        Returns the observation dynamics for a specific patient based on query parameters.
        Example: /api/patients/{pk}/dynamics/?param=CODE1¶m=CODE2
        """
        patient = self.get_object()
        parameter_codes = request.query_params.getlist('param')

        if not parameter_codes:
            return Response(
                {"error": "Необходимо указать хотя бы один параметр 'param' в запросе."},
                status=status.HTTP_400_BAD_REQUEST
            )

        observations = Observation.objects.filter(
            patient=patient,
            parameter__code__in=parameter_codes
        ).order_by('timestamp')

        serializer = ObservationSerializer(observations, many=True)
        return Response(serializer.data)
# --- /PatientViewSet ---


# --- ParameterCodeListView ---
class ParameterCodeListView(generics.ListAPIView):
    """
    API endpoint that allows retrieving the list of observation parameter codes.
    """
    queryset = ParameterCode.objects.all().order_by('name')
    serializer_class = ParameterCodeSerializer
    permission_classes = [permissions.IsAuthenticated]
    # pagination_class = None
# --- /ParameterCodeListView ---


# --- НОВАЯ VIEW ДЛЯ ЗАПРОСОВ ИССЛЕДОВАНИЙ ---
class ResearchQueryView(APIView):
    """
    Handles research queries based on patient criteria.
    Example: /api/research/query/?diagnosis_mkb=C71&age_min=12&age_max=18
    Returns a list of patients matching the criteria.
    """
    permission_classes = [permissions.IsAuthenticated] # Защищаем доступ

    def get(self, request, *args, **kwargs):
        # Начинаем с полного QuerySet пациентов
        queryset = Patient.objects.all()

        # Получаем параметры фильтрации из GET-запроса
        diagnosis_mkb = request.query_params.get('diagnosis_mkb', None)
        age_min_str = request.query_params.get('age_min', None)
        age_max_str = request.query_params.get('age_max', None)

        # --- Фильтрация по Диагнозу МКБ ---
        if diagnosis_mkb:
            # Убедитесь, что поле primary_diagnosis_mkb существует в модели Patient
            queryset = queryset.filter(primary_diagnosis_mkb__iexact=diagnosis_mkb)

        # --- Фильтрация по Возрасту ---
        today = timezone.now().date()
        # Минимальный возраст
        if age_min_str:
            try:
                age_min = int(age_min_str)
                # Вычисляем самую позднюю дату рождения для минимального возраста
                latest_birth_date = today - timedelta(days=age_min * 365.25) # Приблизительно
                queryset = queryset.filter(date_of_birth__lte=latest_birth_date)
            except ValueError:
                return Response(
                    {"error": "Параметр 'age_min' должен быть целым числом."},
                    status=status.HTTP_400_BAD_REQUEST
                )
        # Максимальный возраст
        if age_max_str:
            try:
                age_max = int(age_max_str)
                # Вычисляем самую раннюю дату рождения для максимального возраста
                # (+1 год и -1 день, чтобы включить тех, кому age_max исполнился вчера)
                earliest_birth_date = today - timedelta(days=(age_max + 1) * 365.25) + timedelta(days=1) # Приблизительно
                queryset = queryset.filter(date_of_birth__gte=earliest_birth_date)
            except ValueError:
                return Response(
                    {"error": "Параметр 'age_max' должен быть целым числом."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # --- Добавьте здесь другие фильтры по необходимости ---

        # Сериализуем результаты (возвращаем базовые данные, не только ID)
        # Используем PatientSerializer, убедитесь, что он импортирован
        serializer = PatientSerializer(queryset, many=True)
        return Response(serializer.data)
# --- /НОВАЯ VIEW ---

# --- НОВАЯ VIEW ДЛЯ ПОИСКА МКБ ---
class MKBCodeSearchView(generics.ListAPIView):
    """
    API endpoint for searching MKB codes and names.
    Use ?search=... query parameter.
    Example: /api/mkb-codes/?search=C71
    """
    queryset = MKBCode.objects.all()
    serializer_class = MKBCodeSerializer
    permission_classes = [permissions.IsAuthenticated]
    # Добавляем фильтр поиска по полям code и name
    filter_backends = [filters.SearchFilter]
    search_fields = ['code', 'name']
    # pagination_class = None # Можно отключить пагинацию, если нужно видеть все результаты поиска
# --- /НОВАЯ VIEW ---


# --- Остальные ViewSet'ы (ЗАКОММЕНТИРОВАНЫ, как и были) ---
# ...
# class HospitalizationEpisodeViewSet(viewsets.ModelViewSet): ...
# class ObservationTypeViewSet(viewsets.ModelViewSet): ...
# class ObservationViewSet(viewsets.ModelViewSet): ...
# ...
# --- /Остальные ViewSet'ы ---
