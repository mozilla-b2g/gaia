/* global bridge, View */
'use strict';

var debug = 1 ? (...args) => console.log('[PlayerView]', ...args) : () => {};

const REPEAT_VALUES = ['off', 'list', 'song'];
const SHUFFLE_VALUES = ['off', 'on'];

var PlayerView = View.extend(function PlayerView() {
  View.call(this); // super();

  this.artwork = document.getElementById('artwork');
  this.controls = document.getElementById('controls');
  this.seekBar = document.getElementById('seek-bar');

  this.artwork.addEventListener('share', () => this.share());
  this.artwork.addEventListener('repeat', () => this.setRepeatSetting(this.artwork.repeat));
  this.artwork.addEventListener('shuffle', () => this.setShuffleSetting(this.artwork.shuffle));

  this.controls.addEventListener('play', () => this.play());
  this.controls.addEventListener('pause', () => this.pause());
  this.controls.addEventListener('previous', () => this.previous());
  this.controls.addEventListener('next', () => this.next());

  this.seekBar.addEventListener('seek', evt => this.seek(evt.detail.elapsedTime));

  this.client = bridge.client({ service: 'music-service', endpoint: window.parent });
  this.client.on('play', () => this.controls.paused = false);
  this.client.on('pause', () => this.controls.paused = true);
  this.client.on('songChange', () => this.update());
  this.client.on('durationChange', duration => this.seekBar.duration = duration);
  this.client.on('elapsedTimeChange', elapsedTime => this.seekBar.elapsedTime = elapsedTime);

  this.getRepeatSetting().then(repeat => this.artwork.repeat = repeat);
  this.getShuffleSetting().then(shuffle => this.artwork.shuffle = shuffle);

  this.update();
});

PlayerView.prototype.update = function() {
  this.getPlaybackStatus().then((status) => {
    this.getSong(status.filePath).then((song) => {
      this.artwork.artist = song.metadata.artist;
      this.artwork.album = song.metadata.album;

      window.parent.setHeaderTitle(song.metadata.title);
    });

    this.getSongArtwork(status.filePath)
      .then(blob => this.artwork.src = URL.createObjectURL(blob));

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
  return this.getPlaybackStatus()
    .then(status => this.getSong(status.filePath))
    .then(song => song.metadata.title);
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

PlayerView.prototype.previous = function() {
  fetch('/api/queue/previous');
};

PlayerView.prototype.next = function() {
  fetch('/api/queue/next');
};

PlayerView.prototype.share = function() {
  this.getPlaybackStatus().then((status) => {
    fetch('/api/songs/share' + status.filePath);
  });
};

PlayerView.prototype.getPlaybackStatus = function() {
  return fetch('/api/audio/status').then(response => response.json());
};

PlayerView.prototype.getRepeatSetting = function() {
  return fetch('/api/queue/repeat')
    .then(response => response.json())
    .then(index => REPEAT_VALUES[index]);
};

PlayerView.prototype.setRepeatSetting = function(repeat) {
  fetch('/api/queue/repeat/' + REPEAT_VALUES.indexOf(repeat));
};

PlayerView.prototype.getShuffleSetting = function() {
  return fetch('/api/queue/shuffle')
    .then(response => response.json())
    .then(index => SHUFFLE_VALUES[index]);
};

PlayerView.prototype.setShuffleSetting = function(shuffle) {
  fetch('/api/queue/shuffle/' + SHUFFLE_VALUES.indexOf(shuffle));
};

PlayerView.prototype.getSong = function(filePath) {
  return fetch('/api/songs/info' + filePath).then(response => response.json());
};

PlayerView.prototype.getSongArtwork = function(filePath) {
  return fetch('/api/artwork/original' + filePath).then(response => response.blob());
};

window.view = new PlayerView();
