/* global marionette, setup */

'use strict';

var querystring = require('querystring');

suite('client methods', function() {
  var client = marionette.client();

  setup(function() {
    client.goUrl('data:text/html,' + querystring.escape(
        '<div id="host"></div>'));
    client.executeScript(function() {
      var host = document.getElementById('host');
      var root = host.createShadowRoot();
      var button = document.createElement('button');
      button.id = 'button';
      button.textContent = 'Foo';
      root.appendChild(button);
    });
  });

  test('#switchToShadowRoot', function() {
    var host = client.findElement('#host');
    client.switchToShadowRoot(host);
    var button = client.findElement('#button');
    button.click();
  });
});
