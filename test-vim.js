import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { vim, Vim, getCM } from "@replit/codemirror-vim";

const state = EditorState.create({
  doc: "Line 1\nLine 2\nLine 3\nLine 4",
  extensions: [vim()]
});
const view = new EditorView({ state });
const cm = getCM(view);
Vim.handleKey(cm, 'V', 'mapping');
Vim.handleKey(cm, 'G', 'mapping');
console.log("Selection:", view.state.selection.main.from, "to", view.state.selection.main.to);
