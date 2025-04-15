import { Outlet } from "react-router-dom";
import Header from "./Header";

const Layout = () => {
    return (
        <>
            <Header />
            <main className="container mx-auto px-4 py-8">
                <Outlet />
            </main>
        </>
    );
};

export default Layout;