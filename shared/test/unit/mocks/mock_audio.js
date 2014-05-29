'use strict';

function MockAudio(url) {
  MockAudio.instances.push(this);
  this.url = url;
}

MockAudio.instances = [];

MockAudio.mSetup = function() {
  MockAudio.instances = [];
};

MockAudio.mTeardown = function() {
  MockAudio.instances = [];
};

MockAudio.prototype.play = function() {
  this.playing = true;
  if (this.onended) {
    setTimeout(this.onended.bind(this, { type: 'ended' }), 25);
  }
};

MockAudio.prototype.pause = function() {
  this.playing = false;
};

MockAudio.prototype.cloneNode = function() {
  return this;
};

MockAudio.prototype.setAttribute = function(key, value) {
};

function MockAudioContext(channel) {
  MockAudioContext.instances.push(this);
  this.channel = channel;
  this.currentTime = 0;
  this.sampleRate = 0;
  this.destination = null;
}

MockAudioContext.instances = [];

MockAudioContext.mSetup = function() {
  MockAudioContext.instances = [];
};

MockAudioContext.mTeardown = function() {
  MockAudioContext.instances = [];
};

MockAudioContext.prototype.createBuffer = function() {};
MockAudioContext.prototype.createBufferSource = function() {};
MockAudioContext.prototype.createGain = function() {};
