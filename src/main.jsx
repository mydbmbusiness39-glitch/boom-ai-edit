// Simple TTS Demo UI
class TTSDemo {
  constructor() {
    this.form = document.getElementById('ttsForm');
    this.textInput = document.getElementById('textInput');
    this.voiceSelect = document.getElementById('voiceSelect');
    this.generateBtn = document.getElementById('generateBtn');
    this.loading = document.getElementById('loading');
    this.error = document.getElementById('error');
    this.success = document.getElementById('success');
    this.audioPlayer = document.getElementById('audioPlayer');
    
    this.init();
  }
  
  init() {
    this.form.addEventListener('submit', this.handleSubmit.bind(this));
    
    // Add some sample text
    this.textInput.value = "Hello! Welcome to BOOM AI Text-to-Speech demo. This is a simple example of converting text to natural-sounding speech.";
  }
  
  async handleSubmit(e) {
    e.preventDefault();
    
    const text = this.textInput.value.trim();
    const voiceId = this.voiceSelect.value;
    
    if (!text) {
      this.showError('Please enter some text');
      return;
    }
    
    this.setLoading(true);
    this.hideMessages();
    
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, voiceId })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate speech');
      }
      
      if (data.success && data.audioContent) {
        this.playAudio(data.audioContent);
        this.showSuccess('Speech generated successfully!');
      } else {
        throw new Error('Invalid response from server');
      }
      
    } catch (error) {
      console.error('TTS Error:', error);
      this.showError(error.message || 'Failed to generate speech');
    } finally {
      this.setLoading(false);
    }
  }
  
  playAudio(base64Audio) {
    const audioBlob = this.base64ToBlob(base64Audio, 'audio/mpeg');
    const audioUrl = URL.createObjectURL(audioBlob);
    
    this.audioPlayer.src = audioUrl;
    this.audioPlayer.style.display = 'block';
    this.audioPlayer.play();
    
    // Clean up URL when audio ends
    this.audioPlayer.onended = () => {
      URL.revokeObjectURL(audioUrl);
    };
  }
  
  base64ToBlob(base64, mimeType) {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }
  
  setLoading(isLoading) {
    this.generateBtn.disabled = isLoading;
    this.loading.style.display = isLoading ? 'block' : 'none';
    this.generateBtn.textContent = isLoading ? 'Generating...' : 'Generate Speech';
  }
  
  showError(message) {
    this.error.textContent = message;
    this.error.style.display = 'block';
    this.success.style.display = 'none';
  }
  
  showSuccess(message) {
    this.success.textContent = message;
    this.success.style.display = 'block';
    this.error.style.display = 'none';
  }
  
  hideMessages() {
    this.error.style.display = 'none';
    this.success.style.display = 'none';
  }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new TTSDemo();
});