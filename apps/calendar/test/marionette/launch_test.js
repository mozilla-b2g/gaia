/**
 * @const {string}
 */
var CALENDAR_ORIGIN = 'app://calendar.gaiamobile.org';

marionette('launch and switch to calendar', function() {
  var assert = require('assert');
  var client = marionette.client();

  setup(function() {
    client.apps.launch(CALENDAR_ORIGIN);
    client.apps.switchToApp(CALENDAR_ORIGIN);
  });

  test('should bring us to calendar', function() {
    var url = client.getUrl();
    assert.ok(
      url.indexOf(CALENDAR_ORIGIN) !== -1,
      url + ' should contain ' + CALENDAR_ORIGIN
    );
  });
});
