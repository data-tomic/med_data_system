// frontend/src/components/AddMedicalTestForm.tsx
import React, { useState, useRef } from 'react';
import { Box, TextField, Button, Alert, CircularProgress, Typography, Input } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { addMedicalTest } from '../services/api';

interface AddMedicalTestFormProps {
    patientId: number | string;
    onTestAdded: () => void; // Колбэк после успешного добавления
}

const AddMedicalTestForm: React.FC<AddMedicalTestFormProps> = ({ patientId, onTestAdded }) => {
    // Состояния для полей формы
    const [testName, setTestName] = useState<string>('');
    const [testDate, setTestDate] = useState<string>(() => new Date().toISOString().split('T')[0]); // Сегодня по умолчанию
    const [score, setScore] = useState<string>('');
    const [resultText, setResultText] = useState<string>('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    // Состояния для UI
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Ref для input type="file" для сброса
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            setSelectedFile(event.target.files[0]);
            setSuccessMessage(null); // Сбрасываем сообщение об успехе при выборе нового файла
        } else {
            setSelectedFile(null);
        }
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!testName || !testDate) {
            setError("Название теста и дата обязательны.");
            return;
        }

        setIsSubmitting(true);
        setError(null);
        setSuccessMessage(null);

        // Создаем FormData
        const formData = new FormData();
        formData.append('patient', String(patientId)); // ID пациента всегда строка для FormData
        formData.append('test_name', testName);
        formData.append('test_date', testDate);
        if (score) formData.append('score', score);
        if (resultText) formData.append('result_text', resultText);
        if (selectedFile) {
            formData.append('uploaded_file', selectedFile, selectedFile.name); // Добавляем файл
        }

        try {
            await addMedicalTest(formData);
            setSuccessMessage(`Тест "${testName}" успешно добавлен!`);
            // Сбрасываем поля (кроме даты, возможно)
            setTestName('');
            setScore('');
            setResultText('');
            setSelectedFile(null);
            if (fileInputRef.current) { // Сбрасываем input файла
                fileInputRef.current.value = '';
            }
            onTestAdded(); // Вызываем колбэк для обновления списка
        } catch (err: any) {
            setError(`Ошибка добавления теста: ${err.response?.data?.detail || err.message}`);
            console.error("Error adding medical test:", err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
             <Typography variant="subtitle1" gutterBottom>Добавить Медицинский Тест/Файл</Typography>
             {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
             {successMessage && <Alert severity="success" sx={{ mb: 2 }}>{successMessage}</Alert>}

             <TextField
                label="Название теста/опросника"
                value={testName}
                onChange={(e) => setTestName(e.target.value)}
                required fullWidth margin="dense" size="small" disabled={isSubmitting}
             />
             <TextField
                label="Дата проведения"
                type="date"
                value={testDate}
                onChange={(e) => setTestDate(e.target.value)}
                required fullWidth margin="dense" size="small" disabled={isSubmitting}
                InputLabelProps={{ shrink: true }}
             />
             {/* Кнопка для выбора файла */}
             <Button
                variant="outlined"
                component="label" // Делаем кнопку оберткой для input type="file"
                startIcon={<UploadFileIcon />}
                sx={{ mt: 1, mb: 1, textTransform: 'none' }}
                size="small"
                disabled={isSubmitting}
                fullWidth
             >
                Выбрать файл (необязательно)
                <input
                    type="file"
                    hidden // Скрываем стандартный input
                    onChange={handleFileChange}
                    ref={fileInputRef} // Привязываем ref для сброса
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt" // Ограничиваем типы файлов (пример)
                />
             </Button>
             {/* Отображение имени выбранного файла */}
             {selectedFile && (
                <Typography variant="caption" display="block" sx={{mb: 1, color: 'text.secondary'}}>
                    Выбран файл: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                </Typography>
             )}

             <TextField
                label="Итоговый балл (необязательно)"
                type="number" // Можно использовать step="any" для десятичных
                inputProps={{ step: "any" }}
                value={score}
                onChange={(e) => setScore(e.target.value)}
                fullWidth margin="dense" size="small" disabled={isSubmitting}
             />
              <TextField
                label="Результат/Интерпретация (текст, необязательно)"
                value={resultText}
                onChange={(e) => setResultText(e.target.value)}
                multiline rows={3}
                fullWidth margin="dense" size="small" disabled={isSubmitting}
             />
             <Button type="submit" variant="contained" disabled={isSubmitting} sx={{ mt: 1 }}>
                {isSubmitting ? <CircularProgress size={24} color="inherit"/> : 'Добавить Тест/Файл'}
             </Button>
        </Box>
    );
};

export default AddMedicalTestForm;
