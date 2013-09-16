requireApp('email/js/alameda.js');
requireApp('email/test/config.js');


mocha.globals(['htmlCacheRestoreDetectedActivity']);
suite('appMessages', function() {
  var subject;

  if (!('mozSetMessageHandler' in navigator)) {
    // navigator.mozSetMessageHandler is not turned on so we should bail.
    return;
  }

  suiteSetup(function(done) {
    var spy = sinon.spy(navigator, 'mozSetMessageHandler');
    testConfig({ done: done }, ['app_messages'], function(appMessages) {
      subject = appMessages;
      // Make sure that we register our activity request handler.
      sinon.assert.calledWith(spy, 'activity');
      navigator.mozSetMessageHandler.restore();
      done();
    });
  });

  test('should return an object', function() {
    assert.notStrictEqual(subject, undefined);
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
