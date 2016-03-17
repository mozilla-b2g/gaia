'use strict';

suite('LanguageItem', function() {
  var realL10n;
  var realLanguageList;
  var modules = [
    'shared_mocks/mock_l20n',
    'shared_mocks/mock_language_list',
    'views/phone/root/language_item',
  ];
  var map = {
    'views/phone/root/language_item': {
      'shared/language_list': 'shared_mocks/mock_language_list'
    }
  };

  suiteSetup(function(done) {
    var requireCtx = testRequire([], map, function() {});

    requireCtx(modules, function(MockL10n, MockLanguageList, LanguageItem) {
      realL10n = document.l10n;
      document.l10n = MockL10n;

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
    this.sinon.stub(document, 'addEventListener');
    this.subject.enabled = true;
    sinon.assert.calledWith(this.subject._boundRefreshText);
    sinon.assert.calledWith(document.addEventListener,
      'DOMRetranslated', this.subject._boundRefreshText);
  });

  test('when enabled = false', function() {
    this.sinon.stub(document, 'removeEventListener');
    // The default enabled value is false. Set to true first.
    this.subject._enabled = true;
    this.subject.enabled = false;
    sinon.assert.calledWith(document.removeEventListener,
      'DOMRetranslated', this.subject._boundRefreshText);
  });

  test('_boundRefreshText', function() {
    this.subject._boundRefreshText();
    assert.equal(this.element.textContent, 'English (US)');
  });
});
