import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

type ApiSuccess = {
    ok: true;
    data: {
        type: "post" | "reel";
        postUrl: string;
        uploadedAtUtc: string;
        uploadedAtKst: string;
        likes: number | null;
        comments: number | null;
        views: number | null;
    };
};

type ApiError = {
    ok: false;
    error: { code: string; message: string };
};

const IG_REGEX =
    /^https:\/\/www\.instagram\.com\/(p|reel)\/[a-zA-Z0-9_-]+\/?(\?.*)?$/;

function toKst(utcIso: string): string {
    const date = new Date(utcIso);
    if (Number.isNaN(date.getTime())) return "";
    const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
    const yyyy = kst.getUTCFullYear();
    const mm = String(kst.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(kst.getUTCDate()).padStart(2, "0");
    const hh = String(kst.getUTCHours()).padStart(2, "0");
    const min = String(kst.getUTCMinutes()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

function extractLdJson($: cheerio.CheerioAPI): any[] {
    const scripts = $('script[type="application/ld+json"]');
    const items: any[] = [];
    scripts.each((_, el) => {
        const raw = $(el).text();
        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) items.push(...parsed);
            else items.push(parsed);
        } catch {
            // ignore invalid JSON
        }
    });
    return items;
}

function normalizeInteraction(stat: any[], type: string) {
    const entry = stat?.find(
        (s) => s?.interactionType?.includes(type) || s?.interactionType === type
    );
    const count = entry?.userInteractionCount;
    return typeof count === "number" ? count : null;
}

export async function POST(req: Request) {
    const body = await req.json();
    const url = String(body?.url || "").trim();

    if (!IG_REGEX.test(url)) {
        return NextResponse.json<ApiError>(
            {
                ok: false,
                error: {
                    code: "INVALID_URL",
                    message: "유효하지 않거나 지원되지 않는 인스타그램 URL입니다."
                }
            },
            { status: 400 }
        );
    }

    const res = await fetch(url, {
        headers: {
            "User-Agent":
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            "Accept-Language": "en-US,en;q=0.9"
        }
    });

    if (res.status === 404) {
        return NextResponse.json<ApiError>(
            {
                ok: false,
                error: { code: "NOT_FOUND", message: "게시물을 찾을 수 없습니다." }
            },
            { status: 404 }
        );
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    const ldItems = extractLdJson($);
    const primary =
        ldItems.find((x) => x?.["@type"] === "VideoObject") ||
        ldItems.find((x) => x?.["@type"] === "ImageObject");

    if (!primary) {
        return NextResponse.json<ApiError>(
            {
                ok: false,
                error: {
                    code: "PARSING_FAILED",
                    message: "게시물 메타데이터를 읽을 수 없습니다."
                }
            },
            { status: 422 }
        );
    }

    const uploadedAtUtc = primary.uploadDate || primary.datePublished;
    if (!uploadedAtUtc) {
        return NextResponse.json<ApiError>(
            {
                ok: false,
                error: { code: "PARSING_FAILED", message: "업로드 시간을 찾을 수 없습니다." }
            },
            { status: 422 }
        );
    }

    const isReel = url.includes("/reel/") || primary["@type"] === "VideoObject";
    const stats = primary.interactionStatistic || [];
    const likes = normalizeInteraction(stats, "https://schema.org/LikeAction");
    const comments = normalizeInteraction(stats, "https://schema.org/CommentAction");
    const views = isReel
        ? normalizeInteraction(stats, "https://schema.org/ViewAction")
        : null;

    const postUrl =
        $('meta[property="og:url"]').attr("content")?.trim() || url;

    const data = {
        type: isReel ? "reel" : "post",
        postUrl,
        uploadedAtUtc,
        uploadedAtKst: toKst(uploadedAtUtc),
        likes,
        comments,
        views
    };

    return NextResponse.json<ApiSuccess>({ ok: true, data });
}

