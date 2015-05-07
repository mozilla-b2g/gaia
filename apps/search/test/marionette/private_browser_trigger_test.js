'use strict';

marionette('Private Browser Trigger', function() {

  var client = marionette.client();

  var search, system;

  setup(function() {
    search = client.loader.getAppClass('search');
    system = client.loader.getAppClass('system');
    system.waitForStartup();
  });

  test('launches private window', function() {
    var frame = system.waitForLaunch(search.URL);
    client.switchToFrame(frame);

    client.helper.waitForElement(
      search.Selectors.privateWindow).click();

    client.switchToFrame();

    var privateUrl = 'app://system.gaiamobile.org/private_browser.html';
    var iframe = system.getAppIframe(privateUrl);
    client.waitFor(function() {
      return iframe.displayed();
    });
  });
});
