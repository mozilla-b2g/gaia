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

/**
 * A page with a mailto link.
 * @type {string}
 */
var MAILTOPAGE = 'mailto.html';

marionette('share url from browser', function() {
  var browser, email, fileServer;

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
    var app = new Browser(client);
    app.launch();
    client.helper.waitForElement('body.loaded');
    client.setSearchTimeout(10000);
    return app;
  }

  /**
   * Navigate to some url.
   * @param {Browser} browser thing to drive the browser.
   * @param {Server} server a web server.
   * @param {string} url some url to navigate to.
   */
  function goToUrl(browser, server, url) {
    url = server.url(url);
    browser.searchBar.sendKeys(url);
    browser.searchButton.click();
  }

  /**
   * Navigate to some url and share it via email.
   * @param {Browser} browser thing to drive the browser.
   * @param {Server} server a web server.
   * @param {string} url some url to navigate to.
   */
  function shareViaEmail(browser, server, url) {
    goToUrl(browser, server, url);
    client.helper
      .waitForElement(browser.shareButton)
      .click();
    // Since share url via email is supported only,
    // email share url activity will handle the request directly.
    // Once there are other share url activity ready,
    // we have to roll back for clicking "E-Mail" activity.
    // browser.clickShareEmail();
  }

  setup(function(done) {
    Server.create(function(err, server) {
      fileServer = server;
      done();
    });

    browser = startBrowser();
    email = new Email(client);
  });

  teardown(function() {
    fileServer.stop();
  });

  test('share button should put url in email body', function() {
    shareViaEmail(browser, fileServer, COOLPAGE);
    email.confirmWantAccount();
    email.manualSetupImapEmail(emailServer, 'waitForCompose');
    var body = email.getComposeBody();
    assert.ok(body.indexOf(COOLPAGE) !== -1);
  });

  test('mailto link should put email in "to" field', function() {
    goToUrl(browser, fileServer, MAILTOPAGE);
    var frame = browser.currentTabFrame();
    client.switchToFrame(frame);
    browser.mailtoLink.click();
    email.confirmWantAccount();
    email.manualSetupImapEmail(emailServer, 'waitForCompose');
    var to = email.getComposeTo();
    assert.strictEqual(to, 'gaye@mozilla.com');
  });
});
