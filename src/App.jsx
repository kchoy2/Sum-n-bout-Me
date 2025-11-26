import React, { useState, useEffect, useMemo } from 'react';
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
 deleteDoc
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
 Lock
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


// --- Constants ---
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


const FUNNY_GAME_OVER_LINES = [
 "What happens in Shelters stays in Shelters.",
 "I'm judging you all silently.",
 "Don't worry, I've already forgotten everything.",
 "This conversation never happened.",
 "You guys are weird, I love it.",
 "Now go delete your browser history.",
 "Remember: snitches get stitches."
];


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


 const randomPlaceholder = useMemo(() => {
   const randomIndex = Math.floor(Math.random() * FUNNY_PLACEHOLDERS.length);
   return FUNNY_PLACEHOLDERS[randomIndex];
 }, [currentPlayerInputIndex]);


 const randomGameOverLine = useMemo(() => {
   const randomIndex = Math.floor(Math.random() * FUNNY_GAME_OVER_LINES.length);
   return FUNNY_GAME_OVER_LINES[randomIndex];
 }, [phase]);


 const addPlayer = () => {
   if (!inputValue.trim()) return;
   setPlayers([...players, { id: Date.now() + Math.random(), name: inputValue.trim(), fact: '' }]);
   setInputValue('');
 };


 const removePlayer = (id) => setPlayers(players.filter(p => p.id !== id));


 const startInputPhase = () => {
   if (players.length < 2) return;
   setPhase('input');
   setCurrentPlayerInputIndex(0);
 };


 const submitSecret = () => {
   if (!secretInput.trim()) return;
   const updatedPlayers = [...players];
   updatedPlayers[currentPlayerInputIndex].fact = secretInput.trim();
   setPlayers(updatedPlayers);
   setSecretInput('');


   if (currentPlayerInputIndex < players.length - 1) {
     setPhase('transition');
   } else {
     setPhase('pre_game');
   }
 };


 const nextInputPlayer = () => {
   setCurrentPlayerInputIndex(currentPlayerInputIndex + 1);
   setPhase('input');
 };


 const startGame = () => {
   const validPlayers = players.filter(p => p.fact.trim().length > 0);
   const newDeck = validPlayers.map(p => ({ text: p.fact, owner: p.name, ownerId: p.id }));
   for (let i = newDeck.length - 1; i > 0; i--) {
     const j = Math.floor(Math.random() * (i + 1));
     [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
   }
   setDeck(newDeck);
   setPhase('playing');
   setCurrentCardIndex(0);
   setTurnIndex(0);
   setTurnState('guessing');
 };


 const handleGuess = () => {
   if (!selectedGuessedPlayer) return;
   const currentCard = deck[currentCardIndex];
   const guesser = players[turnIndex % players.length];
   const isCorrect = selectedGuessedPlayer.id === currentCard.ownerId;
   setLastResult({ guesser: guesser.name, target: selectedGuessedPlayer.name });
   setTurnState(isCorrect ? 'correct' : 'incorrect');
   setSelectedGuessedPlayer(null);
 };


 const nextTurn = () => {
   const nextTurnIdx = (turnIndex + 1);
   setTurnIndex(nextTurnIdx);
   if (turnState === 'correct') {
     const nextCardIdx = currentCardIndex + 1;
     if (nextCardIdx >= deck.length) {
       setPhase('finished');
     } else {
       setCurrentCardIndex(nextCardIdx);
       setTurnState('guessing');
     }
   } else {
     const newDeck = [...deck];
     const card = newDeck.splice(currentCardIndex, 1)[0];
     newDeck.push(card);
     setDeck(newDeck);
     setTurnState('guessing');
   }
 };


 // --- Local Renders ---
 if (phase === 'lobby') {
   return (
     <div className="min-h-screen w-full bg-gradient-to-br from-orange-500 to-pink-600 flex items-center justify-center p-4 font-sans">
       <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
         <div className="text-center mb-6">
            <div className="inline-block p-3 bg-orange-100 rounded-full mb-2"><Smartphone size={32} className="text-orange-600"/></div>
            <h1 className="text-2xl font-black text-gray-800">Pass-n-Play Mode</h1>
            <p className="text-gray-500 text-sm">One device. Pass it around.</p>
         </div>
        
         <div className="space-y-4">
           <div>
             <label className="block text-sm font-bold text-gray-700 mb-1">Add Players</label>
             <div className="flex gap-2">
               <input
                 type="text"
                 value={inputValue}
                 onChange={(e) => setInputValue(e.target.value)}
                 onKeyDown={(e) => e.key === 'Enter' && addPlayer()}
                 className="flex-1 px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none bg-white text-gray-900"
                 placeholder="Player Name"
               />
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
             {players.length === 0 && <p className="text-center text-gray-400 text-sm italic">Add at least 2 players</p>}
           </div>
           <div className="flex flex-col gap-3 mt-4">
               <button onClick={startInputPhase} disabled={players.length < 2} className="w-full bg-orange-600 text-white font-bold py-3 rounded-xl shadow-lg disabled:opacity-50">Start Game</button>
               <button onClick={onBack} className="w-full text-gray-500 font-bold py-3">Back to Home</button>
           </div>
         </div>
       </div>
     </div>
   );
 }


 if (phase === 'transition') {
   const nextPlayerName = players[currentPlayerInputIndex + 1].name;
   return (
     <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 text-center">
       <div className="w-full max-w-md space-y-8">
           <h2 className="text-3xl font-black text-white">Stop! Don't Look!</h2>
           <p className="text-gray-300 text-xl">Pass the device to <br/><strong className="text-4xl text-orange-400 block mt-4">{nextPlayerName}</strong></p>
           <button onClick={nextInputPlayer} className="w-full bg-white text-gray-900 font-bold py-4 rounded-xl shadow-lg mt-8">I am {nextPlayerName}</button>
       </div>
     </div>
   );
 }


 if (phase === 'pre_game') {
   return (
     <div className="min-h-screen w-full bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center p-4 text-center">
       <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 space-y-6 animate-in zoom-in">
           <div className="flex justify-center"><div className="bg-green-100 p-4 rounded-full"><Lock size={48} className="text-green-600"/></div></div>
           <div>
               <h2 className="text-3xl font-black text-gray-800">Secrets Locked!</h2>
               <p className="text-gray-500 mt-2">The bowl is mixed. The secrets are safe. Are you ready to guess?</p>
           </div>
           <button onClick={startGame} className="w-full bg-green-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-green-700 transition transform active:scale-95">
               Let's Play! <Play size={20} className="inline ml-2"/>
           </button>
       </div>
     </div>
   );
 }


 if (phase === 'input') {
   const currentPlayer = players[currentPlayerInputIndex];
   return (
     <div className="min-h-screen w-full bg-orange-50 flex items-center justify-center p-4">
       <div className="w-full max-w-md space-y-6">
         <div className="bg-white p-6 rounded-2xl shadow-sm text-center">
            <h2 className="text-xl font-bold text-gray-500 uppercase tracking-widest mb-1">Player {currentPlayerInputIndex + 1} / {players.length}</h2>
            <h1 className="text-3xl font-black text-orange-600">{currentPlayer.name}</h1>
         </div>
         <div className="bg-white p-6 rounded-2xl shadow-lg flex flex-col gap-4">
            <label className="block font-bold text-gray-700">Write a secret about yourself...</label>
            <textarea className="w-full p-4 rounded-xl border border-gray-200 focus:border-orange-500 bg-white text-gray-900 outline-none h-32 resize-none"
               placeholder={randomPlaceholder} value={secretInput} onChange={(e) => setSecretInput(e.target.value)} />
            <button onClick={submitSecret} className="w-full bg-orange-600 text-white font-bold py-3 rounded-xl shadow-md">Lock it in 🔒</button>
         </div>
       </div>
     </div>
   );
 }


 if (phase === 'playing') {
   const currentCard = deck[currentCardIndex];
   const currentPlayer = players[turnIndex % players.length];
   return (
     <div className={`min-h-screen w-full ${turnState === 'correct' ? 'bg-green-600' : turnState === 'incorrect' ? 'bg-red-600' : 'bg-gray-900'} flex items-center justify-center p-4 transition-colors duration-500`}>
       <div className="w-full max-w-md space-y-6">
           <div className="text-center"><span className="bg-black/30 text-white px-3 py-1 rounded-full text-sm">Secret {currentCardIndex + 1} of {deck.length}</span></div>
           <div className="bg-white rounded-3xl shadow-2xl overflow-hidden min-h-[400px] flex flex-col">
               {/* Turn Indicator moved to top */}
               <div className="p-4 bg-orange-50 border-b flex items-center justify-center gap-2">
                   <span className="text-orange-800 text-sm font-bold uppercase tracking-wider">Turn:</span>
                   <span className="text-xl font-black text-orange-700">{currentPlayer.name} is guessing</span>
               </div>


               {/* Secret Card Area - Now in Middle */}
               <div className="p-8 flex-1 flex items-center justify-center bg-gradient-to-b from-white to-gray-50 border-b">
                   <p className="text-2xl md:text-3xl font-black text-center text-gray-800 leading-tight">"{currentCard.text}"</p>
               </div>


               {/* Interaction Area */}
               <div className="flex-none p-6 bg-gray-50">
                   {turnState === 'guessing' && (
                       <div className="flex flex-col gap-4">
                           <p className="text-center text-gray-500 font-bold uppercase text-xs tracking-wider">This Sum'n 'bout who?</p>
                           <div className="grid grid-cols-2 gap-2">
                               {players.map(p => (
                                   <button key={p.id} onClick={() => setSelectedGuessedPlayer(p)} className={`p-3 rounded-xl font-bold text-sm border transition-all ${selectedGuessedPlayer?.id === p.id ? 'bg-orange-600 text-white transform scale-105 shadow-md' : 'bg-white text-gray-700 hover:bg-orange-50 border border-gray-200'}`}>
                                       {p.name}
                                   </button>
                               ))}
                           </div>
                           <button onClick={handleGuess} disabled={!selectedGuessedPlayer} className="w-full bg-gray-900 text-white font-bold py-4 rounded-xl shadow-lg disabled:opacity-50 active:scale-95 transition">Confirm Guess</button>
                       </div>
                   )}
                   {turnState !== 'guessing' && (
                       <div className="text-center space-y-4 animate-in fade-in zoom-in">
                           <div className={`inline-block p-4 rounded-full ${turnState === 'correct' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                               {turnState === 'correct' ? <ThumbsUp size={32}/> : <XCircle size={32}/>}
                           </div>
                           <h2 className={`text-2xl font-black ${turnState === 'correct' ? 'text-green-600' : 'text-red-600'}`}>
                               {turnState === 'correct' ? "That's Sum'n 'bout Me!" : `That's not Sum'n 'bout ${lastResult.target}!`}
                           </h2>
                           {turnState === 'incorrect' && <p className="text-gray-500">Back to the bowl!</p>}
                           {turnState === 'correct' && (
                               <div className="bg-orange-50 p-3 rounded-xl border border-orange-100">
                                   <p className="text-orange-800 text-sm font-bold">Correct! It was {currentCard.owner}.</p>
                                   <p className="text-xs text-orange-600 mt-1">Spill the beans! Tell the story.</p>
                               </div>
                           )}
                           <button onClick={nextTurn} className="w-full bg-gray-900 text-white font-bold py-4 rounded-xl shadow-lg active:scale-95 transition">{turnState === 'correct' ? 'Next Secret' : 'Try Another'}</button>
                       </div>
                   )}
               </div>
           </div>
       </div>
     </div>
   );
 }


 if (phase === 'finished') {
   return (
     <div className="min-h-screen w-full bg-indigo-600 flex items-center justify-center p-4">
       <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 text-center space-y-6">
           <h1 className="text-3xl font-black text-gray-800">That's Sum'n 'bout E'erbody!</h1>
           <p className="text-gray-500 italic">"{randomGameOverLine}"</p>
           <button onClick={() => setPhase('lobby')} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl">Play Again</button>
           <button onClick={onBack} className="w-full text-gray-400 font-bold py-3">Back to Home</button>
       </div>
     </div>
   );
 }
 return null;
}


// --- ONLINE FIREBASE COMPONENT ---
function OnlineGame({ onSwitchToLocal }) {
 const [user, setUser] = useState(null);
 const [roomCode, setRoomCode] = useState('SHELTERS');
 const [showOfflineOption, setShowOfflineOption] = useState(false);
  const [inputName, setInputName] = useState('');
 const [showQR, setShowQR] = useState(false);
  const [joined, setJoined] = useState(false);
 const [gameState, setGameState] = useState(null);
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState('');
 const [selectedGuessedPlayer, setSelectedGuessedPlayer] = useState(null);


 const randomPlaceholder = useMemo(() => {
   const randomIndex = Math.floor(Math.random() * FUNNY_PLACEHOLDERS.length);
   return FUNNY_PLACEHOLDERS[randomIndex];
 }, [gameState?.phase]);


 const randomGameOverLine = useMemo(() => {
   const randomIndex = Math.floor(Math.random() * FUNNY_GAME_OVER_LINES.length);
   return FUNNY_GAME_OVER_LINES[randomIndex];
 }, [gameState?.phase]);


 useEffect(() => {
   // Safety timer: if auth takes > 3s, show offline option
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
       setGameState(snapshot.data());
     } else {
       setGameState(null);
       if (joined) {
          setJoined(false);
          setError("Room was closed by the host.");
       }
     }
   }, (err) => {
     console.error("Snapshot error:", err);
     setError("Lost connection to the room.");
   });
   return () => unsubscribe();
 }, [user, joined, roomCode]);


 const handleJoin = async () => {
   if (!inputName.trim() || !roomCode.trim()) {
       setError("Please enter your name and a room code.");
       return;
   }
   setLoading(true);
   const code = roomCode.toUpperCase();
   const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'sumn_rooms', code);
   try {
     const snap = await getDoc(roomRef);
     const newPlayer = { id: user.uid, name: inputName.trim(), fact: '', ready: false };
     if (!snap.exists()) {
       await setDoc(roomRef, {
         players: [newPlayer], phase: 'lobby', deck: [], currentCardIndex: 0,
         turnState: 'guessing', lastGuessedName: '', turnIndex: 0, guesserName: '', hostId: user.uid
       });
     } else {
       const data = snap.data();
       let updatedPlayers = [...data.players];
       const existingIndex = updatedPlayers.findIndex(p => p.id === user.uid);
       if (existingIndex >= 0) { updatedPlayers[existingIndex].name = inputName.trim(); }
       else { updatedPlayers.push(newPlayer); }
       await updateDoc(roomRef, { players: updatedPlayers });
     }
     setJoined(true);
     setError('');
   } catch (err) {
     console.error(err);
     setError("Failed to join room. Try again.");
   }
   setLoading(false);
 };


 const handleLeave = async () => {
   if (joined && roomCode) {
       setLoading(true);
       try {
           const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'sumn_rooms', roomCode.toUpperCase());
           const snap = await getDoc(roomRef);
           if (snap.exists()) {
               const data = snap.data();
               if (data.hostId === user.uid) { await deleteDoc(roomRef); }
               else {
                   const updatedPlayers = data.players.filter(p => p.id !== user.uid);
                   if (updatedPlayers.length === 0) { await deleteDoc(roomRef); }
                   else { await updateDoc(roomRef, { players: updatedPlayers }); }
               }
           }
       } catch (err) { console.error("Cleanup error:", err); }
       setLoading(false);
   }
   setJoined(false);
   setGameState(null);
   setError('');
 };


 const submitFact = async (fact) => {
   if (!gameState) return;
   const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'sumn_rooms', roomCode.toUpperCase());
   const updatedPlayers = gameState.players.map(p =>
     p.id === user.uid ? { ...p, fact: fact, ready: true } : p
   );
   await updateDoc(roomRef, { players: updatedPlayers });
 };


 const startGame = async () => {
   if (!gameState) return;
   const validPlayers = gameState.players.filter(p => p.fact && p.fact.trim().length > 0);
   if (validPlayers.length < 1) return;
   const deck = validPlayers.map(p => ({ text: p.fact, owner: p.name, ownerId: p.id }));
   for (let i = deck.length - 1; i > 0; i--) {
     const j = Math.floor(Math.random() * (i + 1));
     [deck[i], deck[j]] = [deck[j], deck[i]];
   }
   const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'sumn_rooms', roomCode.toUpperCase());
   await updateDoc(roomRef, {
     phase: 'playing', deck: deck, currentCardIndex: 0, turnState: 'guessing',
     turnIndex: 0, guesserName: '', lastGuessedName: ''
   });
 };


 const handleGuess = async () => {
   if (!selectedGuessedPlayer || !gameState) return;
   const currentCard = gameState.deck[gameState.currentCardIndex];
   const isCorrect = selectedGuessedPlayer.id === currentCard.ownerId;
   const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'sumn_rooms', roomCode.toUpperCase());
   const turnIdx = (gameState.turnIndex || 0) % gameState.players.length;
   const currentGuesser = gameState.players[turnIdx];
   await updateDoc(roomRef, {
     turnState: isCorrect ? 'correct' : 'incorrect',
     lastGuessedName: selectedGuessedPlayer.name,
     guesserName: currentGuesser ? currentGuesser.name : 'Someone'
   });
   setSelectedGuessedPlayer(null);
 };


 const handleNextAfterResult = async () => {
   if (!gameState) return;
   const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'sumn_rooms', roomCode.toUpperCase());
   const nextTurnIndex = ((gameState.turnIndex || 0) + 1) % gameState.players.length;
   if (gameState.turnState === 'correct') {
       const nextIndex = gameState.currentCardIndex + 1;
       if (nextIndex >= gameState.deck.length) { await updateDoc(roomRef, { phase: 'finished' }); }
       else {
           await updateDoc(roomRef, { currentCardIndex: nextIndex, turnState: 'guessing', turnIndex: nextTurnIndex, lastGuessedName: '', guesserName: '' });
       }
   } else {
       const newDeck = [...gameState.deck];
       const currentCard = newDeck[gameState.currentCardIndex];
       newDeck.splice(gameState.currentCardIndex, 1);
       newDeck.push(currentCard);
       await updateDoc(roomRef, { deck: newDeck, turnState: 'guessing', turnIndex: nextTurnIndex, lastGuessedName: '', guesserName: '' });
   }
 };


 const resetGame = async () => {
   const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'sumn_rooms', roomCode.toUpperCase());
   const resetPlayers = gameState.players.map(p => ({ ...p, fact: '', ready: false }));
   await updateDoc(roomRef, { phase: 'lobby', players: resetPlayers, deck: [], currentCardIndex: 0, turnState: 'guessing', turnIndex: 0, guesserName: '' });
 };


 // --- Renders ---
 if (!user) {
   return (
       <div className="min-h-screen w-full bg-pink-50 flex flex-col items-center justify-center p-4 text-center font-sans">
           <div className="mb-4 flex flex-col items-center">
               <Loader className="animate-spin text-purple-600 mb-2" size={32}/>
               <span className="text-purple-600 font-bold animate-pulse">Connecting to Party Server...</span>
           </div>
           {showOfflineOption && (
               <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                   <p className="text-gray-500 text-sm mb-4">Taking a while? You can play offline.</p>
                   <button onClick={onSwitchToLocal} className="bg-white text-gray-600 font-bold py-3 px-6 rounded-xl shadow-md border border-gray-200 flex items-center justify-center gap-2 hover:bg-gray-50 transition">
                       <Smartphone size={20}/> Play Offline (Pass-n-Play)
                   </button>
               </div>
           )}
       </div>
   );
 }


 if (!joined) {
   return (
     <div className="min-h-screen w-full bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center p-4 font-sans">
       <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md mx-auto">
         <div className="flex justify-center mb-4"><Sparkles className="w-12 h-12 text-purple-600" /></div>
         <h1 className="text-3xl font-black text-center text-gray-800 mb-2">Sum'n 'bout Me</h1>
         <p className="text-center text-gray-500 mb-6">Online Party Mode</p>
        
         <div className="space-y-4">
           <div>
               <label className="block text-sm font-bold text-gray-700 mb-1">Your Name</label>
               <input type="text" value={inputName} onChange={(e) => setInputName(e.target.value)}
                   className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 outline-none bg-white text-gray-900" placeholder="Enter your name"/>
           </div>
           <div>
             <label className="block text-sm font-bold text-gray-700 mb-1">Room Code</label>
             <input type="text" value={roomCode} onChange={(e) => setRoomCode(e.target.value)}
               className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 outline-none uppercase tracking-widest bg-white text-gray-900" placeholder="SHELTERS"/>
           </div>
           {error && <p className="text-red-500 text-sm text-center bg-red-50 p-2 rounded">{error}</p>}
           <button onClick={handleJoin} disabled={loading || !inputName || !roomCode} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-lg shadow-lg transition active:scale-95 disabled:opacity-50">
             {loading ? "Joining..." : "Join Party"}
           </button>
           <button onClick={onSwitchToLocal} className="w-full text-gray-400 font-bold text-sm py-2 hover:text-gray-600 flex items-center justify-center gap-2">
               <Smartphone size={16}/> Switch to Pass-n-Play Mode
           </button>
         </div>
       </div>
     </div>
   );
 }


 // Lobby Phase
 if (!gameState || gameState.phase === 'lobby') {
   const players = gameState ? gameState.players : [];
   const isHost = gameState && gameState.hostId === user.uid;
   return (
     <div className="min-h-screen w-full bg-gray-50 p-4 flex items-center justify-center">
       <div className="w-full max-w-md mx-auto space-y-6">
         <div className="bg-white rounded-xl shadow-sm p-6 text-center border-b-4 border-purple-200">
           <h2 className="text-xl font-bold text-gray-800">Room: {roomCode.toUpperCase()}</h2>
           <div className="flex justify-center items-center gap-2 mt-2">
               <button onClick={() => setShowQR(!showQR)} className="text-xs flex items-center gap-1 bg-purple-50 text-purple-600 px-3 py-1 rounded-full hover:bg-purple-100 transition">
                 <QrCode size={14} /> {showQR ? "Hide Join QR" : "Show Join QR"}
               </button>
           </div>
           {showQR && (
              <div className="mt-4 flex flex-col items-center animate-in fade-in zoom-in">
                 <div className="p-3 bg-white border-2 border-gray-100 rounded-xl shadow-inner">
                   <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(window.location.href)}`} alt="Scan to join" className="w-32 h-32"/>
                 </div>
              </div>
           )}
         </div>
         <div className="bg-white rounded-xl shadow-sm overflow-hidden">
           <div className="p-4 bg-gray-100 border-b flex justify-between items-center"><span className="font-bold text-gray-700 flex items-center gap-2"><Users size={18}/> Players ({players.length})</span></div>
           <ul className="divide-y max-h-[50vh] overflow-y-auto">
             {players.map((p) => (
               <li key={p.id} className="p-4 flex items-center justify-between"><span className="font-medium text-gray-800">{p.name}</span>{p.id === user.uid && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">You</span>}</li>
             ))}
           </ul>
         </div>
         <div className="space-y-3">
              <button onClick={async () => { const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'sumn_rooms', roomCode.toUpperCase()); await updateDoc(roomRef, { phase: 'input' }); }} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2">Start Sum'n <Play size={20} /></button>
             <button onClick={handleLeave} className="w-full font-bold py-3 rounded-xl border flex items-center justify-center gap-2 bg-white text-gray-500 border-gray-200 hover:bg-gray-50">{isHost ? <><Trash2 size={18} /> Close Room (Kick All)</> : <><LogOut size={18} /> Leave Room</>}</button>
         </div>
       </div>
     </div>
   );
 }


 // Input Phase
 if (gameState.phase === 'input') {
   const myPlayer = gameState.players.find(p => p.id === user.uid);
   const completedCount = gameState.players.filter(p => p.ready).length;
   const totalCount = gameState.players.length;
  
   // waiting list
   const waitingFor = gameState.players.filter(p => !p.ready).map(p => p.name);


   if (!myPlayer) return <div className="p-4 text-center">Loading...</div>;


   return (
     <div className="min-h-screen w-full bg-purple-50 p-4 flex flex-col items-center justify-center">
       <div className="w-full max-w-md mx-auto flex flex-col space-y-6">
         <div className="bg-white p-6 rounded-2xl shadow-sm text-center">
            <div className="inline-block p-3 bg-purple-100 rounded-full mb-4"><HelpCircle className="w-8 h-8 text-purple-600" /></div>
            <h2 className="text-2xl font-black text-gray-800 mb-2">Write Sum'n!</h2>
            <p className="text-gray-600">Write a secret about yourself that nobody here knows.</p>
         </div>
          <div className={`p-6 rounded-2xl shadow-md border-2 transition-all ${myPlayer.ready ? 'bg-green-50 border-green-200' : 'bg-white border-purple-100'}`}>
             <div className="flex items-center justify-between mb-3"><span className="font-bold text-lg text-gray-800">{myPlayer.name}</span>{myPlayer.ready && <CheckCircle className="text-green-500" size={24} />}</div>
             {!myPlayer.ready ? (
                 <div className="flex flex-col gap-3">
                     <textarea className="w-full p-3 rounded-lg border border-gray-200 focus:border-purple-500 outline-none resize-none bg-white text-gray-900" placeholder={randomPlaceholder} rows={3} id="factInput"/>
                     <button onClick={() => { const val = document.getElementById('factInput').value; if(val.trim()) submitFact(val); }} className="w-full bg-purple-600 text-white font-bold py-2 rounded-lg">Submit Secret</button>
                 </div>
             ) : (<p className="text-green-700 italic">Secret locked in.</p>)}
          </div>
         <div className="bg-white rounded-xl p-4 shadow-sm">
           <div className="flex justify-between text-sm font-bold text-gray-500 mb-2"><span>Group Progress</span><span>{completedCount}/{totalCount} Ready</span></div>
           <div className="w-full bg-gray-200 rounded-full h-3"><div className="bg-green-500 h-3 rounded-full transition-all duration-500" style={{ width: `${(completedCount / totalCount) * 100}%` }}/></div>
           {waitingFor.length > 0 && <div className="mt-3 text-xs text-center text-gray-400">Waiting for: <span className="font-bold text-gray-500">{waitingFor.join(', ')}</span></div>}
         </div>
         <div className="space-y-3">
             <button onClick={startGame} disabled={completedCount < totalCount} className="w-full bg-green-600 text-white font-bold py-4 rounded-xl shadow-lg transition active:scale-95 disabled:bg-gray-300 disabled:text-gray-500">{completedCount === totalCount ? "Everyone is Ready! Start Game" : "Waiting for players..."}</button>
             <button onClick={handleLeave} className="w-full bg-white text-gray-500 font-bold py-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition flex items-center justify-center gap-2"><LogOut size={18} /> Leave / Back to Home</button>
         </div>
       </div>
     </div>
   );
 }


 // Playing Phase
 if (gameState.phase === 'playing') {
   const currentCard = gameState.deck[gameState.currentCardIndex];
   const turnState = gameState.turnState || 'guessing';
   const turnIdx = (gameState.turnIndex || 0) % gameState.players.length;
   const currentTurnPlayer = gameState.players[turnIdx];
   const nextTurnPlayer = gameState.players[(turnIdx + 1) % gameState.players.length];
  
   let bgStyle = "bg-gray-900";
   if (turnState === 'correct') bgStyle = "bg-green-600";
   if (turnState === 'incorrect') bgStyle = "bg-red-600";
  
   return (
     <div className={`min-h-screen w-full ${bgStyle} transition-colors duration-500 p-4 flex flex-col items-center justify-center relative overflow-hidden`}>
       <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full mix-blend-overlay filter blur-3xl opacity-20 animate-blob"></div>
       <div className="relative w-full max-w-md mx-auto z-10">
         <div className="text-center mb-6"><span className="bg-black/30 text-white px-4 py-1 rounded-full text-sm font-medium backdrop-blur-sm">Secret {gameState.currentCardIndex + 1} of {gameState.deck.length}</span></div>
         <div className="bg-white rounded-3xl shadow-2xl overflow-hidden min-h-[500px] flex flex-col">
          
           {/* Turn Indicator moved to top */}
           <div className="p-4 bg-purple-50 border-b flex items-center justify-center gap-2">
               <span className="text-purple-800 text-sm font-bold uppercase tracking-wider">Turn:</span>
               <span className="text-xl font-black text-purple-700">{currentTurnPlayer ? currentTurnPlayer.name : "..."} is guessing</span>
           </div>


           {/* Secret Card Area - Now in Middle */}
           <div className="p-8 flex-1 flex items-center justify-center bg-gradient-to-b from-white to-gray-50 border-b">
               <p className="text-2xl md:text-3xl font-black text-center text-gray-800 leading-tight">"{currentCard.text}"</p>
           </div>


           {/* Interaction Area */}
           <div className="flex-none p-6 bg-gray-50">
             {turnState === 'guessing' && (
               <div className="flex flex-col gap-4">
                  <p className="text-center text-gray-500 font-bold uppercase text-xs tracking-wider">This Sum'n 'bout who?</p>
                  <div className="grid grid-cols-2 gap-2">
                     {gameState.players.map(p => (
                       <button key={p.id} onClick={() => setSelectedGuessedPlayer(p)} className={`p-3 rounded-xl font-bold text-sm border transition-all ${selectedGuessedPlayer?.id === p.id ? 'bg-purple-600 text-white transform scale-105 shadow-md' : 'bg-white text-gray-700 hover:bg-purple-50 border border-gray-200'}`}>{p.name}{selectedGuessedPlayer?.id === p.id && <CheckCircle size={18} />}</button>
                     ))}
                  </div>
                  <button onClick={handleGuess} disabled={!selectedGuessedPlayer} className="w-full bg-gray-900 text-white font-bold py-4 rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition">Confirm Guess</button>
               </div>
             )}
             {turnState === 'correct' && (
               <div className="flex flex-col items-center justify-center text-center animate-in fade-in slide-in-from-bottom-8 duration-500">
                   <div className="mb-4 bg-green-100 p-4 rounded-full"><ThumbsUp className="w-12 h-12 text-green-600" /></div>
                   <div className="mb-6"><p className="text-sm font-bold text-green-700 opacity-80 uppercase tracking-widest mb-1">{gameState.guesserName} guessed {gameState.lastGuessedName}</p><h2 className="text-3xl font-black text-green-600">That's Sum'n 'bout Me!</h2></div>
                   <p className="text-gray-600 text-lg mb-2">Correct! It was <strong className="text-gray-900">{currentCard.owner}</strong>.</p>
                   <div className="bg-purple-50 p-4 rounded-xl border-2 border-purple-100 mb-6 w-full"><div className="flex items-center justify-center gap-2 text-purple-600 font-bold mb-1"><Mic size={20} /> Story Time</div><p className="text-sm text-purple-800">Spill the beans! Tell the group the story.</p></div>
                   <button onClick={handleNextAfterResult} className="w-full bg-green-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-green-700 transform active:scale-95 transition flex items-center justify-center gap-2">Next Secret <ArrowRight size={20} /></button>
                   <p className="text-white/60 text-xs mt-3">Up Next: {nextTurnPlayer ? nextTurnPlayer.name : "..."}</p>
               </div>
             )}
             {turnState === 'incorrect' && (
               <div className="flex-1 flex flex-col items-center justify-center text-center animate-in zoom-in duration-300">
                   <div className="mb-6 bg-red-100 p-4 rounded-full"><XCircle className="w-12 h-12 text-red-600" /></div>
                   <div className="mb-6"><p className="text-sm font-bold text-red-300 opacity-80 uppercase tracking-widest mb-1">{gameState.guesserName} guessed {gameState.lastGuessedName}</p><h2 className="text-2xl font-black text-red-600 leading-tight">That's not Sum'n 'bout {gameState.lastGuessedName}!</h2></div>
                   <p className="text-gray-500 mb-8 text-sm">Back to the bowl it goes!</p>
                   <button onClick={handleNextAfterResult} className="w-full bg-gray-900 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-gray-800 transform active:scale-95 transition">Try Another Fact</button>
                   <p className="text-white/60 text-xs mt-3">Up Next: {nextTurnPlayer ? nextTurnPlayer.name : "..."}</p>
               </div>
             )}
           </div>
         </div>
       </div>
     </div>
   );
 }


 // Finished Phase
 if (gameState.phase === 'finished') {
   return (
     <div className="min-h-screen w-full bg-indigo-600 flex items-center justify-center p-4">
       <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 text-center space-y-6">
           <h1 className="text-3xl font-black text-gray-800">That's Sum'n 'bout E'erbody!</h1>
           <p className="text-gray-500 italic">"{randomGameOverLine}"</p>
           <button onClick={resetGame} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl">Play Again</button>
           <button onClick={handleLeave} className="w-full text-gray-400 font-bold py-3">Back to Home</button>
       </div>
     </div>
   );
 }
 return null;
}


// --- ROOT APP SWITCHER ---
export default function App() {
 const [mode, setMode] = useState('online'); // 'online' or 'local'
 if (mode === 'local') {
   return <LocalGame onBack={() => setMode('online')} />;
 }
 return <OnlineGame onSwitchToLocal={() => setMode('local')} />;
}