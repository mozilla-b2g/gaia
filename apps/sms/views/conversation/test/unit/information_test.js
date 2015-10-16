/*global Information, loadBodyHTML, MockContact, MockL10n, MocksHelper,
         ConversationView, MessageManager, ContactRenderer, Utils, Template,
         Threads,
         MockMessages, Settings, Navigation,
         AssetsHelper,
         Contacts,
         MobileOperator
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
require('/shared/test/unit/mocks/mock_mobile_operator.js');
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
  'Utils',
  'MobileOperator'
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
    var header;

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

      // be sure that the initial status is as expected so that the next test is
      // useful.
      header = document.querySelector('.panel-ReportView gaia-header');
      assert.isTrue(header.hasAttribute('no-font-fit'));

      reportView.beforeEnter({ id: '1' });
    });

    teardown(function() {
      reportView.reset();
      reportView.afterLeave();
    });

    function getInfoBlock(renderContactList) {
      var infoBlock = renderContactList.lastCall.args[0][0].infoBlock;
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

    test('gaia-header is properly set up', function() {
      assert.isFalse(header.hasAttribute('no-font-fit'));
    });

    test('Outgoing Message report(status sending)', function() {
      messageOpts = {
        sender: null,
        delivery: 'sending',
        deliveryStatus: 'pending'
      };
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

      reportView.beforeEnter({ id: '2' });

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

      reportView.beforeEnter({ id: '2' });

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
      reportView.beforeEnter({ id: '2' });

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
      reportView.beforeEnter({ id: '2' });

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

          var options = Object.assign(
            { hour12: navigator.mozHour12 },
            JSON.parse(sentTimestampNode.dataset.l10nDateFormat)
          );

          var formatter = new Intl.DateTimeFormat(
            navigator.languages,
            options
          );

          assert.equal(
            sentTimestampNode.textContent,
            formatter.format(new Date(messageOpts.sentTimestamp))
          );
          assert.equal(
            sentTimestampNode.dataset.l10nDate, messageOpts.sentTimestamp
          );
        });
      });
    });

    test('Incoming Message with invalid sent timestamp', function() {
      messageOpts = {
        delivery: 'received',
        sentTimestamp: 0
      };

      reportView.render();

      assert.isTrue(
        reportView.container.classList.contains('no-valid-sent-timestamp')
      );
    });

    suite('Incoming Message with late arrival >', function() {
      setup(function() {
        messageOpts = {
          delivery: 'received'
        };
      });

      const SECOND = 1000;
      const MINUTE = 60 * SECOND;
      const HOUR = 60 * MINUTE;
      const DAY = 24 * HOUR;
      const MONTH = 30 * DAY;

      var tests = [
        {
          name: '1 second',
          delay: SECOND,
          expected: {}
        },
        {
          name: 'less than 5 minutes',
          delay: 5 * MINUTE - 1,
          expected: {}
        },
        {
          name: '5 minutes',
          delay: 5 * MINUTE,
          expected: { minute: 5 }
        },
        {
          name: 'less than an hour',
          delay: HOUR - 1,
          expected: { minute: 59, second: 59, }
        },
        {
          name: 'an hour',
          delay: HOUR,
          expected: { hour: 1 }
        },
        {
          name: 'less than a day',
          delay: DAY - 1,
          expected: { hour: 23, minute: 59, second: 59 }
        },
        {
          name: 'a day',
          delay: DAY,
          expected: { day: 1 }
        },
        {
          name: 'less than a month',
          delay: MONTH - 1,
          expected: { day: 29, hour: 23, minute: 59, second: 59 }
        },
        {
          name: 'a month',
          delay: MONTH,
          expected: { month: 1 }
        },
        {
          name: '5 months',
          delay: MONTH * 5,
          expected: { month: 5 }
        },
        {
          name: '2m, 3d, 8h, 30min, 45sec',
          delay: MONTH * 2 + DAY * 3 + HOUR * 8 + MINUTE * 30 + SECOND * 45,
          expected: { month: 2, day: 3, hour: 8, minute: 30, second: 45 }
        }
      ];

      tests.forEach(({ name, delay, expected }) => {
        test(`${name} delay`, function() {
          messageOpts.timestamp = Date.now();
          messageOpts.sentTimestamp = messageOpts.timestamp - delay;

          reportView.render();

          ['month', 'day', 'hour', 'minute', 'second'].forEach(
            (unit) => {
              var className = `.lateness-${unit}`;
              var elmt = reportView.container.querySelector(className);
              var elmtL10nArgs = elmt.dataset.l10nArgs;
              var actualValue = elmtL10nArgs && JSON.parse(elmtL10nArgs).value;
              var expectedValue = expected[unit];

              // Test l10n value only if the element is not hidden
              // because it can retain value from previous test
              if (elmt.classList.contains('hide')) {
                assert.isUndefined(expectedValue);
              } else {
                assert.equal(actualValue, expectedValue);
              }
          });
        });
      });
    });

    suite('Message report with SIM information', function() {
      var simInfo;
      var simDetail;

      setup(function() {
        if (!('mozMobileConnections' in navigator)) {
          navigator.mozMobileConnections = [];
        }

        if (!('mozIccManager' in navigator)) {
          navigator.mozIccManager = null;
        }

        simInfo = reportView.simInfo;
        simDetail = simInfo.querySelector('.sim-detail');
        messageOpts = {
          iccId: '1'
        };
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
        this.sinon.stub(MobileOperator, 'userFacingInfo').returns({
          operator: 'operator'
        });
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
        this.sinon.stub(MobileOperator, 'userFacingInfo').returns({
          operator: ''
        });
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
        this.sinon.stub(MobileOperator, 'userFacingInfo').returns({
          operator: 'operator'
        });
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
          messageL10nDateFormat: JSON.stringify({
            month: 'long',
            day: '2-digit',
            year: 'numeric',
            hour: 'numeric',
            minute: 'numeric'
          })
        };
      });

      test('no delivery report', function() {
        messageOpts = {
          sender: null,
          delivery: 'sent',
          deliveryStatus: 'not-applicable'
        };

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
        });

        [true, false].forEach((isMozHour12) => {
          var hourPostfix = isMozHour12 ? '12' : '24';

          test('with ' + hourPostfix + ' hour format', function() {
            navigator.mozHour12 = isMozHour12;

            reportView.render();

            data.titleL10n = 'report-status-delivered';

            var options = Object.assign(
              { hour12: navigator.mozHour12 },
              JSON.parse(data.messageL10nDateFormat)
            );

            var formatter = new Intl.DateTimeFormat(
              navigator.languages,
              options
            );

            data.reportDateL10n = formatter.format(
              new Date(messageOpts.deliveryTimestamp));
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

        reportView.beforeEnter({ id: '2' });
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
          messageL10nDateFormat: JSON.stringify({
            month: 'long',
            day: '2-digit',
            year: 'numeric',
            hour: 'numeric',
            minute: 'numeric'
          })
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
          reportView.beforeEnter({ id: '2' });
        });

        deliveryStatuses.forEach((delivery) => {
          test('when delivery status is ' + delivery, function() {
            var deliveryInfo = messageOpts.deliveryInfo[0];
            deliveryInfo.deliveryStatus = delivery;
            deliveryInfo.deliveryTimestamp = delivery === 'success' ?
               Date.now():
               null;

            Template.prototype.interpolate.reset();
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
          reportView.beforeEnter({ id: '2' });
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

          reportView.beforeEnter({ id: '2' });
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

              var options = Object.assign(
                { hour12: navigator.mozHour12 },
                JSON.parse(data.messageL10nDateFormat)
              );

              var formatter = new Intl.DateTimeFormat(
                navigator.languages,
                options
              );

              data.reportDateL10n = formatter.format(
                new Date(messageOpts.deliveryInfo[0].readTimestamp));
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
          reportView.beforeEnter({ id: '2' });
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

    test('beforeEnter() and afterLeave()', function() {
      reportView.beforeEnter(enterArgs);
      sinon.assert.called(reportView.show);
      assert.equal(
        reportView.id, enterArgs.id,
        'id is set after beforeEnter'
      );

      reportView.afterLeave(leaveArgs);
      sinon.assert.called(reportView.reset);
      assert.isNull(reportView.id, 'id is reset after afterLeave');
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
    var header;

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

      // be sure that the initial status is as expected so that the next test is
      // useful.
      header = document.querySelector('.panel-GroupView gaia-header');
      assert.isTrue(header.hasAttribute('no-font-fit'));

      groupView.beforeEnter(enterArgs);
    });


    test('gaia-header is properly set up', function() {
      assert.isFalse(header.hasAttribute('no-font-fit'));
    });

    test('beforeEnter() and afterLeave()', function() {
      sinon.assert.called(groupView.show);
      assert.equal(
        groupView.id, enterArgs.id,
        'id is set after beforeEnter'
      );

      groupView.afterLeave(leaveArgs);
      sinon.assert.called(groupView.reset);
      assert.isNull(groupView.id, 'id is reset after afterLeave');
    });

    test('Contact prompt is called when click on contactList', function(done) {
      var promptPromise = Promise.resolve();
      this.sinon.stub(ConversationView, 'promptContact').returns(promptPromise);
      this.sinon.stub(Navigation, 'toPanel');

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
      promptPromise.then(
        () => sinon.assert.calledWith(Navigation.toPanel, 'thread', { id: 1 })
      ).then(done, done);
    });
  });
});
