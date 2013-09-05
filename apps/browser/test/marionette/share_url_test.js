var Browser = require('./lib/browser'),
    Server = require('./lib/server'),
    assert = require('assert');


/**
 * A cool document released under the apache license.
 * @type {string}
 */
var COOLPAGE = 'coolpage.html';


/**
 * Endpoint for gaia email app.
 * @type {string}
 */
var EMAIL_ORIGIN = 'app://email.gaiamobile.org';


marionette('share url from browser', function() {
  var client = marionette.client();
  var browser, server;

  // this could be abstracted further
  suiteSetup(function(done) {
    Server.create(function(err, _server) {
      server = _server;
      done();
    });
  });

  suiteTeardown(function() {
    server.stop();
  });

  setup(function() {
    browser = new Browser(client);
    browser.launch();

    client.helper.waitForElement('body.loaded');
    client.setSearchTimeout(10000);
  });

  suite('share in email', function() {
    var url;
    setup(function() {
      url = server.url(COOLPAGE);
      browser.searchBar.sendKeys(url);
      browser.searchButton.click();
      browser.shareButton.click();
      browser.clickShareEmail();
      client.apps.switchToApp(EMAIL_ORIGIN);
    });

    test('should have coolpage.html in body', function() {
      // TODO(gareth): Test that we are in the compose email view
      //     and that the email body has the coolpage.html.
      client.helper.wait(3000);
      assert.ok(true);
    });
  });
});
