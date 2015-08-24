/* global MockL10n, MockNavigatorSettings, MockLanguageList,
          LanguageManager, LanguageList, KeyboardHelper,
          MockImportNavigationHTML, dispatchEvent */
'use strict';

require('/shared/js/component_utils.js');
require('/shared/elements/gaia_radio/script.js');
require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/test/unit/mocks/mock_language_list.js');
require('/shared/test/unit/mocks/mock_l10n.js');
requireApp('ftu/test/unit/mock_navigation.html.js');
requireApp('ftu/js/language.js');

suite('languages >', function() {
  var realSettings;
  var realLanguageList;
  var realL10n;
  var realHTML;
  suiteSetup(function() {
    realHTML = document.body.innerHTML;
    document.body.innerHTML = MockImportNavigationHTML;
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
    document.body.innerHTML = realHTML;
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

    // XXX in reality this method is async b/c it uses LanguageList.get;  here
    // however it uses the mock which is sync.  Fix this in bug 1119865.
    LanguageManager.buildLanguageList();
    var selected = document.querySelectorAll('gaia-radio');
    assert.equal(selected.length, 1);
    assert.equal(selected[0].checked, true);
    assert.equal(selected[0].value, 'en-US');

    // mock's _languages is sync, too
    LanguageList._languages.then(function(langs) {
      assert.equal(document.querySelectorAll('li').length,
                   Object.keys(langs).length);
    });
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

    test('localize changed', function(done) {
      dispatchEvent(new CustomEvent('localized'));
      return Promise.resolve().then(() => {
        assert.equal(MockNavigatorSettings.mSettings['locale.hour12'], false);
      }).then(done, done);
    });
  });
});
