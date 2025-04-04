// frontend/src/pages/ResearchPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Link as RouterLink } from 'react-router-dom'; // Используем RouterLink
import {
    Container, Typography, Paper, Grid, TextField, Button, CircularProgress, Alert, Box,
    FormGroup, FormControlLabel, Checkbox, Collapse, Divider, IconButton, Link,
    TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Chip, List, ListItem, ListItemText // Добавляем компоненты для вложенного списка
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

// --- Импорт API функций и ТИПА для параметров запроса ---
import { getParameterCodes, runResearchQuery, ResearchParams } from '../services/api'; // Убрали searchMkbCodes, если он не используется здесь

// --- Импорт Типов ---
// Импортируем новые типы для ответа API и параметров
import { ParameterCode, DiagnosisMKB, ResearchPatientData, SimpleObservationData } from '../types/data'; // Убедитесь, что типы есть

// --- Вспомогательные функции форматирования (можно вынести) ---
const formatDate = (dateString?: string | null): string => {
    if (!dateString) return 'н/д'; try { if (dateString.includes('T')) { return new Date(dateString).toLocaleDateString('ru-RU'); } const parts = dateString.split('-'); if (parts.length === 3) { const year = parseInt(parts[0], 10); const month = parseInt(parts[1], 10); const day = parseInt(parts[2], 10); if (!isNaN(year) && !isNaN(month) && !isNaN(day) && month >= 1 && month <= 12 && day >= 1 && day <= 31) { return `${parts[2]}.${parts[1]}.${parts[0]}`; } } return dateString; } catch (e) { return dateString; }
};
const formatDateTime = (dateString?: string | null): string => {
    if (!dateString) return 'н/д'; try { return new Date(dateString).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short'}); } catch (e) { return dateString; }
};

// --- Основной Компонент ---
const ResearchPage: React.FC = () => {
    // --- Состояния для Фильтров ---
    const [diagnosisMkb, setDiagnosisMkb] = useState<string>('');
    const [ageMin, setAgeMin] = useState<string>('');
    const [ageMax, setAgeMax] = useState<string>('');
    const [selectedParamCodes, setSelectedParamCodes] = useState<string[]>([]);
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');

    // --- Состояния для Справочника Параметров ---
    const [allParameterCodes, setAllParameterCodes] = useState<ParameterCode[]>([]);
    const [loadingParams, setLoadingParams] = useState<boolean>(true);
    const [errorParams, setErrorParams] = useState<string | null>(null);
    const [showAllParams, setShowAllParams] = useState<boolean>(false); // По умолчанию список свернут

    // --- Состояния для Результатов ---
    const [results, setResults] = useState<ResearchPatientData[]>([]); // Для JSON ответа
    const [isLoading, setIsLoading] = useState<boolean>(false); // Для запроса JSON
    const [error, setError] = useState<string | null>(null);
    const [searchPerformed, setSearchPerformed] = useState<boolean>(false); // Был ли сделан хотя бы один запрос
    const [isDownloadingCsv, setIsDownloadingCsv] = useState<boolean>(false); // Для кнопки CSV

    // --- Загрузка Справочника Параметров ---
    useEffect(() => {
        const fetchParameters = async () => {
            setLoadingParams(true); setErrorParams(null);
            try {
                const data = await getParameterCodes();
                setAllParameterCodes(data);
            } catch (err: any) {
                setErrorParams("Не удалось загрузить список показателей.");
                console.error("Error fetching params:", err);
            } finally { setLoadingParams(false); }
        };
        fetchParameters();
    }, []); // Загружаем один раз при монтировании

    // --- Обработчики для выбора параметров ---
    const handleParamToggle = (code: string) => {
        setSelectedParamCodes(prev =>
            prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
        );
    };

    const handleSelectAllParams = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.checked) {
            setSelectedParamCodes(allParameterCodes.map(p => p.code));
        } else {
            setSelectedParamCodes([]);
        }
    };

    // Функция для сбора текущих параметров фильтрации
    const getCurrentQueryParams = (): ResearchParams => {
        const params: ResearchParams = { // Используем строгий тип
            param_codes: selectedParamCodes, // Всегда передаем выбранные коды
        };
        if (diagnosisMkb.trim()) params.diagnosis_mkb = diagnosisMkb.trim();
        const minAgeNum = parseInt(ageMin, 10);
        const maxAgeNum = parseInt(ageMax, 10);
        if (!isNaN(minAgeNum)) params.age_min = minAgeNum;
        if (!isNaN(maxAgeNum)) params.age_max = maxAgeNum;
        if (startDate) params.start_date = startDate;
        if (endDate) params.end_date = endDate;
        return params;
    };


    // Обработчик для кнопки "Сформировать выборку" (JSON)
    const handleRunQuery = async (event?: React.FormEvent<HTMLFormElement>) => {
        if (event) event.preventDefault(); // Предотвращаем стандартное поведение формы

        if (selectedParamCodes.length === 0) {
            setError("Выберите хотя бы один показатель для запроса.");
            setResults([]); setSearchPerformed(true); return;
        }

        setIsLoading(true); setError(null); setResults([]); setSearchPerformed(true);
        const params = getCurrentQueryParams();
        params.format = 'json'; // Указываем формат JSON

        try {
            console.log(`Performing research query (JSON) with params:`, params);
            const data = await runResearchQuery(params) as ResearchPatientData[]; // Утверждаем тип
            setResults(data);
            console.log("Query results received (JSON):", data);
        } catch (err: any) {
            console.error("Error performing research query:", err);
            setError(`Не удалось выполнить запрос. ${err.response?.data?.error || err.response?.data?.detail || err.message || ''}`);
        } finally {
            setIsLoading(false);
        }
    };

    // Обработчик для кнопки "Скачать CSV"
    const handleDownloadCsv = async () => {
         if (selectedParamCodes.length === 0) {
            setError("Выберите показатели для выгрузки в CSV."); return;
        }
        setIsDownloadingCsv(true); setError(null);
        const params = getCurrentQueryParams();
        params.format = 'csv'; // Запрашиваем CSV

        try {
            console.log(`Requesting CSV with params:`, params);
            const blob = await runResearchQuery(params) as Blob;

            if (!(blob instanceof Blob) || blob.type !== 'text/csv') { // Проверяем тип Blob
                 // Пытаемся прочитать как текст, если это не CSV
                 let errorText = 'Некорректный ответ от сервера при запросе CSV.';
                 try { errorText = await blob.text(); } catch {}
                 throw new Error(errorText);
            }

            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const timestamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
            link.setAttribute('download', `research_data_${timestamp}.csv`);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
            window.URL.revokeObjectURL(url);

        } catch (err: any) {
            console.error("Error downloading CSV:", err);
             let errorDetails = err.message || '';
             if (err.response?.data instanceof Blob) {
                 try {
                     const errorText = await err.response.data.text();
                     try { // Попытка парсить как JSON
                        const errorJson = JSON.parse(errorText);
                        errorDetails = errorJson.detail || errorJson.error || errorText;
                     } catch { errorDetails = errorText; } // Если не JSON, используем текст
                 } catch {}
             } else if (err.response?.data) {
                 errorDetails = err.response.data.detail || err.response.data.error || JSON.stringify(err.response.data);
             }
             setError(`Не удалось скачать CSV. ${errorDetails}`);
        } finally {
            setIsDownloadingCsv(false);
        }
    };

    // --- JSX Разметка ---
    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom>
                Исследовательский Запрос
            </Typography>
            <Typography paragraph sx={{ color: 'text.secondary' }}>
                Задайте критерии для формирования выборки пациентов и их наблюдений.
            </Typography>

            {/* --- Форма Фильтров --- */}
            <Paper component="form" onSubmit={handleRunQuery} elevation={1} sx={{ p: { xs: 1.5, sm: 2, md: 3 }, mb: 4 }}>
                <Grid container spacing={{ xs: 1, sm: 2 }}>
                    {/* Фильтры Пациента */}
                    <Grid item xs={12} sm={6} md={3}><TextField label="Диагноз (Код МКБ)" id="diagnosis" value={diagnosisMkb} onChange={(e) => setDiagnosisMkb(e.target.value)} placeholder="C71.0" fullWidth size="small" /></Grid>
                    <Grid item xs={6} sm={3} md={1.5}><TextField label="Возраст От" id="ageMin" type="number" value={ageMin} onChange={(e) => setAgeMin(e.target.value)} InputProps={{ inputProps: { min: 0 } }} fullWidth size="small"/></Grid>
                    <Grid item xs={6} sm={3} md={1.5}><TextField label="Возраст До" id="ageMax" type="number" value={ageMax} onChange={(e) => setAgeMax(e.target.value)} InputProps={{ inputProps: { min: 0 } }} fullWidth size="small"/></Grid>
                    {/* Фильтры Даты Наблюдений */}
                    <Grid item xs={6} sm={6} md={3}><TextField label="Начало периода" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} InputLabelProps={{ shrink: true }} fullWidth size="small"/></Grid>
                    <Grid item xs={6} sm={6} md={3}><TextField label="Конец периода" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} InputLabelProps={{ shrink: true }} fullWidth size="small"/></Grid>

                    {/* --- Выбор Параметров --- */}
                    <Grid item xs={12}>
                         <Divider sx={{ my: 2 }} />
                         <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
                            <Typography variant="subtitle1" sx={{ mb: { xs: 1, sm: 0 } }}>Выберите показатели:</Typography>
                            <IconButton size="small" onClick={() => setShowAllParams(!showAllParams)} title={showAllParams ? "Свернуть" : "Развернуть"}><ExpandLessIcon sx={{ display: showAllParams ? 'block': 'none' }} /><ExpandMoreIcon sx={{ display: showAllParams ? 'none': 'block' }} /></IconButton>
                         </Box>
                         {loadingParams && <CircularProgress size={20} sx={{mt: 1}}/>}
                         {errorParams && <Alert severity="error" sx={{mt: 1}}>{errorParams}</Alert>}
                         {!loadingParams && !errorParams && (
                             <>
                                <Collapse in={showAllParams} timeout="auto" unmountOnExit>
                                     <FormGroup sx={{ maxHeight: 200, overflow: 'auto', border: '1px solid #eee', p: 1, borderRadius: 1, mt: 1 }}>
                                         <FormControlLabel sx={{ pl: 1, borderBottom: '1px dashed #eee' }} control={<Checkbox size="small" checked={allParameterCodes.length > 0 && selectedParamCodes.length === allParameterCodes.length} indeterminate={selectedParamCodes.length > 0 && selectedParamCodes.length < allParameterCodes.length} onChange={handleSelectAllParams} />} label="Выбрать все / Снять все"/>
                                         {allParameterCodes.map(param => (<FormControlLabel key={param.code} sx={{ pl: 1 }} control={<Checkbox size="small" checked={selectedParamCodes.includes(param.code)} onChange={() => handleParamToggle(param.code)} value={param.code}/>} label={`${param.name} (${param.code})`}/>))}
                                     </FormGroup>
                                 </Collapse>
                                 <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center', minHeight: '24px' }}>
                                     <Typography variant="body2" sx={{mr: 0.5}}>Выбрано:</Typography>
                                     {selectedParamCodes.length > 0 ? selectedParamCodes.map(code => ( <Chip key={code} label={code} size="small" onDelete={() => handleParamToggle(code)} /> )) : <Typography variant="caption" sx={{color: 'text.secondary'}}>Ничего</Typography>}
                                 </Box>
                             </>
                         )}
                     </Grid>
                    {/* Кнопки действий */}
                    <Grid item xs={12} sx={{ textAlign: 'right', mt: 1 }}>
                        <Button type="submit" variant="contained" disabled={isLoading || isDownloadingCsv || selectedParamCodes.length === 0}> {isLoading ? <CircularProgress size={24} color="inherit"/> : 'Сформировать выборку'} </Button>
                        <Button variant="outlined" sx={{ ml: 1 }} onClick={handleDownloadCsv} disabled={isLoading || isDownloadingCsv || selectedParamCodes.length === 0}> {isDownloadingCsv ? <CircularProgress size={24} /> : 'Скачать CSV'} </Button>
                    </Grid>
                </Grid>
            </Paper>

            {/* --- Результаты Поиска --- */}
            {searchPerformed && (
                <Box sx={{ mt: 4 }}>
                    <Typography variant="h5" gutterBottom>Результаты Запроса</Typography>
                    {isLoading && <CircularProgress />}
                    {error && <Alert severity="error">{error}</Alert>}
                    {!isLoading && !error && (
                        <>
                            {results.length === 0 ? ( <Alert severity="info">Пациенты, соответствующие критериям, не найдены или у них нет выбранных наблюдений за указанный период.</Alert> )
                             : (
                                <TableContainer component={Paper} variant="outlined">
                                    <Table stickyHeader size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell sx={{ fontWeight: 'bold' }}>ID Пац.</TableCell>
                                                <TableCell sx={{ fontWeight: 'bold' }}>ФИО</TableCell>
                                                <TableCell sx={{ fontWeight: 'bold' }}>Дата рожд.</TableCell>
                                                <TableCell sx={{ fontWeight: 'bold' }}>Диагноз</TableCell>
                                                <TableCell sx={{ fontWeight: 'bold' }}>Наблюдения ({selectedParamCodes.join(', ')})</TableCell>
                                                <TableCell sx={{ fontWeight: 'bold' }}>Действия</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {results.map(patient => (
                                                <TableRow key={patient.id} hover>
                                                    <TableCell>{patient.id}</TableCell>
                                                    <TableCell><Link component={RouterLink} to={`/patients/${patient.id}`} underline="hover">{patient.last_name} {patient.first_name} {patient.middle_name || ''}</Link></TableCell>
                                                    <TableCell>{formatDate(patient.date_of_birth)}</TableCell>
                                                    <TableCell>{patient.primary_diagnosis_code || '-'}</TableCell>
                                                    <TableCell sx={{ verticalAlign: 'top' }}> {/* Выравнивание по верху для ячейки со списком */}
                                                        {patient.observations && patient.observations.length > 0 ? (
                                                            <List dense disablePadding sx={{fontSize: '0.8rem'}}>
                                                                {patient.observations.map((obs, index) => (
                                                                    <ListItem key={`${obs.parameter_code}-${obs.timestamp}-${index}`} dense disableGutters sx={{py: 0.2}}>
                                                                        <ListItemText primary={`${formatDateTime(obs.timestamp)} - ${obs.parameter_name || obs.parameter_code}: ${obs.value}`} secondary={obs.value_numeric !== null ? `(Num: ${obs.value_numeric})` : null} sx={{ my: 0 }}/>
                                                                    </ListItem>
                                                                ))}
                                                            </List>
                                                        ) : (<Typography variant="caption" sx={{color: 'text.secondary'}}>Нет данных</Typography>)}
                                                    </TableCell>
                                                     <TableCell sx={{ verticalAlign: 'top' }}> <Button component={RouterLink} to={`/patients/${patient.id}`} size="small" variant="outlined"> К Карте </Button> </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            )}
                        </>
                    )}
                </Box>
            )}
        </Container>
    );
};

export default ResearchPage;
