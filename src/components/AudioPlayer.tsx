import { useState, useRef, useEffect } from "react";
import WaveSurfer from "wavesurfer.js";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, Volume2, VolumeX, Download, Loader2 } from "lucide-react";
import { BookmarkManager } from "./BookmarkManager";
import { useBookmarks } from "@/hooks/useBookmarks";
import { Separator } from "@/components/ui/separator";

interface AudioPlayerProps {
  url: string;
  title?: string;
  callLogId: string;
}

export const AudioPlayer = ({ url, title = "Gravação da chamada", callLogId }: AudioPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [error, setError] = useState<string | null>(null);
  
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const { bookmarks } = useBookmarks(callLogId);

  useEffect(() => {
    if (!waveformRef.current) return;

    // Inicializar WaveSurfer
    const wavesurfer = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: 'hsl(var(--muted-foreground) / 0.3)',
      progressColor: 'hsl(var(--primary))',
      cursorColor: 'hsl(var(--primary))',
      barWidth: 2,
      barRadius: 3,
      cursorWidth: 2,
      height: 80,
      barGap: 2,
      normalize: true,
    });

    wavesurferRef.current = wavesurfer;

    // Carregar áudio
    wavesurfer.load(url);

    // Eventos
    wavesurfer.on('ready', () => {
      setDuration(wavesurfer.getDuration());
      setIsLoading(false);
      
      // Adicionar marcadores de bookmarks
      bookmarks.forEach((bookmark) => {
        const markerEl = document.createElement('div');
        markerEl.style.position = 'absolute';
        markerEl.style.top = '0';
        markerEl.style.bottom = '0';
        markerEl.style.width = '2px';
        markerEl.style.backgroundColor = bookmark.color || '#ef4444';
        markerEl.style.left = `${(bookmark.timestamp / wavesurfer.getDuration()) * 100}%`;
        markerEl.style.cursor = 'pointer';
        markerEl.style.zIndex = '10';
        markerEl.title = bookmark.label;
        
        markerEl.addEventListener('click', () => {
          wavesurfer.seekTo(bookmark.timestamp / wavesurfer.getDuration());
        });
        
        waveformRef.current?.appendChild(markerEl);
      });
    });

    wavesurfer.on('audioprocess', () => {
      setCurrentTime(wavesurfer.getCurrentTime());
    });

    wavesurfer.on('finish', () => {
      setIsPlaying(false);
      setCurrentTime(0);
    });

    wavesurfer.on('error', (err) => {
      console.error('Erro no WaveSurfer:', err);
      setError('Erro ao carregar o áudio');
      setIsLoading(false);
    });

    // Click no waveform para seek
    wavesurfer.on('interaction', () => {
      setCurrentTime(wavesurfer.getCurrentTime());
    });

    return () => {
      wavesurfer.destroy();
    };
  }, [url, bookmarks]);

  // Sincronizar playback rate
  useEffect(() => {
    if (wavesurferRef.current) {
      wavesurferRef.current.setPlaybackRate(playbackRate);
    }
  }, [playbackRate]);

  // Sincronizar volume
  useEffect(() => {
    if (wavesurferRef.current) {
      wavesurferRef.current.setVolume(isMuted ? 0 : volume);
    }
  }, [volume, isMuted]);

  const togglePlayPause = () => {
    if (!wavesurferRef.current) return;
    wavesurferRef.current.playPause();
    setIsPlaying(!isPlaying);
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0]);
    if (value[0] > 0) {
      setIsMuted(false);
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.replace(/\s+/g, '_')}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const playbackRates = [
    { value: 0.5, label: '0.5x' },
    { value: 0.75, label: '0.75x' },
    { value: 1, label: '1x (Normal)' },
    { value: 1.25, label: '1.25x' },
    { value: 1.5, label: '1.5x' },
    { value: 1.75, label: '1.75x' },
    { value: 2, label: '2x' },
  ];

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center text-destructive">
          <p className="font-semibold mb-2">Erro ao carregar áudio</p>
          <p className="text-sm">{error}</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">{title}</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            disabled={isLoading}
          >
            <Download className="h-4 w-4 mr-2" />
            Baixar
          </Button>
        </div>

        {/* Waveform */}
        <div className="relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-20">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}
          <div ref={waveformRef} className="w-full" />
        </div>

        {/* Controles */}
        <div className="space-y-4">
          {/* Play/Pause e Tempo */}
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={togglePlayPause}
              disabled={isLoading}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>

            <div className="flex-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
              <div className="w-full bg-secondary h-1 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-100"
                  style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>

          {/* Velocidade e Volume */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                Velocidade:
              </span>
              <Select
                value={playbackRate.toString()}
                onValueChange={(value) => setPlaybackRate(parseFloat(value))}
              >
                <SelectTrigger className="w-32 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {playbackRates.map((rate) => (
                    <SelectItem key={rate.value} value={rate.value.toString()}>
                      {rate.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 flex-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={toggleMute}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </Button>
              <Slider
                value={[isMuted ? 0 : volume]}
                max={1}
                step={0.01}
                onValueChange={handleVolumeChange}
                className="w-24"
              />
            </div>
          </div>
        </div>
      </Card>

      <Separator />

      <Card className="p-4">
        <BookmarkManager 
          callLogId={callLogId}
          currentTime={currentTime}
          onSeek={(time) => {
            if (wavesurferRef.current) {
              wavesurferRef.current.seekTo(time / wavesurferRef.current.getDuration());
            }
          }}
        />
      </Card>
    </div>
  );
};
