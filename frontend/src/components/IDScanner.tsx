import { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, X, RefreshCw, CheckCircle, ChevronLeft, ChevronRight, ScanLine, ZoomIn, Building, Car, Shield, HeartPulse, CreditCard, Hash } from 'lucide-react';
import { Button } from '@/components/common';
import { useToast } from '@/hooks/useToast';

interface CapturedSide {
  dataUrl: string;
  file: File;
}

const PHILIPPINE_ID_TYPES = [
  { key: 'pagibig_id', label: 'Pag-IBIG ID', icon: Building, desc: 'Pag-IBIG Loyalty Card Plus / Member ID' },
  { key: 'license', label: "Driver's License", icon: Car, desc: 'LTO Driver License' },
  { key: 'national_id', label: 'National ID (PhilSys)', icon: Shield, desc: 'Philippine National ID' },
  { key: 'philhealth_id', label: 'PhilHealth ID', icon: HeartPulse, desc: 'PhilHealth Member Card' },
  { key: 'sss_id', label: 'SSS / UMID Card', icon: CreditCard, desc: 'Social Security System Card' },
  { key: 'tin_id', label: 'TIN ID', icon: Hash, desc: 'BIR Tax Identification Card' },
  { key: 'other_id', label: 'Other Government ID', icon: CreditCard, desc: 'Postal, Passport, Voter, PRC' },
];

interface IDScannerProps {
  initialCategoryKey?: string;
  onScanComplete?: (front: File, back: File, categoryKey?: string) => void;
  onClose?: () => void;
}

type ScanStep = 'intro' | 'front' | 'front-review' | 'back' | 'back-review' | 'done';

const dataUrlToFile = (dataUrl: string, name: string): File => {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)![1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) u8arr[n] = bstr.charCodeAt(n);
  return new File([u8arr], name, { type: mime });
};

