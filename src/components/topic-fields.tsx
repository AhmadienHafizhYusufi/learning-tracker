import type { Topic } from "@/db/schema";
import { STATUS_LABEL, STATUS_ORDER } from "@/lib/format";

/** Field form topik, dipakai untuk tambah & edit */
export function TopicFields({
  topic,
  categories,
}: {
  topic?: Pick<Topic, "title" | "category" | "description" | "status">;
  categories: string[];
}) {
  return (
    <>
      <div className="sm:col-span-2">
        <label className="label" htmlFor="title">
          Judul topik
        </label>
        <input
          id="title"
          name="title"
          required
          maxLength={200}
          defaultValue={topic?.title}
          placeholder="mis. React Hooks"
          className="input"
        />
      </div>
      <div>
        <label className="label" htmlFor="category">
          Kategori
        </label>
        <input
          id="category"
          name="category"
          list="category-list"
          defaultValue={topic?.category ?? ""}
          placeholder="mis. Frontend"
          className="input"
        />
        <datalist id="category-list">
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </div>
      <div>
        <label className="label" htmlFor="status">
          Status
        </label>
        <select id="status" name="status" defaultValue={topic?.status ?? "todo"} className="input">
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor="description">
          Deskripsi / tujuan
        </label>
        <textarea
          id="description"
          name="description"
          rows={2}
          defaultValue={topic?.description ?? ""}
          placeholder="Apa yang ingin dicapai dari topik ini?"
          className="input resize-y"
        />
      </div>
    </>
  );
}
