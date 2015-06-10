'use strict';
/* jshint browser: true */
/* global ContextMenu, MocksHelper, MozActivity */

require('/shared/test/unit/mocks/mock_moz_activity.js');
require('/shared/test/unit/mocks/smart-screen/mock_pin_card.js');
require('/js/context_menu.js');

var mocksHelper = new MocksHelper([
  'MozActivity',
  'PinCard'
]).init();

suite('tv-epg/contextmenu', function() {

  var contextmenu;
  var button;
  mocksHelper.attachTestHelpers();

  setup(function() {
    var mockPorts = [{
      postMessage: function() {},
    }];
    button = document.createElement('DIV');
    contextmenu = new ContextMenu([{
      element: button,
      hasText: true
    }], {
      origin: 'app://contextmenu.test',
      manifestURL: 'app://contextmenu.test/manifest.webapp',
      connect: function() {
        return {
          then: function(callback) {
            callback(mockPorts);
            if (mockPorts[0].onmessage) {
              mockPorts[0].onmessage({
                data: {
                  origin: 'app://tvdeck.test',
                  manifestURL: 'app://tvdeck.test/manifest.webapp'
                }
              });
            }
          }
        };
      }
    });
  });

  suite('Initialization', function() {
    test('Initialize members', function() {
      assert.equal(contextmenu.selfApp.origin, 'app://contextmenu.test');
      assert.equal(
        contextmenu.selfApp.manifestURL,
        'app://contextmenu.test/manifest.webapp'
      );
      assert.isDefined(contextmenu.pinCard);
    });
  });

  suite('updateMenu', function() {
    setup(function() {
      MozActivity.mSetup();
      window.location.hash = '#1,dvb-0,12';
    });

    teardown(function() {
      window.location.hash = '';
      MozActivity.mTeardown();
    });

    test('Pin card to home', function() {
      contextmenu.updateMenu();
      button.click();
      assert.equal(button.getAttribute('data-l10n-id'), 'pin-to-home');
      assert.equal(MozActivity.calls[0].name, 'pin');
    });

    test('Unpin card to home', function() {
      contextmenu.pinCard.pinnedChannels = {
        '#1,dvb-0,12': true
      };

      contextmenu.updateMenu();
      button.click();
      assert.equal(button.getAttribute('data-l10n-id'), 'unpin-from-home');
    });
  });
});
