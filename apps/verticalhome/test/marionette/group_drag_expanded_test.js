'use strict';

var Actions = require('marionette-client').Actions;
var assert = require('assert');

marionette('Vertical - Group', function() {

  var client = marionette.client({
    profile: require(__dirname + '/client_options.js')
  });
  var actions, home, system;

  setup(function() {
    actions = new Actions(client);
    home = client.loader.getAppClass('verticalhome');
    system = client.loader.getAppClass('system');
    system.waitForFullyLoaded();

    client.apps.launch(home.URL);
    home.waitForLaunch();
  });

  test('check that dragging an expanded group collapses correctly', function() {
    function getRect(el) {
      return el.getBoundingClientRect();
    }

    // Store the metrics of the first group
    var background = client.findElement(home.Selectors.groupBackground);
    var bgRect = background.scriptWith(getRect);

    // Initiate a drag by long-pressing at the top-middle of the background
    // element, then wait for it to collapse
    actions.press(background, bgRect.width/2, 0).wait(3).perform();

    var bgRectAfter = background.scriptWith(getRect);

    // Check that the background is smaller, but still in the same position
    assert.equal(bgRect.x, bgRectAfter.x);
    assert.equal(bgRect.y, bgRectAfter.y);
    assert.ok(bgRectAfter.height < bgRect.height);
  });
});
