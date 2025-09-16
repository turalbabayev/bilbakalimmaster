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
import CreateExamBuilderPage from './pages/MainPage/create-exam-builder';
import CreateExamStep2Page from './pages/MainPage/create-exam-step2';
import CreateExamStep3Page from './pages/MainPage/create-exam-step3';
import CreateExamStep4Page from './pages/MainPage/create-exam-step4';
import SoruHavuzuPage from './pages/MainPage/soru-havuzu';
import QuestionBankPage from './pages/MainPage/question-bank';
import ExamListPage from './pages/MainPage/exam-list';
import ExamDetailPage from './pages/MainPage/exam-detail';
import ExamEditPage from './pages/MainPage/exam-edit';
import ExamResultsPage from './pages/MainPage/exam-results';
import ExamStatsPage from './pages/MainPage/exam-stats';
import ErrorLogsPage from './pages/MainPage/error_logs_page';
import NotificationsPage from './pages/MainPage/notifications_page';
import KonuStatsPage from './pages/MainPage/konu_stats_page';
import PDFBankPage from './pages/MainPage/pdf_bank_page';
import MeetingArchivePage from './pages/MainPage/meeting_archive_page';
import MobileSettingsPage from './pages/MainPage/mobile_settings';
import TekerlemePage from './pages/MainPage/tekerleme_page';
import AppFeedbackPage from './pages/MainPage/app_feedback_page';
import PodcastPage from './pages/MainPage/podcast_page';
import PodcastUnitsPage from './pages/MainPage/podcast_units';
import FAQPage from './pages/MainPage/faq_page';
import DraftsPage from './pages/MainPage/drafts_page';

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
                    <Route path='/bildirimler' element={<ProtectedRouter><NotificationsPage /></ProtectedRouter>} />
                    <Route path='/users' element={<ProtectedRouter><UsersPage /></ProtectedRouter>} />
                    <Route path='/delete-account' element={<DeleteAccountPage />} />
                    <Route path='/deneme-sinavlari' element={<ProtectedRouter><DenemeSinavlariPage /></ProtectedRouter>} />
                    <Route path='/create-exam' element={<ProtectedRouter><CreateExamPage /></ProtectedRouter>} />
                    <Route path='/create-exam/new' element={<ProtectedRouter><CreateExamBuilderPage /></ProtectedRouter>} />
                    <Route path='/create-exam/step2' element={<ProtectedRouter><CreateExamStep2Page /></ProtectedRouter>} />
                    <Route path='/create-exam/step3' element={<ProtectedRouter><CreateExamStep3Page /></ProtectedRouter>} />
                    <Route path='/create-exam/step4' element={<ProtectedRouter><CreateExamStep4Page /></ProtectedRouter>} />
                    <Route path='/soru-havuzu' element={<ProtectedRouter><SoruHavuzuPage /></ProtectedRouter>} />
                    <Route path="/deneme-sinavlari/olustur" element={<ProtectedRouter><CreateExamPage /></ProtectedRouter>} />
                    <Route path="/deneme-sinavlari/soru-bankasi" element={<ProtectedRouter><QuestionBankPage /></ProtectedRouter>} />
                    <Route path="/deneme-sinavlari/liste" element={<ProtectedRouter><ExamListPage /></ProtectedRouter>} />
                    <Route path="/deneme-sinavlari/detay/:examId" element={<ProtectedRouter><ExamDetailPage /></ProtectedRouter>} />
                    <Route path="/deneme-sinavlari/duzenle/:examId" element={<ProtectedRouter><ExamEditPage /></ProtectedRouter>} />
                    <Route path="/deneme-sinavlari/sonuclar" element={<ProtectedRouter><ExamResultsPage /></ProtectedRouter>} />
                    <Route path="/deneme-sinavlari/istatistik/:examId" element={<ProtectedRouter><ExamStatsPage /></ProtectedRouter>} />
                    <Route path="/error-logs" element={<ProtectedRouter><ErrorLogsPage /></ProtectedRouter>} />
                    <Route path='/konu-istatistikler' element={<ProtectedRouter><KonuStatsPage /></ProtectedRouter>} />
                    <Route path='/pdf-bank' element={<ProtectedRouter><PDFBankPage /></ProtectedRouter>} />
                    <Route path='/toplanti-arsivi' element={<ProtectedRouter><MeetingArchivePage /></ProtectedRouter>} />
                    <Route path='/mobile-settings' element={<ProtectedRouter><MobileSettingsPage /></ProtectedRouter>} />
                    <Route path='/tekerleme' element={<ProtectedRouter><TekerlemePage /></ProtectedRouter>} />
                    <Route path='/app-feedback' element={<ProtectedRouter><AppFeedbackPage /></ProtectedRouter>} />
                    <Route path='/podcast' element={<ProtectedRouter><PodcastPage /></ProtectedRouter>} />
                    <Route path='/faq' element={<ProtectedRouter><FAQPage /></ProtectedRouter>} />
                    <Route path='/podcast-uniteleri' element={<ProtectedRouter><PodcastUnitsPage /></ProtectedRouter>} />
                    <Route path='/taslaklar/:id' element={<ProtectedRouter><DraftsPage /></ProtectedRouter>} />
                </Routes>
            </Router>
        </AuthProvider>
    );
}

export default App;