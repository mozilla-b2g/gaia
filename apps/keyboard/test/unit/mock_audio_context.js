'use strict';

/* global MockEventTarget */

/**
 * This file provide incomplete interfaces of Web Audio API for users to
 * create stub on top of.
 * New interfaces can simply be added by manually copying and editing WebIDL
 * from Gecko source tree.
 */

var MockAudioNode = function(ctx) {
  this.context = ctx;
};
MockAudioNode.prototype = Object.create(MockEventTarget.prototype);
MockAudioNode.prototype.context = null;
MockAudioNode.prototype.numberOfInputs = 0;
MockAudioNode.prototype.numberOfOutputs = 0;
MockAudioNode.prototype.channelCount = 2;
MockAudioNode.prototype.channelCountMode = 'explicit';
MockAudioNode.prototype.channelInterpretation = 'speakers';
MockAudioNode.prototype.connect =
MockAudioNode.prototype.disconnect = function() {
  throw 'MockAudioNode: Unimplemented. Stub me?';
};

var MockAudioDestinationNode = function(ctx) {
  MockAudioNode.call(this, ctx);

  this.numberOfInputs = 1;
  this.numberOfOutputs = 0;
};
MockAudioDestinationNode.prototype = Object.create(MockAudioNode.prototype);
MockAudioDestinationNode.prototype.maxChannelCount = 2;

var MockAudioBufferSourceNode = function(ctx) {
  MockAudioNode.call(this, ctx);

  this.numberOfInputs = 0;
  this.numberOfOutputs = 1;

  // Unimplemented
  // this.playbackRate = new MockAudioParam();
};
MockAudioBufferSourceNode.prototype = Object.create(MockAudioNode.prototype);
MockAudioBufferSourceNode.prototype.playbackRate = null;
MockAudioBufferSourceNode.prototype.buffer = null;
MockAudioBufferSourceNode.prototype.loop = false;
MockAudioBufferSourceNode.prototype.loopEnd = 0;
MockAudioBufferSourceNode.prototype.loopStart = 0;
MockAudioBufferSourceNode.prototype.onended = null;
MockAudioBufferSourceNode.prototype.start =
MockAudioBufferSourceNode.prototype.stop = function() {
  throw 'MockAudioBufferSourceNode: Unimplemented. Stub me?';
};

var MockAudioListener = function() {
};
MockAudioListener.prototype.dopplerFactor = 1;
MockAudioListener.prototype.speedOfSound = 343.3;
MockAudioListener.prototype.setPosition =
MockAudioListener.prototype.setOrientation =
MockAudioListener.prototype.setVelocity = function() {
  throw 'MockAudioListener: Unimplemented. Stub me?';
};

var MockAudioContext = function(type) {
  this.destination = new MockAudioDestinationNode(this);
  this.listener = new MockAudioListener();
  if (type) {
    this.mozAudioChannelType = type;
  }
};

MockAudioContext.prototype = Object.create(MockEventTarget.prototype);
MockAudioContext.prototype.destination = null;
MockAudioContext.prototype.sampleRate = 48000;
MockAudioContext.prototype.currentTime = 0;
MockAudioContext.prototype.listener = null;
MockAudioContext.prototype.mozAudioChannelType = 'normal';

MockAudioContext.prototype.onmozinterruptbegin = null;
MockAudioContext.prototype.onmozinterruptend = null;

MockAudioContext.prototype.decodeAudioData =
MockAudioContext.prototype.createBufferSource =
MockAudioContext.prototype.createMediaStreamDestination =
MockAudioContext.prototype.createScriptProcessor =
MockAudioContext.prototype.createAnalyser =
MockAudioContext.prototype.createMediaElementSource =
MockAudioContext.prototype.createMediaStreamSource =
MockAudioContext.prototype.createGain =
MockAudioContext.prototype.createDelay =
MockAudioContext.prototype.createBiquadFilter =
MockAudioContext.prototype.createWaveShaper =
MockAudioContext.prototype.createPanner =
MockAudioContext.prototype.createConvolver =
MockAudioContext.prototype.createChannelSplitter =
MockAudioContext.prototype.createChannelMerger =
MockAudioContext.prototype.createDynamicsCompressor =
MockAudioContext.prototype.createOscillator =
MockAudioContext.prototype.createPeriodicWave = function() {
  throw 'MockAudioContext: Unimplemented. Stub me?';
};

var MockOfflineAudioContext = function(numOfChannels, length, sampleRate) {
  MockAudioContext.call(this);
};
MockOfflineAudioContext.prototype = Object.create(MockAudioContext.prototype);
MockOfflineAudioContext.prototype.oncomplete = null;
MockOfflineAudioContext.prototype.startRendering = function() {
  throw 'MockOfflineAudioContext: Unimplemented. Stub me?';
};
