/*global requireApp, suite, setup, testConfig, test, assert,
  document, sinon, teardown, suiteSetup, suiteTeardown */

requireApp('email/js/alameda.js');
requireApp('email/test/config.js');
requireApp('email/test/unit/mock_l10n.js');

suite('IMAP protocol dropdown', function() {
  var el;
  var smc;
  var SetupManualConfig;
  var mozL10n;

  suiteSetup(function(done) {
    testConfig({
        suiteTeardown: suiteTeardown,
        done: done,
        defines: {
          'l10n!': function() {
            return MockL10n;
          }
        }
      },
      ['cards/setup_manual_config', 'tmpl!cards/setup_manual_config.html',
       'l10n!'],
      function(smc, tmpl, l) {
        SetupManualConfig = smc;
        el = tmpl;
        mozL10n = l;
      }
    );
  });

  setup(function() {
    smc = new SetupManualConfig(el, null, {});
  });

  suite('IMAP port selection', function() {
    test('should change upon selecting STARTTLS', function() {
      var dropdown = el.getElementsByClassName('sup-manual-imap-socket')[0];
      var port = el.getElementsByClassName('sup-manual-imap-port')[0];
      assert.equal(port.value, '993');
      assert.equal(dropdown.value, 'SSL');

      dropdown.value = 'STARTTLS';
      dropdown.dispatchEvent(new Event('change'));
      assert.equal(port.value, '143');
    });
  });

  suite('SMTP port selection', function() {
    test('should change upon selecting STARTTLS', function() {
      var dropdown = el.getElementsByClassName('sup-manual-smtp-socket')[0];
      var port = el.getElementsByClassName('sup-manual-smtp-port')[0];
      assert.equal(port.value, '465');
      assert.equal(dropdown.value, 'SSL');

      dropdown.value = 'STARTTLS';
      dropdown.dispatchEvent(new Event('change'));
      assert.equal(port.value, '587');
    });
  });

});
