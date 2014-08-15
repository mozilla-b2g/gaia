/* globals FontSizeManager, FontSizeUtils, MocksHelper */

'use strict';

require('/shared/test/unit/mocks/mock_font_size_utils.js');
require('/shared/js/dialer/font_size_manager.js');

var mocksHelperForCallScreen = new MocksHelper([
  'FontSizeUtils'
]).init();

suite('font size manager', function() {

  var ROOT_FONT_SIZE = 10;

  var view;

  mocksHelperForCallScreen.attachTestHelpers();

  setup(function() {
    document.documentElement.style.fontSize = ROOT_FONT_SIZE + 'px';
    view = document.createElement('div');
    view.textContent = 'foobar';
    document.body.appendChild(view);
  });

  teardown(function() {
    document.body.innerHTML = '';
  });

  suite('adaptToSpace', function() {
    setup(function() {
      this.sinon.stub(FontSizeUtils, 'getMaxFontSizeInfo');
    });

    var scenarios = [0,  // FontSizeManager.DIAL_PAD
                     1,  // FontSizeManager.SINGLE_CALL
                     2,  // FontSizeManager.CALL_WAITING
                     3,  // FontSizeManager.STATUS_BAR
                     4]; // FontSizeManager.SECOND_INCOMING_CALL
    scenarios.forEach(function(scenario) {
      test('does nothing for empty inputs, scenario ' + scenario, function() {
        view = document.createElement('input');
        document.body.appendChild(view);
        FontSizeManager.adaptToSpace(scenario, view);
        assert.equal(view.style.fontSize, '');
      });

      test('does nothing for empty elements, scenario ' + scenario, function() {
        view.textContent = '';
        FontSizeManager.adaptToSpace(scenario, view);
        assert.equal(view.style.fontSize, '');
      });
    });

    test('calls FSU with the proper arguments', function() {
      FontSizeUtils.getMaxFontSizeInfo.returns({fontSize: 10, overflow: false});
      view.style.fontFamily = 'Arial';
      view.style.width = '200px';
      FontSizeManager.adaptToSpace(FontSizeManager.DIAL_PAD, view);
      sinon.assert.calledWith(
        FontSizeUtils.getMaxFontSizeInfo, view.textContent,
        [26, 30, 34, 38, 41], view.style.fontFamily, 200);
    });

    test('changes the font size', function() {
      FontSizeUtils.getMaxFontSizeInfo.returns({fontSize: 42, overflow: false});
      FontSizeManager.adaptToSpace(FontSizeManager.DIAL_PAD, view);
      assert.equal(view.style.fontSize, '42px');
    });

    test('forces maxfontsize', function() {
      FontSizeUtils.getMaxFontSizeInfo.returns({fontSize: 10, overflow: false});
      FontSizeManager.adaptToSpace(FontSizeManager.DIAL_PAD, view, true);
      sinon.assert.calledWith(
        FontSizeUtils.getMaxFontSizeInfo, view.textContent, [41]);
    });

    test('adds ellipsis', function() {
      FontSizeUtils.getMaxFontSizeInfo.returns({fontSize: 10, overflow: true});
      this.sinon.stub(FontSizeUtils, 'getOverflowCount').returns(2);
      FontSizeManager.adaptToSpace(FontSizeManager.DIAL_PAD, view, true);
      assert.equal(view.textContent, '\u2026ar');
    });

    test('adds ellipsis to the correct side', function() {
      FontSizeUtils.getMaxFontSizeInfo.returns({fontSize: 10, overflow: true});
      this.sinon.stub(FontSizeUtils, 'getOverflowCount').returns(2);
      FontSizeManager.adaptToSpace(FontSizeManager.DIAL_PAD, view, true, 'end');
      assert.equal(view.textContent, 'fo\u2026');
    });

    suite('when view is an input element with value', function() {
      setup(function() {
        view = document.createElement('input');
        view.value = 'foobar';
        document.body.appendChild(view);
      });

      test('calls FSU with the proper arguments', function() {
        FontSizeUtils.getMaxFontSizeInfo.returns({
          fontSize: 10, overflow: false});
        view.style.fontFamily = 'Arial';
        view.style.width = '200px';
        document.body.appendChild(view);
        FontSizeManager.adaptToSpace(FontSizeManager.DIAL_PAD, view);
        sinon.assert.calledWith(
          FontSizeUtils.getMaxFontSizeInfo, view.value,
          [26, 30, 34, 38, 41], view.style.fontFamily,
          view.getBoundingClientRect().width);
      });

      test('changes the font size', function() {
        FontSizeUtils.getMaxFontSizeInfo.returns({
          fontSize: 42, overflow: false});
        FontSizeManager.adaptToSpace(FontSizeManager.DIAL_PAD, view);
        assert.equal(view.style.fontSize, '42px');
      });

      test('forces maxfontsize', function() {
        FontSizeUtils.getMaxFontSizeInfo.returns({
          fontSize: 10, overflow: false});
        FontSizeManager.adaptToSpace(FontSizeManager.DIAL_PAD, view, true);
        sinon.assert.calledWith(
          FontSizeUtils.getMaxFontSizeInfo, view.value, [41]);
      });

      test('adds ellipsis', function() {
        FontSizeUtils.getMaxFontSizeInfo.returns({
          fontSize: 10, overflow: true});
        this.sinon.stub(FontSizeUtils, 'getOverflowCount').returns(2);
        FontSizeManager.adaptToSpace(FontSizeManager.DIAL_PAD, view, true);
        assert.equal(view.value, '\u2026ar');
      });

      test('adds ellipsis to the correct side', function() {
        FontSizeUtils.getMaxFontSizeInfo.returns({
          fontSize: 10, overflow: true});
        this.sinon.stub(FontSizeUtils, 'getOverflowCount').returns(2);
        FontSizeManager.adaptToSpace(
          FontSizeManager.DIAL_PAD, view, true, 'end');
        assert.equal(view.value, 'fo\u2026');
      });

    });
  });

  test('ensureFixedBaseline', function() {
    FontSizeManager.ensureFixedBaseline(FontSizeManager.SINGLE_CALL, view);
    assert.equal(view.style.lineHeight, '49px');

    view.style.fontSize = '100px';
    FontSizeManager.ensureFixedBaseline(FontSizeManager.SINGLE_CALL, view);
    assert.equal(view.style.lineHeight, '4px');
  });
});
