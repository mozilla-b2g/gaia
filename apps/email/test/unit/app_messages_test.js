requireApp('email/js/alameda.js');
requireApp('email/test/config.js');
requireApp('email/test/unit/mock_l10n.js');

mocha.globals(['htmlCacheRestoreDetectedActivity']);
suite('appMessages', function() {
  var subject;

  if (!('mozSetMessageHandler' in navigator)) {
    // navigator.mozSetMessageHandler is not turned on so we should bail.
    return;
  }

  suiteSetup(function(done) {
    var spy = sinon.spy(navigator, 'mozSetMessageHandler');
    testConfig({
      done: done,
      defines: {
        'l10n!': function() {
          return MockL10n;
        }
      }
    }, ['app_messages'], function(appMessages) {
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
    var oldListener = subject.emitWhenListener;

    setup(function() {
      subject.emitWhenListener = function() {
        var args = Array.slice(arguments);
        oldListener.apply(subject, args);
        if (subject.__doneTest) {
          var done = subject.__doneTest;
          subject.__doneTest = undefined;
          done.apply(undefined, args);
        }
      };
    });

    teardown(function() {
      subject.emitWhenListener = oldListener;
    });

    test('should be a function', function(done) {
      assert.ok(typeof subject.onActivityRequest === 'function');
    });

    test('should call #emitWhenListener if sharing url', function(done) {
      var req = {};
      req.source = {
        data: { type: 'url', url: 'lolcats.com' },
        name: 'share'
      };

      subject.__doneTest = function(id, activityName, data, req) {
        assert.equal(id, 'activity');
        assert.equal(activityName, 'share');
        assert.equal(data.body, 'lolcats.com');
        // Clean up known global that will get set by using
        // attachment_name inside app_messages.
        delete window.MimeMapper;
        done();
      };

      // Pretend we got an activity request.
      subject.onActivityRequest(req);
    });
  });
});
