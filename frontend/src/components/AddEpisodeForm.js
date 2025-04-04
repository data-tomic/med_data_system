// frontend/src/components/AddEpisodeForm.js
import React, { useState } from 'react';
import { Box, TextField, Button, Alert, CircularProgress, Typography } from '@mui/material';
// Убедитесь, что путь к вашему API файлу верный
import { addPatientEpisode } from '../services/api';

/**
 * Компонент формы для добавления нового эпизода госпитализации.
 * @param {object} props - Пропсы компонента.
 * @param {number|string} props.patientId - ID пациента, для которого добавляется эпизод.
 * @param {function} props.onEpisodeAdded - Колбэк-функция, вызываемая после успешного добавления эпизода.
 */
const AddEpisodeForm = ({ patientId, onEpisodeAdded }) => {
    // Состояние для даты начала (обязательное поле)
    const [startDate, setStartDate] = useState('');
    // Состояние для даты окончания (необязательное поле)
    const [endDate, setEndDate] = useState('');
    // Состояние для отслеживания процесса отправки формы
    const [isSubmitting, setIsSubmitting] = useState(false);
    // Состояние для хранения и отображения ошибок
    const [error, setError] = useState(null);

    /**
     * Обработчик отправки формы.
     * Валидирует данные, отправляет запрос к API и обрабатывает результат.
     * @param {React.FormEvent<HTMLFormElement>} event - Событие отправки формы.
     */
    const handleSubmit = async (event) => {
        event.preventDefault(); // Предотвращаем стандартное поведение формы (перезагрузку страницы)

        // Простая валидация: дата начала должна быть указана
        if (!startDate) {
            setError('Дата начала обязательна.');
            return;
        }

        setIsSubmitting(true); // Устанавливаем флаг отправки
        setError(null); // Сбрасываем предыдущие ошибки

        // Формируем данные для отправки на бэкенд
        const episodeData = {
            patient: Number(patientId), // Убедимся, что ID пациента - число
            start_date: startDate,
        };
        // Добавляем дату окончания, только если она указана
        if (endDate) {
            episodeData.end_date = endDate;
        }

        try {
            // Вызываем функцию API для добавления эпизода
            await addPatientEpisode(episodeData);

            // Успех! Сбрасываем поля формы
            setStartDate('');
            setEndDate('');

            // Вызываем колбэк, чтобы родительский компонент мог обновить список эпизодов
            if (onEpisodeAdded) {
                onEpisodeAdded();
            }
        } catch (err) {
            // Обрабатываем ошибку
            console.error("Failed to add episode:", err);
            // Пытаемся извлечь сообщение об ошибке из ответа API или используем общее сообщение
            const errorMsg = err.response?.data?.detail || // Ошибка от DRF
                             (typeof err.response?.data === 'object' ? JSON.stringify(err.response.data) : null) || // Другие ошибки валидации DRF
                             err.message || // Общая ошибка axios/сети
                             "Не удалось добавить эпизод.";
            setError(errorMsg);
        } finally {
            // В любом случае убираем флаг отправки
            setIsSubmitting(false);
        }
    };

    return (
        // Используем Box как контейнер формы с тегом form
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2, p: 2, border: '1px dashed grey', borderRadius: 1 }}>
            <Typography variant="subtitle1" gutterBottom>Добавить эпизод госпитализации</Typography>

            {/* Отображение ошибки, если она есть */}
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {/* Поле для даты начала */}
            <TextField
                label="Дата начала"
                type="date" // Стандартный HTML5 date picker
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                // shrink: true гарантирует, что label не будет перекрывать введенную дату
                InputLabelProps={{ shrink: true }}
                required // Делаем поле обязательным на уровне HTML
                fullWidth
                margin="dense" // Уменьшенные отступы
                disabled={isSubmitting} // Блокируем поле во время отправки
            />

            {/* Поле для даты окончания */}
            <TextField
                label="Дата окончания (необязательно)"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
                margin="dense"
                disabled={isSubmitting}
                // Опционально: добавить валидацию, чтобы дата окончания была не раньше даты начала
                // inputProps={{ min: startDate }}
            />

            {/* Кнопка отправки */}
            <Button
                type="submit"
                variant="contained"
                color="primary" // Цвет кнопки
                disabled={isSubmitting} // Блокируем кнопку во время отправки
                sx={{ mt: 1 }} // Небольшой отступ сверху
            >
                {/* Показываем индикатор загрузки во время отправки */}
                {isSubmitting ? <CircularProgress size={24} color="inherit" /> : 'Добавить эпизод'}
            </Button>
        </Box>
    );
};

export default AddEpisodeForm;
