/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
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
  unint: function() {
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
  
  _sendPendingSymbols: function () {
    var symbols = this._spell;
    this._glue.sendPendingSymbols(symbols);
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
    this._dictionary.uninit();
    this._dictionary = null;
    this._splitter = null;
  },

  /**
   *@Override
   */
  click: function(keyCode) {
    if(keyCode == -10) {
      this._mode = false;
    }
    if(keyCode == -11) {
      this._mode = true;
    }
    if (keyCode == 39 || (97 <= keyCode && keyCode <= 122)) {
      this._spell += String.fromCharCode(keyCode);
      this._refreshChoices(this._mode);
    } else {
      switch (keyCode) {
        case 8: {
          if (this._spell.length == 0) {
            this._glue.sendKey(keyCode);
          } else {
            this._spell = this._spell.substring(0, this._spell.length - 1);
            if (this._startPosition == this._spell.length) {
              this._startPosition = 0;
            }
            this._refreshChoices(this.mode);
          }
          break;
        }
        default:
          this._glue.sendKey(keyCode);
      }
    }
  },

  /**
   * @Override
   */
  select: function(text, type) {
    this._glue.sendString(text);

    this._spell = this._spell.substring(type.length);
    if (this._startPosition == this._spell.length) {
      this.empty();
    }
    this._refreshChoices(this._mode);
  },

  /**
   * @Override
   */
  empty: function() {
    this._spell = '';
    this._startPosition = 0;
    this._sendPendingSymbols();
  }  
}

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

