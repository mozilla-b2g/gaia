/**
 * Tests for the shared text utils helper
 * TODO: Shared code unit tests should not be in gallery
 * Bug #841422 has been filed to move these tests
 */

/* global TextUtils */

'use strict';

require('/shared/js/text_utils.js');

suite('shared/js/text_utils.js', function() {
  const kDefaultFace = 'Arial';
  const kContainerWidth = 100;
  const kDefaultSize = 12;
  const kAllowedSizes = [8, 10, 14];
  const kParameters = {
    'fontFace': kDefaultFace,
    'maxWidth': kContainerWidth,
    'fontSize': {
      'current': kDefaultSize,
      'allowed': kAllowedSizes
    }
  };

  function getTextInfos() {
    return TextUtils.getTextInfosFor(text, kParameters);
  }

  function getOverflowCount() {
    return TextUtils.getOverflowCount(text, kParameters);
  }

  function generateStringForPixels(width, fontSize, fontFace) {
    var canvas = document.createElement('canvas');
    canvas.setAttribute('moz-opaque', 'true');
    canvas.setAttribute('width', '1');
    canvas.setAttribute('height', '1');

    var ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.font = fontSize + 'px ' + fontFace;

    var str = '#';
    while (ctx.measureText(str).width < width) {
      str += '#';
    }

    return str;
  }

  var text;

  function setupSmallString() {
    text = generateStringForPixels(1, kDefaultSize, kDefaultFace);
  }

  function setupMediumString() {
    text = generateStringForPixels(101, kDefaultSize, kDefaultFace);
  }

  function setupLargeString() {
    text = generateStringForPixels(1000, kDefaultSize, kDefaultFace);
  }

  setup(function() {
    text = '';
  });

  teardown(function() {
    TextUtils.resetCache();
  });

  suite('Global', function() {
    test('TextUtils exists', function() {
      assert.ok(TextUtils);
    });
  });

  suite('Cache Mechanism', function() {
    test('Created', function() {
      TextUtils._getContextFor(kDefaultSize, kDefaultFace);

      assert.equal(Object.keys(TextUtils._cacheContext).length, 1);
    });

    test('Used', function() {
      var oldContext = TextUtils._getContextFor(kDefaultSize, kDefaultFace);
      var newContext = TextUtils._getContextFor(kDefaultSize, kDefaultFace);

      assert.equal(oldContext, newContext);
    });

    test('Cleared', function() {
      TextUtils._getContextFor(kDefaultSize, kDefaultFace);
      TextUtils.resetCache();

      assert.equal(Object.keys(TextUtils._cacheContext).length, 0);
    });

    test('Created for specified font [size/face]', function() {
      getTextInfos();

      for (var i = 0; i < kAllowedSizes.length; i++) {
        assert.ok(TextUtils._getContextFor(kAllowedSizes[i], kDefaultFace));
      }
    });
  });

  suite('TextUtils.getTextInfosFor(Small text)', function() {
    setup(function() {
      setupSmallString();
    });

    test('Returns max font size', function() {
      var infos = getTextInfos();
      assert.equal(infos.fontSize, kAllowedSizes[kAllowedSizes.length - 1]);
    });

    test('No overflow', function() {
      var infos = getTextInfos();
      assert.isFalse(infos.overflow);
    });
  });

  suite('TextUtils.getTextInfosFor(Medium text)', function() {
    setup(function() {
      setupMediumString();
    });

    test('Returns middle font size', function() {
      var infos = getTextInfos();
      assert.equal(infos.fontSize, kAllowedSizes[1]);
    });

    test('overflow is false', function() {
      var infos = getTextInfos();
      assert.isFalse(infos.overflow);
    });
  });

  suite('TextUtils.getTextInfosFor(Large Text)', function() {
    setup(function() {
      setupLargeString();
    });

    test('Returns min font size', function() {
      var infos = getTextInfos();
      assert.equal(infos.fontSize, kAllowedSizes[0]);
    });

    test('Overflow is true', function() {
      var infos = getTextInfos();
      assert.isTrue(infos.overflow);
    });
  });


  suite('TextUtils.getOverflowCount', function() {
    test('Should be 0 for small text', function() {
      setupSmallString();

      assert.equal(getOverflowCount(), 0);
    });

    test('Should be 1 for medium text', function() {
      setupMediumString();

      assert.equal(getOverflowCount(), 1);
    });

    test('Should be 129 for large text', function() {
      setupLargeString();

      assert.equal(getOverflowCount(), 129);
    });
  });

});

