/* global Service, MockPromise, FtuLateCustomization */
'use strict';

require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/test/unit/mocks/mock_promise.js');
requireApp('system/js/service.js');
requireApp('system/js/base_module.js');
requireApp('system/js/ftu_late_customization.js');

suite('ftu customization >', function() {
  var realMozSettings, subject;
  var realPromise = window.Promise;

  function sendIACFTUCommsAppsEvent(urls) {
    var evt = new CustomEvent('iac-ftucomms', {
      detail: {
        type: 'late-customization-apps',
        urls: urls
      }
    });
    window.dispatchEvent(evt);
  }

  suiteSetup(function() {
    window.Promise = MockPromise;
  });

  suiteTeardown(function() {
    navigator.mozSettings = realMozSettings;
    window.Promise = realPromise;
  });

  var fakeListener;
  var appUrls = new Map([
    ['http://ernst.tld/manifest.webapp', null],
    ['http://arp.tld/manifest.webapp', null],
    ['http://duchamp.tld/manifest.webapp', null]
  ]);

  setup(function() {
    fakeListener = sinon.spy();
    window.addEventListener('ftucustomizationbegin', fakeListener);
    window.addEventListener('ftucustomizationend', fakeListener);
    subject = new FtuLateCustomization();
  });

  teardown(function() {
    subject && subject.stop();
  });

  test('start', function() {
    this.sinon.spy(subject, 'gotInstallUrls');
    subject.start();
    sendIACFTUCommsAppsEvent([...appUrls]);
    assert.ok(subject.gotInstallUrls.calledOnce);

    assert.ok(fakeListener.calledOnce);
    var beginEvent = fakeListener.firstCall.args[0];
    assert.equal(beginEvent.type, 'ftucustomizationbegin');
    assert.ok(Array.isArray( beginEvent.detail.manifestURLs ));
  });

  test('Service:ftuCustomizationContains', function() {
    assert.ok(!Service.query('Service:ftuCustomizationContains',
                  'http://ernst.tld/manifest.webapp'));

    subject.start();
    subject.appsToInstall = appUrls;

    assert.isTrue(subject.ftuCustomizationContains(
        'http://ernst.tld/manifest.webapp'));
    assert.isFalse(Service.query('ftuCustomizationContains',
        'http://nosuch.tld/manifest.webapp'));

    subject.stop();
    assert.ok(!Service.query('Service:ftuCustomizationContains',
                                'http://ernst.tld/manifest.webapp'));
  });

  test('end', function() {
    this.sinon.spy(subject, 'gotInstallUrls');
    subject.start();
    fakeListener.reset();
    subject.stop();

    assert.ok(fakeListener.calledOnce);
    var endEvent = fakeListener.firstCall.args[0];
    assert.ok(endEvent);
    assert.equal(endEvent.type, 'ftucustomizationend');

    this.sinon.stub(subject, 'handleEvent');
    sendIACFTUCommsAppsEvent([...appUrls]);
    assert.isFalse(subject.handleEvent.called);

    assert.isFalse(subject.ftuCustomizationContains(
        'http://ernst.tld/manifest.webapp'));
  });

});
