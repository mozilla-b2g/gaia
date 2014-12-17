'use strict';

var Actions = require('marionette-client').Actions;
var TaskManager = require('./lib/task_manager');
var FakeApp = require('./lib/fakeapp');
var assert = require('assert');
var ReflowHelper =
    require('../../../../tests/js-marionette/reflow_helper.js');

marionette('Task Manager', function() {
  var firstAppOrigin = 'fakeapp.gaiamobile.org';
  var secondAppOrigin = 'fakegreenapp.gaiamobile.org';
  var apps = {};
  apps[firstAppOrigin] = __dirname + '/fakeapp';
  apps[secondAppOrigin] = __dirname + '/fakegreenapp';

  var client = marionette.client({
    prefs: {
      'dom.w3c_touch_events.enabled': 1
    },
    settings: {
      'ftu.manifestURL': null,
      'lockscreen.enabled': false
    },
    apps: apps
  });

  var actions;
  var system;
  var taskManager;
  var firstApp;
  var secondApp;

  var fullWidth, halfWidth, halfHeight;

  setup(function() {
    actions = new Actions(client);
    system = client.loader.getAppClass('system');
    taskManager = new TaskManager(client);

    system.waitForStartup();

    // Launching 2 apps and wait for their screenshots to be ready
    firstApp = new FakeApp(client, 'app://' + firstAppOrigin);
    firstApp.launch();
    system.goHome();
    system.waitUntilScreenshotable(firstApp.iframe);

    secondApp = new FakeApp(client, 'app://' + secondAppOrigin);
    secondApp.launch();
    system.goHome();
    system.waitUntilScreenshotable(secondApp.iframe);

    fullWidth = client.executeScript(function() {
      return window.innerWidth;
    });
    halfWidth = fullWidth / 2;

    var height = client.executeScript(function() {
      return window.innerHeight;
    });
    halfHeight = height / 2;
  });

  suite('when launched from the homescreen', function() {
    setup(function() {
      taskManager.show();
    });

    test('should display moz-element screenshots for all apps',
    function() {
      var cards = taskManager.cards;
      cards.forEach(function(card) {
        var screenshot = card.findElement(taskManager.selectors.screenshot);
        client.waitFor(function() {
          return screenshot.scriptWith(function(div) {
            return div.style.backgroundImage.contains('-moz-element');
          });
        });
      });
    });

    test('pressing home should take you back to the homescreen',
    function() {
      taskManager.hide();

      client.waitFor(function(){
        return client.findElement(system.Selector.activeHomescreenFrame)
          .displayed();
      });
    });
  });

  suite('when launched from an app', function() {
    setup(function() {
      firstApp.launch();
      taskManager.show();
    });

    test('should display a blob screenshot for the current app',
    function() {
      var current = taskManager.cards[1];
      var screenshot = current.findElement(taskManager.selectors.screenshot);
      client.waitFor(function() {
        return screenshot.scriptWith(function(div) {
          return div.style.backgroundImage.contains('blob');
        });
      });

      var app = taskManager.cards[0];
      var otherScreenshot = app.findElement(taskManager.selectors.screenshot);
      client.waitFor(function() {
        return otherScreenshot.scriptWith(function(div) {
          return div.style.backgroundImage.contains('-moz-element');
        });
      });
    });

    test('pressing home should launch the centered app', function() {
      actions.flick(taskManager.element, 30, halfHeight,
                    halfWidth, halfHeight).perform();

      taskManager.hide();

      client.waitFor(function() {
        return !firstApp.iframe.displayed() && secondApp.iframe.displayed();
      });
    });
  });

  test('swiping then taping should switch app', function() {
    taskManager.show();

    var element = taskManager.element;
    actions.flick(element, 30, halfHeight,
                  halfWidth, halfHeight).perform();
    element.tap();

    client.waitFor(function() {
      return firstApp.iframe.displayed() && !secondApp.iframe.displayed();
    });
  });

  test('swiping should not cause reflows', function() {
    // Since the clock will cause reflows we're disabling it
    // Also disabling the developer hud because of
    // https://bugzilla.mozilla.org/show_bug.cgi?id=971008
    system.stopDevtools();
    system.stopClock();
    system.stopStatusbar();
    var reflowHelper = new ReflowHelper(client);

    taskManager.show();

    reflowHelper.startTracking(system.URL);

    // Going back and forth
    var element = taskManager.element;
    actions.flick(element, 30, halfHeight,
                  halfWidth, halfHeight).perform();
    actions.flick(element, fullWidth, halfHeight,
                  halfWidth, halfHeight).perform();

    var count = reflowHelper.getCount();
    assert.equal(count, 0, 'we got ' + count + ' reflows instead of 0');
    reflowHelper.stopTracking();
  });
});
