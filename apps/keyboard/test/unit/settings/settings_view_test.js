'use strict';

/* global SettingsManagerBase, SettingsPromiseManager, CloseLockManager,
          CloseLock, SettingsView, BaseView */

require('/shared/js/component_utils.js');
require('/shared/elements/gaia_checkbox/script.js');

require('/js/settings/close_locks.js');
require('/js/settings/base_view.js');
require('/js/settings/settings_view.js');

require('/js/keyboard/settings.js');

suite('SettingsView', function() {
  var app;
  var view;
  var stubSettings;
  var el;
  var el2;

  setup(function(done) {
    var container = document.createElement('div');
    el = document.createElement('gaia-checkbox');
    el.setAttribute('disabled', true);
    el.dataset.setting = 'foo.bar';
    container.appendChild(el);
    el2 = document.createElement('input');
    el2.type = 'range';
    el2.disabled = true;
    el2.value = 5;
    el2.dataset.setting = 'foo.baz';
    container.appendChild(el2);

    this.sinon.spy(el, 'addEventListener');
    this.sinon.spy(el2, 'addEventListener');
    this.sinon.spy(el, 'removeEventListener');
    this.sinon.spy(el2, 'removeEventListener');

    stubSettings =
      this.sinon.stub(Object.create(SettingsManagerBase.prototype));
    stubSettings.initSettings.returns(Promise.resolve());
    stubSettings.getSettingsSync.returns({
      fooBar: true,
      fooBaz: 10
    });
    var SettingsConstructor = this.sinon.stub().returns(stubSettings);
    stubSettings.KEYS = ['foo.bar', 'foo.baz'];
    stubSettings.PROPERTIES = ['fooBar', 'fooBaz'];

    app = {
      settingsPromiseManager:
        this.sinon.stub(Object.create(SettingsPromiseManager.prototype)),
      closeLockManager:
        this.sinon.stub(Object.create(CloseLockManager.prototype))
    };

    app.closeLockManager.requestLock
      .returns(this.sinon.stub(Object.create(CloseLock.prototype)));

    view = new SettingsView(app, container, SettingsConstructor);
    view.start();

    assert.isTrue(el.hasAttribute('disabled'),
      'Stay disabled until init settings returns');
    assert.isTrue(el2.disabled, 'Stay disabled until init settings returns');

    view.taskQueue.then(done, function() {
      throw 'Most not reject';
    }).catch(done);
  });

  teardown(function() {
    view.stop();
  });

  test('inheritance from BaseView', function() {
    assert.instanceOf(view, BaseView);
  });

  test('init settings returns', function() {
    assert.isFalse(el.disabled, 'Enabled when init settings returns');
    assert.isTrue(el.checked, 'Checked');

    assert.isFalse(el2.disabled, 'Enabled when init settings returns');
    assert.equal(el2.valueAsNumber, 10);
  });

  test('Update values', function(done) {
    app.settingsPromiseManager.set.returns(Promise.resolve());

    assert.isTrue(el.addEventListener.calledWith('change', view));
    el.checked = false;
    view.handleEvent({
      target: el,
      type: 'change'
    });

    assert.isTrue(el2.addEventListener.calledWith('change', view));
    el2.value = 7;
    view.handleEvent({
      target: el2,
      type: 'change'
    });

    assert.isTrue(el.disabled, 'Stay disabled until updates');
    assert.isTrue(el2.disabled, 'Stay disabled until updates');

    view.taskQueue.then(function() {
      assert.isFalse(el.disabled);
      assert.isFalse(el2.disabled);

      assert.isTrue(app.closeLockManager.requestLock.calledWith('stayAwake'));
      assert.isTrue(app.closeLockManager.requestLock.firstCall
        .returnValue.unlock.calledTwice);

      assert.isTrue(
        app.settingsPromiseManager.set.calledWith('foo.bar', false));
      assert.isTrue(app.settingsPromiseManager.set.calledWith('foo.baz', 7));

      assert.isFalse(el.checked, 'Checked');
      assert.equal(el2.valueAsNumber, 7);
    }, function() {
      throw 'Most not reject';
    }).then(done, done);
  });

  test('Update value failure', function(done) {
    app.settingsPromiseManager.set.returns(Promise.reject('faked error'));

    assert.isTrue(el2.addEventListener.calledWith('change', view));
    el2.value = 7;
    view.handleEvent({
      target: el2,
      type: 'change'
    });

    assert.isTrue(el2.disabled, 'Stay disabled until updates');

    view.taskQueue.then(function() {
      assert.isFalse(el2.disabled);

      assert.isTrue(app.closeLockManager.requestLock.calledWith('stayAwake'));
      assert.isTrue(app.closeLockManager.requestLock.firstCall
        .returnValue.unlock.calledOnce);

      assert.isTrue(app.settingsPromiseManager.set.calledWith('foo.baz', 7));

      assert.equal(el2.valueAsNumber, 10);
    }, function() {
      throw 'Most not reject';
    }).then(done, done);
  });

  test('Handle remote settings change', function(done) {
    var newValues = {
      fooBar: false,
      fooBaz: 7
    };

    stubSettings.getSettingsSync.returns(newValues);
    stubSettings.onsettingchange(newValues);

    view.taskQueue.then(function() {
      assert.isFalse(el.checked, 'Checked');
      assert.equal(el2.valueAsNumber, 7);
    }, function() {
      throw 'Most not reject';
    }).then(done, done);
  });
});
