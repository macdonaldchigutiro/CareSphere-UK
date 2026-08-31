import AdminShell from "./components/AdminShell";


export default function AdminDashboardLayout({
  children,
}) {
  return (
    <AdminShell>
      {children}
    </AdminShell>
  );
}