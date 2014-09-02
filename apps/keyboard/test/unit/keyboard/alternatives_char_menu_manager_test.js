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

    // Create fake menu container element
    container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '5px';
    container.style.top = '40px';
    container.style.width = '60px';
    container.style.height = '10px';
    container.id = 'test-menu';

    var child1 = document.createElement('div');
    child1.style.width = '30px';
    child1.style.height = '100%';
    child1.id = 'key1';
    container.appendChild(child1);

    var child2 = document.createElement('div');
    child2.style.width = '30px';
    child2.style.height = '100%';
    child2.id = 'key2';
    container.appendChild(child2);

    document.body.appendChild(container);

    // Create fake IMERender
    window.IMERender = {
      showAlternativesCharMenu: function(target, alternatives) {
        return {
          getMenuContainer: function() {
            return container;
          },
          getBoundingClientRect: function() {
            return container.getBoundingClientRect();
          },
          getLineHeight: function() {
            return 10;
          }
        };
      },
      hideAlternativesCharMenu: this.sinon.stub()
    };
    this.sinon.spy(window.IMERender, 'showAlternativesCharMenu');

    // Create fake app
    app = {
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
      right: 40,
      width: 30
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
          clientX: 45,
          clientY: 35
        };

        assert.equal(manager.isInMenuArea(press), false);
      });

      test('below key', function() {
        var press = {
          clientX: 45,
          clientY: 70
        };

        assert.equal(manager.isInMenuArea(press), false);
      });

      test('left of menu', function() {
        var press = {
          clientX: 2,
          clientY: 55
        };

        assert.equal(manager.isInMenuArea(press), true);
      });

      test('right of menu', function() {
        var press = {
          clientX: 80,
          clientY: 55
        };

        assert.equal(manager.isInMenuArea(press), true);
      });

      test('right of menu, exceeds the key width', function() {
        var press = {
          clientX: 150,
          clientY: 55
        };

        assert.equal(manager.isInMenuArea(press), false);
      });

      test('on top of the menu', function() {
        var press = {
          clientX: 45,
          clientY: 40
        };

        // We've extend the locked area to include the menu itself.
        assert.equal(manager.isInMenuArea(press), true);
      });

      test('on top of the key', function() {
        var press = {
          clientX: 15,
          clientY: 55
        };

        assert.equal(manager.isInMenuArea(press), true);
      });

      test('below menu and beside key', function() {
        var press = {
          clientX: 65,
          clientY: 55
        };

        assert.equal(manager.isInMenuArea(press), true);
      });

      test('below menu and above key', function() {
        var press = {
          clientX: 65,
          clientY: 47
        };

        assert.equal(manager.isInMenuArea(press), true);
      });
    });

    suite('getMenuTarget', function() {
      test('on top of the key', function() {
        var press = {
          target: target,
          clientX: 15,
          clientY: 55
        };

        assert.equal(manager.getMenuTarget(press),
          container.children[0]);
      });

      test('under 2nd key', function() {
        var press = {
          target: {},
          clientX: 35,
          clientY: 55
        };

        assert.equal(manager.getMenuTarget(press),
          container.children[1]);
      });

      test('under 2nd key but haven\'t moved away from target', function() {
        var press = {
          target: target,
          clientX: 35,
          clientY: 55
        };

        assert.equal(manager.getMenuTarget(press),
          container.children[0]);
      });

      test('under 2nd key, had moved away from target', function() {
        var press = {
          target: {},
          clientX: 45,
          clientY: 55
        };

        assert.equal(manager.getMenuTarget(press),
          container.children[1]);

        var press2 = {
          target: target,
          clientX: 35,
          clientY: 55
        };

        assert.equal(manager.getMenuTarget(press2),
          container.children[1]);
      });
    });
  });
});
