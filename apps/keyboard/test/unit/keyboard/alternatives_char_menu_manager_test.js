'use strict';

/* global AlternativesCharMenuManager */

require('/js/keyboard/alternatives_char_menu_manager.js');

suite('AlternativesCharMenuManager', function() {
  var app;
  var container;
  var manager;
  var target;

  var getFakeElementWithGetBoundingClientRect;

  setup(function() {
    getFakeElementWithGetBoundingClientRect = function() {
      return {
        getBoundingClientRect: this.sinon.stub(),
        dataset: {
          lowercaseValue: 'x',
          uppercaseValue: 'X'
        }
      };
    }.bind(this);

    // Create fake IMERender
    window.IMERender = {
      showAlternativesCharMenu: function(target, alternatives) {
        // Use an Array to simulate a NodeList
        container.children = alternatives.map(function(key) {
          return {};
        });
      },
      hideAlternativesCharMenu: this.sinon.stub()
    };
    this.sinon.spy(window.IMERender, 'showAlternativesCharMenu');

    // Create fake menu container element
    container = getFakeElementWithGetBoundingClientRect();
    container.getBoundingClientRect.returns({
      top: 35,
      bottom: 45,
      left: 5,
      right: 95
    });

    // Create fake app
    app = {
      getMenuContainer: function() {
        return container;
      },
      upperCaseStateManager: {
        isUpperCaseLocked: undefined,
        isUpperCase: undefined
      },
      layoutManager: {
        currentModifiedLayout: {
          alt: {
          }
        }
      }
    };

    // Create fake target
    target = getFakeElementWithGetBoundingClientRect();
    target.getBoundingClientRect.returns({
      top: 50,
      bottom: 60,
      left: 10,
      right: 40
    });

    // Show an alternatives chars menu
    manager = new AlternativesCharMenuManager(app);
    manager.start();

    assert.equal(manager.isShown, false);
  });

  teardown(function() {
    window.IMERender = null;
    app = null;
    container = null;
  });

  test('show (lower case)', function() {
    app.upperCaseStateManager.isUpperCase = false;
    app.upperCaseStateManager.isUpperCaseLocked = false;

    app.layoutManager.currentModifiedLayout.alt.x =
      ['a', 'b', 'c', 'd'];

    manager.show(target);

    assert.isTrue(window.IMERender.
      showAlternativesCharMenu.calledWith(target, ['a', 'b', 'c', 'd']));
    assert.isTrue(app.layoutManager.currentModifiedLayout.alt.x !==
      window.IMERender.showAlternativesCharMenu.getCall(0).args[1],
      'A copy of the array should be sent instead of the original one.');
    assert.isTrue(manager.isShown);
  });

  test('show (upper case)', function() {
    app.upperCaseStateManager.isUpperCase = true;
    app.upperCaseStateManager.isUpperCaseLocked = false;

    app.layoutManager.currentModifiedLayout.alt.X =
      ['A', 'B', 'C', 'D'];
    app.layoutManager.currentModifiedLayout.alt.X.upperCaseLocked =
      ['E', 'F', 'G', 'H'];

    manager.show(target);

    assert.isTrue(window.IMERender.
        showAlternativesCharMenu.calledWith(target, ['A', 'B', 'C', 'D']));
    assert.isTrue(app.layoutManager.currentModifiedLayout.alt.x !==
      window.IMERender.showAlternativesCharMenu.getCall(0).args[1],
      'A copy of the array should be sent instead of the original one.');
    assert.isTrue(manager.isShown);
  });

  test('show (upper case locked)', function() {
    app.upperCaseStateManager.isUpperCase = true;
    app.upperCaseStateManager.isUpperCaseLocked = true;

    app.layoutManager.currentModifiedLayout.alt.X =
      ['A', 'B', 'C', 'D'];
    app.layoutManager.currentModifiedLayout.alt.X.upperCaseLocked =
      ['E', 'F', 'G', 'H'];

    manager.show(target);

    assert.isTrue(window.IMERender.
        showAlternativesCharMenu.calledWith(target, ['E', 'F', 'G', 'H']));
    assert.isTrue(app.layoutManager.currentModifiedLayout.alt.x !==
      window.IMERender.showAlternativesCharMenu.getCall(0).args[1],
      'A copy of the array should be sent instead of the original one.');
    assert.isTrue(manager.isShown);
  });

  test('show (ignore key w/o alternatives)', function() {
    app.upperCaseStateManager.isUpperCase = false;
    app.upperCaseStateManager.isUpperCaseLocked = false;

    manager.show(target);

    assert.isFalse(window.IMERender.showAlternativesCharMenu.called);
    assert.isFalse(manager.isShown);
  });

  suite('after shown', function() {
    setup(function() {
      app.upperCaseStateManager.isUpperCase = false;
      app.upperCaseStateManager.isUpperCaseLocked = false;

      app.layoutManager.currentModifiedLayout.alt.x =
        ['a', 'b', 'c', 'd'];

      manager.show(target);
    });

    test('hide', function() {
      manager.hide();

      assert.equal(manager.isShown, false);
      assert.isTrue(window.IMERender.hideAlternativesCharMenu.calledOnce);
    });

    suite('isMenuTarget', function() {
      test('true', function() {
        var target = {
          parentNode: container
        };

        assert.isTrue(manager.isMenuTarget(target));
      });

      test('false', function() {
        var target = {
          parentNode: {}
        };

        assert.isFalse(manager.isMenuTarget(target));
      });
    });

    suite('isInMenuArea', function() {
      test('above menu', function() {
        var press = {
          pageX: 45,
          pageY: 35
        };

        assert.equal(manager.isInMenuArea(press), false);
      });

      test('below key', function() {
        var press = {
          pageX: 45,
          pageY: 70
        };

        assert.equal(manager.isInMenuArea(press), false);
      });

      test('left of menu', function() {
        var press = {
          pageX: 2,
          pageY: 55
        };

        assert.equal(manager.isInMenuArea(press), false);
      });

      test('right of menu', function() {
        var press = {
          pageX: 105,
          pageY: 55
        };

        assert.equal(manager.isInMenuArea(press), false);
      });

      test('on top of the menu', function() {
        var press = {
          pageX: 45,
          pageY: 40
        };

        assert.equal(manager.isInMenuArea(press), false);
      });

      test('on top of the key', function() {
        var press = {
          pageX: 15,
          pageY: 55
        };

        assert.equal(manager.isInMenuArea(press), true);
      });

      test('below menu and beside key', function() {
        var press = {
          pageX: 65,
          pageY: 55
        };

        assert.equal(manager.isInMenuArea(press), true);
      });

      test('below menu and above key', function() {
        var press = {
          pageX: 65,
          pageY: 47
        };

        assert.equal(manager.isInMenuArea(press), true);
      });
    });

    suite('getMenuTarget', function() {
      test('on top of the key', function() {
        var press = {
          target: target,
          pageX: 15,
          pageY: 55
        };

        assert.equal(manager.getMenuTarget(press),
          container.children[0]);
      });

      test('under 2nd key', function() {
        var press = {
          target: {},
          pageX: 35,
          pageY: 55
        };

        assert.equal(manager.getMenuTarget(press),
          container.children[1]);
      });

      test('under 2nd key but haven\'t moved away from target', function() {
        var press = {
          target: target,
          pageX: 35,
          pageY: 55
        };

        assert.equal(manager.getMenuTarget(press),
          container.children[0]);
      });

      test('under 2nd key, had moved away from target', function() {
        var press = {
          target: {},
          pageX: 45,
          pageY: 55
        };

        assert.equal(manager.getMenuTarget(press),
          container.children[1]);

        var press2 = {
          target: target,
          pageX: 35,
          pageY: 55
        };

        assert.equal(manager.getMenuTarget(press2),
          container.children[1]);
      });
    });
  });
});
