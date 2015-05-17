/*global Information, loadBodyHTML, MockContact, MockL10n, MocksHelper,
         ConversationView, MessageManager, ContactRenderer, Utils, Template,
         Threads,
         MockMessages, Settings, Navigation,
         AssetsHelper,
         Contacts
*/

'use strict';

require('/views/shared/js/utils.js');
require('/views/shared/test/unit/mock_utils.js');
require('/views/shared/test/unit/mock_conversation.js');
require('/services/test/unit/mock_threads.js');
require('/views/shared/test/unit/mock_contact.js');
require('/shared/test/unit/mocks/mock_l10n.js');
require('/views/shared/test/unit/mock_contact.js');
require('/views/shared/test/unit/mock_contacts.js');
require('/views/shared/test/unit/mock_messages.js');
require('/views/shared/test/unit/mock_navigation.js');
require('/views/shared/test/unit/mock_settings.js');
require('/services/test/unit/mock_message_manager.js');
require('/views/shared/test/unit/mock_contact_renderer.js');
require('/views/conversation/js/information.js');


var mocksHelperForInformation = new MocksHelper([
  'Contacts',
  'ContactRenderer',
  'MessageManager',
  'Navigation',
  'Settings',
  'ConversationView',
  'Threads',
  'Utils'
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

    AssetsHelper.generateImageBlob(400, 400, 'image/jpeg', 0.5).then(
      (blob) => {
        testImageBlob = blob;
      }
    ).then(done, done);
  });

  suiteTeardown(function() {
    navigator.mozL10n = realMozL10n;
    realMozL10n = null;
  });

  setup(function() {
    loadBodyHTML('/index.html');
    this.sinon.spy(navigator.mozL10n, 'setAttributes');
    this.sinon.stub(MessageManager, 'on');
    this.sinon.spy(ConversationView, 'setHeaderContent');
    this.sinon.spy(Contacts, 'findByAddress');
    contact = MockContact();
  });

  suite('Information prototype method', function() {
    setup(function() {
      reportView = new Information('report');
    });

    suite('view show/reset status', function() {
      test('view status before show method', function() {
        assert.isTrue(reportView.panel.classList.contains('hide'));
      });

      test('view status after show method', function() {
        this.sinon.stub(reportView, 'render');
        reportView.show();
        assert.isFalse(reportView.panel.classList.contains('hide'));
      });

      test('view status after reset method', function() {
        reportView.reset();
        assert.isTrue(reportView.panel.classList.contains('hide'));
      });
    });

    suite('view refresh', function() {
      setup(function() {
        this.sinon.stub(reportView, 'render');
      });
      test('view refresh when page showed', function() {
        reportView.show();
        reportView.refresh();
        sinon.assert.called(reportView.render);
      });

      test('view does not refresh when page hided', function() {
        reportView.reset();
        reportView.refresh();
        sinon.assert.notCalled(reportView.render);
      });
    });

    suite('view renderContactList', function() {
      setup(function() {
        reportView.reset();
        this.sinon.spy(ContactRenderer.prototype, 'render');
        this.sinon.spy(ContactRenderer, 'flavor');
      });

      test('renderContactList with string array', function(done) {
        var participants = ['111'];
        reportView.renderContactList(participants);

        Contacts.findByAddress.lastCall.returnValue.then(() => {
          sinon.assert.calledWith(ContactRenderer.flavor, 'report-view');
          sinon.assert.calledWithMatch(
            ContactRenderer.prototype.render,
            {
              input: participants[0],
              infoBlock: undefined
            }
          );
        }).then(done, done);
      });

      test('renderContactList with string array(not in contact)',
      function(done) {
        this.sinon.spy(Template.prototype, 'interpolate');
        this.sinon.stub(MockContact, 'list', function() {
          return [];
        });
        var participants = ['111'];
        reportView.renderContactList(participants);

        Contacts.findByAddress.lastCall.returnValue.then(() => {
          sinon.assert.notCalled(ContactRenderer.prototype.render);
          sinon.assert.calledWith(Template.prototype.interpolate, {
            number: participants[0]
          });
          assert.isNotNull(reportView.contactList.firstElementChild);
        }).then(done, done);
      });

      test('renderContactList with object array', function(done) {
        var div = document.createElement('div');
        var participants = [
          { number: '222', infoBlock: div}
        ];
        reportView.renderContactList(participants);

        Contacts.findByAddress.lastCall.returnValue.then(() => {
          sinon.assert.calledWith(ContactRenderer.flavor, 'report-view');
          sinon.assert.calledWithMatch(
            ContactRenderer.prototype.render,
            {
              input: participants[0].number,
              infoBlock: div
            }
          );
        }).then(done, done);
      });

      test('renderContactList with object array(not in contact)',
      function(done) {
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

        Contacts.findByAddress.lastCall.returnValue.then(() => {
          sinon.assert.notCalled(ContactRenderer.prototype.render);
          sinon.assert.calledWith(Template.prototype.interpolate, {
            number: participants[0].number
          });
          assert.isNotNull(
            reportView.contactList.firstElementChild.firstElementChild
          );
        }).then(done, done);
      });

      suite('Request next rendering before previous one complete', function() {
        var div, oldParticipant, newParticipant, oldRenderingId, newRenderingId;
        var defer1, defer2;

        setup(function() {
          div = document.createElement('div');
          oldParticipant = [
            { number: '111', infoBlock: div}
          ];
          newParticipant = [
            { number: '222', infoBlock: div}
          ];

          this.sinon.spy(Template.prototype, 'interpolate');

          Contacts.findByAddress.restore();
          this.sinon.stub(Contacts, 'findByAddress');
          defer1 = Utils.Promise.defer();
          defer2 = Utils.Promise.defer();

          Contacts.findByAddress.onFirstCall().returns(defer1.promise);
          Contacts.findByAddress.onSecondCall().returns(defer2.promise);

          reportView.renderContactList(oldParticipant);
          oldRenderingId = reportView.renderingId;

          // New request before rendering
          reportView.renderContactList(newParticipant);
          newRenderingId = reportView.renderingId;
        });

        test('Contact requests return with same order', function(done) {
          // rendering ID should be different
          assert.notEqual(oldRenderingId, newRenderingId);

          defer1.resolve([]);
          defer1.promise.then(() => {
            // No item will be rendered at 1st contact request return.
            sinon.assert.notCalled(Template.prototype.interpolate);
            assert.equal(reportView.contactList.textContent, '');

            defer2.resolve([]);
            return defer2.promise;
          }).then(() => {
            // Only the new participant rendered on the contactList.
            sinon.assert.calledWith(Template.prototype.interpolate, {
              number: newParticipant[0].number
            });
            assert.equal(
              reportView.contactList.querySelectorAll('li').length, 1
            );
          }).then(done, done);
        });

        test('Last contact request returns at first place', function(done) {
          defer2.resolve([]);
          defer2.promise.then(() => {
            // Only the new participant rendered on the contactList.
            sinon.assert.calledWith(Template.prototype.interpolate, {
              number: newParticipant[0].number
            });
            assert.equal(
              reportView.contactList.querySelectorAll('li').length, 1
            );

            // No item will be rendered at 1st contact request return.
            Template.prototype.interpolate.reset();

            defer1.resolve([]);
            return defer1.promise;
          }).then(() => {
            sinon.assert.notCalled(Template.prototype.interpolate);
          }).then(done, done);
        });
      });
    });
  });

  suite('Message report view render', function() {
    var messageOpts = {};
    var deliveryStatuses = ['not-applicable', 'pending', 'success', 'error'];

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
      reportView.beforeEnter();
    });

    teardown(function() {
      reportView.reset();
      reportView.afterLeave();
    });

    function getInfoBlock(renderContactList) {
      var infoBlock = renderContactList.args[0][0][0].infoBlock;
      assert.isTrue(infoBlock.classList.contains('network-status'));
      return infoBlock;
    }

    function generalInfoAssertion(opts) {
      var type = opts.type,
          delivery = opts.delivery,
          subjectHide = opts.subjectHide,
          subjectContent = opts.subjectContent,
          sentTitle = opts.sentTitle,
          contactTitle = opts.contactTitle,
          sizeHide = opts.sizeHide,
          sizeContent = opts.sizeContent;

      assert.equal(reportView.container.dataset.delivery, delivery);
      sinon.assert.calledWith(
        navigator.mozL10n.setAttributes,
        reportView.type,
        type
      );

      assert.equal(reportView.subject.classList.contains('hide'), subjectHide);
      if (!subjectHide && subjectContent) {
        assert.equal(reportView.subject.querySelector('.detail').textContent,
                     subjectContent);
      }

      if (delivery === 'error') {
        assert.isFalse(navigator.mozL10n.setAttributes.calledWith(
          reportView.sentTitle, sentTitle));
      } else {
        sinon.assert.calledWith(
          navigator.mozL10n.setAttributes,
          reportView.sentTitle,
          sentTitle
        );
      }

      sinon.assert.calledWith(
        navigator.mozL10n.setAttributes,
        reportView.contactTitle,
        contactTitle
      );

      assert.equal(reportView.sizeBlock.classList.contains('hide'), sizeHide);
      if (!sizeHide && sizeContent) {
        sinon.assert.calledWith(
          navigator.mozL10n.setAttributes,
          reportView.size,
          'attachmentSizeKB',
          sizeContent
        );
      }

      sinon.assert.called(reportView.renderContactList);
    }

    test('Outgoing Message report(status sending)', function() {
      messageOpts = {
        sender: null,
        delivery: 'sending',
        deliveryStatus: 'pending'
      };
      reportView.id = 1;
      reportView.render();

      generalInfoAssertion({
        type: 'message-type-sms',
        delivery: 'sending',
        subjectHide: true,
        sentTitle: 'message-sending',
        contactTitle: 'report-to-title',
        sizeHide: true
      });
    });

    test('Outgoing Message report(status sent)', function() {
      messageOpts = {
        sender: null,
        delivery: 'sent',
        deliveryStatus: 'success',
        deliveryTimestamp: Date.now()
      };

      reportView.id = 1;
      reportView.render();

      generalInfoAssertion({
        type: 'message-type-sms',
        delivery: 'sent',
        subjectHide: true,
        sentTitle: 'message-sent',
        contactTitle: 'report-to-title',
        sizeHide: true
      });
    });

    test('Outgoing Message report(status error)', function() {
      messageOpts = {
        sender: null,
        delivery: 'error',
        deliveryStatus: 'error'
      };

      reportView.id = 1;
      reportView.render();

      generalInfoAssertion({
        type: 'message-type-sms',
        delivery: 'error',
        subjectHide: true,
        sentTitle: 'message-error',
        contactTitle: 'report-to-title',
        sizeHide: true
      });
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

      reportView.id = 2;
      reportView.render();

      generalInfoAssertion({
        type: 'message-type-mms',
        delivery: 'sent',
        subjectHide: false,
        subjectContent: messageOpts.subject,
        sentTitle: 'message-sent',
        contactTitle: 'report-to-title',
        sizeHide: true
      });
    });

    test('Outgoing Message report(MMS w/o subject)', function() {
      messageOpts = {
        sender: null,
        attachments: [{content: testImageBlob}],
        delivery: 'sent',
        deliveryStatus: 'success',
        deliveryTimestamp: Date.now()
      };

      reportView.id = 2;
      reportView.render();

      generalInfoAssertion({
        type: 'message-type-mms',
        delivery: 'sent',
        subjectHide: true,
        sentTitle: 'message-sent',
        contactTitle: 'report-to-title',
        sizeHide: false,
        sizeContent: { n: (testImageBlob.size / 1024).toFixed(1) }
      });
    });

    test('Incoming Message report(SMS)', function() {
      messageOpts = {
        receiver: null
      };
      reportView.id = 1;
      reportView.render();

      generalInfoAssertion({
        type: 'message-type-sms',
        delivery: 'received',
        subjectHide: true,
        sentTitle: 'message-sent',
        contactTitle: 'report-from-title',
        sizeHide: true
      });
    });

    test('Incoming Message report(MMS)', function() {
      messageOpts = {
        receiver: null,
        subject: 'Test subjuect',
        attachments: [{content: testImageBlob}]
      };
      reportView.id = 2;
      reportView.render();

      generalInfoAssertion({
        type: 'message-type-mms',
        delivery: 'received',
        subjectHide: false,
        subjectContent: messageOpts.subject,
        sentTitle: 'message-sent',
        contactTitle: 'report-from-title',
        sizeHide: false,
        sizeContent: { n: (testImageBlob.size / 1024).toFixed(1) }
      });
    });

    test('Incoming Message report(status not downloaded)', function() {
      messageOpts = {
        receiver: null,
        delivery: 'not-downloaded',
        attachments: null
      };
      reportView.id = 2;
      reportView.render();

      generalInfoAssertion({
        type: 'message-type-mms',
        delivery: 'not-downloaded',
        subjectHide: true,
        sentTitle: 'message-sent',
        contactTitle: 'report-from-title',
        sizeHide: true
      });
    });

    suite('Incoming Message with valid sent timestamp >', function() {
      setup(function() {
        messageOpts = {
          delivery: 'received',
          sentTimestamp: Date.now()
        };
        reportView.id = 1;
      });

      [true, false].forEach((isMozHour12) => {
        var hourPostfix = isMozHour12 ? '12' : '24';

        test('with ' + hourPostfix + ' hour format', function() {
          navigator.mozHour12 = isMozHour12;

          reportView.render();

          var sentTimestampNode = reportView.container.querySelector(
            '.sent-timestamp'
          );

          assert.isFalse(
            reportView.container.classList.contains('no-valid-sent-timestamp')
          );
          assert.equal(
            sentTimestampNode.textContent,
            Utils.date.format.localeFormat(
              new Date(messageOpts.sentTimestamp),
              'report-dateTimeFormat' + hourPostfix
            )
          );
          assert.equal(
            sentTimestampNode.dataset.l10nDate, messageOpts.sentTimestamp
          );
          assert.ok(sentTimestampNode.dataset.l10nDateFormat12);
          assert.ok(sentTimestampNode.dataset.l10nDateFormat24);
        });
      });
    });

    test('Incoming Message with invalid sent timestamp', function() {
      messageOpts = {
        delivery: 'received',
        sentTimestamp: 0
      };

      reportView.id = 1;
      reportView.render();

      assert.isTrue(
        reportView.container.classList.contains('no-valid-sent-timestamp')
      );
    });

    suite('Message report with SIM information', function() {
      var simInfo;
      var simDetail;

      setup(function() {
        if (!('mozMobileConnections' in navigator)) {
          navigator.mozMobileConnections = null;
        }

        if (!('mozIccManager' in navigator)) {
          navigator.mozIccManager = null;
        }

        simInfo = reportView.simInfo;
        simDetail = simInfo.querySelector('.sim-detail');
        messageOpts = {
          iccId: '1'
        };
        reportView.id = 1;
      });

      teardown(function() {
        simInfo.classList.add('hide');
      });

      test('Hide SIM information for single SIM', function() {
        reportView.render();
        assert.isTrue(simInfo.classList.contains('hide'));
      });

      test('unknown SIM', function() {
        this.sinon.stub(window.navigator, 'mozIccManager', {
          getIccById: () => null
        });
        this.sinon.stub(Settings, 'hasSeveralSim').returns(true);
        this.sinon.stub(Settings, 'getServiceIdByIccId').returns(null);
        this.sinon.stub(Settings, 'getOperatorByIccId').returns('');
        reportView.render();

        sinon.assert.calledWithMatch(
          navigator.mozL10n.setAttributes,
          simDetail,
          'dsds-unknown-sim'
        );

        assert.isFalse(simInfo.classList.contains('hide'));
      });

      test('no phone number', function() {
        this.sinon.stub(window.navigator, 'mozIccManager', {
          getIccById: function() {
            return {
              'iccInfo': {
                msisdn: ''
              }
            };
          }
        });
        this.sinon.stub(Settings, 'hasSeveralSim').returns(true);
        this.sinon.stub(Settings, 'getServiceIdByIccId').returns(0);
        this.sinon.stub(Settings, 'getOperatorByIccId').returns('operator');
        reportView.render();

        sinon.assert.calledWithMatch(
          navigator.mozL10n.setAttributes,
          Object,
          'sim-detail',
          {
            id: 1,
            detailString: 'operator'
          }
        );

        assert.isFalse(simInfo.classList.contains('hide'));
      });

      test('no operator', function() {
        this.sinon.stub(window.navigator, 'mozIccManager', {
          getIccById: function() {
            return {
              'iccInfo': {
                msisdn: '1111'
              }
            };
          }
        });
        this.sinon.stub(Settings, 'hasSeveralSim').returns(true);
        this.sinon.stub(Settings, 'getServiceIdByIccId').returns(0);
        this.sinon.stub(Settings, 'getOperatorByIccId').returns('');
        reportView.render();

        sinon.assert.calledWithMatch(
          navigator.mozL10n.setAttributes,
          Object,
          'sim-detail',
          {
            id: 1,
            detailString: '1111'
          }
        );

        assert.isFalse(simInfo.classList.contains('hide'));
      });

      test('All information is accessible', function() {
        this.sinon.stub(window.navigator, 'mozIccManager', {
          getIccById: function() {
            return {
              'iccInfo': {
                msisdn: '1111'
              }
            };
          }
        });
        this.sinon.stub(Settings, 'hasSeveralSim').returns(true);
        this.sinon.stub(Settings, 'getServiceIdByIccId').returns(1);
        this.sinon.stub(Settings, 'getOperatorByIccId').returns('operator');
        reportView.render();

        sinon.assert.calledWithMatch(
          navigator.mozL10n.setAttributes,
          Object,
          'sim-detail',
          {
            id: 2,
            detailString: 'operator, 1111'
          }
        );

        assert.isFalse(simInfo.classList.contains('hide'));
      });
    });

    suite('Render report block in contact list(delivery status)', function() {
      var data,
          reportDiv;

      setup(function() {
        data = {
          titleL10n: '',
          reportDateL10n: '',
          timestamp: '',
          messageL10nDateFormat12: 'report-dateTimeFormat12',
          messageL10nDateFormat24: 'report-dateTimeFormat24'
        };
      });

      test('no delivery report', function() {
        messageOpts = {
          sender: null,
          delivery: 'sent',
          deliveryStatus: 'not-applicable'
        };

        reportView.id = 1;
        reportView.render();

        reportDiv = getInfoBlock(reportView.renderContactList);
        sinon.assert.notCalled(Template.prototype.interpolate);
        assert.equal(reportDiv.dataset.deliveryStatus, 'not-applicable');
      });

      test('delivery report requested but not return yet', function() {
        messageOpts = {
          sender: null,
          delivery: 'sent',
          deliveryStatus: 'pending'
        };

        reportView.id = 1;
        reportView.render();

        data.titleL10n = 'report-status-pending';
        sinon.assert.calledWith(Template.prototype.interpolate, data);
        reportDiv = getInfoBlock(reportView.renderContactList);
        assert.equal(reportDiv.dataset.deliveryStatus, 'pending');
      });

      suite('delivery report success >', function() {
        setup(function() {
          messageOpts = {
            sender: null,
            delivery: 'sent',
            deliveryStatus: 'success',
            deliveryTimestamp: Date.now()
          };

          reportView.id = 1;
        });

        [true, false].forEach((isMozHour12) => {
          var hourPostfix = isMozHour12 ? '12' : '24';

          test('with ' + hourPostfix + ' hour format', function() {
            navigator.mozHour12 = isMozHour12;

            reportView.render();

            data.titleL10n = 'report-status-delivered';
            data.reportDateL10n = Utils.date.format.localeFormat(
              new Date(messageOpts.deliveryTimestamp),
              navigator.mozL10n.get('report-dateTimeFormat' + hourPostfix)
            );
            data.timestamp = '' + messageOpts.deliveryTimestamp;
            sinon.assert.calledWith(Template.prototype.interpolate, data);
            reportDiv = getInfoBlock(reportView.renderContactList);
            assert.equal(reportDiv.dataset.deliveryStatus, 'delivered');
          });
        });
      });

      test('delivery report error', function() {
        messageOpts = {
          sender: null,
          delivery: 'sent',
          deliveryStatus: 'error'
        };

        reportView.id = 1;
        reportView.render();
        data.titleL10n = 'report-status-error';
        sinon.assert.calledWith(Template.prototype.interpolate, data);
        reportDiv = getInfoBlock(reportView.renderContactList);
        assert.equal(reportDiv.dataset.deliveryStatus, 'error');
      });

      test('delivery report rejected', function() {
        messageOpts = {
          sender: null,
          delivery: 'sent',
          deliveryInfo: [{
            receiver: 'receiver',
            deliveryStatus: 'rejected',
            readStatus: 'not-applicable'
          }]
        };

        reportView.id = 2;
        reportView.render();
        data.titleL10n = 'report-status-rejected';
        sinon.assert.calledWith(Template.prototype.interpolate, data);
        reportDiv = getInfoBlock(reportView.renderContactList);
        assert.equal(reportDiv.dataset.deliveryStatus, 'rejected');
      });
    });

    suite('Render report block in contact list(read status)', function() {
      var data,
          block;

      setup(function() {
        data = {
          titleL10n: '',
          reportDateL10n: sinon.match.any,
          timestamp: '',
          messageL10nDateFormat12: 'report-dateTimeFormat12',
          messageL10nDateFormat24: 'report-dateTimeFormat24'
        };
      });

      suite('no read report', function() {
        setup(function() {
          messageOpts = {
            sender: null,
            delivery: 'sent',
            deliveryInfo: [{
              receiver: 'receiver',
              readStatus: 'not-applicable'
            }]
          };
          reportView.id = 2;
        });

        deliveryStatuses.forEach((delivery) => {
          test('when delivery status is ' + delivery, function() {
            var deliveryInfo = messageOpts.deliveryInfo[0];
            deliveryInfo.deliveryStatus = delivery;
            deliveryInfo.deliveryTimestamp = delivery === 'success' ?
               Date.now():
               null;
            reportView.render();

            block = getInfoBlock(reportView.renderContactList);
            switch (delivery) {
              case 'not-applicable':
                assert.equal(block.dataset.deliveryStatus, 'not-applicable');
                sinon.assert.notCalled(Template.prototype.interpolate);
                return;
              case 'pending':
                data.titleL10n = 'report-status-pending';
                assert.equal(block.dataset.deliveryStatus, 'pending');
                break;
              case 'success':
                data.titleL10n = 'report-status-delivered';
                data.timestamp = '' + deliveryInfo.deliveryTimestamp;
                assert.equal(block.dataset.deliveryStatus, 'delivered');
                break;
              case 'error':
                data.titleL10n = 'report-status-error';
                assert.equal(block.dataset.deliveryStatus, 'error');
                break;
            }
            sinon.assert.calledWith(Template.prototype.interpolate, data);
          });
        });
      });

      suite('read report requested but not return yet', function() {
        setup(function() {
          messageOpts = {
            sender: null,
            delivery: 'sent',
            deliveryInfo: [{
              receiver: 'receiver',
              readStatus: 'pending'
            }]
          };
          reportView.id = 2;
        });

        deliveryStatuses.forEach((delivery) => {
          test('when delivery status is ' + delivery, function() {
            var deliveryInfo = messageOpts.deliveryInfo[0];
            deliveryInfo.deliveryStatus = delivery;
            deliveryInfo.deliveryTimestamp = delivery === 'success' ?
              Date.now():
              null;
            reportView.render();

            block = getInfoBlock(reportView.renderContactList);
            switch (delivery) {
              case 'not-applicable':
              case 'pending':
                data.titleL10n = 'report-status-pending';
                assert.equal(block.dataset.deliveryStatus, 'pending');
                break;
              case 'success':
                data.titleL10n = 'report-status-delivered';
                data.timestamp = '' + deliveryInfo.deliveryTimestamp;
                assert.equal(block.dataset.deliveryStatus, 'delivered');
                break;
              case 'error':
                data.titleL10n = 'report-status-error';
                assert.equal(block.dataset.deliveryStatus, 'error');
                break;
            }
            sinon.assert.calledWith(Template.prototype.interpolate, data);
          });
        });
      });

      suite('read report success >', function() {
        setup(function() {
          messageOpts = {
            sender: null,
            delivery: 'sent',
            deliveryInfo: [{
              receiver: 'receiver',
              readStatus: 'success',
              readTimestamp: Date.now()
            }]
          };

          reportView.id = 2;
        });

        [true, false].forEach((isMozHour12) => {
          var hourPostfix = isMozHour12 ? '12' : '24';

          // delivery error should not exist
          ['not-applicable', 'pending', 'success'].forEach((delivery) => {
            test('when delivery status is ' + delivery +
              'with ' + hourPostfix + ' hour format', function() {

              navigator.mozHour12 = isMozHour12;
              var deliveryInfo = messageOpts.deliveryInfo[0];
              deliveryInfo.deliveryStatus = delivery;
              deliveryInfo.deliveryTimestamp = delivery === 'success' ?
                Date.now() - 10:
                null;
              reportView.render();

              block = getInfoBlock(reportView.renderContactList);
              data.titleL10n = 'report-status-read';
              data.timestamp = '' + deliveryInfo.deliveryTimestamp;
              data.reportDateL10n = Utils.date.format.localeFormat(
                new Date(messageOpts.deliveryInfo[0].readTimestamp),
                navigator.mozL10n.get('report-dateTimeFormat' + hourPostfix)
              );
              data.timestamp = '' + messageOpts.deliveryInfo[0].readTimestamp;

              assert.equal(block.dataset.deliveryStatus, 'read');
              sinon.assert.calledWith(Template.prototype.interpolate, data);
            });
          });
        });
      });

      suite('read report error', function() {
        setup(function() {
          messageOpts = {
            sender: null,
            delivery: 'error',
            deliveryInfo: [{
              receiver: 'receiver',
              readStatus: 'error'
            }]
          };
          reportView.id = 2;
        });

        deliveryStatuses.forEach((delivery) => {
          test('when delivery status is ' + delivery, function() {
            var deliveryInfo = messageOpts.deliveryInfo[0];
            deliveryInfo.deliveryStatus = delivery;
            deliveryInfo.deliveryTimestamp =
              delivery === 'success' ? Date.now(): null;
            reportView.render();

            block = getInfoBlock(reportView.renderContactList);
            data.titleL10n = 'report-status-error';
            assert.equal(block.dataset.deliveryStatus, 'error');
            sinon.assert.calledWith(Template.prototype.interpolate, data);
          });
        });
      });
    });

    ['message-failed-to-send',
      'message-delivered',
      'message-read',
      'message-sent',
      'message-sending'
    ].forEach(function(event) {
      suite('MessageManager.on' + event + '()', function() {
        var fakeMessage;

        setup(function() {
          this.sinon.stub(reportView, 'refresh');
          this.sinon.stub(Navigation, 'isCurrentPanel').returns(false);
          fakeMessage = MockMessages.sms();
        });

        teardown(function() {
          reportView.messageResending = false;
        });

        test('If showing this message, report is refreshed', function() {
          Navigation.isCurrentPanel
            .withArgs('report-view', { id: 1 }).returns(true);

          MessageManager.on.withArgs(event).yield({ message: fakeMessage });

          sinon.assert.called(reportView.refresh);
        });

        if (event === 'message-sending') {
          test('If showing another message by resend button clicked, ' +
            'report is refreshed because of resend', function() {
            Navigation.isCurrentPanel
              .withArgs('report-view').returns(true);

            reportView.resendBtn.click();
            fakeMessage.delivery = 'sending';
            MessageManager.on.withArgs(event).yield({ message: fakeMessage });

            sinon.assert.called(reportView.refresh);
          });

          test('If showing another message but not related to resend button, ' +
            'report is not refreshed', function() {
            Navigation.isCurrentPanel
              .withArgs('report-view', { id: 2 }).returns(true);

            fakeMessage.delivery = 'sending';
            reportView.messageResending = false;
            MessageManager.on.withArgs(event).yield({ message: fakeMessage });

            sinon.assert.notCalled(reportView.refresh);
          });
        } else {
          test('If showing another message, report is not refreshed',
            function() {

            Navigation.isCurrentPanel
              .withArgs('report-view', { id: 2 }).returns(true);

            MessageManager.on.withArgs(event).yield({ message: fakeMessage });

            sinon.assert.notCalled(reportView.refresh);
          });
        }

        test('If not showing the report, it is not refreshed', function() {
          MessageManager.on.withArgs(event).yield({ message: fakeMessage });

          sinon.assert.notCalled(reportView.refresh);
        });
      });
    });

    suite('resend button for delivery error message ', function() {
      setup(function() {
        messageOpts = {
          sender: null,
          delivery: 'error',
          deliveryStatus: 'error'
        };

        this.sinon.stub(ConversationView, 'resendMessage');
        reportView.id = 1;
        reportView.render();
      });

      test('ConversationView resend function called', function() {
        reportView.resendBtn.click();
        sinon.assert.calledWith(ConversationView.resendMessage, reportView.id);
        assert.isTrue(reportView.messageResending);
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
      this.sinon.spy(ContactRenderer, 'flavor');

      groupView.render();
    });

    teardown(function() {
      delete Threads.lastId;
    });
    test('view status before show method', function() {
      sinon.assert.calledWith(groupView.renderContactList, participants);
      sinon.assert.calledWithMatch(
        navigator.mozL10n.setAttributes,
        groupView.headerText, 'participant', { n:participants.length }
      );
      sinon.assert.calledWith(ContactRenderer.flavor, 'group-view');
    });
  });

  suite('ReportView', function() {
    var enterArgs, leaveArgs;

    setup(function() {
      reportView = new Information('report');
      this.sinon.stub(reportView, 'show');
      this.sinon.stub(reportView, 'reset');

      enterArgs = {
        id: 10,
        meta: {
          next: { panel: 'report-view', args: { id: 10 } },
          prev: { panel: 'thread', args: { id: 1 } }
        }
      };

      leaveArgs = {
        id: 1,
        meta: {
          next: { panel: 'thread', args: { id: 1 } },
          prev: { panel: 'report-view', args: { id: 10 } }
        }
      };
    });

    test('afterEnter() and beforeLeave()', function() {
      reportView.afterEnter(enterArgs);
      sinon.assert.called(reportView.show);
      assert.equal(
        reportView.id, enterArgs.id,
        'id is set after afterEnter'
      );

      reportView.beforeLeave(leaveArgs);
      sinon.assert.called(reportView.reset);
      assert.isNull(reportView.id, 'id is reset after beforeLeave');
    });

    suite('Set event listener', function() {
      test('No event listenser for report view', function() {
        var event = new MouseEvent('click',
          { bubbles: true, cancelable: true });
        var canceled = !reportView.contactList.dispatchEvent(event);

        assert.isFalse(canceled);
      });
    });
  });

  suite('GroupView', function() {
    var enterArgs, leaveArgs;

    setup(function() {
      groupView = new Information('group');
      this.sinon.stub(groupView, 'show');
      this.sinon.stub(groupView, 'reset');

      enterArgs = {
        id: 1,
        meta: {
          next: { panel: 'group-view', args: { id: 1 } },
          prev: { panel: 'thread', args: { id: 1 } }
        }
      };

      leaveArgs = {
        id: 1,
        meta: {
          next: { panel: 'thread', args: { id: 1 } },
          prev: { panel: 'group-view', args: { id: 1 } }
        }
      };
    });

    test('afterEnter() and beforeLeave()', function() {
      groupView.afterEnter(enterArgs);
      sinon.assert.called(groupView.show);
      assert.equal(
        groupView.id, enterArgs.id,
        'id is set after afterEnter'
      );

      groupView.beforeLeave(leaveArgs);
      sinon.assert.called(groupView.reset);
      assert.isNull(groupView.id, 'id is reset after beforeLeave');
    });

    suite('Set event listener', function() {
      setup(function(){
        this.sinon.stub(ConversationView, 'promptContact');
      });

      test('Contact prompt is called when clicked on contactList', function() {
        var event = new MouseEvent('click',
          { bubbles: true, cancelable: true });
        var item = document.createElement('a');

        item.dataset.number = 'test number';
        groupView.contactList.appendChild(item);
        item.dispatchEvent(event);
        sinon.assert.calledWith(
          ConversationView.promptContact,
          { number : item.dataset.number }
        );
      });
    });
  });
});
