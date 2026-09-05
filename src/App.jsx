import { Routes, Route } from 'react-router-dom'

import Nav from './components/Nav'
import Hero from './components/Hero'
import ProductShowcase from './components/ProductShowcase'
import Capabilities from './components/Capabilities'
import TrustMetrics from './components/TrustMetrics'
import HowItWorks from './components/HowItWorks'
import ThreeQuestions from './components/ThreeQuestions'
import BrokerBanner from './components/BrokerBanner'
import Faq from './components/Faq'
import FinalCta from './components/FinalCta'
import Footer from './components/Footer'
import MobileTabBar from './components/MobileTabBar'
import FloatingAdvisorButton from './components/FloatingAdvisorButton'
import ChatPage from './components/ChatPage'
import PropertyValuations from './components/PropertyValuations'
import AreasListPage from './components/areas/AreasListPage'
import AreaDetailPage from './components/areas/AreaDetailPage'
import LoginPage from './pages/LoginPage';
import Registration from './pages/Registration';
import ValuationForm from './pages/ValuationForm';   
import Report from './pages/Report'; 
import LandingPage from "./pages/LandingPage";


function LandingPage() {
  return (
    <div className="bg-cream text-ink pb-24 md:pb-0">
      <Nav />
      <Hero />
      <ProductShowcase />
      <Capabilities />
      <TrustMetrics />
      <HowItWorks />
      <ThreeQuestions />
      <BrokerBanner />
      <Faq />
      <FinalCta />
      <Footer />
      <MobileTabBar />
      <FloatingAdvisorButton />
    </div>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/truvalu" element={<LandingPage />} />
      <Route path="/" element={<LandingPage />} />
      <Route path="/chat" element={<ChatPage />} />
      <Route path="/valuations" element={<PropertyValuations />} />
      <Route path="/areas" element={<AreasListPage />} />
      <Route path="/areas/:slug" element={<AreaDetailPage />} />
       <Route path="/loginpage" element={<LoginPage />} />
      <Route path="/register" element={<Registration />} />

       <Route
          path="/valuation"
          element={
            <ValuationForm
              formData={valuationDraft} // ✅ UI-only (starts blank)
              setFormData={setFormData} // ✅ clears UI when set to null
              setReportData={setReportData}
            />
          }
        />

      
<Route path="/report" element={<Report reportData={reportData} />} />
        <Route path="/report/check/:id" element={<Report />} />

    </Routes>
  )
}

export default App
