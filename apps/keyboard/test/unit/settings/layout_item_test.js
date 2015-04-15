'use strict';

/* global LayoutDictionary, LayoutDictionaryList,
          LayoutItemList, LayoutItem,
          CloseLockManager, CloseLock,
          MockInputMethod */

require('/js/settings/layout_item.js');
require('/js/settings/layout_item_list.js');
require('/js/settings/layout_dictionary.js');
require('/js/settings/layout_dictionary_list.js');

require('/js/settings/close_locks.js');
require('/shared/test/unit/mocks/mock_event_target.js');
require('/shared/test/unit/mocks/mock_navigator_input_method.js');

suite('LayoutItem', function() {
  var item;

  var layoutItemListStub;
  var layoutDictionaryStub;

  var setLayoutAsInstalledDeferred;
  var setLayoutAsUninstalledDeferred;

  var closeLockStub;

  var installForLayoutDeferred;
  var removeForLayoutDeferred;

  var realMozInputMethod;

  var addInputDeferred;
  var removeInputDeferred;

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
    addInputDeferred = new Deferred();
    removeInputDeferred = new Deferred();

    realMozInputMethod = navigator.mozInputMethod;
    navigator.mozInputMethod = new MockInputMethod();
    this.sinon.stub(navigator.mozInputMethod, 'addInput')
      .returns(addInputDeferred.promise);
    this.sinon.stub(navigator.mozInputMethod, 'removeInput')
      .returns(removeInputDeferred.promise);

    installForLayoutDeferred = new Deferred();
    removeForLayoutDeferred = new Deferred();
    layoutDictionaryStub =
      this.sinon.stub(Object.create(LayoutDictionary.prototype));
    layoutDictionaryStub.installForLayout
      .returns(installForLayoutDeferred.promise);
    layoutDictionaryStub.removeForLayout
      .returns(removeForLayoutDeferred.promise);

    layoutItemListStub =
      this.sinon.stub(Object.create(LayoutItemList.prototype));
    layoutItemListStub.dictionaryList =
      this.sinon.stub(Object.create(LayoutDictionaryList.prototype));
    layoutItemListStub.dictionaryList
      .getDictionary.returns(layoutDictionaryStub);
    layoutItemListStub.closeLockManager =
      this.sinon.stub(Object.create(CloseLockManager.prototype));

    closeLockStub = this.sinon.stub(Object.create(CloseLock.prototype));
    layoutItemListStub.closeLockManager.requestLock.returns(closeLockStub);

    setLayoutAsInstalledDeferred = new Deferred();
    setLayoutAsUninstalledDeferred = new Deferred();

    layoutItemListStub.setLayoutAsInstalled
      .returns(setLayoutAsInstalledDeferred.promise);
    layoutItemListStub.setLayoutAsUninstalled
      .returns(setLayoutAsUninstalledDeferred.promise);
  });

  teardown(function() {
    item.stop();
  });

  test('Preloaded layout', function() {
    var layout = {
      'id': 'fr',
      'name': 'Français',
      'imEngineId': 'latin',
      'preloaded': true,
      'installed': true,
      'dictFilename': 'fr.dict',
      'dictFilePath': 'dictionaries/fr.dict',
      'dictFileSize': 1874745,
      'types': ['email', 'password', 'text',  'url']
    };

    item = new LayoutItem(layoutItemListStub, layout);
    item.start();

    assert.equal(item.state, item.STATE_PRELOADED);
    assert.isFalse(layoutItemListStub.dictionaryList.getDictionary.calledOnce);
  });

  suite('Install', function() {
    var p;

    setup(function() {
      var layout = {
        'id': 'fr',
        'name': 'Français',
        'imEngineId': 'latin',
        'preloaded': false,
        'installed': false,
        'dictFilename': 'fr.dict',
        'dictFilePath': 'dictionaries/fr.dict',
        'dictFileSize': 1874745,
        'types': ['email', 'password', 'text',  'url']
      };

      item = new LayoutItem(layoutItemListStub, layout);
      item.onstatechange = this.sinon.stub();
      item.onprogress = this.sinon.stub();
      item.onerror = this.sinon.stub();
      item.start();

      assert.equal(item.state, item.STATE_INSTALLABLE);
      assert.isTrue(layoutItemListStub.dictionaryList
        .getDictionary.calledWith('latin', 'dictionaries/fr.dict'));
      layoutDictionaryStub.state =
        layoutDictionaryStub.STATE_INSTALLING_CANCELLABLE;
      layoutDictionaryStub.downloadLoadedSize = 5;
      layoutDictionaryStub.downloadTotalSize = 100;

      p = item.install();

      assert.isTrue(layoutItemListStub.closeLockManager
        .requestLock.calledWith('stayAwake'));
    });

    test('Sucessful installation', function(done) {
      Promise.resolve().then(function() {
        assert.equal(
          layoutDictionaryStub.installForLayout.firstCall.args[0], item);
        assert.equal(item.onstatechange.callCount, 1);
        assert.equal(item.state, item.STATE_INSTALLING_CANCELLABLE);

        assert.equal(item.downloadLoadedSize, 5);
        assert.equal(item.downloadTotalSize, 100);

        layoutDictionaryStub.downloadLoadedSize = 10;
        item.updateInstallProgress(10, 100);
        assert.isTrue(item.onprogress.calledWith(10, 100));

        assert.equal(item.downloadLoadedSize, 10);
        assert.equal(item.downloadTotalSize, 100);

        installForLayoutDeferred.resolve();
        return installForLayoutDeferred.promise;
      }).then(function() {
        assert.equal(item.onstatechange.callCount, 2);
        assert.equal(item.state, item.STATE_INSTALLING);

        assert.equal(item.downloadLoadedSize, 0);
        assert.equal(item.downloadTotalSize, 0);

        assert.isTrue(navigator.mozInputMethod.addInput.calledWith('fr', {
          launch_path: '/index.html#fr',
          name: 'Français',
          description: 'Français',
          types: ['email', 'password', 'text',  'url']
        }));

        addInputDeferred.resolve();

        return addInputDeferred.promise;
      }).then(function() {
        assert.isTrue(layoutItemListStub.setLayoutAsInstalled.calledWith('fr'));

        setLayoutAsInstalledDeferred.resolve();
        assert.isFalse(closeLockStub.unlock.calledOnce,
          'Not called before setLayoutAsInstalled resolves');

        return p;
      }).then(function() {
        assert.equal(item.onstatechange.callCount, 3);
        assert.equal(item.state, item.STATE_INSTALLED);
        assert.isTrue(closeLockStub.unlock.calledOnce);

        assert.isFalse(item.onerror.called);
      }).then(done, done);
    });

    test('Dictionary install fail', function(done) {
      Promise.resolve().then(function() {
        assert.equal(
          layoutDictionaryStub.installForLayout.firstCall.args[0], item);
        assert.equal(item.onstatechange.callCount, 1);
        assert.equal(item.state, item.STATE_INSTALLING_CANCELLABLE);

        installForLayoutDeferred.reject('mocked reject');
        return p;
      }).then(function() {
        throw 'Should not resolve.';
      }, function(e) {
        if (e && e !== 'mocked reject') { throw e; }

        assert.isFalse(navigator.mozInputMethod.addInput.calledOnce);
        assert.isFalse(layoutItemListStub.setLayoutAsInstalled.calledOnce);
        assert.isTrue(closeLockStub.unlock.calledOnce);

        assert.equal(item.onstatechange.callCount, 2);
        assert.equal(item.state, item.STATE_INSTALLABLE);

        assert.isTrue(item.onerror.calledOnce);
        assert.equal(
          item.onerror.firstCall.args[0].error,
          item.onerror.firstCall.args[0].ERROR_DOWNLOADERROR);
      }).then(done, done);
    });

    test('Registration fail', function(done) {
      Promise.resolve().then(function() {
        assert.equal(
          layoutDictionaryStub.installForLayout.firstCall.args[0], item);
        assert.equal(item.onstatechange.callCount, 1);
        assert.equal(item.state, item.STATE_INSTALLING_CANCELLABLE);

        installForLayoutDeferred.resolve();
        return installForLayoutDeferred.promise;
      }).then(function() {
        assert.equal(item.onstatechange.callCount, 2);
        assert.equal(item.state, item.STATE_INSTALLING);

        assert.isTrue(navigator.mozInputMethod.addInput.calledWith('fr', {
          launch_path: '/index.html#fr',
          name: 'Français',
          description: 'Français',
          types: ['email', 'password', 'text',  'url']
        }));

        addInputDeferred.reject('Failed');

        return p;
      }).then(function() {
        throw 'Should not resolve.';
      }, function(e) {
        if (e && e !== 'Failed') { throw e; }

        assert.isFalse(layoutItemListStub.setLayoutAsInstalled.calledOnce);
        assert.isTrue(closeLockStub.unlock.calledOnce);

        assert.equal(item.onstatechange.callCount, 3);
        assert.equal(item.state, item.STATE_INSTALLABLE);

        assert.equal(item.downloadLoadedSize, 0);
        assert.equal(item.downloadTotalSize, 0);

        assert.isTrue(item.onerror.calledOnce);
        assert.equal(
          item.onerror.firstCall.args[0].error,
          item.onerror.firstCall.args[0].ERROR_INSTALLERROR);
      }).then(done, done);
    });

    test('Set install fail', function(done) {
      Promise.resolve().then(function() {
        assert.equal(
          layoutDictionaryStub.installForLayout.firstCall.args[0], item);
        assert.equal(item.onstatechange.callCount, 1);
        assert.equal(item.state, item.STATE_INSTALLING_CANCELLABLE);

        installForLayoutDeferred.resolve();
        return installForLayoutDeferred.promise;
      }).then(function() {
        assert.equal(item.onstatechange.callCount, 2);
        assert.equal(item.state, item.STATE_INSTALLING);

        assert.isTrue(navigator.mozInputMethod.addInput.calledWith('fr', {
          launch_path: '/index.html#fr',
          name: 'Français',
          description: 'Français',
          types: ['email', 'password', 'text',  'url']
        }));

        addInputDeferred.resolve();

        return addInputDeferred.promise;
      }).then(function() {
        assert.isTrue(layoutItemListStub.setLayoutAsInstalled.calledWith('fr'));

        setLayoutAsInstalledDeferred.reject('Failed');

        return p;
      }).then(function() {
        throw 'Should not resolve.';
      }, function(e) {
        if (e && e !== 'Failed') { throw e; }

        assert.equal(item.onstatechange.callCount, 3);
        assert.equal(item.state, item.STATE_INSTALLABLE);
        assert.equal(item.downloadLoadedSize, 0);
        assert.equal(item.downloadTotalSize, 0);
        assert.isTrue(closeLockStub.unlock.calledOnce);

        assert.isTrue(item.onerror.calledOnce);
        assert.equal(
          item.onerror.firstCall.args[0].error,
          item.onerror.firstCall.args[0].ERROR_INSTALLERROR);
      }).then(done, done);
    });
  });

  suite('remove', function() {
    var p;

    setup(function() {
      var layout = {
        'id': 'fr',
        'name': 'Français',
        'imEngineId': 'latin',
        'preloaded': false,
        'installed': true,
        'dictFilename': 'fr.dict',
        'dictFilePath': 'dictionaries/fr.dict',
        'dictFileSize': 1874745,
        'types': ['email', 'password', 'text',  'url']
      };

      item = new LayoutItem(layoutItemListStub, layout);
      item.onstatechange = this.sinon.stub();
      item.onprogress = this.sinon.stub();
      item.onerror = this.sinon.stub();
      item.start();

      assert.equal(item.state, item.STATE_INSTALLED);
      assert.isTrue(layoutItemListStub.dictionaryList
        .getDictionary.calledWith('latin', 'dictionaries/fr.dict'));
      layoutDictionaryStub.state =
        layoutDictionaryStub.STATE_INSTALLED;

      p = item.remove();

      assert.isTrue(layoutItemListStub.closeLockManager
        .requestLock.calledWith('stayAwake'));
    });

    test('Sucessful removal', function(done) {
      Promise.resolve().then(function() {
        assert.equal(item.onstatechange.callCount, 1);
        assert.equal(item.state, item.STATE_REMOVING);

        assert.isTrue(navigator.mozInputMethod.removeInput.calledWith('fr'));

        removeInputDeferred.resolve();
        return removeInputDeferred.promise;
      }).then(function() {
        assert.isTrue(
          layoutItemListStub.setLayoutAsUninstalled.calledWith('fr'));
        setLayoutAsUninstalledDeferred.resolve();

        return setLayoutAsUninstalledDeferred.promise;
      }).then(function() {
        assert.equal(
          layoutDictionaryStub.removeForLayout.firstCall.args[0], item);
        removeForLayoutDeferred.resolve();

        assert.isFalse(closeLockStub.unlock.calledOnce,
          'Not called before removeForLayout resolves');

        return p;
      }).then(function() {
        assert.equal(item.onstatechange.callCount, 2);
        assert.equal(item.state, item.STATE_INSTALLABLE);
        assert.isTrue(closeLockStub.unlock.calledOnce);
        assert.isFalse(item.onerror.called);
      }).then(done, done);
    });

    test('Registration fail', function(done) {
      Promise.resolve().then(function() {
        assert.equal(item.onstatechange.callCount, 1);
        assert.equal(item.state, item.STATE_REMOVING);

        assert.isTrue(navigator.mozInputMethod.removeInput.calledWith('fr'));

        removeInputDeferred.reject('mocked reject');

        return p;
      }).then(function() {
        throw 'Should not resolve.';
      }, function() {
        assert.isFalse(layoutDictionaryStub.removeForLayout.calledOnce);
        assert.isFalse(layoutItemListStub.setLayoutAsUninstalled.calledOnce);

        assert.equal(item.onstatechange.callCount, 2);
        assert.equal(item.state, item.STATE_INSTALLED);
        assert.isTrue(closeLockStub.unlock.calledOnce);

        assert.isTrue(item.onerror.calledOnce);
        assert.equal(
          item.onerror.firstCall.args[0].error,
          item.onerror.firstCall.args[0].ERROR_REMOVEERROR);
      }).then(done, done);
    });

    test('Set uninstall fail', function(done) {
      Promise.resolve().then(function() {
        assert.equal(item.onstatechange.callCount, 1);
        assert.equal(item.state, item.STATE_REMOVING);

        assert.isTrue(navigator.mozInputMethod.removeInput.calledWith('fr'));

        removeInputDeferred.resolve();

        return removeInputDeferred.promise;
      }).then(function() {
        assert.isTrue(
          layoutItemListStub.setLayoutAsUninstalled.calledWith('fr'));
        setLayoutAsUninstalledDeferred.reject('Failed');

        return setLayoutAsUninstalledDeferred.promise
          .catch(function() {});
      }).then(function() {
        assert.equal(
          layoutDictionaryStub.removeForLayout.firstCall.args[0], item);
        removeForLayoutDeferred.resolve();

        return p;
      }).then(function() {
        assert.equal(item.onstatechange.callCount, 2);
        assert.equal(item.state, item.STATE_INSTALLABLE);
        assert.isTrue(closeLockStub.unlock.calledOnce);
        assert.isFalse(item.onerror.called);
      }).then(done, done);
    });

    test('Dictionary uninstall fail', function(done) {
      Promise.resolve().then(function() {
        assert.equal(item.onstatechange.callCount, 1);
        assert.equal(item.state, item.STATE_REMOVING);

        assert.isTrue(navigator.mozInputMethod.removeInput.calledWith('fr'));

        removeInputDeferred.resolve();

        return removeInputDeferred.promise;
      }).then(function() {
        assert.isTrue(
          layoutItemListStub.setLayoutAsUninstalled.calledWith('fr'));
        setLayoutAsUninstalledDeferred.resolve();

        return setLayoutAsUninstalledDeferred.promise;
      }).then(function() {
        assert.equal(
          layoutDictionaryStub.removeForLayout.firstCall.args[0], item);
        removeForLayoutDeferred.reject('Failed');

        return p;
      }).then(function() {
        assert.equal(item.onstatechange.callCount, 2);
        assert.equal(item.state, item.STATE_INSTALLABLE);
        assert.isTrue(closeLockStub.unlock.calledOnce);
        assert.isFalse(item.onerror.called);
      }).then(done, done);
    });
  });

  suite('cancelInstall', function() {
    var p;
    setup(function(done) {
      var layout = {
        'id': 'fr',
        'name': 'Français',
        'imEngineId': 'latin',
        'preloaded': false,
        'installed': false,
        'dictFilename': 'fr.dict',
        'dictFilePath': 'dictionaries/fr.dict',
        'dictFileSize': 1874745,
        'types': ['email', 'password', 'text',  'url']
      };

      item = new LayoutItem(layoutItemListStub, layout);
      item.onstatechange = this.sinon.stub();
      item.onprogress = this.sinon.stub();
      item.onerror = this.sinon.stub();
      item.start();

      assert.equal(item.state, item.STATE_INSTALLABLE);
      assert.isTrue(layoutItemListStub.dictionaryList
        .getDictionary.calledWith('latin', 'dictionaries/fr.dict'));
      layoutDictionaryStub.state =
        layoutDictionaryStub.STATE_INSTALLING_CANCELLABLE;

      p = item.install();
      Promise.resolve().then(function() {
        assert.equal(item.state, item.STATE_INSTALLING_CANCELLABLE);
      }).then(done, done);
    });

    test('cancelInstall', function(done) {
      item.cancelInstall();

      assert.isTrue(layoutDictionaryStub.removeForLayout.calledWith(item));
      removeForLayoutDeferred.resolve();
      installForLayoutDeferred.reject('mocked reject');

      p.then(function() {
        throw 'Should not resolve';
      }, function() {
        assert.equal(item.state, item.STATE_INSTALLABLE);
        assert.isTrue(closeLockStub.unlock.calledOnce);

        assert.equal(item.downloadLoadedSize, 0);
        assert.equal(item.downloadTotalSize, 0);

        assert.isFalse(item.onerror.called);
      })
      .then(done, done);
    });
  });
});
