/* global InputMethods, KeyEvent */

'use strict';

require('/test/unit/setup_engine.js');
require('/js/imes/jshangul/jshangul.js');

var SPACE = KeyEvent.DOM_VK_SPACE;
var BACKSPACE = KeyEvent.DOM_VK_BACK_SPACE;

suite('jshangul', function() {

  var im;

  function dummy() {}

  var testableKeyboardGlue = {
    // For Test Methods
    _ready: function() {
      this.gul = undefined;
      this.endCompositionCount = 0;
    },
    _status: function() {
      return [this.gul, this.endCompositionCount];
    },

    // Keyboard APIs
    resetUpperCase: dummy,
    sendKey: function(keyCode) {
      this.gul = String.fromCharCode(keyCode);
    },
    sendCandidates: dummy,
    setComposition: function(gul) {
      this.gul = gul;
    },
    endComposition: function() {
      this.endCompositionCount ++;
    },
    setUpperCase: dummy,
    setLayoutPage: dummy,
    isCapitalized: dummy
  };

  suiteSetup(function() {
    im = InputMethods.jshangul;
    im.init(testableKeyboardGlue);
  });

  test('load', function() {
    assert.isDefined(im);
  });

  suite('Hangul Composition Test', function() {
    var cases = [
      {
        info: 'should return "ㄲㄸ" when type "ㄱㄱㄷㄷ"',
        scenario: [
          [ 'ㄱ', [ 'ㄱ', 0 ] ],
          [ 'ㄱ', [ 'ㄲ', 0 ] ],
          [ 'ㄷ', [ 'ㄷ', 1 ] ],
          [ 'ㄷ', [ 'ㄸ', 1 ] ]
        ]
      },
      {
        info: 'should return "각" when type "ㄱㅏㄱ"',
        scenario: [
          [ 'ㄱ', [ 'ㄱ', 0 ] ],
          [ 'ㅏ', [ '가', 0 ] ],
          [ 'ㄱ', [ '각', 0 ] ]
        ]
      },
      {
        info: 'should return "냐" when type "ㄴㅑ"',
        scenario: [
          [ 'ㄴ', [ 'ㄴ', 0 ] ],
          [ 'ㅑ', [ '냐', 0 ] ]
        ]
      },
      {
        info: 'should return "ㅏㄱ" when type "ㅏㄱ"',
        scenario: [
          [ 'ㅏ', [ 'ㅏ', 0 ] ],
          [ 'ㄱ', [ 'ㄱ', 1 ] ]
        ]
      },
      {
        info: 'should return "ㅢㅣ" when type "ㅡㅣㅣ"' ,
        scenario: [
          [ 'ㅡ', [ 'ㅡ', 0 ] ],
          [ 'ㅣ', [ 'ㅢ', 0 ] ],
          [ 'ㅣ', [ 'ㅣ', 1 ] ]
        ]
      },
      {
        info: 'should return "ㅏㅑㅓㅕㅗㅛ" when type "ㅏㅑㅓㅕㅗㅛ"' ,
        scenario: [
          [ 'ㅏ', [ 'ㅏ', 0 ] ],
          [ 'ㅑ', [ 'ㅑ', 1 ] ],
          [ 'ㅓ', [ 'ㅓ', 2 ] ],
          [ 'ㅕ', [ 'ㅕ', 3 ] ],
          [ 'ㅗ', [ 'ㅗ', 4 ] ],
          [ 'ㅛ', [ 'ㅛ', 5 ] ]
        ]
      },
      {
        info: 'should return 신장미 when type "ㅅㅣㄴㅈㅏㅇㅁㅣ"',
        scenario: [
          [ 'ㅅ', [ 'ㅅ', 0 ] ],
          [ 'ㅣ', [ '시', 0 ] ],
          [ 'ㄴ', [ '신', 0 ] ],
          [ 'ㅈ', [ '싡', 0 ] ],
          [ 'ㅏ', [ '자', 1 ] ],
          [ 'ㅇ', [ '장', 1 ] ],
          [ 'ㅁ', [ 'ㅁ', 2 ] ],
          [ 'ㅣ', [ '미', 2 ] ]
        ]
      },
      {
        info: 'should return 깨끗 when type "ㄱㄱㅐㄲㅡㅅ"',
        scenario: [
          [ 'ㄱ', [ 'ㄱ', 0 ] ],
          [ 'ㄱ', [ 'ㄲ', 0 ] ],
          [ 'ㅐ', [ '깨', 0 ] ],
          [ 'ㄲ', [ '깪', 0 ] ],
          [ 'ㅡ', [ '끄', 1 ] ],
          [ 'ㅅ', [ '끗', 1 ] ]
        ]
      },
      {
        info: 'should return 밥&미 when type "ㅂㅏㅂ&ㅁㅣ"',
        scenario: [
          [ 'ㅂ', [ 'ㅂ', 0 ] ],
          [ 'ㅏ', [ '바', 0 ] ],
          [ 'ㅂ', [ '밥', 0 ] ],
          [ '&', [ '&', 1 ] ],
          [ 'ㅁ', [ 'ㅁ', 1 ] ],
          [ 'ㅣ', [ '미', 1 ] ]
        ]
      },
      {
        info: 'should return 미&밥 when type "ㅁㅣ&ㅂㅏㅂ"',
        scenario: [
          [ 'ㅁ', [ 'ㅁ', 0 ] ],
          [ 'ㅣ', [ '미', 0 ] ],
          [ '&', [ '&', 1 ] ],
          [ 'ㅂ', [ 'ㅂ', 1 ] ],
          [ 'ㅏ', [ '바', 1 ] ],
          [ 'ㅂ', [ '밥', 1 ] ]
        ]
      },
      {
        info: 'should return 뷁 when type "ㅂㅜㅔㄹㄱ"',
        scenario: [
          [ 'ㅂ', [ 'ㅂ', 0 ] ],
          [ 'ㅜ', [ '부', 0 ] ],
          [ 'ㅔ', [ '붸', 0 ] ],
          [ 'ㄹ', [ '뷀', 0 ] ],
          [ 'ㄱ', [ '뷁', 0 ] ]
        ]
      },
      {
        info: 'should return 한 글 when type "ㅎㅏㄴ[SPACE]ㄱㅡㄹ"',
        scenario: [
          [ 'ㅎ', [ 'ㅎ', 0 ] ],
          [ 'ㅏ', [ '하', 0 ] ],
          [ 'ㄴ', [ '한', 0 ] ],
          [ SPACE ,[ ' ', 1 ] ],
          [ 'ㄱ', [ 'ㄱ', 1 ] ],
          [ 'ㅡ', [ '그', 1 ] ],
          [ 'ㄹ', [ '글', 1 ] ]
        ]
      },
      {
        info: 'should return ㄱㄴㄷㄹㅁㅂ when type "ㄱㄴㄷㄹㅁㅂ"',
        scenario: [
          [ 'ㄱ', [ 'ㄱ', 0 ] ],
          [ 'ㄴ', [ 'ㄴ', 1 ] ],
          [ 'ㄷ', [ 'ㄷ', 2 ] ],
          [ 'ㄹ', [ 'ㄹ', 3 ] ],
          [ 'ㅁ', [ 'ㅁ', 4 ] ]
        ]
      },
      {
        info: 'should return 사랑 when type "ㅅㅏㄹㅏㅇ"',
        scenario: [
          [ 'ㅅ', [ 'ㅅ', 0 ] ],
          [ 'ㅏ', [ '사', 0 ] ],
          [ 'ㄹ', [ '살', 0 ] ],
          [ 'ㅏ', [ '라', 1 ] ],
          [ 'ㅇ', [ '랑', 1 ] ]
        ]
      },
      {
        info: 'should return 장미 when type "ㅈㅏㅇㅁㅣ"',
        scenario: [
          [ 'ㅈ', [ 'ㅈ', 0 ] ],
          [ 'ㅏ', [ '자', 0 ] ],
          [ 'ㅇ', [ '장', 0 ] ],
          [ 'ㅁ', [ 'ㅁ', 1 ] ],
          [ 'ㅣ', [ '미', 1 ] ]
        ]
      },
      {
        info: 'should return 어ㅠㅠ when type "ㅇㅓㅠㅠ"',
        scenario: [
          [ 'ㅇ', [ 'ㅇ', 0 ] ],
          [ 'ㅓ', [ '어', 0 ] ],
          [ 'ㅠ', [ 'ㅠ', 1 ] ],
          [ 'ㅠ', [ 'ㅠ', 2 ] ]
        ]
      },
      {
        info: 'should 깎 rightly write and delete by jamo.',
        scenario: [
          [ 'ㄱ', [ 'ㄱ' , 0 ] ],
          [ 'ㄱ', [ 'ㄲ' , 0 ] ],
          [ 'ㅏ', [ '까' , 0 ] ],
          [ 'ㄲ', [ '깎' , 0 ] ],
          [ BACKSPACE, [ '까', 0 ] ],
          [ BACKSPACE, [ 'ㄲ', 0 ] ],
          [ BACKSPACE, [ 'ㄱ', 0 ] ],
          [ BACKSPACE, [ '', 0 ] ]
        ]
      },
      {
        info: 'should ㄱ rightly write and delete 2 times.',
        scenario: [
          [ 'ㄱ', [ 'ㄱ', 0 ] ],
          [ BACKSPACE, [ '', 0 ] ],
          [ 'ㄱ', [ 'ㄱ', 0 ] ],
          [ BACKSPACE, [ '', 0 ] ]
        ]
      }
    ];

    setup(function() {
      im.deactivate();
      testableKeyboardGlue._ready();
    });

    cases.forEach(function(theCase) {
      var msg = theCase.info;
      var clicksAndExpects = theCase.scenario;

      test(msg, function() {
        for(var i = 0; i < clicksAndExpects.length; i++) {
          var clickAndThen = clicksAndExpects[i];
          var input = clickAndThen[0];
          var charCode = (typeof input === 'number') ?
                           input : input.charCodeAt(0);
          im.click(charCode);
          assert.deepEqual(testableKeyboardGlue._status(), clickAndThen[1]);
        }
      });
    });
  });
});
