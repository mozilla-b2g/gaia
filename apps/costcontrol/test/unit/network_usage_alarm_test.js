'use strict';
/* global NetworkUsageAlarm, MockAllNetworkInterfaces, MockMozNetworkStats */

requireApp('costcontrol/js/settings/networkUsageAlarm.js');
requireApp('costcontrol/test/unit/mock_moz_network_stats.js');
requireApp('costcontrol/test/unit/mock_all_network_interfaces.js');

var realMozNetworkStats;

if (!window.navigator.mozNetworkStats) {
  window.navigator.mozNetworkStats = null;
}

suite('Network usage alarms  Test Suite  >', function() {

  var fakeAllInterfaces;

  suiteSetup(function() {

    realMozNetworkStats = window.navigator.mozNetworkStats;
    navigator.mozNetworkStats = MockMozNetworkStats;

    fakeAllInterfaces = MockAllNetworkInterfaces;
  });

  suiteTeardown(function() {
    window.navigator.mozNetworkStats = realMozNetworkStats;
  });

  test(
    'Clear Alarms - Test arguments validation',
    function() {
      var consoleSpy = this.sinon.spy(console, 'error');

      NetworkUsageAlarm.clearAlarms(null);
      assert.ok(consoleSpy.calledOnce);
      assert.ok(consoleSpy.calledWith('Error, the network interface is not ' +
                                      'defined when trying to remove alarms'));
      consoleSpy.restore();
    }
  );

  test(
    'Clear Alarms - clear works correctly without errors',
    function(done) {
      var removeAlarmsSpy = this.sinon.spy(window.navigator.mozNetworkStats,
                                                                'removeAlarms');

      NetworkUsageAlarm.clearAlarms(fakeAllInterfaces[1], function () {
        assert.ok(removeAlarmsSpy.calledOnce);

        removeAlarmsSpy.restore();
        done();
      });
    }
  );

  test(
    'Clear Alarms - clear works correctly with errors',
    function(done) {
      var removeAlarmsSpy = this.sinon.spy(window.navigator.mozNetworkStats,
                                                                'removeAlarms');
      var consoleSpy = this.sinon.spy(console, 'error');

      NetworkUsageAlarm.clearAlarms(fakeAllInterfaces[2], function () {
        assert.ok(removeAlarmsSpy.calledOnce);
        assert.ok(consoleSpy.calledOnce);
        assert.ok(consoleSpy.calledWith('Error when trying to remove one ' +
                                        'alarm.'));
        consoleSpy.restore();
        removeAlarmsSpy.restore();
        done();
      });
    }
  );

  test(
    'Update Alarms - Test arguments validation',
    function() {
      var consoleSpy = this.sinon.spy(console, 'error');

      NetworkUsageAlarm.updateAlarm(null, 24);
      assert.ok(consoleSpy.calledOnce);
      assert.ok(consoleSpy.calledWith('Error, the network interface is not ' +
                                     'defined when trying to update an alarm'));

      NetworkUsageAlarm.updateAlarm(fakeAllInterfaces[1], null);
      assert.ok(consoleSpy.calledTwice);
      assert.ok(consoleSpy.calledWith('Error, the data limit value is not ' +
                                     'defined when trying to update an alarm'));
      consoleSpy.restore();
    }
  );

  test(
    'Update Alarms - normal behaviour test',
    function(done) {
      var removeAlarmsSpy = this.sinon.spy(window.navigator.mozNetworkStats,
                                                                'removeAlarms');
      var addAlarmSpy = this.sinon.spy(window.navigator.mozNetworkStats,
                                                                    'addAlarm');

      NetworkUsageAlarm.updateAlarm(fakeAllInterfaces[1], 1972, function _ok() {
        assert.ok(removeAlarmsSpy.calledOnce);
        assert.ok(addAlarmSpy.calledOnce);
        assert.ok(addAlarmSpy.calledWith(fakeAllInterfaces[1], 1972));

        addAlarmSpy.restore();
        removeAlarmsSpy.restore();
        done();
      });
    }
  );

  test(
    'Update Alarms - test behaviour when fails add alarm',
    function(done) {
      var consoleSpy = this.sinon.spy(console, 'error');
      var removeAlarmsSpy = this.sinon.spy(window.navigator.mozNetworkStats,
                                                                'removeAlarms');
      var addAlarmSpy = this.sinon.spy(window.navigator.mozNetworkStats,
                                                                    'addAlarm');

      NetworkUsageAlarm.updateAlarm(fakeAllInterfaces[3], 1972, null,
                                                            function _error() {
        assert.ok(removeAlarmsSpy.calledOnce);
        assert.ok(addAlarmSpy.calledOnce);
        assert.ok(addAlarmSpy.calledWith(fakeAllInterfaces[3], 1972));
        assert.ok(consoleSpy.calledOnce);
        assert.ok(consoleSpy.calledWith('Error, when trying to addAlarm to ' +
           'the interfaceId: ' + fakeAllInterfaces[3].id + ' and limit: 1972'));

        addAlarmSpy.restore();
        removeAlarmsSpy.restore();
        consoleSpy.restore();
        done();
      });
    }
  );
});
