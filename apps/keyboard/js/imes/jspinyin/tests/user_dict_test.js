/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var window = {};
var Test = {};
load('../jspinyin.js');

var FileSystemService = Test.FileSystemService;
var UserDict = Test.UserDict;
var USER_DICT_FILE_NAME = 'sm://tests/user_dict_test_file';

function testUserDict() {
  print('------ Test UserDict --------');
  FileSystemService.init(function() {
    var dict = new UserDict();
    dict.load_dict(USER_DICT_FILE_NAME, 100, 200, function(success) {
      assertEq(success, true, 'Failed to load the dict.');
    });
    print('dict info: ' + JSON.stringify(dict.dict_info_));
    var lemma1 = dict.put_lemma('欧洲', '歐洲', [0, 1], 1);
    var lemma2 = dict.put_lemma('欧洲市场', '歐洲市場', [2, 3, 4, 5], 10);
    print('dict info: ' + JSON.stringify(dict.dict_info_));
    print('lemmas: ' + JSON.stringify(dict.lemmas_));
    print('scores: ' + JSON.stringify(dict.scores_));
    dict.remove_lemma(lemma1);
    print('dict info: ' + JSON.stringify(dict.dict_info_));
    print('lemmas: ' + JSON.stringify(dict.lemmas_));
    print('scores: ' + JSON.stringify(dict.scores_));
    dict.close_dict(function(success) {
      assertEq(success, true, 'Failed to close the dict.');
    });
  });

  FileSystemService.uninit();
}

testUserDict();
