/* global MockNavigatorSettings
*/
'use strict';

require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');

suite('Network Alerts - cellbroadcast system message handling', function() {
  var handlerStub;
  var realSettings = navigator.mozSettings;
  var CMAS_KEY = 'cmas.enabled';
  var getStub, setStub;

  suiteSetup(function(done) {
    if (!window.navigator.mozSetMessageHandler) {
      window.navigator.mozSetMessageHandler = function() {};
    }
    sinon.stub(window.navigator, 'mozSetMessageHandler');
    handlerStub = window.navigator.mozSetMessageHandler;

    require('/js/index.js', done);
  });

  setup(function() {
    this.sinon.stub(window, 'close');
    this.sinon.stub(window, 'open');

    getStub = sinon.stub().returns(Promise.resolve());
    setStub = sinon.stub().returns(Promise.resolve());

    this.sinon.stub(MockNavigatorSettings, 'createLock').returns({
      get: getStub,
      set: setStub
    });

    navigator.mozSettings = MockNavigatorSettings;
  });

  teardown(function() {
    navigator.mozSettings = realSettings;
    MockNavigatorSettings.mTeardown();
  });

  test('do not open attention screen if error returns from settings DB',
    function(done) {

    var message = {
      serviceId: 0,
      messageId: 4371,
      body: 'Some body'
    };

    getStub.returns(Promise.reject(new Error('error')));

    var handler = handlerStub.withArgs('cellbroadcast-received').args[0][1];
    var finished = handler(message);

    finished.then(() => {
      sinon.assert.notCalled(window.open);
      sinon.assert.called(window.close);
    }).then(done, done);
  });

  suite('if CMAS in settings DB is off', function() {
    setup(function() {
      getStub.returns(Promise.resolve({
        [CMAS_KEY]: {
          0: false,
          1: false
        }
      }));
    });

    test('do not open attention screen', function(done) {

      var message = {
        serviceId: 0,
        messageId: 4371,
        body: 'Some body'
      };

      var handler = handlerStub.withArgs('cellbroadcast-received').args[0][1];
      var finished = handler(message);

      finished.then(() => {
        sinon.assert.notCalled(window.open);
        sinon.assert.called(window.close);
      }).then(done, done);
    });

    [4370, 4383].forEach((presidentialId) => {
      test('opens an attention screen if message is a presidential alert ' +
        presidentialId,
        function(done) {

        var message = {
          serviceId: 0,
          messageId: presidentialId,
          body: 'Some body'
        };

        var handler = handlerStub.withArgs('cellbroadcast-received').args[0][1];
        var finished = handler(message);

        var expectedUrl = [
          'attention.html?',
          'title=emergency-alert-title&',
          'body=Some%20body'
        ].join('');

        finished.then(() => {
          sinon.assert.calledWith(
            window.open,
            expectedUrl, '_blank', 'attention'
          );
          sinon.assert.notCalled(window.close);
        }).then(done, done);
      });
    });
  });

  test('opens an attention screen if message is CMAS', function(done) {
    var message = {
      serviceId: 0,
      messageId: 4371,
      body: 'Some body'
    };

    getStub.returns(Promise.resolve({
      [CMAS_KEY]: {
        0: true,
        1: false
      }
    }));

    var handler = handlerStub.withArgs('cellbroadcast-received').args[0][1];
    var finished = handler(message);

    var expectedUrl = [
      'attention.html?',
      'title=emergency-alert-title&',
      'body=Some%20body'
    ].join('');

    finished.then(() => {
      sinon.assert.calledWith(
        window.open,
        expectedUrl, '_blank', 'attention'
      );
      sinon.assert.notCalled(window.close);
    }).then(done, done);
  });

  test('do not open attention screen if message is other cellbroadcast',
    function() {

    var message = {
      serviceId: 0,
      messageId: 4401,
      body: 'Some body'
    };

    handlerStub.withArgs('cellbroadcast-received').yield(message);

    sinon.assert.notCalled(window.open);
    sinon.assert.called(window.close);
  });
});

