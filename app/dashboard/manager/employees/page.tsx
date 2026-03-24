'use client';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import styles from './employees.module.css';

type Employee = {
  id: string;
  email: string;
  full_name: string;
  position: string;
  area: string;
  department?: string;
  personnel_number?: string;
  phone?: string;
  role: 'manager' | 'responsible' | 'employee';
  is_active: boolean;
  created_at: string;
};

const AREAS = [
  { id: 'Цех №1', name: 'Цех №1 (Сборка)' },
  { id: 'Цех №2', name: 'Цех №2 (Сварка)' },
  { id: 'Склад ГСМ', name: 'Склад ГСМ' },
  { id: 'Территория завода', name: 'Территория завода' },
  { id: 'Административное здание', name: 'Административное здание' },
  { id: 'Лаборатория', name: 'Лаборатория' },
];

export default function EmployeesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [userName, setUserName] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [areaFilter, setAreaFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    position: '',
    area: '',
    department: '',
    personnel_number: '',
    phone: '',
    role: 'employee' as 'manager' | 'responsible' | 'employee',
    password: '',
  });
  
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (currentUserId) {
      fetchEmployees();
    }
  }, [currentUserId]);

  useEffect(() => {
    applyFilters();
  }, [employees, searchQuery, roleFilter, areaFilter, statusFilter]);

  const checkAuth = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        router.push('/login');
        return;
      }
      
      setCurrentUserId(user.id);
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, role')
        .eq('id', user.id)
        .single();
      
      setUserName(profile?.full_name || user.email?.split('@')[0] || 'Пользователь');
      
      if (profile?.role !== 'manager') {
        setToast({ message: 'У вас нет прав для управления сотрудниками', type: 'error' });
        setTimeout(() => router.push('/dashboard/manager'), 2000);
      }
    } catch (err) {
      console.error('Ошибка:', err);
      router.push('/login');
    }
  };

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/get-employees');
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Ошибка загрузки');
      }
      
      setEmployees(result.data || []);
    } catch (err) {
      console.error('Ошибка:', err);
      setToast({ message: err instanceof Error ? err.message : 'Ошибка загрузки', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...employees];
    
    if (searchQuery) {
      filtered = filtered.filter(emp => 
        emp.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (emp.email && emp.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (emp.personnel_number && emp.personnel_number.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    if (roleFilter) {
      filtered = filtered.filter(emp => emp.role === roleFilter);
    }
    if (areaFilter) {
      filtered = filtered.filter(emp => emp.area === areaFilter);
    }
    if (statusFilter) {
      const isActive = statusFilter === 'active';
      filtered = filtered.filter(emp => emp.is_active === isActive);
    }
    
    setFilteredEmployees(filtered);
  };

  const handleAddEmployee = async () => {
    if (!formData.email || !formData.full_name || !formData.position || !formData.area || !formData.password) {
      setToast({ message: 'Заполните все обязательные поля', type: 'error' });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          full_name: formData.full_name,
          position: formData.position,
          area: formData.area,
          department: formData.department,
          personnel_number: formData.personnel_number,
          phone: formData.phone,
          role: formData.role,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Ошибка при добавлении');
      }

      setToast({ 
        message: result.isNew ? 'Сотрудник успешно добавлен' : 'Сотрудник уже существует, данные обновлены', 
        type: 'success' 
      });
      setShowAddModal(false);
      setFormData({
        email: '',
        full_name: '',
        position: '',
        area: '',
        department: '',
        personnel_number: '',
        phone: '',
        role: 'employee',
        password: '',
      });
      fetchEmployees();
    } catch (err) {
      console.error('Ошибка:', err);
      setToast({ message: err instanceof Error ? err.message : 'Ошибка при добавлении сотрудника', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleEditEmployee = async () => {
    if (!selectedEmployee) return;

    setLoading(true);

    try {
      const response = await fetch('/api/admin/update-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedEmployee.id,
          full_name: formData.full_name,
          position: formData.position,
          area: formData.area,
          department: formData.department,
          personnel_number: formData.personnel_number,
          phone: formData.phone,
          role: formData.role,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Ошибка при обновлении');
      }

      setToast({ message: 'Данные обновлены', type: 'success' });
      setShowEditModal(false);
      setSelectedEmployee(null);
      fetchEmployees();
    } catch (err) {
      console.error('Ошибка:', err);
      setToast({ message: err instanceof Error ? err.message : 'Ошибка при обновлении', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivateEmployee = async (employee: Employee) => {
    try {
      const response = await fetch('/api/admin/update-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: employee.id,
          is_active: false,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Ошибка при деактивации');
      }

      setToast({ message: `Сотрудник ${employee.full_name} деактивирован`, type: 'success' });
      fetchEmployees();
    } catch (err) {
      console.error('Ошибка:', err);
      setToast({ message: err instanceof Error ? err.message : 'Ошибка при деактивации', type: 'error' });
    }
  };

  const handleActivateEmployee = async (employee: Employee) => {
    try {
      const response = await fetch('/api/admin/update-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: employee.id,
          is_active: true,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Ошибка при активации');
      }

      setToast({ message: `Сотрудник ${employee.full_name} активирован`, type: 'success' });
      fetchEmployees();
    } catch (err) {
      console.error('Ошибка:', err);
      setToast({ message: err instanceof Error ? err.message : 'Ошибка при активации', type: 'error' });
    }
  };

  const openEditModal = (employee: Employee) => {
    setSelectedEmployee(employee);
    setFormData({
      email: employee.email || '',
      full_name: employee.full_name,
      position: employee.position,
      area: employee.area,
      department: employee.department || '',
      personnel_number: employee.personnel_number || '',
      phone: employee.phone || '',
      role: employee.role,
      password: '',
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (employee: Employee) => {
    setSelectedEmployee(employee);
    setShowDeleteModal(true);
  };

  const getRoleLabel = (role: string) => {
    const labels = {
      manager: 'Руководитель',
      responsible: 'Ответственный',
      employee: 'Сотрудник',
    };
    return labels[role as keyof typeof labels] || role;
  };

  const getAreaName = (area: string) => {
    return AREAS.find(a => a.id === area)?.name || area;
  };

  const getStats = () => {
    const total = employees.length;
    const active = employees.filter(e => e.is_active).length;
    const managers = employees.filter(e => e.role === 'manager').length;
    const responsible = employees.filter(e => e.role === 'responsible').length;
    return { total, active, managers, responsible };
  };

  const stats = getStats();

  if (loading && employees.length === 0) {
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
          <p style={{ color: '#5a4a6e' }}>Загрузка сотрудников...</p>
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
        <button className={styles.backBtn} onClick={() => router.push('/dashboard/manager')}>
          ← Назад к дашборду
        </button>

        <div className={styles.pageHeader}>
          <div>
            <h2>Управление сотрудниками</h2>
            <p>Добавление, редактирование и управление сотрудниками</p>
          </div>
          <button className={styles.addBtn} onClick={() => setShowAddModal(true)}>
            + Добавить сотрудника
          </button>
        </div>

        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <h4>Всего сотрудников</h4>
            <div className={styles.statValue}>{stats.total}</div>
          </div>
          <div className={styles.statCard}>
            <h4>Активных</h4>
            <div className={styles.statValue}>{stats.active}</div>
            <div className={styles.statSub}>{stats.total ? Math.round((stats.active / stats.total) * 100) : 0}% от общего числа</div>
          </div>
          <div className={styles.statCard}>
            <h4>Руководителей</h4>
            <div className={styles.statValue}>{stats.managers}</div>
          </div>
          <div className={styles.statCard}>
            <h4>Ответственных</h4>
            <div className={styles.statValue}>{stats.responsible}</div>
          </div>
        </div>

        <div className={styles.searchBar}>
          <div className={styles.searchInput}>
            <label>Поиск</label>
            <input
              type="text"
              placeholder="Имя, email или табельный номер..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className={styles.searchInput}>
            <label>Роль</label>
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
              <option value="">Все</option>
              <option value="manager">Руководитель</option>
              <option value="responsible">Ответственный</option>
              <option value="employee">Сотрудник</option>
            </select>
          </div>
          <div className={styles.searchInput}>
            <label>Участок</label>
            <select value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)}>
              <option value="">Все</option>
              {AREAS.map(area => (
                <option key={area.id} value={area.id}>{area.name}</option>
              ))}
            </select>
          </div>
          <div className={styles.searchInput}>
            <label>Статус</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">Все</option>
              <option value="active">Активен</option>
              <option value="inactive">Неактивен</option>
            </select>
          </div>
          <button className={styles.resetBtn} onClick={() => {
            setSearchQuery('');
            setRoleFilter('');
            setAreaFilter('');
            setStatusFilter('');
          }}>
            Сбросить
          </button>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Сотрудник</th>
                <th>Должность</th>
                <th>Участок</th>
                <th>Табельный номер</th>
                <th>Роль</th>
                <th>Статус</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#7a6a8e' }}>
                    Сотрудники не найдены
                  </td>
                </tr>
              ) : (
                filteredEmployees.map(emp => (
                  <tr key={emp.id}>
                    <td style={{ fontWeight: 500 }}>
                      <div>{emp.full_name}</div>
                      <div style={{ fontSize: 12, color: '#7a6a8e' }}>{emp.email}</div>
                    </td>
                    <td>{emp.position}</td>
                    <td>{getAreaName(emp.area)}</td>
                    <td>{emp.personnel_number || '—'}</td>
                    <td>
                      <span className={`${styles.roleBadge} ${styles[`role${emp.role === 'manager' ? 'Manager' : emp.role === 'responsible' ? 'Responsible' : 'Employee'}`]}`}>
                        {getRoleLabel(emp.role)}
                      </span>
                    </td>
                    <td>
                      <span className={emp.is_active ? styles.statusActive : styles.statusInactive}>
                        {emp.is_active ? '● Активен' : '● Неактивен'}
                      </span>
                    </td>
                    <td>
                      <button
                        className={`${styles.actionBtn} ${styles.editBtn}`}
                        onClick={() => openEditModal(emp)}
                        title="Редактировать"
                      >
                        ✏️
                      </button>
                      {emp.is_active ? (
                        <button
                          className={`${styles.actionBtn} ${styles.deleteBtn}`}
                          onClick={() => openDeleteModal(emp)}
                          title="Деактивировать"
                        >
                          🗑️
                        </button>
                      ) : (
                        <button
                          className={`${styles.actionBtn} ${styles.editBtn}`}
                          onClick={() => handleActivateEmployee(emp)}
                          title="Активировать"
                          style={{ color: '#10b981' }}
                        >
                          🔄
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

      {/* Модалка добавления */}
      {showAddModal && (
        <div className={styles.modalOverlay} onClick={() => setShowAddModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3>Добавить сотрудника</h3>
            <p>Заполните данные нового сотрудника</p>
            
            <div className={styles.formGroup}>
              <label>Email *</label>
              <input
                type="email"
                placeholder="ivanov@company.ru"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            
            <div className={styles.formGroup}>
              <label>Пароль *</label>
              <input
                type="password"
                placeholder="Введите пароль"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
            
            <div className={styles.formGroup}>
              <label>ФИО *</label>
              <input
                type="text"
                placeholder="Иванов Иван Иванович"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              />
            </div>
            
            <div className={styles.formGroup}>
              <label>Должность *</label>
              <input
                type="text"
                placeholder="Инженер, мастер, оператор..."
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
              />
            </div>
            
            <div className={styles.formGroup}>
              <label>Участок *</label>
              <select
                value={formData.area}
                onChange={(e) => setFormData({ ...formData, area: e.target.value })}
              >
                <option value="">Выберите участок</option>
                {AREAS.map(area => (
                  <option key={area.id} value={area.id}>{area.name}</option>
                ))}
              </select>
            </div>
            
            <div className={styles.formGroup}>
              <label>Отдел</label>
              <input
                type="text"
                placeholder="Например: Отдел безопасности"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              />
            </div>
            
            <div className={styles.formGroup}>
              <label>Табельный номер</label>
              <input
                type="text"
                placeholder="12345"
                value={formData.personnel_number}
                onChange={(e) => setFormData({ ...formData, personnel_number: e.target.value })}
              />
            </div>
            
            <div className={styles.formGroup}>
              <label>Телефон</label>
              <input
                type="tel"
                placeholder="+7 (999) 123-45-67"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            
            <div className={styles.formGroup}>
              <label>Роль</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
              >
                <option value="employee">Сотрудник</option>
                <option value="responsible">Ответственный</option>
                <option value="manager">Руководитель</option>
              </select>
            </div>
            
            <div className={styles.modalActions}>
              <button className={styles.modalCancel} onClick={() => setShowAddModal(false)}>
                Отмена
              </button>
              <button className={styles.modalConfirm} onClick={handleAddEmployee} disabled={loading}>
                {loading ? 'Добавление...' : 'Добавить'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модалка редактирования */}
      {showEditModal && selectedEmployee && (
        <div className={styles.modalOverlay} onClick={() => setShowEditModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3>Редактировать сотрудника</h3>
            <p>Измените данные сотрудника</p>
            
            <div className={styles.formGroup}>
              <label>Email</label>
              <input type="email" value={formData.email} disabled />
            </div>
            
            <div className={styles.formGroup}>
              <label>ФИО *</label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              />
            </div>
            
            <div className={styles.formGroup}>
              <label>Должность *</label>
              <input
                type="text"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
              />
            </div>
            
            <div className={styles.formGroup}>
              <label>Участок *</label>
              <select
                value={formData.area}
                onChange={(e) => setFormData({ ...formData, area: e.target.value })}
              >
                {AREAS.map(area => (
                  <option key={area.id} value={area.id}>{area.name}</option>
                ))}
              </select>
            </div>
            
            <div className={styles.formGroup}>
              <label>Отдел</label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              />
            </div>
            
            <div className={styles.formGroup}>
              <label>Табельный номер</label>
              <input
                type="text"
                value={formData.personnel_number}
                onChange={(e) => setFormData({ ...formData, personnel_number: e.target.value })}
              />
            </div>
            
            <div className={styles.formGroup}>
              <label>Телефон</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            
            <div className={styles.formGroup}>
              <label>Роль</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
              >
                <option value="employee">Сотрудник</option>
                <option value="responsible">Ответственный</option>
                <option value="manager">Руководитель</option>
              </select>
            </div>
            
            <div className={styles.modalActions}>
              <button className={styles.modalCancel} onClick={() => setShowEditModal(false)}>
                Отмена
              </button>
              <button className={styles.modalConfirm} onClick={handleEditEmployee} disabled={loading}>
                {loading ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модалка деактивации */}
      {showDeleteModal && selectedEmployee && (
        <div className={styles.modalOverlay} onClick={() => setShowDeleteModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3>Деактивировать сотрудника</h3>
            <p>
              Вы уверены, что хотите деактивировать <strong>{selectedEmployee.full_name}</strong>?
              Сотрудник потеряет доступ к системе.
            </p>
            <div className={styles.modalActions}>
              <button className={styles.modalCancel} onClick={() => setShowDeleteModal(false)}>
                Отмена
              </button>
              <button 
                className={`${styles.modalConfirm} ${styles.modalConfirmDanger}`} 
                onClick={() => {
                  handleDeactivateEmployee(selectedEmployee);
                  setShowDeleteModal(false);
                  setSelectedEmployee(null);
                }}
                disabled={loading}
              >
                {loading ? 'Деактивация...' : 'Деактивировать'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast уведомление */}
      {toast && (
        <div className={`${styles.toast} ${toast.type === 'success' ? styles.toastSuccess : styles.toastError}`}>
          <span>{toast.type === 'success' ? '✅' : '❌'}</span>
          <span>{toast.message}</span>
        </div>
      )}
    </main>
  );
}