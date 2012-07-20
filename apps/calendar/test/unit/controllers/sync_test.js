requireApp('calendar/test/unit/helper.js', function() {
  requireLib('controllers/sync.js');
});

suite('controllers/sync', function() {

  var account;
  var calendar;
  var subject;
  var app;

  setup(function() {
    app = testSupport.calendar.app();
    subject = new Calendar.Controllers.Sync(app);

    calendar = app.store('Calendar');
    account = app.store('Account');

    subject.observe();
  });

  test('#_syncAccount', function() {
    var calledWith;
    var model = {};
    var id = 1;

    account.sync = function(given, cb) {
      calledWith = arguments;
    };

    account.emit('add', id, model);
    assert.equal(calledWith[0], model);
  });

});
