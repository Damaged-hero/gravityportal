import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import TrainingData from './pages/TrainingData';
import User from './pages/User';
import './App.css';

function AppShell() {
  const { isDark } = useTheme();
  return (
    <div className={`app-root ${isDark ? 'dark' : 'light'}`}>
      <Navbar />
      <div className="app-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/training-data" element={<TrainingData />} />
          <Route path="/user" element={<User />} />
        </Routes>
      </div>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </ThemeProvider>
  );
}
