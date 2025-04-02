from django.db import models
from django.conf import settings

# Create your models here.

from django.db import models
from django.contrib.auth.models import User # Используем встроенную модель пользователя
from django.utils import timezone

class MKBCode(models.Model):
    code = models.CharField(max_length=20, unique=True, primary_key=True, verbose_name="Код МКБ")
    name = models.TextField(verbose_name="Название диагноза")
    # Можно добавить поля для иерархии, если нужно (parent_code и т.д.)
    # parent_code = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='children')

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
    # Можно добавить поле для уникального ID пациента в системе клиники, если есть
    clinic_id = models.CharField("ID в клинике", max_length=50, unique=True, blank=True, null=True)
    primary_diagnosis_mkb = models.ForeignKey(
        MKBCode,
        on_delete=models.SET_NULL, # Или models.PROTECT, если нельзя удалять код при наличии пациентов
        null=True, # Разрешаем NULL, если диагноз может быть не указан
        blank=True, # Разрешаем пустое значение в формах
        verbose_name="Первичный диагноз (МКБ)",
        related_name="patients_with_primary_diagnosis" # Добавляем related_name
    )
    # Добавить другие важные поля: пол, контакты и т.д.
    created_at = models.DateTimeField("Дата создания записи", auto_now_add=True)
    updated_at = models.DateTimeField("Дата обновления записи", auto_now=True)

    def __str__(self):
        return f"{self.last_name} {self.first_name} ({self.date_of_birth.strftime('%d.%m.%Y')})"

    class Meta:
        verbose_name = "Пациент"
        verbose_name_plural = "Пациенты"
        ordering = ['last_name', 'first_name']

class HospitalizationEpisode(models.Model):
    """Эпизод госпитализации/наблюдения"""
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="episodes", verbose_name="Пациент")
    start_date = models.DateField("Дата начала")
    end_date = models.DateField("Дата окончания", blank=True, null=True)
    # Можно добавить тип эпизода (плановая госпитализация, амбулаторное обследование и т.д.)
    # episode_type = models.CharField("Тип эпизода", max_length=100, blank=True)
    created_at = models.DateTimeField("Дата создания записи", auto_now_add=True)

    def __str__(self):
        end_str = self.end_date.strftime('%d.%m.%Y') if self.end_date else "..."
        return f"Эпизод для {self.patient.last_name} ({self.start_date.strftime('%d.%m.%Y')} - {end_str})"

    class Meta:
        verbose_name = "Эпизод госпитализации"
        verbose_name_plural = "Эпизоды госпитализации"
        ordering = ['-start_date']

class ObservationType(models.Model):
    """Справочник типов наблюдаемых показателей"""
    code = models.CharField("Код показателя", max_length=50, unique=True)
    name = models.CharField("Наименование показателя", max_length=255)
    unit = models.CharField("Единица измерения", max_length=50, blank=True, null=True)
    # Можно добавить описание, нормальные значения и т.д.

    def __str__(self):
        return f"{self.name} ({self.code})"

    class Meta:
        verbose_name = "Тип показателя"
        verbose_name_plural = "Типы показателей"


# Определяем модель для хранения кодов и названий параметров/показателей
class ParameterCode(models.Model):
    code = models.CharField(max_length=50, unique=True, primary_key=True, verbose_name="Код показателя")
    name = models.CharField(max_length=255, verbose_name="Название показателя")
    unit = models.CharField(max_length=50, blank=True, null=True, verbose_name="Единица измерения")
    description = models.TextField(blank=True, null=True, verbose_name="Описание")

    class Meta:
        verbose_name = "Код показателя"
        verbose_name_plural = "Коды показателей"

    def __str__(self):
        return f"{self.name} ({self.code})"

# Определяем модель для хранения самих наблюдений/значений показателей
class Observation(models.Model):
    # Связь с пациентом (многие наблюдения к одному пациенту)
    patient = models.ForeignKey(
        'Patient', # Используйте строку, если Patient определен ниже или в этом же файле
                   # или Patient без кавычек, если импортирован
        on_delete=models.CASCADE, # При удалении пациента удалить все его наблюдения
        related_name='observations', # Имя для обратной связи от Patient к Observation
        verbose_name="Пациент"
    )
    # Связь с кодом показателя (многие наблюдения одного типа)
    parameter = models.ForeignKey(
        ParameterCode,
        on_delete=models.PROTECT, # Защищаем от удаления кода, если есть связанные наблюдения
        related_name='observations',
        verbose_name="Показатель",
        null=True,  # <--- РАЗРЕШИТЬ NULL В БАЗЕ ДАННЫХ
        blank=True  # <--- РАЗРЕШИТЬ ПУСТОЕ ЗНАЧЕНИЕ В ФОРМАХ/АДМИНКЕ
    )
    # Дата и время наблюдения
    timestamp = models.DateTimeField(verbose_name="Дата и время")
    # Значение показателя. Используем CharField, чтобы хранить разные типы (числа, текст)
    # Либо можно сделать несколько полей: value_numeric, value_text и т.д.
    # Или использовать JSONField, если СУБД поддерживает (PostgreSQL - да)
    value = models.CharField(max_length=255, verbose_name="Значение")
    # Можно добавить поле для значения в числовом формате для удобства сортировки/фильтрации
    value_numeric = models.FloatField(blank=True, null=True, verbose_name="Числовое значение (если применимо)")

    # Кто внес наблюдение (опционально)
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True, null=True,
        verbose_name="Кто записал"
    )
    # Ссылка на эпизод госпитализации (опционально)
    episode = models.ForeignKey(
        'HospitalizationEpisode',
        on_delete=models.SET_NULL,
        blank=True, null=True,
        verbose_name="Эпизод госпитализации"
    )

    class Meta:
        verbose_name = "Наблюдение (показатель)"
        verbose_name_plural = "Наблюдения (показатели)"
        ordering = ['patient', 'parameter', '-timestamp'] # Сортировка по умолчанию

    def __str__(self):
        return f"{self.patient} - {self.parameter.code} = {self.value} ({self.timestamp.strftime('%Y-%m-%d %H:%M')})"

    # Опционально: Метод для автоматического заполнения value_numeric
    def save(self, *args, **kwargs):
        try:
            self.value_numeric = float(self.value)
        except (ValueError, TypeError):
            self.value_numeric = None
        super().save(*args, **kwargs)
