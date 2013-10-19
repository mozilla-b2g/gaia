suite.only('AlarmList debug', function() {
  var AlarmPanel, div;

  suiteSetup(function(done) {
    // Account for potentially-slow file loading operations
    this.timeout(10000);

    testRequire([
        'panels/alarm/main'
      ], {
        mocks: ['alarm_manager', 'alarmsdb', 'banner/main']
      },
      function(alarmPanel) {
        div = document.createElement('div');
        AlarmPanel = alarmPanel;
        document.body.appendChild(div);
        try {
          new AlarmPanel(div);
        } catch(err) {
          throw new Error(err.message);
        }

        // Throwing errors is the only consistent way to print information to the
        // screen during a test run on TravisCI, so throw one here to ensure that
        // the previous statement did indeed throw an error, even if Mocha does not
        // report it.
        throw new Error('Method invocation did not raise an exception.');
        done();
      }
    );
  });

  test('ensure that the suiteSetup is invoked', function() {});
});
