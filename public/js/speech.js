import { $id, showToast } from "./utils.js";

let micButton, recordingIndicator;
let isRecording = false;
let recognition = null;
let recordingStoppedIntentionally = false;
let pendingTranscript = "";

const createRecognition = () => {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;
  const rec = new SR();
  rec.lang = "en-US";
  rec.interimResults = true;
  rec.continuous = false;
  return rec;
};

const stopRecordingUI = () => {
  isRecording = false;
  recordingStoppedIntentionally = true;
  micButton?.classList.remove("recording");
  if (micButton) micButton.title = "Voice input";
  recordingIndicator?.classList.add("hidden");
};

const stopRecording = () => {
  recordingStoppedIntentionally = true;
  if (recognition) { try { recognition.stop(); } catch { /* ignore */ } }
  stopRecordingUI();
  const text = (pendingTranscript || document.getElementById("messageInput")?.value || "").trim();
  if (text) {
    const input = document.getElementById("messageInput");
    if (input) input.value = text;
    const sendBtn = document.getElementById("sendButton");
    if (sendBtn) { sendBtn.disabled = false; sendBtn.click(); }
  }
};

const startRecording = () => {
  recognition = createRecognition();
  if (!recognition) {
    if (micButton) micButton.style.display = "none";
    return;
  }
  pendingTranscript = "";
  recordingStoppedIntentionally = false;

  const input = document.getElementById("messageInput");
  const sendBtn = document.getElementById("sendButton");

  recognition.onresult = (event) => {
    let transcript = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
    }
    pendingTranscript = transcript;
    if (input) {
      input.value = transcript;
      input.style.height = "auto";
      input.style.height = input.scrollHeight + "px";
    }
    if (sendBtn) sendBtn.disabled = false;
  };

  recognition.onerror = (event) => {
    if (event.error !== "no-speech" && event.error !== "aborted") {
      showToast("Voice input error: " + event.error, "error");
    }
    stopRecordingUI();
  };

  recognition.onend = () => {
    if (isRecording && !recordingStoppedIntentionally) {
      const text = (pendingTranscript || input?.value || "").trim();
      if (text && input) {
        input.value = text;
        // Trigger form submit
        const form = document.getElementById("chatForm");
        if (form) form.dispatchEvent(new Event("submit"));
      }
    }
    stopRecordingUI();
  };

  try {
    recognition.start();
    isRecording = true;
    micButton?.classList.add("recording");
    if (micButton) micButton.title = "Tap to stop & send";
    recordingIndicator?.classList.remove("hidden");
  } catch { /* already started */ }
};

export const initSpeech = () => {
  micButton = $id("micButton");
  recordingIndicator = $id("recordingIndicator");
  if (micButton) {
    micButton.addEventListener("click", () => {
      if (isRecording) stopRecording();
      else startRecording();
    });
  }
};
