import React, { useEffect, useRef } from "react";
import { X, Camera, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Html5QrcodeScanner } from "html5-qrcode";
import { Button } from "./Button";

interface ScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (decodedText: string) => void;
  title?: string;
}

export const ScannerModal: React.FC<ScannerModalProps> = ({ isOpen, onClose, onScan, title = "Scan QR Code" }) => {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure the container is rendered
      const timer = setTimeout(() => {
        const scanner = new Html5QrcodeScanner(
          "qr-reader",
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
            showTorchButtonIfSupported: true,
          },
          /* verbose= */ false,
        );

        scanner.render(
          (decodedText) => {
            onScan(decodedText);
            scanner.clear(); // Stop scanning after success
            onClose();
          },
          (_error) => {
            // console.warn(_error);
          },
        );

        scannerRef.current = scanner;
      }, 100);

      return () => {
        clearTimeout(timer);
        if (scannerRef.current) {
          scannerRef.current.clear().catch((err) => console.error("Failed to clear scanner", err));
        }
      };
    }
  }, [isOpen, onScan, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className='fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6'>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className='absolute inset-0 bg-slate-900/80 backdrop-blur-md' />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className='relative w-full max-w-lg bg-white dark:bg-dark-surface rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-dark-border'
          >
            {/* Header */}
            <div className='p-6 border-b border-slate-50 dark:border-dark-border flex items-center justify-between'>
              <div className='flex items-center gap-3'>
                <div className='p-3 bg-primary/10 text-primary rounded-2xl'>
                  <Camera size={20} />
                </div>
                <div>
                  <h2 className='text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight'>{title}</h2>
                  <p className='text-[10px] text-slate-500 font-bold uppercase tracking-widest'>Align QR code within the frame</p>
                </div>
              </div>
              <Button variant='ghost' size='icon' onClick={onClose} className='rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors'>
                <X size={20} />
              </Button>
            </div>

            {/* Scanner Container */}
            <div className='p-6 h-[400px] flex items-center justify-center bg-slate-50 dark:bg-dark-bg/20'>
              <div id='qr-reader' className='w-full border-none rounded-2xl overflow-hidden shadow-inner' />
            </div>

            {/* Footer / Hint */}
            <div className='p-6 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-50 dark:border-dark-border flex flex-col items-center gap-3'>
              <div className='flex items-center gap-2 text-amber-500 bg-amber-500/10 px-4 py-2 rounded-full'>
                <Zap size={14} className='animate-pulse' />
                <span className='text-[10px] font-black uppercase tracking-widest'>Camera Active</span>
              </div>
              <p className='text-center text-[10px] text-slate-400 font-medium px-8'>If the QR code is damaged or unreadable, please use the manual search feature in the main screen.</p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
