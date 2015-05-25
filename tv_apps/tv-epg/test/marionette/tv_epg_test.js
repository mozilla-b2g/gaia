'use strict';

var APP_URL = 'app://tv-epg.gaiamobile.org';
var SHARED_PATH = __dirname + '/../../../../shared/js/smart-screen/';

var Keys = {
  'up': '\ue013',
  'right': '\ue014',
  'down': '\ue015',
  'left': '\ue012'
};

var assert = require('chai').assert;

marionette('Test Program Navigation', function() {

  var opts = {
    apps: {},
    hostOptions: {
      screen: {
        width: 1480,
        height: 960
      }
    }
  };

  var client = marionette.client({profile: opts});
  var actions;

  setup(function() {
    actions = client.loader.getActions();
    launchModalDialogApp();
  });

  function launchModalDialogApp() {
    // Launch test app
    client.contentScript.inject(SHARED_PATH + '/fake_tv_service.js');
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
    body.sendKeys(Keys.left);

    var transform = client.helper.waitForElement('#program-list').scriptWith(
      function(element) {
        return element.style.transform;
    });
    var reg = /^translate\(([\d\.\-]+)/i;
    assert.notEqual(reg.exec(transform)[1], '0');
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
