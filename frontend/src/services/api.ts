// frontend/src/services/api.ts
import axios, { InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import {
    PatientDetails,
    ParameterCode,
    HospitalizationEpisode,
    ObservationData,
    MedicalTestData,
    DiagnosisMKB,
    ResearchPatientData // Убедитесь, что этот тип импортирован из types/data.ts
} from '../types/data';

const API_BASE_URL = 'http://localhost:8000/api/';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// --- Интерцептор запросов ---
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers = config.headers || {};
      config.headers.set('Authorization', `Bearer ${token}`);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// --- Логика для обновления токена ---
let isRefreshing = false;
let failedQueue: Array<{ resolve: (value: unknown) => void; reject: (reason?: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => { error ? prom.reject(error) : prom.resolve(token); });
  failedQueue = [];
};

// --- Интерцептор ответов ---
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError<{ detail?: string }>) => {
    interface RetryAxiosRequestConfig extends InternalAxiosRequestConfig { _retry?: boolean; }
    const originalRequest = error.config as RetryAxiosRequestConfig | undefined;

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
        if (originalRequest.url === 'token/refresh/') {
            console.error('Refresh token failed (endpoint). Logging out.');
            localStorage.removeItem('accessToken'); localStorage.removeItem('refreshToken'); window.location.href = '/login';
            return Promise.reject(error);
        }
        if (isRefreshing) {
            return new Promise((resolve, reject) => { failedQueue.push({ resolve, reject }); })
                .then(token => { originalRequest.headers = originalRequest.headers || {}; originalRequest.headers.set('Authorization', `Bearer ${token}`); return apiClient(originalRequest); })
                .catch(err => Promise.reject(err));
        }
        originalRequest._retry = true; isRefreshing = true;
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) { console.error('No refresh token. Logging out.'); isRefreshing = false; localStorage.removeItem('accessToken'); window.location.href = '/login'; return Promise.reject(error); }

        try {
            console.log('Refreshing token...');
            const response = await axios.post<{ access: string }>(`${API_BASE_URL}token/refresh/`, { refresh: refreshToken });
            const newAccessToken = response.data.access; localStorage.setItem('accessToken', newAccessToken);
            apiClient.defaults.headers.common['Authorization'] = 'Bearer ' + newAccessToken;
            originalRequest.headers = originalRequest.headers || {}; originalRequest.headers.set('Authorization', `Bearer ${newAccessToken}`);
            processQueue(null, newAccessToken);
            return apiClient(originalRequest);
        } catch (refreshError: any) {
            console.error('Failed to refresh token:', refreshError.response?.data || refreshError.message);
            processQueue(refreshError, null);
            localStorage.removeItem('accessToken'); localStorage.removeItem('refreshToken'); window.location.href = '/login';
            return Promise.reject(refreshError);
        } finally { isRefreshing = false; }
    }
    return Promise.reject(error);
  }
);

// ========================================================
// --- ФУНКЦИИ API С ИНДИВИДУАЛЬНЫМИ ЭКСПОРТАМИ ---
// ========================================================

// --- Пациенты (Patient) ---
export const getPatients = async (searchTerm: string = ''): Promise<PatientDetails[]> => {
  const params = searchTerm ? { search: searchTerm } : {};
  const response = await apiClient.get<PatientDetails[]>('/patients/', { params });
  return response.data;
};
export const getPatientById = async (patientId: number | string): Promise<PatientDetails> => {
  const response = await apiClient.get<PatientDetails>(`/patients/${patientId}/`);
  return response.data;
};
export const addPatient = async (patientData: Partial<Omit<PatientDetails, 'id'>>): Promise<PatientDetails> => {
   const response = await apiClient.post<PatientDetails>('/patients/', patientData);
   return response.data;
};
export const updatePatient = async (patientId: number | string, patientData: Partial<Omit<PatientDetails, 'id'>>): Promise<PatientDetails> => {
   const response = await apiClient.patch<PatientDetails>(`/patients/${patientId}/`, patientData);
   return response.data;
 };
 export const deletePatient = async (patientId: number | string): Promise<void> => {
   await apiClient.delete(`/patients/${patientId}/`);
 };
 export const getPatientDynamics = async (patientId: number | string, parameterCodes: string[]): Promise<ObservationData[]> => {
     const params = new URLSearchParams();
     parameterCodes.forEach(code => params.append('param', code));
     const response = await apiClient.get<ObservationData[]>(`/patients/${patientId}/dynamics/`, { params });
     return response.data;
 };

