'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import styles from './responsible.module.css';

type Task = {
  id: string;
  type: string;
  title?: string;
  description: string;
  site_id: number;
  location_detail?: string;
  date: string;
  severity?: string;
  status: string;
  assigned_to: string;
  user_name: string;
  created_at: string;
};

type ObservationForm = {
  type: 'danger' | 'behavior' | 'incident';
  title: string;
  description: string;
  site_id: string;
  location_detail: string;
  date: string;
  severity: string;
};

const SITES = [
  { id: 1, name: 'Цех №1 (Сборка)' },
  { id: 2, name: 'Цех №2 (Сварка)' },
  { id: 3, name: 'Склад ГСМ' },
  { id: 4, name: 'Территория завода' },
  { id: 5, name: 'Административное здание' },
  { id: 6, name: 'Лаборатория' },
];

export default function ResponsibleDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState('');
  const [userRole, setUserRole] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  const [formData, setFormData] = useState<ObservationForm>({
    type: 'danger',
    title: '',
    description: '',
    site_id: '',
    location_detail: '',
    date: new Date().toISOString().split('T')[0],
    severity: 'medium',
  });

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (userName && userRole === 'responsible') {
      fetchTasks();
    }
  }, [userName, userRole]);

  const checkAuth = async () => {
    try {
      console.log('=== ПРОВЕРКА АВТОРИЗАЦИИ (ОТВЕТСТВЕННЫЙ) ===');
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('Ошибка получения пользователя:', userError);
        router.push('/login');
        return;
      }
      
      console.log('Пользователь ID:', user.id);
      console.log('Пользователь Email:', user.email);
      setUserId(user.id);
      
      // Получаем профиль пользователя
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, role')
        .eq('id', user.id)
        .single();
      
      if (profileError) {
        console.error('Ошибка получения профиля:', profileError);
        setUserName(user.email?.split('@')[0] || 'Ответственный');
      } else {
        console.log('Профиль найден:', profile);
        setUserName(profile.full_name || user.email?.split('@')[0] || 'Ответственный');
        setUserRole(profile.role);
        
        // Проверяем роль
        if (profile.role !== 'responsible') {
          console.warn('Пользователь не имеет роли responsible, роль:', profile.role);
          setToast({ message: 'У вас нет прав для доступа', type: 'error' });
          setTimeout(() => router.push('/'), 2000);
          return;
        }
      }
      
      console.log('Имя пользователя для поиска задач:', userName);
    } catch (err) {
      console.error('Неожиданная ошибка:', err);
      router.push('/login');
    }
  };

  const fetchTasks = async () => {
    setLoading(true);
    console.log('=== ПОИСК ЗАДАЧ ДЛЯ ===', userName);
    
    try {
      const { data, error, status } = await supabase
        .from('observations')
        .select('*')
        .eq('assigned_to', userName)
        .order('created_at', { ascending: false });
      
      console.log('Статус запроса:', status);
      console.log('Найдено задач:', data?.length || 0);
      console.log('Данные:', data);
      
      if (error) throw error;
      setTasks(data || []);
    } catch (err) {
      console.error('Ошибка загрузки задач:', err);
      setToast({ message: 'Ошибка загрузки задач', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    console.log('=== ИЗМЕНЕНИЕ СТАТУСА ===');
    console.log('Задача ID:', taskId);
    console.log('Новый статус:', newStatus);
    
    try {
      const { data, error } = await supabase
        .from('observations')
        .update({ status: newStatus })
        .eq('id', taskId)
        .select();
      
      console.log('Результат обновления:', data);
      
      if (error) throw error;
      
      setToast({ 
        message: `Статус обновлён на "${newStatus === 'in_progress' ? 'В работе' : 'Завершено'}"`, 
        type: 'success' 
      });
      fetchTasks();
    } catch (err) {
      console.error('Ошибка обновления статуса:', err);
      setToast({ message: 'Ошибка при обновлении', type: 'error' });
    }
  };

  const handleAddObservation = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('=== ДОБАВЛЕНИЕ НАБЛЮДЕНИЯ ===');
    console.log('Данные формы:', formData);
    
    if (!formData.title || !formData.description || !formData.site_id) {
      setToast({ message: 'Заполните все обязательные поля', type: 'error' });
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('observations')
        .insert({
          type: formData.type,
          title: formData.title,
          description: formData.description,
          site_id: parseInt(formData.site_id),
          location_detail: formData.location_detail || null,
          date: formData.date,
          severity: formData.severity,
          status: 'pending',
          user_name: userName,
          user_id: userId,
          assigned_to: null,
        })
        .select();
      
      console.log('Результат добавления:', data);
      
      if (error) throw error;
      
      setToast({ message: 'Наблюдение зарегистрировано', type: 'success' });
      setShowAddForm(false);
      setFormData({
        type: 'danger',
        title: '',
        description: '',
        site_id: '',
        location_detail: '',
        date: new Date().toISOString().split('T')[0],
        severity: 'medium',
      });
      fetchTasks();
    } catch (err) {
      console.error('Ошибка добавления:', err);
      setToast({ message: 'Ошибка при добавлении', type: 'error' });
    }
  };

  const getTypeLabel = (type: string) => {
    const labels = {
      danger: 'Опасная ситуация',
      behavior: 'Наблюдение',
      incident: 'Происшествие',
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      pending: 'Ожидает',
      in_progress: 'В работе',
      resolved: 'Завершено',
    };
    return labels[status as keyof typeof labels] || status;
  };

  const getSiteName = (siteId: number) => {
    return SITES.find(s => s.id === siteId)?.name || 'Не указан';
  };

  const getSeverityLabel = (severity?: string) => {
    const labels = {
      low: 'Низкая',
      medium: 'Средняя',
      high: 'Высокая',
      critical: 'Критическая',
    };
    return severity ? labels[severity as keyof typeof labels] : '-';
  };

  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    resolved: tasks.filter(t => t.status === 'resolved').length,
  };

  const activeTasks = tasks.filter(t => t.status !== 'resolved');
  const completedTasks = tasks.filter(t => t.status === 'resolved');

  if (loading) {
    return (
      <main className={styles.page}>
        <div style={{ textAlign: 'center', padding: '100px 20px' }}>
          <div style={{ 
            width: 48, 
            height: 48, 
            border: '3px solid rgba(139, 92, 246, 0.2)', 
            borderTopColor: '#8b5cf6', 
            borderRadius: '50%', 
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }} />
          <p style={{ color: '#5a4a6e' }}>Загрузка задач...</p>
        </div>
        <style jsx>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.logo}>
            <h1>HSE Dashboard</h1>
          </div>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{userName}</span>
            <button className={styles.logoutBtn} onClick={() => supabase.auth.signOut()}>
              Выйти
            </button>
          </div>
        </div>
      </div>

      <div className={styles.container}>
        <div className={styles.welcome}>
          <h2>Добро пожаловать, {userName}</h2>
          <p>Ваши задачи и наблюдения</p>
        </div>

        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <h4>Всего задач</h4>
            <div className={styles.statValue}>{stats.total}</div>
          </div>
          <div className={styles.statCard}>
            <h4>В работе</h4>
            <div className={styles.statValue}>{stats.inProgress}</div>
          </div>
          <div className={styles.statCard}>
            <h4>Завершено</h4>
            <div className={styles.statValue}>{stats.resolved}</div>
            <div className={styles.statTrend}>
              {stats.total > 0 ? `${Math.round((stats.resolved / stats.total) * 100)}% выполнено` : ''}
            </div>
          </div>
        </div>

        <div className={styles.tasksSection}>
          <div className={styles.sectionHeader}>
            <h3>📋 Мои задачи</h3>
            <button 
              className={styles.taskBtn} 
              style={{ background: '#f5f3ff', color: '#6b4b89' }}
              onClick={() => setShowAddForm(!showAddForm)}
            >
              {showAddForm ? '✖ Отмена' : '+ Зарегистрировать наблюдение'}
            </button>
          </div>

          {activeTasks.length === 0 && completedTasks.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>📭</div>
              <p>У вас пока нет задач</p>
            </div>
          ) : (
            <>
              {/* Активные задачи */}
              {activeTasks.map(task => (
                <div key={task.id} className={styles.taskCard}>
                  <div className={styles.taskHeader}>
                    <span className={`${styles.taskType} ${styles[`type${task.type.charAt(0).toUpperCase() + task.type.slice(1)}`]}`}>
                      {getTypeLabel(task.type)}
                    </span>
                    <span className={`${styles.taskStatus} ${styles[`status${task.status === 'pending' ? 'Pending' : task.status === 'in_progress' ? 'InProgress' : 'Resolved'}`]}`}>
                      {getStatusLabel(task.status)}
                    </span>
                  </div>
                  <div className={styles.taskTitle}>
                    {task.title || task.description.substring(0, 100)}
                  </div>
                  <div className={styles.taskDescription}>
                    {task.description}
                  </div>
                  <div className={styles.taskMeta}>
                    <span>📍 {getSiteName(task.site_id)}</span>
                    <span>📅 {new Date(task.date).toLocaleDateString('ru-RU')}</span>
                    {task.severity && <span>⚠️ {getSeverityLabel(task.severity)}</span>}
                    <span>👤 {task.user_name}</span>
                  </div>
                  <div className={styles.taskActions}>
                    {task.status === 'pending' && (
                      <button 
                        className={`${styles.taskBtn} ${styles.startBtn}`}
                        onClick={() => handleStatusChange(task.id, 'in_progress')}
                      >
                        Начать работу
                      </button>
                    )}
                    {task.status === 'in_progress' && (
                      <button 
                        className={`${styles.taskBtn} ${styles.completeBtn}`}
                        onClick={() => handleStatusChange(task.id, 'resolved')}
                      >
                        Завершить
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {/* Завершённые задачи */}
              {completedTasks.length > 0 && (
                <>
                  <div className={styles.sectionHeader} style={{ marginTop: 24 }}>
                    <h3>✅ Завершённые задачи</h3>
                  </div>
                  {completedTasks.map(task => (
                    <div key={task.id} className={styles.taskCard} style={{ opacity: 0.7 }}>
                      <div className={styles.taskHeader}>
                        <span className={`${styles.taskType} ${styles[`type${task.type.charAt(0).toUpperCase() + task.type.slice(1)}`]}`}>
                          {getTypeLabel(task.type)}
                        </span>
                        <span className={`${styles.taskStatus} ${styles.statusResolved}`}>
                          Завершено
                        </span>
                      </div>
                      <div className={styles.taskTitle}>
                        {task.title || task.description.substring(0, 100)}
                      </div>
                      <div className={styles.taskMeta}>
                        <span>📍 {getSiteName(task.site_id)}</span>
                        <span>📅 {new Date(task.date).toLocaleDateString('ru-RU')}</span>
                        {task.severity && <span>⚠️ {getSeverityLabel(task.severity)}</span>}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </div>

        {showAddForm && (
          <div className={styles.addForm}>
            <h3>➕ Новое наблюдение</h3>
            <form onSubmit={handleAddObservation}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Тип *</label>
                  <select 
                    value={formData.type} 
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  >
                    <option value="danger">Опасная ситуация</option>
                    <option value="behavior">Наблюдение за поведением</option>
                    <option value="incident">Происшествие</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>Серьёзность</label>
                  <select 
                    value={formData.severity} 
                    onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                  >
                    <option value="low">Низкая</option>
                    <option value="medium">Средняя</option>
                    <option value="high">Высокая</option>
                    <option value="critical">Критическая</option>
                  </select>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Название *</label>
                <input 
                  type="text" 
                  placeholder="Краткое описание"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Участок *</label>
                  <select 
                    value={formData.site_id} 
                    onChange={(e) => setFormData({ ...formData, site_id: e.target.value })}
                    required
                  >
                    <option value="">Выберите участок</option>
                    {SITES.map(site => (
                      <option key={site.id} value={site.id}>{site.name}</option>
                    ))}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>Дата</label>
                  <input 
                    type="date" 
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Точное место</label>
                <input 
                  type="text" 
                  placeholder="Цех, линия, оборудование"
                  value={formData.location_detail}
                  onChange={(e) => setFormData({ ...formData, location_detail: e.target.value })}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Описание *</label>
                <textarea 
                  placeholder="Подробное описание ситуации..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className={styles.submitBtn}>
                  Отправить
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {toast && (
        <div className={`${styles.toast} ${toast.type === 'success' ? styles.toastSuccess : styles.toastError}`}>
          <span>{toast.type === 'success' ? '✅' : '❌'}</span>
          <span>{toast.message}</span>
        </div>
      )}
    </main>
  );
}