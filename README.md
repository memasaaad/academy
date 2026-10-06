# اكاديمية المهندس إبراهيم سعد

React + Vite + Supabase (Auth / PostgreSQL / Storage) — جاهز للنشر على Vercel.

## 1) Supabase (مشروع جديد خاص بك، بدل Lovable Cloud)
1. أنشئ مشروعًا على supabase.com.
2. SQL Editor ← الصق محتوى `supabase/migrations/001_schema.sql` ← Run. (ينشئ الجداول + RLS + الدوال + bucket الصور + فصول ودروس الكتاب الـ 4 فصول/14 درس).
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
