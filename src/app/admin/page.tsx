'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

type Post = {
  id: string;
  title: string;
  content: string | null;
  media_id: string | null;
  profile_id: string;
  created_at: string;
};

type MediaItem = {
  id: string;
  kind: 'image' | 'video';
  url: string;
};

type ParsedContent = {
  body: string;
  published: boolean;
  media: MediaItem[];
};

const defaultProfileId = '00000000-0000-4000-8000-000000000001';

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function parsePostContent(raw: string | null): ParsedContent {
  if (!raw) {
    return { body: '', published: false, media: [] };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<ParsedContent>;
    const media = Array.isArray(parsed.media)
      ? parsed.media
          .filter((item): item is MediaItem => {
            return Boolean(
              item &&
                typeof item === 'object' &&
                typeof item.id === 'string' &&
                (item.kind === 'image' || item.kind === 'video') &&
                typeof item.url === 'string',
            );
          })
          .map((item) => ({ ...item, url: item.url.trim() }))
      : [];

    return {
      body: typeof parsed.body === 'string' ? parsed.body : '',
      published: Boolean(parsed.published),
      media,
    };
  } catch {
    return { body: raw, published: false, media: [] };
  }
}

function serializeContent(data: { body: string; published: boolean; media: MediaItem[] }) {
  return JSON.stringify({
    body: data.body,
    published: data.published,
    media: data.media.filter((item) => item.url.trim().length > 0),
  });
}

export default function AdminDashboardPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [published, setPublished] = useState(false);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [profileId, setProfileId] = useState(defaultProfileId);
  const [submitting, setSubmitting] = useState(false);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/posts', { cache: 'no-store' });

      if (!response.ok) {
        throw new Error('Unable to load posts.');
      }

      const payload = (await response.json()) as { data?: Post[] };
      setPosts(payload.data ?? []);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unexpected error.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);
  function startCreate() {
    setSelectedPostId(null);
    setTitle('');
    setBody('');
    setPublished(false);
    setMediaItems([]);
  }

  function startEdit(post: Post) {
    const parsed = parsePostContent(post.content);
    setSelectedPostId(post.id);
    setTitle(post.title);
    setBody(parsed.body);
    setPublished(parsed.published);
    setMediaItems(parsed.media);
    setProfileId(post.profile_id);
  }

  function addMedia(kind: 'image' | 'video') {
    setMediaItems((items) => [...items, { id: uid(), kind, url: '' }]);
  }

  function updateMedia(id: string, updates: Partial<MediaItem>) {
    setMediaItems((items) => items.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  }

  function removeMedia(id: string) {
    setMediaItems((items) => items.filter((item) => item.id !== id));
  }

  function reorderMedia(fromIndex: number, toIndex: number) {
    setMediaItems((items) => {
      const next = [...items];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload = {
      title,
      profile_id: profileId,
      content: serializeContent({ body, published, media: mediaItems }),
    };

    const url = selectedPostId ? `/api/posts/${selectedPostId}` : '/api/posts';
    const method = selectedPostId ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const responsePayload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(responsePayload.error ?? 'Unable to save post.');
      }

      await loadPosts();
      if (!selectedPostId) {
        startCreate();
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unexpected error.');
    } finally {
      setSubmitting(false);
    }
  }

  const selectedPost = useMemo(
    () => posts.find((post) => post.id === selectedPostId) ?? null,
    [posts, selectedPostId],
  );

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 md:px-8">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1.1fr_1fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h1 className="text-xl font-bold text-slate-900">Admin Dashboard</h1>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={loadPosts}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700"
              >
                {loading ? 'Loading...' : 'Refresh'}
              </button>
              <button
                type="button"
                onClick={startCreate}
                className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
              >
                New Post
              </button>
            </div>
          </div>

          {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <div className="space-y-3">
            {posts.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                No posts loaded. Click Refresh to fetch data.
              </p>
            ) : (
              posts.map((post) => {
                const parsed = parsePostContent(post.content);

                return (
                  <button
                    key={post.id}
                    type="button"
                    onClick={() => startEdit(post)}
                    className={`w-full rounded-xl border p-4 text-left transition ${
                      selectedPostId === post.id
                        ? 'border-slate-900 bg-slate-50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <p className="text-sm font-semibold text-slate-900">{post.title}</p>
                    <p className="mt-1 text-xs text-slate-500">{new Date(post.created_at).toLocaleString()}</p>
                    <div className="mt-2 flex gap-2">
                      <span
                        className={`rounded-full px-2 py-1 text-[11px] font-medium ${
                          parsed.published ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {parsed.published ? 'Published' : 'Draft'}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] text-slate-600">
                        {parsed.media.length} media
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-slate-900">
            {selectedPost ? `Edit Post: ${selectedPost.title}` : 'Create Post'}
          </h2>

          <form onSubmit={onSubmit} className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Title</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Post title"
                required
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Profile ID</span>
              <input
                value={profileId}
                onChange={(event) => setProfileId(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="UUID"
                required
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Body</span>
              <textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                className="min-h-28 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Write a caption..."
              />
            </label>

            <label className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2">
              <input
                type="checkbox"
                checked={published}
                onChange={(event) => setPublished(event.target.checked)}
                className="h-4 w-4"
              />
              <span className="text-sm font-medium text-slate-700">Publish</span>
            </label>

            <div className="rounded-xl border border-slate-200 p-3">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-800">Media URLs</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => addMedia('image')}
                    className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700"
                  >
                    + Image
                  </button>
                  <button
                    type="button"
                    onClick={() => addMedia('video')}
                    className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700"
                  >
                    + Video
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {mediaItems.length === 0 && (
                  <p className="rounded-md bg-slate-50 px-2 py-2 text-xs text-slate-500">
                    Add image/video URLs and drag to reorder.
                  </p>
                )}

                {mediaItems.map((item, index) => (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData('text/plain', String(index));
                      event.dataTransfer.effectAllowed = 'move';
                    }}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      const fromIndex = Number(event.dataTransfer.getData('text/plain'));
                      if (!Number.isNaN(fromIndex) && fromIndex !== index) {
                        reorderMedia(fromIndex, index);
                      }
                    }}
                    className="grid grid-cols-[70px_1fr_auto] items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2"
                  >
                    <select
                      value={item.kind}
                      onChange={(event) => updateMedia(item.id, { kind: event.target.value as MediaItem['kind'] })}
                      className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                    >
                      <option value="image">Image</option>
                      <option value="video">Video</option>
                    </select>

                    <input
                      value={item.url}
                      onChange={(event) => updateMedia(item.id, { url: event.target.value })}
                      className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                      placeholder={`${item.kind} URL`}
                    />

                    <button
                      type="button"
                      onClick={() => removeMedia(item.id)}
                      className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {submitting ? 'Saving...' : selectedPostId ? 'Save Changes' : 'Create Post'}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
