'use strict';

/* global AlternativesCharMenuManager */

require('/js/keyboard/alternatives_char_menu_manager.js');

suite('AlternativesCharMenuManager', function() {
  var app;
  var container;
  var manager;
  var target;
  var targetElem;

  var getFakeElementWithGetBoundingClientRect;

  var dummyObjForChild1;

  var fakeMenuView;

  var viewManager;

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
    container.appendChild(child1);

    var child2 = document.createElement('div');
    container.appendChild(child2);

    dummyObjForChild1 = {
      dummy: 'dummy'
    };

    document.body.appendChild(container);

    var viewMap = new WeakMap();

    fakeMenuView = {
      getMenuContainer: function() {
        return container;
      },
      getBoundingClientRect: function() {
        return container.getBoundingClientRect();
      },
      getMenuTarget: this.sinon.stub(),
      isMenuTarget: this.sinon.stub()
    };

    // Create fake viewManager
    viewManager = {
      showAlternativesCharMenu: function(target, alternatives) {
        return fakeMenuView;
      },
      hideAlternativesCharMenu: this.sinon.stub(),
      registerView: function(target, view) {
        viewMap.set(target, view);
      },
      getView(target) {
        return viewMap.get(target);
      }
    };
    this.sinon.spy(viewManager, 'showAlternativesCharMenu');

    // Create fake app
    app = {
      upperCaseStateManager: {
        isUpperCaseLocked: undefined,
        isUpperCase: undefined
      },
      layoutManager: {
        currentPage: {
          alt: {
          }
        }
      },
      layoutRenderingManager: {
        getTargetObject: this.sinon.stub()
      },
      viewManager: viewManager
    };

    // Create fake target object and DOM element
    targetElem = getFakeElementWithGetBoundingClientRect();
    targetElem.getBoundingClientRect.returns({
      top: 50,
      bottom: 60,
      left: 10,
      right: 40,
      width: 30
    });

    target = {
      keyCode: 'x'.charCodeAt(0),
      keyCodeUpper: 'X'.charCodeAt(0),
      lowercaseValue: 'x',
      uppercaseValue: 'X'
    };

    viewManager.registerView(target, {element: targetElem});

    // Show an alternatives chars menu
    manager = new AlternativesCharMenuManager(app);
    manager.start();

    assert.equal(manager.isShown, false);
  });

  teardown(function() {
    app = null;
    container = null;
  });

  test('show (lower case)', function() {
    app.upperCaseStateManager.isUpperCase = false;
    app.upperCaseStateManager.isUpperCaseLocked = false;

    app.layoutManager.currentPage.alt.x =
      ['a', 'b', 'c', 'd'];

    manager.show(target);

    assert.isTrue(viewManager.
      showAlternativesCharMenu.calledWith(target, ['x', 'a', 'b', 'c', 'd']));
    assert.isTrue(app.layoutManager.currentPage.alt.x !==
      viewManager.showAlternativesCharMenu.getCall(0).args[1],
      'A copy of the array should be sent instead of the original one.');
    assert.isTrue(manager.isShown);
  });

  test('show (upper case)', function() {
    app.upperCaseStateManager.isUpperCase = true;
    app.upperCaseStateManager.isUpperCaseLocked = false;

    app.layoutManager.currentPage.alt.X =
      ['A', 'B', 'C', 'D'];
    app.layoutManager.currentPage.alt.X.upperCaseLocked =
      ['E', 'F', 'G', 'H'];

    manager.show(target);

    assert.isTrue(viewManager.
        showAlternativesCharMenu.calledWith(target, ['X', 'A', 'B', 'C', 'D']));
    assert.isTrue(app.layoutManager.currentPage.alt.x !==
      viewManager.showAlternativesCharMenu.getCall(0).args[1],
      'A copy of the array should be sent instead of the original one.');
    assert.isTrue(manager.isShown);
  });

  test('show (upper case locked)', function() {
    app.upperCaseStateManager.isUpperCase = true;
    app.upperCaseStateManager.isUpperCaseLocked = true;

    app.layoutManager.currentPage.alt.X =
      ['A', 'B', 'C', 'D'];
    app.layoutManager.currentPage.alt.X.upperCaseLocked =
      ['E', 'F', 'G', 'H'];

    manager.show(target);

    assert.isTrue(viewManager.
        showAlternativesCharMenu.calledWith(target, ['X', 'E', 'F', 'G', 'H']));
    assert.isTrue(app.layoutManager.currentPage.alt.x !==
      viewManager.showAlternativesCharMenu.getCall(0).args[1],
      'A copy of the array should be sent instead of the original one.');
    assert.isTrue(manager.isShown);
  });

  test('show (ignore key w/o alternatives)', function() {
    app.upperCaseStateManager.isUpperCase = false;
    app.upperCaseStateManager.isUpperCaseLocked = false;

    manager.show(target);

    assert.isFalse(viewManager.showAlternativesCharMenu.called);
    assert.isFalse(manager.isShown);
  });

  suite('after shown', function() {
    setup(function() {
      app.upperCaseStateManager.isUpperCase = false;
      app.upperCaseStateManager.isUpperCaseLocked = false;

      app.layoutManager.currentPage.alt.x =
        ['a', 'b', 'c', 'd'];

      manager.show(target);
    });

    test('hide', function() {
      manager.hide();

      assert.equal(manager.isShown, false);
      assert.isTrue(viewManager.hideAlternativesCharMenu.calledOnce);
    });

    suite('isMenuTarget', function() {
      var dummyTarget = {
        dummy: null
      };

      setup(function() {
        manager.isMenuTarget(dummyTarget);
      });

      test('will invoke MenuView\'s isMenuTarget', function() {
        assert.isTrue(fakeMenuView.isMenuTarget.calledOnce);
        assert.isTrue(fakeMenuView.isMenuTarget.calledWith(dummyTarget));
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
      test('will invoke menuView.getMenuTarget', function() {
        var press = {
          target: {},
          clientX: 35,
          clientY: 55
        };

        manager.getMenuTarget(press);

        assert.isTrue(fakeMenuView.getMenuTarget.calledOnce);
        assert.isTrue(fakeMenuView.getMenuTarget.calledWith(press.clientX,
                                                            press.clientY));
      });
    });
  });

  suite('after hiding the menu', function() {
    setup(function() {
      app.upperCaseStateManager.isUpperCase = false;
      app.upperCaseStateManager.isUpperCaseLocked = false;

      app.layoutManager.currentPage.alt.x =
        ['a', 'b', 'c', 'd'];

      manager.show(target);
      manager.hide();
    });

    test('isMenuTarget should be false', function() {
      assert.isFalse(manager.isMenuTarget(target));
    });

    test('isInMenuArea() should return false', function() {
      var press = {
        clientX: 65,
        clientY: 47
      };

      assert.isFalse(manager.isInMenuArea(press));
    });
  });
});
