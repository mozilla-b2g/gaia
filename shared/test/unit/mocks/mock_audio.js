'use strict';

function MockAudio(url) {
  MockAudio.instances.push(this);
  this.url = url;
  this.readyState = 1;
  this.paused = true;
}

MockAudio.instances = [];

MockAudio.mSetup = function() {
  MockAudio.instances = [];
};

MockAudio.mTeardown = function() {
  MockAudio.instances = [];
};

MockAudio.prototype.HAVE_NOTHING = 0;

MockAudio.prototype.play = function() {
  // FIXME can we replace playing with paused?
  this.playing = true;
  this.paused = false;
};

MockAudio.prototype.pause = function() {
  this.playing = false;
  this.paused = true;
};

MockAudio.prototype.cloneNode = function() {
  return this;
};
