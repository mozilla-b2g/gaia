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

  var allInterfacesFake;

  suiteSetup(function() {

    realMozNetworkStats = window.navigator.mozNetworkStats;
    navigator.mozNetworkStats = MockMozNetworkStats;

    allInterfacesFake = MockAllNetworkInterfaces;
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
      var consoleSpy = this.sinon.spy(console, 'error');

      NetworkUsageAlarm.clearAlarms(allInterfacesFake[1], function () {
        assert.ok(removeAlarmsSpy.calledOnce);
        assert.equal(consoleSpy.callCount, 0);
        consoleSpy.restore();
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

      NetworkUsageAlarm.clearAlarms(allInterfacesFake[2], function () {
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

      NetworkUsageAlarm.updateAlarm(allInterfacesFake[1], null);
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
      var limitValue = 1972;
      NetworkUsageAlarm.updateAlarm(allInterfacesFake[1], limitValue,
                                    function _ok() {
        assert.ok(removeAlarmsSpy.calledOnce);
        assert.ok(addAlarmSpy.calledOnce);
        assert.ok(addAlarmSpy.calledWith(allInterfacesFake[1], limitValue));

        addAlarmSpy.restore();
        removeAlarmsSpy.restore();
        done();
      },
      function _error() {
        var consoleSpy = this.sinon.spy(console, 'error');
        assert.equal(consoleSpy.callCount, 0);
        consoleSpy.restore();
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
      var limitValue = 1972;
      NetworkUsageAlarm.updateAlarm(allInterfacesFake[3], limitValue, null,
        function _error() {
          assert.ok(removeAlarmsSpy.calledOnce);
          assert.ok(addAlarmSpy.calledOnce);
          assert.ok(addAlarmSpy.calledWith(allInterfacesFake[3], limitValue));
          assert.ok(consoleSpy.calledOnce);
          assert.ok(consoleSpy.calledWith('Error, when trying to addAlarm to ' +
            'the interfaceId: ' + allInterfacesFake[3].id + ' and limit: ' +
            limitValue));

          addAlarmSpy.restore();
          removeAlarmsSpy.restore();
          consoleSpy.restore();
          done();
        });
    }
  );
});
