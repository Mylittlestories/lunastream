import { useEffect, useRef, useState } from 'react';
import { 
  Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  SkipBack, SkipForward, Settings, X, Loader2 
} from 'lucide-react';

interface VideoPlayerProps {
  url: string;
  title: string;
  subtitles?: Subtitle[];
  onClose: () => void;
}

interface Subtitle {
  id: string;
  label: string;
  language: string;
  url: string;
}

export default function VideoPlayer({ url, title, subtitles = [], onClose }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [selectedSubtitle, setSelectedSubtitle] = useState<Subtitle | null>(null);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const controlsTimeout = useRef<NodeJS.Timeout>();

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const video = videoRef.current;
      if (!video) return;

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'arrowleft':
          e.preventDefault();
          video.currentTime -= 10;
          break;
        case 'arrowright':
          e.preventDefault();
          video.currentTime += 10;
          break;
        case 'arrowup':
          e.preventDefault();
          setVolume(Math.min(1, volume + 0.1));
          break;
        case 'arrowdown':
          e.preventDefault();
          setVolume(Math.max(0, volume - 0.1));
          break;
        case 'j':
          e.preventDefault();
          video.currentTime -= 10;
          break;
        case 'l':
          e.preventDefault();
          video.currentTime += 10;
          break;
        case 'escape':
          if (isFullscreen) {
            toggleFullscreen();
          } else {
            onClose();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isPlaying, isFullscreen, volume]);

  // Auto-hide controls
  useEffect(() => {
    const handleMouseMove = () => {
      setShowControls(true);
      if (controlsTimeout.current) {
        clearTimeout(controlsTimeout.current);
      }
      controlsTimeout.current = setTimeout(() => {
        if (isPlaying) {
          setShowControls(false);
        }
      }, 3000);
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('mousemove', handleMouseMove);
      return () => container.removeEventListener('mousemove', handleMouseMove);
    }
  }, [isPlaying]);

  // Update time
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateTime = () => setCurrentTime(video.currentTime);
    video.addEventListener('timeupdate', updateTime);
    return () => video.removeEventListener('timeupdate', updateTime);
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleFullscreen = async () => {
    const container = containerRef.current;
    if (!container) return;

    if (!isFullscreen) {
      if (container.requestFullscreen) {
        await container.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const newVolume = parseFloat(e.target.value);
    video.volume = newVolume;
    setVolume(newVolume);
    if (newVolume === 0) {
      setIsMuted(true);
    } else {
      setIsMuted(false);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const newTime = parseFloat(e.target.value);
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handlePlaybackRateChange = (rate: number) => {
    const video = videoRef.current;
    if (!video) return;

    video.playbackRate = rate;
    setPlaybackRate(rate);
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleVideoError = () => {
    setError('Failed to load video. Please try a different stream.');
    setIsLoading(false);
  };

  const handleVideoLoad = () => {
    setIsLoading(false);
    const video = videoRef.current;
    if (video) {
      setDuration(video.duration);
      video.play();
      setIsPlaying(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center" ref={containerRef}>
      {/* Video Element */}
      <video
        ref={videoRef}
        src={url}
        onLoadedMetadata={handleVideoLoad}
        onError={handleVideoError}
        onEnded={() => setIsPlaying(false)}
        className="w-full h-full object-contain"
        crossOrigin="anonymous"
      >
        {selectedSubtitle && (
          <track
            kind="subtitles"
            src={selectedSubtitle.url}
            srcLang={selectedSubtitle.language}
            label={selectedSubtitle.label}
            default
          />
        )}
      </video>

      {/* Loading Spinner */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <Loader2 className="w-12 h-12 animate-spin text-white" />
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg">
          {error}
        </div>
      )}

      {/* Controls Overlay */}
      <div className={`absolute inset-0 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
        {/* Top Bar */}
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-white text-xl font-semibold truncate">{title}</h2>
            <button
              onClick={onClose}
              className="text-white hover:text-red-400 transition-colors"
              title="Close (ESC)"
            >
              <X size={28} />
            </button>
          </div>
        </div>

        {/* Center Play Button */}
        {!isPlaying && !isLoading && (
          <button
            onClick={togglePlay}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full p-6 transition-all"
          >
            <Play size={48} className="text-white" />
          </button>
        )}

        {/* Bottom Controls */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          {/* Progress Bar */}
          <div className="mb-4">
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-2 bg-white/30 rounded-lg appearance-none cursor-pointer slider"
              style={{
                background: `linear-gradient(to right, #7c3aed ${
                  (currentTime / duration) * 100
                }%, rgba(255,255,255,0.3) ${(currentTime / duration) * 100}%)`
              }}
            />
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Play/Pause */}
              <button
                onClick={togglePlay}
                className="text-white hover:text-purple-400 transition-colors"
                title={isPlaying ? 'Pause (K)' : 'Play (K)'}
              >
                {isPlaying ? <Pause size={24} /> : <Play size={24} />}
              </button>

              {/* Skip Backward */}
              <button
                onClick={() => videoRef.current && (videoRef.current.currentTime -= 10)}
                className="text-white hover:text-purple-400 transition-colors"
                title="Back 10s (J)"
              >
                <SkipBack size={20} />
              </button>

              {/* Skip Forward */}
              <button
                onClick={() => videoRef.current && (videoRef.current.currentTime += 10)}
                className="text-white hover:text-purple-400 transition-colors"
                title="Forward 10s (L)"
              >
                <SkipForward size={20} />
              </button>

              {/* Volume */}
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleMute}
                  className="text-white hover:text-purple-400 transition-colors"
                  title="Mute (M)"
                >
                  {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-20 h-1 bg-white/30 rounded-lg appearance-none cursor-pointer slider"
                />
              </div>

              {/* Time Display */}
              <span className="text-white text-sm">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center gap-4">
              {/* Subtitles */}
              {subtitles.length > 0 && (
                <div className="relative group">
                  <button className="text-white hover:text-purple-400 transition-colors" title="Subtitles">
                    <Settings size={20} />
                  </button>
                  <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block bg-black/90 rounded-lg p-2 min-w-[200px]">
                    <p className="text-white text-sm font-semibold mb-2">Subtitles</p>
                    <button
                      onClick={() => setSelectedSubtitle(null)}
                      className={`w-full text-left px-3 py-2 rounded text-sm ${
                        !selectedSubtitle ? 'bg-purple-600 text-white' : 'text-white hover:bg-white/10'
                      }`}
                    >
                      Off
                    </button>
                    {subtitles.map(sub => (
                      <button
                        key={sub.id}
                        onClick={() => setSelectedSubtitle(sub)}
                        className={`w-full text-left px-3 py-2 rounded text-sm ${
                          selectedSubtitle?.id === sub.id ? 'bg-purple-600 text-white' : 'text-white hover:bg-white/10'
                        }`}
                      >
                        {sub.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Playback Speed */}
              <div className="relative group">
                <button className="text-white hover:text-purple-400 transition-colors text-sm font-semibold">
                  {playbackRate}x
                </button>
                <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block bg-black/90 rounded-lg p-2 min-w-[100px]">
                  {[0.5, 0.75, 1, 1.25, 1.5, 2].map(rate => (
                    <button
                      key={rate}
                      onClick={() => handlePlaybackRateChange(rate)}
                      className={`w-full text-left px-3 py-2 rounded text-sm ${
                        playbackRate === rate ? 'bg-purple-600 text-white' : 'text-white hover:bg-white/10'
                      }`}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Fullscreen */}
              <button
                onClick={toggleFullscreen}
                className="text-white hover:text-purple-400 transition-colors"
                title="Fullscreen (F)"
              >
                {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts Help */}
      <div className={`absolute top-4 right-4 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
        <div className="bg-black/60 backdrop-blur-sm rounded-lg p-3 text-xs text-white/70">
          <p className="font-semibold mb-1">Shortcuts:</p>
          <p>Space/K: Play/Pause</p>
          <p>F: Fullscreen</p>
          <p>M: Mute</p>
          <p>J/L: ±10s</p>
          <p>←/→: Seek</p>
          <p>↑/↓: Volume</p>
          <p>ESC: Exit</p>
        </div>
      </div>

      {/* Custom Styles */}
      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #7c3aed;
          cursor: pointer;
        }
        .slider::-moz-range-thumb {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #7c3aed;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  );
}
