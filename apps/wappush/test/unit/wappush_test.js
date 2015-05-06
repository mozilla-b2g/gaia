/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* global loadBodyHTML, MockL10n, MessageDB, MockNavigatormozApps,
          MockNavigatorMozIccManager, MockNavigatormozSetMessageHandler,
          MockNavigatorSettings, MockNotification, MocksHelper, Notification,
          WapPushManager, MockParsedProvisioningDoc, SiSlScreenHelper */

'use strict';

require('/shared/js/event_dispatcher.js');
require('/shared/test/unit/mocks/mock_dump.js');
require('/shared/test/unit/mocks/mock_navigator_moz_apps.js');
require('/shared/test/unit/mocks/mock_navigator_moz_set_message_handler.js');
require('/shared/test/unit/mocks/mock_notification.js');
require('/shared/test/unit/mocks/mock_notification_helper.js');
require('/shared/test/unit/mocks/mock_navigator_moz_icc_manager.js');
require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');

require('/js/cp_screen_helper.js');
require('/js/messagedb.js');
require('/js/parsed_message.js');
require('/js/provisioning.js');
require('/js/si_sl_screen_helper.js');
require('/js/utils.js');
require('/js/wappush.js');

require('/shared/test/unit/mocks/mock_l10n.js');
require('/test/unit/mock_link_action_handler.js');
require('/test/unit/mock_whitelist.js');
require('/test/unit/mock_parsed_doc.js');

var mocksHelperWapPush = new MocksHelper([
  'Dump',
  'LinkActionHandler',
  'NotificationHelper',
  'Notification',
  'WhiteList',
  'ParsedProvisioningDoc'
]).init();

