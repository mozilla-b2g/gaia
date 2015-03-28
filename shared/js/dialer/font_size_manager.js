/* globals FontSizeUtils */

/* exported FontSizeManager */

'use strict';

var FontSizeManager = (function fontSizeManager() {
  /**
   * Possible scenarios in which the dialer and call screen can be in.
   */
  var DIAL_PAD = 0,
      SINGLE_CALL = 1,
      CALL_WAITING = 2,
      STATUS_BAR = 3,
      SECOND_INCOMING_CALL = 4;

  /**
   * The following font sizes are in rems.
   */
  var _sizes = {};
  _sizes[DIAL_PAD] = {min: 2.6, max: 4.1};
  _sizes[SINGLE_CALL] = {min: 2.3, max: 3.4, line: 3.4};
  _sizes[CALL_WAITING] = {min: 2.3, max: 2.5, line: 1.3};
  _sizes[STATUS_BAR] = {min: 1.7, max: 1.7};
  _sizes[SECOND_INCOMING_CALL] = {min: 2.3, max: 2.5, line: 3.7};

  var _defaultFontSize;

  function _getRootFontSize() {
    _defaultFontSize = _defaultFontSize ||
      parseInt(window.getComputedStyle(document.body, null).
               getPropertyValue('font-size'));
    return _defaultFontSize;
  }

  function _getMinFontSize(scenario) {
    return Math.round(_sizes[scenario].min * _getRootFontSize());
  }

  function _getMaxFontSize(scenario) {
    return Math.round(_sizes[scenario].max * _getRootFontSize());
  }

  // Returns an array containing each number between scenario.minsize and
  // scenario.maxsize in steps of 4,
  // e.g.[minsize, minsize + 4, minsize + 8, ..., maxsize]
  function _getAllowedFontSizes(scenario) {
    var minFontSize = _getMinFontSize(scenario);
    var maxFontSize = _getMaxFontSize(scenario);
    var allowedSizes = [];
    for (var size = minFontSize; size <= maxFontSize; size +=4) {
      allowedSizes.push(size);
    }
    if (allowedSizes.indexOf(maxFontSize) === -1) {
      allowedSizes.push(maxFontSize);
    }
    return allowedSizes;
  }

  /* The font size of the view will be modified to fit its width. The scenario
     provides the sizing contraints.
     If the content is still too large within the size contraints, it will add
     an ellipsis */
  function adaptToSpace(scenario, view, forceMaxFontSize, ellipsisSide) {
    // Bug 1082139 - JavascriptException: JavascriptException: TypeError:
    //  window.getComputedStyle(...) is null at://
    //  app://callscreen.gaiamobile.org/gaia_build_defer_index.js line: 146
    var computedStyle = window.getComputedStyle(view);
    if ((!view.value && !view.textContent) || !computedStyle) {
      // We don't care about the font size of empty views
      return;
    }

    var viewWidth = view.getBoundingClientRect().width;
    var viewFont = computedStyle.fontFamily;

    var allowedSizes;
    if (forceMaxFontSize) {
      allowedSizes = [_getMaxFontSize(scenario)];
    } else {
      allowedSizes = _getAllowedFontSizes(scenario);
    }

    var infos = FontSizeUtils.getMaxFontSizeInfo(
      view.value || view.textContent, allowedSizes, viewFont, viewWidth);
    var newFontSize = infos.fontSize;
    if (view.style.fontSize !== newFontSize) {
      view.style.fontSize = newFontSize + 'px';
    }

    if (infos && infos.overflow) {
      var overflowCount = FontSizeUtils.getOverflowCount(
        view.value || view.textContent, newFontSize, viewFont, viewWidth);

      // Add two characters to the overflowcount to account for "…" width
      overflowCount += 2;
      _useEllipsis(view, overflowCount, ellipsisSide);
      view.dataset.ellipsedCharacters = overflowCount;
    } else {
      view.dataset.ellipsedCharacters = 0;
    }
  }

  function _useEllipsis(view, overflowCount, ellipsisSide) {
    var side = ellipsisSide || 'begin';
    var localizedSide = (side === 'begin' ? 'left' : 'right');

    var value = view.value || view.textContent;
    if (localizedSide == 'left') {
      value = '\u2026' + value.substr(-value.length + overflowCount);
    } else if (localizedSide == 'right') {
      value = value.substr(0, value.length - overflowCount) + '\u2026';
    }

    if (view.value) {
      view.value = value;
    } else {
      var el = view.querySelector('bdi') || view;
      el.textContent = value;
    }
  }

  function ensureFixedBaseline(scenario, view) {
    var initialLineHeight = _sizes[scenario].line;
    if (!initialLineHeight) {
      return;
    }

    var maxFontSize = _getMaxFontSize(scenario);
    var fontSize = parseInt(window.getComputedStyle(view).fontSize, 10);
    // Taking the line height for the maximum font size case for each
    //  scenario as the reference, we need to adjust it adding half of
    //  the decrease to the final calculated font size in pixels.
    view.style.lineHeight = initialLineHeight * _getRootFontSize() +
                            (maxFontSize - fontSize) / 2 + 'px';
  }

  function resetFixedBaseline(view) {
    view.style.removeProperty('line-height');
  }

  return {
    DIAL_PAD: DIAL_PAD,
    SINGLE_CALL: SINGLE_CALL,
    CALL_WAITING: CALL_WAITING,
    STATUS_BAR: STATUS_BAR,
    SECOND_INCOMING_CALL: SECOND_INCOMING_CALL,
    adaptToSpace: adaptToSpace,
    ensureFixedBaseline: ensureFixedBaseline,
    resetFixedBaseline: resetFixedBaseline
  };
})();
