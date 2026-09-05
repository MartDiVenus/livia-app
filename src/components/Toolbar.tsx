/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from 'react';
import { 
  FileText, 
  FolderOpen,
  Cloud, 
  Download, 
  Upload,
  FileDown, 
  Sun, 
  Moon, 
  Laptop, 
  BookOpen, 
  Code,
  FileCode,
  FilePlus,
  ChevronDown,
  Info,
  Keyboard,
  Wrench,
  ShieldCheck,
  HelpCircle,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  ChevronUp,
  MoreVertical,
  Sliders,
  Settings,
  Copy,
  Image as ImageIcon
} from 'lucide-react';
import { Logo } from './Logo';
import { FileFormat, FileData, TEMPLATES, getTemplates } from '../types';
import mammoth from 'mammoth';
import { convertGoogleDocsHtmlToMarkdown, sanitizeText } from '../utils/googleDocsHelper';

interface ToolbarProps {
  filename: string;
  setFilename: (name: string) => void;
  format: FileFormat;
  setFormat: (fmt: FileFormat) => void;
  onLoadContent: (content: string, name: string, format: FileFormat) => void;
  onImportFileAction?: (content: string, name: string, format: FileFormat) => void;
  onOpenDrivePicker?: () => void;
  onOpenDocsPicker?: () => void;
  onExportPDF: () => void;
  onExportTex: () => void;
  onExportMd: () => void;
  onSaveFile: () => void;
  onCopyAll: () => void;
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  lang: 'it' | 'en';
  setLang: (lang: 'it' | 'en') => void;
  includePdfHeader: boolean;
  setIncludePdfHeader: (val: boolean) => void;
  onOpenGoogleDocsModal?: () => void;
  onOpenDriveIconsModal?: () => void;
  onOpenPrivacyModal?: () => void;
  onOpenInfoModal?: () => void;
  onOpenSettingsModal?: () => void;
  showCheatsheet?: boolean;
  setShowCheatsheet?: React.Dispatch<React.SetStateAction<boolean>>;
  showAuxiliaryKeyboard?: boolean;
  setShowAuxiliaryKeyboard?: React.Dispatch<React.SetStateAction<boolean>>;
  sidebarTab?: string;
  onOpenGuide?: () => void;
  isHeaderCollapsed?: boolean;
  setIsHeaderCollapsed?: (val: boolean | ((prev: boolean) => boolean)) => void;
}

