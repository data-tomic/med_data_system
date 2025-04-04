// frontend/src/components/AddObservationForm.js
import React, { useState } from 'react';
import {
    Box, TextField, Button, Alert, CircularProgress, FormControl,
    InputLabel, Select, MenuItem, Typography
} from '@mui/material';
// Убедитесь, что путь к вашему API файлу верный
import { addPatientObservation } from '../services/api';

// --- Вспомогательная функция для форматирования даты (если не вынесена в utils) ---
const formatDate = (dateString) => {
    if (!dateString) return 'н/д';
    try {
        return new Date(dateString).toLocaleDateString('ru-RU');
    } catch (e) { return dateString; }
};
// -----------------------------------------------------------------------------------

/**
 * Компонент формы для добавления нового наблюдения (показателя).
 * @param {object} props - Пропсы компонента.
 * @param {number|string} props.patientId - ID пациента.
 * @param {Array<object>} [props.parameterCodes=[]] - Массив доступных кодов параметров.
 * @param {Array<object>} [props.episodes=[]] - Массив доступных эпизодов для пациента.
 * @param {function} props.onObservationAdded - Колбэк-функция после успешного добавления.
 */
const AddObservationForm = ({ patientId, parameterCodes = [], episodes = [], onObservationAdded }) => {
    // Состояния для полей формы
    const [parameter, setParameter] = useState(''); // Храним КОД параметра ('HB', 'TEMP')
    const [value, setValue] = useState('');
    // Устанавливаем начальное значение для datetime-local в формате YYYY-MM-DDTHH:mm
    const [timestamp, setTimestamp] = useState(() => {
        const now = new Date();
        // Корректируем временную зону перед форматированием
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        return now.toISOString().slice(0, 16);
    });
    const [episodeId, setEpisodeId] = useState(''); // Храним ID эпизода или '', если не выбран

    // Состояние для отправки и ошибок
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    /**
     * Обработчик отправки формы.
     * Валидирует данные, отправляет запрос к API и обрабатывает результат.
     * @param {React.FormEvent<HTMLFormElement>} event - Событие отправки формы.
     */
    const handleSubmit = async (event) => {
        event.preventDefault(); // Предотвращаем перезагрузку

        // Валидация: параметр и значение обязательны
        if (!parameter || !value) {
            setError('Показатель и Значение обязательны.');
            return;
        }
        setIsSubmitting(true);
        setError(null);

        // Формируем данные для API
        const observationData = {
            patient: Number(patientId),
            parameter: parameter, // Отправляем код параметра
            value: value,
            // Преобразуем дату/время из локального формата в ISO строку (UTC)
            // Если timestamp не задан (хотя у нас есть default), бэкенд использует timezone.now()
            timestamp: timestamp ? new Date(timestamp).toISOString() : undefined,
            // Преобразуем ID эпизода в число или null
            episode: episodeId ? Number(episodeId) : null,
        };

        try {
            // Вызываем функцию API
            await addPatientObservation(observationData);

            // Успех! Сбрасываем только поле значения
            setValue('');
            // Можно сбросить и другие поля, если нужно
            // setParameter('');
            // setTimestamp(new Date().toISOString().slice(0, 16));
            // setEpisodeId('');

            // Вызываем колбэк для обновления данных в родительском компоненте
            if (onObservationAdded) {
                onObservationAdded();
            }
        } catch (err) {
            // Обработка ошибки
            console.error("Failed to add observation:", err);
            // Пытаемся получить осмысленное сообщение об ошибке
            const errorData = err.response?.data;
            let errorMsg = "Не удалось добавить наблюдение.";
            if (typeof errorData === 'object' && errorData !== null) {
                 // Ищем специфичные ошибки валидации DRF
                 if (errorData.parameter && Array.isArray(errorData.parameter)) {
                     errorMsg = `Параметр: ${errorData.parameter[0]}`;
                 } else if (errorData.value && Array.isArray(errorData.value)) {
                     errorMsg = `Значение: ${errorData.value[0]}`;
                 } else if (errorData.timestamp && Array.isArray(errorData.timestamp)) {
                     errorMsg = `Дата/Время: ${errorData.timestamp[0]}`;
                 } else if (errorData.detail) {
                     errorMsg = errorData.detail;
                 } else {
                     // Если нет конкретных, пытаемся показать весь ответ
                     errorMsg = JSON.stringify(errorData);
                 }
            } else if (err.message) {
                 errorMsg = err.message; // Общая ошибка сети/axios
            }
            setError(errorMsg);
        } finally {
            setIsSubmitting(false); // Убираем флаг отправки
        }
    };

    return (
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2, p: 2, border: '1px dashed grey', borderRadius: 1 }}>
            <Typography variant="subtitle1" gutterBottom>Добавить наблюдение (показатель)</Typography>

            {/* Отображение ошибки */}
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {/* Выбор параметра */}
            <FormControl fullWidth margin="dense" required disabled={isSubmitting || parameterCodes.length === 0}>
                <InputLabel id="parameter-select-label">Показатель</InputLabel>
                <Select
                    labelId="parameter-select-label"
                    value={parameter}
                    label="Показатель"
                    onChange={(e) => setParameter(e.target.value)}
                >
                    <MenuItem value="" disabled>
                        <em>{parameterCodes.length > 0 ? 'Выберите показатель' : 'Список пуст...'}</em>
                    </MenuItem>
                    {/* Генерируем опции из пропса parameterCodes */}
                    {parameterCodes.map(p => (
                        <MenuItem key={p.code} value={p.code}>
                            {p.name} ({p.code}) {p.unit ? `[${p.unit}]` : ''}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>

            {/* Ввод значения */}
            <TextField
                label="Значение"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                required
                fullWidth
                margin="dense"
                disabled={isSubmitting}
            />

            {/* Выбор даты и времени */}
            <TextField
                label="Дата и время"
                type="datetime-local" // Стандартный HTML5 datetime picker
                value={timestamp}
                onChange={(e) => setTimestamp(e.target.value)}
                InputLabelProps={{ shrink: true }}
                required
                fullWidth
                margin="dense"
                disabled={isSubmitting}
                // Ограничение максимальной даты/времени текущим моментом
                // inputProps={{ max: new Date().toISOString().slice(0, 16) }}
            />

            {/* Выбор эпизода (необязательно) */}
            <FormControl fullWidth margin="dense" disabled={isSubmitting}>
                <InputLabel id="episode-select-label">Эпизод (необязательно)</InputLabel>
                <Select
                    labelId="episode-select-label"
                    value={episodeId}
                    label="Эпизод (необязательно)"
                    onChange={(e) => setEpisodeId(e.target.value)}
                >
                    <MenuItem value=""><em>Нет эпизода</em></MenuItem>
                    {/* Генерируем опции из пропса episodes */}
                    {episodes.map(ep => (
                        <MenuItem key={ep.id} value={ep.id}>
                           ID: {ep.id} ({formatDate(ep.start_date)} - {formatDate(ep.end_date) || '...'})
                        </MenuItem>
                    ))}
                     {/* Сообщение, если эпизоды еще загружаются или их нет */}
                     {episodes.length === 0 && <MenuItem value="" disabled><em>Список эпизодов пуст</em></MenuItem>}
                </Select>
            </FormControl>

            {/* Кнопка отправки */}
            <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={isSubmitting}
                sx={{ mt: 1 }}
            >
                {isSubmitting ? <CircularProgress size={24} color="inherit" /> : 'Добавить наблюдение'}
            </Button>
        </Box>
    );
};

export default AddObservationForm;
