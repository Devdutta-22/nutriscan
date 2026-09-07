import React, { useState, useRef, useEffect } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Eye, EyeOff, Layers, Maximize2 } from 'lucide-react';
import { BoundingBox, ComplianceStatus } from '../../types/compliance';

interface CanvasViewerProps {
  imageUrl?: string;
  boundingBoxes: BoundingBox[];
  activeBoxId: string | null;
  onSelectBox: (boxId: string | null) => void;
  selectedMandateId?: string | null;
}

export const CanvasViewer: React.FC<CanvasViewerProps> = ({
  imageUrl = '/presets/compliant_biscuit.svg',
  boundingBoxes,
  activeBoxId,
  onSelectBox,
  selectedMandateId,
}) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showOverlays, setShowOverlays] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  // When selectedMandateId changes from outside, focus on that box
  useEffect(() => {
    if (selectedMandateId) {
      const match = boundingBoxes.find((b) => b.mandate_id === selectedMandateId);
      if (match) {
        onSelectBox(match.id);
      }
    }
  }, [selectedMandateId, boundingBoxes]);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.6));
  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    onSelectBox(null);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only pan if clicking container, not a box
    if ((e.target as HTMLElement).tagName !== 'rect' && (e.target as HTMLElement).tagName !== 'button') {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY * -0.0015;
    setZoom((prev) => Math.min(Math.max(prev + delta, 0.6), 3));
  };

  return (
    <div className="relative w-full h-[520px] lg:h-[640px] rounded-2xl bg-zinc-100/90 border border-zinc-200/90 overflow-hidden flex flex-col shadow-sm">
      {/* Viewport Floating Header Controls */}
      <div className="absolute top-3 left-3 right-3 z-30 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-zinc-200 text-xs text-zinc-700 shadow-md">
          <Layers className="w-3.5 h-3.5 text-emerald-600" />
          <span className="font-medium">Interactive Physical Overlay</span>
          <span className="text-zinc-400">•</span>
          <span className="font-mono text-[11px] text-zinc-600">
            {boundingBoxes.length} Mandates Tracked
          </span>
        </div>

        {/* Zoom and Overlay Toggle Dock */}
        <div className="flex items-center gap-1 pointer-events-auto bg-white/90 backdrop-blur-md p-1 rounded-xl border border-zinc-200 shadow-md">
          <button
            onClick={() => setShowOverlays(!showOverlays)}
            title={showOverlays ? 'Hide Bounding Boxes' : 'Show Bounding Boxes'}
            className={`p-1.5 rounded-lg transition-colors ${
              showOverlays ? 'bg-emerald-100 text-emerald-800' : 'text-zinc-500 hover:bg-zinc-100'
            }`}
          >
            {showOverlays ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>

          <div className="w-[1px] h-4 bg-zinc-200 mx-0.5" />

          <button
            onClick={handleZoomIn}
            title="Zoom In"
            className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <span className="px-1.5 text-[11px] font-mono text-zinc-700 font-semibold select-none">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={handleZoomOut}
            title="Zoom Out"
            className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-4 bg-zinc-200 mx-0.5" />

          <button
            onClick={handleReset}
            title="Reset Zoom & Pan"
            className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Interactive Canvas Area */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        className={`w-full h-full flex items-center justify-center cursor-grab select-none overflow-hidden relative ${
          isDragging ? 'cursor-grabbing' : ''
        }`}
      >
        {/* Subtle coordinate grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(#000 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        />

        {/* Pan & Zoom Workspace Container */}
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          className="relative max-w-[600px] max-h-[480px] w-full h-full flex items-center justify-center"
        >
          {/* Packaging Artwork / Image */}
          <img
            src={imageUrl}
            alt="Packaging Artwork"
            className="w-[580px] h-[460px] object-contain rounded-xl shadow-2xl pointer-events-none"
          />

          {/* SVG Bounding Box Layer */}
          {showOverlays && (
            <svg
              className="absolute inset-0 w-full h-full pointer-events-auto"
              viewBox="0 0 600 480"
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                <filter id="box-glow-green" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="0" stdDeviation="4" flood-color="#10b981" flood-opacity="0.8" />
                </filter>
                <filter id="box-glow-red" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="0" stdDeviation="5" flood-color="#f43f5e" flood-opacity="0.9" />
                </filter>
                <filter id="box-glow-amber" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="0" stdDeviation="4" flood-color="#fbbf24" flood-opacity="0.8" />
                </filter>
              </defs>

              {/* Dim backdrop when a specific box is spotlighted */}
              {activeBoxId && (
                <rect
                  x="0"
                  y="0"
                  width="600"
                  height="480"
                  fill="#000"
                  opacity="0.45"
                  className="transition-opacity duration-300 pointer-events-none"
                />
              )}

              {boundingBoxes.map((box) => {
                const isActive = activeBoxId === box.id;
                const isViolation = box.status === 'VIOLATION';
                const isWarning = box.status === 'WARNING';
                const isCompliant = box.status === 'COMPLIANT';

                const strokeColor = isViolation ? '#f43f5e' : isWarning ? '#fbbf24' : '#10b981';
                const fillColor = isViolation
                  ? 'rgba(244, 63, 94, 0.18)'
                  : isWarning
                  ? 'rgba(251, 191, 36, 0.18)'
                  : 'rgba(16, 185, 129, 0.15)';

                return (
                  <g
                    key={box.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectBox(box.id === activeBoxId ? null : box.id);
                    }}
                    onMouseEnter={() => onSelectBox(box.id)}
                    className="cursor-pointer group"
                  >
                    {/* Bounding Box Rectangle */}
                    <rect
                      x={box.bbox.x}
                      y={box.bbox.y}
                      width={box.bbox.w}
                      height={box.bbox.h}
                      rx="6"
                      fill={isActive ? fillColor : 'rgba(0,0,0,0.01)'}
                      stroke={strokeColor}
                      strokeWidth={isActive ? '2.5' : '1.5'}
                      strokeDasharray={isViolation ? '5 3' : undefined}
                      filter={
                        isActive
                          ? isViolation
                            ? 'url(#box-glow-red)'
                            : isWarning
                            ? 'url(#box-glow-amber)'
                            : 'url(#box-glow-green)'
                          : undefined
                      }
                      className="transition-all duration-200"
                    />

                    {/* Tag Badge */}
                    <rect
                      x={box.bbox.x}
                      y={Math.max(box.bbox.y - 18, 5)}
                      width={Math.min(box.bbox.w, 140)}
                      height="16"
                      rx="4"
                      fill={strokeColor}
                      className="transition-all duration-200 opacity-90 group-hover:opacity-100"
                    />

                    <text
                      x={box.bbox.x + 6}
                      y={Math.max(box.bbox.y - 6, 17)}
                      fontFamily="'Inter', sans-serif"
                      fontSize="9.5"
                      fontWeight="700"
                      fill={isCompliant ? '#022c22' : isWarning ? '#451a03' : '#fff'}
                      letterSpacing="0.5"
                      className="select-none pointer-events-none font-mono"
                    >
                      {isViolation ? '⚠️ VIOLATION' : isWarning ? '⚡ WARNING' : '✓ COMPLIANT'}
                    </text>
                  </g>
                );
              })}
            </svg>
          )}
        </div>
      </div>

      {/* Footer Legend Bar */}
      <div className="absolute bottom-3 left-3 right-3 z-30 flex items-center justify-between bg-white/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-zinc-200 text-xs pointer-events-none shadow-md">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs" />
            <span className="text-zinc-700 font-medium">Compliant</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-xs" />
            <span className="text-zinc-700 font-medium">Format Warning</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-xs animate-pulse" />
            <span className="text-zinc-700 font-medium">Statutory Contravention</span>
          </div>
        </div>

        <span className="text-[11px] text-zinc-500 hidden sm:inline-block font-mono">
          Click box to inspect statutory clause
        </span>
      </div>
    </div>
  );
};
