'use strict';

var assert = require('assert');
var Ftu = require('./lib/ftu');

marionette('First Time Use > Pseudo Localization (Disabled)', function() {
  var ftu;
  var clientOptions = {
    prefs: Ftu.clientOptions.prefs,
    settings: Object.assign({}, Ftu.clientOptions.settings, {
      'devtools.pseudolocalization.enabled': false
    })
  };

  var client = marionette.client({
    profile: clientOptions,
    desiredCapabilities: { raisesAccessibilityExceptions: false }
  });

  setup(function() {
    ftu = new Ftu(client);
  });

  suite('pseudolocalization disabled', function() {
    test('FTU Languages without pseudo localization', function() {
      ftu.waitForFtuReady();

      var enOption = ftu.findElement('gaia-radio[value="en-US"]');
      assert.ok(enOption && enOption.displayed(), 'en-US element is displayed');

      // confirm accented pseudolocale isnt present
      var pseudoOption = ftu.findElement('gaia-radio[value="fr-x-psaccent"]');
      assert.ok(!pseudoOption, 'pseudo language should not be present');
    });
  });

});
