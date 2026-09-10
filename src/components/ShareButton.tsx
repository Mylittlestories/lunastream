'use client';

import { useState } from 'react';
import { Share2, X, Twitter, Facebook, Link as LinkIcon, Mail, Check } from 'lucide-react';
import { 
  nativeShare, shareOnTwitter, shareOnFacebook, 
  shareViaEmail, copyToClipboard, generateShareUrl, generateShareText 
} from '@/lib/social-sharing';

interface ShareButtonProps {
  title: string;
  imdbId: string;
  type: 'movie' | 'series';
}

export default function ShareButton({ title, imdbId, type }: ShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = generateShareUrl(imdbId, type);
  const shareText = generateShareText(title, type);

  const handleNativeShare = async () => {
    const success = await nativeShare({
      title,
      text: shareText,
      url: shareUrl
    });
    
    if (!success) {
      setIsOpen(true);
    }
  };

  const handleCopyLink = async () => {
    const success = await copyToClipboard(shareUrl);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      <button
        onClick={handleNativeShare}
        className="flex items-center gap-2 bg-[#0b0b1a] hover:bg-[#1a1a3e] text-gray-300 hover:text-white px-4 py-2 rounded-lg transition-colors"
        title="Share"
      >
        <Share2 size={18} />
        Share
      </button>

      {/* Share Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#111128] rounded-2xl border border-[#1a1a3e] max-w-md w-full">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-[#1a1a3e]">
              <h2 className="text-xl font-semibold text-white">Share</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="mb-6">
                <p className="text-white font-medium mb-2">{title}</p>
                <p className="text-sm text-gray-400">Share this {type} with friends</p>
              </div>

              {/* Share Options */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <button
                  onClick={() => {
                    shareOnTwitter({ title, text: shareText, url: shareUrl });
                    setIsOpen(false);
                  }}
                  className="flex items-center gap-3 p-4 bg-[#0b0b1a] hover:bg-[#1a1a3e] rounded-lg transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-[#1DA1F2] flex items-center justify-center">
                    <Twitter size={20} className="text-white" />
                  </div>
                  <span className="text-white font-medium">Twitter</span>
                </button>

                <button
                  onClick={() => {
                    shareOnFacebook({ title, text: shareText, url: shareUrl });
                    setIsOpen(false);
                  }}
                  className="flex items-center gap-3 p-4 bg-[#0b0b1a] hover:bg-[#1a1a3e] rounded-lg transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-[#1877F2] flex items-center justify-center">
                    <Facebook size={20} className="text-white" />
                  </div>
                  <span className="text-white font-medium">Facebook</span>
                </button>

                <button
                  onClick={() => {
                    shareViaEmail({ title, text: shareText, url: shareUrl });
                    setIsOpen(false);
                  }}
                  className="flex items-center gap-3 p-4 bg-[#0b0b1a] hover:bg-[#1a1a3e] rounded-lg transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-[#7c3aed] flex items-center justify-center">
                    <Mail size={20} className="text-white" />
                  </div>
                  <span className="text-white font-medium">Email</span>
                </button>

                <button
                  onClick={handleCopyLink}
                  className="flex items-center gap-3 p-4 bg-[#0b0b1a] hover:bg-[#1a1a3e] rounded-lg transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-[#10b981] flex items-center justify-center">
                    {copied ? <Check size={20} className="text-white" /> : <LinkIcon size={20} className="text-white" />}
                  </div>
                  <span className="text-white font-medium">
                    {copied ? 'Copied!' : 'Copy Link'}
                  </span>
                </button>
              </div>

              {/* URL Display */}
              <div className="bg-[#0b0b1a] rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Share URL</p>
                <p className="text-sm text-gray-300 break-all">{shareUrl}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
