var assert = require('assert');

var CALENDAR_APP = 'app://calendar.gaiamobile.org';
var CALENDAR_APP_MANIFEST = CALENDAR_APP + '/manifest.webapp';

marionette('Notification.get():', function() {
  var client = marionette.client({
    settings: {
      'ftu.manifestURL': null
    }
  });

  test('promise is fulfilled', function(done) {
    var error = client.executeAsyncScript(function() {
      if (!Notification.get) {
        return marionetteScriptFinished('no .get memeber');
      }

      var promise = Notification.get();
      if (!promise || !promise.then) {
        return marionetteScriptFinished('no promise returned');
      }

      promise.then(
        function(notifications) {
          marionetteScriptFinished(false);
        },
        function(err) {
          marionetteScriptFinished('promise errored');
        });
    });
    assert.equal(error, false, 'Notification.get fulfilled promise');
    done();
  });

  test('promise returns a new notification', function(done) {
    var error = client.executeAsyncScript(function() {
      try {
        var title = 'test title';
        var notification = new Notification(title);
        var promise = Notification.get();
        promise.then(function(notifications) {
          if (!notifications || !notifications.length) {
            marionetteScriptFinished('get returned no notifications');
          }
          var found = notifications.some(function(notification) {
            return notification.title === title;
          });
          if (!found) {
            marionetteScriptFinished('new notification not returned');
          }
          // success, return no error
          marionetteScriptFinished(false);
        }, function(error) {
          marionetteScriptFinished('promise.then error :' + error);
        });
      } catch (error) {
        marionetteScriptFinished('uncaught error: ' + error);
      }
    });
    assert.equal(error, false, 'new notification error: ' + error);
    done();
  });

  test('get works with tag option', function(done) {
    var error = client.executeAsyncScript(function() {
      try {
        var title = 'test title, tag';
        var options = {
          tag: 'my tag:' + Date.now()
        };
        var notification = new Notification(title, options);
        var promise = Notification.get({tag: options.tag});
        promise.then(function(notifications) {
          if (!notifications) {
            marionetteScriptFinished('promise return no notifications');
          }
          if (notifications.length !== 1) {
            marionetteScriptFinished('tag filter did not give us 1 result');
          }
          var n = notifications[0];
          if (n.title !== title || n.tag !== options.tag) {
            marionetteScriptFinished('tag filter returned wrong notification');
          }
          // success, return no error
          marionetteScriptFinished(false);
        }, function(error) {
          marionetteScriptFinished('promise.then error: ' + error);
        });
      } catch (error) {
        marionetteScriptFinished('uncaught error: ' + error);
      }
    });
    assert.equal(error, false, 'get with tag error: ' + error);
    done();
  });

  test('should work across domains', function(done) {
    var sharedTag = 'shared tag:' + Date.now();
    var emailTitle = 'email title:' + Date.now();
    var systemTitle = 'system tite:' + Date.now();

    // switch to email app and send notification
    client.apps.launch(CALENDAR_APP);
    client.apps.switchToApp(CALENDAR_APP);
    client.executeScript(function(title, tag) {
      var notification = new Notification(title, {tag: tag});
    }, [emailTitle, sharedTag]);

    // switch to system app and send system notification
    client.switchToFrame();
    client.executeScript(function(title, tag) {
      var notification = new Notification(title, {tag: tag});
    }, [systemTitle, sharedTag]);

    // switch back to email, and fetch notification by tag
    client.apps.launch(CALENDAR_APP);
    client.apps.switchToApp(CALENDAR_APP);
    var error = client.executeAsyncScript(function(title, tag) {
      var promise = Notification.get({tag: tag});
      promise.then(function(notifications) {
        if (!notifications || notifications.length !== 1) {
          marionetteScriptFinished('no notifications returned');
        }
        var notification = notifications[0];
        if (notification.tag !== tag || notification.title !== title) {
          marionetteScriptFinished('incorrent notification data returned');
        }
        // success, return no error
        marionetteScriptFinished(false);
      }, function(error) {
        marionetteScriptFinished('promise.then error: ' + error);
      });
    }, [emailTitle, sharedTag]);
    assert.equal(error, false, 'email domain error: ' + error);

    // switch to system app, fetch it's notifications by tag
    client.switchToFrame();
    error = client.executeAsyncScript(function(title, tag) {
      var promise = Notification.get({tag: tag});
      promise.then(function(notifications) {
        if (!notifications || notifications.length !== 1) {
          marionetteScriptFinished('no notifications returned');
        }
        var notification = notifications[0];
        if (notification.tag !== tag || notification.title !== title) {
          marionetteScriptFinished('incorrent notification data returned');
        }
        // success, return no error
        marionetteScriptFinished(false);
      }, function(error) {
        marionetteScriptFinished('promise.then error: ' + error);
      });
    }, [emailTitle, sharedTag]);
    assert.equal(error, false, 'system domain error: ' + error);
    done();
  });

  test('notifications should persist even after closing app', function(done) {
    var title = 'test title:' + Date.now();
    var tag = 'test tag:' + Date.now();

    client.apps.launch(CALENDAR_APP);
    client.apps.switchToApp(CALENDAR_APP);

    client.executeScript(function(title, tag) {
      var notification = new Notification(title, {tag: tag});
    }, [title, tag]);

    client.switchToFrame();
    client.apps.close(CALENDAR_APP);

    client.apps.launch(CALENDAR_APP);
    client.apps.switchToApp(CALENDAR_APP);

    error = client.executeAsyncScript(function(title, tag) {
      var promise = Notification.get({tag: tag});
      promise.then(function(notifications) {
        if (!notifications || notifications.length !== 1) {
          marionetteScriptFinished('no notifications returned');
        }
        var notification = notifications[0];
        if (notification.tag !== tag || notification.title !== title) {
          marionetteScriptFinished('incorrent notification data returned');
        }
        // success, return no error
        marionetteScriptFinished(false);
      }, function(error) {
        marionetteScriptFinished('promise.then error: ' + error);
      });
    }, [title, tag]);
    assert.equal(error, false, 'notification persist error: ' + error);
    done();
  });
});
