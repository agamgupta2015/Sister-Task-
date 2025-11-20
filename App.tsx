import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Check, 
  Trash2, 
  BarChart2, 
  List, 
  Sparkles, 
  X,
  Settings,
  Copy,
  ArrowDownCircle,
  Share2,
  RefreshCw,
  Save
} from 'lucide-react';
import { Task, Priority, SISTERS, SisterName } from './types';
import Dashboard from './components/Dashboard';
import { parseSmartInput, getMotivationalMessage } from './services/geminiService';

// --- Helper: Robust Safe ID Generator ---
// Uses a counter and timestamp to ensure uniqueness even if crypto is unavailable or during fast loops
let idCounter = 0;
const generateId = () => {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 8);
  idCounter = (idCounter + 1) % 10000;
  
  // Try native UUID if available and secure
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch (e) {
      // Fallback if insecure context
    }
  }
  return `${timestamp}-${randomPart}-${idCounter}`;
};

// --- Helper Components ---

const Avatar = ({ name, size = 'md', active = false, onClick }: { name: string; size?: 'sm' | 'md' | 'lg'; active?: boolean; onClick?: () => void }) => {
  const colors: Record<string, string> = {
    Anna: 'bg-pink-400',
    Bella: 'bg-violet-400',
    Chloe: 'bg-emerald-400',
  };
  
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-10 h-10 text-base',
    lg: 'w-14 h-14 text-xl',
  };

  return (
    <button 
      onClick={onClick}
      disabled={!onClick}
      className={`
        ${sizeClasses[size]} 
        ${colors[name] || 'bg-gray-400'} 
        rounded-full flex items-center justify-center text-white font-bold shadow-sm
        ${active ? 'ring-4 ring-offset-2 ring-indigo-400 scale-110' : 'hover:opacity-90'}
        transition-all duration-200
      `}
    >
      {name[0]}
    </button>
  );
};

