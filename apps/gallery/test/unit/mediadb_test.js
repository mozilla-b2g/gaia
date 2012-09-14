require('js/mediadb.js');

suite('MediaDB', function() {

  const directory = "mediadb_test/";
  const extension = ".png";
  
  // These are the file names, and file content we'll use
  var files = {
    1: "first",
    2: "second",
    3: "tri",
    4: "quad",
    111:"one hundred and eleven"
    "sub/1", "subdirectory"
  };

  // Create a fake png file
  function createFile(name, content) {
    var storage = navigator.getDeviceStorage('pictures');
    var blob = new Blob([content], 'image/png');
    storage.addNamed(directory + name + extension, blob);
  }

  function deleteFile(name) {
    var storage = navigator.getDeviceStorage('pictures');
    storage.delete(directory + name + extension);
  }

  // Use device storage to create a directory of fake picture files
  setup(function() {
    // Create the test files
    for(name in files) 
      createFile(name, files[name]);
  });

  teardown(function() {
    // Delete the test files
    for(name in files) 
      deleteFile(name);
  });

  test("API existance tests", function() {
    // Check that MediaDB exists
    assert.ok("MediaDB");

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
                 .join(" "),
                 "addEventListener addFile cancelEnumeration close count " +
                 "deleteFile enumerate getFile removeEventListener " +
                 "updateMetadata");

  });
});
