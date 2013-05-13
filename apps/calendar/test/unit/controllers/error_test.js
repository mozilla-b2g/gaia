requireLib('controllers/error.js');
requireLib('models/account.js');
requireLib('notification.js');

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

  test('.accountErrorUrl', function() {
    assert.ok(subject.accountErrorUrl);
  });

  suite('#handleAuthenticate', function() {
    var sent;
    var account;
    var onNotificationSent;
    var lock;

    mockRequestWakeLock(function(_lock) {
      lock = _lock;
    });

    var realSendApi;
    suiteSetup(function() {
      realSendApi = Calendar.Notification.send;
      Calendar.Notification.send = function() {
        sent = Array.slice(arguments);
        var cb = sent[sent.length - 1];
        Calendar.nextTick(cb);
      };
    });

    suiteTeardown(function() {
      Calendar.Notification.send = realSendApi;
    });

    setup(function() {
      sent = null;
      lock = null;
      account = Factory('account', { _id: 'woot' });
    });

    test('with count 1', function(done) {
      var expectedURL = subject.accountErrorUrl + account._id;
      account.error = { count: 1 };
      subject.handleAuthenticate(account, function() {
        Calendar.nextTick(function() {
          done(function() {
            assert.ok(lock.mIsUnlocked, 'unlocks');
            assert.ok(sent, 'sends notification');
            assert.equal(sent[2], expectedURL, 'sends to modify account');
          });
        });
      });
      assert.ok(lock, 'aquires lock');
    });

    test('with count 2', function(done) {
      account.error = { count: 2 };
      subject.handleAuthenticate(account, function() {
        done(function() {
          assert.ok(!lock, 'does not aquire lock');
          assert.ok(!sent, 'does not resend error');
        });
      });
    });
  });

});
