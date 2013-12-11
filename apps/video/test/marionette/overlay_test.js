var videoApp = require('./lib/video.js');

marionette('video overlay', function() {
  var assert = require('assert');
  var client = marionette.client({
    prefs: {
      'device.storage.enabled': true,
      'device.storage.testing': true,
      'device.storage.prompt.testing': true
    }
  });
  var app;

  setup(function() {
    app = new videoApp(client);
    app.launch();
  });

  test('> check for empty overlay', function() {
    assert.ok(app.overlay.displayed(), 'The list should be empty');
  });
});
