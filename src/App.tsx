/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Toolbar } from './components/Toolbar';
import { VimEditor } from './components/VimEditor';
import { GoogleDocsModal } from './components/GoogleDocsModal';
import { GoogleDriveIconsModal } from './components/GoogleDriveIconsModal';
import { PrivacyModal } from './components/PrivacyModal';
import { SupportModal } from './components/SupportModal';
import { TermsModal } from './components/TermsModal';
import { InfoModal } from './components/InfoModal';
import { SettingsModal } from './components/SettingsModal';
import { AiProfilesModal } from './components/AiProfilesModal';
import { AuxiliaryKeyboard } from './components/AuxiliaryKeyboard';
import { exportToPDF } from './utils/pdfExport';
import { copyToClipboard } from './utils/clipboard';
import { convertToLaTeX } from './utils/latexExport';
import { generateGeminiContent } from './utils/geminiClient';
import { VimMode, FileFormat, TEMPLATES, getTemplates, getLvarcTemplate, getHelpTemplate, getHelpColorsTemplate, getHelpFiguresTemplate, getHelpTablesTemplate, getHelpAiTemplate, HELP_TEMPLATE, HELP_COLORS_TEMPLATE, HELP_FIGURES_TEMPLATE, HELP_TABLES_TEMPLATE, HELP_AI_TEMPLATE, HELP_FIGURES_TABLES_TEMPLATE, FileData, sanitizeText, AiProfile } from './types';
import { parseOutline, OutlineElement } from './utils/outlineParser';
import { parseKeyFromVimCommand } from './utils/vimEngine';
import JSZip from 'jszip';
import { 
  Keyboard, 
  Sparkles, 
  HelpCircle, 
  BookOpen,
  Copy,
  X,
  Check, 
  FileCode, 
  Settings, 
  Eye, 
  ArrowRightLeft,
  Network,
  ListCollapse,
  FileText,
  ChevronRight,
  FolderOpen,
  Plus,
  Trash2,
  Upload,
  Folder,
  FileJson,
  Archive,
  Search,
  Download,
  Terminal,
  Cpu,
  Cloud,
  Maximize2,
  Minimize2,
  LogOut,
  RefreshCw,
  ExternalLink,
  Wrench
, ChevronUp } from 'lucide-react';
import {
  initAuth,
  googleSignIn,
  logout,
  listDriveFiles,
  readFromDrive,
  saveToDrive,
  createDriveFolder,
  DriveFile
} from './utils/googleDrive';

interface LvaConfig {
  showLineNumbers: boolean;
  wordWrap: boolean;
  theme: 'light' | 'dark' | 'system';
  fontSize: number;
  syntaxHighlight: boolean;
  lang?: 'it' | 'en';
  apiKey?: string;
  model?: 'flash' | 'pro' | 'flash-lite' | 'pro-thinking';
}

export function checkIsMobile(): boolean {
  if (typeof window === 'undefined') return false;
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera || '';
  const isMobileUA = /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  const isSmallScreen = window.innerWidth < 768;
  const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  return isMobileUA || (isSmallScreen && isTouch) || isSmallScreen;
}

function parseLvarc(content: string, isMobileOverride?: boolean): LvaConfig {
  const isMobile = isMobileOverride ?? checkIsMobile();
  const defaultFont = isMobile ? 20 : 16;

  const config: LvaConfig = {
    showLineNumbers: true,
    wordWrap: true,
    theme: 'dark',
    fontSize: defaultFont,
    syntaxHighlight: true
  };

  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('"')) {
      continue;
    }

    if (trimmed === 'set number' || trimmed === 'set nu') {
      config.showLineNumbers = true;
    } else if (trimmed === 'set nonumber' || trimmed === 'set nonu') {
      config.showLineNumbers = false;
    }

    if (trimmed === 'set wrap') {
      config.wordWrap = true;
    } else if (trimmed === 'set nowrap') {
      config.wordWrap = false;
    }

    if (trimmed === 'set syntax=on' || trimmed === 'syntax on') {
      config.syntaxHighlight = true;
    } else if (trimmed === 'set syntax=off' || trimmed === 'syntax off') {
      config.syntaxHighlight = false;
    }

    if (trimmed.startsWith('set theme=')) {
      const val = trimmed.replace('set theme=', '').trim();
      if (val === 'light' || val === 'dark' || val === 'system') {
        config.theme = val;
      }
    }

    if (trimmed.startsWith('set fontsize=')) {
      const val = parseInt(trimmed.replace('set fontsize=', '').trim(), 10);
      if (!isNaN(val) && val >= 10 && val <= 60) {
        config.fontSize = val;
      }
    }

    if (trimmed === 'set lang=it' || trimmed === 'set language=it' || trimmed === 'set it') {
      config.lang = 'it';
    } else if (trimmed === 'set lang=en' || trimmed === 'set language=en' || trimmed === 'set en') {
      config.lang = 'en';
    }

    
    if (trimmed === 'gem model flash-lite' || trimmed === 'set model=flash-lite' || trimmed === 'gem model=flash-lite') {
      config.model = 'flash-lite';
    } else if (trimmed === 'gem model flash' || trimmed === 'set model=flash' || trimmed === 'gem model=flash') {
      config.model = 'flash';
    } else if (trimmed === 'gem model pro-thinking' || trimmed === 'set model=pro-thinking' || trimmed === 'gem model=pro-thinking') {
      config.model = 'pro-thinking';
    } else if (trimmed === 'gem model pro' || trimmed === 'set model=pro' || trimmed === 'gem model=pro') {
      config.model = 'pro';
    }

    const keyMatch = parseKeyFromVimCommand(trimmed);
    if (keyMatch.isKeyCmd) {
      if (keyMatch.action === 'set' && keyMatch.value) {
        config.apiKey = keyMatch.value;
      } else if (keyMatch.action === 'clear') {
        config.apiKey = '';
      }
    }
  }

  return config;
}

