import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, Lesson } from '../../lib/supabase';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { CheckCircle, Video } from 'lucide-react';

interface LessonPlayerModalProps {
  lesson: Lesson;
  courseId: string;
  onClose: () => void;
}

export function LessonPlayerModal({ lesson, courseId, onClose }: LessonPlayerModalProps) {
  const { profile } = useAuth();
  const [completed, setCompleted] = useState(false);
  const [enrollmentId, setEnrollmentId] = useState<string | null>(null);
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    loadProgress();
  }, [lesson.id, profile?.id]);

  const loadProgress = async () => {
    if (!profile?.id) return;

    try {
      const { data: enrollment } = await supabase
        .from('enrollments')
        .select('id')
        .eq('student_id', profile.id)
        .eq('course_id', courseId)
        .maybeSingle();

      if (!enrollment) return;
      setEnrollmentId(enrollment.id);

      const { data: progress } = await supabase
        .from('lesson_progress')
        .select('completed')
        .eq('enrollment_id', enrollment.id)
        .eq('lesson_id', lesson.id)
        .maybeSingle();

      if (progress) {
        setCompleted(progress.completed);
      }
    } catch (error) {
      console.error('Error loading progress:', error);
    }
  };

  const handleMarkComplete = async () => {
    if (!enrollmentId) return;
    setMarking(true);

    try {
      const { data: existing } = await supabase
        .from('lesson_progress')
        .select('id')
        .eq('enrollment_id', enrollmentId)
        .eq('lesson_id', lesson.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('lesson_progress')
          .update({
            completed: true,
            completed_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('lesson_progress')
          .insert({
            enrollment_id: enrollmentId,
            lesson_id: lesson.id,
            completed: true,
            completed_at: new Date().toISOString(),
          });

        if (error) throw error;
      }

      setCompleted(true);
      await updateEnrollmentProgress();
    } catch (error) {
      console.error('Error marking complete:', error);
    } finally {
      setMarking(false);
    }
  };

  const updateEnrollmentProgress = async () => {
    if (!enrollmentId) return;

    try {
      const { data: allLessons } = await supabase
        .from('lessons')
        .select('id')
        .in(
          'module_id',
          (
            await supabase
              .from('modules')
              .select('id')
              .eq('course_id', courseId)
          ).data?.map(m => m.id) || []
        );

      const totalLessons = allLessons?.length || 0;

      const { data: completedLessons } = await supabase
        .from('lesson_progress')
        .select('id')
        .eq('enrollment_id', enrollmentId)
        .eq('completed', true);

      const completedCount = completedLessons?.length || 0;
      const progressPercentage = totalLessons > 0
        ? Math.round((completedCount / totalLessons) * 100)
        : 0;

      await supabase
        .from('enrollments')
        .update({
          progress_percentage: progressPercentage,
          completed_at: progressPercentage === 100 ? new Date().toISOString() : null,
        })
        .eq('id', enrollmentId);
    } catch (error) {
      console.error('Error updating enrollment progress:', error);
    }
  };

  const getYouTubeEmbedUrl = (url: string) => {
    const videoIdMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/);
    if (videoIdMatch) {
      return `https://www.youtube.com/embed/${videoIdMatch[1]}`;
    }
    return url;
  };

  return (
    <Modal isOpen onClose={onClose} title={lesson.title} size="xl">
      <div className="space-y-6">
        {lesson.video_url ? (
          <div className="aspect-video bg-slate-900 rounded-lg overflow-hidden">
            <iframe
              src={getYouTubeEmbedUrl(lesson.video_url)}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="aspect-video bg-slate-100 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <Video className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600">No video available for this lesson</p>
            </div>
          </div>
        )}

        {lesson.content && (
          <div>
            <h3 className="font-semibold text-slate-900 mb-3">Lesson Content</h3>
            <div className="prose prose-slate max-w-none">
              <p className="text-slate-700 whitespace-pre-wrap">{lesson.content}</p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
          <div className="flex items-center gap-2">
            {completed && (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Completed</span>
              </div>
            )}
          </div>
          <div className="flex gap-3">
            {!completed && (
              <Button
                onClick={handleMarkComplete}
                disabled={marking}
              >
                {marking ? 'Marking...' : 'Mark as Complete'}
              </Button>
            )}
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
