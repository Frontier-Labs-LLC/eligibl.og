import { useEffect, useState } from 'react';
import { Analytics } from '@vercel/analytics/react';
import CategorySelector from './components/CategorySelector';
import OnboardingForm from './components/OnboardingForm';
import ResultsPage from './components/ResultsPage';
import ThemeToggle from './components/ThemeToggle';
import MapView from './components/MapView';
import AdminGate from './components/AdminGate';
import { activeCity, setActiveCity, useCityConfig } from './cityConfig';

function viewFromLocation() {
  const path = window.location.pathname.replace(/\/$/, '') || '/';
  if (path === '/admin' || window.location.hash === '#admin') return 'admin';
  return 'categories';
}

function App() {
  const cityState = useCityConfig();
  const city = activeCity(cityState);
  const [view, setView] = useState(viewFromLocation); // 'categories' | 'onboarding' | 'results' | 'map' | 'admin'
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [completedProfile, setCompletedProfile] = useState(null);
  const [mapCategories, setMapCategories] = useState([]);

  function openMap(categories = []) {
    setMapCategories(categories);
    setView('map');
  }

  function handleCategoryApply(cats) {
    setSelectedCategories(cats);
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
      }
    }
    function onPop() {
      const path = window.location.pathname.replace(/\/$/, '') || '/';
      if (path === '/admin' || window.location.hash === '#admin') {
        setView('admin');
        return;
      }
      setView((current) => (current === 'admin' ? 'categories' : current));
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
        <AdminGate onBack={() => {
          window.history.pushState(null, '', '/');
          setView('categories');
        }}
        />
      </>
    );
  }

  if (view === 'map') {
    return <><Analytics /><ThemeToggle /><MapView onBack={() => setView('categories')} initialCategories={mapCategories} city={city} /></>;
  }

  if (view === 'categories') {
    return <><Analytics /><ThemeToggle /><CategorySelector onApply={handleCategoryApply} onOpenMap={() => openMap()} /></>;
  }

  if (view === 'onboarding') {
    return (
      <>
        <Analytics />
        <ThemeToggle />
        <OnboardingForm
          selectedCategories={selectedCategories}
          onComplete={handleFormComplete}
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
        onStartOver={() => { setView('categories'); setCompletedProfile(null); setSelectedCategories([]); }}
        onOpenMap={() => openMap()}
      />
    </>
  );
}

export default App;
