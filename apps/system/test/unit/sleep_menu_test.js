'use strict';
/* global MocksHelper */
/* global MockL10n */
/* global MockNavigatorMozTelephony */
/* global SleepMenu */
/* global MockService */

require('/shared/test/unit/mocks/mock_l10n.js');
require('/shared/test/unit/mocks/mock_navigator_moz_power.js');
require('/shared/test/unit/mocks/mock_navigator_moz_telephony.js');
require('/shared/test/unit/mocks/mock_service.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/js/sleep_menu.js');

var mocksForSleepMenu = new MocksHelper([
  'SettingsListener', 'Service'
]).init();

suite('system/SleepMenu', function() {
  mocksForSleepMenu.attachTestHelpers();
  var fakeElement;
  var realL10n;
  var realTelephony;
  var stubById;
  var stubByQuerySelector;
  var subject;

  setup(function() {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    realTelephony = navigator.mozTelephony;

    fakeElement = document.createElement('div');
    stubById = stubById = this.sinon.stub(document, 'getElementById',
      function() {
        return fakeElement.cloneNode(true);
      }
    );

    stubByQuerySelector = this.sinon.stub(document, 'querySelector')
                         .returns(fakeElement.cloneNode(true));
    subject = new SleepMenu();
  });

  teardown(function() {
    navigator.mozL10n = realL10n;
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
    delete navigator.mozTelephony;
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

  suite('After showing the menu', function() {
    setup(function() {
      subject.start();
      subject.show();
    });

    test('restart requested', function() {
      this.sinon.stub(MockService, 'request');
      subject.handleEvent({
        type: 'click',
        target: {
          dataset: {
            value: 'restart'
          }
        }
      });
      assert.isTrue(MockService.request.calledWith('poweroff', true));
    });

    test('hide on attention window is opened', function() {
      window.dispatchEvent(new CustomEvent('attentionopened'));
      assert.isFalse(subject.visible);
    });

    test('hide on home button pressed', function() {
      window.dispatchEvent(new CustomEvent('home'));
      assert.isFalse(subject.visible);
    });

    test('Turn on airplane mode request', function() {
      subject.isFlightModeEnabled = false;
      this.sinon.stub(subject, 'publish');

      subject.handleEvent({
        type: 'click',
        target: {
          dataset: {
            value: 'airplane'
          }
        }
      });

      assert.isTrue(subject.publish.calledWith('request-airplane-mode-enable'));
    });

    test('Turn off airplane mode request', function() {
      subject.isFlightModeEnabled = true;
      this.sinon.stub(subject, 'publish');

      subject.handleEvent({
        type: 'click',
        target: {
          dataset: {
            value: 'airplane'
          }
        }
      });
      var airplaneDisableEvent = 'request-airplane-mode-disable';
      assert.isTrue(subject.publish.calledWith(airplaneDisableEvent));
    });

  });
});
