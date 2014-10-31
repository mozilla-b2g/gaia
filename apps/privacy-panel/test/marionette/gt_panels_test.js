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
    var transitionInterval = 1000;
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
      return panels.welcome.displayed();
    }, { interval: transitionInterval });

    // Welcome panel - clicking on it should redirec us to ala explain panel.
    panels.welcome.findElement('.btn-blue').click();
    client.waitFor(function() {
      return panels.alaExplain.displayed();
    }, { interval: transitionInterval });

    // Ala explain panel - redirect to Ala blur panel
    panels.alaExplain.findElement('.btn-blue').click();
    client.waitFor(function() {
      return panels.alaBlur.displayed();
    }, { interval: transitionInterval });

    // Ala blur panel - redirect to Ala custom panel
    panels.alaBlur.findElement('.btn-blue').click();
    client.waitFor(function() {
      return panels.alaCustom.displayed();
    }, { interval: transitionInterval });

    // Ala custom panel - redirect to Ala exceptions panel
    panels.alaCustom.findElement('.btn-blue').click();
    client.waitFor(function() {
      return panels.alaExceptions.displayed();
    }, { interval: transitionInterval });

    // Ala exceptions panel - redirect to Rpp explain panel
    panels.alaExceptions.findElement('.btn-blue').click();
    client.waitFor(function() {
      return panels.rppExplain.displayed();
    }, { interval: transitionInterval });

    // Rpp explain panel - redirect to Rpp passphrase panel
    panels.rppExplain.findElement('.btn-blue').click();
    client.waitFor(function() {
      return panels.rppPassphrase.displayed();
    }, { interval: transitionInterval });

    // Rpp passphrase panel - redirect to Rpp locate panel
    panels.rppPassphrase.findElement('.btn-blue').click();
    client.waitFor(function() {
      return panels.rppLocate.displayed();
    }, { interval: transitionInterval });

    // Rpp locate panel - redirect to Rpp ring panel
    panels.rppLocate.findElement('.btn-blue').click();
    client.waitFor(function() {
      return panels.rppRing.displayed();
    }, { interval: transitionInterval });

    // Rpp ring panel - redirect to Rpp lock panel
    panels.rppRing.findElement('.btn-blue').click();
    client.waitFor(function() {
      return panels.rppLock.displayed();
    }, { interval: transitionInterval });

    // Rpp lock panel (end of flow) - redirect to root panel
    panels.rppLock.findElement('.btn-blue').click();
    client.waitFor(function() {
      return panels.root.displayed();
    }, { interval: transitionInterval });
  });
});
