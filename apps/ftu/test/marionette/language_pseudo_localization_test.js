'use strict';

var assert = require('assert');
var Ftu = require('./lib/ftu');

marionette('First Time Use > Pseudo Localization', function() {
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

  suite('pseudolocalization enabled', function() {
    test('FTU Languages with pseudo localization', function() {
      ftu.waitForFtuReady();

      client.helper.waitForElement('gaia-radio[value="en-US"]');
      client.helper.waitForElement('gaia-radio[value="fr-x-psaccent"]');
    });

    test('Can select accented-english', function(done) {
      ftu.waitForFtuReady();

      var header = client.helper.waitForElement(Ftu.Selectors.header);
      ftu.selectLanguage('fr-x-psaccent');

      client.executeAsyncScript(function() {
        var pseudo = window.wrappedJSObject.document.l10n.pseudo;
        pseudo['fr-x-psaccent'].processString('Language').then(
          function(string) {
            marionetteScriptFinished(string);
          }
        );
      }, function(err, value) {
        assert.equal(value, header.text());
        done(err);
      });
    });
  });
});
