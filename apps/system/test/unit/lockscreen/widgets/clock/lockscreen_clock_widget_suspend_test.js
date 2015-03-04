/* global LockScreenClockWidgetSuspend */
'use strict';

requireApp('system/lockscreen/js/source/dom_event_source.js');
requireApp('system/lockscreen/js/source/source_event.js');
requireApp('system/lockscreen/js/stream/process.js');
requireApp('system/lockscreen/js/stream/stream.js');
requireApp('system/lockscreen/js/state/lockscreen_basic_state.js');
requireApp(
  'system/lockscreen/js/widgets/clock/lockscreen_clock_widget_suspend.js');

suite('LockScreenClockWidgetSuspend > ', function() {
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
        this.steps.push(step);
        return this;
      }
    };
  });

  test(`when start it should do the setup things`,
  function() {
    var mockThis = {
      configs: {},
      handleSourceEvent: function() {}
    };
    this.sinon.stub(window.Stream.prototype.ready, 'bind').returns('ready');
    var method = LockScreenClockWidgetSuspend.prototype.start;
    method.call(mockThis);
    assert.include(mockThis.stream.steps, 'ready',
        `it doesn't schedule to become ready`);
  });

  test(`when stop it should stop things`, function() {
    var mockThis = {
      stream: new window.Stream()
    };
    var stubStop = this.sinon.stub(mockThis.stream, 'stop');
    var method = LockScreenClockWidgetSuspend.prototype.stop;
    method.call(mockThis);
    assert.isTrue(stubStop.called,
      `it doesn't stop the stream`);
  });

  test(`when events it would call the corresponding functions`, function() {
    var mockThis = {
      transferToTick: this.sinon.stub()
    };
    var method = LockScreenClockWidgetSuspend.prototype.handleSourceEvent;

    method.call(mockThis, {'type': 'screenchange',
      'detail': {screenEnabled: true} });
    assert.isTrue(mockThis.transferToTick.called,
      `when 'screenchange' & screenEnabled it doesn't transfer to tick`);
    mockThis.transferToSuspend = this.sinon.stub();
  });

  test(`it would call the component's method to transfer to tick`,
  function() {
    window.LockScreenClockWidgetTick = {
      name: 'LockScreenClockWidgetTick'
    };
    var mockThis = {
      component: {
        transferTo: this.sinon.stub()
      }
    };
    var method = LockScreenClockWidgetSuspend.prototype.transferToTick;
    method.call(mockThis);
    assert.isTrue(mockThis.component.transferTo.calledWithMatch(function(clz) {
      return 'LockScreenClockWidgetTick' === clz.name;
    }));
  });
});
