/*
 * @package jsftp
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Sergi Mansilla <sergi.mansilla@gmail.com>
 * @license https://github.com/sergi/jsFTP/blob/master/LICENSE MIT License
 */
/*global it describe beforeEach afterEach */

"use strict";

var assert = require("assert");
var Fs = require("fs");
var exec = require('child_process').spawn;
var Ftp = require("../");
var Path = require("path");
var Utils = require("../lib/utils");
var sinon = require("sinon");
var EventEmitter = require("events").EventEmitter;
var ftpServer = require("ftp-test-server");
var rimraf = require("rimraf");

var concat = function(bufs) {
  var buffer, length = 0,
    index = 0;

  if (!Array.isArray(bufs))
    bufs = Array.prototype.slice.call(arguments);

  for (var i = 0, l = bufs.length; i < l; i++) {
    buffer = bufs[i];
    length += buffer.length;
  }

  buffer = new Buffer(length);

  bufs.forEach(function(buf) {
    buf.copy(buffer, index, 0, buf.length);
    index += buf.length;
  });

  return buffer;
};

var concatStream = function(err, socket, callback) {
  if (err) return callback(err);

  var pieces = [];
  socket.on("data", function(p) {
    pieces.push(p);
  });
  socket.on("close", function(hadError) {
    if (hadError)
      return callback(new Error("Socket connection error"));

    callback(null, concat(pieces));
  });
  socket.resume();
};

// Write down your system credentials. This test suite will use OSX internal
// FTP server. If you want to test against a remote server, simply change the
// `host` and `port` properties as well.
var FTPCredentials = {
  host: "localhost",
  user: "user",
  port: 3334,
  pass: "12345"
};

function getRemotePath(path) {
  return Path.join('test', 'test_c9', path);
}

function getLocalPath(path) {
  return Path.join(process.cwd(), 'test', 'test_c9', path);
}
var CWD = process.cwd() + "/test";
var remoteCWD = "test/test_c9";
var daemon;
exec('mkdir', [__dirname + "/" + remoteCWD]);

