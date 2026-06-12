import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Splash from './pages/Splash'
import TeamHome from './pages/TeamHome'

const ScanLanding = lazy(() => import('./pages/ScanLanding'))
const SquareDetail = lazy(() => import('./pages/SquareDetail'))
const TeamQR = lazy(() => import('./pages/TeamQR'))
const ProjectSubmit = lazy(() => import('./pages/ProjectSubmit'))
const AiSubmission = lazy(() => import('./pages/AiSubmission'))
const ClaimQr = lazy(() => import('./pages/ClaimQr'))
const ClaimQrDisplay = lazy(() => import('./pages/ClaimQrDisplay'))
const BoothDeepfake = lazy(() => import('./pages/BoothDeepfake'))
const Scoreboard = lazy(() => import('./pages/Scoreboard'))
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'))
const ApprovalQueue = lazy(() => import('./pages/admin/ApprovalQueue'))
const TeamsManage = lazy(() => import('./pages/admin/TeamsManage'))
const GameControls = lazy(() => import('./pages/admin/GameControls'))
const DrawSpin = lazy(() => import('./pages/admin/DrawSpin'))
const FanFavs = lazy(() => import('./pages/admin/FanFavs'))
const AiSubmissions = lazy(() => import('./pages/admin/AiSubmissions'))
const Submissions = lazy(() => import('./pages/admin/Submissions'))
const Photos = lazy(() => import('./pages/admin/Photos'))
const AccessLog = lazy(() => import('./pages/admin/AccessLog'))
const Round2Draw = lazy(() => import('./pages/admin/Round2Draw'))

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
          <Route path="/scan/:token" element={<ScanLanding />} />
          <Route path="/t/:token/square/:position" element={<SquareDetail />} />
          <Route path="/t/:token/qr" element={<TeamQR />} />
          <Route path="/t/:token/project" element={<ProjectSubmit />} />
          <Route path="/t/:token/ai-submission" element={<AiSubmission />} />
          <Route path="/claim/:claimSlug/qr" element={<ClaimQrDisplay />} />
          <Route path="/claim/:claimSlug" element={<ClaimQr />} />
          <Route path="/booth/deepfake" element={<BoothDeepfake />} />
          <Route path="/live" element={<Scoreboard />} />
          <Route path="/scoreboard" element={<Navigate to="/live" replace />} />
          <Route path="/admin" element={<AdminLogin />} />
          <Route path="/admin/queue" element={<ApprovalQueue />} />
          <Route path="/admin/teams" element={<TeamsManage />} />
          <Route path="/admin/game" element={<GameControls />} />
          <Route path="/admin/draw" element={<DrawSpin />} />
          <Route path="/admin/fanfavs" element={<FanFavs />} />
          <Route path="/admin/ai" element={<AiSubmissions />} />
          <Route path="/admin/submissions" element={<Submissions />} />
          <Route path="/admin/photos" element={<Photos />} />
          <Route path="/admin/access" element={<AccessLog />} />
          <Route path="/admin/round2" element={<Round2Draw />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App
