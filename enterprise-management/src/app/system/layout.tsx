import Navbar from "@/components/Navbar";

export default function SystemLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="pt-14">{children}</main>
    </>
  );
}
