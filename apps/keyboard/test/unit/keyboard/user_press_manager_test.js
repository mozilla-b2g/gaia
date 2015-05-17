'use strict';

/* global UserPress, UserPressManager, KeyboardConsole, MockEventTarget,
          SettingsPromiseManager, MockNavigatorMozSettings,
          MockNavigatorMozSettingsLock */

require('/shared/test/unit/mocks/mock_event_target.js');
require('/js/keyboard/user_press_manager.js');
require('/js/keyboard/console.js');
require('/js/keyboard/settings.js');
require('/shared/js/input_mgmt/mock_navigator_mozsettings.js');

suite('UserPress', function() {
  test('(constructor)', function() {
    var el = {};
    var coords = {
      clientX: 100,
      clientY: 110
    };
    var press = new UserPress(el, coords);

    assert.equal(press.target, el);
    assert.equal(press.moved, false);
    assert.equal(press.clientX, 100);
    assert.equal(press.clientY, 110);
  });

  test('updateCoords()', function() {
    var el = {};
    var coords = {
      clientX: 100,
      clientY: 110
    };
    var press = new UserPress(el, coords);

    var newCoords = {
      clientX: 200,
      clientY: 210
    };

    press.updateCoords(newCoords, true);
    assert.equal(press.moved, true);
    assert.equal(press.clientX, 200);
    assert.equal(press.clientY, 210);
  });
});

