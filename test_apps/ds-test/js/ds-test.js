
// Once bug 858416 lands, then testComposite can be set to true

var gTestComposite = true;
var gListening = false;

function humanBytes(bytes) {
  var s = ['bytes', 'kB', 'MB', 'GB', 'TB', 'PB', '??'];
  if (bytes == 0) {
    return "0 bytes";
  }
  var e = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, Math.floor(e))).toFixed(2) + " " + s[e];
}

var gStorageType;
var gCompositeStorage;
var gVolumeStorages;

function ds_getStorageType() {
  var typeElt = document.getElementById("ds.type");
  var typeIdx = typeElt.selectedIndex;
  return typeElt.options[typeIdx].value;
}

function UpdateStorage() {
  var storageType = ds_getStorageType();
  if (storageType == gStorageType) {
    return;
  }

  if (gListening) {
    if (gCompositeStorage) {
      gCompositeStorage.removeEventListener('change', ds_changeHandler);
    }
  }

  gStorageType = storageType;
  gCompositeStorage = navigator.getDeviceStorage(gStorageType);
  if (gTestComposite) {
    gVolumeStorages = navigator.getDeviceStorages(gStorageType);
  }

  if (gListening) {
    gCompositeStorage.addEventListener('change', ds_changeHandler);
  }
}

function processStorages(obj, storages) {
  var storage;
  var storageIndex = -1;

  obj.storageType = gStorageType;

  function processNext(obj) {
    try {
      storageIndex += 1;
      if (storageIndex >= storages.length) {
        if ("done" in obj) {
          obj.done();
        }
        return;
      }
      obj.storage = storages[storageIndex].storage;
      obj.label = storages[storageIndex].label;
      //log("Processing storage " + obj.label);
      if ("storageName" in storages[storageIndex]) {
        obj.storageName = storages[storageIndex].storageName;
      } else {
        obj.storageName = "";
      }
      req = obj.request();
      req.onsuccess = function report_onsuccess(e) {
        try {
          if ("onnext" in obj) {
            if (e.target.result) {
              obj.onnext(e);
              e.target.continue();
            } else {
              if ("onnextdone" in obj) {
                obj.onnextdone();
              }
              processNext(obj);
            }
          } else {
            if ("onsuccess" in obj) {
              obj.onsuccess(e);
            }
            processNext(obj);
          }
        } catch (e) {
          log("report_onsuccess: caught an error");
          log(e);
          log(e.stack);
        }
      };
      req.onerror = function report_onerror(e) {
        if ("onerror" in obj) {
          obj.onerror(e);
        } else {
          log("report_onerror");
          log(e.target.error.name);
        }
        processNext(obj);
      };
    } catch (e) {
      log("processNext caught an error")
      log(e);
      log(e.stack);
    }
  }

  if ("init" in obj) {
    obj.init();
  }
  processNext(obj);
}

function report(obj) {
  UpdateStorage();
  log("Testing storage [composite]");
  var storages = [{storage: gCompositeStorage, label: "composite"}];
  if (gTestComposite) {
    for (i = 0; i < gVolumeStorages.length; i++) {
      log("Testing storage [" + gVolumeStorages[i].storageName + "]");
      storages = storages.concat({storage: gVolumeStorages[i], label: gVolumeStorages[i].storageName});
    }
  }
  processStorages(obj, storages);
}

function processFile(obj, absComposite) {
  if (typeof absComposite === "undefined") {
    absComposite = true;
  }
  UpdateStorage();
  // Test using filename on the composite storage object
  log("Testing storage [composite]");
  var storages = [{storage: gCompositeStorage, label: "composite"}];
  if (gTestComposite) {
    if (absComposite) {
      // Test using /volume/filename on the composite storage object
      for (i = 0; i < gVolumeStorages.length; i++) {
        log("Testing storage composite: [" + gVolumeStorages[i].storageName + "]");
        storages = storages.concat({storage: gCompositeStorage,
                                    label: "composite-" + gVolumeStorages[i].storageName,
                                    storageName: gVolumeStorages[i].storageName});
      }
    }
    // Test using just filename on the non-composite storage objects
    for (i = 0; i < gVolumeStorages.length; i++) {
      log("Testing storage non-composite: [" + gVolumeStorages[i].storageName + "]");
      storages = storages.concat({storage: gVolumeStorages[i],
                                  label: gVolumeStorages[i].storageName});
    }
  }
  processStorages(obj, storages);
}

