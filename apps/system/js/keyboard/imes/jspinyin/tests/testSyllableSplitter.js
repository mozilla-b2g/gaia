/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';
/**
 * An index class to speed up the search operation for ojbect array.
 * @param {Array} targetArray The array to be indexed.
 * @param {String} keyPath The key path for the index to use.
 */
var Index = function(targetArray, keyPath) {
  this._keyMap = {};
  this._sortedKeys = [];
  for (var i=0; i<targetArray.length; i++) {
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
  _keyMap: {},
  
  // Keys array in ascending order.
  _sortedKeys: [],
  
  /**
   * Get array indices by given key.
   * @returns {Array} An array of index.
   */
  get: function(key) {
    var indices = [];
    if (key in this._keyMap) {
      indices = indices.concat(this._keyMap[key]);
    }
    return indices;
  },
  
  /**
   * Get array indices by given key range.
   * @param {String} lower The lower bound of the key range. If null, the range has no lower bound.
   * @param {String} upper The upper bound of the key range. If null, the range has no upper bound.
   * @param {Boolean} lowerOpen If false, the range includes the lower bound value of the key range.
   * If the range has no lower bound, it will be ignored.
   * @param {Boolean} upperOpen If false, the range includes the upper bound value of the key range.
   * If the range has no upper bound, it will be ignored.
   * @returns {Array} An array of index.
   */
  getRange: function(lower, upper, lowerOpen, upperOpen) {
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
    
    for (var i=lowerPos; i<=upperPos; i++) {
      var key = this._sortedKeys[i];
      indices = indices.concat(this._keyMap[key]);
    }
    return indices;
  },
  
  /**
   * Search the key position.
   * @param {String} key The key to search.
   * @param {Number} left The begin position of the array. It should be less than the right parameter.
   * @param {Number} right The end position of the array.It should be greater than the left parameter.
   * @returns {Number} If success, returns the index of the key.
   * If the key is between two adjacent keys, returns the average index of the two keys.
   * If the key is out of bounds, returns Infinity or -Infinity.
   */
  _binarySearch: function(key, left, right) {
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

/** Maximum limit of PinYin syllable length */
var SYLLALBLE_MAX_LENGTH = 6;

var SyllableType = {
  /**
   * Complete syllable, such as "yue", "bei".
   */  
  COMPLETE: 0,
  /**
   * Abbreviated syllable that starts with a single consonant(声母), such as "b", "j".
   */
  ABBREVIATED: 1,
  /**
   * An incomplete syllables is part of complete syllable. It is neither an abbreviated syllable,
   * nor a complete syllable, such as "be".
   */
  INCOMPLETE: 2,
  /**
   * Invalid syllale.
   */
  INVALID: 3
};

var Syllable = function(str, type) {
  this.str = str;
  this.type = type;
};

Syllable.prototype = {
  /**
   * The syllable string
   */
  str: 'ai',
  
  /**
   * The syllable type
   */
  type: SyllableType.COMPLETE
};

/**
 * Divides a string into Pinyin syllables
 */
var PinyinParser = function() {
  // Consonants(声母) list
  var consonants= 'b p m f d t n l g k h j q x zh ch sh r z c s y w'.split(' ');
  
  this._consonantMap = {};
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
  
  this._syllableArray = [];
  for(var i in syllables) {
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
  _consonantMap: {},
  
  /**
   * Syllable array.
   */
  _syllableArray: [{syllable: 'a'}, {syllable: 'ai'}],
  
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
   * @returns {Array} An array of segments. 
   */  
  parse: function(input) {
    var results = [];
    
    // Trims the leading and trailing "'".
    input = input.replace(/^'+|'+$/g, '');
    
    if (input == "") {
      return results;
    }
    
    var end = input.length;    
    for (; end>0; end--) {
      var sub = input.substring(0, end);
      results = this._parseInternal(sub);
      if (results.length > 0) {
        break;
      }
    }
    
    if (end != input.length) {
      // The input contains invalid syllable.
      var invalidSyllable = input.substring(end);
      results = this._appendsSubSegments(results, [[new Syllable(invalidSyllable, SyllableType.INVALID)]]);
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
   * @returns {Array} An array of segments.
   * If the input string contains any invalid syllables, returns empty array.
   */   
  _parseInternal: function(input) {
    var results = [];
    
    // Trims the leading and trailing "'".
    input = input.replace(/^'+|'+$/g, '');
    
    if (input == "") {
      return results;
    }
    
    var end = Math.min(input.length, SYLLALBLE_MAX_LENGTH);    
    for (; end>0; end--) {
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
    // Sort the segments array. The segment with fewer incomplete syllables and shorter length
    // comes first.
    var self = this;
    results.sort(function(a, b) {
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
  _getSyllableType: function(str) {
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
  _appendsSubSegments: function(segments, subSegments) {
    if (segments.length == 0) {
      return subSegments;
    }
    if (subSegments.length == 0) {
      return segments;
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
   * Get the incompleteness of syllables.
   *
   * Syllables containing incomplete and abbreviated syllable is of higher incompleteness value than those not.
   *
   * @param {Array} segement The segement array containing the syllables to be evaluated.
   * @returns {Nunmber} The number of incompleteness. A higher value means more incomplete or
   * abbreviated syllables.
   */
  _getIncompleteness: function(segment) {
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

var pinyinParser = new PinyinParser();

function test(input, expected) {
  print("test - " + input);
  var choices = pinyinParser.parse(input);
  print(JSON.stringify(choices));
  print();
}

print("=======西安========\n");
test('xian');
test("xi'an");
print("=======方案 反感========\n");
test("fangan");
test("fang'an");
test("fan'gan");
print("=======北京========\n");
test("bj");
test("beijing");
test("bjing");
test("beij");
test("bejing");
test("bejing");
test("bej");
print("=======你好========\n");
test("ni");
test("nih");
test("nihao");
test("nihaoa");
test("nh");
test("nha");
test("nhaa");
print("=======中========\n");
test("zh");
test("zho");
test("zhon");
test("zhong");
print("=======Invalid Input========\n");
test("gi");
test("gv");
test("uu");
test("ig");
test("igv");