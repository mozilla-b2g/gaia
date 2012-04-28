var result = {};

if (!stringsAreUTF8()) {
  throw "You need UTF-8 enabled SpiderMonkey to do cook the data.";
  quit();
}

var line;
while (line = readline()) {

  var fields = line.split(' ');
  if (fields.length < 4) 
    continue;
  var pinyin = fields.slice(3).join("'");
  var chinese = fields[0];
  var freq = parseFloat(fields[1]);

  if (!result[pinyin]) result[pinyin] = [];

  result[pinyin].push([chinese, freq]);
}

for (syllables in result) {
  result[syllables] = result[syllables].sort(
    function (a, b) {
      return (b[1] - a[1]);
    }
  );
}

var jsonStr = JSON.stringify(result).replace(/\],/g, '],\n');

print(jsonStr);

quit(0);
