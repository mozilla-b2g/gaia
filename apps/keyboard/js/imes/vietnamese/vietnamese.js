/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* jshint moz:true */
/* jshint unused:true */
/* global InputMethods */
/* global KeyEvent */

// ==================================================================
// WARNING. THIS FUNCTION USES PRECOMPOSED UNICODE CHARACTERS IN
// STRING LITERALS. DO NOT NORMALIZE THIS FILE.
// IF YOU NORMALIZE THIS FILE, THE STRINGS WILL CHANGE AND THE
// PROGRAM WILL BREAK.
//
// The use of precomposed Unicode characters is deliberate. This
// IM outputs precomposed Vietnamese characters rather than
// using combining character sequences because Firefox OS
// has trouble rendering Vietnamese combining character sequences.
//
// I considered using Unicode escape sequences instead of the
// actual Vietnamese characters, but that would have made the code
// much harder to read, understand, and maintain. Furthermore, I
// don't think there's much risk that someone will normalize this
// file.
//
// Existing Javascript standards say that all strings should be
// normalized in NFC format. In practice, no Javascript interpreter
// does that, and nor should they. There is a proposal to remove
// that requirement from the next standard, partly out of consider-
// ation for languages like Vietnamese which usually aren't NFC
// normalized, and partly to reflect actual practice.
//
// http://wiki.ecmascript.org/doku.php?id=strawman:unicode_normalization
//
// ==================================================================



// Like pinyin, Vietnam's writing system (Quốc Ngữ) has fixed rules for
// what makes a valid syllable.

// A syllable consists of:
//   optional initial + vowel cluster + optional final

// Not all vowel clusters can occur before all finals.
// The vowel cluster can optionally carry one of 5 tone marks.

// The spelling is fairly regular, but it inherits a few irregularities
// from Portuguese.
//  * The /k/ sound can be spelt C or K depending on the
//    following vowel. (Or Q before a /w/ glide.)
//  * The initial G becomes GH before E or I (or Ê or Y). Similarly, NG
//    becomes NGH
//  * The /w/ sound at the start of a vowel cluster can be spelt O or U
//    depending on the following vowel. However, after a Q, it is always
//    spelt U, regardless of the following vowel. Basically, the list of
//    valid vowel clusters completely changes after a Q.
//  * The vowel cluster IÊ becomes YÊ at the start of a word. Likewise,
//    IÊU> becomes YÊU.