function translateError(err) {
  switch (err) {
    case "NoModificationAllowedError":  return "File Exists";
    case "NotFoundError":               return "File does not exist";
    case "TypeMismatchError":           return "File not enumerable/illegal type";
    case "SecurityError":               return "Permission Denied";
    case "Unknown":                     return "Unknown";
  }
  return "*** Unknown ***";
}

function FreeSpace() {}
FreeSpace.prototype = {
  init: function freeSpace_init() {
    log("Free Space for type '" + this.storageType + "'");
  },
  request: function freeSpace_request() {
    return this.storage.freeSpace();
  },
  onsuccess: function freeSpace_onsuccess(e) {
     log("  " + this.label + " = " + humanBytes(e.target.result));
  }
};

function UsedSpace() {}
UsedSpace.prototype = {
  init: function usedSpace_init() {
    log("Used Space for type '" + this.storageType + "'");
  },
  request: function usedSpace_request() {
    return this.storage.usedSpace();
  },
  onsuccess: function usedSpace_onsuccess(e) {
     log("  [" + this.label + "] = " + humanBytes(e.target.result));
  }
};

function Available() {}
Available.prototype = {
  init: function availSpace_init() {
    log("Available status for type '" + this.storageType + "'");
  },
  request: function availSpace_request() {
    return this.storage.available();
  },
  onsuccess: function availSpace_onsuccess(e) {
     log("  [" + this.label + "] = " + e.target.result);
  }
};

function Enumerate() {}
Enumerate.prototype = {
  init: function enumerate_init() {
    log("Enumerate for type '" + this.storageType + "'");
  },
  request: function enumerate_request() {
    log("Enumerate for type '" + this.storageType + "' " + this.label);
    this.fileCount = 0;
    return this.storage.enumerate();
  },
  onnext: function enumerate_next(e) {
     log("  " + e.target.result.name);
     this.fileCount += 1;
  },
  onnextdone: function enumerate_onnextdone() {
    if (this.fileCount == 0) {
      log("  *** No files found ***");
    }
  }
};

function EnumerateFileSizes() {}
EnumerateFileSizes.prototype = Object.create(Enumerate.prototype, {
  onnext: {
    value: function enum_fileSizes_next(e) {
      log("  " + e.target.result.name + " t:" + e.target.result.type + " s:" + e.target.result.size);
      this.fileCount += 1;
    },
    enumerable: true,
    configurable: true,
    writable: true
  }
});

function AddFile() {}
AddFile.prototype = {
  request: function addFile_request() {
    this.name = "test-" + this.label + ".txt";
    if (this.storageName != "") {
      this.name = "/" + this.storageName + "/" + this.name;
    }
    var now = new Date();
    this.dateStr = now.toString();
    var blob = new Blob([this.dateStr + "\n"], {type: "text/plain"});
    //log("Adding file '" + this.name + "' with contents '" + this.dateStr + "'");
    return this.storage.addNamed(blob, this.name);
  },
  onsuccess: function addFile_success(e) {
    //log("Added file '" + this.name + "' with contents '" + this.dateStr + "'");
    log("Added file '" + this.name + "' e.target.result = '" + e.target.result + "'");
  },
  onerror: function addFile_onerror(e) {
    log("Add file '" + this.name + "' failed");
    log("Reason: " + e.target.error.name + " (or " + translateError(e.target.error.name) + ")");
  }
};

function AddUnnamedFile() {}
AddUnnamedFile.prototype = {
  fileName: [],
  request: function addUnnamedFile_request() {
    this.name = "test-" + this.label + ".txt";
    if (this.storageName != "") {
      this.name = "/" + this.storageName + "/" + this.name;
    }
    var now = new Date();
    this.dateStr = now.toString();
    var blob = new Blob([this.dateStr + "\n"], {type: "text/plain"});
    log("Adding file to storage [" + this.label + "]");
    return this.storage.add(blob);
  },
  onsuccess: function addUnnamedFile_success(e) {
    log("  Added: '" + e.target.result + "'");
    this.fileName.push(e.target.result);
  },
  onerror: function addUnnamedFile_onerror(e) {
    log("  Add '" + e.target.result + "' failed");
    log("  Reason: " + e.target.error.name + " (or " + translateError(e.target.error.name) + ")");
  },
  done: function addUnnamedFile_done() {
    if (this.fileName.length == 0) {
      return;
    }
    var filename = this.fileName.shift();
    var req = gCompositeStorage.delete(filename);
    req.onsuccess = function(e) {
      log("Deleted " + e.target.result);
      this.done();
    }.bind(this);
    req.onerror = function(e) {
      log("Delete of " + e.target.result + " failed");
      log("Reason: " + e.target.error.name + " (or " + translateError(e.target.error.name) + ")");
    };
  }
};

