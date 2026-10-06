import { NavLink, Route, Routes } from 'react-router-dom'
import Overview from './Overview'
import Curriculum from './Curriculum'
import Questions from './Questions'
import Assignments from './Assignments'
import Students from './Students'
import Grading from './Grading'
import Results from './Results'
const tabs = [['', 'الرئيسية'], ['curriculum', 'الفصول والدروس'], ['questions', 'الأسئلة'], ['assignments', 'الواجبات'], ['students', 'الطلاب'], ['grading', 'التصحيح'], ['results', 'النتائج']]
export default function Admin() {
  return <div className="wrap wide"><div className="tabs">{tabs.map(([p, t]) => <NavLink key={p} end={p === ''} to={`/admin/${p}`}>{t}</NavLink>)}</div>
    <Routes><Route index element={<Overview />} /><Route path="curriculum" element={<Curriculum />} /><Route path="questions" element={<Questions />} />
      <Route path="assignments" element={<Assignments />} /><Route path="students" element={<Students />} /><Route path="grading" element={<Grading />} /><Route path="results" element={<Results />} /></Routes></div>
}
