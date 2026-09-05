const { EditorState } = require('@codemirror/state');
const { EditorView } = require('@codemirror/view');
const { vim, getCM, Vim } = require('@replit/codemirror-vim');

// We need a DOM environment. We can't easily test CM6 in Node.
console.log("Too hard to test in Node");
