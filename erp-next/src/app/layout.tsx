import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import ClientApprovalButton from "@/components/ui/ClientApprovalButton";

const poppins = Poppins({
    variable: "--font-poppins",
    subsets: ["latin"],
    weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
    title: "Web ERP EPU - Budgeting",
    description: "PT Eran Plastindo utama",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={`${poppins.variable} font-sans antialiased`}>
                {children}
                <ClientApprovalButton />
            </body>
        </html>
    );
}
