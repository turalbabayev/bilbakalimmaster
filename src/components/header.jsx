import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";

const Header = () => {
    const navigate = useNavigate();

    const handleSignOut = async () => {
        try {
            await signOut(auth);
            alert("Başarıyla çıkış yaptınız.");
            navigate("/", { replace: true });
        } catch (error) {
            console.error("Çıkış yapılırken bir hata oluştu: ", error);
            alert("Çıkış yapılamadı. Lütfen tekrar deneyiniz.");
        }
    };

    return (
        <header className="bg-indigo-500 shadow-lg">
            <div className="container mx-auto px-4 py-3 flex justify-between items-center">
                <nav className="flex items-center gap-4 space-x-6">
                    <Link to="/home" className="text-white hover:text-blue-600 font-bold">
                        Ana Sayfa
                    </Link>
                    <Link to="/question" className="text-white hover:text-blue-600 font-bold">
                        Sorular
                    </Link>
                    <Link to="/announcements" className="text-white hover:text-blue-600 font-bold">
                        Duyurular
                    </Link>
                </nav>
                <button
                    onClick={handleSignOut}
                    className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 focus:outline-none"
                >
                    Çıkış Yap
                </button>
            </div>
        </header>
    );
};

export default Header;