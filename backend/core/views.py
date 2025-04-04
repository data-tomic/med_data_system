# backend/core/views.py
from rest_framework import generics, viewsets, permissions, status, filters
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser
from django.utils import timezone
from datetime import timedelta
from django.shortcuts import get_object_or_404
# Опционально: для удобной фильтрации
# from django_filters.rest_framework import DjangoFilterBackend

# --- Импорты моделей и сериализаторов ---
from .models import (
    Patient, ParameterCode, Observation, MKBCode, MedicalTest, HospitalizationEpisode # <- Добавлен HospitalizationEpisode
)
from .serializers import (
    PatientSerializer,
    ParameterCodeSerializer,
    ObservationSerializer,
    MKBCodeSerializer,
    MedicalTestSerializer,
    HospitalizationEpisodeSerializer # <- Добавлен импорт
)


class PatientViewSet(viewsets.ModelViewSet):
    """
    ViewSet для работы с Пациентами.
    Включает actions для получения динамики и списка тестов.
    """
    queryset = Patient.objects.all().select_related('primary_diagnosis_mkb').order_by('last_name', 'first_name')
    serializer_class = PatientSerializer
    permission_classes = [permissions.IsAuthenticated]
    # Добавляем поиск по ФИО и ID клиники
    filter_backends = [filters.SearchFilter]
    search_fields = ['last_name', 'first_name', 'middle_name', 'clinic_id']

    @action(detail=True, methods=['get'], url_path='dynamics')
    def get_patient_dynamics(self, request, pk=None):
        """
        Возвращает динамику показателей для конкретного пациента.
        Принимает коды параметров в ?param=CODE1¶m=CODE2
        """
        patient = self.get_object()
        parameter_codes = request.query_params.getlist('param') # Получаем список кодов
        if not parameter_codes:
            return Response(
                {"error": "Query parameter 'param' is required with at least one parameter code."},
                status=status.HTTP_400_BAD_REQUEST
            )
        # Фильтруем наблюдения по пациенту и списку кодов параметров, сортируем по времени
        observations = Observation.objects.filter(
            patient=patient,
            parameter__code__in=parameter_codes
        ).select_related('parameter').order_by('timestamp') # Добавим select_related для оптимизации

        # Можно добавить фильтрацию по дате, если нужно
        # start_date = request.query_params.get('start_date')
        # end_date = request.query_params.get('end_date')
        # if start_date: observations = observations.filter(timestamp__gte=start_date)
        # if end_date: observations = observations.filter(timestamp__lte=end_date)

        serializer = ObservationSerializer(observations, many=True, context={'request': request}) # Передаем контекст
        return Response(serializer.data)

    @action(detail=True, methods=['get'], url_path='tests')
    def get_patient_tests(self, request, pk=None):
        """
        Возвращает список медицинских тестов для конкретного пациента.
        """
        patient = self.get_object()
        tests = MedicalTest.objects.filter(patient=patient).select_related('uploaded_by').order_by('-test_date') # Оптимизация
        serializer = MedicalTestSerializer(tests, many=True, context={'request': request})
        return Response(serializer.data)

    # --- НОВЫЙ Action для получения эпизодов пациента ---
    # URL: /api/patients/{pk}/episodes/
    @action(detail=True, methods=['get'], url_path='episodes')
    def get_patient_episodes(self, request, pk=None):
        """
        Возвращает список эпизодов госпитализации для конкретного пациента.
        """
        patient = self.get_object()
        episodes = HospitalizationEpisode.objects.filter(patient=patient).order_by('-start_date')
        serializer = HospitalizationEpisodeSerializer(episodes, many=True, context={'request': request})
        return Response(serializer.data)
    # --- /НОВЫЙ Action ---


class ParameterCodeListView(generics.ListAPIView):
    """Возвращает список всех кодов параметров."""
    queryset = ParameterCode.objects.all().order_by('name')
    serializer_class = ParameterCodeSerializer
    permission_classes = [permissions.IsAuthenticated]


