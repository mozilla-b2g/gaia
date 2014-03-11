'use strict';

var Browser = require('./lib/browser');
var Server = require('./lib/server');
var assert = require('assert');

marionette('', function() {
  var client = marionette.client();
  var subject;
  var server;

  var waitForStartup = function() {
    var osLogo = client.findElement('#os-logo');
    client.waitFor(function() {
      return osLogo.getAttribute('class') == 'hide';
    });
  };

  suite('Browser Bookmarks', function() {
    var url;

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
      waitForStartup();
      subject = new Browser(client);
      subject.launch();

      client.helper.waitForElement('body.loaded');
      client.setSearchTimeout(10000);
    });

    test('Add bookmark', function() {
      url = server.url('coolpage.html');
      subject.searchBar.sendKeys(url);
      subject.searchButton.click();
      var frame = subject.currentTabFrame();
      assert.equal(frame.getAttribute('src'), url);
      subject.bookmarkButton.click();
      subject.bookmarkMenuAdd.click();
      client.waitFor(function() {
        var cssClasses = subject.bookmarkButton.getAttribute('class') + '';
        if (cssClasses.indexOf('bookmarked') == -1) {
          return false;
        } else {
          return true;
        }
      });
    });

    test('Edit bookmark', function() {
      url = server.url('coolpage.html');
      subject.searchBar.sendKeys(url);
      subject.searchButton.click();
      var frame = subject.currentTabFrame();
      assert.equal(frame.getAttribute('src'), url);
      subject.bookmarkButton.click();
      subject.bookmarkMenuAdd.click();
      client.waitFor(function() {
        var cssClasses = subject.bookmarkButton.getAttribute('class') + '';
        if (cssClasses.indexOf('bookmarked') == -1) {
          return false;
        } else {
          return true;
        }
      });
      subject.bookmarkButton.click();
      subject.bookmarkMenuEdit.click();
      url = server.url('mailto.html'); // Change the URL
      subject.bookmarkUrl.clear();
      subject.bookmarkUrl.sendKeys(url);
      subject.bookmarkEntrySheetDone.click();
      subject.searchBar.click();
      subject.searchBar.clear();
      subject.searchBar.sendKeys(url);
      subject.searchButton.click();
      frame = subject.currentTabFrame();
      assert.equal(frame.getAttribute('src'), url);
      client.waitFor(function() {
        var cssClasses = subject.bookmarkButton.getAttribute('class') + '';
        if (cssClasses.indexOf('bookmarked') == -1) {
          return false;
        } else {
          return true;
        }
      });
    });

  });
});
