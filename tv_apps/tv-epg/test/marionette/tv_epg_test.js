'use strict';

var APP_URL = 'app://tv-epg.gaiamobile.org';
var SHARED_PATH = __dirname + '/../../../../shared/test/integration/';

var Keys = {
  'up': '\ue013',
  'right': '\ue014',
  'down': '\ue015',
  'left': '\ue012'
};

var assert = require('chai').assert;

// Bug 1207453 - Skip the test due to unknown test enviroment issue for now.
// We should investigate the issue and re-enable the test later.
marionette.skip('Test Program Navigation', function() {

  var opts = {
    apps: {},
    hostOptions: {
      screen: {
        width: 1480,
        height: 960
      }
    }
  };

  var client = marionette.client({
    profile: opts,
    // XXX: Set this to true once Accessibility is implemented in TV
    desiredCapabilities: { raisesAccessibilityExceptions: false }
  });
  var actions;

  setup(function() {
    actions = client.loader.getActions();
    launchModalDialogApp();
  });

  function launchModalDialogApp() {
    // Launch test app
    client.contentScript.inject(SHARED_PATH + '/mock_tv_service.js');
    client.apps.launch(APP_URL);
    client.apps.switchToApp(APP_URL);
  }

  test('Wait for focus element', {devices: ['tv']},function() {
    client.helper.waitForElement('#program-list .focus');
  });

  test('Key down five times', {devices: ['tv']},function() {
    client.helper.waitForElement('#program-list .focus');
    var body = client.helper.waitForElement('body');
    var i;
    for(i = 0; i < 5; i++) {
      body.sendKeys(Keys.down);
    }

    var transform = client.helper.waitForElement('#program-list').scriptWith(
      function(element) {
        return element.style.transform;
    });

    var reg = /^translate\([\d\.\-]+(?:rem|px)?,\s*([\d\.\-]+)/i;
    assert.notEqual(reg.exec(transform)[1], '0');
  });

  test('Key down five times and then key up five times', {devices: ['tv']},
    function() {
      client.helper.waitForElement('#program-list .focus');
      var body = client.helper.waitForElement('body');
      var i;
      for(i = 0; i < 5; i++) {
        body.sendKeys(Keys.down);
      }

      for(i = 0; i < 5; i++) {
        body.sendKeys(Keys.up);
      }

      var transform = client.helper.waitForElement('#program-list').scriptWith(
        function(element) {
          return element.style.transform;
      });

      var reg = /^translate\([\d\.\-]+(?:rem|px)?,\s*([\d\.\-]+)/i;
      assert.equal(reg.exec(transform)[1], '0');
  });

  test('Key left', {devices: ['tv']},function() {
    client.helper.waitForElement('#program-list .focus');
    var body = client.helper.waitForElement('body');
    var initialTitle =
      client.helper.waitForElement('#program-title').scriptWith(
        function(element) {
          return element.textContent;
      });
    body.sendKeys(Keys.left);

    var transform = client.helper.waitForElement('#program-list').scriptWith(
      function(element) {
        return element.style.transform;
    });
    var reg = /^translate\(([\d\.\-]+)/i;
    assert.notEqual(reg.exec(transform)[1], '0');

    var newTitle = client.helper.waitForElement('#program-title').scriptWith(
      function(element) {
        return element.textContent;
    });
    assert.notEqual(initialTitle, newTitle);
  });

  test('Key right four times', {devices: ['tv']},function() {
    client.helper.waitForElement('#program-list .focus');
    var body = client.helper.waitForElement('body');
    var i;
    for(i = 0; i < 4; i++) {
      body.sendKeys(Keys.right);
    }
    var transform = client.helper.waitForElement('#program-list').scriptWith(
      function(element) {
        return element.style.transform;
    });
    var reg = /^translate\(([\d\.\-]+)/i;
    assert.notEqual(reg.exec(transform)[1], '0');
  });
});
