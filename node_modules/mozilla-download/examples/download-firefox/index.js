var moz = require('../../index'),
    binaryPath = __dirname + '/firefox/',
    spawn = require('child_process').spawn,
    fs = require('fs');

function download(callback) {
  if (fs.existsSync(binaryPath)) {
    return process.nextTick(callback);
  }

  moz.download(
    'firefox',
    binaryPath,
    function(err, path) {
      if (err) throw err;
      callback();
    }
  );
}

function launch() {
  var bin = 'firefox-bin';
  if (process.platform.indexOf('darwin') === 0)
    bin = 'Contents/MacOS/firefox';

  console.log('launching binary', bin);
  var child = spawn(binaryPath + bin);
  setTimeout(function() {
    child.kill();
  }, 5000);

}

download(launch);

