'use strict';
/*global requireApp, suite, setup, testConfig, test, assert,
  suiteSetup, suiteTeardown, Event */

requireApp('email/js/alameda.js');
requireApp('email/test/config.js');
suite('Composite differing passwords', function() {
  var el;
  var smc;
  var SetupManualConfig;
  var incomingField;
  var smtpField;
  var accountTypeField;

  var INITIAL_DATA = {
    displayName: 'Bob',
    emailAddress: 'bob@example.com',
    password: 'bobpass'
  };

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
        incomingField = el.getElementsByClassName(
          'sup-manual-composite-password')[0];
        smtpField = el.getElementsByClassName(
          'sup-manual-smtp-password')[0];
        accountTypeField = el.getElementsByClassName(
          'sup-manual-account-type')[0];

      }
    );
  });

  setup(function() {
    smc = new SetupManualConfig(el, null, INITIAL_DATA);
  });

  suite('IMAP/POP and SMTP passwords', function() {
    test('should be wired correctly', function() {
      assert.equal(incomingField, smc.formItems.composite.password);
      assert.equal(smtpField, smc.formItems.smtp.password);
      assert.equal(smc.formItems.composite.username.value,
                   INITIAL_DATA.emailAddress);
      assert.equal(smc.formItems.smtp.username.value,
                   INITIAL_DATA.emailAddress);

      assert.equal(smtpField, smc.formItems.smtp.password);
    });

    test('should be the same when the incoming password changes', function() {
      // change the incoming password
      incomingField.value = 'incomingpass';
      incomingField.dispatchEvent(new Event('input'));
      // the SMTP password should remain unchanged
      assert.equal(smtpField.value, incomingField.value);
    });
    test('should differ when the SMTP password changes', function() {
      // change the SMTP password
      smtpField.value = 'smtppass';
      smtpField.dispatchEvent(new Event('input'));
      // the incoming password should remain unchanged
      assert.equal(incomingField.value, 'bobpass');
    });
    test('should pass along proper passwords to the next card', function() {
      // Shim out the setup function:
      var config = null;
      smc.pushSetupCard = function(_config) {
        config = _config;
      };

      incomingField.value = 'incoming';
      incomingField.dispatchEvent(new Event('input'));
      smtpField.value = 'smtp';
      smtpField.dispatchEvent(new Event('input'));

      smc.onNext(new Event('click'));

      assert.equal(config.incoming.password, incomingField.value);
      assert.equal(config.outgoing.password, smtpField.value);
    });
  });

  suite('typing in the common fields', function() {
    test('should autofill the incoming/outgoing fields', function() {
      var emailField = el.getElementsByClassName('sup-info-email')[0];
      emailField.value = 'hello@example.com';
      emailField.dispatchEvent(new Event('input'));

      assert.equal(el.querySelector('.sup-manual-composite-username').value,
                   'hello@example.com');
      assert.equal(el.querySelector('.sup-manual-smtp-username').value,
                   'hello@example.com');
    });
  });
});
