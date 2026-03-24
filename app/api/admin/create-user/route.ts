import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, full_name, position, area, department, personnel_number, phone, role } = body;
    
    console.log('Creating user:', { email, full_name, position, area, role });
    
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // 1. Проверяем, существует ли уже пользователь с таким email
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('List users error:', listError);
      return NextResponse.json({ error: listError.message }, { status: 400 });
    }
    
    const existingUser = existingUsers.users.find(user => user.email === email);
    
    let userId: string;
    let isNew = false;
    
    if (existingUser) {
      // Пользователь уже существует, используем его ID
      console.log('User already exists:', existingUser.id);
      userId = existingUser.id;
      
      // Обновляем метаданные
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: {
          full_name,
          role,
        },
      });
    } else {
      // Создаём нового пользователя
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name,
          role,
        },
      });
      
      if (authError) {
        console.error('Auth error:', authError);
        return NextResponse.json({ error: authError.message }, { status: 400 });
      }
      
      userId = authData.user.id;
      isNew = true;
      console.log('New user created:', userId);
    }
    
    // 2. Проверяем, существует ли профиль
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();
    
    let profileError;
    
    if (existingProfile) {
      // Обновляем существующий профиль
      console.log('Updating existing profile:', userId);
      const { error } = await supabaseAdmin
        .from('profiles')
        .update({
          full_name,
          position,
          area,
          department: department || null,
          personnel_number: personnel_number || null,
          phone: phone || null,
          role,
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);
      
      profileError = error;
    } else {
      // Создаём новый профиль
      console.log('Creating new profile:', userId);
      const { error } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: userId,
          email,
          full_name,
          position,
          area,
          department: department || null,
          personnel_number: personnel_number || null,
          phone: phone || null,
          role,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      
      profileError = error;
    }
    
    if (profileError) {
      console.error('Profile error:', profileError);
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }
    
    return NextResponse.json({ 
      success: true, 
      user: { id: userId, email },
      isNew 
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}