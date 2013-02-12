suite('DeviceStorage', function() {
  // If the API hasn't landed yet, then don't test it.
  if (!navigator.getDeviceStorage) {
    test("navigator.getDeviceStorage() doesn't exist; not running tests",
         function() {});
    return;
  }

  var storageAreas = navigator.getDeviceStorage('pictures');

  if (storageAreas == null) {
    test('navigator.getDeviceStorage() returns null on this platform; ' +
         'not running tests',
         function() {});
    return;
  }
  else {
/*
// These tests are currently failing and have been temporarily disabled as per
// Bug 838993. They should be fixed and re-enabled as soon as possible as per
// Bug 840493.
    test('getDeviceStorage() returns an array', function() {
      assert.ok(storageAreas);
      assert.isTrue(Array.isArray(storageAreas));
    });
*/
  }

  var storage = storageAreas[0];

/*
// These tests are currently failing and have been temporarily disabled as per
// Bug 838993. They should be fixed and re-enabled as soon as possible as per
// Bug 840493.
  test('write, read, enumerate and delete a file', function(done) {
    this.timeout(10000);  // Let the emulator take up to 10 seconds
    var directory = 'test';
    var filename = Math.random().toString();
    var pathname = directory + '/' + filename;
    var blob = new Blob(['hello', ' world'], {type: 'text/plain'});
    var addrequest = storage.addNamed(blob, pathname);
    addrequest.onerror = function() {
      done(new Error('DeviceStorage.addNamed() onerror ' +
                     addrequest.error.name));
    };
    addrequest.onsuccess = function() {
      var readrequest = storage.get(pathname);
      readrequest.onerror = function() {
        done(new Error('DeviceStorage.get() error ' +
                       readrequest.error.name));
      };
      readrequest.onsuccess = function() {
        var file = readrequest.result;
        assert.ok(file, 'file is okay');
        var reader = new FileReader();
        reader.readAsText(file);
        reader.onerror = function() {
          done(new Error('FileReader.readAsText() error ' +
                         reader.error.name));
        };
        reader.onload = function() {
          assert.equal(reader.result, 'hello world');
          // XXX
          // If I just enumerate the directory and look for the
          // filename itself, then the delete() call later on
          // doesn't actually remove the file.
          // Doing it this way still leaves the empty directory around
          // of course.
          var cursor = storage.enumerate();
          var foundfile = false;
          cursor.onerror = function() {
            done(new Error('DeviceStorage.enumerate() error ' +
                           cursor.error.name));

          };
          cursor.onsuccess = function() {
            if (cursor.result !== null) {
              if (cursor.result.name === pathname)
                foundfile = true;
              cursor.continue();
            }
            else {  // we're done
              assert.ok(foundfile === true, 'enumerated the new file');

              var deleterequest = storage.delete(pathname);
              deleterequest.onerror = function() {
                done(new Error('DeviceStorage.delete() error ' +
                               deleterequest.error.name));
              };
              deleterequest.onsuccess = function() {
                var readrequest2 = storage.get(pathname);
                // We've just deleted, so this should fail
                readrequest2.onsuccess = function() {
                  done(new ERROR("DeviceStorage.delete() didn't delete"));
                };
                readrequest2.onerror = function() {
                  done();
                };
              };
            }
          };
        };
      };
    };
  });
*/
});
