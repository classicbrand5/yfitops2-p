// ─────────────────────────────────────────────────────────
// useVoiceInput — Voice transcription via Whisper (Section C1)
//
// Captures audio from the microphone via MediaRecorder,
// sends the blob to the transcribe-audio Edge Function,
// and returns the transcript string.
// ─────────────────────────────────────────────────────────

import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export interface UseVoiceInputOptions {
  onTranscript: (text: string) => void;
}

export function useVoiceInput({ onTranscript }: UseVoiceInputOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    if (isRecording) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Prefer webm/opus for best compression
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        // Stop all tracks to release mic
        stream.getTracks().forEach((t) => t.stop());

        const blob = new Blob(chunksRef.current, { type: mimeType });

        // Send to edge function for transcription
        setIsTranscribing(true);
        try {
          const formData = new FormData();
          formData.append('file', blob, 'voice.webm');

          const { data, error } = await supabase.functions.invoke<{ text: string }>(
            'transcribe-audio',
            { body: formData },
          );

          if (error || !data?.text) {
            toast.error('Transcription failed', {
              description: error?.message ?? 'No text returned',
            });
            return;
          }

          onTranscript(data.text.trim());
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          toast.error(`Transcription error: ${msg}`);
        } finally {
          setIsTranscribing(false);
        }
      };

      recorder.start(250); // collect chunks every 250ms
      recorderRef.current = recorder;
      setIsRecording(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('Permission')) {
        toast.error('Microphone permission denied');
      } else {
        toast.error(`Could not start recording: ${msg}`);
      }
    }
  }, [isRecording, onTranscript]);

  const stopRecording = useCallback(() => {
    if (!isRecording || !recorderRef.current) return;
    recorderRef.current.stop();
    recorderRef.current = null;
    setIsRecording(false);
  }, [isRecording]);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      void startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  return {
    isRecording,
    isTranscribing,
    startRecording,
    stopRecording,
    toggleRecording,
  };
}
