export interface AudioRecorderState {
  isRecording: boolean;
  isPaused: boolean;
  durationMs: number;
}

export function getSupportedMimeType(): string {
  if (typeof window === "undefined" || !("MediaRecorder" in window)) {
    return "audio/webm";
  }
  const types = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
    "audio/wav",
  ];
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return "";
}

export class FactoryAudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;
  private startTime = 0;
  private timerInterval: NodeJS.Timeout | null = null;
  private elapsedBeforePause = 0;
  private currentMimeType = "audio/webm";

  public onTimeUpdate?: (elapsedMs: number) => void;
  public onWaveformData?: (dataArray: Uint8Array) => void;

  async start(): Promise<void> {
    this.audioChunks = [];
    this.elapsedBeforePause = 0;

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    // Set up Web Audio Analyser
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.audioContext = new AudioContextClass();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 64;
    this.analyser.smoothingTimeConstant = 0.8;

    this.sourceNode = this.audioContext.createMediaStreamSource(this.stream);
    this.sourceNode.connect(this.analyser);

    const mime = getSupportedMimeType();
    this.currentMimeType = mime;

    const options: MediaRecorderOptions = {
      audioBitsPerSecond: 24000, // 24 kbps speech-optimized
    };
    if (mime) {
      options.mimeType = mime;
    }

    this.mediaRecorder = new MediaRecorder(this.stream, options);

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    this.mediaRecorder.start(200); // 200ms slice
    this.startTime = Date.now();

    this.startAnimationLoop();
  }

  private startAnimationLoop() {
    const dataArray = new Uint8Array(this.analyser ? this.analyser.frequencyBinCount : 32);

    const tick = () => {
      if (!this.mediaRecorder || this.mediaRecorder.state === "inactive") return;

      if (this.analyser && this.mediaRecorder.state === "recording") {
        this.analyser.getByteFrequencyData(dataArray);
        this.onWaveformData?.(dataArray);

        const currentElapsed = this.elapsedBeforePause + (Date.now() - this.startTime);
        this.onTimeUpdate?.(currentElapsed);
      }

      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }

  pause() {
    if (this.mediaRecorder && this.mediaRecorder.state === "recording") {
      this.mediaRecorder.pause();
      this.elapsedBeforePause += Date.now() - this.startTime;
    }
  }

  resume() {
    if (this.mediaRecorder && this.mediaRecorder.state === "paused") {
      this.mediaRecorder.resume();
      this.startTime = Date.now();
    }
  }

  stop(): Promise<{ blob: Blob; durationMs: number; mimeType: string }> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error("MediaRecorder not initialized"));
        return;
      }

      const totalDuration = this.elapsedBeforePause + (this.mediaRecorder.state === "recording" ? Date.now() - this.startTime : 0);

      this.mediaRecorder.onstop = () => {
        const finalBlob = new Blob(this.audioChunks, {
          type: this.currentMimeType || "audio/webm",
        });

        // Clean up stream & audio context
        if (this.stream) {
          this.stream.getTracks().forEach((track) => track.stop());
          this.stream = null;
        }
        if (this.sourceNode) {
          this.sourceNode.disconnect();
          this.sourceNode = null;
        }
        if (this.audioContext && this.audioContext.state !== "closed") {
          this.audioContext.close();
          this.audioContext = null;
        }

        resolve({
          blob: finalBlob,
          durationMs: totalDuration,
          mimeType: this.currentMimeType || "audio/webm",
        });
      };

      if (this.mediaRecorder.state !== "inactive") {
        this.mediaRecorder.stop();
      }
    });
  }
}
