/* global LockScreenClockWidget */
'use strict';

requireApp('system/lockscreen/js/component/lockscreen_basic_component.js');
requireApp(
  'system/lockscreen/js/widgets/clock/lockscreen_clock_widget.js');

suite('LockScreenClockWidget > ', function() {
  setup(function() {
    window.LockScreenClockWidgetSetup = this.sinon.stub();
  });

  test(`when setup it would kick off the state machine`,
  function() {
    var method = LockScreenClockWidget.prototype.setup;
    method.call({});
    assert.isTrue(window.LockScreenClockWidgetSetup.called,
      `it doesn't kick off the state machine`);
  });

  test(`it would update the clock`, function() {
    var mockThis = {
      logger: {
        debug: function() {}
      },
      timeFormatter: new Intl.DateTimeFormat('en-US', {
        hour12: false,
        hour: 'numeric',
        minute: 'numeric'
      }),
      dateFormatter: new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric'
      }),
      resources: {
        elements: {
          time: { textContent: 'dummy-textContent'},
          date: { textContent: 'dummy-textContent' }
      }}
    };
    var method = LockScreenClockWidget.prototype.updateClock;
    var now = new Date();
    method.call(mockThis);
    assert.equal(mockThis.timeFormatter.format(now),
      mockThis.resources.elements.time.textContent,
      `it doesn't update the time.textContent with the time in locale format`);
    assert.equal(mockThis.dateFormatter.format(now),
      mockThis.resources.elements.date.textContent,
      `it doesn't update the date.textContent with the date in locale format`);
  });
});
