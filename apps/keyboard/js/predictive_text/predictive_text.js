/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var SuggestionEngine = {};

(function() {

  var debugging = false;
  var TAG = '[PredictiveText] ';

  var debug = function(str) {
    if (!debugging)
      return;

    if (window.dump)
      window.dump(TAG + str + '\n');
    if (console && console.log) {
      console.log(TAG + str);
      if (arguments.length > 1)
        console.log.apply(this, arguments);
    }
  };

  var SimpleProfiler = function(tag) {
    this.startTime = new Date().getTime();
    this.tag = tag || 'Simple Profiling';
  };

  SimpleProfiler.prototype = {
    endProfiling: function() {
      var endTime = new Date().getTime();
      debug('elapse time for ' + this.tag + ' : ' +
             (endTime - this.startTime) + ' ms');
    }
  };

  /* for non-Mozilla browsers */
  if (!KeyEvent) {
    var KeyEvent = {
      DOM_VK_BACK_SPACE: 0x8,
      DOM_VK_RETURN: 0xd,
      DOM_VK_SPACE: 0x20
    };
  }

  var settings;

  var SpellChecker = function spellchecker() {

    var currentWord = null;
    var ptWorker;
    var _layoutParams = null;

    this.init = function spellchecker_init(options) {

      settings = options;

      /* load dictionaries */
      var lang = settings.lang;

      ptWorker = new Worker(settings.path + 'pt_worker.js');
      ptWorker.onmessage = function(evt) {
        if (typeof evt.data == 'string') {
          // for debug message
          debug(evt.data);
        } else {

          var suggestionResult = evt.data.wordList;

          var sendCandidates = function send_can(wordList) {

            if (!wordList || wordList.length == 0) {
              settings.sendCandidates([]);
              return;
            }

            var list = [];
            for (var i in wordList) {
              list.push([wordList[i]]);
            }

            settings.sendCandidates(list);
          };

          if (evt.data.word._typedWord == currentWord._typedWord)
            sendCandidates(suggestionResult);
        }
      }

      ptWorker.onerror = function(event) {
        throw new Error(event.message + ' (' +
                        event.filename + ':' + event.lineno + ')');
      };


      ptWorker.postMessage({
        action: 'init'
      });

    };

    var empty = function spellchecker_empty() {
      debug('Empty');
      currentWord.reset();
    };

    this.empty = empty;

    var doSpellCheck = function() {

      if (currentWord.size() < 1) {
        settings.sendCandidates([]);
        return;
      }

      debug('post message to do suggest: ' + currentWord._typedWord);
      ptWorker.postMessage({
        currentWord: currentWord
      });
    };

    this.click = function spellchecker_click(keyCode, wordComposer) {

      switch (keyCode) {
        case KeyEvent.DOM_VK_RETURN:
        case KeyEvent.DOM_VK_SPACE:
          empty();
          settings.sendCandidates([]);
          break;
        case KeyEvent.DOM_VK_BACK_SPACE:
          currentWord.deleteLast();
          doSpellCheck();
          break;
        default:
          currentWord = wordComposer;
          if (currentWord.size() < 1) {
            debug('Invalid input for suggestion');
            return;
          }

          doSpellCheck();
          break;
      }
    };

    this.select = function(text, type) {
      var i = currentWord.size();
      while (i--) {
        settings.sendKey(KeyEvent.DOM_VK_BACK_SPACE);
      }

      settings.sendString(text + ' ');
      empty();
      settings.sendCandidates([]);
    };

    this.setLayoutParams = function(layoutParams) {
      _layoutParams = layoutParams;

      ptWorker.postMessage({
        action: 'setLayoutParams',
        layoutParams: _layoutParams
      });
    };

  };

  var predictiveTextWrapper = new SpellChecker();
  SuggestionEngine = predictiveTextWrapper;

  // Expose typo-js wrapper as an AMD module
  if (typeof define === 'function' && define.amd)
    define('PredictiveText', [], function() { return typoJSWrapper; });

  // Expose to IMEController if we are in Gaia homescreen
  if (typeof IMEManager !== 'undefined') {
    IMEController.SuggestionEngines['predictive_text'] = predictiveTextWrapper;
  }
})();
