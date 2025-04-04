# backend/core/serializers.py
from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.db import models # Импортируем models для Prefetch

# --- Импорты моделей ---
from .models import Patient, ParameterCode, Observation, MKBCode, MedicalTest, HospitalizationEpisode

User = get_user_model()

# --- Сериализаторы для Справочников ---

class MKBCodeSerializer(serializers.ModelSerializer):
    """Сериализатор для кодов МКБ"""
    class Meta:
        model = MKBCode
        fields = ('code', 'name')

class ParameterCodeSerializer(serializers.ModelSerializer):
    """Сериализатор для Кодов Показателей"""
    class Meta:
        model = ParameterCode
        # Добавляем is_numeric, чтобы фронтенд мог знать, числовой ли параметр
        fields = ['code', 'name', 'unit', 'description', 'is_numeric']


# --- Основные Сериализаторы для CRUD ---

class HospitalizationEpisodeSerializer(serializers.ModelSerializer):
    """Сериализатор для Эпизодов госпитализации (для CRUD и списков)"""
    # При записи ожидаем ID пациента
    patient = serializers.PrimaryKeyRelatedField(queryset=Patient.objects.all())
    # При чтении показываем строку пациента
    patient_display = serializers.CharField(source='patient.__str__', read_only=True)

    class Meta:
        model = HospitalizationEpisode
        fields = [
            'id',
            'patient', # ID для записи
            'patient_display', # Строка для чтения
            'start_date',
            'end_date',
            'created_at',
            'updated_at', # Добавлено поле обновления
        ]
        read_only_fields = ['id', 'patient_display', 'created_at', 'updated_at']


class ObservationSerializer(serializers.ModelSerializer):
    """Сериализатор для Наблюдений (Observation) (для CRUD и списков)"""
    # Позволяет записывать/читать параметр по его коду ('HB', 'TEMP')
    parameter = serializers.SlugRelatedField(
        queryset=ParameterCode.objects.all(),
        slug_field='code'
    )
    # Ожидаем ID пациента при создании/обновлении
    patient = serializers.PrimaryKeyRelatedField(queryset=Patient.objects.all())
    # Эпизод по ID, необязательно
    episode = serializers.PrimaryKeyRelatedField(queryset=HospitalizationEpisode.objects.all(), required=False, allow_null=True)

    # Поля только для чтения для отображения связанной информации
    patient_display = serializers.CharField(source='patient.__str__', read_only=True)
    # Для отображения параметра можно добавить поле с деталями
    parameter_details = ParameterCodeSerializer(source='parameter', read_only=True)
    recorded_by_display = serializers.CharField(source='recorded_by.username', read_only=True, allow_null=True)
    episode_display = serializers.CharField(source='episode.__str__', read_only=True, allow_null=True)

    class Meta:
        model = Observation
        fields = [
            'id',
            'patient',            # ID для записи
            'patient_display',    # Отображение для чтения
            'parameter',          # Код ('HB') для записи/чтения
            'parameter_details',  # Детали параметра для чтения
            'value',              # Строковое значение
            'value_numeric',      # Числовое значение (только чтение, заполняется в модели)
            'timestamp',          # Дата и время
            'episode',            # ID эпизода (опционально при записи/чтении)
            'episode_display',    # Отображение эпизода для чтения
            'recorded_by',        # ID пользователя (только чтение)
            'recorded_by_display',# Имя пользователя (только чтение)
        ]
        # Устанавливаем поля, которые нельзя изменять через API напрямую
        read_only_fields = [
            'id', 'patient_display', 'parameter_details',
            'value_numeric', # Заполняется автоматически в модели
            'recorded_by', 'recorded_by_display', 'episode_display'
        ]
        # value_numeric не нужно указывать при создании/обновлении, он вычисляется в модели.

    # Валидацию можно добавить здесь, если нужно


