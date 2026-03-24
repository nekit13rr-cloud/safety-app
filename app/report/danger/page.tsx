'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import styles from './danger.module.css';

type Severity = 'low' | 'medium' | 'high' | 'critical';

const SITES = [
  { id: 1, name: 'Цех №1 (Сборка)' },
  { id: 2, name: 'Цех №2 (Сварка)' },
  { id: 3, name: 'Склад ГСМ' },
  { id: 4, name: 'Территория завода' },
  { id: 5, name: 'Административное здание' },
  { id: 6, name: 'Лаборатория' },
];

export default function DangerReportPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState('');
  
  const [formData, setFormData] = useState({
    title: '',
    site_id: '',
    location_detail: '',
    date: new Date().toISOString().split('T')[0],
    time: '',
    severity: 'medium' as Severity,
    description: '',
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

  const handleSeveritySelect = (severity: Severity) => {
    setFormData(prev => ({ ...prev, severity }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    if (!formData.title.trim()) {
      setError('Укажите название ситуации');
      setLoading(false);
      return;
    }
    if (!formData.site_id) {
      setError('Выберите участок');
      setLoading(false);
      return;
    }
    if (!formData.description.trim()) {
      setError('Опишите ситуацию подробно');
      setLoading(false);
      return;
    }

    try {
      const { error: insertError } = await supabase
        .from('observations')
        .insert({
          user_id: userId,
          user_name: userName,
          type: 'danger',
          title: formData.title,
          site_id: parseInt(formData.site_id),
          location_detail: formData.location_detail || null,
          date: formData.date,
          time: formData.time || null,
          severity: formData.severity,
          description: formData.description,
          status: 'pending'
        });

      if (insertError) throw insertError;
      
      setSuccess(true);
      setFormData({
        title: '',
        site_id: '',
        location_detail: '',
        date: new Date().toISOString().split('T')[0],
        time: '',
        severity: 'medium',
        description: '',
      });
      
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Ошибка:', err);
      setError('Ошибка при отправке. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  const severityLabels = {
    low: 'Низкая',
    medium: 'Средняя',
    high: 'Высокая',
    critical: 'Критическая',
  };

  return (
    <main className={styles.page}>
      <div className={styles.wrapper}>
        <div className={styles.sidebar}>
          <div className={styles.badge}>Опасная ситуация</div>
          <h1 className={styles.title}>Опасная<br />ситуация</h1>
          <p className={styles.description}>
            Сообщите о потенциально опасной ситуации, которая может привести к травмам или ущербу.
          </p>
          <div className={styles.tipBox}>
            <h4>📋 Что важно указать</h4>
            <ul>
              <li>✓ Выберите участок, где замечена опасность</li>
              <li>✓ Опишите, что именно произошло</li>
              <li>✓ Укажите, какое оборудование или вещества замешаны</li>
              <li>✓ Оцените степень серьёзности</li>
              <li>✓ Фото/видео можно добавить позже</li>
            </ul>
          </div>
          <div className={styles.tipBox}>
            <h4>⚡ Что будет дальше</h4>
            <ul>
              <li>• Руководитель участка получит уведомление</li>
              <li>• Он назначит ответственного для проверки</li>
              <li>• Будут приняты меры для устранения риска</li>
              <li>• Вы получите обратную связь</li>
            </ul>
          </div>
        </div>

        <div className={styles.formContainer}>
          <div className={styles.formHeader}>
            <h2>Регистрация опасной ситуации</h2>
            <p>Пожалуйста, заполните все поля. Руководитель получит уведомление</p>
          </div>

          <div className={styles.userInfo}>
            <span>Вы вошли как:</span>
            <span>{userName || 'Загрузка...'}</span>
          </div>

          {success && (
            <div className={styles.successMessage}>
              ✓ Сообщение отправлено! Руководитель участка получил уведомление.
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
                <label>Название ситуации <span className={styles.required}>*</span></label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="Например: Протечка химикатов, неисправное оборудование"
                  required
                />
              </div>

              <div className={styles.fieldGroup}>
                <label>Участок <span className={styles.required}>*</span></label>
                <select name="site_id" value={formData.site_id} onChange={handleChange} required>
                  <option value="">Выберите участок</option>
                  {SITES.map(site => (
                    <option key={site.id} value={site.id}>{site.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <label>Точное место (дополнительно)</label>
              <input
                type="text"
                name="location_detail"
                value={formData.location_detail}
                onChange={handleChange}
                placeholder="Например: 3-й пролёт, возле станка №45, 2-й этаж, кабинет 210"
              />
            </div>

            <div className={styles.formRow}>
              <div className={styles.fieldGroup}>
                <label>Дата</label>
                <input type="date" name="date" value={formData.date} onChange={handleChange} />
              </div>

              <div className={styles.fieldGroup}>
                <label>Время</label>
                <input type="time" name="time" value={formData.time} onChange={handleChange} />
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <label>Степень серьёзности <span className={styles.required}>*</span></label>
              <div className={styles.severityWrapper}>
                {(Object.keys(severityLabels) as Severity[]).map(sev => (
                  <button
                    key={sev}
                    type="button"
                    className={`${styles.severityOption} ${styles[sev]} ${formData.severity === sev ? styles.active : ''}`}
                    onClick={() => handleSeveritySelect(sev)}
                  >
                    {severityLabels[sev]}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <label>Подробное описание <span className={styles.required}>*</span></label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Опишите ситуацию максимально подробно:
• Что произошло?
• Какие риски вы видите?
• Есть ли пострадавшие?
• Какие действия уже предприняты?"
                required
              />
            </div>

            <div className={styles.fieldGroup}>
              <label>Фото/видео доказательства</label>
              <input
                type="file"
                className={styles.fileInput}
                accept="image/*,video/*"
                multiple
                onChange={(e) => {
                  console.log('Файлы выбраны:', e.target.files);
                }}
              />
            </div>

            <div className={styles.buttons}>
              <button type="button" className={styles.cancelBtn} onClick={() => router.back()}>
                ← Назад
              </button>
              <button type="submit" className={styles.submitBtn} disabled={loading}>
                {loading ? 'Отправка...' : '⚠️ Отправить сообщение'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}