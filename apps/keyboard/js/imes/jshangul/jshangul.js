/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

(function() {

  var keyboard, ime, JangmiIME;

  const SPACE = KeyEvent.DOM_VK_SPACE;
  const BACKSPACE = KeyEvent.DOM_VK_BACK_SPACE;
  const RETURN = KeyEvent.DOM_VK_RETURN;

  /*
    JangmiIME
    https://github.com/sangpire/jangmiIME

    Copyright 2013, BYUN Sangpil. All Rights Reserved.

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

         http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS-IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
   */
  (function() {
    var isCompatibleJamoKeyCode;

    const UTF8_HANGUL_SYLLABLES_START = 0xAC00;
    const UTF8_HANGUL_COMPATIBILITY_START = 0x3131;
    const UTF8_JUNGSEONG_START = 0x1161;
    const UTF8_CHOSEONG_DIFF = '까'.charCodeAt(0) - '가'.charCodeAt(0);
    const UTF8_JUNGSEONG_DIFF = '개'.charCodeAt(0) - '가'.charCodeAt(0);

    const compatibilityMultiJamoMap = {
      'ㄱㄱ' : 0x1, 'ㄷㄷ' : 0x7, 'ㅂㅂ' : 0x12, 'ㅅㅅ' : 0x15,
      'ㅈㅈ' : 0x18, 'ㅗㅏ' : 0x27, 'ㅗㅐ' : 0x28, 'ㅗㅣ' : 0x29,
      'ㅜㅓ' : 0x2C, 'ㅜㅔ' : 0x2E, 'ㅜㅣ' : 0x2E, 'ㅡㅣ' : 0x31
    };

    const choSeongMap = {
      'ㄱ' : 0, 'ㄱㄱ' : 1, 'ㄲ' : 1, 'ㄴ' : 2, 'ㄷ' : 3,
      'ㄷㄷ' : 4, 'ㄸ' : 4, 'ㄹ' : 5, 'ㅁ' : 6, 'ㅂ' : 7,
      'ㅂㅂ' : 8, 'ㅃ' : 8, 'ㅅ' : 9, 'ㅅㅅ' : 10, 'ㅆ' : 10,
      'ㅇ' : 11, 'ㅈ' : 12, 'ㅈㅈ' : 13, 'ㅉ' : 13, 'ㅊ' : 14,
      'ㅋ' : 15, 'ㅌ' : 16, 'ㅍ' : 17, 'ㅎ' : 18
    };

    const jungSeongMap = {
      'ㅏ' : 0, 'ㅐ' : 1, 'ㅑ' : 2, 'ㅒ' : 3, 'ㅓ' : 4,
      'ㅔ' : 5, 'ㅕ' : 6, 'ㅖ' : 7, 'ㅗ' : 8, 'ㅘ' : 9,
      'ㅗㅏ' : 9, 'ㅙ' : 10, 'ㅗㅐ' : 10, 'ㅚ' : 11, 'ㅗㅣ' : 11,
      'ㅛ' : 12, 'ㅜ' : 13, 'ㅝ' : 14, 'ㅜㅓ' : 14, 'ㅞ' : 15,
      'ㅜㅔ' : 15, 'ㅟ' : 16, 'ㅜㅣ' : 16, 'ㅠ' : 17, 'ㅡ' : 18,
      'ㅢ' : 19, 'ㅡㅣ' : 19, 'ㅣ' : 20
    };

    const jongSeongMap = {
      'ㄱ' : 1, 'ㄲ' : 2, 'ㄱㅅ' : 3, 'ㄴ' : 4, 'ㄴㅈ' : 5,
      'ㄴㅎ' : 6, 'ㄷ' : 7, 'ㄹ' : 8, 'ㄹㄱ' : 9, 'ㄹㅁ' : 10,
      'ㄹㅂ' : 11, 'ㄹㅅ' : 12, 'ㄹㅌ' : 13, 'ㄹㅍ' : 14, 'ㄹㅎ' : 15,
      'ㅁ' : 16, 'ㅂ' : 17, 'ㅂㅅ' : 18, 'ㅅ' : 19, 'ㅆ' : 20,
      'ㅇ' : 21, 'ㅈ' : 22, 'ㅊ' : 23, 'ㅋ' : 24, 'ㅌ' : 25,
      'ㅍ' : 26, 'ㅎ' : 27
    };

    isCompatibleJamoKeyCode = function(keyCode) {
      return (0x3131 <= keyCode && keyCode <= 0x318e);
    };

    JangmiIME = (function() {
      /*
      @handler =
        passed: (keyCode) ->
        added: (gul) ->
        changed: (gul) ->
      */

      function JangmiIME(handler) {
        this.handler = handler;
        this.reset();
      }

      /*
      Reset Current State.
      */
      JangmiIME.prototype.reset = function() {
        this.curJamo = null;
        this.choSeong = [];
        this.jungSeong = [];
        this.jongSeong = [];
      };

      JangmiIME.prototype.added = function() {
        var curGul;
        curGul = this.peep();
        if (curGul != null) {
          return this.handler.added(curGul);
        }
      };

      JangmiIME.prototype.changed = function() {
        var curGul;
        curGul = this.peep();
        if (curGul != null) {
          return this.handler.changed(curGul);
        }
      };

      JangmiIME.prototype.isEmpty = function() {
        return (this.choSeong.length +
                this.jungSeong.length +
                this.jongSeong.length) === 0;
      };

      /*
      Add KeyCode
      */
      JangmiIME.prototype.add = function(keyCode) {
        var curJamo, jamo, temp;
        if (!isCompatibleJamoKeyCode(keyCode)) {
          this.reset();
          return this.handler.passed(keyCode);
        } else {
          jamo = String.fromCharCode(keyCode);
          if (this.curJamo == null) {
            if (choSeongMap.hasOwnProperty(jamo)) {
              this.curJamo = this.choSeong;
            }
            if (jungSeongMap.hasOwnProperty(jamo)) {
              this.curJamo = this.jungSeong;
            }
            this.curJamo.push(jamo);
            return this.added();
          } else {
            curJamo = this.curJamo.join('') + jamo;
            switch (this.curJamo) {
              case this.choSeong:
                if (choSeongMap.hasOwnProperty(curJamo)) {
                  this.curJamo.push(jamo);
                  return this.changed();
                } else {
                  if (choSeongMap.hasOwnProperty(jamo)) {
                    this.reset();
                    return this.add(keyCode);
                  } else if (jungSeongMap.hasOwnProperty(jamo)) {
                    this.jungSeong.push(jamo);
                    this.curJamo = this.jungSeong;
                    return this.changed();
                  }
                }
                break;
              case this.jungSeong:
                if (jungSeongMap.hasOwnProperty(curJamo)) {
                  this.curJamo.push(jamo);
                  return this.changed();
                } else {
                  if (jongSeongMap.hasOwnProperty(jamo)) {
                    this.jongSeong.push(jamo);
                    this.curJamo = this.jongSeong;
                    return this.changed();
                  }
                }
                break;
              case this.jongSeong:
                if (jongSeongMap.hasOwnProperty(curJamo)) {
                  this.curJamo.push(jamo);
                  return this.changed();
                } else {
                  if (jungSeongMap.hasOwnProperty(jamo)) {
                    temp = this.curJamo.pop();
                    this.changed();
                    this.reset();
                    this.choSeong.push(temp);
                    this.jungSeong.push(jamo);
                    this.curJamo = this.jungSeong;
                    return this.added();
                  } else {
                    this.reset();
                    this.curJamo = null;
                    return this.add(keyCode);
                  }
                }
            }
          }
        }
      };

      /*
      Delete Last Input
      */
      JangmiIME.prototype.back = function() {
        if (this.curJamo.length > 0) {
          this.curJamo.pop();
          return this.changed();
        } else {
          switch (this.curJamo) {
            case this.jungSeong:
              this.curJamo = this.choSeong;
              return this.back();
            case this.jongSeong:
              this.curJamo = this.jungSeong;
              return this.back();
          }
        }
      };

      /*
        peep current hangul
      */
      JangmiIME.prototype.peep = function() {
        var code;
        if (this.choSeong.length > 0 && this.jungSeong.length > 0) {
          code = UTF8_HANGUL_SYLLABLES_START +
            choSeongMap[this.choSeong.join('')] * UTF8_CHOSEONG_DIFF;
          code += jungSeongMap[this.jungSeong.join('')] * UTF8_JUNGSEONG_DIFF;
          if (this.jongSeong.length > 0) {
            code += jongSeongMap[this.jongSeong.join('')];
          }
        } else {
          if (this.choSeong.length === 1) {
            code = this.choSeong[0].charCodeAt(0);
          } else if (this.choSeong.length > 1) {
            code = UTF8_HANGUL_COMPATIBILITY_START +
              compatibilityMultiJamoMap[this.choSeong.join('')];
          } else if (this.jungSeong.length === 1) {
            code = this.jungSeong[0].charCodeAt(0);
          } else if (this.jungSeong.length > 1) {
            code = UTF8_HANGUL_COMPATIBILITY_START +
              compatibilityMultiJamoMap[this.jungSeong.join('')];
          } else {
            return '';
          }
        }
        return String.fromCharCode(code);
      };
      return JangmiIME;
    })();
  })();

  InputMethods.jshangul = {
    init: init,
    click: click,
    empty: empty
  };

  function init(interfaceObject) {
    keyboard = interfaceObject;
    ime = new JangmiIME({
      passed: function(keyCode) {
        keyboard.sendKey(keyCode);
      },
      added: function(gul) {
        keyboard.sendString(gul);
      },
      changed: function(gul) {
        keyboard.sendKey(BACKSPACE);
        keyboard.sendString(gul);
      }
    });
  }

  function empty() {
    ime.reset();
  }

  function click(keycode, x, y) {
    if (keycode === BACKSPACE && !ime.isEmpty()) {
      ime.back();
    } else {
      ime.add(keycode);
    }
  }
})();
