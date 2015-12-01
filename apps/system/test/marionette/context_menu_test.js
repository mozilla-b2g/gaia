/* global __dirname */

'use strict';

var APP_NAME = 'contextmenuapp';
var APP_HOST = APP_NAME + '.gaiamobile.org';
var APP_URL = 'app://' + APP_HOST;

var ENTER_CHAR = '\ue006';

var assert = require('chai').assert;

marionette('Test Context Menu Events', function() {

  var opts = {
    prefs: {
      'clipboard.plainTextOnly': false
    },
    apps: {}
  };

  opts.apps[APP_HOST] = __dirname + '/../apps/' + APP_NAME;

  var client = marionette.client({
    profile: opts
  });
  var actions;

  var answer = Object.freeze({
    link: 'http://example.com/',
    images: ['data:image/png;base64,VBORw0KGgoAAAANSUhEUgAAAAsAAAALC',
             'app://contextmenuapp.gaiamobile.org/images/firefox.png']
  });

  test('Test basic context menu functionality', function() {
    actions = client.loader.getActions();

    // Launch test app
    client.apps.launch(APP_URL);
    client.apps.switchToApp(APP_URL);

    // Long press on a link
    var link = client.helper.waitForElement('#link');
    actions.longPress(link, 1.5).perform();

    // Ensure the share and open tab menu items are present
    client.switchToFrame();
    client.helper.waitForElement('[data-id=open-in-new-window]');
    client.helper.waitForElement('[data-id=share-link]');

    // Cancel the context menu
    var cancel = client.helper.waitForElement('#ctx-cancel-button');
    cancel.click();

    // Long press on an image
    client.apps.switchToApp(APP_URL);
    var image = client.helper.waitForElement('#image1');
    actions.longPress(image, 1.5).perform();

    client.switchToFrame();
    client.helper.waitForElement('[data-id=share-image]');

  });

  test('Test "Copy Link"', function() {
    actions = client.loader.getActions();

    // Launch test app
    client.apps.launch(APP_URL);
    client.apps.switchToApp(APP_URL);

    // Long press on a link
    var link = client.helper.waitForElement('#link');
    actions.longPress(link, 1.5).perform();

    // Make sure 'copy link' option is present and click it
    client.switchToFrame();
    client.helper.waitForElement('[data-id=copy-link]').click();

    // Paste link into contentEditable area
    client.apps.switchToApp(APP_URL);
    var editable = client.helper.waitForElement('#edit-area');
    actions.tap(editable).wait(2).longPress(editable, 3).perform();

    client.switchToFrame();
    var pasteSelector = '.textselection-dialog .textselection-dialog-paste';
    var pasteBtn = client.helper.waitForElement(pasteSelector);
    actions.tap(pasteBtn).perform();

    // Check if the link is correct
    client.apps.switchToApp(APP_URL);
    editable = client.helper.waitForElement('#edit-area');
    var ret = editable.scriptWith(function(e) {
      return e.innerHTML;
    });
    assert.equal(ret, answer.link,
                 'The copied link is not equal to original one.');

  });

  test('Test "Copy Image"', function() {
    actions = client.loader.getActions();

    var copyImage = function(imageSelector, answer) {
      // Long press and copy
      client.apps.switchToApp(APP_URL);
      var image = client.helper.waitForElement(imageSelector);
      actions.longPress(image, 1.5).perform();
      client.switchToFrame();
      client.helper.waitForElement('[data-id=copy-image]').click();

      // Paste
      client.apps.switchToApp(APP_URL);
      var editable = client.helper.waitForElement('#edit-area');
      actions.tap(editable).wait(2).longPress(editable, 3).perform();
      client.switchToFrame();
      var pasteSelector = '.textselection-dialog .textselection-dialog-paste';
      var pasteBtn = client.helper.waitForElement(pasteSelector);
      actions.tap(pasteBtn).perform();
    };

    // Launch test app
    client.apps.launch(APP_URL);
    copyImage('#image1');
    copyImage('#image2');

    // Compare
    client.apps.switchToApp(APP_URL);
    var editable = client.helper.waitForElement('#edit-area');
    assert.isTrue(editable.scriptWith(function(e, ans) {
      var imgs = e.getElementsByTagName('img');
      if (imgs.length != ans.length) {
        return false;
      }
      for (var i = 0; i < imgs.length; ++i) {
        if(imgs[i].getAttribute('src') != ans[i]) {
          return false;
        }
      }
      return true;
    }, [answer.images]), 'Copied images are not correct.');

  });

  test('Close context menu with keyboard', function() {
    actions = client.loader.getActions();

    // Launch test app
    client.apps.launch(APP_URL);
    client.apps.switchToApp(APP_URL);

    // Long press on a link
    var link = client.helper.waitForElement('#link');
    actions.longPress(link, 1.5).perform();

    // Ensure the share and open tab menu items are present
    client.switchToFrame();
    client.helper.waitForElement('[data-id=open-in-new-window]');
    client.helper.waitForElement('[data-id=share-link]');

    // Cancel the context menu
    var cancel = client.helper.waitForElement('#ctx-cancel-button');

    var menu = client.helper.waitForElement('.appWindow.active .contextmenu');

    assert.isTrue(cancel.scriptWith(function(el) {
      return document.activeElement === el;
    }), 'cancel button should be focused.');

    cancel.sendKeys(ENTER_CHAR);

    client.helper.waitForElementToDisappear(menu);

  });

});
