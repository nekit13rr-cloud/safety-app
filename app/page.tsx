'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role === 'manager') {
        router.push('/dashboard/manager');
      } else if (profile?.role === 'responsible') {
        router.push('/dashboard/responsible');
      } else {
        router.push('/report');
      }
    };
    
    checkUser();
  }, [router]);

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #f5f0ff 0%, #e9e2ff 100%)'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ 
          width: 48, 
          height: 48, 
          border: '3px solid rgba(139, 92, 246, 0.2)', 
          borderTopColor: '#8b5cf6', 
          borderRadius: '50%', 
          animation: 'spin 1s linear infinite',
          margin: '0 auto 20px'
        }} />
        <p style={{ color: '#6b4b89' }}>Загрузка...</p>
        <style jsx>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}