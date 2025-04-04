# backend/core/models.py
from django.db import models
from django.conf import settings # Используем для связи с User и настроек MEDIA
# Лучше всегда использовать get_user_model для получения модели пользователя
from django.contrib.auth import get_user_model
from django.utils import timezone
import os # Для работы с путями файлов

# Получаем активную модель пользователя
User = get_user_model()

class MKBCode(models.Model):
    code = models.CharField(max_length=20, unique=True, primary_key=True, verbose_name="Код МКБ")
    name = models.TextField(verbose_name="Название диагноза")

    class Meta:
        verbose_name = "Код МКБ"
        verbose_name_plural = "Коды МКБ"
        ordering = ['code']

    def __str__(self):
        return f"{self.code} - {self.name}"

class Patient(models.Model):
    """Модель пациента"""
    last_name = models.CharField("Фамилия", max_length=100)
    first_name = models.CharField("Имя", max_length=100)
    middle_name = models.CharField("Отчество", max_length=100, blank=True, null=True)
    date_of_birth = models.DateField("Дата рождения")
    clinic_id = models.CharField("ID в клинике", max_length=50, unique=True, blank=True, null=True)
    primary_diagnosis_mkb = models.ForeignKey(
        MKBCode,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name="Первичный диагноз (МКБ)",
        related_name="patients_with_primary_diagnosis"
    )
    created_at = models.DateTimeField("Дата создания записи", auto_now_add=True)
    updated_at = models.DateTimeField("Дата обновления записи", auto_now=True)

    def __str__(self):
        # Улучшаем форматирование даты и обрабатываем случай отсутствия отчества
        dob_str = self.date_of_birth.strftime('%d.%m.%Y') if self.date_of_birth else '??.??.????'
        middle_name_str = f" {self.middle_name}" if self.middle_name else ""
        return f"{self.last_name} {self.first_name}{middle_name_str} ({dob_str})"

    class Meta:
        verbose_name = "Пациент"
        verbose_name_plural = "Пациенты"
        ordering = ['last_name', 'first_name']

class HospitalizationEpisode(models.Model):
    """Эпизод госпитализации/наблюдения"""
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="episodes", verbose_name="Пациент")
    start_date = models.DateField("Дата начала")
    end_date = models.DateField("Дата окончания", blank=True, null=True)
    created_at = models.DateTimeField("Дата создания записи", auto_now_add=True)
    # Добавим поле для обновления, чтобы отслеживать изменения в эпизоде
    updated_at = models.DateTimeField("Дата обновления записи", auto_now=True)

    def __str__(self):
        start_str = self.start_date.strftime('%d.%m.%Y') if self.start_date else '??.??.????'
        end_str = self.end_date.strftime('%d.%m.%Y') if self.end_date else "..."
        # Используем __str__ пациента для краткости
        return f"Эпизод для {self.patient} ({start_str} - {end_str})"

    class Meta:
        verbose_name = "Эпизод госпитализации"
        verbose_name_plural = "Эпизоды госпитализации"
        # Сортировка по пациенту, затем по дате начала
        ordering = ['patient', '-start_date']

class ParameterCode(models.Model):
    """Справочник кодов и названий параметров/показателей"""
    code = models.CharField(max_length=50, unique=True, primary_key=True, verbose_name="Код показателя")
    name = models.CharField(max_length=255, verbose_name="Название показателя")
    unit = models.CharField(max_length=50, blank=True, null=True, verbose_name="Единица измерения")
    description = models.TextField(blank=True, null=True, verbose_name="Описание")
    # Добавим флаг, указывающий, является ли параметр числовым (для графиков)
    is_numeric = models.BooleanField(default=True, verbose_name="Числовой?")

    class Meta:
        verbose_name = "Код показателя"
        verbose_name_plural = "Коды показателей"
        ordering = ['name']

    def __str__(self):
        unit_str = f" ({self.unit})" if self.unit else ""
        return f"{self.name} ({self.code}){unit_str}"

