// frontend/src/services/api.js
import axios from 'axios';
// Импорт logout из AuthContext может быть сложен здесь.
// Используем перезагрузку страницы для редиректа через PrivateRoute/AuthProvider.

const API_BASE_URL = 'http://localhost:8000/api/';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // Таймаут запроса 10 секунд
  headers: {
    'Content-Type': 'application/json',
  },
});

// --- Интерцептор запросов ---
// Добавляет токен авторизации к каждому запросу, если он есть
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config; // Возвращаем измененную конфигурацию
  },
  (error) => {
    // Обработка ошибки при конфигурации запроса
    return Promise.reject(error);
  }
);


// --- Логика для обновления токена ---

// Флаг, показывающий, идет ли процесс обновления токена
let isRefreshing = false;
// Очередь для запросов, которые не удались с ошибкой 401 и ждут новый токен
let failedQueue: Array<{ resolve: (value: unknown) => void; reject: (reason?: any) => void }> = [];

// Функция для обработки очереди запросов после попытки обновления токена
const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      // Если обновление токена не удалось, отклоняем ожидающие запросы
      prom.reject(error);
    } else {
      // Если обновление успешно, разрешаем ожидающие запросы (они будут повторены с новым токеном)
      prom.resolve(token);
    }
  });
  // Очищаем очередь
  failedQueue = [];
};


// --- Интерцептор ответов ---
// Обрабатывает ответы от сервера, в частности ошибки 401 для обновления токена
apiClient.interceptors.response.use(
  (response) => {
    // Если ответ успешный (статус 2xx), просто возвращаем его
    return response;
  },
  async (error) => {
    const originalRequest = error.config; // Исходная конфигурация запроса, который вызвал ошибку

    // Проверяем, что это ошибка 401 Unauthorized и что запрос еще не помечен как повторный (_retry)
    if (error.response?.status === 401 && !originalRequest._retry) {

      // Важно: Если ошибка 401 пришла от самого запроса на обновление токена,
      // значит refresh токен невалиден или истек, нужно разлогинить пользователя.
      if (originalRequest.url === '/token/refresh/') { // Сравниваем с относительным путем эндпоинта
          console.error('Refresh token failed or expired during refresh attempt. Logging out.');
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          // Перезагрузка страницы приведет к срабатыванию логики в AuthProvider/PrivateRoute
          window.location.href = '/login';
          return Promise.reject(error); // Прекращаем дальнейшую обработку
      }

      // Если уже идет процесс обновления токена (другой запрос его инициировал),
      // добавляем текущий запрос в очередь ожидания.
      if (isRefreshing) {
        return new Promise(function(resolve, reject) {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          // Когда токен получен (или пришла ошибка), повторяем оригинальный запрос
          originalRequest.headers['Authorization'] = 'Bearer ' + token;
          return apiClient(originalRequest);
        }).catch(err => {
          // Ошибка при ожидании или выполнении запроса из очереди
          return Promise.reject(err);
        });
      }

      // Помечаем запрос как повторный, чтобы избежать бесконечного цикла
      originalRequest._retry = true;
      // Устанавливаем флаг, что процесс обновления начался
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refreshToken');

      // Если refresh токена нет, разлогиниваем
      if (!refreshToken) {
        console.error('No refresh token found in localStorage. Logging out.');
        isRefreshing = false;
        localStorage.removeItem('accessToken');
        // localStorage.removeItem('refreshToken'); // Его и так нет
        window.location.href = '/login';
        return Promise.reject(error);
      }

      // Пытаемся обновить токен
      try {
        console.log('Access token potentially expired. Attempting to refresh...');
        // Используем обычный axios.post, а не apiClient, чтобы избежать интерцепторов для этого запроса
        const response = await axios.post(`${API_BASE_URL}token/refresh/`, {
          refresh: refreshToken,
        });

        const newAccessToken = response.data.access;
        // Если бэкенд настроен на ROTATE_REFRESH_TOKENS, он вернет и новый refresh токен
        // const newRefreshToken = response.data.refresh;

        console.log('Token refreshed successfully.');

        // Сохраняем новый токен (или токены)
        localStorage.setItem('accessToken', newAccessToken);
        // if (newRefreshToken) localStorage.setItem('refreshToken', newRefreshToken);

        // Обновляем токен в заголовках по умолчанию для последующих запросов apiClient
        apiClient.defaults.headers.common['Authorization'] = 'Bearer ' + newAccessToken;
        // Обновляем токен в заголовке оригинального запроса
        originalRequest.headers['Authorization'] = 'Bearer ' + newAccessToken;

        // Обрабатываем очередь запросов, которые ждали токен
        processQueue(null, newAccessToken);

        // Повторяем оригинальный запрос с новым токеном
        return apiClient(originalRequest);

      } catch (refreshError) { // Используем другую переменную для ошибки обновления
        console.error('Failed to refresh token:', refreshError.response?.data || refreshError.message);
        // Если обновить токен не удалось, обрабатываем очередь с ошибкой
        processQueue(refreshError, null);
        // Разлогиниваем пользователя
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError); // Возвращаем ошибку обновления токена
      } finally {
        // В любом случае сбрасываем флаг процесса обновления
        isRefreshing = false;
      }
    }

    // Если ошибка не 401 или это был повторный запрос (_retry = true),
    // просто возвращаем ошибку дальше для обработки в компоненте.
    return Promise.reject(error);
  }
);

export default apiClient;
