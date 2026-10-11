import { useAuth } from '../../lib/auth'
import { Avatar, PageHeader } from '../../components/ui'
import PushToggle from '../../components/PushToggle'
import InstallApp from '../../components/InstallApp'
// حسابي (المدرس): بيانات الحساب + تفعيل إشعارات الموبايل + تثبيت التطبيق (مطلوب أولًا على الآيفون)
export default function AdminAccount() {
  const { profile } = useAuth()
  return <div style={{ maxWidth: 640 }}><PageHeader title="حسابي" desc="إعدادات حسابك كمدرس." />
    <div className="card"><div className="row"><Avatar name={profile?.full_name} /><div><b>{profile?.full_name}</b><p className="muted small" style={{ margin: 0 }}>مدرس</p></div></div></div>
    <PushToggle /><InstallApp /></div>
}
