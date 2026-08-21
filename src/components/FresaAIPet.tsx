import { CSSProperties, PointerEvent, useEffect, useMemo, useRef, useState } from 'react';
import fresaSparkSprite from '../assets/fresa-spark-spritesheet.webp';
import './FresaAIPet.css';

export type FresaPetState =
  | 'idle'
  | 'running-right'
  | 'running-left'
  | 'waving'
  | 'jumping'
  | 'failed'
  | 'waiting'
  | 'running'
  | 'review';

type FresaAIPetProps = {
  state?: FresaPetState;
  unreadCount?: number;
  position?: 'bottom-right' | 'bottom-left';
  size?: number;
  draggable?: boolean;
  className?: string;
  onClick?: () => void;
};

const PET_ROWS: Record<FresaPetState, { row: number; frames: number; speed: number }> = {
  idle: { row: 0, frames: 6, speed: 180 },
  'running-right': { row: 1, frames: 8, speed: 110 },
  'running-left': { row: 2, frames: 8, speed: 110 },
  waving: { row: 3, frames: 4, speed: 150 },
  jumping: { row: 4, frames: 5, speed: 130 },
  failed: { row: 5, frames: 8, speed: 170 },
  waiting: { row: 6, frames: 6, speed: 180 },
  running: { row: 7, frames: 6, speed: 125 },
  review: { row: 8, frames: 6, speed: 160 },
};

const CELL_WIDTH = 192;
const CELL_HEIGHT = 208;

function useReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(query.matches);

    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  return reducedMotion;
}

export default function FresaAIPet({
  state = 'idle',
  unreadCount = 0,
  position = 'bottom-right',
  size = 96,
  draggable = true,
  className = '',
  onClick,
}: FresaAIPetProps) {
  const reducedMotion = useReducedMotion();
  const [frame, setFrame] = useState(0);
  const [hovering, setHovering] = useState(false);
  const [burstState, setBurstState] = useState<FresaPetState | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const dragStart = useRef<{ pointerId: number; x: number; y: number } | null>(null);

  const activeState = burstState ?? (hovering && state === 'idle' ? 'waving' : state);
  const row = PET_ROWS[activeState];
  const height = Math.round(size * (CELL_HEIGHT / CELL_WIDTH));

  useEffect(() => {
    setFrame(0);
  }, [activeState]);

  useEffect(() => {
    if (reducedMotion) return;

    const timer = window.setInterval(() => {
      setFrame((current) => (current + 1) % row.frames);
    }, row.speed);

    return () => window.clearInterval(timer);
  }, [reducedMotion, row.frames, row.speed]);

  useEffect(() => {
    if (!burstState) return;
    const timer = window.setTimeout(() => setBurstState(null), Math.max(700, row.frames * row.speed));
    return () => window.clearTimeout(timer);
  }, [burstState, row.frames, row.speed]);

  const spriteStyle = useMemo(
    () =>
      ({
        '--pet-width': `${size}px`,
        '--pet-height': `${height}px`,
        '--pet-frame': frame,
        '--pet-row': row.row,
        backgroundImage: `url(${fresaSparkSprite})`,
      }) as CSSProperties,
    [frame, height, row.row, size],
  );

  const containerStyle = useMemo(
    () =>
      ({
        '--pet-x': `${dragOffset.x}px`,
        '--pet-y': `${dragOffset.y}px`,
      }) as CSSProperties,
    [dragOffset],
  );

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (!draggable) return;
    dragStart.current = {
      pointerId: event.pointerId,
      x: event.clientX - dragOffset.x,
      y: event.clientY - dragOffset.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    if (!dragStart.current || dragStart.current.pointerId !== event.pointerId) return;

    const nextX = event.clientX - dragStart.current.x;
    const nextY = event.clientY - dragStart.current.y;
    setDragOffset({ x: nextX, y: nextY });
  };

  const handlePointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    if (!dragStart.current || dragStart.current.pointerId !== event.pointerId) return;
    dragStart.current = null;
    setBurstState('jumping');
  };

  const handleClick = () => {
    setBurstState((current) => (current ? null : 'waving'));
    onClick?.();
  };

  return (
    <button
      type="button"
      className={`fresa-ai-pet fresa-ai-pet--${position} ${className}`}
      style={containerStyle}
      aria-label="Abrir asistente Fresa AI"
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => {
        dragStart.current = null;
      }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <span className="fresa-ai-pet__glow" aria-hidden="true" />
      <span className="fresa-ai-pet__sprite" style={spriteStyle} aria-hidden="true" />
      {unreadCount > 0 && <span className="fresa-ai-pet__badge">{unreadCount > 99 ? '99+' : unreadCount}</span>}
    </button>
  );
}
