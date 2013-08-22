var Calendar = require('./calendar'),
    assert = require('assert');


marionette('launch calendar', function() {
  var app, client = marionette.client();

  setup(function() {
    app = new Calendar(client);
    app.launch();
  });

  test('should make calendar active', function() {
    assert.ok(app.isActive());
  });
});
