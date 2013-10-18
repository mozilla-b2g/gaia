suite('AlarmL', function() {
  suiteSetup(function(done) {
    // Account for potentially-slow file loading operations
    this.timeout(10000);

    testRequire([
        'panels/alarm/main',
        'panels/alarm/alarm_list',
        'alarm',
        'mocks/mock_moz_alarm',
        'mocks/mock_navigator_mozl10n'
      ], {
        mocks: ['alarm_manager', 'alarmsdb', 'banner/main']
      },
      function(AlarmPanel, alarmList, alarm, mockMozAlarms, mockL10n) {
        done();
      }
    );
  });

  test('ensure that the suiteSetup is invoked', function() {});
});
