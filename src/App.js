import { useEffect, useState } from 'react';
import { Analytics } from '@vercel/analytics/react';
import OnboardingForm from './components/OnboardingForm';
import ResultsPage from './components/ResultsPage';
import ThemeToggle from './components/ThemeToggle';
import OfficeBrief from './components/OfficeBrief';
import AdminGate from './components/AdminGate';
import { setActiveCity } from './cityConfig';

function viewFromLocation() {
  const path = window.location.pathname.replace(/\/$/, '') || '/';
  if (path === '/admin' || window.location.hash === '#admin') return 'admin';
  if (window.location.hash === '#office') return 'office';
  return 'onboarding';
}

function App() {
  const [view, setView] = useState(() => viewFromLocation()); // 'onboarding' | 'results' | 'office' | 'admin'
  const [selectedCategories] = useState([]);
  const [completedProfile, setCompletedProfile] = useState(null);

  function openOffice() {
    window.location.hash = 'office';
    setView('office');
  }

  function openAdmin() {
    window.history.pushState(null, '', '/admin');
    setView('admin');
  }

  function leaveToHome() {
    window.history.pushState(null, '', '/');
    setView('onboarding');
  }

  function previewCity(activeId) {
    const next = activeId === 'charlotte' ? '/#charlotte' : '/';
    window.history.pushState(null, '', next);
    if (activeId === 'charlotte') setActiveCity('charlotte');
    setView('onboarding');
  }

  function handleFormComplete(profile) {
    setCompletedProfile(profile);
    setView('results');
  }

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view]);

  useEffect(() => {
    if (window.location.hash === '#admin') {
      window.history.replaceState(null, '', '/admin');
    }
    if (window.location.hash === '#charlotte') setActiveCity('charlotte');
    function onHash() {
      if (window.location.hash === '#charlotte') setActiveCity('charlotte');
      if (window.location.hash === '#admin') {
        window.history.replaceState(null, '', '/admin');
        setView('admin');
        return;
      }
      if (window.location.hash === '#office') setView('office');
    }
    function onPop() {
      setView(viewFromLocation());
    }
    window.addEventListener('hashchange', onHash);
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('hashchange', onHash);
      window.removeEventListener('popstate', onPop);
    };
  }, []);

  if (view === 'admin') {
    return (
      <>
        <Analytics />
        <ThemeToggle />
        <AdminGate onBack={leaveToHome} onPreview={previewCity} />
      </>
    );
  }

  if (view === 'office') {
    return (
      <>
        <Analytics />
        <ThemeToggle />
        <OfficeBrief
          onBack={leaveToHome}
          onRunCheck={leaveToHome}
        />
      </>
    );
  }

  if (view === 'onboarding') {
    return (
      <>
        <Analytics />
        <ThemeToggle />
        <OnboardingForm
          selectedCategories={selectedCategories}
          onComplete={handleFormComplete}
          onOpenOffice={openOffice}
          onOpenAdmin={openAdmin}
        />
      </>
    );
  }

  return (
    <>
      <Analytics />
      <ThemeToggle />
      <ResultsPage
        profile={completedProfile}
        selectedCategories={selectedCategories}
        onStartOver={() => { setView('onboarding'); setCompletedProfile(null); }}
      />
    </>
  );
}

export default App;
