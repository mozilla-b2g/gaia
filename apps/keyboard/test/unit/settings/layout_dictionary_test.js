'use strict';

/* global LayoutDictionary, LayoutDictionaryDownloader, PromiseStorage */

require('/js/settings/layout_dictionary_downloader.js');
require('/js/settings/layout_dictionary.js');
require('/js/shared/promise_storage.js');

/*
 * This unit test is organized to prove that we should be able to take
 * another installForLayout() or removeForLayout() in whatever state we are in,
 * except when the the dictionary is in preloaded state.
 */
suite('LayoutDictionary', function() {
  var listStub;

  var layoutDictionaryDownloaderStub;
  var downloadDeferred;
  var dbSetItemDeferred;
  var dbDeleteItemDeferred;

  var layoutDict;
  var layoutItem;
  var layoutItem2;

  // Deferred is an object containing a promise with it's resolve/reject
  // methods exposed.
  // See
  // https://developer.mozilla.org/docs/Mozilla/JavaScript_code_modules
  // /Promise.jsm/Deferred
  //
  // For it's interfaces.
  var Deferred = function() {
    this.promise = new Promise(function(resolve, reject) {
      this.resolve = resolve;
      this.reject = reject;
    }.bind(this));
  };

  setup(function() {
    layoutDictionaryDownloaderStub =
      this.sinon.stub(Object.create(LayoutDictionaryDownloader.prototype));
    this.sinon.stub(window, 'LayoutDictionaryDownloader')
      .returns(layoutDictionaryDownloaderStub);

    downloadDeferred = new Deferred();
    layoutDictionaryDownloaderStub.load.returns(downloadDeferred.promise);

    listStub = {
      dbStore: this.sinon.stub(Object.create(PromiseStorage.prototype))
    };

    dbSetItemDeferred = new Deferred();
    listStub.dbStore.setItem.returns(dbSetItemDeferred.promise);

    dbDeleteItemDeferred = new Deferred();
    listStub.dbStore.deleteItem.returns(dbDeleteItemDeferred.promise);

    layoutItem = {
      id: 'ab',
      updateInstallProgress: this.sinon.stub()
    };

    layoutItem2 = {
      id: 'cd',
      updateInstallProgress: this.sinon.stub()
    };
  });

  suite('STATE_PRELOADED', function() {
    setup(function() {
      var dict = {
        filename: 'bar.dict',
        imEngineId: 'foo',
        filePath: 'path/to/bar.dict',
        fileSize: 100,
        databaseId: 'foo/bar.dict',
        preloaded: true,
        installedLayoutIds: new Set(['ab'])
      };

      layoutDict = new LayoutDictionary(listStub, dict);
      layoutDict.start();

      assert.equal(layoutDict.filename, 'bar.dict');
      assert.equal(layoutDict.imEngineId, 'foo');
      assert.equal(layoutDict.filePath, 'path/to/bar.dict');
      assert.equal(layoutDict.fileSize, 100);
      assert.equal(layoutDict.databaseId, 'foo/bar.dict');
      assert.equal(layoutDict.installedLayoutIds, dict.installedLayoutIds);
      assert.equal(layoutDict.state, layoutDict.STATE_PRELOADED);
    });

    test('installForLayout()', function() {
      assert.throw(layoutDict.installForLayout.bind(layoutDict));
    });

    test('removeForLayout()', function() {
      assert.throw(layoutDict.removeForLayout.bind(layoutDict));
    });
  });

  suite('STATE_INSTALLABLE', function() {
    setup(function() {
      var dict = {
        filename: 'bar.dict',
        imEngineId: 'foo',
        filePath: 'path/to/bar.dict',
        fileSize: 100,
        databaseId: 'foo/bar.dict',
        preloaded: false,
        installedLayoutIds: new Set()
      };

      layoutDict = new LayoutDictionary(listStub, dict);
      layoutDict.start();

      assert.equal(layoutDict.filename, 'bar.dict');
      assert.equal(layoutDict.imEngineId, 'foo');
      assert.equal(layoutDict.filePath, 'path/to/bar.dict');
      assert.equal(layoutDict.fileSize, 100);
      assert.equal(layoutDict.databaseId, 'foo/bar.dict');
      assert.equal(layoutDict.installedLayoutIds, dict.installedLayoutIds);
      assert.equal(layoutDict.state, layoutDict.STATE_INSTALLABLE);
    });

    test('installForLayout(layoutItem)', function() {
      layoutDict.installForLayout(layoutItem);

      assert.equal(layoutDict.state, layoutDict.STATE_INSTALLING_CANCELLABLE);

      assert.isTrue(layoutDictionaryDownloaderStub.load.calledOnce);

      layoutDictionaryDownloaderStub.onprogress(10, 100);
      assert.equal(layoutDict.downloadLoadedSize, 10);
      assert.equal(layoutDict.downloadTotalSize, 100);
      assert.isTrue(layoutItem.updateInstallProgress.calledWith(10, 100));
    });

    test('removeForLayout(layoutItem)', function(done) {
      layoutItem = {
        id: 'ab',
        updateInstallProgress: this.sinon.stub()
      };
      var p = layoutDict.removeForLayout(layoutDict);

      p.then(function() {
        assert.equal(layoutDict.state, layoutDict.STATE_INSTALLABLE);
        assert.equal(layoutDict.downloadLoadedSize, 0);
        assert.equal(layoutDict.downloadTotalSize, 0);
      }, function(e) {
        throw e || 'Should not reject.';
      })
      .then(done, done);
    });
  });

  suite('STATE_INSTALLING_CANCELLABLE', function() {
    var p;
    setup(function() {
      var dict = {
        filename: 'bar.dict',
        imEngineId: 'foo',
        filePath: 'path/to/bar.dict',
        fileSize: 100,
        databaseId: 'foo/bar.dict',
        preloaded: false,
        installedLayoutIds: new Set()
      };

      layoutDict = new LayoutDictionary(listStub, dict);
      layoutDict.start();

      p = layoutDict.installForLayout(layoutItem);

      assert.equal(layoutDict.state, layoutDict.STATE_INSTALLING_CANCELLABLE);
      assert.isTrue(layoutDictionaryDownloaderStub.load.calledOnce);
    });

    test('Download fail', function(done) {
      downloadDeferred.reject('mocked reject');

      p.then(function() {
        throw 'Should not resolve.';
      }, function() {
        assert.equal(layoutDict.state, layoutDict.STATE_INSTALLABLE);
        assert.isFalse(layoutDict.installedLayoutIds.has('ab'));
      })
      .then(done, done);
    });

    test('installForLayout(layoutItem)', function(done) {
      var p2 = layoutDict.installForLayout(layoutItem);

      downloadDeferred.resolve({ data: 'data' });
      downloadDeferred.promise
        .then(function() {
          assert.equal(layoutDict.state, layoutDict.STATE_INSTALLING);
          assert.isTrue(listStub.dbStore.setItem.calledWith(
            layoutDict.databaseId, { data: 'data' }));

          dbSetItemDeferred.resolve();
          return p2;
        })
        .then(function() {
          assert.equal(layoutDict.state, layoutDict.STATE_INSTALLED);
          assert.isTrue(layoutDict.installedLayoutIds.has('ab'));
          assert.equal(layoutDict.downloadLoadedSize, 0);
          assert.equal(layoutDict.downloadTotalSize, 0);
        })
        .then(done, done);
    });

    // TODO: This case can be further expand to
    // installForLayout(layoutItem2) -> fail to download etc.
    // but here we only verify the two layouts are both marked as installed
    // when installation is complete.
    test('installForLayout(layoutItem2)', function(done) {
      var p2 = layoutDict.installForLayout(layoutItem2);

      layoutDictionaryDownloaderStub.onprogress(10, 100);
      assert.equal(layoutDict.downloadLoadedSize, 10);
      assert.equal(layoutDict.downloadTotalSize, 100);
      assert.isTrue(layoutItem.updateInstallProgress.calledWith(10, 100));
      assert.isTrue(layoutItem2.updateInstallProgress.calledWith(10, 100));

      assert.isTrue(layoutDictionaryDownloaderStub.load.calledOnce);

      downloadDeferred.resolve({ data: 'data' });
      downloadDeferred.promise
        .then(function() {
          assert.equal(layoutDict.state, layoutDict.STATE_INSTALLING);
          assert.isTrue(listStub.dbStore.setItem.calledWith(
            layoutDict.databaseId, { data: 'data' }));

          dbSetItemDeferred.resolve();
          return p2;
        })
        .then(function() {
          assert.equal(layoutDict.state, layoutDict.STATE_INSTALLED);
          assert.isTrue(layoutDict.installedLayoutIds.has('ab'));
          assert.isTrue(layoutDict.installedLayoutIds.has('cd'));
          assert.equal(layoutDict.downloadLoadedSize, 0);
          assert.equal(layoutDict.downloadTotalSize, 0);
        })
        .then(done, done);
    });

    test('removeForLayout(layoutItem)', function(done) {
      var p2 = layoutDict.removeForLayout(layoutItem);

      assert.isTrue(layoutDictionaryDownloaderStub.abort.calledOnce);
      // download is cancelled because of abort() here.
      downloadDeferred.reject('mocked reject');

      p2.then(function() {
        assert.equal(layoutDict.state, layoutDict.STATE_INSTALLABLE);
        assert.isFalse(layoutDict.installedLayoutIds.has('ab'));

        assert.isFalse(listStub.dbStore.setItem.calledOnce);
      })
      .then(done, done);
    });

    test('removeForLayout(layoutItem2)', function(done) {
      var p2 = layoutDict.removeForLayout(layoutItem2);

      assert.isFalse(layoutDictionaryDownloaderStub.abort.calledOnce);

      p2.then(function() {
        assert.equal(layoutDict.state, layoutDict.STATE_INSTALLING_CANCELLABLE);
      }, function(e) {
        throw e || 'Should not reject.';
      })
      .then(done, done);
    });

    test('removeForLayout(layoutItem2) (install two)', function(done) {
      var pi_2 = layoutDict.installForLayout(layoutItem2);
      var p2 = layoutDict.removeForLayout(layoutItem2);

      assert.isFalse(layoutDictionaryDownloaderStub.abort.calledOnce);

      p2.then(function() {
        assert.equal(
          layoutDict.state, layoutDict.STATE_INSTALLING_CANCELLABLE);

        return pi_2;
      }, function(e) {
        throw e || 'Should not reject.';
      })
      .then(function() {
        throw 'Should not resolve';
      }, function() {
        assert.isTrue(true, 'installForLayout promise rejected');
      })
      .then(done, done);
    });
  });

  suite('STATE_INSTALLING', function() {
    var p;
    setup(function(done) {
      var dict = {
        filename: 'bar.dict',
        imEngineId: 'foo',
        filePath: 'path/to/bar.dict',
        fileSize: 100,
        databaseId: 'foo/bar.dict',
        preloaded: false,
        installedLayoutIds: new Set()
      };

      layoutDict = new LayoutDictionary(listStub, dict);
      layoutDict.start();

      p = layoutDict.installForLayout(layoutItem);
      downloadDeferred.resolve({ data: 'data' });
      downloadDeferred.promise
        .then(function() {
          assert.equal(layoutDict.state, layoutDict.STATE_INSTALLING);
        })
        .then(done, done);
    });

    test('Install fail', function(done) {
      dbSetItemDeferred.reject('mocked reject');

      p.then(function() {
        throw 'Should not resolve.';
      }, function() {
        return dbSetItemDeferred.promise.catch(function() {});
      })
      .then(function() {
        assert.equal(layoutDict.state, layoutDict.STATE_INSTALLABLE);
        assert.isFalse(layoutDict.installedLayoutIds.has('ab'));
      })
      .then(done, done);
    });

    test('installForLayout(layoutItem)', function(done) {
      var p2 = layoutDict.installForLayout(layoutItem);

      assert.isTrue(listStub.dbStore.setItem.calledWith(
        layoutDict.databaseId, { data: 'data' }));

      dbSetItemDeferred.resolve();

      p2.then(function() {
        return dbSetItemDeferred.promise;
      })
      .then(function() {
        assert.equal(layoutDict.state, layoutDict.STATE_INSTALLED);
        assert.isTrue(layoutDict.installedLayoutIds.has('ab'));
      })
      .then(done, done);
    });

    // TODO: This case can be further expand to
    // installForLayout(layoutItem2) -> fail to install etc.
    // but here we only verify the two layouts are both marked as installed
    // when installation is complete.
    test('installForLayout(layoutItem2)', function(done) {
      var p2 = layoutDict.installForLayout(layoutItem2);

      assert.isTrue(listStub.dbStore.setItem.calledWith(
        layoutDict.databaseId, { data: 'data' }));

      dbSetItemDeferred.resolve();

      p2.then(function() {
        return dbSetItemDeferred.promise;
      })
      .then(function() {
        assert.equal(layoutDict.state, layoutDict.STATE_INSTALLED);
        assert.isTrue(layoutDict.installedLayoutIds.has('ab'));
        assert.isTrue(layoutDict.installedLayoutIds.has('cd'));
      })
      .then(done, done);
    });

    test('removeForLayout(layoutItem)', function(done) {
      var p2 = layoutDict.removeForLayout(layoutItem);

      assert.isTrue(listStub.dbStore.setItem.calledWith(
        layoutDict.databaseId, { data: 'data' }));

      dbSetItemDeferred.resolve();

      p.then(function() {
        throw 'Should not resolve.';
      }, function() {
        return dbSetItemDeferred.promise;
      })
      .then(function() {
        assert.equal(layoutDict.state, layoutDict.STATE_REMOVING);

        assert.isTrue(listStub.dbStore.deleteItem.calledWith(
          layoutDict.databaseId));

        dbDeleteItemDeferred.resolve();

        return p2;
      })
      .then(function() {
        assert.equal(layoutDict.state, layoutDict.STATE_INSTALLABLE);
        assert.isFalse(layoutDict.installedLayoutIds.has('ab'));
      })
      .then(done, done);
    });

    test('removeForLayout(layoutItem2)', function(done) {
      var p2 = layoutDict.removeForLayout(layoutItem2);

      p2.then(function() {
        assert.equal(layoutDict.state, layoutDict.STATE_INSTALLING);
      }, function(e) {
        throw e || 'Should not reject.';
      })
      .then(done, done);
    });

    test('removeForLayout(layoutItem2) (installing two)', function(done) {
      layoutDict.installForLayout(layoutItem2);

      var p2 = layoutDict.removeForLayout(layoutItem2);

      p2.then(function() {
        assert.equal(layoutDict.state, layoutDict.STATE_INSTALLING);
      }, function(e) {
        throw e || 'Should not reject.';
      })
      .then(done, done);
    });
  });

  suite('STATE_INSTALLED', function() {
    setup(function() {
      var dict = {
        filename: 'bar.dict',
        imEngineId: 'foo',
        filePath: 'path/to/bar.dict',
        fileSize: 100,
        databaseId: 'foo/bar.dict',
        preloaded: false,
        installedLayoutIds: new Set(['ab'])
      };

      layoutDict = new LayoutDictionary(listStub, dict);
      layoutDict.start();

      assert.equal(layoutDict.filename, 'bar.dict');
      assert.equal(layoutDict.imEngineId, 'foo');
      assert.equal(layoutDict.filePath, 'path/to/bar.dict');
      assert.equal(layoutDict.fileSize, 100);
      assert.equal(layoutDict.databaseId, 'foo/bar.dict');
      assert.equal(layoutDict.installedLayoutIds, dict.installedLayoutIds);
      assert.equal(layoutDict.state, layoutDict.STATE_INSTALLED);
    });

    test('installForLayout(layoutItem)', function(done) {
      var p2 = layoutDict.installForLayout(layoutItem2);

      p2.then(function() {
        assert.equal(layoutDict.state, layoutDict.STATE_INSTALLED);
        assert.isTrue(layoutDict.installedLayoutIds.has('ab'));
      })
      .then(done, done);
    });

    test('installForLayout(layoutItem2)', function(done) {
      var p2 = layoutDict.installForLayout(layoutItem2);

      p2.then(function() {
        assert.equal(layoutDict.state, layoutDict.STATE_INSTALLED);
        assert.isTrue(layoutDict.installedLayoutIds.has('ab'));
        assert.isTrue(layoutDict.installedLayoutIds.has('cd'));
      })
      .then(done, done);
    });

    test('removeForLayout(layoutItem)', function(done) {
      var p2 = layoutDict.removeForLayout(layoutItem);

      assert.equal(layoutDict.state, layoutDict.STATE_REMOVING);
      assert.isTrue(listStub.dbStore.deleteItem.calledWith(
        layoutDict.databaseId));

      dbDeleteItemDeferred.resolve();

      p2.then(function() {
        assert.equal(layoutDict.state, layoutDict.STATE_INSTALLABLE);
        assert.isFalse(layoutDict.installedLayoutIds.has('ab'));
      })
      .then(done, done);
    });

    test('removeForLayout(layoutItem2) (w/ two layouts installed)',
    function(done) {
      layoutDict.installedLayoutIds.add('cd');

      var p2 = layoutDict.removeForLayout(layoutItem2);

      p2.then(function() {
        assert.equal(layoutDict.state, layoutDict.STATE_INSTALLED);
        assert.isTrue(layoutDict.installedLayoutIds.has('ab'));
        assert.isFalse(layoutDict.installedLayoutIds.has('cd'));
      })
      .then(done, done);
    });
  });

  suite('STATE_REMOVING', function() {
    var p;
    setup(function() {
      var dict = {
        filename: 'bar.dict',
        imEngineId: 'foo',
        filePath: 'path/to/bar.dict',
        fileSize: 100,
        databaseId: 'foo/bar.dict',
        preloaded: false,
        installedLayoutIds: new Set(['ab'])
      };

      layoutDict = new LayoutDictionary(listStub, dict);
      layoutDict.start();

      p = layoutDict.removeForLayout(layoutItem);

      assert.equal(layoutDict.state, layoutDict.STATE_REMOVING);
    });

    test('Removal fail', function(done) {
      dbDeleteItemDeferred.reject('mocked reject');

      p.then(function() {
        throw 'Should not resolve.';
      }, function() {
        assert.equal(layoutDict.state, layoutDict.STATE_INSTALLED);
        assert.isTrue(layoutDict.installedLayoutIds.has('ab'));
      })
      .then(done, done);
    });

    // TODO: This case can be further expand to
    // installForLayout(layoutItem) -> fail to remove etc.
    // but here we only verify the new layouts being installed when
    // the removal is completed.
    test('installForLayout(layoutItem)', function(done) {
      layoutDict.installForLayout(layoutItem);

      dbDeleteItemDeferred.resolve();
      p.then(function() {
        assert.equal(layoutDict.state, layoutDict.STATE_INSTALLING_CANCELLABLE);
        assert.isFalse(layoutDict.installedLayoutIds.has('ab'));

        assert.isTrue(layoutDictionaryDownloaderStub.load.calledOnce);
      })
      .then(done, done);
    });

    // TODO: This case can be further expand to
    // installForLayout(layoutItem2) -> fail to remove etc.
    // but here we only verify the new layouts being installed when
    // the removal is completed.
    test('installForLayout(layoutItem2)', function(done) {
      layoutDict.installForLayout(layoutItem2);

      dbDeleteItemDeferred.resolve();
      p.then(function() {
        assert.equal(layoutDict.state, layoutDict.STATE_INSTALLING_CANCELLABLE);
        assert.isFalse(layoutDict.installedLayoutIds.has('ab'));

        assert.isTrue(layoutDictionaryDownloaderStub.load.calledOnce);
      })
      .then(done, done);
    });

    test('removeForLayout(layoutItem)', function() {
      var p2 = layoutDict.removeForLayout(layoutItem);

      assert.isTrue(p2 === p);
    });

    test('removeForLayout(layoutItem2)', function(done) {
      var p2 = layoutDict.removeForLayout(layoutItem2);

      p2.then(function() {
        assert.equal(layoutDict.state, layoutDict.STATE_REMOVING);
      }, function(e) {
        throw e || 'Should not reject.';
      })
      .then(done, done);
    });
  });
});