suite('WAP Push', function() {
  var realMozApps;
  var realMozIccManager;
  var realMozSettings;
  var realSetMessageHandler;
  var realMozL10n;
  var isDocumentHidden = false;

  mocksHelperWapPush.attachTestHelpers();

  suiteSetup(function() {
    realMozApps = navigator.mozApps;
    navigator.mozApps = MockNavigatormozApps;

    realMozIccManager = navigator.mozIccManager;
    navigator.mozIccManager = MockNavigatorMozIccManager;

    realMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    realMozSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;

    realSetMessageHandler = navigator.mozSetMessageHandler;
    navigator.mozSetMessageHandler = MockNavigatormozSetMessageHandler;
  });

  suiteTeardown(function() {
    navigator.mozApps = realMozApps;
    navigator.mozL10n = realMozL10n;
    navigator.mozSettings = realMozSettings;
    navigator.mozSetMessageHandler = realSetMessageHandler;
  });

  setup(function(done) {
    var notificationGetStub = function notificationGet() {
      var options = {};
      options.icon = 'icon';
      options.tag = '0';
      return {
        then: function(onSuccess, onError, onProgress) {
          onSuccess([
            new MockNotification('1', options)
          ]);
        }
      };
    };
    this.sinon.stub(MockNotification, 'get', notificationGetStub);

    mocksHelperWapPush.setup();
    MockNavigatorSettings.createLock().set({ 'wap.push.enabled': 'true' });
    loadBodyHTML('/index.html');

    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: function() {
        return isDocumentHidden;
      }
    });

    MockNavigatorMozIccManager.addIcc(0, {});
    MockNavigatormozSetMessageHandler.mSetup();
    WapPushManager.init()
                  .then(MessageDB.clear.bind(MessageDB))
                  .then(done, done);
    MockNavigatormozApps.mTriggerLastRequestSuccess();
  });

  teardown(function() {
    delete document.hidden;
    MockNavigatormozSetMessageHandler.mTeardown();
    MockNavigatorMozIccManager.mTeardown();
    MockNavigatormozApps.mTeardown();
    MockNavigatorSettings.mTeardown();
    mocksHelperWapPush.teardown();
  });

  suite('init', function() {
    test('the message handlers are bound', function() {
      var handlers = MockNavigatormozSetMessageHandler.mMessageHandlers;
      assert.ok(handlers.notification);
      assert.equal(handlers['wappush-received'],
                   WapPushManager.onWapPushReceived);
    });

    test('the headers are empty', function() {
      assert.equal(document.getElementById('title-si-sl').textContent, '');
      assert.equal(document.getElementById('title-apn').textContent, '');
      assert.equal(document.getElementById('title-details').textContent, '');
      assert.equal(document.getElementById('title-pin').textContent, '');
    });
  });

  suite('unsupported message', function() {
    var message = {
      sender: '+31641600986',
      contentType: 'text/foobar',
      content: '',
      serviceId: 0
    };

    test('unsupported messages are discarded', function(done) {
      this.sinon.spy(MessageDB, 'put');

      WapPushManager.onWapPushReceived(message).then(function() {
        done(function checks() {
          sinon.assert.notCalled(MessageDB.put);
        });
      }, done);
    });
  });

  suite('receiving and displaying a SI message', function() {
    var message = {
      sender: '+31641600986',
      contentType: 'text/vnd.wap.si',
      content: '<si><indication href="http://www.mozilla.org">' +
               'check this out</indication></si>',
      serviceId: 0
    };

    test('the notification is sent and populated correctly', function(done) {
      this.sinon.spy(window, 'Notification');

      WapPushManager.onWapPushReceived(message).then(function() {
        done(function checks() {
          sinon.assert.calledWithMatch(Notification, message.sender,
            { body: 'check this out http://www.mozilla.org' });
        });
      }, done);
    });

    test('the display is populated with the message contents', function(done) {
      var title = document.getElementById('title-si-sl');
      var screen = document.getElementById('si-sl-screen');
      var container = screen.querySelector('.container');
      var text = container.querySelector('p');
      var link = container.querySelector('a');

      this.sinon.stub(Date, 'now').returns(0);
      this.sinon.spy(MockNotification.prototype, 'close');

      WapPushManager.onWapPushReceived(message).then(function() {
        return WapPushManager.displayWapPushMessage(0);
      }).then(function() {
        done(function checks() {
          sinon.assert.calledWith(MockNotification.get, { tag: 0 });
          sinon.assert.calledOnce(MockNotification.prototype.close);
          assert.equal(title.textContent, message.sender);
          assert.equal(text.textContent, 'check this out');
          assert.equal(link.textContent, 'http://www.mozilla.org');
          assert.equal(link.dataset.url, 'http://www.mozilla.org');
          assert.equal(link.href, 'http://www.mozilla.org/');
        });
      }, done);
    });

    suite('DSDS scenarios', function() {
      setup(function() {
        this.sinon.spy(window, 'Notification');

        MockNavigatorMozIccManager.addIcc(1, {});
      });

      test('the notification is populated correctly for SIM1', function(done) {
        WapPushManager.onWapPushReceived(message).then(function() {
          done(function checks() {
            sinon.assert.calledWithMatch(Notification, /1/, {
              body: 'check this out http://www.mozilla.org'
            });
          });
        }, done);
      });

      test('the notification is populated correctly for SIM2', function(done) {
        message.serviceId = 1;

        WapPushManager.onWapPushReceived(message).then(function() {
          done(function checks() {
            sinon.assert.calledWithMatch(Notification, /2/, {
              body: 'check this out http://www.mozilla.org'
            });
          });
        }, done);
      });
    });
  });

  suite('receiving and displaying a SL message', function() {
    var message = {
        sender: '+31641600986',
        contentType: 'text/vnd.wap.sl',
        content: '<sl href="http://www.mozilla.org" />',
        serviceId: 0
    };

    test('the notification is sent and populated correctly', function(done) {
      this.sinon.spy(window, 'Notification');

      WapPushManager.onWapPushReceived(message).then(function() {
        done(function checks() {
          sinon.assert.calledWithMatch(Notification, message.sender,
            { body: 'http://www.mozilla.org' });
        });
      }, done);
    });

    test('the display is populated with the message contents', function(done) {
      var title = document.getElementById('title-si-sl');
      var screen = document.getElementById('si-sl-screen');
      var container = screen.querySelector('.container');
      var text = container.querySelector('p');
      var link = container.querySelector('a');

      this.sinon.stub(Date, 'now').returns(0);
      this.sinon.spy(MockNotification.prototype, 'close');

      WapPushManager.onWapPushReceived(message).then(function() {
        return WapPushManager.displayWapPushMessage(0);
      }).then(function() {
        done(function checks() {
          sinon.assert.calledWith(MockNotification.get, { tag: 0 });
          sinon.assert.calledOnce(MockNotification.prototype.close);

          assert.equal(title.textContent, message.sender);
          assert.equal(text.textContent, '');
          assert.equal(link.textContent, 'http://www.mozilla.org');
          assert.equal(link.dataset.url, 'http://www.mozilla.org');
          assert.equal(link.href, 'http://www.mozilla.org/');
        });
      }, done);
    });
  });

  suite('receiving and displaying a CP message', function() {
    var messages = {
      netwpin: {
        sender: '22997',
        contentType: 'text/vnd.wap.connectivity-xml',
        content: '<wap-provisioningdoc></wap-provisioningdoc>',
        authInfo: {
           pass: true,
           checked: true,
           sec: 'NETWPIN',
           mac: 'FAKEMAC',
           data: 'FAKEDATA'
        },
        serviceId: 0
      },
      userpin: {
        sender: '22997',
        contentType: 'text/vnd.wap.connectivity-xml',
        content: '<wap-provisioningdoc></wap-provisioningdoc>',
        authInfo: {
           pass: true,
           checked: true,
           sec: 'USERPIN',
           mac: 'FAKEMAC',
           data: 'FAKEDATA'
        },
        serviceId: 0
      }
    };

    var apns = {
      none: [],
      single: [
        { carrier: 'Test APN'}
      ],
      multiple: [
        { carrier: 'Test APN 1'},
        { carrier: 'Test APN 2'},
        { carrier: 'Test APN 3'}
      ],
    };

    test('the notification is sent and populated correctly', function(done) {
      this.sinon.spy(window, 'Notification');
      WapPushManager.onWapPushReceived(messages.netwpin).then(function() {
        done(function checks() {
          sinon.assert.calledWithMatch(Notification, messages.netwpin.sender,
            { body: 'cp-message-received' });
        });
      }, done);
    });

    test('the display shows warning message asking for install configuration',
      function(done) {
        var installCfgConfirmDialog =
          document.getElementById('cp-install-configuration-confirm');
        var acceptButton = installCfgConfirmDialog.querySelector('.accept');

        this.sinon.stub(Date, 'now').returns(0);
        this.sinon.spy(MockNotification.prototype, 'close');

        WapPushManager.onWapPushReceived(messages.netwpin).then(function() {
          return WapPushManager.displayWapPushMessage(0);
        }).then(function() {
          done(function checks() {
            sinon.assert.notCalled(MockNotification.prototype.close);
            assert.isFalse(acceptButton.classList.contains('hidden'),
              'the accept button should be visible');
            assert.isFalse(acceptButton.hidden);
          });
        }, done);
      }
    );

    test('the app is closed when if the user does not accept the instalation',
      function(done) {
        var installCfgConfirmDialog =
          document.getElementById('cp-install-configuration-confirm');
        var cancelButton = installCfgConfirmDialog.querySelector('.cancel');

        this.sinon.spy(WapPushManager, 'close');
        this.sinon.stub(Date, 'now').returns(0);
        this.sinon.spy(MockNotification.prototype, 'close');

        WapPushManager.onWapPushReceived(messages.netwpin).then(function() {
          return WapPushManager.displayWapPushMessage(0);
        }).then(function() {
          done(function checks() {
            sinon.assert.notCalled(MockNotification.prototype.close);
            assert.isFalse(cancelButton.classList.contains('hidden'),
              'the accept button should be visible');
            assert.isFalse(cancelButton.hidden);
            cancelButton.click();
            sinon.assert.calledOnce(WapPushManager.close);
          });
        }, done);
      }
    );

    test('show finish dialog when no apns are present in a CP message',
      function(done) {
        MockParsedProvisioningDoc.mSetup(apns.none);

        var installCfgConfirmDialog =
          document.getElementById('cp-install-configuration-confirm');
        var acceptCfgButton = installCfgConfirmDialog.querySelector('.accept');
        var dialog = document.getElementById('cp-finish-confirm');
        var finishButton = dialog.querySelector('button');

        this.sinon.stub(Date, 'now').returns(0);
        this.sinon.spy(MockNotification.prototype, 'close');

        WapPushManager.onWapPushReceived(messages.netwpin).then(function() {
          return WapPushManager.displayWapPushMessage(0);
        }).then(function() {
          done(function checks() {
            sinon.assert.notCalled(MockNotification.prototype.close);

            acceptCfgButton.click();

            assert.isFalse(finishButton.classList.contains('hidden'),
              'the accept button should be visible');
            assert.isFalse(finishButton.hidden);
          });
        }, done);
      }
    );

    test('details of apn are shown after warning message when a single apn ' +
         'is defined in CP message',
      function(done) {
        MockParsedProvisioningDoc.mSetup(apns.single);

        var title = document.getElementById('title-details');
        var screen = document.getElementById('cp-details-screen');
        var details = screen.querySelector('.message');
        var installCfgConfirmDialog =
          document.getElementById('cp-install-configuration-confirm');
        var acceptCfgButton = installCfgConfirmDialog.querySelector('.accept');

        this.sinon.stub(Date, 'now').returns(0);
        this.sinon.spy(MockNotification.prototype, 'close');

        WapPushManager.onWapPushReceived(messages.netwpin).then(function() {
          return WapPushManager.displayWapPushMessage(0);
        }).then(function() {
          done(function checks() {
            sinon.assert.notCalled(MockNotification.prototype.close);

            acceptCfgButton.click();

            assert.equal(title.textContent, messages.netwpin.sender);
            assert.isFalse(screen.classList.contains('left') ||
                           screen.classList.contains('right'),
                           'the details screen should be visible');

            var apnList = details.getElementsByTagName('li');
            assert.equal(apns.single.length, apnList.length);
            for (var i = 0; i < apnList.length; i++) {
              assert.equal(apns.single[i].carrier,
                           apnList[i].childNodes[1].textContent);
            }
          });
        }, done);
      }
    );

    test('apn list screen is shown after warning message when multiple apns ' +
         'are defined in CP message',
      function(done) {
        MockParsedProvisioningDoc.mSetup(apns.multiple);

        var titleApn = document.getElementById('title-apn');
        var titleDetails = document.getElementById('title-details');
        var apnScreen = document.getElementById('cp-apn-screen');
        var detailsScreen = document.getElementById('cp-details-screen');
        var apnsElement = apnScreen.querySelector('.message');
        var installCfgConfirmDialog =
          document.getElementById('cp-install-configuration-confirm');
        var acceptCfgButton = installCfgConfirmDialog.querySelector('.accept');

        this.sinon.stub(Date, 'now').returns(0);
        this.sinon.spy(MockNotification.prototype, 'close');

        WapPushManager.onWapPushReceived(messages.netwpin).then(function() {
          return WapPushManager.displayWapPushMessage(0);
        }).then(function() {
          done(function checks() {
            sinon.assert.notCalled(MockNotification.prototype.close);

            acceptCfgButton.click();

            assert.equal(titleApn.textContent, messages.netwpin.sender);
            assert.isFalse(apnScreen.classList.contains('left') ||
                           apnScreen.classList.contains('right'),
                           'the apn screen should be visible');

            assert.equal(titleDetails.textContent, messages.netwpin.sender);
            assert.isTrue(detailsScreen.classList.contains('right'),
                           'the details screen should not be visible');

            var apnList = apnsElement.getElementsByTagName('li');
            assert.equal(apns.multiple.length, apnList.length);
            for (var i = 0; i < apnList.length; i++) {
              assert.equal(apns.multiple[i].carrier,
                           apnList[i].childNodes[0].childNodes[1].textContent);
            }

            // Test that click on apn element shows its details.
            apnList[0].childNodes[0].click();
            assert.isFalse(detailsScreen.classList.contains('left') ||
                           detailsScreen.classList.contains('right'),
                           'the details screen should be visible');

            assert.isTrue(apnScreen.classList.contains('left'),
                           'the apn screen should not be visible');
          });
        }, done);
      }
    );

    test('the display is populated with the NETWPIN message contents after ' +
         'accepting installation ',
      function(done) {
        MockParsedProvisioningDoc.mSetup(apns.single);

        var title = document.getElementById('title-pin');
        var screen = document.getElementById('cp-pin-screen');
        var acceptButton = document.getElementById('details-accept');
        var pin = screen.querySelector('input');
        var installCfgConfirmDialog =
          document.getElementById('cp-install-configuration-confirm');
        var acceptInstallButton =
          installCfgConfirmDialog.querySelector('.accept');

        this.sinon.stub(Date, 'now').returns(0);
        this.sinon.spy(MockNotification.prototype, 'close');

        WapPushManager.onWapPushReceived(messages.netwpin).then(function() {
          return WapPushManager.displayWapPushMessage(0);
        }).then(function() {
          done(function checks() {
            sinon.assert.notCalled(MockNotification.prototype.close);
            acceptInstallButton.click();
            acceptButton.click();
            assert.equal(title.textContent, messages.netwpin.sender);
            assert.isFalse(screen.classList.contains('left') ||
                           screen.classList.contains('right'),
                           'the details screen should be visible');
            assert.equal(pin.type, 'hidden');
          });
        }, done);
      }
    );

    test('the display is populated with the USERPIN message contents after ' +
         'accepting installation ',
      function(done) {
        MockParsedProvisioningDoc.mSetup(apns.single);

        var title = document.getElementById('title-pin');
        var screen = document.getElementById('cp-pin-screen');
        var acceptButton = document.getElementById('details-accept');
        var pin = screen.querySelector('input');
        var installCfgConfirmDialog =
          document.getElementById('cp-install-configuration-confirm');
        var acceptInstallButton =
          installCfgConfirmDialog.querySelector('.accept');

        this.sinon.stub(Date, 'now').returns(0);
        this.sinon.spy(MockNotification.prototype, 'close');

        WapPushManager.onWapPushReceived(messages.userpin).then(function() {
          return WapPushManager.displayWapPushMessage(0);
        }).then(function() {
          done(function checks() {
            sinon.assert.notCalled(MockNotification.prototype.close);
            acceptInstallButton.click();
            acceptButton.click();

            assert.equal(title.textContent, messages.userpin.sender);
            assert.isFalse(screen.classList.contains('left') ||
                           screen.classList.contains('right'),
                           'the details screen should be visible');
            assert.equal(pin.type, 'number');
          });
        }, done);
      }
    );
  });

  suite('handling out-of-order reception of messages', function() {
    var messages = {
      old: {
        sender: '+31641600986',
        contentType: 'text/vnd.wap.si',
        content: '<si>' +
                 '<indication si-id="gaia-test@mozilla.org" ' +
                 '            created="2013-09-03T12:35:33Z">' +
                 'old message' +
                 '</indication>' +
                 '</si>',
        serviceId: 0
      },
      current: {
        sender: '+31641600986',
        contentType: 'text/vnd.wap.si',
        content: '<si>' +
                 '<indication si-id="gaia-test@mozilla.org" ' +
                 '            created="2013-09-03T14:35:33Z">' +
                 'current message' +
                 '</indication>' +
                 '</si>',
        serviceId: 0
      }
    };

    test('a new message updates an older one', function(done) {
      var screen = document.getElementById('si-sl-screen');
      var container = screen.querySelector('.container');
      var text = container.querySelector('p');

      this.sinon.spy(window, 'Notification');
      this.sinon.stub(Date, 'now')
        .onFirstCall().returns(0)
        .onSecondCall().returns(1);

      WapPushManager.onWapPushReceived(messages.old).then(function() {
        return WapPushManager.onWapPushReceived(messages.current);
      }).then(function() {
        return WapPushManager.displayWapPushMessage(0);
      }).then(function() {
        done(function checks() {
          sinon.assert.alwaysCalledWithMatch(Notification,
            messages.current.sender, { tag: '0' });
          assert.equal(text.textContent, 'current message');
        });
      }, done);
    });

    test('an outdated message does not replace a newer one', function(done) {
      var screen = document.getElementById('si-sl-screen');
      var container = screen.querySelector('.container');
      var text = container.querySelector('p');

      this.sinon.spy(window, 'Notification');
      this.sinon.stub(Date, 'now')
        .onFirstCall().returns(0)
        .onSecondCall().returns(1);

      WapPushManager.onWapPushReceived(messages.current).then(function() {
        return WapPushManager.onWapPushReceived(messages.old);
      }).then(function() {
        return WapPushManager.displayWapPushMessage(0);
      }).then(function() {
        done(function checks() {
          sinon.assert.calledOnce(Notification);
          sinon.assert.calledWithMatch(Notification, messages.current.sender,
            { tag: '0' });
          assert.equal(text.textContent, 'current message');
        });
      }, done);
    });
  });

  suite('handling expired messages', function() {
    var message = {
      sender: '+31641600986',
      contentType: 'text/vnd.wap.si',
      content: '<si>' +
               '<indication si-expires="2013-09-03T10:35:33Z">' +
               'check this out' +
               '</indication>' +
               '</si>',
      serviceId: 0
    };

    // UI elements
    var screen;
    var container;
    var text;

    setup(function() {
      screen = document.getElementById('si-sl-screen');
      container = screen.querySelector('.container');
      text = container.querySelector('p');
    });

    test('the message is expired', function(done) {
      this.sinon.stub(Date, 'now')
        .onFirstCall().returns(0)
        .onSecondCall().returns(1378204533001);

      WapPushManager.onWapPushReceived(message).then(function() {
        return WapPushManager.displayWapPushMessage(0);
      }).then(function() {
        done(function checks() {
          assert.equal(text.textContent, 'this-message-has-expired');
        });
      }, done);
    });
  });

  suite('handling actions', function() {
    var clock;
    var messages = {
      none: {
        sender: '+31641600986',
        contentType: 'text/vnd.wap.si',
        content: '<si>' +
                 '<indication si-id="gaia-test@mozilla.org"' +
                 '            action="signal-none">' +
                 'check this out' +
                 '</indication>' +
                 '</si>',
        serviceId: 0
      },
      signal_high: {
        sender: '+31641600986',
        contentType: 'text/vnd.wap.si',
        content: '<si>' +
                 '<indication si-id="gaia-test@mozilla.org"' +
                 '            action="signal-high">' +
                 'check this out' +
                 '</indication>' +
                 '</si>',
        serviceId: 0
      },
      execute_high: {
        sender: '+31641600986',
        contentType: 'text/vnd.wap.sl',
        content: '<sl href="http://www.mozilla.org" action="execute-high"/>',
        serviceId: 0
      },
      no_action: {
        sender: '+31641600986',
        contentType: 'text/vnd.wap.si',
        content: '<si>' +
                 '<indication si-id="gaia-test@mozilla.org">' +
                 'check this out' +
                 '</indication>' +
                 '</si>',
        serviceId: 0
      },
      delete: {
        sender: '+31641600986',
        contentType: 'text/vnd.wap.si',
        content: '<si>' +
                 '<indication si-id="gaia-test@mozilla.org"' +
                 '            action="delete">' +
                 'check this out' +
                 '</indication>' +
                 '</si>',
        serviceId: 0
      }
    };

    setup(function() {
      clock = this.sinon.useFakeTimers();
      isDocumentHidden = true;
      this.sinon.spy(window, 'Notification');
      this.sinon.spy(window, 'close');
    });

    /* XXX: Workaround for bug 981521. We shouldn't send notifications for
     * signal-none messages but we do until we'll have another way for the user
     * to find & display them. */
    test('action=signal-none sends a notification', function(done) {
      WapPushManager.onWapPushReceived(messages.none).then(function() {
        clock.tick(100);
        sinon.assert.calledWithMatch(Notification, messages.none.sender,
          { body: 'check this out' });
        sinon.assert.calledOnce(window.close);
        assert.isFalse(MockNavigatormozApps.mAppWasLaunched);
      }).then(done, done);
    });

    test('action=signal-high displays the SI message immediately',
    function(done) {
      this.sinon.spy(SiSlScreenHelper, 'populateScreen');

      WapPushManager.onWapPushReceived(messages.signal_high).then(function() {
        clock.tick(100);
        sinon.assert.notCalled(Notification);
        sinon.assert.notCalled(window.close);
        sinon.assert.calledOnce(SiSlScreenHelper.populateScreen);
        assert.isTrue(MockNavigatormozApps.mAppWasLaunched);
      }).then(done, done);
    });

    test('action=execute-high displays the SL message immediately',
    function(done) {
      this.sinon.spy(SiSlScreenHelper, 'populateScreen');

      WapPushManager.onWapPushReceived(messages.execute_high).then(function() {
        clock.tick(100);
        sinon.assert.notCalled(Notification);
        sinon.assert.notCalled(window.close);
        sinon.assert.calledOnce(SiSlScreenHelper.populateScreen);
        assert.isTrue(MockNavigatormozApps.mAppWasLaunched);
      }).then(done, done);
    });

    test('action=delete causes notifications of the deleted messages to ' +
         'be removed', function(done) {
      this.sinon.spy(MockNotification.prototype, 'close');
      this.sinon.stub(Date, 'now').returns(0);

      WapPushManager.onWapPushReceived(messages.no_action).then(function() {
        return WapPushManager.onWapPushReceived(messages.delete);
      }).then(function() {
        sinon.assert.calledOnce(Notification);
        sinon.assert.calledWith(MockNotification.get, { tag: 0 });
        sinon.assert.calledOnce(MockNotification.prototype.close);
      }).then(done, done);
    });
  });

  suite('automatic closing of the application', function() {
    var message = {
      sender: '+31641600986',
      contentType: 'text/vnd.wap.si',
      content: '<si><indication href="http://www.mozilla.org">' +
               'check this out</indication></si>',
      serviceId: 0
    };

    var clock;

    setup(function() {
      clock = this.sinon.useFakeTimers();
      this.sinon.spy(window, 'close');
    });

    teardown(function() {
      clock.restore();
    });

    test('the app is closed after displaying a notification', function(done) {
      isDocumentHidden = true;

      WapPushManager.onWapPushReceived(message).then(function() {
        done(function checks() {
          clock.tick(100);
          sinon.assert.calledOnce(window.close);
        });
      }, done);
    });

    test('the app is not closed if it is visible', function(done) {
      isDocumentHidden = false;

      WapPushManager.onWapPushReceived(message).then(function() {
        done(function checks() {
          clock.tick(100);
          sinon.assert.notCalled(window.close);
        });
      }, done);
    });

    test('the app is closed only after all messages have been processed',
      function(done) {
        isDocumentHidden = true;

        WapPushManager.onWapPushReceived(message).then(function() {
          sinon.assert.notCalled(window.close);
          return WapPushManager.onWapPushReceived(message);
        }).then(function() {
          done(function checks() {
            sinon.assert.notCalled(window.close);
            clock.tick(100);
            sinon.assert.calledOnce(window.close);
          });
        }, done);
      }
    );

    test('prevent the app from closing if it becomes visible', function(done) {
        isDocumentHidden = true;

        WapPushManager.onWapPushReceived(message).then(function() {
          sinon.assert.notCalled(window.close);
          return WapPushManager.onWapPushReceived(message);
        }).then(function() {
          done(function checks() {
            sinon.assert.notCalled(window.close);
            clock.tick(50);
            isDocumentHidden = false;
            WapPushManager.onVisibilityChange();
            clock.tick(50);
            sinon.assert.notCalled(window.close);
          });
        }, done);
    });

    test('the app is closed when hidden', function() {
      isDocumentHidden = false;
      WapPushManager.onVisibilityChange();
      clock.tick(100);
      isDocumentHidden = true;
      WapPushManager.onVisibilityChange();
      clock.tick(100);
      sinon.assert.calledOnce(window.close);
    });
  });
});
