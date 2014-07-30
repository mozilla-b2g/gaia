'use strict';

/* global LayoutManager, KeyboardEvent */

require('/js/keyboard/layout_loader.js');
require('/js/keyboard/layout_manager.js');

suite('LayoutManager', function() {
  var realKeyboards;

  var expectedFooLayout = {
    keys: [
      [
        { value: 'foo' }
      ]
    ],
    alt: {},
    upperCase: {}
  };

  suiteSetup(function() {
    realKeyboards = window.Keyboards;
  });

  suiteTeardown(function() {
    window.Keyboards = realKeyboards;
  });

  test('start', function() {
    window.Keyboards = {};

    var manager = new LayoutManager({});
    manager.start();

    assert.equal(manager.currentLayout, null, 'started with no layout.');
  });

  test('switchCurrentLayout', function(done) {
    window.Keyboards = {};

    var manager = new LayoutManager({});
    manager.start();
    manager.loader.SOURCE_DIR = './fake-layouts/';

    var p = manager.switchCurrentLayout('foo');
    p.then(function() {
      assert.isTrue(true, 'resolved');
      var layout = manager.loader.getLayout('foo');
      assert.deepEqual(layout, expectedFooLayout, 'foo loaded');
      assert.equal(manager.currentLayoutName, 'foo');
      assert.equal(manager.currentLayoutPage, manager.LAYOUT_PAGE_DEFAULT);
      assert.equal(manager.currentForcedModifiedLayoutName, undefined);
      assert.equal(manager.currentLayout, layout, 'currentLayout is set');

      done();
    }, function() {
      assert.isTrue(false, 'should not reject');

      done();
    });
  });

  test('switchCurrentLayout (failed loader)', function(done) {
    window.Keyboards = {};

    var manager = new LayoutManager({});
    manager.start();
    manager.loader.SOURCE_DIR = './fake-layouts/';

    var p = manager.switchCurrentLayout('bar');
    p.then(function() {
      assert.isTrue(false, 'should not resolve');

      done();
    }, function() {
      assert.isTrue(true, 'rejected');

      done();
    });
  });

  test('switchCurrentLayout (twice)', function(done) {
    window.Keyboards = {};

    var manager = new LayoutManager({});
    manager.start();
    manager.loader.SOURCE_DIR = './fake-layouts/';

    var p1 = manager.switchCurrentLayout('foo');
    var p2 = manager.switchCurrentLayout('foo');
    p1.then(function() {
      assert.isTrue(false, 'should not resolve');
    }, function() {
      assert.isTrue(true, 'rejected');
    });

    p2.then(function() {
      assert.isTrue(true, 'resolved');
      var layout = manager.loader.getLayout('foo');
      assert.deepEqual(layout, expectedFooLayout, 'foo loaded');
      assert.equal(manager.currentLayout, layout, 'currentLayout is set');

      done();
    }, function() {
      assert.isTrue(false, 'should not reject');

      done();
    });
  });

  test('switchCurrentLayout (reload after loaded)', function(done) {
    window.Keyboards = {};

    var manager = new LayoutManager({});
    manager.start();
    manager.loader.SOURCE_DIR = './fake-layouts/';

    var p = manager.switchCurrentLayout('foo');
    p.then(function() {
      assert.isTrue(true, 'resolved');
      var layout = manager.loader.getLayout('foo');
      assert.deepEqual(layout, expectedFooLayout, 'foo loaded');
      assert.equal(manager.currentLayout, layout, 'currentLayout is set');

      var p2 = manager.switchCurrentLayout('foo');

      p2.then(function() {
        assert.isTrue(true, 'resolved');
        var layout = manager.loader.getLayout('foo');
        assert.deepEqual(layout, expectedFooLayout, 'foo loaded');
        assert.equal(manager.currentLayout, layout,
          'currentLayout is set');

        done();
      }, function() {
        assert.isTrue(false, 'should not reject');

        done();
      });
    }, function() {
      assert.isTrue(false, 'should not reject');

      done();
    });
  });

  suite('currentModifiedLayout', function() {
    var manager;
    var app;
    var spaceLayout;
    var alternateLayout;
    var symbolLayout;
    setup(function() {
      spaceLayout = {
        imEngine: 'test-imEngine',
        keys: [
          [
            { value: 'S' }
          ],
          [
            { value: '&nbsp', ratio: 10,
              keyCode: KeyboardEvent.DOM_VK_SPACE }
          ]
        ]
      };
      alternateLayout = {
        keys: [
          [
            { value: 'A' }
          ],
          [
            { value: '&nbsp', ratio: 10,
              keyCode: KeyboardEvent.DOM_VK_SPACE }
          ]
        ]
      };
      symbolLayout = {
        keys: [
          [
            { value: 'S' }
          ],
          [
            { value: '&nbsp', ratio: 10,
              keyCode: KeyboardEvent.DOM_VK_SPACE }
          ]
        ]
      };

      window.Keyboards = {
        'spaceLayout': spaceLayout,
        'alternateLayout': alternateLayout,
        'symbolLayout': symbolLayout,
        'telLayout': { keys: [] },
        'numberLayout': { keys: [] },
        'pinLayout': { keys: [] },
        'spaceLayoutSpecial': { keys: [] }
      };

      app = {
        inputContext: {
          inputMode: ''
        },
        getBasicInputType: this.sinon.stub(),
        supportsSwitching: this.sinon.stub()
      };

      manager = new LayoutManager(app);
      manager.start();
    });

    teardown(function() {
      manager = null;
    });

    test('defaults (type=text)', function(done) {
      app.getBasicInputType.returns('text');
      app.supportsSwitching.returns(false);

      manager.switchCurrentLayout('spaceLayout').then(function() {
        assert.deepEqual(manager.currentLayout, spaceLayout,
          'Original layout not touched.');

        var expectedModifiedLayout = {
          layoutName: 'spaceLayout',
          alternativeLayoutName: '',
          keys: [ [ { value: 'S' } ],
                  [ { keyCode: manager.KEYCODE_ALTERNATE_LAYOUT,
                      value: '12&',
                      ratio: 1.5,
                      ariaLabel: 'alternateLayoutKey',
                      className: 'switch-key' },
                    { value: ',', ratio: 1, keyCode: 44 },
                    { ratio: 6.5 },
                    { value: '.', ratio: 1, keyCode: 46 } ] ] };

        assert.deepEqual(manager.currentModifiedLayout, expectedModifiedLayout);
        assert.equal(manager.currentModifiedLayout.__proto__,
          spaceLayout, 'proto is set correctly for layout.');
        assert.equal(manager.currentModifiedLayout.keys[1][2].__proto__,
          spaceLayout.keys[1][0], 'proto is set correctly for space key.');

        done();
      });
    });

    test('overwrite alternateLayoutKey', function(done) {
      app.getBasicInputType.returns('text');
      app.supportsSwitching.returns(false);
      spaceLayout.alternateLayoutKey = '90+';

      manager.switchCurrentLayout('spaceLayout').then(function() {
        assert.deepEqual(manager.currentLayout, spaceLayout,
          'Original layout not touched.');

        var expectedModifiedLayout = {
          layoutName: 'spaceLayout',
          alternativeLayoutName: '',
          keys: [ [ { value: 'S' } ],
                  [ { keyCode: manager.KEYCODE_ALTERNATE_LAYOUT,
                      value: '90+',
                      ratio: 1.5,
                      ariaLabel: 'alternateLayoutKey',
                      className: 'switch-key' },
                    { value: ',', ratio: 1, keyCode: 44 },
                    { ratio: 6.5 },
                    { value: '.', ratio: 1, keyCode: 46 } ] ] };

        assert.deepEqual(manager.currentModifiedLayout, expectedModifiedLayout);
        assert.equal(manager.currentModifiedLayout.__proto__,
          spaceLayout, 'proto is set correctly for layout.');
        assert.equal(manager.currentModifiedLayout.keys[1][2].__proto__,
          spaceLayout.keys[1][0], 'proto is set correctly for space key.');

        done();
      });
    });

    test('updateForcedModifiedLayout', function(done) {
      app.getBasicInputType.returns('text');
      app.supportsSwitching.returns(false);

      manager.switchCurrentLayout('spaceLayout').then(function() {
        manager.updateForcedModifiedLayout('spaceLayoutSpecial');
        assert.deepEqual(manager.currentLayout, spaceLayout,
          'Original layout not touched.');

        var expectedModifiedLayout = {
          layoutName: 'spaceLayoutSpecial',
          alternativeLayoutName: '',
          imEngine: 'test-imEngine' };

        assert.deepEqual(manager.currentModifiedLayout, expectedModifiedLayout);
        assert.equal(manager.currentModifiedLayout.__proto__,
          manager.loader.getLayout('spaceLayoutSpecial'),
          'proto is set correctly for layout.');
        assert.equal(manager.currentModifiedLayout.layoutName,
          'spaceLayoutSpecial');
        done();
      });
    });

    test('telLayout', function(done) {
      app.getBasicInputType.returns('tel');
      app.supportsSwitching.returns(false);

      manager.switchCurrentLayout('spaceLayout').then(function() {
        assert.deepEqual(manager.currentLayout, spaceLayout,
          'Original layout not touched.');

        var expectedModifiedLayout = {
          layoutName: 'spaceLayout',
          alternativeLayoutName: 'telLayout',
          imEngine: 'test-imEngine' };

        assert.deepEqual(manager.currentModifiedLayout, expectedModifiedLayout);
        assert.equal(manager.currentModifiedLayout.__proto__,
          manager.loader.getLayout('telLayout'),
          'proto is set correctly for layout.');

        done();
      });
    });

    test('pinLayout (number/digit)', function(done) {
      app.getBasicInputType.returns('number');
      app.inputContext.inputMode = 'digit';
      app.supportsSwitching.returns(false);

      manager.switchCurrentLayout('spaceLayout').then(function() {
        assert.deepEqual(manager.currentLayout, spaceLayout,
          'Original layout not touched.');

        var expectedModifiedLayout = {
          layoutName: 'spaceLayout',
          alternativeLayoutName: 'pinLayout',
          imEngine: 'test-imEngine' };

        assert.deepEqual(manager.currentModifiedLayout, expectedModifiedLayout);
        assert.equal(manager.currentModifiedLayout.__proto__,
          manager.loader.getLayout('pinLayout'),
          'proto is set correctly for layout.');

        done();
      });
    });

    test('pinLayout (text/digit)', function(done) {
      app.getBasicInputType.returns('text');
      app.inputContext.inputMode = 'digit';
      app.supportsSwitching.returns(false);

      manager.switchCurrentLayout('spaceLayout').then(function() {
        assert.deepEqual(manager.currentLayout, spaceLayout,
          'Original layout not touched.');

        var expectedModifiedLayout = {
          layoutName: 'spaceLayout',
          alternativeLayoutName: 'pinLayout',
          imEngine: 'test-imEngine' };

        assert.deepEqual(manager.currentModifiedLayout, expectedModifiedLayout);
        assert.equal(manager.currentModifiedLayout.__proto__,
          manager.loader.getLayout('pinLayout'),
          'proto is set correctly for layout.');

        done();
      });
    });

    test('numberLayout (number)', function(done) {
      app.getBasicInputType.returns('number');
      app.supportsSwitching.returns(false);

      manager.switchCurrentLayout('spaceLayout').then(function() {
        assert.deepEqual(manager.currentLayout, spaceLayout,
          'Original layout not touched.');

        var expectedModifiedLayout = {
          layoutName: 'spaceLayout',
          alternativeLayoutName: 'numberLayout',
          imEngine: 'test-imEngine' };

        assert.deepEqual(manager.currentModifiedLayout, expectedModifiedLayout);
        assert.equal(manager.currentModifiedLayout.__proto__,
          manager.loader.getLayout('numberLayout'),
          'proto is set correctly for layout.');

        done();
      });
    });

    test('numberLayout (text/numeric)', function(done) {
      app.getBasicInputType.returns('text');
      app.inputContext.inputMode = 'numeric';
      app.supportsSwitching.returns(false);

      manager.switchCurrentLayout('spaceLayout').then(function() {
        assert.deepEqual(manager.currentLayout, spaceLayout,
          'Original layout not touched.');

        var expectedModifiedLayout = {
          layoutName: 'spaceLayout',
          alternativeLayoutName: 'numberLayout',
          imEngine: 'test-imEngine' };

        assert.deepEqual(manager.currentModifiedLayout, expectedModifiedLayout);
        assert.equal(manager.currentModifiedLayout.__proto__,
          manager.loader.getLayout('numberLayout'),
          'proto is set correctly for layout.');

        done();
      });
    });

    test('special SMS layout if exist (text/-moz-sms)', function(done) {
      app.getBasicInputType.returns('text');
      app.inputContext.inputMode = '-moz-sms';
      app.supportsSwitching.returns(false);

      window.Keyboards['spaceLayout-sms'] = { keys: [] };
      manager.loader.initLayouts();

      manager.switchCurrentLayout('spaceLayout').then(function() {
        assert.deepEqual(manager.currentLayout, spaceLayout,
          'Original layout not touched.');

        var expectedModifiedLayout = {
          layoutName: 'spaceLayout',
          alternativeLayoutName: 'spaceLayout-sms',
          imEngine: 'test-imEngine' };

        assert.deepEqual(manager.currentModifiedLayout, expectedModifiedLayout);
        assert.equal(manager.currentModifiedLayout.__proto__,
          manager.loader.getLayout('spaceLayout-sms'),
          'proto is set correctly for layout.');

        done();
      });
    });

    test('no special SMS layout if not exist (text/-moz-sms)', function(done) {
      app.getBasicInputType.returns('text');
      app.inputContext.inputMode = '-moz-sms';
      app.supportsSwitching.returns(false);

      manager.switchCurrentLayout('spaceLayout').then(function() {
        assert.deepEqual(manager.currentLayout, spaceLayout,
          'Original layout not touched.');

        assert.equal(manager.currentModifiedLayout.__proto__,
          spaceLayout, 'proto is set correctly for layout.');
        assert.equal(manager.currentModifiedLayout.keys[1][2].__proto__,
          spaceLayout.keys[1][0], 'proto is set correctly for space key.');

        done();
      });
    });

    test('alternateLayout', function(done) {
      app.getBasicInputType.returns('text');
      app.supportsSwitching.returns(false);

      manager.switchCurrentLayout('spaceLayout').then(function() {
        manager.updateLayoutPage(manager.LAYOUT_PAGE_SYMBOLS_I);

        assert.deepEqual(manager.currentLayout, spaceLayout,
          'Original layout not touched.');

        var expectedModifiedLayout = {
          layoutName: 'spaceLayout',
          alternativeLayoutName: 'alternateLayout',
          imEngine: 'test-imEngine',
          keys: [ [ { value: 'A' } ],
                  [ { keyCode: manager.KEYCODE_BASIC_LAYOUT,
                      value: 'ABC',
                      ratio: 1.5,
                      ariaLabel: 'basicLayoutKey' },
                    { value: ',', ratio: 1, keyCode: 44 },
                    { ratio: 6.5 },
                    { value: '.', ratio: 1, keyCode: 46 } ] ] };

        assert.deepEqual(manager.currentModifiedLayout, expectedModifiedLayout);
        assert.equal(manager.currentModifiedLayout.imEngine,
                     spaceLayout.imEngine);
        assert.equal(manager.currentModifiedLayout.__proto__,
          alternateLayout, 'proto is set correctly for layout.');
        assert.equal(manager.currentModifiedLayout.keys[1][2].__proto__,
          alternateLayout.keys[1][0], 'proto is set correctly for space key.');

        done();
      });
    });

    test('alternateLayout (overwrite basicLayoutKey)', function(done) {
      app.getBasicInputType.returns('text');
      app.supportsSwitching.returns(false);
      spaceLayout.basicLayoutKey = 'XYZ';

      manager.switchCurrentLayout('spaceLayout').then(function() {
        manager.updateLayoutPage(manager.LAYOUT_PAGE_SYMBOLS_I);

        assert.deepEqual(manager.currentLayout, spaceLayout,
          'Original layout not touched.');

        var expectedModifiedLayout = {
          layoutName: 'spaceLayout',
          alternativeLayoutName: 'alternateLayout',
          imEngine: 'test-imEngine',
          keys: [ [ { value: 'A' } ],
                  [ { keyCode: manager.KEYCODE_BASIC_LAYOUT,
                      value: 'XYZ',
                      ratio: 1.5,
                      ariaLabel: 'basicLayoutKey' },
                    { value: ',', ratio: 1, keyCode: 44 },
                    { ratio: 6.5 },
                    { value: '.', ratio: 1, keyCode: 46 } ] ] };

        assert.deepEqual(manager.currentModifiedLayout, expectedModifiedLayout);
        assert.equal(manager.currentModifiedLayout.__proto__,
          alternateLayout, 'proto is set correctly for layout.');
        assert.equal(manager.currentModifiedLayout.keys[1][2].__proto__,
          alternateLayout.keys[1][0], 'proto is set correctly for space key.');

        done();
      });
    });

    test('alternateLayout (overwrite from currentLayout)', function(done) {
      app.getBasicInputType.returns('text');
      app.supportsSwitching.returns(false);

      spaceLayout.alternateLayout = { keys: [] };

      manager.switchCurrentLayout('spaceLayout').then(function() {
        manager.updateLayoutPage(manager.LAYOUT_PAGE_SYMBOLS_I);

        assert.deepEqual(manager.currentLayout, spaceLayout,
          'Original layout not touched.');

        var expectedModifiedLayout = {
          layoutName: 'spaceLayout',
          alternativeLayoutName: 'alternateLayout',
          imEngine: 'test-imEngine' };

        assert.deepEqual(manager.currentModifiedLayout, expectedModifiedLayout);
        assert.equal(manager.currentModifiedLayout.__proto__,
          spaceLayout.alternateLayout,
          'proto is set correctly for layout.');

        done();
      });
    });

    test('symbolLayout', function(done) {
      app.getBasicInputType.returns('text');
      app.supportsSwitching.returns(false);

      manager.switchCurrentLayout('spaceLayout').then(function() {
        manager.updateLayoutPage(manager.LAYOUT_PAGE_SYMBOLS_II);

        assert.deepEqual(manager.currentLayout, spaceLayout,
          'Original layout not touched.');

        var expectedModifiedLayout = {
          layoutName: 'spaceLayout',
          alternativeLayoutName: 'symbolLayout',
          imEngine: 'test-imEngine',
          keys: [ [ { value: 'S' } ],
                  [ { keyCode: manager.KEYCODE_BASIC_LAYOUT,
                      value: 'ABC',
                      ratio: 1.5,
                      ariaLabel: 'basicLayoutKey' },
                    { value: ',', ratio: 1, keyCode: 44 },
                    { ratio: 6.5 },
                    { value: '.', ratio: 1, keyCode: 46 } ] ] };

        assert.deepEqual(manager.currentModifiedLayout, expectedModifiedLayout);
        assert.equal(manager.currentModifiedLayout.__proto__,
          symbolLayout, 'proto is set correctly for layout.');
        assert.equal(manager.currentModifiedLayout.keys[1][2].__proto__,
          symbolLayout.keys[1][0], 'proto is set correctly for space key.');

        done();
      });
    });

    test('disableAlternateLayout', function(done) {
      app.getBasicInputType.returns('text');
      app.supportsSwitching.returns(false);
      spaceLayout.disableAlternateLayout = true;

      manager.switchCurrentLayout('spaceLayout').then(function() {
        assert.deepEqual(manager.currentLayout, spaceLayout,
          'Original layout not touched.');

        var expectedModifiedLayout = {
          layoutName: 'spaceLayout',
          alternativeLayoutName: '',
          keys: [ [ { value: 'S' } ],
                  [ { value: ',', ratio: 1, keyCode: 44 },
                    { ratio: 8 },
                    { value: '.', ratio: 1, keyCode: 46 } ] ] };

        assert.deepEqual(manager.currentModifiedLayout, expectedModifiedLayout);
        assert.equal(manager.currentModifiedLayout.__proto__,
          spaceLayout, 'proto is set correctly for layout.');
        assert.equal(manager.currentModifiedLayout.keys[1][1].__proto__,
          spaceLayout.keys[1][0], 'proto is set correctly for space key.');

        done();
      });
    });

    test('supportsSwitching', function(done) {
      app.getBasicInputType.returns('text');
      app.supportsSwitching.returns(true);

      manager.switchCurrentLayout('spaceLayout').then(function() {
        assert.deepEqual(manager.currentLayout, spaceLayout,
          'Original layout not touched.');

        var expectedModifiedLayout = {
          layoutName: 'spaceLayout',
          alternativeLayoutName: '',
          keys: [ [ { value: 'S' } ],
                  [ { keyCode: manager.KEYCODE_ALTERNATE_LAYOUT,
                      value: '12&',
                      ratio: 1.5,
                      ariaLabel: 'alternateLayoutKey',
                      className: 'switch-key' },
                    { value: '&#x1f310;',
                      ratio: 1,
                      keyCode: -3,
                      className: 'switch-key' },
                    { ratio: 6.5 },
                    { value: '.', ratio: 1, keyCode: 46 } ] ] };

        assert.deepEqual(manager.currentModifiedLayout, expectedModifiedLayout);
        assert.equal(manager.currentModifiedLayout.__proto__,
          spaceLayout, 'proto is set correctly for layout.');
        assert.equal(manager.currentModifiedLayout.keys[1][2].__proto__,
          spaceLayout.keys[1][0], 'proto is set correctly for space key.');

        done();
      });
    });

    test('supportsSwitching (with shortLabel)', function(done) {
      app.getBasicInputType.returns('text');
      app.supportsSwitching.returns(true);
      spaceLayout.shortLabel = 'Sp';

      manager.switchCurrentLayout('spaceLayout').then(function() {
        assert.deepEqual(manager.currentLayout, spaceLayout,
          'Original layout not touched.');

        var expectedModifiedLayout = {
          layoutName: 'spaceLayout',
          alternativeLayoutName: '',
          keys: [ [ { value: 'S' } ],
                  [ { keyCode: manager.KEYCODE_ALTERNATE_LAYOUT,
                      value: '12&',
                      ratio: 1.5,
                      ariaLabel: 'alternateLayoutKey',
                      className: 'switch-key' },
                    { value: 'Sp',
                      ratio: 1,
                      keyCode: -3,
                      className: 'switch-key alternate-indicator' },
                    { ratio: 6.5 },
                    { value: '.', ratio: 1, keyCode: 46 } ] ] };

        assert.deepEqual(manager.currentModifiedLayout, expectedModifiedLayout);
        assert.equal(manager.currentModifiedLayout.__proto__,
          spaceLayout, 'proto is set correctly for layout.');
        assert.equal(manager.currentModifiedLayout.keys[1][2].__proto__,
          spaceLayout.keys[1][0], 'proto is set correctly for space key.');

        done();
      });
    });

    test('hidesSwitchKey', function(done) {
      app.getBasicInputType.returns('text');
      app.supportsSwitching.returns(true);
      spaceLayout.hidesSwitchKey = true;

      manager.switchCurrentLayout('spaceLayout').then(function() {
        assert.deepEqual(manager.currentLayout, spaceLayout,
          'Original layout not touched.');

        var expectedModifiedLayout = {
          layoutName: 'spaceLayout',
          alternativeLayoutName: '',
          keys: [ [ { value: 'S' } ],
                  [ { keyCode: manager.KEYCODE_ALTERNATE_LAYOUT,
                      value: '12&',
                      ratio: 1.5,
                      ariaLabel: 'alternateLayoutKey',
                      className: 'switch-key' },
                    { value: ',', ratio: 1, keyCode: 44 },
                    { ratio: 6.5 },
                    { value: '.', ratio: 1, keyCode: 46 } ] ] };

        assert.deepEqual(manager.currentModifiedLayout, expectedModifiedLayout);
        assert.equal(manager.currentModifiedLayout.__proto__,
          spaceLayout, 'proto is set correctly for layout.');
        assert.equal(manager.currentModifiedLayout.keys[1][2].__proto__,
          spaceLayout.keys[1][0], 'proto is set correctly for space key.');

        done();
      });
    });

    test('type=url', function(done) {
      app.getBasicInputType.returns('url');
      app.supportsSwitching.returns(false);

      manager.switchCurrentLayout('spaceLayout').then(function() {
        assert.deepEqual(manager.currentLayout, spaceLayout,
          'Original layout not touched.');

        var expectedModifiedLayout = {
          layoutName: 'spaceLayout',
          alternativeLayoutName: '',
          keys: [ [ { value: 'S' } ],
                  [ { keyCode: manager.KEYCODE_ALTERNATE_LAYOUT,
                      value: '12&',
                      ratio: 1.5,
                      ariaLabel: 'alternateLayoutKey',
                      className: 'switch-key' },
                    { value: '/', ratio: 1, keyCode: 47 },
                    { ratio: 6.5 },
                    { value: '.', ratio: 1, keyCode: 46 } ] ] };

        assert.deepEqual(manager.currentModifiedLayout, expectedModifiedLayout);
        assert.equal(manager.currentModifiedLayout.__proto__,
          spaceLayout, 'proto is set correctly for layout.');
        assert.equal(manager.currentModifiedLayout.keys[1][2].__proto__,
          spaceLayout.keys[1][0], 'proto is set correctly for space key.');

        done();
      });
    });

    test('type=email', function(done) {
      app.getBasicInputType.returns('email');
      app.supportsSwitching.returns(false);

      manager.switchCurrentLayout('spaceLayout').then(function() {
        assert.deepEqual(manager.currentLayout, spaceLayout,
          'Original layout not touched.');

        var expectedModifiedLayout = {
          layoutName: 'spaceLayout',
          alternativeLayoutName: '',
          keys: [ [ { value: 'S' } ],
                  [ { keyCode: manager.KEYCODE_ALTERNATE_LAYOUT,
                      value: '12&',
                      ratio: 1.5,
                      ariaLabel: 'alternateLayoutKey',
                      className: 'switch-key' },
                    { value: '@', ratio: 1, keyCode: 64 },
                    { ratio: 6.5 },
                    { value: '.', ratio: 1, keyCode: 46 } ] ] };

        assert.deepEqual(manager.currentModifiedLayout, expectedModifiedLayout);
        assert.equal(manager.currentModifiedLayout.__proto__,
          spaceLayout, 'proto is set correctly for layout.');
        assert.equal(manager.currentModifiedLayout.keys[1][2].__proto__,
          spaceLayout.keys[1][0], 'proto is set correctly for space key.');

        done();
      });
    });

    test('type=text (suppress comma)', function(done) {
      app.getBasicInputType.returns('text');
      app.supportsSwitching.returns(false);
      spaceLayout.textLayoutOverwrite = {
        ',': false
      };

      manager.switchCurrentLayout('spaceLayout').then(function() {
        assert.deepEqual(manager.currentLayout, spaceLayout,
          'Original layout not touched.');

        var expectedModifiedLayout = {
          layoutName: 'spaceLayout',
          alternativeLayoutName: '',
          keys: [ [ { value: 'S' } ],
                  [ { keyCode: manager.KEYCODE_ALTERNATE_LAYOUT,
                      value: '12&',
                      ratio: 1.5,
                      ariaLabel: 'alternateLayoutKey',
                      className: 'switch-key' },
                    { ratio: 7.5 },
                    { value: '.', ratio: 1, keyCode: 46 } ] ] };

        assert.deepEqual(manager.currentModifiedLayout, expectedModifiedLayout);
        assert.equal(manager.currentModifiedLayout.__proto__,
          spaceLayout, 'proto is set correctly for layout.');
        assert.equal(manager.currentModifiedLayout.keys[1][1].__proto__,
          spaceLayout.keys[1][0], 'proto is set correctly for space key.');

        done();
      });
    });

    test('type=text (overwrite comma values)', function(done) {
      app.getBasicInputType.returns('text');
      app.supportsSwitching.returns(false);
      spaceLayout.textLayoutOverwrite = {
        ',': '!'
      };

      manager.switchCurrentLayout('spaceLayout').then(function() {
        assert.deepEqual(manager.currentLayout, spaceLayout,
          'Original layout not touched.');

        var expectedModifiedLayout = {
          layoutName: 'spaceLayout',
          alternativeLayoutName: '',
          keys: [ [ { value: 'S' } ],
                  [ { keyCode: manager.KEYCODE_ALTERNATE_LAYOUT,
                      value: '12&',
                      ratio: 1.5,
                      ariaLabel: 'alternateLayoutKey',
                      className: 'switch-key' },
                    { value: '!', ratio: 1, keyCode: 33 },
                    { ratio: 6.5 },
                    { value: '.', ratio: 1, keyCode: 46 } ] ] };

        assert.deepEqual(manager.currentModifiedLayout, expectedModifiedLayout);
        assert.equal(manager.currentModifiedLayout.__proto__,
          spaceLayout, 'proto is set correctly for layout.');
        assert.equal(manager.currentModifiedLayout.keys[1][2].__proto__,
          spaceLayout.keys[1][0], 'proto is set correctly for space key.');

        done();
      });
    });

    test('type=text (suppress period)', function(done) {
      app.getBasicInputType.returns('text');
      app.supportsSwitching.returns(false);
      spaceLayout.textLayoutOverwrite = {
        '.': false
      };

      manager.switchCurrentLayout('spaceLayout').then(function() {
        assert.deepEqual(manager.currentLayout, spaceLayout,
          'Original layout not touched.');

        var expectedModifiedLayout = {
          layoutName: 'spaceLayout',
          alternativeLayoutName: '',
          keys: [ [ { value: 'S' } ],
                  [ { keyCode: manager.KEYCODE_ALTERNATE_LAYOUT,
                      value: '12&',
                      ratio: 1.5,
                      ariaLabel: 'alternateLayoutKey',
                      className: 'switch-key' },
                    { value: ',', ratio: 1, keyCode: 44 },
                    { ratio: 7.5 } ] ] };

        assert.deepEqual(manager.currentModifiedLayout, expectedModifiedLayout);
        assert.equal(manager.currentModifiedLayout.__proto__,
          spaceLayout, 'proto is set correctly for layout.');
        assert.equal(manager.currentModifiedLayout.keys[1][2].__proto__,
          spaceLayout.keys[1][0], 'proto is set correctly for space key.');

        done();
      });
    });

    test('type=text (period with alternate-indicator)', function(done) {
      app.getBasicInputType.returns('text');
      app.supportsSwitching.returns(false);
      spaceLayout.alt = {
        '.': '. * +'
      };

      manager.switchCurrentLayout('spaceLayout').then(function() {
        assert.deepEqual(manager.currentLayout, spaceLayout,
          'Original layout not touched.');

        var expectedModifiedLayout = {
          layoutName: 'spaceLayout',
          alternativeLayoutName: '',
          keys: [ [ { value: 'S' } ],
                  [ { keyCode: manager.KEYCODE_ALTERNATE_LAYOUT,
                      value: '12&',
                      ratio: 1.5,
                      ariaLabel: 'alternateLayoutKey',
                      className: 'switch-key' },
                    { value: ',', ratio: 1, keyCode: 44 },
                    { ratio: 6.5 },
                    { value: '.',
                      ratio: 1,
                      keyCode: 46,
                      className: 'alternate-indicator' } ] ] };

        assert.deepEqual(manager.currentModifiedLayout, expectedModifiedLayout);
        assert.equal(manager.currentModifiedLayout.__proto__,
          spaceLayout, 'proto is set correctly for layout.');
        assert.equal(manager.currentModifiedLayout.keys[1][2].__proto__,
          spaceLayout.keys[1][0], 'proto is set correctly for space key.');

        done();
      });
    });

    test('type=text (overwrite period values)', function(done) {
      app.getBasicInputType.returns('text');
      app.supportsSwitching.returns(false);
      spaceLayout.textLayoutOverwrite = {
        '.': '*'
      };

      manager.switchCurrentLayout('spaceLayout').then(function() {
        assert.deepEqual(manager.currentLayout, spaceLayout,
          'Original layout not touched.');

        var expectedModifiedLayout = {
          layoutName: 'spaceLayout',
          alternativeLayoutName: '',
          keys: [ [ { value: 'S' } ],
                  [ { keyCode: manager.KEYCODE_ALTERNATE_LAYOUT,
                      value: '12&',
                      ratio: 1.5,
                      ariaLabel: 'alternateLayoutKey',
                      className: 'switch-key' },
                    { value: ',', ratio: 1, keyCode: 44 },
                    { ratio: 6.5 },
                    { value: '*', ratio: 1, keyCode: 42 } ] ] };

        assert.deepEqual(manager.currentModifiedLayout, expectedModifiedLayout);
        assert.equal(manager.currentModifiedLayout.__proto__,
          spaceLayout, 'proto is set correctly for layout.');
        assert.equal(manager.currentModifiedLayout.keys[1][2].__proto__,
          spaceLayout.keys[1][0], 'proto is set correctly for space key.');

        done();
      });
    });

    test('needsCommaKey', function(done) {
      app.getBasicInputType.returns('text');
      app.supportsSwitching.returns(true);
      spaceLayout.needsCommaKey = true;

      manager.switchCurrentLayout('spaceLayout').then(function() {
        assert.deepEqual(manager.currentLayout, spaceLayout,
          'Original layout not touched.');

        var expectedModifiedLayout = {
          layoutName: 'spaceLayout',
          alternativeLayoutName: '',
          keys: [ [ { value: 'S' } ],
                  [ { keyCode: manager.KEYCODE_ALTERNATE_LAYOUT,
                      value: '12&',
                      ratio: 1.5,
                      ariaLabel: 'alternateLayoutKey',
                      className: 'switch-key' },
                    { value: '&#x1f310;',
                      ratio: 1,
                      keyCode: -3,
                      className: 'switch-key' },
                    { value: ',', ratio: 1, keyCode: 44 },
                    { ratio: 5.5 },
                    { value: '.', ratio: 1, keyCode: 46 } ] ] };

        assert.deepEqual(manager.currentModifiedLayout, expectedModifiedLayout);
        assert.equal(manager.currentModifiedLayout.__proto__,
          spaceLayout, 'proto is set correctly for layout.');
        assert.equal(manager.currentModifiedLayout.keys[1][3].__proto__,
          spaceLayout.keys[1][0], 'proto is set correctly for space key.');

        done();
      });
    });
  });
});
