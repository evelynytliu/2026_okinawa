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
      <body suppressHydrationWarning={true}>
        {String(process.env.NEXT_PUBLIC_DEMO_MODE).toLowerCase() === 'true' && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            background: '#ff9800',
            color: 'white',
            textAlign: 'center',
            fontSize: '12px',
            zIndex: 9999,
            padding: '4px',
            fontWeight: 'bold',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            ⚠️ 範例模式 (使用模擬資料) - 不會儲存變更
          </div>
        )}
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
