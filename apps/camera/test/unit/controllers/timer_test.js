suite('controllers/timer', function() {
  'use strict';

  suiteSetup(function(done) {
    var self = this;
    req([
      'controllers/timer',
      'views/timer'
    ], function(TimerController, TimerView) {
      self.TimerController = TimerController.TimerController;
      self.TimerView = TimerView;
      done();
    });
  });

  setup(function() {
    this.clock = sinon.useFakeTimers();

    this.app = {
      firer: sinon.stub().returns('firer'),
      on: sinon.spy(),
      get: sinon.stub(),
      el: {},
      settings: {
        timer: {
          selected: sinon.stub()
        }
      },
      views: {
        timer: sinon.createStubInstance(this.TimerView)
      }
    };

    this.timer = this.app.views.timer;
  });

  teardown(function() {
    this.clock.restore();
  });

  suite('TimerController()', function() {
    test('Should relay \'start\' and \'clear\' as app events', function() {
      var controller = new this.TimerController(this.app);
      var timer = this.app.views.timer;
      assert.ok(timer.on.calledWith('start', 'firer'));
      assert.ok(timer.on.calledWith('clear', 'firer'));
    });

    test('Should start the timer when the \'starttimer\' event fires', function() {
      var controller = new this.TimerController(this.app);
      assert.ok(this.app.on.calledWith('capture', controller.onCapture));
    });
  });

  suite('TimerController#onCapture()', function() {
    setup(function() {
      this.controller = new this.TimerController(this.app);
    });

    test('Should not start the timer if no timer is set', function() {
      this.app.settings.timer.selected.returns(0);
      this.controller.onCapture();
      assert.ok(!this.timer.start.called);
    });

    test('Should not start the timer if camera is recording', function() {
      this.app.settings.timer.selected.returns(5);
      this.app.get.withArgs('recording').returns(true);
      this.controller.onCapture();
      assert.ok(!this.timer.start.called);
    });

    test('Should start the timer if one is set and not recording', function() {
      this.app.settings.timer.selected.returns(5);
      this.app.get.withArgs('recording').returns(false);
      this.controller.onCapture();
      assert.ok(this.timer.start.called);
    });

    test('Should return `false` after timer is set to ' +
      'stop event propagation', function() {
      this.app.settings.timer.selected.returns(5);
      this.app.get.withArgs('recording').returns(false);
      var out = this.controller.onCapture();
      assert.ok(out === false);
      assert.ok(this.timer.start.called);
    });
  });

  suite('TimerController#startTimer()', function() {
    setup(function() {
      this.controller = new this.TimerController(this.app);
      this.app.settings.timer.selected.returns(10);
    });

    test('Should set the timer with the setting.timer value and start', function() {
      this.controller.startTimer(10);
      assert.ok(this.timer.set.calledWith(10));
      assert.ok(this.timer.start.called);
    });

    test('Should should setup event listeners (async)', function() {
      var controller = this.controller;
      var timer = this.timer;

      controller.startTimer(10);

      assert.ok(!this.app.on.calledWith('click', timer.clear));
      assert.ok(!timer.on.calledWith('clear', controller.unbindTimerEvents));
      assert.ok(!timer.on.calledWith('end', controller.onTimerEnd));

      this.clock.tick(1);

      assert.ok(this.app.on.calledWith('click', timer.clear));
      assert.ok(timer.on.calledWith('clear', controller.unbindTimerEvents));
      assert.ok(timer.on.calledWith('end', controller.onTimerEnd));
    });

    test('Should clear the timer when the app is minimised', function() {
      var controller = new this.TimerController(this.app);

      controller.startTimer(10);
      this.clock.tick(1);

      assert.ok(this.app.on.calledWith('blur', this.timer.clear));
    });
  });
});
