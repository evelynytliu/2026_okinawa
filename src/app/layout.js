import Navbar from "@/components/ui/Navbar";
import { TripProvider } from "@/context/TripContext";
import "./globals.css";

export const metadata = {
  title: "OKINAWA 2026",
  description: "Trip Dashboard for Okinawa 2026",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#4DD0E1",
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-TW">
      <body>
        <TripProvider>
          <div className="container" style={{ paddingBottom: '80px' }}>
            {children}
          </div>
          <Navbar />
        </TripProvider>
      </body>
    </html>
  );
}
