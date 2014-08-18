/* globals FontSizeManager, FontSizeUtils, MocksHelper, MockL10n */

'use strict';

require('/shared/test/unit/mocks/mock_font_size_utils.js');
require('/shared/test/unit/mocks/mock_l10n.js');

require('/shared/js/dialer/font_size_manager.js');

var mocksHelperForCallScreen = new MocksHelper([
  'FontSizeUtils'
]).init();

suite('font size manager', function() {
  var ROOT_FONT_SIZE = 10;

  var realMozL10n;

  var view;

  mocksHelperForCallScreen.attachTestHelpers();

  suiteSetup(function() {
    realMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
  });

  suiteTeardown(function() {
    navigator.mozL10n = realMozL10n;
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

    var viewElements = [
      {
        element: 'div',
        textField: 'textContent'
      },
      {
        element: 'input',
        textField: 'value'
      }
    ];

    viewElements.forEach(function(viewElement) {
      suite('on ' + viewElement.element, function() {
        var originalInnerHTML;

        var getExpectedEllipsizedText = function(side, direction) {
          // MockL10n does not invert text when in RTL mode, but FSM will
          // treat the left side as the end for the purpose of ellipses.
          return side === 'end' ^ direction === 'ltr' ? '\u2026ar' : 'fo\u2026';
        };

        setup(function() {
          originalInnerHTML = document.body.innerHTML;
          document.documentElement.style.fontSize = ROOT_FONT_SIZE + 'px';
          view = document.createElement(viewElement.element);
          view[viewElement.textField] = 'foobar';
          document.body.appendChild(view);
        });

        teardown(function() {
          document.body.innerHTML = originalInnerHTML;
        });

        test('calls FSU with the proper arguments', function() {
          FontSizeUtils.getMaxFontSizeInfo.returns({
            fontSize: 10,
            overflow: false
          });

          view.style.fontFamily = 'Arial';
          view.style.width = '200px';

          FontSizeManager.adaptToSpace(FontSizeManager.DIAL_PAD, view);

          sinon.assert.calledWith(FontSizeUtils.getMaxFontSizeInfo,
                                  view[viewElement.textField],
                                  [26, 30, 34, 38, 41],
                                  view.style.fontFamily,
                                  view.getBoundingClientRect().width);
        });

        test('changes the font size', function() {
          FontSizeUtils.getMaxFontSizeInfo.returns({
            fontSize: 42,
            overflow: false
          });

          FontSizeManager.adaptToSpace(FontSizeManager.DIAL_PAD, view);

          assert.equal(view.style.fontSize, '42px');
        });

        test('forces maxfontsize', function() {
          FontSizeUtils.getMaxFontSizeInfo.returns({
            fontSize: 10,
            overflow: false
          });

          FontSizeManager.adaptToSpace(FontSizeManager.DIAL_PAD, view, true);

          sinon.assert.calledWith(FontSizeUtils.getMaxFontSizeInfo,
                                  view[viewElement.textField],
                                  [41]);
        });

        suite('ellipses in LTR/RTL modes', function() {
          var l10nLanguageDirection;

          suiteSetup(function() {
            l10nLanguageDirection = MockL10n.language.direction;
          });

          suiteTeardown(function() {
            MockL10n.language.direction = l10nLanguageDirection;
          });

          ['ltr', 'rtl'].forEach(function(direction) {
            test('adds ellipsis', function() {
              MockL10n.language.direction = direction;

              FontSizeUtils.getMaxFontSizeInfo.returns({
                fontSize: 10,
                overflow: true
              });
              this.sinon.stub(FontSizeUtils, 'getOverflowCount').returns(2);

              FontSizeManager.adaptToSpace(FontSizeManager.DIAL_PAD, view,
                                           true);

              assert.equal(view[viewElement.textField],
                           getExpectedEllipsizedText('begin', direction));
            });

            test('adds ellipsis to the correct side', function() {
              MockL10n.language.direction = direction;

              FontSizeUtils.getMaxFontSizeInfo.returns({
                fontSize: 10,
                overflow: true
              });
              this.sinon.stub(FontSizeUtils, 'getOverflowCount').returns(2);

              FontSizeManager.adaptToSpace(FontSizeManager.DIAL_PAD, view, true,
                                           'end');

              assert.equal(view[viewElement.textField],
                           getExpectedEllipsizedText('end', direction));
            });
          });
        });
      });
    });
  });

  suite('ensureFixedBaseline', function() {
    var originalInnerHTML;

    setup(function() {
      originalInnerHTML = document.body.innerHTML;
      document.documentElement.style.fontSize = ROOT_FONT_SIZE + 'px';
      view = document.createElement('div');
      view.textContent = 'foobar';
      document.body.appendChild(view);
    });

    teardown(function() {
      document.body.innerHTML = originalInnerHTML;
    });

    test('sets correct line heights', function() {
      FontSizeManager.ensureFixedBaseline(FontSizeManager.SINGLE_CALL, view);
      assert.equal(view.style.lineHeight, '49px');

      view.style.fontSize = '100px';
      FontSizeManager.ensureFixedBaseline(FontSizeManager.SINGLE_CALL, view);
      assert.equal(view.style.lineHeight, '4px');
    });
  });
});
