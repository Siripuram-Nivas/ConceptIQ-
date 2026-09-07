import { BrowserRouter, Routes, Route } from 'react-router-dom';
import type { ReactNode } from 'react';
import { ProtectedRoute, PublicOnlyRoute } from './auth/auth-provider';
import { AppShell } from './components/Navigation';

// ── Pages ─────────────────────────────────────────────────────────────────────
import { LandingPage } from './pages/LandingPage';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { LearnPage } from './pages/LearnPage';
import { MaterialPage } from './pages/MaterialPage';
import { TeachPage } from './pages/TeachPage';
import { AnalysisPage } from './pages/AnalysisPage';
import { RepairPage } from './pages/RepairPage';
import { MasteryPage } from './pages/MasteryPage';
import { KnowledgeMapPage } from './pages/KnowledgeMapPage';
import { DemoPage } from './pages/DemoPage';
import { ProfilePage } from './pages/ProfilePage';
import { AddMaterialPage } from './pages/AddMaterialPage';
import { MaterialOverviewPage } from './pages/MaterialOverviewPage';
import { TeachMaterialPage } from './pages/TeachMaterialPage';
import { MyStudySpacesPage } from './pages/MyStudySpacesPage';
import { StudySpaceDetailPage } from './pages/StudySpaceDetailPage';
import { NotFoundPage } from './pages/NotFoundPage';

// Convenience wrapper to reduce repetition
function P({ children }: { children: ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}

export default function App() {
  return (
    <BrowserRouter>
      {/* Atmospheric Background Layer (Moved outside AppShell so it spans everything) */}
      <div className="fixed inset-0 z-[-1] bg-bg overflow-hidden pointer-events-none">
        <div className="atmospheric-bg">
          <div className="atmospheric-glow-purple" />
          <div className="atmospheric-glow-blue" />
        </div>
      </div>

      <AppShell>
        <Routes>
          {/* ── Public routes (no auth required) ──────────────────────── */}
          <Route path="/"       element={<LandingPage />} />
          <Route path="/demo"   element={<DemoPage />} />
          <Route path="/login"  element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
          <Route path="/signup" element={<PublicOnlyRoute><SignupPage /></PublicOnlyRoute>} />

          {/* ── Protected routes (auth required) ──────────────────────── */}
          <Route path="/home"                           element={<P><HomePage /></P>} />
          <Route path="/onboarding"                     element={<P><OnboardingPage /></P>} />
          <Route path="/learn"                          element={<P><LearnPage /></P>} />
          <Route path="/learn/:slug"                    element={<P><MaterialPage /></P>} />
          <Route path="/teach/:slug"                    element={<P><TeachPage /></P>} />
          <Route path="/add-material"                   element={<P><AddMaterialPage /></P>} />
          <Route path="/add-material-to-space/:spaceId" element={<P><AddMaterialPage /></P>} />
          <Route path="/material-overview"              element={<P><MaterialOverviewPage /></P>} />
          <Route path="/material-overview/:materialId"  element={<P><MaterialOverviewPage /></P>} />
          <Route path="/teach-material/:materialId"     element={<P><TeachMaterialPage /></P>} />
          <Route path="/study-spaces"                   element={<P><MyStudySpacesPage /></P>} />
          <Route path="/study-space/:spaceId"           element={<P><StudySpaceDetailPage /></P>} />
          <Route path="/knowledge-map/:spaceId"         element={<P><KnowledgeMapPage /></P>} />
          <Route path="/analysis"                       element={<P><AnalysisPage /></P>} />
          <Route path="/repair"                         element={<P><RepairPage /></P>} />
          <Route path="/mastery"                        element={<P><MasteryPage /></P>} />
          <Route path="/map"                            element={<P><KnowledgeMapPage /></P>} />
          <Route path="/profile"                        element={<P><ProfilePage /></P>} />
          <Route path="*"                               element={<NotFoundPage />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}
