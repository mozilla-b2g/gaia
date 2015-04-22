'use strict';

marionette('FontSizeUtils >', function() {
  var ReflowHelper =
      require('../../../../../tests/js-marionette/reflow_helper.js');

  var assert = require('assert');

  var EMAIL_APP = 'app://email.gaiamobile.org';
  var client = marionette.client();

  var reflowHelper, sys;

  setup(function() {
    sys = client.loader.getAppClass('system');
    reflowHelper = new ReflowHelper(client);

    var email = sys.waitForLaunch(EMAIL_APP);
    client.waitFor(function() {
      return email.displayed();
    });

    client.apps.switchToApp(EMAIL_APP);
  });

  test('FontSizeUtils._reformatHeaderText creates 1 reflow a header',
  function() {
    reflowHelper.startTracking(EMAIL_APP);
    var beforeCount = reflowHelper.getCount();

    var headerCount = client.executeAsyncScript(function() {

      // Change the text of each header to trigger resize logic.
      var reformatHeaders = function() {
        var headers = document.querySelectorAll('header > h1');
        for (var i = 0; i < headers.length; i++) {
          headers[i].textContent =
            'really large giant header that couldnt possibly fit';
        }
        marionetteScriptFinished(headers.length);
      };

      if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', reformatHeaders);
      } else {
        reformatHeaders();
      }
    });

    // Make sure we have at most as many reflows as there are headers.
    var reflowCount = reflowHelper.getCount() - beforeCount;
    assert(reflowCount <= headerCount, 'Performed too many reflows');

    // Now set all the header text really small, and check reflow count;
    beforeCount = reflowHelper.getCount();
    var newHeaderCount = client.executeAsyncScript(function() {

      // Change the text of each header to trigger resize logic.
      var reformatHeaders = function() {
        var headers = document.querySelectorAll('header > h1');
        for (var i = 0; i < headers.length; i++) {
          headers[i].textContent = 'tiny';
        }
        marionetteScriptFinished(headers.length);
      };

      if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', reformatHeaders);
      } else {
        reformatHeaders();
      }
    });

    assert.equal(headerCount, newHeaderCount, 'header count stays the same');
    reflowCount = reflowHelper.getCount() - beforeCount;
    assert(reflowCount <= newHeaderCount, 'Performed too many reflows');

    reflowHelper.stopTracking();
    assert(true, 'created 1 reflow per header');
  });
});
