suite.only('AlarmList debug', function() {
  var AlarmList;

  suiteSetup(function(done) {
    // Account for potentially-slow file loading operations
    this.timeout(10000);

    testRequire([
        'panels/alarm/main'
      ], {
        mocks: ['alarm_manager', 'alarmsdb', 'banner/main']
      },
      function(AlarmPanel) {
        var div = document.createElement('div');
        document.body.appendChild(div);
        new AlarmPanel(div);
        done();
      }
    );
  });

  test('ensure that the suiteSetup is invoked', function() {});
});
