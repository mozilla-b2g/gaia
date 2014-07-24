/* globals LazyL10n */

/* exported FontSizeManager */

'use strict';

var FontSizeManager = (function fontSizeManager() {
  var _K_FONT_STEP = 1;

  /**
   * The following font sizes are in rems.
   */
  var _MAX_FONT_SIZE_DIAL_PAD = 4.1,
      _MIN_FONT_SIZE_DIAL_PAD = 2.6,
      _MAX_FONT_SIZE_SINGLE_CALL = 3.4,
      _MIN_FONT_SIZE_SINGLE_CALL = 2.3,
      _MAX_FONT_SIZE_CALL_WAITING = 2.5,
      _MIN_FONT_SIZE_CALL_WAITING = 2.3,
      _MAX_FONT_SIZE_STATUS_BAR = 1.7,
      _MIN_FONT_SIZE_STATUS_BAR = 1.7,
      _MAX_FONT_SIZE_SECOND_INCOMING_CALL = 2.5,
      _MIN_FONT_SIZE_SECOND_INCOMING_CALL = 2.3;

  /**
   * These are the line-heights for the single call and call waiting scenarios
   *  needed to keep the baseline of the text no matter the font size (see
   *  bug 1010104).
   */
  var _SINGLE_CALL_LINE_HEIGHT = 3.7,
      _CALL_WAITING_LINE_HEIGHT = 1.5,
      _SECOND_INCOMING_CALL_LINE_HEIGHT = 3.7;

  /**
   * Possible scenarios in which the dialer and call screen can be in.
   */
  var DIAL_PAD = 0,
      SINGLE_CALL = 1,
      CALL_WAITING = 2,
      STATUS_BAR = 3,
      SECOND_INCOMING_CALL = 4;

  var _defaultFontSize;

  function _getDefaultFontSize() {
    _defaultFontSize = _defaultFontSize ||
      parseInt(window.getComputedStyle(document.body, null).
               getPropertyValue('font-size'));
    return _defaultFontSize;
  }

  function _getMinFontSize(scenario) {
    var minFontSize;
    switch (scenario) {
    case DIAL_PAD:
      minFontSize = _MIN_FONT_SIZE_DIAL_PAD;
      break;
    case SINGLE_CALL:
      minFontSize = _MIN_FONT_SIZE_SINGLE_CALL;
      break;
    case CALL_WAITING:
      minFontSize = _MIN_FONT_SIZE_CALL_WAITING;
      break;
    case STATUS_BAR:
      minFontSize = _MIN_FONT_SIZE_STATUS_BAR;
      break;
    case SECOND_INCOMING_CALL:
      minFontSize = _MIN_FONT_SIZE_SECOND_INCOMING_CALL;
      break;
    }
    return Math.round(minFontSize * _getDefaultFontSize());
  }

  function _getMaxFontSize(scenario) {
    var maxFontSize;
    switch (scenario) {
    case DIAL_PAD:
      maxFontSize = _MAX_FONT_SIZE_DIAL_PAD;
      break;
    case SINGLE_CALL:
      maxFontSize = _MAX_FONT_SIZE_SINGLE_CALL;
      break;
    case CALL_WAITING:
      maxFontSize = _MAX_FONT_SIZE_CALL_WAITING;
      break;
    case STATUS_BAR:
      maxFontSize = _MAX_FONT_SIZE_STATUS_BAR;
      break;
    case SECOND_INCOMING_CALL:
      maxFontSize = _MAX_FONT_SIZE_SECOND_INCOMING_CALL;
      break;
    }
    return Math.round(maxFontSize * _getDefaultFontSize());
  }

  function _addEllipsis(view, fakeView, ellipsisSide) {
    var side = ellipsisSide || 'begin';
    LazyL10n.get(function localized(_) {
      var localizedSide;
      if (navigator.mozL10n.language.direction === 'rtl') {
        localizedSide = (side === 'begin' ? 'right' : 'left');
      } else {
        localizedSide = (side === 'begin' ? 'left' : 'right');
      }
      var computedStyle = window.getComputedStyle(view, null);
      var currentFontSize = parseInt(
        computedStyle.getPropertyValue('font-size')
      );
      var viewWidth = view.getBoundingClientRect().width;
      fakeView.style.fontSize = currentFontSize + 'px';
      fakeView.style.fontWeight = computedStyle.getPropertyValue('font-weight');
      var value = fakeView.innerHTML = view.value ? view.value : view.innerHTML;

      // Guess the possible position of the ellipsis in order to minimize
      // the following while loop iterations:
      var counter = value.length -
        (viewWidth *
         (fakeView.textContent.length /
           fakeView.getBoundingClientRect().width));

      var newPhoneNumber;
      while (fakeView.getBoundingClientRect().width > viewWidth) {

        if (localizedSide == 'left') {
          newPhoneNumber = '\u2026' + value.substr(-value.length + counter);
        } else if (localizedSide == 'right') {
          newPhoneNumber = value.substr(0, value.length - counter) + '\u2026';
        }

        fakeView.innerHTML = newPhoneNumber;
        counter++;
      }

      if (newPhoneNumber) {
        if (view.value) {
          view.value = newPhoneNumber;
        } else {
          view.innerHTML = newPhoneNumber;
        }
      }
    });
  }

  function _getNextFontSize(view, fakeView, minFontSize, maxFontSize) {
    var computedStyle = window.getComputedStyle(view, null);
    var fontSize = parseInt(computedStyle.getPropertyValue('font-size'));
    if (fontSize >= maxFontSize) {
      fontSize = maxFontSize;
    } else if (fontSize <= minFontSize) {
      fontSize = minFontSize;
    }
    var viewWidth = view.getBoundingClientRect().width;
    fakeView.style.fontSize = fontSize + 'px';
    fakeView.innerHTML = (view.value ? view.value : view.innerHTML);

    var rect = fakeView.getBoundingClientRect();

    while ((rect.width < viewWidth) && (fontSize < maxFontSize)) {
      fontSize = Math.min(fontSize + _K_FONT_STEP, maxFontSize);
      fakeView.style.fontSize = fontSize + 'px';
      rect = fakeView.getBoundingClientRect();
    }

    while ((rect.width > viewWidth) && (fontSize > minFontSize)) {
      fontSize = Math.max(fontSize - _K_FONT_STEP, minFontSize);
      fakeView.style.fontSize = fontSize + 'px';
      rect = fakeView.getBoundingClientRect();
    }

    return fontSize;
  }

  function adaptToSpace(scenario, view, fakeView, forceMaxFontSize,
                        ellipsisSide) {
    var maxFontSize = _getMaxFontSize(scenario),
        minFontSize,
        initialLineHeight;

    // We consider the case where the delete button may have
    // been used to delete the whole phone number.
    if (view.value === '') {
      view.style.fontSize = maxFontSize;
      return;
    }

    var newFontSize;
    if (forceMaxFontSize) {
      newFontSize = maxFontSize;
    } else {
      minFontSize = _getMinFontSize(scenario);
      newFontSize =
        _getNextFontSize(view, fakeView, minFontSize, maxFontSize);
    }
    if (view.style.fontSize !== minFontSize &&
        view.style.fontSize !== newFontSize) {
      view.style.fontSize = newFontSize + 'px';
      // The baseline should be the same no matter the font size.
      if (view.parentNode.parentNode.classList.contains('additionalInfo')) {
        switch (scenario) {
        case SINGLE_CALL:
          initialLineHeight = _SINGLE_CALL_LINE_HEIGHT;
          break;
        case CALL_WAITING:
          initialLineHeight = _CALL_WAITING_LINE_HEIGHT;
          break;
        case SECOND_INCOMING_CALL:
          initialLineHeight = _SECOND_INCOMING_CALL_LINE_HEIGHT;
          break;
        default:
          initialLineHeight = 0;
          break;
        }
        if (initialLineHeight) {
          // Taking the line height for the maximum font size case for each
          //  scenario as the reference, we need to adjust it adding half of
          //  the decrease to the final calculated font size in pixels.
          view.style.lineHeight = initialLineHeight * _getDefaultFontSize() +
            (maxFontSize - newFontSize) / 2 + 'px';
        }
      }
    }
    _addEllipsis(view, fakeView, ellipsisSide);
  }

  return {
    DIAL_PAD: DIAL_PAD,
    SINGLE_CALL: SINGLE_CALL,
    CALL_WAITING: CALL_WAITING,
    STATUS_BAR: STATUS_BAR,
    SECOND_INCOMING_CALL: SECOND_INCOMING_CALL,
    adaptToSpace: adaptToSpace
  };
})();
