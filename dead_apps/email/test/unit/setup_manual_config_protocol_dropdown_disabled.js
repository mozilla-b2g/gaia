/*global requireApp, suite, setup, testConfig, test, assert,
  suiteSetup, suiteTeardown, Event */
'use strict';

requireApp('email/js/alameda.js');
requireApp('email/test/config.js');
suite('IMAP protocol dropdown', function() {
  var smc;
  var SetupManualConfig;
  var el;

  suiteSetup(function(done) {
    testConfig({
        suiteTeardown: suiteTeardown,
        done: done,
        defines: {}
      },
      ['element!cards/setup_manual_config'], function(smc) {
        SetupManualConfig = smc;
      }
    );
  });

  setup(function() {
    smc = new SetupManualConfig();
/*
    el = document.createElement('div');
    el.style.width = '100%';
    el.style.height = '100%';
    el.appendChild(smc);
    var refNode = document.childNodes[0];
    if (refNode) {
      document.insertBefore(el, refNode);
    } else {
      document.appendChild(el);
    }
*/
  });

  suite('IMAP port selection', function() {
    // TEST DISABLED: see comments below, some weirdness with custom elements
    // receiving the change event in this test.
    test('should change upon selecting STARTTLS', function(done) {
      var dropdown = smc.getElementsByClassName(
        'sup-manual-composite-socket')[0];
      var port = smc.getElementsByClassName('sup-manual-composite-port')[0];
      assert.equal(port.value, '993');
      assert.equal(dropdown.value, 'SSL');
/*
      var oldFn = smc.onChangeCompositeSocket;
      smc.onChangeCompositeSocket = function(event) {
        oldFn.call(smc, event);

        assert.equal(port.value, '143');
        done();
      };
*/
      dropdown.value = 'STARTTLS';
      // TODO: this event dispatch does not seem to actually trigger a change
      // event on the dropdown element. See commented out code above. Theory:
      // with a custom element, not really part of the DOM until inserted in the
      // document, and then events would fire, but document.appendChild() fails
      // in this test harness.
      dropdown.dispatchEvent(new Event('change'));
      assert.equal(port.value, '143');
      done();
    });
  });

  suite('SMTP port selection', function() {
    // TEST DISABLED: see comments below, some weirdness with custom elements
    // receiving the change event in this test.
    test('should change upon selecting STARTTLS', function(done) {
      var dropdown = smc.getElementsByClassName('sup-manual-smtp-socket')[0];
      var port = smc.getElementsByClassName('sup-manual-smtp-port')[0];
      assert.equal(port.value, '465');
      assert.equal(dropdown.value, 'SSL');
/*
      var oldFn = smc.onChangeSmtpSocket;
      smc.onChangeSmtpSocket = function(event) {
        oldFn.call(smc, event);
        assert.equal(port.value, '587');
        done();
      };
*/
      dropdown.value = 'STARTTLS';
      // TODO: this event dispatch does not seem to actually trigger a change
      // event on the dropdown element. See commented out code above. Theory:
      // with a custom element, not really part of the DOM until inserted in the
      // document, and then events would fire, but document.appendChild() fails
      // in this test harness.
      dropdown.dispatchEvent(new Event('change'));
      assert.equal(port.value, '587');
      done();
    });
  });

  teardown(function() {
    smc = null;
    el = null;
  });
});
