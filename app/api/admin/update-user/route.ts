import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, full_name, position, area, department, personnel_number, phone, role, is_active } = body;
    
    console.log('Updating user:', { id, full_name, position, area, role, is_active });
    
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const updateData: any = { updated_at: new Date().toISOString() };
    if (full_name !== undefined) updateData.full_name = full_name;
    if (position !== undefined) updateData.position = position;
    if (area !== undefined) updateData.area = area;
    if (department !== undefined) updateData.department = department;
    if (personnel_number !== undefined) updateData.personnel_number = personnel_number;
    if (phone !== undefined) updateData.phone = phone;
    if (role !== undefined) updateData.role = role;
    if (is_active !== undefined) updateData.is_active = is_active;
    
    const { error } = await supabaseAdmin
      .from('profiles')
      .update(updateData)
      .eq('id', id);
    
    if (error) {
      console.error('Update error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    // Если обновляем роль или активность, обновляем метаданные в Auth
    if (role !== undefined || is_active !== undefined) {
      const authUpdateData: any = {};
      if (role !== undefined) {
        authUpdateData.user_metadata = { role };
      }
      
      await supabaseAdmin.auth.admin.updateUserById(id, authUpdateData);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}