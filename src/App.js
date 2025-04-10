import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/MainPage/home_page";
import Question from "./pages/MainPage/questions_page";
import QuestionContent from "./pages/MainPage/question_content_page";
import Login from "./pages/login_page";
import AnnouncementPage from "./pages/MainPage/announcement_page";
import UserList from "./pages/Users/UserList";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Toaster } from 'react-hot-toast';
import ProtectedRouter from './routes/ProtectedRoute';

function App() {
  return (
    <Router>
      <Routes>
        <Route
          path="/home"
          element={
            <ProtectedRouter>
              <Home />
            </ProtectedRouter>
          }
        />
        <Route
          path="/question"
          element={
            <ProtectedRouter>
              <Question />
            </ProtectedRouter>
          }
        />
        <Route
          path="/question/:id"
          element={
            <ProtectedRouter>
              <QuestionContent />
            </ProtectedRouter>
          }
        />
        <Route
          path="/announcements"
          element={
            <ProtectedRouter>
              <AnnouncementPage />
            </ProtectedRouter>
          }
        />
        <Route
          path="/users"
          element={
            <ProtectedRouter>
              <UserList />
            </ProtectedRouter>
          }
        />
        <Route path="/" element={<Login />} />
        <Route path="*" element={<Navigate to="/" />} />
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
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#333',
            color: '#fff',
          },
        }}
      />
    </Router>
  );
}

export default App;
