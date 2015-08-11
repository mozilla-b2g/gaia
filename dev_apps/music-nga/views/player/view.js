/* global threads, View */

var debug = 1 ? (...args) => console.log('[PlayerView]', ...args) : () => {};

var PlayerView = View.extend(function PlayerView() {
  View.call(this); // super();

  this.artwork = document.getElementById('artwork');
  this.controls = document.getElementById('controls');
  this.seekBar = document.getElementById('seek-bar');

  this.artwork.addEventListener('share', () => this.share());

  this.controls.addEventListener('play', () => this.play());
  this.controls.addEventListener('pause', () => this.pause());

  this.seekBar.addEventListener('seek', evt => this.seek(evt.detail.elapsedTime));

  this.client = threads.client('music-service', window.parent);

  this.client.on('play', () => this.controls.paused = false);
  this.client.on('pause', () => this.controls.paused = true);

  this.client.on('durationChange', duration => this.seekBar.duration = duration);
  this.client.on('elapsedTimeChange', elapsedTime => this.seekBar.elapsedTime = elapsedTime);

  this.update();
});

PlayerView.prototype.update = function() {
  this.getPlaybackStatus().then((status) => {
    this.getSong(status.filePath).then((song) => {
      this.artwork.artist = song.metadata.artist;
      this.artwork.album = song.metadata.album;
    });

    this.artwork.src = '/api/artwork/original' + status.filePath;
    this.controls.paused = status.paused;
    this.seekBar.duration = status.duration;
    this.seekBar.elapsedTime = status.elapsedTime;
    this.render();
  });
};

PlayerView.prototype.destroy = function() {
  this.client.destroy();

  View.prototype.destroy.call(this); // super(); // Always call *last*
};

PlayerView.prototype.title = function() {
  return this.getPlaybackStatus().then((status) => {
    return this.getSong(status.filePath).then((song) => {
      return song.metadata.title;
    });
  });
};

PlayerView.prototype.render = function() {
  View.prototype.render.call(this); // super();
};

PlayerView.prototype.seek = function(time) {
  fetch('/api/audio/seek/' + time);
};

PlayerView.prototype.play = function() {
  fetch('/api/audio/play');
};

PlayerView.prototype.pause = function() {
  fetch('/api/audio/pause');
};

PlayerView.prototype.share = function() {
  this.getPlaybackStatus().then((status) => {
    fetch('/api/songs/share' + status.filePath);
  });
};

PlayerView.prototype.getPlaybackStatus = function() {
  return fetch('/api/audio/status').then(response => response.json());
};

PlayerView.prototype.getSong = function(filePath) {
  return fetch('/api/songs/info' + filePath).then(response => response.json());
};

window.view = new PlayerView();
