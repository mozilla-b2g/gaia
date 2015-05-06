'use strict';

/* global LayoutItem, LayoutDictionaryList, LayoutItemList, PromiseStorage,
          SettingsPromiseManager */

require('/js/settings/layout_item.js');
require('/js/settings/layout_item_list.js');
require('/js/settings/layout_dictionary_list.js');
require('/js/shared/promise_storage.js');
require('/js/keyboard/settings.js');

suite('LayoutItemList', function() {
  var layoutDictionaryListStub;
  var dbGetItemConfigDeferred;
  var dbSetItemDeferred;

  var app;

  var fakeXhr;

  var list;

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

  setup(function(done) {
    layoutDictionaryListStub =
      this.sinon.stub(Object.create(LayoutDictionaryList.prototype));
    this.sinon.stub(window, 'LayoutDictionaryList')
      .returns(layoutDictionaryListStub);

    var LayoutItemPrototype = LayoutItem.prototype;
    this.sinon.stub(window, 'LayoutItem', function() {
      return this.sinon.stub(Object.create(LayoutItemPrototype));
    }.bind(this));

    var requests = [];
    fakeXhr = sinon.useFakeXMLHttpRequest();
    fakeXhr.onCreate = function(request) {
      requests.push(request);
    };

    app = {
      closeLockManager: { stub: 'closeLockManager' },
      preferencesStore: sinon.stub(Object.create(PromiseStorage.prototype)),
      settingsPromiseManager:
        this.sinon.stub(Object.create(SettingsPromiseManager.prototype))
    };

    dbGetItemConfigDeferred = new Deferred();
    app.preferencesStore.getItem
      .withArgs(LayoutItemList.prototype.ENABLED_LAYOUT_KEY)
      .returns(dbGetItemConfigDeferred.promise);

    dbSetItemDeferred = new Deferred();
    app.preferencesStore.setItem.returns(dbSetItemDeferred.promise);

    list = new LayoutItemList(app);
    list.onready = this.sinon.stub();
    var p = list.start();

    assert.equal(list.closeLockManager, app.closeLockManager);

    assert.isTrue(window.LayoutDictionaryList.calledWith(list));
    assert.isTrue(layoutDictionaryListStub.start.calledOnce);
    assert.equal(list.dictionaryList, layoutDictionaryListStub);

    assert.isTrue(
      app.preferencesStore.getItem.calledWith(list.ENABLED_LAYOUT_KEY));
    dbGetItemConfigDeferred.resolve(['fr']);

    var request = requests[0];
    assert.equal(request.url, list.CONFIG_FILE_PATH);
    assert.equal(request.responseType, 'json');
    request.response = [
      {
        'id': 'en',
        'name': 'English',
        'imEngineId': 'latin',
        'preloaded': true,
        'dictFilename': 'en_us.dict',
        'dictFilePath': 'dictionaries/en_us.dict',
        'dictFileSize': 1451390,
        'types': ['email', 'password', 'text',  'url']
      },
      {
        'id': 'fr',
        'name': 'Français',
        'imEngineId': 'latin',
        'preloaded': false,
        'dictFilename': 'fr.dict',
        'dictFilePath': 'dictionaries/fr.dict',
        'dictFileSize': 1874745,
        'types': ['email', 'password', 'text',  'url']
      },
      {
        'id': 'fr-CA',
        'name': 'Français (Canadien)',
        'imEngineId': 'latin',
        'preloaded': false,
        'dictFilename': 'fr.dict',
        'dictFilePath': 'dictionaries/fr.dict',
        'dictFileSize': 1874745,
        'types': ['email', 'password', 'text',  'url']
      }
    ];

    request.respond(200, {}, '');

    p.then(done, done);
  });

  teardown(function() {
    list.stop();
  });

  test('Create LayoutDictionary and LayoutItem instances', function() {
    assert.isTrue(list.onready.calledOnce);

    var layoutsWithInstallInfo = [
      {
        'id': 'en',
        'name': 'English',
        'imEngineId': 'latin',
        'preloaded': true,
        'installed': true,
        'dictFilename': 'en_us.dict',
        'dictFilePath': 'dictionaries/en_us.dict',
        'dictFileSize': 1451390,
        'types': ['email', 'password', 'text',  'url']
      },
      {
        'id': 'fr',
        'name': 'Français',
        'imEngineId': 'latin',
        'preloaded': false,
        'installed': true,
        'dictFilename': 'fr.dict',
        'dictFilePath': 'dictionaries/fr.dict',
        'dictFileSize': 1874745,
        'types': ['email', 'password', 'text',  'url']
      },
      {
        'id': 'fr-CA',
        'name': 'Français (Canadien)',
        'imEngineId': 'latin',
        'preloaded': false,
        'installed': false,
        'dictFilename': 'fr.dict',
        'dictFilePath': 'dictionaries/fr.dict',
        'dictFileSize': 1874745,
        'types': ['email', 'password', 'text',  'url']
      }
    ];

    assert.isTrue(layoutDictionaryListStub.createDictionariesFromLayouts
      .calledWith(layoutsWithInstallInfo));

    layoutsWithInstallInfo.forEach(function(layout, i) {
      assert.isTrue(window.LayoutItem.calledWith(list, layout));
      var layoutItemStub = window.LayoutItem.getCall(i).returnValue;
      assert.isTrue(layoutItemStub.start.calledOnce);

      assert.equal(list.layoutItems.get(layout.id), layoutItemStub);
    });
  });

  test('setLayoutAsInstalled', function(done) {
    var p = list.setLayoutAsInstalled('fr-CA');

    Promise.resolve()
      .then(function() {
        assert.isTrue(app.preferencesStore.setItem
          .calledWith(list.ENABLED_LAYOUT_KEY, ['fr', 'fr-CA']));
        dbSetItemDeferred.resolve();

        return p;
      })
      .catch(function(e) {
        throw (e || 'Should not reject.');
      })
      .then(done, done);
  });

  test('setLayoutAsUninstalled', function(done) {
    var p = list.setLayoutAsUninstalled('fr');

    Promise.resolve()
      .then(function() {
        assert.isTrue(app.preferencesStore.setItem
          .calledWith(list.ENABLED_LAYOUT_KEY, []));
        dbSetItemDeferred.resolve();

        return p;
      })
      .catch(function(e) {
        throw (e || 'Should not reject.');
      })
      .then(done, done);
  });

  suite('DownloadPreference', function() {
    suite('getCurrentState', function() {
      teardown(function() {
        delete navigator.mozMobileConnections;
      });

      test('not using data connection', function(done) {
        navigator.mozMobileConnections = {
          '0': { data: { connected: false } },
          '1': { data: { connected: false } },
          length: 2 };

        list.downloadPreference.getCurrentState().then(function(val) {
          assert.equal(val, list.downloadPreference.STATE_ALLOW);
        }).then(done, done);
      });

      test('data connection not avail', function(done) {
        list.downloadPreference.getCurrentState().then(function(val) {
          assert.equal(val, list.downloadPreference.STATE_ALLOW);
        }).then(done, done);
      });

      suite('w/ data connection', function() {
        var getItemDeferred;

        setup(function() {
          navigator.mozMobileConnections = {
            '0': { data: { connected: true } },
            '1': { data: { connected: false } },
            length: 2 };

          getItemDeferred = new Deferred();
          app.preferencesStore.getItem.returns(getItemDeferred.promise);
        });

        test('preferences unset', function(done) {
          getItemDeferred.resolve(undefined);

          list.downloadPreference.getCurrentState().then(function(val) {
            assert.isTrue(app.preferencesStore.getItem
              .calledWith('download.prompt-on-data-connection'));
            assert.equal(val, list.downloadPreference.STATE_PROMPT);
          }).then(done, done);
        });

        test('preferences set to always allow', function(done) {
          getItemDeferred.resolve(true);

          list.downloadPreference.getCurrentState().then(function(val) {
            assert.isTrue(app.preferencesStore.getItem
              .calledWith('download.prompt-on-data-connection'));
            assert.equal(val, list.downloadPreference.STATE_ALLOW);
          }).then(done, done);
        });

        test('preferences set to always deny', function(done) {
          getItemDeferred.resolve(false);

          list.downloadPreference.getCurrentState().then(function(val) {
            assert.isTrue(app.preferencesStore.getItem
              .calledWith('download.prompt-on-data-connection'));
            assert.equal(val, list.downloadPreference.STATE_DENY);
          }).then(done, done);
        });

        test('preferences store rejects', function(done) {
          getItemDeferred.reject('Mocked Error');

          list.downloadPreference.getCurrentState().then(function(val) {
            assert.isTrue(app.preferencesStore.getItem
              .calledWith('download.prompt-on-data-connection'));
            assert.equal(val, list.downloadPreference.STATE_PROMPT);
          }).then(done, done);
        });
      });
    });

    suite('setDataConnectionDownloadState', function() {
      var p;
      setup(function() {
        p = { stub: 'promise' };

        app.preferencesStore.deleteItem.returns(p);
        app.preferencesStore.setItem.returns(p);
      });

      test('set to prompt', function() {
        var r = list.downloadPreference.setDataConnectionDownloadState(
          list.downloadPreference.STATE_PROMPT);

        assert.isTrue(app.preferencesStore.deleteItem.calledWith(
          'download.prompt-on-data-connection'));
        assert.equal(r, p);
      });

      test('set to allow', function() {
        var r = list.downloadPreference.setDataConnectionDownloadState(
          list.downloadPreference.STATE_ALLOW);

        assert.isTrue(app.preferencesStore.setItem.calledWith(
          'download.prompt-on-data-connection', true));
        assert.equal(r, p);
      });

      test('set to deny', function() {
        var r = list.downloadPreference.setDataConnectionDownloadState(
          list.downloadPreference.STATE_DENY);

        assert.isTrue(app.preferencesStore.setItem.calledWith(
          'download.prompt-on-data-connection', false));
        assert.equal(r, p);
      });
    });

    suite('LayoutEnabler', function() {
      var appManifestURL;
      setup(function() {
        appManifestURL =
          location.protocol + '//' + location.hostname + '/manifest.webapp';
      });

      test('enableLayout', function(done) {
        var deferred = new Deferred();

        app.settingsPromiseManager.updateOne.returns(deferred.promise);

        var p = list.layoutEnabler.enableLayout('foo');

        assert.isTrue(app.settingsPromiseManager.updateOne.calledWith(
          list.layoutEnabler.SETTING_ENABLE_LAYOUT_KEY));

        var obj = {};
        obj[appManifestURL] = {};

        var refObj = {};
        refObj[appManifestURL] = {};
        refObj[appManifestURL].foo = true;

        var returnedObj =
          app.settingsPromiseManager.updateOne.firstCall.args[1](obj);

        assert.deepEqual(returnedObj, refObj);
        deferred.resolve();

        p.catch(function(e) { throw e || 'Should not reject.'; })
          .then(done, done);
      });

      test('disableLayout', function(done) {
        var deferred = new Deferred();

        app.settingsPromiseManager.updateOne.returns(deferred.promise);

        var p = list.layoutEnabler.disableLayout('foo');

        assert.isTrue(app.settingsPromiseManager.updateOne.calledWith(
          list.layoutEnabler.SETTING_ENABLE_LAYOUT_KEY));

        var obj = {};
        obj[appManifestURL] = {};
        obj[appManifestURL].foo = true;
        obj[appManifestURL].bar = true;

        var refObj = {};
        refObj[appManifestURL] = {};
        refObj[appManifestURL].bar = true;

        var returnedObj =
          app.settingsPromiseManager.updateOne.firstCall.args[1](obj);

        assert.deepEqual(returnedObj, refObj);
        deferred.resolve();

        p.catch(function(e) { throw e || 'Should not reject.'; })
          .then(done, done);
      });
    });
  });
});
