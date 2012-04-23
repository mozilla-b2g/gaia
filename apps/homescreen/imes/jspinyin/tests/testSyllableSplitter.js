/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/** Maximum limit of PinYin syllable length */
var SYLLALBLE_MAX_LENGTH = 6;

/**
 * Divides a string into Pinyin syllables
 */
function PinyinParser() {
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
}

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
