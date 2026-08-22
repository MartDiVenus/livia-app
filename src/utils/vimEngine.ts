/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface LineCol {
  line: number; // 0-based
  col: number;  // 0-based
}

/**
 * Calculates the line and column (0-based) for a given character index in the text.
 */
export function getLineColFromIndex(text: string, index: number): LineCol {
  const lines = text.split('\n');
  let accumulatedIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const lineLength = lines[i].length;
    // The line spans from accumulatedIndex to accumulatedIndex + lineLength (inclusive of trailing newline)
    if (index >= accumulatedIndex && index <= accumulatedIndex + lineLength) {
      return {
        line: i,
        col: index - accumulatedIndex,
      };
    }
    accumulatedIndex += lineLength + 1; // +1 for the '\n' character
  }

  // Fallback to end of text
  return {
    line: Math.max(0, lines.length - 1),
    col: lines[lines.length - 1]?.length || 0,
  };
}

/**
 * Calculates the flat character index for a given line and column (0-based).
 */
export function getIndexFromLineCol(text: string, line: number, col: number): number {
  const lines = text.split('\n');
  let index = 0;

  // Clamp line index
  const targetLine = Math.max(0, Math.min(lines.length - 1, line));
  
  for (let i = 0; i < targetLine; i++) {
    index += lines[i].length + 1; // +1 for '\n'
  }

  // Clamp column index
  const targetCol = Math.max(0, Math.min(lines[targetLine].length, col));
  return index + targetCol;
}

/**
 * Moves the cursor in the specified direction.
 */
export function moveCursor(
  text: string,
  currentIndex: number,
  direction: 'left' | 'right' | 'up' | 'down',
  amount: number = 1,
  mode: 'normal' | 'insert' | 'visual' | 'visual-line' = 'normal'
): number {
  if (text === '') return 0;
  
  const { line, col } = getLineColFromIndex(text, currentIndex);
  const lines = text.split('\n');
  const currentLineText = lines[line] || '';

  switch (direction) {
    case 'left': {
      if (col === 0) {
        // If at the start of a line and not on line 0, wrap to the end of the previous line
        if (line > 0) {
          const prevLine = line - 1;
          const prevLineText = lines[prevLine] || '';
          const targetCol = (mode === 'normal')
            ? Math.max(0, prevLineText.length - 1)
            : prevLineText.length;
          return getIndexFromLineCol(text, prevLine, targetCol);
        }
        return 0;
      }
      const newCol = Math.max(0, col - amount);
      return getIndexFromLineCol(text, line, newCol);
    }
    case 'right': {
      const maxCol = (mode === 'normal') 
        ? Math.max(0, currentLineText.length - 1)
        : currentLineText.length;
      if (col >= maxCol) {
        // If at the end of a line and not on the last line, wrap to the start of the next line
        if (line < lines.length - 1) {
          return getIndexFromLineCol(text, line + 1, 0);
        }
        return currentIndex;
      }
      const newCol = Math.min(maxCol, col + amount);
      return getIndexFromLineCol(text, line, newCol);
    }
    case 'up': {
      if (line === 0) return currentIndex;
      const newLine = Math.max(0, line - amount);
      const newLineText = lines[newLine] || '';
      const maxCol = (mode === 'normal') 
        ? Math.max(0, newLineText.length - 1)
        : newLineText.length;
      const newCol = Math.min(col, maxCol);
      return getIndexFromLineCol(text, newLine, newCol);
    }
    case 'down': {
      if (line === lines.length - 1) return currentIndex;
      const newLine = Math.min(lines.length - 1, line + amount);
      const newLineText = lines[newLine] || '';
      const maxCol = (mode === 'normal') 
        ? Math.max(0, newLineText.length - 1)
        : newLineText.length;
      const newCol = Math.min(col, maxCol);
      return getIndexFromLineCol(text, newLine, newCol);
    }
  }
}

/**
 * Deletes character under the cursor (x command in Vim)
 */
export function deleteCharacterAt(text: string, index: number): { text: string; nextIndex: number } {
  if (text.length === 0) return { text, nextIndex: 0 };
  const before = text.substring(0, index);
  const after = text.substring(index + 1);
  const newText = before + after;
  
  // Keep index within bounds of the new text length (clamped)
  const nextIndex = Math.max(0, Math.min(newText.length - 1, index));
  return { text: newText, nextIndex };
}

