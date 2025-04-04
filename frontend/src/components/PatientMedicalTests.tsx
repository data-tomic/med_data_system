// frontend/src/components/PatientMedicalTests.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, List, ListItem, ListItemText, CircularProgress, Alert, Link, IconButton,
    Tooltip, ListItemIcon // Добавляем Tooltip для подсказок
} from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description'; // Иконка файла
import DeleteIcon from '@mui/icons-material/Delete'; // Иконка удаления
import { getPatientTests, deleteMedicalTest } from '../services/api';
import { MedicalTestData } from '../types/data';

// Вспомогательные функции форматирования
const formatDate = (dateString?: string | null): string => { /* ... */
    if (!dateString) return 'н/д'; try { if (dateString.includes('T')) { return new Date(dateString).toLocaleDateString('ru-RU'); } const parts = dateString.split('-'); if (parts.length === 3) { const year = parseInt(parts[0], 10); const month = parseInt(parts[1], 10); const day = parseInt(parts[2], 10); if (!isNaN(year) && !isNaN(month) && !isNaN(day) && month >= 1 && month <= 12 && day >= 1 && day <= 31) { return `${parts[2]}.${parts[1]}.${parts[0]}`; } } return dateString; } catch (e) { return dateString; }
};

interface PatientMedicalTestsProps {
    patientId: number | string;
    refreshTrigger: number; // Для принудительного обновления из родителя
    onDelete?: () => void; // Колбэк после удаления
}

const PatientMedicalTests: React.FC<PatientMedicalTestsProps> = ({ patientId, refreshTrigger, onDelete }) => {
    const [tests, setTests] = useState<MedicalTestData[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null); // ID теста, который удаляется

    const fetchTests = useCallback(async () => {
        if (!patientId) return;
        setLoading(true); setError(null);
        try {
            const data = await getPatientTests(patientId);
            // Сортируем по дате теста (сначала новые)
            data.sort((a, b) => new Date(b.test_date).getTime() - new Date(a.test_date).getTime());
            setTests(data);
        } catch (err: any) {
            setError("Не удалось загрузить список тестов.");
            console.error("Error fetching tests:", err);
        } finally {
            setLoading(false);
        }
    }, [patientId]);

    useEffect(() => {
        fetchTests();
    }, [fetchTests, refreshTrigger]); // Перезагружаем при изменении ID или триггера

    const handleDelete = async (testId: number) => {
        if (!window.confirm(`Вы уверены, что хотите удалить тест ID ${testId}?`)) {
            return;
        }
        setDeletingId(testId); // Показываем индикатор удаления для этой строки
        setError(null);
        try {
            await deleteMedicalTest(testId);
            // Вызываем колбэк родителя для общего обновления (или обновляем локально)
            if (onDelete) {
                onDelete(); // Родитель вызовет triggerRefresh
            } else {
                 // Или обновляем список локально
                 setTests(prev => prev.filter(t => t.id !== testId));
            }
        } catch (err: any) {
             setError(`Ошибка удаления теста ID ${testId}: ${err.response?.data?.detail || err.message}`);
             console.error(`Error deleting test ${testId}:`, err);
        } finally {
             setDeletingId(null);
        }
    };


    return (
        <Box>
            <Typography variant="h6" gutterBottom>Медицинские Тесты / Опросники</Typography>
            {loading && <CircularProgress size={20} />}
            {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
            {!loading && !error && (
                tests.length === 0 ? (
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>Тесты не найдены.</Typography>
                ) : (
                    <List dense sx={{ maxHeight: 300, overflow: 'auto', border: '1px solid #eee', borderRadius: 1 }}>
                        {tests.map((test) => (
                            <ListItem
                                key={test.id}
                                divider
                                secondaryAction={
                                    <Tooltip title="Удалить тест">
                                        <IconButton
                                            edge="end"
                                            aria-label="delete"
                                            size="small"
                                            onClick={() => handleDelete(test.id)}
                                            disabled={deletingId === test.id} // Блокируем во время удаления
                                        >
                                            {deletingId === test.id ? <CircularProgress size={18}/> : <DeleteIcon fontSize="small" />}
                                        </IconButton>
                                    </Tooltip>
                                }
                            >
                                <ListItemIcon sx={{minWidth: 32}}>
                                    {test.file_url ? (
                                        <Tooltip title={`Скачать файл: ${test.file_name || 'файл'}`}>
                                            <IconButton href={test.file_url} target="_blank" rel="noopener noreferrer" size="small" color="primary">
                                                <DescriptionIcon fontSize="small" />
                                            </IconButton>
                                         </Tooltip>
                                    ) : (
                                        <DescriptionIcon fontSize="small" color="disabled" /> // Иконка для теста без файла
                                    )}
                                </ListItemIcon>
                                <ListItemText
                                    primary={`${test.test_name} (${formatDate(test.test_date)})`}
                                    secondary={
                                        <>
                                            {test.score !== null && `Балл: ${test.score}; `}
                                            {test.result_text && `Результат: ${test.result_text.substring(0, 100)}${test.result_text.length > 100 ? '...' : ''}; `}
                                            {`Добавил: ${test.uploaded_by_display || 'неизвестно'}`}
                                        </>
                                    }
                                    sx={{mr: 4}} // Отступ справа от текста до кнопки удаления
                                />
                            </ListItem>
                        ))}
                    </List>
                )
            )}
        </Box>
    );
};

export default PatientMedicalTests;
