'use strict';

var assert = require('chai').assert;
var AppModalDialog = require('./lib/app_modal_dialog');

// 2nd verification
marionette('Test Modal Dialog Events', function() {

  var APP_NAME = 'modaldialogapp';
  var APP_HOST = APP_NAME + '.gaiamobile.org';
  var APP_URL = 'app://' + APP_HOST;

  var Keys = {
    'enter': '\ue006',
    'right': '\ue014',
    'esc': '\ue00c'
  };

  var opts = {
    apps: {},
    hostOptions: {
      screen: {
        width: 1920,
        height: 1080
      }
    }
  };

  opts.apps[APP_HOST] = __dirname + '/../apps/' + APP_NAME;

  var client = marionette.client({
    profile: opts,
    // XXX: Set this to true once Accessibility is implemented in TV
    desiredCapabilities: { raisesAccessibilityExceptions: false }
  });
  var testOptions = { devices: ['tv'] };
  var system;
  var appModalDialog;
  var options = {
    // App name should be the same name in modaldialogapp/manifest.webapp,
    // appName will show on alert/prompt/confirm title and we will verify it
    // shows un-escaped message on it.
    appName: '>>> Modal Dialog <<<',
    // We are going to pass message with special characters to modal dialog
    // and verify it shows un-escaped message as expected.
    alert: {
      message: '<b>Alert message</b>'
    },
    prompt: {
      message: '<u>Prompt message</u>'
    },
    confirm: {
      message: '<i>Confrim message</i>'
    }
  };

  setup(function() {
    system = client.loader.getAppClass('smart-system', 'system', 'tv_apps');
    system.waitForFullyLoaded();
    appModalDialog = new AppModalDialog(client);
    // Launch test app
    client.switchToFrame();
    client.apps.launch(APP_URL);
    client.apps.switchToApp(APP_URL);
  });

  test('alert modal dialog should disappear', testOptions, function() {
    client.executeAsyncScript(function(options) {
      window.wrappedJSObject.showDialog('alert', options.alert.message);
      marionetteScriptFinished();
    }, [options]);

    client.switchToFrame();

    appModalDialog.waitForDialogOpened(appModalDialog.alertDialog);

    appModalDialog.alertMessage.scriptWith(function (el) {
      return el.textContent;
    }, function (err, text) {
      if (err) {
        throw err;
      }
      assert.equal(text, options.alert.message);
    });

    appModalDialog.sendKeyToElement(appModalDialog.alertOk, Keys.enter);

    appModalDialog.waitForDialogClosed(appModalDialog.alertDialog);
  });

  test('alert modal dialog should focus on ok when opened', testOptions,
    function() {
      client.executeAsyncScript(function(options) {
        window.wrappedJSObject.showDialog('alert', options.alert.message);
        marionetteScriptFinished();
      }, [options]);

      client.switchToFrame();

      appModalDialog.waitForDialogOpened(appModalDialog.alertDialog);

      appModalDialog.alertOk.scriptWith(function(el) {
        return document.activeElement === el;
      }, function (err, isActive) {
        assert.ok(isActive, 'Not focusing on ok');
      });
    });

  test('prompt modal dialog should disappear - ok', testOptions,
    function() {
      client.executeAsyncScript(function(options) {
        window.wrappedJSObject.showDialog('prompt', options.prompt.message);
        marionetteScriptFinished();
      }, [options]);

      client.switchToFrame();

      appModalDialog.waitForDialogOpened(appModalDialog.promptDialog);

      appModalDialog.promptMessage.scriptWith(function(el) {
        return el.textContent;
      }, function (err, text) {
        assert.equal(text, options.prompt.message);
      });

      appModalDialog.sendKeyToElement(appModalDialog.promptOk, Keys.enter);

      appModalDialog.waitForDialogClosed(appModalDialog.promptDialog);
    });

  test('prompt modal dialog should disappear - cancel', testOptions,
    function() {
      client.executeAsyncScript(function(options) {
        window.wrappedJSObject.showDialog('prompt', options.prompt.message);
        marionetteScriptFinished();
      }, [options]);

      client.switchToFrame();

      appModalDialog.waitForDialogOpened(appModalDialog.promptDialog);

      appModalDialog.promptMessage.scriptWith(function(el) {
        return el.textContent;
      }, function (err, text) {
        assert.equal(text, options.prompt.message);
      });

      appModalDialog.sendKeyToElement(appModalDialog.promptCancel, Keys.enter);

      appModalDialog.waitForDialogClosed(appModalDialog.promptDialog);
    });

  test('prompt modal dialog should focus on input when opened', testOptions,
    function() {
      client.executeAsyncScript(function(options) {
        window.wrappedJSObject.showDialog('prompt', options.prompt.message);
        marionetteScriptFinished();
      }, [options]);

      client.switchToFrame();

      appModalDialog.waitForDialogOpened(appModalDialog.promptDialog);

      appModalDialog.promptInput.scriptWith(function(el) {
        return document.activeElement === el;
      }, function (err, isActive) {
        assert.ok(isActive, 'Not focusing on prompt input');
      });
    });

  test('confirm modal dialog should disappear - ok', testOptions,
    function() {
      client.executeAsyncScript(function(options) {
        window.wrappedJSObject.showDialog('confirm', options.confirm.message);
        marionetteScriptFinished();
      }, [options]);

      client.switchToFrame();

      appModalDialog.waitForDialogOpened(appModalDialog.confirmDialog);

      appModalDialog.confirmMessage.scriptWith(function(el) {
        return el.textContent;
      }, function (err, text) {
        if (err) {
          throw err;
        }
        assert.equal(text, options.confirm.message);
      });

      appModalDialog.sendKeyToElement(appModalDialog.confirmOk, Keys.enter);

      appModalDialog.waitForDialogClosed(appModalDialog.confirmDialog);
    });

  test('confirm modal dialog should disappear - cancel', testOptions,
    function() {
      client.executeAsyncScript(function(options) {
        window.wrappedJSObject.showDialog('confirm', options.confirm.message);
        marionetteScriptFinished();
      }, [options]);

      client.switchToFrame();

      appModalDialog.waitForDialogOpened(appModalDialog.confirmDialog);

      appModalDialog.confirmMessage.scriptWith(function(el) {
        return el.textContent;
      }, function (err, text) {
        if (err) {
          throw err;
        }
        assert.equal(text, options.confirm.message);
      });

      appModalDialog.sendKeyToElement(appModalDialog.confirmCancel, Keys.enter);

      appModalDialog.waitForDialogClosed(appModalDialog.confirmDialog);
    });

  test('confirm modal dialog should focus on ok when opened', testOptions,
    function() {
      client.executeAsyncScript(function(options) {
        window.wrappedJSObject.showDialog('confirm', options.confirm.message);
        marionetteScriptFinished();
      }, [options]);

      client.switchToFrame();

      appModalDialog.waitForDialogOpened(appModalDialog.confirmDialog);

      appModalDialog.confirmOk.scriptWith(function(el) {
        return document.activeElement === el;
      }, function (err, isActive) {
        assert.ok(isActive, 'Not focusing on ok button');
      });
    });

});
