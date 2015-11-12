/* global LockScreenClockWidget */
'use strict';

requireApp('system/lockscreen/js/component/lockscreen_basic_component.js');
requireApp(
  'system/lockscreen/js/widgets/clock/lockscreen_clock_widget.js');

suite('LockScreenClockWidget > ', function() {
  var domAlarm;
  setup(function() {
    window.LockScreenClockWidgetSetup = this.sinon.stub();
    domAlarm = document.createElement('div');
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
        month: 'long',
        day: 'numeric'
      }),
      resources: {
        elements: {
          time: { firstChild: { data: 'dummy-data' }},
          date: { firstChild: { data: 'dummy-data' }}
      }}
    };
    var method = LockScreenClockWidget.prototype.updateClock;
    var now = new Date();
    method.call(mockThis);
    assert.equal(mockThis.timeFormatter.format(now),
      mockThis.resources.elements.time.firstChild.data,
      `it doesn't update the time.textContent with the time in locale format`);
    assert.equal(mockThis.dateFormatter.format(now),
      mockThis.resources.elements.date.firstChild.data,
      `it doesn't update the date.textContent with the date in locale format`);
  });

  test(`it would update the alarm info (an alarm is set)`, function(done) {
    var mockThis = {
      resources: {
        elements: {
          alarm: domAlarm,
          alarmtime: { textContent: 'dummy-textContent' },
        }
      },
      fetchAlarmData: function() {
        return new Promise( function(resolve,reject){
          resolve({hour: '20', minute: '15'});
        });
      }
    };
    var method = LockScreenClockWidget.prototype.updateAlarm;
    method.call(mockThis);
    assert.isFulfilled(mockThis.fetchAlarmData());
    mockThis.fetchAlarmData().then( function() {
      assert.equal(mockThis.resources.elements.alarmtime.textContent, '8:15PM');
      assert.propertyVal( mockThis.resources.elements.alarm.classList,
        '0', 'has-alarm');
    })
    .then(done)
    .catch(done);
  });

  test(`it would update the alarm info (an alarm is not set)`, function(done) {
    var mockThis = {
      resources: {
        elements: {
          alarm: domAlarm,
          alarmtime: { textContent: 'dummy-textContent' },
        }
      },
      fetchAlarmData: function() {
        return new Promise( function(resolve,reject){
          resolve(null);
        });
      }
    };
    var method = LockScreenClockWidget.prototype.updateAlarm;
    method.call(mockThis);
    assert.isFulfilled(mockThis.fetchAlarmData());
    mockThis.fetchAlarmData().then( function() {
      assert.propertyVal( mockThis.resources.elements.alarm.classList,
        '0', 'no-alarms');
    })
    .then(done)
    .catch(done);
  });
});
