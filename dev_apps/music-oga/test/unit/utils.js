/* exported pass, fail */
'use strict';

function pass(done) {
  return function() { done(); };
}

function fail(done, desc) {
  if (!desc) {
    desc = 'unknown error';
  }
  return function(err) { done(err || new Error(desc)); };
}

