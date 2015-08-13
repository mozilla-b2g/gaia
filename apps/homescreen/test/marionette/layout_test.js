'use strict';
var assert = require('assert');

marionette('Homescreen - Layout', function() {

  var client = marionette.client({
    profile: require(__dirname + '/client_options.js'),
    desiredCapabilities: { raisesAccessibilityExceptions: true }
  });
  var actions, home, system;

  setup(function() {
    actions = client.loader.getActions();
    home = client.loader.getAppClass('homescreen');
    system = client.loader.getAppClass('system');
    system.waitForFullyLoaded();
    home.waitForLaunch();
  });

  test('apps grid is LTR in LTR language', function() {
    var icons = home.icons;
    var app1Location = icons[0].location();
    var app2Location = icons[1].location();
    var app3Location = icons[2].location();
    var gridWidth = home.container.size().width;

    // check that they are all on the same line
    assert.equal(app1Location.y, app2Location.y,
                 '1st and 2nd apps should be on the same line.');
    assert.equal(app2Location.y, app3Location.y,
                 '2nd and 3rd apps should be on the same line.');

    // check left-alignement
    assert.ok(app1Location.x < gridWidth / 3, 'First app is left-aligned');
    // check the ordering
    assert.ok(app1Location.x < app2Location.x,
              'App1 icon should be on the left of app2 icon');
    assert.ok(app2Location.x < app3Location.x,
              'App2 icon should be on the left of app3 icon');
  });

  test('apps grid is RTL in RTL language', function() {
    client.switchToFrame();
    client.settings.set('language.current', 'qps-plocm');
    client.switchToFrame(system.getHomescreenIframe());

    // Localization can be async, wait for the content to update
    var localizedPhoneName =
      home.localizedAppName('communications', 'dialer', 'qps-plocm');
    client.waitFor(function() {
      return !!home.getIconByName(localizedPhoneName);
    });

    // Relayout on localisation change is animated, so wait for it to finish
    actions.wait(1).perform();

    var icons = home.icons;
    var app1Location = icons[0].location();
    var app2Location = icons[1].location();
    var app3Location = icons[2].location();
    var gridWidth = home.container.size().width;

    // check that they are all on the same line
    assert.equal(app1Location.y, app2Location.y,
                 '1st and 2nd apps should be on the same line.');
    assert.equal(app2Location.y, app3Location.y,
                 '2st and 3nd apps should be on the same line.');

    // check right-alignement
    assert.ok(app1Location.x > gridWidth / 2, 'First app is right-aligned');
    // check the ordering
    assert.ok(app1Location.x > app2Location.x,
              'App1 icon should be on the right of app2 icon');
    assert.ok(app2Location.x > app3Location.x,
              'App2 icon should be on the right of app3 icon');
  });
});
