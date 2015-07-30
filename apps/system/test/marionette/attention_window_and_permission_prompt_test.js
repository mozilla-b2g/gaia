'use strict';

var assert = require('assert');
var FakeLoopApp = require('./lib/fakeloopapp.js');

marionette('AttentionWindow - Permission Prompt', function() {
  var apps = {};
  apps[FakeLoopApp.DEFAULT_ORIGIN] = __dirname + '/../apps/fakeloopapp';

  var client = marionette.client({
    profile: {
      apps: apps
    },
    desiredCapabilities: { raisesAccessibilityExceptions: true }
  });

  var system;
  var fakeLoop;

  setup(function() {
    system = client.loader.getAppClass('system');
    system.waitForFullyLoaded();

    fakeLoop = new FakeLoopApp(client);
  });

  test('The prompt should be displayed on top of the attention screen',
  function() {
    fakeLoop.launch();
    fakeLoop.waitForTitleShown(true);
    client.switchToFrame();

    // The prompt is displayed
    var prompt = client.helper.waitForElement('#permission-dialog');
    var attention = client.helper.waitForElement('.attentionWindow.active');

    client.waitFor(function() {
      return prompt.displayed();
    });
    assert(prompt.displayed(), 'The prompt is on top');

    client.helper.waitForElement('#permission-yes').click();

    client.waitFor(function() {
      return attention.displayed();
    });
    assert(attention.displayed(), 'The attention window is now visible');
  });
});
