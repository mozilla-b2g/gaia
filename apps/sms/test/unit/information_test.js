/*global Information, loadBodyHTML, MockContact, MockL10n, MocksHelper,
         ThreadUI, MessageManager, ContactRenderer, Utils, Template, Threads,
         MockMessages */

'use strict';

require('/js/utils.js');
require('/test/unit/mock_utils.js');
require('/test/unit/mock_thread_ui.js');
require('/test/unit/mock_threads.js');
require('/test/unit/mock_contact.js');
require('/test/unit/mock_l10n.js');
require('/test/unit/mock_messages.js');
require('/test/unit/mock_contact.js');
require('/test/unit/mock_contacts.js');
require('/test/unit/mock_message_manager.js');
require('/test/unit/mock_contact_renderer.js');
require('/js/information.js');


var mocksHelperForInformation = new MocksHelper([
  'Utils',
  'ThreadUI',
  'Threads',
  'Contacts',
  'MessageManager',
  'ContactRenderer'
]).init();

suite('Information view', function() {
  var realMozL10n;
  var contact;
  var testImageBlob;
  var groupView, reportView;

  mocksHelperForInformation.attachTestHelpers();

  suiteSetup(function(done) {
    realMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    var assetsNeeded = 0;
    function getAsset(filename, loadCallback) {
      assetsNeeded++;

      var req = new XMLHttpRequest();
      req.open('GET', filename, true);
      req.responseType = 'blob';
      req.onload = function() {
        loadCallback(req.response);
        if (--assetsNeeded === 0) {
          done();
        }
      };
      req.send();
    }

    getAsset('/test/unit/media/kitten-450.jpg', function(blob) {
      testImageBlob = blob;
    });
  });

  suiteTeardown(function() {
    navigator.mozL10n = realMozL10n;
    realMozL10n = null;
  });

  setup(function() {
    loadBodyHTML('/index.html');
    this.sinon.spy(navigator.mozL10n, 'localize');
    contact = MockContact();
  });

  suite('Information prototype method', function() {
    setup(function() {
      reportView = new Information('report');
    });

    suite('view show/reset status', function() {
      test('view status before show method', function() {
        assert.isFalse(reportView.parent.classList.contains('information'));
        assert.isTrue(reportView.container.classList.contains('hide'));
      });

      test('view status after show method', function() {
        this.sinon.stub(reportView, 'render');
        reportView.show();
        assert.isTrue(reportView.parent.classList.contains('information'));
        assert.isFalse(reportView.container.classList.contains('hide'));
      });

      test('view status after reset method', function() {
        reportView.reset();
        assert.isFalse(reportView.parent.classList.contains('information'));
        assert.isTrue(reportView.container.classList.contains('hide'));
      });
    });

    suite('view renderContactList', function() {
      setup(function() {
        reportView.reset();
        this.sinon.spy(ContactRenderer.prototype, 'render');
      });
      test('renderContactList with string array', function() {
        var participants = ['111'];
        reportView.renderContactList(participants);
        assert.isTrue(ContactRenderer.prototype.render.called);
        var arg = ContactRenderer.prototype.render.args[0][0];
        assert.equal(arg.input, participants[0]);
        assert.equal(arg.infoBlock, null);
      });

      test('renderContactList with string array(not in contact)', function() {
        this.sinon.spy(Template.prototype, 'interpolate');
        this.sinon.stub(MockContact, 'list', function() {
          return [];
        });
        var participants = ['111'];
        reportView.renderContactList(participants);
        sinon.assert.notCalled(ContactRenderer.prototype.render);
        sinon.assert.calledWith(Template.prototype.interpolate, {
          number: participants[0]
        });
        assert.isTrue(!!reportView.contactList.firstElementChild);
      });

      test('renderContactList with object array', function() {
        var div = document.createElement('div');
        var participants = [
          { number: '222', infoBlock: div}
        ];
        reportView.renderContactList(participants);
        sinon.assert.called(ContactRenderer.prototype.render);
        var arg = ContactRenderer.prototype.render.args[0][0];
        assert.equal(arg.input, participants[0].number);
        assert.equal(arg.infoBlock, participants[0].infoBlock);
      });

      test('renderContactList with object array(not in contact)', function() {
        this.sinon.stub(MockContact, 'list', function() {
          return [];
        });
        this.sinon.stub(Template.prototype, 'interpolate', function() {
          return '<a class="suggestion"></a>';
        });
        var div = document.createElement('div');
        var participants = [
          { number: '222', infoBlock: div}
        ];
        reportView.renderContactList(participants);
        sinon.assert.notCalled(ContactRenderer.prototype.render);
        sinon.assert.calledWith(Template.prototype.interpolate, {
          number: participants[0].number
        });
        assert.isTrue(
          !!reportView.contactList.firstElementChild.firstElementChild);
      });
    });
  });

  suite('Message report view render', function() {
    var messageOpts = {};

    setup(function() {
      reportView = new Information('report');
      this.sinon.spy(reportView, 'renderContactList');
      this.sinon.spy(Template.prototype, 'interpolate');
      this.sinon.stub(MessageManager, 'getMessage', function(id) {
        var result;
        switch (id) {
          case 1:
            result = MockMessages.sms(messageOpts);
            break;
          case 2:
            result = MockMessages.mms(messageOpts);
            break;
        }
        var request = {
          result: result,
          set onsuccess(cb) {
            cb();
          },
          get onsuccess() {
            return {};
          }
        };
        return request;
      });
      this.sinon.spy(Utils.date.format, 'localeFormat');
    });

    test('Outgoing Message report(status sending)', function() {
      messageOpts = {
        sender: null,
        delivery: 'sending',
        deliveryStatus: 'pending'
      };
      window.location.hash = '#report-view=1';
      reportView.render();
      sinon.assert.calledWith(navigator.mozL10n.localize, reportView.type,
        'message-type-sms');
      sinon.assert.calledWith(navigator.mozL10n.localize, reportView.status,
        'message-status-sending');
      assert.equal(reportView.status.dataset.type, 'sending');
      sinon.assert.calledWith(navigator.mozL10n.localize,
        reportView.contactTitle, 'report-recipients');
      assert.isTrue(reportView.sizeBlock.classList.contains('hide'));
      sinon.assert.called(reportView.renderContactList);
    });

    test('Outgoing Message report(status sent)', function() {
      messageOpts = {
        sender: null,
        delivery: 'sent',
        deliveryStatus: 'success',
        deliveryTimestamp: Date.now()
      };
      window.location.hash = '#report-view=1';
      reportView.render();
      sinon.assert.calledWith(navigator.mozL10n.localize, reportView.type,
        'message-type-sms');
      sinon.assert.calledWith(navigator.mozL10n.localize, reportView.status,
        'message-status-sent');
      assert.equal(reportView.status.dataset.type, 'sent');
      sinon.assert.calledWith(navigator.mozL10n.localize,
        reportView.contactTitle, 'report-recipients');
      assert.isTrue(reportView.sizeBlock.classList.contains('hide'));
      sinon.assert.called(reportView.renderContactList);
    });

    test('Outgoing Message report(status error)', function() {
      messageOpts = {
        sender: null,
        delivery: 'error',
        deliveryStatus: 'error'
      };
      window.location.hash = '#report-view=1';
      reportView.render();
      sinon.assert.calledWith(navigator.mozL10n.localize, reportView.type,
        'message-type-sms');
      sinon.assert.calledWith(navigator.mozL10n.localize, reportView.status,
        'message-status-error');
      assert.equal(reportView.status.dataset.type, 'error');
      sinon.assert.calledWith(navigator.mozL10n.localize,
        reportView.contactTitle, 'report-recipients');
      assert.isTrue(reportView.sizeBlock.classList.contains('hide'));
      sinon.assert.called(reportView.renderContactList);
    });

    test('Outgoing Message report(MMS w/ subject)', function() {
      messageOpts = {
        sender: null,
        subject: 'Test subjuect',
        attachments: null,
        delivery: 'sent',
        deliveryStatus: 'success',
        deliveryTimestamp: Date.now()
      };
      window.location.hash = '#report-view=2';
      reportView.render();
      assert.equal(reportView.subject.textContent, messageOpts.subject);
      sinon.assert.calledWith(navigator.mozL10n.localize, reportView.type,
        'message-type-mms');
      sinon.assert.calledWith(navigator.mozL10n.localize, reportView.status,
        'message-status-sent');
      assert.equal(reportView.status.dataset.type, 'sent');
      sinon.assert.calledWith(navigator.mozL10n.localize,
        reportView.contactTitle, 'report-recipients');
      assert.isTrue(reportView.sizeBlock.classList.contains('hide'));
      sinon.assert.called(reportView.renderContactList);
    });

    test('Outgoing Message report(MMS w/o subject)', function() {
      messageOpts = {
        sender: null,
        attachments: [{content: testImageBlob}],
        delivery: 'sent',
        deliveryStatus: 'success',
        deliveryTimestamp: Date.now()
      };
      window.location.hash = '#report-view=2';
      reportView.render();
      assert.equal(reportView.subject.textContent, '');
      sinon.assert.calledWith(navigator.mozL10n.localize, reportView.type,
        'message-type-mms');
      sinon.assert.calledWith(navigator.mozL10n.localize, reportView.size,
        'attachmentSize', { n: (testImageBlob.size / 1024).toFixed(1) });
      sinon.assert.calledWith(navigator.mozL10n.localize, reportView.status,
        'message-status-sent');
      assert.equal(reportView.status.dataset.type, 'sent');
      sinon.assert.calledWith(navigator.mozL10n.localize,
        reportView.contactTitle, 'report-recipients');
      assert.isFalse(reportView.sizeBlock.classList.contains('hide'));
      sinon.assert.called(reportView.renderContactList);
    });

    test('Incoming Message report(SMS)', function() {
      messageOpts = {
        receiver: null
      };
      var message = MockMessages.sms(messageOpts);
      window.location.hash = '#report-view=1';
      reportView.render();
      sinon.assert.calledWith(navigator.mozL10n.localize, reportView.type,
        'message-type-sms');
      sinon.assert.calledWith(navigator.mozL10n.localize, reportView.status,
        'message-status-received');
      assert.equal(reportView.status.dataset.type, 'received');
      sinon.assert.calledWith(navigator.mozL10n.localize,
        reportView.contactTitle, 'report-from');
      assert.isTrue(reportView.sizeBlock.classList.contains('hide'));
      sinon.assert.calledWith(reportView.renderContactList, [message.sender]);
    });

    test('Incoming Message report(MMS)', function() {
      messageOpts = {
        receiver: null,
        subject: 'Test subjuect',
        attachments: [{content: testImageBlob}]
      };
      var message = MockMessages.mms(messageOpts);
      window.location.hash = '#report-view=2';
      reportView.render();
      assert.equal(reportView.subject.textContent, message.subject);
      sinon.assert.calledWith(navigator.mozL10n.localize, reportView.type,
        'message-type-mms');
      sinon.assert.calledWith(navigator.mozL10n.localize, reportView.size,
        'attachmentSize', { n: (testImageBlob.size / 1024).toFixed(1) });
      sinon.assert.calledWith(navigator.mozL10n.localize, reportView.status,
        'message-status-received');
      assert.equal(reportView.status.dataset.type, 'received');
      sinon.assert.calledWith(navigator.mozL10n.localize,
        reportView.contactTitle, 'report-from');
      assert.isFalse(reportView.sizeBlock.classList.contains('hide'));
      sinon.assert.calledWith(reportView.renderContactList, [message.sender]);
    });

    test('Incoming Message report(status not downloaded)', function() {
      messageOpts = {
        receiver: null,
        delivery: 'not-downloaded',
        attachments: null
      };
      window.location.hash = '#report-view=2';
      reportView.render();
      sinon.assert.calledWith(navigator.mozL10n.localize, reportView.type,
        'message-type-mms');
      sinon.assert.calledWith(navigator.mozL10n.localize, reportView.status,
        'message-status-not-downloaded');
      assert.equal(reportView.status.dataset.type, 'not-downloaded');
      sinon.assert.calledWith(navigator.mozL10n.localize,
        reportView.contactTitle, 'report-from');
      sinon.assert.called(reportView.renderContactList);
    });

    suite('Render report block in contact list', function() {
      var data;

      setup(function() {
        data = {
          delivery: '',
          deliveryL10n: '',
          deliveryDateL10n: '',
          deliveryTimestamp: '',
          read: 'hide',
          readL10n: 'message-read',
          readDateL10n: '',
          messageL10nDateFormat: 'report-dateTimeFormat'
        };
      });

      test('no delivery report', function() {
        messageOpts = {
          sender: null,
          delivery: 'sent',
          deliveryStatus: 'not-applicable'
        };
        window.location.hash = '#report-view=1';
        reportView.render();
        data.delivery = 'hide';
        sinon.assert.calledWith(Template.prototype.interpolate, data);
      });

      test('report requested but not return yet', function() {
        messageOpts = {
          sender: null,
          delivery: 'sent',
          deliveryStatus: 'pending'
        };
        window.location.hash = '#report-view=1';
        reportView.render();
        data.deliveryL10n = 'message-requested';
        sinon.assert.calledWith(Template.prototype.interpolate, data);
      });

      test('delivery report success', function() {
        messageOpts = {
          sender: null,
          delivery: 'sent',
          deliveryStatus: 'success',
          deliveryTimestamp: Date.now()
        };
        window.location.hash = '#report-view=1';
        reportView.render();
        data.deliveryDateL10n = Utils.date.format.localeFormat(
          new Date(messageOpts.deliveryTimestamp),
          navigator.mozL10n.get('report-dateTimeFormat')
        );
        data.deliveryTimestamp = '' + messageOpts.deliveryTimestamp;
        sinon.assert.calledWith(Template.prototype.interpolate, data);
      });

      test('delivery report error', function() {
        messageOpts = {
          sender: null,
          delivery: 'sent',
          deliveryStatus: 'error'
        };
        window.location.hash = '#report-view=1';
        reportView.render();
        data.deliveryL10n = 'message-status-error';
        sinon.assert.calledWith(Template.prototype.interpolate, data);
      });
    });
  });

  suite('Group view render', function() {
    var participants;

    setup(function() {
      participants = ['111', '222'];
      Threads.lastId = 1;
      this.sinon.stub(Threads, 'get', function() {
        return { participants: participants };
      });
      groupView = new Information('group');
      this.sinon.spy(groupView, 'renderContactList');
      groupView.render();
    });

    teardown(function() {
      delete Threads.lastId;
    });
    test('view status before show method', function() {
      sinon.assert.calledWith(groupView.renderContactList, participants);
      sinon.assert.calledWithMatch(navigator.mozL10n.localize,
        ThreadUI.headerText, 'participant', {n: participants.length});
    });
  });
});
