'use strict';
/* global MocksHelper, MockSettingsListener, TtlView */

requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/js/ttl_view.js');

var mocksForTtlView = new MocksHelper([
  'SettingsListener'
]).init();

suite('system/TtlView', function() {
  var stubById;
  var fakeElement;
  var subject;

  mocksForTtlView.attachTestHelpers();
  setup(function() {
    fakeElement = document.createElement('div');
    fakeElement.style.cssText = 'height: 100px; display: block;';
    stubById = this.sinon.stub(document, 'getElementById')
                          .returns(fakeElement.cloneNode(true));
    subject = new TtlView();
  });

  teardown(function() {
    stubById.restore();
  });

  suite('constructor', function() {
    test('calls hide', function() {
      var hideStub = this.sinon.stub(TtlView.prototype, 'hide');
      subject = new TtlView();
      MockSettingsListener.mCallbacks['debug.ttl.enabled'](false);
      assert.ok(hideStub.calledOnce);
    });

    test('calls show', function() {
      var showStub = this.sinon.stub(TtlView.prototype, 'show');
      subject = new TtlView();
      MockSettingsListener.mCallbacks['debug.ttl.enabled'](true);
      assert.ok(showStub.calledOnce);
    });
  });

  suite('hide', function() {
    test('removes listeners', function() {
      var targets = [
        'homescreen',
        'app',
        'activity'
      ];

      var events = [];
      targets.forEach(function listen(target) {
        events.push(target + 'opening');
        events.push(target + 'loadtime');
      });

      var removeStub = this.sinon.stub(window, 'removeEventListener');
      subject.hide();
      events.forEach(function(evt) {
        assert.ok(removeStub.calledWith(evt, subject));
      }, this);
    });
  });

  suite('show', function() {
    test('adds listeners', function() {
      var targets = [
        'homescreen',
        'app',
        'activity'
      ];

      var events = [];
      targets.forEach(function listen(target) {
        events.push(target + 'opening');
        events.push(target + 'loadtime');
      });

      var addEventStub = this.sinon.stub(window, 'addEventListener');
      subject.show();
      events.forEach(function(evt) {
        assert.ok(addEventStub.calledWith(evt, subject));
      }, this);
    });
  });

  suite('handleEvent', function() {
    test('updateLoadtime events', function() {
      var targets = [
        'homescreen',
        'app',
        'activity'
      ];

      var events = [];
      targets.forEach(function listen(target) {
        events.push(target + 'loadtime');
      });

      var updateStub = this.sinon.stub(subject, 'updateLoadtime');
      events.forEach(function(evt, i) {
        subject.handleEvent({
          type: evt,
          detail: {
            time: 123,
            type: 'c'
          }
        });
        assert.ok(updateStub.calledWith(123, 'c'));
      });
    });

    test('resetLoadtime events', function() {
      var targets = [
        'homescreen',
        'app',
        'activity'
      ];

      var events = [];
      targets.forEach(function listen(target) {
        events.push(target + 'opening');
      });

      events.forEach(function(evt) {
        var resetStub = this.sinon.stub(subject, 'resetLoadtime');
        subject.handleEvent({
          type: evt
        });
        assert.ok(resetStub.calledOnce);
        resetStub.restore();
      }, this);
    });
  });

  suite('resetLoadtime', function() {
    test('sets the time', function() {
      subject.show();
      subject.element.textContent = '123';
      subject.resetLoadtime();
      assert.equal(subject.element.textContent, '00000');
    });
  });

  suite('updateLoadtime', function() {
    test('updates the time', function() {
      subject.show();
      subject.updateLoadtime(123, 'c');
      assert.equal(subject.element.textContent, '123 [c]');
    });
  });

});