function DelFile() {}
DelFile.prototype = {
  request: function delFile_request() {
    this.name = "test-" + this.label + ".txt";
    if (this.storageName != "") {
      this.name = "/" + this.storageName + "/" + this.name;
    }
    //log("Deleting file '" + this.name);
    return this.storage.delete(this.name);
  },
  onsuccess: function delFile_success(e) {
    log("Deleted file '" + this.name);
  },
  onerror: function delFile_onerror(e) {
    log("Delete file '" + this.name + "' failed");
    log("Reason: " + e.target.error.name + " (or " + translateError(e.target.error.name) + ")");
  }
};

function ShowFile() {}
ShowFile.prototype = {
  request: function showFile_request() {
    this.name = "test-" + this.label + ".txt";
    if (this.storageName != "") {
      this.name = "/" + this.storageName + "/" + this.name;
    }
    //log("Showing file '" + this.name);
    return this.storage.get(this.name);
  },
  onsuccess: function showFile_success(e) {
    log("Showing contents of: " + e.target.result.name);
    var reader = new FileReader();
    reader.readAsText(e.target.result);
    reader.onloadend = function (e) {
      log("  '" + e.target.result + "'");
    }.bind(this);
  },
  onerror: function showFile_onerror(e) {
    log("Show file '" + this.name + "' failed");
    log("Reason: " + e.target.error.name + " (or " + translateError(e.target.error.name) + ")");
  }
}

function ds_showStorages(storages) {
  log("Found " + storages.length + " storages");
  for (var i = 0; i < storages.length; i++) {
    var storage = storages[i];
    if (storage) {
      log("storage[" + i + "].storageName = " + storage.storageName);
    } else {
      log("storage[" + i + "] = null");
    }
  }
}

function ds_changeHandler(e) {
  switch (e.reason) {
    case 'created':
    case 'modified':
    case 'deleted':
      log("change: " + e.path + " was " + e.reason);
      break;
    default:
      log("change: " + e.reason);
      break;
  }
}

function ds_addListener() {
  if (gListening) {
    log("Already listening")
    return;
  }
  UpdateStorage();
  gCompositeStorage.addEventListener('change', ds_changeHandler);
  log("Listener added");
  gListening = true;
}

function ds_removeListener() {
  if (!gListening) {
    log("We weren't listening");
    return;
  }
  UpdateStorage();
  gCompositeStorage.removeEventListener('change', ds_changeHandler);
  log("Listener removed");
  gListening = false;
}

function ds_getDeviceStorage() {
  log("ds_getDeviceStorage");
  UpdateStorage();
  ds_showStorages([gCompositeStorage]);
}

function ds_getDeviceStorages() {
  log("ds_getDeviceStorages");
  UpdateStorage();
  ds_showStorages(gVolumeStorages);
}

var logElt;
function log(msg) {
  console.log(msg);
  if (!logElt) {
    logElt = document.getElementById("log");
  }
  msgStr = "" + msg;
  msg2 = msgStr.replace(/^\s+/, function(m){ return m.replace(/\s/g, '&nbsp;');});
  logElt.innerHTML += msg2 + "<br>";
}

function ds_doit() {
  try {
    var cmdElt = document.getElementById("ds.cmd");
    var cmdIdx = cmdElt.selectedIndex;
    var cmd = cmdElt.options[cmdIdx].value;

    switch (cmd) {
      case "getDeviceStorage":
        ds_getDeviceStorage();
        break;
      case "getDeviceStorages":
        if (gTestComposite) {
          ds_getDeviceStorages();
        } else {
          log("getDeviceStorages not supported");
        }
        break;
      case "free-space":
        report(new FreeSpace());
        break;
      case "used-space":
        report(new UsedSpace());
        break;
      case "available":
        report(new Available());
        break;
      case "enumerate":
        report(new Enumerate());
        break;
      case "enumerate-filesizes":
        report(new EnumerateFileSizes());
        break;
      case "add-unnamed-file":
        processFile(new AddUnnamedFile(), false);
        break;
      case "add-file":
        processFile(new AddFile());
        break;
      case "del-file":
        processFile(new DelFile());
        break;
      case "mod-file":
        log("mod-file not implemented yet");
        break;
      case "show-file":
        processFile(new ShowFile());
        break;
      case "add-listener":
        ds_addListener();
        break;
      case "remove-listener":
        ds_removeListener();
        break;
      case "test":
        //ds_test();
        ds_test_enumerate();
        //ds_test_dotdot();
        //ds_test_watch();
        //ds_test_823965();
        log("Done");
        break;
      default:
        log("Unrecognized command: '" + cmd + "'");
    }
  } catch (e) {
    log("doit: caught an error");
    log(e);
    log(e.stack);
  }
}

