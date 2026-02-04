import "./globals.css";

export const metadata = {
    title: "인스타그램 게시물 메타데이터 뷰어",
    description: "인스타그램 게시물 URL로 공개 메타데이터를 확인하세요"
};

export default function RootLayout({
    children
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="ko">
            <body>{children}</body>
        </html>
    );
}
