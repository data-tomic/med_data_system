// frontend/src/services/api.ts
import axios, { InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios'; // Импортируем типы axios
// Импортируем типы данных
import {
    PatientDetails,
    ParameterCode,
    HospitalizationEpisode,
    ObservationData,
    MedicalTestData,
    DiagnosisMKB
} from '../types/data';

const API_BASE_URL = 'http://localhost:8000/api/';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// --- Интерцептор запросов ---
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => { // Добавляем тип
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers = config.headers || {};
      // Используем set для современных версий axios
      config.headers.set('Authorization', `Bearer ${token}`);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);


// --- Логика для обновления токена ---

let isRefreshing = false;
// Типизируем очередь ожидания
let failedQueue: Array<{ resolve: (value: unknown) => void; reject: (reason?: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};


// --- Интерцептор ответов ---
apiClient.interceptors.response.use(
  (response: AxiosResponse) => { // Типизируем response
    return response;
  },
  async (error: AxiosError<{ detail?: string }>) => { // Типизируем error и данные в ответе ошибки
    // Добавляем '_retry' в тип InternalAxiosRequestConfig для TypeScript
    interface RetryAxiosRequestConfig extends InternalAxiosRequestConfig {
        _retry?: boolean;
    }
    const originalRequest = error.config as RetryAxiosRequestConfig | undefined; // Утверждаем тип

    // Проверяем статус 401 и отсутствие метки _retry
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {

        // Ошибка 401 при обновлении токена - разлогиниваем
        // Сравниваем с относительным путем
        if (originalRequest.url === 'token/refresh/') {
            console.error('Refresh token failed or expired during refresh attempt. Logging out.');
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            window.location.href = '/login'; // Редирект на логин
            return Promise.reject(error);
        }

        if (isRefreshing) {
            return new Promise((resolve, reject) => {
                failedQueue.push({ resolve, reject });
            }).then(token => {
                // Убедимся, что headers существуют
                originalRequest.headers = originalRequest.headers || {};
                originalRequest.headers.set('Authorization', `Bearer ${token}`);
                return apiClient(originalRequest); // Повторяем запрос с новым токеном
            }).catch(err => {
                return Promise.reject(err);
            });
        }

        originalRequest._retry = true; // Помечаем как повторный
        isRefreshing = true;

        const refreshToken = localStorage.getItem('refreshToken');

        if (!refreshToken) {
            console.error('No refresh token found. Logging out.');
            isRefreshing = false;
            localStorage.removeItem('accessToken');
            window.location.href = '/login';
            return Promise.reject(error);
        }

        try {
            console.log('Access token expired. Refreshing...');
            // Используем axios.post напрямую
            const response = await axios.post<{ access: string }>(`${API_BASE_URL}token/refresh/`, { // Указываем тип ответа
                refresh: refreshToken,
            });

            const newAccessToken = response.data.access;
            localStorage.setItem('accessToken', newAccessToken);

            // Обновляем заголовок по умолчанию для apiClient
            apiClient.defaults.headers.common['Authorization'] = 'Bearer ' + newAccessToken;
            // Обновляем заголовок оригинального запроса
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers.set('Authorization', `Bearer ${newAccessToken}`);

            processQueue(null, newAccessToken); // Обрабатываем очередь ожидания

            return apiClient(originalRequest); // Повторяем оригинальный запрос

        } catch (refreshError: any) { // Можно использовать unknown и проверять тип
            console.error('Failed to refresh token:', refreshError.response?.data || refreshError.message);
            processQueue(refreshError, null); // Обрабатываем очередь с ошибкой
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            window.location.href = '/login'; // Редирект на логин
            return Promise.reject(refreshError);
        } finally {
            isRefreshing = false;
        }
    }

    // Для всех других ошибок возвращаем их дальше
    return Promise.reject(error);
  }
);


// ========================================================
// --- ФУНКЦИИ API С ТИПИЗАЦИЕЙ ---
// ========================================================

// --- Пациенты (Patient) ---

/**
 * Получить список пациентов (с возможностью поиска)
 * @param searchTerm Опциональный поисковый запрос
 * @returns Массив объектов пациентов
 */
export const getPatients = async (searchTerm: string = ''): Promise<PatientDetails[]> => {
  const params = searchTerm ? { search: searchTerm } : {};
  const response = await apiClient.get<PatientDetails[]>('/patients/', { params });
  return response.data;
};

/**
 * Получить данные одного пациента по ID
 * @param patientId ID пациента
 * @returns Объект пациента
 */
export const getPatientById = async (patientId: number | string): Promise<PatientDetails> => {
  const response = await apiClient.get<PatientDetails>(`/patients/${patientId}/`);
  return response.data;
};

/**
 * Добавить нового пациента
 * @param patientData Данные пациента (могут быть не все поля)
 * @returns Объект созданного пациента
 */
export const addPatient = async (patientData: Partial<Omit<PatientDetails, 'id'>>): Promise<PatientDetails> => {
   // Omit убирает id, Partial делает остальные необязательными
   const response = await apiClient.post<PatientDetails>('/patients/', patientData);
   return response.data;
};

/**
 * Обновить данные пациента (частично)
 * @param patientId ID пациента
 * @param patientData Обновляемые данные
 * @returns Объект обновленного пациента
 */
export const updatePatient = async (patientId: number | string, patientData: Partial<Omit<PatientDetails, 'id'>>): Promise<PatientDetails> => {
   const response = await apiClient.patch<PatientDetails>(`/patients/${patientId}/`, patientData);
   return response.data;
 };

/**
 * Удалить пациента
 * @param patientId ID пациента
 */
 export const deletePatient = async (patientId: number | string): Promise<void> => {
   await apiClient.delete(`/patients/${patientId}/`);
 };

/**
 * Получить динамику показателей для пациента
 * @param patientId ID пациента
 * @param parameterCodes Массив кодов параметров (['HB', 'WEIGHT'])
 * @returns Массив объектов наблюдений
 */
 export const getPatientDynamics = async (patientId: number | string, parameterCodes: string[]): Promise<ObservationData[]> => {
     const params = new URLSearchParams();
     parameterCodes.forEach(code => params.append('param', code));
     const response = await apiClient.get<ObservationData[]>(`/patients/${patientId}/dynamics/`, { params });
     return response.data;
 };


// --- Эпизоды Госпитализации (HospitalizationEpisode) ---

/**
 * Получить список эпизодов для пациента
 * @param patientId ID пациента
 * @returns Массив объектов эпизодов
 */
export const getPatientEpisodes = async (patientId: number | string): Promise<HospitalizationEpisode[]> => {
  const response = await apiClient.get<HospitalizationEpisode[]>('/episodes/', { params: { patient_id: patientId } });
  return response.data;
};

/**
 * Добавить новый эпизод для пациента
 * @param episodeData Данные эпизода (без id и display полей)
 * @returns Объект созданного эпизода
 */
// Используем Omit для удаления полей, которые не отправляются при создании
type AddEpisodePayload = Omit<HospitalizationEpisode, 'id' | 'patient_display' | 'created_at'>;
export const addPatientEpisode = async (episodeData: AddEpisodePayload): Promise<HospitalizationEpisode> => {
  const response = await apiClient.post<HospitalizationEpisode>('/episodes/', episodeData);
  return response.data;
};

// --- Наблюдения (Observation) ---

/**
 * Получить список наблюдений для пациента
 * @param patientId ID пациента
 * @param parameterCode Опциональный код параметра для фильтрации
 * @param episodeId Опциональный ID эпизода для фильтрации
 * @returns Массив объектов наблюдений
 */
export const getPatientObservations = async (patientId: number | string, parameterCode?: string, episodeId?: number): Promise<ObservationData[]> => {
  // Явно типизируем params
  const params: { patient_id: number | string; parameter_code?: string; episode_id?: number } =
    { patient_id: patientId };
  if (parameterCode) {
    params.parameter_code = parameterCode;
  }
  if (episodeId) {
    params.episode_id = episodeId;
  }
  const response = await apiClient.get<ObservationData[]>('/observations/', { params });
  return response.data;
};

/**
 * Добавить новое наблюдение
 * @param observationData Данные наблюдения (без id и display/read-only полей)
 * @returns Объект созданного наблюдения
 */
// Используем Omit для удаления полей, которые не отправляются при создании
type AddObservationPayload = Omit<ObservationData, 'id' | 'patient_display' | 'parameter_display' | 'episode_display' | 'recorded_by' | 'recorded_by_display' | 'value_numeric'>; // value_numeric тоже не отправляем
export const addPatientObservation = async (observationData: AddObservationPayload): Promise<ObservationData> => {
  const response = await apiClient.post<ObservationData>('/observations/', observationData);
  return response.data;
};


// --- Медицинские Тесты (MedicalTest) ---

/**
 * Получить список тестов для пациента
 * @param patientId ID пациента
 * @returns Массив объектов тестов
 */
export const getPatientTests = async (patientId: number | string): Promise<MedicalTestData[]> => {
    const response = await apiClient.get<MedicalTestData[]>(`/patients/${patientId}/tests/`);
    return response.data;
};

/**
 * Загрузить новый медицинский тест (с файлом или без)
 * @param formData FormData с данными теста и файлом (ключ 'uploaded_file')
 * @returns Объект созданного теста
 */
export const addMedicalTest = async (formData: FormData): Promise<MedicalTestData> => {
    // Тип ответа MedicalTestData
    const response = await apiClient.post<MedicalTestData>('/medical-tests/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
};


// --- Справочники ---

/**
 * Получить список кодов параметров
 * @returns Массив кодов параметров
 */
export const getParameterCodes = async (): Promise<ParameterCode[]> => {
  const response = await apiClient.get<ParameterCode[]>('/parameters/');
  return response.data;
};

/**
 * Получить/найти коды МКБ
 * @param searchTerm Опциональный поисковый запрос
 * @returns Массив кодов МКБ
 */
export const searchMkbCodes = async (searchTerm: string = ''): Promise<DiagnosisMKB[]> => {
    const params = searchTerm ? { search: searchTerm } : {};
    const response = await apiClient.get<DiagnosisMKB[]>('/mkb-codes/', { params });
    return response.data;
};

// ========================================================

export default apiClient; // Экспортируем инстанс axios, если он где-то нужен напрямую

// Экспортируем функции для использования в компонентах
// (Вы можете убрать экспорт по умолчанию apiClient, если он не используется)
// export { getPatients, getPatientById, ... }; // Альтернативный способ экспорта
