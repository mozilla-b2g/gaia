//
// The Latin input method provides word suggestions/auto completions
// using the algorithm in predictions.js. For efficiency, however, this code
// runs in a different thread. This is the web worker wrapper around
// predictions.js. This file defines the code that interfaces predictions.js
// with latin.js.
//
// This worker uses the convention that all messages send or received have
// "cmd" and "args" fields. cmd is the message name or command. args is
// an array of arguments required by the command, in a form suitable for
// passing to Function.apply().
//
// This worker responds to the following messages:
//
//  setLanguage: the input method uses this message to tell the worker
//    to load a dictionary for the prediction engine. If no such dictionary
//    is found or if the dictionary is invalid, the worker responds with
//    an "error" message.
//
//  setNearbyKeys: the input method uses this message to pass information about
//    what keys are near each other in the current keyboard layout
//
//  predict: the input method uses this message to ask the prediction
//    engine to suggestion completions for (or corrections to) the specified
//    string. The worker responds with a "predictions" message whose argument
//    is an array of up to 3 predicted words. If the the specified string
//    is a word in the dictionary, the worker may send a "word" message
//    first to quickly tell the keyboard that the word is valid.
//

'use strict';

// Load the predictions.js module.  This defines the Predictions object.
importScripts('predictions.js');

// When we receive messages, translate them into function calls to one
// of the functions in the Commands object below.
self.onmessage = function(e) {
  Commands[e.data.cmd].apply(null, e.data.args);
};

// Send console messages back to the main thread with this method
function log(msg) {
  postMessage({cmd: 'log', message: msg});
}

// Track our current language so we don't load dictionaries more often
// than we have to.
var currentLanguage;

// The prediction that is currently running, if any. So that it can be cancelled
var pendingPrediction;

var Commands = {
  setLanguage: function setLanguage(language, data) {
    if (language === currentLanguage) {
      return;
    }
    currentLanguage = language;

    try {
      Predictions.setDictionary(data);
      postMessage({
        cmd: 'success',
        fn: 'setLanguage',
        language: language
      });
    } catch (e) {
      postMessage({
        cmd: 'error',
        message: 'setDictionary failed: ' + e
      });
    }
  },

  setNearbyKeys: function setNearbyKeys(nearbyKeys) {
    try {
      Predictions.setNearbyKeys(nearbyKeys);
      postMessage({ cmd: 'success', fn: 'setNearbyKeys' });
    }
    catch (e) {
      postMessage({cmd: 'error', message: 'setNearbyKeys: ' + e.message});
    }
  },

  predict: function predict(prefix) {
    var CANDIDATES_LOW = 24;
    var CANDIDATES_HIGH = 50;
    var TOO_LOW_THRESHOLD = 4;

    if (pendingPrediction)  // Make sure we're not still running a previous one
      pendingPrediction.abort();

    var noOfCandidates = prefix.length >= 2 && prefix.length <= 4 ?
      CANDIDATES_HIGH :
      CANDIDATES_LOW;

    // Ask for 4 predictions, considering 50 candidates and considering
    // only words with an edit distance of 1 (i.e. make only one correction
    // per word)
    pendingPrediction = Predictions.predict(prefix, 4, noOfCandidates, 1,
                                            success, error);

    function success(words) {
      if (words.length > 0) {
        // If the quality of the suggestions is very low, up candidates
        if (prefix.length > 4 && words[0][1] < TOO_LOW_THRESHOLD) {
          Predictions.predict(prefix, 4, CANDIDATES_HIGH, 1,
                    function(words) {
                      postMessage({ cmd: 'predictions',
                                    input: prefix,
                                    suggestions: words });
                    }, error);
        }
        else {
          postMessage({
            cmd: 'predictions', input: prefix, suggestions: words
          });
        }
      }
      else {
        // If we didn't find anything, try more candidates and a larger
        // edit distance to enlarge the search space.
        pendingPrediction =
          Predictions.predict(prefix, 4, 60, 2,
                              function(words) {
                                postMessage({ cmd: 'predictions',
                                              input: prefix,
                                              suggestions: words });
                              }, error);
      }
    }

    function error(msg) {
      log('Error in Predictions.predict(): ' + msg);
    }
  }
};
