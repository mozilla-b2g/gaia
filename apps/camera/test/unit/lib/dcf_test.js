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

    setup(function() {
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
      'DCIM/100MZLLA/IMG_0001.jpg'
    ];

    test('=> pads the filename', function() {
      var result;
      var stub2 = this.sandbox.stub(asyncStorage, 'setItem');

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
        }
      };

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
      assert.equal(result, 'DCIM/101MZLLA/IMG_0001.jpg');
      assert.equal(created.filepath, 'DCIM/101MZLLA/IMG_0001.jpg');
      assert.equal(created.filename, 'IMG_0001.jpg');
      assert.equal(created.dir, 'DCIM/101MZLLA/');

      subject.createDCFFilename(storage, 'image', createCallback);
      stub2.getCall(2).args[2]({

      });
      assert.equal(result, 'DCIM/101MZLLA/IMG_0002.jpg');
      assert.equal(created.filepath, 'DCIM/101MZLLA/IMG_0002.jpg');
      assert.equal(created.filename, 'IMG_0002.jpg');
      assert.equal(created.dir, 'DCIM/101MZLLA/');

      subject.createDCFFilename(storage, 'video', createCallback);
      stub2.getCall(3).args[2]({

      });
      assert.equal(result, 'DCIM/101MZLLA/VID_0003.3gp');
      assert.equal(created.filepath, 'DCIM/101MZLLA/VID_0003.3gp');
      assert.equal(created.filename, 'VID_0003.3gp');
      assert.equal(created.dir, 'DCIM/101MZLLA/');
    });
  });
});
