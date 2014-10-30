var fs;

fs = require('fs');

module.exports = function mv(source, dest, cb){
  fs.rename(source, dest, function(err){
    if (!err) return cb();
    if (err.code !== 'EXDEV') return cb(err);
    fs.stat(source, function (err, stats) {
      if (err) return cb(err);
      if (stats.isFile()) {
        moveFileAcrossDevice(source, dest, cb);
      } else if (stats.isDirectory()) {
        moveDirAcrossDevice(source, dest, cb);
      } else {
        var err;
        err = new Error("source must be file or directory");
        err.code = 'NOTFILEORDIR';
        cb(err);
      }
    });
  });
}

function moveFileAcrossDevice(source, dest, cb) {
  var ins, outs;
  ins = fs.createReadStream(source);
  outs = fs.createWriteStream(dest);
  ins.once('error', function(err){
    outs.removeAllListeners('error');
    outs.removeAllListeners('close');
    outs.destroy();
    cb(err);
  });
  outs.once('error', function(err){
    ins.removeAllListeners('error');
    outs.removeAllListeners('close');
    ins.destroy();
    cb(err);
  });
  outs.once('close', function(){
    fs.unlink(source, cb);
  });
  ins.pipe(outs);
}

// TODO: do this natively instead of shelling out to `mv`
function moveDirAcrossDevice(source, dest, cb) {
  var child, stdout, stderr, err;
  child = require('child_process').spawn('mv', [source, dest], {stdio: 'pipe'});
  child.stderr.setEncoding('utf8');
  child.stdout.setEncoding('utf8');
  stderr = '';
  stdout = '';
  child.stderr.on('data', function(data) { stderr += data; });
  child.stdout.on('data', function(data) { stdout += data; });
  child.on('close', function(code) {
    if (code === 0) {
      cb();
    } else {
      err = new Error("mv had nonzero exit code");
      err.code = 'RETCODE';
      err.stdout = stdout;
      err.stderr = stderr;
      cb(err);
    }
  });
}
