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
  const leftButtonWidth = 25;
  const rightButtonWidth = 55;

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

  // string just barely smaller than the container width, with whitespace
  // around it that should be discarded for size calculations
  function setupMediumStringWithSpace(size, face) {
    text = generateStringForPixels(kContainerWidth, size, face);
    return  '  \n  ' + text + '  \n  ';
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

  function setupHeaderElementWithButtons() {
    var headerText = setupHeaderElement();
    var header = headerText.parentNode;
    var leftButton = document.createElement('button');
    var rightButton = document.createElement('button');

    header.insertBefore(leftButton, headerText);
    header.appendChild(rightButton);

    header.style.width = (kContainerWidth + leftButtonWidth +
      rightButtonWidth) + 'px';

    leftButton.style.cssFloat = 'left';
    leftButton.style.width = leftButtonWidth + 'px';

    rightButton.style.cssFloat = 'right';
    rightButton.style.width = rightButtonWidth + 'px';

    headerText.style.margin = '0';
    // use maximum header fontSize
    var sizes = FontSizeUtils.getAllowedSizes(headerText);
    headerText.style.fontSize = sizes[sizes.length - 1] + 'px';
    headerText.style.fontFamily = kDefaultFace;
    return headerText;
  }

  function setupNonHeaderElement() {
    var headerText = document.createElement('h1');
    var header = document.createElement('div');

    header.appendChild(headerText);

    header.style.width = kContainerWidth + 'px';

    headerText.style.overflow = 'hidden';
    headerText.style.textOverflow = 'ellipsis';
    headerText.style.fontFamily = kDefaultFace;
    return headerText;
  }

  function getMaxHeaderFontSize() {
    var sizes = FontSizeUtils.getAllowedSizes(setupHeaderElement());
    return sizes[sizes.length - 1];
  }

  function getMinHeaderFontSize() {
    var sizes = FontSizeUtils.getAllowedSizes(setupHeaderElement());
    return sizes[0];
  }

  function lazyLoad(element) {
    document.body.appendChild(element);
    window.dispatchEvent(new CustomEvent('lazyload', {
      detail: element
    }));
  }

  // Returns true if a text is wrapped.
  function isWrapped(element) {
    return element.clientWidth < element.scrollWidth;
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
        ctx.font = 'italic ' + fontSize + 'px ' + kDefaultFace;
        assert.equal(ctx.measureText(string).width,
                     FontSizeUtils.getFontWidth(string, fontSize,
                                                kDefaultFace));
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

  suite('FontSizeUtils.resetCentering', function() {
    test('Should reset margin of header elements', function() {
      var el = setupHeaderElement();
      el.style.marginLeft = el.style.marginRight = '10px';
      FontSizeUtils.resetCentering(el);
      assert.equal(parseInt(el.style.marginLeft, 10), 0);
      assert.equal(parseInt(el.style.marginRight, 10), 0);
    });
  });

  suite('FontSizeUtils.autoResizeElement', function() {
    test('Should not resize a small header title', function() {
      var el = setupHeaderElement();
      var fontSizeBefore = getComputedStyle(el).fontSize;
      var style = FontSizeUtils.getStyleProperties(el);

      el.textContent = setupSmallString(fontSizeBefore);
      FontSizeUtils.autoResizeElement(el, style);

      assert.equal(fontSizeBefore, getComputedStyle(el).fontSize);
    });

    test('Should not resize a medium header title', function() {
      var el = setupHeaderElement();
      var fontSizeBefore = getComputedStyle(el).fontSize;
      var style = FontSizeUtils.getStyleProperties(el);

      el.textContent = setupMediumString(parseInt(fontSizeBefore));
      FontSizeUtils.autoResizeElement(el, style);

      assert.equal(fontSizeBefore, getComputedStyle(el).fontSize);
    });


    test('Should not resize a medium header title with space', function() {
      var el = setupHeaderElement();
      var fontSizeBefore = getComputedStyle(el).fontSize;
      var style = FontSizeUtils.getStyleProperties(el);

      el.textContent = setupMediumStringWithSpace(parseInt(fontSizeBefore));
      FontSizeUtils.autoResizeElement(el, style);

      assert.equal(fontSizeBefore, getComputedStyle(el).fontSize);
    });

    test('Should resize a barely overflowing header title', function() {
      var el = setupHeaderElement();
      var fontSizeBefore = getComputedStyle(el).fontSize;
      var style = FontSizeUtils.getStyleProperties(el);

      el.textContent = setupMediumPlusString(parseInt(fontSizeBefore));
      FontSizeUtils.autoResizeElement(el, style);

      assert.notEqual(fontSizeBefore, getComputedStyle(el).fontSize);
    });

    test('Should resize to minimum a very long header title', function() {
      var el = setupHeaderElement();
      var fontSizeBefore = '50px';
      el.style.fontSize = fontSizeBefore;
      var style = FontSizeUtils.getStyleProperties(el);

      el.textContent = setupLargeString(parseInt(fontSizeBefore));
      FontSizeUtils.autoResizeElement(el, style);

      assert.notEqual(getMinHeaderFontSize(), getComputedStyle(el).fontSize);
    });
  });

  suite('FontSizeUtils.autoResizeElement on non-headers', function() {
    test('Should not resize a small header title', function() {
      var el = setupNonHeaderElement();
      var fontSizeBefore = '50px';
      el.style.fontSize = fontSizeBefore;

      el.textContent = setupSmallString(fontSizeBefore);

      document.body.appendChild(el.parentNode);
      FontSizeUtils.autoResizeElement(el);

      assert.equal(fontSizeBefore, getComputedStyle(el).fontSize);
      assert.isFalse(isWrapped(el));

      // Clean up.
      document.body.removeChild(el.parentNode);
    });

    test('Should not resize a medium header title', function() {
      var el = setupNonHeaderElement();
      var fontSizeBefore = '50px';
      el.style.fontSize = fontSizeBefore;

      el.textContent = setupMediumString(parseInt(fontSizeBefore));

      document.body.appendChild(el.parentNode);
      FontSizeUtils.autoResizeElement(el);

      assert.equal(fontSizeBefore, getComputedStyle(el).fontSize);
      assert.isFalse(isWrapped(el));

      // Clean up.
      document.body.removeChild(el.parentNode);
    });

    test('Should not resize a barely overflowing header title', function() {
      var el = setupNonHeaderElement();
      var fontSizeBefore = '50px';
      el.style.fontSize = fontSizeBefore;

      el.textContent = setupMediumPlusString(parseInt(fontSizeBefore));

      document.body.appendChild(el.parentNode);
      FontSizeUtils.autoResizeElement(el);

      assert.equal(fontSizeBefore, getComputedStyle(el).fontSize);
      assert.isTrue(isWrapped(el));

      // Clean up.
      document.body.removeChild(el.parentNode);
    });

    test('Should not resize to minimum a very long header title', function() {
      var el = setupNonHeaderElement();
      var fontSizeBefore = '50px';
      el.style.fontSize = fontSizeBefore;

      el.textContent = setupLargeString(parseInt(fontSizeBefore));

      document.body.appendChild(el.parentNode);
      FontSizeUtils.autoResizeElement(el);

      assert.equal(fontSizeBefore, getComputedStyle(el).fontSize);
      assert.isTrue(isWrapped(el));

      // Clean up.
      document.body.removeChild(el.parentNode);
    });
  });

  suite('FontSizeUtils auto resize Mutation Observer', function() {
    var rAFStub;

    setup(function() {
      // Make sure that we don't depend on requestAnimationFrame timing.
      rAFStub = sinon.stub(window, 'requestAnimationFrame').yields();
    });

    teardown(function() {
      rAFStub.restore();
    });

    test('Should auto-resize back up when text changes', function(done) {
      var el = setupHeaderElement();
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

      lazyLoad(el.parentNode);
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

  suite('FontSizeUtils.centerTextToScreen', function() {
    suiteSetup(function() {
      // Body often has a default margin which needs to be removed
      // for the centering logic to work like it does in apps.
      document.body.style.margin = '0';

      sinon.stub(FontSizeUtils, 'getWindowWidth', function() {
        return kContainerWidth + leftButtonWidth + rightButtonWidth;
      });
    });

    test('Should center a small header title', function() {
      var el = setupHeaderElementWithButtons();
      var fontSizeBefore = getComputedStyle(el).fontSize;

      el.textContent = setupSmallString(fontSizeBefore);
      document.body.appendChild(el.parentNode);

      FontSizeUtils._reformatHeaderText(el);

      var margin = Math.max(leftButtonWidth, rightButtonWidth);
      assert.equal(parseInt(el.style.marginLeft, 10), margin);
      assert.equal(parseInt(el.style.marginRight, 10), margin);

      // Clean up.
      document.body.removeChild(el.parentNode);
    });

    test('Should not center a medium header title', function() {
      var el = setupHeaderElementWithButtons();
      var fontSizeBefore = getComputedStyle(el).fontSize;

      el.textContent = setupMediumString(parseInt(fontSizeBefore));
      document.body.appendChild(el.parentNode);

      FontSizeUtils._reformatHeaderText(el);

      assert.equal(parseInt(el.style.marginLeft, 10), 0);
      assert.equal(parseInt(el.style.marginRight, 10), 0);

      // Clean up.
      document.body.removeChild(el.parentNode);
    });

    test('Should not center a barely overflowing header title', function() {
      var el = setupHeaderElementWithButtons();
      var fontSizeBefore = getComputedStyle(el).fontSize;

      el.textContent = setupMediumPlusString(parseInt(fontSizeBefore));
      document.body.appendChild(el.parentNode);

      FontSizeUtils._reformatHeaderText(el);

      assert.equal(parseInt(el.style.marginLeft, 10), 0);
      assert.equal(parseInt(el.style.marginRight, 10), 0);

      // Clean up.
      document.body.removeChild(el.parentNode);
    });

    test('Should not center a very long header title', function() {
      var el = setupHeaderElementWithButtons();
      var fontSizeBefore = getComputedStyle(el).fontSize;

      el.textContent = setupLargeString(parseInt(fontSizeBefore));
      document.body.appendChild(el.parentNode);

      FontSizeUtils._reformatHeaderText(el);

      assert.equal(parseInt(el.style.marginLeft, 10), 0);
      assert.equal(parseInt(el.style.marginRight, 10), 0);

      // Clean up.
      document.body.removeChild(el.parentNode);
    });

    test('Should not truncate a small header title', function() {
      var el = setupHeaderElementWithButtons();
      var fontSizeBefore = getComputedStyle(el).fontSize;

      el.textContent = setupSmallString(fontSizeBefore);
      document.body.appendChild(el.parentNode);

      FontSizeUtils._reformatHeaderText(el);

      // Clean up.
      document.body.removeChild(el.parentNode);
    });

    test('Should not truncate a medium header title', function() {
      var el = setupHeaderElementWithButtons();
      var fontSizeBefore = getComputedStyle(el).fontSize;

      el.textContent = setupMediumString(parseInt(fontSizeBefore));
      document.body.appendChild(el.parentNode);

      FontSizeUtils._reformatHeaderText(el);

      // Clean up.
      document.body.removeChild(el.parentNode);
    });

    test('Should truncate a barely overflowing header title', function(done) {
      var el = setupHeaderElementWithButtons();
      var fontSizeBefore = getComputedStyle(el).fontSize;

      el.textContent = setupMediumPlusString(parseInt(fontSizeBefore));
      document.body.appendChild(el.parentNode);

      el.addEventListener('overflow', function onOverflow() {
        el.removeEventListener('overflow', onOverflow);

        // Clean up.
        document.body.removeChild(el.parentNode);
        done();
      });
    });

    test('Should truncate a very long header title', function(done) {
      var el = setupHeaderElementWithButtons();
      var fontSizeBefore = getComputedStyle(el).fontSize;

      el.textContent = setupLargeString(parseInt(fontSizeBefore));
      document.body.appendChild(el.parentNode);

      el.addEventListener('overflow', function onOverflow() {
        el.removeEventListener('overflow', onOverflow);

        // Clean up.
        document.body.removeChild(el.parentNode);
        done();
      });
    });
  });

  suite('Lazy-Loading DOM MutationObserver', function() {
    var rAFStub;

    setup(function() {
      // Make sure that we don't depend on requestAnimationFrame timing.
      rAFStub = sinon.stub(window, 'requestAnimationFrame').yields();
    });

    teardown(function() {
      rAFStub.restore();
    });

    test('Lazy loaded header should cause reformat', function(done) {
      var el = setupHeaderElement();
      el.textContent = setupLargeString();

      var stub = sinon.stub(FontSizeUtils, '_reformatHeaderText', function() {
        document.body.removeChild(el.parentNode);
        stub.restore();
        assert.isTrue(stub.calledWith(el));
        done();
      });

      lazyLoad(el.parentNode);
    });

    test('Non-header lazy load should not cause reformat', function(done) {
      var el = setupNonHeaderElement();
      el.textContent = setupLargeString();

      var spy = sinon.spy(FontSizeUtils, '_reformatHeaderText');
      assert.isTrue(spy.notCalled);

      el.addEventListener('overflow', function() {
        document.body.removeChild(el.parentNode);
        spy.restore();
        assert.isTrue(spy.notCalled);
        done();
      });

      lazyLoad(el.parentNode);
    });
  });
});
