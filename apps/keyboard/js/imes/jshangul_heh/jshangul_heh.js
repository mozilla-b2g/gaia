'use strict';

(function() {

  const KEY_RETURN = KeyEvent.DOM_VK_RETURN;
  const KEY_BACKSPACE = KeyEvent.DOM_VK_BACK_SPACE;
  const KEY_PERIOD = 257;
  const CHOSEONG_MAP_SZ = '까'.charCodeAt(0) - '가'.charCodeAt(0);
  const JUNGSEONG_MAP_SZ = '개'.charCodeAt(0) - '가'.charCodeAt(0);
  const SYLLABLES_BASE = '가'.charCodeAt(0);
  const JONGSEONG_BASE = 0x11a7;
  const S0 = 0, S1 = 1, S2 = 2, S3 = 3, S4 = 4;
  const PUNC_MARK = '.~?!';
  const ARAEA = 'ㆍ';
  const ARAEA2 = '：';
  const FIRST = 0, LAST = 1;

  var kb;
  var S1Q = [], S2Q = [], S3Q = [], S4Q = [];
  var syllableState;

  const choseongMap = {
    'ㄱ': 'ㄱ', 'ㄱㄱ': 'ㅋ', 'ㅋㄱ': 'ㄲ', 'ㄲㄱ': 'ㄱ',
    'ㄴ': 'ㄴ', 'ㄴㄴ': 'ㄹ', 'ㄹㄴ': 'ㄴ', 'ㄷ': 'ㄷ',
    'ㄷㄷ': 'ㅌ', 'ㅌㄷ': 'ㄸ', 'ㄸㄷ': 'ㄷ', 'ㅂ': 'ㅂ',
    'ㅂㅂ': 'ㅍ', 'ㅍㅂ': 'ㅃ', 'ㅃㅂ': 'ㅂ', 'ㅅ': 'ㅅ',
    'ㅅㅅ': 'ㅎ', 'ㅎㅅ': 'ㅆ', 'ㅆㅅ': 'ㅅ', 'ㅈ': 'ㅈ',
    'ㅈㅈ': 'ㅊ', 'ㅊㅈ': 'ㅉ', 'ㅉㅈ': 'ㅈ', 'ㅇ': 'ㅇ',
    'ㅇㅇ': 'ㅁ', 'ㅁㅇ': 'ㅇ'
  };

  const jungseongMap = {
    'ㆍ': 'ㆍ', 'ㆍㆍ': '：', '：ㆍ': 'ㆍ',
    'ㅣㆍ': 'ㅏ', 'ㅏㅣ': 'ㅐ', 'ㅏㆍ': 'ㅑ', 'ㅑㆍ': 'ㅏ',
    'ㅑㅣ': 'ㅒ', 'ㆍㅣ': 'ㅓ', 'ㅓㅣ': 'ㅔ', '：ㅣ' : 'ㅕ',
    'ㅕㅣ': 'ㅖ', 'ㆍㅡ': 'ㅗ', 'ㅜㆍ' : 'ㅠ', 'ㅠㆍ': 'ㅜ',
    'ㅚㆍ': 'ㅘ', '：ㅡ' : 'ㅛ', 'ㅘㅣ': 'ㅙ', 'ㅗㅣ': 'ㅚ',
    'ㅡㆍ': 'ㅜ', 'ㅠㅣ': 'ㅝ', 'ㅝㅣ': 'ㅞ', 'ㅜㅣ': 'ㅟ',
    'ㅡ': 'ㅡ', 'ㅡㅣ': 'ㅢ', 'ㅣ': 'ㅣ'
  };

  const jongseongMap = {
    'ㄱ': '\u11a8', 'ㄱㄱ': '\u11a9', 'ㄲ': '\u11a9',
    'ㄱㅅ': '\u11aa', 'ㄴ': '\u11ab', 'ㄴㅈ': '\u11ac',
    'ㄴㅎ': '\u11ad', 'ㄷ': '\u11ae', 'ㄹ': '\u11af',
    'ㄹㄱ': '\u11b0', 'ㄹㅁ': '\u11b1', 'ㄹㅂ': '\u11b2',
    'ㄹㅅ': '\u11b3', 'ㄹㅌ': '\u11b4', 'ㄹㅍ': '\u11b5',
    'ㄹㅎ': '\u11b6', 'ㅁ': '\u11b7', 'ㅂ': '\u11b8',
    'ㅂㅅ': '\u11b9', 'ㅅ': '\u11ba', 'ㅅㅅ': '\u11bb',
    'ㅆ': '\u11bb', 'ㅇ': '\u11bc', 'ㅈ': '\u11bd',
    'ㅊ': '\u11be', 'ㅋ': '\u11bf', 'ㅌ': '\u11c0',
    'ㅍ': '\u11c1', 'ㅎ': '\u11c2'
  };

  const choseongCode = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
  const jungseongCode = 'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ';

  function isMoum(chCode) {
    return 'ㆍㅣㅡ'.indexOf(chCode) < 0 ? 0 : 1;
  }

  function isJaum(chCode) {
    return !isMoum(chCode);
  }

  function findMapByCode(map, strCode) {
    var val = map[strCode];
    if (val == undefined) {
      return '';
    }
    return val;
  }

  function addQ(myQ, chCode) {
    myQ.push(chCode);
  }

  function changeQ(myQ, chCode) {
    myQ.pop();
    myQ.push(chCode);
  }

  function watchQ(myQ, position) {
    if (myQ.length < 1)
      return '';

    if (position != FIRST)
      position = myQ.length - 1;

    return myQ[position];
  }

  function doComposition(flushQ) {
    if (S1Q.length == 0 && S2Q.length == 0 && S3Q.length == 0) {
      return;
    }

    var str;
    var chCode;
    var s2q0 = S2Q[0];
    if (S1Q.length > 0 && S2Q.length > 0 && s2q0 != ARAEA && s2q0 != ARAEA2) {
      var intCode = SYLLABLES_BASE +
        choseongCode.indexOf(S1Q[0]) * CHOSEONG_MAP_SZ +
        jungseongCode.indexOf(s2q0) * JUNGSEONG_MAP_SZ;
      if (S3Q.length > 0) {
        chCode = findMapByCode(jongseongMap, S3Q.join(''));
        if (chCode != '') {
          intCode += chCode.charCodeAt(0) - JONGSEONG_BASE;
        } else if (S3Q.length > 1) {
          var j = findMapByCode(jongseongMap, S3Q[0]);
          if (j != '')
            intCode += j.charCodeAt(0) - JONGSEONG_BASE;
        }
      }

      str = String.fromCharCode(intCode);
      if (S3Q.length > 0 && chCode == '')
        str += watchQ(S3Q, LAST);
      if (S1Q.length > 1)
        str += S1Q[1];
      if (S2Q.length > 1)
        str += S2Q[1];
    } else {
      str = watchQ(S1Q, FIRST) + watchQ(S2Q, FIRST) + watchQ(S3Q, FIRST);
    }

    if (flushQ) {
      S1Q.shift();
      S2Q.shift();
      S3Q.shift(); S3Q.shift();
      kb.endComposition(str);
    } else {
      kb.setComposition(str);
    }
  }

  function updateJamo(myQ, myMap, chCode) {
    var strCode = watchQ(myQ, LAST) + chCode;
    var nextCode = findMapByCode(myMap, strCode);
    if (nextCode == '') {
      doComposition(1);
      addQ(myQ, chCode);
    } else {
      changeQ(myQ, nextCode);
    }
    doComposition(0);
  }

  function needSeperateJongseong() {
    return (S3Q.length > 0) ? true : false;
  }

  function handlePunctuation(chCode) {
    var putCode = (chCode == '.') ? kb.setComposition : kb.endComposition;

    switch (syllableState) {
      case S0:
        S4Q[0] = chCode;
        putCode(chCode);
        syllableState = S4;
        break;
      case S4:
        if (chCode == '.') {
          var idx = PUNC_MARK.indexOf(S4Q[0]);
          chCode = PUNC_MARK.charAt(++idx % PUNC_MARK.length);
          changeQ(S4Q, chCode);
          putCode(chCode);
        } else {
          putCode(S4Q.pop());
          if (isMoum(chCode)) {
            addQ(S2Q, chCode);
            syllableState = S2;
          } else {
            addQ(S1Q, chCode);
            syllableState = S1;
          }
          doComposition(0);
          return false;
        }
        break;
      default:
        doComposition(1);
        S4Q[0] = chCode;
        syllableState = S4;
        putCode(chCode);
        break;
    }
    return true;
  }

  function specialComb(strCode) {
    var specialMap = { 'ㄴㅅ': true, 'ㄹㅇ': true, 'ㄹㄷ': true,
      'ㄹㅂ': true, 'ㄹㅅ': true };
    if (specialMap[strCode] == undefined)
      return false;
    return true;
  }

  function handleJongseong(chCode) {
    var strCode = watchQ(S3Q, LAST) + chCode;
    var nextCode = findMapByCode(choseongMap, strCode);

    if (nextCode == '') {
      if (S3Q.length <= 1) {
        nextCode = findMapByCode(jongseongMap, strCode);
        if (nextCode != '' || specialComb(strCode)) {
          addQ(S3Q, chCode);
          doComposition(0);
          return;
        }
      }
      doComposition(1);
      addQ(S1Q, chCode);
      syllableState = S1;
    } else {
      changeQ(S3Q, nextCode);
    }
    doComposition(0);
  }

  function automataHEH(intCode, chCode) {
    switch (syllableState) {
      case S0:
        if (isMoum(chCode)) {
          addQ(S2Q, chCode);
          syllableState = S2;
        } else {
          addQ(S1Q, chCode);
          syllableState = S1;
        }
        doComposition(0);
        break;
      case S1:
        if (isMoum(chCode)) {
          addQ(S2Q, chCode);
          doComposition(0);
          syllableState = S2;
          break;
        }

        updateJamo(S1Q, choseongMap, chCode);
        break;
      case S2:
        if (isJaum(chCode)) {
          var strCode = watchQ(S2Q, LAST);
          if (S1Q.length == 0 || strCode == ARAEA || strCode == ARAEA2) {
            doComposition(1);
            S2Q.pop();
            addQ(S1Q, chCode);
            syllableState = S1;
          } else {
            addQ(S3Q, chCode);
            syllableState = S3;
          }
          doComposition(0);
          break;
        }

        if (needSeperateJongseong()) {
          var jongseong = S3Q.pop();
          var jungseong = S2Q.pop();
          doComposition(1);
          addQ(S1Q, jongseong);
          addQ(S2Q, jungseong);
        }

        updateJamo(S2Q, jungseongMap, chCode);
        break;
      case S3:
        switch (chCode) {
          case 'ㆍ':
            addQ(S2Q, chCode);
            doComposition(0);
            syllableState = S2;
            break;
          case 'ㅣ':
          case 'ㅡ':
            var jaum = S3Q.pop();
            doComposition(1);
            addQ(S1Q, jaum);
            addQ(S2Q, chCode);
            doComposition(0);
            syllableState = S2;
            break;
          default:
            handleJongseong(chCode);
            break;
        }
        break;
      default:
        reset();
        break;
    }
  }

  function reset() {
    syllableState = S0;
    S1Q = [];
    S2Q = [];
    S3Q = [];
    S4Q = [];
  }

  function handleBackspace(intCode) {
    switch (syllableState) {
      case S1:
      case S4:
        S1Q.pop();
        kb.endComposition('');
        syllableState = S0;
        break;
      case S2:
        S2Q.pop();
        doComposition(0);
        if (S2Q.length < 1)
          syllableState = S1;
        else
          syllableState = S3;
        break;
      case S3:
        S3Q.pop();
        doComposition(0);
        if (S3Q.length < 1)
          syllableState = S2;
        break;
      default:
        kb.sendKey(intCode);
        break;
    }
  }

  function flushAll() {
    doComposition(1);
    if (S4Q.length > 0) {
      kb.endComposition(S4Q.pop());
    }
  }

  function myClick(intCode, x, y) {
    if (intCode >= 0x0 && intCode <= 0xff) {
      if (intCode == KEY_BACKSPACE) {
        handleBackspace(intCode);
      } else {
        if (syllableState != S0) {
          flushAll();
          syllableState = S0;
          if (intCode == KEY_RETURN)
            kb.sendKey(intCode);
        } else {
          kb.sendKey(intCode);
        }
      }
      return;
    }

    var chCode = String.fromCharCode(intCode);
    if (intCode == KEY_PERIOD || syllableState == S4) {
      if (intCode == KEY_PERIOD)
        chCode = '.';
      handlePunctuation(chCode);
      return;
    }

    automataHEH(intCode, chCode);
  }

  function myEmpty() {
    flushAll();
    reset();
  }

  function myInit(keyboard) {
    kb = keyboard;
    reset();
  }

  function myActivate() {
    reset();
  }
  function myDeactivate() {
    reset();
  }

  InputMethods.jshangul_heh = {
    activate: myActivate,
    deactivate: myDeactivate,
    init: myInit,
    click: myClick,
    empty: myEmpty
  };
})();
