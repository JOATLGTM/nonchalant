import { BrowserRouter, Routes, Route } from 'react-router';
import { NonchalantPage } from './components/NonchalantPage';
import { ReservationsList } from './components/ReservationsList';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<NonchalantPage />} />
        <Route path="/reservations-list" element={<ReservationsList />} />
      </Routes>
    </BrowserRouter>
  );
}
