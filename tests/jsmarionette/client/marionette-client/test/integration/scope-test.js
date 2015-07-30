/* global assert */
'use strict';
require('../helper');

suite('scope', function() {
  var client = marionette.client(),
      helper = require('./helper'),
      timeoutA,
      timeoutB;

  helper.skipInitialError(client);

  setup(function() {
    timeoutA = client.scope({ scriptTimeout: 1000 });
    timeoutB = client.scope({ scriptTimeout: 250 });
  });

  test('should handle scope switching', function() {
    function sleep() {
      setTimeout(function() {
        marionetteScriptFinished();
      }, 600);
    }

    timeoutA.executeAsyncScript(sleep);

    var err;
    try {
      timeoutB.executeAsyncScript(sleep);
    } catch (e) {
      err = e;
    }
    // sleep throws error on shorter timeout
    assert.ok(err);
  });
});
