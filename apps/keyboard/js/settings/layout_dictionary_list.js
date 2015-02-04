'use strict';

/* global LayoutDictionary */

(function(exports) {

var LayoutDictionaryList = function LayoutDictionaryList(layoutList) {
  this.dbStore = layoutList.dbStore;
  this.dictionaries = null;
};

LayoutDictionaryList.prototype.start = function() {
  this.dictionaries = new Map();
};

LayoutDictionaryList.prototype.stop = function() {
  this.dictionaries.forEach(function(dict) {
    dict.stop();
  });

  this.dictionaries = null;
};

LayoutDictionaryList.prototype.getDictionary =
function (imEngineId, dictFilePath) {
  var databaseId = imEngineId + '/' + dictFilePath;
  return this.dictionaries.get(databaseId);
};

LayoutDictionaryList.prototype.createDictionariesFromLayouts =
function createDictionariesFromLayouts(layouts) {
  var dictsMap = this._getDictsMapFromLayouts(layouts);

  dictsMap.forEach(function(dict, databaseId) {
    var layoutDict = new LayoutDictionary(this, dict);
    layoutDict.start();
    this.dictionaries.set(databaseId, layoutDict);
  }, this);
};

LayoutDictionaryList.prototype._getDictsMapFromLayouts = function(layouts) {
  var dictsMap = new Map();

  layouts.forEach(function(layout) {
    if (!layout.dictFilename) {
      return;
    }

    var dict;
    var databaseId = layout.imEngineId + '/' + layout.dictFilePath;

    if (dictsMap.has(databaseId)) {
      if (layout.installed) {
        dict = dictsMap.get(databaseId);
        dict.installedLayoutIds.add(layout.id);
      }

      return;
    }

    dict = {
      imEngineId: layout.imEngineId,
      filename: layout.dictFilename,
      filePath: layout.dictFilePath,
      fileSize: layout.dictFileSize,
      databaseId: databaseId,
      preloaded: layout.preloaded,
      installedLayoutIds: new Set()
    };

    if (layout.installed) {
      dict.installedLayoutIds.add(layout.id);
    }

    dictsMap.set(databaseId, dict);
  });

  return dictsMap;
};

exports.LayoutDictionaryList = LayoutDictionaryList;

}(window));