export const deleteChar = deleteCharacterAt;

/**
 * Deletes lines (dd command in Vim)
 */
export function deleteLines(text: string, index: number, count: number = 1): { text: string; nextIndex: number; deleted: string } {
  const lines = text.split('\n');
  const { line } = getLineColFromIndex(text, index);
  
  const targetLineStart = line;
  const targetLineEnd = Math.min(lines.length - 1, line + count - 1);
  
  const deletedLines = lines.slice(targetLineStart, targetLineEnd + 1);
  const remainingLines = [
    ...lines.slice(0, targetLineStart),
    ...lines.slice(targetLineEnd + 1)
  ];
  
  // If we deleted all lines, leave an empty line
  const newText = remainingLines.length === 0 ? "" : remainingLines.join('\n');
  
  // Position cursor at the beginning of the line that took the place of deleted line
  const nextLine = Math.min(remainingLines.length - 1, targetLineStart);
  const nextIndex = getIndexFromLineCol(newText, nextLine, 0);
  
  return {
    text: newText,
    nextIndex,
    deleted: deletedLines.join('\n') + '\n'
  };
}

/**
 * Moves forward by words (w command in Vim)
 */
export function moveWord(text: string, index: number, count: number = 1): number {
  if (text.length === 0 || index >= text.length) return Math.max(0, text.length - 1);

  let scanIndex = index;
  let remaining = count;

  while (remaining > 0 && scanIndex < text.length) {
    const char = text[scanIndex];
    
    if (/\s/.test(char)) {
      while (scanIndex < text.length && /\s/.test(text[scanIndex])) {
        scanIndex++;
      }
    } else {
      const isAlpha = /[a-zA-Z0-9_]/.test(char);
      if (isAlpha) {
        while (scanIndex < text.length && /[a-zA-Z0-9_]/.test(text[scanIndex])) {
          scanIndex++;
        }
      } else {
        while (scanIndex < text.length && !/[a-zA-Z0-9_\s]/.test(text[scanIndex])) {
          scanIndex++;
        }
      }
      // Skip trailing spaces to land on start of next word
      while (scanIndex < text.length && /\s/.test(text[scanIndex])) {
        scanIndex++;
      }
    }
    remaining--;
  }

  return Math.min(scanIndex, Math.max(0, text.length - 1));
}

/**
 * Moves backward by words (b command in Vim)
 */
export function moveWordBack(text: string, index: number, count: number = 1): number {
  if (text.length === 0 || index <= 0) return 0;

  let scanIndex = Math.min(index, text.length - 1);
  let remaining = count;

  while (remaining > 0 && scanIndex > 0) {
    // Step back 1 char to move away from current position
    scanIndex--;
    // Skip whitespace going backwards
    while (scanIndex > 0 && /\s/.test(text[scanIndex])) {
      scanIndex--;
    }
    if (scanIndex === 0) break;

    const char = text[scanIndex];
    const isAlpha = /[a-zA-Z0-9_]/.test(char);
    if (isAlpha) {
      while (scanIndex > 0 && /[a-zA-Z0-9_]/.test(text[scanIndex - 1])) {
        scanIndex--;
      }
    } else if (!/\s/.test(char)) {
      while (scanIndex > 0 && !/[a-zA-Z0-9_\s]/.test(text[scanIndex - 1])) {
        scanIndex--;
      }
    }
    remaining--;
  }

  return Math.max(0, scanIndex);
}

/**
 * Reformats paragraph/line around cursorIndex to fit target textwidth (gq in Vim)
 */
