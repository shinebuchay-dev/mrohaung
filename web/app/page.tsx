'use client';

import { useEffect, useState } from 'react';
import CreatePost from '@/components/CreatePost';
import PostCard from '@/components/PostCard';
import PostModal from '@/components/PostModal';
import StoriesBar from '@/components/StoriesBar';
import FriendSuggestions from '@/components/FriendSuggestions';
import SearchBar from '@/components/SearchBar';
import AppShell from '@/components/AppShell';
import api from '@/lib/api';

export default function FeedPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [showPostModal, setShowPostModal] = useState(false);

  useEffect(() => {
    // Get current user from localStorage
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    setCurrentUser(user);

    const fetchPosts = async () => {
      try {
        const response = await api.get('/posts/feed?page=1&limit=10');
        setPosts(response.data);
        setHasMore(response.data.length === 10);
      } catch (error) {
        console.error('Failed to fetch posts:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop
        >= document.documentElement.offsetHeight - 100
      ) {
        if (!loadingMore && hasMore) {
          loadMorePosts();
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadingMore, hasMore, page]);

  const loadMorePosts = async () => {
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const response = await api.get(`/posts/feed?page=${nextPage}&limit=10`);
      if (response.data.length > 0) {
        setPosts(prev => [...prev, ...response.data]);
        setPage(nextPage);
        setHasMore(response.data.length === 10);
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
    <AppShell>
      {/* Conditionally show stories only if logged in? Or show public stories? 
          For now, maybe just show them or hide if empty. We can keep it. */}
      {currentUser && <StoriesBar />}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-8">
        <section className="min-w-0">
          {currentUser ? (
            <CreatePost onPostCreated={async (newPost?: any) => {
              if (newPost) {
                const normalized = {
                  ...newPost,
                  _count: { likes: 0, comments: 0 },
                  author: { ...newPost.author, id: newPost.authorId },
                };
                setPosts((prev) => [normalized, ...prev]);
              } else {
                const response = await api.get('/posts/feed?page=1&limit=10&_=' + Date.now());
                setPosts(response.data);
              }
            }} />
          ) : (
            <div className="bg-[#1e293b]/50 border border-[#334155] rounded-2xl p-6 text-center mb-6">
              <h3 className="text-white font-bold text-lg mb-2">Join the conversation</h3>
              <p className="text-[#94a3b8] mb-4">Sign in to share your thoughts and interact with others.</p>
              <div className="flex justify-center gap-4">
                <a href="/login" className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-colors">Login</a>
                <a href="/signup" className="px-6 py-2 bg-[#334155] hover:bg-[#475569] text-white rounded-xl font-bold transition-colors">Sign Up</a>
              </div>
            </div>
          )}

          {loading ? (
            <div className="space-y-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-[#1e293b]/30 rounded-2xl h-64 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {posts.map(post => (
                <PostCard
                  key={post.id}
                  post={post}
                  isGuest={!currentUser}
                  onDelete={async () => {
                    const response = await api.get('/posts/feed?page=1&limit=10&_=' + Date.now());
                    setPosts(response.data);
                  }}
                  onUpdate={async () => {
                    const response = await api.get('/posts/feed?page=1&limit=10&_=' + Date.now());
                    setPosts(response.data);
                  }}
                  onEdit={(post) => {
                    setSelectedPost(post);
                    setShowPostModal(true);
                  }}
                  onViewComments={(post) => {
                    if (!currentUser) return; // Or trigger login
                    setSelectedPost(post);
                    setShowPostModal(true);
                  }}
                />
              ))}
              {posts.length === 0 && (
                <div className="text-center py-20 bg-[#1e293b]/20 rounded-3xl border border-dashed border-[#334155]">
                  <p className="text-[#64748b]">No posts yet.</p>
                </div>
              )}

              {loadingMore && (
                <div className="flex justify-center py-8">
                  <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}

              {!hasMore && posts.length > 0 && (
                <div className="text-center py-8">
                  <p className="text-[#64748b] text-sm">You've reached the end</p>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Right Sidebar */}
        <aside className="hidden xl:block">
          <div className="sticky top-24 space-y-4">
            {currentUser && <FriendSuggestions />}
            {/* Maybe show something else for guests? trending topics? */}
          </div>
        </aside>
      </div>

      {selectedPost && (
        <PostModal
          isOpen={showPostModal}
          onClose={() => {
            setShowPostModal(false);
            setSelectedPost(null);
          }}
          post={selectedPost}
          onUpdate={async () => {
            const response = await api.get('/posts/feed?page=1&limit=10&_=' + Date.now());
            setPosts(response.data);
          }}
          onDelete={async () => {
            const response = await api.get('/posts/feed?page=1&limit=10&_=' + Date.now());
            setPosts(response.data);
          }}
          currentUserId={currentUser?.id}
        />
      )}
    </AppShell>
  );
}