export default function App() {
  // Config States (determined by .lvarc and device type)
  const [showLineNumbers, setShowLineNumbers] = useState<boolean>(true);
  const [wordWrap, setWordWrap] = useState<boolean>(true);
  const [editorFontSize, setEditorFontSize] = useState<number>(() => {
    return checkIsMobile() ? 20 : 16;
  });
  const [syntaxHighlightOn, setSyntaxHighlightOn] = useState<boolean>(true);

  // Virtual File System State
  const [fileHistory, setFileHistory] = useState<string[]>([]);
  const [virtualFiles, setVirtualFiles] = useState<FileData[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('livia_virtual_files');
      if (saved) {
        try { return JSON.parse(saved); } catch (e) {}
      }
    }
    const initialLang: 'it' | 'en' = (() => {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('livia_lang');
        if (saved === 'it' || saved === 'en') return saved;
      }
      return 'en';
    })();

    const initial = Object.values(getTemplates(initialLang));
    initial.push(getLvarcTemplate(initialLang, checkIsMobile()));
    return initial;
  });



  const [isAiProfilesModalOpen, setIsAiProfilesModalOpen] = useState(false);
  const [aiProfiles, setAiProfiles] = useState<AiProfile[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('livia_ai_profiles');
      if (saved) {
        try { return JSON.parse(saved); } catch (e) {}
      }
    }
    return [];
  });
  const [activeAiProfileId, setActiveAiProfileId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('livia_ai_profiles', JSON.stringify(aiProfiles));
    }
  }, [aiProfiles]);

  const handleAiCommand = async (action: 'prompt' | 'translate' | 'latin', arg: string, textToProcess: string, isSelection: boolean, onInsert: (newText: string, isUpdate?: boolean) => void) => {
    try {
      const userApiKey = typeof window !== 'undefined' ? localStorage.getItem('livia_custom_gemini_key') || undefined : undefined;
      let systemInstruction: string | undefined = undefined;
      
      if (activeAiProfileId) {
        const profile = aiProfiles.find(p => p.id === activeAiProfileId);
        if (profile) systemInstruction = profile.instruction;
      }
      
      const payload: any = { action, text: textToProcess, userApiKey, systemInstruction };
      if (action === 'translate') payload.targetLanguage = arg;
      if (action === 'prompt') { 
        payload.prompt = arg; 
        let storedTier = typeof window !== 'undefined' ? localStorage.getItem('livia_gemini_model') || 'flash' : 'flash';
        if (storedTier.includes('2.5') || storedTier.includes('2.0') || storedTier.includes('1.5') || storedTier.includes('3.7')) {
          storedTier = 'flash';
          if (typeof window !== 'undefined') localStorage.setItem('livia_gemini_model', 'flash');
        }
        payload.modelTier = storedTier; 
      }
      if (action === 'latin') payload.theme = arg;
      
      showToast(lang === 'it' ? 'Elaborazione IA in corso...' : 'AI processing...', 'info');
      
      // Insert placeholder
      const placeholder = lang === 'it' ? '⏳ Elaborazione in corso...' : '⏳ Processing...';
      onInsert(placeholder, false);
      let replaced = false;

      try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout
          
          const data = await generateGeminiContent(payload, lang);
          clearTimeout(timeoutId);
          
          onInsert(data.result || (lang === 'it' ? '⚠️ Nessun risultato.' : '⚠️ No result.'), true);
          replaced = true;
          showToast(lang === 'it' ? 'Fatto!' : 'Done!', 'success');
      } catch (innerE: any) {
          console.error("Fetch Error:", innerE);
          if (!replaced) {
             onInsert("❌ Errore di connessione o timeout: " + innerE.message, true);
          }
          throw innerE;
      }
    } catch (e: any) {
      showToast(e.message || 'Errore AI', 'error');
    }
  };
  const [content, setContent] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('livia_editor_content');
      if (saved !== null) return saved;
    }
    const initialLang: 'it' | 'en' = (() => {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('livia_lang');
        if (saved === 'it' || saved === 'en') return saved;
      }
      return 'en';
    })();
    return getTemplates(initialLang)['txt'].content;
  });
  const [filename, setFilename] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('livia_editor_filename');
      if (saved) return saved;
    }
    const initialLang: 'it' | 'en' = (() => {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('livia_lang');
        if (saved === 'it' || saved === 'en') return saved;
      }
      return 'en';
    })();
    return getTemplates(initialLang)['txt'].name;
  });
  const [fileSessionId, setFileSessionId] = useState<number>(0);
  const [format, setFormat] = useState<FileFormat>('txt');
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('dark');
  const [activeMode, setActiveMode] = useState<VimMode>('normal');
  const [lang, setLangState] = useState<'it' | 'en'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('livia_lang');
      if (saved === 'it' || saved === 'en') return saved;
    }
    return 'en';
  });

  const setLang = (newLang: 'it' | 'en') => {
    setLangState(newLang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('livia_lang', newLang);
    }
    // Automatically update default help templates, example.txt & .lvarc to match selected language
    const helpFile = getHelpTemplate(newLang);
    const colorsFile = getHelpColorsTemplate(newLang);
    const figuresFile = getHelpFiguresTemplate(newLang);
    const tablesFile = getHelpTablesTemplate(newLang);
    const lvarcFile = getLvarcTemplate(newLang, checkIsMobile());
    const txtFile = getTemplates(newLang)['txt'];

    setVirtualFiles(prev => prev.map(f => {
      if (f.name === 'help.txt') return helpFile;
      if (f.name === 'help_colors.md') return colorsFile;
      if (f.name === 'help_figures.md') return figuresFile;
      if (f.name === 'help_tables.md') return tablesFile;
      if (f.name === 'help_ai.md') return getHelpAiTemplate(newLang);
      if (f.name === 'help_ai.md') return getHelpAiTemplate(newLang);
      if (f.name === '.lvarc') return lvarcFile;
      if (f.name === 'example.txt') {
        const oldTxtIt = getTemplates('it')['txt'].content;
        const oldTxtEn = getTemplates('en')['txt'].content;
        if (f.content === oldTxtIt || f.content === oldTxtEn) {
          return txtFile;
        }
      }
      return f;
    }));

    if (filename === 'help.txt') setContent(helpFile.content);
    if (filename === 'help_colors.md') setContent(colorsFile.content);
    if (filename === 'help_figures.md') setContent(figuresFile.content);
    if (filename === 'help_tables.md') setContent(tablesFile.content);
    if (filename === 'help_ai.md') setContent(getHelpAiTemplate(newLang).content);
    if (filename === '.lvarc') setContent(lvarcFile.content);
    if (filename === 'example.txt') {
      const oldTxtIt = getTemplates('it')['txt'].content;
      const oldTxtEn = getTemplates('en')['txt'].content;
      if (content === oldTxtIt || content === oldTxtEn) {
        setContent(txtFile.content);
      }
    }
    setFileSessionId(prev => prev + 1);
  };

  // Self-heal templates if previously corrupted by example.txt
  useEffect(() => {
    setVirtualFiles(prev => {
      const templates = getTemplates(lang);
      const exampleIt = getTemplates('it')['txt'].content;
      const exampleEn = getTemplates('en')['txt'].content;
      let changed = false;
      const healed = prev.map(f => {
        if (f.name === 'help.txt') {
          const expectedHelp = getHelpTemplate(lang).content;
          if (f.content === exampleIt || f.content === exampleEn) {
            changed = true;
            return { ...f, content: expectedHelp, format: 'txt' as FileFormat };
          }
        }
        for (const [, tmpl] of Object.entries(templates)) {
          if (f.name === tmpl.name && f.name !== 'example.txt' && f.name !== 'esempio.txt') {
            if (f.content === exampleIt || f.content === exampleEn) {
              changed = true;
              return { ...f, content: tmpl.content, format: tmpl.format };
            }
          }
        }
        return f;
      });
      return changed ? healed : prev;
    });
  }, [lang]);

  // If current active file is help.txt or a template that had example.txt content, heal active editor content
  useEffect(() => {
    const exampleIt = getTemplates('it')['txt'].content;
    const exampleEn = getTemplates('en')['txt'].content;
    if (filename === 'help.txt' && (content === exampleIt || content === exampleEn)) {
      setContent(getHelpTemplate(lang).content);
      setFileSessionId(prev => prev + 1);
    }
  }, [filename, content, lang]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('livia_editor_content', content);
      localStorage.setItem('livia_editor_filename', filename);
      localStorage.setItem('livia_virtual_files', JSON.stringify(virtualFiles));
    }
  }, [content, filename, virtualFiles]);

  // Self-heal stale/deprecated AI model settings in localStorage (e.g. from older mobile sessions)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedModel = localStorage.getItem('livia_gemini_model');
      if (savedModel && (savedModel.includes('2.5') || savedModel.includes('2.0') || savedModel.includes('1.5') || savedModel.includes('3.7'))) {
        localStorage.setItem('livia_gemini_model', 'flash');
      }
      const savedDef = localStorage.getItem('livia_default_model');
      if (savedDef && (savedDef.includes('2.5') || savedDef.includes('2.0') || savedDef.includes('1.5') || savedDef.includes('3.7'))) {
        localStorage.setItem('livia_default_model', 'flash');
      }
    }
  }, []);

  const [activeAiModel, setActiveAiModel] = useState<'flash' | 'flash-lite' | 'pro'>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('livia_gemini_model');
      if (stored === 'flash-lite' || stored === 'pro') return stored;
    }
    return 'flash';
  });

  const handleSelectAiModel = (m: 'flash' | 'flash-lite' | 'pro') => {
    setActiveAiModel(m);
    if (typeof window !== 'undefined') {
      localStorage.setItem('livia_gemini_model', m);
    }
    showToast(
      lang === 'it' 
        ? `Modello impostato: ${m === 'flash' ? 'Gemini 3.8 Flash' : m === 'flash-lite' ? 'Gemini 3.1 Flash-Lite' : 'Gemini 3.1 Pro'}`
        : `Model set: ${m === 'flash' ? 'Gemini 3.8 Flash' : m === 'flash-lite' ? 'Gemini 3.1 Flash-Lite' : 'Gemini 3.1 Pro'}`,
      'info'
    );
  };

  const [includePdfHeader, setIncludePdfHeader] = useState<boolean>(true);
  
  // Header collapse state (persisted in localStorage for focus/zen editor mode)
  const [isHeaderCollapsed, setIsHeaderCollapsedState] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('livia_header_collapsed') === 'true';
    }
    return false;
  });

  const setIsHeaderCollapsed = (val: boolean | ((prev: boolean) => boolean)) => {
    setIsHeaderCollapsedState(prev => {
      const next = typeof val === 'function' ? val(prev) : val;
      if (typeof window !== 'undefined') {
        localStorage.setItem('livia_header_collapsed', String(next));
      }
      return next;
    });
  };

  // Sidebar / panel toggles & multidirectional resizing
  const [showCheatsheet, setShowCheatsheet] = useState<boolean>(false);
  const [showAuxiliaryKeyboard, setShowAuxiliaryKeyboard] = useState<boolean>(false);
  const [isSidebarWide, setIsSidebarWide] = useState<boolean>(false);
  const [sidebarTab, setSidebarTab] = useState<'files' | 'outline' | 'drive' | 'guide'>('files');
  const [openGuideSection, setOpenGuideSection] = useState<string>("presentation");
  const [copiedOpenUrl, setCopiedOpenUrl] = useState<boolean>(false);
  
  // Dimensions state for panels
  const [sidebarWidth, setSidebarWidth] = useState<number>(340);
  const [sidebarHeight, setSidebarHeight] = useState<number>(450);
  const [keyboardHeight, setKeyboardHeight] = useState<number>(140);

  // Resize Dragging states
  const [isResizingSidebarWidth, setIsResizingSidebarWidth] = useState<boolean>(false);
  const [isResizingSidebarHeight, setIsResizingSidebarHeight] = useState<boolean>(false);
  const [isResizingKeyboardHeight, setIsResizingKeyboardHeight] = useState<boolean>(false);

  // Drag start position trackers
  const [dragStartY, setDragStartY] = useState<number>(0);
  const [dragStartHeight, setDragStartHeight] = useState<number>(450);
  const [dragStartX, setDragStartX] = useState<number>(0);
  const [dragStartWidth, setDragStartWidth] = useState<number>(340);


  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? (e.touches[0] ? e.touches[0].clientX : 0) : e.clientX;
      const clientY = 'touches' in e ? (e.touches[0] ? e.touches[0].clientY : 0) : e.clientY;

      if (isResizingSidebarWidth) {
        const deltaX = dragStartX - clientX;
        const newWidth = Math.min(Math.max(220, dragStartWidth + deltaX), window.innerWidth - 200);
        setSidebarWidth(newWidth);
      }
      if (isResizingSidebarHeight) {
        const deltaY = dragStartY - clientY;
        const newHeight = Math.min(Math.max(160, dragStartHeight + deltaY), window.innerHeight - 100);
        setSidebarHeight(newHeight);
      }
      if (isResizingKeyboardHeight) {
        const deltaY = dragStartY - clientY;
        const newHeight = Math.min(Math.max(80, dragStartHeight + deltaY), 450);
        setKeyboardHeight(newHeight);
      }
    };

    const handleEnd = () => {
      setIsResizingSidebarWidth(false);
      setIsResizingSidebarHeight(false);
      setIsResizingKeyboardHeight(false);
    };

    if (isResizingSidebarWidth || isResizingSidebarHeight || isResizingKeyboardHeight) {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', handleMove);
      window.addEventListener('touchend', handleEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isResizingSidebarWidth, isResizingSidebarHeight, isResizingKeyboardHeight, dragStartY, dragStartHeight, dragStartX, dragStartWidth]);

  // Google Drive Integration States
  const [driveUser, setDriveUser] = useState<any>(null);
  const [driveToken, setDriveToken] = useState<string | null>(null);
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
  const [activeDriveFileId, setActiveDriveFileId] = useState<string | null>(null);
  const [isLoadingDrive, setIsLoadingDrive] = useState<boolean>(false);
  const [driveSearch, setDriveSearch] = useState<string>('');
  const [currentDriveFolderId, setCurrentDriveFolderId] = useState<string>('root');
  const [driveFolderHistory, setDriveFolderHistory] = useState<{ id: string; name: string }[]>([]);
  const [currentDriveFolderName, setCurrentDriveFolderName] = useState<string>('Il mio Drive');
  const [newDriveFolderName, setNewDriveFolderName] = useState<string>('');
  const [isDriveFullScreen, setIsDriveFullScreen] = useState<boolean>(false);
  const [drivePickerFilter, setDrivePickerFilter] = useState<'all' | 'docs'>('all');
  const [pendingFileAction, setPendingFileAction] = useState<{
    source: 'local' | 'drive';
    name: string;
    localContent?: string;
    localFormat?: any;
    driveFile?: any;
  } | null>(null);
  
  // Custom Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Google Docs Modal State
  const [isGoogleDocsModalOpen, setIsGoogleDocsModalOpen] = useState<boolean>(false);

  // Google Drive API Icons Modal State
  const [isDriveIconsModalOpen, setIsDriveIconsModalOpen] = useState<boolean>(false);

  // Privacy Policy Modal State
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState<boolean>(false);

  // Support & Help Center Modal State
  const [isSupportModalOpen, setIsSupportModalOpen] = useState<boolean>(false);

  // Terms of Service Modal State
  const [isTermsModalOpen, setIsTermsModalOpen] = useState<boolean>(false);

  // Info Modal State ('i' button)
  const [isInfoModalOpen, setIsInfoModalOpen] = useState<boolean>(false);

  // Settings Modal State
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);

  // Auto-open Privacy, Support or Terms Modals if requested via URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.has('privacy') || window.location.pathname === '/privacy') {
        setIsPrivacyModalOpen(true);
      }
      if (params.has('support') || params.has('help') || window.location.pathname === '/support' || window.location.pathname === '/help') {
        setIsSupportModalOpen(true);
      }
      if (params.has('terms') || window.location.pathname === '/terms') {
        setIsTermsModalOpen(true);
      }
    }
  }, []);

  // File Manager State & Handler
  const [newFileName, setNewFileName] = useState<string>('');
  const [fileSearch, setFileSearch] = useState<string>('');

  const handleZipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = e.target.files;
    if (!uploadedFiles) return;

    for (let i = 0; i < uploadedFiles.length; i++) {
      const file = uploadedFiles[i];
      if (file.name.endsWith('.zip')) {
        showToast(`Decompressione archivio ${file.name}...`, 'info');
        try {
          const zip = new JSZip();
          const contents = await zip.loadAsync(file);
          let count = 0;
          const extractedList: FileData[] = [];
          
          for (const [relativePath, zipEntry] of Object.entries(contents.files)) {
            if (!zipEntry.dir) {
              const text = await zipEntry.async('string');
              const ext = relativePath.split('.').pop() || 'txt';
              const formatMap: Record<string, FileFormat> = {
                txt: 'txt', md: 'md', docx: 'docx', json: 'json', xml: 'xml', py: 'py', kt: 'kt', js: 'js', ts: 'ts', sh: 'bash', bash: 'bash', tex: 'tex', java: 'java', c: 'c', cpp: 'cpp', ly: 'ly', lilypond: 'ly', html: 'html', htm: 'html', css: 'css', sql: 'sql', rs: 'rs', go: 'go'
              };
              extractedList.push({
                name: relativePath,
                format: formatMap[ext] || 'txt',
                content: text
              });
              count++;
            }
          }

          if (extractedList.length > 0) {
            setVirtualFiles(prev => {
              const filteredPrev = prev.filter(p => !extractedList.some(e => e.name === p.name));
              return [...filteredPrev, ...extractedList];
            });
            const first = extractedList[0];
            setContent(first.content);
            setFilename(first.name);
            setFormat(first.format);
            showToast(`Estratti ${count} file dall'archivio ZIP.`, 'success');
          }
        } catch (err) {
          showToast('Errore durante la lettura dell\'archivio ZIP.', 'error');
        }
      } else {
        const reader = new FileReader();
        reader.onload = (event) => {
          const text = event.target?.result as string || '';
          const ext = file.name.split('.').pop() || 'txt';
          const formatMap: Record<string, FileFormat> = {
            txt: 'txt', md: 'md', docx: 'docx', json: 'json', xml: 'xml', py: 'py', kt: 'kt', js: 'js', ts: 'ts', sh: 'bash', bash: 'bash', tex: 'tex', java: 'java', c: 'c', cpp: 'cpp', ly: 'ly', lilypond: 'ly', html: 'html', htm: 'html', css: 'css', sql: 'sql', rs: 'rs', go: 'go'
          };
          const newFile: FileData = {
            name: file.name,
            format: formatMap[ext] || 'txt',
            content: text
          };
          setVirtualFiles(prev => {
            const filtered = prev.filter(p => p.name !== file.name);
            return [...filtered, newFile];
          });
          setContent(newFile.content);
          setFilename(newFile.name);
          setFormat(newFile.format);
          showToast(`File "${file.name}" importato con successo.`, 'success');
        };
        reader.readAsText(file);
      }
    }
  };

  // Show customized transient toasts
  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  // Setup configuration reloader for .lvarc (bi-directional synchronization)
  const reloadLvarc = (contentStr: string) => {
    const isMob = checkIsMobile();
    const config = parseLvarc(contentStr, isMob);
    setShowLineNumbers(config.showLineNumbers);
    setWordWrap(config.wordWrap);
    setEditorFontSize(config.fontSize);
    setSyntaxHighlightOn(config.syntaxHighlight);
    if (config.theme !== theme) {
      setTheme(config.theme);
    }
    if (config.lang && config.lang !== lang) {
      setLang(config.lang);
    }
    if (config.apiKey) {
      localStorage.setItem('livia_custom_gemini_key', config.apiKey);
    }
    if (config.model) {
      localStorage.setItem('livia_gemini_model', config.model);
    }
  };

  // --- Google Drive Handlers ---

  const fetchDriveFiles = async (token: string, folderId: string = 'root') => {
    setIsLoadingDrive(true);
    try {
      const files = await listDriveFiles(token, folderId);
      setDriveFiles(files);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoadingDrive(false);
    }
  };

  useEffect(() => {
    // Initialize Google Auth state listener
    const unsubscribe = initAuth(
      (user, token) => {
        setDriveUser(user);
        setDriveToken(token);
        fetchDriveFiles(token, 'root');
        if (typeof window !== 'undefined') {
          const wasOpen = sessionStorage.getItem('livia_was_drive_modal_open');
          if (wasOpen === 'true') {
            setIsDriveFullScreen(true);
          }
          const wasSidebarOpen = sessionStorage.getItem('livia_was_sidebar_open');
          if (wasSidebarOpen === 'true') {
            setShowCheatsheet(true);
          }
          const savedTab = sessionStorage.getItem('livia_sidebar_tab');
          if (savedTab) {
            setSidebarTab(savedTab as any);
          }
          
          sessionStorage.removeItem('livia_was_drive_modal_open');
          sessionStorage.removeItem('livia_was_sidebar_open');
          sessionStorage.removeItem('livia_sidebar_tab');
        }
      },
      () => {
        setDriveUser(null);
        setDriveToken(null);
      }
    );
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  // Listen for Google Drive incoming 'state' (Open with...) parameter
  useEffect(() => {
    const handleUrlState = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const stateStr = urlParams.get('state');
      if (stateStr && driveToken) {
        try {
          const stateObj = JSON.parse(stateStr);
          if (stateObj.action === 'open' && Array.isArray(stateObj.ids) && stateObj.ids.length > 0) {
            const fileId = stateObj.ids[0];
            setIsLoadingDrive(true);
            
            // Fetch metadata first to get name and mimeType
            const metaRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType`, {
              headers: { Authorization: `Bearer ${driveToken}` },
            });
            let name = 'file_drive.txt';
            let mimeType: string | undefined = undefined;
            if (metaRes.ok) {
              const metaData = await metaRes.json();
              name = metaData.name || 'file_drive.txt';
              mimeType = metaData.mimeType;
            }

            const fileContent = await readFromDrive(driveToken, fileId, mimeType);
            setContent(fileContent);
            setFilename(name);
            setActiveDriveFileId(fileId);
            const ext = name.split('.').pop()?.toLowerCase() || 'txt';
            const formatMap: Record<string, FileFormat> = {
              txt: 'txt', md: 'md', docx: 'docx', json: 'json', xml: 'xml', py: 'py', kt: 'kt', js: 'js', ts: 'ts', sh: 'bash', bash: 'bash', tex: 'tex', java: 'java', c: 'c', cpp: 'cpp', ly: 'ly', lilypond: 'ly', html: 'html', htm: 'html', css: 'css', sql: 'sql', rs: 'rs', go: 'go'
            };
            setFormat(mimeType === 'application/vnd.google-apps.document' ? 'md' : (formatMap[ext] || 'txt'));
            
            showToast(
              lang === 'it' 
                ? `Aperto file da Google Drive: ${name}` 
                : `Opened file from Google Drive: ${name}`, 
              'success'
            );
          }
        } catch (err) {
          console.error('Errore nel parsing del parametro state:', err);
        } finally {
          setIsLoadingDrive(false);
        }
      }
    };

    if (driveToken) {
      handleUrlState();
    }
  }, [driveToken]);

  const handleDriveSignIn = async () => {
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('livia_was_drive_modal_open', isDriveFullScreen ? 'true' : 'false');
        sessionStorage.setItem('livia_was_sidebar_open', showCheatsheet ? 'true' : 'false');
        sessionStorage.setItem('livia_sidebar_tab', sidebarTab);
      }
      const result = await googleSignIn();
      if (result) {
        setDriveUser(result.user);
        setDriveToken(result.accessToken);
        showToast(
          lang === 'it' 
            ? `Accesso Google Drive eseguito: ${result.user.displayName}` 
            : `Logged in to Google Drive: ${result.user.displayName}`, 
          'success'
        );
        setCurrentDriveFolderId('root');
        setCurrentDriveFolderName('Il mio Drive');
        setDriveFolderHistory([]);
        fetchDriveFiles(result.accessToken, 'root');
        setSidebarTab('drive');
      }
    } catch (err: any) {
      showToast(lang === 'it' ? 'Accesso fallito.' : 'Login failed.', 'error');
    }
  };

  const handleDriveSignOut = async () => {
    try {
      await logout();
      setDriveUser(null);
      setDriveToken(null);
      setDriveFiles([]);
      setActiveDriveFileId(null);
      setCurrentDriveFolderId('root');
      setCurrentDriveFolderName('Il mio Drive');
      setDriveFolderHistory([]);
      showToast(lang === 'it' ? 'Disconnesso da Google Drive.' : 'Disconnected from Google Drive.', 'success');
    } catch (err: any) {
      showToast(lang === 'it' ? 'Errore durante la disconnessione.' : 'Error during logout.', 'error');
    }
  };

  const handleSaveToDrive = async () => {
    if (!driveToken) {
      showToast(lang === 'it' ? 'Devi prima accedere a Google Drive.' : 'You must first log in to Google Drive.', 'error');
      setSidebarTab('drive');
      return;
    }
    
    const confirmed = window.confirm(
      lang === 'it' 
        ? `Sei sicuro di voler salvare/sovrascrivere il file "${filename}" su Google Drive?`
        : `Are you sure you want to save/overwrite the file "${filename}" to Google Drive?`
    );
    if (!confirmed) return;

    setIsLoadingDrive(true);
    try {
      const res = await saveToDrive(driveToken, filename, content, activeDriveFileId, currentDriveFolderId === 'root' ? null : currentDriveFolderId);
      setActiveDriveFileId(res.id);
      showToast(
        lang === 'it' 
          ? `File "${res.name}" salvato con successo su Google Drive!` 
          : `File "${res.name}" successfully saved to Google Drive!`, 
        'success'
      );
      fetchDriveFiles(driveToken, currentDriveFolderId);
    } catch (err: any) {
      showToast(
        lang === 'it' 
          ? 'Errore durante il salvataggio su Google Drive.' 
          : 'Error saving to Google Drive.', 
        'error'
      );
    } finally {
      setIsLoadingDrive(false);
    }
  };

  const handleNavigateIntoFolder = async (folderId: string, folderName: string) => {
    if (!driveToken || isLoadingDrive || folderId === currentDriveFolderId) return;
    setIsLoadingDrive(true);
    try {
      if (currentDriveFolderId !== 'root') {
        setDriveFolderHistory(prev => {
          if (prev.length > 0 && prev[prev.length - 1].id === currentDriveFolderId) {
            return prev;
          }
          return [...prev, { id: currentDriveFolderId, name: currentDriveFolderName }];
        });
      } else {
        setDriveFolderHistory([]);
      }
      setCurrentDriveFolderId(folderId);
      setCurrentDriveFolderName(folderName);
      await fetchDriveFiles(driveToken, folderId);
    } catch (err: any) {
      showToast(lang === 'it' ? 'Errore durante la navigazione della cartella.' : 'Error navigating folder.', 'error');
    } finally {
      setIsLoadingDrive(false);
    }
  };

  const handleNavigateBack = async () => {
    if (!driveToken || isLoadingDrive) return;
    if (driveFolderHistory.length === 0) {
      if (currentDriveFolderId !== 'root') {
        await handleNavigateToRoot();
      }
      return;
    }
    setIsLoadingDrive(true);
    try {
      const parent = driveFolderHistory[driveFolderHistory.length - 1];
      setDriveFolderHistory(prev => prev.slice(0, -1));
      setCurrentDriveFolderId(parent.id);
      setCurrentDriveFolderName(parent.name);
      await fetchDriveFiles(driveToken, parent.id);
    } catch (err: any) {
      showToast(lang === 'it' ? 'Errore durante il ritorno alla cartella precedente.' : 'Error navigating back.', 'error');
    } finally {
      setIsLoadingDrive(false);
    }
  };

  const handleNavigateToHistoryFolder = async (index: number) => {
    if (!driveToken) return;
    setIsLoadingDrive(true);
    try {
      const targetFolder = driveFolderHistory[index];
      const newHistory = driveFolderHistory.slice(0, index);
      setDriveFolderHistory(newHistory);
      setCurrentDriveFolderId(targetFolder.id);
      setCurrentDriveFolderName(targetFolder.name);
      await fetchDriveFiles(driveToken, targetFolder.id);
    } catch (err: any) {
      showToast(lang === 'it' ? 'Errore durante la navigazione della cartella.' : 'Error navigating folder.', 'error');
    } finally {
      setIsLoadingDrive(false);
    }
  };

  const handleNavigateToRoot = async () => {
    if (!driveToken) return;
    setIsLoadingDrive(true);
    try {
      setDriveFolderHistory([]);
      setCurrentDriveFolderId('root');
      setCurrentDriveFolderName('Il mio Drive');
      await fetchDriveFiles(driveToken, 'root');
    } catch (err: any) {
      showToast(lang === 'it' ? 'Errore durante il ritorno alla cartella radice.' : 'Error navigating to root.', 'error');
    } finally {
      setIsLoadingDrive(false);
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driveToken || !newDriveFolderName.trim()) return;
    const fName = newDriveFolderName.trim();
    setIsLoadingDrive(true);
    try {
      await createDriveFolder(driveToken, fName, currentDriveFolderId === 'root' ? null : currentDriveFolderId);
      setNewDriveFolderName('');
      showToast(lang === 'it' ? `Cartella "${fName}" creata con successo!` : `Folder "${fName}" created successfully!`, 'success');
      await fetchDriveFiles(driveToken, currentDriveFolderId);
    } catch (err: any) {
      showToast(lang === 'it' ? 'Errore nella creazione della cartella.' : 'Error creating folder.', 'error');
    } finally {
      setIsLoadingDrive(false);
    }
  };

  const handleOpenDriveFile = async (file: DriveFile) => {
    if (!driveToken) return;
    setIsLoadingDrive(true);
    try {
      const fileContent = await readFromDrive(driveToken, file.id, file.mimeType);
      setContent(fileContent);
      setFilename(file.name);
      setActiveDriveFileId(file.id);
      
      const ext = file.name.split('.').pop() || 'txt';
      const formatMap: Record<string, FileFormat> = {
        txt: 'txt', md: 'md', json: 'json', xml: 'xml', py: 'py', kt: 'kt', js: 'js', ts: 'ts', sh: 'bash', bash: 'bash', tex: 'tex'
      };
      setFormat(formatMap[ext] || 'txt');
      
      // Add to virtualFiles and sync lvarc if applicable
      const isLvarcFile = file.name === '.lvarc' || file.name.endsWith('.lvarc') || file.name.endsWith('.lvarc.txt');
      const targetVirtualName = isLvarcFile ? '.lvarc' : file.name;

      if (isLvarcFile) {
        reloadLvarc(fileContent);
      }

      setVirtualFiles(prev => {
        const existing = prev.find(f => f.name === targetVirtualName);
        if (existing) {
          return prev.map(f => f.name === targetVirtualName ? { ...f, content: fileContent } : f);
        } else {
          return [...prev, { name: targetVirtualName, format: formatMap[ext] || 'txt', content: fileContent }];
        }
      });

      showToast(
        lang === 'it' 
          ? `File "${file.name}" caricato da Google Drive.` 
          : `File "${file.name}" loaded from Google Drive.`, 
        'success'
      );
    } catch (err: any) {
      showToast(
        lang === 'it' 
          ? 'Errore durante l\'apertura del file da Google Drive.' 
          : 'Error opening file from Google Drive.', 
        'error'
      );
    } finally {
      setIsLoadingDrive(false);
    }
  };

  // Load initial .lvarc once on mount
  useEffect(() => {
    const lvarc = virtualFiles.find(f => f.name === '.lvarc');
    if (lvarc) {
      reloadLvarc(lvarc.content);
    }
  }, []);

  // Auto-detect API key from URL query or hash (e.g. ?key=AIzaSy... or #key=AIzaSy...) for Live OS / clean browser sessions
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const urlParams = new URLSearchParams(window.location.search);
      let key = urlParams.get('key') || urlParams.get('apiKey') || urlParams.get('gemini_key');
      
      if (!key && window.location.hash) {
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#\/?/, ''));
        key = hashParams.get('key') || hashParams.get('apiKey') || hashParams.get('gemini_key');
      }

      if (key && key.trim() !== '') {
        const cleanKey = key.trim();
        localStorage.setItem('livia_custom_gemini_key', cleanKey);
        
        // Clean key from address bar for security
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
        
        showToast(
          lang === 'it' 
            ? '🔑 API Key Gemini caricata dall\'URL e salvata con successo!' 
            : '🔑 Gemini API Key loaded from URL and saved successfully!', 
          'info'
        );
      }
    } catch (e) {
      console.warn('Unable to parse key from URL', e);
    }
  }, []);

  // Manage application visual theme
  useEffect(() => {
    const handleThemeChange = () => {
      const root = document.documentElement;
      if (theme === 'dark') {
        root.classList.add('dark');
      } else if (theme === 'light') {
        root.classList.remove('dark');
      } else {
        // 'system' theme detection
        const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (isSystemDark) {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
      }
    };

    handleThemeChange();

    // Listen to changes in system theme preferences if set to system
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => handleThemeChange();
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, [theme]);

  // Read current Vim mode from LiViA Status Bar periodically (or intercept)
  useEffect(() => {
    const interval = setInterval(() => {
      const statusText = document.querySelector('footer span.font-medium')?.textContent || '';
      if (statusText.includes('INSERIMENTO')) {
        setActiveMode('insert');
      } else if (statusText.includes('COMMAND') || statusText.includes('sostituzione')) {
        setActiveMode('command');
      } else {
        setActiveMode('normal');
      }
    }, 150);
    return () => clearInterval(interval);
  }, []);

  // Sync internal yank buffer to Android / Debian physical clipboard
  const handleSyncClipboard = (textToYank: string) => {
    if (!textToYank) return;
    navigator.clipboard.writeText(textToYank)
      .then(() => {
        showToast('Testo strappato (yank) e copiato negli appunti di sistema.', 'success');
      })
      .catch(() => {
        showToast('Yank eseguito localmente (consenti permessi clipboard nel browser).', 'info');
      });
  };

  // Copy all content to clipboard helper
  const handleCopyAll = () => {
    navigator.clipboard.writeText(content)
      .then(() => {
        showToast('Intero documento copiato negli appunti!', 'success');
      })
      .catch(() => {
        showToast('Impossibile copiare. Riprova o seleziona manualmente.', 'error');
      });
  };

  // Paste helper from external clipboard (prompts user for permissions)
  const handleReadClipboard = async (): Promise<string> => {
    try {
      const text = await navigator.clipboard.readText();
      return text;
    } catch {
      return '';
    }
  };

  // Trigger file simulation keys from auxiliary keyboard
  const handleSimulateKey = (key: string) => {
    const triggerBtn = document.getElementById('simulated-key-trigger');
    if (triggerBtn) {
      triggerBtn.setAttribute('data-key', key);
      triggerBtn.click();
    }
  };

  // Trigger simulated insertion of smart code snippets
  const handleInsertSnippet = (text: string, offset: number) => {
    const triggerBtn = document.getElementById('simulated-snippet-trigger');
    if (triggerBtn) {
      triggerBtn.setAttribute('data-text', text);
      triggerBtn.setAttribute('data-offset', offset.toString());
      triggerBtn.click();
    }
  };

  // Trigger simulated jump-to-line inside VimEditor
  const handleJumpToLine = (line: number) => {
    const triggerBtn = document.getElementById('simulated-jump-trigger');
    if (triggerBtn) {
      triggerBtn.setAttribute('data-line', line.toString());
      triggerBtn.click();
    }
  };

  // Trigger opening the LiViA AI Assistant Modal
  const handleOpenAiAssistant = () => {
    const triggerBtn = document.getElementById('simulated-ai-trigger');
    if (triggerBtn) {
      triggerBtn.click();
    }
  };

  // State & handler for Gboard / System Keyboard Toggle
  const [isSoftKeyboardOpen, setIsSoftKeyboardOpen] = useState<boolean>(false);

  const handleToggleSoftKeyboard = (forceState?: boolean) => {
    const triggerBtn = document.getElementById('simulated-soft-keyboard-toggle');
    if (triggerBtn) {
      if (forceState !== undefined) {
        triggerBtn.setAttribute('data-state', forceState ? 'true' : 'false');
      } else {
        triggerBtn.removeAttribute('data-state');
      }
      triggerBtn.click();
    }
  };

  // Export content to raw text or code file
  const handleSaveFile = async () => {
    try {
      if (filename.toLowerCase().endsWith('.docx')) {
        const { exportToDocx } = await import('./utils/docxExport');
        await exportToDocx(filename, content);
        showToast(`File "${filename}" salvato e scaricato come DOCX.`, 'success');
        return;
      }
      
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast(`File "${filename}" salvato e scaricato.`, 'success');
    } catch (err) {
      showToast('Errore durante il salvataggio del file.', 'error');
    }
  };

  // Export to PDF helper
  const handleExportPDF = async () => {
    try {
      showToast(lang === 'it' ? 'Generazione PDF formattato...' : 'Generating formatted PDF...', 'info');
      await exportToPDF(filename, content, includePdfHeader);
      showToast(lang === 'it' ? 'Documento esportato in PDF con successo!' : 'Document exported to PDF successfully!', 'success');
    } catch (err) {
      console.error('PDF export error:', err);
      showToast(lang === 'it' ? 'Impossibile esportare in PDF.' : 'Failed to export to PDF.', 'error');
    }
  };

  // Export to LaTeX (.tex) helper
  const handleExportTex = () => {
    try {
      const baseName = filename.substring(0, filename.lastIndexOf('.')) || filename;
      const texFilename = `${baseName}.tex`;
      const texContent = convertToLaTeX(filename, content, format);
      const blob = new Blob([texContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = texFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast(lang === 'it' ? `Documento esportato in LaTeX ("${texFilename}") con successo!` : `Document exported to LaTeX ("${texFilename}") successfully!`, 'success');
    } catch (err) {
      showToast(lang === 'it' ? 'Impossibile esportare in LaTeX.' : 'Failed to export to LaTeX.', 'error');
    }
  };

  // Export to Markdown (.md) helper
  const handleExportMd = () => {
    try {
      const baseName = filename.substring(0, filename.lastIndexOf('.')) || filename;
      const mdFilename = `${baseName}.md`;
      const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = mdFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast(lang === 'it' ? `Documento esportato in Markdown ("${mdFilename}") con successo!` : `Document exported to Markdown ("${mdFilename}") successfully!`, 'success');
    } catch (err) {
      showToast(lang === 'it' ? 'Impossibile esportare in Markdown.' : 'Failed to export to Markdown.', 'error');
    }
  };

  // Callback when user loads raw text, code template or custom file
  const handleLoadContent = (newContent: string, newName: string, newFormat: FileFormat) => {
    setContent(newContent);
    setFilename(newName);
    setFormat(newFormat);
    setFileSessionId(prev => prev + 1);
    setVirtualFiles(prev => {
      const existing = prev.find(f => f.name === newName);
      if (existing) {
        return prev.map(f => f.name === newName ? { ...f, content: newContent, format: newFormat } : f);
      } else {
        return [...prev, { name: newName, format: newFormat, content: newContent }];
      }
    });
    showToast(`Caricato documento: ${newName}`, 'info');
  };

  return (
    <div className="flex-1 w-full h-full flex flex-col bg-gray-50 dark:bg-[#0D0F12] transition-colors duration-200 overflow-hidden min-h-0">
      
      {/* Toast Alert Box */}
      {toast && (
        <div 
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border transition-all duration-300 font-sans ${
            toast.type === 'success' 
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/90 dark:text-emerald-300 dark:border-emerald-850'
              : toast.type === 'error'
              ? 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/90 dark:text-red-300 dark:border-red-850'
              : 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-[#16181D] dark:text-blue-300 dark:border-[#2D2D2D]'
          }`}
          id="system-toast"
        >
          <Sparkles size={16} className={toast.type === 'success' ? 'text-emerald-500' : 'text-blue-500'} />
          <span className="text-xs font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Primary Navigation / Toolbar */}
      <Toolbar
        filename={filename}
        setFilename={setFilename}
        format={format}
        setFormat={setFormat}
        onLoadContent={handleLoadContent}
        onImportFileAction={(content, name, format) => setPendingFileAction({ source: 'local', name, localContent: content, localFormat: format })}
        onOpenDrivePicker={() => { setDrivePickerFilter('all'); setIsDriveFullScreen(true); }}
        onOpenDocsPicker={() => { setDrivePickerFilter('docs'); setIsDriveFullScreen(true); }}
        onExportPDF={handleExportPDF}
        onExportTex={handleExportTex}
        onExportMd={handleExportMd}
        onSaveFile={handleSaveFile}
        onCopyAll={handleCopyAll}
        theme={theme}
        setTheme={setTheme}
        lang={lang}
        setLang={setLang}
        includePdfHeader={includePdfHeader}
        setIncludePdfHeader={setIncludePdfHeader}
        onOpenGoogleDocsModal={() => setIsGoogleDocsModalOpen(true)}
        onOpenDriveIconsModal={() => setIsDriveIconsModalOpen(true)}
        onOpenPrivacyModal={() => setIsPrivacyModalOpen(true)}
        onOpenInfoModal={() => setIsInfoModalOpen(true)}
        showCheatsheet={showCheatsheet}
        setShowCheatsheet={setShowCheatsheet}
        showAuxiliaryKeyboard={showAuxiliaryKeyboard}
        setShowAuxiliaryKeyboard={setShowAuxiliaryKeyboard}
        sidebarTab={sidebarTab}
        isHeaderCollapsed={isHeaderCollapsed}
        setIsHeaderCollapsed={setIsHeaderCollapsed}
        onOpenGuide={() => {
          if (showCheatsheet && sidebarTab === 'guide') {
            setShowCheatsheet(false);
          } else {
            setShowCheatsheet(true);
            setSidebarTab('guide');
          }
        }}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        onOpenAiAssistant={handleOpenAiAssistant}
      />

      {/* Main Workspace Frame */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-1 sm:p-4 flex flex-col lg:flex-row gap-2 sm:gap-4 overflow-hidden min-h-0 min-w-0">
        
        
        {/* Vim Editor Canvas Container */}
        <div className="flex-1 flex flex-col bg-white dark:bg-[#0D0F12] rounded-2xl border border-gray-200 dark:border-[#2D2D2D] shadow-sm overflow-hidden transition-all min-h-0 min-w-0">
          
          {/* AI Model & Profile Control Header Bar */}
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-100 dark:border-[#202530] bg-gray-50/90 dark:bg-[#12151B] text-xs shrink-0 flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleOpenAiAssistant}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-linear-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-bold text-[11px] shadow-xs cursor-pointer transition-all active:scale-95"
                title={lang === 'it' ? 'Apri Assistente IA LiViA (Gemini)' : 'Open LiViA AI Assistant (Gemini)'}
                id="ai-bar-open-btn"
              >
                <Sparkles size={12} />
                <span>{lang === 'it' ? 'Assistente IA' : 'AI Assistant'}</span>
              </button>

              {/* Active Model Selector */}
              <div className="flex items-center gap-1 bg-white dark:bg-[#1A1E26] border border-gray-200 dark:border-[#2C313C] rounded-lg px-2 py-0.5 shadow-2xs">
                <span className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider hidden sm:inline">
                  {lang === 'it' ? 'Modello:' : 'Model:'}
                </span>
                <select
                  value={activeAiModel}
                  onChange={(e) => handleSelectAiModel(e.target.value as any)}
                  className="bg-transparent text-[11px] font-bold text-gray-800 dark:text-zinc-200 outline-none cursor-pointer border-none"
                  title={lang === 'it' ? 'Seleziona modello Gemini' : 'Select Gemini Model'}
                  id="ai-bar-model-select"
                >
                  <option value="flash">⚡ 3.8 Flash (Free Tier)</option>
                  <option value="flash-lite">🚀 3.1 Flash-Lite (Veloce)</option>
                  <option value="pro">🧠 3.1 Pro (Avanzato)</option>
                </select>
              </div>

              {/* AI Profile Selector (if available) */}
              {aiProfiles.length > 0 && (
                <div className="flex items-center gap-1 bg-purple-50/80 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/40 rounded-lg px-2 py-0.5">
                  <span className="text-[10px] font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider hidden sm:inline">
                    Gem:
                  </span>
                  <select
                    value={activeAiProfileId || ''}
                    onChange={(e) => setActiveAiProfileId(e.target.value || null)}
                    className="bg-transparent text-[11px] font-bold text-purple-800 dark:text-purple-300 outline-none cursor-pointer border-none"
                  >
                    <option value="">{lang === 'it' ? 'Standard' : 'Standard'}</option>
                    {aiProfiles.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsSettingsModalOpen(true)}
                className="text-[11px] text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 flex items-center gap-1 cursor-pointer transition-colors"
                title={lang === 'it' ? 'Gestisci API Key e modelli nelle impostazioni' : 'Manage API Key and models in settings'}
              >
                <Settings size={12} />
                <span className="hidden sm:inline">{lang === 'it' ? 'Configura Chiave' : 'Configure Key'}</span>
              </button>
            </div>
          </div>

          <VimEditor

            content={content}
            setContent={(val) => {
              setContent(val);
              // Save state automatically to the current active file buffer in background
              setVirtualFiles(prev => prev.map(f => f.name === filename ? { ...f, content: val } : f));
              if (filename === '.lvarc') {
                reloadLvarc(val);
              }
            }}
            format={format}
            filename={filename}
            fileSessionId={fileSessionId}
            theme={theme}
            onSyncClipboard={handleSyncClipboard}
            externalClipboardText={handleReadClipboard}
            showLineNumbers={showLineNumbers}
            setShowLineNumbers={setShowLineNumbers}
            wordWrap={wordWrap}
            editorFontSize={editorFontSize}
            setEditorFontSize={setEditorFontSize}
            syntaxHighlightOn={syntaxHighlightOn}
            setSyntaxHighlightOn={setSyntaxHighlightOn}
            onSaveFileState={(rawName, fileContent) => {
              const cleanName = rawName.replace(/^["']|["']$/g, '').trim();
              const name = cleanName.split(/[\/\\]/).pop() || cleanName;
              const val = sanitizeText(fileContent);
              setVirtualFiles(prev => {
                const existing = prev.find(f => f.name.toLowerCase() === name.toLowerCase());
                if (existing) {
                  return prev.map(f => f.name.toLowerCase() === name.toLowerCase() ? { ...f, content: val } : f);
                } else {
                  const ext = name.split('.').pop()?.toLowerCase() || 'txt';
                  const formatMap: Record<string, FileFormat> = {
                    txt: 'txt', md: 'md', docx: 'docx', json: 'json', xml: 'xml', py: 'py', kt: 'kt', js: 'js', ts: 'ts', sh: 'bash', bash: 'bash', tex: 'tex', java: 'java', c: 'c', cpp: 'cpp', ly: 'ly', lilypond: 'ly', html: 'html', htm: 'html', css: 'css', sql: 'sql', rs: 'rs', go: 'go'
                  };
                  return [...prev, { name, format: formatMap[ext] || 'txt', content: val }];
                }
              });
              if (name.toLowerCase() === filename.toLowerCase()) {
                setContent(val);
              }
              if (name === '.lvarc') {
                reloadLvarc(val);
              }
              showToast(lang === 'it' ? `File "${name}" salvato nel workspace.` : `File "${name}" saved to workspace.`, 'success');
            }}
            onReadFileState={(rawName) => {
              const cleanName = rawName.replace(/^["']|["']$/g, '').trim();
              const baseName = cleanName.split(/[\/\\]/).pop() || cleanName;
              const file = virtualFiles.find(f => f.name.toLowerCase() === cleanName.toLowerCase() || f.name.toLowerCase() === baseName.toLowerCase());
              return file ? file.content : null;
            }}
            onCloseFileState={(force: boolean) => {
              const currentSaved = virtualFiles.find(f => f.name.toLowerCase() === filename.toLowerCase());
              const isModified = currentSaved ? currentSaved.content !== content : content.length > 0;
              
              if (!force && isModified) {
                return { success: false, message: lang === 'it' ? "Errore: Nessun salvataggio dall'ultima modifica (aggiungi ! per scartare)" : "Error: No write since last change (add ! to override)" };
              }
              
              if (fileHistory.length > 0) {
                const prevFile = fileHistory[fileHistory.length - 1];
                setFileHistory(prev => prev.slice(0, -1));
                
                const existing = virtualFiles.find(f => f.name.toLowerCase() === prevFile.toLowerCase());
                if (existing) {
                  setFilename(existing.name);
                  setContent(existing.content);
                  const ext = existing.name.split('.').pop()?.toLowerCase();
                  setFormat(ext === 'md' ? 'md' : ext === 'json' ? 'json' : ext === 'html' ? 'html' : 'txt');
                  setFileSessionId(prev => prev + 1);
                  return { success: true, message: lang === 'it' ? `Tornato a "${existing.name}"` : `Returned to "${existing.name}"` };
                }
              }
              
              // empty history
              setFilename('');
              setContent('');
              setFormat('txt');
              setFileSessionId(prev => prev + 1);
              return { success: true, message: lang === 'it' ? 'Editor svuotato' : 'Editor cleared', isEmptyHistory: true };
            }}
            onTearFileState={(rawTargetName) => {
              if (!rawTargetName) return { found: false, name: '' };
              const cleanTarget = rawTargetName.replace(/^["']|["']$/g, '').trim();
              const baseName = cleanTarget.split(/[\/\\]/).pop() || cleanTarget;
              
              let existing = virtualFiles.find(f => 
                f.name.toLowerCase() === cleanTarget.toLowerCase() || 
                f.name.toLowerCase() === baseName.toLowerCase()
              );
              if (!existing) {
                existing = virtualFiles.find(f => 
                  f.name.toLowerCase().split('.')[0] === baseName.toLowerCase()
                );
              }
              if (!existing) {
                existing = virtualFiles.find(f => 
                  f.name.toLowerCase().includes(baseName.toLowerCase())
                );
              }
              
              if (existing) {
                return { found: true, name: existing.name, content: existing.content };
              }
              return { found: false, name: cleanTarget };
            }}
            onOpenFileState={(rawTargetName) => {
              if (!rawTargetName) return { found: false, name: '' };
              const cleanTarget = rawTargetName.replace(/^["']|["']$/g, '').trim();
              const baseName = cleanTarget.split(/[\/\\]/).pop() || cleanTarget;
              setFileHistory(prev => [...prev, filename]);
              // Build updated list synchronously to avoid state race conditions
              const updatedVirtual = virtualFiles.map(f => 
                f.name.toLowerCase() === filename.toLowerCase() ? { ...f, content } : f
              );

              let existing = updatedVirtual.find(f => 
                f.name.toLowerCase() === cleanTarget.toLowerCase() || 
                f.name.toLowerCase() === baseName.toLowerCase()
              );

              if (!existing) {
                existing = updatedVirtual.find(f => 
                  f.name.toLowerCase().split('.')[0] === baseName.toLowerCase()
                );
              }

              if (!existing) {
                existing = updatedVirtual.find(f => 
                  f.name.toLowerCase().includes(baseName.toLowerCase())
                );
              }

              if (existing) {
                setVirtualFiles(updatedVirtual);
                setContent(sanitizeText(existing.content));
                setFilename(existing.name);
                setFormat(existing.format);
                setFileSessionId(prev => prev + 1);
                showToast(lang === 'it' ? `Aperto file "${existing.name}".` : `Opened file "${existing.name}".`, 'info');
                return { found: true, name: existing.name };
              } else {
                const ext = baseName.includes('.') ? (baseName.split('.').pop()?.toLowerCase() || 'txt') : 'txt';
                const formatMap: Record<string, FileFormat> = {
                  txt: 'txt', md: 'md', docx: 'docx', json: 'json', xml: 'xml', py: 'py', kt: 'kt', js: 'js', ts: 'ts', sh: 'bash', bash: 'bash', tex: 'tex', java: 'java', c: 'c', cpp: 'cpp', ly: 'ly', lilypond: 'ly', html: 'html', htm: 'html', css: 'css', sql: 'sql', rs: 'rs', go: 'go'
                };
                const newFormat: FileFormat = formatMap[ext] || 'txt';
                const newContent = '';
                const newFileList = [
                  ...updatedVirtual.filter(f => f.name.toLowerCase() !== baseName.toLowerCase()), 
                  { name: baseName, format: newFormat, content: newContent }
                ];
                setVirtualFiles(newFileList);
                setContent(newContent);
                setFilename(baseName);
                setFormat(newFormat);
                setFileSessionId(prev => prev + 1);
                showToast(lang === 'it' ? `Creato e aperto nuovo file vuoto "${baseName}".` : `Created and opened new empty file "${baseName}".`, 'info');
                return { found: false, name: baseName };
              }
            }}
            onShowHelp={(topic) => {
              const normTopic = (topic || '').toLowerCase().trim();

              const scrollToSection = (targetId: string) => {
                setTimeout(() => {
                  const el = document.getElementById(targetId);
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    el.classList.add('ring-2', 'ring-purple-500', 'ring-offset-2');
                    setTimeout(() => {
                      el.classList.remove('ring-2', 'ring-purple-500', 'ring-offset-2');
                    }, 2000);
                  }
                }, 150);
              };

              // 1. Color guide: :he color md, :he colour md, :he colors md
              if (normTopic.includes('color') || normTopic.includes('colour') || normTopic.includes('colore') || normTopic.includes('colori')) {
                const colFile = getHelpColorsTemplate(lang);
                setFileHistory(prev => [...prev, filename]);
                setVirtualFiles(prev => [...prev.filter(f => f.name !== 'help_colors.md'), colFile]);
                setContent(colFile.content);
                setFilename('help_colors.md');
                setFormat('md');
                setFileSessionId(prev => prev + 1);
                showToast(lang === 'it' ? 'Aperta guida "Formattazione Colori" (:he color md)!' : 'Opened "Color Formatting" guide (:he color md)!', 'info');
              } 
              // 2. Figure / Image guide: :he figure md, :he figures md
              else if (normTopic.includes('figure') || normTopic.includes('figura') || normTopic.includes('fig') || normTopic.includes('image') || normTopic.includes('immagine') || normTopic.includes('didascalia') || normTopic.includes('caption')) {
                const figFile = getHelpFiguresTemplate(lang);
                setFileHistory(prev => [...prev, filename]);
                setVirtualFiles(prev => [...prev.filter(f => f.name !== 'help_figures.md'), figFile]);
                setContent(figFile.content);
                setFilename('help_figures.md');
                setFormat('md');
                setFileSessionId(prev => prev + 1);
                showToast(lang === 'it' ? 'Aperta guida "Immagini & Figure con Didascalia" (:he figure md)!' : 'Opened "Images & Figures with Captions" guide (:he figure md)!', 'info');
              } 
              // 3. Table guide: :he table md, :he tables md
              else if (normTopic.includes('table') || normTopic.includes('tabella') || normTopic.includes('tabelle') || normTopic.includes('tab')) {
                const tabFile = getHelpTablesTemplate(lang);
                setFileHistory(prev => [...prev, filename]);
                setVirtualFiles(prev => [...prev.filter(f => f.name !== 'help_tables.md'), tabFile]);
                setContent(tabFile.content);
                setFilename('help_tables.md');
                setFormat('md');
                setFileSessionId(prev => prev + 1);
                showToast(lang === 'it' ? 'Aperta guida "Costruzione Tabelle" (:he table md)!' : 'Opened "Table Construction" guide (:he table md)!', 'info');
              } 
              // 4. AI guide: :he ai, :he gem
              else if (normTopic.includes('ai') || normTopic.includes('gem') || normTopic.includes('lat') || normTopic.includes('tr')) {
                const aiFile = getHelpAiTemplate(lang);
                setFileHistory(prev => [...prev, filename]);
                setVirtualFiles(prev => [...prev.filter(f => f.name !== 'help_ai.md'), aiFile]);
                setContent(aiFile.content);
                setFilename('help_ai.md');
                setFormat('md');
                setFileSessionId(prev => prev + 1);
                showToast(lang === 'it' ? 'Aperta guida "Gemini AI" (:he ai)!' : 'Opened "Gemini AI" guide (:he ai)!', 'info');
              }
              // 5. Gemini API Key section
              else if (normTopic.includes('gem') || normTopic.includes('key') || normTopic.includes('api') || normTopic.includes('model') || normTopic.includes('studio') || normTopic.includes('abbonament') || normTopic.includes('subscription')) {
                scrollToSection('guide-gemini-section');
                showToast(lang === 'it' ? 'Aperta guida "🔑 Chiave API Personale & Distinzione Abbonamenti"!' : 'Opened "🔑 Personal API Key & Subscriptions Distinction" guide!', 'info');
                if (normTopic.includes('setting') || normTopic.includes('impostazion')) {
                  setIsSettingsModalOpen(true);
                }
              }
              // 6. Vim Navigation & Commands
              else if (normTopic.includes('vim') || normTopic.includes('nav') || normTopic.includes('motion') || normTopic.includes('move')) {
                scrollToSection('guide-vim-section');
                showToast(lang === 'it' ? 'Aperta sezione "Navigazione & Comandi Vim"!' : 'Opened "Vim Commands & Navigation" section!', 'info');
              }
              // 6. Ex Commands & History
              else if (normTopic.includes('cmd') || normTopic.includes('ex') || normTopic.includes('replace') || normTopic.includes('history')) {
                scrollToSection('guide-cmd-section');
                showToast(lang === 'it' ? 'Aperta sezione "Comandi ex (:) & Cronologia"!' : 'Opened "Ex Commands (:) & History" section!', 'info');
              }
              // 7. Google Drive & Workspace
              else if (normTopic.includes('drive') || normTopic.includes('workspace') || normTopic.includes('gdoc') || normTopic.includes('cloud')) {
                scrollToSection('guide-workspace-section');
                showToast(lang === 'it' ? 'Aperta sezione "Integrazione Google Drive™ & Docs™"!' : 'Opened "Google Drive™ & Docs™ Integration" section!', 'info');
              }
              // 8. .lvarc Config
              else if (normTopic.includes('lvarc') || normTopic.includes('config')) {
                scrollToSection('guide-lvarc-section');
                showToast(lang === 'it' ? 'Aperta sezione "Configurazione .lvarc"!' : 'Opened ".lvarc Configuration" section!', 'info');
              }
              // 9. Official Presentation / About
              else if (normTopic.includes('about') || normTopic.includes('livia') || normTopic.includes('intro')) {
                scrollToSection('guide-about-section');
                showToast(lang === 'it' ? 'Aperta "Presentazione Ufficiale LiViA"!' : 'Opened "Official LiViA Presentation"!', 'info');
              }
              // 10. Default general help guide (:he or :help directly opens help.txt)
              else {
                const helpFile = getHelpTemplate(lang);
                setVirtualFiles(prev => [...prev.filter(f => f.name !== 'help.txt'), helpFile]);
                setContent(helpFile.content);
                setFilename('help.txt');
                setFormat('txt');
                setFileSessionId(prev => prev + 1);
                showToast(lang === 'it' ? 'Aperto file di guida "help.txt"!' : 'Opened "help.txt" guide file!', 'info');
              }
            }}
            lang={lang}
            setLang={setLang}
            onOpenGoogleDocsModal={() => setIsGoogleDocsModalOpen(true)}
            onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
            onModeChange={setActiveMode}
            isSoftKeyboardOpen={isSoftKeyboardOpen}
            onSoftKeyboardChange={setIsSoftKeyboardOpen}
            onAiCommand={handleAiCommand}
            aiProfiles={aiProfiles}
            activeAiProfileId={activeAiProfileId}
            setActiveAiProfileId={setActiveAiProfileId}
            onOpenAiProfilesModal={() => setIsAiProfilesModalOpen(true)}
          />
        </div>

        {/* Collapsible Command Guide & Typographical Test Pane */}
        {showCheatsheet && (
          <div id="livia-sidebar" className="flex flex-col shrink-0 relative lg:self-start">
            {/* Draggable Resizer Bar Handle (North-South Vertical for Height - Top Edge) */}
            <div
              onMouseDown={(e) => {
                e.preventDefault();
                setIsResizingSidebarHeight(true);
                setDragStartY(e.clientY);
                setDragStartHeight(sidebarHeight);
              }}
              onTouchStart={(e) => {
                if (e.touches[0]) {
                  setIsResizingSidebarHeight(true);
                  setDragStartY(e.touches[0].clientY);
                  setDragStartHeight(sidebarHeight);
                }
              }}
              className="h-3 hover:h-4 cursor-row-resize bg-gray-200/50 dark:bg-zinc-800/50 hover:bg-emerald-500/30 active:bg-emerald-500/50 rounded-lg transition-all select-none w-full flex items-center justify-center group shrink-0 mb-1 touch-none"
              title={lang === 'it' ? 'Trascina verticalmente (Nord-Sud) per ridimensionare l\'altezza di "Strumenti LiViA"' : 'Drag vertically (North-South) to resize height'}
            >
              <div className="h-1 w-16 bg-gray-400 dark:bg-zinc-600 group-hover:bg-emerald-500 rounded-full transition-colors" />
            </div>

            <div className="flex flex-col lg:flex-row items-stretch shrink-0 relative">
              {/* Draggable Resizer Bar Handle (East-West Horizontal for Desktop Width) */}
              <div
                onMouseDown={(e) => {
                  e.preventDefault();
                  setIsResizingSidebarWidth(true);
                  setDragStartX(e.clientX);
                  setDragStartWidth(sidebarWidth);
                }}
                onTouchStart={(e) => {
                  if (e.touches[0]) {
                    setIsResizingSidebarWidth(true);
                    setDragStartX(e.touches[0].clientX);
                    setDragStartWidth(sidebarWidth);
                  }
                }}
                className="hidden lg:flex w-3 hover:w-4 cursor-col-resize bg-gray-200/50 dark:bg-zinc-800/50 hover:bg-emerald-500/30 active:bg-emerald-500/50 rounded-lg transition-all select-none h-full items-center justify-center group shrink-0 mr-1 touch-none"
                title={lang === 'it' ? 'Trascina orizzontalmente (Est-Ovest) per ridimensionare la larghezza' : 'Drag horizontally (East-West) to resize width'}
              >
                <div className="w-1 h-12 bg-gray-400 dark:bg-zinc-600 group-hover:bg-emerald-500 rounded-full transition-colors" />
              </div>

              <aside 
                style={{ 
                  width: typeof window !== 'undefined' && window.innerWidth >= 1024 ? `${isSidebarWide ? sidebarWidth * 1.35 : sidebarWidth}px` : '100%',
                  height: `${sidebarHeight}px`
                }}
                className="w-full shrink-0 bg-white dark:bg-[#16181D] rounded-2xl border border-gray-200 dark:border-[#2D2D2D] shadow-sm p-3 sm:p-4 flex flex-col gap-3 sm:gap-4 transition-all duration-75 overflow-y-auto min-h-[140px] max-h-[42dvh] lg:max-h-none"
              >
            
            {/* Header with Tab Switcher */}
            <div className="flex flex-col gap-2 border-b border-gray-100 dark:border-[#2D2D2D] pb-3 font-sans">
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-bold text-gray-800 dark:text-zinc-100 flex items-center gap-2">
                  <Keyboard size={16} className="text-[#8AB4F8]" />
                  <span>{lang === 'it' ? 'Strumenti LiViA' : 'LiViA Tools'}</span>
                </h2>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setIsSidebarWide(!isSidebarWide)}
                    className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 cursor-pointer flex items-center gap-0.5"
                    title={lang === 'it' ? (isSidebarWide ? 'Riduci larghezza' : 'Espandi larghezza') : (isSidebarWide ? 'Reduce width' : 'Expand width')}
                    id="toggle-sidebar-width-btn"
                  >
                    <ArrowRightLeft size={11} className={isSidebarWide ? 'rotate-90 lg:rotate-0 text-[#8AB4F8]' : ''} />
                    <span className="hidden sm:inline">{isSidebarWide ? (lang === 'it' ? 'Compatto' : 'Compact') : (lang === 'it' ? 'Larga' : 'Wide')}</span>
                  </button>
                  <span className="text-gray-300 dark:text-zinc-700 text-xs">|</span>
                  <button
                    onClick={() => setShowCheatsheet(false)}
                    className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 cursor-pointer"
                    title={lang === 'it' ? 'Nascondi Barra' : 'Hide Sidebar'}
                    id="hide-cheatsheet-btn"
                  >
                    {lang === 'it' ? 'Nascondi' : 'Hide'}
                  </button>
                </div>
              </div>
              
              {/* Tab selector */}
              <div className="flex gap-1 bg-gray-100 dark:bg-[#0D0F12] p-1 rounded-lg text-xs mt-1">
                <button
                  onClick={() => setSidebarTab('files')}
                  className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-md font-medium transition-all cursor-pointer text-[10px] sm:text-xs ${
                    sidebarTab === 'files'
                      ? 'bg-white dark:bg-[#16181D] text-emerald-600 dark:text-[#8AB4F8] shadow-sm font-bold'
                      : 'text-gray-500 hover:text-gray-700 dark:hover:text-zinc-300'
                  }`}
                  id="tab-files-btn"
                >
                  <FolderOpen size={13} />
                  <span>{lang === 'it' ? 'File' : 'Files'}</span>
                </button>
                 <button
                  onClick={() => setSidebarTab('outline')}
                  className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-md font-medium transition-all cursor-pointer text-[10px] sm:text-xs ${
                    sidebarTab === 'outline'
                      ? 'bg-white dark:bg-[#16181D] text-emerald-600 dark:text-[#8AB4F8] shadow-sm font-bold'
                      : 'text-gray-500 hover:text-gray-700 dark:hover:text-zinc-300'
                  }`}
                  id="tab-outline-btn"
                >
                  <Network size={13} />
                  <span>{lang === 'it' ? 'Albero' : 'Outline'}</span>
                </button>
                <button
                  onClick={() => setSidebarTab('drive')}
                  className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-md font-medium transition-all cursor-pointer text-[10px] sm:text-xs ${
                    sidebarTab === 'drive'
                      ? 'bg-white dark:bg-[#16181D] text-emerald-600 dark:text-[#8AB4F8] shadow-sm font-bold'
                      : 'text-gray-500 hover:text-gray-700 dark:hover:text-zinc-300'
                  }`}
                  id="tab-drive-btn"
                >
                  <Cloud size={13} />
                  <span>{lang === 'it' ? 'Cloud' : 'Cloud'}</span>
                </button>
                <button
                  onClick={() => setSidebarTab('guide')}
                  className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-md font-medium transition-all cursor-pointer text-[10px] sm:text-xs ${
                    sidebarTab === 'guide'
                      ? 'bg-white dark:bg-[#16181D] text-emerald-600 dark:text-[#8AB4F8] shadow-sm font-bold'
                      : 'text-gray-500 hover:text-gray-700 dark:hover:text-zinc-300'
                  }`}
                  id="tab-guide-btn"
                >
                  <HelpCircle size={13} />
                  <span>{lang === 'it' ? 'Guida' : 'Guide'}</span>
                </button>
              </div>
            </div>

            {sidebarTab === 'files' && (
              <div className="flex flex-col gap-3 flex-1 overflow-y-auto">
                <div className="bg-[#8AB4F8]/5 border border-[#8AB4F8]/10 rounded-xl p-3">
                  <span className="text-[10px] tracking-wider font-bold text-[#8AB4F8] uppercase block">
                    {lang === 'it' ? 'Area Workspace' : 'Workspace Files'}
                  </span>
                  <p className="text-[11px] text-gray-500 dark:text-zinc-400 leading-relaxed mt-1">
                    {lang === 'it' 
                      ? 'Gestisci i file temporanei aperti nel workspace dell\'editor, crea file o importa archivi .ZIP!'
                      : 'Manage temporary files loaded in the editor workspace, create files, or import .ZIP archives!'}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      const lvarcFile = virtualFiles.find(f => f.name === '.lvarc');
                      if (lvarcFile) {
                        setFileHistory(prev => [...prev, filename]);
                        setVirtualFiles(prev => prev.map(f => f.name === filename ? { ...f, content } : f));
                        setContent(lvarcFile.content);
                        setFilename(lvarcFile.name);
                        setFormat(lvarcFile.format);
                        showToast(lang === 'it' ? 'Aperto file di configurazione .lvarc!' : 'Opened .lvarc configuration file!', 'info');
                      }
                    }}
                    className="mt-2.5 w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-950/65 text-indigo-700 dark:text-[#8AB4F8] rounded-xl text-[11px] font-bold border border-indigo-200 dark:border-indigo-900/50 transition-all cursor-pointer shadow-sm"
                  >
                    <Settings size={12} className="animate-pulse" />
                    <span>{lang === 'it' ? 'Apri / Modifica .lvarc' : 'Open / Edit .lvarc'}</span>
                  </button>
                </div>

                {/* Upload Section */}
                <div className="flex flex-col gap-2">
                  <label htmlFor="zip-upload-input" className="flex items-center justify-center gap-2 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white dark:bg-[#8AB4F8] dark:hover:bg-[#a3c7ff] dark:text-[#0D0F12] rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm">
                    <Upload size={14} />
                    <span>{lang === 'it' ? 'Importa File / ZIP' : 'Import File / ZIP'}</span>
                  </label>
                  <input 
                    type="file" 
                    id="zip-upload-input" 
                    accept=".zip,.txt,.md,.py,.kt,.js,.ts,.json,.xml,.sh"
                    className="hidden" 
                    onChange={handleZipUpload}
                  />
                </div>

                {/* Create File Input Form */}
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!newFileName.trim()) return;
                    const name = newFileName.trim();
                    if (virtualFiles.some(f => f.name === name)) {
                      showToast(lang === 'it' ? `Il file "${name}" esiste già!` : `File "${name}" already exists!`, 'error');
                      return;
                    }
                    const ext = name.split('.').pop() || 'txt';
                    const formatMap: Record<string, FileFormat> = {
                      txt: 'txt', md: 'md', json: 'json', xml: 'xml', py: 'py', kt: 'kt', js: 'js', ts: 'ts', sh: 'bash', bash: 'bash', tex: 'tex'
                    };
                    const resolvedFormat = formatMap[ext] || 'txt';
                    const newFile = {
                      name,
                      format: resolvedFormat,
                      content: `\n`
                    };
                    setFileHistory(prev => [...prev, filename]);
                    setVirtualFiles(prev => [...prev, newFile]);
                    setContent(newFile.content);
                    setFilename(newFile.name);
                    setFormat(newFile.format);
                    setNewFileName('');
                    showToast(lang === 'it' ? `File "${name}" creato con successo.` : `File "${name}" created successfully.`, 'success');
                  }}
                  className="flex gap-1.5"
                >
                  <input
                    type="text"
                    value={newFileName}
                    onChange={(e) => setNewFileName(e.target.value)}
                    placeholder="nome_file.py"
                    className="flex-1 bg-gray-50 dark:bg-[#0D0F12] border border-gray-200 dark:border-[#2D2D2D] rounded-xl px-2.5 py-1.5 text-xs font-mono text-gray-800 dark:text-[#E0E0E0] focus:outline-none focus:ring-1 focus:ring-[#8AB4F8]"
                  />
                  <button
                    type="submit"
                    className="bg-gray-100 dark:bg-[#2C313C] text-gray-700 dark:text-zinc-200 p-2 rounded-xl hover:bg-gray-200 dark:hover:bg-[#3E4451] transition-all cursor-pointer"
                    title={lang === 'it' ? 'Crea File' : 'Create File'}
                  >
                    <Plus size={14} />
                  </button>
                </form>

                {/* Search in files */}
                <div className="relative">
                  <input
                    type="text"
                    value={fileSearch}
                    onChange={(e) => setFileSearch(e.target.value)}
                    placeholder={lang === 'it' ? 'Filtra file...' : 'Filter files...'}
                    className="w-full bg-gray-50 dark:bg-[#0D0F12] border border-gray-200 dark:border-[#2D2D2D] rounded-xl pl-8 pr-2.5 py-1.5 text-xs text-gray-800 dark:text-[#E0E0E0] focus:outline-none focus:ring-1 focus:ring-[#8AB4F8]"
                  />
                  <Search size={13} className="absolute left-2.5 top-2.5 text-gray-400" />
                </div>

                {/* Virtual Files List */}
                <div className="flex-1 overflow-y-auto space-y-1 font-mono text-[11px] max-h-[220px] lg:max-h-none pr-1">
                  {virtualFiles
                    .filter(f => f.name.toLowerCase().includes(fileSearch.toLowerCase()))
                    .map((file) => {
                      const isActive = file.name === filename;
                      let FileIcon = FileText;
                      if (file.name === '.lvarc') {
                        FileIcon = Settings;
                      } else if (file.format === 'json') {
                        FileIcon = FileJson;
                      } else if (['py', 'kt', 'js', 'ts'].includes(file.format)) {
                        FileIcon = FileCode;
                      } else if (file.name.endsWith('.zip')) {
                        FileIcon = Archive;
                      }

                      return (
                        <div
                          key={file.name}
                          onClick={() => {
                            setFileHistory(prev => [...prev, filename]);
                            setVirtualFiles(prev => prev.map(f => f.name === filename ? { ...f, content } : f));
                            setContent(file.content);
                            setFilename(file.name);
                            setFormat(file.format);
                            setFileSessionId(prev => prev + 1);
                            showToast(lang === 'it' ? `Aperto: ${file.name}` : `Opened: ${file.name}`, 'info');
                          }}
                          className={`flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer border ${
                            isActive
                              ? 'bg-emerald-50 dark:bg-[#2C313C]/50 border-emerald-200 dark:border-[#8AB4F8]/30 text-emerald-800 dark:text-[#8AB4F8] font-bold'
                              : 'bg-transparent border-transparent hover:bg-gray-100 dark:hover:bg-[#2C313C]/20 text-gray-700 dark:text-zinc-400'
                          }`}
                        >
                          <span className="flex items-center gap-2 truncate mr-2">
                            <FileIcon size={14} className={isActive ? 'text-emerald-600 dark:text-[#8AB4F8]' : 'text-gray-400'} />
                            <span className="truncate">{file.name}</span>
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            {file.name !== '.lvarc' && (
                              <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setVirtualFiles(prev => prev.filter(f => f.name !== file.name));
                                showToast(lang === 'it' ? `File "${file.name}" rimosso.` : `File "${file.name}" removed.`, 'info');
                                if (filename === file.name) {
                                  const rem = virtualFiles.filter(f => f.name !== file.name);
                                  if (rem.length > 0) {
                                    setContent(rem[0].content);
                                    setFilename(rem[0].name);
                                    setFormat(rem[0].format);
                                    setFileSessionId(prev => prev + 1);
                                  }
                                }
                              }}
                              className="text-gray-400 hover:text-red-500 p-1 rounded-md hover:bg-gray-200 dark:hover:bg-[#2C313C]"
                              title={lang === 'it' ? 'Rimuovi File' : 'Remove File'}
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              const success = await copyToClipboard(file.content);
                              if (success) {
                                showToast(lang === 'it' ? `Contenuto di "${file.name}" strappato (copiato)!` : `Content of "${file.name}" torn (copied)!`, 'success');
                              } else {
                                showToast(lang === 'it' ? `Impossibile copiare il file "${file.name}".` : `Failed to copy "${file.name}".`, 'error');
                              }
                            }}
                            className="text-gray-400 hover:text-emerald-500 p-1 rounded-md hover:bg-gray-200 dark:hover:bg-[#2C313C]"
                            title={lang === 'it' ? 'Strappa/Copia Contenuto' : 'Tear/Copy Content'}
                          >
                            <Copy size={12} />
                          </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {sidebarTab === 'outline' && (
              <div className="flex flex-col gap-3 flex-1 overflow-y-auto">
                <div className="bg-[#8AB4F8]/5 border border-[#8AB4F8]/10 rounded-xl p-3">
                  <span className="text-[10px] tracking-wider font-bold text-[#8AB4F8] uppercase block">
                    {lang === 'it' ? `Albero Simboli (${format.toUpperCase()})` : `Symbol Tree (${format.toUpperCase()})`}
                  </span>
                  <p className="text-[11px] text-gray-500 dark:text-zinc-400 leading-relaxed mt-1 font-sans">
                    {lang === 'it'
                      ? 'Fai clic su un elemento strutturale per saltare direttamente alla riga corrispondente nel file.'
                      : 'Click on a structural element to jump directly to the corresponding line in the file.'}
                  </p>
                </div>
                
                {parseOutline(content, format).length === 0 ? (
                  <div className="text-center py-12 text-gray-400 dark:text-zinc-500 flex flex-col items-center justify-center gap-2 font-sans">
                    <ListCollapse size={28} className="opacity-40 text-[#8AB4F8]" />
                    <span className="text-xs font-semibold text-gray-600 dark:text-zinc-400">
                      {lang === 'it' ? 'Nessun elemento strutturato' : 'No structured elements'}
                    </span>
                    <span className="text-[10px] max-w-[200px] leading-relaxed text-gray-500 dark:text-zinc-500">
                      {lang === 'it'
                        ? 'Scrivi classi, funzioni, metodi, cicli, tag o intestazioni per vederli apparire in tempo reale.'
                        : 'Write classes, functions, methods, loops, tags, or headers to see them in real time.'}
                    </span>
                  </div>
                ) : (
                  <div className="space-y-1 font-mono text-[11px] overflow-y-auto pr-1 max-h-[400px] lg:max-h-none">
                    {parseOutline(content, format).map((el) => {
                      let colorClass = "text-gray-700 dark:text-zinc-300";
                      let badge = "EL";
                      if (el.type === 'class') {
                        colorClass = "text-sky-600 dark:text-[#61AFEF] font-semibold";
                        badge = "C";
                      } else if (el.type === 'function') {
                        colorClass = "text-purple-600 dark:text-[#C678DD]";
                        badge = "F";
                      } else if (el.type === 'method') {
                        colorClass = "text-amber-600 dark:text-[#D19A66]";
                        badge = "M";
                      } else if (el.type === 'loop') {
                        colorClass = "text-rose-600 dark:text-[#E06C75]";
                        badge = "L";
                      } else if (el.type === 'section') {
                        colorClass = "text-emerald-600 dark:text-[#98C379] font-medium";
                        badge = "S";
                      } else if (el.type === 'tag') {
                        colorClass = "text-rose-500 dark:text-[#E06C75]";
                        badge = "T";
                      } else if (el.type === 'key') {
                        colorClass = "text-teal-600 dark:text-[#56B6C2]";
                        badge = "K";
                      }

                      return (
                        <button
                          key={el.id}
                          onClick={() => handleJumpToLine(el.line)}
                          className="w-full flex items-center justify-between text-left hover:bg-gray-100 dark:hover:bg-[#2C313C]/30 p-1.5 rounded transition-all active:scale-95 cursor-pointer group"
                          style={{ paddingLeft: `${Math.max(6, el.indent * 12 + 6)}px` }}
                          id={`outline-item-${el.line}`}
                        >
                          <span className="flex items-center gap-1.5 truncate mr-2">
                            <span className="w-4 h-4 text-[9px] font-bold rounded flex items-center justify-center bg-gray-100 dark:bg-zinc-800 text-gray-400 group-hover:bg-[#8AB4F8]/10 group-hover:text-[#8AB4F8]">
                              {badge}
                            </span>
                            <span className={`${colorClass} truncate`}>{el.label}</span>
                          </span>
                          <span className="text-[9px] text-gray-400 dark:text-zinc-500 shrink-0 font-sans group-hover:text-[#8AB4F8]">
                            {lang === 'it' ? `riga ${el.line + 1}` : `line ${el.line + 1}`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {sidebarTab === 'drive' && (
              <div className="flex flex-col gap-3 flex-1 overflow-y-auto">
                <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-3">
                  <span className="text-[10px] tracking-wider font-bold text-blue-500 uppercase block flex items-center gap-1">
                    <Cloud size={11} />
                    {lang === 'it' ? 'Integrazione Google Drive™' : 'Google Drive™ Integration'}
                  </span>
                  <p className="text-[11px] text-gray-500 dark:text-zinc-400 leading-relaxed mt-1 font-sans">
                    {lang === 'it' 
                      ? 'Salva i tuoi documenti su Google Drive™ ed aprilo direttamente dall\'app con autorizzazione.'
                      : 'Save your documents to Google Drive™ and open them directly from the app with permission.'}
                  </p>

                  {!driveUser ? (
                    <button
                      onClick={handleDriveSignIn}
                      className="mt-3 w-full border border-gray-300 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-xl py-2 px-3 transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-4 h-4 shrink-0" style={{ display: 'block' }}>
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                        <path fill="none" d="M0 0h48v48H0z"></path>
                      </svg>
                      <span className="text-gray-700 dark:text-zinc-200 text-xs font-semibold">{lang === 'it' ? 'Accedi con Google' : 'Sign in with Google'}</span>
                    </button>
                  ) : (
                    <div className="mt-3 flex flex-col gap-1 text-[11px] font-sans text-gray-700 dark:text-zinc-300">
                      <div className="flex items-center justify-between">
                        <span className="font-bold truncate max-w-[100px]">{driveUser.displayName}</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setIsDriveFullScreen(!isDriveFullScreen)}
                            className="text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1 cursor-pointer text-[10px] px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800"
                            title={lang === 'it' ? 'Espandi a Schermo Intero' : 'Expand Full Screen'}
                          >
                            <Maximize2 size={11} />
                            <span>{lang === 'it' ? 'Schermo Intero' : 'Full Screen'}</span>
                          </button>
                          <button
                            onClick={handleDriveSignOut}
                            className="text-red-500 hover:text-red-600 font-bold flex items-center gap-1 cursor-pointer text-[10px]"
                            title={lang === 'it' ? 'Disconnetti' : 'Disconnect'}
                          >
                            <LogOut size={11} />
                            <span>{lang === 'it' ? 'Esci' : 'Logout'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {driveUser && (
                  <>
                    {/* Path Navigation and Folder Creation */}
                    <div className="flex flex-col gap-2.5 bg-gray-50 dark:bg-zinc-900/40 p-2.5 rounded-xl border border-gray-200/50 dark:border-zinc-800 font-sans">
                      {/* Interactive Breadcrumbs Bar */}
                      <div className="flex items-center gap-1 flex-wrap text-[10px] font-bold text-gray-500 dark:text-zinc-400 border-b border-gray-200/50 dark:border-zinc-800/60 pb-1.5 leading-normal">
                        <button
                          onClick={handleNavigateToRoot}
                          disabled={isLoadingDrive || currentDriveFolderId === 'root'}
                          className={`hover:text-blue-500 transition-colors cursor-pointer flex items-center gap-1 ${
                            currentDriveFolderId === 'root' 
                              ? 'text-gray-800 dark:text-zinc-200 font-black' 
                              : 'text-gray-400 dark:text-zinc-500'
                          }`}
                          title={lang === 'it' ? 'Vai alla radice di Google Drive™' : 'Go to Google Drive™ root'}
                        >
                          <Folder size={11} className={currentDriveFolderId === 'root' ? 'text-blue-500 fill-blue-500/10' : 'text-gray-400'} />
                          <span>{lang === 'it' ? 'Il mio Drive' : 'My Drive'}</span>
                        </button>
                        
                        {driveFolderHistory.map((folder, idx) => (
                          <React.Fragment key={`sb-hist-${folder.id}-${idx}`}>
                            <span className="text-gray-300 dark:text-zinc-700 select-none">/</span>
                            <button
                              onClick={() => handleNavigateToHistoryFolder(idx)}
                              disabled={isLoadingDrive}
                              className="hover:text-blue-500 hover:underline transition-colors cursor-pointer text-gray-500 dark:text-zinc-400 truncate max-w-[80px]"
                              title={folder.name}
                            >
                              {folder.name}
                            </button>
                          </React.Fragment>
                        ))}
                        
                        {currentDriveFolderId !== 'root' && (
                          <>
                            <span className="text-gray-300 dark:text-zinc-700 select-none">/</span>
                            <span className="text-gray-800 dark:text-zinc-200 truncate max-w-[90px] font-black" title={currentDriveFolderName}>
                              {currentDriveFolderName}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Folder Controls */}
                      <div className="flex items-center justify-between gap-2 text-[10px]">
                        <div className="flex items-center gap-1 shrink-0">
                          {driveFolderHistory.length > 0 && (
                            <button
                              onClick={handleNavigateBack}
                              disabled={isLoadingDrive}
                              className="p-1.5 rounded bg-gray-200 hover:bg-gray-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-colors cursor-pointer text-gray-700 dark:text-zinc-300 flex items-center gap-0.5 font-bold"
                              title={lang === 'it' ? 'Torna alla cartella superiore' : 'Go to parent folder'}
                            >
                              <ChevronRight size={11} className="rotate-180" />
                              <span>{lang === 'it' ? 'Su' : 'Up'}</span>
                            </button>
                          )}
                        </div>
                        
                        <form onSubmit={handleCreateFolder} className="flex items-center gap-1.5 ml-auto">
                          <input
                            type="text"
                            value={newDriveFolderName}
                            onChange={(e) => setNewDriveFolderName(e.target.value)}
                            placeholder={lang === 'it' ? 'Nuova cartella...' : 'New folder...'}
                            className="w-24 bg-white dark:bg-[#0D0F12] border border-gray-200 dark:border-[#2D2D2D] rounded-lg px-2 py-1 text-[9px] text-gray-800 dark:text-[#E0E0E0] focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <button
                            type="submit"
                            disabled={isLoadingDrive || !newDriveFolderName.trim()}
                            className="p-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg transition-colors cursor-pointer flex items-center justify-center shrink-0"
                            title={lang === 'it' ? 'Crea cartella' : 'Create folder'}
                          >
                            <Plus size={11} />
                          </button>
                        </form>
                      </div>
                    </div>

                    {/* Actions: Save current document */}
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveToDrive}
                        disabled={isLoadingDrive}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800/50 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
                      >
                        <Cloud size={14} className={isLoadingDrive ? 'animate-spin' : ''} />
                        <span>
                          {activeDriveFileId 
                            ? (lang === 'it' ? 'Aggiorna su Google Drive™' : 'Update on Google Drive™') 
                            : (lang === 'it' ? 'Salva qui' : 'Save here')}
                        </span>
                      </button>
                      <button
                        onClick={() => fetchDriveFiles(driveToken!, currentDriveFolderId)}
                        disabled={isLoadingDrive}
                        className="bg-gray-100 dark:bg-[#2C313C] text-gray-700 dark:text-zinc-200 p-2 rounded-xl hover:bg-gray-200 dark:hover:bg-[#3E4451] transition-all cursor-pointer flex items-center justify-center shrink-0"
                        title={lang === 'it' ? 'Aggiorna elenco' : 'Refresh list'}
                      >
                        <RefreshCw size={14} className={isLoadingDrive ? 'animate-spin' : ''} />
                      </button>
                    </div>

                    {/* Filter / Search Drive Files */}
                    <div className="relative font-sans">
                      <input
                        type="text"
                        value={driveSearch}
                        onChange={(e) => setDriveSearch(e.target.value)}
                        placeholder={lang === 'it' ? 'Filtra in questa cartella...' : 'Filter in this folder...'}
                        className="w-full bg-gray-50 dark:bg-[#0D0F12] border border-gray-200 dark:border-[#2D2D2D] rounded-xl pl-8 pr-2.5 py-1.5 text-xs text-gray-800 dark:text-[#E0E0E0] focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <Search size={13} className="absolute left-2.5 top-2.5 text-gray-400" />
                    </div>

                    {/* Files & Folders List */}
                    <div className="flex-1 overflow-y-auto space-y-1 font-mono text-[11px] pr-1 max-h-[220px] lg:max-h-none">
                      {isLoadingDrive && driveFiles.length === 0 ? (
                        <div className="text-center py-6 text-gray-400 animate-pulse font-sans">
                          {lang === 'it' ? 'Caricamento contenuti...' : 'Loading contents...'}
                        </div>
                      ) : driveFiles.filter(f => f.name.toLowerCase().includes(driveSearch.toLowerCase())).length === 0 ? (
                        <div className="text-center py-6 text-gray-400 font-sans">
                          {lang === 'it' ? 'Nessun file o cartella trovata.' : 'No files or folders found.'}
                        </div>
                      ) : (
                        driveFiles
                          .filter(f => f.name.toLowerCase().includes(driveSearch.toLowerCase()))
                          .map((file, idx) => {
                            const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
                            const isCurrent = file.id === activeDriveFileId;
                            return (
                              <div
                                key={`sidebar-drive-${file.id}-${idx}`}
                                onClick={() => {
                                  if (isFolder) {
                                    handleNavigateIntoFolder(file.id, file.name);
                                  } else {
                                    handleOpenDriveFile(file);
                                  }
                                }}
                                className={`flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer border ${
                                  isCurrent
                                    ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/40 text-blue-800 dark:text-[#8AB4F8] font-bold'
                                    : 'bg-transparent border-transparent hover:bg-gray-100 dark:hover:bg-[#2C313C]/20 text-gray-700 dark:text-zinc-400'
                                }`}
                              >
                                <span className="flex items-center gap-2 truncate mr-2">
                                  {isFolder ? (
                                    <Folder size={14} className="text-amber-500 fill-amber-500/15 shrink-0" />
                                  ) : (
                                    <Cloud size={14} className={`${isCurrent ? 'text-blue-500' : 'text-gray-400'} shrink-0`} />
                                  )}
                                  <span className="truncate">{file.name}</span>
                                </span>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-[9px] text-gray-400 font-sans">
                                    {isFolder ? (lang === 'it' ? 'Cartella' : 'Folder') : new Date(file.modifiedTime).toLocaleDateString()}
                                  </span>
                                  {!isFolder && (
                                    <button
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        if (!driveToken) return;
                                        setIsLoadingDrive(true);
                                        try {
                                          const fileContent = await readFromDrive(driveToken, file.id, file.mimeType);
                                          const success = await copyToClipboard(fileContent);
                                          if (success) {
                                            showToast(lang === 'it' ? `Contenuto di "${file.name}" strappato!` : `Content of "${file.name}" torn!`, 'success');
                                          } else {
                                            showToast(lang === 'it' ? `Impossibile copiare "${file.name}".` : `Failed to copy "${file.name}".`, 'error');
                                          }
                                        } catch (err) {
                                          showToast(lang === 'it' ? 'Errore di download da Drive.' : 'Error downloading from Drive.', 'error');
                                        } finally {
                                          setIsLoadingDrive(false);
                                        }
                                      }}
                                      className="text-gray-400 hover:text-blue-500 p-1 rounded-md hover:bg-gray-200 dark:hover:bg-[#2C313C]"
                                      title={lang === 'it' ? 'Strappa/Copia Contenuto' : 'Tear/Copy Content'}
                                    >
                                      <Copy size={12} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {sidebarTab === 'guide' && (
              <div className="flex flex-col gap-2 flex-1 overflow-y-auto font-sans pr-1">
                
                {/* 1. Presentazione Ufficiale LiViA */}
                <div className="group bg-white dark:bg-[#16181D] border border-emerald-200 dark:border-[#2D2D2D] rounded-xl overflow-hidden shrink-0">
                  <div 
                    onClick={() => setOpenGuideSection(openGuideSection === 'presentation' ? '' : 'presentation')}
                    className="flex items-center justify-between p-3 font-bold text-xs text-emerald-800 dark:text-emerald-400 cursor-pointer select-none bg-emerald-50/50 dark:bg-emerald-900/10 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles size={14} className="text-emerald-500" />
                      <span>{lang === 'it' ? 'Presentazione Ufficiale LiViA' : 'Official LiViA Presentation'}</span>
                    </div>
                    <ChevronUp size={14} className={`transform transition-transform ${openGuideSection === 'presentation' ? '' : 'rotate-180'}`} />
                  </div>
                  {openGuideSection === 'presentation' && (
                    <div className="p-3 space-y-2.5 text-[10.5px] border-t border-emerald-100 dark:border-[#2D2D2D]">
                      <p className="text-gray-800 dark:text-zinc-200 font-medium leading-relaxed bg-gray-50 dark:bg-[#0D0F12] p-2.5 rounded-lg border border-gray-200/60 dark:border-[#2D2D2D]">
                        {lang === 'it'
                          ? "LiViA (Light Vi Again) è un editor di testo e codice iper-leggero e modale in stile Vim. Unisce perfettamente l'editing offline con l'integrazione Google Workspace™."
                          : "LiViA (Light Vi Again) is a hyper-lightweight, modal Vim-style editor. It seamlessly bridges offline editing with Google Workspace™ integration."}
                      </p>
                      <ul className="space-y-1.5 text-gray-700 dark:text-zinc-300 leading-snug list-disc pl-4">
                        <li><strong>Vim Engine:</strong> {lang === 'it' ? 'Modalità Normal, Insert e Visual native.' : 'Native Normal, Insert, and Visual modes.'}</li>
                        <li><strong>Offline-First:</strong> {lang === 'it' ? 'Nessun database richiesto. File salvati nel browser.' : 'No database required. Files saved in browser.'}</li>
                        <li><strong>Workspace SDK:</strong> {lang === 'it' ? 'Apertura diretta da Drive™ e Docs™.' : 'Direct open from Drive™ and Docs™.'}</li>
                      </ul>
                    </div>
                  )}
                </div>

                {/* 2. Scorciatoie Vim */}
                <div className="group bg-white dark:bg-[#16181D] border border-gray-200 dark:border-[#2D2D2D] rounded-xl overflow-hidden shrink-0">
                  <div 
                    onClick={() => setOpenGuideSection(openGuideSection === 'vim' ? '' : 'vim')}
                    className="flex items-center justify-between p-3 font-bold text-xs text-gray-800 dark:text-gray-200 cursor-pointer select-none bg-gray-50/50 dark:bg-[#16181D]/50 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Terminal size={14} className="text-gray-500" />
                      <span>{lang === 'it' ? 'Comandi Vim Principali' : 'Main Vim Commands'}</span>
                    </div>
                    <ChevronUp size={14} className={`transform transition-transform ${openGuideSection === 'vim' ? '' : 'rotate-180'}`} />
                  </div>
                  {openGuideSection === 'vim' && (
                    <div className="p-3 space-y-2.5 text-[10.5px] border-t border-gray-100 dark:border-[#2D2D2D] text-gray-700 dark:text-zinc-300">
                      <ul className="space-y-1 list-disc pl-4">
                        <li><code>i</code> {lang === 'it' ? 'Modalità Inserimento' : 'Insert Mode'}</li>
                        <li><code>Esc</code> {lang === 'it' ? 'Modalità Comando (Normale)' : 'Command Mode (Normal)'}</li>
                        <li><code>v</code> {lang === 'it' ? 'Modalità Visuale' : 'Visual Mode'}</li>
                        <li><code>:w</code> {lang === 'it' ? 'Salva (Virtuale)' : 'Save (Virtual)'}</li>
                        <li><code>:q</code> {lang === 'it' ? 'Chiudi file corrente' : 'Close current file'}</li>
                        <li><code>:he</code> {lang === 'it' ? 'Apri Manuale Completo' : 'Open Full Manual'}</li>
                      </ul>
                    </div>
                  )}
                </div>
                
                {/* 3. Gemini Gems & API */}
                <div className="group bg-white dark:bg-[#16181D] border border-blue-200 dark:border-[#2D2D2D] rounded-xl overflow-hidden shrink-0">
                  <div 
                    onClick={() => setOpenGuideSection(openGuideSection === 'ai' ? '' : 'ai')}
                    className="flex items-center justify-between p-3 font-bold text-xs text-blue-800 dark:text-blue-400 cursor-pointer select-none bg-blue-50/50 dark:bg-blue-900/10 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles size={14} className="text-blue-500" />
                      <span>{lang === 'it' ? 'Gemini AI & Profili' : 'Gemini AI & Profiles'}</span>
                    </div>
                    <ChevronUp size={14} className={`transform transition-transform ${openGuideSection === 'ai' ? '' : 'rotate-180'}`} />
                  </div>
                  {openGuideSection === 'ai' && (
                    <div className="p-3 space-y-2 text-[10.5px] border-t border-blue-100 dark:border-[#2D2D2D] text-gray-700 dark:text-zinc-300">
                      <p>
                        <strong>{lang === 'it' ? 'Gemini Gems (Profili AI):' : 'Gemini Gems (AI Profiles):'}</strong><br />
                        {lang === 'it'
                          ? 'Configura istruzioni di sistema (System Prompts) dalle Impostazioni per alterare il comportamento dell\'IA. Quando attivi un profilo dalla tendina in alto, questo funge da direttiva prioritaria.'
                          : 'Configure system instructions from Settings to alter AI behavior. When a profile is active from the top dropdown, it acts as the primary directive.'}
                      </p>
                      <p className="mt-2">
                        <strong>{lang === 'it' ? 'Comandi AI Rapidi:' : 'Quick AI Commands:'}</strong>
                      </p>
                      <ul className="space-y-1 list-disc pl-4">
                        <li><code>:ai &lt;prompt&gt;</code> {lang === 'it' ? 'Applica istruzione al testo' : 'Apply instruction to text'}</li>
                        <li><code>:tr &lt;lang&gt;</code> {lang === 'it' ? 'Traduci (es. :tr it)' : 'Translate (e.g. :tr it)'}</li>
                        <li><code>:lat &lt;tema&gt;</code> {lang === 'it' ? 'Testo segnaposto (es. standard)' : 'Placeholder (e.g. standard)'}</li>
                      </ul>
                      <p className="mt-2">
                        <strong>{lang === 'it' ? 'Chiavi API & Volumi:' : 'API Keys & Workloads:'}</strong><br />
                        {lang === 'it' 
                          ? 'Usa la tua API Key gratuita (Google AI Studio) nelle Impostazioni. Gli abbonamenti consumer (es. Google One AI Premium) NON includono API per sviluppatori.' 
                          : 'Use your free API Key (Google AI Studio) in Settings. Consumer subscriptions (e.g. Google One AI Premium) DO NOT include developer APIs.'}
                      </p>
                    </div>
                  )}
                </div>

                {/* 4. Formattazione Avanzata */}
                <div className="group bg-white dark:bg-[#16181D] border border-purple-200 dark:border-[#2D2D2D] rounded-xl overflow-hidden shrink-0">
                  <div 
                    onClick={() => setOpenGuideSection(openGuideSection === 'format' ? '' : 'format')}
                    className="flex items-center justify-between p-3 font-bold text-xs text-purple-800 dark:text-purple-400 cursor-pointer select-none bg-purple-50/50 dark:bg-purple-900/10 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <BookOpen size={14} className="text-purple-500" />
                      <span>{lang === 'it' ? 'Guide Formattazione & Immagini' : 'Formatting & Images Guides'}</span>
                    </div>
                    <ChevronUp size={14} className={`transform transition-transform ${openGuideSection === 'format' ? '' : 'rotate-180'}`} />
                  </div>
                  {openGuideSection === 'format' && (
                    <div className="p-3 space-y-2.5 border-t border-purple-100 dark:border-[#2D2D2D]">
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          onClick={() => {
                            let f = virtualFiles.find(x => x.name === 'help_colors.md');
                            if (!f) f = HELP_COLORS_TEMPLATE;
                            setVirtualFiles(prev => [...prev.filter(x => x.name !== 'help_colors.md'), f!]);
                            setFileHistory(prev => [...prev, filename]);
                            setContent(f.content);
                            setFilename('help_colors.md');
                            setFormat('md');
                          }}
                          className="p-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded text-[10px] font-bold text-center border border-purple-200 dark:border-purple-800/50 cursor-pointer"
                        >
                          🎨 {lang === 'it' ? 'Colori' : 'Colors'}
                        </button>
                        <button
                          onClick={() => {
                            let f = virtualFiles.find(x => x.name === 'help_figures.md');
                            if (!f) f = HELP_FIGURES_TEMPLATE;
                            setVirtualFiles(prev => [...prev.filter(x => x.name !== 'help_figures.md'), f!]);
                            setFileHistory(prev => [...prev, filename]);
                            setContent(f.content);
                            setFilename('help_figures.md');
                            setFormat('md');
                          }}
                          className="p-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded text-[10px] font-bold text-center border border-purple-200 dark:border-purple-800/50 cursor-pointer"
                        >
                          🖼️ {lang === 'it' ? 'Immagini' : 'Images'}
                        </button>
                        <button
                          onClick={() => {
                            let f = virtualFiles.find(x => x.name === 'help_tables.md');
                            if (!f) f = HELP_TABLES_TEMPLATE;
                            setVirtualFiles(prev => [...prev.filter(x => x.name !== 'help_tables.md'), f!]);
                            setFileHistory(prev => [...prev, filename]);
                            setContent(f.content);
                            setFilename('help_tables.md');
                            setFormat('md');
                          }}
                          className="p-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded text-[10px] font-bold text-center border border-purple-200 dark:border-purple-800/50 cursor-pointer"
                        >
                          📊 {lang === 'it' ? 'Tabelle' : 'Tables'}
                        </button>
                        <button
                          onClick={() => {
                            let f = virtualFiles.find(x => x.name === 'help_ai.md');
                            if (!f) f = getHelpAiTemplate(lang);
                            setVirtualFiles(prev => [...prev.filter(x => x.name !== 'help_ai.md'), f!]);
                            setFileHistory(prev => [...prev, filename]);
                            setContent(f.content);
                            setFilename('help_ai.md');
                            setFormat('md');
                          }}
                          className="p-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded text-[10px] font-bold text-center border border-purple-200 dark:border-purple-800/50 cursor-pointer"
                        >
                          🤖 {lang === 'it' ? 'AI Gems' : 'AI Gems'}
                        </button>
                      </div>
                      
                      <p className="text-[10px] text-gray-700 dark:text-zinc-300 mt-2">
                        <strong>{lang === 'it' ? 'Perché niente import automatico Drive/Firebase per le immagini?' : 'Why no automatic Drive/Firebase import for images?'}</strong><br/>
                        {lang === 'it' 
                          ? 'LiViA è un editor offline testuale in RAM (VFS). I file Markdown (.md) non contengono binari. Per motivi di sicurezza (CORS), il browser impedisce all\'app di estrarre immagini Cloud senza esplicito permesso. Puoi usare URL pubblici, Base64 (salvato nel file) o URL Blob temporanei (perfetti per esportazione rapida PDF).'
                          : 'LiViA is an offline text-based in-RAM editor (VFS). Markdown (.md) files cannot hold binaries. For security reasons (CORS), the browser prevents the app from pulling Cloud images without explicit permission. You can use public URLs, Base64 (saved in file), or temporary Blob URLs (perfect for rapid PDF export).'}
                      </p>
                    </div>
                  )}
                </div>

                {/* 5. Moolenaar */}
                <div className="group bg-white dark:bg-[#16181D] border border-amber-200 dark:border-[#2D2D2D] rounded-xl overflow-hidden shrink-0">
                  <div 
                    onClick={() => setOpenGuideSection(openGuideSection === 'memory' ? '' : 'memory')}
                    className="flex items-center justify-between p-3 font-bold text-xs text-amber-800 dark:text-amber-400 cursor-pointer select-none bg-amber-50/50 dark:bg-amber-900/10 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles size={14} className="text-amber-500" />
                      <span>{lang === 'it' ? 'In Memoria & Copyright' : 'In Memory & Copyright'}</span>
                    </div>
                    <ChevronUp size={14} className={`transform transition-transform ${openGuideSection === 'memory' ? '' : 'rotate-180'}`} />
                  </div>
                  {openGuideSection === 'memory' && (
                    <div className="p-3 space-y-2 text-[10.5px] border-t border-amber-100 dark:border-[#2D2D2D] text-gray-700 dark:text-zinc-300">
                      <p>
                        {lang === 'it'
                          ? "In memoria di Bram Moolenaar (1961 - 2023), l'altruista creatore di Vim. LiViA è un piccolo omaggio alla sua filosofia e invita a sostenere i bambini in Uganda (ICCF Holland)."
                          : "In memory of Bram Moolenaar (1961 - 2023), the altruistic creator of Vim. LiViA is a small tribute to his philosophy, encouraging users to support orphans in Uganda (ICCF Holland)."}
                      </p>
                      <div className="pt-2 border-t border-gray-100 dark:border-[#2D2D2D]">
                        <strong>Author:</strong> Ing. Mario Fantini<br/>
                        {lang === 'it' ? 'Tutti i diritti riservati.' : 'All rights reserved.'}
                      </div>
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* Prompt Mode Information footnote */}
            <div className="mt-auto pt-3 border-t border-gray-100 dark:border-[#2D2D2D] text-[10px] text-gray-400 dark:text-zinc-500 text-center leading-relaxed font-sans">
              {lang === 'it' 
                ? 'Progettato per l\'integrazione con Gboard di Android e Clipboard nativa Linux Debian.' 
                : 'Designed for Android Gboard and native Linux Debian clipboard integration.'}
            </div>

          </aside>
            </div>
          </div>
        )}

      </main>

      {/* Auxiliary Key Bar - Rendered conditionally with North-South Resizer Handle */}
      {showAuxiliaryKeyboard && (
        <div 
          style={{ height: `${keyboardHeight}px` }}
          className="relative shrink-0 border-t border-gray-200 dark:border-[#2D2D2D] bg-gray-100 dark:bg-[#16181D] flex flex-col min-h-[80px] max-h-[32dvh] lg:max-h-[450px] transition-all duration-75"
        >
          {/* North-South Vertical Drag Resizer Handle */}
          <div
            onMouseDown={(e) => {
              e.preventDefault();
              setIsResizingKeyboardHeight(true);
              setDragStartY(e.clientY);
              setDragStartHeight(keyboardHeight);
            }}
            onTouchStart={(e) => {
              if (e.touches[0]) {
                setIsResizingKeyboardHeight(true);
                setDragStartY(e.touches[0].clientY);
                setDragStartHeight(keyboardHeight);
              }
            }}
            className="h-2.5 hover:h-3.5 cursor-row-resize bg-gray-200 dark:bg-[#2D2D2D] hover:bg-blue-500/40 active:bg-blue-500/60 transition-all select-none w-full flex items-center justify-center group shrink-0 touch-none"
            title={lang === 'it' ? 'Trascina verticalmente (Nord-Sud) per ridimensionare le scorciatoie' : 'Drag vertically (North-South) to resize shortcuts'}
          >
            <div className="h-1 w-12 bg-gray-400 dark:bg-zinc-600 group-hover:bg-blue-500 rounded-full transition-colors" />
          </div>

          <div className="flex-1 overflow-y-auto">
            <AuxiliaryKeyboard
              mode={activeMode}
              onKeyPress={handleSimulateKey}
              onYankCurrent={() => handleSimulateKey('y')}
              onPasteCurrent={() => handleSimulateKey('p')}
              onCopyAll={handleCopyAll}
              format={format}
              lang={lang}
              onInsertSnippet={handleInsertSnippet}
              isSoftKeyboardOpen={isSoftKeyboardOpen}
              onToggleSoftKeyboard={handleToggleSoftKeyboard}
              onOpenAiAssistant={handleOpenAiAssistant}
            />
          </div>
        </div>
      )}

      {/* Google Drive Full-Screen Modal Overlay */}
      {isDriveFullScreen && (
        <div className="fixed inset-0 z-50 bg-white/95 dark:bg-[#0D0F12]/95 backdrop-blur-md p-6 flex flex-col font-sans">
          <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-[#2D2D2D] mb-4">
            <div className="flex items-center gap-2">
              {drivePickerFilter === 'docs' ? <FileText size={20} className="text-blue-600" /> : <Cloud size={20} className="text-blue-500" />}
              <h2 className="text-base font-bold text-gray-800 dark:text-zinc-100">
                {drivePickerFilter === 'docs' 
                  ? (lang === 'it' ? 'Esplora Google Docs™' : 'Explore Google Docs™')
                  : (lang === 'it' ? 'Esplora Google Drive™' : 'Explore Google Drive™')}
              </h2>
            </div>
            <button
              onClick={() => setIsDriveFullScreen(false)}
              className="px-3 py-1.5 bg-gray-100 dark:bg-[#2C313C] hover:bg-gray-200 dark:hover:bg-[#3E4451] text-gray-700 dark:text-zinc-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Minimize2 size={14} />
              <span>{lang === 'it' ? 'Riduci Finestra' : 'Minimize Window'}</span>
            </button>
          </div>

          {!driveUser ? (
            <div className="flex-1 flex flex-col items-center justify-center">
              <Cloud size={48} className="text-blue-500 mb-4 opacity-50" />
              <h3 className="text-lg font-bold text-gray-800 dark:text-zinc-100 mb-2">
                {lang === 'it' ? 'Autenticazione Richiesta' : 'Authentication Required'}
              </h3>
              <p className="text-sm text-gray-500 dark:text-zinc-400 text-center max-w-md mb-6">
                {lang === 'it'
                  ? 'Devi accedere con il tuo account Google per esplorare e importare file da Google Drive o Google Docs.'
                  : 'You must sign in with your Google account to browse and import files from Google Drive or Google Docs.'}
              </p>
              <button
                onClick={handleDriveSignIn}
                className="border border-gray-300 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-xl py-3 px-6 transition-all cursor-pointer flex items-center justify-center gap-3"
              >
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5 shrink-0" style={{ display: 'block' }}>
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  <path fill="none" d="M0 0h48v48H0z"></path>
                </svg>
                <span className="text-gray-700 dark:text-zinc-200 font-bold">{lang === 'it' ? 'Accedi con Google' : 'Sign in with Google'}</span>
              </button>
            </div>
          ) : (
            <>
          {/* Search bar & Refresh */}
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1">
              <input
                type="text"
                value={driveSearch}
                onChange={(e) => setDriveSearch(e.target.value)}
                placeholder={lang === 'it' ? 'Cerca file e cartelle in Google Drive™...' : 'Search files and folders in Google Drive™...'}
                className="w-full bg-gray-50 dark:bg-[#16181D] border border-gray-200 dark:border-[#2D2D2D] rounded-xl pl-9 pr-3 py-2 text-sm text-gray-800 dark:text-[#E0E0E0] focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Search size={16} className="absolute left-3 top-3 text-gray-400" />
            </div>
            <button
              onClick={() => fetchDriveFiles(driveToken!, currentDriveFolderId)}
              disabled={isLoadingDrive}
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2"
            >
              <RefreshCw size={14} className={isLoadingDrive ? 'animate-spin' : ''} />
              <span>{lang === 'it' ? 'Aggiorna' : 'Refresh'}</span>
            </button>
          </div>

          {/* Folder breadcrumbs */}
          <div className="flex items-center gap-1.5 flex-wrap text-xs font-bold text-gray-600 dark:text-zinc-400 bg-gray-100 dark:bg-[#16181D] p-3 rounded-xl mb-4">
            <button
              onClick={handleNavigateToRoot}
              disabled={isLoadingDrive || currentDriveFolderId === 'root'}
              className={`hover:text-blue-500 transition-colors cursor-pointer flex items-center gap-1 ${
                currentDriveFolderId === 'root' 
                  ? 'text-gray-800 dark:text-zinc-200 font-black' 
                  : 'text-gray-400 dark:text-zinc-500'
              }`}
              title={lang === 'it' ? 'Vai alla radice di Google Drive™' : 'Go to Google Drive™ root'}
            >
              <Folder size={14} className={currentDriveFolderId === 'root' ? 'text-blue-500 fill-blue-500/10' : 'text-gray-400'} />
              <span>{lang === 'it' ? 'Il mio Drive' : 'My Drive'}</span>
            </button>
            {driveFolderHistory.map((folder, idx) => (
              <React.Fragment key={`modal-hist-${folder.id}-${idx}`}>
                <span className="text-gray-300 dark:text-zinc-700 select-none">/</span>
                <button
                  onClick={() => handleNavigateToHistoryFolder(idx)}
                  disabled={isLoadingDrive}
                  className="hover:text-blue-500 hover:underline cursor-pointer text-gray-500 dark:text-zinc-400"
                  title={folder.name}
                >
                  {folder.name}
                </button>
              </React.Fragment>
            ))}
            {currentDriveFolderId !== 'root' && (
              <>
                <span className="text-gray-300 dark:text-zinc-700 select-none">/</span>
                <span className="text-gray-800 dark:text-zinc-200 font-black" title={currentDriveFolderName}>
                  {currentDriveFolderName}
                </span>
              </>
            )}
          </div>

          {/* Grid view of Files & Folders */}
          <div className="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {driveFiles
              .filter(f => f.name.toLowerCase().includes(driveSearch.toLowerCase()))
              .filter(f => drivePickerFilter === 'all' || f.mimeType === 'application/vnd.google-apps.folder' || f.mimeType === 'application/vnd.google-apps.document')
              .map((file, idx) => {
                const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
                const isCurrent = file.id === activeDriveFileId;
                return (
                  <div
                    key={`modal-drive-${file.id}-${idx}`}
                    onClick={() => {
                      if (isFolder) {
                        handleNavigateIntoFolder(file.id, file.name);
                      } else {
                        setPendingFileAction({ source: 'drive', name: file.name, driveFile: file });
                        setIsDriveFullScreen(false);
                      }
                    }}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isCurrent
                        ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700 text-blue-900 dark:text-[#8AB4F8]'
                        : 'bg-white dark:bg-[#16181D] border-gray-200 dark:border-[#2D2D2D] hover:border-blue-400 dark:hover:border-blue-600'
                    }`}
                  >
                    <div className="flex items-start justify-between w-full">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        {isFolder ? (
                          <Folder size={24} className="text-amber-500 fill-amber-500/20 shrink-0 mt-0.5" />
                        ) : (
                          <Cloud size={24} className="text-blue-500 shrink-0 mt-0.5" />
                        )}
                        <div className="min-w-0 flex-1">
                          <span className="font-bold text-xs truncate block text-gray-800 dark:text-zinc-200">
                            {file.name}
                          </span>
                          <span className="text-[10px] text-gray-400 dark:text-zinc-500 block mt-1 font-mono">
                            {isFolder ? (lang === 'it' ? 'Cartella' : 'Folder') : new Date(file.modifiedTime).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      {!isFolder && (
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (!driveToken) return;
                            setIsLoadingDrive(true);
                            try {
                              const fileContent = await readFromDrive(driveToken, file.id, file.mimeType);
                              const success = await copyToClipboard(fileContent);
                              if (success) {
                                showToast(lang === 'it' ? `Contenuto di "${file.name}" strappato!` : `Content of "${file.name}" torn!`, 'success');
                              } else {
                                showToast(lang === 'it' ? `Impossibile copiare "${file.name}".` : `Failed to copy "${file.name}".`, 'error');
                              }
                            } catch (err) {
                              showToast(lang === 'it' ? 'Errore di download da Drive.' : 'Error downloading from Drive.', 'error');
                            } finally {
                              setIsLoadingDrive(false);
                            }
                          }}
                          className="text-gray-400 hover:text-blue-500 p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-[#2C313C] shrink-0 ml-2"
                          title={lang === 'it' ? 'Strappa/Copia Contenuto' : 'Tear/Copy Content'}
                        >
                          <Copy size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
          </>
          )}
        </div>
      )}

      {/* Pending Action Modal (Import / Tear) */}
      {pendingFileAction && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-sans">
          <div className="bg-white dark:bg-[#16181D] w-full max-w-sm rounded-2xl shadow-2xl border border-gray-200 dark:border-[#2D2D2D] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-100 dark:border-[#2D2D2D] flex items-center justify-between bg-gray-50/50 dark:bg-[#0D0F12]/50">
              <h3 className="font-bold text-gray-800 dark:text-zinc-100 flex items-center gap-2">
                <Sparkles size={16} className="text-blue-500" />
                {lang === 'it' ? 'Azione Richiesta' : 'Action Required'}
              </h3>
              <button 
                onClick={() => setPendingFileAction(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-5 flex flex-col gap-4">
              <p className="text-sm text-gray-600 dark:text-zinc-400 text-center">
                {lang === 'it' ? `Cosa vuoi fare con il file "${pendingFileAction.name}"?` : `What do you want to do with "${pendingFileAction.name}"?`}
              </p>
              
              <div className="flex flex-col gap-2.5">
                <button
                  onClick={async () => {
                    const action = pendingFileAction;
                    setPendingFileAction(null);
                    if (action.source === 'local' && action.localContent) {
                      handleLoadContent(action.localContent, action.name, action.localFormat);
                    } else if (action.source === 'drive' && action.driveFile) {
                      handleOpenDriveFile(action.driveFile);
                    }
                  }}
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2"
                >
                  <FileText size={16} />
                  {lang === 'it' ? 'Apri nell\'Editor' : 'Open in Editor'}
                </button>
                
                <button
                  onClick={async () => {
                    const action = pendingFileAction;
                    setPendingFileAction(null);
                    
                    if (action.source === 'local' && action.localContent !== undefined) {
                      const success = await copyToClipboard(action.localContent);
                      if (success) showToast(lang === 'it' ? `Contenuto di "${action.name}" strappato!` : `Content of "${action.name}" torn!`, 'success');
                      else showToast(lang === 'it' ? 'Errore durante la copia.' : 'Error copying.', 'error');
                    } else if (action.source === 'drive' && action.driveFile) {
                      if (!driveToken) return;
                      setIsLoadingDrive(true);
                      try {
                        const fileContent = await readFromDrive(driveToken, action.driveFile.id, action.driveFile.mimeType);
                        const success = await copyToClipboard(fileContent);
                        if (success) showToast(lang === 'it' ? `Contenuto di "${action.name}" strappato!` : `Content of "${action.name}" torn!`, 'success');
                        else showToast(lang === 'it' ? 'Errore durante la copia.' : 'Error copying.', 'error');
                      } catch (err) {
                        showToast(lang === 'it' ? 'Errore di download da Drive.' : 'Error downloading from Drive.', 'error');
                      } finally {
                        setIsLoadingDrive(false);
                      }
                    }
                  }}
                  className="w-full py-3 px-4 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                >
                  <Copy size={16} />
                  {lang === 'it' ? 'Strappa (Copia negli appunti)' : 'Tear (Copy to clipboard)'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Google Docs Modal */}
      <GoogleDocsModal
        isOpen={isGoogleDocsModalOpen}
        onClose={() => setIsGoogleDocsModalOpen(false)}
        content={content}
        setContent={setContent}
        filename={filename}
        lang={lang}
      />

      {/* Google Drive API Application Icons Modal */}
      <GoogleDriveIconsModal
        isOpen={isDriveIconsModalOpen}
        onClose={() => setIsDriveIconsModalOpen(false)}
        lang={lang}
      />

      {/* Privacy Policy Modal */}
      <PrivacyModal
        isOpen={isPrivacyModalOpen}
        onClose={() => setIsPrivacyModalOpen(false)}
        lang={lang}
        onOpenSupportModal={() => setIsSupportModalOpen(true)}
        onOpenTermsModal={() => setIsTermsModalOpen(true)}
      />

      {/* Support & Help Center Modal */}
      <SupportModal
        isOpen={isSupportModalOpen}
        onClose={() => setIsSupportModalOpen(false)}
        lang={lang}
        onOpenPrivacyModal={() => setIsPrivacyModalOpen(true)}
        onOpenTermsModal={() => setIsTermsModalOpen(true)}
        onOpenHelp={() => {
          setShowCheatsheet(true);
          setSidebarTab('guide');
        }}
      />

      {/* Terms of Service Modal */}
      <TermsModal
        isOpen={isTermsModalOpen}
        onClose={() => setIsTermsModalOpen(false)}
        lang={lang}
        onOpenPrivacyModal={() => setIsPrivacyModalOpen(true)}
        onOpenSupportModal={() => setIsSupportModalOpen(true)}
      />

      {/* Info 'i' Modal */}
      <InfoModal
        isOpen={isInfoModalOpen}
        onClose={() => setIsInfoModalOpen(false)}
        lang={lang}
        setLang={setLang}
        onOpenPrivacyModal={() => setIsPrivacyModalOpen(true)}
        onOpenSupportModal={() => setIsSupportModalOpen(true)}
        onOpenTermsModal={() => setIsTermsModalOpen(true)}
        onOpenDriveIconsModal={() => setIsDriveIconsModalOpen(true)}
        onOpenHelp={() => {
          setShowCheatsheet(true);
          setSidebarTab('guide');
        }}
      />

      {/* Settings & Gemini Key Modal */}
              <SettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          lang={lang}
          setLang={setLang}
          showLineNumbers={showLineNumbers}
          setShowLineNumbers={setShowLineNumbers}
          syntaxHighlightOn={syntaxHighlightOn}
            setSyntaxHighlightOn={setSyntaxHighlightOn}
          editorFontSize={editorFontSize}
          setEditorFontSize={setEditorFontSize}
                    onOpenAiProfilesModal={() => setIsAiProfilesModalOpen(true)}
          showToast={showToast}
        />
        <AiProfilesModal
          isOpen={isAiProfilesModalOpen}
          onClose={() => setIsAiProfilesModalOpen(false)}
          lang={lang}
          profiles={aiProfiles}
          setProfiles={setAiProfiles}
          showToast={showToast}
        />

    </div>
  );
}
