/* global DeviceInteraction, exampleCmds, helper */
'use strict';
require('../helper');

suite('scope', function() {
  var client = marionette.client(),
      Actions,
      device,
      subject;

  helper.require('actions', function(obj) {
    Actions = obj;
  });

  device = new DeviceInteraction(exampleCmds, function() {
    return subject;
  });

  suite('actions', function() {
    setup(function() {
      subject = new Actions(client);
    });

    test('can move the page', function() {
      var bodyElement;

      client.goUrl('http://yahoo.com');
      client.waitFor(function() {
        client.findElement('body', function(error, element) {
          if (error) {
            console.log('cannot find');
            return;
          }
          bodyElement = element;
        });

        if (bodyElement !== undefined) {
          return true;
        }
      });

      subject.
        press(bodyElement, 100, 100).
        moveByOffset(0, 10).
        perform();

      // TODO: Bug 965385 - Use `Actions#wait` in integration tests
      // Model this pause with an invocation of `Actions#wait` once "Bug 962645
      // - Action chains only handle one press->release chain" is resolved.
      client.executeAsyncScript(function() {
        setTimeout(marionetteScriptFinished, 50);
      });

      subject.
        release().
        perform();

      // TODO: Bug 965385 - Use `Actions#wait` in integration tests
      // Model this pause with an invocation of `Actions#wait` once "Bug 962645
      // - Action chains only handle one press->release chain" is resolved.
      client.executeAsyncScript(function() {
        setTimeout(marionetteScriptFinished, 50);
      });

      subject.
        flick(bodyElement, 0, 0, 0, 200).
        perform();

    });
  });
});
