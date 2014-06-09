'use strict';

function MockPromise(then) {
  MockPromise.then = then;

  return {
    then: function(resolve, reject) {
      MockPromise.resolve = resolve;
      MockPromise.reject = reject;
    }
  };
}

// create an array to hold any calls to this function to test them
MockPromise.mSetup = function() {
};

// destroy the array so it resets every time
MockPromise.mTeardown = function() {
  delete MockPromise.then;
  delete MockPromise.resolve;
  delete MockPromise.reject;
};
