/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

function PhraseDictionary() {
  var phraseList = [];
  this.lookUp = function(queryList) {
    var result = [];
    var regExpList = queryList.map(function(q)  RegExp(q.pattern));

    for (var i = 0; i < phraseList.length; i++) {
      for (var j = 0; j < regExpList.length; j++) {
        if (regExpList[j].test(phraseList[i].pronunciation)) {
          result.push(
            {
              phrase: phraseList[i].phrase,
              prefix: queryList[j].prefix
            }
          );
          break;
        }
      }
    }
    return result;
  };
  this.addPhrases = function(phrases) {
    for (var i = 0; i < phrases.length; i++) {
      phraseList.push(phrases[i]);
    }
  };
}

