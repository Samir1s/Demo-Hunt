import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingScreen from './screens/LandingScreen';
import LobbyScreen from './screens/LobbyScreen';
import CharacterSelectionScreen from './screens/CharacterSelectionScreen';
import RoleRevealScreen from './screens/RoleRevealScreen';
import RadarScreen from './screens/RadarScreen';
import ErrorToast from './components/ErrorToast';
import CrtOverlay from './components/CrtOverlay';
import { useGameStore } from './store/gameStore';

function GameRouter() {
  const { phase, subPhase } = useGameStore();

  // If in RUNNING phase, override routing based on subPhase
  if (phase === 'RUNNING') {
    if (subPhase === 'CHARACTER_SELECTION') {
      return <CharacterSelectionScreen />;
    }
    if (subPhase === 'ROLE_REVEAL') {
      return <RoleRevealScreen />;
    }
    if (subPhase === 'MAIN_GAME') {
      return <RadarScreen />;
    }
  }

  return (
    <Routes>
      <Route path="/" element={<LandingScreen />} />
      <Route path="/lobby" element={<LobbyScreen />} />
    </Routes>
  );
}

function App() {
  const { connect } = useGameStore();

  // Auto-connect on mount
  import.meta.hot || connect();

  return (
    <BrowserRouter>
      {/* Global Overlays */}
      <CrtOverlay />
      <ErrorToast />

      <GameRouter />
    </BrowserRouter>
  );
}

export default App;
