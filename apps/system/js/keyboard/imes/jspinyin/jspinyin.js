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
  
function PhraseDictionary() {
  var phraseList = [];
  var phraseList2 = [];
  this.lookUp = function(queryList,mode) {
    var result = [];
    var regExpList = queryList.map(function(q)  RegExp(q.pattern));
    
    if (mode) {
     for (var i = 0; i < phraseList.length; i++) {
        for (var j = 0; j < regExpList.length; j++) {
          if (regExpList[j].test(phraseList[i].pronunciation)) {
            result.push({
                phrase: phraseList[i].phrase,
                prefix: queryList[j].prefix
            });
            break;
          }
        }
      }
    } else {
      for (var i = 0; i < phraseList2.length; i++) {
        for (var j = 0; j < regExpList.length; j++) {
            if (regExpList[j].test(phraseList2[i].pronunciation)) {
              result.push({
                phrase: phraseList2[i].phrase,
                prefix: queryList[j].prefix
            });
            break;
          }
        }
      }
    } 
    return result;
  };
  
  this.addPhrases = function(phrases) {
    for (var i = 0; i < phrases.length; i++) {
      phraseList.push(phrases[i]);
    }
  };
  
  this.addPhrases2 = function(phrases) {
    for (var i = 0; i < phrases.length; i++) {
      phraseList2.push(phrases[i]);
    }
  };
  
  this.uninit = function() {
    phraseList = null;
    phraseList2 = null;
  };
}

