'use strict';

mocha.globals(['MockL10n']);

suite('LanguageItem', function() {
  var realL10n;
  var realLanguageList;
  var modules = [
    'unit/mock_l10n',
    'shared_mocks/mock_language_list',
    'panels/root/language_item',
  ];
  var map = {
    'panels/root/language_item': {
      'shared/language_list': 'shared_mocks/mock_language_list'
    }
  };

  suiteSetup(function(done) {
    var requireCtx = testRequire([], map, function() {});

    requireCtx(modules, function(MockL10n, MockLanguageList, LanguageItem) {
      realL10n = window.navigator.mozL10n;
      window.navigator.mozL10n = MockL10n;

      realLanguageList = window.LanguageList;
      window.LanguageList = MockLanguageList;

      this.LanguageItem = LanguageItem;
      done();
    }.bind(this));
  });

  suiteTeardown(function() {
    window.LanguageList = realLanguageList;
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
    assert.equal(this.element.textContent, 'English (US)');
  });
});
