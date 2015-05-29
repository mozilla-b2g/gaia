'use strict';

var assert = require('chai').assert;

marionette('mozApps', function() {

  var client = marionette.client();

  suite('getSelf', function() {
    test('multiple calls should all return', function() {
      var error = client.executeAsyncScript(function() {

        // helper object to ensure we get expected number of callbacks
        function CallbackHelper(callback, waitingFor) {
          this.waitingFor = waitingFor;
          this.calledCount = 0;
          this.callback = callback;
        }
        CallbackHelper.prototype = {
          expectCallback: function() {
            return function() {
              if (++this.calledCount === this.waitingFor) {
                this.callback();
              }
            }.bind(this);
          }
        };

        var helper = new CallbackHelper(marionetteScriptFinished, 2);

        var req1 = navigator.mozApps.getSelf();
        req1.onsuccess = helper.expectCallback();
        req1.onerror = function() {
          marionetteScriptFinished('first getSelf() request failed');
        };

        var req2 = navigator.mozApps.getSelf();
        req2.onsuccess = helper.expectCallback();
        req2.onerror = function() {
          marionetteScriptFinished('second getSelf() request failed');
        };
      });

      assert.isNull(error, 'Error: ' + error);
    });
  });
});
