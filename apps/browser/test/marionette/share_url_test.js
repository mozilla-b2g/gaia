var __email__ = '../../../email/test/marionette/';


var Browser = require('./lib/browser'),
    Email = require(__email__ + 'lib/email'),
    Server = require('./lib/server'),
    assert = require('assert'),
    serverHelper = require(__email__ + 'lib/server_helper');


/**
 * A cool document released under the apache license.
 * @type {string}
 */
var COOLPAGE = 'coolpage.html';

marionette('share url from browser', function() {
  var client = marionette.client({
    settings: { 'keyboard.ftu.enabled': false }
  });

  var emailServer = serverHelper.use({
    credentials: { username: 'testy1', password: 'testy1' }
  });

  /**
   * Start the browser and wait for an initial page load.
   */
  function startBrowser() {
    var browser = new Browser(client);
    browser.launch();
    client.helper.waitForElement('body.loaded');
    client.setSearchTimeout(10000);
    return browser;
  }

  /**
   * Navigate to some url and share it via email.
   * @param {Browser} browser thing to drive the browser.
   * @param {Server} server a web server.
   * @param {string} url some url to navigate to.
   */
  function shareViaEmail(browser, server, url) {
    url = server.url(url);
    browser.searchBar.sendKeys(url);
    browser.searchButton.click();
    browser.shareButton.click();
    // Since share url via email is supported only,
    // email share url activity will handle the request directly.
    // Once there are other share url activity ready,
    // we have to roll back for clicking "E-Mail" activity.
    // browser.clickShareEmail();
  }

  suite('without an existing email account', function() {
    setup(function(done) {
      Server.create(function(err, server) {
        fileServer = server;

        browser = startBrowser();
        shareViaEmail(browser, fileServer, COOLPAGE);
        done();
      });
    });

    test('should prompt the user to create an email acct', function() {
      client.switchToFrame();
      client.helper.waitForAlert('not set up to send or receive email');
    });
  });

  suite('with an existing email account', function() {
    var browser, email, fileServer;
    setup(function(done) {
      // Bring up a fake file server to serve the coolpage.html.
      Server.create(function(err, server) {
        fileServer = server;

        // Setup an email account.
        email = new Email(client);
        email.launch();
        email.manualSetupImapEmail(emailServer);
        client.apps.close(Email.EMAIL_ORIGIN);

        browser = startBrowser();
        shareViaEmail(browser, fileServer, COOLPAGE);
        done();
      });
    });

    teardown(function() {
      fileServer.stop();
    });

    test.skip('should put url in email body', function() {
      // TODO(gaye): Currently b2g-desktop does not support starting an app,
      //     closing it, and then sending it an activity. I do not know why.
      //     Once this is fixed, we should turn this on.
    });
  });
});
