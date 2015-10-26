/* global require, document, require, loadBodyHTML */
/* global MockIntlHelper, MockMozIntl */

suite('Ring Test', function() {
  'use strict';

  var RingView;
  suiteSetup(function(done) {
    window.IntlHelper = MockIntlHelper;
    window.mozIntl = MockMozIntl;
    require(['ring_view'],
    function(_RingView) {
      RingView = _RingView;
      loadBodyHTML('/onring.html');
      // Force document.hidden to be 'false' so that the alarm
      // properly triggers visible callbacks in ring_view.js
      Object.defineProperty(document, 'hidden', {value: false});
      done();
    });

  });

  [
    { vibrate: true, shouldVibrate: true },
    { vibrate: '1', shouldVibrate: true },
    { vibrate: false, shouldVibrate: false }
  ].forEach(function(testCase) {
    var { vibrate, shouldVibrate } = testCase;

    test('should ' + (shouldVibrate ? '' : 'not ') +
         'vibrate when vibrate is set to ' + vibrate, function() {
      var clock = this.sinon.useFakeTimers();
      var mock = this.sinon.mock(navigator);
      if (shouldVibrate) {
        mock.expects('vibrate').atLeast(1);
      } else {
        mock.expects('vibrate').never();
      }
      var view = new RingView();
      view.addAlert({
        type: 'alarm',
        vibrate: vibrate,
        label: 'hi',
        sound: null,
        hour: 1,
        minute: 1,
        time: new Date(),
      });
      clock.tick(5000); // vibrate starts after a setInterval
      mock.verify();
      mock.restore();
    });
  });

  test('should silence itself after a timeout', function() {
    var clock = this.sinon.useFakeTimers();
    var view = new RingView();
    view.addAlert({
      type: 'alarm',
      vibrate: true,
      label: 'hi',
      sound: null,
      hour: 1,
      minute: 1,
      time: new Date(),
    });

    var silenceSpy = this.sinon.spy(view, 'silence');
    clock.tick(1000); // Wait one second... the alarm should still be ringing
    assert.isFalse(silenceSpy.called);
    clock.tick(10 * 60 * 1000); // After 10 minutes, it should be quiet.
    assert.isTrue(silenceSpy.called);
  });

});