class ResearchQueryView(APIView):
    """
    Эндпоинт для формирования исследовательских выборок.
    Пока фильтрует только пациентов. Требует доработки для выборки параметров.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        queryset = Patient.objects.all().select_related('primary_diagnosis_mkb') # Оптимизация
        diagnosis_mkb = request.query_params.get('diagnosis_mkb', None)
        age_min_str = request.query_params.get('age_min', None)
        age_max_str = request.query_params.get('age_max', None)

        if diagnosis_mkb:
            # Ищем по точному коду или можно использовать __icontains для частичного совпадения
            queryset = queryset.filter(primary_diagnosis_mkb__code__iexact=diagnosis_mkb)

        today = timezone.now().date()
        if age_min_str:
            try:
                age_min = int(age_min_str)
                # Самая поздняя дата рождения для минимального возраста
                latest_birth_date = today - timedelta(days=age_min * 365.25)
                queryset = queryset.filter(date_of_birth__lte=latest_birth_date)
            except ValueError:
                return Response({"error": "'age_min' must be an integer."}, status=status.HTTP_400_BAD_REQUEST)
        if age_max_str:
            try:
                age_max = int(age_max_str)
                # Самая ранняя дата рождения для максимального возраста
                earliest_birth_date = today - timedelta(days=(age_max + 1) * 365.25) + timedelta(days=1)
                queryset = queryset.filter(date_of_birth__gte=earliest_birth_date)
            except ValueError:
                return Response({"error": "'age_max' must be an integer."}, status=status.HTTP_400_BAD_REQUEST)

        # TODO: Добавить логику для выборки и возврата КОНКРЕТНЫХ ПАРАМЕТРОВ/НАБЛЮДЕНИЙ для этих пациентов

        serializer = PatientSerializer(queryset, many=True, context={'request': request})
        return Response(serializer.data)


class MKBCodeSearchView(generics.ListAPIView):
    """Возвращает список кодов МКБ с возможностью поиска."""
    queryset = MKBCode.objects.all().order_by('code')
    serializer_class = MKBCodeSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['code', 'name'] # Поиск по коду и названию


class MedicalTestViewSet(viewsets.ModelViewSet):
    """
    ViewSet для работы с Медицинскими тестами.
    Обрабатывает загрузку файлов.
    """
    queryset = MedicalTest.objects.all().select_related('patient', 'uploaded_by').order_by('-test_date')
    serializer_class = MedicalTestSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser) # Для обработки файлов

    def perform_create(self, serializer):
        """Устанавливаем текущего пользователя как 'uploaded_by'."""
        serializer.save(uploaded_by=self.request.user)

    def get_serializer_context(self):
        """Передаем request в контекст для генерации file_url."""
        context = super().get_serializer_context()
        context.update({"request": self.request})
        return context

    def get_queryset(self):
        """
        Фильтруем тесты по ID пациента, если он передан в query параметрах.
        Иначе возвращаем все (или пустой список/ошибку, если требуется строгость).
        """
        queryset = super().get_queryset() # Получаем базовый queryset
        patient_id = self.request.query_params.get('patient_id')
        if patient_id:
            queryset = queryset.filter(patient_id=patient_id)
        # else:
            # Вернуть пустой queryset, если ID пациента обязателен для листинга
            # return queryset.none()
        return queryset


# --- НОВЫЙ ViewSet ДЛЯ Observation ---
class ObservationViewSet(viewsets.ModelViewSet):
    """
    ViewSet для работы с Наблюдениями (показателями).
    Требует фильтрации по 'patient_id' при запросе списка.
    """
    serializer_class = ObservationSerializer
    permission_classes = [permissions.IsAuthenticated]
    # Опционально: Включить фильтры, если используется django-filter
    # filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    # filterset_fields = ['patient', 'parameter', 'episode']
    # ordering_fields = ['timestamp', 'parameter__name']
    # ordering = ['-timestamp'] # Сортировка по умолчанию

    def get_queryset(self):
        """
        Фильтруем наблюдения по ID пациента, ID параметра или ID эпизода,
        если они переданы в query параметрах.
        """
        # Оптимизация запроса за счет подгрузки связанных данных
        queryset = Observation.objects.all().select_related(
            'patient', 'parameter', 'recorded_by', 'episode'
        )

        patient_id = self.request.query_params.get('patient_id')
        parameter_code = self.request.query_params.get('parameter_code')
        episode_id = self.request.query_params.get('episode_id')

        if patient_id:
            queryset = queryset.filter(patient_id=patient_id)
        # else:
            # Если не передан patient_id, вернуть пустой список или ошибку
            # return queryset.none()
            # Или оставить так, если нужно иметь возможность получать ВСЕ наблюдения (осторожно!)

        if parameter_code:
            queryset = queryset.filter(parameter__code=parameter_code)
        if episode_id:
            queryset = queryset.filter(episode_id=episode_id)

        # Всегда сортируем по времени (сначала новые)
        return queryset.order_by('-timestamp')

    def perform_create(self, serializer):
        """Устанавливаем текущего пользователя как recorded_by."""
        serializer.save(recorded_by=self.request.user)
# --- /НОВЫЙ ViewSet ДЛЯ Observation ---


# --- НОВЫЙ ViewSet ДЛЯ HospitalizationEpisode ---
class HospitalizationEpisodeViewSet(viewsets.ModelViewSet):
    """
    ViewSet для работы с Эпизодами госпитализации.
    """
    serializer_class = HospitalizationEpisodeSerializer
    permission_classes = [permissions.IsAuthenticated]
    # Опционально: Фильтрация
    # filter_backends = [DjangoFilterBackend]
    # filterset_fields = ['patient']

    def get_queryset(self):
        """
        Фильтруем эпизоды по ID пациента, если он передан в query параметрах.
        """
        queryset = HospitalizationEpisode.objects.all().select_related('patient')

        patient_id = self.request.query_params.get('patient_id')
        if patient_id:
            queryset = queryset.filter(patient_id=patient_id)
        # else:
            # Можно вернуть пустой список, если patient_id обязателен
            # return queryset.none()

        return queryset.order_by('-start_date') # Сортируем по дате начала (сначала новые)

    # perform_create здесь не нужен, если нет дополнительной логики
    # def perform_create(self, serializer):
    #     # Можно добавить логику, например, проверку пересечения дат с другими эпизодами
    #     super().perform_create(serializer)
# --- /НОВЫЙ ViewSet ДЛЯ HospitalizationEpisode ---