class MedicalTestSerializer(serializers.ModelSerializer):
    """Сериализатор для Медицинских тестов/Опросников (для CRUD и списков)"""
    patient = serializers.PrimaryKeyRelatedField(queryset=Patient.objects.all())
    uploaded_by = serializers.SlugRelatedField(slug_field='username', read_only=True, allow_null=True) # Отображаем username
    patient_display = serializers.CharField(source='patient.__str__', read_only=True)
    file_url = serializers.SerializerMethodField()
    file_name = serializers.CharField(source='filename', read_only=True)

    class Meta:
        model = MedicalTest
        fields = [
            'id',
            'patient',
            'patient_display',
            'test_name',
            'test_date',
            'uploaded_file', # Для ЗАПИСИ файла
            'file_url',      # Для ЧТЕНИЯ URL
            'file_name',     # Для ЧТЕНИЯ имени файла
            'score',
            'result_text',
            'uploaded_by',   # Имя пользователя (только чтение)
            'created_at',
            'updated_at',    # Добавлено поле обновления
        ]
        read_only_fields = [
            'id', 'patient_display', 'uploaded_by',
            'file_url', 'file_name', 'created_at', 'updated_at'
        ]
        extra_kwargs = {
            # write_only=True скрывает поле из GET-ответов
            'uploaded_file': {'required': False, 'allow_null': True, 'write_only': True}
        }

    def get_file_url(self, obj):
        request = self.context.get('request')
        if obj.uploaded_file and request:
            try:
                return request.build_absolute_uri(obj.uploaded_file.url)
            except ValueError: return None
        return None


class PatientSerializer(serializers.ModelSerializer):
    """Сериализатор для модели Пациента (для CRUD и списков)"""
    primary_diagnosis_mkb = serializers.SlugRelatedField(
        queryset=MKBCode.objects.all(), slug_field='code', allow_null=True, required=False
    )
    primary_diagnosis_mkb_name = serializers.CharField(source='primary_diagnosis_mkb.name', read_only=True, allow_null=True)

    class Meta:
        model = Patient
        fields = [
            'id',
            'last_name',
            'first_name',
            'middle_name',
            'date_of_birth',
            'clinic_id',
            'primary_diagnosis_mkb', # Код для записи
            'primary_diagnosis_mkb_name', # Имя для чтения
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'primary_diagnosis_mkb_name']


# --- Сериализаторы СПЕЦИАЛЬНО для ResearchQueryView ---

class SimpleObservationSerializer(serializers.ModelSerializer):
    """Упрощенный сериализатор для отдельного наблюдения в результатах исследования"""
    # Получаем нужные поля из связанного параметра
    parameter_code = serializers.CharField(source='parameter.code')
    parameter_name = serializers.CharField(source='parameter.name')
    unit = serializers.CharField(source='parameter.unit', allow_null=True)

    class Meta:
        model = Observation
        fields = [
            'parameter_code',
            'parameter_name',
            'unit',
            'timestamp',
            'value',
            'value_numeric',
            'episode', # Возвращаем ID эпизода
        ]
        # Все поля только для чтения в этом контексте


class ResearchPatientSerializer(serializers.ModelSerializer):
    """Сериализатор для пациента с отфильтрованными наблюдениями для исследований"""
    # Используем атрибут 'filtered_observations', созданный через Prefetch во View
    # и SimpleObservationSerializer для форматирования каждого наблюдения
    observations = SimpleObservationSerializer(source='filtered_observations', many=True, read_only=True)
    primary_diagnosis_code = serializers.CharField(source='primary_diagnosis_mkb.code', allow_null=True, read_only=True)

    class Meta:
        model = Patient
        # Включаем поля пациента и список его отфильтрованных наблюдений
        fields = [
            'id',
            'last_name',
            'first_name',
            'middle_name',
            'date_of_birth',
            'clinic_id',
            'primary_diagnosis_code',
            'observations',
        ]
        read_only_fields = fields # Весь сериализатор только для чтения
