import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import MainPage from "./pages/MainPage";
import DenemeSinavlariPage from './pages/DenemeSinavlari/DenemeSinavlariPage';
import Header from './components/header';
import { Toaster } from "react-hot-toast";

function App() {
    return (
        <Router>
            <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
                <Header />
                <Toaster
                    position="top-center"
                    reverseOrder={false}
                    gutter={8}
                    toastOptions={{
                        duration: 3000,
                        style: {
                            background: '#363636',
                            color: '#fff',
                        },
                    }}
                />
                <Routes>
                    <Route path="/" element={<MainPage />} />
                    <Route path="/deneme-sinavlari" element={<DenemeSinavlariPage />} />
                    <Route path="/*" element={<MainPage />} />
                </Routes>
            </div>
        </Router>
    );
}

export default App; 