import { useEffect, useState } from 'react';
import { Analytics } from '@vercel/analytics/react';
import OnboardingForm from './components/OnboardingForm';
import ResultsPage from './components/ResultsPage';
import ThemeToggle from './components/ThemeToggle';
import MapView from './components/MapView';
import OfficeBrief from './components/OfficeBrief';
import CityAdmin from './components/CityAdmin';
import { activeCity, setActiveCity, useCityConfig } from './cityConfig';

function viewFromHash(hash) {
  if (hash === '#office') return 'office';
  if (hash === '#admin') return 'admin';
  return 'onboarding';
}

function App() {
  const cityState = useCityConfig();
  const city = activeCity(cityState);
  const [view, setView] = useState(() => viewFromHash(window.location.hash)); // 'onboarding' | 'results' | 'map' | 'office' | 'admin'
  const [selectedCategories] = useState([]);
  const [completedProfile, setCompletedProfile] = useState(null);
  const [mapCategories, setMapCategories] = useState([]);

  function openMap(categories = []) {
    setMapCategories(categories);
    setView('map');
  }

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

  if (view === 'map') {
    return <><Analytics /><ThemeToggle /><MapView onBack={() => setView('onboarding')} initialCategories={mapCategories} city={city} /></>;
  }

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
          onOpenMap={() => openMap()}
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
          onOpenMap={() => openMap()}
          onOpenCamp={() => openMap(['campground', 'safe_parking'])}
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
        onOpenMap={() => openMap()}
      />
    </>
  );
}

export default App;
