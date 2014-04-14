/*global requireApp suite test assert setup teardown IMERender */
requireApp('keyboard/js/render.js');

suite('Renderer', function() {
  function makeDescriptor(val) {
    return {
      configurable: true,
      enumerable: true,
      value: val,
      writable: true
    };
  }

  function loadKeyboardStyle(callback) {
    // Dirty trick http://www.phpied.com/when-is-a-stylesheet-really-loaded/
    var style = document.createElement('style');
    style.textContent = '@import "../../style/keyboard.css"';
    var fi = setInterval(function() {
      try {
        style.sheet.cssRules;
        clearInterval(fi);
        callback();
      } catch (e) {}
    }, 10);
    document.body.appendChild(style);
  }

  suite('resizeUI', function() {
    function createKeyboardRow(chars, layoutWidth) {
      var row = document.createElement('div');
      row.classList.add('keyboard-row');
      row.dataset.layoutWidth = layoutWidth;
      chars.forEach(function(c) {
        row.innerHTML += '<div class="keyboard-key">' +
          '<div class="visual-wrapper">' + c + '</div></div>';
      });
      activeIme.appendChild(row);
      return row;
    }

    var ime, activeIme;
    setup(function(next) {
      document.body.innerHTML = '';

      ime = document.createElement('div');
      ime.id = 'keyboard';
      document.body.appendChild(ime);

      activeIme = document.createElement('div');
      ime.appendChild(activeIme);

      Object.defineProperty(ime, 'clientWidth', makeDescriptor(300));

      IMERender.init();
      IMERender.activeIme = activeIme;

      loadKeyboardStyle(next);
    });

    test('Add portrait class to IME in portrait mode', function() {
      IMERender.setCachedWindowSize(200, 400);

      IMERender.resizeUI(null);

      assert.equal(ime.classList.contains('portrait'), true);
      assert.equal(ime.classList.contains('landscape'), false);
    });

    test('Add landscape class to IME in landscape mode', function() {
      IMERender.setCachedWindowSize(400, 200);

      IMERender.resizeUI(null);

      assert.equal(ime.classList.contains('landscape'), true);
      assert.equal(ime.classList.contains('portrait'), false);
    });

    test('All keys should have same visual width if fully used', function() {
      var row = createKeyboardRow(
        ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'], 10);

      var layout = {
        width: 10,
        keys: [
          [{}, {}, {}, {}, {}, {}, {}, {}, {}, {}]
        ]
      };

      IMERender.resizeUI(layout);

      var all = [].map.call(row.querySelectorAll('.visual-wrapper'),
        function(el) {
          return el.clientWidth;
        });

      assert.notEqual(all[0], 0);
      assert.equal(all.every(function(el) {
        return el === all[0];
      }), true, 'Every element has width ' + all[0]);
    });

    test('Key with ratio 2 should be twice as big', function(next) {
      var row = createKeyboardRow(['a', 'b'], 3);

      var layout = {
        width: 3,
        keys: [
          [{ ratio: 2 }, {}]
        ]
      };

      IMERender.resizeUI(layout, function() {
        // TODO: Bug 885686 - Measure visual-key width
        var all = row.querySelectorAll('.keyboard-key');
        assert.equal(all[0].clientWidth, all[1].clientWidth * 2);

        next();
      });
    });

    test('Side keys should fill up space', function(next) {
      IMERender.setCachedWindowSize(200, 400);
      Object.defineProperty(ime, 'clientWidth', makeDescriptor(200));

      var row = createKeyboardRow(['a', 'b', 'c'], 3);

      var layout = {
        width: 4,
        keys: [
          [{}, {}, {}]
        ]
      };

      IMERender.resizeUI(layout, function() {
        var visual = row.querySelectorAll('.visual-wrapper');
        assert.equal(visual[0].clientWidth, visual[1].clientWidth,
          'Visually same');

        var keys = row.querySelectorAll('.keyboard-key');

        var totalWidth = 200;

        // due to pixels not being able to be .5 this can end up being 1 diff
        assert.equal(totalWidth,
          keys[0].clientWidth + keys[1].clientWidth + keys[2].clientWidth,
          'Total width');

        assert.equal(keys[0].classList.contains('float-key-first'), true,
          'Has float-key-first');
        assert.equal(keys[2].classList.contains('float-key-last'), true,
          'Has float-key-last');

        next();
      });
    });

    test('Side keys should fill up space in landscape', function(next) {
      IMERender.setCachedWindowSize(400, 200);
      Object.defineProperty(ime, 'clientWidth', makeDescriptor(400));

      var row = createKeyboardRow(['a', 'b', 'c'], 3);

      var layout = {
        width: 4,
        keys: [
          [{}, {}, {}]
        ]
      };

      IMERender.resizeUI(layout, function() {
        var visual = row.querySelectorAll('.visual-wrapper');
        assert.equal(visual[0].clientWidth, visual[1].clientWidth,
          'Visually same');

        var keys = row.querySelectorAll('.keyboard-key');

        assert.equal(400,
          keys[0].clientWidth + keys[1].clientWidth + keys[2].clientWidth);

        assert.equal(keys[0].classList.contains('float-key-first'), true,
          'Has float-key-first');
        assert.equal(keys[2].classList.contains('float-key-last'), true,
          'Has float-key-last');

        next();
      });
    });

    test('Sidekeys should adjust space when rotating', function(next) {
      IMERender.setCachedWindowSize(400, 200);
      Object.defineProperty(ime, 'clientWidth',
        makeDescriptor(400));

      var row = createKeyboardRow(['a', 'b', 'c'], 3);

      var layout = {
        width: 4,
        keys: [
          [{}, {}, {}]
        ]
      };

      IMERender.resizeUI(layout, function() {
        var visual = row.querySelectorAll('.visual-wrapper');

        IMERender.setCachedWindowSize(700, 1000);
        Object.defineProperty(ime, 'clientWidth', makeDescriptor(700));

        IMERender.resizeUI(layout, function() {
          assert.equal(visual[0].clientWidth, visual[1].clientWidth,
            'Visually same');

          next();
        });
      });

    });

    test('GetKeyArray sanity', function(next) {
      createKeyboardRow(
        ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'], 10);

      var layout = {
        width: 10,
        keys: [
          [{}, {}, {}, {}, {}, {}, {}, {}, {}, {}]
        ]
      };

      IMERender.resizeUI(layout, function() {
        var keyArray = IMERender.getKeyArray();

        var visuals = [].slice.call(
          document.querySelectorAll('.visual-wrapper'));

        visuals.forEach(function(v, ix) {
          assert.equal(v.offsetLeft, keyArray[ix].x, 'x for ' + ix);
          assert.equal(v.offsetTop, keyArray[ix].y, 'y for ' + ix);
          assert.equal(v.clientWidth, keyArray[ix].width, 'width for ' + ix);
          assert.equal(v.clientHeight, keyArray[ix].height, 'height for ' + ix);
        });

        next();
      });
    });

    test('GetKeyArray sanity for filled up space', function(next) {
      createKeyboardRow(['a', 'b', 'c'], 3);

      var layout = {
        width: 4,
        keys: [
          [{}, {}, {}]
        ]
      };

      IMERender.resizeUI(layout, function() {
        var keyArray = IMERender.getKeyArray();

        var visuals = [].slice.call(
          document.querySelectorAll('.visual-wrapper'));

        visuals.forEach(function(v, ix) {
          assert.equal(Math.abs(v.offsetLeft - keyArray[ix].x) <= 1, true,
            'x for ' + ix);
          assert.equal(Math.abs(v.offsetTop - keyArray[ix].y) <= 1, true,
            'y for ' + ix);
          assert.equal(v.clientWidth, keyArray[ix].width, 'width for ' + ix);
          assert.equal(v.clientHeight, keyArray[ix].height, 'height for ' + ix);
        });

        next();
      });
    });
  });

  suite('Draw', function() {
    var ime, activeIme;
    setup(function(next) {
      document.body.innerHTML = '';

      ime = document.createElement('div');
      ime.id = 'keyboard';
      document.body.appendChild(ime);

      activeIme = document.createElement('div');
      ime.appendChild(activeIme);
      IMERender.activeIme = activeIme;

      IMERender.init(function(key) {
        return key.value.toUpperCase();
      }, function(key) {
        return false; // is special key
      });

      loadKeyboardStyle(next);
    });

    test('Should add last-row class to last row', function() {
      var layout = {
        width: 2,
        keys: [
          [{ value: 'a' }, { value: 'b' }],
          [{ value: 'c' }, { value: 'd' }],
          [{ value: 'e' }, { value: 'f' }]
        ]
      };

      IMERender.draw(layout);

      var rows = document.querySelectorAll('.keyboard-row');
      assert.equal(rows.length, 3);
      assert.equal(rows[2].classList.contains('keyboard-last-row'), true);
      var keys = document.querySelectorAll('.keyboard-key');
      assert.equal(keys.length, 6);
    });

    test('Hidden should be respected', function() {
      var layout = {
        width: 2,
        keys: [
          [{ value: 'a', hidden: ['jan', 'piet']}, { value: 'b' }],
          [{ value: 'c' }, { value: 'd' }],
          [{ value: 'e' }, { value: 'f' }]
        ]
      };

      IMERender.draw(layout, { inputType: 'jan' });

      var rows = document.querySelectorAll('.keyboard-row');
      assert.equal(rows[0].querySelectorAll('.keyboard-key').length, 1);
    });

    test('Key shouldn\'t be shown if visible present and no match', function() {
      var layout = {
        width: 2,
        keys: [
          [{ value: 'a', visible: ['jan'] }, { value: 'b' }],
          [{ value: 'c' }, { value: 'd' }],
          [{ value: 'e' }, { value: 'f' }]
        ]
      };

      IMERender.draw(layout, { inputType: 'notjan' });

      var rows = document.querySelectorAll('.keyboard-row');
      assert.equal(rows[0].querySelectorAll('.keyboard-key').length, 1);
    });

    test('Key should be shown if visible present and match', function() {
      var layout = {
        width: 2,
        keys: [
          [{ value: 'a', visible: ['jan'] }, { value: 'b' }],
          [{ value: 'c' }, { value: 'd' }],
          [{ value: 'e' }, { value: 'f' }]
        ]
      };

      IMERender.draw(layout, { inputType: 'jan' });

      var rows = document.querySelectorAll('.keyboard-row');
      assert.equal(rows[0].querySelectorAll('.keyboard-key').length, 2);
    });

    test('layout.keyClassName should be added to all keys', function() {
      var layout = {
        width: 2,
        keys: [
          [{ value: 'a' }, { value: 'b' }]
        ],
        keyClassName: 'c9'
      };

      IMERender.draw(layout);

      assert.equal(document.querySelectorAll('.keyboard-key').length, 2);
      assert.equal(document.querySelectorAll('.keyboard-key.c9').length, 2);
    });

    test('rowLayoutWidth should be sum of all key ratios', function() {
      var layout = {
        width: 9,
        keys: [
          [{ value: 'a', ratio: 3 }, { value: 'b', ratio: 2 }],
          [{ value: 'a' }, { value: 'b' }],
          [{ value: 'a', ratio: 5 }, { value: 'b' }]
        ]
      };

      IMERender.draw(layout);

      var rows = document.querySelectorAll('.keyboard-row');
      assert.equal(rows[0].dataset.layoutWidth, 5);
      assert.equal(rows[1].dataset.layoutWidth, 2);
      assert.equal(rows[2].dataset.layoutWidth, 6);
    });

    test('Keycode should be set or default to char0', function() {
      var layout = {
        width: 9,
        keys: [
          [{ value: 'a', keyCode: 3 }, { value: 'b' }]
        ]
      };

      IMERender.draw(layout);

      var keys = document.querySelectorAll('.keyboard-key');
      assert.equal(keys[0].dataset.keycode, 3);
      assert.equal(keys[1].dataset.keycode, 98);
    });

    test('On uppercase flag, uppercase visually', function() {
      var layout = {
        width: 2,
        keys: [
          [{ value: 'a' }, { value: 'b' }]
        ]
      };

      var uppercaseFn = sinon.stub().returns('U');
      IMERender.init(uppercaseFn, sinon.stub().returns(false));
      IMERender.draw(layout, { uppercase: true });

      var keys = document.querySelectorAll('.keyboard-key');
      assert.equal(keys[0].textContent, 'U');
      assert.equal(keys[1].textContent, 'U');
    });

    test('No uppercase flag, don\'t uppercase visually', function() {
      var layout = {
        width: 2,
        keys: [
          [{ value: 'a' }, { value: 'b' }]
        ]
      };

      var uppercaseFn = sinon.stub().returns('U');
      IMERender.init(uppercaseFn, sinon.stub().returns(false));
      IMERender.draw(layout, { uppercase: false });

      var keys = document.querySelectorAll('.keyboard-key');
      assert.equal(keys[0].textContent, 'a');
      assert.equal(keys[1].textContent, 'b');
    });

    test('candidate-panel class should be set if flag is set', function() {
      // Clear out the ime panel
      IMERender.activeIme = null;
      ime.innerHTML = '';

      var layout = {
        width: 1,
        keys: []
      };
      IMERender.draw(layout, { showCandidatePanel: true });
      assert.equal(ime.querySelector('.keyboard-type-container')
        .classList.contains('candidate-panel'), true);
    });

    test('candidate-panel class shouldnt be set if flag isnt set', function() {
      var layout = {
        width: 1,
        keys: []
      };
      IMERender.draw(layout);
      assert.equal(ime.classList.contains('candidate-panel'), false);
    });

    suite('showCandidates', function() {
      test('Has dismiss-suggestions-button', function() {
        var el = IMERender.candidatePanelCode();
        activeIme.appendChild(el);

        IMERender.setInputMethodName('latin');
        IMERender.showCandidates(['trah', 'lah', 'lo'], true);

        assert.equal(el.querySelectorAll('.dismiss-suggestions-button').length,
          1, 'Dismiss suggestions button present');
      });

      test('Three candidates', function() {
        var el = IMERender.candidatePanelCode();
        activeIme.appendChild(el);

        IMERender.setInputMethodName('latin');
        IMERender.showCandidates(['trah', 'lah', 'lo'], true);

        var spans = el.querySelectorAll('span');
        assert.equal(spans.length, 3);
        assert.equal(spans[0].textContent, 'trah', 'textContent 0');
        assert.equal(spans[0].dataset.data, 'trah', 'data 0');
        assert.equal(spans[1].textContent, 'lah', 'textContent 1');
        assert.equal(spans[1].dataset.data, 'lah', 'data 1');
        assert.equal(spans[2].textContent, 'lo', 'textContent 2');
        assert.equal(spans[2].dataset.data, 'lo', 'data 2');
      });

      test('Zero candidates', function() {
        var el = IMERender.candidatePanelCode();
        activeIme.appendChild(el);

        IMERender.setInputMethodName('latin');
        IMERender.showCandidates([], true);

        var spans = el.querySelectorAll('span');
        assert.equal(spans.length, 0);
      });

      test('Candidate with star', function() {
        var el = IMERender.candidatePanelCode();
        activeIme.appendChild(el);

        var can = ['*awesome', 'moar', 'whoo'];
        IMERender.setInputMethodName('latin');
        IMERender.showCandidates(can, true);

        var spans = el.querySelectorAll('span');
        assert.equal(spans.length, 3);
        assert.equal(spans[0].classList.contains('autocorrect'), true);
        assert.equal(spans[1].classList.contains('autocorrect'), false);
        assert.equal(spans[2].classList.contains('autocorrect'), false);
      });

      test('Scaling to 0.6', function() {
        var el = IMERender.candidatePanelCode();
        activeIme.appendChild(el);

        IMERender.setInputMethodName('latin');

        IMERender.getScale = function() {
          return 0.6;
        };

        var can = ['thisisverylongword', 'alsoverylongword', 'whatup'];
        IMERender.showCandidates(can, true);

        var spans = el.querySelectorAll('span');
        assert.equal(spans[0].textContent, can[0]);
        assert.equal(spans[1].textContent, can[1]);
        assert.equal(spans[2].textContent, can[2]);
        assert.equal(spans[0].style.width, '166.667%');
        assert.equal(spans[0].style.transformOrigin, 'left center 0px');
        assert.equal(spans[0].style.transform, 'scale(0.6)');
      });

      test('Scaling to 0.5', function() {
        var el = IMERender.candidatePanelCode();
        activeIme.appendChild(el);

        IMERender.setInputMethodName('latin');

        IMERender.getScale = function() {
          return 0.5;
        };

        var can = ['thisisverylongword', 'alsoverylongword', 'whatup'];
        IMERender.showCandidates(can, true);

        var spans = el.querySelectorAll('span');
        assert.equal(spans[0].textContent, 't…d');
        assert.equal(spans[1].textContent, 'a…d');
        assert.equal(spans[2].textContent, 'w…p');
        assert.equal(spans[0].style.width, '200%');
        assert.equal(spans[0].style.transformOrigin, 'left center 0px');
        assert.equal(spans[0].style.transform, 'scale(0.5)');
      });
    });

    suite('getVisualData', function() {
      var layout = {
        width: 10,
        keys: [
          [
            { value: 'q' }, { value: 'w' }, { value: 'e' } , { value: 'r' },
            { value: 't' } , { value: 'y' }, { value: 'u' } , { value: 'i' },
            { value: 'o' }, { value: 'p' }
          ], [
            { value: 'a' }, { value: 's' }, { value: 'd' }, { value: 'f' },
            { value: 'g' } , { value: 'h' }, { value: 'j' }, { value: 'k' },
            { value: 'l' }
          ], [
            { value: '⇪', ratio: 1.5, keyCode: KeyEvent.DOM_VK_CAPS_LOCK },
            { value: 'z' }, { value: 'x' }, { value: 'c' }, { value: 'v' },
            { value: 'b' }, { value: 'n' }, { value: 'm' },
            { value: '⌫', ratio: 1.5, keyCode: KeyEvent.DOM_VK_BACK_SPACE }
          ], [
            { value: '&nbsp', ratio: 8, keyCode: KeyboardEvent.DOM_VK_SPACE },
            { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
          ]
        ],
        keyboardName: 'yolo'
      };

      function verify(next) {
        var ka = IMERender.getKeyArray();

        ka.forEach(function(info) {
          var el = document.querySelector(
            '*[data-keycode="' + info.code + '"] .visual-wrapper');

          // Tolerate 1px difference for left + top
          assert.equal(Math.abs(el.offsetLeft - info.x) <= 1, true,
            'x was ' + info.x + ', but should be ' + el.offsetLeft);
          assert.equal(Math.abs(el.offsetTop - info.y) <= 1, true,
            'y was ' + info.y + ', but should be ' + el.offsetTop);
          assert.equal(el.clientWidth, info.width, 'width');
          assert.equal(el.clientHeight, info.height, 'height');
        });

        next();
      }

      test('No candidate panel', function(next) {
        IMERender.draw(layout, {}, function() {
          verify(next);
        });
      });

      test('With candidate panel', function(next) {
        IMERender.draw(layout, { showCandidatePanel: true }, function() {
          verify(next);
        });
      });

      test('No candidate panel, latin', function(next) {
        IMERender.draw(layout, {}, function() {
          IMERender.setInputMethodName('latin');

          verify(next);
        });
      });

      test('With candidate panel, latin', function(next) {
        IMERender.draw(layout, { showCandidatePanel: true }, function() {
          IMERender.setInputMethodName('latin');

          verify(next);
        });
      });
    });
  });
});
