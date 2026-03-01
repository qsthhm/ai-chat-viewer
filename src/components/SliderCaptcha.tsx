'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface SliderCaptchaProps {
  onSuccess: (token: string) => void;
}

/**
 * Slider captcha: drag the thumb to the right to verify.
 * Generates a simple token encoding drag duration + timestamp for backend validation.
 */
export default function SliderCaptcha({ onSuccess }: SliderCaptchaProps) {
  const [dragging, setDragging] = useState(false);
  const [offset, setOffset] = useState(0);
  const [verified, setVerified] = useState(false);
  const [failed, setFailed] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const startTime = useRef(0);
  const trackWidth = useRef(0);
  const thumbW = 44;

  const getMaxOffset = () => trackWidth.current - thumbW;

  const handleStart = useCallback((clientX: number) => {
    if (verified) return;
    setFailed(false);
    const track = trackRef.current;
    if (!track) return;
    trackWidth.current = track.getBoundingClientRect().width;
    startX.current = clientX;
    startTime.current = Date.now();
    setDragging(true);
  }, [verified]);

  const handleMove = useCallback((clientX: number) => {
    if (!dragging || verified) return;
    const dx = clientX - startX.current;
    const max = getMaxOffset();
    setOffset(Math.max(0, Math.min(dx, max)));
  }, [dragging, verified]);

  const handleEnd = useCallback(() => {
    if (!dragging || verified) return;
    setDragging(false);
    const max = getMaxOffset();
    const threshold = max * 0.92; // Must drag at least 92% of the way

    if (offset >= threshold) {
      const duration = Date.now() - startTime.current;
      // Reject if dragged too fast (< 200ms = likely bot)
      if (duration < 200) {
        setOffset(0);
        setFailed(true);
        return;
      }
      setOffset(max); // Snap to end
      setVerified(true);
      // Generate token: base64(timestamp:duration:random)
      const payload = `${Date.now()}:${duration}:${Math.random().toString(36).slice(2, 8)}`;
      const token = btoa(payload);
      onSuccess(token);
    } else {
      // Spring back
      setOffset(0);
      setFailed(true);
    }
  }, [dragging, verified, offset, onSuccess]);

  // Mouse events
  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => handleMove(e.clientX);
    const onUp = () => handleEnd();
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [dragging, handleMove, handleEnd]);

  // Touch events
  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: TouchEvent) => { e.preventDefault(); handleMove(e.touches[0].clientX); };
    const onUp = () => handleEnd();
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);
    return () => { window.removeEventListener('touchmove', onMove); window.removeEventListener('touchend', onUp); };
  }, [dragging, handleMove, handleEnd]);

  return (
    <div className="select-none">
      <div
        ref={trackRef}
        className={`relative h-11 rounded-xl border transition-colors ${
          verified
            ? 'bg-green-50 border-green-300'
            : failed
            ? 'bg-red-50 border-red-200'
            : 'bg-surface-100 border-surface-200'
        }`}
      >
        {/* Fill bar */}
        <div
          className={`absolute inset-y-0 left-0 rounded-xl transition-colors ${
            verified ? 'bg-green-100' : 'bg-brand-50'
          }`}
          style={{ width: offset + thumbW / 2, transition: dragging ? 'none' : 'width 0.3s ease' }}
        />

        {/* Center text */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {verified ? (
            <span className="text-xs font-medium text-green-600 flex items-center gap-1">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              验证成功
            </span>
          ) : (
            <span className={`text-xs transition-opacity ${offset > 10 ? 'opacity-0' : 'opacity-100'} ${failed ? 'text-red-400' : 'text-surface-400'}`}>
              {failed ? '请再试一次' : '拖动滑块到右侧验证'}
            </span>
          )}
        </div>

        {/* Thumb */}
        <div
          className={`absolute top-0.5 w-10 h-10 rounded-[10px] flex items-center justify-center shadow-sm cursor-grab active:cursor-grabbing transition-shadow ${
            verified
              ? 'bg-green-500 text-white'
              : dragging
              ? 'bg-brand-500 text-white shadow-md'
              : 'bg-white text-surface-400 border border-surface-200 hover:border-brand-300 hover:text-brand-500'
          }`}
          style={{
            left: offset + 2,
            transition: dragging ? 'none' : 'left 0.3s ease',
          }}
          onMouseDown={(e) => { e.preventDefault(); handleStart(e.clientX); }}
          onTouchStart={(e) => handleStart(e.touches[0].clientX)}
        >
          {verified ? (
            <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 5l7 7-7 7M5 5l7 7-7 7"/></svg>
          )}
        </div>
      </div>
    </div>
  );
}
