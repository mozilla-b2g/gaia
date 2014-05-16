'use strict';

function MockVideoPlayer() {
  MockVideoPlayer.instances.push(this);
  this.src = null;
  this.readyState = 0;
  this.seeking = false;
  this.duration = 0;
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

MockVideoPlayer.prototype.setSeeking = function(seeking) {
  this.seeking = seeking;
};

MockVideoPlayer.prototype.setDuration = function(duration) {
  this.duration = duration;
};

MockVideoPlayer.prototype.cloneNode = function() {
  return this;
};
