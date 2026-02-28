import { NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabaseClient';

type CreatePostPayload = {
  title: string;
  content?: string | null;
  profile_id: string;
};

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function validateCreatePostPayload(payload: unknown): {
  valid: boolean;
  data?: CreatePostPayload;
  error?: string;
} {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object.' };
  }

  const body = payload as Record<string, unknown>;

  if (typeof body.title !== 'string' || body.title.trim().length === 0) {
    return { valid: false, error: '"title" is required and must be a non-empty string.' };
  }

  if (typeof body.profile_id !== 'string' || !isUuid(body.profile_id)) {
    return { valid: false, error: '"profile_id" is required and must be a valid UUID.' };
  }

  if (
    body.content !== undefined &&
    body.content !== null &&
    typeof body.content !== 'string'
  ) {
    return { valid: false, error: '"content" must be a string or null when provided.' };
  }

  return {
    valid: true,
    data: {
      title: body.title.trim(),
      content: body.content === undefined ? null : (body.content as string | null),
      profile_id: body.profile_id,
    },
  };
}

export async function GET() {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 200 });
}

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const validation = validateCreatePostPayload(payload);

  if (!validation.valid || !validation.data) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('posts')
    .insert(validation.data)
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
