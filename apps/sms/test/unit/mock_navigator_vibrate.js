'use strict';

function MockVibrate() {
  MockVibrate.isVibrated = true;
}

MockVibrate.isVibrated = false;

MockVibrate.mTeardown = function() {
  MockVibrate.isVibrated = false;
};
