'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import styles from './behavior.module.css';

// Данные для связки Риск → Опасность (оставляем как было)
const RISK_DANGERS: Record<string, string[]> = {
  'риск поражения эл.током': [
    'открытые токоведущие элементы',
    'неисправность инструмента',
    'неизолированные эл. провода'
  ],
  'риск подскальзывания, спотыкания, падения': [
    'скользкие поверхности',
    'перепады высот',
    'открытые люки'
  ],
  'риск получения термического ожога': [
    'горячие поверхности'
  ],
  'риск получения химического ожога': [
    'пролив/разлив концентрированной кислоты',
    'пролив/разлив щелочи'
  ],
  'риск травмирования конечностей': [
    'вращающиеся элементы оборудования',
    'движущиеся элементы оборудования'
  ],
  'риск зажатия': [
    'ограниченный доступ к оборудованию',
    'труднодоступный доступ к оборудованию'
  ],
  'риск пореза': [
    'открытые колющие части оборудования',
    'открытые режущие части оборудования'
  ],
  'риск ушиба': [
    'конструктив оборудования',
    'элементы размещены так, что возможен удар'
  ],
  'риск падения с высоты': [
    'ненадежность конструкции страховочной системы'
  ],
  'риск падения при перепаде высот': [
    'ненадежные конструкции',
    'ненадежные площадки',
    'ненадежные приспособления'
  ]
};

const RISKS = Object.keys(RISK_DANGERS);

const SITES = [
  { id: 1, name: 'Цех №1 (Сборка)' },
  { id: 2, name: 'Цех №2 (Сварка)' },
  { id: 3, name: 'Склад ГСМ' },
  { id: 4, name: 'Территория завода' },
  { id: 5, name: 'Административное здание' },
  { id: 6, name: 'Лаборатория' },
];

export default function BehaviorReportPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState('');
  
  const [formData, setFormData] = useState({
    risk: '',
    danger: '',
    unsafe_conditions: '',
    unsafe_actions: '',
    site_id: '',
    location_detail: '',
    date: new Date().toISOString().split('T')[0],
    time: '',
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

  const dangers = formData.risk ? RISK_DANGERS[formData.risk] || [] : [];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === 'risk') {
      setFormData(prev => ({
        ...prev,
        risk: value,
        danger: ''
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    if (!formData.risk) {
      setError('Выберите риск');
      setLoading(false);
      return;
    }
    if (!formData.danger) {
      setError('Выберите опасность');
      setLoading(false);
      return;
    }
    if (!formData.site_id) {
      setError('Выберите участок');
      setLoading(false);
      return;
    }

    try {
      const { error: insertError } = await supabase
        .from('observations')
        .insert({
          user_id: userId,
          user_name: userName,
          type: 'behavior',
          risk: formData.risk,
          danger: formData.danger,
          unsafe_conditions: formData.unsafe_conditions || null,
          unsafe_actions: formData.unsafe_actions || null,
          site_id: parseInt(formData.site_id),
          location_detail: formData.location_detail || null,
          date: formData.date,
          time: formData.time || null,
          status: 'pending'
        });

      if (insertError) throw insertError;
      
      setSuccess(true);
      setFormData({
        risk: '',
        danger: '',
        unsafe_conditions: '',
        unsafe_actions: '',
        site_id: '',
        location_detail: '',
        date: new Date().toISOString().split('T')[0],
        time: '',
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
          <div className={styles.badge}>Наблюдение</div>
          <h1 className={styles.title}>Поведение<br />сотрудника</h1>
          <p className={styles.description}>
            Фиксируйте наблюдения за безопасным или небезопасным поведением сотрудников.
          </p>
          <div className={styles.tipBox}>
            <h4>📋 Что фиксировать</h4>
            <ul>
              <li>✓ Небезопасные действия (работа без СИЗ, нарушение процедур)</li>
              <li>✓ Безопасные действия (примеры правильного поведения)</li>
              <li>✓ Небезопасные условия (поручни, освещение, захламленность)</li>
            </ul>
          </div>
          <div className={styles.tipBox}>
            <h4>⚡ Что будет дальше</h4>
            <ul>
              <li>• Руководитель получит уведомление</li>
              <li>• Наблюдение будет проанализировано</li>
              <li>• При необходимости назначен ответственный</li>
            </ul>
          </div>
        </div>

        <div className={styles.formContainer}>
          <div className={styles.formHeader}>
            <h2>Регистрация наблюдения</h2>
            <p>Заполните информацию о наблюдении за поведением сотрудника</p>
          </div>

          <div className={styles.userInfo}>
            <span>Вы вошли как:</span>
            <span>{userName || 'Загрузка...'}</span>
          </div>

          {success && (
            <div className={styles.successMessage}>
              ✓ Наблюдение зарегистрировано! Руководитель получил уведомление.
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
                <label>Риск <span className={styles.required}>*</span></label>
                <select name="risk" value={formData.risk} onChange={handleChange} required>
                  <option value="">Выберите риск</option>
                  {RISKS.map(risk => (
                    <option key={risk} value={risk}>{risk}</option>
                  ))}
                </select>
              </div>

              <div className={styles.fieldGroup}>
                <label>Опасность <span className={styles.required}>*</span></label>
                <select 
                  name="danger" 
                  value={formData.danger} 
                  onChange={handleChange}
                  disabled={!formData.risk}
                  required
                >
                  <option value="">Выберите опасность</option>
                  {dangers.map(danger => (
                    <option key={danger} value={danger}>{danger}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.fieldGroup}>
                <label>Небезопасные условия</label>
                <textarea
                  name="unsafe_conditions"
                  value={formData.unsafe_conditions}
                  onChange={handleChange}
                  placeholder="Опишите небезопасные условия, которые вы заметили..."
                />
              </div>

              <div className={styles.fieldGroup}>
                <label>Небезопасные действия</label>
                <textarea
                  name="unsafe_actions"
                  value={formData.unsafe_actions}
                  onChange={handleChange}
                  placeholder="Опишите небезопасные действия сотрудников..."
                />
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
                  placeholder="Например: 3-й пролёт, возле станка №45"
                />
              </div>
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
                {loading ? 'Отправка...' : '📝 Отправить наблюдение'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}