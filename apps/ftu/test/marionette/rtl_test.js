'use strict';

var Ftu = require('./lib/ftu');
var assert = require('assert');

marionette('First Time Use >', function() {
  var ftu;
  var clientOptions = {
    prefs: Ftu.clientOptions.prefs,
    settings: Object.assign({}, Ftu.clientOptions.settings, {
      'devtools.pseudolocalization.enabled': true
    })
  };
  var client = marionette.client({
    profile: clientOptions,
    desiredCapabilities: { raisesAccessibilityExceptions: false }
  });

  setup(function() {
    ftu = new Ftu(client);
  });

  test('Change language to bidi english', function(done) {
    ftu.waitForFtuReady();
    var header = client.helper.waitForElement(Ftu.Selectors.header);
    ftu.selectLanguage('ar-x-psbidi');

    var languageSettingValue = client.settings.get('language.current');
    assert.equal(languageSettingValue, 'ar-x-psbidi');
    // sanity check expected translation
    var body = client.helper.waitForElement('body');
    var direction = body.scriptWith(function(el) {
      return window.wrappedJSObject.getComputedStyle(el).direction;
    });
    assert.equal(direction, 'rtl');
    client.executeAsyncScript(function() {
      var pseudo = window.wrappedJSObject.document.l10n.pseudo;
      pseudo['ar-x-psbidi'].processString('Language').then(
        function(string) {
          marionetteScriptFinished(string);
        }
      );
    }, function(err, value) {
      assert.equal(value, header.text());
      done(err);
    });
  });

  test('Correct nav button order under RTL', function() {
    ftu.waitForFtuReady();
    ftu.selectLanguage('ar-x-psbidi');

    var direction = client.helper.waitForElement('#nav-bar')
                    .scriptWith(function(el) {
      return window.wrappedJSObject.getComputedStyle(el).direction;
    });
    assert.equal(direction, 'rtl', 'Expect direction to be rtl');
  });

});
