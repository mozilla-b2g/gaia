'use strict';

/* global Predictions */
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

// Load the predictions.js module.  This defines the Predictions object.
importScripts('predictions.js');

// We invoke a "null" predictor when user dictionary is empty (incoming dict
// blob is "undefined"). This is to avoid modifying the complex predictions.js
// to adapt to "undefined" dict blob.

// The switching mechanism is implemented in ProxyUserDictPredictor depending on
// its setDictionary parameter when called. Note that PUDP.setNearByKeys is
// always called upon userDictPredictor for setting the predictor up.

// For pattern conformity in this file we don't use "new" to instantiate the
// null and proxy instances.

var NullPredictions = function(){
  return {
    predict: function(input, maxSuggestions, maxCandidates, maxCorrections,
               callback, onerror) {
      var status = {
        state: 'predicting',
        abort: function nullAbort() {
          if (this.state !== 'done' && this.state !== 'aborted') {
            this.state = 'aborting';
          }
        }
      };

      setTimeout(function nullFinish() {
        if (status.state === 'aborting') {
          status.state = 'aborted';
        }

        if (status.state === 'aborted') {
          return;
        }

        status.state = 'done';
        callback([]);
      });

      return status;
    }
  };
};

var ProxyUserDictPredictor = function(){
  var userDictPredictor = Predictions();
  var nullPredictor = NullPredictions();

  var activePredictor;

  return {
    setDictionary: function(buffer) {
      if (buffer === undefined) {
        activePredictor = nullPredictor;
      } else {
        activePredictor = userDictPredictor;
        userDictPredictor.setDictionary(buffer);
      }
    },
    setNearbyKeys: function(data) {
      userDictPredictor.setNearbyKeys(data);
    },
    // Directly pass arguments to wrapped predictor
    predict: function(/* args */) {
      return activePredictor.predict.apply(activePredictor, arguments);
    }
  };
};

var builtInPredictor = Predictions();
var userDictPredictor = ProxyUserDictPredictor();

// Track our current language so we don't load dictionaries more often
// than we have to.
var currentLanguage;

// The prediction that is currently running, if any. So that it can be cancelled
var pendingBuiltInPrediction;
var pendingUserDictPrediction;

