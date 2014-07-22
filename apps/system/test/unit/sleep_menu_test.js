'use strict';
/* global MocksHelper */
/* global MockL10n */
/* global MockMozPower */
/* global MockNavigatorMozTelephony */
/* global SleepMenu */

require('/shared/test/unit/mocks/mock_l10n.js');
requireApp('system/test/unit/mock_navigator_moz_power.js');
require('/shared/test/unit/mocks/mock_navigator_moz_telephony.js');
require('/shared/test/unit/mocks/mock_system.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/js/logo_loader.js');
requireApp('system/js/init_logo_handler.js');
requireApp('system/js/orientation_manager.js');
requireApp('system/js/sleep_menu.js');

var mocksForSleepMenu = new MocksHelper([
  'SettingsListener', 'System'
]).init();

suite('system/SleepMenu', function() {
  mocksForSleepMenu.attachTestHelpers();
  var fakeElement;
  var realL10n;
  var realMozPower;
  var realTelephony;
  var stubById;
  var stubByQuerySelector;
  var subject;

  setup(function() {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    realMozPower = navigator.mozPower;
    navigator.mozPower = MockMozPower;

    realTelephony = navigator.mozTelephony;

    fakeElement = document.createElement('div');
    stubById = stubById = this.sinon.stub(document, 'getElementById',
      function(id) {
      if (id === 'poweroff-splash') {
        return null;
      } else {
        return fakeElement.cloneNode(true);
      }
    });

    stubByQuerySelector = this.sinon.stub(document, 'querySelector')
                         .returns(fakeElement.cloneNode(true));
    subject = new SleepMenu();
  });

  teardown(function() {
    navigator.mozL10n = realL10n;
    navigator.mozPower = realMozPower;
    navigator.mozTelephony = realTelephony;
    stubById.restore();
    stubByQuerySelector.restore();
  });

  test('start()', function() {
    var listenersStub = this.sinon.stub(window,
      'addEventListener');
    subject.start();
    assert.ok(!subject.visible);
    assert.ok(listenersStub.calledWith('holdsleep'));
    assert.ok(listenersStub.calledWith('click'));
    assert.ok(listenersStub.calledWith('screenchange'));
    assert.ok(listenersStub.calledWith('home'));
    assert.ok(listenersStub.calledWith('batteryshutdown'));
  });

  test('generateItems', function() {
    navigator.mozTelephony = MockNavigatorMozTelephony;
    var items = subject.generateItems();
    assert.equal(items.length, 4);
  });

  test('generateItems w/o mozTelephony', function() {
    var items = subject.generateItems();
    assert.equal(items.length, 3);
  });

  test('generateItems /w developer options', function() {
    navigator.mozTelephony = MockNavigatorMozTelephony;
    subject.isDeveloperMenuEnabled = true;
    subject.developerOptions = {
      testme: {
        option: 'testme',
        value: 'testme'
      }
    };

    var items = subject.generateItems();
    assert.equal(items.length, 5);
    subject.isDeveloperMenuEnabled = false;
  });

  test('show/hide', function() {
    subject.start();
    assert.ok(!subject.visible);
    subject.show();
    assert.ok(subject.visible);
    subject.hide();
    assert.ok(!subject.visible);
  });

  test('restart requested', function() {
    subject.start();
    subject.show();
    var myLogoLoader = {};
    this.sinon.stub(window, 'LogoLoader')
      .returns(myLogoLoader);

    var stub = this.sinon.stub(navigator.mozPower, 'reboot');
    subject.handleEvent({
      type: 'click',
      target: {
        dataset: {
          value: 'restart'
        }
      }
    });

    var element = document.createElement('div');
    var transitionStub = this.sinon.stub(element, 'addEventListener');
    myLogoLoader.onload(element);
    transitionStub.getCall(0).args[1]();
    assert.ok(stub.calledOnce);
  });

  test('poweroff requested', function() {
    subject.start();
    subject.show();
    var myLogoLoader = {};
    this.sinon.stub(window, 'LogoLoader')
      .returns(myLogoLoader);

    var stub = this.sinon.stub(navigator.mozPower, 'powerOff');
    subject.handleEvent({
      type: 'click',
      target: {
        dataset: {
          value: 'power'
        }
      }
    });

    var element = document.createElement('div');
    var transitionStub = this.sinon.stub(element, 'addEventListener');
    myLogoLoader.onload(element);
    transitionStub.getCall(0).args[1]();
    assert.ok(stub.calledOnce);
  });
});
