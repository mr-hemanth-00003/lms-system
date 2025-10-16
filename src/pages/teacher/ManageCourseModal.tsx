import { useState, useEffect } from 'react';
import { supabase, Course, Module, Lesson } from '../../lib/supabase';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Plus, ChevronDown, ChevronRight, Edit, Trash2, Video } from 'lucide-react';

interface ManageCourseModalProps {
  course: Course;
  onClose: () => void;
}

interface ModuleWithLessons extends Module {
  lessons: Lesson[];
}

export function ManageCourseModal({ course, onClose }: ManageCourseModalProps) {
  const [modules, setModules] = useState<ModuleWithLessons[]>([]);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [showAddModule, setShowAddModule] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [addingLessonTo, setAddingLessonTo] = useState<string | null>(null);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);

  useEffect(() => {
    loadModules();
  }, [course.id]);

  const loadModules = async () => {
    try {
      const { data: modulesData, error: modulesError } = await supabase
        .from('modules')
        .select('*')
        .eq('course_id', course.id)
        .order('order_index');

      if (modulesError) throw modulesError;

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
    } catch (error) {
      console.error('Error loading modules:', error);
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

  const handleDeleteModule = async (moduleId: string) => {
    if (!confirm('Delete this module and all its lessons?')) return;

    try {
      const { error } = await supabase
        .from('modules')
        .delete()
        .eq('id', moduleId);

      if (error) throw error;
      await loadModules();
    } catch (error) {
      console.error('Error deleting module:', error);
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!confirm('Delete this lesson?')) return;

    try {
      const { error } = await supabase
        .from('lessons')
        .delete()
        .eq('id', lessonId);

      if (error) throw error;
      await loadModules();
    } catch (error) {
      console.error('Error deleting lesson:', error);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={`Manage: ${course.title}`} size="xl">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold text-slate-900">Course Content</h3>
          <Button size="sm" onClick={() => setShowAddModule(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Module
          </Button>
        </div>

        {modules.length === 0 ? (
          <div className="text-center py-8 bg-slate-50 rounded-lg">
            <p className="text-slate-600 mb-4">No modules yet</p>
            <Button onClick={() => setShowAddModule(true)} size="sm">
              Create First Module
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {modules.map((module, moduleIndex) => (
              <div key={module.id} className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-50 px-4 py-3 flex items-center justify-between">
                  <button
                    onClick={() => toggleModule(module.id)}
                    className="flex items-center gap-2 flex-1 text-left"
                  >
                    {expandedModules.has(module.id) ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                    <span className="font-medium text-slate-900">
                      {moduleIndex + 1}. {module.title}
                    </span>
                    <span className="text-sm text-slate-500">
                      ({module.lessons.length} lessons)
                    </span>
                  </button>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingModule(module)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteModule(module.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {expandedModules.has(module.id) && (
                  <div className="p-4 space-y-2">
                    {module.lessons.length === 0 ? (
                      <p className="text-sm text-slate-500 text-center py-2">No lessons yet</p>
                    ) : (
                      module.lessons.map((lesson, lessonIndex) => (
                        <div
                          key={lesson.id}
                          className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg hover:border-blue-300 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <Video className="w-4 h-4 text-slate-400" />
                            <div>
                              <p className="text-sm font-medium text-slate-900">
                                {moduleIndex + 1}.{lessonIndex + 1} {lesson.title}
                              </p>
                              {lesson.duration_minutes > 0 && (
                                <p className="text-xs text-slate-500">
                                  {lesson.duration_minutes} minutes
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingLesson(lesson)}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteLesson(lesson.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setAddingLessonTo(module.id)}
                      className="w-full gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add Lesson
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showAddModule && (
        <AddModuleModal
          courseId={course.id}
          orderIndex={modules.length}
          onClose={() => setShowAddModule(false)}
          onSuccess={() => {
            setShowAddModule(false);
            loadModules();
          }}
        />
      )}

      {editingModule && (
        <EditModuleModal
          module={editingModule}
          onClose={() => setEditingModule(null)}
          onSuccess={() => {
            setEditingModule(null);
            loadModules();
          }}
        />
      )}

      {addingLessonTo && (
        <AddLessonModal
          moduleId={addingLessonTo}
          orderIndex={modules.find(m => m.id === addingLessonTo)?.lessons.length || 0}
          onClose={() => setAddingLessonTo(null)}
          onSuccess={() => {
            setAddingLessonTo(null);
            loadModules();
          }}
        />
      )}

      {editingLesson && (
        <EditLessonModal
          lesson={editingLesson}
          onClose={() => setEditingLesson(null)}
          onSuccess={() => {
            setEditingLesson(null);
            loadModules();
          }}
        />
      )}
    </Modal>
  );
}

function AddModuleModal({ courseId, orderIndex, onClose, onSuccess }: any) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from('modules').insert({
        course_id: courseId,
        title,
        description,
        order_index: orderIndex,
      });

      if (error) throw error;
      onSuccess();
    } catch (error) {
      console.error('Error creating module:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Add Module" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Module Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <Textarea
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? 'Creating...' : 'Create Module'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function EditModuleModal({ module, onClose, onSuccess }: any) {
  const [title, setTitle] = useState(module.title);
  const [description, setDescription] = useState(module.description || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('modules')
        .update({ title, description })
        .eq('id', module.id);

      if (error) throw error;
      onSuccess();
    } catch (error) {
      console.error('Error updating module:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Edit Module" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Module Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <Textarea
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function AddLessonModal({ moduleId, orderIndex, onClose, onSuccess }: any) {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    video_url: '',
    duration_minutes: '0',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from('lessons').insert({
        module_id: moduleId,
        title: formData.title,
        content: formData.content,
        video_url: formData.video_url || null,
        duration_minutes: parseInt(formData.duration_minutes),
        order_index: orderIndex,
      });

      if (error) throw error;
      onSuccess();
    } catch (error) {
      console.error('Error creating lesson:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Add Lesson" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Lesson Title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
        />
        <Textarea
          label="Content"
          value={formData.content}
          onChange={(e) => setFormData({ ...formData, content: e.target.value })}
          rows={4}
        />
        <Input
          label="Video URL"
          value={formData.video_url}
          onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
          placeholder="https://youtube.com/watch?v=..."
        />
        <Input
          label="Duration (minutes)"
          type="number"
          min="0"
          value={formData.duration_minutes}
          onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
        />
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? 'Creating...' : 'Create Lesson'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function EditLessonModal({ lesson, onClose, onSuccess }: any) {
  const [formData, setFormData] = useState({
    title: lesson.title,
    content: lesson.content || '',
    video_url: lesson.video_url || '',
    duration_minutes: lesson.duration_minutes.toString(),
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('lessons')
        .update({
          title: formData.title,
          content: formData.content,
          video_url: formData.video_url || null,
          duration_minutes: parseInt(formData.duration_minutes),
        })
        .eq('id', lesson.id);

      if (error) throw error;
      onSuccess();
    } catch (error) {
      console.error('Error updating lesson:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Edit Lesson" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Lesson Title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
        />
        <Textarea
          label="Content"
          value={formData.content}
          onChange={(e) => setFormData({ ...formData, content: e.target.value })}
          rows={4}
        />
        <Input
          label="Video URL"
          value={formData.video_url}
          onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
        />
        <Input
          label="Duration (minutes)"
          type="number"
          min="0"
          value={formData.duration_minutes}
          onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
        />
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
