// frontend/src/pages/PatientDetailPage.tsx

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
    Container, Typography, CircularProgress, Alert, Grid, Box, Paper, Divider, Checkbox, FormControlLabel,
    List, ListItem, ListItemText, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Chip
} from '@mui/material';

// --- Импорт API функций ---
import {
    getPatientById,
    getParameterCodes,
    getPatientEpisodes,
    addPatientEpisode,
    addPatientObservation,
    getPatientObservations,
    getPatientDynamics
} from '../services/api';

// --- Импорт Компонентов ---
import AddEpisodeForm from '../components/AddEpisodeForm';
import AddObservationForm from '../components/AddObservationForm';
// import AddMedicalTestForm from '../components/AddMedicalTestForm';

// --- Импорт Типов ---
import {
    PatientDetails,
    ParameterCode,
    ObservationData as ObservationDataType,
    ChartDataPoint,
    DiagnosisMKB,
    HospitalizationEpisode
} from '../types/data';

// --- Вспомогательные функции ---

function isDiagnosisMKBObject(diagnosis: any): diagnosis is DiagnosisMKB {
  return (
    typeof diagnosis === 'object' &&
    diagnosis !== null &&
    typeof diagnosis.code === 'string' &&
    typeof diagnosis.name === 'string'
  );
}

const formatDate = (dateString?: string | null): string => {
    if (!dateString) return 'н/д';
    try {
        if (dateString.includes('T')) {
           return new Date(dateString).toLocaleDateString('ru-RU');
        }
        const parts = dateString.split('-');
        if (parts.length === 3) {
           const year = parseInt(parts[0], 10);
           const month = parseInt(parts[1], 10);
           const day = parseInt(parts[2], 10);
           if (!isNaN(year) && !isNaN(month) && !isNaN(day) && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
              return `${parts[2]}.${parts[1]}.${parts[0]}`;
           }
        }
        return dateString;
    } catch (e) {
        console.warn(`Error formatting date: ${dateString}`, e);
        return dateString;
    }
};
const formatDateTime = (dateString?: string | null): string => {
    if (!dateString) return 'н/д';
    try {
        return new Date(dateString).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short'});
    } catch (e) {
        console.warn(`Error formatting datetime: ${dateString}`, e);
        return dateString;
    }
}

// --- Основной Компонент Страницы ---

