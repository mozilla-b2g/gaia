'use strict';


suite('Network Alerts - cellbroadcast system message handling', function() {
  var handlerStub;

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
  });

  test('opens an attention screen if message is CMAS', function() {
    var message = {
      messageId: 4370,
      body: 'Some body'
    };

    handlerStub.withArgs('cellbroadcast-received').yield(message);

    var expectedUrl = [
      'attention.html?',
      'title=emergency-alert-title&',
      'body=Some%20body'
    ].join('');

    sinon.assert.calledWith(
      window.open,
      expectedUrl, '_blank', 'attention'
    );
    sinon.assert.called(window.close);
  });

  test('do not open attention screen if message is other cellbroadcast',
    function() {

    var message = {
      messageId: 4401,
      body: 'Some body'
    };

    handlerStub.withArgs('cellbroadcast-received').yield(message);

    sinon.assert.notCalled(window.open);
    sinon.assert.called(window.close);
  });
});

