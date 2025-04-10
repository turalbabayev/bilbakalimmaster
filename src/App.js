import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/home";
import Question from "./pages/question";
import QuestionContent from "./pages/MainPage/question_content_page";
import Login from "./pages/auth/login";
import PrivateRoute from "./components/PrivateRoute";
import AnnouncementsPage from "./pages/announcements/announcements_page";
import UserList from "./pages/Users/UserList";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <Router>
      <Routes>
        <Route
          path="/home"
          element={
            <PrivateRoute>
              <Home />
            </PrivateRoute>
          }
        />
        <Route
          path="/question"
          element={
            <PrivateRoute>
              <Question />
            </PrivateRoute>
          }
        />
        <Route
          path="/question/:id"
          element={
            <PrivateRoute>
              <QuestionContent />
            </PrivateRoute>
          }
        />
        <Route
          path="/announcements"
          element={
            <PrivateRoute>
              <AnnouncementsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/users"
          element={
            <PrivateRoute>
              <UserList />
            </PrivateRoute>
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
