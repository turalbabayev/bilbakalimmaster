import ImportQuestionsFromDocx from "./components/ImportQuestionsFromDocx";
import ImportQuestionsFromJSON from "./components/ImportQuestionsFromJSON";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import MainPage from "./pages/MainPage";
import DenemeSinavlariPage from "./pages/DenemeSinavlari/DenemeSinavlariPage";

function App() {
    return (
        <Router>
            <div>
                <Toaster
                    position="top-center"
                    reverseOrder={false}
                    toastOptions={{
                        duration: 3000,
                        style: {
                            background: '#333',
                            color: '#fff',
                        },
                    }}
                />
                <Routes>
                    <Route path="/*" element={<MainPage />} />
                    <Route path="/deneme-sinavlari" element={<DenemeSinavlariPage />} />
                </Routes>
            </div>
        </Router>
    );
}

export default App; 