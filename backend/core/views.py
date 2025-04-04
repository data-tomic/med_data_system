# backend/core/views.py
from rest_framework import generics, viewsets, permissions, status, filters
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser
# --- ИЗМЕНЕНИЕ: Импортируем необходимые классы для DRF CSV Renderer ---
from rest_framework.settings import api_settings
from rest_framework_csv.renderers import CSVRenderer
# -------------------------------------------------------------------
from django.db.models import Q, Prefetch
from django.utils import timezone
from datetime import datetime, timedelta
# --- УБИРАЕМ ИМПОРТЫ ДЛЯ РУЧНОЙ ГЕНЕРАЦИИ CSV ---
# from django.http import HttpResponse
# import csv
# import io
# --------------------------------------------------

# --- Импорты моделей и сериализаторов ---
from .models import (
    Patient, ParameterCode, Observation, MKBCode, MedicalTest, HospitalizationEpisode
)
# Импортируем ВСЕ сериализаторы, включая новые для Research
from .serializers import (
    PatientSerializer,
    ParameterCodeSerializer,
    ObservationSerializer,
    MKBCodeSerializer,
    MedicalTestSerializer,
    HospitalizationEpisodeSerializer,
    ResearchPatientSerializer,
    SimpleObservationSerializer # <- Теперь он нужен для подготовки данных для CSV рендерера
)

# --- ViewSet'ы для CRUD операций (без изменений) ---

class PatientViewSet(viewsets.ModelViewSet):
    queryset = Patient.objects.all().select_related('primary_diagnosis_mkb').order_by('last_name', 'first_name')
    serializer_class = PatientSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['last_name', 'first_name', 'middle_name', 'clinic_id']

    @action(detail=True, methods=['get'], url_path='dynamics')
    def get_patient_dynamics(self, request, pk=None):
        patient = self.get_object()
        parameter_codes = request.query_params.getlist('param')
        if not parameter_codes: return Response({"error": "Query parameter 'param' is required."}, status=status.HTTP_400_BAD_REQUEST)
        observations_qs = Observation.objects.filter(patient=patient, parameter__code__in=parameter_codes, parameter__is_numeric=True).select_related('parameter').order_by('timestamp')
        serializer = ObservationSerializer(observations_qs, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['get'], url_path='tests')
    def get_patient_tests(self, request, pk=None):
        patient = self.get_object()
        tests = MedicalTest.objects.filter(patient=patient).select_related('uploaded_by').order_by('-test_date')
        serializer = MedicalTestSerializer(tests, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['get'], url_path='episodes')
    def get_patient_episodes(self, request, pk=None):
        patient = self.get_object()
        episodes = HospitalizationEpisode.objects.filter(patient=patient).order_by('-start_date')
        serializer = HospitalizationEpisodeSerializer(episodes, many=True, context={'request': request})
        return Response(serializer.data)


class ObservationViewSet(viewsets.ModelViewSet):
    serializer_class = ObservationSerializer
    permission_classes = [permissions.IsAuthenticated]
    def get_queryset(self):
        queryset = Observation.objects.all().select_related('patient', 'parameter', 'recorded_by', 'episode')
        patient_id = self.request.query_params.get('patient_id')
        parameter_code = self.request.query_params.get('parameter_code')
        episode_id = self.request.query_params.get('episode_id')
        if not patient_id: return queryset.none() # Требуем patient_id для списка
        queryset = queryset.filter(patient_id=patient_id)
        if parameter_code: queryset = queryset.filter(parameter__code=parameter_code)
        if episode_id: queryset = queryset.filter(episode_id=episode_id)
        return queryset.order_by('-timestamp')
    def perform_create(self, serializer): serializer.save(recorded_by=self.request.user)


class HospitalizationEpisodeViewSet(viewsets.ModelViewSet):
    serializer_class = HospitalizationEpisodeSerializer
    permission_classes = [permissions.IsAuthenticated]
    def get_queryset(self):
        queryset = HospitalizationEpisode.objects.all().select_related('patient')
        patient_id = self.request.query_params.get('patient_id')
        if patient_id: queryset = queryset.filter(patient_id=patient_id)
        return queryset.order_by('-start_date')


class MedicalTestViewSet(viewsets.ModelViewSet):
    queryset = MedicalTest.objects.all().select_related('patient', 'uploaded_by').order_by('-test_date')
    serializer_class = MedicalTestSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)
    def perform_create(self, serializer): serializer.save(uploaded_by=self.request.user)
    def get_serializer_context(self): context = super().get_serializer_context(); context.update({"request": self.request}); return context
    def get_queryset(self): queryset = super().get_queryset(); patient_id = self.request.query_params.get('patient_id'); return queryset.filter(patient_id=patient_id) if patient_id else queryset


# --- Views для Справочников (без изменений) ---
class ParameterCodeListView(generics.ListAPIView):
    queryset = ParameterCode.objects.all().order_by('name')
    serializer_class = ParameterCodeSerializer
    permission_classes = [permissions.IsAuthenticated]

class MKBCodeSearchView(generics.ListAPIView):
    queryset = MKBCode.objects.all().order_by('code')
    serializer_class = MKBCodeSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['code', 'name']


