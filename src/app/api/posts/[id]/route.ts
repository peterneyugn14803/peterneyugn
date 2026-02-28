import { NextResponse } from 'next/server';
import { supabase } from '../../../../../../lib/supabaseClient';

type PostRouteContext = {
  params: { id: string };
};

type UpdatePostPayload = {
  title?: string;
  content?: string | null;
};

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function validateUpdatePayload(payload: unknown): {
  valid: boolean;
  data?: UpdatePostPayload;
  error?: string;
} {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object.' };
  }

  const body = payload as Record<string, unknown>;

  if (body.title === undefined && body.content === undefined) {
    return {
      valid: false,
      error: 'At least one field is required: "title" or "content".',
    };
  }

  const updates: UpdatePostPayload = {};

  if (body.title !== undefined) {
    if (typeof body.title !== 'string' || body.title.trim().length === 0) {
      return { valid: false, error: '"title" must be a non-empty string when provided.' };
    }

    updates.title = body.title.trim();
  }

  if (body.content !== undefined) {
    if (body.content !== null && typeof body.content !== 'string') {
      return { valid: false, error: '"content" must be a string or null when provided.' };
    }

    updates.content = body.content as string | null;
  }

  return { valid: true, data: updates };
}

function invalidIdResponse() {
  return NextResponse.json({ error: 'Invalid post id. Expected UUID.' }, { status: 400 });
}

export async function GET(_request: Request, context: PostRouteContext) {
  const { id } = context.params;

  if (!isUuid(id)) {
    return invalidIdResponse();
  }

  const { data, error } = await supabase.from('posts').select('*').eq('id', id).maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: 'Post not found.' }, { status: 404 });
  }

  return NextResponse.json({ data }, { status: 200 });
}

export async function PUT(request: Request, context: PostRouteContext) {
  const { id } = context.params;

  if (!isUuid(id)) {
    return invalidIdResponse();
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const validation = validateUpdatePayload(payload);

  if (!validation.valid || !validation.data) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('posts')
    .update(validation.data)
    .eq('id', id)
    .select('*')
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: 'Post not found.' }, { status: 404 });
  }

  return NextResponse.json({ data }, { status: 200 });
}

export async function DELETE(_request: Request, context: PostRouteContext) {
  const { id } = context.params;

  if (!isUuid(id)) {
    return invalidIdResponse();
  }

  const { data, error } = await supabase
    .from('posts')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: 'Post not found.' }, { status: 404 });
  }

  return new NextResponse(null, { status: 204 });
}
