'use strict';

/* global LayoutManager, KeyboardEvent */

require('/js/keyboard/layout_loader.js');
require('/js/keyboard/layout_manager.js');

suite('LayoutManager', function() {
  var realKeyboards;

  var expectedFooLayout = {
    pages: [
      {
        keys: [
          [
            { value: 'foo' }
          ]
        ],
        alt: {},
        upperCase: {}
      }
    ]
  };

  suiteSetup(function() {
    realKeyboards = window.Keyboards;
  });

  suiteTeardown(function() {
    window.Keyboards = realKeyboards;
  });

  // since bug 1035619, enter key's layout properties will always come
  // from its prototype. and assert.deepEqual doesn't take prototype into
  // consideration, so we do the comparison by ourselves with a helper function
  var assertExpectedLayoutsWithEnter = function (test, expected, rowIndex,
                                                 enterIndex, msg) {
    var expectedEnter = expected.keys[rowIndex][enterIndex];
    expected.keys[rowIndex][enterIndex] = {};
    assert.deepEqual(test, expected, msg);
    for (var key in expectedEnter) {
      assert.equal(test.keys[rowIndex][enterIndex][key], expectedEnter[key],
                   msg);
    }
  };

  test('start', function() {
    window.Keyboards = {};

    var manager = new LayoutManager({});
    manager.start();

    assert.equal(manager.currentPage, null, 'started with no layout.');
  });

  test('switchCurrentLayout', function(done) {
    window.Keyboards = {};

    var manager = new LayoutManager({
      inputContext: {
        inputMode: ''
      },
      getBasicInputType: this.sinon.stub().returns('text'),
      supportsSwitching: this.sinon.stub().returns(false)
    });
    manager.start();
    manager.loader.SOURCE_DIR = './fake-layouts/';

    var p = manager.switchCurrentLayout('foo');

    p.then(function() {
      assert.isTrue(true, 'resolved');
      var layout = manager.loader.getLayout('foo');
      assert.deepEqual(layout, expectedFooLayout, 'foo loaded');
      assert.equal(manager.currentPageIndex, manager.PAGE_INDEX_DEFAULT);
      assert.deepEqual(manager.currentPage, { layoutName: 'foo', pageIndex: 0 },
        'currentPage is correctly set.');
      assert.equal(manager.currentPage.__proto__, layout.pages[0]);
    }, function(e) {
      if (e) {
        throw e;
      }
      assert.isTrue(false, 'should not reject');
    }).then(done, done);
  });

  test('switchCurrentLayout (failed loader)', function(done) {
    window.Keyboards = {};

    var manager = new LayoutManager({});
    manager.start();
    manager.loader.SOURCE_DIR = './fake-layouts/';

    var p = manager.switchCurrentLayout('bar');
    p.then(function() {
      assert.isTrue(false, 'should not resolve');
    }, function() {
      assert.isTrue(true, 'rejected');
    }).then(done, done);
  });

  test('switchCurrentLayout (twice)', function(done) {
    window.Keyboards = {};

    var manager = new LayoutManager({
      inputContext: {
        inputMode: ''
      },
      getBasicInputType: this.sinon.stub().returns('text'),
      supportsSwitching: this.sinon.stub().returns(false)
    });
    manager.start();
    manager.loader.SOURCE_DIR = './fake-layouts/';

    var p1 = manager.switchCurrentLayout('foo');
    var p2 = manager.switchCurrentLayout('foo');
    p1.then(function() {
      assert.isTrue(false, 'should not resolve');

      return p2;
    }, function() {
      assert.isTrue(true, 'rejected');

      return p2;
    }).then(function() {
      assert.isTrue(true, 'resolved');
      var layout = manager.loader.getLayout('foo');
      assert.deepEqual(layout, expectedFooLayout, 'foo loaded');
      assert.deepEqual(manager.currentPage, { layoutName: 'foo', pageIndex: 0 },
        'currentPage is correctly set.');
      assert.equal(manager.currentPage.__proto__, layout.pages[0]);
    }, function(e) {
      if (e) {
        throw e;
      }
      assert.isTrue(false, 'should not reject');
    }).then(done, done);
  });

  test('switchCurrentLayout (reload after loaded)', function(done) {
    window.Keyboards = {};

    var manager = new LayoutManager({
      inputContext: {
        inputMode: ''
      },
      getBasicInputType: this.sinon.stub().returns('text'),
      supportsSwitching: this.sinon.stub().returns(false)
    });
    manager.start();
    manager.loader.SOURCE_DIR = './fake-layouts/';

    var p = manager.switchCurrentLayout('foo');
    p.then(function() {
      assert.isTrue(true, 'resolved');
      var layout = manager.loader.getLayout('foo');
      assert.deepEqual(layout, expectedFooLayout, 'foo loaded');
      assert.deepEqual(manager.currentPage, { layoutName: 'foo', pageIndex: 0 },
        'currentPage is correctly set.');
      assert.equal(manager.currentPage.__proto__, layout.pages[0]);

      return manager.switchCurrentLayout('foo');
    }, function() {
      assert.isTrue(false, 'should not reject');
    }).then(function() {
      assert.isTrue(true, 'resolved');
      var layout = manager.loader.getLayout('foo');
      assert.deepEqual(layout, expectedFooLayout, 'foo loaded');
      assert.deepEqual(manager.currentPage, { layoutName: 'foo', pageIndex: 0 },
        'currentPage is correctly set.');
      assert.equal(manager.currentPage.__proto__, layout.pages[0]);
    }, function(e) {
      if (e) {
        throw e;
      }
      assert.isTrue(false, 'should not reject');
    }).then(done, done);
  });

  suite('currentPage', function() {
    var manager;
    var app;
    var spaceLayout;
    var defaultLayout;
    var moreKeysLayout;
    var supportsSwitchingLayout;
    setup(function() {
      spaceLayout = {
        imEngine: 'test-imEngine',
        keys: [
          [
            { value: 'S' }
          ],
          [
            { value: '&nbsp', ratio: 8,
              keyCode: KeyboardEvent.DOM_VK_SPACE },
            { value: 'ENTER', ratio: 2,
              keyCode: KeyboardEvent.DOM_VK_RETURN }
          ]
        ]
      };
      moreKeysLayout = {
        imEngine: 'test-imEngine',
        width: 11,
        keys: [
          [
            { value: 'M' }
          ],
          [
            { value: '&nbsp', ratio: 9,
              keyCode: KeyboardEvent.DOM_VK_SPACE },
            { value: 'ENTER', ratio: 2,
              keyCode: KeyboardEvent.DOM_VK_RETURN }
          ]
        ]
      };
      supportsSwitchingLayout = {
        imEngine: 'test-imEngine',
        width: 10,
        keys: [
          [
            { value: 'S',
              supportsSwitching: {
                value: 'W'
              }
            },
            { value: 'I',
              supportsSwitching: {
                value: 'C'
              }
            }
          ],
          [
            { value: '&nbsp', ratio: 8,
              keyCode: KeyboardEvent.DOM_VK_SPACE },
            { value: 'ENTER', ratio: 2,
              keyCode: KeyboardEvent.DOM_VK_RETURN }
          ]
        ]
      };
      defaultLayout = {
        pages: [ {},
          { // alternateLayout
            keys: [
              [
                { value: 'A' }
              ],
              [
                { value: '&nbsp', ratio: 8,
                  keyCode: KeyboardEvent.DOM_VK_SPACE },
                { value: 'ENTER', ratio: 2,
                  keyCode: KeyboardEvent.DOM_VK_RETURN }
              ]
            ]
          },
          {
            keys: [
              [
                { value: 'S' }
              ],
              [
                { value: '&nbsp', ratio: 8,
                  keyCode: KeyboardEvent.DOM_VK_SPACE },
                { value: 'ENTER', ratio: 2,
                  keyCode: KeyboardEvent.DOM_VK_RETURN }
              ]
            ]
          }
        ]
      };

      window.Keyboards = {
        'spaceLayout': spaceLayout,
        'defaultLayout': defaultLayout,
        'telLayout': { keys: [] },
        'numberLayout': { keys: [] },
        'pinLayout': { keys: [] },
        'spaceLayoutSpecial': { keys: [] },
        'moreKeysLayout': moreKeysLayout,
        'supportsSwitchingLayout': supportsSwitchingLayout
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
        var expectedPage = {
          imEngine: 'test-imEngine',
          layoutName: 'spaceLayout',
          pageIndex: 0,
          keys: [ [ { value: 'S' } ],
            [ { keyCode: KeyboardEvent.DOM_VK_ALT,
              value: '12&',
              ratio: 2.0,
              ariaLabel: 'alternateLayoutKey',
              className: 'page-switch-key',
              targetPage: 1 },
              { value: ',', ratio: 1, keyCode: 44 },
              { ratio: 4.0 },
              { value: '.', ratio: 1, keyCode: 46 },
              { value: 'ENTER', ratio: 2.0,
                keyCode: KeyboardEvent.DOM_VK_RETURN } ] ] };

        assertExpectedLayoutsWithEnter(manager.currentPage,
                                       expectedPage,
                                       1, 4);
        assert.equal(manager.currentPage.__proto__,
          spaceLayout.pages[0], 'proto is set correctly for layout.');

        assert.equal(manager.currentPage.keys[1][2].__proto__,
          spaceLayout.pages[0].keys[1][0],
          'proto is set correctly for space key.');
      }, function(e) {
        if (e) {
          throw e;
        }
        assert.isTrue(false, 'should not reject');
      }).then(done, done);
    });

    test('overwrite alternateLayoutKey', function(done) {
      app.getBasicInputType.returns('text');
      app.supportsSwitching.returns(false);
      spaceLayout.alternateLayoutKey = '90+';

      manager.switchCurrentLayout('spaceLayout').then(function() {
        var expectedPage = {
          imEngine: 'test-imEngine',
          layoutName: 'spaceLayout',
          pageIndex: 0,
          keys: [ [ { value: 'S' } ],
            [ { keyCode: KeyboardEvent.DOM_VK_ALT,
              value: '90+',
              ratio: 2.0,
              ariaLabel: 'alternateLayoutKey',
              className: 'page-switch-key',
              targetPage: 1 },
              { value: ',', ratio: 1, keyCode: 44 },
              { ratio: 4.0 },
              { value: '.', ratio: 1, keyCode: 46 },
              { value: 'ENTER', ratio: 2.0,
                keyCode: KeyboardEvent.DOM_VK_RETURN } ] ] };

        assertExpectedLayoutsWithEnter(manager.currentPage,
                                       expectedPage,
                                       1, 4);
        assert.equal(manager.currentPage.__proto__,
          spaceLayout.pages[0], 'proto is set correctly for layout.');

        assert.equal(manager.currentPage.keys[1][2].__proto__,
          spaceLayout.pages[0].keys[1][0],
          'proto is set correctly for space key.');
      }, function(e) {
        if (e) {
          throw e;
        }
        assert.isTrue(false, 'should not reject');
      }).then(done, done);
    });

    test('telLayout', function(done) {
      app.getBasicInputType.returns('tel');
      app.supportsSwitching.returns(false);

      manager.switchCurrentLayout('spaceLayout').then(function() {
        var expectedPage = {
          layoutName: 'telLayout',
          pageIndex: 0 };

        assert.deepEqual(manager.currentPage, expectedPage);
        assert.equal(manager.currentPage.__proto__,
          manager.loader.getLayout('telLayout').pages[0],
          'proto is set correctly for layout.');
      }, function(e) {
        if (e) {
          throw e;
        }
        assert.isTrue(false, 'should not reject');
      }).then(done, done);
    });

    test('pinLayout (number/digit)', function(done) {
      app.getBasicInputType.returns('number');
      app.inputContext.inputMode = 'digit';
      app.supportsSwitching.returns(false);

      manager.switchCurrentLayout('spaceLayout').then(function() {
        var expectedPage = {
          layoutName: 'pinLayout',
          pageIndex: 0 };

        assert.deepEqual(manager.currentPage, expectedPage);
        assert.equal(manager.currentPage.__proto__,
          manager.loader.getLayout('pinLayout').pages[0],
          'proto is set correctly for layout.');
      }, function(e) {
        if (e) {
          throw e;
        }
        assert.isTrue(false, 'should not reject');
      }).then(done, done);
    });

    test('pinLayout (text/digit)', function(done) {
      app.getBasicInputType.returns('text');
      app.inputContext.inputMode = 'digit';
      app.supportsSwitching.returns(false);

      manager.switchCurrentLayout('spaceLayout').then(function() {
        var expectedPage = {
          layoutName: 'pinLayout',
          pageIndex: 0 };

        assert.deepEqual(manager.currentPage, expectedPage);
        assert.equal(manager.currentPage.__proto__,
          manager.loader.getLayout('pinLayout').pages[0],
          'proto is set correctly for layout.');
      }, function(e) {
        if (e) {
          throw e;
        }
        assert.isTrue(false, 'should not reject');
      }).then(done, done);
    });

    test('numberLayout (number)', function(done) {
      app.getBasicInputType.returns('number');
      app.supportsSwitching.returns(false);

      manager.switchCurrentLayout('spaceLayout').then(function() {
        var expectedPage = {
          layoutName: 'numberLayout',
          pageIndex: 0 };

        assert.deepEqual(manager.currentPage, expectedPage);
        assert.equal(manager.currentPage.__proto__,
          manager.loader.getLayout('numberLayout').pages[0],
          'proto is set correctly for layout.');
      }, function(e) {
        if (e) {
          throw e;
        }
        assert.isTrue(false, 'should not reject');
      }).then(done, done);
    });

    test('numberLayout (text/numeric)', function(done) {
      app.getBasicInputType.returns('text');
      app.inputContext.inputMode = 'numeric';
      app.supportsSwitching.returns(false);

      manager.switchCurrentLayout('spaceLayout').then(function() {
        var expectedPage = {
          layoutName: 'numberLayout',
          pageIndex: 0 };

        assert.deepEqual(manager.currentPage, expectedPage);
        assert.equal(manager.currentPage.__proto__,
          manager.loader.getLayout('numberLayout').pages[0],
          'proto is set correctly for layout.');
      }, function(e) {
        if (e) {
          throw e;
        }
        assert.isTrue(false, 'should not reject');
      }).then(done, done);
    });

    test('special SMS layout if exist (text/-moz-sms)', function(done) {
      app.getBasicInputType.returns('text');
      app.inputContext.inputMode = '-moz-sms';
      app.supportsSwitching.returns(false);

      window.Keyboards['spaceLayout-sms'] = { keys: [] };
      manager.loader.initLayouts();

      manager.switchCurrentLayout('spaceLayout').then(function() {
        var expectedPage = {
          layoutName: 'spaceLayout-sms',
          pageIndex: 0 };

        assert.deepEqual(manager.currentPage, expectedPage);
        assert.equal(manager.currentPage.__proto__,
          manager.loader.getLayout('spaceLayout-sms').pages[0],
          'proto is set correctly for layout.');
      }, function(e) {
        if (e) {
          throw e;
        }
        assert.isTrue(false, 'should not reject');
      }).then(done, done);
    });

    test('no special SMS layout if not exist (text/-moz-sms)', function(done) {
      app.getBasicInputType.returns('text');
      app.inputContext.inputMode = '-moz-sms';
      app.supportsSwitching.returns(false);

      manager.switchCurrentLayout('spaceLayout').then(function() {
        assert.equal(manager.currentPage.__proto__,
          spaceLayout.pages[0], 'proto is set correctly for layout.');

        assert.equal(manager.currentPage.keys[1][2].__proto__,
          spaceLayout.pages[0].keys[1][0],
          'proto is set correctly for space key.');
      }, function(e) {
        if (e) {
          throw e;
        }
        assert.isTrue(false, 'should not reject');
      }).then(done, done);
    });

    function switchToAlternateTest(type) {
      test('Switch to targetPage=1, type=' + type, function(done) {
        app.getBasicInputType.returns(type);
        app.supportsSwitching.returns(false);

        manager.switchCurrentLayout('spaceLayout').then(function() {
          manager.updateLayoutPage(1);

          var expectedPage = {
            imEngine: 'test-imEngine',
            layoutName: 'spaceLayout',
            pageIndex: 1,
            keys: [ [ { value: 'A' } ],
                    [ { keyCode: KeyboardEvent.DOM_VK_ALT,
                        value: 'ABC',
                        ratio: 2.0,
                        ariaLabel: 'basicLayoutKey',
                        className: 'page-switch-key',
                        targetPage: 0 },
                      { value: ',', ratio: 1, keyCode: 44 },
                      { ratio: 4.0 },
                      { value: '.', ratio: 1, keyCode: 46 },
                      { value: 'ENTER', ratio: 2.0,
                        keyCode: KeyboardEvent.DOM_VK_RETURN } ] ] };

          assertExpectedLayoutsWithEnter(manager.currentPage,
                                         expectedPage,
                                         1, 4);
          assert.equal(manager.currentPage.imEngine,
                       spaceLayout.imEngine);
          assert.equal(manager.currentPage.__proto__,
            defaultLayout.pages[1], 'proto is set correctly for layout.');
          assert.equal(manager.currentPage.keys[1][2].__proto__,
            defaultLayout.pages[1].keys[1][0],
            'proto is set correctly for space key.');
        }, function() {
          assert.isTrue(false, 'Should not reject.');
        }).then(done, done);
      });
    }

    // The alternate layout should be the same no mater what input type.
    ['text', 'email', 'url'].forEach(switchToAlternateTest);

    test('targetPage=1 (overwrite basicLayoutKey)', function(done) {
      app.getBasicInputType.returns('text');
      app.supportsSwitching.returns(false);
      spaceLayout.basicLayoutKey = 'XYZ';

      manager.switchCurrentLayout('spaceLayout').then(function() {
        manager.updateLayoutPage(1);

        var expectedPage = {
          layoutName: 'spaceLayout',
          pageIndex: 1,
          imEngine: 'test-imEngine',
          keys: [ [ { value: 'A' } ],
                  [ { keyCode: KeyboardEvent.DOM_VK_ALT,
                      value: 'XYZ',
                      ratio: 2.0,
                      ariaLabel: 'basicLayoutKey',
                      className: 'page-switch-key',
                      targetPage: 0 },
                    { value: ',', ratio: 1, keyCode: 44 },
                    { ratio: 4.0 },
                    { value: '.', ratio: 1, keyCode: 46 },
                    { value: 'ENTER', ratio: 2.0,
                      keyCode: KeyboardEvent.DOM_VK_RETURN } ] ] };

        assertExpectedLayoutsWithEnter(manager.currentPage,
                                       expectedPage,
                                       1, 4);
        assert.equal(manager.currentPage.__proto__,
          defaultLayout.pages[1], 'proto is set correctly for layout.');
        assert.equal(manager.currentPage.keys[1][2].__proto__,
          defaultLayout.pages[1].keys[1][0],
          'proto is set correctly for space key.');
      }, function(e) {
        if (e) {
          throw e;
        }
        assert.isTrue(false, 'should not reject');
      }).then(done, done);
    });

    test('targetPage=1 (overwrite from current layout)', function(done) {
      app.getBasicInputType.returns('text');
      app.supportsSwitching.returns(false);

      spaceLayout.pages[1] = { keys: [] };

      manager.switchCurrentLayout('spaceLayout').then(function() {
        manager.updateLayoutPage(1);

        var expectedPage = {
          layoutName: 'spaceLayout',
          pageIndex: 1,
          imEngine: 'test-imEngine' };

        assert.deepEqual(manager.currentPage, expectedPage);
        assert.equal(manager.currentPage.__proto__,
          spaceLayout.pages[1],
          'proto is set correctly for layout.');
      }, function(e) {
        if (e) {
          throw e;
        }
        assert.isTrue(false, 'should not reject');
      }).then(done, done);
    });

    test('targetPage=2', function(done) {
      app.getBasicInputType.returns('text');
      app.supportsSwitching.returns(false);

      manager.switchCurrentLayout('spaceLayout').then(function() {
        manager.updateLayoutPage(2);

        var expectedPage = {
          layoutName: 'spaceLayout',
          pageIndex: 2,
          imEngine: 'test-imEngine',
          keys: [ [ { value: 'S' } ],
                  [ { keyCode: KeyboardEvent.DOM_VK_ALT,
                      value: 'ABC',
                      ratio: 2.0,
                      ariaLabel: 'basicLayoutKey',
                      className: 'page-switch-key',
                      targetPage: 0 },
                    { value: ',', ratio: 1, keyCode: 44 },
                    { ratio: 4.0 },
                    { value: '.', ratio: 1, keyCode: 46 },
                    { value: 'ENTER', ratio: 2.0,
                      keyCode: KeyboardEvent.DOM_VK_RETURN } ] ] };

        assertExpectedLayoutsWithEnter(manager.currentPage,
                                       expectedPage,
                                       1, 4);
        assert.equal(manager.currentPage.__proto__,
          defaultLayout.pages[2], 'proto is set correctly for layout.');
        assert.equal(manager.currentPage.keys[1][2].__proto__,
          defaultLayout.pages[2].keys[1][0],
          'proto is set correctly for space key.');
      }, function(e) {
        if (e) {
          throw e;
        }
        assert.isTrue(false, 'should not reject');
      }).then(done, done);
    });

    test('disableAlternateLayout', function(done) {
      app.getBasicInputType.returns('text');
      app.supportsSwitching.returns(false);
      spaceLayout.disableAlternateLayout = true;

      manager.switchCurrentLayout('spaceLayout').then(function() {
        var expectedPage = {
          imEngine: 'test-imEngine',
          layoutName: 'spaceLayout',
          pageIndex: 0,
          keys: [ [ { value: 'S' } ],
                  [ { value: ',', ratio: 1, keyCode: 44 },
                    { ratio: 6 },
                    { value: '.', ratio: 1, keyCode: 46 },
                    { value: 'ENTER', ratio: 2.0,
                      keyCode: KeyboardEvent.DOM_VK_RETURN } ] ] };

        assertExpectedLayoutsWithEnter(manager.currentPage,
                                       expectedPage,
                                       1, 3);
        assert.equal(manager.currentPage.__proto__,
          spaceLayout.pages[0], 'proto is set correctly for layout.');
        assert.equal(manager.currentPage.keys[1][1].__proto__,
          spaceLayout.pages[0].keys[1][0],
          'proto is set correctly for space key.');
      }, function(e) {
        if (e) {
          throw e;
        }
        assert.isTrue(false, 'should not reject');
      }).then(done, done);
    });

    test('supportsSwitching', function(done) {
      app.getBasicInputType.returns('text');
      app.supportsSwitching.returns(true);

      manager.switchCurrentLayout('spaceLayout').then(function() {
        var expectedPage = {
          imEngine: 'test-imEngine',
          layoutName: 'spaceLayout',
          pageIndex: 0,
          keys: [ [ { value: 'S' } ],
                  [ { keyCode: KeyboardEvent.DOM_VK_ALT,
                      value: '12&',
                      ratio: 2.0,
                      ariaLabel: 'alternateLayoutKey',
                      className: 'page-switch-key',
                      targetPage: 1 },
                    { value: '&#x1f310;',
                      ratio: 1,
                      keyCode: -3,
                      className: 'switch-key' },
                    { ratio: 4.0 },
                    { value: '.', ratio: 1, keyCode: 46 },
                    { value: 'ENTER', ratio: 2.0,
                      keyCode: KeyboardEvent.DOM_VK_RETURN } ] ] };

        assertExpectedLayoutsWithEnter(manager.currentPage,
                                       expectedPage,
                                       1, 4);
        assert.equal(manager.currentPage.__proto__,
          spaceLayout.pages[0], 'proto is set correctly for layout.');

        assert.equal(manager.currentPage.keys[1][2].__proto__,
          spaceLayout.pages[0].keys[1][0],
          'proto is set correctly for space key.');
      }, function(e) {
        if (e) {
          throw e;
        }
        assert.isTrue(false, 'should not reject');
      }).then(done, done);
    });

    test('supportsSwitching (with shortLabel)', function(done) {
      app.getBasicInputType.returns('text');
      app.supportsSwitching.returns(true);
      spaceLayout.shortLabel = 'Sp';

      manager.switchCurrentLayout('spaceLayout').then(function() {
        var expectedPage = {
          imEngine: 'test-imEngine',
          layoutName: 'spaceLayout',
          pageIndex: 0,
          keys: [ [ { value: 'S' } ],
                  [ { keyCode: KeyboardEvent.DOM_VK_ALT,
                      value: '12&',
                      ratio: 2.0,
                      ariaLabel: 'alternateLayoutKey',
                      className: 'page-switch-key',
                      targetPage: 1 },
                    { value: 'Sp',
                      ratio: 1,
                      keyCode: -3,
                      className: 'switch-key alternate-indicator' },
                    { ratio: 4.0 },
                    { value: '.', ratio: 1, keyCode: 46 },
                    { value: 'ENTER', ratio: 2.0,
                      keyCode: KeyboardEvent.DOM_VK_RETURN } ] ] };

        assertExpectedLayoutsWithEnter(manager.currentPage,
                                       expectedPage,
                                       1, 4);
        assert.equal(manager.currentPage.__proto__,
          spaceLayout.pages[0], 'proto is set correctly for layout.');

        assert.equal(manager.currentPage.keys[1][2].__proto__,
          spaceLayout.pages[0].keys[1][0],
          'proto is set correctly for space key.');
      }, function(e) {
        if (e) {
          throw e;
        }
        assert.isTrue(false, 'should not reject');
      }).then(done, done);
    });

    test('hidesSwitchKey', function(done) {
      app.getBasicInputType.returns('text');
      app.supportsSwitching.returns(true);
      spaceLayout.hidesSwitchKey = true;

      manager.switchCurrentLayout('spaceLayout').then(function() {
        var expectedPage = {
          imEngine: 'test-imEngine',
          layoutName: 'spaceLayout',
          pageIndex: 0,
          keys: [ [ { value: 'S' } ],
                  [ { keyCode: KeyboardEvent.DOM_VK_ALT,
                      value: '12&',
                      ratio: 2.0,
                      ariaLabel: 'alternateLayoutKey',
                      className: 'page-switch-key',
                      targetPage: 1 },
                    { value: ',', ratio: 1, keyCode: 44 },
                    { ratio: 4.0 },
                    { value: '.', ratio: 1, keyCode: 46 },
                    { value: 'ENTER', ratio: 2.0,
                      keyCode: KeyboardEvent.DOM_VK_RETURN } ] ] };

        assertExpectedLayoutsWithEnter(manager.currentPage,
                                       expectedPage,
                                       1, 4);
        assert.equal(manager.currentPage.__proto__,
          spaceLayout.pages[0], 'proto is set correctly for layout.');

        assert.equal(manager.currentPage.keys[1][2].__proto__,
          spaceLayout.pages[0].keys[1][0],
          'proto is set correctly for space key.');
      }, function(e) {
        if (e) {
          throw e;
        }
        assert.isTrue(false, 'should not reject');
      }).then(done, done);
    });

    test('type=url, without IME switching', function(done) {
      app.getBasicInputType.returns('url');
      app.supportsSwitching.returns(false);

      manager.switchCurrentLayout('spaceLayout').then(function () {
        var expectedPage = {
          imEngine: 'test-imEngine',
          layoutName: 'spaceLayout',
          pageIndex: 0,
          keys: [ [ { value: 'S' } ],
                  [ { keyCode: KeyboardEvent.DOM_VK_ALT,
                      value: '12&',
                      ratio: 2.0,
                      ariaLabel: 'alternateLayoutKey',
                      className: 'page-switch-key',
                      targetPage: 1 },
                    { value: '/', ratio: 1, keyCode: 47 },
                    { ratio: 4.0 },
                    { value: '.', ratio: 1, keyCode: 46 },
                    { value: 'ENTER', ratio: 2.0,
                      keyCode: KeyboardEvent.DOM_VK_RETURN } ] ] };

        assertExpectedLayoutsWithEnter(manager.currentPage,
                                       expectedPage,
                                       1, 4);
        assert.equal(manager.currentPage.__proto__,
          spaceLayout.pages[0], 'proto is set correctly for layout.');

        assert.equal(manager.currentPage.keys[1][2].__proto__,
          spaceLayout.pages[0].keys[1][0],
          'proto is set correctly for space key.');
      }, function(e) {
        if (e) {
          throw e;
        }
        assert.isTrue(false, 'should not reject');
      }).then(done, done);
    });

    test('type=url, with IME switching', function(done) {
      app.getBasicInputType.returns('url');
      app.supportsSwitching.returns(true);

      manager.switchCurrentLayout('spaceLayout').then(function() {
        var expectedPage = {
          imEngine: 'test-imEngine',
          layoutName: 'spaceLayout',
          pageIndex: 0,
          keys: [ [ { value: 'S' } ],
                  [ { keyCode: KeyboardEvent.DOM_VK_ALT,
                      value: '12&',
                      ratio: 1.5,
                      ariaLabel: 'alternateLayoutKey',
                      className: 'page-switch-key',
              targetPage: 1 },
                    { value: '&#x1f310;',
                      ratio: 1,
                      keyCode: -3,
                      className: 'switch-key' },
                    { value: '/', ratio: 1, keyCode: 47 },
                    { ratio: 3.0 },
                    { value: '.', ratio: 1, keyCode: 46 },
                    // The [ENTER] key would be cloned and with modified ratio
                    { ratio: 2.5 } ] ] };

        assert.deepEqual(manager.currentPage, expectedPage);
        assert.equal(manager.currentPage.__proto__,
          spaceLayout.pages[0], 'proto is set correctly for layout.');

        assert.equal(manager.currentPage.keys[1][3].__proto__,
          spaceLayout.pages[0].keys[1][0],
          'proto is set correctly for space key.');
      }, function(e) {
        if (e) {
          throw e;
        }
        assert.isTrue(false, 'should not reject');
      }).then(done, done);
    });

    test('type=email, without IME switching', function(done) {
      app.getBasicInputType.returns('email');
      app.supportsSwitching.returns(false);

      manager.switchCurrentLayout('spaceLayout').then(function() {
        var expectedPage = {
          imEngine: 'test-imEngine',
          layoutName: 'spaceLayout',
          pageIndex: 0,
          keys: [ [ { value: 'S' } ],
                  [ { keyCode: KeyboardEvent.DOM_VK_ALT,
                      value: '12&',
                      ratio: 2.0,
                      ariaLabel: 'alternateLayoutKey',
                      className: 'page-switch-key',
              targetPage: 1 },
                    { value: '@', ratio: 1, keyCode: 64 },
                    { ratio: 4.0 },
                    { value: '.', ratio: 1, keyCode: 46 },
                    { value: 'ENTER', ratio: 2.0,
                      keyCode: KeyboardEvent.DOM_VK_RETURN } ] ] };

        assertExpectedLayoutsWithEnter(manager.currentPage,
                                       expectedPage,
                                       1, 4);
        assert.equal(manager.currentPage.__proto__,
          spaceLayout.pages[0], 'proto is set correctly for layout.');

        assert.equal(manager.currentPage.keys[1][2].__proto__,
          spaceLayout.pages[0].keys[1][0],
          'proto is set correctly for space key.');
      }, function(e) {
        if (e) {
          throw e;
        }
        assert.isTrue(false, 'should not reject');
      }).then(done, done);
    });

    test('type=email, with IME switching', function(done) {
      app.getBasicInputType.returns('email');
      app.supportsSwitching.returns(true);

      manager.switchCurrentLayout('spaceLayout').then(function() {
        var expectedPage = {
          imEngine: 'test-imEngine',
          layoutName: 'spaceLayout',
          pageIndex: 0,
          keys: [ [ { value: 'S' } ],
                  [ { keyCode: KeyboardEvent.DOM_VK_ALT,
                      value: '12&',
                      ratio: 1.5,
                      ariaLabel: 'alternateLayoutKey',
                      className: 'page-switch-key',
              targetPage: 1 },
                    { value: '&#x1f310;',
                      ratio: 1,
                      keyCode: -3,
                      className: 'switch-key' },
                    { value: '@', ratio: 1, keyCode: 64 },
                    { ratio: 3.0 },
                    { value: '.', ratio: 1, keyCode: 46 },
                    // The [ENTER] key would be cloned and with modified ratio
                    { ratio: 2.5 } ] ] };
        assert.deepEqual(manager.currentPage, expectedPage);
        assert.equal(manager.currentPage.__proto__,
          spaceLayout.pages[0], 'proto is set correctly for layout.');

        assert.equal(manager.currentPage.keys[1][3].__proto__,
          spaceLayout.pages[0].keys[1][0],
          'proto is set correctly for space key.');
      }, function(e) {
        if (e) {
          throw e;
        }
        assert.isTrue(false, 'should not reject');
      }).then(done, done);
    });

    test('type=email, with disableAlternateLayout', function(done) {
      app.getBasicInputType.returns('email');
      app.supportsSwitching.returns(false);
      spaceLayout.disableAlternateLayout = true;

      manager.switchCurrentLayout('spaceLayout').then(function() {
        var expectedPage = {
          imEngine: 'test-imEngine',
          layoutName: 'spaceLayout',
          pageIndex: 0,
          keys: [ [ { value: 'S' } ],
                  [ { value: '@', ratio: 1, keyCode: 64 },
                    { ratio: 6 },
                    { value: '.', ratio: 1, keyCode: 46 },
                    { value: 'ENTER', ratio: 2.0,
                      keyCode: KeyboardEvent.DOM_VK_RETURN } ] ] };

        assertExpectedLayoutsWithEnter(manager.currentPage,
                                       expectedPage,
                                       1, 3);
        assert.equal(manager.currentPage.__proto__,
          spaceLayout.pages[0], 'proto is set correctly for layout.');
        assert.equal(manager.currentPage.keys[1][1].__proto__,
          spaceLayout.pages[0].keys[1][0],
          'proto is set correctly for space key.');
      }, function(e) {
        if (e) {
          throw e;
        }
        assert.isTrue(false, 'should not reject');
      }).then(done, done);
    });

    test('type=search, with IME switching', function (done) {
      app.getBasicInputType.returns('search');
      app.supportsSwitching.returns(true);

      manager.switchCurrentLayout('spaceLayout').then(function() {
        var expectedPage = {
          imEngine: 'test-imEngine',
          layoutName: 'spaceLayout',
          pageIndex: 0,
          keys: [ [ { value: 'S' } ],
                  [ { keyCode: KeyboardEvent.DOM_VK_ALT,
                      value: '12&',
                      ratio: 2,
                      ariaLabel: 'alternateLayoutKey',
                      className: 'page-switch-key',
              targetPage: 1 },
                    { value: '&#x1f310;',
                      ratio: 1,
                      keyCode: -3,
                      className: 'switch-key' },
                    { ratio: 4.0 },
                    { value: '.', ratio: 1, keyCode: 46 },
                    // The [ENTER] key would be cloned
                    // and with modified className
                    { className: 'search-icon'} ] ] };

        assert.deepEqual(manager.currentPage.keys,
                         expectedPage.keys);
        assert.deepEqual(manager.currentPage, expectedPage);
        assert.equal(manager.currentPage.__proto__,
          spaceLayout.pages[0], 'proto is set correctly for layout.');

        assert.equal(manager.currentPage.keys[1][2].__proto__,
          spaceLayout.pages[0].keys[1][0],
          'proto is set correctly for space key.');
      }, function(e) {
        if (e) {
          throw e;
        }
        assert.isTrue(false, 'should not reject');
      }).then(done, done);
    });

    test('type=search, without IME switching', function (done) {
      app.getBasicInputType.returns('search');
      app.supportsSwitching.returns(false);

      manager.switchCurrentLayout('spaceLayout').then(function() {
        var expectedPage = {
          imEngine: 'test-imEngine',
          layoutName: 'spaceLayout',
          pageIndex: 0,
          keys: [ [ { value: 'S' } ],
                  [ { keyCode: KeyboardEvent.DOM_VK_ALT,
                      value: '12&',
                      ratio: 2.0,
                      ariaLabel: 'alternateLayoutKey',
                      className: 'page-switch-key',
              targetPage: 1 },
                    { value: ',', ratio: 1, keyCode: 44 },
                    { ratio: 4.0 },
                    { value: '.', ratio: 1, keyCode: 46 },
                    // The [ENTER] key would be cloned
                    // and with modified className
                    { className: 'search-icon'} ] ] };

        assert.deepEqual(manager.currentPage, expectedPage);
        assert.equal(manager.currentPage.__proto__,
          spaceLayout.pages[0], 'proto is set correctly for layout.');

        assert.equal(manager.currentPage.keys[1][2].__proto__,
          spaceLayout.pages[0].keys[1][0],
          'proto is set correctly for space key.');
      }, function(e) {
        if (e) {
          throw e;
        }
        assert.isTrue(false, 'should not reject');
      }).then(done, done);
    });

    test('type=text (suppress comma)', function(done) {
      app.getBasicInputType.returns('text');
      app.supportsSwitching.returns(false);
      spaceLayout.pages[0].textLayoutOverwrite = {
        ',': false
      };

      manager.switchCurrentLayout('spaceLayout').then(function() {
        var expectedPage = {
          imEngine: 'test-imEngine',
          layoutName: 'spaceLayout',
          pageIndex: 0,
          keys: [ [ { value: 'S' } ],
                  [ { keyCode: KeyboardEvent.DOM_VK_ALT,
                      value: '12&',
                      ratio: 2.0,
                      ariaLabel: 'alternateLayoutKey',
                      className: 'page-switch-key',
              targetPage: 1 },
                    { ratio: 5.0 },
                    { value: '.', ratio: 1, keyCode: 46 },
                    { value: 'ENTER', ratio: 2.0,
                      keyCode: KeyboardEvent.DOM_VK_RETURN } ] ] };

        assertExpectedLayoutsWithEnter(manager.currentPage,
                                       expectedPage,
                                       1, 3);
        assert.equal(manager.currentPage.__proto__,
          spaceLayout.pages[0], 'proto is set correctly for layout.');
        assert.equal(manager.currentPage.keys[1][1].__proto__,
          spaceLayout.pages[0].keys[1][0],
          'proto is set correctly for space key.');
      }, function(e) {
        if (e) {
          throw e;
        }
        assert.isTrue(false, 'should not reject');
      }).then(done, done);
    });

    test('type=text (overwrite comma values)', function(done) {
      app.getBasicInputType.returns('text');
      app.supportsSwitching.returns(false);
      spaceLayout.pages[0].textLayoutOverwrite = {
        ',': '!'
      };

      manager.switchCurrentLayout('spaceLayout').then(function() {
        var expectedPage = {
          imEngine: 'test-imEngine',
          layoutName: 'spaceLayout',
          pageIndex: 0,
          keys: [ [ { value: 'S' } ],
                  [ { keyCode: KeyboardEvent.DOM_VK_ALT,
                      value: '12&',
                      ratio: 2.0,
                      ariaLabel: 'alternateLayoutKey',
                      className: 'page-switch-key',
              targetPage: 1 },
                    { value: '!', ratio: 1, keyCode: 33 },
                    { ratio: 4.0 },
                    { value: '.', ratio: 1, keyCode: 46 },
                    { value: 'ENTER', ratio: 2.0,
                      keyCode: KeyboardEvent.DOM_VK_RETURN } ] ] };

        assertExpectedLayoutsWithEnter(manager.currentPage,
                                       expectedPage,
                                       1, 4);
        assert.equal(manager.currentPage.__proto__,
          spaceLayout.pages[0], 'proto is set correctly for layout.');

        assert.equal(manager.currentPage.keys[1][2].__proto__,
          spaceLayout.pages[0].keys[1][0],
          'proto is set correctly for space key.');
      }, function(e) {
        if (e) {
          throw e;
        }
        assert.isTrue(false, 'should not reject');
      }).then(done, done);
    });

    test('type=text (suppress period)', function(done) {
      app.getBasicInputType.returns('text');
      app.supportsSwitching.returns(false);
      spaceLayout.pages[0].textLayoutOverwrite = {
        '.': false
      };

      manager.switchCurrentLayout('spaceLayout').then(function() {
        var expectedPage = {
          imEngine: 'test-imEngine',
          layoutName: 'spaceLayout',
          pageIndex: 0,
          keys: [ [ { value: 'S' } ],
                  [ { keyCode: KeyboardEvent.DOM_VK_ALT,
                      value: '12&',
                      ratio: 2.0,
                      ariaLabel: 'alternateLayoutKey',
                      className: 'page-switch-key',
              targetPage: 1 },
                    { value: ',', ratio: 1, keyCode: 44 },
                    { ratio: 5.0 },
                    { value: 'ENTER', ratio: 2.0,
                      keyCode: KeyboardEvent.DOM_VK_RETURN } ] ] };

        assertExpectedLayoutsWithEnter(manager.currentPage,
                                       expectedPage,
                                       1, 3);
        assert.equal(manager.currentPage.__proto__,
          spaceLayout.pages[0], 'proto is set correctly for layout.');

        assert.equal(manager.currentPage.keys[1][2].__proto__,
          spaceLayout.pages[0].keys[1][0],
          'proto is set correctly for space key.');
      }, function(e) {
        if (e) {
          throw e;
        }
        assert.isTrue(false, 'should not reject');
      }).then(done, done);
    });

    test('type=text (period with alternate-indicator)', function(done) {
      app.getBasicInputType.returns('text');
      app.supportsSwitching.returns(false);
      spaceLayout.pages[0].alt = {
        '.': '. * +'
      };

      manager.switchCurrentLayout('spaceLayout').then(function() {
        var expectedPage = {
          imEngine: 'test-imEngine',
          layoutName: 'spaceLayout',
          pageIndex: 0,
          keys: [ [ { value: 'S' } ],
                  [ { keyCode: KeyboardEvent.DOM_VK_ALT,
                      value: '12&',
                      ratio: 2.0,
                      ariaLabel: 'alternateLayoutKey',
                      className: 'page-switch-key',
              targetPage: 1 },
                    { value: ',', ratio: 1, keyCode: 44 },
                    { ratio: 4.0 },
                    { value: '.',
                      ratio: 1,
                      keyCode: 46,
                      className: 'alternate-indicator' },
                    { value: 'ENTER', ratio: 2.0,
                      keyCode: KeyboardEvent.DOM_VK_RETURN } ] ] };

        assertExpectedLayoutsWithEnter(manager.currentPage,
                                       expectedPage,
                                       1, 4);
        assert.equal(manager.currentPage.__proto__,
          spaceLayout.pages[0], 'proto is set correctly for layout.');

        assert.equal(manager.currentPage.keys[1][2].__proto__,
          spaceLayout.pages[0].keys[1][0],
          'proto is set correctly for space key.');
      }, function(e) {
        if (e) {
          throw e;
        }
        assert.isTrue(false, 'should not reject');
      }).then(done, done);
    });

    test('type=text (overwrite period values)', function(done) {
      app.getBasicInputType.returns('text');
      app.supportsSwitching.returns(false);
      spaceLayout.pages[0].textLayoutOverwrite = {
        '.': '*'
      };

      manager.switchCurrentLayout('spaceLayout').then(function() {
        var expectedPage = {
          imEngine: 'test-imEngine',
          layoutName: 'spaceLayout',
          pageIndex: 0,
          keys: [ [ { value: 'S' } ],
                  [ { keyCode: KeyboardEvent.DOM_VK_ALT,
                      value: '12&',
                      ratio: 2.0,
                      ariaLabel: 'alternateLayoutKey',
                      className: 'page-switch-key',
              targetPage: 1 },
                    { value: ',', ratio: 1, keyCode: 44 },
                    { ratio: 4.0 },
                    { value: '*', ratio: 1, keyCode: 42 },
                    { value: 'ENTER', ratio: 2.0,
                      keyCode: KeyboardEvent.DOM_VK_RETURN } ] ] };

        assertExpectedLayoutsWithEnter(manager.currentPage,
                                       expectedPage,
                                       1, 4);
        assert.equal(manager.currentPage.__proto__,
          spaceLayout.pages[0], 'proto is set correctly for layout.');

        assert.equal(manager.currentPage.keys[1][2].__proto__,
          spaceLayout.pages[0].keys[1][0],
          'proto is set correctly for space key.');
      }, function(e) {
        if (e) {
          throw e;
        }
        assert.isTrue(false, 'should not reject');
      }).then(done, done);
    });

    test('needsCommaKey', function(done) {
      app.getBasicInputType.returns('text');
      app.supportsSwitching.returns(true);
      spaceLayout.pages[0].needsCommaKey = true;

      manager.switchCurrentLayout('spaceLayout').then(function() {
        var expectedPage = {
          imEngine: 'test-imEngine',
          layoutName: 'spaceLayout',
          pageIndex: 0,
          keys: [ [ { value: 'S' } ],
                  [ { keyCode: KeyboardEvent.DOM_VK_ALT,
                      value: '12&',
                      ratio: 1.5,
                      ariaLabel: 'alternateLayoutKey',
                      className: 'page-switch-key',
                      targetPage: 1 },
                    { value: '&#x1f310;',
                      ratio: 1,
                      keyCode: -3,
                      className: 'switch-key' },
                    { value: ',', ratio: 1, keyCode: 44 },
                    { ratio: 3.0 },
                    { value: '.', ratio: 1, keyCode: 46 },
                    { ratio: 2.5 } ] ] };

        assert.deepEqual(manager.currentPage, expectedPage);
        assert.equal(manager.currentPage.__proto__,
          spaceLayout.pages[0], 'proto is set correctly for layout.');

        assert.equal(manager.currentPage.keys[1][3].__proto__,
          spaceLayout.pages[0].keys[1][0],
          'proto is set correctly for space key.');
      }, function(e) {
        if (e) {
          throw e;
        }
        assert.isTrue(false, 'should not reject');
      }).then(done, done);
    });

    test('load a layout with more than 10 keys', function(done) {
      app.getBasicInputType.returns('text');
      app.supportsSwitching.returns(true);

      manager.switchCurrentLayout('moreKeysLayout').then(function() {
        var expectedPage = {
          imEngine: 'test-imEngine',
          layoutName: 'moreKeysLayout',
          pageIndex: 0,
          keys: [ [ { value: 'M' } ],
                  [ { keyCode: KeyboardEvent.DOM_VK_ALT,
                      value: '12&',
                      ratio: 2.0,
                      ariaLabel: 'alternateLayoutKey',
                      className: 'page-switch-key',
              targetPage: 1 },
                    { value: '&#x1f310;',
                      ratio: 1,
                      keyCode: -3,
                      className: 'switch-key' },
                    { ratio: 5.0 },
                    { value: '.', ratio: 1, keyCode: 46 },
                    { value: 'ENTER', ratio: 2.0,
                      keyCode: KeyboardEvent.DOM_VK_RETURN } ] ] };

        assertExpectedLayoutsWithEnter(manager.currentPage,
                                       expectedPage,
                                       1, 4);
        assert.equal(manager.currentPage.__proto__,
          moreKeysLayout.pages[0], 'proto is set correctly for layout.');
        assert.equal(manager.currentPage.keys[1][2].__proto__,
          moreKeysLayout.pages[0].keys[1][0],
          'proto is set correctly for space key.');
      }, function(e) {
        if (e) {
          throw e;
        }
        assert.isTrue(false, 'should not reject');
      }).then(done, done);
    });

    test('load a layout with supportsSwitching keys defined', function(done) {
      app.getBasicInputType.returns('text');
      app.supportsSwitching.returns(true);

      manager.switchCurrentLayout('supportsSwitchingLayout').then(function() {
        var expectedPage = {
          imEngine: 'test-imEngine',
          layoutName: 'supportsSwitchingLayout',
          pageIndex: 0,
          keys: [ [ { }, { } ],
                  [ { keyCode: KeyboardEvent.DOM_VK_ALT,
                      value: '12&',
                      ratio: 2.0,
                      ariaLabel: 'alternateLayoutKey',
                      className: 'page-switch-key',
              targetPage: 1 },
                    { value: '&#x1f310;',
                      ratio: 1,
                      keyCode: -3,
                      className: 'switch-key' },
                    { ratio: 4.0 },
                    { value: '.', ratio: 1, keyCode: 46 },
                    { value: 'ENTER', ratio: 2.0,
                      keyCode: KeyboardEvent.DOM_VK_RETURN } ] ] };

        assertExpectedLayoutsWithEnter(manager.currentPage,
                                       expectedPage,
                                       1, 4);
        assert.equal(manager.currentPage.__proto__,
          supportsSwitchingLayout.pages[0],
          'proto is set correctly for layout.');

        assert.equal(manager.currentPage.keys[0][0].__proto__,
          supportsSwitchingLayout.pages[0].keys[0][0].supportsSwitching,
          'proto is set correctly for supportsSwitching key.');

        assert.equal(manager.currentPage.keys[0][1].__proto__,
          supportsSwitchingLayout.pages[0].keys[0][1].supportsSwitching,
          'proto is set correctly for supportsSwitching key.');

        assert.equal(manager.currentPage.keys[1][2].__proto__,
          supportsSwitchingLayout.pages[0].keys[1][0],
          'proto is set correctly for space key.');
      }, function(e) {
        if (e) {
          throw e;
        }
        assert.isTrue(false, 'should not reject');
      }).then(done, done);
    });
  });
});
