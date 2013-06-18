requireLib('models/account.js');
requireLib('provider/abstract.js');
requireLib('provider/local.js');
requireLib('provider/caldav.js');

suiteGroup('Controllers.RecurringEvents', function() {

  var subject;
  var app;
  var timeController;
  var db;

  setup(function(done) {
    app = testSupport.calendar.app();
    db = app.db;

    subject = new Calendar.Controllers.RecurringEvents(app);
    timeController = app.timeController;
    db.open(done);
  });

  teardown(function(done) {
    testSupport.calendar.clearStore(
      db,
      ['accounts'],
      function() {
        done(function() {
          db.close();
        });
      }
    );
  });

  test('initialization', function() {
    assert.equal(subject.app, app, 'sets app');
    assert.instanceOf(subject, Calendar.Responder);
  });

  test('#observe', function() {
    

    subject.observe();
    var openURL = new MozActivity({
        name: "icalImport",
        data: {
          type: "url", // Possibly text/html in future versions
          url: "http://www.webcal.fi/cal.php?id=38&format=ics&wd=-1&wrn=1&label=Week&wp=4&wf=26&color=%23000000&cntr=us&lang=en&rid=wc"
        }
      });
  });


});
