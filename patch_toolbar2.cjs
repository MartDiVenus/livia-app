const fs = require('fs');
let code = fs.readFileSync('src/components/Toolbar.tsx', 'utf-8');

// Add onImportFileAction to props
code = code.replace(
  "  onOpenDocsPicker?: () => void;",
  "  onOpenDocsPicker?: () => void;\n  onImportFileAction?: (content: string, name: string, format: FileFormat) => void;"
);

code = code.replace(
  "  onOpenDocsPicker\n}: ToolbarProps) {",
  "  onOpenDocsPicker,\n  onImportFileAction\n}: ToolbarProps) {"
);

// Replace onLoadContent with onImportFileAction in handleFileImport
const targetMethod = `  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {`;
code = code.replace(
  "          const extractedText = convertGoogleDocsHtmlToMarkdown(htmlText);\n          onLoadContent(extractedText, name, 'docx');",
  "          const extractedText = convertGoogleDocsHtmlToMarkdown(htmlText);\n          if (onImportFileAction) onImportFileAction(extractedText, name, 'docx'); else onLoadContent(extractedText, name, 'docx');"
);

code = code.replace(
  "            onLoadContent(sanitizeText(ev.target?.result as string || ''), name, 'docx');\n          };\n          fallbackReader.readAsText(file);",
  "            if (onImportFileAction) onImportFileAction(sanitizeText(ev.target?.result as string || ''), name, 'docx'); else onLoadContent(sanitizeText(ev.target?.result as string || ''), name, 'docx');\n          };\n          fallbackReader.readAsText(file);"
);

code = code.replace(
  "        const detectedFormat = validFormats.includes(ext) ? ext : 'txt';\n        \n        onLoadContent(content, name, detectedFormat);\n      };\n      reader.readAsText(file);",
  "        const detectedFormat = validFormats.includes(ext) ? ext : 'txt';\n        \n        if (onImportFileAction) onImportFileAction(content, name, detectedFormat); else onLoadContent(content, name, detectedFormat);\n      };\n      reader.readAsText(file);"
);

fs.writeFileSync('src/components/Toolbar.tsx', code);
