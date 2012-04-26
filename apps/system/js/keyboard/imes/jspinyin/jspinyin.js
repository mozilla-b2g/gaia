/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

(function() {

var debugging = false;
var debug = function(str, force) {
  if (!debugging && !force)
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

var SyllableUtils = {
  /**
   * Converts a syllables array to a string that each syllable will be sperated by '.
   * @example ['bei', 'jing'] will be converted to "bei'jing".
   */
  arrayToString: function(array) {
    return array.join("'");
  },
  
  /**
   * Converts a syllables string to an array.
   * @example "bei'jing" will be converted to [bei'jing].
   */
  arrayFromString: function(str) {
    return str.split("'");
  },
  
  /**
   * Converts a syllables string to its abbreviated form.
   * @example "bei'jing" will be converted to "b'j"
   */
  stringToAbbreviated: function(str) {
    return str.replace(/([^'])[^']*/g, '$1');
  }
};

var Term = function(phrase, freq) {
  if (phrase) {
    this.phrase = phrase;
  }
  if (freq) {
    this.freq = freq;
  }
};

Term.prototype = {
  phrase: '北京',
  freq: 0.01  /* The frequency of the term*/
};

/**
 * Terms with same pronunciation.(同音词)
 */
var Homonyms = function(syllablesString, terms) {
  this.syllablesString = syllablesString;
  this.abbreviatedSyllablesString = SyllableUtils.stringToAbbreviated(syllablesString);
  
  // Clone a new array
  this.terms = terms.concat();
};

Homonyms.prototype = {
  syllablesString: "bei'jing",  /* Full pinyin syllables(全拼) */
  abbreviatedSyllablesString: "b'j", /* Abbreviated pinyin syllabels(简拼) */
  terms: [new Term('北京', 0.010), new Term('背景', 0.005)],  
};

/** Maximum limit of PinYin syllable length */
var SYLLALBLE_MAX_LENGTH = 6;

/**
 * Divides a string into Pinyin syllables
 */
var PinyinParser = function() {
  // Consonants(声母) list
  var consonants= 'b p m f d t n l g k h j q x zh ch sh r z c s y w'.split(' ');
  for(var i in consonants) {
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

    'zhi', 'zha', 'zhai', 'zhan', 'zhang', 'zhao', 'zhe', 'zhei', 'zhen', 'zheng',
    'zhong', 'zhou', 'zhu', 'zhua', 'zhuai', 'zhuan', 'zhuang', 'zhui', 'zhun', 'zhuo',
    
    'chi', 'cha', 'chai', 'chan', 'chang', 'chao', 'che', 'chen', 'cheng', 'chong',
    'chou', 'chu', 'chua', 'chuai', 'chuan', 'chuang', 'chui', 'chun', 'chuo',
    
    'shi', 'sha', 'shai', 'shan', 'shang', 'shao', 'she', 'shei', 'shen', 'sheng',
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
  
    'wa', 'wai', 'wan', 'wang', 'wei', 'wen', 'weng', 'wo', 'wu',
    ];
  for(var i in syllables) {
    var e = syllables[i];
    this._syllableMap[e] = e;
  }
};

PinyinParser.prototype = {
  /**
   * Consonant(声母) lookup map that maps a lowercase consonant to itself.
   * _consonantMap 
   */
  _consonantMap: {},
  
  /**
   * Syllable lookup map that maps a lowercase syllable to itself.
   */
  _syllableMap: {},
  
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
   * @returns {Array} An array of segments. Each segment consists of an array of
   * syllables. For example, parse("fangan") = [["fang", "an"], ["fan", "gan"],
   * ["fan", "ga", "n"], ["fa", "n", "gan"]]
   */  
  parse: function(input) {
    var results = [];
    
    // Trims the leading and trailing "'".
    input = input.replace(/^'+|'+$/g, '');
    
    if (input == "") {
      return results;
    }
    
    var end = Math.min(input.length, SYLLALBLE_MAX_LENGTH);    
    for (; end>0; end--) {
      var key = input.substring(0, end);
      if ((key in this._syllableMap) || (key in this._consonantMap)) {
        var segments = [];
        segments.push([key]);
        if (end < input.length) {
          var subSegments = this.parse(input.substring(end));
          segments = this._appendsSubSegments(segments, subSegments);
        }
        results = results.concat(segments);
      }
    }
    
    // Sort the segments array. The segment with shorter length and fewer incomplete syllables
    // comes first.
    var self = this;
    results.sort(function(a, b) {
      if (a.length != b.length) {
        return a.length - b.length;
      } else {
        return self._incompleteSyllables(a) - self._incompleteSyllables(b);
      }
    });
    return results;
  },
  
  /**
   * Get cartesian product of two segments arrays.
   * Cartesian product A X B:
   * A X B = {(a, b) | a is member of A and b is member of B}.
   */
  _appendsSubSegments: function(segments, subSegments) {
    if (segments.length == 0 || subSegments.length == 0) {
      return subSegments;
    }
    var result = [];
    for (var i=0; i<segments.length; i++) {
      var segment = segments[i];
      for (var j=0; j<subSegments.length; j++) {
        result.push(segment.concat(subSegments[j]));
      }
    }
    return result;
  },
  
  /**
   * Get the number of incomplete syllables.
   *
   * An incomplete syllable starts with a single consonant(声母).
   * For example, the incomplete syllable of "hao" is "h".
   *
   * @param {Array} segement The segement array containing the syllables to be counted.
   * @returns {Integer} The number of incomplete syllables.
   */
  _incompleteSyllables: function(segment) {
    var count = 0;
    for (var i in segment) {
      if (segment[i] in this._consonantMap) {
        ++count;
      }
    }
    return count;
  }
};

var IMEngineBase = function() {
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
    path: "",
    
    mode: false,
    
    /**
     * Sends candidates to the IMEManager
     */
    sendCandidates: function(candidates){},
    
    /**
     * Sends pending symbols to the IMEManager.
     */
    sendPendingSymbols: function(symbols){},
    
    /**
     * Passes the clicked key to IMEManager for default action.
     * @param {number} keyCode The key code of an integer.
     */
    sendKey: function(keyCode){},
    
    /**
     * Sends the input string to the IMEManager.
     * @param {String} str The input string.
     */
    sendString: function(str){}
  },
  
  /**
   * Initialization.
   * @param {Glue} glue Glue object of the IMManager.
   */
  init: function(glue) {
    this._glue = glue;
  },
  /**
   * Destruction.
   */
  uninit: function() {
  },
  
  /**
   * Notifies when a keyboard key is clicked.
   * @param {number} keyCode The key code of an integer number.
   */
  click: function(keyCode) {
  },
  
  /**
   * Notifies when pending symbols need be cleared
   */
  empty: function() {
  },
  
  /**
   * Notifies when a candidate is selected.
   * @param {String} text The text of the candidate.
   * @param {Object} data User data of the candidate.
   */
  select: function(text, data) {
    this._glue.sendString(text);
  },
}

var IMEngine = function(splitter) {
  IMEngineBase.call(this);
  
  this._splitter = splitter;
};

IMEngine.prototype = {
  __proto__: IMEngineBase.prototype,
  
  _splitter: null,
  _inputTraitionalChinese: false,
  _spell: '',
  _startPosition: 0,
  
  // Enable IndexedDB
  _enableIndexedDB: false,

  // Tell the algorithm what's the longest term
  // it should attempt to match
  _kDBTermMaxLength: 8,

  // Buffer limit will force output the longest matching terms
  // if the length of the syllables buffer is reached.
  // This hides the fact that we are using a 2^n algorithm
  _kBufferLenLimit: 50,

  // Auto-suggest generates candidates that follows a selection
  // ㄊㄞˊㄅㄟˇ -> 台北, then suggest 市, 縣, 市長, 市立 ...
  _autoSuggestCandidates: true,
  
  // Whether to input traditional Chinese
  _inputTraditionalChinese: false,
  
  // Input method database
  _db: {
    simplified: null,  
    traditional: null
  },
  
  // The last selected text and syllables used to generate suggestions.
  _selectedText: '',
  _selectedSyllables: [],
  
  _pendingSymbols: "",
  _firstCandidate: '',
  _keypressQueue: [],
  _isWorking: false,
  
  _getCurrentDatabaseName: function() {
    return  this._inputTraditionalChinese ? 'traditional' : 'simplified';
  },
  
  _initDB: function(name, readyCallback) {
    var dbSettings = {
      enableIndexedDB: this._enableIndexedDB,
    };

    if (readyCallback) {
      dbSettings.ready = readyCallback;
    }
    
    var storeName = name == 'traditional' ? 'terms_tr' : 'terms';
    var jsonUrl = this._glue.path + (name == 'traditional' ? '/db-tr.json' : '/db.json');
    this._db[name] = new IMEngineDatabase(storeName, jsonUrl);
    this._db[name].init(dbSettings);  
  },
  
  _sendPendingSymbols: function () {
    debug('SendPendingSymbol: ' + this._pendingSymbols);
    this._glue.sendPendingSymbols(this._pendingSymbols);
  },
  
  _sendCandidates: function(candidates) {
    debug('SendCandidates: ' + JSON.stringify(candidates));
    this._firstCandidate = (candidates[0])? candidates[0][0] : '';
    this._glue.sendCandidates(candidates);
  },
    
  _start: function() {
    if (this._isWorking)
      return;
    this._isWorking = true;
    debug('Start keyQueue loop.');
    this._next();
  },

  _next: function() {
    debug('Processing keypress');
    
    var name = this._getCurrentDatabaseName();

    if (!this._db[name]) {
      debug('DB not initialized, defer processing.');
      this._initDB(this._next.bind(this));
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
      
      this._pendingSymbols = this._pendingSymbols.substring(0, this._pendingSymbols.length - 1);

      this._sendPendingSymbols();
      this._updateCandidateList(this._next.bind(this));
      return;
    }    

    // Select the first candidate if needed.
    if (code === KeyEvent.DOM_VK_RETURN
        || !this._isSymbol(code)
        || this._pendingSymbols.length >= this._kBufferLenLimit) {
      debug('Return key or non-bopomofo code');
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
  
  _isSymbol: function(code) {
    
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
  
  _appendNewSymbol: function(code) {
    var symbol = String.fromCharCode(code);
    this._pendingSymbols += symbol;
  },
  
  _lookup: function(query, type, callback) {
    var name = this._getCurrentDatabaseName();
    switch (type) {
      case 'sentence':
        this._db[name].getSentences(query, function getSentencesCallback(dbResults) {
          if (!dbResults) {
            callback([]);
            return;
          }
          var results = [];
          dbResults.forEach(function readSentence(sentence) {
            var str = '';
            sentence.forEach(function readTerm(term) {
              str += term.phrase;
            });
            if (results.indexOf(str) === -1)
              results.push(str);
          });
          callback(results);
        });
      break;
      case 'term':
        this._db[name].getTerms(query, function getTermsCallback(dbResults) {
          if (!dbResults) {
            callback([]);
            return;
          }
          var results = [];
          dbResults.forEach(function readTerm(term) {
            results.push(term.phrase);
          });
          callback(results);
        });
      break;
      case 'suggestion':
        this._db[name].getSuggestions(
          query[0], query[1],
          function gotSuggestions(dbResults) {
            if (!dbResults) {
              callback([]);
              return;
            }
            var results = [];
            dbResults.forEach(function readTerm(term) {
              results.push(term.phrase);
            });
            callback(results);
          }
        );
      break;
      default:
        debug('Error: no such lookup() type.');
      break;
    }
  },
  
  _updateCandidateList: function (callback) {
    debug('Update Candidate List.');
    var self = this;
    
    if (!this._pendingSymbols) {
      if (this._autoSuggestCandidates &&
          this._selectedSyllables.length) {
        debug('Buffer is empty; ' +
          'make suggestions based on select term.');
        var candidates = [];
        var texts = this._selectedText.split('');
        var selectedSyllables = this._selectedSyllables;
        this._lookup([selectedSyllables, texts], 'suggestion',
          function(suggestions) {
            suggestions.forEach(
              function suggestions_forEach(suggestion) {
                candidates.push(
                  [suggestion.substr(texts.length), selectedSyllables.join("'")]);
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
      syllablesForQuery = segments[0];
    }

    debug('Get term candidates for the entire buffer.');
    this._lookup(syllablesForQuery, 'term', function lookupCallback(terms) {
      terms.forEach(function readTerm(term) {
        candidates.push([term, syllablesForQuery.join("'")]);
      });

      if (self._pendingSymbols.length === 1) {
        debug('Only one syllable; skip other lookups.');

        if (!candidates.length) {
          // candidates unavailable; output symbols
          candidates.push([self._pendingSymbols, syllablesForQuery.join("'")]);
        }

        self._sendCandidates(candidates);
        callback();
        return;
      }

      debug('Lookup for sentences that make up from the entire buffer');
      var syllables = syllablesForQuery;
      self._lookup(syllables, 'sentence', function lookupCallback(sentences) {
        sentences.forEach(function readSentence(sentence) {
          // look for candidate that is already in the list
          var exists = candidates.some(function sentenceExists(candidate) {
            return (candidate[0] === sentence);
          });

          if (exists)
            return;

          candidates.push([sentence, syllables.join("'")]);
        });

        // The remaining candidates doesn't match the entire buffer
        // these candidates helps user find the exact character/term
        // s/he wants
        // The remaining unmatched syllables will go through lookup
        // over and over until the buffer is emptied.

        var i = Math.min(self._kDBTermMaxLength, syllablesForQuery.length);

        var findTerms = function lookupFindTerms() {
          debug('Lookup for terms that matches first ' + i + ' syllables.');

          var syllables = syllablesForQuery.slice(0, i);
          self._lookup(syllables, 'term', function lookupCallback(terms) {
            terms.forEach(function readTerm(term) {
              candidates.push([term, syllables.join("'")]);
            });

            if (i === 1 && !terms.length) {
              debug('The first syllable does not make up a word,' +
                ' output the symbol.');
              candidates.push(
                [syllables.join(''), syllables.join("'")]);
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

  /**
   * @Override
   */
  init: function(glue) {
    IMEngineBase.prototype.init.call(this, glue);
  },

  /**
   * @Override
   */
  uninit: function() {
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
   *@Override
   */
  click: function(keyCode) {
    IMEngineBase.prototype.click.call(this, keyCode);
        
    // Toggle between the modes of tranditioanal Chinese and simplified Chinese
    if(keyCode == -10 || keyCode == -11) {
      this._inputTraditionalChinese = !this._inputTraditionalChinese;
    }
    this._keypressQueue.push(keyCode);
    this._start();
  },

  /**
   * @Override
   */
  select: function(text, data) {
    IMEngineBase.prototype.select.call(this, text, data);

    var syllablesToRemove = data.split("'");
    if (this._pendingSymbols != "") {
      for (var i=0; i<syllablesToRemove.length; i++) {
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
   * @Override
   */
  empty: function() {
    var name = this._getCurrentDatabaseName();
    this._pendingSymbols = '';
    this._selectedText = '';
    this._selectedSyllables = [];
    this._sendPendingSymbols();
    this._isWorking = false;
    if (!this._db[name])
      this._initDB(name);
  }  
};

var DatabaseStorageBase = function() {
};

/**
 * DatabaseStorageBase status code enumeration.
 */
DatabaseStorageBase.StatusCode = {
  UNINITIALIZED: 0,   /* The storage isn't initilized.*/
  BUSY: 1,            /* The storage is busy.*/
  READY: 2,           /* The storage has been successfully initilized and is ready to use.*/
  ERROR: 3,           /* The storage is failed to initilized and cannot be used.*/
};

DatabaseStorageBase.prototype =  {
  _status: DatabaseStorageBase.StatusCode.UNINITIALIZED,
  
  /**
   * Get the status code of the storage.
   * @returns {DatabaseStorageBase.StatusCode} The status code.
   */
  getStatus: function() {
    return this._status;
  },
  
  isReady: function() {
    return this._status == DatabaseStorageBase.StatusCode.READY;
  },
  
  /**
   * Initialization.
   * @param {Function} callback Javascript function object that is called when the operation
   * is finished. The definition of callback is function callback(statusCode). The statusCode
   * parameter is of type DatabaseStorageBase.StatusCode that stores the status of the storage
   * after Initialization.
   */
  init: function(callback /*function callback(statusCode)*/) {
  },
  
  /**
   * Destruction.
   * @param {Function} callback Javascript function object that is called when the operation
   * is finished. The definition of callback is function callback().
   */  
  uninit: function(callback /*function callback()*/) {
  },
  
  /**
   * Get all iterms.
   * @param {Function} callback Javascript function object that is called when the operation
   * is finished. The definition of callback is function callback(homonymsArray). The homonymsArray
   * parameter is an array of Homonyms objects.
   */   
  getAllTerms: function(callback /*function callback(homonymsArray)*/) {
  },
  
  /**
   * Get iterm with given syllables string.
   * @param {String} syllablesStr The syllables string of the matched terms.
   * @param {Function} callback Javascript function object that is called when the operation
   * is finished. The definition of callback is function callback(homonymsArray). The homonymsArray
   * parameter is an array of Homonyms objects.
   */   
  getTermsBySyllables: function(syllablesStr, callback /*function callback(homonymsArray)*/) {
  },
  
  /**
   * Get iterms with given syllables string prefix.
   * @param {String} prefix The prefix of the syllables string .
   * @param {Function} callback Javascript function object that is called when the operation
   * is finished. The definition of callback is function callback(homonymsArray). The homonymsArray
   * parameter is an array of Homonyms objects.
   */   
  getTermsBySyllablesPrefix: function(prefix, callback /*function callback(homonymsArray)*/) {
  },  
  
  /**
   * Get iterm with given abbreviated syllables string. The given syllables could be partially abbreviated.
   * @param {String} abbreviated The partially abbreviated syllables string of the matched terms.
   * @param {Function} callback Javascript function object that is called when the operation
   * is finished. The definition of callback is function callback(homonymsArray). The homonymsArray
   * parameter is an array of Homonyms objects.
   */   
  getTermsByAbbreviatedSyllables: function(abbreviated, callback /*function callback(homonymsArray)*/) {
  },
  
  /**
   * Add a term to the storage.
   * @param {String} syllablesStr The syllables string of the term.
   * @param {Term} term The Term object of the term.
   * @param {Function} callback Javascript function object that is called when the operation
   * is finished. The definition of callback is function callback(). 
   */   
  addTerm: function(syllablesStr, term, callback /*function callback()*/) {
  },
  
  /**
   * Remove a term from the storage.
   * @param {String} syllablesStr The syllables string of the term.
   * @param {Term} term The Term object of the term.
   * @param {Function} callback Javascript function object that is called when the operation
   * is finished. The definition of callback is function callback(). 
   */  
  removeTerm: function(syllablesStr, term, callback /*function callback()*/) {  
  },
};

var JsonStorage = function(jsonUrl) {
  this._jsonUrl = jsonUrl;
};

JsonStorage.prototype = {
  // Inherits DatabaseStorageBase
  __proto__: DatabaseStorageBase.prototype,
  
  _dataArray: {},
  
  _jsonUrl: null,
  
  /**
   * @Override
   */
  init: function(callback /*function callback(statusCode)*/) {
    var self = this;
    function doCallback() {
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
        doCallback();
        return;
      }

      var response;
      if (xhr.responseType == 'json') {
        response = xhr.response;
      } else {
        try {
          response = JSON.parse(xhr.responseText);
        } catch (e) { }
      }

      if (typeof response !== 'object') {
        self._status = DatabaseStorageBase.StatusCode.ERROR;
        doCallback();
        return;
      }

      function toTerms(rawTerms) {
        var terms = [];
        for (var i=0; i<rawTerms.length; i++) {
          var rawTerm = rawTerms[i];
          terms.push(new Term(rawTerm[0], rawTerm[1]));
        }
        return terms;
      }
      
      // clone everything under response because it's readonly.
      for (var s in response) {
        self._dataArray[s] = new Homonyms(s, toTerms(response[s]));
      }
      xhr = null;
      self._status = DatabaseStorageBase.StatusCode.READY;
      doCallback();
    };

    xhr.send(null);    
  },
 
  /**
   * @Override
   */  
  uninit: function(callback) {
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
    this._dataArray = null;
    
    this._status = DatabaseStorageBase.StatusCode.UNINITIALIZED;
    doCallback();
  },
  
  /**
   * @Override
   */ 
  getAllTerms: function(callback /*function callback(homonymsArray)*/) {
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
    for (var s in this._dataArray) {
      homonymsArray.push(this._dataArray[s]);
    }
    
    doCallback();
  },
  
  /**
   * @Override
   */   
  getTermsBySyllables: function(syllablesStr, callback /*function callback(homonymsArray)*/) {
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
    
    if (syllablesStr in this._dataArray) {
      homonymsArray.push(this._dataArray[syllablesStr]);
    }
    
    doCallback();
  },

  /**
   * @Override
   */   
  getTermsBySyllablesPrefix: function(prefix, callback /*function callback(homonymsArray)*/) {
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
    
    for (var syllablesStr in this._dataArray) {
      if (syllablesStr.indexOf(prefix) == 0) {
        homonymsArray.push(this._dataArray[syllablesStr]);
      }
    }
    
    doCallback();    
  }, 

  /**
   * @Override
   */   
  getTermsByAbbreviatedSyllables: function(abbreviated, callback /*function callback(homonymsArray)*/) {
    var homonymsArray = [];
    function doCallback() {
      if (callback) {
        debug('JsonStorage#getTermsByAbbreviatedSyllables callback:' + JSON.stringify(homonymsArray));
        callback(homonymsArray);
      }
    }
    
    // Check if the storage is ready.
    if (!this.isReady()) {
      doCallback();
      return;
    }
    
    var matchRegEx = new RegExp(
       '^' + abbreviated.replace(/([^']+)/g, "$1[^']*"));
    
    for (var syllablesStr in this._dataArray) {
      var fullyAbbreviated = SyllableUtils.stringToAbbreviated(syllablesStr);
      if (matchRegEx.exec(syllablesStr)) {
        homonymsArray.push(this._dataArray[syllablesStr]);
      }
    }
    
    doCallback();     
  }
};

var IMEngineDatabase = function(storeName, jsonUrl) {
  var settings;

  /* name and version of IndexedDB */
  var kDBName = 'jspinyin';
  var kDBVersion = 2;
  
  /**
   * Dictionary words' total frequency.
   */
  var kDictTotalFreq = 1.0e8;

  var storage = new JsonStorage(jsonUrl);
  var iDB;

  var iDBCache = {};
  var cacheTimer;
  var kCacheTimeout = 10000;

  var self = this;

  var indexedDB = window.indexedDB ||
    window.webkitIndexedDB ||
    window.mozIndexedDB ||
    window.msIndexedDB;

  var IDBDatabase = window.IDBDatabase ||
    window.webkitIDBDatabase ||
    window.msIDBDatabase;

  var IDBKeyRange = window.IDBKeyRange ||
    window.webkitIDBKeyRange ||
    window.msIDBKeyRange;

  var IDBIndex = window.IDBIndex ||
    window.webkitIDBIndex ||
    window.msIDBIndex;

  /* ==== init functions ==== */

  var getTermsInDB = function(callback) {
    if (!indexedDB || // No IndexedDB API implementation
        IDBDatabase.prototype.setVersion || // old version of IndexedDB API
        window.location.protocol === 'file:') {  // bug 643318
      debug('IndexedDB is not available on this platform.');
      callback();
      return;
    }

    var req = indexedDB.open(kDBName, kDBVersion);
    req.onerror = function dbopenError(ev) {
      debug('Encounter error while opening IndexedDB.');
      callback();
    };

    req.onupgradeneeded = function dbopenUpgradeneeded(ev) {
      debug('IndexedDB upgradeneeded.');
      iDB = ev.target.result;

      // delete the old ObjectStore if present
      if (iDB.objectStoreNames.length !== 0) {
        iDB.deleteObjectStore('terms');
        iDB.deleteObjectStore('terms_tr');
      }

      // create ObjectStore
      var store = iDB.createObjectStore('terms', { keyPath: 'syllables' });
      store.createIndex(
        'constantSyllables', 'constantSyllables', { unique: false });
      var storeTr = iDB.createObjectStore('terms_tr', { keyPath: 'syllables' });
      storeTr.createIndex(
        'constantSyllables', 'constantSyllables', { unique: false });      

      // no callback() here
      // onupgradeneeded will follow by onsuccess event
      return;
    };

    req.onsuccess = function dbopenSuccess(ev) {
      debug('IndexedDB opened.');
      iDB = ev.target.result;
      callback();
    };
  };

  var populateDBFromJSON = function(callback) {
    var chunks = [];
    var chunk = [];
    var i = 0;
    
    storage.getAllTerms(function(homonymsArray) {
      for (var i=0; i<homonymsArray.length; i++) {
        var homonyms = homonymsArray[i];
        chunk.push(homonyms);
        i++;
        if (i > 2048) {
          chunks.push(chunk);
          chunk = [];
          i = 0;
        }
      }
      chunks.push(chunk);
      chunks.push(new Homonyms('_last_entry_', []));
      
      var addChunk = function() {
        debug('Loading data chunk into IndexedDB, ' +
            (chunks.length - 1) + ' chunks remaining.');
  
        var transaction = iDB.transaction(storeName, 'readwrite');
        var store = transaction.objectStore(storeName);
  
        transaction.onerror = function putError(ev) {
          debug('Problem while populating DB with JSON data.');
        };
  
        transaction.oncomplete = function putComplete() {
          if (chunks.length) {
            setTimeout(addChunk, 0);
          } else {
            setTimeout(callback, 0);
          }
        };
  
        var chunk = chunks.shift();
        for (i in chunk) {
          var homonyms = chunk[i];
          var constantSyllables = homonyms.abbreviatedSyllablesString;
          store.put({
            syllables: homonyms.syllablesString,
            constantSyllables: constantSyllables,
            terms: homonyms.terms
          });
        }
      };
  
      setTimeout(addChunk, 0);      
    });
  };

  var getTermsJSON = function imedb_getTermsJSON(callback) {
    storage.init(callback);
  };

  /* ==== helper functions ==== */

  /*
  * Math function that return all possible compositions of
  * a given natural number
  * callback will be called 2^(n-1) times.
  *
  * ref: http://en.wikipedia.org/wiki/Composition_(number_theory)#Examples
  * also: http://stackoverflow.com/questions/8375439
  *
  */
  var compositionsOf = function imedb_compositionsOf(n, callback) {
    var x, a, j;
    x = 1 << n - 1;
    while (x--) {
      a = [1];
      j = 0;
      while (n - 1 > j) {
        if (x & (1 << j)) {
          a[a.length - 1]++;
        } else {
          a.push(1);
        }
        j++;
      }
      callback.call(this, a);
    }
  };

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

  var getTermsFromConstantSyllables = function (constants, callback) {
    debug('Getting terms with constantSyllables: ' + constants);
    
    if (iDBCache['CONSTANT:' + constants]) {
      debug('Found constantSyllables result in iDBCache.');
      callback(iDBCache['CONSTANT:' + constants]);
      return;
    }

    var store = iDB.transaction(storeName, 'readonly')
      .objectStore(storeName);
    if (IDBIndex.prototype.getAll) {
      // Mozilla IndexedDB extension
      var req = store.index('constantSyllables').getAll(
        IDBKeyRange.only(constants));
    } else {
      var req = store.index('constantSyllables').openCursor(
        IDBKeyRange.only(constants));
    }
    req.onerror = function getdbError(ev) {
      debug('Database read error.');
      callback(false);
    };
    var constantResult = [];
    req.onsuccess = function getdbSuccess(ev) {
      if (ev.target.result && ev.target.result.constructor == Array) {
        constantResult = ev.target.result;
        cacheSetTimeout();
        iDBCache['CONSTANT:' + constants] = constantResult;
        callback(constantResult);
        return;
      }
      var cursor = ev.target.result;
      if (!cursor) {
        cacheSetTimeout();
        iDBCache['CONSTANT:' + constants] = constantResult;
        callback(constantResult);
        return;
      }
      iDBCache[cursor.value.syllables] = cursor.value.terms;
      constantResult.push(cursor.value);
      cursor.continue();
    };
  };

  /* ==== init ==== */

  this.init = function (options) {
    settings = options;

    var ready = function() {
      debug('Ready.');
      if (settings.ready)
        settings.ready();
    };

    if (!settings.enableIndexedDB) {
      debug('IndexedDB disabled; Downloading JSON ...');
      getTermsJSON(ready);
      return;
    }

    debug('Probing IndexedDB ...');
    getTermsInDB(function getTermsInDBCallback() {
      if (!iDB) {
        debug('IndexedDB not available; Downloading JSON ...');
        getTermsJSON(ready);
        return;
      }

      var transaction = iDB.transaction(storeName);      
      var req = transaction.objectStore(storeName).get('_last_entry_');
      req.onsuccess = function(ev) {
          if (ev.target.result !== undefined) {
            ready();
            return;
          }
  
          debug('IndexedDB is supported but empty; Downloading JSON ...');
          getTermsJSON(function getTermsInDBCallback() {
            if (!storage.isReady()) {
              debug('JSON failed to download.');
              return;
            }
  
            debug(
              'JSON loaded,' +
              'IME is ready to use while inserting data into db ...'
            );
            populateDBFromJSON(function getTermsInDBCallback() {
              debug('IndexedDB ready and switched to indexedDB backend.');
            });
          });
        };
    });
  };

  /* ==== uninit ==== */

  this.uninit = function imedb_uninit() {
    if (iDB)
      iDB.close();
    storage.uninit();
  };

  /* ==== db lookup functions ==== */

  this.getSuggestions =
    function(syllables, text, callback) {
    if (!storage.isReady() && !iDB) {
      debug('Database not ready.');
      callback(false);
      return;
    }

    var syllablesStr = syllables.join("'").replace(/ /g , '');
    var result = [];
    var matchTerm = function matchTerm(term) {
      if (term.phrase.substr(0, textStr.length) !== textStr)
        return;
      if (term.phrase == textStr)
        return;
      result.push(term);
    };
    var processResult = function processResult(r) {
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
      return result;
    };
    var matchRegEx = new RegExp(
       '^' + syllablesStr.replace(/([^']+)/g, "$1[^']*"));
    var textStr = text.join('');
    var result = [];

    debug('Get suggestion for ' + textStr + '.');

    if (typeof iDBCache['SUGGESTION:' + textStr] !== 'undefined') {
      debug('Found in iDBCache.');
      cacheSetTimeout();
      callback(iDBCache['SUGGESTION:' + textStr]);
      return;
    }

    if (storage.isReady()) {
      debug('Lookup in JSON.');
      storage.getTermsBySyllablesPrefix(syllablesStr, function(homonymsArray) {        
        for (var i=0; i<homonymsArray.length; i++) {
          var homonyms = homonymsArray[i];
          homonyms.terms.forEach(matchTerm);
        }
        if (result.length) {
          result = processResult(result);
        } else {
          result = false;
        }
        cacheSetTimeout();
        iDBCache['SUGGESTION:' + textStr] = result;
        callback(result);        
      });
      return;
    }

    debug('Lookup in IndexedDB.');

    var findSuggestionsInIDB = function findSuggestionsInIDB() {
      var upperBound = syllablesStr.substr(0, syllablesStr.length - 1) +
        String.fromCharCode(
          syllablesStr.substr(syllablesStr.length - 1).charCodeAt(0) + 1);

      debug('Do IndexedDB range search with lowerBound ' + syllablesStr +
        ' and upperBound ' + upperBound + '.');

      var store = iDB.transaction(storeName, 'readonly')
        .objectStore(storeName);
      if (IDBIndex.prototype.getAll) {
        // Mozilla IndexedDB extension
        var req = store.getAll(
          IDBKeyRange.bound(syllablesStr, upperBound, true, true));
      } else {
        var req = store.openCursor(
          IDBKeyRange.bound(syllablesStr, upperBound, true, true));
      }
      req.onerror = function getdbError(ev) {
        debug('Database read error.');
        callback(false);
      };
      var finish = function index_finish() {
        if (result.length) {
          result = processResult(result);
        } else {
          result = false;
        }
        cacheSetTimeout();
        iDBCache['SUGGESTION:' + textStr] = result;
        callback(result);
      };
      req.onsuccess = function getdbSuccess(ev) {
        if (ev.target.result && ev.target.result.constructor == Array) {
          ev.target.result.forEach(function index_forEach(value) {
            value.terms.forEach(matchTerm);
          });
          finish();
          return;
        }
        var cursor = ev.target.result;
        if (!cursor) {
          finish();
          return;
        }
        cursor.value.terms.forEach(matchTerm);
        cursor.continue();
      };
    };

    debug('Attempt to resolve the complete syllables of ' + textStr +
      ' from ' + syllablesStr + '.');
    var constants = syllablesStr.replace(/([^'])[^']*/g, '$1');
    getTermsFromConstantSyllables(
      constants, function gotTerms(constantResult) {
        if (!constantResult) {
          callback(false);
          return;
        }
        constantResult.some(function(obj) {
          if (!matchRegEx.exec(obj.syllables))
            return false;
          return obj.terms.some(function term_forEach(term) {
            if (term[0] === textStr) {
              debug('Found ' + obj.syllables);
              syllablesStr = obj.syllables;
              return true;
            }
            return false;
          });
        });
        findSuggestionsInIDB();
      }
    );
  },

  this.getTerms = function (syllables, callback) {
    if (!storage.isReady() && !iDB) {
      debug('Database not ready.');
      callback(false);
      return;
    }

    var syllablesStr = syllables.join("'").replace(/ /g , '');
    var matchRegEx = new RegExp(
       '^' + syllablesStr.replace(/([^']+)/g, "$1[^']*"));
    debug('Get terms for ' + syllablesStr + '.');

    var processResult = function processResult(r) {
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
      return result;
    };
    
    if (typeof iDBCache[syllablesStr] !== 'undefined') {
      debug('Found in iDBCache.');
      cacheSetTimeout();
      callback(iDBCache[syllablesStr]);
      return;
    }

    if (storage.isReady()) {
      debug('Lookup in JSON.');
      storage.getTermsByAbbreviatedSyllables(syllablesStr, function(homonymsArray) {
        var result = [];
        for (var i=0; i<homonymsArray.length; i++) {
          var homonyms = homonymsArray[i];
          result = result.concat(homonyms.terms);          
        }
        if (result.length) {
          result = processResult(result);
        } else {
          result = false;
        }
        cacheSetTimeout();
        iDBCache[syllablesStr] = result;
        callback(result);        
      });
      return;
    }

    debug('Lookup in IndexedDB.');
    debug('Do range search in IndexedDB.');
    var constants = syllablesStr.replace(/([^'])[^']*/g, '$1');
    getTermsFromConstantSyllables(
      constants,
      function gotTerms(constantResult) {
        var result = [];
        if (!constantResult) {
          callback(false);
          return;
        }
        constantResult.forEach(function(obj) {
          if (matchRegEx.exec(obj.syllables))
            result = result.concat(obj.terms);
        });
        if (result.length) {
          result = processResult(result);
        } else {
          result = false;
        }
        cacheSetTimeout();
        iDBCache[syllablesStr] = result;
        callback(result);
      }
    );
  };

  this.getTermWithHighestScore =
  function imedb_getTermWithHighestScore(syllables, callback) {
    self.getTerms(syllables, function getTermsCallback(terms) {
      if (!terms) {
        callback(false);
        return;
      }
      callback(terms[0]);
    });
  }

  this.getSentences = function imedb_getSentences(syllables, callback) {
    var sentences = [];
    var n = 0;

    compositionsOf.call(
      this,
      syllables.length,
      /* This callback will be called 2^(n-1) times */
      function compositionsOfCallback(composition) {
        var str = [];
        var start = 0;
        var i = 0;

        var next = function composition_next() {
          if (composition.length === i) {
            finish();
            return;
          }
          var numOfWord = composition[i];
          i++;
          self.getTermWithHighestScore(
            syllables.slice(start, start + numOfWord),
            function getTermWithHighestScoreCallback(term) {
              if (!term && numOfWord > 1) {
                finish();
                return;
              }
              if (!term) {
                var syllable =
                  syllables.slice(start, start + numOfWord).join('');
                debug('Syllable ' + syllable +
                  ' does not made up a word, insert symbol.');
                term = [syllable, 0];
              }

              str.push(term);
              start += numOfWord;
              next();
            }
          );
        };

        var finish = function compositionFinish() {
          // complete; this composition does made up a sentence
          if (start === syllables.length)
            sentences.push(str);

          if (++n === (1 << (syllables.length - 1))) {
            cacheSetTimeout();

            sentences = sentences.sort(function sortSentences(a, b) {
              var scoreA = 1;

              a.forEach(function countScoreA(term) {
                scoreA *= term[1] / kDictTotalFreq;
              });

              var scoreB = 1;
              b.forEach(function countScoreB(term) {
                scoreB *= term[1] / kDictTotalFreq;
              });

              return (scoreB - scoreA);
            });

            callback(sentences);
          }
        };

        next();
      }
    ); // compositionsOf.call
  };
};

var jspinyin = new IMEngine(new PinyinParser());

// Expose jspinyin as an AMD module
if (typeof define === 'function' && define.amd)
  define('jspinyin', [], function() { return jspinyin; });

// Expose to IMEManager if we are in Gaia homescreen
if (typeof IMEManager !== 'undefined')
  IMEManager.IMEngines.jspinyin = jspinyin;

})();