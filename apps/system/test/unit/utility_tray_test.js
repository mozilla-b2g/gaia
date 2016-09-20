'use strict';

requireApp('system/js/utility_tray_motion.js');
requireApp('system/js/utility_tray.js');

/* global UtilityTray */

/**
 * This unit test suite only sanity-checks the basic mechanics of the tray.
 * Integration tests check tray motion and state more thoroughly, as well as
 * proper event handling and dispatching.
 */
suite('UtilityTrayMotion', function() {
  var SCROLL_TOP_MAX = 100;

  var motion, el;
  window.Service = {
    locked: false,
    isFtuRunning: false,
    getTopMostWindow: null,
    query(value) {
      return this[value];
    }
  };

  setup(() => {
    el = document.createElement('div');
    var child = document.createElement('div');
    child.style.cssText = `height: ${SCROLL_TOP_MAX * 2}px;`;
    el.appendChild(child);
    el.style.cssText = `height: ${SCROLL_TOP_MAX}px; overflow-y: scroll`;
    document.body.appendChild(el);
    motion = new window.UtilityTrayMotion(el);
  });

  function openTray(done) {
    motion.open();
    var listener = () => {
      assert.notEqual(motion.state, 'closing');
      assert.notEqual(motion.state, 'closed');
      if (motion.state === 'open') {
        el.removeEventListener('tray-motion-state', listener);
        assert.equal(el.scrollTop, 0);
        done();
      }
    };
    el.addEventListener('tray-motion-state', listener);
  }

  test('open', function(done) {
    assert.equal(el.scrollTop, SCROLL_TOP_MAX);
    openTray(done);
  });

  test('open and close: check state and motion events', function(done) {
    openTray(() => {
      assert.equal(el.scrollTop, 0);
      motion.close();
      var fn = () => {
        assert.notEqual(motion.state, 'opening');
        assert.notEqual(motion.state, 'open');
        if (motion.state === 'closed') {
          assert.equal(el.scrollTop, SCROLL_TOP_MAX);
          el.removeEventListener('tray-motion-state', fn);
          done();
        }
      };
      el.addEventListener('tray-motion-state', fn);
    });
  });

  test('handling timeout event received while open', function(done) {
    // If the tray is already open, another 'timeout' event should leave
    // the tray open as-is, not attempt to close it.
    openTray(() => {
      assert.equal(el.scrollTop, 0);
      motion.markPosition('timeout');
      assert.equal(motion.state, 'open');
      done();
    });
  });

  test('Closes in response to window resize when closed', function() {
    var stub = sinon.stub(motion, 'markPosition');
    window.dispatchEvent(new CustomEvent('resize'));
    assert.isTrue(stub.called);
    assert.equal(stub.firstCall.args[0], 'resize');
  });

  test('Opens in response to window resize when open', function(done) {
    openTray(() => {
      var stub = sinon.stub(motion, 'markPosition');
      window.dispatchEvent(new CustomEvent('resize'));
      assert.isTrue(stub.called);
      assert.equal(stub.firstCall.args[0], 'resize');
      done();
    });
  });

  test('reliablyScrollTo', function() {
    var stub = sinon.stub(motion.el, 'scrollTo');

    motion.reliablyScrollTo(0);
    motion.reliablyScrollTo(10);
    motion.reliablyScrollTo(10);

    assert.isTrue(stub.calledThrice);
    assert.deepEqual(stub.firstCall.args[0].top, 0);
    assert.deepEqual(stub.secondCall.args[0].top, 10);
    assert.deepEqual(stub.thirdCall.args[0].top, 10);
    assert.deepEqual(stub.firstCall.args[0].behavior, 'smooth');
    assert.deepEqual(stub.secondCall.args[0].behavior, 'smooth');
    assert.deepEqual(stub.thirdCall.args[0].behavior, 'auto');
  });
});

suite('UtilityTray', function() {

  test('Hides when responding to certain events', function() {

    [
      'emergencyalert',
      'displayapp',
      'keyboardchanged',
      'keyboardchangecanceled',
      'simlockshow',
      'appopening',
      'activityopening',
      'sheets-gesture-begin',
      'attentionopened',
      'attentionwill-become-active',
      'imemenushow'
    ].forEach(function(eventType) {
      var hideFn = sinon.stub(window.UtilityTray, 'hide');
      window.UtilityTray.handleEvent(new CustomEvent(eventType));
      assert.isTrue(hideFn.calledOnce, eventType + ' causes hide');
      hideFn.restore();
    });

  });

  test('Force-closes even when "closing"', function() {
    var tray = window.UtilityTray;
    tray.motion = { close: this.sinon.stub() };
    tray.motion.state = 'closing';
    tray.hide(true);
    assert.isTrue(tray.motion.close.called);
  });

  test('Force-opens even when "opening"', function() {
    var tray = window.UtilityTray;
    tray.motion = { open: this.sinon.stub() };
    tray.motion.state = 'opening';
    tray.show(true);
    assert.isTrue(tray.motion.open.called);
  });

  suite('Hiearchy events support', function() {
    test('should have a name', function() {
      assert.equal(UtilityTray.name, 'UtilityTray');
    });

    test('should expose |isActive|', function() {
      UtilityTray.shown = true;
      assert.isTrue(UtilityTray.isActive());
      UtilityTray.shown = false;
      assert.isFalse(UtilityTray.isActive());
    });

    test('should consume home to close when opened', function() {
      UtilityTray.shown = true;
      this.sinon.stub(UtilityTray, 'hide');

      var result = UtilityTray.respondToHierarchyEvent(new CustomEvent('home'));
      assert.isFalse(result);
      sinon.assert.calledOnce(UtilityTray.hide);
    });

    test('should ignore home when closed', function() {
      UtilityTray.shown = false;
      this.sinon.stub(UtilityTray, 'hide');
      var result = UtilityTray.respondToHierarchyEvent(new CustomEvent('home'));
      assert.isTrue(result);
      sinon.assert.notCalled(UtilityTray.hide);
    });
  });

});

suite('Notification Scroll Handling: ', function() {

  var tray;

  setup(function() {
    tray = window.UtilityTray;
    // Using fake elements here to make it easy to set `offsetTop`.
    tray.notificationsContainer = {
      style: document.createElement('div').style,
    };
    tray.footerContainer = {
      style: document.createElement('div').style,
    };
    tray.nestedScrollInterceptor = document.createElement('div');
  });

  test('Notifications max-height adjusts to fit above footer', function() {
    tray.notificationsContainer.offsetTop = 100;
    tray.footerContainer.offsetTop = 400;
    tray.recalculateNotificationsContainerHeight();
    assert.equal(tray.notificationsContainer.style.maxHeight, '300px');
  });

  test('Scroll interceptor => overflow:scroll when notifications can scroll',
  function() {
    tray.notificationsContainer.scrollTopMax = 100;
    tray.recalculateNotificationsContainerHeight();
    assert.equal(tray.nestedScrollInterceptor.style.overflowY, 'scroll');
  });

  test('Scroll interceptor => overflow:hidden when notifications do not scroll',
  function() {
    tray.notificationsContainer.scrollTopMax = 0;
    tray.recalculateNotificationsContainerHeight();
    assert.equal(tray.nestedScrollInterceptor.style.overflowY, 'hidden');
  });
});
