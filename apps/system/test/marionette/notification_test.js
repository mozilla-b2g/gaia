
var assert = require('assert'),
    NotificationTest = require('./notification'),
    util = require('util');

marionette('notification tests', function() {
  var client = marionette.client();

  test('fire notification', function() {
    var notify =
          new NotificationTest(client, 'app://system.gaiamobile.org',
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
          new NotificationTest(client, 'app://system.gaiamobile.org',
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
          new NotificationTest(client, 'app://system.gaiamobile.org',
                               '123', 'test title', 'test body');
    assert.ok(notify.containerElement,
              'notification exists in UI with correct tag');
    notify.close();
    assert.throws(function() { return notify.containerElement; },
                  /Unable to locate element/,
                  'notification removed from UI');
  });
});