export function Toolbar({
  filename,
  setFilename,
  format,
  setFormat,
  onLoadContent,
  onExportPDF,
  onExportTex,
  onExportMd,
  onSaveFile,
  onCopyAll,
  theme,
  setTheme,
  lang,
  setLang,
  includePdfHeader,
  setIncludePdfHeader,
  onOpenGoogleDocsModal,
  onImportFileAction,
  onOpenDrivePicker,
  onOpenDocsPicker,
  onOpenDriveIconsModal,
  onOpenPrivacyModal,
  onOpenInfoModal,
  onOpenSettingsModal,
  showCheatsheet,
  setShowCheatsheet,
  showAuxiliaryKeyboard,
  setShowAuxiliaryKeyboard,
  sidebarTab,
  onOpenGuide,
  isHeaderCollapsed = false,
  setIsHeaderCollapsed
}: ToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importMenuOpen, setImportMenuOpen] = useState<boolean>(false);
  const [exportMenuOpen, setExportMenuOpen] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  const importMenuRef = useRef<HTMLDivElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Click outside to close dropdown menus
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (importMenuRef.current && !importMenuRef.current.contains(e.target as Node)) {
        setImportMenuOpen(false);
      }
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Automatically load template when selecting format from TIPO dropdown
  const handleFormatChange = (newFmt: FileFormat) => {
    setFormat(newFmt);
    const templates = getTemplates(lang);
    const template = templates[newFmt] || TEMPLATES[newFmt];
    if (template) {
      onLoadContent(template.content, template.name, template.format);
    } else {
      const baseName = filename.substring(0, filename.lastIndexOf('.')) || filename;
      const newName = `${baseName}.${newFmt}`;
      setFilename(newName);
    }
  };

  // Create a new completely blank empty file
  const handleNewFile = () => {
    const ext = format || 'txt';
    const newName = `documento_nuovo.${ext}`;
    onLoadContent('', newName, ext);
  };

  // Import local file from device
  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const name = file.name;
    const ext = name.split('.').pop()?.toLowerCase() as FileFormat;

    if (ext === 'docx') {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const arrayBuffer = event.target?.result as ArrayBuffer;
        try {
          const result = await (mammoth as any).convertToHtml({ arrayBuffer });
          const htmlText = result.value || '';
          const extractedText = convertGoogleDocsHtmlToMarkdown(htmlText);
          if (onImportFileAction) onImportFileAction(extractedText, name, 'docx'); else onLoadContent(extractedText, name, 'docx');
        } catch (err) {
          console.error('Error parsing DOCX file with mammoth:', err);
          const fallbackReader = new FileReader();
          fallbackReader.onload = (ev) => {
            if (onImportFileAction) onImportFileAction(sanitizeText(ev.target?.result as string || ''), name, 'docx'); else onLoadContent(sanitizeText(ev.target?.result as string || ''), name, 'docx');
          };
          fallbackReader.readAsText(file);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const rawContent = event.target?.result as string || '';
        const content = sanitizeText(rawContent);
        const validFormats: FileFormat[] = ['txt', 'md', 'docx', 'py', 'kt', 'js', 'ts', 'bash', 'tex', 'json', 'xml', 'java', 'c', 'cpp', 'ly', 'html', 'css', 'sql', 'rs', 'go'];
        const detectedFormat = validFormats.includes(ext) ? ext : 'txt';
        
        if (onImportFileAction) onImportFileAction(content, name, detectedFormat); else onLoadContent(content, name, detectedFormat);
      };
      reader.readAsText(file);
    }

    if (e.target) e.target.value = '';
    setImportMenuOpen(false);
  };

  // Load standard pre-populated template
  const handleTemplateSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedFormat = e.target.value as FileFormat;
    if (!selectedFormat) return;
    const templates = getTemplates(lang);
    const template = templates[selectedFormat] || TEMPLATES[selectedFormat];
    onLoadContent(template.content, template.name, template.format);
    e.target.value = ''; // Reset select dropdown
  };

  // COLLAPSED MINIMAL HEADER BAR (Distraction-Free / Focus Mode)
  if (isHeaderCollapsed) {
    return (
      <header className="border-b border-gray-200 dark:border-[#2D2D2D] bg-white/95 dark:bg-[#0D0F12]/95 backdrop-blur-md transition-all duration-200 py-1 px-2.5 sm:px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 h-8">
          
          {/* Logo + Truncated Filename + Type Badge */}
          <div className="flex items-center gap-2 min-w-0">
            <Logo size={22} className="shrink-0" />
            
            <button
              type="button"
              onClick={onOpenInfoModal}
              className="flex items-center justify-center w-4 h-4 rounded-full bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-[#8AB4F8] text-[10px] font-bold font-serif shrink-0 border border-blue-200/60 dark:border-blue-800/60"
              title={lang === 'it' ? 'Informazioni su LiViA editor (i)' : 'About LiViA editor (i)'}
            >
              i
            </button>

            <span className="text-xs font-mono font-medium text-gray-800 dark:text-[#E0E0E0] truncate max-w-[130px] sm:max-w-xs">
              {filename}
            </span>

            <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-gray-100 dark:bg-[#16181D] text-gray-600 dark:text-zinc-300 border border-gray-200 dark:border-[#2D2D2D] shrink-0">
              {format}
            </span>
          </div>

          {/* Action buttons on collapsed bar */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Quick New File button */}
            <button
              type="button"
              onClick={handleNewFile}
              className="p-1 rounded-md text-gray-600 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-[#16181D] transition-all cursor-pointer"
              title={lang === 'it' ? 'Nuovo File' : 'New File'}
            >
              <FilePlus size={14} className="text-blue-500" />
            </button>

            {/* Quick Export button */}
            <button
              onClick={onCopyAll}
              className="p-1 rounded-md text-gray-600 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-[#16181D] transition-all cursor-pointer"
              title={lang === 'it' ? 'Copia Tutto' : 'Copy All'}
            >
              <Copy size={14} className="text-blue-500" />
            </button>
            <button
              onClick={onSaveFile}
              className="p-1 rounded-md text-gray-600 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-[#16181D] transition-all cursor-pointer"
              title={lang === 'it' ? 'Salva File' : 'Save File'}
            >
              <Download size={14} className="text-emerald-500" />
            </button>

            {/* EXPAND BAR BUTTON */}
            {setIsHeaderCollapsed && (
              <button
                type="button"
                onClick={() => setIsHeaderCollapsed(false)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs active:scale-95 transition-all cursor-pointer"
                title={lang === 'it' ? 'Mostra barra degli strumenti e menu' : 'Show toolbar and menu'}
                id="expand-toolbar-btn"
              >
                <Eye size={13} />
                <span className="hidden xs:inline">{lang === 'it' ? 'Strumenti' : 'Tools'}</span>
              </button>
            )}
          </div>

        </div>
      </header>
    );
  }

  // EXPANDED FULL TOOLBAR
  return (
    <header className="border-b border-gray-200 dark:border-[#2D2D2D] bg-white dark:bg-[#0D0F12] transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-2.5 sm:px-4 py-1.5 flex flex-col md:flex-row md:items-center md:justify-between gap-1.5 sm:gap-2">
        
        {/* Row 1 on Mobile / Left Section on Desktop */}
        <div className="flex flex-wrap items-center justify-between md:justify-start gap-1.5 sm:gap-2 w-full md:w-auto">
          
          {/* Logo and Info Button */}
          <div className="flex items-center gap-1.5 shrink-0">
            <Logo size={26} className="transform hover:rotate-6 transition-transform duration-300 shrink-0" />
            
            <button
              type="button"
              onClick={onOpenInfoModal}
              className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/80 text-blue-600 dark:text-[#8AB4F8] text-xs font-bold font-serif transition-all cursor-pointer border border-blue-200/60 dark:border-blue-800/60 shadow-xs active:scale-90 shrink-0"
              title={lang === 'it' ? 'Informazioni su LiViA editor (i)' : 'About LiViA editor (i)'}
              id="info-modal-trigger-btn"
            >
              i
            </button>
          </div>

          {/* Compact Filename & Format Bar */}
          <div className="flex items-center gap-1.5 flex-1 min-w-0 md:flex-initial">
            {/* Filename Input */}
            <div className="flex items-center gap-1.5 border border-gray-300 dark:border-[#2D2D2D] rounded-lg px-2.5 py-1 bg-gray-50 dark:bg-[#16181D] focus-within:ring-2 focus-within:ring-emerald-500/30 flex-1 sm:flex-none">
              <FileText size={15} className="text-gray-400 shrink-0 hidden sm:block" />
              <input
                type="text"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                className="text-xs font-mono font-medium bg-transparent text-gray-800 dark:text-[#E0E0E0] focus:outline-none w-full min-w-[70px] sm:w-32"
                placeholder="documento.txt"
                id="filename-input"
              />
            </div>

            {/* Format Select */}
            <div className="flex items-center gap-1 border border-gray-300 dark:border-[#2D2D2D] rounded-lg px-2 py-1 bg-gray-50 dark:bg-[#16181D] text-xs text-gray-700 dark:text-[#E0E0E0] shrink-0 font-bold">
              <span className="text-[9px] uppercase font-bold text-gray-400 hidden sm:inline">{lang === 'it' ? 'Tipo' : 'Type'}</span>
              <select
                value={format}
                onChange={(e) => handleFormatChange(e.target.value as FileFormat)}
                className="bg-transparent font-mono focus:outline-none cursor-pointer text-xs uppercase font-bold"
                id="format-select"
              >
                <option value="txt" className="dark:bg-[#16181D]">TXT</option>
                <option value="md" className="dark:bg-[#16181D]">MD</option>
                <option value="docx" className="dark:bg-[#16181D]">DOCX</option>
                <option value="java" className="dark:bg-[#16181D]">JAVA</option>
                <option value="c" className="dark:bg-[#16181D]">C</option>
                <option value="cpp" className="dark:bg-[#16181D]">C++</option>
                <option value="ly" className="dark:bg-[#16181D]">LY (LilyPond)</option>
                <option value="py" className="dark:bg-[#16181D]">PY</option>
                <option value="kt" className="dark:bg-[#16181D]">KT</option>
                <option value="js" className="dark:bg-[#16181D]">JS</option>
                <option value="ts" className="dark:bg-[#16181D]">TS</option>
                <option value="bash" className="dark:bg-[#16181D]">SH</option>
                <option value="tex" className="dark:bg-[#16181D]">TEX</option>
                <option value="html" className="dark:bg-[#16181D]">HTML</option>
                <option value="css" className="dark:bg-[#16181D]">CSS</option>
                <option value="sql" className="dark:bg-[#16181D]">SQL</option>
                <option value="rs" className="dark:bg-[#16181D]">RS (Rust)</option>
                <option value="go" className="dark:bg-[#16181D]">GO</option>
                <option value="json" className="dark:bg-[#16181D]">JSON</option>
                <option value="xml" className="dark:bg-[#16181D]">XML</option>
              </select>
            </div>
          </div>

          {/* Quick Collapse & Settings Buttons on Mobile Row 1 */}
          <div className="flex items-center gap-1 md:hidden shrink-0">
            {onOpenSettingsModal && (
              <button
                type="button"
                onClick={onOpenSettingsModal}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-[#2D2D2D] bg-gray-100 dark:bg-[#16181D] text-blue-600 dark:text-[#8AB4F8] hover:bg-gray-200 dark:hover:bg-[#2C313C] transition-all cursor-pointer"
                title={lang === 'it' ? 'Impostazioni Editor & Chiave API Gemini' : 'Editor Settings & Gemini API Key'}
                id="mobile-open-settings-btn"
              >
                <Settings size={16} className="hover:rotate-45 transition-transform" />
              </button>
            )}

            {setIsHeaderCollapsed && (
              <button
                type="button"
                onClick={() => setIsHeaderCollapsed(true)}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-[#2D2D2D] bg-gray-100 dark:bg-[#16181D] text-gray-600 dark:text-zinc-300 hover:text-blue-500 transition-all cursor-pointer"
                title={lang === 'it' ? 'Nascondi barra (più spazio per l\'editor)' : 'Collapse toolbar (more space for editor)'}
              >
                <ChevronUp size={16} />
              </button>
            )}

            {/* Mobile Menu Expansion Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                mobileMenuOpen 
                  ? 'bg-blue-600 text-white border-blue-600' 
                  : 'border-gray-200 dark:border-[#2D2D2D] bg-gray-100 dark:bg-[#16181D] text-gray-600 dark:text-zinc-300'
              }`}
              title={lang === 'it' ? 'Menu opzioni' : 'Options menu'}
            >
              <Sliders size={16} />
            </button>
          </div>

        </div>

        {/* Row 2 / Right Section (Desktop visible always, Mobile conditional or scrollable) */}
        <div className={`flex flex-wrap items-center gap-1.5 sm:gap-2 ${mobileMenuOpen ? 'flex' : 'hidden md:flex'} pt-1.5 md:pt-0 border-t md:border-t-0 border-gray-100 dark:border-[#1E2026]`}>
          
          {/* Preloaded Template Trigger */}
          <div className="flex items-center gap-1.5 border border-gray-300 dark:border-[#2D2D2D] rounded-lg px-2 py-1 bg-gray-50 dark:bg-[#16181D] text-xs text-gray-700 dark:text-[#E0E0E0] font-bold">
            <BookOpen size={15} className="text-gray-400 shrink-0" />
            <select
              onChange={(e) => {
                handleTemplateSelect(e);
                setMobileMenuOpen(false);
              }}
              defaultValue=""
              className="bg-transparent focus:outline-none cursor-pointer text-xs font-bold max-w-[130px] sm:max-w-none"
              id="template-select"
            >
              <option value="" disabled className="dark:bg-[#16181D]">
                {lang === 'it' ? 'Template...' : 'Template...'}
              </option>
              <option value="txt" className="dark:bg-[#16181D]">Template TXT</option>
              <option value="md" className="dark:bg-[#16181D]">{lang === 'it' ? 'Guida MD' : 'MD Guide'}</option>
              <option value="docx" className="dark:bg-[#16181D]">{lang === 'it' ? 'Doc Word (DOCX)' : 'Word Doc (DOCX)'}</option>
              <option value="java" className="dark:bg-[#16181D]">Java (JAVA)</option>
              <option value="c" className="dark:bg-[#16181D]">C Code (C)</option>
              <option value="cpp" className="dark:bg-[#16181D]">C++ Code (CPP)</option>
              <option value="ly" className="dark:bg-[#16181D]">LilyPond (LY)</option>
              <option value="py" className="dark:bg-[#16181D]">Python (PY)</option>
              <option value="kt" className="dark:bg-[#16181D]">Kotlin (KT)</option>
              <option value="js" className="dark:bg-[#16181D]">JS Code</option>
              <option value="ts" className="dark:bg-[#16181D]">TS Code</option>
              <option value="bash" className="dark:bg-[#16181D]">Bash (SH)</option>
              <option value="tex" className="dark:bg-[#16181D]">LaTeX (TEX)</option>
              <option value="html" className="dark:bg-[#16181D]">HTML Web</option>
              <option value="css" className="dark:bg-[#16181D]">CSS Style</option>
              <option value="sql" className="dark:bg-[#16181D]">SQL DB</option>
              <option value="rs" className="dark:bg-[#16181D]">Rust (RS)</option>
              <option value="go" className="dark:bg-[#16181D]">Go Code (GO)</option>
              <option value="json" className="dark:bg-[#16181D]">JSON Config</option>
              <option value="xml" className="dark:bg-[#16181D]">XML Code</option>
            </select>
          </div>

          {/* Action Buttons: New, Import, Export */}
          <div className="flex items-center gap-1.5">
            {/* New Blank File Button */}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                handleNewFile();
                setMobileMenuOpen(false);
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-gray-300 dark:border-[#2D2D2D] bg-white dark:bg-[#16181D] text-xs font-bold text-gray-800 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-800 active:scale-95 transition-all cursor-pointer"
              title={lang === 'it' ? 'Crea un nuovo file vuoto' : 'Create a new blank file'}
              id="new-file-btn"
            >
              <FilePlus size={15} className="text-blue-500" />
              <span>{lang === 'it' ? 'Nuovo' : 'New'}</span>
            </button>

            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileImport}
              accept=".txt,.md,.docx,.py,.kt,.js,.ts,.json,.xml,.sh,.tex,.java,.c,.cpp,.ly,.html,.css,.sql,.rs,.go"
              className="hidden"
            />

            {/* IMPORT MENU Dropdown */}
            <div className="relative" ref={importMenuRef}>
              <button
                onClick={() => {
                  setImportMenuOpen(!importMenuOpen);
                  setExportMenuOpen(false);
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-xs font-bold text-blue-700 dark:text-[#8AB4F8] shadow-xs active:scale-95 transition-all cursor-pointer"
                title={lang === 'it' ? 'Menu Importa' : 'Import Menu'}
                id="import-dropdown-btn"
              >
                <Upload size={15} className="text-blue-600 dark:text-[#8AB4F8]" />
                <span>{lang === 'it' ? 'Importa' : 'Import'}</span>
                <ChevronDown size={12} className={`transition-transform duration-200 ${importMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {importMenuOpen && (
                <div className="absolute left-0 mt-1.5 w-64 bg-white dark:bg-[#16181D] border border-gray-200 dark:border-[#2D2D2D] rounded-xl shadow-xl z-50 p-2 flex flex-col gap-1 font-sans text-xs animate-fadeIn">
                  <button
                    type="button"
                    onClick={() => {
                      setImportMenuOpen(false);
                      setMobileMenuOpen(false);
                      if (onOpenGoogleDocsModal) onOpenGoogleDocsModal();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg text-left text-gray-800 dark:text-zinc-200 cursor-pointer font-bold"
                  >
                    <FileText size={16} className="text-blue-500 shrink-0" />
                    <div className="flex flex-col">
                      <span className="font-bold">Google Docs™</span>
                      <span className="text-[11px] text-gray-400 dark:text-zinc-400 font-normal">{lang === 'it' ? 'Incolla formattato / Sync' : 'Paste formatted / Sync'}</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setImportMenuOpen(false);
                      setMobileMenuOpen(false);
                      fileInputRef.current?.click();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg text-left text-gray-800 dark:text-zinc-200 cursor-pointer font-bold"
                  >
                    <FolderOpen size={16} className="text-amber-500 shrink-0" />
                    <div className="flex flex-col">
                      <span className="font-bold">Import/tear from Local File</span>
                      <span className="text-[11px] text-gray-400 dark:text-zinc-400 font-normal">{lang === 'it' ? 'Seleziona da dispositivo' : 'Select from device'}</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setImportMenuOpen(false);
                      setMobileMenuOpen(false);
                      if (onOpenDrivePicker) onOpenDrivePicker();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg text-left text-gray-800 dark:text-zinc-200 cursor-pointer font-bold"
                  >
                    <Cloud size={16} className="text-blue-500 shrink-0" />
                    <div className="flex flex-col">
                      <span className="font-bold">Import/tear from Google Drive™</span>
                      <span className="text-[11px] text-gray-400 dark:text-zinc-400 font-normal">{lang === 'it' ? 'Esplora e seleziona file' : 'Browse and select file'}</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setImportMenuOpen(false);
                      setMobileMenuOpen(false);
                      if (onOpenDocsPicker) onOpenDocsPicker();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg text-left text-gray-800 dark:text-zinc-200 cursor-pointer font-bold"
                  >
                    <FileText size={16} className="text-blue-600 shrink-0" />
                    <div className="flex flex-col">
                      <span className="font-bold">Import/tear from Google Docs™</span>
                      <span className="text-[11px] text-gray-400 dark:text-zinc-400 font-normal">{lang === 'it' ? 'Seleziona documento' : 'Select document'}</span>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* EXPORT MENU Dropdown */}
            <div className="relative" ref={exportMenuRef}>
              <button
                onClick={() => {
                  setExportMenuOpen(!exportMenuOpen);
                  setImportMenuOpen(false);
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-xs font-bold text-emerald-700 dark:text-[#8AB4F8] shadow-xs active:scale-95 transition-all cursor-pointer"
                title={lang === 'it' ? 'Menu Esporta' : 'Export Menu'}
                id="export-dropdown-btn"
              >
                <Download size={15} className="text-emerald-600 dark:text-[#8AB4F8]" />
                <span>{lang === 'it' ? 'Esporta' : 'Export'}</span>
                <ChevronDown size={12} className={`transition-transform duration-200 ${exportMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {exportMenuOpen && (
                <div className="absolute right-0 mt-1.5 w-68 bg-white dark:bg-[#16181D] border border-gray-200 dark:border-[#2D2D2D] rounded-xl shadow-xl z-50 p-2 flex flex-col gap-1 font-sans text-xs animate-fadeIn">
                  {/* Save File Direct Download */}
                  <button
                    type="button"
                    onClick={() => {
                      setExportMenuOpen(false);
                      setMobileMenuOpen(false);
                      onSaveFile();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg text-left text-gray-800 dark:text-zinc-200 cursor-pointer font-bold border-b border-gray-100 dark:border-[#2D2D2D]"
                  >
                    <Download size={16} className="text-emerald-500 shrink-0" />
                    <div className="flex flex-col">
                      <span className="font-bold">{lang === 'it' ? `Salva File (.${format})` : `Save File (.${format})`}</span>
                      <span className="text-[11px] text-gray-400 dark:text-zinc-400 font-normal">{lang === 'it' ? 'Download immediato del file' : 'Direct file download'}</span>
                    </div>
                  </button>

                  {/* PDF Export */}
                  <div className="p-2 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setExportMenuOpen(false);
                        setMobileMenuOpen(false);
                        onExportPDF();
                      }}
                      className="flex items-center gap-2 text-left text-gray-800 dark:text-zinc-200 cursor-pointer font-bold flex-1"
                    >
                      <FileDown size={16} className="text-red-500 shrink-0" />
                      <span className="font-bold">PDF</span>
                    </button>
                    <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-zinc-400 cursor-pointer select-none font-medium">
                      <input
                        type="checkbox"
                        checked={includePdfHeader}
                        onChange={(e) => setIncludePdfHeader(e.target.checked)}
                        className="w-3.5 h-3.5 rounded border-gray-300 dark:border-[#2D2D2D] text-red-600 focus:ring-red-500"
                      />
                      <span>{lang === 'it' ? 'Intestazione' : 'Header'}</span>
                    </label>
                  </div>

                  {/* TEX Export */}
                  <button
                    type="button"
                    onClick={() => {
                      setExportMenuOpen(false);
                      setMobileMenuOpen(false);
                      onExportTex();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg text-left text-gray-800 dark:text-zinc-200 cursor-pointer font-bold"
                  >
                    <Code size={16} className="text-indigo-500 shrink-0" />
                    <span className="font-bold">TEX (LaTeX)</span>
                  </button>

                  {/* MD Export */}
                  <button
                    type="button"
                    onClick={() => {
                      setExportMenuOpen(false);
                      setMobileMenuOpen(false);
                      onExportMd();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg text-left text-gray-800 dark:text-zinc-200 cursor-pointer font-bold"
                  >
                    <FileCode size={16} className="text-emerald-500 shrink-0" />
                    <span className="font-bold">MD (Markdown)</span>
                  </button>

                  {/* Google Docs Export */}
                  <button
                    type="button"
                    onClick={() => {
                      setExportMenuOpen(false);
                      setMobileMenuOpen(false);
                      if (onOpenGoogleDocsModal) onOpenGoogleDocsModal();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg text-left text-gray-800 dark:text-zinc-200 cursor-pointer font-bold"
                  >
                    <FileText size={16} className="text-blue-500 shrink-0" />
                    <span className="font-bold">Google Docs™ / Word (.docx)</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          <span className="hidden md:inline-block h-4 w-px bg-gray-200 dark:bg-[#2D2D2D] mx-0.5"></span>

          {/* Tools / Shortcuts / Guide Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            {setShowCheatsheet && (
              <button
                onClick={() => {
                  setShowCheatsheet(prev => !prev);
                  setMobileMenuOpen(false);
                }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs transition-all cursor-pointer font-bold ${
                  showCheatsheet 
                    ? 'border-emerald-600 bg-emerald-600 text-white dark:border-emerald-500 dark:bg-emerald-600' 
                    : 'border-gray-200 dark:border-[#2D2D2D] bg-gray-50 dark:bg-[#16181D] text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-[#2C313C]'
                }`}
                title={lang === 'it' ? 'Attiva/Disattiva Pannello Strumenti LiViA' : 'Toggle LiViA Tools Panel'}
                id="toggle-tools-panel-btn"
              >
                <Wrench size={15} />
                <span className="inline">{lang === 'it' ? 'Strumenti' : 'Tools'}</span>
              </button>
            )}

            {setShowAuxiliaryKeyboard && (
              <button
                onClick={() => {
                  setShowAuxiliaryKeyboard(prev => !prev);
                  setMobileMenuOpen(false);
                }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs transition-all cursor-pointer font-bold ${
                  showAuxiliaryKeyboard 
                    ? 'border-blue-600 bg-blue-600 text-white dark:border-blue-500 dark:bg-blue-600' 
                    : 'border-gray-200 dark:border-[#2D2D2D] bg-gray-50 dark:bg-[#16181D] text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-[#2C313C]'
                }`}
                title={lang === 'it' ? 'Attiva/Disattiva Tastiera Scorciatoie Rapide' : 'Toggle Quick Shortcuts Keyboard'}
                id="toggle-keyboard-panel-btn"
              >
                <Keyboard size={15} />
                <span className="inline">{lang === 'it' ? 'Scorciatoie' : 'Shortcuts'}</span>
              </button>
            )}

            

            {onOpenGuide && (
              <button
                onClick={() => {
                  onOpenGuide();
                  setMobileMenuOpen(false);
                }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs transition-all cursor-pointer font-bold ${
                  showCheatsheet && sidebarTab === 'guide'
                    ? 'border-amber-500 bg-amber-500 text-white dark:border-amber-500 dark:bg-amber-500' 
                    : 'border-gray-200 dark:border-[#2D2D2D] bg-gray-50 dark:bg-[#16181D] text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-[#2C313C]'
                }`}
                title={lang === 'it' ? 'Apri Guida Comandi & Manuale LiViA' : 'Open LiViA Command Guide & Manual'}
                id="toggle-guide-btn"
              >
                <HelpCircle size={15} />
                <span className="inline">{lang === 'it' ? 'Guida' : 'Guide'}</span>
              </button>
            )}

            {onOpenSettingsModal && (
              <button
                onClick={() => {
                  onOpenSettingsModal();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-gray-200 dark:border-[#2D2D2D] bg-gray-50 dark:bg-[#16181D] text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-[#2C313C] font-bold text-xs transition-all cursor-pointer"
                title={lang === 'it' ? 'Impostazioni Editor & Chiave API Gemini' : 'Editor Settings & Gemini API Key'}
                id="open-settings-btn"
              >
                <Settings size={15} className="text-blue-500 hover:rotate-45 transition-transform" />
                <span className="inline">{lang === 'it' ? 'Impostazioni' : 'Settings'}</span>
              </button>
            )}
          </div>

          {/* Theme Switcher Toggle */}
          <div className="flex items-center bg-gray-100 dark:bg-[#16181D] p-0.5 rounded-lg border border-gray-200 dark:border-[#2D2D2D]">
            <button
              onClick={() => setTheme('light')}
              className={`p-1 rounded-md transition-all cursor-pointer ${theme === 'light' ? 'bg-white text-amber-500 shadow-xs font-bold' : 'text-gray-400 hover:text-gray-600'}`}
              title={lang === 'it' ? 'Tema Chiaro' : 'Light Theme'}
              id="theme-light-btn"
            >
              <Sun size={15} />
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`p-1 rounded-md transition-all cursor-pointer ${theme === 'dark' ? 'bg-[#0D0F12] text-[#8AB4F8] shadow-xs font-bold' : 'text-gray-400 hover:text-gray-600'}`}
              title={lang === 'it' ? 'Tema Scuro' : 'Dark Theme'}
              id="theme-dark-btn"
            >
              <Moon size={15} />
            </button>
            <button
              onClick={() => setTheme('system')}
              className={`p-1 rounded-md transition-all cursor-pointer ${theme === 'system' ? 'bg-white dark:bg-[#2D2D2D] text-emerald-500 shadow-xs font-bold' : 'text-gray-400 hover:text-gray-600'}`}
              title={lang === 'it' ? 'Segui Sistema' : 'System Theme'}
              id="theme-system-btn"
            >
              <Laptop size={15} />
            </button>
          </div>

          {/* PROMINENT "NASCONDI BARRA" COLLAPSE BUTTON */}
          {setIsHeaderCollapsed && (
            <button
              type="button"
              onClick={() => setIsHeaderCollapsed(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all active:scale-95 cursor-pointer"
              title={lang === 'it' ? 'Nascondi barra (massimizza spazio per l\'editor)' : 'Hide toolbar (maximize space for editor)'}
              id="collapse-toolbar-btn"
            >
              <EyeOff size={15} className="text-slate-500 dark:text-slate-400" />
              <span className="font-bold">{lang === 'it' ? 'Nascondi' : 'Hide'}</span>
            </button>
          )}

        </div>

      </div>
    </header>
  );
}

