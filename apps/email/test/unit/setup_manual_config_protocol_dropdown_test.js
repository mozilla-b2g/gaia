/*global requireApp, suite, setup, testConfig, test, assert,
  document, sinon, teardown, suiteSetup, suiteTeardown */

requireApp('email/js/alameda.js');
requireApp('email/test/config.js');
suite('IMAP protocol dropdown', function() {
  var el;
  var smc;
  var SetupManualConfig;

  suiteSetup(function(done) {
    testConfig({
        suiteTeardown: suiteTeardown,
        done: done,
        defines: {}
      },
      ['cards/setup_manual_config', 'tmpl!cards/setup_manual_config.html'],
               function(smc, tmpl) {
        SetupManualConfig = smc;
        el = tmpl;
      }
    );
  });

  setup(function() {
    smc = new SetupManualConfig(el, null, {});
  });

  suite('IMAP port selection', function() {
    test('should change upon selecting STARTTLS', function() {
      var dropdown = el.getElementsByClassName(
        'sup-manual-composite-socket')[0];
      var port = el.getElementsByClassName('sup-manual-composite-port')[0];
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
