/**
 * @const {string}
 */
var CALENDAR_ORIGIN = 'app://calendar.gaiamobile.org';


// TODO(gareth): This just looks silly.
marionette.plugin(
  'apps',
  require('../../../../shared/test/integration/node_modules/marionette-apps'
);


marionette('launch and switch to calendar', function() {
  var client = marionette.client();

  setup(function() {
    client.apps.launch(CALENDAR_ORIGIN);
    client.apps.switchToApp(CALENDAR_ORIGIN);
  });

  test('should bring us to calendar', function() {
    var url = client.getUrl();
    assert.strictEqual(url, 'calendar.gaiamobile.org');
  });
});
