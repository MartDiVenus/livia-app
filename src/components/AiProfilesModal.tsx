import React, { useState, useEffect, useRef } from 'react';
import { X, Bot, Plus, Trash2, Edit2, Check, Download, Upload, Save } from 'lucide-react';
import { AiProfile } from '../types.ts';

interface AiProfilesModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'it' | 'en';
  profiles: AiProfile[];
  setProfiles: (profiles: AiProfile[]) => void;
  showToast: (msg: string, type: 'success' | 'info' | 'error') => void;
}

export function AiProfilesModal({ isOpen, onClose, lang, profiles, setProfiles, showToast }: AiProfilesModalProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editInstruction, setEditInstruction] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleAddNew = () => {
    const newProfile: AiProfile = {
      id: Date.now().toString(),
      name: lang === 'it' ? 'Nuovo Profilo' : 'New Profile',
      instruction: lang === 'it' ? 'Istruzioni di sistema qui...' : 'System instructions here...'
    };
    setProfiles([...profiles, newProfile]);
    handleEdit(newProfile);
  };

  const handleEdit = (profile: AiProfile) => {
    setEditingId(profile.id);
    setEditName(profile.name);
    setEditInstruction(profile.instruction);
  };

  const handleSaveEdit = () => {
    if (!editName.trim()) {
      showToast(lang === 'it' ? 'Il nome non può essere vuoto' : 'Name cannot be empty', 'error');
      return;
    }
    setProfiles(profiles.map(p => p.id === editingId ? { ...p, name: editName, instruction: editInstruction } : p));
    setEditingId(null);
    showToast(lang === 'it' ? 'Profilo salvato.' : 'Profile saved.', 'success');
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(lang === 'it' ? 'Sei sicuro di voler eliminare questo profilo?' : 'Are you sure you want to delete this profile?')) {
      setProfiles(profiles.filter(p => p.id !== id));
      if (editingId === id) setEditingId(null);
    }
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(profiles, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = 'livia-ai-profiles.json';
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (Array.isArray(json)) {
          // Add basic validation
          const validProfiles = json.filter(item => item.id && item.name && item.instruction);
          setProfiles([...profiles, ...validProfiles]);
          showToast(lang === 'it' ? `Importati ${validProfiles.length} profili.` : `Imported ${validProfiles.length} profiles.`, 'success');
        }
      } catch (err) {
        showToast(lang === 'it' ? 'Errore durante l\'importazione del file JSON.' : 'Error parsing JSON file.', 'error');
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const handleGenerateTemplate = () => {
    const template = [
      {
        id: "template-1",
        name: "Code Reviewer",
        instruction: "You are a strict code reviewer. Analyze the provided code for bugs, performance issues, and suggest modern TypeScript/React best practices. Respond ONLY with the reviewed code and brief comments."
      },
      {
        id: "template-2",
        name: "Traduttore Tecnico",
        instruction: "Sei un traduttore tecnico esperto. Traduci il testo in italiano formale, mantenendo inalterati i termini tecnici informatici (es. server, database, array)."
      }
    ];
    const dataStr = JSON.stringify(template, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', 'livia-ai-profiles-template.json');
    linkElement.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity font-sans">
      <div className="bg-white dark:bg-[#16181D] w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-gray-200 dark:border-[#2D2D2D] relative">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-[#2D2D2D] bg-gray-50/50 dark:bg-[#0D0F12]">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-zinc-100 flex items-center gap-2">
            <Bot className="text-purple-500" size={24} />
            {lang === 'it' ? 'Profili AI (System Instructions)' : 'AI Profiles (System Instructions)'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-zinc-800 text-gray-500 dark:text-zinc-400 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col md:flex-row gap-4 min-h-0">
          
          {/* List Sidebar */}
          <div className="w-full md:w-1/3 flex flex-col gap-2 border-r border-transparent md:border-gray-100 md:dark:border-[#2D2D2D] pr-0 md:pr-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-sm text-gray-700 dark:text-zinc-300">
                {lang === 'it' ? 'I tuoi Profili' : 'Your Profiles'}
              </span>
              <button
                onClick={handleAddNew}
                className="p-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors cursor-pointer"
                title={lang === 'it' ? 'Nuovo Profilo' : 'New Profile'}
              >
                <Plus size={16} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-2">
              {profiles.length === 0 ? (
                <div className="text-xs text-gray-500 dark:text-zinc-500 text-center py-4 italic">
                  {lang === 'it' ? 'Nessun profilo trovato.' : 'No profiles found.'}
                </div>
              ) : (
                profiles.map(p => (
                  <div
                    key={p.id}
                    onClick={() => handleEdit(p)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                      editingId === p.id 
                        ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-300 font-bold'
                        : 'bg-white dark:bg-[#1C1E24] border-gray-100 dark:border-[#2D2D2D] text-gray-700 dark:text-zinc-400 hover:border-purple-300 dark:hover:border-purple-700'
                    }`}
                  >
                    <span className="truncate text-xs">{p.name}</span>
                    <button
                      onClick={(e) => handleDelete(p.id, e)}
                      className="p-1 text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 flex flex-col gap-2">
              <div className="flex gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 py-2 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Upload size={14} />
                  {lang === 'it' ? 'Importa' : 'Import'}
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImport}
                  accept=".json"
                  className="hidden"
                />
                <button
                  onClick={handleExport}
                  className="flex-1 py-2 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Download size={14} />
                  {lang === 'it' ? 'Esporta' : 'Export'}
                </button>
              </div>
              <button
                onClick={handleGenerateTemplate}
                className="w-full py-2 border border-dashed border-gray-300 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800/50 text-gray-500 dark:text-zinc-400 text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                {lang === 'it' ? 'Scarica Template Esempio' : 'Download Sample Template'}
              </button>
            </div>
          </div>

          {/* Editor Area */}
          <div className="w-full md:w-2/3 flex flex-col min-h-[300px]">
            {editingId ? (
              <div className="flex flex-col h-full bg-gray-50 dark:bg-[#0D0F12] rounded-xl border border-gray-200 dark:border-[#2D2D2D] overflow-hidden">
                <div className="p-3 border-b border-gray-200 dark:border-[#2D2D2D] bg-white dark:bg-[#16181D]">
                  <label className="block text-[10px] font-bold text-gray-500 dark:text-zinc-500 uppercase mb-1">
                    {lang === 'it' ? 'Nome Profilo' : 'Profile Name'}
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-transparent text-sm font-bold text-gray-800 dark:text-zinc-200 outline-none placeholder-gray-300 dark:placeholder-zinc-600"
                    placeholder={lang === 'it' ? 'Es. Code Reviewer' : 'E.g. Code Reviewer'}
                  />
                </div>
                <div className="p-3 flex-1 flex flex-col">
                  <label className="block text-[10px] font-bold text-gray-500 dark:text-zinc-500 uppercase mb-1">
                    {lang === 'it' ? 'Istruzioni (System Prompt)' : 'Instructions (System Prompt)'}
                  </label>
                  <textarea
                    value={editInstruction}
                    onChange={(e) => setEditInstruction(e.target.value)}
                    className="w-full flex-1 bg-transparent text-xs text-gray-700 dark:text-zinc-300 outline-none resize-none placeholder-gray-300 dark:placeholder-zinc-600 font-mono"
                    placeholder={lang === 'it' ? 'Comportati come un esperto di...' : 'Act as an expert in...'}
                  />
                </div>
                <div className="p-3 border-t border-gray-200 dark:border-[#2D2D2D] bg-white dark:bg-[#16181D] flex justify-end">
                  <button
                    onClick={handleSaveEdit}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Save size={14} />
                    {lang === 'it' ? 'Salva Modifiche' : 'Save Changes'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-zinc-600 bg-gray-50 dark:bg-[#0D0F12] rounded-xl border border-gray-200 dark:border-[#2D2D2D] border-dashed">
                <Bot size={48} className="mb-4 opacity-50" />
                <p className="text-sm font-medium">
                  {lang === 'it' ? 'Seleziona o crea un profilo per iniziare.' : 'Select or create a profile to begin.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
