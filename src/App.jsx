import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import {
 getAuth,
 signInAnonymously,
 onAuthStateChanged,
 signInWithCustomToken
} from 'firebase/auth';
import {
 getFirestore,
 doc,
 setDoc,
 getDoc,
 onSnapshot,
 updateDoc,
 deleteDoc,
 arrayUnion
} from 'firebase/firestore';
import {
 Users,
 CheckCircle,
 XCircle,
 HelpCircle,
 Play,
 RotateCcw,
 Sparkles,
 ThumbsUp,
 Plus,
 Trash2,
 UserPlus,
 LogOut,
 Mic,
 ArrowRight,
 QrCode,
 Smartphone,
 Wifi,
 Loader,
 Lock,
 MessageCircle,
 Send,
 X,
 Minimize2,
 Wand2,
 ScrollText,
 Settings,
 SkipForward,
 Eye,
 Edit2,
 Power
} from 'lucide-react';


// --- Firebase Configuration (StackBlitz Version) ---
const firebaseConfig = {
 apiKey: "AIzaSyD3kuxRRLA8bes7I17k4cUduzQS_kCzuZc",
 authDomain: "sum-n-bout-me.firebaseapp.com",
 projectId: "sum-n-bout-me",
 storageBucket: "sum-n-bout-me.firebasestorage.app",
 messagingSenderId: "185682262562",
 appId: "1:185682262562:web:0d89e8c54b1a28a936687b",
};


const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'my-party-game-v1';
// Optional: Add your Gemini API Key here if you deploy it!
const GEMINI_API_KEY = "";


// --- Constants ---
const ROOM_TIMEOUT_MS = 4 * 60 * 60 * 1000; // 4 Hours


const FUNNY_PLACEHOLDERS = [
 "I once ate a whole pizza in 4 minutes...",
 "I have a irrational fear of balloons...",
 "I've never seen a Star Wars movie...",
 "I secretly love Nickelback...",
 "I can touch my nose with my tongue...",
 "I used to be a baby model...",
 "I have an extra toe...",
 "I sleep with my eyes open...",
 "I've never eaten a taco...",
 "I was an extra in a famous movie...",
 "I collect rubber ducks...",
 "I can juggle 3 apples...",
 "I still watch cartoons every Saturday...",
 "I'm afraid of butterflies...",
 "I put ketchup on my mac and cheese...",
 "I've never broken a bone...",
 "I can recite the alphabet backwards...",
 "I won a hot dog eating contest..."
];


const SECRET_SUGGESTIONS = [
 "I've never seen Star Wars.",
 "I eat pizza with a fork.",
 "I'm afraid of butterflies.",
 "I still sleep with a stuffed animal.",
 "I've never broken a bone.",
 "I can juggle 3 apples.",
 "I once won a hot dog eating contest.",
 "I put ketchup on my mac and cheese.",
 "I believe in ghosts.",
 "I've never been on a plane.",
 "I can touch my nose with my tongue.",
 "I used to be a baby model.",
 "I have an extra toe.",
 "I sleep with my eyes open.",
 "I've never eaten a taco.",
 "I was an extra in a famous movie.",
 "I collect rubber ducks.",
 "I can recite the alphabet backwards.",
 "I hate chocolate.",
 "I've never learned to ride a bike.",
 "I'm a secret Nickelback fan.",
 "I talk to my plants.",
 "I've never seen snow.",
 "I can wiggle my ears.",
 "I'm double jointed in my thumbs.",
 "I've never drunk coffee.",
 "I'm afraid of the dark.",
 "I can solve a Rubik's cube.",
 "I've never successfully whistled.",
 "I put milk in before cereal.",
 "I have a phobia of balloons.",
 "I pretended to be sick to skip a wedding.",
 "I accidentally stole something from a store once.",
 "I've never watched Game of Thrones.",
 "I don't know how to swim.",
 "I've never changed a tire.",
 "I talk to my pet like it's a human.",
 "I can make a clover with my tongue.",
 "I've never been to a concert."
];


const FUNNY_GAME_OVER_LINES = [
 "What happens in Shelters stays in Shelters.",
 "I'm judging you all silently.",
 "Don't worry, I've already forgotten everything.",
 "This conversation never happened.",
 "You guys are weird, I love it.",
 "Now go delete your browser history.",
 "Remember: snitches get stitches."
];


const WAITING_MESSAGES = [
 "Waiting for {name} to use their brain...",
 "{name} is sweating right now...",
 "Is {name} asleep?",
 "{name} is consulting the spirits...",
 "Calculating... {name} is confused.",
 "Don't hurt yourself thinking, {name}...",
 "{name} is having a main character moment...",
 "Loading {name}'s intuition...",
 "Silence! {name} is thinking.",
 "I bet {name} picks the wrong one.",
 "{name} is buffering...",
 "Any day now, {name}...",
 "I hope {name} didn't drop their phone in the toilet."
];


// --- AI Helpers ---
const generateAICommentary = async (type, context = {}) => {
 if (!GEMINI_API_KEY) return getRandomFallback(type);
 let prompt = "";
 const style = "You are a witty, Gen Z/Millennial party game host. Use slang like 'tea', 'shook', 'main character energy'. Be brief (max 15 words).";
 switch (type) {
   case 'start': prompt = `${style} The game "Sum'n 'bout Me" just started. Hype it up.`; break;
   case 'correct': prompt = `${style} ${context.guesser} correctly guessed the secret "${context.secret}" belonged to ${context.owner}. React with shock/validation.`; break;
   case 'incorrect': prompt = `${style} ${context.guesser} incorrectly guessed that ${context.target} wrote "${context.secret}". Roast them gently.`; break;
   case 'next': prompt = `${style} Moving to the next secret. Keep momentum.`; break;
   case 'intro': prompt = `${style} Introduce yourself as Sum'n Bot and ask everyone 'who dis?'.`; break;
   case 'guessing': prompt = `${style} Someone is thinking hard. Make a suspenseful comment.`; break;
   case 'replay': prompt = `${style} They want to play again. Hype them up!`; break;
   default: return getRandomFallback(type);
 }
 try {
   const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_API_KEY}`, {
     method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
   });
   const data = await response.json();
   return data.candidates?.[0]?.content?.parts?.[0]?.text || getRandomFallback(type);
 } catch (e) { return getRandomFallback(type); }
};


const generateAISecretSuggestion = async () => {
 if (!GEMINI_API_KEY) return SECRET_SUGGESTIONS[Math.floor(Math.random() * SECRET_SUGGESTIONS.length)];
 const prompt = "Give me one funny, specific, safe-for-work 'Never have I ever' style fact or secret. Examples: 'I've never eaten a taco', 'I own 50 rubber ducks'. Just the fact, no quotes.";
 try {
   const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_API_KEY}`, {
     method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
   });
   const data = await response.json();
   return data.candidates?.[0]?.content?.parts?.[0]?.text || SECRET_SUGGESTIONS[Math.floor(Math.random() * SECRET_SUGGESTIONS.length)];
 } catch (e) { return SECRET_SUGGESTIONS[Math.floor(Math.random() * SECRET_SUGGESTIONS.length)]; }
};


