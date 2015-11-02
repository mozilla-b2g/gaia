/* global FontSizeUtils */

/**
 * Tests for the shared text utils helper
 */

'use strict';

require('/shared/js/font_size_utils.js');

suite('shared/js/text_utils.js', function() {
  const kDefaultFace = 'Arial';
  const kContainerWidth = 100;
  const kDefaultSize = 12;
  const kAllowedSizes = [8, 10, 14];
  const kStringChar = '#';

  function getMaxFontSizeInfo() {
    return FontSizeUtils.getMaxFontSizeInfo(text, kAllowedSizes,
                                            kDefaultFace, kContainerWidth);
  }

  function getOverflowCount() {
    return FontSizeUtils.getOverflowCount(text, kDefaultSize,
                                          kDefaultFace, kContainerWidth);
  }

  var context;

  function getContext() {
    if (!context) {
      var canvas = document.createElement('canvas');
      canvas.setAttribute('moz-opaque', 'true');
      canvas.setAttribute('width', '1');
      canvas.setAttribute('height', '1');
      context = canvas.getContext('2d', { willReadFrequently: true });
    }
    return context;
  }

  function getDefaultContext() {
    var ctx = getContext();
    ctx.font = 'italic ' + kDefaultSize + 'px ' + kDefaultFace;
    return ctx;
  }

  function generateStringForPixels(width, fontSize, fontFace) {
    fontSize = fontSize || kDefaultSize;
    fontFace = fontFace || kDefaultFace;

    var ctx = getContext();
    ctx.font = 'italic ' + fontSize + 'px ' + fontFace;

    var str = kStringChar;
    while (ctx.measureText(str + kStringChar).width < width) {
      str += kStringChar;
    }

    return str;
  }

  var text;

  function setupSmallString(size, face) {
    text = generateStringForPixels(1, size, face);
    return text;
  }

  // string just barely smaller than the container width
  function setupMediumString(size, face) {
    text = generateStringForPixels(kContainerWidth, size, face);
    return text;
  }

  // string just barely larger than the container width
  function setupMediumPlusString(size, face) {
    text = generateStringForPixels(kContainerWidth + 1, size, face) +
             kStringChar;
    return text;
  }

  // way to large to ever fit anywhere
  function setupLargeString(size, face) {
    text = generateStringForPixels(kContainerWidth * 10, size, face);
    return text;
  }

  setup(function() {
    text = '';
  });

  teardown(function() {
    FontSizeUtils.resetCache();
  });

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

    test('Should be 0 for medium text', function() {
      setupMediumString();

      assert.equal(getOverflowCount(), 0);
    });

    test('Should be 1 for medium text plus 1 character', function() {
      setupMediumPlusString();

      assert.equal(getOverflowCount(), 1);
    });

    test('Should be overflow width divided by character width', function() {
      var ctx = getDefaultContext();
      var charWidth = ctx.measureText(kStringChar).width;

      var string = setupLargeString();
      var stringWidth = ctx.measureText(string).width;

      // Estimate the amount of character overflow we should have
      // by measuring overflow width, and then dividing that by
      // the width of the characters in the string.
      var overflowWidth = stringWidth - kContainerWidth;
      var overflowCount = overflowWidth / charWidth;

      assert.ok(Math.abs(getOverflowCount() - overflowCount) < 1);
    });

    test('Successive calls should not recompute the overflow from scratch',
    function() {
      var measureTextSpy = this.sinon.spy(
        CanvasRenderingContext2D.prototype, 'measureText'
      );

      setupMediumString();
      measureTextSpy.reset();
      getOverflowCount();
      var count = measureTextSpy.callCount;
      setupMediumPlusString();
      measureTextSpy.reset();
      getOverflowCount();
      assert.equal(measureTextSpy.callCount, count + 1);
    });
  });

  suite('FontSizeUtils.getFontWidth', function() {
    test('Should measureText correctly for multiple fontSizes', function() {
      var string = 'arbitrary' + Date.now();
      var ctx = getContext();
      // test 2px up to 24px font size measurements
      for (var fontSize = 2; fontSize < 24; fontSize++) {
        ctx.font = 'italic ' + fontSize + 'px ' + kDefaultFace;
        assert.equal(ctx.measureText(string).width,
                     FontSizeUtils.getFontWidth(string, fontSize,
                                                kDefaultFace));
      }
    });
  });

  suite('FontSizeUtils.getContentWidth', function() {
    var el;

    setup(function() {
      el = document.createElement('div');
      el.style.width = '50px';
      el.style.padding = '10px';
      document.body.appendChild(el);
    });

    teardown(function() {
      document.body.removeChild(el);
    });

    test('Should compute the width of content-box element', function() {
      el.style.boxSizing = 'content-box';
      var style = getComputedStyle(el);
      var styleWidth = parseInt(style.width, 10);
      var actualWidth = FontSizeUtils.getContentWidth(style);

      assert.equal(styleWidth, 50);
      assert.equal(actualWidth, 50);
    });

    test('Should compute the width of border-box element', function() {
      el.style.boxSizing = 'border-box';
      var style = getComputedStyle(el);
      var styleWidth = parseInt(style.width, 10);
      var actualWidth = FontSizeUtils.getContentWidth(style);

      assert.equal(styleWidth, 50);
      assert.equal(actualWidth, 30);
    });
  });

});