var Commands = {
  setLanguage: function setLanguage(language, builtInDict, userDict) {
    var _setLanguage = function(predictor, dict, tag) {
      try {
        predictor.setDictionary(dict);
        postMessage({
          cmd: 'success',
          fn: 'setLanguage/' + tag,
          language: language
        });
      } catch (e) {
        postMessage({
          cmd: 'error',
          message: 'setDictionary/' + tag + ' failed: ' + e
        });
      }
    };

    // always set userDict regardless of language change or not
    _setLanguage(userDictPredictor, userDict, 'User');

    if (language === currentLanguage) {
      return;
    }
    currentLanguage = language;

    _setLanguage(builtInPredictor, builtInDict, 'BuiltIn');
  },

  setUserDictionary: function setUserDictionary(userDict) {
    try {
      userDictPredictor.setDictionary(userDict);
      postMessage({cmd: 'success', fn: 'setUserDictionary'});
    }
    catch (e) {
      postMessage({cmd: 'error', fn: 'setUserDictionary: ' + e.message});
    }
  },

  setNearbyKeys: function setNearbyKeys(nearbyKeys) {
    var _setNearbyKeys = function(predictor, tag) {
      try {
        predictor.setNearbyKeys(nearbyKeys);
        postMessage({ cmd: 'success', fn: 'setNearbyKeys/' + tag });
      }
      catch (e) {
        postMessage({
          cmd: 'error', message: 'setNearbyKeys/' + tag + ': ' + e.message});
      }
    };

    _setNearbyKeys(builtInPredictor, 'BuiltIn');
    _setNearbyKeys(userDictPredictor, 'User');
  },

  predict: function predict(prefix) {
    // Make sure we're not still running a previous one
    if (pendingBuiltInPrediction) {
      pendingBuiltInPrediction.abort();
    }
    if (pendingUserDictPrediction) {
      pendingUserDictPrediction.abort();
    }

    // We merge predictions from built-in dictionaries and user dictionarys by:
    // [1] For UserDict, ask for 4 predictions with 40 candidates, and
    //     considering only words with an edit distance of 1 (i.e. make only one
    //     correction per word)
    // [2] For Built-In dict, everything remains the same (50 candidates if
    //     prefix is short, 24 if not; do a second round:
    //     [a] if there were results but results were bad; if prefix is long,
    //         use 50 candidates.
    //     [b] if there weren't results, use 60 candidates and allow 2
    //         corrections.
    //     As before weget 4 predictions.
    // [3] Results from [1] and [2] are merged by:
    //     [a] Results from [1] are not discarded even if quality is low.
    //     [b] Results from [1] are annotated to come from user dict.
    //     [c] Results are merged and re-sorted. Duplicated words (case- and
    //         variants-sensitive) are eliminated by:
    //         - Keeping the higher priority.
    //         - Keeping the user dictionary flag.
    //         The rationale is: latin.js will always show at least one user
    //         dictionary word; since user specifically define some dict word,
    //         he probably wants it very much.
    // [4] latin.js will always retain at least one user dict prediction (unless
    //     it decides to drop the prediction because it equals user input)

    var BUILT_IN_CANDIDATES_LOW = 24;
    var BUILT_IN_CANDIDATES_HIGH = 50;
    var BUILT_IN_CANDIDATES_EXTRA = 60;
    var USER_DICT_CANDIDATES = 40;
    var BUILT_IN_TOO_LOW_THRESHOLD = 4;

    var builtInPromise = new Promise(function(resolve, reject){
      var success = function(suggestions) {
        if (suggestions.length > 0) {
          // If the quality of the suggestions is very low, up candidates
          if (prefix.length > 4 &&
              suggestions[0][1] < BUILT_IN_TOO_LOW_THRESHOLD) {
            pendingBuiltInPrediction =
              builtInPredictor.predict(
                prefix, 4, BUILT_IN_CANDIDATES_HIGH, 1,
                function(suggestions){resolve(suggestions);},
                reject);
          }
          else {
            resolve(suggestions);
          }
        }
        else {
          pendingBuiltInPrediction =
            builtInPredictor.predict(
              prefix, 4, BUILT_IN_CANDIDATES_EXTRA, 2,
              function(suggestions){resolve(suggestions);},
              reject);
        }
      };

      var noOfCandidates = prefix.length >= 2 && prefix.length <= 4 ?
        BUILT_IN_CANDIDATES_HIGH :
        BUILT_IN_CANDIDATES_LOW;

      pendingBuiltInPrediction =
        builtInPredictor.predict(prefix, 4, noOfCandidates, 1, success, reject);
    });

    var userDictPromise = new Promise(function(resolve, reject){
      var success = function(suggestions) {
        suggestions = suggestions.map(
          function(suggestion){
            return [
              suggestion[0],
              suggestion[1],
              true  // coming from user dictionary
            ];
          }
        );

        resolve(suggestions);
      };

      pendingUserDictPrediction =
        userDictPredictor.predict(prefix, 4, USER_DICT_CANDIDATES, 1,
          success, reject);
    });

    Promise.all([builtInPromise, userDictPromise])
    .then(function(suggestions2D){
      // we could do a correct merge sort algorithm here, but since the arrays
      // are so small (only 4*2 entries), let's just concat and apply sort()

      var suggestions =
        [].concat(suggestions2D[0]).concat(suggestions2D[1]).sort(
          function(suggestionA, suggestionB){
            return suggestionB[1] - suggestionA[1];
          }
        );

      // Shortcut on eliminate duplicated entries: "duplicated entries" means
      // they're coming from both dictionaries; and since our array is sorted,
      // we'll simply the (higher-priority one's) suggestion[2] as true (= from
      // user dict) and delete the lower-priority one.

      // map from "word" to the index in suggestions
      var seenWord = {};

      suggestions = suggestions.reduce(function(prev, curr, index){
        var word = curr[0];

        // we've seen this word. mark the higher-priority one as from user-dict
        // and don't push this one to the resulting array.
        if (seenWord.hasOwnProperty(word)) {
          prev[seenWord[word]][2] = true;
        } else {
          seenWord[word] = index;
          prev.push(curr);
        }

        return prev;
      }, []);

      postMessage({
        cmd: 'predictions', input: prefix, suggestions: suggestions
      });
    }).catch(function(e){
      log('Error in prediction: ' + e);
    });
  }
};

// When we receive messages, translate them into function calls to one
// of the functions in the Commands object below.
self.onmessage = function(e) {
  Commands[e.data.cmd].apply(null, e.data.args);
};

// Send console messages back to the main thread with this method
function log(msg) {
  postMessage({cmd: 'log', message: msg});
}

