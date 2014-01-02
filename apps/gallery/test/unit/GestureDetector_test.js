requireCommon('test/synthetic_gestures.js');
require('/shared/js/gesture_detector.js');

suite('GestureDetector', function() {

  var touchDevice = (window.Touch !== undefined);

  suite('API', function() {
    test('public methods and constants', function() {
      assert.typeOf(GestureDetector, 'function');
      var gd = new GestureDetector(document.body);
      assert.typeOf(gd.startDetecting, 'function');
      assert.typeOf(gd.stopDetecting, 'function');
      assert.isNumber(GestureDetector.HOLD_INTERVAL);
      assert.isNumber(GestureDetector.PAN_THRESHOLD);
      assert.isNumber(GestureDetector.MOUSE_PAN_THRESHOLD);
      assert.isNumber(GestureDetector.DOUBLE_TAP_DISTANCE);
      assert.isNumber(GestureDetector.DOUBLE_TAP_TIME);
      assert.isNumber(GestureDetector.VELOCITY_SMOOTHING);
    });
  });

  suite('gesture detection', function() {
    var gd, element, events;

    // Return the sequence of events as a string of event types
    function eventseq() {
      return events.map(function(e) { return e.type }).join(' ');
    }

    setup(function() {
      events = []; // Start a new array of events for each test
      element = document.createElement('div');
      element.setAttribute('style',
                           'position:fixed;left:0px;top:0px;width:100%;height:100%');
      document.body.appendChild(element);

      [
        'tap', 'dbltap',
        'pan', 'swipe',
        'holdstart', 'holdmove', 'holdend',
        'transform', 'transformend'
      ].forEach(function(type) {
        element.addEventListener(type, function(e) { events.push(e); });
      });

      gd = new GestureDetector(element, {holdEvents: true});
      gd.startDetecting();
    });

    teardown(function() {
      gd.stopDetecting();
      document.body.removeChild(element);
    });

    test('tap', function(done) {
      SyntheticGestures.tap(element, function() {
        done(function() {
          assert.length(events, 1);
          assert.equal(events[0].type, 'tap');
          assert.equal(events[0].detail.clientX, 100);
          assert.equal(events[0].detail.clientY, 200);
        });
      }, 100, 200);
    });

    test('mousetap', function(done) {
      SyntheticGestures.mousetap(element, function() {
        done(function() {
          assert.length(events, 1);
          assert.equal(events[0].type, 'tap');
          assert.equal(events[0].detail.clientX, 100);
          assert.equal(events[0].detail.clientY, 200);
        });
      }, 100, 200);
    });

    test('dbltap', function(done) {
      SyntheticGestures.dbltap(element, function() {
        done(function() {
          assert.equal(eventseq(), 'tap tap dbltap');
          assert.equal(events[2].detail.clientX, 100);
          assert.equal(events[2].detail.clientY, 200);
        });
      }, 100, 200);
    });

    test('mousedbltap', function(done) {
      SyntheticGestures.mousedbltap(element, function() {
        done(function() {
          assert.equal(eventseq(), 'tap tap dbltap');
          assert.equal(events[2].detail.clientX, 100);
          assert.equal(events[2].detail.clientY, 200);
        });
      }, 100, 200);
    });

    function between(v, min, max) {
      assert.isTrue(v >= min && v <= max,
                    v + ' is not between ' + min + ' and ' + max);
    }

    var swipes = [
      { name: 'E', x0: 10, y0: 10, x1: 200, y1: 10, direction: 'right' },
      { name: 'W', x0: 200, y0: 10, x1: 10, y1: 10, direction: 'left' },
      { name: 'S', x0: 10, y0: 10, x1: 10, y1: 200, direction: 'down' },
      { name: 'N', x0: 10, y0: 200, x1: 10, y1: 10, direction: 'up' },
      { name: 'NNE', x0: 100, y0: 200, x1: 110, y1: 10, direction: 'up' },
      { name: 'NNW', x0: 100, y0: 200, x1: 90, y1: 10, direction: 'up' },
      { name: 'SSE', x0: 100, y0: 10, x1: 110, y1: 200, direction: 'down' },
      { name: 'SSW', x0: 100, y0: 10, x1: 90, y1: 200, direction: 'down' },
      { name: 'ENE', x0: 10, y0: 100, x1: 200, y1: 90, direction: 'right' },
      { name: 'ESE', x0: 10, y0: 100, x1: 200, y1: 110, direction: 'right' },
      { name: 'WNW', x0: 200, y0: 100, x1: 10, y1: 90, direction: 'left' },
      { name: 'WSW', x0: 200, y0: 100, x1: 10, y1: 110, direction: 'left' }
    ];

/*
// These tests are currently failing and have been temporarily disabled as per
// Bug 838993. They should be fixed and re-enabled as soon as possible as per
// Bug 840493.
    swipes.forEach(function(s) {
      test('swipe ' + s.name, function(done) {
        var startTime = Date.now();
        SyntheticGestures.swipe(element, s.x0, s.y0, s.x1, s.y1,
                                200, checkswipe);
        function checkswipe() {
          done(function() {
            assert.match(eventseq(), /(pan )+swipe/);
            var e = events[events.length - 1];
            assert.equal(e.detail.start.clientX, s.x0);
            assert.equal(e.detail.start.clientY, s.y0);
            assert.equal(e.detail.end.clientX, s.x1);
            assert.equal(e.detail.end.clientY, s.y1);
            assert.equal(e.detail.dx, s.x1 - s.x0);
            assert.equal(e.detail.dy, s.y1 - s.y0);

            assert.equal(e.detail.direction, s.direction);

            var angle = Math.atan2(s.y1 - s.y0, s.x1 - s.x0) * 180 / Math.PI;
            if (angle < 0)
              angle += 360;
            between(e.detail.angle, angle - 1, angle + 1);

            var lastpan = events[events.length - 2];
            assert.equal(lastpan.detail.absolute.dx, s.x1 - s.x0);
            assert.equal(lastpan.detail.absolute.dy, s.y1 - s.y0);
            // Add up the relative deltas for all pans
            var dx = 0, dy = 0;
            events.forEach(function(e) {
              if (e.type === 'pan') {
                dx += e.detail.relative.dx;
                dy += e.detail.relative.dy;
                assert.equal(dx, e.detail.absolute.dx);
                assert.equal(dy, e.detail.absolute.dy);
              }
            });
            assert.equal(dx, s.x1 - s.x0);
            assert.equal(dy, s.y1 - s.y0);
          });
        }
      });
    });

    swipes.forEach(function(s) {
      test.skip('mouseswipe ' + s.name, function(done) {
        SyntheticGestures.mouseswipe(element, s.x0, s.y0, s.x1, s.y1,
                                     200, checkswipe);
        function checkswipe() {
          done(function() {
            assert.match(eventseq(), /(pan )+swipe/);
            var e = events[events.length - 1];
            assert.equal(e.detail.start.clientX, s.x0);
            assert.equal(e.detail.start.clientY, s.y0);
            assert.equal(e.detail.end.clientX, s.x1);
            assert.equal(e.detail.end.clientY, s.y1);
            assert.equal(e.detail.dx, s.x1 - s.x0);
            assert.equal(e.detail.dy, s.y1 - s.y0);

            assert.equal(e.detail.direction, s.direction);

            var angle = Math.atan2(s.y1 - s.y0, s.x1 - s.x0) * 180 / Math.PI;
            if (angle < 0)
              angle += 360;
            between(e.detail.angle, angle - 1, angle + 1);

            var lastpan = events[events.length - 2];
            assert.equal(lastpan.detail.absolute.dx, s.x1 - s.x0);
            assert.equal(lastpan.detail.absolute.dy, s.y1 - s.y0);
            // Add up the relative deltas for all pans
            var dx = 0, dy = 0;
            events.forEach(function(e) {
              if (e.type === 'pan') {
                dx += e.detail.relative.dx;
                dy += e.detail.relative.dy;
                assert.equal(dx, e.detail.absolute.dx);
                assert.equal(dy, e.detail.absolute.dy);
              }
            });
            assert.equal(dx, s.x1 - s.x0);
            assert.equal(dy, s.y1 - s.y0);
          });
        }
      });
    });

*/

/**
 * Insanely flakey too:
    if (touchDevice) {
      var pinches = [
        { x0: 0, y0: 0, x1: 100, y1: 100, scale: 2, duration: 800 },
        { x0: 0, y0: 0, x1: 100, y1: 100, scale: .5, duration: 800 },
        { x0: 100, y0: 100, x1: 10, y1: 10, scale: 1.5, duration: 800 },
        { x0: 200, y0: 200, x1: 10, y1: 10, scale: .75, duration: 800 },
        { x0: 200, y0: 200, x1: 200, y1: 0, scale: 2, duration: 750 },
        { x0: 200, y0: 200, x1: 200, y1: 0, scale: .5, duration: 750 },
        { x0: 200, y0: 200, x1: 0, y1: 200, scale: 3, duration: 750 },
        { x0: 200, y0: 200, x1: 0, y1: 200, scale: .3, duration: 750 }
      ];

      pinches.forEach(function(p, index) {
        var testname = 'Pinch ' + index +
          ': (' + p.x0 + ',' + p.y0 + ')' +
          ' & (' + p.x1 + ',' + p.y1 + ')' +
          ' scale: ' + p.scale;

        test(testname, function(done) {
          SyntheticGestures.pinch(element, p.x0, p.y0, p.x1, p.y1,
                                  p.scale, p.duration, checkpinch);
          function checkpinch() {
            done(function() {
              assert.match(eventseq(), /(transform )+transformend/);
              var e = events[events.length - 1];
              var d = e.detail;

              // We asked for p.scale so synthetic gestures will change
              // the distance d between the two touches to d * p.scale.
              // But we don't actually start detecting the gesture
              // until the touches have moved a bit. So we don't expect
              // to get p.scale back exactly. (XXX: maybe I should fix this
              // in synthetic gestures instead of altering the tests).
              var d0 = Math.sqrt((p.x1 - p.x0) * (p.x1 - p.x0) +
                                 (p.y1 - p.y0) * (p.y1 - p.y0));
              var d1 = d0 * p.scale;
              var adjustment = GestureDetector.SCALE_THRESHOLD *
                GestureDetector.THRESHOLD_SMOOTHING;
              var expected;
              if (d1 > d0)
                expected = d1 / (d0 + adjustment);
              else
                expected = d1 / (d0 - adjustment);

              between(d.absolute.scale, 0.95 * expected, 1.05 * expected);
              assert.equal(d.absolute.rotate, 0);
              assert.equal(d.relative.rotate, 0);

              // compute the product of all the relative scales
              var s = 1.0;
              events.forEach(function(e) { s *= e.detail.relative.scale; });
              between(s, 0.95 * expected, 1.05 * expected);
            });
          }
        });
      });
    }
*/
    // Reuse some of the swipes data for testing hold+move events.
    // The hold tests take about 1.5s each since they require > 1s
    // just to trigger the hold detection. So only do four of each
    swipes.length = 4;

/*
// These tests are currently failing and have been temporarily disabled as per
// Bug 838993. They should be fixed and re-enabled as soon as possible as per
// Bug 840493.
    swipes.forEach(function(s) {
      test('hold ' + s.name, function(done) {
        SyntheticGestures.hold(element, 1250, s.x0, s.y0, s.x1, s.y1,
                               200, checkhold);
        function checkhold() {
          done(function() {
            assert.match(eventseq(), /holdstart (holdmove )*holdend/);

            // Check start details
            var d = events[0].detail;

            assert.equal(d.clientX, s.x0);
            assert.equal(d.clientY, s.y0);

            // Check end details
            d = events[events.length - 1].detail;
            assert.equal(d.start.clientX, s.x0);
            assert.equal(d.start.clientY, s.y0);
            assert.equal(d.end.clientX, s.x1);
            assert.equal(d.end.clientY, s.y1);
            assert.equal(d.dx, s.x1 - s.x0);
            assert.equal(d.dy, s.y1 - s.y0);

            // Check relative vs absolute for all the holdmove events
            var dx = 0, dy = 0;
            events.forEach(function(e) {
              if (e.type === 'holdmove') {
                dx += e.detail.relative.dx;
                dy += e.detail.relative.dy;
                assert.equal(dx, e.detail.absolute.dx);
                assert.equal(dy, e.detail.absolute.dy);
              }
            });
            assert.equal(dx, s.x1 - s.x0);
            assert.equal(dy, s.y1 - s.y0);
          });
        }
      });
    });
*/

    // Reuse the swipes data for testing hold+move events
    swipes.forEach(function(s) {
      test('mousehold ' + s.name, function(done) {
        SyntheticGestures.mousehold(element, 1250, s.x0, s.y0, s.x1, s.y1,
                                    100, checkhold);
        function checkhold() {
          done(function() {
            assert.match(eventseq(), /holdstart (holdmove )*holdend/);

            // Check start details
            var d = events[0].detail;
            assert.equal(d.clientX, s.x0);
            assert.equal(d.clientY, s.y0);

            // Check end details
            var d = events[events.length - 1].detail;
            assert.equal(d.start.clientX, s.x0);
            assert.equal(d.start.clientY, s.y0);
            assert.equal(d.end.clientX, s.x1);
            assert.equal(d.end.clientY, s.y1);
            assert.equal(d.dx, s.x1 - s.x0);
            assert.equal(d.dy, s.y1 - s.y0);

            // Check relative vs absolute for all the holdmove events
            var dx = 0, dy = 0;
            events.forEach(function(e) {
              if (e.type === 'holdmove') {
                dx += e.detail.relative.dx;
                dy += e.detail.relative.dy;
                assert.equal(dx, e.detail.absolute.dx);
                assert.equal(dy, e.detail.absolute.dy);
              }
            });
            assert.equal(dx, s.x1 - s.x0);
            assert.equal(dy, s.y1 - s.y0);
          });
        }
      });
    });
  });
});
