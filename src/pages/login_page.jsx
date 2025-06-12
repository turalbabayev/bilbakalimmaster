import React, { useState, useEffect, useContext } from "react";
import { replace, useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import { AuthContext } from "../context/AuthContext";
import { toast } from "react-hot-toast";

function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);

    useEffect(() => {
        if (user) {
            navigate("/home", { replace: true });
        }
    }, [user, navigate]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError(""); // Her denemede hata mesajını sıfırla

        const allowedEmail = "bilbakalim981@gmail.com";
        const allowedPassword = "bilbakalim";

        if (email !== allowedEmail || password !== allowedPassword) {
            setError("Yetkisiz giriş - Lütfen doğru email ve şifreyi giriniz");
            return;
        }

        try {
            // Firebase bağlantı kontrolü
            if (!auth) {
                throw new Error("Firebase Authentication bağlantısı kurulamadı");
            }

            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            if (userCredential.user) {
                toast.success("Giriş başarılı!");
                navigate("/home", { replace: true });
            }
        } catch (err) {
            console.error("Giriş hatası:", err);
            let errorMessage = "Giriş başarısız! ";
            
            if (err.message.includes("503") || err.message.includes("Service Unavailable")) {
                errorMessage = "Firebase servisi şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.";
                toast.error("Sunucu hatası: Servis geçici olarak kullanılamıyor");
            } else {
                switch (err.code) {
                    case 'auth/invalid-email':
                        errorMessage += "Geçersiz email formatı.";
                        break;
                    case 'auth/user-disabled':
                        errorMessage += "Bu hesap devre dışı bırakılmış.";
                        break;
                    case 'auth/user-not-found':
                        errorMessage += "Kullanıcı bulunamadı.";
                        break;
                    case 'auth/wrong-password':
                        errorMessage += "Hatalı şifre.";
                        break;
                    case 'auth/too-many-requests':
                        errorMessage += "Çok fazla başarısız deneme. Lütfen daha sonra tekrar deneyin.";
                        break;
                    case 'auth/network-request-failed':
                        errorMessage = "İnternet bağlantınızı kontrol edin ve tekrar deneyin.";
                        break;
                    default:
                        errorMessage += "Bilgilerinizi kontrol edin.";
                }
            }
            
            setError(errorMessage);
            toast.error(errorMessage);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-md">
                <h2 className="text-2xl font-bold text-center text-gray-700 mb-6">Bankacı Admin Sayfası</h2>
                <form className="space-y-4" onSubmit={handleLogin}>
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-600">Email</label>
                        <input 
                            type="email"
                            id="email"
                            name="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="E-mail giriniz"
                            className="w-full px-4 py-2 mt-2 border border-gray-300 rounded-lg focus:ring focus:ring-indigo-200 focus:outline-none"
                            required 
                        />
                    </div>
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-600">Şifre</label>
                        <input 
                            type="password"
                            id="password"
                            name="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Şifre giriniz"
                            className="w-full px-4 py-2 mt-2 border border-gray-300 rounded-lg focus:ring focus:ring-indigo-200 focus:outline-none"
                            required
                        />
                    </div>
                    {error && <p className="text-sm text-red-500">{error}</p>}
                    <button
                        type="submit" 
                        className=" w-full px-4 py-2 text-white bg-indigo-500 rounded-lg hover:bg-indigo-600 focus:outline-none focus:ring focus:ring-indigo-200"
                    >
                        Giriş Yap
                    </button>
                </form>
            </div>
        </div>
    );  
}

export default LoginPage;