marionette('lockscreen disabled test', function() {
  var assert = require('assert');

  /**
  Return the protocol + domain of the homescreen app.

  @return {String} prefix of homescreen iframe.
  */
  function homeDomain() {
    var homescreenManifest = client.settings.get('homescreen.manifestURL');
    var homescreen = homescreenManifest.split('/');
    homescreen.pop();
    return homescreen.join('/');
  }

  var client = marionette.client({
    settings: {
      'ftu.manifestURL': null,
      'lockscreen.enabled': false
    }
  });

  test.skip('launch test app', function() {
    // XXX: this should be replaced with a region when we have fuller test
    // coverage.
    var lockscreen =
      client.findElement('#lockscreen');

    // this is a race condition so we must wait for the lockscreen to be hidden.
    client.waitFor(function() {
      return !lockscreen.displayed();
    });

    var homescreen =
      client.findElement('iframe[src*="' + homeDomain() + '"]');

    assert(homescreen.displayed(), 'homescreen is visible');
  });
});
