// frontend/src/components/PatientList.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom'; // Импортируем Link для создания ссылок
import apiClient from '../services/api'; // Наш настроенный axios клиент

// Опционально: Определяем интерфейс для лучшей типизации (если используете TS)
// interface Patient {
//   id: number;
//   first_name: string;
//   last_name: string;
//   date_of_birth?: string; // Сделать необязательным или убедиться, что он всегда приходит
//   // Добавьте другие поля, если они приходят от API
// }

function PatientList() {
  // Используем Patient[] если определили интерфейс: const [patients, setPatients] = useState<Patient[]>([]);
  const [patients, setPatients] = useState([]); // Состояние для хранения списка
  const [loading, setLoading] = useState(true); // Состояние загрузки
  const [error, setError] = useState(null);     // Состояние для ошибок

  useEffect(() => {
    // Функция для загрузки данных
    const fetchPatients = async () => {
      setLoading(true); // Начинаем загрузку
      setError(null);
      try {
        // Делаем GET запрос к эндпоинту списка пациентов
        const response = await apiClient.get('/patients/');
        setPatients(response.data); // Сохраняем полученные данные в состояние
      } catch (err) {
        console.error("Ошибка при загрузке пациентов:", err);
        // Возможно, стоит проверять err.message или err.response.data для более детальной ошибки
        setError("Не удалось загрузить список пациентов."); // Сохраняем ошибку
      } finally {
        setLoading(false); // Заканчиваем загрузку в любом случае
      }
    };

    fetchPatients(); // Вызываем функцию загрузки при монтировании компонента
  }, []); // Пустой массив зависимостей - выполнится один раз при монтировании

  // Отображение состояний загрузки и ошибки
  if (loading) {
    return <div>Загрузка пациентов...</div>;
  }
  if (error) {
    return <div style={{ color: 'red' }}>{error}</div>;
  }

  // Отображение списка пациентов (убрали дублирующийся заголовок H2)
  // Используем таблицу для лучшего представления
  return (
    <div>
      {patients.length === 0 ? (
        <p>Пациенты не найдены.</p>
      ) : (
        <table border={1} style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
          <thead>
            <tr>
              <th style={{ padding: '8px', textAlign: 'left' }}>ID</th>
              <th style={{ padding: '8px', textAlign: 'left' }}>Фамилия</th>
              <th style={{ padding: '8px', textAlign: 'left' }}>Имя</th>
              {/* Опционально: <th style={{ padding: '8px', textAlign: 'left' }}>Дата рождения</th> */}
              <th style={{ padding: '8px', textAlign: 'left' }}>Действия</th>
            </tr>
          </thead>
          <tbody>
            {/* Проходим по массиву пациентов */}
            {patients.map(patient => (
              <tr key={patient.id}>
                <td style={{ padding: '8px' }}>{patient.id}</td>
                <td style={{ padding: '8px' }}>{patient.last_name}</td>
                <td style={{ padding: '8px' }}>{patient.first_name}</td>
                {/* Опционально: <td style={{ padding: '8px' }}>{patient.date_of_birth || '-'}</td> */}
                <td style={{ padding: '8px' }}>
                  {/* Создаем ссылку на детальную страницу пациента */}
                  <Link to={`/patients/${patient.id}`}>
                    <button>Подробнее</button>
                  </Link>
                  {/* В будущем можно добавить кнопки Редактировать/Удалить */}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default PatientList;
