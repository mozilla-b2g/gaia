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
    ctx.font = kDefaultSize + 'px ' + kDefaultFace;
    return ctx;
  }

  function generateStringForPixels(width, fontSize, fontFace) {
    fontSize = fontSize || kDefaultSize;
    fontFace = fontFace || kDefaultFace;

    var ctx = getContext();
    ctx.font = fontSize + 'px ' + fontFace;

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

  function setupHeaderElement() {
    var header = document.createElement('header');
    var headerText = document.createElement('h1');
    header.appendChild(headerText);

    headerText.style.overflow = 'hidden';
    headerText.style.textOverflow = 'ellipsis';
    headerText.style.width = kContainerWidth + 'px';
    // use maximum header fontSize
    var sizes = FontSizeUtils.getAllowedSizes(headerText);
    headerText.style.fontSize = sizes[sizes.length - 1] + 'px';
    headerText.style.fontFamily = kDefaultFace;
    return headerText;
  }

  function setupNonHeaderElement() {
    var element = document.createElement('h1');
    element.style.overflow = 'hidden';
    element.style.textOverflow = 'ellipsis';
    element.style.width = kContainerWidth + 'px';
    element.style.fontFamily = kDefaultFace;
    return element;
  }

  function getMaxHeaderFontSize() {
    var sizes = FontSizeUtils.getAllowedSizes(setupHeaderElement());
    return sizes[sizes.length - 1];
  }

  function getMinHeaderFontSize() {
    var sizes = FontSizeUtils.getAllowedSizes(setupHeaderElement());
    return sizes[0];
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
      var overflowCount = Math.round(overflowWidth / charWidth);

      assert.equal(getOverflowCount(), overflowCount);
    });
  });

  suite('FontSizeUtils._getTextChangeObserver', function() {
    test('Should only ever return 1 mutation observer', function() {
      var m1 = FontSizeUtils._getTextChangeObserver();
      var m2 = FontSizeUtils._getTextChangeObserver();

      assert.isTrue(m1 instanceof MutationObserver);
      assert.equal(m1, m2);
    });
  });

  suite('FontSizeUtils.getFontWidth', function() {
    test('Should measureText correctly for multiple fontSizes', function() {
      var string = 'arbitrary' + Date.now();
      var ctx = getContext();
      // test 2px up to 24px font size measurements
      for (var fontSize = 2; fontSize < 24; fontSize++) {
        ctx.font = fontSize + 'px ' + kDefaultFace;
        assert.equal(ctx.measureText(string).width,
          FontSizeUtils.getFontWidth(string, fontSize, kDefaultFace));
      }
    });
  });

  suite('FontSizeUtils.getAllowedSizes', function() {
    test('Should return empty array for non header elements', function() {
      var el = setupNonHeaderElement();
      assert.equal(FontSizeUtils.getAllowedSizes(el).length, 0);
    });

    test('Should return a non-empty array for header elements', function() {
      var el = setupHeaderElement();
      var allowedSizes = FontSizeUtils.getAllowedSizes(el);
      assert.isTrue(allowedSizes.length > 0);
    });
  });

  suite('FontSizeUtils.autoResizeElement', function() {
    test('Should not resize a small header title', function() {
      var el = setupHeaderElement();
      var fontSizeBefore = getComputedStyle(el).fontSize;

      el.textContent = setupSmallString(fontSizeBefore);
      FontSizeUtils.autoResizeElement(el);

      assert.equal(fontSizeBefore, getComputedStyle(el).fontSize);
    });

    test('Should not resize a medium header title', function() {
      var el = setupHeaderElement();
      var fontSizeBefore = getComputedStyle(el).fontSize;

      el.textContent = setupMediumString(parseInt(fontSizeBefore));
      FontSizeUtils.autoResizeElement(el);

      assert.equal(fontSizeBefore, getComputedStyle(el).fontSize);
    });

    test('Should resize a barely overflowing header title', function() {
      var el = setupHeaderElement();
      var fontSizeBefore = getComputedStyle(el).fontSize;

      el.textContent = setupMediumPlusString(parseInt(fontSizeBefore));
      FontSizeUtils.autoResizeElement(el);

      assert.notEqual(fontSizeBefore, getComputedStyle(el).fontSize);
    });

    test('Should resize a barely overflowing header title', function() {
      var el = setupHeaderElement();
      var fontSizeBefore = getComputedStyle(el).fontSize;

      el.textContent = setupMediumPlusString(parseInt(fontSizeBefore));
      FontSizeUtils.autoResizeElement(el);

      assert.notEqual(fontSizeBefore, getComputedStyle(el).fontSize);
    });

    test('Should resize to minimum a very long header title', function() {
      var el = setupHeaderElement();
      var fontSizeBefore = '50px';
      el.style.fontSize = fontSizeBefore;

      el.textContent = setupLargeString(parseInt(fontSizeBefore));
      FontSizeUtils.autoResizeElement(el);

      assert.notEqual(getMinHeaderFontSize(), getComputedStyle(el).fontSize);
    });
  });

  suite('FontSizeUtils.autoResizeElement on non-headers', function() {
    test('Should not resize a small header title', function() {
      var el = setupNonHeaderElement();
      var fontSizeBefore = '50px';
      el.style.fontSize = fontSizeBefore;

      el.textContent = setupSmallString(fontSizeBefore);
      FontSizeUtils.autoResizeElement(el);

      assert.equal(fontSizeBefore, getComputedStyle(el).fontSize);
    });

    test('Should not resize a medium header title', function() {
      var el = setupNonHeaderElement();
      var fontSizeBefore = '50px';
      el.style.fontSize = fontSizeBefore;

      el.textContent = setupMediumString(parseInt(fontSizeBefore));
      FontSizeUtils.autoResizeElement(el);

      assert.equal(fontSizeBefore, getComputedStyle(el).fontSize);
    });

    test('Should not resize a barely overflowing header title', function() {
      var el = setupNonHeaderElement();
      var fontSizeBefore = '50px';
      el.style.fontSize = fontSizeBefore;

      el.textContent = setupMediumPlusString(parseInt(fontSizeBefore));
      FontSizeUtils.autoResizeElement(el);

      assert.equal(fontSizeBefore, getComputedStyle(el).fontSize);
    });

    test('Should not resize a barely overflowing header title', function() {
      var el = setupNonHeaderElement();
      var fontSizeBefore = '50px';
      el.style.fontSize = fontSizeBefore;

      el.textContent = setupMediumPlusString(parseInt(fontSizeBefore));
      FontSizeUtils.autoResizeElement(el);

      assert.equal(fontSizeBefore, getComputedStyle(el).fontSize);
    });

    test('Should not resize to minimum a very long header title', function() {
      var el = setupNonHeaderElement();
      var fontSizeBefore = '50px';
      el.style.fontSize = fontSizeBefore;

      el.textContent = setupLargeString(parseInt(fontSizeBefore));
      FontSizeUtils.autoResizeElement(el);

      assert.equal(fontSizeBefore, getComputedStyle(el).fontSize);
    });
  });

  suite('FontSizeUtils handle overflow events', function() {
    test('Header overflow should cause autoresize', function(done) {
      var el = setupHeaderElement();
      document.body.appendChild(el.parentNode);
      el.textContent = setupLargeString();

      var stub = sinon.stub(FontSizeUtils, 'autoResizeElement', function() {
        el.parentNode.removeChild(el);
        stub.restore();
        assert.isTrue(stub.calledWith(el));
        done();
      });
    });

    test('Non-header overflow should cause not autoresize', function(done) {
      var el = setupNonHeaderElement();
      document.body.appendChild(el);
      el.textContent = setupLargeString();

      var spy = sinon.spy(FontSizeUtils, 'autoResizeElement');
      assert.isTrue(spy.notCalled);

      el.addEventListener('overflow', function() {
        el.parentNode.removeChild(el);
        spy.restore();
        assert.isTrue(spy.notCalled);
        done();
      });
    });
  });

  suite('FontSizeUtils auto resize without Mutation Observer', function() {
    test('Should auto-resize back up when text changes', function(done) {
      var el = setupHeaderElement();
      document.body.appendChild(el.parentNode);
      el.textContent = setupLargeString();

      // When we get an overflow event, make sure we have auto-resized
      // to the minimum possible font size for the large string.
      el.addEventListener('overflow', function onOverflow() {
        el.removeEventListener('overflow', onOverflow);
        assert.equal(parseInt(getComputedStyle(el).fontSize),
                     getMinHeaderFontSize());

        // Now set the smallest string possible, and make sure we have
        // auto-resized back to the maximum possible font size.
        el.textContent = setupSmallString();
        el.addEventListener('underflow', function onUnderflow() {
          el.removeEventListener('underflow', onUnderflow);
          assert.equal(parseInt(getComputedStyle(el).fontSize),
                       getMaxHeaderFontSize());

          // Clean up.
          el.parentNode.removeChild(el);
          done();
        });
      });
    });
  });
});

