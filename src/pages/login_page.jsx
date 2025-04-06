import React, { useState, useEffect, useContext } from "react";
import { replace, useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import { AuthContext } from "../context/AuthContext";

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

        const allowedEmail = "bilbakalim981@gmail.com";
        const allowedPassword = "bilbakalim";

        if (email !== allowedEmail || password !== allowedPassword) {
            setError("Yetkisiz giriş");
            // alert("Yetkisiz Giriş");
            return;
        }

        try {
            await signInWithEmailAndPassword(auth, email, password);
            alert("Giriş Başarılı.");
            navigate("/home", { replace: true });
        } catch (err) {
            setError("Giriş başarısız! Bilgilerinizi kontrol edin.");
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