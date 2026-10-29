/**
 * MetaFold Mobile Terminal v4 - Speech Recognition Module (Whisper & Web Speech API)
 */

import { ref } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.prod.js';
import { load, save, formatTimer } from '../utils/helpers.js';

export function createSpeech({ tr, flash, config, lang, formData, generalNote, currentTemplate, openSettings }) {
  const speechMode = ref(load('metafold_speech_mode', 'browser'));
  const setSpeechMode = (m) => {
    speechMode.value = m;
    save('metafold_speech_mode', m);
  };

  const activeSpeechField = ref(null);
  const isRecordingAudio = ref(false);
  const isTranscribing = ref(false);
  const recordingTarget = ref(null);
  const recordingSeconds = ref(0);

  let timerInterval = null;
  let mediaRecorder = null;
  let audioStream = null;
  let audioChunks = [];

  let rec = null;
  let target = null;
  let wantOn = false;
  let committed = '';
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

  const getVal = (k) => (k === '__general' ? generalNote.value : (formData.value[k] || ''));
  const setVal = (k, v) => {
    if (k === '__general') generalNote.value = v;
    else formData.value[k] = v;
  };
  const join = (a, b) => [a, b].filter(Boolean).join(' ');

  const isRecordingNow = (key) => {
    return (speechMode.value === 'whisper' && isRecordingAudio.value && recordingTarget.value === key) ||
           (speechMode.value === 'browser' && activeSpeechField.value === key);
  };

  // --- 1. Whisper Audio Recording (MediaRecorder -> n8n Webhook) ---
  const startAudioRecording = async (key) => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert(tr('Kamera und Mikrofon erfordern HTTPS und Browser-Unterstützung.'));
      return;
    }
    try {
      audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunks = [];
      recordingTarget.value = key;
      recordingSeconds.value = 0;

      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' :
                   MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '';
      }

      mediaRecorder = mimeType ? new MediaRecorder(audioStream, { mimeType }) : new MediaRecorder(audioStream);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) audioChunks.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        clearInterval(timerInterval);
        if (audioStream) {
          audioStream.getTracks().forEach(t => t.stop());
          audioStream = null;
        }
        isRecordingAudio.value = false;

        if (audioChunks.length === 0) {
          recordingTarget.value = null;
          return;
        }

        const blobType = mediaRecorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunks, { type: blobType });
        await transcribeWithWhisper(audioBlob, key);
      };

      mediaRecorder.start(250);
      isRecordingAudio.value = true;
      timerInterval = setInterval(() => { recordingSeconds.value++; }, 1000);

    } catch (err) {
      console.error('Audio-Startfehler:', err);
      alert((tr('Audio-Aufnahme fehlgeschlagen') || 'Audio-Aufnahme fehlgeschlagen') + ': ' + err.message);
      isRecordingAudio.value = false;
      recordingTarget.value = null;
    }
  };

  const stopAudioRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
  };

  const transcribeWithWhisper = async (audioBlob, key) => {
    const whisperUrl = config.value.whisperWebhookUrl || config.value.n8nWebhookUrl;
    if (!whisperUrl) {
      alert(tr('settings.whisperMissing') || 'Bitte trage in den Einstellungen (⚙️) eine Whisper Webhook URL ein.');
      if (openSettings) openSettings();
      recordingTarget.value = null;
      return;
    }

    isTranscribing.value = true;
    try {
      const formDataPayload = new FormData();
      const ext = audioBlob.type.includes('mp4') ? 'mp4' : 'webm';
      formDataPayload.append('file', audioBlob, `voice_${Date.now()}.${ext}`);
      formDataPayload.append('field', key);
      formDataPayload.append('template_id', currentTemplate.value?.id || '');
      formDataPayload.append('timestamp', new Date().toISOString());

      const res = await fetch(whisperUrl, {
        method: 'POST',
        body: formDataPayload
      });

      if (!res.ok) throw new Error('HTTP ' + res.status);

      const data = await res.json();
      const text = (data.text || data.transcript || data.transcription ||
                   (Array.isArray(data) && data[0] && (data[0].text || data[0].transcript)) || '').trim();

      if (text) {
        const current = getVal(key).trim();
        setVal(key, join(current, text));
        flash('✨ ' + (tr('voice.whisperTranscribed') || 'Mit Whisper transkribiert!'));
      } else {
        console.warn('Keine Text-Rückgabe von Whisper:', data);
        flash(tr('voice.noText') || 'Kein Text erkannt', false);
      }
    } catch (err) {
      console.error('Whisper-Transkriptionsfehler:', err);
      alert((tr('alerts.sendError') || 'Fehler beim Senden') + ' (Whisper): ' + err.message);
    } finally {
      isTranscribing.value = false;
      recordingTarget.value = null;
    }
  };

  // --- 2. Browser Speech (Web Speech API) ---
  const startBrowserSpeech = () => {
    rec = new SR();
    rec.lang = lang.value === 'en' ? 'en-US' : 'de-DE';
    rec.continuous = false;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let fin = '', interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript.trim();
        if (e.results[i].isFinal) fin = join(fin, t); else interim = join(interim, t);
      }
      if (fin) committed = join(committed, fin);
      if (target) setVal(target, join(committed, interim));
    };
    rec.onerror = (e) => {
      if (!['no-speech', 'aborted'].includes(e.error)) {
        console.error('Sprachfehler:', e.error);
        wantOn = false;
      }
    };
    rec.onend = () => {
      if (wantOn) {
        try { startBrowserSpeech(); return; } catch (_) {}
      }
      wantOn = false;
      target = null;
      activeSpeechField.value = null;
    };
    rec.start();
  };

  const toggleBrowserSpeech = (key) => {
    if (!window.isSecureContext) {
      alert(tr('alerts.speechHttps') || 'Spracherkennung erfordert eine sichere Verbindung (HTTPS)!');
      return;
    }
    if (!SR) {
      alert(tr('alerts.speechUnsupported') || 'Dieser Browser unterstützt keine direkte Spracherkennung.');
      return;
    }
    if (activeSpeechField.value) {
      wantOn = false;
      rec?.stop();
      return;
    }
    const f = currentTemplate.value?.fields.find(x => x.key === key);
    wantOn = key === '__general' || f?.type === 'textarea';
    target = key;
    committed = getVal(key).trim();
    activeSpeechField.value = key;
    try {
      startBrowserSpeech();
    } catch (e) {
      console.warn(e);
      wantOn = false;
      target = null;
      activeSpeechField.value = null;
    }
  };

  const handleSpeechAction = (key) => {
    if (speechMode.value === 'whisper') {
      if (isRecordingAudio.value) {
        stopAudioRecording();
      } else {
        startAudioRecording(key);
      }
    } else {
      toggleBrowserSpeech(key);
    }
  };

  return {
    speechMode,
    setSpeechMode,
    activeSpeechField,
    isRecordingAudio,
    isTranscribing,
    recordingTarget,
    recordingSeconds,
    formatTimer,
    isRecordingNow,
    handleSpeechAction,
    toggleBrowserSpeech
  };
}
