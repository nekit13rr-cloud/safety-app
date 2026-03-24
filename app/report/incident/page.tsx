'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import styles from './incident.module.css';

// Стандарты безопасности
const STANDARDS = [
  { id: 'ps', name: 'PS (Безопасность процессов)' },
  { id: 'loto', name: 'LOTO (Блокировка/маркировка)' },
  { id: 'ptw', name: 'PTW (Наряд-допуск)' },
  { id: 'jha', name: 'JHA (Анализ опасностей)' },
  { id: 'bbs', name: 'BBS (Наблюдение за поведением)' },
  { id: 'other', name: 'Другой' },
];

// Участки
const SITES = [
  { id: 1, name: 'Цех №1 (Сборка)' },
  { id: 2, name: 'Цех №2 (Сварка)' },
  { id: 3, name: 'Склад ГСМ' },
  { id: 4, name: 'Территория завода' },
  { id: 5, name: 'Административное здание' },
  { id: 6, name: 'Лаборатория' },
];

// Варианты исхода
const OUTCOMES = [
  'Без травм',
  'Легкая травма',
  'Тяжелая травма',
  'Смертельный исход',
  'Материальный ущерб',
  'Остановка производства',
];

export default function IncidentReportPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState('');
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    time: '',
    site_id: '',
    location_detail: '',
    description: '',
    affected_person: '',
    standards: [] as string[],
    immediate_causes: '',
    corrective_actions: '',
    outcome: '',
    photos: [] as File[],
  });

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        setUserId(user.id);
        const fullName = user.user_metadata?.full_name || 
                         user.user_metadata?.name ||
                         user.email?.split('@')[0] || 
                         'Сотрудник';
        setUserName(fullName);
      } else {
        router.push('/login');
      }
    };
    
    getUser();
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleStandardToggle = (standardId: string) => {
    setFormData(prev => ({
      ...prev,
      standards: prev.standards.includes(standardId)
        ? prev.standards.filter(s => s !== standardId)
        : [...prev.standards, standardId]
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFormData(prev => ({
        ...prev,
        photos: Array.from(e.target.files || [])
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    if (!formData.site_id) {
      setError('Выберите участок');
      setLoading(false);
      return;
    }
    if (!formData.description.trim()) {
      setError('Опишите происшествие');
      setLoading(false);
      return;
    }
    if (!formData.affected_person.trim()) {
      setError('Укажите пострадавшего или наблюдателя');
      setLoading(false);
      return;
    }

    try {
      const { error: insertError } = await supabase
        .from('observations')
        .insert({
          user_id: userId,
          user_name: userName,
          type: 'incident',
          site_id: parseInt(formData.site_id),
          location_detail: formData.location_detail || null,
          date: formData.date,
          time: formData.time || null,
          description: formData.description,
          affected_person: formData.affected_person,
          standards: formData.standards,
          immediate_causes: formData.immediate_causes || null,
          corrective_actions: formData.corrective_actions || null,
          outcome: formData.outcome || null,
          status: 'pending'
        });

      if (insertError) throw insertError;
      
      setSuccess(true);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        time: '',
        site_id: '',
        location_detail: '',
        description: '',
        affected_person: '',
        standards: [],
        immediate_causes: '',
        corrective_actions: '',
        outcome: '',
        photos: [],
      });
      
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Ошибка:', err);
      setError('Ошибка при отправке. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.page}>
      <div className={styles.wrapper}>
        <div className={styles.sidebar}>
          <div className={styles.badge}>Происшествие</div>
          <h1 className={styles.title}>Регистрация<br />происшествия</h1>
          <p className={styles.description}>
            Зарегистрируйте происшествие, несчастный случай или инцидент на производстве.
          </p>
          <div className={styles.tipBox}>
            <h4>📋 Что важно указать</h4>
            <ul>
              <li>✓ Точное время и место</li>
              <li>✓ Кто пострадал или участвовал</li>
              <li>✓ Причины (немедленные и коренные)</li>
              <li>✓ Какие действия уже предприняты</li>
              <li>✓ Фото/видео доказательства</li>
            </ul>
          </div>
          <div className={styles.tipBox}>
            <h4>⚡ Что будет дальше</h4>
            <ul>
              <li>• Руководитель получит уведомление</li>
              <li>• Назначена комиссия по расследованию</li>
              <li>• Разработаны корректирующие меры</li>
              <li>• Происшествие внесено в реестр</li>
            </ul>
          </div>
        </div>

        <div className={styles.formContainer}>
          <div className={styles.formHeader}>
            <h2>Регистрация происшествия</h2>
            <p>Заполните информацию о происшествии для расследования</p>
          </div>

          <div className={styles.userInfo}>
            <span>Заявитель:</span>
            <span>{userName || 'Загрузка...'}</span>
          </div>

          {success && (
            <div className={styles.successMessage}>
              ✓ Происшествие зарегистрировано! Назначена комиссия по расследованию.
            </div>
          )}

          {error && (
            <div className={styles.errorMessage}>
              ⚠ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formRow}>
              <div className={styles.fieldGroup}>
                <label>Дата <span className={styles.required}>*</span></label>
                <input type="date" name="date" value={formData.date} onChange={handleChange} required />
              </div>

              <div className={styles.fieldGroup}>
                <label>Время</label>
                <input type="time" name="time" value={formData.time} onChange={handleChange} />
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.fieldGroup}>
                <label>Участок <span className={styles.required}>*</span></label>
                <select name="site_id" value={formData.site_id} onChange={handleChange} required>
                  <option value="">Выберите участок</option>
                  {SITES.map(site => (
                    <option key={site.id} value={site.id}>{site.name}</option>
                  ))}
                </select>
              </div>

              <div className={styles.fieldGroup}>
                <label>Точное место</label>
                <input
                  type="text"
                  name="location_detail"
                  value={formData.location_detail}
                  onChange={handleChange}
                  placeholder="Цех, линия, оборудование"
                />
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <label>Что произошло? <span className={styles.required}>*</span></label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Краткое описание происшествия..."
                required
              />
            </div>

            <div className={styles.fieldGroup}>
              <label>Пострадавший или наблюдатель <span className={styles.required}>*</span></label>
              <input
                type="text"
                name="affected_person"
                value={formData.affected_person}
                onChange={handleChange}
                placeholder="ФИО, должность"
                required
              />
            </div>

            <div className={styles.fieldGroup}>
              <label>Соответствующие стандарты</label>
              <div className={styles.standardsGroup}>
                {STANDARDS.map(standard => (
                  <div
                    key={standard.id}
                    className={`${styles.standardChip} ${formData.standards.includes(standard.id) ? styles.selected : ''}`}
                    onClick={() => handleStandardToggle(standard.id)}
                  >
                    {standard.name}
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <label>Немедленные причины</label>
              <textarea
                name="immediate_causes"
                value={formData.immediate_causes}
                onChange={handleChange}
                placeholder="Что непосредственно привело к происшествию?"
              />
            </div>

            <div className={styles.fieldGroup}>
              <label>Немедленные корректирующие действия</label>
              <textarea
                name="corrective_actions"
                value={formData.corrective_actions}
                onChange={handleChange}
                placeholder="Что уже сделано для устранения последствий?"
              />
            </div>

            <div className={styles.formRow}>
              <div className={styles.fieldGroup}>
                <label>Исход / результат</label>
                <select name="outcome" value={formData.outcome} onChange={handleChange}>
                  <option value="">Выберите исход</option>
                  {OUTCOMES.map(outcome => (
                    <option key={outcome} value={outcome}>{outcome}</option>
                  ))}
                </select>
              </div>

              <div className={styles.fieldGroup}>
                <label>Фото/видео доказательства</label>
                <input
                  type="file"
                  className={styles.fileInput}
                  accept="image/*,video/*"
                  multiple
                  onChange={handleFileChange}
                />
                {formData.photos.length > 0 && (
                  <span style={{ fontSize: 12, color: '#6b4b89', marginTop: 4 }}>
                    Выбрано файлов: {formData.photos.length}
                  </span>
                )}
              </div>
            </div>

            <div className={styles.buttons}>
              <button type="button" className={styles.cancelBtn} onClick={() => router.back()}>
                ← Назад
              </button>
              <button type="submit" className={styles.submitBtn} disabled={loading}>
                {loading ? 'Отправка...' : '🚨 Зарегистрировать происшествие'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}