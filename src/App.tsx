import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GRID_COLS, GRID_ROWS, INITIAL_ROWS, MAX_VALUE, TIME_LIMIT, BlockData, GameMode } from './types';
import { cn } from './lib/utils';
import { Trophy, Timer, RotateCcw, Play, Pause, Home, AlertCircle, Music, Volume2, VolumeX, Info, X, Bell, BellOff } from 'lucide-react';
import confetti from 'canvas-confetti';

const BG_MUSIC_URL = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3'; // Stable fallback
const FESTIVE_MUSIC_URL = 'https://www.mfiles.co.uk/mp3-downloads/chinese-traditional-dragon-dance.mp3'; // Festive & Stable Chinese Music

const HORSE_PHRASES = [
  '马到成功', '龙马精神', '万马奔腾', '策马扬鞭', '跃马扬鞭',
  '快马加鞭', '汗马功劳', '一马当先', '马上发财', '马上有钱',
  '马上封侯', '马上平安', '马上如意', '马上开运', '马运亨通',
  '马到功成', '龙马舞春', '金马送福', '马年大吉', '马不停蹄'
];

const generateId = () => Math.random().toString(36).substring(2, 9);

const createRow = (rowIndex: number): BlockData[] => {
  return Array.from({ length: GRID_COLS }, (_, colIndex) => ({
    id: generateId(),
    value: Math.floor(Math.random() * MAX_VALUE) + 1,
    row: rowIndex,
    col: colIndex,
  }));
};

