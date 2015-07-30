/* global LockScreenClockWidgetSetup */
'use strict';

requireApp('system/lockscreen/js/source/dom_event_source.js');
requireApp('system/lockscreen/js/source/source_event.js');
requireApp('system/lockscreen/js/stream/process.js');
requireApp('system/lockscreen/js/stream/stream.js');
requireApp('system/lockscreen/js/state/lockscreen_basic_state.js');
requireApp(
  'system/lockscreen/js/widgets/clock/lockscreen_clock_widget_setup.js');

suite('LockScreenClockWidgetSetup > ', function() {
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

  test(`when setup it would do the setup things`,
  function() {
    var mockThis = {
      configs: {},
      handleSourceEvent: function() {},
      queryElements: {
        bind: this.sinon.stub().returns('queryElements')
      },
      component: {
        updateClock: {
          bind: this.sinon.stub().returns('component.updateClock')
        },
        updateFormatters: {
          bind: this.sinon.stub().returns('component.updateFormatters')
        }
      },
      transferToTick: {
        bind: this.sinon.stub().returns('transferToTick')
      }
    };
    var method = LockScreenClockWidgetSetup.prototype.start;
    method.call(mockThis);
    assert.include(mockThis.stream.steps, 'queryElements',
        `it doesn't scheudle to query the elements`);
    assert.include(mockThis.stream.steps, 'component.updateClock',
        `it doesn't schedule to update the clock at the setup`);
    assert.include(mockThis.stream.steps, 'component.updateFormatters',
        `it doesn't schedule to update the date/time formatters at the setup`);
    assert.include(mockThis.stream.steps, 'transferToTick',
        `it doesn't schedule to transfer to the tick state after it's done`);
  });

  test(`it would transfer to the tick phase`, function() {
    window.LockScreenClockWidgetTick = {
      name: 'LockScreenClockWidgetTick'
    };
    var mockThis = {
      transferTo: this.sinon.stub()
    };
    var method = LockScreenClockWidgetSetup.prototype.transferToTick;
    method.call(mockThis);
    assert.isTrue(mockThis.transferTo.calledWithMatch(
      sinon.match(function(state) {
        return 'LockScreenClockWidgetTick' === state.name;
      })),
      `it doesn't transfer to the tick state`
    );
  });

  test(`it would query elements as the component requires`, function() {
    var mockThis = {
      component: {
        resources: {
          elements: {
            date: 'date-query',
            time: 'time-query'
      }}}};
    this.sinon.stub(document, 'getElementById').returns('queried');
    var method = LockScreenClockWidgetSetup.prototype.queryElements;
    method.call(mockThis);
    assert.equal('queried', mockThis.component.resources.elements.date,
      `the date query hasn't been queried`);
    assert.equal('queried', mockThis.component.resources.elements.time,
      `the time query hasn't been queried`);
  });
});
