require('/shared/js/device_storage/enumerate_all.js');
require('/shared/js/mediadb.js');

suite('MediaDB', function() {
  if (navigator.getDeviceStorage('pictures') == null) {
    test('navigator.getDeviceStorage() returns null on this platform; ' +
         'skipping all MediaDB tests',
         function() {});
    return;
  }

  var directory = 'mediadbtests/1/';

  // These are the file names, and file content we'll use
  var files = {
    '1.png': {word: 'first', number: 9, x: 1},
    '2.png': {word: 'second', number: 8, x: 1},
    '3.png': {word: 'tri', number: 7, x: 0},
    '4.png': {word: 'quad', number: 6, x: 0},
    '111.png': {word: 'one hundred and eleven', number: 5, x: 0},
    'sub/1.png': {word: 'subdirectory', x: 0}
  };


  // Create a fake png file
  function createFile(directory, name, content, callback) {
    var storage = navigator.getDeviceStorage('pictures');
    var blob = new Blob([JSON.stringify(content)], {type: 'image/png'});
    storage.addNamed(blob, directory + name).onsuccess = function() {
      if (callback) callback();
    };
  }

  function deleteFile(directory, name, callback) {
    var storage = navigator.getDeviceStorage('pictures');
    storage.delete(directory + name).onsuccess = function() {
      if (callback) callback();
    };
  }

  // Use the contents of the file as our metadata
  function fakeMetadataParser(blob, callback) {
    var reader = new FileReader();
    reader.readAsText(blob);
    reader.onload = function() {
      callback(JSON.parse(reader.result));
    };
  }

  // Delete all files from a directory
  function clearDirectory(directory, callback) {
    var storage = navigator.getDeviceStorage('pictures');
    var cursor = storage.enumerate(directory);
    cursor.onsuccess = function() {
      var file = cursor.result;
      if (file) {
        storage.delete(directory + cursor.result.name).onsuccess = function() {
          cursor.continue();
        };
      }
      else {
        callback();
      }
    };
    cursor.onerror = callback;
  }

/*
// These tests are currently failing and have been temporarily disabled as per
// Bug 838993. They should be fixed and re-enabled as soon as possible as per
// Bug 840493.
  test('API existence tests', function() {
    // Check that MediaDB exists
    assert.ok(MediaDB);

    // Check that its constants exist
    assert.equal(MediaDB.OPENING, 'opening');
    assert.equal(MediaDB.READY, 'ready');
    assert.equal(MediaDB.NOCARD, 'nocard');
    assert.equal(MediaDB.UNMOUNTED, 'unmounted');
    assert.equal(MediaDB.CLOSED, 'closed');

    // Check that its methods, and only its methods exist
    assert.equal(Object.keys(MediaDB.prototype)
                 .filter(function(m) {
                   return typeof MediaDB.prototype[m] === 'function';
                 })
                 .sort()
                 .join(' '),
                 'addEventListener addFile cancelEnumeration close count ' +
                 'deleteFile enumerate getFile removeEventListener ' +
                 'updateMetadata');

  });


  test('events and scanning', function(done) {

    function continueTest() {
      testGenerator.next();
    }

    var testGenerator = (function() {
      // make sure the directory is empty
      yield clearDirectory(directory, continueTest);

      // Create the test files one at a time
      for (var name in files) {
        // create a file and return
        yield createFile(directory, name, files[name], continueTest);
      }

      // Once the files are in place, open the mediadb
      var mediadb = new MediaDB('pictures',
                                fakeMetadataParser,
                                {
                                  directory: directory,
                                  indexes: ['size',
                                            'metadata.word',
                                            'metadata.number',
                                            'metadata.x']
                                });

      var events = '';

      // Set up event handlers to keep track of what it does
      mediadb.onready = function() {
        events += ' ready';
      };

      mediadb.onscanstart = function() {
        events += ' scanstart';
      };

      mediadb.oncreated = function(e) {
        events += ' ';
        events += e.detail.map(function(f) { return f.name }).sort().join(' ');
      };

      mediadb.ondeleted = function(e) {
        events += ' deleted';
      };

      mediadb.onscanend = function() {
        events += ' scanend';
        mediadb.close();
      }

      mediadb.onunavailable = function() {
        events += ' unavailable';
        continueTest();
      }
      yield;

      var expectedEvents = ' ready scanstart ' +
        Object.keys(files).sort().join(' ') +
        ' scanend unavailable';
      assert.equal(events, expectedEvents);
      yield done();

    }());
    continueTest();
  });

  // Test created and deleted events when creating and deleting files
  // one at a time using device storage externally.
  // And also test enumeration methods
  test('create, count, enumerate, updateMetadata, delete', function(done) {

    function continueTest() {
      testGenerator.next();
    }

    var testGenerator = (function() {
      // make sure the directory is empty
      yield clearDirectory(directory, continueTest);

      // Create a mediadb
      var mediadb = new MediaDB('pictures',
                                fakeMetadataParser,
                                {
                                  directory: directory,
                                  indexes: ['size',
                                            'metadata.word',
                                            'metadata.number',
                                            'metadata.x']
                                });

      // Wait until it has finished scanning
      yield mediadb.addEventListener('scanend', continueTest);

      yield mediadb.count(function(n) {
        assert.equal(n, 0, 'db should be empty');
        continueTest();
      });


      var expectedsize = 0;
      // Create the test files one at a time
      for (var name in files) {
        // create a file and return
        createFile(directory, name, files[name]);

        // Wait for the 'created' event
        yield mediadb.oncreated = function(e) {
          assert.equal(e.type, 'created');
          assert.equal(Array.isArray(e.detail), true);
          assert.equal(e.detail.length, 1);
          assert.equal(e.detail[0].name, name);
          continueTest();
        }

        // Check that the size is what we expect
        expectedsize++;
        yield mediadb.count(function(n) {
          assert.equal(n, expectedsize);
          continueTest();
        });
      }

      // Start an enumeration and then cancel it right away.
      // Fail if the callback is ever called
      var handle = mediadb.enumerate(function() {
        assert.ok(false, 'enumeration was not cancelled');
      });
      mediadb.cancelEnumeration(handle);

      var filenames;

      function enumerate(key, range, direction) {
        filenames = [];
        mediadb.enumerate(key, range, direction, function(fileinfo) {
          if (fileinfo)
            filenames.push(fileinfo.name);
          else
            continueTest(filenames);
        });
      }

      // For default enumeration we expect the filenames in alphabetical order
      yield enumerate();
      assert.deepEqual(filenames,
                       Object.keys(files).sort(),
                       'default enumeration order');

      yield enumerate('name', null, 'prev');
      assert.deepEqual(filenames,
                       Object.keys(files).sort().reverse(),
                       'reverse order');


      // If we enumerate by size we expect them in length order
      yield enumerate('size');
      assert.deepEqual(filenames, [
        'sub/1.png', '3.png', '4.png', '1.png', '2.png', '111.png'
      ], 'size order');

      // Enumerate by metadata word order
      yield enumerate('metadata.word');
      assert.deepEqual(filenames, [
        '1.png', '111.png', '4.png', '2.png', 'sub/1.png', '3.png'
      ], 'metadata word order');

      // Enumerate by metadata number
      yield enumerate('metadata.number');
      assert.deepEqual(filenames, [
        '111.png', '4.png', '3.png', '2.png', '1.png'
      ], 'metadata number order');

      // Update metadata.number for one of the files
      yield mediadb.updateMetadata('111.png', { number: 1000 }, continueTest);

      // Enumerate by metadata number again and expect a different order
      yield enumerate('metadata.number');
      assert.deepEqual(filenames, [
        '4.png', '3.png', '2.png', '1.png', '111.png'
      ], 'metadata number order');

      // Search for files that have x = 1
      yield enumerate('metadata.x', 1);
      assert.equal(filenames.length, 2);
      assert.notEqual(filenames.indexOf('1.png'), -1);
      assert.notEqual(filenames.indexOf('2.png'), -1);

      // Search for files whose word is > 'q'
      yield enumerate('metadata.word', IDBKeyRange.lowerBound('q'));
      assert.deepEqual(filenames, [
        '4.png', '2.png', 'sub/1.png', '3.png'
      ], 'word > q');

      // Same, but return in reverse order
      yield enumerate('metadata.word', IDBKeyRange.lowerBound('q'), 'prev');
      assert.deepEqual(filenames, [
        '4.png', '2.png', 'sub/1.png', '3.png'
      ].reverse(), 'word > q reversed');

      // Now delete the files, reversing what we did at the start of the test
      for (var name in files) {
        // create a file and return
        deleteFile(directory, name);

        // Wait for the 'deleted' event
        yield mediadb.ondeleted = function(e) {
          assert.equal(e.type, 'deleted');
          assert.equal(Array.isArray(e.detail), true);
          assert.equal(e.detail.length, 1);
          assert.equal(e.detail[0], name);
          continueTest();
        }

        // Check that the size is what we expect
        expectedsize--;
        yield mediadb.count(function(n) {
          assert.equal(n, expectedsize);
          continueTest();
        });

      }

      mediadb.onunavailable = function() { done(); }
      yield mediadb.close();
    }());

    continueTest();
  });

  // Much like the test above, but use mediadb.addFile and deleteFile()
  // instead of raw device storage, and don't repeat all the enumeration tests
  test('addFile, deleteFile', function(done) {

    function continueTest() {
      testGenerator.next();
    }

    var testGenerator = (function() {
      // make sure the directory is empty
      yield clearDirectory(directory, continueTest);

      // Create a mediadb
      var mediadb = new MediaDB('pictures',
                                fakeMetadataParser,
                                {
                                  directory: directory,
                                  indexes: ['size',
                                            'metadata.word',
                                            'metadata.number',
                                            'metadata.x']
                                });

      // Wait until it has finished scanning
      yield mediadb.addEventListener('scanend', continueTest);

      yield mediadb.count(function(n) {
        assert.equal(n, 0, 'db should be empty');
        continueTest();
      });

      var expectedsize = 0;
      // Create the test files one at a time
      for (var name in files) {
        // create a file and return
        mediadb.addFile(name,
                        new Blob([JSON.stringify(files[name])],
                                 {type: 'image/png'}));

        // Wait for the 'created' event
        yield mediadb.oncreated = function(e) {
          assert.equal(e.type, 'created');
          assert.equal(Array.isArray(e.detail), true);
          assert.equal(e.detail.length, 1);
          assert.equal(e.detail[0].name, name);
          continueTest();
        }

        // Check that the size is what we expect
        expectedsize++;
        yield mediadb.count(function(n) {
          assert.equal(n, expectedsize);
          continueTest();
        });
      }

      var filenames;

      function enumerate(key, range, direction) {
        filenames = [];
        mediadb.enumerate(key, range, direction, function(fileinfo) {
          if (fileinfo)
            filenames.push(fileinfo.name);
          else
            continueTest(filenames);
        });
      }

      // For default enumeration we expect the filenames in alphabetical order
      yield enumerate();
      assert.deepEqual(filenames,
                       Object.keys(files).sort(),
                       'default enumeration order');

      // Now delete the files, reversing what we did at the start of the test
      for (var name in files) {
        // create a file and return
        mediadb.deleteFile(name);

        // Wait for the 'deleted' event
        yield mediadb.ondeleted = function(e) {
          assert.equal(e.type, 'deleted');
          assert.equal(Array.isArray(e.detail), true);
          assert.equal(e.detail.length, 1);
          assert.equal(e.detail[0], name);
          continueTest();
        }

        // Check that the size is what we expect
        expectedsize--;
        yield mediadb.count(function(n) {
          assert.equal(n, expectedsize);
          continueTest();
        });

      }

      mediadb.onunavailable = function() { done(); }
      yield mediadb.close();
    }());

    continueTest();
  });

  // Much like the test above, but use mediadb.addFile and deleteFile()
  // instead of raw device storage, and don't repeat all the enumeration tests
  test('batched notifications', function(done) {

    function continueTest() {
      testGenerator.next();
    }

    var testGenerator = (function() {
      // make sure the directory is empty
      yield clearDirectory(directory, continueTest);

      // Create a mediadb
      var mediadb = new MediaDB('pictures',
                                fakeMetadataParser,
                                {
                                  directory: directory,
                                  indexes: ['size',
                                            'metadata.word',
                                            'metadata.number',
                                            'metadata.x']
                                });

      // Wait until it has finished scanning
      yield mediadb.addEventListener('scanend', continueTest);

      yield mediadb.count(function(n) {
        assert.equal(n, 0, 'db should be empty');
        continueTest();
      });

      var filenames = Object.keys(files).sort();

      // Create the test files all at once
      for (var name in files) {
        // create a file and return
        mediadb.addFile(name,
                        new Blob([JSON.stringify(files[name])],
                                 {type: 'image/png'}));
      }

      // Wait for the 'created' event
      yield mediadb.oncreated = function(e) {
        assert.equal(e.type, 'created');
        assert.equal(Array.isArray(e.detail), true);
        assert.equal(e.detail.length, filenames.length);
        assert.deepEqual(e.detail.map(function(f) { return f.name }).sort(),
                         filenames);
        continueTest();
      }

      // Now delete the files
      for (var name in files) {
        // create a file and return
        mediadb.deleteFile(name);
      }

      // Wait for the 'deleted' event
      yield mediadb.ondeleted = function(e) {
        assert.equal(e.type, 'deleted');
        assert.equal(Array.isArray(e.detail), true);
        assert.equal(e.detail.length, filenames.length);
        assert.deepEqual(e.detail.sort(), filenames);
        continueTest();
      }

      mediadb.onunavailable = function() { done(); }
      yield mediadb.close();
    }());

    continueTest();
  });
*/
});
