'use strict';

var APP_URL = 'app://dashboard.gaiamobile.org';

var Keys = {
  'up': '\ue013',
  'right': '\ue014',
  'down': '\ue015',
  'left': '\ue012'
};

var assert = require('chai').assert;
var tvCfg = require('../tv_configs.json');

marionette('Test Arrow Key Events', function() {

  var opts = {
    apps: {
      'dashboard.gaiamobile.org': tvCfg.apps_folder + '/dashboard'
    },
    hostOptions: {
      screen: {
        width: 1920,
        height: 1080
      }
    }
  };

  var client = marionette.client(opts);

  setup(function() {
    // Launch test app
    client.apps.launch(APP_URL);
    client.apps.switchToApp(APP_URL);
  });

  test('Display top widget after pressing up', function () {
    var element = client.helper.waitForElement('#main-section');
    element.sendKeys(Keys.up);
    assert.equal(element.scriptWith(function(elem) {
      return elem.dataset.activeDirection;
    }), 'up');
    for(var i = 0; i < 100000; i++) {
      console.log('aaaaa');
    }
  });
});
