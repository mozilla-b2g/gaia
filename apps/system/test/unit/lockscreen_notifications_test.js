/* global
  System,
  MocksHelper,
  LockScreenNotifications
 */

'use strict';

require('/js/lockscreen_notifications.js');
require('/test/unit/mock_navigator_moz_chromenotifications.js');
require('/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/test/unit/mock_system.js');

var mocksForLockScreenNotifications = new MocksHelper([
  'NavigatorMozChromeNotifications',
  'SettingsListener',
  'System'
]).init();

suite('system/LockScreenNotifications>', function() {
  var fakeLockScreenContainer,
      lockScreenNotifications;

  function sendChromeNotificationEvent(detail) {
    var event = new CustomEvent('mozChromeNotificationEvent', {
      detail: detail
    });

    window.dispatchEvent(event);
  }

  mocksForLockScreenNotifications.attachTestHelpers();
  setup(function() {

    function createFakeElement(tag, id) {
      var obj = document.createElement(tag);
      obj.id = id;
      return obj;
    }

    fakeLockScreenContainer = createFakeElement('div',
      'notifications-lockscreen-container');
    document.body.appendChild(fakeLockScreenContainer);

  });

  teardown(function() { });

    suite('prettyDate() behavior >', function() {
      var realMozL10n;
      setup(function() {
        var mozL10nStub = {
          DateTimeFormat: function() {
            return {
              fromNow: function(time, compact) {
                var retval;
                var delta = new Date().getTime() - time.getTime();
                if (delta >= 0 && delta < 60*1000) {
                  retval = 'now';
                } else if (delta >= 60*1000) {
                  retval = '1m ago';
                }
                return retval;
              }
            };
          }
        };
        realMozL10n = navigator.mozL10n;
        navigator.mozL10n = mozL10nStub;

        lockScreenNotifications = new LockScreenNotifications();
        lockScreenNotifications.start();
      });

      teardown(function() {
        navigator.mozL10n = realMozL10n;
        lockScreenNotifications = null;
        fakeLockScreenContainer.parentNode.removeChild(fakeLockScreenContainer);
      });

      test('converts timestamp to string', function() {
        var timestamp = new Date();
        var date = lockScreenNotifications.prettyDate(timestamp);
        assert.isTrue(typeof date === 'string');
      });

      test('shows now', function() {
        var timestamp = new Date();
        var date = lockScreenNotifications.prettyDate(timestamp);
        assert.equal(date, 'now');
      });

      test('shows 1m ago', function() {
        var timestamp = new Date(new Date().getTime() - 61*1000);
        var date = lockScreenNotifications.prettyDate(timestamp);
        assert.equal(date, '1m ago');
      });
    });

    suite('lockscreen notifications: ', function() {
      setup(function() {
        lockScreenNotifications = new LockScreenNotifications();
        lockScreenNotifications.start();
      });

      teardown(function() {
        lockScreenNotifications = null;
        fakeLockScreenContainer.parentNode.removeChild(fakeLockScreenContainer);
      });
      test('add lockscreen notifications', function() {
        System.locked = true;
        lockScreenNotifications.addNotification({
          id: 'id-10000', title: '', message: ''
        });
        assert.notEqual(
          null,
          fakeLockScreenContainer.querySelector(
            '[data-notification-id="id-10000"]'));
        System.locked = false;
      });

      test('remove lockscreen notifications', function() {
        System.locked = true;
        lockScreenNotifications.addNotification({
          id: 'id-10000', title: '', message: ''
        });
        lockScreenNotifications.removeNotification('id-10000');
        assert.equal(
          null,
          fakeLockScreenContainer.querySelector(
            '[data-notification-id="id-10000"]'));
        System.locked = false;
      });

      test('closing a notification', function() {
        this.sinon.stub(lockScreenNotifications, 'removeNotification');
        sendChromeNotificationEvent({
          type: 'desktop-notification-close',
          id: 'id-1'
        });

        assert.ok(lockScreenNotifications.removeNotification.called);
        assert.ok(
          lockScreenNotifications.removeNotification.calledWith('id-1'));
      });

      test('showing a notification', function() {
        var detail = {
          type: 'desktop-notification',
          id: 'id-1'
        };
        this.sinon.stub(lockScreenNotifications, 'addNotification');
        sendChromeNotificationEvent(detail);

        assert.ok(lockScreenNotifications.addNotification.called);
        assert.ok(
          lockScreenNotifications.addNotification.calledWithMatch(detail));
      });

  });
});
