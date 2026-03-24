'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import styles from './manager.module.css';

type Observation = {
  id: string;
  type: string;
  title?: string;
  description: string;
  site_id: number;
  location_detail?: string;
  date: string;
  severity?: string;
  status: string;
  assigned_to?: string;
  user_name: string;
  created_at: string;
};

type Employee = {
  id: string;
  full_name: string;
  role: string;
};

const SITES = [
  { id: 1, name: 'Цех №1 (Сборка)' },
  { id: 2, name: 'Цех №2 (Сварка)' },
  { id: 3, name: 'Склад ГСМ' },
  { id: 4, name: 'Территория завода' },
  { id: 5, name: 'Административное здание' },
  { id: 6, name: 'Лаборатория' },
];

export default function ManagerDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [filteredObservations, setFilteredObservations] = useState<Observation[]>([]);
  const [userName, setUserName] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');
  const [employees, setEmployees] = useState<Employee[]>([]);
  
  const [typeFilter, setTypeFilter] = useState('');
  const [siteFilter, setSiteFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedObservation, setSelectedObservation] = useState<Observation | null>(null);
  const [selectedAssignee, setSelectedAssignee] = useState('');
  
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    resolved: 0,
    danger: 0,
    behavior: 0,
    incident: 0,
  });
  
  const [weeklyTrend, setWeeklyTrend] = useState<{ day: string; count: number }[]>([]);
  const [sitesStats, setSitesStats] = useState<{ name: string; count: number }[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    checkAuth();
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (currentUserId) {
      fetchObservations();
    }
  }, [currentUserId]);

  useEffect(() => {
    applyFilters();
  }, [observations, typeFilter, siteFilter, statusFilter, dateFrom, dateTo]);

  const checkAuth = async () => {
    try {
      console.log('=== ПРОВЕРКА АВТОРИЗАЦИИ (РУКОВОДИТЕЛЬ) ===');
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('Ошибка получения пользователя:', userError);
        router.push('/login');
        return;
      }
      
      console.log('Пользователь ID:', user.id);
      setCurrentUserId(user.id);
      
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, role')
        .eq('id', user.id)
        .single();
      
      if (profileError) {
        console.error('Ошибка получения профиля:', profileError);
        setUserName(user.email?.split('@')[0] || 'Руководитель');
      } else {
        console.log('Профиль:', profile);
        setUserName(profile.full_name || user.email?.split('@')[0] || 'Руководитель');
        
        if (profile.role !== 'manager') {
          console.warn('Пользователь не имеет роли manager');
          setToast({ message: 'У вас нет прав для доступа', type: 'error' });
          setTimeout(() => router.push('/'), 2000);
        }
      }
    } catch (err) {
      console.error('Неожиданная ошибка:', err);
      router.push('/login');
    }
  };

  const fetchObservations = async () => {
    setLoading(true);
    console.log('=== ЗАГРУЗКА НАРУШЕНИЙ ===');
    
    try {
      const { data, error, status } = await supabase
        .from('observations')
        .select('*')
        .order('created_at', { ascending: false });
      
      console.log('Статус запроса:', status);
      console.log('Получено наблюдений:', data?.length || 0);
      
      if (error) throw error;
      
      setObservations(data || []);
      calculateStats(data || []);
      calculateWeeklyTrend(data || []);
      calculateSitesStats(data || []);
    } catch (err) {
      console.error('Ошибка загрузки:', err);
      setToast({ message: 'Ошибка загрузки данных', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .eq('is_active', true)
        .neq('role', 'manager');
      
      if (error) throw error;
      setEmployees(data || []);
      console.log('Загружено сотрудников для назначения:', data?.length || 0);
    } catch (err) {
      console.error('Ошибка загрузки сотрудников:', err);
    }
  };

  const calculateStats = (data: Observation[]) => {
    const total = data.length;
    const pending = data.filter(o => o.status === 'pending').length;
    const inProgress = data.filter(o => o.status === 'in_progress').length;
    const resolved = data.filter(o => o.status === 'resolved').length;
    const danger = data.filter(o => o.type === 'danger').length;
    const behavior = data.filter(o => o.type === 'behavior').length;
    const incident = data.filter(o => o.type === 'incident').length;
    
    setStats({ total, pending, inProgress, resolved, danger, behavior, incident });
  };

  const calculateWeeklyTrend = (data: Observation[]) => {
    const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    const counts = [0, 0, 0, 0, 0, 0, 0];
    
    data.forEach(obs => {
      const date = new Date(obs.date);
      const dayOfWeek = date.getDay();
      const index = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      if (index >= 0 && index < 7) counts[index]++;
    });
    
    setWeeklyTrend(days.map((day, i) => ({ day, count: counts[i] })));
  };

  const calculateSitesStats = (data: Observation[]) => {
    const siteCounts: Record<number, number> = {};
    data.forEach(obs => {
      siteCounts[obs.site_id] = (siteCounts[obs.site_id] || 0) + 1;
    });
    
    const statsData = SITES.map(site => ({
      name: site.name,
      count: siteCounts[site.id] || 0
    })).sort((a, b) => b.count - a.count);
    
    setSitesStats(statsData);
  };

  const applyFilters = () => {
    let filtered = [...observations];
    
    if (typeFilter) {
      filtered = filtered.filter(o => o.type === typeFilter);
    }
    if (siteFilter) {
      filtered = filtered.filter(o => o.site_id.toString() === siteFilter);
    }
    if (statusFilter) {
      filtered = filtered.filter(o => o.status === statusFilter);
    }
    if (dateFrom) {
      filtered = filtered.filter(o => o.date >= dateFrom);
    }
    if (dateTo) {
      filtered = filtered.filter(o => o.date <= dateTo);
    }
    
    setFilteredObservations(filtered);
  };

  const handleAssign = async () => {
    if (!selectedObservation || !selectedAssignee) return;
    
    console.log('=== НАЗНАЧЕНИЕ ОТВЕТСТВЕННОГО ===');
    console.log('Нарушение ID:', selectedObservation.id);
    console.log('Назначаем на:', selectedAssignee);
    
    try {
      const { data, error } = await supabase
        .from('observations')
        .update({ 
          assigned_to: selectedAssignee,
          status: 'in_progress'
        })
        .eq('id', selectedObservation.id)
        .select();
      
      console.log('Результат обновления:', data);
      
      if (error) throw error;
      
      setToast({ message: `Ответственный "${selectedAssignee}" назначен`, type: 'success' });
      fetchObservations();
      setShowAssignModal(false);
      setSelectedObservation(null);
      setSelectedAssignee('');
    } catch (err) {
      console.error('Ошибка назначения:', err);
      setToast({ message: 'Ошибка при назначении', type: 'error' });
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      danger: 'Опасная ситуация',
      behavior: 'Наблюдение',
      incident: 'Происшествие',
    };
    return labels[type] || type;
  };

  const getSiteName = (siteId: number) => {
    return SITES.find(s => s.id === siteId)?.name || 'Не указан';
  };

  const getSeverityLabel = (severity?: string) => {
    const labels: Record<string, string> = {
      low: 'Низкая',
      medium: 'Средняя',
      high: 'Высокая',
      critical: 'Критическая',
    };
    return severity ? labels[severity] : '-';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Ожидает',
      in_progress: 'В работе',
      resolved: 'Завершено',
    };
    return labels[status] || status;
  };

  const totalByType = stats.danger + stats.behavior + stats.incident;
  const dangerPercent = totalByType ? (stats.danger / totalByType) * 100 : 0;
  const behaviorPercent = totalByType ? (stats.behavior / totalByType) * 100 : 0;
  const maxCount = Math.max(...weeklyTrend.map(w => w.count), 1);

  if (loading && observations.length === 0) {
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
          <p style={{ color: '#5a4a6e' }}>Загрузка данных...</p>
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
          <p>Вот что происходит на ваших объектах за последнее время</p>
        </div>

        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statHeader}>
              <span>Всего событий</span>
              <span className={styles.statIcon}>📊</span>
            </div>
            <div className={styles.statValue}>{stats.total}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statHeader}>
              <span>Ожидают назначения</span>
              <span className={styles.statIcon}>⏳</span>
            </div>
            <div className={styles.statValue}>{stats.pending}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statHeader}>
              <span>В работе</span>
              <span className={styles.statIcon}>🔄</span>
            </div>
            <div className={styles.statValue}>{stats.inProgress}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statHeader}>
              <span>Завершено</span>
              <span className={styles.statIcon}>✅</span>
            </div>
            <div className={styles.statValue}>{stats.resolved}</div>
            <div className={styles.statTrend}>
              {stats.total > 0 ? `Выполнено ${Math.round((stats.resolved / stats.total) * 100)}%` : ''}
            </div>
          </div>
        </div>

        <div className={styles.chartsGrid}>
          <div className={styles.chartCard}>
            <div className={styles.chartTitle}>
              <span>📈</span> Распределение по типам
            </div>
            <div 
              className={styles.pieChart} 
              style={{ 
                '--danger-percent': `${dangerPercent}%`,
                '--behavior-percent': `${behaviorPercent}%`
              } as React.CSSProperties}
            />
            <div className={styles.chartLegend}>
              <div className={styles.legendItem}>
                <div className={styles.legendColor} style={{ background: '#f59e0b' }}></div>
                <span>Опасные ситуации ({stats.danger})</span>
              </div>
              <div className={styles.legendItem}>
                <div className={styles.legendColor} style={{ background: '#8b5cf6' }}></div>
                <span>Наблюдения ({stats.behavior})</span>
              </div>
              <div className={styles.legendItem}>
                <div className={styles.legendColor} style={{ background: '#ef4444' }}></div>
                <span>Происшествия ({stats.incident})</span>
              </div>
            </div>
          </div>

          <div className={styles.chartCard}>
            <div className={styles.chartTitle}>
              <span>📊</span> Активность по участкам
            </div>
            <div className={styles.barChart}>
              {sitesStats.slice(0, 4).map(site => {
                const percent = stats.total ? (site.count / stats.total) * 100 : 0;
                return (
                  <div key={site.name} className={styles.barItem}>
                    <div className={styles.barLabel}>{site.name}</div>
                    <div className={styles.barFill}>
                      <div className={styles.barProgress} style={{ width: `${percent}%` }}>
                        {site.count > 0 && site.count}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className={styles.chartCard} style={{ marginBottom: 32 }}>
          <div className={styles.chartTitle}>
            <span>📅</span> Динамика за неделю
          </div>
          <div className={styles.barChart}>
            {weeklyTrend.map(day => (
              <div key={day.day} className={styles.barItem}>
                <div className={styles.barLabel}>{day.day}</div>
                <div className={styles.barFill}>
                  <div 
                    className={styles.barProgress} 
                    style={{ width: `${(day.count / maxCount) * 100}%` }}
                  >
                    {day.count > 0 && day.count}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.quickActions}>
          <div className={styles.actionCard} onClick={() => router.push('/report')}>
            <div className={styles.actionIcon}>➕</div>
            <div className={styles.actionTitle}>Новое сообщение</div>
            <div className={styles.actionDesc}>Зарегистрировать событие</div>
          </div>
          <div className={styles.actionCard} onClick={() => router.push('/dashboard/manager/employees')}>
            <div className={styles.actionIcon}>👥</div>
            <div className={styles.actionTitle}>Управление сотрудниками</div>
            <div className={styles.actionDesc}>Добавить/удалить сотрудников</div>
          </div>
          <div className={styles.actionCard}>
            <div className={styles.actionIcon}>📋</div>
            <div className={styles.actionTitle}>Создать отчет</div>
            <div className={styles.actionDesc}>Экспорт в Excel/PDF</div>
          </div>
        </div>

        <div className={styles.recentEvents}>
          <div className={styles.recentHeader}>
            <h3>🕐 Последние события</h3>
            <span className={styles.viewAll} onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}>
              Показать все →
            </span>
          </div>
          <div className={styles.recentList}>
            {observations.slice(0, 5).map(obs => (
              <div key={obs.id} className={styles.recentItem}>
                <div className={styles.recentIcon} style={{ 
                  background: obs.type === 'danger' ? 'rgba(245,158,11,0.1)' : 
                               obs.type === 'behavior' ? 'rgba(139,92,246,0.1)' : 
                               'rgba(239,68,68,0.1)'
                }}>
                  {obs.type === 'danger' ? '⚠️' : obs.type === 'behavior' ? '👁️' : '🚨'}
                </div>
                <div className={styles.recentContent}>
                  <div className={styles.recentTitle}>
                    {obs.title || obs.description.substring(0, 50)}...
                  </div>
                  <div className={styles.recentMeta}>
                    <span>{getSiteName(obs.site_id)}</span>
                    <span>•</span>
                    <span>{new Date(obs.date).toLocaleDateString('ru-RU')}</span>
                    <span>•</span>
                    <span className={styles.recentBadge} style={{ 
                      background: obs.status === 'pending' ? 'rgba(245,158,11,0.1)' : 
                                   obs.status === 'in_progress' ? 'rgba(139,92,246,0.1)' : 
                                   'rgba(16,185,129,0.1)',
                      color: obs.status === 'pending' ? '#f59e0b' : 
                             obs.status === 'in_progress' ? '#8b5cf6' : 
                             '#10b981'
                    }}>
                      {getStatusLabel(obs.status)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {observations.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px', color: '#7a6a8e' }}>
                Нет зарегистрированных событий
              </div>
            )}
          </div>
        </div>

        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            <label>Тип</label>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="">Все</option>
              <option value="danger">Опасная ситуация</option>
              <option value="behavior">Наблюдение</option>
              <option value="incident">Происшествие</option>
            </select>
          </div>
          <div className={styles.filterGroup}>
            <label>Участок</label>
            <select value={siteFilter} onChange={(e) => setSiteFilter(e.target.value)}>
              <option value="">Все</option>
              {SITES.map(site => (
                <option key={site.id} value={site.id}>{site.name}</option>
              ))}
            </select>
          </div>
          <div className={styles.filterGroup}>
            <label>Статус</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">Все</option>
              <option value="pending">Ожидает</option>
              <option value="in_progress">В работе</option>
              <option value="resolved">Завершено</option>
            </select>
          </div>
          <div className={styles.filterGroup}>
            <label>Дата от</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div className={styles.filterGroup}>
            <label>Дата до</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <button className={styles.resetBtn} onClick={() => {
            setTypeFilter('');
            setSiteFilter('');
            setStatusFilter('');
            setDateFrom('');
            setDateTo('');
          }}>
            Сбросить
          </button>
        </div>

        <div className={styles.exportBar}>
          <button className={styles.exportBtn}>📊 Экспорт Excel</button>
          <button className={styles.exportBtn}>📄 Экспорт PDF</button>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Дата</th>
                <th>Тип</th>
                <th>Описание</th>
                <th>Участок</th>
                <th>Серьёзность</th>
                <th>Статус</th>
                <th>Сотрудник</th>
                <th>Ответственный</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredObservations.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: '#7a6a8e' }}>
                    {observations.length === 0 ? 'Нет зарегистрированных событий' : 'Нет данных по фильтрам'}
                  </td>
                </tr>
              ) : (
                filteredObservations.map(obs => (
                  <tr key={obs.id}>
                    <td>{new Date(obs.date).toLocaleDateString('ru-RU')}</td>
                    <td>
                      <span className={`${styles.typeBadge} ${styles[`type${obs.type.charAt(0).toUpperCase() + obs.type.slice(1)}`]}`}>
                        {getTypeLabel(obs.type)}
                      </span>
                    </td>
                    <td style={{ maxWidth: 300 }}>
                      {obs.title || obs.description.substring(0, 50)}...
                    </td>
                    <td>{getSiteName(obs.site_id)}</td>
                    <td>{getSeverityLabel(obs.severity)}</td>
                    <td>
                      <span className={`${styles.statusBadge} ${styles[`status${obs.status === 'pending' ? 'Pending' : obs.status === 'in_progress' ? 'InProgress' : 'Resolved'}`]}`}>
                        {getStatusLabel(obs.status)}
                      </span>
                    </td>
                    <td>{obs.user_name}</td>
                    <td>{obs.assigned_to || '—'}</td>
                    <td>
                      {obs.status === 'pending' && (
                        <button 
                          className={styles.assignBtn}
                          onClick={() => {
                            setSelectedObservation(obs);
                            setShowAssignModal(true);
                          }}
                        >
                          Назначить
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAssignModal && (
        <div className={styles.modalOverlay} onClick={() => setShowAssignModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3>Назначить ответственного</h3>
            <p>Выберите сотрудника для выполнения задачи</p>
            <select value={selectedAssignee} onChange={(e) => setSelectedAssignee(e.target.value)}>
              <option value="">Выберите сотрудника</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.full_name}>{emp.full_name} ({emp.role === 'responsible' ? 'Ответственный' : 'Сотрудник'})</option>
              ))}
            </select>
            <div className={styles.modalActions}>
              <button className={styles.modalCancel} onClick={() => setShowAssignModal(false)}>
                Отмена
              </button>
              <button className={styles.modalConfirm} onClick={handleAssign} disabled={!selectedAssignee}>
                Назначить
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`${styles.toast} ${toast.type === 'success' ? styles.toastSuccess : styles.toastError}`}>
          <span>{toast.type === 'success' ? '✅' : '❌'}</span>
          <span>{toast.message}</span>
        </div>
      )}
    </main>
  );
}