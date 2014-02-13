/* jshint node: true */
'use strict';

marionette('First Time Use > Single Variant Customization > ', function() {
  var assert = require('assert');
  var FTU = require('./lib/ftu_test_lib').FTU;
  var client = marionette.client();
  var ftu = new FTU(client);

  var browser_url = 'app://browser.gaiamobile.org';

  // This test will  need to be changed if we  change default bookmarks in
  // build system.
  test('FTU runs customization when no ICCHelper available', function() {
    // wait for the ftu to come up, which means customization will have been run
    ftu.waitForFTU();
    ftu.close();
    // bring up browser
    client.apps.launch(browser_url);
    client.apps.switchToApp(browser_url);

    // Wait for the document body to know we're really 'launched'.
    client.helper.waitForElement('body');

    // Bring up the bookmarks tab, make sure we have 2 bookmarks. Not the most
    // through of tests, but it'll do for now.
    client.findElement('#url-input').click();
    client.findElement('#bookmarks-tab').click();
    client.helper.waitForElement('#bookmarks > ul');
    var links = client.findElements('#bookmarks > ul > li');
    assert(links.length == 2, 'Not enough links in bookmarks! ' + links.length);
   });

});
