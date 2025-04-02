// frontend/src/pages/PatientDetailPage.tsx
import React, { useEffect, useState, useMemo } from 'react'; // Добавили useMemo
import { useParams, Link } from 'react-router-dom';
import apiClient from '../services/api'; // Наш axios клиент
// --- ИМПОРТЫ RECHARTS ---
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
// ------------------------


// --- Интерфейсы ---
interface PatientDetails {
    id: number;
    first_name: string;
    last_name: string;
    date_of_birth: string;
    // Добавьте другие поля из вашей модели Patient
}

interface ParameterCode {
    code: string;
    name: string;
    unit: string | null;
    description: string | null;
}

interface ObservationData {
    id: number;
    parameter: string; // Код параметра (из SlugRelatedField)
    timestamp: string; // Дата и время в ISO формате
    value: string;
    value_numeric: number | null;
}

// Тип для данных, подготовленных для графика
interface ChartDataPoint {
  timestamp: number; // Используем Unix timestamp для оси X
  // Динамические ключи для значений параметров (HB, TEMP, и т.д.)
  // TypeScript ожидает явного указания возможных ключей или использования индексируемого типа
  [key: string]: number | null | string;
}
// --- /Интерфейсы ---


const PatientDetailPage: React.FC = () => {
  const { patientId } = useParams<{ patientId: string }>();

  // --- Состояния ---
  const [patient, setPatient] = useState<PatientDetails | null>(null);
  const [loadingPatient, setLoadingPatient] = useState<boolean>(true);
  const [errorPatient, setErrorPatient] = useState<string | null>(null);

  const [parameterCodes, setParameterCodes] = useState<ParameterCode[]>([]);
  const [loadingParams, setLoadingParams] = useState<boolean>(true);
  const [errorParams, setErrorParams] = useState<string | null>(null);

  const [selectedParams, setSelectedParams] = useState<string[]>([]);

  const [dynamicsData, setDynamicsData] = useState<ObservationData[]>([]);
  const [loadingDynamics, setLoadingDynamics] = useState<boolean>(false);
  const [errorDynamics, setErrorDynamics] = useState<string | null>(null);
  // --- /Состояния ---


  // --- Загрузка данных (useEffect'и без изменений) ---
  useEffect(() => {
    const fetchPatientDetails = async () => {
      if (!patientId) { setErrorPatient("ID пациента не указан."); setLoadingPatient(false); return; }
      setLoadingPatient(true); setErrorPatient(null);
      try { const response = await apiClient.get<PatientDetails>(`/patients/${patientId}/`); setPatient(response.data); }
      catch (err: any) { console.error(`Error fetching patient ${patientId}:`, err.response?.data || err.message); setErrorPatient("Не удалось загрузить данные пациента."); }
      finally { setLoadingPatient(false); }
    };
    fetchPatientDetails();
  }, [patientId]);

  useEffect(() => {
    const fetchParameterCodes = async () => {
      setLoadingParams(true); setErrorParams(null);
      try { const response = await apiClient.get<ParameterCode[]>('/parameters/'); setParameterCodes(response.data); }
      catch (err: any) { console.error("Error fetching parameter codes:", err.response?.data || err.message); setErrorParams("Не удалось загрузить список показателей."); }
      finally { setLoadingParams(false); }
    };
    fetchParameterCodes();
  }, []);
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

  const fetchDynamicsData = async (paramsToFetch: string[]) => {
    if (!patientId || paramsToFetch.length === 0) { setDynamicsData([]); setErrorDynamics(null); return; }
    setLoadingDynamics(true); setErrorDynamics(null);
    const queryString = paramsToFetch.map(code => `param=${encodeURIComponent(code)}`).join('&');
    try {
      const response = await apiClient.get<ObservationData[]>(`/patients/${patientId}/dynamics/?${queryString}`);
      setDynamicsData(response.data);
    } catch (err: any) {
      console.error("Error fetching dynamics data:", err.response?.data || err.message);
      setErrorDynamics("Не удалось загрузить данные динамики.");
      setDynamicsData([]);
    } finally {
      setLoadingDynamics(false);
    }
  };

  // Функция для подготовки данных для графика
  const transformDataForChart = (data: ObservationData[]): ChartDataPoint[] => {
    if (!data || data.length === 0) return [];
    const groupedByTime: { [key: number]: { [key: string]: number | null } } = {};
    data.forEach(obs => {
      const timeKey = new Date(obs.timestamp).getTime();
      if (!groupedByTime[timeKey]) groupedByTime[timeKey] = {};
      groupedByTime[timeKey][obs.parameter] = obs.value_numeric; // Используем только числовые значения
    });
    return Object.entries(groupedByTime)
      .map(([timeStr, values]) => ({ timestamp: parseInt(timeStr, 10), ...values }))
      .sort((a, b) => a.timestamp - b.timestamp);
  };

  // --- Мемоизированные значения для графика ---
  const chartData = useMemo(() => transformDataForChart(dynamicsData), [dynamicsData]);

  // Функция генерации случайного цвета
  const getRandomColor = (): string => `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`;

  // Мемоизация цветов линий, чтобы они не менялись при каждом рендере
  const lineColors = useMemo(() => {
      const colors: { [key: string]: string } = {};
      selectedParams.forEach(param => { colors[param] = getRandomColor(); });
      return colors;
  }, [selectedParams]); // Зависимость от selectedParams
  // --- /Мемоизированные значения ---
  // --- /Обработчики и функции ---


  // --- Отображение Компонента ---
  return (
    <div style={{ padding: '20px' }}>
      {/* Ссылка Назад */}
      <Link to="/patients" style={{ textDecoration: 'none', marginBottom: '15px', display: 'inline-block' }}>
        ← Назад к списку пациентов
      </Link>

      {/* Заголовок и данные пациента */}
      <h2>Детали Пациента {patientId ? `(ID: ${patientId})` : ''}</h2>
      <hr style={{ margin: '15px 0' }}/>
      {loadingPatient && <div>Загрузка данных пациента...</div>}
      {errorPatient && <div style={{ color: 'red' }}>{errorPatient}</div>}
      {patient && !loadingPatient && !errorPatient && ( <div style={{ marginBottom: '20px' }}> {/* ... Данные ... */} </div> )}

      <hr style={{ margin: '30px 0' }}/>

      {/* --- Блок Динамики Показателей --- */}
      <h2>Динамика Показателей</h2>
      {loadingParams && <div>Загрузка списка показателей...</div>}
      {errorParams && <div style={{ color: 'red' }}>{errorParams}</div>}

      {/* UI Выбора параметров */}
      {!loadingParams && !errorParams && parameterCodes.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <p>Выберите показатели:</p>
          <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #ccc', padding: '10px' }}>
            {parameterCodes.map(param => (
              <div key={param.code}> <input type="checkbox" id={`param-${param.code}`} value={param.code} checked={selectedParams.includes(param.code)} onChange={handleParamSelectionChange} disabled={loadingDynamics} /> <label htmlFor={`param-${param.code}`} style={{ marginLeft: '5px' }}> {param.name} ({param.code}) {param.unit ? `[${param.unit}]` : ''} </label> </div>
            ))}
          </div>
        </div>
      )}
      {!loadingParams && !errorParams && parameterCodes.length === 0 && ( <p>Список доступных показателей пуст.</p> )}

      {/* --- Область для Графика и Таблицы --- */}
      <div id="dynamics-results-area" style={{ marginTop: '20px' }}>
        {loadingDynamics && <div>Загрузка данных динамики...</div>}
        {errorDynamics && <div style={{ color: 'red' }}>{errorDynamics}</div>}

        {/* --- График Recharts --- */}
        {!loadingDynamics && !errorDynamics && dynamicsData.length > 0 && (
          <div style={{ marginBottom: '30px' }}>
            <h3>График</h3>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" type="number" domain={['dataMin', 'dataMax']} tickFormatter={(unixTime) => new Date(unixTime).toLocaleDateString()} name="Время"/>
                <YAxis />
                <Tooltip labelFormatter={(unixTime) => new Date(unixTime).toLocaleString()} />
                <Legend />
                {selectedParams.map(paramCode => (
                  <Line key={paramCode} type="monotone" dataKey={paramCode} stroke={lineColors[paramCode] || '#8884d8'} connectNulls name={parameterCodes.find(p => p.code === paramCode)?.name || paramCode} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        {/* --- /График Recharts --- */}

        {/* --- Таблица данных --- */}
        {!loadingDynamics && !errorDynamics && dynamicsData.length > 0 && (
          <div>
            <h3>Таблица данных</h3>
            <table border={1} style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead> <tr> <th>Дата и время</th> <th>Показатель (Код)</th> <th>Значение</th> <th>Числовое значение</th> </tr> </thead>
              <tbody>
                {dynamicsData.map(obs => (
                  <tr key={obs.id}> <td>{new Date(obs.timestamp).toLocaleString()}</td> <td>{obs.parameter}</td> <td>{obs.value}</td> <td>{obs.value_numeric !== null ? obs.value_numeric : '-'}</td> </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {/* --- /Таблица данных --- */}

        {/* Сообщение, если выбраны параметры, но данных нет */}
        {!loadingDynamics && !errorDynamics && dynamicsData.length === 0 && selectedParams.length > 0 && ( <p>Данные для выбранных показателей не найдены.</p> )}
      </div>
      {/* --- /Область для Графика и Таблицы --- */}

    </div> // Конец основного div
  );
};

export default PatientDetailPage;
