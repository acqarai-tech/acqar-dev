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
      <Route path="/" element={<LandingPage />} />
      <Route path="/chat" element={<ChatPage />} />
      <Route path="/valuations" element={<PropertyValuations />} />
      <Route path="/areas" element={<AreasListPage />} />
      <Route path="/areas/:slug" element={<AreaDetailPage />} />
       <Route path="/loginpage" element={<LoginPage />} />
    </Routes>
  )
}

export default App
