import React from "react";
import Header from "./header";

const Layout = ({ children }) => {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
            <Header />
            <main className="flex-1">
                <div className="container mx-auto px-4 py-6">
                    {children}
                </div>
            </main>
            
            <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-4">
                <div className="container mx-auto px-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                    © {new Date().getFullYear()} BilBakalım Admin Panel. Tüm hakları saklıdır.
                </div>
            </footer>
        </div>
    );
};

export default Layout;