/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var window = {};
var Test = {};
load('../jspinyin.js');

var SpellingTable = Test.SpellingTable;
var SpellingTrie = Test.SpellingTrie;
var DictBuilder = Test.DictBuilder;

function testSpellingTable() {
  print('================Test SpellingTable================\n');
  var table = new SpellingTable();
  table.init_table();
  print('Put "A" with score 10\n');
  table.put_spelling('A', 10);
  print('Put "B" with score 9\n');
  table.put_spelling('B', 9);
  print('Put "C" with score 8\n');
  table.put_spelling('C', 8);
  print('Put "A" with score 7\n');
  table.put_spelling('A', 7);
  assertEq(10 + 9 + 8 + 7, table.total_freq_, 'Total frequency error\n');
  assertEq(true, table.contain('A'), 'Cannot find the spelling "A"\n');
  print(JSON.stringify(table.arrange()));
  print('get_score_amplifier: ' + table.get_score_amplifier() + '\n');
  print('get_average_score: ' + table.get_average_score() + '\n');
}

function testSpellingParser() {
  print('================Test SpellingParser================\n');
  var dictBuilder = new DictBuilder();
  var str = '耙 52.3353762659 0 ba\n' +
    '本能 1111.28553845 0 ben neng\n';
  dictBuilder.read_raw_dict(str, null, 240000);
  // Arrange the spelling table, and build a spelling tree
  var spl_buf = dictBuilder.spl_table_.arrange();
  var spl_trie = SpellingTrie.get_instance();
  var isOK = spl_trie.construct(spl_buf,
                          dictBuilder.spl_table_.get_score_amplifier(),
                          dictBuilder.spl_table_.get_average_score());
  assertEq(isOK, true);
  var ret = dictBuilder.spl_parser_.splstr_to_idxs('BAC');
  print('BAC:' + JSON.stringify(ret));
  assertEq(ret.spl_idx.length, 1);
  assertEq(ret.last_is_pre, false);
  assertEq(ret.start_pos[1], 2);
  assertEq(dictBuilder.spl_parser_.get_splid_by_str('BA').spl_id,
           ret.spl_idx[0]);
  ret = dictBuilder.spl_parser_.splstr_to_idxs('BEN');
  print('BEN:' + JSON.stringify(ret));
  assertEq(ret.spl_idx.length, 1);
  assertEq(ret.last_is_pre, true);
  assertEq(ret.start_pos[1], 3);
  assertEq(dictBuilder.spl_parser_.get_splid_by_str('BEN').spl_id,
           ret.spl_idx[0]);
  ret = dictBuilder.spl_parser_.splstr_to_idxs('BE');
  print('BE:' + JSON.stringify(ret));
  assertEq(ret.spl_idx.length, 0);
  assertEq(ret.last_is_pre, true);
  assertEq(ret.start_pos[0], 0);
  ret = dictBuilder.spl_parser_.splstr_to_idxs('BANENG');
  assertEq(dictBuilder.spl_parser_.get_splid_by_str('NENG').spl_id,
           ret.spl_idx[1]);
  print('BANENG:' + JSON.stringify(ret));
  assertEq(ret.spl_idx.length, 2);
  assertEq(ret.last_is_pre, true);
  assertEq(ret.start_pos[1], 2);
  assertEq(ret.start_pos[2], 6);
}

testSpellingTable();
testSpellingParser();

