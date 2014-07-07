'use strict';

mocha.globals(['MockL10n']);

suite('LanguageItem', function() {
  var expectedTitle = 'English';
  var realL10n;
  var modules = [
    'unit/mock_l10n',
    'panels/root/language_item',
  ];
  var map = {
    'panels/root/language_item': {
      'utils': 'MockUtils'
    }
  };

  suiteSetup(function(done) {
    var requireCtx = testRequire([], map, function() {});
    define('MockUtils', function() {
      window.getSupportedLanguages = function(callback) {
        callback({ 'en-US': expectedTitle });
      };
    });

    requireCtx(modules, function(MockL10n, LanguageItem) {
      realL10n = window.navigator.mozL10n;
      window.navigator.mozL10n = MockL10n;

      this.LanguageItem = LanguageItem;
      done();
    }.bind(this));
  });

  suiteTeardown(function() {
    window.navigator.mozL10n = realL10n;
    window.getSupportedLanguages = null;
  });

  setup(function() {
    this.element = document.createElement('div');
    this.subject = this.LanguageItem(this.element);
  });

  test('when enabled = true', function() {
    this.sinon.stub(this.subject, '_boundRefreshText');
    this.sinon.stub(window, 'addEventListener');
    this.subject.enabled = true;
    sinon.assert.calledWith(this.subject._boundRefreshText);
    sinon.assert.calledWith(window.addEventListener,
      'localized', this.subject._boundRefreshText);
  });

  test('when enabled = false', function() {
    this.sinon.stub(window, 'removeEventListener');
    // The default enabled value is false. Set to true first.
    this.subject._enabled = true;
    this.subject.enabled = false;
    sinon.assert.calledWith(window.removeEventListener,
      'localized', this.subject._boundRefreshText);
  });

  test('_boundRefreshText', function() {
    this.subject._boundRefreshText();
    assert.equal(this.element.textContent, expectedTitle);
  });
});
