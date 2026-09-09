import re

with open("src/App.tsx", "r") as f:
    content = f.read()

# Pass new props to Toolbar
toolbar_start = content.find("<Toolbar")
if toolbar_start != -1:
    toolbar_end = content.find("/>", toolbar_start)
    if "setShowMdPreview" not in content[toolbar_start:toolbar_end]:
        replacement = """          showMdPreview={showMdPreview}
          setShowMdPreview={setShowMdPreview}
          onOpenUrlImport={() => setIsUrlImportModalOpen(true)}
"""
        content = content[:toolbar_end] + replacement + content[toolbar_end:]

with open("src/App.tsx", "w") as f:
    f.write(content)

with open("src/components/Toolbar.tsx", "r") as f:
    toolbar = f.read()

# Add to ToolbarProps
if "showMdPreview?:" not in toolbar:
    props_replacement = """  onOpenAiProfilesModal?: () => void;
  showMdPreview?: boolean;
  setShowMdPreview?: (val: boolean) => void;
  onOpenUrlImport?: () => void;"""
    toolbar = toolbar.replace("  onOpenAiProfilesModal?: () => void;", props_replacement)

# Add to function signature
if "showMdPreview," not in toolbar:
    sig_replacement = """  onOpenAiProfilesModal,
  showMdPreview,
  setShowMdPreview,
  onOpenUrlImport"""
    toolbar = toolbar.replace("  onOpenAiProfilesModal,", sig_replacement)

# Add URL import button to import menu
url_btn = """                  <button
                    type="button"
                    onClick={() => {
                      setImportMenuOpen(false);
                      setMobileMenuOpen(false);
                      if (onOpenUrlImport) onOpenUrlImport();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg text-left text-gray-800 dark:text-zinc-200 cursor-pointer font-bold"
                  >
                    <Globe size={16} className="text-emerald-500 shrink-0" />
                    <div className="flex flex-col">
                      <span className="font-bold">Import from URL</span>
                      <span className="text-[11px] text-gray-400 dark:text-zinc-400 font-normal">{lang === 'it' ? 'Scarica da link diretto' : 'Download from direct link'}</span>
                    </div>
                  </button>"""

if "Import from URL" not in toolbar:
    # Insert after Google Docs button in Mobile and Desktop menus
    import_docs_end = toolbar.find("Google Docs™</span>\n                      <span className=\"text-[11px] text-gray-400 dark:text-zinc-400 font-normal\">{lang === 'it' ? 'Importa documento' : 'Import document'}</span>\n                    </div>\n                  </button>")
    if import_docs_end != -1:
        insert_pos = import_docs_end + len("Google Docs™</span>\n                      <span className=\"text-[11px] text-gray-400 dark:text-zinc-400 font-normal\">{lang === 'it' ? 'Importa documento' : 'Import document'}</span>\n                    </div>\n                  </button>")
        toolbar = toolbar[:insert_pos] + "\n" + url_btn + toolbar[insert_pos:]

# Add Markdown toggle button
md_btn = """
        {/* Toggle Markdown Preview */}
        {format === 'markdown' && setShowMdPreview && (
          <button
            type="button"
            onClick={() => setShowMdPreview(!showMdPreview)}
            className={`px-3 py-1.5 flex items-center gap-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer border ${showMdPreview ? 'bg-blue-100 dark:bg-blue-900/40 border-blue-200 dark:border-blue-800/40 text-blue-700 dark:text-blue-300' : 'bg-gray-100 hover:bg-gray-200 dark:bg-[#1E2025] dark:hover:bg-[#2D2D2D] border-gray-200 dark:border-[#2D2D2D] text-gray-600 dark:text-zinc-400'}`}
            title={lang === 'it' ? 'Attiva/Disattiva Anteprima Markdown' : 'Toggle Markdown Preview'}
          >
            <Eye size={14} />
            <span className="hidden md:inline">Preview</span>
          </button>
        )}
"""

if "Toggle Markdown Preview" not in toolbar:
    # Insert next to Theme Toggle
    theme_btn_start = toolbar.find("{/* Theme Toggle */}")
    if theme_btn_start != -1:
        toolbar = toolbar[:theme_btn_start] + md_btn + toolbar[theme_btn_start:]

# Make sure Globe is imported
if "Globe" not in toolbar[:200]:
    toolbar = toolbar.replace("import {\n  FileText,", "import {\n  Globe,\n  FileText,")

with open("src/components/Toolbar.tsx", "w") as f:
    f.write(toolbar)
