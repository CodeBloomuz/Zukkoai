import React, { useState, useRef, useEffect } from 'react';
import { 
  Mic, 
  Square, 
  FileText, 
  Map as MapIcon, 
  CheckCircle2, 
  BrainCircuit, 
  ChevronRight,
  History,
  Trash2,
  Download,
  Plus
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import Markdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';

import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

// Types
interface User {
  firstName: string;
  lastName: string;
}

interface RoadmapNode {
  label: string;
  children?: RoadmapNode[];
}

interface AnalysisResult {
  transcript: string;
  summary: string;
  roadmap: string;
  roadmapData: RoadmapNode;
  tests: {
    question: string;
    options: string[];
    correctAnswer: number;
  }[];
}

interface Session {
  id: string;
  title: string;
  date: string;
  result: AnalysisResult;
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

import * as d3 from 'd3-hierarchy';
import { linkHorizontal } from 'd3-shape';

// MindMap Component
const MindMap = ({ data }: { data: RoadmapNode }) => {
  const width = 800;
  const height = 400;
  const margin = { top: 20, right: 120, bottom: 20, left: 120 };

  const root = d3.hierarchy(data);
  const treeLayout = d3.tree<RoadmapNode>().size([height - margin.top - margin.bottom, width - margin.left - margin.right]);
  treeLayout(root);

  const linkGenerator = linkHorizontal<any, any>()
    .x(d => d.y)
    .y(d => d.x);

  return (
    <div id="mindmap-container" className="w-full overflow-x-auto bg-white rounded-2xl p-4 border border-gray-100 shadow-inner">
      <svg width={width} height={height} className="mx-auto">
        <g transform={`translate(${margin.left},${margin.top})`}>
          {/* Links */}
          {root.links().map((link, i) => (
            <path
              key={i}
              d={linkGenerator(link) || ""}
              fill="none"
              stroke="#E5E7EB"
              strokeWidth="2"
              className="transition-all duration-500"
            />
          ))}
          
          {/* Nodes */}
          {root.descendants().map((node, i) => (
            <g key={i} transform={`translate(${node.y},${node.x})`}>
              <foreignObject
                x={-80}
                y={-20}
                width={160}
                height={40}
                className="overflow-visible"
              >
                <div 
                  className={cn(
                    "flex items-center justify-center text-center px-3 py-2 rounded-xl text-xs font-bold shadow-sm border transition-all duration-300",
                    node.depth === 0 ? "bg-orange-500 text-white border-orange-600 scale-110" :
                    node.depth === 1 ? "bg-blue-50 text-blue-700 border-blue-200" :
                    "bg-white text-gray-600 border-gray-200"
                  )}
                >
                  {node.data.label}
                </div>
              </foreignObject>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
};

// Quiz Component
const Quiz = ({ tests }: { tests: AnalysisResult['tests'] }) => {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [showResults, setShowResults] = useState<Record<number, boolean>>({});

  const handleSelect = (questionIdx: number, optionIdx: number) => {
    if (showResults[questionIdx]) return;
    setSelectedAnswers(prev => ({ ...prev, [questionIdx]: optionIdx }));
  };

  const checkAnswer = (questionIdx: number) => {
    if (selectedAnswers[questionIdx] === undefined) return;
    setShowResults(prev => ({ ...prev, [questionIdx]: true }));
  };

  const resetQuiz = () => {
    setSelectedAnswers({});
    setShowResults({});
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <button 
          onClick={resetQuiz}
          className="text-sm text-orange-500 hover:text-orange-600 font-semibold flex items-center gap-1"
        >
          <History size={14} />
          Qayta ishlash
        </button>
      </div>
      {tests.map((test, idx) => (
        <div key={idx} className="p-6 rounded-2xl bg-gray-50 border border-gray-100 transition-all">
          <h3 className="font-bold text-lg mb-4 flex gap-3">
            <span className="text-orange-500">{idx + 1}.</span>
            {test.question}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {test.options.map((opt, optIdx) => {
              const isSelected = selectedAnswers[idx] === optIdx;
              const isCorrect = optIdx === test.correctAnswer;
              const revealed = showResults[idx];
              
              return (
                <button 
                  key={optIdx}
                  onClick={() => handleSelect(idx, optIdx)}
                  disabled={revealed}
                  className={cn(
                    "p-4 rounded-xl border transition-all text-sm font-medium text-left flex items-center justify-between group",
                    revealed 
                      ? isCorrect 
                        ? "bg-green-50 border-green-200 text-green-700" 
                        : isSelected 
                          ? "bg-red-50 border-red-200 text-red-700"
                          : "bg-white border-gray-100 text-gray-400"
                      : isSelected
                        ? "bg-orange-50 border-orange-300 text-orange-700 shadow-sm"
                        : "bg-white border-gray-200 text-gray-600 hover:border-orange-200 hover:bg-orange-50/30"
                  )}
                >
                  <span className="flex items-center gap-3">
                    <span className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-[10px] border",
                      isSelected ? "bg-orange-500 text-white border-orange-600" : "bg-gray-50 text-gray-400 border-gray-200"
                    )}>
                      {String.fromCharCode(65 + optIdx)}
                    </span>
                    {opt}
                  </span>
                  {revealed && isCorrect && <CheckCircle2 size={16} className="text-green-500" />}
                </button>
              );
            })}
          </div>
          {!showResults[idx] && selectedAnswers[idx] !== undefined && (
            <button 
              onClick={() => checkAnswer(idx)}
              className="mt-4 text-xs bg-orange-500 text-white px-4 py-2 rounded-lg font-bold hover:bg-orange-600 transition-colors"
            >
              Tekshirish
            </button>
          )}
        </div>
      ))}
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loginForm, setLoginForm] = useState({ firstName: '', lastName: '' });
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load user and sessions from localStorage
  useEffect(() => {
    const savedUser = localStorage.getItem('zukko_user');
    if (savedUser) setUser(JSON.parse(savedUser));
    
    const saved = localStorage.getItem('zukko_sessions');
    if (saved) {
      setSessions(JSON.parse(saved));
    }
  }, []);

  // Save sessions to localStorage
  useEffect(() => {
    localStorage.setItem('zukko_sessions', JSON.stringify(sessions));
  }, [sessions]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginForm.firstName.length < 2 || loginForm.lastName.length < 2) {
      alert("Ism va familiya kamida 2 ta harfdan iborat bo'lishi kerak.");
      return;
    }
    const newUser = { firstName: loginForm.firstName, lastName: loginForm.lastName };
    setUser(newUser);
    localStorage.setItem('zukko_user', JSON.stringify(newUser));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('zukko_user');
  };

  const downloadPDF = async () => {
    if (!activeSession || !user) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

    // Header
    doc.setFontSize(22);
    doc.setTextColor(249, 115, 22); // Orange-500
    doc.text("Zukko AI - Dars Hisoboti", pageWidth / 2, yPos, { align: 'center' });
    
    yPos += 15;
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Foydalanuvchi: ${user.firstName} ${user.lastName}`, 20, yPos);
    doc.text(`Sana: ${activeSession.date}`, pageWidth - 20, yPos, { align: 'right' });
    
    yPos += 10;
    doc.setDrawColor(200);
    doc.line(20, yPos, pageWidth - 20, yPos);
    
    // Summary
    yPos += 15;
    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.text("1. Dars Mazmuni", 20, yPos);
    yPos += 10;
    doc.setFontSize(10);
    const summaryLines = doc.splitTextToSize(activeSession.result.summary.replace(/[#*]/g, ''), pageWidth - 40);
    doc.text(summaryLines, 20, yPos);
    yPos += (summaryLines.length * 5) + 10;

    // Roadmap (Mind Map Image)
    if (yPos > 200) { doc.addPage(); yPos = 20; }
    doc.setFontSize(16);
    doc.text("2. Yo'l Xaritasi (Mind Map)", 20, yPos);
    yPos += 10;

    const mindmapEl = document.getElementById('mindmap-container');
    if (mindmapEl) {
      try {
        const canvas = await html2canvas(mindmapEl, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = pageWidth - 40;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        if (yPos + imgHeight > 280) { doc.addPage(); yPos = 20; }
        doc.addImage(imgData, 'PNG', 20, yPos, imgWidth, imgHeight);
        yPos += imgHeight + 15;
      } catch (err) {
        console.error("Mindmap capture failed", err);
        doc.setFontSize(10);
        doc.text("Mind map rasmga olinmadi.", 20, yPos);
        yPos += 10;
      }
    }

    // Tests
    if (yPos > 250) { doc.addPage(); yPos = 20; }
    doc.setFontSize(16);
    doc.text("3. Test Savollari", 20, yPos);
    yPos += 10;
    doc.setFontSize(10);
    activeSession.result.tests.forEach((test, i) => {
      if (yPos > 270) { doc.addPage(); yPos = 20; }
      doc.setFont(undefined, 'bold');
      doc.text(`${i + 1}. ${test.question}`, 20, yPos);
      yPos += 7;
      doc.setFont(undefined, 'normal');
      test.options.forEach((opt, j) => {
        doc.text(`   ${String.fromCharCode(65 + j)}) ${opt}`, 25, yPos);
        yPos += 5;
      });
      yPos += 5;
    });

    doc.save(`ZukkoAI_${activeSession.title.replace(/\s+/g, '_')}.pdf`);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await analyzeAudio(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Microphone access denied", err);
      alert("Mikrofonga ruxsat berilmadi.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const analyzeAudio = async (blob: Blob) => {
    setIsAnalyzing(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        
        const prompt = `
          Siz "Zukko AI" - o'qituvchilar va talabalar uchun aqlli yordamchisiz. 
          Ushbu audio darsni tahlil qiling va quyidagi formatda JSON javob qaytaring:
          {
            "transcript": "Darsning to'liq matni",
            "summary": "Darsning qisqacha mazmuni (Markdown formatida)",
            "roadmap": "Darsning yo'l xaritasi (Markdown formatida)",
            "roadmapData": {
              "label": "Dars mavzusi",
              "children": [
                {
                  "label": "Asosiy bo'lim 1",
                  "children": [
                    { "label": "Kichik mavzu 1.1" },
                    { "label": "Kichik mavzu 1.2" }
                  ]
                }
              ]
            },
            "tests": [
              {
                "question": "Savol matni",
                "options": ["A variant", "B variant", "C variant", "D variant"],
                "correctAnswer": 0
              }
            ]
          }
          Javob faqat JSON bo'lishi kerak. O'zbek tilida javob bering.
          
          MUHIM: 
          1. Testlar soni darsning davomiyligi va ma'lumotlar ko'pligiga qarab 5 tadan 30 tagacha bo'lsin. 
          2. Mind map (roadmapData) uchun kamida 3 ta asosiy bo'lim va har birida kichik mavzular bo'lsin.
        `;

        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: [
            {
              parts: [
                { text: prompt },
                { inlineData: { mimeType: "audio/webm", data: base64Data } }
              ]
            }
          ],
          config: {
            responseMimeType: "application/json"
          }
        });

        const result = JSON.parse(response.text || "{}") as AnalysisResult;
        const newSession: Session = {
          id: Date.now().toString(),
          title: `Dars: ${new Date().toLocaleDateString()}`,
          date: new Date().toLocaleString(),
          result
        };

        setSessions(prev => [newSession, ...prev]);
        setActiveSession(newSession);
      };
    } catch (err) {
      console.error("Analysis failed", err);
      alert("Tahlil qilishda xatolik yuz berdi.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessions(prev => prev.filter(s => s.id !== id));
    if (activeSession?.id === id) setActiveSession(null);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-orange-500 flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl p-8 shadow-2xl max-w-md w-full space-y-8"
        >
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center text-white mx-auto shadow-lg">
              <BrainCircuit size={40} />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Zukko AI</h1>
            <p className="text-gray-500">Tizimga kirish uchun ism va familiyangizni kiriting</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-700 ml-1">Ism</label>
              <input 
                required
                type="text"
                placeholder="Ismingizni kiriting"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition-all"
                value={loginForm.firstName}
                onChange={e => setLoginForm(prev => ({ ...prev, firstName: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-700 ml-1">Familiya</label>
              <input 
                required
                type="text"
                placeholder="Familiyangizni kiriting"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition-all"
                value={loginForm.lastName}
                onChange={e => setLoginForm(prev => ({ ...prev, lastName: e.target.value }))}
              />
            </div>
            <button 
              type="submit"
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-orange-200 transition-all active:scale-[0.98]"
            >
              Kirish
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans selection:bg-orange-100">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-200">
            <BrainCircuit size={24} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Zukko <span className="text-orange-500">AI</span></h1>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-sm font-bold">{user.firstName} {user.lastName}</span>
            <button onClick={handleLogout} className="text-[10px] text-gray-400 hover:text-red-500 transition-colors">Chiqish</button>
          </div>
          {isRecording ? (
            <div className="flex items-center gap-4 bg-red-50 px-4 py-2 rounded-full border border-red-100">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <span className="font-mono font-medium text-red-600">{formatTime(recordingTime)}</span>
              <button 
                onClick={stopRecording}
                className="p-1 hover:bg-red-100 rounded-full transition-colors text-red-600"
              >
                <Square size={20} fill="currentColor" />
              </button>
            </div>
          ) : (
            <button 
              onClick={startRecording}
              disabled={isAnalyzing}
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white px-6 py-2.5 rounded-full font-semibold transition-all shadow-lg shadow-orange-200 active:scale-95"
            >
              <Mic size={20} />
              Darsni yozish
            </button>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sidebar - History */}
        <aside className="lg:col-span-3 space-y-6">
          <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-4 text-gray-500 font-semibold text-sm uppercase tracking-wider">
              <History size={16} />
              Tarix
            </div>
            <div className="space-y-2 max-h-[calc(100vh-250px)] overflow-y-auto pr-2 custom-scrollbar">
              {sessions.length === 0 && (
                <div className="text-center py-8 text-gray-400 text-sm">
                  Hali darslar yo'q
                </div>
              )}
              {sessions.map(session => (
                <div
                  key={session.id}
                  onClick={() => setActiveSession(session)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      setActiveSession(session);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  className={cn(
                    "w-full text-left p-3 rounded-xl transition-all group relative cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-orange-500",
                    activeSession?.id === session.id 
                      ? "bg-orange-50 border-orange-200 text-orange-900 border" 
                      : "hover:bg-gray-50 border border-transparent"
                  )}
                >
                  <div className="font-semibold truncate pr-6">{session.title}</div>
                  <div className="text-xs opacity-60 mt-1">{session.date}</div>
                  <button 
                    onClick={(e) => deleteSession(session.id, e)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-100 hover:text-red-600 rounded-lg transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Content Area */}
        <section className="lg:col-span-9 space-y-8">
          <AnimatePresence mode="wait">
            {isAnalyzing ? (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white rounded-3xl p-12 border border-gray-200 shadow-sm flex flex-col items-center justify-center text-center space-y-6"
              >
                <div className="relative">
                  <div className="w-20 h-20 border-4 border-orange-100 border-t-orange-500 rounded-full animate-spin" />
                  <BrainCircuit className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-orange-500" size={32} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold mb-2">Dars tahlil qilinmoqda...</h2>
                  <p className="text-gray-500 max-w-md">
                    Sun'iy intellekt darsni eshitib, yo'l xaritasi va testlarni tayyorlamoqda. Bu bir necha soniya vaqt olishi mumkin.
                  </p>
                </div>
              </motion.div>
            ) : activeSession ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-8"
              >
                {/* Summary */}
                <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-4 text-orange-600 font-bold">
                    <FileText size={20} />
                    Dars Mazmuni
                  </div>
                  <div className="prose prose-sm max-w-none text-gray-700">
                    <Markdown>{activeSession.result.summary}</Markdown>
                  </div>
                </div>

                {/* Mind Map Roadmap */}
                <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-6 text-blue-600 font-bold text-xl">
                    <MapIcon size={24} />
                    Darsning Yo'l Xaritasi (Mind Map)
                  </div>
                  {activeSession.result.roadmapData ? (
                    <MindMap data={activeSession.result.roadmapData} />
                  ) : (
                    <div className="prose prose-sm max-w-none text-gray-700">
                      <Markdown>{activeSession.result.roadmap}</Markdown>
                    </div>
                  )}
                </div>

                {/* Tests */}
                <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-2 text-green-600 font-bold text-xl">
                      <CheckCircle2 size={24} />
                      Bilimni Tekshirish Testlari
                    </div>
                    <button 
                      onClick={downloadPDF}
                      className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
                    >
                      <Download size={16} />
                      PDF yuklash
                    </button>
                  </div>
                  
                  <div className="space-y-8">
                    <Quiz tests={activeSession.result.tests} />
                  </div>
                </div>

                {/* Business Model & Future Updates */}
                <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 text-white shadow-xl">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-orange-500 rounded-lg">
                      <BrainCircuit size={24} />
                    </div>
                    <h2 className="text-2xl font-bold">Zukko AI: Biznes Modeli va Kelajak</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <h3 className="text-orange-400 font-bold uppercase tracking-wider text-sm">Hozirgi holat</h3>
                      <p className="text-gray-300 text-sm leading-relaxed">
                        Zukko AI o'qituvchilar va talabalar uchun darslarni avtomatik tahlil qilish va metodik yordam berishga yo'naltirilgan bepul prototip bosqichida.
                      </p>
                    </div>
                    <div className="space-y-4">
                      <h3 className="text-blue-400 font-bold uppercase tracking-wider text-sm">Keyingi yangilanishda</h3>
                      <ul className="space-y-2 text-sm text-gray-300">
                        <li className="flex items-center gap-2">
                          <Plus size={14} className="text-orange-500" />
                          Video darslarni tahlil qilish imkoniyati
                        </li>
                        <li className="flex items-center gap-2">
                          <Plus size={14} className="text-orange-500" />
                          O'quvchilar uchun shaxsiy kabinet va natijalar monitoringi
                        </li>
                        <li className="flex items-center gap-2">
                          <Plus size={14} className="text-orange-500" />
                          Ko'p tilli qo'llab-quvvatlash (Ingliz, Rus tillari)
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Transcript */}
                <details className="group bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <summary className="p-6 cursor-pointer hover:bg-gray-50 transition-colors flex items-center justify-between font-bold text-gray-500">
                    Darsning to'liq transkripti
                    <ChevronRight className="group-open:rotate-90 transition-transform" size={20} />
                  </summary>
                  <div className="p-6 pt-0 text-gray-600 text-sm leading-relaxed border-t border-gray-100">
                    {activeSession.result.transcript}
                  </div>
                </details>
              </motion.div>
            ) : (
              <div className="h-[60vh] flex flex-col items-center justify-center text-center space-y-6">
                <div className="w-24 h-24 bg-orange-50 rounded-full flex items-center justify-center text-orange-500">
                  <Mic size={48} />
                </div>
                <div>
                  <h2 className="text-3xl font-bold mb-2">Xush kelibsiz!</h2>
                  <p className="text-gray-500 max-w-md mx-auto">
                    Darsni yozib olishni boshlash uchun yuqoridagi tugmani bosing. Zukko AI darsingizni tahlil qilib beradi.
                  </p>
                </div>
              </div>
            )}
          </AnimatePresence>
        </section>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #E5E7EB;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #D1D5DB;
        }
      `}</style>
    </div>
  );
}
