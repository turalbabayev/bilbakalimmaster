import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import LoginPage from "./pages/login_page";
import HomePage from './pages/MainPage/home_page';
import QuestionsPage from './pages/MainPage/questions_page';
import QuestionContent from './pages/MainPage/question_content_page';
import SubbranchContent from './pages/MainPage/subbranch_content';
import AnnouncementPage from './pages/MainPage/announcement_page';
import GamesPage from './pages/MainPage/games_page';
import NotesPage from './pages/MainPage/notes_page';
import UsersPage from './pages/MainPage/users_page';
import DeleteAccountPage from './pages/DeleteAccount';
import ProtectedRouter from './routes/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import DenemeSinavlariPage from './pages/MainPage/deneme-sinavlari';
import CreateExamPage from './pages/MainPage/create-exam';
import QuestionBankPage from './pages/MainPage/question-bank';
import ExamListPage from './pages/MainPage/exam-list';
import ExamResultsPage from './pages/MainPage/exam-results';
import ExamStatsPage from './pages/MainPage/exam-stats';

function App() {
    return (
        <AuthProvider>
            <Router>
                <Toaster position="top-right" />
                <Routes>
                    <Route path="/" element={<LoginPage />} />
                    <Route path='/home' element={<ProtectedRouter><HomePage /></ProtectedRouter>} />
                    <Route path='/question' element={<ProtectedRouter><QuestionsPage /></ProtectedRouter>} />
                    <Route path='/question/:id' element={<ProtectedRouter><QuestionContent /></ProtectedRouter>}/>
                    <Route path='/question/:konuId/:altKonuId' element={<ProtectedRouter><SubbranchContent/></ProtectedRouter>} />
                    <Route path='/announcements' element={<ProtectedRouter><AnnouncementPage /></ProtectedRouter>} />
                    <Route path='/games' element={<ProtectedRouter><GamesPage /></ProtectedRouter>} />
                    <Route path='/notes' element={<ProtectedRouter><NotesPage /></ProtectedRouter>} />
                    <Route path='/users' element={<ProtectedRouter><UsersPage /></ProtectedRouter>} />
                    <Route path='/delete-account' element={<DeleteAccountPage />} />
                    <Route path='/deneme-sinavlari' element={<ProtectedRouter><DenemeSinavlariPage /></ProtectedRouter>} />
                    <Route path="/deneme-sinavlari/olustur" element={<ProtectedRouter><CreateExamPage /></ProtectedRouter>} />
                    <Route path="/deneme-sinavlari/soru-bankasi" element={<ProtectedRouter><QuestionBankPage /></ProtectedRouter>} />
                    <Route path="/deneme-sinavlari/liste" element={<ProtectedRouter><ExamListPage /></ProtectedRouter>} />
                    <Route path="/deneme-sinavlari/sonuclar" element={<ProtectedRouter><ExamResultsPage /></ProtectedRouter>} />
                    <Route path="/deneme-sinavlari/istatistikler" element={<ProtectedRouter><ExamStatsPage /></ProtectedRouter>} />
                </Routes>
            </Router>
        </AuthProvider>
    );
}

export default App;