'use strict';

var PRIVACYPANEL_TEST_APP = 'app://privacy-panel.gaiamobile.org';

marionette('check guided tour panels', function() {
  var client = marionette.client({});

  setup(function() {
    client.apps.launch(PRIVACYPANEL_TEST_APP);
    client.apps.switchToApp(PRIVACYPANEL_TEST_APP);
    client.helper.waitForElement('body');
  });

  test('ability get through guided tour flow', function() {
    var panels = {
      root:          client.findElement('#root'),
      welcome:       client.findElement('#gt-main'),
      alaExplain:    client.findElement('#la-explain'),
      alaBlur:       client.findElement('#la-blur'),
      alaCustom:     client.findElement('#la-custom'),
      alaExceptions: client.findElement('#la-exceptions'),
      rppExplain:    client.findElement('#rpp-explain'),
      rppPassphrase: client.findElement('#rpp-passphrase'),
      rppLocate:     client.findElement('#rpp-locate'),
      rppRing:       client.findElement('#rpp-ring'),
      rppLock:       client.findElement('#rpp-lock')
    };

    // Start with loading gt welcome panel.
    client.findElement('#menu-item-gt').click();
    client.waitFor(function() {
      return (panels.welcome.displayed()&&
        !(panels.root.displayed()));
    });

    // Welcome panel - clicking on it should redirec us to ala explain panel.
    panels.welcome.findElement('.btn-blue').click();
    client.waitFor(function() {
      return (panels.alaExplain.displayed()&&
        !(panels.welcome.displayed()));
    });

    // Ala explain panel - redirect to Ala blur panel
    panels.alaExplain.findElement('.btn-blue').click();
    client.waitFor(function() {
      return (panels.alaBlur.displayed()&&
	!(panels.alaExplain.displayed()));
    });

    // Ala blur panel - redirect to Ala custom panel
    panels.alaBlur.findElement('.btn-blue').click();
    client.waitFor(function() {
      return (panels.alaCustom.displayed()&&
	!(panels.alaBlur.displayed()));
    });

    // Ala custom panel - redirect to Ala exceptions panel
    panels.alaCustom.findElement('.btn-blue').click();
    client.waitFor(function() {
      return (panels.alaExceptions.displayed()&&
	!(panels.alaCustom.displayed()));
    });

    // Ala exceptions panel - redirect to Rpp explain panel
    panels.alaExceptions.findElement('.btn-blue').click();
    client.waitFor(function() {
      return (panels.rppExplain.displayed()&&
	!(panels.alaExceptions.displayed()));
    });

    // Rpp explain panel - redirect to Rpp passphrase panel
    panels.rppExplain.findElement('.btn-blue').click();
    client.waitFor(function() {
      return (panels.rppPassphrase.displayed()&&
	!(panels.rppExplain.displayed()));
    });

    // Rpp passphrase panel - redirect to Rpp locate panel
    panels.rppPassphrase.findElement('.btn-blue').click();
    client.waitFor(function() {
      return (panels.rppLocate.displayed()&&
	!(panels.rppPassphrase.displayed()));
    });

    // Rpp locate panel - redirect to Rpp ring panel
    panels.rppLocate.findElement('.btn-blue').click();
    client.waitFor(function() {
      return (panels.rppRing.displayed()&&
	!(panels.rppLocate.displayed()));
    });

    // Rpp ring panel - redirect to Rpp lock panel
    panels.rppRing.findElement('.btn-blue').click();
    client.waitFor(function() {
      return (panels.rppLock.displayed()&&
	!(panels.rppRing.displayed()));
    });

    // Rpp lock panel (end of flow) - redirect to root panel
    panels.rppLock.findElement('.btn-blue').click();
    client.waitFor(function() {
      return (panels.root.displayed()&&
	!(panels.rppLock.displayed()));
    });
  });
});
