'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useInView } from 'react-intersection-observer';
import { ShieldAlert, CheckCircle2 } from 'lucide-react';
import CreatePost from '@/components/CreatePost';
import { motion, AnimatePresence } from 'framer-motion';
import PostCard from '@/components/PostCard';
import PostModal from '@/components/PostModal';
import StoriesBar from '@/components/StoriesBar';
import FriendSuggestions from '@/components/FriendSuggestions';
import SearchBar from '@/components/SearchBar';
import ShortsShelf from '@/components/ShortsShelf';
import api from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { useSocket } from '@/lib/socket';

import { Suspense } from 'react';

function FeedContent() {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const { socket } = useSocket();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [showPostModal, setShowPostModal] = useState(false);
  const [showVerificationSuccess, setShowVerificationSuccess] = useState(false);
  const [initialCommentId, setInitialCommentId] = useState<string | null>(null);
  const deepLinkHandled = useRef(false);

  const { ref, inView } = useInView({
    threshold: 0,
    rootMargin: '400px',
  });

  // Fetch initial posts
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const response = await api.get('/posts/feed?page=1&limit=10');
        const data = Array.isArray(response.data) ? response.data : [];
        setPosts(data);
        setHasMore(data.length === 10);
      } catch (error) {
        console.error('Failed to fetch posts:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, []);

  // Handle direct post link (?post=ID) - ONLY on initial page load
  useEffect(() => {
    if (deepLinkHandled.current) return;
    const params = new URLSearchParams(window.location.search);
    const postId = params.get('post');
    if (postId) {
      deepLinkHandled.current = true;
      const fetchSinglePost = async () => {
        try {
          const response = await api.get(`/posts/${postId}`);
          setSelectedPost(response.data);
          setShowPostModal(true);
        } catch (error) {
          console.error('Failed to fetch post from URL:', error);
        }
      };
      fetchSinglePost();
    }
  }, []);

  // Infinite Scroll Trigger
  useEffect(() => {
    if (inView && hasMore && !loadingMore && !loading) {
      loadMorePosts();
    }
  }, [inView, hasMore, loadingMore, loading]);

  // Real-time updates
  useEffect(() => {
    if (!socket) return;

    socket.on('new_post', (newPost: any) => {
      setPosts((prev) => {
        // Avoid duplicates
        if (prev.some(p => p.id === newPost.id)) return prev;
        return [newPost, ...prev];
      });
    });

    socket.on('like_update', ({ postId, likeCount }: { postId: string, likeCount: number }) => {
      setPosts((prev) => prev.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            _count: {
              ...post._count,
              likes: likeCount
            }
          };
        }
        return post;
      }));
    });

    return () => {
      socket.off('new_post');
      socket.off('like_update');
    };
  }, [socket]);

  const loadMorePosts = async () => {
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const response = await api.get(`/posts/feed?page=${nextPage}&limit=10`);
      const data = Array.isArray(response.data) ? response.data : [];
      if (data.length > 0) {
        setPosts(prev => {
          const freshData = data.filter(newPost => !prev.some(p => p.id === newPost.id));
          return [...prev, ...freshData];
        });
        setPage(nextPage);
        setHasMore(data.length === 10);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Failed to load more posts:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div>
      {/* Verification Banner */}
      {currentUser && !currentUser.isVerified && (
        <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0">
            <ShieldAlert className="w-5 h-5 text-red-500" />
          </div>
          <div className="flex-1">
            <h4 className="text-white font-bold text-sm">Action Required: Verify your identity</h4>
            <p className="text-red-400/80 text-xs">Please check your email to verify your account. Unverified accounts cannot post or interact.</p>
          </div>
          <button
            onClick={async () => {
              try {
                await api.post('/auth/resend-verification', { email: currentUser.email });
                alert('Verification email sent! Please check your inbox.');
              } catch (error) {
                console.error('Failed to resend verification email:', error);
                alert('Failed to send verification email. Please try again later.');
              }
            }}
            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-500 rounded-lg text-xs font-bold transition-all"
          >
            Resend Email
          </button>
        </div>
      )}

      {showVerificationSuccess && (
        <div className="mb-6 bg-green-500/10 border border-green-500/20 rounded-2xl p-4 flex items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          </div>
          <div className="flex-1">
            <h4 className="text-slate-900 dark:text-white font-bold text-sm">Identity Secured</h4>
            <p className="text-green-600 dark:text-green-400/80 text-xs">Your email has been verified. Welcome to MROHAUNG.</p>
          </div>
        </div>
      )}

      {currentUser && <StoriesBar />}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_280px] gap-6">
        <section className="min-w-0">
          {currentUser && currentUser.isVerified && (
            <CreatePost onPostCreated={(newPost?: any) => {
              if (newPost) {
                // Prepend logic is handled by socket, but we can do it here too for instant feedback
                setPosts((prev) => {
                  if (prev.some(p => p.id === newPost.id)) return prev;
                  return [newPost, ...prev];
                });
              }
            }} />
          )}


          {loading ? (
            <div className="divide-y divide-slate-100 dark:divide-white/5">
              {[1, 2, 3].map(i => (
                <div key={i} className="py-4 flex gap-3 animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded-full w-1/3" />
                    <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded-full w-full" />
                    <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded-full w-5/6" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-white/5">
              <AnimatePresence mode="popLayout">
                {posts.map(post => (
                  <motion.div
                    key={post.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <PostCard
                      post={post}
                      isGuest={!currentUser}
                      onDelete={(postId) => {
                        setPosts(prev => prev.filter(p => p.id !== postId));
                      }}
                      onUpdate={(updatedPost) => {
                        setPosts(prev => prev.map(p => p.id === updatedPost.id ? { ...p, ...updatedPost } : p));
                      }}
                      onEdit={(post) => {
                        setSelectedPost(post);
                        setShowPostModal(true);
                      }}
                      onViewComments={(post, commentId) => {
                        if (post.isShort) {
                          router.push(`/short-video/${post.id}${commentId ? `?comment=${commentId}` : ''}`);
                          return;
                        }
                        setSelectedPost(post);
                        setInitialCommentId(commentId || null);
                        setShowPostModal(true);
                        window.history.replaceState(null, '', `?post=${post.id}`);
                      }}
                      onClick={() => {
                        if (post.isShort) {
                          router.push(`/short-video/${post.id}`);
                          return;
                        }
                        setSelectedPost(post);
                        setInitialCommentId(null);
                        setShowPostModal(true);
                        window.history.replaceState(null, '', `?post=${post.id}`);
                      }}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>

              {posts.length === 0 && !loading && (
                <div className="text-center py-20 bg-slate-50 dark:bg-slate-800/20 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700 mb-8">
                  <p className="text-slate-500 dark:text-slate-400 font-medium">No posts yet. Be the first to share something!</p>
                </div>
              )}

              {/* Load More Trigger */}
              <div ref={ref} className="h-20 flex items-center justify-center">
                {loadingMore && (
                  <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                )}
                {!hasMore && posts.length > 0 && (
                  <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">You've reached the end of the feed.</p>
                )}
              </div>
            </div>
          )}
        </section>

        <aside className="hidden xl:block">
          <div className="sticky top-24 space-y-6">
            {currentUser && <FriendSuggestions />}
          </div>
        </aside>
      </div>

      {selectedPost && (
        <PostModal
          isOpen={showPostModal}
          onClose={() => {
            setShowPostModal(false);
            setSelectedPost(null);
            setInitialCommentId(null);
            window.history.replaceState(null, '', window.location.pathname);
          }}
          post={selectedPost}
          onUpdate={(updatedPost) => {
            setPosts(prev => prev.map(p => p.id === updatedPost.id ? { ...p, ...updatedPost } : p));
          }}
          onDelete={(postId) => {
            setPosts(prev => prev.filter(p => p.id !== postId));
            setShowPostModal(false);
          }}
          currentUserId={currentUser?.id}
          initialCommentId={initialCommentId}
        />
      )}
    </div>
  );
}

export default function FeedPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    }>
      <FeedContent />
    </Suspense>
  );
}
