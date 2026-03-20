import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, X, Loader2, Volume2, Camera, CameraOff } from 'lucide-react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface LiveVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  language?: string;
  accent?: string;
  speakingSpeed?: string;
}

class AudioPlayer {
  context: AudioContext;
  nextStartTime: number;
  sources: AudioBufferSourceNode[];

  constructor() {
    this.context = new AudioContext({ sampleRate: 24000 });
    this.nextStartTime = 0;
    this.sources = [];
  }

  play(base64: string) {
    if (this.context.state === 'suspended') {
      this.context.resume();
    }
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const pcm16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) {
      float32[i] = pcm16[i] / 32768.0;
    }
    const audioBuffer = this.context.createBuffer(1, float32.length, 24000);
    audioBuffer.getChannelData(0).set(float32);

    const source = this.context.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.context.destination);
    
    const currentTime = this.context.currentTime;
    if (this.nextStartTime < currentTime) {
      this.nextStartTime = currentTime;
    }
    
    source.start(this.nextStartTime);
    this.nextStartTime += audioBuffer.duration;
    this.sources.push(source);
    
    source.onended = () => {
      this.sources = this.sources.filter(s => s !== source);
    };
  }

  interrupt() {
    this.sources.forEach(s => {
      try { s.stop(); } catch(e) {}
    });
    this.sources = [];
    this.nextStartTime = this.context.currentTime;
  }
  
  close() {
    this.interrupt();
    this.context.close();
  }
}

