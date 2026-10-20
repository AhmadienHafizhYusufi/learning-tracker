import Link from "next/link";

export default function NotFound() {
  return (
    <div className="card mx-auto max-w-md p-6 text-center">
      <h2 className="font-semibold">Halaman tidak ditemukan</h2>
      <Link href="/topics" className="btn-ghost mt-4">
        Kembali ke daftar topik
      </Link>
    </div>
  );
}
