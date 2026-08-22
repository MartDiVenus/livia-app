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
import { AuxiliaryKeyboard } from './components/AuxiliaryKeyboard';
import { exportToPDF } from './utils/pdfExport';
import { convertToLaTeX } from './utils/latexExport';
import { VimMode, FileFormat, TEMPLATES, getTemplates, getLvarcTemplate, getHelpTemplate, getHelpColorsTemplate, getHelpFiguresTemplate, getHelpTablesTemplate, HELP_TEMPLATE, HELP_COLORS_TEMPLATE, HELP_FIGURES_TEMPLATE, HELP_TABLES_TEMPLATE, HELP_FIGURES_TABLES_TEMPLATE, FileData, sanitizeText } from './types';
import { parseOutline, OutlineElement } from './utils/outlineParser';
import { parseKeyFromVimCommand } from './utils/vimEngine';
import JSZip from 'jszip';
import { 
  Keyboard, 
  Sparkles, 
  HelpCircle, 
  BookOpen,
  Copy, 
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
} from 'lucide-react';
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
  const [virtualFiles, setVirtualFiles] = useState<FileData[]>(() => {
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

  // Application State
  const [content, setContent] = useState<string>(() => {
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
    if (filename === '.lvarc') setContent(lvarcFile.content);
    if (filename === 'example.txt') {
      const oldTxtIt = getTemplates('it')['txt'].content;
      const oldTxtEn = getTemplates('en')['txt'].content;
      if (content === oldTxtIt || content === oldTxtEn) {
        setContent(txtFile.content);
      }
    }
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
    setVirtualFiles(prev => {
      const existing = prev.find(f => f.name === newName);
      if (existing) {
        return prev.map(f => f.name === newName ? { ...f, content: newContent } : f);
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
      />

      {/* Main Workspace Frame */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-1 sm:p-4 flex flex-col lg:flex-row gap-2 sm:gap-4 overflow-hidden min-h-0 min-w-0">
        
        {/* Vim Editor Canvas Container */}
        <div className="flex-1 flex flex-col bg-white dark:bg-[#0D0F12] rounded-2xl border border-gray-200 dark:border-[#2D2D2D] shadow-sm overflow-hidden transition-all min-h-0 min-w-0">
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
            wordWrap={wordWrap}
            editorFontSize={editorFontSize}
            setEditorFontSize={setEditorFontSize}
            syntaxHighlightOn={syntaxHighlightOn}
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
            onOpenFileState={(rawTargetName) => {
              if (!rawTargetName) return { found: false, name: '' };
              const cleanTarget = rawTargetName.replace(/^["']|["']$/g, '').trim();
              const baseName = cleanTarget.split(/[\/\\]/).pop() || cleanTarget;
              
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
                showToast(lang === 'it' ? `Creato e aperto nuovo file vuoto "${baseName}".` : `Created and opened new empty file "${baseName}".`, 'info');
                return { found: false, name: baseName };
              }
            }}
            onShowHelp={(topic) => {
              setShowCheatsheet(true);
              setSidebarTab('guide');
              
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
                setVirtualFiles(prev => [...prev.filter(f => f.name !== 'help_colors.md'), colFile]);
                setContent(colFile.content);
                setFilename('help_colors.md');
                setFormat('md');
                showToast(lang === 'it' ? 'Aperta guida "Formattazione Colori" (:he color md)!' : 'Opened "Color Formatting" guide (:he color md)!', 'info');
              } 
              // 2. Figure / Image guide: :he figure md, :he figures md
              else if (normTopic.includes('figure') || normTopic.includes('figura') || normTopic.includes('fig') || normTopic.includes('image') || normTopic.includes('immagine') || normTopic.includes('didascalia') || normTopic.includes('caption')) {
                const figFile = getHelpFiguresTemplate(lang);
                setVirtualFiles(prev => [...prev.filter(f => f.name !== 'help_figures.md'), figFile]);
                setContent(figFile.content);
                setFilename('help_figures.md');
                setFormat('md');
                showToast(lang === 'it' ? 'Aperta guida "Immagini & Figure con Didascalia" (:he figure md)!' : 'Opened "Images & Figures with Captions" guide (:he figure md)!', 'info');
              } 
              // 3. Table guide: :he table md, :he tables md
              else if (normTopic.includes('table') || normTopic.includes('tabella') || normTopic.includes('tabelle')) {
                const tabFile = getHelpTablesTemplate(lang);
                setVirtualFiles(prev => [...prev.filter(f => f.name !== 'help_tables.md'), tabFile]);
                setContent(tabFile.content);
                setFilename('help_tables.md');
                setFormat('md');
                showToast(lang === 'it' ? 'Aperta guida "Costruzione Tabelle" (:he table md)!' : 'Opened "Table Construction" guide (:he table md)!', 'info');
              } 
              // 4. Gemini AI & API Key section
              else if (normTopic.includes('gem') || normTopic.includes('key') || normTopic.includes('api') || normTopic.includes('model') || normTopic.includes('studio') || normTopic.includes('abbonament') || normTopic.includes('subscription')) {
                scrollToSection('guide-gemini-section');
                showToast(lang === 'it' ? 'Aperta guida "🔑 Chiave API Personale & Distinzione Abbonamenti"!' : 'Opened "🔑 Personal API Key & Subscriptions Distinction" guide!', 'info');
                if (normTopic.includes('setting') || normTopic.includes('impostazion')) {
                  setIsSettingsModalOpen(true);
                }
              }
              // 5. Vim Navigation & Commands
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
              // 10. Default general help guide
              else {
                const helpFile = getHelpTemplate(lang);
                setVirtualFiles(prev => [...prev.filter(f => f.name !== 'help.txt'), helpFile]);
                setContent(helpFile.content);
                setFilename('help.txt');
                setFormat('txt');
                scrollToSection('guide-about-section');
                showToast(lang === 'it' ? 'Aperto file di guida "help.txt" e pannello manuale!' : 'Opened "help.txt" guide file and manual panel!', 'info');
              }
            }}
            lang={lang}
            setLang={setLang}
            onOpenGoogleDocsModal={() => setIsGoogleDocsModalOpen(true)}
            onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
            onModeChange={setActiveMode}
            isSoftKeyboardOpen={isSoftKeyboardOpen}
            onSoftKeyboardChange={setIsSoftKeyboardOpen}
          />
        </div>

        {/* Collapsible Command Guide & Typographical Test Pane */}
        {showCheatsheet && (
          <div className="flex flex-col shrink-0 relative lg:self-start">
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
                            setVirtualFiles(prev => prev.map(f => f.name === filename ? { ...f, content } : f));
                            setContent(file.content);
                            setFilename(file.name);
                            setFormat(file.format);
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
                                  }
                                }
                              }}
                              className="text-gray-400 hover:text-red-500 p-1 rounded-md hover:bg-gray-200 dark:hover:bg-[#2C313C]"
                              title={lang === 'it' ? 'Rimuovi File' : 'Remove File'}
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
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
                                <span className="text-[9px] text-gray-400 font-sans shrink-0">
                                  {isFolder ? (lang === 'it' ? 'Cartella' : 'Folder') : new Date(file.modifiedTime).toLocaleDateString()}
                                </span>
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
              <div className="flex flex-col gap-3.5 flex-1 overflow-y-auto font-sans">
                {/* 1. Presentazione Ufficiale LiViA */}
                <div id="guide-about-section" className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3.5 space-y-2.5">
                  <h3 className="text-xs font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5">
                    <Sparkles size={14} className="text-emerald-500" />
                    <span>{lang === 'it' ? 'Presentazione Ufficiale LiViA' : 'Official LiViA Presentation'}</span>
                  </h3>
                  
                  <p className="text-[11px] text-gray-800 dark:text-zinc-200 font-medium leading-relaxed bg-white dark:bg-[#0D0F12] p-3 rounded-lg border border-emerald-200/60 dark:border-[#2D2D2D]">
                    {lang === 'it'
                      ? "LiViA (Light Vi Again) è un editor di testo e codice iper-leggero e modale in stile Vim. Progettato per sviluppatori, ingegneri e utenti avanzati che richiedono un'efficienza di livello terminale unita a funzionalità cloud moderne, LiViA unisce perfettamente l'editing di testo offline leggero con l'integrazione con Google Workspace™."
                      : "LiViA (Light Vi Again) is a hyper-lightweight, modal Vim-style text and code editor. Designed for developers, engineers, and power users who demand terminal-grade efficiency paired with modern cloud features, LiViA seamlessly bridges lightweight offline text editing with Google Workspace™ integration."}
                  </p>

                  <div className="p-2.5 bg-white dark:bg-[#0D0F12] rounded-lg border border-emerald-200/60 dark:border-[#2D2D2D] space-y-2 text-[10.5px]">
                    <strong className="text-emerald-700 dark:text-emerald-400 font-bold block text-xs">
                      🔑 {lang === 'it' ? 'Caratteristiche e Funzionalità Chiave:' : 'Key Features & Capabilities:'}
                    </strong>
                    <ul className="space-y-1.5 text-gray-700 dark:text-zinc-300 leading-snug">
                      <li>
                        <strong className="text-emerald-800 dark:text-emerald-300">• {lang === 'it' ? 'Core di Editing Modale:' : 'Modal Editing Core:'}</strong>{' '}
                        {lang === 'it' ? 'Esperienza Vim autentica con modalità Normale, Inserimento, Comando e Visuale. Supporta movimenti base (g, G, 2g), eliminazioni (dd, dw, [n]dw), ricerca (/, n, N), undo/redo (u, .) e sostituzione globale (:%s/old/new/g).' : 'Authentic Vim experience featuring Normal, Insert, Command, and Visual modes. Supports core Vim motions (g, G, 2g), deletions (dd, dw, [n]dw), search navigation (/, n, N), undo/redo (u, .), and global string replacement (:%s/old/new/g).'}
                      </li>
                      <li>
                        <strong className="text-emerald-800 dark:text-emerald-300">• {lang === 'it' ? 'Integrazione Google Workspace™:' : 'Google Workspace™ Integration:'}</strong>{' '}
                        {lang === 'it' ? 'Sincronizzazione diretta bidirezionale con Google Drive™ e Google Docs™. Apri, modifica e salva frammenti di codice, note o documentazione nel tuo cloud storage.' : 'Direct two-way synchronization with Google Drive™ and Google Docs™. Open, edit, and push code snippets, notes, or documentation back to your cloud storage.'}
                      </li>
                      <li>
                        <strong className="text-emerald-800 dark:text-emerald-300">• {lang === 'it' ? 'Assistente IA Google Gemini™:' : 'Google Gemini AI Assistant™:'}</strong>{' '}
                        {lang === 'it' ? 'Alimentato dall\'integrazione nativa di Gemini AI™ per il refactoring del codice, la riassunzione di testi, il completamento e la generazione inline.' : 'Powered by native Gemini AI™ integration to assist with code refactoring, text summarization, auto-completion, and inline generation.'}
                      </li>
                      <li>
                        <strong className="text-emerald-800 dark:text-emerald-300">• {lang === 'it' ? 'Supporto Multi-Formato & Sintassi:' : 'Multi-Format & Syntax Support:'}</strong>{' '}
                        {lang === 'it' ? 'Evidenziazione della sintassi per testo semplice, Markdown (.md), LaTeX (.tex), XML, JSON, Python, Kotlin, JavaScript, C++ e script Bash.' : 'Comprehensive highlighting and parser support for plain text, Markdown (.md), LaTeX (.tex), XML, JSON, Python, Kotlin, JavaScript, C++, and Bash scripts.'}
                      </li>
                      <li>
                        <strong className="text-emerald-800 dark:text-emerald-300">• {lang === 'it' ? 'Suite di Esportazione Documenti:' : 'Document Export Suite:'}</strong>{' '}
                        {lang === 'it' ? 'Esporta il tuo lavoro in documenti PDF formattati, Markdown, TeX o documenti Word (.docx) con numerazione e rese sintattiche precise.' : 'Export your work instantly into cleanly formatted PDF documents, Markdown, TeX, or Word (.docx) formats with precise line-numbering and syntax rendering.'}
                      </li>
                      <li>
                        <strong className="text-emerald-800 dark:text-emerald-300">• {lang === 'it' ? 'Appunti Cross-Platform & UX:' : 'Cross-Platform Clipboard & UX:'}</strong>{' '}
                        {lang === 'it' ? 'Integrazione nativa con tastiera GBoard Android e appunti Linux (X11/Wayland). Interfaccia terminale con tipografia DejaVu Sans Mono per la distinzione visiva tra caratteri ambigui (l, I, 1).' : 'Native integration with Android GBoard and Linux (X11/Wayland) clipboards. Ultra-minimalist terminal interface using DejaVu Sans Mono for absolute distinction between ambiguous characters (l, I, 1).'}
                      </li>
                    </ul>
                  </div>

                  {/* Privacy Box */}
                  <div className="p-2.5 bg-emerald-100/50 dark:bg-emerald-950/30 border border-emerald-300/60 dark:border-emerald-800/50 rounded-lg text-[10px] text-emerald-900 dark:text-emerald-200 space-y-1">
                    <strong className="font-bold flex items-center gap-1 text-[11px]">
                      🔒 {lang === 'it' ? 'Data Privacy & Uso degli Scope OAuth:' : 'Data Privacy & OAuth Scopes Usage:'}
                    </strong>
                    <p className="leading-relaxed">
                      {lang === 'it'
                        ? 'LiViA accede ai dati dell\'utente esclusivamente per leggere e scrivere i file selezionati esplicitamente dall\'utente tramite l\'integrazione con Google Drive™ e Google Docs™. Tutta l\'elaborazione per i buffer dell\'editor locale rimane sul dispositivo, garantendo massime prestazioni, sicurezza e privacy dei dati.'
                        : 'LiViA strictly accesses user data only to read and write files explicitly selected by the user via Google Drive™ and Google Docs™ integration. All processing for local editor buffers remains on-device, ensuring maximal performance, security, and data privacy.'}
                    </p>
                  </div>
                </div>

                {/* 2. Navigazione & Comandi Vim */}
                <div id="guide-vim-section" className="bg-gray-50 dark:bg-[#0D0F12] border border-gray-200/80 dark:border-[#2D2D2D] rounded-xl p-3.5 space-y-3">
                  <h3 className="text-xs font-bold text-gray-800 dark:text-zinc-100 flex items-center gap-1.5">
                    <Keyboard size={14} className="text-blue-500" />
                    <span>{lang === 'it' ? 'Navigazione & Comandi Vim' : 'Vim Commands & Navigation'}</span>
                  </h3>

                  {/* Navigazione Base */}
                  <div>
                    <h4 className="font-bold text-gray-700 dark:text-zinc-300 mb-1 uppercase tracking-wider text-[10px]">
                      {lang === 'it' ? 'Navigazione (Normal Mode & Touch Mobile)' : 'Navigation (Normal Mode & Mobile Touch)'}
                    </h4>
                    <div className="space-y-1 font-mono text-[11px]">
                      <div className="flex justify-between py-0.5 border-b border-gray-100 dark:border-[#2D2D2D]">
                        <span className="text-emerald-600 dark:text-[#8AB4F8] font-bold">h, j, k, l</span>
                        <span className="text-gray-500 dark:text-zinc-400">{lang === 'it' ? '←, ↓, ↑, → (funzionanti su mobile)' : '←, ↓, ↑, → (works on mobile)'}</span>
                      </div>
                      <div className="flex justify-between py-0.5 border-b border-gray-100 dark:border-[#2D2D2D]">
                        <span className="text-emerald-600 dark:text-[#8AB4F8] font-bold">0 / $</span>
                        <span className="text-gray-500 dark:text-zinc-400">{lang === 'it' ? 'Inizio / Fine riga' : 'Start / End of line'}</span>
                      </div>
                      <div className="flex justify-between py-0.5 border-b border-gray-100 dark:border-[#2D2D2D]">
                        <span className="text-emerald-600 dark:text-[#8AB4F8] font-bold">w / 3w</span>
                        <span className="text-gray-500 dark:text-zinc-400">{lang === 'it' ? 'Avanza di 1 / 3 parole' : 'Forward 1 / 3 words'}</span>
                      </div>
                      <div className="flex justify-between py-0.5 border-b border-gray-100 dark:border-[#2D2D2D]">
                        <span className="text-emerald-600 dark:text-[#8AB4F8] font-bold">gg / G</span>
                        <span className="text-gray-500 dark:text-zinc-400">{lang === 'it' ? 'Inizio / Fine documento' : 'Top / Bottom of doc'}</span>
                      </div>
                      <div className="flex justify-between py-0.5">
                        <span className="text-emerald-600 dark:text-[#8AB4F8] font-bold">2g / 2gg</span>
                        <span className="text-gray-500 dark:text-zinc-400">{lang === 'it' ? 'Vai alla riga 2' : 'Go to line 2'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Modifica & Folding */}
                  <div>
                    <h4 className="font-bold text-gray-700 dark:text-zinc-300 mb-1 uppercase tracking-wider text-[10px]">
                      {lang === 'it' ? 'Modifica, Redo & Code Folding' : 'Editing, Redo & Code Folding'}
                    </h4>
                    <div className="space-y-1 font-mono text-[11px]">
                      <div className="flex justify-between py-0.5 border-b border-gray-100 dark:border-[#2D2D2D]">
                        <span className="text-amber-500 dark:text-amber-400 font-bold">r&lt;char&gt; / x</span>
                        <span className="text-gray-500 dark:text-zinc-400">{lang === 'it' ? 'Sostituisci / Elimina car.' : 'Replace / Delete char'}</span>
                      </div>
                      <div className="flex justify-between py-0.5 border-b border-gray-100 dark:border-[#2D2D2D]">
                        <span className="text-amber-500 dark:text-amber-400 font-bold">gq</span>
                        <span className="text-gray-500 dark:text-zinc-400">{lang === 'it' ? 'Spezza paragrafo a textwidth' : 'Wrap paragraph to textwidth'}</span>
                      </div>
                      <div className="flex justify-between py-0.5 border-b border-gray-100 dark:border-[#2D2D2D]">
                        <span className="text-red-500 dark:text-rose-400 font-bold">dd / dw</span>
                        <span className="text-gray-500 dark:text-zinc-400">{lang === 'it' ? 'Elimina riga / parola' : 'Delete line / word'}</span>
                      </div>
                      <div className="flex justify-between py-0.5 border-b border-gray-100 dark:border-[#2D2D2D]">
                        <span className="text-amber-500 dark:text-amber-300 font-bold">u / .</span>
                        <span className="text-gray-500 dark:text-zinc-400">{lang === 'it' ? 'Annulla (Undo) / Ripristina (Redo)' : 'Undo / Redo'}</span>
                      </div>
                      <div className="flex justify-between py-0.5">
                        <span className="text-purple-500 dark:text-purple-300 font-bold">zc / zo / za</span>
                        <span className="text-gray-500 dark:text-zinc-400">{lang === 'it' ? 'Chiudi / Apri / Inverti Fold' : 'Close / Open / Toggle Fold'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Comandi ex (:) & Storico Comandi Su/Giù */}
                <div id="guide-cmd-section" className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-3.5 space-y-3">
                  <h3 className="text-xs font-bold text-blue-800 dark:text-[#8AB4F8] flex items-center gap-1.5">
                    <Terminal size={14} className="text-blue-500" />
                    <span>{lang === 'it' ? 'Comandi ex (:) & Navigazione Cronologia' : 'Ex Commands (:) & Command History'}</span>
                  </h3>

                  <div className="space-y-1 font-mono text-[11px]">
                    <div className="flex justify-between py-0.5 border-b border-blue-100/50 dark:border-[#2D2D2D]">
                      <span className="text-blue-600 dark:text-[#8AB4F8] font-bold">:w / :q / :wq</span>
                      <span className="text-gray-500 dark:text-zinc-400">{lang === 'it' ? 'Salva / Esci / Salva ed esci' : 'Save / Quit / Save & quit'}</span>
                    </div>
                    <div className="flex justify-between py-0.5 border-b border-blue-100/50 dark:border-[#2D2D2D]">
                      <span className="text-blue-600 dark:text-[#8AB4F8] font-bold">{lang === 'it' ? ':set key=LA_TUA_API_KEY' : ':set key=YOUR_GEMINI_KEY'}</span>
                      <span className="text-gray-500 dark:text-zinc-400">{lang === 'it' ? 'Imposta API Key Gemini personale' : 'Set personal Gemini API key'}</span>
                    </div>
                    <div className="flex justify-between py-0.5 border-b border-blue-100/50 dark:border-[#2D2D2D]">
                      <span className="text-blue-600 dark:text-[#8AB4F8] font-bold">:set model=pro|flash</span>
                      <span className="text-gray-500 dark:text-zinc-400">{lang === 'it' ? 'Cambia modello AI' : 'Switch AI model'}</span>
                    </div>
                    <div className="flex justify-between py-0.5 border-b border-blue-100/50 dark:border-[#2D2D2D]">
                      <span className="text-blue-600 dark:text-[#8AB4F8] font-bold">{lang === 'it' ? ':%s/vecchio/nuovo/g' : ':%s/old/new/g'}</span>
                      <span className="text-gray-500 dark:text-zinc-400">{lang === 'it' ? 'Sostituzione testo globale' : 'Global text replace'}</span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-blue-600 dark:text-[#8AB4F8] font-bold">:he / :he gem / :he drive</span>
                      <span className="text-gray-500 dark:text-zinc-400">{lang === 'it' ? 'Apri guida / argomenti specifici' : 'Open help / specific topics'}</span>
                    </div>
                  </div>

                  {/* Navigazione Storico Comandi Su/Giù */}
                  <div className="p-2.5 bg-white dark:bg-[#0D0F12] rounded-lg border border-blue-200/60 dark:border-blue-900/40 text-[10.5px]">
                    <strong className="text-blue-800 dark:text-blue-300 block mb-1 font-bold">
                      📜 {lang === 'it' ? 'Come Navigare lo Storico Comandi (Su / Giù)' : 'How to Navigate Command History (Up / Down)'}
                    </strong>
                    <ul className="list-disc pl-4 space-y-1 text-gray-600 dark:text-zinc-300 leading-relaxed text-[10px]">
                      <li>
                        <strong>{lang === 'it' ? 'Su Desktop / Tastiera Fisica:' : 'Desktop / Physical Keyboard:'}</strong> {lang === 'it' ? 'Premi i tasti Freccia Su (↑) e Freccia Giù (↓) mentre stai digitando un comando in modalità `:` per scorrere i comandi inviati in precedenza.' : 'Press Up Arrow (↑) and Down Arrow (↓) while in `:` mode to cycle through previous commands.'}
                      </li>
                      <li>
                        <strong>{lang === 'it' ? 'Su Dispositivi Mobili (Smartphone / Tablet):' : 'Mobile Devices (Smartphone / Tablet):'}</strong> {lang === 'it' ? 'Sono presenti due pulsanti touch dedicati Su (▲) e Giù (▼) direttamente a fianco del campo di input del comando `:` per recuperare istantaneamente qualsiasi comando senza bisogno di frecce fisiche!' : 'Dedicated touch buttons Up (▲) and Down (▼) are located directly next to the `:` input field to recall previous commands in 1 tap!'}
                      </li>
                    </ul>
                  </div>
                </div>

                {/* 4. Integrazione Gemini AI & Gestione API Key Semplificata */}
                <div id="guide-gemini-section" className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-3.5 space-y-2.5">
                  <h3 className="text-xs font-bold text-purple-800 dark:text-purple-300 flex items-center gap-1.5">
                    <Sparkles size={14} className="text-purple-500" />
                    <span>{lang === 'it' ? 'Integrazione Google Gemini™ AI & Chiave Personale' : 'Google Gemini™ AI Integration & Personal API Key'}</span>
                  </h3>

                  <p className="text-[11px] text-gray-600 dark:text-zinc-400 leading-relaxed">
                    {lang === 'it' 
                      ? 'Invocando i comandi :gem <istruzioni>, :tr <lingua> o :lat <tema>, LiViA elabora il testo dell\'editor o della selezione visiva con l\'IA di Google Gemini™.' 
                      : 'Using :gem <prompt>, :tr <lang>, or :lat <theme>, LiViA processes editor text or visual selections with Google Gemini™ AI.'}
                  </p>

                  {/* FAQ & Chiarimenti Chiavi Google AI Studio™ */}
                  <div className="p-3 bg-white dark:bg-[#0D0F12] rounded-lg border border-purple-200/60 dark:border-purple-900/40 space-y-2.5 text-[10.5px]">
                    <strong className="text-purple-800 dark:text-purple-300 font-bold block text-[11px]">
                      🔑 {lang === 'it' ? 'Guida Definitiva: API Key, Abbonamenti & Volumi di Lavoro' : 'Definitive Guide: API Keys, Subscriptions & Workloads'}
                    </strong>
                    
                    <div className="space-y-2 text-gray-600 dark:text-zinc-300 text-[10px] leading-relaxed">
                      {/* Punto 1: Disaccoppiamento Abbonamenti */}
                      <p>
                        <strong>{lang === 'it' ? '1. 🚫 Abbonamenti Consumer (Google One™ AI Premium / Gemini Advanced™) vs API Key:' : '1. 🚫 Consumer Subscriptions (Google One™ AI Premium / Gemini Advanced™) vs API Keys:'}</strong><br />
                        {lang === 'it'
                          ? 'Gli abbonamenti consumer (es. Google One™ AI Premium / Gemini Advanced™ a pagamento mensile) servono unicamente per la chat web (gemini.google.com) e NotebookLM™. NON includono, NON forniscono e NON sostituiscono le API Key per sviluppatori/app come LiViA. Essere o non essere abbonati a Google One™ AI Premium non cambia nulla per Google AI Studio™ e LiViA: l\'uso delle API è regolato su un circuito completamente separato.'
                          : 'Consumer subscriptions (e.g. monthly Google One™ AI Premium / Gemini Advanced™) strictly cover web chat (gemini.google.com) and NotebookLM™. They do NOT grant, include, or replace developer API Keys for applications like LiViA. Being subscribed or not to Google One™ AI Premium makes zero difference for Google AI Studio™ or LiViA: API usage runs on a completely separate infrastructure.'}
                      </p>

                      {/* Punto 2: Come ottenere l'API Key Gratuita (Free Tier) */}
                      <p>
                        <strong>{lang === 'it' ? '2. 🎁 API Key Personale Gratuita (Free Tier $0 su Google AI Studio™):' : '2. 🎁 Free Personal API Key ($0 Free Tier on Google AI Studio™):'}</strong><br />
                        {lang === 'it'
                          ? 'TUTTI i titolari di un account Google (abbonati o meno) possono accedere a Google AI Studio™ (aistudio.google.com) e generare in 1-Click la propria API Key 100% GRATUITA (senza carta di credito). Impostando la chiave personale in LiViA (`set key=chiave_mia` o nelle Impostazioni) ottieni la tua quota personale riservata (fino a 15 chiamate/min su Flash e 2/min su Pro) evitando le code della chiave condivisa di sistema.'
                          : 'ALL Google account holders (subscribed or not) can log into Google AI Studio™ (aistudio.google.com) and generate a 100% FREE API Key with 1-Click (no credit card required). Setting your personal key in LiViA (`set key=my_key` or in Settings) grants your own reserved quota (up to 15 req/min on Flash and 2 req/min on Pro), bypassing public shared key rate limits.'}
                      </p>

                      {/* Punto 3: Quando serve il Pay-As-You-Go per grandi volumi */}
                      <p>
                        <strong>{lang === 'it' ? '3. ⚡ Serve Google Cloud Billing / Carta di Credito per analizzare grandi documenti in LiViA?' : '3. ⚡ Do you need Google Cloud Billing / Credit Card for large documents in LiViA?'}</strong><br />
                        {lang === 'it'
                          ? 'NO! Il piano GRATUITO ($0 Free Tier) su Google AI Studio™ supporta già una finestra di contesto enorme (fino a 2 Milioni di token, pari a centinaia di pagine di documenti DOCX/PDF o intere basi di codice). Gli utenti normali NON devono collegare alcuna carta di credito o account di fatturazione. L\'associazione di un account Google Cloud Billing™ (Pay-As-You-Go) è un\'opzione riservata esclusivamente a sviluppatori ed aziende con chiamate API automatizzate ad altissimo volume che superano i limiti di frequenza gratuiti.'
                          : 'NO! The $0 Free Tier on Google AI Studio™ already includes a massive context window (up to 2 Million tokens, equivalent to hundreds of pages of DOCX/PDF files or full codebases). Regular users do NOT need to link any credit card or billing account. Linking a Google Cloud Billing™ account (Pay-As-You-Go) is purely optional for developers and enterprise pipelines requiring high-throughput automated API calls beyond free rate limits.'}
                      </p>

                      {/* Punto 4: Statistiche e Tracciamento */}
                      <p>
                        <strong>{lang === 'it' ? '4. 📊 Che cosa tracciano le statistiche su Google AI Studio™?' : '4. 📊 What do stats on Google AI Studio™ actually track?'}</strong><br />
                        {lang === 'it'
                          ? 'Le metriche e i grafici di consumo su Google AI Studio™ misurano unicamente le chiamate API effettuate tramite la tua chiave (es. da LiViA, da script o SDK). NON intaccano e NON riflettono l\'uso della chat web Gemini™ o NotebookLM™.'
                          : 'Metrics and usage charts on Google AI Studio™ strictly measure API requests made via your API Key (e.g. from LiViA, scripts, or SDKs). They do NOT affect or reflect Gemini™ web chat or NotebookLM™ usage.'}
                      </p>

                      {/* Punto 5: Come generare la tua API Key */}
                      <p>
                        <strong>{lang === 'it' ? '5. 🎯 Come generare la tua API Key in 1-Click:' : '5. 🎯 How to generate your API Key in 1-Click:'}</strong><br />
                        {lang === 'it'
                          ? 'Accedi a Google AI Studio (aistudio.google.com/app/apikey) con il tuo account Google e fai clic sul pulsante blu "Create API key" (Crea chiave API). Copia la chiave generata e incollala in LiViA nelle Impostazioni o con il comando `:set key=la_tua_chiave`. La chiave è subito attiva, 100% gratuita e riservata al tuo account.'
                          : 'Log into Google AI Studio (aistudio.google.com/app/apikey) with your Google account and click the blue "Create API key" button. Copy the generated key and paste it into LiViA in Settings or via `:set key=your_key`. The key is active immediately, 100% free, and dedicated to your account.'}
                      </p>

                      {/* Punto 6: Linux Live OS */}
                      <div>
                        <strong className="text-purple-900 dark:text-purple-200 block mb-1">
                          {lang === 'it' ? '🔄 Gestione della Chiave su Linux Live OS (4 Metodi):' : '🔄 Key Management on Linux Live OS (4 Methods):'}
                        </strong>
                        <p className="mb-1.5">
                          {lang === 'it'
                            ? 'Sulle distribuzioni Linux Live la memoria del browser viene azzerata al riavvio. Puoi mantenere attiva la tua API Key con uno di questi metodi:'
                            : 'On Linux Live OS builds, browser memory resets on reboot. You can keep your personal API Key active using one of these methods:'}
                        </p>
                        <ul className="list-disc pl-4 space-y-1.5 text-[10px]">
                          <li>
                            <strong>{lang === 'it' ? 'Metodo 1: Dalla Scheda "Cloud" (Google Drive™) nell\'Editor (Consigliato):' : 'Method 1: From the "Cloud" (Google Drive™) Tab in the Editor (Recommended):'}</strong>{' '}
                            {lang === 'it'
                              ? 'Carica o apri il tuo file .lvarc da Google Drive™ tramite la scheda "Cloud" di LiViA (contenente la riga set key=LA_TUA_API_KEY). LiViA lo sincronizza e applica la chiave all\'istante senza digitare nulla!'
                              : 'Open your .lvarc file from Google Drive™ via LiViA\'s "Cloud" tab (containing set key=YOUR_API_KEY). LiViA synchronizes and applies your key instantly without typing!'}
                          </li>
                          <li>
                            <strong>{lang === 'it' ? 'Metodo 2: Profilo Browser Pre-configurato prima dell\'ISO Live:' : 'Method 2: Pre-configured Browser Profile Before Live ISO Creation:'}</strong>{' '}
                            {lang === 'it'
                              ? 'Se imposti la chiave nelle impostazioni di LiViA o crei un segnalibro con ?key= nel profilo del browser PRIMA di creare/masterizzare la tua ISO Live, ad ogni avvio il sistema partirà con il browser 100% pronto e configurato!'
                              : 'If you set your key in LiViA settings or save a bookmark with ?key= in your browser profile BEFORE creating/remastering your Live ISO image, every boot of the Live OS starts with a 100% prepared browser!'}
                          </li>
                          <li>
                            <strong>{lang === 'it' ? 'Metodo 3: Segnalibro URL con Parametro ?key=:' : 'Method 3: URL Bookmark with ?key= Parameter:'}</strong>{' '}
                            {lang === 'it'
                              ? 'Salva nei preferiti dell\'ISO Live l\'URL con ?key=LA_TUA_API_KEY (es. https://...run.app/?key=AIzaSy...). All\'apertura LiViA memorizza la chiave e pulisce l\'URL per sicurezza.'
                              : 'Bookmark your app URL with ?key=YOUR_API_KEY (e.g. https://...run.app/?key=AIzaSy...). When opened, LiViA loads and saves the key, then cleans the address bar for privacy.'}
                          </li>
                          <li>
                            <strong>{lang === 'it' ? 'Metodo 4: Comando Vim e File .lvarc Locale:' : 'Method 4: Vim Command & Local .lvarc File:'}</strong>{' '}
                            {lang === 'it'
                              ? 'Digita :set key=LA_TUA_API_KEY in modalità comando o aggiungila direttamente al file virtuale .lvarc nell\'editor.'
                              : 'Type :set key=YOUR_API_KEY in command mode or add it directly to the virtual .lvarc file in the editor.'}
                          </li>
                        </ul>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 pt-1.5">
                      <button
                        type="button"
                        onClick={() => setIsSettingsModalOpen(true)}
                        className="flex-1 py-1.5 px-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-[11px] transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        <Settings size={13} />
                        <span>{lang === 'it' ? 'Apri Impostazioni & Inserisci Chiave API' : 'Open Settings & Enter API Key'}</span>
                      </button>
                      <a
                        href="https://aistudio.google.com/app/apikey"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-1.5 px-3 rounded-lg border border-purple-300 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 text-purple-700 dark:text-purple-300 font-bold text-[10.5px] transition-all flex items-center justify-center gap-1"
                      >
                        <ExternalLink size={12} />
                        <span>{lang === 'it' ? '1-Click: Genera API Key (Google AI Studio™)' : '1-Click: Get API Key (Google AI Studio™)'}</span>
                      </a>
                    </div>
                  </div>
                </div>

                {/* 5. Configurazione Avanzata (.lvarc) */}
                <div id="guide-lvarc-section" className="bg-[#8AB4F8]/10 border border-[#8AB4F8]/20 rounded-xl p-3.5 space-y-2">
                  <h3 className="text-xs font-bold text-blue-800 dark:text-[#8AB4F8] flex items-center gap-1.5">
                    <Settings size={14} className="text-[#8AB4F8]" />
                    <span>{lang === 'it' ? 'Configurazione Avanzata (.lvarc)' : 'Advanced Configuration (.lvarc)'}</span>
                  </h3>
                  <p className="text-[11px] text-gray-600 dark:text-zinc-400 leading-relaxed font-sans">
                    {lang === 'it' 
                      ? 'LiViA carica automaticamente all\'avvio il file virtuale .lvarc per applicare le preferenze salvate senza digitare comandi ogni volta:' 
                      : 'LiViA automatically loads .lvarc to persist preferences:'}
                  </p>
                  <div className="p-2.5 bg-gray-900 text-emerald-400 rounded-lg font-mono text-[10px] space-y-1">
                    {lang === 'it' ? (
                      <>
                        <div>set key=AIzaSy... <span className="text-gray-500"># Chiave API Gemini personale (Auto-caricata)</span></div>
                        <div>set number <span className="text-gray-500"># Mostra numeri di riga</span></div>
                        <div>set wrap <span className="text-gray-500"># Testo a capo</span></div>
                        <div>set syntax=on <span className="text-gray-500"># Sintassi colorata</span></div>
                        <div>set model=flash <span className="text-gray-500"># flash | pro</span></div>
                        <div>set theme=dark <span className="text-gray-500"># dark | light | system</span></div>
                        <div>set lang=it <span className="text-gray-500"># it | en</span></div>
                      </>
                    ) : (
                      <>
                        <div>set key=AIzaSy... <span className="text-gray-500"># Personal Gemini API key (Auto-loaded)</span></div>
                        <div>set number <span className="text-gray-500"># Show line numbers</span></div>
                        <div>set wrap <span className="text-gray-500"># Word wrap text</span></div>
                        <div>set syntax=on <span className="text-gray-500"># Syntax highlighting</span></div>
                        <div>set model=flash <span className="text-gray-500"># flash | pro</span></div>
                        <div>set theme=dark <span className="text-gray-500"># dark | light | system</span></div>
                        <div>set lang=en <span className="text-gray-500"># it | en</span></div>
                      </>
                    )}
                  </div>
                </div>

                {/* 6. Integrazione Google Drive & Google Docs */}
                <div id="guide-workspace-section" className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3.5 space-y-2.5">
                  <h3 className="text-xs font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5">
                    <Cloud size={14} className="text-emerald-500" />
                    <span>{lang === 'it' ? 'Integrazione Google Drive™ & Google Docs™' : 'Google Drive™ & Google Docs™ Integration'}</span>
                  </h3>
                  
                  <div className="p-2.5 bg-white dark:bg-[#0D0F12] border border-emerald-200 dark:border-[#2D2D2D] rounded-lg text-[10.5px] space-y-1.5">
                    <strong className="text-emerald-700 dark:text-emerald-400 block font-bold">
                      📄 {lang === 'it' ? 'Conversione Automatica Google Docs (.gdoc) -> Markdown' : 'Automatic Google Docs (.gdoc) -> Markdown Conversion'}
                    </strong>
                    <p className="text-gray-600 dark:text-zinc-300 leading-relaxed text-[10px]">
                      {lang === 'it' 
                        ? 'Quando apri un file Google Docs (.gdoc) da Google Drive™, LiViA lo converte automaticamente in Markdown pulito, eliminando file corrotti o codici binari!' 
                        : 'Opening a Google Docs file (.gdoc) from Google Drive™ automatically converts it into clean Markdown, avoiding unreadable text.'}
                    </p>
                  </div>

                  {/* Utilizzo Menu Apri con > LiViA su Drive */}
                  <div className="p-2.5 bg-white dark:bg-[#0D0F12] border border-emerald-200 dark:border-[#2D2D2D] rounded-lg text-[10.5px] space-y-1.5">
                    <strong className="text-emerald-800 dark:text-emerald-300 block font-bold">
                      📂 {lang === 'it' ? 'Apertura e Creazione Documenti su Google Drive™' : 'Opening & Creating Documents on Google Drive™'}
                    </strong>
                    <p className="text-gray-600 dark:text-zinc-300 text-[10px] leading-relaxed">
                      {lang === 'it'
                        ? 'In Google Drive™, fai clic con il tasto destro del mouse su qualsiasi documento o file di codice e seleziona "Apri con" ➔ "LiViA Editor" per aprirlo e modificarlo direttamente nell\'editor.'
                        : 'In Google Drive™, right-click any document or code file and select "Open with" ➔ "LiViA Editor" to open and edit it directly in the editor.'}
                    </p>
                  </div>
                </div>

                {/* 8. Guide Formattazione Avanzata (Colori, Immagini, Figure, Tabelle) */}
                <div className="bg-purple-500/5 border border-purple-500/15 rounded-xl p-3.5 space-y-2 font-sans">
                  <h3 className="text-xs font-bold text-purple-800 dark:text-purple-300 flex items-center gap-1.5">
                    <BookOpen size={14} className="text-purple-500" />
                    <span>{lang === 'it' ? 'Guide Formattazione Avanzata (MD & DOCX)' : 'Advanced Formatting Guides (MD & DOCX)'}</span>
                  </h3>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      onClick={() => {
                        let colFile = virtualFiles.find(f => f.name === 'help_colors.md');
                        if (!colFile) {
                          colFile = HELP_COLORS_TEMPLATE;
                          setVirtualFiles(prev => [...prev.filter(f => f.name !== 'help_colors.md'), colFile!]);
                        }
                        setContent(colFile.content);
                        setFilename('help_colors.md');
                        setFormat('md');
                        showToast(lang === 'it' ? 'Aperta guida Colori!' : 'Opened Color guide!', 'info');
                      }}
                      className="p-2 bg-purple-100 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 rounded-lg text-[10px] font-bold text-center border border-purple-200 dark:border-purple-800/50 cursor-pointer"
                    >
                      🎨 {lang === 'it' ? 'Colori' : 'Colors'}
                    </button>
                    <button
                      onClick={() => {
                        let figFile = virtualFiles.find(f => f.name === 'help_figures.md');
                        if (!figFile) {
                          figFile = HELP_FIGURES_TEMPLATE;
                          setVirtualFiles(prev => [...prev.filter(f => f.name !== 'help_figures.md'), figFile!]);
                        }
                        setContent(figFile.content);
                        setFilename('help_figures.md');
                        setFormat('md');
                        showToast(lang === 'it' ? 'Aperta guida Figure!' : 'Opened Figure guide!', 'info');
                      }}
                      className="p-2 bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-[#8AB4F8] rounded-lg text-[10px] font-bold text-center border border-blue-200 dark:border-blue-800/50 cursor-pointer"
                    >
                      🖼️ {lang === 'it' ? 'Figure' : 'Figures'}
                    </button>
                    <button
                      onClick={() => {
                        let tabFile = virtualFiles.find(f => f.name === 'help_tables.md');
                        if (!tabFile) {
                          tabFile = HELP_TABLES_TEMPLATE;
                          setVirtualFiles(prev => [...prev.filter(f => f.name !== 'help_tables.md'), tabFile!]);
                        }
                        setContent(tabFile.content);
                        setFilename('help_tables.md');
                        setFormat('md');
                        showToast(lang === 'it' ? 'Aperta guida Tabelle!' : 'Opened Table guide!', 'info');
                      }}
                      className="p-2 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 rounded-lg text-[10px] font-bold text-center border border-emerald-200 dark:border-emerald-800/50 cursor-pointer"
                    >
                      📊 {lang === 'it' ? 'Tabelle' : 'Tables'}
                    </button>
                  </div>
                </div>

                {/* 9. Risoluzione Problemi / Aggiornamenti Android */}
                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-xl p-3.5 space-y-2 font-sans">
                  <h3 className="text-xs font-bold text-red-800 dark:text-red-400 flex items-center gap-1.5">
                    <RefreshCw size={14} className="text-red-500" />
                    <span>{lang === 'it' ? 'Risoluzione Problemi Aggiornamenti (Android / Chrome)' : 'Update Troubleshooting (Android / Chrome)'}</span>
                  </h3>
                  <div className="space-y-1.5 text-gray-700 dark:text-zinc-300 text-[10px] leading-relaxed">
                    <p>
                      {lang === 'it'
                        ? 'Se hai installato LiViA come App su Android (PWA) e non ricevi gli ultimi aggiornamenti, il Service Worker di Chrome potrebbe bloccarli nella cache offline. Per forzare un aggiornamento pulito:'
                        : 'If you installed LiViA as an Android App (PWA) and aren\'t receiving the latest updates, Chrome\'s Service Worker might be locking the offline cache. To force a clean update:'}
                    </p>
                    <ol className="list-decimal pl-4 space-y-0.5 mt-1 font-semibold text-gray-800 dark:text-zinc-200">
                      <li>{lang === 'it' ? 'Vai in Impostazioni Android > App > Chrome' : 'Go to Android Settings > Apps > Chrome'}</li>
                      <li>{lang === 'it' ? 'Seleziona "Spazio di archiviazione e cache"' : 'Select "Storage and cache"'}</li>
                      <li>{lang === 'it' ? 'Tocca "Gestisci spazio" e poi "Elimina tutti i dati"' : 'Tap "Manage space" then "Clear all data"'}</li>
                    </ol>
                    <p className="text-red-700 dark:text-red-400 italic mt-1.5 font-medium">
                      {lang === 'it'
                        ? '⚠️ Attenzione: questa procedura è radicale e ti disconnetterà dagli altri siti su Chrome. È consigliata solo se l\'App non si aggiorna in alcun modo.'
                        : '⚠️ Warning: this is a radical procedure that will log you out of other Chrome websites. Only recommended if the App refuses to update.'}
                    </p>
                  </div>
                </div>

                {/* 10. Tributo a Bram Moolenaar, Copyright & Licenza (TASSATIVAMENTE ALLA FINE) */}
                <div className="mt-2 space-y-2">
                  {/* Tributo Moolenaar */}
                  <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl p-3">
                    <h3 className="text-xs font-bold text-amber-800 dark:text-amber-400 mb-1 flex items-center gap-1.5">
                      <Sparkles size={13} className="text-amber-500" />
                      <span>{lang === 'it' ? 'In Memoria di Bram Moolenaar' : 'In Memory of Bram Moolenaar'}</span>
                    </h3>
                    <p className="text-[10px] text-gray-700 dark:text-zinc-300 leading-relaxed">
                      {lang === 'it'
                        ? "In memoria di Bram Moolenaar (1961 - 2023), l'altruista creatore di Vim. LiViA è un piccolo e umile omaggio alla sua filosofia di sviluppo e invita i suoi utenti a sostenere i bambini in Uganda (tramite ICCF Holland)."
                        : "In memory of Bram Moolenaar (1961 - 2023), the altruistic creator of Vim. LiViA is a small and humble tribute to his engineering philosophy, encouraging users to support orphans in Uganda (via ICCF Holland)."}
                    </p>
                  </div>

                  {/* Copyright & Licenza */}
                  <div className="bg-gray-100 dark:bg-[#0D0F12] border border-gray-200 dark:border-[#2D2D2D] rounded-xl p-3 text-[10px] text-gray-500 dark:text-zinc-400 space-y-1">
                    <h4 className="font-bold text-gray-700 dark:text-zinc-300 text-[11px] mb-1">
                      {lang === 'it' ? 'Copyright & Licenza' : 'Copyright & License'}
                    </h4>
                    <p>
                      <strong>{lang === 'it' ? 'Autore:' : 'Author:'}</strong> Ing. Mario Fantini (
                      <a 
                        href="https://mariofantini.eu" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
                      >
                        https://mariofantini.eu
                      </a>
                      )
                    </p>
                    <p>
                      <strong>{lang === 'it' ? 'Piattaforme di sviluppo:' : 'Development platforms:'}</strong> Ecosistema Google™
                    </p>
                    <p>
                      <strong>{lang === 'it' ? 'Sistemi supportati:' : 'Supported systems:'}</strong> Android™, Linux, ChromeOS™, WEB, Microsoft Windows, macOS
                    </p>
                    <p>
                      {lang === 'it'
                        ? "© 2026. Condivisibile, modificabile e derivabile liberamente con attribuzione obbligatoria. È strettamente proibito l'uso commerciale (CC BY-NC 4.0)."
                        : "© 2026. Shareable, modifiable, and derivable with mandatory attribution. Commercial use is strictly prohibited (CC BY-NC 4.0)."}
                    </p>
                    <div className="mt-2 pt-2 border-t border-gray-200 dark:border-[#3D3D3D]">
                      <strong>{lang === 'it' ? 'Avviso sulla Proprietà Intellettuale:' : 'Intellectual Property Notice:'}</strong><br/>
                      {lang === 'it'
                        ? "Questa architettura software, logica di parsing e codice sorgente sono opera proprietaria dell'autore. Manifestazioni di interesse per l'acquisizione completa dei diritti commerciali e il buyout di proprietà sono ben accette, previo accordo economico, pur preservando la paternità storica e morale."
                        : "This software architecture, parsing logic, and source code are the proprietary work of the author. Manifestations of interest for the complete acquisition of commercial rights and ownership buyout are welcome, subject to prior economic agreement, while preserving the historical and moral authorship."}
                    </div>
                  </div>
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
            />
          </div>
        </div>
      )}

      {/* Google Drive Full-Screen Modal Overlay */}
      {isDriveFullScreen && (
        <div className="fixed inset-0 z-50 bg-white/95 dark:bg-[#0D0F12]/95 backdrop-blur-md p-6 flex flex-col font-sans">
          <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-[#2D2D2D] mb-4">
            <div className="flex items-center gap-2">
              <Cloud size={20} className="text-blue-500" />
              <h2 className="text-base font-bold text-gray-800 dark:text-zinc-100">
                {lang === 'it' ? 'Esplora Google Drive™ (Schermo Intero)' : 'Explore Google Drive™ (Full Screen)'}
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
                        handleOpenDriveFile(file);
                        setIsDriveFullScreen(false);
                      }
                    }}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isCurrent
                        ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700 text-blue-900 dark:text-[#8AB4F8]'
                        : 'bg-white dark:bg-[#16181D] border-gray-200 dark:border-[#2D2D2D] hover:border-blue-400 dark:hover:border-blue-600'
                    }`}
                  >
                    <div className="flex items-start gap-3">
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
                  </div>
                );
              })}
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
        showToast={showToast}
      />

    </div>
  );
}
