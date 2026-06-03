import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('quizzes')
    .select('*, quiz_questions(*), quiz_submissions(count)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { title, description, button_color, button_text_color, button_animation, thank_you_url, questions } = body

  const { data: quiz, error: quizError } = await supabase
    .from('quizzes')
    .insert({ title, description, button_color, button_text_color, button_animation, thank_you_url, user_id: user.id })
    .select()
    .single()

  if (quizError) return NextResponse.json({ error: quizError.message }, { status: 500 })

  if (questions?.length > 0) {
    const { error: qError } = await supabase
      .from('quiz_questions')
      .insert(questions.map((q: any, i: number) => ({ ...q, quiz_id: quiz.id, order_num: i + 1 })))
    if (qError) return NextResponse.json({ error: qError.message }, { status: 500 })
  }

  return NextResponse.json(quiz)
}

export async function PUT(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { id, title, description, button_color, button_text_color, button_animation, thank_you_url, questions } = body

  const { error: quizError } = await supabase
    .from('quizzes')
    .update({ title, description, button_color, button_text_color, button_animation, thank_you_url })
    .eq('id', id)
    .eq('user_id', user.id)

  if (quizError) return NextResponse.json({ error: quizError.message }, { status: 500 })

  // Удаляем старые вопросы и вставляем новые
  await supabase.from('quiz_questions').delete().eq('quiz_id', id)

  if (questions?.length > 0) {
    await supabase.from('quiz_questions')
      .insert(questions.map((q: any, i: number) => ({ ...q, quiz_id: id, order_num: i + 1 })))
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  const { error } = await supabase.from('quizzes').delete().eq('id', id).eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
