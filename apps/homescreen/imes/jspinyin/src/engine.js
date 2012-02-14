/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

var PinyinImEngine = function (dictionary, splitter) {
  function buildQueryList(solutions, stopPosition) {
    var queryList = [];
    for (var i = 0; i < solutions.length; i++) {
      var solution = solutions[i];
      var solutionPattern = "";
      var solutionPrefix = "";

      for (var j = 0; j < solution.length; j++) {
        var segment = solution[j];
        solutionPrefix += segment;
        if (solutionPrefix.length > stopPosition) {
          solutionPattern = "";
          break;
        }
        if (j > 0) {
          solutionPattern += "'";
        }
        if ("b p m f d t n l g k h j q x zh ch sh r z c s y w".indexOf(segment) != -1) {
          solutionPattern += (segment + "[a-z]*[0-9]?");
        } else if (segment != "'"){
          solutionPattern += (segment + "[0-9]?");
        }
        if (solutionPrefix.length == stopPosition) {
          break;
        }
      }
      if (solutionPattern != "") {
        queryList.push({prefix:solutionPrefix, pattern:"^" + solutionPattern + "$"});
      }
    }
    //console.log(queryList);
    return queryList;
  }

  var glue;
  var spell = "";

  function showChoices(candidates) {
    
    glue.sendCandidates(candidates.map(function(item) [item.phrase, item.prefix]));
  }

  var startPosition = 0;

  function refreshChoices() {
    var solutions = splitter.parse(spell.substring(startPosition));

    var stopPositionSet = {};
    for (var i = 0; i < solutions.length; i++) {
      var pos = 0;
      var solution = solutions[i];
      for (var j = 0; j < solution.length; j++) {
        pos += solution[j].length;
        stopPositionSet[pos] = true;
      }
    }
    var unsortedStopPositionList = [];
    for (var pos in stopPositionSet) {
      unsortedStopPositionList.push(pos);
    }
    var stopPositionList = unsortedStopPositionList.sort();
    //
    var candidates = [];
    for (var i = stopPositionList.length - 1; i >= 0 ; i--) {
      var queryList = buildQueryList(solutions, stopPositionList[i]);
      candidates = candidates.concat(dictionary.lookUp(queryList));
    }
    showChoices(candidates);
  }

  this.init = function jspinyin_init(aGlue) {
    glue = aGlue;
  };

  this.click = function jspinyin_click(aKeyCode) {
    if (aKeyCode == 39 ||(97 <= aKeyCode && aKeyCode <= 122)) {
      spell += String.fromCharCode(aKeyCode);
      refreshChoices();
    } else {
      switch (aKeyCode) {
        case 8: {
          if (spell.length == 0) {
            glue.sendKey(aKeyCode);
          } else {
            spell = spell.substring(0, spell.length - 1);
            if (startPosition == spell.length) {
              startPosition = 0;
            }
            refreshChoices();
          }
          break;
        }
        default:
          glue.sendKey(aKeyCode);
      }
    }
  },

  this.select = function jspinyin_select(aSelection, aSelectionData) {
    glue.sendString(aSelection);

    spell = spell.substring(aSelectionData.length);
    if (startPosition == spell.length) {
      this.empty();
    }
    refreshChoices();
  },

  this.empty = function jspinyin_empty() {
    spell = "";
    startPosition = 0;
  }
};

var engine = new PinyinImEngine(splitter, dictionary);

