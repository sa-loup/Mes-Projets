const lyricsData = {
  0: [
    { time: 0.5, word: "J'ai" },
    { time: 1.2, word: "le" },
    { time: 1.7, word: "coup" },
    { time: 2.3, word: "d'avance" },
    { time: 3.0, word: "dans" },
    { time: 3.5, word: "le" },
    { time: 3.9, word: "regard" },
    { time: 4.5, word: "de" },
    { time: 4.8, word: "mes" },
    { time: 5.2, word: "frères" }
  ]
};

class MusicPlayer {
  constructor() {
    this.currentSongIndex = 0;
    this.isPlaying = false;
    this.isMuted = false;
    this.karaokeActive = false;
    this.lyricsMap = {};

    // DOM Elements
    this.audio = document.getElementById('audio');
    this.cover = document.getElementById('cover');
    this.title = document.getElementById('title');
    this.artist = document.getElementById('artist');
    this.playBtn = document.getElementById('playBtn');
    this.prevBtn = document.getElementById('prevBtn');
    this.nextBtn = document.getElementById('nextBtn');
    this.muteBtn = document.getElementById('muteBtn');
    this.songList = document.getElementById('songList');
    this.playIcon = document.getElementById('playIcon');
    this.pauseIcon = document.getElementById('pauseIcon');
    this.volumeIcon = document.getElementById('volumeIcon');
    this.muteIcon = document.getElementById('muteIcon');
    this.songItems = document.querySelectorAll('.song-item');
    
    // Karaoke
    this.lyricsDisplay = document.getElementById('lyricsDisplay');
    this.toggleKaraokeBtn = document.getElementById('toggleKaraoke');

    // Progress bar elements - Vérification de l'existence des éléments
    this.progress = document.getElementById('progress');
    this.progressBar = document.querySelector('.progress-bar');
    this.currentTimeEl = document.getElementById('currentTime');
    this.durationEl = document.getElementById('duration');

    if (!this.progress || !this.progressBar) {
      console.error('Éléments de progression introuvables!');
    }

    this.setupEventListeners();
    this.setupAudioVisualizer();
    
    // Charge la première chanson par défaut
    if (this.songItems.length > 0) {
      this.loadSong(0);
    }
  }
  
  setupAudioVisualizer() {
    this.canvas = document.getElementById('visualizer');
    if (!this.canvas) return;
    
    this.ctx = this.canvas.getContext('2d');
    this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    this.analyser = this.audioCtx.createAnalyser();
    
    if (this.audio) {
      this.source = this.audioCtx.createMediaElementSource(this.audio);
      this.source.connect(this.analyser);
      this.analyser.connect(this.audioCtx.destination);
      this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
      this.visualize();
    }
  }
  
