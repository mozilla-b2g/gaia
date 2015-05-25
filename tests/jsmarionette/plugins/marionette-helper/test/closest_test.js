'use strict';
var assert = require('assert');

suite('MarionetteHelper.closest', function() {

  // Require needed files.
  var FakeApp = require('./lib/fake_app');
  marionette.plugin('apps', require('marionette-apps'));
  marionette.plugin('helper', require('../index'));

  var helper;
  var fakeApp;
  var FAKE_APP_ORIGIN = 'fakeapp.gaiamobile.org';

  var apps = {};
  apps[FAKE_APP_ORIGIN] = __dirname + '/fakeapp';

  var testTime;
  var client = marionette.client({
    profile: {
      settings: {
        'ftu.manifestURL': null,
        'lockscreen.enabled': false
      },
      apps: apps
    }
  });

  setup(function(done) {
    helper = client.helper;
    fakeApp = new FakeApp(client, 'app://' + FAKE_APP_ORIGIN);
    fakeApp.launch();
    testTime = new Date();
    setTimeout(done, 2500);  // Instead of using the BootWatcher.
  });


  test('should return closest element that matches the selector', function() {
    var link = client.findElement('a.parent');
    var child = client.findElement('.child');
    assert.equal(helper.closest(child, '.parent').id, link.id);
  });

  test('should loop until it finds "body"', function() {
    var body = client.findElement('body');
    var child = client.findElement('.child');
    assert.equal(helper.closest(child, 'body').id, body.id);
  });

  test('should return "undefined" if it can\'t find it', function() {
    var child = client.findElement('.child');
    assert.equal(helper.closest(child, '#bogus'), undefined);
  });

  test('should allow selector as first argument', function() {
    var link = client.findElement('a.parent');
    assert.equal(helper.closest('.child', '.parent').id, link.id);
  });

  test('should return element itself if it matches selector', function() {
    var link = client.findElement('a.parent');
    assert.equal(helper.closest(link, '.parent').id, link.id);
  });

});
