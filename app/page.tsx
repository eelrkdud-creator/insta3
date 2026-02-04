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
      <h1>Instagram Post Metadata Viewer</h1>
      <p>Paste a public Instagram post or reel URL to view metadata.</p>

      <form onSubmit={handleSubmit}>
        <input
          placeholder="Paste an Instagram post URL here"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <button disabled={status === "loading"}>
          {status === "loading" ? "Fetching..." : "Fetch"}
        </button>
      </form>

      {status === "error" && <div className="error">{error}</div>}

      {result && (
        <div className="card">
          <div className="row">
            <div className="label">Post Type</div>
            <div>{result.type === "reel" ? "Reel" : "Post"}</div>
          </div>
          <div className="row">
            <div className="label">Upload Time (KST)</div>
            <div>{result.uploadedAtKst}</div>
          </div>
          <div className="row">
            <div className="label">❤️ Likes</div>
            <div>{result.likes ?? "N/A"}</div>
          </div>
          <div className="row">
            <div className="label">💬 Comments</div>
            <div>{result.comments ?? "N/A"}</div>
          </div>
          {result.type === "reel" && (
            <div className="row">
              <div className="label">▶️ Views</div>
              <div>{result.views ?? "N/A"}</div>
            </div>
          )}
          <div className="row">
            <div className="label">🔗 Link</div>
            <a href={result.postUrl} target="_blank">
              View Original Post
            </a>
          </div>
        </div>
      )}
    </main>
  );
}
