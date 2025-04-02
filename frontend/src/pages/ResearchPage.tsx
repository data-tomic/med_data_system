// frontend/src/pages/ResearchPage.tsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom'; // Для ссылок на карту пациента
import apiClient from '../services/api'; // Наш axios клиент

// Интерфейс для данных пациента, возвращаемых API запросом
interface PatientResult {
    id: number;
    first_name: string;
    last_name: string;
    date_of_birth: string;
    primary_diagnosis_mkb?: string; // Диагноз может и не приходить в базовом PatientSerializer
}

const ResearchPage: React.FC = () => {
  // --- Состояния для фильтров ---
  const [diagnosisMkb, setDiagnosisMkb] = useState<string>('');
  const [ageMin, setAgeMin] = useState<string>(''); // Храним как строку для input type="number"
  const [ageMax, setAgeMax] = useState<string>(''); // Храним как строку для input type="number"
  // Добавьте здесь состояния для других фильтров, если нужно

  // --- Состояния для результатов и процесса загрузки ---
  const [results, setResults] = useState<PatientResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchPerformed, setSearchPerformed] = useState<boolean>(false); // Флаг, чтобы не показывать "не найдено" до первого поиска

  // --- Обработчик отправки формы ---
  const handleSearch = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); // Предотвращаем перезагрузку страницы
    setIsLoading(true);
    setError(null);
    setResults([]); // Очищаем старые результаты
    setSearchPerformed(true); // Помечаем, что был выполнен поиск

    // Формируем параметры для GET-запроса, добавляя только непустые значения
    const params = new URLSearchParams();
    if (diagnosisMkb.trim()) params.append('diagnosis_mkb', diagnosisMkb.trim());
    if (ageMin) params.append('age_min', ageMin);
    if (ageMax) params.append('age_max', ageMax);
    // Добавьте другие параметры здесь, если они есть

    try {
      const queryString = params.toString();
      console.log(`Performing research query: /research/query/?${queryString}`); // Отладка
      // Выполняем GET-запрос с параметрами
      const response = await apiClient.get<PatientResult[]>(`/research/query/?${queryString}`);
      setResults(response.data);
      console.log("Query results received:", response.data); // Отладка
    } catch (err: any) {
      console.error("Error performing research query:", err.response?.data || err.message);
      // Попытка показать ошибку от бэкенда, если она есть в data.error
      setError(`Не удалось выполнить запрос. ${err.response?.data?.error || err.message || ''}`);
    } finally {
      setIsLoading(false);
    }
  };

  // --- JSX Разметка ---
  return (
    <div style={{ padding: '20px' }}>
      <h1>Запрос для Исследований</h1>
      <p>Задайте критерии для формирования выборки пациентов.</p>

      {/* --- Форма Фильтров --- */}
      <form onSubmit={handleSearch} style={{ marginBottom: '30px', padding: '20px', border: '1px solid #eee', borderRadius: '8px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
          {/* Фильтр по Диагнозу */}
          <div>
            <label htmlFor="diagnosis" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Диагноз (МКБ):
            </label>
            <input
              type="text"
              id="diagnosis"
              value={diagnosisMkb}
              onChange={(e) => setDiagnosisMkb(e.target.value)}
              placeholder="например, C71.0"
              style={{ width: '100%', padding: '10px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px' }}
            />
          </div>

          {/* Фильтр по Возрасту (От) */}
          <div>
            <label htmlFor="ageMin" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Возраст От:
            </label>
            <input
              type="number"
              id="ageMin"
              value={ageMin}
              onChange={(e) => setAgeMin(e.target.value)}
              placeholder="лет (включительно)"
              min="0"
              style={{ width: '100%', padding: '10px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px' }}
            />
          </div>

          {/* Фильтр по Возрасту (До) */}
          <div>
            <label htmlFor="ageMax" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Возраст До:
            </label>
            <input
              type="number"
              id="ageMax"
              value={ageMax}
              onChange={(e) => setAgeMax(e.target.value)}
              placeholder="лет (включительно)"
              min="0"
              style={{ width: '100%', padding: '10px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px' }}
            />
          </div>
          {/* Добавьте здесь другие поля фильтров, обернув их в <div> */}

        </div>
        {/* Кнопка Поиска */}
        <button type="submit" disabled={isLoading} style={{ padding: '10px 20px', cursor: 'pointer' }}>
          {isLoading ? 'Поиск...' : 'Найти Пациентов'}
        </button>
      </form>
      {/* --- /Форма Фильтров --- */}


      {/* --- Результаты Поиска --- */}
      {/* Показываем только после того, как был выполнен хотя бы один поиск */}
      {searchPerformed && (
        <div id="search-results">
          {isLoading && <div>Выполняется поиск...</div>}
          {error && <div style={{ color: 'red', marginTop: '15px' }}>{error}</div>}

          {!isLoading && !error && (
            <div>
              <h3>Результаты поиска ({results.length} найдено):</h3>
              {results.length === 0 ? (
                <p>Пациенты, соответствующие критериям, не найдены.</p>
              ) : (
                <table border={1} style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '8px', textAlign: 'left' }}>ID</th>
                      <th style={{ padding: '8px', textAlign: 'left' }}>Фамилия</th>
                      <th style={{ padding: '8px', textAlign: 'left' }}>Имя</th>
                      <th style={{ padding: '8px', textAlign: 'left' }}>Дата Рождения</th>
                      <th style={{ padding: '8px', textAlign: 'left' }}>Диагноз (МКБ)</th>
                      <th style={{ padding: '8px', textAlign: 'left' }}>Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map(patient => (
                      <tr key={patient.id}>
                        <td style={{ padding: '8px' }}>{patient.id}</td>
                        <td style={{ padding: '8px' }}>{patient.last_name}</td>
                        <td style={{ padding: '8px' }}>{patient.first_name}</td>
                        <td style={{ padding: '8px' }}>{patient.date_of_birth}</td>
                        {/* Отображаем диагноз, если он есть в ответе API */}
                        <td style={{ padding: '8px' }}>{patient.primary_diagnosis_mkb || '-'}</td>
                        <td style={{ padding: '8px' }}>
                          {/* Ссылка на детальную карту пациента */}
                          <Link to={`/patients/${patient.id}`}>
                            <button>К Карте</button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                /* Здесь можно добавить кнопку "Экспорт в CSV/Excel" (в будущем) */
              )}
            </div>
          )}
        </div>
      )}
      /* --- /Результаты Поиска --- */

    </div>
  );
};

export default ResearchPage;
