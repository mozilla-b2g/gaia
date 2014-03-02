marionette('First Time Use >', function() {
  var assert = require('assert');
  var FTU = 'app://communications.gaiamobile.org';

  var client = marionette.client();

  var clickThruPanel = function(panel_id, button_id) {
    if (panel_id == '#wifi') {
      // The wifi panel will bring up a screen to show it is scanning for
      // networks. Not waiting for this to clear will blow test timing and cause
      // things to fail.
      client.helper.waitForElementToDisappear('#loading-overlay');
    }
    // waitForElement is used to make sure animations and page changes have
    // finished, and that the panel is displayed.
    client.helper.waitForElement(panel_id);
    if (button_id) {
      var button = client.waitForElement(button_id);
      button.click();
    }
  };

  test('FTU comes up on profile generation', function() {
    client.apps.switchToApp(FTU);
  });

  test('FTU click thru', function() {
    client.apps.switchToApp(FTU);
    clickThruPanel('#languages', '#forward');
    clickThruPanel('#wifi', '#forward');
    clickThruPanel('#date_and_time', '#forward');
    clickThruPanel('#geolocation', '#forward');
    clickThruPanel('#import_contacts', '#forward');
    clickThruPanel('#welcome_browser', '#forward');
    clickThruPanel('#browser_privacy', '#forward');
    clickThruPanel('#finish-screen', undefined);
  });

  test('FTU Wifi Scanning Tests', function() {
    client.apps.switchToApp(FTU);
    clickThruPanel('#languages', '#forward');
    clickThruPanel('#wifi', '#forward');
    clickThruPanel('#date_and_time', '#back');
    clickThruPanel('#wifi', undefined);
  });

});
