'use strict';

function MockAudio() {
  MockAudio.isPlayed = false;
}

MockAudio.prototype.play = function() {
  MockAudio.isPlayed = true;
};

MockAudio.prototype.pause = function() {};

MockAudio.mTeardown = function() {
  MockAudio.isPlayed = false;
};
