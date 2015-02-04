var tape = require('tape');
var resumer = require('resumer');
var Parser = require('./');

tape('Parse single line - normal', function(t) {
  var str = '231 User logged out; service terminated.\n';
  var stream = resumer().queue(str).end();

  var parser = new Parser();
  stream.pipe(parser);

  parser.on('readable', function() {
    var line;
    line = parser.read();
    t.equal(line.code, 231);
    t.equal(line.isMark, false);
    t.equal(line.isError, false);
    t.equal(line.text, '231 User logged out; service terminated.');
    t.end();
  });
});

tape('Parse multiline response', function(t) {
  var res = '150-This is the first line of a mark\n' +
    '123-This line does not end the mark;note the hyphen\n' +
    '150 This line ends the mark\n' +
    '226-This is the first line of the second response\n' +
    ' 226 This line does not end the response;note the leading space\n' +
    '226 This is the last line of the response, using code 226\n';

  var stream = resumer().queue(res).end();
  var parser = new Parser();
  stream.pipe(parser);

  var responses = [];
  parser.on('readable', function() {
    var line;
    while (line = parser.read()) {
      responses.push(line);
    }
  });

  parser.on('end', function() {
    t.equal(2, responses.length);

    t.equal(150, responses[0].code);
    t.equal(226, responses[1].code);

    t.equal(true, responses[0].isMark);
    t.equal(false, responses[1].isMark);

    t.equal('150-This is the first line of a mark\n' +
      '123-This line does not end the mark;note the hyphen\n' +
      '150 This line ends the mark', responses[0].text);

    t.equal('226-This is the first line of the second response\n' +
      ' 226 This line does not end the response;note the leading space\n' +
      '226 This is the last line of the response, using code 226',
      responses[1].text);

    t.end();
  });
});

tape('Parse multiline response 2', function(t) {
  var res = '150-This is the first line of a mark\n' +
    '123-This line does not end the mark;note the hyphen\n' +
    '150 This line ends the mark\n';
  var res2 = '226-This is the first line of the second response\n' +
    ' 226 This line does not end the response;note the leading space\n' +
    '226 This is the last line of the response, using code 226\n';

  var stream = resumer().queue(res);
  var stream2 = resumer().queue(res2).end();
  var parser = new Parser();
  stream.pipe(parser);
  stream2.pipe(parser);

  var responses = [];
  parser.on('readable', function() {
    var line;
    while (line = parser.read()) {
      responses.push(line);
    }
  });

  parser.on('end', function() {
    t.equal(2, responses.length);

    t.equal(150, responses[0].code);
    t.equal(226, responses[1].code);

    t.equal(true, responses[0].isMark);
    t.equal(false, responses[1].isMark);

    t.equal('150-This is the first line of a mark\n' +
      '123-This line does not end the mark;note the hyphen\n' +
      '150 This line ends the mark', responses[0].text);

    t.equal('226-This is the first line of the second response\n' +
      ' 226 This line does not end the response;note the leading space\n' +
      '226 This is the last line of the response, using code 226',
      responses[1].text);

    t.end();
  });
});

tape('Parse multiline response 3', function(t) {
  var res = '150-This is the first line of a mark\n' +
    '123-This line does not end the mark;note the hyphen\n' + '1'
  var res2 = '50 This line ends the mark\n226-This is the first line of the second response\n' +
    ' 226 This line does not end the response;note the leading space\n' +
    '226 This is the last line of the response, using code 226\n';

  var stream = resumer().queue(res);
  var stream2 = resumer().queue(res2).end();
  var parser = new Parser();
  stream.pipe(parser);
  stream2.pipe(parser);

  var responses = [];
  parser.on('readable', function() {
    var line;
    while (line = parser.read()) {
      responses.push(line);
    }
  });

  parser.on('end', function() {
    t.equal(2, responses.length);

    t.equal(150, responses[0].code);
    t.equal(226, responses[1].code);

    t.equal(true, responses[0].isMark);
    t.equal(false, responses[1].isMark);

    t.equal(responses[0].text, '150-This is the first line of a mark\n' +
      '123-This line does not end the mark;note the hyphen\n' +
      '150 This line ends the mark');

    t.equal(responses[1].text, '226-This is the first line of the second response\n' +
      ' 226 This line does not end the response;note the leading space\n' +
      '226 This is the last line of the response, using code 226');

    t.end();
  });
});