export const IDScanner = ({ initialCategoryKey = 'license', onScanComplete, onClose }: IDScannerProps) => {
  const { error } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [selectedIdType, setSelectedIdType] = useState<string>(initialCategoryKey);
  const [step, setStep] = useState<ScanStep>('intro');
  const [front, setFront] = useState<CapturedSide | null>(null);
  const [back, setBack] = useState<CapturedSide | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  const selectedTypeObj = PHILIPPINE_ID_TYPES.find((t) => t.key === selectedIdType) || PHILIPPINE_ID_TYPES[0];

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
  }, []);

  const startCamera = useCallback(async () => {
    stopCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 }, aspectRatio: { ideal: 16 / 9 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraReady(true);
      }
      setHasPermission(true);
    } catch {
      setHasPermission(false);
      error('Camera access denied. Please allow camera permissions.');
    }
  }, [facingMode, stopCamera, error]);

  useEffect(() => {
    if (step === 'front' || step === 'back') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [step, startCamera, stopCamera]);

  /* Capture frame from video */
  const captureFrame = (isFront: boolean) => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Crop to the ID card ratio (approx 85.6mm x 53.98mm = 1.586 ratio)
    const cardRatio = 1.586;
    let cropW = canvas.width * 0.85;
    let cropH = cropW / cardRatio;
    if (cropH > canvas.height * 0.85) {
      cropH = canvas.height * 0.85;
      cropW = cropH * cardRatio;
    }
    const startX = (canvas.width - cropW) / 2;
    const startY = (canvas.height - cropH) / 2;

    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = cropW;
    croppedCanvas.height = cropH;
    const croppedCtx = croppedCanvas.getContext('2d');
    if (!croppedCtx) return;

    croppedCtx.drawImage(canvas, startX, startY, cropW, cropH, 0, 0, cropW, cropH);

    const dataUrl = croppedCanvas.toDataURL('image/jpeg', 0.92);
    const fileName = `${selectedTypeObj.label}_${isFront ? 'Front' : 'Back'}.jpg`;
    const file = dataUrlToFile(dataUrl, fileName);

    if (isFront) {
      setFront({ dataUrl, file });
      setStep('front-review');
    } else {
      setBack({ dataUrl, file });
      setStep('back-review');
    }
    stopCamera();
  };

  const handleDone = () => {
    if (front && back && onScanComplete) {
      onScanComplete(front.file, back.file, selectedIdType);
    }
    onClose?.();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4">
      {/* ── Close Button ── */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-50 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
      >
        <X size={20} />
      </button>

      {/* ══════════════════════════════════════════
          Step: INTRO & ID SELECTION
      ══════════════════════════════════════════ */}
      {step === 'intro' && (
        <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-3xl p-6 sm:p-8 text-center text-white space-y-6 shadow-2xl">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <ScanLine size={32} className="text-white" />
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold">Philippine ID Scanner</h2>
            <p className="text-gray-400 text-xs mt-1">
              Select the ID you want to scan, then follow on-screen framing.
            </p>
          </div>

          {/* ID Type Selector */}
          <div className="text-left space-y-2">
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Choose Card / ID Type:
            </label>
            <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1">
              {PHILIPPINE_ID_TYPES.map((type) => {
                const isSelected = selectedIdType === type.key;
                const Icon = type.icon;
                return (
                  <button
                    key={type.key}
                    type="button"
                    onClick={() => setSelectedIdType(type.key)}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-600/20 text-white ring-1 ring-blue-500'
                        : 'border-gray-800 bg-gray-800/40 text-gray-300 hover:bg-gray-800'
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400'}`}>
                      <Icon size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold truncate">{type.label}</p>
                      <p className="text-[10px] text-gray-400 truncate">{type.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={() => setStep('front')}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 font-bold text-sm text-white shadow-lg shadow-blue-500/25 transition-transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <Camera size={18} />
            Start Scanning ({selectedTypeObj.label})
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════
          Step: LIVE CAMERA SCANNING (FRONT & BACK)
      ══════════════════════════════════════════ */}
      {(step === 'front' || step === 'back') && (
        <div className="w-full max-w-lg flex flex-col items-center gap-4">
          {/* Header indicator */}
          <div className="text-center text-white">
            <span className="text-xs uppercase tracking-widest font-bold text-blue-400 bg-blue-900/40 px-3 py-1 rounded-full border border-blue-500/30">
              {step === 'front' ? 'Step 1: FRONT SIDE' : 'Step 2: BACK SIDE'} • {selectedTypeObj.label}
            </span>
            <p className="text-xs text-gray-300 mt-2">
              Align your {selectedTypeObj.label} within the glowing guide frame
            </p>
          </div>

          {/* Camera Viewport with Framing Box */}
          <div className="relative w-full aspect-[4/3] max-w-md bg-black rounded-3xl overflow-hidden border-2 border-white/10 shadow-2xl flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            {/* ID Card Guiding Overlay */}
            <div
              ref={overlayRef}
              className="absolute w-[86%] aspect-[1.586/1] border-2 border-dashed border-blue-400 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] pointer-events-none flex flex-col justify-between p-3"
            >
              {/* Corner accents */}
              <div className="flex justify-between w-full">
                <div className="w-4 h-4 border-t-2 border-l-2 border-blue-400 -mt-1 -ml-1 rounded-tl" />
                <div className="w-4 h-4 border-t-2 border-r-2 border-blue-400 -mt-1 -mr-1 rounded-tr" />
              </div>

              {/* Animated laser line */}
              <div
                className="w-full h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent"
                style={{ animation: 'scanline 2s ease-in-out infinite' }}
              />

              <div className="flex justify-between w-full">
                <div className="w-4 h-4 border-b-2 border-l-2 border-blue-400 -mb-1 -ml-1 rounded-bl" />
                <div className="w-4 h-4 border-b-2 border-r-2 border-blue-400 -mb-1 -mr-1 rounded-br" />
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-4 mt-2">
            <button
              onClick={() => setFacingMode((m) => (m === 'environment' ? 'user' : 'environment'))}
              className="p-3 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors"
              title="Flip Camera"
            >
              <RefreshCw size={18} />
            </button>

            <button
              onClick={() => captureFrame(step === 'front')}
              className="w-16 h-16 rounded-full bg-white flex items-center justify-center p-1 shadow-lg hover:scale-105 active:scale-95 transition-all"
            >
              <div className="w-full h-full rounded-full border-4 border-blue-600 bg-white" />
            </button>

            <button
              onClick={() => { stopCamera(); setStep('intro'); }}
              className="p-3 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          Step: REVIEW (FRONT OR BACK)
      ══════════════════════════════════════════ */}
      {(step === 'front-review' || step === 'back-review') && (
        <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-3xl p-6 text-center text-white space-y-5 shadow-2xl">
          <div>
            <p className="text-xs uppercase tracking-widest text-blue-400 font-bold">
              {step === 'front-review' ? 'Front Side Captured' : 'Back Side Captured'}
            </p>
            <h3 className="text-lg font-bold mt-1">Check Quality</h3>
            <p className="text-gray-400 text-xs">Ensure details and text on the card are clear.</p>
          </div>

          <div className="rounded-2xl overflow-hidden border-2 border-blue-500/60 shadow-xl bg-black">
            <img
              src={(step === 'front-review' ? front : back)?.dataUrl}
              alt="Captured ID"
              className="w-full h-auto object-cover"
            />
          </div>

          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => setStep(step === 'front-review' ? 'front' : 'back')}
              className="flex-1 flex items-center justify-center gap-2"
            >
              <RefreshCw size={15} /> Retake
            </Button>
            <Button
              variant="primary"
              onClick={() => setStep(step === 'front-review' ? 'back' : 'done')}
              className="flex-1 flex items-center justify-center gap-2"
            >
              {step === 'front-review' ? (
                <>
                  <ChevronRight size={15} /> Scan Back Side
                </>
              ) : (
                <>
                  <CheckCircle size={15} /> Confirm Both Sides
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          Step: DONE & SUBMIT
      ══════════════════════════════════════════ */}
      {step === 'done' && (
        <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-3xl p-6 sm:p-8 text-center text-white space-y-5 shadow-2xl">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-green-900/40 border-2 border-green-500 flex items-center justify-center">
              <CheckCircle size={36} className="text-green-400" />
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold">Ready to Save!</h2>
            <p className="text-gray-400 text-xs mt-1">
              Both front and back of your {selectedTypeObj.label} have been captured.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {front && (
              <div className="space-y-1">
                <span className="text-[10px] text-gray-400 font-bold uppercase">Front Side</span>
                <img src={front.dataUrl} alt="Front" className="rounded-xl border border-gray-700 object-cover w-full aspect-[1.586/1]" />
              </div>
            )}
            {back && (
              <div className="space-y-1">
                <span className="text-[10px] text-gray-400 font-bold uppercase">Back Side</span>
                <img src={back.dataUrl} alt="Back" className="rounded-xl border border-gray-700 object-cover w-full aspect-[1.586/1]" />
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => { setFront(null); setBack(null); setStep('intro'); }}
              className="flex-1"
            >
              Scan Again
            </Button>
            <Button
              variant="primary"
              onClick={handleDone}
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 font-bold"
            >
              Upload Scanned ID
            </Button>
          </div>
        </div>
      )}

      {/* Hidden canvas */}
      <canvas ref={canvasRef} className="hidden" />

      <style>{`
        @keyframes scanline {
          0% { transform: translateY(0); opacity: 1; }
          50% { transform: translateY(calc(100% - 2px)); opacity: 0.7; }
          100% { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default IDScanner;
