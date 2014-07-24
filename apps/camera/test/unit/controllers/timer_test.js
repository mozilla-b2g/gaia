suite('controllers/timer', function() {
  'use strict';

  suiteSetup(function(done) {
    var self = this;
    requirejs([
      'controllers/timer',
      'views/timer',
      'lib/setting',
      'app'
    ], function(TimerController, TimerView, Setting, App) {
      self.TimerController = TimerController.TimerController;
      self.TimerView = TimerView;
      self.Setting = Setting;
      self.App = App;
      done();
    });
  });

  setup(function() {
    this.clock = sinon.useFakeTimers();

    sinon.spy(window, 'setInterval');
    sinon.spy(window, 'clearInterval');

    this.app = sinon.createStubInstance(this.App);
    this.app.el = {};
    this.app.settings = {
      timer: sinon.createStubInstance(this.Setting)
    };
    this.app.views = {
      timer: sinon.createStubInstance(this.TimerView)
    };

    // Aliases
    this.view = this.app.views.timer;

    this.view.set.returns(this.view);
    this.app.settings.timer.selected.returns(5);

    this.controller = new this.TimerController(this.app);
  });

  teardown(function() {
    window.setInterval.restore();
    window.clearInterval.restore();
    this.clock.restore();
  });

  suite('TimerController()', function() {
    test('Should append the TimerView to the app', function() {
      var controller = new this.TimerController(this.app);
      assert.ok(this.view.appendTo.calledWith(this.app.el));
    });

    test('Should start the timer when the \'startcountdown\' event fires', function() {
      var controller = new this.TimerController(this.app);
      assert.ok(this.app.on.calledWith('startcountdown', controller.start));
    });

    test('Should stop the timer when the app \'blur\' event fires', function() {
      var controller = new this.TimerController(this.app);
      assert.ok(this.app.on.calledWith('hidden', controller.clear));
    });
  });

  suite('TimerController#start()', function() {
    setup(function() {
      this.controller.start();
    });

    test('Should bind events async so as not to respond to current event', function() {
      assert.ok(!this.app.on.calledWith('click', this.controller.clear));
      this.clock.tick(1);
      assert.ok(this.app.on.calledWith('click', this.controller.clear));
    });

    test('Should set the view with the current value of the timer setting', function() {
      assert.ok(this.controller.view.set.calledWith(5));
    });

    test('Should set the app \'timerActive\' property to true', function() {
      assert.ok(this.app.set.calledWith('timerActive', true));
    });

    test('Should emit \'timer:stated\' event on app', function() {
      assert.ok(this.app.emit.calledWith('timer:started'));
    });

    test('Should decrement time each second and emit ' +
      'an \'end\' event when time is up', function() {
      this.clock.tick(1000);
      assert.ok(this.view.set.calledWith(4));

      this.clock.tick(1000);
      assert.ok(this.view.set.calledWith(4));

      this.clock.tick(1000);
      assert.ok(this.view.set.calledWith(4));

      this.clock.tick(1000);
      assert.ok(this.view.set.calledWith(4));

      this.clock.tick(1000);
      assert.ok(this.app.emit.calledWith('timer:ended'));
    });

    test('Should not update the view after time is up', function() {
      this.clock.tick(5000);
      assert.ok(this.view.set.callCount === 5, 'should be 5, was: ' + this.view.set.callCount);
      this.clock.tick(1000);
      assert.ok(this.view.set.callCount === 5, 'should not have been called any more');
    });

    test('Should set the timerActive flag back to false', function() {
      assert.ok(this.app.set.calledWith('timerActive', true));
      this.clock.tick(5000);
      assert.ok(this.app.set.calledWith('timerActive', false));
    });

    test('Should hide the view once time is up', function() {
      this.clock.tick(5000);
      assert.ok(this.view.hide.called);
    });

    test('Should not emit a \'clear\' event', function() {
      this.clock.tick(5000);
      assert.ok(!this.app.emit.calledWith('timer:cleared'));
    });

    test('Should never be able to fall into negative numbers', function() {
      this.controller.seconds = 0;
      this.view.set.reset();

      this.clock.tick(1000);

      //
      assert.isFalse(this.view.set.calledWith(-1));
    });

    test('Should not able to start a timer if one is already active', function() {
      this.app.emit.reset();
      this.app.get.withArgs('timerActive').returns(true);
      this.controller.start();
      assert.isFalse(this.app.emit.calledWith('timer:started'));
    });
  });

  suite('TimerController#clear()', function() {
    setup(function() {
      this.controller.start();
      this.controller.clear();
    });

    test('Should hide the view', function() {
      assert.ok(this.view.hide.called);
    });

    test('Should emit a \'timer:cleared\' event', function() {
      assert.ok(this.app.emit.calledWith('timer:cleared'));
    });

    test('Should set the \'timerActive\' flag back to false', function() {
      assert.ok(this.app.set.calledWith('timerActive', false));
    });

    test('Should unbind the app listeners', function() {
      assert.ok(this.app.off.calledWith('click', this.controller.clear));
    });
  });
});