# --- ИЗМЕНЕННЫЙ ResearchQueryView с использованием CSVRenderer ---
class ResearchQueryView(APIView):
    """
    Формирует выборку пациентов и их наблюдений по заданным критериям.
    Использует стандартные рендереры DRF (включая CSVRenderer)
    для вывода в JSON или CSV в зависимости от Accept хедера или ?format=csv.
    """
    permission_classes = [permissions.IsAuthenticated]
    # Указываем поддерживаемые рендереры. Если CSVRenderer добавлен в DEFAULT_RENDERER_CLASSES,
    # эту строку можно убрать. Но явное указание надежнее.
    renderer_classes = api_settings.DEFAULT_RENDERER_CLASSES + [CSVRenderer]

    def get(self, request, *args, **kwargs):
        # 1. Получение и валидация параметров (как было, БЕЗ format)
        diagnosis_mkb = request.query_params.get('diagnosis_mkb', None)
        age_min_str = request.query_params.get('age_min', None)
        age_max_str = request.query_params.get('age_max', None)
        param_codes = request.query_params.getlist('param_codes')
        start_date_str = request.query_params.get('start_date', None)
        end_date_str = request.query_params.get('end_date', None)

        if not param_codes:
            return Response({"error": "Query parameter 'param_codes' is required."}, status=status.HTTP_400_BAD_REQUEST)

        # 2. Фильтрация Пациентов (как было)
        patient_qs = Patient.objects.all().select_related('primary_diagnosis_mkb')
        if diagnosis_mkb: patient_qs = patient_qs.filter(primary_diagnosis_mkb__code__iexact=diagnosis_mkb)
        today = timezone.now().date()
        try:
            if age_min_str: patient_qs = patient_qs.filter(date_of_birth__lte=today - timedelta(days=int(age_min_str) * 365.25))
            if age_max_str: patient_qs = patient_qs.filter(date_of_birth__gte=today - timedelta(days=(int(age_max_str) + 1) * 365.25) + timedelta(days=1))
        except (ValueError, TypeError): return Response({"error": "Age parameters must be integers."}, status=status.HTTP_400_BAD_REQUEST)

        # 3. Подготовка фильтра для Наблюдений (как было)
        observation_filter = Q(parameter__code__in=param_codes)
        try:
            if start_date_str: observation_filter &= Q(timestamp__date__gte=datetime.strptime(start_date_str, '%Y-%m-%d').date())
            if end_date_str: observation_filter &= Q(timestamp__date__lte=datetime.strptime(end_date_str, '%Y-%m-%d').date())
        except ValueError: return Response({"error": "Invalid date format (use YYYY-MM-DD)."}, status=status.HTTP_400_BAD_REQUEST)

        # 4. Выполнение запроса с Prefetch (как было)
        patients_with_observations = patient_qs.prefetch_related(
            Prefetch(
                'observations',
                queryset=Observation.objects.filter(observation_filter).order_by('timestamp').select_related('parameter', 'episode'),
                to_attr='filtered_observations'
            )
        ).order_by('last_name', 'first_name')

        # 5. Подготовка данных для рендерера (Преобразование в плоский список)
        results_list = []
        # Определяем заголовки динамически на основе первого пациента/наблюдения или статически
        # (CSVRenderer использует ключи первого словаря по умолчанию)
        for patient in patients_with_observations:
            patient_info = { # Используем ResearchPatientSerializer для получения нужных полей пациента
                'patient_id': patient.id,
                'last_name': patient.last_name,
                'first_name': patient.first_name,
                'middle_name': patient.middle_name,
                'date_of_birth': patient.date_of_birth.strftime('%Y-%m-%d') if patient.date_of_birth else '',
                'clinic_id': patient.clinic_id,
                'primary_diagnosis_code': patient.primary_diagnosis_mkb.code if patient.primary_diagnosis_mkb else '',
            }
            if not hasattr(patient, 'filtered_observations') or not patient.filtered_observations:
                 # Если нет наблюдений, добавляем только инфо о пациенте
                 results_list.append(patient_info)
            else:
                for obs in patient.filtered_observations:
                    # Используем SimpleObservationSerializer для получения нужных полей наблюдения
                    obs_info = {
                        'observation_timestamp': obs.timestamp.isoformat() if obs.timestamp else '',
                        'parameter_code': obs.parameter.code if obs.parameter else '',
                        'parameter_name': obs.parameter.name if obs.parameter else '',
                        'unit': obs.parameter.unit if obs.parameter and obs.parameter.unit else '',
                        'value': obs.value,
                        'value_numeric': obs.value_numeric,
                        'episode_id': obs.episode.id if obs.episode else '',
                    }
                    # Объединяем инфо о пациенте и наблюдении
                    results_list.append({**patient_info, **obs_info})

        # 6. Возвращаем данные. DRF сам выберет рендерер (JSON или CSV)
        # на основе Accept хедера или параметра ?format=csv
        # CSVRenderer ожидает список словарей.
        # JSONRenderer по умолчанию обработает список словарей.
        # Если бы мы хотели сохранить вложенную структуру для JSON,
        # нужно было бы использовать ResearchPatientSerializer:
        # serializer = ResearchPatientSerializer(patients_with_observations, many=True, context={'request': request})
        # return Response(serializer.data)
        # Но для совместимости с CSVRenderer возвращаем плоский список:
        return Response(results_list)
