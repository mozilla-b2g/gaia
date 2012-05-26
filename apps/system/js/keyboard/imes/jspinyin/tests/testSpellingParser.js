/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var window = {};
var Test = {};
load('../jspinyin.js');

function testSpellingTable() {
  print('================Test SpellingTable================\n');
  
  var table = new Test.SpellingTable();

  table.init_table();          
  print('Put "A" with score 10\n');
  table.put_spelling('A', 10);
  print('Put "B" with score 9\n');  
  table.put_spelling('B', 9);
  print('Put "C" with score 8\n');  
  table.put_spelling('C', 8);
  print('Put "A" with score 7\n');  
  table.put_spelling('A', 7);
  assertEq(10+9+8+7, table.total_freq_, 'Total frequency error\n');
  assertEq(true, table.contain('A'), 'Cannot find the spelling "A"\n');
  print(JSON.stringify(table.arrange()));
  print('get_score_amplifier: ' + table.get_score_amplifier() + '\n');
  print('get_average_score: ' + table.get_average_score() + '\n');
}

testSpellingTable();

