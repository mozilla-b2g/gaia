/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var window = {};
var Test = {};
load('../jspinyin.js');

var FileSystemService = Test.FileSystemService;
var MatrixSearch = Test.MatrixSearch;
var USER_DICT_FILE_NAME = 'sm://tests/user_dict_test_file';
var SYS_DICT_FILE_NAME = 'sm://db.json';

function testMatrixSearch() {
  print('------ Test MatrixSearch --------');
  FileSystemService.init(function fileSystemServiceInitCallback() {
    var ms = new MatrixSearch();
    ms.init(SYS_DICT_FILE_NAME, USER_DICT_FILE_NAME,
        function msInitCallback(isOk) {
      assertEq(isOk, true, 'Failed to initialize MatrixSearch.');
      var py = 'fangan';
      var ret = search(ms, py);
      print('py:' + py + ' ' + ret.hanzi);
      print(ret.num + ' candidate(s):' + ret.cands);
    });
  });
}

function search(ms, py) {
  ms.reset_search();
  ms.search(py);
  var cands = '';
  var num = ms.get_candidate_num();
  for (var i = 0; i < num; i++) {
    if (i % 10 == 0) {
      cands += '\n';
    }
    var strs = ms.get_candidate(i);
    cands += strs[0] + '(' + strs[1] + ')' + ' ';
  }
  return {num: num, cands: cands, hanzi: ms.get_candidate0()};
}
testMatrixSearch();
