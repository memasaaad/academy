import { sb } from './supabase'
// رفع ملف إلى Supabase Storage مع نسبة التقدم (supabase-js لا يوفّر progress). نفس طريقة supabase-js في الإرسال.
export async function uploadWithProgress(bucket, path, file, onProgress = () => {}) {
  const { data } = await sb.auth.getSession(), key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  return new Promise((resolve, reject) => {
    const x = new XMLHttpRequest(), fd = new FormData()
    fd.append('cacheControl', '3600'); fd.append('', file)
    x.open('POST', `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/${bucket}/${path}`)
    x.setRequestHeader('Authorization', `Bearer ${data?.session?.access_token || key}`); x.setRequestHeader('apikey', key)
    x.upload.onprogress = e => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100))
    x.onload = () => { if (x.status >= 200 && x.status < 300) return resolve(path); let m = ''; try { m = JSON.parse(x.responseText).message || '' } catch {} reject(new Error(x.status === 413 ? 'exceeded the maximum allowed size' : m || 'upload failed')) }
    x.onerror = () => reject(new Error('تعذر الاتصال أثناء الرفع. تأكد من الإنترنت وحاول مرة أخرى.'))
    x.send(fd)
  })
}
