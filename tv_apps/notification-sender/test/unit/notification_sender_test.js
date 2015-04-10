/* globals NotificationSender, MockPresentation, MockPresentationSession */
'use strict';

require('/bower_components/smart-button/script.js');
require('/shared/test/unit/mocks/mock_presentation.js');
require('/shared/test/unit/mocks/mock_presentation_session.js');


suite('NotificationSender >', function() {
  var subject;
  var realPresentation;
  var urlInput;

  suiteSetup(function(done) {
    urlInput = document.createElement('input');
    urlInput.id = 'url-input';
    urlInput.value = 'http://www.test.url.goes.here';
    document.body.appendChild(urlInput);

    require('/tv_apps/notification-sender/js/notification_sender.js', done);

  });

  suiteTeardown(function() {
    document.body.removeChild(urlInput);
  });

  setup(function() {
    subject = new NotificationSender();
    realPresentation = navigator.mozPresentation;
    navigator.mozPresentation = MockPresentation;

  });

  teardown(function() {
    navigator.mozPresentation = realPresentation;
    MockPresentation._mReset();
    MockPresentationSession._mReset();
  });

  test('connect() should enable buttons', function(done) {
    var spy = this.sinon.spy(subject, 'disableButtons');
    spy.withArgs(false);

    subject.connect().then(function() {
      assert.isTrue(spy.withArgs(false).calledOnce);
      done();
    });
  });

  test('connect() should listen to session.onstatechange', function(done) {
    assert.isUndefined(MockPresentationSession._onstatechange);

    subject.connect().then(function() {
      assert.isFunction(MockPresentationSession._onstatechange);
      done();
    });
  });

  suite('Connected behaviors > ', function() {
    setup(function(done) {
      subject.connect().then(function() {
        done();
      });
    });

    test('sendMessage() should call session.sendMessage', function() {
      var data = {data: 'hello, world'};
      var dataJSON = JSON.stringify(data);
      var spy = this.sinon.spy(MockPresentationSession, 'send');
      spy.withArgs(dataJSON);

      subject.sendMessage(data);
      assert.isTrue(spy.withArgs(dataJSON).calledOnce);
    });
  });

});