suite('UserPressManager', function() {
  var app;
  var container;
  var domObjMap;
  var realMozSettings;
  var mozSettings;
  var lock;

  setup(function() {
    container = new MockEventTarget();
    this.sinon.spy(container, 'addEventListener');
    this.sinon.spy(container, 'removeEventListener');

    domObjMap = new WeakMap();

    realMozSettings = navigator.mozSettings;
    
    mozSettings = navigator.mozSettings = new MockNavigatorMozSettings();
    var createLockStub = this.sinon.stub(mozSettings, 'createLock');
    lock = new MockNavigatorMozSettingsLock();
    this.sinon.spy(lock, 'get');
    createLockStub.returns(lock);

    app = {
      settingsPromiseManager: new SettingsPromiseManager(),
      console: this.sinon.stub(KeyboardConsole.prototype),
      getContainer: function() {
        return container;
      },
      layoutRenderingManager: {
        getTargetObject: function(e){
          return domObjMap.get(e);
        }
      }
    };

    this.sinon.stub(document, 'elementFromPoint');
  });

  teardown(function() {
    document.elementFromPoint.restore();
    navigator.mozSettings = realMozSettings;
  });

  test('(constructor)', function() {
    var manager = new UserPressManager(app);
    assert.equal(manager.app, app);
  });

  // UserPress would have updateCoords() defined in prototype, 
  // so cannot use 'deepEqual' with lastest chai.js.
  var assertOnpressArgs = function (args, expected, msg) {
    // the single for-loop can only test unidirection injective relation
    // from |args[0]| to |expected|; to make sure there aren't any properties
    // present in |expected| but not in |args[0]|, we need to test against
    // Object.keys().length. Note that this is different from
    // layout_manager_test where we test bidirectionally because we need to test
    // prototype there. (which isn't the case here.)
    for (var key in expected[0]) {
      assert.equal(args[0][key], expected[0][key], msg);
    }
    assert.equal(args[1], expected[1], msg);
  };

  test('start()', function() {
    var manager = new UserPressManager(app);
    manager.start();

    assert.isTrue(container.addEventListener.calledWith('touchstart', manager));
    assert.isTrue(container.addEventListener.calledWith('mousedown', manager));
    assert.isTrue(
      container.addEventListener.calledWith('contextmenu', manager));
  });

  test('stop()', function() {
    var manager = new UserPressManager(app);
    manager.start();
    manager.stop();

    assert.isTrue(
      container.removeEventListener.calledWith('touchstart', manager));
    assert.isTrue(
      container.removeEventListener.calledWith('mousedown', manager));
    assert.isTrue(
      container.removeEventListener.calledWith('mousemove', manager));
    assert.isTrue(
      container.removeEventListener.calledWith('mouseup', manager));
    assert.isTrue(
      container.removeEventListener.calledWith('contextmenu', manager));
  });

  test('contextmenu event', function() {
    var manager = new UserPressManager(app);
    manager.start();

    var el = new MockEventTarget();
    var contextmenuEvent = {
      type: 'contextmenu',
      target: el,
      preventDefault: this.sinon.stub()
    };

    container.dispatchEvent(contextmenuEvent);

    assert.isTrue(contextmenuEvent.preventDefault.calledOnce);
  });

  suite('single touch', function() {
    var manager, el, dummyKey;

    setup(function() {
      manager = new UserPressManager(app);
      manager.onpressstart = this.sinon.stub();
      manager.onpressmove = this.sinon.stub();
      manager.onpressend = this.sinon.stub();
      manager.start();

      el = new MockEventTarget();

      dummyKey = {
        dummy: 'dummy'
      };

      domObjMap.set(el, dummyKey);
      var touchstartEvent = {
        type: 'touchstart',
        target: el,
        changedTouches: [
          {
            target: el,
            identifier: 0,
            clientX: 100,
            clientY: 110
          }
        ]
      };
      container.dispatchEvent(touchstartEvent);
      assert.isTrue(manager.onpressstart.calledOnce);
      assert.equal(manager.presses.size, 1);
      assertOnpressArgs(manager.onpressstart.getCall(0).args, 
        [{
          target: dummyKey,
          moved: false,
          clientX: 100,
          clientY: 110
        }, 0]);

      document.elementFromPoint.returns(el);
    });

    test('without moving, touchend', function() {
      var touchendEvent = {
        type: 'touchend',
        target: el,
        changedTouches: [
          {
            target: el,
            identifier: 0,
            clientX: 100,
            clientY: 110
          }
        ]
      };
      el.dispatchEvent(touchendEvent);

      assert.isTrue(manager.onpressend.calledOnce);
      assert.equal(manager.presses.size, 0);
      assertOnpressArgs(manager.onpressend.getCall(0).args,
        [{
          target: dummyKey,
          moved: false,
          clientX: 100,
          clientY: 110
        }, 0]);

      manager.stop();
    });

    test('move within the element but less than MOVE_LIMIT', function() {
      var touchmoveEvent = {
        type: 'touchmove',
        target: el,
        changedTouches: [
          {
            target: el,
            identifier: 0,
            clientX: 101,
            clientY: 112
          }
        ]
      };
      el.dispatchEvent(touchmoveEvent);
      assert.equal(manager.onpressmove.callCount, 0);

      var touchendEvent = {
        type: 'touchend',
        target: el,
        changedTouches: [
          {
            target: el,
            identifier: 0,
            clientX: 101,
            clientY: 112
          }
        ]
      };
      el.dispatchEvent(touchendEvent);

      assert.isTrue(manager.onpressend.calledOnce);
      assert.equal(manager.presses.size, 0);
      assertOnpressArgs(manager.onpressend.getCall(0).args,
        [{
          target: dummyKey,
          moved: false,
          clientX: 101,
          clientY: 112
        }, 0]);

      manager.stop();
    });

    test('move within the element', function() {
      var touchmoveEvent = {
        type: 'touchmove',
        target: el,
        changedTouches: [
          {
            target: el,
            identifier: 0,
            clientX: 120,
            clientY: 130
          }
        ]
      };
      el.dispatchEvent(touchmoveEvent);

      assert.isTrue(manager.onpressmove.calledOnce);
      assertOnpressArgs(manager.onpressmove.getCall(0).args,
        [{
          target: dummyKey,
          moved: true,
          clientX: 120,
          clientY: 130
        }, 0]);

      var touchendEvent = {
        type: 'touchend',
        target: el,
        changedTouches: [
          {
            target: el,
            identifier: 0,
            clientX: 120,
            clientY: 130
          }
        ]
      };
      el.dispatchEvent(touchendEvent);

      assert.isTrue(manager.onpressend.calledOnce);
      assert.equal(manager.presses.size, 0);
      assertOnpressArgs(manager.onpressend.getCall(0).args,
        [{
          target: dummyKey,
          moved: true,
          clientX: 120,
          clientY: 130
        }, 0]);

      manager.stop();
    });

    test('move to another the element', function() {
      var el2 = new MockEventTarget();
      document.elementFromPoint.returns(el2);

      var dummyKey2 = {
        dummy2: 'dummy'
      };

      domObjMap.set(el2, dummyKey2);

      var touchmoveEvent = {
        type: 'touchmove',
        target: el,
        changedTouches: [
          {
            target: el,
            identifier: 0,
            clientX: 120,
            clientY: 130
          }
        ]
      };
      el.dispatchEvent(touchmoveEvent);

      assert.isTrue(manager.onpressmove.calledOnce);
      assertOnpressArgs(manager.onpressmove.getCall(0).args,
        [{
          target: dummyKey2,
          moved: true,
          clientX: 120,
          clientY: 130
        }, 0]);

      var touchendEvent = {
        type: 'touchend',
        target: el,
        changedTouches: [
          {
            target: el,
            identifier: 0,
            clientX: 120,
            clientY: 130
          }
        ]
      };
      el.dispatchEvent(touchendEvent);

      assert.isTrue(manager.onpressend.calledOnce);
      assert.equal(manager.presses.size, 0);
      assertOnpressArgs(manager.onpressend.getCall(0).args,
        [{
          target: dummyKey2,
          moved: true,
          clientX: 120,
          clientY: 130
        }, 0]);

      manager.stop();
    });

    test('ignore mouse events', function() {
      var mousedownEvent = {
        type: 'mousedown',
        target: el,
        clientX: 120,
        clientY: 130,
        preventDefault: this.sinon.stub()
      };
      el.dispatchEvent(mousedownEvent);
      container.dispatchEvent(mousedownEvent);

      var mousemoveEvent = {
        type: 'mousemove',
        target: el,
        clientX: 120,
        clientY: 130
      };
      el.dispatchEvent(mousemoveEvent);
      container.dispatchEvent(mousemoveEvent);

      var mouseupEvent = {
        type: 'mouseup',
        target: el,
        clientX: 120,
        clientY: 130
      };
      el.dispatchEvent(mouseupEvent);
      container.dispatchEvent(mouseupEvent);

      assert.isTrue(mousedownEvent.preventDefault.calledOnce);

      assert.equal(manager.onpressstart.callCount, 1);
      assert.equal(manager.onpressmove.callCount, 0);
      assert.equal(manager.onpressend.callCount, 0);

      manager.stop();
    });
  });

  suite('single mouse click', function() {
    var manager, el, dummyKey;

    setup(function() {
      manager = new UserPressManager(app);
      manager.onpressstart = this.sinon.stub();
      manager.onpressmove = this.sinon.stub();
      manager.onpressend = this.sinon.stub();
      manager.start();

      el = new MockEventTarget();

      dummyKey = {
        dummy: 'dummy'
      };

      domObjMap.set(el, dummyKey);

      var mousedownEvent = {
        type: 'mousedown',
        target: el,
        clientX: 100,
        clientY: 110,
        preventDefault: this.sinon.stub()
      };
      container.dispatchEvent(mousedownEvent);

      assert.isTrue(mousedownEvent.preventDefault.calledOnce);
      assert.isTrue(manager.onpressstart.calledOnce);
      assertOnpressArgs(manager.onpressstart.getCall(0).args,
        [{
          target: dummyKey,
          moved: false,
          clientX: 100,
          clientY: 110
        }, '_mouse']);

      document.elementFromPoint.returns(el);
    });

    test('without moving, mouseup', function() {
      var mouseupEvent = {
        type: 'mouseup',
        target: el,
        clientX: 100,
        clientY: 110
      };
      container.dispatchEvent(mouseupEvent);

      assert.isTrue(manager.onpressend.calledOnce);
      assert.equal(manager.presses.size, 0);
      assertOnpressArgs(manager.onpressend.getCall(0).args,
        [{
          target: dummyKey,
          moved: false,
          clientX: 100,
          clientY: 110
        }, '_mouse']);
    });

    test('mousemove after mouseup', function() {
      var mouseupEvent = {
        type: 'mouseup',
        target: el,
        clientX: 100,
        clientY: 110
      };
      container.dispatchEvent(mouseupEvent);

      var mousemoveEvent = {
        type: 'mousemove',
        target: el,
        clientX: 101,
        clientY: 112
      };
      container.dispatchEvent(mousemoveEvent);

      assert.isTrue(true, 'Does not throw.');
    });

    test('mousemove after mouseleave', function() {
      var mouseleaveEvent = {
        type: 'mouseleave',
        target: el,
        clientX: 100,
        clientY: 110
      };
      container.dispatchEvent(mouseleaveEvent);

      var mousemoveEvent = {
        type: 'mousemove',
        target: el,
        clientX: 101,
        clientY: 112
      };
      container.dispatchEvent(mousemoveEvent);

      assert.isTrue(true, 'Does not throw.');
    });

    test('mouseup after mouseup', function() {
      var mouseupEvent = {
        type: 'mouseup',
        target: el,
        clientX: 100,
        clientY: 110
      };
      container.dispatchEvent(mouseupEvent);

      var mouseupEvent2 = {
        type: 'mouseup',
        target: el,
        clientX: 101,
        clientY: 112
      };
      container.dispatchEvent(mouseupEvent2);

      assert.isTrue(true, 'Does not throw.');
    });

    test('move within the element but less than MOVE_LIMIT', function() {
      var mousemoveEvent = {
        type: 'mousemove',
        target: el,
        clientX: 101,
        clientY: 112
      };
      container.dispatchEvent(mousemoveEvent);

      assert.equal(manager.onpressmove.callCount, 0);

      var mouseupEvent = {
        type: 'mouseup',
        target: el,
        clientX: 101,
        clientY: 112
      };
      container.dispatchEvent(mouseupEvent);

      assert.isTrue(manager.onpressend.calledOnce);
      assert.equal(manager.presses.size, 0);
      assertOnpressArgs(manager.onpressend.getCall(0).args,
        [{
          target: dummyKey,
          moved: false,
          clientX: 101,
          clientY: 112
        }, '_mouse']);

      manager.stop();
    });

    test('move within the element', function() {
      var mousemoveEvent = {
        type: 'mousemove',
        target: el,
        clientX: 120,
        clientY: 130
      };
      container.dispatchEvent(mousemoveEvent);

      assert.isTrue(manager.onpressmove.calledOnce);
      assertOnpressArgs(manager.onpressmove.getCall(0).args,
        [{
          target: dummyKey,
          moved: true,
          clientX: 120,
          clientY: 130
        }, '_mouse']);

      var mouseupEvent = {
        type: 'mouseup',
        target: el,
        clientX: 120,
        clientY: 130
      };
      container.dispatchEvent(mouseupEvent);

      assert.isTrue(manager.onpressend.calledOnce);
      assert.equal(manager.presses.size, 0);
      assertOnpressArgs(manager.onpressend.getCall(0).args,
        [{
          target: dummyKey,
          moved: true,
          clientX: 120,
          clientY: 130
        }, '_mouse']);

      manager.stop();
    });

    test('move to another the element', function() {
      var el2 = new MockEventTarget();
      document.elementFromPoint.returns(el2);

      var dummyKey2 = {
        dummy2: 'dummy'
      };

      domObjMap.set(el2, dummyKey2);

      var mousemoveEvent = {
        type: 'mousemove',
        target: el2,
        clientX: 120,
        clientY: 130
      };
      container.dispatchEvent(mousemoveEvent);

      assert.isTrue(manager.onpressmove.calledOnce);
      assertOnpressArgs(manager.onpressmove.getCall(0).args,
        [{
          target: dummyKey2,
          moved: true,
          clientX: 120,
          clientY: 130
        }, '_mouse']);

      var mouseupEvent = {
        type: 'mouseup',
        target: el2,
        clientX: 120,
        clientY: 130
      };
      container.dispatchEvent(mouseupEvent);

      assert.isTrue(manager.onpressend.calledOnce);
      assert.equal(manager.presses.size, 0);
      assertOnpressArgs(manager.onpressend.getCall(0).args,
        [{
          target: dummyKey2,
          moved: true,
          clientX: 120,
          clientY: 130
        }, '_mouse']);

      manager.stop();
    });
  });

  suite('two touches', function() {
    var manager, el, el2, dummyKey, dummyKey2;

    setup(function() {
      manager = new UserPressManager(app);
      manager.onpressstart = this.sinon.stub();
      manager.onpressmove = this.sinon.stub();
      manager.onpressend = this.sinon.stub();
      manager.start();

      el = new MockEventTarget();

      dummyKey = {
        dummy: 'dummy'
      };

      domObjMap.set(el, dummyKey);

      var touchstartEvent = {
        type: 'touchstart',
        target: el,
        changedTouches: [
          {
            target: el,
            identifier: 0,
            clientX: 100,
            clientY: 110
          }
        ]
      };
      container.dispatchEvent(touchstartEvent);

      assert.isTrue(manager.onpressstart.calledOnce);
      assertOnpressArgs(manager.onpressstart.getCall(0).args,
        [{
          target: dummyKey,
          moved: false,
          clientX: 100,
          clientY: 110
        }, 0]);

      el2 = new MockEventTarget();

      dummyKey2 = {
        dummy2: 'dummy'
      };

      domObjMap.set(el2, dummyKey2);

      var touchstartEvent2 = {
        type: 'touchstart',
        target: el2,
        changedTouches: [
          {
            target: el2,
            identifier: 1,
            clientX: 200,
            clientY: 210
          }
        ]
      };
      container.dispatchEvent(touchstartEvent2);

      assert.isTrue(manager.onpressstart.calledTwice);
      assert.equal(manager.presses.size, 2);
      assertOnpressArgs(manager.onpressstart.getCall(1).args,
        [{
          target: dummyKey2,
          moved: false,
          clientX: 200,
          clientY: 210
        }, 1]);

      document.elementFromPoint.withArgs(100, 110).returns(el);
      document.elementFromPoint.withArgs(200, 210).returns(el2);
    });

    test('without moving, touchend', function() {
      var touchendEvent = {
        type: 'touchend',
        target: el,
        changedTouches: [
          {
            target: el,
            identifier: 0,
            clientX: 100,
            clientY: 110
          }
        ]
      };
      el.dispatchEvent(touchendEvent);

      assert.isTrue(manager.onpressend.calledOnce);
      assert.equal(manager.presses.size, 1);
      assertOnpressArgs(manager.onpressend.getCall(0).args,
        [{
          target: dummyKey,
          moved: false,
          clientX: 100,
          clientY: 110
        }, 0]);

      var touchendEvent2 = {
        type: 'touchend',
        target: el2,
        changedTouches: [
          {
            target: el2,
            identifier: 1,
            clientX: 200,
            clientY: 210
          }
        ]
      };
      el2.dispatchEvent(touchendEvent2);

      assert.isTrue(manager.onpressend.calledTwice);
      assert.equal(manager.presses.size, 0);
      assertOnpressArgs(manager.onpressend.getCall(1).args,
        [{
          target: dummyKey2,
          moved: false,
          clientX: 200,
          clientY: 210
        }, 1]);

      manager.stop();
    });

    test('move within the element', function() {
      document.elementFromPoint.withArgs(120, 130).returns(el);
      document.elementFromPoint.withArgs(220, 230).returns(el2);

      var touchmoveEvent = {
        type: 'touchmove',
        target: el,
        changedTouches: [
          {
            target: el,
            identifier: 0,
            clientX: 120,
            clientY: 130
          }
        ]
      };
      el.dispatchEvent(touchmoveEvent);

      assert.isTrue(manager.onpressmove.calledOnce);
      assertOnpressArgs(manager.onpressmove.getCall(0).args,
        [{
          target: dummyKey,
          moved: true,
          clientX: 120,
          clientY: 130
        }, 0]);

      var touchmoveEvent2 = {
        type: 'touchmove',
        target: el2,
        changedTouches: [
          {
            target: el2,
            identifier: 1,
            clientX: 220,
            clientY: 230
          }
        ]
      };
      el2.dispatchEvent(touchmoveEvent2);

      assert.isTrue(manager.onpressmove.calledTwice);
      assertOnpressArgs(manager.onpressmove.getCall(1).args,
        [{
          target: dummyKey2,
          moved: true,
          clientX: 220,
          clientY: 230
        }, 1]);

      var touchendEvent = {
        type: 'touchend',
        target: el,
        changedTouches: [
          {
            target: el,
            identifier: 0,
            clientX: 120,
            clientY: 130
          }
        ]
      };
      el.dispatchEvent(touchendEvent);

      assert.isTrue(manager.onpressend.calledOnce);
      assert.equal(manager.presses.size, 1);
      assertOnpressArgs(manager.onpressend.getCall(0).args,
        [{
          target: dummyKey,
          moved: true,
          clientX: 120,
          clientY: 130
        }, 0]);

      var touchendEvent2 = {
        type: 'touchend',
        target: el2,
        changedTouches: [
          {
            target: dummyKey2,
            identifier: 1,
            clientX: 220,
            clientY: 230
          }
        ]
      };
      el2.dispatchEvent(touchendEvent2);

      assert.isTrue(manager.onpressend.calledTwice);
      assert.equal(manager.presses.size, 0);
      assertOnpressArgs(manager.onpressend.getCall(1).args,
        [{
          target: dummyKey2,
          moved: true,
          clientX: 220,
          clientY: 230
        }, 1]);

      manager.stop();
    });

    test('move to another the element', function() {
      var el3 = new MockEventTarget();
      var el4 = new MockEventTarget();

      var dummyKey3 = {
        dummy3: 'dummy'
      };

      domObjMap.set(el3, dummyKey3);

      var dummyKey4 = {
        dummy3: 'dummy'
      };

      domObjMap.set(el4, dummyKey4);

      document.elementFromPoint.withArgs(120, 130).returns(el3);
      document.elementFromPoint.withArgs(220, 230).returns(el4);

      var touchmoveEvent = {
        type: 'touchmove',
        target: el,
        changedTouches: [
          {
            target: el,
            identifier: 0,
            clientX: 120,
            clientY: 130
          }
        ]
      };
      el.dispatchEvent(touchmoveEvent);

      assert.isTrue(manager.onpressmove.calledOnce);
      assertOnpressArgs(manager.onpressmove.getCall(0).args,
        [{
          target: dummyKey3,
          moved: true,
          clientX: 120,
          clientY: 130
        }, 0]);

      var touchmoveEvent2 = {
        type: 'touchmove',
        target: el2,
        changedTouches: [
          {
            target: el2,
            identifier: 1,
            clientX: 220,
            clientY: 230
          }
        ]
      };
      el2.dispatchEvent(touchmoveEvent2);

      assert.isTrue(manager.onpressmove.calledTwice);
      assertOnpressArgs(manager.onpressmove.getCall(1).args,
        [{
          target: dummyKey4,
          moved: true,
          clientX: 220,
          clientY: 230
        }, 1]);

      var touchendEvent = {
        type: 'touchend',
        target: el,
        changedTouches: [
          {
            target: el,
            identifier: 0,
            clientX: 120,
            clientY: 130
          }
        ]
      };
      el.dispatchEvent(touchendEvent);

      assert.isTrue(manager.onpressend.calledOnce);
      assert.equal(manager.presses.size, 1);
      assertOnpressArgs(manager.onpressend.getCall(0).args,
        [{
          target: dummyKey3,
          moved: true,
          clientX: 120,
          clientY: 130
        }, 0]);

      var touchendEvent2 = {
        type: 'touchend',
        target: el2,
        changedTouches: [
          {
            target: el2,
            identifier: 1,
            clientX: 220,
            clientY: 230
          }
        ]
      };
      el2.dispatchEvent(touchendEvent2);

      assert.isTrue(manager.onpressend.calledTwice);
      assert.equal(manager.presses.size, 0);
      assertOnpressArgs(manager.onpressend.getCall(1).args,
        [{
          target: dummyKey4,
          moved: true,
          clientX: 220,
          clientY: 230
        }, 1]);

      manager.stop();
    });
  });

  suite('two touches on the same element', function() {
    var manager, el, dummyKey;

    setup(function() {
      manager = new UserPressManager(app);
      manager.onpressstart = this.sinon.stub();
      manager.onpressmove = this.sinon.stub();
      manager.onpressend = this.sinon.stub();
      manager.start();

      el = new MockEventTarget();

      dummyKey = {
        dummy: 'dummy'
      };

      domObjMap.set(el, dummyKey);

      this.sinon.stub(el, 'removeEventListener');
      var touchstartEvent = {
        type: 'touchstart',
        target: el,
        changedTouches: [
          {
            target: el,
            identifier: 0,
            clientX: 100,
            clientY: 110
          }
        ]
      };
      container.dispatchEvent(touchstartEvent);

      assert.isTrue(manager.onpressstart.calledOnce);
      assertOnpressArgs(manager.onpressstart.getCall(0).args,
        [{
          target: dummyKey,
          moved: false,
          clientX: 100,
          clientY: 110
        }, 0]);

      var touchstartEvent2 = {
        type: 'touchstart',
        target: el,
        changedTouches: [
          {
            target: el,
            identifier: 1,
            clientX: 200,
            clientY: 210
          }
        ]
      };
      container.dispatchEvent(touchstartEvent2);

      assert.isTrue(manager.onpressstart.calledTwice);
      assert.equal(manager.presses.size, 2);
      assertOnpressArgs(manager.onpressstart.getCall(1).args,
        [{
          target: dummyKey,
          moved: false,
          clientX: 200,
          clientY: 210
        }, 1]);

      document.elementFromPoint.withArgs(100, 110).returns(el);
      document.elementFromPoint.withArgs(200, 210).returns(el);
    });

    test('without moving, touchend', function() {
      var touchendEvent = {
        type: 'touchend',
        target: el,
        changedTouches: [
          {
            target: el,
            identifier: 0,
            clientX: 100,
            clientY: 110
          }
        ]
      };
      el.dispatchEvent(touchendEvent);

      assert.isTrue(manager.onpressend.calledOnce);
      assert.equal(manager.presses.size, 1);
      assertOnpressArgs(manager.onpressend.getCall(0).args,
        [{
          target: dummyKey,
          moved: false,
          clientX: 100,
          clientY: 110
        }, 0]);

      var touchendEvent2 = {
        type: 'touchend',
        target: el,
        changedTouches: [
          {
            target: el,
            identifier: 1,
            clientX: 200,
            clientY: 210
          }
        ]
      };
      el.dispatchEvent(touchendEvent2);

      assert.isTrue(manager.onpressend.calledTwice);
      assert.equal(manager.presses.size, 0);
      assertOnpressArgs(manager.onpressend.getCall(1).args,
        [{
          target: dummyKey,
          moved: false,
          clientX: 200,
          clientY: 210
        }, 1]);

      assert.isTrue(el.removeEventListener.calledWith('touchmove'));
      assert.isTrue(el.removeEventListener.calledWith('touchend'));
      assert.isTrue(el.removeEventListener.calledWith('touchcancel'));
      assert.equal(el.removeEventListener.callCount, 3);

      manager.stop();
    });
  });

  suite('speedlimit', function() {
    var manager, el, dummyKey, clock;

    setup(function() {
      clock = sinon.useFakeTimers();

      manager = new UserPressManager(app);
      manager.onpressstart = this.sinon.stub();
      manager.onpressmove = this.sinon.stub();
      manager.onpressend = this.sinon.stub();
      manager.start();
      manager._isLowEndDevice = true;

      el = new MockEventTarget();

      dummyKey = {
        dummy: 'dummy'
      };

      domObjMap.set(el, dummyKey);
      var touchstartEvent = {
        type: 'touchstart',
        target: el,
        changedTouches: [
          {
            target: el,
            identifier: 0,
            clientX: 100,
            clientY: 110
          }
        ]
      };
      container.dispatchEvent(touchstartEvent);
      assert.isTrue(manager.onpressstart.calledOnce);
      assert.equal(manager.presses.size, 1);
      assertOnpressArgs(manager.onpressstart.getCall(0).args,
        [{
          target: dummyKey,
          moved: false,
          clientX: 100,
          clientY: 110
        }, 0]);

      document.elementFromPoint.returns(el);
    });

    teardown(function() {
      clock.restore();
    });

    test('exceeding velocity and distance, move to different key', function() {
      var el2 = new MockEventTarget();
      document.elementFromPoint.returns(el2);

      var dummyKey2 = {
        dummy2: 'dummy2',
        keyCode: 'dummy2'
      };

      domObjMap.set(el2, dummyKey2);

      var touchendEvent = {
        type: 'touchend',
        target: el2,
        changedTouches: [
          {
            target: el2,
            identifier: 0,
            clientX: 120,
            clientY: 130
          }
        ]
      };
      el.dispatchEvent(touchendEvent);

      assert.isTrue(manager.onpressend.calledTwice);
      assert.strictEqual(manager.onpressend.getCall(0).args[0].clientX,
        100);
      assert.strictEqual(manager.onpressend.getCall(0).args[0].clientY,
        110);

      assert.strictEqual(manager.onpressend.getCall(1).args[0].clientX,
        120);
      assert.strictEqual(manager.onpressend.getCall(1).args[0].clientY,
        130);

      manager.stop();
    });

    test('exceeding velocity and distance, stay on same key', function() {
      var touchendEvent = {
        type: 'touchend',
        target: el,
        changedTouches: [
          {
            target: el,
            identifier: 0,
            clientX: 120,
            clientY: 130
          }
        ]
      };
      el.dispatchEvent(touchendEvent);

      assert.isTrue(manager.onpressend.calledOnce);

      manager.stop();
    });

    test('exceeding distance not velocity', function() {
      var touchendEvent = {
        type: 'touchend',
        target: el,
        changedTouches: [
          {
            target: el,
            identifier: 0,
            clientX: 120,
            clientY: 130
          }
        ]
      };
      clock.tick(100);
      el.dispatchEvent(touchendEvent);

      assert.isTrue(manager.onpressend.calledOnce);

      manager.stop();
    });

    test('not exceeding distance and not velocity', function() {
      var touchendEvent = {
        type: 'touchend',
        target: el,
        changedTouches: [
          {
            target: el,
            identifier: 0,
            clientX: 101,
            clientY: 111
          }
        ]
      };
      clock.tick(100);
      el.dispatchEvent(touchendEvent);

      assert.isTrue(manager.onpressend.calledOnce);

      manager.stop();
    });

    test('exceeding velocity not distance', function() {
      var touchendEvent = {
        type: 'touchend',
        target: el,
        changedTouches: [
          {
            target: el,
            identifier: 0,
            clientX: 101,
            clientY: 111
          }
        ]
      };
      clock.tick(1);
      el.dispatchEvent(touchendEvent);

      assert.isTrue(manager.onpressend.calledOnce);

      manager.stop();
    });
  });
});
