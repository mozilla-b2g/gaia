requireApp('gallery/test/SyntheticGestures.js');
requireApp('gallery/js/GestureDetector.js');

suite('GestureDetector', function() {

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
    })
  });

  suite('gesture detection', function() {
    var gd, element, events;

    // Return the sequence of events as a string of event types
    function eventseq() {
      return events.map(function(e) { return e.type }).join(" ");
    }

    setup(function() {
      events = []; // Start a new array of events for each test
      element = document.createElement('div');
      element.setAttribute('style',
                           'position:absolute;left:0px;top:0px;width:100%;height:100%');
      document.body.appendChild(element);

      [
        'tap','dbltap',
        'pan','swipe',
        'holdstart','holdmove','holdend',
        'transform'
      ].forEach(function(type) {
        element.addEventListener(type, function(e) { events.push(e); });
      });

      gd = new GestureDetector(element, {moveEvents: true});
      gd.startDetecting();
    });

    teardown(function() {
      gd.stopDetecting();
      document.body.removeChild(element);
    });

    test('tap', function(done) {
      SyntheticGestures.tap(element, function() {
        assert.length(events, 1);
        assert.equal(events[0].type, 'tap');
        assert.equal(events[0].detail.clientX, 100);
        assert.equal(events[0].detail.clientY, 200);
        done();
      }, 100, 200);
    });

    test('mousetap', function(done) {
      SyntheticGestures.mousetap(element, function() {
        assert.length(events, 1);
        assert.equal(events[0].type, 'tap');
        assert.equal(events[0].detail.clientX, 100);
        assert.equal(events[0].detail.clientY, 200);
        done();
      }, 100, 200);
    });

    test('dbltap', function(done) {
      SyntheticGestures.dbltap(element, function() {
        // XXX: Weird: I'm getting tap dbltap tap instead
        // this means that the initial state, from the mousetap test above
        // is interfering!  Do I change stopDetecting() to reset the state
        // completely?  Or do I change the setup and teardown methods?
        assert.equal(eventseq(), "tap tap dbltap");
        assert.equal(events[2].detail.clientX, 100);
        assert.equal(events[2].detail.clientY, 200);
        done();
      }, 100, 200);
    });


  });



});
