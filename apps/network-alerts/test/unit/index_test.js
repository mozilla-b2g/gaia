/* global MockNavigatorSettings
*/
'use strict';

require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');

suite('Network Alerts - cellbroadcast system message handling', function() {
  var handlerStub;
  var realSettings = navigator.mozSettings;
  var CMAS_KEY = 'cmas.enabled';

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

    navigator.mozSettings = MockNavigatorSettings;
    MockNavigatorSettings.mSyncRepliesOnly = true;
  });

  teardown(function() {
    navigator.mozSettings = realSettings;
    MockNavigatorSettings.mTeardown();
  });

  test('do not open attention screen if error returns from settings DB',
    function() {

    var message = {
      serviceId: 0,
      messageId: 4370,
      body: 'Some body'
    };

    handlerStub.withArgs('cellbroadcast-received').yield(message);
    MockNavigatorSettings.mRequests[0].onerror();

    sinon.assert.notCalled(window.open);
    sinon.assert.called(window.close);
  });

  test('do not open attention screen if CMAS in settings DB is off',
    function() {

    var message = {
      serviceId: 0,
      messageId: 4370,
      body: 'Some body'
    };

    handlerStub.withArgs('cellbroadcast-received').yield(message);
    MockNavigatorSettings.mRequests[0].result[CMAS_KEY] = {
      0: false,
      1: false
    };
    MockNavigatorSettings.mReplyToRequests();

    sinon.assert.notCalled(window.open);
    sinon.assert.called(window.close);
  });

  test('opens an attention screen if message is CMAS', function() {
    var message = {
      serviceId: 0,
      messageId: 4370,
      body: 'Some body'
    };

    handlerStub.withArgs('cellbroadcast-received').yield(message);
    MockNavigatorSettings.mRequests[0].result[CMAS_KEY] = {
      0: true,
      1: false
    };
    MockNavigatorSettings.mReplyToRequests();

    var expectedUrl = [
      'attention.html?',
      'title=emergency-alert-title&',
      'body=Some%20body'
    ].join('');

    sinon.assert.calledWith(
      window.open,
      expectedUrl, '_blank', 'attention'
    );
    sinon.assert.notCalled(window.close);
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

