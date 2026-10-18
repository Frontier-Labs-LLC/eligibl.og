import { useEffect, useState } from 'react';
import { Analytics } from '@vercel/analytics/react';
import CategorySelector from './components/CategorySelector';
import OnboardingForm from './components/OnboardingForm';
import ResultsPage from './components/ResultsPage';
import ThemeToggle from './components/ThemeToggle';
import MapView from './components/MapView';
import OfficeBrief from './components/OfficeBrief';

function App() {
  const [view, setView] = useState(() => (
    window.location.hash === '#office' ? 'office' : 'categories'
  )); // 'categories' | 'onboarding' | 'results' | 'map' | 'office'
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [completedProfile, setCompletedProfile] = useState(null);

  function openOffice() {
    window.location.hash = 'office';
    setView('office');
  }

  function leaveOffice() {
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    setView('categories');
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

  if (view === 'map') {
    return <><Analytics /><ThemeToggle /><MapView onBack={() => setView('categories')} /></>;
  }

  if (view === 'office') {
    return (
      <>
        <Analytics />
        <ThemeToggle />
        <OfficeBrief
          onBack={leaveOffice}
          onRunCheck={leaveOffice}
          onOpenMap={() => setView('map')}
        />
      </>
    );
  }

  if (view === 'categories') {
    return <><Analytics /><ThemeToggle /><CategorySelector onApply={handleCategoryApply} onOpenMap={() => setView('map')} onOpenOffice={openOffice} /></>;
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
        onOpenMap={() => setView('map')}
      />
    </>
  );
}

export default App;
