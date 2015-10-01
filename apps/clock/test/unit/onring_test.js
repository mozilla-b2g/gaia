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
        time: new Date(),
      });
      clock.tick(5000); // vibrate starts after a setInterval
      mock.verify();
      mock.restore();
    });
  });
});