function SyllableSplitter() {
  var syllables = [
  'ba', 'bai', 'ban', 'bang', 'bao', 'bei', 'ben', 'beng', 'bi', 'bian',
  'biao', 'bie', 'bin', 'bing', 'bo', 'bu',

  'ca', 'cai', 'can', 'cang', 'cao', 'ce', 'cen', 'ceng', 'cha', 'chai',
  'chan', 'chang', 'chao', 'che', 'chen', 'cheng', 'chong', 'chou', 'chu',
  'chua', 'chuai', 'chuan', 'chuang', 'chui', 'chun', 'chuo', 'cong',
  'cou', 'cu', 'cuan', 'cui', 'cun', 'cuo',

  'da', 'dai', 'dan', 'dang', 'dao', 'de', 'dei', 'deng', 'di', 'dian',
  'diao', 'die', 'ding', 'diu', 'dong', 'dou', 'du', 'duan', 'dui', 'dun',
  'duo',

  'fa', 'fan', 'fang', 'fei', 'fen', 'feng', 'fo', 'fou', 'fu',

  'ga', 'gai', 'gan', 'gang', 'gao', 'ge', 'gei', 'gen', 'geng', 'gong',
  'gou', 'gu', 'gua', 'guai', 'guan', 'guang', 'gui', 'gun', 'guo',

  'ha', 'hai', 'han', 'hang', 'hao', 'he', 'hei', 'hen', 'heng', 'hong',
  'hou', 'hu', 'hua', 'huai', 'huan', 'huang', 'hui', 'hun', 'huo',

  'ji', 'jia', 'jian', 'jiang', 'jiao', 'jie', 'jin', 'jing', 'jiong',
  'jiu', 'ju', 'juan', 'jue', 'jun',

  'ka', 'kai', 'kan', 'kang', 'kao', 'ke', 'ken', 'keng', 'kong', 'kou',
  'ku', 'kua', 'kuai', 'kuan', 'kuang', 'kui', 'kun', 'kuo',

  'la', 'lai', 'lan', 'lang', 'lao', 'le', 'lei', 'leng', 'li', 'lia',
  'lian', 'liang', 'liao', 'lie', 'lin', 'ling', 'liu', 'long', 'lou',
  'lu', 'lv', 'luan', 'lve', 'lun', 'luo',

  'ma', 'mai', 'man', 'mang', 'mao', 'me', 'mei', 'men', 'meng', 'mi', 'mian',
  'miao', 'mie', 'min', 'ming', 'miu', 'mo', 'mou', 'mu',

  'na', 'nai', 'nan', 'nang', 'nao', 'ne', 'nei', 'nen', 'neng', 'ni', 'nian',
  'niang', 'niao', 'nie', 'nin', 'ning', 'niu', 'nong', 'nou', 'nu', 'nv',
  'nuan', 'nve', 'nuo',

  'pa', 'pai', 'pan', 'pang', 'pao', 'pei', 'pen', 'peng', 'pi', 'pian',
  'piao', 'pie', 'pin', 'ping', 'po', 'pou', 'pu',

  'qi', 'qia', 'qian', 'qiang', 'qiao', 'qie', 'qin', 'qing', 'qiong', 'qiu',
  'qu', 'quan', 'que', 'qun',

  'ran', 'rang', 'rao', 're', 'ren', 'reng', 'ri', 'rong', 'rou', 'ru',
  'ruan', 'rui', 'run', 'ruo',

  'sa', 'sai', 'san', 'sang', 'sao', 'se', 'sen', 'seng', 'sha', 'shai',
  'shan', 'shang', 'shao', 'she', 'shei', 'shen', 'sheng', 'shou', 'shu',
  'shua', 'shuai', 'shuan', 'shuang', 'shui', 'shun', 'shuo', 'song',
  'sou', 'su', 'suan', 'sui', 'sun', 'suo',

  'ta', 'tai', 'tan', 'tang', 'tao', 'te', 'teng', 'ti', 'tian', 'tiao',
  'tie', 'ting', 'tong', 'tou', 'tu', 'tuan', 'tui', 'tun', 'tuo',

  'wa', 'wai', 'wan', 'wang', 'wei', 'wen', 'weng', 'wo', 'wu',

  'xi', 'xia', 'xian', 'xiang', 'xiao', 'xie', 'xin', 'xing', 'xiong', 'xiu',
  'xu', 'xuan', 'xue', 'xun',

  'ya', 'yan', 'yang', 'yao', 'ye', 'yi', 'yin', 'ying', 'yong', 'you', 'yu',
  'yuan', 'yue', 'yun',

  'za', 'zai', 'zan', 'zang', 'zao', 'ze', 'zei', 'zen', 'zeng', 'zha', 'zhai',
  'zhan', 'zhang', 'zhao', 'zhe', 'zhei', 'zhen', 'zheng', 'zhong', 'zhou',
  'zhu', 'zhua', 'zhuai', 'zhuan', 'zhuang', 'zhui', 'zhun', 'zhuo', 'zong',
  'zou', 'zu', 'zuan', 'zui', 'zun', 'zuo',

  'zhi', 'chi', 'shi', 'ri', 'zi', 'ci', 'si',

  'a', 'ai', 'an', 'ang', 'ao',

  'e', 'ei', 'en', 'eng', 'er',

  'o', 'ou'
  ];
  var initials = 'b p m f d t n l g k h j q x zh ch sh r z c s y w'.split(' ');

  var startsWith = function(text, prefix) {
    return text.indexOf(prefix) == 0;
  };

  var endsWith = function(text, suffix) {
    return text.lastIndexOf(suffix) == text.length - 1;
  }

  var ensure = function(a, func, b) {
    return func(a, b) == true;
  }

  function guessFirstSyllable(input) {
    var possibleAnswers = [];
    if (ensure(input, startsWith, "'")) {
      possibleAnswers.push("'");
    }

    if (possibleAnswers.length == 0) {
      for (var i = 0; i < syllables.length; i++) {
        var answer = syllables[i];
        if (input.indexOf(answer) == 0) {
          if (/[aeiuv]$/.test(answer) &&
              ensure(input, startsWith, answer + 'n')) continue;
          if (/[aeiuv]n$/.test(answer) &&
              ensure(input, startsWith, answer + "g'")) continue;
          if (ensure(answer, endsWith, 'e') &&
              ensure(input, startsWith, answer + 'r')) continue;
          possibleAnswers.push(syllables[i]);
        }
      }
    }

    if (possibleAnswers.length == 0) {
      for (var i = 0; i < initials.length; i++) {
        if (input.indexOf(initials[i]) == 0) {
          possibleAnswers.push(initials[i]);
          break;
        }
      }
    }
    return possibleAnswers;
  }

  this.parse = function(input) {
    function split(rawInput) {
      if (rawInput != '') {
        var prefix = '', input = rawInput;
        var possibleFirstSyllables = guessFirstSyllable(input);
        var currentTail = tail;
        for (var i = 0; i < possibleFirstSyllables.length; i++) {
          var firstSyllable = possibleFirstSyllables[i];
          tail = {syllable: firstSyllable, parent: currentTail};
          split(input.substring(firstSyllable.length));
        }
      } else {
        var currentSegment = tail;
        var path = [];
        while (currentSegment != null) {
          path.unshift(currentSegment.syllable);
          currentSegment = currentSegment.parent;
        }
        solutions.push(path);
      }
    }
    var solutions = [];
    var tail = null;
    split(input);
    return solutions;
  }
}

