'use strict';

(function() {

  var MAX_FREQUENCY = 10000;

  var IMELayouts = {
    'EN': 'jp-kanji-en',
    'EN-CAPS': 'jp-kanji-en-caps',
    'JP': 'jp-kanji',
    'NUM': 'jp-kanji-number'
  };

  // IME special key code map
  // see `layout.js`
  var IMESpecialKey = {
    BACK: -10,
    PREVIOUS: -11,
    NEXT: -12,
    MARK: -13,
    TRANSFORM: -14,
    CASE_CHANGE: -16,
    FULL: -17,
    H2K: -18,
    CAPSLOCK: -19,
    EN_LAYOUT: -20,
    NUM_LAYOUT: -21,
    BASIC_LAYOUT: -22
  };

  // Keyboard mode mapping
  // FIXME partly used, maybe remove used
  var IMEMode = {
      FULL_HIRAGANA: 0,
      FULL_KATAKANA: 1,
      FULL_ALPHABET: 2,
      FULL_NUMBER: 3,
      HALF_NUMBER: 4,
      HALF_ALPHABET: 5,
      HALF_KATAKANA: 6
  };

  var IMEKeyMap = {
    'あ': 0, 'か': 1, 'さ': 2, 'た': 3, 'な': 4, 'は': 5, 'ま': 6,
    'や': 7, 'ら': 8, 'わ': 9, '、': 10,
    'ア': 0, 'カ': 1, 'サ': 2, 'タ': 3, 'ナ': 4, 'ハ': 5, 'マ': 6,
    'ヤ': 7, 'ラ': 8, 'ワ': 9,
    'ｱ': 0, 'ｶ': 1, 'ｻ': 2, 'ﾀ': 3, 'ﾅ': 4, 'ﾊ': 5, 'ﾏ': 6, 'ﾔ': 7,
    'ﾗ': 8, 'ﾜ': 9, '､': 10
  };


  var IMEHalfWidthCharactorCandidateList = [
    '!', '“', '$', '%', '&amp;', "'", '(', ')', '*', '+', ',', '-',
    '.', '/', ':', ';', '&lt', '=', '>', '?', '@', '[', '\\', ']',
    '^', '_', '`', '{', '|', '}', '~'
  ];

  var IMEFullWidthCharactorCandidateList = [
    '、', '。', '，', '．', '・', '：', '；', '？', '！', '゛',
    '゜', '´', '｀', '¨', '＾', '￣', '＿', 'ヽ', 'ヾ', 'ゝ',
    'ゞ', '〃', '仝', '々', '〆', '〇', 'ー', '―', '‐', '／',
    '＼', '～', '∥', '｜', '…', '‥', '‘', '’', '“', '”',
    '（', '）', '〔', '〕', '［', '］', '｛', '｝', '〈', '〉',
    '《', '》', '「', '」', '『', '』', '【', '】', '＋', '－',
    '±', '×', '÷', '＝', '≠', '＜', '＞', '≦', '≧', '∞',
    '∴', '♂', '♀', '∈', '∋', '⊆', '⊇', '⊂', '⊃', '∪',
    '∩', '∧', '∨', '￢', '⇒', '⇔', '∀', '∃', '∠', '⊥',
    '⌒', '∂', '∇', '≡', '≒', '≪', '≫', '√', '∽', '∝',
    '∵', '∫', '∬', 'Å', '‰', '°', '′', '″', '℃', '￥',
    '＄', '￠', '￡', '％', '＃', '＆', '＊', '＠', '§', '☆',
    '★', '○', '●', '◎', '◇', '◆', '□', '■', '△', '▲',
    '▽', '▼', '※', '〒', '→', '←', '↑', '↓', '〓', '♯',
    '♭', '♪', '†', '‡', '¶', '◯', '─', '╂', '①', '②',
    '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩', '⑪', '⑫',
    '⑬', '⑭', '⑮', '⑯', '⑰', '⑱', '⑲', '⑳', 'Ⅰ', 'Ⅱ',
    'Ⅲ', 'Ⅳ', 'Ⅴ', 'Ⅵ', 'Ⅶ', 'Ⅷ', 'Ⅸ', 'Ⅹ', '㍉', '㌔',
    '㌢', '㍍', '㌘', '㌧', '㌃', '㌶', '㍑', '㍗', '㌍', '㌦',
    '㌣', '㌫', '㍊', '㌻', '㎜', '㎝', '㎞', '㎎', '㎏', '㏄',
    '㎡', '㍻', '〝', '〟', '№', '㏍', '℡', '㊤', '㊥', '㊦',
    '㊧', '㊨', '㈱', '㈲', '㈹', '㍾', '㍽', '㍼', '≒', '≡',
    '∫', '∮', '∑', '√', '⊥', '∠', '∟', '⊿', '∵', '∩', '∪'
  ];

  // not used by now
  // Uncomment this if half-width and full-width alphabet transformation
  // is needed
  /*var IMEAlphabetTable = {
    'A': 'Ａ', 'B': 'Ｂ', 'C': 'Ｃ', 'D': 'Ｄ', 'E': 'Ｅ', 'F': 'Ｆ',
    'G': 'Ｇ', 'H': 'Ｈ', 'I': 'Ｉ', 'J': 'Ｊ', 'K': 'Ｋ', 'L': 'Ｌ',
    'M': 'Ｍ', 'N': 'Ｎ', 'O': 'Ｏ', 'P': 'Ｐ', 'Q': 'Ｑ', 'R': 'Ｒ',
    'S': 'Ｓ', 'T': 'Ｔ', 'U': 'Ｕ', 'V': 'Ｖ', 'W': 'Ｗ', 'X': 'Ｘ',
    'Y': 'Ｙ', 'Z': 'Ｚ', 'Ａ': 'A', 'Ｂ': 'B', 'Ｃ': 'C', 'Ｄ': 'D',
    'Ｅ': 'E', 'Ｆ': 'F', 'Ｇ': 'G', 'Ｈ': 'H', 'Ｉ': 'I', 'Ｊ': 'J',
    'Ｋ': 'K', 'Ｌ': 'L', 'Ｍ': 'M', 'Ｎ': 'N', 'Ｏ': 'O', 'Ｐ': 'P',
    'Ｑ': 'Q', 'Ｒ': 'R', 'Ｓ': 'S', 'Ｔ': 'T', 'Ｕ': 'U', 'Ｖ': 'V',
    'Ｗ': 'W', 'Ｘ': 'X', 'Ｙ': 'Y', 'Ｚ': 'Z',
    'a': 'ａ', 'b': 'ｂ', 'c': 'ｃ', 'd': 'ｄ', 'e': 'ｅ', 'f': 'ｆ',
    'g': 'ｇ', 'h': 'ｈ', 'i': 'ｉ', 'j': 'ｊ', 'k': 'ｋ', 'l': 'ｌ',
    'm': 'ｍ', 'n': 'ｎ', 'o': 'ｏ', 'p': 'ｐ', 'q': 'ｑ', 'r': 'ｒ',
    's': 'ｓ', 't': 'ｔ', 'u': 'ｕ', 'v': 'ｖ', 'w': 'ｗ', 'x': 'ｘ',
    'y': 'ｙ', 'z': 'ｚ', 'ａ': 'a', 'ｂ': 'b', 'ｃ': 'c', 'ｄ': 'd',
    'ｅ': 'e', 'ｆ': 'f', 'ｇ': 'g', 'ｈ': 'h', 'ｉ': 'i', 'ｊ': 'j',
    'ｋ': 'k', 'ｌ': 'l', 'ｍ': 'm', 'ｎ': 'n', 'ｏ': 'o', 'ｐ': 'p',
    'ｑ': 'q', 'ｒ': 'r', 'ｓ': 's', 'ｔ': 't', 'ｕ': 'u', 'ｖ': 'v',
    'ｗ': 'w', 'ｘ': 'x', 'ｙ': 'y', 'ｚ': 'z'
  };*/

  var IMENumberTable = {
    '1': '１', '2': '２', '3': '３', '4': '４', '5': '５', '6': '６', '7': '７',
    '8': '８', '9': '９', '0': '０'
  };

  // Key loop
  // Ex.
  //   あ displays when clicking あ
  //   い displays when clicking あ twice
  var IMEHiraganaCycleTable = [
    ['あ', 'い', 'う', 'え', 'お', 'ぁ', 'ぃ', 'ぅ', 'ぇ', 'ぉ'],
    ['か', 'き', 'く', 'け', 'こ'],
    ['さ', 'し', 'す', 'せ', 'そ'],
    ['た', 'ち', 'つ', 'て', 'と', 'っ'],
    ['な', 'に', 'ぬ', 'ね', 'の'],
    ['は', 'ひ', 'ふ', 'へ', 'ほ'],
    ['ま', 'み', 'む', 'め', 'も'],
    ['や', 'ゆ', 'よ', 'ゃ', 'ゅ', 'ょ'],
    ['ら', 'り', 'る', 'れ', 'ろ'],
    ['わ', 'を', 'ん', 'ゎ', 'ー'],
    ['、', '。', '？', '！', '・', '　']
  ];
  var IMEFullKatakanaCycleTable = [
    ['ア', 'イ', 'ウ', 'エ', 'オ', 'ァ', 'ィ', 'ゥ', 'ェ', 'ォ'],
    ['カ', 'キ', 'ク', 'ケ', 'コ'],
    ['サ', 'シ', 'ス', 'セ', 'ソ'],
    ['タ', 'チ', 'ツ', 'テ', 'ト', 'ッ'],
    ['ナ', 'ニ', 'ヌ', 'ネ', 'ノ'],
    ['ハ', 'ヒ', 'フ', 'ヘ', 'ホ'],
    ['マ', 'ミ', 'ム', 'メ', 'モ'],
    ['ヤ', 'ユ', 'ヨ', 'ャ', 'ュ', 'ョ'],
    ['ラ', 'リ', 'ル', 'レ', 'ロ'],
    ['ワ', 'ヲ', 'ン', 'ヮ', 'ー'],
    ['、', '。', '？', '！', '・', '　']
  ];
  var IMEHalfKatakanaCycleTable = [
    ['ｱ', 'ｲ', 'ｳ', 'ｴ', 'ｵ', 'ｧ', 'ｨ', 'ｩ', 'ｪ', 'ｫ'],
    ['ｶ', 'ｷ', 'ｸ', 'ｹ', 'ｺ'],
    ['ｻ', 'ｼ', 'ｽ', 'ｾ', 'ｿ'],
    ['ﾀ', 'ﾁ', 'ﾂ', 'ﾃ', 'ﾄ', 'ｯ'],
    ['ﾅ', 'ﾆ', 'ﾇ', 'ﾈ', 'ﾉ'],
    ['ﾊ', 'ﾋ', 'ﾌ', 'ﾍ', 'ﾎ'],
    ['ﾏ', 'ﾐ', 'ﾑ', 'ﾒ', 'ﾓ'],
    ['ﾔ', 'ﾕ', 'ﾖ', 'ｬ', 'ｭ', 'ｮ'],
    ['ﾗ', 'ﾘ', 'ﾙ', 'ﾚ', 'ﾛ'],
    ['ﾜ', 'ｦ', 'ﾝ', 'ｰ'],
    ['､', '｡', '?', '!', '･', ' ']
  ];

  // Hiragana (平假名) case convert table
  var IMEHiraganaCaseTable = {
    'あ': 'ぁ', 'い': 'ぃ', 'う': 'ぅ', 'え': 'ぇ', 'お': 'ぉ', 'ぁ': 'あ', 'ぃ': 'い',
    'ぅ': 'ヴ', 'ぇ': 'え', 'ぉ': 'お', 'か': 'が', 'き': 'ぎ',
    'く': 'ぐ', 'け': 'げ', 'こ': 'ご', 'が': 'か', 'ぎ': 'き', 'ぐ': 'く', 'げ': 'け',
    'ご': 'こ', 'さ': 'ざ', 'し': 'じ', 'す': 'ず', 'せ': 'ぜ',
    'そ': 'ぞ', 'ざ': 'さ', 'じ': 'し', 'ず': 'す', 'ぜ': 'せ', 'ぞ': 'そ', 'た': 'だ',
    'ち': 'ぢ', 'つ': 'っ', 'て': 'で', 'と': 'ど', 'だ': 'た',
    'ぢ': 'ち', 'っ': 'づ', 'で': 'て', 'ど': 'と', 'づ': 'つ', 'ヴ': 'う', 'は': 'ば',
    'ひ': 'び', 'ふ': 'ぶ', 'へ': 'べ', 'ほ': 'ぼ', 'ば': 'ぱ',
    'び': 'ぴ', 'ぶ': 'ぷ', 'べ': 'ぺ', 'ぼ': 'ぽ', 'ぱ': 'は', 'ぴ': 'ひ',
    'ぷ': 'ふ', 'ぺ': 'へ', 'ぽ': 'ほ', 'や': 'ゃ', 'ゆ': 'ゅ', 'よ': 'ょ',
    'ゃ': 'や', 'ゅ': 'ゆ', 'ょ': 'よ', 'わ': 'ゎ', 'ゎ': 'わ', '゛': '゜', '゜': '゛'
  };
  // Katakana (片假名) case convert table
  var IMEFullKatakanaCaseTable = {
    'ア': 'ァ', 'イ': 'ィ', 'ウ': 'ゥ', 'エ': 'ェ', 'オ': 'ォ', 'ァ': 'ア', 'ィ': 'イ',
    'ゥ': 'ヴ', 'ェ': 'エ', 'ォ': 'オ', 'カ': 'ガ', 'キ': 'ギ',
    'ク': 'グ', 'ケ': 'ゲ', 'コ': 'ゴ', 'ガ': 'カ', 'ギ': 'キ', 'グ': 'ク', 'ゲ': 'ケ',
    'ゴ': 'コ', 'サ': 'ザ', 'シ': 'ジ', 'ス': 'ズ', 'セ': 'ゼ',
    'ソ': 'ゾ', 'ザ': 'サ', 'ジ': 'シ', 'ズ': 'ス', 'ゼ': 'セ', 'ゾ': 'ソ',
    'タ': 'ダ', 'チ': 'ヂ', 'ツ': 'ッ', 'テ': 'デ', 'ト': 'ド', 'ダ': 'タ',
    'ヂ': 'チ', 'ッ': 'ヅ', 'デ': 'テ', 'ド': 'ト', 'ヅ': 'ツ', 'ヴ': 'ウ', 'ハ': 'バ',
    'ヒ': 'ビ', 'フ': 'ブ', 'ヘ': 'ベ', 'ホ': 'ボ', 'バ': 'パ',
    'ビ': 'ピ', 'ブ': 'プ', 'ベ': 'ペ', 'ボ': 'ポ', 'パ': 'ハ', 'ピ': 'ヒ',
    'プ': 'フ', 'ペ': 'ヘ', 'ポ': 'ホ', 'ヤ': 'ャ', 'ユ': 'ュ', 'ヨ': 'ョ',
    'ャ': 'ヤ', 'ュ': 'ユ', 'ョ': 'ヨ', 'ワ': 'ヮ', 'ヮ': 'ワ'
  };
  var IMEHalfKatakanaCaseTable = {
    'ｱ': 'ｧ', 'ｲ': 'ｨ', 'ｳ': 'ｩ', 'ｴ': 'ｪ', 'ｵ': 'ｫ', 'ｧ': 'ｱ', 'ｨ': 'ｲ',
    'ｩ': 'ｳﾞ', 'ｪ': 'ｴ', 'ｫ': 'ｵ', 'ｶ': 'ｶﾞ',
    'ｷ': 'ｷﾞ', 'ｸ': 'ｸﾞ', 'ｹ': 'ｹﾞ', 'ｺ': 'ｺﾞ', 'ｶﾞ': 'ｶ', 'ｷﾞ': 'ｷ', 'ｸﾞ': 'ｸ',
    'ｹﾞ': 'ｹ', 'ｺﾞ': 'ｺ', 'ｻ': 'ｻﾞ', 'ｼ': 'ｼﾞ',
    'ｽ': 'ｽﾞ', 'ｾ': 'ｾﾞ', 'ｿ': 'ｿﾞ', 'ｻﾞ': 'ｻ', 'ｼﾞ': 'ｼ', 'ｽﾞ': 'ｽ', 'ｾﾞ': 'ｾ',
    'ｿﾞ': 'ｿ', 'ﾀ': 'ﾀﾞ', 'ﾁ': 'ﾁﾞ', 'ﾂ': 'ｯ',
    'ﾃ': 'ﾃﾞ', 'ﾄ': 'ﾄﾞ', 'ﾀﾞ': 'ﾀ', 'ﾁﾞ': 'ﾁ', 'ｯ': 'ﾂﾞ', 'ﾃﾞ': 'ﾃ', 'ﾄﾞ': 'ﾄ',
    'ﾂﾞ': 'ﾂ', 'ﾊ': 'ﾊﾞ', 'ﾋ': 'ﾋﾞ', 'ﾌ': 'ﾌﾞ',
    'ﾍ': 'ﾍﾞ', 'ﾎ': 'ﾎﾞ', 'ﾊﾞ': 'ﾊﾟ', 'ﾋﾞ': 'ﾋﾟ', 'ﾌﾞ': 'ﾌﾟ', 'ﾍﾞ': 'ﾍﾟ',
    'ﾎﾞ': 'ﾎﾟ', 'ﾊﾟ': 'ﾊ', 'ﾋﾟ': 'ﾋ', 'ﾌﾟ': 'ﾌ', 'ﾍﾟ': 'ﾍ',
    'ﾎﾟ': 'ﾎ', 'ﾔ': 'ｬ', 'ﾕ': 'ｭ', 'ﾖ': 'ｮ', 'ｬ': 'ﾔ', 'ｭ': 'ﾕ', 'ｮ': 'ﾖ',
    'ﾜ': 'ﾜ', 'ｳﾞ': 'ｳ'
  };

  // Get key info accoring to previous key and current key
  // If current key is the first element of a line
  //   and previous key is in the same line,
  //   the next key after previous key returns
  // Otherwise, current key returns
  var getNextKeyInfo = function ime_getNextKeyInfo(prevK, currK) {
    var line = IMEHiraganaCycleTable[IMEKeyMap[currK]];
    var len = line.length;
    var i;
    for (i = 0; i < len; i++) {
      if (line[i] === prevK) {
        return [true, line[(i + 1) % len]];
      }
    }
    return [false, currK];
  };

  // see `getNextKeyInfo`
  // only get key in the reverse way
  var getPreviousKeyInfo = function ime_getPreviousKeyInfo(currK) {
    var i, j;
    var outer_len = IMEHiraganaCycleTable.length;
    var inner_len;
    var line;
    for (i = 0; i < outer_len; i++) {
      line = IMEHiraganaCycleTable[i];
      inner_len = line.length;
      for (j = 0; j < inner_len; j++) {
        if (line[j] === currK) {
          return [true, line[(j + inner_len - 1) % inner_len]];
        }
      }
    }

    return [false, ''];
  };

  var getPosInfoByChar = function ime_getPosInfoByChar(ch) {
    var i, j;
    var table = IMEHiraganaCycleTable;
    for (i = 0; i < table.length; i++) {
      for (j = 0; j < table[i].length; j++) {
        if (table[i][j] === ch) {
          return [i, j];
        }
      }
    }
    return [-1, -1];
  };

  // This is a simple Japanese IME implementation.
  var IMEngine = function ime() {

    // keep a local copy
    var self = this;

    // Glue contains some callback functions
    var _glue;

    // Query dict
    var _dict = null;

    // Enable IndexedDB
    var _enableIndexedDB = true;

    // Max length to predict
    var _dictMaxPredictLength = 20;

    // Input buffer
    // NOTICE `_inputBuf` only contains Hiragana
    var _inputBuf = [];
    // Candidate list to be displayed
    // candidate is [kanji, kana]
    var _candidateList = [];

    // First term info in candidate list
    // used for transforming
    var _firstKanji = '';
    var _firstKana = '';

    // Previous selected term info
    // used to generate suggestions
    var _selectedKanji = '';
    var _selectedKana = '';

    // Code of previous key pressed
    var _previousKeycode = 0;

    // Current keyboard
    var _currLayout = IMELayouts.JP;

    var KeyMode = {
      'NORMAL': 0,
      'TRANSFORM': 1,
      'SELECT': 2,
      'H2K': 3
    };
    var _keyMode = KeyMode.NORMAL;

    var _keyboardMode = IMEMode.FULL_HIRAGANA;

    var _layoutPage = LAYOUT_PAGE_DEFAULT;

    // ** The following functions are compulsory functions in IME
    // and explicitly called in `keyboard.js` **
    //
    this.init = function ime_init(options) {
      //debug('init');
      _glue = options;
    };

    this.uninit = function ime_uninit() {
      if (_dict) {
        _dict.uninit();
        _dict = null;
      }
      self.empty();
    };

    this.click = function ime_click(keyCode) {
      if (_layoutPage !== LAYOUT_PAGE_DEFAULT) {
        _glue.sendKey(keyCode);
        return;
      }
      //debug('click ' + keyCode);
      // push keyCode to working queue
      qPush(keyCode);
      qNext();
    };

    this.setLayoutPage = function ime_setLayoutPage(page) {
      _layoutPage = page;
    };

    this.select = function ime_select(kanji, kana) {
      debug('select ' + kanji + ' ' + kana);
      sendString(kanji);

      _inputBuf.splice(0, kana.length);
      _selectedKanji = kanji;
      _selectedKana = kana;

      if (_inputBuf.length === 0) {
        _firstKana = '';
        _firstKanji = '';
        _keyMode = KeyMode.NORMAL;
      }

      // reset
      _previousKeycode = 0;

      qPush(0);
      qNext();
    };

    this.empty = function ime_empty() {
      debug('empty buffer.');
      _inputBuf = [];
      _selectedKanji = '';
      _selectedKana = '';
      _keyMode = KeyMode.NORMAL;
      _keyboardMode = IMEMode.FULL_HIRAGANA;
      _previousKeycode = 0;

      sendPendingSymbols();
      _qIsWorking = false;
      if (!_dict) {
        initDB();
      }
    };

    this.activate = function ime_activate(language, state, options) {
      var inputType = state.type;
      debug('Activate. Input type: ' + inputType);
      var layout = IMELayouts.JP;
      if (inputType === '' || inputType === 'text' ||
          inputType === 'textarea') {
        layout = _currLayout;
      }

      _glue.alterKeyboard(layout);
    };


    /** BEGIN QUEUE **/
    // A *queue* contains all keys pressed
    var _keyQueue = [];
    var _qIsWorking = false;

    var qPush = function queue_push(code) {
        _keyQueue.push(code);
    };

    // Start to pop key code from queue
    // All logic is in `handleSpecialKey` and `handleNormalKey`
    var qNext = function queue_next() {

      debug('start queue working');

      if (_qIsWorking) {
        debug('queue is working. wait');
        return;
      }

      _qIsWorking = true;

      if (!_dict) {
        debug('DB has not initialized, defer processing.');
        initDB(qNext.bind(self));
        return;
      }

      if (!_keyQueue.length) {
        debug('queue is empty');
        _qIsWorking = false;
        return;
      }

      // pop key code from queue
      var code = _keyQueue.shift();
      debug('queue pops key ' + String.fromCharCode(code));

      if (handleSpecialKey(code) || handleNormalKey(code)) {
      }

      // FIXME do we need this?
      // pass the key to IMEManager for default action
      // and run `qNext` again before exiting
      //_glue.sendKey(code);

      _qIsWorking = false;
      qNext();
    };
    /** END QUEUE **/

    var handleNormalKey = function ime_handleNormalKey(code) {
      var kana = String.fromCharCode(code);
      debug('handleNormalKey ' + kana);

      // set keymode
      _keyMode = KeyMode.NORMAL;

      // push kana directly if previoius key is NEXT
      if (_previousKeycode === IMESpecialKey.NEXT) {
        _previousKeycode = code;
        _inputBuf.push(kana);
        handleInputBuf();
        return 1;
      }

      // append new key code to the end of `_inputBuf`
      // and begin to deal with the new buf
      if (!(kana in IMEKeyMap)) {
        sendString(kana);
        return 1;
      }
      if (_previousKeycode !== IMESpecialKey.BACK &&
          !(String.fromCharCode(_previousKeycode) in IMEKeyMap)) {
        _inputBuf.push(kana);

      } else {
        var prevKana = _inputBuf[_inputBuf.length - 1];
        var nextKeyInfo = getNextKeyInfo(prevKana, kana);

        if (nextKeyInfo[0]) {
          _inputBuf[_inputBuf.length - 1] = nextKeyInfo[1];
        } else {
          _inputBuf.push(nextKeyInfo[1]);
        }
      }

      handleInputBuf();
      _previousKeycode = code;
      return 1;
    };

    var handleSpecialKey = function ime_handleSpecialKey(code) {

      var immiReturn = true;

      switch (code) {

        case KeyEvent.DOM_VK_SPACE:
          _glue.sendKey(code);
          break;

        case 0:
          // This is a select function operation.
          handleInputBuf();
          break;

        // cycle the IMEHiraganaCycleTable in reversal direction
        // Ex.
        //   ['あ', 'い', 'う', 'え', 'お', 'ぁ', 'ぃ', 'ぅ', 'ぇ', 'ぉ']
        //   is the cycle table of あ
        //   あ will be displayed when user click BACK
        //   while い is the current char
        case IMESpecialKey.BACK:
          var info = getPreviousKeyInfo(_inputBuf[_inputBuf.length - 1]);
          if (info[0]) {
            _inputBuf[_inputBuf.length - 1] = info[1];
          }
          handleInputBuf();
          break;

        case IMESpecialKey.PREVIOUS:
          if (_keyMode === KeyMode.NORMAL && _inputBuf.length > 0) {
            _keyMode = KeyMode.SELECT;
            handlePorN(_inputBuf);
            break;
          }

          if (_firstKana.length === 1) {
            _keyMode = KeyMode.NORMAL;
            handleInputBuf();
            break;
          }

          if (_keyMode === KeyMode.SELECT || _keyMode === KeyMode.TRANSFORM) {
            handlePorN(_inputBuf.slice(0, _firstKana.length - 1));

          } else if (_keyMode === KeyMode.H2K) {
            handleH2K(_inputBuf.slice(0, _firstKana.length - 1));
          }
          break;

        case IMESpecialKey.NEXT:
          if (_keyMode === KeyMode.NORMAL && _inputBuf.length > 0) {
            //_keyMode = KeyMode.SELECT;
            //handlePorN(_inputBuf.slice(0, 1));
            break;
          }

          if (_firstKana.length === _inputBuf.length) {
            _keyMode = KeyMode.NORMAL;
            handleInputBuf();
            break;
          }

          if (_keyMode === KeyMode.SELECT || _keyMode === KeyMode.TRANSFORM) {
            handlePorN(_inputBuf.slice(0, _firstKana.length + 1));
          } else if (_keyMode === KeyMode.H2K) {
            handleH2K(_inputBuf.slice(0, _firstKana.length + 1));
          }
          break;

        // Transform key
        case IMESpecialKey.TRANSFORM:
          if (_keyMode === KeyMode.TRANSFORM &&
              _previousKeycode !== IMESpecialKey.TRANSFORM) {
            break;
          }
          if (_inputBuf.length === 0) {
            _glue.sendKey(KeyEvent.DOM_VK_SPACE);
            break;
          }

          _keyMode = KeyMode.TRANSFORM;
          handleTransform();
          break;

        // Hiragana, full-width katakana and half-width katakana convertor
        case IMESpecialKey.H2K:
          if (_inputBuf.length === 0) {
            break;
          }

          if (_keyMode === KeyMode.H2K) {
            _keyMode = KeyMode.SELECT;
            handlePorN(_inputBuf.slice(0, _firstKana.length));
          } else if (_keyMode === KeyMode.NORMAL) {
            _keyMode = KeyMode.H2K;
            _firstKanji = SyllableUtils.arrayToString(_inputBuf);
            _firstKana = _firstKanji;
            handleH2K(_inputBuf.slice(0, _firstKana.length));
          } else if (_keyMode === KeyMode.TRANSFORM ||
                     _keyMode === KeyMode.SELECT) {
            _keyMode = KeyMode.H2K;
            handleH2K(_inputBuf.slice(0, _firstKana.length));
          }

          break;

        // 大 <-> 小
        case IMESpecialKey.CASE_CHANGE:
          debug('case change');
          var last = _inputBuf[_inputBuf.length - 1];
          var res = IMEHiraganaCaseTable[last];
          if (!res) {
            res = IMEFullKatakanaCaseTable[last];
          }
          if (!res) {
            res = IMEHalfKatakanaCaseTable[last];
            break;
          }
          if (!res) {
            break;
          }
          _inputBuf[_inputBuf.length - 1] = res;
          handleInputBuf();
          break;

        case IMESpecialKey.CAPSLOCK:
          if (_currLayout === IMELayouts.EN) {
            alterKeyboard(IMELayouts['EN-CAPS']);
          } else {
            alterKeyboard(IMELayouts.EN);
          }
          break;

        // Switch to basic layout
        case IMESpecialKey.BASIC_LAYOUT:
          alterKeyboard(IMELayouts.JP);
          break;

        // Switch to english layout
        case IMESpecialKey.EN_LAYOUT:
          alterKeyboard(IMELayouts.EN);
          break;

        // Switch to number layout
        case IMESpecialKey.NUM_LAYOUT:
          alterKeyboard(IMELayouts.NUM);
          break;

        // Default key event
        case KeyEvent.DOM_VK_RETURN:
          handleReturn();
          break;

        // Default key event
        case KeyEvent.DOM_VK_BACK_SPACE:
          handleBackspace();
          break;

        //
        case IMESpecialKey.MARK:
          debug(_inputBuf.length);
          if (_inputBuf.length !== 0) {
            sendString(SyllableUtils.arrayToString(_inputBuf));
            _inputBuf = [];
            _firstKana = '';
            _firstKanji = '';
            sendPendingSymbols();
          }
          if (_previousKeycode === IMESpecialKey.MARK &&
              _candidateList[0] === '、') {
            _candidateList = IMEHalfWidthCharactorCandidateList;
          } else {
            _candidateList = IMEFullWidthCharactorCandidateList;
          }
          updateCandidateList(qNext.bind(self));
          break;

        default:
          immiReturn = false;
          break;
      }


      if (immiReturn) {
        _previousKeycode = code;
        return 1;
      }

      _keyMode = KeyMode.NORMAL;
      _keyboardMode = IMEMode.FULL_HIRAGANA;

      // Ignore key code less than 0
      // except those special code above
      if (code <= 0) {
        debug('ignore meaningless key code <= 0');
        return 1;
      }

      return 0;

    };

    var alterKeyboard = function ime_alterKeyboard(layout) {
      _currLayout = layout;
      self.empty();
      _glue.alterKeyboard(layout);
    };

    var handleH2K = function ime_handleH2K(kanaArr) {
      debug('handleH2K ' + kanaArr);
      // Send pending symbols to highlight `_firstKanji`
      _firstKanji = SyllableUtils.arrayToString(kanaArr);
      _firstKana = SyllableUtils.arrayToString(kanaArr);
      sendPendingSymbols();

      updateCandidateList(qNext.bind(self));
    };

    var handlePorN = function ime_handlePorN(kanaArr) {
      debug('handlePorN ' + kanaArr);

      var __getTermsCallback1 = function handlePorN_getTermsCallback1(terms) {
        if (terms.length) {
          _firstKana = terms[0].kana;
          _firstKanji = terms[0].kanji;
        } else {
          _firstKana = SyllableUtils.arrayToString(kanaArr);
          _firstKanji = SyllableUtils.arrayToString(kanaArr);
        }
      };

      var __getTermsCallback2 = function handlePorN_getTermsCallback2(terms) {
        var candidates = [];

        terms.forEach(function readTerm(term) {
          candidates.push([term.kanji, term.kana]);
        });

        if (!candidates.length) {
          candidates.push([_firstKanji, _firstKana]);
        }

        _candidateList = candidates.slice();
        return;
      };

      // update _firstKana and _firstKanji
      _dict.getTerms(kanaArr, __getTermsCallback1);

      debug('firstTerm  ' + _firstKanji + ' ' + _firstKana);

      // Send pending symbols to highlight `_firstKana`
      sendPendingSymbols();

      // get candidates by _firstKana
      _dict.getTerms(SyllableUtils.arrayFromString(_firstKana),
                     __getTermsCallback2);

      updateCandidateList(qNext.bind(self));
    };

    var handleReturn = function ime_handleReturn() {
      if (_keyMode === KeyMode.TRANSFORM) {
        if (_firstKana === 0) {
          return;
        }

        debug('handle return in transform mode or select mode');
        // select first term
        sendString(_firstKanji);
        _inputBuf.splice(0, _firstKana.length);

        // query to generate first term
        queryDict();

        // do exactly like transforming
        handleTransform();
        return;

      } else if (_keyMode === KeyMode.H2K) {
        var mode = -1;
        if (_keyboardMode === IMEMode.FULL_HIRAGANA) {
          mode = IMEMode.HALF_KATAKANA;
        } else if (_keyboardMode === IMEMode.FULL_KATAKANA) {
          mode = IMEMode.FULL_HIRAGANA;
        } else if (_keyboardMode === IMEMode.HALF_KATAKANA) {
          mode = IMEMode.FULL_KATAKANA;
        }
        sendString(_getPossibleStrings(mode)[0]);
        _inputBuf = [];
        _candidateList = [];
        _keyboardMode = IMEMode.FULL_HIRAGANA;
        _keyMode = KeyMode.NORMAL;
        sendPendingSymbols();
        updateCandidateList(qNext.bind(self));

      } else if (_keyMode === KeyMode.SELECT) {
        if (_firstKana === 0) {
          return;
        }

        debug('handle return in transform mode or select mode');
        // select first term
        sendString(_firstKanji);
        _inputBuf.splice(0, _firstKana.length);

        // query to generate first term
        queryDict();

        handlePorN(_inputBuf.slice(0, _firstKana.length));
        return;

      } else {
        if (_firstKana.length > 0) {
          debug('first term ' + _firstKanji + ' ' + _firstKana);
          sendString(_firstKanji);
          _inputBuf.splice(0, _firstKana.length);
          handleInputBuf();

        } else {
          _glue.sendKey(KeyEvent.DOM_VK_RETURN);
        }
      }
    };

    var handleBackspace = function ime_handleBackspace() {
      debug('Backspace key');

      if (_inputBuf.length === 0) {
        _firstKana = '';
        _firstKanji = '';
        _candidateList = [];

        // pass the key to IMEManager for default action
        _glue.sendKey(KeyEvent.DOM_VK_BACK_SPACE);
        handleInputBuf();
        return;
      }

      _inputBuf.pop();
      handleInputBuf();
    };

    var handleTransform = function ime_handleTransform() {
      debug('handleTransform');

      if (!_inputBuf.length) {
        debug('empty input buf, return');
        handleInputBuf();
        return;
      }

      // Send pending symbols to highlight `_firstKana`
      sendPendingSymbols();

      debug('firstTerm  ' + _firstKanji + ' ' + _firstKana);

      // get candidates by _firstKana
      var __getTermsCallback =
        function handleTransform_getTermsCallback(terms) {

        var candidates = [];

        terms.forEach(function readTerm(term) {
          candidates.push([term.kanji, term.kana]);
        });

        if (!candidates.length) {
          candidates.push([_firstKanji, _firstKana]);
        }

        _candidateList = candidates.slice();
        return;
      };

      // only query `_firstKana`
      _dict.getTerms(SyllableUtils.arrayFromString(_firstKana),
                     __getTermsCallback);

      updateCandidateList(qNext.bind(self));
    };

    // query, update pending symbols and candidate syllables
    // these three processes normally conbind as one
    var handleInputBuf = function ime_handleInputBuf() {
      queryDict();
    };

    // Query dict, result will be used in sendPendingSymbols
    //  and updateCandidateList
    var queryDict = function ime_queryDict() {

      var candidates = [];

      if (_inputBuf.length === 0) {
        if (_selectedKana.length) {
          debug('Buffer is empty; ' +
            'make suggestions based on select term.' + _selectedKanji);

          var kana = _selectedKana;
          var kanji = _selectedKanji;
          _selectedKana = '';
          _selectedKanji = '';
          _candidateList = [];
          _keyMode = KeyMode.NORMAL;

          // TODO
          _dict.getSuggestions(kana, kanji,
            function(suggestions) {
              suggestions.forEach(
                function suggestions_forEach(suggestion) {
                  candidates.push(
                    [suggestion.kanji.substr(kanji.length),
                     kana]);
                }
              );
              _candidateList = candidates.slice();
            }
          );

          sendPendingSymbols();
          updateCandidateList(qNext.bind(self));
          return;
        }

        debug('Buffer is empty; send empty candidate list.');
        _firstKana = '';
        _firstKanji = '';
        _candidateList = [];
        sendPendingSymbols();
        updateCandidateList(qNext.bind(self));
        return;
      }

      // reset
      _selectedKanji = '';
      _selectedKana = '';

      debug('Get term candidates for the entire buffer.');

      var __getTermsCallback = function queryDict_getTermsCallback(terms) {
        debug('queryDict getTermsCallback');

        var kanaStr = SyllableUtils.arrayToString(_inputBuf);

        if (terms.length !== 0) {
          _firstKanji = terms[0].kanji;
          _firstKana = terms[0].kana;

          terms.forEach(function readTerm(term) {
            candidates.push([term.kanji, term.kana]);
          });
        }

        // only one kana in buf
        if (_inputBuf.length === 1) {
          debug('Only one kana; skip other lookups.');

          if (!candidates.length) {
            candidates.push([kanaStr, kanaStr]);
          }

          _candidateList = candidates.slice();
          sendPendingSymbols();
          updateCandidateList(qNext.bind(self));
          return;
        }

        var __getSentenceCallback = function getSentenceCallback(sentence) {
          // sentence = [term, term]

          debug('getSentenceCallback:' + JSON.stringify(sentence));

          if (sentence.length !== 0) {

            var sentenceKana = '';
            var sentenceKanji = '';

            var i;

            for (i = 0; i < sentence.length; i++) {
              sentenceKanji += sentence[i].kanji;
              sentenceKana += sentence[i].kana;
            }

            var kanaStr = SyllableUtils.arrayToString(_inputBuf);

            // look for candidate that is already in the list
            var exists = candidates.some(function sentenceExists(candidate) {
              return (candidate[0] === sentenceKanji);
            });

            if (!exists) {
              candidates.push([sentenceKanji, sentenceKana]);
            }
          }

          // The remaining candidates doesn't match the entire buffer
          // these candidates helps user find the exact character/term
          // s/he wants
          // The remaining unmatched kanas will go through lookup
          // over and over until the buffer is emptied.
          i = Math.min(_dictMaxPredictLength, _inputBuf.length - 1);

          var ___findTerms = function lookupFindTerms() {
            debug('Lookup for terms that matches first ' + i + ' kanas.');

            var subBuf = _inputBuf.slice(0, i);

            _dict.getTerms(subBuf, function lookupCallback(terms) {
              terms.forEach(function readTerm(term) {
                if (_firstKana.length === 0) {
                  _firstKana = term.kana;
                  _firstKanji = term.kanji;
                }
                candidates.push([term.kanji, term.kana]);
              });

              if (i === 1 && !terms.length) {
                debug('The first kana does not make up a word,' +
                  ' output the symbol.');
                candidates.push([kanaStr, kanaStr]);
              }

              if (!--i) {
                debug('Done Looking.');
                _candidateList = candidates.slice();
                sendPendingSymbols();
                updateCandidateList(qNext.bind(self));
                return;
              }

              ___findTerms();
              return;
            });
          };

          ___findTerms();
        };

        debug('Lookup for sentences that make up from the entire buffer');

        _dict.getSentence(_inputBuf, __getSentenceCallback);
      };

      _dict.getTerms(_inputBuf, __getTermsCallback);

    };

    var _getPossibleStrings = function ime_getPossibleStrings(mode) {

      //
      var table;
      if (mode === IMEMode.FULL_HIRAGANA) {
        table = IMEFullKatakanaCycleTable;
      } else if (mode === IMEMode.FULL_KATAKANA) {
        table = IMEHalfKatakanaCycleTable;
      } else if (mode === IMEMode.HALF_KATAKANA) {
        table = IMEHiraganaCycleTable;
      }

      var i;
      var strFullKatakana = '';
      var strHalfKatakana = '';
      var strFullHiragana = '';
      var displayStr = '';

      for (i = 0; i < _firstKana.length; i++) {
        var info = getPosInfoByChar(_firstKana[i]);
        debug('get info ' + info[0] + '  ' + info[1]);
        if (info[0] === -1) {
          // FIXME see bug list 1
          return ['', '', '', ''];
        }
        displayStr += table[info[0]][info[1]];

        strFullHiragana += IMEHiraganaCycleTable[info[0]][info[1]];
        strFullKatakana += IMEFullKatakanaCycleTable[info[0]][info[1]];
        strHalfKatakana += IMEHalfKatakanaCycleTable[info[0]][info[1]];
      }

      return [displayStr, strFullHiragana, strFullKatakana, strHalfKatakana];
    };

    // Send string to input field
    var sendString = function ime_sendString(text) {
      _glue.setComposition('');
      _glue.endComposition(text);
    };

    // Send pending symbols to display
    var sendPendingSymbols = function ime_sendPendingSymbols() {


      var bufStr = SyllableUtils.arrayToString(_inputBuf);

      debug('sending pending symbols: ' + bufStr);

      if (_inputBuf.length === 0) {
        _glue.endComposition();
        return;
      }

      if (_keyMode === KeyMode.NORMAL) {
        _glue.setComposition(bufStr);
        return;

      } else if (_keyMode === KeyMode.TRANSFORM) {

        if (_firstKanji.length === 0) {
          _keyMode = KeyMode.NORMAL;

        } else {
          // XXX: New composition APIs don't support changing the style of
          // composition string so we left the previous statements here to
          // remind us of the original design.

          // _glue.sendPendingSymbols(bufStr, 0, _firstKana.length, 'blue');
          _glue.setComposition(bufStr);
        }

        return;
      } else if (_keyMode === KeyMode.SELECT) {

        if (_firstKanji.length === 0) {
          _keyMode = KeyMode.NORMAL;

        } else {
          //_glue.sendPendingSymbols(bufStr, 0, _firstKana.length, 'green');
          _glue.setComposition(bufStr);
        }

        return;
      } else if (_keyMode === KeyMode.H2K) {

        var strs = _getPossibleStrings(_keyboardMode);
        var candidates = [];
        //_glue.sendPendingSymbols(bufStr, 0, strs[1].length, 'red');
        _glue.setComposition(bufStr);

        // candidate list is updated here
        // to avoide loop again in `handleInputBuf`
        // TODO reorder these three candidates
        candidates.push([_firstKana, _firstKana]);
        candidates.push([strs[2], _firstKana]);
        candidates.push([strs[3], _firstKana]);

        _candidateList = candidates.slice();
        return;
      }

      _glue.setComposition(bufStr);
    };

    // Update candidate list
    var updateCandidateList = function ime_updateCandidateList(callback) {
      debug('update candidate list');

      _glue.sendCandidates(_candidateList);
      callback();
    };


    // Get json and init indexedDB if possible
    var initDB = function ime_initDB(readyCallback) {
      var dbSettings = {
        enableIndexedDB: _enableIndexedDB
      };

      if (readyCallback) {
        dbSettings.ready = readyCallback;
      }

      var jsonUrl = _glue.path + '/dict.json';
      _dict = new IMEngineDatabase('jskanji', jsonUrl);
      _dict.init(dbSettings);
    };

  };

  var jskanji = new IMEngine(self);

  // Expose as an AMD module
  if (typeof define === 'function' && define.amd) {
    define('jskanji', [], function() { return jskanji; });
  }

  // Expose the engine to the Gaia keyboard
  if (typeof InputMethods !== 'undefined') {
    InputMethods.jskanji = jskanji;
  }

  /* copy from jszhuyin */
  var debugging = false;
  var debug = function(str) {
    if (!debugging) {
      return;
    }

    if (window.dump) {
      window.dump('JP: ' + str + '\n');
    }

    if (console && console.log) {
      console.log('JP: ' + str);
      if (arguments.length > 1) {
        console.log.apply(this, arguments);
      }
    }
  };

  // for non-Mozilla browsers
  if (!KeyEvent) {
    var KeyEvent = {
      DOM_VK_BACK_SPACE: 0x8,
      DOM_VK_RETURN: 0xd,
      DOM_VK_SPACE: 0x20
    };
  }
  /* end copy */

  var SyllableUtils = {
    /**
     * Converts a syllables array to a string.
     * For example, ['わ', 'た', 'し'] will be converted to 'わたし'.
     */
    arrayToString: function syllableUtils_arrayToString(array) {
      return array.join('');
    },

    /**
     * Converts a syllables string to an array.
     * For example, 'わたし' will be converted to ['わ', 'た', 'し'].
     */
    arrayFromString: function syllableUtils_arrayFromString(str) {
      return str.split('');
    }
  };

  var Term = function term_constructor(kana, freq, kanji) {
    this.kana = kana;
    this.freq = freq;
    this.kanji = kanji;
  };

  Term.prototype = {
    /*The actual string of the term */
    kana: '',
    /* The frequency of the term*/
    freq: 0,
    kanji: ''
  };

  /**
   * Terms with same kana
   */
  var Homonyms = function homonyms_constructor(kana, terms) {
    this.kana = kana;

    // Clone a new array
    this.terms = terms.concat();
  };

  Homonyms.prototype = {
    kana: '',
    // Terms array
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
     * @param {String} lower The lower bound of the key range.
     * If null, the range has no lower bound.
     * @param {String} upper The upper bound of the key range.
     * If null, the range has no upper bound.
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
     * If the key is between two adjacent keys, returns the average index
     * of the two keys. If the key is out of bounds,
     * returns Infinity or -Infinity.
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
     * Callback Javascript function object that is called when the task queue
     * is empty. The definition of callback is function oncomplete(queueData).
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
     * @param {Function} taskFunc Task function object. The definition
     * is function taskFunc(taskQueue, taskData).
     * The taskQueue parameter is the task queue object itself,
     * while the taskData
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
     * @param {Function} callback Javascript function object that is called
     * when the operation is finished. The definition of callback is
     * function callback(statusCode). The statusCode parameter is of type
     * DatabaseStorageBase.StatusCode that stores the status of the storage
     * after Initialization.
     */
    init: function storagebase_init(callback) {
    },

    /**
     * Destruction.
     * @param {Function} callback Javascript function object that is called
     * when the operation is finished.
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
    getTermsByKana: function storagebase_getTermsByKana(
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
    getTermsByKanaPrefix: function storagebase_getTermsByKanaPrefix(
                              prefix, callback) {
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

    _kanaIndex: null,

    _abrreviatedIndex: null,

    init: function jsonStorage_init(callback) {
      var self = this;
      var doCallback = function init_doCallback() {
        if (callback) {
          callback(self._status);
        }
      };
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

    uninit: function jsonStorage_uninit(callback) {
      var doCallback = function uninit_doCallback() {
        if (callback) {
          callback();
        }
      };

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

    isEmpty: function jsonStorage_isEmpty() {
      return this._dataArray.length == 0;
    },

    getAllTerms: function jsonStorage_getAllTerms(callback) {
      var self = this;
      var homonymsArray = [];
      var doCallback = function getAllTerms_doCallback() {
        if (callback) {
          callback(homonymsArray);
        }
      };

      // Check if the storage is ready.
      if (!this.isReady()) {
        doCallback();
        return;
      }

      var perform = function getAllTerms_perform() {
        // Query all terms
        homonymsArray = homonymsArray.concat(self._dataArray);
        doCallback();
      };

      setTimeout(perform, 0);
    },

    getTermsByKana: function jsonStorage_getTermsByKana(kanaStr, callback) {
      var self = this;
      var homonymsArray = [];
      var doCallback = function getTermsByKana_doCallback() {
        if (callback) {
          callback(homonymsArray);
        }
      };

      // Check if the storage is ready.
      if (!this.isReady()) {
        doCallback();
        return;
      }

      var perform = function getTermsByKana_perform() {
        var indices = self._kanaIndex.get(kanaStr);
        for (var i = 0; i < indices.length; i++) {
          var index = indices[i];
          homonymsArray.push(self._dataArray[index]);
        }
        doCallback();
      };

      setTimeout(perform, 0);
    },

   getTermsByKanaPrefix: function
     jsonStorage_getTermsByKanaPrefix(prefix, callback) {
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
           String.fromCharCode(prefix.substr(prefix.length - 1
                                             ).charCodeAt(0) + 1);
         var indices =
           self._kanaIndex.getRange(prefix, upperBound, false, false);
         for (var i = 0; i < indices.length; i++) {
           var index = indices[i];
           homonymsArray.push(self._dataArray[index]);
         }
         doCallback();
       };

       setTimeout(perform, 0);
     },

   _buildIndices: function jsonStorage_buildIndices() {
     this._kanaIndex = new Index(this._dataArray, 'kana');
   }
  };


  // **Interfaces of indexedDB**
  var IndexedDB = {
    indexedDB: window.indexedDB || window.webkitIndexedDB ||
      window.mozIndexedDB || window.msIndexedDB,

    IDBDatabase: window.IDBDatabase || window.webkitIDBDatabase ||
      window.msIDBDatabase,

    IDBIndex: window.IDBIndex || window.webkitIDBIndex || window.msIDBIndex,

    // Check if the indexedDB is available on this platform
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
  /* end IndexedDB */

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
            { keyPath: 'kana' });

        // no callback() here
        // onupgradeneeded will follow by onsuccess event
      };

      req.onsuccess = function dbopenSuccess(ev) {
        debug('IndexedDB opened.');
        self._IDBDatabase = ev.target.result;

        self._status = DatabaseStorageBase.StatusCode.READY;
        self._count = 0;

        // Check the integrity of the storage
        self.getTermsByKana('_last_entry_',
          function getLastEntryCallback(homonymsArray) {
            if (homonymsArray.length === 0) {
              debug('IndexedDB is broken.');
              // Could not find the '_last_entry_' element.
              // The storage is broken
              // and ignore all the data.
              doCallback();
              return;
            }

            var transaction = self._IDBDatabase.transaction(['homonyms'],
                                                            'readonly');
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

    isEmpty: function indexedDBStorage_isEmpty() {
      return this._count == 0;
    },

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
          if (homonyms.kana != '_last_entry_') {
            homonymsArray.push(homonyms);
          }
          cursor.continue();
        } else {
          doCallback();
        }
      };
    },

    setAllTerms: function indexedDBStorage_setAllTerms(homonymsArray,
                                                       callback) {
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
        if (end === n - 1) {
          debug('=======================');
          store.put(new Homonyms('_last_entry_', []));
          //throw('jdkdkdjd');
        }
      };

      taskQueue.push(clearAll, null);

      for (var begin = 0; begin < n; begin += 2000) {
        var end = Math.min(begin + 1999, n - 1);
        taskQueue.push(addChunk, {begin: begin, end: end});
      }

      processNextWithDelay();
    },

    getTermsByKana: function indexedDBStorage_getTermsByKana(syllablesStr,
                                                             callback) {
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
    /* getTermsByKana */

    getTermsByKanaPrefix: function indexedDBStorage_getTermsByKanaPrefix(
                              prefix, callback) {
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
    }
  };

  // ** IMEngineDatabase is exposed to IME **
  // It contains both instances of `jsonStorage` and `indexedDBStorage`
  // Query processes in indexedDBStorage if possible, otherwise in jsonStorage
  var IMEngineDatabase = function imedb(dbName, jsonUrl) {
    var settings;

    // Dictionary words' total frequency.
    var kDictTotalFreq = 770216270;

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

    // return instance of indexedDBStorage if possible
    //        otherwise jsonStorage
    //        null if neither is not available
    var _getUsableStorage = function imedb__getUsableStorage() {
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

    // syllables kana
    // textStr kanji
    // callback Function
    this.getSuggestions = function imedb_getSuggestions(kanaStr, kanjiStr,
                                                        callback) {
      debug('getSuggestions ' + kanjiStr + ' ' + kanaStr);
      var storage = _getUsableStorage();
      if (!storage) {
        debug('Database not ready.');
        callback([]);
        return;
      }

      var result = [];

      var _matchTerm = function getSuggestions_matchTerm(term) {
        if (term.kanji.substr(0, kanjiStr.length) !== kanjiStr)
          return;
        if (term.kanji === kanjiStr)
          return;
        result.push(term);
      };

      var _processResult = function getSuggestions_processResult(r) {
        r = r.sort(
            function getSuggestions_sort(a, b) {
              return (a.freq - b.freq);
            }
            );
        var result = [];
        var t = [];
        r.forEach(function terms_foreach(term) {
          if (t.indexOf(term.kanji) !== -1) return;
          t.push(term.kanji);
          result.push(term);
        });
        return result;
      };

      var result = [];

      debug('Get suggestion for ' + kanjiStr + '.');

      if (typeof iDBCache['SUGGESTION:' + kanjiStr] !== 'undefined') {
        debug('Found in iDBCache.');
        cacheSetTimeout();
        callback(iDBCache['SUGGESTION:' + kanjiStr]);
        return;
      }

      // by prefix
      storage.getTermsByKanaPrefix(kanaStr,
        function getTermsByKanaPrefix_callback(homonymsArray) {

        for (var i = 0; i < homonymsArray.length; i++) {
          var homonyms = homonymsArray[i];
          homonyms.terms.forEach(_matchTerm);
        }
        if (result.length) {
          result = _processResult(result);
        } else {
          result = [];
        }
        cacheSetTimeout();
        iDBCache['SUGGESTION:' + kanjiStr] = result;
        callback(result);
      });

    };
    /* end getSuggestions */

    this.getTerms = function imedb_getTerms(kanaArr, callback) {

      var storage = _getUsableStorage();
      if (!storage) {
        debug('Database not ready.');
        callback([]);
        return;
      }

      var kanaStr = SyllableUtils.arrayToString(kanaArr);
      debug('Get terms for ' + kanaStr + '.');

      var _processResult = function processResult(r, limit) {
        r = r.sort(
          function sort_result(a, b) {
            return (a.freq - b.freq);
          }
        );
        var result = [];
        var t = [];
        r.forEach(function(term) {
          if (t.indexOf(term.kanji) !== -1) return;
          t.push(term.kanji);
          result.push(term);
        });
        if (limit > 0) {
          result = result.slice(0, limit);
        }
        return result;
      };

      if (typeof iDBCache[kanaStr] !== 'undefined') {
        debug('Found in iDBCache.');
        cacheSetTimeout();
        callback(iDBCache[kanaStr]);
        return;
      }

      storage.getTermsByKana(kanaStr,
        function(homonymsArray) {
          var result = [];
          for (var i = 0; i < homonymsArray.length; i++) {
            var homonyms = homonymsArray[i];
            result = result.concat(homonyms.terms);
          }
          if (result.length) {
            result = _processResult(result, -1);
          } else {
            result = [];
          }
          cacheSetTimeout();
          iDBCache[kanaStr] = result;
          callback(result);
        }
      );

    };
    /* end getTerms */

    this.getTermWithHighestScore =
      function imedb_getTermWithHighestScore(syllables, callback) {

      debug('getTermWithHighestScore ' + syllables);
      self.getTerms(syllables,
        function getTermsCallback(terms) {
          if (terms.length == 0) {
            debug('no terms');
            callback(false);
            return;
          }
          callback(terms[0]);
        }
      );
    };
    /* end getTermWithHighestScore */

    // sentence is a list of terms
    this.getSentence = function imedb_getSentence(kanaArr, callback) {
      debug('getSentence ' + kanaArr);
      var self = this;

      var doCallback = function getSentence_doCallback(sentence) {
        if (callback) {
          callback(sentence);
        }
      };

      var n = kanaArr.length;

      if (n == 0) {
        callback([]);
      }

      var taskQueue = new TaskQueue(
        function taskQueueOnCompleteCallback(queueData) {
          var sentences = queueData.sentences;
          var sentence = sentences[sentences.length - 1];
          doCallback(sentence);
        }
      );

      taskQueue.data = {
        sentences: [[], []],
        probabilities: [0, MAX_FREQUENCY],
        sentenceLength: 1,
        lastPhraseLength: 1
      };

      var getSentenceSubTask = function getSentence_subTask(taskQueue,
                                                            taskData) {
        var queueData = taskQueue.data;
        var sentenceLength = queueData.sentenceLength;
        var lastPhraseLength = queueData.lastPhraseLength;
        var sentences = queueData.sentences;
        var probabilities = queueData.probabilities;

        if (probabilities.length < sentenceLength + 1) {
          probabilities.push(MAX_FREQUENCY);
        }
        if (sentences.length < sentenceLength + 1) {
          sentences.push([]);
        }
        var maxProb = probabilities[sentenceLength];
        var s = kanaArr.slice(sentenceLength -
            lastPhraseLength, sentenceLength);

        self.getTermWithHighestScore(s,
          function getTermWithHighestScoreCallback(term) {
            var syllable = s.join('');

            if (!term) {
              term = {kanji: syllable, freq: MAX_FREQUENCY, kana: syllable};
            }

            var prob = probabilities[sentenceLength -
              lastPhraseLength] + term.freq;
            if (prob < probabilities[sentenceLength]) {
              probabilities[sentenceLength] = prob;
              sentences[sentenceLength] =
                sentences[sentenceLength - lastPhraseLength].concat(term);
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
    /* end getSentence */
  };
  /* end IMEngineDatabase */
})();

// TODO current bugs
// 1. little case hiragana cannot convert to katakana
// 2. getSuggestion
