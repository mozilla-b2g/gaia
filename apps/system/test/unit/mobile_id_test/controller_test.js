
/* global Controller, MockL10n, UI*/

'use strict';

requireApp('system/mobile_id/js/ui.js');
requireApp('system/mobile_id/js/controller.js');
requireApp('system/test/unit/mock_l10n.js');
require('/shared/test/unit/load_body_html_helper.js');

suite('MobileID Controller', function() {
  var realL10n;
  
  var mockDetails = [
    {
      primary: true,
      msisdn: '+34232342342',
      operator: 'Movistar'
    },
    {
      primary: false,
      operator: 'Movistar',
      serviceId: '0'
    }
  ];

  suiteSetup(function() {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    loadBodyHTML('/mobile_id/index.html');
    
    Controller.init();
  });

  suiteTeardown(function() {
    navigator.mozL10n = realL10n;
    realL10n = null;

    document.body.innerHTML = '';
  });

  test(' when "init" is launched, we listen mozL10n ready and we render',
    function() {
    this.sinon.stub(UI, 'localize');
    this.sinon.stub(UI, 'render');
    this.sinon.spy(navigator.mozL10n, 'ready');
    var eventToLaunch = new CustomEvent(
      'init',
      {
        detail: {
          appName: 'app name',
          candidates: mockDetails
        }
      }
    );
    window.dispatchEvent(eventToLaunch);
    assert.isTrue(navigator.mozL10n.ready.calledOnce);
    assert.isTrue(UI.render.calledOnce);
    assert.isTrue(UI.localize.calledOnce);
  });

  test(' when "shown" is launched, we set the scroll params', function() {
    assert.ok(true);
    this.sinon.stub(UI, 'setScroll');
    var eventToLaunch = new CustomEvent(
      'shown',
      {
        detail: {}
      }
    );
    window.dispatchEvent(eventToLaunch);
    assert.isTrue(UI.setScroll.calledOnce);
  });

  test(' when "onverifying" is launched, UI should be requested properly',
    function() {
    assert.ok(true);
    this.sinon.stub(UI, 'onVerifying');
    var eventToLaunch = new CustomEvent(
      'onverifying',
      {
        detail: {}
      }
    );
    window.dispatchEvent(eventToLaunch);
    assert.isTrue(UI.onVerifying.calledOnce);
  });

  test(' when "onverified" is launched, UI should be requested properly',
    function() {
    assert.ok(true);
    this.sinon.stub(UI, 'onVerified');
    var eventToLaunch = new CustomEvent(
      'onverified',
      {
        detail: {}
      }
    );
    window.dispatchEvent(eventToLaunch);
    assert.isTrue(UI.onVerified.calledOnce);
  });

  test(' when "onerror" is launched, UI should be requested properly',
    function() {
    assert.ok(true);
    this.sinon.stub(UI, 'onerror');
    var eventToLaunch = new CustomEvent(
      'onerror',
      {
        detail: {}
      }
    );
    window.dispatchEvent(eventToLaunch);
    assert.isTrue(UI.onerror.calledOnce);
  });

  test(' when "onverificationcode" is launched, UI is requested properly',
    function() {
    assert.ok(true);
    this.sinon.stub(UI, 'onVerificationCode');
    var eventToLaunch = new CustomEvent(
      'onverificationcode',
      {
        detail: {}
      }
    );
    window.dispatchEvent(eventToLaunch);
    assert.isTrue(UI.onVerificationCode.calledOnce);
  });
});
