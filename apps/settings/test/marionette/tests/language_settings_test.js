'use strict';

/* global Event */

var Settings = require('../app/app'),
    assert = require('assert');

marionette('manipulate language settings', function() {
  var client = marionette.client({
  settings: {
    'ftu.manifestURL': null,
    'lockscreen.enabled': false
  }});
  var settingsApp;

  setup(function() {
    settingsApp = new Settings(client);
    settingsApp.launch();
  });

  suite('change language', function() {
    var languagePanel;

    setup(function() {
      languagePanel = settingsApp.languagePanel;
      languagePanel.setupDefaultLanguage();
    });

    test('label in the panel is translated.', function() {
      languagePanel.currentLanguage = 'traditionalChinese';
      assert.equal(languagePanel.currentLanguage, 'traditionalChinese');

      languagePanel.currentLanguage = 'english';
      assert.equal(languagePanel.currentLanguage, 'english');

      languagePanel.currentLanguage = 'french';
      assert.equal(languagePanel.currentLanguage, 'french');
    });

    test('mozSettings value is correct', function() {
      languagePanel.currentLanguage = 'french';
      assert.equal(languagePanel.currentLanguageFromMozSettings, 'fr');

      languagePanel.currentLanguage = 'english';
      assert.equal(languagePanel.currentLanguageFromMozSettings, 'en-US');

      languagePanel.currentLanguage = 'traditionalChinese';
      assert.equal(languagePanel.currentLanguageFromMozSettings, 'zh-TW');
    });

    test('sample format is translated', function() {
      languagePanel.currentLanguage = 'french';
      assert.ok(languagePanel.isSampleFormatTranslated('french'));

      languagePanel.currentLanguage = 'english';
      assert.ok(languagePanel.isSampleFormatTranslated('english'));

      languagePanel.currentLanguage = 'traditionalChinese';
      assert.ok(languagePanel.isSampleFormatTranslated('traditionalChinese'));
    });
  });

  suite('pseudolanguages', function() {
    var languagePanel;
    var quickly;

    setup(function() {
      // this allows waitForElement* methods to fail quickly
      quickly = client.scope({ searchTimeout: 50 });
      quickly.helper.client = quickly;

      languagePanel = settingsApp.languagePanel;
      languagePanel.setupDefaultLanguage();
      languagePanel.back();
    });

    teardown(function() {
      languagePanel.back();
    });

    test('the setting is off', function() {
      quickly.settings.set('devtools.qps.enabled', false);
      languagePanel = settingsApp.languagePanel;

      quickly.helper.waitForElement('option[value="en-US"]');
      quickly.helper.waitForElementToDisappear('option[value="qps-ploc"]');
      assert.ok(true, 'qps-ploc is not listed');
    });

    test('turning the setting on and off', function() {
      // 1. turn the setting on
      quickly.settings.set('devtools.qps.enabled', true);
      languagePanel = settingsApp.languagePanel;

      quickly.helper.waitForElement('option[value="qps-ploc"]');
      assert.ok(true, 'qps-ploc is listed');
      quickly.helper.waitForElement('option[value="qps-plocm"]');
      assert.ok(true, 'qps-plocm is listed');

      languagePanel.currentLanguage = 'accented';
      languagePanel.back();

      // 2. turn the setting off
      quickly.settings.set('devtools.qps.enabled', false);

      languagePanel = settingsApp.languagePanel;
      quickly.helper.waitForElement('option[value="qps-ploc"]');
      assert.ok(true, 'qps-ploc is listed');
      quickly.helper.waitForElementToDisappear('option[value="qps-plocm"]');
      assert.ok(true, 'qps-plocm is not listed');

      languagePanel.currentLanguage = 'english';

      // 3. when a new language is chosen, pseudolocales are removed
      //    from the select dropdown

      // XXX For this test we need to emulate a blur event which is
      // normally emitted when the user confirms the choice of the
      // language.  In Marionette, the event is not dispatched.  See
      // bug: https://bugzil.la/1050206
      var selectEl = languagePanel.findElement('languageChangeSelect');
      selectEl.scriptWith(function(selectEl) {
        var evt = new Event('blur', {
          'view': window,
          'bubbles': true,
          'cancelable': true
        });
        selectEl.dispatchEvent(evt);
      });

      quickly.helper.waitForElementToDisappear('option[value="qps-ploc"]');
      assert.ok(true, 'qps-ploc is not listed');

      languagePanel.back();

      // 4. reopen the panel
      languagePanel = settingsApp.languagePanel;
      quickly.helper.waitForElementToDisappear('option[value="qps-ploc"]');
      assert.ok(true, 'qps-ploc is not listed');
    });
  });
});
