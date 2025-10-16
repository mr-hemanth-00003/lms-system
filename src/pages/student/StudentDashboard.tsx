import { useState, useEffect } from 'react';
import { BookOpen, Search, Star, TrendingUp, Clock, Award } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, Course, Enrollment } from '../../lib/supabase';
import { Navbar } from '../../components/Navbar';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { CourseDetailModal } from './CourseDetailModal';

export function StudentDashboard() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'my-courses' | 'browse'>('my-courses');
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  useEffect(() => {
    loadData();
  }, [profile?.id, activeTab]);

  const loadData = async () => {
    if (!profile?.id) return;
    setLoading(true);

    try {
      if (activeTab === 'my-courses') {
        const { data, error } = await supabase
          .from('enrollments')
          .select(`
            *,
            course:courses(
              *,
              teacher:profiles!courses_teacher_id_fkey(*),
              category:categories(*)
            )
          `)
          .eq('student_id', profile.id)
          .order('enrolled_at', { ascending: false });

        if (error) throw error;
        setEnrollments(data || []);
      } else {
        const { data, error } = await supabase
          .from('courses')
          .select(`
            *,
            teacher:profiles!courses_teacher_id_fkey(*),
            category:categories(*)
          `)
          .eq('is_published', true)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setAllCourses(data || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCourses = allCourses.filter(course =>
    course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isEnrolled = (courseId: string) => {
    return enrollments.some(e => e.course_id === courseId);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Learning Dashboard</h1>
          <p className="text-slate-600">Continue your learning journey</p>
        </div>

        <div className="mb-6">
          <div className="flex gap-4 border-b border-slate-200">
            <button
              onClick={() => setActiveTab('my-courses')}
              className={`px-4 py-3 font-medium border-b-2 transition-colors ${
                activeTab === 'my-courses'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              My Courses
            </button>
            <button
              onClick={() => setActiveTab('browse')}
              className={`px-4 py-3 font-medium border-b-2 transition-colors ${
                activeTab === 'browse'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              Browse Courses
            </button>
          </div>
        </div>

        {activeTab === 'browse' && (
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search courses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : activeTab === 'my-courses' ? (
          enrollments.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">No courses yet</h3>
                <p className="text-slate-600 mb-6">Browse available courses to get started</p>
                <Button onClick={() => setActiveTab('browse')}>Browse Courses</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {enrollments.map((enrollment) => {
                const course = enrollment.course as Course;
                return (
                  <Card key={enrollment.id} hover>
                    <div className="aspect-video bg-gradient-to-br from-blue-500 to-blue-600 relative">
                      {course.thumbnail_url ? (
                        <img
                          src={course.thumbnail_url}
                          alt={course.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <BookOpen className="w-12 h-12 text-white/70" />
                        </div>
                      )}
                      {enrollment.completed_at && (
                        <div className="absolute top-3 right-3 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                          <Award className="w-3 h-3" />
                          Completed
                        </div>
                      )}
                    </div>
                    <CardContent>
                      <h3 className="font-semibold text-slate-900 mb-2 line-clamp-2">
                        {course.title}
                      </h3>
                      <p className="text-sm text-slate-600 mb-3">
                        {course.teacher?.full_name || 'Unknown Teacher'}
                      </p>

                      <div className="mb-4">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-slate-600">Progress</span>
                          <span className="font-medium text-slate-900">
                            {enrollment.progress_percentage}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${enrollment.progress_percentage}%` }}
                          />
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedCourse(course)}
                        className="w-full"
                      >
                        {enrollment.progress_percentage > 0 ? 'Continue Learning' : 'Start Course'}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => (
              <Card key={course.id} hover>
                <div className="aspect-video bg-gradient-to-br from-blue-500 to-blue-600 relative">
                  {course.thumbnail_url ? (
                    <img
                      src={course.thumbnail_url}
                      alt={course.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="w-12 h-12 text-white/70" />
                    </div>
                  )}
                  {isEnrolled(course.id) && (
                    <div className="absolute top-3 right-3 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                      Enrolled
                    </div>
                  )}
                </div>
                <CardContent>
                  <h3 className="font-semibold text-slate-900 mb-2 line-clamp-2">
                    {course.title}
                  </h3>
                  <p className="text-sm text-slate-600 mb-3">
                    {course.teacher?.full_name || 'Unknown Teacher'}
                  </p>
                  <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                    {course.description || 'No description'}
                  </p>

                  <div className="flex items-center gap-2 mb-4 flex-wrap">
                    {course.difficulty_level && (
                      <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-lg capitalize">
                        {course.difficulty_level}
                      </span>
                    )}
                    {course.category && (
                      <span className="px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded-lg">
                        {course.category.name}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-slate-900">
                      {course.price === 0 ? 'Free' : `$${course.price}`}
                    </span>
                    <Button
                      size="sm"
                      onClick={() => setSelectedCourse(course)}
                      disabled={isEnrolled(course.id)}
                    >
                      {isEnrolled(course.id) ? 'Enrolled' : 'View Details'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {selectedCourse && (
        <CourseDetailModal
          course={selectedCourse}
          isEnrolled={isEnrolled(selectedCourse.id)}
          onClose={() => setSelectedCourse(null)}
          onEnrollSuccess={() => {
            setSelectedCourse(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}
