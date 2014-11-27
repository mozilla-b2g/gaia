'use strict';
/* global IMERender */

requireApp('keyboard/js/render.js');
require('/js/views/key_view.js');
require('/js/views/base_view.js');
require('/js/views/layout_page_view.js');
require('/js/views/candidate_panel_view.js');
require('/js/views/latin_candidate_panel_view.js');
require('/js/views/view_utils.js');

suite('Renderer', function() {
  suiteSetup(function() {
    window.perfTimer = {
      printTime: function() {},
      startTimer: function() {}
    };
  });

  suiteTeardown(function() {
    window.perfTimer = null;
  });

  var fakeRenderingManager;
  var stubRequestAnimationFrame;

  setup(function() {
    fakeRenderingManager = {
      getTargetObject: function(elem) {
        return this.domObjectMap.get(elem);
      },
      domObjectMap: new WeakMap()
    };

    // Tests in CI do not necessarily run at the same resolution as a device.
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      get: () => 320 }
    );

    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      get: () => 480 }
    );

    stubRequestAnimationFrame =
      this.sinon.stub(window, 'requestAnimationFrame');
  });

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
    var ime, activeIme;

    setup(function(next) {
      document.body.innerHTML = '';

      ime = document.createElement('div');
      ime.id = 'keyboard';
      ime.style.width = '320px';
      document.body.appendChild(ime);

      activeIme = document.createElement('div');

      ime.appendChild(activeIme);

      Object.defineProperty(ime, 'clientWidth', makeDescriptor(300));

      IMERender.init(fakeRenderingManager);
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
      var layout = {
        width: 10,
        keys: [
          [{}, {}, {}, {}, {}, {}, {}, {}, {}, {}]
        ]
      };

      IMERender.draw(layout);

      IMERender.resizeUI(layout);
      stubRequestAnimationFrame.getCall(0).args[0]();

      var all = [].map.call(document.querySelectorAll('.visual-wrapper'),
        function(el) {
          return el.clientWidth;
        });

      assert.notEqual(all[0], 0);
      assert.equal(all.every(function(el) {
        return el === all[0];
      }), true, 'Every element has width ' + all[0]);
    });

    test('Key with ratio 2 should be twice as big', function(next) {
      var layout = {
        width: 3,
        keys: [
          [{ ratio: 2 }, {}]
        ]
      };

      IMERender.draw(layout, null, function() {
        var all = document.querySelectorAll('.keyboard-key');
        assert.equal(all[0].style.flexGrow, 2);
        next();
      });
      stubRequestAnimationFrame.getCall(0).args[0]();
    });

    test('Side keys should fill up space', function(next) {
      var layout = {
        width: 4,
        keys: [
          [{}, {}, {}]
        ]
      };

      IMERender.draw(layout, null, function() {
        var visual = document.querySelectorAll('.visual-wrapper');
        assert.equal(visual[0].clientWidth, visual[1].clientWidth,
          'Visually same');

        var keys = document.querySelectorAll('.keyboard-key');

        assert.equal(keys[0].style.flexGrow, 1.5);
        next();
      });
      stubRequestAnimationFrame.getCall(0).args[0]();
    });

    test('Sidekeys should adjust space when rotating', function(next) {
      IMERender.setCachedWindowSize(400, 200);
      Object.defineProperty(ime, 'clientWidth',
        makeDescriptor(400));

      var layout = {
        width: 4,
        keys: [
          [{}, {}, {}]
        ]
      };

      IMERender.draw(layout, null, function() {
        var visual = document.querySelectorAll('.visual-wrapper');

        IMERender.setCachedWindowSize(700, 1000);
        Object.defineProperty(ime, 'clientWidth', makeDescriptor(700));

        IMERender.resizeUI(layout, function() {
            assert.equal(visual[0].clientWidth, visual[1].clientWidth,
              'Visually same');

            next();
        });
        stubRequestAnimationFrame.getCall(1).args[0]();
      });
      stubRequestAnimationFrame.getCall(0).args[0]();
    });

    test('GetKeyArray sanity', function(next) {
      var layout = {
        width: 10,
        keys: [
          [{}, {}, {}, {}, {}, {}, {}, {}, {}, {}]
        ]
      };

      IMERender.draw(layout, null, function() {
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
      stubRequestAnimationFrame.getCall(0).args[0]();
    });

    test('GetKeyArray sanity for filled up space', function(next) {
      var layout = {
        width: 4,
        keys: [
          [{}, {}, {}]
        ]
      };

      IMERender.draw(layout, null, function() {
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
      stubRequestAnimationFrame.getCall(0).args[0]();
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

      IMERender.init(fakeRenderingManager);

      loadKeyboardStyle(next);
    });

    test('candidate-panel class shouldnt be set if flag isnt set', function() {
      var layout = {
        width: 1,
        keys: []
      };
      IMERender.draw(layout);
      assert.equal(ime.classList.contains('candidate-panel'), false);
    });

    suite('Dimensions', function() {
      function createDimensionTest(rowCount, orientation, suggest, latin,
                                   next) {
        var layout = {
          width: (Math.random() * 8 | 0) + 2,
          keys: [],
          layoutName: 'test',
          imEngine: latin ? 'latin' : 'nonLatin'
        };

        for (var ri = 0; ri < rowCount; ri++) {
          var r = [];
          for (var ki = 0, kl = (Math.random() * 8 | 0) + 2; ki < kl; ki++) {
            r.push({ value: (Math.random() * 26 | 0) + 97 });
          }
          layout.keys.push(r);
        }

        if (orientation === 'landscape') {
          document.querySelector('#keyboard').classList.remove('portrait');
          document.querySelector('#keyboard').classList.add('landscape');
        }
        else {
          document.querySelector('#keyboard').classList.add('portrait');
          document.querySelector('#keyboard').classList.remove('landscape');
        }

        var flags = suggest ?
          { showCandidatePanel: true } :
          {};

        IMERender.draw(layout, flags, function() {

          var imeHeight = IMERender.activeIme.scrollHeight;
          // it seems the margin would collapse for zero row count,
          // need to plus 2
          if (!latin && suggest && rowCount === 0) {
            imeHeight += 2;
          }

          assert.equal(imeHeight, IMERender.getHeight());

          next();
        });
        stubRequestAnimationFrame.getCall(0).args[0]();
      }

      var rows = [0, 1, 2, 3, 4, 5];
      var orientation = ['portrait', 'landscape'];
      var suggest = [true, false];
      var latin = [true, false];

      rows.forEach(function(row) {
        orientation.forEach(function(orientation) {
          suggest.forEach(function(suggest) {
            latin.forEach(function(latin) {
              var name = [
                'getHeight',
                row + ' rows',
                orientation,
                (suggest ? '' : 'no') + ' suggest',
                latin ? 'latin' : ''
              ].join(', ');

              test(name, function(next) {
                createDimensionTest(row, orientation, suggest, latin, next);
              });
            });
          });
        });
      });

      test('Container has a one pixel extra offset', function(next) {
        var comp = getComputedStyle(document.querySelector('#keyboard'));
        assert.equal(comp.paddingTop, '0px');
        assert.equal(comp.marginTop, '0px');
        assert.equal(comp.borderTopWidth, '1px');
        next();
      });
    });
  });

  suite('Highlight Keys', function() {
    var dummyKey = {
      dummy: 'dummy'
    };

    setup(function() {
      IMERender.init(fakeRenderingManager);
    });

    test('Highlight a key with uppercase', function() {
      var keyView = {
        highlight: this.sinon.stub(),
        element: {}
      };

      IMERender.registerView(dummyKey, keyView);

      IMERender.setUpperCaseLock({
        isUpperCase: true,
        isUpperCaseLocked: false
      });

      IMERender.highlightKey(dummyKey);

      assert.isTrue(keyView.highlight.called);
      assert.isTrue(keyView.highlight.calledWith({upperCase: true}));
    });

    test('Highlight a key with lowercase', function() {
      var keyView = {
        highlight: this.sinon.stub(),
        element: {}
      };

      IMERender.registerView(dummyKey, keyView);

      IMERender.setUpperCaseLock({
        isUpperCase: false,
        isUpperCaseLocked: false
      });

      IMERender.highlightKey(dummyKey);

      assert.isTrue(keyView.highlight.called);
      assert.isTrue(keyView.highlight.calledWith({upperCase: false}));
    });
  });
});
