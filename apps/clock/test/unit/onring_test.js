/* global testRequire, document */
mocha.setup({ globals: ['GestureDetector'] });

suite('Ring Test', function() {
  'use strict';

  var RingView;
  suiteSetup(function(done) {
    testRequire(['ring_view'],
    function(_RingView) {
      RingView = _RingView;
      loadBodyHTML('/onring.html');
      // Force document.hidden to be 'false' so that the alarm
      // properly triggers visible callbacks in ring_view.js
      Object.defineProperty(document, 'hidden', {value: false});
      done();
    });

  });

  test('vibrates when vibrate is set', function(done) {
    var clock = this.sinon.useFakeTimers();
    var mock = this.sinon.mock(navigator);
    mock.expects('vibrate').atLeast(1);
    var view = new RingView();
    view.alarm({
      data: {
        type: '',
        alarm: {
          vibrate: '1',
          label: 'hi',
          sound: null
        }
      }
    }, function() {
      clock.tick(5000); // vibrate starts after a setInterval
      mock.verify();
      done();
    });
    clock.tick(0); // let event handlers run
  });

  test('does not vibrate when vibrate is "0"', function(done) {
    var clock = this.sinon.useFakeTimers();
    var mock = this.sinon.mock(navigator);
    mock.expects('vibrate').never();
    var view = new RingView();
    view.alarm({
      data: {
        type: '',
        alarm: {
          vibrate: '0',
          label: 'hi',
          sound: null
        }
      }
    }, function() {
      clock.tick(5000); // vibrate starts after a setInterval
      mock.verify();
      done();
    });
    clock.tick(0); // let event handlers run
  });

  test('does not vibrate when vibrate is null', function(done) {
    var clock = this.sinon.useFakeTimers();
    var mock = this.sinon.mock(navigator);
    mock.expects('vibrate').never();
    var view = new RingView();
    view.alarm({
      data: {
        type: '',
        alarm: {
          vibrate: null,
          label: 'hi',
          sound: null
        }
      }
    }, function() {
      clock.tick(5000); // vibrate starts after a setInterval
      mock.verify();
      done();
    });
    clock.tick(0); // let event handlers run
  });
});
