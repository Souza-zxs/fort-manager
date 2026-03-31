import Sidebar from "@/components/Sidebar";

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen">
      <Sidebar />
      <main className="ml-64 p-6 lg:p-8 min-h-screen">
        {children}
      </main>
    </div>
  );
};

export default AppLayout;
