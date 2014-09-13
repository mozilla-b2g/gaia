// This worker does the following task:
// 1. use the UserPrediction object to create or predict from a TST
// 2. setNearbyKeys to aid in the prediction algorithm
//
// latin.js passes the current object store to this script
// alongwith a hasVersionChanged flag
// if the flag is true, we need to create a new TST
// if it is false, we just need to predict based on the input
//
// We use the same "cmd" and "args" approach for this worker, too
// Using the cmd and args with Function.apply()
//
// The methods for this worker are:
// setDictionary: pass the correct objectStore to the prediction module
// setNearbyKeys: fork of the original setNearbyKeys method in 
//   prediction.js module 
//   It will be modified as the original method only sets a global 
//   variable with the nearby map and nothing else
// predict: this calls the UserPrediction.predict method with proper
//   arguments to yield at suggestions as per the criteria 
//   defined in userPredictions.js module
//

"use strict";

// This will give us the UserPrediction object to work with
importScripts('userPredictions.js');

// When we receive messages, translate them into function calls to one
// of the functions in the Commands object below.
self.onmessage = function(e) {
  Commands[e.data.cmd].apply(null, e.data.args);
};

var suggestions;

// Send console messages back to the main thread with this method
function log(msg) {
  postMessage({cmd: 'log', message: msg});
}

var Commands = {
  setDictionary: function setDictionary(objStore) {
    UserPrediction.setDictionary(objStore);
  },

  setNearbyKeys: function setNearbyKeys(nearbyKeys) {
    try {
      UserPrediction.setNearbyKeys(nearbyKeys);
    }
    catch (e) {
      postMessage({cmd: 'error', message: 'setNearbyKeys: ' + e.message});
    }
  },

  predict: function predict(prefix) {
    suggestions = UserPrediction.predict(prefix);
    postMessage({cmd: 'predictions', input: prefix, suggestions: suggestions});
  }
};
