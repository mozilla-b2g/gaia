'use strict';
requireLib('controllers/periodic_sync.js');

suite('PeriodicSync', function() {
  var subject, fakeApp;

  setup(function() {
    subject = new Calendar.Controllers.PeriodicSync(fakeApp);
    subject.observe();
  });

  teardown(function() {
    subject.unobserve();
  });

  test.skip('should schedule mozAlarm', function() {
  });

  test.skip('should persist alarm to settings store', function() {
  });

  test.skip('should respond to syncFrequencyChange', function() {
  });
});
