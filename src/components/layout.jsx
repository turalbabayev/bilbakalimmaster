import React, { useState, createContext, useContext } from "react";
import Header from "./header";

// Sidebar durumu için context
export const SidebarContext = createContext();

export const useSidebar = () => {
    const context = useContext(SidebarContext);
    if (!context) {
        throw new Error('useSidebar must be used within SidebarProvider');
    }
    return context;
};

const Layout = ({ children }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    return (
        <SidebarContext.Provider value={{ isSidebarOpen, setIsSidebarOpen }}>
            <Header />
            <div 
                className={`transition-all duration-300 min-h-screen ${
                    isSidebarOpen ? 'lg:ml-64' : 'lg:ml-16'
                }`}
            >
                {children}
            </div>
        </SidebarContext.Provider>
    );
};

export default Layout;