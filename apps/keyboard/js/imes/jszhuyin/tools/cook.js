var result = {};

if (!stringsAreUTF8()) {
  throw 'You need UTF-8 enabled SpiderMonkey to do cook the data.';
  quit();
}

var line;
while (line = readline()) {

  line = line.split(' ');

  if (line[1].indexOf('_punctuation_') !== -1) continue;

  switch (arguments[0]) {
    case 'words':
    default:
      if (line[0].length !== 1) continue;
    break;
    case 'phrases':
      if (line[0].length === 1) continue;
    break;
  }

  if (!result[line[1]]) result[line[1]] = [];

  result[line[1]].push([line[0], parseFloat(line[2])]);
}

for (syllables in result) {
  result[syllables] = result[syllables].sort(
    function(a, b) {
      return (b[1] - a[1]);
    }
  );
}

var jsonStr = JSON.stringify(result).replace(/\],/g, '],\n');

print(jsonStr);

quit(0);
