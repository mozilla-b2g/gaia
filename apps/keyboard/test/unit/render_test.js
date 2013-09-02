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

  suite('resizeUI', function() {
    function createKeyboardRow(chars, layoutWidth) {
      var row = document.createElement('div');
      row.classList.add('keyboard-row');
      row.dataset.layoutWidth = layoutWidth;
      chars.forEach(function(c) {
        row.innerHTML += '<div class="keyboard-key">' +
          '<div class="visual-wrapper">' + c + '</div></div>';
      });
      ime.appendChild(row);
      return row;
    }

    var ime, _iw, _ih;
    setup(function() {
      document.body.innerHTML = '';

      var style = document.createElement('link');
      style.rel = 'stylesheet';
      style.type = 'text/css';
      style.href = '../../style/keyboard.css';
      document.body.appendChild(style);

      ime = document.createElement('div');
      ime.id = 'keyboard';
      document.body.appendChild(ime);

      _iw = Object.getOwnPropertyDescriptor(Window.prototype, 'innerWidth');
      _ih = Object.getOwnPropertyDescriptor(Window.prototype, 'innerHeight');

      // we're testing layout stuff, so make sure to also have width/height
      // in a headless browser
      Object.defineProperty(Window.prototype, 'innerWidth',
        makeDescriptor(300));
      Object.defineProperty(ime, 'clientWidth',
        makeDescriptor(300));
      Object.defineProperty(Window.prototype, 'innerHeight',
        makeDescriptor(400));
    });

    teardown(function() {
      Object.defineProperty(Window.prototype, 'innerWidth', _iw);
      Object.defineProperty(Window.prototype, 'innerHeight', _ih);
    });

    test('Add portrait class to IME in portrait mode', function() {
      Object.defineProperty(Window.prototype, 'innerWidth',
        makeDescriptor(200));
      Object.defineProperty(Window.prototype, 'innerHeight',
        makeDescriptor(400));

      IMERender.resizeUI(null);

      assert.equal(ime.classList.contains('portrait'), true);
      assert.equal(ime.classList.contains('landscape'), false);
    });

    test('Add landscape class to IME in landscape mode', function() {
      Object.defineProperty(Window.prototype, 'innerWidth',
        makeDescriptor(400));
      Object.defineProperty(Window.prototype, 'innerHeight',
        makeDescriptor(200));

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

    test('Key with ratio 2 should be twice as big', function() {
      var row = createKeyboardRow(['a', 'b'], 3);

      var layout = {
        width: 3,
        keys: [
          [{ ratio: 2 }, {}]
        ]
      };

      IMERender.resizeUI(layout);

      // TODO: Bug 885686 - Measure visual-key width
      var all = row.querySelectorAll('.keyboard-key');
      assert.equal(all[0].clientWidth, all[1].clientWidth * 2);
    });

    test('Side keys should fill up space', function(next) {
      Object.defineProperty(Window.prototype, 'innerWidth',
        makeDescriptor(200));
      Object.defineProperty(ime, 'clientWidth',
        makeDescriptor(200));
      Object.defineProperty(Window.prototype, 'innerHeight',
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
        assert.equal(visual[0].clientWidth, visual[1].clientWidth,
          'Visually same');

        var keys = row.querySelectorAll('.keyboard-key');

        var totalWidth = 200;

        // due to pixels not being able to be .5 this can end up being 1 diff
        assert.equal(totalWidth,
          keys[0].clientWidth + keys[1].clientWidth + keys[2].clientWidth);

        assert.equal(keys[0].classList.contains('float-key-first'), true);
        assert.equal(keys[2].classList.contains('float-key-last'), true);

        next();
      });
    });

    test('Side keys should fill up space in landscape', function(next) {
      Object.defineProperty(Window.prototype, 'innerWidth',
        makeDescriptor(400));
      Object.defineProperty(ime, 'clientWidth',
        makeDescriptor(400));
      Object.defineProperty(Window.prototype, 'innerHeight',
        makeDescriptor(200));

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

        assert.equal(keys[0].classList.contains('float-key-first'), true);
        assert.equal(keys[2].classList.contains('float-key-last'), true);

        next();
      });
    });

    test('Sidekeys should adjust space when rotating', function(next) {
      Object.defineProperty(Window.prototype, 'innerWidth',
        makeDescriptor(400));
      Object.defineProperty(ime, 'clientWidth',
        makeDescriptor(400));
      Object.defineProperty(Window.prototype, 'innerHeight',
        makeDescriptor(200));

      var row = createKeyboardRow(['a', 'b', 'c'], 3);

      var layout = {
        width: 4,
        keys: [
          [{}, {}, {}]
        ]
      };

      IMERender.resizeUI(layout, function() {
        var visual = row.querySelectorAll('.visual-wrapper');

        Object.defineProperty(Window.prototype, 'innerWidth',
          makeDescriptor(700));
        Object.defineProperty(ime, 'clientWidth',
          makeDescriptor(700));
        Object.defineProperty(Window.prototype, 'innerHeight',
          makeDescriptor(1000));

        IMERender.resizeUI(layout);

        assert.equal(visual[0].clientWidth, visual[1].clientWidth,
          'Visually same');

        next();
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
          assert.equal(v.offsetLeft, keyArray[ix].x, 'x for ' + ix);
          assert.equal(v.offsetTop, keyArray[ix].y, 'y for ' + ix);
          assert.equal(v.clientWidth, keyArray[ix].width, 'width for ' + ix);
          assert.equal(v.clientHeight, keyArray[ix].height, 'height for ' + ix);
        });

        next();
      });
    });
  });

  suite('Draw', function() {
    var ime;
    setup(function() {
      document.body.innerHTML = '';

      var style = document.createElement('link');
      style.rel = 'stylesheet';
      style.type = 'text/css';
      style.href = '../../style/keyboard.css';
      document.body.appendChild(style);

      ime = document.createElement('div');
      ime.id = 'keyboard';
      document.body.appendChild(ime);

      IMERender.init(function(inp) {
        return inp.toUpperCase();
      }, function(key) {
        return false; // is special key
      });
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

    test('candidate-panel class should be set if flag is set', function() {
      var layout = {
        width: 1,
        keys: []
      };
      IMERender.draw(layout, { showCandidatePanel: true });
      assert.equal(ime.classList.contains('candidate-panel'), true);
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
      test('Three candidates literal HTML', function() {
        var el = document.createElement('div');
        el.id = 'keyboard-candidate-panel';
        ime.appendChild(el);

        IMERender.showCandidates(['trah', 'lah', 'lo'], true);

        assert.equal(el.outerHTML,
          '<div id="keyboard-candidate-panel"><div style="width: 31.3333%;">' +
          '<span data-data="trah" data-selection="true" style="display: inli' +
          'ne-block; width: 100%;">trah</span></div><div style="width: 31.33' +
          '33%;"><span data-data="lah" data-selection="true" style="display:' +
          ' inline-block; width: 100%;">lah</span></div><div style="width: 3' +
          '1.3333%;"><span data-data="lo" data-selection="true" style="displ' +
          'ay: inline-block; width: 100%;">lo</span></div></div>');
      });

      test('Three candidates', function() {
        var el = document.createElement('div');
        el.id = 'keyboard-candidate-panel';
        ime.appendChild(el);

        IMERender.showCandidates(['trah', 'lah', 'lo'], true);

        var spans = el.querySelectorAll('span');
        assert.equal(spans.length, 3);
        assert.equal(spans[0].textContent, 'trah');
        assert.equal(spans[0].dataset.data, 'trah');
        assert.equal(spans[1].textContent, 'lah');
        assert.equal(spans[1].dataset.data, 'lah');
        assert.equal(spans[2].textContent, 'lo');
        assert.equal(spans[2].dataset.data, 'lo');
        assert.equal([].every.call(spans, function(s) {
          return s.parentNode.style.width === '31.3333%';
        }), true);
      });

      test('Zero candidates', function() {
        var el = document.createElement('div');
        el.id = 'keyboard-candidate-panel';
        ime.appendChild(el);

        IMERender.showCandidates([], true);

        var spans = el.querySelectorAll('span');
        assert.equal(spans.length, 0);
      });

      test('Candidate with star', function() {
        var el = document.createElement('div');
        el.id = 'keyboard-candidate-panel';
        ime.appendChild(el);

        var can = ['*awesome', 'moar', 'whoo'];
        IMERender.showCandidates(can, true);

        var spans = el.querySelectorAll('span');
        assert.equal(spans.length, 3);
        assert.equal(spans[0].classList.contains('autocorrect'), true);
        assert.equal(spans[1].classList.contains('autocorrect'), false);
        assert.equal(spans[2].classList.contains('autocorrect'), false);
      });

      test('Scaling to 0.6', function() {
        var el = document.createElement('div');
        el.id = 'keyboard-candidate-panel';
        ime.appendChild(el);

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
        var el = document.createElement('div');
        el.id = 'keyboard-candidate-panel';
        ime.appendChild(el);

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
  });
});
