'use strict';

function MockAudio() {
  MockAudio.instances.push(this);
}

MockAudio.instances = [];

MockAudio.mSetup = function() {
  MockAudio.instances = [];
};

MockAudio.mTeardown = function() {
  MockAudio.instances = [];
};

MockAudio.prototype.play = function() {};
MockAudio.prototype.pause = function() {};
