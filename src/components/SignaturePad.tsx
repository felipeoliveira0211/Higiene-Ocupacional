import React, { useRef, useState, useEffect } from 'react';
import { Button } from './ui/button';
import { RotateCcw, Check } from 'lucide-react';

interface SignaturePadProps {
  onSave: (signature: string) => void;
  initialValue?: string;
}

export function SignaturePad({ onSave, initialValue }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(!initialValue);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas resolution
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
  }, []);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    setIsEmpty(false);
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.beginPath();
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    let x, y;

    if ('touches' in e) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setIsEmpty(true);
    }
  };

  const save = () => {
    const canvas = canvasRef.current;
    if (canvas && !isEmpty) {
      // Create a temporary canvas to trim whitespace if needed, 
      // but for simplicity we'll just take the whole canvas for now
      // or at least ensure it's not empty.
      const dataUrl = canvas.toDataURL('image/png');
      onSave(dataUrl);
    }
  };

  return (
    <div className="space-y-4">
      <div className="border-2 border-slate-200 rounded-lg bg-white overflow-hidden touch-none">
        <canvas
          ref={canvasRef}
          className="w-full h-48 cursor-crosshair"
          onMouseDown={startDrawing}
          onMouseUp={stopDrawing}
          onMouseMove={draw}
          onMouseOut={stopDrawing}
          onTouchStart={startDrawing}
          onTouchEnd={stopDrawing}
          onTouchMove={draw}
        />
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={clear} type="button">
          <RotateCcw className="w-4 h-4 mr-2" />
          Limpar
        </Button>
        <Button 
          variant="default" 
          size="sm" 
          onClick={save} 
          type="button"
          disabled={isEmpty}
          className="bg-green-600 hover:bg-green-700"
        >
          <Check className="w-4 h-4 mr-2" />
          Confirmar Assinatura
        </Button>
      </div>
      {initialValue && (
        <div className="mt-2">
          <p className="text-xs text-slate-500 mb-1">Assinatura atual:</p>
          <img src={initialValue} alt="Signature" className="h-20 border rounded bg-slate-50" />
        </div>
      )}
    </div>
  );
}