const BOT_SCRIPTS = {
 intro: ["Greetings, who dis?", "I've arrived. Spill the tea.", "Welcome to the lobby. Don't be shy.", "Sum'n Bot in the house. Who are you?"],
 guessing: ["Hmm... I wonder...", "This is a tough one.", "I'm sensing confusion.", "Don't overthink it...", "Tick tock..."],
 replay: ["Yeess. Let's Gooo!!", "Round 2? Say less.", "Back for more? I love it.", "Let's run it back!"],
 start: ["The tea is hot today. Let's play.", "Secrets locked. Hope you're ready.", "Oh, this lore is about to go crazy.", "Finally, some juicy content."],
 correct: ["Wait, actually?!", "Okay, that explains so much.", "The math is mathing.", "Exposed!", "That is wild.", "I am shook.", "Main character energy."],
 incorrect: ["Big oof. Try again.", "Not quite the vibe.", "Imagine if that was true?", "Plot twist: It wasn't them.", "Respectfully, no.", "Back to the bowl."],
 next: ["Who's next on the hot seat?", "Keep the secrets coming.", "Next one, let's go.", "I need more tea. Next!", "Moving on..."]
};


const getRandomFallback = (type) => {
 const lines = BOT_SCRIPTS[type] || ["Interesting..."];
 return lines[Math.floor(Math.random() * lines.length)];
};


// --- COMPONENTS ---


const Confetti = () => {
 const [particles, setParticles] = useState([]);
 useEffect(() => {
   const colors = ['#ef4444', '#22c55e', '#3b82f6', '#eab308', '#a855f7', '#ec4899'];
   const newParticles = [];
   for(let i=0; i<50; i++) {
     newParticles.push({ id: i, x: Math.random() * 100, color: colors[Math.floor(Math.random() * colors.length)], delay: Math.random() * 0.5, duration: 2 + Math.random() * 2, rotation: Math.random() * 360 });
   }
   setParticles(newParticles);
 }, []);
 return (
   <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
     <style>{`@keyframes fall { 0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; } 100% { transform: translateY(110vh) rotate(720deg); opacity: 0; } }`}</style>
     {particles.map(p => (<div key={p.id} className="absolute w-3 h-3 rounded-sm" style={{ left: `${p.x}%`, top: `-20px`, backgroundColor: p.color, transform: `rotate(${p.rotation}deg)`, animation: `fall ${p.duration}s linear ${p.delay}s forwards` }} />))}
   </div>
 );
};


const CyclingWaitingMessage = ({ name }) => {
 const [index, setIndex] = useState(0);
 useEffect(() => {
   const interval = setInterval(() => { setIndex((prev) => (prev + 1) % WAITING_MESSAGES.length); }, 6000);
   return () => clearInterval(interval);
 }, []);
 return (
   <div className="w-full bg-orange-50 text-orange-400 font-bold py-4 rounded-xl text-center animate-pulse border border-orange-100 text-sm">
       {WAITING_MESSAGES[index].replace("{name}", name || "Player")}
   </div>
 );
};


function ChatPanel({ messages, onSendMessage, currentPlayerName, onClose, isMobile }) {
 const [text, setText] = useState('');
 const scrollRef = useRef(null);
 useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages]);


 return (
   <div className="flex flex-col h-full bg-white">
     <div className="p-3 border-b bg-orange-50 flex justify-between items-center" style={{ paddingTop: isMobile ? 'max(1rem, env(safe-area-inset-top))' : '0.75rem'}}>
       <h3 className="font-bold text-orange-800 flex items-center gap-2 text-sm uppercase tracking-wider"><MessageCircle size={16}/> Live Chat</h3>
       {isMobile && <button onClick={onClose}><Minimize2 size={20} className="text-orange-400"/></button>}
     </div>
     <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-white">
       {messages.length === 0 && <div className="text-center text-gray-400 mt-10 text-sm italic">No tea spilt yet. Say hi! ☕️</div>}
       {messages.map((msg, idx) => {
           const isBot = msg.sender === 'Sum\'n Bot 🤖';
           const isMe = msg.sender === currentPlayerName;
           return (
             <div key={idx} className={`flex flex-col ${isBot ? 'items-center my-2' : isMe ? 'items-end' : 'items-start'}`}>
               {!isBot && !isMe && <span className="text-[10px] text-gray-400 ml-1 mb-0.5 uppercase font-bold">{msg.sender}</span>}
               <div className={`px-3 py-2 rounded-2xl max-w-[85%] text-sm shadow-sm ${
                 isBot ? 'bg-gray-100 text-gray-600 text-xs font-bold italic py-1 px-3 border border-gray-200' :
                 isMe ? 'bg-orange-500 text-white rounded-tr-none' : 'bg-gray-100 text-gray-800 rounded-tl-none border border-gray-100'
               }`}>
                 {msg.text}
               </div>
             </div>
           );
       })}
     </div>
     <div className="p-3 border-t bg-gray-50" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
         <div className="flex gap-2">
           <input className="flex-1 bg-white border border-gray-300 rounded-full px-4 py-2 text-base outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition" placeholder="Say sum'n..." value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && text.trim()) { onSendMessage(text); setText(''); }}} />
           <button onClick={() => { if (text.trim()) { onSendMessage(text); setText(''); }}} className="bg-orange-500 text-white p-2 rounded-full hover:bg-orange-600 shadow-md active:scale-95 transition"><Send size={18} /></button>
         </div>
     </div>
   </div>
 );
}


