# اكاديمية المهندس إبراهيم سعد

React + Vite + Supabase (Auth / PostgreSQL / Storage) — جاهز للنشر على Vercel.

## 1) Supabase (مشروع جديد خاص بك، بدل Lovable Cloud)
1. أنشئ مشروعًا على supabase.com.
2. SQL Editor ← شغّل بالترتيب: `supabase/migrations/001_schema.sql` ثم `002_review_notify.sql` (إشعارات المدرس + مراجعة الحل)، ثم `003_student_notifications_uploads.sql` (إشعارات الطالب + رفع صور إجابات المقالي)، ثم `004_activation_resources.sql` (تفعيل الحسابات من المدرس + ملفات وفيديوهات شرح الدروس)، ثم `005_tracks.sql` (مسارات البرمجة + الشرح المكتوب + تقدم الطالب). (ينشئ الجداول + RLS + الدوال + bucket الصور + فصول ودروس الكتاب الـ 4 فصول/14 درس).
3. Authentication ← Providers ← Email ← **أوقف "Confirm email"** (الطلاب يسجلون برقم الهاتف).
4. Project Settings ← API: انسخ `URL` و `publishable/anon key` و `service_role key`.

## 2) تشغيل محلي
```
cp .env.example .env     # املأ القيم
npm install
npm run dev
```
(صفحة إضافة الطلاب تحتاج `/api/students` فتعمل على Vercel أو `npx vercel dev`.)

## 3) إنشاء حساب المدرس (مرة واحدة، بدون كلمة مرور في الكود)
```
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... ADMIN_EMAIL=you@mail.com ADMIN_PASSWORD='كلمة-قوية' node scripts/create-admin.mjs
```

## 4) النشر على Vercel
1. ارفع المشروع على GitHub (الـ `.env` مستبعد في `.gitignore`).
2. Vercel ← Import ← Framework: Vite.
3. Environment Variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
4. Deploy. ثم ادخل بحساب المدرس ← الأسئلة ← **استيراد JSON** ← اختر `questions-import.json` (أو ملفات الدروس واحدًا واحدًا).

## رفع دروس جديدة لاحقًا
اعمل ملف JSON بنفس صيغة ملفات الدرس 1–4 (الحقول: chapter, lesson, section, question_type, question_text, options, correct_answer, model_answer, marks, source_page …) وارفعه من "الأسئلة ← استيراد JSON". إعادة رفع نفس الملف لا تكرر الأسئلة. الفصل/الدرس يُطابق بالرقم قبل النقطتين (مثل "الدرس 3") وإن لم يوجد يُنشأ تلقائيًا.

`python3 scripts/build-import.py <مجلد الملفات>` يدمج كل ملفات `questions_ch*_lesson*.json` ويعمل Validation.

## الأمان
- الإجابات الصحيحة في جدول `questions/question_options` للمدرس فقط (RLS)؛ الطالب يستلم الأسئلة عبر دالة `get_attempt_questions` بدون إجابات.
- التصحيح يتم داخل قاعدة البيانات (`submit_attempt`)، والطالب لا يستطيع كتابة `is_correct` أو الدرجات.
- مفتاح service_role يُستخدم فقط في `api/` و `scripts/`.

## ملاحظة عن إعلان النتيجة
في الواجب اليدوي (التصحيح التلقائي مغلق) الواجهة تخفي الدرجة عن الطالب حتى تنتهي من تصحيح كل الأسئلة، ودالة مراجعة الحل ترفض طلبه قبل ذلك. لكن رقم الدرجة نفسه يبقى قابلًا للقراءة من جدول attempts لمن يعرف يستعلم مباشرة.

## نظام التصميم (إعادة التصميم)
- `src/styles.css`: Design Tokens (ألوان، مسافات، radius، ظلال) + المكونات + نقاط الكسر (1100 / 860 / 640).
- `src/components/ui.jsx`: Button, Badge, Modal, Menu, Toast, Dialog (تأكيد/إدخال بدل prompt/confirm), Skeleton, EmptyState, ErrorState, Progress, Pager, `useAsync`.
- الأيقونات: Lucide. الخط: IBM Plex Sans Arabic. الأرقام لاتينية موحدة.
- مسارات الطالب: `/dashboard` `/assignments` `/results` `/account` `/review/:id` `/solve/:id`. المدرس: `/admin/*`.

## الوضع الليلي
زر القمر/الشمس في كل الصفحات. الاختيار يُحفظ في المتصفح، والافتراضي يتبع إعداد الجهاز.

## تفعيل الطلاب وكلمات المرور
- أي حساب جديد يسجله الطالب بنفسه يكون **غير مفعّل** ويصلك إشعار؛ فعّله من لوحة المدرس ← الطلاب.
- الطالب الذي تضيفه أنت يكون مفعّلًا مباشرة. الحسابات الموجودة قبل التحديث تبقى مفعّلة.
- تغيير كلمة مرور أي طالب من زر المفتاح في صفحة الطلاب (يحتاج `SUPABASE_SERVICE_ROLE_KEY` على Vercel).

## شرح الدروس
لوحة المدرس ← الفصول والدروس ← زر «الشرح» بجانب كل درس: ارفع فيديو/PDF/Word/PowerPoint أو ضع رابط (يوتيوب غير مدرج / Drive / Vimeo). يظهر للطلاب المفعّلين داخل الدرس في الصفحة الرئيسية. حجم الملف المسموح يحدده مشروع Supabase (غالبًا 50MB)؛ للفيديوهات الكبيرة استخدم رابط يوتيوب.

## مسارات البرمجة (JavaScript / Python …)
- المدرس: لوحة المدرس ← **مسارات البرمجة** ← إضافة مسار (اسم + وصف + لون الكارت) ← افتح المسار ← أضف **فصولًا**، وفي كل فصل أضف **أجزاء** (زر «الشرح» لكل جزء: نص مكتوب + رفع فيديو/ملف من الجهاز أو رابط) ← زر **امتحان الفصل** ينشئ واجبًا على الفصل كله من أسئلة أجزائه.
- الأسئلة تُضاف لأجزاء المسار من «بنك الأسئلة» أو «استيراد / تصدير» مثل المنهج تمامًا.
- الطالب: صفحات **المنهج** و**المسارات** في القائمة، والمنهج يظهر أيضًا في لوحته الرئيسية. كل جزء فيه الشرح والواجبات وعلامة «أنهيت هذا الجزء» وتظهر نسبة التقدم على كارت المسار.
- المنهج الأساسي لا يتأثر: فصوله بدون `track_id`، والصفحة العامة تعرضها فقط.
- رفع الفيديو من الجهاز يعرض نسبة التقدم؛ الحد الأقصى للملف يحدده مشروع Supabase (غالبًا 50MB في الخطة المجانية، وتُرفع من الإعدادات في الخطط المدفوعة).
