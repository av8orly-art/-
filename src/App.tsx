import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GRID_COLS, GRID_ROWS, INITIAL_ROWS, MAX_VALUE, TIME_LIMIT, BlockData, GameMode } from './types';
import { cn } from './lib/utils';
import { Trophy, Timer, RotateCcw, Play, Pause, Home, AlertCircle, Music, Volume2, VolumeX } from 'lucide-react';
import confetti from 'canvas-confetti';

const BG_MUSIC_URL = 'https://cdn.pixabay.com/audio/2022/01/18/audio_d0a13f69d2.mp3'; // Elegant orchestral track

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
  const [isMusicOn, setIsMusicOn] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Background Music Logic
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio(BG_MUSIC_URL);
      audioRef.current.loop = true;
      audioRef.current.volume = 0.3;
    }

    if (isMusicOn && !isPaused && !gameOver) {
      audioRef.current.play().catch(e => console.log("Audio play blocked", e));
    } else {
      audioRef.current.pause();
    }

    return () => {
      audioRef.current?.pause();
    };
  }, [isMusicOn, isPaused, gameOver]);

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
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#10b981', '#34d399', '#6ee7b7']
      });

      setScore((s) => s + selectedIds.length * 10);
      setGrid((prev) => prev.filter((b) => !selectedIds.includes(b.id)));
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
      <div className="min-h-screen flex items-center justify-center p-6 bg-zinc-950 royal-pattern">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full glass-panel p-8 text-center space-y-8 border-royal-gold/40 shadow-[0_0_50px_rgba(212,175,55,0.15)]"
        >
          <div className="space-y-2">
            <h1 className="text-6xl font-serif font-bold tracking-tighter text-royal-gold italic drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">皇家消除</h1>
            <p className="text-royal-gold/60 font-serif italic text-sm uppercase tracking-widest">Master the Royal Sums</p>
          </div>

          <div className="grid gap-4">
            <button 
              onClick={() => startGame('classic')}
              className="group relative flex items-center justify-between p-6 bg-royal-purple/40 hover:bg-royal-gold rounded-xl transition-all duration-500 border border-royal-gold/20 overflow-hidden"
            >
              <div className="text-left z-10">
                <h3 className="text-xl font-serif font-bold group-hover:text-zinc-950 transition-colors">经典模式</h3>
                <p className="text-sm text-royal-gold/60 group-hover:text-zinc-900 transition-colors">每次成功消除后新增一行</p>
              </div>
              <Play className="w-8 h-8 text-royal-gold group-hover:text-zinc-950 z-10 transition-colors" />
              <div className="absolute inset-0 bg-gradient-to-r from-royal-gold/0 to-royal-gold/20 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>

            <button 
              onClick={() => startGame('time')}
              className="group relative flex items-center justify-between p-6 bg-royal-purple/40 hover:bg-royal-crimson rounded-xl transition-all duration-500 border border-royal-gold/20 overflow-hidden"
            >
              <div className="text-left z-10">
                <h3 className="text-xl font-serif font-bold group-hover:text-white transition-colors">计时模式</h3>
                <p className="text-sm text-royal-gold/60 group-hover:text-royal-crimson/20 transition-colors">在倒计时结束前完成挑战</p>
              </div>
              <Timer className="w-8 h-8 text-royal-gold group-hover:text-white z-10 transition-colors" />
              <div className="absolute inset-0 bg-gradient-to-r from-royal-crimson/0 to-royal-crimson/20 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </div>

          <div className="flex justify-center gap-4">
            <button 
              onClick={() => setIsMusicOn(!isMusicOn)}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-royal-gold/10 border border-royal-gold/30 text-royal-gold hover:bg-royal-gold/20 transition-all"
            >
              {isMusicOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
              <span className="text-xs font-serif uppercase tracking-wider">{isMusicOn ? '音乐开' : '音乐关'}</span>
            </button>
          </div>

          <div className="pt-4 border-t border-royal-gold/10 flex justify-between items-center text-royal-gold/40 font-serif text-xs italic">
            <span>最高分: {highScore}</span>
            <span>ROYAL EDITION</span>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 royal-pattern">
      {/* Game Header */}
      <div className="w-full max-w-md mb-6 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-royal-gold/50 text-xs font-serif italic uppercase tracking-widest">目标值</span>
          <span className="text-5xl font-serif font-bold text-royal-gold tabular-nums drop-shadow-lg">{target}</span>
        </div>
        
        <div className="flex flex-col items-center">
          <span className="text-royal-gold/50 text-xs font-serif italic uppercase tracking-widest">当前得分</span>
          <span className="text-4xl font-serif font-bold text-white tabular-nums">{score}</span>
        </div>

        <div className="flex flex-col items-end">
          <span className="text-royal-gold/50 text-xs font-serif italic uppercase tracking-widest">
            {mode === 'time' ? '剩余时间' : '模式'}
          </span>
          {mode === 'time' ? (
            <span className={cn(
              "text-4xl font-serif font-bold tabular-nums",
              timeLeft <= 3 ? "text-royal-crimson animate-pulse" : "text-royal-gold"
            )}>
              {timeLeft}秒
            </span>
          ) : (
            <span className="text-2xl font-serif font-bold text-royal-gold/80 italic">经典</span>
          )}
        </div>
      </div>

      {/* Game Board Container */}
      <div className="relative glass-panel p-3 shadow-[0_0_60px_rgba(212,175,55,0.2)] border-2 border-royal-gold/40">
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
            <div key={`bg-${i}`} className="bg-royal-gold/5 border border-royal-gold/10" />
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
                      ? "bg-royal-gold text-zinc-950 border-white shadow-[0_0_20px_rgba(212,175,55,0.6)] scale-95" 
                      : "bg-royal-purple/60 text-royal-gold border-royal-gold/30 hover:bg-royal-purple hover:border-royal-gold/60 active:scale-90"
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
              <h2 className="text-4xl font-serif font-bold text-royal-gold mb-8 italic">宫廷小憩</h2>
              <button 
                onClick={() => setIsPaused(false)}
                className="p-6 bg-royal-gold text-zinc-950 rounded-full hover:scale-110 transition-transform shadow-[0_0_30px_rgba(212,175,55,0.4)]"
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
              className="absolute inset-0 z-30 bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center rounded-2xl p-8 text-center border-2 border-royal-crimson/50"
            >
              <Trophy className="w-20 h-20 text-royal-gold mb-4 drop-shadow-[0_0_20px_rgba(212,175,55,0.5)]" />
              <h2 className="text-5xl font-serif font-bold text-royal-gold mb-2 italic">挑战结束</h2>
              <p className="text-royal-gold/60 font-serif italic mb-8">您的智慧已载入史册</p>
              
              <div className="grid grid-cols-2 gap-6 w-full mb-10">
                <div className="bg-royal-purple/30 p-5 rounded-2xl border border-royal-gold/20">
                  <span className="block text-xs text-royal-gold/50 uppercase font-serif italic tracking-widest mb-1">本次得分</span>
                  <span className="text-3xl font-serif font-bold text-white">{score}</span>
                </div>
                <div className="bg-royal-purple/30 p-5 rounded-2xl border border-royal-gold/20">
                  <span className="block text-xs text-royal-gold/50 uppercase font-serif italic tracking-widest mb-1">历史最高</span>
                  <span className="text-3xl font-serif font-bold text-royal-gold">{highScore}</span>
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => startGame(mode)}
                  className="flex items-center gap-2 px-8 py-4 bg-royal-gold text-zinc-950 font-serif font-bold rounded-xl hover:bg-white transition-all shadow-[0_4px_0_#8B6508] active:translate-y-1 active:shadow-none"
                >
                  <RotateCcw className="w-5 h-5" /> 再战一回
                </button>
                <button 
                  onClick={() => setMode(null)}
                  className="flex items-center gap-2 px-8 py-4 bg-royal-purple text-royal-gold font-serif font-bold rounded-xl hover:bg-royal-purple/80 transition-all border border-royal-gold/30"
                >
                  <Home className="w-5 h-5" /> 归隐宫廷
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
          className="p-4 glass-panel hover:bg-royal-gold/20 transition-all text-royal-gold"
        >
          {isMusicOn ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
        </button>
        <button 
          onClick={() => setIsPaused(!isPaused)}
          disabled={gameOver}
          className="p-4 glass-panel hover:bg-royal-gold/20 transition-all text-royal-gold disabled:opacity-50"
        >
          {isPaused ? <Play className="w-6 h-6" /> : <Pause className="w-6 h-6" />}
        </button>
        <button 
          onClick={() => startGame(mode)}
          className="p-4 glass-panel hover:bg-royal-gold/20 transition-all text-royal-gold"
        >
          <RotateCcw className="w-6 h-6" />
        </button>
        <button 
          onClick={() => setMode(null)}
          className="p-4 glass-panel hover:bg-royal-gold/20 transition-all text-royal-gold"
        >
          <Home className="w-6 h-6" />
        </button>
      </div>

      {/* Instructions */}
      <div className="mt-10 text-center max-w-xs">
        <p className="text-royal-gold/40 text-xs font-serif italic leading-relaxed tracking-wide">
          运筹帷幄之中，决胜千里之外。<br />
          点击数字使其总和契合天命之数。
        </p>
      </div>
    </div>
  );
}
