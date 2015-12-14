/* global Identity, MockChromeEvent, MockL10n */
'use strict';

requireApp('system/js/identity.js');
requireApp('system/test/unit/mock_chrome_event.js');
require('/shared/test/unit/mocks/mock_l10n.js');

suite('identity', function() {
  var subject;
  var realL10n;
  suiteSetup(function() {
    subject = Identity;

    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
  });

  suiteTeardown(function() {
    navigator.mozL10n = realL10n;
  });

  suite('open popup', function() {
    var stubDispatchEvent;
    var fakeIframe;
    setup(function() {
      fakeIframe = document.createElement('iframe');
      this.sinon.stub(document, 'createElement').returns(fakeIframe);
      stubDispatchEvent = this.sinon.stub(window, 'dispatchEvent');
      var event = new MockChromeEvent({
        type: 'id-dialog-open',
        id: 'test-open-event-id',
        showUI: true
      });
      subject.handleEvent(event);
    });

    test('popup parameters', function() {
      var result = stubDispatchEvent.getCall(0).args[0];
      assert.equal(result.type, 'launchtrusted');
      assert.equal(result.detail.name, 'persona-signin');
      assert.equal(result.detail.chromeId, 'test-open-event-id');
    });

    test('frame event listener', function() {
      var stubIdentityDispatchEvent =
        this.sinon.stub(subject, '_dispatchEvent');

      fakeIframe.dispatchEvent(new CustomEvent('mozbrowserloadstart'));

      assert.equal(stubIdentityDispatchEvent.getCall(0).args[0].id,
        'test-open-event-id');
      assert.deepEqual(stubIdentityDispatchEvent.getCall(0).args[0].frame,
        fakeIframe);
    });
  });

  suite('close popup', function() {
    var stubDispatchEvent, stubIdentityDispatchEvent;
    setup(function() {
      stubDispatchEvent =
        this.sinon.stub(window, 'dispatchEvent');
      var event = new MockChromeEvent({
        type: 'id-dialog-done',
        id: 'test-close-event-id',
        showUI: true
      });
      stubIdentityDispatchEvent =
        this.sinon.stub(subject, '_dispatchEvent');
      subject.handleEvent(event);
    });

    test('close', function() {
      var resultEvent = stubDispatchEvent.getCall(0).args[0];
      assert.equal(resultEvent.type, 'killtrusted');
      assert.equal(resultEvent.detail.chromeId, 'test-close-event-id');
      assert.isTrue(stubIdentityDispatchEvent.calledWith({
        id: 'test-close-event-id'
      }));
    });
  });

  suite('close iframe', function() {
    var container;
    setup(function() {
      container = document.createElement('div');
      container.id = 'screen';
      document.body.appendChild(container);
    });

    test('close iframe', function() {
      subject.handleEvent(new MockChromeEvent({
        type: 'id-dialog-open',
        id: 'test-open-event-id'
      }));
      assert.isTrue(!!container.querySelector('iframe'));
      subject.handleEvent(new MockChromeEvent({
        type: 'id-dialog-close-iframe',
          id: 'test-close-iframe-id'
      }));
      assert.isFalse(!!container.querySelector('iframe'));
    });
  });
});
