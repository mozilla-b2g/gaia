/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var window = {};
var Test = {};
load('../jspinyin.js');

var FileSystemService = Test.FileSystemService;
var MatrixSearch = Test.MatrixSearch;
var USER_DICT_FILE_NAME = 'sm://tests/user_dict_test_file';
var SYS_DICT_FILE_NAME = 'sm://dict_pinyin.json';

function testMatrixSearch() {
  print('------ Test MatrixSearch --------');
  FileSystemService.init(function fileSystemServiceInitCallback() {
    var ms = new MatrixSearch();
    ms.init(SYS_DICT_FILE_NAME, USER_DICT_FILE_NAME,
        function msInitCallback(isOk) {
      assertEq(isOk, true, 'Failed to initialize MatrixSearch.');
    });
  });

  FileSystemService.uninit();
}

testMatrixSearch();
