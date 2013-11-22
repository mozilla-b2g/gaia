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
  setLanguage: function setLanguage(language) {
    if (language !== currentLanguage) {
      currentLanguage = language;

      try {
        var dicturl = 'dictionaries/' + language + '.dict';
        var xhr = new XMLHttpRequest();
        xhr.open('GET', dicturl, false);
        xhr.responseType = 'arraybuffer';
        xhr.send();
        //
        // XXX
        // https://bugzilla.mozilla.org/show_bug.cgi?id=804395
        // The app protocol doesn't seem to return a status code and
        // we just get a zero-length array if the url is undefined
        //
        if (xhr.response && xhr.response.byteLength) {
          Predictions.setDictionary(xhr.response);
        }
        else {
          postMessage({
            cmd: 'error',
            message: 'setLanguage: Unknown language: ' + language
          });
        }
      }
      catch (e) {
        postMessage({
          cmd: 'error',
          message: 'setLanguage: Unknown language: ' + language + ': ' + e
        });
      }
    }
  },

  setNearbyKeys: function setNearbyKeys(nearbyKeys) {
    try {
      Predictions.setNearbyKeys(nearbyKeys);
    }
    catch (e) {
      postMessage({cmd: 'error', message: 'setNearbyKeys: ' + e.message});
    }
  },

  predict: function predict(prefix) {
    if (pendingPrediction)  // Make sure we're not still running a previous one
      pendingPrediction.abort();

    // Ask for 4 predictions, considering 24 candidates and considering
    // only words with an edit distance of 1 (i.e. make only one correction
    // per word)
    pendingPrediction = Predictions.predict(prefix, 4, 24, 1,
                                            success, error);

    function success(words) {
      if (words.length) {
        postMessage({ cmd: 'predictions', input: prefix, suggestions: words });
        return;
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
  },

  predictNextChar: function predictNextChar(prefix) {
    var chars = Predictions.predictNextChar(prefix);
    postMessage({ cmd: 'chars', input: prefix, chars: chars });
  }

};
