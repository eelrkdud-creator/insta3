"use client";

import { useState } from "react";

type PostMetadata = {
    type: "post" | "reel";
    postUrl: string;
    uploadedAtUtc: string;
    uploadedAtKst: string;
    likes: number | null;
    comments: number | null;
    views: number | null;
};

type ApiResponse =
    | { ok: true; data: PostMetadata }
    | { ok: false; error: { code: string; message: string } };

export default function HomePage() {
    const [url, setUrl] = useState("");
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
        "idle"
    );
    const [result, setResult] = useState<PostMetadata | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setStatus("loading");
        setError(null);
        setResult(null);

        const res = await fetch("/api/inspect", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url })
        });

        const data: ApiResponse = await res.json();

        if (!data.ok) {
            setStatus("error");
            setError(data.error.message);
            return;
        }

        setResult(data.data);
        setStatus("success");
    }

    return (
        <main>
            <h1>인스타그램 게시물 메타데이터 뷰어</h1>
            <p>공개 인스타그램 게시물 또는 릴스 URL을 붙여넣어 정보를 확인하세요.</p>

            <form onSubmit={handleSubmit}>
                <input
                    placeholder="인스타그램 게시물 URL을 여기에 붙여넣으세요"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                />
                <button disabled={status === "loading"}>
                    {status === "loading" ? "불러오는 중..." : "가져오기"}
                </button>
            </form>

            {status === "error" && <div className="error">{error}</div>}

            {result && (
                <div className="card">
                    <div className="row">
                        <div className="label">게시물 유형</div>
                        <div>{result.type === "reel" ? "릴스" : "게시물"}</div>
                    </div>
                    <div className="row">
                        <div className="label">업로드 시간 (KST)</div>
                        <div>{result.uploadedAtKst}</div>
                    </div>
                    <div className="row">
                        <div className="label">❤️ 좋아요</div>
                        <div>{result.likes ?? "없음"}</div>
                    </div>
                    <div className="row">
                        <div className="label">💬 댓글</div>
                        <div>{result.comments ?? "없음"}</div>
                    </div>
                    {result.type === "reel" && (
                        <div className="row">
                            <div className="label">▶️ 조회수</div>
                            <div>{result.views ?? "없음"}</div>
                        </div>
                    )}
                    <div className="row">
                        <div className="label">🔗 링크</div>
                        <a href={result.postUrl} target="_blank" rel="noreferrer">
                            원본 게시물 보기
                        </a>
                    </div>
                </div>
            )}
        </main>
    );
}
