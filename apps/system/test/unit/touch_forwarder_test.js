'use strict';

/* global TouchForwarder, MocksHelper */

requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');

var mocksForTouchForwarder = new MocksHelper([
  'SettingsListener'
]).init();

suite('system/TouchForwarder >', function() {
  mocksForTouchForwarder.attachTestHelpers();

  var iframe;
  var subject;

  function forgeTouch(type, x, y) {
    var touch = document.createTouch(window, document, 42, x, y,
                                     x, y, x, y,
                                     0, 0, 0, 0);
    var touchList = document.createTouchList(touch);
    var touches = (type == 'touchstart' || type == 'touchmove') ?
                       touchList : null;
    var changed = (type == 'touchend') ?
                       touchList : null;

    var e = document.createEvent('TouchEvent');
    e.initTouchEvent(type, true, true,
                     null, null, false, false, false, false,
                     touches, null, changed);

    return e;
  }

  suiteSetup(function(done) {
    requireApp('system/js/touch_forwarder.js', done);
  });

  var ariaHidden;
  setup(function() {
    ariaHidden = 'false';
    iframe = {
      getAttribute: function() { return ariaHidden; },
      sendTouchEvent: function() {},
      sendMouseEvent: function() {}
    };

    subject = new TouchForwarder();
    subject.destination = iframe;
  });


  suite('plain-old element support', function() {
    var element;
    var forwarder;
    setup(function() {
      element = document.createElement('div');
      forwarder = new TouchForwarder(element);
    });

    ['touchstart', 'touchmove', 'touchend', 'touchcancel'].forEach((type) => {
      test(type, function() {
        var spy = this.sinon.spy(element, 'dispatchEvent');
        var evt = forgeTouch(type, 1, 2);
        forwarder.forward(evt);
        assert.equal(spy.firstCall.args[0].type, type);
        if (type === 'touchend' || type === 'touchcancel') {
          assert.equal(spy.firstCall.args[0].touches.length, 0);
        } else {
          assert.equal(spy.firstCall.args[0].touches[0].clientX, 1);
          assert.equal(spy.firstCall.args[0].touches[0].clientY, 2);
        }
      });
    });

    test('click', function() {
      var spy = this.sinon.spy(element, 'dispatchEvent');
      var evt = forgeTouch('click', 1, 2);
      forwarder.forward(evt);

      ['mousemove', 'mousedown', 'mouseup', 'click'].forEach((type, idx) => {
        assert.equal(spy.getCall(idx).args[0].type, type);
      });
    });
  });


  suite('iframe touchstart >', function() {
    test('it should forward touchstart events', function() {
      var sendTouchSpy = this.sinon.spy(iframe, 'sendTouchEvent');
      subject.forward(forgeTouch('touchstart', 3, 20));

      var call = sendTouchSpy.firstCall;
      assert.equal(call.args[0], 'touchstart');
      assert.deepEqual(call.args[2], [3]);
      assert.deepEqual(call.args[3], [20]);
    });

    test('it should not forward to an aria-hidden frame', function() {
      ariaHidden = 'true';
      this.sinon.spy(iframe, 'sendTouchEvent');
      subject.forward(forgeTouch('touchstart', 3, 20));
      sinon.assert.notCalled(iframe.sendTouchEvent);
    });
  });

  suite('iframe touchmove >', function() {
    setup(function() {
      subject.forward(forgeTouch('touchstart', 3, 20));
    });

    test('it should forward touchmove events', function() {
      var sendTouchSpy = this.sinon.spy(iframe, 'sendTouchEvent');
      subject.forward(forgeTouch('touchmove', 3, 27));

      assert.isTrue(sendTouchSpy.calledOnce);

      var call = sendTouchSpy.firstCall;
      assert.equal(call.args[0], 'touchmove');
      assert.deepEqual(call.args[2], [3]);
      assert.deepEqual(call.args[3], [27]);
    });
  });

  suite('iframe touchend >', function() {
    setup(function() {
      subject.forward(forgeTouch('touchstart', 3, 20));
      subject.forward(forgeTouch('touchmove', 3, 27));
    });

    test('it should forward the touchend event', function() {
      var sendTouchSpy = this.sinon.spy(iframe, 'sendTouchEvent');
      subject.forward(forgeTouch('touchend', 3, 37));

      assert.isTrue(sendTouchSpy.calledOnce);

      var call = sendTouchSpy.firstCall;
      assert.equal(call.args[0], 'touchend');
      assert.deepEqual(call.args[2], [3]);
      assert.deepEqual(call.args[3], [37]);
    });
  });


  suite('iframe touchcancel >', function() {
    setup(function() {
      subject.forward(forgeTouch('touchstart', 3, 20));
      subject.forward(forgeTouch('touchmove', 3, 27));
    });

    test('it should forward the touchend event', function() {
      var sendTouchSpy = this.sinon.spy(iframe, 'sendTouchEvent');
      subject.forward(forgeTouch('touchcancel', 3, 37));

      assert.isTrue(sendTouchSpy.calledOnce);

      var call = sendTouchSpy.firstCall;
      assert.equal(call.args[0], 'touchcancel');
    });
  });

  suite('iframe tap >', function() {
    function assertMouseEventsSequence(spy, x, y) {
      var call = spy.getCall(0);
      assertMouseEvent(call, 'mousemove', x, y, 0);

      call = spy.getCall(1);
      assertMouseEvent(call, 'mousedown', x, y, 1);

      call = spy.getCall(2);
      assertMouseEvent(call, 'mouseup', x, y, 1);
    }

    function assertMouseEvent(call, type, x, y, clickCount) {
      assert.equal(call.args[0], type);
      assert.deepEqual(call.args[1], x);
      assert.deepEqual(call.args[2], y);
      assert.deepEqual(call.args[4], clickCount);
    }

    function simpleTap() {
      subject.forward(forgeTouch('touchstart', 3, 20));
      subject.forward(forgeTouch('touchmove', 5, 20));
      subject.forward(forgeTouch('touchend', 5, 20));
    }

    test('it should also send mouse events', function() {
      var sendMouseSpy = this.sinon.spy(iframe, 'sendMouseEvent');
      simpleTap();
      assertMouseEventsSequence(sendMouseSpy, 5, 20);
    });

    test('it should not forward taps to an aria-hidden frame', function() {
      ariaHidden = 'true';
      this.sinon.spy(iframe, 'sendMouseEvent');
      simpleTap();
      sinon.assert.notCalled(iframe.sendMouseEvent);
    });
  });
});
