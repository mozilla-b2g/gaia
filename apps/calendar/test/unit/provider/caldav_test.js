requireApp('calendar/test/unit/helper.js', function() {
  requireLib('provider/abstract.js');
  requireLib('provider/caldav.js');
});

suite('provider/caldav', function() {

  var subject;
  var app;
  var controller;

  setup(function() {
    app = testSupport.calendar.app();
    controller = app.serviceController;

    subject = new Calendar.Provider.Caldav({
      app: app
    });
  });

  test('initialization', function() {
    assert.instanceOf(
      subject,
      Calendar.Provider.Abstract
    );

    assert.equal(
      subject.service,
      app.serviceController
    );
  });

  test('capabilites', function() {
    assert.isTrue(subject.useUrl);
    assert.isTrue(subject.useCredentials);
  });

  suite('methods that wrap request', function() {
    var calledWith;
    var error;
    var result;
    var input = { user: 'foo' };

    setup(function() {
      controller.request = function() {
        calledWith = arguments;
        var cb = arguments[arguments.length - 1];
        setTimeout(function() {
          cb(error, result);
        }, 0);
      };
    });

    suite('#getAccount', function() {
      test('success', function(done) {
        result = { id: 'wow' };

        subject.getAccount(input, function cb(cbError, cbResult) {
          done(function() {
            assert.deepEqual(calledWith, [
              'caldav', 'getAccount', input, cb
            ]);
            assert.equal(cbResult, result);
            assert.equal(cbError, error);
          });
        });
      });
    });

    suite('#findCalendars', function() {
      test('success', function(done) {
        result = [{ id: 'wow' }];

        subject.findCalendars(input, function cb(cbError, cbResult) {
          done(function() {
            assert.deepEqual(calledWith, [
              'caldav', 'findCalendars', input, cb
            ]);
            assert.equal(cbResult, result);
            assert.equal(cbError, error);
          });
        });
      });
    });

  });

});

