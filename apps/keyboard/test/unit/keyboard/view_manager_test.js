'use strict';
/* global ViewManager */

require('/js/keyboard/view_manager.js');
require('/js/views/key_view.js');
require('/js/views/base_view.js');
require('/js/views/layout_page_view.js');
require('/js/views/candidate_panel_view.js');
require('/js/views/latin_candidate_panel_view.js');
require('/js/views/view_utils.js');

suite('View Manager', function() {
  suiteSetup(function() {
    window.perfTimer = {
      printTime: function() {},
      startTimer: function() {}
    };
  });

  suiteTeardown(function() {
    window.perfTimer = null;
  });

  var app = null;
  var viewManager = null;
  var fakeRenderingManager;
  var stubRequestAnimationFrame;

  var container, activeIme;

  setup(function(next) {
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

    document.body.innerHTML = '';

    container = document.createElement('div');
    container.id = 'keyboard';
    document.body.appendChild(container);

    activeIme = document.createElement('div');

    container.appendChild(activeIme);

    Object.defineProperty(container, 'clientWidth', makeDescriptor(320));

    app = {
      layoutRenderingManager: fakeRenderingManager
    };

    viewManager = new ViewManager(app);
    viewManager.start();
    loadKeyboardStyle(next);
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

  suite(' > resize()', function() {
    test('Add portrait class to IME in portrait mode', function() {
      viewManager.cachedWindowWidth = 200;
      viewManager.cachedWindowHeight = 400;

      viewManager.resize();

      assert.equal(viewManager.container.classList.contains('portrait'), true);
      assert.equal(viewManager.container.classList.contains('landscape'),
                   false);
    });

    test('Add landscape class to IME in landscape mode', function() {
      viewManager.cachedWindowWidth = 400;
      viewManager.cachedWindowHeight = 200;

      viewManager.resize();

      assert.equal(viewManager.container.classList.contains('landscape'), true);
      assert.equal(viewManager.container.classList.contains('portrait'), false);
    });

    test('All keys should have same visual width if fully used', function() {
      var layout = {
        width: 10,
        keys: [
          [{}, {}, {}, {}, {}, {}, {}, {}, {}, {}]
        ]
      };

      viewManager.render(layout);
      viewManager.resize();

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

      viewManager.render(layout, null, function() {
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

      viewManager.render(layout, null, function() {
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
      viewManager.cachedWindowWidth = 400;
      viewManager.cachedWindowHeight = 200;
      Object.defineProperty(container, 'clientWidth',
        makeDescriptor(400));

      var layout = {
        width: 4,
        keys: [
          [{}, {}, {}]
        ]
      };

      viewManager.render(layout, null, function() {
        var visual = document.querySelectorAll('.visual-wrapper');

        viewManager.cachedWindowWidth = 700;
        viewManager.cachedWindowHeight = 1000;
        Object.defineProperty(container, 'clientWidth', makeDescriptor(700));

        viewManager.resize(function() {
            assert.equal(visual[0].clientWidth, visual[1].clientWidth,
              'Visually same');

            next();
        });
        stubRequestAnimationFrame.getCall(1).args[0]();
      });
      stubRequestAnimationFrame.getCall(0).args[0]();
    });

    test('getKeyArray()', function() {
      viewManager.currentPageView = {
        getVisualData: sinon.stub()
      };

      viewManager.getKeyArray();

      assert.ok(viewManager.currentPageView.getVisualData.called);
    });
  });

  suite('> render()', function() {

    test('candidate-panel class shouldnt be set if flag isnt set', function() {
      var layout = {
        width: 1,
        keys: []
      };
      viewManager.render(layout);
      assert.equal(viewManager.container.classList.contains('candidate-panel'),
                   false);
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

        viewManager.render(layout, flags, function() {

          var imeHeight = viewManager.currentPageView.element.scrollHeight;
          // it seems the margin would collapse for zero row count,
          // need to plus 2
          if (!latin && suggest && rowCount === 0) {
            imeHeight += 2;
          }

          assert.equal(imeHeight, viewManager.getHeight());

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

    setup(function(){
      var layout = {
        width: 2,
        keys: [
          [{}, {}]
        ]
      };
      viewManager.render(layout);
    });

    test('Highlight a key with uppercase', function() {
      var keyView = {
        highlight: this.sinon.stub(),
        element: {}
      };

      viewManager.registerView(dummyKey, keyView);

      viewManager.setUpperCaseLock({
        isUpperCase: true,
        isUpperCaseLocked: false
      });

      viewManager.highlightKey(dummyKey);

      assert.isTrue(keyView.highlight.called);
      assert.isTrue(keyView.highlight.calledWith({upperCase: true}));
    });

    test('Highlight a key with lowercase', function() {
      var keyView = {
        highlight: this.sinon.stub(),
        element: {}
      };

      viewManager.registerView(dummyKey, keyView);

      viewManager.setUpperCaseLock({
        isUpperCase: false,
        isUpperCaseLocked: false
      });

      viewManager.highlightKey(dummyKey);

      assert.isTrue(keyView.highlight.called);
      assert.isTrue(keyView.highlight.calledWith({upperCase: false}));
    });
  });
});
