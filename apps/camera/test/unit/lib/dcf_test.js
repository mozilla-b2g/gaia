require('/shared/js/format.js');

suite('Format Timer Unit Tests', function() {
  /*global asyncStorage*/
  'use strict';
  var subject;

  suiteSetup(function(done) {
    requirejs([
      'lib/dcf'
    ], function(dcf) {
      subject = dcf;
      done();
    });
  });

  suite('#createDCFFilename', function() {

    suiteSetup(function() {
      this.sandbox = sinon.sandbox.create();
      var stub = this.sandbox.stub(asyncStorage, 'getItem');
      subject.init();
      // Trigger the callback
      stub.getCall(0).args[1]({
        file: 1,
        dir: 100
      });
    });

    var filenames = [
      'DCIM/100MZLLA/IMG_0001.jpg',
      'DCIM/101MZLLA/IMG_0001.jpg',
      'DCIM/101MZLLA/IMG_0003.jpg',
      'DCIM/101MZLLA/IMG_0010.jpg'
    ];

    var result;

    var cursor = {
      result: null,
      done: true,
      _onsuccess: null,
      _results: null,
      _index: 0,
      set onsuccess(callback) {
        this._onsuccess = callback;
        this.continue();
      },
      continue: function() {
        if (this._results && !this.done) {
          this.result = this._results[this._index];
          this._index++;
          this.done = (this._results.length <= this._index);
          if (this._onsuccess) {
            this._onsuccess();
          }
        }
      },
      _reset: function(a) {
        this._results = a;
        this._index = 0;
        this._onsuccess = null;
        this.done = false;
        return this;
      }
    };

    var storage = {
      get: function(filename) {
        var state = 'none';
        if (filenames.indexOf(filename) != -1) {
          state = 'ok';
        } else {
          state = 'error';
        }
        result = filename;
        return {
          set onsuccess(callback) {
            if (this.state == 'ok') {
              callback();
            }
          },
          set onerror(callback) {
            if (this.state == 'error') {
              callback();
            }
          },
          state: state,
        };
      },

      enumerate: function(path, options) {
        var results = [];
        filenames.forEach(function (elem) {
          var lastSlash = elem.lastIndexOf('/');
          if ((lastSlash != -1) &&
              (elem.substring(0, lastSlash + 1) == path)) {
            results.push({name: elem.substring(lastSlash + 1)});
          }
        });
        return cursor._reset(results);
      }
    };

    test('=> mockstorage', function() {
      var c = storage.enumerate('DCIM/100MZLLA/');
      c.onsuccess = function() {
      };

      assert.ok(c.done);
      assert.ok(c._results);
      assert.equal(c._results.length, 1);
      assert.equal(c.result.name, 'IMG_0001.jpg');

      c = storage.enumerate('DCIM/101MZLLA/');
      c.onsuccess = function() {
      };

      assert.ok(!c.done);
      assert.ok(c._results);
      assert.equal(c._results.length, 3);
      assert.equal(c.result.name, 'IMG_0001.jpg');
      c.continue();
      assert.ok(!c.done);
      assert.equal(c.result.name, 'IMG_0003.jpg');
      c.continue();
      assert.ok(c.done);
      assert.equal(c.result.name, 'IMG_0010.jpg');
    });

    test('=> nextSeqIndex', function() {
      var nextSeqIndex = subject.priv.nextSeqIndex;

      var seq = nextSeqIndex(storage, 'DCIM/100MZLLA/', {file: 1, dir: 100});
      assert.equal(seq.file, 2);

      seq = nextSeqIndex(storage, 'DCIM/101MZLLA/', {file: 1, dir: 101});
      assert.equal(seq.file, 11);
    });

    test('=> getting DCF filename', function() {
      var stub2 = this.sandbox.stub(asyncStorage, 'setItem');

      var created;

      function createCallback(filepath, filename, dir) {
        created = { filepath: filepath,
                    filename: filename,
                    dir: dir };
      }

      subject.createDCFFilename(storage, 'image', createCallback);
      stub2.getCall(0).args[2]({

      });
      stub2.getCall(1).args[2]({

      });

      // 'DCIM/100MZLLA/IMG_0001.jpg' is already there
      // Brutal reset of the directory.
      assert.equal(result, 'DCIM/100MZLLA/IMG_0002.jpg');
      assert.equal(created.filepath, 'DCIM/100MZLLA/IMG_0002.jpg');
      assert.equal(created.filename, 'IMG_0002.jpg');
      assert.equal(created.dir, 'DCIM/100MZLLA/');

      subject.createDCFFilename(storage, 'image', createCallback);
      stub2.getCall(2).args[2]({

      });
      assert.equal(result, 'DCIM/100MZLLA/IMG_0003.jpg');
      assert.equal(created.filepath, 'DCIM/100MZLLA/IMG_0003.jpg');
      assert.equal(created.filename, 'IMG_0003.jpg');
      assert.equal(created.dir, 'DCIM/100MZLLA/');

      subject.createDCFFilename(storage, 'video', createCallback);
      stub2.getCall(3).args[2]({

      });
      assert.equal(result, 'DCIM/100MZLLA/VID_0004.3gp');
      assert.equal(created.filepath, 'DCIM/100MZLLA/VID_0004.3gp');
      assert.equal(created.filename, 'VID_0004.3gp');
      assert.equal(created.dir, 'DCIM/100MZLLA/');
    });
  });
});