function ds_clearLog() {
  logElt.innerHTML = '';
}

window.onload = function() {
  log("Running");
  document.getElementById("doit").onclick = function() { ds_doit(); };
  document.getElementById("clear-log").onclick = function() { ds_clearLog(); };
};

function _logResult(test, passString, failString) {
    var isError = !test.result == !test.todo;
    var resultString = test.result ? passString : failString;
    var url = 'dummy-url';
    var diagnostic = test.name + (test.diag ? " - " + test.diag : "");
    var msg = [resultString, url, diagnostic].join(" | ");
    log(msg);
};

function ok(condition, name, diag) {
    var test = {'result': !!condition, 'name': name, 'diag': diag};
    _logResult(test, "TEST-PASS", "TEST-UNEXPECTED-FAIL");
};

function getRandomBuffer() {
  var size = 1024;
  var buffer = new ArrayBuffer(size);
  var view = new Uint8Array(buffer);
  for (var i = 0; i < size; i++) {
    view[i] = parseInt(Math.random() * 255);
  }
  return buffer;
}

function createRandomBlob(mime) {
  return blob = new Blob([getRandomBuffer()], {type: mime});
}

function randomFilename(l) {
  var set = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZ";
  var result = "";
  for (var i=0; i<l; i++) {
    var r = Math.floor(set.length * Math.random());
    result += set.substring(r, r + 1);
  }
  return result;
}

function ds_test() {
  ok(navigator.getDeviceStorage, "Should have getDeviceStorage");

  var storage;

  var throws = false;
  try {
   storage = navigator.getDeviceStorage();
  } catch(e) {throws = true}
  ok(throws, "getDeviceStorage takes one arg");

  storage = navigator.getDeviceStorage("");
  ok(!storage, "empty string - Should not have this type of storage");

  storage = navigator.getDeviceStorage("kilimanjaro");
  ok(!storage, "kilimanjaro - Should not have this type of storage");

  storage = navigator.getDeviceStorage("pictures");
  ok(storage, "pictures - Should have getDeviceStorage");

  storage = navigator.getDeviceStorage("music");
  ok(storage, "music - Should have getDeviceStorage");

  storage = navigator.getDeviceStorage("videos");
  ok(storage, "videos - Should have getDeviceStorage");

  var cursor = storage.enumerate();
  ok(cursor, "Should have a non-null cursor");
}

function ds_test_enumerate() {
  var files;

  function enumerateSuccess(e) {
    if (e.target.result == null) {
      ok(files.length == 0, "when the enumeration is done, we shouldn't have any files in this array")
      dump("We still have length = " + files.length + "\n");
      //devicestorage_cleanup();
      return;
    }
    
    var filename = e.target.result.name;
    // Remove storageName, and prefix which will show up on FirefoxOS platforms.
    if (filename[0] == "/") {
      // We got /storgaeName/prefix/filename (which FirefoxOS does)
      // Remove the storageName and prefix
      filename = filename.substring(1); // Remove leading slash
      var slashIndex = filename.indexOf("/");
      if (slashIndex >= 0) {
        filename = filename.substring(slashIndex + 1); // Remove storageName
      }
    }
    if (filename.startsWith(prefix)) {
      filename = filename.substring(prefix.length + 1); // Remove prefix
    }
    var index = files.indexOf(filename);

    //files.remove(index);
    files.splice(index,1);
    
    ok(index > -1, "filename should be in the enumeration : " + filename);

    // clean up
    var cleanup = storage.delete(e.target.result.name);
    cleanup.onsuccess = function(e) {}  // todo - can i remove this?

    e.target.continue();
  }

  function handleError(e) {
    ok(false, "handleError was called : " + e.target.error.name);
    //devicestorage_cleanup();
  }

  function addSuccess(e) {
    addedSoFar = addedSoFar + 1;
    if (addedSoFar == files.length) {

      var cursor = storage.enumerate(prefix);
      cursor.onsuccess = enumerateSuccess;
      cursor.onerror = handleError;
    }
  }

  function addError(e) {
    ok(false, "addError was called : " + e.target.error.name);
    //devicestorage_cleanup();
  }

  var storage = navigator.getDeviceStorage("pictures");
  ok(navigator.getDeviceStorage, "Should have getDeviceStorage");
  var prefix = "devicestorage/" + randomFilename(12) + ".png"

  files = [ "a.PNG", "b.pnG", "c.png", "d/a.png", "d/b.png", "d/c.png", "d/d.png", "The/quick/brown/fox/jumps/over/the/lazy/dog.png"]
  var addedSoFar = 0;


  for (var i=0; i<files.length; i++) {

   request = storage.addNamed(createRandomBlob('image/png'), prefix + '/' + files[i]);

   ok(request, "Should have a non-null request");
   request.onsuccess = addSuccess;
   request.onerror = addError;
  }
}