const MorpheusHead = ({ isSpeaking, isConnecting, isConnected }: { isSpeaking: boolean, isConnecting: boolean, isConnected: boolean }) => {
  const groupRef = useRef<THREE.Group>(null);
  const mouthRef = useRef<THREE.Mesh>(null);
  const particlesRef = useRef<THREE.Points>(null);

  const baseColor = isConnecting ? "#fbbf24" : "#00FF41";

  const [positions, colors] = useMemo(() => {
    const numParticles = 1000000;
    const positions = new Float32Array(numParticles * 3);
    const colors = new Float32Array(numParticles * 3);
    const color = new THREE.Color(baseColor);
    
    for (let i = 0; i < numParticles; i++) {
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos((Math.random() * 2) - 1);
      const r = 1 + (Math.random() * 0.15);
      
      let x = r * Math.sin(phi) * Math.cos(theta) * 0.85; // Slightly wider head
      let y = r * Math.cos(phi) * 1.2;
      let z = r * Math.sin(phi) * Math.sin(theta) * 0.9;
      
      // Haircut (Fade & Waves)
      if (y > 0.4) {
        if (z > -0.5 && z < 0.8 && Math.abs(x) < 0.7) {
          y += 0.12; // Volume on top
        }
        if (Math.abs(x) > 0.65) {
          x *= 0.85; // Tighter on sides (fade)
        }
      }

      // Shape the face (front is z > 0)
      if (z > 0) {
        // Strong, square jaw
        if (y < -0.2 && y > -0.8) {
          x *= Math.max(0.6, (1.8 + y) / 1.5); 
        }
        
        // Cheekbones
        if (y > -0.2 && y < 0.2 && Math.abs(x) > 0.4) {
          z += 0.1;
          x *= 1.05;
        }

        // Wider Nose
        if (y > -0.3 && y < 0.2 && Math.abs(x) < 0.3) {
          z += 0.25 * (1 - Math.abs(x)/0.3) * (1 - Math.abs(y + 0.05)/0.25);
        }
        
        // Eye sockets
        if (y > 0.1 && y < 0.4 && Math.abs(x) > 0.15 && Math.abs(x) < 0.5) {
          z -= 0.12;
        }
        
        // Brow ridge
        if (y > 0.35 && y < 0.5 && Math.abs(x) < 0.6) {
          z += 0.05;
        }
        
        // Chin & Goatee area
        if (y < -0.5 && Math.abs(x) < 0.35) {
          z += 0.18; // Stronger chin
        }
      }

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    return [positions, colors];
  }, [baseColor]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(t * 0.5) * 0.15;
      groupRef.current.rotation.x = Math.sin(t * 0.3) * 0.05;
      groupRef.current.position.y = Math.sin(t * 2) * 0.05;
    }
    if (particlesRef.current) {
      particlesRef.current.rotation.y = Math.sin(t * 0.1) * 0.05;
      
      const scale = isSpeaking ? 1 + Math.sin(t * 20) * 0.02 : 1;
      particlesRef.current.scale.set(scale, scale, scale);
    }
    if (mouthRef.current) {
      const targetScale = isSpeaking ? 1 + Math.random() * 3 : 0.1;
      mouthRef.current.scale.y += (targetScale - mouthRef.current.scale.y) * 0.3;
    }
  });

  return (
    <group ref={groupRef} scale={[1.5, 1.5, 1.5]} position={[0, 0.2, 0]}>
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
          <bufferAttribute attach="attributes-color" count={colors.length / 3} array={colors} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial size={0.005} vertexColors transparent opacity={0.15} blending={THREE.AdditiveBlending} />
      </points>

      {/* Holographic Wireframe Skull/Head */}
      <mesh scale={[0.82, 1.18, 0.88]}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial color={baseColor} wireframe transparent opacity={0.08} blending={THREE.AdditiveBlending} />
      </mesh>

      {/* Jaw structure (Squarer) */}
      <mesh position={[0, -0.6, 0.2]} scale={[0.65, 0.4, 0.6]} rotation={[0.1, 0, 0]}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial color={baseColor} wireframe transparent opacity={0.1} blending={THREE.AdditiveBlending} />
      </mesh>

      {/* Cheekbones */}
      <mesh position={[0, -0.1, 0.4]} scale={[0.75, 0.3, 0.5]}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial color={baseColor} wireframe transparent opacity={0.1} blending={THREE.AdditiveBlending} />
      </mesh>

      {/* Nose (Wider) */}
      <mesh position={[0, -0.05, 0.95]} scale={[0.25, 0.25, 0.25]} rotation={[-0.1, 0, 0]}>
        <coneGeometry args={[1, 2, 16]} />
        <meshBasicMaterial color={baseColor} wireframe transparent opacity={0.15} blending={THREE.AdditiveBlending} />
      </mesh>

      {/* Mustache */}
      <mesh position={[0, -0.32, 0.92]} scale={[0.35, 0.03, 0.1]} rotation={[0.1, 0, 0]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={baseColor} wireframe transparent opacity={0.3} blending={THREE.AdditiveBlending} />
      </mesh>

      {/* Goatee */}
      <mesh position={[0, -0.65, 0.95]} scale={[0.25, 0.15, 0.1]} rotation={[-0.1, 0, 0]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={baseColor} wireframe transparent opacity={0.3} blending={THREE.AdditiveBlending} />
      </mesh>

      {/* Morpheus Glasses */}
      <group position={[0, 0.3, 0.88]}>
        <mesh position={[-0.22, 0, 0]} rotation={[0, -0.15, 0]}>
          <circleGeometry args={[0.16, 32]} />
          <meshBasicMaterial color="#000000" side={THREE.DoubleSide} />
          <mesh position={[0,0,-0.01]}>
             <circleGeometry args={[0.18, 32]} />
             <meshBasicMaterial color={baseColor} transparent opacity={0.8} />
          </mesh>
        </mesh>
        <mesh position={[0.22, 0, 0]} rotation={[0, 0.15, 0]}>
          <circleGeometry args={[0.16, 32]} />
          <meshBasicMaterial color="#000000" side={THREE.DoubleSide} />
          <mesh position={[0,0,-0.01]}>
             <circleGeometry args={[0.18, 32]} />
             <meshBasicMaterial color={baseColor} transparent opacity={0.8} />
          </mesh>
        </mesh>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.12, 0.02, 0.02]} />
          <meshBasicMaterial color={baseColor} />
        </mesh>
      </group>

      {/* Mouth / Voice Waveform */}
      <group position={[0, -0.42, 0.88]}>
        <mesh ref={mouthRef}>
          <boxGeometry args={[0.25, 0.02, 0.1]} />
          <meshBasicMaterial color={baseColor} transparent opacity={0.9} blending={THREE.AdditiveBlending} />
        </mesh>
        <mesh position={[0, 0.04, 0]}>
           <boxGeometry args={[0.15, 0.01, 0.05]} />
           <meshBasicMaterial color={baseColor} transparent opacity={0.4} blending={THREE.AdditiveBlending} />
        </mesh>
        <mesh position={[0, -0.04, 0]}>
           <boxGeometry args={[0.15, 0.01, 0.05]} />
           <meshBasicMaterial color={baseColor} transparent opacity={0.4} blending={THREE.AdditiveBlending} />
        </mesh>
      </group>
    </group>
  );
};