function IMEManagerGlue() {
  this.path = "";
}

function IMEngineBase() {
}

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
   * @param {String} type The type of the candidate.
   */
  select: function(text, type) {
    this._glue.sendString(text);
  },
}

function IMEngine(dictionary, splitter) {
  IMEngineBase.call(this);
  
  this._dictionary = dictionary;
  this._splitter = splitter;
}

IMEngine.prototype = {
  __proto__: IMEngineBase.prototype,
  
  _dictionary: null,
  _splitter: null,
  _mode: true,
  _spell: '',
  _startPosition: 0,
  
  // Enable IndexedDB
  _enableIndexedDB: true,

  // Tell the algorithm what's the longest term
  // it should attempt to match
  _kDBTermMaxLength: 8,

  // Buffer limit will force output the longest matching terms
  // if the length of the syllables buffer is reached.
  // This hides the fact that we are using a 2^n algorithm
  _kBufferLenLimit: 50,

  // Auto-complete allow user to do this:
  // ㄊㄞˊㄅ -> ㄊㄞˊㄅ* -> 台北
  // or ㄊㄅ -> ㄊ*ㄅ* -> 台北 when incompleteMatching is also true
  _autocompleteLastSyllables: true,

  // Auto-suggest generates candidates that follows a selection
  // ㄊㄞˊㄅㄟˇ -> 台北, then suggest 市, 縣, 市長, 市立 ...
  _autoSuggestCandidates: true,
  
  _db: null, 
  
  _selectedText: '',
  _selectedSyllables: [],
  _syllablesInBuffer: [''],
  _firstCandidate: '',
  _keypressQueue: [],
  _isWorking: false,
  
  _buildQueryList: function(solutions, stopPosition) {
    var queryList = [];
    for (var i = 0; i < solutions.length; i++) {
      var solution = solutions[i];
      var solutionPattern = '';
      var solutionPrefix = '';

      for (var j = 0; j < solution.length; j++) {
        var segment = solution[j];
        solutionPrefix += segment;
        if (solutionPrefix.length > stopPosition) {
          solutionPattern = '';
          break;
        }

        if (segment != "'") {
          if (j > 0) {
            solutionPattern += "'";
          }

          if (/^([bpmfdtnlgkhjqxryw]|[zcs]h?)/.test(segment)) {
            solutionPattern += (segment + '[a-z]*[0-9]?');
          } else {
            solutionPattern += (segment + '[0-9]?');
          }
          if (solutionPrefix.length == stopPosition) {
            break;
          }
        }
      }
      if (solutionPattern != '') {
        queryList.push({
            prefix: solutionPrefix,
            pattern: '^' + solutionPattern + '$'
        });
      }
    }
    return queryList;
  },
  
  _showChoices: function(choices) {
    var prefix = [];
    this._glue.sendCandidates(
      prefix.concat(
        choices.map(
          function(item) {return [item.phrase, item.prefix]}
        )
      )
    );
  },

  _refreshChoices: function(mode) {
    var solutions = this._splitter.parse(this._spell.substring(this._startPosition));

    var stopPositionSet = {};
    for (var i = 0; i < solutions.length; i++) {
      var pos = 0;
      var solution = solutions[i];
      for (var j = 0; j < solution.length; j++) {
        pos += solution[j].length;
        stopPositionSet[pos] = true;
      }
    }
    var unsortedStopPositionList = [];
    for (var pos in stopPositionSet) {
      unsortedStopPositionList.push(pos);
    }
    var stopPositionList = unsortedStopPositionList.sort();
    var candidates = [];
    for (var i = stopPositionList.length - 1; i >= 0; i--) {
      var queryList = this._buildQueryList(solutions, stopPositionList[i]);
      candidates = candidates.concat(dictionary.lookUp(queryList,mode));
    }
    this._showChoices(candidates);
    this._sendPendingSymbols();
  },
   
  _initDB: function(readyCallback) {
    var dbSettings = {
      wordsJSON: this._glue.path + '/words.json',
      phrasesJSON: this._glue.path + '/phrases.json',
      enableIndexedDB: this._enableIndexedDB
    };

    if (readyCallback)
      dbSettings.ready = readyCallback;

    this._db = new IMEngineDatabase();
    this._db.init(dbSettings);
  },
  
  _sendPendingSymbols: function () {
    debug('SendPendingSymbol: ' + this._syllablesInBuffer.join(','));
    var symbols = this._syllablesInBuffer.join('').replace(/\*/g, '');
    this._glue.sendPendingSymbols(symbols);
  },
  
  _sendCandidates: function(candidates) {
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

    if (!this._db) {
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
      // This is a select function operation after selecting suggestions
      this._sendPendingSymbols();
      this._updateCandidateList(this._next.bind(this));
      return;
    }

    if (code < 0) {
      // This is a select function operation
      var i = code * -1;
      dump('Removing ' + (code * -1) + ' syllables from buffer.');

      while (i--) {
        this._syllablesInBuffer.shift();
      }

      if (!this._syllablesInBuffer.length) {
        this._syllablesInBuffer = [''];
      }

      this._sendPendingSymbols();
      this._updateCandidateList(this._next.bind(this));
      return;
    }

    debug('key code: ' + code);

    if (code === KeyEvent.DOM_VK_RETURN) {
      debug('Return Key');
      if (!this._firstCandidate) {
        debug('Default action.');
        // pass the key to IMEManager for default action
        this._glue.sendKey(code);
        this._next();
        return;
      }

      // candidate list exists; output the first candidate
      debug('Sending first candidate.');
      this._glue.sendString(this._firstCandidate);
      this._selectedText = this._firstCandidate;
      this._selectedSyllables = [].concat(this._syllablesInBuffer);
      if (!this._selectedSyllables[this._selectedSyllables.length - 1])
        this._selectedSyllables.pop();
      this._keypressQueue.push(selectedSyllables.length * -1);
      this._next();
      return;
    }

    if (code === KeyEvent.DOM_VK_BACK_SPACE) {
      debug('Backspace key');
      if (!this._syllablesInBuffer.join('')) {
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

      if (!this._getLastSyllable()) {
        // the last syllable is empty
        // remove the last symbol in the last syllable in buffer
        debug('Remove last syllable.');
        this._syllablesInBuffer.pop();
      }

      debug('Remove one symbol.');
      debug('this._getLastSyllable(): ' + JSON.stringify(this._getLastSyllable()));
      this._syllablesInBuffer[this._syllablesInBuffer.length - 1] =
        this._getLastSyllable().replace(/.(\*?)$/, '$1').replace(/^\*$/, '');

      if (!this._getLastSyllable() && this._syllablesInBuffer.length !== 1)
        this._syllablesInBuffer.pop();

      this._sendPendingSymbols();
      this._updateCandidateList(this._next.bind(this));
      return;
    }

    if (!this._isSymbol(code)) {
      debug('Non-bopomofo code');

      if (this._firstCandidate && this._syllablesInBuffer.join('') !== '') {
        // candidate list exists; output the first candidate
        debug('Sending first candidate.');
        this._glue.sendString(this._firstCandidate);
        this._sendCandidates([]);
        this.empty();
        // no return here
      }

      if (this._firstCandidate) {
        debug('Default action; remove suggestion panel.');
        this._glue.sendKey(code);
        this._sendCandidates([]);
        this._next();
      }

      //pass the key to IMEManager for default action
      debug('Default action.');
      this._glue.sendKey(code);
      this._next();
      return;
    }

    var symbol = String.fromCharCode(code);

    debug('Processing symbol: ' + symbol);

    // add symbol to pendingSymbols
    this._appendNewSymbol(code);

    if (this._kBufferLenLimit &&
      this._syllablesInBuffer.length >= this._kBufferLenLimit) {
      // syllablesInBuffer is too long; find a term and sendString()
      debug('Buffer exceed limit');
      var i = this._syllablesInBuffer.length - 1;

      var findTerms = function() {
        debug('Find term for first ' + i + ' syllables.');

        var syllables = this._syllablesInBuffer.slice(0, i);
        lookup(syllables, 'term', function lookupCallback(candidates) {
          if (i !== 1 && !candidates[0]) {
            // not found, keep looking
            i--;
            findTerms();
            return;
          }

          debug('Found.');

          // sendString
          this._glue.sendString(
            candidates[0] ||
            this._syllablesInBuffer.slice(0, i).join('').replace(/\*/g, '')
          );

          // remove syllables from buffer
          while (i--) {
            this._syllablesInBuffer.shift();
          }

          this._sendPendingSymbols();

          this._updateCandidateList(this_next.bind(this));
        });
      };

      findTerms();
      return;
    }

    this._sendPendingSymbols();
    this._updateCandidateList(this._next.bind(this));
  },
  
  _getLastSyllable: function() {
    return this._syllablesInBuffer[this._syllablesInBuffer.length - 1];
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
    var syllable = this._syllablesInBuffer[this._syllablesInBuffer.length - 1];
    var symbol = String.fromCharCode(code);
    var tmp = this._splitter.parse(syllable + symbol);
    var newSyllables = tmp[tmp.length - 1];
    debug('this._syllablesInBuffer: ' + JSON.stringify(this._syllablesInBuffer), true);
    debug('syllable: ' + syllable + symbol, true);
    if (newSyllables.length == 0) {
      this._syllablesInBuffer.push('');
    } else if (newSyllables.length > 0) {
      this._syllablesInBuffer[this._syllablesInBuffer.length - 1] = newSyllables[0];
    }
    if (newSyllables.length > 1) {
      this._syllablesInBuffer.push(newSyllables[1]);
    }
  },
  
  _lookup: function(query, type, callback) {
    switch (type) {
      case 'sentence':
        this._db.getSentences(query, function getSentencesCallback(dbResults) {
          if (!dbResults) {
            callback([]);
            return;
          }
          var results = [];
          dbResults.forEach(function readSentence(sentence) {
            var str = '';
            sentence.forEach(function readTerm(term) {
              str += term[0];
            });
            if (results.indexOf(str) === -1)
              results.push(str);
          });
          callback(results);
        });
      break;
      case 'term':
        this._db.getTerms(query, function getTermsCallback(dbResults) {
          if (!dbResults) {
            callback([]);
            return;
          }
          var results = [];
          dbResults.forEach(function readTerm(term) {
            results.push(term[0]);
          });
          callback(results);
        });
      break;
      case 'suggestion':
        this._db.getSuggestions(
          query[0], query[1],
          function gotSuggestions(dbResults) {
            if (!dbResults) {
              callback([]);
              return;
            }
            var results = [];
            dbResults.forEach(function readTerm(term) {
              results.push(term[0]);
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
    
    if (!this._syllablesInBuffer.join('').length) {
      if (this._autoSuggestCandidates &&
          this._selectedSyllables.length) {
        debug('Buffer is empty; ' +
          'make suggestions based on select term.');
        var candidates = [];
        var texts = this._selectedText.split('');
        this._lookup([this._selectedSyllables, texts], 'suggestion',
          function(suggestions) {
            suggestions.forEach(
              function suggestions_forEach(suggestion) {
                candidates.push(
                  [suggestion.substr(texts.length), 'suggestion']);
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
    var syllablesForQuery = [].concat(this._syllablesInBuffer);

    if (!syllablesForQuery[syllablesForQuery.length - 1])
      syllablesForQuery.pop();

    debug('Get term candidates for the entire buffer.');
    this._lookup(syllablesForQuery, 'term', function lookupCallback(terms) {
      terms.forEach(function readTerm(term) {
        candidates.push([term, 'whole']);
      });

      if (self._syllablesInBuffer.length === 1) {
        debug('Only one syllable; skip other lookups.');

        if (!candidates.length) {
          // candidates unavailable; output symbols
          candidates.push([self._syllablesInBuffer.join('').replace(/\*/g, ''), 'whole']);
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

          candidates.push([sentence, 'whole']);
        });

        // The remaining candidates doesn't match the entire buffer
        // these candidates helps user find the exact character/term
        // s/he wants
        // The remaining unmatched syllables will go through lookup
        // over and over until the buffer is emptied.

        var i = Math.min(self._kDBTermMaxLength, self._syllablesInBuffer.length - 1);

        var findTerms = function lookupFindTerms() {
          debug('Lookup for terms that matches first ' + i + ' syllables.');

          var syllables = syllablesForQuery.slice(0, i);

          self._lookup(syllables, 'term', function lookupCallback(terms) {
            terms.forEach(function readTerm(term) {
              candidates.push([term, 'term']);
            });

            if (i === 1 && !terms.length) {
              debug('The first syllable does not make up a word,' +
                ' output the symbol.');
              candidates.push(
                [syllables.join('').replace(/\*/g, ''), 'symbol']);
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
    this._dictionary.uninit();
    this._dictionary = null;
    this._splitter = null;
    if (this._db) {
      this._db.uninit();
      this._db = null;
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
      this._mode = !this._mode;
    }
    this._keypressQueue.push(keyCode);
    this._start();
  },

  /**
   * @Override
   */
  select: function(text, type) {
    IMEngineBase.prototype.select.call(this, text, type);

    var numOfSyllablesToRemove = text.length;
    if (type == 'symbol')
      numOfSyllablesToRemove = 1;
    if (type == 'suggestion')
      numOfSyllablesToRemove = 0;

    this._selectedText = text;
    this._selectedSyllables = this._syllablesInBuffer.slice(0, numOfSyllablesToRemove);

    this._keypressQueue.push(numOfSyllablesToRemove * -1);
    this._start();
  },

  /**
   * @Override
   */
  empty: function() {
    this._syllablesInBuffer = [''];
    this._selectedText = '';
    this._selectedSyllables = [];
    this._sendPendingSymbols();
    this._isWorking = false;
    if (!this._db)
      this._initDB();
  }  
}

var IMEngineDatabase = function imedb() {
  var settings;

  /* name and version of IndexedDB */
  var kDBName = 'jspinyin';
  var kDBVersion = 2;

  var jsonData;
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

  var getTermsInDB = function imedb_getTermsInDB(callback) {
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
      if (iDB.objectStoreNames.length !== 0)
        iDB.deleteObjectStore('terms');

      // create ObjectStore
      var store = iDB.createObjectStore('terms', { keyPath: 'syllables' });
      store.createIndex(
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

  var populateDBFromJSON = function imedbPopulateDBFromJSON(callback) {
    var chunks = [];
    var chunk = [];
    var i = 0;

    for (var syllables in jsonData) {
      chunk.push(syllables);
      i++;
      if (i > 2048) {
        chunks.push(chunk);
        chunk = [];
        i = 0;
      }
    }
    chunks.push(chunk);
    chunks.push(['_last_entry_']);
    jsonData['_last_entry_'] = true;

    var addChunk = function imedbAddChunk() {
      debug('Loading data chunk into IndexedDB, ' +
          (chunks.length - 1) + ' chunks remaining.');

      var transaction = iDB.transaction('terms', 'readwrite');
      var store = transaction.objectStore('terms');

      transaction.onerror = function putError(ev) {
        debug('Problem while populating DB with JSON data.');
      };

      transaction.oncomplete = function putComplete() {
        if (chunks.length) {
          setTimeout(addChunk, 0);
        } else {
          jsonData = null;
          setTimeout(callback, 0);
        }
      };

      var syllables;
      var chunk = chunks.shift();
      for (i in chunk) {
        var syllables = chunk[i];
        var constantSyllables = syllables.replace(/([^\-])[^\-]*/g, '$1');
        store.put({
          syllables: syllables,
          constantSyllables: constantSyllables,
          terms: jsonData[syllables]
        });
      }
    };

    setTimeout(addChunk, 0);
  };

  var getTermsJSON = function imedb_getTermsJSON(callback) {
    getWordsJSON(function getWordsJSONCallback() {
      getPhrasesJSON(callback);
    });
  };

  var getWordsJSON = function imedb_getWordsJSON(callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', (settings.wordsJSON || './words.json'), true);
    try {
      xhr.responseType = 'json';
    } catch (e) { }
    xhr.overrideMimeType('application/json; charset=utf-8');
    xhr.onreadystatechange = function xhrReadystatechange(ev) {
      if (xhr.readyState !== 4)
        return;

      var response;
      if (xhr.responseType == 'json') {
        response = xhr.response;
      } else {
        try {
          response = JSON.parse(xhr.responseText);
        } catch (e) { }
      }

      if (typeof response !== 'object') {
        debug('Failed to load words.json: Malformed JSON');
        callback();
        return;
      }

      jsonData = {};
      // clone everything under response coz it's readonly.
      for (var s in response) {
        jsonData[s] = response[s];
      }
      xhr = null;

      callback();
    };

    xhr.send(null);
  };

  var getPhrasesJSON = function getPhrasesJSON(callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', (settings.phrasesJSON || './phrases.json'), true);
    try {
      xhr.responseType = 'json';
    } catch (e) { }
    xhr.overrideMimeType('application/json; charset=utf-8');
    xhr.onreadystatechange = function xhrReadystatechange(ev) {
      if (xhr.readyState !== 4)
        return;

      var response;
      if (xhr.responseType == 'json') {
        response = xhr.response;
      } else {
        try {
          response = JSON.parse(xhr.responseText);
        } catch (e) { }
      }

      if (typeof response !== 'object') {
        debug('Failed to load phrases.json: Malformed JSON');
        callback();
        return;
      }

      // clone everything under response coz it's readonly.
      for (var s in response) {
        jsonData[s] = response[s];
      }
      xhr = null;

      callback();
    };

    xhr.send(null);
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

  var getTermsFromConstantSyllables =
      function imedb_getTermsFromConstantSyllables(constants, callback) {
    debug('Getting terms with constantSyllables: ' + constants);

    if (iDBCache['CONSTANT:' + constants]) {
      debug('Found constantSyllables result in iDBCache.');
      callback(iDBCache['CONSTANT:' + constants]);
      return;
    }

    var store = iDB.transaction('terms', 'readonly')
      .objectStore('terms');
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

  this.init = function imedb_init(options) {
    settings = options;

    var ready = function imedbReady() {
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

      var transaction = iDB.transaction('terms');

      var req = transaction.objectStore('terms').get('_last_entry_');
      req.onsuccess = function getdbSuccess(ev) {
        if (ev.target.result !== undefined) {
          ready();
          return;
        }

        debug('IndexedDB is supported but empty; Downloading JSON ...');
        getTermsJSON(function getTermsInDBCallback() {
          if (!jsonData) {
            debug('JSON failed to download.');
            return;
          }

          debug(
            'JSON loaded,' +
            'IME is ready to use while inserting data into db ...'
          );
          ready();
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
    jsonData = null;
  };

  /* ==== db lookup functions ==== */

  this.getSuggestions =
    function imedb_getSuggestions(syllables, text, callback) {
    if (!jsonData && !iDB) {
      debug('Database not ready.');
      callback(false);
      return;
    }

    var syllablesStr = syllables.join('-').replace(/ /g , '');
    var result = [];
    var matchTerm = function matchTerm(term) {
      if (term[0].substr(0, textStr.length) !== textStr)
        return;
      if (term[0] == textStr)
        return;
      result.push(term);
    };
    var processResult = function processResult(r) {
      r = r.sort(
        function sort_result(a, b) {
          return (b[1] - a[1]);
        }
      );
      var result = [];
      var t = [];
      r.forEach(function(term) {
        if (t.indexOf(term[0]) !== -1) return;
        t.push(term[0]);
        result.push(term);
      });
      return result;
    };
    var matchRegEx;
    if (syllablesStr.indexOf('*') !== -1) {
      matchRegEx = new RegExp(
        '^' + syllablesStr.replace(/\-/g, '\\-')
              .replace(/\*/g, '[^\-]*'));
    }
    var textStr = text.join('');
    var result = [];

    debug('Get suggestion for ' + textStr + '.');

    if (typeof iDBCache['SUGGESTION:' + textStr] !== 'undefined') {
      debug('Found in iDBCache.');
      cacheSetTimeout();
      callback(iDBCache['SUGGESTION:' + textStr]);
      return;
    }

    if (jsonData) {
      debug('Lookup in JSON.');
      // XXX: this is not efficient
      for (var s in jsonData) {
        if (matchRegEx) {
          if (!matchRegEx.exec(s))
            continue;
        } else if (s.substr(0, syllablesStr.length) !== syllablesStr) {
          continue;
        }
        var terms = jsonData[s];
        terms.forEach(matchTerm);
      }
      if (result.length) {
        result = processResult(result);
      } else {
        result = false;
      }
      cacheSetTimeout();
      iDBCache['SUGGESTION:' + textStr] = result;
      callback(result);
      return;
    }

    debug('Lookup in IndexedDB.');

    var findSuggestionsInIDB = function findSuggestionsInIDB() {
      var upperBound = syllablesStr.substr(0, syllablesStr.length - 1) +
        String.fromCharCode(
          syllablesStr.substr(syllablesStr.length - 1).charCodeAt(0) + 1);

      debug('Do IndexedDB range search with lowerBound ' + syllablesStr +
        ' and upperBound ' + upperBound + '.');

      var store = iDB.transaction('terms', 'readonly')
        .objectStore('terms');
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

    if (!matchRegEx) {
      findSuggestionsInIDB();
      return;
    }
    debug('Attempt to resolve the complete syllables of ' + textStr +
      ' from ' + syllablesStr + '.');
    var constants = syllablesStr.replace(/([^\-])[^\-]*/g, '$1');
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

  this.getTerms = function imedb_getTerms(syllables, callback) {
    if (!jsonData && !iDB) {
      debug('Database not ready.');
      callback(false);
      return;
    }

    var syllablesStr = syllables.join('-').replace(/ /g , '');
    var matchRegEx;
    if (syllablesStr.indexOf('*') !== -1) {
      matchRegEx = new RegExp(
        '^' + syllablesStr.replace(/\-/g, '\\-')
              .replace(/\*/g, '[^\-]*') + '$');
      var processResult = function processResult(r) {
        r = r.sort(
          function sort_result(a, b) {
            return (b[1] - a[1]);
          }
        );
        var result = [];
        var t = [];
        r.forEach(function(term) {
          if (t.indexOf(term[0]) !== -1) return;
          t.push(term[0]);
          result.push(term);
        });
        return result;
      };
    }

    debug('Get terms for ' + syllablesStr + '.');

    if (typeof iDBCache[syllablesStr] !== 'undefined') {
      debug('Found in iDBCache.');
      cacheSetTimeout();
      callback(iDBCache[syllablesStr]);
      return;
    }

    if (jsonData) {
      debug('Lookup in JSON.');
      if (!matchRegEx) {
        callback(jsonData[syllablesStr] || false);
        return;
      }
      debug('Do range search in JSON data.');
      var result = [];
      var dash = /\-/g;
      // XXX: this is not efficient
      for (var s in jsonData) {
        if (!matchRegEx.exec(s))
          continue;
        result = result.concat(jsonData[s]);
      }
      if (result.length) {
        result = processResult(result);
      } else {
        result = false;
      }
      cacheSetTimeout();
      iDBCache[syllablesStr] = result;
      callback(result);
      return;
    }

    debug('Lookup in IndexedDB.');

    if (!matchRegEx) {
      var store = iDB.transaction('terms', 'readonly')
        .objectStore('terms');
      var req = store.get(syllablesStr);
      req.onerror = function getdbError(ev) {
        debug('Database read error.');
        callback(false);
      };

      req.onsuccess = function getdbSuccess(ev) {
        cacheSetTimeout();

        if (!ev.target.result) {
          iDBCache[syllablesStr] = false;
          callback(false);
          return;
        }

        iDBCache[syllablesStr] = ev.target.result.terms;
        callback(ev.target.result.terms);
      };
      return;
    }
    debug('Do range search in IndexedDB.');
    var constants = syllablesStr.replace(/([^\-])[^\-]*/g, '$1');
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
          var numOfWord = composition[i];
          if (composition.length === i)
            return finish();
          i++;
          self.getTermWithHighestScore(
            syllables.slice(start, start + numOfWord),
            function getTermWithHighestScoreCallback(term) {
              if (!term && numOfWord > 1)
                return finish();
              if (!term) {
                var syllable =
                  syllables.slice(start, start + numOfWord).join('');
                debug('Syllable ' + syllable +
                  ' does not made up a word, insert symbol.');
                term = [syllable.replace(/\*/g, ''), -7];
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
              var scoreA = 0;

              a.forEach(function countScoreA(term) {
                scoreA += term[1];
              });

              var scoreB = 0;
              b.forEach(function countScoreB(term) {
                scoreB += term[1];
              });

              return (scoreB - scoreA);
            });

            callback(sentences);
          }
        };

        next();
      }
    );
  };
};


var dictionary = new PhraseDictionary();
var loader = new XMLHttpRequest();
loader.open('GET', './imes/jspinyin/db.json');
loader.responseType = 'json';
loader.onreadystatechange = function(event) {
  if (loader.readyState == 4) {
    dictionary.addPhrases(loader.response);
    loader = null;
  }
};
loader.send();

var loader2 = new XMLHttpRequest();
loader2.open('GET', './imes/jspinyin/db-tr.json');
loader2.responseType = 'json';
loader2.onreadystatechange = function(event) {
  if (loader2.readyState == 4) {
    dictionary.addPhrases2(loader2.response);
    loader2 = null;
  }
};
loader2.send();

var splitter = new SyllableSplitter();
var jspinyin = new IMEngine(dictionary, splitter);

// Expose JSZhuyin as an AMD module
if (typeof define === 'function' && define.amd)
  define('jspinyin', [], function() { return jspinyin; });

// Expose to IMEManager if we are in Gaia homescreen
if (typeof IMEManager !== 'undefined')
  IMEManager.IMEngines.jspinyin = jspinyin;

})();

