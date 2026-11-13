export function isDictationSupported() {
  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function startDictation({
  lang = 'es-MX',
  onPartial,
  onFinal,
  onEnd,
  onError,
} = {}) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return null;

  const recognition = new SpeechRecognition();
  recognition.lang = lang;
  recognition.interimResults = true;
  recognition.continuous = false;
  recognition.maxAlternatives = 1;

  let finalText = '';
  let running = true;

  recognition.onresult = (event) => {
    let interim = '';
    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const result = event.results[index];
      const transcript = result[0].transcript;
      if (result.isFinal) finalText += transcript;
      else interim += transcript;
    }
    if (onPartial) onPartial(`${finalText}${interim}`.trim());
    if (finalText && onFinal) onFinal(finalText);
  };

  recognition.onerror = (event) => {
    running = false;
    if (onError) onError(event.error || 'unknown');
  };

  recognition.onend = () => {
    if (!running) return;
    running = false;
    if (onEnd) onEnd(finalText.trim());
  };

  try {
    recognition.start();
  } catch (error) {
    return null;
  }

  return {
    stop() {
      if (!running) return;
      running = false;
      recognition.stop();
      if (onEnd) onEnd(finalText.trim());
    },
    get isRunning() {
      return running;
    },
  };
}
