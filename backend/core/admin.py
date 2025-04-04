# backend/core/admin.py
from django.contrib import admin
# --- Добавляем импорт MedicalTest ---
from .models import Patient, ParameterCode, Observation, MKBCode, MedicalTest

@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = ('id', 'last_name', 'first_name', 'date_of_birth', 'primary_diagnosis_mkb') # Добавили ID и диагноз для наглядности
    search_fields = ('last_name', 'first_name', 'clinic_id') # Добавили поиск по ID клиники
    list_filter = ('primary_diagnosis_mkb',) # Фильтр по диагнозу
    autocomplete_fields = ['primary_diagnosis_mkb'] # Используем автодополнение для ForeignKey МКБ

@admin.register(ParameterCode)
class ParameterCodeAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'unit')
    search_fields = ('code', 'name')

@admin.register(MKBCode)
class MKBCodeAdmin(admin.ModelAdmin):
    list_display = ('code', 'name')
    search_fields = ('code', 'name')
    list_per_page = 50 # Увеличим немного

@admin.register(Observation)
class ObservationAdmin(admin.ModelAdmin):
    list_display = ('id', 'patient', 'parameter', 'value', 'value_numeric', 'timestamp') # Добавили ID
    list_filter = ('parameter', 'timestamp', 'patient') # Добавили фильтр по пациенту
    search_fields = ('patient__last_name', 'patient__first_name', 'parameter__code', 'parameter__name', 'value')
    autocomplete_fields = ['patient', 'parameter']
    list_per_page = 25
    # Делаем дату и время более читаемыми
    # readonly_fields = ('created_at',) # Если у Observation есть created_at
    # date_hierarchy = 'timestamp' # Можно добавить навигацию по дате

# --- РЕГИСТРАЦИЯ НОВОЙ МОДЕЛИ MedicalTest ---
@admin.register(MedicalTest)
class MedicalTestAdmin(admin.ModelAdmin):
    list_display = ('id', 'patient', 'test_name', 'test_date', 'filename', 'score', 'uploaded_by') # Отображаемые поля
    list_filter = ('test_name', 'test_date', 'patient') # Фильтры
    search_fields = ('patient__last_name', 'patient__first_name', 'test_name', 'result_text') # Поля для поиска
    autocomplete_fields = ['patient', 'uploaded_by'] # Автодополнение для ForeignKey
    readonly_fields = ('created_at', 'filename') # Поля только для чтения
    list_per_page = 25
    # date_hierarchy = 'test_date' # Навигация по дате теста

    # Небольшое улучшение для отображения имени файла
    # def get_filename(self, obj):
    #     return obj.filename
    # get_filename.short_description = 'Имя файла' # Название колонки
# --- /РЕГИСТРАЦИЯ НОВОЙ МОДЕЛИ MedicalTest ---
