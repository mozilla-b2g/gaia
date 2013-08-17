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
  }
};

var IMEngine = function engine_constructor() {
  IMEngineBase.call(this);

  this._keypressQueue = [];
};

/**
 * Candidate data
 * @constructor
 * @param {number} id Candidate id.
 * @param {[string, string]} strs The simplified and traditional strings.
 */
IMEngine.CandidateData = function candidateData_constructor(id, strs) {
  this.id = id;
  this.str = strs[0];
  this.str_tr = strs[1];
};

IMEngine.CandidateData.prototype = {
  /**
   * id
   * @type number
   */
  id: 0,

  /**
   * Simplified Chinese string.
   * @type string
   */
  str: '',

  /**
   * Traditional Chinese string.
   * @type string
   */
  str_tr: '',

  serialize: function candidateData_serialize() {
    return JSON.stringify(this);
  },

  deserialize: function candidateData_deserialize(str) {
    var o = JSON.parse(str);
    for (var i in o) {
      this[i] = o[i];
    }
  }
};

IMEngine.prototype = {
  // Implements IMEngineBase
  __proto__: new IMEngineBase(),

  // Buffer limit will force output the longest matching terms
  // if the length of the syllables buffer is reached.
  _kBufferLenLimit: 30,

  // Whether to input traditional Chinese
  _inputTraditionalChinese: false,

  /**
   * The last selected text used to generate prediction.
   * Note: we always use simplified Chinese string to make prediction even if
   *    we are inputing traditional Chinese.
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
      var strs = candidates[id];
      var cand = this._inputTraditionalChinese ? strs[1] : strs[0];
      if (id == 0) {
        this._firstCandidate = cand;
      }
      var data = new IMEngine.CandidateData(id, strs);
      list.push([cand, data.serialize()]);
    }
    this._glue.sendCandidates(list);
  },

  _start: function engine_start() {
    if (this._isWorking)
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
      this._updateCandidateList(this._next.bind(this));
      this._sendPendingSymbols();
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
          this._historyText = '';

          this._updateCandidateList(this._next.bind(this));
        }
        // pass the key to IMEManager for default action
        debug('Default action.');
        this._glue.sendKey(code);
        this._next();
        return;
      }

      this._pendingSymbols = this._pendingSymbols.substring(0,
        this._pendingSymbols.length - 1);

      this._updateCandidateList(this._next.bind(this));
      this._sendPendingSymbols();
      return;
    }

    // Select the first candidate if needed.
    if (code === KeyEvent.DOM_VK_RETURN ||
        !this._isSymbol(code) ||
        this._pendingSymbols.length >= this._kBufferLenLimit) {
      debug('Nono-bopomofo key is pressed or the input is too long.');
      var sendKey = true;
      if (this._firstCandidate) {
        if (this._pendingSymbols) {
          // candidate list exists; output the first candidate
          debug('Sending first candidate.');
          this._glue.sendString(this._firstCandidate);
          this.empty();
          // no return here
          if (code === KeyEvent.DOM_VK_RETURN) {
            sendKey = false;
          }
        }
        this._sendCandidates([]);
      }

      //pass the key to IMEManager for default action
      debug('Default action.');
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

    this._updateCandidateList(this._next.bind(this));
    this._sendPendingSymbols();
  },

  _isSymbol: function engine_isSymbol(code) {

    // '
    if (code == 39) {
      return true;
    }

    // a-z
    if (code >= 97 && code <= 122) {
      return true;
    }

    return false;
  },

  _appendNewSymbol: function engine_appendNewSymbol(code) {
    var symbol = String.fromCharCode(code);
    this._pendingSymbols += symbol;
  },

  _updateCandidateList: function engine_updateCandidateList(callback) {
    debug('Update Candidate List.');
    if (!this._pendingSymbols) {
      // If there is no pending symbols, make prediction with the previous
      // select words.
      var candidates = [];
      if (this._historyText) {
        debug('Buffer is empty; make suggestions based on select term.');

        var historyText = this._historyText;
        var num = this.emEngine.getPredicts(historyText, historyText.length);

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

      // TODO: We need modifying the render engine to support paging mechanism.
      if (num > 4) num = 4;

      for (var id = 0; id < num; id++) {
        var strs = this.emEngine.getCandidate(id);

        // TODO: We will drop the support of Traditional Chinese.
        candidates.push([strs, '']);
      }
      this._sendCandidates(candidates);
      callback();
    }
  },

  _alterKeyboard: function engine_changeKeyboard(keyboard) {
    this._keyboard = keyboard;
    this.empty();
    this._glue.alterKeyboard(keyboard);
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

      if (! Module['_main']) {
        Module['_main'] = function() {
          var openDecoder =
            Module.cwrap('im_open_decoder', 'number', ['string', 'string']);

          if (! openDecoder('data/dict.data', 'user.dict')) {
            debug('Failed to open emEngine.');
          }

          if (! self.emEngine) {
            self.emEngine = {
              closeDecoder:
                Module.cwrap('im_close_decoder', '', []),
              search:
                Module.cwrap('im_search', 'number', ['string', 'number']),
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
        };
      }

      var script2 = document.createElement('script');
      script2.id = 'libpinyin_js';
      script2.src = path + '/libpinyin.js';
      document.body.appendChild(script2);
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
      case -10:
        // Switch to traditional Chinese input mode.
        this._inputTraditionalChinese = true;
        this._alterKeyboard('zh-Hans-Pinyin-tr');
        break;
      case -11:
        // Switch to simplified Chinese input mode.
        this._inputTraditionalChinese = false;
        this._alterKeyboard('zh-Hans-Pinyin');
        break;
      case -12:
        // Switch to number keyboard.
        this._alterKeyboard('zh-Hans-Pinyin-number');
        break;
      case -13:
        // Switch to symbol0 keyboard.
        this._alterKeyboard('zh-Hans-Pinyin-symbol0');
        break;
      case -14:
        // Switch to symbol1 keyboard.
        this._alterKeyboard('zh-Hans-Pinyin-symbol1');
        break;
      case -15:
        // Switch to symbol2 keyboard.
        this._alterKeyboard('zh-Hans-Pinyin-symbol2');
        break;
      case -20:
        // Switch back to the basic keyboard.
        var keyboard = this._inputTraditionalChinese ?
          'zh-Hans-Pinyin-tr' : 'zh-Hans-Pinyin';
        this._alterKeyboard(keyboard);
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
    var candDataObject = new IMEngine.CandidateData(0, ['', '']);
    candDataObject.deserialize(data);
    if (this._pendingSymbols) {
      var candId = candDataObject.id;
      var candsNum = this.emEngine.choose(candId);
      var splStartLen = this.emEngine.getSplStart() + 1;
      var fixed = this.emEngine.getFixedLen();
      // Output the result if all valid pinyin string has been converted.
      if (candsNum == 1 && fixed == splStartLen) {
        var strs = this.emEngine.getCandidate(0);
        var convertedText = this._inputTraditionalChinese ? strs[1] : strs[0];
        this._glue.sendString(convertedText);
        this._pendingSymbols = '';
        this._historyText = strs[0];
      }
    } else {
      // A predication candidate is selected.
      this._historyText = candDataObject.str;
      this._glue.sendString(text);
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
    this._sendPendingSymbols();
    this._isWorking = false;
  },

  /**
   * Override
   */
  activate: function engine_activate(language, state, options) {
    var inputType = state.type;
    IMEngineBase.prototype.activate.call(this, language, state, options);
    debug('Activate. Input type: ' + inputType);
    this.emEngine.flushCache();
    var keyboard = this._inputTraditionalChinese ?
      'zh-Hans-Pinyin-tr' : 'zh-Hans-Pinyin';
    if (inputType == '' || inputType == 'text' || inputType == 'textarea') {
      keyboard = this._keyboard;
    }

    this._glue.alterKeyboard(keyboard);
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
