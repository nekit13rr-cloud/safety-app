import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || '';
    const siteId = searchParams.get('site') || '';
    const status = searchParams.get('status') || '';
    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo = searchParams.get('dateTo') || '';

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Загружаем данные
    let query = supabaseAdmin
      .from('observations')
      .select('*')
      .order('created_at', { ascending: false });

    if (type) query = query.eq('type', type);
    if (siteId) query = query.eq('site_id', parseInt(siteId));
    if (status) query = query.eq('status', status);
    if (dateFrom) query = query.gte('date', dateFrom);
    if (dateTo) query = query.lte('date', dateTo);

    const { data, error } = await query;

    if (error) throw error;

    // Форматируем данные для Excel
    const formattedData = data.map(item => ({
      'Дата': new Date(item.date).toLocaleDateString('ru-RU'),
      'Тип': item.type === 'danger' ? 'Опасная ситуация' : item.type === 'behavior' ? 'Наблюдение' : 'Происшествие',
      'Название': item.title || item.description.substring(0, 100),
      'Описание': item.description,
      'Участок': getSiteName(item.site_id),
      'Серьёзность': item.severity ? getSeverityLabel(item.severity) : '-',
      'Статус': item.status === 'pending' ? 'Ожидает' : item.status === 'in_progress' ? 'В работе' : 'Завершено',
      'Сотрудник': item.user_name,
      'Ответственный': item.assigned_to || '—',
      'Дата создания': new Date(item.created_at).toLocaleDateString('ru-RU'),
    }));

    // Создаём Excel файл
    const ws = XLSX.utils.json_to_sheet(formattedData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Нарушения');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Возвращаем файл
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="observations_${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Ошибка экспорта' }, { status: 500 });
  }
}

// Вспомогательные функции
function getSiteName(siteId: number) {
  const sites: Record<number, string> = {
    1: 'Цех №1 (Сборка)',
    2: 'Цех №2 (Сварка)',
    3: 'Склад ГСМ',
    4: 'Территория завода',
    5: 'Административное здание',
    6: 'Лаборатория',
  };
  return sites[siteId] || 'Не указан';
}

function getSeverityLabel(severity: string) {
  const labels: Record<string, string> = {
    low: 'Низкая',
    medium: 'Средняя',
    high: 'Высокая',
    critical: 'Критическая',
  };
  return labels[severity] || severity;
}