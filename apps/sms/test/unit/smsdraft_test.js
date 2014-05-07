/* global MocksHelper, loadBodyHTML */
/* global HashChangeEvent */
/* global asyncStorage, Compose, ThreadUI */
/* global SMSDraft */

'use strict';

require('/test/unit/mock_compose.js');
require('/test/unit/mock_thread_ui.js');
require('/test/unit/mock_asyncstorage.js');
require('/js/smsdraft.js');

var mocksHelperForDrafts = new MocksHelper([
  'asyncStorage',
  'Compose',
  'ThreadUI'
]).init();

suite('smsdraft.js', function() {
  var sendButton;

  mocksHelperForDrafts.attachTestHelpers();

  suiteSetup(function() {
    ThreadUI.recipients = {
      on: function() {},
      off: function() {},
      add: function() {}
    };
  });

  setup(function() {
    loadBodyHTML('/index.html');
    sendButton = document.getElementById('messages-send-button');
    sendButton.disabled = false;

    // disable the submit event; ThreadUI does this in the app, but if we don't
    // do it in the test, the test does not finish. The _real_ fix is to use a
    // <button type='button'> but it's too risky for v1.3t.
    sendButton.addEventListener('click', function(e) { e.preventDefault(); });

    window.location.hash = '';
  });

  teardown(function() {
    SMSDraft.uninit();
    window.location.hash = '';
  });

  test('init() does not throw', function() {
    SMSDraft.init();
  });

  test('storeDraft() and recoverDraft()', function() {
    SMSDraft.init();

    this.sinon.stub(asyncStorage, 'setItem');
    this.sinon.stub(Compose, 'fromDraft');
    this.sinon.stub(ThreadUI.recipients, 'add');

    var draft = {
      recipients: ['recipient1', 'recipient2'],
      content: 'something useful'
    };

    SMSDraft.storeDraft(draft);
    sinon.assert.calledWith(
      asyncStorage.setItem,
      SMSDraft.DRAFT_MESSAGE_KEY, draft
    );

    SMSDraft.recoverDraft();

    sinon.assert.calledWith(Compose.fromDraft, draft);
    draft.recipients.forEach(function(recipient) {
      sinon.assert.calledWith(ThreadUI.recipients.add, recipient);
    });

  });

  test('recoverDraft() does nothing if there is no draft yet', function() {
    this.sinon.stub(Compose, 'fromDraft');
    this.sinon.stub(ThreadUI.recipients, 'add');

    SMSDraft.init();
    SMSDraft.recoverDraft();

    sinon.assert.notCalled(Compose.fromDraft);
    sinon.assert.notCalled(ThreadUI.recipients.add);
  });

  test('clearDraft()', function() {
    this.sinon.stub(asyncStorage, 'removeItem');
    this.sinon.stub(Compose, 'fromDraft');
    this.sinon.stub(ThreadUI.recipients, 'add');

    var draft = {
      recipients: ['recipient1', 'recipient2'],
      content: 'something useful'
    };

    SMSDraft.storeDraft(draft);
    SMSDraft.clearDraft();

    sinon.assert.calledWith(
      asyncStorage.removeItem,
      SMSDraft.DRAFT_MESSAGE_KEY
    );

    SMSDraft.recoverDraft();

    sinon.assert.notCalled(Compose.fromDraft);
    sinon.assert.notCalled(ThreadUI.recipients.add);
  });

  suite('monitoring', function() {
    setup(function() {
      this.sinon.useFakeTimers();
      this.sinon.spy(window, 'setInterval');
      this.sinon.spy(window, 'clearInterval');

      this.sinon.stub(Compose, 'on');
      this.sinon.stub(Compose, 'off');
      this.sinon.stub(asyncStorage, 'setItem');
      this.sinon.stub(asyncStorage, 'removeItem');

      SMSDraft.init();
    });

    test('Not monitoring at startup', function() {
      sinon.assert.notCalled(window.setInterval);
    });

    suite('entering the composer', function() {
      setup(function() {
        this.sinon.stub(ThreadUI.recipients, 'on');
        this.sinon.stub(ThreadUI.recipients, 'off');

        window.location.hash = '#new';

        window.dispatchEvent(new HashChangeEvent('hashchange'));
      });

      test('does nothing if there is no input', function() {
        this.sinon.clock.tick(2000);
        sinon.assert.notCalled(asyncStorage.setItem);
      });

      test('save a draft if there is an input', function() {
        var content = ['body'];
        var subject = 'subject';
        var recipients = ['recipient1', 'recipient2'];
        ThreadUI.recipients.list = recipients;

        this.sinon.stub(Compose, 'getContent').returns(content);
        this.sinon.stub(Compose, 'getSubject').returns(subject);

        Compose.on.yield();
        this.sinon.clock.tick(2000);
        sinon.assert.calledWithMatch(
          asyncStorage.setItem,
          SMSDraft.DRAFT_MESSAGE_KEY,
          {
            subject: subject,
            content: content,
            recipients: recipients
          }
        );

        asyncStorage.setItem.reset();
        this.sinon.clock.tick(2000);
        sinon.assert.notCalled(
          asyncStorage.setItem, 'not calling setItem twice for the same input'
        );

        // now add/remove a recipient
        ThreadUI.recipients.on.withArgs('add').yield();
        this.sinon.clock.tick(2000);
        ThreadUI.recipients.on.withArgs('remove').yield();
        this.sinon.clock.tick(2000);
        sinon.assert.calledTwice(
          asyncStorage.setItem, 'saving a draft when a recipient change'
        );

        // forcibly calling uninit here
        // so that the hashchange event handler is removed asap
        SMSDraft.uninit();
        ThreadUI.recipients.list = undefined;
      });

      test('exiting the composer stops the monitoring', function() {
        window.location.hash = '#thread-list';
        window.dispatchEvent(new HashChangeEvent('hashchange'));

        Compose.on.yield();
        this.sinon.clock.tick(2000);

        sinon.assert.called(
          asyncStorage.removeItem,
          SMSDraft.DRAFT_MESSAGE_KEY
        );
        sinon.assert.notCalled(asyncStorage.setItem);
      });

    });
  });

  suite('scenarios', function() {
    setup(function() {
      this.sinon.stub(Compose, 'fromDraft');
      this.sinon.stub(ThreadUI.recipients, 'add');
      this.sinon.stub(ThreadUI.recipients, 'on');
      this.sinon.stub(ThreadUI.recipients, 'off');

      // we'll use the async storage mock capability to remember set values
      // so we don't stub asyncStorage
    });

    test('save a draft, init, loads the draft; send the message erases draft',
    function() {
      var draft = {
        recipients: ['recipient1', 'recipient2'],
        content: 'something useful'
      };

      SMSDraft.storeDraft(draft);
      SMSDraft.init();

      assert.equal(window.location.hash, '#new');

      window.dispatchEvent(new HashChangeEvent('hashchange'));
      sinon.assert.calledWith(Compose.fromDraft, draft);

      // now we'll send the message
      Compose.fromDraft.reset();

      sendButton.click();

      // in the real app, this change the location hash, so we'd need to change
      // back to #new, but here in the test we're still in #new, so we just need
      // to send the hashchange event.
      window.dispatchEvent(new HashChangeEvent('hashchange'));
      sinon.assert.notCalled(Compose.fromDraft);
    });

    test('save a draft, go to thread-list, go to #new, does not load the draft',
    function() {
      SMSDraft.init();

      var draft = {
        recipients: ['recipient1', 'recipient2'],
        content: 'something useful'
      };

      SMSDraft.storeDraft(draft);

      window.location.hash = '#thread-list';
      window.dispatchEvent(new HashChangeEvent('hashchange'));

      window.location.hash = '#new';
      window.dispatchEvent(new HashChangeEvent('hashchange'));

      sinon.assert.notCalled(Compose.fromDraft);
    });
  });
});

