'use strict';
requireLib('controllers/notifications.js');

suite('Notifications', function() {
  var subject, fakeApp;

  setup(function() {
    subject = new Calendar.Controllers.Notifications(fakeApp);
    subject.observe();
  });

  teardown(function() {
    subject.unobserve();
  });

  test.skip('should issue notification on alarm', function() {
  });
});
