/* global InitialPanelHandler */
'use strict';

require('/shared/test/unit/load_body_html_helper.js');

mocha.globals([
  'InitialPanelHandler'
]);

Object.defineProperty(document, 'readyState', {
  value: 'loading',
  configurable: true
});
require('/js/startup.js');

suite('InitialPanelHandler', function() {
  var realMozSettings;

  var initialPanelHandler;

  var rootElement;
  var callSettingsItem;
  var callSettingsItemLink;

  setup(function() {
    loadBodyHTML('./_root.html');
    rootElement = document.getElementById('root');
    callSettingsItem = document.getElementById('call-settings');
    callSettingsItemLink = document.createElement('a');
    callSettingsItemLink.href = '#call';
    callSettingsItem.appendChild(callSettingsItemLink);

    realMozSettings = navigator.mozSettings;
    navigator.mozSettings = null;

    initialPanelHandler = InitialPanelHandler(rootElement);
  });

  teardown(function() {
    document.body.innerHTML = '';
    navigator.mozSettings = realMozSettings;
  });

  test('should save correct pending target panel', function() {
    initialPanelHandler._addClickListeners();
    callSettingsItemLink.onclick({
      preventDefault: function() {}
    });
    assert.equal(initialPanelHandler.pendingTargetPanel, 'call');
  });
});
