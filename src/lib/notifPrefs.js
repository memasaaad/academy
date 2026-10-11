// تصنيف الإشعارات وتفضيلات المستخدم (مفتاح false = متوقف). الإشعارات القديمة لا تحمل نوعًا واضحًا فيُستدل عليها من الرابط.
export const STUDENT_PREFS = [['announcements', 'الإعلانات', 'إعلانات المدرس'], ['assignments', 'الواجبات الجديدة', 'عند نشر واجب جديد'], ['results', 'النتائج والتصحيح', 'تصحيح الواجبات وتنبيه انخفاض الدرجة'], ['content', 'محتوى جديد', 'عند فتح فصل جديد'], ['achievements', 'الإنجازات', 'إنهاء فصل أو درجة كاملة'], ['reminders', 'تذكير المواعيد', 'قبل انتهاء الواجب بيوم أو ساعات']]
export const ADMIN_PREFS = [['submissions', 'تسليم الطلاب', 'عند تسليم طالب لواجب'], ['new_students', 'الطلاب الجدد', 'عند تسجيل طالب جديد بانتظار التفعيل']]
export const categoryOf = (n, admin) => {
  if (admin) return n.attempt_id ? 'submissions' : (n.kind === 'student' || n.link === '/admin/students' || /طالب جديد/.test(n.title || '')) ? 'new_students' : 'submissions'
  if (n.kind === 'announcement') return 'announcements'
  if (n.kind === 'chapter') return 'content'
  if (n.kind === 'achievement') return 'achievements'
  if (n.kind === 'warning' || (n.link || '').startsWith('/review/')) return 'results'
  if ((n.link || '').startsWith('/solve/')) return 'assignments'
  return 'other'
}
export const allowed = (prefs, n, admin) => { const c = categoryOf(n, admin); return c === 'other' || prefs?.[c] !== false }
