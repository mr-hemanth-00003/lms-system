import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, Course, Module, Lesson, Review } from '../../lib/supabase';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Textarea } from '../../components/ui/Textarea';
import { BookOpen, Clock, Star, Users, Award, ChevronDown, ChevronRight, Video, Play } from 'lucide-react';
import { LessonPlayerModal } from './LessonPlayerModal';

interface CourseDetailModalProps {
  course: Course;
  isEnrolled: boolean;
  onClose: () => void;
  onEnrollSuccess: () => void;
}

interface ModuleWithLessons extends Module {
  lessons: Lesson[];
}

export function CourseDetailModal({ course, isEnrolled, onClose, onEnrollSuccess }: CourseDetailModalProps) {
  const { profile } = useAuth();
  const [modules, setModules] = useState<ModuleWithLessons[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [enrolling, setEnrolling] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [avgRating, setAvgRating] = useState(0);

  useEffect(() => {
    loadCourseDetails();
  }, [course.id]);

  const loadCourseDetails = async () => {
    try {
      const { data: modulesData } = await supabase
        .from('modules')
        .select('*')
        .eq('course_id', course.id)
        .order('order_index');

      const modulesWithLessons = await Promise.all(
        (modulesData || []).map(async (module) => {
          const { data: lessonsData } = await supabase
            .from('lessons')
            .select('*')
            .eq('module_id', module.id)
            .order('order_index');

          return {
            ...module,
            lessons: lessonsData || [],
          };
        })
      );

      setModules(modulesWithLessons);

      const { data: reviewsData } = await supabase
        .from('reviews')
        .select('*, student:profiles!reviews_student_id_fkey(*)')
        .eq('course_id', course.id)
        .order('created_at', { ascending: false });

      setReviews(reviewsData || []);

      if (reviewsData && reviewsData.length > 0) {
        const avg = reviewsData.reduce((sum, r) => sum + r.rating, 0) / reviewsData.length;
        setAvgRating(avg);
      }
    } catch (error) {
      console.error('Error loading course details:', error);
    }
  };

  const handleEnroll = async () => {
    if (!profile?.id) return;
    setEnrolling(true);

    try {
      const { error } = await supabase.from('enrollments').insert({
        student_id: profile.id,
        course_id: course.id,
      });

      if (error) throw error;
      onEnrollSuccess();
    } catch (error) {
      console.error('Error enrolling:', error);
      alert('Failed to enroll in course');
    } finally {
      setEnrolling(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!profile?.id || !isEnrolled) return;

    try {
      const { error } = await supabase.from('reviews').insert({
        course_id: course.id,
        student_id: profile.id,
        rating: newReview.rating,
        comment: newReview.comment,
      });

      if (error) throw error;
      setShowReviewForm(false);
      setNewReview({ rating: 5, comment: '' });
      loadCourseDetails();
    } catch (error) {
      console.error('Error submitting review:', error);
      alert('Failed to submit review');
    }
  };

  const toggleModule = (moduleId: string) => {
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(moduleId)) {
      newExpanded.delete(moduleId);
    } else {
      newExpanded.add(moduleId);
    }
    setExpandedModules(newExpanded);
  };

  const totalLessons = modules.reduce((sum, m) => sum + m.lessons.length, 0);
  const totalDuration = modules.reduce(
    (sum, m) => sum + m.lessons.reduce((s, l) => s + l.duration_minutes, 0),
    0
  );

  return (
    <>
      <Modal isOpen onClose={onClose} title="" size="xl">
        <div className="space-y-6">
          <div className="aspect-video bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl overflow-hidden -mt-4 -mx-6 mb-6">
            {course.thumbnail_url ? (
              <img
                src={course.thumbnail_url}
                alt={course.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <BookOpen className="w-16 h-16 text-white/70" />
              </div>
            )}
          </div>

          <div>
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">{course.title}</h2>
                <p className="text-slate-600 mb-3">{course.description}</p>
                <p className="text-sm text-slate-600">
                  By {course.teacher?.full_name || 'Unknown Teacher'}
                </p>
              </div>
              <div className="text-right ml-4">
                <p className="text-3xl font-bold text-slate-900">
                  {course.price === 0 ? 'Free' : `$${course.price}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6 py-4 border-y border-slate-200">
              {avgRating > 0 && (
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                  <span className="font-medium">{avgRating.toFixed(1)}</span>
                  <span className="text-slate-600 text-sm">({reviews.length} reviews)</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-slate-400" />
                <span className="text-slate-700">{totalLessons} lessons</span>
              </div>
              {totalDuration > 0 && (
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-slate-400" />
                  <span className="text-slate-700">{Math.round(totalDuration / 60)}h {totalDuration % 60}m</span>
                </div>
              )}
              {course.difficulty_level && (
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-slate-400" />
                  <span className="text-slate-700 capitalize">{course.difficulty_level}</span>
                </div>
              )}
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-slate-900 mb-3">Course Content</h3>
            {modules.length === 0 ? (
              <p className="text-slate-600 text-center py-4">No content available yet</p>
            ) : (
              <div className="space-y-2">
                {modules.map((module, moduleIndex) => (
                  <div key={module.id} className="border border-slate-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleModule(module.id)}
                      className="w-full bg-slate-50 px-4 py-3 flex items-center justify-between hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {expandedModules.has(module.id) ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                        <span className="font-medium text-slate-900">
                          {moduleIndex + 1}. {module.title}
                        </span>
                      </div>
                      <span className="text-sm text-slate-500">
                        {module.lessons.length} lessons
                      </span>
                    </button>

                    {expandedModules.has(module.id) && (
                      <div className="p-2 space-y-1">
                        {module.lessons.map((lesson, lessonIndex) => (
                          <button
                            key={lesson.id}
                            onClick={() => isEnrolled && setSelectedLesson(lesson)}
                            disabled={!isEnrolled}
                            className={`w-full flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors text-left ${
                              !isEnrolled ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                          >
                            <Video className="w-4 h-4 text-slate-400 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-900 truncate">
                                {moduleIndex + 1}.{lessonIndex + 1} {lesson.title}
                              </p>
                              {lesson.duration_minutes > 0 && (
                                <p className="text-xs text-slate-500">
                                  {lesson.duration_minutes} minutes
                                </p>
                              )}
                            </div>
                            {isEnrolled && (
                              <Play className="w-4 h-4 text-blue-600 flex-shrink-0" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">Reviews</h3>
              {isEnrolled && !showReviewForm && (
                <Button size="sm" variant="outline" onClick={() => setShowReviewForm(true)}>
                  Write a Review
                </Button>
              )}
            </div>

            {showReviewForm && (
              <div className="bg-slate-50 p-4 rounded-lg mb-4">
                <div className="mb-3">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Rating</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setNewReview({ ...newReview, rating: star })}
                        className="transition-colors"
                      >
                        <Star
                          className={`w-6 h-6 ${
                            star <= newReview.rating
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-slate-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
                <Textarea
                  label="Comment"
                  value={newReview.comment}
                  onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                  placeholder="Share your thoughts about this course..."
                  rows={3}
                />
                <div className="flex gap-2 mt-3">
                  <Button size="sm" onClick={handleSubmitReview}>
                    Submit Review
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowReviewForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {reviews.length === 0 ? (
              <p className="text-slate-600 text-center py-4">No reviews yet</p>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {reviews.map((review) => (
                  <div key={review.id} className="border-b border-slate-200 pb-4 last:border-0">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-slate-900">
                          {review.student?.full_name || 'Anonymous'}
                        </p>
                        <div className="flex items-center gap-1 mt-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < review.rating
                                  ? 'text-amber-400 fill-amber-400'
                                  : 'text-slate-300'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <span className="text-sm text-slate-500">
                        {new Date(review.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {review.comment && (
                      <p className="text-slate-700 text-sm">{review.comment}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {!isEnrolled && (
            <div className="sticky bottom-0 -mx-6 -mb-4 px-6 py-4 bg-white border-t border-slate-200">
              <Button
                onClick={handleEnroll}
                disabled={enrolling}
                className="w-full"
                size="lg"
              >
                {enrolling ? 'Enrolling...' : 'Enroll Now'}
              </Button>
            </div>
          )}
        </div>
      </Modal>

      {selectedLesson && (
        <LessonPlayerModal
          lesson={selectedLesson}
          courseId={course.id}
          onClose={() => setSelectedLesson(null)}
        />
      )}
    </>
  );
}
