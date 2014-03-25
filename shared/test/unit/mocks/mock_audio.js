'use strict';

function MockAudio(url) {
  MockAudio.instances.push(this);
  this.url = url;
  this.readyState = 1;
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
  this.playing = true;
};

MockAudio.prototype.pause = function() {
  this.playing = false;
};

MockAudio.prototype.cloneNode = function() {
  return this;
};
