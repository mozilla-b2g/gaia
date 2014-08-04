'use strict';

suite('AppStorageItem', function() {
  var modules = ['panels/root/storage_app_item'];

  var map = {
    '*': {
      'modules/app_storage': 'MockAppStorage'
    }
  };

  suiteSetup(function(done) {
    // Define MockAppStorage
    this.MockAppStorage = {
      isMock: true,
      enabled: true,
      storage: {
        usedPercentage: 1,
        totalSize: 1,
        usedSize: 1,
        freeSize: 1,
        observe: function() {},
        unobserve: function() {}
      }
    };

    var requireCtx = testRequire([], map, function() {});
    define('MockAppStorage', function() {
      return this.MockAppStorage;
    }.bind(this));

    requireCtx(modules, function(StorageAppItem) {
      this.StorageAppItem = StorageAppItem;
      done();
    }.bind(this));
  });

  setup(function() {
    this.subject = this.StorageAppItem(document.createElement('div'));
  });

  test('when enabled = true', function() {
    this.sinon.stub(this.MockAppStorage.storage, 'observe');
    this.sinon.stub(this.subject, '_updateAppFreeSpace');
    this.sinon.stub(this.subject, '_boundUpdateAppFreeSpace');
    this.subject.enabled = true;

    sinon.assert.called(this.subject._updateAppFreeSpace);
    sinon.assert.calledOnce(this.MockAppStorage.storage.observe);
    assert.isTrue(this.MockAppStorage.storage.observe.calledWith('freeSize',
      this.subject._boundUpdateAppFreeSpace));
  });

  test('when enabled = false', function() {
    // The default enabled value is false. Set to true first.
    this.subject._enabled = true;
    this.sinon.stub(this.MockAppStorage.storage, 'unobserve');
    this.sinon.stub(this.subject, '_updateAppFreeSpace');
    this.sinon.stub(this.subject, '_boundUpdateAppFreeSpace');
    this.subject.enabled = false;

    sinon.assert.calledOnce(this.MockAppStorage.storage.unobserve);
    assert.isTrue(this.MockAppStorage.storage.unobserve.calledWith('freeSize',
      this.subject._boundUpdateAppFreeSpace));
  });
});
