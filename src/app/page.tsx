'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type Post = {
  id: string;
  title: string;
  content: string | null;
  media_id: string | null;
  profile_id: string;
  created_at: string;
};

type Slide =
  | {
      type: 'image';
      src: string;
      alt: string;
    }
  | {
      type: 'video';
      src: string;
    };

const demoVideo =
  'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';

function buildSlides(post: Post): Slide[] {
  return [
    {
      type: 'image',
      src: `https://picsum.photos/seed/${post.id}-1/900/900`,
      alt: `${post.title} slide 1`,
    },
    {
      type: 'image',
      src: `https://picsum.photos/seed/${post.id}-2/900/900`,
      alt: `${post.title} slide 2`,
    },
    {
      type: 'video',
      src: demoVideo,
    },
  ];
}

export default function Home() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const modalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadPosts() {
      try {
        const response = await fetch('/api/posts', { cache: 'no-store' });

        if (!response.ok) {
          throw new Error('Failed to fetch posts.');
        }

        const payload = (await response.json()) as { data?: Post[] };

        if (isMounted) {
          setPosts(payload.data ?? []);
        }
      } catch (fetchError) {
        if (isMounted) {
          setError(fetchError instanceof Error ? fetchError.message : 'Unexpected error.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadPosts();

    return () => {
      isMounted = false;
    };
  }, []);

  const slides = useMemo(() => {
    if (!selectedPost) {
      return [];
    }

    return buildSlides(selectedPost);
  }, [selectedPost]);

  function pauseVideos() {
    if (!modalRef.current) {
      return;
    }

    const videos = modalRef.current.querySelectorAll('video');
    videos.forEach((video) => {
      video.pause();
      video.currentTime = 0;
    });
  }

  function closeModal() {
    pauseVideos();
    setSelectedPost(null);
    setActiveSlide(0);
  }

  useEffect(() => {
    if (!selectedPost) {
      pauseVideos();
    }
  }, [selectedPost]);

  function openModal(post: Post) {
    setSelectedPost(post);
    setActiveSlide(0);
  }

  function nextSlide() {
    setActiveSlide((current) => (current + 1) % slides.length);
  }

  function previousSlide() {
    setActiveSlide((current) => (current - 1 + slides.length) % slides.length);
  }

  return (
    <main className="min-h-screen bg-white px-4 py-8 md:px-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-6 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
          Instagram-style Grid
        </h1>

        {loading && (
          <p className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Loading posts...
          </p>
        )}

        {error && (
          <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {!loading && !error && posts.length === 0 && (
          <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            No posts yet.
          </p>
        )}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post, index) => (
            <button
              key={post.id}
              type="button"
              onClick={() => openModal(post)}
              className="group overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 text-left shadow-sm transition hover:shadow-lg"
            >
              <div className="relative aspect-square overflow-hidden bg-slate-200">
                <img
                  src={`https://picsum.photos/seed/${post.id}/800/800`}
                  alt={post.title}
                  loading="lazy"
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                />
                <span className="absolute left-3 top-3 rounded-full bg-black/65 px-2 py-1 text-xs font-medium text-white">
                  #{index + 1}
                </span>
              </div>
              <div className="p-3">
                <h2 className="text-sm font-semibold text-slate-900">{post.title}</h2>
                <p className="mt-1 text-xs text-slate-600">{post.content ?? 'No caption provided.'}</p>
              </div>
            </button>
          ))}
        </section>
      </div>

      {selectedPost && slides.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true">
          <div ref={modalRef} className="relative w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <button
              type="button"
              onClick={closeModal}
              className="absolute right-4 top-4 z-20 rounded-full bg-black/70 px-3 py-1 text-sm font-semibold text-white"
            >
              Close
            </button>

            <div className="relative aspect-square w-full bg-black">
              {slides[activeSlide].type === 'image' ? (
                <img
                  src={slides[activeSlide].src}
                  alt={slides[activeSlide].alt}
                  className="h-full w-full object-cover"
                />
              ) : (
                <video
                  src={slides[activeSlide].src}
                  controls
                  autoPlay
                  className="h-full w-full object-cover"
                />
              )}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-slate-200 p-4">
              <button
                type="button"
                onClick={previousSlide}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700"
              >
                Previous
              </button>
              <p className="text-sm text-slate-600">
                Slide {activeSlide + 1} of {slides.length}
              </p>
              <button
                type="button"
                onClick={nextSlide}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
