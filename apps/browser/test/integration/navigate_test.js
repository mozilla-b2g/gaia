var Browser = require('./lib/browser'),
    Server = require('./lib/server'),
    assert = require('assert');

marionette('search', function() {
  var client = marionette.client();
  var subject;
  var server;

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
    subject = new Browser(client);
    subject.launch();

    client.helper.waitForElement('body.loaded');
    client.setSearchTimeout(10000);
  });

  suite('navigate to coolpage.html', function() {
    var expectedTitle = 'cool page';
    var url;

    setup(function() {
      url = server.url('coolpage.html');
      subject.searchBar.sendKeys(url);
      subject.searchButton.click();
    });

    test('loads coolpage.html', function() {
      // verify iframe is primed
      var frame = subject.currentTabFrame();
      assert.equal(frame.getAttribute('src'), url, 'correct iframe');

      // switch to frame and verify content
      client.switchToFrame(frame);

      // verify title
      var title = client.findElement('title').getAttribute('innerHTML');
      assert.ok(
        title.indexOf(expectedTitle) !== -1,
        title + ' contains "cool page"'
      );
    });
  });

  suite('navigate to invalid page (about:neterror)', function() {
    setup(function() {
      url = 'http://fake.url.wow/';
      subject.searchBar.sendKeys(url);
      subject.searchButton.click();
    });

    test.skip('loads net_error.html from system', function() {
      // verify iframe is primed
      var frame = subject.currentTabFrame();
      assert.equal(frame.getAttribute('src'), url, 'correct iframe');

      // Marionette will throw an error when attempting to
      // switch to a frame that's in an error state.
      // However, we can ignore this error since we need to
      // test the about:neterror page itself.
      // https://bugzilla.mozilla.org/show_bug.cgi?id=936301#c3
      try {
        client.switchToFrame(frame);
      } catch (e) {
        // ignore this error
      } finally {
        // now we can test the about:neterror page

        // verify error message was set (using l10n)
        var errorMsg = frame.client.helper.waitForElement('#error-message')
                       .getAttribute('innerHTML');
        assert.ok(errorMsg, 'Localization library populated error message');

        // verify that close button kills the browser tab
        frame.client.executeScript(function() {
          var closeBtn = document.getElementById('close-btn');
          if (!closeBtn) {
            return;
          }
          closeBtn.click();
        });

        subject.backToApp();
        var query = 'iframe[src="' + url + '"]';
        // this is to wait for the iframe to go away
        client.waitFor(function() {
          try {
            client.findElement(query);
            return false;
          } catch (err) {
            // only if findElement throws NoSuchElement
            // do we know for sure the tab is closed
            if (err && err.type === 'NoSuchElement') {
              return true;
            }
          }
        });
        assert.ok(true, 'browser tab was properly closed');
      }
    });
  });

});
