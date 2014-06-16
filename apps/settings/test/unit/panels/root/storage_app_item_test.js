'use strict';

suite('AppStorageItem', function() {
	var modules = [
    'panels/root/storage_app_item',
  ];

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
    this.subject = this.StorageAppItem({
      appStorageDesc: document.createElement('div')
    });
  });

  test('when enabled = true', function() {
    this.sinon.stub(this.MockAppStorage.storage, 'observe');
    this.sinon.stub(this.subject, '_updateAppFreeSpace');
    this.subject.enabled = true;

    sinon.assert.called(this.subject._updateAppFreeSpace);
    sinon.assert.calledOnce(this.MockAppStorage.storage.observe);
    assert.equal(this.MockAppStorage.storage.observe.args[0][0], 'freeSize');
    assert.equal(this.MockAppStorage.storage.observe.args[0][1],
      this.subject._updateAppFreeSpace);
  });

  test('when enabled = false', function() {
    this.sinon.stub(this.MockAppStorage.storage, 'unobserve');
    this.sinon.stub(this.subject, '_updateAppFreeSpace');
    // The default enabled value is false. Set to true first.
    this.subject.enabled = true;
    this.subject.enabled = false;

    sinon.assert.calledOnce(this.MockAppStorage.storage.unobserve);
    assert.equal(this.MockAppStorage.storage.unobserve.args[0][0], 'freeSize');
    assert.equal(this.MockAppStorage.storage.unobserve.args[0][1],
      this.subject._updateAppFreeSpace);
  });
});