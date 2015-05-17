'use strict';

/* global LayoutDictionary, LayoutDictionaryList, PromiseStorage */

require('/js/settings/layout_dictionary_list.js');
require('/js/settings/layout_dictionary.js');
require('/js/shared/promise_storage.js');

suite('LayoutDictionaryList', function() {
  var layoutListStub;
  var layoutDicts;
  var promiseStorageStub;

  var list;

  setup(function() {
    layoutDicts = [];

    var LayoutDictionaryPrototype = LayoutDictionary.prototype;
    this.sinon.stub(window, 'LayoutDictionary', function() {
      var layoutDict =
        this.sinon.stub(Object.create(LayoutDictionaryPrototype));
      layoutDicts.push(layoutDict);

      return layoutDict;
    }.bind(this));

    var PromiseStoragePrototype = PromiseStorage.prototype;
    promiseStorageStub =
      this.sinon.stub(Object.create(PromiseStoragePrototype));
    this.sinon.stub(window, 'PromiseStorage')
      .returns(promiseStorageStub);

    layoutListStub = {};

    list = new LayoutDictionaryList(layoutListStub);
    list.start();

    assert.isTrue(window.PromiseStorage.calledWith(list.DATABASE_NAME));
    assert.isTrue(promiseStorageStub.start.calledOnce);
  });

  teardown(function() {
    list.stop();

    layoutDicts.forEach(function(layoutDict) {
      assert.isTrue(layoutDict.stop.calledOnce);
    }, this);
  });

  test('getDictionary', function() {
    var layouts = [
      {
        'id': 'fr',
        'name': 'Français',
        'imEngineId': 'latin',
        'installed': true,
        'preloaded': true,
        'dictFilename': 'fr.dict',
        'dictFilePath': 'dictionaries/fr.dict',
        'dictFileSize': 1874745,
        'types': ['email', 'password', 'text',  'url']
      }
    ];
    list.createDictionariesFromLayouts(layouts);

    var layoutDict = layoutDicts[0];

    assert.equal(list.getDictionary('latin', 'dictionaries/fr.dict'),
      layoutDict);
  });

  suite('createDictionariesFromLayouts', function() {
    test('ignore layout def w/o dictFilename', function() {
      var layouts = [
        {
          'id': 'zh-Hans-Pinyin',
          'name': '拼音',
          'imEngineId': 'jspinyin',
          'preloaded': true
        }
      ];
      list.createDictionariesFromLayouts(layouts);

      assert.isFalse(window.LayoutDictionary.calledOnce);
    });

    test('Mark as preloaded', function() {
      var layouts = [
        {
          'id': 'fr',
          'name': 'Français',
          'imEngineId': 'latin',
          'installed': true,
          'preloaded': true,
          'dictFilename': 'fr.dict',
          'dictFilePath': 'dictionaries/fr.dict',
          'dictFileSize': 1874745,
          'types': ['email', 'password', 'text',  'url']
        }
      ];
      list.createDictionariesFromLayouts(layouts);

      assert.isTrue(window.LayoutDictionary.calledWith(list, {
        filename: 'fr.dict',
        imEngineId: 'latin',
        filePath: 'dictionaries/fr.dict',
        fileSize: 1874745,
        databaseId: 'latin/dictionaries/fr.dict',
        preloaded: true,
        installedLayoutIds: new Set() // Must compare seperately
      }));

      var installedLayoutIds =
        window.LayoutDictionary.getCall(0).args[1].installedLayoutIds;
      assert.deepEqual(['fr'],
        Array.from(installedLayoutIds).sort());

      var layoutDict = layoutDicts[0];
      assert.isTrue(layoutDict.start.calledOnce);
    });

    test('Mark as installed', function() {
      var layouts = [
        {
          'id': 'fr',
          'name': 'Français',
          'imEngineId': 'latin',
          'installed': true,
          'preloaded': false,
          'dictFilename': 'fr.dict',
          'dictFilePath': 'dictionaries/fr.dict',
          'dictFileSize': 1874745,
          'types': ['email', 'password', 'text',  'url']
        }
      ];
      list.createDictionariesFromLayouts(layouts);

      assert.isTrue(window.LayoutDictionary.calledWith(list, {
        filename: 'fr.dict',
        imEngineId: 'latin',
        filePath: 'dictionaries/fr.dict',
        fileSize: 1874745,
        databaseId: 'latin/dictionaries/fr.dict',
        preloaded: false,
        installedLayoutIds: new Set() // Must compare seperately
      }));

      var installedLayoutIds =
        window.LayoutDictionary.getCall(0).args[1].installedLayoutIds;
      assert.deepEqual(['fr'],
        Array.from(installedLayoutIds).sort());

      var layoutDict = layoutDicts[0];
      assert.isTrue(layoutDict.start.calledOnce);
    });

    test('Mark as not installed', function() {
      var layouts = [
        {
          'id': 'fr',
          'name': 'Français',
          'imEngineId': 'latin',
          'installed': false,
          'preloaded': false,
          'dictFilename': 'fr.dict',
          'dictFilePath': 'dictionaries/fr.dict',
          'dictFileSize': 1874745,
          'types': ['email', 'password', 'text',  'url']
        }
      ];
      list.createDictionariesFromLayouts(layouts);

      assert.isTrue(window.LayoutDictionary.calledWith(list, {
        filename: 'fr.dict',
        imEngineId: 'latin',
        filePath: 'dictionaries/fr.dict',
        fileSize: 1874745,
        databaseId: 'latin/dictionaries/fr.dict',
        preloaded: false,
        installedLayoutIds: new Set() // Must compare seperately
      }));

      var installedLayoutIds =
        window.LayoutDictionary.getCall(0).args[1].installedLayoutIds;
      assert.deepEqual([],
        Array.from(installedLayoutIds).sort());

      var layoutDict = layoutDicts[0];
      assert.isTrue(layoutDict.start.calledOnce);
    });

    test('Merge two layouts with same databaseId', function() {
      var layouts = [
        {
          'id': 'fr',
          'name': 'Français',
          'imEngineId': 'latin',
          'installed': true,
          'preloaded': true,
          'dictFilename': 'fr.dict',
          'dictFilePath': 'dictionaries/fr.dict',
          'dictFileSize': 1874745,
          'types': ['email', 'password', 'text',  'url']
        },
        {
          'id': 'fr-CA',
          'name': 'Français (Canadien)',
          'imEngineId': 'latin',
          'installed': true,
          'preloaded': true,
          'dictFilename': 'fr.dict',
          'dictFilePath': 'dictionaries/fr.dict',
          'dictFileSize': 1874745,
          'types': ['email', 'password', 'text',  'url']
        }
      ];
      list.createDictionariesFromLayouts(layouts);

      assert.isTrue(window.LayoutDictionary.calledWith(list, {
        filename: 'fr.dict',
        imEngineId: 'latin',
        filePath: 'dictionaries/fr.dict',
        fileSize: 1874745,
        databaseId: 'latin/dictionaries/fr.dict',
        preloaded: true,
        installedLayoutIds: new Set() // Must compare seperately
      }));

      var installedLayoutIds =
        window.LayoutDictionary.getCall(0).args[1].installedLayoutIds;
      assert.deepEqual(['fr', 'fr-CA'],
        Array.from(installedLayoutIds).sort());

      var layoutDict = layoutDicts[0];
      assert.isTrue(layoutDict.start.calledOnce);
    });

    test('Mark as installed if one layout is installed', function() {
      var layouts = [
        {
          'id': 'fr',
          'name': 'Français',
          'imEngineId': 'latin',
          'installed': false,
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
          'installed': true,
          'preloaded': false,
          'dictFilename': 'fr.dict',
          'dictFilePath': 'dictionaries/fr.dict',
          'dictFileSize': 1874745,
          'types': ['email', 'password', 'text',  'url']
        }
      ];
      list.createDictionariesFromLayouts(layouts);

      assert.isTrue(window.LayoutDictionary.calledWith(list, {
        filename: 'fr.dict',
        imEngineId: 'latin',
        filePath: 'dictionaries/fr.dict',
        fileSize: 1874745,
        databaseId: 'latin/dictionaries/fr.dict',
        preloaded: false,
        installedLayoutIds: new Set() // Must compare seperately
      }));

      var installedLayoutIds =
        window.LayoutDictionary.getCall(0).args[1].installedLayoutIds;
      assert.deepEqual(['fr-CA'],
        Array.from(installedLayoutIds).sort());

      var layoutDict = layoutDicts[0];
      assert.isTrue(layoutDict.start.calledOnce);
    });
  });
});