  visualize() {
    const draw = () => {
      requestAnimationFrame(draw);
      this.analyser.getByteFrequencyData(this.frequencyData);
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      const barWidth = (this.canvas.width / this.analyser.frequencyBinCount) * 2.5;
      let x = 0;

      for (let i = 0; i < this.analyser.frequencyBinCount; i++) {
        const barHeight = this.frequencyData[i] / 2;
        const r = 255 - barHeight;
        const g = 50 + barHeight;
        const b = 100;
        this.ctx.fillStyle = `rgb(${r},${g},${b})`;
        this.ctx.fillRect(x, this.canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }
    };
    draw();
  }

  setupEventListeners() {
    this.playBtn?.addEventListener('click', () => this.togglePlay());
    this.prevBtn?.addEventListener('click', () => this.playPrevious());
    this.nextBtn?.addEventListener('click', () => this.playNext());
    this.muteBtn?.addEventListener('click', () => this.toggleMute());
    this.audio?.addEventListener('ended', () => this.playNext());
    this.audio?.addEventListener('timeupdate', () => this.updateProgress());
    this.progressBar?.addEventListener('click', (e) => this.setProgress(e));
    this.toggleKaraokeBtn?.addEventListener('click', () => this.toggleKaraoke());

    this.songItems.forEach(item => {
      item.addEventListener('click', () => {
        const index = parseInt(item.dataset.index);
        this.loadSong(index);
        this.isPlaying = true;
        this.audio.play().catch(e => console.error('Erreur de lecture:', e));
        this.updatePlayPauseIcon();
        this.updatePlaylistState();
      });
    });
  }

  loadLyrics(index) {
    const lyrics = lyricsData[index] || [];
    this.lyricsMap = lyrics;
    this.lyricsDisplay.innerHTML = '';
    lyrics.forEach(item => {
      const span = document.createElement('span');
      span.textContent = item.word;
      span.dataset.time = item.time;
      this.lyricsDisplay.appendChild(span);
    });
  }

  highlightCurrentWord(currentTime) {
    const spans = this.lyricsDisplay.querySelectorAll('span');
    spans.forEach(span => {
      const wordTime = parseFloat(span.dataset.time);
      span.classList.toggle('active', wordTime <= currentTime);
    });
  }

  toggleKaraoke() {
    this.karaokeActive = !this.karaokeActive;
    document.querySelector('.karaoke-container')?.classList.toggle('hidden', !this.karaokeActive);
  }

  loadSong(index) {
    const selectedSong = this.songItems[index];
    if (!selectedSong) return;

    this.currentSongIndex = index;

    // Réinitialise la progression
    this.progress.style.width = '0%';
    this.currentTimeEl.textContent = '0:00';
    this.durationEl.textContent = '0:00';

    // Charge les nouvelles données
    this.audio.src = selectedSong.dataset.audio;
    this.cover.src = selectedSong.dataset.cover;
    this.title.textContent = selectedSong.querySelector('h4')?.textContent || '';
    this.artist.textContent = selectedSong.querySelector('p')?.textContent || '';

    this.loadLyrics(index);
    this.updatePlaylistState();

    // Gestion des métadonnées audio
    const onLoadedMetadata = () => {
      this.durationEl.textContent = this.formatTime(this.audio.duration);
      this.audio.removeEventListener('loadedmetadata', onLoadedMetadata);
    };

    this.audio.addEventListener('loadedmetadata', onLoadedMetadata);
    this.audio.addEventListener('error', (e) => {
      console.error('Erreur de chargement audio:', e);
    });
  }

  togglePlay() {
    if (this.isPlaying) {
      this.audio.pause();
    } else {
      this.audio.play().catch(e => console.error('Erreur de lecture:', e));
    }
    this.isPlaying = !this.isPlaying;
    this.updatePlayPauseIcon();
    this.updatePlaylistState();
  }

  playNext() {
    this.currentSongIndex = (this.currentSongIndex + 1) % this.songItems.length;
    this.loadSong(this.currentSongIndex);
    if (this.isPlaying) {
      this.audio.play().catch(e => console.error('Erreur de lecture:', e));
    }
  }

  playPrevious() {
    this.currentSongIndex = (this.currentSongIndex - 1 + this.songItems.length) % this.songItems.length;
    this.loadSong(this.currentSongIndex);
    if (this.isPlaying) {
      this.audio.play().catch(e => console.error('Erreur de lecture:', e));
    }
  }

  toggleMute() {
    this.audio.muted = !this.audio.muted;
    this.isMuted = this.audio.muted;
    this.updateMuteIcon();
  }

  updateProgress() {
    const { duration, currentTime } = this.audio;
    
    // Mise à jour du temps courant
    this.currentTimeEl.textContent = this.formatTime(currentTime);
    
    // Mise à jour de la barre de progression seulement si la durée est valide
    if (duration && duration > 0 && !isNaN(duration)) {
      const progressPercent = (currentTime / duration) * 100;
      this.progress.style.width = `${progressPercent}%`;
    }

    // Mise à jour du karaoké si actif
    if (this.karaokeActive) {
      this.highlightCurrentWord(currentTime);
    }
  }

  setProgress(e) {
    const width = this.progressBar.clientWidth;
    const clickX = e.offsetX;
    const duration = this.audio.duration;
    
    if (duration && !isNaN(duration)) {
      this.audio.currentTime = (clickX / width) * duration;
    }
  }

  formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
  }

  updatePlayPauseIcon() {
    this.playIcon?.classList.toggle('hidden', this.isPlaying);
    this.pauseIcon?.classList.toggle('hidden', !this.isPlaying);
  }

  updateMuteIcon() {
    this.volumeIcon?.classList.toggle('hidden', this.isMuted);
    this.muteIcon?.classList.toggle('hidden', !this.isMuted);
  }

  updatePlaylistState() {
    this.songItems.forEach((item, index) => {
      item.classList.toggle('active', index === this.currentSongIndex);

      const existingIndicator = item.querySelector('.playing-indicator');
      if (existingIndicator) existingIndicator.remove();

      if (index === this.currentSongIndex && this.isPlaying) {
        const indicator = document.createElement('div');
        indicator.className = 'playing-indicator';
        item.appendChild(indicator);
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const player = new MusicPlayer();
});