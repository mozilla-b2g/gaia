define(function(require) {
'use strict';

var settingsObserver = require('observer/settings_observer');

suite('observer/settings_observer', function() {
  var app;

  setup(function(done) {
    app = testSupport.calendar.app();
    settingsObserver.settingsStore = app.store('Setting');
    app.db.open(done);
  });

  setup(function(done) {
    settingsObserver.init().then(() => done());
  });

  test('should emit correct value for setting', function() {
    // TODO
  });
});

});
