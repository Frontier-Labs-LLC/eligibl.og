import { useEffect, useState } from 'react';
import { Analytics } from '@vercel/analytics/react';
import OnboardingForm from './components/OnboardingForm';
import ResultsPage from './components/ResultsPage';
import ThemeToggle from './components/ThemeToggle';
import OfficeBrief from './components/OfficeBrief';
import CityAdmin from './components/CityAdmin';
import { setActiveCity } from './cityConfig';

function viewFromHash(hash) {
  if (hash === '#office') return 'office';
  if (hash === '#admin') return 'admin';
  return 'onboarding';
}

function App() {
  const [view, setView] = useState(() => viewFromHash(window.location.hash)); // 'onboarding' | 'results' | 'office' | 'admin'
  const [selectedCategories] = useState([]);
  const [completedProfile, setCompletedProfile] = useState(null);

  function openOffice() {
    window.location.hash = 'office';
    setView('office');
  }

  function openAdmin() {
    window.location.hash = 'admin';
    setView('admin');
  }

  function leaveOffice() {
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
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
    if (window.location.hash === '#charlotte') setActiveCity('charlotte');
    function onHash() {
      if (window.location.hash === '#charlotte') setActiveCity('charlotte');
      if (window.location.hash === '#office' || window.location.hash === '#admin') {
        setView(viewFromHash(window.location.hash));
      }
    }
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  if (view === 'admin') {
    return (
      <>
        <Analytics />
        <ThemeToggle />
        <CityAdmin
          onBack={leaveOffice}
          onPreview={(activeId) => {
            if (activeId === 'charlotte') window.location.hash = 'charlotte';
            else window.history.replaceState(null, '', window.location.pathname + window.location.search);
            setView('onboarding');
          }}
        />
      </>
    );
  }

  if (view === 'office') {
    return (
      <>
        <Analytics />
        <ThemeToggle />
        <OfficeBrief
          onBack={leaveOffice}
          onRunCheck={leaveOffice}
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
