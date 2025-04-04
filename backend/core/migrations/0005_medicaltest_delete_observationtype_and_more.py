# Generated by Django 4.2.20 on 2025-04-02 14:39

import core.models
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('core', '0004_mkbcode_patient_clinic_id_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='MedicalTest',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('test_name', models.CharField(max_length=255, verbose_name='Название теста/опросника')),
                ('test_date', models.DateField(default=django.utils.timezone.now, verbose_name='Дата проведения теста')),
                ('uploaded_file', models.FileField(blank=True, max_length=500, null=True, upload_to=core.models.get_patient_test_upload_path, verbose_name='Загруженный файл')),
                ('score', models.FloatField(blank=True, null=True, verbose_name='Итоговый балл (если применимо)')),
                ('result_text', models.TextField(blank=True, null=True, verbose_name='Результат/Интерпретация (текст)')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('patient', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='medical_tests', to='core.patient', verbose_name='Пациент')),
                ('uploaded_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='uploaded_tests', to=settings.AUTH_USER_MODEL, verbose_name='Кем загружено')),
            ],
            options={
                'verbose_name': 'Медицинский тест/Опросник',
                'verbose_name_plural': 'Медицинские тесты/Опросники',
                'ordering': ['patient', '-test_date'],
            },
        ),
        migrations.DeleteModel(
            name='ObservationType',
        ),
        migrations.AlterModelOptions(
            name='parametercode',
            options={'ordering': ['name'], 'verbose_name': 'Код показателя', 'verbose_name_plural': 'Коды показателей'},
        ),
        migrations.AlterField(
            model_name='observation',
            name='timestamp',
            field=models.DateTimeField(default=django.utils.timezone.now, verbose_name='Дата и время'),
        ),
        migrations.AlterField(
            model_name='observation',
            name='value',
            field=models.CharField(blank=True, max_length=255, verbose_name='Значение'),
        ),
    ]
