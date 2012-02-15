function SyllableSplitter() {
  var syllables = [
  'ba', 'bai', 'ban', 'bang', 'bao', 'bei', 'ben', 'beng', 'bi', 'bian', 'biao', 'bie', 'bin', 'bing', 'bo', 'bu',
  'ca', 'cai', 'can', 'cang', 'cao', 'ce', 'cen', 'ceng', 'cha', 'chai', 'chan', 'chang', 'chao', 'che', 'chen', 'cheng', 'chong', 'chou', 'chu', 'chua', 'chuai', 'chuan', 'chuang', 'chui', 'chun', 'chuo', 'cong', 'cou', 'cu', 'cuan', 'cui', 'cun', 'cuo',
  'da', 'dai', 'dan', 'dang', 'dao', 'de', 'dei', 'deng', 'di', 'dian', 'diao', 'die', 'ding', 'diu', 'dong', 'dou', 'du', 'duan', 'dui', 'dun', 'duo',
  'fa', 'fan', 'fang', 'fei', 'fen', 'feng', 'fo', 'fou', 'fu',
  'ga', 'gai', 'gan', 'gang', 'gao', 'ge', 'gei', 'gen', 'geng', 'gong', 'gou', 'gu', 'gua', 'guai', 'guan', 'guang', 'gui', 'gun', 'guo',
  'ha', 'hai', 'han', 'hang', 'hao', 'he', 'hei', 'hen', 'heng', 'hong', 'hou', 'hu', 'hua', 'huai', 'huan', 'huang', 'hui', 'hun', 'huo',
  'ji', 'jia', 'jian', 'jiang', 'jiao', 'jie', 'jin', 'jing', 'jiong', 'jiu', 'ju', 'juan', 'jue', 'jun',
  'ka', 'kai', 'kan', 'kang', 'kao', 'ke', 'ken', 'keng', 'kong', 'kou', 'ku', 'kua', 'kuai', 'kuan', 'kuang', 'kui', 'kun', 'kuo',
  'la', 'lai', 'lan', 'lang', 'lao', 'le', 'lei', 'leng', 'li', 'lia', 'lian', 'liang', 'liao', 'lie', 'lin', 'ling', 'liu', 'long', 'lou', 'lu', 'lv', 'luan', 'lve', 'lun', 'luo',
  'ma', 'mai', 'man', 'mang', 'mao', 'me', 'mei', 'men', 'meng', 'mi', 'mian', 'miao', 'mie', 'min', 'ming', 'miu', 'mo', 'mou', 'mu',
  'na', 'nai', 'nan', 'nang', 'nao', 'ne', 'nei', 'nen', 'neng', 'ni', 'nian', 'niang', 'niao', 'nie', 'nin', 'ning', 'niu', 'nong', 'nou', 'nu', 'nv', 'nuan', 'nve', 'nuo',
  'pa', 'pai', 'pan', 'pang', 'pao', 'pei', 'pen', 'peng', 'pi', 'pian', 'piao', 'pie', 'pin', 'ping', 'po', 'pou', 'pu',
  'qi', 'qia', 'qian', 'qiang', 'qiao', 'qie', 'qin', 'qing', 'qiong', 'qiu', 'qu', 'quan', 'que', 'qun',
  'ran', 'rang', 'rao', 're', 'ren', 'reng', 'ri', 'rong', 'rou', 'ru', 'ruan', 'rui', 'run', 'ruo',
  'sa', 'sai', 'san', 'sang', 'sao', 'se', 'sen', 'seng', 'sha', 'shai', 'shan', 'shang', 'shao', 'she', 'shei', 'shen', 'sheng', 'shou', 'shu', 'shua', 'shuai', 'shuan', 'shuang', 'shui', 'shun', 'shuo', 'song', 'sou', 'su', 'suan', 'sui', 'sun', 'suo',
  'ta', 'tai', 'tan', 'tang', 'tao', 'te', 'teng', 'ti', 'tian', 'tiao', 'tie', 'ting', 'tong', 'tou', 'tu', 'tuan', 'tui', 'tun', 'tuo',
  'wa', 'wai', 'wan', 'wang', 'wei', 'wen', 'weng', 'wo', 'wu',
  'xi', 'xia', 'xian', 'xiang', 'xiao', 'xie', 'xin', 'xing', 'xiong', 'xiu', 'xu', 'xuan', 'xue', 'xun',
  'ya', 'yan', 'yang', 'yao', 'ye', 'yi', 'yin', 'ying', 'yong', 'you', 'yu', 'yuan', 'yue', 'yun',
  'za', 'zai', 'zan', 'zang', 'zao', 'ze', 'zei', 'zen', 'zeng', 'zha', 'zhai', 'zhan', 'zhang', 'zhao', 'zhe', 'zhei', 'zhen', 'zheng', 'zhong', 'zhou', 'zhu', 'zhua', 'zhuai', 'zhuan', 'zhuang', 'zhui', 'zhun', 'zhuo', 'zong', 'zou', 'zu', 'zuan', 'zui', 'zun', 'zuo',
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
          if (/[aeiuv]$/.test(answer) && ensure(input, startsWith, answer + 'n')) continue;
          if (/[aeiuv]n$/.test(answer) && ensure(input, startsWith, answer + "g'")) continue;
          if (ensure(answer, endsWith, 'e') && ensure(input, startsWith, answer + 'r')) continue;
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
//        if (rawInput.indexOf("'") == 0) {
//          prefix = "'";
//          input = rawInput.substring(1);
//        }
        var possibleFirstSyllables = guessFirstSyllable(input);
        var currentTail = tail;
        for (var i = 0; i < possibleFirstSyllables.length; i++) {
          var firstSyllable = possibleFirstSyllables[i];
          tail = {syllable:/*prefix + */firstSyllable, parent: currentTail};
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
    //console.log(solutions);
    return solutions;
  }
}

