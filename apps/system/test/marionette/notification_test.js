
var assert = require('assert'),
    NotificationTest = require('./lib/notification'),
    util = require('util');

marionette('notification tests', function() {
  var urls = {
    system: 'app://system.gaiamobile.org',
    email: 'app://email.gaiamobile.org'
  };
  var client = marionette.client();

  test('fire notification', function() {
    var notify =
          new NotificationTest(client, urls.system,
                               '123', 'test title', 'test body');
    assert.ok(notify.containerElement,
              'notification exists in UI with correct tag');
    assert.ok(notify.titleElement, 'title div exists for notification');
    assert.ok(notify.bodyElement, 'body div exists for notification');
    assert.equal(notify.titleText, 'test title', 'notification title correct');
    assert.equal(notify.bodyText, 'test body', 'notification body correct');
  });

  test('replace notification', function() {
    var notify =
          new NotificationTest(client, urls.system,
                               '123', 'test title', 'test body');
    // Calling create notification again reuses the tag
    notify.replace('test title 2', 'test body 2');
    assert.ok(notify.containerElement,
              'notification exists in UI with correct tag');
    assert.ok(notify.titleElement, 'title div exists for notification');
    assert.ok(notify.bodyElement, 'body div exists for notification');
    assert.equal(notify.titleText, 'test title 2',
                 'notification title correct');
    assert.equal(notify.bodyText, 'test body 2', 'notification body correct');
  });

  test('close notification', function() {
    var notify =
          new NotificationTest(client, urls.system,
                               '123', 'test title', 'test body');
    assert.ok(notify.containerElement,
              'notification exists in UI with correct tag');
    notify.close();
    assert.throws(function() { return notify.containerElement; },
                  /Unable to locate element/,
                  'notification removed from UI');
  });

  // function to check if screen status is enabled/disabled
  var screenStatusIs = function(enabled) {
    return client.executeScript(function(enabled) {
      return enabled ?
        window.wrappedJSObject.ScreenManager.screenEnabled :
        !window.wrappedJSObject.ScreenManager.screenEnabled;
    }, [enabled]);
  };
  var screenStatusIsOn = screenStatusIs.bind(null, true);
  var screenStatusIsOff = screenStatusIs.bind(null, false);

  // skipping this test until we can figure out why we see intermittent oranges
  // see also: bug 916730
  test.skip('email notification should not wake screen', function() {
    client.switchToFrame();
    client.executeScript(function() {
      window.wrappedJSObject.ScreenManager.turnScreenOff(true);
    });
    client.waitFor(screenStatusIsOff);
    client.apps.launch(urls.email);
    client.apps.switchToApp(urls.email);
    var notify =
          new NotificationTest(client, urls.email,
                               '123', 'test title', 'test body');

    client.switchToFrame();
    var screenOn = screenStatusIsOn();
    assert.equal(screenOn, false, 'Screen should be off');
  });

});