const PatientDetailPage: React.FC = () => {
  const { patientId } = useParams<{ patientId: string }>();

  const [patient, setPatient] = useState<PatientDetails | null>(null);
  const [loadingPatient, setLoadingPatient] = useState<boolean>(true);
  const [errorPatient, setErrorPatient] = useState<string | null>(null);

  const [parameterCodes, setParameterCodes] = useState<ParameterCode[]>([]);
  const [loadingParams, setLoadingParams] = useState<boolean>(true);
  const [errorParams, setErrorParams] = useState<string | null>(null);

  const [selectedParams, setSelectedParams] = useState<string[]>([]);
  const [dynamicsData, setDynamicsData] = useState<ObservationDataType[]>([]);
  const [loadingDynamics, setLoadingDynamics] = useState<boolean>(false);
  const [errorDynamics, setErrorDynamics] = useState<string | null>(null);

  const [episodes, setEpisodes] = useState<HospitalizationEpisode[]>([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState<boolean>(true);
  const [errorEpisodes, setErrorEpisodes] = useState<string | null>(null);

  const [observations, setObservations] = useState<ObservationDataType[]>([]);
  const [loadingObservations, setLoadingObservations] = useState<boolean>(true);
  const [errorObservations, setErrorObservations] = useState<string | null>(null);

  const [refreshCounter, setRefreshCounter] = useState<number>(0);
  const triggerRefresh = () => setRefreshCounter(prev => prev + 1);

  // --- Загрузка данных ---

  useEffect(() => {
    const fetchPatientDetails = async () => {
       if (!patientId) { setErrorPatient("ID пациента не указан."); setLoadingPatient(false); return; }
       setLoadingPatient(true); setErrorPatient(null);
       try {
         const data = await getPatientById(patientId);
         setPatient(data as PatientDetails);
       } catch (err: any) {
         console.error(`Error fetching patient ${patientId}:`, err);
         setErrorPatient(`Не удалось загрузить данные пациента: ${err.response?.statusText || err.message}`);
       } finally { setLoadingPatient(false); }
    };
    fetchPatientDetails();
  }, [patientId]);

  useEffect(() => {
    const fetchParameterCodes = async () => {
      setLoadingParams(true); setErrorParams(null);
      try {
        const data = await getParameterCodes();
        setParameterCodes(data);
      } catch (err: any) {
        console.error("Error fetching parameter codes:", err);
        setErrorParams(`Не удалось загрузить список показателей: ${err.response?.statusText || err.message}`);
      } finally { setLoadingParams(false); }
    };
    fetchParameterCodes();
  }, []);

  const fetchEpisodes = useCallback(async () => {
      if (!patientId) return;
      setLoadingEpisodes(true); setErrorEpisodes(null);
      try {
         const episodesData = await getPatientEpisodes(patientId);
         episodesData.sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());
         setEpisodes(episodesData);
      } catch(err: any) {
          console.error("Failed to load episodes:", err);
          setErrorEpisodes("Не удалось загрузить эпизоды госпитализации.");
      } finally { setLoadingEpisodes(false); }
 }, [patientId]);

  const fetchObservations = useCallback(async () => {
    if (!patientId) return;
    setLoadingObservations(true); setErrorObservations(null);
    try {
       const observationsData = await getPatientObservations(patientId);
       observationsData.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
       setObservations(observationsData);
    } catch (err: any) {
       console.error("Failed to load observations:", err);
       setErrorObservations("Не удалось загрузить наблюдения.");
    } finally { setLoadingObservations(false); }
}, [patientId]);

  useEffect(() => {
    fetchEpisodes();
    fetchObservations();
  }, [fetchEpisodes, fetchObservations, refreshCounter]);

  // --- /Загрузка данных ---

  // --- Обработчики и функции ---

  const handleParamSelectionChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = event.target;
    setSelectedParams(prevSelected => {
      const newSelection = checked ? [...prevSelected, value] : prevSelected.filter(code => code !== value);
      fetchDynamicsData(newSelection);
      return newSelection;
    });
  };

  const fetchDynamicsData = useCallback(async (paramsToFetch: string[]) => {
    if (!patientId || paramsToFetch.length === 0) {
        setDynamicsData([]); setErrorDynamics(null); return;
    }
    setLoadingDynamics(true); setErrorDynamics(null);
    try {
      const data = await getPatientDynamics(patientId, paramsToFetch);
      setDynamicsData(data);
    } catch (err: any) {
      console.error("Error fetching dynamics data:", err);
      setErrorDynamics(`Не удалось загрузить данные динамики: ${err.response?.statusText || err.message}`);
      setDynamicsData([]);
    } finally {
      setLoadingDynamics(false);
    }
  }, [patientId]);

  const transformDataForChart = (data: ObservationDataType[]): ChartDataPoint[] => {
    if (!data || data.length === 0) return [];
    const groupedByTime: { [key: number]: ChartDataPoint } = {};
    data.forEach(obs => {
      const timeKey = Date.UTC(
          new Date(obs.timestamp).getUTCFullYear(),
          new Date(obs.timestamp).getUTCMonth(),
          new Date(obs.timestamp).getUTCDate(),
          new Date(obs.timestamp).getUTCHours(),
          new Date(obs.timestamp).getUTCMinutes(),
          new Date(obs.timestamp).getUTCSeconds()
      );
      if (!groupedByTime[timeKey]) { groupedByTime[timeKey] = { timestamp: timeKey }; }
      if (obs.value_numeric !== null && obs.value_numeric !== undefined) {
          groupedByTime[timeKey][obs.parameter] = obs.value_numeric;
      }
    });
    return Object.values(groupedByTime).sort((a, b) => a.timestamp - b.timestamp);
  };

  const handleEpisodeAdded = () => {
    console.log('Episode added, triggering refresh...');
    triggerRefresh();
  };

  const handleObservationAdded = () => {
    console.log('Observation added, triggering refresh...');
    triggerRefresh();
  };
  // --- /Обработчики ---

  // --- Мемоизированные значения для графика ---
  const chartData = useMemo(() => transformDataForChart(dynamicsData), [dynamicsData]);
  const getRandomColor = (): string => `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`;
  const lineColors = useMemo(() => {
      const colors: { [key: string]: string } = {};
      selectedParams.forEach(param => { if (!colors[param]) { colors[param] = getRandomColor(); } });
      return colors;
  }, [selectedParams]);
  // --- /Мемоизированные значения ---

  // --- Отображение Компонента (JSX) ---

  if (!patientId) { return <Container><Alert severity="warning">ID пациента не указан в URL.</Alert></Container>; }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Карта пациента: {loadingPatient ? 'Загрузка...' : (patient ? `${patient.last_name} ${patient.first_name} ${patient.middle_name || ''}` : 'Пациент не найден')}
      </Typography>
      <RouterLink to="/patients" style={{ marginBottom: '20px', display: 'inline-block' }}>
        ← Назад к списку пациентов
      </RouterLink>

      {/* --- Информация о пациенте --- */}
      <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Основная информация</Typography>
        {loadingPatient && <CircularProgress size={24} />}
        {errorPatient && <Alert severity="error" sx={{ mt: 1 }}>{errorPatient}</Alert>}
        {patient && !loadingPatient && (
            <Box>
                <Typography variant="body2"><strong>Дата рождения:</strong> {formatDate(patient.date_of_birth)}</Typography>
                <Typography variant="body2">
                    <strong>Диагноз (МКБ):</strong>{" "}
                    {isDiagnosisMKBObject(patient.primary_diagnosis_mkb)
                        ? `${patient.primary_diagnosis_mkb.code} - ${patient.primary_diagnosis_mkb.name}`
                        : typeof patient.primary_diagnosis_mkb === 'string' && patient.primary_diagnosis_mkb
                        ? patient.primary_diagnosis_mkb
                        : 'Не указан'}
                </Typography>
                <Typography variant="body2"><strong>ID клиники:</strong> {patient.clinic_id || 'Не указан'}</Typography>
            </Box>
        )}
      </Paper>

      {/* --- Основной контент: Данные и Формы --- */}
      <Grid container spacing={3}> {/* Внешний контейнер */}

         {/* Левая колонка: Отображение списков */}
         {/* Явно указываем component="div" для item */}
         <Grid component="div" item xs={12} md={7}>
            <Paper elevation={1} sx={{ p: 2, height: '100%' }}>
                {/* Секция Эпизоды */}
                <Typography variant="h6" gutterBottom>Эпизоды госпитализации</Typography>
                {loadingEpisodes && <CircularProgress size={20} />}
                {errorEpisodes && <Alert severity="warning" sx={{ mb: 1 }}>{errorEpisodes}</Alert>}
                {!loadingEpisodes && !errorEpisodes && (
                    episodes.length === 0 ? <Typography variant="body2" sx={{color: 'text.secondary', mb: 2}}>Нет эпизодов.</Typography> : (
                        <List dense sx={{ maxHeight: 180, overflow: 'auto', mb: 2, border: '1px solid #eee', borderRadius: 1 }}>
                            {episodes.map((ep) => (
                                <ListItem key={ep.id} divider dense sx={{py: 0.5}}>
                                    <ListItemText
                                        primary={`ID: ${ep.id}`}
                                        secondary={`Даты: ${formatDate(ep.start_date)} - ${formatDate(ep.end_date) || '...'}`}
                                    />
                                </ListItem>
                            ))}
                        </List>
                    )
                )}

                <Divider sx={{ my: 2 }}/>

                 {/* Секция Все Наблюдения (таблица) */}
                 <Typography variant="h6" gutterBottom>Все наблюдения</Typography>
                 {loadingObservations && <CircularProgress size={20} />}
                 {errorObservations && <Alert severity="warning" sx={{ mb: 1 }}>{errorObservations}</Alert>}
                 {!loadingObservations && !errorObservations && (
                     observations.length === 0 ? <Typography variant="body2" sx={{color: 'text.secondary'}}>Нет наблюдений.</Typography> : (
                         <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 450 }}>
                             <Table size="small" stickyHeader aria-label="таблица всех наблюдений">
                                 <TableHead>
                                     <TableRow>
                                         <TableCell sx={{fontWeight: 'bold'}}>Время</TableCell>
                                         <TableCell sx={{fontWeight: 'bold'}}>Параметр</TableCell>
                                         <TableCell sx={{fontWeight: 'bold'}}>Значение</TableCell>
                                         <TableCell sx={{fontWeight: 'bold'}}>Эпизод</TableCell>
                                     </TableRow>
                                 </TableHead>
                                 <TableBody>
                                     {observations.map((obs) => (
                                         <TableRow key={obs.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                             <TableCell component="th" scope="row">{formatDateTime(obs.timestamp)}</TableCell>
                                             <TableCell><Chip label={obs.parameter_display || obs.parameter} size="small" /></TableCell>
                                             <TableCell>{obs.value}</TableCell>
                                             <TableCell>{obs.episode ?? '-'}</TableCell>
                                         </TableRow>
                                     ))}
                                 </TableBody>
                             </Table>
                         </TableContainer>
                     )
                 )}
             </Paper>
         </Grid>

         {/* Правая колонка: Формы добавления */}
          {/* Явно указываем component="div" для item */}
         <Grid component="div" item xs={12} md={5}>
             {/* Форма добавления Эпизода */}
            <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
                 <AddEpisodeForm
                     patientId={patientId}
                     onEpisodeAdded={handleEpisodeAdded}
                 />
             </Paper>
             {/* Форма добавления Наблюдения */}
             <Paper elevation={1} sx={{ p: 2 }}>
                <AddObservationForm
                    patientId={patientId}
                    parameterCodes={parameterCodes}
                    episodes={episodes}
                    onObservationAdded={handleObservationAdded}
                 />
                 {loadingParams && <Typography variant="caption">Загрузка списка показателей...</Typography>}
                 {errorParams && <Alert severity="warning" >{errorParams}</Alert>}
             </Paper>
         </Grid>

         {/* Секция Динамики (график) */}
          {/* Явно указываем component="div" для item */}
         <Grid component="div" item xs={12}>
             <Paper elevation={1} sx={{ p: 2, mt: 3 }}>
                 <Typography variant="h6" gutterBottom>Динамика Выбранных Показателей</Typography>
                 {loadingParams && <CircularProgress size={20} />}
                 {errorParams && <Alert severity="error">{errorParams}</Alert>}

                 {!loadingParams && !errorParams && parameterCodes.length > 0 && (
                     <Box sx={{ mb: 2 }}>
                         <Typography variant="subtitle1">Выберите показатели для графика:</Typography>
                         <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                            {parameterCodes.map(param => (
                                <FormControlLabel
                                    key={param.code}
                                    control={
                                        <Checkbox
                                            size="small"
                                            id={`param-dyn-${param.code}`}
                                            value={param.code}
                                            checked={selectedParams.includes(param.code)}
                                            onChange={handleParamSelectionChange}
                                            disabled={loadingDynamics}
                                        />
                                    }
                                    label={`${param.name} (${param.code})`}
                                    sx={{ mr: 1 }}
                                />
                             ))}
                         </Box>
                     </Box>
                 )}
                 {!loadingParams && !errorParams && parameterCodes.length === 0 && (
                     <Typography variant="body2" sx={{color: 'text.secondary'}}>Список показателей пуст.</Typography>
                 )}

                 {/* График */}
                 <Box sx={{ height: '350px', width: '100%', position: 'relative', mt: 2 }}>
                    {loadingDynamics && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', position: 'absolute', top: 0, left: 0, width: '100%', bgcolor: 'rgba(255,255,255,0.7)', zIndex: 1 }}>
                            <CircularProgress />
                        </Box>
                    )}
                    {errorDynamics && <Alert severity="error" sx={{mb: 2}}>{errorDynamics}</Alert>}
                    {!loadingDynamics && !errorDynamics && selectedParams.length > 0 && chartData.length > 0 && (
                        <ResponsiveContainer width="100%" height="100%">
                           <LineChart data={chartData} margin={{ top: 5, right: 30, left: 10, bottom: 25 }}>
                             <CartesianGrid strokeDasharray="3 3" />
                             <XAxis
                                dataKey="timestamp"
                                type="number"
                                scale="time"
                                // domain={['auto', 'auto']}
                                domain={['dataMin', 'dataMax']}
                                tickFormatter={(unixTime) => formatDate(new Date(unixTime).toISOString())}
                                name="Дата"
                                angle={-30}
                                textAnchor="end"
                                height={50}
                                interval="preserveStartEnd"
                               />
                             <YAxis domain={['auto', 'auto']} />
                             <Tooltip labelFormatter={(unixTime) => formatDateTime(new Date(unixTime).toISOString())} />
                             <Legend />
                             {selectedParams.map(paramCode => {
                                const paramDetails = parameterCodes.find(p => p.code === paramCode);
                                const paramName = paramDetails?.name || paramCode;
                                const paramUnit = paramDetails?.unit ? ` (${paramDetails.unit})` : '';
                                return (
                                    <Line
                                        key={paramCode}
                                        type="monotone"
                                        dataKey={paramCode}
                                        stroke={lineColors[paramCode] || '#8884d8'}
                                        strokeWidth={2}
                                        connectNulls
                                        name={`${paramName}${paramUnit}`}
                                        dot={{ r: 3 }}
                                        activeDot={{ r: 5 }}
                                    />
                                );
                             })}
                           </LineChart>
                         </ResponsiveContainer>
                     )}
                     {!loadingDynamics && !errorDynamics && selectedParams.length > 0 && chartData.length === 0 && (
                         <Typography variant="body2" align="center" sx={{ color: 'text.secondary', pt: 4 }}>Числовые данные для выбранных показателей не найдены.</Typography>
                     )}
                     {!loadingDynamics && !errorDynamics && selectedParams.length === 0 && (
                          <Typography variant="body2" align="center" sx={{ color: 'text.secondary', pt: 4 }}>Выберите показатели для построения графика.</Typography>
                     )}
                 </Box>

             </Paper>
         </Grid>

      </Grid>
    </Container>
  );
};

export default PatientDetailPage;
