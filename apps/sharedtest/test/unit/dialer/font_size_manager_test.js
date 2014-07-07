/* globals FontSizeManager, MocksHelper */

'use strict';

require('/shared/test/unit/mocks/dialer/mock_lazy_l10n.js');
require('/shared/js/dialer/font_size_manager.js');

var mocksHelperForCallScreen = new MocksHelper([
  'LazyL10n'
]).init();

suite('font size manager', function() {
  /**
   * Maximum and minimum font sizes depending on the scenario as defined in
   *  FontSizeManager.
   */
  var _MAX_FONT_SIZE_DIAL_PAD = 4.1,
      _MIN_FONT_SIZE_DIAL_PAD = 2.6,
      _MAX_FONT_SIZE_SINGLE_CALL = 3.4,
      _MIN_FONT_SIZE_SINGLE_CALL = 2.3,
      _MAX_FONT_SIZE_CALL_WAITING = 2.5,
      _MIN_FONT_SIZE_CALL_WAITING = 2.3,
      _MAX_FONT_SIZE_STATUS_BAR = 1.7,
      _MIN_FONT_SIZE_STATUS_BAR = 1.7;

  var ROOT_FONT_SIZE = 10;

  var CONTAINER_WIDTH = 20;

  var container,
      view,
      fakeView;

  mocksHelperForCallScreen.attachTestHelpers();

  setup(function() {
    document.documentElement.style.fontSize = ROOT_FONT_SIZE + 'px';
    document.documentElement.style.fontFamily = 'Arial';
    container = document.createElement('div');
    container.style.fontSize = ROOT_FONT_SIZE + 'px';
    container.style.width = CONTAINER_WIDTH + 'rem';
    view = document.createElement('div');
    view.id = 'view';
    view.style.width = '100%';
    view.style.overflow = 'hidden';
    container.appendChild(view);
    fakeView = document.createElement('div');
    fakeView.id = 'fakeView';
    fakeView.style.position = 'absolute';
    container.appendChild(fakeView);
    document.body.appendChild(container);
  });

  teardown(function() {
    document.body.removeChild(container);
  });

  suite('Dial pad scenario', function() {
    test('Should force the maximum font size', function() {
      FontSizeManager.adaptToSpace(
        FontSizeManager.DIAL_PAD, view, fakeView, true, 'end');
      assert.equal(
        view.style.fontSize, _MAX_FONT_SIZE_DIAL_PAD * ROOT_FONT_SIZE + 'px');
    });

    test('Should reduce the font size but not add an ellipsis at the begining',
         function() {
      view.textContent = '1234567890';
      FontSizeManager.adaptToSpace(
        FontSizeManager.DIAL_PAD, view, fakeView, false, 'begin');
      assert.isTrue(
        view.style.fontSize < _MAX_FONT_SIZE_DIAL_PAD * ROOT_FONT_SIZE + 'px');
      assert.isTrue(
        view.style.fontSize > _MIN_FONT_SIZE_DIAL_PAD * ROOT_FONT_SIZE + 'px');
      assert.equal(view.textContent.indexOf('\u2026'), -1);
    });

    test('Should set the minimum font size and add an ellipsis at the begining',
         function() {
      view.textContent = '123456789012345678901234567890';
      FontSizeManager.adaptToSpace(
        FontSizeManager.DIAL_PAD, view, fakeView, false, 'begin');
      assert.equal(
        view.style.fontSize, _MIN_FONT_SIZE_DIAL_PAD * ROOT_FONT_SIZE + 'px');
      assert.equal(view.textContent.indexOf('\u2026'), 0);
    });
  });

  suite('Single call scenario', function() {
    test('Should force the maximum font size', function() {
      FontSizeManager.adaptToSpace(
        FontSizeManager.SINGLE_CALL, view, fakeView, true, 'end');
      assert.equal(
        view.style.fontSize, _MAX_FONT_SIZE_SINGLE_CALL * ROOT_FONT_SIZE +
        'px');
    });

    test('Should reduce the font size but not add an ellipsis at the end',
         function() {
      view.textContent = '1234567890123';
      FontSizeManager.adaptToSpace(
        FontSizeManager.SINGLE_CALL, view, fakeView, false, 'end');
      assert.isTrue(
        view.style.fontSize < _MAX_FONT_SIZE_SINGLE_CALL * ROOT_FONT_SIZE +
        'px');
      assert.isTrue(
        view.style.fontSize > _MIN_FONT_SIZE_SINGLE_CALL * ROOT_FONT_SIZE +
        'px');
      assert.equal(view.textContent.indexOf('\u2026'), -1);
    });

    test('Should set the minimum font size and add an ellipsis at the end',
         function() {
      view.textContent = '123456789012345678901234567890';
      FontSizeManager.adaptToSpace(
        FontSizeManager.SINGLE_CALL, view, fakeView, false, 'end');
      assert.equal(
        view.style.fontSize, _MIN_FONT_SIZE_SINGLE_CALL * ROOT_FONT_SIZE +
        'px');
      assert.equal(
        view.textContent.indexOf('\u2026'), view.textContent.length - 1);
    });
  });

  suite('Call waiting scenario', function() {
    test('Should force the maximum font size', function() {
      FontSizeManager.adaptToSpace(
        FontSizeManager.CALL_WAITING, view, fakeView, true, 'end');
      assert.equal(
        view.style.fontSize, _MAX_FONT_SIZE_CALL_WAITING * ROOT_FONT_SIZE +
        'px');
    });

    test('Should reduce the font size but not add an ellipsis at the end',
         function() {
      view.textContent = '1111111111111';
      FontSizeManager.adaptToSpace(
        FontSizeManager.CALL_WAITING, view, fakeView, false, 'end');
      assert.isTrue(
        view.style.fontSize <= _MAX_FONT_SIZE_CALL_WAITING * ROOT_FONT_SIZE +
        'px');
      assert.isTrue(
        view.style.fontSize >= _MIN_FONT_SIZE_CALL_WAITING * ROOT_FONT_SIZE +
        'px');
      assert.equal(view.textContent.indexOf('\u2026'), -1);
    });

    test('Should set the minimum font size and add an ellipsis at the end',
         function() {
      view.textContent = '123456789012345678901234567890';
      FontSizeManager.adaptToSpace(
        FontSizeManager.CALL_WAITING, view, fakeView, false, 'end');
      assert.equal(
        view.style.fontSize, _MIN_FONT_SIZE_CALL_WAITING * ROOT_FONT_SIZE +
        'px');
      assert.equal(
        view.textContent.indexOf('\u2026'), view.textContent.length - 1);
    });
  });

  suite('Status bar scenario', function() {
    test('Should force the maximum font size', function() {
      FontSizeManager.adaptToSpace(
        FontSizeManager.STATUS_BAR, view, fakeView, true, 'end');
      assert.equal(
        view.style.fontSize, _MAX_FONT_SIZE_STATUS_BAR * ROOT_FONT_SIZE + 'px');
    });

    test('Should use the fixed font size but not add an ellipsis at the end',
         function() {
      view.textContent = '1234567890123';
      FontSizeManager.adaptToSpace(
        FontSizeManager.STATUS_BAR, view, fakeView, false, 'end');
      assert.isTrue(
        view.style.fontSize == _MAX_FONT_SIZE_STATUS_BAR * ROOT_FONT_SIZE +
        'px');
      assert.equal(view.textContent.indexOf('\u2026'), -1);
    });

    test('Should set the minimum font size and add an ellipsis at the end',
         function() {
      view.textContent = '123456789012345678901234567890';
      FontSizeManager.adaptToSpace(
        FontSizeManager.STATUS_BAR, view, fakeView, false, 'end');
      assert.equal(
        view.style.fontSize, _MIN_FONT_SIZE_STATUS_BAR * ROOT_FONT_SIZE + 'px');
      assert.equal(
        view.textContent.indexOf('\u2026'), view.textContent.length - 1);
    });
  });
});
