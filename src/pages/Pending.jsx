import { Link, useNavigate } from 'react-router-dom'
import { Clock, Home, LogOut, RefreshCw } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { Btn, EmptyState } from '../components/ui'
export default function Pending() {
  const { profile, signOut, refresh } = useAuth(), nav = useNavigate()
  return <div className="page narrow" style={{ paddingTop: 60 }}><EmptyState icon={Clock} title={`أهلًا ${profile?.full_name?.split(' ')[0] || ''}، حسابك بانتظار التفعيل`} text="سيقوم المدرس بتفعيل حسابك قريبًا، وبعدها تستطيع الدخول إلى الواجبات والشرح. يمكنك تحديث الصفحة للتأكد من الحالة." action={<div className="row" style={{ justifyContent: 'center', flexWrap: 'wrap' }}><Btn icon={RefreshCw} onClick={refresh}>تحديث الحالة</Btn><Link className="btn secondary" to="/"><Home size={17} className="i" />الصفحة الرئيسية</Link><Btn variant="secondary" icon={LogOut} onClick={async () => { await signOut(); nav('/') }}>تسجيل الخروج</Btn></div>} /></div>
}
