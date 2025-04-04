# backend/core/serializers.py
from rest_framework import serializers
from django.contrib.auth import get_user_model # Лучше использовать get_user_model

# --- Импорты моделей ---
from .models import Patient, ParameterCode, Observation, MKBCode, MedicalTest, HospitalizationEpisode # Добавим Episode

User = get_user_model() # Получаем активную модель пользователя

class PatientSerializer(serializers.ModelSerializer):
    """Сериализатор для модели Пациента"""
    primary_diagnosis_mkb = serializers.SlugRelatedField(
        queryset=MKBCode.objects.all(),
        slug_field='code',
        allow_null=True,
        required=False
    )
    # Опционально: Отображать имя вместо кода при чтении
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

class ParameterCodeSerializer(serializers.ModelSerializer):
    """Сериализатор для Кодов Показателей"""
    class Meta:
        model = ParameterCode
        fields = ['code', 'name', 'unit', 'description']

class MKBCodeSerializer(serializers.ModelSerializer):
    """Сериализатор для кодов МКБ"""
    class Meta:
        model = MKBCode
        fields = ('code', 'name')

# --- ДОБАВЛЕН СЕРИАЛИЗАТОР ДЛЯ ЭПИЗОДОВ ---
class HospitalizationEpisodeSerializer(serializers.ModelSerializer):
    """Сериализатор для Эпизодов госпитализации"""
    patient = serializers.PrimaryKeyRelatedField(queryset=Patient.objects.all())
    patient_display = serializers.CharField(source='patient.__str__', read_only=True)

    class Meta:
        model = HospitalizationEpisode
        fields = [
            'id',
            'patient',
            'patient_display',
            'start_date',
            'end_date',
            'created_at',
        ]
        read_only_fields = ['id', 'patient_display', 'created_at']
# --- /СЕРИАЛИЗАТОР ДЛЯ ЭПИЗОДОВ ---

class ObservationSerializer(serializers.ModelSerializer):
    """Сериализатор для Наблюдений (Observation)"""
    # Позволяет записывать параметр по его коду ('HB', 'TEMP', etc.)
    parameter = serializers.SlugRelatedField(
        queryset=ParameterCode.objects.all(),
        slug_field='code'
    )
    # Ожидаем ID пациента при создании/обновлении
    patient = serializers.PrimaryKeyRelatedField(queryset=Patient.objects.all())
    # Опционально: Эпизод (пока необязательно)
    episode = serializers.PrimaryKeyRelatedField(queryset=HospitalizationEpisode.objects.all(), required=False, allow_null=True)

    # Поля только для чтения для отображения связанной информации
    patient_display = serializers.CharField(source='patient.__str__', read_only=True)
    parameter_display = serializers.CharField(source='parameter.__str__', read_only=True)
    # Отображаем username пользователя, который записал
    recorded_by_display = serializers.CharField(source='recorded_by.username', read_only=True, allow_null=True)
    # Отображаем информацию об эпизоде, если он есть
    episode_display = serializers.CharField(source='episode.__str__', read_only=True, allow_null=True)


    class Meta:
        model = Observation
        fields = [
            'id',
            'patient',            # ID для записи
            'patient_display',    # Отображение для чтения
            'parameter',          # Код ('HB') для записи
            'parameter_display',  # Отображение для чтения
            'value',              # Строковое значение
            'value_numeric',      # Числовое значение (может быть null)
            'timestamp',          # Дата и время
            'episode',            # ID эпизода (опционально)
            'episode_display',    # Отображение эпизода для чтения
            'recorded_by',        # ID пользователя (только чтение)
            'recorded_by_display',# Имя пользователя (только чтение)
        ]
        read_only_fields = [
            'id', 'patient_display', 'parameter_display',
            'recorded_by', 'recorded_by_display', 'episode_display'
        ]

    # Можно добавить валидацию, если необходимо
    # def validate(self, data):
    #     # Пример: проверить, что timestamp не в будущем
    #     if 'timestamp' in data and data['timestamp'] > timezone.now():
    #         raise serializers.ValidationError("Timestamp cannot be in the future.")
    #     return data

class MedicalTestSerializer(serializers.ModelSerializer):
    """Сериализатор для Медицинских тестов/Опросников"""
    patient = serializers.PrimaryKeyRelatedField(queryset=Patient.objects.all())
    # Отображаем пользователя по ID (только для чтения, будет устанавливаться во View)
    uploaded_by = serializers.PrimaryKeyRelatedField(read_only=True, source='uploaded_by.username', allow_null=True) # Можно сразу username
    patient_display = serializers.CharField(source='patient.__str__', read_only=True)
    # URL для скачивания файла
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
            'uploaded_file', # Используется для ЗАПИСИ файла
            'file_url',      # Генерируется для ЧТЕНИЯ
            'file_name',     # Генерируется для ЧТЕНИЯ
            'score',
            'result_text',
            'uploaded_by',   # Имя пользователя (только чтение)
            'created_at',
        ]
        read_only_fields = [
            'id', 'patient_display', 'uploaded_by',
            'file_url', 'file_name', 'created_at'
        ]
        # Делаем поле файла необязательным при обновлении (чтобы не требовать его повторную загрузку)
        # и не обязательным в принципе (может быть тест без файла)
        extra_kwargs = {
            'uploaded_file': {'required': False, 'allow_null': True, 'write_only': True} # write_only чтобы не показывать в ответе сырое поле
        }

    def get_file_url(self, obj):
        request = self.context.get('request')
        if obj.uploaded_file and request:
            try:
                # Генерируем абсолютный URL
                url = request.build_absolute_uri(obj.uploaded_file.url)
                return url
            except ValueError:
                # Может случиться, если файл был удален или недоступен
                return None
        return None
