import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { BottomNavigation } from './components/BottomNavigation';
import { HomePage } from './pages/HomePage';
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

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-bg">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/learn" element={<LearnPage />} />
          <Route path="/learn/:slug" element={<MaterialPage />} />
          <Route path="/teach/:slug" element={<TeachPage />} />
          <Route path="/add-material" element={<AddMaterialPage />} />
          <Route path="/add-material-to-space/:spaceId" element={<AddMaterialPage />} />
          <Route path="/material-overview" element={<MaterialOverviewPage />} />
          <Route path="/material-overview/:materialId" element={<MaterialOverviewPage />} />
          <Route path="/teach-material/:materialId" element={<TeachMaterialPage />} />
          <Route path="/study-spaces" element={<MyStudySpacesPage />} />
          <Route path="/study-space/:spaceId" element={<StudySpaceDetailPage />} />
          <Route path="/knowledge-map/:spaceId" element={<KnowledgeMapPage />} />
          <Route path="/analysis" element={<AnalysisPage />} />
          <Route path="/repair" element={<RepairPage />} />
          <Route path="/mastery" element={<MasteryPage />} />
          <Route path="/map" element={<KnowledgeMapPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/demo" element={<DemoPage />} />
        </Routes>
        <BottomNavigation />
      </div>
    </BrowserRouter>
  );
}
