/* global LockScreenClockWidgetTick */
'use strict';

requireApp('system/lockscreen/js/source/dom_event_source.js');
requireApp('system/lockscreen/js/source/source_event.js');
requireApp('system/lockscreen/js/stream/process.js');
requireApp('system/lockscreen/js/stream/stream.js');
requireApp('system/lockscreen/js/state/lockscreen_basic_state.js');
requireApp(
  'system/lockscreen/js/widgets/clock/lockscreen_clock_widget_tick.js');

suite('LockScreenClockWidgetTick > ', function() {
  setup(function() {
    window.Stream = function() {
      this.steps = [];
    };
    window.Stream.prototype = {
      start: function() { return this; },
      ready: function() { return this; },
      stop: function() { return this; },
      destroy: function() { return this; },
      next: function(step) {
        if ('function' === typeof step) {
          this.steps.push(step());
        } else {
          this.steps.push(step);
        }
        return this;
      }
    };
  });

  test(`when start it should do the setup things`,
  function() {
    var mockThis = {
      configs: {},
      handleSourceEvent: function() {},
      component: {
        updateClock: {
          bind: this.sinon.stub().returns('component.updateClock')
        },
        updateFormatters: {
          bind: this.sinon.stub().returns('component.updateFormatters')
        },
        getTimeformat: function() {
          mockThis.stream.steps.push('component.getTimeformat');
        }
      }
    };
    this.sinon.stub(window.Stream.prototype.ready, 'bind').returns('ready');
    var method = LockScreenClockWidgetTick.prototype.start;
    method.call(mockThis);
    assert.include(mockThis.stream.steps, 'component.updateFormatters',
        `it doesn't check out the timeformat`);
    assert.include(mockThis.stream.steps, 'component.updateClock',
        `it doesn't schedule to update the clock`);
    assert.include(mockThis.stream.steps, 'ready',
        `it doesn't schedule to become ready`);
  });

  test(`when stop it should stop things`, function() {
    var mockThis = {
      stream: new window.Stream(),
      _minuteSource: {
        stop: {
          bind: this.sinon.stub().returns(`bound stop called`)
      }}
    };
    this.sinon.stub(mockThis.stream, 'stop').returns({
      next: function(cb) {
        assert.equal(cb, `bound stop called`,
          `it doesn't stop the source when the state is stopping`);
      }
    });
    var method = LockScreenClockWidgetTick.prototype.stop;
    method.call(mockThis);
  });

  test(`when events it would call the corresponding functions`, function() {
    var mockThis = {
      component: {
        updateClock: this.sinon.stub(),
        updateFormatters: this.sinon.stub(),
      },
      transferToSuspend: this.sinon.stub()
    };
    var method = LockScreenClockWidgetTick.prototype.handleSourceEvent;

    method.call(mockThis, {'type': 'ftudone'});
    assert.isTrue(mockThis.component.updateClock.called,
      `when 'ftudone' it doesn't update the clock`);
    mockThis.component.updateClock = this.sinon.stub();

    method.call(mockThis, {'type': 'moztimechange'});
    assert.isTrue(mockThis.component.updateClock.called,
      `when 'moztimechange' it doesn't update the clock`);
    mockThis.component.updateClock = this.sinon.stub();

    method.call(mockThis, {'type': 'lockscreen-notification-clock-tick'});
    assert.isTrue(mockThis.component.updateClock.called,
      `when 'lockscreen-notification-clock-tick' it doesn't update the clock`);
    mockThis.component.updateClock = this.sinon.stub();

    method.call(mockThis, {'type': 'screenchange',
      'detail': {screenEnabled: false} });
    assert.isTrue(mockThis.transferToSuspend.called,
      `when 'screenchange' & not screenEnabled it doesn't transfer to suspend`);
    mockThis.transferToSuspend = this.sinon.stub();

    method.call(mockThis, {'type': 'screenchange',
      'detail': {screenEnabled: true} });
    assert.isFalse(mockThis.transferToSuspend.called,
      `when 'screenchange' & screenEnabled it still transfer to suspend`);
    mockThis.transferToSuspend = this.sinon.stub();
  });

  test(`it would call the component's method to transfer to suspend`,
  function() {
    window.LockScreenClockWidgetSuspend = {
      name: 'LockScreenClockWidgetSuspend'
    };
    var mockThis = {
      component: {
        transferTo: this.sinon.stub()
      }
    };
    var method = LockScreenClockWidgetTick.prototype.transferToSuspend;
    method.call(mockThis);
    assert.isTrue(mockThis.component.transferTo.calledWithMatch(function(clz) {
      return 'LockScreenClockWidgetSuspend' === clz.name;
    }));
  });
});
