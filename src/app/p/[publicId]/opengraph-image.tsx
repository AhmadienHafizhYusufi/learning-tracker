import { ImageResponse } from "next/og";
import { getPublicTopic } from "@/lib/queries";

/*
 * Gambar preview otomatis saat link /p/... ditempel di LinkedIn, WhatsApp, X, dll.
 * Next.js menambahkan <meta property="og:image"> ke halaman secara otomatis.
 */

export const alt = "Catatan belajar di Learning Tracker";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const C = {
  paper: "#f5f3ee",
  card: "#fffefb",
  ink: "#1d1c1a",
  muted: "#6d6a63",
  line: "#e3dfd6",
  accent: "#2f6b4f",
  accentSoft: "#dcebe2",
};

export default async function Image({ params }: { params: Promise<{ publicId: string }> }) {
  const data = await getPublicTopic((await params).publicId);

  const title = data?.topic.title ?? "Topik tidak ditemukan";
  const author = data ? (data.topic.ownerName ?? data.topic.ownerLogin) : "";
  const category = data?.topic.category;
  const sessionCount = data?.sessions.length ?? 0;
  const resourceCount = data?.resourceCount ?? 0;
  const sessionTitles = (data?.sessions ?? []).map((s) => s.title).filter(Boolean).slice(0, 3) as string[];
  const avatar = data?.topic.ownerImage ? await toDataUrl(data.topic.ownerImage) : null;

  const stats = [
    `${sessionCount} sesi belajar`,
    resourceCount > 0 ? `${resourceCount} referensi` : null,
  ].filter(Boolean).join("  ·  ");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: C.paper,
          padding: "56px 64px",
          fontFamily: "sans-serif",
          color: C.ink,
        }}
      >
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              background: C.accent,
              color: C.card,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 26,
              fontWeight: 700,
            }}
          >
            L
          </div>
          <div style={{ fontSize: 26, fontWeight: 600 }}>Learning Tracker</div>
          {category && (
            <div
              style={{
                marginLeft: 12,
                padding: "6px 16px",
                borderRadius: 999,
                background: C.accentSoft,
                color: C.accent,
                fontSize: 22,
                fontWeight: 600,
              }}
            >
              {truncate(category, 28)}
            </div>
          )}
        </div>

        {/* Judul */}
        <div
          style={{
            marginTop: 48,
            fontSize: title.length > 48 ? 58 : 72,
            fontWeight: 700,
            lineHeight: 1.08,
            letterSpacing: -1.5,
            display: "flex",
            maxWidth: 1060,
          }}
        >
          {truncate(title, 90)}
        </div>

        {/* Cuplikan judul sesi */}
        {sessionTitles.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 28 }}>
            {sessionTitles.map((t) => (
              <div key={t} style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 26, color: C.muted }}>
                <div style={{ width: 8, height: 8, borderRadius: 8, background: C.accent }} />
                {truncate(t, 60)}
              </div>
            ))}
          </div>
        )}

        {/* Penulis + angka */}
        <div
          style={{
            marginTop: "auto",
            paddingTop: 28,
            borderTop: `2px solid ${C.line}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatar} width={56} height={56} style={{ borderRadius: 56, border: `2px solid ${C.line}` }} alt="" />
            ) : author ? (
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 56,
                  background: C.ink,
                  color: C.paper,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 26,
                  fontWeight: 700,
                }}
              >
                {author.slice(0, 1).toUpperCase()}
              </div>
            ) : null}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 20, color: C.muted }}>Catatan belajar</div>
              <div style={{ fontSize: 28, fontWeight: 600 }}>{truncate(author, 36)}</div>
            </div>
          </div>
          <div style={{ fontSize: 26, color: C.accent, fontWeight: 600 }}>{stats}</div>
        </div>
      </div>
    ),
    size,
  );
}

function truncate(s: string, max: number) {
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;
}

/** Ambil avatar GitHub sebagai data URL. Gagal (timeout, dll.) → pakai inisial saja. */
async function toDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "image/png";
    if (!/^image\/(png|jpeg|gif)/.test(type)) return null; // format yang didukung ImageResponse
    return `data:${type};base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;
  } catch {
    return null;
  }
}
