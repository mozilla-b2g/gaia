'use strict';

var assert = require('chai').assert;
var InteractiveNotifications = require('./lib/interactive_notifications');

marionette('Test Interactive Notifications', function() {
  var Keys = {
    'enter': '\ue006',
    'right': '\ue014',
    'esc': '\ue00c',
    'backspace': '\ue003'
  };

  var testOptions = { devices: ['tv'] };

  var opts = {
    apps: {},
    hostOptions: {
      screen: {
        width: 1920,
        height: 1080
      }
    }
  };

  var client = marionette.client({
    profile: opts,
    // XXX: Set this to true once Accessibility is implemented in TV
    desiredCapabilities: { raisesAccessibilityExceptions: false }
  });

  var msg;
  var system;
  var interactiveNotifications;

  setup(function() {
    system = client.loader.getAppClass('system');
    system.waitForStartup();
    system.waitForFullyLoaded();
    interactiveNotifications = new InteractiveNotifications(client);
    msg = {
      title: 'title',
      text: 'msg text',
      timeout: 5000,
      buttons: [
        {
          id: 'yesBtn',
          label: 'Yes'
        }, {
          id: 'noBtn',
          label: 'No'
        }
      ]
    };
  });

  test('Should show without buttons', testOptions, function () {
      msg.buttons = null;
      interactiveNotifications.show(msg);
      interactiveNotifications.waitForOpened();

      interactiveNotifications.msgTitle.scriptWith(function(el) {
        return el.textContent;
      }, function (err, textContent) {
        assert.equal(msg.title, textContent);
      });
      interactiveNotifications.msgBody.scriptWith(function(el) {
        return el.textContent;
      }, function (err, textContent) {
        assert.equal(msg.text, textContent);
      });
      interactiveNotifications.msgBtnGroup.scriptWith(function(el) {
        return el.getAttribute('class').indexOf('hidden') !== -1;
      }, function (err, btnsHidden) {
        assert.ok(btnsHidden, 'Buttons should not show');
      });

      interactiveNotifications.waitForClosed();
  });

  test('Should show with buttons', testOptions, function () {
      interactiveNotifications.show(msg);
      interactiveNotifications.waitForOpened();

      interactiveNotifications.msgTitle.scriptWith(function(el) {
        return el.textContent;
      }, function (err, textContent) {
        assert.equal(msg.title, textContent);
      });
      interactiveNotifications.msgBody.scriptWith(function(el) {
        return el.textContent;
      }, function (err, textContent) {
        assert.equal(msg.text, textContent);
      });
      interactiveNotifications.msgBtnGroup.scriptWith(function(el) {
        return el.getAttribute('class').indexOf('hidden') === -1;
      }, function (err, btnsShow) {
        assert.ok(btnsShow, 'Buttons should show');
      });
      interactiveNotifications.msgBtn0.scriptWith(function(el) {
        return el.textContent;
      }, function (err, textContent) {
        assert.equal(msg.buttons[0].label, textContent);
      });
      interactiveNotifications.msgBtn1.scriptWith(function(el) {
        return el.textContent;
      }, function (err, textContent) {
        assert.equal(msg.buttons[1].label, textContent);
      });

      interactiveNotifications.waitForClosed();
  });

  test('Should focus on app', testOptions,
    function() {
      // If no button within notification banner,
      // then focus should be still on app
      msg.buttons = null;
      interactiveNotifications.show(msg);
      interactiveNotifications.waitForOpened();

      interactiveNotifications.banner.scriptWith(function(banner) {
        return document.activeElement !== banner &&
          document.activeElement.getAttribute('src') ===
            'app://smart-home.gaiamobile.org/index.html';
      }, function (err, focusOnApp) {
        assert.ok(focusOnApp, 'Not focus on backgorund app');
      });

      interactiveNotifications.waitForClosed();
    }
  );

  test('Should hide by pressing the HW back button', testOptions,
    function() {
      // Set a very long timeout so has to hide by pressing button
      msg.timeout = 120 * 60 * 1000;
      interactiveNotifications.show(msg);
      interactiveNotifications.waitForOpened();
      interactiveNotifications.banner.sendKeys(Keys.backspace);
      interactiveNotifications.waitForClosed();
    }
  );

  test('Should focus on the Yes button', testOptions,
    function() {
      interactiveNotifications.show(msg);
      interactiveNotifications.waitForOpened();

      interactiveNotifications.msgBtn0.scriptWith(function(msgBtn0) {
        return document.activeElement === msgBtn0;
      }, function (err, focusOnYesBtn) {
        assert.ok(focusOnYesBtn, 'Not focus on Yes button');
      });

      interactiveNotifications.waitForClosed();
    }
  );

  test('Should hide by pressing the Yes button', testOptions,
    function() {
      msg.timeout = 120 * 60 * 1000;
      interactiveNotifications.show(msg);
      interactiveNotifications.waitForOpened();
      interactiveNotifications.msgBtn0.sendKeys(Keys.enter);
      interactiveNotifications.waitForClosed();
    }
  );

  test('Should focus on the No button', testOptions,
    function() {
      interactiveNotifications.show(msg);
      interactiveNotifications.waitForOpened();

      interactiveNotifications.banner.sendKeys(Keys.right);
      interactiveNotifications.msgBtn1.scriptWith(function(msgBtn1) {
        return document.activeElement === msgBtn1;
      }, function (err, focusOnNoBtn) {
        assert.ok(focusOnNoBtn, 'Not focus on No button');
      });

      interactiveNotifications.waitForClosed();
    }
  );

  test('Should hide by pressing the No button', testOptions,
    function() {
      msg.timeout = 120 * 60 * 1000;
      interactiveNotifications.show(msg);
      interactiveNotifications.waitForOpened();
      interactiveNotifications.banner.sendKeys(Keys.right);
      interactiveNotifications.msgBtn1.sendKeys(Keys.enter);
      interactiveNotifications.waitForClosed();
    }
  );
});
