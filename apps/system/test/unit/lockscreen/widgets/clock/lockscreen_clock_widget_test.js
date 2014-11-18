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
    window.Date = this.sinon.stub().returns('dummy-date');
    navigator.mozL10n = {
      DateTimeFormat: function() {
        return {
          'localeFormat': navigator.mozL10n.dummyLocaleFormat
        };
      },
      dummyLocaleFormat: this.sinon.stub().returns('dummy-locale-format'),
      get: this.sinon.stub().returns('dummy-l10n-string')
    };
    var mockThis = {
      _timeFormat: '%p',
      resources: {
        elements: {
          time: { innerHTML: 'dummy-innerHTML'},
          date: { textContent: 'dummy-textContent' }
      }}
    };
    var method = LockScreenClockWidget.prototype.updateClock;
    method.call(mockThis);
    assert.equal(navigator.mozL10n.dummyLocaleFormat(),
      mockThis.resources.elements.time.innerHTML,
      `it doesn't update the time.innerHTML with the time in locale format`);

    assert.equal(navigator.mozL10n.dummyLocaleFormat(),
      mockThis.resources.elements.date.textContent,
      `it doesn't update the date.textContent with the date in locale format`);
  });
});
