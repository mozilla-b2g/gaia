'use strict';

/* global CardManager */

requireApp('smart-home/js/vendor/evt.js');
requireApp('smart-home/js/utils.js');
requireApp('smart-home/js/piped_promise.js');
requireApp('smart-home/js/card_manager.js');

suite('smart-home/CardManager', function() {
  suite('find best matching icon', function() {
    var cardManager;
    var app;
    var manifestWithIconsInOrder = {
      icons: {
        '32': '/style/icons/32.png',
        '64': '/style/icons/64.png',
        '128': '/style/icons/128.png',
        '256': '/style/icons/256.png'
      }
    };
    var manifestWithIconsInRandom = {
      icons: {
        '32': '/style/icons/32.png',
        '256': '/style/icons/256.png',
        '128': '/style/icons/128.png',
        '64': '/style/icons/64.png'
      }
    };

    setup(function() {
      cardManager = new CardManager();
      app = {
        origin: 'app://stub.gaiamobile.org/'
      };
    });

    teardown(function() {
      cardManager = undefined;
      app = undefined;
    });

    test('call without preferredSize', function() {
      var actual = cardManager._bestMatchingIcon(app, manifestWithIconsInOrder);
      assert.equal(actual, 'app://stub.gaiamobile.org/style/icons/256.png');
    });

    test('call with random order of icon size and ' +
      'without preferredSize ', function() {
      var actual =
        cardManager._bestMatchingIcon(app, manifestWithIconsInRandom);
      assert.equal(actual, 'app://stub.gaiamobile.org/style/icons/256.png');
    });

    test('call with preferredSize', function() {
      var actual =
        cardManager._bestMatchingIcon(app, manifestWithIconsInOrder, 100);
      assert.equal(actual, 'app://stub.gaiamobile.org/style/icons/128.png');
    });

    test('call with random order of icon size and ' +
      'preferredSize ', function() {
      var actual =
        cardManager._bestMatchingIcon(app, manifestWithIconsInRandom, 100);
      assert.equal(actual, 'app://stub.gaiamobile.org/style/icons/128.png');
    });

  });
});
