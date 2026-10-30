import { useEffect, useState } from 'react';
import { Analytics } from '@vercel/analytics/react';
import CategorySelector from './components/CategorySelector';
import OnboardingForm from './components/OnboardingForm';
import ResultsPage from './components/ResultsPage';
import ThemeToggle from './components/ThemeToggle';
import MapView from './components/MapView';
import { activeCity, setActiveCity, useCityConfig } from './cityConfig';

function App() {
  const cityState = useCityConfig();
  const city = activeCity(cityState);
  const [view, setView] = useState('categories'); // 'categories' | 'onboarding' | 'results' | 'map'
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
    if (window.location.hash === '#charlotte') setActiveCity('charlotte');
    function onHash() {
      if (window.location.hash === '#charlotte') setActiveCity('charlotte');
    }
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

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
