import React, { useState, useEffect, useRef } from 'react';
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
 ArrowRight
} from 'lucide-react';


// --- Firebase Configuration ---
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
// You can just set this to a string, it separates data if you have multiple versions of the game
const appId = 'my-party-game-v1';




// --- Main App Component ---
export default function App() {
 const [user, setUser] = useState(null);
 const [roomCode, setRoomCode] = useState('');
  // Login State
 const [inputName, setInputName] = useState('');
 const [localPlayersList, setLocalPlayersList] = useState([]); // List of names to join with
  // Game State
 const [myPlayerIds, setMyPlayerIds] = useState([]); // IDs of players belonging to this device
 const [joined, setJoined] = useState(false);
 const [gameState, setGameState] = useState(null);
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState('');
 const [selectedGuessedPlayer, setSelectedGuessedPlayer] = useState(null);


 // 1. Initialize Auth
 useEffect(() => {
   const initAuth = async () => {
     try {
       if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
         await signInWithCustomToken(auth, __initial_auth_token);
       } else {
         await signInAnonymously(auth);
       }
     } catch (err) {
       console.error("Auth error:", err);
       setError("Could not authenticate. Refresh to try again.");
     }
   };
   initAuth();
   const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
   return () => unsubscribe();
 }, []);


 // 2. Listen to Game Room updates
 useEffect(() => {
   if (!user || !joined || !roomCode) return;


   const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'sumn_rooms', roomCode.toUpperCase());


   const unsubscribe = onSnapshot(roomRef, (snapshot) => {
     if (snapshot.exists()) {
       setGameState(snapshot.data());
     } else {
       setGameState(null);
       // If we are currently "joined" but the room disappears, it means it was closed/deleted.
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


 // --- Helpers ---
 const isMyPlayer = (id) => myPlayerIds.includes(id);


 // --- Actions ---


 const addLocalPlayer = () => {
   if (!inputName.trim()) return;
   setLocalPlayersList([...localPlayersList, inputName.trim()]);
   setInputName('');
 };


 const removeLocalPlayer = (index) => {
   const newList = [...localPlayersList];
   newList.splice(index, 1);
   setLocalPlayersList(newList);
 };


 const handleJoin = async () => {
   // Validate: Need at least one player name and a room code
   const namesToJoin = localPlayersList.length > 0 ? localPlayersList : (inputName.trim() ? [inputName.trim()] : []);
  
   if (namesToJoin.length === 0 || !roomCode.trim()) {
       setError("Please enter a name and room code.");
       return;
   }


   setLoading(true);
   const code = roomCode.toUpperCase();
   const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'sumn_rooms', code);


   try {
     const snap = await getDoc(roomRef);
    
     // Generate IDs for all local players
     const newLocalIds = [];
     const newPlayerObjects = namesToJoin.map((name, index) => {
       // Unique ID generation ensuring no collisions even on same device
       const pid = index === 0 ? user.uid : `${user.uid}_${Date.now()}_${index}`;
       newLocalIds.push(pid);
       return {
           id: pid,
           name: name,
           fact: '',
           ready: false
       };
     });


     if (!snap.exists()) {
       // Create new room
       await setDoc(roomRef, {
         players: newPlayerObjects,
         phase: 'lobby',
         deck: [],
         currentCardIndex: 0,
         turnState: 'guessing',
         lastGuessedName: '',
         turnIndex: 0, // Track whose turn it is
         guesserName: '', // Track who made the guess
         hostId: user.uid
       });
     } else {
       // Join existing room
       const data = snap.data();
       let updatedPlayers = [...data.players];


       // Add new players
       newPlayerObjects.forEach(np => {
           const existingIndex = updatedPlayers.findIndex(p => p.id === np.id);
           if (existingIndex >= 0) {
               updatedPlayers[existingIndex].name = np.name;
           } else {
               updatedPlayers.push(np);
           }
       });
      
       await updateDoc(roomRef, { players: updatedPlayers });
     }


     setMyPlayerIds(newLocalIds);
     setJoined(true);
     setError(''); // Clear errors on successful join
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
              
               // If I am the host, delete the room entirely (Closing it)
               if (data.hostId === user.uid) {
                   await deleteDoc(roomRef);
               } else {
                   // If I am a guest, just remove my players
                   const updatedPlayers = data.players.filter(p => !myPlayerIds.includes(p.id));
                  
                   if (updatedPlayers.length === 0) {
                       // If room is empty after I leave, delete it
                       await deleteDoc(roomRef);
                   } else {
                        await updateDoc(roomRef, { players: updatedPlayers });
                   }
               }
           }
       } catch (err) {
           console.error("Cleanup error:", err);
           // We continue to reset local state even if firestore fails
       }
       setLoading(false);
   }


   // Reset Game State but KEEP inputs
   setJoined(false);
   setGameState(null);
   setMyPlayerIds([]);
   setError('');
   // Intentionally NOT clearing localPlayersList or roomCode
 };


 const submitFact = async (playerId, fact) => {
   if (!gameState) return;
   const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'sumn_rooms', roomCode.toUpperCase());
  
   const updatedPlayers = gameState.players.map(p =>
     p.id === playerId ? { ...p, fact: fact, ready: true } : p
   );
   await updateDoc(roomRef, { players: updatedPlayers });
 };


 const startGame = async () => {
   if (!gameState) return;
  
   const validPlayers = gameState.players.filter(p => p.fact && p.fact.trim().length > 0);
   if (validPlayers.length < 1) return;


   // Fisher-Yates shuffle
   const deck = validPlayers.map(p => ({
     text: p.fact,
     owner: p.name,
     ownerId: p.id
   }));
   for (let i = deck.length - 1; i > 0; i--) {
     const j = Math.floor(Math.random() * (i + 1));
     [deck[i], deck[j]] = [deck[j], deck[i]];
   }


   const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'sumn_rooms', roomCode.toUpperCase());
   await updateDoc(roomRef, {
     phase: 'playing',
     deck: deck,
     currentCardIndex: 0,
     turnState: 'guessing',
     turnIndex: 0,
     guesserName: '',
     lastGuessedName: ''
   });
 };


 const handleGuess = async () => {
   if (!selectedGuessedPlayer || !gameState) return;


   const currentCard = gameState.deck[gameState.currentCardIndex];
   const isCorrect = selectedGuessedPlayer.id === currentCard.ownerId;
   const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'sumn_rooms', roomCode.toUpperCase());


   // Determine who is guessing (current turn player)
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
  
   // Always rotate turn index regardless of outcome
   const nextTurnIndex = ((gameState.turnIndex || 0) + 1) % gameState.players.length;


   if (gameState.turnState === 'correct') {
       const nextIndex = gameState.currentCardIndex + 1;
       if (nextIndex >= gameState.deck.length) {
           await updateDoc(roomRef, { phase: 'finished' });
       } else {
           await updateDoc(roomRef, {
               currentCardIndex: nextIndex,
               turnState: 'guessing',
               turnIndex: nextTurnIndex,
               lastGuessedName: '',
               guesserName: ''
           });
       }
   } else {
       // Back to bowl
       const newDeck = [...gameState.deck];
       const currentCard = newDeck[gameState.currentCardIndex];
       newDeck.splice(gameState.currentCardIndex, 1);
       newDeck.push(currentCard);


       await updateDoc(roomRef, {
           deck: newDeck,
           turnState: 'guessing',
           turnIndex: nextTurnIndex,
           lastGuessedName: '',
           guesserName: ''
       });
   }
 };


 const resetGame = async () => {
   const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'sumn_rooms', roomCode.toUpperCase());
   const resetPlayers = gameState.players.map(p => ({ ...p, fact: '', ready: false }));
   await updateDoc(roomRef, {
     phase: 'lobby',
     players: resetPlayers,
     deck: [],
     currentCardIndex: 0,
     turnState: 'guessing',
     lastGuessedName: '',
     turnIndex: 0,
     guesserName: ''
   });
 };


 // --- Render Helpers ---
  if (!user) return <div className="min-h-screen bg-pink-50 flex items-center justify-center p-4">Loading...</div>;


 if (!joined) {
   return (
     <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center p-4 font-sans">
       <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
         <div className="flex justify-center mb-4">
           <Sparkles className="w-12 h-12 text-purple-600" />
         </div>
         <h1 className="text-3xl font-black text-center text-gray-800 mb-2">Sum'n 'bout Me</h1>
         <p className="text-center text-gray-500 mb-6">The ultimate party guessing game.</p>
        
         <div className="space-y-4">
          
           {/* Player Input Section */}
           <div>
               <label className="block text-sm font-bold text-gray-700 mb-1">Add Players</label>
               <div className="flex gap-2 mb-2">
                   <input
                       type="text"
                       value={inputName}
                       onChange={(e) => setInputName(e.target.value)}
                       onKeyDown={(e) => e.key === 'Enter' && addLocalPlayer()}
                       className="flex-1 px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 outline-none"
                       placeholder="Player Name"
                   />
                   <button
                       onClick={addLocalPlayer}
                       className="bg-purple-100 text-purple-700 p-3 rounded-lg hover:bg-purple-200 transition"
                   >
                       <Plus size={24} />
                   </button>
               </div>
              
               {/* Local Player List */}
               <div className="space-y-2 mb-4">
                   {localPlayersList.map((name, idx) => (
                       <div key={idx} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                           <span className="font-medium text-gray-800 flex items-center gap-2">
                               <UserPlus size={16} className="text-purple-400"/> {name}
                           </span>
                           <button onClick={() => removeLocalPlayer(idx)} className="text-red-400 hover:text-red-600">
                               <Trash2 size={16} />
                           </button>
                       </div>
                   ))}
                   {localPlayersList.length === 0 && !inputName && (
                       <p className="text-xs text-gray-400 italic">Add at least one player name.</p>
                   )}
               </div>
           </div>


           <div>
             <label className="block text-sm font-bold text-gray-700 mb-1">Room Code</label>
             <input
               type="text"
               value={roomCode}
               onChange={(e) => setRoomCode(e.target.value)}
               className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 outline-none uppercase tracking-widest"
               placeholder="e.g. FUN"
             />
           </div>
          
           {error && <p className="text-red-500 text-sm text-center bg-red-50 p-2 rounded">{error}</p>}
          
           <button
             onClick={handleJoin}
             disabled={loading || (localPlayersList.length === 0 && !inputName) || !roomCode}
             className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-lg shadow-lg transform transition active:scale-95 disabled:opacity-50 disabled:scale-100"
           >
             {loading ? "Joining..." : (localPlayersList.length > 1 ? `Join with ${localPlayersList.length} Players` : "Join Party")}
           </button>
         </div>
       </div>
     </div>
   );
 }


 // --- Game Screens ---


 // 1. Lobby Phase
 if (!gameState || gameState.phase === 'lobby') {
   const players = gameState ? gameState.players : [];
   const isHost = gameState && gameState.hostId === user.uid;


   return (
     <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
       <div className="max-w-md w-full space-y-6">
         <div className="bg-white rounded-xl shadow-sm p-6 text-center border-b-4 border-purple-200">
           <h2 className="text-xl font-bold text-gray-800">Room: {roomCode.toUpperCase()}</h2>
           <p className="text-gray-500">Lobby Phase</p>
         </div>


         <div className="bg-white rounded-xl shadow-sm overflow-hidden">
           <div className="p-4 bg-gray-100 border-b flex justify-between items-center">
             <span className="font-bold text-gray-700 flex items-center gap-2">
               <Users size={18}/> Players ({players.length})
             </span>
           </div>
           <ul className="divide-y max-h-[60vh] overflow-y-auto">
             {players.map((p) => (
               <li key={p.id} className="p-4 flex items-center justify-between">
                 <span className="font-medium text-gray-800">{p.name}</span>
                 {isMyPlayer(p.id) && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">You</span>}
               </li>
             ))}
           </ul>
         </div>


         {/* Action Buttons */}
         <div className="space-y-3">
              <button
               onClick={async () => {
                   const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'sumn_rooms', roomCode.toUpperCase());
                   await updateDoc(roomRef, { phase: 'input' });
               }}
               className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2"
             >
               Start Input Phase <Play size={20} />
             </button>
            
             <button
                 onClick={handleLeave}
                 className={`w-full font-bold py-3 rounded-xl border flex items-center justify-center gap-2 transition ${isHost ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
               >
                 {isHost ? <><Trash2 size={18} /> Close Room (Kick All)</> : <><LogOut size={18} /> Leave Room</>}
             </button>
         </div>
         <div className="h-4" />
       </div>
     </div>
   );
 }


 // 2. Input Phase
 if (gameState.phase === 'input') {
   const myPlayers = gameState.players.filter(p => isMyPlayer(p.id));
   const completedCount = gameState.players.filter(p => p.ready).length;
   const totalCount = gameState.players.length;


   return (
     <div className="min-h-screen bg-purple-50 p-4 flex flex-col items-center justify-center">
       <div className="max-w-md w-full flex flex-col space-y-6">
         <div className="bg-white p-6 rounded-2xl shadow-sm text-center">
            <div className="inline-block p-3 bg-purple-100 rounded-full mb-4">
               <HelpCircle className="w-8 h-8 text-purple-600" />
            </div>
            <h2 className="text-2xl font-black text-gray-800 mb-2">Write Sum'n!</h2>
            <p className="text-gray-600">
              Write a fact about yourself that nobody here knows.
            </p>
         </div>


         {/* List of Input Cards for My Players */}
         <div className="flex flex-col gap-4 max-h-[50vh] overflow-y-auto">
         {myPlayers.map(player => (
            <div key={player.id} className={`p-6 rounded-2xl shadow-md border-2 transition-all ${player.ready ? 'bg-green-50 border-green-200' : 'bg-white border-purple-100'}`}>
               <div className="flex items-center justify-between mb-3">
                   <span className="font-bold text-lg text-gray-800">{player.name}</span>
                   {player.ready && <CheckCircle className="text-green-500" size={24} />}
               </div>
              
               {!player.ready ? (
                   <div className="flex flex-col gap-3">
                       <textarea
                           className="w-full p-3 rounded-lg bg-gray-50 border border-gray-200 focus:border-purple-500 focus:bg-white outline-none resize-none"
                           placeholder="I have a pet iguana..."
                           rows={3}
                           id={`input-${player.id}`}
                       />
                       <button
                           onClick={() => {
                               const val = document.getElementById(`input-${player.id}`).value;
                               if(val.trim()) submitFact(player.id, val);
                           }}
                           className="w-full bg-purple-600 text-white font-bold py-2 rounded-lg"
                       >
                           Submit Secret
                       </button>
                   </div>
               ) : (
                   <p className="text-green-700 italic">Secret locked in.</p>
               )}
            </div>
         ))}
         </div>


         <div className="bg-white rounded-xl p-4 shadow-sm">
           <div className="flex justify-between text-sm font-bold text-gray-500 mb-2">
             <span>Group Progress</span>
             <span>{completedCount}/{totalCount} Ready</span>
           </div>
           <div className="w-full bg-gray-200 rounded-full h-3">
             <div
               className="bg-green-500 h-3 rounded-full transition-all duration-500"
               style={{ width: `${(completedCount / totalCount) * 100}%` }}
             />
           </div>
         </div>


         <div className="space-y-3">
             <button
               onClick={startGame}
               disabled={completedCount < totalCount}
               className={`w-full font-bold py-4 rounded-xl shadow-lg transition-all ${
                 completedCount < totalCount
                   ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                   : 'bg-green-600 text-white hover:bg-green-700 animate-pulse'
               }`}
             >
               {completedCount === totalCount ? "Everyone is Ready! Start Game" : "Waiting for players..."}
             </button>


             <button
                 onClick={handleLeave}
                 className="w-full bg-white text-gray-500 font-bold py-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition flex items-center justify-center gap-2"
               >
                 <LogOut size={18} /> Leave / Back to Home
             </button>
         </div>


       </div>
     </div>
   );
 }


 // 3. Playing Phase
 if (gameState.phase === 'playing') {
   const currentCard = gameState.deck[gameState.currentCardIndex];
   const turnState = gameState.turnState || 'guessing';
  
   // Determine whose turn it is
   const turnIdx = (gameState.turnIndex || 0) % gameState.players.length;
   const currentTurnPlayer = gameState.players[turnIdx];
   const nextTurnPlayer = gameState.players[(turnIdx + 1) % gameState.players.length];
  
   let bgStyle = "bg-gray-900";
   if (turnState === 'correct') bgStyle = "bg-green-600";
   if (turnState === 'incorrect') bgStyle = "bg-red-600";
  
   return (
     <div className={`min-h-screen ${bgStyle} transition-colors duration-500 p-4 flex flex-col items-center justify-center relative overflow-hidden`}>
      
       <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full mix-blend-overlay filter blur-3xl opacity-20 animate-blob"></div>
       <div className="absolute bottom-0 right-0 w-64 h-64 bg-white rounded-full mix-blend-overlay filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>


       <div className="relative w-full max-w-md z-10">
         <div className="text-center mb-6">
           <span className="bg-black/30 text-white px-4 py-1 rounded-full text-sm font-medium backdrop-blur-sm">
             Secret {gameState.currentCardIndex + 1} of {gameState.deck.length}
           </span>
         </div>


         <div className="bg-white rounded-3xl shadow-2xl overflow-hidden min-h-[500px] flex flex-col">
          
           <div className="p-8 flex-shrink-0 bg-gradient-to-b from-white to-gray-50 border-b">
             <p className="text-2xl md:text-3xl font-black text-center text-gray-800 leading-tight">
               "{currentCard.text}"
             </p>
           </div>


           <div className="flex-1 p-6 bg-gray-50 flex flex-col">
            
             {turnState === 'guessing' && (
               <div className="flex-1 flex flex-col">
                  <div className="bg-purple-100 p-3 rounded-xl mb-4 text-center">
                    <p className="text-purple-800 text-sm font-bold uppercase tracking-wider">Turn</p>
                    <p className="text-2xl font-black text-purple-700">{currentTurnPlayer ? currentTurnPlayer.name : "..."}</p>
                  </div>


                  <p className="text-gray-500 font-bold text-center mb-4 uppercase text-xs tracking-wider">This Sum'n 'bout who?</p>
                 
                  <div className="flex-1 overflow-y-auto space-y-2 mb-4 max-h-[250px] pr-2">
                     {gameState.players.map(p => (
                       <button
                         key={p.id}
                         onClick={() => setSelectedGuessedPlayer(p)}
                         className={`w-full p-3 rounded-xl text-left font-bold transition-all flex items-center justify-between ${
                           selectedGuessedPlayer?.id === p.id
                           ? 'bg-purple-600 text-white shadow-md transform scale-[1.02]'
                           : 'bg-white text-gray-700 hover:bg-purple-50 border border-gray-200'
                         }`}
                       >
                         {p.name}
                         {selectedGuessedPlayer?.id === p.id && <CheckCircle size={18} />}
                       </button>
                     ))}
                  </div>


                  <button
                   onClick={handleGuess}
                   disabled={!selectedGuessedPlayer}
                   className="w-full bg-gray-900 text-white font-bold py-4 rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95 transition"
                  >
                    Confirm Guess
                  </button>
               </div>
             )}


             {turnState === 'correct' && (
               <div className="flex-1 flex flex-col items-center justify-center text-center animate-in fade-in slide-in-from-bottom-8 duration-500">
                   <div className="mb-4 bg-green-100 p-4 rounded-full">
                       <ThumbsUp className="w-12 h-12 text-green-600" />
                   </div>
                   <div className="mb-6">
                       <p className="text-sm font-bold text-green-700 opacity-80 uppercase tracking-widest mb-1">
                           {gameState.guesserName} guessed {gameState.lastGuessedName}
                       </p>
                       <h2 className="text-3xl font-black text-green-600">That's Sum'n 'bout Me!</h2>
                   </div>
                   <p className="text-gray-600 text-lg mb-2">
                       Correct! It was <strong className="text-gray-900">{currentCard.owner}</strong>.
                   </p>
                  
                   <div className="bg-purple-50 p-4 rounded-xl border-2 border-purple-100 mb-6 w-full">
                       <div className="flex items-center justify-center gap-2 text-purple-600 font-bold mb-1">
                           <Mic size={20} /> Story Time
                       </div>
                       <p className="text-sm text-purple-800">
                           Spill the beans! Tell the group the story behind this fact.
                       </p>
                   </div>


                   <button
                       onClick={handleNextAfterResult}
                       className="w-full bg-green-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-green-700 transform active:scale-95 transition flex items-center justify-center gap-2"
                   >
                        Next Fact <ArrowRight size={20} />
                   </button>
                   <p className="text-white/60 text-xs mt-3">Up Next: {nextTurnPlayer ? nextTurnPlayer.name : "..."}</p>
               </div>
             )}


             {turnState === 'incorrect' && (
               <div className="flex-1 flex flex-col items-center justify-center text-center animate-in zoom-in duration-300">
                   <div className="mb-6 bg-red-100 p-4 rounded-full">
                       <XCircle className="w-12 h-12 text-red-600" />
                   </div>
                   <div className="mb-6">
                       <p className="text-sm font-bold text-red-300 opacity-80 uppercase tracking-widest mb-1">
                           {gameState.guesserName} guessed {gameState.lastGuessedName}
                       </p>
                       <h2 className="text-2xl font-black text-red-600 leading-tight">That's not Sum'n 'bout {gameState.lastGuessedName}!</h2>
                   </div>
                  
                   <p className="text-gray-500 mb-8 text-sm">
                       Back to the bowl it goes!
                   </p>
                   <button
                       onClick={handleNextAfterResult}
                       className="w-full bg-gray-900 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-gray-800 transform active:scale-95 transition"
                   >
                       Try Another Fact
                   </button>
                   <p className="text-white/60 text-xs mt-3">Up Next: {nextTurnPlayer ? nextTurnPlayer.name : "..."}</p>
               </div>
             )}


           </div>
         </div>
        
       </div>
     </div>
   );
 }


 // 4. Finished Phase
 if (gameState.phase === 'finished') {
   return (
     <div className="min-h-screen bg-indigo-600 flex items-center justify-center p-4">
       <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md text-center space-y-8">
         <div>
            <h1 className="text-4xl font-black text-gray-800 mb-2">Game Over!</h1>
            <p className="text-gray-500">You cleared the whole bowl!</p>
         </div>
        
         <div className="grid grid-cols-2 gap-4">
            <div className="bg-indigo-50 p-4 rounded-xl">
               <span className="block text-3xl font-bold text-indigo-600">{gameState.players.length}</span>
               <span className="text-xs text-gray-500 uppercase font-bold">Friends</span>
            </div>
            <div className="bg-purple-50 p-4 rounded-xl">
               <span className="block text-3xl font-bold text-purple-600">{gameState.deck.length}</span>
               <span className="text-xs text-gray-500 uppercase font-bold">Secrets</span>
            </div>
         </div>


         <div className="space-y-3">
           <button
             onClick={resetGame}
             className="w-full bg-gray-900 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 hover:bg-gray-800 transition"
           >
             <RotateCcw size={20} /> Play Again (Same Group)
           </button>
           <button
             onClick={handleLeave}
             className="w-full bg-white text-gray-600 font-bold py-4 rounded-xl border-2 border-gray-200 flex items-center justify-center gap-2 hover:bg-gray-50 transition"
           >
             <LogOut size={20} /> Leave / Back to Home
           </button>
         </div>
       </div>
     </div>
   );
 }


 return null;
}