describe("jsftp test suite", function() {
  var ftp, server;
  beforeEach(function(next) {
    rimraf(getLocalPath(''), function() {
      Fs.mkdirSync(getLocalPath(''));
      Fs.writeFileSync(getLocalPath('testfile.txt'), "test");

      if (FTPCredentials.host === "localhost") {
        server = new ftpServer();
        server.init(FTPCredentials);
      }

      setTimeout(function() {
        ftp = new Ftp(FTPCredentials);
        next();
      }, 100);
    });
  });

  afterEach(function(next) {
    if (daemon)
      daemon.kill();

    setTimeout(function() {
      server.stop();
      if (ftp) {
        ftp.destroy();
        ftp = null;
      }
    }, 50);
    next();
  });

  it("test initialize bad host", function(next) {
    var ftp2 = new Ftp({
      host: "badhost",
      user: "user",
      port: 21,
      pass: "12345"
    });

    ftp2.on("error", function(err) {
      assert.equal(err.code, 'ENOTFOUND');
      next();
    });
  });

  it("test initialize", function(next) {
    assert.equal(ftp.host, FTPCredentials.host);
    assert.equal(ftp.port, FTPCredentials.port);
    assert.equal(ftp.user, FTPCredentials.user);

    assert.ok(ftp instanceof EventEmitter);
    assert.equal(ftp.pending.length, 0);
    assert.equal(ftp.cmdBuffer_.length, 0);

    next();
  })

  it("test parseResponse with mark", function(next) {
    var cb = sinon.spy();
    cb.expectsMark = {
      marks: [150]
    };
    var data = {
      code: 150,
      text: "150 File status okay; about to open data connection."
    };

    ftp.cmdBuffer_ = [
      ["retr fakefile.txt", cb]
    ];
    ftp.parse = sinon.spy();

    var firstCmd = ftp.cmdBuffer_[0];
    ftp.parseResponse(data);
    assert(ftp.parse.calledWith(data, firstCmd));
    next();
  });

  it("test parseResponse with no mark", function(next) {
    var cb = sinon.spy();
    var data = {
      code: 150,
      text: "150 File status okay; about to open data connection."
    };

    ftp.cmdBuffer_ = [
      ["retr fakefile.txt", cb]
    ];
    ftp.parse = sinon.spy();

    ftp.parseResponse(data);
    assert.equal(ftp.parse.callCount, 0);
    next();
  });

  it("test send function", function(next) {
    ftp.pipeline = {
      write: sinon.spy()
    };
    ftp.send();
    ftp.send("list /");
    assert.equal(ftp.pipeline.write.callCount, 1);
    assert(ftp.pipeline.write.calledWithExactly("list /\r\n"));
    next();
  });

  it("test parseResponse with ignore code", function(next) {
    var cb = sinon.spy();
    cb.expectsMark = {
      marks: [150],
      ignore: 226
    };
    var data1 = {
      code: 150,
      text: "150 File status okay; about to open data connection."
    };
    var data2 = {
      code: 226,
      text: "226 Transfer complete."
    };

    ftp.cmdBuffer_ = [
      ["retr fakefile.txt", cb],
      ["list /", function() {}]
    ];
    ftp.parse = sinon.spy();
    ftp.ignoreCmdCode = 150;

    ftp.parseResponse(data1);
    assert.equal(ftp.ignoreCmdCode, 226);
    ftp.parseResponse(data2);
    assert.equal(ftp.ignoreCmdCode, null);
    assert(ftp.parse.calledOnce);
    next();
  });

  it("test getFeatures", function(next) {
    ftp.getFeatures(function(err, feats) {
      assert.ok(Array.isArray(feats));
      assert.ok(Array.isArray(ftp.features));
      assert.ok(ftp.system.length > 0);

      var feat = ftp.features[0];
      assert.ok(ftp.hasFeat(feat));
      assert.equal(false, ftp.hasFeat("madeup-feat"));
      next();
    });
  });

  it("test getFeatures", function(next) {
    ftp.getFeatures(function(err, feats) {
      assert.ok(Array.isArray(feats));
      assert.ok(Array.isArray(ftp.features));
      assert.ok(ftp.system.length > 0);

      var feat = ftp.features[0];
      assert.ok(ftp.hasFeat(feat));
      assert.equal(false, ftp.hasFeat("madeup-feat"));
      next();
    });
  });

  it("test print working directory", function(next) {
    ftp.raw.pwd(function(err, res) {
      assert(!err, err);

      var code = parseInt(res.code, 10);
      assert.ok(code === 257, "PWD command was not successful: " + res.text);

      next();
    });
  });

  it("test switch CWD", function(next) {
    ftp.raw.cwd(remoteCWD, function(err, res) {
      assert.ok(!err, err);

      var code = parseInt(res.code, 10);
      assert.ok(code === 200 || code === 250, "CWD command was not successful");

      ftp.raw.pwd(function(err, res) {
        assert.ok(!err, err);

        var code = parseInt(res.code, 10);
        assert.ok(code === 257, "PWD command was not successful");
        assert.ok(res.text.indexOf(remoteCWD), "Unexpected CWD");
        next();
      });
    });
  });

  it("test switch to unexistent CWD", function(next) {
    ftp.raw.cwd("/unexistentDir/", function(err, res) {
      var code = parseInt(res.code, 10);
      assert.ok( !! err);
      assert.equal(code, 550, "A (wrong) CWD command was successful. It should have failed");
      next();
    });
  });

  it("test listing with bad line breaks", function(next) {
    var badStr = "\
213-Status follows:\r\n\
-rw-r--r-- 1 0 0 105981956 Dec 20 18:07 GAT\r\n\
SBY.MPG\r\n\
-rw-r--r-- 1 0 0 74450948 Jan 17 18:16 GIJO.MPG\r\n\
drwxr-xr-x    3 0        0            4096 Apr 16  2011 bourd\n\
arie\r\n\
drwxr-xr-x    2 0        0            4096 Apr 16  2011 denton\r\n\
213 End of status";

    var entries = Utils.parseEntry(badStr);
    assert.equal("GATSBY.MPG", entries[0].name);
    assert.equal("GIJO.MPG", entries[1].name);
    assert.equal("bourdarie", entries[2].name);
    assert.equal("denton", entries[3].name);

    next();
  });

  it("test passive listing of current directory", function(next) {
    ftp.list(remoteCWD, function(err, res) {
      assert.ok(!err, err);
      assert.ok(res.length > 0);
      next();
    });
  });

  it("test ftp node stat", function(next) {
    ftp.raw.pwd(function(err, res) {
      var parent = /.*"(.*)".*/.exec(res.text)[1];
      var path = Path.resolve(parent + "/" + remoteCWD);
      ftp.raw.stat(path, function(err, res) {
        assert.ok(!err, res);
        assert.ok(res);

        assert.ok(res.code === 211 || res.code === 212 || res.code === 213);
        next();
      });
    });
  });

  it("test create and delete a directory", function(next) {
    var newDir = remoteCWD + "/ftp_test_dir";
    ftp.raw.mkd(newDir, function(err, res) {
      assert.ok(!err);
      assert.equal(res.code, 257);

      ftp.raw.rmd(newDir, function(err, res) {
        assert.ok(!err);
        next();
      });
    });
  });

  it("test create and delete a directory containing a space", function(next) {
    var newDir = remoteCWD + "/ftp test dür";
    ftp.raw.mkd(newDir, function(err, res) {
      assert.ok(!err);
      assert.equal(res.code, 257);

      ftp.raw.rmd(newDir, function(err, res) {
        assert.ok(!err);
        next();
      });
    });
  });

  it("test create and delete a file", function(next) {
    var filePath = getRemotePath("file_ftp_test.txt");
    Fs.readFile(__filename, "binary", function(err, data) {
      var buffer = new Buffer(data, "binary");
      ftp.put(buffer, filePath, function(hadError) {
        assert.ok(!hadError);

        ftp.ls(filePath, function(err, res) {
          assert.ok(!err);
          assert.equal(buffer.length, Fs.statSync(CWD + "/jsftp_test.js").size);

          ftp.raw.dele(filePath, function(err, data) {
            assert.ok(!err);

            next();
          });
        });
      });
    });
  });

  it("test save a remote copy of a local file", function(next) {
    var filePath = getRemotePath("file_ftp_test.txt");
    var onProgress = sinon.spy();
    ftp.on('progress', onProgress);
    ftp.put(__filename, filePath, function(err, res) {
      assert.ok(!err, err);

      ftp.ls(filePath, function(err, res) {
        assert.ok(!err);
        assert(onProgress.called);
        var data = onProgress.args[0][0];
        assert.equal(data.filename, filePath);
        assert.equal(data.action, 'put');
        assert.ok(typeof data.transferred, 'number');

        ftp.raw.dele(filePath, function(err, data) {
          assert.ok(!err);
          next();
        });
      });
    });
  });

  it("test rename a file", function(next) {
    var from = getRemotePath("file_ftp_test.txt");
    var to = getRemotePath("file_ftp_test_renamed.txt");
    Fs.readFile(__filename, "binary", function(err, data) {
      assert.ok(!err, err);
      var buffer = new Buffer(data, "binary");
      ftp.put(buffer, from, function(err, res) {
        assert.ok(!err, err);

        ftp.rename(from, to, function(err, res) {
          ftp.ls(to, function(err, res) {
            assert.ok(!err);

            assert.equal(buffer.length, Fs.statSync(__filename).size);

            ftp.raw.dele(to, function(err, data) {
              assert.ok(!err);
              next();
            });
          });
        });
      });
    });
  });

  it("test get a file", function(next) {
    var localPath = CWD + '/test_c9/testfile.txt';
    var remotePath = remoteCWD + "/testfile.txt";
    var realContents = Fs.readFileSync(localPath, "utf8");
    var str = "";
    ftp.get(remotePath, function(err, socket) {
      assert.ok(!err, err);
      assert.ok(arguments.length === 2);
      socket.on("data", function(d) {
        str += d;
      })
      socket.on("close", function(hadErr) {
        assert.equal(realContents, str);
        next();
      });
      socket.resume();
    });
  });

  it("test get a file and save it locally", function(next) {
    var localPath = getLocalPath("testfile.txt");
    var remotePath = getRemotePath("testfile.txt");
    var destination = localPath + ".copy";
    var onProgress = sinon.spy();
    ftp.on('progress', onProgress);

    Fs.unlink(destination, function() {
      Fs.readFile(localPath, "utf8", function(err, realContents) {
        ftp.get(remotePath, destination, function(err) {
          assert.ok(!err, err);
          assert.ok(arguments.length < 2, arguments.length);
          var data = onProgress.args[0][0];
          assert.equal(data.filename, remotePath);
          assert.equal(data.action, 'get');
          assert.ok(typeof data.transferred, 'number');
          Fs.readFile(destination, "utf8", function(err, data) {
            assert.strictEqual(data, realContents);
            next();
          });
        });
      });
    });
  });

  it("test get a big file stream", function(next) {
    var remotePath = getRemotePath("bigfile.test");
    var localPath = getLocalPath("bigfile.test");
    var data = (new Array(1 * 1024 * 1024)).join("x");
    var buffer = new Buffer(data, "binary");

    Fs.writeFileSync(localPath, buffer);

    ftp.getGetSocket(remotePath, function(err, socket) {
      assert.ok(!err, err);

      socket.resume();

      var counter = 0;

      socket.on('data', function(data) {
        counter += data.length;
      });

      socket.on('close', function() {
        assert.equal(buffer.length, counter);

        ftp.raw.dele(remotePath, function(err, data) {
          assert.ok(!err);
          next();
        });
      });
    });
  });

  it("test put a big file stream", function(next) {
    var remotePath = getRemotePath("bigfile.test");
    var data = (new Array(1 * 1024 * 1024)).join("x");

    ftp.getPutSocket(remotePath, function(err, socket) {
      assert.ok(!err, err);

      socket.write(data, function(err) {
        assert.ok(!err, err);
        socket.end();
      });
    }, function(err, res) {
      assert.ok(!err, err);

      ftp.raw.dele(remotePath, function(err, data) {
        assert.ok(!err);
        next();
      });
    });
  });

  it("test put a big file stream fail", function(next) {
    var remotePath = getRemotePath("/nonexisting/path/to/file.txt");

    ftp.getPutSocket(remotePath, function(err, socket, res) {
      assert.ok( !! err, err);
      assert.equal(err.code, 550, err);
    }, function(err, res) {
      assert.ok( !! err);
      next();
    });
  });

  it("test get fileList array", function(next) {
    var file1 = "testfile.txt";

    ftp.raw.cwd(getRemotePath(''), function() {
      ftp.ls(".", function(err, res) {
        assert.ok(!err, err);
        assert.ok(Array.isArray(res));

        res.forEach(assert.ok);
        res = res.map(function(file) {
          return file.name;
        });

        assert.ok(res.indexOf(file1) > -1);

        next();
      });
    });
  });

  it("test reconnect", function(next) {
    ftp.raw.pwd(function(err, res) {
      if (err) throw err;

      var code = parseInt(res.code, 10);
      assert.ok(code === 257, "PWD command was not successful");

      ftp.socket.end();
      ftp.raw.quit(function(err, res) {
        if (err) throw err;
        next();
      });
    });
  });

  it("test attach event handlers: connect", function(_next) {
    var clientOnConnect = function() {
      client.auth(FTPCredentials.user, FTPCredentials.pass, next);
    };

    var next = function(err) {
      assert.ok(!err);
      client.destroy();
      _next();
    };

    var client = new Ftp({
      host: "localhost",
      user: "user",
      port: 3334,
      pass: "12345"
    });
    client.on("connect", clientOnConnect);
  });

  it("test PASV streaming: Copy file using piping", function(next) {
    var filePath = getRemotePath("testfile.txt");
    var originalData = Fs.readFileSync(getLocalPath("testfile.txt"));
    ftp.getGetSocket(filePath, function(err, readable) {
      assert(!err, err);
      assert.ok(readable);

      readable.on("error", error);

      function error(err) {
        assert.ok(!err, err);
        if (readable.destroy) readable.destroy();
        next();
      }

      var remoteCopy = filePath + ".bak";
      ftp.getPutSocket(remoteCopy, function(err, socket) {
        assert.ok(!err, err);
        readable.pipe(socket);
        readable.resume();
      },

      function(hadError) {
        assert.ok(!hadError);

        var str = "";
        ftp.getGetSocket(remoteCopy, function(err, socket) {
          assert.ok(!err, err);
          socket.on("data", function(d) {
            str += d;
          });
          socket.on("close", function(hadErr) {
            assert.equal(originalData.toString("utf8"), str);
            next();
          });
          socket.resume();
        });
      });
    });
  });

  it("Test that streaming GET (RETR) retrieves a file properly", function(next) {
    var path = getLocalPath("testfile.txt");
    var originalData = Fs.readFileSync(path);
    ftp.getGetSocket(getRemotePath("testfile.txt"), function(err, readable) {
      assert.ok(!err);
      concatStream(err, readable, function(err, buffer) {
        assert.ok(!err);
        assert.equal(buffer.toString(), originalData.toString());
        next();
      });
    });
  });

  it("Test that streaming GET (RETR) fails when a file is not present", function(next) {
    ftp.getGetSocket("unexisting/file/path", function(err, readable) {
      assert.ok(err);
      assert.equal(550, err.code);
      next();
    });
  });

  it("Test that streaming PUT (STOR) stores a file properly", function(next) {
    var path = getLocalPath("testfile.txt");
    var originalData = Fs.createReadStream(getLocalPath("testfile.txt"));
    originalData.pause();

    ftp.getPutSocket(getRemotePath("testfile.txt.bak"), function(err, socket) {
      assert.ok(!err);
      originalData.pipe(socket);
      originalData.resume();
      concatStream(err, originalData, function(err, buffer) {
        assert.ok(!err);
        Fs.readFile(path, "utf8", function(err, original) {
          assert.equal(buffer.toString("utf8"), original);
          next();
        });
      });
    });
  });

  it("Test that streaming PUT (STOR) fails when a file is not present", function(next) {
    ftp.getPutSocket("unexisting/file/path", function(err, socket) {
      assert.ok(err);
      next();
    });
  });

  it("Test that onConnect is called", function(next) {
    var ftp2 = new Ftp(FTPCredentials);
    ftp2.on("connect", function() {
      next();
    });
  });

  it("Test for correct data on ls 1", function(next) {
    var paths = ['test/test_c9/testfile.txt', 'work/test/main.css'];
    ftp.auth(FTPCredentials.user, FTPCredentials.pass, function(err, data) {
      if (err) return console.log(err);

      var processed = 0;
      ftp.ls(paths[0], function showFile(err, res) {
        assert.ok(!err);
        assert.strictEqual(res[0].name, 'testfile.txt');
        processed += 1;
        if (processed === 2) next();
      });

      ftp.ls(paths[1], function showFile(err, res1) {
        assert.ok(!!err);
        processed += 1;
        if (processed === 2) next();
      });
    });
  });
});
