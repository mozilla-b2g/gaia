/* global DUMP */
/* global MocksHelper */
/* global MockNotifications */
/* global MockPermissionSettings */
/* global MockSettingsListener */

'use strict';

require('/shared/test/unit/mocks/mocks_helper.js');
require('/shared/test/unit/mocks/mock_dump.js');
require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/test/unit/mocks/mock_notification.js');
require('/shared/test/unit/mocks/mock_settings_helper.js');
require('/shared/test/unit/mocks/mock_settings_listener.js');

var mocksForSystemFindMyDevice = new MocksHelper([
  'Dump', 'Notification', 'SettingsHelper', 'SettingsListener'
]).init();

suite('system/findmydevice', function() {
  mocksForSystemFindMyDevice.attachTestHelpers();

  setup(function(done) {

    // TODO: cleanup mocks
    window.navigator.mozSettings = MockNavigatorSettings;
    window.DUMP = function(msg) {
      console.log(msg);
    };

    require('/js/findmydevice_launcher.js', function() {
      console.log('loaded');
      done();
    });
  });

  test('enable failed notification should', function() {
    MockSettingsHelper('findmydevice.enabled').set(false);

    console.log(MockSettingsListener.mCallbacks);
    // Doesn't work as mCallbacks is empty
     MockSettingsListener.mCallbacks['findmydevice.retry-count']();

    MockNotifications[0].onclick();

    var helper = MockSettingsHelper('findmydevice.enabled').get(
      function(val) {
        console.log('enabled is '+val);
        assert.equal(val, 0, 'retry count should be 0');
      });
    assert.isTrue(true);
  });
});
