'use strict';

var SettingsApp = require('./lib/panels/settings_app');

marionette('remote privacy protection main panel', function() {
  var client = marionette.client({
    settings: {
      'privacy-panel-gt-complete': true
    }
  });
  var subject;

  setup(function() {
    subject = new SettingsApp(client);
    subject.init();
  });

  test('ftu register form is displayed', function() {
    subject.tapOnMenuItem();

    // Change marionette context to privacy-panel app.
    subject.switchTo('app://privacy-panel.gaiamobile.org');

    client.waitFor(function() {
      return client.findElement(subject.selectors.backToSettings).displayed();
    });

    subject.tapOnBackToSettingsBtn();

    // Change marionette context back to settings app.
    subject.switchTo('app://settings.gaiamobile.org');

    client.waitFor(function() {
      return client.findElement(subject.selectors.ppMenuItem).displayed();
    });
  });

});