export function reformatParagraph(text: string, cursorIndex: number, textwidth: number = 80): { text: string; nextIndex: number } {
  if (!text) return { text, nextIndex: cursorIndex };

  const lines = text.split('\n');
  const { line } = getLineColFromIndex(text, cursorIndex);

  // Find boundaries of the current paragraph (blank lines separate paragraphs)
  let startLine = line;
  while (startLine > 0 && lines[startLine - 1].trim() !== '') {
    startLine--;
  }

  let endLine = line;
  while (endLine < lines.length - 1 && lines[endLine + 1].trim() !== '') {
    endLine++;
  }

  // Join paragraph text into single space-separated string
  const paragraphLines = lines.slice(startLine, endLine + 1);
  const fullParagraphText = paragraphLines.map(l => l.trim()).join(' ');

  // Wrap at word boundaries based on textwidth
  const words = fullParagraphText.split(/\s+/);
  const wrappedLines: string[] = [];
  let currentLineStr = '';

  for (const word of words) {
    if (!word) continue;
    if (currentLineStr.length === 0) {
      currentLineStr = word;
    } else if (currentLineStr.length + 1 + word.length <= textwidth) {
      currentLineStr += ' ' + word;
    } else {
      wrappedLines.push(currentLineStr);
      currentLineStr = word;
    }
  }
  if (currentLineStr) {
    wrappedLines.push(currentLineStr);
  }

  const updatedLines = [
    ...lines.slice(0, startLine),
    ...wrappedLines,
    ...lines.slice(endLine + 1)
  ];

  const newText = updatedLines.join('\n');
  const nextIdx = getIndexFromLineCol(newText, startLine, 0);

  return { text: newText, nextIndex: nextIdx };
}

/**
 * Deletes words (dw command in Vim)
 * Deletes from current cursor to start of next word.
 */
export function deleteWords(text: string, index: number, count: number = 1): { text: string; nextIndex: number; deleted: string } {
  if (index >= text.length) return { text, nextIndex: index, deleted: '' };
  
  let scanIndex = index;
  let remainingCount = count;
  
  while (remainingCount > 0 && scanIndex < text.length) {
    const char = text[scanIndex];
    
    // Check if we are on whitespace
    const isOnWhitespace = /\s/.test(char);
    
    // Move forward while the category remains the same (alphanumeric vs special vs whitespace)
    if (isOnWhitespace) {
      // Consume whitespace
      while (scanIndex < text.length && /\s/.test(text[scanIndex])) {
        scanIndex++;
      }
    } else {
      // Determine word category
      const isAlphanumeric = /[a-zA-Z0-9_]/.test(char);
      if (isAlphanumeric) {
        while (scanIndex < text.length && /[a-zA-Z0-9_]/.test(text[scanIndex])) {
          scanIndex++;
        }
      } else {
        // Special character word
        while (scanIndex < text.length && !/[a-zA-Z0-9_\s]/.test(text[scanIndex])) {
          scanIndex++;
        }
      }
      
      // Also consume any trailing spaces (Vim dw consumes trailing spaces on the same line)
      while (scanIndex < text.length && text[scanIndex] === ' ') {
        scanIndex++;
      }
    }
    
    remainingCount--;
  }
  
  const before = text.substring(0, index);
  const deleted = text.substring(index, scanIndex);
  const after = text.substring(scanIndex);
  const newText = before + after;
  
  const nextIndex = Math.max(0, Math.min(newText.length - 1, index));
  return {
    text: newText,
    nextIndex,
    deleted
  };
}

/**
 * Runs regex search and replace on the text.
 * Format supported: :%s/from/to/g or :s/from/to/g (current line)
 * Returns { success: boolean, text: string, message: string }
 */
