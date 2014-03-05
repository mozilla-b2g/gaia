suite('views/timer', function() {
  'use strict';

  suiteSetup(function(done) {
    var self = this;
    req(['views/timer'], function(TimerView) {
      self.TimerView = TimerView;
      done();
    });
  });

  setup(function() {
    this.clock = sinon.useFakeTimers();

    sinon.spy(window, 'setInterval');
    sinon.spy(window, 'clearInterval');

    this.timer = new this.TimerView();
    this.timer.emit = sinon.spy();
  });

  teardown(function() {
    window.setInterval.restore();
    window.clearInterval.restore();
    this.clock.restore();
  });

  suite('TimerView#set()', function() {
    test('Should update the text content of the counter', function() {
      this.timer.set(1000);
      assert.ok(this.timer.el.innerHTML.indexOf(1000) > -1);
    });

    test('Should add the \'near\' class if within the \'near\' threshold', function() {
      var classes = this.timer.el.classList;
      this.timer.set(5);
      assert.ok(!classes.contains('near'));
      this.timer.set(4);
      assert.ok(!classes.contains('near'));
      this.timer.set(3);
      assert.ok(classes.contains('near'));
      this.timer.set(2);
      assert.ok(classes.contains('near'));
      this.timer.set(1);
      assert.ok(classes.contains('near'));
    });

    test('Should set the `time` property', function() {
      this.timer.set(10);
      assert.ok(this.timer.time === 10);
    });
  });

  suite('TimerView#start()', function() {
    test('Should only start if there is time remaining', function() {
      this.timer.start();
      assert.ok(!this.timer.active);
    });

    test('Should only start if not currently `active`', function() {
      this.timer.set(10);
      this.timer.start();
      this.timer.emit.reset();
      this.timer.start();

      assert.ok(!this.timer.emit.called);
    });

    test('Should make the timer visible', function() {
      this.timer.set(10);
      this.timer.start();

      assert.ok(this.timer.el.classList.contains('visible'));
    });

    test('Should emit a \'start\' event', function() {
      this.timer.set(10);
      this.timer.start();
      assert.ok(this.timer.emit.calledWith('start'));
    });

    test('Should start a 1sec interval', function() {
      var decrement = this.timer.decrement;

      this.timer.set(10);
      this.timer.start();

      assert.ok(setInterval.calledWith(decrement, 1000));
    });

    test('Should decrement time each second and emit ' +
      'an \'end\' event when time is up', function() {
      this.timer.set(5);
      this.timer.start();

      this.clock.tick(1000);
      assert.ok(this.timer.time === 4);

      this.clock.tick(1000);
      assert.ok(this.timer.time === 3);

      this.clock.tick(1000);
      assert.ok(this.timer.time === 2);

      this.clock.tick(1000);
      assert.ok(this.timer.time === 1);
      assert.ok(this.timer.time === 1);

      this.clock.tick(1000);
      assert.ok(this.timer.emit.calledWith('end'));

      // All reset
      assert.ok(this.timer.time === 0);
      assert.ok(this.timer.active === false);
      assert.ok(clearInterval.called);
    });
  });

  suite('TimerView#clear()', function() {
    test('Should hide the timer', function() {
      var classes = this.timer.el.classList;
      this.timer.set(10);
      this.timer.start();
      assert.ok(classes.contains('visible'));
      this.timer.clear();
      assert.ok(!classes.contains('visible'));
    });

    test('Should emit a \'clear\' event', function() {
      this.timer.set(10);
      this.timer.start();
      this.timer.clear();
      assert.ok(this.timer.emit.calledWith('clear'));
    });

    test('Should clear the interval', function() {
      this.timer.set(10);
      this.timer.start();
      this.timer.clear();

      assert.ok(clearInterval.called);
    });

    test('Should set time to 0', function() {
      var clearInterval = this.timer.clearInterval;
      var decrement = this.timer.decrement;

      this.timer.set(10);

      this.timer.start();
      assert.ok(this.timer.time === 10);

      this.timer.clear();
      assert.ok(this.timer.time === 0);
    });
  });
});
