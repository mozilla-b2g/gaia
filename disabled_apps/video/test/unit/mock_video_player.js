'use strict';

function MockVideoPlayer() {
  MockVideoPlayer.instances.push(this);
  this.src = null;
  this.readyState = 0;
  this.seeking = false;
  this.duration = 0;
  this.currentTime = 0;
  this.classList = [];
}

MockVideoPlayer.instances = [];

MockVideoPlayer.mSetup = function() {
  MockVideoPlayer.instances = [];
};

MockVideoPlayer.mTeardown = function() {
  MockVideoPlayer.instances = [];
};

MockVideoPlayer.prototype.play = function() {
};

MockVideoPlayer.prototype.pause = function() {
};

MockVideoPlayer.prototype.load = function() {
};

MockVideoPlayer.prototype.setSeeking = function(seeking) {
  this.seeking = seeking;
};

MockVideoPlayer.prototype.setDuration = function(duration) {
  this.duration = duration;
};

MockVideoPlayer.prototype.hasAttribute = function(attr) {
  if (attr === 'src') {
    return (this.src !== undefined && this.src !== null);
  }

  return (this.classList.indexOf(attr) !== -1);
};

MockVideoPlayer.prototype.removeAttribute = function(attr) {
  if (attr === 'src') {
    this.src = null;
  }
  else {
    var index = this.classList.indexOf(attr);
    if (index >= 0) {
      this.classList.splice(index, 1);
    }
  }
};

MockVideoPlayer.prototype.fastSeek = function(seekTime) {
  this.currentTime = seekTime;
};

MockVideoPlayer.prototype.cloneNode = function() {
  return this;
};

MockVideoPlayer.prototype.querySelectorAll = function(selector) {
  return [];
};
