'use strict';

require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/test/unit/mocks/mock_language_list.js');
requireApp('ftu/js/language.js');

suite('languages >', function() {
  var realSettings;
  var realLanguageList;
  suiteSetup(function() {

    realSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;
    realLanguageList = window.LanguageList;
    window.LanguageList = MockLanguageList;
    LanguageManager.settings = MockNavigatorSettings;
    LanguageManager._kbLayoutList = null;
  });

  suiteTeardown(function() {
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
    var selected = document.querySelectorAll('input[type="radio"]:checked');
    assert.equal(selected.length, 1);
    assert.equal(selected[0].value, 'en-US');
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
  });
});
