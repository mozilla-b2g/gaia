/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

(function() {
var debugging = false;
var debug = function(str) {
  if (!debugging)
    return;

  if (window.dump)
    window.dump('jspinyin: ' + str + '\n');
  if (console && console.log) {
    console.log('jspinyin: ' + str);
    if (arguments.length > 1)
      console.log.apply(this, arguments);
  }
};

/* for non-Mozilla browsers */
if (!KeyEvent) {
  var KeyEvent = {
    DOM_VK_BACK_SPACE: 0x8,
    DOM_VK_RETURN: 0xd
  };
}

/**
 * Max terms to match for incomplete or abbreviated syllables
 */
var MAX_TERMS_FOR_INCOMPLETE_SYLLABLES = 10;

var SyllableUtils = {
  /**
   * Converts a syllables array to a string that each syllable will be sperated
   * by '. For example, ['bei', 'jing'] will be converted to "bei'jing".
   */
  arrayToString: function syllableUtils_arrayToString(array) {
    return array.join("'");
  },

  /**
   * Converts a syllables string to an array.
   * For example, "bei'jing" will be converted to [bei'jing].
   */
  arrayFromString: function syllableUtils_arrayFromString(str) {
    return str.split("'");
  },

  /**
   * Converts a syllables string to its abbreviated form.
   * For example, "bei'jing" will be converted to "b'j"
   */
  stringToAbbreviated: function syllableUtils_stringToAbbreviated(str) {
    return str.replace(/([^'])[^']*/g, '$1');
  }
};

var Term = function term_constructor(phrase, freq) {
  this.phrase = phrase;
  this.freq = freq;
};

Term.prototype = {
  /*The actual string of the term, such as '北京'.*/
  phrase: '',
  /* The frequency of the term*/
  freq: 0
};

/**
 * Terms with same pronunciation.(同音词)
 */
var Homonyms = function homonyms_constructor(syllablesString, terms) {
  this.syllablesString = syllablesString;
  this.abbreviatedSyllablesString =
    SyllableUtils.stringToAbbreviated(syllablesString);

  // Clone a new array
  this.terms = terms.concat();
};

Homonyms.prototype = {
  // Full pinyin syllables(全拼), such as "bei'jing"
  syllablesString: '',
  // Abbreviated pinyin syllabels(简拼), such as "b'j" for "bei'jing"
  abbreviatedSyllablesString: '',
  // Terms array, such as [new Term('北京', 0.010), new Term('背景', 0.005)]
  terms: null
};

/**
 * An index class to speed up the search operation for ojbect array.
 * @param {Array} targetArray The array to be indexed.
 * @param {String} keyPath The key path for the index to use.
 */
var Index = function index_constructor(targetArray, keyPath) {
  this._keyMap = {};
  this._sortedKeys = [];
  for (var i = 0; i < targetArray.length; i++) {
    var key = targetArray[i][keyPath];
    if (!(key in this._keyMap)) {
      this._keyMap[key] = [];
      this._sortedKeys.push(key);
    }
    this._keyMap[key].push(i);
  }
  this._sortedKeys.sort();
};

Index.prototype = {
  // Map the key to the index of the storage array
  _keyMap: null,

  // Keys array in ascending order.
  _sortedKeys: null,

  /**
   * Get array indices by given key.
   * @return {Array} An array of index.
   */
  get: function index_get(key) {
    var indices = [];
    if (key in this._keyMap) {
      indices = indices.concat(this._keyMap[key]);
    }
    return indices;
  },

  /**
   * Get array indices by given key range.
   * @param {String} lower The lower bound of the key range. If null, the range
   * has no lower bound.
   * @param {String} upper The upper bound of the key range. If null, the range
   * has no upper bound.
   * @param {Boolean} lowerOpen If false, the range includes the lower bound
   * value. If the range has no lower bound, it will be ignored.
   * @param {Boolean} upperOpen If false, the range includes the upper bound
   * value. If the range has no upper bound, it will be ignored.
   * @return {Array} An array of index.
   */
  getRange: function index_getRange(lower, upper, lowerOpen, upperOpen) {
    var indices = [];
    if (this._sortedKeys.length == 0) {
      return indices;
    }

    var pos = 0;

    // lower bound position
    var lowerPos = 0;
    // uppder bound position
    var upperPos = this._sortedKeys.length - 1;

    if (lower) {
      pos = this._binarySearch(lower, 0, upperPos);
      if (pos == Infinity) {
        return indices;
      }
      if (pos != -Infinity) {
        lowerPos = Math.ceil(pos);
      }
      if (lowerOpen && this._sortedKeys[lowerPos] == lower) {
        lowerPos++;
      }
    }

    if (upper) {
      pos = this._binarySearch(upper, lowerPos, upperPos);
      if (pos == -Infinity) {
        return indices;
      }
      if (pos != Infinity) {
        upperPos = Math.floor(pos);
      }
      if (upperOpen && this._sortedKeys[upperPos] == upper) {
        upperPos--;
      }
    }

    for (var i = lowerPos; i <= upperPos; i++) {
      var key = this._sortedKeys[i];
      indices = indices.concat(this._keyMap[key]);
    }
    return indices;
  },

  /**
   * Search the key position.
   * @param {String} key The key to search.
   * @param {Number} left The begin position of the array. It should be less
   * than the right parameter.
   * @param {Number} right The end position of the array.It should be greater
   * than the left parameter.
   * @return {Number} If success, returns the index of the key.
   * If the key is between two adjacent keys, returns the average index of the
   * two keys. If the key is out of bounds, returns Infinity or -Infinity.
   */
  _binarySearch: function index_binarySearch(key, left, right) {
    if (key < this._sortedKeys[left]) {
      return -Infinity;
    }
    if (key > this._sortedKeys[right]) {
      return Infinity;
    }

    while (right > left) {
      var mid = Math.floor((left + right) / 2);
      var midKey = this._sortedKeys[mid];
      if (midKey < key) {
        left = mid + 1;
      } else if (midKey > key) {
        right = mid - 1;
      } else {
        return mid;
      }
    }

    // left == right == mid
    var leftKey = this._sortedKeys[left];
    if (leftKey == key) {
      return left;
    } else if (leftKey < key) {
      return left + 0.5;
    } else {
      return left - 0.5;
    }
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

/** Maximum limit of PinYin syllable length */
var SYLLALBLE_MAX_LENGTH = 6;

var SyllableType = {
  /**
   * Complete syllable, such as "yue", "bei".
   */
  COMPLETE: 0,
  /**
   * Abbreviated syllable that starts with a single consonant(声母),
   * such as "b", "j".
   */
  ABBREVIATED: 1,
  /**
   * An incomplete syllables is part of complete syllable. It is neither an
   * abbreviated syllable, nor a complete syllable, such as "be".
   */
  INCOMPLETE: 2,
  /**
   * Invalid syllale.
   */
  INVALID: 3
};

var Syllable = function syllable_constructor(str, type) {
  this.str = str;
  this.type = type;
};

Syllable.prototype = {
  /**
   * The syllable string, such as 'ai'
   */
  str: '',

  /**
   * The syllable type
   */
  type: SyllableType.COMPLETE
};

/**
 * Divides a string into Pinyin syllables
 */
var PinyinParser = function pinyinParser_constructor() {
  // Consonants(声母) list
  var consonants =
    'b p m f d t n l g k h j q x zh ch sh r z c s y w'.split(' ');

  this._consonantMap = {};
  for (var i in consonants) {
    var e = consonants[i];
    this._consonantMap[e] = e;
  }

  // Valid pinyin syllables list
  var syllables = [
    'a', 'o', 'e',

    'ai', 'ei', 'ao', 'ou', 'er', 'an', 'en', 'ang', 'eng',

    'ba', 'bai', 'ban', 'bang', 'bao', 'bei', 'ben', 'beng', 'bi', 'bian',
    'biao', 'bie', 'bin', 'bing', 'bo', 'bu',

    'pa', 'pai', 'pan', 'pang', 'pao', 'pei', 'pen', 'peng', 'pi', 'pian',
    'piao', 'pie', 'pin', 'ping', 'po', 'pou', 'pu',

    'ma', 'mai', 'man', 'mang', 'mao', 'me', 'mei', 'men', 'meng', 'mi', 'mian',
    'miao', 'mie', 'min', 'ming', 'miu', 'mo', 'mou', 'mu',

    'fa', 'fan', 'fang', 'fei', 'fen', 'feng', 'fo', 'fou', 'fu',

    'da', 'dai', 'dan', 'dang', 'dao', 'de', 'dei', 'deng', 'di', 'dian',
    'diao', 'die', 'ding', 'diu', 'dong', 'dou', 'du', 'duan', 'dui', 'dun',
    'duo',

    'ta', 'tai', 'tan', 'tang', 'tao', 'te', 'teng', 'ti', 'tian', 'tiao',
    'tie', 'ting', 'tong', 'tou', 'tu', 'tuan', 'tui', 'tun', 'tuo',

    'na', 'nai', 'nan', 'nang', 'nao', 'ne', 'nei', 'nen', 'neng', 'ni', 'nian',
    'niang', 'niao', 'nie', 'nin', 'ning', 'niu', 'nong', 'nou', 'nu', 'nv',
    'nuan', 'nve', 'nuo',

    'la', 'lai', 'lan', 'lang', 'lao', 'le', 'lei', 'leng', 'li', 'lia',
    'lian', 'liang', 'liao', 'lie', 'lin', 'ling', 'liu', 'long', 'lou',
    'lu', 'lv', 'luan', 'lve', 'lun', 'luo',

    'ga', 'gai', 'gan', 'gang', 'gao', 'ge', 'gei', 'gen', 'geng', 'gong',
    'gou', 'gu', 'gua', 'guai', 'guan', 'guang', 'gui', 'gun', 'guo',

    'ka', 'kai', 'kan', 'kang', 'kao', 'ke', 'ken', 'keng', 'kong', 'kou',
    'ku', 'kua', 'kuai', 'kuan', 'kuang', 'kui', 'kun', 'kuo',

    'ha', 'hai', 'han', 'hang', 'hao', 'he', 'hei', 'hen', 'heng', 'hong',
    'hou', 'hu', 'hua', 'huai', 'huan', 'huang', 'hui', 'hun', 'huo',

    'ji', 'jia', 'jian', 'jiang', 'jiao', 'jie', 'jin', 'jing', 'jiong',
    'jiu', 'ju', 'juan', 'jue', 'jun',

    'qi', 'qia', 'qian', 'qiang', 'qiao', 'qie', 'qin', 'qing', 'qiong', 'qiu',
    'qu', 'quan', 'que', 'qun',

    'xi', 'xia', 'xian', 'xiang', 'xiao', 'xie', 'xin', 'xing', 'xiong', 'xiu',
    'xu', 'xuan', 'xue', 'xun',

    'zhi', 'zha', 'zhai', 'zhan', 'zhang', 'zhao', 'zhe', 'zhei', 'zhen',
    'zheng',
    'zhong', 'zhou', 'zhu', 'zhua', 'zhuai', 'zhuan', 'zhuang', 'zhui', 'zhun',
    'zhuo',

    'chi', 'cha', 'chai', 'chan', 'chang', 'chao', 'che', 'chen', 'cheng',
    'chong',
    'chou', 'chu', 'chua', 'chuai', 'chuan', 'chuang', 'chui', 'chun', 'chuo',

    'shi', 'sha', 'shai', 'shan', 'shang', 'shao', 'she', 'shei', 'shen',
    'sheng',
    'shou', 'shu', 'shua', 'shuai', 'shuan', 'shuang', 'shui', 'shun', 'shuo',

    'ri', 'ran', 'rang', 'rao', 're', 'ren', 'reng', 'rong', 'rou', 'ru',
    'ruan', 'rui', 'run', 'ruo',

    'zi', 'za', 'zai', 'zan', 'zang', 'zao', 'ze', 'zei', 'zen', 'zeng',
    'zong', 'zou', 'zu', 'zuan', 'zui', 'zun', 'zuo',

    'ci', 'ca', 'cai', 'can', 'cang', 'cao', 'ce', 'cen', 'ceng', 'cong',
    'cou', 'cu', 'cuan', 'cui', 'cun', 'cuo',

    'si', 'sa', 'sai', 'san', 'sang', 'sao', 'se', 'sen', 'seng', 'song',
    'sou', 'su', 'suan', 'sui', 'sun', 'suo',

    'ya', 'yan', 'yang', 'yao', 'ye', 'yi', 'yin', 'ying', 'yong', 'you',
    'yu', 'yuan', 'yue', 'yun',

    'wa', 'wai', 'wan', 'wang', 'wei', 'wen', 'weng', 'wo', 'wu'
    ];

  this._syllableArray = [];
  for (var i in syllables) {
    var e = syllables[i];
    this._syllableArray.push({syllable: e});
  }

  this._syllableIndex = new Index(this._syllableArray, 'syllable');
};

PinyinParser.prototype = {
  /**
   * Consonant(声母) lookup map that maps a lowercase consonant to itself.
   * _consonantMap
   */
  _consonantMap: null,

  /**
   * Syllable array, such as [{syllable: 'a'}, {syllable: 'ai'}]
   */
  _syllableArray: null,

  /**
   * syllableMap index to speed up search operation
   */
  _syllableIndex: null,

  /**
   * Divides a string into Pinyin syllables.
   *
   * There may exists more than one ways to divide the string. Each way of the
   * division is a segment.
   *
   * For example, "fangan" could be divided into "FangAn"(方案) or "FanGan"(反感)
   * ; "xian" could be divided into "Xian"(先) or "XiAn"(西安); "dier" could be
   * divided into "DiEr"(第二) or "DieR".
   *
   * @param {String} input The string to be divided. The string should not be
   * empty.
   * @return {Array} An array of segments.
   */
  parse: function pinyinParser_parse(input) {
    var results = [];

    // Trims the leading and trailing "'".
    input = input.replace(/^'+|'+$/g, '');

    if (input == '') {
      return results;
    }

    var end = input.length;
    for (; end > 0; end--) {
      var sub = input.substring(0, end);
      results = this._parseInternal(sub);
      if (results.length > 0) {
        break;
      }
    }

    if (end != input.length) {
      // The input contains invalid syllable.
      var invalidSyllable = input.substring(end);
      results = this._appendsSubSegments(results,
        [[new Syllable(invalidSyllable, SyllableType.INVALID)]]);
    }

    return results;
  },

  /**
   * Divides a string into valid syllables.
   *
   * There may exists more than one ways to divide the string. Each way of the
   * division is a segment.
   *
   * For example, "fangan" could be divided into "FangAn"(方案) or "FanGan"(反感)
   * ; "xian" could be divided into "Xian"(先) or "XiAn"(西安); "dier" could be
   * divided into "DiEr"(第二) or "DieR".
   *
   * @param {String} input The string to be divided. The string should not be
   * empty.
   * @return {Array} An array of segments.
   * If the input string contains any invalid syllables, returns empty array.
   */
  _parseInternal: function pinyinParser_parseInternal(input) {
    var results = [];

    // Trims the leading and trailing "'".
    input = input.replace(/^'+|'+$/g, '');

    if (input == '') {
      return results;
    }

    var end = Math.min(input.length, SYLLALBLE_MAX_LENGTH);
    for (; end > 0; end--) {
      var key = input.substring(0, end);
      var type = this._getSyllableType(key);
      if (type != SyllableType.INVALID) {
        var segments = [];
        var subSegments = [];
        if (end < input.length) {
          subSegments = this._parseInternal(input.substring(end));
          if (subSegments.length == 0) {
            continue;
          }
        }
        segments.push([new Syllable(key, type)]);
        segments = this._appendsSubSegments(segments, subSegments);
        results = results.concat(segments);
      }
    }

    // Sort the segments array. The segment with fewer incomplete syllables and
    // shorter length comes first.
    var self = this;
    results.sort(function sortSegements(a, b) {
      var ai = self._getIncompleteness(a);
      var bi = self._getIncompleteness(b);
      if (ai != bi) {
        return ai - bi;
      } else {
        return a.length - b.length;
      }
    });
    return results;
  },

  /**
   * Check if the input string is a syllable
   */
  _getSyllableType: function pinyinParser_getSyllableType(str) {
    if (str in this._consonantMap) {
      return SyllableType.ABBREVIATED;
    }

    var indices = this._syllableIndex.get(str);
    if (indices.length > 0) {
      return SyllableType.COMPLETE;
    }

    var upperBound = str.substr(0, str.length - 1) +
      String.fromCharCode(str.substr(str.length - 1).charCodeAt(0) + 1);
    indices = this._syllableIndex.getRange(str, upperBound, true, true);
    if (indices.length > 0) {
      return SyllableType.INCOMPLETE;
    }

    return SyllableType.INVALID;
  },

  /**
   * Get cartesian product of two segments arrays.
   * Cartesian product A X B:
   * A X B = {(a, b) | a is member of A and b is member of B}.
   */
  _appendsSubSegments: function pinyinParser_appendsSubSegments(
      segments, subSegments) {
    if (segments.length == 0) {
      return subSegments;
    }
    if (subSegments.length == 0) {
      return segments;
    }

    var result = [];
    for (var i = 0; i < segments.length; i++) {
      var segment = segments[i];
      for (var j = 0; j < subSegments.length; j++) {
        result.push(segment.concat(subSegments[j]));
      }
    }
    return result;
  },

  /**
   * Get the incompleteness of syllables.
   *
   * Syllables containing incomplete and abbreviated syllable is of higher
   * incompleteness value than those not.
   *
   * @param {Array} segement The segement array containing the syllables to be
   * evaluated.
   * @return {Nunmber} The number of incompleteness. A higher value means more
   * incomplete or abbreviated syllables.
   */
  _getIncompleteness: function pinyinParser_getIncompleteness(segment) {
    var value = 0;
    for (var i in segment) {
      var type = segment[i].type;
      if (type == SyllableType.ABBREVIATED) {
        value += 2;
      } else if (type == SyllableType.INCOMPLETE) {
        value += 1;
      } else if (type == SyllableType.INVALID) {
        value += 3 * segment[i].str.length;
      }
    }
    return value;
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
    this._glue.sendString(text);
  },

  /**
   * Notifies when the IM is shown
   */
  show: function engineBase_show(inputType) {
  }
};

var IMEngine = function engine_constructor(splitter) {
  IMEngineBase.call(this);

  this._splitter = splitter;
  this._db = {
    simplified: null,
    traditional: null
  };
  this._selectedSyllables = [];
  this._keypressQueue = [];
};

IMEngine.prototype = {
  __proto__: new IMEngineBase(),

  _splitter: null,

  // Enable IndexedDB
  _enableIndexedDB: true,

  // Tell the algorithm what's the longest term
  // it should attempt to match
  _kDBTermMaxLength: 8,

  // Buffer limit will force output the longest matching terms
  // if the length of the syllables buffer is reached.
  _kBufferLenLimit: 30,

  // Auto-suggest generates candidates that follows a selection
  // taibei -> 台北, then suggest 市, 縣, 市長, 市立 ...
  _autoSuggestCandidates: true,

  // Whether to input traditional Chinese
  _inputTraditionalChinese: false,

  // Input method database
  _db: null,

  // The last selected text and syllables used to generate suggestions.
  _selectedText: '',
  _selectedSyllables: null,

  _pendingSymbols: '',
  _firstCandidate: '',
  _keypressQueue: null,
  _isWorking: false,

  // Current keyboard
  _keyboard: 'zh-Hans-Pinyin',

  _getCurrentDatabaseName: function engine_getCurrentDatabaseName() {
    return this._inputTraditionalChinese ? 'traditional' : 'simplified';
  },

  _initDB: function engine_initDB(name, readyCallback) {
    var dbSettings = {
      enableIndexedDB: this._enableIndexedDB
    };

    if (readyCallback) {
      dbSettings.ready = readyCallback;
    }

    var jsonUrl = this._glue.path +
      (name == 'traditional' ? '/db-tr.json' : '/db.json');
    this._db[name] = new IMEngineDatabase(name, jsonUrl);
    this._db[name].init(dbSettings);
  },

  _sendPendingSymbols: function engine_sendPendingSymbols() {
    debug('SendPendingSymbol: ' + this._pendingSymbols);
    this._glue.sendPendingSymbols(this._pendingSymbols);
  },

  _sendCandidates: function engine_sendCandidates(candidates) {
    this._firstCandidate = (candidates[0]) ? candidates[0][0] : '';
    this._glue.sendCandidates(candidates);
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

    var name = this._getCurrentDatabaseName();

    if (!this._db[name]) {
      debug('DB not initialized, defer processing.');
      this._initDB(name, this._next.bind(this));
      return;
    }

    if (!this._keypressQueue.length) {
      debug('keyQueue emptied.');
      this._isWorking = false;
      return;
    }

    var code = this._keypressQueue.shift();

    if (code == 0) {
      // This is a select function operation.
      this._sendPendingSymbols();
      this._updateCandidateList(this._next.bind(this));
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
          this._selectedText = '';
          this._selectedSyllables = [];

          this._updateCandidateList(this._next.bind(this));
          return;
        }
        // pass the key to IMEManager for default action
        debug('Default action.');
        this._glue.sendKey(code);
        this._next();
        return;
      }

      this._pendingSymbols = this._pendingSymbols.substring(0,
        this._pendingSymbols.length - 1);

      this._sendPendingSymbols();
      this._updateCandidateList(this._next.bind(this));
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

    this._sendPendingSymbols();
    this._updateCandidateList(this._next.bind(this));
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
    var self = this;
    var name = this._getCurrentDatabaseName();
    if (!this._pendingSymbols) {
      if (this._autoSuggestCandidates &&
          this._selectedSyllables.length) {
        debug('Buffer is empty; ' +
          'make suggestions based on select term.');
        var candidates = [];
        var text = this._selectedText;
        var selectedSyllables = this._selectedSyllables;
        this._db[name].getSuggestions(selectedSyllables, text,
          function(suggestions) {
            suggestions.forEach(
              function suggestions_forEach(suggestion) {
                candidates.push(
                  [suggestion.phrase.substr(text.length),
                   SyllableUtils.arrayToString(selectedSyllables)]);
              }
            );
            self._sendCandidates(candidates);
            callback();
          }
        );
        return;
      }
      debug('Buffer is empty; send empty candidate list.');
      this._sendCandidates([]);
      callback();
      return;
    }

    this._selectedText = '';
    this._selectedSyllables = [];

    var candidates = [];
    var segments = this._splitter.parse(this._pendingSymbols);
    var syllablesForQuery = [];
    if (segments.length > 0) {
      var segment = segments[0];
      for (var i = 0; i < segment.length; i++) {
        syllablesForQuery.push(segment[i].str);
      }
    }

    var syllablesStr = SyllableUtils.arrayToString(syllablesForQuery);

    if (syllablesForQuery.length == 0) {
      candidates.push([this._pendingSymbols, syllablesStr]);
      this._sendCandidates(candidates);
      callback();
      return;
    }

    debug('Get term candidates for the entire buffer.');
    this._db[name].getTerms(syllablesForQuery, function lookupCallback(terms) {
      terms.forEach(function readTerm(term) {
        candidates.push([term.phrase, syllablesStr]);
      });

      if (syllablesForQuery.length === 1) {
        debug('Only one syllable; skip other lookups.');

        if (!candidates.length) {
          // candidates unavailable; output symbols
          candidates.push([self._pendingSymbols, syllablesStr]);
        }

        self._sendCandidates(candidates);
        callback();
        return;
      }

      debug('Lookup for sentences that make up from the entire buffer');
      var syllables = syllablesForQuery;
      self._db[name].getSentence(syllables,
        function getSentenceCallback(sentence) {
        // look for candidate that is already in the list
        var exists = candidates.some(function sentenceExists(candidate) {
          return (candidate[0] === sentence);
        });

        if (!exists) {
          candidates.push([sentence, syllablesStr]);
        }

        // The remaining candidates doesn't match the entire buffer
        // these candidates helps user find the exact character/term
        // s/he wants
        // The remaining unmatched syllables will go through lookup
        // over and over until the buffer is emptied.

        var i = Math.min(self._kDBTermMaxLength, syllablesForQuery.length - 1);

        var findTerms = function lookupFindTerms() {
          debug('Lookup for terms that matches first ' + i + ' syllables.');

          var syllables = syllablesForQuery.slice(0, i);
          var syllablesStr = SyllableUtils.arrayToString(syllables);
          self._db[name].getTerms(syllables, function lookupCallback(terms) {
            terms.forEach(function readTerm(term) {
              candidates.push([term.phrase, syllablesStr]);
            });

            if (i === 1 && !terms.length) {
              debug('The first syllable does not make up a word,' +
                ' output the symbol.');
              candidates.push(
                [syllables.join(''), syllablesStr]);
            }

            if (!--i) {
              debug('Done Looking.');
              self._sendCandidates(candidates);
              callback();
              return;
            }

            findTerms();
            return;
          });
        };

        findTerms();
      });
    });
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
    var keyboard = this._inputTraditionalChinese ?
      'zh-Hans-Pinyin-tr' : 'zh-Hans-Pinyin';
    this._alterKeyboard(keyboard);
  },

  /**
   * Override
   */
  uninit: function engine_uninit() {
    IMEngineBase.prototype.uninit.call(this);
    debug('Uninit.');
    this._splitter = null;
    for (var name in ['simplified', 'traditional']) {
      if (this._db[name]) {
        this._db[name].uninit();
        this._db[name] = null;
      }
    }
    this.empty();
  },

  /**
   *Override
   */
  click: function engine_click(keyCode) {
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

  /**
   * Override
   */
  select: function engine_select(text, data) {
    IMEngineBase.prototype.select.call(this, text, data);

    var syllablesToRemove = SyllableUtils.arrayFromString(data);
    if (this._pendingSymbols != '') {
      for (var i = 0; i < syllablesToRemove.length; i++) {
        var syllable = syllablesToRemove[i];
        // Trims the leading "'".
        this._pendingSymbols = this._pendingSymbols.replace(/^'+/g, '');
        this._pendingSymbols = this._pendingSymbols.substring(syllable.length);
      }
      this._optimizedSyllables = [];
    }

    this._selectedText = text;
    this._selectedSyllables = syllablesToRemove;
    this._keypressQueue.push(0);
    this._start();
  },

  /**
   * Override
   */
  empty: function engine_empty() {
    IMEngineBase.prototype.empty.call(this);
    debug('empty.');
    var name = this._getCurrentDatabaseName();
    this._pendingSymbols = '';
    this._selectedText = '';
    this._selectedSyllables = [];
    this._sendPendingSymbols();
    this._isWorking = false;
    if (!this._db[name])
      this._initDB(name);
  },

  /**
   * Override
   */
  show: function engine_show(inputType) {
    IMEngineBase.prototype.show.call(this, inputType);
    debug('Show. Input type: ' + inputType);
    var keyboard = this._inputTraditionalChinese ?
      'zh-Hans-Pinyin-tr' : 'zh-Hans-Pinyin';
    if (inputType == '' || inputType == 'text' || inputType == 'textarea') {
      keyboard = this._keyboard;
    }

    this._glue.alterKeyboard(keyboard);
  }
};

var DatabaseStorageBase = function storagebase_constructor() {
};

/**
 * DatabaseStorageBase status code enumeration.
 */
DatabaseStorageBase.StatusCode = {
  /* The storage isn't initilized.*/
  UNINITIALIZED: 0,
  /* The storage is busy.*/
  BUSY: 1,
  /* The storage has been successfully initilized and is ready to use.*/
  READY: 2,
  /* The storage is failed to initilized and cannot be used.*/
  ERROR: 3
};

DatabaseStorageBase.prototype = {
  _status: DatabaseStorageBase.StatusCode.UNINITIALIZED,

  /**
   * Get the status code of the storage.
   * @return {DatabaseStorageBase.StatusCode} The status code.
   */
  getStatus: function storagebase_getStatus() {
    return this._status;
  },

  /**
   * Whether the database is ready to use.
   */
  isReady: function storagebase_isReady() {
    return this._status == DatabaseStorageBase.StatusCode.READY;
  },

  /**
   * Initialization.
   * @param {Function} callback Javascript function object that is called when
   * the operation is finished. The definition of callback is
   * function callback(statusCode). The statusCode parameter is of type
   * DatabaseStorageBase.StatusCode that stores the status of the storage
   * after Initialization.
   */
  init: function storagebase_init(callback) {
  },

  /**
   * Destruction.
   * @param {Function} callback Javascript function object that is called when
   * the operation is finished.
   * The definition of callback is function callback().
   */
  uninit: function storagebase_uninit(callback) {
  },


  /**
   * Whether the storage is empty.
   * @return {Boolean} true if the storage is empty; otherwise false.
   */
  isEmpty: function storagebase_isEmpty() {
  },

  /**
   * Get all terms.
   * @param {Function} callback Javascript function object that is called when
   * the operation is finished. The definition of callback is
   * function callback(homonymsArray). The homonymsArray parameter is an array
   * of Homonyms objects.
   */
  getAllTerms: function storagebase_getAllTerms(callback) {
  },

  /**
   * Set all the terms of the storage.
   * @param {Array} homonymsArray The array of Homonyms objects containing all
   * the terms.
   * @param {Function} callback Javascript function object that is called when
   * the operation is finished. The definition of callback is
   * function callback().
   */
  setAllTerms: function storagebase_setAllTerms(homonymsArray, callback) {
  },

  /**
   * Get iterm with given syllables string.
   * @param {String} syllablesStr The syllables string of the matched terms.
   * @param {Function} callback Javascript function object that is called when
   * the operation is finished. The definition of callback is
   * function callback(homonymsArray). The homonymsArray parameter is an array
   * of Homonyms objects.
   */
  getTermsBySyllables: function storagebase_getTermsBySyllables(
    syllablesStr, callback) {
  },

  /**
   * Get iterms with given syllables string prefix.
   * @param {String} prefix The prefix of the syllables string .
   * @param {Function} callback Javascript function object that is called when
   * the operation is finished. The definition of callback is
   * function callback(homonymsArray). The homonymsArray parameter is an array
   * of Homonyms objects.
   */
  getTermsBySyllablesPrefix: function storagebase_getTermsBySyllablesPrefix(
    prefix, callback) {
  },

  /**
   * Get iterm with given incomplete or abbreviated syllables string. The given
   * syllables could be partially incomplete or abbreviated.
   * @param {String} incomplete The partially incomplete or abbreviated
   * syllables string of the matched terms.
   * @param {Function} callback Javascript function object that is called when
   * the operation is finished. The definition of callback is
   * function callback(homonymsArray). The homonymsArray parameter is an array
   * of Homonyms objects.
   */
  getTermsByIncompleteSyllables: function
    storagebase_getTermsByIncompleteSyllables(incomplete, callback) {
  },

  /**
   * Add a term to the storage.
   * @param {String} syllablesStr The syllables string of the term.
   * @param {Term} term The Term object of the term.
   * @param {Function} callback Javascript function object that is called when
   * the operation is finished. The definition of callback is
   * function callback().
   */
  addTerm: function storagebase_addTerm(syllablesStr, term, callback) {
  },

  /**
   * Remove a term from the storage.
   * @param {String} syllablesStr The syllables string of the term.
   * @param {Term} term The Term object of the term.
   * @param {Function} callback Javascript function object that is called when
   * the operation is finished. The definition of callback is
   * function callback().
   */
  removeTerm: function storagebase_removeTerm(syllablesStr, term, callback) {
  }
};

var JsonStorage = function jsonStorage_construtor(jsonUrl) {
  this._jsonUrl = jsonUrl;
  this._dataArray = [];
};

JsonStorage.prototype = {
  // Inherits DatabaseStorageBase
  __proto__: new DatabaseStorageBase(),

  _dataArray: null,

  // The JSON file url.
  _jsonUrl: null,

  _syllablesIndex: null,

  _abrreviatedIndex: null,

  /**
   * Override
   */
  init: function jsonStorage_init(callback) {
    var self = this;
    var doCallback = function init_doCallback() {
      if (callback) {
        callback(self._status);
      }
    }
    // Check if we could initilize.
    if (this._status != DatabaseStorageBase.StatusCode.UNINITIALIZED) {
      doCallback();
      return;
    }

    // Set the status to busy.
    this._status = DatabaseStorageBase.StatusCode.BUSY;

    var xhr = new XMLHttpRequest();
    xhr.open('GET', this._jsonUrl, true);
    try {
      xhr.responseType = 'json';
    } catch (e) { }
    xhr.overrideMimeType('application/json; charset=utf-8');
    xhr.onreadystatechange = function xhrReadystatechange(ev) {
      if (xhr.readyState !== 4) {
        self._status = DatabaseStorageBase.StatusCode.ERROR;
        return;
      }

      var response;
      if (xhr.responseType == 'json') {
        try {
          // clone everything under response because it's readonly.
          self._dataArray = xhr.response.slice();
        } catch (e) {
        }
      }

      if (typeof self._dataArray !== 'object') {
        self._status = DatabaseStorageBase.StatusCode.ERROR;
        doCallback();
        return;
      }

      xhr = null;
      setTimeout(performBuildIndices, 100);
    };

    var performBuildIndices = function init_performBuildIndices() {
      self._buildIndices();
      self._status = DatabaseStorageBase.StatusCode.READY;
      doCallback();
    };

    xhr.send(null);
  },

  /**
   * Override
   */
  uninit: function jsonStorage_uninit(callback) {
    var doCallback = function uninit_doCallback() {
      if (callback) {
        callback();
      }
    }

    // Check if we could uninitilize the storage
    if (this._status == DatabaseStorageBase.StatusCode.UNINITIALIZED) {
      doCallback();
      return;
    }

    // Perform destruction operation
    this._dataArray = [];

    this._status = DatabaseStorageBase.StatusCode.UNINITIALIZED;
    doCallback();
  },

  /**
   * Override
   */
  isEmpty: function jsonStorage_isEmpty() {
    return this._dataArray.length == 0;
  },

  /**
   * Override
   */
  getAllTerms: function jsonStorage_getAllTerms(callback) {
    var self = this;
    var homonymsArray = [];
    var doCallback = function getAllTerms_doCallback() {
      if (callback) {
        callback(homonymsArray);
      }
    }

    // Check if the storage is ready.
    if (!this.isReady()) {
      doCallback();
      return;
    }

    var perform = function getAllTerms_perform() {
      // Query all terms
      homonymsArray = homonymsArray.concat(self._dataArray);
      doCallback();
    }

    setTimeout(perform, 0);
  },

  /**
   * Override
   */
  getTermsBySyllables: function jsonStorage_getTermsBySyllables(syllablesStr,
    callback) {
    var self = this;
    var homonymsArray = [];
    var doCallback = function getTermsBySyllables_doCallback() {
      if (callback) {
        callback(homonymsArray);
      }
    }

    // Check if the storage is ready.
    if (!this.isReady()) {
      doCallback();
      return;
    }

    var perform = function getTermsBySyllables_perform() {
      var indices = self._syllablesIndex.get(syllablesStr);
      for (var i = 0; i < indices.length; i++) {
        var index = indices[i];
        homonymsArray.push(self._dataArray[index]);
      }
      doCallback();
    }

    setTimeout(perform, 0);
  },

  /**
   * Override
   */
  getTermsBySyllablesPrefix: function
    jsonStorage_getTermsBySyllablesPrefix(prefix, callback) {
    var self = this;
    var homonymsArray = [];
    function doCallback() {
      if (callback) {
        callback(homonymsArray);
      }
    }

    // Check if the storage is ready.
    if (!this.isReady()) {
      doCallback();
      return;
    }

    var perform = function() {
      var upperBound = prefix.substr(0, prefix.length - 1) +
        String.fromCharCode(prefix.substr(prefix.length - 1).charCodeAt(0) + 1);
      var indices =
        self._syllablesIndex.getRange(prefix, upperBound, false, false);
      for (var i = 0; i < indices.length; i++) {
        var index = indices[i];
        homonymsArray.push(self._dataArray[index]);
      }
      doCallback();
    }

    setTimeout(perform, 0);
  },

  /**
   * Override
   */
  getTermsByIncompleteSyllables: function
    jsonStorage_getTermsByIncompleteSyllables(incomplete, callback) {
    var self = this;
    var homonymsArray = [];
    var doCallback = function getTermsByIncompleteSyllables_doCallback() {
      if (callback) {
        callback(homonymsArray);
      }
    }

    // Check if the storage is ready.
    if (!this.isReady()) {
      doCallback();
      return;
    }

    var matchRegEx = new RegExp(
       '^' + incomplete.replace(/([^']+)/g, "$1[^']*"));
    var fullyAbbreviated = SyllableUtils.stringToAbbreviated(incomplete);

    var perform = function getTermsByIncompleteSyllables_perform() {
      var indices = self._abrreviatedIndex.get(fullyAbbreviated);
      for (var i = 0; i < indices.length; i++) {
        var index = indices[i];
        var homonyms = self._dataArray[index];
        var syllablesStr = homonyms.syllablesString;
        if (matchRegEx.exec(syllablesStr)) {
          homonymsArray.push(homonyms);
        }
      }
      doCallback();
    }

    setTimeout(perform, 0);
  },

  _buildIndices: function jsonStorage_buildIndices() {
    this._syllablesIndex = new Index(this._dataArray, 'syllablesString');
    this._abrreviatedIndex = new Index(this._dataArray,
      'abbreviatedSyllablesString');
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

var IndexedDBStorage = function indexedDBStorage_constructor(dbName) {
  this._dbName = dbName;
};

IndexedDBStorage.kDBVersion = 1.0;

IndexedDBStorage.prototype = {
  // Inherits DatabaseStorageBase
  __proto__: new DatabaseStorageBase(),

  // Database name
  _dbName: null,

  // IDBDatabase interface
  _IDBDatabase: null,

  _count: 0,

  /**
   * Override
   */
  init: function indexedDBStorage_init(callback) {
    var self = this;
    function doCallback() {
      if (callback) {
        callback(self._status);
      }
    }

    // Check if we could initilize.
    if (IndexedDB.isReady() &&
        this._status != DatabaseStorageBase.StatusCode.UNINITIALIZED) {
      doCallback();
      return;
    }

    // Set the status to busy.
    this._status = DatabaseStorageBase.StatusCode.BUSY;

    // Open the database
    var req = IndexedDB.indexedDB.open(this._dbName,
      IndexedDBStorage.kDBVersion);
    req.onerror = function dbopenError(ev) {
      debug('Encounter error while opening IndexedDB.');
      self._status = DatabaseStorageBase.StatusCode.ERROR;
      doCallback();
    };

    req.onupgradeneeded = function dbopenUpgradeneeded(ev) {
      debug('IndexedDB upgradeneeded.');
      self._IDBDatabase = ev.target.result;

      // delete the old ObjectStore if present
      if (self._IDBDatabase.objectStoreNames.length !== 0) {
        self._IDBDatabase.deleteObjectStore('homonyms');
      }

      // create ObjectStore
      var store = self._IDBDatabase.createObjectStore('homonyms',
        { keyPath: 'syllablesString' });
      store.createIndex(
        'abbreviatedSyllablesString', 'abbreviatedSyllablesString',
        { unique: false });

      // no callback() here
      // onupgradeneeded will follow by onsuccess event
    };

    req.onsuccess = function dbopenSuccess(ev) {
      debug('IndexedDB opened.');
      self._IDBDatabase = ev.target.result;

      self._status = DatabaseStorageBase.StatusCode.READY;
      self._count = 0;

      // Check the integrity of the storage
      self.getTermsBySyllables('_last_entry_',
        function getLastEntryCallback(homonymsArray) {
        if (homonymsArray.length == 0) {
          debug('IndexedDB is broken.');
          // Could not find the '_last_entry_' element. The storage is broken
          // and ignore all the data.
          doCallback();
          return;
        }

        var transaction =
          self._IDBDatabase.transaction(['homonyms'], 'readonly');
        // Get the count
        var reqCount = transaction.objectStore('homonyms').count();

        reqCount.onsuccess = function(ev) {
          debug('IndexedDB count: ' + ev.target.result);
          self._count = ev.target.result - 1;
          self._status = DatabaseStorageBase.StatusCode.READY;
          doCallback();
        };

        reqCount.onerror = function(ev) {
          self._status = DatabaseStorageBase.StatusCode.ERROR;
          doCallback();
        };
      });
    };
  },

  /**
   * Override
   */
  uninit: function indexedDBStorage_uninit(callback) {
    function doCallback() {
      if (callback) {
        callback();
      }
    }

    // Check if we could uninitilize the storage
    if (this._status == DatabaseStorageBase.StatusCode.UNINITIALIZED) {
      doCallback();
      return;
    }

    // Perform destruction operation
    if (this._IDBDatabase) {
      this._IDBDatabase.close();
    }

    this._status = DatabaseStorageBase.StatusCode.UNINITIALIZED;
    doCallback();
  },

  /**
   * Override
   */
  isEmpty: function indexedDBStorage_isEmpty() {
    return this._count == 0;
  },

  /**
   * Override
   */
  getAllTerms: function indexedDBStorage_getAllTerms(callback) {
    var homonymsArray = [];
    function doCallback() {
      if (callback) {
        callback(homonymsArray);
      }
    }

    // Check if the storage is ready.
    if (!this.isReady()) {
      doCallback();
      return;
    }

    // Query all terms
    var store = this._IDBDatabase.transaction(['homonyms'], 'readonly')
      .objectStore('homonyms');
    var req = store.openCursor();

    req.onerror = function(ev) {
      debug('Database read error.');
      doCallback();
    };
    req.onsuccess = function(ev) {
      var cursor = ev.target.result;
      if (cursor) {
        var homonyms = cursor.value;
        if (homonyms.syllablesString != '_last_entry_') {
          homonymsArray.push(homonyms);
        }
        cursor.continue();
      } else {
        doCallback();
      }
    };
  },

  setAllTerms: function indexedDBStorage_setAllTerms(homonymsArray, callback) {
    var self = this;
    function doCallback() {
      self._status = DatabaseStorageBase.StatusCode.READY;
      if (callback) {
        callback();
      }
    }

    var n = homonymsArray.length;

    // Check if the storage is ready.
    if (!this.isReady() || n == 0) {
      doCallback();
      return;
    }

    // Set the status to busy.
    this._status = DatabaseStorageBase.StatusCode.BUSY;

    // Use task queue to add the terms by batch to prevent blocking the main
    // thread.
    var taskQueue = new TaskQueue(
      function taskQueueOnCompleteCallback(queueData) {
      self._count = n;
      doCallback();
    });

    var processNextWithDelay = function setAllTerms_rocessNextWithDelay() {
      setTimeout(function nextTask() {
        taskQueue.processNext();
      }, 0);
    };

    // Clear all the terms before adding
    var clearAll = function setAllTerms_clearAll(taskQueue, taskData) {
      var transaction =
        self._IDBDatabase.transaction(['homonyms'], 'readwrite');
      var store = transaction.objectStore('homonyms');
      var req = store.clear();
      req.onsuccess = function(ev) {
        debug('IndexedDB cleared.');
        processNextWithDelay();
      };

      req.onerror = function(ev) {
        debug('Failed to clear IndexedDB.');
        self._status = DatabaseStorageBase.StatusCode.ERROR;
        doCallback();
      };

    };

    // Add a batch of terms
    var addChunk = function setAllTerms_addChunk(taskQueue, taskData) {
      var transaction =
        self._IDBDatabase.transaction(['homonyms'], 'readwrite');
      var store = transaction.objectStore('homonyms');
      transaction.onerror = function(ev) {
        debug('Database write error.');
        doCallback();
      };

      transaction.oncomplete = function() {
        processNextWithDelay();
      };

      var begin = taskData.begin;
      var end = taskData.end;
      for (var i = begin; i <= end; i++) {
        var homonyms = homonymsArray[i];
        store.put(homonyms);
      }

      // Add a special element to indicate that all the items are saved.
      if (end == n - 1) {
        store.put(new Homonyms('_last_entry_', []));
      }
    };

    taskQueue.push(clearAll, null);

    for (var begin = 0; begin < n; begin += 2000) {
      var end = Math.min(begin + 1999, n - 1);
      taskQueue.push(addChunk, {begin: begin, end: end});
    }

    processNextWithDelay();
  },

  /**
   * Override
   */
  getTermsBySyllables: function
    indexedDBStorage_getTermsBySyllables(syllablesStr, callback) {
    var homonymsArray = [];
    function doCallback() {
      if (callback) {
        callback(homonymsArray);
      }
    }

    // Check if the storage is ready.
    if (!this.isReady()) {
      doCallback();
      return;
    }

    var store = this._IDBDatabase.transaction(['homonyms'], 'readonly')
      .objectStore('homonyms');
    var req = store.get(syllablesStr);

    req.onerror = function(ev) {
      debug('Database read error.');
      doCallback();
    };

    req.onsuccess = function(ev) {
      var homonyms = ev.target.result;
      if (homonyms) {
        homonymsArray.push(homonyms);
      }
      doCallback();
    };
  },

  /**
   * Override
   */
  getTermsBySyllablesPrefix: function
    indexedDBStorage_getTermsBySyllablesPrefix(prefix, callback) {
    var homonymsArray = [];
    function doCallback() {
      if (callback) {
        callback(homonymsArray);
      }
    }

    // Check if the storage is ready.
    if (!this.isReady()) {
      doCallback();
      return;
    }

    var upperBound = prefix.substr(0, prefix.length - 1) +
      String.fromCharCode(prefix.substr(prefix.length - 1).charCodeAt(0) + 1);

    var store = this._IDBDatabase.transaction(['homonyms'], 'readonly')
      .objectStore('homonyms');
    var req =
      store.openCursor(IDBKeyRange.bound(prefix, upperBound, true, true));

    req.onerror = function(ev) {
      debug('Database read error.');
      doCallback();
    };
    req.onsuccess = function(ev) {
      var cursor = ev.target.result;
      if (cursor) {
        var homonyms = cursor.value;
        homonymsArray.push(homonyms);
        cursor.continue();
      } else {
        doCallback();
      }
    };
  },

  /**
   * Override
   */
  getTermsByIncompleteSyllables: function
    indexedDBStorage_getTermsByIncompleteSyllables(incomplete, callback) {
    var homonymsArray = [];
    function doCallback() {
      if (callback) {
        callback(homonymsArray);
      }
    }

    // Check if the storage is ready.
    if (!this.isReady()) {
      doCallback();
      return;
    }

    var matchRegEx = new RegExp(
       '^' + incomplete.replace(/([^']+)/g, "$1[^']*"));

    var fullyAbbreviated = SyllableUtils.stringToAbbreviated(incomplete);

    var store = this._IDBDatabase.transaction(['homonyms'], 'readonly')
      .objectStore('homonyms');
    var req = store.index('abbreviatedSyllablesString').openCursor(
      IDBKeyRange.only(fullyAbbreviated));

    req.onerror = function(ev) {
      debug('Database read error.');
      doCallback();
    };
    req.onsuccess = function(ev) {
      var cursor = ev.target.result;
      if (cursor) {
        var homonyms = cursor.value;
        if (matchRegEx.exec(homonyms.syllablesString)) {
          homonymsArray.push(homonyms);
        }
        cursor.continue();
      } else {
        doCallback();
      }
    };
  }
};

var IMEngineDatabase = function imedb(dbName, jsonUrl) {
  var settings;

  /**
   * Dictionary words' total frequency.
   */
  var kDictTotalFreq = 1.0e8;

  var jsonStorage = new JsonStorage(jsonUrl);
  var indexedDBStorage = new IndexedDBStorage(dbName);

  var iDBCache = {};
  var cacheTimer;
  var kCacheTimeout = 10000;

  var self = this;

  /* ==== init functions ==== */

  var populateDBFromJSON = function imedb_populateDBFromJSON(callback) {
    jsonStorage.getAllTerms(function getAllTermsCallback(homonymsArray) {
      indexedDBStorage.setAllTerms(homonymsArray, callback);
    });
  };

  /* ==== helper functions ==== */

  /*
  * Data from IndexedDB gets to kept in iDBCache for kCacheTimeout seconds
  */
  var cacheSetTimeout = function imedb_cacheSetTimeout() {
    debug('Set iDBCache timeout.');
    clearTimeout(cacheTimer);
    cacheTimer = setTimeout(function imedb_cacheTimeout() {
      debug('Empty iDBCache.');
      iDBCache = {};
    }, kCacheTimeout);
  };

  /* ==== init ==== */

  this.init = function imedb_init(options) {
    settings = options;

    var ready = function() {
      debug('Ready.');
      if (settings.ready)
        settings.ready();
    };

    if (!settings.enableIndexedDB) {
      debug('IndexedDB disabled; Downloading JSON ...');
      jsonStorage.init(ready);
      return;
    }

    debug('Probing IndexedDB ...');
    indexedDBStorage.init(function indexedDBStorageInitCallback() {
      if (!indexedDBStorage.isReady()) {
        debug('IndexedDB not available; Downloading JSON ...');
        jsonStorage.init(ready);
        return;
      }
      ready();
      if (indexedDBStorage.isEmpty()) {
        jsonStorage.init(function jsonStorageInitCallback() {
          if (!jsonStorage.isReady()) {
            debug('JSON failed to download.');
            return;
          }

          debug(
            'JSON loaded,' +
            'IME is ready to use while inserting data into db ...'
          );
          populateDBFromJSON(function populateDBFromJSONCallback() {
            if (!indexedDBStorage.isEmpty()) {
              debug('IndexedDB ready and switched to indexedDB backend.');
              jsonStorage.uninit();
            } else {
              debug('Failed to populate IndexedDB from JSON.');
            }
          });
        });
      }
    });
  };

  /* ==== uninit ==== */

  this.uninit = function imedb_uninit() {
    indexedDBStorage.uninit();
    jsonStorage.uninit();
  };

  var getUsableStorage = function imedb_getUsableStorage() {
    if (settings.enableIndexedDB &&
        indexedDBStorage.isReady() &&
        !indexedDBStorage.isEmpty()) {
      return indexedDBStorage;
    } else if (jsonStorage.isReady() && !jsonStorage.isEmpty()) {
      return jsonStorage;
    } else {
      return null;
    }
  };

  /* ==== db lookup functions ==== */

  this.getSuggestions =
    function imedb_getSuggestions(syllables, textStr, callback) {
    var storage = getUsableStorage();
    if (!storage) {
      debug('Database not ready.');
      callback([]);
      return;
    }

    var syllablesStr = SyllableUtils.arrayToString(syllables);
    var result = [];
    var matchTerm = function getSuggestions_matchTerm(term) {
      if (term.phrase.substr(0, textStr.length) !== textStr)
        return;
      if (term.phrase == textStr)
        return;
      result.push(term);
    };
    var processResult = function getSuggestions_processResult(r) {
      r = r.sort(
        function getSuggestions_sort(a, b) {
          return (b.freq - a.freq);
        }
      );
      var result = [];
      var t = [];
      r.forEach(function terms_foreach(term) {
        if (t.indexOf(term.phrase) !== -1) return;
        t.push(term.phrase);
        result.push(term);
      });
      return result;
    };
    var result = [];

    debug('Get suggestion for ' + textStr + '.');

    if (typeof iDBCache['SUGGESTION:' + textStr] !== 'undefined') {
      debug('Found in iDBCache.');
      cacheSetTimeout();
      callback(iDBCache['SUGGESTION:' + textStr]);
      return;
    }

    storage.getTermsBySyllablesPrefix(syllablesStr,
      function getTermsBySyllablesPrefix_callback(homonymsArray) {
      for (var i = 0; i < homonymsArray.length; i++) {
        var homonyms = homonymsArray[i];
        homonyms.terms.forEach(matchTerm);
      }
      if (result.length) {
        result = processResult(result);
      }
      cacheSetTimeout();
      iDBCache['SUGGESTION:' + textStr] = result;
      callback(result);
    });
  },

  this.getTerms = function imedb_getTerms(syllables, callback) {
    var storage = getUsableStorage();
    if (!storage) {
      debug('Database not ready.');
      callback([]);
      return;
    }

    var syllablesStr = SyllableUtils.arrayToString(syllables);
    debug('Get terms for ' + syllablesStr + '.');

    var processResult = function processResult(r, limit) {
      r = r.sort(
        function sort_result(a, b) {
          return (b.freq - a.freq);
        }
      );
      var result = [];
      var t = [];
      r.forEach(function(term) {
        if (t.indexOf(term.phrase) !== -1) return;
        t.push(term.phrase);
        result.push(term);
      });
      if (limit > 0) {
        result = result.slice(0, limit);
      }
      return result;
    };

    if (typeof iDBCache[syllablesStr] !== 'undefined') {
      debug('Found in iDBCache.');
      cacheSetTimeout();
      callback(iDBCache[syllablesStr]);
      return;
    }

    storage.getTermsBySyllables(syllablesStr, function(homonymsArray)
     {
      var result = [];
      for (var i = 0; i < homonymsArray.length; i++) {
        var homonyms = homonymsArray[i];
        result = result.concat(homonyms.terms);
      }
      if (result.length) {
        result = processResult(result, -1);
        cacheSetTimeout();
        iDBCache[syllablesStr] = result;
        callback(result);
      } else {
        storage.getTermsByIncompleteSyllables(syllablesStr,
          function(homonymsArray) {
            var result = [];
            for (var i = 0; i < homonymsArray.length; i++) {
              var homonyms = homonymsArray[i];
              result = result.concat(homonyms.terms);
            }
            if (result.length) {
              result =
                processResult(result, MAX_TERMS_FOR_INCOMPLETE_SYLLABLES);
            } else {
              result = [];
            }
            cacheSetTimeout();
            iDBCache[syllablesStr] = result;
            callback(result);
          }
        );
      }
    });

  };

  this.getTermWithHighestScore =
  function imedb_getTermWithHighestScore(syllables, callback) {
    self.getTerms(syllables, function getTermsCallback(terms) {
      if (terms == null) {
        callback(null);
        return;
      }
      callback(terms[0]);
    });
  }

  this.getSentence = function imedb_getSentence(syllables, callback) {
    var self = this;
    var doCallback = function getSentence_doCallback(sentence) {
      if (callback) {
        callback(sentence);
      }
    };

    var n = syllables.length;

    if (n == 0) {
      callback('');
    }

    var taskQueue = new TaskQueue(
      function taskQueueOnCompleteCallback(queueData) {
      var sentences = queueData.sentences;
      var sentence = sentences[sentences.length - 1];
      doCallback(sentence);
    });

    taskQueue.data = {
      sentences: ['', ''],
      probabilities: [1, 0],
      sentenceLength: 1,
      lastPhraseLength: 1
    };

    var getSentenceSubTask = function getSentence_subTask(taskQueue, taskData) {
      var queueData = taskQueue.data;
      var sentenceLength = queueData.sentenceLength;
      var lastPhraseLength = queueData.lastPhraseLength;
      var sentences = queueData.sentences;
      var probabilities = queueData.probabilities;
      if (probabilities.length < sentenceLength + 1) {
        probabilities.push(-1);
      }
      if (sentences.length < sentenceLength + 1) {
        sentences.push('');
      }
      var maxProb = probabilities[sentenceLength];
      var s = syllables.slice(sentenceLength -
        lastPhraseLength, sentenceLength);
      self.getTermWithHighestScore(s,
        function getTermWithHighestScoreCallback(term) {
          if (term == null) {
            var syllable = s.join('');
            term = {phrase: syllable, freq: 0};
          }
          var prob = probabilities[sentenceLength -
              lastPhraseLength] * term.freq / kDictTotalFreq;
          if (prob > probabilities[sentenceLength]) {
            probabilities[sentenceLength] = prob;
            sentences[sentenceLength] =
              sentences[sentenceLength - lastPhraseLength] + term.phrase;
          }

          // process next step
          if (lastPhraseLength < sentenceLength) {
            queueData.lastPhraseLength++;
          } else {
            queueData.lastPhraseLength = 1;
            if (sentenceLength < n) {
              queueData.sentenceLength++;
            } else {
              taskQueue.processNext();
              return;
            }
          }
          taskQueue.push(getSentenceSubTask, null);
          taskQueue.processNext();
        }
      );
    };

    taskQueue.push(getSentenceSubTask, null);
    taskQueue.processNext();
  };
};

var PinyinDecoderService = {
  // Private instance of the MatrixSearch
  _matrixSearch: null,

  /**
   * Open the decoder engine via the system and user dictionary file names.
   *
   * @param {String} sysDict The file name of the system dictionary.
   * @param {String} usrDict The file name of the user dictionary.
   * @return {Boolean} true if open the decode engine sucessfully.
   */
  open: function decoderService_open(sysDict, usrDict) {
    this._matrixSearch = new MatrixSearch();
    return this._matrixSearch.init(sysDict, usrDict);
  },

  /**
   * Close the decode engine.
   */
  close: function decoderService_close() {
    if (this._matrixSearch != null) {
      this._matrixSearch.uninit();
      this._matrixSearch = null;
    }
  },

  /**
   * Flush cached data to persistent memory. Because at runtime, in order to
   * achieve best performance, some data is only store in memory.
   */
  flushCache: function decoderService_flushCache() {
    if (this._matrixSearch != null) {
      this._matrixSearch.flushCache();
    }
  },

  /**
   * Use a spelling string(Pinyin string) to search. The engine will try to do
   * an incremental search based on its previous search result, so if the new
   * string has the same prefix with the previous one stored in the decoder,
   * the decoder will only continue the search from the end of the prefix.
   * If the caller needs to do a brand new search, please call
   * im_reset_search() first.
   *
   * @param {String} spsStr The spelling string buffer to decode.
   * @return {Integer} The number of candidates.
   */
  search: function decoderService_search(spsStr) {
    if (this._matrixSearch == null) {
      return 0;
    }
    this._matrixSearch.search(spsStr);
    return this._matrixSearch.getCandidateNum();
  },

  /**
   * Make a delete operation in the current search result, and make research if
   * necessary.
   *
   * @param {Integer} pos The posistion of char in spelling string to delete,
   * or the position of spelling id in result string to delete.
   * @param {Boolean} isPosInSplid Indicate whether the pos parameter is the
   * position in the spelling string, or the position in the result spelling id
   * string.
   * @param {Boolean} clearFixed If true, the fixed spellings will be cleared.
   * @return {Integer} The number of candidates.
   */
  delSearch: function decoderService_delSearch(pos, isPosInSplid, clearFixed) {
    if (this._matrixSearch == null) {
      return 0;
    }
    this._matrixSearch.delSearch(pos, isPosInSplid, clearFixed);
    return this._matrixSearch.getCandidateNum();
  },

  /**
   * Reset the previous search result.
   */
  resetSearch: function decoderService_resetSearch() {
    if (this._matrixSearch == null) {
      return;
    }
    this._matrixSearch.resetSearch();
  },

  /**
   * Get the spelling string kept by the decoder.
   *
   * @return {String} The spelling string kept by the decoder.
   */
  getSpsStr: function decoderService_getSpsStr() {
    if (this._matrixSearch == null) {
      return '';
    }
    return this._matrixSearch.getSpsStr();
  },

  /**
   * Get a candidate(or choice) string.
   *
   * @param {Integer} candId The id to get a candidate. Started from 0.
   * Usually, id 0 is a sentence-level candidate.
   * @return {String } The candidate string if succeeds, otherwise null.
   */
  getCandidate: function decoderService_getCandidate(candId) {
    if (this._matrixSearch == null) {
      return '';
    }
    return this._matrixSearch.getCandidate(candId);
  },

  /**
   * Get the segmentation information(the starting positions) of the spelling
   * string.
   *
   * @return {Array} An array contains the starting position of all the
   * spellings.
   */
  getSplStartPos: function decoderService_getSplStartPos() {
    if (this._matrixSearch == null) {
      return 0;
    }
    return this._matrixSearch.getSplStartPos();
  },

  /**
   * Choose a candidate and make it fixed. If the candidate does not match
   * the end of all spelling ids, new candidates will be provided from the
   * first unfixed position. If the candidate matches the end of the all
   * spelling ids, there will be only one new candidates, or the whole fixed
   * sentence.
   *
   * @param {Integer} candId The id of candidate to select and make it fixed.
   * @return {Integer} The number of candidates. If after the selection, the
   * whole result string has been fixed, there will be only one candidate.
   */
  choose: function decoderService_choose(candId) {
    if (this._matrixSearch == null) {
      return;
    }
    this._matrixSearch.choose(candId);
  },

  /**
   * Get the number of fixed spelling ids, or Chinese characters.
   *
   * @return {Integer} The number of fixed spelling ids, of Chinese characters.
   */
  getFixedLen: function decoderService_getFixedLen() {
    if (this._matrixSearch == null) {
      return 0;
    }
    return this._matrixSearch.getFixedLen();
  },

  /**
   * Get prediction candiates based on the given fixed Chinese string as the
   * history.
   *
   * @param {String} history The history string to do the prediction.
   * @return {String[]} The prediction result list of an string array.
   */
  getPredicts: function decoderService_getPredicts(history) {
    if (this._matrixSearch == null) {
      return [];
    }
    return this._matrixSearch.getPredicts(history);
  }
};


// The last lemma id (included) for the system dictionary. The system
// dictionary's ids always start from 1.
var SYS_DICT_ID_END = 500000;

// The first lemma id for the user dictionary.
var USER_DICT_ID_START = 500001;

// The last lemma id (included) for the user dictionary.
var USER_DICT_ID_END = 600000;

// System words' total frequency. It is not the real total frequency, instead,
// It is only used to adjust system lemmas' scores when the user dictionary's
// total frequency changes.
// In this version, frequencies of system lemmas are fixed. We are considering
// to make them changable in next version.
var SYS_DICT_TOTAL_FREQ = 100000000;

var MAX_SEARCH_STEPS = 40;

var DictMatchInfo = function dmi_constructor() {
  this.dictHandles = [0, 0];
};

DictMatchInfo.prototype = {
  // MileStoneHandle objects for the system and user dictionaries.
  dictHandles: null,
  // From which DMI node. -1 means it's from root.
  dmiFr: -1,
  // The spelling id for the Pinyin string from the previous DMI to this node.
  // If it is a half id like Shengmu, the node pointed by dict_node is the first
  // node with this Shengmu,
  splId: 0,
  // What's the level of the dict node. Level of root is 0, but root is never
  // recorded by dict_node.
  dictLevel: 0,
  // If this node is for composing phrase, its value is true.
  cPhrase: false,
  // Whether the splId is parsed with a split character at the end.
  splidEndSplit: false,
  // What's the length of the spelling string for this match, for the whole
  // word.
  splstrLen: 0,
  // Used to indicate whether all spelling ids from the root are full spelling
  // ids. This information is useful for keymapping mode(not finished). Because
  // in this mode, there is no clear boundaries, we prefer those results which
  // have full spelling ids.
  allFullId: false
};

var MatrixNode = function matrixNode_constructor() {
};

MatrixNode.prototype = {
  id: 0,
  score: 0.0,
  from: null,
  // From which DMI node. Used to trace the spelling segmentation.
  dmiFr: null,
  step: 0
};

var MatrixRow = function matrixRow_constructor() {
};


MatrixRow.prototype = {
  // The MatrixNode position in the matrix pool
  mtrxNdPos: 0,
  // The DictMatchInfo position in the DictMatchInfo pool.
  dmiPos: 0,
  mtrxNdNum: 0,
  dmiNum: 15,
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
  dmiHasFullId: false,
  // Points to a MatrixNode of the current step to indicate which choice the
  // user selects.
  mtrxNdFixed: null
};

// When user inputs and selects candidates, the fixed lemma ids are stored in
// _lmaId of class MatrixSearch, and _fixedLmas is used to indicate how many
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
var ComposingPhrase = function composingPhrase_constructor() {
  this.splIds = new Array(MatrixSearch.MAX_ROW_NUM);
  this.splStart = new Array(MatrixSearch.MAX_ROW_NUM);
  this.chnStr = new Array(MatrixSearch.MAX_ROW_NUM);
  this.sublmaStart = new Array(MatrixSearch.MAX_ROW_NUM);
};
ComposingPhrase.prototype = {
  splIds: null,
  splStart: null,
  chnStr: null,      // Chinese string array.
  sublmaStart: null, // Counted in Chinese characters.
  sublmaNum: 0,
  length: 0          // Counted in Chinese characters.
};

var MatrixSearch = function matrixSearch_constructor() {
  var i = 0;

  this._splStart = new Array(MatrixSearch.MAX_ROW_NUM);
  this._splStart = new Array(MatrixSearch.MAX_ROW_NUM);

  this._lmaStart = new Array(MatrixSearch.MAX_ROW_NUM);
  this._lmaId = new Array(MatrixSearch.MAX_ROW_NUM);
};

MatrixSearch.MAX_ROW_NUM = MAX_SEARCH_STEPS;

// The maximum buffer to store LmaPsbItems.
MatrixSearch.MAX_LMA_PSB_ITEMS = 1450;

// How many rows for each step.
MatrixSearch.MAX_NODE_A_ROW = 5;

// The maximum length of the sentence candidates counted in chinese
// characters
MatrixSearch.MAX_SENTENCE_LENGTH = 16;

// The size of the matrix node pool.
MatrixSearch.MTRX_ND_POOL_SIZE = 200;

// The size of the DMI node pool.
MatrixSearch.DMI_POOL_SIZE = 800;

// The maximum buffer to store the prediction items
MatrixSearch.MAX_PRE_ITEMS = 800;

MatrixSearch.prototype = {
  /* ==== Public methods ==== */

  init: function matrixSearch_init(sysDict, userDict) {
    this._allocResource();

    if (!this._dictTrie.load(sysDict, 1, SYS_DICT_ID_END)) {
      return false;
    }

    if (!this._userDict.load(userDict, USER_DICT_ID_START, USER_DICT_ID_END)) {
      return false;
    }

    this._userDict.setTotalLemmaCountOfOthers(SYS_DICT_TOTAL_FREQ);

    this._initilized = true;
    return true;
  },

  uninit: function matrixSearch_uinit() {
    this.flushCache();
    this._freeResource();
    this._initilized = false;
  },

  /**
   * Flush cached data to persistent memory. Because at runtime, in order to
   * achieve best performance, some data is only store in memory.
   */
  flushCache: function matrixSearch_flushCache() {
    if (this._userDict) {
      this._userDict.flushCache();
    }
  },

  /**
   * Search a Pinyin string.
   *
   * @param {String} py The Pinyin string.
   * @return {Integer} The position successfully parsed.
   */
  search: function matrixSearch_search(py) {
    if (!this._initilized || py == '') {
      return 0;
    }

    var pyLen = py.length;

    // If the search Pinyin string is too long, it will be truncated.
    if (pyLen > MatrixSearch.MAX_ROW_NUM - 1) {
      py = py.substring(0, MatrixSearch.MAX_ROW_NUM - 1);
      pyLen = MatrixSearch.MAX_ROW_NUM - 1;
    }

    // Compare the new string with the previous one. Find their prefix to
    // increase search efficiency.
    var chPos = 0;
    var len = Math.min(this._pysDecodedLen, pyLen);
    for (chPos = 0; chPos < len; chPos++) {
      if (py.charAt(chPos) != this._pys.charAt(chPos))
        break;
    }

    var clearFix = chPos != this._pysDecodedLen;

    this._resetSearch(chPos, clearFix, false, false);

    this._pys = py;

    while (chPos < pyLen) {
      if (!this._addChar(py.charAt(chPos))) {
        this._pysDecodedLen = chPos;
        break;
      }
      chPos++;
    }

    // Get spelling ids and starting positions.
    this._getSplStartId();

    // If there are too many spellings, remove the last letter until the
    // spelling number is acceptable.
    while (this._splIdNum > 9) {
      pyLen--;
      this._resetSearch(pyLen, false, false, false);
      this._pys = this._pys.substring(0, pyLen);
      this._getSplStartId();
    }

    this._prepareCandidates();

    return chPos;
  },

  /**
   * Used to delete something in the Pinyin string kept by the engine, and do
   * a re-search.
   *
   * @param {Integer} pos The posistion of char in spelling string to delete,
   * or the position of spelling id in result string to delete.
   * @param {Boolean} isPosInSplid If isPosInSplid is false, pos is used to
   * indicate that pos-th Pinyin character needs to be deleted. And if the
   * pos-th character is in the range for the fixed lemmas or composing string,
   * this function will do nothing and just return the result of the previous
   * search. If isPosInSplid is true, all Pinyin characters for pos-th spelling
   * id needs to be deleted.
   * @param {Boolean} clearFixed If the deleted character(s) is just after a
   * fixed lemma or sub lemma in composing phrase, clearFixed indicates
   * whether we needs to unlock the last fixed lemma or sub lemma.
   * @return {Integer} The new length of Pinyin string kept by the engine which
   * is parsed successfully.
   */
  delSearch: function matrixSearch_delSearch(pos, isPosInSplid, clearFixed) {

  },

  /**
   * Reset the search space.
   */
  resetSearch: function matrixSearch_resetSearch() {
    if (!this._initilized) {
      return false;
    }

    return true;
  },

  // Get the number of candiates, called after search().
  getCandidateNum: function matrixSearch_getCandidateNum() {
  },

  /**
   * Get the Pinyin string stored by the engine.
   */
  getSpsStr: function matrixSearch_getSpsStr() {

  },

  /**
   * Get a candidate(or choice) string. If full sentence candidate is
   * available, it will be the first one.
   *
   * @param {Integer} candId The id to get a candidate. Started from 0.
   * Usually, id 0 is a sentence-level candidate.
   * @return {String } The candidate string if succeeds, otherwise null.
   */
  getCandidate: function matrixSearch_getCandidate(candId) {

  },

  /**
   * Get the spelling boundaries for the first sentence candidate.
   * The number of valid elements is one more than the return value because the
   * last one is used to indicate the beginning of the next un-input spelling.
   * For a Pinyin "women", the returned array is [0, 2, 5].
   *
   * @return {Array} An array contains the starting position of all the
   * spellings.
   */
  getSplStartPos: function matrixSearch_getSplStartPos() {

  },

  /**
   * Choose a candidate. The decoder will do a search after the fixed position.
   */
  choose: function matrixSearch_choose(candId) {

  },

  /**
   * Get the length of fixed Chinese characters.
   */
  getFixedLen: function matrixSearch_getFixedLen() {

  },

  /**
   * Get prediction candiates based on the given fixed Chinese string as the
   * history.
   *
   * @param {String} fixed The fixed string to do the prediction.
   * @return {Array} The prediction result list of an string array.
   */
  getPredicts: function matrixSearch_getPredicts(fixed) {

  },

  /* ==== Private ==== */

  // Used to indicate whether this object has been initialized.
  _initilized: false,

  // System dictionary
  _dictTrie: null,

  // User dictionary
  _userDict: null,

  // Spelling parser.
  _splParser: null,

  // Pinyin string
  _pys: '',

  // The length of the string that has been decoded successfully.
  _pysDecodedLen: 0,

  _mtrxNdPool: null,
  _mtrxNdPoolUsed: 0,  // How many nodes used in the pool
  _dmiPool: null,
  _dmiPoolUsed: 0,     // How many items used in the pool

  /**
   * The first row is for starting
   * @type MatrixRow[]
   */
  _matrix: null,

  _dep: null,          // Parameter used to extend DMI nodes.

  _npreItems: null,     // Used to do prediction
  _npreItemsLen: 0,

  // The starting positions and lemma ids for the full sentence candidate.
  _lmaIdNum: 0,
  _lmaStart: null,     // Counted in spelling ids.
  _lmaId: null,
  _fixedLmas: 0,

  // If this._fixedLmas is bigger than i,  Element i is used to indicate whether
  // the i'th lemma id in this._lmaId is the first candidate for that step.
  // If all candidates are the first one for that step, the whole string can be
  // decoded by the engine automatically, so no need to add it to user
  // dictionary. (We are considering to add it to user dictionary in the
  // future).
  _fixedLmasNo1: null,

  // Composing phrase
  _cPhrase: null,

  // If _dmiCPhrase is true, the decoder will try to match the
  // composing phrase (And definitely it will match successfully). If it
  // is false, the decoder will try to match lemmas items in dictionaries.
  _dmiCPhrase: true,

  // The starting positions and spelling ids for the first full sentence
  // candidate.
  _splIdNum: 0,       // Number of spelling ids
  _splStart: null,     // Starting positions
  _splId: null,        // Spelling ids
  // Used to remember the last fixed position, counted in Hanzi.
  _fixedHzs: 0,

  // Lemma Items with possibility score, two purposes:
  // 1. In Viterbi decoding, this buffer is used to get all possible candidates
  // for current step;
  // 2. When the search is done, this buffer is used to get candiates from the
  // first un-fixed step and show them to the user.
  /** @type LmaPsbItem */
  _lpiItems: null,
  _lpiTotal: 0,

  _allocResource: function matrixSearch_allocResource() {
    this._dictTrie = new DictTrie();
    this._userDict = new UserDict();

    // The buffers for search
    this._mtrxNdPool = new Array(MatrixSearch.MTRX_ND_POOL_SIZE);
    this._dmiPool = new Array(MatrixSearch.DMI_POOL_SIZE);
    this._matrix = [];
    for (i = 0; i < MatrixSearch.MAX_ROW_NUM; i++) {
      this._matrix[i] = new MatrixRow();
    }
    this._dep = new DictExtPara();

    // The prediction buffer
    this._npreItems = new Array(MatrixSearch.MAX_PRE_ITEMS);
    this._npreItemsLen = MatrixSearch.MAX_PRE_ITEMS;
  },

  _freeResource: function matrixSearch_freeResource() {

  },

  // Reset the search space from ch_pos step. For example, if the original
  // input Pinyin is "an", _resetSearch(1) will reset the search space to the
  // result of "a". If the given position is out of range, return false.
  // if clearFixed is true, and the chPos step is a fixed step,
  // clear its fixed status. if clearDmi is true, clear the DMI nodes.
  // If clearMtrx is true, clear the mtrx nodes of this step.
  // The DMI nodes will be kept.
  //
  // Note: this function should not destroy content of _pys.
  _resetSearch: function matrixSearch_resetSearch(chPos, clearFixed,
                                                  clearDmi, clearMtrx) {
  },

  // Prepare candidates from the last fixed hanzi position.
  _prepareCandidates: function matrixSearch_prepareCandidates() {
  },

  // Get spelling start positions and ids. The result will be stored in
  // _splIdNum, _splStart[], _splId[].
  // _fixedHzs will be also assigned.
  _getSplStartId: function matrixSearch_getSplStartId() {
    this._lmaIdNum = 0;
    this._lmaStart[0] = 0;

    this._splIdNum = 0;
    this._splStart[0] = 0;
    if (!this._initilized || 0 == this._pysDecodedLen ||
        0 == this._matrix[this._pysDecodedLen].mtrxNdNum) {
      return;
    }

    // Calculate number of lemmas and spellings
    // Only scan the part which is not fixed.
    this._lmaIdNum = this._fixedLmas;
    this._splIdNum = this._fixedHzs;

    var ndPos = this._matrix[this._pysDecodedLen].mtrxNdPos;
    while (ndPos != 0) {
      var mtrxNd = this._mtrxNdPool[ndPos];
      if (this._fixedHzs > 0) {
        if (mtrxNd.step <= this._splStart[this._fixedHzs])
          break;
      }

      // Update the spelling segamentation information
      var wordSplsStrLen = 0;
      var dmiFr = mtrxNd.dmiFr;
      if (-1 != dmiFr) {
        wordSplsStrLen = this._dmiPool[dmiFr].splstrLen;
      }

      while (-1 != dmiFr) {
        this._splStart[this._splIdNum + 1] = mtrxNd.step -
            (wordSplsStrLen - this._dmiPool[dmiFr].splstrLen);
        this._splId[this._splIdNum_] = this._dmiPool[dmiFr].splId;
        this._splIdNum++;
        dmiFr = this._dmiPool[dmiFr].dmiFr;
      }

      // Update the lemma segmentation information
      this._lmaStart[this._lmaIdNum + 1] = this._splIdNum;
      this._lmaId[this._lmaIdNum] = mtrxNd.id;
      this._lmaIdNum++;

      ndPos = mtrxNd.from;
    }

    var pos;
    var endPos;
    var pos1;
    var pos2;
    var tmp;

    // Reverse the result of spelling info
    endPos = this._fixedHzs + (this._splIdNum - this._fixedHzs + 1) / 2;
    for (pos = this._fixedHzs; pos < endPos; pos++) {
      if (this._splIdNum_ + this._fixedHzs - pos != pos + 1) {
        pos1 = pos + 1;
        pos2 = this._splIdNum - pos + this._fixedHzs;
        tmp = this._splStart[pos1];
        this._splStart[pos1] = this._splStart[pos2];
        this._splStart[pos2] = tmp;

        pos1 = pos;
        pos2 = this._splIdNum + this._fixedHzs - pos - 1;
        tmp = this._splId[pos1];
        this._splId[pos1] = this._splId[pos2];
        this._splId[pos2] = tmp;
      }
    }

    // Reverse the result of lemma info
    endPos = this._fixedLmas + (this._lmaIdNum - this._fixedLmas + 1) / 2;
    for (pos = this._fixedLmas; pos < endPos; pos++) {
      pos1 = pos + 1;
      pos2 = this._lmaIdNum + this._fixedLmas - pos;
      var tmp = 0;
      if (pos2 > pos1) {
        tmp = this._lmaStart[pos1];
        this._lmaStart[pos1] = this._lmaStart[pos2];
        this._lmaStart[pos2] = tmp;

        pos1 = pos;
        pos2 = this._lmaIdNum - 1 - pos + this._fixedLmas;
        tmp = this._lmaId[pos1];
        this._lmaId[pos1] = this._lmaId[pos2];
        this._lmaId[pos2] = tmp;
      }
    }

    for (pos = this._fixedLmas + 1; pos <= this._lmaIdNum; pos++) {
      if (pos < this._lmaIdNum) {
        this._lmaStart[pos] = this._lmaStart[pos - 1] +
            (this._lmaStart[pos] - this._lmaStart[pos + 1]);
      }
      else {
        this._lmaStart[pos] = this._lmaStart[pos - 1] + this._lmaStart[pos] -
            this._lmaStart[this._fixedLmas];
      }
    }

    // Find the last fixed position
    this._fixedHzs = 0;
    for (pos = this._splIdNum; pos > 0; pos--) {
      if (null != this._matrix[this._splStart[pos]].mtrxNdFixed) {
        this._fixedHzs = pos;
        break;
      }
    }
  },

  _addChar: function matrixSearch_addChar(ch) {
    if (!this._prepareAddChar(ch)) {
      return false;
    }
    return this._addCharQwerty(ch);
  },

  _prepareAddChar: function matrixSearch_prepareAddChar(ch) {
    if (this._pysDecodedLen >= MatrixSearch.MAX_ROW_NUM - 1 ||
        (!this._splParser.is_valid_to_parse(ch) && ch != '\'')) {
      return false;
    }

    if (this._dmiPoolUsed >= MatrixSearch.DMI_POOL_SIZE) {
      return false;
    }

    this._pys += ch;
    this._pysDecodedLen++;

    var mtrxRow = this._matrix[this._pysDecodedLen];
    mtrxRow.mtrxNdPos = this._mtrxNdPoolUsed;
    mtrxRow.mtrxNdNum = 0;
    mtrxRow.dmiPos = this._dmiPoolUsed;
    mtrxRow.dmiNum = 0;
    mtrxRow.dmiHasFullId = false;

    return true;
  },

  // Called after _prepareAddChar, so the input char has been saved.
  _addCharQwerty: function matrixSearch_addCharQwerty(ch) {

  },

  // Is the character in step pos a splitter character?
  // The caller guarantees that the position is valid.
  _isSplitAt: function matrixSearch_isSplitAt(pos) {
    return !this._splParser.is_valid_to_parse(this._pys[pos - 1]);
  }
};

/**
 * This interface defines the essential metods for all atom dictionaries.
 * Atom dictionaries are managed by the decoder class MatrixSearch.
 *
 * When the user appends a new character to the Pinyin string, all enabled atom
 * dictionaries' extendDict() will be called at least once to get candidates
 * ended in this step (the information of starting step is also given in the
 * parameter). Usually, when extendDict() is called, a MileStoneHandle object
 * returned by a previous calling for a earlier step is given to speed up the
 * look-up process, and a new MileStoneHandle object will be returned if
 * the extension is successful.
 *
 * A returned MileStoneHandle object should keep alive until Function
 * resetMilestones() is called and this object is noticed to be reset.
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
   * @param {String} fileName The file name to load dictionary.
   * @param {Integer} startId The starting id used for this atom dictionary.
   * @param {Integer} endId The end id (included) which can be used for this
   * atom dictionary. User dictionary will always use the last id space, so it
   * can ignore this paramter. All other atom dictionaries should check this
   * parameter.
   * @return {Boolean} true if succeed.
   */
  load: function atomDictBase_load(fileName, startId, endId) {},

  /**
   * Close this atom dictionary.
   *
   * @return {Boolean} true if succeed.
   */
  close: function atomDictBase_close() {},

  /**
   * Get the total number of lemmas in this atom dictionary.
   *
   * @return {Integer} The total number of lemmas.
   */
  getLemmasNumber: function atomDictBase_getLemmasNumber() {},

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
   * resetting, it will call resetMilestones() of its atom dictionaries with
   * the step information, and the MileStoneHandle objects returned by the
   * earliest calling of extendDict() for that step.
   *
   * If an atom dictionary does not implement incremental search, this function
   * can be totally ignored.
   *
   * @param fromStep From which step(included) the MileStoneHandle
   * objects should be reset.
   * @param fromHandle The ealiest MileStoneHandle object for step from_step.
   */
  resetMilestones: function atomDictBase_resetMilestones(fromStep, fromHandle) {
  },

  /**
   * Used to extend in this dictionary. The handle returned should keep valid
   * until resetMilestones() is called.
   *
   * @param {Integer} fromHandle Its previous returned extended handle without the new
   * spelling id, it can be used to speed up the extending.
   * @param dep The paramter used for extending.
   * @return {handle: Integer, items: LmaPsbItem[]} . handle is the new mile
   * stone for this extending. 0 if fail. items is filled in with the lemmas
   * matched.
   */
  extendDict: function atomDictBase_extendDict(fromHandle, dep) {},

  /**
   * Get lemma items with scores according to a spelling id stream.
   * This atom dictionary does not need to sort the returned items.
   *
   * @param {String} splidStr The spelling id stream string.
   * @return {LmaPsbItem[]} The array of matched items.
   */
  getLpis: function atomDictBase_getLpis(splidStr) {},

  /**
   * Get a lemma string (The Chinese string) by the given lemma id.
   *
   * @param {Integer} lemmaId The lemma id to get the string.
   */
  getLemmaStr: function atomDictBase_getLemmaStr(lemmaId) {},

  /**
   * Get the full spelling ids for the given lemma id.
   *
   * @param {Integer} lemmaId The lemma id to get the result.
   * @param {Integer[]} splids The buffer of the splids. There may be half ids
   * in splids to be updated to full ids。.
   * @return {Integer} The number of ids in the buffer.
   */
  getLemmaSplids: function atomDictBase_getLemmaSplids(lemmaId, splids) {},

  /**
   * Function used for prediction.
   * No need to sort the newly added items.
   *
   * @param {String} lastHzs The last n Chinese characters(called Hanzi), its
   * length should be less than or equal to kMaxPredictSize.
   * @param {Integer} b4Used Number of prediction result from other atom dictionaries.
   * An atom dictionary can just ignore it.
   * @return {NPredictItem[]} The array of prediction result from this atom
   * dictionary.
   */
  predict: function atomDictBase_predict(lastHzs, b4Used) {},

  /**
   * Add a lemma to the dictionary. If the dictionary allows to add new
   * items and this item does not exist, add it.
   *
   * @param {String} lemmaStr The Chinese string of the lemma.
   * @param {Integer[]} splids The spelling ids of the lemma.
   * @param {Integer} count The frequency count for this lemma.
   * @return {Integer} The id if succeed, 0 if fail.
   */
  putLemma: function atomDictBase_putLemma(lemmaStr, splids, count) {},

  /**
   * Update a lemma's occuring count.
   *
   * @param {Integer} lemmaId The lemma id to update.
   * @param {Integer} deltaCount The frequnecy count to ajust.
   * @param {Boolean } selected Indicate whether this lemma is selected by user
   * and submitted to target edit box.
   * @return {Integer} The id if succeed, 0 if fail.
   */
  updateLemma: function atomDictBase_updateLemma(lemmaId, deltaCount, selected)
  {},

  /**
   * Get the lemma id for the given lemma.
   *
   * @param {String} lemmaStr The Chinese string of the lemma.
   * @param {Integer[]} splids The spelling ids of the lemma.
   * @return {Integer} The matched lemma id, or 0 if fail.
   */
  getLemmaId: function atomDictBase_getLemmaId(lemmaStr, splids) {},

  /**
   * Get the lemma score.
   *
   * @param {Integer} lemmaId The lemma id to get score.
   * @return {Integer} The score of the lemma, or 0 if fail.
   */
  getLemmaScoreById: function atomDictBase_getLemmaScoreById(lemmaId) {},

  /**
   * Get the lemma score.
   *
   * @param {String} lemmaStr The Chinese string of the lemma.
   * @param {Integer[]} splids The spelling ids of the lemma.
   * @return {Integer} The score of the lamm, or 0 if fail.
   */
  getLemmaScoreByContent: function atomDictBase_getLemmaScoreByContent(
    lemmaStr, splids) {},

  /**
   * If the dictionary allowed, remove a lemma from it.
   *
   * @param {Integer} lemmaId The id of the lemma to remove.
   * @return {Boolean} true if succeed.
   */
  removeLemma: function atomDictBase_removeLemma(lemmaId) {},

  /**
   * Get the total occuring count of this atom dictionary.
   *
   * @return {Integer} The total occuring count of this atom dictionary.
   */
  getTotalLemmaCount: function atomDictBase_getTotalLemmaCount() {},

  /**
   * Set the total occuring count of other atom dictionaries.
   *
   * @param {Integer} count The total occuring count of other atom dictionaies.
   */
  setTotalLemmaCountOfOthers: function atomDictBase_setTotalLemmaCountOfOthers(
    count) {},

  /**
   * Notify this atom dictionary to flush the cached data to persistent storage
   * if necessary.
   */
  flushCache: function atomDictBase_flushCache() {}
};

var DictTrie = function userDict_constructor() {
};

DictTrie.prototype = {
  __proto__: IAtomDictBase
};

var UserDict = function userDict_constructor() {
};

UserDict.prototype = {
  __proto__: IAtomDictBase
};

var SpellingParser = function spellingParser_constructor() {
};


SpellingParser.prototype = {
  /* ==== Private ==== */

  /**
   * @type SpellingTrie
   */
  spl_trie_: null,

  /* ==== Public ==== */
  /** Given a string, parse it into a spelling id stream.
   * @param {String} splstr The given spelling string.
   * @return {splidx: Integer[], start_pos: Integer[], last_is_pre: Boolean}
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

  },

  /**
   * Similar to splstr_to_idxs(), the only difference is that splstr_to_idxs()
   * convert single-character Yunmus into half ids, while this function converts
   * them into full ids.
   */
  splstr_to_idxs_f: function spellingParser_splstr_to_idxs_f(splstr) {

  },

  /**
   * Get the spelling id of given string.
   * @param {String} splstr The spelling string.
   * @return {splid: Integer, is_pre: Boolean}
   * If the given string is a spelling, return the id, others, return 0.
   * If the give string is a single char Yunmus like "A", and the char is
   * enabled in ShouZiMu mode, the returned spelling id will be a half id.
   * When the returned spelling id is a half id, is_pre returns whether it
   * is a prefix of a full spelling string.
   */
  get_splid_by_str: function spellingParser_get_splid_by_str(splstr) {

  },

  /**
   * Splitter chars are not included.
   */
  is_valid_to_parse: function spellingParser_is_valid_to_parse(ch) {

  }
};


// Node used for the trie of spellings
var SpellingNode = function spellingNode_constructor() {
};

SpellingNode.prototype = {
  /**
   * @type SpellingNode
   */
  first_son: null,
  /**
   * The spelling id for each node.
   * @type Integer
   */
  spelling_idx: 0,
  /**
   * @type Integer
   */
  num_of_son: 5,

  char_this_node: '',

  /**
   * @type Integer
   */
  score: 0
};

var SpellingTrie = function spellingTrie_constructor() {
};

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

SpellingTrie.is_valid_spl_char = function(ch) {
  return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z');
};

// The caller guarantees that the two chars are valid spelling chars.
SpellingTrie.is_same_spl_char = function(ch1, ch2) {
  return ch1 == ch2 || ch1 - ch2 == 'a' - 'A' || ch2 - ch1 == 'a' - 'A';
}

SpellingTrie.prototype = {
 /* ==== Public ==== */

  /**
   * Construct the tree from the input pinyin array
   * The given string list should have been sorted.
   * @param {String} spelling_arr The input pinyin array.
   * @param {Number} score_amplifier is used to convert a possibility
   * value into score.
   * @param {Integer} average_score is the average_score of all spellings.
   * The dumb node is
   * assigned with this score.
   */
  construct: function spellingTrie_construct(spelling_arr, item_size, item_num,
                 score_amplifier, average_score) {

  },

  /**
   * Test if the given id is a valid spelling id.
   * @return {valid: Boolean, splid: Integer}
   * If valid is true, the given splid may be updated like this:
   * When 'A' is not enabled in ShouZiMu mode, the parsing result for 'A' is
   * first given as a half id 1, but because 'A' is a one-char Yunmu and
   * it is a valid id, it needs to updated to its corresponding full id.
   */
  if_valid_id_update: function spellingTrie_if_valid_id_update(splid) {

  },


  // Test if the given id is a half id.
  is_half_id: function spellingTrie_is_half_id(splid) {

  },

  is_full_id: function spellingTrie_is_full_id(splid) {

  },

  // Test if the given id is a one-char Yunmu id (obviously, it is also a half
  // id), such as 'A', 'E' and 'O'.
  is_half_id_yunmu: function spellingTrie_is_half_id_yunmu(splid) {

  },

  /** Test if this char is a ShouZiMu char. This ShouZiMu char may be not
   * enabled.
   * For Pinyin, only i/u/v is not a ShouZiMu char.
   * The caller should guarantee that ch >= 'A' && ch <= 'Z'
   */
  is_szm_char: function spellingTrie_is_szm_char(ch) {

  },

  // Test If this char is enabled in ShouZiMu mode.
  // The caller should guarantee that ch >= 'A' && ch <= 'Z'
  szm_is_enabled: function spellingTrie_szm_is_enabled(ch) {

  },

  // Enable/disable Shengmus in ShouZiMu mode(using the first char of a spelling
  // to input).
  szm_enable_shm: function spellingTrie_szm_enable_shm(enable) {

  },

  // Enable/disable Yunmus in ShouZiMu mode.
  szm_enable_ym: function spellingTrie_szm_enable_ym(enable) {

  },

  // Test if this char is enabled in ShouZiMu mode.
  // The caller should guarantee ch >= 'A' && ch <= 'Z'
  is_szm_enabled: function spellingTrie_is_szm_enabled(ch) {

  },

  // Return the number of full ids for the given half id.
  half2full_num: function spellingTrie_half2full_num(half_id) {

  },

  /**
   * @return {num: Integer, spl_id_start: Integer} num is the number of full ids
   * for the given half id, and spl_id_start is the first full id.
   */
  half_to_full: function spellingTrie_half_to_full(half_id) {

  },

  // Return the corresponding half id for the given full id.
  // Not frequently used, low efficient.
  // Return 0 if fails.
  full_to_half: function spellingTrie_full_to_half(full_id) {

  },

  // To test whether a half id is compatible with a full id.
  // Generally, when half_id == full_to_half(full_id), return true.
  // But for "Zh, Ch, Sh", if fussy mode is on, half id for 'Z' is compatible
  // with a full id like "Zhe". (Fussy mode is not ready).
  half_full_compatible: function spellingTrie_half_full_compatible(
      half_id, full_id) {

  },

  // Save to the file stream
  save_spl_trie: function spellingTrie_save_spl_trie(fp) {

  },

  // Load from the file stream
  load_spl_trie: function spellingTrie_load_spl_trie(fp) {

  },

  // Get the number of spellings
  get_spelling_num: function spellingTrie_get_spelling_num() {

  },

  // Return the Yunmu id for the given Yunmu string.
  // If the string is not valid, return 0;
  get_ym_id: function spellingTrie_get_ym_id(ym_str) {

  },

  // Get the readonly Pinyin string for a given spelling id
  get_spelling_str: function spellingTrie_get_spelling_str(splid) {

  },

  /* ==== Private ==== */

  // The spelling table
  spelling_buf_: null,

  // The size of longest spelling string, includes '\0' and an extra char to
  // store score. For example, "zhuang" is the longgest item in Pinyin list,
  // so spelling_size_ is 8.
  // Structure: The string ended with '\0' + score char.
  // An item with a lower score has a higher probability.
  spelling_size_: 0,

  // Number of full spelling ids.
  spelling_num_: 0,

  score_amplifier_: 0.0,
  average_score_: 0,

  // The Yunmu id list for the spelling ids (for half ids of Shengmu,
  // the Yunmu id is 0).
  // The length of the list is spelling_num_ + kFullSplIdStart,
  // so that spl_ym_ids_[splid] is the Yunmu id of the splid.
  // @type Integer[]
  spl_ym_ids_: null,

  // The Yunmu table.
  // Each Yunmu will be assigned with Yunmu id from 1.
  ym_buf_: null,
  ym_size_: 0,  // The size of longest Yunmu string, '\0'included.
  ym_num_: 0,

  // The spelling string just queried
  splstr_queried_: '',

  // The root node of the spelling tree
  // @type SpellingNode
  root_: null,

  // If a none qwerty key such as a fnction key like ENTER is given, this node
  // will be used to indicate that this is not a QWERTY node.
  // @type SpellingNode
  dumb_node_: null,

  // If a splitter key is pressed, this node will be used to indicate that this
  // is a splitter key.
  // @type SpellingNode
  splitter_node_: null,

  // Used to get the first level sons.
  // @type SpellingNode[SpellingTrie.kValidSplCharNum]
  level1_sons_: null,

  // The full spl_id range for specific half id.
  // h2f means half to full.
  // A half id can be a ShouZiMu id (id to represent the first char of a full
  // spelling, including Shengmu and Yunmu), or id of zh/ch/sh.
  // [1..kFullSplIdStart-1] is the arrange of half id.
  h2f_start_: null,          // @type Integer[kFullSplIdStart]
  h2f_num_: null,            // @type Integer[kFullSplIdStart]

  /** Map from full id to half id.
   * @type Integer[]
   */
  f2h_: null,

  // How many node used to build the trie.
  node_num_: 0,

  free_son_trie: function spellingTrie_free_son_trie(node) {

  },

  // Construct a subtree using a subset of the spelling array (from
  // item_star to item_end).
  // Member spelliing_buf_ and spelling_size_ should be valid.
  // parent is used to update its num_of_son and score.
  construct_spellings_subset: function spellingTrie_free_son_trie(
      item_start, item_end, level, parent) {

  },

  build_f2h: function spellingTrie_build_f2h() {

  },

  // The caller should guarantee ch >= 'A' && ch <= 'Z'
  is_shengmu_char: function spellingTrie_is_shengmu_char(ch) {

  },

  // The caller should guarantee ch >= 'A' && ch <= 'Z'
  is_yunmu_char: function spellingTrie_is_yunmu_char(ch) {

  },

  // Given a spelling string, return its Yunmu string.
  // The caller guaratees spl_str is valid.
  get_ym_str: function spellingTrie_get_ym_str(spl_str) {

  },

  // Build the Yunmu list, and the mapping relation between the full ids and the
  // Yunmu ids. This functin is called after the spelling trie is built.
  build_ym_info: function spellingTrie_build_ym_info() {

  }
};

var jspinyin = new IMEngine(new PinyinParser());

// Expose jspinyin as an AMD module
if (typeof define === 'function' && define.amd)
  define('jspinyin', [], function() { return jspinyin; });

// Expose to IMEManager if we are in Gaia homescreen
if (typeof IMEManager !== 'undefined')
  IMEController.IMEngines.jspinyin = jspinyin;

// For unit tests
if (typeof Test !== 'undefined') {
  Test.PinyinParser = PinyinParser;
}

})();
