import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, MessageCircle, Repeat2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface Profile {
  username: string;
  display_name: string;
  avatar_url?: string;
}

interface PostData {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles?: Profile;
}

interface PostProps {
  post: PostData;
  onUpdate?: () => void;
}

const Post = ({ post, onUpdate }: PostProps) => {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    fetchPostStats();
    if (user) {
      checkIfLiked();
    }
  }, [post.id, user]);

  const fetchPostStats = async () => {
    try {
      // Get like count
      const { count: likes } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', post.id);

      // Get comment count
      const { count: comments } = await supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', post.id);

      setLikeCount(likes || 0);
      setCommentCount(comments || 0);
    } catch (error) {
      console.error('Error fetching post stats:', error);
    }
  };

  const checkIfLiked = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('likes')
        .select('id')
        .eq('post_id', post.id)
        .eq('user_id', user.id)
        .single();

      setLiked(!!data);
    } catch (error) {
      // No like found
      setLiked(false);
    }
  };

  const handleLike = async () => {
    if (!user || loading) return;

    setLoading(true);
    try {
      if (liked) {
        // Remove like
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', user.id);

        if (error) throw error;
        setLiked(false);
        setLikeCount(prev => prev - 1);
      } else {
        // Add like
        const { error } = await supabase
          .from('likes')
          .insert({
            post_id: post.id,
            user_id: user.id,
          });

        if (error) throw error;
        setLiked(true);
        setLikeCount(prev => prev + 1);
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Action failed",
        description: "Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'now';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    return date.toLocaleDateString();
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex space-x-3">
          <Avatar>
            <AvatarImage src={post.profiles?.avatar_url} />
            <AvatarFallback>
              {post.profiles?.display_name?.charAt(0).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <h4 className="font-semibold text-sm">
                {post.profiles?.display_name || 'Unknown User'}
              </h4>
              <span className="text-muted-foreground text-sm">
                @{post.profiles?.username || 'unknown'}
              </span>
              <span className="text-muted-foreground text-sm">·</span>
              <span className="text-muted-foreground text-sm">
                {formatTime(post.created_at)}
              </span>
            </div>
            <p className="mt-2 text-foreground">{post.content}</p>
            <div className="flex items-center space-x-6 mt-3">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-blue-600 p-0"
              >
                <MessageCircle className="h-4 w-4 mr-1" />
                <span className="text-sm">{commentCount}</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-green-600 p-0"
              >
                <Repeat2 className="h-4 w-4 mr-1" />
                <span className="text-sm">0</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLike}
                className={`p-0 ${liked 
                  ? 'text-red-600 hover:text-red-700' 
                  : 'text-muted-foreground hover:text-red-600'
                }`}
                disabled={loading}
              >
                <Heart className={`h-4 w-4 mr-1 ${liked ? 'fill-current' : ''}`} />
                <span className="text-sm">{likeCount}</span>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default Post;