function ds_test_dotdot() {
  function testingStorage() {
    return navigator.getDeviceStorage("pictures");
  }

  var tests = [
    function () { dump("About to call addNamed\n"); return testingStorage().addNamed(createRandomBlob('image/png'), gFileName); },
    function () { return testingStorage().delete(gFileName); },
    function () { return testingStorage().get(gFileName); },
    function () { dump("About to call enumerate\n"); var r = testingStorage().enumerate("../"); return r; }
  ];

  var gFileName = "../owned.png";

  function fail(e) {
    ok(false, "addSuccess was called");
    dump(request);
    //devicestorage_cleanup();
  }

  function next(e) {

    if (e != undefined) {
      ok(true, "addError was called");  
      ok(e.target.error.name == "SecurityError", "Error must be SecurityError");
    }

    var f = tests.pop();

    if (f == undefined) {
      //devicestorage_cleanup();
      return;
    }

    request = f();
    request.onsuccess = fail;
    request.onerror = next;
  }

  dump("ds_test_dotdot\n");
  next();
}

function ds_test_watch() {
  var gFileName = randomFilename(20) + ".png"

  function addSuccess(e) {
    log("addSuccess");
  }

  function addError(e) {
    ok(false, "addError was called : " + e.target.error.name);
    //devicestorage_cleanup();
  }

  function onChange(e) {

    dump("we saw: " + e.path + " " + e.reason + "\n");

    if (e.path == gFileName) {
      ok(true, "we saw the file get created");
      storage.removeEventListener("change", onChange);
      //devicestorage_cleanup();
    }
    else {
      ok(e.path != "", "we shouldn't see an empty filename");
      // we may see other file changes during the test, and
      // that is completely ok
    }
  }

  var storage = navigator.getDeviceStorage("pictures");
  ok(storage, "Should have storage");
  storage.addEventListener("change", onChange);

  request = storage.addNamed(createRandomBlob('image/png'), gFileName);
  ok(request, "Should have a non-null request");

  request.onsuccess = addSuccess;
  request.onerror = addError;
}

function ds_test_823965() {
  var gFileName = "devicestorage/hi.png";
  var gData = "My name is Doug Turner (?!?).  My IRC nick is DougT.  I like Maple cookies."
  var gDataBlob = new Blob([gData], {type: 'image/png'});

  function getSuccess(e) {
    var storage = navigator.getDeviceStorage("pictures");
    ok(navigator.getDeviceStorage, "Should have getDeviceStorage");

    ok(e.target.result.name == gFileName, "File name should match");
    ok(e.target.result.size > 0, "File size be greater than zero");
    ok(e.target.result.type, "File should have a mime type");
    ok(e.target.result.lastModifiedDate, "File should have a last modified date");

    var mreq = storage.enumerate();
    mreq.onsuccess = function() {
      var storage2 = navigator.getDeviceStorage('music');
      var dreq = storage2.delete(mreq.result.name);
      dreq.onerror = function () {
        ok(true, "The bug has been fixed");
        //devicestorage_cleanup();
      };
      dreq.onsuccess = function () {
        ok(false, "The bug has been fixed");
        //devicestorage_cleanup();
      };
    };

    mreq.onerror = getError;
  }

  function getError(e) {
    ok(false, "getError was called : " + e.target.error.name);
    //devicestorage_cleanup();
  }

  function addSuccess(e) {

    ok(e.target.result == gFileName, "File name should match");

    var storage = navigator.getDeviceStorage("pictures");
    dump("About to call get on '" + gFileName + "'\n");
    request = storage.get(gFileName);
    request.onsuccess = getSuccess;
    request.onerror = getError;

    ok(true, "addSuccess was called");
  }

  function addError(e) {
    ok(false, "addError was called : " + e.target.error.name);
    //devicestorage_cleanup();
  }

  ok(navigator.getDeviceStorage, "Should have getDeviceStorage");

  var storage = navigator.getDeviceStorage("pictures");
  ok(storage, "Should have gotten a storage");

  request = storage.addNamed(gDataBlob, "devicestorage/hi.png");
  ok(request, "Should have a non-null request");

  request.onsuccess = addSuccess;
  request.onerror = addError;
}
