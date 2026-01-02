import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export interface YouTubeModalProps {
  videoId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const YouTubeModal: React.FC<YouTubeModalProps> = ({ videoId, isOpen, onClose }) => {
  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 bg-black/90 flex items-center justify-center"
      style={{ zIndex: 9999 }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl mx-4 aspect-video"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 text-white hover:text-neon-pink transition-colors"
        >
          <X className="w-8 h-8" />
        </button>
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`}
          className="w-full h-full rounded-lg border border-neon-purple/50 shadow-[0_0_30px_rgba(191,0,255,0.3)]"
          style={{ zIndex: 10000 }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    </div>,
    document.body
  );
};

export default YouTubeModal;
