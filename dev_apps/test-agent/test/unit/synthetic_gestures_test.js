requireCommon('test/synthetic_gestures.js');

// Tests for the SyntheticGestures library which is used for
// writing tests for the GestureDetector library.
suite('SyntheticGestures', function() {

  var touchDevice = (window.Touch !== undefined);

  // Just make sure the object and its functions are defined
  suite('API', function() {
    test('SyntheticGestures object', function() {
      assert.ok(SyntheticGestures);
    });
    test('SyntheticGesture functions', function() {
      assert.typeOf(SyntheticGestures.tap, 'function');
      assert.typeOf(SyntheticGestures.mousetap, 'function');
      assert.typeOf(SyntheticGestures.dbltap, 'function');
      assert.typeOf(SyntheticGestures.mousedbltap, 'function');
      assert.typeOf(SyntheticGestures.swipe, 'function');
      assert.typeOf(SyntheticGestures.mouseswipe, 'function');
      assert.typeOf(SyntheticGestures.hold, 'function');
      assert.typeOf(SyntheticGestures.mousehold, 'function');
      assert.typeOf(SyntheticGestures.pinch, 'function');
    });
  });

  // Test that the SyntheticGesture functions actually send out the
  // expected stream of synthetic events
  suite('eventstream', function() {
    var events;    // save a sequence of events
    var element;   // dummy element to generate events on

    // Just push the event object into an array
    function saveevent(e) {
      if (!e.isTrusted)  // only save the synthetic events
        events.push(e);
    }

    // Return the sequence of events as a string of event types
    function eventseq() {
      return events.map(function(e) { return e.type }).join(' ');
    }

    suiteSetup(function() {
      if (touchDevice) {
        document.addEventListener('touchstart', saveevent, true);
        document.addEventListener('touchmove', saveevent, true);
        document.addEventListener('touchend', saveevent, true);
      }
      document.addEventListener('mousedown', saveevent, true);
      document.addEventListener('mousemove', saveevent, true);
      document.addEventListener('mouseup', saveevent, true);
    });

    suiteTeardown(function() {
      if (touchDevice) {
        document.removeEventListener('touchstart', saveevent, true);
        document.removeEventListener('touchmove', saveevent, true);
        document.removeEventListener('touchend', saveevent, true);
      }
      document.removeEventListener('mousedown', saveevent, true);
      document.removeEventListener('mousemove', saveevent, true);
      document.removeEventListener('mouseup', saveevent, true);
    });

    setup(function() {
      events = [];
      element = document.createElement('div');
      element.setAttribute('style',
                           'position:absolute;left:0px;top:0px;width:100%;height:100%');
      document.body.appendChild(element);
    });

    teardown(function() {
      document.body.removeChild(element);
    });

    if (touchDevice) {
      test('tap', function(done) {
        SyntheticGestures.tap(element, function() {
          done(function() {
            assert.equal(eventseq(), 'touchstart touchend');
            assert.equal(events[0].changedTouches[0].clientX, 10);
            assert.equal(events[0].changedTouches[0].clientY, 20);
            assert.equal(events[1].changedTouches[0].clientX, 10);
            assert.equal(events[1].changedTouches[0].clientY, 20);
          });
        }, 10, 20);
      });

      test('dbltap', function(done) {
        SyntheticGestures.dbltap(element, function() {
          done(function() {
            assert.equal(eventseq(), 'touchstart touchend touchstart touchend');
            assert.equal(events[0].changedTouches[0].clientX, 10);
            assert.equal(events[0].changedTouches[0].clientY, 20);
            assert.equal(events[3].changedTouches[0].clientX, 10);
            assert.equal(events[3].changedTouches[0].clientY, 20);
          });
        }, 10, 20);
      });

      test('swipe', function(done) {
        SyntheticGestures.swipe(element, 0, 0, 100, 100, 100, function() {
          done(function() {
            var firstEvent = events[0];
            var lastEvent = events[events.length - 1];
            assert.match(eventseq(), /touchstart (touchmove )+touchend/);
            assert.equal(firstEvent.changedTouches[0].clientX, 0);
            assert.equal(firstEvent.changedTouches[0].clientY, 0);
            assert.equal(lastEvent.changedTouches[0].clientX, 100);
            assert.equal(lastEvent.changedTouches[0].clientY, 100);
          });
        });
      });

      test('hold', function(done) {
        SyntheticGestures.hold(element, 100, 0, 0, 100, 100, 100, function() {
          done(function() {
            var firstEvent = events[0];
            var lastEvent = events[events.length - 1];
            assert.match(eventseq(), /touchstart (touchmove )+touchend/);
            assert.equal(firstEvent.changedTouches[0].clientX, 0);
            assert.equal(firstEvent.changedTouches[0].clientY, 0);
            assert.equal(lastEvent.changedTouches[0].clientX, 100);
            assert.equal(lastEvent.changedTouches[0].clientY, 100);
          });
        });
      });

      test('pinch (out)', function(done) {
        SyntheticGestures.pinch(element, 100, 100, 200, 100, 2,
                                800, function() {
          done(function() {
            var expectedSequence =
              /touchstart touchstart (touchmove )+touchend touchend/;
            assert.match(eventseq(), expectedSequence);

            assert.equal(events[0].touches.length, 1);
            assert.equal(events[1].touches.length, 2);
            assert.equal(events[1].targetTouches.length, 2);
            var e = events[events.length - 3];  // last touchmove event
            var t1 = e.targetTouches[0];
            var t2 = e.targetTouches[1];
            var dx = Math.abs(t1.clientX - t2.clientX);
            assert.equal(dx, 200); // 100px * 2
          });
        });
      });

      test('pinch (in)', function(done) {
        SyntheticGestures.pinch(element, 100, 100, 200, 100, .75,
                                800, function() {
          done(function() {
            var expectedSequence =
              /touchstart touchstart (touchmove )+touchend touchend/;
            assert.match(eventseq(), expectedSequence);

            assert.equal(events[0].touches.length, 1);
            assert.equal(events[1].touches.length, 2);
            assert.equal(events[1].targetTouches.length, 2);
            var e = events[events.length - 3];  // last touchmove event
            var t1 = e.targetTouches[0];
            var t2 = e.targetTouches[1];
            var dx = Math.abs(t1.clientX - t2.clientX);
            assert.equal(dx, 75); // 100px * .75
          });
        });
      });
    }

    test('mousetap', function(done) {
      SyntheticGestures.mousetap(element, function() {
        done(function() {
          assert.equal(eventseq(), 'mousedown mouseup');
          assert.equal(events[0].clientX, 10);
          assert.equal(events[0].clientY, 20);
          assert.equal(events[1].clientX, 10);
          assert.equal(events[1].clientY, 20);
        });
      }, 10, 20);
    });

    test('mousedbltap', function(done) {
      SyntheticGestures.mousedbltap(element, function() {
        done(function() {
          assert.equal(eventseq(), 'mousedown mouseup mousedown mouseup');
          assert.equal(events[0].clientX, 10);
          assert.equal(events[0].clientY, 20);
          assert.equal(events[3].clientX, 10);
          assert.equal(events[3].clientY, 20);
        });
      },10, 20);
    });

    test('mouseswipe', function(done) {
      SyntheticGestures.mouseswipe(element, 0, 0, 100, 100, 100, function() {
        done(function() {
          assert.match(eventseq(), /mousedown (mousemove )+mouseup/);
          assert.equal(events[0].clientX, 0);
          assert.equal(events[0].clientY, 0);
          assert.equal(events[events.length - 1].clientX, 100);
          assert.equal(events[events.length - 1].clientY, 100);
        });
      });
    });

    test('mousehold', function(done) {
      SyntheticGestures.mousehold(element, 100, 0, 0, 100, 100,
                                  100, function() {
        done(function() {
          assert.match(eventseq(), /mousedown (mousemove )+mouseup/);
          assert.equal(events[0].clientX, 0);
          assert.equal(events[0].clientY, 0);
          assert.equal(events[events.length - 1].clientX, 100);
          assert.equal(events[events.length - 1].clientY, 100);
        });
      });
    });
  });

  // Just like the above, but using relative coordinates
  suite('relative coordinates', function() {
    var events;    // save a sequence of events
    var element;   // dummy element to generate events on

    // Just push the event object into an array
    function saveevent(e) {
      if (!e.isTrusted)  // only save the synthetic events
        events.push(e);
    }

    // Return the sequence of events as a string of event types
    function eventseq() {
      return events.map(function(e) { return e.type }).join(' ');
    }

    suiteSetup(function() {
      if (touchDevice) {
        document.addEventListener('touchstart', saveevent, true);
        document.addEventListener('touchmove', saveevent, true);
        document.addEventListener('touchend', saveevent, true);
      }
      document.addEventListener('mousedown', saveevent, true);
      document.addEventListener('mousemove', saveevent, true);
      document.addEventListener('mouseup', saveevent, true);
    });

    suiteTeardown(function() {
      if (touchDevice) {
        document.removeEventListener('touchstart', saveevent, true);
        document.removeEventListener('touchmove', saveevent, true);
        document.removeEventListener('touchend', saveevent, true);
      }
      document.removeEventListener('mousedown', saveevent, true);
      document.removeEventListener('mousemove', saveevent, true);
      document.removeEventListener('mouseup', saveevent, true);
    });

    setup(function() {
      events = [];
      element = document.createElement('div');

      var style = 'position:absolute;left:0px;top:0px;width:400px;height:400px';
      element.setAttribute('style', style);
      document.body.appendChild(element);
    });

    teardown(function() {
      document.body.removeChild(element);
    });

    if (touchDevice) {
      test('tap', function(done) {
        SyntheticGestures.tap(element, function() {
          done(function() {
            assert.equal(eventseq(), 'touchstart touchend');
            assert.equal(events[0].changedTouches[0].clientX, 40);
            assert.equal(events[0].changedTouches[0].clientY, 200);
            assert.equal(events[1].changedTouches[0].clientX, 40);
            assert.equal(events[1].changedTouches[0].clientY, 200);
          });
        }, '10%');
      });

      test('dbltap', function(done) {
        SyntheticGestures.dbltap(element, function() {
          done(function() {
            assert.equal(eventseq(), 'touchstart touchend touchstart touchend');
            assert.equal(events[0].changedTouches[0].clientX, 40);
            assert.equal(events[0].changedTouches[0].clientY, 80);
            assert.equal(events[3].changedTouches[0].clientX, 40);
            assert.equal(events[3].changedTouches[0].clientY, 80);
          });
        }, '10%', '20%');
      });

      test('swipe', function(done) {
        SyntheticGestures.swipe(element, '10%', '10%', '50%', '+10%',
                                100, function() {
          done(function() {
            assert.match(eventseq(), /touchstart (touchmove )+touchend/);

            var firstEvent = events[0];
            var lastEvent = events[events.length - 1];
            assert.equal(firstEvent.changedTouches[0].clientX, 40);
            assert.equal(firstEvent.changedTouches[0].clientY, 40);
            assert.equal(lastEvent.changedTouches[0].clientX, 200);
            assert.equal(lastEvent.changedTouches[0].clientY, 80);
          });
        });
      });

      test('hold', function(done) {
        SyntheticGestures.hold(element, 100, '0%', '10%', '100%', '-1%',
                               100, function() {
          done(function() {
            assert.match(eventseq(), /touchstart (touchmove )+touchend/);

            var firstEvent = events[0];
            var lastEvent = events[events.length - 1];
            assert.equal(firstEvent.changedTouches[0].clientX, 0);
            assert.equal(firstEvent.changedTouches[0].clientY, 40);
            assert.equal(lastEvent.changedTouches[0].clientX, 400);
            assert.equal(lastEvent.changedTouches[0].clientY, 36);
          });
        });
      });

      test('pinch (out)', function(done) {
        SyntheticGestures.pinch(element, '10%', '10%', '20%', '10%', 2,
                                800, function() {
          done(function() {
            var expectedSeq =
              /touchstart touchstart (touchmove )+touchend touchend/;
            assert.match(eventseq(), expectedSeq);

            assert.equal(events[0].touches.length, 1);
            assert.equal(events[1].touches.length, 2);
            assert.equal(events[1].targetTouches.length, 2);
            var e = events[events.length - 3];  // last touchmove event
            var t1 = e.targetTouches[0];
            var t2 = e.targetTouches[1];
            var dx = Math.abs(t1.clientX - t2.clientX);
            assert.equal(dx, 80); // 40px * 2
          });
        });
      });

      test('pinch (in)', function(done) {
        SyntheticGestures.pinch(element, '50%', 100, '0%', 100, .75,
                                800, function() {
          done(function() {
            var expectedSeq =
              /touchstart touchstart (touchmove )+touchend touchend/;
            assert.match(eventseq(), expectedSeq);

            assert.equal(events[0].touches.length, 1);
            assert.equal(events[1].touches.length, 2);
            assert.equal(events[1].targetTouches.length, 2);
            var e = events[events.length - 3];  // last touchmove event
            var t1 = e.targetTouches[0];
            var t2 = e.targetTouches[1];
            var dx = Math.abs(t1.clientX - t2.clientX);
            assert.equal(dx, 150); // 200px * .75
          });
        });
      });
    }

    test('mousetap', function(done) {
      SyntheticGestures.mousetap(element, function() {
        done(function() {
          assert.equal(eventseq(), 'mousedown mouseup');
          assert.equal(events[0].clientX, 200);
          assert.equal(events[0].clientY, 200);
          assert.equal(events[1].clientX, 200);
          assert.equal(events[1].clientY, 200);
        });
      });
    });

    test('mousedbltap', function(done) {
      SyntheticGestures.mousedbltap(element, function() {
        done(function() {
          assert.equal(eventseq(), 'mousedown mouseup mousedown mouseup');
          assert.equal(events[0].clientX, 40);
          assert.equal(events[0].clientY, 80);
          assert.equal(events[3].clientX, 40);
          assert.equal(events[3].clientY, 80);
        });
      }, '10%', '20%');
    });

    test('mouseswipe', function(done) {
      SyntheticGestures.mouseswipe(element, '50%', '50%', '-100', '-10%',
                                   100, function() {
        done(function() {
          assert.match(eventseq(), /mousedown (mousemove )+mouseup/);
          assert.equal(events[0].clientX, 200);
          assert.equal(events[0].clientY, 200);
          assert.equal(events[events.length - 1].clientX, 100);
          assert.equal(events[events.length - 1].clientY, 160);
        });
      });
    });

    test('mousehold', function(done) {
      SyntheticGestures.mousehold(element, 100, '1%', '1', 100, '+1%',
                                  100, function() {
        done(function() {
          assert.match(eventseq(), /mousedown (mousemove )+mouseup/);
          assert.equal(events[0].clientX, 4);
          assert.equal(events[0].clientY, 1);
          assert.equal(events[events.length - 1].clientX, 100);
          assert.equal(events[events.length - 1].clientY, 5);
        });
      });
    });
  });
});