export function executeSearchAndReplace(
  text: string,
  cursorIndex: number,
  command: string,
  lang: 'it' | 'en' = 'en'
): { success: boolean; text: string; message: string } {
  // Pattern matching: :%s/from/to/flags or :s/from/to/flags
  // We can write a custom parser for the parts separated by slashes, keeping in mind backslashes.
  const globalReplace = command.startsWith(':%s/');
  const currentLineReplace = command.startsWith(':s/');
  
  if (!globalReplace && !currentLineReplace) {
    return { 
      success: false, 
      text, 
      message: lang === 'it' 
        ? 'Formato comando non valido. Usa :%s/vecchio/nuovo/g o :s/vecchio/nuovo/g' 
        : 'Invalid command format. Use :%s/old/new/g or :s/old/new/g' 
    };
  }
  
  // Remove prefix
  const rawParts = command.substring(globalReplace ? 4 : 3);
  
  // Parse parts separated by '/' but ignoring escaped slashes '\/'
  const parts: string[] = [];
  let currentPart = '';
  let escaped = false;
  
  for (let i = 0; i < rawParts.length; i++) {
    const char = rawParts[i];
    if (escaped) {
      currentPart += char;
      escaped = false;
    } else if (char === '\\') {
      escaped = true;
    } else if (char === '/') {
      parts.push(currentPart);
      currentPart = '';
    } else {
      currentPart += char;
    }
  }
  parts.push(currentPart);
  
  if (parts.length < 2) {
    return { 
      success: false, 
      text, 
      message: lang === 'it'
        ? 'Sintassi errata: manca la stringa di sostituzione'
        : 'Syntax error: missing replacement string'
    };
  }
  
  const findStr = parts[0];
  const replaceStr = parts[1];
  const flags = parts[2] || '';
  
  const isGlobalFlag = flags.includes('g');
  const isIgnoreCase = flags.includes('i');
  
  let regexFlags = '';
  if (isGlobalFlag) regexFlags += 'g';
  if (isIgnoreCase) regexFlags += 'i';
  
  try {
    const regex = new RegExp(findStr, regexFlags);
    
    if (globalReplace) {
      // Count matches
      const matches = text.match(new RegExp(findStr, isIgnoreCase ? 'gi' : 'g'));
      const count = matches ? matches.length : 0;
      
      const newText = text.replace(regex, replaceStr);
      return {
        success: true,
        text: newText,
        message: lang === 'it'
          ? `Sostituite ${count} occorrenze di "${findStr}" con "${replaceStr}"`
          : `Replaced ${count} occurrence(s) of "${findStr}" with "${replaceStr}"`
      };
    } else {
      // Current line replacement
      const lines = text.split('\n');
      const { line } = getLineColFromIndex(text, cursorIndex);
      const lineText = lines[line];
      
      const newlineText = lineText.replace(regex, replaceStr);
      lines[line] = newlineText;
      const newText = lines.join('\n');
      
      return {
        success: true,
        text: newText,
        message: lang === 'it'
          ? `Sostituzione applicata alla riga ${line + 1}`
          : `Replacement applied to line ${line + 1}`
      };
    }
  } catch (err: any) {
    return { 
      success: false, 
      text, 
      message: lang === 'it'
        ? `Errore Regex: ${err.message}`
        : `Regex Error: ${err.message}` 
    };
  }
}

/**
 * Searches for all matches of the query in the text and returns indices.
 */
export function findSearchMatches(text: string, query: string): number[] {
  if (!query) return [];
  const indices: number[] = [];
  let index = text.toLowerCase().indexOf(query.toLowerCase());
  
  while (index !== -1) {
    indices.push(index);
    index = text.toLowerCase().indexOf(query.toLowerCase(), index + 1);
  }
  return indices;
}

export interface KeyCommandResult {
  isKeyCmd: boolean;
  action: 'status' | 'clear' | 'set';
  value?: string;
}

/**
 * Parses Vim command input to see if it sets, clears, or queries the Gemini API key.
 * Supports syntax variations like:
 *   :set key=XYZ, :set key XYZ, :set key = XYZ, :set key = "XYZ"
 *   :set apikey=XYZ, :set gemini_key=XYZ, :set g:gemini_api_key=XYZ, :set g:key=XYZ
 *   :let g:gemini_api_key='XYZ', :let g:key='XYZ'
 *   :key XYZ, :key=XYZ, :apikey XYZ
 *   :set key, :set key?, :set key status, :set key=clear, :set key reset
 */
export function parseKeyFromVimCommand(cmd: string): KeyCommandResult {
  if (!cmd) return { isKeyCmd: false, action: 'status' };

  const cleanCmd = cmd.trim().replace(/^:\s*/, '');
  const keyPattern = /^(set\s+|let\s+)?(g:)?(key|apikey|gemini_key|gemini_api_key)\b/i;

  if (!keyPattern.test(cleanCmd)) {
    return { isKeyCmd: false, action: 'status' };
  }

  const match = cleanCmd.match(keyPattern);
  if (!match) return { isKeyCmd: false, action: 'status' };

  let remainder = cleanCmd.substring(match[0].length).trim();

  if (remainder.startsWith('=')) {
    remainder = remainder.substring(1).trim();
  }

  remainder = remainder.replace(/^["']|["']$/g, '').trim();

  if (!remainder || ['status', 'check', '?', 'info'].includes(remainder.toLowerCase())) {
    return { isKeyCmd: true, action: 'status' };
  }

  if (['clear', 'default', 'reset', 'off', 'none', 'delete', 'unset', 'remove'].includes(remainder.toLowerCase())) {
    return { isKeyCmd: true, action: 'clear' };
  }

  return { isKeyCmd: true, action: 'set', value: remainder };
}
