import React, { useState } from 'react';
import apiClient from '../services/api';
import { useNavigate } from 'react-router-dom'; // Для редиректа после успеха

function CreatePatientForm() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  // Добавьте другие поля по необходимости (диагноз и т.д.)
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate(); // Hook для программной навигации

  const handleSubmit = async (event) => {
    event.preventDefault(); // Предотвращаем стандартную отправку формы
    setIsSubmitting(true);
    setError(null);

    const patientData = {
      first_name: firstName,
      last_name: lastName,
      date_of_birth: dateOfBirth,
      // ...другие поля
    };

    try {
      // Отправляем POST запрос на эндпоинт создания пациентов
      const response = await apiClient.post('/patients/', patientData);
      console.log('Пациент успешно создан:', response.data);
      // Перенаправляем на список пациентов или на страницу созданного пациента
      navigate('/patients'); // или `/patients/${response.data.id}`
    } catch (err) {
      console.error("Ошибка при создании пациента:", err.response?.data || err.message);
      // Попытаемся показать ошибку от бэкенда, если она есть
      setError(JSON.stringify(err.response?.data) || "Не удалось создать пациента.");
      setIsSubmitting(false);
    }
    // setIsSubmitting(false) не нужно здесь, т.к. происходит редирект при успехе
  };

  return (
    <div>
      <h2>Добавить нового пациента</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="firstName">Имя:</label>
          <input
            type="text"
            id="firstName"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="lastName">Фамилия:</label>
          <input
            type="text"
            id="lastName"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="dateOfBirth">Дата рождения:</label>
          <input
            type="date" // Используем input type="date"
            id="dateOfBirth"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            required
          />
        </div>
        {/* Добавьте другие поля формы */}

        {error && <div style={{ color: 'red', marginTop: '10px' }}>{error}</div>}

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Сохранение...' : 'Сохранить пациента'}
        </button>
      </form>
    </div>
  );
}

export default CreatePatientForm;
