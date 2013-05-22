'use strict';

requireApp('communications/ftu/test/unit/mock_navigator_settings.js');
requireApp('communications/ftu/test/unit/mock_settings.js');
requireApp('communications/ftu/js/language.js');


suite('languages >', function() {
  var realSettings;

  suiteSetup(function() {

    realSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;
    LanguageManager.settings = MockNavigatorSettings;
    LanguageManager._languages = null;
    LanguageManager._kbLayoutList = null;
  });

  suiteTeardown(function() {
    navigator.mozSettings = realSettings;
    realSettings = null;
  });

  test('loads languages from file', function(done) {
    LanguageManager.getSupportedLanguages(function() {
      assert.isNotNull(LanguageManager._languages);
      done();
    });
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
    var language = 'en-US';

    var section = document.createElement('section');
    section.id = 'languages';
    document.body.appendChild(section);
    var list = document.createElement('ul');
    section.appendChild(list);

    LanguageManager.buildLanguageList(language);
    assert.equal(document.querySelectorAll('li').length,
                 Object.keys(LanguageManager._languages).length);
    var selected = document.querySelectorAll('input[type="radio"]:checked');
    assert.equal(selected.length, 1);
    assert.equal(selected[0].value, language);
    done();
  });

    test('loads keyboard layouts from file', function(done) {
    LanguageManager.getSupportedKbLayouts(function() {
      assert.isNotNull(LanguageManager._kbLayoutList);
      done();
    });
  });

  test('change keyboard', function() {
    var settingName = 'keyboard.current',
        currentLanguage = 'currentLanguage',
        newLanguage = 'newLanguage';

    LanguageManager._currentLanguage = 'currentLanguage';
    LanguageManager._kbLayoutList = {
      currentLanguage: currentLanguage,
      newLanguage: newLanguage
    };
    LanguageManager._languages = {
      currentLanguage: 'The Current Language',
      newLanguage: 'The New Language'
    };

    var fakeEvent = {
      settingValue: newLanguage
    };
    LanguageManager.changeDefaultKb(fakeEvent);

    // Check current language
    assert.equal(MockNavigatorSettings.mSettings[settingName],
                 fakeEvent.settingValue);

    // Check old layout set to false
    assert.isFalse(MockNavigatorSettings.mSettings['keyboard.layouts.' +
                                                    currentLanguage]);
    // Check new layout set to true
    assert.isTrue(MockNavigatorSettings.mSettings['keyboard.layouts.' +
                                                   newLanguage]);
  });

});
