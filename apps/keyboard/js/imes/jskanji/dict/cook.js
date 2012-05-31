var result = [];

if (!stringsAreUTF8()) {
  throw "You need UTF-8 enabled SpiderMonkey to do cook the data.";
}

var line;
var key;
var i;
var j;
var freq;
var word;
var next;
var temp;

while (line = readline()) {
  temp = {}

  line = line.split(' ');

  key = line[0];
  temp['kana'] = key;
  //temp['abbreviatedSyllablesString'] = '';
  temp['terms'] = [];
  for (i=1; i<line.length;) {
    freq = parseInt(line[i].split('*')[1]);
    word = line[i+1];

    temp['terms'].push({'kanji': word, 'freq': freq, 'kana': key});

    j = 2;
    while (i+j < line.length) {
      next = line[i+j].split('*')[1];
      if (parseInt(next)) break;

      temp['terms'].push({'kanji': line[i+j], 'freq': freq, 'kana': key});
      j++;
    }

    i+=j;
  }

  result.push(temp);
}

var jsonStr = JSON.stringify(result).replace(/}\]},/g, '}]},\n');

print(jsonStr);

quit(0);
