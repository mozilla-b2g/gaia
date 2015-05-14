'use strict';

var APP_NAME = 'modaldialogapp';
var APP_HOST = APP_NAME + '.gaiamobile.org';
var APP_URL = 'app://' + APP_HOST;

var Keys = {
  'enter': '\ue006',
  'right': '\ue014',
  'esc': '\ue00c'
};

var assert = require('chai').assert;
var AppModalDialog = require('./lib/app_modal_dialog');

marionette('Test Modal Dialog Events', function() {

  var opts = {
    apps: {},
    hostOptions: {
      screen: {
        width: 1920,
        height: 1080
      }
    },
    prefs: {
      'b2g.system_startup_url':
        'app://smart-system.gaiamobile.org/index.html',
      'b2g.system_manifest_url':
        'app://smart-system.gaiamobile.org/manifest.webapp',
      'b2g.neterror.url':
        'app://smart-system.gaiamobile.org/net_error.html'
    }
  };

  opts.apps[APP_HOST] = __dirname + '/../apps/' + APP_NAME;

  var client = marionette.client(opts);
  var actions;
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
    actions = client.loader.getActions();
    system = client.loader.getAppClass('smart-system', 'system', 'tv_apps');
    appModalDialog = new AppModalDialog(client);
  });

  function launchModalDialogApp() {
    // Launch test app
    client.apps.launch(APP_URL);
    client.apps.switchToApp(APP_URL);
  }

  test('[tv] alert modal dialog should disappear', function() {
    launchModalDialogApp();
    client.executeAsyncScript(function(options) {
      window.wrappedJSObject.showDialog('alert', options.alert.message);
      marionetteScriptFinished();
    }, [options]);
    client.switchToFrame();

    appModalDialog.waitForDialogOpened(appModalDialog.alertDialog);

    assert.equal(appModalDialog.alertTitle.scriptWith(function(el) {
      return el.textContent;
    }), options.appName);
    assert.equal(appModalDialog.alertMessage.scriptWith(function(el) {
      return el.textContent;
    }), options.alert.message);

    appModalDialog.sendKeyToElement(appModalDialog.alertOk, Keys.enter);
    appModalDialog.waitForDialogClosed(appModalDialog.alertDialog);
  });

  test('[tv] prompt modal dialog should disappear - ok', function() {
    launchModalDialogApp();
    client.executeAsyncScript(function(options) {
      window.wrappedJSObject.showDialog('prompt', options.prompt.message);
      marionetteScriptFinished();
    }, [options]);
    client.switchToFrame();

    appModalDialog.waitForDialogOpened(appModalDialog.promptDialog);

    assert.equal(appModalDialog.promptTitle.scriptWith(function(el) {
      return el.textContent;
    }), options.appName);
    assert.equal(appModalDialog.promptMessage.scriptWith(function(el) {
      return el.textContent;
    }), options.prompt.message);

    appModalDialog.sendKeyToElement(appModalDialog.promptOk, Keys.enter);
    appModalDialog.waitForDialogClosed(appModalDialog.promptDialog);
  });

  test('[tv] prompt modal dialog should disappear - cancel', function() {
    launchModalDialogApp();
    client.executeAsyncScript(function(options) {
      window.wrappedJSObject.showDialog('prompt', options.prompt.message);
      marionetteScriptFinished();
    }, [options]);
    client.switchToFrame();

    appModalDialog.waitForDialogOpened(appModalDialog.promptDialog);

    assert.equal(appModalDialog.promptTitle.scriptWith(function(el) {
      return el.textContent;
    }), options.appName);
    assert.equal(appModalDialog.promptMessage.scriptWith(function(el) {
      return el.textContent;
    }), options.prompt.message);

    appModalDialog.sendKeyToElement(appModalDialog.promptCancel, Keys.enter);
    appModalDialog.waitForDialogClosed(appModalDialog.promptDialog);
  });

  test('[tv] confirm modal dialog should disappear - ok', function() {
    launchModalDialogApp();
    client.executeAsyncScript(function(options) {
      window.wrappedJSObject.showDialog('confirm', options.confirm.message);
      marionetteScriptFinished();
    }, [options]);
    client.switchToFrame();

    appModalDialog.waitForDialogOpened(appModalDialog.confirmDialog);

    assert.equal(appModalDialog.confirmTitle.scriptWith(function(el) {
      return el.textContent;
    }), options.appName);
    assert.equal(appModalDialog.confirmMessage.scriptWith(function(el) {
      return el.textContent;
    }), options.confirm.message);

    appModalDialog.sendKeyToElement(appModalDialog.confirmOk, Keys.enter);
    appModalDialog.waitForDialogClosed(appModalDialog.confirmDialog);
  });

  test('[tv] confirm modal dialog should disappear - cancel', function() {
    launchModalDialogApp();
    client.executeAsyncScript(function(options) {
      window.wrappedJSObject.showDialog('confirm', options.confirm.message);
      marionetteScriptFinished();
    }, [options]);
    client.switchToFrame();

    appModalDialog.waitForDialogOpened(appModalDialog.confirmDialog);

    assert.equal(appModalDialog.confirmTitle.scriptWith(function(el) {
      return el.textContent;
    }), options.appName);
    assert.equal(appModalDialog.confirmMessage.scriptWith(function(el) {
      return el.textContent;
    }), options.confirm.message);

    appModalDialog.sendKeyToElement(appModalDialog.confirmCancel, Keys.enter);
    appModalDialog.waitForDialogClosed(appModalDialog.confirmDialog);
  });

});
