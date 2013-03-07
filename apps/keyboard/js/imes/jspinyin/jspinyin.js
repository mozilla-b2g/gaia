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

var StringUtils = {
  charDiff: function stringUtils_charDiff(ch1, ch2) {
    return ch1.charCodeAt(0) - ch2.charCodeAt(0);
  },

  /**
   * Format a string. Use {0}, {1} and {nth} to represent the 1st, 2nd
   * and (n+1)th arguments respectively.
   * For example:
   * var str= StringUtils.format('{0} has {1} bags', 'Ben', 4);
   * The result is 'Ben has 4 bags'.
   */
  format: function stringUtils_format(src) {
    if (arguments.length === 0) return null;
    var args = Array.prototype.slice.call(arguments, 1);
    return src.replace(/\{(\d+)\}/g, function(m, i) {
      var arg = args[i];
      if (typeof arg == 'object') {
        arg = JSON.stringify(arg);
      }
      return arg;
    });
  },

  /**
   * Convert a 16-bit integer number to 2 characters. The low 8-bit and high
   * 8-bit are converted to 1st and 2nd characters respectively.
   * @param {number} number The number to be converted. The bits higher than
   *    16 will be truncated.
   * @return {string}  A 2-character string representing the given number.
   */
  int16ToChars: function stringUtils_int16ToChars(number) {
    var low = StringUtils.int8ToChar(number & 0xff);
    var high = StringUtils.int8ToChar((number >> 8) & 0xff);
    return low + high;
  },

  /**
   * Convert a 2 characters string into integer number. The 1st and 2nd
   * characters represent the low 8-bit and high 8-bit of the integer number
   * respectively.
   * @param {string} chars The strings to be converted. Only the first two
   *    characters will be used.
   * @return {number}  The converted number.
   */
  charsToInt16: function stringUtils_charsToInt16(chars) {
    return StringUtils.charToInt8(chars.charAt(0)) +
        (StringUtils.charToInt8(chars.charAt(1)) << 8);
  },

  /**
   * Convert a 8-bit integer number to a single character.
   * @param {number} number The number to be converted. The bits higher than
   *    8 will be truncated.
   * @return {string}  A character string representing the given number.
   */
  int8ToChar: function stringUtils_int8ToChar(number) {
    // The character, whose code is less than 32, isn't printable. So
    // adds 256 to make it printable.
    if (number < 32) {
      number += 256;
    }
    return String.fromCharCode(number);
  },

  /**
   * Convert a single character string into integer number.
   * @param {string} c The character string to be converted. Only the first
   *    character will be used.
   * @return {number}  The converted number.
   */
  charToInt8: function stringUtils_charToInt8(c) {
    var ret = c.charCodeAt(0);
    if (ret >= 256) {
      ret -= 256;
    }
    return ret & 0xff;
  }
};

var Task = function task_constructor(taskFunc, taskData) {
  this.func = taskFunc;
  this.data = taskData;
};

Task.prototype = {
  /**
   * Task function
   */
  func: null,
  /**
   * Task private data
   */
  data: null
};

var TaskQueue = function taskQueue_constructor(oncomplete) {
  this.oncomplete = oncomplete;
  this._queue = [];
  this.data = {};
};

TaskQueue.prototype = {
  /**
   * Callback Javascript function object that is called when the task queue is
   * empty. The definition of callback is function oncomplete(queueData).
   */
  oncomplete: null,

  /**
   * Data sharing with all tasks of the queue
   */
  data: null,

  /**
   * Task queue array.
   */
  _queue: null,

  /**
   * Add a new task to the tail of the queue.
   * @param {Function} taskFunc Task function object. The definition is function
   * taskFunc(taskQueue, taskData).
   * The taskQueue parameter is the task queue object itself, while the taskData
   * parameter is the data property
   * of the task queue object.
   * @param {Object} taskData The task's private data.
   */
  push: function taskQueue_push(taskFunc, taskData) {
    this._queue.push(new Task(taskFunc, taskData));
  },

  /**
   * Start running the task queue or process the next task.
   * It should be called when a task, including the last one, is finished.
   */
  processNext: function taskQueue_processNext() {
    if (this._queue.length > 0) {
      var task = this._queue.shift();
      if (typeof task.func == 'function') {
        task.func(this, task.data);
      } else {
        this.processNext();
      }
    } else {
      if (typeof this.oncomplete == 'function') {
        this.oncomplete(this.data);
      }
    }
  },

  /**
   * Get the number of remaining tasks.
   */
  getSize: function taskQueue_getSize() {
    return this._queue.length;
  }
};

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
  activate: function engineBase_activate(language, suggestions, state) {
  }
};

var IMEngine = function engine_constructor() {
  IMEngineBase.call(this);

  this._keypressQueue = [];
};

IMEngine.SYS_DICT_FILE_NAME = 'xhr://{PATH}/db.json';
IMEngine.USER_DICT_FILE_NAME = 'idb://user_dict';

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
      var fixedLen = PinyinDecoderService.getFixedlen();
      display = this._firstCandidate.substring(0, fixedLen);
      var splStart = PinyinDecoderService.getSplStart();
      var splStartLen = splStart.length;
      if (splStartLen > 0) {
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
        debug('Buffer is empty; ' +
          'make suggestions based on select term.');
        candidates = PinyinDecoderService.getPredicts(this._historyText);
      }
      this._sendCandidates(candidates);
      callback();
      return;
    } else {
      // Update the candidates list by the pending pinyin string.
      this._historyText = '';
      var num = PinyinDecoderService.search(this._pendingSymbols);
      var candidates = [];
      for (var id = 0; id < num; id++) {
        var strs = PinyinDecoderService.getCandidate(id);
        candidates.push(strs);
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
    // Initialize file system and PinyinDecoderService.
    FileSystemService.init(function fsInitCallback() {
      PinyinDecoderService.open(IMEngine.SYS_DICT_FILE_NAME.replace('{PATH}',
          self._glue.path), IMEngine.USER_DICT_FILE_NAME,
          function decoderOpenCallback(isOk) {
        if (isOk) {
          debug('Succeeded in opening PinyinDecoderService.');
        } else {
          debug('Failed to open PinyinDecoderService.');
        }
      });
    });
  },

  /**
   * Override
   */
  uninit: function engine_uninit() {
    IMEngineBase.prototype.uninit.call(this);
    debug('Uninit.');

    // Close the file system and PinyinDecoderService.
    PinyinDecoderService.close(function decoderCloseCallback() {
      FileSystemService.uninit();
    });
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
      var candsNum = PinyinDecoderService.choose(candId);
      var splStart = PinyinDecoderService.getSplStart();
      var fixed = PinyinDecoderService.getFixedlen();
      // Output the result if all valid pinyin string has been converted.
      if (candsNum == 1 && fixed == splStart.length) {
        var strs = PinyinDecoderService.getCandidate(0);
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
  activate: function engine_activate(language, suggestions, state) {
    var inputType = state.type;
    IMEngineBase.prototype.activate.call(this, language, suggestions, state);
    debug('Activate. Input type: ' + inputType);
    PinyinDecoderService.flushCache(null);
    var keyboard = this._inputTraditionalChinese ?
      'zh-Hans-Pinyin-tr' : 'zh-Hans-Pinyin';
    if (inputType == '' || inputType == 'text' || inputType == 'textarea') {
      keyboard = this._keyboard;
    }

    this._glue.alterKeyboard(keyboard);
  }
};

/**
 * Interfaces of indexedDB
 */
var IndexedDB = {
  indexedDB: window.indexedDB || window.webkitIndexedDB ||
    window.mozIndexedDB || window.msIndexedDB,

  IDBDatabase: window.IDBDatabase || window.webkitIDBDatabase ||
    window.msIDBDatabase,

  IDBIndex: window.IDBIndex || window.webkitIDBIndex || window.msIDBIndex,

  /**
   * Check if the indexedDB is available on this platform
   */
  isReady: function indexedDB_isReady() {
    if (!this.indexedDB || // No IndexedDB API implementation
        this.IDBDatabase.prototype.setVersion || // old version of IndexedDB API
        window.location.protocol === 'file:') {  // bug 643318
      debug('IndexedDB is not available on this platform.');
      return false;
    }
    return true;
  }
};

var PinyinDecoderService = {
  // The maximum number of the prediction items.
  kMaxPredictNum: 500,

  /**
   * Private instance of the MatrixSearch.
   * @type MatrixSearch
   */
  _matrixSearch: null,

  /**
   * Open the decoder engine via the system and user dictionary file names.
   *
   * @param {string} sysDict The file name of the system dictionary.
   * @param {string} usrDict The file name of the user dictionary.
   * @param {function (boolean): void} callback Callback funciton called
   *    when the operation is finished. The boolean paramater indicates
   *    whether the operation is suceessful.
   * @return {void} No return value.
   */
  open: function decoderService_open(sysDict, usrDict, callback) {
    var isOk = false;
    var doCallback = function open_doCallback() {
      if (callback) {
        callbakc(isOk);
      }
    };
    if (this._matrixSearch != null) {
      doCallback();
      return;
    }
    this._matrixSearch = new MatrixSearch();
    this._matrixSearch.init(sysDict, usrDict, callback);
  },

  /**
   * Close the decode engine.
   * @param {function(void): void} callback Callback funciton called
   *    when the operation is finished. The boolean paramater indicates
   *    whether the operation is suceessful.
   * @return {void} No return value.
   */
  close: function decoderService_close(callback) {
    var self = this;
    var doCallback = function open_doCallback() {
      if (callback) {
        callback();
      }
    };
    if (this._matrixSearch == null) {
      doCallback();
      return;
    }
    this._matrixSearch.uninit(function uninitCallback() {
      self._matrixSearch = null;
      doCallback();
    });
  },

  /**
   * Flush cached data to persistent memory. Because at runtime, in order to
   * achieve best performance, some data is only store in memory.
   * @param {function(void):void} callback The function object that is
   *    called when the operation is finished.
   */
  flushCache: function decoderService_flushCache(callback) {
    var doCallback = function open_doCallback() {
      if (callback) {
        callbakc();
      }
    };
    if (this._matrixSearch == null) {
      doCallback();
      return;
    }
    this._matrixSearch.flush_cache(callback);
  },

  /**
   * Use a spelling string(Pinyin string) to search. The engine will try to do
   * an incremental search based on its previous search result, so if the new
   * string has the same prefix with the previous one stored in the decoder,
   * the decoder will only continue the search from the end of the prefix.
   * If the caller needs to do a brand new search, please call
   * im_reset_search() first.
   *
   * @param {string} spsStr The spelling string buffer to decode.
   * @return {number} The number of candidates.
   */
  search: function decoderService_search(spsStr) {
    if (this._matrixSearch == null) {
      return 0;
    }
    this._matrixSearch.search(spsStr);
    return this._matrixSearch.get_candidate_num();
  },

  /**
   * Make a delete operation in the current search result, and make research if
   * necessary.
   *
   * @param {number} pos The posistion of char in spelling string to delete,
   * or the position of spelling id in result string to delete.
   * @param {boolean} isPosInsplId Indicate whether the pos parameter is the
   * position in the spelling string, or the position in the result spelling id
   * string.
   * @param {boolean} clearFixed If true, the fixed spellings will be cleared.
   * @return {number} The number of candidates.
   */
  delSearch: function decoderService_delSearch(pos, isPosInsplId, clearFixed)
  {
    if (this._matrixSearch == null) {
      return 0;
    }
    this._matrixSearch.delsearch(pos, isPosInsplId, clearFixed);
    return this._matrixSearch.get_candidate_num();
  },

  /**
   * Reset the previous search result.
   */
  resetSearch: function decoderService_resetSearch() {
    if (this._matrixSearch == null) {
      return;
    }
    this._matrixSearch.reset_search();
  },

  /**
   * Get the spelling string kept by the decoder.
   *
   * @return {string} The spelling string kept by the decoder.
   */
  getPystr: function decoderServiceGetPystr() {
    if (this._matrixSearch == null) {
      return '';
    }
    return this._matrixSearch.get_pystr();
  },

  /**
   * Get a candidate(or choice) string.
   *
   * @param {number} candId The id to get a candidate. Started from 0.
   * Usually, id 0 is a sentence-level candidate.
   * @return {[string, string]} The simplified and traditional Chinese
   *    candidate strings if succeed. Otherwise empty strings.
   */
  getCandidate: function decoderService_getCandidate(candId) {
    if (this._matrixSearch == null) {
      return ['', ''];
    }
    return this._matrixSearch.get_candidate(candId);
  },

  /**
   * Get the segmentation information(the starting positions) of the spelling
   * string.
   *
   * @return {Array.<number>} An array contains the starting position of all
   *    the spellings.
   */
  getSplStart: function decoderService_getSplStart() {
    if (this._matrixSearch == null) {
      return 0;
    }
    return this._matrixSearch.get_spl_start();
  },

  /**
   * Choose a candidate and make it fixed. If the candidate does not match
   * the end of all spelling ids, new candidates will be provided from the
   * first unfixed position. If the candidate matches the end of the all
   * spelling ids, there will be only one new candidates, or the whole fixed
   * sentence.
   *
   * @param {number} candId The id of candidate to select and make it fixed.
   * @return {number} The candidates number of next step. If after the
   * selection, the whole result string has been fixed, there will be only
   * one candidate.
   */
  choose: function decoderService_choose(candId) {
    if (this._matrixSearch == null) {
      return 0;
    }
    return this._matrixSearch.choose(candId);
  },

  /**
   * Get the number of fixed spelling ids, or Chinese characters.
   *
   * @return {number} The number of fixed spelling ids, of Chinese characters.
   */
  getFixedlen: function decoderService_getFixedlen() {
    if (this._matrixSearch == null) {
      return 0;
    }
    return this._matrixSearch.get_fixedlen();
  },

  /**
   * Get prediction candiates based on the given fixed Chinese string as the
   * history.
   *
   * @param {string} history The history string to do the prediction.
   * @return {Array.<[string, string]>} The prediction result list of a
   *    string array.
   */
  getPredicts: function decoderService_getPredicts(history) {
    if (this._matrixSearch == null) {
      return [];
    }
    return this._matrixSearch.get_predicts(history);
  }
};

var FileSystemService = {
  Type: {
    IndexedDB: 0,
    XHR: 1,
    SpiderMonkey: 2
  },

  /**
   * Initialization.
   * @param {function(): void} callback
   * Javascript function object that is called
   * when the operation is finished.
   */
  init: function fileSystemService_init(callback) {
    var self = this;
    function doCallback() {
      if (callback) {
        callback();
      }
    }

    var taskQueue = new TaskQueue(
        function taskQueueOnCompleteCallback(queueData) {
      doCallback();
    });

    var processNextWithDelay =
        function fileSystemService_rocessNextWithDelay() {
      if (typeof setTimeout != 'undefined') {
        setTimeout(function nextTask() {
          taskQueue.processNext();
        }, 0);
      } else {
        taskQueue.processNext();
      }
    };

    taskQueue.push(function initIdb(taskQueue, taskData) {
      var store = new IndexedDBFileSystemStorage();
      FileSystemService._storages[0] = store;
      store.init(function idbCallback(statusCode) {
        processNextWithDelay();
      });
    });

    taskQueue.push(function initXhr(taskQueue, taskData) {
      var store = new XhrFileSystemStorage();
      FileSystemService._storages[1] = store;
      store.init(function xhrCallback(statusCode) {
        processNextWithDelay();
      });
    });

    taskQueue.push(function initSm(taskQueue, taskData) {
      var store = new SpiderMonkeyFileSystemStorage();
      FileSystemService._storages[2] = store;
      store.init(function idbCallback(statusCode) {
        processNextWithDelay();
      });
    });

    taskQueue.processNext();
  },

  /**
   * Destruction.
   */
  uninit: function fileSystemService_uninit() {
    var n = FileSystemService._storages.length;
    for (var i = 0; i < n; i++) {
      var store = FileSystemService._storages[i];
      if (store) {
        store.uninit();
      }
    }
  },
  /**
   * @param {FileSystemService.Type} type The type code of the file system.
   */
  isFileSystemReady: function fileSystemService_isFileSystemReady(type) {
    if (type < 0 || type >= FileSystemService.PROTOCOLS.length) {
      return false;
    }
    if (FileSystemService._storages[type] &&
        FileSystemService._storages[type].isReady()) {
      return true;
    }
    return false;
  },

  /**
   * Read the entire contents of a file.
   * @param {string} uri The file path.
   * @param {function(string): void} callback The function object that is
   *    called when the operation is finished. The definition of callback is
   *    function callback(str). The str parameter is the content of the file,
   *    which will be an empty string if the file is empty or does not exist.
   */
  read: function fileSystemService_read(uri, callback) {
    var ret = FileSystemService._parse(uri);
    FileSystemService._storages[ret.type].read(ret.path, callback);
  },

  /**
   * Save a file.
   * @param {string} uri The file uri.
   * @param {string} str The file content.
   * @param {function(boolean): void} callback The function object that is
   *    called when the operation is finished. The boolean parameter indicates
   *    whether the file is saved successfully.
   */
  write: function fileSystemService_write(uri, str, callback) {
    var ret = FileSystemService._parse(uri);
    FileSystemService._storages[ret.type].write(ret.path, str, callback);
  },

  /**
   * Delete a file.
   * @param {string} uri The file uri.
   * @param {function(boolean): void} callback The function object that is
   *    called when the operation is finished. The boolean parameter indicates
   *    whether the file is deleted successfully.
   */
  del: function fileSystemService_del(uri, callback) {
    var ret = FileSystemService._parse(uri);
    FileSystemService._storages[ret.type].del(ret.path, callback);
  },

  _storages: [null, null, null],

  PROTOCOLS: ['idb', 'xhr', 'sm'],

  /**
   * Parse the file uri to get the file system type code and file path.
   * For example, if the uri is 'idb://rawdict.txt', the type code
   * Type.IndexedDB and the path is 'rawdict.txt'.
   * @return {type: FileSystemService.Type, path: string} Returns the type and
   * path. If the type cannot be determined, the default type Type.IndexedDB is
   * returned.
   */
  _parse: function fileSystemService_parse(uri) {
    var type = FileSystemService.Type.IndexedDB;
    var path = uri.trim();
    var n = FileSystemService.PROTOCOLS.length;
    for (var i = 0; i < n; i++) {
      var pro = FileSystemService.PROTOCOLS[i];
      if (uri.indexOf(pro) != -1) {
        type = i;
        path = path.substring(pro.length + 3);
      }
    }
    return {type: type, path: path};
  }
};

var File = function file_constructor(name, str) {
  this.name = name;
  this.content = str;
};

File.prototype = {
  name: '',
  content: ''
};

var FileSystemStorage = function fileSystemStorage_constructor() {
};

/**
 * FileSystemStorage status code enumeration.
 */
FileSystemStorage.StatusCode = {
  /* The storage isn't initilized.*/
  UNINITIALIZED: 0,
  /* The storage is busy.*/
  BUSY: 1,
  /* The storage has been successfully initilized and is ready to use.*/
  READY: 2,
  /* The storage is failed to initilized and cannot be used.*/
  ERROR: 3
};

FileSystemStorage.prototype = {
  /**
   * @type FileSystemStorage.StatusCode
   */
  _status: FileSystemStorage.StatusCode.UNINITIALIZED,

  /**
   * Initialization.
   * @param {function(FileSystemStorage.StatusCode): void} callback
   * Javascript function object that is called
   * when the operation is finished. The definition of callback is
   * function callback(statusCode). The statusCode parameter is of type
   * DatabaseStorageBase.StatusCode that stores the status of the storage
   * after Initialization.
   */
  init: function fileSystemStorage_init(callback) {},

  /**
   * Destruction.
   */
  uninit: function fileSystemStorage_uninit() {},

  /**
   * Whether the database is ready to use.
   */
  isReady: function storagebase_isReady() {
    return this._status == FileSystemStorage.StatusCode.READY;
  },

  /**
   * Read the entire contents of a file.
   * @param {string} name The file name.
   * @param {function(string): void} callback The function object that is
   *    called when the operation is finished. The definition of callback is
   *    function callback(str). The str parameter is the content of the file,
   *    which will be an empty string if the file is empty or does not exist.
   */
  read: function fileSystemStorage_read(name, callback) {},

  /**
   * Save a file.
   * @param {string} name The file name.
   * @param {string} str The file content.
   * @param {function(boolean): void} callback The function object that is
   *    called when the operation is finished. The boolean parameter indicates
   *    whether the file is saved successfully.
   */
  write: function fileSystemStorage_write(name, str, callback) {
    if (callback) {
      callback(true);
    }
  },

  /**
   * Delete a file.
   * @param {string} name The file name.
   * @param {function(boolean): void} callback The function object that is
   *    called when the operation is finished. The boolean parameter indicates
   *    whether the file is deleted successfully.
   */
  del: function fileSystemStorage_del(name, callback) {
    if (callback) {
      callback(true);
    }
  }
};

/**
 * Simulate file system with indexedDB
 * @constructor
 */
var IndexedDBFileSystemStorage = function idbFileSystemStorage_constructor() {
  this._dbName = IndexedDBFileSystemStorage.DB_NAME;
  this._dbVersion = IndexedDBFileSystemStorage.DB_VERSION;
  this._dbStoreName = IndexedDBFileSystemStorage.STORE_NAME;
};

IndexedDBFileSystemStorage.DB_VERSION = 1.0;
IndexedDBFileSystemStorage.DB_NAME = 'jspinyin-fileSystem';
IndexedDBFileSystemStorage.STORE_NAME = 'files';

IndexedDBFileSystemStorage.prototype = {
  // Inherits FileSystemStorage
  __proto__: new FileSystemStorage(),

  // IDBDatabase interface
  _IDBDatabase: null,

  _dbName: '',

  _dbVersion: 0,

  _dbStoreName: '',

  /**
   * @override
   */
  init: function idbFileSystemStorage_init(callback) {
    var self = this;
    var doCallback = function init_doCallback() {
      if (callback) {
        callback(self._status);
      }
    };

    // Check if we could initilize.
    if (!IndexedDB.isReady() ||
        this._status != FileSystemStorage.StatusCode.UNINITIALIZED) {
      doCallback();
      return;
    }

    // Set the status to busy.
    this._status = FileSystemStorage.StatusCode.BUSY;

    // Open the database
    var req = IndexedDB.indexedDB.open(this._dbName, this._dbVersion);
    req.onerror = function dbopenError(ev) {
      debug('Encounter error while opening IndexedDB: ' + this._dbName);
      self._status = FileSystemStorage.StatusCode.ERROR;
      doCallback();
    };

    req.onupgradeneeded = function dbopenUpgradeneeded(ev) {
      debug('IndexedDB upgradeneeded.');
      self._IDBDatabase = ev.target.result;

      // delete the old ObjectStore if present
      if (self._IDBDatabase.objectStoreNames.length !== 0) {
        self._IDBDatabase.deleteObjectStore(self._dbStoreName);
      }

      // create ObjectStore
      var store = self._IDBDatabase.createObjectStore(self._dbStoreName,
                                                      { keyPath: 'name' });

      // no callback() here
      // onupgradeneeded will follow by onsuccess event
    };

    req.onsuccess = function dbopenSuccess(ev) {
      debug('IndexedDB opened.');
      self._IDBDatabase = ev.target.result;
      self._status = FileSystemStorage.StatusCode.READY;
      doCallback();
    };
  },

  /**
   * @override
   */
  uninit: function idbFileSystemStorage_uninit() {
    // Check if we need uninitilize the storage
    if (this._status == FileSystemStorage.StatusCode.UNINITIALIZED) {
      return;
    }

    // Perform destruction operation
    if (this._IDBDatabase) {
      this._IDBDatabase.close();
    }

    this._status = FileSystemStorage.StatusCode.UNINITIALIZED;
  },

  /**
   * @override
   */
  read: function idbFileSystemStorage_read(name, callback) {
    var content = '';
    var doCallback = function read_doCallback() {
      if (callback) {
        callback(content);
      }
    };

    // Check if the storage is ready.
    if (!this.isReady()) {
      doCallback();
      return;
    }

    var store = this._IDBDatabase.transaction([this._dbStoreName],
          'readonly').objectStore(this._dbStoreName);
    var req = store.get(name);

    req.onerror = function(ev) {
      debug('Database read error.');
      doCallback();
    };

    req.onsuccess = function(ev) {
      var file = ev.target.result;
      if (file) {
        content = file.content;
      }
      doCallback();
    };
  },

  /**
   * @override
   */
  write: function idbFileSystemStorage_write(name, str, callback) {
    var self = this;
    var isOk = false;
    var doCallback = function write_doCallback() {
      self._status = FileSystemStorage.StatusCode.READY;
      if (callback) {
        callback(isOk);
      }
    };

    // Check if the storage is ready.
    if (!this.isReady()) {
      doCallback();
      return;
    }

    // Set the status to busy.
    this._status = FileSystemStorage.StatusCode.BUSY;

    var transaction = this._IDBDatabase.transaction([this._dbStoreName],
          'readwrite');
    var store = transaction.objectStore(this._dbStoreName);
    transaction.onerror = function(ev) {
      debug('Database write error.');
      doCallback();
    };

    transaction.oncomplete = function() {
      isOk = true;
      doCallback();
    };

    store.put(new File(name, str));
  },

  /**
   * @override
   */
  del: function idbFileSystemStorage_del(name, callback) {
    var self = this;
    var isOk = false;
    var doCallback = function del_doCallback() {
      self._status = FileSystemStorage.StatusCode.READY;
      if (callback) {
        callback(isOk);
      }
    };

    // Check if the storage is ready.
    if (!this.isReady()) {
      doCallback();
      return;
    }

    // Set the status to busy.
    this._status = FileSystemStorage.StatusCode.BUSY;

    var transaction =
      self._IDBDatabase.transaction([this._dbStoreName], 'readwrite');
    var store = transaction.objectStore(this._dbStoreName);
    transaction.onerror = function(ev) {
      debug('Database write error.');
      doCallback();
    };

    transaction.oncomplete = function() {
      isOk = true;
      doCallback();
    };

    store.delete(name);
  }
};

/**
 * Implement file system storage with SpiderMonkey file api.
 * @param {string} dir The base directory of the file system.
 */
var SpiderMonkeyFileSystemStorage =
    function spiderMonkeyFileSystemStorage_constructor(dir) {
  this._baseDir = dir;
};

SpiderMonkeyFileSystemStorage.prototype = {
  // Inherits FileSystemStorage
  __proto__: new FileSystemStorage(),

  _baseDir: '',

  /**
   * @override
   */
  init: function spiderMonkeyFileSystemStorage_init(callback) {
    debug('SpiderMonkeyFileSystemStorage init');
    var self = this;
    function doCallback() {
      if (callback) {
        callback(self._status);
      }
    }

    // Check if we could initilize.
    if (this._status != FileSystemStorage.StatusCode.UNINITIALIZED) {
      doCallback();
      return;
    }

    // Set the status to busy.
    this._status = FileSystemStorage.StatusCode.BUSY;

    // Perform initialization operation
    if (typeof read == 'function') {
      self._status = FileSystemStorage.StatusCode.READY;
    } else {
      self._status = FileSystemStorage.StatusCode.ERROR;
    }

    doCallback();
  },

  /**
   * @override
   */
  uninit: function spiderMonkeyFileSystemStorage_uninit(callback) {
    function doCallback() {
      if (callback) {
        callback();
      }
    }

    // Check if we could uninitilize the storage
    if (this._status == FileSystemStorage.StatusCode.UNINITIALIZED) {
      doCallback();
      return;
    }

    // Perform destruction operation
    this._status = FileSystemStorage.StatusCode.UNINITIALIZED;
    doCallback();
  },

  /**
   * @override
   */
  read: function spiderMonkeyFileSystemStorage_read(name, callback) {
    debug('SpiderMonkeyFileSystemStorage read file: ' + name);
    var content = '';
    var doCallback = function read_doCallback() {
      if (callback) {
        callback(content);
      }
    };

    // Check if the storage is ready.
    if (!this.isReady()) {
      doCallback();
      return;
    }

    try {
      content = read(name);
    } catch (ex) {
      debug(ex);
    }

    doCallback();
  },

  write: function spiderMonkeyFileSystemStorage_write(name, str, callback) {
    debug(StringUtils.format('SpiderMonkeyFileSystemStorage writes file "{0}"',
        name));
    print(str);
    if (callback) {
      callback(true);
    }
  }
};

/**
 * Implement file system storage with the XMLHttpRequest.
 * @param {string} dir The base directory of the file system.
 */
var XhrFileSystemStorage =
    function xhrFileSystemStorage_constructor(dir) {
  this._baseDir = dir;
};

XhrFileSystemStorage.prototype = {
  // Inherits FileSystemStorage
  __proto__: new FileSystemStorage(),

  _baseDir: '',

  /**
   * @override
   */
  init: function xhrFileSystemStorage_init(callback) {
    debug('XhrFileSystemStorage init');
    var self = this;
    function doCallback() {
      if (callback) {
        callback(self._status);
      }
    }

    // Check if we could initilize.
    if (this._status != FileSystemStorage.StatusCode.UNINITIALIZED) {
      doCallback();
      return;
    }

    // Set the status to busy.
    this._status = FileSystemStorage.StatusCode.BUSY;

    // Perform initialization operation
    self._status = FileSystemStorage.StatusCode.READY;

    doCallback();
  },

  /**
   * @override
   */
  uninit: function xhrFileSystemStorage_uninit(callback) {
    function doCallback() {
      if (callback) {
        callback();
      }
    }

    // Check if we could uninitilize the storage
    if (this._status == FileSystemStorage.StatusCode.UNINITIALIZED) {
      doCallback();
      return;
    }

    // Perform destruction operation
    this._status = FileSystemStorage.StatusCode.UNINITIALIZED;
    doCallback();
  },

  /**
   * @override
   */
  read: function xhrFileSystemStorage_read(name, callback) {
    debug('XhrFileSystemStorage read file: ' + name);
    var self = this;
    var content = '';
    function doCallback() {
      if (callback) {
        callback(content);
      }
    }

    // Check if the storage is ready.
    if (!this.isReady()) {
      doCallback();
      return;
    }

    try {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', name, true);
      xhr.responseType = 'text';
      xhr.overrideMimeType('text/plain; charset=UTF-8');
      xhr.onreadystatechange = function xhrReadystatechange(ev) {
        if (xhr.readyState !== XMLHttpRequest.DONE) {
          return;
        }
        if (xhr.status == 200 || xhr.status == 304) {
          content = xhr.responseText;
        } else {
          // error occurred.
          debug('XhrFileSystemStorage failed to load file. Error Code:' +
              xhr.status);
        }
        doCallback();
      };
      xhr.send(null);
    } catch (ex) {
      debug(ex);
      doCallback();
    }
  },

  /**
   * @override
   */
  write: function xhrFileSystemStorage_write(name, str, callback) {
    debug(StringUtils.format('XhrFileSystemStorage writes file: "{0}"', name));
    var self = this;
    var isOk = false;
    var doCallback = function write_doCallback() {
      if (callback) {
        callback(isOk);
      }
    };

    // Check if the storage is ready.
    if (!this.isReady()) {
      doCallback();
      return;
    }

    try {
      var xhr = new XMLHttpRequest();
      xhr.open('PUT', name, true);
      xhr.setRequestHeader('Content-Type', 'text/plain;charset=UTF-8');

      xhr.onreadystatechange = function xhrReadystatechange(ev) {
        if (xhr.readyState !== XMLHttpRequest.DONE) {
          return;
        }
        if (xhr.status === 200 || xhr.status === 204) {
          isOk = true;
        } else {
          // error occurred.
          isOk = false;
          debug('XhrFileSystemStorage failed to write file. Error coce:' +
              xhr.status);
        }
        doCallback();
      };
      xhr.send(str);
    } catch (ex) {
      debug(ex);
      isOk = false;
      doCallback();
    }
  },

  /**
   * @override
   */
  del: function xhrFileSystemStorage_del(name, callback) {
    debug(StringUtils.format('XhrFileSystemStorage deletes file: "{0}"', name));
    var self = this;
    var isOk = false;
    var doCallback = function del_doCallback() {
      if (callback) {
        callback(isOk);
      }
    };

    // Check if the storage is ready.
    if (!this.isReady()) {
      doCallback();
      return;
    }

    try {
      var xhr = new XMLHttpRequest();
      xhr.open('DELETE', name, true);
      xhr.setRequestHeader('Content-Type', 'text/plain;charset=UTF-8');

      xhr.onreadystatechange = function xhrReadystatechange(ev) {
        if (xhr.readyState !== XMLHttpRequest.DONE) {
          return;
        }
        if (xhr.status === 200 || xhr.status === 202 || xhr.status === 204) {
          isOk = true;
        } else {
          // error occurred.
          isOk = false;
          debug('XhrFileSystemStorage failed to delete file. Error coce:' +
              xhr.status);
        }
        doCallback();
      };
      xhr.send(str);
    } catch (ex) {
      debug(ex);
      isOk = false;
      doCallback();
    }
  }
};

var DictDef = {
  // The max length of a lemma.
  kMaxLemmaSize: 8,

  // The max length of a Pinyin (spelling).
  kMaxPinyinSize: 6,

  // The number of half spelling ids. For Chinese Pinyin, there 30 half ids.
  // See SpellingTrie.h for details.
  kHalfSpellingIdNum: 29,

  // The maximum number of full spellings. For Chinese Pinyin, there are only
  // about 410 spellings.
  // If change this value is bigger(needs more bits), please also update
  // other structures like SpellingNode, to make sure than a spelling id can be
  // stored.
  // -1 is because that 0 is never used.
  kMaxSpellingNum: 512 - 29 - 1,

  kMaxSearchSteps: 40,

  // One character predicts its following characters.
  kMaxPredictSize: 8 - 1,

  // Actually, a Id occupies 3 bytes in storage.
  kLemmaIdSize: 3,
  kLemmaIdComposing: 0xffffff,

  // Number of items with highest score are kept for prediction purpose.
  kTopScoreLemmaNum: 10,

  kMaxPredictNumByGt3: 1,
  kMaxPredictNumBy3: 2,
  kMaxPredictNumBy2: 2,

  // The last lemma id (included) for the system dictionary. The system
  // dictionary's ids always start from 1.
  kSysDictIdEnd: 500000,

  // The first lemma id for the user dictionary.
  kUserDictIdStart: 500001,

  // The last lemma id (included) for the user dictionary.
  kUserDictIdEnd: 600000
};

DictDef.SpellingId = function spellingId_constructor(half_splid, full_splid) {
  this.half_splid = half_splid;
  this.full_splid = full_splid;
};

DictDef.SpellingId.prototype = {
  half_splid: 0,
  full_splid: 0
};

/**
 * We use different node types for different layers
 * Statistical data of the building result for a testing dictionary:
 *                              root,   level 0,   level 1,   level 2,   level 3
 * max son num of one node:     406        280         41          2          -
 * max homo num of one node:      0         90         23          2          2
 * total node num of a layer:     1        406      31766      13516        993
 * total homo num of a layer:     9       5674      44609      12667        995
 *
 * The node number for root and level 0 won't be larger than 500
 * According to the information above, two kinds of nodes can be used; one for
 * root and level 0, the other for these layers deeper than 0.
 *
 * LE = less and equal,
 * A node occupies 16 bytes. so, totallly less than 16 * 500 = 8K
 */
DictDef.LmaNodeLE0 = function lmaNodeLE0_constructor() {
  this.son_1st_off = 0;
  this.homo_idx_buf_off = 0;
  this.spl_idx = 0;
  this.num_of_son = 0;
  this.num_of_homo = 0;
};

DictDef.LmaNodeLE0.prototype = {
  son_1st_off: 0,
  homo_idx_buf_off: 0,
  spl_idx: 0,
  num_of_son: 0,
  num_of_homo: 0
};

/**
 * GE = great and equal
 */
DictDef.LmaNodeGE1 = function lmaNodeGE1_constructor() {
  this.son_1st_off_l = 0;
  this.homo_idx_buf_off_l = 0;
  this.spl_idx = 0;
  this.num_of_son = 0;
  this.num_of_homo = 0;
  this.son_1st_off_h = 0;
  this.homo_idx_buf_off_h = 0;
};

DictDef.LmaNodeGE1.prototype = {
  son_1st_off_l: 0,         // Low bits of the son_1st_off
  homo_idx_buf_off_l: 0,    // Low bits of the homo_idx_buf_off_1
  spl_idx: 0,
  num_of_son: 0,            // number of son nodes
  num_of_homo: 0,           // number of homo words
  son_1st_off_h: 0,         // high bits of the son_1st_off
  homo_idx_buf_off_h: 0,    // high bits of the homo_idx_buf_off

  /**
   * Serialize to string.
   * @return {string} The serializing result string.
   */
  serialize: function lmaNodeGE1_serialize() {
    var str = '';
    str += StringUtils.int16ToChars(this.son_1st_off_l);
    str += StringUtils.int16ToChars(this.homo_idx_buf_off_l);
    str += StringUtils.int16ToChars(this.spl_idx);
    str += StringUtils.int8ToChar(this.num_of_son);
    str += StringUtils.int8ToChar(this.num_of_homo);
    str += StringUtils.int8ToChar(this.son_1st_off_h);
    str += StringUtils.int8ToChar(this.homo_idx_buf_off_h);
    return str;
  },

  /**
   * Deserialize from string.
   * @param {string} str String buffer to deserialize from.
   * @param {number} pos The start position of the buffer.
   * @return {number} The end position of the string buffer after
   *    deserializtion.
   */
  deserialize: function lmaNodeGE1_deserialize(str, pos) {
    var chars = str.substring(pos, pos + 2);
    this.son_1st_off_l = StringUtils.charsToInt16(chars);
    pos += 2;
    chars = str.substring(pos, pos + 2);
    this.homo_idx_buf_off_l = StringUtils.charsToInt16(chars);
    pos += 2;
    chars = str.substring(pos, pos + 2);
    this.spl_idx = StringUtils.charsToInt16(chars);
    pos += 2;
    chars = str.substring(pos, pos + 1);
    this.num_of_son = StringUtils.charToInt8(chars);
    pos++;
    chars = str.substring(pos, pos + 1);
    this.num_of_homo = StringUtils.charToInt8(chars);
    pos++;
    chars = str.substring(pos, pos + 1);
    this.son_1st_off_h = StringUtils.charToInt8(chars);
    pos++;
    chars = str.substring(pos, pos + 1);
    this.homo_idx_buf_off_h = StringUtils.charToInt8(chars);
    pos++;
    return pos;
  }
};

DictDef.SingleCharItem = function singleCharItem_constructor() {
  this.splid = new DictDef.SpellingId(0, 0);
  this.freq = 0;
  this.hz = '';
  this.hz_tr = '';
};

DictDef.SingleCharItem.prototype = {
  freq: 0.0,

  /**
   * Simplified hanzi char.
   * @type string
   */
  hz: '',

  /**
   * Traditional hanzi char.
   * @type string
   */
  hz_tr: '',

  /**
   * @type DictDef.SpellingId
   */
  splid: null,

  /**
   * Copy the content.
   * @param {DictDef.SingleCharItem} src The source to be copied from.
   * @return {void}  No return value.
   */
  copy: function singleCharItem_copy(src) {
    this.freq = src.freq;
    this.hz = src.hz;
    this.hz_tr = src.hz_tr;
    this.splid = src.splid;
  }
};

DictDef.LemmaEntry = function lemmaEntry_constructor() {
  this.hanzi_scis_ids = [];
  this.spl_idx_arr = [];
  this.pinyin_str = [];
  for (var pos = 0; pos < DictDef.kMaxLemmaSize; pos++) {
    this.hanzi_scis_ids[pos] = 0;
    this.spl_idx_arr[pos] = 0;
    this.pinyin_str[pos] = '';
  }
  this.spl_idx_arr[DictDef.kMaxLemmaSize] = 0;
};

DictDef.LemmaEntry.prototype = {
  idx_by_py: 0,
  idx_by_hz: 0,

  /**
   * Simplified hanzi string.
   * @type string
   */
  hanzi_str: '',

  /**
   * Traditional hanzi string.
   * @type string
   */
  hanzi_str_tr: '',

  /**
   * The SingleCharItem id for each Hanzi.
   * The length is DictDef.kMaxLemmaSize.
   * @type Array.<number>
   */
  hanzi_scis_ids: null,

  /**
   * The array length is DictDef.kMaxLemmaSize + 1.
   * @type {Array.<number>}
   */
  spl_idx_arr: null,

  /**
   * The array length is DictDef.kMaxLemmaSize.
   * @type Array.<string>
   */
  pinyin_str: null,

  freq: 0.0
};

var ArrayUtils = {
  isArray: function arrayUtils_isArray(value) {
    return value && typeof value === 'object' &&
      value.constructor === Array;
  },

  /**
   * Sort part of an array.
   * @param {Array} array The array to be sort.
   * @param {number} start The start position to be sort.
   * @param {number} length The length from start position.
   * @param {function (*, *): number} cmp The comparasion function.
   * @return {void}  No return value.
   */
  sort: function arrayUtils_sort(array, start, length, cmp) {
    var len = array.length;
    if (start < 0 || start >= len || length <= 0 || start + length > len) {
      return;
    }
    var cmpFunc = (typeof cmp === 'function') ? cmp : SearchUtility.compare;
    var arraySorted = array.slice(start, start + length);
    arraySorted.sort(cmpFunc);
    for (var pos = 0; pos < length; pos++) {
      array[start + pos] = arraySorted[pos];
    }
  }
};

var SearchUtility = {
  /**
   * Compare two item.
   * @param {number | string | Array} a The first item to be compare.
   * @param {number | string | Array} b The second item to be compare.
   * @return {number} -1: a < b; 0: a = b; 1: a > b.
   */
  compare: function searchUtility_compare(a, b) {
    if (ArrayUtils.isArray(a) && ArrayUtils.isArray(b)) {
      var n = Math.min(a.length, b.length);
      var i = 0;
      for (i = 0; i < n; i++) {
        if (a[i] != b[i]) {
          break;
        }
      }
      if (i == n) {
        return SearchUtility.compare(b.length, a.length);
      }
      return SearchUtility.compare(a[i], b[i]);
    }
    if (a > b) {
      return 1;
    }
    if (a < b) {
      return -1;
    }
    return 0;
  },

  is_system_lemma: function searchUtility_is_system_lemma(lma_id) {
    return (0 < lma_id && lma_id <= DictDef.kSysDictIdEnd);
  },

  is_user_lemma: function searchUtility_is_user_lemma(lma_id) {
    return (DictDef.kUserDictIdStart <= lma_id &&
            lma_id <= DictDef.kUserDictIdEnd);
  },

  is_composing_lemma: function searchUtility_is_composing_lemma(lma_id) {
    return (DictDef.kLemmaIdComposing == lma_id);
  },

  cmp_lpi_with_psb: function searchUtility_cmp_lpi_with_psb(p1, p2) {
    return SearchUtility.compare(p1.psb, p2.psb);
  },

  cmp_lpi_with_unified_psb: function
      searchUtility_cmp_lpi_with_unified_psb(p1, p2) {
    // The real unified psb is psb1 / lma_len1 and psb2 * lma_len2
    // But we use psb1 * lma_len2 and psb2 * lma_len1 to get better
    // precision.
    var up1 = p1.psb * p2.lma_len;
    var up2 = p2.psb * p1.lma_len;
    return SearchUtility.compare(up1, up2);
  },

  cmp_lpi_with_id: function searchUtility_cmp_lpi_with_id(p1, p2) {
    return SearchUtility.compare(p1.id, p2.id);
  },

  cmp_lpi_with_hanzi: function searchUtility_cmp_lpi_with_hanzi(p1, p2) {
    return SearchUtility.compare(p1.hanzi, p2.hanzi);
  },

  cmp_lpsi_with_str: function searchUtility_cmp_lpsi_with_str(p1, p2) {
    return SearchUtility.compare(p1.str, p2.str);
  },

  cmp_hanzis_1: function searchUtility_cmp_hanzis_1(p1, p2) {
    var len = 1;
    return SearchUtility.compare(p1.substring(0, len), p2.substring(0, len));
  },

  cmp_hanzis_2: function searchUtility_cmp_hanzis_1(p1, p2) {
    var len = 2;
    return SearchUtility.compare(p1.substring(0, len), p2.substring(0, len));
  },

  cmp_hanzis_3: function searchUtility_cmp_hanzis_1(p1, p2) {
    var len = 3;
    return SearchUtility.compare(p1.substring(0, len), p2.substring(0, len));
  },

  cmp_hanzis_4: function searchUtility_cmp_hanzis_1(p1, p2) {
    var len = 4;
    return SearchUtility.compare(p1.substring(0, len), p2.substring(0, len));
  },

  cmp_hanzis_5: function searchUtility_cmp_hanzis_1(p1, p2) {
    var len = 5;
    return SearchUtility.compare(p1.substring(0, len), p2.substring(0, len));
  },

  cmp_hanzis_6: function searchUtility_cmp_hanzis_1(p1, p2) {
    var len = 6;
    return SearchUtility.compare(p1.substring(0, len), p2.substring(0, len));
  },

  cmp_hanzis_7: function searchUtility_cmp_hanzis_1(p1, p2) {
    var len = 7;
    return SearchUtility.compare(p1.substring(0, len), p2.substring(0, len));
  },

  cmp_hanzis_8: function searchUtility_cmp_hanzis_1(p1, p2) {
    var len = 8;
    return SearchUtility.compare(p1.substring(0, len), p2.substring(0, len));
  },

  cmp_npre_by_score: function searchUtility_cmp_npre_by_score(p1, p2) {
    return SearchUtility.compare(p1.psb, p2.psb);
  },

  cmp_npre_by_hislen_score: function searchUtility_cmp_npre_by_hislen_score(p1,
      p2) {
    return SearchUtility.compare(p2.his_len, p1.his_len) ||
      SearchUtility.compare(p1.psb, p2.psb);
  },

  cmp_npre_by_hanzi_score: function searchUtility_cmp_npre_by_hanzi_score(p1,
      p2) {
    return SearchUtility.compare(p1.pre_hzs, p2.pre_hzs) ||
      SearchUtility.compare(p1.psb, p2.psb);
  },

  remove_duplicate_npre: function searchUtility_remove_duplicate_npre(
      npre_items, npre_num) {
    if (!npre_items) {
      return 0;
    }
    if (!npre_num) {
      return 0;
    }

    ArrayUtils.sort(npre_items, 0, npre_num,
      SearchUtility.cmp_npre_by_hanzi_score);

    var remain_num = 1;  // The first one is reserved.
    for (var pos = 1; pos < npre_num; pos++) {
      if (npre_items[pos].pre_hzs != npre_items[remain_num - 1].pre_hzs) {
        if (remain_num != pos) {
          npre_items[remain_num].copy(npre_items[pos]);
        }
        remain_num++;
      }
    }
    return remain_num;
  }
};

// Type used to express a lemma and its probability score.
SearchUtility.LmaPsbItem = function lmaPsbItem_constructor() {
  this.id = 0;
  this.lma_len = 0;
  this.psb = 0;
  this.hanzi = '';
  this.hanzi_tr = '';
};

SearchUtility.LmaPsbItem.prototype = {
  id: 0,
  lma_len: 0,
  // The score, the lower psb, the higher possibility.
  psb: 0,
  // For single character items, we may also need Hanzi.
  // For multiple characer items, ignore it.
  hanzi: '',
  hanzi_tr: '',

  /**
   * Copy the content.
   * @param {SearchUtility.LmaPsbItem} src The source to be copied.
   */
  copy: function lmaPsbItem_copy(src) {
    this.id = src.id;
    this.lma_len = src.lma_len;
    this.psb = src.psb;
    this.hanzi = src.hanzi;
    this.hanzi_tr = src.hanzi_tr;
  }
};

// LmaPsbItem extended with string.
SearchUtility.LmaPsbStrItem = function lmaPsbStrItem_constructor() {
  this.lpi = new SearchUtility.LmaPsbItem();
};

SearchUtility.LmaPsbStrItem.prototype = {
  /**
   *@type SearchUtility.LmaPsbItem
   */
  lpi: null,
  str: ''
};

SearchUtility.NPredictItem = function nPredictItem_constructor() {
  this.psb = 0.0;
  this.pre_hzs = '';
  this.pre_hzs_tr = '';
  this.his_len = 0;
};

SearchUtility.NPredictItem.prototype = {
  psb: 0.0,

  /**
   * Simplified prediction hanzi.
   * @type string.
   */
  pre_hzs: '',

  /**
   * Traditional prediction hanzi.
   * @type string.
   */
  pre_hzs_tr: '',

  // The length of the history used to do the prediction.
  his_len: 0,

  /**
   * Copy the content.
   * @param {SearchUtility.NPredictItem} src The source to be copied from.
   * @return {void}  No return value.
   */
  copy: function nPredictItem_copy(src) {
    this.psb = src.psb;
    this.pre_hzs = src.pre_hzs;
    this.pre_hzs_tr = src.pre_hzs_tr;
    this.his_len = src.his_len;
  }
};

 /**
  * Parameter structure used to extend in a dictionary. All dictionaries
  * receives the same DictExtPara and a dictionary specific MileStoneHandle for
  * extending.
  *
  * When the user inputs a new character, AtomDictBase::extend_dict() will be
  * called at least once for each dictionary.
  *
  * For example, when the user inputs "wm", extend_dict() will be called twice,
  * and the DictExtPara parameter are as follows respectively:
  * 1. splids = {w, m}; splids_extended = 1; ext_len = 1; step_no = 1;
  * splid_end_split = false; id_start = wa(the first id start with 'w');
  * id_num = number of ids starting with 'w'.
  * 2. splids = {m}; splids_extended = 0; ext_len = 1; step_no = 1;
  * splid_end_split = false; id_start = wa; id_num = number of ids starting with
  * 'w'.
  *
  * For string "women", one of the cases of the DictExtPara parameter is:
  * splids = {wo, men}, splids_extended = 1, ext_len = 3 (length of "men"),
  * step_no = 4; splid_end_split = false; id_start = men, id_num = 1.
  */
SearchUtility.DictExtPara = function dictExtPara_constructor() {
  this.splids = [];
  for (var i = 0; i < DictDef.kMaxSearchSteps; i++) {
    this.splids[i] = 0;
  }
};

SearchUtility.DictExtPara.prototype = {
  /**
   * Spelling ids for extending, there are splids_extended + 1 ids in the
   * buffer.
   * For a normal lemma, there can only be kMaxLemmaSize spelling ids in max,
   * but for a composing phrase, there can kMaxSearchSteps spelling ids.
   * @type Array.<number>
   */
  splids: null,

  /**
   * Number of ids that have been used before. splids[splids_extended] is the
   * newly added id for the current extension.
   */
  splids_extended: 0,

  /**
   * The step span of the extension. It is also the size of the string for
   * the newly added spelling id.
   */
  ext_len: 0,

  /**
   * The step number for the current extension. It is also the ending position
   * in the input Pinyin string for the substring of spelling ids in splids[].
   * For example, when the user inputs "women", step_no = 4.
   * This parameter may useful to manage the MileStoneHandle list for each
   * step. When the user deletes a character from the string, MileStoneHandle
   * objects for the the steps after that character should be reset; when the
   * user begins a new string, all MileStoneHandle objects should be reset.
   */
  step_no: 0,

  /**
   * Indicate whether the newly added spelling ends with a splitting character
   * @type boolean
   */
  splid_end_split: false,

  /**
   * If the newly added id is a half id, id_start is the first id of the
   * corresponding full ids; if the newly added id is a full id, id_start is
   * that id.
   */
  id_star: 0,

  /**
   * If the newly added id is a half id, id_num is the number of corresponding
   * ids; if it is a full id, id_num == 1.
   */
  id_num: 0
};

// TODO combine mybsearchStr and mybsearchArray
var MyStdlib = {

  /**
   * Binary search of the key position.
   * @param {string} key The key to search.
   * @param {string} array The sorted char array to be searched.
   * @param {number} start The start position to search.
   * @param {number} count Number of items to search.
   * @param {number} size The size of the each item of the array.
   * @param {function(string, string): number} cmp The comparison function.
   * @return {number} The position of the key if found.
   * Othersize -1.i.
   */
  mybsearchStr:
      function myStdlib_binarySearchStr(key, array, start, count, size, cmp) {
    var doCompare = function compare(a, b) {
      if (cmp) {
        return cmp(a, b);
      } else {
        if (a < b) {
          return -1;
        } else if (a > b) {
          return 1;
        } else {
          return 0;
        }
      }
    };
    var item = function mybsearchStr_item(index) {
      var pos = start + index * size;
      var ret = array.substring(pos, pos + size);
      return ret;
    };
    var left = 0;
    var right = count - 1;
    if (doCompare(key, item(left)) == -1) {
      return -1;
    } else if (doCompare(key, item(right)) == 1) {
      return -1;
    }

    while (right > left) {
      var mid = Math.floor((left + right) / 2);
      var midKey = item(mid);
      if (doCompare(midKey, key) == -1) {
        left = mid + 1;
      } else if (doCompare(midKey, key) == 1) {
        right = mid - 1;
      } else {
        return start + mid * size;
      }
    }

    // left == right == mid
    var leftKey = item(left);
    if (doCompare(leftKey, key) == 0) {
      return start + left * size;
    } else {
      return -1;
    }
  },

  /**
   * Binary search of the key position.
   * @param {*} key The key to search.
   * @param {Array.<*>} array The sorted array to be searched.
   * @param {number} start The start position to search.
   * @param {number} count Number of items to search.
   * @param {function(string, string): number} cmp The comparison function.
   * @return {number} The position of the key if found.
   * Othersize -1.
   */
  mybsearchArray:
      function myStdlib_binarySearchArray(key, array, start, count, cmp) {
    var doCompare = function compare(a, b) {
      if (cmp) {
        return cmp(a, b);
      } else {
        if (a < b) {
          return -1;
        } else if (a > b) {
          return 1;
        } else {
          return 0;
        }
      }
    };
    var item = function mybsearchStr_item(index) {
      return array[index];
    };
    var left = 0;
    var right = count - 1;
    if (doCompare(key, item(left)) == -1) {
      return -1;
    } else if (doCompare(key, item(right)) == 1) {
      return -1;
    }

    while (right > left) {
      var mid = Math.floor((left + right) / 2);
      var midKey = item(mid);
      if (doCompare(midKey, key) == -1) {
        left = mid + 1;
      } else if (doCompare(midKey, key) == 1) {
        right = mid - 1;
      } else {
        return start + mid;
      }
    }

    // left == right == mid
    var leftKey = item(left);
    if (doCompare(leftKey, key) == 0) {
      return start + left;
    } else {
      return -1;
    }
  }
};

var MatrixSearch = function matrixSearch_constructor() {
  this.c_phrase_ = new MatrixSearch.ComposingPhrase();

  this.inited_ = false;
  this.spl_trie_ = SpellingTrie.get_instance();

  this.dmi_c_phrase_ = false;

  this.max_sps_len_ = DictDef.kMaxSearchSteps - 1;
  this.max_hzs_len_ = DictDef.kMaxSearchSteps;
};

/**
 * @private
 */
MatrixSearch.PRUMING_SCORE = 8000.0;

MatrixSearch.kMaxRowNum = DictDef.kMaxSearchSteps;
/**
 * If it is true, prediction list by string whose length is greater than 1
 * will be limited to a reasonable number.
 */
MatrixSearch.kPredictLimitGt1 = false;

/**
 * If it is true, the engine will prefer long history based prediction,
 * for example, when user inputs "BeiJing", we prefer "DaXue", etc., which are
 * based on the two-character history.
 */
MatrixSearch.kPreferLongHistoryPredict = true;

/**
 * If it is true, prediction will only be based on user dictionary. this flag
 * is for debug purpose.
 */
MatrixSearch.kOnlyUserDictPredict = false;

// The maximum buffer to store LmaPsbItems.
MatrixSearch.kMaxLmaPsbItems = 1450;

// How many rows for each step.
MatrixSearch.kMaxNodeARow = 5;

// The maximum length of the sentence candidates counted in chinese
// characters
MatrixSearch.kMaxSentenceLength = 16;

// The size of the matrix node pool.
MatrixSearch.kMtrxNdPoolSize = 200;

// The size of the DMI node pool.
MatrixSearch.kDmiPoolSize = 800;

// The maximum buffer to store the prediction items
MatrixSearch.MAX_PRE_ITEMS = 800;

MatrixSearch.DictMatchInfo = function dmi_constructor() {
  this.dict_handles = [0, 0];
};

MatrixSearch.DictMatchInfo.prototype = {
  /**
   * MileStoneHandle objects for the system and user dictionaries.
   * @type {Array.<number>}
   */
  dict_handles: null,

  /**
   * From which DMI node. -1 means it's from root.
   * @type {number}
   */
  dmi_fr: -1,

  /**
   * The spelling id for the Pinyin string from the previous DMI to this node.
   * If it is a half id like Shengmu, the node pointed by dict_node is the first
   * node with this Shengmu,
   * @type {number}
   */
  spl_id: 0,

  /**
   * What's the level of the dict node. Level of root is 0, but root is never
   * recorded by dict_node.
   */
  dict_level: 0,

  /**
   * If this node is for composing phrase, its value is true.
   * @type {boolean}
   */
  c_phrase: false,

  /**
   * Whether the spl_id is parsed with a split character at the end.
   * @type boolean
   */
  splid_end_split: false,

  /** What's the length of the spelling string for this match, for the whole
   * word.
   */
  splstr_len: 0,

  /**
   * Used to indicate whether all spelling ids from the root are full spelling
   * ids. This information is useful for keymapping mode(not finished). Because
   * in this mode, there is no clear boundaries, we prefer those results which
   * have full spelling ids.
   */
  all_full_id: false
};

MatrixSearch.MatrixNode = function matrixNode_constructor() {
};

MatrixSearch.MatrixNode.prototype = {
  id: 0,
  score: 0.0,
  /**
   * @type {MatrixSearch.MatrixNode}
   */
  from: null,

  /**
   * From which DMI node. Used to trace the spelling segmentation.
   */
  dmi_fr: 0,
  step: 0,

  /**
   * Copy content.
   * @param {MatrixSearch.MatrixNode} src The source object to be copied from.
   * @return {void}  No return value.
   */
  copy: function matrixNode_copy(src) {
    this.dmi_fr = src.dmi_fr;
    this.from = src.from;
    this.id = src.id;
    this.score = src.score;
    this.step = src.step;
  }
};

MatrixSearch.MatrixRow = function matrixRow_constructor() {
};

MatrixSearch.MatrixRow.prototype = {
  // The MatrixNode position in the matrix pool
  mtrx_nd_pos: 0,
  // The DictMatchInfo position in the DictMatchInfo pool.
  dmi_pos: 0,
  mtrx_nd_num: 0,
  dmi_num: 15,
  // Used to indicate whether there are dmi nodes in this step with full
  // spelling id. This information is used to decide whether a substring of a
  // valid Pinyin should be extended.
  //
  // Example1: shoudao
  // When the last char 'o' is added, the parser will find "dao" is a valid
  // Pinyin, and because all dmi nodes at location 'd' (including those for
  // "shoud", and those for "d") have Shengmu id only, so it is not necessary
  // to extend "ao", otherwise the result may be "shoud ao", that is not
  // reasonable.
  //
  // Example2: hengao
  // When the last 'o' is added, the parser finds "gao" is a valid Pinyin.
  // Because some dmi nodes at 'g' has Shengmu ids (hen'g and g), but some dmi
  // nodes at 'g' has full ids ('heng'), so it is necessary to extend "ao", thus
  // "heng ao" can also be the result.
  //
  // Similarly, "ganga" is expanded to "gang a".
  //
  // For Pinyin string "xian", because "xian" is a valid Pinyin, because all dmi
  // nodes at 'x' only have Shengmu ids, the parser will not try "x ian" (and it
  // is not valid either). If the parser uses break in the loop, the result
  // always be "xian"; but if the parser uses continue in the loop, "xi an" will
  // also be tried. This behaviour can be set via the function
  // set_xi_an_switch().
  dmi_has_full_id: false,

  /**
   * Points to a MatrixNode of the current step to indicate which choice the
   * user selects.
   * @type {MatrixSearch.MatrixNode}
   */
  //
  mtrx_nd_fixed: null
};

// When user inputs and selects candidates, the fixed lemma ids are stored in
// lma_id_ of class MatrixSearch, and fixed_lmas_ is used to indicate how many
// lemmas from the beginning are fixed. If user deletes Pinyin characters one
// by one from the end, these fixed lemmas can be unlocked one by one when
// necessary. Whenever user deletes a Chinese character and its spelling string
// in these fixed lemmas, all fixed lemmas will be merged together into a unit
// named ComposingPhrase with a lemma id kLemmaIdComposing, and this composing
// phrase will be the first lemma in the sentence. Because it contains some
// modified lemmas (by deleting a character), these merged lemmas are called
// sub lemmas (sublma), and each of them are represented individually, so that
// when user deletes Pinyin characters from the end, these sub lemmas can also
// be unlocked one by one.
MatrixSearch.ComposingPhrase = function composingPhrase_constructor() {
  this.spl_ids = [];
  this.spl_start = [];
  this.sublma_start = [];
  for (var pos = 0; pos < MatrixSearch.kMaxRowNum; pos++) {
    this.spl_ids[pos] = 0;
    this.spl_start[pos] = 0;
    this.sublma_start[pos] = 0;
  }
};

MatrixSearch.ComposingPhrase.prototype = {
  /**
   * The length of the array is MatrixSearch.kMaxRowNum.
   * @type {Array.<number>}
   */
  spl_ids: null,

  /**
   * The length of the array is MatrixSearch.kMaxRowNum.
   * @type {Array.<number>}
   */
  spl_start: null,

  /**
   * Simplified Chinese string array.
   * The length of the array is MatrixSearch.kMaxRowNum.
   * @type {string}
   */
  chn_str: '',

  /**
   * Traditional Chinese string array.
   * The length of the array is MatrixSearch.kMaxRowNum.
   * @type {string}
   */
  chn_str_tr: '',

  /**
   * Counted in Chinese characters.
   * The length of the array is MatrixSearch.kMaxRowNum.
   * @type {Array.<number>}
   */
  sublma_start: null,

  sublma_num: 0,

  /**
   * Counted in Chinese characters
   * @type {number}
   */
  length: 0
};

MatrixSearch.prototype = {
  /* ==== Public methods ==== */

  /**
   * Initialization.
   * @param {string} sysDict The filename of the system dictionary.
   * @param {string} userDict The filename of the user dictionary.
   * @param {function (boolean)} callback Callback function called when the
   *     operation is finished. The boolean parameter indicates whether the
   *     operation is successful.
   * @return {void}  No return value.
   */
  init: function matrixSearch_init(sysDict, userDict, callback) {
    var self = this;
    var isOk = false;
    var doCallback = function init_callback() {
      if (callback) {
        callback(isOk);
      }
    };
    this.alloc_resource();

    var taskQueue = new TaskQueue(
        function taskQueueOnCompleteCallback(queueData) {
      if (isOk) {
        self.user_dict_.set_total_lemma_count_of_others(NGram.
          kSysDictTotalFreq);
        self.inited_ = true;
      }
      doCallback();
    });

    var processNextWithDelay = function init_processNextWithDelay() {
      if (typeof setTimeout != 'undefined') {
        setTimeout(function nextTask() {
          taskQueue.processNext();
        }, 0);
      } else {
        taskQueue.processNext();
      }
    };

    taskQueue.push(function loadSysDict(taskQueue, taskData) {
      self.dict_trie_.load_dict(sysDict, 1, DictDef.kTopScoreLemmaNum,
          function loadSysDictCallback(success) {
        if (success) {
          processNextWithDelay();
        } else {
          doCallback();
          debug('MatrixSearch#init failed to load system dict.');
        }
      });
    });

    taskQueue.push(function loadUserDict(taskQueue, taskData) {
      self.user_dict_.load_dict(userDict, DictDef.kUserDictIdStart,
          DictDef.kUserDictIdEnd, function loadSysDictCallback(success) {
        if (success) {
          isOk = true;
          processNextWithDelay();
        } else {
          doCallback();
          debug('MatrixSearch#init failed to load user dict.');
        }
      });
    });

    taskQueue.processNext();
  },

  uninit: function matrixSearch_uinit(callback) {
    var self = this;
    var doCallback = function uninit_doCallback() {
      if (callback) {
        callback();
      }
    };
    this.flush_cache(function flushCallback() {
      self.free_resource();
      self.inited_ = false;
      doCallback();
    });
  },

  /**
   * Flush cached data to persistent memory. Because at runtime, in order to
   * achieve best performance, some data is only store in memory.
   */
  flush_cache: function matrixSearch_flush_cache(callback) {
    var doCallback = function flush_cash_doCallback() {
      if (callback) {
        callback();
      }
    };
    if (this.user_dict_ == null) {
      doCallback();
      return;
    }
    this.user_dict_.flush_cache(callback);
  },

  /**
   * Search a Pinyin string.
   *
   * @param {string} py The Pinyin string.
   * @return {number} The position successfully parsed.
   */
  search: function matrixSearch_search(py) {
    if (!this.inited_ || !py) {
      return 0;
    }

    var py_len = py.length;

    // If the search Pinyin string is too long, it will be truncated.
    if (py_len > MatrixSearch.kMaxRowNum - 1) {
      py = py.substring(0, MatrixSearch.kMaxRowNum - 1);
      py_len = MatrixSearch.kMaxRowNum - 1;
    }

    // Compare the new string with the previous one. Find their prefix to
    // increase search efficiency.
    var ch_pos = 0;
    var len = Math.min(this.pys_decoded_len_, py_len);
    for (ch_pos = 0; ch_pos < len; ch_pos++) {
      if (py.charAt(ch_pos) != this.pys_.charAt(ch_pos)) {
        break;
      }
    }

    var clear_fix = ch_pos != this.pys_decoded_len_;

    this.reset_searchn(ch_pos, clear_fix, false, false);

    this.pys_ = py;

    while (ch_pos < py_len) {
      if (!this.add_char(py.charAt(ch_pos))) {
        this.pys_decoded_len_ = ch_pos;
        break;
      }
      ch_pos++;
    }

    // Get spelling ids and starting positions.
    this.get_spl_start_id();

    // If there are too many spellings, remove the last letter until the
    // spelling number is acceptable.
    while (this.spl_id_num_ > 9) {
      py_len--;
      this.reset_searchn(py_len, false, false, false);
      this.pys_ = this.pys_.substring(0, py_len);
      this.get_spl_start_id();
    }

    this.prepare_candidates();
    return ch_pos;
  },

  /**
   * Used to delete something in the Pinyin string kept by the engine, and do
   * a re-search.
   *
   * @param {number} pos The posistion of char in spelling string to delete,
   * or the position of spelling id in result string to delete.
   * @param {boolean} is_pos_in_splid If is_pos_in_splid is false, pos is used
   * to indicate that pos-th Pinyin character needs to be deleted. And if the
   * pos-th character is in the range for the fixed lemmas or composing string,
   * this function will do nothing and just return the result of the previous
   * search. If is_pos_in_splid is true, all Pinyin characters for pos-th
   * spelling id needs to be deleted.
   * @param {boolean} clear_fixed If the deleted character(s) is just after a
   * fixed lemma or sub lemma in composing phrase, clear_fixed indicates
   * whether we needs to unlock the last fixed lemma or sub lemma.
   * @return {number} The new length of Pinyin string kept by the engine which
   * is parsed successfully.
   */
  delsearch: function matrixSearch_delsearch(pos, is_pos_in_splid, clear_fixed)
  {
    if (!this.inited_) {
      return 0;
    }

    var reset_pos = pos;

    // Out of range for both Pinyin mode and Spelling id mode.
    if (this.pys_decoded_len_ <= pos) {
      this.del_in_pys(pos, 1);

      reset_pos = this.pys_decoded_len_;
      // Decode the string after the un-decoded position
      while (!this.pys_.charAt(reset_pos)) {
        if (!this.add_char(this.pys_.charAt(reset_pos))) {
          this.pys_decoded_len_ = reset_pos;
          break;
        }
        reset_pos++;
      }
      this.get_spl_start_id();
      this.prepare_candidates();
      return this.pys_decoded_len_;
    }

    // Spelling id mode, but out of range.
    if (is_pos_in_splid && this.spl_id_num_ <= pos) {
      return this.pys_decoded_len_;
    }

    // Begin to handle two modes respectively.
    // Pinyin mode by default
    var c_py_len = 0;  // The length of composing phrase's Pinyin
    var del_py_len = 1;
    if (!is_pos_in_splid) {
      // Pinyin mode is only allowed to delete beyond the fixed lemmas.
      if (this.fixed_lmas_ > 0 && pos <
          this.spl_start_[this.lma_start_[this.fixed_lmas_]]) {
        return this.pys_decoded_len_;
      }

      this.del_in_pys(pos, 1);

      // If the deleted character is just the one after the last fixed lemma
      if (pos == this.spl_start_[this.lma_start_[this.fixed_lmas_]]) {
        // If all fixed lemmas have been merged, and the caller of the function
        // request to unlock the last fixed lemma.
        if (DictDef.kLemmaIdComposing == this.lma_id_[0] &&
            clear_fixed) {
          // Unlock the last sub lemma in the composing phrase. Because it
          // is not easy to unlock it directly. Instead, we re-decode the
          // modified composing phrase.
          this.c_phrase_.sublma_num--;
          this.c_phrase_.length = this.c_phrase_.sublma_start[this.c_phrase_.
              sublma_num];
          reset_pos = this.spl_start_[this.c_phrase_.length];
          c_py_len = reset_pos;
        }
      }
    } else {
      del_py_len = this.spl_start_[pos + 1] - this.spl_start_[pos];

      this.del_in_pys(this.spl_start_[pos], del_py_len);

      if (pos >= this.lma_start_[this.fixed_lmas_]) {
        c_py_len = 0;
        reset_pos = this.spl_start_[pos + 1] - del_py_len;
      } else {
        c_py_len = this.spl_start_[this.lma_start_[this.fixed_lmas_]] -
            del_py_len;
        reset_pos = c_py_len;
        if (c_py_len > 0) {
          this.merge_fixed_lmas(pos);
        }
      }
    }

    if (c_py_len > 0) {
      assert(this.c_phrase_.length > 0 && c_py_len ==
          this.c_phrase_.spl_start[this.c_phrase_.sublma_start[
          this.c_phrase_.sublma_num]]);
      // The composing phrase is valid, reset all search space,
      // and begin a new search which will only extend the composing
      // phrase.
      this.reset_search0();

      this.dmi_c_phrase_ = true;
      // Extend the composing phrase.
      var c_py_pos = 0;
      while (c_py_pos < c_py_len) {
        var b_ac_tmp = this.add_char(this.pys_.charAt(c_py_pos));
        assert(b_ac_tmp);
        c_py_pos++;
      }
      this.dmi_c_phrase_ = false;

      // Fixd the composing phrase as the first choice.
      this.lma_id_num_ = 1;
      this.fixed_lmas_ = 1;
      this.fixed_lmas_no1_[0] = 0;  // A composing string is always modified.
      this.fixed_hzs_ = this.c_phrase_.length;
      this.lma_start_[1] = this.fixed_hzs_;
      this.lma_id_[0] = DictDef.kLemmaIdComposing;
      this.matrix_[this.spl_start_[this.fixed_hzs_]].mtrx_nd_fixed =
          this.mtrx_nd_pool_[
          this.matrix_[this.spl_start_[this.fixed_hzs_]].mtrx_nd_pos];
    } else {
      // Reseting search only clear pys_decoded_len_, but the string is kept.
      this.reset_searchn(reset_pos, clear_fixed, false, false);
    }

    // Decode the string after the delete position.
    while (!this.pys_.charAt(reset_pos)) {
      if (!this.add_char(this.pys_.charAt(reset_pos))) {
        this.pys_decoded_len_ = reset_pos;
        break;
      }
      reset_pos++;
    }

    this.get_spl_start_id();
    this.prepare_candidates();
    return this.pys_decoded_len_;
  },

  /**
   * Reset the search space.
   * Equivalent to reset_search0.
   */
  reset_search: function matrixSearch_reset_search() {
    if (!this.inited_) {
      return false;
    }

    return this.reset_search0();
  },

  /**
   * Get the Pinyin string stored by the engine.
   * @return {{str: string, decoded_len: number}} str is the Pinyin string.
   *    decoded_len The length of the successfully decoded string.
   */
  get_pystr: function matrixSearch_get_pystr() {
    var ret = {str: '', decoded_len: 0};
    if (!this.inited_) {
      return ret;
    }

    ret.decoded_len = this.pys_decoded_len_;
    ret.str = this.pys_;
    return ret;
  },

  // Get the number of candiates, called after search().
  get_candidate_num: function matrixSearch_get_candidate_num() {
    if (!this.inited_ || 0 == this.pys_decoded_len_ ||
        0 == this.matrix_[this.pys_decoded_len_].mtrx_nd_num) {
      return 0;
    }

    return 1 + this.lpi_total_;
  },

  /**
   * Get a candidate(or choice) string. If full sentence candidate is
   * available, it will be the first one.
   *
   * @param {number} cand_id The candidate id. Started from 0.
   *    Usually, id 0 is a sentence-level candidate.
   * @return {[string, string]} The simplified and traditional Chinese
   *    candidates string if succeeds, otherwise empty strings.
   */
  get_candidate: function matrixSearch_get_candidate(cand_id) {
    var cand_strs = [];
    if (!this.inited_ || 0 == this.pys_decoded_len_) {
      return cand_strs;
    }

    if (0 == cand_id) {
      return this.get_candidate0(false);
    } else {
      cand_id--;
    }

    // For this case: the current sentence is a word only, and the user
    // fixed it, so the result will be fixed to the sentence space, and
    // lpi_total_ will be set to 0.
    if (0 == this.lpi_total_) {
      return this.get_candidate0(false);
    }

    var id = this.lpi_items_[cand_id].id;
    var len = this.lpi_items_[cand_id].lma_len;
    if (len > 1) {
      cand_strs = this.get_lemma_str(id);
    } else {
      // For a single character, Hanzi is ready.
      cand_strs[0] = this.lpi_items_[cand_id].hanzi;
      cand_strs[1] = this.lpi_items_[cand_id].hanzi_tr;
    }

    return cand_strs;
  },

  /**
   * Get the first candidate, which is a "full sentence".
   * @param {boolean} only_unfixed If only_unfixed is true, only unfixed part
   *    will be fetched.
   * @return {[string, string]} The simplified and traditional Chinese
   *    candidate strings.
   */
  get_candidate0: function matrixSearch_get_candidate0(only_unfixed) {
    var cand_strs = ['', ''];

    if (this.pys_decoded_len_ == 0 ||
        this.matrix_[this.pys_decoded_len_].mtrx_nd_num == 0) {
      return cand_strs;
    }

    var idxs = [];
    for (var pos = 0; pos < MatrixSearch.kMaxRowNum; pos++) {
      idxs[pos] = 0;
    }
    var id_num = 0;

    var mtrx_nd = this.mtrx_nd_pool_[this.matrix_[this.pys_decoded_len_].
        mtrx_nd_pos];

    debug('--- sentence score: ' + mtrx_nd.score);

    debug('==============Sentence DMI (reverse order) begin===========>>');

    while (mtrx_nd != null) {
      idxs[id_num] = mtrx_nd.id;
      id_num++;

      debug(StringUtils.format(
          '---MatrixNode [step: {0}, lma_idx: {1}, total score: {2}]',
          mtrx_nd.step, mtrx_nd.id, mtrx_nd.score));
      this.debug_print_dmi(mtrx_nd.dmi_fr, 1);

      mtrx_nd = mtrx_nd.from;
    }

    debug('<<==============Sentence DMI (reverse order) end=============');

    do {
      id_num--;
      if (0 == idxs[id_num]) {
        continue;
      }

      var strs = this.get_lemma_str(idxs[id_num]);
      cand_strs[0] += strs[0];
      cand_strs[1] += strs[1];
    } while (id_num != 0);

    if (only_unfixed) {
      cand_strs[0] = cand_strs[0].substring(this.fixed_hzs_);
      cand_strs[1] = cand_strs[1].substring(this.fixed_hzs_);
    }
    return cand_strs;
  },

  /**
   * Get the spelling boundaries for the first sentence candidate.
   * The number of valid elements is one more than the return value because the
   * last one is used to indicate the beginning of the next un-input spelling.
   * For a Pinyin "women", the returned array is [0, 2, 5].
   *
   * @return {Array.<number>} An array contains the starting position of
   *    all the spellings.
   */
  get_spl_start: function matrixSearch_get_spl_start() {
    this.get_spl_start_id();
    var spl_start = this.spl_start_.slice(0, this.spl_id_num_);
    return spl_start;
  },

  /**
   * Choose a candidate. The decoder will do a search after the fixed position.
   * @return {number} The candidates number of next step.
   * Choose a candidate, and give new candidates for next step.
   * If user finishes selection, we will try to communicate with user
   * dictionary to add new items or update score of some existing items.
   *
   * Basic rule:
   * 1. If user selects the first choice:
   *    1.1. If the first choice is not a sentence, instead, it is a lemma:
   *         1.1.1. If the first choice is a user lemma, notify the user
   *                dictionary that a user lemma is hit, and add occuring
   *                count by 1.
   *         1.1.2. If the first choice is a system lemma, do nothing.
   *    1.2. If the first choice is a sentence containing more than one lemma:
   *         1.2.1. The whole sentence will be added as a user lemma. If the
   *                sentence contains user lemmas, -> hit, and increase
   *                occuring count by 1.
   */
  choose: function matrixSearch_choose(cand_id) {
    if (!this.inited_ || 0 == this.pys_decoded_len_) {
      return 0;
    }

    var pos = 0;

    if (0 == cand_id) {
      this.fixed_hzs_ = this.spl_id_num_;
      this.matrix_[this.spl_start_[this.fixed_hzs_]].mtrx_nd_fixed =
          this.mtrx_nd_pool_[
          this.matrix_[this.spl_start_[this.fixed_hzs_]].mtrx_nd_pos];
      for (pos = this.fixed_lmas_; pos < this.lma_id_num_; pos++) {
        this.fixed_lmas_no1_[pos] = 1;
      }
      this.fixed_lmas_ = this.lma_id_num_;
      this.lpi_total_ = 0;  // Clean all other candidates.

      // 1. It is the first choice
      if (1 == this.lma_id_num_) {
        // 1.1. The first choice is not a sentence but a lemma
        if (SearchUtility.is_user_lemma(this.lma_id_[0])) {
          // 1.1.1. The first choice is a user lemma, notify the user dictionary
          // that it is hit.
          if (null != this.user_dict_) {
            this.user_dict_.update_lemma(this.lma_id_[0], 1, true);
          }
        } else {
          // 1.1.2. do thing for a system lemma.
        }
      } else {
        // 1.2. The first choice is a sentence.
        // 1.2.1 Try to add the whole sentence to user dictionary, the whole
        // sentence may be splitted into many items.
        if (null != this.user_dict_) {
          this.try_add_cand0_to_userdict();
        }
      }
      this.update_dict_freq();
      return 1;
    } else {
      cand_id--;
    }

    // 2. It is not the full sentence candidate.
    // Find the length of the candidate.
    var id_chosen = this.lpi_items_[cand_id].id;
    var score_chosen = this.lpi_items_[cand_id].psb;
    var cand_len = this.lpi_items_[cand_id].lma_len;

    assert(cand_len > 0);

    // Notify the atom dictionary that this item is hit.
    if (SearchUtility.is_user_lemma(id_chosen)) {
      if (null != this.user_dict_) {
        this.user_dict_.update_lemma(id_chosen, 1, true);
      }
      this.update_dict_freq();
    }

    // 3. Fixed the chosen item.
    // 3.1 Get the steps number.
    var step_fr = this.spl_start_[this.fixed_hzs_];
    var step_to = this.spl_start_[this.fixed_hzs_ + cand_len];

    // 3.2 Save the length of the original string.
    var pys_decoded_len = this.pys_decoded_len_;

    // 3.2 Reset the space of the fixed part.
    this.reset_searchn(step_to, false, false, true);

    // 3.3 For the last character of the fixed part, the previous DMI
    // information will be kept, while the MTRX information will be re-extended,
    // and only one node will be extended.
    this.matrix_[step_to].mtrx_nd_num = 0;

    var lpi_item = new SearchUtility.LmaPsbItem();
    lpi_item.psb = score_chosen;
    lpi_item.id = id_chosen;

    var step_to_dmi_fr = this.match_dmi(step_to, this.spl_id_,
        this.fixed_hzs_, cand_len);
    assert(step_to_dmi_fr != -1);

    this.extend_mtrx_nd(this.matrix_[step_fr].mtrx_nd_fixed, [lpi_item], 0, 1,
                   step_to_dmi_fr, step_to);

    this.matrix_[step_to].mtrx_nd_fixed = this.mtrx_nd_pool_[
        this.matrix_[step_to].mtrx_nd_pos];
    this.mtrx_nd_pool_used_ = this.matrix_[step_to].mtrx_nd_pos +
        this.matrix_[step_to].mtrx_nd_num;

    if (id_chosen == this.lma_id_[this.fixed_lmas_]) {
      this.fixed_lmas_no1_[this.fixed_lmas_] = 1;
    } else {
      this.fixed_lmas_no1_[this.fixed_lmas_] = 0;
    }
    this.lma_id_[this.fixed_lmas_] = id_chosen;
    this.lma_start_[this.fixed_lmas_ + 1] = this.lma_start_[this.fixed_lmas_] +
        cand_len;
    this.fixed_lmas_++;
    this.fixed_hzs_ = this.fixed_hzs_ + cand_len;

    while (step_to != pys_decoded_len) {
      var b = this.add_char(this.pys_.charAt(step_to));
      assert(b);
      step_to++;
    }

    if (this.fixed_hzs_ < this.spl_id_num_) {
      this.prepare_candidates();
    } else {
      this.lpi_total_ = 0;
      if (null != this.user_dict_) {
        this.try_add_cand0_to_userdict();
      }
    }

    return this.get_candidate_num();
  },

  /**
   * Get the length of fixed Chinese characters.
   */
  get_fixedlen: function matrixSearch_get_fixedlen() {
    if (!this.inited_ || 0 == this.pys_decoded_len_) {
      return 0;
    }
    return this.fixed_hzs_;
  },

  /**
   * Get prediction candiates based on the given fixed Chinese string as the
   * history.
   *
   * @param {string} fixed The fixed string to do the prediction.
   * @return {Array.<[string, string]>} The prediction result list.
   */
  get_predicts: function matrixSearch_get_predicts(fixed) {
    var fixed_len = fixed.length;
    if (0 == fixed_len || fixed_len > DictDef.kMaxPredictSize) {
      return 0;
    }
    var predict_buf = [];
    var buf_len = PinyinDecoderService.kMaxPredictNum;
    for (var pos = 0; pos < buf_len; pos++) {
      predict_buf[pos] = ['', ''];
    }
    var num = this.inner_predict(fixed, predict_buf, buf_len);
    predict_buf.length = num;
    return predict_buf;
  },

  /* ==== Private ==== */

  // Used to indicate whether this object has been initialized.
  inited_: false,

  /**
   * System dictionary
   * @type SpellingTrie
   */
  spl_trie_: null,

  /**
   * System dictionary.
   * @type DictTrie
   */
  dict_trie_: null,

  /**
   * User dictionary.
   * @type UserDict
   */
  user_dict_: null,

  /**
   * Spelling parser.
   * @type SpellingParser
   */
  spl_parser_: null,

  // The maximum allowed length of spelling string (such as a Pinyin string).
  max_sps_len_: 0,

  // The maximum allowed length of a result Chinese string.
  max_hzs_len_: 0,

  /**
   * Pinyin string.
   * Max length: MatrixSearch.kMaxRowNum - 1
   */
  pys_: '',

  // The length of the string that has been decoded successfully.
  pys_decoded_len_: 0,

  /**
   * The length of the buffer array is MatrixSearch.kMtrxNdPoolSize.
   * @type Array.<MatrixSearch.MatrixNode>
   */
  mtrx_nd_pool_: null,

  /**
   * How many nodes used in the pool
   */
  mtrx_nd_pool_used_: 0,

  /**
   * The length of the buffer array is MatrixSearch.kDmiPoolSize.
   * @type MatrixSearch.DictMatchInfo
   */
  dmi_pool_: null,

  /**
   * How many items used in the pool
   */
  dmi_pool_used_: 0,

  /**
   * The first row is for starting.
   *  The length of the buffer array is MatrixSearch.kMaxRowNum.
   * @type Array.<MatrixSearch.MatrixRow>
   */
  matrix_: null,

  /**
   * Parameter used to extend DMI nodes.
   * @type Array.<SearchUtility.DictExtPara>
   */
  dep_: null,

  /**
   * Used to do prediction.
   * The buffer length is MatrixSearch.MAX_PRE_ITEMS.
   * @type Array.<SearchUtility.NPredictItem>
   */
  npre_items_: null,

  npre_items_len_: 0,

  // The starting positions and lemma ids for the full sentence candidate.
  lma_id_num_: 0,

  /**
   * Counted in spelling ids.
   * The length of the array is MatrixSearch.kMaxRowNum.
   * @type {Array.<number>}
   */
  lma_start_: null,

  /**
   * The length of the array is MatrixSearch.kMaxRowNum.
   * @type {Array.<number>}
   */
  lma_id_: null,

  fixed_lmas_: 0,

  /**
   * If this.fixed_lmas_ is bigger than i,  Element i is used to indicate
   * whether the i'th lemma id in this.lma_id_ is the first candidate for that
   * step. If all candidates are the first one for that step, the whole string
   * can be decoded by the engine automatically, so no need to add it to user
   * dictionary. (We are considering to add it to user dictionary in the
   * future).
   * The length of the array is MatrixSearch.kMaxRowNum.
   * @type {Array.<number>}
   */
  fixed_lmas_no1_: null,

  /**
   * Composing phrase.
   * @type {MatrixSearch.ComposingPhrase}
   */
  c_phrase_: null,

  /**
   * If dmi_c_phrase_ is true, the decoder will try to match the
   * composing phrase (And definitely it will match successfully). If it
   * is false, the decoder will try to match lemmas items in dictionaries.
   */
  dmi_c_phrase_: true,

  // The starting positions and spelling ids for the first full sentence
  // candidate.

  /**
   * Number of spelling ids
   */
  spl_id_num_: 0,

  /**
   * Starting positions.
   * The length of the array is MatrixSearch.kMaxRowNum.
   * @type {Array.<number>}
   */
  spl_start_: null,

  /**
   * Spelling ids.
   * The length of the array is MatrixSearch.kMaxRowNum.
   * @type {Array.<number>}
   */
  spl_id_: null,

  // Used to remember the last fixed position, counted in Hanzi.
  fixed_hzs_: 0,

  /**
   * Lemma Items with possibility score, two purposes:
   * 1. In Viterbi decoding, this buffer is used to get all possible candidates
   * for current step;
   * 2. When the search is done, this buffer is used to get candiates from the
   * first un-fixed step and show them to the user.
   * The length of the array is MatrixSearch.kMaxLmaPsbItems.
   * @type Array.<SearchUtility.LmaPsbItem>
   */
  lpi_items_: null,

  lpi_total_: 0,

  /**
   * Alloc memory resource.
   * @private
   * @return {void}  No return value.
   */
  alloc_resource: function matrixSearch_alloc_resource() {
    this.dict_trie_ = new DictTrie();
    this.user_dict_ = new UserDict();
    this.spl_parser_ = new SpellingParser();

    var pos = 0;

    this.lma_start_ = [];
    this.lma_id_ = [];
    this.fixed_lmas_no1_ = [];
    this.spl_id_ = [];
    this.spl_start_ = [];
    this.sublma_start_ = [];
    for (pos = 0; pos < MatrixSearch.kMaxRowNum; pos++) {
      this.lma_start_[pos] = 0;
      this.lma_id_[pos] = 0;
      this.fixed_lmas_no1_[pos] = 0;
      this.spl_id_[pos] = 0;
      this.spl_start_[pos] = 0;
      this.sublma_start_[pos] = 0;
    }

    // lpi buffer
    this.lpi_items_ = [];
    for (pos = 0; pos < MatrixSearch.kMaxLmaPsbItems; pos++) {
      this.lpi_items_[pos] = new SearchUtility.LmaPsbItem();
    }

    // The buffers for search
    this.mtrx_nd_pool_ = [];
    for (pos = 0; pos < MatrixSearch.kMtrxNdPoolSize; pos++) {
      this.mtrx_nd_pool_[pos] = new MatrixSearch.MatrixNode();
    }
    this.dmi_pool_ = [];
    for (pos = 0; pos < MatrixSearch.kDmiPoolSize; pos++) {
      this.dmi_pool_[pos] = new MatrixSearch.DictMatchInfo();
    }
    this.matrix_ = [];
    for (pos = 0; pos < MatrixSearch.kMaxRowNum; pos++) {
      this.matrix_[pos] = new MatrixSearch.MatrixRow();
    }
    this.dep_ = new SearchUtility.DictExtPara();

    // The prediction buffer
    this.npre_items_ = [];
    for (pos = 0; pos < MatrixSearch.MAX_PRE_ITEMS; pos++) {
      this.npre_items_[pos] = new SearchUtility.NPredictItem();
    }
    this.npre_items_len_ = MatrixSearch.MAX_PRE_ITEMS;
  },

  /**
   * Free memory.
   * @private
   * @return {void}  No return value.
   */
  free_resource: function matrixSearch_free_resource() {
    this.dict_trie_ = null;
    this.user_dict_ = null;
    this.spl_parser_ = null;

    this.lma_start_ = null;
    this.lma_id_ = null;
    this.fixed_lmas_no1_ = null;
    this.spl_start_ = null;
    this.spl_id_ = null;

    this.mtrx_nd_pool_ = null;
    this.dmi_pool_ = null;
    this.matrix_ = null;
    this.dep_ = null;
    this.npre_items_ = null;
  },

  /**
   * Reset the search space totally.
   * @private
   */
  reset_search0: function matrixSearch_reset_search0() {
    if (!this.inited_) {
      return false;
    }
    this.pys_decoded_len_ = 0;
    this.mtrx_nd_pool_used_ = 0;
    this.dmi_pool_used_ = 0;

    // Get a MatrixNode from the pool
    this.matrix_[0].mtrx_nd_pos = this.mtrx_nd_pool_used_;
    this.matrix_[0].mtrx_nd_num = 1;
    this.mtrx_nd_pool_used_ += 1;

    // Update the node, and make it to be a starting node
    var node = this.mtrx_nd_pool_[this.matrix_[0].mtrx_nd_pos];
    node.id = 0;
    node.score = 0;
    node.from = null;
    node.step = 0;
    node.dmi_fr = -1;

    this.matrix_[0].dmi_pos = 0;
    this.matrix_[0].dmi_num = 0;
    this.matrix_[0].dmi_has_full_id = true;
    this.matrix_[0].mtrx_nd_fixed = node;

    this.lma_start_[0] = 0;
    this.fixed_lmas_ = 0;
    this.spl_start_[0] = 0;
    this.fixed_hzs_ = 0;

    this.dict_trie_.reset_milestones(0, 0);
    if (null != this.user_dict_) {
      this.user_dict_.reset_milestones(0, 0);
    }

    return true;
  },

  /**
   * Reset the search space from ch_pos step. For example, if the original
   * input Pinyin is "an", reset_searchn(1) will reset the search
   * space to the result of "a". If the given position is out of range,
   * return false.
   * @private
   * @param {boolean} clear_fixed If true, and the ch_pos step is a fixed
   * step, clear its fixed status.
   * @param {boolean} clear_dmi_this_step If true, clear the DMI nodes.
   * @param {boolean} clear_mtrx_this_step If true, clear the mtrx nodes
   *    of this step. Otherwise the DMI nodes will be kept.
   *
   * Note: this function should not destroy content of pys_.
   */
  reset_searchn: function matrixSearch_reset_searchn(ch_pos,
      clear_fixed_this_step, clear_dmi_this_step, clear_mtrx_this_step) {
    if (!this.inited_ || ch_pos > this.pys_decoded_len_ ||
        ch_pos >= MatrixSearch.kMaxRowNum) {
      return false;
    }

    if (0 == ch_pos) {
      this.reset_search0();
    } else {
      // Prepare mile stones of this step to clear.
      var dict_handles_to_clear = null;
      if (clear_dmi_this_step && this.matrix_[ch_pos].dmi_num > 0) {
        dict_handles_to_clear = this.dmi_pool_[this.matrix_[ch_pos].dmi_pos].
            dict_handles;
      }

      // If there are more steps, and this step is not allowed to clear, find
      // milestones of next step.
      if (this.pys_decoded_len_ > ch_pos && !clear_dmi_this_step) {
        dict_handles_to_clear = null;
        if (this.matrix_[ch_pos + 1].dmi_num > 0) {
          dict_handles_to_clear =
              this.dmi_pool_[this.matrix_[ch_pos + 1].dmi_pos].dict_handles;
        }
      }

      if (null != dict_handles_to_clear) {
        this.dict_trie_.reset_milestones(ch_pos, dict_handles_to_clear[0]);
        if (null != this.user_dict_) {
          this.user_dict_.reset_milestones(ch_pos, dict_handles_to_clear[1]);
        }
      }

      this.pys_decoded_len_ = ch_pos;

      if (clear_dmi_this_step) {
        this.dmi_pool_used_ = this.matrix_[ch_pos - 1].dmi_pos +
            this.matrix_[ch_pos - 1].dmi_num;
        this.matrix_[ch_pos].dmi_num = 0;
      } else {
        this.dmi_pool_used_ = this.matrix_[ch_pos].dmi_pos +
            this.matrix_[ch_pos].dmi_num;
      }

      if (clear_mtrx_this_step) {
        this.mtrx_nd_pool_used_ = this.matrix_[ch_pos - 1].mtrx_nd_pos +
            this.matrix_[ch_pos - 1].mtrx_nd_num;
        this.matrix_[ch_pos].mtrx_nd_num = 0;
      } else {
        this.mtrx_nd_pool_used_ = this.matrix_[ch_pos].mtrx_nd_pos +
            this.matrix_[ch_pos].mtrx_nd_num;
      }

      // Modify fixed_hzs_
      if (this.fixed_hzs_ > 0 &&
          ((DictDef.kLemmaIdComposing != this.lma_id_[0]) ||
           (DictDef.kLemmaIdComposing == this.lma_id_[0] &&
            this.spl_start_[this.c_phrase_.length] <= ch_pos))) {
        var fixed_ch_pos = ch_pos;
        if (clear_fixed_this_step) {
          fixed_ch_pos = fixed_ch_pos > 0 ? fixed_ch_pos - 1 : 0;
        }
        while (null == this.matrix_[fixed_ch_pos].mtrx_nd_fixed &&
            fixed_ch_pos > 0) {
          fixed_ch_pos--;
        }

        this.fixed_lmas_ = 0;
        this.fixed_hzs_ = 0;
        if (fixed_ch_pos > 0) {
          while (this.spl_start_[this.fixed_hzs_] < fixed_ch_pos) {
            this.fixed_hzs_++;
          }
          assert(this.spl_start_[this.fixed_hzs_] == fixed_ch_pos);

          while (this.lma_start_[this.fixed_lmas_] < this.fixed_hzs_) {
            this.fixed_lmas_++;
          }
          assert(this.lma_start_[this.fixed_lmas_] == this.fixed_hzs_);
        }

        // Re-search the Pinyin string for the unlocked lemma
        // which was previously fixed.
        //
        // Prepare mile stones of this step to clear.
        var dict_handles_to_clear = null;
        if (clear_dmi_this_step && ch_pos == fixed_ch_pos &&
            this.matrix_[fixed_ch_pos].dmi_num > 0) {
          dict_handles_to_clear = this.dmi_pool_[this.matrix_[fixed_ch_pos].
              dmi_pos].dict_handles;
        }

        // If there are more steps, and this step is not allowed to clear, find
        // milestones of next step.
        if (this.pys_decoded_len_ > fixed_ch_pos && !clear_dmi_this_step) {
          dict_handles_to_clear = null;
          if (this.matrix_[fixed_ch_pos + 1].dmi_num > 0) {
            dict_handles_to_clear =
                this.dmi_pool_[this.matrix_[fixed_ch_pos + 1].dmi_pos].
                dict_handles;
          }
        }

        if (null != dict_handles_to_clear) {
          this.dict_trie_.reset_milestones(fixed_ch_pos,
              dict_handles_to_clear[0]);
          if (null != this.user_dict_) {
            this.user_dict_.reset_milestones(fixed_ch_pos,
                dict_handles_to_clear[1]);
          }
        }

        this.pys_decoded_len_ = fixed_ch_pos;

        if (clear_dmi_this_step && ch_pos == fixed_ch_pos) {
          this.dmi_pool_used_ = this.matrix_[fixed_ch_pos - 1].dmi_pos +
              this.matrix_[fixed_ch_pos - 1].dmi_num;
          this.matrix_[fixed_ch_pos].dmi_num = 0;
        } else {
          this.dmi_pool_used_ = this.matrix_[fixed_ch_pos].dmi_pos +
              this.matrix_[fixed_ch_pos].dmi_num;
        }

        if (clear_mtrx_this_step && ch_pos == fixed_ch_pos) {
          this.mtrx_nd_pool_used_ = this.matrix_[fixed_ch_pos - 1].
              mtrx_nd_pos + this.matrix_[fixed_ch_pos - 1].mtrx_nd_num;
          this.matrix_[fixed_ch_pos].mtrx_nd_num = 0;
        } else {
          this.mtrx_nd_pool_used_ = this.matrix_[fixed_ch_pos].mtrx_nd_pos +
              this.matrix_[fixed_ch_pos].mtrx_nd_num;
        }

        for (var re_pos = fixed_ch_pos; re_pos < ch_pos; re_pos++) {
          this.add_char(this.pys_.charAt(re_pos));
        }
      } else if (this.fixed_hzs_ > 0 &&
          DictDef.kLemmaIdComposing == this.lma_id_[0]) {
        for (var subpos = 0; subpos < this.c_phrase_.sublma_num; subpos++) {
          var splpos_begin = this.c_phrase_.sublma_start[subpos];
          var splpos_end = this.c_phrase_.sublma_start[subpos + 1];
          for (var splpos = splpos_begin; splpos < splpos_end; splpos++) {
            // If ch_pos is in this spelling
            var spl_start = this.c_phrase_.spl_start[splpos];
            var spl_end = this.c_phrase_.spl_start[splpos + 1];
            if (ch_pos >= spl_start && ch_pos < spl_end) {
              // Clear everything after this position
              this.c_phrase_.chn_str = this.c_phrase_.chn_str.substring(0,
                  splpos);
              this.c_phrase_.chn_str_tr = this.c_phrase_.chn_str_tr.substring(0,
                  splpos);
              this.c_phrase_.sublma_start[subpos + 1] = splpos;
              this.c_phrase_.sublma_num = subpos + 1;
              this.c_phrase_.length = splpos;

              if (splpos == splpos_begin) {
                this.c_phrase_.sublma_num = subpos;
              }
            }
          }
        }

        // Extend the composing phrase.
        this.reset_search0();
        this.dmi_c_phrase_ = true;
        var c_py_pos = 0;
        while (c_py_pos < this.spl_start_[this.c_phrase_.length]) {
          var b_ac_tmp = this.add_char(this.pys_.charAt(py_pos));
          assert(b_ac_tmp);
          c_py_pos++;
        }
        this.dmi_c_phrase_ = false;

        this.lma_id_num_ = 1;
        this.fixed_lmas_ = 1;
        this.fixed_lmas_no1_[0] = 0;  // A composing string is always modified.
        this.fixed_hzs_ = this.c_phrase_.length;
        this.lma_start_[1] = this.fixed_hzs_;
        this.lma_id_[0] = DictDef.kLemmaIdComposing;
        this.matrix_[this.spl_start_[this.fixed_hzs_]].mtrx_nd_fixed =
            this.mtrx_nd_pool_[
            this.matrix_[this.spl_start_[this.fixed_hzs_]].mtrx_nd_pos];
      }
    }

    return true;
  },

  /**
   * Delete a part of the content in pys_.
   * @private
   */
  del_in_pys: function matrixSearch_del_in_pys(start, len) {
    this.pys_ = this.pys_.substring(0, start) +
        this.pys_.substring(start + len);
  },

  /**
   * Delete a spelling id and its corresponding Chinese character, and merge
   * the fixed lemmas into the composing phrase.
   * This function will update the lemma and spelling segmentation information.
   * The caller guarantees that fixed_lmas_ > 0 and del_spl_pos is within
   * the fixed lemmas.
   * @private
   * @param {number} del_spl_pos It indicates which spelling id needs to
   *    be delete.
   * @return {void} No return value.
   */
  merge_fixed_lmas: function matrixSearch_merge_fixed_lmas(del_spl_pos) {
    if (this.fixed_lmas_ == 0) {
      return;
    }

    var pos = 0;

    // Update spelling segmentation information first.
    this.spl_id_num_ -= 1;
    var del_py_len = this.spl_start_[del_spl_pos + 1] -
        this.spl_start_[del_spl_pos];
    for (pos = del_spl_pos; pos <= this.spl_id_num_; pos++) {
      this.spl_start_[pos] = this.spl_start_[pos + 1] - del_py_len;
      if (pos == this.spl_id_num_) {
        break;
      }
      this.spl_id_[pos] = this.spl_id_[pos + 1];
    }

    // Begin to merge.
    var phrase_len = 0;

    // Update the spelling ids to the composing phrase.
    // We need to convert these ids into full id in the future.
    this.c_phrase_.spl_ids = [];
    for (pos = 0; pos < this.spl_id_num_; pos++) {
      this.c_phrase_.spl_ids[pos] = this.spl_id_[pos];
    }
    this.c_phrase_.spl_star = [];
    for (pos = 0; pos < this.spl_id_num_ + 1; pos++) {
      this.c_phrase_.spl_start[pos] = this.spl_start_[pos];
    }

    // If composing phrase has not been created, first merge all fixed
    //  lemmas into a composing phrase without deletion.
    if (this.fixed_lmas_ > 1 || DictDef.kLemmaIdComposing != this.lma_id_[0]) {
      var bp = 1;  // Begin position of real fixed lemmas.
      // There is no existing composing phrase.
      if (DictDef.kLemmaIdComposing != this.lma_id_[0]) {
        this.c_phrase_.sublma_num = 0;
        bp = 0;
      }

      var sub_num = this.c_phrase_.sublma_num;
      for (var pos = bp; pos <= this.fixed_lmas_; pos++) {
        this.c_phrase_.sublma_start[sub_num + pos - bp] = this.lma_start_[pos];
        if (this.lma_start_[pos] > del_spl_pos) {
          this.c_phrase_.sublma_start[sub_num + pos - bp] -= 1;
        }

        if (pos == this.fixed_lmas_) {
          break;
        }

        var lma_len;
        var prefix = this.c_phrase_.chn_str.substring(this.c_phrase_.
            sublma_start[sub_num] + phrase_len);
        var prefix_tr = this.c_phrase_.chn_str_tr.substring(this.c_phrase_.
            sublma_start[sub_num] + phrase_len);

        var lma_strs = this.get_lemma_str(this.lma_id_[pos]);
        var lema_len = lma_strs[0].length;
        assert(lma_len == this.lma_start_[pos + 1] - this.lma_start_[pos]);
        this.c_phrase_.chn_str = prefix + lma_strs[0];
        this.c_phrase_.chn_str_tr = prefix_tr + lma_strs[1];
        phrase_len += lma_len;
      }
      assert(phrase_len == this.lma_start_[this.fixed_lmas_]);
      this.c_phrase_.length = phrase_len;  // will be deleted by 1
      this.c_phrase_.sublma_num += this.fixed_lmas_ - bp;
    } else {
      for (var pos = 0; pos <= this.c_phrase_.sublma_num; pos++) {
        if (this.c_phrase_.sublma_start[pos] > del_spl_pos) {
          this.c_phrase_.sublma_start[pos] -= 1;
        }
      }
      phrase_len = this.c_phrase_.length;
    }

    assert(phrase_len > 0);
    if (1 == phrase_len) {
      // After the only one is deleted, nothing will be left.
      this.fixed_lmas_ = 0;
      return;
    }

    // Delete the Chinese character in the merged phrase.
    // The corresponding elements in spl_ids and spl_start of the
    // phrase have been deleted.
    this.c_phrase_.chn_str = this.c_phrase_.chn_str.substring(0, del_spl_pos) +
        this.c_phrase_.chn_str.substring(del_spl_pos + 1);
    this.c_phrase_.chn_str_tr = this.c_phrase_.chn_str_tr.
        substring(0, del_spl_pos) + this.c_phrase_.chn_str_tr.substring(
        del_spl_pos + 1);
    this.c_phrase_.length -= 1;

    // If the deleted spelling id is in a sub lemma which contains more than
    // one id, del_a_sub will be false; but if the deleted id is in a sub lemma
    // which only contains 1 id, the whole sub lemma needs to be deleted, so
    // del_a_sub will be true.
    var del_a_sub = false;
    for (pos = 1; pos <= this.c_phrase_.sublma_num; pos++) {
      if (this.c_phrase_.sublma_start[pos - 1] ==
          this.c_phrase_.sublma_start[pos]) {
        del_a_sub = true;
      }
      if (del_a_sub) {
        this.c_phrase_.sublma_start[pos - 1] =
            this.c_phrase_.sublma_start[pos];
      }
    }
    if (del_a_sub) {
      this.c_phrase_.sublma_num -= 1;
    }
  },

  /**
   * Get spelling start positions and ids. The result will be stored in
   * spl_id_num_, spl_start_[], spl_id_[].
   * fixed_hzs_ will be also assigned.
   * @private
   */
  get_spl_start_id: function matrixSearch_get_spl_start_id() {
    this.lma_id_num_ = 0;
    this.lma_start_[0] = 0;

    this.spl_id_num_ = 0;
    this.spl_start_[0] = 0;
    if (!this.inited_ || 0 == this.pys_decoded_len_ ||
        0 == this.matrix_[this.pys_decoded_len_].mtrx_nd_num) {
      return;
    }

    // Calculate number of lemmas and spellings
    // Only scan the part which is not fixed.
    this.lma_id_num_ = this.fixed_lmas_;
    this.spl_id_num_ = this.fixed_hzs_;

    var mtrx_nd = this.mtrx_nd_pool_[this.matrix_[this.pys_decoded_len_].
        mtrx_nd_pos];
    while (mtrx_nd != this.mtrx_nd_pool_[0]) {
      if (this.fixed_hzs_ > 0) {
        if (mtrx_nd.step <= this.spl_start_[this.fixed_hzs_])
          break;
      }

      // Update the spelling segamentation information
      var word_splstr_len = 0;
      var dmi_fr = mtrx_nd.dmi_fr;
      if (-1 != dmi_fr) {
        word_splstr_len = this.dmi_pool_[dmi_fr].splstr_len;
      }

      while (-1 != dmi_fr) {
        this.spl_start_[this.spl_id_num_ + 1] = mtrx_nd.step -
            (word_splstr_len - this.dmi_pool_[dmi_fr].splstr_len);
        this.spl_id_[this.spl_id_num_] = this.dmi_pool_[dmi_fr].spl_id;
        this.spl_id_num_++;
        dmi_fr = this.dmi_pool_[dmi_fr].dmi_fr;
      }

      // Update the lemma segmentation information
      this.lma_start_[this.lma_id_num_ + 1] = this.spl_id_num_;
      this.lma_id_[this.lma_id_num_] = mtrx_nd.id;
      this.lma_id_num_++;

      mtrx_nd = mtrx_nd.from;
    }

    var pos;
    var end_pos;
    var pos1;
    var pos2;
    var tmp;

    // Reverse the result of spelling info
    end_pos = Math.floor(this.fixed_hzs_ + (this.spl_id_num_ - this.fixed_hzs_ +
        1) / 2);
    for (pos = this.fixed_hzs_; pos < end_pos; pos++) {
      if (this.spl_id_num_ + this.fixed_hzs_ - pos != pos + 1) {
        pos1 = pos + 1;
        pos2 = this.spl_id_num_ - pos + this.fixed_hzs_;
        tmp = this.spl_start_[pos1];
        this.spl_start_[pos1] = this.spl_start_[pos2];
        this.spl_start_[pos2] = tmp;

        pos1 = pos;
        pos2 = this.spl_id_num_ + this.fixed_hzs_ - pos - 1;
        tmp = this.spl_id_[pos1];
        this.spl_id_[pos1] = this.spl_id_[pos2];
        this.spl_id_[pos2] = tmp;
      }
    }

    // Reverse the result of lemma info
    end_pos = Math.floor(this.fixed_lmas_ + (this.lma_id_num_ -
        this.fixed_lmas_ + 1) / 2);
    for (pos = this.fixed_lmas_; pos < end_pos; pos++) {
      pos1 = pos + 1;
      pos2 = this.lma_id_num_ + this.fixed_lmas_ - pos;
      var tmp = 0;
      if (pos2 > pos1) {
        tmp = this.lma_start_[pos1];
        this.lma_start_[pos1] = this.lma_start_[pos2];
        this.lma_start_[pos2] = tmp;

        pos1 = pos;
        pos2 = this.lma_id_num_ - 1 - pos + this.fixed_lmas_;
        tmp = this.lma_id_[pos1];
        this.lma_id_[pos1] = this.lma_id_[pos2];
        this.lma_id_[pos2] = tmp;
      }
    }

    for (pos = this.fixed_lmas_ + 1; pos <= this.lma_id_num_; pos++) {
      if (pos < this.lma_id_num_) {
        this.lma_start_[pos] = this.lma_start_[pos - 1] +
            (this.lma_start_[pos] - this.lma_start_[pos + 1]);
      }
      else {
        this.lma_start_[pos] = this.lma_start_[pos - 1] +
            this.lma_start_[pos] - this.lma_start_[this.fixed_lmas_];
      }
    }

    // Find the last fixed position
    this.fixed_hzs_ = 0;
    for (pos = this.spl_id_num_; pos > 0; pos--) {
      if (null != this.matrix_[this.spl_start_[pos]].mtrx_nd_fixed) {
        this.fixed_hzs_ = pos;
        break;
      }
    }
  },


  /**
   * Get all lemma ids with match the given spelling id stream(shorter than the
   * maximum length of a word).
   * @private
   * @param {Array.<number>} splid_str The buffer of given spelling ids.
   * @param {number} splid_str_start The start position of the buffer.
   * @param {number} splid_str_len The length of the buffer.
   * @param {Array.<SearchUtility.LmaPsbItem>} lma_buf The lemma ids buffer.
   * @param {number} lma_buf_start The start position of lma_buf.
   * @param {number} max_lma_buf The length of lma_buf.
   * @param {string} pfullsent If pfullsent is not null, means the full
   *    sentence candidate may be the same with the coming lemma string,
   *    if so, remove that lemma.
   * @param {boolean} sort_by_psb If it is true, the result is sorted
   *    in descendant order by the frequency score.
   * @return {number} The number of lemma ids.
   */
  get_lpis: function matrixSearch_get_lpis(splid_str, splid_str_start,
      splid_str_len, lma_buf, lma_buf_start, max_lma_buf, pfullsent,
      sort_by_psb) {
    if (splid_str_len > DictDef.kMaxLemmaSize) {
      return 0;
    }

    var pos = 0;

    var splids = splid_str.slice(splid_str_start,
        splid_str_start + splid_str_len);
    var num1 = this.dict_trie_.get_lpis(splids, lma_buf, lma_buf_start,
        max_lma_buf);
    var num2 = 0;
    if (null != this.user_dict_) {
      num2 = this.user_dict_.get_lpis(splids, lma_buf, lma_buf_start + num1,
        max_lma_buf - num1);
    }

    var num = num1 + num2;

    if (0 == num) {
      return 0;
    }

    var remain_num = 0;

    // Remove repeated items.
    if (splid_str_len > 1) {
      var lpsis = [];
      for (pos = 0; pos < num; pos++) {
        lpsis[pos] = new SearchUtility.LmaPsbStrItem();
        var lma = lma_buf[lma_buf_start + pos];
        lpsis[pos].lpi.copy(lma);
        lpsis[pos].str = this.get_lemma_str(lma.id)[0];
      }

      lpsis.sort(SearchUtility.cmp_lpsi_with_str);

      remain_num = 0;
      for (pos = 0; pos < num; pos++) {
        if (pos > 0 && lpsis[pos].str == lpsis[pos - 1].str) {
          if (lpsis[pos].lpi.psb < lpsis[pos - 1].lpi.psb) {
            assert(remain_num > 0);
            lma_buf[lma_buf_start + remain_num - 1].copy(lpsis[pos].lpi);
          }
          continue;
        }
        if (pfullsent && lpsis[pos].str == pfullsent) {
          continue;
        }

        lma_buf[lma_buf_start + remain_num].copy(lpsis[pos].lpi);
        remain_num++;
      }

      // Update the result number
      num = remain_num;
    } else {
      // For single character, some characters have more than one spelling, for
      // example, "de" and "di" are all valid for a Chinese character, so when
      // the user input  "d", repeated items are generated.
      // For single character lemmas, Hanzis will be gotten
      for (pos = 0; pos < num; pos++) {
        var strs = this.get_lemma_str(lma_buf[lma_buf_start + pos].id);
        lma_buf[lma_buf_start + pos].hanzi = strs[0].charAt(0);
        lma_buf[lma_buf_start + pos].hanzi_tr = strs[1].charAt(0);
      }

      ArrayUtils.sort(lma_buf, lma_buf_start, num,
          SearchUtility.cmp_lpi_with_hanzi);

      for (pos = 0; pos < num; pos++) {
        if (pos > 0 && lma_buf[lma_buf_start + pos].hanzi ==
            lma_buf[lma_buf_start + pos - 1].hanzi) {
          if (pfullsent && lma_buf[lma_buf_start + pos].hanzi == pfullsent) {
            continue;
          }

          if (lma_buf[lma_buf_start + pos].psb <
              lma_buf[lma_buf_start + pos - 1].psb) {
            assert(remain_num > 0);
            assert(lma_buf[lma_buf_start + remain_num - 1].hanzi ==
                   lma_buf[lma_buf_start + pos].hanzi);
            lma_buf[lma_buf_start + remain_num - 1].copy(lma_buf[lma_buf_start +
                pos]);
          }
          continue;
        }
        if (pfullsent && lma_buf[lma_buf_start + pos].hanzi == pfullsent) {
            continue;
        }

        lma_buf[lma_buf_start + remain_num].copy(lma_buf[lma_buf_start + pos]);
        remain_num++;
      }
      num = remain_num;
    }

    if (sort_by_psb) {
      ArrayUtils.sort(lma_buf, lma_buf_start, num,
          SearchUtility.cmp_lpi_with_psb);
    }
    return num;
  },

  /**
   * Get lemma string by ID.
   * @private
   * @param {number} id_lemma Lemma ID.
   * @return {[string, string]} The simplified and traditional lemma string.
   */
  get_lemma_str: function matrixSearch_get_lemma_str(id_lemma) {
    var str_len = 0;
    var strs = ['', ''];

    if (SearchUtility.is_system_lemma(id_lemma)) {
      strs = this.dict_trie_.get_lemma_str(id_lemma);
    } else if (SearchUtility.is_user_lemma(id_lemma)) {
      if (null != this.user_dict_) {
        strs = this.user_dict_.get_lemma_str(id_lemma);
      }
    } else if (SearchUtility.is_composing_lemma(id_lemma)) {
      str_len = this.c_phrase_.sublma_start[this.c_phrase_.sublma_num];
      strs[0] = this.c_phrase_.chn_str.substring(0, str_len);
      strs[1] = this.c_phrase_.chn_str_tr.substring(0, str_len);
    }

    return strs;
  },

  /**
   * Get lemma spelling ID array.
   * @private
   * @param {number} id_lemma Lemma ID.
   * @param {Array.<number>} splids Buffer to save the result.
   * @param {number} start The start position of the buffer.
   * @param {number} splids_max The length of the buffer.
   * @return {number} The length of the spelling ID array.
   */
  get_lemma_splids: function matrixSearch_get_lemma_splids(id_lemma, splids,
      start, splids_max) {
    var splid_num = 0;

    for (splid_num = 0; splid_num < splids_max; splid_num++) {
      if (this.spl_trie_.is_half_id(splids[splid_num])) {
        break;
      }
    }
    if (splid_num == splids_max) {
      return splid_num;
    }

    if (SearchUtility.is_system_lemma(id_lemma)) {
      splid_num = this.dict_trie_.get_lemma_splids(id_lemma, splids, start,
          splids_max);
    } else if (SearchUtility.is_user_lemma(id_lemma)) {
      if (null != this.user_dict_) {
        splid_num = this.user_dict_.get_lemma_splids(id_lemma, splids, start,
            splids_max);
      } else {
        splid_num = 0;
      }
    } else if (SearchUtility.is_composing_lemma(id_lemma)) {
      if (this.c_phrase_.length > splids_max) {
        return 0;
      }
      for (var pos = 0; pos < this.c_phrase_.length; pos++) {
        splids[start + pos] = this.c_phrase_.spl_ids[pos];
        if (this.spl_trie_.is_half_id(splids[start + pos])) {
          return 0;
        }
      }
    }
    return splid_num;
  },

  /**
   * Extend a DMI node with a spelling id. ext_len is the length of the rows
   * to extend, actually, it is the size of the spelling string of splid.
   * return value can be 1 or 0.
   * 1 means a new DMI is filled in (dmi_pool_used_ is the next blank DMI in
   * the pool).
   * 0 means either the dmi node can not be extended with splid, or the splid
   * is a Shengmu id, which is only used to get lpi_items, or the result node
   * in DictTrie has no son, it is not nccessary to keep the new DMI.
   *
   * This function modifies the content of lpi_items_ and lpi_total_.
   * lpi_items_ is used to get the LmaPsbItem list, lpi_total_ returns the size.
   * The function's returned value has no relation with the value of lpi_num.
   *
   * If dmi_s_pos == -1, this function will extend the root node of DictTrie
   *
   * This function will not change dmi_nd_pool_used_. Please change it after
   * calling this function if necessary.
   *
   * The caller should guarantees that null != dep.
   * @private
   * @param {SearchUtility.DictExtPara} dep Paramaters used to extend the
   *    dictionary. It should not be null.
   * @param {MatrixSearch.DictMatchInfo} dmi_s The DMI node.
   * @param {number} dmi_s_pos The location of the DMI node.
   * @return {number} Number of new extended items.
   */
  extend_dmi: function matrixSearch_extend_dmi(dep, dmi_s, dmi_s_pos) {
    if (this.dmi_pool_used_ >= MatrixSearch.kDmiPoolSize) {
      return 0;
    }

    var r = null;

    if (this.dmi_c_phrase_) {
      return this.extend_dmi_c(dep, dmi_s, dmi_s_pos);
    }

    var lpi_cache = LpiCache.get_instance();
    var splid = dep.splids[dep.splids_extended];

    var cached = false;
    if (0 == dep.splids_extended) {
      cached = lpi_cache.is_cached(splid);
    }

    // 1. If this is a half Id, get its corresponding full starting Id and
    // number of full Id.
    var ret_val = 0;

    this.lpi_total_ = 0;

    var from_h = [0, 0, 0];

    if (0 != dep.splids_extended) {
      from_h[0] = dmi_s.dict_handles[0];
      from_h[1] = dmi_s.dict_handles[1];
    }

    // 2. Begin extending in the system dictionary
    var lpi_num = 0;
    var handles = [0, 0];
    if (from_h[0] > 0 || null == dmi_s) {
      r = this.dict_trie_.extend_dict(from_h[0], dep, this.lpi_items_,
          0, MatrixSearch.kMaxLmaPsbItems);
      handles[0] = r.handle;
      lpi_num = r.lpi_num;
    }
    if (handles[0] > 0) {
      this.lpi_total_ = lpi_num;
    }

    // 3. Begin extending in the user dictionary
    if (null != this.user_dict_ && (from_h[1] > 0 || null == dmi_s)) {
      r = this.user_dict_.extend_dict(from_h[1], dep,
         this.lpi_items_, this.lpi_total_, MatrixSearch.kMaxLmaPsbItems -
         this.lpi_total_);
      handles[1] = r.handle;
      lpi_num = r.lpi_num;
      if (handles[1] > 0) {
        for (var t = 0; t < lpi_num; t++) {
          debug(StringUtils.format('--Extend in user dict: uid:{0} uscore:{1}'),
              this.lpi_items_[this.lpi_total_ + t].id,
              this.lpi_items_[this.lpi_total_ + t].psb);
        }
        this.lpi_total_ += lpi_num;
      }
    }

    if (0 != handles[0] || 0 != handles[1]) {
      if (this.dmi_pool_used_ >= MatrixSearch.kDmiPoolSize) {
        return 0;
      }

      var dmi_add = this.dmi_pool_[this.dmi_pool_used_];
      if (null == dmi_s) {
        this.fill_dmi(dmi_add, handles,
                 -1, splid,
                 1, 1, dep.splid_end_split, dep.ext_len,
                 this.spl_trie_.is_half_id(splid) ? 0 : 1);
      } else {
        this.fill_dmi(dmi_add, handles,
                 dmi_s_pos, splid, 1,
                 dmi_s.dict_level + 1, dep.splid_end_split,
                 dmi_s.splstr_len + dep.ext_len,
                 this.spl_trie_.is_half_id(splid) ? 0 : dmi_s.all_full_id);
      }

      ret_val = 1;
    }

    if (!cached) {
      if (0 == this.lpi_total_) {
        return ret_val;
      }

      debug('--- lpi_total_ = ' + this.lpi_total_);

      ArrayUtils.sort(this.lpi_items_, 0, this.lpi_total_,
          SearchUtility.cmp_lpi_with_psb);
      if (null == dmi_s && this.spl_trie_.is_half_id(splid)) {
        this.lpi_total_ = lpi_cache.put_cache(splid, this.lpi_items_,
            this.lpi_total_);
      }
    } else {
      assert(this.spl_trie_.is_half_id(splid));
      this.lpi_total_ = lpi_cache.get_cache(splid, this.lpi_items_,
                                       MatrixSearch.kMaxLmaPsbItems);
    }

    return ret_val;
  },

  /**
   * Extend dmi for the composing phrase.
   * @private
   * @param {SearchUtility.DictExtPara} dep Paramaters used to extend the
   *    dictionary. It should not be null.
   * @param {MatrixSearch.DictMatchInfo} dmi_s The DMI node.
   * @param {number} dmi_s_pos The location of the DMI node.
   * @return {number} Number of new extended items.
   */
  extend_dmi_c: function matrixSearch_extend_dmi_c(dep, dmi_s, dmi_s_pos) {
    this.lpi_total_ = 0;

    var pos = dep.splids_extended;
    assert(this.dmi_c_phrase_);
    if (pos >= this.c_phrase_.length) {
      return 0;
    }

    var splid = dep.splids[pos];
    if (splid == this.c_phrase_.spl_ids[pos]) {
      var dmi_add = this.dmi_pool_[this.dmi_pool_used_];
      var handles = [0, 0]; // Actually never used.
      if (null == dmi_s) {
        this.fill_dmi(dmi_add, handles,
                 -1, splid,
                 1, 1, dep.splid_end_split, dep.ext_len,
                 this.spl_trie_.is_half_id(splid) ? 0 : 1);
      } else {
        this.fill_dmi(dmi_add, handles,
                 dmi_s_pos, splid, 1,
                 dmi_s.dict_level + 1, dep.splid_end_split,
                 dmi_s.splstr_len + dep.ext_len,
                 this.spl_trie_.is_half_id(splid) ? 0 : dmi_s.all_full_id);
      }

      if (pos == this.c_phrase_.length - 1) {
        this.lpi_items_[0].id = DictDef.kLemmaIdComposing;
        this.lpi_items_[0].psb = 0;  // 0 is bigger than normal lemma score.
        this.lpi_total_ = 1;
      }
      return 1;
    }
    return 0;
  },

  /**
   * Extend a MatrixNode with the given LmaPsbItem list.
   * This function does not change mtrx_nd_pool_used_. Please change it after
   * calling this function if necessary.
   * @private
   * @param {MatrixSearch.MatrixNode} mtrx_nd Node to be extended.
   * @param {Array.<SearchUtility.LmaPsbItem>} lpi_items LmaPsbItem list.
   * @param {number} start The start position of the list.
   * @param {number} lpi_num The length of the list.
   * @param {number} dmi_fr The position to extend from.
   * @param {number} res_row The destination row number.
   * @return {nubmer} Returns 0 always.
   */
  extend_mtrx_nd: function matrixSearch_extend_mtrx_nd(mtrx_nd, lpi_items,
      start, lpi_num, dmi_fr, res_row) {
    assert(null != mtrx_nd,
           'extend_mtrx_nd assertion error. Invalid parameter.');
    this.matrix_[res_row].mtrx_nd_fixed = null;

    if (this.mtrx_nd_pool_used_ >= MatrixSearch.kMtrxNdPoolSize -
        MatrixSearch.kMaxNodeARow) {
      return 0;
    }

    if (0 == mtrx_nd.step) {
      // Because the list is sorted, if the source step is 0, it is only
      // necessary to pick up the first kMaxNodeARow items.
      if (lpi_num > MatrixSearch.kMaxNodeARow) {
        lpi_num = MatrixSearch.kMaxNodeARow;
      }
    }

    var mtrx_nd_res_min_pos = this.matrix_[res_row].mtrx_nd_pos;
    var mtrx_nd_res_min = this.mtrx_nd_pool_[mtrx_nd_res_min_pos];
    for (var pos = 0; pos < lpi_num; pos++) {
      var score = mtrx_nd.score + lpi_items[start + pos].psb;
      if (pos > 0 && score - MatrixSearch.PRUMING_SCORE >
          mtrx_nd_res_min.score) {
        break;
      }

      // Try to add a new node
      var mtrx_nd_num = this.matrix_[res_row].mtrx_nd_num;
      var mtrx_nd_res_pos = mtrx_nd_res_min_pos + mtrx_nd_num;
      var replace = false;
      // Find its position
      while (mtrx_nd_res_pos > mtrx_nd_res_min_pos &&
             score < this.mtrx_nd_pool_[mtrx_nd_res_pos - 1].score) {
        if (mtrx_nd_res_pos - mtrx_nd_res_min_pos < MatrixSearch.kMaxNodeARow) {
          this.mtrx_nd_pool_[mtrx_nd_res_pos].copy(
              this.mtrx_nd_pool_[mtrx_nd_res_pos - 1]);
        }
        mtrx_nd_res_pos--;
        replace = true;
      }
      var mtrx_nd_res = this.mtrx_nd_pool_[mtrx_nd_res_pos];
      if (replace || (mtrx_nd_num < MatrixSearch.kMaxNodeARow &&
          this.matrix_[res_row].mtrx_nd_pos +
          mtrx_nd_num < MatrixSearch.kMtrxNdPoolSize)) {
        mtrx_nd_res.id = lpi_items[start + pos].id;
        mtrx_nd_res.score = score;
        mtrx_nd_res.from = mtrx_nd;
        mtrx_nd_res.dmi_fr = dmi_fr;
        mtrx_nd_res.step = res_row;
        if (this.matrix_[res_row].mtrx_nd_num < MatrixSearch.kMaxNodeARow) {
          this.matrix_[res_row].mtrx_nd_num++;
        }
      }
    }
    return this.matrix_[res_row].mtrx_nd_num;
  },

  /**
   * Try to find a dmi node at step_to position, and the found dmi node should
   * match the given spelling id strings.
   * @private
   * @param {number} step_to The step.
   * @param {Array.<number>} spl_ids Buffer of spelling id array.
   * @param {number} start The start position of the spelling id buffer.
   * @param {number} spl_id_num The lengthh of the spelling id buffer.
   * @return {number} The location of the dmi node if succeed. Otherwise -1.
   */
  match_dmi: function matrixSearch_match_dmi(step_to, spl_ids, start,
      spl_id_num) {
    if (this.pys_decoded_len_ < step_to ||
        0 == this.matrix_[step_to].dmi_num) {
      return -1;
    }

    for (var dmi_pos = 0; dmi_pos < this.matrix_[step_to].dmi_num; dmi_pos++) {
      var dmi = this.dmi_pool_[this.matrix_[step_to].dmi_pos + dmi_pos];

      if (dmi.dict_level != spl_id_num) {
        continue;
      }

      var matched = true;
      for (var spl_pos = 0; spl_pos < spl_id_num; spl_pos++) {
        if (spl_ids[start + spl_id_num - spl_pos - 1] != dmi.spl_id) {
          matched = false;
          break;
        }

        dmi = this.dmi_pool_[dmi.dmi_fr];
      }
      if (matched) {
        return this.matrix_[step_to].dmi_pos + dmi_pos;
      }
    }

    return -1;
  },

  /**
   * @private
   */
  add_char: function matrixSearch_add_char(ch) {
    if (!this.prepare_add_char(ch)) {
      return false;
    }
    return this.add_char_qwerty(ch);
  },

  /**
   * @private
   */
  prepare_add_char: function matrixSearch_prepare_add_char(ch) {
    if (this.pys_decoded_len_ >= MatrixSearch.kMaxRowNum - 1 ||
        (!this.spl_parser_.is_valid_to_parse(ch) && ch != '\'')) {
      return false;
    }

    if (this.dmi_pool_used_ >= MatrixSearch.kDmiPoolSize) {
      return false;
    }

    this.pys_ = this.pys_.substring(0, this.pys_decoded_len_) + ch +
        this.pys_.substring(this.pys_decoded_len_ + 1);
    this.pys_decoded_len_++;

    var mtrx_this_row = this.matrix_[this.pys_decoded_len_];
    mtrx_this_row.mtrx_nd_pos = this.mtrx_nd_pool_used_;
    mtrx_this_row.mtrx_nd_num = 0;
    mtrx_this_row.dmi_pos = this.dmi_pool_used_;
    mtrx_this_row.dmi_num = 0;
    mtrx_this_row.dmi_has_full_id = false;

    return true;
  },

  /**
   * Called after prepare_add_char, so the input char has been saved.
   * @private
   */
  add_char_qwerty: function matrixSearch_add_char_qwerty(ch) {
    this.matrix_[this.pys_decoded_len_].mtrx_nd_num = 0;

    var spl_matched = false;
    var longest_ext = 0;
    // Extend the search matrix, from the oldest unfixed row. ext_len means
    // extending length.
    var ext_len = this.pys_decoded_len_ - this.spl_start_[this.fixed_hzs_];
    ext_len = Math.min(ext_len, DictDef.kMaxPinyinSize + 1);
    for (; ext_len > 0; ext_len--) {
      // Refer to the declsaration of the variable dmi_has_full_id for the
      // explanation of this piece of code. In one word, it is used to prevent
      // from the unwise extending of "shoud ou" but allow the reasonable
      // extending of "heng ao", "lang a", etc.
      if (ext_len > 1 && 0 != longest_ext &&
          0 == this.matrix_[this.pys_decoded_len_ - ext_len].dmi_has_full_id) {
          continue;
      }

      var oldrow = this.pys_decoded_len_ - ext_len;

      // 0. If that row is before the last fixed step, ignore.
      if (this.spl_start_[this.fixed_hzs_] > oldrow) {
        continue;
      }

      // 1. Check if that old row has valid MatrixNode. If no, means that row
      // is not a boundary, either a word boundary or a spelling boundary.
      // If it is for extending composing phrase, it's OK to ignore the 0.
      if (0 == this.matrix_[oldrow].mtrx_nd_num && !this.dmi_c_phrase_) {
        continue;
      }

      // 2. Get spelling id(s) for the last ext_len chars.
      var get_splid_by_str_ret = this.spl_parser_.get_splid_by_str(
          this.pys_.substring(oldrow, oldrow + ext_len));
      var spl_idx = get_splid_by_str_ret.spl_id;
      var is_pre = get_splid_by_str_ret.is_pre;
      if (is_pre) {
        spl_matched = true;
      }
      if (0 == spl_idx) {
        continue;
      }

      var splid_end_split = this.is_split_at(oldrow + ext_len);

      // 3. Extend the DMI nodes of that old row
      // + 1 is to extend an extra node from the root
      var stop_pos = this.matrix_[oldrow].dmi_pos +
          this.matrix_[oldrow].dmi_num;
      for (var dmi_pos = this.matrix_[oldrow].dmi_pos; dmi_pos <= stop_pos;
           dmi_pos++) {
        var dmi = this.dmi_pool_[dmi_pos];
        if (dmi_pos == stop_pos) {
          dmi = null;  // The last one, null means extending from the root.
        } else {
          // If the dmi is covered by the fixed arrange, ignore it.
          if (this.fixed_hzs_ > 0 &&
              this.pys_decoded_len_ - ext_len - dmi.splstr_len <
              this.spl_start_[this.fixed_hzs_]) {
            continue;
          }
          // If it is not in mode for composing phrase, and the source DMI node
          // is marked for composing phrase, ignore this node.
          if (dmi.c_phrase != 0 && !this.dmi_c_phrase_) {
            continue;
          }
        }

        // For example, if "gao" is extended, "g ao" is not allowed.
        // or "zh" has been passed, "z h" is not allowed.
        // Both word and word-connection will be prevented.
        if (longest_ext > ext_len) {
          if (null == dmi && false == this.matrix_[oldrow].dmi_has_full_id) {
            continue;
          }

          // "z h" is not allowed.
          if (null != dmi && this.spl_trie_.is_half_id(dmi.spl_id)) {
            continue;
          }
        }

        this.dep_.splids_extended = 0;
        if (null != dmi) {
          var prev_ids_num = dmi.dict_level;
          if ((!this.dmi_c_phrase_ && prev_ids_num >= DictDef.kMaxLemmaSize) ||
              (this.dmi_c_phrase_ && prev_ids_num >= MatrixSearch.kMaxRowNum)) {
            continue;
          }

          var d = dmi;
          while (d != null) {
            this.dep_.splids[--prev_ids_num] = d.spl_id;
            if (-1 == d.dmi_fr) {
              break;
            }
            d = this.dmi_pool_[d.dmi_fr];
          }
          assert(0 == prev_ids_num, '0 != prev_ids_num');
          this.dep_.splids_extended = dmi.dict_level;
        }
        this.dep_.splids[this.dep_.splids_extended] = spl_idx;
        this.dep_.ext_len = ext_len;
        this.dep_.splid_end_split = splid_end_split;

        this.dep_.id_num = 1;
        this.dep_.id_start = spl_idx;
        if (this.spl_trie_.is_half_id(spl_idx)) {
          // Get the full id list
          var h2f_ret = this.spl_trie_.half_to_full(spl_idx);
          this.dep_.id_num = h2f_ret.num;
          this.dep_.id_start = h2f_ret.spl_id_start;
          assert(this.dep_.id_num > 0, 'this.dep_.id_num <= 0');
        }

        var new_dmi_num;

        new_dmi_num = this.extend_dmi(this.dep_, dmi, dmi_pos);

        if (new_dmi_num > 0) {
          if (this.dmi_c_phrase_) {
            this.dmi_pool_[this.dmi_pool_used_].c_phrase = true;
          }
          this.matrix_[this.pys_decoded_len_].dmi_num += new_dmi_num;
          this.dmi_pool_used_ += new_dmi_num;

          if (!this.spl_trie_.is_half_id(spl_idx)) {
            this.matrix_[this.pys_decoded_len_].dmi_has_full_id = true;
          }
        }

        // If get candiate lemmas, try to extend the path
        if (this.lpi_total_ > 0) {
          var fr_row;
          if (null == dmi) {
            fr_row = oldrow;
          } else {
            assert(oldrow >= dmi.splstr_len, StringUtils.format(
                'oldrow({0}) < dmi.splstr_len({1})', oldrow, dmi.splstr_len));
            fr_row = oldrow - dmi.splstr_len;
          }
          var end_pos = this.matrix_[fr_row].mtrx_nd_pos +
               this.matrix_[fr_row].mtrx_nd_num;
          for (var mtrx_nd_pos = this.matrix_[fr_row].mtrx_nd_pos;
               mtrx_nd_pos < end_pos;
               mtrx_nd_pos++) {
            var mtrx_nd = this.mtrx_nd_pool_[mtrx_nd_pos];
            this.extend_mtrx_nd(mtrx_nd, this.lpi_items_, 0, this.lpi_total_,
                this.dmi_pool_used_ - new_dmi_num, this.pys_decoded_len_);
            if (longest_ext == 0) {
              longest_ext = ext_len;
            }
          }
        }
      }  // for dmi_pos */
    }  // for ext_len
    this.mtrx_nd_pool_used_ += this.matrix_[this.pys_decoded_len_].mtrx_nd_num;

    if (this.dmi_c_phrase_) {
      return true;
    }

    return (this.matrix_[this.pys_decoded_len_].mtrx_nd_num != 0 ||
        spl_matched);
  },

  /**
   * Prepare candidates from the last fixed hanzi position.
   * @private
   */
  prepare_candidates: function matrixSearch_prepare_candidates() {
    // Get candiates from the first un-fixed step.
    var lma_size_max = DictDef.kMaxLemmaSize;
    if (lma_size_max > this.spl_id_num_ - this.fixed_hzs_) {
      lma_size_max = this.spl_id_num_ - this.fixed_hzs_;
    }

    var lma_size = lma_size_max;

    // If the full sentense candidate's unfixed part may be the same with a
    // normal lemma. Remove the lemma candidate in this case.
    var pfullsent = this.get_candidate0(true)[0];
    var sent_len = pfullsent.length;

    // If the unfixed part contains more than one ids, it is not necessary to
    // check whether a lemma's string is the same to the unfixed part of the
    // full sentence candidate, so, set it to emplty string;
    if (sent_len > DictDef.kMaxLemmaSize) {
      pfullsent = '';
    }

    this.lpi_total_ = 0;
    this.lpi_items_ = [];
    for (var pos = 0; pos < MatrixSearch.kMaxLmaPsbItems; pos++) {
      this.lpi_items_[pos] = new SearchUtility.LmaPsbItem();
    }
    var lpi_num_full_match = 0;  // Number of items which are fully-matched.
    while (lma_size > 0) {
      var lma_num;
      lma_num = this.get_lpis(this.spl_id_, this.fixed_hzs_, lma_size,
                         this.lpi_items_, this.lpi_total_,
                         MatrixSearch.kMaxLmaPsbItems - this.lpi_total_,
                         pfullsent, lma_size == lma_size_max);

      if (lma_num > 0) {
        this.lpi_total_ += lma_num;
        // For next lemma candidates which are not the longest, it is not
        // necessary to compare with the full sentence candiate.
        pfullsent = '';
      }
      if (lma_size == lma_size_max) {
        lpi_num_full_match = this.lpi_total_;
      }
      lma_size--;
    }

    // Sort those partially-matched items by their unified scores.
    ArrayUtils.sort(this.lpi_items_, lpi_num_full_match, this.lpi_total_ -
        lpi_num_full_match, SearchUtility.cmp_lpi_with_unified_psb);
    debug('-----Prepare candidates, score:');
    var line = '';
    for (var a = 0; a < this.lpi_total_; a++) {
      line += StringUtils.format('[{0}]{1}{2}    ', a,
          this.get_lemma_str(this.lpi_items_[a].id), this.lpi_items_[a].psb);
      if ((a + 1) % 6 == 0) {
        debug(line);
        line = '';
      }
    }
    debug('--- lpi_total_ = ' + this.lpi_total_);
  },

  /**
   * Is the character in step pos a splitter character?
   * The caller guarantees that the position is valid.
   * @private
   */
  is_split_at: function matrixSearch_is_split_at(pos) {
    return !this.spl_parser_.is_valid_to_parse(this.pys_[pos - 1]);
  },

  /**
   * TODO This method should belong to DictMatchInfo itself
   * Fill a dmi object.
   * @private
   * @param {MatrixSearch.DictMatchInfo} dmi The dmi object.
   * @return {void} No return value.
   */
  fill_dmi: function matrixSearch_fill_dmi(dmi, handles, dmi_fr, spl_id,
      node_num, dict_level, splid_end_split, splstr_len, all_full_id) {
    dmi.dict_handles[0] = handles[0];
    dmi.dict_handles[1] = handles[1];
    dmi.dmi_fr = dmi_fr;
    dmi.spl_id = spl_id;
    dmi.dict_level = dict_level;
    dmi.splid_end_split = splid_end_split;
    dmi.splstr_len = splstr_len;
    dmi.all_full_id = all_full_id;
    dmi.c_phrase = false;
  },

  /**
   * @private
   * @param {string} fixed_buf Words used to make prediction.
   * @param {Array.<[string, string]>} predict_buf Buffer saving the result.
   * @param {number} start The start position of the buffer.
   * @param {number} buf_len The length of the buffer.
   * @return {number} Number of new added prediction items.
   */
  inner_predict: function matrixSearch_inner_predict(fixed_buf,
      predict_buf, buf_len) {
    var i = 0;
    var fixed_len = fixed_buf.length;
    var res_total = 0;
    for (i = 0; i < this.npre_items_len_; i++) {
      this.npre_items_[i] = new SearchUtility.NPredictItem();
    }
    // In order to shorten the comments, j-character candidates predicted by
    // i-character prefix are called P(i,j). All candiates predicted by
    // i-character prefix are called P(i,*)
    // Step 1. Get P(kMaxPredictSize, *) and sort them, here
    // P(kMaxPredictSize, *) == P(kMaxPredictSize, 1)
    for (var len = fixed_len; len > 0; len--) {
      // How many blank items are available
      var this_max = this.npre_items_len_ - this.res_total;
      var res_this;
      // If the history is longer than 1, and we can not get prediction from
      // lemmas longer than 2, in this case, we will add lemmas with
      // highest scores as the prediction result.
      if (fixed_len > 1 && 1 == len && 0 == res_total) {
        // Try to find if recent n (n>1) characters can be a valid lemma in
        // system dictionary.
        var nearest_n_word = false;
        for (var nlen = 2; nlen <= fixed_len; nlen++) {
          if (this.dict_trie_.get_lemma_id(fixed_buf.substring(
              fixed_len - nlen)) > 0) {
            nearest_n_word = true;
            break;
          }
        }
        res_this = this.dict_trie_.predict_top_lmas(nearest_n_word ? len : 0,
                                                this.npre_items_, res_total,
                                                this_max, res_total);
        res_total += res_this;
      }

      // How many blank items are available
      this_max = this.npre_items_len_ - res_total;
      res_this = 0;
      if (!MatrixSearch.kOnlyUserDictPredict) {
        res_this =
            this.dict_trie_.predict(fixed_buf.substring(fixed_len - len),
                                this.npre_items_, res_total, this_max,
                                res_total);
      }

      if (null != this.user_dict_) {
        res_this = res_this +
            this.user_dict_.predict(fixed_buf.substring(fixed_len - len),
            this.npre_items_, res_total + res_this,
            this_max - res_this, res_total + res_this);
      }

      if (MatrixSearch.kPredictLimitGt1) {
        ArrayUtils.sort(this.npre_items_, res_total, res_this,
            SearchUtility.cmp_npre_by_score);

        if (len > 3) {
          if (res_this > MatrixSearch.kMaxPredictNumByGt3) {
            res_this = MatrixSearch.kMaxPredictNumByGt3;
          }
        } else if (3 == len) {
          if (res_this > MatrixSearch.kMaxPredictNumBy3) {
            res_this = MatrixSearch.kMaxPredictNumBy3;
          }
        } else if (2 == len) {
          if (res_this > MatrixSearch.kMaxPredictNumBy2) {
            res_this = MatrixSearch.kMaxPredictNumBy2;
          }
        }
      }

      res_total += res_this;
    }

    res_total = SearchUtility.remove_duplicate_npre(this.npre_items_,
        res_total);

    var cmp = null;
    if (MatrixSearch.kPreferLongHistoryPredict) {
      cmp = SearchUtility.cmp_npre_by_hislen_score;
    } else {
      cmp = SearchUtility.cmp_npre_by_score;
    }
    ArrayUtils.sort(this.npre_items_, 0, res_total, cmp);

    if (buf_len < res_total) {
      res_total = buf_len;
    }

    debug('/////////////////Predicted Items Begin////////////////////>>');
    for (i = 0; i < res_total; i++) {
      debug(this.npre_items_[i].pre_hzs + '(' +
          this.npre_items_[i].pre_hzs_tr + ')');
    }
    debug('<<///////////////Predicted Items End////////////////////////');

    for (i = 0; i < res_total; i++) {
      predict_buf[i] = [this.npre_items_[i].pre_hzs,
                        this.npre_items_[i].pre_hzs_tr];
    }

    return res_total;
  },

  /**
   * Add the first candidate to the user dictionary.
   * @private
   * @return {boolean} true if succeed.
   */
  try_add_cand0_to_userdict: function matrixSearch_try_add_cand0_to_userdict() {
    var new_cand_num = this.get_candidate_num();
    if (this.fixed_hzs_ > 0 && 1 == new_cand_num) {
      var score_from = 0;
      var lma_id_from = 0;
      var pos = 0;
      var modified = false;
      while (pos < this.fixed_lmas_) {
        if (this.lma_start_[pos + 1] - this.lma_start_[lma_id_from] >
            DictDef.kMaxLemmaSize) {
          var score_to_add =
              this.mtrx_nd_pool_[this.matrix_[this.spl_start_[
              this.lma_start_[pos]]].mtrx_nd_pos].score - score_from;
          if (modified) {
            score_to_add += 1.0;
            if (score_to_add > NGram.kMaxScore) {
              score_to_add = NGram.kMaxScore;
            }
            this.add_lma_to_userdict(lma_id_from, pos, score_to_add);
          }
          lma_id_from = pos;
          score_from += score_to_add;

          // Clear the flag for next user lemma.
          modified = false;
        }

        if (0 == this.fixed_lmas_no1_[pos]) {
          modified = true;
        }
        pos++;
      }

      // Single-char word is not allowed to add to userdict.
      if (this.lma_start_[pos] - this.lma_start_[lma_id_from] > 1) {
        var score_to_add = this.mtrx_nd_pool_[this.matrix_[this.spl_start_[
            this.lma_start_[pos]]] .mtrx_nd_pos].score - score_from;
        if (modified) {
          score_to_add += 1.0;
          if (score_to_add > NGram.kMaxScore) {
            score_to_add = NGram.kMaxScore;
          }
          this.add_lma_to_userdict(lma_id_from, pos, score_to_add);
        }
      }
    }
    return true;
  },

  /**
   * Add a user lemma to the user dictionary. This lemma is a subset of
   * candidate 0. lma_from is from which lemma in lma_ids_, lma_num is the
   * number of lemmas to be combined together as a new lemma. The caller
   * gurantees that the combined new lemma's length is less or equal to
   * DictDef.kMaxLemmaSize.
   * @private
   * @return {boolean} true if succeed.
   */
  add_lma_to_userdict: function matrixSearch_add_lma_to_userdict(lma_fr,
      lma_to, score) {
    if (lma_to - lma_fr <= 1 || null == this.user_dict_) {
      return false;
    }

    var word_str = '';
    var word_str_tr = '';
    var spl_ids = [];

    var spl_id_fr = 0;

    for (var pos = lma_fr; pos < lma_to; pos++) {
      var lma_id = this.lma_id_[pos];
      if (SearchUtility.is_user_lemma(lma_id)) {
        this.user_dict_.update_lemma(lma_id, 1, true);
      }
      var lma_len = this.lma_start_[pos + 1] - this.lma_start_[pos];
      for (var i = 0; i < lma_len; i++) {
        spl_ids[spl_id_fr + i] = this.spl_id_[this.lma_start_[pos] + i];
      }

      var strs = this.get_lemma_str(lma_id);
      word_str += strs[0];
      word_str_tr += strs[1];
      assert(strs[0].length == lma_len);

      var tmp = this.get_lemma_splids(lma_id, spl_ids, spl_id_fr, lma_len);
      if (tmp != lma_len) {
        return false;
      }

      spl_id_fr += lma_len;
    }

    assert(spl_id_fr <= DictDef.kMaxLemmaSize);

    return this.user_dict_.put_lemma(word_str, word_str_tr, spl_ids,
        spl_id_fr, 1);
  },

  /**
   * Update dictionary frequencies.
   * @private
   * @return {void} No return value.
   */
  update_dict_freq: function matrixSearch_update_dict_freq() {
    if (null != this.user_dict_) {
      // Update the total frequency of all lemmas, including system lemmas and
      // user dictionary lemmas.
      var total_freq = this.user_dict_.get_total_lemma_count();
      this.dict_trie_.set_total_lemma_count_of_others(total_freq);
    }
  },

  /**
   * @private
   * @return {void} No return value.
   */
  debug_print_dmi: function matrixSearch_debug_print_dmi(dmi_pos, nest_level) {
    if (dmi_pos == -1 || dmi_pos >= this.dmi_pool_used_) {
      return;
    }

    var dmi = this.dmi_pool_[dmi_pos];

    if (1 == nest_level) {
      debug(StringUtils.format(
          '-----------------{0}\'th DMI node begin----------->', dmi_pos));
    }
    if (dmi.dict_level > 1) {
      this.debug_print_dmi(dmi.dmi_fr, nest_level + 1);
    }
    debug('---' + dmi.dict_level);
    debug(StringUtils.format(' MileStone: {0}, {1}',
        dmi.dict_handles[0].toString(16), dmi.dict_handles[1].toString(16)));
    debug(StringUtils.format(' Spelling : {0}, {1}',
        SpellingTrie.get_instance().get_spelling_str(dmi.spl_id), dmi.spl_id));
    debug(' Total Pinyin Len: ' + dmi.splstr_len);
    if (1 == nest_level) {
      debug(StringUtils.format(
          '<----------------{0}\'th DMI node end--------------\n', dmi_pos));
    }
  },

  debug_print_mtrx_nd_pool: function matrixSearch_debug_print_mtrx_nd_pool() {
    for (var i = 0; i < this.mtrx_nd_pool_used_; i++)
    {
      var mtrx_nd = this.mtrx_nd_pool_[i];
      debug(StringUtils.format('{id:{0},score:{1},step:{2},dmi_fr:{3}}',
          mtrx_nd.id, mtrx_nd.score, mtrx_nd.step, mtrx_nd.dmi_fr));
    }
  }
};


// The number of half spelling ids. For Chinese Pinyin, there 30 half ids.
// See SpellingTrie.h for details.
var kHalfSpellingIdNum = 29;

/**
 * This interface defines the essential metods for all atom dictionaries.
 * Atom dictionaries are managed by the decoder class MatrixSearch.
 *
 * When the user appends a new character to the Pinyin string, all enabled atom
 * dictionaries' extend_dict() will be called at least once to get candidates
 * ended in this step (the information of starting step is also given in the
 * parameter). Usually, when extend_dict() is called, a MileStoneHandle object
 * returned by a previous calling for a earlier step is given to speed up the
 * look-up process, and a new MileStoneHandle object will be returned if
 * the extension is successful.
 *
 * A returned MileStoneHandle object should keep alive until Function
 * reset_milestones() is called and this object is noticed to be reset.
 *
 * Usually, the atom dictionary can use step information to manage its
 * MileStoneHandle objects, or it can make the objects in ascendant order to
 * make the reset easier.
 *
 * When the decoder loads the dictionary, it will give a starting lemma id for
 * this atom dictionary to map a inner id to a global id. Global ids should be
 * used when an atom dictionary talks to any component outside.
 */
var IAtomDictBase = {
  /**
   * Load an atom dictionary from a file.
   *
   * @param {string} file_name The file name to load dictionary.
   * @param {number} start_id The starting id used for this atom dictionary.
   * @param {number} end_id The end id (included) which can be used for this
   * atom dictionary. User dictionary will always use the last id space, so it
   * can ignore this paramter. All other atom dictionaries should check this
   * parameter.
   * @param {DictTrie} dict_trie The DictTrie to be built.
   * @param {function(boolean)} callback The function object that is
   *    called when the operation is finished. The boolean parameter indicates
   *    whether the operation is successful.
   * @return {void} No return value.
   */
  load_dict: function atomDictBase_load(file_name, start_id, end_id, callback) {
  },

  /**
   * Close this atom dictionary.
   *
   * @param {function(boolean)} callback The function object that is
   *    called when the operation is finished. The boolean parameter indicates
   *    whether the operation is successful.
   * @return {void} No return value.
   */
  close_dict: function atomDictBase_close_dict(callback) {},

  /**
   * Get the total number of lemmas in this atom dictionary.
   *
   * @return {number} The total number of lemmas.
   */
  number_of_lemmas: function atomDictBase_number_of_lemmas() {},

  /**
   * This function is called by the decoder when user deletes a character from
   * the input string, or begins a new input string.
   *
   * Different atom dictionaries may implement this function in different way.
   * an atom dictionary can use one of these two parameters (or both) to reset
   * its corresponding MileStoneHandle objects according its detailed
   * implementation.
   *
   * For example, if an atom dictionary uses step information to manage its
   * MileStoneHandle objects, parameter fromStep can be used to identify which
   * objects should be reset; otherwise, if another atom dictionary does not
   * use the detailed step information, it only uses ascendant handles
   * (according to step. For the same step, earlier call, smaller handle), it
   * can easily reset those MileStoneHandle which are larger than fromHandle.
   *
   * The decoder always reset the decoding state by step. So when it begins
   * resetting, it will call reset_milestones() of its atom dictionaries with
   * the step information, and the MileStoneHandle objects returned by the
   * earliest calling of extend_dict() for that step.
   *
   * If an atom dictionary does not implement incremental search, this function
   * can be totally ignored.
   *
   * @param {number} from_step From which step(included) the MileStoneHandle
   *    objects should be reset.
   * @param {number} from_handle The ealiest MileStoneHandle object for step
   *    from_step.
   */
  reset_milestones:
      function atomDictBase_reset_milestones(from_step, from_handle) {},

  /**
   * Used to extend in this dictionary. The handle returned should keep valid
   * until reset_milestones() is called.
   *
   * @param {number} from_handle Its previous returned extended handle without
   * the new spelling id, it can be used to speed up the extending.
   * @param {SearchUtility.DictExtPara} dep The paramter used for extending.
   * @param {Array.<SearchUtility.LmaPsbItem>} lpi_items Used to fill in the
   *    lemmas matched.
   * @param {number} start The start position of lpi_items.
   * @param {number} lpi_max The length of lpi_items from the start position.
   * @return {{handle: number, lpi_num: number}} handle
   *    is the new mile stone for this extending. 0 if fail. lpi_num is the
   *    number of items saved.
   */
  extend_dict: function atomDictBase_extend_dict(from_handle, dep, lpi_items,
                                                 start, lpi_max) {},

  /**
   * Get lemma items with scores according to a spelling id stream.
   * This atom dictionary does not need to sort the returned items.
   *
   * @param {Array.<number>} splid_str The spelling id stream buffer.
   * @param {Array.<SearchUtility.LmaPsbItem>} lpi_items Buffer used to fill in
   *    the lemmas matched.
   * @param {number} start The start position of the buffer.
   * @param {number} lpi_max The length of the buffer that could be used.
   * @return {number} The number of matched items which have been filled in to
   *    lpi_items.
   */
  get_lpis: function atomDictBase_get_lpis(splid_str, lpi_items, start,
      lpi_max) {},

  /**
   * Get a lemma string (The Chinese string) by the given lemma id.
   *
   * @param {number} lemmaId The lemma id to get the string.
   * @return {[string, string]} The simplified and traditional lemma string.
   */
  get_lemma_str: function atomDictBase_get_lemma_str(id_lemma) {},

  /**
   * Get the full spelling ids for the given lemma id.
   *
   * @param {number} id_lemma The lemma id to get the result.
   * @param {Array.<number>} splids The buffer of the spl_ids. There may be
   *    half ids in spl_ids to be updated to full ids.
   * @param {number} start The start position of the buffer.
   * @param {number} splids_max The length of the buffer from the start
   *    position.
   * @return {number} The number of ids in the buffer.
   */
  get_lemma_splids: function atomDictBase_get_lemma_splids(id_lemma, splids,
      start, splids_max) {},

  /**
   * Function used for prediction.
   * No need to sort the newly added items.
   * Note: we always use simplified Chinese to make prediction even when
   * inputing traditional Chinese.
   * @param {string} last_hzs The last n simplified Chinese characters(called
   *    Hanzi), its length should be less than or equal to kMaxPredictSize.
   * @param {number} used The number of items have been used from the
   *    beiginning of buffer. An atom dictionary can just ignore it.
   * @param {number} start The start position of the buffer.
   * @param {number} npre_max The length of the buffer from the start position.
   * @param {number} b4_used specifies how many items have been used before the
   *    start position of the buffer.
   * @return {number} The number of newly added items.
   */
  predict: function atomDictBase_predict(last_hzs, npre_items, start, npre_max,
                                         b4_used) {},

  /**
   * Add a lemma to the dictionary. If the dictionary allows to add new
   * items and this item does not exist, add it.
   *
   * @param {string} lemma_str The simplified Chinese string of the lemma.
   * @param {string} lemma_str_tr The traditional Chinese string of the lemma.
   * @param {Array.<number>} splids The spelling ids of the lemma.
   * @param {number} count The frequency count for this lemma.
   * @return {number} The lemma id if succeed, 0 if fail.
   */
  put_lemma: function atomDictBase_put_lemma(lemma_str, lemma_str_tr, splids,
      count) {},

  /**
   * Update a lemma's occuring count.
   *
   * @param {number} lemma_id The lemma id to update.
   * @param {number} delta_count The frequnecy count to ajust.
   * @param {boolean} selected Indicate whether this lemma is selected by user
   * and submitted to target edit box.
   * @return {integer} The id if succeed, 0 if fail.
   */
  update_lemma:
      function atomDictBase_update_lemma(lemma_id, delta_count, selected) {},

  /**
   * Get the lemma id for the given lemma.
   *
   * @param {string} lemma_str The Chinese string of the lemma.
   * @param {Array.<number>} splids The spelling ids of the lemma.
   * @return {number} The matched lemma id, or 0 if fail.
   */
  get_lemma_id: function atomDictBase_get_lemma_id(lemma_str, splids) {},

  /**
   * Get the lemma score.
   *
   * @param {number} lemma_id The lemma id to get score.
   * @return {number} The score of the lemma, or 0 if fail.
   */
  get_lemma_score_by_id:
      function atomDictBase_get_lemma_score_by_id(lemma_id) {},

  /**
   * Get the lemma score.
   *
   * @param {string} lemma_str The Chinese string of the lemma.
   * @param {Array.<number>} splids The spelling ids of the lemma.
   * @return {number} The score of the lamm, or 0 if fail.
   */
  get_lemma_score_by_content:
      function atomDictBase_get_lemma_score_by_content(lemma_str, splids) {},

  /**
   * If the dictionary allowed, remove a lemma from it.
   *
   * @param {number} lemmaId The id of the lemma to remove.
   * @return {boolean} true if succeed.
   */
  remove_lemma: function atomDictBase_remove_lemma(lemma_id) {},

  /**
   * Get the total occuring count of this atom dictionary.
   *
   * @return {number} The total occuring count of this atom dictionary.
   */
  get_total_lemma_count: function atomDictBase_get_total_lemma_count() {},

  /**
   * Set the total occuring count of other atom dictionaries.
   *
   * @param {number} count The total occuring count of other atom dictionaies.
   */
  set_total_lemma_count_of_others:
      function atomDictBase_set_total_lemma_count_of_others(count) {},

  /**
   * Notify this atom dictionary to flush the cached data to persistent storage
   * if necessary.
   * @param {function(void):void} callback The function object that is
   *    called when the operation is finished.
   */
  flush_cache: function atomDictBase_flush_cache(callback) {}
};

var DictTrie = function dictTrie_constructor() {
  this.spl_trie_ = SpellingTrie.get_instance();
  this.reset_milestones(0, DictTrie.kFirstValidMileStoneHandle);
};

DictTrie.kMaxMileStone = 100;
DictTrie.kMaxParsingMark = 600;
DictTrie.kFirstValidMileStoneHandle = 1;

DictTrie.ParsingMark = function parsingMark_constructor(offset, num) {
  this.node_offset = offset;
  this.node_num = num;
};

DictTrie.ParsingMark.prototype = {
  node_offset: 0,

 /**
  * Number of nodes with this spelling id given
  * by spl_id. If spl_id is a Shengmu, for nodes
  * in the first layer of DictTrie, it equals to
  * SpellingTrie::shm2full_num(); but for those
  * nodes which are not in the first layer,
  * node_num < SpellingTrie::shm2full_num().
  * For a full spelling id, node_num = 1;
  */
  node_num: 0
};

/**
 * Used to indicate an extended mile stone.
 * An extended mile stone is used to mark a partial match in the dictionary
 * trie to speed up further potential extending.
 * For example, when the user inputs "w", a mile stone is created to mark the
 * partial match status, so that when user inputs another char 'm', it will be
 * faster to extend search space based on this mile stone.
 * For partial match status of "wm", there can be more than one sub mile
 * stone, for example, "wm" can be matched to "wanm", "wom", ..., etc, so
 * there may be more one parsing mark used to mark these partial matchings.
 * A mile stone records the starting position in the mark list and number of
 * marks.
 */
DictTrie.MileStone = function mileStone_constructor(start, num) {
  this.mark_start = start;
  this.mark_num = num;
};

DictTrie.MileStone.prototype = {
  mark_start: 0,
  mark_num: 0
};

DictTrie.prototype = {
  // Implements IAtomDictBase
  __proto__: IAtomDictBase,

  /* ==== Public ==== */

  /**
   * Build dictionary trie from the file fn_raw, fn_raw_tr. File fn_validhzs
   * provides valid chars. If fn_validhzs is null, only chars in GB2312 will
   * be included.
   * @param {string} fn_raw The raw data file name for simplified Chinese.
   * @param {string} fn_validhzs The valid hanzi file name.
   * @param {string} fn_raw_tr The raw data file name for traditional Chinese.
   * @param {function(boolean)} callback The function object that is
   *    called when the operation is finished. The boolean parameter indicates
   *    whether the dict is built successfully.
   * @return {void} No return value.
   */
  build_dict: function dictTrie_build_dict(fn_raw, fn_validhzs, fn_raw_tr,
      callback) {
    var dict_builder = new DictBuilder();
    this.reset_milestones(0, DictTrie.kFirstValidMileStoneHandle);
    dict_builder.build_dict(fn_raw, fn_validhzs, fn_raw_tr, this, callback);
  },

  /**
   * Save the binary dictionary
   * Actually, the SpellingTrie/DictList instance will be also saved.
   * @private
   * @param {string} filename File name.
   * @param {function (boolean): void} callback Callback function, called
   *    when the opertion is finished. The boolean parameter indicates
   *    whether the operation is successful.
   */
  save_dict: function dictTrie_save_dict(filename, callback) {
    var isOk = false;
    var doCallback = function save_callbakc() {
      if (callback) {
        callback(isOk);
      }
    };

    if (!filename || this.root_ == null || this.dict_list_ == null) {
      doCallback();
      return;
    }

    var spl_trie = SpellingTrie.get_instance();
    var ngram = NGram.get_instance();

    var spl_trie_str = spl_trie.save_spl_trie();
    var dict_list_str = this.dict_list_.save_list();
    var dict_trie_str = this.save_dict_as_string();
    var ngram_str = ngram.save_ngram();

    var jsonData = {
      spl_trie: spl_trie_str,
      dict_list: dict_list_str,
      dict_trie: dict_trie_str,
      ngram: ngram_str
    };

    var str = JSON.stringify(jsonData);

    // Break the dict string into multi-lines.
    var lines = '';
    var num = Math.ceil(str.length / 80);
    for (var i = 0; i < num; i++) {
      lines += str.substring(i * 80, i * 80 + 80) + '\n';
    }

    FileSystemService.write(filename, lines, function
        writeFileCallback(success) {
      isOk = success;
      doCallback();
    });
  },

  /**
   * Load a binary dictionary
   * The SpellingTrie instance/DictList will be also loaded
   * @override
   */
  load_dict: function dictTrie_load(file_name, start_id, end_id, callback) {
    debug('DictTrie#load_dict: ' + file_name);
    var self = this;
    var isOk = false;
    var doCallback = function load_doCallback() {
      if (callback) {
        callback(isOk);
      }
    };
    if (!file_name || end_id <= start_id) {
      doCallback();
      return;
    }

    this.dict_list_ = new DictList();
    var spl_trie = SpellingTrie.get_instance();
    var ngram = NGram.get_instance();

    var dictJson = null;

    var taskQueue = new TaskQueue(
        function load_taskQueueOnCompleteCallback(queueData) {
      if (self.top_lmas_num_ > end_id - start_id + 1) {
        debug('DictTrie failed to load from file.');
      } else {
        isOk = true;
      }
      doCallback();
    });

    var processNextWithDelay =
        function load_rocessNextWithDelay() {
      if (typeof setTimeout != 'undefined') {
        setTimeout(function nextTask() {
          taskQueue.processNext();
        }, 0);
      } else {
        taskQueue.processNext();
      }
    };

    // Open the dictionary file.
    taskQueue.push(function openSysDictFile(taskQueue, taskData) {
      // Open the raw dict files
      FileSystemService.read(file_name,
          function readSysDictFileCallback(str) {
        try {
          str = str.replace(/\n/g, '');
          dictJson = JSON.parse(str);
        } catch (e) {
          debug('Failed to open the system dictionary file.');
          doCallback();
          return;
        }
        processNextWithDelay();
      });
    });

    // Load SpellingTrie.
    taskQueue.push(function loadSpellingTrie(taskQueue, taskData) {
      if (!spl_trie.load_spl_trie(dictJson.spl_trie)) {
        debug('Failed to load SpellingTrie.');
        doCallback();
        return;
      }
      processNextWithDelay();
    });

    // Load DictList.
    taskQueue.push(function loadDictList(taskQueue, taskData) {
      if (!self.dict_list_.load_list(dictJson.dict_list)) {
        debug('Failed to load DictList.');
        doCallback();
        return;
      }
      processNextWithDelay();
    });

    // Load DictTrie.
    taskQueue.push(function loadDictTrie(taskQueue, taskData) {
      if (!self.load_dict_from_string(dictJson.dict_trie)) {
        debug('Failed to load DictTrie.');
        doCallback();
        return;
      }
      processNextWithDelay();
    });

    // Load NGram.
    taskQueue.push(function loadNGram(taskQueue, taskData) {
      if (!ngram.load_ngram(dictJson.ngram)) {
        debug('Failed to load NGram.');
        doCallback();
        return;
      }
      processNextWithDelay();
    });

    taskQueue.processNext();
  },

  /**
   * @override
   */
  close_dict: function dictTrie_close_dict(callback) {
  },

  /**
   * @override
   */
  number_of_lemmas: function dictTrie_number_of_lemmas() {
    return 0;
  },

  /**
   * @override
   */
  reset_milestones: function dictTrie_reset_milestones(from_step, from_handle) {
    if (0 == from_step) {
      this.parsing_marks_pos_ = 0;
      this.mile_stones_pos_ = DictTrie.kFirstValidMileStoneHandle;
    } else {
      if (from_handle > 0 && from_handle < this.mile_stones_pos_) {
        this.mile_stones_pos_ = from_handle;

        var mile_stone = this.mile_stones_[from_handle];
        this.parsing_marks_pos_ = mile_stone.mark_start;
      }
    }
  },

  /**
   * @override
   */
  extend_dict: function dictTrie_extend_dict(from_handle, dep, lpi_items, start,
                                             lpi_max) {
    debug('DictTrie#extend_dict');
    var defaultValue = {handle: 0, lpi_num: 0};
    if (null === dep) {
      return defaultValue;
    }

    // from DictDef.LmaNodeLE0 (root) to DictDef.LmaNodeLE0
    if (0 == from_handle) {
      assert(0 == dep.splids_extended, 'extend_dict assertion error.');
      return this.extend_dict0(from_handle, dep, lpi_items, start, lpi_max);
    }

    // from DictDef.LmaNodeLE0 to DictDef.LmaNodeGE1
    if (1 == dep.splids_extended) {
      return this.extend_dict1(from_handle, dep, lpi_items, start, lpi_max);
    }

    // From DictDef.LmaNodeGE1 to DictDef.LmaNodeGE1
    return this.extend_dict2(from_handle, dep, lpi_items, start, lpi_max);
  },

  /**
   * @override
   */
  get_lpis: function dictTrie_get_lpis(splid_str, lma_buf, start, max_lma_buf) {
    var splid_str_len = splid_str.length;
    if (splid_str_len > DictDef.kMaxLemmaSize) {
      return 0;
    }

    var MAX_EXTENDBUF_LEN = 200;

    var node_fr_le0 = []; // Nodes from.
    var node_to_le0 = []; // Nodes to.
    var node_fr_ge1 = [];
    var node_to_ge1 = [];
    var node_fr_num = 1;
    var node_to_num = 0;
    node_fr_le0[0] = this.root_[0];
    if (null === node_fr_le0[0]) {
      return 0;
    }

    var spl_pos = 0;

    while (spl_pos < splid_str_len) {
      var id_num = 1;
      var id_start = splid_str[spl_pos];
      // If it is a half id
      if (this.spl_trie_.is_half_id(splid_str[spl_pos])) {
        var ret = this.spl_trie_.half_to_full(splid_str[spl_pos]);
        id_num = ret.num;
        id_start = ret.spl_id_start;
        assert(id_num > 0);
      }

      // Extend the nodes
      if (0 == spl_pos) {  // From LmaNodeLE0 (root) to LmaNodeLE0 nodes
        for (var node_fr_pos = 0; node_fr_pos < node_fr_num; node_fr_pos++) {
          var node = node_fr_le0[node_fr_pos];
          assert(node == this.root_[0] && 1 == node_fr_num);
          var son_start =
            this.splid_le0_index_[id_start - SpellingTrie.kFullSplIdStart];
          var son_end = this.splid_le0_index_[id_start + id_num -
                                              SpellingTrie.kFullSplIdStart];
          for (var son_pos = son_start; son_pos < son_end; son_pos++) {
            assert(1 == node.son_1st_off);
            var node_son = this.root_[son_pos];
            assert(node_son.spl_idx >= id_start &&
                   node_son.spl_idx < id_start + id_num);
            if (node_to_num < MAX_EXTENDBUF_LEN) {
              node_to_le0[node_to_num] = node_son;
              node_to_num++;
            }
            // id_start + id_num - 1 is the last one, which has just been
            // recorded.
            if (node_son.spl_idx >= id_start + id_num - 1) {
              break;
            }
          }
        }

        spl_pos++;
        if (spl_pos >= splid_str_len || node_to_num == 0)
          break;
        // Prepare the nodes for next extending
        // next time, from LmaNodeLE0 to LmaNodeGE1
        var node_tmp = node_fr_le0;
        node_fr_le0 = node_to_le0;
        node_to_le0 = null;
        node_to_ge1 = node_tmp;
      } else if (1 == spl_pos) {  // From LmaNodeLE0 to LmaNodeGE1 nodes
        for (var node_fr_pos = 0; node_fr_pos < node_fr_num; node_fr_pos++) {
          var node = node_fr_le0[node_fr_pos];
          for (var son_pos = 0; son_pos < node.num_of_son;
               son_pos++) {
            assert(node.son_1st_off <= this.lma_node_num_ge1_);
            var node_son = this.nodes_ge1_[node.son_1st_off + son_pos];
            if (node_son.spl_idx >= id_start &&
                node_son.spl_idx < id_start + id_num) {
              if (node_to_num < MAX_EXTENDBUF_LEN) {
                node_to_ge1[node_to_num] = node_son;
                node_to_num++;
              }
            }
            // id_start + id_num - 1 is the last one, which has just been
            // recorded.
            if (node_son.spl_idx >= id_start + id_num - 1)
              break;
          }
        }

        spl_pos++;
        if (spl_pos >= splid_str_len || node_to_num == 0)
          break;
        // Prepare the nodes for next extending
        // next time, from LmaNodeGE1 to LmaNodeGE1
        node_fr_ge1 = node_to_ge1;
        node_to_ge1 = node_fr_le0;
        node_fr_le0 = null;
        node_to_le0 = null;
      } else {  // From LmaNodeGE1 to LmaNodeGE1 nodes
        for (var node_fr_pos = 0; node_fr_pos < node_fr_num; node_fr_pos++) {
          var node = node_fr_ge1[node_fr_pos];
          for (var son_pos = 0; son_pos < node.num_of_son;
               son_pos++) {
            assert(node.son_1st_off_l > 0 || node.son_1st_off_h > 0);
            var node_son = this.nodes_ge1_[this.get_son_offset(node) + son_pos];
            if (node_son.spl_idx >= id_start &&
                node_son.spl_idx < id_start + id_num) {
              if (node_to_num < MAX_EXTENDBUF_LEN) {
                node_to_ge1[node_to_num] = node_son;
                node_to_num++;
              }
            }
            // id_start + id_num - 1 is the last one, which has just been
            // recorded.
            if (node_son.spl_idx >= id_start + id_num - 1)
              break;
          }
        }

        spl_pos++;
        if (spl_pos >= splid_str_len || node_to_num == 0)
          break;
        // Prepare the nodes for next extending
        // next time, from LmaNodeGE1 to LmaNodeGE1
        var node_tmp = node_fr_ge1;
        node_fr_ge1 = node_to_ge1;
        node_to_ge1 = node_tmp;
      }

      // The number of node for next extending
      node_fr_num = node_to_num;
      node_to_num = 0;
    }  // while

    if (0 == node_to_num)
      return 0;

    var ngram = NGram.get_instance();
    var lma_num = 0;

    // If the length is 1, and the splid is a one-char Yunmu like 'a', 'o', 'e',
    // only those candidates for the full matched one-char id will be returned.
    if (1 == splid_str_len && this.spl_trie_.is_half_id_yunmu(splid_str[0])) {
      node_to_num = node_to_num > 0 ? 1 : 0;
    }

    for (var node_pos = 0; node_pos < node_to_num; node_pos++) {
      var num_of_homo = 0;
      if (spl_pos <= 1) {  // Get from LmaNodeLE0 nodes
        var node_le0 = node_to_le0[node_pos];
        num_of_homo = node_le0.num_of_homo;
        for (var homo_pos = 0; homo_pos < num_of_homo; homo_pos++) {
          var ch_pos = lma_num + homo_pos;
          lma_buf[start + ch_pos].id =
              this.get_lemma_id_by_offset(node_le0.homo_idx_buf_off + homo_pos);
          lma_buf[start + ch_pos].lma_len = 1;
          lma_buf[start + ch_pos].psb =
            ngram.get_uni_psb(lma_buf[start + ch_pos].id);

          if (lma_num + homo_pos >= max_lma_buf - 1)
            break;
        }
      } else {  // Get from LmaNodeGE1 nodes
        var node_ge1 = node_to_ge1[node_pos];
        num_of_homo = node_ge1.num_of_homo;
        for (var homo_pos = 0; homo_pos < num_of_homo; homo_pos++) {
          var ch_pos = lma_num + homo_pos;
          var node_homo_off = this.get_homo_idx_buf_offset(node_ge1);
          lma_buf[start + ch_pos].id =
            this.get_lemma_id_by_offset(node_homo_off + homo_pos);
          lma_buf[start + ch_pos].lma_len = splid_str_len;
          lma_buf[start + ch_pos].psb =
            ngram.get_uni_psb(lma_buf[start + ch_pos].id);

          if (lma_num + homo_pos >= max_lma_buf - 1)
            break;
        }
      }
      // TODO Find why num_of_homo is undefined.
      if (typeof num_of_homo == 'undefined') {
        num_of_homo = 0;
      }
      lma_num += num_of_homo;
      if (lma_num >= max_lma_buf) {
        lma_num = max_lma_buf;
        break;
      }
    }
    return lma_num;
  },

  /**
   * @override
   */
  get_lemma_str: function dictTrie_get_lemma_str(id_lemma) {
    return this.dict_list_.get_lemma_str(id_lemma);
  },

  /**
   * @override
   */
  get_lemma_splids: function dictTrie_get_lemma_splids(id_lemma, splids, start,
                                                       splids_max) {
    var lma_str = this.get_lemma_str(id_lemma)[0];
    var lma_len = lma_str.length;
    assert(lma_len == splids_max, 'get_lemma_splids assertion error.' +
      StringUtils.format('lma_len({0}) != splids_max{1}', lma_len, splids_max));

    var spl_mtrx = [];//[kMaxLemmaSize * 5];
    var spl_start = [];//[kMaxLemmaSize + 1];
    spl_start[0] = 0;
    var try_num = 1;

    for (var pos = 0; pos < lma_len; pos++) {
      var cand_splids_this = 0;
      if (this.spl_trie_.is_full_id(splids[pos])) {
        spl_mtrx.push(splids[pos]);
        cand_splids_this = 1;
      } else {
        var splids_this = this.dict_list_.get_splids_for_hanzi(lma_str[pos],
            splids[pos]);
        cand_splids_this = splids_this.length;
        spl_mtrx = spl_mtrx.concat(splids_this);
        assert(cand_splids_this > 0,
            StringUtils.format('cand_splids_this({0}) <= 0',
                               cand_splids_this));
      }
      spl_start[pos + 1] = spl_start[pos] + cand_splids_this;
      try_num *= cand_splids_this;
    }

    for (var try_pos = 0; try_pos < try_num; try_pos++) {
      var mod = 1;
      for (var pos = 0; pos < lma_len; pos++) {
        var radix = spl_start[pos + 1] - spl_start[pos];
        splids[pos] = spl_mtrx[spl_start[pos] + try_pos / mod % radix];
        mod *= radix;
      }

      if (this.try_extend(splids, start, lma_len, id_lemma)) {
        return lma_len;
      }
    }

    return 0;
  },

  /**
   * @override
   */
  predict: function dictTrie_predict(last_hzs, npre_items, start, npre_max,
                                     b4_used) {
    return this.dict_list_.predict(last_hzs, npre_items, start, npre_max,
                                   b4_used);
  },

  /**
   * @override
   */
  put_lemma: function dictTrie_put_lemma(lemma_str, lemma_str_tr, splids,
      count) {
    return 0;
  },

  /**
   * @override
   */
  update_lemma:
      function dictTrie_update_lemma(lemma_id, delta_count, selected) {
    return 0;
  },

  /**
   * @override
   */
  get_lemma_id: function dictTrie_get_lemma_id(lemma_str, splids) {
    return 0;
  },

  /**
   * @override
   */
  get_lemma_score_by_id:
      function dictTrie_get_lemma_score_by_id(lemma_id) {
    return 0;
  },

  /**
   * @override
   */
  get_lemma_score_by_content:
      function dictTrie_get_lemma_score_by_content(lemma_str, splids) {
    return 0;
  },

  /**
   * @override
   */
  remove_lemma: function dictTrie_remove_lemma(lemma_id) {
    return false;
  },

  /**
   * @override
   */
  get_total_lemma_count: function dictTrie_get_total_lemma_count() {
    return 0;
  },

  /**
   * @override
   */
  set_total_lemma_count_of_others:
      function dictTrie_set_total_lemma_count_of_others(count) {
    var ngram = NGram.get_instance();
    ngram.set_total_freq_none_sys(count);
  },

  /**
   * @override
   */
  flush_cache: function dictTrie_flush_cache(callback) {
    if (callback) {
      callback();
    }
  },

  get_lemma_id_by_str: function dictTrie_get_lemma_id_by_str(lemma_str) {
    if (!lemma_str)
        return 0;
    var lemma_len = lemma_str.length;
    if (lemma_len > DictDef.kMaxLemmaSize) {
      return 0;
    }

    return this.dict_list_.get_lemma_id(lemma_str);
  },

  /**
   * Fill the lemmas with highest scores to the prediction buffer.
   * his_len is the history length to fill in the prediction buffer.
   * @param {Array.<SearchUtility.NPredictItem>} npre_items The buffer to be
   *    filled.
   * @param {number} start The start position of the buffer.
   * @param {number} npre_max The length of the buffer from the start position.
   * @param {number} b4_used specifies how many items have been used before the
   *    start position of the buffer.
   * @return {number} The number of newly added items.
   */
  predict_top_lmas: function dictTrie_predict_top_lmas(his_len, npre_items,
      start, npre_max, b4_used) {
    var ngram = NGram.get_instance();

    var item_num = 0;
    var top_lmas_id_offset = this.lma_idx_buf_len_ /
      DictDef.kLemmaIdSize - this.top_lmas_num_;
    var top_lmas_pos = 0;
    while (item_num < npre_max && top_lmas_pos < this.top_lmas_num_) {
      this.npre_items[start + item_num] = new SearchUtility.NPredictItem();
      var top_lma_id =
        this.get_lemma_id_by_offset(top_lmas_id_offset + top_lmas_pos);
      top_lmas_pos += 1;
      var strs = this.dict_list_.get_lemma_str(top_lma_id);
      if (!strs[0]) {
        continue;
      }
      npre_items[start + item_num] = new SearchUtility.NPredictItem();
      npre_items[start + item_num].pre_hzs = strs[0];
      npre_items[start + item_num].pre_hzs_tr = strs[1];
      npre_items[start + item_num].psb = ngram.get_uni_psb(top_lma_id);
      npre_items[start + item_num].his_len = his_len;
      item_num++;
    }
    return item_num;
  },

  /* ==== Private ==== */

  /**
   * @type DictList
   */
  dict_list_: null,

  /**
   * @type SpellingTrie
   */
  spl_trie_: null,

  /**
   * Nodes for root and the first layer.
   * @type Array.<DictDef.LmaNodeLE0>
   */
  root_: null,

  /**
   * Nodes for other layers.
   * @type Array.<DictDef.LmaNodeGE1>
   */
  nodes_ge1_: null,

  /**
   * An quick index from spelling id to the LmaNodeLE0 node buffer, or
   * to the root_ buffer.
   * Index length:
   * SpellingTrie::get_instance().get_spelling_num() + 1. The last one is used
   * to get the end.
   * All Shengmu ids are not indexed because they will be converted into
   * corresponding full ids.
   * So, given an id splid, the son is:
   * root_[splid_le0_index_[splid - kFullSplIdStart]]
   * @type Array.<number>
   */
  splid_le0_index_: null,

  lma_node_num_le0_: 0,
  lma_node_num_ge1_: 0,

  /**
   * The first part is for homophnies, and the last top_lma_num_ items are
   * lemmas with highest scores.
   * @type string
   */
  lma_idx_buf_: '',
  // The total size of lma_idx_buf_ in byte.
  lma_idx_buf_len_: 0,
  // Total number of lemmas in this dictionary.
  total_lma_num_: 0,
  // Number of lemma with highest scores.
  top_lmas_num_: 0,

  /**
   * Parsing mark list used to mark the detailed extended statuses.
   * @type Array.<ParsingMark>
   */
  parsing_marks_: null,

  /**
   * The position for next available mark.
   */
  parsing_marks_pos_: 0,

  /**
   * Mile stone list used to mark the extended status.
   * @type Array.<MileStone>
   */
  mile_stones_: null,

  /**
   * The position for the next available mile stone. We use positions (except 0)
   * as handles.
   * @type number
   */
  mile_stones_pos_: 0,

  /**
   * Get the offset of sons for a node.
   * @param {DictDef.LmaNodeGE1} node The given node.
   * @return {number} The offset of the sons.
   */
  get_son_offset: function dictTrie_get_son_offset(node) {
    return node.son_1st_off_l + (node.son_1st_off_h << 16);
  },

  /**
   * Get the offset of homonious ids for a node.
   * @param {LmaNodeGE1} node The given node.
   * @return {number} The offset.
   */
  get_homo_idx_buf_offset: function dictTrie_get_homo_idx_buf_offset(node) {
    return node.homo_idx_buf_off_l + (node.homo_idx_buf_off_h << 16);
  },

  /**
   * Get the lemma id by the offset.
   */
  get_lemma_id_by_offset: function dictTrie_get_lemma_id_by_offset(id_offset) {
    var id = 0;
    for (var pos = DictDef.kLemmaIdSize - 1; pos >= 0; pos--) {
      id = (id << 8) +
        this.lma_idx_buf_.charCodeAt(id_offset * DictDef.kLemmaIdSize + pos);
    }
    return id;
  },

  /**
   * Given a LmaNodeLE0 node, extract the lemmas specified by it, and fill
   * them into the lpi_items buffer.
   * @param {Array.<LmaPsbItem>} lpi_items The buffer to be filled.
   * @param {number} start The position to start filling.
   * @param {number} lpi_max The maximum number of items which can be filled.
   * @param {LmaNodeLE0} node The given LmaNodeLE0 node.
   * @return {number} The number of lemmas.
   */
  fill_lpi_buffer_le0:
      function dictTrie_fill_lpi_buffer_le0(lpi_items, start, lpi_max, node) {
    var lpi_num = 0;
    var ngram = NGram.get_instance();
    for (var homo = 0; homo < node.num_of_homo; homo++) {
      lpi_items[start + lpi_num].id =
        this.get_lemma_id_by_offset(node.homo_idx_buf_off + homo);
      lpi_items[start + lpi_num].lma_len = 1;
      lpi_items[start + lpi_num].psb =
        ngram.get_uni_psb(lpi_items[start + lpi_num].id);
      lpi_num++;
      if (lpi_num >= lpi_max)
        break;
    }
    return lpi_num;
  },

  /**
   * Given a LmaNodeGE1 node, extract the lemmas specified by it, and fill
   * them into the lpi_items buffer.
   * This function is called by inner functions extend_dict0(), extend_dict1()
   * and extend_dict2().
   * @param {Array.<LmaPsbItem>} lpi_items The lemmas buffer.
   * @param {number} start The position to start filling.
   * @param {number} lpi_max The maximum number of items which can be filled.
   * @param {LmaNodeGE1} node The given LmaNodeGE1 node.
   * @return {number} The number of lemmas.
   */
  fill_lpi_buffer_ge1: function dictTrie_fill_lpi_buffer_ge1(lpi_items, start,
      lpi_max, homo_buf_off, node, lma_len) {
    var lpi_num = 0;
    var ngram = NGram.get_instance();
    for (var homo = 0; homo < node.num_of_homo; homo++) {
      lpi_items[start + lpi_num].id =
        this.get_lemma_id_by_offset(homo_buf_off + homo);
      lpi_items[start + lpi_num].lma_len = lma_len;
      lpi_items[start + lpi_num].psb =
          ngram.get_uni_psb(lpi_items[start + lpi_num].id);
      lpi_num++;
      if (lpi_num >= lpi_max)
        break;
    }

    return lpi_num;
  },

  /**
   * Extend in the trie from level 0.
   * @param {number} from_handle The mile stone handle from which we extend.
   * @param {SearchUtility.DictExtPara} dep Extra dictionary parameters.
   * @param {Array.<SearchUtility.LmaPsbItem>} lpi_items The buffer to save the
   *    result.
   * @param {number} start The start position of the buffer.
   * @param {number} lpi_max The maximum number of items to save.
   * @return {{handle: number, lpi_num: number}} handle - The mile stone handle;
   *    lpi_num - The number of items saved.
   */
  extend_dict0: function dictTrie_extend_dict0(from_handle, dep, lpi_items,
                                               start, lpi_max) {
    assert(null !== dep && 0 == from_handle, 'extend_dict0 assertion error.' +
           'Invalid arguments.');
    var ret = {handle: 0, lpi_num: 0};
    var lpi_num = 0;
    var ret_handle = 0;

    var splid = dep.splids[dep.splids_extended];
    var id_start = dep.id_start;
    var id_num = dep.id_num;

    var lpi_cache = LpiCache.get_instance();
    var cached = lpi_cache.is_cached(splid);

    // 2. Begin exgtending
    // 2.1 Get the LmaPsbItem list
    var node = this.root_[0];
    var son_start =
      this.splid_le0_index_[id_start - SpellingTrie.kFullSplIdStart];
    var son_end =
      this.splid_le0_index_[id_start + id_num - SpellingTrie.kFullSplIdStart];
    for (var son_pos = son_start; son_pos < son_end; son_pos++) {
      assert(1 == node.son_1st_off,
             'extend_dict0 assertion error. Invalid tree node.');
      var son = this.root_[son_pos];
      assert(son.spl_idx >= id_start && son.spl_idx < id_start + id_num,
             'extend_dict0 assertion error. Invalid spl_idx: ' + son.spl_idx);
      if (!cached && lpi_num < lpi_max) {
        var need_lpi = true;
        if (this.spl_trie_.is_half_id_yunmu(splid) && son_pos != son_start) {
          need_lpi = false;
        }

        if (need_lpi) {
          lpi_num += this.fill_lpi_buffer_le0(lpi_items, start + lpi_num,
                                              lpi_max - lpi_num,
                                              son);
        }
      }

      // If necessary, fill in a new mile stone.
      if (son.spl_idx == id_start) {
        if (this.mile_stones_pos_ < DictTrie.kMaxMileStone &&
              this.parsing_marks_pos_ < DictTrie.kMaxParsingMark) {
          this.parsing_marks_[this.parsing_marks_pos_].node_offset = son_pos;
          this.parsing_marks_[this.parsing_marks_pos_].node_num = id_num;
          this.mile_stones_[this.mile_stones_pos_].mark_start =
              this.parsing_marks_pos_;
          this.mile_stones_[this.mile_stones_pos_].mark_num = 1;
          ret_handle = this.mile_stones_pos_;
          this.parsing_marks_pos_++;
          this.mile_stones_pos_++;
        }
      }

      if (son.spl_idx >= id_start + id_num - 1)
        break;
    }

    debug(StringUtils.format('----- parsing marks: {0}, mile stone: {1}',
                             this.parsing_marks_pos_, this.mile_stones_pos_));
    ret.handle = ret_handle;
    ret.lpi_num = lpi_num;
    return ret;
  },

  /**
   * Extend in the trie from level 1.
   * @param {number} from_handle The mile stone handle from which we extend.
   * @param {SearchUtility.DictExtPara} dep Extra dictionary parameters.
   * @param {Array.<LmaPsbItem>} lpi_items The buffer to save the result.
   * @param {number} start The start position of the buffer.
   * @param {number} lpi_max The maximum number of items to save.
   * @return {{handle: number, lpi_num: number}} handle - The mile stone handle,
   *    pi_num - The number of items saved.
   */
  extend_dict1: function dictTrie_extend_dict1(from_handle, dep, lpi_items,
                                               start, lpi_max) {
    assert(null !== dep && from_handle > 0 &&
           from_handle < this.mile_stones_pos_,
           'extend_dict1 assertion error. Invalid arguments.');

    var ret = {handle: 0, lpi_num: 0};
    var ret_handle = 0;
    var lpi_num = 0;

    // 1. If this is a half Id, get its corresponding full starting Id and
    // number of full Id.
    var ret_val = 0;

    var id_start = dep.id_start;
    var id_num = dep.id_num;

    // 2. Begin extending.
    var mile_stone = this.mile_stones_[from_handle];

    for (var h_pos = 0; h_pos < mile_stone.mark_num; h_pos++) {
      var p_mark = this.parsing_marks_[mile_stone.mark_start + h_pos];
      var ext_num = p_mark.node_num;
      for (var ext_pos = 0; ext_pos < ext_num; ext_pos++) {
        var node = this.root_[p_mark.node_offset + ext_pos];
        var found_start = 0;
        var found_num = 0;
        for (var son_pos = 0; son_pos < node.num_of_son; son_pos++) {
          assert(node.son_1st_off <= this.lma_node_num_ge1_);
          var son = this.nodes_ge1_[node.son_1st_off + son_pos];
          if (son.spl_idx >= id_start &&
              son.spl_idx < id_start + id_num) {
            if (lpi_num < lpi_max) {
              var homo_buf_off = this.get_homo_idx_buf_offset(son);
              lpi_num += this.fill_lpi_buffer_ge1(lpi_items, start + lpi_num,
                                          lpi_max - lpi_num, homo_buf_off, son,
                                          2);
            }

            // If necessary, fill in the new DTMI
            if (0 == found_num) {
              found_start = son_pos;
            }
            found_num++;
          }
          if (son.spl_idx >= id_start + id_num - 1 || son_pos ==
              node.num_of_son - 1) {
            if (found_num > 0) {
              if (this.mile_stones_pos_ < DictTrie.kMaxMileStone &&
                  this.parsing_marks_pos_ < DictTrie.kMaxParsingMark) {
                this.parsing_marks_[this.parsing_marks_pos_].node_offset =
                  node.son_1st_off + found_start;
                this.parsing_marks_[this.parsing_marks_pos_].node_num =
                  found_num;
                if (0 == ret_val) {
                  this.mile_stones_[this.mile_stones_pos_].mark_start =
                    this.parsing_marks_pos_;
                }
                this.parsing_marks_pos_++;
              }

              ret_val++;
            }
            break;
          }  // for son_pos
        }  // for ext_pos
      }  // for h_pos
    }

    if (ret_val > 0) {
      this.mile_stones_[this.mile_stones_pos_].mark_num = ret_val;
      ret_handle = this.mile_stones_pos_;
      this.mile_stones_pos_++;
      ret_val = 1;
    }

    debug(StringUtils.format('----- parsing marks: {0}, mile stone: {1}',
                             this.parsing_marks_pos_, this.mile_stones_pos_));
    ret.handle = ret_handle;
    ret.lpi_num = lpi_num;
    return ret;
  },

  /**
   * Extend in the trie from level 2.
   * @param {number} from_handle The mile stone handle from which we extend.
   * @param {DictDef.DictExtPara} dep Extra dictionary parameters.
   * @param {Array.<LmaPsbItem>} lpi_items The buffer to save the result.
   * @param {number} start The start position of the buffer.
   * @param {number} lpi_max The maximum number of items to save.
   * @return {{handle: number, lpi_num: number}} handle - The mile stone handle,
   *    lpi_num - The number of items saved.
   */
  extend_dict2: function dictTrie_extend_dict2(from_handle, dep, lpi_items,
                                               start, lpi_max) {
    assert(null !== dep && from_handle > 0 &&
           from_handle < this.mile_stones_pos_,
           'extend_dict1 assertion error. Invalid arguments.');

    var ret = {handle: 0, lpi_num: 0};
    var ret_handle = 0;
    var lpi_num = 0;

    // 1. If this is a half Id, get its corresponding full starting Id and
    // number of full Id.
    var ret_val = 0;

    var id_start = dep.id_start;
    var id_num = dep.id_num;

    // 2. Begin extending.
    var mile_stone = this.mile_stones_[from_handle];

    for (var h_pos = 0; h_pos < mile_stone.mark_num; h_pos++) {
      var p_mark = this.parsing_marks_[mile_stone.mark_start + h_pos];
      var ext_num = p_mark.node_num;
      for (var ext_pos = 0; ext_pos < ext_num; ext_pos++) {
        var node = this.nodes_ge1_[p_mark.node_offset + ext_pos];
        var found_start = 0;
        var found_num = 0;

        for (var son_pos = 0; son_pos < node.num_of_son; son_pos++) {
          assert(node.son_1st_off_l > 0 || node.son_1st_off_h > 0);
          var son = this.nodes_ge1_[this.get_son_offset(node) + son_pos];
          if (son.spl_idx >= id_start &&
              son.spl_idx < id_start + id_num) {
            if (lpi_num < lpi_max) {
              var homo_buf_off = this.get_homo_idx_buf_offset(son);
              lpi_num += this.fill_lpi_buffer_ge1(lpi_items, start + lpi_num,
                                          lpi_max - lpi_num, homo_buf_off, son,
                                          dep.splids_extended + 1);
            }

            // If necessary, fill in the new DMI
            if (0 == found_num) {
              found_start = son_pos;
            }
            found_num++;
          }
          if (son.spl_idx >= id_start + id_num - 1 || son_pos ==
              node.num_of_son - 1) {
            if (found_num > 0) {
              if (this.mile_stones_pos_ < DictTrie.kMaxMileStone &&
                  this.parsing_marks_pos_ < DictTrie.kMaxParsingMark) {
                this.parsing_marks_[this.parsing_marks_pos_].node_offset =
                  this.get_son_offset(node) + found_start;
                this.parsing_marks_[this.parsing_marks_pos_].node_num =
                  found_num;
                if (0 == ret_val) {
                  this.mile_stones_[this.mile_stones_pos_].mark_start =
                    this.parsing_marks_pos_;
                }
                this.parsing_marks_pos_++;
              }

              ret_val++;
            }
            break;
          }
        }  // for son_pos
      }  // for ext_pos
    }  // for h_pos

    if (ret_val > 0) {
      this.mile_stones_[this.mile_stones_pos_].mark_num = ret_val;
      ret_handle = this.mile_stones_pos_;
      this.mile_stones_pos_++;
    }

    debug(StringUtils.format('----- parsing marks: {0}, mile stone: {1}',
                             this.parsing_marks_pos_, this.mile_stones_pos_));
    ret.handle = ret_handle;
    ret.lpi_num = lpi_num;
    return ret;
  },

  /**
   * Try to extend the given spelling id buffer, and if the given id_lemma can
   * be successfully gotten, return true;
   * The given spelling ids are all valid full ids.
   * @param {Array.<number>} splids The given spelling id buffer.
   * @param {number} start The start position of the buffer.
   * @param {number} splid_num The buffer length from the start position.
   * @return {boolean} true if success.
   */
  try_extend: function dictTrie_try_extend(splids, start, splid_num, id_lemma) {
    if (0 == splid_num || null === splids) {
       return false;
    }

    var node = this.root_[this.splid_le0_index_[splids[0] -
                                                SpellingTrie.kFullSplIdStart]];

    for (var pos = 1; pos < splid_num; pos++) {
      if (1 == pos) {
        var node_le0 = node;
        var node_son;
        var son_pos;
        for (son_pos = 0; son_pos < node_le0.num_of_son; son_pos++) {
          assert(node_le0.son_1st_off <= this.lma_node_num_ge1_);
          node_son = this.nodes_ge1_[node_le0.son_1st_off] + son_pos;
          if (node_son.spl_idx == splids[pos]) {
            break;
          }
        }
        if (son_pos < node_le0.num_of_son) {
          node = node_son;
        } else {
          return false;
        }
      } else {
        var node_ge1 = node;
        var node_son;
        var son_pos;
        for (son_pos = 0; son_pos < node_ge1.num_of_son; son_pos++) {
          assert(node_ge1.son_1st_off_l > 0 || node_ge1.son_1st_off_h > 0);
          node_son = this.nodes_ge1_[this.get_son_offset(node_ge1) + son_pos];
          if (node_son.spl_idx == splids[pos]) {
            break;
          }
        }
        if (son_pos < node_ge1.num_of_son) {
          node = node_son;
        } else {
          return false;
        }
      }
    }

    if (1 == splid_num) {
      var node_le0 = node;
      var num_of_homo = node_le0.num_of_homo;
      for (var homo_pos = 0; homo_pos < num_of_homo; homo_pos++) {
        var id_this =
         this.get_lemma_id_by_offset(node_le0.homo_idx_buf_off + homo_pos);
        if (id_this == id_lemma) {
          return true;
        }
      }
    } else {
      var node_ge1 = node;
      var num_of_homo = node_ge1.num_of_homo;
      for (var homo_pos = 0; homo_pos < num_of_homo; homo_pos++) {
        var node_homo_off = this.get_homo_idx_buf_offset(node_ge1);
        if (this.get_lemma_id_by_offset(node_homo_off + homo_pos) == id_lemma)
          return true;
      }
    }

    return false;
  },

  /**
   * Save as JSON string.
   * @private
   * @return {string} Serialized dict data as JSON string.
   */
  save_dict_as_string: function dictTrie_save_dict_as_string() {
    var self = this;

    var i = 0;

    // serialize nodes_ge1_
    var nodes_ge1_str = '';
    var nodes_ge1_num = this.nodes_ge1_.length;
    for (i = 0; i < nodes_ge1_num; i++) {
      nodes_ge1_str += this.nodes_ge1_[i].serialize();
    }

    // encode lma_idx_buf
    var lma_idx_buf_len = this.lma_idx_buf_.length;
    var lma_idx_buf_str = '';
    for (i = 0; i < lma_idx_buf_len; i++) {
      var code = this.lma_idx_buf_.charCodeAt(i);
      if (code < 32) {
        code += 256;
      }
      lma_idx_buf_str += String.fromCharCode(code);
    }

    var jsonData = {
      lma_node_num_le0_: self.lma_node_num_le0_,
      lma_node_num_ge1_: self.lma_node_num_ge1_,
      lma_idx_buf_len_: self.lma_idx_buf_len_,
      top_lmas_num_: self.top_lmas_num_,
      root_: self.root_,
      nodes_ge1_: nodes_ge1_str,
      lma_idx_buf_: lma_idx_buf_str
    };
    return JSON.stringify(jsonData);
  },

  /**
   * Load from JSON string.
   * @private
   * @param {string} json_str JSON string.
   * @return {boolean} true if successs.
   */
  load_dict_from_string: function dictTrie_load_dict_from_string(json_str) {
    if (!json_str) {
      return false;
    }

    var i = 0;

    try {
      var jsonData = JSON.parse(json_str);
      this.lma_node_num_le0_ = jsonData.lma_node_num_le0_;
      this.lma_node_num_ge1_ = jsonData.lma_node_num_ge1_;
      this.lma_idx_buf_len_ = jsonData.lma_idx_buf_len_;
      this.top_lmas_num_ = jsonData.top_lmas_num_;
      if (this.top_lmas_num_ >= this.lma_idx_buf_len_) {
        return false;
      }
      this.total_lma_num_ = this.lma_idx_buf_len_ / DictDef.kLemmaIdSize;
      this.root_ = jsonData.root_;

      // Deserialize nodes_ge1_
      this.nodes_ge1_ = [];
      var nodes_ge1_str = jsonData.nodes_ge1_;
      var pos = 0;
      while (pos < nodes_ge1_str.length) {
        var node = new DictDef.LmaNodeGE1();
        pos = node.deserialize(nodes_ge1_str, pos);
        this.nodes_ge1_.push(node);
      }

      // Decode lma_idx_buf_
      this.lma_idx_buf_ = '';
      var lma_idx_buf_len = jsonData.lma_idx_buf_.length;
      for (i = 0; i < lma_idx_buf_len; i++) {
        var code = jsonData.lma_idx_buf_.charCodeAt(i);
        if (code >= 256) {
          code -= 256;
        }
        this.lma_idx_buf_ += String.fromCharCode(code);
      }

      // Init the space for parsing.
      this.parsing_marks_ = [];
      for (i = 0; i < DictTrie.kMaxParsingMark; i++) {
        this.parsing_marks_[i] = new DictTrie.ParsingMark(0, 0);
      }
      this.mile_stones_ = [];
      for (i = 0; i < DictTrie.kMaxMileStone; i++) {
        this.mile_stones_[i] = new DictTrie.MileStone(0, 0);
      }
      this.reset_milestones(0, DictTrie.kFirstValidMileStoneHandle);
      // The quick index for the first level sons
      this.splid_le0_index_ = [];
      var last_splid = SpellingTrie.kFullSplIdStart;
      var last_pos = 0;
      for (var i = 1; i < this.lma_node_num_le0_; i++) {
        for (var splid = last_splid; splid < this.root_[i].spl_idx; splid++) {
          this.splid_le0_index_[splid - SpellingTrie.kFullSplIdStart] =
            last_pos;
        }

        this.splid_le0_index_[this.root_[i].spl_idx -
          SpellingTrie.kFullSplIdStart] = i;
        last_splid = this.root_[i].spl_idx;
        last_pos = i;
      }
      var buf_size = SpellingTrie.get_instance().get_spelling_num() + 1;
      for (var splid = last_splid + 1; splid < buf_size +
           SpellingTrie.kFullSplIdStart; splid++) {
        assert(splid - SpellingTrie.kFullSplIdStart < buf_size,
          'load_dict_from_string assertion error.');
        this.splid_le0_index_[splid - SpellingTrie.kFullSplIdStart] = last_pos +
          1;
      }
    } catch (ex) {
      debug('load_dict_from_string: ' + ex);
      return false;
    }
    return true;
  }
};

/**
 * Used to cache SearchUtility.LmaPsbItem list for half spelling ids.
 * Lpi stands for LmaPsbItem.
 * @constructor
 * @private
 */
var LpiCache = function lpiCache_constructor() {
  this.lpi_cache_ = [];
  this.lpi_cache_len_ = [];
  for (var id = 0; id < SpellingTrie.kFullSplIdStart; id++) {
    this.lpi_cache_len_[id] = 0;
  }
  var n = SpellingTrie.kFullSplIdStart * LpiCache.kMaxLpiCachePerId;
  for (var pos = 0; pos < n; pos++) {
    this.lpi_cache_[pos] = new SearchUtility.LmaPsbItem();
  }
};

/**
 * Get the singleon instance of LpiCache.
 * @return {LpiCache} The singleton instance.
 */
LpiCache.get_instance = function lpiCache_get_instance() {
  if (LpiCache.instance_ == null) {
    LpiCache.instance_ = new LpiCache();
  }
  return LpiCache.instance_;
};

/**
 * The singleton instance.
 * @private
 * @type LpiCache
 */
LpiCache.instance_ = null;

LpiCache.kMaxLpiCachePerId = 15;

LpiCache.prototype = {
  /* ==== Public ==== */

  /**
   * Test if the LPI list of the given splid  has been cached.
   * If splid is a full spelling id, it returns false, because we only cache
   * list for half ids.
   */
  is_cached: function lpiCache_is_cached(splid) {
    if (splid > SpellingTrie.kFullSplIdStart) {
      return false;
    }
    return this.lpi_cache_len_[splid] != 0;
  },

  /**
   * Put LPI list to cahce. If the length of the list, lpi_num, is longer than
   * the cache buffer. the list will be truncated, and function returns the
   * maximum length of the cache buffer.
   * Note: splid must be a half id, and lpi_items must be not NULL. The
   * caller of this function should guarantee this.
   * @param {number} splid The splid of the given LPI list.
   * @param {Array.<SearchUtility.LmaPsbItem>} lpi_items The LPI list buffer.
   * @param {number} lpi_num The length of the LPI list which could be used.
   * @return {number} The number of LPI item cached.
   */
  put_cache: function lpiCache_put_cache(splid, lpi_items, lpi_num) {
    var num = Math.min(LpiCache.kMaxLpiCachePerId, lpi_num);

    var lpi_cache_this = splid * LpiCache.kMaxLpiCachePerId;
    for (var pos = 0; pos < num; pos++) {
      this.lpi_cache_[lpi_cache_this + pos].copy(lpi_items[pos]);
    }

    this.lpi_cache_len_[splid] = num;
    return num;
  },

  /**
   * Get the cached list for the given half id.
   * Note: splid must be a half id, and lpi_items must be not NULL. The
   * caller of this function should guarantee this.
   * @param {number} splid the given half id.
   * @param {Array.<SearchUtility.LmaPsbItem>} lpi_items The LPI list buffer.
   * @param {number} lpi_max The length of the LPI list which could be used.
   * @return {number} the length of the cached buffer.
   */
  get_cache: function lpiCache_get_cache(splid, lpi_items, lpi_max) {
    var num = Math.min(this.lpi_cache_len_[splid], lpi_max);

    var lpi_cache_this = splid * LpiCache.kMaxLpiCachePerId;
    for (var pos = 0; pos < num; pos++) {
      lpi_items[pos].copy(this.lpi_cache_[lpi_cache_this + pos]);
    }
    return num;
  },

  /* ==== Private ==== */

  /**
   * @type Array.<SearchUtility.LmaPsbItem>
   */
  lpi_cache_: null,

  /**
   * @type Array.<number>
   */
  lpi_cache_len_: null
};


var DictBuilder = function dictBuilder_constructor() {
};

DictBuilder.prototype = {
  /* ==== Public ==== */

  /**
   * Build dictionary trie from the file fn_raw. File fn_validhzs provides
   * valid chars. If fn_validhzs is NULL, only chars in GB2312 will be
   * included.
   * @param {string} fn_raw The raw data file name for simplified Chinese.
   * @param {string} fn_validhzs The valid hanzi file name.
   * @param {string} fn_raw_tr The raw data file name for traditional Chinese.
   * @param {DictTrie} dict_trie The DictTrie to be built.
   * @param {function(boolean)} callback The function object that is
   *    called when the operation is finished. The boolean parameter indicates
   *    whether the dict is built successfully.
   */
  build_dict: function dictBuilder_build_dict(fn_raw, fn_validhzs, fn_raw_tr,
      dict_trie, callback) {
    var self = this;
    var isOk = false;
    function doCallback() {
      if (callback) {
        callback(isOk);
      }
    }
    if (!fn_raw || !fn_raw_tr) {
      doCallback();
      return;
    }

    // Open the raw dict files

    var rawStr = '';
    var rawStrTr = '';
    var validhzsStr = '';

    var taskQueue = new TaskQueue(
        function taskQueueOnCompleteCallback(queueData) {
      isOk = self.build_dict_internal(rawStr, validhzsStr, rawStrTr, dict_trie);
      doCallback();
    });

    var processNextWithDelay = function dictBuilder_processNextWithDelay() {
      if (typeof setTimeout != 'undefined') {
        setTimeout(function nextTask() {
          taskQueue.processNext();
        }, 0);
      } else {
        taskQueue.processNext();
      }
    };

    taskQueue.push(function readRawTask(taskQueue, taskData) {
      FileSystemService.read(fn_raw, function rawReadCallback(str) {
        rawStr = str;
        processNextWithDelay();
      });
    });

    taskQueue.push(function readRawTrTask(taskQueue, taskData) {
      FileSystemService.read(fn_raw_tr, function rawReadCallback(str) {
        rawStrTr = str;
        processNextWithDelay();
      });
    });

    if (fn_validhzs) {
      taskQueue.push(function readValidTask(taskQueue, taskData) {
        FileSystemService.read(fn_validhzs, function validReadCallback(str) {
          validhzsStr = str;
          processNextWithDelay();
        });
      });
    }

    taskQueue.processNext();
  },

  /* ==== Private ==== */

  /**
   * The raw lemma array buffer.
   * @type Array.<DictDef.LemmaEntry>
   */
  lemma_arr_: null,

  /**
   * Used to store all possible single char items.
   * Two items may have the same Hanzi while their spelling ids are different.
   * @type Array.<DictDef.SingleCharItem>
   */
  scis_: null,

  /**
   * In the tree, root's level is -1.
   * Lemma nodes for root, and level 0
   * @type Array.<DictDef.LmaNodeLE0>
   */
  lma_nodes_le0_: null,

  /**
   * Lemma nodes for layers whose levels are deeper than 0.
   * @type Array.<DictDef.LmaNodeGE1>
   */
  lma_nodes_ge1_: null,

  // Number of used lemma nodes
  lma_nds_used_num_le0_: 0,
  lma_nds_used_num_ge1_: 0,

  /**
   * Used to store homophonies' ids.
   * @type Array.<number>
   */
  homo_idx_buf_: null,

  // Number of homophonies each of which only contains one Chinese character.
  homo_idx_num_eq1_: 0,

  // Number of homophonies each of which contains more than one character.
  homo_idx_num_gt1_: 0,

  /**
   * The items with highest scores.
   * @type Array.<LemmaEntry>
   */
  top_lmas_: null,
  top_lmas_num_: 0,

  /**
   * @type SpellingTable
   */
  spl_table_: null,

  /**
   * @type SpellingParser
   */
  spl_parser_: null,

  // Used for statistics

  /**
   * @type Array.<number>
   */
  max_sonbuf_len_: null,

  /**
   * @type Array.<number>
   */
  max_homobuf_len_: null,

  /**
   * @type Array.<number>
   */
  total_son_num_: null,

  /**
   * @type Array.<number>
   */
  total_node_hasson_: null,

  /**
   * @type Array.<number>
   */
  total_sonbuf_num_: null,

  /**
   * @type Array.<number>
   */
  total_sonbuf_allnoson_: null,

  /**
   * @type Array.<number>
   */
  total_node_in_sonbuf_allnoson_: null,

  /**
   * @type Array.<number>
   */
  total_homo_num_: null,

  // Number of son buffer with only 1 son
  sonbufs_num1_: 0,

  // Number of son buffer with more 1 son;
  sonbufs_numgt1_: 0,

  total_lma_node_num_: 0,

  stat_init: function dictBuilder_stat_init() {
    this.max_sonbuf_len_ = [];
    this.max_homobuf_len_ = [];
    this.total_son_num_ = [];
    this.total_node_hasson_ = [];
    this.total_sonbuf_num_ = [];
    this.total_sonbuf_allnoson_ = [];
    this.total_node_in_sonbuf_allnoson_ = [];
    this.total_homo_num_ = [];
    for (var pos = 0; pos < DictDef.kMaxLemmaSize; pos++) {
      this.max_sonbuf_len_[pos] = 0;
      this.max_homobuf_len_[pos] = 0;
      this.total_son_num_[pos] = 0;
      this.total_node_hasson_[pos] = 0;
      this.total_sonbuf_num_[pos] = 0;
      this.total_sonbuf_allnoson_[pos] = 0;
      this.total_node_in_sonbuf_allnoson_[pos] = 0;
      this.total_homo_num_[pos] = 0;
    }

    this.sonbufs_num1_ = 0;
    this.sonbufs_numgt1_ = 0;
    this.total_lma_node_num_ = 0;
  },

  stat_print: function dictBuilder_stat_print() {
    var line = '';
    debug('------------STAT INFO-------------');
    debug('[root is layer -1]');
    debug('.. max_sonbuf_len per layer(from layer 0):');
    line = '';
    for (var i = 0; i < DictDef.kMaxLemmaSize; i++) {
      line += this.max_sonbuf_len_[i] + ', ';
    }
    debug(line + '-,');

    debug('.. max_homobuf_len per layer:   -, ');
    line = '';
    for (var i = 0; i < DictDef.kMaxLemmaSize; i++) {
      line += this.max_homobuf_len_[i] + ', ';
    }
    debug(line);

    debug('.. total_son_num per layer:  ');
    line = '';
    for (var i = 0; i < DictDef.kMaxLemmaSize; i++) {
      line += this.total_son_num_[i] + ', ';
    }
    debug(line + '-,');

    debug('.. total_node_hasson per layer:   1, ');
    line = '';
    for (var i = 0; i < DictDef.kMaxLemmaSize; i++) {
      line += this.total_node_hasson_[i] + ', ';
    }
    debug(line);

    debug('.. total_sonbuf_num per layer:   ');
    line = '';
    for (var i = 0; i < DictDef.kMaxLemmaSize; i++) {
      line += this.total_sonbuf_num_[i] + ', ';
    }
    debug(line + '-,');

    debug('.. total_sonbuf_allnoson per layer:   ');
    line = '';
    for (var i = 0; i < DictDef.kMaxLemmaSize; i++) {
      line += this.total_sonbuf_allnoson_[i] + ', ';
    }
    debug(line + '-,');

    debug('.. total_node_in_sonbuf_allnoson per layer:   ');
    line = '';
    for (var i = 0; i < DictDef.kMaxLemmaSize; i++) {
      line += this.total_node_in_sonbuf_allnoson_[i] + ', ';
    }
    debug(line + '-,');

    debug('.. total_homo_num per layer:   0, ');
    line = '';
    for (var i = 0; i < DictDef.kMaxLemmaSize; i++) {
      line += this.total_homo_num_[i] + ', ';
    }
    debug(line);

    debug('.. son buf allocation number with only 1 son: ' +
          this.sonbufs_num1_);
    debug('.. son buf allocation number with more than 1 son: ' +
          this.sonbufs_numgt1_);
    debug('.. total lemma node number: ' + (this.total_lma_node_num_ + 1));
  },

  /**
   * Build dictionary trie from raw dict string. String validhzs provides
   * valid chars. If validhzs is empty, only chars in GB2312 will be
   * included.
   * @param {string} raw The raw dict data string for simplified Chinese.
   * @param {string} validhzs The valid hanzi string.
   * @param {string} raw_tr The raw dict data string for traditional Chinese.
   * @param {DictTrie} dict_trie The DictTrie to be built.
   * @return {boolean} true if succeed.
   */
  build_dict_internal: function dictBuilder_build_dict(raw, validhzs, raw_tr,
      dict_trie) {
    if (!raw || !raw_tr) {
      debug('build_dict_internal failed. The raw dict file is empty.');
      return false;
    }

    var lemma_num = this.read_raw_dict(raw, validhzs, raw_tr, 240000);
    if (0 == lemma_num) {
      return false;
    }

    // Arrange the spelling table, and build a spelling tree
    var spl_buf = this.spl_table_.arrange();

    var spl_trie = SpellingTrie.get_instance();

    if (!spl_trie.construct(spl_buf,
                            this.spl_table_.get_score_amplifier(),
                            this.spl_table_.get_average_score())) {
      return false;
    }

    debug('spelling tree construct successfully.\n');

    // Convert the spelling string to idxs
    for (var i = 0; i < lemma_num; i++) {
      var lemma = this.lemma_arr_[i];
      var hz_str_len = lemma.hanzi_str.length;
      for (var hz_pos = 0; hz_pos < hz_str_len; hz_pos++) {
        var spl_idxs = [0, 0];
        var spl_start_pos = [0, 0, 0];
        var is_pre = true;
        var spl_idx_num = 0;
        var ret = this.spl_parser_.splstr_to_idxs(
          lemma.pinyin_str[hz_pos]);
        is_pre = ret.last_is_pre;
        spl_idxs = ret.spl_idx;
        spl_start_pos = ret.start_pos;

        if (spl_trie.is_half_id(spl_idxs[0])) {
          var ret = spl_trie.half_to_full(spl_idxs[0]);
          var num = ret.num;
          spl_idxs[0] = ret.spl_id_start;
        }

        lemma.spl_idx_arr[hz_pos] = spl_idxs[0];
      }
    }

    // Sort the lemma items according to the hanzi, and give each unique item a
    // id
    this.sort_lemmas_by_hz();

    var scis_num = this.build_scis();

    // Construct the dict list
    dict_trie.dict_list_ = new DictList();
    var dl_success =
      dict_trie.dict_list_.init_list(this.scis_, this.lemma_arr_);
    assert(dl_success, 'build_dict_internal assertion error.' +
           'Failed to initialize DictList');

    // Construct the NGram information
    var ngram = NGram.get_instance();
    ngram.build_unigram(this.lemma_arr_);

    // sort the lemma items according to the spelling idx string
    this.lemma_arr_.sort(function compare_py(p1, p2) {
      return SearchUtility.compare(p1.spl_idx_arr, p2.spl_idx_arr) ||
        SearchUtility.compare(p2.freq, p1.freq);
    });

    this.get_top_lemmas();

    this.stat_init();

    this.lma_nds_used_num_le0_ = 1;  // The root node
    var dt_success = this.construct_subset(this.lma_nodes_le0_[0],
                                       this.lemma_arr_, 0, lemma_num, 0);
    if (!dt_success) {
      free_resource();
      return false;
    }

    this.stat_print();

    // Remove empty nodes.
    this.lma_nodes_le0_.length = this.lma_nds_used_num_le0_;
    this.lma_nodes_ge1_.length = this.lma_nds_used_num_ge1_;
    this.homo_idx_buf_.length = this.homo_idx_num_eq1_ + this.homo_idx_num_gt1_;

    // Move the node data and homo data to the DictTrie
    dict_trie.root_ = this.lma_nodes_le0_;
    dict_trie.nodes_ge1_ = this.lma_nodes_ge1_;
    var lma_idx_num = this.homo_idx_num_eq1_ + this.homo_idx_num_gt1_ +
      this.top_lmas_num_;
    dict_trie.lma_idx_buf_ = '';
    dict_trie.lma_node_num_le0_ = this.lma_nds_used_num_le0_;
    dict_trie.lma_node_num_ge1_ = this.lma_nds_used_num_ge1_;
    dict_trie.lma_idx_buf_len_ = lma_idx_num * DictDef.kLemmaIdSize;
    dict_trie.top_lmas_num_ = this.top_lmas_num_;

    dict_trie.root_ = this.lma_nodes_le0_;
    dict_trie.nodes_ge1_ = this.lma_nodes_ge1_;

    var n = this.homo_idx_buf_.length;
    for (var pos = 0; pos < n; pos++) {
      dict_trie.lma_idx_buf_ += this.id_to_charbuf(this.homo_idx_buf_[pos]);
    }

    n = this.top_lmas_num_;
    for (var pos = 0; pos < n; pos++) {
      var idx = this.top_lmas_[pos].idx_by_hz;
      dict_trie.lma_idx_buf_ += this.id_to_charbuf(idx);
    }

    debug('homo_idx_num_eq1_: ' + this.homo_idx_num_eq1_);
    debug('homo_idx_num_gt1_: ' + this.homo_idx_num_gt1_);
    debug('top_lmas_num_: ' + this.top_lmas_num_);

    debug('Building dict succeeds.');
    return dt_success;
  },

  /**
   * Convert id to char array.
   */
  id_to_charbuf: function dictBuilder_id_to_charbuf(id) {
    var str = '';
    for (var pos = 0; pos < DictDef.kLemmaIdSize; pos++) {
      str += String.fromCharCode((id >> (pos * 8)) & 0xff);
    }
    return str;
  },

  /**
   * Update the offset of sons for a node.
   * @param {DictDef.LmaNodeGE1} node The node to be updated.
   * @param {number} offset The offset.
   */
  set_son_offset: function dictBuilder_set_son_offset(node, offset) {
    node.son_1st_off_l = offset;
    node.son_1st_off_h = offset >> 16;
  },

  /**
   * Update the offset of homophonies' ids for a node.
   * @param {DictDef.LmaNodeGE1} node The node to be updated.
   * @param {number} offset The offset.
   */
  set_homo_id_buf_offset:
      function dictBuilder_set_homo_id_buf_offset(node, offset) {
    node.homo_idx_buf_off_l = offset;
    node.homo_idx_buf_off_h = offset >> 16;
  },

  /**
   * Format a speling string.
   * All spelling strings will be converted to upper case, except that
   * spellings started with "ZH"/"CH"/"SH" will be converted to
   * "Zh"/"Ch"/"Sh"
   */
  format_spelling_str: function dictBuilder_format_spelling_str(spl_str) {
    if (!spl_str) {
      return '';
    }
    var formatted = spl_str.trim().toUpperCase().replace(/^([CSZ])H/, '$1h');
    return formatted;
  },

  /**
   * Sort the lemma_arr by the hanzi string, and give each of unique items
   * a id. Why we need to sort the lemma list according to their Hanzi string
   * is to find items started by a given prefix string to do prediction.
   * Actually, the single char items are be in other order, for example,
   * in spelling id order, etc.
   * @return {number} Return value is next un-allocated idx available.
   */
  sort_lemmas_by_hz: function dictBuilder_sort_lemmas_by_hz() {
    if (null === this.lemma_arr_) {
      return 0;
    }

    var lemma_num = this.lemma_arr_.length;
    if (0 == lemma_num) {
      return 0;
    }

    this.lemma_arr_.sort(function cmp_lemma_entry_hzs(a, b) {
      var strA = a.hanzi_str;
      var strB = b.hanzi_str;
      return SearchUtility.compare(strA.length, strB.length) ||
        SearchUtility.compare(strA, strB);
    });

    this.lemma_arr_[0].idx_by_hz = 1;
    var idx_max = 1;
    for (var i = 1; i < lemma_num; i++) {
      idx_max++;
      this.lemma_arr_[i].idx_by_hz = idx_max;
    }
    return idx_max + 1;
  },


  /**
   * Build the SingleCharItem list, and fill the hanzi_scis_ids in the
   * lemma buffer lemma_arr_.
   * This function should be called after the lemma array is ready.
   * @return {number} Return the number of unique SingleCharItem elements.
   */
  build_scis: function dictBuilder_build_scis() {
    debug('build_scis');
    var lemma_num = this.lemma_arr_ === null ? 0 : this.lemma_arr_.length;
    var scis_num = this.scis_ === null ? 0 : this.scis_.length;
    if (null === this.scis_ || lemma_num * DictDef.kMaxLemmaSize > scis_num)
      return 0;

    var spl_trie = SpellingTrie.get_instance();
    var sci = null;

    // This first one is blank, because id 0 is invalid.
    sci = new DictDef.SingleCharItem();
    this.scis_[0] = sci;
    scis_num = 1;

    // Copy the hanzis to the buffer
    for (var pos = 0; pos < lemma_num; pos++) {
      var lemma = this.lemma_arr_[pos];
      var hz_num = lemma.hanzi_str.length;
      for (var hzpos = 0; hzpos < hz_num; hzpos++) {
        sci = new DictDef.SingleCharItem();
        sci.hz = lemma.hanzi_str.charAt(hzpos);
        sci.hz_tr = lemma.hanzi_str_tr.charAt(hzpos);
        sci.splid.full_splid = lemma.spl_idx_arr[hzpos];
        sci.splid.half_splid =
            spl_trie.full_to_half(lemma.spl_idx_arr[hzpos]);
        if (1 == hz_num) {
          sci.freq = lemma.freq;
        } else {
          sci.freq = 0.000001;
        }
        this.scis_[scis_num] = sci;
        scis_num++;
      }
    }

    // remove empty elements
    this.scis_.length = scis_num;

    this.scis_.sort(function cmp_scis_hz_splid_freq(s1, s2) {
      return SearchUtility.compare(s1.hz, s2.hz) ||
        SearchUtility.compare(s1.splid.half_splid, s2.splid.half_splid) ||
        SearchUtility.compare(s1.splid.full_splid, s2.splid.full_splid) ||
        SearchUtility.compare(s2.freq, s1.freq);
    });

    // Remove repeated items
    var unique_scis_num = 1;
    for (var pos = 1; pos < scis_num; pos++) {
      if (this.scis_[pos].hz == this.scis_[pos - 1].hz &&
          this.scis_[pos].splid.full_splid ==
          this.scis_[pos - 1].splid.full_splid) {
        continue;
      }
      this.scis_[unique_scis_num].copy(this.scis_[pos]);
      unique_scis_num++;
    }
    this.scis_.length = unique_scis_num;
    scis_num = unique_scis_num;

    // Update the lemma list.
    for (var pos = 0; pos < lemma_num; pos++) {
      var lemma = this.lemma_arr_[pos];
      var hz_num = lemma.hanzi_str.length;
      for (var hzpos = 0; hzpos < hz_num; hzpos++) {
        var key = new DictDef.SingleCharItem();
        key.hz = lemma.hanzi_str[hzpos];
        key.splid.full_splid = lemma.spl_idx_arr[hzpos];
        key.splid.half_splid = spl_trie.full_to_half(key.splid.full_splid);

        var found = MyStdlib.mybsearchArray(key, this.scis_, 0, unique_scis_num,
          function cmp_scis_hz_splid(s1, s2) {
            return SearchUtility.compare(s1.hz, s2.hz) ||
            SearchUtility.compare(s1.splid.half_splid, s2.splid.half_splid) ||
            SearchUtility.compare(s1.splid.full_splid, s2.splid.full_splid);
          });

        assert(found != -1, 'build_scis assertion error. Cannot find ' +
               JSON.stringify(key));

        this.lemma_arr_[pos].hanzi_scis_ids[hzpos] = found;
        this.lemma_arr_[pos].spl_idx_arr[hzpos] =
          this.scis_[found].splid.full_splid;
      }
    }

    return scis_num;
  },

  /** Construct a subtree using a subset of the spelling array (from
   * item_star to item_end)
   * @param {DictDef.LmaNodeLE0 | DictDef.LmaNodeGE1} parent
   *    The parent node to update the necessary information.
   * @param {Array.<LemmaEntry>} lemma_arr The lemma array.
   * @param {number} item_start The start position of the lemma array.
   * @param {number} item_end The stop position of the lemma arry.
   * @param {number} level The tree level.
   */
  construct_subset: function dictBuilder_construct_subset(parent, lemma_arr,
                        item_start, item_end, level) {
    if (level >= DictDef.kMaxLemmaSize || item_end <= item_start) {
      return false;
    }

    // 1. Scan for how many sons
    var parent_son_num = 0;

    var lma_last_start = lemma_arr[item_start];
    var spl_idx_node = lma_last_start.spl_idx_arr[level];

    // Scan for how many sons to be allocaed
    for (var i = item_start + 1; i < item_end; i++) {
      var lma_current = lemma_arr[i];
      var spl_idx_current = lma_current.spl_idx_arr[level];
      if (spl_idx_current != spl_idx_node) {
        parent_son_num++;
        spl_idx_node = spl_idx_current;
      }
    }
    parent_son_num++;

    // Use to indicate whether all nodes of this layer have no son.
    var allson_noson = true;

    assert(level < DictDef.kMaxLemmaSize,
           'construct_subset assertion error.' + 'Invliad level: ' + level);
    if (parent_son_num > this.max_sonbuf_len_[level]) {
      this.max_sonbuf_len_[level] = parent_son_num;
    }

    this.total_son_num_[level] += parent_son_num;
    this.total_sonbuf_num_[level] += 1;

    if (parent_son_num == 1) {
      this.sonbufs_num1_++;
    } else {
      this.sonbufs_numgt1_++;
    }
    this.total_lma_node_num_ += parent_son_num;

    // 2. Update the parent's information
    //    Update the parent's son list;
    var son_1st_le0 = 0;  // only one of le0 or ge1 is used
    var son_1st_ge1 = 0;  // only one of le0 or ge1 is used.
    if (0 == level) {
      // the parent is root and of type DictDef.LmaNodeLE0
      parent.son_1st_off =
        this.lma_nds_used_num_le0_;
      son_1st_le0 = this.lma_nds_used_num_le0_;
      this.lma_nds_used_num_le0_ += parent_son_num;

      assert(parent_son_num <= 65535);
      parent.num_of_son = parent_son_num;
    } else if (1 == level) {
      // the parent is a son of root and of type DictDef.LmaNodeLE0
      parent.son_1st_off =
        this.lma_nds_used_num_ge1_;
      son_1st_ge1 = this.lma_nds_used_num_ge1_;
      this.lma_nds_used_num_ge1_ += parent_son_num;

      assert(parent_son_num <= 65535);
      parent.num_of_son = parent_son_num;
    } else {
      // The parent of type DictDef.LmaNodeGE1
      this.set_son_offset(parent, this.lma_nds_used_num_ge1_);
      son_1st_ge1 = this.lma_nds_used_num_ge1_;
      this.lma_nds_used_num_ge1_ += parent_son_num;

      assert(parent_son_num <= 255);
      parent.num_of_son = parent_son_num;
    }

    // 3. Now begin to construct the son one by one
    var son_pos = 0;

    lma_last_start = lemma_arr[item_start];
    spl_idx_node = lma_last_start.spl_idx_arr[level];

    var homo_num = 0;
    if (lma_last_start.spl_idx_arr[level + 1] == 0) {
      homo_num = 1;
    }

    var item_start_next = item_start;

    for (var i = item_start + 1; i < item_end; i++) {
      var lma_current = lemma_arr[i];
      var spl_idx_current = lma_current.spl_idx_arr[level];

      if (spl_idx_current == spl_idx_node) {
        if (lma_current.spl_idx_arr[level + 1] == 0) {
          homo_num++;
        }
      } else {
        // Construct a node
        var node_cur_le0 = null;  // only one of them is valid
        var node_cur_ge1 = null;
        if (0 == level) {
          node_cur_le0 = this.lma_nodes_le0_[son_1st_le0 + son_pos];
          node_cur_le0.spl_idx = spl_idx_node;
          node_cur_le0.homo_idx_buf_off =
            this.homo_idx_num_eq1_ + this.homo_idx_num_gt1_;
          node_cur_le0.son_1st_off = 0;
          this.homo_idx_num_eq1_ += homo_num;
        } else {
          node_cur_ge1 = this.lma_nodes_ge1_[son_1st_ge1 + son_pos];
          node_cur_ge1.spl_idx = spl_idx_node;

          this.set_homo_id_buf_offset(node_cur_ge1,
              (this.homo_idx_num_eq1_ + this.homo_idx_num_gt1_));
          this.set_son_offset(node_cur_ge1, 0);
          this.homo_idx_num_gt1_ += homo_num;
        }

        if (homo_num > 0) {
          var idx_offset = this.homo_idx_num_eq1_ + this.homo_idx_num_gt1_ -
            homo_num;
          if (0 == level) {
            assert(homo_num <= 65535);
            node_cur_le0.num_of_homo = homo_num;
          } else {
            assert(homo_num <= 255);
            node_cur_ge1.num_of_homo = homo_num;
          }

          for (var homo_pos = 0; homo_pos < homo_num; homo_pos++) {
            this.homo_idx_buf_[idx_offset + homo_pos] =
              lemma_arr[item_start_next + homo_pos].idx_by_hz;
          }

          if (homo_num > this.max_homobuf_len_[level]) {
            this.max_homobuf_len_[level] = homo_num;
          }

          this.total_homo_num_[level] += homo_num;
        }

        if (i - item_start_next > homo_num) {
          var next_parent;
          if (0 == level) {
            next_parent = node_cur_le0;
          } else {
            next_parent = node_cur_ge1;
          }
          this.construct_subset(next_parent, lemma_arr,
                           item_start_next + homo_num, i, level + 1);

          this.total_node_hasson_[level] += 1;
          allson_noson = false;
        }

        // for the next son
        lma_last_start = lma_current;
        spl_idx_node = spl_idx_current;
        item_start_next = i;
        homo_num = 0;
        if (lma_current.spl_idx_arr[level + 1] == 0) {
          homo_num = 1;
        }

        son_pos++;
      }
    }

    // 4. The last one to construct
    var node_cur_le0 = null;  // only one of them is valid
    var node_cur_ge1 = null;
    if (0 == level) {
      node_cur_le0 = this.lma_nodes_le0_[son_1st_le0 + son_pos];
      node_cur_le0.spl_idx = spl_idx_node;
      node_cur_le0.homo_idx_buf_off =
        this.homo_idx_num_eq1_ + this.homo_idx_num_gt1_;
      node_cur_le0.son_1st_off = 0;
      this.homo_idx_num_eq1_ += homo_num;
    } else {
      node_cur_ge1 = this.lma_nodes_ge1_[son_1st_ge1 + son_pos];
      node_cur_ge1.spl_idx = spl_idx_node;

      this.set_homo_id_buf_offset(node_cur_ge1,
                             (this.homo_idx_num_eq1_ + this.homo_idx_num_gt1_));
      this.set_son_offset(node_cur_ge1, 0);
      this.homo_idx_num_gt1_ += homo_num;
    }

    if (homo_num > 0) {
      var idx_offset = this.homo_idx_num_eq1_ + this.homo_idx_num_gt1_ -
        homo_num;
      if (0 == level) {
        assert(homo_num <= 65535);
        node_cur_le0.num_of_homo = homo_num;
      } else {
        assert(homo_num <= 255);
        node_cur_ge1.num_of_homo = homo_num;
      }

      for (var homo_pos = 0; homo_pos < homo_num; homo_pos++) {
        this.homo_idx_buf_[idx_offset + homo_pos] =
          lemma_arr[item_start_next + homo_pos].idx_by_hz;
      }

      if (homo_num > this.max_homobuf_len_[level]) {
        this.max_homobuf_len_[level] = homo_num;
      }

      this.total_homo_num_[level] += homo_num;
    }

    if (item_end - item_start_next > homo_num) {
      var next_parent;
      if (0 == level) {
        next_parent = node_cur_le0;
      } else {
        next_parent = node_cur_ge1;
      }
      this.construct_subset(next_parent, lemma_arr,
                       item_start_next + homo_num, item_end, level + 1);

      this.total_node_hasson_[level] += 1;
      allson_noson = false;

    }

    if (allson_noson) {
      this.total_sonbuf_allnoson_[level] += 1;
      this.total_node_in_sonbuf_allnoson_[level] += parent_son_num;
    }

    assert(son_pos + 1 == parent_son_num);
    return true;
  },

  /**
   * Read valid Chinese Hanzis list from the given file content.
   * num is used to return number of chars.
   * @return {string} The sorted valid Hanzis string.
   */
  read_valid_hanzis: function dictBuilder_read_valid_hanzis(validhzs) {
    if (!validhzs) {
      return '';
    }
    return validhzs.split('').sort().join('');
  },

  /**
   * Read a raw dictionary. max_item is the maximum number of items. If there
   * are more items in the ditionary, only the first max_item will be read.
   * @return {number} The number of items successfully read from the file.
   */
  read_raw_dict: function dictBuilder_read_raw_dict(raw, validhzs, raw_tr,
      max_item) {
    if (!raw) return 0;

    // Read the number of lemmas in the file
    var lemma_num = 240000;

    // allocate resource required
    this.alloc_resource(lemma_num);

    // Read the valid Hanzi list.
    var valid_hzs = this.read_valid_hanzis(validhzs);

    // Split raw into lines
    var lines = raw.match(/^.*([\r\n]+|$)/gm);
    var lines_tr = raw_tr.match(/^.*([\r\n]+|$)/gm);
    var line_num = lines.length;
    assert(line_num == lines_tr.length, 'read_raw_dict assertion error.');

    lemma_num = 0;

    // Begin parsing the lemma entries
    for (var i = 0; i < line_num; i++) {

      // The tokens of each line are seperated by white spaces.
      var tokens = lines[i].split(/\s+/g);
      var tokens_tr = lines_tr[i].split(/\s+/g);
      var lemma = new DictDef.LemmaEntry();

      // Get the Hanzi string
      var hanzi = tokens[0].trim();
      var hanzi_tr = tokens_tr[0].trim();
      if (hanzi_tr.length != hanzi.length) {
        debug(StringUtils.format('Cannot convert simplified Chinese {0} to ' +
            'traditional Chinese {1}', hanzi, hanzi_tr));
        hanzi_tr = hanzi;
      }
      var lemma_size = hanzi.length;
      if (lemma_size > DictDef.kMaxLemmaSize) {
        debug('Drop the lemma whose size exceeds the limit: ' + hanzi);
        continue;
      }

      lemma.hanzi_str = hanzi;
      lemma.hanzi_str_tr = hanzi_tr;

      // Get the freq
      var freq = parseFloat(tokens[1]);
      lemma.freq = freq;

      if (lemma_size > 1 && freq < 60) {
        debug('Drop ' + hanzi + ' whose freq < 60 and length > 1.');
        continue;
      }

      // Get GBK mark. If no valid Hanzi list available, all items which
      // contains GBK characters will be discarded. Otherwise, all items
      // which contains characters outside of the valid Hanzi list will
      // be discarded.
      var gbk_flag = parseInt(tokens[2]);

      if (!valid_hzs) {
        if (0 != gbk_flag) {
          debug('Drop lemma containing non-gbk characters: ' + hanzi);
          continue;
        }
      } else {
        if (!this.str_in_hanzis_list(valid_hzs, hanzi)) {
          debug('Drop lemma containing invalid characters: ' + hanzi);
          continue;
        }
      }

      // Get spelling String
      if (tokens.length < 3 + lemma_size) {
        debug('Invalid spelling string ' + tokens + ' for ' + hanzi);
        continue;
      }
      var spelling_not_support = false;
      for (var hz_pos = 0; hz_pos < lemma_size;
           hz_pos++) {
        // Get a Pinyin
        var pinyin_str = this.format_spelling_str(tokens[3 + hz_pos].trim());
        lemma.pinyin_str[hz_pos] = pinyin_str;
        // Put the pinyin to the spelling table
        if (!this.spl_table_.put_spelling(pinyin_str, freq)) {
          spelling_not_support = true;
          break;
        }
      }

      if (spelling_not_support) {
        debug('The spelling string of ' + hanzi + ' isn\'t valid: ' + tokens);
        continue;
      }
      this.lemma_arr_[lemma_num] = lemma;
      lemma_num++;
    }

    debug('read succesfully, lemma num: ' + lemma_num);

    return lemma_num;
  },

  // Try to find if a character is in hzs buffer.
  hz_in_hanzis_list: function dictBuilder_hz_in_hanzis_list(hzs, hz) {
    if (!hzs) {
      return false;
    }

    var found = MyStdlib.mybsearchStr(hz, hzs, 0, hzs.length, 1, null);
    if (-1 == found) {
      return false;
    }

    return true;
  },

  // Try to find if all characters in str are in hzs buffer.
  str_in_hanzis_list: function dictBuilder_str_in_hanzis_list(hzs, str) {
    if (!hzs || !str) {
      return false;
    }

    var str_len = str.length;
    for (var pos = 0; pos < str_len; pos++) {
      if (!this.hz_in_hanzis_list(hzs, str.charAt(pos))) {
        return false;
      }
    }
    return true;
  },

  // Get these lemmas with toppest scores.
  get_top_lemmas: function dictBuilder_get_top_lemmas() {
    this.top_lmas_num_ = 0;
    if (null === this.lemma_arr_)
      return;
    var lemma_num = this.lemma_arr_.length;

    for (var pos = 0; pos < lemma_num; pos++) {
      if (0 == this.top_lmas_num_) {
        this.top_lmas_[0] = this.lemma_arr_[pos];
        this.top_lmas_num_ = 1;
        continue;
      }

      if (this.lemma_arr_[pos].freq >
          this.top_lmas_[this.top_lmas_num_ - 1].freq) {
        if (DictDef.kTopScoreLemmaNum > this.top_lmas_num_) {
          this.top_lmas_num_ += 1;
        }

        var move_pos;
        for (move_pos = this.top_lmas_num_ - 1; move_pos > 0; move_pos--) {
          this.top_lmas_[move_pos] = this.top_lmas_[move_pos - 1];
          if (0 == move_pos - 1 ||
              (move_pos - 1 > 0 &&
               this.top_lmas_[move_pos - 2].freq > this.lemma_arr_[pos].freq)) {
            break;
          }
        }
        assert(move_pos > 0,
               'get_top_lemmas assert error. move_pos:' + move_pos);
        this.top_lmas_[move_pos - 1] = this.lemma_arr_[pos];
      } else if (DictDef.kTopScoreLemmaNum > this.top_lmas_num_) {
        this.top_lmas_[this.top_lmas_num_] = this.lemma_arr_[pos];
        this.top_lmas_num_ += 1;
      }
    }

    debug('\n------Top Lemmas------------------\n');
    for (var pos = 0; pos < this.top_lmas_num_; pos++) {
      debug(StringUtils.format('--{0}, idx:{1}, score:{2}', pos,
                               this.top_lmas_[pos].idx_by_hz,
                               this.top_lmas_[pos].freq));
    }
  },

  /**
   * Allocate resource to build dictionary.
   * lma_num is the number of items to be loaded.
   */
  alloc_resource: function dictBuilder_alloc_resource(lma_num) {
    if (0 == lma_num)
      return;

    var lemma_num = lma_num;
    this.lemma_arr_ = [];

    this.top_lmas_num_ = 0;
    this.top_lmas_ = [];
    for (var i = 0; i < DictDef.kTopScoreLemmaNum; i++) {
      this.top_lmas_[i] = new DictDef.LemmaEntry();
    }

    this.scis_ = [];

    // The root and first level nodes is less than DictDef.kMaxSpellingNum + 1
    this.lma_nds_used_num_le0_ = 0;
    this.lma_nodes_le0_ = [];
    for (var i = 0; i < DictDef.kMaxSpellingNum; i++) {
      this.lma_nodes_le0_[i] = new DictDef.LmaNodeLE0();
    }

    // Other nodes is less than lemma_num
    this.lma_nds_used_num_ge1_ = 0;
    this.lma_nodes_ge1_ = [];
    for (var i = 0; i < lemma_num; i++) {
      this.lma_nodes_ge1_[i] = new DictDef.LmaNodeGE1();
    }

    this.homo_idx_buf_ = [];
    this.spl_table_ = new SpellingTable();
    this.spl_parser_ = new SpellingParser();
    this.spl_table_.init_table(DictDef.kMaxPinyinSize,
                               DictDef.kSplTableHashLen, true);
  }
};

var UserDict = function userDict_constructor() {
  this.dict_info_ = new UserDict.UserDictInfo();
  if (UserDict.CACHE_ENABLED) {
    this.cache_init();
  }
};

UserDict.CACHE_ENABLED = false;
UserDict.PREDICT_ENABLED = true;

// In-Memory-Only flag for each lemma
UserDict.kUserDictLemmaFlagRemove = 1;

// Highest bit in offset tells whether corresponding lemma is removed
UserDict.kUserDictOffsetFlagRemove = (1 << 31);

// Maximum possible for the offset
UserDict.kUserDictOffsetMask = 0xffffffff;

// Bit width for last modified time, from 1 to 16
UserDict.kUserDictLMTBitWidth = 16;

// Granularity for last modified time in second
UserDict.kUserDictLMTGranularity = 60 * 60 * 24 * 7;
// Maximum frequency count
UserDict.kUserDictMaxFrequency = 0xFFFF;

UserDict.kUserDictLMTSince = new Date(2012, 1, 1, 0, 0, 0).getTime();

// Be sure size is 4xN
UserDict.UserDictInfo = function userDictInfo_constructor() {
  this.version = UserDict.kUserDictVersion;
  this.reclaim_ratio = 0;
  this.limit_lemma_count = 0;
  this.lemma_count = 0;
  this.free_count = 0;
  this.total_nfreq = 0;
};

UserDict.UserDictInfo.prototype = {
  /**
   * The dict version.
   * @type {number}
   */
  version: 0,

  /**
   * When limitation reached, how much percentage will be reclaimed (1 ~ 100)
   */
  reclaim_ratio: 0,

  /**
   * maximum lemma count, 0 means no limitation
   */
  limit_lemma_count: 0,

  /**
   * Total lemma count including deleted and inuse
   * Also indicate offsets_ size
   */
  lemma_count: 0,

  /**
   * Freed lemma count
   */
  free_count: 0,

  /**
   * Total lemma count.
   * @type {number}
   */
  total_nfreq: 0
};

UserDict.kUserDictVersion = 0x00000001;

UserDict.kUserDictPreAlloc = 32;
UserDict.kUserDictAverageNchar = 8;

/**
 * @enum
 */
UserDict.UserDictState = {
  // Keep in order
  USER_DICT_NONE: 0,
  // The dict in memory is the same with that in the file.
  USER_DICT_SYNC: 1,
  USER_DICT_SCORE_DIRTY: 2,
  USER_DICT_OFFSET_DIRTY: 3,
  USER_DICT_LEMMA_DIRTY: 4,
  USER_DICT_DEFRAGMENTED: 5
};

UserDict.UserDictSearchable = function userDictSearchable_constructor() {
  this.splid_start = [];
  this.splid_count = [];
  this.signature = [];
  for (var i = 0; i < DictDef.kMaxLemmaSize; i++) {
    this.splid_start[i] = 0;
    this.splid_count[i] = 0;
    if (i % 4 == 0) {
      this.signature[i / 4] = 0;
    }
  }
};

UserDict.UserDictSearchable.prototype = {
  splids_len: 0,

  /**
   * The length is DictDef.kMaxLemmaSize.
   * @type Array.<number>
   */
  splid_start: null,

  /**
   * The length is DictDef.kMaxLemmaSize.
   * @type Array.<number>
   */
  splid_count: null,

  /**
   * Compact inital letters for both FuzzyCompareSpellId and cache system
   * The length is DictDef.kMaxLemmaSize / 4.
   * Each element of the signature is a 32-bit number, while the spelling char
   * code is 8-bit number. So 4 spelling IDs can be compacted into one
   * signature number.
   * @type Array.<number>
   */
  signature: null
};

/**
 * @enum
 */
UserDict.UserDictCacheType = {
  USER_DICT_CACHE: 0,
  USER_DICT_MISS_CACHE: 1
};

UserDict.kUserDictCacheSize = 4;
UserDict.kUserDictMissCacheSize = DictDef.kMaxLemmaSize - 1;

UserDict.UserDictMissCache = function userDictMissCache_constructor() {
  this.signatures = [];
  for (var i = 0; i < UserDict.kUserDictMissCacheSize; i++) {
    this.signatures[i] = [];
    for (var j = 0; j < DictDef.kMaxLemmaSize / 4; j++) {
      this.signatures[i][j] = 0;
    }
  }
};

UserDict.UserDictMissCache.prototype = {
  /**
   * @type Array.<Array.<number>>
   */
  signatures: null,

  head: 0,

  tail: 0
};

UserDict.UserDictCache = function userDictCache_constructor() {
  this.signatures = [];
  for (var i = 0; i < UserDict.kUserDictCacheSize; i++) {
    this.signatures[i] = [];
    for (var j = 0; j < DictDef.kMaxLemmaSize / 4; j++) {
      this.signatures[i][j] = 0;
    }
  }

  this.offsets = [];
  this.lengths = [];
  for (var i = 0; i < UserDict.kUserDictCacheSize; i++) {
    this.offsets[i] = 0;
    this.lengths[i] = 0;
  }
};

UserDict.UserDictCache.prototype = {
  /**
   * @type Array.<Array.<number>>
   */
  signatures: null, //[kUserDictCacheSize][kMaxLemmaSize / 4];

  /**
   * The length is UserDict.kUserDictCacheSize
   * @type Array.<number>
   */
  offsets: null,

  /**
   * The length is UserDict.kUserDictCacheSize
   * @type Array.<number>
   */
  lengths: null,

  // Ring buffer
  head: 0,
  tail: 0
};

UserDict.UserDictScoreOffsetPair =
    function userDictScoreOffsetPair_constructor() {
};

UserDict.UserDictScoreOffsetPair.prototype = {
  score: 0,
  offset_index: 0
};

UserDict.Lemma = function lemma_constructor() {
  this.splid_arr = [];
};

UserDict.Lemma.prototype = {
  flag: 0,

  /**
   * Simplified hanzi string.
   * @type string.
   */
  hanzi_str: '',

  /**
   * Traditional hanzi string.
   * @type string.
   */
  hanzi_str_tr: '',

  /**
   * The spelling IDs of the lemma.
   * @type Array.<number>
   */
  splid_arr: null
};

UserDict.prototype = {
  __proto__: IAtomDictBase,

  /* ==== Public ==== */

  /**
   * The format of the user dict file is:
   *    {info: UserDict.UserDictInfo,
   *    lemmas: Array.<UserDict.Lemma>,
   *    predicts: Array.<number>,
   *    scores: Array.<number>}
   * @override
   */
  load_dict: function userDict_load(file_name, start_id, end_id, callback) {
    debug('UserDict#load_dict: ' + file_name);
    var self = this;
    var isOk = false;
    var doCallback = function load_doCallback() {
      if (callback) {
        callback(isOk);
      }
    };
    this.dict_file_ = file_name;
    if (!file_name) {
      doCallback();
      return;
    }

    this.start_id_ = start_id;

    var dictJson = null;

    var taskQueue = new TaskQueue(
        function load_taskQueueOnCompleteCallback(queueData) {
      isOk = self.load(dictJson, start_id);
      doCallback();
    });

    var processNextWithDelay =
        function load_rocessNextWithDelay() {
      if (typeof setTimeout != 'undefined') {
        setTimeout(function nextTask() {
          taskQueue.processNext();
        }, 0);
      } else {
        taskQueue.processNext();
      }
    };

    taskQueue.push(function openUserDictFile(taskQueue, taskData) {
      // Open the raw dict files
      FileSystemService.read(file_name,
          function readUserDictFileCallback(str) {
        try {
          dictJson = JSON.parse(str);
        } catch (ex) {}
        if (!dictJson || !self.validate(dictJson)) {
          dictJson = self.reset(file_name, function resetCallback(json) {
            dictJson = json;
            processNextWithDelay();
          });
        } else {
          processNextWithDelay();
        }
      });
    });

    taskQueue.processNext();
  },

  /**
   * @override
   */
  close_dict: function userDict_close_dict(callback) {
    debug('UserDict#close_dict');
    var self = this;
    var isOk = false;
    var doCallback = function close_doCallback() {
      if (callback) {
        callback(isOk);
      }
    };
    if (this.state_ == UserDict.UserDictState.USER_DICT_NONE) {
      doCallback();
      return;
    }

    var dictStr = '';

    var taskQueue = new TaskQueue(
        function close_taskQueueOnCompleteCallback(queueData) {
      this.lemmas_ = [];
      this.offsets_by_id_ = [];
      this.scores_ = [];
      this.ids_ = [];
      this.predicts_ = [];

      this.dict_file_ = '';
      this.dict_info_ = new UserDict.UserDictInfo();
      this.lemma_count_left_ = 0;
      this.state_ = UserDict.UserDictState.USER_DICT_NONE;

      doCallback();
    });

    var processNextWithDelay =
        function close_rocessNextWithDelay() {
      if (typeof setTimeout != 'undefined') {
        setTimeout(function nextTask() {
          taskQueue.processNext();
        }, 0);
      } else {
        taskQueue.processNext();
      }
    };

    // If dictionary is written back by others,
    // we can not simply write back here
    // To do a safe flush, we have to discard all newly added
    // lemmas and try to reload dict file.
    if (this.state_ != UserDict.UserDictState.USER_DICT_SYNC &&
        this.load_time_ > this.g_last_update_) {
      taskQueue.push(function prepareUserDictFile(taskQueue, taskData) {
        dictStr = JSON.stringify(self.write_back());
        processNextWithDelay();
      });
      taskQueue.push(function userDict_writeUserDictFile(taskQueue, taskData) {
        // Open the raw dict files
        FileSystemService.write(self.dict_file_, dictStr,
            function close_writeCallback(success) {
          isOk = success;
          processNextWithDelay();
        });
      });
    } else {
      isOk = true;
    }

    taskQueue.processNext();
  },

  /**
   * @override
   */
  number_of_lemmas: function userDict_number_of_lemmas() {
    return this.dict_info_.lemma_count;
  },

  /**
   * @override
   */
  reset_milestones: function userDict_reset_milestones(from_step, from_handle) {
    return;
  },

  /**
   * @override
   */
  extend_dict: function userDict_extend_dict(from_handle, dep, lpi_items, start,
                                             lpi_max) {
    var ret = {handle: 0, lpi_num: 0};
    if (this.is_valid_state() == false) {
      return ret;
    }

    var r = this._get_lpis(dep.splids.slice(0, dep.splids_extended + 1),
                                 lpi_items, start, lpi_max);
    var lpi_num = r.num;
    var need_extend = r.need_extend;
    ret.handle = (lpi_num > 0 || need_extend) ? 1 : 0;
    ret.lpi_num = lpi_num;
    return ret;
  },

  /**
   * @override
   */
  get_lpis: function userDict_get_lpis(splid_str, lpi_items, start, lpi_max) {
    return this._get_lpis(splid_str, lpi_items, start, lpi_max).num;
  },

  /**
   * @override
   */
  get_lemma_str: function userDict_get_lemma_str(id_lemma) {
    var strs = ['', ''];
    if (this.is_valid_state() == false) {
      return strs;
    }
    if (this.is_valid_lemma_id(id_lemma) == false) {
      return strs;
    }
    var offset = this.offsets_by_id_[id_lemma - this.start_id_];
    strs = this.get_lemma_word(offset);
    return strs;
  },

  /**
   * @override
   */
  get_lemma_splids: function userDict_get_lemma_splids(id_lemma, splids,
      start, splids_max) {
    if (this.is_valid_lemma_id(id_lemma) == false) {
      return 0;
    }
    var offset = this.offsets_by_id_[id_lemma - this.start_id_];
    var ids = this.get_lemma_spell_ids(offset);
    var n = Math.min(ids.length, splids_max);
    for (var i = 0; i < n; i++) {
      splids[start + i] = ids[i];
    }
    return n;
  },

  /**
   * @override
   */
  predict: function userDict_predict(last_hzs, npre_items, start, npre_max,
                                     b4_used) {
    var hzs_len = last_hzs.length;
    var new_added = 0;
    var end = this.dict_info_.lemma_count - 1;
    var j = this.locate_first_in_predicts(last_hzs);
    if (j == -1) {
      return 0;
    }

    while (j <= end) {
      var offset = this.predicts_[j];
      // Ignore deleted lemmas
      if (offset & UserDict.kUserDictOffsetFlagRemove) {
        j++;
        continue;
      }
      var words = this.get_lemma_word(offset);
      var splids = this.get_lemma_spell_ids(offset);
      var nchar = splids.length;

      if (nchar <= hzs_len) {
        j++;
        continue;
      }

      if (words[0].indexOf(last_hzs) == 0) {
        if (new_added >= npre_max) {
          return new_added;
        }
        var len = Math.min(DictDef.kMaxPredictSize, nchar);
        npre_items[new_added] = new SearchUtility.NPredictItem();
        npre_items[new_added].pre_hzs = words[0].substring(hzs_len, len);
        npre_items[new_added].pre_hzs_tr = words[1].substring(hzs_len, len);
        npre_items[new_added].psb =
          this.get_lemma_score_by_content(words, splids);
        npre_items[new_added].his_len = hzs_len;
        new_added++;
      } else {
        break;
      }

      j++;
    }
    return new_added;
  },

  /**
   * @override
   */
  put_lemma: function userDict_put_lemma(lemma_str, lemma_str_tr, splids,
      count) {
    return this._put_lemma(lemma_str, lemma_str_tr, splids, count,
        new Date().getTime());
  },

  /**
   * @override
   */
  update_lemma: function userDict_update_lemma(lemma_id, delta_count,
                                               selected) {
    if (this.is_valid_state() == false) {
      return 0;
    }
    if (this.is_valid_lemma_id(lemma_id) == false) {
      return 0;
    }
    var offset = this.offsets_by_id_[lemma_id - this.start_id_];
    var lemma_str = this.get_lemma_word(offset)[0];
    var splids = this.get_lemma_spell_ids(offset);

    var off = this.locate_in_offsets(lemma_str, splids);
    if (off != -1) {
      var score = this.scores_[off];
      var count = this.extract_score_freq(score);
      var lmt = this.extract_score_lmt(score);
      if (count + delta_count > UserDict.kUserDictMaxFrequency ||
          count + delta_count < count) {
        delta_count = UserDict.kUserDictMaxFrequency - count;
      }
      count += delta_count;
      this.dict_info_.total_nfreq += delta_count;
      if (selected) {
        lmt = new Date().getTime();
      }
      this.scores_[off] = this.build_score(lmt, count);
      if (this.state_ < UserDict.UserDictState.USER_DICT_SCORE_DIRTY) {
        this.state_ = UserDict.UserDictState.USER_DICT_SCORE_DIRTY;
      }

      debug('update_lemma');
      return this.ids_[off];
    }
    return 0;
  },

  /**
   * @override
   */
  get_lemma_id: function userDict_get_lemma_id(lemma_str, splids) {
    var off = this.locate_in_offsets(lemma_str, splids);
    if (off == -1) {
      return 0;
    }

    return this.ids_[off];
  },

  /**
   * @override
   */
  get_lemma_score_by_id: function userDict_get_lemma_score_by_id(lemma_id) {
    if (this.is_valid_state() == false) {
      return 0;
    }
    if (this.is_valid_lemma_id(lemma_id) == false) {
      return 0;
    }

    return this.translate_score(this._get_lemma_score_by_id(lemma_id));
  },

  /**
   * @override
   */
  get_lemma_score_by_content: function userDict_get_lemma_score_by_content(
      lemma_str, splids) {
    if (this.is_valid_state() == false)
      return 0;
    return this.translate_score(this._get_lemma_score_by_content(lemma_str,
                                                                 splids));
  },

  /**
   * @override
   */
  remove_lemma: function userDict_remove_lemma(lemma_id) {
    if (this.is_valid_state() == false) {
      return 0;
    }
    if (this.is_valid_lemma_id(lemma_id) == false) {
      return false;
    }
    var offset = this.offsets_by_id_[lemma_id - this.start_id_];

    var spl = this.get_lemma_spell_ids(offset);
    var wrd = this.get_lemma_word(offset)[0];

    var off = this.locate_in_offsets(wrd, spl);

    return this.remove_lemma_by_offset_index(off);
  },

  /**
   * @override
   */
  get_total_lemma_count: function userDict_get_total_lemma_count() {
    return this.dict_info_.total_nfreq;
  },

  /**
   * @override
   */
  set_total_lemma_count_of_others: function
      userDict_set_total_lemma_count_of_others(count) {
    this.total_other_nfreq_ = count;
  },

  /**
   * @override
   */
  flush_cache: function userDict_flush_cache(callback) {
    debug('Flushing cache...');
    var self = this;
    var doCallback = function fush_cache_doCallback() {
      if (callback) {
        callback();
      }
    };
    var start_id = this.start_id_;
    var file = this.dict_file_;
    if (!file) {
      doCallback();
      return;
    }
    this.close_dict(function flush_cache_close_dict_callback(isOk) {
      if (isOk) {
        debug('Succeeded in closing user dict.');
        self.load_dict(file, start_id, DictDef.kUserDictIdEnd,
            function load_dict_callback(success) {
          if (success) {
            if (UserDict.CACHE_ENABLED) {
              self.cache_init();
            }
          }
          doCallback();
        });
      } else {
        debug('Failed to close user dict.');
        doCallback();
      }
    });
  },

  /**
   * @param {number} max_lemma_count Maximum lemma count, 0 means no limitation.
   * @param {number} reclaim_ratio When limitation reached, how much percentage
   *    will be reclaimed (1 ~ 100).
   */
  set_limit: function userDict_set_limit(max_lemma_count, reclaim_ratio) {
    this.dict_info_.limit_lemma_count = max_lemma_count;
    if (reclaim_ratio > 100) {
      reclaim_ratio = 100;
    }
    this.dict_info_.reclaim_ratio = reclaim_ratio;
  },

  reclaim: function userDict_reclaim() {
    if (this.is_valid_state() == false) {
      return;
    }

    switch (this.dict_info_.reclaim_ratio) {
      case 0:
        return;
      case 100:
        // TODO: CLEAR to be implemented
        assert(false);
        return;
      default:
        break;
    }

    // Reclaim is only based on count
    var count = this.dict_info_.lemma_count;
    var rc = count * this.dict_info_.reclaim_ratio / 100;

    var score_offset_pairs = [];
    for (var i = 0; i < rc; i++) {
      score_offset_pairs[i] = new UserDict.UserDictScoreOffsetPair();
    }

    for (var i = 0; i < rc; i++) {
      var s = this.scores_[i];
      this.score_offset_pairs[i].score = s;
      this.score_offset_pairs[i].offset_index = i;
    }

    for (var i = (rc + 1) / 2; i >= 0; i--) {
      this.shift_down(score_offset_pairs, i, rc);
    }

    for (var i = rc; i < this.dict_info_.lemma_count; i++) {
      var s = this.scores_[i];
      if (s < score_offset_pairs[0].score) {
        score_offset_pairs[0].score = s;
        score_offset_pairs[0].offset_index = i;
        this.shift_down(score_offset_pairs, 0, rc);
      }
    }

    for (var i = 0; i < rc; i++) {
      var off = score_offset_pairs[i].offset_index;
      this.remove_lemma_by_offset_index(off);
    }
    if (rc > 0) {
      if (this.state_ < UserDict.UserDictState.USER_DICT_OFFSET_DIRTY)
        this.state_ = UserDict.UserDictState.USER_DICT_OFFSET_DIRTY;
    }
  },

  /**
   * Defragment the user dictionary.
   * Remove inuse lemmas and free file space.
   * @private
   * @return {void} No return value.
   */
  defragment: function userDict_defragment() {
    if (this.is_valid_state() == false) {
      return;
    }
    var lemma_count = this.dict_info_.lemma_count;
    // Fixup scores_, ids_
    var first_freed = 0;
    var first_inuse = 0;
    while (first_freed < lemma_count) {
      // Find first freed offset
      while ((this.lemmas_[first_freed].flag &
              UserDict.kUserDictLemmaFlagRemove) == 0 &&
             first_freed < lemma_count) {
        first_freed++;
      }
      if (first_freed >= dict_info_.lemma_count) {
        break;
      }
      // Find first used offset after first_freed
      first_inuse = first_freed + 1;
      while ((this.lemmas_[first_inuse].flag &
              UserDict.kUserDictLemmaFlagRemove) &&
             (first_inuse < lemma_count)) {
        first_inuse++;
      }
      if (first_inuse >= dict_info_.lemma_count) {
        break;
      }
      // Swap scores_
      tmp = this.scores_[first_inuse];
      this.scores_[first_inuse] = this.scores_[first_freed];
      this.scores_[first_freed] = tmp;
      // Swap ids_
      var tmpid = this.ids_[first_inuse];
      this.ids_[first_inuse] = this.ids_[first_freed];
      this.ids_[first_freed] = tmpid;
      // Go on
      first_freed++;
    }
    // Fixup predicts_
    first_freed = 0;
    first_inuse = 0;
    while (first_freed < lemma_count) {
      // Find first freed offset
      while ((this.predicts_[first_freed] &
              UserDict.kUserDictOffsetFlagRemove) == 0 &&
              first_freed < dict_info_.lemma_count) {
        first_freed++;
      }
      if (first_freed >= lemma_count) {
        break;
      }
      // Find first inuse offse after first_freed
      first_inuse = first_freed + 1;
      while ((this.predicts_[first_inuse] &
              UserDict.kUserDictOffsetFlagRemove) &&
             (first_inuse < lemma_count)) {
        first_inuse++;
      }
      if (first_inuse >= lemma_count) {
        break;
      }
      // Swap offsets_
      var tmp = this.predicts_[first_inuse];
      this.predicts_[first_inuse] = this.predicts_[first_freed];
      this.predicts_[first_freed] = tmp;
      // Go on
      first_freed++;
    }
    this.dict_info_.lemma_count = first_freed;
    lemma_count = first_freed;
    // Fixup lemmas_
    var begin = 0;
    var end = 0;
    var dst = 0;
    var total_count = this.dict_info_.lemma_count + this.lemma_count_left_;
    // Find first freed offset
    while (dst < lemma_count) {
      var flag = this.get_lemma_flag(dst);
      if ((flag & UserDict.kUserDictLemmaFlagRemove) == 0) {
        dst++;
        continue;
      }
      break;
    }
    if (dst >= lemma_count) {
      return;
    }

    // Find the serial used offsets after the first freed offset.
    end = dst;
    while (end < lemma_count) {
      begin = end;
      while (true) {
        // not used any more
        if (begin >= lemma_count) {
          break;
        }
        var flag = this.get_lemma_flag(begin);
        if (flag & UserDict.kUserDictLemmaFlagRemove) {
          begin++;
          continue;
        }
        break;
      }
      end = begin++;
      while (end < lemma_count) {
        var eflag = get_lemma_flag(end);
        if ((eflag & UserDict.kUserDictLemmaFlagRemove) == 0) {
          end++;
          continue;
        }
        break;
      }
      this.memmove(lemmas_, dst, begin, end - begin);
      for (var j = 0; j < this.dict_info_.lemma_count; j++) {
        if (j >= begin && j < end) {
          this.offsets_by_id_[ids_[j] - this.start_id_] = begin - dst;
        }
        if (this.predicts_[j] >= begin && this.predicts_[j] < end) {
          this.predicts_[j] -= (begin - dst);
        }
      }
      dst += (end - begin);
    }

    this.dict_info_.free_count = 0;
    this.lemma_count_left_ = total_count - lemma_count;

    // If write-back is invoked immediately after
    // this defragment, no need to fix up following in-mem data.
    for (var i = 0; i < lemma_count; i++) {
      this.ids_[i] = this.start_id_ + i;
      this.offsets_by_id_[i] = i;
    }

    // Free unused spaces.
    this.ids_.length = lemma_count;
    this.offsets_by_id_.length = lemma_count;
    this.scores_.length = lemma_count;
    this.predicts_.length = lemma_count;

    this.state_ = UserDict.UserDictState.USER_DICT_DEFRAGMENTED;

    debug('defragment');
  },

  /* ==== Private ==== */

  /**
   * @type number
   */
  total_other_nfreq_: 0,

  /**
   * @type number
   */
  g_last_update_: 0,

  /**
   * @type number
   */
  load_time_: 0,

  /**
   * @type number
   */
  start_id_: 0,

  /**
   * Array to store the spelling IDs and lemma strings.
   * @type Array.<UserDict.Lemma>
   */
  lemmas_: null,

  /**
   * Correspond to offsets_
   * @type Array.<number>
   */
  scores_: null,


  // Following two fields are only valid in memory

  /**
   * @type Array.<number>
   */
  ids_: null,

  /**
   * @type Array.<number>
   */
  predicts_: null,

  /**
   * @type Array.<number>
   */
  offsets_by_id_: null,

  lemma_count_left_: 0,

  dict_file_: '',

  /**
   * @type UserDict.UserDictInfo
   */
  dict_info_: null,

  /**
   * @type UserDict.UserDictState
   */
  state_: UserDict.UserDictState.USER_DICT_NONE,

  /**
   * The length is DictDef.kMaxLemmaSize.
   * @type Array.<UserDict.UserDictMissCache>
   */
  miss_caches_: null,

  /**
   * The length is DictDef.kMaxLemmaSize.
   * @type Array.<UserDict.UserDictCache>
   */
  caches_: null,

  cache_init: function userDict_cache_init() {
    this.reset_cache();
    this.reset_miss_cache();
  },

  /**
   * Push a cache object.
   * @param {UserDict.UserDictCacheType} type The type of the cache object.
   * @param {UserDict.UserDictSearchable} searchable The object to be cached.
   * @param {number} offset The cache object offset.
   * @param {number} length The cache object length.
   * @return {void} No return value.
   */
  cache_push: function userDict_cache_push(type, searchable, offset, length) {
    switch (type) {
      case UserDict.UserDictCacheType.USER_DICT_MISS_CACHE:
        this.save_miss_cache(searchable);
        break;
      case UserDict.UserDictCacheType.USER_DICT_CACHE:
        this.save_cache(searchable, offset, length);
        break;
      default:
        break;
    }
  },

  /**
   * Check whether a cache obejct is hit.
   * @param {UserDict.UserDictSearchable} searchable The object to be checked.
   * @return {{success: boolean, offset: number, length: number}} success - true
   *    if hit; offset - the offset of the cache object if hit;
   *    length -  the length of the cache object if hit.
   */
  cache_hit: function userDict_cache_hit(searchable) {
    var ret = {success: false, offset: 0, length: 0};
    var hit = this.load_miss_cache(searchable);
    if (hit) {
      ret.offset = 0;
      ret.length = 0;
      ret.success = true;
      return ret;
    }
    var load_cache_ret = this.load_cache(searchable, offset, length);
    var hit = load_cache_ret.success;
    if (hit) {
      return ret;
    }
    return ret;
  },

  /**
   * Load a cache obejct
   * @param {UserDict.UserDictSearchable} searchable The object to be loaded.
   * @return {success: boolean, offset: number, length: number}
   *    success - true if success;
   *    offset - the offset of the cache object if success;
   *    length -  the length of the cache object if success.
   */
  load_cache: function userDict_load_cache(searchable) {
    var ret = {success: false, offset: 0, length: 0};
    var cache = this.caches_[searchable.splids_len - 1];
    if (cache.head == cache.tail) {
      return ret;
    }

    var j;
    var sig_len = DictDef.kMaxLemmaSize / 4;
    var i = cache.head;
    while (1) {
      j = 0;
      for (; j < sig_len; j++) {
        if (cache.signatures[i][j] != searchable.signature[j]) {
          break;
        }
      }
      if (j < sig_len) {
        i++;
        if (i >= UserDict.kUserDictCacheSize) {
          i -= UserDict.kUserDictCacheSize;
        }
        if (i == cache.tail) {
          break;
        }
        continue;
      }
      ret.offset = cache.offsets[i];
      ret.length = cache.lengths[i];
      ret.success = true;
      return ret;
    }
    return ret;
  },

  /**
   * Save a cache object.
   * @param {UserDict.UserDictCacheType} type The type of the cache object.
   * @param {UserDict.UserDictSearchable} searchable The object to be saved.
   * @param {number} offset The cache object offset.
   * @param {number} length The cache object length.
   * @return {void} No return value.
   */
  save_cache: function userDict_save_cache(searchable, offset, length) {
    var cache = this.caches_[searchable.splids_len - 1];
    var next = cache.tail;

    cache.offsets[next] = offset;
    cache.lengths[next] = length;
    var sig_len = DictDef.kMaxLemmaSize / 4;
    var j = 0;
    for (; j < sig_len; j++) {
      cache.signatures[next][j] = searchable.signature[j];
    }

    if (++next >= UserDict.kUserDictCacheSize) {
      next -= UserDict.kUserDictCacheSize;
    }
    if (next == cache.head) {
      cache.head++;
      if (cache.head >= UserDict.kUserDictCacheSize) {
        cache.head -= UserDict.kUserDictCacheSize;
      }
    }
    cache.tail = next;
  },

  /**
   * @return {void} No return value.
   */
  reset_cache: function userDict_reset_cache() {
    this.caches_ = [];
    for (var i = 0; i < DictDef.kMaxLemmaSize; i++) {
      this.caches_[i] = new UserDict.UserDictCache();
    }
  },

  /**
   * Load miss cache
   * @param {UserDict.UserDictSearchable} searchable The object to be loaded.
   * @return {boolean} true if success.
   */
  load_miss_cache: function userDict_load_miss_cache(searchable) {
    var cache = this.miss_caches_[searchable.splids_len - 1];
    if (cache.head == cache.tail) {
      return false;
    }

    var j;
    var sig_len = UserDict.kMaxLemmaSize / 4;
    var i = cache.head;
    while (1) {
      j = 0;
      for (; j < sig_len; j++) {
        if (cache.signatures[i][j] != searchable.signature[j]) {
          break;
        }
      }
      if (j < sig_len) {
        i++;
        if (i >= UserDict.kUserDictMissCacheSize) {
          i -= UserDict.kUserDictMissCacheSize;
        }
        if (i == cache.tail) {
          break;
        }
        continue;
      }
      return true;
    }
    return false;
  },

  /**
   * Save miss cache
   * @param {UserDict.UserDictSearchable} searchable The object to be saved.
   * @return {void} No return value.
   */
  save_miss_cache: function userDict_save_miss_cache(searchable) {
    var cache = this.miss_caches_[searchable.splids_len - 1];
    var next = cache.tail;

    var sig_len = UserDict.kMaxLemmaSize / 4;
    var j = 0;
    for (; j < sig_len; j++) {
      cache.signatures[next][j] = searchable.signature[j];
    }

    if (++next >= UserDict.kUserDictMissCacheSize) {
      next -= UserDict.kUserDictMissCacheSize;
    }
    if (next == cache.head) {
      cache.head++;
      if (cache.head >= UserDict.kUserDictMissCacheSize) {
        cache.head -= UserDict.kUserDictMissCacheSize;
      }
    }
    cache.tail = next;
  },

  /**
   * @return {void} No return value.
   */
  reset_miss_cache: function userDict_save_miss_cache() {
    this.miss_icaches_ = [];
    for (var i = 0; i < DictDef.kMaxLemmaSize; i++) {
      this.miss_icaches_[i] = new UserDict.UserDictMissCache();
    }
  },

  /**
   * Extract the lower n bits for a number.
   * @private
   * @param {number} number The number to be extracted.
   * @param {number} n How many bits to be extracted.
   * @return {number} The number of extracted n bits.
     */
  extract_lower_n_bits: function userDict_extract_lower_n_bits(number, n) {
    var move = 32 - n;
    return number << move >> move;
  },

  /**
   * @private
   */
  translate_score: function userDict_translate_score(raw_score) {
    // 1) ori_freq: original user frequency
    var ori_freq = this.extract_score_freq(raw_score);
    // 2) lmt_off: lmt index (week offset for example)
    var lmt_off = (raw_score >> 16);
    lmt_off = this.extract_lower_n_bits(lmt_off, UserDict.kUserDictLMTBitWidth);
    // 3) now_off: current time index (current week offset for example)
    // assuming load_time_ is around current time
    var now_off = this.load_time_;
    now_off = (now_off - UserDict.kUserDictLMTSince) /
      UserDict.kUserDictLMTGranularity;
    now_off = this.extract_lower_n_bits(now_off, UserDict.kUserDictLMTBitWidth);
    // 4) factor: decide expand-factor
    var delta = now_off - lmt_off;
    if (delta > 4) {
      delta = 4;
    }
    var factor = 80 - (delta << 4);

    var tf = this.dict_info_.total_nfreq + this.total_other_nfreq_;
    return Math.log(factor * ori_freq / tf) * NGram.kLogValueAmplifier;
  },

  /**
   * @private
   */
  extract_score_freq: function userDict_extract_score_freq(raw_score) {
    var freq = (raw_score & 0x0000ffff);
    return freq;
  },

  /**
   * @private
   */
  extract_score_lmt: function userDict_extract_score_lmt(raw_score) {
    var lmt = raw_score >> 16;
    lmt = this.extract_lower_n_bits(lmt, UserDict.kUserDictLMTBitWidth);
    lmt = lmt * UserDict.kUserDictLMTGranularity + UserDict.kUserDictLMTSince;
    return lmt;
  },

  /**
   * @private
   */
  build_score: function userDict_extract_score_lmt(lmt, freq) {
    lmt = (lmt - UserDict.kUserDictLMTSince) / UserDict.kUserDictLMTGranularity;
    lmt = this.extract_lower_n_bits(lmt, UserDict.kUserDictLMTBitWidth);
    var s = freq;
    s &= 0x0000ffff;
    s = (lmt << 16) | s;
    return s;
  },

  /**
   * Add a lemma to the dictionary.
   * @private
   * @param {string} lemma_str The simplified Chinese string of the lemma.
   * @param {string} lemma_str_tr The traditional Chinese string of the lemma.
   * @param {Array.<number>} splids The spelling ids of the lemma.
   * @param {number} count The frequency count for this lemma.
   * @param {number} lmt The last modified time stamp.
   * @return {number} The id if succeed, 0 if fail.
   */
  _put_lemma: function userDict_put_lemma(lemma_str, lemma_str_tr, splids,
      count, lmt) {
    if (this.is_valid_state() == false) {
      return 0;
    }
    var off = this.locate_in_offsets(lemma_str, splids);
    if (off != -1) {
      // If the lemma exists, update its frequency count.
      var delta_score = count - this.scores_[off];
      this.dict_info_.total_nfreq += delta_score;
      this.scores_[off] = this.build_score(lmt, count);
      if (this.state_ < UserDict.UserDictState.USER_DICT_SCORE_DIRTY) {
        this.state_ = UserDict.UserDictState.USER_DICT_SCORE_DIRTY;
      }
      debug('_put_lemma(update)');
      return this.ids_[off];
    } else {
      if ((this.dict_info_.limit_lemma_count > 0 &&
          this.dict_info_.lemma_count >= this.dict_info_.limit_lemma_count)) {
        // Don't defragment here, it's too time-consuming.
        return 0;
      }
      var flushed = false;
      if (this.lemma_count_left_ == 0) {
        // XXX When there is no space for new lemma, we flush to disk
        // flush_cache() may be called by upper user
        // and better place shoule be found instead of here
        this.flush_cache();
        flushed = true;
        // Or simply return and do nothing
        // return 0;
      }
      debug(flushed ? '_put_lemma(flush+add)' : '_put_lemma(add)');
      var id = this.append_a_lemma(lemma_str, lemma_str_tr, splids, count, lmt);
      return id;
    }
    return 0;
  },

  /**
   * Get lemma items with scores according to a spelling id stream.
   *
   * @param {Array.<number>} splid_str The spelling id stream buffer.
   * @param {Array.<SearchUtility.LmaPsbItem>} lpi_items Buffer used to fill in
   *    the lemmas matched.
   * @param {number} start The start position of the buffer.
   * @param {number} lpi_max The length of the buffer that could be used.
   * @return {{num: number, need_extend: boolean}} num is the number of
   *    matched items which have been filled into.
   */
  _get_lpis: function userDict_get_lpis(splid_str, lpi_items, lpi_items_start,
                                        lpi_max) {
    var ret = {num: 0, need_extend: false};
    if (this.is_valid_state() == false) {
      return ret;
    }
    if (lpi_max <= 0) {
      return ret;
    }

    if (this.load_time_ < this.g_last_update_) {
      // Others updated disk file, have to reload
      this.flush_cache();
    }

    var searchable = new UserDict.UserDictSearchable();
    this.prepare_locate(searchable, splid_str);

    var max_off = this.dict_info_.lemma_count;
    var middle = 0;
    if (UserDict.CACHE_ENABLED) {
      var cache_hit_ret = this.cache_hit(searchable);
      var cached = cache_hit_ret.success;
      var start = cache_hit_ret.number;
      var count = cache_hit_ret.length;
      if (cached) {
        middle = start;
        max_off = start + count;
      } else {
        middle = this.locate_first_in_offsets(searchable);
        start = middle;
      }
    } else {
      middle = this.locate_first_in_offsets(searchable);
    }

    if (middle == -1) {
      if (UserDict.CACHE_ENABLED) {
        if (!cached) {
          this.cache_push(UserDict.UserDictCacheType.USER_DICT_MISS_CACHE,
                          searchable, 0, 0);
        }
      }
      return ret;
    }

    var lpi_current = 0;

    var fuzzy_break = false;
    var prefix_break = false;
    while (middle < max_off && !fuzzy_break && !prefix_break) {
      if (lpi_current >= lpi_max) {
        break;
      }
      var offset = middle;
      // Ignore deleted lemmas
      if (offset & UserDict.kUserDictOffsetFlagRemove) {
        middle++;
        continue;
      }
      var splids = this.get_lemma_spell_ids(offset);
      var nchar = splids.length;
      if (UserDict.CACHE_ENABLED) {
        if (!cached && 0 != this.fuzzy_compare_spell_id(splids, searchable)) {
          fuzzy_break = true;
        }
      } else {
        if (0 != this.fuzzy_compare_spell_id(splids, searchable)) {
          fuzzy_break = true;
        }
      }

      if (prefix_break == false) {
        if (this.is_fuzzy_prefix_spell_id(splids, searchable)) {
          if (ret.need_extend == false &&
              this.is_prefix_spell_id(splids, searchable)) {
            ret.need_extend = true;
          }
        } else {
          prefix_break = true;
        }
      }

      if (this.equal_spell_id(splids, searchable) == true) {
        var item = new SearchUtility.LmaPsbItem();
        item.psb = this.translate_score(this.scores_[middle]);
        item.id = this.ids_[middle];
        item.lma_len = nchar;
        lpi_items[lpi_items_start + lpi_current] = item;
        lpi_current++;
      }
      middle++;
    }

    if (UserDict.CACHE_ENABLED) {
      if (!cached) {
        count = middle - start;
        this.cache_push(UserDict.UserDictCacheType.USER_DICT_CACHE, searchable,
                        start, count);
      }
    }
    ret.num = lpi_current;
    return ret;
  },

  /**
   * Get the score of a lemma.
   * @private
   * @param {string} lemma_str The lemma string.
   * @param {Array.<number>} splid_str The spelling ids of the lemma.
   * @return {number} The lemma score.
   */
  _get_lemma_score_by_content: function userDict_get_lemma_score_by_str(
      lemma_str, splids) {
    if (this.is_valid_state() == false) {
      return 0;
    }

    var off = this.locate_in_offsets(lemma_str, splids);
    if (off == -1) {
      return 0;
    }

    return this.scores_[off];
  },

  /**
   * Get the score by lemma id.
   * @private
   * @param {number} lemma_id Lemma id.
   * @return {number} The score if the lemma exists. Otherwise 0.
   */
  _get_lemma_score_by_id: function userDict_get_lemma_score_by_id(lemma_id) {
    if (this.is_valid_state() == false) {
      return 0;
    }
    if (this.is_valid_lemma_id(lemma_id) == false) {
      return 0;
    }

    var offset = this.offsets_by_id_[lemma_id - this.start_id_];

    var spl = this.get_lemma_spell_ids(offset);
    var wrd = this.get_lemma_word(offset)[0];

    var off = this.locate_in_offsets(wrd, spl);
    if (off == -1) {
      return 0;
    }

    return this.scores_[off];
  },

  /**
   * @param {Array.<number>} id1 spelling id array.
   * @param {UserDict.UserDictSearchable} searchable The searchable object.
   * @return {boolean} true if id1 is a fuzzy prefix of searchable.
   */
  is_fuzzy_prefix_spell_id: function userDict_is_fuzzy_prefix_spell_id(id1,
      searchable) {
    var len1 = id1.length;
    if (len1 < searchable.splids_len) {
      return false;
    }

    var spl_trie = SpellingTrie.get_instance();
    var i = 0;
    for (i = 0; i < searchable.splids_len; i++) {
      var py1 = spl_trie.get_spelling_str(id1[i]).charCodeAt(0);
      var off = 8 * (i % 4);
      var py2 = ((searchable.signature[Math.floor(i / 4)] & (0xff << off)) >>
                 off);
      if (py1 == py2)
        continue;
      return false;
    }
    return true;
  },

  /**
   * @param {Array.<number>} fullids spelling id array.
   * @param {UserDict.UserDictSearchable} searchable The searchable object.
   * @return {boolean} true if fullids is prefix of searchable.
   */
  is_prefix_spell_id: function userDict_is_prefix_spell_id(fullids,
      searchable) {
    var fulllen = fullids.length;
    if (fulllen < searchable.splids_len) {
      return false;
    }

    var i = 0;
    for (; i < searchable.splids_len; i++) {
      var start_id = searchable.splid_start[i];
      var count = searchable.splid_count[i];
      if (fullids[i] >= start_id && fullids[i] < start_id + count) {
        continue;
      } else {
        return false;
      }
    }
    return true;
  },

  /**
   * Reset the dict.
   * @private
   * @param {string} file_name The dict file name.
   * @param {function(object): void} callback The callback function, which will
   *    be called when the operation is done. The object parameter is the
   *    JSON object of the dict file after resetting.
   * @return {void} No return value.
   */
  reset: function userDict_reset(file_name, callback) {
    debug('UserDict#reset');
    var self = this;
    var json = null;
    function doCallback() {
      if (callback) {
        callback(json);
      }
    }
    var version = UserDict.kUserDictVersion;
    var info = new UserDict.UserDictInfo();
    info.version = UserDict.kUserDictVersion;
    info.lemma_count = 0;
    var lemmas = [];
    var predicts = [];
    var scores = [];
    // By default, no limitation for lemma count and size
    // thereby, reclaim_ratio is never used
    json = {info: info, lemmas: lemmas, predicts: predicts, scores: scores};
    var dict_str = JSON.stringify(json);
    FileSystemService.write(file_name, dict_str,
        function reset_writeCallback(success) {
      if (!success) {
        debug('UserDict#reset failed to write dict file: ' + self.dict_file_);
      }
      doCallback();
    });
  },

  /**
   * Validate the dict file.
   * @private
   * @param {object} dictJson The json object of the dict file.
   * @return {boolean} true if the file is valid.
   */
  validate: function userDict_validate(dictJson) {
    debug('Validating user dictionary file...');
    if (!dictJson) {
      return false;
    }

    var lemma_count = dictJson.lemmas ? dictJson.lemmas.length : 0;
    var info = dictJson.info;
    if (!info) {
      return false;
    }
    if (info.version != UserDict.kUserDictVersion) {
      debug('User dict version mismatch.');
      return false;
    }
    if (lemma_count != info.lemma_count) {
      debug('The number of lemmas mismatch.');
      return false;
    }

    return true;
  },

  /**
   * Load dict file.
   * @private
   * @param {object} dictJson The JSON object of the dict file.
   * @param {number} start_id The start id of the user lemmas.
   * @return {boolean} true if success.
   */
  load: function userDict_load(dictJson, start_id) {
    if (!dictJson) {
      return false;
    }
    this.dict_info_ = dictJson.info;
    this.lemmas_ = dictJson.lemmas;
    this.ids_ = [];
    this.offsets_by_id_ = [];
    for (var i = 0; i < this.dict_info_.lemma_count; i++) {
      this.ids_[i] = start_id + i;
      this.offsets_by_id_[i] = i;
    }
    this.scores_ = dictJson.scores;

    if (UserDict.PREDICT_ENABLED) {
      this.predicts_ = dictJson.predicts;
    }
    this.lemma_count_left_ = UserDict.kUserDictPreAlloc;
    this.state_ = UserDict.UserDictState.USER_DICT_SYNC;
    this.load_time_ = new Date().getTime();

    return true;
  },

  /**
   * @private
   */
  is_valid_state: function userDict_is_valid_state() {
    if (this.state_ == UserDict.UserDictState.USER_DICT_NONE) {
      return false;
    }
    return true;
  },

  /**
   * @private
   */
  is_valid_lemma_id: function userDict_is_valid_lemma_id(id) {
    if (id >= this.start_id_ && id <= this.get_max_lemma_id()) {
      return true;
    }
    return false;
  },

  /**
   * @private
   */
  get_max_lemma_id: function userDict_get_max_lemma_id() {
    // When a lemma is deleted, we don't not claim its id back for
    // simplicity and performance
    return this.start_id_ + this.dict_info_.lemma_count - 1;
  },

  /**
   * @private
   */
  set_lemma_flag: function userDict_set_lemma_flag(offset, flag) {
    this.lemmas_[offset].flag |= flag;
  },

  /**
   * @private
   */
  get_lemma_flag: function userDict_get_lemma_flag(offset) {
    return this.lemmas_[offset].flag;
  },

  /**
   * Get character number of the lemma
   * @private
   */
  get_lemma_nchar: function userDict_get_lemma_nchar(offset) {
    return this.lemmas_[offset].hanzi_str.length;
  },

  /**
   * Get the spelling id array of a lemma.
   * @private
   * @param {number} offset The offset of the lemma.
   * @return {Array.<number>} The spelling id array.
   */
  get_lemma_spell_ids: function userDict_get_lemma_spell_ids(offset) {
    return this.lemmas_[offset].splid_arr.slice();
  },

  /**
   * Get the lemma hanzi string by its offset.
   * @private
   * @param {number} offset The offset of the lemma.
   * @return {[string, string]}  The simplified and traditional hanzi strings.
   */
  get_lemma_word: function userDict_get_lemma_word(offset) {
    return [this.lemmas_[offset].hanzi_str, this.lemmas_[offset].hanzi_str_tr];
  },

  /**
   * Prepare searchable to fasten locate process
   * @param {UserDict.UserDictSearchable} searchable The searchable object.
   * @param {Array.<number>} splids The spelling id array.
   * @return {void} No return value.
   */
  prepare_locate: function userDict_prepare_locate(searchable, splids) {
    var splid_str_len = splids.length;
    searchable.splids_len = splid_str_len;
    searchable.signature = [];
    var sig_size = DictDef.kMaxLemmaSize / 4;
    for (var i = 0; i < sig_size; i++) {
      searchable.signature[i] = 0;
    }

    var spl_trie = SpellingTrie.get_instance();
    var i = 0;
    for (; i < splid_str_len; i++) {
      if (spl_trie.is_half_id(splids[i])) {
        searchable.splid_count[i] =
            spl_trie.half_to_full(splids[i],
                                  searchable.splid_start[i]);
      } else {
        searchable.splid_count[i] = 1;
        searchable.splid_start[i] = splids[i];
      }
      var py = spl_trie.get_spelling_str(splids[i]).charCodeAt(0);
      searchable.signature[i >> 2] |= (py << (8 * (i % 4)));
    }
  },

  /**
   * Compare initial letters only.
   * @param {Array.<number>} id1 The spelling id array.
   * @param {UserDict.UserDictSearchable} searchable The searchable object.
   * @return {number} 1 - id1 > searchable;
   *     0 - id1 == searchable;
   *     -1 - id1 < searchable.
   */
  fuzzy_compare_spell_id:
      function userDict_fuzzy_compare_spell_id(id1, searchable) {
    var len1 = id1.length;
    if (len1 < searchable.splids_len) {
      return -1;
    }
    if (len1 > searchable.splids_len) {
      return 1;
    }

    var spl_trie = SpellingTrie.get_instance();
    var i = 0;
    for (i = 0; i < len1; i++) {
      var py1 = spl_trie.get_spelling_str(id1[i]).charCodeAt(0);
      var off = 8 * (i % 4);
      // extract the spelling ID from the signature.
      var py2 = ((searchable.signature[Math.floor(i / 4)] & (0xff << off)) >>
                 off);
      if (py1 == py2) {
        continue;
      }
      if (py1 > py2) {
        return 1;
      }
      return -1;
    }
    return 0;
  },

  /**
   * Compare exactly two spell ids
   * First argument must be a full id spell id.
   * @param {Array.<number>} fullids The spelling id array.
   * @param {UserDict.UserDictSearchable} searchable The searchable object.
   * @return {number} 1 - fullids > searchable;
   *     0 - fullids == searchable;
   *     -1 - fullids < searchable.
   */
  equal_spell_id: function userDict_equal_spell_id(fullids, searchable) {
    var fulllen = fullids.length;
    if (fulllen != searchable.splids_len)
      return false;

    var i = 0;
    for (; i < fulllen; i++) {
      var start_id = searchable.splid_start[i];
      var count = searchable.splid_count[i];
      if (fullids[i] >= start_id && fullids[i] < start_id + count) {
        continue;
      } else {
        return false;
      }
    }
    return true;
  },

  /**
   * Find first item by initial letters.
   * @param {UserDict.UserDictSearchable} searchable The searchable object.
   */
  locate_first_in_offsets: function userDict_locate_first_in_offsets(searchable)
  {
    var begin = 0;
    var end = this.dict_info_.lemma_count - 1;
    var middle = -1;

    var first_prefix = middle;

    while (begin <= end) {
      middle = (begin + end) >> 1;
      var offset = middle;
      var splids = this.get_lemma_spell_ids(offset);
      var cmp = this.fuzzy_compare_spell_id(splids, searchable);
      var pre = this.is_fuzzy_prefix_spell_id(splids, searchable);

      if (pre) {
        first_prefix = middle;
      }

      if (cmp < 0) {
        begin = middle + 1;
      } else if (cmp > 0) {
        end = middle - 1;
      } else {
        end = middle - 1;
      }
    }

    return first_prefix;
  },

  /**
   * Add a lemma to the dictionary.
   * @private
   * @param {string} lemma_str The simplified Chinese string of the lemma.
   * @param {string} lemma_str_tr The traditional Chinese string of the lemma.
   * @param {Array.<number>} splids The spelling ids of the lemma.
   * @param {number} count The frequency count for this lemma.
   * @param {number} lmt The last modified time stamp.
   * @return {number} The lemma id if succeed, 0 if fail.
   */
  append_a_lemma: function userDict_append_a_lemma(lemma_str, lemma_str_tr,
      splids, count, lmt) {
    var lemma_len = lemma_str.length;

    // Generate a new lemma ID.
    var id = this.get_max_lemma_id() + 1;
    var offset = this.dict_info_.lemma_count;
    if (offset > UserDict.kUserDictOffsetMask) {
      return 0;
    }

    // Append the lemma

    var lemma = new UserDict.Lemma();
    lemma.flag = 0;
    lemma.hanzi_str = lemma_str;
    lemma.hanzi_str_tr = lemma_str_tr;
    for (var i = 0; i < lemma_len; i++) {
      lemma.splid_arr[i] = splids[i];
    }
    this.lemmas_[offset] = lemma;
    var off = this.dict_info_.lemma_count;
    this.scores_[off] = this.build_score(lmt, count);
    this.ids_[off] = id;
    this.predicts_[off] = offset;
    this.offsets_by_id_[id - this.start_id_] = offset;

    this.dict_info_.lemma_count++;
    this.lemma_count_left_--;

    // Sort

    var searchable = new UserDict.UserDictSearchable();
    this.prepare_locate(searchable, splids);

    var i = 0;
    while (i < off) {
      offset = i;
      var spl = this.get_lemma_spell_ids(offset);

      if (0 <= this.fuzzy_compare_spell_id(spl, searchable))
        break;
      i++;
    }

    if (i != off) {
      temp = this.scores_[off];
      this.memmove(this.scores_, i + 1, i, off - i);
      this.scores_[i] = temp;

      temp = this.ids_[off];
      this.memmove(this.ids_, i + 1, i, off - i);
      this.ids_[i] = temp;
    }

    var j = 0;
    var words_new = this.get_lemma_word(this.predicts_[off])[0];
    j = this.locate_where_to_insert_in_predicts(words_new);
    if (j != off) {
      var temp = this.predicts_[off];
      this.memmove(this.predicts_, j + 1, j, off - j);
      this.predicts_[j] = temp;
    }

    if (this.state_ < UserDict.UserDictState.USER_DICT_LEMMA_DIRTY) {
      this.state_ = UserDict.UserDictState.USER_DICT_LEMMA_DIRTY;
    }

    if (UserDict.CACHE_ENABLED) {
      this.cache_init();
    }

    this.dict_info_.total_nfreq += count;
    return id;
  },

  /**
   * Check if a lemma is in dictionary.
   * @param {string} lemma_str The lemma string.
   * @param {Array.<number>} splid_str The spelling id array of the lemma.
   * @return {number} The offset of the lemma if exists. Otherwize -1.
   */
  locate_in_offsets: function userDict_locate_in_offsets(lemma_str, splid_str) {
    var lemma_len = lemma_str.length;
    var max_off = this.dict_info_.lemma_count;

    var searchable = new UserDict.UserDictSearchable();
    this.prepare_locate(searchable, splid_str);
    var off;
    if (UserDict.CACHE_ENABLED) {
      var cache_ret = this.load_cache(searchable);
      var cached = cache_ret.success;
      var start = cache_ret.offset;
      var count = cache_ret.length;
      if (cached) {
        off = start;
        max_off = start + count;
      } else {
        off = this.locate_first_in_offsets(searchable);
        start = off;
      }
    } else {
      off = this.locate_first_in_offsets(searchable);
    }

    if (off == -1) {
      return off;
    }

    while (off < max_off) {
      var offset = off;
      if (offset & UserDict.kUserDictOffsetFlagRemove) {
        off++;
        continue;
      }
      var splids = this.get_lemma_spell_ids(offset);
      if (UserDict.CACHE_ENABLED) {
        if (!cached && 0 != this.fuzzy_compare_spell_id(splids, searchable)) {
          break;
        }
      } else {
        if (0 != this.fuzzy_compare_spell_id(splids, searchable)) {
          break;
        }
      }

      if (this.equal_spell_id(splids, searchable) == true) {
        var str = this.get_lemma_word(offset)[0];
        var i = 0;
        for (i = 0; i < lemma_len; i++) {
          if (str.charAt(i) == lemma_str.charAt(i))
            continue;
          break;
        }
        if (i < lemma_len) {
          off++;
          continue;
        }
        // No need to save_cache here, since current function is invoked by
        // put_lemma. It's rarely possible for a user input same lemma twice.
        // That means first time user type a new lemma, it is newly added into
        // user dictionary, then it's possible that user type the same lemma
        // again.
        // Another reason save_cache can not be invoked here is this function
        // aborts when lemma is found, and it never knows the count.
        return off;
      }
      off++;
    }
    return -1;
  },

  remove_lemma_by_offset_index: function userDict_remove_lemma_by_offset_index(
      offset_index) {
    if (this.is_valid_state() == false) {
      return 0;
    }

    var off = offset_index;
    if (off == -1) {
      return false;
    }

    var offset = off;
    var nchar = this.get_lemma_nchar(offset);

    this.lemmas_[off].flag |= UserDict.kUserDictLemmaFlagRemove;

    this.remove_lemma_from_predict_list(offset);

    this.dict_info_.free_count++;
    this.dict_info_.free_size += (2 + (nchar << 2));

    if (this.state_ < UserDict.UserDictState.USER_DICT_OFFSET_DIRTY) {
      this.state_ = UserDict.UserDictState.USER_DICT_OFFSET_DIRTY;
    }
    return true;
  },

  /**
   * @param {string} words The words to be located.
   */
  locate_where_to_insert_in_predicts:
      function userDict_locate_where_to_insert_in_predicts(words) {
    var lemma_len = words.length;
    var begin = 0;
    var end = this.dict_info_.lemma_count - 1;
    var middle = end;

    var last_matched = middle;

    while (begin <= end) {
      middle = Math.floor((begin + end) / 2);
      var offset = middle;
      var nchar = this.get_lemma_nchar(offset);
      var ws = this.get_lemma_word(offset)[0];

      var minl = nchar < lemma_len ? nchar : lemma_len;
      var k = 0;
      var cmp = 0;

      for (; k < minl; k++) {
        if (ws[k] < words[k]) {
          cmp = -1;
          break;
        } else if (ws[k] > words[k]) {
          cmp = 1;
          break;
        }
      }
      if (cmp == 0) {
        if (nchar < lemma_len)
          cmp = -1;
        else if (nchar > lemma_len)
          cmp = 1;
      }

      if (cmp < 0) {
        begin = middle + 1;
        last_matched = middle;
      } else if (cmp > 0) {
        end = middle - 1;
      } else {
        end = middle - 1;
        last_matched = middle;
      }
    }

    return last_matched;
  },

  /**
   * @param {string} words The words to be located.
   */
  locate_first_in_predicts: function userDict_locate_first_in_predicts(words) {
    var lemma_len = words.length;
    var begin = 0;
    var end = this.dict_info_.lemma_count - 1;
    var middle = -1;

    var last_matched = middle;

    while (begin <= end) {
      middle = (begin + end) >> 1;
      var offset = middle;
      var nchar = this.get_lemma_nchar(offset);
      var ws = this.get_lemma_word(offset)[0];

      var minl = nchar < lemma_len ? nchar : lemma_len;
      var k = 0;
      var cmp = 0;

      for (; k < minl; k++) {
        if (ws[k] < words[k]) {
          cmp = -1;
          break;
        } else if (ws[k] > words[k]) {
          cmp = 1;
          break;
        }
      }
      if (cmp == 0) {
        if (nchar >= lemma_len)
          last_matched = middle;
        if (nchar < lemma_len)
          cmp = -1;
        else if (nchar > lemma_len)
          cmp = 1;
      }

      if (cmp < 0) {
        begin = middle + 1;
      } else if (cmp > 0) {
        end = middle - 1;
      } else {
        end = middle - 1;
      }
    }

    return last_matched;
  },

  remove_lemma_from_predict_list:
      function userDict_remove_lemma_from_predict_list(offset) {
    var i = 0;
    for (; i < this.dict_info_.lemma_count; i++) {
      var off = (this.predicts_[i]);
      if (off == offset) {
        this.predicts_[i] |= UserDict.kUserDictOffsetFlagRemove;
        break;
      }
    }
  },

  /**
   * Create the JSON object of the user dict file.
   * @private
   * @return {ojbect} The JSON object.
   */
  write_back: function userDict_write_back() {
    var info = this.dict_info_;
    var lemmas = this.lemmas_;
    var predicts = this.predicts_;
    var scores = this.scores_;
    return {info: info, lemmas: lemmas, predicts: predicts, scores: scores};
  },

  /**
   * Swap two items of an array.
   * @private
   * @param {Array.<UserDict.UserDictScoreOffsetPair>} sop The sore offset parir
   *    array.
   * @param {number} i The index of the array item to be swapped.
   * @param {number} j The index of the array item to be swapped.
   */
  swap: function userDict_swap(sop, i, j) {
    var tmp = sop[i];
    sop[i] = sop[j];
    sop[j] = tmp;
  },

  /**
   * @param {Array.<UserDict.UserDictScoreOffsetPair>} sop The sore offset parir
   *    array.
   */
  shift_down: function userDict_shift_down(sop, i, n) {
    var par = i;
    while (par < n) {
      var left = par * 2 + 1;
      var right = left + 1;
      if (left >= n && right >= n)
        break;
      if (right >= n) {
        if (sop[left].score > sop[par].score) {
          this.swap(sop, left, par);
          par = left;
          continue;
        }
      } else if (sop[left].score > sop[right].score &&
                 sop[left].score > sop[par].score) {
        this.swap(sop, left, par);
        par = left;
        continue;
      } else if (sop[right].score > sop[left].score &&
                 sop[right].score > sop[par].score) {
        this.swap(sop, right, par);
        par = right;
        continue;
      }
      break;
    }
  },

  memmove: function userDict_memmove(array, dest, src, n) {
    for (var i = 0; i < n; i++) {
      array[dest + i] = array[src + i];
    }
  }

  // On-disk format for each lemma
  // +-------------+
  // | Version (4) |
  // +-------------+
  // +-----------+-----------+--------------------+-------------------+
  // | Spare (1) | Nchar (1) | Splids (2 x Nchar) | Lemma (2 x Nchar) |
  // +-----------+-----------+--------------------+-------------------+
  // ...
  // +-----------------------+     +-------------+      <---Offset of offset
  // | Offset1 by_splids (4) | ... | OffsetN (4) |
  // +-----------------------+     +-------------+
  // +----------------------+     +-------------+
  // | Offset1 by_lemma (4) | ... | OffsetN (4) |
  // +----------------------+     +-------------+
  // +------------+     +------------+
  // | Score1 (4) | ... | ScoreN (4) |
  // +------------+     +------------+
  // +----------------+
  // | Dict Info (4x) |
  // +----------------+
};

/**
 * Save the hanzi strings and make predictions with specified hanzi prefix.
 * @constructor
 */
var DictList = function dictList_constructor() {
  this.start_pos_ = [];
  this.start_id_ = [];
  this.scis_splid_ = [];

  this.spl_trie_ = SpellingTrie.get_instance();

  this.cmp_func_ = [];
  this.cmp_func_[0] = SearchUtility.cmp_hanzis_1;
  this.cmp_func_[1] = SearchUtility.cmp_hanzis_2;
  this.cmp_func_[2] = SearchUtility.cmp_hanzis_3;
  this.cmp_func_[3] = SearchUtility.cmp_hanzis_4;
  this.cmp_func_[4] = SearchUtility.cmp_hanzis_5;
  this.cmp_func_[5] = SearchUtility.cmp_hanzis_6;
  this.cmp_func_[6] = SearchUtility.cmp_hanzis_7;
};

DictList.prototype = {
  /* ==== Public ==== */

  /**
   * Save as JSON string.
   * @private
   * @return {string} JSON string.
   */
  save_list: function dictList_save() {
    var self = this;
    var jsonData = {
      scis_num_: self.scis_num_,
      start_pos_: self.start_pos_,
      start_id_: self.start_id_,
      scis_hz_: self.scis_hz_,
      scis_hz_tr_: self.scis_hz_tr_,
      scis_splid_: self.scis_splid_,
      buf_: self.buf_,
      buf_tr_: self.buf_tr_
    };
    return JSON.stringify(jsonData);
  },

  /**
   * Load from JSON string.
   * @private
   * @param {string} json_str JSON string.
   * @return {boolean} true if successs.
   */
  load_list: function dictList_load(json_str) {
    if (!json_str) {
      return false;
    }

    this.initialized_ = false;

    try {
      var jsonData = JSON.parse(json_str);
      this.scis_num_ = jsonData.scis_num_;
      this.start_pos_ = jsonData.start_pos_;
      this.start_id_ = jsonData.start_id_;
      this.scis_hz_ = jsonData.scis_hz_;
      this.scis_hz_tr_ = jsonData.scis_hz_tr_;
      this.scis_splid_ = jsonData.scis_splid_;
      this.buf_ = jsonData.buf_;
      this.buf_tr_ = jsonData.buf_tr_;
    } catch (ex) {
      debug('load_list: ' + ex);
      return false;
    }

    this.initialized_ = true;
    return true;
  },

  /**
   * Init the list from the DictDef.LemmaEntry array.
   * @param {Array.<DictDef.SingleCharItem>} scis All single char items.
   * @param {Array.<DictDef.LemmaEntry>} lemma_arr The lemma array. It should
   *    have been sorted by the hanzi_str, and have been given ids from 1.
   */
  init_list: function dictList_init_list(scis, lemma_arr) {
    if (!scis || !lemma_arr)
      return false;

    this.initialized_ = false;

    this.buf_ = '';
    this.buf_tr_ = '';

    // calculate the size
    var buf_size = this.calculate_size(lemma_arr);
    if (0 == buf_size)
      return false;

    this.fill_scis(scis);

    // Copy the related content from the array to inner buffer
    this.fill_list(lemma_arr);

    this.initialized_ = true;
    return true;
  },

  /**
   * Get the hanzi string for the given id.
   * @return {[string, string]} The simplified and traditional hanzi strings
   *    if successes. Otherwize empty strings.
   */
  get_lemma_str: function dictList_get_lemma_str(id_lemma) {
    var ret = ['', ''];
    if (!this.initialized_ ||
        id_lemma >= this.start_id_[DictDef.kMaxLemmaSize]) {
      return ret;
    }

    // Find the range
    for (var i = 0; i < DictDef.kMaxLemmaSize; i++) {
      if (this.start_id_[i] <= id_lemma && this.start_id_[i + 1] > id_lemma) {
        var id_span = id_lemma - this.start_id_[i];
        var pos = this.start_pos_[i] + id_span * (i + 1);
        ret[0] = this.buf_.substring(pos, pos + i + 1);
        ret[1] = this.buf_tr_.substring(pos, pos + i + 1);
        return ret;
      }
    }
    return ret;
  },

  /**
   * @param {string} last_hzs stores the last n Chinese characters history,
   * its length should be less or equal than DictDef.kMaxPredictSize.
   * @param {Array.<SearchUtility.NPredictItem>} npre_items The buffer used to
   *    save the result.
   * @param {number} start The start position of the buffer.
   * @param {number} npre_max The length of the buffer from the start position.
   * @param {number} b4_used specifies how many items have been used before the
   *    start position of the buffer.
   * @return {number} The number of newly added items.
   */
  predict: function dictList_predict(last_hzs, npre_items, start, npre_max,
                                     b4_used) {
    // 1. Prepare work
    var hzs_len = last_hzs.length;
    var cmp_func = this.cmp_func_[hzs_len - 1];

    var ngram = NGram.get_instance();

    var item_num = 0;

    // 2. Do prediction
    for (var pre_len = 1; pre_len <= DictDef.kMaxPredictSize + 1 - hzs_len;
         pre_len++) {
      var word_len = hzs_len + pre_len;
      var w_buf = this.find_pos_startedbyhzs(last_hzs, word_len, cmp_func);
      if (-1 == w_buf)
        continue;
      while (w_buf < this.start_pos_[word_len] &&
          cmp_func(this.buf_.substring(w_buf, w_buf + hzs_len), last_hzs) ==
          0 && start + item_num < npre_max) {
        npre_items[start + item_num] = new SearchUtility.NPredictItem();
        npre_items[start + item_num].pre_hzs =
          this.buf_.substring(w_buf + hzs_len, w_buf + hzs_len + pre_len);
        npre_items[start + item_num].pre_hzs_tr =
          this.buf_tr_.substring(w_buf + hzs_len, w_buf + hzs_len + pre_len);
        npre_items[start + item_num].psb =
          ngram.get_uni_psb((w_buf - this.start_pos_[word_len - 1]) /
          word_len + this.start_id_[word_len - 1]);
        npre_items[start + item_num].his_len = hzs_len;
        item_num++;
        w_buf += word_len;
      }
    }

    var new_num = 0;
    for (var i = 0; i < item_num; i++) {
      // Try to find it in the existing items
      var e_pos;
      for (e_pos = 1; e_pos <= b4_used; e_pos++) {
        if (npre_items[start - e_pos].pre_hzs ==
            npre_items[start + i].pre_hzs) {
          break;
        }
      }
      if (e_pos <= b4_used)
        continue;

      // If not found, append it to the buffer
      npre_items[start + new_num].copy(npre_items[start + i]);
      new_num++;
    }
    return new_num;
  },

  /**
   * If half_splid is a valid half spelling id, return those full spelling
   * ids which share this half id.
   * @return {Array.<number>} The full spelling ids array.
   */
  get_splids_for_hanzi: function dictList_get_splids_for_hanzi(hanzi,
      half_splid) {
    var hz_found = MyStdlib.mybsearchStr(hanzi, this.scis_hz_, 0,
        this.scis_num_, 1, SearchUtility.cmp_hanzis_1);
    var splids = [];

    // Move to the first one.
    while (hz_found > 0 && hanzi == this.scis_hz_[hz_found - 1]) {
      hz_found--;
    }

    // First try to found if strict comparison result is not zero.
    var hz_f = hz_found;
    var strict = false;
    while (hz_f < this.scis_hz_ + this.scis_num_ &&
           hanzi == this.scis_hz_[hz_f]) {
      var pos = hz_f;
      if (0 == half_splid || this.scis_splid_[pos].half_splid == half_splid) {
        strict = true;
      }
      hz_f++;
    }

    var found_num = 0;
    while (hz_found < this.scis_hz_ + this.scis_num_ &&
           hanzi == this.scis_hz_[hz_found]) {
      var pos = hz_found;
      if (0 == half_splid ||
          (strict && this.scis_splid_[pos].half_splid == half_splid) ||
          (!strict && this.spl_trie_.half_full_compatible(half_splid,
          this.scis_splid_[pos].full_splid))) {
        splids[found_num] = scis_splid_[pos].full_splid;
        found_num++;
      }
      hz_found++;
    }

    return splids;
  },

  get_lemma_id: function dictList_get_lemma_id(str) {
    if (!str) {
      return 0;
    }
    var str_len = str.length;
    if (str_len > DictDef.kMaxLemmaSize) {
      return 0;
    }

    var found = this.find_pos_startedbyhzs(str, str_len,
        this.cmp_func_[str_len - 1]);
    if (-1 == found)
      return 0;

    return start_id_[str_len - 1] +
         (found - this.start_pos_[str_len - 1]) / str_len;
  },

  /* ==== Private ==== */
  initialized_: false,

  /**
   * @type SpellingTrie
   */
  spl_trie_: null,

  // Number of SingleCharItem. The first is blank, because id 0 is invalid.
  scis_num_: 0,

  /**
   * Simplified SingleCharItem buffer.
   * @type string.
   */
  scis_hz_: '',

  /**
   * Traditional SingleCharItem buffer.
   * @type string
   */
  scis_hz_tr_: '',

  /**
   * @type Array.<DictDef.SpellingId>
   */
  scis_splid_: null,

  /**
   * The large memory block to store the word list of simplified Chinese.
   * @type string
   */
  buf_: '',

  /**
   * The large memory block to store the word list of traditional Chinese.
   * @type string
   */
  buf_tr_: '',

  /**
   * Starting position of those words whose lengths are i+1.
   * So the array length is DictDef.kMaxLemmaSize.
   * @type Array.<number>
   */
  start_pos_: null,

  /**
   * The array length is DictDef.kMaxLemmaSize.
   * @type Array.<number>
   */
  start_id_: null,

  /**
   * An array of comparison function, whose length is DictDef.kMaxLemmaSize.
   * @type Array.<function(string, string): number>
   */
  cmp_func_: null,

  /**
   * Calculate the requsted memory, including the start_pos[] buffer.
   * @param {Array.<DictDef.LemmaEntry>} lemma_arr The lemma array.
   */
  calculate_size: function dictList_calculate_size(lemma_arr) {
    var last_hz_len = 0;
    var list_size = 0;
    var id_num = 0;
    var lemma_num = lemma_arr.length;

    for (var i = 0; i < lemma_num; i++) {
      if (0 == i) {
        last_hz_len = lemma_arr[i].hanzi_str.length;

        id_num++;
        this.start_pos_[0] = 0;
        this.start_id_[0] = id_num;

        last_hz_len = 1;
        list_size += last_hz_len;
      } else {
        var current_hz_len = lemma_arr[i].hanzi_str.length;

        if (current_hz_len == last_hz_len) {
            list_size += current_hz_len;
            id_num++;
        } else {
          for (var len = last_hz_len; len < current_hz_len - 1; len++) {
            this.start_pos_[len] = start_pos_[len - 1];
            this.start_id_[len] = start_id_[len - 1];
          }

          this.start_pos_[current_hz_len - 1] = list_size;

          id_num++;
          this.start_id_[current_hz_len - 1] = id_num;

          last_hz_len = current_hz_len;
          list_size += current_hz_len;
        }
      }
    }

    for (var i = last_hz_len; i <= DictDef.kMaxLemmaSize; i++) {
      if (0 == i) {
        this.start_pos_[0] = 0;
        this.start_id_[0] = 1;
      } else {
        this.start_pos_[i] = list_size;
        this.start_id_[i] = id_num;
      }
    }

    return this.start_pos_[DictDef.kMaxLemmaSize];
  },

  fill_scis: function dictList_fill_scis(scis) {
    this.scis_hz_ = '';
    this.scis_hz_tr_ = '';
    for (var pos = 0; pos < this.scis_num_; pos++) {
      this.scis_hz_ += scis[pos].hz;
      this.scis_hz_tr_ += scis[pos].hz_tr;
      this.scis_splid_[pos] = scis[pos].splid;
    }
  },

  // Copy the related content to the inner buffer
  // It should be called after calculate_size()
  fill_list: function dictList_fill_list(lemma_arr) {
    var lemma_num = lemma_arr.length;
    this.buf_ = '';
    this.buf_tr_ = '';
    for (var i = 0; i < lemma_num; i++) {
      this.buf_ += lemma_arr[i].hanzi_str;
      this.buf_tr_ += lemma_arr[i].hanzi_str_tr;
      assert(this.buf_.length == this.buf_tr_.length,
             'fill_list assertion error');
    }
  },

  /**
   * Find the starting position for those words whose lengths are
   * the same with last_hzs and have the same prefix. The given parameter
   * cmp_func decides how many characters from beginning will be used to
   * compare.
   */
  find_pos_startedbyhzs: function dictList_find_pos_startedbyhzs(last_hzs,
      word_len, cmp_func) {
    var found_w = MyStdlib.mybsearchStr(last_hzs, this.buf_,
      this.start_pos_[word_len - 1],
      (this.start_pos_[word_len] - this.start_pos_[word_len - 1]) / word_len,
      word_len, cmp_func);

    if (-1 == found_w)
      return -1;

    while (found_w > this.start_pos_[word_len - 1] &&
           cmp_func(this.buf_.substring(found_w, found_w + word_len),
                    this.buf_.substring(found_w - word_len, found_w)) == 0) {
      found_w -= word_len;
    }

    return found_w;
  }
};

/**
 * Call NGram.get_instance to retrieve the singleton instance.
 * @private
 */
var NGram = function ngram_constructor() {
  this.freq_codes_df_ = [];
  this.freq_codes_ = [];
  this.lma_freq_idx_ = [];
};

/**
 * Return the singleton instance of NGram.
 * @return {NGram} The NGram instance.
 */
NGram.get_instance = function ngram_get_instance() {
  if (NGram.instance_ == null) {
    NGram.instance_ = new NGram();
  }
  return NGram.instance_;
};

/**
 * NGram singleton instance.
 * @private
 * @type NGram
 */
NGram.instance_ = null;

/**
 * Convert a probability to score. Actually, the score will be limited to
 * kMaxScore, but at runtime, we also need float expression to get accurate
 * value of the score.
 * After the conversion, a lower score indicates a higher probability of the
 * item.
 */
NGram.convert_psb_to_score = function ngram_convert_psb_to_score(psb) {
  var score = Math.log(psb) * NGram.kLogValueAmplifier;
  if (score > NGram.kMaxScore) {
    score = NGram.kMaxScore;
  }
  return score;
};

NGram.kCodeBookSize = 256;

// The maximum score of a lemma item.
NGram.kMaxScore = 0x3fff;

/**
 * In order to reduce the storage size, the original log value is amplified by
 * kScoreAmplifier, and we use LmaScoreType to store.
 * After this process, an item with a lower score has a higher frequency.
 */
NGram.kLogValueAmplifier = -800;

/** System words' total frequency. It is not the real total frequency, instead,
 * It is only used to adjust system lemmas' scores when the user dictionary's
 * total frequency changes.
 * In this version, frequencies of system lemmas are fixed. We are considering
 * to make them changable in next version.
 */
NGram.kSysDictTotalFreq = 100000000;

NGram.prototype = {
  /* ==== Public ==== */

  /**
   * Save as JSON string.
   * @private
   * @return {string} JSON string.
   */
  save_ngram: function ngram_save_ngram() {
    var self = this;

    // serialize lma_freq_idx_
    var lma_freq_idx_str = '';
    var lma_freq_idx_num = this.lma_freq_idx_.length;
    for (var i = 0; i < lma_freq_idx_num; i++) {
      lma_freq_idx_str += StringUtils.int8ToChar(this.lma_freq_idx_[i]);
    }

    var jsonData = {
      idx_num_: self.idx_num_,
      freq_codes_: self.freq_codes_,
      lma_freq_idx_: lma_freq_idx_str
    };
    return JSON.stringify(jsonData);
  },

  /**
   * Load from JSON string.
   * @private
   * @param {string} json_str JSON string.
   * @return {boolean} true if successs.
   */
  load_ngram: function ngram_load_ngram(json_str) {
    if (!json_str) {
      return false;
    }

    this.initialized_ = false;

    try {
      var jsonData = JSON.parse(json_str);
      this.idx_num_ = jsonData.idx_num_;
      this.freq_codes_ = jsonData.freq_codes_;

      // Deserialize lma_freq_idx_
      this.lma_freq_idx_ = [];
      var lma_freq_idx_str = jsonData.lma_freq_idx_;
      for (var i = 0; i < lma_freq_idx_str.length; i++) {
        var idx = StringUtils.charToInt8(lma_freq_idx_str.charAt(i));
        this.lma_freq_idx_.push(idx);
      }
    } catch (ex) {
      debug('load_ngram: ' + ex);
      return false;
    }

    this.initialized_ = true;

    this.total_freq_none_sys_ = 0;
    return true;
  },

  // Set the total frequency of all none system dictionaries.
  set_total_freq_none_sys:
      function ngram_set_total_freq_none_sys(freq_none_sys) {
    this.total_freq_none_sys_ = freq_none_sys;
    if (0 == this.total_freq_none_sys_) {
      this.sys_score_compensation_ = 0;
    } else {
      var factor = NGram.kSysDictTotalFreq / (NGram.kSysDictTotalFreq +
        this.total_freq_none_sys_);
      this.sys_score_compensation_ = Math.log(factor) *
        NGram.kLogValueAmplifier;
    }
  },

  get_uni_psb: function ngram_get_uni_psb(lma_id) {
    return this.freq_codes_[this.lma_freq_idx_[lma_id]] +
      this.sys_score_compensation_;
  },

  /**
   * For constructing the unigram mode model.
   * @param {Array.<DictDef.LemmaEntry>} lemma_arr Lemma array.
   */
  build_unigram: function ngram_build_unigram(lemma_arr) {
    debug('build_unigram');
    if (!lemma_arr) {
      return false;
    }

    var lemma_num = lemma_arr.length;
    if (lemma_num == 0) {
      return false;
    }

    var total_freq = 0;
    var freqs = [];

    freqs[0] = 0.3;
    total_freq += freqs[0];
    var idx_now = 0;
    for (var pos = 0; pos < lemma_num; pos++) {
      if (lemma_arr[pos].idx_by_hz == idx_now)
        continue;
      idx_now++;

      freqs[idx_now] = lemma_arr[pos].freq;
      if (freqs[idx_now] <= 0) {
        freqs[idx_now] = 0.3;
      }

      total_freq += freqs[idx_now];
    }

    var max_freq = 0;
    this.idx_num_ = idx_now + 1;

    for (var pos = 0; pos < this.idx_num_; pos++) {
      freqs[pos] = freqs[pos] / total_freq;
      if (freqs[pos] > max_freq) {
        max_freq = freqs[pos];
      }
    }

    // calculate the code book
    this.freq_codes_df_ = [];
    this.freq_codes_ = [];
    for (var pos = 0; pos < NGram.kCodeBookSize; pos++) {
      this.freq_codes_df_[pos] = 0;
      this.freq_codes_[pos] = 0;
    }

    var freq_pos = 0;
    for (var code_pos = 0; code_pos < NGram.kCodeBookSize; code_pos++) {
      var found = true;
      while (found) {
        found = false;
        assert(freq_pos < freqs.length, 'build_unigram assertion error.' +
               'Not enough data to create code book.');
        var cand = freqs[freq_pos];
        for (var i = 0; i < code_pos; i++) {
          if (this.freq_codes_df_[i] == cand) {
            found = true;
            break;
          }
        }
        if (found) {
          freq_pos++;
        }
      }

      this.freq_codes_df_[code_pos] = freqs[freq_pos];
      freq_pos++;
    }

    this.freq_codes_df_.sort(SearchUtility.compare);

    this.lma_freq_idx_ = [];
    for (var pos = 0; pos < this.idx_num_; pos++) {
      this.lma_freq_idx_[pos] = 0;
    }

    this.iterate_codes(freqs, this.freq_codes_df_,
        this.lma_freq_idx_);

    debug('------Language Model Unigram Codebook------');

    for (var code_pos = 0; code_pos < NGram.kCodeBookSize; code_pos++) {
      var log_score = Math.log(this.freq_codes_df_[code_pos]);
      var final_score =
        NGram.convert_psb_to_score(this.freq_codes_df_[code_pos]);
      debug(StringUtils.format(
          'code:{0}, probability:{1}, log score:{2}, final score:{3}',
          code_pos, this.freq_codes_df_[code_pos], log_score, final_score));
      this.freq_codes_[code_pos] = final_score;
    }

    this.initialized_ = true;
    return true;
  },

  /* ==== Private ==== */
  initialized_: false,

  idx_num_: 0,

  total_freq_none_sys_: 0,

  // Score compensation for system dictionary lemmas.
  // Because after user adds some user lemmas, the total frequency changes, and
  // we use this value to normalize the score.
  sys_score_compensation_: 0,

  freq_codes_df_: null,

  freq_codes_: null,

  lma_freq_idx_: null,

  iterate_codes: function ngram_iterate_codes(freqs, code_book, code_idx) {
    var iter_num = 0;
    var delta_last = 0;
    do {
      var changed = this.update_code_idx(freqs, code_book, code_idx);

      var delta = this.recalculate_kernel(freqs, code_book, code_idx);

      iter_num++;

      if (iter_num > 1 &&
          (delta == 0 ||
          Math.abs(delta_last - delta) / Math.abs(delta) < 0.000000001)) {
        break;
      }
      delta_last = delta;
    } while (true);
  },

  update_code_idx: function ngram_update_code_idx(freqs, code_book, code_idx) {
    var num = freqs.length;
    var changed = 0;
    for (var pos = 0; pos < num; pos++) {
      var idx = this.qsearch_nearest(code_book, freqs[pos], 0,
                                 NGram.kCodeBookSize - 1);
      if (idx != code_idx[pos]) {
        changed++;
      }
      code_idx[pos] = idx;
    }
    return changed;
  },

  // Find the index of the code value which is nearest to the given freq
  qsearch_nearest:
      function ngram_qsearch_nearest(code_book, freq, start, end) {
    if (start == end) {
      return start;
    }

    if (start + 1 == end) {
      if (this.distance(freq, code_book[end]) >
          this.distance(freq, code_book[start])) {
        return start;
      }
      return end;
    }

    var mid = Math.floor((start + end) / 2);

    if (code_book[mid] > freq) {
      return this.qsearch_nearest(code_book, freq, start, mid);
    } else {
      return this.qsearch_nearest(code_book, freq, mid, end);
    }
  },

  distance: function ngram_distance(freq, code) {
    return freq * Math.abs(Math.log(freq) - Math.log(code));
  },

  recalculate_kernel:
      function ngram_recalculate_kernel(freqs, code_book, code_idx) {
    var num = freqs.length;
    var ret = 0;

    var item_num = [];
    var cb_new = [];
    for (var pos = 0; pos < NGram.kCodeBookSize; pos++) {
      item_num[pos] = 0;
      cb_new[pos] = 0;
    }

    for (var pos = 0; pos < num; pos++) {
      ret += this.distance(freqs[pos], code_book[code_idx[pos]]);

      cb_new[code_idx[pos]] += freqs[pos];
      item_num[code_idx[pos]] += 1;
    }

    for (var code = 0; code < NGram.kCodeBookSize; code++) {
      code_book[code] = cb_new[code] / item_num[code];
    }

    return ret;
  }
};

var SpellingParser = function spellingParser_constructor() {
  this.spl_trie_ = SpellingTrie.get_instance();
};

SpellingParser.prototype = {
  /* ==== Private ==== */

  /**
   * @type SpellingTrie
   */
  spl_trie_: null,

  /* ==== Public ==== */

  /** Given a string, parse it into a spelling id stream.
   * @param {string} splstr The given spelling string.
   * @return
   * {spl_idx: Array.<number>, start_pos: Array.<number>, last_is_pre: boolean}
   * If the whole string are successfully parsed, last_is_pre will be true;
   * if the whole string is not fully parsed, last_is_pre will return whether
   * the last part of the string is a prefix of a full spelling string. For
   * example, given string "zhengzhon", "zhon" is not a valid spelling, but it
   * is the prefix of "zhong".
   * If splstr starts with a character not in ['a'-z'] (it is a split char),
   * return empty result.
   * Split char can only appear in the middle of the string or at the end.
   */
  splstr_to_idxs: function spellingParser_splstr_to_idxs(splstr) {
    var defaultResult = {spl_idx: [], start_pos: [], last_is_pre: false};
    if (!splstr) {
      return defaultResult;
    }

    if (!SpellingTrie.is_valid_spl_char(splstr[0])) {
      return defaultResult;
    }

    var last_is_pre = false;

    var node_this = this.spl_trie_.root_;

    var str_pos = 0;
    var idx_num = 0;
    var spl_idx = [];
    var start_pos = [0];
    var last_is_splitter = false;
    var str_len = splstr.length;
    while (str_pos < str_len) {
      var char_this = splstr[str_pos];
      // all characters outside of [a, z] are considered as splitters
      if (!SpellingTrie.is_valid_spl_char(char_this)) {
        // test if the current node is endable
        var id_this = node_this.spelling_idx;
        var ret = this.spl_trie_.if_valid_id_update(id_this);
        if (ret.valid) {
          id_this = ret.spl_id;
          spl_idx[idx_num] = id_this;

          idx_num++;
          str_pos++;
          start_pos[idx_num] = str_pos;

          node_this = this.spl_trie_.root_;
          last_is_splitter = true;
          continue;
        } else {
          if (last_is_splitter) {
            str_pos++;
            start_pos[idx_num] = str_pos;
            continue;
          } else {
            return {
              spl_idx: spl_idx,
              start_pos: start_pos,
              last_is_pre: last_is_pre
            };
          }
        }
      }

      last_is_splitter = false;

      var found_son = null;

      if (0 == str_pos) {
        if (char_this >= 'a') {
          found_son =
            this.spl_trie_.level1_sons_[StringUtils.charDiff(char_this, 'a')];
        } else {
          found_son =
            this.spl_trie_.level1_sons_[StringUtils.charDiff(char_this, 'A')];
        }
      } else {
        var sons = node_this.sons;
        // Because for Zh/Ch/Sh nodes, they are the last in the buffer and
        // frequently used, so we scan from the end.
        for (var i = 0; i < node_this.num_of_son; i++) {
          var this_son = sons[i];
          if (SpellingTrie.is_same_spl_char(
              this_son.char_this_node, char_this)) {
            found_son = this_son;
            break;
          }
        }
      }

      // found, just move the current node pointer to the the son
      if (null != found_son) {
        node_this = found_son;
      } else {
        // not found, test if it is endable
        var id_this = node_this.spelling_idx;
        var ret = this.spl_trie_.if_valid_id_update(id_this);
        if (ret.valid) {
          id_this = ret.spl_id;
          // endable, remember the index
          spl_idx[idx_num] = id_this;

          idx_num++;
          start_pos[idx_num] = str_pos;
          node_this = this.spl_trie_.root_;
          continue;
        } else {
          return {
            spl_idx: spl_idx,
            start_pos: start_pos,
            last_is_pre: last_is_pre
          };
        }
      }

      str_pos++;
    }

    var id_this = node_this.spelling_idx;
    var ret = this.spl_trie_.if_valid_id_update(id_this);
    if (ret.valid) {
      id_this = ret.spl_id;
      // endable, remember the index
      spl_idx[idx_num] = id_this;

      idx_num++;
      start_pos[idx_num] = str_pos;
    }

    last_is_pre = !last_is_splitter;

    return {spl_idx: spl_idx, start_pos: start_pos, last_is_pre: last_is_pre};
  },

  /**
   * Similar to splstr_to_idxs(), the only difference is that splstr_to_idxs()
   * convert single-character Yunmus into half ids, while this function converts
   * them into full ids.
   */
  splstr_to_idxs_f: function spellingParser_splstr_to_idxs_f(splstr) {
    var ret = this.splstr_to_idxs(splstr);
    var spl_idx = ret.spl_idx;
    var idx_num = spl_idx.length;

    for (var pos = 0; pos < idx_num; pos++) {
      if (this.spl_trie_.is_half_id_yunmu(spl_idx[pos])) {
        var full = this.spl_trie_.half_to_full(spl_idx[pos]);
        if (full.num > 0) {
          spl_idx[pos] = full.spl_id_start;
        }
        if (pos == idx_num - 1) {
          ret.last_is_pre = false;
        }
      }
    }
    return ret;
  },

  /**
   * Get the spelling id of given string.
   * @param {string} splstr The spelling string.
   * @return {spl_id: number, is_pre: boolean}
   * If the given string is a spelling, return the id, others, return 0.
   * If the give string is a single char Yunmus like "A", and the char is
   * enabled in ShouZiMu mode, the returned spelling id will be a half id.
   * When the returned spelling id is a half id, is_pre returns whether it
   * is a prefix of a full spelling string.
   */
  get_splid_by_str: function spellingParser_get_splid_by_str(splstr) {
    var spl_idx = [];
    var start_pos = [];

    var ret = this.splstr_to_idxs(splstr);
    if (ret.spl_idx.length != 1) {
      return {spl_id: 0, is_pre: ret.last_is_pre};
    }

    if (ret.start_pos[1] != splstr.length) {
      return {spl_id: 0, is_pre: ret.last_is_pre};
    }
    return {spl_id: ret.spl_idx[0], is_pre: ret.last_is_pre};
  },

  /**
   * Splitter chars are not included.
   */
  is_valid_to_parse: function spellingParser_is_valid_to_parse(ch) {
    return SpellingTrie.is_valid_spl_char(ch);
  }
};

/**
 * Call SpellingTrie.get_instance method instead of direct calling this
 * constructor.
 * @private
 */
var SpellingTrie = function spellingTrie_constructor() {
  this.h2f_start_ = [];
  this.h2f_num_ = [];
  for (var i = 0; i < SpellingTrie.kFullSplIdStart; i++) {
    this.h2f_start_[i] = 0;
    this.h2f_num_[i] = 0;
  }
  this.szm_enable_shm(true);
  this.szm_enable_ym(true);
};

/**
 * Node used for the trie of spellings
 */
SpellingTrie.SpellingNode = function spellingNode_constructor() {
  this.sons = [];
};

SpellingTrie.SpellingNode.prototype = {
  /**
   * @type Array.<SpellingTrie.SpellingNode>
   */
  sons: null,
  /**
   * The spelling id for each node.
   * @type Integer
   */
  spelling_idx: 0,
  /**
   * @type number
   */
  num_of_son: 0,

  /**
   * @type string
   */
  char_this_node: '',

  /**
   * @type number
   */
  score: 0
};

/**
 * The singleton instance of SpellingTrie.
 * @private
 */
SpellingTrie.instance_ = null;

/**
 * Get the singleton instance of SpellingTrie.
 * @return {SpellingTrie} The singleton instance.
 */
SpellingTrie.get_instance = function get_instance() {
  if (SpellingTrie.instance_ == null) {
    SpellingTrie.instance_ = new SpellingTrie();
  }
  return SpellingTrie.instance_;
};

SpellingTrie.kFullSplIdStart = kHalfSpellingIdNum + 1;
SpellingTrie.kMaxYmNum = 64;
SpellingTrie.kValidSplCharNum = 26;
SpellingTrie.kHalfIdShengmuMask = 0x01;
SpellingTrie.kHalfIdYunmuMask = 0x02;
SpellingTrie.kHalfIdSzmMask = 0x04;

/**
 * Map from half spelling id to single char.
 * For half ids of Zh/Ch/Sh, map to z/c/s (low case) respectively.
 * For example, 1 to 'A', 2 to 'B', 3 to 'C', 4 to 'c', 5 to 'D', ...,
 * 28 to 'Z', 29 to 'z'.
 * [0] is not used to achieve better efficiency.
 */
SpellingTrie.kHalfId2Sc_ = '0ABCcDEFGHIJKLMNOPQRSsTUVWXYZz';

/**
 * Bit 0 : is it a Shengmu char?
 * Bit 1 : is it a Yunmu char? (one char is a Yunmu)
 * Bit 2 : is it enabled in ShouZiMu(first char) mode?
 */
SpellingTrie.char_flags_ = [
  // a    b      c     d     e     f     g
  0x02, 0x01, 0x01, 0x01, 0x02, 0x01, 0x01,
  // h    i     j      k     l     m    n
  0x01, 0x00, 0x01, 0x01, 0x01, 0x01, 0x01,
  // o    p     q      r     s     t
  0x02, 0x01, 0x01, 0x01, 0x01, 0x01,
  // u    v     w      x     y     z
  0x00, 0x00, 0x01, 0x01, 0x01, 0x01
];

SpellingTrie.is_valid_spl_char = function is_valid_spl_char(ch) {
  return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z');
};

// The caller guarantees that the two chars are valid spelling chars.
SpellingTrie.is_same_spl_char = function is_same_spl_char(ch1, ch2) {
  return ch1.toUpperCase() == ch2.toUpperCase();
};

SpellingTrie.prototype = {
 /* ==== Public ==== */

  /**
   * Construct the tree from the input pinyin array
   * The given string list should have been sorted.
   * @param {String[]} spelling_arr The input pinyin array.
   * @param {number} score_amplifier is used to convert a possibility
   * value into score.
   * @param {number} average_score is the average_score of all spellings.
   * The dumb node is assigned with this score.
   */
  construct: function spellingTrie_construct(spelling_arr, score_amplifier,
                                             average_score) {
    if (!spelling_arr)
      return false;

    this.h2f_start_ = [];
    this.h2f_num_ = [];
    for (var i = 0; i < SpellingTrie.kFullSplIdStart; i++) {
      this.h2f_start_[i] = 0;
      this.h2f_num_[i] = 0;
    }

    this.spelling_buf_ = spelling_arr.concat();
    this.spelling_num_ = spelling_arr.length;

    this.score_amplifier_ = score_amplifier;
    this.average_score_ = average_score;

    this.splstr_queried_ = '';

    this.node_num_ = 1;

    this.root_ = new SpellingTrie.SpellingNode();

    this.level1_sons_ = [];

    this.root_.sons = this.construct_spellings_subset(0, this.spelling_num_, 0,
        this.root_);

    // Root's score should be cleared.
    this.root_.score = 0;

    if (this.root_.sons.length == 0) {
      return false;
    }

    this.h2f_start_[0] = this.h2f_num_[0] = 0;

    if (!this.build_f2h()) {
      return false;
    }

    return this.build_ym_info();
  },

  /**
   * Test if the given id is a valid spelling id.
   * @return {valid: Boolean, spl_id: Integer}
   * If valid is true, the given spl_id may be updated like this:
   * When 'A' is not enabled in ShouZiMu mode, the parsing result for 'A' is
   * first given as a half id 1, but because 'A' is a one-char Yunmu and
   * it is a valid id, it needs to updated to its corresponding full id.
   */
  if_valid_id_update: function spellingTrie_if_valid_id_update(spl_id) {
    if (!spl_id)
      return {valid: false, spl_id: spl_id};

    if (spl_id >= SpellingTrie.kFullSplIdStart) {
      return {valid: true, spl_id: spl_id};
    }
    if (spl_id < SpellingTrie.kFullSplIdStart) {
      var ch = SpellingTrie.kHalfId2Sc_[spl_id];
      if (ch > 'Z') {
        // For half ids of Zh/Ch/Sh, map to z/c/s (low case)
        return {valid: true, spl_id: spl_id};
      } else {
        if (this.szm_is_enabled(ch)) {
          return {valid: true, spl_id: spl_id};
        } else if (this.is_yunmu_char(ch)) {
          spl_id = this.h2f_start_[spl_id];
          return {valid: true, spl_id: spl_id};
        }
      }
    }
    return {valid: false, spl_id: spl_id};
  },


  // Test if the given id is a half id.
  is_half_id: function spellingTrie_is_half_id(spl_id) {
    if (0 == spl_id || spl_id >= SpellingTrie.kFullSplIdStart)
      return false;

    return true;
  },

  is_full_id: function spellingTrie_is_full_id(spl_id) {
    if (spl_id < SpellingTrie.kFullSplIdStart ||
        spl_id >= SpellingTrie.kFullSplIdStart + this.spelling_num_)
      return false;
    return true;
  },

  // Test if the given id is a one-char Yunmu id (obviously, it is also a half
  // id), such as 'A', 'E' and 'O'.
  is_half_id_yunmu: function spellingTrie_is_half_id_yunmu(spl_id) {
    if (0 == spl_id || spl_id >= SpellingTrie.kFullSplIdStart)
      return false;

    var ch = SpellingTrie.kHalfId2Sc_[spl_id];
    // If ch >= 'a', that means the half id is one of Zh/Ch/Sh
    if (ch >= 'a') {
      return false;
    }

    return SpellingTrie.char_flags_[StringUtils.charDiff(ch, 'A')] &
      SpellingTrie.kHalfIdYunmuMask;
  },

  /** Test if this char is a ShouZiMu char. This ShouZiMu char may be not
   * enabled.
   * For Pinyin, only i/u/v is not a ShouZiMu char.
   * The caller should guarantee that ch >= 'A' && ch <= 'Z'
   */
  is_szm_char: function spellingTrie_is_szm_char(ch) {
    return this.is_shengmu_char(ch) || this.is_yunmu_char(ch);
  },

  // Test If this char is enabled in ShouZiMu mode.
  // The caller should guarantee that ch >= 'A' && ch <= 'Z'
  szm_is_enabled: function spellingTrie_szm_is_enabled(ch) {
    return SpellingTrie.char_flags_[StringUtils.charDiff(ch, 'A')] &
      SpellingTrie.kHalfIdSzmMask;
  },

  // Enable/disable Shengmus in ShouZiMu mode(using the first char of a spelling
  // to input).
  szm_enable_shm: function spellingTrie_szm_enable_shm(enable) {
    if (enable) {
      for (var code = 'A'.charCodeAt(0); code <= 'Z'.charCodeAt(0); code++) {
        var ch = String.fromCharCode(code);
        if (this.is_shengmu_char(ch)) {
          SpellingTrie.char_flags_[code - 'A'.charCodeAt(0)] =
            SpellingTrie.char_flags_[code - 'A'.charCodeAt(0)] |
            SpellingTrie.kHalfIdSzmMask;
        }
      }
    } else {
      for (var code = 'A'.charCodeAt(0); code <= 'Z'.charCodeAt(0); code++) {
        var ch = String.fromCharCode(code);
        if (this.is_shengmu_char(ch)) {
          SpellingTrie.char_flags_[code - 'A'.charCodeAt(0)] =
            SpellingTrie.char_flags_[code - 'A'.charCodeAt(0)] &
            (SpellingTrie.kHalfIdSzmMask ^ 0xff);
        }
      }
    }
  },

  // Enable/disable Yunmus in ShouZiMu mode.
  szm_enable_ym: function spellingTrie_szm_enable_ym(enable) {
    if (enable) {
      for (var code = 'A'.charCodeAt(0); code <= 'Z'.charCodeAt(0); code++) {
        var ch = String.fromCharCode(code);
        if (this.is_yunmu_char(ch)) {
          SpellingTrie.char_flags_[code - 'A'.charCodeAt(0)] =
            SpellingTrie.char_flags_[code - 'A'.charCodeAt(0)] |
            SpellingTrie.kHalfIdSzmMask;
        }
      }
    } else {
      for (var code = 'A'.charCodeAt(0); code <= 'Z'.charCodeAt(0); code++) {
        var ch = String.fromCharCode(code);
        if (this.is_yunmu_char(ch)) {
          SpellingTrie.char_flags_[code - 'A'.charCodeAt(0)] =
            SpellingTrie.char_flags_[code - 'A'.charCodeAt(0)] &
            (SpellingTrie.kHalfIdSzmMask ^ 0xff);
        }
      }
    }
  },

  // Return the number of full ids for the given half id.
  half2full_num: function spellingTrie_half2full_num(half_id) {
    if (null == this.root_ || half_id >= SpellingTrie.kFullSplIdStart)
      return 0;
    return this.h2f_num_[half_id];
  },

  /**
   * @return {num: number, spl_id_start: number} num is the number of full ids
   * for the given half id, and spl_id_start is the first full id.
   */
  half_to_full: function spellingTrie_half_to_full(half_id) {
    if (null == this.root_ || half_id >= SpellingTrie.kFullSplIdStart) {
      return {num: 0, spl_id_start: 0};
    }

    var spl_id_start = this.h2f_start_[half_id];
    return {num: this.h2f_num_[half_id], spl_id_start: spl_id_start};
  },

  // Return the corresponding half id for the given full id.
  // Not frequently used, low efficient.
  // Return 0 if fails.
  full_to_half: function spellingTrie_full_to_half(full_id) {
    if (null == this.root_ || full_id < SpellingTrie.kFullSplIdStart ||
        full_id > this.spelling_num_ + SpellingTrie.kFullSplIdStart) {
      return 0;
    }

    return this.f2h_[full_id - SpellingTrie.kFullSplIdStart];
  },

  // To test whether a half id is compatible with a full id.
  // Generally, when half_id == full_to_half(full_id), return true.
  // But for "Zh, Ch, Sh", if fussy mode is on, half id for 'Z' is compatible
  // with a full id like "Zhe". (Fussy mode is not ready).
  half_full_compatible: function spellingTrie_half_full_compatible(
      half_id, full_id) {
    var half_fr_full = this.full_to_half(full_id);

    if (half_fr_full == half_id) {
      return true;
    }

    // So that Zh/Ch/Sh(whose char is z/c/s) can be matched with Z/C/S.
    var ch_f = SpellingTrie.kHalfId2Sc_[half_fr_full].toUpperCase();
    var ch_h = SpellingTrie.kHalfId2Sc_[half_id];
    if (ch_f == ch_h) {
      return true;
    }

    return false;
  },

  /**
   * Save as JSON string.
   * @private
   * @return {string} JSON string.
   */
  save_spl_trie: function spellingTrie_save_spl_trie() {
    var self = this;
    var jsonData = {
      spelling_num_: self.spelling_num_,
      score_amplifier_: self.score_amplifier_,
      average_score_: self.average_score_,
      spelling_buf_: self.spelling_buf_
    };
    return JSON.stringify(jsonData);
  },

  /**
   * Load from JSON string.
   * @private
   * @param {string} JSON string.
   * @return {boolean} true if successs.
   */
  load_spl_trie: function spellingTrie_load_spl_trie(json_str) {
    if (!json_str) {
      return false;
    }
    try {
      var jsonData = JSON.parse(json_str);
      this.spelling_num_ = jsonData.spelling_num_;
      this.score_amplifier_ = jsonData.score_amplifier_;
      this.average_score_ = jsonData.average_score_;
      this.spelling_buf_ = jsonData.spelling_buf_;
    } catch (ex) {
      debug('load_spl_trie: ' + ex);
      return false;
    }

    return this.construct(this.spelling_buf_, this.spelling_num_,
      this.score_amplifier_, this.average_score_);
  },

  // Get the number of spellings
  get_spelling_num: function spellingTrie_get_spelling_num() {
    return this.spelling_num_;
  },

  // Return the Yunmu id for the given Yunmu string.
  // If the string is not valid, return 0;
  get_ym_id: function spellingTrie_get_ym_id(ym_str) {
    if ('' == ym_str || null == this.ym_buf_) {
      return 0;
    }

    for (var pos = 0; pos < this.ym_num_; pos++) {
      if (this.ym_buf_[pos].str == ym_str) {
        return pos + 1;
      }
    }

    return 0;
  },

  // Get the readonly Pinyin string for a given spelling id
  get_spelling_str: function spellingTrie_get_spelling_str(spl_id) {
    this.splstr_queried_ = '';

    if (spl_id >= SpellingTrie.kFullSplIdStart) {
      spl_id -= SpellingTrie.kFullSplIdStart;
      this.splstr_queried_ = this.spelling_buf_[spl_id].str;
    } else {
      if (spl_id == StringUtils.charDiff('C', 'A') + 1 + 1) {
        this.splstr_queried_ = 'Ch';
      } else if (spl_id == StringUtils.charDiff('S', 'A') + 1 + 2) {
        this.splstr_queried_ = 'Sh';
      } else if (spl_id == StringUtils.charDiff('Z', 'A') + 1 + 3) {
        this.splstr_queried_ = 'Zh';
      } else {
        if (spl_id > StringUtils.charDiff('C', 'A') + 1) {
          spl_id--;
        }
        if (spl_id > StringUtils.charDiff('S', 'A') + 1) {
          spl_id--;
        }
        this.splstr_queried_ =
          String.fromCharCode('A'.charCodeAt(0) + spl_id - 1);
      }
    }
    return this.splstr_queried_;
  },

  /* ==== Private ==== */

  /**
   * The spelling table
   * @type Array.<SpellingTable.RawSpelling>
   */
  spelling_buf_: null,

  // Number of full spelling ids.
  spelling_num_: 0,

  score_amplifier_: 0.0,
  average_score_: 0,

  /**
   * The Yunmu id list for the spelling ids (for half ids of Shengmu,
   * the Yunmu id is 0).
   * The length of the list is spelling_num_ + kFullSplIdStart,
   * so that spl_ym_ids_[spl_id] is the Yunmu id of the spl_id.
   * @type Array.<number>
   */
  spl_ym_ids_: null,

  /**
   * The Yunmu table.
   * Each Yunmu will be assigned with Yunmu id from 1.
   * @type Array.<SpellingTable.RawSpelling>
   */
  ym_buf_: null,
  ym_num_: 0,

  // The spelling string just queried
  splstr_queried_: '',

  // The root node of the spelling tree
  // @type SpellingTrie.SpellingNode
  root_: null,

  /**
   * Used to get the first level sons.
   * The array length is SpellingTrie.kValidSplCharNum.
   * @type Array.<SpellingTrie.SpellingNode>
   */
  level1_sons_: null,

  /**
   * The full spl_id range for specific half id.
   * h2f means half to full.
   * A half id can be a ShouZiMu id (id to represent the first char of a full
   * spelling, including Shengmu and Yunmu), or id of zh/ch/sh.
   * [1..SpellingTrie.kFullSplIdStart-1] is the range of half id.
   */

  /**
   * The array length is SpellingTrie.kFullSplIdStart
   * @type Array.<number>
   */
  h2f_start_: null,

  /**
   * The array length is SpellingTrie.kFullSplIdStart
   * @type Array.<number>
   */
  h2f_num_: null,

  /** Map from full id to half id.
   * @type Integer[]
   */
  f2h_: null,

  // How many node used to build the trie.
  node_num_: 0,

  // Construct a subtree using a subset of the spelling array (from
  // item_star to item_end).
  // parent is used to update its num_of_son and score.
  construct_spellings_subset: function spellingTrie_free_son_trie(
      item_start, item_end, level, parent) {
    if (item_end <= item_start || null == parent)
      return null;

    var sons = [];
    var num_of_son = 0;
    var min_son_score = 255;

    var spelling_last_start = this.spelling_buf_[item_start];
    var char_for_node = spelling_last_start.str[level];
    assert(char_for_node >= 'A' && char_for_node <= 'Z' ||
         'h' == char_for_node,
         'construct_spellings_subset assertion error.' +
         'Invalid char_for_node.');

    // Scan the array to find how many sons
    for (var i = item_start + 1; i < item_end; i++) {
      var spelling_current = this.spelling_buf_[i];
      var char_current = spelling_current.str[level];
      if (char_current != char_for_node) {
        num_of_son++;
        char_for_node = char_current;
      }
    }
    num_of_son++;

    this.node_num_ += num_of_son;
    for (var i = 0; i < num_of_son; i++) {
      sons[i] = new SpellingTrie.SpellingNode();
    }

    // Now begin construct tree
    var son_pos = 0;

    char_for_node = spelling_last_start.str[level];

    var spelling_endable = true;
    if (spelling_last_start.str.length > level + 1) {
      spelling_endable = false;
    }

    var item_start_next = item_start;

    for (var i = item_start + 1; i < item_end; i++) {
      var spelling_current = this.spelling_buf_[i];
      var char_current = spelling_current.str[level];
      assert(SpellingTrie.is_valid_spl_char(char_current),
        'construct_spellings_subset assertion error. Invalid char_current: ' +
        char_current);

      if (char_current != char_for_node) {
        // Construct a node
        var node_current = sons[son_pos];
        node_current.char_this_node = char_for_node;
        if (!char_for_node) {
          assertEq(true, false, 'char_this_node');
        }
        // For quick search in the first level
        if (0 == level) {
          this.level1_sons_[StringUtils.charDiff(char_for_node, 'A')] =
            node_current;
        }

        if (spelling_endable) {
          node_current.spelling_idx =
            SpellingTrie.kFullSplIdStart + item_start_next;
        }

        if (spelling_last_start.str.length > level + 1 ||
            i - item_start_next > 1) {
          var real_start = item_start_next;
          if (spelling_last_start.str.length == level + 1) {
            real_start++;
          }

          node_current.sons =
              this.construct_spellings_subset(real_start, i, level + 1,
                                         node_current);

          if (real_start == item_start_next + 1) {
            var score_this = spelling_last_start.score;
            if (score_this < node_current.score) {
              node_current.score = score_this;
            }
          }
        } else {
          node_current.sons = [];
          node_current.score = spelling_last_start.score;
        }

        if (node_current.score < min_son_score) {
          min_son_score = node_current.score;
        }

        var is_half = false;
        if (level == 0 && this.is_szm_char(char_for_node)) {
          node_current.spelling_idx =
            StringUtils.charDiff(char_for_node, 'A') + 1;
          if (char_for_node > 'C') {
            node_current.spelling_idx++;
          }
          if (char_for_node > 'S') {
            node_current.spelling_idx++;
          }

          this.h2f_num_[node_current.spelling_idx] = i - item_start_next;
          is_half = true;
        } else if (level == 1 && char_for_node == 'h') {
          var ch_level0 = spelling_last_start.str[0];
          var part_id = 0;
          if (ch_level0 == 'C') {
            part_id = StringUtils.charDiff('C', 'A') + 1 + 1;
          }
          else if (ch_level0 == 'S') {
            part_id = StringUtils.charDiff('S', 'A') + 1 + 2;
          }
          else if (ch_level0 == 'Z') {
            part_id = StringUtils.charDiff('Z', 'A') + 1 + 3;
          }
          if (0 != part_id) {
            node_current.spelling_idx = part_id;
            this.h2f_num_[node_current.spelling_idx] = i - item_start_next;
            is_half = true;
          }
        }

        if (is_half) {
          if (this.h2f_num_[node_current.spelling_idx] > 0) {
            this.h2f_start_[node_current.spelling_idx] =
              item_start_next + SpellingTrie.kFullSplIdStart;
          } else {
            this.h2f_start_[node_current.spelling_idx] = 0;
          }
        }

        // for next sibling
        spelling_last_start = spelling_current;
        char_for_node = char_current;
        item_start_next = i;
        spelling_endable = true;
        if (spelling_current.str.length > level + 1) {
          spelling_endable = false;
        }
        son_pos++;
      }
    }

    // the last one
    var node_current = sons[son_pos];
    node_current.char_this_node = char_for_node;
    if (!char_for_node) {
      assertEq(true, false, 'char_this_node' + char_for_node);
    }
    // For quick search in the first level
    if (0 == level) {
      this.level1_sons_[StringUtils.charDiff(char_for_node, 'A')] =
        node_current;
    }

    if (spelling_endable) {
      node_current.spelling_idx =
        SpellingTrie.kFullSplIdStart + item_start_next;
    }

    if (spelling_last_start.str.length > level + 1 ||
        item_end - item_start_next > 1) {
      var real_start = item_start_next;
      if (spelling_last_start.str.length == level + 1) {
        real_start++;
      }

      node_current.sons =
          this.construct_spellings_subset(real_start, item_end, level + 1,
                                     node_current);

      if (real_start == item_start_next + 1) {
        var score_this = spelling_last_start.score;
        if (score_this < node_current.score) {
          node_current.score = score_this;
        }
      }
    } else {
      node_current.sons = [];
      node_current.score = spelling_last_start.score;
    }

    if (node_current.score < min_son_score) {
      min_son_score = node_current.score;
    }

    var is_half = false;
    if (level == 0 && this.szm_is_enabled(char_for_node)) {
      node_current.spelling_idx = StringUtils.charDiff(char_for_node, 'A') + 1;
      if (char_for_node > 'C') {
        node_current.spelling_idx++;
      }
      if (char_for_node > 'S') {
        node_current.spelling_idx++;
      }

      this.h2f_num_[node_current.spelling_idx] = item_end - item_start_next;
      is_half = true;
    } else if (level == 1 && char_for_node == 'h') {
      var ch_level0 = spelling_last_start.str[0];
      var part_id = 0;
      if (ch_level0 == 'C') {
        part_id = StringUtils.charDiff('C', 'A') + 1 + 1;
      }
      else if (ch_level0 == 'S') {
        part_id = StringUtils.charDiff('S', 'A') + 1 + 2;
      }
      else if (ch_level0 == 'Z') {
        part_id = StringUtils.charDiff('Z', 'A') + 1 + 3;
      }
      if (0 != part_id) {
        node_current.spelling_idx = part_id;
        this.h2f_num_[node_current.spelling_idx] = item_end - item_start_next;
        is_half = true;
      }
    }
    if (is_half) {
      if (this.h2f_num_[node_current.spelling_idx] > 0) {
        this.h2f_start_[node_current.spelling_idx] =
          item_start_next + SpellingTrie.kFullSplIdStart;
      } else {
        this.h2f_start_[node_current.spelling_idx] = 0;
      }
    }

    parent.num_of_son = num_of_son;
    parent.score = min_son_score;
    return sons;
  },

  build_f2h: function spellingTrie_build_f2h() {
    this.f2h_ = [];

    for (var hid = 0; hid < SpellingTrie.kFullSplIdStart; hid++) {
      for (var fid = this.h2f_start_[hid];
           fid < this.h2f_start_[hid] + this.h2f_num_[hid]; fid++) {
        this.f2h_[fid - SpellingTrie.kFullSplIdStart] = hid;
      }
    }

    return true;
  },

  // The caller should guarantee ch >= 'A' && ch <= 'Z'
  is_shengmu_char: function spellingTrie_is_shengmu_char(ch) {
    return SpellingTrie.char_flags_[StringUtils.charDiff(ch, 'A')] &
      SpellingTrie.kHalfIdShengmuMask;
  },

  // The caller should guarantee ch >= 'A' && ch <= 'Z'
  is_yunmu_char: function spellingTrie_is_yunmu_char(ch) {
    return SpellingTrie.char_flags_[StringUtils.charDiff(ch, 'A')] &
      SpellingTrie.kHalfIdYunmuMask;
  },

  // Given a spelling string, return its Yunmu string.
  // The caller guaratees spl_str is valid.
  get_ym_str: function spellingTrie_get_ym_str(spl_str) {
    var start_ZCS = false;
    var pos = 0;
    if (this.is_shengmu_char(spl_str[0])) {
      pos++;
      var prefix = spl_str.substring(0, 2);
      if (prefix == 'Zh' || prefix == 'Ch' || prefix == 'Sh') {
        pos++;
      }
    }
    return spl_str.substring(pos);
  },

  // Build the Yunmu list, and the mapping relation between the full ids and the
  // Yunmu ids. This functin is called after the spelling trie is built.
  build_ym_info: function spellingTrie_build_ym_info() {
    var sucess;
    var spl_table = new SpellingTable();

    sucess = spl_table.init_table();

    for (var pos = 0; pos < this.spelling_num_; pos++) {
      var spl_str = this.spelling_buf_[pos].str;
      spl_str = this.get_ym_str(spl_str);
      if (spl_str) {
        sucess = spl_table.put_spelling(spl_str, 0);
      }
    }

    this.ym_buf_ = spl_table.arrange();
    this.ym_num_ = this.ym_buf_.length;

    // Generate the maping from the spelling ids to the Yunmu ids.
    this.spl_ym_ids_ = [];

    for (var id = 1; id < this.spelling_num_ + SpellingTrie.kFullSplIdStart;
         id++) {
      var str = this.get_spelling_str(id);

      str = this.get_ym_str(str);
      if (str) {
        var ym_id = this.get_ym_id(str);
        this.spl_ym_ids_[id] = ym_id;
      } else {
        this.spl_ym_ids_[id] = 0;
      }
    }
    return true;
  }
};

/**
 * This class is used to store the spelling strings
 */
var SpellingTable = function spellingTable_constructor() {
};

SpellingTable.kNotSupportList = ['HM', 'HNG', 'NG'];

SpellingTable.RawSpelling = function rawSpelling_constructor(str, freq) {
  this.str = str;
  this.freq = freq;
  this.score = 0;
};

SpellingTable.RawSpelling.prototype = {
  str: '',
  freq: 0,
  score: 0
};

SpellingTable.prototype = {
  /* ==== Public ==== */

  init_table: function spellingTable_init_table() {
    this.raw_spellings_ = {};
    this.frozen_ = false;
    this.total_freq_ = 0;
    this.score_amplifier_ = 0;
    this.average_score_ = 0;
  },

  /**
   * Put a spelling string to the table.
   * It always returns false if called after arrange() withtout a new
   * init_table() operation.
   * freq is the spelling's occuring count.
   * If the spelling has been in the table, occuring count will accumulated.
   */
  put_spelling: function spellingTable_put_spelling(spelling_str, freq) {
    if (this.frozen_ || !spelling_str)
      return false;

    var notSupportNum = SpellingTable.kNotSupportList.length;
    for (var pos = 0; pos < notSupportNum; pos++) {
      if (spelling_str == SpellingTable.kNotSupportList[pos]) {
        return false;
      }
    }

    this.total_freq_ += freq;

    if (!(spelling_str in this.raw_spellings_)) {
      this.raw_spellings_[spelling_str] = new SpellingTable.RawSpelling(
          spelling_str, 0);
    }

    this.raw_spellings_[spelling_str].freq += freq;

    return true;
  },

  /**
   * Test whether a spelling string is in the table.
   * It always returns false, when being called after arrange() withtout a new
   * init_table() operation.
   */
  contain: function spellingTable_contain(spelling_str) {
    if (this.frozen_ || !spelling_str)
      return false;

    return (spelling_str in this.raw_spellings_);
  },

  /**
   * Sort the spelling strings in an array.
   * @return {Array<SpellingTable.RawSpelling>} Return the sorted RawSpelling
   *    array. An item with a lower score has a higher probability. Do not
   *    call put_spelling() and contains() after arrange().
   */
  arrange: function spellingTable_arrange() {
    var result = [];
    if (null == this.raw_spellings_) {
      return result;
    }

    var min_score = 1;

    for (var pos in this.raw_spellings_) {
      this.raw_spellings_[pos].freq /= this.total_freq_;
      if (this.raw_spellings_[pos].freq < min_score) {
        min_score = this.raw_spellings_[pos].freq;
      }
    }

    min_score = Math.log(min_score);

    // The absolute value of min_score is bigger than any other scores because
    // the scores are negative after log function.
    this.score_amplifier_ = 1.0 * 255 / min_score;

    var totalScore = 0;
    var spellingNum = 0;
    for (var pos in this.raw_spellings_) {
      var score = Math.floor(Math.log(this.raw_spellings_[pos].freq) *
                             this.score_amplifier_);
      this.raw_spellings_[pos].score = score;
      totalScore += score;
      spellingNum++;
    }
    this.average_score_ = Math.round(totalScore / spellingNum);

    for (var str in this.raw_spellings_) {
      result.push(this.raw_spellings_[str]);
    }

    result.sort(function compare_raw_spl_eb(p1, p2) {
      // "" is the biggest, so that all empty strings will be moved to the end
      if (!p1.str) {
        return 1;
      }
      if (!p2.str) {
        return -1;
      }
      return SearchUtility.compare(p1.str, p2.str);
    });

    this.frozen_ = true;
    return result;
  },

  get_score_amplifier: function spellingTable_get_score_amplifier() {
    return this.score_amplifier_;
  },

  get_average_score: function spellingTable_get_average_score() {
    return this.average_score_;
  },

  /* ==== Private ==== */

  /**
   * The map containing all the RawSpelling whose key is the spelling string.
   * @type Object<string, SpellingTable.RawSpelling>
   */
  raw_spellings_: null,

  total_freq_: 0,

  score_amplifier_: 0,

  average_score_: 0,

  /**
   * If frozen is true, put_spelling() and contain() are not allowed to call.
   */
  frozen_: false
};

var jspinyin = new IMEngine();

// Expose jspinyin as an AMD module
if (typeof define === 'function' && define.amd)
  define('jspinyin', [], function() { return jspinyin; });

// Expose the engine to the Gaia keyboard
if (typeof InputMethods !== 'undefined') {
  InputMethods.jspinyin = jspinyin;
}

// For unit tests
if (typeof Test !== 'undefined') {
  Test.SpellingTable = SpellingTable;
  Test.SpellingTrie = SpellingTrie;
  Test.FileSystemService = FileSystemService;
  Test.DictTrie = DictTrie;
  Test.DictBuilder = DictBuilder;
  Test.MyStdlib = MyStdlib;
  Test.SearchUtility = SearchUtility;
  Test.UserDict = UserDict;
  Test.MatrixSearch = MatrixSearch;
}

if (typeof Build !== 'undefined') {
  Build.FileSystemService = FileSystemService;
  Build.DictTrie = DictTrie;
}

})();