class Observation(models.Model):
    """Модель для хранения наблюдений/значений показателей"""
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='observations', verbose_name="Пациент")
    parameter = models.ForeignKey(ParameterCode, on_delete=models.PROTECT, related_name='observations', verbose_name="Показатель") # Убрали null=True, blank=True - параметр должен быть всегда
    timestamp = models.DateTimeField(verbose_name="Дата и время", default=timezone.now, db_index=True) # Добавили db_index для ускорения фильтрации по времени
    value = models.CharField(max_length=255, verbose_name="Значение") # Убрали blank=True - значение должно быть
    value_numeric = models.FloatField(blank=True, null=True, verbose_name="Числовое значение (если применимо)")
    # Используем User модель, полученную через get_user_model
    recorded_by = models.ForeignKey(User, on_delete=models.SET_NULL, blank=True, null=True, verbose_name="Кто записал")
    episode = models.ForeignKey(HospitalizationEpisode, on_delete=models.SET_NULL, blank=True, null=True, related_name='observations', verbose_name="Эпизод госпитализации") # Добавлен related_name

    class Meta:
        verbose_name = "Наблюдение (показатель)"
        verbose_name_plural = "Наблюдения (показатели)"
        # Оптимальная сортировка для отображения последних данных
        ordering = ['patient', 'parameter', '-timestamp']
        # Уникальность наблюдения для пациента по параметру и времени? Возможно, но может быть нужно несколько замеров в одну секунду.
        # unique_together = [['patient', 'parameter', 'timestamp']] # Раскомментировать, если нужна уникальность

    def __str__(self):
        param_code = self.parameter.code if self.parameter else 'N/A'
        time_str = self.timestamp.strftime('%Y-%m-%d %H:%M') if self.timestamp else '??'
        return f"{self.patient} - {param_code} = {self.value} ({time_str})"

    # --- ИСПРАВЛЕННЫЙ МЕТОД SAVE ---
    def save(self, *args, **kwargs):
        # Заполняем value_numeric только если параметр помечен как числовой
        if self.parameter and self.parameter.is_numeric:
            if self.value: # Проверяем, что значение не пустое
                try:
                    # Заменяем запятую на точку и пытаемся преобразовать во float
                    numeric_val = float(str(self.value).replace(',', '.'))
                    self.value_numeric = numeric_val
                except (ValueError, TypeError):
                    # Если преобразование не удалось, ставим None
                    self.value_numeric = None
            else:
                 # Если значение пустое, ставим None
                self.value_numeric = None
        else:
            # Если параметр нечисловой, value_numeric всегда None
            self.value_numeric = None
        super().save(*args, **kwargs) # Вызываем оригинальный метод save
    # --- КОНЕЦ МЕТОДА SAVE ---


# --- МОДЕЛЬ ДЛЯ МЕДИЦИНСКИХ ТЕСТОВ/ОПРОСНИКОВ ---

# Функция для определения пути сохранения файла
def get_patient_test_upload_path(instance, filename):
    patient_id = instance.patient.id
    # Создаем путь вида: patient_files/patient_123/tests/original_filename.ext
    return os.path.join('patient_files', f'patient_{patient_id}', 'tests', filename)

class MedicalTest(models.Model):
    """Модель для хранения результатов тестов и опросников"""
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='medical_tests', verbose_name="Пациент")
    test_name = models.CharField(max_length=255, verbose_name="Название теста/опросника")
    test_date = models.DateField(verbose_name="Дата проведения теста", default=timezone.now, db_index=True) # Добавили db_index
    uploaded_file = models.FileField(
        upload_to=get_patient_test_upload_path,
        max_length=500,
        blank=True,
        null=True,
        verbose_name="Загруженный файл"
    )
    score = models.FloatField(blank=True, null=True, verbose_name="Итоговый балл (если применимо)")
    result_text = models.TextField(blank=True, null=True, verbose_name="Результат/Интерпретация (текст)")
    # Используем User модель
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, blank=True, null=True, related_name='uploaded_tests', verbose_name="Кем загружено")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True) # Добавлено поле обновления

    class Meta:
        verbose_name = "Медицинский тест/Опросник"
        verbose_name_plural = "Медицинские тесты/Опросники"
        ordering = ['patient', '-test_date']

    def __str__(self):
        date_str = self.test_date.strftime('%Y-%m-%d') if self.test_date else '??'
        return f"Тест '{self.test_name}' для {self.patient} от {date_str}"

    @property
    def filename(self):
        if self.uploaded_file and self.uploaded_file.name:
            return os.path.basename(self.uploaded_file.name)
        return None

    # Опционально: Метод для удаления файла при удалении записи
    # def delete(self, *args, **kwargs):
    #     if self.uploaded_file:
    #         # Получаем путь к хранилищу (важно для S3 и т.д.)
    #         storage, path = self.uploaded_file.storage, self.uploaded_file.name
    #         # Удаляем файл из хранилища
    #         if storage.exists(path):
    #             storage.delete(path)
    #     super().delete(*args, **kwargs)
