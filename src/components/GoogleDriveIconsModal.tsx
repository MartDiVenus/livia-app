/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  X, 
  Download, 
  Copy, 
  Check, 
  Image as ImageIcon, 
  ExternalLink,
  Sparkles,
  Info,
  CheckCircle2,
  FileCode,
  ShieldCheck
} from 'lucide-react';

interface GoogleDriveIconsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang?: 'it' | 'en';
}

interface IconSizeSpec {
  size: number;
  filename: string;
  url: string;
  label: string;
  required: boolean;
  usage: string;
}

export function GoogleDriveIconsModal({
  isOpen,
  onClose,
  lang = 'it'
}: GoogleDriveIconsModalProps) {
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [previewTheme, setPreviewTheme] = useState<'dark' | 'light'>('dark');

  if (!isOpen) return null;

  const prodOrigin = 'https://livia-editor.ai.studio';
  const origin = typeof window !== 'undefined' ? window.location.origin : prodOrigin;
  const baseUrl = prodOrigin;

  const iconSpecs: IconSizeSpec[] = [
    {
      size: 220,
      filename: 'banner-220x140.png',
      url: `${baseUrl}/banner-220x140.png`,
      label: '220 x 140 (Banner Card) *',
      required: true,
      usage: lang === 'it' ? 'Banner obbligatorio per Google Workspace Marketplace SDK -> Store Listing (Application Card Banner)' : 'Required banner for Google Workspace Marketplace SDK -> Store Listing (Application Card Banner)'
    },
    {
      size: 256,
      filename: 'logo-256x256.png',
      url: `${baseUrl}/logo-256x256.png`,
      label: '256 x 256 *',
      required: true,
      usage: lang === 'it' ? 'Icona principale per Marketplace SDK e Google Cloud Console' : 'Main Marketplace & Google Cloud Console icon'
    },
    {
      size: 128,
      filename: 'logo-128x128.png',
      url: `${baseUrl}/logo-128x128.png`,
      label: '128 x 128 *',
      required: true,
      usage: lang === 'it' ? 'Icona scheda applicazione e pop-up di autorizzazione OAuth' : 'App card icon & OAuth consent popup'
    },
    {
      size: 96,
      filename: 'logo-96x96.png',
      url: `${baseUrl}/logo-96x96.png`,
      label: '96 x 96',
      required: false,
      usage: lang === 'it' ? 'Icona per Google Workspace Marketplace SDK (Web App Integration)' : 'Workspace Marketplace SDK icon'
    },
    {
      size: 64,
      filename: 'logo-64x64.png',
      url: `${baseUrl}/logo-64x64.png`,
      label: '64 x 64 *',
      required: true,
      usage: lang === 'it' ? 'Icona griglia applicazione e Google Workspace App Switcher' : 'App grid icon & Workspace App Switcher'
    },
    {
      size: 48,
      filename: 'logo-48x48.png',
      url: `${baseUrl}/logo-48x48.png`,
      label: '48 x 48',
      required: false,
      usage: lang === 'it' ? 'Icona per Google Workspace Marketplace SDK (Web App Integration)' : 'Workspace Marketplace SDK icon'
    },
    {
      size: 32,
      filename: 'logo-32x32.png',
      url: `${baseUrl}/logo-32x32.png`,
      label: '32 x 32 *',
      required: true,
      usage: lang === 'it' ? 'Favicon e menu integrato Google Drive™ / Google Docs™' : 'Favicon & Google Drive™ / Google Docs™ embedded menu icon'
    },
    {
      size: 16,
      filename: 'logo-16x16.png',
      url: `${baseUrl}/logo-16x16.png`,
      label: '16 x 16 *',
      required: true,
      usage: lang === 'it' ? 'Micro-icona barra di stato e tab browser' : 'Status bar micro-icon & browser tab'
    }
  ];

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2500);
  };

  const generatePngFromBrowserCanvas = (svgUrl: string, filename: string, width: number, height: number): Promise<void> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            if (blob) {
              const blobUrl = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = blobUrl;
              a.download = filename;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
            }
            resolve();
          }, 'image/png');
        } else {
          resolve();
        }
      };
      img.onerror = () => {
        // Fallback to direct download
        const a = document.createElement('a');
        a.href = svgUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        resolve();
      };
      img.src = svgUrl;
    });
  };

  const handleDownloadSingle = async (filename: string, size: number) => {
    const isBanner = filename.includes('banner');
    const width = isBanner ? 220 : size;
    const height = isBanner ? 140 : size;
    const svgSourceUrl = isBanner ? `${baseUrl}/banner-220x140.svg` : `${baseUrl}/logo.svg`;
    
    await generatePngFromBrowserCanvas(svgSourceUrl, filename, width, height);
  };

  const handleDownloadAll = async () => {
    for (const spec of iconSpecs) {
      await handleDownloadSingle(spec.filename, spec.size);
      await new Promise((r) => setTimeout(r, 200));
    }
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md animate-fade-in font-sans">
      <div className="bg-white dark:bg-[#16181D] border border-gray-200 dark:border-[#2D2D2D] rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-gray-100 dark:border-[#2D2D2D] flex justify-between items-center bg-emerald-50/50 dark:bg-emerald-950/20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-md">
              <ImageIcon size={22} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span>{lang === 'it' ? 'Icone & Banner Google Workspace Console' : 'Google Workspace Console Icons & Banner'}</span>
                <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full">
                  {lang === 'it' ? '8 PNG / Banner' : '8 PNG / Banner'}
                </span>
              </h2>
              <p className="text-xs text-gray-500 dark:text-zinc-400">
                {lang === 'it' 
                  ? 'Icone ad alta risoluzione e banner 220x140 generati per Google Drive™ SDK e Workspace Marketplace Store Listing'
                  : 'High-res icons and 220x140 banner generated for Google Drive™ SDK and Workspace Marketplace Store Listing'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-xs text-gray-700 dark:text-zinc-300">
          
          {/* Top Banner & Quick Download All */}
          <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Sparkles size={20} className="text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white text-sm">
                  {lang === 'it' ? 'Set di Icone Pronto all\'Uso' : 'Ready-to-Use Icon Set'}
                </h3>
                <p className="text-gray-600 dark:text-zinc-400 mt-0.5 leading-relaxed">
                  {lang === 'it'
                    ? 'Tutti i file rispetta esattamente la geometria vettoriale di LiViA con trasparenza alpha perfetta e sfumatura ad altissima resa grafica.'
                    : 'All files strictly adhere to LiViA vector geometry with perfect alpha transparency and high-fidelity gradients.'}
                </p>
              </div>
            </div>
            <button
              onClick={handleDownloadAll}
              className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-md hover:shadow-lg active:scale-98 transition-all flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer shrink-0"
            >
              {copiedAll ? <CheckCircle2 size={16} /> : <Download size={16} />}
              <span>{copiedAll ? (lang === 'it' ? 'Download Avviato!' : 'Download Started!') : (lang === 'it' ? 'Scarica Tutti (8 PNG / Banner)' : 'Download All (8 PNG / Banner)')}</span>
            </button>
          </div>

          {/* Replica Google Console Form Section */}
          <div className="bg-gray-900 text-gray-100 rounded-xl p-4 sm:p-5 border border-gray-800 shadow-inner font-mono">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-800 font-sans">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-200">Application Icon</span>
                <span className="text-[10px] bg-blue-900/60 text-blue-300 px-2 py-0.5 rounded border border-blue-700/50">Google Cloud Console / Google Drive™ API</span>
              </div>
              <div className="flex items-center gap-1 text-[11px] bg-gray-800 p-1 rounded-lg">
                <span className="text-gray-400 px-1">Anteprima Sfondo:</span>
                <button 
                  onClick={() => setPreviewTheme('dark')}
                  className={`px-2 py-0.5 rounded ${previewTheme === 'dark' ? 'bg-gray-700 text-white font-bold' : 'text-gray-400 hover:text-white'}`}
                >
                  Dark
                </button>
                <button 
                  onClick={() => setPreviewTheme('light')}
                  className={`px-2 py-0.5 rounded ${previewTheme === 'light' ? 'bg-gray-300 text-gray-900 font-bold' : 'text-gray-400 hover:text-white'}`}
                >
                  Light
                </button>
              </div>
            </div>

            <div className="space-y-3 font-sans">
              {iconSpecs.map((spec) => (
                <div 
                  key={spec.size}
                  className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-lg border border-gray-800 bg-[#121418] hover:border-gray-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {/* Live Thumbnail Box */}
                    <div className={`p-2 rounded-lg border flex items-center justify-center shrink-0 min-w-[52px] min-h-[52px] ${
                      previewTheme === 'dark' ? 'bg-[#181A20] border-gray-800' : 'bg-gray-100 border-gray-300'
                    }`}>
                      <img 
                        src={spec.url} 
                        alt={spec.label} 
                        style={{ width: `${Math.min(spec.size, 40)}px`, height: `${Math.min(spec.size, 40)}px` }}
                        className="object-contain drop-shadow"
                        referrerPolicy="no-referrer"
                      />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white tracking-wide">{spec.label}</span>
                        <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-1.5 py-0.2 rounded font-mono">
                          {spec.size}x{spec.size} px
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {spec.usage}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      onClick={() => handleCopyUrl(spec.url)}
                      className="px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg text-xs transition-all flex items-center gap-1.5 cursor-pointer border border-gray-700/60"
                      title={lang === 'it' ? 'Copia URL pubblico diretto' : 'Copy direct public URL'}
                    >
                      {copiedUrl === spec.url ? (
                        <>
                          <Check size={13} className="text-emerald-400" />
                          <span className="text-emerald-400 font-semibold">{lang === 'it' ? 'Copiato!' : 'Copied!'}</span>
                        </>
                      ) : (
                        <>
                          <Copy size={13} />
                          <span>URL</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleDownloadSingle(spec.filename, spec.size)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <Download size={13} />
                      <span>{lang === 'it' ? 'Scarica PNG' : 'Download PNG'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SVG Vector Source Section */}
          <div className="p-4 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50/50 dark:bg-[#0D0F12] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-lg">
                <FileCode size={20} />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white text-xs">
                  {lang === 'it' ? 'Sorgenti Vettoriali SVG Originali' : 'Original SVG Vector Sources'}
                </h4>
                <p className="text-gray-500 dark:text-zinc-400 text-[11px] mt-0.5">
                  {lang === 'it' 
                    ? 'Gli SVG si aprono in qualsiasi browser, GIMP, Inkscape o editor e possono essere esportati in PNG con qualunque risoluzione.'
                    : 'SVGs open in any browser, GIMP, Inkscape or vector editor and can be exported to PNG at any custom resolution.'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <a
                href={`${baseUrl}/logo.svg`}
                download="logo.svg"
                className="flex-1 sm:flex-initial px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Download size={13} />
                <span>logo.svg</span>
              </a>
              <a
                href={`${baseUrl}/banner-220x140.svg`}
                download="banner-220x140.svg"
                className="flex-1 sm:flex-initial px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Download size={13} />
                <span>banner-220x140.svg</span>
              </a>
            </div>
          </div>

          {/* Clean & Professional Google Workspace & Drive Setup Guide */}
          <div className="p-5 rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/30 dark:bg-blue-950/20 space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-blue-200/80 dark:border-blue-900/40">
              <ShieldCheck size={20} className="text-blue-600 dark:text-[#8AB4F8]" />
              <h4 className="font-bold text-gray-900 dark:text-white text-sm">
                {lang === 'it' ? 'Istruzioni di Configurazione Google Cloud Platform' : 'Google Cloud Platform Configuration Instructions'}
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              {/* Step 1: APIs */}
              <div className="p-3.5 bg-white dark:bg-[#121418] rounded-xl border border-gray-200 dark:border-zinc-800 space-y-2">
                <div className="flex items-center gap-2 font-bold text-blue-600 dark:text-[#8AB4F8]">
                  <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-[11px]">1</span>
                  <span>{lang === 'it' ? 'API da Abilitare' : 'APIs to Enable'}</span>
                </div>
                <p className="text-gray-600 dark:text-zinc-400 text-[11px] leading-relaxed">
                  {lang === 'it' 
                    ? 'In Google Cloud Console -> APIs & Services -> Libreria, abilita le seguenti 2 API:' 
                    : 'In Google Cloud Console -> APIs & Services -> Library, enable the following 2 APIs:'}
                </p>
                <ul className="space-y-1 text-[11px] font-semibold text-gray-800 dark:text-zinc-200">
                  <li className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                    <Check size={13} className="shrink-0" />
                    <span>Google Drive™ SDK API</span>
                  </li>
                  <li className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                    <Check size={13} className="shrink-0" />
                    <span>Google Workspace Marketplace SDK API</span>
                  </li>
                </ul>
              </div>

              {/* Step 2: Scopes */}
              <div className="p-3.5 bg-white dark:bg-[#121418] rounded-xl border border-gray-200 dark:border-zinc-800 space-y-2">
                <div className="flex items-center gap-2 font-bold text-blue-600 dark:text-[#8AB4F8]">
                  <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-[11px]">2</span>
                  <span>{lang === 'it' ? 'Ambiti OAuth (Scope)' : 'OAuth Scopes'}</span>
                </div>
                <p className="text-gray-600 dark:text-zinc-400 text-[11px] leading-relaxed">
                  {lang === 'it'
                    ? 'In Google Auth Platform -> Accesso ai dati, imposta questi 4 ambiti non sensibili:'
                    : 'In Google Auth Platform -> Data Access, set these 4 non-sensitive scopes:'}
                </p>
                <ul className="space-y-0.5 text-[10.5px] font-mono text-gray-700 dark:text-zinc-300">
                  <li>• <strong className="text-gray-900 dark:text-white">openid</strong></li>
                  <li>• <strong className="text-gray-900 dark:text-white">.../auth/userinfo.email</strong></li>
                  <li>• <strong className="text-gray-900 dark:text-white">.../auth/userinfo.profile</strong></li>
                  <li>• <strong className="text-gray-900 dark:text-white">.../auth/drive.file</strong></li>
                </ul>
              </div>

              {/* Step 3: Drive UI Integration & Store Listing */}
              <div className="p-3.5 bg-white dark:bg-[#121418] rounded-xl border border-gray-200 dark:border-zinc-800 space-y-2">
                <div className="flex items-center gap-2 font-bold text-blue-600 dark:text-[#8AB4F8]">
                  <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-[11px]">3</span>
                  <span>{lang === 'it' ? 'Google Drive™ UI & Store Listing' : 'Google Drive™ UI & Store Listing'}</span>
                </div>
                <p className="text-gray-600 dark:text-zinc-400 text-[11px] leading-relaxed">
                  {lang === 'it'
                    ? 'Incolla https://livia-editor.ai.studio nei campi Open/New URL, carica banner 220x140 e icone, e completa i passi finali di salvataggio/invio.'
                    : 'Paste https://livia-editor.ai.studio in Open/New URL fields, upload 220x140 banner & icons, and complete the final save/submit steps.'}
                </p>
              </div>
            </div>

            {/* Quick Copy Section for Production URLs */}
            <div className="p-3.5 bg-white dark:bg-[#121418] rounded-xl border border-gray-200 dark:border-zinc-800 space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="font-bold text-gray-900 dark:text-white text-xs">
                  {lang === 'it' ? 'URL Ufficiali di Produzione per Store Listing & SDK:' : 'Official Production URLs for Store Listing & SDK:'}
                </span>
                <span className="text-[11px] text-blue-600 dark:text-[#8AB4F8] font-mono font-bold">
                  https://livia-editor.ai.studio
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-[11px]">
                <div className="p-2 bg-gray-50 dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800 flex justify-between items-center">
                  <span className="text-gray-500">Homepage / Open URL:</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText('https://livia-editor.ai.studio');
                      setCopiedUrl('hp_url');
                      setTimeout(() => setCopiedUrl(null), 2000);
                    }}
                    className="text-[10px] px-2 py-0.5 bg-blue-600 hover:bg-blue-500 text-white rounded font-sans font-semibold cursor-pointer"
                  >
                    {copiedUrl === 'hp_url' ? (lang === 'it' ? 'Copiato!' : 'Copied!') : (lang === 'it' ? 'Copia' : 'Copy')}
                  </button>
                </div>

                <div className="p-2 bg-gray-50 dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800 flex justify-between items-center">
                  <span className="text-gray-500">Privacy Policy:</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText('https://livia-editor.ai.studio/privacy');
                      setCopiedUrl('priv_url');
                      setTimeout(() => setCopiedUrl(null), 2000);
                    }}
                    className="text-[10px] px-2 py-0.5 bg-blue-600 hover:bg-blue-500 text-white rounded font-sans font-semibold cursor-pointer"
                  >
                    {copiedUrl === 'priv_url' ? (lang === 'it' ? 'Copiato!' : 'Copied!') : (lang === 'it' ? 'Copia' : 'Copy')}
                  </button>
                </div>

                <div className="p-2 bg-gray-50 dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800 flex justify-between items-center">
                  <span className="text-gray-500">Terms of Service:</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText('https://livia-editor.ai.studio/terms');
                      setCopiedUrl('terms_url');
                      setTimeout(() => setCopiedUrl(null), 2000);
                    }}
                    className="text-[10px] px-2 py-0.5 bg-blue-600 hover:bg-blue-500 text-white rounded font-sans font-semibold cursor-pointer"
                  >
                    {copiedUrl === 'terms_url' ? (lang === 'it' ? 'Copiato!' : 'Copied!') : (lang === 'it' ? 'Copia' : 'Copy')}
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-100 dark:border-[#2D2D2D] bg-gray-50 dark:bg-[#0D0F12] flex justify-between items-center">
          <a
            href="https://console.cloud.google.com/apis/credentials"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-[#8AB4F8] hover:underline font-semibold"
          >
            <span>Google Cloud Console Credentials</span>
            <ExternalLink size={12} />
          </a>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 dark:bg-zinc-800 hover:bg-gray-300 dark:hover:bg-zinc-700 text-gray-800 dark:text-white font-semibold rounded-xl text-xs transition-all cursor-pointer"
          >
            {lang === 'it' ? 'Chiudi' : 'Close'}
          </button>
        </div>

      </div>
    </div>
  );
}
