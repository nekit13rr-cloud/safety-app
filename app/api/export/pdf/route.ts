import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

    // Создаём PDF
    const doc = new jsPDF({ orientation: 'landscape' });

    doc.setFontSize(18);
    doc.text('Отчёт по нарушениям', 14, 22);

    doc.setFontSize(10);
    doc.text(`Дата формирования: ${new Date().toLocaleString('ru-RU')}`, 14, 30);
    doc.text(`Всего записей: ${data.length}`, 14, 36);

    // Форматируем данные для таблицы
    const tableData = data.map(item => [
      new Date(item.date).toLocaleDateString('ru-RU'),
      item.type === 'danger' ? 'Опасная ситуация' : item.type === 'behavior' ? 'Наблюдение' : 'Происшествие',
      (item.title || item.description.substring(0, 50)) + '...',
      getSiteName(item.site_id),
      item.severity ? getSeverityLabel(item.severity) : '-',
      item.status === 'pending' ? 'Ожидает' : item.status === 'in_progress' ? 'В работе' : 'Завершено',
      item.user_name,
      item.assigned_to || '—',
    ]);

    autoTable(doc, {
      head: [['Дата', 'Тип', 'Описание', 'Участок', 'Серьёзность', 'Статус', 'Сотрудник', 'Ответственный']],
      body: tableData,
      startY: 44,
      theme: 'striped',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [139, 92, 246], textColor: 255 },
    });

    const pdfBuffer = doc.output('arraybuffer');

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="observations_${new Date().toISOString().split('T')[0]}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Ошибка экспорта' }, { status: 500 });
  }
}

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