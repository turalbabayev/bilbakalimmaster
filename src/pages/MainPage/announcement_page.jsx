import React from "react";
import Layout from "../../components/layout";
import AnnouncementList from "../../components/announcementList";

function AnnouncementPage() {
    return (
        <Layout>
            <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
                <AnnouncementList />
            </div>
        </Layout>
    );
}

export default AnnouncementPage; 