const PriorityBadge = ({ priority }: { priority: Priority }) => {
  const styles = {
    [Priority.LOW]: 'bg-slate-100 text-slate-600 border-slate-200',
    [Priority.MEDIUM]: 'bg-amber-100 text-amber-700 border-amber-200',
    [Priority.HIGH]: 'bg-rose-100 text-rose-700 border-rose-200',
  };

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${styles[priority]}`}>
      {priority}
    </span>
  );
};

// --- Main App Component ---

const App: React.FC = () => {
  // --- State ---
  const [tasks, setTasks] = useState<Task[]>(() => {
    try {
      const saved = localStorage.getItem('sisterSyncTasks');
      if (!saved) return [];
      
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return [];

      // Data migration: Ensure all tasks have IDs and valid properties
      return parsed.map(t => ({
        ...t,
        id: t.id || generateId(),
        createdAt: t.createdAt || Date.now()
      }));
    } catch (e) {
      console.error("Failed to load tasks from storage", e);
      return [];
    }
  });
  
  const [activeTab, setActiveTab] = useState<'list' | 'dashboard'>('list');
  const [filterUser, setFilterUser] = useState<SisterName | 'All'>('All');
  
  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [addMode, setAddMode] = useState<'manual' | 'magic'>('manual');
  
  // Smart Add State
  const [smartInput, setSmartInput] = useState('');
  const [isProcessingAI, setIsProcessingAI] = useState(false);

  // Manual Add State
  const [manualTitle, setManualTitle] = useState('');
  const [manualAssignee, setManualAssignee] = useState<SisterName>('Anna');
  const [manualPriority, setManualPriority] = useState<Priority>(Priority.MEDIUM);
  
  // Sync State
  const [importCode, setImportCode] = useState('');
  const [syncMessage, setSyncMessage] = useState<{text: string, type: 'success' | 'error'} | null>(null);

  const [dailyQuote, setDailyQuote] = useState<string>("");
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');

  // --- Effects ---
  useEffect(() => {
    const saveTasks = () => {
      try {
        setSaveStatus('saving');
        localStorage.setItem('sisterSyncTasks', JSON.stringify(tasks));
        // Small delay to show "saved" state if we had a UI indicator
        setTimeout(() => setSaveStatus('saved'), 500);
      } catch (e) {
        console.error("Failed to save tasks to localStorage", e);
        setSaveStatus('error');
        alert("Warning: Could not save tasks. Your browser storage might be full or disabled.");
      }
    };

    // Debounce saving slightly to prevent thrashing
    const timeoutId = setTimeout(saveTasks, 500);
    return () => clearTimeout(timeoutId);
  }, [tasks]);

  useEffect(() => {
    const fetchQuote = async () => {
        try {
          const pending = tasks.filter(t => !t.isCompleted).length;
          const completed = tasks.filter(t => t.isCompleted).length;
          const quote = await getMotivationalMessage(pending, completed);
          setDailyQuote(quote);
        } catch (e) {
          console.error("Failed to fetch quote");
        }
    };
    fetchQuote();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  // --- Handlers ---

  const handleSmartAdd = async () => {
    if (!smartInput.trim()) return;
    setIsProcessingAI(true);
    
    try {
      const result = await parseSmartInput(smartInput);

      if (result && result.tasks && result.tasks.length > 0) {
        const newTasks = result.tasks.map(t => ({
          id: generateId(), // Uses the robust ID generator
          title: t.title,
          description: t.description,
          assignee: t.assignee,
          priority: t.priority,
          isCompleted: false,
          createdAt: Date.now()
        }));
        setTasks(prev => [...newTasks, ...prev]);
        setSmartInput('');
        setIsAddModalOpen(false);
      } else {
        alert("I couldn't understand that. Please try again or use Manual Add.");
      }
    } catch (e) {
      console.error("Smart add failed", e);
      alert("Something went wrong with the magic. Please use Manual Add.");
    } finally {
      setIsProcessingAI(false);
    }
  };

  const handleManualAdd = () => {
    if (!manualTitle.trim()) return;

    const newTask: Task = {
      id: generateId(),
      title: manualTitle.trim(),
      assignee: manualAssignee,
      priority: manualPriority,
      isCompleted: false,
      createdAt: Date.now()
    };

    setTasks(prev => [newTask, ...prev]);
    setManualTitle('');
    setManualAssignee('Anna'); 
    setManualPriority(Priority.MEDIUM);
    setIsAddModalOpen(false);
  };

  const toggleTask = (taskId: string) => {
    setTasks(prev => prev.map(t => 
      t.id === taskId ? { ...t, isCompleted: !t.isCompleted } : t
    ));
  };

  const deleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
  };

  const openAddModal = () => {
    setAddMode('manual');
    setIsAddModalOpen(true);
  };

  // Sync Handlers
  const getExportCode = () => {
    try {
      // Simple base64 encoding of the JSON string to make it copy-paste friendly
      return btoa(encodeURIComponent(JSON.stringify(tasks)));
    } catch (e) {
      return "Error generating code";
    }
  };

  const copyExportCode = () => {
    const code = getExportCode();
    navigator.clipboard.writeText(code).then(() => {
      setSyncMessage({ text: "Code copied! Send this to your sisters.", type: 'success' });
      setTimeout(() => setSyncMessage(null), 3000);
    });
  };

  const handleImport = () => {
    if (!importCode.trim()) return;
    try {
      const jsonStr = decodeURIComponent(atob(importCode.trim()));
      const importedData = JSON.parse(jsonStr);
      
      if (Array.isArray(importedData)) {
        // Validate and Fix data
        const validTasks = importedData.map((t: any) => ({
           ...t,
           id: t.id || generateId(), // Ensure ID exists
           isCompleted: !!t.isCompleted // Ensure boolean
        }));

        setTasks(validTasks);
        setSyncMessage({ text: "Tasks updated successfully!", type: 'success' });
        setImportCode('');
        setTimeout(() => {
          setSyncMessage(null);
          setIsSettingsOpen(false);
        }, 1500);
      } else {
        throw new Error("Not a list");
      }
    } catch (e) {
      setSyncMessage({ text: "Invalid code. Please check and try again.", type: 'error' });
    }
  };

  // --- Computed ---
  const filteredTasks = tasks.filter(t => {
    if (filterUser !== 'All' && t.assignee !== filterUser) return false;
    return true;
  });

  const pendingCount = tasks.filter(t => !t.isCompleted).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-24 md:pb-0">
      
      {/* Header */}
      <header className="bg-white sticky top-0 z-30 shadow-sm border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg shadow-indigo-200 shadow-sm">
              <Check className="w-5 h-5 text-white" strokeWidth={3} />
            </div>
            <h1 className="text-xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 tracking-tight">
              SisterSync
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
             {/* Desktop Tabs */}
             <div className="hidden md:flex bg-slate-100 p-1 rounded-lg">
                <button 
                  onClick={() => setActiveTab('list')}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'list' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  List
                </button>
                <button 
                  onClick={() => setActiveTab('dashboard')}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'dashboard' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Dashboard
                </button>
             </div>
             
             <button
               onClick={() => setIsSettingsOpen(true)}
               className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all relative"
               title="Sync Settings"
             >
               <Settings className="w-5 h-5" />
               {saveStatus === 'error' && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />}
             </button>

             <button 
              onClick={openAddModal}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-full shadow-md shadow-indigo-200 transition-all active:scale-95"
             >
               <Plus className="w-5 h-5" />
               <span className="hidden sm:inline text-sm font-bold">Add Task</span>
             </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6 md:py-8">
        
        {/* Motivational Quote Banner */}
        {dailyQuote && (
           <div className="mb-8 bg-gradient-to-r from-indigo-50 via-purple-50 to-indigo-50 border border-indigo-100 p-4 rounded-2xl flex items-start gap-3 shadow-sm">
              <Sparkles className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
              <p className="text-indigo-900 text-sm font-medium italic leading-relaxed">
                "{dailyQuote}"
              </p>
           </div>
        )}

        {activeTab === 'list' ? (
          <div className="animate-fade-in">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">My Tasks</h2>
                <p className="text-slate-500 text-sm mt-1">
                  <span className="font-bold text-indigo-600">{pendingCount}</span> pending tasks remaining.
                </p>
              </div>
              
              <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm overflow-x-auto max-w-full no-scrollbar">
                <button 
                  onClick={() => setFilterUser('All')}
                  className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors whitespace-nowrap ${filterUser === 'All' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                  All
                </button>
                {SISTERS.map(sister => (
                  <button
                    key={sister}
                    onClick={() => setFilterUser(sister)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${filterUser === sister ? 'bg-white text-slate-800 ring-1 ring-slate-200 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                  >
                    <div className={`w-2 h-2 rounded-full ${sister === 'Anna' ? 'bg-pink-400' : sister === 'Bella' ? 'bg-violet-400' : 'bg-emerald-400'}`} />
                    {sister}
                  </button>
                ))}
              </div>
            </div>

            {/* Task List */}
            <div className="space-y-3">
              {filteredTasks.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-300">
                  <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <List className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="text-slate-600 font-medium">No tasks found</h3>
                  <p className="text-slate-400 text-sm mt-1">Time to relax or add something new!</p>
                </div>
              ) : (
                filteredTasks.map(task => (
                  <div 
                    key={task.id}
                    className={`group relative bg-white rounded-xl p-4 border transition-all duration-200 hover:shadow-md ${task.isCompleted ? 'border-slate-100 opacity-60' : 'border-slate-200'}`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Checkbox */}
                      <button
                        onClick={() => toggleTask(task.id)}
                        className={`mt-1 flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${task.isCompleted ? 'bg-green-500 border-green-500' : 'border-slate-300 hover:border-indigo-400'}`}
                      >
                        {task.isCompleted && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                      </button>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className={`font-bold text-slate-800 truncate pr-2 text-lg ${task.isCompleted ? 'line-through text-slate-400' : ''}`}>
                            {task.title}
                          </h3>
                          <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => deleteTask(task.id)}
                              className="text-slate-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-full transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        
                        {task.description && (
                           <p className={`text-sm text-slate-500 mt-1 line-clamp-2 ${task.isCompleted ? 'line-through' : ''}`}>
                             {task.description}
                           </p>
                        )}

                        {/* Meta */}
                        <div className="flex items-center gap-3 mt-3">
                           <div className="flex items-center gap-2 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100">
                              <div className={`w-2 h-2 rounded-full ${task.assignee === 'Anna' ? 'bg-pink-400' : task.assignee === 'Bella' ? 'bg-violet-400' : 'bg-emerald-400'}`} />
                              <span className="text-xs font-bold text-slate-600">{task.assignee}</span>
                           </div>
                           <PriorityBadge priority={task.priority} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <Dashboard tasks={tasks} />
        )}
      </main>

      {/* Mobile Tab Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-3 z-40 flex justify-around pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <button 
          onClick={() => setActiveTab('list')}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'list' ? 'text-indigo-600' : 'text-slate-400'}`}
        >
          <List className="w-6 h-6" />
          <span className="text-[10px] font-bold">Tasks</span>
        </button>
        <div className="w-12" /> {/* Spacer for FAB */}
        <button 
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'dashboard' ? 'text-indigo-600' : 'text-slate-400'}`}
        >
          <BarChart2 className="w-6 h-6" />
          <span className="text-[10px] font-bold">Stats</span>
        </button>
      </div>

      {/* Mobile FAB for Add */}
      <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <button 
          onClick={openAddModal}
          className="w-14 h-14 bg-indigo-600 rounded-full shadow-xl shadow-indigo-300 flex items-center justify-center text-white active:scale-95 transition-transform ring-4 ring-white"
        >
          <Plus className="w-7 h-7" strokeWidth={3} />
        </button>
      </div>

      {/* Add Task Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all animate-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="px-6 pt-6 pb-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-800">Add New Task</h3>
              <button 
                onClick={() => setIsAddModalOpen(false)} 
                className="bg-slate-100 hover:bg-slate-200 text-slate-500 p-2 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab Switcher */}
            <div className="px-6 mb-6">
              <div className="flex p-1 bg-slate-100 rounded-xl">
                <button
                  onClick={() => setAddMode('manual')}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${addMode === 'manual' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Manual Add
                </button>
                <button
                  onClick={() => setAddMode('magic')}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${addMode === 'magic' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <Sparkles className="w-4 h-4" />
                  Magic Add
                </button>
              </div>
            </div>
            
            {/* Manual Content */}
            {addMode === 'manual' && (
              <div className="px-6 pb-6 space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">What needs to be done?</label>
                  <input
                    type="text"
                    value={manualTitle}
                    onChange={(e) => setManualTitle(e.target.value)}
                    placeholder="e.g. Buy groceries for dinner"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-slate-800 placeholder:text-slate-400"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-3">Assign to</label>
                  <div className="flex gap-4 justify-center">
                    {SISTERS.map(sister => (
                      <div key={sister} className="flex flex-col items-center gap-1">
                        <Avatar 
                          name={sister} 
                          active={manualAssignee === sister}
                          onClick={() => setManualAssignee(sister)}
                        />
                        <span className={`text-xs font-semibold ${manualAssignee === sister ? 'text-indigo-600' : 'text-slate-400'}`}>{sister}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-3">Priority</label>
                  <div className="flex gap-2">
                    {Object.values(Priority).map(p => (
                      <button
                        key={p}
                        onClick={() => setManualPriority(p)}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-all ${
                          manualPriority === p 
                            ? p === Priority.HIGH 
                              ? 'bg-rose-100 border-rose-200 text-rose-700' 
                              : p === Priority.MEDIUM
                                ? 'bg-amber-100 border-amber-200 text-amber-700'
                                : 'bg-green-100 border-green-200 text-green-700'
                            : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleManualAdd}
                  disabled={!manualTitle.trim()}
                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all active:scale-95 flex items-center justify-center gap-2 mt-2"
                >
                  <Plus className="w-5 h-5" />
                  Add Task
                </button>
              </div>
            )}

            {/* Magic Content */}
            {addMode === 'magic' && (
              <div className="px-6 pb-6">
                <div className="bg-indigo-50 p-4 rounded-xl mb-4 border border-indigo-100">
                  <p className="text-indigo-800 text-sm">
                    Describe tasks naturally. I'll detect who it's for and how urgent it is!
                  </p>
                </div>
                <textarea
                  value={smartInput}
                  onChange={(e) => setSmartInput(e.target.value)}
                  placeholder="e.g., Anna needs to call mom ASAP and Bella should water the plants..."
                  className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none outline-none transition-all text-slate-700 placeholder:text-slate-400 mb-4"
                  autoFocus
                />
                <button
                  onClick={handleSmartAdd}
                  disabled={!smartInput.trim() || isProcessingAI}
                  className={`w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 transition-all ${isProcessingAI ? 'opacity-70 cursor-not-allowed' : 'hover:opacity-95 active:scale-95'}`}
                >
                  {isProcessingAI ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Thinking...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Magic Create
                    </>
                  )}
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Settings/Sync Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all animate-in zoom-in-95 duration-200">
             <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="bg-indigo-100 p-2 rounded-full">
                  <Share2 className="w-5 h-5 text-indigo-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-800">Sync Tasks</h3>
              </div>
              <button 
                onClick={() => setIsSettingsOpen(false)} 
                className="bg-slate-100 hover:bg-slate-200 text-slate-500 p-2 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-8">
              {syncMessage && (
                <div className={`p-3 rounded-xl text-sm font-bold text-center ${syncMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {syncMessage.text}
                </div>
              )}

              {/* Export Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-indigo-700 font-bold">
                   <ArrowDownCircle className="w-5 h-5" />
                   <h4>Send tasks to sisters</h4>
                </div>
                <p className="text-sm text-slate-500">Copy this code and message it to your sisters so they can load your latest list.</p>
                
                <div className="flex gap-2">
                  <input 
                    readOnly 
                    value={getExportCode()} 
                    className="flex-1 bg-slate-100 text-slate-500 text-xs p-3 rounded-xl font-mono truncate border border-slate-200 outline-none"
                  />
                  <button 
                    onClick={copyExportCode}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-xl transition-colors shadow-md"
                    title="Copy Code"
                  >
                    <Copy className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="h-px bg-slate-100 w-full" />

              {/* Import Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-emerald-600 font-bold">
                   <ArrowDownCircle className="w-5 h-5 rotate-180" />
                   <h4>Load tasks from sister</h4>
                </div>
                <p className="text-sm text-slate-500">Paste the code your sister sent you here to update your list.</p>
                
                <textarea 
                  value={importCode}
                  onChange={(e) => setImportCode(e.target.value)}
                  placeholder="Paste code here..."
                  className="w-full h-24 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-mono focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                />
                <button 
                  onClick={handleImport}
                  disabled={!importCode.trim()}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-xl font-bold shadow-lg shadow-emerald-100 transition-all flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Update My List
                </button>
              </div>

               {/* Debug/Reset Section */}
              <div className="pt-4 border-t border-slate-100 text-center">
                <p className="text-xs text-slate-400 mb-2">
                   Status: {saveStatus === 'saved' ? 'All changes saved' : saveStatus === 'saving' ? 'Saving...' : 'Storage Error'}
                </p>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default App;