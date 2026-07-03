import { Route, Routes } from 'react-router-dom'
import { HomePage } from './pages/HomePage'
import { HistoryPage } from './pages/HistoryPage'
import { QuizGeneratorPage } from './pages/QuizGeneratorPage'
import { SettingsPage } from './pages/SettingsPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/quiz" element={<QuizGeneratorPage />} />
      <Route path="/history" element={<HistoryPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="*" element={<HomePage />} />
    </Routes>
  )
}

export default App
