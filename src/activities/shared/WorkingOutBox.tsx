import { Eraser, Keyboard, PencilLine, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "../../components/ui/Button";

export function WorkingOutBox({ itemId }: { itemId: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const [notes, setNotes] = useState("");
  const [tool, setTool] = useState<"pencil" | "eraser">("pencil");

  useEffect(() => {
    setNotes("");
    const canvas = canvasRef.current;
    if (!canvas) return;
    resizeCanvas(canvas);
  }, [itemId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    resizeCanvas(canvas);
    const handleResize = () => resizeCanvas(canvas);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    context?.clearRect(0, 0, canvas.width, canvas.height);
  };

  const getCanvasPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const drawToPoint = (
    canvas: HTMLCanvasElement,
    point: { x: number; y: number },
  ) => {
    const context = canvas.getContext("2d");
    const lastPoint = lastPointRef.current;
    if (!context || !lastPoint) return;

    context.save();
    context.globalCompositeOperation =
      tool === "eraser" ? "destination-out" : "source-over";
    context.strokeStyle = "#111827";
    context.lineWidth = tool === "eraser" ? 18 : 4;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.beginPath();
    context.moveTo(lastPoint.x, lastPoint.y);
    context.lineTo(point.x, point.y);
    context.stroke();
    context.restore();
    lastPointRef.current = point;
  };

  const startDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    isDrawingRef.current = true;
    lastPointRef.current = getCanvasPoint(event);
  };

  const continueDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    drawToPoint(event.currentTarget, getCanvasPoint(event));
  };

  const stopDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    isDrawingRef.current = false;
    lastPointRef.current = null;
  };

  return (
    <div className="mt-5 rounded-lg border border-dashed border-indigo-200 bg-indigo-50/50 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-extrabold text-primary">
            <PencilLine size={18} />
            Working out
          </div>
          <p className="mt-1 text-xs font-semibold text-muted">
            Use this space for binary, denary, hexadecimal or file-size
            calculations.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={tool === "pencil" ? "primary" : "secondary"}
            className="min-h-9 px-3 py-2 text-xs"
            onClick={() => setTool("pencil")}
            type="button"
          >
            <PencilLine size={15} />
            Pencil
          </Button>
          <Button
            variant={tool === "eraser" ? "primary" : "secondary"}
            className="min-h-9 px-3 py-2 text-xs"
            onClick={() => setTool("eraser")}
            type="button"
          >
            <Eraser size={15} />
            Eraser
          </Button>
          <Button
            variant="secondary"
            className="min-h-9 px-3 py-2 text-xs"
            onClick={clearCanvas}
            type="button"
          >
            <RotateCcw size={15} />
            Clear
          </Button>
        </div>
      </div>

      <label className="mt-4 block">
        <span className="mb-2 flex items-center gap-2 text-xs font-extrabold uppercase text-muted">
          <Keyboard size={15} />
          Typed notes
        </span>
        <textarea
          className="min-h-24 w-full resize-y rounded-lg border border-line bg-white p-3 text-sm leading-6 text-ink shadow-sm transition placeholder:text-slate-400 focus:border-primary"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Type your calculations or reminders here..."
        />
      </label>

      <div className="mt-4">
        <div className="mb-2 flex items-center gap-2 text-xs font-extrabold uppercase text-muted">
          <PencilLine size={15} />
          Handwriting space
        </div>
        <canvas
          ref={canvasRef}
          className="h-44 w-full rounded-lg border border-line shadow-sm"
          style={{ backgroundColor: "#fff", touchAction: "none" }}
          aria-label="Handwriting space for working out"
          onPointerDown={startDrawing}
          onPointerMove={continueDrawing}
          onPointerUp={stopDrawing}
          onPointerCancel={stopDrawing}
          onPointerLeave={stopDrawing}
        />
      </div>
    </div>
  );
}

function resizeCanvas(canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect();
  const pixelRatio = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.floor(rect.width * pixelRatio));
  const height = Math.max(1, Math.floor(rect.height * pixelRatio));
  canvas.width = width;
  canvas.height = height;
}
