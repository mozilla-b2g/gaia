'use strict';

marionette('Private Browsing', function() {

  var client = marionette.client({
    profile: {
      settings: {
        'browser.private.default': true
      }
    }
  });

  var search, system;

  setup(function() {
    search = client.loader.getAppClass('search');
    system = client.loader.getAppClass('system');
    system.waitForFullyLoaded();
  });

  test('launches private window', function() {
    client.executeScript(function () {
      window.dispatchEvent(new CustomEvent('new-private-window'));
    });

    client.helper.waitForElement('body');

    var iframe = system.getAppIframe(search.privateBrowserUrl);

    client.waitFor(function() {
      return iframe.getAttribute('src') === search.privateBrowserUrl;
    });
  });

  test('launches non-private window', function() {
    client.executeScript(function () {
      window.dispatchEvent(new CustomEvent('new-non-private-window'));
    });

    client.helper.waitForElement('body');

    var iframe = system.getAppIframe(search.nonPrivateBrowserUrl);

    client.waitFor(function() {
      return iframe.getAttribute('src') === search.nonPrivateBrowserUrl;
    });
  });
});
