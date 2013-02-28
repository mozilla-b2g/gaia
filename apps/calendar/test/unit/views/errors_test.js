suiteGroup('Views.Errors', function() {
  var subject, app, errorName;

  setup(function() {
    app = testSupport.calendar.app();
    subject = new Calendar.Views.Errors({
      app: app
    });

    subject.showErrors = function(list) {
      errorName = list[0].name;
    };
  });

  test('offline event', function() {
    subject.app.syncController.emit('offline');
    assert.deepEqual(errorName, 'offline');
  });
});
