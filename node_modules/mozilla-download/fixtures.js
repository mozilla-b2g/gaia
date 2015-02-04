var fs = require('fs'),
    fsPath = require('path'),
    http = require('http');

var FIXTURE_ROOT = fsPath.join(__dirname, 'test', 'fixtures');
var list = [
  // source, target
  [
    'http://ftp.mozilla.org/pub/mozilla.org/b2g/nightly/latest-mozilla-central/b2g-25.0a1.multi.mac64.dmg',
    'b2g.dmg'
  ],
  [
    'http://ftp.mozilla.org/pub/mozilla.org/b2g/nightly/latest-mozilla-central/b2g-25.0a1.multi.linux-x86_64.tar.bz2',
    'b2g.tar.bz2'
  ],
  [
    'http://ftp.mozilla.org/pub/mozilla.org/firefox/nightly/latest-mozilla-b2g18/firefox-18.0.en-US.mac.dmg',
    'firefox-nightly.dmg'
  ],
  [
    'http://ftp.mozilla.org/pub/mozilla.org/firefox/releases/21.0/mac/en-US/Firefox%2021.0.dmg',
    'firefox-release.dmg'
  ],
  [
    'http://ftp.mozilla.org/pub/mozilla.org/firefox/nightly/latest-mozilla-b2g18/firefox-18.0.en-US.linux-x86_64.tar.bz2',
    'firefox-nightly.tar.bz2'
  ],
  [
    'http://ftp.mozilla.org/pub/mozilla.org/firefox/releases/21.0/linux-i686/en-US/firefox-21.0.tar.bz2',
    'firefox-release.tar.bz2'
  ]
];

function download(pair) {
  var source = pair[0];
  var dest = fsPath.join(FIXTURE_ROOT, pair[1]);
  var stream = fs.createWriteStream(dest);

  if (fs.existsSync(dest))
    return console.log('skip', source, 'exists');

  console.log('Downloading: ', source);
  http.get(source, function(res) {
    console.log('Headers: ', source);
    res.pipe(stream);
    res.on('end', function() {
      console.log('saved %s to %s', source, dest);
    });
  });
}

// download all fixtures in parallel
list.forEach(download);
