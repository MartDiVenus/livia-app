const content = "hello world\nthis is a test";
const cursorIndex = 14; // before 'is'
let safeText = "hello <span class='kw'>world</span>\nthis <b>is</b> a test";

const tokens = safeText.split(/(<[^>]+>)/g);
let cumulativePlainOffset = 0;
let caretInjected = false;

let resultText = tokens.map(token => {
  if (token.startsWith('<') && token.endsWith('>')) {
    return token;
  }
  const tokenPlain = token
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&');
  
  if (!caretInjected && cursorIndex >= cumulativePlainOffset && cursorIndex <= cumulativePlainOffset + tokenPlain.length) {
    const localIdx = cursorIndex - cumulativePlainOffset;
    // We need to insert the caret at localIdx in the ORIGINAL HTML-encoded token.
    // Wait, token is HTML-encoded. localIdx is based on plain text!
    // Since we only encode < > & ", the length changes.
    // It's safer to just decode, insert, then encode.
    let before = tokenPlain.substring(0, localIdx);
    let after = tokenPlain.substring(localIdx);
    
    before = before.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    after = after.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    
    caretInjected = true;
    cumulativePlainOffset += tokenPlain.length;
    return before + '<span id="caret-pos"></span>' + after;
  }
  
  cumulativePlainOffset += tokenPlain.length;
  return token;
}).join('');

console.log(resultText);
