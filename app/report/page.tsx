'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import styles from './report.module.css';

export default function ReportPage() {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const fullName = user.user_metadata?.full_name || 
                         user.user_metadata?.name ||
                         user.email?.split('@')[0] || 
                         'Сотрудник';
        setUserName(fullName);
        setUserEmail(user.email || '');
        setLoading(false);
      } else {
        router.push('/login');
      }
    };
    
    getUser();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const getInitials = () => {
    return userName
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const cards = [
    {
      id: 'danger',
      title: 'Опасная ситуация',
      description: 'Сообщите о потенциально опасной ситуации, которая может привести к травмам или ущербу.',
      icon: '⚠️',
      path: '/report/danger',
      color: 'danger',
    },
    {
      id: 'behavior',
      title: 'Наблюдение за поведением',
      description: 'Зафиксируйте наблюдение за безопасным или небезопасным поведением сотрудников.',
      icon: '👁️',
      path: '/report/behavior',
      color: 'behavior',
    },
    {
      id: 'incident',
      title: 'Происшествие',
      description: 'Зарегистрируйте происшествие, несчастный случай или инцидент на производстве.',
      icon: '🚨',
      path: '/report/incident',
      color: 'incident',
    },
  ];

  if (loading) {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
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
            <p style={{ color: '#5a4a6e' }}>Загрузка...</p>
          </div>
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
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>О чём вы хотите сообщить?</h1>
          <p>Выберите тип события для регистрации</p>
        </div>

        <div className={styles.cardsGrid}>
          {cards.map((card) => (
            <div
              key={card.id}
              className={styles.card}
              onClick={() => router.push(card.path)}
            >
              <div className={`${styles.cardIcon} ${styles[`${card.color}Icon`]}`}>
                {card.icon}
              </div>
              <h2>{card.title}</h2>
              <p>{card.description}</p>
              <div className={`${styles.cardButton} ${styles[`${card.color}Button`]}`}>
                Заполнить →
              </div>
            </div>
          ))}
        </div>

        <div className={styles.userCard}>
          <div className={styles.userInfo}>
            <div className={styles.userAvatar}>
              {getInitials()}
            </div>
            <div className={styles.userDetails}>
              <h3>{userName}</h3>
              <p>{userEmail}</p>
            </div>
          </div>
          <button onClick={handleLogout} className={styles.logoutBtn}>
            Выйти
          </button>
        </div>
      </div>
    </main>
  );
}