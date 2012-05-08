/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var window = {};
var Test = {};
load('../jspinyin.js');

var pinyinParser = new Test.PinyinParser();

function test(input, expected) {
  print('test - ' + input);
  var choices = pinyinParser.parse(input);
  print(JSON.stringify(choices));
  print();
}

print('=======西安========\n');
test('xian');
test("xi'an");
print('=======方案 反感========\n');
test('fangan');
test("fang'an");
test("fan'gan");
print('=======北京========\n');
test('bj');
test('beijing');
test('bjing');
test('beij');
test('bejing');
test('bejing');
test('bej');
print('=======你好========\n');
test('ni');
test('nih');
test('nihao');
test('nihaoa');
test('nh');
test('nha');
test('nhaa');
print('=======中========\n');
test('zh');
test('zho');
test('zhon');
test('zhong');
print('=======Invalid Input========\n');
test('gi');
test('gv');
test('uu');
test('ig');
test('igv');