// --- ADMIN COMPONENTS ---
function AdminModal({ isOpen, onClose, players, onKick, onSkip, onEndGame, currentPhase }) {
   if (!isOpen) return null;
   return (
       <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
           <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl space-y-6">
               <div className="flex justify-between items-center border-b pb-4">
                   <h3 className="text-xl font-black text-red-600 flex items-center gap-2"><Settings/> Host Controls</h3>
                   <button onClick={onClose}><X className="text-gray-400"/></button>
               </div>
              
               <div className="space-y-3">
                   <p className="text-xs font-bold text-gray-500 uppercase">Game Actions</p>
                  
                   {currentPhase === 'playing' && (
                       <button onClick={() => { onSkip(); onClose(); }} className="w-full bg-orange-100 text-orange-700 font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-orange-200">
                           <SkipForward size={20}/> Skip Current Turn
                       </button>
                   )}
                  
                   <button onClick={() => { if(confirm("End game and return to lobby?")) { onEndGame(); onClose(); } }} className="w-full bg-red-100 text-red-700 font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-red-200">
                       <Power size={20}/> End Game
                   </button>
               </div>


               <div className="space-y-2 max-h-60 overflow-y-auto">
                   <p className="text-xs font-bold text-gray-500 uppercase">Manage Players (Kick)</p>
                   {players.map(p => (
                       <div key={p.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                           <span className="font-bold text-gray-700">{p.name}</span>
                           <button onClick={() => { if(confirm(`Kick ${p.name}?`)) onKick(p.id); }} className="text-red-500 hover:bg-red-50 p-2 rounded-full"><Trash2 size={18}/></button>
                       </div>
                   ))}
               </div>
              
               <button onClick={onClose} className="w-full bg-gray-200 text-gray-600 font-bold py-3 rounded-xl">Close</button>
           </div>
       </div>
   );
}


const AdminButton = ({ onClick, isHost }) => {
   if (!isHost) return null;
   return (
       <button onClick={onClick} className="absolute top-4 left-4 bg-gray-900/10 backdrop-blur-md p-2 rounded-full text-gray-800 z-50 hover:bg-white/40 transition-all shadow-sm border border-black/5" title="Host Settings">
           <Settings size={24} />
       </button>
   );
};


// --- LOCAL PASS-N-PLAY COMPONENT ---
function LocalGame({ onBack }) {
   const [phase, setPhase] = useState('lobby');
   const [players, setPlayers] = useState([]);
   const [inputValue, setInputValue] = useState('');
   const [currentPlayerInputIndex, setCurrentPlayerInputIndex] = useState(0);
   const [secretInput, setSecretInput] = useState('');
   const [deck, setDeck] = useState([]);
   const [currentCardIndex, setCurrentCardIndex] = useState(0);
   const [turnIndex, setTurnIndex] = useState(0);
   const [turnState, setTurnState] = useState('guessing');
   const [selectedGuessedPlayer, setSelectedGuessedPlayer] = useState(null);
   const [lastResult, setLastResult] = useState({ guesser: '', target: '' });
   const [aiLoading, setAiLoading] = useState(false);


   const randomPlaceholder = useMemo(() => FUNNY_PLACEHOLDERS[Math.floor(Math.random() * FUNNY_PLACEHOLDERS.length)], [currentPlayerInputIndex]);
   const randomGameOverLine = useMemo(() => FUNNY_GAME_OVER_LINES[Math.floor(Math.random() * FUNNY_GAME_OVER_LINES.length)], [phase]);


   const addPlayer = () => { if (inputValue.trim()) { setPlayers([...players, { id: Date.now(), name: inputValue.trim(), fact: '' }]); setInputValue(''); }};
   const removePlayer = (id) => setPlayers(players.filter(p => p.id !== id));
   const startInputPhase = () => { if (players.length > 0) { setPhase('input'); setCurrentPlayerInputIndex(0); }};
  
   const getAISuggestion = async () => {
       setAiLoading(true);
       const suggestion = await generateAISecretSuggestion();
       setSecretInput(suggestion);
       setAiLoading(false);
   };


   const submitSecret = () => {
       if (!secretInput.trim()) return;
       const newPlayers = [...players]; newPlayers[currentPlayerInputIndex].fact = secretInput.trim(); setPlayers(newPlayers); setSecretInput('');
       if (currentPlayerInputIndex < players.length - 1) { setPhase('transition'); } else { setPhase('pre_game'); }
   };
   const nextInputPlayer = () => { setCurrentPlayerInputIndex(currentPlayerInputIndex + 1); setPhase('input'); };
   const startGame = () => {
       const d = players.map(p => ({ text: p.fact, owner: p.name, ownerId: p.id }));
       for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; }
       setDeck(d); setPhase('playing'); setCurrentCardIndex(0); setTurnIndex(0); setTurnState('guessing');
   };
   const handleGuess = () => {
       if (!selectedGuessedPlayer) return;
       const card = deck[currentCardIndex];
       const guesser = players[turnIndex % players.length];
       setLastResult({ guesser: guesser.name, target: selectedGuessedPlayer.name });
       setTurnState(selectedGuessedPlayer.id === card.ownerId ? 'correct' : 'incorrect');
       setSelectedGuessedPlayer(null);
   };
   const nextTurn = () => {
       const nextIdx = turnIndex + 1; setTurnIndex(nextIdx);
       if (turnState === 'correct') {
           const nextCard = currentCardIndex + 1;
           if (nextCard >= deck.length) setPhase('summary'); else { setCurrentCardIndex(nextCard); setTurnState('guessing'); }
       } else {
           const newDeck = [...deck]; const card = newDeck.splice(currentCardIndex, 1)[0]; newDeck.push(card); setDeck(newDeck); setTurnState('guessing');
       }
   };


   // --- Local Renders ---
   if (phase === 'lobby') {
       return (
       <div className="fixed inset-0 w-full h-full overflow-y-auto bg-gradient-to-br from-orange-400 to-rose-400 font-sans">
           <div className="min-h-full flex flex-col justify-center p-4" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
           <div className="w-full max-w-md mx-auto bg-white rounded-2xl shadow-xl p-8">
               <div className="text-center mb-6">
               <div className="inline-block p-3 bg-orange-100 rounded-full mb-2"><Smartphone size={32} className="text-orange-600"/></div>
               <h1 className="text-2xl font-black text-gray-800">Pass-n-Play Mode</h1>
               <p className="text-gray-500 text-sm">One device. Pass it around.</p>
               </div>
               <div className="space-y-4">
               <div>
                   <label className="block text-sm font-bold text-gray-700 mb-1">Add Players</label>
                   <div className="flex gap-2">
                   <input className="flex-1 px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none bg-white text-gray-900 text-base" value={inputValue} onChange={e=>setInputValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addPlayer()} placeholder="Player Name"/>
                   <button onClick={addPlayer} className="bg-orange-100 text-orange-700 p-3 rounded-lg hover:bg-orange-200"><Plus size={24}/></button>
                   </div>
               </div>
               <div className="max-h-48 overflow-y-auto space-y-2">
                   {players.map((p) => (
                   <div key={p.id} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg">
                       <span className="font-bold text-gray-800">{p.name}</span>
                       <button onClick={() => removePlayer(p.id)} className="text-red-400"><Trash2 size={16}/></button>
                   </div>
                   ))}
                   {players.length === 0 && <p className="text-center text-gray-400 text-sm italic">Add at least 1 player</p>}
               </div>
               <div className="flex flex-col gap-3 mt-4">
                   <button onClick={startInputPhase} disabled={players.length < 1} className="w-full bg-orange-500 text-white font-bold py-3 rounded-xl shadow-lg disabled:opacity-50 hover:bg-orange-600">Start Game</button>
                   <button onClick={onBack} className="w-full text-gray-500 font-bold py-3">Back to Home</button>
               </div>
               </div>
           </div>
           </div>
       </div>
       );
   }


   if (phase === 'transition') return <div className="fixed inset-0 w-full h-full overflow-y-auto bg-stone-900 text-center"><div className="min-h-full flex flex-col justify-center p-4"><div className="w-full max-w-md mx-auto space-y-8"><h2 className="text-3xl font-black text-white">Stop! Don't Look!</h2><p className="text-stone-300 text-xl">Pass the device to <br/><strong className="text-4xl text-orange-400 block mt-4">{players[currentPlayerInputIndex+1].name}</strong></p><button onClick={nextInputPlayer} className="w-full bg-white text-stone-900 font-bold py-4 rounded-xl shadow-lg mt-8">I am {players[currentPlayerInputIndex+1].name}</button></div></div></div>;
  
   if (phase === 'pre_game') return <div className="fixed inset-0 w-full h-full overflow-y-auto bg-gradient-to-br from-orange-400 to-rose-500 text-center"><div className="min-h-full flex flex-col justify-center p-4"><div className="w-full max-w-md mx-auto bg-white rounded-2xl shadow-2xl p-8 space-y-6 animate-in zoom-in"><div className="flex justify-center"><div className="bg-orange-100 p-4 rounded-full"><Lock size={48} className="text-orange-600"/></div></div><div><h2 className="text-3xl font-black text-gray-800">Secrets Locked!</h2><p className="text-gray-500 mt-2">The bowl is mixed. The secrets are safe. Are you ready to guess?</p></div><button onClick={startGame} className="w-full bg-orange-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-orange-700 transition transform active:scale-95">Let's Play! <Play size={20} className="inline ml-2"/></button></div></div></div>;
  
   if (phase === 'input') return <div className="fixed inset-0 w-full h-full overflow-y-auto bg-orange-50"><div className="min-h-full flex flex-col justify-center p-4" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}><div className="w-full max-w-md mx-auto space-y-6"><div className="bg-white p-6 rounded-2xl shadow-sm text-center"><h2 className="text-xl font-bold text-gray-500 uppercase tracking-widest mb-1">Player {currentPlayerInputIndex+1} / {players.length}</h2><h1 className="text-3xl font-black text-orange-600">{players[currentPlayerInputIndex].name}</h1></div><div className="bg-white p-6 rounded-2xl shadow-lg flex flex-col gap-4"><label className="block font-bold text-gray-700">Write a secret about yourself...</label><textarea className="w-full p-4 rounded-xl border border-gray-200 focus:border-orange-500 bg-white text-gray-900 outline-none h-32 resize-none text-base" placeholder={randomPlaceholder} value={secretInput} onChange={e=>setSecretInput(e.target.value)}/><div className="flex justify-end"><button onClick={getAISuggestion} className="text-xs font-bold text-orange-600 flex items-center gap-1 hover:text-orange-800 transition">{aiLoading ? "Thinking..." : <><Wand2 size={12}/> ✨ Help me write</>}</button></div><button onClick={submitSecret} className="w-full bg-orange-600 text-white font-bold py-3 rounded-xl shadow-md">Lock it in 🔒</button></div></div></div></div>;
  
   if (phase === 'summary') {
       const sortedPlayers = [...players].sort((a, b) => a.name.localeCompare(b.name));
       return (
           <div className="fixed inset-0 w-full h-full overflow-y-auto bg-stone-100">
               <div className="min-h-full flex flex-col justify-center p-4" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
                   <div className="w-full max-w-md mx-auto bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col h-[80vh]">
                       <div className="p-6 bg-orange-50 border-b border-orange-100 text-center">
                           <h2 className="text-2xl font-black text-gray-800 flex items-center justify-center gap-2"><ScrollText className="text-orange-600"/> The Receipts</h2>
                           <p className="text-sm text-orange-600">Here is who wrote what:</p>
                       </div>
                       <div className="flex-1 overflow-y-auto p-4 space-y-3">
                           {sortedPlayers.map(p => (
                               <div key={p.id} className="p-4 bg-stone-50 rounded-xl border border-stone-200">
                                   <p className="font-black text-gray-800 text-lg mb-1">{p.name}</p>
                                   <p className="text-gray-600 italic">"{p.fact}"</p>
                               </div>
                           ))}
                       </div>
                       <div className="p-4 border-t border-gray-100">
                           <button onClick={() => setPhase('finished')} className="w-full bg-stone-900 text-white font-bold py-4 rounded-xl shadow-lg">Wrap It Up</button>
                       </div>
                   </div>
               </div>
           </div>
       );
   }
  
   if (phase === 'finished') return <div className="fixed inset-0 w-full h-full overflow-y-auto bg-stone-800"><div className="min-h-full flex flex-col justify-center p-4" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}><div className="w-full max-w-md mx-auto bg-white rounded-2xl shadow-2xl p-8 text-center space-y-6"><h1 className="text-3xl font-black text-gray-800">That's Sum'n 'bout E'erbody!</h1><p className="text-gray-500 italic">"{randomGameOverLine}"</p><div className="grid grid-cols-2 gap-4"><div className="bg-orange-50 p-4 rounded-xl"><span className="block text-3xl font-bold text-orange-600">{players.length}</span><span className="text-xs text-gray-500 uppercase font-bold">Friends</span></div><div className="bg-rose-50 p-4 rounded-xl"><span className="block text-3xl font-bold text-rose-600">{deck.length}</span><span className="text-xs text-gray-500 uppercase font-bold">Secrets</span></div></div><div className="space-y-3"><button onClick={()=>setPhase('lobby')} className="w-full bg-orange-600 text-white font-bold py-3 rounded-xl">Play Again</button><button onClick={onBack} className="w-full text-gray-400 font-bold py-3">Back to Home</button></div></div></div></div>;
  
   const card = deck[currentCardIndex];
   // Safety check
   if (!card) return <div className="flex h-full items-center justify-center"><Loader className="animate-spin text-orange-500"/></div>;


   const currP = players[turnIndex%players.length];
   return <div className={`fixed inset-0 w-full h-full overflow-y-auto ${turnState==='correct'?'bg-green-600':turnState==='incorrect'?'bg-red-600':'bg-stone-900'} transition-colors duration-500`}><div className="min-h-full flex flex-col justify-center p-4" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}><div className="w-full max-w-md mx-auto z-10 space-y-6"><div className="text-center mb-6"><span className="bg-black/30 text-white px-3 py-1 rounded-full text-sm">Secret {currentCardIndex+1} of {deck.length}</span></div><div className="bg-white rounded-3xl shadow-2xl overflow-hidden min-h-[500px] flex flex-col"><div className="p-4 bg-orange-50 border-b flex items-center justify-center gap-2"><span className="text-xl font-black text-orange-700">{currP.name} is guessing</span></div><div className="p-8 flex-1 flex items-center justify-center bg-gradient-to-b from-white to-gray-50 border-b">
   <style>{`@keyframes flipIn { 0% { transform: rotateY(90deg); opacity: 0; } 100% { transform: rotateY(0deg); opacity: 1; } }`}</style>
   <p key={currentCardIndex} className="text-2xl md:text-3xl font-black text-center text-gray-800 leading-tight" style={{ animation: 'flipIn 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}>"{card.text}"</p></div><div className="flex-none p-6 bg-gray-50">{turnState==='guessing' ? <div className="flex flex-col gap-4"><p className="text-center text-gray-500 font-bold uppercase text-xs tracking-wider">This Sum'n 'bout who?</p><div className="grid grid-cols-2 gap-2">{players.map(p=><button key={p.id} onClick={()=>setSelectedGuessedPlayer(p)} className={`p-3 rounded-xl font-bold text-sm border transition-all ${selectedGuessedPlayer?.id===p.id?'bg-orange-600 text-white transform scale-105 shadow-md':'bg-white text-gray-700 hover:bg-orange-50 border border-gray-200'}`}>{p.name}{selectedGuessedPlayer?.id===p.id&&<CheckCircle size={18}/>}</button>)}</div><button onClick={handleGuess} disabled={!selectedGuessedPlayer} className="w-full bg-stone-900 text-white font-bold py-4 rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition">Confirm Guess</button></div> : <div className="flex flex-col items-center justify-center text-center animate-in zoom-in duration-300">{turnState==='correct' && <Confetti/>}<div className={`mb-4 p-4 rounded-full ${turnState==='correct'?'bg-green-100':'bg-red-100'}`}>{turnState==='correct'?<ThumbsUp className="w-12 h-12 text-green-600"/>:<XCircle className="w-12 h-12 text-red-600"/>}</div><h2 className={`text-3xl font-black ${turnState==='correct'?'text-green-600':'text-red-600'} mb-4`}>{turnState==='correct'?`That's Sum'n 'bout ${card.owner}!`:`That's not Sum'n 'bout ${lastResult.target}!`}</h2>{turnState==='correct' && <div className="bg-orange-50 p-4 rounded-xl border-2 border-orange-100 mb-6 w-full"><div className="flex items-center justify-center gap-2 text-orange-600 font-bold mb-1"><Mic size={20}/> Story Time</div><p className="text-sm text-orange-800">Spill the beans! Tell the group the story.</p></div>}<button onClick={nextTurn} className="w-full bg-stone-900 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-stone-800 transform active:scale-95 transition">{turnState==='correct'?'Next Secret':'Try Another Secret'}</button></div>}</div></div></div></div></div>;
}


// --- ONLINE FIREBASE COMPONENT ---
function OnlineGame({ onSwitchToLocal }) {
 const [user, setUser] = useState(null);
 const [roomCode, setRoomCode] = useState('SHELTERS');
 const [showOfflineOption, setShowOfflineOption] = useState(false);
 const [confirmStart, setConfirmStart] = useState(false);
 const [isAdminOpen, setIsAdminOpen] = useState(false);


 const [inputName, setInputName] = useState('');
 const [showQR, setShowQR] = useState(false);
  const [joined, setJoined] = useState(false);
 const [gameState, setGameState] = useState(null);
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState('');
 const [selectedGuessedPlayer, setSelectedGuessedPlayer] = useState(null);
  const [secretInput, setSecretInput] = useState('');


 // Chat State
 const [isChatOpen, setIsChatOpen] = useState(false);
 const [hasUnread, setHasUnread] = useState(false);
 const lastMsgCount = useRef(0);
  // AI state
 const [aiLoading, setAiLoading] = useState(false);


 const randomPlaceholder = useMemo(() => {
   const randomIndex = Math.floor(Math.random() * FUNNY_PLACEHOLDERS.length);
   return FUNNY_PLACEHOLDERS[randomIndex];
 }, [gameState?.phase]);


 const randomGameOverLine = useMemo(() => {
   const randomIndex = Math.floor(Math.random() * FUNNY_GAME_OVER_LINES.length);
   return FUNNY_GAME_OVER_LINES[randomIndex];
 }, [gameState?.phase]);


 // Load local storage on mount
 useEffect(() => {
   const savedName = localStorage.getItem('sumn_player_name');
   const savedRoom = localStorage.getItem('sumn_room_code');
   if (savedName) setInputName(savedName);
   if (savedRoom) setRoomCode(savedRoom);
  
   // Check for room param from QR code
   const params = new URLSearchParams(window.location.search);
   const roomParam = params.get('room');
   if (roomParam) setRoomCode(roomParam);


   const timer = setTimeout(() => setShowOfflineOption(true), 3000);
   const initAuth = async () => {
     try {
       if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
         await signInWithCustomToken(auth, __initial_auth_token);
       } else {
         await signInAnonymously(auth);
       }
     } catch (err) {
       console.error("Auth error:", err);
       setError("Could not authenticate.");
       setShowOfflineOption(true);
     }
   };
   initAuth();
   const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
   return () => {
     unsubscribe();
     clearTimeout(timer);
   };
 }, []);


 useEffect(() => {
   if (!user || !joined || !roomCode) return;
   const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'sumn_rooms', roomCode.toUpperCase());
   const unsubscribe = onSnapshot(roomRef, (snapshot) => {
     if (snapshot.exists()) {
       const data = snapshot.data();
       setGameState(data);
      
       const msgs = data.messages || [];
       if (msgs.length > lastMsgCount.current) {
          if (!isChatOpen) setHasUnread(true);
          lastMsgCount.current = msgs.length;
       }
     } else {
       setGameState(null);
       setJoined(false); setError("Room closed.");
     }
   }, (err) => {
     console.error("Snapshot error:", err);
     setError("Connection lost.");
   });
   return () => unsubscribe();
 }, [user, joined, roomCode, isChatOpen]);


 useEffect(() => { if (isChatOpen) setHasUnread(false); }, [isChatOpen]);


 // ... (Actions like botSpeak, handleSendMessage, handleJoin etc.) ...
 const botSpeak = async (type, context = {}) => {
     const text = await generateAICommentary(type, context);
     const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'sumn_rooms', roomCode.toUpperCase());
     await updateDoc(roomRef, { messages: arrayUnion({ sender: "Sum'n Bot 🤖", text: text, timestamp: Date.now() }) });
 };


 const handleSendMessage = async (text) => {
     const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'sumn_rooms', roomCode.toUpperCase());
     const myName = gameState?.players?.find(p => p.id === user.uid)?.name || "Unknown";
     if (myName) { await updateDoc(roomRef, { messages: arrayUnion({ sender: myName, text: text, timestamp: Date.now() }) }); }
 };


 const handleJoin = async () => {
   if (!inputName.trim() || !roomCode.trim()) { setError("Name and Room Code required."); return; }
   setLoading(true);
   const code = roomCode.toUpperCase();
   localStorage.setItem('sumn_player_name', inputName.trim());
   localStorage.setItem('sumn_room_code', code);
   const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'sumn_rooms', code);
   try {
     const snap = await getDoc(roomRef);
     const newPlayer = { id: user.uid, name: inputName.trim(), fact: '', ready: false };
     if (!snap.exists()) {
       await setDoc(roomRef, { players: [newPlayer], phase: 'lobby', deck: [], messages: [], currentCardIndex: 0, turnState: 'guessing', lastGuessedName: '', turnIndex: 0, guesserName: '', hostId: user.uid, createdAt: Date.now() });
     } else {
       const data = snap.data();
       if (data.createdAt && (Date.now() - data.createdAt > ROOM_TIMEOUT_MS)) {
           await setDoc(roomRef, { players: [newPlayer], phase: 'lobby', deck: [], messages: [], currentCardIndex: 0, turnState: 'guessing', lastGuessedName: '', turnIndex: 0, guesserName: '', hostId: user.uid, createdAt: Date.now() });
       } else {
           let updatedPlayers = [...data.players];
           const existingIndex = updatedPlayers.findIndex(p => p.id === user.uid);
          
           if (existingIndex >= 0) {
                updatedPlayers[existingIndex].name = inputName.trim();
                let newHostId = data.hostId;
                // Self-healing host assignment
                if (!updatedPlayers.find(p => p.id === data.hostId)) { newHostId = user.uid; }
                await updateDoc(roomRef, { players: updatedPlayers, hostId: newHostId });
           } else {
                if (data.phase === 'lobby') {
                   updatedPlayers.push(newPlayer);
                   let newHostId = data.hostId;
                   if (!updatedPlayers.find(p => p.id === data.hostId)) { newHostId = user.uid; }
                   await updateDoc(roomRef, { players: updatedPlayers, hostId: newHostId });
                }
           }
       }
     }
     setJoined(true); setError('');
   } catch (err) { console.error(err); setError("Join failed."); }
   setLoading(false);
 };
  // Define other handlers...
 const handleLeave = async () => { setJoined(false); setGameState(null); setError(''); };
 const handleKickPlayer = async (pid) => { const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'sumn_rooms', roomCode.toUpperCase()); const updated = gameState.players.filter(p=>p.id!==pid); await updateDoc(roomRef, {players:updated}); };
 const handleSkipTurn = async () => { const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'sumn_rooms', roomCode.toUpperCase()); const nextT = ((gameState.turnIndex||0)+1)%gameState.players.length; await updateDoc(roomRef, {turnIndex:nextT, turnState:'guessing'}); await botSpeak('next'); };
 const handleEndGame = async () => {
     const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'sumn_rooms', roomCode.toUpperCase());
     const resetPlayers = gameState.players.map(p => ({ ...p, fact: '', ready: false }));
     await updateDoc(roomRef, { phase: 'lobby', players: resetPlayers, deck: [], currentCardIndex: 0, turnState: 'guessing', turnIndex: 0, guesserName: '' });
 };
 const submitFact = async (val) => { if(!gameState) return; const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'sumn_rooms', roomCode.toUpperCase()); const updated = gameState.players.map(p => p.id === user.uid ? { ...p, fact: val, ready: true } : p); await updateDoc(roomRef, { players: updated }); };
 const updateFact = async () => { if(!gameState) return; const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'sumn_rooms', roomCode.toUpperCase()); const updated = gameState.players.map(p => p.id === user.uid ? { ...p, ready: false } : p); await updateDoc(roomRef, { players: updated }); };
  const startGame = async () => { const valid = gameState.players.filter(p => p.fact && p.fact.trim().length > 0); if(valid.length<1) return; const deck = valid.map(p => ({ text: p.fact, owner: p.name, ownerId: p.id })); for(let i=deck.length-1; i>0; i--){const j=Math.floor(Math.random()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]];} const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'sumn_rooms', roomCode.toUpperCase()); await botSpeak('start'); await updateDoc(roomRef, { phase: 'playing', deck, currentCardIndex: 0, turnState: 'guessing', turnIndex: 0, guesserName: '', lastGuessedName: '' }); };
 const handleGuess = async () => { if (!selectedGuessedPlayer || !gameState) return; const card = gameState.deck[gameState.currentCardIndex]; const correct = selectedGuessedPlayer.id === card.ownerId; const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'sumn_rooms', roomCode.toUpperCase()); const turnIdx = (gameState.turnIndex||0)%gameState.players.length; const guesser = gameState.players[turnIdx]; await botSpeak(correct?'correct':'incorrect', {guesser:guesser?.name, target:selectedGuessedPlayer.name, owner:card.owner, secret:card.text}); await updateDoc(roomRef, {turnState:correct?'correct':'incorrect', lastGuessedName:selectedGuessedPlayer.name, guesserName:guesser?.name}); setSelectedGuessedPlayer(null); };
 const handleNextAfterResult = async () => { const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'sumn_rooms', roomCode.toUpperCase()); const nextT = ((gameState.turnIndex||0)+1)%gameState.players.length; await botSpeak('next'); if(gameState.turnState==='correct'){const nextC = gameState.currentCardIndex+1; if(nextC>=gameState.deck.length) await updateDoc(roomRef,{phase:'summary'}); else await updateDoc(roomRef,{currentCardIndex:nextC, turnState:'guessing', turnIndex:nextT, lastGuessedName:'', guesserName:''});} else {const newDeck=[...gameState.deck]; const card=newDeck.splice(gameState.currentCardIndex,1)[0]; newDeck.push(card); await updateDoc(roomRef,{deck:newDeck, turnState:'guessing', turnIndex:nextT, lastGuessedName:'', guesserName:''});} };
 const resetGame = async () => { const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'sumn_rooms', roomCode.toUpperCase()); const reset = gameState.players.map(p => ({ ...p, fact: '', ready: false })); await botSpeak('replay'); await updateDoc(roomRef, { phase: 'lobby', players: reset, deck: [], currentCardIndex: 0, turnState: 'guessing', turnIndex: 0, guesserName: '' }); };


 // --- RENDER FUNCTIONS ---
 const renderJoinScreen = () => (
   <div className="flex flex-col justify-center h-full p-4">
     <div className="w-full max-w-md mx-auto bg-white rounded-2xl shadow-xl p-8">
       <div className="flex justify-center mb-4"><Sparkles className="w-12 h-12 text-orange-500" /></div>
       <h1 className="text-3xl font-black text-center text-gray-800 mb-2">Sum'n 'bout Me</h1>
       <p className="text-center text-gray-500 mb-6">Online Party Mode</p>
       <div className="space-y-4">
         <div><label className="block text-sm font-bold text-gray-700 mb-1">Your Name</label><input type="text" value={inputName} onChange={(e) => setInputName(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-gray-300 outline-none bg-white text-gray-900 text-base" placeholder="Enter your name"/></div>
         <div><label className="block text-sm font-bold text-gray-700 mb-1">Room Code</label><input type="text" value={roomCode} onChange={(e) => setRoomCode(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-gray-300 outline-none uppercase tracking-widest bg-white text-gray-900 text-base" placeholder="Enter Room Code"/></div>
         {error && <p className="text-red-500 text-sm text-center">{typeof error==='string'?error:'Error'}</p>}
         <button onClick={handleJoin} disabled={loading || !inputName || !roomCode} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-lg shadow-lg transition active:scale-95 disabled:opacity-50">{loading ? "Joining..." : "Join Party"}</button>
         <button onClick={onSwitchToLocal} className="w-full text-gray-400 font-bold text-sm py-2 hover:text-gray-600 flex items-center justify-center gap-2"><Smartphone size={16}/> Switch to Pass-n-Play Mode</button>
       </div>
     </div>
   </div>
 );


 const renderLobby = () => {
   const players = gameState?.players || [];
   return (
   <div className="flex flex-col justify-center h-full p-4">
     <div className="w-full max-w-md mx-auto space-y-6">
       <div className="bg-white rounded-xl shadow-sm p-6 text-center border-b-4 border-orange-200">
           <h2 className="text-xl font-bold text-gray-800">Room: {roomCode.toUpperCase()}</h2>
           <div className="flex justify-center items-center gap-2 mt-2"><button onClick={() => setShowQR(!showQR)} className="text-xs flex items-center gap-1 bg-orange-50 text-orange-600 px-3 py-1 rounded-full hover:bg-orange-100 transition"><QrCode size={14} /> {showQR ? "Hide" : "Show QR"}</button></div>
           {showQR && <div className="mt-4 flex justify-center"><img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(window.location.href + '?room=' + roomCode)}`} alt="QR" className="w-32 h-32 border-2 border-gray-100 rounded-xl"/></div>}
       </div>
       <div className="bg-white rounded-xl shadow-sm overflow-hidden">
           <div className="p-4 bg-gray-100 border-b flex justify-between items-center"><span className="font-bold text-gray-700 flex items-center gap-2"><Users size={18}/> Players ({players.length})</span></div>
           <ul className="divide-y max-h-[40vh] overflow-y-auto">
               {players.map(p => (<li key={p.id} className="p-4 flex items-center justify-between"><span className="font-medium text-gray-800">{p.name} {gameState.hostId === p.id && <span className="text-[10px] bg-yellow-100 text-yellow-600 px-1 rounded border border-yellow-200 ml-1">HOST</span>}</span>{p.id === user.uid && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">You</span>}</li>))}
           </ul>
       </div>
       <div className="space-y-3">
           {!confirmStart ? <button onClick={() => setConfirmStart(true)} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2">Start Sum'n <Play size={20} /></button>
           : <div className="flex gap-2"><button onClick={async () => { const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'sumn_rooms', roomCode.toUpperCase()); if (gameState?.messages?.length === 0) await botSpeak('intro'); await updateDoc(roomRef, { phase: 'input' }); }} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl shadow-lg">Confirm Start</button><button onClick={() => setConfirmStart(false)} className="w-1/3 bg-gray-200 text-gray-600 font-bold py-4 rounded-xl">Wait</button></div>}
           <button onClick={handleLeave} className="w-full font-bold py-3 rounded-xl border flex items-center justify-center gap-2 bg-white text-gray-500 border-gray-200 hover:bg-gray-50">{gameState?.hostId === user.uid ? <><Trash2 size={18} /> Close Room</> : <><LogOut size={18} /> Leave Room</>}</button>
       </div>
     </div>
   </div>
 );
 }


 const renderInput = () => {
   const myPlayer = gameState.players.find(p => p.id === user.uid);
   if (!myPlayer) return <div className="flex flex-col justify-center h-full p-4"><div className="w-full max-w-md mx-auto bg-white rounded-2xl shadow-xl p-8 text-center space-y-6"><div className="flex justify-center"><div className="bg-orange-100 p-3 rounded-full"><Eye size={32} className="text-orange-500"/></div></div><h2 className="text-2xl font-black text-gray-800">Game in Progress</h2><p className="text-gray-600">You joined late, so you are in <span className="font-bold text-orange-600">Spectator Mode</span>.</p><button onClick={handleLeave} className="w-full bg-gray-100 text-gray-600 font-bold py-3 rounded-xl">Leave Room</button></div></div>;
   const completedCount = gameState.players.filter(p => p.ready).length;
   const totalCount = gameState.players.length;
   const readyPlayers = gameState.players.filter(p => p.ready);
   const waitingPlayers = gameState.players.filter(p => !p.ready);


   return (
     <div className="flex flex-col justify-center h-full p-4">
       <div className="w-full max-w-md mx-auto flex flex-col space-y-6">
           <div className="bg-white p-6 rounded-2xl shadow-sm text-center"><h2 className="text-2xl font-black text-gray-800 mb-2">Write Sum'n!</h2><p className="text-gray-600">Write a secret about yourself.</p></div>
           <div className={`p-6 rounded-2xl shadow-md border-2 transition-all ${myPlayer.ready ? 'bg-green-50 border-green-200' : 'bg-white border-orange-100'}`}>
               {!myPlayer.ready ? (
                   <div className="flex flex-col gap-3">
                       <textarea className="w-full p-3 rounded-lg border border-gray-200 focus:border-orange-500 outline-none resize-none bg-white text-gray-900 text-base" placeholder={randomPlaceholder} rows={3} id="factInput" value={secretInput} onChange={e=>setSecretInput(e.target.value)}/>
                       <div className="flex justify-end"><button onClick={async()=>{setAiLoading(true);const s=await generateAISecretSuggestion();setSecretInput(s);setAiLoading(false);}} className="text-xs font-bold text-orange-600 flex items-center gap-1 hover:text-orange-800 transition animate-pulse">{aiLoading ? "Thinking..." : <><Wand2 size={12}/> ✨ Help me write</>}</button></div>
                       <button onClick={() => { if(secretInput.trim()) submitFact(secretInput); }} className="w-full bg-orange-500 text-white font-bold py-2 rounded-lg">Submit Secret</button>
                   </div>
               ) : (
                   <div className="text-center space-y-2">
                       <p className="text-green-700 italic font-bold">Secret locked in.</p>
                       <p className="text-gray-500 italic text-sm">(Secret hidden 🙈)</p>
                       <button onClick={() => { setSecretInput(myPlayer.fact); updateFact(); }} className="text-orange-600 font-bold text-sm hover:underline flex items-center justify-center gap-1"><Edit2 size={14}/> Edit Secret</button>
                   </div>
               )}
           </div>
           <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
               <div className="flex justify-between text-sm font-bold text-gray-500"><span>Group Progress</span><span>{completedCount}/{totalCount} Ready</span></div>
               <div className="w-full bg-gray-200 rounded-full h-3"><div className="bg-green-500 h-3 rounded-full transition-all duration-500" style={{ width: `${(completedCount / totalCount) * 100}%` }}/></div>
               <div className="grid grid-cols-2 gap-4 text-xs mt-2">
                   <div><p className="font-bold text-green-600 mb-1">✅ Locked In</p><ul className="text-gray-500 space-y-1">{readyPlayers.map(p => <li key={p.id}>{p.name} {gameState.hostId === p.id && "(Host)"}</li>)}</ul></div>
                   <div><p className="font-bold text-orange-500 mb-1">⏳ Waiting For</p><ul className="text-gray-500 space-y-1">{waitingPlayers.map(p => <li key={p.id}>{p.name} {gameState.hostId === p.id && "(Host)"}</li>)}</ul></div>
               </div>
           </div>
           {gameState.hostId === user.uid && <button onClick={startGame} disabled={completedCount < 1} className="w-full bg-green-600 text-white font-bold py-4 rounded-xl shadow-lg transition active:scale-95 disabled:bg-gray-300 disabled:text-gray-500">{completedCount === totalCount ? "Start Game!" : (completedCount < 1 ? "Waiting for players..." : `Start Game (Force ${totalCount - completedCount} to sit out)`)}</button>}
           <button onClick={handleLeave} className="w-full bg-white text-gray-500 font-bold py-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition flex items-center justify-center gap-2"><LogOut size={18} /> Leave / Back to Home</button>
       </div>
     </div>
   );
 };


 const renderPlaying = () => {
   const currentCard = gameState.deck[gameState.currentCardIndex];
   if (!currentCard) return <div>Loading...</div>;
   const turnIdx = (gameState.turnIndex || 0) % gameState.players.length;
   const currentTurnPlayer = gameState.players[turnIdx];
   const isMyTurn = currentTurnPlayer?.id === user.uid;
   const { currentCardIndex } = gameState; // FIX: Destructure here


   return (
     <div className="flex flex-col justify-center h-full p-4">
          <div className="relative w-full max-w-md mx-auto z-10 space-y-6">
             <div className="text-center mb-6"><span className="bg-black/30 text-white px-3 py-1 rounded-full text-sm">Secret {currentCardIndex + 1} of {gameState.deck.length}</span></div>
             <div className="bg-white rounded-3xl shadow-2xl overflow-hidden min-h-[500px] flex flex-col">
                 <div className="p-4 bg-orange-50 border-b flex items-center justify-center gap-2"><span className="text-xl font-black text-orange-700">{currentTurnPlayer?.name} is guessing</span></div>
                 <div className="p-8 flex-1 flex items-center justify-center bg-gradient-to-b from-white to-gray-50 border-b">
                   <style>{`@keyframes flipIn { 0% { transform: rotateY(90deg); opacity: 0; } 100% { transform: rotateY(0deg); opacity: 1; } }`}</style>
                   <p key={currentCardIndex} className="text-2xl md:text-3xl font-black text-center text-gray-800 leading-tight" style={{ animation: 'flipIn 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}>"{currentCard.text}"</p>
                 </div>
                
                 <div className="flex-none p-6 bg-gray-50">
                   {gameState.turnState === 'guessing' && (
                       <div className="flex flex-col gap-4">
                          {!isMyTurn && <CyclingWaitingMessage name={currentTurnPlayer?.name} />}
                          <p className="text-center text-gray-500 font-bold uppercase text-xs tracking-wider">This Sum'n 'bout who?</p>
                          <div className="grid grid-cols-2 gap-2">
                               {gameState.players.map(p => (
                                   <button key={p.id} onClick={() => isMyTurn && setSelectedGuessedPlayer(p)} disabled={!isMyTurn}
                                       className={`p-3 rounded-xl font-bold text-sm border transition-all ${selectedGuessedPlayer?.id === p.id ? 'bg-orange-600 text-white transform scale-105 shadow-md' : 'bg-white text-gray-700 hover:bg-orange-50 border border-gray-200'} ${!isMyTurn && 'opacity-50'}`}>
                                       {p.name}{selectedGuessedPlayer?.id === p.id && <CheckCircle size={18} />}
                                   </button>
                               ))}
                          </div>
                          {isMyTurn ? <button onClick={handleGuess} disabled={!selectedGuessedPlayer} className="w-full bg-stone-900 text-white font-bold py-4 rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition">Confirm Guess</button> : null}
                       </div>
                   )}
                   {gameState.turnState === 'correct' && (
                        <div className="flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-8">
                           <Confetti />
                           <div className="mb-4 bg-green-100 p-4 rounded-full"><ThumbsUp className="w-12 h-12 text-green-600" /></div>
                           <h2 className="text-3xl font-black text-green-600 mb-4">That's Sum'n 'bout {currentCard.owner}!</h2>
                           <div className="bg-orange-50 p-4 rounded-xl border-2 border-orange-100 mb-6 w-full"><div className="flex items-center justify-center gap-2 text-orange-600 font-bold mb-1"><Mic size={20}/> Story Time</div><p className="text-sm text-orange-800">Spill the beans! Tell the group the story.</p></div>
                           <button onClick={handleNextAfterResult} className="w-full bg-green-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-green-700 active:scale-95 gap-2 flex justify-center items-center">Next Secret <ArrowRight size={20}/></button>
                        </div>
                   )}
                   {gameState.turnState === 'incorrect' && (
                        <div className="flex flex-col items-center text-center animate-in zoom-in">
                           <style>{`@keyframes shake { 0%, 100% { transform: translateX(0); } 10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); } 20%, 40%, 60%, 80% { transform: translateX(5px); } } .animate-shake { animation: shake 0.5s ease-in-out; }`}</style>
                           <div className="mb-6 bg-red-100 p-4 rounded-full animate-shake"><XCircle className="w-12 h-12 text-red-600" /></div>
                           <h2 className="text-2xl font-black text-red-600 mb-6">That's not Sum'n 'bout {gameState.lastGuessedName}!</h2>
                           <button onClick={handleNextAfterResult} className="w-full bg-stone-900 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-stone-800 active:scale-95">Try Another Secret</button>
                        </div>
                   )}
                 </div>
             </div>
          </div>
     </div>
   );
 };


 const renderSummary = () => {
   const sortedPlayers = [...gameState.players].sort((a, b) => a.name.localeCompare(b.name));
   return (
     <div className="flex flex-col justify-center h-full p-4">
       <div className="w-full max-w-md mx-auto bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col h-[80vh]">
           <div className="p-6 bg-orange-50 border-b border-orange-100 text-center">
               <h2 className="text-2xl font-black text-gray-800 flex items-center justify-center gap-2"><ScrollText className="text-orange-600"/> The Receipts</h2>
               <p className="text-sm text-orange-600">Here is who wrote what:</p>
           </div>
           <div className="flex-1 overflow-y-auto p-4 space-y-3">
               {sortedPlayers.map(p => (
                   <div key={p.id} className="p-4 bg-stone-50 rounded-xl border border-stone-200">
                       <p className="font-black text-gray-800 text-lg mb-1">{p.name}</p>
                       <p className="text-gray-600 italic">"{p.fact}"</p>
                   </div>
               ))}
           </div>
           <div className="p-4 border-t border-gray-100">
               <button onClick={async () => { const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'sumn_rooms', roomCode.toUpperCase()); await updateDoc(roomRef, { phase: 'finished' }); }} className="w-full bg-stone-900 text-white font-bold py-4 rounded-xl shadow-lg">Wrap It Up</button>
           </div>
       </div>
     </div>
   );
 };


 const renderFinished = () => (
     <div className="flex flex-col justify-center h-full p-4">
       <div className="w-full max-w-md mx-auto bg-white rounded-2xl shadow-2xl p-8 text-center space-y-6">
           <h1 className="text-3xl font-black text-gray-800">That's Sum'n 'bout E'erbody!</h1>
           <p className="text-gray-500 italic">"{randomGameOverLine}"</p>
           <div className="grid grid-cols-2 gap-4">
               <div className="bg-orange-50 p-4 rounded-xl"><span className="block text-3xl font-bold text-orange-600">{gameState.players.length}</span><span className="text-xs text-gray-500 uppercase font-bold">Friends</span></div>
               <div className="bg-rose-50 p-4 rounded-xl"><span className="block text-3xl font-bold text-rose-600">{gameState.deck.length}</span><span className="text-xs text-gray-500 uppercase font-bold">Secrets</span></div>
           </div>
           <div className="space-y-3">
               <button onClick={resetGame} className="w-full bg-orange-600 text-white font-bold py-3 rounded-xl">Play Again</button>
               <button onClick={handleLeave} className="w-full text-gray-400 font-bold py-3">Back to Home</button>
           </div>
       </div>
     </div>
 );


 // --- MAIN RENDER ---
 if (!user) return <div className="fixed inset-0 flex flex-col items-center justify-center text-center font-sans bg-orange-50">{showOfflineOption ? <button onClick={onSwitchToLocal} className="bg-white px-6 py-3 rounded-xl shadow">Play Offline</button> : <Loader className="animate-spin text-orange-500"/>}</div>;


 if (!joined) return renderJoinScreen();


 let content = null;
 let bgClass = "bg-gray-50";
 // Safely access gameState.phase and gameState.turnState only if gameState exists
 if (!gameState || gameState.phase === 'lobby') { content = renderLobby(); }
 else if (gameState.phase === 'input') { content = renderInput(); bgClass = "bg-orange-50"; }
 else if (gameState.phase === 'playing') {
     content = renderPlaying();
     bgClass = gameState.turnState === 'correct' ? 'bg-green-600' : gameState.turnState === 'incorrect' ? 'bg-red-600' : 'bg-stone-900';
 }
 else if (gameState.phase === 'summary') { content = renderSummary(); bgClass = "bg-stone-100"; }
 else if (gameState.phase === 'finished') { content = renderFinished(); bgClass = "bg-stone-800"; }


 return (
   <div className={`fixed inset-0 flex flex-col md:flex-row font-sans ${bgClass} transition-colors duration-500`}>
      {/* LEFT: Game Content */}
      <div className="relative flex-1 h-full overflow-y-auto overflow-x-hidden">
         {content}
         <AdminButton isOpen={isAdminOpen} onClose={() => setIsAdminOpen(false)} players={gameState?.players || []} onKick={handleKickPlayer} onSkip={handleSkipTurn} onEndGame={handleEndGame} currentPhase={gameState?.phase} isHost={gameState?.hostId === user?.uid} onClick={() => setIsAdminOpen(true)} />
         <AdminModal isOpen={isAdminOpen} onClose={() => setIsAdminOpen(false)} players={gameState?.players || []} onKick={handleKickPlayer} onSkip={handleSkipTurn} onEndGame={handleEndGame} currentPhase={gameState?.phase} />
         {/* Chat Button for Mobile */}
         <div className="md:hidden">
            <button onClick={() => setIsChatOpen(true)} className="fixed bottom-6 right-6 bg-orange-500 text-white p-3 rounded-full shadow-xl hover:bg-orange-600 active:scale-95 z-40 flex items-center justify-center" style={{ marginBottom: 'env(safe-area-inset-bottom)' }}>
              <MessageCircle size={24} />{hasUnread && <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse"/>}
            </button>
         </div>
      </div>


      {/* RIGHT: Chat Sidebar (Desktop Only) */}
      <div className="hidden md:flex w-96 border-l border-gray-200 shadow-xl bg-white z-20 flex-col">
          <ChatPanel messages={gameState?.messages || []} onSendMessage={handleSendMessage} currentPlayerName={inputName} isMobile={false} />
      </div>


      {/* MOBILE OVERLAY CHAT (Bottom Sheet Style) */}
      {isChatOpen && (
          <div className="md:hidden fixed inset-0 z-50 bg-black/50 flex flex-col justify-end">
              <div className="bg-white w-full h-[60vh] rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom-10 flex flex-col">
                  <ChatPanel messages={gameState?.messages || []} onSendMessage={handleSendMessage} currentPlayerName={inputName} onClose={() => setIsChatOpen(false)} isMobile={true} />
              </div>
          </div>
      )}
   </div>
 );
}


// --- ROOT APP SWITCHER ---
export default function App() {
 const [mode, setMode] = useState('online');
 if (mode === 'local') return <LocalGame onBack={() => setMode('online')} />;
 return <OnlineGame onSwitchToLocal={() => setMode('local')} />;
}
