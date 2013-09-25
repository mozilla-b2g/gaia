/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

(function() {
var debugging = false;
var debug = function jspinyin_debug(str) {
  if (!debugging) {
    return;
  }

  var done = false;
  if (typeof window != 'undefined' && window.dump) {
    window.dump('jspinyin: ' + str + '\n');
    done = true;
  }
  if (typeof console != 'undefined' && console.log) {
    console.log('jspinyin: ' + str);
    if (arguments.length > 1) {
      console.log.apply(this, arguments);
    }
    done = true;
  }
  if (done) {
    return;
  }
  if (typeof Test != 'undefined') {
    print('jspinyin: ' + str + '\n');
  }
};

var assert = function jspinyin_assert(condition, msg) {
  if (!debugging)
    return;
  if (!condition) {
    var str = typeof msg === 'undefined' ? assert.caller.toString() : msg;
    if (typeof alert === 'function') {
      alert(msg);
    } else {
      throw str;
    }
  }
};

/* for non-Mozilla browsers */
if (!KeyEvent) {
  var KeyEvent = {
    DOM_VK_BACK_SPACE: 0x8,
    DOM_VK_RETURN: 0xd
  };
}

var IMEngineBase = function engineBase_constructor() {
  this._glue = {};
};

IMEngineBase.prototype = {
  /**
   * Glue ojbect between the IMEngieBase and the IMEManager.
   */
  _glue: {
    /**
     * The source code path of the IMEngine
     * @type String
     */
    path: '',

    /**
     * Sends candidates to the IMEManager
     */
    sendCandidates: function(candidates) {},

    /**
     * Sends pending symbols to the IMEManager.
     */
    sendPendingSymbols: function(symbols) {},

    /**
     * Passes the clicked key to IMEManager for default action.
     * @param {number} keyCode The key code of an integer.
     */
    sendKey: function(keyCode) {},

    /**
     * Sends the input string to the IMEManager.
     * @param {String} str The input string.
     */
    sendString: function(str) {},

    /**
     * Change the keyboad
     * @param {String} keyboard The name of the keyboard.
     */
    alterKeyboard: function(keyboard) {}
  },

  /**
   * Initialization.
   * @param {Glue} glue Glue object of the IMManager.
   */
  init: function engineBase_init(glue) {
    this._glue = glue;
  },

  /**
   * Destruction.
   */
  uninit: function engineBase_uninit() {
  },

  /**
   * Notifies when a keyboard key is clicked.
   * @param {number} keyCode The key code of an integer number.
   */
  click: function engineBase_click(keyCode) {
  },

  /**
   * Notifies when pending symbols need be cleared
   */
  empty: function engineBase_empty() {
  },

  /**
   * Notifies when a candidate is selected.
   * @param {String} text The text of the candidate.
   * @param {Object} data User data of the candidate.
   */
  select: function engineBase_select(text, data) {
  },

  /**
   * Notifies when the IM is shown
   */
  activate: function engineBase_activate(language, state, options) {
  },

  /**
   * Called when the keyboard is hidden
   */
  deactivate: function engineBase_deactivate() {
  }
};

var IMEngine = function engine_constructor() {
  IMEngineBase.call(this);

  this._keypressQueue = [];
  this._sendCandidatesTimer = null;
  this._emEngineSearchTimer = null;
};

IMEngine.prototype = {
  // Implements IMEngineBase
  __proto__: new IMEngineBase(),

  // Buffer limit will force output the longest matching terms
  // if the length of the syllables buffer is reached.
  _kBufferLenLimit: 30,

  // Remember the candidate length of last searching result because we don't
  // want to output all candidates at a time.
  // Set it to 0 when we don't need the candidates buffer anymore.
  _candidatesLength: 0,

  /**
   * The last selected text used to generate prediction.
   * @type string.
   */
  _historyText: '',

  _pendingSymbols: '',
  _firstCandidate: '',
  _keypressQueue: null,
  _isWorking: false,

  // Current keyboard
  _keyboard: 'zh-Hans-Pinyin',

  _sendPendingSymbols: function engine_sendPendingSymbols() {
    debug('SendPendingSymbol: ' + this._pendingSymbols);
    var display = '';
    if (this._pendingSymbols) {
      var fixedLen = this.emEngine.getFixedLen();
      display = this._firstCandidate.substring(0, fixedLen);

      var splStartLen = this.emEngine.getSplStart() + 1;
      var splStart = [];

      for (var i = 0; i < splStartLen; i++) {
        splStart.push(this.emEngine.getSplStartAt(i));
      }

      if (splStartLen > 1) {
        for (var i = fixedLen; i < splStartLen - 1; i++) {
          display += this._pendingSymbols.substring(splStart[i],
                                                    splStart[i + 1]) + ' ';
        }
        display += this._pendingSymbols.substring(splStart[splStartLen - 1]);
      } else {
        display += this._pendingSymbols;
      }
    }
    this._glue.sendPendingSymbols(display);
  },

  /**
   * Send candidates list.
   * @param {Array.<[string, string]>} candidates The candidates to be sent.
   * @return {void}  No return value.
   */
  _sendCandidates: function engine_sendCandidates(candidates) {
    var list = [];
    var len = candidates.length;
    for (var id = 0; id < len; id++) {
      var cand = candidates[id];
      if (id == 0) {
        this._firstCandidate = cand;
      }
      list.push([cand, id]);
    }

    if (this._sendCandidatesTimer) {
      clearTimeout(this._sendCandidatesTimer);
      this._sendCandidatesTimer = null;
    }

    this._sendCandidatesTimer = setTimeout(
      this._glue.sendCandidates.bind(this, list),
      0
    );
  },

  _start: function engine_start() {
    if (!this.emEngine || this._isWorking)
      return;
    this._isWorking = true;
    debug('Start keyQueue loop.');
    this._next();
  },

  _next: function engine_next() {
    debug('Processing keypress');

    if (!this._keypressQueue.length) {
      debug('keyQueue emptied.');
      this._isWorking = false;
      return;
    }

    var code = this._keypressQueue.shift();

    if (code == 0) {
      // This is a select function operation.
      this._updateCandidatesAndSymbols(this._next.bind(this));
      return;
    }

    debug('key code: ' + code);

    // Backspace - delete last input symbol if exists
    if (code === KeyEvent.DOM_VK_BACK_SPACE) {
      debug('Backspace key');

      if (!this._pendingSymbols) {
        if (this._firstCandidate) {
          debug('Remove candidates.');

          // prevent updateCandidateList from making the same suggestions
          this.empty();
        }

        // pass the key to IMEManager for default action
        debug('Default action.');
        this._glue.sendKey(code);
        this._next();
      } else {
        this._pendingSymbols = this._pendingSymbols.substring(0,
          this._pendingSymbols.length - 1);

        this._updateCandidatesAndSymbols(this._next.bind(this));
      }

      return;
    }

    // Select the first candidate if needed.
    if (code === KeyEvent.DOM_VK_RETURN ||
        !this._isPinyinKey(code) ||
        this._pendingSymbols.length >= this._kBufferLenLimit) {
      debug('Nono-bopomofo key is pressed or the input is too long.');
      var sendKey = true;
      if (this._firstCandidate) {
        if (this._pendingSymbols) {
          // candidate list exists; output the first candidate
          debug('Sending first candidate.');
          this._glue.sendString(this._firstCandidate);
          // no return here
          if (code === KeyEvent.DOM_VK_RETURN) {
            sendKey = false;
          }
        }
        this._sendCandidates([]);
      }

      //pass the key to IMEManager for default action
      debug('Default action.');
      this.empty();
      if (sendKey) {
        this._glue.sendKey(code);
      }
      this._next();
      return;
    }

    var symbol = String.fromCharCode(code);

    debug('Processing symbol: ' + symbol);

    // add symbol to pendingSymbols
    this._appendNewSymbol(code);
    this._updateCandidatesAndSymbols(this._next.bind(this));
  },

  _isPinyinKey: function engine_isPinyinKey(code) {
    if (this._keyboard == 'zh-Hans-Pinyin') {
      // '
      if (code == 39) {
        return true;
      }

      // a-z
      if (code >= 97 && code <= 122) {
        return true;
      }
    }

    return false;
  },

  _appendNewSymbol: function engine_appendNewSymbol(code) {
    var symbol = String.fromCharCode(code);
    this._pendingSymbols += symbol;
  },

  _updateCandidatesAndSymbols: function engine_updateCandsAndSymbols(callback) {
    var self = this;

    if (this._emEngineSearchTimer) {
      clearTimeout(this._emEngineSearchTimer);
      this._emEngineSearchTimer = null;
    }

    this._emEngineSearchTimer = setTimeout(function() {
      self._updateCandidateList(callback);
      self._sendPendingSymbols();
    }, 0);
  },

  _updateCandidateList: function engine_updateCandidateList(callback) {
    debug('Update Candidate List.');

    var numberOfCandidatesPerRow = this._glue.getNumberOfCandidatesPerRow ?
      this._glue.getNumberOfCandidatesPerRow() : Number.Infinity;

    this._candidatesLength = 0;

    if (!this._pendingSymbols) {
      // If there is no pending symbols, make prediction with the previous
      // select words.
      var candidates = [];
      if (this._historyText) {
        debug('Buffer is empty; make suggestions based on select term.');

        var historyText = this._historyText;
        var num = this.emEngine.getPredicts(historyText, historyText.length);

        if (num > numberOfCandidatesPerRow + 1) {
          this._candidatesLength = num;
          num = numberOfCandidatesPerRow + 1;
        }

        for (var id = 0; id < num; id++) {
          candidates.push(this.emEngine.getPredictAt(id));
        }
      }
      this._sendCandidates(candidates);
      callback();
    } else {
      // Update the candidates list by the pending pinyin string.
      this._historyText = '';

      var pendingSymbols = this._pendingSymbols;
      var num = this.emEngine.search(pendingSymbols, pendingSymbols.length);
      var candidates = [];

      if (num > numberOfCandidatesPerRow + 1) {
        this._candidatesLength = num;
        num = numberOfCandidatesPerRow + 1;
      }

      for (var id = 0; id < num; id++) {
        candidates.push(this.emEngine.getCandidate(id));
      }
      this._sendCandidates(candidates);
      callback();
    }
  },

  _alterKeyboard: function engine_changeKeyboard(keyboard) {
    this._resetKeypressQueue();
    this.empty();

    this._keyboard = keyboard;
    this._glue.alterKeyboard(keyboard);
  },

  _resetKeypressQueue: function engine_abortKeypressQueue() {
    this._keypressQueue = [];
    this._isWorking = false;
  },

  /**
   * Override
   */
  init: function engine_init(glue) {
    IMEngineBase.prototype.init.call(this, glue);
    debug('init.');

    var self = this;
    var path = self._glue.path;

    if (typeof Module !== 'undefined') {
      debug('emEngine is already loaded!');
      return;
    }

    var script1 = document.createElement('script');
    script1.id = 'empinyin_files_js';
    script1.src = path + '/empinyin_files.js';
    script1.addEventListener('load', function() {
      if (typeof Module == 'undefined') Module = {};

      if (typeof Module['setStatus'] == 'undefined') {
        Module['setStatus'] = function(status) {
          debug(status);
        };
      }

      if (typeof Module['canvas'] == 'undefined') {
        Module['canvas'] = document.createElement('canvas');
      }

      Module['stdout'] = null;
      Module['empinyin_files_path'] = path;

      if (!Module['_main']) {
        Module['_main'] = function() {
          var openDecoder =
            Module.cwrap('im_open_decoder', 'number', ['string', 'string']);

          if (!openDecoder('data/dict.data', 'data/user_dict.data')) {
            debug('Failed to open emEngine.');
          }

          if (!self.emEngine) {
            self.emEngine = {
              closeDecoder:
                Module.cwrap('im_close_decoder', '', []),
              search:
                Module.cwrap('im_search', 'number', ['string', 'number']),
              resetSearch:
                Module.cwrap('im_reset_search', '', []),
              getCandidate:
                Module.cwrap('im_get_candidate_char', 'string', ['number']),
              getPredicts:
                Module.cwrap('im_get_predicts_utf8', 'number', [
                  'string', 'number'
                ]),
              getPredictAt:
                Module.cwrap('im_get_predict_at', 'string', ['number']),

              choose:
                Module.cwrap('im_choose', 'number', ['number']),
              getSplStart:
                Module.cwrap('im_get_spl_start', 'number', []),
              getSplStartAt:
                Module.cwrap('im_get_spl_start_at', 'number', ['number']),
              getFixedLen:
                Module.cwrap('im_get_fixed_len', 'number', []),
              flushCache:
                Module.cwrap('im_flush_cache', '', [])
            };

            debug('Succeeded in opening emEngine.');
          }

          self._start();
        };
      }

      function appendScript(id, src) {
        var script = document.createElement('script');
        script.id = id;
        script.src = src;
        document.body.appendChild(script);
      }

      // JS to support user dictionary.
      appendScript('user_dict_js', path + '/user_dict.js');
      appendScript('libpinyin_js', path + '/libpinyin.js');
    });
    document.body.appendChild(script1);
  },

  /**
   * Override
   */
  uninit: function engine_uninit() {
    IMEngineBase.prototype.uninit.call(this);
    debug('Uninit.');

    this.emEngine.closeDecoder();
    this.emEngine = undefined;
    Module = undefined;

    document.body.removeChild(document.getElementById('empinyin_files_js'));
    document.body.removeChild(document.getElementById('libpinyin_js'));
    document.body.removeChild(document.getElementById('user_dict_js'));

    this._resetKeypressQueue();
    this.empty();
  },

  /**
   *Override
   */
  click: function engine_click(keyCode) {
    if (this._layoutPage !== LAYOUT_PAGE_DEFAULT) {
      this._glue.sendKey(keyCode);
      return;
    }

    IMEngineBase.prototype.click.call(this, keyCode);

    switch (keyCode) {
      case -11: // Switch to Pinyin Panel
        this._alterKeyboard('zh-Hans-Pinyin');
        break;
      case -20: // Switch to Chinese Symbol Panel, Same page
      case -21: // Switch to Chinese Symbol Panel, Page 1
      case -22: // Switch to Chinese Symbol Panel, Page 2
      case -30: // Switch to English Symbol Panel, Same page
      case -31: // Switch to English Symbol Panel, Page 1
      case -32: // Switch to English Symbol Panel, Page 2
        var index = Math.abs(keyCode);
        var symbolType = index < 30 ? 'Ch' : 'En';
        var symbolPage = index % 10;
        if (!symbolPage)
          symbolPage = this._keyboard.substr(-1);
        this._alterKeyboard(
          'zh-Hans-Pinyin-Symbol-' + symbolType + '-' + symbolPage);
        break;
      default:
        this._keypressQueue.push(keyCode);
        break;
    }
    this._start();
  },

  _layoutPage: LAYOUT_PAGE_DEFAULT,

  setLayoutPage: function engine_setLayoutPage(page) {
    this._layoutPage = page;
  },

  /**
   * Override
   */
  select: function engine_select(text, data) {
    IMEngineBase.prototype.select.call(this, text, data);
    if (!this.emEngine)
      return;
    if (this._pendingSymbols) {
      var candId = parseInt(data);
      var candsNum = this.emEngine.choose(candId);
      var splStartLen = this.emEngine.getSplStart() + 1;
      var fixed = this.emEngine.getFixedLen();

      // Output the result if all valid pinyin string has been converted.
      if (candsNum == 1 && fixed == splStartLen - 1) {
        var convertedText = this.emEngine.getCandidate(0);
        this.emEngine.resetSearch();

        this._glue.sendString(convertedText);
        this._pendingSymbols = '';
        this._candidatesLength = 0;
        this._historyText = convertedText;
      }
    } else {
      // A predication candidate is selected.
      this._glue.sendString(text);
      this._historyText = text;
    }

    this._keypressQueue.push(0);
    this._start();
  },

  /**
   * Override
   */
  empty: function engine_empty() {
    IMEngineBase.prototype.empty.call(this);
    debug('empty.');
    this._pendingSymbols = '';
    this._historyText = '';
    this._firstCandidate = '';
    this._sendPendingSymbols();
    this._sendCandidates([]);
  },

  /**
   * Override
   */
  activate: function engine_activate(language, state, options) {
    var inputType = state.type;
    IMEngineBase.prototype.activate.call(this, language, state, options);
    debug('Activate. Input type: ' + inputType);
    if (this.emEngine)
      this.emEngine.flushCache();
    var keyboard = 'zh-Hans-Pinyin';
    if (inputType == '' || inputType == 'text' || inputType == 'textarea') {
      keyboard = this._keyboard;
    }

    this._glue.alterKeyboard(keyboard);
  },

  /**
   * Override
   */
  deactivate: function engine_deactivate() {
    IMEngineBase.prototype.deactivate.call(this);
    debug('Deactivate.');

    if (this.emEngine && Module['saveUserDictFileToDB']) {
      this.emEngine.flushCache();

      var request = Module['saveUserDictFileToDB']('data/user_dict.data');

      if (!request) {
        return;
      }

      request.onsuccess = function() {
        debug('Saved user dictionary to DB.');
      };

      request.onerror = function() {
        debug('Failed to save user dictionary to DB.');
      };
    }
  },

  getMoreCandidates: function engine_getMore(indicator, maxCount, callback) {
    if (this._candidatesLength == 0) {
      callback(null);
      return;
    }

    var num = this._candidatesLength;
    maxCount = Math.min((maxCount || num) + indicator, num);

    var list = [];
    var getCandAt = this._pendingSymbols ?
      this.emEngine.getCandidate : this.emEngine.getPredictAt;

    for (var id = indicator; id < maxCount; id++) {
      var cand = getCandAt(id);
      list.push([cand, id]);
    }

    callback(list);
  }
};

var jspinyin = new IMEngine();

// Expose jspinyin as an AMD module
if (typeof define === 'function' && define.amd)
  define('jspinyin', [], function() { return jspinyin; });

// Expose the engine to the Gaia keyboard
if (typeof InputMethods !== 'undefined') {
  InputMethods.jspinyin = jspinyin;
}
})();