// --- Эпизоды Госпитализации (HospitalizationEpisode) ---
type AddEpisodePayload = Omit<HospitalizationEpisode, 'id' | 'patient_display' | 'created_at' | 'updated_at'>; // Убрали еще updated_at
export const getPatientEpisodes = async (patientId: number | string): Promise<HospitalizationEpisode[]> => {
  const response = await apiClient.get<HospitalizationEpisode[]>('/episodes/', { params: { patient_id: patientId } });
  return response.data;
};
export const addPatientEpisode = async (episodeData: AddEpisodePayload): Promise<HospitalizationEpisode> => {
  const response = await apiClient.post<HospitalizationEpisode>('/episodes/', episodeData);
  return response.data;
};

// --- Наблюдения (Observation) ---
type AddObservationPayload = Omit<ObservationData, 'id' | 'patient_display' | 'parameter_display' | 'episode_display' | 'recorded_by' | 'recorded_by_display' | 'value_numeric'>;
export const getPatientObservations = async (patientId: number | string, parameterCode?: string, episodeId?: number): Promise<ObservationData[]> => {
  const params: Record<string, any> = { patient_id: patientId };
  if (parameterCode) params.parameter_code = parameterCode;
  if (episodeId) params.episode_id = episodeId;
  const response = await apiClient.get<ObservationData[]>('/observations/', { params });
  return response.data;
};
export const addPatientObservation = async (observationData: AddObservationPayload): Promise<ObservationData> => {
  const response = await apiClient.post<ObservationData>('/observations/', observationData);
  return response.data;
};

// --- Медицинские Тесты (MedicalTest) ---
export const getPatientTests = async (patientId: number | string): Promise<MedicalTestData[]> => {
    const response = await apiClient.get<MedicalTestData[]>(`/patients/${patientId}/tests/`);
    return response.data;
};
export const addMedicalTest = async (formData: FormData): Promise<MedicalTestData> => {
    const response = await apiClient.post<MedicalTestData>('/medical-tests/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
};

// --- Справочники ---
export const getParameterCodes = async (): Promise<ParameterCode[]> => {
  const response = await apiClient.get<ParameterCode[]>('/parameters/');
  return response.data;
};
export const searchMkbCodes = async (searchTerm: string = ''): Promise<DiagnosisMKB[]> => {
    const params = searchTerm ? { search: searchTerm } : {};
    const response = await apiClient.get<DiagnosisMKB[]>('/mkb-codes/', { params });
    return response.data;
};

// --- Исследовательский Запрос ---
// Определяем тип для параметров запроса
export interface ResearchParams { // Добавляем export, чтобы можно было использовать в компоненте
    diagnosis_mkb?: string;
    age_min?: number | string;
    age_max?: number | string;
    param_codes: string[];
    start_date?: string;
    end_date?: string;
    format?: 'json' | 'csv';
}
/**
 * Выполняет исследовательский запрос
 * @param params Параметры запроса
 * @returns Promise с массивом ResearchPatientData (для JSON) или Blob (для CSV)
 */
export const runResearchQuery = async (params: ResearchParams): Promise<ResearchPatientData[] | Blob> => {
  const queryParams = new URLSearchParams();
  // Добавляем параметры в query string, если они есть
  if (params.diagnosis_mkb) queryParams.append('diagnosis_mkb', params.diagnosis_mkb);
  if (params.age_min !== undefined && params.age_min !== '') queryParams.append('age_min', String(params.age_min));
  if (params.age_max !== undefined && params.age_max !== '') queryParams.append('age_max', String(params.age_max));
  if (params.start_date) queryParams.append('start_date', params.start_date);
  if (params.end_date) queryParams.append('end_date', params.end_date);
  if (params.format) queryParams.append('format', params.format);
  // Добавляем коды параметров
  params.param_codes.forEach(code => queryParams.append('param_codes', code));

  // Настраиваем axios config
  const config: { params: URLSearchParams; responseType?: 'blob' | 'json' } = { params: queryParams };
  if (params.format === 'csv') {
      config.responseType = 'blob'; // Ожидаем Blob для CSV
  } else {
      config.responseType = 'json'; // Ожидаем JSON по умолчанию
  }

  // В зависимости от ожидаемого типа ответа, используем соответствующий generic
  if (config.responseType === 'blob') {
      const response = await apiClient.get<Blob>('/research/query/', config);
      return response.data;
  } else {
      const response = await apiClient.get<ResearchPatientData[]>('/research/query/', config);
      return response.data;
  }
};

// ========================================================

// Экспорт по умолчанию можно оставить или убрать, если он не используется
export default apiClient;
