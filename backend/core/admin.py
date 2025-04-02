# backend/core/admin.py
from django.contrib import admin
from .models import Patient, ParameterCode, Observation, MKBCode # Убедитесь, что импорты верны

@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = ('last_name', 'first_name', 'date_of_birth', 'id')
    search_fields = ('last_name', 'first_name')

@admin.register(ParameterCode)
class ParameterCodeAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'unit')
    search_fields = ('code', 'name')

@admin.register(MKBCode)
class MKBCodeAdmin(admin.ModelAdmin):
    list_display = ('code', 'name')
    search_fields = ('code', 'name') # Включаем поиск
    list_per_page = 30

@admin.register(Observation)
class ObservationAdmin(admin.ModelAdmin):
    # Используем поля, которые есть в модели Observation: patient, parameter, value, timestamp, value_numeric
    list_display = ('patient', 'parameter', 'value', 'timestamp', 'value_numeric') # Исправлено

    # Фильтруем по существующим полям: parameter (ForeignKey) и timestamp (DateTimeField)
    list_filter = ('parameter', 'timestamp') # Исправлено

    # Ищем по связанным полям пациента и параметра
    search_fields = ('patient__last_name', 'patient__first_name', 'parameter__code', 'parameter__name', 'value') # Исправлено

    # Поля для автодополнения (ForeignKey)
    autocomplete_fields = ['patient', 'parameter'] # Исправлено

    list_per_page = 25
