import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Splash from './pages/Splash'
import TeamHome from './pages/TeamHome'

const SquareDetail = lazy(() => import('./pages/SquareDetail'))
const TeamQR = lazy(() => import('./pages/TeamQR'))
const ProjectSubmit = lazy(() => import('./pages/ProjectSubmit'))
const AiSubmission = lazy(() => import('./pages/AiSubmission'))
const ClaimQr = lazy(() => import('./pages/ClaimQr'))
const BoothDeepfake = lazy(() => import('./pages/BoothDeepfake'))
const Scoreboard = lazy(() => import('./pages/Scoreboard'))
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'))
const ApprovalQueue = lazy(() => import('./pages/admin/ApprovalQueue'))
const TeamsManage = lazy(() => import('./pages/admin/TeamsManage'))
const GameControls = lazy(() => import('./pages/admin/GameControls'))
const DrawSpin = lazy(() => import('./pages/admin/DrawSpin'))
const FanFavs = lazy(() => import('./pages/admin/FanFavs'))
const AiSubmissions = lazy(() => import('./pages/admin/AiSubmissions'))

function Loading() {
  return <div className="p-6 text-bh-dim bh-display text-xs">Loading…</div>
}

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<Splash />} />
          <Route path="/t/:token" element={<TeamHome />} />
          <Route path="/t/:token/square/:position" element={<SquareDetail />} />
          <Route path="/t/:token/qr" element={<TeamQR />} />
          <Route path="/t/:token/project" element={<ProjectSubmit />} />
          <Route path="/t/:token/ai-submission" element={<AiSubmission />} />
          <Route path="/claim/:claimSlug" element={<ClaimQr />} />
          <Route path="/booth/deepfake" element={<BoothDeepfake />} />
          <Route path="/scoreboard" element={<Scoreboard />} />
          <Route path="/admin" element={<AdminLogin />} />
          <Route path="/admin/queue" element={<ApprovalQueue />} />
          <Route path="/admin/teams" element={<TeamsManage />} />
          <Route path="/admin/game" element={<GameControls />} />
          <Route path="/admin/draw" element={<DrawSpin />} />
          <Route path="/admin/fanfavs" element={<FanFavs />} />
          <Route path="/admin/ai" element={<AiSubmissions />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App
