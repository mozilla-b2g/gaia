requireApp('email/js/alameda.js');
requireApp('email/test/config.js');


suite('appMessages', function() {
  var subject;

  suiteSetup(function(done) {
    var spy = sinon.spy(navigator, 'mozSetMessageHandler');
    testConfig({ done: done }, ['app_messages'], function(appMessages) {
      subject = appMessages;
      // Make sure that we register our activity request handler.
      sinon.assert.calledWith(spy, 'activity', subject.onActivityRequest);
      navigator.mozSetMessageHandler.restore();
      done();
    });
  });

  test('should return an object', function() {
    assert.notStrictEqual(subject, undefined);
  });

  suite('#hasPending', function() {
    var spy;

    setup(function() {
      mocha.globals(['htmlCacheRestoreDetectedActivity']);
      spy = sinon.spy(navigator, 'mozHasPendingMessage');
    });

    teardown(function() {
      navigator.mozHasPendingMessage.restore();
    });

    test('should be a function', function() {
      assert.ok(typeof subject.hasPending === 'function');
    });

    test('should be true for activity if cached pending', function() {
      window.htmlCacheRestoreDetectedActivity = true;
      assert.ok(subject.hasPending('activity'));
    });

    test('should call navigator.mozHasPendingMessage', function() {
      subject.hasPending('cheese');
      sinon.assert.calledWith(spy, 'cheese');
    });
  });

  suite('#onActivityRequest', function() {
    var spy;

    setup(function() {
      spy = sinon.spy(subject, 'emitWhenListener');
    });

    teardown(function() {
      subject.emitWhenListener.restore();
    });

    test('should be a function', function() {
      assert.ok(typeof subject.onActivityRequest === 'function');
    });

    test('should call #emitWhenListener if sharing url', function() {
      var req = {};
      req.source = {
        data: { type: 'url', url: 'lolcats.com' },
        name: 'share'
      };

      // Pretend we got an activity request.
      subject.onActivityRequest(req);

      sinon.assert.calledWith(spy, 'activity', 'share', {
        body: 'lolcats.com'
      }, req);
    });
  });
});
