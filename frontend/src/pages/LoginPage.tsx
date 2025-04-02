// frontend/src/pages/LoginPage.tsx
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import apiClient from '../services/api';
import { useAuth } from '../contexts/AuthContext'; // Используем хук useAuth

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const { login } = useAuth(); // Получаем функцию login из контекста
  const navigate = useNavigate();
  const location = useLocation();

  // Определяем, куда перенаправить пользователя после входа
  // Если он пришел со страницы, требующей логина (сохранено в state), идем туда, иначе на главную
  const from = location.state?.from?.pathname || '/';

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); // Предотвращаем стандартную отправку HTML-формы
    setIsLoading(true);     // Показываем индикатор загрузки
    setError(null);         // Сбрасываем предыдущие ошибки
    console.log(`Attempting login for user: ${username}`); // ЛОГ 1

    try {
      // Отправляем POST запрос на эндпоинт получения токенов
      const response = await apiClient.post('/token/', {
        username: username,
        password: password,
      });

      console.log('Login API Response Status:', response.status); // ЛОГ 2
      console.log('Login API Response Data:', response.data);    // ЛОГ 3

      // Проверяем, что ответ успешный и содержит ожидаемые токены
      if (response.status === 200 && response.data.access && response.data.refresh) {
        console.log('Tokens received successfully.'); // ЛОГ 4

        // !!! ВАЖНО: Вызываем login из AuthContext ПЕРЕД сохранением в localStorage,
        // т.к. login в AuthContext сам сохраняет в localStorage и обновляет состояние.
        // Передаем токены в функцию login из контекста
        login(response.data.access, response.data.refresh);
        console.log('AuthContext login function called.'); // ЛОГ 5

        // --- УДАЛЕНО: Дублирующее сохранение в localStorage ---
        // localStorage.setItem('accessToken', response.data.access);
        // localStorage.setItem('refreshToken', response.data.refresh);
        // console.log('Tokens saved to localStorage.'); // <--- НЕ НУЖНО, делает AuthProvider
        // --------------------------------------------------

        // Перенаправляем пользователя на предыдущую страницу или на главную
        console.log(`Login successful. Navigating to: ${from}`); // ЛОГ 6
        navigate(from, { replace: true }); // replace: true убирает страницу логина из истории браузера

      } else {
        // Эта ветка может сработать, если сервер вернул 200, но без токенов
        console.error("Tokens not found in successful response data!", response.data); // ЛОГ ОШИБКИ 1
        setError("Ошибка ответа сервера: не удалось получить токены.");
        setIsLoading(false); // Останавливаем загрузку при ошибке данных
      }

    } catch (err: any) {
      // Обрабатываем ошибки сети или ошибки от API (4xx, 5xx)
      console.error('Login API request failed:', err.response || err); // ЛОГ ОШИБКИ 2 (логируем весь объект ошибки или response)
      if (err.response?.status === 401) {
        // Ошибка 401 - Неверные учетные данные
        setError('Неверное имя пользователя или пароль.');
      } else {
        // Другие ошибки (сетевые, серверные 5xx)
        setError(`Произошла ошибка входа (${err.message || 'Network Error'}). Попробуйте позже.`);
      }
      setIsLoading(false); // Останавливаем загрузку при любой ошибке
    }
    // Не ставим setIsLoading(false) здесь, так как при успехе происходит редирект
  };

  // --- JSX Разметка Компонента ---
  return (
    <div style={{ padding: '20px', maxWidth: '400px', margin: 'auto', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '25px' }}>Вход в систему</h2>
      <form onSubmit={handleLogin}>
        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="username" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Имя пользователя:
          </label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            disabled={isLoading} // Блокируем поле во время загрузки
            style={{ width: '100%', padding: '10px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px' }}
            autoComplete="username"
          />
        </div>
        <div style={{ marginBottom: '20px' }}>
          <label htmlFor="password" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Пароль:
          </label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading} // Блокируем поле во время загрузки
            style={{ width: '100%', padding: '10px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px' }}
            autoComplete="current-password"
          />
        </div>

        {/* Отображение ошибки */}
        {error && <p style={{ color: 'red', textAlign: 'center', marginBottom: '15px' }}>{error}</p>}

        {/* Кнопка входа */}
        <button
          type="submit"
          disabled={isLoading}
          style={{
              padding: '12px 20px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              width: '100%',
              backgroundColor: isLoading ? '#ccc' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '16px',
              fontWeight: 'bold',
          }}
        >
          {isLoading ? 'Вход...' : 'Войти'}
        </button>
      </form>
    </div>
  );
};

export default LoginPage;
