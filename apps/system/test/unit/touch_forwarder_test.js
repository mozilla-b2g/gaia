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

  setup(function() {
    iframe = {
      getAttribute: function() { return true; }, // APZC on by default
      sendTouchEvent: function() {},
      sendMouseEvent: function() {}
    };

    subject = new TouchForwarder();
    subject.destination = iframe;
  });

  suite('touchstart >', function() {
    test('it should forward touchstart events', function() {
      var sendTouchSpy = this.sinon.spy(iframe, 'sendTouchEvent');
      subject.forward(forgeTouch('touchstart', 3, 20));

      var call = sendTouchSpy.firstCall;
      assert.equal(call.args[0], 'touchstart');
      assert.deepEqual(call.args[2], [3]);
      assert.deepEqual(call.args[3], [20]);
    });
  });

  suite('touchmove >', function() {
    setup(function() {
      subject.forward(forgeTouch('touchstart', 3, 20));
    });

    suite('if the destination has APZC enabled', function() {
      test('it should only forward the first touchmove event', function() {
        var sendTouchSpy = this.sinon.spy(iframe, 'sendTouchEvent');
        subject.forward(forgeTouch('touchmove', 3, 27));
        subject.forward(forgeTouch('touchmove', 3, 37));
        subject.forward(forgeTouch('touchmove', 3, 57));

        assert.isTrue(sendTouchSpy.calledOnce);

        var call = sendTouchSpy.firstCall;
        assert.equal(call.args[0], 'touchmove');
        assert.deepEqual(call.args[2], [3]);
        assert.deepEqual(call.args[3], [27]);
      });
    });
  });

  suite('touchend >', function() {
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

  suite('tap >', function() {
    function simpleTap() {
      subject.forward(forgeTouch('touchstart', 3, 20));
      subject.forward(forgeTouch('touchmove', 5, 20));
      subject.forward(forgeTouch('touchend', 5, 20));
    }

    suite('if the destination has APZC enabled', function() {
      test('it should not send mouse events', function() {
        var sendMouseSpy = this.sinon.spy(iframe, 'sendMouseEvent');
        simpleTap();
        assert.isTrue(sendMouseSpy.notCalled);
      });
    });
  });
});
