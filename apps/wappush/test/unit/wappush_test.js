/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* global loadBodyHTML, MockL10n, MessageDB, MockNavigatormozApps,
          MockNavigatorMozIccManager, MockNavigatormozSetMessageHandler,
          MockNavigatorSettings, MockNotification, MocksHelper, Notification,
          WapPushManager, SiSlScreenHelper */

'use strict';

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

require('/test/unit/mock_l10n.js');
require('/test/unit/mock_link_action_handler.js');
require('/test/unit/mock_whitelist.js');

var mocksHelperWapPush = new MocksHelper([
  'Dump',
  'LinkActionHandler',
  'NotificationHelper',
  'Notification',
  'WhiteList'
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

    test('the header is empty', function() {
      assert.equal(document.getElementById('title').textContent, '');
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
      var acceptButton = document.getElementById('accept');
      var title = document.getElementById('title');
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

          assert.isTrue(acceptButton.classList.contains('hidden'),
            'the accept button should be hidden');
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
      var acceptButton = document.getElementById('accept');
      var title = document.getElementById('title');
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

          assert.isTrue(acceptButton.classList.contains('hidden'),
            'the accept button should be hidden');
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

    test('the notification is sent and populated correctly', function(done) {
      this.sinon.spy(window, 'Notification');
      WapPushManager.onWapPushReceived(messages.netwpin).then(function() {
        done(function checks() {
          sinon.assert.calledWithMatch(Notification, messages.netwpin.sender,
            { body: 'cp-message-received' });
        });
      }, done);
    });

    test('the display is populated with the NETWPIN message contents',
      function(done) {
        var title = document.getElementById('title');
        var screen = document.getElementById('cp-screen');
        var acceptButton = document.getElementById('accept');
        var pin = screen.querySelector('input');

        this.sinon.stub(Date, 'now').returns(0);
        this.sinon.spy(MockNotification.prototype, 'close');

        WapPushManager.onWapPushReceived(messages.netwpin).then(function() {
          return WapPushManager.displayWapPushMessage(0);
        }).then(function() {
          done(function checks() {
            sinon.assert.notCalled(MockNotification.prototype.close);

            assert.equal(title.textContent, messages.netwpin.sender);
            assert.isFalse(acceptButton.classList.contains('hidden'),
              'the accept button should be visible');
            assert.isFalse(acceptButton.hidden);
            assert.equal(pin.type, 'hidden');
          });
        }, done);
      }
    );

    test('the display is populated with the USERPIN message contents',
      function(done) {
        var title = document.getElementById('title');
        var screen = document.getElementById('cp-screen');
        var acceptButton = document.getElementById('accept');
        var pin = screen.querySelector('input');

        this.sinon.stub(Date, 'now').returns(0);
        this.sinon.spy(MockNotification.prototype, 'close');

        WapPushManager.onWapPushReceived(messages.userpin).then(function() {
          return WapPushManager.displayWapPushMessage(0);
        }).then(function() {
          done(function checks() {
            sinon.assert.notCalled(MockNotification.prototype.close);

            assert.equal(title.textContent, messages.userpin.sender);
            assert.isFalse(acceptButton.classList.contains('hidden'),
              'the accept button should be visible');
            assert.isFalse(acceptButton.hidden);
            assert.equal(pin.type, 'text');
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
