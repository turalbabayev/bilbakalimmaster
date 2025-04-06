import React from "react";
import Header from "./header";

const Layout = ({ children }) => {
    return (
        <div>
            <Header />
            <div>
                {children}
            </div>
        </div>
    );
};

export default Layout;