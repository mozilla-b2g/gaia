requireApp('calendar/test/unit/helper.js', function() {
  requireLib('worker/manager.js');
  requireLib('controllers/service.js');
});

suite('controllers/service', function() {

  var account;
  var calendar;
  var subject;
  var app;

  setup(function() {
    app = testSupport.calendar.app();
    subject = new Calendar.Controllers.Service(app);
  });

  test('initialize', function() {
    assert.instanceOf(
      subject,
      Calendar.Worker.Manager
    );
  });

  test('#start', function() {
    subject.start();

    var workers = Object.keys(subject.workers);
    assert.equal(workers.length, 1);
    var worker = subject.workers[workers[0]];

    assert.ok(subject.roles.caldav, 'should have caldav role');
    assert.instanceOf(worker, Worker);
  });

  test('caldav worker', function(done) {
    subject.start();

    subject.request('caldav', 'noop', function(data) {
      done(function() {
        assert.deepEqual(data, { ready: true });
      });
    });
  });

  teardown(function() {
    var workers = subject.workers;
    var keys = Object.keys(workers);

    keys.forEach(function(key) {
      var worker = workers[key];
      if (worker instanceof Worker) {
        worker.terminate();
      }
    });
  });

});

