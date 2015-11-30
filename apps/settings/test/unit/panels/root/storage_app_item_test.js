'use strict';

suite('AppStorageItem', function() {
  var modules = ['panels/root/storage_app_item'];

  var map = {
    '*': {
      'modules/app_storage': 'MockAppStorage',
      'modules/storage_helper': 'MockStorageHelper'
    }
  };

  suiteSetup(function(done) {
    // Define MockAppStorage
    this.MockAppStorage = {
      isMock: true,
      usedPercentage: 1,
      totalSize: 1,
      usedSize: 1,
      freeSize: 1,
      observe: function() {},
      unobserve: function() {}
    };

    this.MockStorageHelper = {
      showFormatedSize: function(element, l10nId, size) {return size;}
    };

    var requireCtx = testRequire([], map, function() {});
    define('MockAppStorage', () => {
      return this.MockAppStorage;
    });

    define('MockStorageHelper', () => {
      return this.MockStorageHelper;
    });

    requireCtx(modules, StorageAppItem => {
      this.StorageAppItem = StorageAppItem;
      done();
    });
  });

  setup(function() {
    this.subject = this.StorageAppItem(document.createElement('div'));
  });

  test('when enabled = true', function() {
    this.sinon.stub(this.MockAppStorage, 'observe');
    this.sinon.stub(this.subject, '_updateAppFreeSpace');
    this.sinon.stub(this.subject, '_boundUpdateAppFreeSpace');
    this.subject.enabled = true;

    sinon.assert.called(this.subject._updateAppFreeSpace);
    sinon.assert.calledOnce(this.MockAppStorage.observe);
    assert.isTrue(this.MockAppStorage.observe.calledWith('freeSize',
      this.subject._boundUpdateAppFreeSpace));
  });

  test('when enabled = false', function() {
    this.sinon.stub(this.MockAppStorage, 'unobserve');
    this.sinon.stub(this.subject, '_updateAppFreeSpace');
    this.sinon.stub(this.subject, '_boundUpdateAppFreeSpace');
    // The default enabled value is false. Set to true first.
    this.subject._enabled = true;
    this.subject.enabled = false;

    sinon.assert.calledOnce(this.MockAppStorage.unobserve);
    assert.isTrue(this.MockAppStorage.unobserve.calledWith('freeSize',
      this.subject._boundUpdateAppFreeSpace));
  });

  test('when current = false and enabled = false', function() {
    this.sinon.stub(this.MockAppStorage, 'unobserve');
    this.sinon.stub(this.subject, '_updateAppFreeSpace');
    this.sinon.stub(this.subject, '_boundUpdateAppFreeSpace');
    // set enabled value to false to let the further false set not action.
    this.subject._enabled = false;
    this.subject.enabled = false;

    assert.isFalse(this.MockAppStorage.unobserve.called);
    assert.isFalse(this.MockAppStorage.unobserve.called);
  });
});
