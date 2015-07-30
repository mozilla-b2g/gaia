'use strict';
/* jshint browser: true */
/* global PinCard, MocksHelper */

require('/bower_components/evt/index.js');
require('/test/unit/mock_card_manager.js');
require('/shared/js/smart-screen/pin_card.js');

var mocksHelper = new MocksHelper([
  'CardManager'
]).init();

suite('tv-epg/contextmenu', function() {
  var pinCard;

  mocksHelper.attachTestHelpers();
  setup(function() {
    pinCard = new PinCard({
      origin: 'app://tvdeck.test',
      manifestURL: 'app://tvdeck.test/manifest.webapp'
    });
  });

  suite('Initialization', function() {
    test('Initialize member variables', function() {
      assert.equal(pinCard.origin, 'app://tvdeck.test');
      assert.equal(pinCard.manifestURL, 'app://tvdeck.test/manifest.webapp');
    });
  });

  suite('updatePinnedChannels', function() {
    setup(function() {
      pinCard.cardManager.cards = [{
        launchURL: 'app://tvdeck.test/index.html#1,dvbt,12'
      }, {
        launchURL: 'app://player.test/index.html'
      }];
      pinCard.cardManager.mTriggerChange('cardlist-changed');
    });

    test('Channel #1,dvbt,12 should be pinned', function() {
      assert.isTrue(pinCard.pinnedChannels['#1,dvbt,12']);
    });
  });
});
