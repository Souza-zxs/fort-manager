import { Outlet } from "react-router-dom";
import Sidebar from "@/components/Sidebar";

const AppLayout = () => {
  return (
    <div className="min-h-screen">
      <Sidebar />
      <main className="ml-64 min-h-screen p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
