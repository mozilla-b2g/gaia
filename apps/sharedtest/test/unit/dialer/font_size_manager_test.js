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
  var bdiNode;
  var innerEl;

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
      },
      {
        element: 'div',
        childElement: 'bdi',
        textField: 'textContent'
      }
    ];

    viewElements.forEach(function(viewElement) {
      suite('on ' + viewElement.element, function() {
        var getExpectedEllipsizedText = function(side, direction) {
          // MockL10n does not invert text when in RTL mode, but FSM will
          // treat the left side as the end for the purpose of ellipses.
          return side === 'end' ? 'fo\u2026' : '\u2026ar';
        };

        setup(function() {
          document.documentElement.style.fontSize = ROOT_FONT_SIZE + 'px';

          view = document.createElement(viewElement.element);
          if(viewElement.childElement) {
            innerEl = document.createElement(viewElement.childElement);
            view.appendChild(innerEl);
          } else {
            innerEl = view;
          }
          innerEl[viewElement.textField] = 'foobar';
          document.body.appendChild(view);
        });

        teardown(function() {
          document.body.innerHTML = '';
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

    suite('special view cases', function() {
      var originalFontSize;

      setup(function() {
        document.documentElement.style.fontSize = ROOT_FONT_SIZE + 'px';

        FontSizeUtils.getMaxFontSizeInfo.returns({
          fontSize: 42,
          overflow: false
        });
      });

      teardown(function() {
        document.body.innerHTML = '';
      });

      suite('on <input> with no value', function() {
        setup(function() {
          view = document.createElement('input');
          document.body.appendChild(view);
        });

        test('no adaptation is made', function() {
          FontSizeManager.adaptToSpace(FontSizeManager.DIAL_PAD, view);
          assert.notEqual(view.style.fontSize, '42px');
        });
      });

      suite('on child <bdi>', function() {
        setup(function() {
          originalFontSize = document.documentElement.style.fontSize;

          document.documentElement.style.fontSize = ROOT_FONT_SIZE + 'px';

          bdiNode = document.createElement('bdi');
          bdiNode.textContent = 'testing';

          view = document.createElement('div');
          view.appendChild(bdiNode);

          document.body.appendChild(view);
        });

        teardown(function() {
          document.body.innerHTML = '';
          document.documentElement.style.fontSize = originalFontSize;
        });

        test('bdi Node is preserved', function() {
          FontSizeUtils.getMaxFontSizeInfo.returns({
            fontSize: 42,
            overflow: true
          });

          FontSizeManager.adaptToSpace(FontSizeManager.SINGLE_CALL, view);
          var el = view.querySelector('bdi');
          assert.isNotNull(el);
        });
      });

      suite('on <div> with no text content', function() {
        setup(function() {
          view = document.createElement('div');
          document.body.appendChild(view);
        });

        test('no adaptation is made', function() {
          FontSizeManager.adaptToSpace(FontSizeManager.DIAL_PAD, view);
          assert.notEqual(view.style.fontSize, '42px');
        });
      });

      // Bug 1082139 - JavascriptException: JavascriptException: TypeError:
      //  window.getComputedStyle(...) is null at://
      //  app://callscreen.gaiamobile.org/gaia_build_defer_index.js line: 146
      suite('if window.getComputedStyle(view) is null', function() {
        setup(function() {
          view = document.createElement('input');
          view.value = 'foobar';
          document.body.appendChild(view);

          this.sinon.stub(window, 'getComputedStyle').returns(null);
        });

        test('no adaptation is made', function() {
          FontSizeManager.adaptToSpace(FontSizeManager.DIAL_PAD, view);
          assert.notEqual(view.style.fontSize, '42px');
        });
      });
    });
  });

  suite('ensureFixedBaseline', function() {
    setup(function() {
      document.documentElement.style.fontSize = ROOT_FONT_SIZE + 'px';
      view = document.createElement('div');
      view.textContent = 'foobar';
      document.body.appendChild(view);
    });

    teardown(function() {
      document.body.innerHTML = '';
    });

    test('sets correct line heights', function() {
      FontSizeManager.ensureFixedBaseline(FontSizeManager.SINGLE_CALL, view);
      assert.equal(view.style.lineHeight, '46px');

      view.style.fontSize = '100px';
      FontSizeManager.ensureFixedBaseline(FontSizeManager.SINGLE_CALL, view);
      assert.equal(view.style.lineHeight, '1px');
    });
  });

  suite('resetFixedBaseline', function() {
    setup(function() {
      view = document.createElement('div');
      view.textContent = 'foobar';
      view.style.lineHeight = '12px';
      document.body.appendChild(view);
    });

    teardown(function() {
      document.body.innerHTML = '';
    });

    test('resets line heights', function() {
      FontSizeManager.resetFixedBaseline(view);
      assert.equal(view.style.lineHeight, '');
    });
  });
});