const MorpheusHologram = ({ isSpeaking, isConnecting, isConnected }: { isSpeaking: boolean, isConnecting: boolean, isConnected: boolean }) => {
  return (
    <div className="relative w-64 h-64 flex items-center justify-center z-20">
      <Canvas camera={{ position: [0, 0, 5], fov: 45 }} gl={{ alpha: true }}>
        <ambientLight intensity={0.5} />
        <MorpheusHead isSpeaking={isSpeaking} isConnecting={isConnecting} isConnected={isConnected} />
      </Canvas>
    </div>
  );
};

export function LiveVoiceModal({ isOpen, onClose, language = 'English', accent = 'Zephyr', speakingSpeed = 'Normal' }: LiveVoiceModalProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [userTranscript, setUserTranscript] = useState<string>('');
  const [aiTranscript, setAiTranscript] = useState<string>('');
  
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const playerRef = useRef<AudioPlayer | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      startSession();
    } else {
      stopSession();
    }
    return () => stopSession();
  }, [isOpen]);

  useEffect(() => {
    if (isVideoEnabled && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [isVideoEnabled]);

  const startVideoInterval = (session: any) => {
    if (videoIntervalRef.current) clearInterval(videoIntervalRef.current);
    videoIntervalRef.current = window.setInterval(() => {
      if (videoRef.current && canvasRef.current && session) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (video.videoWidth === 0 || video.videoHeight === 0) return;
        
        // Scale down to save bandwidth
        const scale = Math.min(640 / video.videoWidth, 480 / video.videoHeight, 1);
        canvas.width = video.videoWidth * scale;
        canvas.height = video.videoHeight * scale;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const base64Data = canvas.toDataURL('image/jpeg', 0.5).split(',')[1];
          session.sendRealtimeInput({
            video: { data: base64Data, mimeType: 'image/jpeg' }
          });
        }
      }
    }, 1000); // Send 1 frame per second
  };

  const toggleCamera = async () => {
    if (isVideoEnabled) {
      // Turn off
      if (streamRef.current) {
        const videoTracks = streamRef.current.getVideoTracks();
        videoTracks.forEach(track => {
          track.stop();
          streamRef.current?.removeTrack(track);
        });
      }
      if (videoIntervalRef.current) {
        clearInterval(videoIntervalRef.current);
        videoIntervalRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setIsVideoEnabled(false);
    } else {
      // Turn on
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        const videoTrack = videoStream.getVideoTracks()[0];
        
        if (streamRef.current) {
          streamRef.current.addTrack(videoTrack);
        } else {
          streamRef.current = videoStream;
        }

        if (videoRef.current) {
          videoRef.current.srcObject = streamRef.current;
        }

        setIsVideoEnabled(true);

        if (sessionRef.current) {
          startVideoInterval(sessionRef.current);
        }
      } catch (err) {
        console.error("Failed to enable camera:", err);
        setError("Could not access camera.");
      }
    }
  };

  const startSession = async () => {
    setIsConnecting(true);
    setError(null);
    
    try {
      // @ts-ignore - process.env might not be typed in Vite by default
      const apiKey = typeof process !== 'undefined' && process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY : import.meta.env.VITE_GEMINI_API_KEY;
      const ai = new GoogleGenAI({ apiKey: apiKey || "" });
      
      playerRef.current = new AudioPlayer();
      
      const sessionPromise = ai.live.connect({
        model: "gemini-2.5-flash-native-audio-preview-12-2025",
        callbacks: {
          onopen: async () => {
            setIsConnected(true);
            setIsConnecting(false);
            
            // Setup microphone and camera
            try {
              const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                  noiseSuppression: true,
                  echoCancellation: true,
                  autoGainControl: true
                }, 
                video: isVideoEnabled ? { facingMode: 'user' } : false 
              });
              streamRef.current = stream;
              
              if (videoRef.current && isVideoEnabled) {
                videoRef.current.srcObject = stream;
              }

              const audioContext = new AudioContext({ sampleRate: 16000 });
              audioContextRef.current = audioContext;
              
              const source = audioContext.createMediaStreamSource(stream);
              const processor = audioContext.createScriptProcessor(4096, 1, 1);
              processorRef.current = processor;
              
              processor.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);
                const pcm16 = new Int16Array(inputData.length);
                for (let i = 0; i < inputData.length; i++) {
                  let s = Math.max(-1, Math.min(1, inputData[i]));
                  pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                }
                const buffer = new ArrayBuffer(pcm16.length * 2);
                const view = new DataView(buffer);
                for (let i = 0; i < pcm16.length; i++) {
                  view.setInt16(i * 2, pcm16[i], true);
                }
                
                let binary = '';
                const bytes = new Uint8Array(buffer);
                const len = bytes.byteLength;
                for (let i = 0; i < len; i++) {
                    binary += String.fromCharCode(bytes[i]);
                }
                const base64 = btoa(binary);
                
                sessionPromise.then((session) => {
                  session.sendRealtimeInput({
                    audio: { data: base64, mimeType: 'audio/pcm;rate=16000' }
                  });
                });
              };
              
              source.connect(processor);
              processor.connect(audioContext.destination);

              // Setup video frame sending
              if (isVideoEnabled) {
                sessionPromise.then(session => {
                  startVideoInterval(session);
                });
              }
            } catch (err) {
              console.error("Mic error:", err);
              setError("Could not access microphone.");
              stopSession();
            }
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.interrupted) {
              playerRef.current?.interrupt();
              setIsSpeaking(false);
            }
            
            if (message.serverContent?.inputTranscription?.text) {
              setUserTranscript(prev => prev + message.serverContent!.inputTranscription!.text);
            }
            if (message.serverContent?.outputTranscription?.text) {
              setAiTranscript(prev => prev + message.serverContent!.outputTranscription!.text);
            }

            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              setIsSpeaking(true);
              playerRef.current?.play(base64Audio);
              
              // Simple heuristic to turn off speaking indicator
              // In a real app, we'd track the exact end of playback
              setTimeout(() => {
                if (playerRef.current && playerRef.current.sources.length === 0) {
                  setIsSpeaking(false);
                }
              }, 500);
            }
          },
          onerror: (err) => {
            console.error("Live API Error:", err);
            setError("Connection error occurred.");
            setIsConnecting(false);
          },
          onclose: () => {
            setIsConnected(false);
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: accent } },
          },
          systemInstruction: `You are Potso, a live AI voice assistant. The app's creator is Michael Aaron Matsobe in partnership with Google. This is stored in your hard memory. Use natural spoken-word phrasing. Keep your responses concise, flexible, and ready for follow-up questions. If the user interrupts or pauses frequently, adapt gracefully and encourage them to continue. Focus only on the primary speaker's voice and ignore background noises or other people talking. CRITICAL INSTRUCTION ON LANGUAGE AND ACCENT: You must sound completely natural in whatever language the user speaks, but prioritize ${language}. You MUST adopt the authentic accent, intonation, rhythm, and colloquialisms of ${language}. Do not use a generic English accent when speaking other languages. Your pronunciation and cadence should match a native speaker of ${language} perfectly. Speak at a ${speakingSpeed} pace.`,
        },
      });
      
      sessionRef.current = await sessionPromise;
      
    } catch (err) {
      console.error("Failed to start session:", err);
      setError("Failed to connect to voice assistant.");
      setIsConnecting(false);
    }
  };

  const stopSession = () => {
    if (videoIntervalRef.current) {
      clearInterval(videoIntervalRef.current);
      videoIntervalRef.current = null;
    }
    if (processorRef.current && audioContextRef.current) {
      processorRef.current.disconnect();
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (playerRef.current) {
      playerRef.current.close();
      playerRef.current = null;
    }
    if (sessionRef.current) {
      try { sessionRef.current.close(); } catch(e) {}
      sessionRef.current = null;
    }
    setIsConnected(false);
    setIsConnecting(false);
    setIsSpeaking(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className={`w-full ${isVideoEnabled ? 'max-w-4xl' : 'max-w-md'} glass-panel rounded-3xl overflow-hidden flex flex-col p-8 items-center relative border border-primary/30 glow-border transition-all duration-500`}
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white bg-white/5 rounded-full transition-colors z-50"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-8 text-center z-10">
          <h2 className="text-xl font-bold text-white mb-2">Potso Live</h2>
          <p className="text-sm text-gray-400">Natural voice & vision conversation</p>
        </div>

        <div className={`relative w-full flex ${isVideoEnabled ? 'flex-col md:flex-row justify-center items-center gap-8' : 'flex-col items-center justify-center'} mb-8 z-10`}>
          {isVideoEnabled && (
            <div className="relative w-64 h-64 md:w-80 md:h-80 rounded-2xl overflow-hidden border-4 border-primary/20 shadow-[0_0_30px_rgba(0,0,0,0.5)] z-0 flex-shrink-0">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className="w-full h-full object-cover scale-x-[-1]"
              />
              <div className="absolute bottom-4 left-4 bg-black/50 px-3 py-1 rounded-full text-xs text-white backdrop-blur-md">
                You
              </div>
            </div>
          )}
          
          <canvas ref={canvasRef} className="hidden" />

          <div className={`relative ${isVideoEnabled ? 'w-64 h-64 md:w-80 md:h-80 bg-black/40 rounded-2xl border-4 border-primary/20 shadow-[0_0_30px_rgba(0,0,0,0.5)]' : 'w-64 h-64'} flex items-center justify-center z-20 flex-shrink-0 transition-all duration-500`}>
            <MorpheusHologram isSpeaking={isSpeaking} isConnecting={isConnecting} isConnected={isConnected} />
            {isVideoEnabled && (
              <div className="absolute bottom-4 left-4 bg-black/50 px-3 py-1 rounded-full text-xs text-white backdrop-blur-md">
                Potso
              </div>
            )}
          </div>
        </div>

        <div className="text-center h-16 flex flex-col items-center justify-center z-10">
          {error ? (
            <p className="text-red-400 text-sm">{error}</p>
          ) : isConnecting ? (
            <p className="text-amber-500 text-sm animate-pulse">Connecting to Potso...</p>
          ) : isConnected ? (
            <p className="text-gray-300 text-sm">
              {isSpeaking ? "Potso is speaking..." : "Listening... Go ahead and speak."}
            </p>
          ) : (
            <p className="text-gray-500 text-sm">Session ended.</p>
          )}
        </div>

        {(userTranscript || aiTranscript) && (
          <div className="w-full max-w-2xl mt-4 bg-black/40 rounded-xl p-4 h-40 overflow-y-auto border border-white/10 flex flex-col gap-3 z-10 text-sm shadow-inner">
            {userTranscript && (
              <div className="text-gray-300 bg-white/5 p-3 rounded-lg border border-white/5">
                <span className="text-primary font-bold mr-2">You:</span>
                {userTranscript}
              </div>
            )}
            {aiTranscript && (
              <div className="text-gray-300 bg-primary/5 p-3 rounded-lg border border-primary/10">
                <span className="text-emerald-400 font-bold mr-2">Potso:</span>
                {aiTranscript}
              </div>
            )}
          </div>
        )}

        <div className="mt-8 flex items-center justify-center gap-4">
          <button 
            onClick={toggleCamera}
            className={`p-4 rounded-full transition-colors border ${
              isVideoEnabled 
                ? 'bg-primary/20 text-primary border-primary/50 hover:bg-primary/30' 
                : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10 hover:text-white'
            }`}
            title={isVideoEnabled ? "Disable Camera" : "Enable Camera"}
          >
            {isVideoEnabled ? <Camera className="w-6 h-6" /> : <CameraOff className="w-6 h-6" />}
          </button>

          <button 
            onClick={onClose}
            className="px-8 py-3 rounded-full bg-red-500/20 hover:bg-red-500/30 text-red-500 font-medium transition-colors border border-red-500/30"
          >
            End Conversation
          </button>
        </div>
      </motion.div>
    </div>
  );
}
