'use strict';

function MockAudio(src) {
  MockAudio.instances.push(this);
  this.src = src;
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

MockAudio.prototype.load = function() {
};

MockAudio.prototype.play = function() {
  // FIXME can we replace playing with paused?
  this.playing = true;
  this.paused = false;
};

MockAudio.prototype.pause = function() {
  this.playing = false;
  this.paused = true;
};

MockAudio.prototype.removeAttribute = function() {
};

MockAudio.prototype.cloneNode = function() {
  return this;
};

function MockAudioContext(channel) {
  MockAudioContext.instances.push(this);
  this.mozAudioChannelType = channel;
  this.currentTime = 0;
  this.sampleRate = 0;
  this.destination = {};
}

MockAudioContext.instances = [];

MockAudioContext.mSetup = function() {
  MockAudioContext.instances = [];
};

MockAudioContext.mTeardown = function() {
  MockAudioContext.instances = [];
};

MockAudioContext.prototype.createBuffer = function() { return {}; };
MockAudioContext.prototype.createBufferSource = function() {
  return {
    connect: function() {},
    start: function() {},
    stop: function() {}
  };
};
MockAudioContext.prototype.createGain = function() {
  return {
    connect() {},
    gain: {
      setValueAtTime() {},
      setValueCurveAtTime() {}
    }
  };
};
MockAudioContext.prototype.createOscillator = function() {
  return {
    frequency: { value: 0 },
    connect: function() {},
    start: function() {},
    stop: function() {}
  };
};
MockAudioContext.prototype.addEventListener = function() {};
MockAudioContext.prototype.removeEventListener = function() {};
