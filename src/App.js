import logo from './logo.svg';
import './App.css';
import LoginPage from './pages/login_page';
import HomePage from './pages/MainPage/home_page';
import QuestionsPage from './pages/MainPage/questions_page';
import QuestionContent from './pages/MainPage/question_content_page';
import SubbranchContent from './pages/MainPage/subbranch_content';
import AnnouncementPage from './pages/MainPage/announcement_page';
import ProtectedRouter from './routes/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  return (
    <AuthProvider>
       <Router>
          <Routes>
            <Route path='/' element={<LoginPage />} />
            <Route path='/home' element={<ProtectedRouter><HomePage /></ProtectedRouter>} />
            <Route path='/question' element={<ProtectedRouter><QuestionsPage /></ProtectedRouter>} />
            <Route path='/question/:id' element={<ProtectedRouter><QuestionContent /></ProtectedRouter>}/>
            <Route path='/question/:konuId/:altKonuId' element={<ProtectedRouter><SubbranchContent/></ProtectedRouter>} />
            <Route path='/announcements' element={<ProtectedRouter><AnnouncementPage /></ProtectedRouter>} />
          </Routes>
          <ToastContainer 
            position="top-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="colored"
          />
        </Router>
    </AuthProvider>
  );
}

export default App;
