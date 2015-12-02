'use strict';

var Ftu = require('./lib/ftu');
var assert = require('assert');

marionette('First Time Use >', function() {
  var ftu;
  var client = marionette.client({
    profile: Ftu.clientOptions,
    desiredCapabilities: { raisesAccessibilityExceptions: false }
  });
  var quickly;

  setup(function() {
    ftu = new Ftu(client);
    // allow findElement to fail quickly
    quickly = client.scope({
      searchTimeout: 50
    });
    quickly.helper.client = quickly;
  });

  test('Change language to bidi english', function(done) {
    quickly.settings.set('devtools.pseudolocalization.enabled', true);
    quickly.apps.switchToApp(Ftu.URL);
    quickly.helper.waitForElement('#languages');
    var header = quickly.helper.waitForElement(Ftu.Selectors.header);
    ftu.selectLanguage('ar-x-psbidi');

    assert.equal(quickly.settings.get('language.current'), 'ar-x-psbidi');
    // sanity check expected translation
    var direction = quickly.helper.waitForElement('body')
                    .scriptWith(function(el) {
      return window.wrappedJSObject.getComputedStyle(el).direction;
    });
    assert.equal(direction, 'rtl');
    quickly.executeAsyncScript(function() {
      var pseudo = window.wrappedJSObject.document.l10n.pseudo;
      pseudo['ar-x-psbidi'].processString('Language').then(
        function(string) {
          marionetteScriptFinished(string);
        }
      );
    }, function(err, value) {
      assert.equal(value, header.text());
      done();
    });
  });

  test('Correct nav button order under RTL', function() {
    quickly.settings.set('devtools.pseudolocalization.enabled', true);
    quickly.apps.switchToApp(Ftu.URL);
    quickly.helper.waitForElement('#languages');
    ftu.selectLanguage('ar-x-psbidi');

    var direction = quickly.helper.waitForElement('#nav-bar')
                    .scriptWith(function(el) {
      return window.wrappedJSObject.getComputedStyle(el).direction;
    });
    assert(direction, 'ltr');
  });

});
