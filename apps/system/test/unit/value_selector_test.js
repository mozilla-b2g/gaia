'use strict';

mocha.globals(['ValueSelector']);

requireApp('system/js/value_selector/value_selector.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/test/unit/mock_l10n.js');

suite('value selector/value selector', function() {
  var element;

  var realL10n;
  var realKeyboard;
  var realSettings;
  var stubById;

  suiteSetup(function() {
    realSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;

    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    realKeyboard = window.navigator.mozKeyboard;
    window.navigator.mozKeyboard = sinon.stub();
  });

  suiteTeardown(function() {
    navigator.mozSettings = realSettings;
    navigator.mozL10n = realL10n;
    window.navigator.mozKeyboard = realKeyboard;
  });

  teardown(function() {
    stubById.restore();
  });

  setup(function() {
    // mockup element
    function mock_obj() {
      this.querySelector = function() {
        return document.createElement('div');
      };
      this.addEventListener = function() {
        return document.createElement('div');
      };
    };

    stubById = this.sinon.stub(document, 'getElementById')
                   .returns(new mock_obj());

    ValueSelector.init();
    element = document.getElementById('value-selector');
  });

  test('show', function() {
    ValueSelector.show();
    assert.isFalse(element.hidden);
  });

  test('hide', function() {
    ValueSelector.hide();
    assert.isTrue(element.hidden);
  });
});
