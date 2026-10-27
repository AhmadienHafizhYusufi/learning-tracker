import { mergeAttributes, Node } from "@tiptap/react";

declare module "@tiptap/react" {
  interface Commands<ReturnType> {
    caption: {
      /** Ubah paragraf jadi caption, atau kembalikan jadi paragraf biasa */
      toggleCaption: () => ReturnType;
    };
  }
}

/**
 * Caption: paragraf keterangan kecil & redup — untuk keterangan di bawah tabel,
 * setelah blok kode, catatan kaki singkat, dsb.
 * Disimpan sebagai <p class="caption">…</p>.
 */
export const Caption = Node.create({
  name: "caption",
  group: "block",
  content: "inline*",
  defining: true,

  parseHTML() {
    return [
      { tag: "p.caption", priority: 60 }, // didahulukan dari <p> biasa
      { tag: "p.MsoCaption", priority: 60 }, // style "Caption" bawaan Microsoft Word saat di-paste
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["p", mergeAttributes(HTMLAttributes, { class: "caption" }), 0];
  },

  addCommands() {
    return {
      toggleCaption:
        () =>
        ({ commands }) =>
          commands.toggleNode(this.name, "paragraph"),
    };
  },

  addKeyboardShortcuts() {
    return {
      "Mod-Alt-9": () => this.editor.commands.toggleCaption(),
      // Enter di akhir caption → baris baru berupa paragraf biasa
      // (Enter di tengah caption tetap memecah caption seperti biasa)
      Enter: () => {
        const { $from, empty } = this.editor.state.selection;
        if (!empty || $from.parent.type.name !== this.name) return false;
        if ($from.parentOffset < $from.parent.content.size) return false;
        const after = $from.after(); // posisi tepat setelah node caption
        return this.editor
          .chain()
          .insertContentAt(after, { type: "paragraph" })
          .setTextSelection(after + 1)
          .run();
      },
      // Backspace di awal caption kosong → kembali jadi paragraf biasa
      Backspace: () => {
        const { $from, empty } = this.editor.state.selection;
        if (!empty || $from.parent.type.name !== this.name || $from.parentOffset > 0) return false;
        return this.editor.commands.setParagraph();
      },
    };
  },
});
