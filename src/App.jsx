import ImportQuestionsFromDocx from "./components/ImportQuestionsFromDocx";
import ImportQuestionsFromJSON from "./components/ImportQuestionsFromJSON";
import { Toaster } from "react-hot-toast";
import { BrowserRouter as Router } from "react-router-dom";

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
        {/* Diğer bileşenler buraya gelecek */}
      </div>
    </Router>
  );
}

export default App; 