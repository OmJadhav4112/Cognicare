import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { saveVoiceNote, getVoiceNotes, deleteVoiceNote } from '../../services/voiceNotesService';
import PageHeader from '../../components/common/PageHeader';
import Spinner    from '../../components/common/Spinner';
import { useToast } from '../../components/common/Toast';

import { useAuth } from '../../context/AuthContext';

const RECORDING_STATES = {
  idle:      'idle',
  recording: 'recording',
  preview:   'preview',   // recorded but not saved
  playing:   'playing',
  saving:    'saving',
};

export default function VoiceNotesPage() {
  const { t }  = useLanguage();
  const { user } = useAuth();
  const toast  = useToast();

  const userId = user?.id || user?._id;

  // ── State ─────────────────────────────────────────────────────────────────
  const [recState,  setRecState]  = useState(RECORDING_STATES.idle);
  const [notes,     setNotes]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [noteName,  setNoteName]  = useState('');
  const [elapsedMs, setElapsedMs] = useState(0);
  const [playingId, setPlayingId] = useState(null); // id of note currently playing
  const [previewUrl, setPreviewUrl] = useState(null); // object URL for just-recorded blob

  // ── Refs ──────────────────────────────────────────────────────────────────
  const mediaRecorderRef = useRef(null);
  const chunksRef        = useRef([]);
  const audioBlobRef     = useRef(null);    // the recorded blob awaiting save
  const previewAudioRef  = useRef(null);    // <audio> for preview
  const savedAudioRef    = useRef(null);    // <audio> for saved notes
  const timerRef         = useRef(null);
  const startTimeRef     = useRef(null);

  // ── Load saved notes ──────────────────────────────────────────────────────
  const loadNotes = useCallback(async () => {
    try {
      const list = await getVoiceNotes(userId);
      setNotes(list);
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { loadNotes(); }, [loadNotes]);

  // ── Timer ─────────────────────────────────────────────────────────────────
  const startTimer = () => {
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setElapsedMs(Date.now() - startTimeRef.current);
    }, 100);
  };
  const stopTimer = () => {
    clearInterval(timerRef.current);
    timerRef.current = null;
  };

  const formatTime = (ms) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  };

  // ── Record ────────────────────────────────────────────────────────────────
  const handleRecord = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast(t('mic_denied'), 'error'); return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];

      let mimeType = 'audio/webm';
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported) {
        if (MediaRecorder.isTypeSupported('audio/webm')) mimeType = 'audio/webm';
        else if (MediaRecorder.isTypeSupported('audio/mp4')) mimeType = 'audio/mp4';
        else if (MediaRecorder.isTypeSupported('audio/ogg')) mimeType = 'audio/ogg';
        else mimeType = '';
      }

      const options = mimeType ? { mimeType } : {};
      const mr = new MediaRecorder(stream, options);
      mr.ondataavailable = e => { if (e.data?.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });
        audioBlobRef.current = blob;
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        setRecState(RECORDING_STATES.preview);
        stopTimer();
      };
      mediaRecorderRef.current = mr;
      mr.start(250); // collect chunks every 250ms
      startTimer();
      setRecState(RECORDING_STATES.recording);
    } catch (err) {
      toast(err.message || t('mic_denied'), 'error');
    }
  };

  const handleStop = () => {
    mediaRecorderRef.current?.stop();
    // onstop callback fires async, sets state to preview
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!audioBlobRef.current) { toast(t('save_recording_first'), 'warning'); return; }
    setRecState(RECORDING_STATES.saving);
    try {
      const saved = await saveVoiceNote(audioBlobRef.current, noteName, userId);
      setNotes(prev => [saved, ...prev.filter(n => n.id !== saved.id)]);
      toast(t('voice_note_saved'), 'success');
      // cleanup
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      audioBlobRef.current = null;
      setNoteName('');
      setElapsedMs(0);
      setRecState(RECORDING_STATES.idle);
    } catch (err) {
      toast(err.message || 'Could not save voice note.', 'error');
      setRecState(RECORDING_STATES.preview);
    }
  };

  // ── Discard preview ───────────────────────────────────────────────────────
  const handleDiscard = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    audioBlobRef.current = null;
    setNoteName('');
    setElapsedMs(0);
    setRecState(RECORDING_STATES.idle);
  };

  // ── Play saved note ───────────────────────────────────────────────────────
  const handlePlaySaved = (note) => {
    if (playingId === note.id) {
      savedAudioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    if (savedAudioRef.current) {
      savedAudioRef.current.pause();
      savedAudioRef.current.src = '';
    }
    const audio = new Audio(note.url);
    savedAudioRef.current = audio;
    audio.onended = () => setPlayingId(null);
    audio.onerror = () => { toast(t('playback_error'), 'error'); setPlayingId(null); };
    audio.play();
    setPlayingId(note.id);
  };

  // ── Delete saved note ─────────────────────────────────────────────────────
  const handleDelete = async (note) => {
    try {
      if (playingId === note.id) {
        savedAudioRef.current?.pause();
        setPlayingId(null);
      }
      await deleteVoiceNote(note.id, note.storePath, userId);
      setNotes(prev => prev.filter(n => n.id !== note.id));
      toast(t('voice_note_deleted'), 'info');
    } catch {
      toast('Could not delete voice note.', 'error');
    }
  };

  // cleanup on unmount
  useEffect(() => () => {
    stopTimer();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    savedAudioRef.current?.pause();
  }, []); // eslint-disable-line

  // ── Render ────────────────────────────────────────────────────────────────
  const isRecording = recState === RECORDING_STATES.recording;
  const isPreview   = recState === RECORDING_STATES.preview;
  const isSaving    = recState === RECORDING_STATES.saving;

  return (
    <div className="page-wrapper animate-fade-in">
      <PageHeader
        title={t('voice_notes')}
        emoji="🎙️"
        backTo="/patient"
        subtitle={t('voice_notes_subtitle')}
      />

      {/* ── Recorder card ────────────────────────────────────────────── */}
      <div className="card mb-6">

        {/* Timer display */}
        <div className="text-center mb-4">
          <span
            className="text-5xl font-mono font-bold"
            style={{ color: isRecording ? 'var(--c-danger-500)' : 'var(--text-primary)' }}
          >
            {formatTime(elapsedMs)}
          </span>
          {isRecording && (
            <div className="mt-2 flex items-center justify-center gap-2"
              style={{ color: 'var(--c-danger-500)' }}>
              <span
                className="inline-block w-3 h-3 rounded-full bg-danger-500 animate-recording"
              />
              <span className="text-base font-medium">{t('recording_in_progress')}</span>
            </div>
          )}
        </div>

        {/* Main microphone / record button */}
        {!isPreview && !isSaving && (
          <div className="flex justify-center mb-4">
            <button
              onClick={isRecording ? handleStop : handleRecord}
              className={`
                w-24 h-24 rounded-full flex items-center justify-center
                text-5xl shadow-lg transition-all duration-200 active:scale-95
                ${isRecording
                  ? 'bg-danger-500 text-white animate-recording'
                  : 'bg-primary-600 text-white hover:bg-primary-700'}
              `}
              aria-label={isRecording ? t('stop_recording') : t('record')}
            >
              {isRecording ? '⏹️' : '🎙️'}
            </button>
          </div>
        )}

        {/* State label */}
        {!isPreview && !isSaving && (
          <p className="text-center text-base font-medium" style={{ color: 'var(--text-muted)' }}>
            {isRecording ? t('stop_recording') : t('record')}
          </p>
        )}

        {/* Preview controls — shown after recording stops */}
        {isPreview && (
          <div className="flex flex-col gap-3">
            {previewUrl && (
              <audio
                ref={previewAudioRef}
                src={previewUrl}
                controls
                className="w-full rounded-2xl"
                style={{ height: '3rem' }}
              />
            )}

            <input
              type="text"
              value={noteName}
              onChange={e => setNoteName(e.target.value)}
              className="field-input"
              placeholder={t('note_name_ph')}
              maxLength={80}
            />

            <div className="flex gap-3">
              <button onClick={handleDiscard} className="btn-ghost flex-1">
                {t('delete_note')}
              </button>
              <button onClick={handleSave} disabled={isSaving} className="btn-primary flex-1">
                {isSaving ? <Spinner size="sm" /> : t('save_note')}
              </button>
            </div>
          </div>
        )}

        {isSaving && (
          <div className="flex items-center justify-center gap-2 py-4"
            style={{ color: 'var(--text-muted)' }}>
            <Spinner size="sm" />
            <span>{t('saving')}</span>
          </div>
        )}
      </div>

      {/* ── Saved notes list ─────────────────────────────────────────── */}
      <h2 className="text-xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
        🎵 {t('voice_notes')}
      </h2>

      {loading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : notes.length === 0 ? (
        <div className="card text-center py-10">
          <p className="text-5xl mb-3">🎙️</p>
          <p className="font-semibold text-lg mb-1" style={{ color: 'var(--text-secondary)' }}>
            {t('no_voice_notes')}
          </p>
          <p className="text-base" style={{ color: 'var(--text-muted)' }}>
            {t('no_voice_notes_msg')}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {notes.map(note => (
            <div
              key={note.id}
              className="card flex items-center gap-4"
            >
              {/* Play / Pause button */}
              <button
                onClick={() => handlePlaySaved(note)}
                className={`
                  w-14 h-14 rounded-full flex items-center justify-center
                  text-2xl shrink-0 transition-all active:scale-95
                  ${playingId === note.id
                    ? 'bg-danger-500 text-white'
                    : 'bg-primary-100 text-primary-700 hover:bg-primary-200'}
                `}
                aria-label={playingId === note.id ? t('pause') : t('play')}
              >
                {playingId === note.id ? '⏸️' : '▶️'}
              </button>

              {/* Note info */}
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-lg truncate" style={{ color: 'var(--text-primary)' }}>
                  {note.name}
                </div>
                {note.createdAt && (
                  <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    {note.createdAt?.toDate
                      ? note.createdAt.toDate().toLocaleString('en-IN', {
                          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                        })
                      : new Date(note.createdAt).toLocaleString('en-IN', {
                          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                        })
                    }
                  </div>
                )}
              </div>

              {/* Delete button */}
              <button
                onClick={() => handleDelete(note)}
                className="w-10 h-10 rounded-xl flex items-center justify-center
                           text-xl transition-colors hover:bg-danger-50"
                style={{ color: 'var(--c-danger-500)' }}
                aria-label={t('delete_note')}
              >
                🗑️
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-center mt-6" style={{ color: 'var(--text-muted)' }}>
        🔒 Your voice notes are stored securely and are only accessible by you.
      </p>
    </div>
  );
}