(function() {
  'use strict';

  var QN = {
    unmarkedVowels: 'AaĂăÂâEeÊêIiOoÔôƠơUuƯưYy',

    // The elements of this array represent the five marked tones of
    // Vietnamese. (A sixth tone is unmarked.)
    markedVowels: [
      'ÁáẮắẤấÉéẾếÍíÓóỐốỚớÚúỨứÝý',  // Sắc Tone
      'ÀàẰằẦầÈèỀềÌìÒòỒồỜờÙùỪừỲỳ',  // Huyền Tone
      'ẢảẲẳẨẩẺẻỂểỈỉỎỏỔổỞởỦủỬửỶỷ',  // Hỏi Tone
      'ÃãẴẵẪẫẼẽỄễĨĩÕõỖỗỠỡŨũỮữỸỹ',  // Ngã Tone
      'ẠạẶặẬậẸẹỆệỊịỌọỘộỢợỤụỰựỴỵ'   // Nặng Tone
    ],

    // All the intials except Q (including the null initial).
    // (Any usual Vietnamese syllable can be prefixed with an X
    // when transcribing foreign proper nouns.)
    initialsNotQ: '(x?(?:b|c|ch|d|đ|g|gh|gi|h|k|kh|l|m|n|' +
                  'ng|ngh|nh|p|ph|r|s|t|th|tr|v)?)',

    // All the initials that start with Q.
    initialQ: '(x?q)',

    // All the finals
    finals: '(c|ch|m|n|ng|nh|p|t)',

    // These vowel clusters are valid when there is no final
    // (except when the intial is Q)
    nucleusOpen: '(a|e|ê|i|y|o|ô|ơ|u|ư|' +        // vowel
                 'ai|ay|ăy|oi|ơi|ôi|ui|ưi|' +     // vowel + /j/
                 'ao|au|âu|eo|êu|iu|ưu|' +        // vowel + /w/
                 'ia|ua|ưa|' +                    // diphthong
                 'uơi|ươi|' +                     // diphthong + /j/
                 'iêu|yêu|ươu|' +                 // diphthong + /w/
                 'oa|oe|uê|uy|uơ|' +              // /w/ + vowel
                 'uya|' +                         // /w/ + diphthong
                 'oai|oay|uôi|uây)',              // /w/ + vowel + /j/

    // These vowel clusters are valid before any final,
    // (except when the intial is Q)
    nucleusClosed: '(a|ă|â|e|ê|i|o|ô|ơ|u|ư|' +    // vowel
                   'iê|yê|uô|uơ|ươ|' +            // diphthong
                   'oa|oă|uâ|oe|uê|uy|uơ|' +      // /w/ + vowel
                   'uyê|' +                       // /w/ + diphthong
                   'oo)', // 'oo' only appears in French loan words
                          // like 'xoong' (casserole). Some Vietnamese
                          // textbooks omit it, but it definitely exists.


    // These vowel clusters are valid when there is no final
    // and the initial is Q.
    nucleusOpenAfterQ: '(ua|ue|uê|ui|uy|uơ|' +    // /w/ + vowel
                       'uya|' +                   // /w/ + diphthong
                       'uai|uay|uây)',            // /w/ + vowel + /j/

    // These vowel clusters are valid before any final,
    // when the initial is Q.
    nucleusClosedAfterQ: '(ua|uă|uâ|ue|uê|ui|uy|uơ|' +  // /w/ + vowel
                         'uyê)'                         // /w/ + diphthong
  };

  var vietWordParser = {
    p1: new RegExp('^' + QN.initialsNotQ + QN.nucleusOpen + '$'),
    p2: new RegExp('^' + QN.initialsNotQ + QN.nucleusClosed + QN.finals + '$'),
    p3: new RegExp('^' + QN.initialQ + QN.nucleusOpenAfterQ + '$'),
    p4: new RegExp('^' + QN.initialQ + QN.nucleusClosedAfterQ + QN.finals +
                   '$'),

    isValidWord: function(word) {
      var w = word.toLowerCase();
      var array = w.match(this.p1) || w.match(this.p2) ||
                  w.match(this.p3) || w.match(this.p4);

      if (!array) {
        return false;
      }

      var initialCluster = array[1];
      var vowelCluster = array[2];
      var finalCluster = array[3] || '';

      // G -> GH and NG -> NGH before E/Ê or I/Y
      if (initialCluster.match(/^(g|ng)$/) &&
          vowelCluster.match(/^(e|ê|i|y)/)) {
        return false;
      }
      if (initialCluster.match(/^(gh|ngh)$/) &&
          !vowelCluster.match(/^(e|ê|i|y)/)) {
        return false;
      }

      // GI can't come before I/Y
      if (initialCluster === 'gi' && vowelCluster.match(/^(i|y)/)) {
        return false;
      }

      // K before I/Y or E; C otherwise
      if (initialCluster === 'k' && !vowelCluster.match(/^(e|ê|i|y)/)) {
        return false;
      }
      if (initialCluster === 'c' && vowelCluster.match(/^(e|ê|i|y)/)) {
        return false;
      }

      // IÊ -> YÊ and IÊU -> YÊU when there's no initial
      if (initialCluster === '' && vowelCluster.match(/^iê/)) {
        return false;
      }
      if (initialCluster !== '' && vowelCluster.match(/^yê/)) {
        return false;
      }

      // The vowel clusters UÂ and UYÊ can only come before T or N.
      if (vowelCluster.match(/^(uâ|uyê)$/) && !finalCluster.match(/^(t|n)$/)) {
        return false;
      }

      return true;
    },

    addToneMarkToVowel: function(vowel, tone) {
      var vowelIndex = QN.unmarkedVowels.indexOf(vowel);
      if (vowelIndex >= 0) {
        return QN.markedVowels[tone][vowelIndex];
      }
    },

    findTonePosition: function(word) {
      var w = word.toLowerCase();

      var array = w.match(this.p1) || w.match(this.p2) ||
                  w.match(this.p3) || w.match(this.p4);

      if (!array) {
        return 0;
      }

      var initialCluster = array[1];
      var vowelCluster = array[2];
      var finalCluster = array[3] || '';

      // When placing the tone mark, the U in QU should be considered
      // part of the initial, not part of the vowel cluster.
      // It never carries the tone mark.
      if (initialCluster == 'q') {
        initialCluster = 'qu';
        vowelCluster = vowelCluster.substr(1);
      }

      // Here are the traditional rules for where to place the tone mark:
      //  * Vowels with diacritics are preferred over vowels without one.
      // If that doesn't settle it, use these rules:
      //  * If the word has three vowels, it goes on the middle one.
      //  * If the word has two vowels followed by a consonant, it goes on the
      //    last vowel.
      //  * If the word ends with two vowels, it goes on the first vowel.

      // The only time a word can have more than one diacritic is when it
      // contains ươ, which has to be followed by a consonant. By the above
      // rules, that means the ơ gets the diacritic, not the ư.

      return w.search(/(ơ)/) + 1 ||
        w.search(/(ă|â|ê|ô|ư)/) + 1 ||
        (vowelCluster.length === 3 ? initialCluster.length + 2 :
         finalCluster !== '' ? initialCluster.length + vowelCluster.length :
         initialCluster.length + 1);
    },

    addHat: function(word) {
      return word.replace('a', 'â').replace('A', 'Â')
        .replace('e', 'ê').replace('E', 'Ê')
        .replace('o', 'ô').replace('O', 'Ô');
    },

    generateCandidates: function(word) {
      if (!this.isValidWord(word)) {
        return [];
      }

      // Vietnamese has five tone marks. However, if a word ends
      // in P, T, C, or CH, only the SẮC and NẶNG tones can be used.
      var stopFinal = !!word.match(/(p|t|c|ch)$/i);
      var marks = stopFinal ? [0, 4] : [0, 1, 2, 3, 4];

      var tonePos = this.findTonePosition(word);

      var candidates = marks.map((mark) => {
        return word.substr(0, tonePos - 1) +
               this.addToneMarkToVowel(word.charAt(tonePos - 1), mark) +
               word.substr(tonePos);
      });

      return candidates;
    }
  };

  var keyboard, buffer = '';
  var capitalize = false;
  var capitalizeNext = false;
  var tentativeSpace = false;

  var BACKSPACE = 8;
  var HAT = 94;

  function isBufferEmpty() {
    return buffer === '';
  }

  function clearBuffer() {
    buffer = '';
  }

  function addToBuffer(keycode) {
    if (keycode == BACKSPACE) {
      backspace();
    }
    buffer = buffer + String.fromCharCode(keycode);
  }

  function backspace() {
    if (!isBufferEmpty()) {
      buffer = buffer.substring(0, buffer.length -1);
      keyboard.setComposition(buffer);
    }
    else {
      keyboard.sendKey(KeyEvent.DOM_VK_BACK_SPACE);
    }
  }

  function inputDone() {
    keyboard.endComposition(buffer);
    clearBuffer();
  }

  InputMethods.vietnamese = {
    init: init,
    activate: activate,
    deactivate: deactivate,
    click: click,
    select: select
  };

  function init(interfaceObject) {
    keyboard = interfaceObject;
  }

  function activate(lang, state) {
    capitalize = !!state.type.match(/^(text|textarea|search)$/);
    tentativeSpace = false;

    var cursor = state.selectionStart;
    var inputText = state.value;

    capitalizeNext = false;
    if (capitalize) {
      if (cursor === 0) {
        capitalizeNext = true;
      }
      else {
        var charBeforeCursor = cursor - 1;
        while (charBeforeCursor >= 0 && inputText[charBeforeCursor] == ' ') {
          --charBeforeCursor;
        }
        capitalizeNext = !!inputText[charBeforeCursor].match(/[\!\?\.]/);
      }
    }
    keyboard.setUpperCase(capitalizeNext);
  }

  function deactivate() {
    if (!isBufferEmpty()) {
      inputDone();
      keyboard.sendCandidates([]);
    }
  }

  function click(keycode) {
    var s = String.fromCharCode(keycode);

    var wasTentativeSpace = tentativeSpace;
    tentativeSpace = false;

    var wasCapitalizeNext = capitalizeNext;
    capitalizeNext = false;

    // Automatically transform E -> Ê after an I or Y. I find this really handy.
    // And UO -> UÔ
    if (s == 'e' && buffer.match(/(y|i)$/i)) {
      keycode = 'ê'.charCodeAt(0);
    }
    else if (s == 'E' && buffer.match(/(y|i)$/i)) {
      keycode = 'Ê'.charCodeAt(0);
    } else if (s == 'o' && buffer.match(/u$/i)) {
      keycode = 'ô'.charCodeAt(0);
    } else if (s == 'O' && buffer.match(/u$/i)) {
      keycode = 'Ô'.charCodeAt(0);
    }

    // Letters
    if (s.match(/[A-Za-zĂÂĐÊÔƠUƯ]/i)) {
      addToBuffer(keycode);
    }
    // The special hat key.
    else if (keycode == HAT) {
      buffer = vietWordParser.addHat(buffer);
    }
    // Backspace
    else if (keycode == BACKSPACE) {
      backspace();
    }
    // Handling tentative space
    else if (wasTentativeSpace &&
               (s == '.' || s == ',' || s == '!' || s == '?')) {
      keyboard.sendKey(KeyEvent.DOM_VK_BACK_SPACE);
      keyboard.sendKey(keycode);
      keyboard.sendKey(KeyEvent.DOM_VK_SPACE);
      if (s == '.' || s == '!' || s == '?') {
        capitalizeNext = true;
      }
    }
    // Using spacebar to finish input
    else if (s == ' ' && !isBufferEmpty()) {
      buffer += s;
      tentativeSpace = true;
      inputDone();
    }
    // Punctuation, symbols, other.
    else {
      if (!isBufferEmpty()) {
        inputDone();
      }
      if (s == '.' || s == '!' || s == '?') {
        capitalizeNext = true;
      }
      if (s == ' ') {
        capitalizeNext = wasCapitalizeNext;
      }
      keyboard.sendKey(keycode);
    }

    if (!isBufferEmpty()) {
      keyboard.setComposition(buffer);
      var candidates = vietWordParser.generateCandidates(buffer);
      keyboard.sendCandidates(candidates);
    } else {
      keyboard.sendCandidates([]);
    }

    keyboard.setUpperCase(capitalizeNext);
  }

  function select(s) {
    buffer = s;
    buffer += ' ';
    tentativeSpace = true;
    inputDone();
    keyboard.sendCandidates([]);
  }

})();
