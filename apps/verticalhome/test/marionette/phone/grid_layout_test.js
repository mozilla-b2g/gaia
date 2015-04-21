'use strict';
var assert = require('assert');

marionette('Vertical - grid', function() {

  var client = marionette.client(require(__dirname + '/client_options.js'));
  var actions, home, system;

  setup(function() {
    actions = client.loader.getActions();
    home = client.loader.getAppClass('verticalhome');
    system = client.loader.getAppClass('system');
    system.waitForStartup();
    home.waitForLaunch();
  });

  test('apps grid is LTR in LTR language', function() {
    var app1Location = home.getNthIcon(1).location();
    var app2Location = home.getNthIcon(2).location();
    var app3Location = home.getNthIcon(3).location();
    var gridWidth = client.helper.waitForElement(home.Selectors.grid).size()
      .width;

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
    var communicationManifestUrl =
      'app://communications.gaiamobile.org/manifest.webapp';

    client.settings.set('language.current', 'qps-plocm');

    // Localization can be async, wait for the content to update
    client.waitFor(function() {
      var phoneIcon = home.getIcon(communicationManifestUrl, 'dialer');
      return phoneIcon.text() ===
        home.localizedAppName('communications', 'dialer', 'qps-plocm');
    });

    var app1Location = home.getNthIcon(1).location();
    var app2Location = home.getNthIcon(2).location();
    var app3Location = home.getNthIcon(3).location();
    var gridWidth = client.helper.waitForElement(home.Selectors.grid).size()
      .width;

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
