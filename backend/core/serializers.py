# backend/core/serializers.py
from rest_framework import serializers
# --- Обновляем импорты моделей: Убираем ненужные, добавляем ParameterCode ---
from .models import Patient, ParameterCode, Observation, MKBCode
# Если модель HospitalizationEpisode используется, оставьте ее импорт
# from .models import HospitalizationEpisode
# Если модель ObservationType БОЛЬШЕ НЕ ИСПОЛЬЗУЕТСЯ (заменена на ParameterCode), удалите ее импорт

class PatientSerializer(serializers.ModelSerializer):
    """Сериализатор для модели Пациента"""
    class Meta:
        model = Patient
        # Убедитесь, что все эти поля есть в вашей модели Patient
        fields = [
            'id',
            'last_name',
            'first_name',
            'middle_name', # Если есть в модели
            'date_of_birth',
            'primary_diagnosis_mkb', # Если есть в модели
            'created_at', # Если есть в модели
            'updated_at', # Если есть в модели
        ]
        # Поля только для чтения (если они управляются Django)
        read_only_fields = ['id', 'created_at', 'updated_at']

# --- НОВЫЙ СЕРИАЛИЗАТОР для ParameterCode ---
class ParameterCodeSerializer(serializers.ModelSerializer):
    """Сериализатор для Кодов Показателей (замена ObservationType)"""
    class Meta:
        model = ParameterCode
        fields = ['code', 'name', 'unit', 'description'] # Используем 'code' как идентификатор
# --- /НОВЫЙ СЕРИАЛИЗАТОР ---

class MKBCodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = MKBCode
        fields = ('code', 'name') # Поля для отображения в автодополнении


# --- ОБНОВЛЕННЫЙ ObservationSerializer ---
class ObservationSerializer(serializers.ModelSerializer):
    """Сериализатор для Наблюдений (использует ParameterCode)"""
    # Отображаем связанный параметр по его коду (уникальному строковому полю)
    parameter = serializers.SlugRelatedField(
        queryset=ParameterCode.objects.all(), # Нужно для записи через API (если разрешена)
        slug_field='code' # Поле из ParameterCode для идентификации
    )
    # Отображаем пациента по его ID (стандартное поведение PrimaryKeyRelatedField)
    # patient = serializers.PrimaryKeyRelatedField(queryset=Patient.objects.all()) # Можно указать явно

    # Для удобства отображения в API можно добавить строковые представления
    patient_display = serializers.CharField(source='patient.__str__', read_only=True)
    parameter_display = serializers.CharField(source='parameter.__str__', read_only=True) # Используем parameter

    class Meta:
        model = Observation
        # Указываем поля из ОБНОВЛЕННОЙ модели Observation
        fields = [
            'id',
            'patient',          # ID пациента
            'parameter',        # Код показателя (из ParameterCode)
            'patient_display',  # Имя пациента (только чтение)
            'parameter_display',# Имя и код показателя (только чтение)
            'value',            # Строковое значение
            'value_numeric',    # Числовое значение (если есть)
            'timestamp',        # Дата и время наблюдения
            # 'episode', # Раскомментируйте, если у Observation есть связь с Episode
        ]
        # Поля только для чтения
        read_only_fields = ['id', 'patient_display', 'parameter_display']
# --- /ОБНОВЛЕННЫЙ ObservationSerializer ---


# --- Старые сериализаторы (ЗАКОММЕНТИРОВАНЫ/УДАЛЕНЫ) ---
# Если модель HospitalizationEpisode используется, оставьте/адаптируйте ее сериализатор
# class HospitalizationEpisodeSerializer(serializers.ModelSerializer):
#     patient_id = serializers.IntegerField(source='patient.id')
#     patient_display = serializers.CharField(source='patient.__str__', read_only=True)
#     class Meta:
#         model = HospitalizationEpisode
#         fields = [
#             'id', 'patient_id', 'patient_display', 'start_date',
#             'end_date', 'created_at',
#         ]
#         read_only_fields = ['id', 'created_at', 'patient_display']

# ObservationTypeSerializer больше не нужен, так как мы используем ParameterCodeSerializer
# class ObservationTypeSerializer(serializers.ModelSerializer):
#     class Meta:
#         model = ObservationType
#         fields = ['id', 'code', 'name', 'unit']
#         read_only_fields = ['id']
# --- /Старые сериализаторы ---
