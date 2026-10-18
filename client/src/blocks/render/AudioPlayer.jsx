import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Pause, Play } from 'lucide-react';
import { mediaUrl } from '../../lib/api.js';

const clock = (s) => {
  if (!Number.isFinite(s)) return '0:00';
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
};

// A speech sample player — the one block a TTS journal needs most.
export default function AudioPlayer({ url, title, caption, transcript, onPlay: onPlayed }) {
  const audio = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const el = audio.current;
    if (!el) return undefined;
    const onTime = () => setTime(el.currentTime);
    const onMeta = () => setDuration(el.duration);
    const onEnd = () => setPlaying(false);
    const onPause = () => setPlaying(false);
    const onPlay = () => {
      setPlaying(true);
      onPlayed?.();
    };
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('loadedmetadata', onMeta);
    el.addEventListener('ended', onEnd);
    el.addEventListener('pause', onPause);
    el.addEventListener('play', onPlay);
    return () => {
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('loadedmetadata', onMeta);
      el.removeEventListener('ended', onEnd);
      el.removeEventListener('pause', onPause);
      el.removeEventListener('play', onPlay);
    };
  }, [url, onPlayed]);

  if (!url) return null;

  const toggle = () => (audio.current.paused ? audio.current.play() : audio.current.pause());
  const progress = duration ? (time / duration) * 100 : 0;

  return (
    <figure className="rounded-xl border border-line bg-white p-4 shadow-card sm:p-5">
      <audio ref={audio} src={mediaUrl(url)} preload="metadata" />
      <div className="flex items-center gap-4">
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.96 }}
          onClick={toggle}
          className="btn-dark size-12 shrink-0 p-0!"
          aria-label={playing ? 'Pause' : 'Play'}
        >
          {playing ? <Pause className="size-5" /> : <Play className="ml-0.5 size-5" />}
        </motion.button>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <p className="truncate font-medium text-ink">{title || 'Audio sample'}</p>
            <span className="shrink-0 font-mono text-xs tabular-nums text-muted">
              {clock(time)} / {clock(duration)}
            </span>
          </div>
          <div className="relative mt-2.5 h-1.5 rounded-full bg-wash">
            <div className="absolute inset-y-0 left-0 rounded-full bg-ink" style={{ width: `${progress}%` }} />
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.01}
              value={time}
              onChange={(e) => {
                audio.current.currentTime = Number(e.target.value);
                setTime(Number(e.target.value));
              }}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              aria-label="Seek"
            />
          </div>
        </div>
      </div>
      {transcript && (
        <blockquote className="mt-4 border-l-2 border-line-strong pl-4 text-[15px] leading-relaxed text-slate">
          {transcript}
        </blockquote>
      )}
      {caption && <figcaption className="mt-3 text-sm text-muted">{caption}</figcaption>}
    </figure>
  );
}
