/*global MockL10n, MockNavigatorSettings, MockLanguageList,
LanguageManager, LanguageList, KeyboardHelper, dispatchEvent*/
'use strict';

require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/test/unit/mocks/mock_language_list.js');
require('/shared/test/unit/mocks/mock_l10n.js');
requireApp('ftu/js/language.js');

suite('languages >', function() {
  var realSettings;
  var realLanguageList;
  var realL10n;
  suiteSetup(function() {
    // mock l10n
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
    realSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;
    realLanguageList = window.LanguageList;
    window.LanguageList = MockLanguageList;
    LanguageManager.settings = MockNavigatorSettings;
    LanguageManager._kbLayoutList = null;
  });

  suiteTeardown(function() {
    navigator.mozL10n = realL10n;
    navigator.mozSettings = realSettings;
    realSettings = null;
    window.LanguageList = realLanguageList;
  });

  test('change language', function() {
    var settingName = 'language.current';
    var fakeEvent = {
      target: {
        name: settingName,
        value: 'a different language'
      }
    };
    LanguageManager.handleEvent(fakeEvent);
    assert.equal(MockNavigatorSettings.mSettings[fakeEvent.target.name],
                 fakeEvent.target.value);
  });

  test('build language list', function(done) {
    var section = document.createElement('section');
    section.id = 'languages';
    document.body.appendChild(section);
    var list = document.createElement('ul');
    section.appendChild(list);

    LanguageManager.buildLanguageList();
    assert.equal(document.querySelectorAll('li').length,
                 Object.keys(LanguageList._languages).length);
    done();
  });

  suite('keyboard settings >', function() {
    var langKey = 'language.current';

    suiteSetup(function() {
      window.KeyboardHelper = {};
      MockNavigatorSettings.mSyncRepliesOnly = true;
    });

    suiteTeardown(function() {
      delete window.KeyboardHelper;
    });

    setup(function() {
      KeyboardHelper.changeDefaultLayouts = this.sinon.spy();
      LanguageManager.init();
    });

    test('observes settings', function() {
      assert.equal(MockNavigatorSettings.mObservers[langKey].length, 1);
    });

    test('keyboard layouts changed after language change', function() {
      MockNavigatorSettings.mTriggerObservers(langKey,
                                              {settingValue: 'newLanguage'});
      assert.isTrue(KeyboardHelper.changeDefaultLayouts.called);
    });

    test('localize changed', function() {
      dispatchEvent(new CustomEvent('localized'));
      assert.equal(MockNavigatorSettings.mSettings['locale.hour12'], false);
    });
  });
});
