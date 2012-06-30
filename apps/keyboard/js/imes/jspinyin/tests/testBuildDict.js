/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var window = {};
var Test = {};
load('../jspinyin.js');

var FileSystemService = Test.FileSystemService;
var DictBuilder = Test.DictBuilder;
var MyStdlib = Test.MyStdlib;
var SearchUtility = Test.SearchUtility;
var DictTrie = Test.DictTrie;

function testRawDictFiles() {
  print('------ Test FileSystemService --------');
  FileSystemService.init(function() {
    assertEq(FileSystemService.isFileSystemReady(
      FileSystemService.Type.IndexedDB), false);
    assertEq(FileSystemService.isFileSystemReady(
      FileSystemService.Type.SpiderMonkey), true);

    FileSystemService.read('sm://data/rawdict.txt', function(str) {
      assertEq(str.length > 0, true);
    });
  });

  FileSystemService.uninit();
}

function testDictBuilder() {
  print('------ Test DictBuilder --------');
  var dict_trie = new DictTrie();
  var builder = new DictBuilder();
  builder.build_dict('sm://data/rawdict.txt', 'sm://data/valid.txt', dict_trie,
      function(isOk) {
    assertEq(isOk, true);
  });
}

function testStdlib() {
  print('------ Test MyStdlib.mybsearchStr --------');
  var array = 'abc京人北';
  var start = 0;
  var count = 0;
  var pos = 0;

  start = 0;
  count = array.length;
  pos = MyStdlib.mybsearchStr('a', array, start, count, 1,
                              SearchUtility.cmp_hanzis_1);
  assertEq(pos, 0);

  count = array.length;
  pos = MyStdlib.mybsearchStr('北', array, start, count, 1,
                              SearchUtility.cmp_hanzis_1);
  assertEq(pos, 5);

  pos = MyStdlib.mybsearchStr('京', array, start, count, 1,
                              SearchUtility.cmp_hanzis_1);
  assertEq(pos, 3);

  pos = MyStdlib.mybsearchStr('z', array, start, count, 1,
                              SearchUtility.cmp_hanzis_1);
  assertEq(pos, -1);

  start = 2;
  count = array.length - 2;
  pos = MyStdlib.mybsearchStr('c', array, start, count, 1,
                              SearchUtility.cmp_hanzis_1);
  assertEq(pos, 2);

  start = 0;
  count = array.length / 2;
  pos = MyStdlib.mybsearchStr('c京', array, start, count, 2,
                              SearchUtility.cmp_hanzis_1);
  assertEq(pos, 2);

  start = 0;
  count = array.length / 2;
  pos = MyStdlib.mybsearchStr('c人', array, start, count, 2,
                              SearchUtility.cmp_hanzis_1);
  assertEq(pos, 2);
}

testStdlib();
testRawDictFiles();
testDictBuilder();
