/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var window = {};
var Build = {};
load('../jspinyin.js');

var FileSystemService = Build.FileSystemService;
var DictTrie = Build.DictTrie;

//  Build binary dictionary model
function main() {
  var dict_trie = new DictTrie();
  dict_trie.build_dict('sm://data/rawdict.txt', 'sm://data/valid.txt',
      'sm://data/rawdict_tr.txt', function buildCallback(isOk) {
    if (!isOk) {
      throw 'Build dictionary unsuccessfully.';
      quit();
    }
    dict_trie.save_dict('sm://dict_pinyin.json', function saveCallback(isOk) {
      if (!isOk) {
        throw 'Save dictionary unsuccessfully.';
        quit();
      }
      quit(0);
    });
  });
}

FileSystemService.init(function() {
  main();
});

FileSystemService.uninit();
