var resultMap = {};

if (!stringsAreUTF8()) {
  throw 'You need UTF-8 enabled SpiderMonkey to do cook the data.';
  quit();
}

var line = readline();
while (line) {
  var fields = line.split(' ');
  if (fields.length < 4)
    continue;
  var pinyin = fields.slice(3).join("'");
  var chinese = fields[0];
  var freq = parseFloat(fields[1]);

  if (!resultMap[pinyin]) resultMap[pinyin] = [];

  var duplicated = false;
  for (var i in resultMap[pinyin]) {
    if (resultMap[pinyin][i].phrase == chinese) {
      duplicated = true;
      break;
    }
  }
  if (!duplicated) {
    resultMap[pinyin].push({phrase: chinese, freq: freq});
  }
  line = readline();
}

function stringToAbbreviated(str) {
  return str.replace(/([^'])[^']*/g, '$1');
}

var result = [];

for (syllables in resultMap) {
  var terms = resultMap[syllables].sort(
    function(a, b) {
      return (b.freq - a.freq);
    }
  );
  result.push({
    syllablesString: syllables,
    abbreviatedSyllablesString: stringToAbbreviated(syllables),
    terms: terms});
}

var jsonStr = JSON.stringify(result).replace(/}\]},/g, '}]},\n');

print(jsonStr);

quit(0);
