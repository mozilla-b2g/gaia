/**
 * Tests for the shared text utils helper
 */

/* global FontSizeUtils */

'use strict';

require('/shared/js/font_size_utils.js');

suite('shared/js/text_utils.js', function() {
  const kDefaultFace = 'Arial';
  const kContainerWidth = 100;
  const kDefaultSize = 12;
  const kAllowedSizes = [8, 10, 14];

  function getMaxFontSizeInfo() {
    return FontSizeUtils.getMaxFontSizeInfo(text, kAllowedSizes,
       kDefaultFace, kContainerWidth);
  }

  function getOverflowCount() {
    return FontSizeUtils.getOverflowCount(text, kDefaultSize,
      kDefaultFace, kContainerWidth);
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
    FontSizeUtils.resetCache();
  });

  /* Global */
  suite('Global', function() {
    test('FontSizeUtils exists', function() {
      assert.ok(FontSizeUtils);
    });
  });

  suite('Cache Mechanism', function() {
    test('Created', function() {
      FontSizeUtils._getCachedContext(kDefaultSize, kDefaultFace);

      assert.equal(Object.keys(FontSizeUtils._cachedContexts).length, 1);
    });

    test('Used', function() {
      var oldContext = FontSizeUtils._getCachedContext(kDefaultSize,
                                                        kDefaultFace);
      var newContext = FontSizeUtils._getCachedContext(kDefaultSize,
                                                        kDefaultFace);

      assert.equal(oldContext, newContext);
    });

    test('Cleared', function() {
      FontSizeUtils._getCachedContext(kDefaultSize, kDefaultFace);
      FontSizeUtils.resetCache();

      assert.equal(Object.keys(FontSizeUtils._cachedContexts).length, 0);
    });

    test('Created for specified font [size/face]', function() {
      getMaxFontSizeInfo();

      for (var i = 0; i < kAllowedSizes.length; i++) {
        assert.ok(FontSizeUtils._getCachedContext(kAllowedSizes[i],
                                                   kDefaultFace));
      }
    });
  });

  suite('FontSizeUtils.getMaxFontSizeInfo(Small text)', function() {
    setup(function() {
      setupSmallString();
    });

    test('Returns max font size', function() {
      var infos = getMaxFontSizeInfo();
      assert.equal(infos.fontSize, kAllowedSizes[kAllowedSizes.length - 1]);
    });

    test('No overflow', function() {
      var infos = getMaxFontSizeInfo();
      assert.isFalse(infos.overflow);
    });
  });

  suite('FontSizeUtils.getMaxFontSizeInfo(Medium text)', function() {
    setup(function() {
      setupMediumString();
    });

    test('Returns middle font size', function() {
      var infos = getMaxFontSizeInfo();
      assert.equal(infos.fontSize, kAllowedSizes[1]);
    });

    test('overflow is false', function() {
      var infos = getMaxFontSizeInfo();
      assert.isFalse(infos.overflow);
    });
  });

  suite('FontSizeUtils.getMaxFontSizeInfo(Large Text)', function() {
    setup(function() {
      setupLargeString();
    });

    test('Returns min font size', function() {
      var infos = getMaxFontSizeInfo();
      assert.equal(infos.fontSize, kAllowedSizes[0]);
    });

    test('Overflow is true', function() {
      var infos = getMaxFontSizeInfo();
      assert.isTrue(infos.overflow);
    });
  });


  suite('FontSizeUtils.getOverflowCount', function() {
    test('Should be 0 for small text', function() {
      setupSmallString();

      assert.equal(getOverflowCount(), 0);
    });

    test('Should be 1 for medium text', function() {
      setupMediumString();

      assert.equal(getOverflowCount(), 1);
    });

    test('Should be less than 129 for large text', function() {
      setupLargeString();

      assert.isTrue(getOverflowCount() <= 129);
    });
  });

});

