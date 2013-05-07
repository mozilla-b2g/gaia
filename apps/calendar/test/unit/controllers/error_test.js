requireLib('controllers/error.js');
requireLib('models/account.js');

suite('controllers/error', function() {

  /**
   * Because of uplifting difficulties I chose to copy/paste
   * the following code rather then attempt to uplift related testing fixes...
   * I may later live to regret this but given the short time we have until
   * shipping v1.0.1 I have chosen to copy/paste.
   */
  function mockRequestWakeLock(handler) {
    var realApi;

    function lockMock() {
      return {
        mAquired: false,
        mIsUnlocked: false,
        unlock: function() {
          this.mIsUnlocked = true;
        }
      };
    }

    suiteSetup(function() {
      realApi = navigator.requestWakeLock;

      navigator.requestWakeLock = function(type) {
        var lock = lockMock();
        lock.type = type;
        lock.mAquired = true;

        handler && handler(lock);

        return lock;
      };
    });

    suiteTeardown(function() {
      navigator.requestWakeLock = realApi;
    });
  }

  var app;
  var subject;
  var detail;

  setup(function(done) {
    app = testSupport.calendar.app();
    subject = new Calendar.Controllers.Error(
      app
    );

    app.db.open(done);
    detail = {
      account: Factory('account')
    };
  });

  teardown(function(done) {
    testSupport.calendar.clearStore(
      app.db,
      ['accounts'],
      function() {
        app.db.close();
        done();
      }
    );
  });

  test('initialization', function() {
    assert.equal(subject.app, app);
    assert.instanceOf(subject, Calendar.Responder);
  });

  suite('default handling', function() {

    test('authenticate', function(done) {
      var callsAuth = false;
      var error = new Calendar.Error.Authentication(detail);

      subject.handleAuthenticate = function(account) {
        assert.equal(account, detail.account, 'sends account');
        callsAuth = true;
      };

      subject.once('error', function(givenErr) {
        done(function() {
          assert.ok(callsAuth);
          assert.equal(error, givenErr, 'sends error');
        });
      });

      subject.dispatch(error);
    });
  });

  suite('#handleAuthenticate', function() {
    test('normal flow', function() {
    });
  });

});
