import { auth, signOut } from "@/auth";

/** Nama/avatar GitHub + tombol keluar. Tidak tampil kalau belum login. */
export async function UserMenu() {
  const session = await auth();
  if (!session?.user) return null;
  const { name, login, image } = session.user;

  return (
    <div className="flex items-center gap-2 border-l border-line pl-3">
      {image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" className="size-7 rounded-full border border-line" />
      )}
      <span className="hidden text-sm text-muted md:inline">{login ?? name}</span>
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}
      >
        <button type="submit" className="rounded-md px-2 py-1.5 text-sm text-muted hover:text-danger">
          Keluar
        </button>
      </form>
    </div>
  );
}
