// frontend/src/pages/CreatePatientPage.tsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../services/api';
import MKBAutocomplete from '../components/MKBAutocomplete'; // Импорт компонента автодополнения

// Интерфейс для объекта опции МКБ, используемого MKBAutocomplete
interface MKBCodeOption {
  code: string;
  name: string;
}

const CreatePatientPage: React.FC = () => {
  // --- Состояния для полей формы ---
  const [lastName, setLastName] = useState<string>('');
  const [firstName, setFirstName] = useState<string>('');
  const [middleName, setMiddleName] = useState<string>(''); // Добавили отчество
  const [dateOfBirth, setDateOfBirth] = useState<string>('');
  const [diagnosis, setDiagnosis] = useState<MKBCodeOption | null>(null); // Состояние для выбранного диагноза МКБ
  // Добавьте состояния для других полей модели Patient, если они нужны в форме

  // --- Состояния для процесса отправки ---
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  // Состояние для ошибок валидации от бэкенда (если API их возвращает)
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string[] }>({});

  const navigate = useNavigate(); // Для редиректа после успешного создания

  // --- Обработчик отправки формы ---
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setValidationErrors({}); // Сбрасываем ошибки валидации

    // Формируем объект данных для отправки на API
    const patientData = {
      last_name: lastName,
      first_name: firstName,
      middle_name: middleName || null, // Отправляем null, если отчество не введено
      date_of_birth: dateOfBirth,
      // Отправляем только КОД выбранного диагноза
      primary_diagnosis_mkb: diagnosis?.code || null,
      // Добавьте другие поля здесь
    };

    console.log("Submitting patient data:", patientData); // Отладка

    try {
      // Отправляем POST запрос на эндпоинт создания пациентов
      const response = await apiClient.post('/patients/', patientData);
      console.log('Patient created successfully:', response.data);
      // Перенаправляем на страницу свежесозданного пациента или на список
      navigate(`/patients/${response.data.id}`); // Редирект на детали
      // или navigate('/patients'); // Редирект на список

    } catch (err: any) {
      console.error("Error creating patient:", err.response || err);
      if (err.response?.status === 400) {
        // Ошибка валидации от DRF
        setError("Ошибка валидации данных. Проверьте поля.");
        setValidationErrors(err.response.data); // Сохраняем ошибки по полям
      } else if (err.response?.status === 401 || err.response?.status === 403) {
         setError("Ошибка авторизации. Попробуйте войти снова.");
         // Возможно, здесь нужно вызвать logout из AuthContext
      } else {
        // Другие ошибки (сетевые, 500 и т.д.)
        setError("Не удалось создать пациента. Повторите попытку позже.");
      }
      setIsLoading(false); // Останавливаем загрузку при ошибке
    }
    // При успехе происходит редирект, поэтому setIsLoading(false) не нужен в конце try
  };

  return (
    <div style={{ padding: '20px', maxWidth: '700px', margin: 'auto' }}>
      {/* Ссылка для возврата к списку */}
      <Link to="/patients" style={{ textDecoration: 'none', marginBottom: '15px', display: 'inline-block' }}>
        ← Назад к списку пациентов
      </Link>

      <h1 style={{ textAlign: 'center' }}>Добавить нового пациента</h1>
      <hr style={{ margin: '15px 0 25px 0' }}/>

      <form onSubmit={handleSubmit}>
        {/* --- Поля ФИО и Дата Рождения --- */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '15px' }}>
          <div>
            <label htmlFor="lastName" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Фамилия:<span style={{color: 'red'}}>*</span></label>
            <input type="text" id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} required disabled={isLoading} style={{ width: '100%', padding: '10px', boxSizing: 'border-box', border: validationErrors.last_name ? '1px solid red' : '1px solid #ccc', borderRadius: '4px' }} />
            {validationErrors.last_name && <small style={{ color: 'red' }}>{validationErrors.last_name.join(', ')}</small>}
          </div>
          <div>
            <label htmlFor="firstName" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Имя:<span style={{color: 'red'}}>*</span></label>
            <input type="text" id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} required disabled={isLoading} style={{ width: '100%', padding: '10px', boxSizing: 'border-box', border: validationErrors.first_name ? '1px solid red' : '1px solid #ccc', borderRadius: '4px' }} />
             {validationErrors.first_name && <small style={{ color: 'red' }}>{validationErrors.first_name.join(', ')}</small>}
          </div>
          <div>
            <label htmlFor="middleName" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Отчество:</label>
            <input type="text" id="middleName" value={middleName} onChange={(e) => setMiddleName(e.target.value)} disabled={isLoading} style={{ width: '100%', padding: '10px', boxSizing: 'border-box', border: validationErrors.middle_name ? '1px solid red' : '1px solid #ccc', borderRadius: '4px' }} />
             {validationErrors.middle_name && <small style={{ color: 'red' }}>{validationErrors.middle_name.join(', ')}</small>}
          </div>
           <div>
            <label htmlFor="dateOfBirth" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Дата рождения:<span style={{color: 'red'}}>*</span></label>
            <input type="date" id="dateOfBirth" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} required disabled={isLoading} style={{ width: '100%', padding: '8px', boxSizing: 'border-box', border: validationErrors.date_of_birth ? '1px solid red' : '1px solid #ccc', borderRadius: '4px' }} />
             {validationErrors.date_of_birth && <small style={{ color: 'red' }}>{validationErrors.date_of_birth.join(', ')}</small>}
          </div>
        </div>

        {/* --- Поле Диагноза МКБ с Автодополнением --- */}
        <div style={{ marginBottom: '25px' }}>
          {/* Используем наш компонент MKBAutocomplete */}
          <MKBAutocomplete
            value={diagnosis}
            onChange={(newValue) => setDiagnosis(newValue)}
            label="Первичный диагноз (МКБ)" // Можно переопределить label
            // Передаем ошибки валидации, если они есть для этого поля
            error={!!validationErrors.primary_diagnosis_mkb}
            helperText={validationErrors.primary_diagnosis_mkb?.join(', ')}
          />
        </div>

        {/* --- Общая ошибка формы --- */}
        {error && <p style={{ color: 'red', textAlign: 'center', marginBottom: '15px' }}>{error}</p>}

        {/* --- Кнопка Сохранения --- */}
        <button
          type="submit"
          disabled={isLoading}
          style={{
              padding: '12px 20px', cursor: isLoading ? 'not-allowed' : 'pointer', width: '100%',
              backgroundColor: isLoading ? '#ccc' : '#28a745', color: 'white', border: 'none',
              borderRadius: '4px', fontSize: '16px', fontWeight: 'bold',
          }}
        >
          {isLoading ? 'Сохранение...' : 'Сохранить Пациента'}
        </button>
      </form>
    </div>
  );
};

export default CreatePatientPage;