export default function App() {
  const [mode, setMode] = useState<GameMode | null>(null);
  const [grid, setGrid] = useState<BlockData[]>([]);
  const [target, setTarget] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [isPaused, setIsPaused] = useState(false);
  const [highScore, setHighScore] = useState(0);
  const [isMusicOn, setIsMusicOn] = useState(true);
  const [isSfxOn, setIsSfxOn] = useState(true);
  const [showRules, setShowRules] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [bgWords, setBgWords] = useState<{ text: string, x: number, y: number, size: number }[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const playPromiseRef = useRef<Promise<void> | null>(null);

  // Initialize background words
  useEffect(() => {
    const handleGlobalClick = () => setHasInteracted(true);
    window.addEventListener('click', handleGlobalClick);
    
    const words = [];
    const rows = 15;
    const cols = 12;
    const shuffledPhrases = [...HORSE_PHRASES, ...HORSE_PHRASES, ...HORSE_PHRASES].sort(() => Math.random() - 0.5);
    
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const index = r * cols + c;
        if (index < shuffledPhrases.length) {
          words.push({
            text: shuffledPhrases[index],
            x: (c / cols) * 100 + (Math.random() * 3),
            y: (r / rows) * 100 + (Math.random() * 3),
            size: Math.random() * 6 + 12,
          });
        }
      }
    }
    setBgWords(words);

    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  // Procedural Sound Generation
  const playSfx = (type: 'click' | 'success' | 'gameover') => {
    if (!isSfxOn) return;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      
      if (type === 'click' || type === 'success') {
        // Firework explosion sound helper
        const playExplosion = (delay: number, freq: number, vol: number) => {
          const bufferSize = ctx.sampleRate * 0.3;
          const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
          }

          const noise = ctx.createBufferSource();
          noise.buffer = buffer;

          const filter = ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(freq, ctx.currentTime + delay);
          filter.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + delay + 0.2);

          const gain = ctx.createGain();
          gain.gain.setValueAtTime(vol, ctx.currentTime + delay);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + delay + 0.2);

          noise.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);

          noise.start(ctx.currentTime + delay);
          noise.stop(ctx.currentTime + delay + 0.3);
        };

        // Main boom
        playExplosion(0, type === 'success' ? 3000 : 1500, 0.3);
        
        // Crackles for success
        if (type === 'success') {
          for (let i = 0; i < 5; i++) {
            playExplosion(0.1 + i * 0.05, 4000 + Math.random() * 2000, 0.1);
          }
        }
        
        // Low thump
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(100, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.2);
        oscGain.gain.setValueAtTime(0.4, ctx.currentTime);
        oscGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        osc.connect(oscGain);
        oscGain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      } else if (type === 'gameover') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.5);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      }
    } catch (e) {
      console.error("Audio context error", e);
    }
  };

  // Background Music Logic
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.src = FESTIVE_MUSIC_URL;
      audioRef.current.loop = true;
      audioRef.current.volume = 0.3;
      audioRef.current.preload = "auto";
      
      audioRef.current.onerror = () => {
        console.warn("Festive music failed to load, trying fallback...");
        if (audioRef.current && audioRef.current.src !== BG_MUSIC_URL) {
          audioRef.current.src = BG_MUSIC_URL;
          audioRef.current.load();
          if (isMusicOn && !isPaused && !gameOver && hasInteracted) {
            playPromiseRef.current = audioRef.current.play();
            playPromiseRef.current
              .catch(e => {
                if (e instanceof Error && e.name !== 'AbortError') {
                  console.error("Fallback audio play failed:", e);
                }
              })
              .finally(() => {
                playPromiseRef.current = null;
              });
          }
        }
      };
      audioRef.current.load();
    }

    const playMusic = async () => {
      if (!audioRef.current) return;

      if (isMusicOn && !isPaused && !gameOver && hasInteracted) {
        try {
          if (audioRef.current.paused) {
            console.log("Attempting to play music with URL:", audioRef.current.src);
            playPromiseRef.current = audioRef.current.play();
            await playPromiseRef.current;
            console.log("Music playing successfully");
          }
        } catch (e) {
          // Ignore interruption errors as they are expected during rapid state changes
          if (e instanceof Error && e.name !== 'AbortError') {
            console.error("Audio play failed:", e);
          }
        } finally {
          playPromiseRef.current = null;
        }
      } else {
        // If there's a pending play request, wait for it before pausing
        if (playPromiseRef.current) {
          try {
            await playPromiseRef.current;
          } catch (e) {
            // Ignore errors from the interrupted play
          }
        }
        audioRef.current.pause();
      }
    };

    if (audioRef.current) {
      audioRef.current.oncanplaythrough = () => {
        console.log("Audio can play through");
        playMusic();
      };
    }

    playMusic();

    return () => {
      if (playPromiseRef.current) {
        playPromiseRef.current.then(() => audioRef.current?.pause()).catch(() => {});
      } else {
        audioRef.current?.pause();
      }
    };
  }, [isMusicOn, isPaused, gameOver, hasInteracted]);

  // Load high score
  useEffect(() => {
    const saved = localStorage.getItem('sum-eliminate-highscore');
    if (saved) setHighScore(parseInt(saved));
  }, []);

  // Update high score
  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('sum-eliminate-highscore', score.toString());
    }
  }, [score, highScore]);

  const generateTarget = useCallback(() => {
    // Pick a target that is likely achievable
    const values = [10, 12, 15, 18, 20, 25];
    setTarget(values[Math.floor(Math.random() * values.length)]);
  }, []);

  const startGame = (selectedMode: GameMode) => {
    setHasInteracted(true);
    setMode(selectedMode);
    const initialGrid: BlockData[] = [];
    for (let i = 0; i < INITIAL_ROWS; i++) {
      initialGrid.push(...createRow(GRID_ROWS - 1 - i));
    }
    setGrid(initialGrid);
    setScore(0);
    setGameOver(false);
    setSelectedIds([]);
    setTimeLeft(TIME_LIMIT);
    setIsPaused(false);
    generateTarget();
  };

  const addRow = useCallback(() => {
    setGrid((prev) => {
      // Check if any block is at the top row (row 0)
      const isFull = prev.some((b) => b.row === 0);
      if (isFull) {
        setGameOver(true);
        playSfx('gameover');
        return prev;
      }

      // Shift all existing blocks up
      const shifted = prev.map((b) => ({ ...b, row: b.row - 1 }));
      
      // Add new row at the bottom (row GRID_ROWS - 1)
      const newRow = createRow(GRID_ROWS - 1);
      return [...shifted, ...newRow];
    });
    
    if (mode === 'time') {
      setTimeLeft(TIME_LIMIT);
    }
  }, [mode]);

  // Timer logic for Time Mode
  useEffect(() => {
    if (mode === 'time' && !gameOver && !isPaused) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            addRow();
            return TIME_LIMIT;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [mode, gameOver, isPaused, addRow]);

  const handleBlockClick = (id: string) => {
    if (gameOver || isPaused) return;

    playSfx('click');
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((i) => i !== id);
      }
      return [...prev, id];
    });
  };

  // Check sum whenever selectedIds changes
  useEffect(() => {
    const currentSum = grid
      .filter((b) => selectedIds.includes(b.id))
      .reduce((sum, b) => sum + b.value, 0);

    if (currentSum === target) {
      // Success!
      playSfx('success');
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#FFD700', '#C41E3A', '#FFFFFF']
      });

      setScore((s) => s + selectedIds.length * 10);
      
      setGrid((prev) => {
        const remaining = prev.filter((b) => !selectedIds.includes(b.id));
        const newGrid: BlockData[] = [];
        
        // Apply gravity for each column
        for (let c = 0; c < GRID_COLS; c++) {
          const colBlocks = remaining
            .filter((b) => b.col === c)
            .sort((a, b) => b.row - a.row); // Sort from bottom to top
          
          colBlocks.forEach((block, index) => {
            newGrid.push({
              ...block,
              row: GRID_ROWS - 1 - index // Shift to the bottom-most available row
            });
          });
        }
        return newGrid;
      });

      setSelectedIds([]);
      generateTarget();
      
      if (mode === 'classic') {
        addRow();
      } else if (mode === 'time') {
        setTimeLeft(TIME_LIMIT);
      }
    } else if (currentSum > target) {
      // Exceeded target, clear selection
      setSelectedIds([]);
    }
  }, [selectedIds, target, grid, mode, addRow, generateTarget]);

  if (!mode) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-horse-dark relative overflow-hidden">
        {/* Interaction Overlay for Audio */}
        {!hasInteracted && (
          <div 
            onClick={() => {
              setHasInteracted(true);
              // Explicitly trigger play on user click to satisfy browser requirements
              if (audioRef.current) {
                audioRef.current.play().catch(e => console.error("Initial play failed:", e));
              }
            }}
            className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-[2px] flex items-center justify-center cursor-pointer group"
          >
            <motion.div 
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="bg-horse-gold text-horse-dark px-8 py-4 rounded-full font-serif font-bold text-xl shadow-[0_0_30px_rgba(255,255,0,0.4)] group-hover:bg-white transition-colors"
            >
              点击开启马年好运 (开启音乐)
            </motion.div>
          </div>
        )}

        {/* Background Words */}
        <div className="absolute inset-0 z-0">
          {bgWords.map((word, i) => (
            <div 
              key={i} 
              className="bg-word"
              style={{ 
                left: `${word.x}%`, 
                top: `${word.y}%`, 
                fontSize: `${word.size}px`,
                transform: `rotate(${Math.random() * 20 - 10}deg)`
              }}
            >
              {word.text}
            </div>
          ))}
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full glass-panel p-8 text-center space-y-8 border-horse-gold/40 shadow-[0_0_50px_rgba(255,255,0,0.2)] z-10"
        >
          <div className="space-y-2">
            <h1 className="text-6xl font-cursive font-bold tracking-tighter text-horse-gold italic drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] animate-float">马上消除烦恼</h1>
            <p className="text-horse-gold/60 font-serif italic text-sm uppercase tracking-widest">马到成功 · 烦恼全消</p>
          </div>

          <div className="grid gap-4">
            <button 
              onClick={() => startGame('classic')}
              className="group relative flex items-center justify-between p-6 bg-horse-red/40 hover:bg-horse-gold rounded-xl transition-all duration-500 border border-horse-gold/20 overflow-hidden"
            >
              <div className="text-left z-10">
                <h3 className="text-xl font-serif font-bold group-hover:text-horse-dark transition-colors">经典模式</h3>
                <p className="text-sm text-horse-gold/60 group-hover:text-horse-dark transition-colors">每次成功消除后新增一行</p>
              </div>
              <Play className="w-8 h-8 text-horse-gold group-hover:text-horse-dark z-10 transition-colors" />
              <div className="absolute inset-0 bg-gradient-to-r from-horse-gold/0 to-horse-gold/20 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>

            <button 
              onClick={() => startGame('time')}
              className="group relative flex items-center justify-between p-6 bg-horse-red/40 hover:bg-horse-red rounded-xl transition-all duration-500 border border-horse-gold/20 overflow-hidden"
            >
              <div className="text-left z-10">
                <h3 className="text-xl font-serif font-bold group-hover:text-white transition-colors">计时模式</h3>
                <p className="text-sm text-horse-gold/60 group-hover:text-white transition-colors">在倒计时结束前完成挑战</p>
              </div>
              <Timer className="w-8 h-8 text-horse-gold group-hover:text-white z-10 transition-colors" />
              <div className="absolute inset-0 bg-gradient-to-r from-horse-red/0 to-horse-red/20 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </div>

          <div className="flex justify-center gap-4">
            <button 
              onClick={() => setIsMusicOn(!isMusicOn)}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-horse-gold/10 border border-horse-gold/30 text-horse-gold hover:bg-horse-gold/20 transition-all"
            >
              {isMusicOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
              <span className="text-xs font-serif uppercase tracking-wider">{isMusicOn ? '音乐开' : '音乐关'}</span>
            </button>
            <button 
              onClick={() => setIsSfxOn(!isSfxOn)}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-horse-gold/10 border border-horse-gold/30 text-horse-gold hover:bg-horse-gold/20 transition-all"
            >
              {isSfxOn ? <Bell size={16} /> : <BellOff size={16} />}
              <span className="text-xs font-serif uppercase tracking-wider">{isSfxOn ? '音效开' : '音效关'}</span>
            </button>
            <button 
              onClick={() => setShowRules(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-horse-gold/10 border border-horse-gold/30 text-horse-gold hover:bg-horse-gold/20 transition-all"
            >
              <Info size={16} />
              <span className="text-xs font-serif uppercase tracking-wider">游戏规则</span>
            </button>
          </div>

          <div className="pt-4 border-t border-horse-gold/10 flex justify-between items-center text-horse-gold/40 font-serif text-xs italic">
            <span>最高分: {highScore}</span>
            <span>马年限定版</span>
          </div>
        </motion.div>

        {/* Rules Modal */}
        <AnimatePresence>
          {showRules && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="max-w-md w-full glass-panel p-8 relative border-horse-gold/50"
              >
                <button 
                  onClick={() => setShowRules(false)}
                  className="absolute top-4 right-4 text-horse-gold/60 hover:text-horse-gold transition-colors"
                >
                  <X size={24} />
                </button>
                <h2 className="text-3xl font-serif font-bold text-horse-gold mb-6 text-center italic">游戏规则</h2>
                <div className="space-y-4 text-horse-gold/80 font-serif leading-relaxed">
                  <p>1. <span className="text-horse-gold font-bold">求和消除</span>：点击数字方块，使它们的总和等于顶部的“目标值”。</p>
                  <p>2. <span className="text-horse-gold font-bold">马到成功</span>：消除成功后，选中的方块会消失，并获得积分。</p>
                  <p>3. <span className="text-horse-gold font-bold">防止触顶</span>：如果方块堆积到最顶层，游戏即告结束。</p>
                  <p>4. <span className="text-horse-gold font-bold">经典模式</span>：每次成功消除后，底部会新增一行方块。</p>
                  <p>5. <span className="text-horse-gold font-bold">计时模式</span>：必须在倒计时结束前完成消除，否则会强制新增一行。</p>
                </div>
                <button 
                  onClick={() => setShowRules(false)}
                  className="w-full mt-8 py-3 bg-horse-gold text-horse-dark font-bold rounded-xl hover:bg-white transition-all shadow-[0_4px_0_#8B6508] active:translate-y-1 active:shadow-none"
                >
                  我知道了
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-horse-dark flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Words */}
      <div className="absolute inset-0 z-0">
        {bgWords.map((word, i) => (
          <div 
            key={i} 
            className="bg-word"
            style={{ 
              left: `${word.x}%`, 
              top: `${word.y}%`, 
              fontSize: `${word.size}px`,
              transform: `rotate(${Math.random() * 20 - 10}deg)`
            }}
          >
            {word.text}
          </div>
        ))}
      </div>

      {/* Game Header */}
      <div className="w-full max-w-md mb-6 flex items-center justify-between z-10">
        <div className="flex flex-col">
          <span className="text-horse-gold/50 text-xs font-serif italic uppercase tracking-widest">目标值</span>
          <span className="text-5xl font-serif font-bold text-horse-gold tabular-nums drop-shadow-lg">{target}</span>
        </div>
        
        <div className="flex flex-col items-center">
          <span className="text-horse-gold/50 text-xs font-serif italic uppercase tracking-widest">当前得分</span>
          <span className="text-4xl font-serif font-bold text-white tabular-nums">{score}</span>
        </div>

        <div className="flex flex-col items-end">
          <span className="text-horse-gold/50 text-xs font-serif italic uppercase tracking-widest">
            {mode === 'time' ? '剩余时间' : '模式'}
          </span>
          {mode === 'time' ? (
            <span className={cn(
              "text-4xl font-serif font-bold tabular-nums",
              timeLeft <= 3 ? "text-white animate-pulse" : "text-horse-gold"
            )}>
              {timeLeft}秒
            </span>
          ) : (
            <span className="text-2xl font-serif font-bold text-horse-gold/80 italic">经典</span>
          )}
        </div>
      </div>

      {/* Game Board Container */}
      <div className="relative glass-panel p-3 shadow-[0_0_60px_rgba(255,215,0,0.2)] border-2 border-horse-gold/40">
        <div 
          className="grid gap-1.5 bg-black/40 rounded-lg overflow-hidden"
          style={{ 
            gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))`,
            width: 'min(90vw, 400px)',
            aspectRatio: `${GRID_COLS}/${GRID_ROWS}`
          }}
        >
          {/* Background Grid */}
          {Array.from({ length: GRID_ROWS * GRID_COLS }).map((_, i) => (
            <div key={`bg-${i}`} className="bg-horse-gold/5 border border-horse-gold/10" />
          ))}

          {/* Active Blocks */}
          <div className="absolute inset-3 grid gap-1.5 pointer-events-none"
               style={{ gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))` }}>
            <AnimatePresence mode="popLayout">
              {grid.map((block) => (
                <motion.button
                  key={block.id}
                  layout
                  initial={{ scale: 0, opacity: 0, rotate: -10 }}
                  animate={{ 
                    scale: 1, 
                    opacity: 1,
                    rotate: 0,
                    gridRow: block.row + 1,
                    gridColumn: block.col + 1,
                  }}
                  exit={{ scale: 0, opacity: 0, rotate: 10 }}
                  onClick={() => handleBlockClick(block.id)}
                  className={cn(
                    "pointer-events-auto flex items-center justify-center rounded-lg font-serif font-bold text-xl transition-all duration-300 border",
                    selectedIds.includes(block.id) 
                      ? "bg-horse-gold text-horse-dark border-white shadow-[0_0_20px_rgba(255,215,0,0.6)] scale-95" 
                      : "bg-horse-red/60 text-horse-gold border-horse-gold/30 hover:bg-horse-red hover:border-horse-gold/60 active:scale-90"
                  )}
                >
                  {block.value}
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Pause Overlay */}
        <AnimatePresence>
          {isPaused && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center rounded-2xl"
            >
              <h2 className="text-4xl font-serif font-bold text-horse-gold mb-8 italic">马不停蹄</h2>
              <button 
                onClick={() => setIsPaused(false)}
                className="p-6 bg-horse-gold text-horse-dark rounded-full hover:scale-110 transition-transform shadow-[0_0_30px_rgba(255,215,0,0.4)]"
              >
                <Play className="w-10 h-10 fill-current" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Game Over Overlay */}
        <AnimatePresence>
          {gameOver && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute inset-0 z-30 bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center rounded-2xl p-8 text-center border-2 border-horse-gold/50"
            >
              <Trophy className="w-20 h-20 text-horse-gold mb-4 drop-shadow-[0_0_20px_rgba(255,215,0,0.5)]" />
              <h2 className="text-5xl font-serif font-bold text-horse-gold mb-2 italic">马到成功</h2>
              <p className="text-horse-gold/60 font-serif italic mb-8">烦恼已消，福气临门</p>
              
              <div className="grid grid-cols-2 gap-6 w-full mb-10">
                <div className="bg-horse-red/30 p-5 rounded-2xl border border-horse-gold/20">
                  <span className="block text-xs text-horse-gold/50 uppercase font-serif italic tracking-widest mb-1">本次得分</span>
                  <span className="text-3xl font-serif font-bold text-white">{score}</span>
                </div>
                <div className="bg-horse-red/30 p-5 rounded-2xl border border-horse-gold/20">
                  <span className="block text-xs text-horse-gold/50 uppercase font-serif italic tracking-widest mb-1">历史最高</span>
                  <span className="text-3xl font-serif font-bold text-horse-gold">{highScore}</span>
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => startGame(mode)}
                  className="flex items-center gap-2 px-8 py-4 bg-horse-gold text-horse-dark font-serif font-bold rounded-xl hover:bg-white transition-all shadow-[0_4px_0_#8B6508] active:translate-y-1 active:shadow-none"
                >
                  <RotateCcw className="w-5 h-5" /> 再战一回
                </button>
                <button 
                  onClick={() => setMode(null)}
                  className="flex items-center gap-2 px-8 py-4 bg-horse-red text-horse-gold font-serif font-bold rounded-xl hover:bg-horse-red/80 transition-all border border-horse-gold/30"
                >
                  <Home className="w-5 h-5" /> 返回主页
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Controls */}
      <div className="mt-10 flex items-center gap-6">
        <button 
          onClick={() => setIsMusicOn(!isMusicOn)}
          className="p-4 glass-panel hover:bg-horse-gold/20 transition-all text-horse-gold"
        >
          {isMusicOn ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
        </button>
        <button 
          onClick={() => setIsSfxOn(!isSfxOn)}
          className="p-4 glass-panel hover:bg-horse-gold/20 transition-all text-horse-gold"
        >
          {isSfxOn ? <Bell className="w-6 h-6" /> : <BellOff className="w-6 h-6" />}
        </button>
        <button 
          onClick={() => setIsPaused(!isPaused)}
          disabled={gameOver}
          className="p-4 glass-panel hover:bg-horse-gold/20 transition-all text-horse-gold disabled:opacity-50"
        >
          {isPaused ? <Play className="w-6 h-6" /> : <Pause className="w-6 h-6" />}
        </button>
        <button 
          onClick={() => startGame(mode)}
          className="p-4 glass-panel hover:bg-horse-gold/20 transition-all text-horse-gold"
        >
          <RotateCcw className="w-6 h-6" />
        </button>
        <button 
          onClick={() => setMode(null)}
          className="p-4 glass-panel hover:bg-horse-gold/20 transition-all text-horse-gold"
        >
          <Home className="w-6 h-6" />
        </button>
      </div>

      {/* Instructions */}
      <div className="mt-10 text-center max-w-xs">
        <p className="text-horse-gold/40 text-xs font-serif italic leading-relaxed tracking-wide">
          马到成功，烦恼全消。<br />
          点击数字使其总和契合天命之数。
        </p>
      </div>
    </div>
  );
}
