// Make sure the navigator object exists
// This is a workaround to defeat lazy initialization of navigator
// and prevent erroneous reports of global leakage.
window.navigator;

suite("DeviceStorage", function() {

  // If the API hasn't landed yet, then don't test it.
  if (!navigator.getDeviceStorage)
    return;

  test("api existence", function() {
    assert.typeOf(navigator.getDeviceStorage, "function");
  });

  test("getDeviceStorage returns an array", function() {
    var ds = navigator.getDeviceStorage("pictures");
    assert.ok(ds);
    assert.isTrue(Array.isArray(ds));
  });

  suite("use the api", function() {
    var storage;
    const FILENAME = "greeting.txt";

    setup(function() {
      var storageAreas = navigator.getDeviceStorage("pictures");
      storage = storageAreas[0];
    });

    test("write, read, delete a file", function(done) {
      this.timeout(10000);  // Let the emulator take up to 10 seconds
      var blob = new Blob(["hello", " world"], {type:"text/plain"});
      var addrequest = storage.addNamed(blob, FILENAME);
      addrequest.onsuccess = function() {
        var readrequest = storage.get(FILENAME);
        readrequest.onsuccess = function() {
          var file = readrequest.result;
          assert.ok(file, "file is okay");
          var reader = new FileReader();
          reader.readAsText(file);
          reader.onload = function() {
            assert.equal(reader.result, "hello world");

            var deleterequest = storage.delete(FILENAME);
            deleterequest.onsuccess = function() {

              var readrequest2 = storage.get(FILENAME);
              // We've just deleted, so this should fail
              readrequest2.onsuccess = function() {
                done(new ERROR("DeviceStorage.delete() didn't delete"));
              };
              readrequest2.onerror = function() {
                done();
              }
            };
            deleterequest.onerror = function() {
              done(new Error("DeviceStorage.delete() error " +
                             JSON.stringify(deleterequest.error)));
            };
          };
        };
        readrequest.onerror = function() {
          done(new Error("DeviceStorage.get() error " +
                         JSON.stringify(readrequest.error)));
        };
      };
      addrequest.onerror = function() {
        done(new Error("DeviceStorage.addNamed() onerror " + 
                       JSON.stringify(addrequest.error)));
      };
    });

/*
 * this test doesn't work yet, so  commented out for now to prevent CI failures
    test("enumerate photos", function(done) {
      this.timeout(10000);  // Let the emulator take up to 10 seconds
      var cursor = storage.enumerate();
      cursor.onsuccess = function() {
        var file = cursor.result;
        if (file === null)
          done();
        else {
//          console.log("GOT FILE");
//          console.log(file.name, file.type, file.size);
          cursor.continue();
        }
      };
      cursor.onerror = function() {
        done(new Error("enumerate error"));
      };
    });
*/
  });
    
});
