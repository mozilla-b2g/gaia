
var Module;
if (typeof Module === 'undefined') Module = eval('(function() { try { return Module || {} } catch(e) { return {} } })()');
if (!Module.expectedDataFileDownloads) {
  Module.expectedDataFileDownloads = 0;
  Module.finishedDataFileDownloads = 0;
}
Module.expectedDataFileDownloads++;
(function() {

    var PACKAGE_PATH;
    if (typeof window === 'object') {
      PACKAGE_PATH = window['encodeURIComponent'](window.location.pathname.toString().substring(0, window.location.pathname.toString().lastIndexOf('/')) + '/');
    } else {
      // worker
      PACKAGE_PATH = encodeURIComponent(location.pathname.toString().substring(0, location.pathname.toString().lastIndexOf('/')) + '/');
    }
    var PACKAGE_NAME = 'emscripten_zinnia.data';
    var REMOTE_PACKAGE_NAME = (Module['filePackagePrefixURL'] || '') + 'emscripten_zinnia.data';
    var REMOTE_PACKAGE_SIZE = 2768602;
    var PACKAGE_UUID = '20dcafe9-fa61-4d92-953c-b396eaa87926';
  
    function fetchRemotePackage(packageName, packageSize, callback, errback) {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', packageName, true);
      xhr.responseType = 'arraybuffer';
      xhr.onprogress = function(event) {
        var url = packageName;
        var size = packageSize;
        if (event.total) size = event.total;
        if (event.loaded) {
          if (!xhr.addedTotal) {
            xhr.addedTotal = true;
            if (!Module.dataFileDownloads) Module.dataFileDownloads = {};
            Module.dataFileDownloads[url] = {
              loaded: event.loaded,
              total: size
            };
          } else {
            Module.dataFileDownloads[url].loaded = event.loaded;
          }
          var total = 0;
          var loaded = 0;
          var num = 0;
          for (var download in Module.dataFileDownloads) {
          var data = Module.dataFileDownloads[download];
            total += data.total;
            loaded += data.loaded;
            num++;
          }
          total = Math.ceil(total * Module.expectedDataFileDownloads/num);
          if (Module['setStatus']) Module['setStatus']('Downloading data... (' + loaded + '/' + total + ')');
        } else if (!Module.dataFileDownloads) {
          if (Module['setStatus']) Module['setStatus']('Downloading data...');
        }
      };
      xhr.onload = function(event) {
        var packageData = xhr.response;
        callback(packageData);
      };
      xhr.send(null);
    };

    function handleError(error) {
      console.error('package error:', error);
    };
  
      var fetched = null, fetchedCallback = null;
      fetchRemotePackage(REMOTE_PACKAGE_NAME, REMOTE_PACKAGE_SIZE, function(data) {
        if (fetchedCallback) {
          fetchedCallback(data);
          fetchedCallback = null;
        } else {
          fetched = data;
        }
      }, handleError);
    
  function runWithFS() {

function assert(check, msg) {
  if (!check) throw msg + new Error().stack;
}

    function DataRequest(start, end, crunched, audio) {
      this.start = start;
      this.end = end;
      this.crunched = crunched;
      this.audio = audio;
    }
    DataRequest.prototype = {
      requests: {},
      open: function(mode, name) {
        this.name = name;
        this.requests[name] = this;
        Module['addRunDependency']('fp ' + this.name);
      },
      send: function() {},
      onload: function() {
        var byteArray = this.byteArray.subarray(this.start, this.end);

          this.finish(byteArray);

      },
      finish: function(byteArray) {
        var that = this;
        Module['FS_createPreloadedFile'](this.name, null, byteArray, true, true, function() {
          Module['removeRunDependency']('fp ' + that.name);
        }, function() {
          if (that.audio) {
            Module['removeRunDependency']('fp ' + that.name); // workaround for chromium bug 124926 (still no audio with this, but at least we don't hang)
          } else {
            Module.printErr('Preloading file ' + that.name + ' failed');
          }
        }, false, true); // canOwn this data in the filesystem, it is a slide into the heap that will never change
        this.requests[this.name] = null;
      },
    };
      new DataRequest(0, 771348, 0, 0).open('GET', '/zh_Hans.model');
    new DataRequest(771348, 1700160, 0, 0).open('GET', '/zh_Hant.model');
    new DataRequest(1700160, 2768602, 0, 0).open('GET', '/dict_pinyin.data');

    function processPackageData(arrayBuffer) {
      Module.finishedDataFileDownloads++;
      assert(arrayBuffer, 'Loading data file failed.');
      var byteArray = new Uint8Array(arrayBuffer);
      var curr;
      
      // copy the entire loaded file into a spot in the heap. Files will refer to slices in that. They cannot be freed though.
      var ptr = Module['_malloc'](byteArray.length);
      Module['HEAPU8'].set(byteArray, ptr);
      DataRequest.prototype.byteArray = Module['HEAPU8'].subarray(ptr, ptr+byteArray.length);
          DataRequest.prototype.requests["/zh_Hans.model"].onload();
          DataRequest.prototype.requests["/zh_Hant.model"].onload();
          DataRequest.prototype.requests["/dict_pinyin.data"].onload();
          Module['removeRunDependency']('datafile_emscripten_zinnia.data');

    };
    Module['addRunDependency']('datafile_emscripten_zinnia.data');
  
    if (!Module.preloadResults) Module.preloadResults = {};
  
      Module.preloadResults[PACKAGE_NAME] = {fromCache: false};
      if (fetched) {
        processPackageData(fetched);
        fetched = null;
      } else {
        fetchedCallback = processPackageData;
      }
    
  }
  if (Module['calledRun']) {
    runWithFS();
  } else {
    if (!Module['preRun']) Module['preRun'] = [];
    Module["preRun"].push(runWithFS); // FS is not initialized yet, wait for it
  }

})();

// The Module object: Our interface to the outside world. We import
// and export values on it, and do the work to get that through
// closure compiler if necessary. There are various ways Module can be used:
// 1. Not defined. We create it here
// 2. A function parameter, function(Module) { ..generated code.. }
// 3. pre-run appended it, var Module = {}; ..generated code..
// 4. External script tag defines var Module.
// We need to do an eval in order to handle the closure compiler
// case, where this code here is minified but Module was defined
// elsewhere (e.g. case 4 above). We also need to check if Module
// already exists (e.g. case 3 above).
// Note that if you want to run closure, and also to use Module
// after the generated code, you will need to define   var Module = {};
// before the code. Then that object will be used in the code, and you
// can continue to use Module afterwards as well.
var Module;
if (!Module) Module = (typeof Module !== 'undefined' ? Module : null) || {};

// Sometimes an existing Module object exists with properties
// meant to overwrite the default module functionality. Here
// we collect those properties and reapply _after_ we configure
// the current environment's defaults to avoid having to be so
// defensive during initialization.
var moduleOverrides = {};
for (var key in Module) {
  if (Module.hasOwnProperty(key)) {
    moduleOverrides[key] = Module[key];
  }
}

// The environment setup code below is customized to use Module.
// *** Environment setup code ***
var ENVIRONMENT_IS_NODE = typeof process === 'object' && typeof require === 'function';
var ENVIRONMENT_IS_WEB = typeof window === 'object';
var ENVIRONMENT_IS_WORKER = typeof importScripts === 'function';
var ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;

if (ENVIRONMENT_IS_NODE) {
  // Expose functionality in the same simple way that the shells work
  // Note that we pollute the global namespace here, otherwise we break in node
  if (!Module['print']) Module['print'] = function print(x) {
    process['stdout'].write(x + '\n');
  };
  if (!Module['printErr']) Module['printErr'] = function printErr(x) {
    process['stderr'].write(x + '\n');
  };

  var nodeFS = require('fs');
  var nodePath = require('path');

  Module['read'] = function read(filename, binary) {
    filename = nodePath['normalize'](filename);
    var ret = nodeFS['readFileSync'](filename);
    // The path is absolute if the normalized version is the same as the resolved.
    if (!ret && filename != nodePath['resolve'](filename)) {
      filename = path.join(__dirname, '..', 'src', filename);
      ret = nodeFS['readFileSync'](filename);
    }
    if (ret && !binary) ret = ret.toString();
    return ret;
  };

  Module['readBinary'] = function readBinary(filename) { return Module['read'](filename, true) };

  Module['load'] = function load(f) {
    globalEval(read(f));
  };

  Module['arguments'] = process['argv'].slice(2);

  module['exports'] = Module;
}
else if (ENVIRONMENT_IS_SHELL) {
  if (!Module['print']) Module['print'] = print;
  if (typeof printErr != 'undefined') Module['printErr'] = printErr; // not present in v8 or older sm

  if (typeof read != 'undefined') {
    Module['read'] = read;
  } else {
    Module['read'] = function read() { throw 'no read() available (jsc?)' };
  }

  Module['readBinary'] = function readBinary(f) {
    return read(f, 'binary');
  };

  if (typeof scriptArgs != 'undefined') {
    Module['arguments'] = scriptArgs;
  } else if (typeof arguments != 'undefined') {
    Module['arguments'] = arguments;
  }

  this['Module'] = Module;

  eval("if (typeof gc === 'function' && gc.toString().indexOf('[native code]') > 0) var gc = undefined"); // wipe out the SpiderMonkey shell 'gc' function, which can confuse closure (uses it as a minified name, and it is then initted to a non-falsey value unexpectedly)
}
else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
  Module['read'] = function read(url) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, false);
    xhr.send(null);
    return xhr.responseText;
  };

  if (typeof arguments != 'undefined') {
    Module['arguments'] = arguments;
  }

  if (typeof console !== 'undefined') {
    if (!Module['print']) Module['print'] = function print(x) {
      console.log(x);
    };
    if (!Module['printErr']) Module['printErr'] = function printErr(x) {
      console.log(x);
    };
  } else {
    // Probably a worker, and without console.log. We can do very little here...
    var TRY_USE_DUMP = false;
    if (!Module['print']) Module['print'] = (TRY_USE_DUMP && (typeof(dump) !== "undefined") ? (function(x) {
      dump(x);
    }) : (function(x) {
      // self.postMessage(x); // enable this if you want stdout to be sent as messages
    }));
  }

  if (ENVIRONMENT_IS_WEB) {
    window['Module'] = Module;
  } else {
    Module['load'] = importScripts;
  }
}
else {
  // Unreachable because SHELL is dependant on the others
  throw 'Unknown runtime environment. Where are we?';
}

function globalEval(x) {
  eval.call(null, x);
}
if (!Module['load'] == 'undefined' && Module['read']) {
  Module['load'] = function load(f) {
    globalEval(Module['read'](f));
  };
}
if (!Module['print']) {
  Module['print'] = function(){};
}
if (!Module['printErr']) {
  Module['printErr'] = Module['print'];
}
if (!Module['arguments']) {
  Module['arguments'] = [];
}
// *** Environment setup code ***

// Closure helpers
Module.print = Module['print'];
Module.printErr = Module['printErr'];

// Callbacks
Module['preRun'] = [];
Module['postRun'] = [];

// Merge back in the overrides
for (var key in moduleOverrides) {
  if (moduleOverrides.hasOwnProperty(key)) {
    Module[key] = moduleOverrides[key];
  }
}



// === Auto-generated preamble library stuff ===

//========================================
// Runtime code shared with compiler
//========================================

var Runtime = {
  stackSave: function () {
    return STACKTOP;
  },
  stackRestore: function (stackTop) {
    STACKTOP = stackTop;
  },
  forceAlign: function (target, quantum) {
    quantum = quantum || 4;
    if (quantum == 1) return target;
    if (isNumber(target) && isNumber(quantum)) {
      return Math.ceil(target/quantum)*quantum;
    } else if (isNumber(quantum) && isPowerOfTwo(quantum)) {
      return '(((' +target + ')+' + (quantum-1) + ')&' + -quantum + ')';
    }
    return 'Math.ceil((' + target + ')/' + quantum + ')*' + quantum;
  },
  isNumberType: function (type) {
    return type in Runtime.INT_TYPES || type in Runtime.FLOAT_TYPES;
  },
  isPointerType: function isPointerType(type) {
  return type[type.length-1] == '*';
},
  isStructType: function isStructType(type) {
  if (isPointerType(type)) return false;
  if (isArrayType(type)) return true;
  if (/<?\{ ?[^}]* ?\}>?/.test(type)) return true; // { i32, i8 } etc. - anonymous struct types
  // See comment in isStructPointerType()
  return type[0] == '%';
},
  INT_TYPES: {"i1":0,"i8":0,"i16":0,"i32":0,"i64":0},
  FLOAT_TYPES: {"float":0,"double":0},
  or64: function (x, y) {
    var l = (x | 0) | (y | 0);
    var h = (Math.round(x / 4294967296) | Math.round(y / 4294967296)) * 4294967296;
    return l + h;
  },
  and64: function (x, y) {
    var l = (x | 0) & (y | 0);
    var h = (Math.round(x / 4294967296) & Math.round(y / 4294967296)) * 4294967296;
    return l + h;
  },
  xor64: function (x, y) {
    var l = (x | 0) ^ (y | 0);
    var h = (Math.round(x / 4294967296) ^ Math.round(y / 4294967296)) * 4294967296;
    return l + h;
  },
  getNativeTypeSize: function (type) {
    switch (type) {
      case 'i1': case 'i8': return 1;
      case 'i16': return 2;
      case 'i32': return 4;
      case 'i64': return 8;
      case 'float': return 4;
      case 'double': return 8;
      default: {
        if (type[type.length-1] === '*') {
          return Runtime.QUANTUM_SIZE; // A pointer
        } else if (type[0] === 'i') {
          var bits = parseInt(type.substr(1));
          assert(bits % 8 === 0);
          return bits/8;
        } else {
          return 0;
        }
      }
    }
  },
  getNativeFieldSize: function (type) {
    return Math.max(Runtime.getNativeTypeSize(type), Runtime.QUANTUM_SIZE);
  },
  dedup: function dedup(items, ident) {
  var seen = {};
  if (ident) {
    return items.filter(function(item) {
      if (seen[item[ident]]) return false;
      seen[item[ident]] = true;
      return true;
    });
  } else {
    return items.filter(function(item) {
      if (seen[item]) return false;
      seen[item] = true;
      return true;
    });
  }
},
  set: function set() {
  var args = typeof arguments[0] === 'object' ? arguments[0] : arguments;
  var ret = {};
  for (var i = 0; i < args.length; i++) {
    ret[args[i]] = 0;
  }
  return ret;
},
  STACK_ALIGN: 8,
  getAlignSize: function (type, size, vararg) {
    // we align i64s and doubles on 64-bit boundaries, unlike x86
    if (!vararg && (type == 'i64' || type == 'double')) return 8;
    if (!type) return Math.min(size, 8); // align structures internally to 64 bits
    return Math.min(size || (type ? Runtime.getNativeFieldSize(type) : 0), Runtime.QUANTUM_SIZE);
  },
  calculateStructAlignment: function calculateStructAlignment(type) {
    type.flatSize = 0;
    type.alignSize = 0;
    var diffs = [];
    var prev = -1;
    var index = 0;
    type.flatIndexes = type.fields.map(function(field) {
      index++;
      var size, alignSize;
      if (Runtime.isNumberType(field) || Runtime.isPointerType(field)) {
        size = Runtime.getNativeTypeSize(field); // pack char; char; in structs, also char[X]s.
        alignSize = Runtime.getAlignSize(field, size);
      } else if (Runtime.isStructType(field)) {
        if (field[1] === '0') {
          // this is [0 x something]. When inside another structure like here, it must be at the end,
          // and it adds no size
          // XXX this happens in java-nbody for example... assert(index === type.fields.length, 'zero-length in the middle!');
          size = 0;
          if (Types.types[field]) {
            alignSize = Runtime.getAlignSize(null, Types.types[field].alignSize);
          } else {
            alignSize = type.alignSize || QUANTUM_SIZE;
          }
        } else {
          size = Types.types[field].flatSize;
          alignSize = Runtime.getAlignSize(null, Types.types[field].alignSize);
        }
      } else if (field[0] == 'b') {
        // bN, large number field, like a [N x i8]
        size = field.substr(1)|0;
        alignSize = 1;
      } else if (field[0] === '<') {
        // vector type
        size = alignSize = Types.types[field].flatSize; // fully aligned
      } else if (field[0] === 'i') {
        // illegal integer field, that could not be legalized because it is an internal structure field
        // it is ok to have such fields, if we just use them as markers of field size and nothing more complex
        size = alignSize = parseInt(field.substr(1))/8;
        assert(size % 1 === 0, 'cannot handle non-byte-size field ' + field);
      } else {
        assert(false, 'invalid type for calculateStructAlignment');
      }
      if (type.packed) alignSize = 1;
      type.alignSize = Math.max(type.alignSize, alignSize);
      var curr = Runtime.alignMemory(type.flatSize, alignSize); // if necessary, place this on aligned memory
      type.flatSize = curr + size;
      if (prev >= 0) {
        diffs.push(curr-prev);
      }
      prev = curr;
      return curr;
    });
    if (type.name_ && type.name_[0] === '[') {
      // arrays have 2 elements, so we get the proper difference. then we scale here. that way we avoid
      // allocating a potentially huge array for [999999 x i8] etc.
      type.flatSize = parseInt(type.name_.substr(1))*type.flatSize/2;
    }
    type.flatSize = Runtime.alignMemory(type.flatSize, type.alignSize);
    if (diffs.length == 0) {
      type.flatFactor = type.flatSize;
    } else if (Runtime.dedup(diffs).length == 1) {
      type.flatFactor = diffs[0];
    }
    type.needsFlattening = (type.flatFactor != 1);
    return type.flatIndexes;
  },
  generateStructInfo: function (struct, typeName, offset) {
    var type, alignment;
    if (typeName) {
      offset = offset || 0;
      type = (typeof Types === 'undefined' ? Runtime.typeInfo : Types.types)[typeName];
      if (!type) return null;
      if (type.fields.length != struct.length) {
        printErr('Number of named fields must match the type for ' + typeName + ': possibly duplicate struct names. Cannot return structInfo');
        return null;
      }
      alignment = type.flatIndexes;
    } else {
      var type = { fields: struct.map(function(item) { return item[0] }) };
      alignment = Runtime.calculateStructAlignment(type);
    }
    var ret = {
      __size__: type.flatSize
    };
    if (typeName) {
      struct.forEach(function(item, i) {
        if (typeof item === 'string') {
          ret[item] = alignment[i] + offset;
        } else {
          // embedded struct
          var key;
          for (var k in item) key = k;
          ret[key] = Runtime.generateStructInfo(item[key], type.fields[i], alignment[i]);
        }
      });
    } else {
      struct.forEach(function(item, i) {
        ret[item[1]] = alignment[i];
      });
    }
    return ret;
  },
  dynCall: function (sig, ptr, args) {
    if (args && args.length) {
      if (!args.splice) args = Array.prototype.slice.call(args);
      args.splice(0, 0, ptr);
      return Module['dynCall_' + sig].apply(null, args);
    } else {
      return Module['dynCall_' + sig].call(null, ptr);
    }
  },
  functionPointers: [],
  addFunction: function (func) {
    for (var i = 0; i < Runtime.functionPointers.length; i++) {
      if (!Runtime.functionPointers[i]) {
        Runtime.functionPointers[i] = func;
        return 2*(1 + i);
      }
    }
    throw 'Finished up all reserved function pointers. Use a higher value for RESERVED_FUNCTION_POINTERS.';
  },
  removeFunction: function (index) {
    Runtime.functionPointers[(index-2)/2] = null;
  },
  getAsmConst: function (code, numArgs) {
    // code is a constant string on the heap, so we can cache these
    if (!Runtime.asmConstCache) Runtime.asmConstCache = {};
    var func = Runtime.asmConstCache[code];
    if (func) return func;
    var args = [];
    for (var i = 0; i < numArgs; i++) {
      args.push(String.fromCharCode(36) + i); // $0, $1 etc
    }
    var source = Pointer_stringify(code);
    if (source[0] === '"') {
      // tolerate EM_ASM("..code..") even though EM_ASM(..code..) is correct
      if (source.indexOf('"', 1) === source.length-1) {
        source = source.substr(1, source.length-2);
      } else {
        // something invalid happened, e.g. EM_ASM("..code($0)..", input)
        abort('invalid EM_ASM input |' + source + '|. Please use EM_ASM(..code..) (no quotes) or EM_ASM({ ..code($0).. }, input) (to input values)');
      }
    }
    try {
      var evalled = eval('(function(' + args.join(',') + '){ ' + source + ' })'); // new Function does not allow upvars in node
    } catch(e) {
      Module.printErr('error in executing inline EM_ASM code: ' + e + ' on: \n\n' + source + '\n\nwith args |' + args + '| (make sure to use the right one out of EM_ASM, EM_ASM_ARGS, etc.)');
      throw e;
    }
    return Runtime.asmConstCache[code] = evalled;
  },
  warnOnce: function (text) {
    if (!Runtime.warnOnce.shown) Runtime.warnOnce.shown = {};
    if (!Runtime.warnOnce.shown[text]) {
      Runtime.warnOnce.shown[text] = 1;
      Module.printErr(text);
    }
  },
  funcWrappers: {},
  getFuncWrapper: function (func, sig) {
    assert(sig);
    if (!Runtime.funcWrappers[func]) {
      Runtime.funcWrappers[func] = function dynCall_wrapper() {
        return Runtime.dynCall(sig, func, arguments);
      };
    }
    return Runtime.funcWrappers[func];
  },
  UTF8Processor: function () {
    var buffer = [];
    var needed = 0;
    this.processCChar = function (code) {
      code = code & 0xFF;

      if (buffer.length == 0) {
        if ((code & 0x80) == 0x00) {        // 0xxxxxxx
          return String.fromCharCode(code);
        }
        buffer.push(code);
        if ((code & 0xE0) == 0xC0) {        // 110xxxxx
          needed = 1;
        } else if ((code & 0xF0) == 0xE0) { // 1110xxxx
          needed = 2;
        } else {                            // 11110xxx
          needed = 3;
        }
        return '';
      }

      if (needed) {
        buffer.push(code);
        needed--;
        if (needed > 0) return '';
      }

      var c1 = buffer[0];
      var c2 = buffer[1];
      var c3 = buffer[2];
      var c4 = buffer[3];
      var ret;
      if (buffer.length == 2) {
        ret = String.fromCharCode(((c1 & 0x1F) << 6)  | (c2 & 0x3F));
      } else if (buffer.length == 3) {
        ret = String.fromCharCode(((c1 & 0x0F) << 12) | ((c2 & 0x3F) << 6)  | (c3 & 0x3F));
      } else {
        // http://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
        var codePoint = ((c1 & 0x07) << 18) | ((c2 & 0x3F) << 12) |
                        ((c3 & 0x3F) << 6)  | (c4 & 0x3F);
        ret = String.fromCharCode(
          Math.floor((codePoint - 0x10000) / 0x400) + 0xD800,
          (codePoint - 0x10000) % 0x400 + 0xDC00);
      }
      buffer.length = 0;
      return ret;
    }
    this.processJSString = function processJSString(string) {
      /* TODO: use TextEncoder when present,
        var encoder = new TextEncoder();
        encoder['encoding'] = "utf-8";
        var utf8Array = encoder['encode'](aMsg.data);
      */
      string = unescape(encodeURIComponent(string));
      var ret = [];
      for (var i = 0; i < string.length; i++) {
        ret.push(string.charCodeAt(i));
      }
      return ret;
    }
  },
  getCompilerSetting: function (name) {
    throw 'You must build with -s RETAIN_COMPILER_SETTINGS=1 for Runtime.getCompilerSetting or emscripten_get_compiler_setting to work';
  },
  stackAlloc: function (size) { var ret = STACKTOP;STACKTOP = (STACKTOP + size)|0;STACKTOP = (((STACKTOP)+7)&-8); return ret; },
  staticAlloc: function (size) { var ret = STATICTOP;STATICTOP = (STATICTOP + size)|0;STATICTOP = (((STATICTOP)+7)&-8); return ret; },
  dynamicAlloc: function (size) { var ret = DYNAMICTOP;DYNAMICTOP = (DYNAMICTOP + size)|0;DYNAMICTOP = (((DYNAMICTOP)+7)&-8); if (DYNAMICTOP >= TOTAL_MEMORY) enlargeMemory();; return ret; },
  alignMemory: function (size,quantum) { var ret = size = Math.ceil((size)/(quantum ? quantum : 8))*(quantum ? quantum : 8); return ret; },
  makeBigInt: function (low,high,unsigned) { var ret = (unsigned ? ((+((low>>>0)))+((+((high>>>0)))*(+4294967296))) : ((+((low>>>0)))+((+((high|0)))*(+4294967296)))); return ret; },
  GLOBAL_BASE: 8,
  QUANTUM_SIZE: 4,
  __dummy__: 0
}


Module['Runtime'] = Runtime;









//========================================
// Runtime essentials
//========================================

var __THREW__ = 0; // Used in checking for thrown exceptions.

var ABORT = false; // whether we are quitting the application. no code should run after this. set in exit() and abort()
var EXITSTATUS = 0;

var undef = 0;
// tempInt is used for 32-bit signed values or smaller. tempBigInt is used
// for 32-bit unsigned values or more than 32 bits. TODO: audit all uses of tempInt
var tempValue, tempInt, tempBigInt, tempInt2, tempBigInt2, tempPair, tempBigIntI, tempBigIntR, tempBigIntS, tempBigIntP, tempBigIntD, tempDouble, tempFloat;
var tempI64, tempI64b;
var tempRet0, tempRet1, tempRet2, tempRet3, tempRet4, tempRet5, tempRet6, tempRet7, tempRet8, tempRet9;

function assert(condition, text) {
  if (!condition) {
    abort('Assertion failed: ' + text);
  }
}

var globalScope = this;

// C calling interface. A convenient way to call C functions (in C files, or
// defined with extern "C").
//
// Note: LLVM optimizations can inline and remove functions, after which you will not be
//       able to call them. Closure can also do so. To avoid that, add your function to
//       the exports using something like
//
//         -s EXPORTED_FUNCTIONS='["_main", "_myfunc"]'
//
// @param ident      The name of the C function (note that C++ functions will be name-mangled - use extern "C")
// @param returnType The return type of the function, one of the JS types 'number', 'string' or 'array' (use 'number' for any C pointer, and
//                   'array' for JavaScript arrays and typed arrays; note that arrays are 8-bit).
// @param argTypes   An array of the types of arguments for the function (if there are no arguments, this can be ommitted). Types are as in returnType,
//                   except that 'array' is not possible (there is no way for us to know the length of the array)
// @param args       An array of the arguments to the function, as native JS values (as in returnType)
//                   Note that string arguments will be stored on the stack (the JS string will become a C string on the stack).
// @return           The return value, as a native JS value (as in returnType)
function ccall(ident, returnType, argTypes, args) {
  return ccallFunc(getCFunc(ident), returnType, argTypes, args);
}
Module["ccall"] = ccall;

// Returns the C function with a specified identifier (for C++, you need to do manual name mangling)
function getCFunc(ident) {
  try {
    var func = Module['_' + ident]; // closure exported function
    if (!func) func = eval('_' + ident); // explicit lookup
  } catch(e) {
  }
  assert(func, 'Cannot call unknown function ' + ident + ' (perhaps LLVM optimizations or closure removed it?)');
  return func;
}

// Internal function that does a C call using a function, not an identifier
function ccallFunc(func, returnType, argTypes, args) {
  var stack = 0;
  function toC(value, type) {
    if (type == 'string') {
      if (value === null || value === undefined || value === 0) return 0; // null string
      value = intArrayFromString(value);
      type = 'array';
    }
    if (type == 'array') {
      if (!stack) stack = Runtime.stackSave();
      var ret = Runtime.stackAlloc(value.length);
      writeArrayToMemory(value, ret);
      return ret;
    }
    return value;
  }
  function fromC(value, type) {
    if (type == 'string') {
      return Pointer_stringify(value);
    }
    assert(type != 'array');
    return value;
  }
  var i = 0;
  var cArgs = args ? args.map(function(arg) {
    return toC(arg, argTypes[i++]);
  }) : [];
  var ret = fromC(func.apply(null, cArgs), returnType);
  if (stack) Runtime.stackRestore(stack);
  return ret;
}

// Returns a native JS wrapper for a C function. This is similar to ccall, but
// returns a function you can call repeatedly in a normal way. For example:
//
//   var my_function = cwrap('my_c_function', 'number', ['number', 'number']);
//   alert(my_function(5, 22));
//   alert(my_function(99, 12));
//
function cwrap(ident, returnType, argTypes) {
  var func = getCFunc(ident);
  return function() {
    return ccallFunc(func, returnType, argTypes, Array.prototype.slice.call(arguments));
  }
}
Module["cwrap"] = cwrap;

// Sets a value in memory in a dynamic way at run-time. Uses the
// type data. This is the same as makeSetValue, except that
// makeSetValue is done at compile-time and generates the needed
// code then, whereas this function picks the right code at
// run-time.
// Note that setValue and getValue only do *aligned* writes and reads!
// Note that ccall uses JS types as for defining types, while setValue and
// getValue need LLVM types ('i8', 'i32') - this is a lower-level operation
function setValue(ptr, value, type, noSafe) {
  type = type || 'i8';
  if (type.charAt(type.length-1) === '*') type = 'i32'; // pointers are 32-bit
    switch(type) {
      case 'i1': HEAP8[(ptr)]=value; break;
      case 'i8': HEAP8[(ptr)]=value; break;
      case 'i16': HEAP16[((ptr)>>1)]=value; break;
      case 'i32': HEAP32[((ptr)>>2)]=value; break;
      case 'i64': (tempI64 = [value>>>0,(tempDouble=value,(+(Math_abs(tempDouble))) >= (+1) ? (tempDouble > (+0) ? ((Math_min((+(Math_floor((tempDouble)/(+4294967296)))), (+4294967295)))|0)>>>0 : (~~((+(Math_ceil((tempDouble - +(((~~(tempDouble)))>>>0))/(+4294967296))))))>>>0) : 0)],HEAP32[((ptr)>>2)]=tempI64[0],HEAP32[(((ptr)+(4))>>2)]=tempI64[1]); break;
      case 'float': HEAPF32[((ptr)>>2)]=value; break;
      case 'double': HEAPF64[((ptr)>>3)]=value; break;
      default: abort('invalid type for setValue: ' + type);
    }
}
Module['setValue'] = setValue;

// Parallel to setValue.
function getValue(ptr, type, noSafe) {
  type = type || 'i8';
  if (type.charAt(type.length-1) === '*') type = 'i32'; // pointers are 32-bit
    switch(type) {
      case 'i1': return HEAP8[(ptr)];
      case 'i8': return HEAP8[(ptr)];
      case 'i16': return HEAP16[((ptr)>>1)];
      case 'i32': return HEAP32[((ptr)>>2)];
      case 'i64': return HEAP32[((ptr)>>2)];
      case 'float': return HEAPF32[((ptr)>>2)];
      case 'double': return HEAPF64[((ptr)>>3)];
      default: abort('invalid type for setValue: ' + type);
    }
  return null;
}
Module['getValue'] = getValue;

var ALLOC_NORMAL = 0; // Tries to use _malloc()
var ALLOC_STACK = 1; // Lives for the duration of the current function call
var ALLOC_STATIC = 2; // Cannot be freed
var ALLOC_DYNAMIC = 3; // Cannot be freed except through sbrk
var ALLOC_NONE = 4; // Do not allocate
Module['ALLOC_NORMAL'] = ALLOC_NORMAL;
Module['ALLOC_STACK'] = ALLOC_STACK;
Module['ALLOC_STATIC'] = ALLOC_STATIC;
Module['ALLOC_DYNAMIC'] = ALLOC_DYNAMIC;
Module['ALLOC_NONE'] = ALLOC_NONE;

// allocate(): This is for internal use. You can use it yourself as well, but the interface
//             is a little tricky (see docs right below). The reason is that it is optimized
//             for multiple syntaxes to save space in generated code. So you should
//             normally not use allocate(), and instead allocate memory using _malloc(),
//             initialize it with setValue(), and so forth.
// @slab: An array of data, or a number. If a number, then the size of the block to allocate,
//        in *bytes* (note that this is sometimes confusing: the next parameter does not
//        affect this!)
// @types: Either an array of types, one for each byte (or 0 if no type at that position),
//         or a single type which is used for the entire block. This only matters if there
//         is initial data - if @slab is a number, then this does not matter at all and is
//         ignored.
// @allocator: How to allocate memory, see ALLOC_*
function allocate(slab, types, allocator, ptr) {
  var zeroinit, size;
  if (typeof slab === 'number') {
    zeroinit = true;
    size = slab;
  } else {
    zeroinit = false;
    size = slab.length;
  }

  var singleType = typeof types === 'string' ? types : null;

  var ret;
  if (allocator == ALLOC_NONE) {
    ret = ptr;
  } else {
    ret = [_malloc, Runtime.stackAlloc, Runtime.staticAlloc, Runtime.dynamicAlloc][allocator === undefined ? ALLOC_STATIC : allocator](Math.max(size, singleType ? 1 : types.length));
  }

  if (zeroinit) {
    var ptr = ret, stop;
    assert((ret & 3) == 0);
    stop = ret + (size & ~3);
    for (; ptr < stop; ptr += 4) {
      HEAP32[((ptr)>>2)]=0;
    }
    stop = ret + size;
    while (ptr < stop) {
      HEAP8[((ptr++)|0)]=0;
    }
    return ret;
  }

  if (singleType === 'i8') {
    if (slab.subarray || slab.slice) {
      HEAPU8.set(slab, ret);
    } else {
      HEAPU8.set(new Uint8Array(slab), ret);
    }
    return ret;
  }

  var i = 0, type, typeSize, previousType;
  while (i < size) {
    var curr = slab[i];

    if (typeof curr === 'function') {
      curr = Runtime.getFunctionIndex(curr);
    }

    type = singleType || types[i];
    if (type === 0) {
      i++;
      continue;
    }

    if (type == 'i64') type = 'i32'; // special case: we have one i32 here, and one i32 later

    setValue(ret+i, curr, type);

    // no need to look up size unless type changes, so cache it
    if (previousType !== type) {
      typeSize = Runtime.getNativeTypeSize(type);
      previousType = type;
    }
    i += typeSize;
  }

  return ret;
}
Module['allocate'] = allocate;

function Pointer_stringify(ptr, /* optional */ length) {
  // TODO: use TextDecoder
  // Find the length, and check for UTF while doing so
  var hasUtf = false;
  var t;
  var i = 0;
  while (1) {
    t = HEAPU8[(((ptr)+(i))|0)];
    if (t >= 128) hasUtf = true;
    else if (t == 0 && !length) break;
    i++;
    if (length && i == length) break;
  }
  if (!length) length = i;

  var ret = '';

  if (!hasUtf) {
    var MAX_CHUNK = 1024; // split up into chunks, because .apply on a huge string can overflow the stack
    var curr;
    while (length > 0) {
      curr = String.fromCharCode.apply(String, HEAPU8.subarray(ptr, ptr + Math.min(length, MAX_CHUNK)));
      ret = ret ? ret + curr : curr;
      ptr += MAX_CHUNK;
      length -= MAX_CHUNK;
    }
    return ret;
  }

  var utf8 = new Runtime.UTF8Processor();
  for (i = 0; i < length; i++) {
    t = HEAPU8[(((ptr)+(i))|0)];
    ret += utf8.processCChar(t);
  }
  return ret;
}
Module['Pointer_stringify'] = Pointer_stringify;

// Given a pointer 'ptr' to a null-terminated UTF16LE-encoded string in the emscripten HEAP, returns
// a copy of that string as a Javascript String object.
function UTF16ToString(ptr) {
  var i = 0;

  var str = '';
  while (1) {
    var codeUnit = HEAP16[(((ptr)+(i*2))>>1)];
    if (codeUnit == 0)
      return str;
    ++i;
    // fromCharCode constructs a character from a UTF-16 code unit, so we can pass the UTF16 string right through.
    str += String.fromCharCode(codeUnit);
  }
}
Module['UTF16ToString'] = UTF16ToString;

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in UTF16LE form. The copy will require at most (str.length*2+1)*2 bytes of space in the HEAP.
function stringToUTF16(str, outPtr) {
  for(var i = 0; i < str.length; ++i) {
    // charCodeAt returns a UTF-16 encoded code unit, so it can be directly written to the HEAP.
    var codeUnit = str.charCodeAt(i); // possibly a lead surrogate
    HEAP16[(((outPtr)+(i*2))>>1)]=codeUnit;
  }
  // Null-terminate the pointer to the HEAP.
  HEAP16[(((outPtr)+(str.length*2))>>1)]=0;
}
Module['stringToUTF16'] = stringToUTF16;

// Given a pointer 'ptr' to a null-terminated UTF32LE-encoded string in the emscripten HEAP, returns
// a copy of that string as a Javascript String object.
function UTF32ToString(ptr) {
  var i = 0;

  var str = '';
  while (1) {
    var utf32 = HEAP32[(((ptr)+(i*4))>>2)];
    if (utf32 == 0)
      return str;
    ++i;
    // Gotcha: fromCharCode constructs a character from a UTF-16 encoded code (pair), not from a Unicode code point! So encode the code point to UTF-16 for constructing.
    if (utf32 >= 0x10000) {
      var ch = utf32 - 0x10000;
      str += String.fromCharCode(0xD800 | (ch >> 10), 0xDC00 | (ch & 0x3FF));
    } else {
      str += String.fromCharCode(utf32);
    }
  }
}
Module['UTF32ToString'] = UTF32ToString;

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in UTF32LE form. The copy will require at most (str.length+1)*4 bytes of space in the HEAP,
// but can use less, since str.length does not return the number of characters in the string, but the number of UTF-16 code units in the string.
function stringToUTF32(str, outPtr) {
  var iChar = 0;
  for(var iCodeUnit = 0; iCodeUnit < str.length; ++iCodeUnit) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! We must decode the string to UTF-32 to the heap.
    var codeUnit = str.charCodeAt(iCodeUnit); // possibly a lead surrogate
    if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) {
      var trailSurrogate = str.charCodeAt(++iCodeUnit);
      codeUnit = 0x10000 + ((codeUnit & 0x3FF) << 10) | (trailSurrogate & 0x3FF);
    }
    HEAP32[(((outPtr)+(iChar*4))>>2)]=codeUnit;
    ++iChar;
  }
  // Null-terminate the pointer to the HEAP.
  HEAP32[(((outPtr)+(iChar*4))>>2)]=0;
}
Module['stringToUTF32'] = stringToUTF32;

function demangle(func) {
  var i = 3;
  // params, etc.
  var basicTypes = {
    'v': 'void',
    'b': 'bool',
    'c': 'char',
    's': 'short',
    'i': 'int',
    'l': 'long',
    'f': 'float',
    'd': 'double',
    'w': 'wchar_t',
    'a': 'signed char',
    'h': 'unsigned char',
    't': 'unsigned short',
    'j': 'unsigned int',
    'm': 'unsigned long',
    'x': 'long long',
    'y': 'unsigned long long',
    'z': '...'
  };
  var subs = [];
  var first = true;
  function dump(x) {
    //return;
    if (x) Module.print(x);
    Module.print(func);
    var pre = '';
    for (var a = 0; a < i; a++) pre += ' ';
    Module.print (pre + '^');
  }
  function parseNested() {
    i++;
    if (func[i] === 'K') i++; // ignore const
    var parts = [];
    while (func[i] !== 'E') {
      if (func[i] === 'S') { // substitution
        i++;
        var next = func.indexOf('_', i);
        var num = func.substring(i, next) || 0;
        parts.push(subs[num] || '?');
        i = next+1;
        continue;
      }
      if (func[i] === 'C') { // constructor
        parts.push(parts[parts.length-1]);
        i += 2;
        continue;
      }
      var size = parseInt(func.substr(i));
      var pre = size.toString().length;
      if (!size || !pre) { i--; break; } // counter i++ below us
      var curr = func.substr(i + pre, size);
      parts.push(curr);
      subs.push(curr);
      i += pre + size;
    }
    i++; // skip E
    return parts;
  }
  function parse(rawList, limit, allowVoid) { // main parser
    limit = limit || Infinity;
    var ret = '', list = [];
    function flushList() {
      return '(' + list.join(', ') + ')';
    }
    var name;
    if (func[i] === 'N') {
      // namespaced N-E
      name = parseNested().join('::');
      limit--;
      if (limit === 0) return rawList ? [name] : name;
    } else {
      // not namespaced
      if (func[i] === 'K' || (first && func[i] === 'L')) i++; // ignore const and first 'L'
      var size = parseInt(func.substr(i));
      if (size) {
        var pre = size.toString().length;
        name = func.substr(i + pre, size);
        i += pre + size;
      }
    }
    first = false;
    if (func[i] === 'I') {
      i++;
      var iList = parse(true);
      var iRet = parse(true, 1, true);
      ret += iRet[0] + ' ' + name + '<' + iList.join(', ') + '>';
    } else {
      ret = name;
    }
    paramLoop: while (i < func.length && limit-- > 0) {
      //dump('paramLoop');
      var c = func[i++];
      if (c in basicTypes) {
        list.push(basicTypes[c]);
      } else {
        switch (c) {
          case 'P': list.push(parse(true, 1, true)[0] + '*'); break; // pointer
          case 'R': list.push(parse(true, 1, true)[0] + '&'); break; // reference
          case 'L': { // literal
            i++; // skip basic type
            var end = func.indexOf('E', i);
            var size = end - i;
            list.push(func.substr(i, size));
            i += size + 2; // size + 'EE'
            break;
          }
          case 'A': { // array
            var size = parseInt(func.substr(i));
            i += size.toString().length;
            if (func[i] !== '_') throw '?';
            i++; // skip _
            list.push(parse(true, 1, true)[0] + ' [' + size + ']');
            break;
          }
          case 'E': break paramLoop;
          default: ret += '?' + c; break paramLoop;
        }
      }
    }
    if (!allowVoid && list.length === 1 && list[0] === 'void') list = []; // avoid (void)
    if (rawList) {
      if (ret) {
        list.push(ret + '?');
      }
      return list;
    } else {
      return ret + flushList();
    }
  }
  try {
    // Special-case the entry point, since its name differs from other name mangling.
    if (func == 'Object._main' || func == '_main') {
      return 'main()';
    }
    if (typeof func === 'number') func = Pointer_stringify(func);
    if (func[0] !== '_') return func;
    if (func[1] !== '_') return func; // C function
    if (func[2] !== 'Z') return func;
    switch (func[3]) {
      case 'n': return 'operator new()';
      case 'd': return 'operator delete()';
    }
    return parse();
  } catch(e) {
    return func;
  }
}

function demangleAll(text) {
  return text.replace(/__Z[\w\d_]+/g, function(x) { var y = demangle(x); return x === y ? x : (x + ' [' + y + ']') });
}

function stackTrace() {
  var stack = new Error().stack;
  return stack ? demangleAll(stack) : '(no stack trace available)'; // Stack trace is not available at least on IE10 and Safari 6.
}

// Memory management

var PAGE_SIZE = 4096;
function alignMemoryPage(x) {
  return (x+4095)&-4096;
}

var HEAP;
var HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;

var STATIC_BASE = 0, STATICTOP = 0, staticSealed = false; // static area
var STACK_BASE = 0, STACKTOP = 0, STACK_MAX = 0; // stack area
var DYNAMIC_BASE = 0, DYNAMICTOP = 0; // dynamic area handled by sbrk

function enlargeMemory() {
  abort('Cannot enlarge memory arrays. Either (1) compile with -s TOTAL_MEMORY=X with X higher than the current value ' + TOTAL_MEMORY + ', (2) compile with ALLOW_MEMORY_GROWTH which adjusts the size at runtime but prevents some optimizations, or (3) set Module.TOTAL_MEMORY before the program runs.');
}

var TOTAL_STACK = Module['TOTAL_STACK'] || 5242880;
var TOTAL_MEMORY = Module['TOTAL_MEMORY'] || 16777216;
var FAST_MEMORY = Module['FAST_MEMORY'] || 2097152;

var totalMemory = 4096;
while (totalMemory < TOTAL_MEMORY || totalMemory < 2*TOTAL_STACK) {
  if (totalMemory < 16*1024*1024) {
    totalMemory *= 2;
  } else {
    totalMemory += 16*1024*1024
  }
}
if (totalMemory !== TOTAL_MEMORY) {
  Module.printErr('increasing TOTAL_MEMORY to ' + totalMemory + ' to be more reasonable');
  TOTAL_MEMORY = totalMemory;
}

// Initialize the runtime's memory
// check for full engine support (use string 'subarray' to avoid closure compiler confusion)
assert(typeof Int32Array !== 'undefined' && typeof Float64Array !== 'undefined' && !!(new Int32Array(1)['subarray']) && !!(new Int32Array(1)['set']),
       'JS engine does not provide full typed array support');

var buffer = new ArrayBuffer(TOTAL_MEMORY);
HEAP8 = new Int8Array(buffer);
HEAP16 = new Int16Array(buffer);
HEAP32 = new Int32Array(buffer);
HEAPU8 = new Uint8Array(buffer);
HEAPU16 = new Uint16Array(buffer);
HEAPU32 = new Uint32Array(buffer);
HEAPF32 = new Float32Array(buffer);
HEAPF64 = new Float64Array(buffer);

// Endianness check (note: assumes compiler arch was little-endian)
HEAP32[0] = 255;
assert(HEAPU8[0] === 255 && HEAPU8[3] === 0, 'Typed arrays 2 must be run on a little-endian system');

Module['HEAP'] = HEAP;
Module['HEAP8'] = HEAP8;
Module['HEAP16'] = HEAP16;
Module['HEAP32'] = HEAP32;
Module['HEAPU8'] = HEAPU8;
Module['HEAPU16'] = HEAPU16;
Module['HEAPU32'] = HEAPU32;
Module['HEAPF32'] = HEAPF32;
Module['HEAPF64'] = HEAPF64;

function callRuntimeCallbacks(callbacks) {
  while(callbacks.length > 0) {
    var callback = callbacks.shift();
    if (typeof callback == 'function') {
      callback();
      continue;
    }
    var func = callback.func;
    if (typeof func === 'number') {
      if (callback.arg === undefined) {
        Runtime.dynCall('v', func);
      } else {
        Runtime.dynCall('vi', func, [callback.arg]);
      }
    } else {
      func(callback.arg === undefined ? null : callback.arg);
    }
  }
}

var __ATPRERUN__  = []; // functions called before the runtime is initialized
var __ATINIT__    = []; // functions called during startup
var __ATMAIN__    = []; // functions called when main() is to be run
var __ATEXIT__    = []; // functions called during shutdown
var __ATPOSTRUN__ = []; // functions called after the runtime has exited

var runtimeInitialized = false;

function preRun() {
  // compatibility - merge in anything from Module['preRun'] at this time
  if (Module['preRun']) {
    if (typeof Module['preRun'] == 'function') Module['preRun'] = [Module['preRun']];
    while (Module['preRun'].length) {
      addOnPreRun(Module['preRun'].shift());
    }
  }
  callRuntimeCallbacks(__ATPRERUN__);
}

function ensureInitRuntime() {
  if (runtimeInitialized) return;
  runtimeInitialized = true;
  callRuntimeCallbacks(__ATINIT__);
}

function preMain() {
  callRuntimeCallbacks(__ATMAIN__);
}

function exitRuntime() {
  callRuntimeCallbacks(__ATEXIT__);
}

function postRun() {
  // compatibility - merge in anything from Module['postRun'] at this time
  if (Module['postRun']) {
    if (typeof Module['postRun'] == 'function') Module['postRun'] = [Module['postRun']];
    while (Module['postRun'].length) {
      addOnPostRun(Module['postRun'].shift());
    }
  }
  callRuntimeCallbacks(__ATPOSTRUN__);
}

function addOnPreRun(cb) {
  __ATPRERUN__.unshift(cb);
}
Module['addOnPreRun'] = Module.addOnPreRun = addOnPreRun;

function addOnInit(cb) {
  __ATINIT__.unshift(cb);
}
Module['addOnInit'] = Module.addOnInit = addOnInit;

function addOnPreMain(cb) {
  __ATMAIN__.unshift(cb);
}
Module['addOnPreMain'] = Module.addOnPreMain = addOnPreMain;

function addOnExit(cb) {
  __ATEXIT__.unshift(cb);
}
Module['addOnExit'] = Module.addOnExit = addOnExit;

function addOnPostRun(cb) {
  __ATPOSTRUN__.unshift(cb);
}
Module['addOnPostRun'] = Module.addOnPostRun = addOnPostRun;

// Tools

// This processes a JS string into a C-line array of numbers, 0-terminated.
// For LLVM-originating strings, see parser.js:parseLLVMString function
function intArrayFromString(stringy, dontAddNull, length /* optional */) {
  var ret = (new Runtime.UTF8Processor()).processJSString(stringy);
  if (length) {
    ret.length = length;
  }
  if (!dontAddNull) {
    ret.push(0);
  }
  return ret;
}
Module['intArrayFromString'] = intArrayFromString;

function intArrayToString(array) {
  var ret = [];
  for (var i = 0; i < array.length; i++) {
    var chr = array[i];
    if (chr > 0xFF) {
      chr &= 0xFF;
    }
    ret.push(String.fromCharCode(chr));
  }
  return ret.join('');
}
Module['intArrayToString'] = intArrayToString;

// Write a Javascript array to somewhere in the heap
function writeStringToMemory(string, buffer, dontAddNull) {
  var array = intArrayFromString(string, dontAddNull);
  var i = 0;
  while (i < array.length) {
    var chr = array[i];
    HEAP8[(((buffer)+(i))|0)]=chr;
    i = i + 1;
  }
}
Module['writeStringToMemory'] = writeStringToMemory;

function writeArrayToMemory(array, buffer) {
  for (var i = 0; i < array.length; i++) {
    HEAP8[(((buffer)+(i))|0)]=array[i];
  }
}
Module['writeArrayToMemory'] = writeArrayToMemory;

function writeAsciiToMemory(str, buffer, dontAddNull) {
  for (var i = 0; i < str.length; i++) {
    HEAP8[(((buffer)+(i))|0)]=str.charCodeAt(i);
  }
  if (!dontAddNull) HEAP8[(((buffer)+(str.length))|0)]=0;
}
Module['writeAsciiToMemory'] = writeAsciiToMemory;

function unSign(value, bits, ignore) {
  if (value >= 0) {
    return value;
  }
  return bits <= 32 ? 2*Math.abs(1 << (bits-1)) + value // Need some trickery, since if bits == 32, we are right at the limit of the bits JS uses in bitshifts
                    : Math.pow(2, bits)         + value;
}
function reSign(value, bits, ignore) {
  if (value <= 0) {
    return value;
  }
  var half = bits <= 32 ? Math.abs(1 << (bits-1)) // abs is needed if bits == 32
                        : Math.pow(2, bits-1);
  if (value >= half && (bits <= 32 || value > half)) { // for huge values, we can hit the precision limit and always get true here. so don't do that
                                                       // but, in general there is no perfect solution here. With 64-bit ints, we get rounding and errors
                                                       // TODO: In i64 mode 1, resign the two parts separately and safely
    value = -2*half + value; // Cannot bitshift half, as it may be at the limit of the bits JS uses in bitshifts
  }
  return value;
}

// check for imul support, and also for correctness ( https://bugs.webkit.org/show_bug.cgi?id=126345 )
if (!Math['imul'] || Math['imul'](0xffffffff, 5) !== -5) Math['imul'] = function imul(a, b) {
  var ah  = a >>> 16;
  var al = a & 0xffff;
  var bh  = b >>> 16;
  var bl = b & 0xffff;
  return (al*bl + ((ah*bl + al*bh) << 16))|0;
};
Math.imul = Math['imul'];


var Math_abs = Math.abs;
var Math_cos = Math.cos;
var Math_sin = Math.sin;
var Math_tan = Math.tan;
var Math_acos = Math.acos;
var Math_asin = Math.asin;
var Math_atan = Math.atan;
var Math_atan2 = Math.atan2;
var Math_exp = Math.exp;
var Math_log = Math.log;
var Math_sqrt = Math.sqrt;
var Math_ceil = Math.ceil;
var Math_floor = Math.floor;
var Math_pow = Math.pow;
var Math_imul = Math.imul;
var Math_fround = Math.fround;
var Math_min = Math.min;

// A counter of dependencies for calling run(). If we need to
// do asynchronous work before running, increment this and
// decrement it. Incrementing must happen in a place like
// PRE_RUN_ADDITIONS (used by emcc to add file preloading).
// Note that you can add dependencies in preRun, even though
// it happens right before run - run will be postponed until
// the dependencies are met.
var runDependencies = 0;
var runDependencyWatcher = null;
var dependenciesFulfilled = null; // overridden to take different actions when all run dependencies are fulfilled

function addRunDependency(id) {
  runDependencies++;
  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }
}
Module['addRunDependency'] = addRunDependency;
function removeRunDependency(id) {
  runDependencies--;
  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }
  if (runDependencies == 0) {
    if (runDependencyWatcher !== null) {
      clearInterval(runDependencyWatcher);
      runDependencyWatcher = null;
    }
    if (dependenciesFulfilled) {
      var callback = dependenciesFulfilled;
      dependenciesFulfilled = null;
      callback(); // can add another dependenciesFulfilled
    }
  }
}
Module['removeRunDependency'] = removeRunDependency;

Module["preloadedImages"] = {}; // maps url to image data
Module["preloadedAudios"] = {}; // maps url to audio data


var memoryInitializer = null;

// === Body ===
var __ZTVN10__cxxabiv117__class_type_infoE = 20024;
var __ZTVN10__cxxabiv120__si_class_type_infoE = 20064;




STATIC_BASE = 8;

STATICTOP = STATIC_BASE + Runtime.alignMemory(20891);
/* global initializers */ __ATINIT__.push({ func: function() { __GLOBAL__I_a() } });


/* memory initializer */ allocate([0,0,0,0,144,0,0,0,1,0,0,0,2,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,2,0,0,0,2,0,0,0,3,0,0,0,4,0,0,0,1,0,0,0,3,0,0,0,2,0,0,0,78,83,116,51,95,95,49,49,53,98,97,115,105,99,95,115,116,114,105,110,103,98,117,102,73,99,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,99,69,69,78,83,95,57,97,108,108,111,99,97,116,111,114,73,99,69,69,69,69,0,0,0,0,0,0,0,104,78,0,0,72,0,0,0,152,38,0,0,0,0,0,0,56,0,0,0,0,0,0,0,16,1,0,0,3,0,0,0,4,0,0,0,200,255,255,255,200,255,255,255,16,1,0,0,5,0,0,0,6,0,0,0,78,83,116,51,95,95,49,49,57,98,97,115,105,99,95,111,115,116,114,105,110,103,115,116,114,101,97,109,73,99,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,99,69,69,78,83,95,57,97,108,108,111,99,97,116,111,114,73,99,69,69,69,69,0,0,0,104,78,0,0,200,0,0,0,160,39,0,0,0,0,0,0,56,0,0,0,0,0,0,0,160,39,0,0,7,0,0,0,8,0,0,0,200,255,255,255,200,255,255,255,160,39,0,0,9,0,0,0,10,0,0,0,114,0,0,0,0,0,0,0,46,46,47,122,105,110,110,105,97,47,114,101,99,111,103,110,105,122,101,114,46,99,112,112,0,0,0,0,0,0,0,0,40,0,0,0,0,0,0,0,41,32,91,0,0,0,0,0,109,109,97,112,95,46,111,112,101,110,40,102,105,108,101,110,97,109,101,41,0,0,0,0,93,32,0,0,0,0,0,0,110,111,32,115,117,99,104,32,102,105,108,101,32,111,114,32,100,105,114,101,99,116,111,114,121,58,32,0,0,0,0,0,40,109,97,103,105,99,32,94,32,68,73,67,95,77,65,71,73,67,95,73,68,41,32,61,61,32,112,116,114,95,115,105,122,101,0,0,0,0,0,0,109,111,100,101,108,32,102,105,108,101,32,105,115,32,98,114,111,107,101,110,0,0,0,0,118,101,114,115,105,111,110,32,61,61,32,68,73,67,95,86,69,82,83,73,79,78,0,0,105,110,99,111,109,112,97,116,105,98,108,101,32,118,101,114,115,105,111,110,58,32,0,0,112,116,114,32,60,32,101,110,100,0,0,0,0,0,0,0,115,116,97,116,105,99,95,99,97,115,116,60,115,105,122,101,95,116,62,40,112,116,114,32,45,32,98,101,103,105,110,41,32,61,61,32,112,116,114,95,115,105,122,101,0,0,0,0,115,105,122,101,32,111,102,32,109,111,100,101,108,32,102,105,108,101,32,105,115,32,105,110,118,97,108,105,100,0,0,0,0,0,0,0,0,3,0,0,3,0,0,0,4,0,0,0,5,0,0,0,6,0,0,0,4,0,0,0,5,0,0,0,7,0,0,0,11,0,0,0,12,0,0,0,0,0,0,0,78,54,122,105,110,110,105,97,49,52,82,101,99,111,103,110,105,122,101,114,73,109,112,108,69,0,0,0,0,0,0,0,78,54,122,105,110,110,105,97,49,48,82,101,99,111,103,110,105,122,101,114,69,0,0,0,64,78,0,0,224,2,0,0,104,78,0,0,192,2,0,0,248,2,0,0,0,0,0,0,114,43,0,0,0,0,0,0,46,46,47,122,105,110,110,105,97,47,109,109,97,112,46,104,0,0,0,0,0,0,0,0,102,97,108,115,101,0,0,0,117,110,107,110,111,119,110,32,111,112,101,110,32,109,111,100,101,58,32,0,0,0,0,0,40,102,100,32,61,32,111,112,101,110,95,95,40,102,105,108,101,110,97,109,101,44,32,102,108,97,103,32,124,32,79,95,66,73,78,65,82,89,41,41,32,62,61,32,48,0,0,0,111,112,101,110,32,102,97,105,108,101,100,58,32,0,0,0,102,115,116,97,116,40,102,100,44,32,38,115,116,41,32,62,61,32,48,0,0,0,0,0,102,97,105,108,101,100,32,116,111,32,103,101,116,32,102,105,108,101,32,115,105,122,101,58,32,0,0,0,0,0,0,0,40,112,32,61,32,114,101,105,110,116,101,114,112,114,101,116,95,99,97,115,116,60,99,104,97,114,32,42,62,32,40,109,109,97,112,40,48,44,32,108,101,110,103,116,104,44,32,112,114,111,116,44,32,77,65,80,95,83,72,65,82,69,68,44,32,102,100,44,32,48,41,41,41,32,33,61,32,77,65,80,95,70,65,73,76,69,68,0,109,109,97,112,40,41,32,102,97,105,108,101,100,58,32,0,0,0,0,0,88,4,0,0,13,0,0,0,14,0,0,0,78,54,122,105,110,110,105,97,52,77,109,97,112,73,99,69,69,0,0,0,0,0,0,0,64,78,0,0,64,4,0,0,0,0,0,0,184,4,0,0,5,0,0,0,1,0,0,0,8,0,0,0,15,0,0,0,16,0,0,0,0,0,0,0,78,54,122,105,110,110,105,97,49,48,82,101,115,117,108,116,73,109,112,108,69,0,0,0,78,54,122,105,110,110,105,97,54,82,101,115,117,108,116,69,0,0,0,0,0,0,0,0,64,78,0,0,152,4,0,0,104,78,0,0,128,4,0,0,176,4,0,0,0,0,0,0,99,104,97,114,97,99,116,101,114,0,0,0,0,0,0,0,118,97,108,117,101,0,0,0,119,105,100,116,104,0,0,0,104,101,105,103,104,116,0,0,115,116,114,111,107,101,115,0,40,99,104,97,114,97,99,116,101,114,32,40,118,97,108,117,101,32,0,0,0,0,0,0,41,0,0,0,0,0,0,0,40,119,105,100,116,104,32,0,40,104,101,105,103,104,116,32,0,0,0,0,0,0,0,0,40,115,116,114,111,101,107,115,32,0,0,0,0,0,0,0,40,0,0,0,0,0,0,0,32,0,0,0,0,0,0,0,0,0,0,0,232,5,0,0,1,0,0,0,2,0,0,0,9,0,0,0,3,0,0,0,4,0,0,0,10,0,0,0,11,0,0,0,17,0,0,0,1,0,0,0,12,0,0,0,6,0,0,0,6,0,0,0,7,0,0,0,7,0,0,0,13,0,0,0,8,0,0,0,9,0,0,0,18,0,0,0,19,0,0,0,0,0,0,0,78,54,122,105,110,110,105,97,49,51,67,104,97,114,97,99,116,101,114,73,109,112,108,69,0,0,0,0,0,0,0,0,78,54,122,105,110,110,105,97,57,67,104,97,114,97,99,116,101,114,69,0,0,0,0,0,64,78,0,0,200,5,0,0,104,78,0,0,168,5,0,0,224,5,0,0,0,0,0,0,0,0,0,0,48,6,0,0,20,0,0,0,21,0,0,0,78,54,122,105,110,110,105,97,49,48,115,99,111,112,101,100,95,112,116,114,73,78,83,95,52,83,101,120,112,69,69,69,0,0,0,0,0,0,0,0,64,78,0,0,8,6,0,0,0,0,0,0,88,6,0,0,22,0,0,0,23,0,0,0,78,54,122,105,110,110,105,97,52,83,101,120,112,69,0,0,64,78,0,0,72,6,0,0,0,0,0,0,168,6,0,0,24,0,0,0,25,0,0,0,78,54,122,105,110,110,105,97,56,70,114,101,101,76,105,115,116,73,78,83,95,52,83,101,120,112,52,67,101,108,108,69,78,83,95,54,76,101,110,103,116,104,73,83,50,95,69,69,69,69,0,0,0,0,0,0,64,78,0,0,112,6,0,0,0,0,0,0,232,6,0,0,26,0,0,0,27,0,0,0,78,54,122,105,110,110,105,97,56,70,114,101,101,76,105,115,116,73,99,78,83,95,54,76,101,110,103,116,104,73,99,69,69,69,69,0,0,0,0,0,64,78,0,0,192,6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,100,117,109,109,121,95,117,115,101,114,95,100,105,99,116], "i8", ALLOC_NONE, Runtime.GLOBAL_BASE);
/* memory initializer */ allocate([192,224,240,248,252,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,3,3,3,3,3,3,3,3,4,4,4,4,5,5,5,5,0,0,0,0,128,48,0,0,128,32,14,0,128,32,200,3,128,32,8,250,128,32,8,130,104,122,115,95,108,101,110,32,60,61,32,107,77,97,120,80,114,101,100,105,99,116,83,105,122,101,32,38,38,32,104,122,115,95,108,101,110,32,62,32,48,0,0,0,0,0,0,0,46,46,47,115,104,97,114,101,47,100,105,99,116,108,105,115,116,46,99,112,112,0,0,0,112,114,101,100,105,99,116,0,78,85,76,76,32,33,61,32,104,122,95,102,111,117,110,100,32,38,38,32,104,97,110,122,105,32,61,61,32,42,104,122,95,102,111,117,110,100,0,0,103,101,116,95,115,112,108,105,100,115,95,102,111,114,95,104,97,110,122,105,0,0,0,0,102,111,117,110,100,95,110,117,109,32,43,32,49,32,60,32,109,97,120,95,115,112,108,105,100,115,0,0,0,0,0,0,102,111,117,110,100,32,62,32,98,117,102,95,0,0,0,0,103,101,116,95,108,101,109,109,97,95,105,100,0,0,0,0,115,116,97,116,105,99,95,99,97,115,116,60,115,105,122,101,95,116,62,40,102,111,117,110,100,32,45,32,98,117,102,95,41,32,62,61,32,115,116,97,114,116,95,112,111,115,95,91,115,116,114,95,108,101,110,32,45,32,49,93,0,0,0,0,0,0,0,0,168,25,0,0,28,0,0,0,29,0,0,0,2,0,0,0,14,0,0,0,15,0,0,0,2,0,0,0,1,0,0,0,1,0,0,0,3,0,0,0,2,0,0,0,2,0,0,0,3,0,0,0,4,0,0,0,5,0,0,0,8,0,0,0,6,0,0,0,9,0,0,0,16,0,0,0,5,0,0,0,30,0,0,0,108,109,97,95,110,111,100,101,95,110,117,109,95,108,101,48,95,32,60,61,32,98,117,102,95,115,105,122,101,0,0,0,46,46,47,115,104,97,114,101,47,100,105,99,116,116,114,105,101,46,99,112,112,0,0,0,108,111,97,100,95,100,105,99,116,0,0,0,0,0,0,0,115,116,97,116,105,99,95,99,97,115,116,60,115,105,122,101,95,116,62,40,115,112,108,105,100,32,45,32,107,70,117,108,108,83,112,108,73,100,83,116,97,114,116,41,32,60,32,98,117,102,95,115,105,122,101,0,114,98,0,0,0,0,0,0,48,32,61,61,32,100,101,112,45,62,115,112,108,105,100,115,95,101,120,116,101,110,100,101,100,0,0,0,0,0,0,0,101,120,116,101,110,100,95,100,105,99,116,0,0,0,0,0,78,85,76,76,32,33,61,32,100,101,112,32,38,38,32,48,32,61,61,32,102,114,111,109,95,104,97,110,100,108,101,0,101,120,116,101,110,100,95,100,105,99,116,48,0,0,0,0,49,32,61,61,32,110,111,100,101,45,62,115,111,110,95,49,115,116,95,111,102,102,0,0,115,111,110,45,62,115,112,108,95,105,100,120,32,62,61,32,105,100,95,115,116,97,114,116,32,38,38,32,115,111,110,45,62,115,112,108,95,105,100,120,32,60,32,105,100,95,115,116,97,114,116,32,43,32,105,100,95,110,117,109,0,0,0,0,78,85,76,76,32,33,61,32,100,101,112,32,38,38,32,102,114,111,109,95,104,97,110,100,108,101,32,62,32,48,32,38,38,32,102,114,111,109,95,104,97,110,100,108,101,32,60,32,109,105,108,101,95,115,116,111,110,101,115,95,112,111,115,95,0,0,0,0,0,0,0,0,101,120,116,101,110,100,95,100,105,99,116,49,0,0,0,0,110,111,100,101,45,62,115,111,110,95,49,115,116,95,111,102,102,32,60,61,32,108,109,97,95,110,111,100,101,95,110,117,109,95,103,101,49,95,0,0,101,120,116,101,110,100,95,100,105,99,116,50,0,0,0,0,110,111,100,101,45,62,115,111,110,95,49,115,116,95,111,102,102,95,108,32,62,32,48,32,124,124,32,110,111,100,101,45,62,115,111,110,95,49,115,116,95,111,102,102,95,104,32,62,32,48,0,0,0,0,0,0,110,111,100,101,95,108,101,48,45,62,115,111,110,95,49,115,116,95,111,102,102,32,60,61,32,108,109,97,95,110,111,100,101,95,110,117,109,95,103,101,49,95,0,0,0,0,0,0,116,114,121,95,101,120,116,101,110,100,0,0,0,0,0,0,110,111,100,101,95,103,101,49,45,62,115,111,110,95,49,115,116,95,111,102,102,95,108,32,62,32,48,32,124,124,32,110,111,100,101,95,103,101,49,45,62,115,111,110,95,49,115,116,95,111,102,102,95,104,32,62,32,48,0,0,0,0,0,0,105,100,95,110,117,109,32,62,32,48,0,0,0,0,0,0,103,101,116,95,108,112,105,115,0,0,0,0,0,0,0,0,110,111,100,101,32,61,61,32,114,111,111,116,95,32,38,38,32,49,32,61,61,32,110,111,100,101,95,102,114,95,110,117,109,0,0,0,0,0,0,0,110,111,100,101,95,115,111,110,45,62,115,112,108,95,105,100,120,32,62,61,32,105,100,95,115,116,97,114,116,32,38,38,32,110,111,100,101,95,115,111,110,45,62,115,112,108,95,105,100,120,32,60,32,105,100,95,115,116,97,114,116,32,43,32,105,100,95,110,117,109,0,0,40,33,97,114,103,95,118,97,108,105,100,32,38,38,32,115,112,108,105,100,115,95,109,97,120,32,62,61,32,108,109,97,95,108,101,110,41,32,124,124,32,108,109,97,95,108,101,110,32,61,61,32,115,112,108,105,100,115,95,109,97,120,0,0,103,101,116,95,108,101,109,109,97,95,115,112,108,105,100,115,0,0,0,0,0,0,0,0,99,97,110,100,95,115,112,108,105,100,115,95,116,104,105,115,32,62,32,48,0,0,0,0,78,49,48,105,109,101,95,112,105,110,121,105,110,56,68,105,99,116,84,114,105,101,69,0,78,49,48,105,109,101,95,112,105,110,121,105,110,49,50,65,116,111,109,68,105,99,116,66,97,115,101,69,0,0,0,0,64,78,0,0,128,25,0,0,200,78,0,0,104,25,0,0,0,0,0,0,1,0,0,0,160,25,0,0,0,0,0,0,0,0,0,0,0,0,0,0,78,85,76,76,32,33,61,32,108,112,105,95,99,97,99,104,101,95,0,0,0,0,0,0,46,46,47,115,104,97,114,101,47,108,112,105,99,97,99,104,101,46,99,112,112,0,0,0,76,112,105,67,97,99,104,101,0,0,0,0,0,0,0,0,78,85,76,76,32,33,61,32,108,112,105,95,99,97,99,104,101,95,108,101,110,95,0,0,78,85,76,76,32,33,61,32,105,110,115,116,97,110,99,101,95,0,0,0,0,0,0,0,103,101,116,95,105,110,115,116,97,110,99,101,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,48,65,66,67,99,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,115,84,85,86,87,88,89,90,122,0,0,2,1,1,1,2,1,1,1,0,1,1,1,1,1,2,1,1,1,1,1,0,0,1,1,1,1,0,0,0,0,0,0,46,46,47,115,104,97,114,101,47,115,112,101,108,108,105,110,103,116,114,105,101,46,99,112,112,0,0,0,0,0,0,0,40,99,104,97,114,95,102,111,114,95,110,111,100,101,32,62,61,32,39,65,39,41,32,38,38,32,40,99,104,97,114,95,102,111,114,95,110,111,100,101,32,60,61,32,39,90,39,32,124,124,32,39,104,39,32,61,61,32,99,104,97,114,95,102,111,114,95,110,111,100,101,41,0,0,0,0,0,0,0,0,99,111,110,115,116,114,117,99,116,95,115,112,101,108,108,105,110,103,115,95,115,117,98,115,101,116,0,0,0,0,0,0,105,115,95,118,97,108,105,100,95,115,112,108,95,99,104,97,114,40,99,104,97,114,95,99,117,114,114,101,110,116,41,0,115,111,110,95,112,111,115,32,43,32,49,32,61,61,32,110,117,109,95,111,102,95,115,111,110,0,0,0,0,0,0,0,37,115,0,0,0,0,0,0,67,104,0,0,0,0,0,0,83,104,0,0,0,0,0,0,90,104,0,0,0,0,0,0,0,0,0,0,16,28,0,0,31,0,0,0,32,0,0,0,7,0,0,0,17,0,0,0,18,0,0,0,3,0,0,0,3,0,0,0,4,0,0,0,8,0,0,0,5,0,0,0,4,0,0,0,6,0,0,0,9,0,0,0,10,0,0,0,10,0,0,0,11,0,0,0,11,0,0,0,19,0,0,0,6,0,0,0,33,0,0,0,0,0,0,0,0,0,0,0,119,43,0,0,0,0,0,0,114,98,0,0,0,0,0,0,78,49,48,105,109,101,95,112,105,110,121,105,110,56,85,115,101,114,68,105,99,116,69,0,104,78,0,0,248,27,0,0,160,25], "i8", ALLOC_NONE, Runtime.GLOBAL_BASE+4946);
/* memory initializer */ allocate([168,32,0,0,34,0,0,0,35,0,0,0,7,0,0,0,10,0,0,0,2,0,0,0,2,0,0,0,20,0,0,0,21,0,0,0,11,0,0,0,22,0,0,0,23,0,0,0,12,0,0,0,12,0,0,0,13,0,0,0,78,83,116,51,95,95,49,49,49,95,95,115,116,100,111,117,116,98,117,102,73,119,69,69,0,0,0,0,0,0,0,0,104,78,0,0,136,32,0,0,216,38,0,0,0,0,0,0,0,0,0,0,16,33,0,0,36,0,0,0,37,0,0,0,8,0,0,0,10,0,0,0,2,0,0,0,2,0,0,0,24,0,0,0,21,0,0,0,11,0,0,0,25,0,0,0,26,0,0,0,14,0,0,0,13,0,0,0,15,0,0,0,78,83,116,51,95,95,49,49,48,95,95,115,116,100,105,110,98,117,102,73,119,69,69,0,104,78,0,0,248,32,0,0,216,38,0,0,0,0,0,0,117,110,115,117,112,112,111,114,116,101,100,32,108,111,99,97,108,101,32,102,111,114,32,115,116,97,110,100,97,114,100,32,105,110,112,117,116,0,0,0,0,0,0,0,168,33,0,0,38,0,0,0,39,0,0,0,9,0,0,0,1,0,0,0,3,0,0,0,3,0,0,0,27,0,0,0,2,0,0,0,2,0,0,0,28,0,0,0,4,0,0,0,16,0,0,0,14,0,0,0,17,0,0,0,78,83,116,51,95,95,49,49,49,95,95,115,116,100,111,117,116,98,117,102,73,99,69,69,0,0,0,0,0,0,0,0,104,78,0,0,136,33,0,0,152,38,0,0,0,0,0,0,0,0,0,0,16,34,0,0,40,0,0,0,41,0,0,0,10,0,0,0,1,0,0,0,3,0,0,0,3,0,0,0,1,0,0,0,2,0,0,0,2,0,0,0,29,0,0,0,30,0,0,0,18,0,0,0,3,0,0,0,19,0,0,0,78,83,116,51,95,95,49,49,48,95,95,115,116,100,105,110,98,117,102,73,99,69,69,0,104,78,0,0,248,33,0,0,152,38,0,0,0,0,0,0,78,83,116,51,95,95,49,49,52,95,95,115,104,97,114,101,100,95,99,111,117,110,116,69,0,0,0,0,0,0,0,0,64,78,0,0,32,34,0,0,0,0,0,0,136,34,0,0,42,0,0,0,43,0,0,0,31,0,0,0,0,0,0,0,0,0,0,0,240,34,0,0,44,0,0,0,45,0,0,0,32,0,0,0,0,0,0,0,83,116,49,49,108,111,103,105,99,95,101,114,114,111,114,0,104,78,0,0,120,34,0,0,0,0,0,0,0,0,0,0,0,0,0,0,200,34,0,0,42,0,0,0,46,0,0,0,31,0,0,0,0,0,0,0,83,116,49,50,108,101,110,103,116,104,95,101,114,114,111,114,0,0,0,0,0,0,0,0,104,78,0,0,176,34,0,0,136,34,0,0,0,0,0,0,83,116,49,51,114,117,110,116,105,109,101,95,101,114,114,111,114,0,0,0,0,0,0,0,104,78,0,0,216,34,0,0,0,0,0,0,0,0,0,0,58,32,0,0,0,0,0,0,0,0,0,0,56,35,0,0,47,0,0,0,48,0,0,0,32,0,0,0,0,0,0,0,78,83,116,51,95,95,49,49,50,115,121,115,116,101,109,95,101,114,114,111,114,69,0,0,104,78,0,0,32,35,0,0,240,34,0,0,0,0,0,0,78,83,116,51,95,95,49,49,52,101,114,114,111,114,95,99,97,116,101,103,111,114,121,69,0,0,0,0,0,0,0,0,64,78,0,0,72,35,0,0,78,83,116,51,95,95,49,49,50,95,95,100,111,95,109,101,115,115,97,103,101,69,0,0,104,78,0,0,112,35,0,0,104,35,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,98,97,115,105,99,95,115,116,114,105,110,103,0,0,0,0,0,0,0,0,152,38,0,0,49,0,0,0,50,0,0,0,1,0,0,0,1,0,0,0,3,0,0,0,3,0,0,0,1,0,0,0,2,0,0,0,2,0,0,0,28,0,0,0,4,0,0,0,16,0,0,0,3,0,0,0,19,0,0,0,0,0,0,0,216,38,0,0,51,0,0,0,52,0,0,0,11,0,0,0,10,0,0,0,2,0,0,0,2,0,0,0,24,0,0,0,21,0,0,0,11,0,0,0,22,0,0,0,23,0,0,0,12,0,0,0,13,0,0,0,15,0,0,0,8,0,0,0,0,0,0,0,16,39,0,0,53,0,0,0,54,0,0,0,248,255,255,255,248,255,255,255,16,39,0,0,55,0,0,0,56,0,0,0,8,0,0,0,0,0,0,0,88,39,0,0,57,0,0,0,58,0,0,0,248,255,255,255,248,255,255,255,88,39,0,0,59,0,0,0,60,0,0,0,4,0,0,0,0,0,0,0,160,39,0,0,7,0,0,0,8,0,0,0,252,255,255,255,252,255,255,255,160,39,0,0,9,0,0,0,10,0,0,0,4,0,0,0,0,0,0,0,232,39,0,0,61,0,0,0,62,0,0,0,252,255,255,255,252,255,255,255,232,39,0,0,63,0,0,0,64,0,0,0,105,111,115,116,114,101,97,109,0,0,0,0,0,0,0,0,117,110,115,112,101,99,105,102,105,101,100,32,105,111,115,116,114,101,97,109,95,99,97,116,101,103,111,114,121,32,101,114,114,111,114,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,176,37,0,0,65,0,0,0,66,0,0,0,32,0,0,0,0,0,0,0,0,0,0,0,216,37,0,0,67,0,0,0,68,0,0,0,105,111,115,95,98,97,115,101,58,58,99,108,101,97,114,0,78,83,116,51,95,95,49,56,105,111,115,95,98,97,115,101,55,102,97,105,108,117,114,101,69,0,0,0,0,0,0,0,104,78,0,0,144,37,0,0,56,35,0,0,0,0,0,0,78,83,116,51,95,95,49,56,105,111,115,95,98,97,115,101,69,0,0,0,0,0,0,0,64,78,0,0,192,37,0,0,78,83,116,51,95,95,49,57,98,97,115,105,99,95,105,111,115,73,99,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,99,69,69,69,69,0,0,0,0,0,0,0,104,78,0,0,224,37,0,0,216,37,0,0,0,0,0,0,78,83,116,51,95,95,49,57,98,97,115,105,99,95,105,111,115,73,119,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,119,69,69,69,69,0,0,0,0,0,0,0,104,78,0,0,32,38,0,0,216,37,0,0,0,0,0,0,78,83,116,51,95,95,49,49,53,98,97,115,105,99,95,115,116,114,101,97,109,98,117,102,73,99,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,99,69,69,69,69,0,0,0,0,0,0,0,0,64,78,0,0,96,38,0,0,78,83,116,51,95,95,49,49,53,98,97,115,105,99,95,115,116,114,101,97,109,98,117,102,73,119,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,119,69,69,69,69,0,0,0,0,0,0,0,0,64,78,0,0,160,38,0,0,78,83,116,51,95,95,49,49,51,98,97,115,105,99,95,105,115,116,114,101,97,109,73,99,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,99,69,69,69,69,0,0,200,78,0,0,224,38,0,0,0,0,0,0,1,0,0,0,16,38,0,0,3,244,255,255,78,83,116,51,95,95,49,49,51,98,97,115,105,99,95,105,115,116,114,101,97,109,73,119,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,119,69,69,69,69,0,0,200,78,0,0,40,39,0,0,0,0,0,0,1,0,0,0,80,38,0,0,3,244,255,255,78,83,116,51,95,95,49,49,51,98,97,115,105,99,95,111,115,116,114,101,97,109,73,99,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,99,69,69,69,69,0,0,200,78,0,0,112,39,0,0,0,0,0,0,1,0,0,0,16,38,0,0,3,244,255,255,78,83,116,51,95,95,49,49,51,98,97,115,105,99,95,111,115,116,114,101,97,109,73,119,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,119,69,69,69,69,0,0,200,78,0,0,184,39,0,0,0,0,0,0,1,0,0,0,80,38,0,0,3,244,255,255,0,0,0,0,72,40,0,0,69,0,0,0,70,0,0,0,33,0,0,0,4,0,0,0,15,0,0,0,16,0,0,0,5,0,0,0,0,0,0,0,78,83,116,51,95,95,49,49,57,95,95,105,111,115,116,114,101,97,109,95,99,97,116,101,103,111,114,121,69,0,0,0,104,78,0,0,40,40,0,0,136,35,0,0,0,0,0,0,0,0,0,0,112,54,0,0,71,0,0,0,72,0,0,0,73,0,0,0,7,0,0,0,4,0,0,0,17,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,152,54,0,0,74,0,0,0,75,0,0,0,73,0,0,0,8,0,0,0,5,0,0,0,18,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,72,59,0,0,76,0,0,0,77,0,0,0,73,0,0,0,1,0,0,0,2,0,0,0,3,0,0,0,4,0,0,0,5,0,0,0,6,0,0,0,7,0,0,0,8,0,0,0,9,0,0,0,10,0,0,0,11,0,0,0,0,0,0,0,0,0,0,0,48,49,50,51,52,53,54,55,56,57,97,98,99,100,101,102,65,66,67,68,69,70,120,88,43,45,112,80,105,73,110,78,0,0,0,0,0,0,0,0,37,112,0,0,0,0,0,0,0,0,0,0,224,59,0,0,78,0,0,0,79,0,0,0,73,0,0,0,12,0,0,0,13,0,0,0,14,0,0,0,15,0,0,0,16,0,0,0,17,0,0,0,18,0,0,0,19,0,0,0,20,0,0,0,21,0,0,0,22,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,160,60,0,0,80,0,0,0,81,0,0,0,73,0,0,0,4,0,0,0,5,0,0,0,23,0,0,0,6,0,0,0,24,0,0,0,1,0,0,0,2,0,0,0,7,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,56,61,0,0,82,0,0,0,83,0,0,0,73,0,0,0,8,0,0,0,9,0,0,0,25,0,0,0,10,0,0,0,26,0,0,0,3,0,0,0,4,0,0,0,11,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,37,0,0,0,0,0,0,0,37,112,0,0,0,0,0,0,0,0,0,0,96,56,0,0,84,0,0,0,85,0,0,0,73,0,0,0,34,0,0,0,27,0,0,0,28,0,0,0,29,0,0,0,30,0,0,0,31,0,0,0,1,0,0,0,248,255,255,255,96,56,0,0,35,0,0,0,36,0,0,0,37,0,0,0,38,0,0,0,39,0,0,0,40,0,0,0,41,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,37,72,58,37,77,58,37,83,37,109,47,37,100,47,37,121,37,89,45,37,109,45,37,100,37,73,58,37,77,58,37,83,32,37,112,0,0,0,0,0,37,72,58,37,77,0,0,0,37,72,58,37,77,58,37,83,0,0,0,0,0,57,0,0,86,0,0,0,87,0,0,0,73,0,0,0,42,0,0,0,32,0,0,0,33,0,0,0,34,0,0,0,35,0,0,0,36,0,0,0,2,0,0,0,248,255,255,255,0,57,0,0,43,0,0,0,44,0,0,0,45,0,0,0,46,0,0,0,47,0,0,0,48,0,0,0,49,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,37,0,0,0,72,0,0,0,58,0,0,0,37,0,0,0,77,0,0,0,58,0,0,0,37,0,0,0,83,0,0,0,37,0,0,0,109,0,0,0,47,0,0,0,37,0,0,0,100,0,0,0,47,0,0,0,37,0,0,0,121,0,0,0,37,0,0,0,89,0,0,0,45,0,0,0,37,0,0,0,109,0,0,0,45,0,0,0,37,0,0,0,100,0,0,0,37,0,0,0,73,0,0,0,58,0,0,0,37,0,0,0,77,0,0,0,58,0,0,0,37,0,0,0,83,0,0,0,32,0,0,0,37,0,0,0,112,0,0,0,0,0,0,0,37,0,0,0,72,0,0,0,58,0,0,0,37,0,0,0,77,0,0,0,0,0,0,0,37,0,0,0,72,0,0,0,58,0,0,0,37,0,0,0,77,0,0,0,58,0,0,0,37,0,0,0,83,0,0,0,0,0,0,0,144,57,0,0,88,0,0,0,89,0,0,0,73,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,248,57,0,0,90,0,0,0,91,0,0,0,73,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,232,54,0,0,92,0,0,0,93,0,0,0,73,0,0,0,50,0,0,0,51,0,0,0,12,0,0,0,13,0,0,0,14,0,0,0,15,0,0,0,52,0,0,0,16,0,0,0,17,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,40,55,0,0,94,0,0,0,95,0,0,0,73,0,0,0,53,0,0,0,54,0,0,0,18,0,0,0,19,0,0,0,20,0,0,0,21,0,0,0,55,0,0,0,22,0,0,0,23,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,104,55,0,0,96,0,0,0,97,0,0,0,73,0,0,0,56,0,0,0,57,0,0,0,24,0,0,0,25,0,0,0,26,0,0,0,27,0,0,0,58,0,0,0,28,0,0,0,29,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,168,55,0,0,98,0,0,0,99,0,0,0,73,0,0,0,59,0,0,0,60,0,0,0,30,0,0,0,31,0,0,0,32,0,0,0,33,0,0,0,61,0,0,0,34,0,0,0,35,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,200,61,0,0,100,0,0,0,101,0,0,0,73,0,0,0,3,0,0,0,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,48,49,50,51,52,53,54,55,56,57,0,0,0,0,0,0,37,76,102,0,0,0,0,0,109,111,110,101,121,95,103,101,116,32,101,114,114,111,114,0,0,0,0,0,88,62,0,0,102,0,0,0,103,0,0,0,73,0,0,0,5,0,0,0,6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,48,49,50,51,52,53,54,55,56,57,0,0,0,0,0,0,0,0,0,0,232,62,0,0,104,0,0,0,105,0,0,0,73,0,0,0,1,0,0,0,37,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,37,46,48,76,102,0,0,0,0,0,0,0,120,63,0,0,106,0,0,0,107,0,0,0,73,0,0,0,2,0,0,0,38,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,80,58,0,0,108,0,0,0,109,0,0,0,73,0,0,0,19,0,0,0,12,0,0,0,36,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,136,58,0,0,110,0,0,0,111,0,0,0,73,0,0,0,20,0,0,0,13,0,0,0,37,0,0,0,0,0,0,0,0,0,0,0,118,101,99,116,111,114,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,67,0,0,0,0,0,0,0,0,0,0,0,72,54,0,0,112,0,0,0,113,0,0,0,73,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,32,51,0,0,114,0,0,0,115,0,0,0,73,0,0,0,20,0,0,0,21,0,0,0,21,0,0,0,22,0,0,0,22,0,0,0,12,0,0,0,23,0,0,0,9,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,52,0,0,116,0,0,0,117,0,0,0,73,0,0,0,1,0,0,0,2,0,0,0,10,0,0,0,62,0,0,0,63,0,0,0,11,0,0,0,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,248,53,0,0,118,0,0,0,119,0,0,0,73,0,0,0,65,0,0,0,66,0,0,0,38,0,0,0,39,0,0,0,40,0,0,0,0,0,0,0,32,54,0,0,120,0,0,0,121,0,0,0,73,0,0,0,67,0,0,0,68,0,0,0,41,0,0,0,42,0,0,0,43,0,0,0,116,114,117,101,0,0,0,0,116,0,0,0,114,0,0,0,117,0,0,0,101,0,0,0,0,0,0,0,0,0,0,0,102,97,108,115,101,0,0,0,102,0,0,0,97,0,0,0,108,0,0,0,115,0,0,0,101,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,37,109,47,37,100,47,37,121,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,37,0,0,0,109,0,0,0,47,0,0,0,37,0,0,0,100,0,0,0,47,0,0,0,37,0,0,0,121,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,37,72,58,37,77,58,37,83,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,37,0,0,0,72,0,0,0,58,0,0,0,37,0,0,0,77,0,0,0,58,0,0,0,37,0,0,0,83,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,37,97,32,37,98,32,37,100,32,37,72,58,37,77,58,37,83,32,37,89,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,37,0,0,0,97,0,0,0,32,0,0,0,37,0,0,0,98,0,0,0,32,0,0,0,37,0,0,0,100,0,0,0,32,0,0,0,37,0,0,0,72,0,0,0,58,0,0,0,37,0,0,0,77,0,0,0,58,0,0,0,37,0,0,0,83,0,0,0,32,0,0,0,37,0,0,0,89,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,37,73,58,37,77,58,37,83,32,37,112,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,37,0,0,0,73,0,0,0,58,0,0,0,37,0,0,0,77,0,0,0,58,0,0,0,37,0,0,0,83,0,0,0,32,0,0,0,37,0,0,0,112,0,0,0,0,0,0,0,108,111,99,97,108,101,32,110,111,116,32,115,117,112,112,111,114,116,101,100,0,0,0,0,0,0,0,0,88,50,0,0,122,0,0,0,123,0,0,0,73,0,0,0,0,0,0,0,78,83,116,51,95,95,49,54,108,111,99,97,108,101,53,102,97,99,101,116,69,0,0,0,104,78,0,0,64,50,0,0,64,34,0,0,0,0,0,0,0,0,0,0,232,50,0,0,122,0,0,0,124,0,0,0,73,0,0,0,24,0,0,0,13,0,0,0,14,0,0,0,15,0,0,0,23,0,0,0,25,0,0,0,24,0,0,0,26,0,0,0,25,0,0,0,16,0,0,0,27,0,0,0,12,0,0,0,0,0,0,0,78,83,116,51,95,95,49,53,99,116,121,112,101,73,119,69,69,0,0,0,0,0,0,0,78,83,116,51,95,95,49,49,48,99,116,121,112,101,95,98,97,115,101,69,0,0,0,0,64,78,0,0,200,50,0,0,200,78,0,0,176,50,0,0,0,0,0,0,2,0,0,0,88,50,0,0,2,0,0,0,224,50,0,0,2,0,0,0,78,83,116,51,95,95,49,53,99,116,121,112,101,73,99,69,69,0,0,0,0,0,0,0,200,78,0,0,8,51,0,0,0,0,0,0,2,0,0,0,88,50,0,0,2,0,0,0,224,50,0,0,2,0,0,0,0,0,0,0,184,51,0,0,122,0,0,0,125,0,0,0,73,0,0,0,3,0,0,0,4,0,0,0,13,0,0,0,69,0,0,0,70,0,0,0,14,0,0,0,71,0,0,0,78,83,116,51,95,95,49,55,99,111,100,101,99,118,116,73,99,99,49,49,95,95,109,98,115,116,97,116,101,95,116,69,69,0,0,0,0,0,0,0,78,83,116,51,95,95,49,49,50,99,111,100,101,99,118,116,95,98,97,115,101,69,0,0,64,78,0,0,152,51,0,0,200,78,0,0,112,51,0,0,0,0,0,0,2,0,0,0,88,50,0,0,2,0,0,0,176,51,0,0,2,0,0,0,78,83,116,51,95,95,49,55,99,111,100,101,99,118,116,73,119,99,49,49,95,95,109,98,115,116,97,116,101,95,116,69,69,0,0,0,0,0,0,0,200,78,0,0,216,51,0,0,0,0,0,0,2,0,0,0,88,50,0,0,2,0,0,0,176,51,0,0,2,0,0,0,0,0,0,0,120,52,0,0,122,0,0,0,126,0,0,0,73,0,0,0,5,0,0,0,6,0,0,0,15,0,0,0,72,0,0,0,73,0,0,0,16,0,0,0,74,0,0,0,78,83,116,51,95,95,49,55,99,111,100,101,99,118,116,73,68,115,99,49,49,95,95,109,98,115,116,97,116,101,95,116,69,69,0,0,0,0,0,0,200,78,0,0,80,52,0,0,0,0,0,0,2,0,0,0,88,50,0,0,2,0,0,0,176,51,0,0,2,0,0,0,0,0,0,0,240,52,0,0,122,0,0,0,127,0,0,0,73,0,0,0,7,0,0,0,8,0,0,0,17,0,0,0,75,0,0,0,76,0,0,0,18,0,0,0,77,0,0,0,78,83,116,51,95,95,49,55,99,111,100,101,99,118,116,73,68,105,99,49,49,95,95,109,98,115,116,97,116,101,95,116,69,69,0,0,0,0,0,0,200,78,0,0,200,52,0,0,0,0,0,0,2,0,0,0,88,50,0,0,2,0,0,0,176,51,0,0,2,0,0,0,0,0,0,0,104,53,0,0,122,0,0,0,128,0,0,0,73,0,0,0,7,0,0,0,8,0,0,0,17,0,0,0,75,0,0,0,76,0,0,0,18,0,0,0,77,0,0,0,78,83,116,51,95,95,49,49,54,95,95,110,97,114,114,111,119,95,116,111,95,117,116,102,56,73,76,106,51,50,69,69,69,0,0,0,0,0,0,0,104,78,0,0,64,53,0,0,240,52,0,0,0,0,0,0,0,0,0,0,208,53,0,0,122,0,0,0,129,0,0,0,73,0,0,0,7,0,0,0,8,0,0,0,17,0,0,0,75,0,0,0,76,0,0,0,18,0,0,0,77,0,0,0,78,83,116,51,95,95,49,49,55,95,95,119,105,100,101,110,95,102,114,111,109,95,117,116,102,56,73,76,106,51,50,69,69,69,0,0,0,0,0,0,104,78,0,0,168,53,0,0,240,52,0,0,0,0,0,0,78,83,116,51,95,95,49,56,110,117,109,112,117,110,99,116,73,99,69,69,0,0,0,0,104,78,0,0,224,53,0,0,88,50,0,0,0,0,0,0,78,83,116,51,95,95,49,56,110,117,109,112,117,110,99,116,73,119,69,69,0,0,0,0,104,78,0,0,8,54,0,0,88,50,0,0,0,0,0,0,78,83,116,51,95,95,49,54,108,111,99,97,108,101,53,95,95,105,109,112,69,0,0,0,104,78,0,0,48,54,0,0,88,50,0,0,0,0,0,0,78,83,116,51,95,95,49,55,99,111,108,108,97,116,101,73,99,69,69,0,0,0,0,0,104,78,0,0,88,54,0,0,88,50,0,0,0,0,0,0,78,83,116,51,95,95,49,55,99,111,108,108,97,116,101,73,119,69,69,0,0,0,0,0,104,78,0,0,128,54,0,0,88,50,0,0,0,0,0,0,78,83,116,51,95,95,49,49,48,109,111,110,101,121,112,117,110,99,116,73,99,76,98,48,69,69,69,0,0,0,0,0,78,83,116,51,95,95,49,49,48,109,111,110,101,121,95,98,97,115,101,69,0,0,0,0,64,78,0,0,200,54,0,0,200,78,0,0,168,54,0,0,0,0,0,0,2,0,0,0,88,50,0,0,2,0,0,0,224,54,0,0,2,0,0,0,78,83,116,51,95,95,49,49,48,109,111,110,101,121,112,117,110,99,116,73,99,76,98,49,69,69,69,0,0,0,0,0,200,78,0,0,8,55,0,0,0,0,0,0,2,0,0,0,88,50,0,0,2,0,0,0,224,54,0,0,2,0,0,0,78,83,116,51,95,95,49,49,48,109,111,110,101,121,112,117,110,99,116,73,119,76,98,48,69,69,69,0,0,0,0,0,200,78,0,0,72,55,0,0,0,0,0,0,2,0,0,0,88,50,0,0,2,0,0,0,224,54,0,0,2,0,0,0,78,83,116,51,95,95,49,49,48,109,111,110,101,121,112,117,110,99,116,73,119,76,98,49,69,69,69,0,0,0,0,0,200,78,0,0,136,55,0,0,0,0,0,0,2,0,0,0,88,50,0,0,2,0,0,0,224,54,0,0,2,0,0,0,78,83,116,51,95,95,49,56,116,105,109,101,95,103,101,116,73,99,78,83,95,49,57,105,115,116,114,101,97,109,98,117,102,95,105,116,101,114,97,116,111,114,73,99,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,99,69,69,69,69,69,69,0,0,0,0,78,83,116,51,95,95,49,57,116,105,109,101,95,98,97,115,101,69,0,0,0,0,0,0,64,78,0,0,16,56,0,0,78,83,116,51,95,95,49,50,48,95,95,116,105,109,101,95,103,101,116,95,99,95,115,116,111,114,97,103,101,73,99,69,69,0,0,0,0,0,0,0,64,78,0,0,48,56,0,0,200,78,0,0,200,55,0,0,0,0,0,0,3,0,0,0,88,50,0,0,2,0,0,0,40,56,0,0,2,0,0,0,88,56,0,0,0,8,0,0,78,83,116,51,95,95,49,56,116,105,109,101,95,103,101,116,73,119,78,83,95,49,57,105,115,116,114,101,97,109,98,117,102,95,105,116,101,114,97,116,111,114,73,119,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,119,69,69,69,69,69,69,0,0,0,0,78,83,116,51,95,95,49,50,48,95,95,116,105,109,101,95,103,101,116,95,99,95,115,116,111,114,97,103,101,73,119,69,69,0,0,0,0,0,0,0,64,78,0,0,208,56,0,0,200,78,0,0,136,56,0,0,0,0,0,0,3,0,0,0,88,50,0,0,2,0,0,0,40,56,0,0,2,0,0,0,248,56,0,0,0,8,0,0,78,83,116,51,95,95,49,56,116,105,109,101,95,112,117,116,73,99,78,83,95,49,57,111,115,116,114,101,97,109,98,117,102,95,105,116,101,114,97,116,111,114,73,99,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,99,69,69,69,69,69,69,0,0,0,0,78,83,116,51,95,95,49,49,48,95,95,116,105,109,101,95,112,117,116,69,0,0,0,0,64,78,0,0,112,57,0,0,200,78,0,0,40,57,0,0,0,0,0,0,2,0,0,0,88,50,0,0,2,0,0,0,136,57,0,0,0,8,0,0,78,83,116,51,95,95,49,56,116,105,109,101,95,112,117,116,73,119,78,83,95,49,57,111,115,116,114,101,97,109,98,117,102,95,105,116,101,114,97,116,111,114,73,119,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,119,69,69,69,69,69,69,0,0,0,0,200,78,0,0,176,57,0,0,0,0,0,0,2,0,0,0,88,50,0,0,2,0,0,0,136,57,0,0,0,8,0,0,78,83,116,51,95,95,49,56,109,101,115,115,97,103,101,115,73,99,69,69,0,0,0,0,78,83,116,51,95,95,49,49,51,109,101,115,115,97,103,101,115,95,98,97,115,101,69,0,64,78,0,0,48,58,0,0,200,78,0,0,24,58,0,0,0,0,0,0,2,0,0,0,88,50,0,0,2,0,0,0,72,58,0,0,2,0,0,0,78,83,116,51,95,95,49,56,109,101,115,115,97,103,101,115,73,119,69,69,0,0,0,0,200,78,0,0,112,58,0,0,0,0,0,0,2,0,0,0,88,50,0,0,2,0,0,0,72,58,0,0,2,0,0,0,78,83,116,51,95,95,49,55,110,117,109,95,103,101,116,73,99,78,83,95,49,57,105,115,116,114,101,97,109,98,117,102,95,105,116,101,114,97,116,111,114,73,99,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,99,69,69,69,69,69,69,0,0,0,0,0,78,83,116,51,95,95,49,57,95,95,110,117,109,95,103,101,116,73,99,69,69,0,0,0,78,83,116,51,95,95,49,49,52,95,95,110,117,109,95,103,101,116,95,98,97,115,101,69,0,0,0,0,0,0,0,0,64,78,0,0,8,59,0,0,200,78,0,0,240,58,0,0,0,0,0,0,1,0,0,0,40,59,0,0,0,0,0,0,200,78,0,0,168,58,0,0,0,0,0,0,2,0,0,0,88,50,0,0,2,0,0,0,48,59,0,0,0,0,0,0,78,83,116,51,95,95,49,55,110,117,109,95,103,101,116,73,119,78,83,95,49,57,105,115,116,114,101,97,109,98,117,102,95,105,116,101,114,97,116,111,114,73,119,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,119,69,69,69,69,69,69,0,0,0,0,0,78,83,116,51,95,95,49,57,95,95,110,117,109,95,103,101,116,73,119,69,69,0,0,0,200,78,0,0,176,59,0,0,0,0,0,0,1,0,0,0,40,59,0,0,0,0,0,0,200,78,0,0,104,59,0,0,0,0,0,0,2,0,0,0,88,50,0,0,2,0,0,0,200,59,0,0,0,0,0,0,78,83,116,51,95,95,49,55,110,117,109,95,112,117,116,73,99,78,83,95,49,57,111,115,116,114,101,97,109,98,117,102,95,105,116,101,114,97,116,111,114,73,99,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,99,69,69,69,69,69,69,0,0,0,0,0,78,83,116,51,95,95,49,57,95,95,110,117,109,95,112,117,116,73,99,69,69,0,0,0,78,83,116,51,95,95,49,49,52,95,95,110,117,109,95,112,117,116,95,98,97,115,101,69,0,0,0,0,0,0,0,0,64,78,0,0,96,60,0,0,200,78,0,0,72,60,0,0,0,0,0,0,1,0,0,0,128,60,0,0,0,0,0,0,200,78,0,0,0,60,0,0,0,0,0,0,2,0,0,0,88,50,0,0,2,0,0,0,136,60,0,0,0,0,0,0,78,83,116,51,95,95,49,55,110,117,109,95,112,117,116,73,119,78,83,95,49,57,111,115,116,114,101,97,109,98,117,102,95,105,116,101,114,97,116,111,114,73,119,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,119,69,69,69,69,69,69,0,0,0,0,0,78,83,116,51,95,95,49,57,95,95,110,117,109,95,112,117,116,73,119,69,69,0,0,0,200,78,0,0,8,61,0,0,0,0,0,0,1,0,0,0,128,60,0,0,0,0,0,0,200,78,0,0,192,60,0,0,0,0,0,0,2,0,0,0,88,50,0,0,2,0,0,0,32,61,0,0,0,0,0,0,78,83,116,51,95,95,49,57,109,111,110,101,121,95,103,101,116,73,99,78,83,95,49,57,105,115,116,114,101,97,109,98,117,102,95,105,116,101,114,97,116,111,114,73,99,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,99,69,69,69,69,69,69,0,0,0,78,83,116,51,95,95,49,49,49,95,95,109,111,110,101,121,95,103,101,116,73,99,69,69,0,0,0,0,0,0,0,0,64,78,0,0,160,61,0,0,200,78,0,0,88,61,0,0,0,0,0,0,2,0,0,0,88,50,0,0,2,0,0,0,192,61,0,0,0,0,0,0,78,83,116,51,95,95,49,57,109,111,110,101,121,95,103,101,116,73,119,78,83,95,49,57,105,115,116,114,101,97,109,98,117,102,95,105,116,101,114,97,116,111,114,73,119,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,119,69,69,69,69,69,69,0,0,0,78,83,116,51,95,95,49,49,49,95,95,109,111,110,101,121,95,103,101,116,73,119,69,69,0,0,0,0,0,0,0,0,64,78,0,0,48,62,0,0,200,78,0,0,232,61,0,0,0,0,0,0,2,0,0,0,88,50,0,0,2,0,0,0,80,62,0,0,0,0,0,0,78,83,116,51,95,95,49,57,109,111,110,101,121,95,112,117,116,73,99,78,83,95,49,57,111,115,116,114,101,97,109,98,117,102,95,105,116,101,114,97,116,111,114,73,99,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,99,69,69,69,69,69,69,0,0,0,78,83,116,51,95,95,49,49,49,95,95,109,111,110,101,121,95,112,117,116,73,99,69,69,0,0,0,0,0,0,0,0,64,78,0,0,192,62,0,0,200,78,0,0,120,62,0,0,0,0,0,0,2,0,0,0,88,50,0,0,2,0,0,0,224,62,0,0,0,0,0,0,78,83,116,51,95,95,49,57,109,111,110,101,121,95,112,117,116,73,119,78,83,95,49,57,111,115,116,114,101,97,109,98,117,102,95,105,116,101,114,97,116,111,114,73,119,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,119,69,69,69,69,69,69,0,0,0,78,83,116,51,95,95,49,49,49,95,95,109,111,110,101,121,95,112,117,116,73,119,69,69,0,0,0,0,0,0,0,0,64,78,0,0,80,63,0,0,200,78,0,0,8,63,0,0,0,0,0,0,2,0,0,0,88,50,0,0,2,0,0,0,112,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,65,0,0,0,77,0,0,0,0,0,0,0,0,0,0,0,80,0,0,0,77,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,65,77,0,0,0,0,0,0,80,77,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,74,0,0,0,97,0,0,0,110,0,0,0,117,0,0,0,97,0,0,0,114,0,0,0,121,0,0,0,0,0,0,0,70,0,0,0,101,0,0,0,98,0,0,0,114,0,0,0,117,0,0,0,97,0,0,0,114,0,0,0,121,0,0,0,0,0,0,0,0,0,0,0,77,0,0,0,97,0,0,0,114,0,0,0,99,0,0,0,104,0,0,0,0,0,0,0,65,0,0,0,112,0,0,0,114,0,0,0,105,0,0,0,108,0,0,0,0,0,0,0,74,0,0,0,117,0,0,0,110,0,0,0,101,0,0,0,0,0,0,0,0,0,0,0,74,0,0,0,117,0,0,0,108,0,0,0,121,0,0,0,0,0,0,0,0,0,0,0,65,0,0,0,117,0,0,0,103,0,0,0,117,0,0,0,115,0,0,0,116,0,0,0,0,0,0,0,0,0,0,0,83,0,0,0,101,0,0,0,112,0,0,0,116,0,0,0,101,0,0,0,109,0,0,0,98,0,0,0,101,0,0,0,114,0,0,0,0,0,0,0,79,0,0,0,99,0,0,0,116,0,0,0,111,0,0,0,98,0,0,0,101,0,0,0,114,0,0,0,0,0,0,0,78,0,0,0,111,0,0,0,118,0,0,0,101,0,0,0,109,0,0,0,98,0,0,0,101,0,0,0,114,0,0,0,0,0,0,0,0,0,0,0,68,0,0,0,101,0,0,0,99,0,0,0,101,0,0,0,109,0,0,0,98,0,0,0,101,0,0,0,114,0,0,0,0,0,0,0,0,0,0,0,74,0,0,0,97,0,0,0,110,0,0,0,0,0,0,0,70,0,0,0,101,0,0,0,98,0,0,0,0,0,0,0,77,0,0,0,97,0,0,0,114,0,0,0,0,0,0,0,65,0,0,0,112,0,0,0,114,0,0,0,0,0,0,0,77,0,0,0,97,0,0,0,121,0,0,0,0,0,0,0,74,0,0,0,117,0,0,0,110,0,0,0,0,0,0,0,74,0,0,0,117,0,0,0,108,0,0,0,0,0,0,0,65,0,0,0,117,0,0,0,103,0,0,0,0,0,0,0,83,0,0,0,101,0,0,0,112,0,0,0,0,0,0,0,79,0,0,0,99,0,0,0,116,0,0,0,0,0,0,0,78,0,0,0,111,0,0,0,118,0,0,0,0,0,0,0,68,0,0,0,101,0,0,0,99], "i8", ALLOC_NONE, Runtime.GLOBAL_BASE+8260);
/* memory initializer */ allocate([74,97,110,117,97,114,121,0,70,101,98,114,117,97,114,121,0,0,0,0,0,0,0,0,77,97,114,99,104,0,0,0,65,112,114,105,108,0,0,0,77,97,121,0,0,0,0,0,74,117,110,101,0,0,0,0,74,117,108,121,0,0,0,0,65,117,103,117,115,116,0,0,83,101,112,116,101,109,98,101,114,0,0,0,0,0,0,0,79,99,116,111,98,101,114,0,78,111,118,101,109,98,101,114,0,0,0,0,0,0,0,0,68,101,99,101,109,98,101,114,0,0,0,0,0,0,0,0,74,97,110,0,0,0,0,0,70,101,98,0,0,0,0,0,77,97,114,0,0,0,0,0,65,112,114,0,0,0,0,0,74,117,110,0,0,0,0,0,74,117,108,0,0,0,0,0,65,117,103,0,0,0,0,0,83,101,112,0,0,0,0,0,79,99,116,0,0,0,0,0,78,111,118,0,0,0,0,0,68,101,99,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,83,0,0,0,117,0,0,0,110,0,0,0,100,0,0,0,97,0,0,0,121,0,0,0,0,0,0,0,0,0,0,0,77,0,0,0,111,0,0,0,110,0,0,0,100,0,0,0,97,0,0,0,121,0,0,0,0,0,0,0,0,0,0,0,84,0,0,0,117,0,0,0,101,0,0,0,115,0,0,0,100,0,0,0,97,0,0,0,121,0,0,0,0,0,0,0,87,0,0,0,101,0,0,0,100,0,0,0,110,0,0,0,101,0,0,0,115,0,0,0,100,0,0,0,97,0,0,0,121,0,0,0,0,0,0,0,84,0,0,0,104,0,0,0,117,0,0,0,114,0,0,0,115,0,0,0,100,0,0,0,97,0,0,0,121,0,0,0,0,0,0,0,0,0,0,0,70,0,0,0,114,0,0,0,105,0,0,0,100,0,0,0,97,0,0,0,121,0,0,0,0,0,0,0,0,0,0,0,83,0,0,0,97,0,0,0,116,0,0,0,117,0,0,0,114,0,0,0,100,0,0,0,97,0,0,0,121,0,0,0,0,0,0,0,0,0,0,0,83,0,0,0,117,0,0,0,110,0,0,0,0,0,0,0,77,0,0,0,111,0,0,0,110,0,0,0,0,0,0,0,84,0,0,0,117,0,0,0,101,0,0,0,0,0,0,0,87,0,0,0,101,0,0,0,100,0,0,0,0,0,0,0,84,0,0,0,104,0,0,0,117,0,0,0,0,0,0,0,70,0,0,0,114,0,0,0,105,0,0,0,0,0,0,0,83,0,0,0,97,0,0,0,116,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,83,117,110,100,97,121,0,0,77,111,110,100,97,121,0,0,84,117,101,115,100,97,121,0,87,101,100,110,101,115,100,97,121,0,0,0,0,0,0,0,84,104,117,114,115,100,97,121,0,0,0,0,0,0,0,0,70,114,105,100,97,121,0,0,83,97,116,117,114,100,97,121,0,0,0,0,0,0,0,0,83,117,110,0,0,0,0,0,77,111,110,0,0,0,0,0,84,117,101,0,0,0,0,0,87,101,100,0,0,0,0,0,84,104,117,0,0,0,0,0,70,114,105,0,0,0,0,0,83,97,116,0,0,0,0,0,2,0,0,192,3,0,0,192,4,0,0,192,5,0,0,192,6,0,0,192,7,0,0,192,8,0,0,192,9,0,0,192,10,0,0,192,11,0,0,192,12,0,0,192,13,0,0,192,14,0,0,192,15,0,0,192,16,0,0,192,17,0,0,192,18,0,0,192,19,0,0,192,20,0,0,192,21,0,0,192,22,0,0,192,23,0,0,192,24,0,0,192,25,0,0,192,26,0,0,192,27,0,0,192,28,0,0,192,29,0,0,192,30,0,0,192,31,0,0,192,0,0,0,179,1,0,0,195,2,0,0,195,3,0,0,195,4,0,0,195,5,0,0,195,6,0,0,195,7,0,0,195,8,0,0,195,9,0,0,195,10,0,0,195,11,0,0,195,12,0,0,195,13,0,0,211,14,0,0,195,15,0,0,195,0,0,12,187,1,0,12,195,2,0,12,195,3,0,12,195,4,0,12,211,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,184,77,0,0,130,0,0,0,131,0,0,0,78,0,0,0,0,0,0,0,115,116,100,58,58,98,97,100,95,99,97,115,116,0,0,0,83,116,57,116,121,112,101,95,105,110,102,111,0,0,0,0,64,78,0,0,144,77,0,0,83,116,56,98,97,100,95,99,97,115,116,0,0,0,0,0,104,78,0,0,168,77,0,0,0,0,0,0,0,0,0,0,78,49,48,95,95,99,120,120,97,98,105,118,49,49,54,95,95,115,104,105,109,95,116,121,112,101,95,105,110,102,111,69,0,0,0,0,0,0,0,0,104,78,0,0,200,77,0,0,160,77,0,0,0,0,0,0,78,49,48,95,95,99,120,120,97,98,105,118,49,49,55,95,95,99,108,97,115,115,95,116,121,112,101,95,105,110,102,111,69,0,0,0,0,0,0,0,104,78,0,0,0,78,0,0,240,77,0,0,0,0,0,0,0,0,0,0,40,78,0,0,132,0,0,0,133,0,0,0,134,0,0,0,135,0,0,0,28,0,0,0,14,0,0,0,1,0,0,0,6,0,0,0,0,0,0,0,176,78,0,0,132,0,0,0,136,0,0,0,134,0,0,0,135,0,0,0,28,0,0,0,15,0,0,0,2,0,0,0,7,0,0,0,78,49,48,95,95,99,120,120,97,98,105,118,49,50,48,95,95,115,105,95,99,108,97,115,115,95,116,121,112,101,95,105,110,102,111,69,0,0,0,0,104,78,0,0,136,78,0,0,40,78,0,0,0,0,0,0,0,0,0,0,16,79,0,0,132,0,0,0,137,0,0,0,134,0,0,0,135,0,0,0,28,0,0,0,16,0,0,0,3,0,0,0,8,0,0,0,78,49,48,95,95,99,120,120,97,98,105,118,49,50,49,95,95,118,109,105,95,99,108,97,115,115,95,116,121,112,101,95,105,110,102,111,69,0,0,0,104,78,0,0,232,78,0,0,40,78,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,80,81,0,0,138,0,0,0,139,0,0,0,79,0,0,0,0,0,0,0,115,116,100,58,58,98,97,100,95,97,108,108,111,99,0,0,83,116,57,98,97,100,95,97,108,108,111,99,0,0,0,0,104,78,0,0,64,81,0,0,0,0,0,0,0,0,0,0,105,110,102,105,110,105,116,121,0,0,0,0,0,0,0,0,110,97,110,0,0,0,0,0,95,112,137,0,255,9,47,15,10,0,0,0,100,0,0,0,232,3,0,0,16,39,0,0,160,134,1,0,64,66,15,0,128,150,152,0,0,225,245,5], "i8", ALLOC_NONE, Runtime.GLOBAL_BASE+18520);




var tempDoublePtr = Runtime.alignMemory(allocate(12, "i8", ALLOC_STATIC), 8);

assert(tempDoublePtr % 8 == 0);

function copyTempFloat(ptr) { // functions, because inlining this code increases code size too much

  HEAP8[tempDoublePtr] = HEAP8[ptr];

  HEAP8[tempDoublePtr+1] = HEAP8[ptr+1];

  HEAP8[tempDoublePtr+2] = HEAP8[ptr+2];

  HEAP8[tempDoublePtr+3] = HEAP8[ptr+3];

}

function copyTempDouble(ptr) {

  HEAP8[tempDoublePtr] = HEAP8[ptr];

  HEAP8[tempDoublePtr+1] = HEAP8[ptr+1];

  HEAP8[tempDoublePtr+2] = HEAP8[ptr+2];

  HEAP8[tempDoublePtr+3] = HEAP8[ptr+3];

  HEAP8[tempDoublePtr+4] = HEAP8[ptr+4];

  HEAP8[tempDoublePtr+5] = HEAP8[ptr+5];

  HEAP8[tempDoublePtr+6] = HEAP8[ptr+6];

  HEAP8[tempDoublePtr+7] = HEAP8[ptr+7];

}


  
  function _atexit(func, arg) {
      __ATEXIT__.unshift({ func: func, arg: arg });
    }var ___cxa_atexit=_atexit;

  
  
  var ERRNO_CODES={EPERM:1,ENOENT:2,ESRCH:3,EINTR:4,EIO:5,ENXIO:6,E2BIG:7,ENOEXEC:8,EBADF:9,ECHILD:10,EAGAIN:11,EWOULDBLOCK:11,ENOMEM:12,EACCES:13,EFAULT:14,ENOTBLK:15,EBUSY:16,EEXIST:17,EXDEV:18,ENODEV:19,ENOTDIR:20,EISDIR:21,EINVAL:22,ENFILE:23,EMFILE:24,ENOTTY:25,ETXTBSY:26,EFBIG:27,ENOSPC:28,ESPIPE:29,EROFS:30,EMLINK:31,EPIPE:32,EDOM:33,ERANGE:34,ENOMSG:42,EIDRM:43,ECHRNG:44,EL2NSYNC:45,EL3HLT:46,EL3RST:47,ELNRNG:48,EUNATCH:49,ENOCSI:50,EL2HLT:51,EDEADLK:35,ENOLCK:37,EBADE:52,EBADR:53,EXFULL:54,ENOANO:55,EBADRQC:56,EBADSLT:57,EDEADLOCK:35,EBFONT:59,ENOSTR:60,ENODATA:61,ETIME:62,ENOSR:63,ENONET:64,ENOPKG:65,EREMOTE:66,ENOLINK:67,EADV:68,ESRMNT:69,ECOMM:70,EPROTO:71,EMULTIHOP:72,EDOTDOT:73,EBADMSG:74,ENOTUNIQ:76,EBADFD:77,EREMCHG:78,ELIBACC:79,ELIBBAD:80,ELIBSCN:81,ELIBMAX:82,ELIBEXEC:83,ENOSYS:38,ENOTEMPTY:39,ENAMETOOLONG:36,ELOOP:40,EOPNOTSUPP:95,EPFNOSUPPORT:96,ECONNRESET:104,ENOBUFS:105,EAFNOSUPPORT:97,EPROTOTYPE:91,ENOTSOCK:88,ENOPROTOOPT:92,ESHUTDOWN:108,ECONNREFUSED:111,EADDRINUSE:98,ECONNABORTED:103,ENETUNREACH:101,ENETDOWN:100,ETIMEDOUT:110,EHOSTDOWN:112,EHOSTUNREACH:113,EINPROGRESS:115,EALREADY:114,EDESTADDRREQ:89,EMSGSIZE:90,EPROTONOSUPPORT:93,ESOCKTNOSUPPORT:94,EADDRNOTAVAIL:99,ENETRESET:102,EISCONN:106,ENOTCONN:107,ETOOMANYREFS:109,EUSERS:87,EDQUOT:122,ESTALE:116,ENOTSUP:95,ENOMEDIUM:123,EILSEQ:84,EOVERFLOW:75,ECANCELED:125,ENOTRECOVERABLE:131,EOWNERDEAD:130,ESTRPIPE:86};
  
  var ERRNO_MESSAGES={0:"Success",1:"Not super-user",2:"No such file or directory",3:"No such process",4:"Interrupted system call",5:"I/O error",6:"No such device or address",7:"Arg list too long",8:"Exec format error",9:"Bad file number",10:"No children",11:"No more processes",12:"Not enough core",13:"Permission denied",14:"Bad address",15:"Block device required",16:"Mount device busy",17:"File exists",18:"Cross-device link",19:"No such device",20:"Not a directory",21:"Is a directory",22:"Invalid argument",23:"Too many open files in system",24:"Too many open files",25:"Not a typewriter",26:"Text file busy",27:"File too large",28:"No space left on device",29:"Illegal seek",30:"Read only file system",31:"Too many links",32:"Broken pipe",33:"Math arg out of domain of func",34:"Math result not representable",35:"File locking deadlock error",36:"File or path name too long",37:"No record locks available",38:"Function not implemented",39:"Directory not empty",40:"Too many symbolic links",42:"No message of desired type",43:"Identifier removed",44:"Channel number out of range",45:"Level 2 not synchronized",46:"Level 3 halted",47:"Level 3 reset",48:"Link number out of range",49:"Protocol driver not attached",50:"No CSI structure available",51:"Level 2 halted",52:"Invalid exchange",53:"Invalid request descriptor",54:"Exchange full",55:"No anode",56:"Invalid request code",57:"Invalid slot",59:"Bad font file fmt",60:"Device not a stream",61:"No data (for no delay io)",62:"Timer expired",63:"Out of streams resources",64:"Machine is not on the network",65:"Package not installed",66:"The object is remote",67:"The link has been severed",68:"Advertise error",69:"Srmount error",70:"Communication error on send",71:"Protocol error",72:"Multihop attempted",73:"Cross mount point (not really error)",74:"Trying to read unreadable message",75:"Value too large for defined data type",76:"Given log. name not unique",77:"f.d. invalid for this operation",78:"Remote address changed",79:"Can   access a needed shared lib",80:"Accessing a corrupted shared lib",81:".lib section in a.out corrupted",82:"Attempting to link in too many libs",83:"Attempting to exec a shared library",84:"Illegal byte sequence",86:"Streams pipe error",87:"Too many users",88:"Socket operation on non-socket",89:"Destination address required",90:"Message too long",91:"Protocol wrong type for socket",92:"Protocol not available",93:"Unknown protocol",94:"Socket type not supported",95:"Not supported",96:"Protocol family not supported",97:"Address family not supported by protocol family",98:"Address already in use",99:"Address not available",100:"Network interface is not configured",101:"Network is unreachable",102:"Connection reset by network",103:"Connection aborted",104:"Connection reset by peer",105:"No buffer space available",106:"Socket is already connected",107:"Socket is not connected",108:"Can't send after socket shutdown",109:"Too many references",110:"Connection timed out",111:"Connection refused",112:"Host is down",113:"Host is unreachable",114:"Socket already connected",115:"Connection already in progress",116:"Stale file handle",122:"Quota exceeded",123:"No medium (in tape drive)",125:"Operation canceled",130:"Previous owner died",131:"State not recoverable"};
  
  
  var ___errno_state=0;function ___setErrNo(value) {
      // For convenient setting and returning of errno.
      HEAP32[((___errno_state)>>2)]=value;
      return value;
    }
  
  var PATH={splitPath:function (filename) {
        var splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
        return splitPathRe.exec(filename).slice(1);
      },normalizeArray:function (parts, allowAboveRoot) {
        // if the path tries to go above the root, `up` ends up > 0
        var up = 0;
        for (var i = parts.length - 1; i >= 0; i--) {
          var last = parts[i];
          if (last === '.') {
            parts.splice(i, 1);
          } else if (last === '..') {
            parts.splice(i, 1);
            up++;
          } else if (up) {
            parts.splice(i, 1);
            up--;
          }
        }
        // if the path is allowed to go above the root, restore leading ..s
        if (allowAboveRoot) {
          for (; up--; up) {
            parts.unshift('..');
          }
        }
        return parts;
      },normalize:function (path) {
        var isAbsolute = path.charAt(0) === '/',
            trailingSlash = path.substr(-1) === '/';
        // Normalize the path
        path = PATH.normalizeArray(path.split('/').filter(function(p) {
          return !!p;
        }), !isAbsolute).join('/');
        if (!path && !isAbsolute) {
          path = '.';
        }
        if (path && trailingSlash) {
          path += '/';
        }
        return (isAbsolute ? '/' : '') + path;
      },dirname:function (path) {
        var result = PATH.splitPath(path),
            root = result[0],
            dir = result[1];
        if (!root && !dir) {
          // No dirname whatsoever
          return '.';
        }
        if (dir) {
          // It has a dirname, strip trailing slash
          dir = dir.substr(0, dir.length - 1);
        }
        return root + dir;
      },basename:function (path) {
        // EMSCRIPTEN return '/'' for '/', not an empty string
        if (path === '/') return '/';
        var lastSlash = path.lastIndexOf('/');
        if (lastSlash === -1) return path;
        return path.substr(lastSlash+1);
      },extname:function (path) {
        return PATH.splitPath(path)[3];
      },join:function () {
        var paths = Array.prototype.slice.call(arguments, 0);
        return PATH.normalize(paths.join('/'));
      },join2:function (l, r) {
        return PATH.normalize(l + '/' + r);
      },resolve:function () {
        var resolvedPath = '',
          resolvedAbsolute = false;
        for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
          var path = (i >= 0) ? arguments[i] : FS.cwd();
          // Skip empty and invalid entries
          if (typeof path !== 'string') {
            throw new TypeError('Arguments to path.resolve must be strings');
          } else if (!path) {
            continue;
          }
          resolvedPath = path + '/' + resolvedPath;
          resolvedAbsolute = path.charAt(0) === '/';
        }
        // At this point the path should be resolved to a full absolute path, but
        // handle relative paths to be safe (might happen when process.cwd() fails)
        resolvedPath = PATH.normalizeArray(resolvedPath.split('/').filter(function(p) {
          return !!p;
        }), !resolvedAbsolute).join('/');
        return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
      },relative:function (from, to) {
        from = PATH.resolve(from).substr(1);
        to = PATH.resolve(to).substr(1);
        function trim(arr) {
          var start = 0;
          for (; start < arr.length; start++) {
            if (arr[start] !== '') break;
          }
          var end = arr.length - 1;
          for (; end >= 0; end--) {
            if (arr[end] !== '') break;
          }
          if (start > end) return [];
          return arr.slice(start, end - start + 1);
        }
        var fromParts = trim(from.split('/'));
        var toParts = trim(to.split('/'));
        var length = Math.min(fromParts.length, toParts.length);
        var samePartsLength = length;
        for (var i = 0; i < length; i++) {
          if (fromParts[i] !== toParts[i]) {
            samePartsLength = i;
            break;
          }
        }
        var outputParts = [];
        for (var i = samePartsLength; i < fromParts.length; i++) {
          outputParts.push('..');
        }
        outputParts = outputParts.concat(toParts.slice(samePartsLength));
        return outputParts.join('/');
      }};
  
  var TTY={ttys:[],init:function () {
        // https://github.com/kripken/emscripten/pull/1555
        // if (ENVIRONMENT_IS_NODE) {
        //   // currently, FS.init does not distinguish if process.stdin is a file or TTY
        //   // device, it always assumes it's a TTY device. because of this, we're forcing
        //   // process.stdin to UTF8 encoding to at least make stdin reading compatible
        //   // with text files until FS.init can be refactored.
        //   process['stdin']['setEncoding']('utf8');
        // }
      },shutdown:function () {
        // https://github.com/kripken/emscripten/pull/1555
        // if (ENVIRONMENT_IS_NODE) {
        //   // inolen: any idea as to why node -e 'process.stdin.read()' wouldn't exit immediately (with process.stdin being a tty)?
        //   // isaacs: because now it's reading from the stream, you've expressed interest in it, so that read() kicks off a _read() which creates a ReadReq operation
        //   // inolen: I thought read() in that case was a synchronous operation that just grabbed some amount of buffered data if it exists?
        //   // isaacs: it is. but it also triggers a _read() call, which calls readStart() on the handle
        //   // isaacs: do process.stdin.pause() and i'd think it'd probably close the pending call
        //   process['stdin']['pause']();
        // }
      },register:function (dev, ops) {
        TTY.ttys[dev] = { input: [], output: [], ops: ops };
        FS.registerDevice(dev, TTY.stream_ops);
      },stream_ops:{open:function (stream) {
          var tty = TTY.ttys[stream.node.rdev];
          if (!tty) {
            throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
          }
          stream.tty = tty;
          stream.seekable = false;
        },close:function (stream) {
          // flush any pending line data
          if (stream.tty.output.length) {
            stream.tty.ops.put_char(stream.tty, 10);
          }
        },read:function (stream, buffer, offset, length, pos /* ignored */) {
          if (!stream.tty || !stream.tty.ops.get_char) {
            throw new FS.ErrnoError(ERRNO_CODES.ENXIO);
          }
          var bytesRead = 0;
          for (var i = 0; i < length; i++) {
            var result;
            try {
              result = stream.tty.ops.get_char(stream.tty);
            } catch (e) {
              throw new FS.ErrnoError(ERRNO_CODES.EIO);
            }
            if (result === undefined && bytesRead === 0) {
              throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
            }
            if (result === null || result === undefined) break;
            bytesRead++;
            buffer[offset+i] = result;
          }
          if (bytesRead) {
            stream.node.timestamp = Date.now();
          }
          return bytesRead;
        },write:function (stream, buffer, offset, length, pos) {
          if (!stream.tty || !stream.tty.ops.put_char) {
            throw new FS.ErrnoError(ERRNO_CODES.ENXIO);
          }
          for (var i = 0; i < length; i++) {
            try {
              stream.tty.ops.put_char(stream.tty, buffer[offset+i]);
            } catch (e) {
              throw new FS.ErrnoError(ERRNO_CODES.EIO);
            }
          }
          if (length) {
            stream.node.timestamp = Date.now();
          }
          return i;
        }},default_tty_ops:{get_char:function (tty) {
          if (!tty.input.length) {
            var result = null;
            if (ENVIRONMENT_IS_NODE) {
              result = process['stdin']['read']();
              if (!result) {
                if (process['stdin']['_readableState'] && process['stdin']['_readableState']['ended']) {
                  return null;  // EOF
                }
                return undefined;  // no data available
              }
            } else if (typeof window != 'undefined' &&
              typeof window.prompt == 'function') {
              // Browser.
              result = window.prompt('Input: ');  // returns null on cancel
              if (result !== null) {
                result += '\n';
              }
            } else if (typeof readline == 'function') {
              // Command line.
              result = readline();
              if (result !== null) {
                result += '\n';
              }
            }
            if (!result) {
              return null;
            }
            tty.input = intArrayFromString(result, true);
          }
          return tty.input.shift();
        },put_char:function (tty, val) {
          if (val === null || val === 10) {
            Module['print'](tty.output.join(''));
            tty.output = [];
          } else {
            tty.output.push(TTY.utf8.processCChar(val));
          }
        }},default_tty1_ops:{put_char:function (tty, val) {
          if (val === null || val === 10) {
            Module['printErr'](tty.output.join(''));
            tty.output = [];
          } else {
            tty.output.push(TTY.utf8.processCChar(val));
          }
        }}};
  
  var MEMFS={ops_table:null,CONTENT_OWNING:1,CONTENT_FLEXIBLE:2,CONTENT_FIXED:3,mount:function (mount) {
        return MEMFS.createNode(null, '/', 16384 | 511 /* 0777 */, 0);
      },createNode:function (parent, name, mode, dev) {
        if (FS.isBlkdev(mode) || FS.isFIFO(mode)) {
          // no supported
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (!MEMFS.ops_table) {
          MEMFS.ops_table = {
            dir: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr,
                lookup: MEMFS.node_ops.lookup,
                mknod: MEMFS.node_ops.mknod,
                rename: MEMFS.node_ops.rename,
                unlink: MEMFS.node_ops.unlink,
                rmdir: MEMFS.node_ops.rmdir,
                readdir: MEMFS.node_ops.readdir,
                symlink: MEMFS.node_ops.symlink
              },
              stream: {
                llseek: MEMFS.stream_ops.llseek
              }
            },
            file: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr
              },
              stream: {
                llseek: MEMFS.stream_ops.llseek,
                read: MEMFS.stream_ops.read,
                write: MEMFS.stream_ops.write,
                allocate: MEMFS.stream_ops.allocate,
                mmap: MEMFS.stream_ops.mmap
              }
            },
            link: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr,
                readlink: MEMFS.node_ops.readlink
              },
              stream: {}
            },
            chrdev: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr
              },
              stream: FS.chrdev_stream_ops
            },
          };
        }
        var node = FS.createNode(parent, name, mode, dev);
        if (FS.isDir(node.mode)) {
          node.node_ops = MEMFS.ops_table.dir.node;
          node.stream_ops = MEMFS.ops_table.dir.stream;
          node.contents = {};
        } else if (FS.isFile(node.mode)) {
          node.node_ops = MEMFS.ops_table.file.node;
          node.stream_ops = MEMFS.ops_table.file.stream;
          node.contents = [];
          node.contentMode = MEMFS.CONTENT_FLEXIBLE;
        } else if (FS.isLink(node.mode)) {
          node.node_ops = MEMFS.ops_table.link.node;
          node.stream_ops = MEMFS.ops_table.link.stream;
        } else if (FS.isChrdev(node.mode)) {
          node.node_ops = MEMFS.ops_table.chrdev.node;
          node.stream_ops = MEMFS.ops_table.chrdev.stream;
        }
        node.timestamp = Date.now();
        // add the new node to the parent
        if (parent) {
          parent.contents[name] = node;
        }
        return node;
      },ensureFlexible:function (node) {
        if (node.contentMode !== MEMFS.CONTENT_FLEXIBLE) {
          var contents = node.contents;
          node.contents = Array.prototype.slice.call(contents);
          node.contentMode = MEMFS.CONTENT_FLEXIBLE;
        }
      },node_ops:{getattr:function (node) {
          var attr = {};
          // device numbers reuse inode numbers.
          attr.dev = FS.isChrdev(node.mode) ? node.id : 1;
          attr.ino = node.id;
          attr.mode = node.mode;
          attr.nlink = 1;
          attr.uid = 0;
          attr.gid = 0;
          attr.rdev = node.rdev;
          if (FS.isDir(node.mode)) {
            attr.size = 4096;
          } else if (FS.isFile(node.mode)) {
            attr.size = node.contents.length;
          } else if (FS.isLink(node.mode)) {
            attr.size = node.link.length;
          } else {
            attr.size = 0;
          }
          attr.atime = new Date(node.timestamp);
          attr.mtime = new Date(node.timestamp);
          attr.ctime = new Date(node.timestamp);
          // NOTE: In our implementation, st_blocks = Math.ceil(st_size/st_blksize),
          //       but this is not required by the standard.
          attr.blksize = 4096;
          attr.blocks = Math.ceil(attr.size / attr.blksize);
          return attr;
        },setattr:function (node, attr) {
          if (attr.mode !== undefined) {
            node.mode = attr.mode;
          }
          if (attr.timestamp !== undefined) {
            node.timestamp = attr.timestamp;
          }
          if (attr.size !== undefined) {
            MEMFS.ensureFlexible(node);
            var contents = node.contents;
            if (attr.size < contents.length) contents.length = attr.size;
            else while (attr.size > contents.length) contents.push(0);
          }
        },lookup:function (parent, name) {
          throw FS.genericErrors[ERRNO_CODES.ENOENT];
        },mknod:function (parent, name, mode, dev) {
          return MEMFS.createNode(parent, name, mode, dev);
        },rename:function (old_node, new_dir, new_name) {
          // if we're overwriting a directory at new_name, make sure it's empty.
          if (FS.isDir(old_node.mode)) {
            var new_node;
            try {
              new_node = FS.lookupNode(new_dir, new_name);
            } catch (e) {
            }
            if (new_node) {
              for (var i in new_node.contents) {
                throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY);
              }
            }
          }
          // do the internal rewiring
          delete old_node.parent.contents[old_node.name];
          old_node.name = new_name;
          new_dir.contents[new_name] = old_node;
          old_node.parent = new_dir;
        },unlink:function (parent, name) {
          delete parent.contents[name];
        },rmdir:function (parent, name) {
          var node = FS.lookupNode(parent, name);
          for (var i in node.contents) {
            throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY);
          }
          delete parent.contents[name];
        },readdir:function (node) {
          var entries = ['.', '..']
          for (var key in node.contents) {
            if (!node.contents.hasOwnProperty(key)) {
              continue;
            }
            entries.push(key);
          }
          return entries;
        },symlink:function (parent, newname, oldpath) {
          var node = MEMFS.createNode(parent, newname, 511 /* 0777 */ | 40960, 0);
          node.link = oldpath;
          return node;
        },readlink:function (node) {
          if (!FS.isLink(node.mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
          return node.link;
        }},stream_ops:{read:function (stream, buffer, offset, length, position) {
          var contents = stream.node.contents;
          if (position >= contents.length)
            return 0;
          var size = Math.min(contents.length - position, length);
          assert(size >= 0);
          if (size > 8 && contents.subarray) { // non-trivial, and typed array
            buffer.set(contents.subarray(position, position + size), offset);
          } else
          {
            for (var i = 0; i < size; i++) {
              buffer[offset + i] = contents[position + i];
            }
          }
          return size;
        },write:function (stream, buffer, offset, length, position, canOwn) {
          var node = stream.node;
          node.timestamp = Date.now();
          var contents = node.contents;
          if (length && contents.length === 0 && position === 0 && buffer.subarray) {
            // just replace it with the new data
            if (canOwn && offset === 0) {
              node.contents = buffer; // this could be a subarray of Emscripten HEAP, or allocated from some other source.
              node.contentMode = (buffer.buffer === HEAP8.buffer) ? MEMFS.CONTENT_OWNING : MEMFS.CONTENT_FIXED;
            } else {
              node.contents = new Uint8Array(buffer.subarray(offset, offset+length));
              node.contentMode = MEMFS.CONTENT_FIXED;
            }
            return length;
          }
          MEMFS.ensureFlexible(node);
          var contents = node.contents;
          while (contents.length < position) contents.push(0);
          for (var i = 0; i < length; i++) {
            contents[position + i] = buffer[offset + i];
          }
          return length;
        },llseek:function (stream, offset, whence) {
          var position = offset;
          if (whence === 1) {  // SEEK_CUR.
            position += stream.position;
          } else if (whence === 2) {  // SEEK_END.
            if (FS.isFile(stream.node.mode)) {
              position += stream.node.contents.length;
            }
          }
          if (position < 0) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
          stream.ungotten = [];
          stream.position = position;
          return position;
        },allocate:function (stream, offset, length) {
          MEMFS.ensureFlexible(stream.node);
          var contents = stream.node.contents;
          var limit = offset + length;
          while (limit > contents.length) contents.push(0);
        },mmap:function (stream, buffer, offset, length, position, prot, flags) {
          if (!FS.isFile(stream.node.mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
          }
          var ptr;
          var allocated;
          var contents = stream.node.contents;
          // Only make a new copy when MAP_PRIVATE is specified.
          if ( !(flags & 2) &&
                (contents.buffer === buffer || contents.buffer === buffer.buffer) ) {
            // We can't emulate MAP_SHARED when the file is not backed by the buffer
            // we're mapping to (e.g. the HEAP buffer).
            allocated = false;
            ptr = contents.byteOffset;
          } else {
            // Try to avoid unnecessary slices.
            if (position > 0 || position + length < contents.length) {
              if (contents.subarray) {
                contents = contents.subarray(position, position + length);
              } else {
                contents = Array.prototype.slice.call(contents, position, position + length);
              }
            }
            allocated = true;
            ptr = _malloc(length);
            if (!ptr) {
              throw new FS.ErrnoError(ERRNO_CODES.ENOMEM);
            }
            buffer.set(contents, ptr);
          }
          return { ptr: ptr, allocated: allocated };
        }}};
  
  var IDBFS={dbs:{},indexedDB:function () {
        return window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
      },DB_VERSION:21,DB_STORE_NAME:"FILE_DATA",mount:function (mount) {
        // reuse all of the core MEMFS functionality
        return MEMFS.mount.apply(null, arguments);
      },syncfs:function (mount, populate, callback) {
        IDBFS.getLocalSet(mount, function(err, local) {
          if (err) return callback(err);
  
          IDBFS.getRemoteSet(mount, function(err, remote) {
            if (err) return callback(err);
  
            var src = populate ? remote : local;
            var dst = populate ? local : remote;
  
            IDBFS.reconcile(src, dst, callback);
          });
        });
      },getDB:function (name, callback) {
        // check the cache first
        var db = IDBFS.dbs[name];
        if (db) {
          return callback(null, db);
        }
  
        var req;
        try {
          req = IDBFS.indexedDB().open(name, IDBFS.DB_VERSION);
        } catch (e) {
          return callback(e);
        }
        req.onupgradeneeded = function(e) {
          var db = e.target.result;
          var transaction = e.target.transaction;
  
          var fileStore;
  
          if (db.objectStoreNames.contains(IDBFS.DB_STORE_NAME)) {
            fileStore = transaction.objectStore(IDBFS.DB_STORE_NAME);
          } else {
            fileStore = db.createObjectStore(IDBFS.DB_STORE_NAME);
          }
  
          fileStore.createIndex('timestamp', 'timestamp', { unique: false });
        };
        req.onsuccess = function() {
          db = req.result;
  
          // add to the cache
          IDBFS.dbs[name] = db;
          callback(null, db);
        };
        req.onerror = function() {
          callback(this.error);
        };
      },getLocalSet:function (mount, callback) {
        var entries = {};
  
        function isRealDir(p) {
          return p !== '.' && p !== '..';
        };
        function toAbsolute(root) {
          return function(p) {
            return PATH.join2(root, p);
          }
        };
  
        var check = FS.readdir(mount.mountpoint).filter(isRealDir).map(toAbsolute(mount.mountpoint));
  
        while (check.length) {
          var path = check.pop();
          var stat;
  
          try {
            stat = FS.stat(path);
          } catch (e) {
            return callback(e);
          }
  
          if (FS.isDir(stat.mode)) {
            check.push.apply(check, FS.readdir(path).filter(isRealDir).map(toAbsolute(path)));
          }
  
          entries[path] = { timestamp: stat.mtime };
        }
  
        return callback(null, { type: 'local', entries: entries });
      },getRemoteSet:function (mount, callback) {
        var entries = {};
  
        IDBFS.getDB(mount.mountpoint, function(err, db) {
          if (err) return callback(err);
  
          var transaction = db.transaction([IDBFS.DB_STORE_NAME], 'readonly');
          transaction.onerror = function() { callback(this.error); };
  
          var store = transaction.objectStore(IDBFS.DB_STORE_NAME);
          var index = store.index('timestamp');
  
          index.openKeyCursor().onsuccess = function(event) {
            var cursor = event.target.result;
  
            if (!cursor) {
              return callback(null, { type: 'remote', db: db, entries: entries });
            }
  
            entries[cursor.primaryKey] = { timestamp: cursor.key };
  
            cursor.continue();
          };
        });
      },loadLocalEntry:function (path, callback) {
        var stat, node;
  
        try {
          var lookup = FS.lookupPath(path);
          node = lookup.node;
          stat = FS.stat(path);
        } catch (e) {
          return callback(e);
        }
  
        if (FS.isDir(stat.mode)) {
          return callback(null, { timestamp: stat.mtime, mode: stat.mode });
        } else if (FS.isFile(stat.mode)) {
          return callback(null, { timestamp: stat.mtime, mode: stat.mode, contents: node.contents });
        } else {
          return callback(new Error('node type not supported'));
        }
      },storeLocalEntry:function (path, entry, callback) {
        try {
          if (FS.isDir(entry.mode)) {
            FS.mkdir(path, entry.mode);
          } else if (FS.isFile(entry.mode)) {
            FS.writeFile(path, entry.contents, { encoding: 'binary', canOwn: true });
          } else {
            return callback(new Error('node type not supported'));
          }
  
          FS.utime(path, entry.timestamp, entry.timestamp);
        } catch (e) {
          return callback(e);
        }
  
        callback(null);
      },removeLocalEntry:function (path, callback) {
        try {
          var lookup = FS.lookupPath(path);
          var stat = FS.stat(path);
  
          if (FS.isDir(stat.mode)) {
            FS.rmdir(path);
          } else if (FS.isFile(stat.mode)) {
            FS.unlink(path);
          }
        } catch (e) {
          return callback(e);
        }
  
        callback(null);
      },loadRemoteEntry:function (store, path, callback) {
        var req = store.get(path);
        req.onsuccess = function(event) { callback(null, event.target.result); };
        req.onerror = function() { callback(this.error); };
      },storeRemoteEntry:function (store, path, entry, callback) {
        var req = store.put(entry, path);
        req.onsuccess = function() { callback(null); };
        req.onerror = function() { callback(this.error); };
      },removeRemoteEntry:function (store, path, callback) {
        var req = store.delete(path);
        req.onsuccess = function() { callback(null); };
        req.onerror = function() { callback(this.error); };
      },reconcile:function (src, dst, callback) {
        var total = 0;
  
        var create = [];
        Object.keys(src.entries).forEach(function (key) {
          var e = src.entries[key];
          var e2 = dst.entries[key];
          if (!e2 || e.timestamp > e2.timestamp) {
            create.push(key);
            total++;
          }
        });
  
        var remove = [];
        Object.keys(dst.entries).forEach(function (key) {
          var e = dst.entries[key];
          var e2 = src.entries[key];
          if (!e2) {
            remove.push(key);
            total++;
          }
        });
  
        if (!total) {
          return callback(null);
        }
  
        var errored = false;
        var completed = 0;
        var db = src.type === 'remote' ? src.db : dst.db;
        var transaction = db.transaction([IDBFS.DB_STORE_NAME], 'readwrite');
        var store = transaction.objectStore(IDBFS.DB_STORE_NAME);
  
        function done(err) {
          if (err) {
            if (!done.errored) {
              done.errored = true;
              return callback(err);
            }
            return;
          }
          if (++completed >= total) {
            return callback(null);
          }
        };
  
        transaction.onerror = function() { done(this.error); };
  
        // sort paths in ascending order so directory entries are created
        // before the files inside them
        create.sort().forEach(function (path) {
          if (dst.type === 'local') {
            IDBFS.loadRemoteEntry(store, path, function (err, entry) {
              if (err) return done(err);
              IDBFS.storeLocalEntry(path, entry, done);
            });
          } else {
            IDBFS.loadLocalEntry(path, function (err, entry) {
              if (err) return done(err);
              IDBFS.storeRemoteEntry(store, path, entry, done);
            });
          }
        });
  
        // sort paths in descending order so files are deleted before their
        // parent directories
        remove.sort().reverse().forEach(function(path) {
          if (dst.type === 'local') {
            IDBFS.removeLocalEntry(path, done);
          } else {
            IDBFS.removeRemoteEntry(store, path, done);
          }
        });
      }};
  
  var NODEFS={isWindows:false,staticInit:function () {
        NODEFS.isWindows = !!process.platform.match(/^win/);
      },mount:function (mount) {
        assert(ENVIRONMENT_IS_NODE);
        return NODEFS.createNode(null, '/', NODEFS.getMode(mount.opts.root), 0);
      },createNode:function (parent, name, mode, dev) {
        if (!FS.isDir(mode) && !FS.isFile(mode) && !FS.isLink(mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var node = FS.createNode(parent, name, mode);
        node.node_ops = NODEFS.node_ops;
        node.stream_ops = NODEFS.stream_ops;
        return node;
      },getMode:function (path) {
        var stat;
        try {
          stat = fs.lstatSync(path);
          if (NODEFS.isWindows) {
            // On Windows, directories return permission bits 'rw-rw-rw-', even though they have 'rwxrwxrwx', so 
            // propagate write bits to execute bits.
            stat.mode = stat.mode | ((stat.mode & 146) >> 1);
          }
        } catch (e) {
          if (!e.code) throw e;
          throw new FS.ErrnoError(ERRNO_CODES[e.code]);
        }
        return stat.mode;
      },realPath:function (node) {
        var parts = [];
        while (node.parent !== node) {
          parts.push(node.name);
          node = node.parent;
        }
        parts.push(node.mount.opts.root);
        parts.reverse();
        return PATH.join.apply(null, parts);
      },flagsToPermissionStringMap:{0:"r",1:"r+",2:"r+",64:"r",65:"r+",66:"r+",129:"rx+",193:"rx+",514:"w+",577:"w",578:"w+",705:"wx",706:"wx+",1024:"a",1025:"a",1026:"a+",1089:"a",1090:"a+",1153:"ax",1154:"ax+",1217:"ax",1218:"ax+",4096:"rs",4098:"rs+"},flagsToPermissionString:function (flags) {
        if (flags in NODEFS.flagsToPermissionStringMap) {
          return NODEFS.flagsToPermissionStringMap[flags];
        } else {
          return flags;
        }
      },node_ops:{getattr:function (node) {
          var path = NODEFS.realPath(node);
          var stat;
          try {
            stat = fs.lstatSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
          // node.js v0.10.20 doesn't report blksize and blocks on Windows. Fake them with default blksize of 4096.
          // See http://support.microsoft.com/kb/140365
          if (NODEFS.isWindows && !stat.blksize) {
            stat.blksize = 4096;
          }
          if (NODEFS.isWindows && !stat.blocks) {
            stat.blocks = (stat.size+stat.blksize-1)/stat.blksize|0;
          }
          return {
            dev: stat.dev,
            ino: stat.ino,
            mode: stat.mode,
            nlink: stat.nlink,
            uid: stat.uid,
            gid: stat.gid,
            rdev: stat.rdev,
            size: stat.size,
            atime: stat.atime,
            mtime: stat.mtime,
            ctime: stat.ctime,
            blksize: stat.blksize,
            blocks: stat.blocks
          };
        },setattr:function (node, attr) {
          var path = NODEFS.realPath(node);
          try {
            if (attr.mode !== undefined) {
              fs.chmodSync(path, attr.mode);
              // update the common node structure mode as well
              node.mode = attr.mode;
            }
            if (attr.timestamp !== undefined) {
              var date = new Date(attr.timestamp);
              fs.utimesSync(path, date, date);
            }
            if (attr.size !== undefined) {
              fs.truncateSync(path, attr.size);
            }
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },lookup:function (parent, name) {
          var path = PATH.join2(NODEFS.realPath(parent), name);
          var mode = NODEFS.getMode(path);
          return NODEFS.createNode(parent, name, mode);
        },mknod:function (parent, name, mode, dev) {
          var node = NODEFS.createNode(parent, name, mode, dev);
          // create the backing node for this in the fs root as well
          var path = NODEFS.realPath(node);
          try {
            if (FS.isDir(node.mode)) {
              fs.mkdirSync(path, node.mode);
            } else {
              fs.writeFileSync(path, '', { mode: node.mode });
            }
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
          return node;
        },rename:function (oldNode, newDir, newName) {
          var oldPath = NODEFS.realPath(oldNode);
          var newPath = PATH.join2(NODEFS.realPath(newDir), newName);
          try {
            fs.renameSync(oldPath, newPath);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },unlink:function (parent, name) {
          var path = PATH.join2(NODEFS.realPath(parent), name);
          try {
            fs.unlinkSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },rmdir:function (parent, name) {
          var path = PATH.join2(NODEFS.realPath(parent), name);
          try {
            fs.rmdirSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },readdir:function (node) {
          var path = NODEFS.realPath(node);
          try {
            return fs.readdirSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },symlink:function (parent, newName, oldPath) {
          var newPath = PATH.join2(NODEFS.realPath(parent), newName);
          try {
            fs.symlinkSync(oldPath, newPath);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },readlink:function (node) {
          var path = NODEFS.realPath(node);
          try {
            return fs.readlinkSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        }},stream_ops:{open:function (stream) {
          var path = NODEFS.realPath(stream.node);
          try {
            if (FS.isFile(stream.node.mode)) {
              stream.nfd = fs.openSync(path, NODEFS.flagsToPermissionString(stream.flags));
            }
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },close:function (stream) {
          try {
            if (FS.isFile(stream.node.mode) && stream.nfd) {
              fs.closeSync(stream.nfd);
            }
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },read:function (stream, buffer, offset, length, position) {
          // FIXME this is terrible.
          var nbuffer = new Buffer(length);
          var res;
          try {
            res = fs.readSync(stream.nfd, nbuffer, 0, length, position);
          } catch (e) {
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
          if (res > 0) {
            for (var i = 0; i < res; i++) {
              buffer[offset + i] = nbuffer[i];
            }
          }
          return res;
        },write:function (stream, buffer, offset, length, position) {
          // FIXME this is terrible.
          var nbuffer = new Buffer(buffer.subarray(offset, offset + length));
          var res;
          try {
            res = fs.writeSync(stream.nfd, nbuffer, 0, length, position);
          } catch (e) {
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
          return res;
        },llseek:function (stream, offset, whence) {
          var position = offset;
          if (whence === 1) {  // SEEK_CUR.
            position += stream.position;
          } else if (whence === 2) {  // SEEK_END.
            if (FS.isFile(stream.node.mode)) {
              try {
                var stat = fs.fstatSync(stream.nfd);
                position += stat.size;
              } catch (e) {
                throw new FS.ErrnoError(ERRNO_CODES[e.code]);
              }
            }
          }
  
          if (position < 0) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
  
          stream.position = position;
          return position;
        }}};
  
  var _stdin=allocate(1, "i32*", ALLOC_STATIC);
  
  var _stdout=allocate(1, "i32*", ALLOC_STATIC);
  
  var _stderr=allocate(1, "i32*", ALLOC_STATIC);
  
  function _fflush(stream) {
      // int fflush(FILE *stream);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/fflush.html
      // we don't currently perform any user-space buffering of data
    }var FS={root:null,mounts:[],devices:[null],streams:[],nextInode:1,nameTable:null,currentPath:"/",initialized:false,ignorePermissions:true,ErrnoError:null,genericErrors:{},handleFSError:function (e) {
        if (!(e instanceof FS.ErrnoError)) throw e + ' : ' + stackTrace();
        return ___setErrNo(e.errno);
      },lookupPath:function (path, opts) {
        path = PATH.resolve(FS.cwd(), path);
        opts = opts || {};
  
        var defaults = {
          follow_mount: true,
          recurse_count: 0
        };
        for (var key in defaults) {
          if (opts[key] === undefined) {
            opts[key] = defaults[key];
          }
        }
  
        if (opts.recurse_count > 8) {  // max recursive lookup of 8
          throw new FS.ErrnoError(ERRNO_CODES.ELOOP);
        }
  
        // split the path
        var parts = PATH.normalizeArray(path.split('/').filter(function(p) {
          return !!p;
        }), false);
  
        // start at the root
        var current = FS.root;
        var current_path = '/';
  
        for (var i = 0; i < parts.length; i++) {
          var islast = (i === parts.length-1);
          if (islast && opts.parent) {
            // stop resolving
            break;
          }
  
          current = FS.lookupNode(current, parts[i]);
          current_path = PATH.join2(current_path, parts[i]);
  
          // jump to the mount's root node if this is a mountpoint
          if (FS.isMountpoint(current)) {
            if (!islast || (islast && opts.follow_mount)) {
              current = current.mounted.root;
            }
          }
  
          // by default, lookupPath will not follow a symlink if it is the final path component.
          // setting opts.follow = true will override this behavior.
          if (!islast || opts.follow) {
            var count = 0;
            while (FS.isLink(current.mode)) {
              var link = FS.readlink(current_path);
              current_path = PATH.resolve(PATH.dirname(current_path), link);
              
              var lookup = FS.lookupPath(current_path, { recurse_count: opts.recurse_count });
              current = lookup.node;
  
              if (count++ > 40) {  // limit max consecutive symlinks to 40 (SYMLOOP_MAX).
                throw new FS.ErrnoError(ERRNO_CODES.ELOOP);
              }
            }
          }
        }
  
        return { path: current_path, node: current };
      },getPath:function (node) {
        var path;
        while (true) {
          if (FS.isRoot(node)) {
            var mount = node.mount.mountpoint;
            if (!path) return mount;
            return mount[mount.length-1] !== '/' ? mount + '/' + path : mount + path;
          }
          path = path ? node.name + '/' + path : node.name;
          node = node.parent;
        }
      },hashName:function (parentid, name) {
        var hash = 0;
  
  
        for (var i = 0; i < name.length; i++) {
          hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
        }
        return ((parentid + hash) >>> 0) % FS.nameTable.length;
      },hashAddNode:function (node) {
        var hash = FS.hashName(node.parent.id, node.name);
        node.name_next = FS.nameTable[hash];
        FS.nameTable[hash] = node;
      },hashRemoveNode:function (node) {
        var hash = FS.hashName(node.parent.id, node.name);
        if (FS.nameTable[hash] === node) {
          FS.nameTable[hash] = node.name_next;
        } else {
          var current = FS.nameTable[hash];
          while (current) {
            if (current.name_next === node) {
              current.name_next = node.name_next;
              break;
            }
            current = current.name_next;
          }
        }
      },lookupNode:function (parent, name) {
        var err = FS.mayLookup(parent);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        var hash = FS.hashName(parent.id, name);
        for (var node = FS.nameTable[hash]; node; node = node.name_next) {
          var nodeName = node.name;
          if (node.parent.id === parent.id && nodeName === name) {
            return node;
          }
        }
        // if we failed to find it in the cache, call into the VFS
        return FS.lookup(parent, name);
      },createNode:function (parent, name, mode, rdev) {
        if (!FS.FSNode) {
          FS.FSNode = function(parent, name, mode, rdev) {
            if (!parent) {
              parent = this;  // root node sets parent to itself
            }
            this.parent = parent;
            this.mount = parent.mount;
            this.mounted = null;
            this.id = FS.nextInode++;
            this.name = name;
            this.mode = mode;
            this.node_ops = {};
            this.stream_ops = {};
            this.rdev = rdev;
          };
  
          FS.FSNode.prototype = {};
  
          // compatibility
          var readMode = 292 | 73;
          var writeMode = 146;
  
          // NOTE we must use Object.defineProperties instead of individual calls to
          // Object.defineProperty in order to make closure compiler happy
          Object.defineProperties(FS.FSNode.prototype, {
            read: {
              get: function() { return (this.mode & readMode) === readMode; },
              set: function(val) { val ? this.mode |= readMode : this.mode &= ~readMode; }
            },
            write: {
              get: function() { return (this.mode & writeMode) === writeMode; },
              set: function(val) { val ? this.mode |= writeMode : this.mode &= ~writeMode; }
            },
            isFolder: {
              get: function() { return FS.isDir(this.mode); },
            },
            isDevice: {
              get: function() { return FS.isChrdev(this.mode); },
            },
          });
        }
  
        var node = new FS.FSNode(parent, name, mode, rdev);
  
        FS.hashAddNode(node);
  
        return node;
      },destroyNode:function (node) {
        FS.hashRemoveNode(node);
      },isRoot:function (node) {
        return node === node.parent;
      },isMountpoint:function (node) {
        return !!node.mounted;
      },isFile:function (mode) {
        return (mode & 61440) === 32768;
      },isDir:function (mode) {
        return (mode & 61440) === 16384;
      },isLink:function (mode) {
        return (mode & 61440) === 40960;
      },isChrdev:function (mode) {
        return (mode & 61440) === 8192;
      },isBlkdev:function (mode) {
        return (mode & 61440) === 24576;
      },isFIFO:function (mode) {
        return (mode & 61440) === 4096;
      },isSocket:function (mode) {
        return (mode & 49152) === 49152;
      },flagModes:{"r":0,"rs":1052672,"r+":2,"w":577,"wx":705,"xw":705,"w+":578,"wx+":706,"xw+":706,"a":1089,"ax":1217,"xa":1217,"a+":1090,"ax+":1218,"xa+":1218},modeStringToFlags:function (str) {
        var flags = FS.flagModes[str];
        if (typeof flags === 'undefined') {
          throw new Error('Unknown file open mode: ' + str);
        }
        return flags;
      },flagsToPermissionString:function (flag) {
        var accmode = flag & 2097155;
        var perms = ['r', 'w', 'rw'][accmode];
        if ((flag & 512)) {
          perms += 'w';
        }
        return perms;
      },nodePermissions:function (node, perms) {
        if (FS.ignorePermissions) {
          return 0;
        }
        // return 0 if any user, group or owner bits are set.
        if (perms.indexOf('r') !== -1 && !(node.mode & 292)) {
          return ERRNO_CODES.EACCES;
        } else if (perms.indexOf('w') !== -1 && !(node.mode & 146)) {
          return ERRNO_CODES.EACCES;
        } else if (perms.indexOf('x') !== -1 && !(node.mode & 73)) {
          return ERRNO_CODES.EACCES;
        }
        return 0;
      },mayLookup:function (dir) {
        return FS.nodePermissions(dir, 'x');
      },mayCreate:function (dir, name) {
        try {
          var node = FS.lookupNode(dir, name);
          return ERRNO_CODES.EEXIST;
        } catch (e) {
        }
        return FS.nodePermissions(dir, 'wx');
      },mayDelete:function (dir, name, isdir) {
        var node;
        try {
          node = FS.lookupNode(dir, name);
        } catch (e) {
          return e.errno;
        }
        var err = FS.nodePermissions(dir, 'wx');
        if (err) {
          return err;
        }
        if (isdir) {
          if (!FS.isDir(node.mode)) {
            return ERRNO_CODES.ENOTDIR;
          }
          if (FS.isRoot(node) || FS.getPath(node) === FS.cwd()) {
            return ERRNO_CODES.EBUSY;
          }
        } else {
          if (FS.isDir(node.mode)) {
            return ERRNO_CODES.EISDIR;
          }
        }
        return 0;
      },mayOpen:function (node, flags) {
        if (!node) {
          return ERRNO_CODES.ENOENT;
        }
        if (FS.isLink(node.mode)) {
          return ERRNO_CODES.ELOOP;
        } else if (FS.isDir(node.mode)) {
          if ((flags & 2097155) !== 0 ||  // opening for write
              (flags & 512)) {
            return ERRNO_CODES.EISDIR;
          }
        }
        return FS.nodePermissions(node, FS.flagsToPermissionString(flags));
      },MAX_OPEN_FDS:4096,nextfd:function (fd_start, fd_end) {
        fd_start = fd_start || 0;
        fd_end = fd_end || FS.MAX_OPEN_FDS;
        for (var fd = fd_start; fd <= fd_end; fd++) {
          if (!FS.streams[fd]) {
            return fd;
          }
        }
        throw new FS.ErrnoError(ERRNO_CODES.EMFILE);
      },getStream:function (fd) {
        return FS.streams[fd];
      },createStream:function (stream, fd_start, fd_end) {
        if (!FS.FSStream) {
          FS.FSStream = function(){};
          FS.FSStream.prototype = {};
          // compatibility
          Object.defineProperties(FS.FSStream.prototype, {
            object: {
              get: function() { return this.node; },
              set: function(val) { this.node = val; }
            },
            isRead: {
              get: function() { return (this.flags & 2097155) !== 1; }
            },
            isWrite: {
              get: function() { return (this.flags & 2097155) !== 0; }
            },
            isAppend: {
              get: function() { return (this.flags & 1024); }
            }
          });
        }
        // clone it, so we can return an instance of FSStream
        var newStream = new FS.FSStream();
        for (var p in stream) {
          newStream[p] = stream[p];
        }
        stream = newStream;
        var fd = FS.nextfd(fd_start, fd_end);
        stream.fd = fd;
        FS.streams[fd] = stream;
        return stream;
      },closeStream:function (fd) {
        FS.streams[fd] = null;
      },getStreamFromPtr:function (ptr) {
        return FS.streams[ptr - 1];
      },getPtrForStream:function (stream) {
        return stream ? stream.fd + 1 : 0;
      },chrdev_stream_ops:{open:function (stream) {
          var device = FS.getDevice(stream.node.rdev);
          // override node's stream ops with the device's
          stream.stream_ops = device.stream_ops;
          // forward the open call
          if (stream.stream_ops.open) {
            stream.stream_ops.open(stream);
          }
        },llseek:function () {
          throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
        }},major:function (dev) {
        return ((dev) >> 8);
      },minor:function (dev) {
        return ((dev) & 0xff);
      },makedev:function (ma, mi) {
        return ((ma) << 8 | (mi));
      },registerDevice:function (dev, ops) {
        FS.devices[dev] = { stream_ops: ops };
      },getDevice:function (dev) {
        return FS.devices[dev];
      },getMounts:function (mount) {
        var mounts = [];
        var check = [mount];
  
        while (check.length) {
          var m = check.pop();
  
          mounts.push(m);
  
          check.push.apply(check, m.mounts);
        }
  
        return mounts;
      },syncfs:function (populate, callback) {
        if (typeof(populate) === 'function') {
          callback = populate;
          populate = false;
        }
  
        var mounts = FS.getMounts(FS.root.mount);
        var completed = 0;
  
        function done(err) {
          if (err) {
            if (!done.errored) {
              done.errored = true;
              return callback(err);
            }
            return;
          }
          if (++completed >= mounts.length) {
            callback(null);
          }
        };
  
        // sync all mounts
        mounts.forEach(function (mount) {
          if (!mount.type.syncfs) {
            return done(null);
          }
          mount.type.syncfs(mount, populate, done);
        });
      },mount:function (type, opts, mountpoint) {
        var root = mountpoint === '/';
        var pseudo = !mountpoint;
        var node;
  
        if (root && FS.root) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        } else if (!root && !pseudo) {
          var lookup = FS.lookupPath(mountpoint, { follow_mount: false });
  
          mountpoint = lookup.path;  // use the absolute path
          node = lookup.node;
  
          if (FS.isMountpoint(node)) {
            throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
          }
  
          if (!FS.isDir(node.mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR);
          }
        }
  
        var mount = {
          type: type,
          opts: opts,
          mountpoint: mountpoint,
          mounts: []
        };
  
        // create a root node for the fs
        var mountRoot = type.mount(mount);
        mountRoot.mount = mount;
        mount.root = mountRoot;
  
        if (root) {
          FS.root = mountRoot;
        } else if (node) {
          // set as a mountpoint
          node.mounted = mount;
  
          // add the new mount to the current mount's children
          if (node.mount) {
            node.mount.mounts.push(mount);
          }
        }
  
        return mountRoot;
      },unmount:function (mountpoint) {
        var lookup = FS.lookupPath(mountpoint, { follow_mount: false });
  
        if (!FS.isMountpoint(lookup.node)) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
  
        // destroy the nodes for this mount, and all its child mounts
        var node = lookup.node;
        var mount = node.mounted;
        var mounts = FS.getMounts(mount);
  
        Object.keys(FS.nameTable).forEach(function (hash) {
          var current = FS.nameTable[hash];
  
          while (current) {
            var next = current.name_next;
  
            if (mounts.indexOf(current.mount) !== -1) {
              FS.destroyNode(current);
            }
  
            current = next;
          }
        });
  
        // no longer a mountpoint
        node.mounted = null;
  
        // remove this mount from the child mounts
        var idx = node.mount.mounts.indexOf(mount);
        assert(idx !== -1);
        node.mount.mounts.splice(idx, 1);
      },lookup:function (parent, name) {
        return parent.node_ops.lookup(parent, name);
      },mknod:function (path, mode, dev) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        var err = FS.mayCreate(parent, name);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        if (!parent.node_ops.mknod) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        return parent.node_ops.mknod(parent, name, mode, dev);
      },create:function (path, mode) {
        mode = mode !== undefined ? mode : 438 /* 0666 */;
        mode &= 4095;
        mode |= 32768;
        return FS.mknod(path, mode, 0);
      },mkdir:function (path, mode) {
        mode = mode !== undefined ? mode : 511 /* 0777 */;
        mode &= 511 | 512;
        mode |= 16384;
        return FS.mknod(path, mode, 0);
      },mkdev:function (path, mode, dev) {
        if (typeof(dev) === 'undefined') {
          dev = mode;
          mode = 438 /* 0666 */;
        }
        mode |= 8192;
        return FS.mknod(path, mode, dev);
      },symlink:function (oldpath, newpath) {
        var lookup = FS.lookupPath(newpath, { parent: true });
        var parent = lookup.node;
        var newname = PATH.basename(newpath);
        var err = FS.mayCreate(parent, newname);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        if (!parent.node_ops.symlink) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        return parent.node_ops.symlink(parent, newname, oldpath);
      },rename:function (old_path, new_path) {
        var old_dirname = PATH.dirname(old_path);
        var new_dirname = PATH.dirname(new_path);
        var old_name = PATH.basename(old_path);
        var new_name = PATH.basename(new_path);
        // parents must exist
        var lookup, old_dir, new_dir;
        try {
          lookup = FS.lookupPath(old_path, { parent: true });
          old_dir = lookup.node;
          lookup = FS.lookupPath(new_path, { parent: true });
          new_dir = lookup.node;
        } catch (e) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        }
        // need to be part of the same mount
        if (old_dir.mount !== new_dir.mount) {
          throw new FS.ErrnoError(ERRNO_CODES.EXDEV);
        }
        // source must exist
        var old_node = FS.lookupNode(old_dir, old_name);
        // old path should not be an ancestor of the new path
        var relative = PATH.relative(old_path, new_dirname);
        if (relative.charAt(0) !== '.') {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        // new path should not be an ancestor of the old path
        relative = PATH.relative(new_path, old_dirname);
        if (relative.charAt(0) !== '.') {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY);
        }
        // see if the new path already exists
        var new_node;
        try {
          new_node = FS.lookupNode(new_dir, new_name);
        } catch (e) {
          // not fatal
        }
        // early out if nothing needs to change
        if (old_node === new_node) {
          return;
        }
        // we'll need to delete the old entry
        var isdir = FS.isDir(old_node.mode);
        var err = FS.mayDelete(old_dir, old_name, isdir);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        // need delete permissions if we'll be overwriting.
        // need create permissions if new doesn't already exist.
        err = new_node ?
          FS.mayDelete(new_dir, new_name, isdir) :
          FS.mayCreate(new_dir, new_name);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        if (!old_dir.node_ops.rename) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (FS.isMountpoint(old_node) || (new_node && FS.isMountpoint(new_node))) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        }
        // if we are going to change the parent, check write permissions
        if (new_dir !== old_dir) {
          err = FS.nodePermissions(old_dir, 'w');
          if (err) {
            throw new FS.ErrnoError(err);
          }
        }
        // remove the node from the lookup hash
        FS.hashRemoveNode(old_node);
        // do the underlying fs rename
        try {
          old_dir.node_ops.rename(old_node, new_dir, new_name);
        } catch (e) {
          throw e;
        } finally {
          // add the node back to the hash (in case node_ops.rename
          // changed its name)
          FS.hashAddNode(old_node);
        }
      },rmdir:function (path) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        var node = FS.lookupNode(parent, name);
        var err = FS.mayDelete(parent, name, true);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        if (!parent.node_ops.rmdir) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (FS.isMountpoint(node)) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        }
        parent.node_ops.rmdir(parent, name);
        FS.destroyNode(node);
      },readdir:function (path) {
        var lookup = FS.lookupPath(path, { follow: true });
        var node = lookup.node;
        if (!node.node_ops.readdir) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR);
        }
        return node.node_ops.readdir(node);
      },unlink:function (path) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        var node = FS.lookupNode(parent, name);
        var err = FS.mayDelete(parent, name, false);
        if (err) {
          // POSIX says unlink should set EPERM, not EISDIR
          if (err === ERRNO_CODES.EISDIR) err = ERRNO_CODES.EPERM;
          throw new FS.ErrnoError(err);
        }
        if (!parent.node_ops.unlink) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (FS.isMountpoint(node)) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        }
        parent.node_ops.unlink(parent, name);
        FS.destroyNode(node);
      },readlink:function (path) {
        var lookup = FS.lookupPath(path);
        var link = lookup.node;
        if (!link.node_ops.readlink) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        return link.node_ops.readlink(link);
      },stat:function (path, dontFollow) {
        var lookup = FS.lookupPath(path, { follow: !dontFollow });
        var node = lookup.node;
        if (!node.node_ops.getattr) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        return node.node_ops.getattr(node);
      },lstat:function (path) {
        return FS.stat(path, true);
      },chmod:function (path, mode, dontFollow) {
        var node;
        if (typeof path === 'string') {
          var lookup = FS.lookupPath(path, { follow: !dontFollow });
          node = lookup.node;
        } else {
          node = path;
        }
        if (!node.node_ops.setattr) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        node.node_ops.setattr(node, {
          mode: (mode & 4095) | (node.mode & ~4095),
          timestamp: Date.now()
        });
      },lchmod:function (path, mode) {
        FS.chmod(path, mode, true);
      },fchmod:function (fd, mode) {
        var stream = FS.getStream(fd);
        if (!stream) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        FS.chmod(stream.node, mode);
      },chown:function (path, uid, gid, dontFollow) {
        var node;
        if (typeof path === 'string') {
          var lookup = FS.lookupPath(path, { follow: !dontFollow });
          node = lookup.node;
        } else {
          node = path;
        }
        if (!node.node_ops.setattr) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        node.node_ops.setattr(node, {
          timestamp: Date.now()
          // we ignore the uid / gid for now
        });
      },lchown:function (path, uid, gid) {
        FS.chown(path, uid, gid, true);
      },fchown:function (fd, uid, gid) {
        var stream = FS.getStream(fd);
        if (!stream) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        FS.chown(stream.node, uid, gid);
      },truncate:function (path, len) {
        if (len < 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var node;
        if (typeof path === 'string') {
          var lookup = FS.lookupPath(path, { follow: true });
          node = lookup.node;
        } else {
          node = path;
        }
        if (!node.node_ops.setattr) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (FS.isDir(node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EISDIR);
        }
        if (!FS.isFile(node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var err = FS.nodePermissions(node, 'w');
        if (err) {
          throw new FS.ErrnoError(err);
        }
        node.node_ops.setattr(node, {
          size: len,
          timestamp: Date.now()
        });
      },ftruncate:function (fd, len) {
        var stream = FS.getStream(fd);
        if (!stream) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        FS.truncate(stream.node, len);
      },utime:function (path, atime, mtime) {
        var lookup = FS.lookupPath(path, { follow: true });
        var node = lookup.node;
        node.node_ops.setattr(node, {
          timestamp: Math.max(atime, mtime)
        });
      },open:function (path, flags, mode, fd_start, fd_end) {
        flags = typeof flags === 'string' ? FS.modeStringToFlags(flags) : flags;
        mode = typeof mode === 'undefined' ? 438 /* 0666 */ : mode;
        if ((flags & 64)) {
          mode = (mode & 4095) | 32768;
        } else {
          mode = 0;
        }
        var node;
        if (typeof path === 'object') {
          node = path;
        } else {
          path = PATH.normalize(path);
          try {
            var lookup = FS.lookupPath(path, {
              follow: !(flags & 131072)
            });
            node = lookup.node;
          } catch (e) {
            // ignore
          }
        }
        // perhaps we need to create the node
        if ((flags & 64)) {
          if (node) {
            // if O_CREAT and O_EXCL are set, error out if the node already exists
            if ((flags & 128)) {
              throw new FS.ErrnoError(ERRNO_CODES.EEXIST);
            }
          } else {
            // node doesn't exist, try to create it
            node = FS.mknod(path, mode, 0);
          }
        }
        if (!node) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        }
        // can't truncate a device
        if (FS.isChrdev(node.mode)) {
          flags &= ~512;
        }
        // check permissions
        var err = FS.mayOpen(node, flags);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        // do truncation if necessary
        if ((flags & 512)) {
          FS.truncate(node, 0);
        }
        // we've already handled these, don't pass down to the underlying vfs
        flags &= ~(128 | 512);
  
        // register the stream with the filesystem
        var stream = FS.createStream({
          node: node,
          path: FS.getPath(node),  // we want the absolute path to the node
          flags: flags,
          seekable: true,
          position: 0,
          stream_ops: node.stream_ops,
          // used by the file family libc calls (fopen, fwrite, ferror, etc.)
          ungotten: [],
          error: false
        }, fd_start, fd_end);
        // call the new stream's open function
        if (stream.stream_ops.open) {
          stream.stream_ops.open(stream);
        }
        if (Module['logReadFiles'] && !(flags & 1)) {
          if (!FS.readFiles) FS.readFiles = {};
          if (!(path in FS.readFiles)) {
            FS.readFiles[path] = 1;
            Module['printErr']('read file: ' + path);
          }
        }
        return stream;
      },close:function (stream) {
        try {
          if (stream.stream_ops.close) {
            stream.stream_ops.close(stream);
          }
        } catch (e) {
          throw e;
        } finally {
          FS.closeStream(stream.fd);
        }
      },llseek:function (stream, offset, whence) {
        if (!stream.seekable || !stream.stream_ops.llseek) {
          throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
        }
        return stream.stream_ops.llseek(stream, offset, whence);
      },read:function (stream, buffer, offset, length, position) {
        if (length < 0 || position < 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        if ((stream.flags & 2097155) === 1) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if (FS.isDir(stream.node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EISDIR);
        }
        if (!stream.stream_ops.read) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var seeking = true;
        if (typeof position === 'undefined') {
          position = stream.position;
          seeking = false;
        } else if (!stream.seekable) {
          throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
        }
        var bytesRead = stream.stream_ops.read(stream, buffer, offset, length, position);
        if (!seeking) stream.position += bytesRead;
        return bytesRead;
      },write:function (stream, buffer, offset, length, position, canOwn) {
        if (length < 0 || position < 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if (FS.isDir(stream.node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EISDIR);
        }
        if (!stream.stream_ops.write) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var seeking = true;
        if (typeof position === 'undefined') {
          position = stream.position;
          seeking = false;
        } else if (!stream.seekable) {
          throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
        }
        if (stream.flags & 1024) {
          // seek to the end before writing in append mode
          FS.llseek(stream, 0, 2);
        }
        var bytesWritten = stream.stream_ops.write(stream, buffer, offset, length, position, canOwn);
        if (!seeking) stream.position += bytesWritten;
        return bytesWritten;
      },allocate:function (stream, offset, length) {
        if (offset < 0 || length <= 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if (!FS.isFile(stream.node.mode) && !FS.isDir(node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
        }
        if (!stream.stream_ops.allocate) {
          throw new FS.ErrnoError(ERRNO_CODES.EOPNOTSUPP);
        }
        stream.stream_ops.allocate(stream, offset, length);
      },mmap:function (stream, buffer, offset, length, position, prot, flags) {
        // TODO if PROT is PROT_WRITE, make sure we have write access
        if ((stream.flags & 2097155) === 1) {
          throw new FS.ErrnoError(ERRNO_CODES.EACCES);
        }
        if (!stream.stream_ops.mmap) {
          throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
        }
        return stream.stream_ops.mmap(stream, buffer, offset, length, position, prot, flags);
      },ioctl:function (stream, cmd, arg) {
        if (!stream.stream_ops.ioctl) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTTY);
        }
        return stream.stream_ops.ioctl(stream, cmd, arg);
      },readFile:function (path, opts) {
        opts = opts || {};
        opts.flags = opts.flags || 'r';
        opts.encoding = opts.encoding || 'binary';
        if (opts.encoding !== 'utf8' && opts.encoding !== 'binary') {
          throw new Error('Invalid encoding type "' + opts.encoding + '"');
        }
        var ret;
        var stream = FS.open(path, opts.flags);
        var stat = FS.stat(path);
        var length = stat.size;
        var buf = new Uint8Array(length);
        FS.read(stream, buf, 0, length, 0);
        if (opts.encoding === 'utf8') {
          ret = '';
          var utf8 = new Runtime.UTF8Processor();
          for (var i = 0; i < length; i++) {
            ret += utf8.processCChar(buf[i]);
          }
        } else if (opts.encoding === 'binary') {
          ret = buf;
        }
        FS.close(stream);
        return ret;
      },writeFile:function (path, data, opts) {
        opts = opts || {};
        opts.flags = opts.flags || 'w';
        opts.encoding = opts.encoding || 'utf8';
        if (opts.encoding !== 'utf8' && opts.encoding !== 'binary') {
          throw new Error('Invalid encoding type "' + opts.encoding + '"');
        }
        var stream = FS.open(path, opts.flags, opts.mode);
        if (opts.encoding === 'utf8') {
          var utf8 = new Runtime.UTF8Processor();
          var buf = new Uint8Array(utf8.processJSString(data));
          FS.write(stream, buf, 0, buf.length, 0, opts.canOwn);
        } else if (opts.encoding === 'binary') {
          FS.write(stream, data, 0, data.length, 0, opts.canOwn);
        }
        FS.close(stream);
      },cwd:function () {
        return FS.currentPath;
      },chdir:function (path) {
        var lookup = FS.lookupPath(path, { follow: true });
        if (!FS.isDir(lookup.node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR);
        }
        var err = FS.nodePermissions(lookup.node, 'x');
        if (err) {
          throw new FS.ErrnoError(err);
        }
        FS.currentPath = lookup.path;
      },createDefaultDirectories:function () {
        FS.mkdir('/tmp');
      },createDefaultDevices:function () {
        // create /dev
        FS.mkdir('/dev');
        // setup /dev/null
        FS.registerDevice(FS.makedev(1, 3), {
          read: function() { return 0; },
          write: function() { return 0; }
        });
        FS.mkdev('/dev/null', FS.makedev(1, 3));
        // setup /dev/tty and /dev/tty1
        // stderr needs to print output using Module['printErr']
        // so we register a second tty just for it.
        TTY.register(FS.makedev(5, 0), TTY.default_tty_ops);
        TTY.register(FS.makedev(6, 0), TTY.default_tty1_ops);
        FS.mkdev('/dev/tty', FS.makedev(5, 0));
        FS.mkdev('/dev/tty1', FS.makedev(6, 0));
        // we're not going to emulate the actual shm device,
        // just create the tmp dirs that reside in it commonly
        FS.mkdir('/dev/shm');
        FS.mkdir('/dev/shm/tmp');
      },createStandardStreams:function () {
        // TODO deprecate the old functionality of a single
        // input / output callback and that utilizes FS.createDevice
        // and instead require a unique set of stream ops
  
        // by default, we symlink the standard streams to the
        // default tty devices. however, if the standard streams
        // have been overwritten we create a unique device for
        // them instead.
        if (Module['stdin']) {
          FS.createDevice('/dev', 'stdin', Module['stdin']);
        } else {
          FS.symlink('/dev/tty', '/dev/stdin');
        }
        if (Module['stdout']) {
          FS.createDevice('/dev', 'stdout', null, Module['stdout']);
        } else {
          FS.symlink('/dev/tty', '/dev/stdout');
        }
        if (Module['stderr']) {
          FS.createDevice('/dev', 'stderr', null, Module['stderr']);
        } else {
          FS.symlink('/dev/tty1', '/dev/stderr');
        }
  
        // open default streams for the stdin, stdout and stderr devices
        var stdin = FS.open('/dev/stdin', 'r');
        HEAP32[((_stdin)>>2)]=FS.getPtrForStream(stdin);
        assert(stdin.fd === 0, 'invalid handle for stdin (' + stdin.fd + ')');
  
        var stdout = FS.open('/dev/stdout', 'w');
        HEAP32[((_stdout)>>2)]=FS.getPtrForStream(stdout);
        assert(stdout.fd === 1, 'invalid handle for stdout (' + stdout.fd + ')');
  
        var stderr = FS.open('/dev/stderr', 'w');
        HEAP32[((_stderr)>>2)]=FS.getPtrForStream(stderr);
        assert(stderr.fd === 2, 'invalid handle for stderr (' + stderr.fd + ')');
      },ensureErrnoError:function () {
        if (FS.ErrnoError) return;
        FS.ErrnoError = function ErrnoError(errno) {
          this.errno = errno;
          for (var key in ERRNO_CODES) {
            if (ERRNO_CODES[key] === errno) {
              this.code = key;
              break;
            }
          }
          this.message = ERRNO_MESSAGES[errno];
        };
        FS.ErrnoError.prototype = new Error();
        FS.ErrnoError.prototype.constructor = FS.ErrnoError;
        // Some errors may happen quite a bit, to avoid overhead we reuse them (and suffer a lack of stack info)
        [ERRNO_CODES.ENOENT].forEach(function(code) {
          FS.genericErrors[code] = new FS.ErrnoError(code);
          FS.genericErrors[code].stack = '<generic error, no stack>';
        });
      },staticInit:function () {
        FS.ensureErrnoError();
  
        FS.nameTable = new Array(4096);
  
        FS.mount(MEMFS, {}, '/');
  
        FS.createDefaultDirectories();
        FS.createDefaultDevices();
      },init:function (input, output, error) {
        assert(!FS.init.initialized, 'FS.init was previously called. If you want to initialize later with custom parameters, remove any earlier calls (note that one is automatically added to the generated code)');
        FS.init.initialized = true;
  
        FS.ensureErrnoError();
  
        // Allow Module.stdin etc. to provide defaults, if none explicitly passed to us here
        Module['stdin'] = input || Module['stdin'];
        Module['stdout'] = output || Module['stdout'];
        Module['stderr'] = error || Module['stderr'];
  
        FS.createStandardStreams();
      },quit:function () {
        FS.init.initialized = false;
        for (var i = 0; i < FS.streams.length; i++) {
          var stream = FS.streams[i];
          if (!stream) {
            continue;
          }
          FS.close(stream);
        }
      },getMode:function (canRead, canWrite) {
        var mode = 0;
        if (canRead) mode |= 292 | 73;
        if (canWrite) mode |= 146;
        return mode;
      },joinPath:function (parts, forceRelative) {
        var path = PATH.join.apply(null, parts);
        if (forceRelative && path[0] == '/') path = path.substr(1);
        return path;
      },absolutePath:function (relative, base) {
        return PATH.resolve(base, relative);
      },standardizePath:function (path) {
        return PATH.normalize(path);
      },findObject:function (path, dontResolveLastLink) {
        var ret = FS.analyzePath(path, dontResolveLastLink);
        if (ret.exists) {
          return ret.object;
        } else {
          ___setErrNo(ret.error);
          return null;
        }
      },analyzePath:function (path, dontResolveLastLink) {
        // operate from within the context of the symlink's target
        try {
          var lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
          path = lookup.path;
        } catch (e) {
        }
        var ret = {
          isRoot: false, exists: false, error: 0, name: null, path: null, object: null,
          parentExists: false, parentPath: null, parentObject: null
        };
        try {
          var lookup = FS.lookupPath(path, { parent: true });
          ret.parentExists = true;
          ret.parentPath = lookup.path;
          ret.parentObject = lookup.node;
          ret.name = PATH.basename(path);
          lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
          ret.exists = true;
          ret.path = lookup.path;
          ret.object = lookup.node;
          ret.name = lookup.node.name;
          ret.isRoot = lookup.path === '/';
        } catch (e) {
          ret.error = e.errno;
        };
        return ret;
      },createFolder:function (parent, name, canRead, canWrite) {
        var path = PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        var mode = FS.getMode(canRead, canWrite);
        return FS.mkdir(path, mode);
      },createPath:function (parent, path, canRead, canWrite) {
        parent = typeof parent === 'string' ? parent : FS.getPath(parent);
        var parts = path.split('/').reverse();
        while (parts.length) {
          var part = parts.pop();
          if (!part) continue;
          var current = PATH.join2(parent, part);
          try {
            FS.mkdir(current);
          } catch (e) {
            // ignore EEXIST
          }
          parent = current;
        }
        return current;
      },createFile:function (parent, name, properties, canRead, canWrite) {
        var path = PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        var mode = FS.getMode(canRead, canWrite);
        return FS.create(path, mode);
      },createDataFile:function (parent, name, data, canRead, canWrite, canOwn) {
        var path = name ? PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name) : parent;
        var mode = FS.getMode(canRead, canWrite);
        var node = FS.create(path, mode);
        if (data) {
          if (typeof data === 'string') {
            var arr = new Array(data.length);
            for (var i = 0, len = data.length; i < len; ++i) arr[i] = data.charCodeAt(i);
            data = arr;
          }
          // make sure we can write to the file
          FS.chmod(node, mode | 146);
          var stream = FS.open(node, 'w');
          FS.write(stream, data, 0, data.length, 0, canOwn);
          FS.close(stream);
          FS.chmod(node, mode);
        }
        return node;
      },createDevice:function (parent, name, input, output) {
        var path = PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        var mode = FS.getMode(!!input, !!output);
        if (!FS.createDevice.major) FS.createDevice.major = 64;
        var dev = FS.makedev(FS.createDevice.major++, 0);
        // Create a fake device that a set of stream ops to emulate
        // the old behavior.
        FS.registerDevice(dev, {
          open: function(stream) {
            stream.seekable = false;
          },
          close: function(stream) {
            // flush any pending line data
            if (output && output.buffer && output.buffer.length) {
              output(10);
            }
          },
          read: function(stream, buffer, offset, length, pos /* ignored */) {
            var bytesRead = 0;
            for (var i = 0; i < length; i++) {
              var result;
              try {
                result = input();
              } catch (e) {
                throw new FS.ErrnoError(ERRNO_CODES.EIO);
              }
              if (result === undefined && bytesRead === 0) {
                throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
              }
              if (result === null || result === undefined) break;
              bytesRead++;
              buffer[offset+i] = result;
            }
            if (bytesRead) {
              stream.node.timestamp = Date.now();
            }
            return bytesRead;
          },
          write: function(stream, buffer, offset, length, pos) {
            for (var i = 0; i < length; i++) {
              try {
                output(buffer[offset+i]);
              } catch (e) {
                throw new FS.ErrnoError(ERRNO_CODES.EIO);
              }
            }
            if (length) {
              stream.node.timestamp = Date.now();
            }
            return i;
          }
        });
        return FS.mkdev(path, mode, dev);
      },createLink:function (parent, name, target, canRead, canWrite) {
        var path = PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        return FS.symlink(target, path);
      },forceLoadFile:function (obj) {
        if (obj.isDevice || obj.isFolder || obj.link || obj.contents) return true;
        var success = true;
        if (typeof XMLHttpRequest !== 'undefined') {
          throw new Error("Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.");
        } else if (Module['read']) {
          // Command-line.
          try {
            // WARNING: Can't read binary files in V8's d8 or tracemonkey's js, as
            //          read() will try to parse UTF8.
            obj.contents = intArrayFromString(Module['read'](obj.url), true);
          } catch (e) {
            success = false;
          }
        } else {
          throw new Error('Cannot load without read() or XMLHttpRequest.');
        }
        if (!success) ___setErrNo(ERRNO_CODES.EIO);
        return success;
      },createLazyFile:function (parent, name, url, canRead, canWrite) {
        // Lazy chunked Uint8Array (implements get and length from Uint8Array). Actual getting is abstracted away for eventual reuse.
        function LazyUint8Array() {
          this.lengthKnown = false;
          this.chunks = []; // Loaded chunks. Index is the chunk number
        }
        LazyUint8Array.prototype.get = function LazyUint8Array_get(idx) {
          if (idx > this.length-1 || idx < 0) {
            return undefined;
          }
          var chunkOffset = idx % this.chunkSize;
          var chunkNum = Math.floor(idx / this.chunkSize);
          return this.getter(chunkNum)[chunkOffset];
        }
        LazyUint8Array.prototype.setDataGetter = function LazyUint8Array_setDataGetter(getter) {
          this.getter = getter;
        }
        LazyUint8Array.prototype.cacheLength = function LazyUint8Array_cacheLength() {
            // Find length
            var xhr = new XMLHttpRequest();
            xhr.open('HEAD', url, false);
            xhr.send(null);
            if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
            var datalength = Number(xhr.getResponseHeader("Content-length"));
            var header;
            var hasByteServing = (header = xhr.getResponseHeader("Accept-Ranges")) && header === "bytes";
            var chunkSize = 1024*1024; // Chunk size in bytes
  
            if (!hasByteServing) chunkSize = datalength;
  
            // Function to get a range from the remote URL.
            var doXHR = (function(from, to) {
              if (from > to) throw new Error("invalid range (" + from + ", " + to + ") or no bytes requested!");
              if (to > datalength-1) throw new Error("only " + datalength + " bytes available! programmer error!");
  
              // TODO: Use mozResponseArrayBuffer, responseStream, etc. if available.
              var xhr = new XMLHttpRequest();
              xhr.open('GET', url, false);
              if (datalength !== chunkSize) xhr.setRequestHeader("Range", "bytes=" + from + "-" + to);
  
              // Some hints to the browser that we want binary data.
              if (typeof Uint8Array != 'undefined') xhr.responseType = 'arraybuffer';
              if (xhr.overrideMimeType) {
                xhr.overrideMimeType('text/plain; charset=x-user-defined');
              }
  
              xhr.send(null);
              if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
              if (xhr.response !== undefined) {
                return new Uint8Array(xhr.response || []);
              } else {
                return intArrayFromString(xhr.responseText || '', true);
              }
            });
            var lazyArray = this;
            lazyArray.setDataGetter(function(chunkNum) {
              var start = chunkNum * chunkSize;
              var end = (chunkNum+1) * chunkSize - 1; // including this byte
              end = Math.min(end, datalength-1); // if datalength-1 is selected, this is the last block
              if (typeof(lazyArray.chunks[chunkNum]) === "undefined") {
                lazyArray.chunks[chunkNum] = doXHR(start, end);
              }
              if (typeof(lazyArray.chunks[chunkNum]) === "undefined") throw new Error("doXHR failed!");
              return lazyArray.chunks[chunkNum];
            });
  
            this._length = datalength;
            this._chunkSize = chunkSize;
            this.lengthKnown = true;
        }
        if (typeof XMLHttpRequest !== 'undefined') {
          if (!ENVIRONMENT_IS_WORKER) throw 'Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc';
          var lazyArray = new LazyUint8Array();
          Object.defineProperty(lazyArray, "length", {
              get: function() {
                  if(!this.lengthKnown) {
                      this.cacheLength();
                  }
                  return this._length;
              }
          });
          Object.defineProperty(lazyArray, "chunkSize", {
              get: function() {
                  if(!this.lengthKnown) {
                      this.cacheLength();
                  }
                  return this._chunkSize;
              }
          });
  
          var properties = { isDevice: false, contents: lazyArray };
        } else {
          var properties = { isDevice: false, url: url };
        }
  
        var node = FS.createFile(parent, name, properties, canRead, canWrite);
        // This is a total hack, but I want to get this lazy file code out of the
        // core of MEMFS. If we want to keep this lazy file concept I feel it should
        // be its own thin LAZYFS proxying calls to MEMFS.
        if (properties.contents) {
          node.contents = properties.contents;
        } else if (properties.url) {
          node.contents = null;
          node.url = properties.url;
        }
        // override each stream op with one that tries to force load the lazy file first
        var stream_ops = {};
        var keys = Object.keys(node.stream_ops);
        keys.forEach(function(key) {
          var fn = node.stream_ops[key];
          stream_ops[key] = function forceLoadLazyFile() {
            if (!FS.forceLoadFile(node)) {
              throw new FS.ErrnoError(ERRNO_CODES.EIO);
            }
            return fn.apply(null, arguments);
          };
        });
        // use a custom read function
        stream_ops.read = function stream_ops_read(stream, buffer, offset, length, position) {
          if (!FS.forceLoadFile(node)) {
            throw new FS.ErrnoError(ERRNO_CODES.EIO);
          }
          var contents = stream.node.contents;
          if (position >= contents.length)
            return 0;
          var size = Math.min(contents.length - position, length);
          assert(size >= 0);
          if (contents.slice) { // normal array
            for (var i = 0; i < size; i++) {
              buffer[offset + i] = contents[position + i];
            }
          } else {
            for (var i = 0; i < size; i++) { // LazyUint8Array from sync binary XHR
              buffer[offset + i] = contents.get(position + i);
            }
          }
          return size;
        };
        node.stream_ops = stream_ops;
        return node;
      },createPreloadedFile:function (parent, name, url, canRead, canWrite, onload, onerror, dontCreateFile, canOwn) {
        Browser.init();
        // TODO we should allow people to just pass in a complete filename instead
        // of parent and name being that we just join them anyways
        var fullname = name ? PATH.resolve(PATH.join2(parent, name)) : parent;
        function processData(byteArray) {
          function finish(byteArray) {
            if (!dontCreateFile) {
              FS.createDataFile(parent, name, byteArray, canRead, canWrite, canOwn);
            }
            if (onload) onload();
            removeRunDependency('cp ' + fullname);
          }
          var handled = false;
          Module['preloadPlugins'].forEach(function(plugin) {
            if (handled) return;
            if (plugin['canHandle'](fullname)) {
              plugin['handle'](byteArray, fullname, finish, function() {
                if (onerror) onerror();
                removeRunDependency('cp ' + fullname);
              });
              handled = true;
            }
          });
          if (!handled) finish(byteArray);
        }
        addRunDependency('cp ' + fullname);
        if (typeof url == 'string') {
          Browser.asyncLoad(url, function(byteArray) {
            processData(byteArray);
          }, onerror);
        } else {
          processData(url);
        }
      },indexedDB:function () {
        return window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
      },DB_NAME:function () {
        return 'EM_FS_' + window.location.pathname;
      },DB_VERSION:20,DB_STORE_NAME:"FILE_DATA",saveFilesToDB:function (paths, onload, onerror) {
        onload = onload || function(){};
        onerror = onerror || function(){};
        var indexedDB = FS.indexedDB();
        try {
          var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION);
        } catch (e) {
          return onerror(e);
        }
        openRequest.onupgradeneeded = function openRequest_onupgradeneeded() {
          console.log('creating db');
          var db = openRequest.result;
          db.createObjectStore(FS.DB_STORE_NAME);
        };
        openRequest.onsuccess = function openRequest_onsuccess() {
          var db = openRequest.result;
          var transaction = db.transaction([FS.DB_STORE_NAME], 'readwrite');
          var files = transaction.objectStore(FS.DB_STORE_NAME);
          var ok = 0, fail = 0, total = paths.length;
          function finish() {
            if (fail == 0) onload(); else onerror();
          }
          paths.forEach(function(path) {
            var putRequest = files.put(FS.analyzePath(path).object.contents, path);
            putRequest.onsuccess = function putRequest_onsuccess() { ok++; if (ok + fail == total) finish() };
            putRequest.onerror = function putRequest_onerror() { fail++; if (ok + fail == total) finish() };
          });
          transaction.onerror = onerror;
        };
        openRequest.onerror = onerror;
      },loadFilesFromDB:function (paths, onload, onerror) {
        onload = onload || function(){};
        onerror = onerror || function(){};
        var indexedDB = FS.indexedDB();
        try {
          var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION);
        } catch (e) {
          return onerror(e);
        }
        openRequest.onupgradeneeded = onerror; // no database to load from
        openRequest.onsuccess = function openRequest_onsuccess() {
          var db = openRequest.result;
          try {
            var transaction = db.transaction([FS.DB_STORE_NAME], 'readonly');
          } catch(e) {
            onerror(e);
            return;
          }
          var files = transaction.objectStore(FS.DB_STORE_NAME);
          var ok = 0, fail = 0, total = paths.length;
          function finish() {
            if (fail == 0) onload(); else onerror();
          }
          paths.forEach(function(path) {
            var getRequest = files.get(path);
            getRequest.onsuccess = function getRequest_onsuccess() {
              if (FS.analyzePath(path).exists) {
                FS.unlink(path);
              }
              FS.createDataFile(PATH.dirname(path), PATH.basename(path), getRequest.result, true, true, true);
              ok++;
              if (ok + fail == total) finish();
            };
            getRequest.onerror = function getRequest_onerror() { fail++; if (ok + fail == total) finish() };
          });
          transaction.onerror = onerror;
        };
        openRequest.onerror = onerror;
      }};function _lseek(fildes, offset, whence) {
      // off_t lseek(int fildes, off_t offset, int whence);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/lseek.html
      var stream = FS.getStream(fildes);
      if (!stream) {
        ___setErrNo(ERRNO_CODES.EBADF);
        return -1;
      }
      try {
        return FS.llseek(stream, offset, whence);
      } catch (e) {
        FS.handleFSError(e);
        return -1;
      }
    }

  
  
  
  
  
  
  function _mkport() { throw 'TODO' }var SOCKFS={mount:function (mount) {
        return FS.createNode(null, '/', 16384 | 511 /* 0777 */, 0);
      },createSocket:function (family, type, protocol) {
        var streaming = type == 1;
        if (protocol) {
          assert(streaming == (protocol == 6)); // if SOCK_STREAM, must be tcp
        }
  
        // create our internal socket structure
        var sock = {
          family: family,
          type: type,
          protocol: protocol,
          server: null,
          peers: {},
          pending: [],
          recv_queue: [],
          sock_ops: SOCKFS.websocket_sock_ops
        };
  
        // create the filesystem node to store the socket structure
        var name = SOCKFS.nextname();
        var node = FS.createNode(SOCKFS.root, name, 49152, 0);
        node.sock = sock;
  
        // and the wrapping stream that enables library functions such
        // as read and write to indirectly interact with the socket
        var stream = FS.createStream({
          path: name,
          node: node,
          flags: FS.modeStringToFlags('r+'),
          seekable: false,
          stream_ops: SOCKFS.stream_ops
        });
  
        // map the new stream to the socket structure (sockets have a 1:1
        // relationship with a stream)
        sock.stream = stream;
  
        return sock;
      },getSocket:function (fd) {
        var stream = FS.getStream(fd);
        if (!stream || !FS.isSocket(stream.node.mode)) {
          return null;
        }
        return stream.node.sock;
      },stream_ops:{poll:function (stream) {
          var sock = stream.node.sock;
          return sock.sock_ops.poll(sock);
        },ioctl:function (stream, request, varargs) {
          var sock = stream.node.sock;
          return sock.sock_ops.ioctl(sock, request, varargs);
        },read:function (stream, buffer, offset, length, position /* ignored */) {
          var sock = stream.node.sock;
          var msg = sock.sock_ops.recvmsg(sock, length);
          if (!msg) {
            // socket is closed
            return 0;
          }
          buffer.set(msg.buffer, offset);
          return msg.buffer.length;
        },write:function (stream, buffer, offset, length, position /* ignored */) {
          var sock = stream.node.sock;
          return sock.sock_ops.sendmsg(sock, buffer, offset, length);
        },close:function (stream) {
          var sock = stream.node.sock;
          sock.sock_ops.close(sock);
        }},nextname:function () {
        if (!SOCKFS.nextname.current) {
          SOCKFS.nextname.current = 0;
        }
        return 'socket[' + (SOCKFS.nextname.current++) + ']';
      },websocket_sock_ops:{createPeer:function (sock, addr, port) {
          var ws;
  
          if (typeof addr === 'object') {
            ws = addr;
            addr = null;
            port = null;
          }
  
          if (ws) {
            // for sockets that've already connected (e.g. we're the server)
            // we can inspect the _socket property for the address
            if (ws._socket) {
              addr = ws._socket.remoteAddress;
              port = ws._socket.remotePort;
            }
            // if we're just now initializing a connection to the remote,
            // inspect the url property
            else {
              var result = /ws[s]?:\/\/([^:]+):(\d+)/.exec(ws.url);
              if (!result) {
                throw new Error('WebSocket URL must be in the format ws(s)://address:port');
              }
              addr = result[1];
              port = parseInt(result[2], 10);
            }
          } else {
            // create the actual websocket object and connect
            try {
              // runtimeConfig gets set to true if WebSocket runtime configuration is available.
              var runtimeConfig = (Module['websocket'] && ('object' === typeof Module['websocket']));
  
              // The default value is 'ws://' the replace is needed because the compiler replaces "//" comments with '#'
              // comments without checking context, so we'd end up with ws:#, the replace swaps the "#" for "//" again.
              var url = 'ws:#'.replace('#', '//');
  
              if (runtimeConfig) {
                if ('string' === typeof Module['websocket']['url']) {
                  url = Module['websocket']['url']; // Fetch runtime WebSocket URL config.
                }
              }
  
              if (url === 'ws://' || url === 'wss://') { // Is the supplied URL config just a prefix, if so complete it.
                url = url + addr + ':' + port;
              }
  
              // Make the WebSocket subprotocol (Sec-WebSocket-Protocol) default to binary if no configuration is set.
              var subProtocols = 'binary'; // The default value is 'binary'
  
              if (runtimeConfig) {
                if ('string' === typeof Module['websocket']['subprotocol']) {
                  subProtocols = Module['websocket']['subprotocol']; // Fetch runtime WebSocket subprotocol config.
                }
              }
  
              // The regex trims the string (removes spaces at the beginning and end, then splits the string by
              // <any space>,<any space> into an Array. Whitespace removal is important for Websockify and ws.
              subProtocols = subProtocols.replace(/^ +| +$/g,"").split(/ *, */);
  
              // The node ws library API for specifying optional subprotocol is slightly different than the browser's.
              var opts = ENVIRONMENT_IS_NODE ? {'protocol': subProtocols.toString()} : subProtocols;
  
              // If node we use the ws library.
              var WebSocket = ENVIRONMENT_IS_NODE ? require('ws') : window['WebSocket'];
              ws = new WebSocket(url, opts);
              ws.binaryType = 'arraybuffer';
            } catch (e) {
              throw new FS.ErrnoError(ERRNO_CODES.EHOSTUNREACH);
            }
          }
  
  
          var peer = {
            addr: addr,
            port: port,
            socket: ws,
            dgram_send_queue: []
          };
  
          SOCKFS.websocket_sock_ops.addPeer(sock, peer);
          SOCKFS.websocket_sock_ops.handlePeerEvents(sock, peer);
  
          // if this is a bound dgram socket, send the port number first to allow
          // us to override the ephemeral port reported to us by remotePort on the
          // remote end.
          if (sock.type === 2 && typeof sock.sport !== 'undefined') {
            peer.dgram_send_queue.push(new Uint8Array([
                255, 255, 255, 255,
                'p'.charCodeAt(0), 'o'.charCodeAt(0), 'r'.charCodeAt(0), 't'.charCodeAt(0),
                ((sock.sport & 0xff00) >> 8) , (sock.sport & 0xff)
            ]));
          }
  
          return peer;
        },getPeer:function (sock, addr, port) {
          return sock.peers[addr + ':' + port];
        },addPeer:function (sock, peer) {
          sock.peers[peer.addr + ':' + peer.port] = peer;
        },removePeer:function (sock, peer) {
          delete sock.peers[peer.addr + ':' + peer.port];
        },handlePeerEvents:function (sock, peer) {
          var first = true;
  
          var handleOpen = function () {
            try {
              var queued = peer.dgram_send_queue.shift();
              while (queued) {
                peer.socket.send(queued);
                queued = peer.dgram_send_queue.shift();
              }
            } catch (e) {
              // not much we can do here in the way of proper error handling as we've already
              // lied and said this data was sent. shut it down.
              peer.socket.close();
            }
          };
  
          function handleMessage(data) {
            assert(typeof data !== 'string' && data.byteLength !== undefined);  // must receive an ArrayBuffer
            data = new Uint8Array(data);  // make a typed array view on the array buffer
  
  
            // if this is the port message, override the peer's port with it
            var wasfirst = first;
            first = false;
            if (wasfirst &&
                data.length === 10 &&
                data[0] === 255 && data[1] === 255 && data[2] === 255 && data[3] === 255 &&
                data[4] === 'p'.charCodeAt(0) && data[5] === 'o'.charCodeAt(0) && data[6] === 'r'.charCodeAt(0) && data[7] === 't'.charCodeAt(0)) {
              // update the peer's port and it's key in the peer map
              var newport = ((data[8] << 8) | data[9]);
              SOCKFS.websocket_sock_ops.removePeer(sock, peer);
              peer.port = newport;
              SOCKFS.websocket_sock_ops.addPeer(sock, peer);
              return;
            }
  
            sock.recv_queue.push({ addr: peer.addr, port: peer.port, data: data });
          };
  
          if (ENVIRONMENT_IS_NODE) {
            peer.socket.on('open', handleOpen);
            peer.socket.on('message', function(data, flags) {
              if (!flags.binary) {
                return;
              }
              handleMessage((new Uint8Array(data)).buffer);  // copy from node Buffer -> ArrayBuffer
            });
            peer.socket.on('error', function() {
              // don't throw
            });
          } else {
            peer.socket.onopen = handleOpen;
            peer.socket.onmessage = function peer_socket_onmessage(event) {
              handleMessage(event.data);
            };
          }
        },poll:function (sock) {
          if (sock.type === 1 && sock.server) {
            // listen sockets should only say they're available for reading
            // if there are pending clients.
            return sock.pending.length ? (64 | 1) : 0;
          }
  
          var mask = 0;
          var dest = sock.type === 1 ?  // we only care about the socket state for connection-based sockets
            SOCKFS.websocket_sock_ops.getPeer(sock, sock.daddr, sock.dport) :
            null;
  
          if (sock.recv_queue.length ||
              !dest ||  // connection-less sockets are always ready to read
              (dest && dest.socket.readyState === dest.socket.CLOSING) ||
              (dest && dest.socket.readyState === dest.socket.CLOSED)) {  // let recv return 0 once closed
            mask |= (64 | 1);
          }
  
          if (!dest ||  // connection-less sockets are always ready to write
              (dest && dest.socket.readyState === dest.socket.OPEN)) {
            mask |= 4;
          }
  
          if ((dest && dest.socket.readyState === dest.socket.CLOSING) ||
              (dest && dest.socket.readyState === dest.socket.CLOSED)) {
            mask |= 16;
          }
  
          return mask;
        },ioctl:function (sock, request, arg) {
          switch (request) {
            case 21531:
              var bytes = 0;
              if (sock.recv_queue.length) {
                bytes = sock.recv_queue[0].data.length;
              }
              HEAP32[((arg)>>2)]=bytes;
              return 0;
            default:
              return ERRNO_CODES.EINVAL;
          }
        },close:function (sock) {
          // if we've spawned a listen server, close it
          if (sock.server) {
            try {
              sock.server.close();
            } catch (e) {
            }
            sock.server = null;
          }
          // close any peer connections
          var peers = Object.keys(sock.peers);
          for (var i = 0; i < peers.length; i++) {
            var peer = sock.peers[peers[i]];
            try {
              peer.socket.close();
            } catch (e) {
            }
            SOCKFS.websocket_sock_ops.removePeer(sock, peer);
          }
          return 0;
        },bind:function (sock, addr, port) {
          if (typeof sock.saddr !== 'undefined' || typeof sock.sport !== 'undefined') {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);  // already bound
          }
          sock.saddr = addr;
          sock.sport = port || _mkport();
          // in order to emulate dgram sockets, we need to launch a listen server when
          // binding on a connection-less socket
          // note: this is only required on the server side
          if (sock.type === 2) {
            // close the existing server if it exists
            if (sock.server) {
              sock.server.close();
              sock.server = null;
            }
            // swallow error operation not supported error that occurs when binding in the
            // browser where this isn't supported
            try {
              sock.sock_ops.listen(sock, 0);
            } catch (e) {
              if (!(e instanceof FS.ErrnoError)) throw e;
              if (e.errno !== ERRNO_CODES.EOPNOTSUPP) throw e;
            }
          }
        },connect:function (sock, addr, port) {
          if (sock.server) {
            throw new FS.ErrnoError(ERRNO_CODS.EOPNOTSUPP);
          }
  
          // TODO autobind
          // if (!sock.addr && sock.type == 2) {
          // }
  
          // early out if we're already connected / in the middle of connecting
          if (typeof sock.daddr !== 'undefined' && typeof sock.dport !== 'undefined') {
            var dest = SOCKFS.websocket_sock_ops.getPeer(sock, sock.daddr, sock.dport);
            if (dest) {
              if (dest.socket.readyState === dest.socket.CONNECTING) {
                throw new FS.ErrnoError(ERRNO_CODES.EALREADY);
              } else {
                throw new FS.ErrnoError(ERRNO_CODES.EISCONN);
              }
            }
          }
  
          // add the socket to our peer list and set our
          // destination address / port to match
          var peer = SOCKFS.websocket_sock_ops.createPeer(sock, addr, port);
          sock.daddr = peer.addr;
          sock.dport = peer.port;
  
          // always "fail" in non-blocking mode
          throw new FS.ErrnoError(ERRNO_CODES.EINPROGRESS);
        },listen:function (sock, backlog) {
          if (!ENVIRONMENT_IS_NODE) {
            throw new FS.ErrnoError(ERRNO_CODES.EOPNOTSUPP);
          }
          if (sock.server) {
             throw new FS.ErrnoError(ERRNO_CODES.EINVAL);  // already listening
          }
          var WebSocketServer = require('ws').Server;
          var host = sock.saddr;
          sock.server = new WebSocketServer({
            host: host,
            port: sock.sport
            // TODO support backlog
          });
  
          sock.server.on('connection', function(ws) {
            if (sock.type === 1) {
              var newsock = SOCKFS.createSocket(sock.family, sock.type, sock.protocol);
  
              // create a peer on the new socket
              var peer = SOCKFS.websocket_sock_ops.createPeer(newsock, ws);
              newsock.daddr = peer.addr;
              newsock.dport = peer.port;
  
              // push to queue for accept to pick up
              sock.pending.push(newsock);
            } else {
              // create a peer on the listen socket so calling sendto
              // with the listen socket and an address will resolve
              // to the correct client
              SOCKFS.websocket_sock_ops.createPeer(sock, ws);
            }
          });
          sock.server.on('closed', function() {
            sock.server = null;
          });
          sock.server.on('error', function() {
            // don't throw
          });
        },accept:function (listensock) {
          if (!listensock.server) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
          var newsock = listensock.pending.shift();
          newsock.stream.flags = listensock.stream.flags;
          return newsock;
        },getname:function (sock, peer) {
          var addr, port;
          if (peer) {
            if (sock.daddr === undefined || sock.dport === undefined) {
              throw new FS.ErrnoError(ERRNO_CODES.ENOTCONN);
            }
            addr = sock.daddr;
            port = sock.dport;
          } else {
            // TODO saddr and sport will be set for bind()'d UDP sockets, but what
            // should we be returning for TCP sockets that've been connect()'d?
            addr = sock.saddr || 0;
            port = sock.sport || 0;
          }
          return { addr: addr, port: port };
        },sendmsg:function (sock, buffer, offset, length, addr, port) {
          if (sock.type === 2) {
            // connection-less sockets will honor the message address,
            // and otherwise fall back to the bound destination address
            if (addr === undefined || port === undefined) {
              addr = sock.daddr;
              port = sock.dport;
            }
            // if there was no address to fall back to, error out
            if (addr === undefined || port === undefined) {
              throw new FS.ErrnoError(ERRNO_CODES.EDESTADDRREQ);
            }
          } else {
            // connection-based sockets will only use the bound
            addr = sock.daddr;
            port = sock.dport;
          }
  
          // find the peer for the destination address
          var dest = SOCKFS.websocket_sock_ops.getPeer(sock, addr, port);
  
          // early out if not connected with a connection-based socket
          if (sock.type === 1) {
            if (!dest || dest.socket.readyState === dest.socket.CLOSING || dest.socket.readyState === dest.socket.CLOSED) {
              throw new FS.ErrnoError(ERRNO_CODES.ENOTCONN);
            } else if (dest.socket.readyState === dest.socket.CONNECTING) {
              throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
            }
          }
  
          // create a copy of the incoming data to send, as the WebSocket API
          // doesn't work entirely with an ArrayBufferView, it'll just send
          // the entire underlying buffer
          var data;
          if (buffer instanceof Array || buffer instanceof ArrayBuffer) {
            data = buffer.slice(offset, offset + length);
          } else {  // ArrayBufferView
            data = buffer.buffer.slice(buffer.byteOffset + offset, buffer.byteOffset + offset + length);
          }
  
          // if we're emulating a connection-less dgram socket and don't have
          // a cached connection, queue the buffer to send upon connect and
          // lie, saying the data was sent now.
          if (sock.type === 2) {
            if (!dest || dest.socket.readyState !== dest.socket.OPEN) {
              // if we're not connected, open a new connection
              if (!dest || dest.socket.readyState === dest.socket.CLOSING || dest.socket.readyState === dest.socket.CLOSED) {
                dest = SOCKFS.websocket_sock_ops.createPeer(sock, addr, port);
              }
              dest.dgram_send_queue.push(data);
              return length;
            }
          }
  
          try {
            // send the actual data
            dest.socket.send(data);
            return length;
          } catch (e) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
        },recvmsg:function (sock, length) {
          // http://pubs.opengroup.org/onlinepubs/7908799/xns/recvmsg.html
          if (sock.type === 1 && sock.server) {
            // tcp servers should not be recv()'ing on the listen socket
            throw new FS.ErrnoError(ERRNO_CODES.ENOTCONN);
          }
  
          var queued = sock.recv_queue.shift();
          if (!queued) {
            if (sock.type === 1) {
              var dest = SOCKFS.websocket_sock_ops.getPeer(sock, sock.daddr, sock.dport);
  
              if (!dest) {
                // if we have a destination address but are not connected, error out
                throw new FS.ErrnoError(ERRNO_CODES.ENOTCONN);
              }
              else if (dest.socket.readyState === dest.socket.CLOSING || dest.socket.readyState === dest.socket.CLOSED) {
                // return null if the socket has closed
                return null;
              }
              else {
                // else, our socket is in a valid state but truly has nothing available
                throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
              }
            } else {
              throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
            }
          }
  
          // queued.data will be an ArrayBuffer if it's unadulterated, but if it's
          // requeued TCP data it'll be an ArrayBufferView
          var queuedLength = queued.data.byteLength || queued.data.length;
          var queuedOffset = queued.data.byteOffset || 0;
          var queuedBuffer = queued.data.buffer || queued.data;
          var bytesRead = Math.min(length, queuedLength);
          var res = {
            buffer: new Uint8Array(queuedBuffer, queuedOffset, bytesRead),
            addr: queued.addr,
            port: queued.port
          };
  
  
          // push back any unread data for TCP connections
          if (sock.type === 1 && bytesRead < queuedLength) {
            var bytesRemaining = queuedLength - bytesRead;
            queued.data = new Uint8Array(queuedBuffer, queuedOffset + bytesRead, bytesRemaining);
            sock.recv_queue.unshift(queued);
          }
  
          return res;
        }}};function _recv(fd, buf, len, flags) {
      var sock = SOCKFS.getSocket(fd);
      if (!sock) {
        ___setErrNo(ERRNO_CODES.EBADF);
        return -1;
      }
      // TODO honor flags
      return _read(fd, buf, len);
    }
  
  function _pread(fildes, buf, nbyte, offset) {
      // ssize_t pread(int fildes, void *buf, size_t nbyte, off_t offset);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/read.html
      var stream = FS.getStream(fildes);
      if (!stream) {
        ___setErrNo(ERRNO_CODES.EBADF);
        return -1;
      }
      try {
        var slab = HEAP8;
        return FS.read(stream, slab, buf, nbyte, offset);
      } catch (e) {
        FS.handleFSError(e);
        return -1;
      }
    }function _read(fildes, buf, nbyte) {
      // ssize_t read(int fildes, void *buf, size_t nbyte);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/read.html
      var stream = FS.getStream(fildes);
      if (!stream) {
        ___setErrNo(ERRNO_CODES.EBADF);
        return -1;
      }
  
  
      try {
        var slab = HEAP8;
        return FS.read(stream, slab, buf, nbyte);
      } catch (e) {
        FS.handleFSError(e);
        return -1;
      }
    }function _fread(ptr, size, nitems, stream) {
      // size_t fread(void *restrict ptr, size_t size, size_t nitems, FILE *restrict stream);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/fread.html
      var bytesToRead = nitems * size;
      if (bytesToRead == 0) {
        return 0;
      }
      var bytesRead = 0;
      var streamObj = FS.getStreamFromPtr(stream);
      if (!streamObj) {
        ___setErrNo(ERRNO_CODES.EBADF);
        return 0;
      }
      while (streamObj.ungotten.length && bytesToRead > 0) {
        HEAP8[((ptr++)|0)]=streamObj.ungotten.pop();
        bytesToRead--;
        bytesRead++;
      }
      var err = _read(streamObj.fd, ptr, bytesToRead);
      if (err == -1) {
        if (streamObj) streamObj.error = true;
        return 0;
      }
      bytesRead += err;
      if (bytesRead < bytesToRead) streamObj.eof = true;
      return Math.floor(bytesRead / size);
    }function _fgetc(stream) {
      // int fgetc(FILE *stream);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/fgetc.html
      var streamObj = FS.getStreamFromPtr(stream);
      if (!streamObj) return -1;
      if (streamObj.eof || streamObj.error) return -1;
      var ret = _fread(_fgetc.ret, 1, 1, stream);
      if (ret == 0) {
        return -1;
      } else if (ret == -1) {
        streamObj.error = true;
        return -1;
      } else {
        return HEAPU8[((_fgetc.ret)|0)];
      }
    }var _getc=_fgetc;

   
  Module["_i64Subtract"] = _i64Subtract;

  var _fabsf=Math_abs;

   
  Module["_i64Add"] = _i64Add;

  
  function __ZSt18uncaught_exceptionv() { // std::uncaught_exception()
      return !!__ZSt18uncaught_exceptionv.uncaught_exception;
    }
  
  
  
  function ___cxa_is_number_type(type) {
      var isNumber = false;
      try { if (type == __ZTIi) isNumber = true } catch(e){}
      try { if (type == __ZTIj) isNumber = true } catch(e){}
      try { if (type == __ZTIl) isNumber = true } catch(e){}
      try { if (type == __ZTIm) isNumber = true } catch(e){}
      try { if (type == __ZTIx) isNumber = true } catch(e){}
      try { if (type == __ZTIy) isNumber = true } catch(e){}
      try { if (type == __ZTIf) isNumber = true } catch(e){}
      try { if (type == __ZTId) isNumber = true } catch(e){}
      try { if (type == __ZTIe) isNumber = true } catch(e){}
      try { if (type == __ZTIc) isNumber = true } catch(e){}
      try { if (type == __ZTIa) isNumber = true } catch(e){}
      try { if (type == __ZTIh) isNumber = true } catch(e){}
      try { if (type == __ZTIs) isNumber = true } catch(e){}
      try { if (type == __ZTIt) isNumber = true } catch(e){}
      return isNumber;
    }function ___cxa_does_inherit(definiteType, possibilityType, possibility) {
      if (possibility == 0) return false;
      if (possibilityType == 0 || possibilityType == definiteType)
        return true;
      var possibility_type_info;
      if (___cxa_is_number_type(possibilityType)) {
        possibility_type_info = possibilityType;
      } else {
        var possibility_type_infoAddr = HEAP32[((possibilityType)>>2)] - 8;
        possibility_type_info = HEAP32[((possibility_type_infoAddr)>>2)];
      }
      switch (possibility_type_info) {
      case 0: // possibility is a pointer
        // See if definite type is a pointer
        var definite_type_infoAddr = HEAP32[((definiteType)>>2)] - 8;
        var definite_type_info = HEAP32[((definite_type_infoAddr)>>2)];
        if (definite_type_info == 0) {
          // Also a pointer; compare base types of pointers
          var defPointerBaseAddr = definiteType+8;
          var defPointerBaseType = HEAP32[((defPointerBaseAddr)>>2)];
          var possPointerBaseAddr = possibilityType+8;
          var possPointerBaseType = HEAP32[((possPointerBaseAddr)>>2)];
          return ___cxa_does_inherit(defPointerBaseType, possPointerBaseType, possibility);
        } else
          return false; // one pointer and one non-pointer
      case 1: // class with no base class
        return false;
      case 2: // class with base class
        var parentTypeAddr = possibilityType + 8;
        var parentType = HEAP32[((parentTypeAddr)>>2)];
        return ___cxa_does_inherit(definiteType, parentType, possibility);
      default:
        return false; // some unencountered type
      }
    }
  
  
  
  var ___cxa_last_thrown_exception=0;function ___resumeException(ptr) {
      if (!___cxa_last_thrown_exception) { ___cxa_last_thrown_exception = ptr; }
      throw ptr + " - Exception catching is disabled, this exception cannot be caught. Compile with -s DISABLE_EXCEPTION_CATCHING=0 or DISABLE_EXCEPTION_CATCHING=2 to catch.";
    }
  
  var ___cxa_exception_header_size=8;function ___cxa_find_matching_catch(thrown, throwntype) {
      if (thrown == -1) thrown = ___cxa_last_thrown_exception;
      header = thrown - ___cxa_exception_header_size;
      if (throwntype == -1) throwntype = HEAP32[((header)>>2)];
      var typeArray = Array.prototype.slice.call(arguments, 2);
  
      // If throwntype is a pointer, this means a pointer has been
      // thrown. When a pointer is thrown, actually what's thrown
      // is a pointer to the pointer. We'll dereference it.
      if (throwntype != 0 && !___cxa_is_number_type(throwntype)) {
        var throwntypeInfoAddr= HEAP32[((throwntype)>>2)] - 8;
        var throwntypeInfo= HEAP32[((throwntypeInfoAddr)>>2)];
        if (throwntypeInfo == 0)
          thrown = HEAP32[((thrown)>>2)];
      }
      // The different catch blocks are denoted by different types.
      // Due to inheritance, those types may not precisely match the
      // type of the thrown object. Find one which matches, and
      // return the type of the catch block which should be called.
      for (var i = 0; i < typeArray.length; i++) {
        if (___cxa_does_inherit(typeArray[i], throwntype, thrown))
          return ((asm["setTempRet0"](typeArray[i]),thrown)|0);
      }
      // Shouldn't happen unless we have bogus data in typeArray
      // or encounter a type for which emscripten doesn't have suitable
      // typeinfo defined. Best-efforts match just in case.
      return ((asm["setTempRet0"](throwntype),thrown)|0);
    }function ___cxa_throw(ptr, type, destructor) {
      if (!___cxa_throw.initialized) {
        try {
          HEAP32[((__ZTVN10__cxxabiv119__pointer_type_infoE)>>2)]=0; // Workaround for libcxxabi integration bug
        } catch(e){}
        try {
          HEAP32[((__ZTVN10__cxxabiv117__class_type_infoE)>>2)]=1; // Workaround for libcxxabi integration bug
        } catch(e){}
        try {
          HEAP32[((__ZTVN10__cxxabiv120__si_class_type_infoE)>>2)]=2; // Workaround for libcxxabi integration bug
        } catch(e){}
        ___cxa_throw.initialized = true;
      }
      var header = ptr - ___cxa_exception_header_size;
      HEAP32[((header)>>2)]=type;
      HEAP32[(((header)+(4))>>2)]=destructor;
      ___cxa_last_thrown_exception = ptr;
      if (!("uncaught_exception" in __ZSt18uncaught_exceptionv)) {
        __ZSt18uncaught_exceptionv.uncaught_exception = 1;
      } else {
        __ZSt18uncaught_exceptionv.uncaught_exception++;
      }
      throw ptr + " - Exception catching is disabled, this exception cannot be caught. Compile with -s DISABLE_EXCEPTION_CATCHING=0 or DISABLE_EXCEPTION_CATCHING=2 to catch.";
    }

  
  function _close(fildes) {
      // int close(int fildes);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/close.html
      var stream = FS.getStream(fildes);
      if (!stream) {
        ___setErrNo(ERRNO_CODES.EBADF);
        return -1;
      }
      try {
        FS.close(stream);
        return 0;
      } catch (e) {
        FS.handleFSError(e);
        return -1;
      }
    }
  
  function _fsync(fildes) {
      // int fsync(int fildes);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/fsync.html
      var stream = FS.getStream(fildes);
      if (stream) {
        // We write directly to the file system, so there's nothing to do here.
        return 0;
      } else {
        ___setErrNo(ERRNO_CODES.EBADF);
        return -1;
      }
    }
  
  function _fileno(stream) {
      // int fileno(FILE *stream);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/fileno.html
      stream = FS.getStreamFromPtr(stream);
      if (!stream) return -1;
      return stream.fd;
    }function _fclose(stream) {
      // int fclose(FILE *stream);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/fclose.html
      var fd = _fileno(stream);
      _fsync(fd);
      return _close(fd);
    }

  function _pthread_mutex_lock() {}


  
  function _open(path, oflag, varargs) {
      // int open(const char *path, int oflag, ...);
      // http://pubs.opengroup.org/onlinepubs/009695399/functions/open.html
      var mode = HEAP32[((varargs)>>2)];
      path = Pointer_stringify(path);
      try {
        var stream = FS.open(path, oflag, mode);
        return stream.fd;
      } catch (e) {
        FS.handleFSError(e);
        return -1;
      }
    }function _fopen(filename, mode) {
      // FILE *fopen(const char *restrict filename, const char *restrict mode);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/fopen.html
      var flags;
      mode = Pointer_stringify(mode);
      if (mode[0] == 'r') {
        if (mode.indexOf('+') != -1) {
          flags = 2;
        } else {
          flags = 0;
        }
      } else if (mode[0] == 'w') {
        if (mode.indexOf('+') != -1) {
          flags = 2;
        } else {
          flags = 1;
        }
        flags |= 64;
        flags |= 512;
      } else if (mode[0] == 'a') {
        if (mode.indexOf('+') != -1) {
          flags = 2;
        } else {
          flags = 1;
        }
        flags |= 64;
        flags |= 1024;
      } else {
        ___setErrNo(ERRNO_CODES.EINVAL);
        return 0;
      }
      var fd = _open(filename, flags, allocate([0x1FF, 0, 0, 0], 'i32', ALLOC_STACK));  // All creation permissions.
      return fd === -1 ? 0 : FS.getPtrForStream(FS.getStream(fd));
    }


  var _emscripten_check_longjmp=true;

  
  
  
  function _isspace(chr) {
      return (chr == 32) || (chr >= 9 && chr <= 13);
    }
  function __parseInt64(str, endptr, base, min, max, unsign) {
      var isNegative = false;
      // Skip space.
      while (_isspace(HEAP8[(str)])) str++;
  
      // Check for a plus/minus sign.
      if (HEAP8[(str)] == 45) {
        str++;
        isNegative = true;
      } else if (HEAP8[(str)] == 43) {
        str++;
      }
  
      // Find base.
      var ok = false;
      var finalBase = base;
      if (!finalBase) {
        if (HEAP8[(str)] == 48) {
          if (HEAP8[((str+1)|0)] == 120 ||
              HEAP8[((str+1)|0)] == 88) {
            finalBase = 16;
            str += 2;
          } else {
            finalBase = 8;
            ok = true; // we saw an initial zero, perhaps the entire thing is just "0"
          }
        }
      } else if (finalBase==16) {
        if (HEAP8[(str)] == 48) {
          if (HEAP8[((str+1)|0)] == 120 ||
              HEAP8[((str+1)|0)] == 88) {
            str += 2;
          }
        }
      }
      if (!finalBase) finalBase = 10;
      var start = str;
  
      // Get digits.
      var chr;
      while ((chr = HEAP8[(str)]) != 0) {
        var digit = parseInt(String.fromCharCode(chr), finalBase);
        if (isNaN(digit)) {
          break;
        } else {
          str++;
          ok = true;
        }
      }
  
      if (!ok) {
        ___setErrNo(ERRNO_CODES.EINVAL);
        return ((asm["setTempRet0"](0),0)|0);
      }
  
      // Set end pointer.
      if (endptr) {
        HEAP32[((endptr)>>2)]=str;
      }
  
      try {
        var numberString = isNegative ? '-'+Pointer_stringify(start, str - start) : Pointer_stringify(start, str - start);
        i64Math.fromString(numberString, finalBase, min, max, unsign);
      } catch(e) {
        ___setErrNo(ERRNO_CODES.ERANGE); // not quite correct
      }
  
      return ((asm["setTempRet0"](((HEAP32[(((tempDoublePtr)+(4))>>2)])|0)),((HEAP32[((tempDoublePtr)>>2)])|0))|0);
    }function _strtoull(str, endptr, base) {
      return __parseInt64(str, endptr, base, 0, '18446744073709551615', true);  // ULONG_MAX.
    }function _strtoull_l(str, endptr, base) {
      return _strtoull(str, endptr, base); // no locale support yet
    }

  
  
   
  Module["_strlen"] = _strlen;
  
  function __reallyNegative(x) {
      return x < 0 || (x === 0 && (1/x) === -Infinity);
    }function __formatString(format, varargs) {
      var textIndex = format;
      var argIndex = 0;
      function getNextArg(type) {
        // NOTE: Explicitly ignoring type safety. Otherwise this fails:
        //       int x = 4; printf("%c\n", (char)x);
        var ret;
        if (type === 'double') {
          ret = (HEAP32[((tempDoublePtr)>>2)]=HEAP32[(((varargs)+(argIndex))>>2)],HEAP32[(((tempDoublePtr)+(4))>>2)]=HEAP32[(((varargs)+((argIndex)+(4)))>>2)],(+(HEAPF64[(tempDoublePtr)>>3])));
        } else if (type == 'i64') {
          ret = [HEAP32[(((varargs)+(argIndex))>>2)],
                 HEAP32[(((varargs)+(argIndex+4))>>2)]];
  
        } else {
          type = 'i32'; // varargs are always i32, i64, or double
          ret = HEAP32[(((varargs)+(argIndex))>>2)];
        }
        argIndex += Runtime.getNativeFieldSize(type);
        return ret;
      }
  
      var ret = [];
      var curr, next, currArg;
      while(1) {
        var startTextIndex = textIndex;
        curr = HEAP8[(textIndex)];
        if (curr === 0) break;
        next = HEAP8[((textIndex+1)|0)];
        if (curr == 37) {
          // Handle flags.
          var flagAlwaysSigned = false;
          var flagLeftAlign = false;
          var flagAlternative = false;
          var flagZeroPad = false;
          var flagPadSign = false;
          flagsLoop: while (1) {
            switch (next) {
              case 43:
                flagAlwaysSigned = true;
                break;
              case 45:
                flagLeftAlign = true;
                break;
              case 35:
                flagAlternative = true;
                break;
              case 48:
                if (flagZeroPad) {
                  break flagsLoop;
                } else {
                  flagZeroPad = true;
                  break;
                }
              case 32:
                flagPadSign = true;
                break;
              default:
                break flagsLoop;
            }
            textIndex++;
            next = HEAP8[((textIndex+1)|0)];
          }
  
          // Handle width.
          var width = 0;
          if (next == 42) {
            width = getNextArg('i32');
            textIndex++;
            next = HEAP8[((textIndex+1)|0)];
          } else {
            while (next >= 48 && next <= 57) {
              width = width * 10 + (next - 48);
              textIndex++;
              next = HEAP8[((textIndex+1)|0)];
            }
          }
  
          // Handle precision.
          var precisionSet = false, precision = -1;
          if (next == 46) {
            precision = 0;
            precisionSet = true;
            textIndex++;
            next = HEAP8[((textIndex+1)|0)];
            if (next == 42) {
              precision = getNextArg('i32');
              textIndex++;
            } else {
              while(1) {
                var precisionChr = HEAP8[((textIndex+1)|0)];
                if (precisionChr < 48 ||
                    precisionChr > 57) break;
                precision = precision * 10 + (precisionChr - 48);
                textIndex++;
              }
            }
            next = HEAP8[((textIndex+1)|0)];
          }
          if (precision < 0) {
            precision = 6; // Standard default.
            precisionSet = false;
          }
  
          // Handle integer sizes. WARNING: These assume a 32-bit architecture!
          var argSize;
          switch (String.fromCharCode(next)) {
            case 'h':
              var nextNext = HEAP8[((textIndex+2)|0)];
              if (nextNext == 104) {
                textIndex++;
                argSize = 1; // char (actually i32 in varargs)
              } else {
                argSize = 2; // short (actually i32 in varargs)
              }
              break;
            case 'l':
              var nextNext = HEAP8[((textIndex+2)|0)];
              if (nextNext == 108) {
                textIndex++;
                argSize = 8; // long long
              } else {
                argSize = 4; // long
              }
              break;
            case 'L': // long long
            case 'q': // int64_t
            case 'j': // intmax_t
              argSize = 8;
              break;
            case 'z': // size_t
            case 't': // ptrdiff_t
            case 'I': // signed ptrdiff_t or unsigned size_t
              argSize = 4;
              break;
            default:
              argSize = null;
          }
          if (argSize) textIndex++;
          next = HEAP8[((textIndex+1)|0)];
  
          // Handle type specifier.
          switch (String.fromCharCode(next)) {
            case 'd': case 'i': case 'u': case 'o': case 'x': case 'X': case 'p': {
              // Integer.
              var signed = next == 100 || next == 105;
              argSize = argSize || 4;
              var currArg = getNextArg('i' + (argSize * 8));
              var origArg = currArg;
              var argText;
              // Flatten i64-1 [low, high] into a (slightly rounded) double
              if (argSize == 8) {
                currArg = Runtime.makeBigInt(currArg[0], currArg[1], next == 117);
              }
              // Truncate to requested size.
              if (argSize <= 4) {
                var limit = Math.pow(256, argSize) - 1;
                currArg = (signed ? reSign : unSign)(currArg & limit, argSize * 8);
              }
              // Format the number.
              var currAbsArg = Math.abs(currArg);
              var prefix = '';
              if (next == 100 || next == 105) {
                if (argSize == 8 && i64Math) argText = i64Math.stringify(origArg[0], origArg[1], null); else
                argText = reSign(currArg, 8 * argSize, 1).toString(10);
              } else if (next == 117) {
                if (argSize == 8 && i64Math) argText = i64Math.stringify(origArg[0], origArg[1], true); else
                argText = unSign(currArg, 8 * argSize, 1).toString(10);
                currArg = Math.abs(currArg);
              } else if (next == 111) {
                argText = (flagAlternative ? '0' : '') + currAbsArg.toString(8);
              } else if (next == 120 || next == 88) {
                prefix = (flagAlternative && currArg != 0) ? '0x' : '';
                if (argSize == 8 && i64Math) {
                  if (origArg[1]) {
                    argText = (origArg[1]>>>0).toString(16);
                    var lower = (origArg[0]>>>0).toString(16);
                    while (lower.length < 8) lower = '0' + lower;
                    argText += lower;
                  } else {
                    argText = (origArg[0]>>>0).toString(16);
                  }
                } else
                if (currArg < 0) {
                  // Represent negative numbers in hex as 2's complement.
                  currArg = -currArg;
                  argText = (currAbsArg - 1).toString(16);
                  var buffer = [];
                  for (var i = 0; i < argText.length; i++) {
                    buffer.push((0xF - parseInt(argText[i], 16)).toString(16));
                  }
                  argText = buffer.join('');
                  while (argText.length < argSize * 2) argText = 'f' + argText;
                } else {
                  argText = currAbsArg.toString(16);
                }
                if (next == 88) {
                  prefix = prefix.toUpperCase();
                  argText = argText.toUpperCase();
                }
              } else if (next == 112) {
                if (currAbsArg === 0) {
                  argText = '(nil)';
                } else {
                  prefix = '0x';
                  argText = currAbsArg.toString(16);
                }
              }
              if (precisionSet) {
                while (argText.length < precision) {
                  argText = '0' + argText;
                }
              }
  
              // Add sign if needed
              if (currArg >= 0) {
                if (flagAlwaysSigned) {
                  prefix = '+' + prefix;
                } else if (flagPadSign) {
                  prefix = ' ' + prefix;
                }
              }
  
              // Move sign to prefix so we zero-pad after the sign
              if (argText.charAt(0) == '-') {
                prefix = '-' + prefix;
                argText = argText.substr(1);
              }
  
              // Add padding.
              while (prefix.length + argText.length < width) {
                if (flagLeftAlign) {
                  argText += ' ';
                } else {
                  if (flagZeroPad) {
                    argText = '0' + argText;
                  } else {
                    prefix = ' ' + prefix;
                  }
                }
              }
  
              // Insert the result into the buffer.
              argText = prefix + argText;
              argText.split('').forEach(function(chr) {
                ret.push(chr.charCodeAt(0));
              });
              break;
            }
            case 'f': case 'F': case 'e': case 'E': case 'g': case 'G': {
              // Float.
              var currArg = getNextArg('double');
              var argText;
              if (isNaN(currArg)) {
                argText = 'nan';
                flagZeroPad = false;
              } else if (!isFinite(currArg)) {
                argText = (currArg < 0 ? '-' : '') + 'inf';
                flagZeroPad = false;
              } else {
                var isGeneral = false;
                var effectivePrecision = Math.min(precision, 20);
  
                // Convert g/G to f/F or e/E, as per:
                // http://pubs.opengroup.org/onlinepubs/9699919799/functions/printf.html
                if (next == 103 || next == 71) {
                  isGeneral = true;
                  precision = precision || 1;
                  var exponent = parseInt(currArg.toExponential(effectivePrecision).split('e')[1], 10);
                  if (precision > exponent && exponent >= -4) {
                    next = ((next == 103) ? 'f' : 'F').charCodeAt(0);
                    precision -= exponent + 1;
                  } else {
                    next = ((next == 103) ? 'e' : 'E').charCodeAt(0);
                    precision--;
                  }
                  effectivePrecision = Math.min(precision, 20);
                }
  
                if (next == 101 || next == 69) {
                  argText = currArg.toExponential(effectivePrecision);
                  // Make sure the exponent has at least 2 digits.
                  if (/[eE][-+]\d$/.test(argText)) {
                    argText = argText.slice(0, -1) + '0' + argText.slice(-1);
                  }
                } else if (next == 102 || next == 70) {
                  argText = currArg.toFixed(effectivePrecision);
                  if (currArg === 0 && __reallyNegative(currArg)) {
                    argText = '-' + argText;
                  }
                }
  
                var parts = argText.split('e');
                if (isGeneral && !flagAlternative) {
                  // Discard trailing zeros and periods.
                  while (parts[0].length > 1 && parts[0].indexOf('.') != -1 &&
                         (parts[0].slice(-1) == '0' || parts[0].slice(-1) == '.')) {
                    parts[0] = parts[0].slice(0, -1);
                  }
                } else {
                  // Make sure we have a period in alternative mode.
                  if (flagAlternative && argText.indexOf('.') == -1) parts[0] += '.';
                  // Zero pad until required precision.
                  while (precision > effectivePrecision++) parts[0] += '0';
                }
                argText = parts[0] + (parts.length > 1 ? 'e' + parts[1] : '');
  
                // Capitalize 'E' if needed.
                if (next == 69) argText = argText.toUpperCase();
  
                // Add sign.
                if (currArg >= 0) {
                  if (flagAlwaysSigned) {
                    argText = '+' + argText;
                  } else if (flagPadSign) {
                    argText = ' ' + argText;
                  }
                }
              }
  
              // Add padding.
              while (argText.length < width) {
                if (flagLeftAlign) {
                  argText += ' ';
                } else {
                  if (flagZeroPad && (argText[0] == '-' || argText[0] == '+')) {
                    argText = argText[0] + '0' + argText.slice(1);
                  } else {
                    argText = (flagZeroPad ? '0' : ' ') + argText;
                  }
                }
              }
  
              // Adjust case.
              if (next < 97) argText = argText.toUpperCase();
  
              // Insert the result into the buffer.
              argText.split('').forEach(function(chr) {
                ret.push(chr.charCodeAt(0));
              });
              break;
            }
            case 's': {
              // String.
              var arg = getNextArg('i8*');
              var argLength = arg ? _strlen(arg) : '(null)'.length;
              if (precisionSet) argLength = Math.min(argLength, precision);
              if (!flagLeftAlign) {
                while (argLength < width--) {
                  ret.push(32);
                }
              }
              if (arg) {
                for (var i = 0; i < argLength; i++) {
                  ret.push(HEAPU8[((arg++)|0)]);
                }
              } else {
                ret = ret.concat(intArrayFromString('(null)'.substr(0, argLength), true));
              }
              if (flagLeftAlign) {
                while (argLength < width--) {
                  ret.push(32);
                }
              }
              break;
            }
            case 'c': {
              // Character.
              if (flagLeftAlign) ret.push(getNextArg('i8'));
              while (--width > 0) {
                ret.push(32);
              }
              if (!flagLeftAlign) ret.push(getNextArg('i8'));
              break;
            }
            case 'n': {
              // Write the length written so far to the next parameter.
              var ptr = getNextArg('i32*');
              HEAP32[((ptr)>>2)]=ret.length;
              break;
            }
            case '%': {
              // Literal percent sign.
              ret.push(curr);
              break;
            }
            default: {
              // Unknown specifiers remain untouched.
              for (var i = startTextIndex; i < textIndex + 2; i++) {
                ret.push(HEAP8[(i)]);
              }
            }
          }
          textIndex += 2;
          // TODO: Support a/A (hex float) and m (last error) specifiers.
          // TODO: Support %1${specifier} for arg selection.
        } else {
          ret.push(curr);
          textIndex += 1;
        }
      }
      return ret;
    }
  
  function _malloc(bytes) {
      /* Over-allocate to make sure it is byte-aligned by 8.
       * This will leak memory, but this is only the dummy
       * implementation (replaced by dlmalloc normally) so
       * not an issue.
       */
      var ptr = Runtime.dynamicAlloc(bytes + 8);
      return (ptr+8) & 0xFFFFFFF8;
    }
  Module["_malloc"] = _malloc;function _snprintf(s, n, format, varargs) {
      // int snprintf(char *restrict s, size_t n, const char *restrict format, ...);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/printf.html
      var result = __formatString(format, varargs);
      var limit = (n === undefined) ? result.length
                                    : Math.min(result.length, Math.max(n - 1, 0));
      if (s < 0) {
        s = -s;
        var buf = _malloc(limit+1);
        HEAP32[((s)>>2)]=buf;
        s = buf;
      }
      for (var i = 0; i < limit; i++) {
        HEAP8[(((s)+(i))|0)]=result[i];
      }
      if (limit < n || (n === undefined)) HEAP8[(((s)+(i))|0)]=0;
      return result.length;
    }

  var _emscripten_postinvoke=true;

  
  
  function _send(fd, buf, len, flags) {
      var sock = SOCKFS.getSocket(fd);
      if (!sock) {
        ___setErrNo(ERRNO_CODES.EBADF);
        return -1;
      }
      // TODO honor flags
      return _write(fd, buf, len);
    }
  
  function _pwrite(fildes, buf, nbyte, offset) {
      // ssize_t pwrite(int fildes, const void *buf, size_t nbyte, off_t offset);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/write.html
      var stream = FS.getStream(fildes);
      if (!stream) {
        ___setErrNo(ERRNO_CODES.EBADF);
        return -1;
      }
      try {
        var slab = HEAP8;
        return FS.write(stream, slab, buf, nbyte, offset);
      } catch (e) {
        FS.handleFSError(e);
        return -1;
      }
    }function _write(fildes, buf, nbyte) {
      // ssize_t write(int fildes, const void *buf, size_t nbyte);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/write.html
      var stream = FS.getStream(fildes);
      if (!stream) {
        ___setErrNo(ERRNO_CODES.EBADF);
        return -1;
      }
  
  
      try {
        var slab = HEAP8;
        return FS.write(stream, slab, buf, nbyte);
      } catch (e) {
        FS.handleFSError(e);
        return -1;
      }
    }function _fwrite(ptr, size, nitems, stream) {
      // size_t fwrite(const void *restrict ptr, size_t size, size_t nitems, FILE *restrict stream);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/fwrite.html
      var bytesToWrite = nitems * size;
      if (bytesToWrite == 0) return 0;
      var fd = _fileno(stream);
      var bytesWritten = _write(fd, ptr, bytesToWrite);
      if (bytesWritten == -1) {
        var streamObj = FS.getStreamFromPtr(stream);
        if (streamObj) streamObj.error = true;
        return 0;
      } else {
        return Math.floor(bytesWritten / size);
      }
    }

  
  function _strtoll(str, endptr, base) {
      return __parseInt64(str, endptr, base, '-9223372036854775808', '9223372036854775807');  // LLONG_MIN, LLONG_MAX.
    }function _strtoll_l(str, endptr, base) {
      return _strtoll(str, endptr, base); // no locale support yet
    }

  
  
  function _fputc(c, stream) {
      // int fputc(int c, FILE *stream);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/fputc.html
      var chr = unSign(c & 0xFF);
      HEAP8[((_fputc.ret)|0)]=chr;
      var fd = _fileno(stream);
      var ret = _write(fd, _fputc.ret, 1);
      if (ret == -1) {
        var streamObj = FS.getStreamFromPtr(stream);
        if (streamObj) streamObj.error = true;
        return -1;
      } else {
        return chr;
      }
    }function _putchar(c) {
      // int putchar(int c);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/putchar.html
      return _fputc(c, HEAP32[((_stdout)>>2)]);
    } 
  Module["_saveSetjmp"] = _saveSetjmp;

  function _time(ptr) {
      var ret = Math.floor(Date.now()/1000);
      if (ptr) {
        HEAP32[((ptr)>>2)]=ret;
      }
      return ret;
    }

  
  function _stat(path, buf, dontResolveLastLink) {
      // http://pubs.opengroup.org/onlinepubs/7908799/xsh/stat.html
      // int stat(const char *path, struct stat *buf);
      // NOTE: dontResolveLastLink is a shortcut for lstat(). It should never be
      //       used in client code.
      path = typeof path !== 'string' ? Pointer_stringify(path) : path;
      try {
        var stat = dontResolveLastLink ? FS.lstat(path) : FS.stat(path);
        HEAP32[((buf)>>2)]=stat.dev;
        HEAP32[(((buf)+(4))>>2)]=0;
        HEAP32[(((buf)+(8))>>2)]=stat.ino;
        HEAP32[(((buf)+(12))>>2)]=stat.mode;
        HEAP32[(((buf)+(16))>>2)]=stat.nlink;
        HEAP32[(((buf)+(20))>>2)]=stat.uid;
        HEAP32[(((buf)+(24))>>2)]=stat.gid;
        HEAP32[(((buf)+(28))>>2)]=stat.rdev;
        HEAP32[(((buf)+(32))>>2)]=0;
        HEAP32[(((buf)+(36))>>2)]=stat.size;
        HEAP32[(((buf)+(40))>>2)]=4096;
        HEAP32[(((buf)+(44))>>2)]=stat.blocks;
        HEAP32[(((buf)+(48))>>2)]=Math.floor(stat.atime.getTime() / 1000);
        HEAP32[(((buf)+(52))>>2)]=0;
        HEAP32[(((buf)+(56))>>2)]=Math.floor(stat.mtime.getTime() / 1000);
        HEAP32[(((buf)+(60))>>2)]=0;
        HEAP32[(((buf)+(64))>>2)]=Math.floor(stat.ctime.getTime() / 1000);
        HEAP32[(((buf)+(68))>>2)]=0;
        HEAP32[(((buf)+(72))>>2)]=stat.ino;
        return 0;
      } catch (e) {
        FS.handleFSError(e);
        return -1;
      }
    }function _fstat(fildes, buf) {
      // int fstat(int fildes, struct stat *buf);
      // http://pubs.opengroup.org/onlinepubs/7908799/xsh/fstat.html
      var stream = FS.getStream(fildes);
      if (!stream) {
        ___setErrNo(ERRNO_CODES.EBADF);
        return -1;
      }
      return _stat(stream.path, buf);
    }


  var _emscripten_prep_setjmp=true;

  var _emscripten_setjmp=true;

  function _pthread_cond_broadcast() {
      return 0;
    }

  
  
   
  Module["_testSetjmp"] = _testSetjmp;function _longjmp(env, value) {
      asm['setThrew'](env, value || 1);
      throw 'longjmp';
    }function _emscripten_longjmp(env, value) {
      _longjmp(env, value);
    }

  
  
  function __isLeapYear(year) {
        return year%4 === 0 && (year%100 !== 0 || year%400 === 0);
    }
  
  function __arraySum(array, index) {
      var sum = 0;
      for (var i = 0; i <= index; sum += array[i++]);
      return sum;
    }
  
  
  var __MONTH_DAYS_LEAP=[31,29,31,30,31,30,31,31,30,31,30,31];
  
  var __MONTH_DAYS_REGULAR=[31,28,31,30,31,30,31,31,30,31,30,31];function __addDays(date, days) {
      var newDate = new Date(date.getTime());
      while(days > 0) {
        var leap = __isLeapYear(newDate.getFullYear());
        var currentMonth = newDate.getMonth();
        var daysInCurrentMonth = (leap ? __MONTH_DAYS_LEAP : __MONTH_DAYS_REGULAR)[currentMonth];
  
        if (days > daysInCurrentMonth-newDate.getDate()) {
          // we spill over to next month
          days -= (daysInCurrentMonth-newDate.getDate()+1);
          newDate.setDate(1);
          if (currentMonth < 11) {
            newDate.setMonth(currentMonth+1)
          } else {
            newDate.setMonth(0);
            newDate.setFullYear(newDate.getFullYear()+1);
          }
        } else {
          // we stay in current month 
          newDate.setDate(newDate.getDate()+days);
          return newDate;
        }
      }
  
      return newDate;
    }function _strftime(s, maxsize, format, tm) {
      // size_t strftime(char *restrict s, size_t maxsize, const char *restrict format, const struct tm *restrict timeptr);
      // http://pubs.opengroup.org/onlinepubs/009695399/functions/strftime.html
      
      var date = {
        tm_sec: HEAP32[((tm)>>2)],
        tm_min: HEAP32[(((tm)+(4))>>2)],
        tm_hour: HEAP32[(((tm)+(8))>>2)],
        tm_mday: HEAP32[(((tm)+(12))>>2)],
        tm_mon: HEAP32[(((tm)+(16))>>2)],
        tm_year: HEAP32[(((tm)+(20))>>2)],
        tm_wday: HEAP32[(((tm)+(24))>>2)],
        tm_yday: HEAP32[(((tm)+(28))>>2)],
        tm_isdst: HEAP32[(((tm)+(32))>>2)]
      };
  
      var pattern = Pointer_stringify(format);
  
      // expand format
      var EXPANSION_RULES_1 = {
        '%c': '%a %b %d %H:%M:%S %Y',     // Replaced by the locale's appropriate date and time representation - e.g., Mon Aug  3 14:02:01 2013
        '%D': '%m/%d/%y',                 // Equivalent to %m / %d / %y
        '%F': '%Y-%m-%d',                 // Equivalent to %Y - %m - %d
        '%h': '%b',                       // Equivalent to %b
        '%r': '%I:%M:%S %p',              // Replaced by the time in a.m. and p.m. notation
        '%R': '%H:%M',                    // Replaced by the time in 24-hour notation
        '%T': '%H:%M:%S',                 // Replaced by the time
        '%x': '%m/%d/%y',                 // Replaced by the locale's appropriate date representation
        '%X': '%H:%M:%S',                 // Replaced by the locale's appropriate date representation
      };
      for (var rule in EXPANSION_RULES_1) {
        pattern = pattern.replace(new RegExp(rule, 'g'), EXPANSION_RULES_1[rule]);
      }
  
      var WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  
      function leadingSomething(value, digits, character) {
        var str = typeof value === 'number' ? value.toString() : (value || '');
        while (str.length < digits) {
          str = character[0]+str;
        }
        return str;
      };
  
      function leadingNulls(value, digits) {
        return leadingSomething(value, digits, '0');
      };
  
      function compareByDay(date1, date2) {
        function sgn(value) {
          return value < 0 ? -1 : (value > 0 ? 1 : 0);
        };
  
        var compare;
        if ((compare = sgn(date1.getFullYear()-date2.getFullYear())) === 0) {
          if ((compare = sgn(date1.getMonth()-date2.getMonth())) === 0) {
            compare = sgn(date1.getDate()-date2.getDate());
          }
        }
        return compare;
      };
  
      function getFirstWeekStartDate(janFourth) {
          switch (janFourth.getDay()) {
            case 0: // Sunday
              return new Date(janFourth.getFullYear()-1, 11, 29);
            case 1: // Monday
              return janFourth;
            case 2: // Tuesday
              return new Date(janFourth.getFullYear(), 0, 3);
            case 3: // Wednesday
              return new Date(janFourth.getFullYear(), 0, 2);
            case 4: // Thursday
              return new Date(janFourth.getFullYear(), 0, 1);
            case 5: // Friday
              return new Date(janFourth.getFullYear()-1, 11, 31);
            case 6: // Saturday
              return new Date(janFourth.getFullYear()-1, 11, 30);
          }
      };
  
      function getWeekBasedYear(date) {
          var thisDate = __addDays(new Date(date.tm_year+1900, 0, 1), date.tm_yday);
  
          var janFourthThisYear = new Date(thisDate.getFullYear(), 0, 4);
          var janFourthNextYear = new Date(thisDate.getFullYear()+1, 0, 4);
  
          var firstWeekStartThisYear = getFirstWeekStartDate(janFourthThisYear);
          var firstWeekStartNextYear = getFirstWeekStartDate(janFourthNextYear);
  
          if (compareByDay(firstWeekStartThisYear, thisDate) <= 0) {
            // this date is after the start of the first week of this year
            if (compareByDay(firstWeekStartNextYear, thisDate) <= 0) {
              return thisDate.getFullYear()+1;
            } else {
              return thisDate.getFullYear();
            }
          } else { 
            return thisDate.getFullYear()-1;
          }
      };
  
      var EXPANSION_RULES_2 = {
        '%a': function(date) {
          return WEEKDAYS[date.tm_wday].substring(0,3);
        },
        '%A': function(date) {
          return WEEKDAYS[date.tm_wday];
        },
        '%b': function(date) {
          return MONTHS[date.tm_mon].substring(0,3);
        },
        '%B': function(date) {
          return MONTHS[date.tm_mon];
        },
        '%C': function(date) {
          var year = date.tm_year+1900;
          return leadingNulls(Math.floor(year/100),2);
        },
        '%d': function(date) {
          return leadingNulls(date.tm_mday, 2);
        },
        '%e': function(date) {
          return leadingSomething(date.tm_mday, 2, ' ');
        },
        '%g': function(date) {
          // %g, %G, and %V give values according to the ISO 8601:2000 standard week-based year. 
          // In this system, weeks begin on a Monday and week 1 of the year is the week that includes 
          // January 4th, which is also the week that includes the first Thursday of the year, and 
          // is also the first week that contains at least four days in the year. 
          // If the first Monday of January is the 2nd, 3rd, or 4th, the preceding days are part of 
          // the last week of the preceding year; thus, for Saturday 2nd January 1999, 
          // %G is replaced by 1998 and %V is replaced by 53. If December 29th, 30th, 
          // or 31st is a Monday, it and any following days are part of week 1 of the following year. 
          // Thus, for Tuesday 30th December 1997, %G is replaced by 1998 and %V is replaced by 01.
          
          return getWeekBasedYear(date).toString().substring(2);
        },
        '%G': function(date) {
          return getWeekBasedYear(date);
        },
        '%H': function(date) {
          return leadingNulls(date.tm_hour, 2);
        },
        '%I': function(date) {
          return leadingNulls(date.tm_hour < 13 ? date.tm_hour : date.tm_hour-12, 2);
        },
        '%j': function(date) {
          // Day of the year (001-366)
          return leadingNulls(date.tm_mday+__arraySum(__isLeapYear(date.tm_year+1900) ? __MONTH_DAYS_LEAP : __MONTH_DAYS_REGULAR, date.tm_mon-1), 3);
        },
        '%m': function(date) {
          return leadingNulls(date.tm_mon+1, 2);
        },
        '%M': function(date) {
          return leadingNulls(date.tm_min, 2);
        },
        '%n': function() {
          return '\n';
        },
        '%p': function(date) {
          if (date.tm_hour > 0 && date.tm_hour < 13) {
            return 'AM';
          } else {
            return 'PM';
          }
        },
        '%S': function(date) {
          return leadingNulls(date.tm_sec, 2);
        },
        '%t': function() {
          return '\t';
        },
        '%u': function(date) {
          var day = new Date(date.tm_year+1900, date.tm_mon+1, date.tm_mday, 0, 0, 0, 0);
          return day.getDay() || 7;
        },
        '%U': function(date) {
          // Replaced by the week number of the year as a decimal number [00,53]. 
          // The first Sunday of January is the first day of week 1; 
          // days in the new year before this are in week 0. [ tm_year, tm_wday, tm_yday]
          var janFirst = new Date(date.tm_year+1900, 0, 1);
          var firstSunday = janFirst.getDay() === 0 ? janFirst : __addDays(janFirst, 7-janFirst.getDay());
          var endDate = new Date(date.tm_year+1900, date.tm_mon, date.tm_mday);
          
          // is target date after the first Sunday?
          if (compareByDay(firstSunday, endDate) < 0) {
            // calculate difference in days between first Sunday and endDate
            var februaryFirstUntilEndMonth = __arraySum(__isLeapYear(endDate.getFullYear()) ? __MONTH_DAYS_LEAP : __MONTH_DAYS_REGULAR, endDate.getMonth()-1)-31;
            var firstSundayUntilEndJanuary = 31-firstSunday.getDate();
            var days = firstSundayUntilEndJanuary+februaryFirstUntilEndMonth+endDate.getDate();
            return leadingNulls(Math.ceil(days/7), 2);
          }
  
          return compareByDay(firstSunday, janFirst) === 0 ? '01': '00';
        },
        '%V': function(date) {
          // Replaced by the week number of the year (Monday as the first day of the week) 
          // as a decimal number [01,53]. If the week containing 1 January has four 
          // or more days in the new year, then it is considered week 1. 
          // Otherwise, it is the last week of the previous year, and the next week is week 1. 
          // Both January 4th and the first Thursday of January are always in week 1. [ tm_year, tm_wday, tm_yday]
          var janFourthThisYear = new Date(date.tm_year+1900, 0, 4);
          var janFourthNextYear = new Date(date.tm_year+1901, 0, 4);
  
          var firstWeekStartThisYear = getFirstWeekStartDate(janFourthThisYear);
          var firstWeekStartNextYear = getFirstWeekStartDate(janFourthNextYear);
  
          var endDate = __addDays(new Date(date.tm_year+1900, 0, 1), date.tm_yday);
  
          if (compareByDay(endDate, firstWeekStartThisYear) < 0) {
            // if given date is before this years first week, then it belongs to the 53rd week of last year
            return '53';
          } 
  
          if (compareByDay(firstWeekStartNextYear, endDate) <= 0) {
            // if given date is after next years first week, then it belongs to the 01th week of next year
            return '01';
          }
  
          // given date is in between CW 01..53 of this calendar year
          var daysDifference;
          if (firstWeekStartThisYear.getFullYear() < date.tm_year+1900) {
            // first CW of this year starts last year
            daysDifference = date.tm_yday+32-firstWeekStartThisYear.getDate()
          } else {
            // first CW of this year starts this year
            daysDifference = date.tm_yday+1-firstWeekStartThisYear.getDate();
          }
          return leadingNulls(Math.ceil(daysDifference/7), 2);
        },
        '%w': function(date) {
          var day = new Date(date.tm_year+1900, date.tm_mon+1, date.tm_mday, 0, 0, 0, 0);
          return day.getDay();
        },
        '%W': function(date) {
          // Replaced by the week number of the year as a decimal number [00,53]. 
          // The first Monday of January is the first day of week 1; 
          // days in the new year before this are in week 0. [ tm_year, tm_wday, tm_yday]
          var janFirst = new Date(date.tm_year, 0, 1);
          var firstMonday = janFirst.getDay() === 1 ? janFirst : __addDays(janFirst, janFirst.getDay() === 0 ? 1 : 7-janFirst.getDay()+1);
          var endDate = new Date(date.tm_year+1900, date.tm_mon, date.tm_mday);
  
          // is target date after the first Monday?
          if (compareByDay(firstMonday, endDate) < 0) {
            var februaryFirstUntilEndMonth = __arraySum(__isLeapYear(endDate.getFullYear()) ? __MONTH_DAYS_LEAP : __MONTH_DAYS_REGULAR, endDate.getMonth()-1)-31;
            var firstMondayUntilEndJanuary = 31-firstMonday.getDate();
            var days = firstMondayUntilEndJanuary+februaryFirstUntilEndMonth+endDate.getDate();
            return leadingNulls(Math.ceil(days/7), 2);
          }
          return compareByDay(firstMonday, janFirst) === 0 ? '01': '00';
        },
        '%y': function(date) {
          // Replaced by the last two digits of the year as a decimal number [00,99]. [ tm_year]
          return (date.tm_year+1900).toString().substring(2);
        },
        '%Y': function(date) {
          // Replaced by the year as a decimal number (for example, 1997). [ tm_year]
          return date.tm_year+1900;
        },
        '%z': function(date) {
          // Replaced by the offset from UTC in the ISO 8601:2000 standard format ( +hhmm or -hhmm ),
          // or by no characters if no timezone is determinable. 
          // For example, "-0430" means 4 hours 30 minutes behind UTC (west of Greenwich). 
          // If tm_isdst is zero, the standard time offset is used. 
          // If tm_isdst is greater than zero, the daylight savings time offset is used. 
          // If tm_isdst is negative, no characters are returned. 
          // FIXME: we cannot determine time zone (or can we?)
          return '';
        },
        '%Z': function(date) {
          // Replaced by the timezone name or abbreviation, or by no bytes if no timezone information exists. [ tm_isdst]
          // FIXME: we cannot determine time zone (or can we?)
          return '';
        },
        '%%': function() {
          return '%';
        }
      };
      for (var rule in EXPANSION_RULES_2) {
        if (pattern.indexOf(rule) >= 0) {
          pattern = pattern.replace(new RegExp(rule, 'g'), EXPANSION_RULES_2[rule](date));
        }
      }
  
      var bytes = intArrayFromString(pattern, false);
      if (bytes.length > maxsize) {
        return 0;
      } 
  
      writeArrayToMemory(bytes, s);
      return bytes.length-1;
    }function _strftime_l(s, maxsize, format, tm) {
      return _strftime(s, maxsize, format, tm); // no locale support yet
    }

  
  
  function __exit(status) {
      // void _exit(int status);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/exit.html
      Module['exit'](status);
    }function _exit(status) {
      __exit(status);
    }function __ZSt9terminatev() {
      _exit(-1234);
    }

  function _gettimeofday(ptr) {
      var now = Date.now();
      HEAP32[((ptr)>>2)]=Math.floor(now/1000); // seconds
      HEAP32[(((ptr)+(4))>>2)]=Math.floor((now-1000*Math.floor(now/1000))*1000); // microseconds
      return 0;
    }

  function _pthread_mutex_unlock() {}

  
  function _isxdigit(chr) {
      return (chr >= 48 && chr <= 57) ||
             (chr >= 97 && chr <= 102) ||
             (chr >= 65 && chr <= 70);
    }function _isxdigit_l(chr) {
      return _isxdigit(chr); // no locale support yet
    }

  
  function _emscripten_memcpy_big(dest, src, num) {
      HEAPU8.set(HEAPU8.subarray(src, src+num), dest);
      return dest;
    } 
  Module["_memcpy"] = _memcpy;

  function _sbrk(bytes) {
      // Implement a Linux-like 'memory area' for our 'process'.
      // Changes the size of the memory area by |bytes|; returns the
      // address of the previous top ('break') of the memory area
      // We control the "dynamic" memory - DYNAMIC_BASE to DYNAMICTOP
      var self = _sbrk;
      if (!self.called) {
        DYNAMICTOP = alignMemoryPage(DYNAMICTOP); // make sure we start out aligned
        self.called = true;
        assert(Runtime.dynamicAlloc);
        self.alloc = Runtime.dynamicAlloc;
        Runtime.dynamicAlloc = function() { abort('cannot dynamically allocate, sbrk now has control') };
      }
      var ret = DYNAMICTOP;
      if (bytes != 0) self.alloc(bytes);
      return ret;  // Previous break location.
    }

   
  Module["_memmove"] = _memmove;

  function _newlocale(mask, locale, base) {
      return _malloc(4);
    }

  var _emscripten_preinvoke=true;

  var _BItoD=true;


  function _pthread_cond_wait() {
      return 0;
    }

  
  
  
  function _free() {
  }
  Module["_free"] = _free;function ___cxa_free_exception(ptr) {
      try {
        return _free(ptr - ___cxa_exception_header_size);
      } catch(e) { // XXX FIXME
      }
    }
  
  var ___cxa_caught_exceptions=[];function ___cxa_end_catch() {
      if (___cxa_end_catch.rethrown) {
        ___cxa_end_catch.rethrown = false;
        return;
      }
      // Clear state flag.
      asm['setThrew'](0);
      // Call destructor if one is registered then clear it.
      var ptr = ___cxa_caught_exceptions.pop();
      if (ptr) {
        header = ptr - ___cxa_exception_header_size;
        var destructor = HEAP32[(((header)+(4))>>2)];
        if (destructor) {
          Runtime.dynCall('vi', destructor, [ptr]);
          HEAP32[(((header)+(4))>>2)]=0;
        }
        ___cxa_free_exception(ptr);
        ___cxa_last_thrown_exception = 0;
      }
    }function ___cxa_rethrow() {
      ___cxa_end_catch.rethrown = true;
      var ptr = ___cxa_caught_exceptions.pop();
      throw ptr + " - Exception catching is disabled, this exception cannot be caught. Compile with -s DISABLE_EXCEPTION_CATCHING=0 or DISABLE_EXCEPTION_CATCHING=2 to catch.";
    }

  function _fmod(x, y) {
      return x % y;
    }

  function ___cxa_guard_release() {}

  function _ungetc(c, stream) {
      // int ungetc(int c, FILE *stream);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/ungetc.html
      stream = FS.getStreamFromPtr(stream);
      if (!stream) {
        return -1;
      }
      if (c === -1) {
        // do nothing for EOF character
        return c;
      }
      c = unSign(c & 0xFF);
      stream.ungotten.push(c);
      stream.eof = false;
      return c;
    }

  
  function _truncate(path, length) {
      // int truncate(const char *path, off_t length);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/truncate.html
      // NOTE: The path argument may be a string, to simplify ftruncate().
      if (typeof path !== 'string') path = Pointer_stringify(path);
      try {
        FS.truncate(path, length);
        return 0;
      } catch (e) {
        FS.handleFSError(e);
        return -1;
      }
    }function _ftruncate(fildes, length) {
      // int ftruncate(int fildes, off_t length);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/ftruncate.html
      try {
        FS.ftruncate(fildes, length);
        return 0;
      } catch (e) {
        FS.handleFSError(e);
        return -1;
      }
    }

  function _uselocale(locale) {
      return 0;
    }

  function _vsnprintf(s, n, format, va_arg) {
      return _snprintf(s, n, format, HEAP32[((va_arg)>>2)]);
    }

  
  
  
  function __getFloat(text) {
      return /^[+-]?[0-9]*\.?[0-9]+([eE][+-]?[0-9]+)?/.exec(text);
    }function __scanString(format, get, unget, varargs) {
      if (!__scanString.whiteSpace) {
        __scanString.whiteSpace = {};
        __scanString.whiteSpace[32] = 1;
        __scanString.whiteSpace[9] = 1;
        __scanString.whiteSpace[10] = 1;
        __scanString.whiteSpace[11] = 1;
        __scanString.whiteSpace[12] = 1;
        __scanString.whiteSpace[13] = 1;
      }
      // Supports %x, %4x, %d.%d, %lld, %s, %f, %lf.
      // TODO: Support all format specifiers.
      format = Pointer_stringify(format);
      var soFar = 0;
      if (format.indexOf('%n') >= 0) {
        // need to track soFar
        var _get = get;
        get = function get() {
          soFar++;
          return _get();
        }
        var _unget = unget;
        unget = function unget() {
          soFar--;
          return _unget();
        }
      }
      var formatIndex = 0;
      var argsi = 0;
      var fields = 0;
      var argIndex = 0;
      var next;
  
      mainLoop:
      for (var formatIndex = 0; formatIndex < format.length;) {
        if (format[formatIndex] === '%' && format[formatIndex+1] == 'n') {
          var argPtr = HEAP32[(((varargs)+(argIndex))>>2)];
          argIndex += Runtime.getAlignSize('void*', null, true);
          HEAP32[((argPtr)>>2)]=soFar;
          formatIndex += 2;
          continue;
        }
  
        if (format[formatIndex] === '%') {
          var nextC = format.indexOf('c', formatIndex+1);
          if (nextC > 0) {
            var maxx = 1;
            if (nextC > formatIndex+1) {
              var sub = format.substring(formatIndex+1, nextC);
              maxx = parseInt(sub);
              if (maxx != sub) maxx = 0;
            }
            if (maxx) {
              var argPtr = HEAP32[(((varargs)+(argIndex))>>2)];
              argIndex += Runtime.getAlignSize('void*', null, true);
              fields++;
              for (var i = 0; i < maxx; i++) {
                next = get();
                HEAP8[((argPtr++)|0)]=next;
                if (next === 0) return i > 0 ? fields : fields-1; // we failed to read the full length of this field
              }
              formatIndex += nextC - formatIndex + 1;
              continue;
            }
          }
        }
  
        // handle %[...]
        if (format[formatIndex] === '%' && format.indexOf('[', formatIndex+1) > 0) {
          var match = /\%([0-9]*)\[(\^)?(\]?[^\]]*)\]/.exec(format.substring(formatIndex));
          if (match) {
            var maxNumCharacters = parseInt(match[1]) || Infinity;
            var negateScanList = (match[2] === '^');
            var scanList = match[3];
  
            // expand "middle" dashs into character sets
            var middleDashMatch;
            while ((middleDashMatch = /([^\-])\-([^\-])/.exec(scanList))) {
              var rangeStartCharCode = middleDashMatch[1].charCodeAt(0);
              var rangeEndCharCode = middleDashMatch[2].charCodeAt(0);
              for (var expanded = ''; rangeStartCharCode <= rangeEndCharCode; expanded += String.fromCharCode(rangeStartCharCode++));
              scanList = scanList.replace(middleDashMatch[1] + '-' + middleDashMatch[2], expanded);
            }
  
            var argPtr = HEAP32[(((varargs)+(argIndex))>>2)];
            argIndex += Runtime.getAlignSize('void*', null, true);
            fields++;
  
            for (var i = 0; i < maxNumCharacters; i++) {
              next = get();
              if (negateScanList) {
                if (scanList.indexOf(String.fromCharCode(next)) < 0) {
                  HEAP8[((argPtr++)|0)]=next;
                } else {
                  unget();
                  break;
                }
              } else {
                if (scanList.indexOf(String.fromCharCode(next)) >= 0) {
                  HEAP8[((argPtr++)|0)]=next;
                } else {
                  unget();
                  break;
                }
              }
            }
  
            // write out null-terminating character
            HEAP8[((argPtr++)|0)]=0;
            formatIndex += match[0].length;
            
            continue;
          }
        }      
        // remove whitespace
        while (1) {
          next = get();
          if (next == 0) return fields;
          if (!(next in __scanString.whiteSpace)) break;
        }
        unget();
  
        if (format[formatIndex] === '%') {
          formatIndex++;
          var suppressAssignment = false;
          if (format[formatIndex] == '*') {
            suppressAssignment = true;
            formatIndex++;
          }
          var maxSpecifierStart = formatIndex;
          while (format[formatIndex].charCodeAt(0) >= 48 &&
                 format[formatIndex].charCodeAt(0) <= 57) {
            formatIndex++;
          }
          var max_;
          if (formatIndex != maxSpecifierStart) {
            max_ = parseInt(format.slice(maxSpecifierStart, formatIndex), 10);
          }
          var long_ = false;
          var half = false;
          var longLong = false;
          if (format[formatIndex] == 'l') {
            long_ = true;
            formatIndex++;
            if (format[formatIndex] == 'l') {
              longLong = true;
              formatIndex++;
            }
          } else if (format[formatIndex] == 'h') {
            half = true;
            formatIndex++;
          }
          var type = format[formatIndex];
          formatIndex++;
          var curr = 0;
          var buffer = [];
          // Read characters according to the format. floats are trickier, they may be in an unfloat state in the middle, then be a valid float later
          if (type == 'f' || type == 'e' || type == 'g' ||
              type == 'F' || type == 'E' || type == 'G') {
            next = get();
            while (next > 0 && (!(next in __scanString.whiteSpace)))  {
              buffer.push(String.fromCharCode(next));
              next = get();
            }
            var m = __getFloat(buffer.join(''));
            var last = m ? m[0].length : 0;
            for (var i = 0; i < buffer.length - last + 1; i++) {
              unget();
            }
            buffer.length = last;
          } else {
            next = get();
            var first = true;
            
            // Strip the optional 0x prefix for %x.
            if ((type == 'x' || type == 'X') && (next == 48)) {
              var peek = get();
              if (peek == 120 || peek == 88) {
                next = get();
              } else {
                unget();
              }
            }
            
            while ((curr < max_ || isNaN(max_)) && next > 0) {
              if (!(next in __scanString.whiteSpace) && // stop on whitespace
                  (type == 's' ||
                   ((type === 'd' || type == 'u' || type == 'i') && ((next >= 48 && next <= 57) ||
                                                                     (first && next == 45))) ||
                   ((type === 'x' || type === 'X') && (next >= 48 && next <= 57 ||
                                     next >= 97 && next <= 102 ||
                                     next >= 65 && next <= 70))) &&
                  (formatIndex >= format.length || next !== format[formatIndex].charCodeAt(0))) { // Stop when we read something that is coming up
                buffer.push(String.fromCharCode(next));
                next = get();
                curr++;
                first = false;
              } else {
                break;
              }
            }
            unget();
          }
          if (buffer.length === 0) return 0;  // Failure.
          if (suppressAssignment) continue;
  
          var text = buffer.join('');
          var argPtr = HEAP32[(((varargs)+(argIndex))>>2)];
          argIndex += Runtime.getAlignSize('void*', null, true);
          switch (type) {
            case 'd': case 'u': case 'i':
              if (half) {
                HEAP16[((argPtr)>>1)]=parseInt(text, 10);
              } else if (longLong) {
                (tempI64 = [parseInt(text, 10)>>>0,(tempDouble=parseInt(text, 10),(+(Math_abs(tempDouble))) >= (+1) ? (tempDouble > (+0) ? ((Math_min((+(Math_floor((tempDouble)/(+4294967296)))), (+4294967295)))|0)>>>0 : (~~((+(Math_ceil((tempDouble - +(((~~(tempDouble)))>>>0))/(+4294967296))))))>>>0) : 0)],HEAP32[((argPtr)>>2)]=tempI64[0],HEAP32[(((argPtr)+(4))>>2)]=tempI64[1]);
              } else {
                HEAP32[((argPtr)>>2)]=parseInt(text, 10);
              }
              break;
            case 'X':
            case 'x':
              HEAP32[((argPtr)>>2)]=parseInt(text, 16);
              break;
            case 'F':
            case 'f':
            case 'E':
            case 'e':
            case 'G':
            case 'g':
            case 'E':
              // fallthrough intended
              if (long_) {
                HEAPF64[((argPtr)>>3)]=parseFloat(text);
              } else {
                HEAPF32[((argPtr)>>2)]=parseFloat(text);
              }
              break;
            case 's':
              var array = intArrayFromString(text);
              for (var j = 0; j < array.length; j++) {
                HEAP8[(((argPtr)+(j))|0)]=array[j];
              }
              break;
          }
          fields++;
        } else if (format[formatIndex].charCodeAt(0) in __scanString.whiteSpace) {
          next = get();
          while (next in __scanString.whiteSpace) {
            if (next <= 0) break mainLoop;  // End of input.
            next = get();
          }
          unget(next);
          formatIndex++;
        } else {
          // Not a specifier.
          next = get();
          if (format[formatIndex].charCodeAt(0) !== next) {
            unget(next);
            break mainLoop;
          }
          formatIndex++;
        }
      }
      return fields;
    }function _sscanf(s, format, varargs) {
      // int sscanf(const char *restrict s, const char *restrict format, ... );
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/scanf.html
      var index = 0;
      function get() { return HEAP8[(((s)+(index++))|0)]; };
      function unget() { index--; };
      return __scanString(format, get, unget, varargs);
    }function _vsscanf(s, format, va_arg) {
      return _sscanf(s, format, HEAP32[((va_arg)>>2)]);
    }


  function _sysconf(name) {
      // long sysconf(int name);
      // http://pubs.opengroup.org/onlinepubs/009695399/functions/sysconf.html
      switch(name) {
        case 30: return PAGE_SIZE;
        case 132:
        case 133:
        case 12:
        case 137:
        case 138:
        case 15:
        case 235:
        case 16:
        case 17:
        case 18:
        case 19:
        case 20:
        case 149:
        case 13:
        case 10:
        case 236:
        case 153:
        case 9:
        case 21:
        case 22:
        case 159:
        case 154:
        case 14:
        case 77:
        case 78:
        case 139:
        case 80:
        case 81:
        case 79:
        case 82:
        case 68:
        case 67:
        case 164:
        case 11:
        case 29:
        case 47:
        case 48:
        case 95:
        case 52:
        case 51:
        case 46:
          return 200809;
        case 27:
        case 246:
        case 127:
        case 128:
        case 23:
        case 24:
        case 160:
        case 161:
        case 181:
        case 182:
        case 242:
        case 183:
        case 184:
        case 243:
        case 244:
        case 245:
        case 165:
        case 178:
        case 179:
        case 49:
        case 50:
        case 168:
        case 169:
        case 175:
        case 170:
        case 171:
        case 172:
        case 97:
        case 76:
        case 32:
        case 173:
        case 35:
          return -1;
        case 176:
        case 177:
        case 7:
        case 155:
        case 8:
        case 157:
        case 125:
        case 126:
        case 92:
        case 93:
        case 129:
        case 130:
        case 131:
        case 94:
        case 91:
          return 1;
        case 74:
        case 60:
        case 69:
        case 70:
        case 4:
          return 1024;
        case 31:
        case 42:
        case 72:
          return 32;
        case 87:
        case 26:
        case 33:
          return 2147483647;
        case 34:
        case 1:
          return 47839;
        case 38:
        case 36:
          return 99;
        case 43:
        case 37:
          return 2048;
        case 0: return 2097152;
        case 3: return 65536;
        case 28: return 32768;
        case 44: return 32767;
        case 75: return 16384;
        case 39: return 1000;
        case 89: return 700;
        case 71: return 256;
        case 40: return 255;
        case 2: return 100;
        case 180: return 64;
        case 25: return 20;
        case 5: return 16;
        case 6: return 6;
        case 73: return 4;
        case 84: return 1;
      }
      ___setErrNo(ERRNO_CODES.EINVAL);
      return -1;
    }


  function ___errno_location() {
      return ___errno_state;
    }

   
  Module["_memset"] = _memset;

   
  Module["_strcat"] = _strcat;

  
  function _strerror_r(errnum, strerrbuf, buflen) {
      if (errnum in ERRNO_MESSAGES) {
        if (ERRNO_MESSAGES[errnum].length > buflen - 1) {
          return ___setErrNo(ERRNO_CODES.ERANGE);
        } else {
          var msg = ERRNO_MESSAGES[errnum];
          writeAsciiToMemory(msg, strerrbuf);
          return 0;
        }
      } else {
        return ___setErrNo(ERRNO_CODES.EINVAL);
      }
    }function _strerror(errnum) {
      if (!_strerror.buffer) _strerror.buffer = _malloc(256);
      _strerror_r(errnum, _strerror.buffer, 256);
      return _strerror.buffer;
    }

   
  Module["_bitshift64Shl"] = _bitshift64Shl;

  function _abort() {
      Module['abort']();
    }

  function ___assert_fail(condition, filename, line, func) {
      ABORT = true;
      throw 'Assertion failed: ' + Pointer_stringify(condition) + ', at: ' + [filename ? Pointer_stringify(filename) : 'unknown filename', line, func ? Pointer_stringify(func) : 'unknown function'] + ' at ' + stackTrace();
    }

  function _isdigit(chr) {
      return chr >= 48 && chr <= 57;
    }


  function _feof(stream) {
      // int feof(FILE *stream);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/feof.html
      stream = FS.getStreamFromPtr(stream);
      return Number(stream && stream.eof);
    }

  function _catclose(catd) {
      // int catclose (nl_catd catd)
      return 0;
    }

  function _isdigit_l(chr) {
      return _isdigit(chr); // no locale support yet
    }

  var _fabs=Math_abs;



  function _fseek(stream, offset, whence) {
      // int fseek(FILE *stream, long offset, int whence);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/fseek.html
      var fd = _fileno(stream);
      var ret = _lseek(fd, offset, whence);
      if (ret == -1) {
        return -1;
      }
      stream = FS.getStreamFromPtr(stream);
      stream.eof = false;
      return 0;
    }

  
  function _copysign(a, b) {
      return __reallyNegative(a) === __reallyNegative(b) ? a : -a;
    }var _copysignl=_copysign;

  var _sqrtf=Math_sqrt;


  function _ftell(stream) {
      // long ftell(FILE *stream);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/ftell.html
      stream = FS.getStreamFromPtr(stream);
      if (!stream) {
        ___setErrNo(ERRNO_CODES.EBADF);
        return -1;
      }
      if (FS.isChrdev(stream.node.mode)) {
        ___setErrNo(ERRNO_CODES.ESPIPE);
        return -1;
      } else {
        return stream.position;
      }
    }

  var Browser={mainLoop:{scheduler:null,method:"",shouldPause:false,paused:false,queue:[],pause:function () {
          Browser.mainLoop.shouldPause = true;
        },resume:function () {
          if (Browser.mainLoop.paused) {
            Browser.mainLoop.paused = false;
            Browser.mainLoop.scheduler();
          }
          Browser.mainLoop.shouldPause = false;
        },updateStatus:function () {
          if (Module['setStatus']) {
            var message = Module['statusMessage'] || 'Please wait...';
            var remaining = Browser.mainLoop.remainingBlockers;
            var expected = Browser.mainLoop.expectedBlockers;
            if (remaining) {
              if (remaining < expected) {
                Module['setStatus'](message + ' (' + (expected - remaining) + '/' + expected + ')');
              } else {
                Module['setStatus'](message);
              }
            } else {
              Module['setStatus']('');
            }
          }
        }},isFullScreen:false,pointerLock:false,moduleContextCreatedCallbacks:[],workers:[],init:function () {
        if (!Module["preloadPlugins"]) Module["preloadPlugins"] = []; // needs to exist even in workers
  
        if (Browser.initted || ENVIRONMENT_IS_WORKER) return;
        Browser.initted = true;
  
        try {
          new Blob();
          Browser.hasBlobConstructor = true;
        } catch(e) {
          Browser.hasBlobConstructor = false;
          console.log("warning: no blob constructor, cannot create blobs with mimetypes");
        }
        Browser.BlobBuilder = typeof MozBlobBuilder != "undefined" ? MozBlobBuilder : (typeof WebKitBlobBuilder != "undefined" ? WebKitBlobBuilder : (!Browser.hasBlobConstructor ? console.log("warning: no BlobBuilder") : null));
        Browser.URLObject = typeof window != "undefined" ? (window.URL ? window.URL : window.webkitURL) : undefined;
        if (!Module.noImageDecoding && typeof Browser.URLObject === 'undefined') {
          console.log("warning: Browser does not support creating object URLs. Built-in browser image decoding will not be available.");
          Module.noImageDecoding = true;
        }
  
        // Support for plugins that can process preloaded files. You can add more of these to
        // your app by creating and appending to Module.preloadPlugins.
        //
        // Each plugin is asked if it can handle a file based on the file's name. If it can,
        // it is given the file's raw data. When it is done, it calls a callback with the file's
        // (possibly modified) data. For example, a plugin might decompress a file, or it
        // might create some side data structure for use later (like an Image element, etc.).
  
        var imagePlugin = {};
        imagePlugin['canHandle'] = function imagePlugin_canHandle(name) {
          return !Module.noImageDecoding && /\.(jpg|jpeg|png|bmp)$/i.test(name);
        };
        imagePlugin['handle'] = function imagePlugin_handle(byteArray, name, onload, onerror) {
          var b = null;
          if (Browser.hasBlobConstructor) {
            try {
              b = new Blob([byteArray], { type: Browser.getMimetype(name) });
              if (b.size !== byteArray.length) { // Safari bug #118630
                // Safari's Blob can only take an ArrayBuffer
                b = new Blob([(new Uint8Array(byteArray)).buffer], { type: Browser.getMimetype(name) });
              }
            } catch(e) {
              Runtime.warnOnce('Blob constructor present but fails: ' + e + '; falling back to blob builder');
            }
          }
          if (!b) {
            var bb = new Browser.BlobBuilder();
            bb.append((new Uint8Array(byteArray)).buffer); // we need to pass a buffer, and must copy the array to get the right data range
            b = bb.getBlob();
          }
          var url = Browser.URLObject.createObjectURL(b);
          var img = new Image();
          img.onload = function img_onload() {
            assert(img.complete, 'Image ' + name + ' could not be decoded');
            var canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            Module["preloadedImages"][name] = canvas;
            Browser.URLObject.revokeObjectURL(url);
            if (onload) onload(byteArray);
          };
          img.onerror = function img_onerror(event) {
            console.log('Image ' + url + ' could not be decoded');
            if (onerror) onerror();
          };
          img.src = url;
        };
        Module['preloadPlugins'].push(imagePlugin);
  
        var audioPlugin = {};
        audioPlugin['canHandle'] = function audioPlugin_canHandle(name) {
          return !Module.noAudioDecoding && name.substr(-4) in { '.ogg': 1, '.wav': 1, '.mp3': 1 };
        };
        audioPlugin['handle'] = function audioPlugin_handle(byteArray, name, onload, onerror) {
          var done = false;
          function finish(audio) {
            if (done) return;
            done = true;
            Module["preloadedAudios"][name] = audio;
            if (onload) onload(byteArray);
          }
          function fail() {
            if (done) return;
            done = true;
            Module["preloadedAudios"][name] = new Audio(); // empty shim
            if (onerror) onerror();
          }
          if (Browser.hasBlobConstructor) {
            try {
              var b = new Blob([byteArray], { type: Browser.getMimetype(name) });
            } catch(e) {
              return fail();
            }
            var url = Browser.URLObject.createObjectURL(b); // XXX we never revoke this!
            var audio = new Audio();
            audio.addEventListener('canplaythrough', function() { finish(audio) }, false); // use addEventListener due to chromium bug 124926
            audio.onerror = function audio_onerror(event) {
              if (done) return;
              console.log('warning: browser could not fully decode audio ' + name + ', trying slower base64 approach');
              function encode64(data) {
                var BASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
                var PAD = '=';
                var ret = '';
                var leftchar = 0;
                var leftbits = 0;
                for (var i = 0; i < data.length; i++) {
                  leftchar = (leftchar << 8) | data[i];
                  leftbits += 8;
                  while (leftbits >= 6) {
                    var curr = (leftchar >> (leftbits-6)) & 0x3f;
                    leftbits -= 6;
                    ret += BASE[curr];
                  }
                }
                if (leftbits == 2) {
                  ret += BASE[(leftchar&3) << 4];
                  ret += PAD + PAD;
                } else if (leftbits == 4) {
                  ret += BASE[(leftchar&0xf) << 2];
                  ret += PAD;
                }
                return ret;
              }
              audio.src = 'data:audio/x-' + name.substr(-3) + ';base64,' + encode64(byteArray);
              finish(audio); // we don't wait for confirmation this worked - but it's worth trying
            };
            audio.src = url;
            // workaround for chrome bug 124926 - we do not always get oncanplaythrough or onerror
            Browser.safeSetTimeout(function() {
              finish(audio); // try to use it even though it is not necessarily ready to play
            }, 10000);
          } else {
            return fail();
          }
        };
        Module['preloadPlugins'].push(audioPlugin);
  
        // Canvas event setup
  
        var canvas = Module['canvas'];
        
        // forced aspect ratio can be enabled by defining 'forcedAspectRatio' on Module
        // Module['forcedAspectRatio'] = 4 / 3;
        
        canvas.requestPointerLock = canvas['requestPointerLock'] ||
                                    canvas['mozRequestPointerLock'] ||
                                    canvas['webkitRequestPointerLock'] ||
                                    canvas['msRequestPointerLock'] ||
                                    function(){};
        canvas.exitPointerLock = document['exitPointerLock'] ||
                                 document['mozExitPointerLock'] ||
                                 document['webkitExitPointerLock'] ||
                                 document['msExitPointerLock'] ||
                                 function(){}; // no-op if function does not exist
        canvas.exitPointerLock = canvas.exitPointerLock.bind(document);
  
        function pointerLockChange() {
          Browser.pointerLock = document['pointerLockElement'] === canvas ||
                                document['mozPointerLockElement'] === canvas ||
                                document['webkitPointerLockElement'] === canvas ||
                                document['msPointerLockElement'] === canvas;
        }
  
        document.addEventListener('pointerlockchange', pointerLockChange, false);
        document.addEventListener('mozpointerlockchange', pointerLockChange, false);
        document.addEventListener('webkitpointerlockchange', pointerLockChange, false);
        document.addEventListener('mspointerlockchange', pointerLockChange, false);
  
        if (Module['elementPointerLock']) {
          canvas.addEventListener("click", function(ev) {
            if (!Browser.pointerLock && canvas.requestPointerLock) {
              canvas.requestPointerLock();
              ev.preventDefault();
            }
          }, false);
        }
      },createContext:function (canvas, useWebGL, setInModule, webGLContextAttributes) {
        var ctx;
        var errorInfo = '?';
        function onContextCreationError(event) {
          errorInfo = event.statusMessage || errorInfo;
        }
        try {
          if (useWebGL) {
            var contextAttributes = {
              antialias: false,
              alpha: false
            };
  
            if (webGLContextAttributes) {
              for (var attribute in webGLContextAttributes) {
                contextAttributes[attribute] = webGLContextAttributes[attribute];
              }
            }
  
  
            canvas.addEventListener('webglcontextcreationerror', onContextCreationError, false);
            try {
              ['experimental-webgl', 'webgl'].some(function(webglId) {
                return ctx = canvas.getContext(webglId, contextAttributes);
              });
            } finally {
              canvas.removeEventListener('webglcontextcreationerror', onContextCreationError, false);
            }
          } else {
            ctx = canvas.getContext('2d');
          }
          if (!ctx) throw ':(';
        } catch (e) {
          Module.print('Could not create canvas: ' + [errorInfo, e]);
          return null;
        }
        if (useWebGL) {
          // Set the background of the WebGL canvas to black
          canvas.style.backgroundColor = "black";
  
          // Warn on context loss
          canvas.addEventListener('webglcontextlost', function(event) {
            alert('WebGL context lost. You will need to reload the page.');
          }, false);
        }
        if (setInModule) {
          GLctx = Module.ctx = ctx;
          Module.useWebGL = useWebGL;
          Browser.moduleContextCreatedCallbacks.forEach(function(callback) { callback() });
          Browser.init();
        }
        return ctx;
      },destroyContext:function (canvas, useWebGL, setInModule) {},fullScreenHandlersInstalled:false,lockPointer:undefined,resizeCanvas:undefined,requestFullScreen:function (lockPointer, resizeCanvas) {
        Browser.lockPointer = lockPointer;
        Browser.resizeCanvas = resizeCanvas;
        if (typeof Browser.lockPointer === 'undefined') Browser.lockPointer = true;
        if (typeof Browser.resizeCanvas === 'undefined') Browser.resizeCanvas = false;
  
        var canvas = Module['canvas'];
        function fullScreenChange() {
          Browser.isFullScreen = false;
          var canvasContainer = canvas.parentNode;
          if ((document['webkitFullScreenElement'] || document['webkitFullscreenElement'] ||
               document['mozFullScreenElement'] || document['mozFullscreenElement'] ||
               document['fullScreenElement'] || document['fullscreenElement'] ||
               document['msFullScreenElement'] || document['msFullscreenElement'] ||
               document['webkitCurrentFullScreenElement']) === canvasContainer) {
            canvas.cancelFullScreen = document['cancelFullScreen'] ||
                                      document['mozCancelFullScreen'] ||
                                      document['webkitCancelFullScreen'] ||
                                      document['msExitFullscreen'] ||
                                      document['exitFullscreen'] ||
                                      function() {};
            canvas.cancelFullScreen = canvas.cancelFullScreen.bind(document);
            if (Browser.lockPointer) canvas.requestPointerLock();
            Browser.isFullScreen = true;
            if (Browser.resizeCanvas) Browser.setFullScreenCanvasSize();
          } else {
            
            // remove the full screen specific parent of the canvas again to restore the HTML structure from before going full screen
            canvasContainer.parentNode.insertBefore(canvas, canvasContainer);
            canvasContainer.parentNode.removeChild(canvasContainer);
            
            if (Browser.resizeCanvas) Browser.setWindowedCanvasSize();
          }
          if (Module['onFullScreen']) Module['onFullScreen'](Browser.isFullScreen);
          Browser.updateCanvasDimensions(canvas);
        }
  
        if (!Browser.fullScreenHandlersInstalled) {
          Browser.fullScreenHandlersInstalled = true;
          document.addEventListener('fullscreenchange', fullScreenChange, false);
          document.addEventListener('mozfullscreenchange', fullScreenChange, false);
          document.addEventListener('webkitfullscreenchange', fullScreenChange, false);
          document.addEventListener('MSFullscreenChange', fullScreenChange, false);
        }
  
        // create a new parent to ensure the canvas has no siblings. this allows browsers to optimize full screen performance when its parent is the full screen root
        var canvasContainer = document.createElement("div");
        canvas.parentNode.insertBefore(canvasContainer, canvas);
        canvasContainer.appendChild(canvas);
        
        // use parent of canvas as full screen root to allow aspect ratio correction (Firefox stretches the root to screen size)
        canvasContainer.requestFullScreen = canvasContainer['requestFullScreen'] ||
                                            canvasContainer['mozRequestFullScreen'] ||
                                            canvasContainer['msRequestFullscreen'] ||
                                           (canvasContainer['webkitRequestFullScreen'] ? function() { canvasContainer['webkitRequestFullScreen'](Element['ALLOW_KEYBOARD_INPUT']) } : null);
        canvasContainer.requestFullScreen();
      },requestAnimationFrame:function requestAnimationFrame(func) {
        if (typeof window === 'undefined') { // Provide fallback to setTimeout if window is undefined (e.g. in Node.js)
          setTimeout(func, 1000/60);
        } else {
          if (!window.requestAnimationFrame) {
            window.requestAnimationFrame = window['requestAnimationFrame'] ||
                                           window['webkitRequestAnimationFrame'] ||
                                           window['msRequestAnimationFrame'] ||
                                           window['oRequestAnimationFrame'] ||
                                           window['setTimeout'];
          }
          window.requestAnimationFrame(func);
        }
      },safeCallback:function (func) {
        return function() {
          if (!ABORT) return func.apply(null, arguments);
        };
      },safeRequestAnimationFrame:function (func) {
        return Browser.requestAnimationFrame(function() {
          if (!ABORT) func();
        });
      },safeSetTimeout:function (func, timeout) {
        return setTimeout(function() {
          if (!ABORT) func();
        }, timeout);
      },safeSetInterval:function (func, timeout) {
        return setInterval(function() {
          if (!ABORT) func();
        }, timeout);
      },getMimetype:function (name) {
        return {
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'png': 'image/png',
          'bmp': 'image/bmp',
          'ogg': 'audio/ogg',
          'wav': 'audio/wav',
          'mp3': 'audio/mpeg'
        }[name.substr(name.lastIndexOf('.')+1)];
      },getUserMedia:function (func) {
        if(!window.getUserMedia) {
          window.getUserMedia = navigator['getUserMedia'] ||
                                navigator['mozGetUserMedia'];
        }
        window.getUserMedia(func);
      },getMovementX:function (event) {
        return event['movementX'] ||
               event['mozMovementX'] ||
               event['webkitMovementX'] ||
               0;
      },getMovementY:function (event) {
        return event['movementY'] ||
               event['mozMovementY'] ||
               event['webkitMovementY'] ||
               0;
      },getMouseWheelDelta:function (event) {
        return Math.max(-1, Math.min(1, event.type === 'DOMMouseScroll' ? event.detail : -event.wheelDelta));
      },mouseX:0,mouseY:0,mouseMovementX:0,mouseMovementY:0,touches:{},lastTouches:{},calculateMouseEvent:function (event) { // event should be mousemove, mousedown or mouseup
        if (Browser.pointerLock) {
          // When the pointer is locked, calculate the coordinates
          // based on the movement of the mouse.
          // Workaround for Firefox bug 764498
          if (event.type != 'mousemove' &&
              ('mozMovementX' in event)) {
            Browser.mouseMovementX = Browser.mouseMovementY = 0;
          } else {
            Browser.mouseMovementX = Browser.getMovementX(event);
            Browser.mouseMovementY = Browser.getMovementY(event);
          }
          
          // check if SDL is available
          if (typeof SDL != "undefined") {
          	Browser.mouseX = SDL.mouseX + Browser.mouseMovementX;
          	Browser.mouseY = SDL.mouseY + Browser.mouseMovementY;
          } else {
          	// just add the mouse delta to the current absolut mouse position
          	// FIXME: ideally this should be clamped against the canvas size and zero
          	Browser.mouseX += Browser.mouseMovementX;
          	Browser.mouseY += Browser.mouseMovementY;
          }        
        } else {
          // Otherwise, calculate the movement based on the changes
          // in the coordinates.
          var rect = Module["canvas"].getBoundingClientRect();
          var cw = Module["canvas"].width;
          var ch = Module["canvas"].height;
  
          // Neither .scrollX or .pageXOffset are defined in a spec, but
          // we prefer .scrollX because it is currently in a spec draft.
          // (see: http://www.w3.org/TR/2013/WD-cssom-view-20131217/)
          var scrollX = ((typeof window.scrollX !== 'undefined') ? window.scrollX : window.pageXOffset);
          var scrollY = ((typeof window.scrollY !== 'undefined') ? window.scrollY : window.pageYOffset);
  
          if (event.type === 'touchstart' || event.type === 'touchend' || event.type === 'touchmove') {
            var touch = event.touch;
            if (touch === undefined) {
              return; // the "touch" property is only defined in SDL
  
            }
            var adjustedX = touch.pageX - (scrollX + rect.left);
            var adjustedY = touch.pageY - (scrollY + rect.top);
  
            adjustedX = adjustedX * (cw / rect.width);
            adjustedY = adjustedY * (ch / rect.height);
  
            var coords = { x: adjustedX, y: adjustedY };
            
            if (event.type === 'touchstart') {
              Browser.lastTouches[touch.identifier] = coords;
              Browser.touches[touch.identifier] = coords;
            } else if (event.type === 'touchend' || event.type === 'touchmove') {
              Browser.lastTouches[touch.identifier] = Browser.touches[touch.identifier];
              Browser.touches[touch.identifier] = { x: adjustedX, y: adjustedY };
            } 
            return;
          }
  
          var x = event.pageX - (scrollX + rect.left);
          var y = event.pageY - (scrollY + rect.top);
  
          // the canvas might be CSS-scaled compared to its backbuffer;
          // SDL-using content will want mouse coordinates in terms
          // of backbuffer units.
          x = x * (cw / rect.width);
          y = y * (ch / rect.height);
  
          Browser.mouseMovementX = x - Browser.mouseX;
          Browser.mouseMovementY = y - Browser.mouseY;
          Browser.mouseX = x;
          Browser.mouseY = y;
        }
      },xhrLoad:function (url, onload, onerror) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = 'arraybuffer';
        xhr.onload = function xhr_onload() {
          if (xhr.status == 200 || (xhr.status == 0 && xhr.response)) { // file URLs can return 0
            onload(xhr.response);
          } else {
            onerror();
          }
        };
        xhr.onerror = onerror;
        xhr.send(null);
      },asyncLoad:function (url, onload, onerror, noRunDep) {
        Browser.xhrLoad(url, function(arrayBuffer) {
          assert(arrayBuffer, 'Loading data file "' + url + '" failed (no arrayBuffer).');
          onload(new Uint8Array(arrayBuffer));
          if (!noRunDep) removeRunDependency('al ' + url);
        }, function(event) {
          if (onerror) {
            onerror();
          } else {
            throw 'Loading data file "' + url + '" failed.';
          }
        });
        if (!noRunDep) addRunDependency('al ' + url);
      },resizeListeners:[],updateResizeListeners:function () {
        var canvas = Module['canvas'];
        Browser.resizeListeners.forEach(function(listener) {
          listener(canvas.width, canvas.height);
        });
      },setCanvasSize:function (width, height, noUpdates) {
        var canvas = Module['canvas'];
        Browser.updateCanvasDimensions(canvas, width, height);
        if (!noUpdates) Browser.updateResizeListeners();
      },windowedWidth:0,windowedHeight:0,setFullScreenCanvasSize:function () {
        // check if SDL is available   
        if (typeof SDL != "undefined") {
        	var flags = HEAPU32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)];
        	flags = flags | 0x00800000; // set SDL_FULLSCREEN flag
        	HEAP32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)]=flags
        }
        Browser.updateResizeListeners();
      },setWindowedCanvasSize:function () {
        // check if SDL is available       
        if (typeof SDL != "undefined") {
        	var flags = HEAPU32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)];
        	flags = flags & ~0x00800000; // clear SDL_FULLSCREEN flag
        	HEAP32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)]=flags
        }
        Browser.updateResizeListeners();
      },updateCanvasDimensions:function (canvas, wNative, hNative) {
        if (wNative && hNative) {
          canvas.widthNative = wNative;
          canvas.heightNative = hNative;
        } else {
          wNative = canvas.widthNative;
          hNative = canvas.heightNative;
        }
        var w = wNative;
        var h = hNative;
        if (Module['forcedAspectRatio'] && Module['forcedAspectRatio'] > 0) {
          if (w/h < Module['forcedAspectRatio']) {
            w = Math.round(h * Module['forcedAspectRatio']);
          } else {
            h = Math.round(w / Module['forcedAspectRatio']);
          }
        }
        if (((document['webkitFullScreenElement'] || document['webkitFullscreenElement'] ||
             document['mozFullScreenElement'] || document['mozFullscreenElement'] ||
             document['fullScreenElement'] || document['fullscreenElement'] ||
             document['msFullScreenElement'] || document['msFullscreenElement'] ||
             document['webkitCurrentFullScreenElement']) === canvas.parentNode) && (typeof screen != 'undefined')) {
           var factor = Math.min(screen.width / w, screen.height / h);
           w = Math.round(w * factor);
           h = Math.round(h * factor);
        }
        if (Browser.resizeCanvas) {
          if (canvas.width  != w) canvas.width  = w;
          if (canvas.height != h) canvas.height = h;
          if (typeof canvas.style != 'undefined') {
            canvas.style.removeProperty( "width");
            canvas.style.removeProperty("height");
          }
        } else {
          if (canvas.width  != wNative) canvas.width  = wNative;
          if (canvas.height != hNative) canvas.height = hNative;
          if (typeof canvas.style != 'undefined') {
            if (w != wNative || h != hNative) {
              canvas.style.setProperty( "width", w + "px", "important");
              canvas.style.setProperty("height", h + "px", "important");
            } else {
              canvas.style.removeProperty( "width");
              canvas.style.removeProperty("height");
            }
          }
        }
      }};

  var _emscripten_get_longjmp_result=true;

  function ___ctype_b_loc() {
      // http://refspecs.freestandards.org/LSB_3.0.0/LSB-Core-generic/LSB-Core-generic/baselib---ctype-b-loc.html
      var me = ___ctype_b_loc;
      if (!me.ret) {
        var values = [
          0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
          0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
          0,0,0,0,0,0,0,0,0,0,2,2,2,2,2,2,2,2,2,8195,8194,8194,8194,8194,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,24577,49156,49156,49156,
          49156,49156,49156,49156,49156,49156,49156,49156,49156,49156,49156,49156,55304,55304,55304,55304,55304,55304,55304,55304,
          55304,55304,49156,49156,49156,49156,49156,49156,49156,54536,54536,54536,54536,54536,54536,50440,50440,50440,50440,50440,
          50440,50440,50440,50440,50440,50440,50440,50440,50440,50440,50440,50440,50440,50440,50440,49156,49156,49156,49156,49156,
          49156,54792,54792,54792,54792,54792,54792,50696,50696,50696,50696,50696,50696,50696,50696,50696,50696,50696,50696,50696,
          50696,50696,50696,50696,50696,50696,50696,49156,49156,49156,49156,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
          0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
          0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        ];
        var i16size = 2;
        var arr = _malloc(values.length * i16size);
        for (var i = 0; i < values.length; i++) {
          HEAP16[(((arr)+(i * i16size))>>1)]=values[i];
        }
        me.ret = allocate([arr + 128 * i16size], 'i16*', ALLOC_NORMAL);
      }
      return me.ret;
    }

  function _freelocale(locale) {
      _free(locale);
    }

  var _atan2f=Math_atan2;

  var _fmodl=_fmod;

  function _catopen(name, oflag) {
      // nl_catd catopen (const char *name, int oflag)
      return -1;
    }

  function _catgets(catd, set_id, msg_id, s) {
      // char *catgets (nl_catd catd, int set_id, int msg_id, const char *s)
      return s;
    }

  
  
  function _sprintf(s, format, varargs) {
      // int sprintf(char *restrict s, const char *restrict format, ...);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/printf.html
      return _snprintf(s, undefined, format, varargs);
    }function _asprintf(s, format, varargs) {
      return _sprintf(-s, format, varargs);
    }function _vasprintf(s, format, va_arg) {
      return _asprintf(s, format, HEAP32[((va_arg)>>2)]);
    }

  function _ferror(stream) {
      // int ferror(FILE *stream);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/ferror.html
      stream = FS.getStreamFromPtr(stream);
      return Number(stream && stream.error);
    }

  function ___cxa_allocate_exception(size) {
      var ptr = _malloc(size + ___cxa_exception_header_size);
      return ptr + ___cxa_exception_header_size;
    }


  function ___ctype_toupper_loc() {
      // http://refspecs.freestandards.org/LSB_3.1.1/LSB-Core-generic/LSB-Core-generic/libutil---ctype-toupper-loc.html
      var me = ___ctype_toupper_loc;
      if (!me.ret) {
        var values = [
          128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,
          158,159,160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175,176,177,178,179,180,181,182,183,184,185,186,187,
          188,189,190,191,192,193,194,195,196,197,198,199,200,201,202,203,204,205,206,207,208,209,210,211,212,213,214,215,216,217,
          218,219,220,221,222,223,224,225,226,227,228,229,230,231,232,233,234,235,236,237,238,239,240,241,242,243,244,245,246,247,
          248,249,250,251,252,253,254,-1,0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,
          33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,
          73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,
          81,82,83,84,85,86,87,88,89,90,123,124,125,126,127,128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,
          145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,
          175,176,177,178,179,180,181,182,183,184,185,186,187,188,189,190,191,192,193,194,195,196,197,198,199,200,201,202,203,204,
          205,206,207,208,209,210,211,212,213,214,215,216,217,218,219,220,221,222,223,224,225,226,227,228,229,230,231,232,233,234,
          235,236,237,238,239,240,241,242,243,244,245,246,247,248,249,250,251,252,253,254,255
        ];
        var i32size = 4;
        var arr = _malloc(values.length * i32size);
        for (var i = 0; i < values.length; i++) {
          HEAP32[(((arr)+(i * i32size))>>2)]=values[i];
        }
        me.ret = allocate([arr + 128 * i32size], 'i32*', ALLOC_NORMAL);
      }
      return me.ret;
    }

  function ___cxa_guard_acquire(variable) {
      if (!HEAP8[(variable)]) { // ignore SAFE_HEAP stuff because llvm mixes i64 and i8 here
        HEAP8[(variable)]=1;
        return 1;
      }
      return 0;
    }

  function _munmap(start, num) {
      if (!_mmap.mappings) _mmap.mappings = {};
      // TODO: support unmmap'ing parts of allocations
      var info = _mmap.mappings[start];
      if (!info) return 0;
      if (num == info.num) {
        _mmap.mappings[start] = null;
        if (info.allocated) {
          _free(info.malloc);
        }
      }
      return 0;
    }

  function ___ctype_tolower_loc() {
      // http://refspecs.freestandards.org/LSB_3.1.1/LSB-Core-generic/LSB-Core-generic/libutil---ctype-tolower-loc.html
      var me = ___ctype_tolower_loc;
      if (!me.ret) {
        var values = [
          128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,
          158,159,160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175,176,177,178,179,180,181,182,183,184,185,186,187,
          188,189,190,191,192,193,194,195,196,197,198,199,200,201,202,203,204,205,206,207,208,209,210,211,212,213,214,215,216,217,
          218,219,220,221,222,223,224,225,226,227,228,229,230,231,232,233,234,235,236,237,238,239,240,241,242,243,244,245,246,247,
          248,249,250,251,252,253,254,-1,0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,
          33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,97,98,99,100,101,102,103,
          104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,91,92,93,94,95,96,97,98,99,100,101,102,103,
          104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,123,124,125,126,127,128,129,130,131,132,133,
          134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,161,162,163,
          164,165,166,167,168,169,170,171,172,173,174,175,176,177,178,179,180,181,182,183,184,185,186,187,188,189,190,191,192,193,
          194,195,196,197,198,199,200,201,202,203,204,205,206,207,208,209,210,211,212,213,214,215,216,217,218,219,220,221,222,223,
          224,225,226,227,228,229,230,231,232,233,234,235,236,237,238,239,240,241,242,243,244,245,246,247,248,249,250,251,252,253,
          254,255
        ];
        var i32size = 4;
        var arr = _malloc(values.length * i32size);
        for (var i = 0; i < values.length; i++) {
          HEAP32[(((arr)+(i * i32size))>>2)]=values[i];
        }
        me.ret = allocate([arr + 128 * i32size], 'i32*', ALLOC_NORMAL);
      }
      return me.ret;
    }

  function ___cxa_begin_catch(ptr) {
      __ZSt18uncaught_exceptionv.uncaught_exception--;
      ___cxa_caught_exceptions.push(___cxa_last_thrown_exception);
      return ptr;
    }

  function _unlink(path) {
      // int unlink(const char *path);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/unlink.html
      path = Pointer_stringify(path);
      try {
        FS.unlink(path);
        return 0;
      } catch (e) {
        FS.handleFSError(e);
        return -1;
      }
    }

  var _log=Math_log;


  function __ZNSt9exceptionD2Ev() {}


  var _atan2=Math_atan2;

  function _mmap(start, num, prot, flags, fd, offset) {
      /* FIXME: Since mmap is normally implemented at the kernel level,
       * this implementation simply uses malloc underneath the call to
       * mmap.
       */
      var MAP_PRIVATE = 2;
      var ptr;
      var allocated = false;
  
      if (!_mmap.mappings) _mmap.mappings = {};
  
      if (fd == -1) {
        ptr = _malloc(num);
        if (!ptr) return -1;
        _memset(ptr, 0, num);
        allocated = true;
      } else {
        var info = FS.getStream(fd);
        if (!info) return -1;
        try {
          var res = FS.mmap(info, HEAPU8, start, num, offset, prot, flags);
          ptr = res.ptr;
          allocated = res.allocated;
        } catch (e) {
          FS.handleFSError(e);
          return -1;
        }
      }
  
      _mmap.mappings[ptr] = { malloc: ptr, num: num, allocated: allocated };
      return ptr;
    }

  var __ZTISt9exception=allocate([allocate([1,0,0,0,0,0,0], "i8", ALLOC_STATIC)+8, 0], "i32", ALLOC_STATIC);

  var ___dso_handle=allocate(1, "i32*", ALLOC_STATIC);



FS.staticInit();__ATINIT__.unshift({ func: function() { if (!Module["noFSInit"] && !FS.init.initialized) FS.init() } });__ATMAIN__.push({ func: function() { FS.ignorePermissions = false } });__ATEXIT__.push({ func: function() { FS.quit() } });Module["FS_createFolder"] = FS.createFolder;Module["FS_createPath"] = FS.createPath;Module["FS_createDataFile"] = FS.createDataFile;Module["FS_createPreloadedFile"] = FS.createPreloadedFile;Module["FS_createLazyFile"] = FS.createLazyFile;Module["FS_createLink"] = FS.createLink;Module["FS_createDevice"] = FS.createDevice;
___errno_state = Runtime.staticAlloc(4); HEAP32[((___errno_state)>>2)]=0;
__ATINIT__.unshift({ func: function() { TTY.init() } });__ATEXIT__.push({ func: function() { TTY.shutdown() } });TTY.utf8 = new Runtime.UTF8Processor();
if (ENVIRONMENT_IS_NODE) { var fs = require("fs"); NODEFS.staticInit(); }
_fgetc.ret = allocate([0], "i8", ALLOC_STATIC);
__ATINIT__.push({ func: function() { SOCKFS.root = FS.mount(SOCKFS, {}, null); } });
_fputc.ret = allocate([0], "i8", ALLOC_STATIC);
Module["requestFullScreen"] = function Module_requestFullScreen(lockPointer, resizeCanvas) { Browser.requestFullScreen(lockPointer, resizeCanvas) };
  Module["requestAnimationFrame"] = function Module_requestAnimationFrame(func) { Browser.requestAnimationFrame(func) };
  Module["setCanvasSize"] = function Module_setCanvasSize(width, height, noUpdates) { Browser.setCanvasSize(width, height, noUpdates) };
  Module["pauseMainLoop"] = function Module_pauseMainLoop() { Browser.mainLoop.pause() };
  Module["resumeMainLoop"] = function Module_resumeMainLoop() { Browser.mainLoop.resume() };
  Module["getUserMedia"] = function Module_getUserMedia() { Browser.getUserMedia() }
STACK_BASE = STACKTOP = Runtime.alignMemory(STATICTOP);

staticSealed = true; // seal the static portion of memory

STACK_MAX = STACK_BASE + 5242880;

DYNAMIC_BASE = DYNAMICTOP = Runtime.alignMemory(STACK_MAX);

assert(DYNAMIC_BASE < TOTAL_MEMORY, "TOTAL_MEMORY not big enough for stack");

 var ctlz_i8 = allocate([8,7,6,6,5,5,5,5,4,4,4,4,4,4,4,4,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], "i8", ALLOC_DYNAMIC);
 var cttz_i8 = allocate([8,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,5,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,6,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,5,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,7,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,5,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,6,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,5,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0], "i8", ALLOC_DYNAMIC);

var Math_min = Math.min;
function invoke_iiii(index,a1,a2,a3) {
  try {
    return Module["dynCall_iiii"](index,a1,a2,a3);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_dii(index,a1,a2) {
  try {
    return Module["dynCall_dii"](index,a1,a2);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_viiiiiii(index,a1,a2,a3,a4,a5,a6,a7) {
  try {
    Module["dynCall_viiiiiii"](index,a1,a2,a3,a4,a5,a6,a7);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_viiiii(index,a1,a2,a3,a4,a5) {
  try {
    Module["dynCall_viiiii"](index,a1,a2,a3,a4,a5);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_vi(index,a1) {
  try {
    Module["dynCall_vi"](index,a1);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_vii(index,a1,a2) {
  try {
    Module["dynCall_vii"](index,a1,a2);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_iiiiiii(index,a1,a2,a3,a4,a5,a6) {
  try {
    return Module["dynCall_iiiiiii"](index,a1,a2,a3,a4,a5,a6);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_viiiiiiiii(index,a1,a2,a3,a4,a5,a6,a7,a8,a9) {
  try {
    Module["dynCall_viiiiiiiii"](index,a1,a2,a3,a4,a5,a6,a7,a8,a9);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_ii(index,a1) {
  try {
    return Module["dynCall_ii"](index,a1);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_viiiiiid(index,a1,a2,a3,a4,a5,a6,a7) {
  try {
    Module["dynCall_viiiiiid"](index,a1,a2,a3,a4,a5,a6,a7);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_viii(index,a1,a2,a3) {
  try {
    Module["dynCall_viii"](index,a1,a2,a3);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_viiiiid(index,a1,a2,a3,a4,a5,a6) {
  try {
    Module["dynCall_viiiiid"](index,a1,a2,a3,a4,a5,a6);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_v(index) {
  try {
    Module["dynCall_v"](index);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_iiiiiiiii(index,a1,a2,a3,a4,a5,a6,a7,a8) {
  try {
    return Module["dynCall_iiiiiiiii"](index,a1,a2,a3,a4,a5,a6,a7,a8);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_iiiii(index,a1,a2,a3,a4) {
  try {
    return Module["dynCall_iiiii"](index,a1,a2,a3,a4);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_viiiiiiii(index,a1,a2,a3,a4,a5,a6,a7,a8) {
  try {
    Module["dynCall_viiiiiiii"](index,a1,a2,a3,a4,a5,a6,a7,a8);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_viiiiii(index,a1,a2,a3,a4,a5,a6) {
  try {
    Module["dynCall_viiiiii"](index,a1,a2,a3,a4,a5,a6);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_iii(index,a1,a2) {
  try {
    return Module["dynCall_iii"](index,a1,a2);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_iiiiii(index,a1,a2,a3,a4,a5) {
  try {
    return Module["dynCall_iiiiii"](index,a1,a2,a3,a4,a5);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_viiii(index,a1,a2,a3,a4) {
  try {
    Module["dynCall_viiii"](index,a1,a2,a3,a4);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function asmPrintInt(x, y) {
  Module.print('int ' + x + ',' + y);// + ' ' + new Error().stack);
}
function asmPrintFloat(x, y) {
  Module.print('float ' + x + ',' + y);// + ' ' + new Error().stack);
}
// EMSCRIPTEN_START_ASM
var asm=(function(global,env,buffer){"use asm";var a=new global.Int8Array(buffer);var b=new global.Int16Array(buffer);var c=new global.Int32Array(buffer);var d=new global.Uint8Array(buffer);var e=new global.Uint16Array(buffer);var f=new global.Uint32Array(buffer);var g=new global.Float32Array(buffer);var h=new global.Float64Array(buffer);var i=env.STACKTOP|0;var j=env.STACK_MAX|0;var k=env.tempDoublePtr|0;var l=env.ABORT|0;var m=env.cttz_i8|0;var n=env.ctlz_i8|0;var o=env.__ZTISt9exception|0;var p=env.___dso_handle|0;var q=env._stderr|0;var r=env._stdin|0;var s=env._stdout|0;var t=0;var u=0;var v=0;var w=0;var x=+env.NaN,y=+env.Infinity;var z=0,A=0,B=0,C=0,D=0.0,E=0,F=0,G=0,H=0.0;var I=0;var J=0;var K=0;var L=0;var M=0;var N=0;var O=0;var P=0;var Q=0;var R=0;var S=global.Math.floor;var T=global.Math.abs;var U=global.Math.sqrt;var V=global.Math.pow;var W=global.Math.cos;var X=global.Math.sin;var Y=global.Math.tan;var Z=global.Math.acos;var _=global.Math.asin;var $=global.Math.atan;var aa=global.Math.atan2;var ba=global.Math.exp;var ca=global.Math.log;var da=global.Math.ceil;var ea=global.Math.imul;var fa=env.abort;var ga=env.assert;var ha=env.asmPrintInt;var ia=env.asmPrintFloat;var ja=env.min;var ka=env.invoke_iiii;var la=env.invoke_dii;var ma=env.invoke_viiiiiii;var na=env.invoke_viiiii;var oa=env.invoke_vi;var pa=env.invoke_vii;var qa=env.invoke_iiiiiii;var ra=env.invoke_viiiiiiiii;var sa=env.invoke_ii;var ta=env.invoke_viiiiiid;var ua=env.invoke_viii;var va=env.invoke_viiiiid;var wa=env.invoke_v;var xa=env.invoke_iiiiiiiii;var ya=env.invoke_iiiii;var za=env.invoke_viiiiiiii;var Aa=env.invoke_viiiiii;var Ba=env.invoke_iii;var Ca=env.invoke_iiiiii;var Da=env.invoke_viiii;var Ea=env._fabs;var Fa=env._log;var Ga=env._vsscanf;var Ha=env.__ZSt9terminatev;var Ia=env.___cxa_guard_acquire;var Ja=env.__reallyNegative;var Ka=env._fstat;var La=env.___assert_fail;var Ma=env.__ZSt18uncaught_exceptionv;var Na=env._longjmp;var Oa=env.___ctype_toupper_loc;var Pa=env.__addDays;var Qa=env._fsync;var Ra=env._sbrk;var Sa=env.___cxa_begin_catch;var Ta=env._emscripten_memcpy_big;var Ua=env.__parseInt64;var Va=env._close;var Wa=env._ferror;var Xa=env._fileno;var Ya=env._fread;var Za=env._unlink;var _a=env._write;var $a=env.__isLeapYear;var ab=env._ftell;var bb=env.__ZNSt9exceptionD2Ev;var cb=env.___cxa_does_inherit;var db=env._strtoll_l;var eb=env.___cxa_rethrow;var fb=env._catclose;var gb=env._send;var hb=env._atan2;var ib=env.___cxa_is_number_type;var jb=env.___cxa_free_exception;var kb=env._atan2f;var lb=env.___cxa_find_matching_catch;var mb=env._isxdigit_l;var nb=env.___cxa_guard_release;var ob=env._truncate;var pb=env._strerror_r;var qb=env.___setErrNo;var rb=env._newlocale;var sb=env._isdigit_l;var tb=env.___resumeException;var ub=env._freelocale;var vb=env._putchar;var wb=env._sprintf;var xb=env._vasprintf;var yb=env._stat;var zb=env._vsnprintf;var Ab=env._strtoull_l;var Bb=env._read;var Cb=env._fwrite;var Db=env._time;var Eb=env._pthread_mutex_lock;var Fb=env._gettimeofday;var Gb=env._munmap;var Hb=env._mmap;var Ib=env._catopen;var Jb=env._exit;var Kb=env.___ctype_b_loc;var Lb=env._fmod;var Mb=env._lseek;var Nb=env.___cxa_allocate_exception;var Ob=env._strtoll;var Pb=env._pwrite;var Qb=env._open;var Rb=env._fabsf;var Sb=env._uselocale;var Tb=env._snprintf;var Ub=env.__scanString;var Vb=env.___cxa_end_catch;var Wb=env._strtoull;var Xb=env._strftime;var Yb=env._ftruncate;var Zb=env._fseek;var _b=env._isxdigit;var $b=env._fclose;var ac=env._sqrtf;var bc=env._pthread_cond_broadcast;var cc=env._recv;var dc=env._fgetc;var ec=env._sysconf;var fc=env.__getFloat;var gc=env._abort;var hc=env._isspace;var ic=env._fopen;var jc=env._pthread_cond_wait;var kc=env._ungetc;var lc=env._fflush;var mc=env._strftime_l;var nc=env._sscanf;var oc=env._catgets;var pc=env._asprintf;var qc=env.__exit;var rc=env.__arraySum;var sc=env.___ctype_tolower_loc;var tc=env._pthread_mutex_unlock;var uc=env._pread;var vc=env._mkport;var wc=env._feof;var xc=env.___errno_location;var yc=env._copysign;var zc=env._fputc;var Ac=env.___cxa_throw;var Bc=env._isdigit;var Cc=env._strerror;var Dc=env._emscripten_longjmp;var Ec=env.__formatString;var Fc=env._atexit;var Gc=0.0;
// EMSCRIPTEN_START_FUNCS
function nf(a,d,f,g,h){a=a|0;d=d|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0;k=i;i=i+16|0;l=k;b[l>>1]=d;d=a+12|0;o=a+8|0;w=Wf(l,c[d>>2]|0,c[o>>2]|0,2,33)|0;if((w|0)==0){La(5320,5288,314,5360)}t=b[l>>1]|0;if(!(t<<16>>16==(b[w>>1]|0))){La(5320,5288,314,5360)}u=c[d>>2]|0;while(1){if(!(w>>>0>u>>>0)){break}v=w+ -2|0;if(t<<16>>16==(b[v>>1]|0)){w=v}else{break}}v=u+(c[o>>2]<<1)|0;y=w>>>0<v>>>0;if(!y){A=0;i=k;return A|0}z=a+16|0;a:do{if(f<<16>>16==0){z=w;x=0;while(1){if(!(t<<16>>16==(b[z>>1]|0))){break a}z=z+2|0;if(z>>>0<v>>>0){x=1}else{x=1;break}}}else{A=w;x=0;do{if(!(t<<16>>16==(b[A>>1]|0))){break a}x=(b[(c[z>>2]|0)+(((A-u|0)>>>1&65535)<<1)>>1]&31)==f<<16>>16|x;A=A+2|0}while(A>>>0<v>>>0)}}while(0);if(!y){A=0;i=k;return A|0}h=h&65535;y=a+16|0;a=a+4|0;if(f<<16>>16==0){s=0;while(1){if(!(t<<16>>16==(b[w>>1]|0))){j=s;s=27;break}z=s&65535;if(!((z+1|0)>>>0<h>>>0)){s=23;break}b[g+(z<<1)>>1]=(e[(c[y>>2]|0)+(((w-u|0)>>>1&65535)<<1)>>1]|0)>>>5;s=s+1<<16>>16;w=w+2|0;if(!(w>>>0<v>>>0)){j=s;s=27;break}}if((s|0)==23){La(5384,5288,338,5360)}else if((s|0)==27){i=k;return j|0}}else{p=t;r=u;n=0;q=w}while(1){if(!(p<<16>>16==(b[q>>1]|0))){j=n;s=27;break}p=(q-r|0)>>>1;if(x){if((b[(c[y>>2]|0)+((p&65535)<<1)>>1]&31)==f<<16>>16){s=22}else{m=n}}else{if(og(c[a>>2]|0,f,(e[(c[y>>2]|0)+((p&65535)<<1)>>1]|0)>>>5)|0){s=22}else{m=n}}if((s|0)==22){s=0;m=n&65535;if(!((m+1|0)>>>0<h>>>0)){s=23;break}b[g+(m<<1)>>1]=(e[(c[y>>2]|0)+((p&65535)<<1)>>1]|0)>>>5;m=n+1<<16>>16}q=q+2|0;r=c[d>>2]|0;if(!(q>>>0<(r+(c[o>>2]<<1)|0)>>>0)){j=m;s=27;break}p=b[l>>1]|0;n=m}if((s|0)==23){La(5384,5288,338,5360)}else if((s|0)==27){i=k;return j|0}return 0}function of(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0;e=i;if((b|0)==0){l=0;i=e;return l|0}f=d&65535;if((d&65535)>8){l=0;i=e;return l|0}d=f+ -1|0;j=c[a+(d<<2)+96>>2]|0;h=a+20|0;g=a+(d<<2)+24|0;l=c[g>>2]|0;b=Wf(b,(c[h>>2]|0)+(l<<1)|0,(((c[a+(f<<2)+24>>2]|0)-l|0)>>>0)/(f>>>0)|0,f<<1,j)|0;if((b|0)==0){l=0;i=e;return l|0}k=0-f|0;while(1){if(!(b>>>0>((c[h>>2]|0)+(c[g>>2]<<1)|0)>>>0)){break}l=b+(k<<1)|0;if((Yc[j&63](b,l)|0)==0){b=l}else{break}}if((b|0)==0){l=0;i=e;return l|0}h=c[h>>2]|0;if(!(b>>>0>h>>>0)){La(5416,5288,356,5432)}h=b-h>>1;g=c[g>>2]|0;if(h>>>0<g>>>0){La(5448,5288,357,5432)}l=(((h-g|0)>>>0)/(f>>>0)|0)+(c[a+(d<<2)+60>>2]|0)|0;i=e;return l|0}function pf(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0;e=i;if((((d|0)!=0?(a[b]=0,j=b+8|0,(Ya(j|0,4,1,d|0)|0)==1):0)?(Ya(b+24|0,4,9,d|0)|0)==9:0)?(Ya(b+60|0,4,9,d|0)|0)==9:0){k=b+20|0;l=c[k>>2]|0;if((l|0)!=0){Sq(l)}c[k>>2]=0;l=b+12|0;m=c[l>>2]|0;if((m|0)!=0){Sq(m)}c[l>>2]=0;m=b+16|0;n=c[m>>2]|0;if((n|0)!=0){Sq(n)}c[m>>2]=0;o=b+56|0;n=c[j>>2]|0;p=Rq(c[o>>2]<<1)|0;c[k>>2]=p;if((((((p|0)!=0?(c[j>>2]=n,h=n<<1,g=Rq(h)|0,c[l>>2]=g,(g|0)!=0):0)?(p=Rq(h)|0,c[m>>2]=p,(p|0)!=0):0)?(f=Ya(g|0,2,n|0,d|0)|0,(f|0)==(c[j>>2]|0)):0)?(p=Ya(c[m>>2]|0,2,f|0,d|0)|0,(p|0)==(c[j>>2]|0)):0)?(p=Ya(c[k>>2]|0,2,c[o>>2]|0,d|0)|0,(p|0)==(c[o>>2]|0)):0){a[b]=1;d=1}else{d=0}}else{d=0}i=e;return d|0}function qf(a){a=a|0;var b=0,d=0,e=0;d=i;c[a>>2]=5520;c[a+8>>2]=qg()|0;c[a+4>>2]=0;c[a+56>>2]=0;e=a+12|0;b=e+40|0;do{c[e>>2]=0;e=e+4|0}while((e|0)<(b|0));Rc[c[(c[a>>2]|0)+20>>2]&7](a,0,1);i=d;return}function rf(a){a=a|0;var b=0;b=i;c[a>>2]=5520;tf(a,1);Yq(a);i=b;return}function sf(a){a=a|0;var b=0;b=i;c[a>>2]=5520;tf(a,1);i=b;return}function tf(a,b){a=a|0;b=b|0;var d=0,e=0,f=0;d=i;f=a+12|0;e=c[f>>2]|0;if((e|0)!=0){Sq(e)}c[f>>2]=0;e=a+20|0;f=c[e>>2]|0;if((f|0)!=0){Sq(f)}c[e>>2]=0;e=a+16|0;f=c[e>>2]|0;if((f|0)!=0){Sq(f)}c[e>>2]=0;if(b){b=a+4|0;e=c[b>>2]|0;if((e|0)!=0){kf(e);Yq(e)}c[b>>2]=0}b=a+48|0;e=c[b>>2]|0;if((e|0)!=0){Zq(e)}c[b>>2]=0;b=a+56|0;e=c[b>>2]|0;if((e|0)!=0){Zq(e)}c[b>>2]=0;Rc[c[(c[a>>2]|0)+20>>2]&7](a,0,1);i=d;return}function uf(a,d){a=a|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0;e=i;if((d|0)==0){r=0;i=e;return r|0}m=a+24|0;if((Ya(m|0,4,1,d|0)|0)!=1){r=0;i=e;return r|0}l=a+28|0;if((Ya(l|0,4,1,d|0)|0)!=1){r=0;i=e;return r|0}j=a+36|0;if((Ya(j|0,4,1,d|0)|0)!=1){r=0;i=e;return r|0}f=a+44|0;if((Ya(f|0,4,1,d|0)|0)!=1){r=0;i=e;return r|0}if(!((c[f>>2]|0)>>>0<(c[j>>2]|0)>>>0)){r=0;i=e;return r|0}tf(a,0);k=a+12|0;c[k>>2]=Rq(c[m>>2]<<4)|0;q=a+16|0;c[q>>2]=Rq((c[l>>2]|0)*10|0)|0;h=c[j>>2]|0;n=a+32|0;c[n>>2]=Rq(h)|0;c[a+40>>2]=(h>>>0)/3|0;h=wg(rg()|0)|0;f=h+1|0;if((c[m>>2]|0)>>>0>f>>>0){La(5600,5632,196,5656)}g=a+20|0;c[g>>2]=Rq(f<<1)|0;p=a+48|0;c[p>>2]=Xq(2400)|0;r=a+56|0;c[r>>2]=Xq(400)|0;Rc[c[(c[a>>2]|0)+20>>2]&7](a,0,1);o=c[k>>2]|0;if((((((o|0)!=0?(c[q>>2]|0)!=0:0)?(c[n>>2]|0)!=0:0)?(c[g>>2]|0)!=0:0)?(c[p>>2]|0)!=0:0)?(c[r>>2]|0)!=0:0){r=Ya(o|0,16,c[m>>2]|0,d|0)|0;if((r|0)!=(c[m>>2]|0)){r=0;i=e;return r|0}r=Ya(c[q>>2]|0,10,c[l>>2]|0,d|0)|0;if((r|0)!=(c[l>>2]|0)){r=0;i=e;return r|0}r=Ya(c[n>>2]|0,1,c[j>>2]|0,d|0)|0;if((r|0)!=(c[j>>2]|0)){r=0;i=e;return r|0}j=c[m>>2]|0;if(j>>>0>1){k=c[k>>2]|0;l=c[g>>2]|0;d=j>>>0>2;m=1;p=0;o=30;while(1){n=k+(m<<4)+8|0;q=b[n>>1]|0;if((o&65535)<(q&65535)){p=p&65535;do{b[l+((o&65535)+ -30<<1)>>1]=p;o=o+1<<16>>16;q=b[n>>1]|0}while((o&65535)<(q&65535))}b[l+((q&65535)+ -30<<1)>>1]=m;o=b[n>>1]|0;n=m+1|0;if(!(n>>>0<j>>>0)){break}else{p=m;m=n}}j=d?j&65535:2}else{j=1;o=30}k=(o&65535)+1|0;d=k&65535;h=h+31|0;if(!(d>>>0<h>>>0)){r=1;i=e;return r|0}k=k&65535;while(1){d=d+ -30|0;if(!(d>>>0<f>>>0)){f=29;break}b[(c[g>>2]|0)+(d<<1)>>1]=j;k=k+1<<16>>16;d=k&65535;if(!(d>>>0<h>>>0)){a=1;f=31;break}}if((f|0)==29){La(5672,5632,238,5656)}else if((f|0)==31){i=e;return a|0}}tf(a,0);r=0;i=e;return r|0}function vf(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0;f=i;if(!((b|0)!=0&e>>>0>d>>>0)){h=0;i=f;return h|0}b=ic(b|0,5728)|0;if((b|0)==0){h=0;i=f;return h|0}tf(a,1);h=Wq(128)|0;jf(h);g=a+4|0;c[g>>2]=h;if((h|0)==0){$b(b|0)|0;h=0;i=f;return h|0}j=rg()|0;h=Xf()|0;if((((vg(j,b)|0?pf(c[g>>2]|0,b)|0:0)?uf(a,b)|0:0)?Yf(h,b)|0:0)?!((c[a+40>>2]|0)>>>0>(1-d+e|0)>>>0):0){$b(b|0)|0;j=1;i=f;return j|0}tf(a,1);$b(b|0)|0;j=0;i=f;return j|0}function wf(a,d,f){a=a|0;d=d|0;f=f|0;var g=0;g=i;if(d<<16>>16==0){b[a+52>>1]=0;b[a+60>>1]=1;i=g;return}if(f<<16>>16==0){i=g;return}d=a+60|0;if(!((e[d>>1]|0)>(f&65535))){i=g;return}b[d>>1]=f;b[a+52>>1]=b[(c[a+56>>2]|0)+((f&65535)<<2)>>1]|0;i=g;return}function xf(a,c,d,e,f,g){a=a|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0;h=i;if((d|0)==0){j=0;i=h;return j|0}j=b[d+80>>1]|0;if(c<<16>>16==0){if(!(j<<16>>16==0)){La(5736,5632,375,5768)}j=yf(a,0,d,e,f,g)|0;i=h;return j|0}if(j<<16>>16==1){j=zf(a,c,d,e,f,g)|0;i=h;return j|0}else{j=Af(a,c,d,e,f,g)|0;i=h;return j|0}return 0}function yf(a,f,g,h,j,k){a=a|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0;n=i;if(!((g|0)!=0&f<<16>>16==0)){La(5784,5632,391,5816)}c[k>>2]=0;f=b[g+(e[g+80>>1]<<1)>>1]|0;q=b[g+88>>1]|0;y=b[g+90>>1]|0;D=Uf(Tf()|0,f)|0;s=a+12|0;t=q&65535;I=c[a+20>>2]|0;H=b[I+(t+ -30<<1)>>1]|0;g=H&65535;y=y&65535;t=y+t|0;I=b[I+(t+ -30<<1)>>1]|0;u=I&65535;if(!((H&65535)<(I&65535))){I=0;i=n;return I|0}r=c[s>>2]|0;x=a+60|0;w=a+52|0;v=a+48|0;B=y<<24;A=a+56|0;z=t+ -1|0;y=a+8|0;a=a+32|0;if(D){D=0;E=g;while(1){if((c[r>>2]|0)!=1){C=13;break}G=(c[s>>2]|0)+(E<<4)+8|0;F=b[G>>1]|0;if(!((F&65535)>=(q&65535)&(F&65535|0)<(t|0))){C=15;break}if(F<<16>>16==q<<16>>16){if((e[x>>1]|0)<100?(C=b[w>>1]|0,(C&65535)<600):0){D=(c[v>>2]|0)+((C&65535)<<2)|0;c[D>>2]=c[D>>2]&-16777216|E&16777215;D=(c[v>>2]|0)+(e[w>>1]<<2)|0;c[D>>2]=c[D>>2]&16777215|B;D=c[A>>2]|0;b[D+(e[x>>1]<<2)>>1]=b[w>>1]|0;b[D+(e[x>>1]<<2)+2>>1]=1;D=b[x>>1]|0;b[w>>1]=(b[w>>1]|0)+1<<16>>16;b[x>>1]=D+1<<16>>16;F=b[G>>1]|0}else{F=q}}E=E+1|0;if(!((F&65535|0)<(z|0)&E>>>0<u>>>0)){l=D;C=27;break}}if((C|0)==13){La(5832,5632,408,5816)}else if((C|0)==15){La(5856,5632,410,5816)}else if((C|0)==27){i=n;return l|0}}else{p=0;o=g}while(1){if((c[r>>2]|0)!=1){C=13;break}H=c[s>>2]|0;C=H+(o<<4)+8|0;I=b[C>>1]|0;if(!((I&65535)>=(q&65535)&(I&65535|0)<(t|0))){C=15;break}if((c[k>>2]|0)>>>0<j>>>0?(o|0)==(g|0)|(pg(c[y>>2]|0,f)|0)^1:0){D=c[k>>2]|0;E=j-D|0;G=Xf()|0;F=H+(o<<4)+4|0;H=H+(o<<4)+12|0;a:do{if((b[H>>1]|0)==0){I=0}else{I=0;do{K=((c[F>>2]|0)+I|0)*3|0;J=c[a>>2]|0;K=(d[J+(K+1)|0]|d[J+(K+2)|0]<<8)<<8|d[J+K|0];J=I+D|0;L=h+(J<<3)|0;c[L>>2]=c[L>>2]&-268435456|K|16777216;b[h+(J<<3)+4>>1]=~~+_f(G,K);I=I+1|0;if(!(I>>>0<E>>>0)){break a}}while(I>>>0<(e[H>>1]|0)>>>0)}}while(0);c[k>>2]=(c[k>>2]|0)+I}D=b[C>>1]|0;if(D<<16>>16==q<<16>>16){if((e[x>>1]|0)<100?(m=b[w>>1]|0,(m&65535)<600):0){p=(c[v>>2]|0)+((m&65535)<<2)|0;c[p>>2]=c[p>>2]&-16777216|o&16777215;p=(c[v>>2]|0)+(e[w>>1]<<2)|0;c[p>>2]=c[p>>2]&16777215|B;p=c[A>>2]|0;b[p+(e[x>>1]<<2)>>1]=b[w>>1]|0;b[p+(e[x>>1]<<2)+2>>1]=1;p=b[x>>1]|0;b[w>>1]=(b[w>>1]|0)+1<<16>>16;b[x>>1]=p+1<<16>>16;C=b[C>>1]|0}else{C=q}}else{C=D}o=o+1|0;if(!((C&65535|0)<(z|0)&o>>>0<u>>>0)){l=p;C=27;break}}if((C|0)==13){La(5832,5632,408,5816)}else if((C|0)==15){La(5856,5632,410,5816)}else if((C|0)==27){i=n;return l|0}return 0}function zf(f,g,h,j,k,l){f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;var m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0;o=i;if((h|0)==0){La(5920,5632,449,5992)}t=g&65535;if(g<<16>>16==0){La(5920,5632,449,5992)}q=f+60|0;if(!((e[q>>1]|0)>(g&65535))){La(5920,5632,449,5992)}r=b[h+88>>1]|0;s=f+56|0;u=c[s>>2]|0;g=u+(t<<2)+2|0;A=b[g>>1]|0;if(A<<16>>16==0){Q=0;i=o;return Q|0}v=u+(t<<2)|0;t=f+48|0;w=f+12|0;u=f+28|0;x=f+16|0;z=r&65535;y=e[h+90>>1]|0;h=z+ -1+y|0;z=y+z|0;y=f+32|0;f=f+52|0;D=A;A=0;E=0;a:while(1){C=c[(c[t>>2]|0)+((e[v>>1]|0)+(A&65535)<<2)>>2]|0;B=C>>>24;if((B|0)==0){n=E}else{C=C&16777215;F=0;D=1;while(1){G=c[w>>2]|0;H=F+C|0;F=G+(H<<4)+10|0;b:do{if((b[F>>1]|0)!=0){H=G+(H<<4)|0;I=0;J=0;G=0;while(1){K=c[H>>2]|0;if(K>>>0>(c[u>>2]|0)>>>0){m=13;break a}P=c[x>>2]|0;Q=K+G|0;K=P+(Q*10|0)+4|0;M=b[K>>1]|0;if((M&65535)>=(r&65535)&(M&65535|0)<(z|0)){L=c[l>>2]|0;if(L>>>0<k>>>0){O=d[P+(Q*10|0)+9|0]<<16|e[P+(Q*10|0)+2>>1];N=k-L|0;M=Xf()|0;P=P+(Q*10|0)+7|0;c:do{if((a[P]|0)==0){Q=0}else{Q=0;do{S=(Q+O|0)*3|0;R=c[y>>2]|0;S=(d[R+(S+1)|0]|d[R+(S+2)|0]<<8)<<8|d[R+S|0];R=Q+L|0;T=j+(R<<3)|0;c[T>>2]=c[T>>2]&-268435456|S|33554432;b[j+(R<<3)+4>>1]=~~+_f(M,S);Q=Q+1|0;if(!(Q>>>0<N>>>0)){break c}}while(Q>>>0<(d[P]|0)>>>0)}}while(0);c[l>>2]=(c[l>>2]|0)+Q;M=b[K>>1]|0}K=I+1|0;J=(I|0)==0?G:J}else{K=I}if((M&65535|0)>=(h|0)){break}I=e[F>>1]|0;L=G+1|0;if((G|0)==(I+ -1|0)){break}if(L>>>0<I>>>0){I=K;G=L}else{break b}}if((K|0)!=0){if((e[q>>1]|0)<100?(p=b[f>>1]|0,(p&65535)<600):0){T=(c[t>>2]|0)+((p&65535)<<2)|0;c[T>>2]=c[T>>2]&-16777216|(c[H>>2]|0)+J&16777215;T=(c[t>>2]|0)+(e[f>>1]<<2)|0;c[T>>2]=c[T>>2]&16777215|K<<24;if((E|0)==0){b[(c[s>>2]|0)+(e[q>>1]<<2)>>1]=b[f>>1]|0}b[f>>1]=(b[f>>1]|0)+1<<16>>16}E=E+1|0}}}while(0);F=D&65535;if(!(F>>>0<B>>>0)){break}D=D+1<<16>>16}D=b[g>>1]|0;n=E}A=A+1<<16>>16;if(!((A&65535)<(D&65535))){break}else{E=n}}if((m|0)==13){La(6008,5632,471,5992)}if((n|0)==0){T=0;i=o;return T|0}b[(c[s>>2]|0)+(e[q>>1]<<2)+2>>1]=n;T=b[q>>1]|0;b[q>>1]=T+1<<16>>16;i=o;return T|0}function Af(f,g,h,j,k,l){f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;var m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0;o=i;if((h|0)==0){La(5920,5632,526,6048)}t=g&65535;if(g<<16>>16==0){La(5920,5632,526,6048)}q=f+60|0;if(!((e[q>>1]|0)>(g&65535))){La(5920,5632,526,6048)}s=b[h+88>>1]|0;r=f+56|0;u=c[r>>2]|0;g=u+(t<<2)+2|0;z=b[g>>1]|0;if(z<<16>>16==0){R=0;i=o;return R|0}x=u+(t<<2)|0;t=f+48|0;v=f+16|0;u=s&65535;y=e[h+90>>1]|0;w=u+ -1+y|0;u=y+u|0;y=h+80|0;h=f+32|0;f=f+52|0;C=z;z=0;D=0;a:while(1){B=c[(c[t>>2]|0)+((e[x>>1]|0)+(z&65535)<<2)>>2]|0;A=B>>>24;if((A|0)==0){n=D}else{B=B&16777215;E=0;C=1;while(1){G=c[v>>2]|0;H=E+B|0;F=G+(H*10|0)+6|0;b:do{if((a[F]|0)!=0){E=G+(H*10|0)|0;G=G+(H*10|0)+8|0;I=0;J=0;H=0;while(1){K=b[E>>1]|0;L=a[G]|0;if(K<<16>>16==0&L<<24>>24==0){m=13;break a}P=c[v>>2]|0;R=((L&255)<<16|K&65535)+H|0;K=P+(R*10|0)+4|0;M=b[K>>1]|0;if((M&65535)>=(s&65535)&(M&65535|0)<(u|0)){L=c[l>>2]|0;if(L>>>0<k>>>0){M=d[P+(R*10|0)+9|0]<<16|e[P+(R*10|0)+2>>1];O=k-L|0;Q=b[y>>1]|0;N=Xf()|0;P=P+(R*10|0)+7|0;c:do{if((a[P]|0)==0){R=0}else{Q=((Q&65535)<<24)+16777216&251658240;R=0;do{T=(R+M|0)*3|0;S=c[h>>2]|0;T=(d[S+(T+1)|0]|d[S+(T+2)|0]<<8)<<8|d[S+T|0];S=R+L|0;U=j+(S<<3)|0;c[U>>2]=c[U>>2]&-268435456|Q|T;b[j+(S<<3)+4>>1]=~~+_f(N,T);R=R+1|0;if(!(R>>>0<O>>>0)){break c}}while(R>>>0<(d[P]|0)>>>0)}}while(0);c[l>>2]=(c[l>>2]|0)+R;M=b[K>>1]|0}K=I+1|0;J=(I|0)==0?H:J}else{K=I}if((M&65535|0)>=(w|0)){break}I=d[F]|0;L=H+1|0;if((H|0)==(I+ -1|0)){break}if(L>>>0<I>>>0){I=K;H=L}else{break b}}if((K|0)!=0){if((e[q>>1]|0)<100?(p=b[f>>1]|0,(p&65535)<600):0){U=(c[t>>2]|0)+((p&65535)<<2)|0;c[U>>2]=(d[G]<<16|e[E>>1])+J&16777215|c[U>>2]&-16777216;U=(c[t>>2]|0)+(e[f>>1]<<2)|0;c[U>>2]=c[U>>2]&16777215|K<<24;if((D|0)==0){b[(c[r>>2]|0)+(e[q>>1]<<2)>>1]=b[f>>1]|0}b[f>>1]=(b[f>>1]|0)+1<<16>>16}D=D+1|0}}}while(0);E=C&65535;if(!(E>>>0<A>>>0)){break}C=C+1<<16>>16}C=b[g>>1]|0;n=D}z=z+1<<16>>16;if(!((z&65535)<(C&65535))){break}else{D=n}}if((m|0)==13){La(6064,5632,549,6048)}if((n|0)==0){U=0;i=o;return U|0}b[(c[r>>2]|0)+(e[q>>1]<<2)+2>>1]=n;U=b[q>>1]|0;b[q>>1]=U+1<<16>>16;i=o;return U|0}function Bf(f,g,h,j){f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0;k=i;i=i+16|0;l=k;if(h<<16>>16==0|(g|0)==0){z=0;i=k;return z|0}w=(c[f+12>>2]|0)+(e[(c[f+20>>2]|0)+((e[g>>1]|0)+ -30<<1)>>1]<<4)|0;a:do{if((h&65535)>1){p=f+28|0;o=f+16|0;q=1;r=0;t=0;b:while(1){if((q&65535)<<16>>16==1){s=b[w+10>>1]|0;c:do{if(s<<16>>16==0){u=0}else{x=c[w>>2]|0;w=g+(q<<1)|0;if(x>>>0>(c[p>>2]|0)>>>0){o=10;break b}else{r=0;u=0}while(1){y=c[o>>2]|0;z=x+r|0;r=y+(z*10|0)|0;v=u+1<<16>>16;if((b[y+(z*10|0)+4>>1]|0)==(b[w>>1]|0)){break c}if((v&65535)<(s&65535)){r=v&65535;u=v}else{u=v;break}}}}while(0);if((u&65535)<(s&65535)){w=r}else{n=0;o=28;break}}else{s=a[w+6|0]|0;d:do{if(s<<24>>24==0){y=0}else{v=b[w>>1]|0;u=v<<16>>16==0;w=w+8|0;x=g+(q<<1)|0;y=0;z=0;do{t=a[w]|0;if(u&t<<24>>24==0){o=15;break b}B=c[o>>2]|0;A=((t&255)<<16|v&65535)+y|0;t=B+(A*10|0)|0;z=z+1<<16>>16;if((b[B+(A*10|0)+4>>1]|0)==(b[x>>1]|0)){break d}y=z&65535}while(y>>>0<(s&255)>>>0)}}while(0);if(y>>>0<(s&255)>>>0){w=t}else{n=0;o=28;break}}q=q+1|0;if(!((q&65535)<(h&65535))){m=w;break a}}if((o|0)==10){La(6120,5632,613,6168)}else if((o|0)==15){La(6184,5632,629,6168)}else if((o|0)==28){i=k;return n|0}}else{m=w}}while(0);if(h<<16>>16==1){B=b[m+12>>1]|0;n=B&65535;m=m+4|0;if(B<<16>>16==0){B=0;i=k;return B|0}h=f+32|0;o=0;while(1){B=((c[m>>2]|0)+o|0)*3|0;A=c[h>>2]|0;B=(d[A+(B+1)|0]|d[A+(B+2)|0]<<8)<<8|d[A+B|0];Vc[c[(c[f>>2]|0)+32>>2]&31](f,B,l,2)|0;o=o+1|0;if((B|0)==(j|0)){n=1;o=28;break}if(!(o>>>0<n>>>0)){n=0;o=28;break}}if((o|0)==28){i=k;return n|0}}else{B=a[m+7|0]|0;l=B&255;if(B<<24>>24==0){B=0;i=k;return B|0}m=d[m+9|0]<<16|e[m+2>>1];f=c[f+32>>2]|0;n=0;while(1){B=(m+n|0)*3|0;n=n+1|0;if(((d[f+(B+1)|0]|d[f+(B+2)|0]<<8)<<8|d[f+B|0]|0)==(j|0)){n=1;o=28;break}if(!(n>>>0<l>>>0)){n=0;o=28;break}}if((o|0)==28){i=k;return n|0}}return 0}function Cf(f,g,h,j,k){f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0;l=i;i=i+1616|0;y=l+800|0;v=l+1600|0;o=h&65535;if((h&65535)>8){N=0;i=l;return N|0}w=f+12|0;N=c[w>>2]|0;c[y>>2]=N;if((N|0)==0|h<<16>>16==0){N=0;i=l;return N|0}r=f+8|0;s=f+20|0;t=f+28|0;u=f+16|0;A=0;z=1;m=0;n=l;G=0;a:while(1){while(1){H=g+(G<<1)|0;N=b[H>>1]|0;b[v>>1]=N;if(mg(c[r>>2]|0,N)|0){H=sg(c[r>>2]|0,b[H>>1]|0,v)|0;if(H<<16>>16==0){I=7;break a}}else{H=1}if((G|0)==1){I=12;break}else if((G|0)!=0){I=9;break}if((z|0)==0){x=0;I=66;break a}G=b[v>>1]|0;J=G&65535;M=H&65535;H=J+M|0;I=M+ -1+J|0;K=c[y>>2]|0;if(!((K|0)==(c[w>>2]|0)&(z|0)==1)){I=15;break a}N=c[s>>2]|0;L=b[N+(J+ -30<<1)>>1]|0;N=b[N+(M+ -30+J<<1)>>1]|0;J=N&65535;if(!((L&65535)<(N&65535))){x=0;I=66;break a}K=(c[K>>2]|0)==1;z=0;L=L&65535;do{if(!K){I=19;break a}M=c[w>>2]|0;N=b[M+(L<<4)+8>>1]|0;if((N&65535)<(G&65535)){I=22;break a}N=N&65535;if((N|0)>=(H|0)){I=22;break a}if(z>>>0<200){c[n+(z<<2)>>2]=M+(L<<4);z=z+1|0}L=L+1|0}while((N|0)<(I|0)&L>>>0<J>>>0);if((h&65535)<2|(z|0)==0){q=z;p=1;I=52;break a}N=n;n=0;G=1;m=y;y=N}if((I|0)==9){if((z|0)==0){x=0;I=66;break}D=H&65535;B=D+ -1|0;C=0;E=0;do{I=c[A+(C<<2)>>2]|0;H=I+6|0;b:do{if((a[H]|0)!=0){F=I+8|0;I=b[I>>1]|0;L=0;do{J=a[F]|0;if(I<<16>>16==0&J<<24>>24==0){I=45;break a}N=c[u>>2]|0;O=((J&255)<<16|I&65535)+L|0;M=N+(O*10|0)|0;O=b[N+(O*10|0)+4>>1]|0;N=b[v>>1]|0;K=O&65535;J=N&65535;if(!((O&65535)<(N&65535))?(K|0)<(J+D|0)&E>>>0<200:0){c[m+(E<<2)>>2]=M;E=E+1|0}L=L+1|0;if((K|0)>=(B+J|0)){break b}}while(L>>>0<(d[H]|0)>>>0)}}while(0);C=C+1|0}while(C>>>0<z>>>0);F=G+1|0;if(F>>>0>=o>>>0|(E|0)==0){q=E;p=F;I=52;break}else{B=y;C=A;D=n}}else if((I|0)==12){if((z|0)==0){x=0;I=66;break}A=b[v>>1]|0;B=A&65535;D=H&65535;C=D+ -1+B|0;D=B+D|0;B=0;E=0;do{G=c[y+(B<<2)>>2]|0;F=b[G+10>>1]|0;c:do{if(!(F<<16>>16==0)){H=c[G>>2]|0;G=H>>>0>(c[t>>2]|0)>>>0;J=0;do{if(G){I=32;break a}I=c[u>>2]|0;O=H+J|0;K=I+(O*10|0)|0;O=b[I+(O*10|0)+4>>1]|0;I=O&65535;if(!((O&65535)<(A&65535))?(I|0)<(D|0)&E>>>0<200:0){c[m+(E<<2)>>2]=K;E=E+1|0}J=J+1|0;if((I|0)>=(C|0)){break c}}while(J>>>0<(F&65535)>>>0)}}while(0);B=B+1|0}while(B>>>0<z>>>0);if((h&65535)<3|(E|0)==0){q=E;p=2;I=52;break}B=0;C=y;D=0;F=2}if(F>>>0<o>>>0){A=m;y=B;z=E;m=C;n=D;G=F}else{x=0;I=66;break}}if((I|0)==7){La(6248,5632,693,6264)}else if((I|0)==15){La(6280,5632,700,6264)}else if((I|0)==19){La(5832,5632,705,6264)}else if((I|0)==22){La(6320,5632,708,6264)}else if((I|0)==32){La(6008,5632,734,6264)}else if((I|0)==45){La(6064,5632,765,6264)}else if((I|0)==52){if((q|0)==0){O=0;i=l;return O|0}s=Xf()|0;if(h<<16>>16==1?pg(c[r>>2]|0,b[g>>1]|0)|0:0){q=1}else{if((q|0)==0){O=0;i=l;return O|0}}p=p>>>0<2;r=f+32|0;f=k+ -1|0;o=o<<24&251658240;x=0;h=0;while(1){if(p){g=c[n+(h<<2)>>2]|0;O=b[g+12>>1]|0;t=O&65535;if(!(O<<16>>16==0)){g=g+4|0;u=0;do{O=u+x|0;N=((c[g>>2]|0)+u|0)*3|0;M=c[r>>2]|0;N=(d[M+(N+1)|0]|d[M+(N+2)|0]<<8)<<8|d[M+N|0];M=j+(O<<3)|0;c[M>>2]=c[M>>2]&-268435456|N|16777216;b[j+(O<<3)+4>>1]=~~+_f(s,N);u=u+1|0}while(O>>>0<f>>>0&u>>>0<t>>>0)}}else{u=c[m+(h<<2)>>2]|0;O=a[u+7|0]|0;t=O&255;if(!(O<<24>>24==0)){g=u+2|0;u=u+9|0;v=0;do{O=v+x|0;N=((d[u]<<16|e[g>>1])+v|0)*3|0;M=c[r>>2]|0;N=(d[M+(N+1)|0]|d[M+(N+2)|0]<<8)<<8|d[M+N|0];M=j+(O<<3)|0;c[M>>2]=c[M>>2]&-268435456|o|N;b[j+(O<<3)+4>>1]=~~+_f(s,N);v=v+1|0}while(O>>>0<f>>>0&v>>>0<t>>>0)}}x=t+x|0;h=h+1|0;if(!(x>>>0<k>>>0)){x=k;I=66;break}if(!(h>>>0<q>>>0)){I=66;break}}if((I|0)==66){i=l;return x|0}}else if((I|0)==66){i=l;return x|0}return 0}function Df(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;var f=0;f=i;a=mf(c[a+4>>2]|0,b,d,e)|0;i=f;return a|0}function Ef(a,d,e,f,g){a=a|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0;h=i;i=i+128|0;n=h+104|0;k=h+24|0;l=h;j=Vc[c[(c[a>>2]|0)+32>>2]&31](a,d,n,9)|0;if(!(j<<16>>16==f<<16>>16|((j&65535)>(f&65535)|g)^1)){La(6392,5632,858,6456)}b[l>>1]=0;f=j<<16>>16==0;if(!f){p=a+8|0;q=a+4|0;r=0;s=0;o=1;do{if(g){t=e+(s<<1)|0;u=ng(c[p>>2]|0,b[t>>1]|0)|0;t=b[t>>1]|0;if(u){b[k+((r&65535)<<1)>>1]=t;t=1}else{m=10}}else{t=0;m=10}if((m|0)==10){m=0;u=r&65535;t=nf(c[q>>2]|0,b[n+(s<<1)>>1]|0,t,k+(u<<1)|0,40-u&65535)|0;if(t<<16>>16==0){m=11;break}}u=t&65535;r=(r&65535)+u&65535;s=s+1|0;b[l+(s<<1)>>1]=r;o=ea(u,o&65535)|0}while((s&65535)<(j&65535));if((m|0)==11){La(6480,5632,874,6456)}m=o&65535;if(m<<16>>16==0){u=0;i=h;return u|0}}else{m=1}n=0;while(1){a:do{if(!f){r=b[l>>1]|0;q=0;p=1;while(1){o=q+1|0;s=b[l+(o<<1)>>1]|0;u=r&65535;g=(s&65535)-u&65535;b[e+(q<<1)>>1]=b[k+(((((n>>>0)/(p>>>0)|0)>>>0)%(g>>>0)|0)+u<<1)>>1]|0;if((o&65535)<<16>>16==j<<16>>16){break a}r=s;q=o;p=(ea(g,p)|0)&65535}}}while(0);n=n+1|0;if(Bf(a,e,j,d)|0){m=19;break}if(!((n&65535)<(m&65535))){j=0;m=19;break}}if((m|0)==19){i=h;return j|0}return 0}function Ff(a,b){a=a|0;b=b|0;a=i;Zf(Xf()|0,b);i=a;return}function Gf(a,b,d){a=a|0;b=b|0;d=d|0;var e=0;e=i;if((b|0)==0|(d&65535)>8){d=0;i=e;return d|0}d=of(c[a+4>>2]|0,b,d)|0;i=e;return d|0}function Hf(a,e,f,h,j){a=a|0;e=e|0;f=f|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0;j=i;n=Xf()|0;l=a+44|0;m=(((c[a+36>>2]|0)>>>0)/3|0)-(c[l>>2]|0)|0;k=a+32|0;a=a+4|0;if((h|0)==0){s=0;i=j;return s|0}o=e&65535;p=f;e=f+4|0;r=0;q=0;a:while(1){do{if(!(q>>>0<(c[l>>2]|0)>>>0)){f=7;break a}c[p+0>>2]=0;c[p+4>>2]=0;c[p+8>>2]=0;c[p+12>>2]=0;c[p+16>>2]=0;s=(m+q|0)*3|0;t=c[k>>2]|0;s=(d[t+(s+1)|0]|0|(d[t+(s+2)|0]|0)<<8)<<8|(d[t+s|0]|0);q=q+1|0}while((mf(c[a>>2]|0,s,e,7)|0)<<16>>16==0);g[p>>2]=+_f(n,s);b[f+(r*20|0)+18>>1]=o;r=r+1|0;if(r>>>0<h>>>0){p=f+(r*20|0)|0;e=f+(r*20|0)+4|0}else{f=7;break}}if((f|0)==7){i=j;return r|0}return 0}function If(a,b,d,e,f,g){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0;h=i;a=lf(c[a+4>>2]|0,b,d,e,f,g)|0;i=h;return a|0}function Jf(a){a=a|0;return 1}function Kf(a){a=a|0;return 0}function Lf(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;return 0}function Mf(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;return 0}function Nf(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;return 0}function Of(a,b){a=a|0;b=b|0;return 0}function Pf(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;return 0}function Qf(a,b){a=a|0;b=b|0;return 0}function Rf(a){a=a|0;return 0}function Sf(a){a=a|0;return}function Tf(){var a=0,d=0,e=0,f=0;a=i;d=c[1648]|0;if((d|0)!=0){f=d;i=a;return f|0}d=Wq(8)|0;f=Xq(3600)|0;c[d>>2]=f;e=Xq(60)|0;c[d+4>>2]=e;if((f|0)==0){La(6600,6624,27,6648)}if((e|0)==0){La(6664,6624,28,6648)}f=e+0|0;e=f+60|0;do{b[f>>1]=0;f=f+2|0}while((f|0)<(e|0));c[1648]=d;if((d|0)==0){La(6688,6624,44,6712)}else{f=d;i=a;return f|0}return 0}function Uf(a,d){a=a|0;d=d|0;var e=0;e=i;if((d&65535)>29){d=0;i=e;return d|0}d=(b[(c[a+4>>2]|0)+((d&65535)<<1)>>1]|0)!=0;i=e;return d|0}function Vf(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0;e=i;nq(a,b,c,d);i=e;return}function Wf(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;var f=0;f=i;a=mq(a,b,c,d,e)|0;i=f;return a|0}function Xf(){var b=0,d=0;b=i;d=c[1682]|0;if((d|0)!=0){i=b;return d|0}d=Wq(24)|0;a[d]=0;c[d+4>>2]=0;c[d+20>>2]=0;g[d+12>>2]=0.0;c[d+16>>2]=0;c[1682]=d;i=b;return d|0}function Yf(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0;e=i;if((d|0)!=0?(a[b]=0,f=b+4|0,(Ya(f|0,4,1,d|0)|0)==1):0){g=b+20|0;h=c[g>>2]|0;if((h|0)!=0){Sq(h)}h=b+16|0;j=c[h>>2]|0;if((j|0)!=0){Sq(j)}k=Rq(c[f>>2]|0)|0;c[g>>2]=k;j=Rq(512)|0;c[h>>2]=j;if((!((k|0)==0|(j|0)==0)?(Ya(j|0,2,256,d|0)|0)==256:0)?(k=Ya(c[g>>2]|0,1,c[f>>2]|0,d|0)|0,(k|0)==(c[f>>2]|0)):0){a[b]=1;c[b+8>>2]=0;b=1}else{b=0}}else{b=0}i=e;return b|0}function Zf(a,b){a=a|0;b=b|0;var d=0;d=i;c[a+8>>2]=b;if((b|0)==0){g[a+12>>2]=0.0;i=d;return}else{g[a+12>>2]=+ca(+(1.0e8/+((b+1e8|0)>>>0)))*-800.0;i=d;return}}function _f(a,b){a=a|0;b=b|0;return+(+(e[(c[a+16>>2]|0)+((d[(c[a+20>>2]|0)+b|0]|0)<<1)>>1]|0)+ +g[a+12>>2])}function $f(a,c){a=a|0;c=c|0;a=b[a>>1]|0;c=b[c>>1]|0;if((a&65535)<(c&65535)){c=-1}else{c=(a&65535)>(c&65535)|0}return c|0}function ag(a,b){a=a|0;b=b|0;var c=0;c=i;a=Ag(a,b,2)|0;i=c;return a|0}function bg(a,b){a=a|0;b=b|0;var c=0;c=i;a=Ag(a,b,3)|0;i=c;return a|0}function cg(a,b){a=a|0;b=b|0;var c=0;c=i;a=Ag(a,b,4)|0;i=c;return a|0}function dg(a,b){a=a|0;b=b|0;var c=0;c=i;a=Ag(a,b,5)|0;i=c;return a|0}function eg(a,b){a=a|0;b=b|0;var c=0;c=i;a=Ag(a,b,6)|0;i=c;return a|0}function fg(a,b){a=a|0;b=b|0;var c=0;c=i;a=Ag(a,b,7)|0;i=c;return a|0}function gg(a,b){a=a|0;b=b|0;var c=0;c=i;a=Ag(a,b,8)|0;i=c;return a|0}function hg(a,c){a=a|0;c=c|0;var d=0,e=0,f=0,h=0.0,j=0.0;d=i;f=b[a+18>>1]|0;e=b[c+18>>1]|0;if(!((f&65535)<(e&65535))){if(!((f&65535)>(e&65535))){h=+g[a>>2];j=+g[c>>2];if(h>j){c=1}else{c=(h<j)<<31>>31}}else{c=-1}}else{c=1}i=d;return c|0}function ig(a,b){a=a|0;b=b|0;var c=0,d=0,e=0.0,f=0.0;c=i;d=Ag(a+4|0,b+4|0,7)|0;if((d|0)==0){e=+g[a>>2];f=+g[b>>2];if(e>f){d=1}else{d=(e<f)<<31>>31}}i=c;return d|0}function jg(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0,h=0;d=i;if((a|0)==0|(b|0)==0){g=0;i=d;return g|0}Vf(a,b,20,41);if(b>>>0>1){e=1;f=1}else{g=1;i=d;return g|0}do{g=a+(e*20|0)|0;if((Ag(a+(e*20|0)+4|0,a+((f+ -1|0)*20|0)+4|0,7)|0)!=0){if((f|0)!=(e|0)){h=a+(f*20|0)|0;c[h+0>>2]=c[g+0>>2];c[h+4>>2]=c[g+4>>2];c[h+8>>2]=c[g+8>>2];c[h+12>>2]=c[g+12>>2];c[h+16>>2]=c[g+16>>2]}f=f+1|0}e=e+1|0}while((e|0)!=(b|0));i=d;return f|0}function kg(a){a=a|0;return a+3&-4|0}function lg(a,b){a=a|0;b=b|0;var c=0;c=i;a=nr(a,b)|0;i=c;return a|0}function mg(a,b){a=a|0;b=b|0;return(b&65535)<30&b<<16>>16!=0|0}function ng(a,b){a=a|0;b=b|0;var d=0;d=i;if((b&65535)<30){i=d;return 0}else{i=d;return(b&65535)>>>0<((c[a+8>>2]|0)+30|0)>>>0|0}return 0}function og(d,e,f){d=d|0;e=e|0;f=f|0;var g=0,h=0;g=i;if(((c[d+44>>2]|0)!=0?(h=f&65535,!((f&65535)<30)):0)?!(h>>>0>((c[d+8>>2]|0)+30|0)>>>0):0){d=b[(c[d+280>>2]|0)+(h+ -30<<1)>>1]|0}else{d=0}if(d<<16>>16==e<<16>>16){h=1;i=g;return h|0}h=(a[6744+(d&65535)|0]&-33|0)==(a[6744+(e&65535)|0]|0);i=g;return h|0}function pg(b,c){b=b|0;c=c|0;var d=0;b=i;d=c&65535;if(c<<16>>16==0|(c&65535)>29){d=0;i=b;return d|0}if((538968080>>>d&1|0)!=0){d=0;i=b;return d|0}d=(a[6776+((a[6744+d|0]|0)+ -65)|0]&2)!=0;i=b;return d|0}function qg(){var b=0,d=0,e=0,f=0,g=0;b=i;d=c[1684]|0;if((d|0)!=0){g=d;i=b;return g|0}d=Wq(284)|0;c[d>>2]=0;c[d+4>>2]=0;c[d+8>>2]=0;c[d+20>>2]=0;e=d+36|0;c[e+0>>2]=0;c[e+4>>2]=0;c[e+8>>2]=0;c[e+12>>2]=0;c[e+16>>2]=0;c[1684]=0;c[d+24>>2]=0;c[d+280>>2]=0;e=65;while(1){f=6776+(e+ -65)|0;g=a[f]|0;if(!((g&1)==0)){a[f]=g&255|4}e=e+1|0;if((e&255)<<24>>24==91){e=65;break}}do{f=6776+(e+ -65)|0;g=a[f]|0;if(!((g&2)==0)){a[f]=g&255|4}e=e+1|0}while(!((e&255)<<24>>24==91));c[1684]=d;g=d;i=b;return g|0}function rg(){var b=0,d=0,e=0,f=0,g=0;b=i;d=c[1684]|0;if((d|0)!=0){g=d;i=b;return g|0}d=Wq(284)|0;c[d>>2]=0;c[d+4>>2]=0;c[d+8>>2]=0;c[d+20>>2]=0;e=d+36|0;c[e+0>>2]=0;c[e+4>>2]=0;c[e+8>>2]=0;c[e+12>>2]=0;c[e+16>>2]=0;c[1684]=0;c[d+24>>2]=0;c[d+280>>2]=0;e=65;do{f=6776+(e+ -65)|0;g=a[f]|0;if(!((g&1)==0)){a[f]=g&255|4}e=e+1|0}while(!((e&255)<<24>>24==91));e=65;do{f=6776+(e+ -65)|0;g=a[f]|0;if(!((g&2)==0)){a[f]=g&255|4}e=e+1|0}while(!((e&255)<<24>>24==91));c[1684]=d;g=d;i=b;return g|0}function sg(a,d,e){a=a|0;d=d|0;e=e|0;var f=0,g=0;f=i;if(((e|0)!=0?(c[a+44>>2]|0)!=0:0)?(g=d&65535,!((d&65535)>29)):0){b[e>>1]=b[a+(g<<1)+160>>1]|0;a=b[a+(g<<1)+220>>1]|0}else{a=0}i=f;return a|0}function tg(d,e,f,h,j,k){d=d|0;e=e|0;f=f|0;h=h|0;j=+j;k=k|0;var l=0,m=0,n=0,o=0;l=i;if((e|0)==0){o=0;i=l;return o|0}m=d+160|0;n=m+0|0;o=n+120|0;do{b[n>>1]=0;n=n+2|0}while((n|0)<(o|0));n=c[d>>2]|0;do{if((n|0)!=(e|0)){if((n|0)!=0){Zq(n)}n=ea(h,f)|0;o=Xq(n)|0;c[d>>2]=o;if((o|0)==0){o=0;i=l;return o|0}else{ur(o|0,e|0,n|0)|0;break}}}while(0);n=d+4|0;c[n>>2]=f;e=d+8|0;c[e>>2]=h;g[d+12>>2]=j;h=d+16|0;a[h]=k;k=d+36|0;o=c[k>>2]|0;if((o|0)!=0){Zq(o);f=c[n>>2]|0}o=Xq(f)|0;c[k>>2]=o;if((o|0)==0){o=0;i=l;return o|0}k=d+40|0;o=c[k>>2]|0;if((o|0)!=0){Zq(o);f=c[n>>2]|0}o=Xq(f>>>0>2147483647?-1:f<<1)|0;c[k>>2]=o;if((o|0)==0){o=0;i=l;return o|0}nq(c[d>>2]|0,c[e>>2]|0,f,42);k=Wq(8)|0;f=d+44|0;c[f>>2]=k;n=k;c[n>>2]=0;c[n+4>>2]=0;n=Wq(8)|0;c[d+48>>2]=n;o=n;c[o>>2]=0;c[o+4>>2]=0;o=a[h]|0;a[n+7|0]=o;n=Wq(8)|0;c[d+52>>2]=n;h=n;c[h>>2]=0;c[h+4>>2]=0;a[n+7|0]=o;n=d+56|0;o=n+104|0;do{c[n>>2]=0;n=n+4|0}while((n|0)<(o|0));o=ug(d,0,c[e>>2]|0,0,k)|0;c[c[f>>2]>>2]=o;a[(c[f>>2]|0)+7|0]=0;if((c[c[f>>2]>>2]|0)==0){o=0;i=l;return o|0}b[d+220>>1]=0;b[m>>1]=0;f=d+280|0;m=c[f>>2]|0;if((m|0)!=0){Zq(m)}m=c[e>>2]|0;m=Xq(m>>>0>2147483647?-1:m<<1)|0;c[f>>2]=m;if((m|0)==0){o=0;i=l;return o|0}else{e=0}while(1){k=b[d+(e<<1)+160>>1]|0;h=b[d+(e<<1)+220>>1]|0;if(!(h<<16>>16==0)){o=k&65535;f=e&65535;n=(h&65535)+o|0;h=o;do{b[m+(h+ -30<<1)>>1]=f;k=k+1<<16>>16;h=k&65535}while((h|0)<(n|0))}e=e+1|0;if((e&65535)<<16>>16==30){d=1;break}}i=l;return d|0}function ug(d,e,f,g,h){d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0;j=i;s=d+4|0;D=c[s>>2]|0;if(f>>>0<=e>>>0|D>>>0<=g>>>0|(h|0)==0){K=0;i=j;return K|0}y=c[d>>2]|0;x=ea(D,e)|0;v=y+(x+g)|0;q=a[v]|0;if(!(q<<24>>24>64)){La(6840,6808,439,6920)}if(!(q<<24>>24<91|q<<24>>24==104)){La(6840,6808,439,6920)}z=e+1|0;w=z>>>0<f>>>0;if(w){A=z;u=0;while(1){r=a[y+((ea(D,A)|0)+g)|0]|0;u=(r<<24>>24!=q<<24>>24)+u<<16>>16;A=A+1|0;if((A|0)==(f|0)){break}else{q=r}}r=u+1<<16>>16}else{r=1}u=r&65535;F=u<<3;q=Xq(F)|0;wr(q|0,0,F|0)|0;F=y+x|0;B=a[v]|0;v=g+1|0;H=(a[y+(x+v)|0]|0)==0;a:do{if(w){w=(g|0)==0;x=(g|0)==1;E=-1;A=0;while(1){D=ea(D,z)|0;C=y+D|0;G=a[y+(D+g)|0]|0;if(!((G+ -97<<24>>24&255)<26|(G+ -65<<24>>24&255)<26)){break}I=B<<24>>24;if(G<<24>>24==B<<24>>24){C=F}else{J=q+(A<<3)|0;a[q+(A<<3)+6|0]=B;if(w){c[d+(I+ -65<<2)+56>>2]=J}if(H){K=q+(A<<3)+4|0;b[K>>1]=b[K>>1]&-2048|e+30&2047}H=(a[F+v|0]|0)==0;do{if(H){if(!((z-e|0)>>>0>1)){c[J>>2]=0;H=a[F+((c[s>>2]|0)+ -1)|0]|0;a[q+(A<<3)+7|0]=H;break}c[J>>2]=ug(d,(H&1)+e|0,z,v,J)|0;if(H){H=a[F+((c[s>>2]|0)+ -1)|0]|0;J=q+(A<<3)+7|0;K=a[J]|0;if((H&255)<(K&255)){a[J]=H}else{H=K}}else{m=21}}else{c[J>>2]=ug(d,(H&1)+e|0,z,v,J)|0;m=21}}while(0);if((m|0)==21){H=a[q+(A<<3)+7|0]|0}E=(H&255)<(E&255)?H:E;if(w?!((a[6776+(I+ -65)|0]&3)==0):0){K=q+(A<<3)+4|0;m=((I+1984&65535)+(B<<24>>24>67)<<16>>16)+(B<<24>>24>83)<<16>>16&2047;B=b[K>>1]&-2048|m;b[K>>1]=B;b[d+((m&65535)<<1)+220>>1]=z-e;m=33}else{m=28}do{if((m|0)==28?(m=0,x&B<<24>>24==104):0){B=a[F]|0;if(B<<24>>24==67){m=4}else if(!(B<<24>>24==83)){if(B<<24>>24==90){m=29}else{break}}else{m=21}K=q+(A<<3)+4|0;B=b[K>>1]&-2048|m;b[K>>1]=B;b[d+((m&65535)<<1)+220>>1]=z-e;m=33}}while(0);do{if((m|0)==33){m=0;B=B&2047;if((b[d+(B<<1)+220>>1]|0)==0){b[d+(B<<1)+160>>1]=0;break}else{b[d+(B<<1)+160>>1]=e+30;break}}}while(0);B=G;e=z;A=A+1|0;H=(a[y+(D+v)|0]|0)==0}z=z+1|0;if(!(z>>>0<f>>>0)){n=B;k=e;p=E;l=A;t=H;o=C;break a}D=c[s>>2]|0;y=c[d>>2]|0;F=C}La(6952,6808,474,6920)}else{n=B;k=e;p=-1;l=0;t=H;o=F}}while(0);x=q+(l<<3)|0;a[q+(l<<3)+6|0]=n;w=(g|0)==0;if(w){c[d+((n<<24>>24)+ -65<<2)+56>>2]=x}if(t){K=q+(l<<3)+4|0;b[K>>1]=b[K>>1]&-2048|k+30&2047}t=(a[o+v|0]|0)==0;do{if(t){if(!((f-k|0)>>>0>1)){c[x>>2]=0;s=a[o+((c[s>>2]|0)+ -1)|0]|0;a[q+(l<<3)+7|0]=s;break}c[x>>2]=ug(d,(t&1)+k|0,f,v,x)|0;if(t){s=a[o+((c[s>>2]|0)+ -1)|0]|0;t=q+(l<<3)+7|0;v=a[t]|0;if((s&255)<(v&255)){a[t]=s}else{s=v}}else{m=47}}else{c[x>>2]=ug(d,(t&1)+k|0,f,v,x)|0;m=47}}while(0);if((m|0)==47){s=a[q+(l<<3)+7|0]|0}p=(s&255)<(p&255)?s:p;if((l+1|0)!=(u|0)){La(6984,6808,598,6920)}do{if(w){o=n<<24>>24;if(!((a[6776+(o+ -65)|0]&4)==0)){K=q+(l<<3)+4|0;m=((o+1984&65535)+(n<<24>>24>67)<<16>>16)+(n<<24>>24>83)<<16>>16&2047;l=b[K>>1]&-2048|m;b[K>>1]=l;b[d+((m&65535)<<1)+220>>1]=f-k;m=61}}else{if((g|0)==1&n<<24>>24==104){n=a[o]|0;if(n<<24>>24==83){m=21}else if(!(n<<24>>24==67)){if(n<<24>>24==90){m=29}else{break}}else{m=4}K=q+(l<<3)+4|0;l=b[K>>1]&-2048|m;b[K>>1]=l;b[d+((m&65535)<<1)+220>>1]=f-k;m=61}}}while(0);do{if((m|0)==61){l=l&2047;if((b[d+(l<<1)+220>>1]|0)==0){b[d+(l<<1)+160>>1]=0;break}else{b[d+(l<<1)+160>>1]=k+30;break}}}while(0);K=h+4|0;b[K>>1]=b[K>>1]&2047|r<<11&65535;a[h+7|0]=p;K=q;i=j;return K|0}function vg(b,d){b=b|0;d=d|0;var e=0,f=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0;e=i;if(((((d|0)!=0?(l=b+4|0,(Ya(l|0,4,1,d|0)|0)==1):0)?(f=b+8|0,(Ya(f|0,4,1,d|0)|0)==1):0)?(k=b+12|0,(Ya(k|0,4,1,d|0)|0)==1):0)?(j=b+16|0,(Ya(j|0,1,1,d|0)|0)==1):0){m=c[b>>2]|0;if((m|0)!=0){Zq(m)}n=c[l>>2]|0;m=c[f>>2]|0;o=Xq(ea(m,n)|0)|0;c[b>>2]=o;if((o|0)!=0?(h=Ya(o|0,n|0,m|0,d|0)|0,(h|0)==(c[f>>2]|0)):0){f=tg(b,c[b>>2]|0,c[l>>2]|0,h,+g[k>>2],a[j]|0)|0}else{f=0}}else{f=0}i=e;return f|0}function wg(a){a=a|0;return c[a+8>>2]|0}function xg(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0;e=i;i=i+16|0;g=e;f=b+36|0;a[c[f>>2]|0]=0;if((d&65535)>29){j=c[f>>2]|0;h=c[b+4>>2]|0;c[g>>2]=(c[b>>2]|0)+(ea(h,(d&65535)+65506&65535)|0);Tb(j|0,h|0,7016,g|0)|0;b=c[f>>2]|0;i=e;return b|0}if(d<<16>>16==4){h=c[f>>2]|0;j=c[b+4>>2]|0;c[g>>2]=7024;Tb(h|0,j|0,7016,g|0)|0;j=c[f>>2]|0;i=e;return j|0}else if(d<<16>>16==21){h=c[f>>2]|0;j=c[b+4>>2]|0;c[g>>2]=7032;Tb(h|0,j|0,7016,g|0)|0;j=c[f>>2]|0;i=e;return j|0}else if(d<<16>>16==29){h=c[f>>2]|0;j=c[b+4>>2]|0;c[g>>2]=7040;Tb(h|0,j|0,7016,g|0)|0;j=c[f>>2]|0;i=e;return j|0}else{j=(((d&65535)>3)<<31>>31)+d<<16>>16;a[c[f>>2]|0]=((((j&65535)>19)<<31>>31)+j<<16>>16&65535)+64;a[(c[f>>2]|0)+1|0]=0;j=c[f>>2]|0;i=e;return j|0}return 0}function yg(a){a=a|0;var b=0;b=i;c[a>>2]=qg()|0;i=b;return}function zg(a){a=a|0;var c=0,d=0;c=i;if((a|0)==0){d=0;i=c;return d|0}else{d=0}while(1){if((b[a+(d<<1)>>1]|0)==0){break}else{d=d+1|0}}i=c;return d|0}function Ag(a,c,d){a=a|0;c=c|0;d=d|0;var f=0,g=0,h=0,j=0;f=i;a:do{if((d|0)==0){g=0}else{g=0;while(1){j=b[a+(g<<1)>>1]|0;h=g+1|0;if(!(j<<16>>16==(b[c+(g<<1)>>1]|0)&j<<16>>16!=0)){break a}if(h>>>0<d>>>0){g=h}else{g=h;break}}}}while(0);if((g|0)==(d|0)){j=0;i=f;return j|0}j=(e[a+(g<<1)>>1]|0)-(e[c+(g<<1)>>1]|0)|0;i=f;return j|0}function Bg(a,c,d){a=a|0;c=c|0;d=d|0;var e=0,f=0,g=0;e=i;a:do{if(!((c|0)==0|(a|0)==0|(d|0)==0)){if((c|0)==(a|0)){a=c}else{if(!(a>>>0<c>>>0)){if(!(a>>>0>c>>>0)){break}if((c+(d<<1)|0)>>>0>a>>>0){break}else{f=a}}else{f=a}while(1){if((d|0)==0){break a}g=b[c>>1]|0;b[f>>1]=g;if(g<<16>>16==0){break}else{d=d+ -1|0;c=c+2|0;f=f+2|0}}}}else{a=0}}while(0);i=e;return a|0}function Cg(d){d=d|0;var e=0,f=0,g=0;e=i;a[d]=0;c[d+4>>2]=qg()|0;c[d+12>>2]=0;c[d+16>>2]=0;c[d+20>>2]=0;c[d+88>>2]=0;c[d+96>>2]=0;c[d+100>>2]=0;c[d+104>>2]=0;g=d+72|0;b[d+92>>1]=0;f=d+8|0;c[g+0>>2]=0;c[g+4>>2]=0;c[g+8>>2]=0;b[g+12>>1]=0;a[f]=1;a[d+728|0]=0;c[d+24>>2]=39;c[d+28>>2]=40;i=e;return}function Dg(a){a=a|0;var b=0,d=0,e=0,f=0,g=0,h=0;d=i;b=a+12|0;e=c[b>>2]|0;if((e|0)!=0){Lc[c[(c[e>>2]|0)+4>>2]&255](e)}e=a+16|0;f=c[e>>2]|0;if((f|0)!=0){Lc[c[(c[f>>2]|0)+4>>2]&255](f)}f=a+20|0;g=c[f>>2]|0;if((g|0)!=0){Yq(g)}g=a+76|0;h=c[g>>2]|0;if((h|0)!=0){Zq(h)}c[b>>2]=0;c[e>>2]=0;c[f>>2]=0;c[g>>2]=0;c[a+80>>2]=0;c[a+88>>2]=0;c[a+96>>2]=0;c[a+100>>2]=0;c[a+104>>2]=0;i=d;return}function Eg(a){a=a|0;var b=0,d=0,e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0;d=i;b=a+12|0;e=c[b>>2]|0;if((e|0)!=0){Lc[c[(c[e>>2]|0)+4>>2]&255](e)}e=a+16|0;f=c[e>>2]|0;if((f|0)!=0){Lc[c[(c[f>>2]|0)+4>>2]&255](f)}f=a+20|0;g=c[f>>2]|0;if((g|0)!=0){Yq(g)}g=a+76|0;h=c[g>>2]|0;if((h|0)!=0){Zq(h)}c[b>>2]=0;c[e>>2]=0;c[f>>2]=0;c[g>>2]=0;r=a+80|0;c[r>>2]=0;o=a+88|0;c[o>>2]=0;q=a+96|0;c[q>>2]=0;j=a+100|0;c[j>>2]=0;m=a+104|0;c[m>>2]=0;n=Wq(64)|0;qf(n);c[b>>2]=n;n=Wq(1132)|0;Kg(n);c[e>>2]=n;n=Wq(4)|0;yg(n);c[f>>2]=n;n=(kg(3200)|0)>>>2;p=(kg(9600)|0)>>>2;l=(kg(480)|0)>>>2;p=p+n|0;l=p+l|0;h=l+((kg(92)|0)>>>2)|0;k=Xq(h>>>0>1073741823?-1:h<<2)|0;c[g>>2]=k;if((c[b>>2]|0)==0){r=0;i=d;return r|0}if((c[e>>2]|0)==0){r=0;i=d;return r|0}if((c[f>>2]|0)==0|(k|0)==0){r=0;i=d;return r|0}c[r>>2]=k;c[o>>2]=k+(n<<2);c[q>>2]=k+(p<<2);c[j>>2]=k+(l<<2);c[m>>2]=k;c[a+108>>2]=(h<<2>>>0)/20|0;r=1;i=d;return r|0}function Fg(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0;f=i;if((d|0)==0|(e|0)==0){d=0;i=f;return d|0}if(!(Eg(b)|0)){d=0;i=f;return d|0}g=c[b+12>>2]|0;if(!(Vc[c[(c[g>>2]|0)+8>>2]&31](g,d,1,5e5)|0)){g=0;i=f;return g|0}d=b+16|0;g=c[d>>2]|0;g=Vc[c[(c[g>>2]|0)+8>>2]&31](g,e,500001,6e5)|0;e=c[d>>2]|0;if(g){Mc[c[(c[e>>2]|0)+72>>2]&63](e,1e8)}else{if((e|0)!=0){Lc[c[(c[e>>2]|0)+4>>2]&255](e)}c[d>>2]=0}Gg(b)|0;a[b]=1;g=1;i=f;return g|0}function Gg(d){d=d|0;var f=0,h=0,j=0,k=0,l=0;f=i;if((a[d]|0)==0){d=0;i=f;return d|0}c[d+72>>2]=0;l=d+84|0;b[l>>1]=0;b[d+92>>1]=0;h=d+96|0;k=c[h>>2]|0;b[k>>1]=0;b[k+4>>1]=1;b[l>>1]=(e[l>>1]|0)+1;l=c[d+80>>2]|0;k=e[k>>1]|0;j=l+(k<<4)|0;c[j>>2]=0;g[l+(k<<4)+4>>2]=0.0;c[l+(k<<4)+8>>2]=0;b[l+(k<<4)+14>>1]=0;b[l+(k<<4)+12>>1]=-1;k=c[h>>2]|0;b[k+2>>1]=0;k=k+6|0;b[k>>1]=b[k>>1]&-32768;k=(c[h>>2]|0)+6|0;b[k>>1]=b[k>>1]|-32768;c[(c[h>>2]|0)+8>>2]=j;b[d+116>>1]=0;c[d+356>>2]=0;b[d+736>>1]=0;c[d+896>>2]=0;h=c[d+12>>2]|0;Rc[c[(c[h>>2]|0)+20>>2]&7](h,0,0);d=c[d+16>>2]|0;if((d|0)==0){l=1;i=f;return l|0}Rc[c[(c[d>>2]|0)+20>>2]&7](d,0,0);l=1;i=f;return l|0}function Hg(b){b=b|0;var d=0,e=0,f=0,g=0,h=0,j=0;d=i;e=b+16|0;f=c[e>>2]|0;if((f|0)!=0){Lc[c[(c[f>>2]|0)+76>>2]&255](f)}f=b+12|0;g=c[f>>2]|0;if((g|0)!=0){Lc[c[(c[g>>2]|0)+4>>2]&255](g)}g=c[e>>2]|0;if((g|0)!=0){Lc[c[(c[g>>2]|0)+4>>2]&255](g)}g=b+20|0;h=c[g>>2]|0;if((h|0)!=0){Yq(h)}h=b+76|0;j=c[h>>2]|0;if((j|0)!=0){Zq(j)}c[f>>2]=0;c[e>>2]=0;c[g>>2]=0;c[h>>2]=0;c[b+80>>2]=0;c[b+88>>2]=0;c[b+96>>2]=0;c[b+100>>2]=0;c[b+104>>2]=0;a[b]=0;i=d;return}function Ig(a,d,e,f,g){a=a|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0;h=i;j=a+104|0;n=a+108|0;wr(c[j>>2]|0,0,(c[n>>2]|0)*20|0)|0;l=e&65535;if(e<<16>>16==0){p=0}else{k=(e&65535)>1;m=a+12|0;a=a+16|0;e=(e&65535)<2;o=l;p=0;do{r=c[n>>2]|0;q=r-p|0;if(k&(o|0)==1&(p|0)==0){a:do{if(e){p=0}else{p=2;while(1){r=p+1|0;if((Gf(c[m>>2]|0,d+(l-p<<1)|0,p&65535)|0)!=0){p=1;break a}if(r>>>0>l>>>0){p=0;break}else{p=r}}}}while(0);p=Hf(c[m>>2]|0,p,c[j>>2]|0,q,0)|0;q=c[n>>2]|0}else{q=r}t=q-p|0;u=c[m>>2]|0;q=d+(l-o<<1)|0;r=o&65535;u=Nc[c[(c[u>>2]|0)+40>>2]&7](u,q,r,(c[j>>2]|0)+(p*20|0)|0,t,p)|0;s=c[a>>2]|0;if((s|0)!=0){v=u+p|0;u=(Nc[c[(c[s>>2]|0)+40>>2]&7](s,q,r,(c[j>>2]|0)+(v*20|0)|0,t-u|0,v)|0)+u|0}p=u+p|0;o=o+ -1|0}while((o|0)!=0)}d=jg(c[j>>2]|0,p)|0;Vf(c[j>>2]|0,d,20,43);k=d>>>0>g>>>0?g:d;if((k|0)==0){i=h;return k|0}d=~d;g=~g;g=~(d>>>0>g>>>0?d:g);d=0;do{Bg(f+(d<<4)|0,(c[j>>2]|0)+(d*20|0)+4|0,7)|0;b[f+(d<<4)+14>>1]=0;d=d+1|0}while((d|0)!=(g|0));i=h;return k|0}function Jg(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0,f=0;e=i;f=zg(b)|0;if((f|0)==0|f>>>0>7|(d|0)==0){d=0;i=e;return d|0}d=Ig(a,b,f&65535,c,d)|0;i=e;return d|0}function Kg(a){a=a|0;var b=0;b=i;c[a>>2]=7056;wr(a+8|0,0,1124)|0;i=b;return}function Lg(a){a=a|0;var b=0;b=i;c[a>>2]=7056;Qg(a)|0;Yq(a);i=b;return}function Mg(a){a=a|0;var b=0;b=i;c[a>>2]=7056;Qg(a)|0;i=b;return}function Ng(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0;h=i;i=i+48|0;l=h+36|0;g=h;n=pq(b)|0;e=a+64|0;c[e>>2]=n;if((n|0)==0){n=0;i=h;return n|0}j=a+16|0;c[j>>2]=d;if(!(Og(a,b)|0)){k=ic(b|0,7144)|0;if((k|0)!=0){c[l>>2]=18015e4;m=Cb(l|0,1,4,k|0)|0;n=g+0|0;l=n+36|0;do{c[n>>2]=0;n=n+4|0}while((n|0)<(l|0));n=((Cb(g|0,1,36,k|0)|0)+m|0)==40;$b(k|0)|0;if(n){f=6}else{Za(b|0)|0}}}else{f=6}if((f|0)==6?Pg(a,b,d)|0:0){c[a+104>>2]=1;Fb(a+8|0,0)|0;n=1;i=h;return n|0}Sq(c[e>>2]|0);c[j>>2]=0;n=0;i=h;return n|0}function Og(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0;a=i;i=i+48|0;f=a+36|0;e=a;b=ic(b|0,7152)|0;if((b|0)==0){b=0;i=a;return b|0}if(((((((Zb(b|0,0,2)|0)==0?(d=ab(b|0)|0,!(d>>>0<40)):0)?(Zb(b|0,0,0)|0)==0:0)?(g=(Ya(f|0,1,4,b|0)|0)>>>0>3,g&(c[f>>2]|0)==18015e4):0)?(Zb(b|0,-36,2)|0)==0:0)?(Ya(e|0,1,36,b|0)|0)==36:0)?(g=c[e+12>>2]|0,(d|0)==((c[e+16>>2]|0)+40+(g<<3)+((c[e+28>>2]|0)+g<<2)|0)):0){$b(b|0)|0;g=1;i=a;return g|0}$b(b|0)|0;g=0;i=a;return g|0}function Pg(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0;e=i;i=i+48|0;n=e;b=ic(b|0,7152)|0;if((b|0)==0){v=0;i=e;return v|0}do{if(((Zb(b|0,-36,2)|0)==0?(Ya(n|0,1,36,b|0)|0)==36:0)?(u=c[n+16>>2]|0,k=Rq(u+1088|0)|0,(k|0)!=0):0){q=c[n+12>>2]|0;t=q<<2;r=t+128|0;j=Rq(r)|0;l=(j|0)==0;if(l){Sq(k);break}g=Rq(r)|0;if((g|0)!=0){o=c[n+28>>2]|0;s=o<<2;h=Rq(s+128|0)|0;a:do{if((h|0)!=0){m=Rq(r)|0;if((m|0)!=0){p=Rq(r)|0;if((p|0)!=0){r=Rq(r)|0;if((r|0)!=0?(Zb(b|0,4,0)|0)==0:0){if((u|0)!=0){v=0;do{if((Wa(b|0)|0)!=0){break}if((wc(b|0)|0)!=0){break}v=(Ya(k+v|0,1,u-v|0,b|0)|0)+v|0}while(v>>>0<u>>>0);if(v>>>0<u>>>0){break}}u=(t|0)==0;if(!u){v=0;do{if((Wa(b|0)|0)!=0){break a}if((wc(b|0)|0)!=0){break a}v=(Ya(j+v|0,1,t-v|0,b|0)|0)+v|0}while(v>>>0<t>>>0);if(!u){v=0;do{if((Wa(b|0)|0)!=0){break a}if((wc(b|0)|0)!=0){break a}v=(Ya(g+v|0,1,t-v|0,b|0)|0)+v|0}while(v>>>0<t>>>0);if(!u){u=0;do{if((Wa(b|0)|0)!=0){break a}if((wc(b|0)|0)!=0){break a}u=(Ya(m+u|0,1,t-u|0,b|0)|0)+u|0}while(u>>>0<t>>>0)}}}if((s|0)!=0){t=0;do{if((Wa(b|0)|0)!=0){break a}if((wc(b|0)|0)!=0){break a}t=(Ya(h+t|0,1,s-t|0,b|0)|0)+t|0}while(t>>>0<s>>>0)}if((q|0)!=0){ur(r|0,j|0,(q>>>0>1?q<<2:4)|0)|0;f=0;do{c[p+(f<<2)>>2]=f+d;f=f+1|0}while(f>>>0<q>>>0)}c[a+24>>2]=k;c[a+28>>2]=j;c[a+44>>2]=h;c[a+48>>2]=o+32;c[a+52>>2]=r;c[a+32>>2]=m;c[a+36>>2]=p;c[a+40>>2]=g;c[a+56>>2]=32;c[a+60>>2]=1088;f=a+68|0;h=n+0|0;g=f+36|0;do{c[f>>2]=c[h>>2];f=f+4|0;h=h+4|0}while((f|0)<(g|0));c[a+104>>2]=1;$b(b|0)|0;v=1;i=e;return v|0}}else{r=0}}else{p=0;r=0}}else{p=0;r=0;m=0}}while(0);Sq(k);if(!l){f=40}}else{Sq(k);p=0;r=0;m=0;h=0;f=40}if((f|0)==40){Sq(j)}if((h|0)!=0){Sq(h)}if((m|0)!=0){Sq(m)}if((p|0)!=0){Sq(p)}if((r|0)!=0){Sq(r)}if((g|0)!=0){Sq(g)}}}while(0);$b(b|0)|0;v=0;i=e;return v|0}function Qg(a){a=a|0;var b=0,d=0,e=0;b=i;d=c[a+104>>2]|0;if((d|0)==0){i=b;return 1}else if((d|0)!=1){e=2}do{if((e|0)==2){e=c[a+8>>2]|0;d=c[1784]|0;if((e|0)<=(d|0)){if((e|0)!=(d|0)){break}if((c[a+12>>2]|0)<=(c[7140>>2]|0)){break}}Rg(a);Fb(7136,0)|0}}while(0);Sq(c[a+64>>2]|0);Sq(c[a+24>>2]|0);Sq(c[a+28>>2]|0);Sq(c[a+52>>2]|0);Sq(c[a+32>>2]|0);Sq(c[a+36>>2]|0);Sq(c[a+40>>2]|0);d=a+20|0;a=d+88|0;do{c[d>>2]=0;d=d+4|0}while((d|0)<(a|0));i=b;return 1}function Rg(a){a=a|0;var b=0,d=0,e=0,f=0;b=i;i=i+16|0;d=a+104|0;if((c[d>>2]|0)>>>0<2){i=b;return}e=Qb(c[a+64>>2]|0,1,b|0)|0;if((e|0)==-1){i=b;return}switch(c[d>>2]|0){case 2:{if(!((Mb(e|0,(c[a+84>>2]|0)+4+((c[a+80>>2]|0)*12|0)|0,0)|0)==-1)){_a(e|0,c[a+44>>2]|0,c[a+96>>2]<<2|0)|0;_a(e|0,a+68|0,36)|0}break};case 5:{jh(a,e);break};case 6:{ih(a,e);break};case 3:{f=a+80|0;if(!((Mb(e|0,(c[a+84>>2]|0)+4+(c[f>>2]<<3)|0,0)|0)==-1)){_a(e|0,c[a+32>>2]|0,c[f>>2]<<2|0)|0;_a(e|0,c[a+44>>2]|0,c[a+96>>2]<<2|0)|0;_a(e|0,a+68|0,36)|0}break};case 4:{kh(a,e);break};default:{}}Yb(e|0,Mb(e|0,0,1)|0)|0;Va(e|0)|0;c[d>>2]=1;i=b;return}function Sg(a){a=a|0;return c[a+80>>2]|0}function Tg(a,b,c){a=a|0;b=b|0;c=c|0;return}function Ug(b,f,g,h,j,k){b=b|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0;f=i;i=i+16|0;l=f;if((c[b+104>>2]|0)==0){l=0;i=f;return l|0}a[l]=0;j=Vg(b,g,(e[g+80>>1]|0)+1&65535,h,j,l)|0;c[k>>2]=j;if((j|0)!=0){l=1;i=f;return l|0}l=d[l]|0;i=f;return l|0}function Vg(d,f,g,h,j,k){d=d|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,J=0;l=i;i=i+64|0;n=l+8|0;q=l+4|0;o=l;k=(k|0)==0?l+52|0:k;a[k]=0;if((c[d+104>>2]|0)==0|(j|0)==0){H=0;i=l;return H|0}p=d+8|0;t=c[p>>2]|0;u=c[1784]|0;if((t|0)>=(u|0)){if((t|0)==(u|0)?(c[d+12>>2]|0)<(c[7140>>2]|0):0){s=5}}else{s=5}if((s|0)==5){Lc[c[(c[d>>2]|0)+76>>2]&255](d)}Xg(0,n,f,g);f=c[d+80>>2]|0;g=Zg(d,n,q,o)|0;if(g){f=c[q>>2]|0;q=f;f=(c[o>>2]|0)+f|0}else{H=Wg(d,n)|0;c[q>>2]=H;q=H}if((q|0)==-1){if(g){H=0;i=l;return H|0}o=(e[n>>1]|0)+ -1|0;m=d+(o*60|0)+166|0;H=b[m>>1]|0;G=H&65535;c[d+(o*60|0)+(G<<3)+108>>2]=c[n+36>>2];c[d+(o*60|0)+(G<<3)+112>>2]=c[n+40>>2];n=H+1<<16>>16;if((n&65535)>6){n=(n&65535)+65529&65535}d=d+(o*60|0)+164|0;if(n<<16>>16==(b[d>>1]|0)?(r=n+1<<16>>16,b[d>>1]=r,(r&65535)>6):0){b[d>>1]=(r&65535)+65529}b[m>>1]=n;H=0;i=l;return H|0}a:do{if(q>>>0<f>>>0){v=d+28|0;t=d+24|0;u=d+32|0;s=d+100|0;r=d+4|0;w=d+36|0;A=0;x=0;y=q;D=0;do{z=c[v>>2]|0;while(1){C=c[z+(y<<2)>>2]|0;B=y+1|0;if((C|0)>=0){break}if(B>>>0>=f>>>0|A|D){y=B;break a}else{y=B}}z=C&2147483647;H=c[t>>2]|0;B=a[H+(z+1)|0]|0;z=H+(z+2)|0;if(!g){G=B&255;b:do{if((b[n>>1]|0)==(B&255)){C=rg()|0;if(B<<24>>24==0){C=0}else{F=0;while(1){J=a[xg(C,b[z+(F<<1)>>1]|0)|0]|0;H=F<<3&24;E=F+1|0;if((J<<24>>24|0)!=((c[n+(F>>>2<<2)+36>>2]&255<<H)>>>H<<24>>24|0)){C=1;break b}if(E>>>0<G>>>0){F=E}else{C=0;break}}}}else{C=1}}while(0);A=A|C}C=B&255;c:do{if(!D?!((e[n>>1]|0)>(C&65535)):0){D=rg()|0;if((b[n>>1]|0)==0){F=0}else{F=0;while(1){H=a[xg(D,b[z+(F<<1)>>1]|0)|0]|0;J=F<<3&24;E=F+1|0;if((H<<24>>24|0)!=((c[n+(F>>>2<<2)+36>>2]&255<<J)>>>J<<24>>24|0)){D=1;break c}F=b[n>>1]|0;if(E>>>0<(F&65535)>>>0){F=E}else{break}}}if((a[k]|0)!=0|(F&65535)>(C&65535)){D=0}else{if(!(F<<16>>16==0)){H=F&65535;E=0;while(1){F=b[n+(E<<1)+2>>1]|0;D=b[z+(E<<1)>>1]|0;if((D&65535)<(F&65535)){D=0;break c}G=E+1|0;if((D&65535|0)>=((e[n+(E<<1)+18>>1]|0)+(F&65535)|0)){D=0;break c}if(G>>>0<H>>>0){E=G}else{break}}}a[k]=1;D=0}}else{D=1}}while(0);E=B&255;d:do{if((b[n>>1]|0)==C<<16>>16){if(!(B<<24>>24==0)){C=0;while(1){G=b[n+(C<<1)+2>>1]|0;B=b[z+(C<<1)>>1]|0;if((B&65535)<(G&65535)){break d}F=C+1|0;if((B&65535|0)>=((e[n+(C<<1)+18>>1]|0)+(G&65535)|0)){break d}if(F>>>0<E>>>0){C=F}else{break}}}J=c[(c[u>>2]|0)+(y<<2)>>2]|0;B=c[p>>2]|0;B=qr(B|0,((B|0)<0)<<31>>31|0,-1229904e3,-1)|0;B=Hr(B|0,I|0,604800,0)|0;B=pr(B&65535|0,0,J>>>16|0,0)|0;z=h+(x<<3)|0;b[h+(x<<3)+4>>1]=~~(+ca(+(+((J&65535)>>>0)*((B|0)>4?16.0:+(80-(B<<4)|0))/+(((c[r>>2]|0)+(c[s>>2]|0)|0)>>>0)))*-800.0);c[z>>2]=c[(c[w>>2]|0)+(y<<2)>>2]&16777215|E<<24&251658240|c[z>>2]&-268435456;x=x+1|0}}while(0);y=y+1|0}while(x>>>0<j>>>0&((y>>>0>=f>>>0|A|D)^1))}else{x=0;y=q}}while(0);if(g){J=x;i=l;return J|0}G=y-q|0;c[o>>2]=G;h=(e[n>>1]|0)+ -1|0;o=d+(h*68|0)+654|0;J=b[o>>1]|0;H=J&65535;c[d+(h*68|0)+(H<<2)+620>>2]=q;c[d+(h*68|0)+(H<<2)+636>>2]=G;c[d+(h*68|0)+(H<<3)+588>>2]=c[n+36>>2];c[d+(h*68|0)+(H<<3)+592>>2]=c[n+40>>2];n=J+1<<16>>16;if((n&65535)>3){n=(n&65535)+65532&65535}d=d+(h*68|0)+652|0;if(n<<16>>16==(b[d>>1]|0)?(m=n+1<<16>>16,b[d>>1]=m,(m&65535)>3):0){b[d>>1]=(m&65535)+65532}b[o>>1]=n;J=x;i=l;return J|0}function Wg(d,f){d=d|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0;g=i;j=(c[d+80>>2]|0)+ -1|0;if((j|0)<0){t=-1;i=g;return t|0}h=d+28|0;d=d+24|0;k=0;n=-1;a:while(1){while(1){l=k+j>>1;m=c[(c[h>>2]|0)+(l<<2)>>2]&2147483647;o=c[d>>2]|0;r=a[o+(m+1)|0]|0;m=o+(m+2)|0;o=r&255;p=r&255;q=b[f>>1]|0;b:do{if(!((q&65535)>(o&65535))){if(!((q&65535)<(o&65535))){q=rg()|0;if(r<<24>>24==0){p=0}else{t=0;while(1){s=a[xg(q,b[m+(t<<1)>>1]|0)|0]|0;r=t<<3&24;s=s<<24>>24;r=(c[f+(t>>>2<<2)+36>>2]&255<<r)>>>r<<24>>24;t=t+1|0;if((s|0)!=(r|0)){break}if(!(t>>>0<p>>>0)){p=0;break b}}p=(s|0)>(r|0)?1:-1}}else{p=1}}else{p=-1}}while(0);c:do{if(!((e[f>>1]|0)>(o&65535))){o=rg()|0;if((b[f>>1]|0)==0){n=l}else{r=0;while(1){s=a[xg(o,b[m+(r<<1)>>1]|0)|0]|0;t=r<<3&24;q=r+1|0;if((s<<24>>24|0)!=((c[f+(r>>>2<<2)+36>>2]&255<<t)>>>t<<24>>24|0)){break c}if(q>>>0<(e[f>>1]|0)>>>0){r=q}else{n=l;break}}}}}while(0);if((p|0)>=0){break}if((l|0)>=(j|0)){f=18;break a}k=l+1|0}j=l+ -1|0;if((k|0)>(j|0)){f=18;break}}if((f|0)==18){i=g;return n|0}return 0}function Xg(a,e,f,g){a=a|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0;a=i;b[e>>1]=g;h=e+36|0;c[h>>2]=0;c[h+4>>2]=0;h=rg()|0;if(g<<16>>16==0){i=a;return}g=g&65535;j=0;do{k=f+(j<<1)|0;if(mg(h,b[k>>1]|0)|0){b[e+(j<<1)+18>>1]=sg(h,b[k>>1]|0,e+(j<<1)+2|0)|0}else{b[e+(j<<1)+18>>1]=1;b[e+(j<<1)+2>>1]=b[k>>1]|0}l=(d[xg(h,b[k>>1]|0)|0]|0)<<(j<<3&24);k=e+(j>>>2<<2)+36|0;c[k>>2]=l|c[k>>2];j=j+1|0}while((j|0)!=(g|0));i=a;return}function Yg(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;var f=0;f=i;a=Vg(a,b,c,d,e,0)|0;i=f;return a|0}function Zg(a,d,f,g){a=a|0;d=d|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0;j=i;k=(e[d>>1]|0)+ -1|0;n=b[a+(k*60|0)+164>>1]|0;l=b[a+(k*60|0)+166>>1]|0;a:do{if(!(n<<16>>16==l<<16>>16)){b:while(1){o=n&65535;p=0;m=0;while(1){q=(m&65535)+1<<16>>16;if((c[a+(k*60|0)+(o<<3)+(p<<2)+108>>2]|0)!=(c[d+(p<<2)+36>>2]|0)){break}if((q&65535)<2){p=q&65535;m=m+1|0}else{break b}}n=n+1<<16>>16;if((n&65535)>6){n=(n&65535)+65529&65535}if(n<<16>>16==l<<16>>16){break a}}c[f>>2]=0;c[g>>2]=0;q=1;i=j;return q|0}}while(0);q=b[a+(k*68|0)+652>>1]|0;l=b[a+(k*68|0)+654>>1]|0;if(q<<16>>16==l<<16>>16){q=0;i=j;return q|0}c:while(1){p=q&65535;m=0;o=0;while(1){n=(o&65535)+1<<16>>16;if((c[a+(k*68|0)+(p<<3)+(m<<2)+588>>2]|0)!=(c[d+(m<<2)+36>>2]|0)){break}if((n&65535)<2){m=n&65535;o=o+1|0}else{break c}}q=q+1<<16>>16;if((q&65535)>3){q=(q&65535)+65532&65535}if(q<<16>>16==l<<16>>16){k=0;h=17;break}}if((h|0)==17){i=j;return k|0}c[f>>2]=c[a+(k*68|0)+(p<<2)+620>>2];c[g>>2]=c[a+(k*68|0)+(p<<2)+636>>2];q=1;i=j;return q|0}function _g(a,e,f,g){a=a|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0;h=i;if((c[a+104>>2]|0)==0){l=0;i=h;return l|0}j=c[a+16>>2]|0;if(j>>>0>e>>>0){l=0;i=h;return l|0}if((j+ -1+(c[a+80>>2]|0)|0)>>>0<e>>>0){l=0;i=h;return l|0}j=c[(c[a+52>>2]|0)+(e-j<<2)>>2]&2147483647;k=c[a+24>>2]|0;a=d[k+(j+1)|0]|0;j=k+(j+2+(a<<1))|0;k=g&65535;g=k+ -1|0;e=(a|0)<(g|0)?a:g;g=e&65535;e=e&65535;if((e|0)==0){j=0}else{k=0-k|0;a=~a;l=((k|0)>(a|0)?k:a)&65535^65535;k=l>>>0>1;a=0;do{b[f+(a<<1)>>1]=b[j+(a<<1)>>1]|0;a=a+1|0}while((a|0)<(e|0));j=k?l:1}b[f+(j<<1)>>1]=0;l=g;i=h;return l|0}function $g(d,e,f,g,h){d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0;h=i;j=c[d+16>>2]|0;if(j>>>0>e>>>0){j=0;i=h;return j|0}if((j+ -1+(c[d+80>>2]|0)|0)>>>0<e>>>0){j=0;i=h;return j|0}j=c[(c[d+52>>2]|0)+(e-j<<2)>>2]&2147483647;d=c[d+24>>2]|0;e=a[d+(j+1)|0]|0;d=d+(j+2)|0;if(!(e<<24>>24!=0&g<<16>>16!=0)){j=0;i=h;return j|0}e=(e&255)>1?0-(e&255)|0:-1;g=(g&65535)>1?0-(g&65535)|0:-1;e=0-(e>>>0>g>>>0?e:g)|0;g=0;do{b[f+(g<<1)>>1]=b[d+(g<<1)>>1]|0;g=g+1|0}while((g|0)!=(e|0));j=e&65535;i=h;return j|0}function ah(e,f,h,j,k,l){e=e|0;f=f|0;h=h|0;j=j|0;k=k|0;l=l|0;var m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0;l=i;q=(c[e+80>>2]|0)+ -1|0;r=h&65535;if((q|0)<0){F=0;i=l;return F|0}u=c[e+28>>2]|0;s=e+24|0;v=c[s>>2]|0;x=0;w=q;B=-1;a:do{b:while(1){y=x+w>>1;A=c[u+(y<<2)>>2]&2147483647;C=d[v+(A+1)|0]|0;A=v+(A+2+(C<<1))|0;z=C>>>0<r>>>0;E=z?C:r;c:do{if((E|0)==0){t=8}else{F=0;while(1){C=b[A+(F<<1)>>1]|0;D=b[f+(F<<1)>>1]|0;if((C&65535)<(D&65535)){break c}F=F+1|0;if((C&65535)>(D&65535)){break b}if(!(F>>>0<E>>>0)){t=8;break}}}}while(0);if((t|0)==8){t=0;B=z?B:y;if(!z){break}}if((y|0)<(w|0)){x=y+1|0}else{break a}}w=y+ -1|0}while((x|0)<=(w|0));if((B|0)==-1|(B|0)>(q|0)){F=0;i=l;return F|0}t=e+40|0;u=r<<1;v=0;d:while(1){w=c[t>>2]|0;while(1){x=c[w+(B<<2)>>2]|0;if((x|0)>=0?(p=x&2147483647,F=c[s>>2]|0,m=a[F+(p+1)|0]|0,o=m<<24>>24,p=p+2|0,n=F+(((m&255)<<1)+p)|0,p=F+p|0,o>>>0>r>>>0):0){break}if((B|0)<(q|0)){B=B+1|0}else{t=21;break d}}if(!((mr(n,f,u)|0)==0&v>>>0<k>>>0)){t=21;break}w=((m&255)<7?o<<1:14)-u|0;b[j+(v*20|0)+18>>1]=h;g[j+(v*20|0)>>2]=+((Vc[c[(c[e>>2]|0)+60>>2]&31](e,n,p,m<<24>>24)|0)&65535);ur(j+(v*20|0)+4|0,n+(r<<1)|0,w|0)|0;if(w>>>0<14){b[j+(v*20|0)+(w>>>1<<1)+4>>1]=0}v=v+1|0;if((B|0)<(q|0)){B=B+1|0}else{t=21;break}}if((t|0)==21){i=l;return v|0}return 0}function bh(f,g,h,j){f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0;l=i;i=i+48|0;k=l;o=c[f+80>>2]|0;Xg(0,k,h,j);p=(e[k>>1]|0)+ -1|0;A=b[f+(p*68|0)+652>>1]|0;h=b[f+(p*68|0)+654>>1]|0;a:do{if(A<<16>>16==h<<16>>16){w=9}else{b:while(1){z=A&65535;q=0;y=0;while(1){B=(y&65535)+1<<16>>16;if((c[f+(p*68|0)+(z<<3)+(q<<2)+588>>2]|0)!=(c[k+(q<<2)+36>>2]|0)){break}if((B&65535)<2){q=B&65535;y=y+1|0}else{break b}}A=A+1<<16>>16;if((A&65535)>3){A=(A&65535)+65532&65535}if(A<<16>>16==h<<16>>16){w=9;break a}}v=c[f+(p*68|0)+(z<<2)+620>>2]|0;x=1;m=(c[f+(p*68|0)+(z<<2)+636>>2]|0)+v|0}}while(0);if((w|0)==9){x=0;m=o;v=Wg(f,k)|0}if(!((v|0)!=-1&(v|0)<(m|0))){B=-1;i=l;return B|0}o=f+28|0;f=f+24|0;q=j&65535;h=j<<16>>16==0;p=j<<16>>16!=0;if(x){w=c[o>>2]|0;c:while(1){x=c[w+(v<<2)>>2]|0;d:do{if((x|0)>=0?(s=x&2147483647,u=c[f>>2]|0,r=s+2|0,t=u+r|0,(b[k>>1]|0)==j<<16>>16):0){if(!h){y=0;while(1){x=b[k+(y<<1)+2>>1]|0;z=b[t+(y<<1)>>1]|0;if((z&65535)<(x&65535)){break d}A=y+1|0;if((z&65535|0)>=((e[k+(y<<1)+18>>1]|0)+(x&65535)|0)){break d}if(A>>>0<q>>>0){y=A}else{break}}}z=u+((d[u+(s+1)|0]<<1)+r)|0;if(p){y=0}else{w=37;break c}while(1){x=y+1|0;if((b[z+(y<<1)>>1]|0)!=(b[g+(y<<1)>>1]|0)){break d}if(x>>>0<q>>>0){y=x}else{w=37;break c}}}}while(0);v=v+1|0;if((v|0)>=(m|0)){v=-1;w=37;break}}if((w|0)==37){i=l;return v|0}}else{n=v}e:while(1){r=c[(c[o>>2]|0)+(n<<2)>>2]|0;f:do{if((r|0)>=0){s=r&2147483647;r=s+2|0;t=(c[f>>2]|0)+r|0;if(!((b[k>>1]|0)==j<<16>>16)){v=-1;w=37;break e}u=rg()|0;if(!h){v=0;while(1){A=a[xg(u,b[t+(v<<1)>>1]|0)|0]|0;B=v<<3&24;w=v+1|0;if((A<<24>>24|0)!=((c[k+(v>>>2<<2)+36>>2]&255<<B)>>>B<<24>>24|0)){v=-1;w=37;break e}if(w>>>0<q>>>0){v=w}else{break}}}if((b[k>>1]|0)==j<<16>>16){if(!h){v=0;while(1){x=b[k+(v<<1)+2>>1]|0;u=b[t+(v<<1)>>1]|0;if((u&65535)<(x&65535)){break f}w=v+1|0;if((u&65535|0)>=((e[k+(v<<1)+18>>1]|0)+(x&65535)|0)){break f}if(w>>>0<q>>>0){v=w}else{break}}}B=c[f>>2]|0;r=B+((d[B+(s+1)|0]<<1)+r)|0;if(p){t=0}else{v=n;w=37;break e}while(1){s=t+1|0;if((b[r+(t<<1)>>1]|0)!=(b[g+(t<<1)>>1]|0)){break f}if(s>>>0<q>>>0){t=s}else{v=n;w=37;break e}}}}}while(0);n=n+1|0;if((n|0)>=(m|0)){v=-1;w=37;break}}if((w|0)==37){i=l;return v|0}return 0}function ch(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;var f=0;f=i;e=bh(a,b,d,e)|0;if((e|0)==-1){b=0;i=f;return b|0}b=c[(c[a+36>>2]|0)+(e<<2)>>2]|0;i=f;return b|0}function dh(b,d){b=b|0;d=d|0;var e=0,f=0,g=0;e=i;if((c[b+104>>2]|0)==0){f=0;i=e;return f|0}f=c[b+16>>2]|0;if(f>>>0>d>>>0){f=0;i=e;return f|0}if((f+ -1+(c[b+80>>2]|0)|0)>>>0<d>>>0){f=0;i=e;return f|0}f=c[(c[b+52>>2]|0)+(d-f<<2)>>2]&2147483647;g=c[b+24>>2]|0;d=a[g+(f+1)|0]|0;f=f+2|0;d=bh(b,g+(((d&255)<<1)+f)|0,g+f|0,d<<24>>24)|0;if((d|0)==-1){d=0}else{d=c[(c[b+32>>2]|0)+(d<<2)>>2]|0}f=c[b+8>>2]|0;f=qr(f|0,((f|0)<0)<<31>>31|0,-1229904e3,-1)|0;f=Hr(f|0,I|0,604800,0)|0;f=pr(f&65535|0,0,d>>>16|0,0)|0;g=~~(+ca(+(+((d&65535)>>>0)*((f|0)>4?16.0:+(80-(f<<4)|0))/+(((c[b+4>>2]|0)+(c[b+100>>2]|0)|0)>>>0)))*-800.0)&65535;i=e;return g|0}function eh(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;var f=0;f=i;if((c[a+104>>2]|0)==0){e=0;i=f;return e|0}b=bh(a,b,d,e)|0;if((b|0)==-1){b=0}else{b=c[(c[a+32>>2]|0)+(b<<2)>>2]|0}d=c[a+8>>2]|0;d=qr(d|0,((d|0)<0)<<31>>31|0,-1229904e3,-1)|0;d=Hr(d|0,I|0,604800,0)|0;d=pr(d&65535|0,0,b>>>16|0,0)|0;e=~~(+ca(+(+((b&65535)>>>0)*((d|0)>4?16.0:+(80-(d<<4)|0))/+(((c[a+4>>2]|0)+(c[a+100>>2]|0)|0)>>>0)))*-800.0)&65535;i=f;return e|0}function fh(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0;g=i;f=b+104|0;e=c[f>>2]|0;if((e|0)==0|(d|0)==-1){n=0;i=g;return n|0}l=(c[b+28>>2]|0)+(d<<2)|0;h=c[l>>2]|0;d=a[(c[b+24>>2]|0)+((h&2147483647)+1)|0]|0;c[l>>2]=h|-2147483648;l=b+96|0;k=c[l>>2]|0;if((k|0)!=0){j=c[b+44>>2]|0;m=0;while(1){n=m+1|0;if(((c[j+(m<<2)>>2]^h)&2147483647|0)==0){break}if(n>>>0<k>>>0){m=n}else{m=n;break}}if(m>>>0<k>>>0){c[j+(m<<2)>>2]=c[j+(k+ -1<<2)>>2];c[l>>2]=(c[l>>2]|0)+ -1}}j=c[b+80>>2]|0;a:do{if((j|0)!=0){k=c[b+40>>2]|0;l=0;while(1){n=k+(l<<2)|0;m=c[n>>2]|0;l=l+1|0;if(((m^h)&2147483647|0)==0){break}if(!(l>>>0<j>>>0)){break a}}c[n>>2]=m|-2147483648}}while(0);n=b+88|0;c[n>>2]=(c[n>>2]|0)+1;n=b+92|0;c[n>>2]=(c[n>>2]|0)+(d<<2|2);if((e|0)>=4){n=1;i=g;return n|0}c[f>>2]=4;n=1;i=g;return n|0}function gh(b,d){b=b|0;d=d|0;var e=0,f=0,g=0;e=i;if((c[b+104>>2]|0)==0){f=0;i=e;return f|0}f=c[b+16>>2]|0;if(f>>>0>d>>>0){f=0;i=e;return f|0}if((f+ -1+(c[b+80>>2]|0)|0)>>>0<d>>>0){f=0;i=e;return f|0}d=c[(c[b+52>>2]|0)+(d-f<<2)>>2]&2147483647;g=c[b+24>>2]|0;f=a[g+(d+1)|0]|0;d=d+2|0;f=fh(b,bh(b,g+(((f&255)<<1)+d)|0,g+d|0,f<<24>>24)|0)|0;i=e;return f|0}function hh(a){a=a|0;var b=0,d=0,e=0;b=i;e=c[a+16>>2]|0;d=pq(c[a+64>>2]|0)|0;if((d|0)==0){i=b;return}Pc[c[(c[a>>2]|0)+12>>2]&127](a)|0;Vc[c[(c[a>>2]|0)+8>>2]&31](a,d,e,6e5)|0;Sq(d);wr(a+108|0,0,1024)|0;i=b;return}function ih(a,b){a=a|0;b=b|0;var d=0,e=0;d=i;if((Mb(b|0,4,0)|0)==-1){i=d;return}_a(b|0,c[a+24>>2]|0,c[a+84>>2]|0)|0;e=a+80|0;_a(b|0,c[a+28>>2]|0,c[e>>2]<<2|0)|0;_a(b|0,c[a+40>>2]|0,c[e>>2]<<2|0)|0;_a(b|0,c[a+32>>2]|0,c[e>>2]<<2|0)|0;_a(b|0,c[a+44>>2]|0,c[a+96>>2]<<2|0)|0;_a(b|0,a+68|0,36)|0;i=d;return}function jh(a,b){a=a|0;b=b|0;var d=0,e=0,f=0;d=i;if((Mb(b|0,4,0)|0)==-1){i=d;return}f=1088-(c[a+60>>2]|0)|0;e=a+84|0;if((Mb(b|0,(c[e>>2]|0)-f|0,1)|0)==-1){i=d;return}_a(b|0,(c[a+24>>2]|0)+((c[e>>2]|0)-f)|0,f|0)|0;f=a+80|0;_a(b|0,c[a+28>>2]|0,c[f>>2]<<2|0)|0;_a(b|0,c[a+40>>2]|0,c[f>>2]<<2|0)|0;_a(b|0,c[a+32>>2]|0,c[f>>2]<<2|0)|0;_a(b|0,c[a+44>>2]|0,c[a+96>>2]<<2|0)|0;_a(b|0,a+68|0,36)|0;i=d;return}function kh(a,b){a=a|0;b=b|0;var d=0,e=0;d=i;if((Mb(b|0,(c[a+84>>2]|0)+4|0,0)|0)==-1){i=d;return}e=a+80|0;_a(b|0,c[a+28>>2]|0,c[e>>2]<<2|0)|0;_a(b|0,c[a+40>>2]|0,c[e>>2]<<2|0)|0;_a(b|0,c[a+32>>2]|0,c[e>>2]<<2|0)|0;_a(b|0,c[a+44>>2]|0,c[a+96>>2]<<2|0)|0;_a(b|0,a+68|0,36)|0;i=d;return}function lh(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0;j=i;l=a+104|0;if((c[l>>2]|0)==0){l=0;i=j;return l|0}k=bh(a,b,d,e)|0;if(!((k|0)==-1)){d=f&65535;f=(c[a+32>>2]|0)+(k<<2)|0;b=a+100|0;c[b>>2]=d-(c[f>>2]|0)+(c[b>>2]|0);b=qr(g|0,h|0,-1229904e3,-1)|0;b=Hr(b|0,I|0,604800,0)|0;c[f>>2]=b<<16|d;if((c[l>>2]|0)<3){c[l>>2]=3}l=c[(c[a+36>>2]|0)+(k<<2)>>2]|0;i=j;return l|0}k=c[a+72>>2]|0;if((k|0)!=0?!((c[a+80>>2]|0)>>>0<k>>>0):0){l=0;i=j;return l|0}k=c[a+76>>2]|0;if((k|0)!=0?((c[a+84>>2]|0)+((e&65535)<<2|2)|0)>>>0>k>>>0:0){l=0;i=j;return l|0}if(!((c[a+56>>2]|0)!=0?!((c[a+60>>2]|0)>>>0<((e&65535)<<2|2)>>>0):0)){Lc[c[(c[a>>2]|0)+76>>2]&255](a)}e=nh(a,b,d,e,f,g,h)|0;g=a+44|0;f=c[g>>2]|0;if((f|0)==0|(e|0)==0){l=e;i=j;return l|0}h=a+96|0;d=c[h>>2]|0;b=a+48|0;k=c[b>>2]|0;if(d>>>0<k>>>0){l=c[(c[a+52>>2]|0)+(e-(c[a+16>>2]|0)<<2)>>2]|0;c[h>>2]=d+1;c[f+(d<<2)>>2]=l;l=e;i=j;return l|0}d=Tq(f,(k<<2)+128|0)|0;if((d|0)==0){l=e;i=j;return l|0}c[b>>2]=(c[b>>2]|0)+32;c[g>>2]=d;k=c[(c[a+52>>2]|0)+(e-(c[a+16>>2]|0)<<2)>>2]|0;l=c[h>>2]|0;c[h>>2]=l+1;c[d+(l<<2)>>2]=k;l=e;i=j;return l|0}function mh(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;var f=0,g=0;f=i;g=Db(0)|0;a=lh(a,b,c,d,e,g,((g|0)<0)<<31>>31)|0;i=f;return a|0}function nh(e,f,g,h,j,k,l){e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;var m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0;m=i;i=i+48|0;u=m;w=e+16|0;r=e+80|0;n=(c[r>>2]|0)+(c[w>>2]|0)|0;v=e+84|0;x=c[v>>2]|0;if((x|0)<0){C=0;i=m;return C|0}s=e+24|0;a[(c[s>>2]|0)+x|0]=0;a[(c[s>>2]|0)+(x+1)|0]=h;p=h&65535;if(!(h<<16>>16==0)){q=x+2|0;t=c[s>>2]|0;z=q+(p<<1)|0;y=0;do{C=y<<1;b[t+(C+q)>>1]=b[g+(y<<1)>>1]|0;b[t+(z+C)>>1]=b[f+(y<<1)>>1]|0;y=y+1|0}while((y|0)!=(p|0))}q=c[r>>2]|0;t=e+28|0;c[(c[t>>2]|0)+(q<<2)>>2]=x;j=j&65535;k=qr(k|0,l|0,-1229904e3,-1)|0;k=Hr(k|0,I|0,604800,0)|0;f=e+32|0;c[(c[f>>2]|0)+(q<<2)>>2]=k<<16|j;k=e+36|0;c[(c[k>>2]|0)+(q<<2)>>2]=n;l=e+40|0;c[(c[l>>2]|0)+(q<<2)>>2]=x;c[(c[e+52>>2]|0)+(n-(c[w>>2]|0)<<2)>>2]=x;c[r>>2]=(c[r>>2]|0)+1;B=p<<2|2;c[v>>2]=(c[v>>2]|0)+B;C=e+56|0;c[C>>2]=(c[C>>2]|0)+ -1;C=e+60|0;c[C>>2]=(c[C>>2]|0)-B;Xg(0,u,g,h);a:do{if((q|0)==0){v=0}else{v=0;do{w=c[(c[t>>2]|0)+(v<<2)>>2]&2147483647;y=c[s>>2]|0;x=a[y+(w+1)|0]|0;w=y+(w+2)|0;y=x<<24>>24;g=y&65535;h=b[u>>1]|0;if(!((h&65535)>(y&65535))){if((h&65535)<(y&65535)){break a}h=rg()|0;if(x<<24>>24==0){break a}else{z=0}while(1){x=a[xg(h,b[w+(z<<1)>>1]|0)|0]|0;y=z<<3&24;x=x<<24>>24;y=(c[u+(z>>>2<<2)+36>>2]&255<<y)>>>y<<24>>24;z=z+1|0;if((x|0)!=(y|0)){break}if(!(z>>>0<g>>>0)){break a}}if((x|0)>(y|0)){break a}}v=v+1|0}while(v>>>0<q>>>0)}}while(0);if((v|0)!=(q|0)){A=c[t>>2]|0;C=c[A+(q<<2)>>2]|0;z=v+1|0;B=q-v<<2;vr(A+(z<<2)|0,A+(v<<2)|0,B|0)|0;c[(c[t>>2]|0)+(v<<2)>>2]=C;C=c[f>>2]|0;A=c[C+(q<<2)>>2]|0;vr(C+(z<<2)|0,C+(v<<2)|0,B|0)|0;c[(c[f>>2]|0)+(v<<2)>>2]=A;A=c[k>>2]|0;C=c[A+(q<<2)>>2]|0;vr(A+(z<<2)|0,A+(v<<2)|0,B|0)|0;c[(c[k>>2]|0)+(v<<2)>>2]=C}k=c[l>>2]|0;u=c[k+(q<<2)>>2]|0;g=u&2147483647;f=c[s>>2]|0;s=f+(g+2+((d[f+(g+1)|0]|0)<<1))|0;g=(c[r>>2]|0)+ -1|0;b:do{if((g|0)>=0){r=c[t>>2]|0;v=0;t=g;h=g;while(1){c:while(1){g=v+t>>1;B=c[r+(g<<2)>>2]&2147483647;y=d[f+(B+1)|0]|0;B=f+(B+2+(y<<1))|0;A=y>>>0<p>>>0;w=A?y:p;d:do{if((w|0)==0){o=23}else{C=0;while(1){z=b[B+(C<<1)>>1]|0;x=b[s+(C<<1)>>1]|0;if((z&65535)<(x&65535)){break d}C=C+1|0;if((z&65535)>(x&65535)){break c}if(!(C>>>0<w>>>0)){o=23;break}}}}while(0);if((o|0)==23?(o=0,!A):0){o=24;break}if((g|0)<(t|0)){v=g+1|0;h=g}else{break b}}if((o|0)==24){o=0;h=y>>>0>p>>>0?h:g}t=g+ -1|0;if((v|0)>(t|0)){g=h;break}}}}while(0);if((g|0)!=(q|0)){vr(k+(g+1<<2)|0,k+(g<<2)|0,q-g<<2|0)|0;c[(c[l>>2]|0)+(g<<2)>>2]=u}o=e+104|0;if((c[o>>2]|0)<5){c[o>>2]=5}wr(e+108|0,0,1024)|0;C=e+100|0;c[C>>2]=(c[C>>2]|0)+j;C=n;i=m;return C|0}function oh(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0;g=i;k=b+104|0;if((c[k>>2]|0)==0){p=0;i=g;return p|0}h=b+16|0;l=c[h>>2]|0;if(l>>>0>d>>>0){p=0;i=g;return p|0}if((l+ -1+(c[b+80>>2]|0)|0)>>>0<d>>>0){p=0;i=g;return p|0}j=b+52|0;p=c[(c[j>>2]|0)+(d-l<<2)>>2]&2147483647;o=c[b+24>>2]|0;d=a[o+(p+1)|0]|0;p=p+2|0;d=bh(b,o+(((d&255)<<1)+p)|0,o+p|0,d&255)|0;if((d|0)==-1){p=0;i=g;return p|0}n=b+32|0;m=c[n>>2]|0;l=c[m+(d<<2)>>2]|0;p=Gr(l>>>16|0,0,604800,0)|0;p=qr(p|0,I|0,1229904e3,0)|0;o=I;if(((l&65535)+(e<<16>>16)|0)>65535|e<<16>>16<0){e=(l^65535)&65535}e=e<<16>>16;q=b+100|0;c[q>>2]=(c[q>>2]|0)+e;if(f){o=Db(0)|0;p=o;o=((o|0)<0)<<31>>31;m=c[n>>2]|0}q=qr(p|0,o|0,-1229904e3,-1)|0;q=Hr(q|0,I|0,604800,0)|0;c[m+(d<<2)>>2]=q<<16|e+l&65535;if((c[k>>2]|0)<3){c[k>>2]=3}k=b+36|0;m=c[(c[k>>2]|0)+(d<<2)>>2]|0;n=b+96|0;o=c[n>>2]|0;l=b+48|0;f=c[l>>2]|0;if(!(o>>>0<f>>>0)){b=b+44|0;f=Tq(c[b>>2]|0,(f<<2)+128|0)|0;if((f|0)!=0){c[l>>2]=(c[l>>2]|0)+32;c[b>>2]=f;p=c[(c[j>>2]|0)+(m-(c[h>>2]|0)<<2)>>2]|0;q=c[n>>2]|0;c[n>>2]=q+1;c[f+(q<<2)>>2]=p}}else{q=c[(c[j>>2]|0)+(m-(c[h>>2]|0)<<2)>>2]|0;c[n>>2]=o+1;c[(c[b+44>>2]|0)+(o<<2)>>2]=q}q=c[(c[k>>2]|0)+(d<<2)>>2]|0;i=g;return q|0}function ph(a){a=a|0;return c[a+100>>2]|0}function qh(a,b){a=a|0;b=b|0;c[a+4>>2]=b;return}function rh(b){b=b|0;var d=0,e=0,f=0,g=0,h=0;b=i;i=i+16|0;e=b;g=c[r>>2]|0;Nh(7912,g,7968);c[1800]=9340;c[7208>>2]=9360;c[7204>>2]=0;Ri(7208|0,7912);c[7280>>2]=0;c[7284>>2]=-1;f=c[s>>2]|0;c[2004]=9208;Yn(8020|0);c[8024>>2]=0;c[8028>>2]=0;c[8032>>2]=0;c[8036>>2]=0;c[8040>>2]=0;c[8044>>2]=0;c[2004]=8528;c[8048>>2]=f;Zn(e,8020|0);d=$n(e,12e3)|0;_n(e);c[8052>>2]=d;c[8056>>2]=7976;a[8060|0]=(Pc[c[(c[d>>2]|0)+28>>2]&127](d)|0)&1;c[1822]=9420;c[7292>>2]=9440;Ri(7292|0,8016);c[7364>>2]=0;c[7368>>2]=-1;d=c[q>>2]|0;c[2016]=9208;Yn(8068|0);c[8072>>2]=0;c[8076>>2]=0;c[8080>>2]=0;c[8084>>2]=0;c[8088>>2]=0;c[8092>>2]=0;c[2016]=8528;c[8096>>2]=d;Zn(e,8068|0);h=$n(e,12e3)|0;_n(e);c[8100>>2]=h;c[8104>>2]=7984;a[8108|0]=(Pc[c[(c[h>>2]|0)+28>>2]&127](h)|0)&1;c[1844]=9420;c[7380>>2]=9440;Ri(7380|0,8064);c[7452>>2]=0;c[7456>>2]=-1;h=c[(c[(c[1844]|0)+ -12>>2]|0)+7400>>2]|0;c[1866]=9420;c[7468>>2]=9440;Ri(7468|0,h);c[7540>>2]=0;c[7544>>2]=-1;c[(c[(c[1800]|0)+ -12>>2]|0)+7272>>2]=7288;h=(c[(c[1844]|0)+ -12>>2]|0)+7380|0;c[h>>2]=c[h>>2]|8192;c[(c[(c[1844]|0)+ -12>>2]|0)+7448>>2]=7288;zh(8112,g,7992|0);c[1888]=9380;c[7560>>2]=9400;c[7556>>2]=0;Ri(7560|0,8112);c[7632>>2]=0;c[7636>>2]=-1;c[2042]=9272;Yn(8172|0);c[8176>>2]=0;c[8180>>2]=0;c[8184>>2]=0;c[8188>>2]=0;c[8192>>2]=0;c[8196>>2]=0;c[2042]=8272;c[8200>>2]=f;Zn(e,8172|0);f=$n(e,12008)|0;_n(e);c[8204>>2]=f;c[8208>>2]=8e3;a[8212|0]=(Pc[c[(c[f>>2]|0)+28>>2]&127](f)|0)&1;c[1910]=9460;c[7644>>2]=9480;Ri(7644|0,8168);c[7716>>2]=0;c[7720>>2]=-1;c[2054]=9272;Yn(8220|0);c[8224>>2]=0;c[8228>>2]=0;c[8232>>2]=0;c[8236>>2]=0;c[8240>>2]=0;c[8244>>2]=0;c[2054]=8272;c[8248>>2]=d;Zn(e,8220|0);d=$n(e,12008)|0;_n(e);c[8252>>2]=d;c[8256>>2]=8008;a[8260|0]=(Pc[c[(c[d>>2]|0)+28>>2]&127](d)|0)&1;c[1932]=9460;c[7732>>2]=9480;Ri(7732|0,8216);c[7804>>2]=0;c[7808>>2]=-1;d=c[(c[(c[1932]|0)+ -12>>2]|0)+7752>>2]|0;c[1954]=9460;c[7820>>2]=9480;Ri(7820|0,d);c[7892>>2]=0;c[7896>>2]=-1;c[(c[(c[1888]|0)+ -12>>2]|0)+7624>>2]=7640;d=(c[(c[1932]|0)+ -12>>2]|0)+7732|0;c[d>>2]=c[d>>2]|8192;c[(c[(c[1932]|0)+ -12>>2]|0)+7800>>2]=7640;i=b;return}function sh(a){a=a|0;a=i;wj(7288)|0;wj(7464)|0;Cj(7640)|0;Cj(7816)|0;i=a;return}function th(a){a=a|0;var b=0;b=i;c[a>>2]=9272;_n(a+4|0);i=b;return}function uh(a){a=a|0;var b=0;b=i;c[a>>2]=9272;_n(a+4|0);Yq(a);i=b;return}function vh(b,d){b=b|0;d=d|0;var e=0;e=i;Pc[c[(c[b>>2]|0)+24>>2]&127](b)|0;d=$n(d,12008)|0;c[b+36>>2]=d;a[b+44|0]=(Pc[c[(c[d>>2]|0)+28>>2]&127](d)|0)&1;i=e;return}function wh(a){a=a|0;var b=0,d=0,e=0,f=0,g=0,h=0,j=0,k=0,l=0;b=i;i=i+16|0;g=b+8|0;d=b;e=a+36|0;f=a+40|0;h=g+8|0;j=g;a=a+32|0;while(1){k=c[e>>2]|0;k=Zc[c[(c[k>>2]|0)+20>>2]&31](k,c[f>>2]|0,g,h,d)|0;l=(c[d>>2]|0)-j|0;if((Cb(g|0,1,l|0,c[a>>2]|0)|0)!=(l|0)){e=-1;d=5;break}if((k|0)==2){e=-1;d=5;break}else if((k|0)!=1){d=4;break}}if((d|0)==4){l=((lc(c[a>>2]|0)|0)!=0)<<31>>31;i=b;return l|0}else if((d|0)==5){i=b;return e|0}return 0}function xh(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0;f=i;a:do{if((a[b+44|0]|0)==0){if((e|0)>0){g=0;while(1){if((Yc[c[(c[b>>2]|0)+52>>2]&63](b,c[d>>2]|0)|0)==-1){break a}g=g+1|0;if((g|0)<(e|0)){d=d+4|0}else{break}}}else{g=0}}else{g=Cb(d|0,4,e|0,c[b+32>>2]|0)|0}}while(0);i=f;return g|0}function yh(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0;e=i;i=i+32|0;j=e+16|0;p=e+8|0;h=e+4|0;k=e;f=(d|0)==-1;a:do{if(!f){c[p>>2]=d;if((a[b+44|0]|0)!=0){if((Cb(p|0,4,1,c[b+32>>2]|0)|0)==1){break}else{d=-1}i=e;return d|0}c[h>>2]=j;l=p+4|0;n=b+36|0;o=b+40|0;g=j+8|0;m=j;b=b+32|0;while(1){q=c[n>>2]|0;q=Uc[c[(c[q>>2]|0)+12>>2]&15](q,c[o>>2]|0,p,l,k,j,g,h)|0;if((c[k>>2]|0)==(p|0)){d=-1;g=12;break}if((q|0)==3){g=7;break}r=(q|0)==1;if(!(q>>>0<2)){d=-1;g=12;break}q=(c[h>>2]|0)-m|0;if((Cb(j|0,1,q|0,c[b>>2]|0)|0)!=(q|0)){d=-1;g=12;break}if(r){p=r?c[k>>2]|0:p}else{break a}}if((g|0)==7){if((Cb(p|0,1,1,c[b>>2]|0)|0)==1){break}else{d=-1}i=e;return d|0}else if((g|0)==12){i=e;return d|0}}}while(0);r=f?0:d;i=e;return r|0}function zh(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0;f=i;i=i+16|0;g=f;c[b>>2]=9272;h=b+4|0;Yn(h);j=b+8|0;c[j+0>>2]=0;c[j+4>>2]=0;c[j+8>>2]=0;c[j+12>>2]=0;c[j+16>>2]=0;c[j+20>>2]=0;c[b>>2]=8384;c[b+32>>2]=d;c[b+40>>2]=e;c[b+48>>2]=-1;a[b+52|0]=0;Zn(g,h);h=$n(g,12008)|0;e=b+36|0;c[e>>2]=h;d=b+44|0;c[d>>2]=Pc[c[(c[h>>2]|0)+24>>2]&127](h)|0;e=c[e>>2]|0;a[b+53|0]=(Pc[c[(c[e>>2]|0)+28>>2]&127](e)|0)&1;if((c[d>>2]|0)>8){jn(8480)}else{_n(g);i=f;return}}function Ah(a){a=a|0;var b=0;b=i;c[a>>2]=9272;_n(a+4|0);i=b;return}function Bh(a){a=a|0;var b=0;b=i;c[a>>2]=9272;_n(a+4|0);Yq(a);i=b;return}function Ch(b,d){b=b|0;d=d|0;var e=0,f=0,g=0;e=i;g=$n(d,12008)|0;f=b+36|0;c[f>>2]=g;d=b+44|0;c[d>>2]=Pc[c[(c[g>>2]|0)+24>>2]&127](g)|0;f=c[f>>2]|0;a[b+53|0]=(Pc[c[(c[f>>2]|0)+28>>2]&127](f)|0)&1;if((c[d>>2]|0)>8){jn(8480)}else{i=e;return}}function Dh(a){a=a|0;var b=0;b=i;a=Gh(a,0)|0;i=b;return a|0}function Eh(a){a=a|0;var b=0;b=i;a=Gh(a,1)|0;i=b;return a|0}function Fh(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0;e=i;i=i+32|0;j=e+16|0;f=e+8|0;l=e+4|0;k=e;g=b+52|0;m=(a[g]|0)!=0;if((d|0)==-1){if(m){m=-1;i=e;return m|0}m=c[b+48>>2]|0;a[g]=(m|0)!=-1|0;i=e;return m|0}h=b+48|0;a:do{if(m){c[l>>2]=c[h>>2];m=c[b+36>>2]|0;k=Uc[c[(c[m>>2]|0)+12>>2]&15](m,c[b+40>>2]|0,l,l+4|0,k,j,j+8|0,f)|0;if((k|0)==3){a[j]=c[h>>2];c[f>>2]=j+1}else if((k|0)==1|(k|0)==2){m=-1;i=e;return m|0}b=b+32|0;while(1){k=c[f>>2]|0;if(!(k>>>0>j>>>0)){break a}m=k+ -1|0;c[f>>2]=m;if((kc(a[m]|0,c[b>>2]|0)|0)==-1){f=-1;break}}i=e;return f|0}}while(0);c[h>>2]=d;a[g]=1;m=d;i=e;return m|0}function Gh(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0;e=i;i=i+32|0;f=e+16|0;h=e+8|0;m=e+4|0;l=e;n=b+52|0;if((a[n]|0)!=0){f=b+48|0;g=c[f>>2]|0;if(!d){v=g;i=e;return v|0}c[f>>2]=-1;a[n]=0;v=g;i=e;return v|0}n=c[b+44>>2]|0;s=(n|0)>1?n:1;a:do{if((s|0)>0){n=b+32|0;o=0;while(1){p=dc(c[n>>2]|0)|0;if((p|0)==-1){j=-1;break}a[f+o|0]=p;o=o+1|0;if((o|0)>=(s|0)){break a}}i=e;return j|0}}while(0);b:do{if((a[b+53|0]|0)==0){p=b+40|0;o=b+36|0;n=h+4|0;q=b+32|0;while(1){v=c[p>>2]|0;u=v;t=c[u>>2]|0;u=c[u+4>>2]|0;w=c[o>>2]|0;r=f+s|0;v=Uc[c[(c[w>>2]|0)+16>>2]&15](w,v,f,r,m,h,n,l)|0;if((v|0)==3){g=14;break}else if((v|0)==2){j=-1;g=22;break}else if((v|0)!=1){k=s;break b}w=c[p>>2]|0;c[w>>2]=t;c[w+4>>2]=u;if((s|0)==8){j=-1;g=22;break}t=dc(c[q>>2]|0)|0;if((t|0)==-1){j=-1;g=22;break}a[r]=t;s=s+1|0}if((g|0)==14){c[h>>2]=a[f]|0;k=s;break}else if((g|0)==22){i=e;return j|0}}else{c[h>>2]=a[f]|0;k=s}}while(0);if(d){w=c[h>>2]|0;c[b+48>>2]=w;i=e;return w|0}d=b+32|0;while(1){if((k|0)<=0){break}k=k+ -1|0;if((kc(a[f+k|0]|0,c[d>>2]|0)|0)==-1){j=-1;g=22;break}}if((g|0)==22){i=e;return j|0}w=c[h>>2]|0;i=e;return w|0}function Hh(a){a=a|0;var b=0;b=i;c[a>>2]=9208;_n(a+4|0);i=b;return}function Ih(a){a=a|0;var b=0;b=i;c[a>>2]=9208;_n(a+4|0);Yq(a);i=b;return}function Jh(b,d){b=b|0;d=d|0;var e=0;e=i;Pc[c[(c[b>>2]|0)+24>>2]&127](b)|0;d=$n(d,12e3)|0;c[b+36>>2]=d;a[b+44|0]=(Pc[c[(c[d>>2]|0)+28>>2]&127](d)|0)&1;i=e;return}function Kh(a){a=a|0;var b=0,d=0,e=0,f=0,g=0,h=0,j=0,k=0,l=0;b=i;i=i+16|0;g=b+8|0;d=b;e=a+36|0;f=a+40|0;h=g+8|0;j=g;a=a+32|0;while(1){k=c[e>>2]|0;k=Zc[c[(c[k>>2]|0)+20>>2]&31](k,c[f>>2]|0,g,h,d)|0;l=(c[d>>2]|0)-j|0;if((Cb(g|0,1,l|0,c[a>>2]|0)|0)!=(l|0)){e=-1;d=5;break}if((k|0)==2){e=-1;d=5;break}else if((k|0)!=1){d=4;break}}if((d|0)==4){l=((lc(c[a>>2]|0)|0)!=0)<<31>>31;i=b;return l|0}else if((d|0)==5){i=b;return e|0}return 0}function Lh(b,e,f){b=b|0;e=e|0;f=f|0;var g=0,h=0;g=i;if((a[b+44|0]|0)!=0){h=Cb(e|0,1,f|0,c[b+32>>2]|0)|0;i=g;return h|0}if((f|0)>0){h=0}else{h=0;i=g;return h|0}while(1){if((Yc[c[(c[b>>2]|0)+52>>2]&63](b,d[e]|0)|0)==-1){f=6;break}h=h+1|0;if((h|0)<(f|0)){e=e+1|0}else{f=6;break}}if((f|0)==6){i=g;return h|0}return 0}function Mh(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0;e=i;i=i+32|0;j=e+16|0;p=e+8|0;h=e+4|0;k=e;f=(d|0)==-1;a:do{if(!f){a[p]=d;if((a[b+44|0]|0)!=0){if((Cb(p|0,1,1,c[b+32>>2]|0)|0)==1){break}else{d=-1}i=e;return d|0}c[h>>2]=j;l=p+1|0;n=b+36|0;o=b+40|0;g=j+8|0;m=j;b=b+32|0;while(1){q=c[n>>2]|0;q=Uc[c[(c[q>>2]|0)+12>>2]&15](q,c[o>>2]|0,p,l,k,j,g,h)|0;if((c[k>>2]|0)==(p|0)){d=-1;g=12;break}if((q|0)==3){g=7;break}r=(q|0)==1;if(!(q>>>0<2)){d=-1;g=12;break}q=(c[h>>2]|0)-m|0;if((Cb(j|0,1,q|0,c[b>>2]|0)|0)!=(q|0)){d=-1;g=12;break}if(r){p=r?c[k>>2]|0:p}else{break a}}if((g|0)==7){if((Cb(p|0,1,1,c[b>>2]|0)|0)==1){break}else{d=-1}i=e;return d|0}else if((g|0)==12){i=e;return d|0}}}while(0);r=f?0:d;i=e;return r|0}function Nh(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0;f=i;i=i+16|0;g=f;c[b>>2]=9208;h=b+4|0;Yn(h);j=b+8|0;c[j+0>>2]=0;c[j+4>>2]=0;c[j+8>>2]=0;c[j+12>>2]=0;c[j+16>>2]=0;c[j+20>>2]=0;c[b>>2]=8640;c[b+32>>2]=d;c[b+40>>2]=e;c[b+48>>2]=-1;a[b+52|0]=0;Zn(g,h);h=$n(g,12e3)|0;e=b+36|0;c[e>>2]=h;d=b+44|0;c[d>>2]=Pc[c[(c[h>>2]|0)+24>>2]&127](h)|0;e=c[e>>2]|0;a[b+53|0]=(Pc[c[(c[e>>2]|0)+28>>2]&127](e)|0)&1;if((c[d>>2]|0)>8){jn(8480)}else{_n(g);i=f;return}}function Oh(a){a=a|0;var b=0;b=i;c[a>>2]=9208;_n(a+4|0);i=b;return}function Ph(a){a=a|0;var b=0;b=i;c[a>>2]=9208;_n(a+4|0);Yq(a);i=b;return}function Qh(b,d){b=b|0;d=d|0;var e=0,f=0,g=0;e=i;g=$n(d,12e3)|0;f=b+36|0;c[f>>2]=g;d=b+44|0;c[d>>2]=Pc[c[(c[g>>2]|0)+24>>2]&127](g)|0;f=c[f>>2]|0;a[b+53|0]=(Pc[c[(c[f>>2]|0)+28>>2]&127](f)|0)&1;if((c[d>>2]|0)>8){jn(8480)}else{i=e;return}}function Rh(a){a=a|0;var b=0;b=i;a=Uh(a,0)|0;i=b;return a|0}function Sh(a){a=a|0;var b=0;b=i;a=Uh(a,1)|0;i=b;return a|0}function Th(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0;e=i;i=i+32|0;j=e+16|0;f=e+4|0;l=e+8|0;k=e;g=b+52|0;m=(a[g]|0)!=0;if((d|0)==-1){if(m){m=-1;i=e;return m|0}m=c[b+48>>2]|0;a[g]=(m|0)!=-1|0;i=e;return m|0}h=b+48|0;a:do{if(m){a[l]=c[h>>2];m=c[b+36>>2]|0;k=Uc[c[(c[m>>2]|0)+12>>2]&15](m,c[b+40>>2]|0,l,l+1|0,k,j,j+8|0,f)|0;if((k|0)==3){a[j]=c[h>>2];c[f>>2]=j+1}else if((k|0)==1|(k|0)==2){m=-1;i=e;return m|0}b=b+32|0;while(1){k=c[f>>2]|0;if(!(k>>>0>j>>>0)){break a}m=k+ -1|0;c[f>>2]=m;if((kc(a[m]|0,c[b>>2]|0)|0)==-1){f=-1;break}}i=e;return f|0}}while(0);c[h>>2]=d;a[g]=1;m=d;i=e;return m|0}function Uh(b,e){b=b|0;e=e|0;var f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0;f=i;i=i+32|0;h=f+16|0;k=f+8|0;n=f+4|0;m=f;o=b+52|0;if((a[o]|0)!=0){g=b+48|0;h=c[g>>2]|0;if(!e){w=h;i=f;return w|0}c[g>>2]=-1;a[o]=0;w=h;i=f;return w|0}o=c[b+44>>2]|0;s=(o|0)>1?o:1;a:do{if((s|0)>0){o=b+32|0;p=0;while(1){q=dc(c[o>>2]|0)|0;if((q|0)==-1){g=-1;break}a[h+p|0]=q;p=p+1|0;if((p|0)>=(s|0)){break a}}i=f;return g|0}}while(0);b:do{if((a[b+53|0]|0)==0){q=b+40|0;p=b+36|0;o=k+1|0;r=b+32|0;while(1){w=c[q>>2]|0;v=w;u=c[v>>2]|0;v=c[v+4>>2]|0;x=c[p>>2]|0;t=h+s|0;w=Uc[c[(c[x>>2]|0)+16>>2]&15](x,w,h,t,n,k,o,m)|0;if((w|0)==2){g=-1;m=23;break}else if((w|0)==3){m=14;break}else if((w|0)!=1){l=s;break b}x=c[q>>2]|0;c[x>>2]=u;c[x+4>>2]=v;if((s|0)==8){g=-1;m=23;break}u=dc(c[r>>2]|0)|0;if((u|0)==-1){g=-1;m=23;break}a[t]=u;s=s+1|0}if((m|0)==14){a[k]=a[h]|0;l=s;break}else if((m|0)==23){i=f;return g|0}}else{a[k]=a[h]|0;l=s}}while(0);do{if(!e){e=b+32|0;while(1){if((l|0)<=0){m=21;break}l=l+ -1|0;if((kc(d[h+l|0]|0,c[e>>2]|0)|0)==-1){g=-1;m=23;break}}if((m|0)==21){j=a[k]|0;break}else if((m|0)==23){i=f;return g|0}}else{j=a[k]|0;c[b+48>>2]=j&255}}while(0);x=j&255;i=f;return x|0}function Vh(){var a=0;a=i;rh(0);Fc(143,7904,p|0)|0;i=a;return}function Wh(a){a=a|0;return}function Xh(a){a=a|0;a=a+4|0;c[a>>2]=(c[a>>2]|0)+1;return}function Yh(a){a=a|0;var b=0,d=0,e=0;b=i;e=a+4|0;d=c[e>>2]|0;c[e>>2]=d+ -1;if((d|0)!=0){e=0;i=b;return e|0}Lc[c[(c[a>>2]|0)+8>>2]&255](a);e=1;i=b;return e|0}function Zh(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0;d=i;c[a>>2]=8784;e=rr(b|0)|0;g=Xq(e+13|0)|0;c[g+4>>2]=e;c[g>>2]=e;f=g+12|0;c[a+4>>2]=f;c[g+8>>2]=0;ur(f|0,b|0,e+1|0)|0;i=d;return}function _h(a){a=a|0;var b=0,d=0,e=0,f=0;b=i;c[a>>2]=8784;d=a+4|0;f=(c[d>>2]|0)+ -4|0;e=c[f>>2]|0;c[f>>2]=e+ -1;if((e+ -1|0)<0){Zq((c[d>>2]|0)+ -12|0)}bb(a|0);Yq(a);i=b;return}function $h(a){a=a|0;var b=0,d=0,e=0,f=0;b=i;c[a>>2]=8784;d=a+4|0;f=(c[d>>2]|0)+ -4|0;e=c[f>>2]|0;c[f>>2]=e+ -1;if((e+ -1|0)>=0){bb(a|0);i=b;return}Zq((c[d>>2]|0)+ -12|0);bb(a|0);i=b;return}function ai(a){a=a|0;return c[a+4>>2]|0}function bi(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0;e=i;c[b>>2]=8808;if((a[d]&1)==0){d=d+1|0}else{d=c[d+8>>2]|0}f=rr(d|0)|0;h=Xq(f+13|0)|0;c[h+4>>2]=f;c[h>>2]=f;g=h+12|0;c[b+4>>2]=g;c[h+8>>2]=0;ur(g|0,d|0,f+1|0)|0;i=e;return}function ci(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0;d=i;c[a>>2]=8808;e=rr(b|0)|0;g=Xq(e+13|0)|0;c[g+4>>2]=e;c[g>>2]=e;f=g+12|0;c[a+4>>2]=f;c[g+8>>2]=0;ur(f|0,b|0,e+1|0)|0;i=d;return}function di(a){a=a|0;var b=0,d=0,e=0,f=0;b=i;c[a>>2]=8808;d=a+4|0;f=(c[d>>2]|0)+ -4|0;e=c[f>>2]|0;c[f>>2]=e+ -1;if((e+ -1|0)<0){Zq((c[d>>2]|0)+ -12|0)}bb(a|0);Yq(a);i=b;return}function ei(a){a=a|0;var b=0,d=0,e=0,f=0;b=i;c[a>>2]=8808;d=a+4|0;f=(c[d>>2]|0)+ -4|0;e=c[f>>2]|0;c[f>>2]=e+ -1;if((e+ -1|0)>=0){bb(a|0);i=b;return}Zq((c[d>>2]|0)+ -12|0);bb(a|0);i=b;return}function fi(a){a=a|0;return c[a+4>>2]|0}function gi(a){a=a|0;var b=0,d=0,e=0,f=0;b=i;c[a>>2]=8784;d=a+4|0;f=(c[d>>2]|0)+ -4|0;e=c[f>>2]|0;c[f>>2]=e+ -1;if((e+ -1|0)<0){Zq((c[d>>2]|0)+ -12|0)}bb(a|0);Yq(a);i=b;return}function hi(a){a=a|0;return}function ii(a,b,d){a=a|0;b=b|0;d=d|0;c[a>>2]=d;c[a+4>>2]=b;return}function ji(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0;e=i;i=i+16|0;f=e;Rc[c[(c[a>>2]|0)+12>>2]&7](f,a,b);if((c[f+4>>2]|0)!=(c[d+4>>2]|0)){a=0;i=e;return a|0}a=(c[f>>2]|0)==(c[d>>2]|0);i=e;return a|0}function ki(a,b,d){a=a|0;b=b|0;d=d|0;var e=0;e=i;if((c[b+4>>2]|0)!=(a|0)){a=0;i=e;return a|0}a=(c[b>>2]|0)==(d|0);i=e;return a|0}function li(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0;d=i;f=Cc(e|0)|0;e=rr(f|0)|0;if(e>>>0>4294967279){ri(0)}if(e>>>0<11){a[b]=e<<1;b=b+1|0;ur(b|0,f|0,e|0)|0;f=b+e|0;a[f]=0;i=d;return}else{h=e+16&-16;g=Wq(h)|0;c[b+8>>2]=g;c[b>>2]=h|1;c[b+4>>2]=e;b=g;ur(b|0,f|0,e|0)|0;f=b+e|0;a[f]=0;i=d;return}}function mi(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0;g=i;i=i+16|0;f=g;h=c[d>>2]|0;if((h|0)!=0){j=a[e]|0;if((j&1)==0){j=(j&255)>>>1}else{j=c[e+4>>2]|0}if((j|0)!=0){Ci(e,8960,2)|0;h=c[d>>2]|0}j=c[d+4>>2]|0;Rc[c[(c[j>>2]|0)+24>>2]&7](f,j,h);h=a[f]|0;if((h&1)==0){d=f+1|0;h=(h&255)>>>1}else{d=c[f+8>>2]|0;h=c[f+4>>2]|0}Ci(e,d,h)|0;if(!((a[f]&1)==0)){Yq(c[f+8>>2]|0)}}c[b+0>>2]=c[e+0>>2];c[b+4>>2]=c[e+4>>2];c[b+8>>2]=c[e+8>>2];c[e+0>>2]=0;c[e+4>>2]=0;c[e+8>>2]=0;i=g;return}function ni(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0,k=0,l=0;f=i;i=i+32|0;h=f+12|0;g=f;j=rr(e|0)|0;if(j>>>0>4294967279){ri(0)}if(j>>>0<11){a[g]=j<<1;k=g+1|0}else{l=j+16&-16;k=Wq(l)|0;c[g+8>>2]=k;c[g>>2]=l|1;c[g+4>>2]=j}ur(k|0,e|0,j|0)|0;a[k+j|0]=0;mi(h,d,g);bi(b,h);if(!((a[h]&1)==0)){Yq(c[h+8>>2]|0)}if(!((a[g]&1)==0)){Yq(c[g+8>>2]|0)}c[b>>2]=8976;e=d;k=c[e+4>>2]|0;l=b+8|0;c[l>>2]=c[e>>2];c[l+4>>2]=k;i=f;return}function oi(a){a=a|0;var b=0;b=i;ei(a);Yq(a);i=b;return}function pi(a){a=a|0;var b=0;b=i;ei(a);i=b;return}function qi(a,b,d){a=a|0;b=b|0;d=d|0;var e=0;e=i;Eb(9112)|0;if((c[a>>2]|0)==1){do{jc(9136,9112)|0}while((c[a>>2]|0)==1)}if((c[a>>2]|0)==0){c[a>>2]=1;tc(9112)|0;Lc[d&255](b);Eb(9112)|0;c[a>>2]=-1;tc(9112)|0;bc(9136)|0;i=e;return}else{tc(9112)|0;i=e;return}}function ri(a){a=a|0;a=Nb(8)|0;Zh(a,9184);c[a>>2]=8864;Ac(a|0,8904,42)}function si(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0;e=i;if((a[d]&1)==0){c[b+0>>2]=c[d+0>>2];c[b+4>>2]=c[d+4>>2];c[b+8>>2]=c[d+8>>2];i=e;return}f=c[d+8>>2]|0;d=c[d+4>>2]|0;if(d>>>0>4294967279){ri(0)}if(d>>>0<11){a[b]=d<<1;b=b+1|0}else{h=d+16&-16;g=Wq(h)|0;c[b+8>>2]=g;c[b>>2]=h|1;c[b+4>>2]=d;b=g}ur(b|0,f|0,d|0)|0;a[b+d|0]=0;i=e;return}function ti(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0;f=i;if(e>>>0>4294967279){ri(0)}if(e>>>0<11){a[b]=e<<1;b=b+1|0}else{h=e+16&-16;g=Wq(h)|0;c[b+8>>2]=g;c[b>>2]=h|1;c[b+4>>2]=e;b=g}ur(b|0,d|0,e|0)|0;a[b+e|0]=0;i=f;return}function ui(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0;f=i;if(d>>>0>4294967279){ri(0)}if(d>>>0<11){a[b]=d<<1;b=b+1|0}else{h=d+16&-16;g=Wq(h)|0;c[b+8>>2]=g;c[b>>2]=h|1;c[b+4>>2]=d;b=g}wr(b|0,e|0,d|0)|0;a[b+d|0]=0;i=f;return}function vi(b){b=b|0;var d=0;d=i;if((a[b]&1)==0){i=d;return}Yq(c[b+8>>2]|0);i=d;return}function wi(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0;e=i;if((b|0)==(d|0)){i=e;return b|0}f=a[d]|0;if((f&1)==0){f=(f&255)>>>1;d=d+1|0}else{f=c[d+4>>2]|0;d=c[d+8>>2]|0}j=a[b]|0;if((j&1)==0){g=10}else{j=c[b>>2]|0;g=(j&-2)+ -1|0;j=j&255}h=(j&1)==0;if(g>>>0<f>>>0){if(h){h=(j&255)>>>1}else{h=c[b+4>>2]|0}Di(b,g,f-g|0,h,0,h,f,d);i=e;return b|0}if(h){g=b+1|0}else{g=c[b+8>>2]|0}vr(g|0,d|0,f|0)|0;a[g+f|0]=0;if((a[b]&1)==0){a[b]=f<<1;i=e;return b|0}else{c[b+4>>2]=f;i=e;return b|0}return 0}function xi(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0;f=i;e=rr(d|0)|0;h=a[b]|0;if((h&1)==0){g=10}else{g=c[b>>2]|0;h=g&255;g=(g&-2)+ -1|0}j=(h&1)==0;if(g>>>0<e>>>0){if(j){h=(h&255)>>>1}else{h=c[b+4>>2]|0}Di(b,g,e-g|0,h,0,h,e,d);i=f;return b|0}if(j){g=b+1|0}else{g=c[b+8>>2]|0}vr(g|0,d|0,e|0)|0;a[g+e|0]=0;if((a[b]&1)==0){a[b]=e<<1;i=f;return b|0}else{c[b+4>>2]=e;i=f;return b|0}return 0}function yi(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0;f=i;h=a[b]|0;g=(h&1)==0;if(g){h=(h&255)>>>1}else{h=c[b+4>>2]|0}if(h>>>0<d>>>0){zi(b,d-h|0,e)|0;i=f;return}if(g){a[b+d+1|0]=0;a[b]=d<<1;i=f;return}else{a[(c[b+8>>2]|0)+d|0]=0;c[b+4>>2]=d;i=f;return}}function zi(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0;f=i;if((d|0)==0){i=f;return b|0}j=a[b]|0;if((j&1)==0){h=10}else{j=c[b>>2]|0;h=(j&-2)+ -1|0;j=j&255}if((j&1)==0){g=(j&255)>>>1}else{g=c[b+4>>2]|0}if((h-g|0)>>>0<d>>>0){Ei(b,h,d-h+g|0,g,g,0,0);j=a[b]|0}if((j&1)==0){h=b+1|0}else{h=c[b+8>>2]|0}wr(h+g|0,e|0,d|0)|0;e=g+d|0;if((a[b]&1)==0){a[b]=e<<1}else{c[b+4>>2]=e}a[h+e|0]=0;i=f;return b|0}function Ai(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0;e=i;if(d>>>0>4294967279){ri(0)}g=a[b]|0;if((g&1)==0){h=10}else{g=c[b>>2]|0;h=(g&-2)+ -1|0;g=g&255}if((g&1)==0){f=(g&255)>>>1}else{f=c[b+4>>2]|0}d=f>>>0>d>>>0?f:d;if(d>>>0<11){d=10}else{d=(d+16&-16)+ -1|0}if((d|0)==(h|0)){i=e;return}do{if((d|0)!=10){j=d+1|0;if(d>>>0>h>>>0){k=Wq(j)|0}else{k=Wq(j)|0}if((g&1)==0){l=1;j=b+1|0;h=0;break}else{l=1;j=c[b+8>>2]|0;h=1;break}}else{k=b+1|0;l=0;j=c[b+8>>2]|0;h=1}}while(0);if((g&1)==0){g=(g&255)>>>1}else{g=c[b+4>>2]|0}ur(k|0,j|0,g+1|0)|0;if(h){Yq(j)}if(l){c[b>>2]=d+1|1;c[b+4>>2]=f;c[b+8>>2]=k;i=e;return}else{a[b]=f<<1;i=e;return}}function Bi(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0;e=i;g=a[b]|0;f=(g&1)!=0;if(f){h=(c[b>>2]&-2)+ -1|0;g=c[b+4>>2]|0}else{h=10;g=(g&255)>>>1}if((g|0)==(h|0)){Ei(b,h,1,h,h,0,0);if((a[b]&1)==0){f=7}else{f=8}}else{if(f){f=8}else{f=7}}if((f|0)==7){a[b]=(g<<1)+2;f=b+1|0;h=g+1|0;g=f+g|0;a[g]=d;h=f+h|0;a[h]=0;i=e;return}else if((f|0)==8){f=c[b+8>>2]|0;h=g+1|0;c[b+4>>2]=h;g=f+g|0;a[g]=d;h=f+h|0;a[h]=0;i=e;return}}function Ci(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0;f=i;j=a[b]|0;if((j&1)==0){g=10}else{j=c[b>>2]|0;g=(j&-2)+ -1|0;j=j&255}if((j&1)==0){h=(j&255)>>>1}else{h=c[b+4>>2]|0}if((g-h|0)>>>0<e>>>0){Di(b,g,e-g+h|0,h,h,0,e,d);i=f;return b|0}if((e|0)==0){i=f;return b|0}if((j&1)==0){g=b+1|0}else{g=c[b+8>>2]|0}ur(g+h|0,d|0,e|0)|0;e=h+e|0;if((a[b]&1)==0){a[b]=e<<1}else{c[b+4>>2]=e}a[g+e|0]=0;i=f;return b|0}function Di(b,d,e,f,g,h,j,k){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0;m=i;if((-18-d|0)>>>0<e>>>0){ri(0)}if((a[b]&1)==0){l=b+1|0}else{l=c[b+8>>2]|0}if(d>>>0<2147483623){n=e+d|0;e=d<<1;e=n>>>0<e>>>0?e:n;if(e>>>0<11){e=11}else{e=e+16&-16}}else{e=-17}n=Wq(e)|0;if((g|0)!=0){ur(n|0,l|0,g|0)|0}if((j|0)!=0){ur(n+g|0,k|0,j|0)|0}k=f-h|0;if((k|0)!=(g|0)){ur(n+(j+g)|0,l+(h+g)|0,k-g|0)|0}if((d|0)==10){f=b+8|0;c[f>>2]=n;e=e|1;c[b>>2]=e;e=k+j|0;f=b+4|0;c[f>>2]=e;n=n+e|0;a[n]=0;i=m;return}Yq(l);f=b+8|0;c[f>>2]=n;e=e|1;c[b>>2]=e;e=k+j|0;f=b+4|0;c[f>>2]=e;n=n+e|0;a[n]=0;i=m;return}function Ei(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0;l=i;if((-17-d|0)>>>0<e>>>0){ri(0)}if((a[b]&1)==0){k=b+1|0}else{k=c[b+8>>2]|0}if(d>>>0<2147483623){m=e+d|0;e=d<<1;e=m>>>0<e>>>0?e:m;if(e>>>0<11){e=11}else{e=e+16&-16}}else{e=-17}m=Wq(e)|0;if((g|0)!=0){ur(m|0,k|0,g|0)|0}f=f-h|0;if((f|0)!=(g|0)){ur(m+(j+g)|0,k+(h+g)|0,f-g|0)|0}if((d|0)==10){f=b+8|0;c[f>>2]=m;m=e|1;c[b>>2]=m;i=l;return}Yq(k);f=b+8|0;c[f>>2]=m;m=e|1;c[b>>2]=m;i=l;return}function Fi(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0;f=i;if(e>>>0>1073741807){ri(0)}if(e>>>0<2){a[b]=e<<1;b=b+4|0}else{h=e+4&-4;g=Wq(h<<2)|0;c[b+8>>2]=g;c[b>>2]=h|1;c[b+4>>2]=e;b=g}sq(b,d,e)|0;c[b+(e<<2)>>2]=0;i=f;return}function Gi(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0;f=i;if(d>>>0>1073741807){ri(0)}if(d>>>0<2){a[b]=d<<1;b=b+4|0}else{h=d+4&-4;g=Wq(h<<2)|0;c[b+8>>2]=g;c[b>>2]=h|1;c[b+4>>2]=d;b=g}uq(b,e,d)|0;c[b+(d<<2)>>2]=0;i=f;return}function Hi(b){b=b|0;var d=0;d=i;if((a[b]&1)==0){i=d;return}Yq(c[b+8>>2]|0);i=d;return}function Ii(a,b){a=a|0;b=b|0;var c=0;c=i;a=Ji(a,b,rq(b)|0)|0;i=c;return a|0}function Ji(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0;f=i;h=a[b]|0;if((h&1)==0){g=1}else{h=c[b>>2]|0;g=(h&-2)+ -1|0;h=h&255}j=(h&1)==0;if(g>>>0<e>>>0){if(j){h=(h&255)>>>1}else{h=c[b+4>>2]|0}Mi(b,g,e-g|0,h,0,h,e,d);i=f;return b|0}if(j){g=b+4|0}else{g=c[b+8>>2]|0}tq(g,d,e)|0;c[g+(e<<2)>>2]=0;if((a[b]&1)==0){a[b]=e<<1;i=f;return b|0}else{c[b+4>>2]=e;i=f;return b|0}return 0}function Ki(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0;e=i;if(d>>>0>1073741807){ri(0)}g=a[b]|0;if((g&1)==0){h=1}else{g=c[b>>2]|0;h=(g&-2)+ -1|0;g=g&255}if((g&1)==0){f=(g&255)>>>1}else{f=c[b+4>>2]|0}d=f>>>0>d>>>0?f:d;if(d>>>0<2){d=1}else{d=(d+4&-4)+ -1|0}if((d|0)==(h|0)){i=e;return}do{if((d|0)!=1){j=(d<<2)+4|0;if(d>>>0>h>>>0){k=Wq(j)|0}else{k=Wq(j)|0}if((g&1)==0){l=1;j=b+4|0;h=0;break}else{l=1;j=c[b+8>>2]|0;h=1;break}}else{k=b+4|0;l=0;j=c[b+8>>2]|0;h=1}}while(0);if((g&1)==0){g=(g&255)>>>1}else{g=c[b+4>>2]|0}sq(k,j,g+1|0)|0;if(h){Yq(j)}if(l){c[b>>2]=d+1|1;c[b+4>>2]=f;c[b+8>>2]=k;i=e;return}else{a[b]=f<<1;i=e;return}}function Li(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0;e=i;g=a[b]|0;f=(g&1)!=0;if(f){h=(c[b>>2]&-2)+ -1|0;g=c[b+4>>2]|0}else{h=1;g=(g&255)>>>1}if((g|0)==(h|0)){Ni(b,h,1,h,h,0,0);if((a[b]&1)==0){f=7}else{f=8}}else{if(f){f=8}else{f=7}}if((f|0)==7){a[b]=(g<<1)+2;f=b+4|0;h=g+1|0;g=f+(g<<2)|0;c[g>>2]=d;h=f+(h<<2)|0;c[h>>2]=0;i=e;return}else if((f|0)==8){f=c[b+8>>2]|0;h=g+1|0;c[b+4>>2]=h;g=f+(g<<2)|0;c[g>>2]=d;h=f+(h<<2)|0;c[h>>2]=0;i=e;return}}function Mi(b,d,e,f,g,h,j,k){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0;m=i;if((1073741806-d|0)>>>0<e>>>0){ri(0)}if((a[b]&1)==0){l=b+4|0}else{l=c[b+8>>2]|0}if(d>>>0<536870887){n=e+d|0;e=d<<1;e=n>>>0<e>>>0?e:n;if(e>>>0<2){e=2}else{e=e+4&-4}}else{e=1073741807}n=Wq(e<<2)|0;if((g|0)!=0){sq(n,l,g)|0}if((j|0)!=0){sq(n+(g<<2)|0,k,j)|0}k=f-h|0;if((k|0)!=(g|0)){sq(n+(j+g<<2)|0,l+(h+g<<2)|0,k-g|0)|0}if((d|0)==1){f=b+8|0;c[f>>2]=n;e=e|1;c[b>>2]=e;e=k+j|0;f=b+4|0;c[f>>2]=e;n=n+(e<<2)|0;c[n>>2]=0;i=m;return}Yq(l);f=b+8|0;c[f>>2]=n;e=e|1;c[b>>2]=e;e=k+j|0;f=b+4|0;c[f>>2]=e;n=n+(e<<2)|0;c[n>>2]=0;i=m;return}function Ni(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0;l=i;if((1073741807-d|0)>>>0<e>>>0){ri(0)}if((a[b]&1)==0){k=b+4|0}else{k=c[b+8>>2]|0}if(d>>>0<536870887){m=e+d|0;e=d<<1;e=m>>>0<e>>>0?e:m;if(e>>>0<2){e=2}else{e=e+4&-4}}else{e=1073741807}m=Wq(e<<2)|0;if((g|0)!=0){sq(m,k,g)|0}f=f-h|0;if((f|0)!=(g|0)){sq(m+(j+g<<2)|0,k+(h+g<<2)|0,f-g|0)|0}if((d|0)==1){f=b+8|0;c[f>>2]=m;m=e|1;c[b>>2]=m;i=l;return}Yq(k);f=b+8|0;c[f>>2]=m;m=e|1;c[b>>2]=m;i=l;return}function Oi(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0;g=i;i=i+16|0;f=g+8|0;e=g;h=(c[b+24>>2]|0)==0;if(h){c[b+16>>2]=d|1}else{c[b+16>>2]=d}if(((h&1|d)&c[b+20>>2]|0)==0){i=g;return}d=Nb(16)|0;if((a[9552]|0)==0?(Ia(9552)|0)!=0:0){c[2386]=10248;Fc(69,9544,p|0)|0;nb(9552)}b=e;c[b>>2]=1;c[b+4>>2]=9544;c[f+0>>2]=c[e+0>>2];c[f+4>>2]=c[e+4>>2];ni(d,f,9600);c[d>>2]=9568;Ac(d|0,9648,65)}function Pi(a){a=a|0;var b=0,d=0,e=0,f=0;e=i;c[a>>2]=9592;f=c[a+40>>2]|0;b=a+32|0;d=a+36|0;if((f|0)!=0){do{f=f+ -1|0;Rc[c[(c[b>>2]|0)+(f<<2)>>2]&7](0,a,c[(c[d>>2]|0)+(f<<2)>>2]|0)}while((f|0)!=0)}_n(a+28|0);Sq(c[b>>2]|0);Sq(c[d>>2]|0);Sq(c[a+48>>2]|0);Sq(c[a+60>>2]|0);i=e;return}function Qi(a,b){a=a|0;b=b|0;var c=0;c=i;Zn(a,b+28|0);i=c;return}function Ri(a,b){a=a|0;b=b|0;var d=0,e=0;d=i;c[a+24>>2]=b;c[a+16>>2]=(b|0)==0;c[a+20>>2]=0;c[a+4>>2]=4098;c[a+12>>2]=0;c[a+8>>2]=6;b=a+28|0;e=a+32|0;a=e+40|0;do{c[e>>2]=0;e=e+4|0}while((e|0)<(a|0));Yn(b);i=d;return}function Si(a){a=a|0;var b=0;b=i;c[a>>2]=9208;_n(a+4|0);Yq(a);i=b;return}function Ti(a){a=a|0;var b=0;b=i;c[a>>2]=9208;_n(a+4|0);i=b;return}function Ui(a,b){a=a|0;b=b|0;return}function Vi(a,b,c){a=a|0;b=b|0;c=c|0;return a|0}function Wi(a,b,d,e,f,g){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;g=a;c[g>>2]=0;c[g+4>>2]=0;g=a+8|0;c[g>>2]=-1;c[g+4>>2]=-1;return}function Xi(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;e=a;c[e>>2]=0;c[e+4>>2]=0;e=a+8|0;c[e>>2]=-1;c[e+4>>2]=-1;return}function Yi(a){a=a|0;return 0}function Zi(a){a=a|0;return 0}function _i(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0,k=0;f=i;if((e|0)<=0){k=0;i=f;return k|0}g=b+12|0;h=b+16|0;j=0;while(1){k=c[g>>2]|0;if(k>>>0<(c[h>>2]|0)>>>0){c[g>>2]=k+1;k=a[k]|0}else{k=Pc[c[(c[b>>2]|0)+40>>2]&127](b)|0;if((k|0)==-1){e=8;break}k=k&255}a[d]=k;j=j+1|0;if((j|0)<(e|0)){d=d+1|0}else{e=8;break}}if((e|0)==8){i=f;return j|0}return 0}function $i(a){a=a|0;return-1}function aj(a){a=a|0;var b=0,e=0;b=i;if((Pc[c[(c[a>>2]|0)+36>>2]&127](a)|0)==-1){a=-1;i=b;return a|0}e=a+12|0;a=c[e>>2]|0;c[e>>2]=a+1;a=d[a]|0;i=b;return a|0}function bj(a,b){a=a|0;b=b|0;return-1}function cj(b,e,f){b=b|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0;g=i;if((f|0)<=0){l=0;i=g;return l|0}j=b+24|0;h=b+28|0;k=0;while(1){l=c[j>>2]|0;if(!(l>>>0<(c[h>>2]|0)>>>0)){if((Yc[c[(c[b>>2]|0)+52>>2]&63](b,d[e]|0)|0)==-1){h=7;break}}else{m=a[e]|0;c[j>>2]=l+1;a[l]=m}k=k+1|0;if((k|0)<(f|0)){e=e+1|0}else{h=7;break}}if((h|0)==7){i=g;return k|0}return 0}function dj(a,b){a=a|0;b=b|0;return-1}function ej(a){a=a|0;var b=0;b=i;c[a>>2]=9272;_n(a+4|0);Yq(a);i=b;return}function fj(a){a=a|0;var b=0;b=i;c[a>>2]=9272;_n(a+4|0);i=b;return}function gj(a,b){a=a|0;b=b|0;return}function hj(a,b,c){a=a|0;b=b|0;c=c|0;return a|0}function ij(a,b,d,e,f,g){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;g=a;c[g>>2]=0;c[g+4>>2]=0;g=a+8|0;c[g>>2]=-1;c[g+4>>2]=-1;return}function jj(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;e=a;c[e>>2]=0;c[e+4>>2]=0;e=a+8|0;c[e>>2]=-1;c[e+4>>2]=-1;return}function kj(a){a=a|0;return 0}function lj(a){a=a|0;return 0}function mj(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0;e=i;if((d|0)<=0){j=0;i=e;return j|0}g=a+12|0;f=a+16|0;h=0;while(1){j=c[g>>2]|0;if(!(j>>>0<(c[f>>2]|0)>>>0)){j=Pc[c[(c[a>>2]|0)+40>>2]&127](a)|0;if((j|0)==-1){a=8;break}}else{c[g>>2]=j+4;j=c[j>>2]|0}c[b>>2]=j;h=h+1|0;if((h|0)>=(d|0)){a=8;break}b=b+4|0}if((a|0)==8){i=e;return h|0}return 0}function nj(a){a=a|0;return-1}function oj(a){a=a|0;var b=0,d=0;b=i;if((Pc[c[(c[a>>2]|0)+36>>2]&127](a)|0)==-1){a=-1;i=b;return a|0}d=a+12|0;a=c[d>>2]|0;c[d>>2]=a+4;a=c[a>>2]|0;i=b;return a|0}function pj(a,b){a=a|0;b=b|0;return-1}function qj(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0;e=i;if((d|0)<=0){j=0;i=e;return j|0}g=a+24|0;f=a+28|0;h=0;while(1){j=c[g>>2]|0;if(!(j>>>0<(c[f>>2]|0)>>>0)){if((Yc[c[(c[a>>2]|0)+52>>2]&63](a,c[b>>2]|0)|0)==-1){f=8;break}}else{k=c[b>>2]|0;c[g>>2]=j+4;c[j>>2]=k}h=h+1|0;if((h|0)>=(d|0)){f=8;break}b=b+4|0}if((f|0)==8){i=e;return h|0}return 0}function rj(a,b){a=a|0;b=b|0;return-1}function sj(a){a=a|0;var b=0;b=i;Pi(a+8|0);Yq(a);i=b;return}function tj(a){a=a|0;var b=0;b=i;Pi(a+8|0);i=b;return}function uj(a){a=a|0;var b=0,d=0;b=i;d=c[(c[a>>2]|0)+ -12>>2]|0;Pi(a+(d+8)|0);Yq(a+d|0);i=b;return}function vj(a){a=a|0;var b=0;b=i;Pi(a+((c[(c[a>>2]|0)+ -12>>2]|0)+8)|0);i=b;return}function wj(b){b=b|0;var d=0,e=0,f=0,g=0;d=i;i=i+16|0;e=d;f=c[(c[b>>2]|0)+ -12>>2]|0;if((c[b+(f+24)>>2]|0)==0){i=d;return b|0}a[e]=0;c[e+4>>2]=b;if((c[b+(f+16)>>2]|0)==0){g=c[b+(f+72)>>2]|0;if((g|0)!=0){wj(g)|0;f=c[(c[b>>2]|0)+ -12>>2]|0}a[e]=1;g=c[b+(f+24)>>2]|0;if((Pc[c[(c[g>>2]|0)+24>>2]&127](g)|0)==-1){g=c[(c[b>>2]|0)+ -12>>2]|0;Oi(b+g|0,c[b+(g+16)>>2]|1)}}Hj(e);i=d;return b|0}function xj(a){a=a|0;var b=0;b=a+16|0;c[b>>2]=c[b>>2]|1;if((c[a+20>>2]&1|0)==0){return}else{eb()}}function yj(a){a=a|0;var b=0;b=i;Pi(a+8|0);Yq(a);i=b;return}function zj(a){a=a|0;var b=0;b=i;Pi(a+8|0);i=b;return}function Aj(a){a=a|0;var b=0,d=0;b=i;d=c[(c[a>>2]|0)+ -12>>2]|0;Pi(a+(d+8)|0);Yq(a+d|0);i=b;return}function Bj(a){a=a|0;var b=0;b=i;Pi(a+((c[(c[a>>2]|0)+ -12>>2]|0)+8)|0);i=b;return}function Cj(b){b=b|0;var d=0,e=0,f=0,g=0;d=i;i=i+16|0;e=d;f=c[(c[b>>2]|0)+ -12>>2]|0;if((c[b+(f+24)>>2]|0)==0){i=d;return b|0}a[e]=0;c[e+4>>2]=b;if((c[b+(f+16)>>2]|0)==0){g=c[b+(f+72)>>2]|0;if((g|0)!=0){Cj(g)|0;f=c[(c[b>>2]|0)+ -12>>2]|0}a[e]=1;g=c[b+(f+24)>>2]|0;if((Pc[c[(c[g>>2]|0)+24>>2]&127](g)|0)==-1){g=c[(c[b>>2]|0)+ -12>>2]|0;Oi(b+g|0,c[b+(g+16)>>2]|1)}}Pj(e);i=d;return b|0}function Dj(a){a=a|0;var b=0;b=i;Pi(a+4|0);Yq(a);i=b;return}function Ej(a){a=a|0;var b=0;b=i;Pi(a+4|0);i=b;return}function Fj(a){a=a|0;var b=0,d=0;b=i;d=c[(c[a>>2]|0)+ -12>>2]|0;Pi(a+(d+4)|0);Yq(a+d|0);i=b;return}function Gj(a){a=a|0;var b=0;b=i;Pi(a+((c[(c[a>>2]|0)+ -12>>2]|0)+4)|0);i=b;return}function Hj(a){a=a|0;var b=0,d=0,e=0;b=i;a=a+4|0;d=c[a>>2]|0;e=c[(c[d>>2]|0)+ -12>>2]|0;if((c[d+(e+24)>>2]|0)==0){i=b;return}if((c[d+(e+16)>>2]|0)!=0){i=b;return}if((c[d+(e+4)>>2]&8192|0)==0){i=b;return}if(Ma()|0){i=b;return}e=c[a>>2]|0;e=c[e+((c[(c[e>>2]|0)+ -12>>2]|0)+24)>>2]|0;if(!((Pc[c[(c[e>>2]|0)+24>>2]&127](e)|0)==-1)){i=b;return}d=c[a>>2]|0;e=c[(c[d>>2]|0)+ -12>>2]|0;Oi(d+e|0,c[d+(e+16)>>2]|1);i=b;return}function Ij(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0;h=i;i=i+32|0;f=h+20|0;e=h+16|0;j=h+8|0;l=h+4|0;g=h;a[j]=0;c[j+4>>2]=b;k=c[(c[b>>2]|0)+ -12>>2]|0;if((c[b+(k+16)>>2]|0)!=0){Hj(j);i=h;return b|0}m=c[b+(k+72)>>2]|0;if((m|0)!=0){wj(m)|0;k=c[(c[b>>2]|0)+ -12>>2]|0}a[j]=1;Zn(l,b+(k+28)|0);k=$n(l,10656)|0;_n(l);o=c[(c[b>>2]|0)+ -12>>2]|0;l=c[b+(o+24)>>2]|0;m=b+o|0;p=b+(o+76)|0;n=c[p>>2]|0;if((n|0)==-1){Zn(f,b+(o+28)|0);n=$n(f,11936)|0;n=Yc[c[(c[n>>2]|0)+28>>2]&63](n,32)|0;_n(f);n=n<<24>>24;c[p>>2]=n}p=n&255;o=c[(c[k>>2]|0)+16>>2]|0;c[e>>2]=l;c[f+0>>2]=c[e+0>>2];Xc[o&31](g,k,f,m,p,d);if((c[g>>2]|0)!=0){Hj(j);i=h;return b|0}p=c[(c[b>>2]|0)+ -12>>2]|0;Oi(b+p|0,c[b+(p+16)>>2]|5);Hj(j);i=h;return b|0}function Jj(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0;h=i;i=i+32|0;f=h+20|0;e=h+16|0;j=h+8|0;l=h+4|0;g=h;a[j]=0;c[j+4>>2]=b;k=c[(c[b>>2]|0)+ -12>>2]|0;if((c[b+(k+16)>>2]|0)!=0){Hj(j);i=h;return b|0}m=c[b+(k+72)>>2]|0;if((m|0)!=0){wj(m)|0;k=c[(c[b>>2]|0)+ -12>>2]|0}a[j]=1;Zn(l,b+(k+28)|0);k=$n(l,10656)|0;_n(l);o=c[(c[b>>2]|0)+ -12>>2]|0;l=c[b+(o+24)>>2]|0;m=b+o|0;p=b+(o+76)|0;n=c[p>>2]|0;if((n|0)==-1){Zn(f,b+(o+28)|0);n=$n(f,11936)|0;n=Yc[c[(c[n>>2]|0)+28>>2]&63](n,32)|0;_n(f);n=n<<24>>24;c[p>>2]=n}p=n&255;o=c[(c[k>>2]|0)+24>>2]|0;c[e>>2]=l;c[f+0>>2]=c[e+0>>2];Xc[o&31](g,k,f,m,p,d);if((c[g>>2]|0)!=0){Hj(j);i=h;return b|0}p=c[(c[b>>2]|0)+ -12>>2]|0;Oi(b+p|0,c[b+(p+16)>>2]|5);Hj(j);i=h;return b|0}function Kj(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0;e=i;i=i+16|0;f=e;a[f]=0;c[f+4>>2]=b;h=c[b>>2]|0;g=c[h+ -12>>2]|0;do{if((c[b+(g+16)>>2]|0)==0){j=c[b+(g+72)>>2]|0;if((j|0)!=0){wj(j)|0;g=c[b>>2]|0;h=g;g=c[g+ -12>>2]|0}a[f]=1;g=c[b+(g+24)>>2]|0;if((g|0)!=0){j=g+24|0;h=c[j>>2]|0;if((h|0)!=(c[g+28>>2]|0)){c[j>>2]=h+1;a[h]=d;break}if(!((Yc[c[(c[g>>2]|0)+52>>2]&63](g,d&255)|0)==-1)){break}h=c[b>>2]|0}j=c[h+ -12>>2]|0;Oi(b+j|0,c[b+(j+16)>>2]|1)}}while(0);Hj(f);i=e;return b|0}function Lj(a){a=a|0;var b=0;b=i;Pi(a+4|0);Yq(a);i=b;return}function Mj(a){a=a|0;var b=0;b=i;Pi(a+4|0);i=b;return}function Nj(a){a=a|0;var b=0,d=0;b=i;d=c[(c[a>>2]|0)+ -12>>2]|0;Pi(a+(d+4)|0);Yq(a+d|0);i=b;return}function Oj(a){a=a|0;var b=0;b=i;Pi(a+((c[(c[a>>2]|0)+ -12>>2]|0)+4)|0);i=b;return}function Pj(a){a=a|0;var b=0,d=0,e=0;b=i;a=a+4|0;d=c[a>>2]|0;e=c[(c[d>>2]|0)+ -12>>2]|0;if((c[d+(e+24)>>2]|0)==0){i=b;return}if((c[d+(e+16)>>2]|0)!=0){i=b;return}if((c[d+(e+4)>>2]&8192|0)==0){i=b;return}if(Ma()|0){i=b;return}e=c[a>>2]|0;e=c[e+((c[(c[e>>2]|0)+ -12>>2]|0)+24)>>2]|0;if(!((Pc[c[(c[e>>2]|0)+24>>2]&127](e)|0)==-1)){i=b;return}d=c[a>>2]|0;e=c[(c[d>>2]|0)+ -12>>2]|0;Oi(d+e|0,c[d+(e+16)>>2]|1);i=b;return}function Qj(a){a=a|0;return 9488}function Rj(a,b,c){a=a|0;b=b|0;c=c|0;var d=0;d=i;if((c|0)==1){ti(a,9504,35);i=d;return}else{li(a,b,c);i=d;return}}function Sj(a){a=a|0;return}function Tj(a){a=a|0;var b=0;b=i;pi(a);Yq(a);i=b;return}function Uj(a){a=a|0;var b=0;b=i;pi(a);i=b;return}function Vj(a){a=a|0;var b=0;b=i;Pi(a);Yq(a);i=b;return}function Wj(a){a=a|0;var b=0;b=i;Yq(a);i=b;return}function Xj(a){a=a|0;var b=0;b=i;Yq(a);i=b;return}function Yj(a){a=a|0;return}function Zj(a){a=a|0;return}function _j(b,c,d,e,f){b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0;b=i;a:do{if((e|0)==(f|0)){g=6}else{while(1){if((c|0)==(d|0)){d=-1;break a}j=a[c]|0;h=a[e]|0;if(j<<24>>24<h<<24>>24){d=-1;break a}if(h<<24>>24<j<<24>>24){d=1;break a}c=c+1|0;e=e+1|0;if((e|0)==(f|0)){g=6;break}}}}while(0);if((g|0)==6){d=(c|0)!=(d|0)|0}i=b;return d|0}function $j(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0;d=i;g=e;h=f-g|0;if(h>>>0>4294967279){ri(b)}if(h>>>0<11){a[b]=h<<1;b=b+1|0}else{k=h+16&-16;j=Wq(k)|0;c[b+8>>2]=j;c[b>>2]=k|1;c[b+4>>2]=h;b=j}if((e|0)==(f|0)){k=b;a[k]=0;i=d;return}else{h=b}while(1){a[h]=a[e]|0;e=e+1|0;if((e|0)==(f|0)){break}else{h=h+1|0}}k=b+(f+(0-g))|0;a[k]=0;i=d;return}function ak(b,c,d){b=b|0;c=c|0;d=d|0;var e=0,f=0;b=i;if((c|0)==(d|0)){c=0;i=b;return c|0}else{e=0}do{e=(a[c]|0)+(e<<4)|0;f=e&-268435456;e=(f>>>24|f)^e;c=c+1|0}while((c|0)!=(d|0));i=b;return e|0}function bk(a){a=a|0;var b=0;b=i;Yq(a);i=b;return}function ck(a){a=a|0;return}function dk(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0;a=i;a:do{if((e|0)==(f|0)){g=6}else{while(1){if((b|0)==(d|0)){d=-1;break a}j=c[b>>2]|0;h=c[e>>2]|0;if((j|0)<(h|0)){d=-1;break a}if((h|0)<(j|0)){d=1;break a}b=b+4|0;e=e+4|0;if((e|0)==(f|0)){g=6;break}}}}while(0);if((g|0)==6){d=(b|0)!=(d|0)|0}i=a;return d|0}function ek(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0;d=i;g=e;j=f-g|0;h=j>>2;if(h>>>0>1073741807){ri(b)}if(h>>>0<2){a[b]=j>>>1;b=b+4|0}else{k=h+4&-4;j=Wq(k<<2)|0;c[b+8>>2]=j;c[b>>2]=k|1;c[b+4>>2]=h;b=j}if((e|0)==(f|0)){k=b;c[k>>2]=0;i=d;return}g=f+ -4+(0-g)|0;h=b;while(1){c[h>>2]=c[e>>2];e=e+4|0;if((e|0)==(f|0)){break}else{h=h+4|0}}k=b+((g>>>2)+1<<2)|0;c[k>>2]=0;i=d;return}function fk(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0;a=i;if((b|0)==(d|0)){b=0;i=a;return b|0}else{e=0}do{e=(c[b>>2]|0)+(e<<4)|0;f=e&-268435456;e=(f>>>24|f)^e;b=b+4|0}while((b|0)!=(d|0));i=a;return e|0}function gk(a){a=a|0;var b=0;b=i;Yq(a);i=b;return}function hk(a){a=a|0;return}function ik(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0;k=i;i=i+80|0;l=k;s=k+64|0;q=k+60|0;r=k+56|0;u=k+52|0;t=k+48|0;p=k+44|0;m=k+40|0;n=k+16|0;o=k+12|0;if((c[g+4>>2]&1|0)==0){c[q>>2]=-1;p=c[(c[d>>2]|0)+16>>2]|0;c[u>>2]=c[e>>2];c[t>>2]=c[f>>2];c[s+0>>2]=c[u+0>>2];c[l+0>>2]=c[t+0>>2];Jc[p&63](r,d,s,l,g,h,q);l=c[r>>2]|0;c[e>>2]=l;e=c[q>>2]|0;if((e|0)==1){a[j]=1}else if((e|0)==0){a[j]=0}else{a[j]=1;c[h>>2]=4}c[b>>2]=l;i=k;return}Qi(p,g);q=c[p>>2]|0;if(!((c[2984]|0)==-1)){c[l>>2]=11936;c[l+4>>2]=144;c[l+8>>2]=0;qi(11936,l,145)}d=(c[11940>>2]|0)+ -1|0;r=c[q+8>>2]|0;if(!((c[q+12>>2]|0)-r>>2>>>0>d>>>0)){u=Nb(4)|0;wq(u);Ac(u|0,19896,130)}q=c[r+(d<<2)>>2]|0;if((q|0)==0){u=Nb(4)|0;wq(u);Ac(u|0,19896,130)}Yh(c[p>>2]|0)|0;Qi(m,g);g=c[m>>2]|0;if(!((c[3020]|0)==-1)){c[l>>2]=12080;c[l+4>>2]=144;c[l+8>>2]=0;qi(12080,l,145)}r=(c[12084>>2]|0)+ -1|0;p=c[g+8>>2]|0;if(!((c[g+12>>2]|0)-p>>2>>>0>r>>>0)){u=Nb(4)|0;wq(u);Ac(u|0,19896,130)}g=c[p+(r<<2)>>2]|0;if((g|0)==0){u=Nb(4)|0;wq(u);Ac(u|0,19896,130)}Yh(c[m>>2]|0)|0;Mc[c[(c[g>>2]|0)+24>>2]&63](n,g);Mc[c[(c[g>>2]|0)+28>>2]&63](n+12|0,g);c[o>>2]=c[f>>2];u=n+24|0;c[l+0>>2]=c[o+0>>2];a[j]=(jk(e,l,n,u,q,h,1)|0)==(n|0)|0;c[b>>2]=c[e>>2];vi(n+12|0);vi(n);i=k;return}function jk(b,e,f,g,h,j,k){b=b|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0;n=i;i=i+112|0;p=n;u=(g-f|0)/12|0;if(u>>>0>100){p=Rq(u)|0;if((p|0)==0){br()}else{m=p;o=p}}else{m=0;o=p}p=(f|0)==(g|0);if(p){t=0}else{q=f;t=0;r=o;while(1){s=a[q]|0;if((s&1)==0){s=(s&255)>>>1}else{s=c[q+4>>2]|0}if((s|0)==0){a[r]=2;t=t+1|0;u=u+ -1|0}else{a[r]=1}q=q+12|0;if((q|0)==(g|0)){break}else{r=r+1|0}}}q=0;a:while(1){r=c[b>>2]|0;do{if((r|0)!=0){if((c[r+12>>2]|0)==(c[r+16>>2]|0)){if((Pc[c[(c[r>>2]|0)+36>>2]&127](r)|0)==-1){c[b>>2]=0;r=0;break}else{r=c[b>>2]|0;break}}}else{r=0}}while(0);v=(r|0)==0;r=c[e>>2]|0;if((r|0)!=0){if((c[r+12>>2]|0)==(c[r+16>>2]|0)?(Pc[c[(c[r>>2]|0)+36>>2]&127](r)|0)==-1:0){c[e>>2]=0;r=0}}else{r=0}s=(r|0)==0;w=c[b>>2]|0;if(!((v^s)&(u|0)!=0)){break}r=c[w+12>>2]|0;if((r|0)==(c[w+16>>2]|0)){r=Pc[c[(c[w>>2]|0)+36>>2]&127](w)|0}else{r=d[r]|0}s=r&255;if(!k){s=Yc[c[(c[h>>2]|0)+12>>2]&63](h,s)|0}r=q+1|0;if(p){q=r;continue}b:do{if(k){x=0;v=f;w=o;while(1){do{if((a[w]|0)==1){y=a[v]|0;A=(y&1)==0;if(A){z=v+1|0}else{z=c[v+8>>2]|0}if(!(s<<24>>24==(a[z+q|0]|0))){a[w]=0;u=u+ -1|0;break}if(A){x=(y&255)>>>1}else{x=c[v+4>>2]|0}if((x|0)==(r|0)){a[w]=2;x=1;t=t+1|0;u=u+ -1|0}else{x=1}}}while(0);v=v+12|0;if((v|0)==(g|0)){break b}w=w+1|0}}else{x=0;v=f;w=o;while(1){do{if((a[w]|0)==1){if((a[v]&1)==0){y=v+1|0}else{y=c[v+8>>2]|0}if(!(s<<24>>24==(Yc[c[(c[h>>2]|0)+12>>2]&63](h,a[y+q|0]|0)|0)<<24>>24)){a[w]=0;u=u+ -1|0;break}x=a[v]|0;if((x&1)==0){x=(x&255)>>>1}else{x=c[v+4>>2]|0}if((x|0)==(r|0)){a[w]=2;x=1;t=t+1|0;u=u+ -1|0}else{x=1}}}while(0);v=v+12|0;if((v|0)==(g|0)){break b}w=w+1|0}}}while(0);if(!x){q=r;continue}v=c[b>>2]|0;q=v+12|0;s=c[q>>2]|0;if((s|0)==(c[v+16>>2]|0)){Pc[c[(c[v>>2]|0)+40>>2]&127](v)|0}else{c[q>>2]=s+1}if((u+t|0)>>>0<2){q=r;continue}else{s=f;q=o}while(1){if((a[q]|0)==2){v=a[s]|0;if((v&1)==0){v=(v&255)>>>1}else{v=c[s+4>>2]|0}if((v|0)!=(r|0)){a[q]=0;t=t+ -1|0}}s=s+12|0;if((s|0)==(g|0)){q=r;continue a}else{q=q+1|0}}}do{if((w|0)!=0){if((c[w+12>>2]|0)==(c[w+16>>2]|0)){if((Pc[c[(c[w>>2]|0)+36>>2]&127](w)|0)==-1){c[b>>2]=0;w=0;break}else{w=c[b>>2]|0;break}}}else{w=0}}while(0);h=(w|0)==0;do{if(!s){if((c[r+12>>2]|0)!=(c[r+16>>2]|0)){if(h){break}else{l=80;break}}if(!((Pc[c[(c[r>>2]|0)+36>>2]&127](r)|0)==-1)){if(h){break}else{l=80;break}}else{c[e>>2]=0;l=78;break}}else{l=78}}while(0);if((l|0)==78?h:0){l=80}if((l|0)==80){c[j>>2]=c[j>>2]|2}c:do{if(!p){if((a[o]|0)==2){g=f}else{while(1){f=f+12|0;o=o+1|0;if((f|0)==(g|0)){l=85;break c}if((a[o]|0)==2){g=f;break}}}}else{l=85}}while(0);if((l|0)==85){c[j>>2]=c[j>>2]|4}if((m|0)==0){i=n;return g|0}Sq(m);i=n;return g|0}function kk(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0;b=i;i=i+16|0;j=b+12|0;k=b+8|0;m=b+4|0;l=b;c[m>>2]=c[d>>2];c[l>>2]=c[e>>2];c[k+0>>2]=c[m+0>>2];c[j+0>>2]=c[l+0>>2];lk(a,0,k,j,f,g,h);i=b;return}function lk(b,e,f,g,h,j,k){b=b|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0;n=i;i=i+224|0;u=n+198|0;v=n+196|0;m=n+184|0;e=n+172|0;s=n+168|0;r=n+8|0;q=n+4|0;p=n;t=c[h+4>>2]&74;if((t|0)==0){t=0}else if((t|0)==8){t=16}else if((t|0)==64){t=8}else{t=10}bl(m,h,u,v);c[e+0>>2]=0;c[e+4>>2]=0;c[e+8>>2]=0;yi(e,10,0);if((a[e]&1)==0){A=e+1|0;w=A;x=e+8|0}else{A=e+8|0;w=e+1|0;x=A;A=c[A>>2]|0}c[s>>2]=A;c[q>>2]=r;c[p>>2]=0;h=e+4|0;y=a[v]|0;v=c[f>>2]|0;a:while(1){if((v|0)!=0){if((c[v+12>>2]|0)==(c[v+16>>2]|0)?(Pc[c[(c[v>>2]|0)+36>>2]&127](v)|0)==-1:0){c[f>>2]=0;v=0}}else{v=0}B=(v|0)==0;z=c[g>>2]|0;do{if((z|0)!=0){if((c[z+12>>2]|0)!=(c[z+16>>2]|0)){if(B){break}else{break a}}if(!((Pc[c[(c[z>>2]|0)+36>>2]&127](z)|0)==-1)){if(B){break}else{break a}}else{c[g>>2]=0;l=18;break}}else{l=18}}while(0);if((l|0)==18){l=0;if(B){z=0;break}else{z=0}}B=a[e]|0;C=(B&1)==0;if(C){D=(B&255)>>>1}else{D=c[h>>2]|0}if(((c[s>>2]|0)-A|0)==(D|0)){if(C){A=(B&255)>>>1;B=(B&255)>>>1}else{B=c[h>>2]|0;A=B}yi(e,A<<1,0);if((a[e]&1)==0){A=10}else{A=(c[e>>2]&-2)+ -1|0}yi(e,A,0);if((a[e]&1)==0){A=w}else{A=c[x>>2]|0}c[s>>2]=A+B}B=v+12|0;D=c[B>>2]|0;C=v+16|0;if((D|0)==(c[C>>2]|0)){D=Pc[c[(c[v>>2]|0)+36>>2]&127](v)|0}else{D=d[D]|0}if((Dk(D&255,t,A,s,p,y,m,r,q,u)|0)!=0){break}z=c[B>>2]|0;if((z|0)==(c[C>>2]|0)){Pc[c[(c[v>>2]|0)+40>>2]&127](v)|0;continue}else{c[B>>2]=z+1;continue}}u=a[m]|0;if((u&1)==0){u=(u&255)>>>1}else{u=c[m+4>>2]|0}if((u|0)!=0?(o=c[q>>2]|0,(o-r|0)<160):0){D=c[p>>2]|0;c[q>>2]=o+4;c[o>>2]=D}c[k>>2]=Xp(A,c[s>>2]|0,j,t)|0;nn(m,r,c[q>>2]|0,j);if((v|0)!=0){if((c[v+12>>2]|0)==(c[v+16>>2]|0)?(Pc[c[(c[v>>2]|0)+36>>2]&127](v)|0)==-1:0){c[f>>2]=0;v=0}}else{v=0}k=(v|0)==0;do{if((z|0)!=0){if((c[z+12>>2]|0)!=(c[z+16>>2]|0)){if(!k){break}c[b>>2]=v;vi(e);vi(m);i=n;return}if((Pc[c[(c[z>>2]|0)+36>>2]&127](z)|0)==-1){c[g>>2]=0;l=54;break}if(k^(z|0)==0){c[b>>2]=v;vi(e);vi(m);i=n;return}}else{l=54}}while(0);if((l|0)==54?!k:0){c[b>>2]=v;vi(e);vi(m);i=n;return}c[j>>2]=c[j>>2]|2;c[b>>2]=v;vi(e);vi(m);i=n;return}function mk(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0;b=i;i=i+16|0;j=b+12|0;k=b+8|0;m=b+4|0;l=b;c[m>>2]=c[d>>2];c[l>>2]=c[e>>2];c[k+0>>2]=c[m+0>>2];c[j+0>>2]=c[l+0>>2];nk(a,0,k,j,f,g,h);i=b;return}function nk(b,e,f,g,h,j,k){b=b|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0;n=i;i=i+224|0;u=n+198|0;v=n+196|0;m=n+184|0;e=n+172|0;s=n+168|0;r=n+8|0;q=n+4|0;p=n;t=c[h+4>>2]&74;if((t|0)==64){t=8}else if((t|0)==8){t=16}else if((t|0)==0){t=0}else{t=10}bl(m,h,u,v);c[e+0>>2]=0;c[e+4>>2]=0;c[e+8>>2]=0;yi(e,10,0);if((a[e]&1)==0){A=e+1|0;w=A;x=e+8|0}else{A=e+8|0;w=e+1|0;x=A;A=c[A>>2]|0}c[s>>2]=A;c[q>>2]=r;c[p>>2]=0;h=e+4|0;y=a[v]|0;v=c[f>>2]|0;a:while(1){if((v|0)!=0){if((c[v+12>>2]|0)==(c[v+16>>2]|0)?(Pc[c[(c[v>>2]|0)+36>>2]&127](v)|0)==-1:0){c[f>>2]=0;v=0}}else{v=0}B=(v|0)==0;z=c[g>>2]|0;do{if((z|0)!=0){if((c[z+12>>2]|0)!=(c[z+16>>2]|0)){if(B){break}else{break a}}if(!((Pc[c[(c[z>>2]|0)+36>>2]&127](z)|0)==-1)){if(B){break}else{break a}}else{c[g>>2]=0;l=18;break}}else{l=18}}while(0);if((l|0)==18){l=0;if(B){z=0;break}else{z=0}}B=a[e]|0;C=(B&1)==0;if(C){D=(B&255)>>>1}else{D=c[h>>2]|0}if(((c[s>>2]|0)-A|0)==(D|0)){if(C){A=(B&255)>>>1;B=(B&255)>>>1}else{B=c[h>>2]|0;A=B}yi(e,A<<1,0);if((a[e]&1)==0){A=10}else{A=(c[e>>2]&-2)+ -1|0}yi(e,A,0);if((a[e]&1)==0){A=w}else{A=c[x>>2]|0}c[s>>2]=A+B}B=v+12|0;D=c[B>>2]|0;C=v+16|0;if((D|0)==(c[C>>2]|0)){D=Pc[c[(c[v>>2]|0)+36>>2]&127](v)|0}else{D=d[D]|0}if((Dk(D&255,t,A,s,p,y,m,r,q,u)|0)!=0){break}z=c[B>>2]|0;if((z|0)==(c[C>>2]|0)){Pc[c[(c[v>>2]|0)+40>>2]&127](v)|0;continue}else{c[B>>2]=z+1;continue}}u=a[m]|0;if((u&1)==0){u=(u&255)>>>1}else{u=c[m+4>>2]|0}if((u|0)!=0?(o=c[q>>2]|0,(o-r|0)<160):0){D=c[p>>2]|0;c[q>>2]=o+4;c[o>>2]=D}C=Wp(A,c[s>>2]|0,j,t)|0;D=k;c[D>>2]=C;c[D+4>>2]=I;nn(m,r,c[q>>2]|0,j);if((v|0)!=0){if((c[v+12>>2]|0)==(c[v+16>>2]|0)?(Pc[c[(c[v>>2]|0)+36>>2]&127](v)|0)==-1:0){c[f>>2]=0;v=0}}else{v=0}k=(v|0)==0;do{if((z|0)!=0){if((c[z+12>>2]|0)!=(c[z+16>>2]|0)){if(!k){break}c[b>>2]=v;vi(e);vi(m);i=n;return}if((Pc[c[(c[z>>2]|0)+36>>2]&127](z)|0)==-1){c[g>>2]=0;l=54;break}if(k^(z|0)==0){c[b>>2]=v;vi(e);vi(m);i=n;return}}else{l=54}}while(0);if((l|0)==54?!k:0){c[b>>2]=v;vi(e);vi(m);i=n;return}c[j>>2]=c[j>>2]|2;c[b>>2]=v;vi(e);vi(m);i=n;return}function ok(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0;b=i;i=i+16|0;j=b+12|0;k=b+8|0;m=b+4|0;l=b;c[m>>2]=c[d>>2];c[l>>2]=c[e>>2];c[k+0>>2]=c[m+0>>2];c[j+0>>2]=c[l+0>>2];pk(a,0,k,j,f,g,h);i=b;return}function pk(e,f,g,h,j,k,l){e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;var m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0;o=i;i=i+224|0;v=o+198|0;w=o+196|0;n=o+184|0;f=o+172|0;t=o+168|0;s=o+8|0;r=o+4|0;q=o;u=c[j+4>>2]&74;if((u|0)==64){u=8}else if((u|0)==8){u=16}else if((u|0)==0){u=0}else{u=10}bl(n,j,v,w);c[f+0>>2]=0;c[f+4>>2]=0;c[f+8>>2]=0;yi(f,10,0);if((a[f]&1)==0){B=f+1|0;x=B;y=f+8|0}else{B=f+8|0;x=f+1|0;y=B;B=c[B>>2]|0}c[t>>2]=B;c[r>>2]=s;c[q>>2]=0;j=f+4|0;z=a[w]|0;w=c[g>>2]|0;a:while(1){if((w|0)!=0){if((c[w+12>>2]|0)==(c[w+16>>2]|0)?(Pc[c[(c[w>>2]|0)+36>>2]&127](w)|0)==-1:0){c[g>>2]=0;w=0}}else{w=0}C=(w|0)==0;A=c[h>>2]|0;do{if((A|0)!=0){if((c[A+12>>2]|0)!=(c[A+16>>2]|0)){if(C){break}else{break a}}if(!((Pc[c[(c[A>>2]|0)+36>>2]&127](A)|0)==-1)){if(C){break}else{break a}}else{c[h>>2]=0;m=18;break}}else{m=18}}while(0);if((m|0)==18){m=0;if(C){A=0;break}else{A=0}}C=a[f]|0;D=(C&1)==0;if(D){E=(C&255)>>>1}else{E=c[j>>2]|0}if(((c[t>>2]|0)-B|0)==(E|0)){if(D){B=(C&255)>>>1;C=(C&255)>>>1}else{C=c[j>>2]|0;B=C}yi(f,B<<1,0);if((a[f]&1)==0){B=10}else{B=(c[f>>2]&-2)+ -1|0}yi(f,B,0);if((a[f]&1)==0){B=x}else{B=c[y>>2]|0}c[t>>2]=B+C}C=w+12|0;E=c[C>>2]|0;D=w+16|0;if((E|0)==(c[D>>2]|0)){E=Pc[c[(c[w>>2]|0)+36>>2]&127](w)|0}else{E=d[E]|0}if((Dk(E&255,u,B,t,q,z,n,s,r,v)|0)!=0){break}A=c[C>>2]|0;if((A|0)==(c[D>>2]|0)){Pc[c[(c[w>>2]|0)+40>>2]&127](w)|0;continue}else{c[C>>2]=A+1;continue}}v=a[n]|0;if((v&1)==0){v=(v&255)>>>1}else{v=c[n+4>>2]|0}if((v|0)!=0?(p=c[r>>2]|0,(p-s|0)<160):0){E=c[q>>2]|0;c[r>>2]=p+4;c[p>>2]=E}b[l>>1]=Vp(B,c[t>>2]|0,k,u)|0;nn(n,s,c[r>>2]|0,k);if((w|0)!=0){if((c[w+12>>2]|0)==(c[w+16>>2]|0)?(Pc[c[(c[w>>2]|0)+36>>2]&127](w)|0)==-1:0){c[g>>2]=0;w=0}}else{w=0}l=(w|0)==0;do{if((A|0)!=0){if((c[A+12>>2]|0)!=(c[A+16>>2]|0)){if(!l){break}c[e>>2]=w;vi(f);vi(n);i=o;return}if((Pc[c[(c[A>>2]|0)+36>>2]&127](A)|0)==-1){c[h>>2]=0;m=54;break}if(l^(A|0)==0){c[e>>2]=w;vi(f);vi(n);i=o;return}}else{m=54}}while(0);if((m|0)==54?!l:0){c[e>>2]=w;vi(f);vi(n);i=o;return}c[k>>2]=c[k>>2]|2;c[e>>2]=w;vi(f);vi(n);i=o;return}function qk(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0;b=i;i=i+16|0;j=b+12|0;k=b+8|0;m=b+4|0;l=b;c[m>>2]=c[d>>2];c[l>>2]=c[e>>2];c[k+0>>2]=c[m+0>>2];c[j+0>>2]=c[l+0>>2];rk(a,0,k,j,f,g,h);i=b;return}function rk(b,e,f,g,h,j,k){b=b|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0;n=i;i=i+224|0;u=n+198|0;v=n+196|0;m=n+184|0;e=n+172|0;s=n+168|0;r=n+8|0;q=n+4|0;p=n;t=c[h+4>>2]&74;if((t|0)==0){t=0}else if((t|0)==8){t=16}else if((t|0)==64){t=8}else{t=10}bl(m,h,u,v);c[e+0>>2]=0;c[e+4>>2]=0;c[e+8>>2]=0;yi(e,10,0);if((a[e]&1)==0){A=e+1|0;w=A;x=e+8|0}else{A=e+8|0;w=e+1|0;x=A;A=c[A>>2]|0}c[s>>2]=A;c[q>>2]=r;c[p>>2]=0;h=e+4|0;y=a[v]|0;v=c[f>>2]|0;a:while(1){if((v|0)!=0){if((c[v+12>>2]|0)==(c[v+16>>2]|0)?(Pc[c[(c[v>>2]|0)+36>>2]&127](v)|0)==-1:0){c[f>>2]=0;v=0}}else{v=0}B=(v|0)==0;z=c[g>>2]|0;do{if((z|0)!=0){if((c[z+12>>2]|0)!=(c[z+16>>2]|0)){if(B){break}else{break a}}if(!((Pc[c[(c[z>>2]|0)+36>>2]&127](z)|0)==-1)){if(B){break}else{break a}}else{c[g>>2]=0;l=18;break}}else{l=18}}while(0);if((l|0)==18){l=0;if(B){z=0;break}else{z=0}}B=a[e]|0;C=(B&1)==0;if(C){D=(B&255)>>>1}else{D=c[h>>2]|0}if(((c[s>>2]|0)-A|0)==(D|0)){if(C){A=(B&255)>>>1;B=(B&255)>>>1}else{B=c[h>>2]|0;A=B}yi(e,A<<1,0);if((a[e]&1)==0){A=10}else{A=(c[e>>2]&-2)+ -1|0}yi(e,A,0);if((a[e]&1)==0){A=w}else{A=c[x>>2]|0}c[s>>2]=A+B}B=v+12|0;D=c[B>>2]|0;C=v+16|0;if((D|0)==(c[C>>2]|0)){D=Pc[c[(c[v>>2]|0)+36>>2]&127](v)|0}else{D=d[D]|0}if((Dk(D&255,t,A,s,p,y,m,r,q,u)|0)!=0){break}z=c[B>>2]|0;if((z|0)==(c[C>>2]|0)){Pc[c[(c[v>>2]|0)+40>>2]&127](v)|0;continue}else{c[B>>2]=z+1;continue}}u=a[m]|0;if((u&1)==0){u=(u&255)>>>1}else{u=c[m+4>>2]|0}if((u|0)!=0?(o=c[q>>2]|0,(o-r|0)<160):0){D=c[p>>2]|0;c[q>>2]=o+4;c[o>>2]=D}c[k>>2]=Up(A,c[s>>2]|0,j,t)|0;nn(m,r,c[q>>2]|0,j);if((v|0)!=0){if((c[v+12>>2]|0)==(c[v+16>>2]|0)?(Pc[c[(c[v>>2]|0)+36>>2]&127](v)|0)==-1:0){c[f>>2]=0;v=0}}else{v=0}k=(v|0)==0;do{if((z|0)!=0){if((c[z+12>>2]|0)!=(c[z+16>>2]|0)){if(!k){break}c[b>>2]=v;vi(e);vi(m);i=n;return}if((Pc[c[(c[z>>2]|0)+36>>2]&127](z)|0)==-1){c[g>>2]=0;l=54;break}if(k^(z|0)==0){c[b>>2]=v;vi(e);vi(m);i=n;return}}else{l=54}}while(0);if((l|0)==54?!k:0){c[b>>2]=v;vi(e);vi(m);i=n;return}c[j>>2]=c[j>>2]|2;c[b>>2]=v;vi(e);vi(m);i=n;return}function sk(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0;b=i;i=i+16|0;j=b+12|0;k=b+8|0;m=b+4|0;l=b;c[m>>2]=c[d>>2];c[l>>2]=c[e>>2];c[k+0>>2]=c[m+0>>2];c[j+0>>2]=c[l+0>>2];tk(a,0,k,j,f,g,h);i=b;return}function tk(b,e,f,g,h,j,k){b=b|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0;n=i;i=i+224|0;u=n+198|0;v=n+196|0;m=n+184|0;e=n+172|0;s=n+168|0;r=n+8|0;q=n+4|0;p=n;t=c[h+4>>2]&74;if((t|0)==8){t=16}else if((t|0)==0){t=0}else if((t|0)==64){t=8}else{t=10}bl(m,h,u,v);c[e+0>>2]=0;c[e+4>>2]=0;c[e+8>>2]=0;yi(e,10,0);if((a[e]&1)==0){A=e+1|0;w=A;x=e+8|0}else{A=e+8|0;w=e+1|0;x=A;A=c[A>>2]|0}c[s>>2]=A;c[q>>2]=r;c[p>>2]=0;h=e+4|0;y=a[v]|0;v=c[f>>2]|0;a:while(1){if((v|0)!=0){if((c[v+12>>2]|0)==(c[v+16>>2]|0)?(Pc[c[(c[v>>2]|0)+36>>2]&127](v)|0)==-1:0){c[f>>2]=0;v=0}}else{v=0}B=(v|0)==0;z=c[g>>2]|0;do{if((z|0)!=0){if((c[z+12>>2]|0)!=(c[z+16>>2]|0)){if(B){break}else{break a}}if(!((Pc[c[(c[z>>2]|0)+36>>2]&127](z)|0)==-1)){if(B){break}else{break a}}else{c[g>>2]=0;l=18;break}}else{l=18}}while(0);if((l|0)==18){l=0;if(B){z=0;break}else{z=0}}B=a[e]|0;C=(B&1)==0;if(C){D=(B&255)>>>1}else{D=c[h>>2]|0}if(((c[s>>2]|0)-A|0)==(D|0)){if(C){A=(B&255)>>>1;B=(B&255)>>>1}else{B=c[h>>2]|0;A=B}yi(e,A<<1,0);if((a[e]&1)==0){A=10}else{A=(c[e>>2]&-2)+ -1|0}yi(e,A,0);if((a[e]&1)==0){A=w}else{A=c[x>>2]|0}c[s>>2]=A+B}B=v+12|0;D=c[B>>2]|0;C=v+16|0;if((D|0)==(c[C>>2]|0)){D=Pc[c[(c[v>>2]|0)+36>>2]&127](v)|0}else{D=d[D]|0}if((Dk(D&255,t,A,s,p,y,m,r,q,u)|0)!=0){break}z=c[B>>2]|0;if((z|0)==(c[C>>2]|0)){Pc[c[(c[v>>2]|0)+40>>2]&127](v)|0;continue}else{c[B>>2]=z+1;continue}}u=a[m]|0;if((u&1)==0){u=(u&255)>>>1}else{u=c[m+4>>2]|0}if((u|0)!=0?(o=c[q>>2]|0,(o-r|0)<160):0){D=c[p>>2]|0;c[q>>2]=o+4;c[o>>2]=D}c[k>>2]=Tp(A,c[s>>2]|0,j,t)|0;nn(m,r,c[q>>2]|0,j);if((v|0)!=0){if((c[v+12>>2]|0)==(c[v+16>>2]|0)?(Pc[c[(c[v>>2]|0)+36>>2]&127](v)|0)==-1:0){c[f>>2]=0;v=0}}else{v=0}k=(v|0)==0;do{if((z|0)!=0){if((c[z+12>>2]|0)!=(c[z+16>>2]|0)){if(!k){break}c[b>>2]=v;vi(e);vi(m);i=n;return}if((Pc[c[(c[z>>2]|0)+36>>2]&127](z)|0)==-1){c[g>>2]=0;l=54;break}if(k^(z|0)==0){c[b>>2]=v;vi(e);vi(m);i=n;return}}else{l=54}}while(0);if((l|0)==54?!k:0){c[b>>2]=v;vi(e);vi(m);i=n;return}c[j>>2]=c[j>>2]|2;c[b>>2]=v;vi(e);vi(m);i=n;return}function uk(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0;b=i;i=i+16|0;j=b+12|0;k=b+8|0;m=b+4|0;l=b;c[m>>2]=c[d>>2];c[l>>2]=c[e>>2];c[k+0>>2]=c[m+0>>2];c[j+0>>2]=c[l+0>>2];vk(a,0,k,j,f,g,h);i=b;return}function vk(b,e,f,g,h,j,k){b=b|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0;n=i;i=i+224|0;u=n+198|0;v=n+196|0;m=n+184|0;e=n+172|0;s=n+168|0;r=n+8|0;q=n+4|0;p=n;t=c[h+4>>2]&74;if((t|0)==8){t=16}else if((t|0)==64){t=8}else if((t|0)==0){t=0}else{t=10}bl(m,h,u,v);c[e+0>>2]=0;c[e+4>>2]=0;c[e+8>>2]=0;yi(e,10,0);if((a[e]&1)==0){A=e+1|0;w=A;x=e+8|0}else{A=e+8|0;w=e+1|0;x=A;A=c[A>>2]|0}c[s>>2]=A;c[q>>2]=r;c[p>>2]=0;h=e+4|0;y=a[v]|0;v=c[f>>2]|0;a:while(1){if((v|0)!=0){if((c[v+12>>2]|0)==(c[v+16>>2]|0)?(Pc[c[(c[v>>2]|0)+36>>2]&127](v)|0)==-1:0){c[f>>2]=0;v=0}}else{v=0}B=(v|0)==0;z=c[g>>2]|0;do{if((z|0)!=0){if((c[z+12>>2]|0)!=(c[z+16>>2]|0)){if(B){break}else{break a}}if(!((Pc[c[(c[z>>2]|0)+36>>2]&127](z)|0)==-1)){if(B){break}else{break a}}else{c[g>>2]=0;l=18;break}}else{l=18}}while(0);if((l|0)==18){l=0;if(B){z=0;break}else{z=0}}B=a[e]|0;C=(B&1)==0;if(C){D=(B&255)>>>1}else{D=c[h>>2]|0}if(((c[s>>2]|0)-A|0)==(D|0)){if(C){A=(B&255)>>>1;B=(B&255)>>>1}else{B=c[h>>2]|0;A=B}yi(e,A<<1,0);if((a[e]&1)==0){A=10}else{A=(c[e>>2]&-2)+ -1|0}yi(e,A,0);if((a[e]&1)==0){A=w}else{A=c[x>>2]|0}c[s>>2]=A+B}B=v+12|0;D=c[B>>2]|0;C=v+16|0;if((D|0)==(c[C>>2]|0)){D=Pc[c[(c[v>>2]|0)+36>>2]&127](v)|0}else{D=d[D]|0}if((Dk(D&255,t,A,s,p,y,m,r,q,u)|0)!=0){break}z=c[B>>2]|0;if((z|0)==(c[C>>2]|0)){Pc[c[(c[v>>2]|0)+40>>2]&127](v)|0;continue}else{c[B>>2]=z+1;continue}}u=a[m]|0;if((u&1)==0){u=(u&255)>>>1}else{u=c[m+4>>2]|0}if((u|0)!=0?(o=c[q>>2]|0,(o-r|0)<160):0){D=c[p>>2]|0;c[q>>2]=o+4;c[o>>2]=D}C=Sp(A,c[s>>2]|0,j,t)|0;D=k;c[D>>2]=C;c[D+4>>2]=I;nn(m,r,c[q>>2]|0,j);if((v|0)!=0){if((c[v+12>>2]|0)==(c[v+16>>2]|0)?(Pc[c[(c[v>>2]|0)+36>>2]&127](v)|0)==-1:0){c[f>>2]=0;v=0}}else{v=0}k=(v|0)==0;do{if((z|0)!=0){if((c[z+12>>2]|0)!=(c[z+16>>2]|0)){if(!k){break}c[b>>2]=v;vi(e);vi(m);i=n;return}if((Pc[c[(c[z>>2]|0)+36>>2]&127](z)|0)==-1){c[g>>2]=0;l=54;break}if(k^(z|0)==0){c[b>>2]=v;vi(e);vi(m);i=n;return}}else{l=54}}while(0);if((l|0)==54?!k:0){c[b>>2]=v;vi(e);vi(m);i=n;return}c[j>>2]=c[j>>2]|2;c[b>>2]=v;vi(e);vi(m);i=n;return}function wk(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0;b=i;i=i+16|0;j=b+12|0;k=b+8|0;m=b+4|0;l=b;c[m>>2]=c[d>>2];c[l>>2]=c[e>>2];c[k+0>>2]=c[m+0>>2];c[j+0>>2]=c[l+0>>2];xk(a,0,k,j,f,g,h);i=b;return}function xk(b,e,f,h,j,k,l){b=b|0;e=e|0;f=f|0;h=h|0;j=j|0;k=k|0;l=l|0;var m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0;o=i;i=i+240|0;w=o+200|0;A=o+199|0;x=o+198|0;n=o+184|0;e=o+172|0;r=o+168|0;s=o+8|0;u=o+4|0;t=o;q=o+197|0;v=o+196|0;cl(n,j,w,A,x);c[e+0>>2]=0;c[e+4>>2]=0;c[e+8>>2]=0;yi(e,10,0);if((a[e]&1)==0){D=e+1|0;y=D;z=e+8|0}else{D=e+8|0;y=e+1|0;z=D;D=c[D>>2]|0}c[r>>2]=D;c[u>>2]=s;c[t>>2]=0;a[q]=1;a[v]=69;j=e+4|0;A=a[A]|0;B=a[x]|0;x=c[f>>2]|0;a:while(1){if((x|0)!=0){if((c[x+12>>2]|0)==(c[x+16>>2]|0)?(Pc[c[(c[x>>2]|0)+36>>2]&127](x)|0)==-1:0){c[f>>2]=0;x=0}}else{x=0}E=(x|0)==0;C=c[h>>2]|0;do{if((C|0)!=0){if((c[C+12>>2]|0)!=(c[C+16>>2]|0)){if(E){break}else{break a}}if(!((Pc[c[(c[C>>2]|0)+36>>2]&127](C)|0)==-1)){if(E){break}else{break a}}else{c[h>>2]=0;m=14;break}}else{m=14}}while(0);if((m|0)==14){m=0;if(E){C=0;break}else{C=0}}E=a[e]|0;G=(E&1)==0;if(G){F=(E&255)>>>1}else{F=c[j>>2]|0}if(((c[r>>2]|0)-D|0)==(F|0)){if(G){D=(E&255)>>>1;E=(E&255)>>>1}else{E=c[j>>2]|0;D=E}yi(e,D<<1,0);if((a[e]&1)==0){D=10}else{D=(c[e>>2]&-2)+ -1|0}yi(e,D,0);if((a[e]&1)==0){D=y}else{D=c[z>>2]|0}c[r>>2]=D+E}F=x+12|0;G=c[F>>2]|0;E=x+16|0;if((G|0)==(c[E>>2]|0)){G=Pc[c[(c[x>>2]|0)+36>>2]&127](x)|0}else{G=d[G]|0}if((dl(G&255,q,v,D,r,A,B,n,s,u,t,w)|0)!=0){break}C=c[F>>2]|0;if((C|0)==(c[E>>2]|0)){Pc[c[(c[x>>2]|0)+40>>2]&127](x)|0;continue}else{c[F>>2]=C+1;continue}}v=a[n]|0;if((v&1)==0){v=(v&255)>>>1}else{v=c[n+4>>2]|0}if(((v|0)!=0?(a[q]|0)!=0:0)?(p=c[u>>2]|0,(p-s|0)<160):0){G=c[t>>2]|0;c[u>>2]=p+4;c[p>>2]=G}g[l>>2]=+Rp(D,c[r>>2]|0,k);nn(n,s,c[u>>2]|0,k);if((x|0)!=0){if((c[x+12>>2]|0)==(c[x+16>>2]|0)?(Pc[c[(c[x>>2]|0)+36>>2]&127](x)|0)==-1:0){c[f>>2]=0;x=0}}else{x=0}p=(x|0)==0;do{if((C|0)!=0){if((c[C+12>>2]|0)!=(c[C+16>>2]|0)){if(!p){break}c[b>>2]=x;vi(e);vi(n);i=o;return}if((Pc[c[(c[C>>2]|0)+36>>2]&127](C)|0)==-1){c[h>>2]=0;m=51;break}if(p^(C|0)==0){c[b>>2]=x;vi(e);vi(n);i=o;return}}else{m=51}}while(0);if((m|0)==51?!p:0){c[b>>2]=x;vi(e);vi(n);i=o;return}c[k>>2]=c[k>>2]|2;c[b>>2]=x;vi(e);vi(n);i=o;return}function yk(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0;b=i;i=i+16|0;j=b+12|0;k=b+8|0;m=b+4|0;l=b;c[m>>2]=c[d>>2];c[l>>2]=c[e>>2];c[k+0>>2]=c[m+0>>2];c[j+0>>2]=c[l+0>>2];zk(a,0,k,j,f,g,h);i=b;return}function zk(b,e,f,g,j,k,l){b=b|0;e=e|0;f=f|0;g=g|0;j=j|0;k=k|0;l=l|0;var m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0;o=i;i=i+240|0;w=o+200|0;A=o+199|0;x=o+198|0;n=o+184|0;e=o+172|0;r=o+168|0;s=o+8|0;u=o+4|0;t=o;q=o+197|0;v=o+196|0;cl(n,j,w,A,x);c[e+0>>2]=0;c[e+4>>2]=0;c[e+8>>2]=0;yi(e,10,0);if((a[e]&1)==0){D=e+1|0;y=D;z=e+8|0}else{D=e+8|0;y=e+1|0;z=D;D=c[D>>2]|0}c[r>>2]=D;c[u>>2]=s;c[t>>2]=0;a[q]=1;a[v]=69;j=e+4|0;A=a[A]|0;B=a[x]|0;x=c[f>>2]|0;a:while(1){if((x|0)!=0){if((c[x+12>>2]|0)==(c[x+16>>2]|0)?(Pc[c[(c[x>>2]|0)+36>>2]&127](x)|0)==-1:0){c[f>>2]=0;x=0}}else{x=0}E=(x|0)==0;C=c[g>>2]|0;do{if((C|0)!=0){if((c[C+12>>2]|0)!=(c[C+16>>2]|0)){if(E){break}else{break a}}if(!((Pc[c[(c[C>>2]|0)+36>>2]&127](C)|0)==-1)){if(E){break}else{break a}}else{c[g>>2]=0;m=14;break}}else{m=14}}while(0);if((m|0)==14){m=0;if(E){C=0;break}else{C=0}}E=a[e]|0;G=(E&1)==0;if(G){F=(E&255)>>>1}else{F=c[j>>2]|0}if(((c[r>>2]|0)-D|0)==(F|0)){if(G){D=(E&255)>>>1;E=(E&255)>>>1}else{E=c[j>>2]|0;D=E}yi(e,D<<1,0);if((a[e]&1)==0){D=10}else{D=(c[e>>2]&-2)+ -1|0}yi(e,D,0);if((a[e]&1)==0){D=y}else{D=c[z>>2]|0}c[r>>2]=D+E}F=x+12|0;G=c[F>>2]|0;E=x+16|0;if((G|0)==(c[E>>2]|0)){G=Pc[c[(c[x>>2]|0)+36>>2]&127](x)|0}else{G=d[G]|0}if((dl(G&255,q,v,D,r,A,B,n,s,u,t,w)|0)!=0){break}C=c[F>>2]|0;if((C|0)==(c[E>>2]|0)){Pc[c[(c[x>>2]|0)+40>>2]&127](x)|0;continue}else{c[F>>2]=C+1;continue}}v=a[n]|0;if((v&1)==0){v=(v&255)>>>1}else{v=c[n+4>>2]|0}if(((v|0)!=0?(a[q]|0)!=0:0)?(p=c[u>>2]|0,(p-s|0)<160):0){G=c[t>>2]|0;c[u>>2]=p+4;c[p>>2]=G}h[l>>3]=+Qp(D,c[r>>2]|0,k);nn(n,s,c[u>>2]|0,k);if((x|0)!=0){if((c[x+12>>2]|0)==(c[x+16>>2]|0)?(Pc[c[(c[x>>2]|0)+36>>2]&127](x)|0)==-1:0){c[f>>2]=0;x=0}}else{x=0}p=(x|0)==0;do{if((C|0)!=0){if((c[C+12>>2]|0)!=(c[C+16>>2]|0)){if(!p){break}c[b>>2]=x;vi(e);vi(n);i=o;return}if((Pc[c[(c[C>>2]|0)+36>>2]&127](C)|0)==-1){c[g>>2]=0;m=51;break}if(p^(C|0)==0){c[b>>2]=x;vi(e);vi(n);i=o;return}}else{m=51}}while(0);if((m|0)==51?!p:0){c[b>>2]=x;vi(e);vi(n);i=o;return}c[k>>2]=c[k>>2]|2;c[b>>2]=x;vi(e);vi(n);i=o;return}function Ak(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0;b=i;i=i+16|0;j=b+12|0;k=b+8|0;m=b+4|0;l=b;c[m>>2]=c[d>>2];c[l>>2]=c[e>>2];c[k+0>>2]=c[m+0>>2];c[j+0>>2]=c[l+0>>2];Bk(a,0,k,j,f,g,h);i=b;return}function Bk(b,e,f,g,j,k,l){b=b|0;e=e|0;f=f|0;g=g|0;j=j|0;k=k|0;l=l|0;var m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0;o=i;i=i+240|0;w=o+200|0;A=o+199|0;x=o+198|0;n=o+184|0;e=o+172|0;r=o+168|0;s=o+8|0;u=o+4|0;t=o;q=o+197|0;v=o+196|0;cl(n,j,w,A,x);c[e+0>>2]=0;c[e+4>>2]=0;c[e+8>>2]=0;yi(e,10,0);if((a[e]&1)==0){D=e+1|0;y=D;z=e+8|0}else{D=e+8|0;y=e+1|0;z=D;D=c[D>>2]|0}c[r>>2]=D;c[u>>2]=s;c[t>>2]=0;a[q]=1;a[v]=69;j=e+4|0;A=a[A]|0;B=a[x]|0;x=c[f>>2]|0;a:while(1){if((x|0)!=0){if((c[x+12>>2]|0)==(c[x+16>>2]|0)?(Pc[c[(c[x>>2]|0)+36>>2]&127](x)|0)==-1:0){c[f>>2]=0;x=0}}else{x=0}E=(x|0)==0;C=c[g>>2]|0;do{if((C|0)!=0){if((c[C+12>>2]|0)!=(c[C+16>>2]|0)){if(E){break}else{break a}}if(!((Pc[c[(c[C>>2]|0)+36>>2]&127](C)|0)==-1)){if(E){break}else{break a}}else{c[g>>2]=0;m=14;break}}else{m=14}}while(0);if((m|0)==14){m=0;if(E){C=0;break}else{C=0}}E=a[e]|0;G=(E&1)==0;if(G){F=(E&255)>>>1}else{F=c[j>>2]|0}if(((c[r>>2]|0)-D|0)==(F|0)){if(G){D=(E&255)>>>1;E=(E&255)>>>1}else{E=c[j>>2]|0;D=E}yi(e,D<<1,0);if((a[e]&1)==0){D=10}else{D=(c[e>>2]&-2)+ -1|0}yi(e,D,0);if((a[e]&1)==0){D=y}else{D=c[z>>2]|0}c[r>>2]=D+E}F=x+12|0;G=c[F>>2]|0;E=x+16|0;if((G|0)==(c[E>>2]|0)){G=Pc[c[(c[x>>2]|0)+36>>2]&127](x)|0}else{G=d[G]|0}if((dl(G&255,q,v,D,r,A,B,n,s,u,t,w)|0)!=0){break}C=c[F>>2]|0;if((C|0)==(c[E>>2]|0)){Pc[c[(c[x>>2]|0)+40>>2]&127](x)|0;continue}else{c[F>>2]=C+1;continue}}v=a[n]|0;if((v&1)==0){v=(v&255)>>>1}else{v=c[n+4>>2]|0}if(((v|0)!=0?(a[q]|0)!=0:0)?(p=c[u>>2]|0,(p-s|0)<160):0){G=c[t>>2]|0;c[u>>2]=p+4;c[p>>2]=G}h[l>>3]=+Pp(D,c[r>>2]|0,k);nn(n,s,c[u>>2]|0,k);if((x|0)!=0){if((c[x+12>>2]|0)==(c[x+16>>2]|0)?(Pc[c[(c[x>>2]|0)+36>>2]&127](x)|0)==-1:0){c[f>>2]=0;x=0}}else{x=0}p=(x|0)==0;do{if((C|0)!=0){if((c[C+12>>2]|0)!=(c[C+16>>2]|0)){if(!p){break}c[b>>2]=x;vi(e);vi(n);i=o;return}if((Pc[c[(c[C>>2]|0)+36>>2]&127](C)|0)==-1){c[g>>2]=0;m=51;break}if(p^(C|0)==0){c[b>>2]=x;vi(e);vi(n);i=o;return}}else{m=51}}while(0);if((m|0)==51?!p:0){c[b>>2]=x;vi(e);vi(n);i=o;return}c[k>>2]=c[k>>2]|2;c[b>>2]=x;vi(e);vi(n);i=o;return}



function hn(e,f,g,h,j,k,l,m,n,o,p){e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;n=n|0;o=o|0;p=p|0;var q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,_=0,$=0,aa=0,ba=0,ca=0,da=0,ea=0;t=i;i=i+480|0;X=t+72|0;C=t+68|0;A=t+473|0;D=t+472|0;q=t+56|0;v=t+44|0;w=t+32|0;u=t+20|0;s=t+8|0;B=t+4|0;r=t;c[C>>2]=0;c[q+0>>2]=0;c[q+4>>2]=0;c[q+8>>2]=0;c[v+0>>2]=0;c[v+4>>2]=0;c[v+8>>2]=0;c[w+0>>2]=0;c[w+4>>2]=0;c[w+8>>2]=0;c[u+0>>2]=0;c[u+4>>2]=0;c[u+8>>2]=0;c[s+0>>2]=0;c[s+4>>2]=0;c[s+8>>2]=0;mn(g,h,C,A,D,q,v,w,u,B);c[o>>2]=c[n>>2];g=m+8|0;I=u+1|0;m=u+4|0;H=u+8|0;G=w+1|0;h=w+4|0;F=w+8|0;K=(j&512|0)!=0;j=v+1|0;Q=v+8|0;P=v+4|0;O=s+1|0;N=s+8|0;M=s+4|0;J=C+3|0;R=n+4|0;L=q+4|0;V=X+400|0;W=X;T=0;S=0;U=146;a:while(1){Y=c[e>>2]|0;do{if((Y|0)!=0){if((c[Y+12>>2]|0)==(c[Y+16>>2]|0)){if((Pc[c[(c[Y>>2]|0)+36>>2]&127](Y)|0)==-1){c[e>>2]=0;Y=0;break}else{Y=c[e>>2]|0;break}}}else{Y=0}}while(0);Z=(Y|0)==0;Y=c[f>>2]|0;do{if((Y|0)!=0){if((c[Y+12>>2]|0)!=(c[Y+16>>2]|0)){if(Z){break}else{z=X;E=U;x=269;break a}}if(!((Pc[c[(c[Y>>2]|0)+36>>2]&127](Y)|0)==-1)){if(Z){break}else{z=X;E=U;x=269;break a}}else{c[f>>2]=0;x=12;break}}else{x=12}}while(0);if((x|0)==12){x=0;if(Z){z=X;E=U;x=269;break}else{Y=0}}b:do{switch(a[C+T|0]|0){case 3:{Y=a[w]|0;_=(Y&1)==0;if(_){aa=(Y&255)>>>1}else{aa=c[h>>2]|0}Z=a[u]|0;$=(Z&1)==0;if($){ba=(Z&255)>>>1}else{ba=c[m>>2]|0}if((aa|0)!=(0-ba|0)){if(_){aa=(Y&255)>>>1}else{aa=c[h>>2]|0}if((aa|0)!=0){if($){$=(Z&255)>>>1}else{$=c[m>>2]|0}if(($|0)!=0){_=c[e>>2]|0;$=c[_+12>>2]|0;aa=c[_+16>>2]|0;if(($|0)==(aa|0)){Z=Pc[c[(c[_>>2]|0)+36>>2]&127](_)|0;aa=c[e>>2]|0;Y=a[w]|0;_=aa;$=c[aa+12>>2]|0;aa=c[aa+16>>2]|0}else{Z=d[$]|0}ba=_+12|0;aa=($|0)==(aa|0);if((Z&255)<<24>>24==(a[(Y&1)==0?G:c[F>>2]|0]|0)){if(aa){Pc[c[(c[_>>2]|0)+40>>2]&127](_)|0}else{c[ba>>2]=$+1}Y=a[w]|0;if((Y&1)==0){Y=(Y&255)>>>1}else{Y=c[h>>2]|0}S=Y>>>0>1?w:S;break b}if(aa){Y=Pc[c[(c[_>>2]|0)+36>>2]&127](_)|0}else{Y=d[$]|0}if(!((Y&255)<<24>>24==(a[(a[u]&1)==0?I:c[H>>2]|0]|0))){x=112;break a}_=c[e>>2]|0;Y=_+12|0;Z=c[Y>>2]|0;if((Z|0)==(c[_+16>>2]|0)){Pc[c[(c[_>>2]|0)+40>>2]&127](_)|0}else{c[Y>>2]=Z+1}a[l]=1;Y=a[u]|0;if((Y&1)==0){Y=(Y&255)>>>1}else{Y=c[m>>2]|0}S=Y>>>0>1?u:S;break b}}if(_){ba=(Y&255)>>>1}else{ba=c[h>>2]|0}aa=c[e>>2]|0;$=c[aa+12>>2]|0;_=($|0)==(c[aa+16>>2]|0);if((ba|0)==0){if(_){Y=Pc[c[(c[aa>>2]|0)+36>>2]&127](aa)|0;Z=a[u]|0}else{Y=d[$]|0}if(!((Y&255)<<24>>24==(a[(Z&1)==0?I:c[H>>2]|0]|0))){break b}Y=c[e>>2]|0;Z=Y+12|0;_=c[Z>>2]|0;if((_|0)==(c[Y+16>>2]|0)){Pc[c[(c[Y>>2]|0)+40>>2]&127](Y)|0}else{c[Z>>2]=_+1}a[l]=1;Y=a[u]|0;if((Y&1)==0){Y=(Y&255)>>>1}else{Y=c[m>>2]|0}S=Y>>>0>1?u:S;break b}if(_){Z=Pc[c[(c[aa>>2]|0)+36>>2]&127](aa)|0;Y=a[w]|0}else{Z=d[$]|0}if(!((Z&255)<<24>>24==(a[(Y&1)==0?G:c[F>>2]|0]|0))){a[l]=1;break b}Y=c[e>>2]|0;Z=Y+12|0;_=c[Z>>2]|0;if((_|0)==(c[Y+16>>2]|0)){Pc[c[(c[Y>>2]|0)+40>>2]&127](Y)|0}else{c[Z>>2]=_+1}Y=a[w]|0;if((Y&1)==0){Y=(Y&255)>>>1}else{Y=c[h>>2]|0}S=Y>>>0>1?w:S}break};case 1:{if((T|0)==3){z=X;E=U;x=269;break a}Z=c[e>>2]|0;x=c[Z+12>>2]|0;if((x|0)==(c[Z+16>>2]|0)){x=Pc[c[(c[Z>>2]|0)+36>>2]&127](Z)|0}else{x=d[x]|0}if(!((x&255)<<24>>24>-1)){x=25;break a}if((b[(c[g>>2]|0)+(x<<24>>24<<1)>>1]&8192)==0){x=25;break a}x=c[e>>2]|0;_=x+12|0;Z=c[_>>2]|0;if((Z|0)==(c[x+16>>2]|0)){x=Pc[c[(c[x>>2]|0)+40>>2]&127](x)|0}else{c[_>>2]=Z+1;x=d[Z]|0}Bi(s,x&255);x=26;break};case 0:{x=26;break};case 2:{if(!((S|0)!=0|T>>>0<2)){if((T|0)==2){Z=(a[J]|0)!=0}else{Z=0}if(!(K|Z)){S=0;break b}}_=a[v]|0;$=(_&1)==0;Z=$?j:c[Q>>2]|0;c:do{if((T|0)!=0?(d[C+(T+ -1)|0]|0)<2:0){$=Z+($?(_&255)>>>1:c[P>>2]|0)|0;aa=Z;while(1){if((aa|0)==($|0)){break}ba=a[aa]|0;if(!(ba<<24>>24>-1)){$=aa;break}if((b[(c[g>>2]|0)+(ba<<24>>24<<1)>>1]&8192)==0){$=aa;break}else{aa=aa+1|0}}aa=$-Z|0;da=a[s]|0;ca=(da&1)==0;if(ca){ba=(da&255)>>>1}else{ba=c[M>>2]|0}if(!(aa>>>0>ba>>>0)){if(ca){ca=(da&255)>>>1;da=O;ba=ca;ca=s+(ca-aa)+1|0}else{ea=c[N>>2]|0;ca=c[M>>2]|0;da=ea;ba=ca;ca=ea+(ca-aa)|0}aa=da+ba|0;if((ca|0)==(aa|0)){aa=Y;Z=$}else{ba=Z;while(1){if((a[ca]|0)!=(a[ba]|0)){aa=Y;break c}ca=ca+1|0;if((ca|0)==(aa|0)){aa=Y;Z=$;break}else{ba=ba+1|0}}}}else{aa=Y}}else{aa=Y}}while(0);d:while(1){if((_&1)==0){$=j;_=(_&255)>>>1}else{$=c[Q>>2]|0;_=c[P>>2]|0}if((Z|0)==($+_|0)){break}_=c[e>>2]|0;do{if((_|0)!=0){if((c[_+12>>2]|0)==(c[_+16>>2]|0)){if((Pc[c[(c[_>>2]|0)+36>>2]&127](_)|0)==-1){c[e>>2]=0;_=0;break}else{_=c[e>>2]|0;break}}}else{_=0}}while(0);_=(_|0)==0;do{if((Y|0)!=0){if((c[Y+12>>2]|0)!=(c[Y+16>>2]|0)){if(_){_=aa;break}else{break d}}if(!((Pc[c[(c[Y>>2]|0)+36>>2]&127](Y)|0)==-1)){if(_^(aa|0)==0){_=aa;Y=aa;break}else{break d}}else{c[f>>2]=0;aa=0;x=147;break}}else{x=147}}while(0);if((x|0)==147){x=0;if(_){break}else{_=aa;Y=0}}$=c[e>>2]|0;aa=c[$+12>>2]|0;if((aa|0)==(c[$+16>>2]|0)){$=Pc[c[(c[$>>2]|0)+36>>2]&127]($)|0}else{$=d[aa]|0}if(!(($&255)<<24>>24==(a[Z]|0))){break}$=c[e>>2]|0;aa=$+12|0;ba=c[aa>>2]|0;if((ba|0)==(c[$+16>>2]|0)){Pc[c[(c[$>>2]|0)+40>>2]&127]($)|0}else{c[aa>>2]=ba+1}aa=_;_=a[v]|0;Z=Z+1|0}if(K){_=a[v]|0;if((_&1)==0){Y=j;_=(_&255)>>>1}else{Y=c[Q>>2]|0;_=c[P>>2]|0}if((Z|0)!=(Y+_|0)){x=162;break a}}break};case 4:{Y=0;e:while(1){Z=c[e>>2]|0;do{if((Z|0)!=0){if((c[Z+12>>2]|0)==(c[Z+16>>2]|0)){if((Pc[c[(c[Z>>2]|0)+36>>2]&127](Z)|0)==-1){c[e>>2]=0;Z=0;break}else{Z=c[e>>2]|0;break}}}else{Z=0}}while(0);_=(Z|0)==0;Z=c[f>>2]|0;do{if((Z|0)!=0){if((c[Z+12>>2]|0)!=(c[Z+16>>2]|0)){if(_){break}else{break e}}if(!((Pc[c[(c[Z>>2]|0)+36>>2]&127](Z)|0)==-1)){if(_){break}else{break e}}else{c[f>>2]=0;x=173;break}}else{x=173}}while(0);if((x|0)==173?(x=0,_):0){break}_=c[e>>2]|0;Z=c[_+12>>2]|0;if((Z|0)==(c[_+16>>2]|0)){_=Pc[c[(c[_>>2]|0)+36>>2]&127](_)|0}else{_=d[Z]|0}Z=_&255;if(Z<<24>>24>-1?!((b[(c[g>>2]|0)+(_<<24>>24<<1)>>1]&2048)==0):0){_=c[o>>2]|0;if((_|0)==(p|0)){$=(c[R>>2]|0)!=146;aa=c[n>>2]|0;_=p-aa|0;p=_>>>0<2147483647?_<<1:-1;aa=Tq($?aa:0,p)|0;if((aa|0)==0){x=182;break a}if(!$){$=c[n>>2]|0;c[n>>2]=aa;if(($|0)!=0){Lc[c[R>>2]&255]($);aa=c[n>>2]|0}}else{c[n>>2]=aa}c[R>>2]=147;_=aa+_|0;c[o>>2]=_;p=(c[n>>2]|0)+p|0}c[o>>2]=_+1;a[_]=Z;Y=Y+1|0}else{_=a[q]|0;if((_&1)==0){_=(_&255)>>>1}else{_=c[L>>2]|0}if((_|0)==0|(Y|0)==0){break}if(!(Z<<24>>24==(a[D]|0))){break}if((W|0)==(V|0)){W=W-X|0;V=W>>>0<2147483647?W<<1:-1;if((U|0)==146){X=0}U=Tq(X,V)|0;if((U|0)==0){x=198;break a}W=U+(W>>2<<2)|0;X=U;V=U+(V>>>2<<2)|0;U=147}c[W>>2]=Y;W=W+4|0;Y=0}$=c[e>>2]|0;_=$+12|0;Z=c[_>>2]|0;if((Z|0)==(c[$+16>>2]|0)){Pc[c[(c[$>>2]|0)+40>>2]&127]($)|0;continue}else{c[_>>2]=Z+1;continue}}if(!((X|0)==(W|0)|(Y|0)==0)){if((W|0)==(V|0)){W=W-X|0;V=W>>>0<2147483647?W<<1:-1;if((U|0)==146){X=0}U=Tq(X,V)|0;if((U|0)==0){x=209;break a}W=U+(W>>2<<2)|0;X=U;V=U+(V>>>2<<2)|0;U=147}c[W>>2]=Y;W=W+4|0}Z=c[B>>2]|0;if((Z|0)>0){Y=c[e>>2]|0;do{if((Y|0)!=0){if((c[Y+12>>2]|0)==(c[Y+16>>2]|0)){if((Pc[c[(c[Y>>2]|0)+36>>2]&127](Y)|0)==-1){c[e>>2]=0;Y=0;break}else{Y=c[e>>2]|0;break}}}else{Y=0}}while(0);_=(Y|0)==0;Y=c[f>>2]|0;do{if((Y|0)!=0){if((c[Y+12>>2]|0)!=(c[Y+16>>2]|0)){if(_){break}else{x=229;break a}}if(!((Pc[c[(c[Y>>2]|0)+36>>2]&127](Y)|0)==-1)){if(_){break}else{x=229;break a}}else{c[f>>2]=0;x=223;break}}else{x=223}}while(0);if((x|0)==223){x=0;if(_){x=229;break a}else{Y=0}}$=c[e>>2]|0;_=c[$+12>>2]|0;if((_|0)==(c[$+16>>2]|0)){_=Pc[c[(c[$>>2]|0)+36>>2]&127]($)|0}else{_=d[_]|0}if(!((_&255)<<24>>24==(a[A]|0))){x=229;break a}aa=c[e>>2]|0;$=aa+12|0;_=c[$>>2]|0;if((_|0)==(c[aa+16>>2]|0)){Pc[c[(c[aa>>2]|0)+40>>2]&127](aa)|0;$=Y;_=Y}else{c[$>>2]=_+1;$=Y;_=Y}while(1){Y=c[e>>2]|0;do{if((Y|0)!=0){if((c[Y+12>>2]|0)==(c[Y+16>>2]|0)){if((Pc[c[(c[Y>>2]|0)+36>>2]&127](Y)|0)==-1){c[e>>2]=0;Y=0;break}else{Y=c[e>>2]|0;break}}}else{Y=0}}while(0);aa=(Y|0)==0;do{if((_|0)!=0){if((c[_+12>>2]|0)!=(c[_+16>>2]|0)){if(aa){Y=$;break}else{x=250;break a}}if(!((Pc[c[(c[_>>2]|0)+36>>2]&127](_)|0)==-1)){if(aa^($|0)==0){Y=$;_=$;break}else{x=250;break a}}else{c[f>>2]=0;Y=0;x=243;break}}else{Y=$;x=243}}while(0);if((x|0)==243){x=0;if(aa){x=250;break a}else{_=0}}aa=c[e>>2]|0;$=c[aa+12>>2]|0;if(($|0)==(c[aa+16>>2]|0)){$=Pc[c[(c[aa>>2]|0)+36>>2]&127](aa)|0}else{$=d[$]|0}if(!(($&255)<<24>>24>-1)){x=250;break a}if((b[(c[g>>2]|0)+($<<24>>24<<1)>>1]&2048)==0){x=250;break a}$=c[o>>2]|0;if(($|0)==(p|0)){aa=(c[R>>2]|0)!=146;ba=c[n>>2]|0;$=p-ba|0;p=$>>>0<2147483647?$<<1:-1;ba=Tq(aa?ba:0,p)|0;if((ba|0)==0){x=253;break a}if(!aa){aa=c[n>>2]|0;c[n>>2]=ba;if((aa|0)!=0){Lc[c[R>>2]&255](aa);ba=c[n>>2]|0}}else{c[n>>2]=ba}c[R>>2]=147;$=ba+$|0;c[o>>2]=$;p=(c[n>>2]|0)+p|0}ba=c[e>>2]|0;aa=c[ba+12>>2]|0;if((aa|0)==(c[ba+16>>2]|0)){aa=Pc[c[(c[ba>>2]|0)+36>>2]&127](ba)|0;$=c[o>>2]|0}else{aa=d[aa]|0}c[o>>2]=$+1;a[$]=aa;Z=Z+ -1|0;c[B>>2]=Z;$=c[e>>2]|0;aa=$+12|0;ba=c[aa>>2]|0;if((ba|0)==(c[$+16>>2]|0)){Pc[c[(c[$>>2]|0)+40>>2]&127]($)|0}else{c[aa>>2]=ba+1}if((Z|0)>0){$=Y}else{break}}}if((c[o>>2]|0)==(c[n>>2]|0)){x=267;break a}break};default:{}}}while(0);f:do{if((x|0)==26){x=0;if((T|0)==3){z=X;E=U;x=269;break a}else{_=Y;Z=Y}while(1){Y=c[e>>2]|0;do{if((Y|0)!=0){if((c[Y+12>>2]|0)==(c[Y+16>>2]|0)){if((Pc[c[(c[Y>>2]|0)+36>>2]&127](Y)|0)==-1){c[e>>2]=0;Y=0;break}else{Y=c[e>>2]|0;break}}}else{Y=0}}while(0);$=(Y|0)==0;do{if((Z|0)!=0){if((c[Z+12>>2]|0)!=(c[Z+16>>2]|0)){if($){Y=_;break}else{break f}}if(!((Pc[c[(c[Z>>2]|0)+36>>2]&127](Z)|0)==-1)){if($^(_|0)==0){Y=_;Z=_;break}else{break f}}else{c[f>>2]=0;Y=0;x=37;break}}else{Y=_;x=37}}while(0);if((x|0)==37){x=0;if($){break f}else{Z=0}}$=c[e>>2]|0;_=c[$+12>>2]|0;if((_|0)==(c[$+16>>2]|0)){_=Pc[c[(c[$>>2]|0)+36>>2]&127]($)|0}else{_=d[_]|0}if(!((_&255)<<24>>24>-1)){break f}if((b[(c[g>>2]|0)+(_<<24>>24<<1)>>1]&8192)==0){break f}_=c[e>>2]|0;aa=_+12|0;$=c[aa>>2]|0;if(($|0)==(c[_+16>>2]|0)){_=Pc[c[(c[_>>2]|0)+40>>2]&127](_)|0}else{c[aa>>2]=$+1;_=d[$]|0}Bi(s,_&255);_=Y}}}while(0);T=T+1|0;if(!(T>>>0<4)){z=X;E=U;x=269;break}}g:switch(x|0){case 25:{c[k>>2]=c[k>>2]|4;y=0;z=X;E=U;break};case 112:{c[k>>2]=c[k>>2]|4;y=0;z=X;E=U;break};case 162:{c[k>>2]=c[k>>2]|4;y=0;z=X;E=U;break};case 182:{br();break};case 198:{br();break};case 209:{br();break};case 229:{c[k>>2]=c[k>>2]|4;y=0;z=X;E=U;break};case 250:{c[k>>2]=c[k>>2]|4;y=0;z=X;E=U;break};case 253:{br();break};case 267:{c[k>>2]=c[k>>2]|4;y=0;z=X;E=U;break};case 269:{h:do{if((S|0)!=0){o=S+1|0;y=S+8|0;A=S+4|0;B=1;i:while(1){n=a[S]|0;if((n&1)==0){n=(n&255)>>>1}else{n=c[A>>2]|0}if(!(B>>>0<n>>>0)){break h}n=c[e>>2]|0;do{if((n|0)!=0){if((c[n+12>>2]|0)==(c[n+16>>2]|0)){if((Pc[c[(c[n>>2]|0)+36>>2]&127](n)|0)==-1){c[e>>2]=0;n=0;break}else{n=c[e>>2]|0;break}}}else{n=0}}while(0);C=(n|0)==0;n=c[f>>2]|0;do{if((n|0)!=0){if((c[n+12>>2]|0)!=(c[n+16>>2]|0)){if(C){break}else{break i}}if(!((Pc[c[(c[n>>2]|0)+36>>2]&127](n)|0)==-1)){if(C){break}else{break i}}else{c[f>>2]=0;x=285;break}}else{x=285}}while(0);if((x|0)==285?(x=0,C):0){break}C=c[e>>2]|0;n=c[C+12>>2]|0;if((n|0)==(c[C+16>>2]|0)){n=Pc[c[(c[C>>2]|0)+36>>2]&127](C)|0}else{n=d[n]|0}if((a[S]&1)==0){C=o}else{C=c[y>>2]|0}if(!((n&255)<<24>>24==(a[C+B|0]|0))){break}B=B+1|0;D=c[e>>2]|0;C=D+12|0;n=c[C>>2]|0;if((n|0)==(c[D+16>>2]|0)){Pc[c[(c[D>>2]|0)+40>>2]&127](D)|0;continue}else{c[C>>2]=n+1;continue}}c[k>>2]=c[k>>2]|4;y=0;break g}}while(0);if((z|0)!=(W|0)){c[r>>2]=0;nn(q,z,W,r);if((c[r>>2]|0)==0){y=1}else{c[k>>2]=c[k>>2]|4;y=0}}else{y=1;z=W}break}}vi(s);vi(u);vi(w);vi(v);vi(q);if((z|0)==0){i=t;return y|0}Lc[E&255](z);i=t;return y|0}function jn(a){a=a|0;var b=0;b=Nb(8)|0;ci(b,a);Ac(b|0,8944,44)}function kn(b,d,e,f,g,h,j,k){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0;m=i;i=i+144|0;u=m;s=m+36|0;d=m+24|0;q=m+20|0;o=m+16|0;r=m+32|0;t=m+12|0;c[d>>2]=s;n=d+4|0;c[n>>2]=146;s=s+100|0;Qi(o,h);p=c[o>>2]|0;if(!((c[2984]|0)==-1)){c[u>>2]=11936;c[u+4>>2]=144;c[u+8>>2]=0;qi(11936,u,145)}w=(c[11940>>2]|0)+ -1|0;v=c[p+8>>2]|0;if(!((c[p+12>>2]|0)-v>>2>>>0>w>>>0)){w=Nb(4)|0;wq(w);Ac(w|0,19896,130)}v=c[v+(w<<2)>>2]|0;if((v|0)==0){w=Nb(4)|0;wq(w);Ac(w|0,19896,130)}a[r]=0;p=c[f>>2]|0;c[t>>2]=p;w=c[h+4>>2]|0;c[u+0>>2]=c[t+0>>2];if(hn(e,u,g,o,w,j,r,v,d,q,s)|0){if((a[k]&1)==0){a[k+1|0]=0;a[k]=0}else{a[c[k+8>>2]|0]=0;c[k+4>>2]=0}if((a[r]|0)!=0){Bi(k,Yc[c[(c[v>>2]|0)+28>>2]&63](v,45)|0)}h=Yc[c[(c[v>>2]|0)+28>>2]&63](v,48)|0;r=c[d>>2]|0;q=c[q>>2]|0;g=q+ -1|0;a:do{if(r>>>0<g>>>0){s=r;while(1){r=s+1|0;if(!((a[s]|0)==h<<24>>24)){r=s;break a}if(r>>>0<g>>>0){s=r}else{break}}}}while(0);ln(k,r,q)|0}k=c[e>>2]|0;if((k|0)!=0){if((c[k+12>>2]|0)==(c[k+16>>2]|0)?(Pc[c[(c[k>>2]|0)+36>>2]&127](k)|0)==-1:0){c[e>>2]=0;k=0}}else{k=0}e=(k|0)==0;do{if((p|0)!=0){if((c[p+12>>2]|0)!=(c[p+16>>2]|0)){if(e){break}else{l=27;break}}if(!((Pc[c[(c[p>>2]|0)+36>>2]&127](p)|0)==-1)){if(e^(p|0)==0){break}else{l=27;break}}else{c[f>>2]=0;l=25;break}}else{l=25}}while(0);if((l|0)==25?e:0){l=27}if((l|0)==27){c[j>>2]=c[j>>2]|2}c[b>>2]=k;Yh(c[o>>2]|0)|0;j=c[d>>2]|0;c[d>>2]=0;if((j|0)==0){i=m;return}Lc[c[n>>2]&255](j);i=m;return}function ln(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0,k=0,l=0;f=i;j=d;l=a[b]|0;if((l&1)==0){g=(l&255)>>>1;k=10}else{l=c[b>>2]|0;g=c[b+4>>2]|0;k=(l&-2)+ -1|0;l=l&255}h=e-j|0;if((e|0)==(d|0)){i=f;return b|0}if((k-g|0)>>>0<h>>>0){Ei(b,k,g+h-k|0,g,g,0,0);l=a[b]|0}if((l&1)==0){k=b+1|0}else{k=c[b+8>>2]|0}j=e+(g-j)|0;l=k+g|0;while(1){a[l]=a[d]|0;d=d+1|0;if((d|0)==(e|0)){break}else{l=l+1|0}}a[k+j|0]=0;e=g+h|0;if((a[b]&1)==0){a[b]=e<<1;i=f;return b|0}else{c[b+4>>2]=e;i=f;return b|0}return 0}function mn(b,d,e,f,g,h,j,k,l,m){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;var n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0;n=i;i=i+128|0;y=n;v=n+112|0;w=n+100|0;x=n+88|0;o=n+76|0;u=n+64|0;r=n+60|0;q=n+48|0;t=n+36|0;p=n+24|0;s=n+12|0;if(b){p=c[d>>2]|0;if(!((c[2844]|0)==-1)){c[y>>2]=11376;c[y+4>>2]=144;c[y+8>>2]=0;qi(11376,y,145)}r=(c[11380>>2]|0)+ -1|0;q=c[p+8>>2]|0;if(!((c[p+12>>2]|0)-q>>2>>>0>r>>>0)){d=Nb(4)|0;wq(d);Ac(d|0,19896,130)}p=c[q+(r<<2)>>2]|0;if((p|0)==0){d=Nb(4)|0;wq(d);Ac(d|0,19896,130)}Mc[c[(c[p>>2]|0)+44>>2]&63](v,p);d=c[v>>2]|0;a[e]=d;a[e+1|0]=d>>8;a[e+2|0]=d>>16;a[e+3|0]=d>>24;Mc[c[(c[p>>2]|0)+32>>2]&63](w,p);if((a[l]&1)==0){a[l+1|0]=0;a[l]=0}else{a[c[l+8>>2]|0]=0;c[l+4>>2]=0}Ai(l,0);c[l+0>>2]=c[w+0>>2];c[l+4>>2]=c[w+4>>2];c[l+8>>2]=c[w+8>>2];c[w+0>>2]=0;c[w+4>>2]=0;c[w+8>>2]=0;vi(w);Mc[c[(c[p>>2]|0)+28>>2]&63](x,p);if((a[k]&1)==0){a[k+1|0]=0;a[k]=0}else{a[c[k+8>>2]|0]=0;c[k+4>>2]=0}Ai(k,0);c[k+0>>2]=c[x+0>>2];c[k+4>>2]=c[x+4>>2];c[k+8>>2]=c[x+8>>2];c[x+0>>2]=0;c[x+4>>2]=0;c[x+8>>2]=0;vi(x);a[f]=Pc[c[(c[p>>2]|0)+12>>2]&127](p)|0;a[g]=Pc[c[(c[p>>2]|0)+16>>2]&127](p)|0;Mc[c[(c[p>>2]|0)+20>>2]&63](o,p);if((a[h]&1)==0){a[h+1|0]=0;a[h]=0}else{a[c[h+8>>2]|0]=0;c[h+4>>2]=0}Ai(h,0);c[h+0>>2]=c[o+0>>2];c[h+4>>2]=c[o+4>>2];c[h+8>>2]=c[o+8>>2];c[o+0>>2]=0;c[o+4>>2]=0;c[o+8>>2]=0;vi(o);Mc[c[(c[p>>2]|0)+24>>2]&63](u,p);if((a[j]&1)==0){a[j+1|0]=0;a[j]=0}else{a[c[j+8>>2]|0]=0;c[j+4>>2]=0}Ai(j,0);c[j+0>>2]=c[u+0>>2];c[j+4>>2]=c[u+4>>2];c[j+8>>2]=c[u+8>>2];c[u+0>>2]=0;c[u+4>>2]=0;c[u+8>>2]=0;vi(u);d=Pc[c[(c[p>>2]|0)+36>>2]&127](p)|0;c[m>>2]=d;i=n;return}else{o=c[d>>2]|0;if(!((c[2828]|0)==-1)){c[y>>2]=11312;c[y+4>>2]=144;c[y+8>>2]=0;qi(11312,y,145)}u=(c[11316>>2]|0)+ -1|0;v=c[o+8>>2]|0;if(!((c[o+12>>2]|0)-v>>2>>>0>u>>>0)){d=Nb(4)|0;wq(d);Ac(d|0,19896,130)}o=c[v+(u<<2)>>2]|0;if((o|0)==0){d=Nb(4)|0;wq(d);Ac(d|0,19896,130)}Mc[c[(c[o>>2]|0)+44>>2]&63](r,o);d=c[r>>2]|0;a[e]=d;a[e+1|0]=d>>8;a[e+2|0]=d>>16;a[e+3|0]=d>>24;Mc[c[(c[o>>2]|0)+32>>2]&63](q,o);if((a[l]&1)==0){a[l+1|0]=0;a[l]=0}else{a[c[l+8>>2]|0]=0;c[l+4>>2]=0}Ai(l,0);c[l+0>>2]=c[q+0>>2];c[l+4>>2]=c[q+4>>2];c[l+8>>2]=c[q+8>>2];c[q+0>>2]=0;c[q+4>>2]=0;c[q+8>>2]=0;vi(q);Mc[c[(c[o>>2]|0)+28>>2]&63](t,o);if((a[k]&1)==0){a[k+1|0]=0;a[k]=0}else{a[c[k+8>>2]|0]=0;c[k+4>>2]=0}Ai(k,0);c[k+0>>2]=c[t+0>>2];c[k+4>>2]=c[t+4>>2];c[k+8>>2]=c[t+8>>2];c[t+0>>2]=0;c[t+4>>2]=0;c[t+8>>2]=0;vi(t);a[f]=Pc[c[(c[o>>2]|0)+12>>2]&127](o)|0;a[g]=Pc[c[(c[o>>2]|0)+16>>2]&127](o)|0;Mc[c[(c[o>>2]|0)+20>>2]&63](p,o);if((a[h]&1)==0){a[h+1|0]=0;a[h]=0}else{a[c[h+8>>2]|0]=0;c[h+4>>2]=0}Ai(h,0);c[h+0>>2]=c[p+0>>2];c[h+4>>2]=c[p+4>>2];c[h+8>>2]=c[p+8>>2];c[p+0>>2]=0;c[p+4>>2]=0;c[p+8>>2]=0;vi(p);Mc[c[(c[o>>2]|0)+24>>2]&63](s,o);if((a[j]&1)==0){a[j+1|0]=0;a[j]=0}else{a[c[j+8>>2]|0]=0;c[j+4>>2]=0}Ai(j,0);c[j+0>>2]=c[s+0>>2];c[j+4>>2]=c[s+4>>2];c[j+8>>2]=c[s+8>>2];c[s+0>>2]=0;c[s+4>>2]=0;c[s+8>>2]=0;vi(s);d=Pc[c[(c[o>>2]|0)+36>>2]&127](o)|0;c[m>>2]=d;i=n;return}}function nn(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0;g=i;k=a[b]|0;if((k&1)==0){j=(k&255)>>>1}else{j=c[b+4>>2]|0}if((j|0)==0){i=g;return}if((d|0)!=(e|0)?(h=e+ -4|0,h>>>0>d>>>0):0){j=d;do{k=c[j>>2]|0;c[j>>2]=c[h>>2];c[h>>2]=k;j=j+4|0;h=h+ -4|0}while(j>>>0<h>>>0);h=a[b]|0}else{h=k}if((h&1)==0){k=b+1|0;b=(h&255)>>>1}else{k=c[b+8>>2]|0;b=c[b+4>>2]|0}e=e+ -4|0;h=a[k]|0;j=h<<24>>24<1|h<<24>>24==127;a:do{if(e>>>0>d>>>0){b=k+b|0;while(1){if(!j?(h<<24>>24|0)!=(c[d>>2]|0):0){break}k=(b-k|0)>1?k+1|0:k;d=d+4|0;h=a[k]|0;j=h<<24>>24<1|h<<24>>24==127;if(!(d>>>0<e>>>0)){break a}}c[f>>2]=4;i=g;return}}while(0);if(j){i=g;return}k=c[e>>2]|0;if(!(h<<24>>24>>>0<k>>>0|(k|0)==0)){i=g;return}c[f>>2]=4;i=g;return}function on(a){a=a|0;var b=0;b=i;Yq(a);i=b;return}function pn(a){a=a|0;return}function qn(b,d,e,f,g,h,j,k){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0;l=i;i=i+592|0;r=l;w=l+80|0;d=l+72|0;s=l+64|0;o=l+60|0;v=l+580|0;x=l+56|0;t=l+16|0;q=l+480|0;c[d>>2]=w;n=d+4|0;c[n>>2]=146;w=w+400|0;Qi(o,h);A=c[o>>2]|0;if(!((c[2982]|0)==-1)){c[r>>2]=11928;c[r+4>>2]=144;c[r+8>>2]=0;qi(11928,r,145)}z=(c[11932>>2]|0)+ -1|0;y=c[A+8>>2]|0;if(!((c[A+12>>2]|0)-y>>2>>>0>z>>>0)){A=Nb(4)|0;wq(A);Ac(A|0,19896,130)}y=c[y+(z<<2)>>2]|0;if((y|0)==0){A=Nb(4)|0;wq(A);Ac(A|0,19896,130)}a[v]=0;c[x>>2]=c[f>>2];A=c[h+4>>2]|0;c[r+0>>2]=c[x+0>>2];if(rn(e,r,g,o,A,j,v,y,d,s,w)|0){Vc[c[(c[y>>2]|0)+48>>2]&31](y,11632,11642|0,t)|0;g=c[s>>2]|0;h=c[d>>2]|0;w=g-h|0;if((w|0)>392){w=Rq((w>>2)+2|0)|0;if((w|0)==0){br()}else{p=w;u=w}}else{p=0;u=q}if((a[v]|0)!=0){a[u]=45;u=u+1|0}if(h>>>0<g>>>0){g=t+40|0;v=t;do{y=c[h>>2]|0;w=t;while(1){x=w+4|0;if((c[w>>2]|0)==(y|0)){break}if((x|0)==(g|0)){w=g;break}else{w=x}}a[u]=a[11632+(w-v>>2)|0]|0;h=h+4|0;u=u+1|0}while(h>>>0<(c[s>>2]|0)>>>0)}a[u]=0;c[r>>2]=k;if((nc(q|0,11568,r|0)|0)!=1){A=Nb(8)|0;ci(A,11576);Ac(A|0,8944,44)}if((p|0)!=0){Sq(p)}}k=c[e>>2]|0;do{if((k|0)!=0){p=c[k+12>>2]|0;if((p|0)==(c[k+16>>2]|0)){k=Pc[c[(c[k>>2]|0)+36>>2]&127](k)|0}else{k=c[p>>2]|0}if((k|0)==-1){c[e>>2]=0;k=1;break}else{k=(c[e>>2]|0)==0;break}}else{k=1}}while(0);p=c[f>>2]|0;do{if((p|0)!=0){q=c[p+12>>2]|0;if((q|0)==(c[p+16>>2]|0)){p=Pc[c[(c[p>>2]|0)+36>>2]&127](p)|0}else{p=c[q>>2]|0}if(!((p|0)==-1)){if(k){break}else{m=37;break}}else{c[f>>2]=0;m=35;break}}else{m=35}}while(0);if((m|0)==35?k:0){m=37}if((m|0)==37){c[j>>2]=c[j>>2]|2}c[b>>2]=c[e>>2];Yh(c[o>>2]|0)|0;f=c[d>>2]|0;c[d>>2]=0;if((f|0)==0){i=l;return}Lc[c[n>>2]&255](f);i=l;return}function rn(b,e,f,g,h,j,k,l,m,n,o){b=b|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;n=n|0;o=o|0;var p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,_=0,$=0;p=i;i=i+480|0;R=p+80|0;A=p+76|0;D=p+72|0;B=p+68|0;s=p+56|0;v=p+44|0;r=p+32|0;q=p+20|0;t=p+8|0;C=p+4|0;u=p;c[A>>2]=0;c[s+0>>2]=0;c[s+4>>2]=0;c[s+8>>2]=0;c[v+0>>2]=0;c[v+4>>2]=0;c[v+8>>2]=0;c[r+0>>2]=0;c[r+4>>2]=0;c[r+8>>2]=0;c[q+0>>2]=0;c[q+4>>2]=0;c[q+8>>2]=0;c[t+0>>2]=0;c[t+4>>2]=0;c[t+8>>2]=0;un(f,g,A,D,B,s,v,r,q,C);c[n>>2]=c[m>>2];g=q+4|0;E=q+8|0;F=r+4|0;f=r+8|0;I=(h&512|0)!=0;J=v+4|0;G=v+8|0;h=t+4|0;M=t+8|0;K=A+3|0;H=m+4|0;L=s+4|0;Q=R+400|0;S=R;O=0;N=0;P=146;a:while(1){U=c[b>>2]|0;do{if((U|0)!=0){T=c[U+12>>2]|0;if((T|0)==(c[U+16>>2]|0)){T=Pc[c[(c[U>>2]|0)+36>>2]&127](U)|0}else{T=c[T>>2]|0}if((T|0)==-1){c[b>>2]=0;U=1;break}else{U=(c[b>>2]|0)==0;break}}else{U=1}}while(0);T=c[e>>2]|0;do{if((T|0)!=0){V=c[T+12>>2]|0;if((V|0)==(c[T+16>>2]|0)){V=Pc[c[(c[T>>2]|0)+36>>2]&127](T)|0}else{V=c[V>>2]|0}if(!((V|0)==-1)){if(U){break}else{y=R;z=P;w=292;break a}}else{c[e>>2]=0;w=15;break}}else{w=15}}while(0);if((w|0)==15){w=0;if(U){y=R;z=P;w=292;break}else{T=0}}b:do{switch(a[A+O|0]|0){case 0:{w=28;break};case 3:{T=a[r]|0;V=(T&1)==0;if(V){Y=(T&255)>>>1}else{Y=c[F>>2]|0}U=a[q]|0;W=(U&1)==0;if(W){X=(U&255)>>>1}else{X=c[g>>2]|0}if((Y|0)!=(0-X|0)){if(V){X=(T&255)>>>1}else{X=c[F>>2]|0}if((X|0)!=0){if(W){W=(U&255)>>>1}else{W=c[g>>2]|0}if((W|0)!=0){U=c[b>>2]|0;V=c[U+12>>2]|0;if((V|0)==(c[U+16>>2]|0)){U=Pc[c[(c[U>>2]|0)+36>>2]&127](U)|0;T=a[r]|0}else{U=c[V>>2]|0}Y=c[b>>2]|0;W=Y+12|0;X=c[W>>2]|0;V=(X|0)==(c[Y+16>>2]|0);if((U|0)==(c[((T&1)==0?F:c[f>>2]|0)>>2]|0)){if(V){Pc[c[(c[Y>>2]|0)+40>>2]&127](Y)|0}else{c[W>>2]=X+4}T=a[r]|0;if((T&1)==0){T=(T&255)>>>1}else{T=c[F>>2]|0}N=T>>>0>1?r:N;break b}if(V){T=Pc[c[(c[Y>>2]|0)+36>>2]&127](Y)|0}else{T=c[X>>2]|0}if((T|0)!=(c[((a[q]&1)==0?g:c[E>>2]|0)>>2]|0)){w=116;break a}V=c[b>>2]|0;U=V+12|0;T=c[U>>2]|0;if((T|0)==(c[V+16>>2]|0)){Pc[c[(c[V>>2]|0)+40>>2]&127](V)|0}else{c[U>>2]=T+4}a[k]=1;T=a[q]|0;if((T&1)==0){T=(T&255)>>>1}else{T=c[g>>2]|0}N=T>>>0>1?q:N;break b}}if(V){Y=(T&255)>>>1}else{Y=c[F>>2]|0}X=c[b>>2]|0;W=c[X+12>>2]|0;V=(W|0)==(c[X+16>>2]|0);if((Y|0)==0){if(V){T=Pc[c[(c[X>>2]|0)+36>>2]&127](X)|0;U=a[q]|0}else{T=c[W>>2]|0}if((T|0)!=(c[((U&1)==0?g:c[E>>2]|0)>>2]|0)){break b}V=c[b>>2]|0;T=V+12|0;U=c[T>>2]|0;if((U|0)==(c[V+16>>2]|0)){Pc[c[(c[V>>2]|0)+40>>2]&127](V)|0}else{c[T>>2]=U+4}a[k]=1;T=a[q]|0;if((T&1)==0){T=(T&255)>>>1}else{T=c[g>>2]|0}N=T>>>0>1?q:N;break b}if(V){U=Pc[c[(c[X>>2]|0)+36>>2]&127](X)|0;T=a[r]|0}else{U=c[W>>2]|0}if((U|0)!=(c[((T&1)==0?F:c[f>>2]|0)>>2]|0)){a[k]=1;break b}V=c[b>>2]|0;U=V+12|0;T=c[U>>2]|0;if((T|0)==(c[V+16>>2]|0)){Pc[c[(c[V>>2]|0)+40>>2]&127](V)|0}else{c[U>>2]=T+4}T=a[r]|0;if((T&1)==0){T=(T&255)>>>1}else{T=c[F>>2]|0}N=T>>>0>1?r:N}break};case 1:{if((O|0)==3){y=R;z=P;w=292;break a}w=c[b>>2]|0;U=c[w+12>>2]|0;if((U|0)==(c[w+16>>2]|0)){w=Pc[c[(c[w>>2]|0)+36>>2]&127](w)|0}else{w=c[U>>2]|0}if(!(Hc[c[(c[l>>2]|0)+12>>2]&31](l,8192,w)|0)){w=27;break a}V=c[b>>2]|0;w=V+12|0;U=c[w>>2]|0;if((U|0)==(c[V+16>>2]|0)){w=Pc[c[(c[V>>2]|0)+40>>2]&127](V)|0}else{c[w>>2]=U+4;w=c[U>>2]|0}Li(t,w);w=28;break};case 2:{if(!((N|0)!=0|O>>>0<2)){if((O|0)==2){U=(a[K]|0)!=0}else{U=0}if(!(I|U)){N=0;break b}}X=a[v]|0;U=(X&1)==0?J:c[G>>2]|0;c:do{if((O|0)!=0?(d[A+(O+ -1)|0]|0)<2:0){while(1){if((X&1)==0){W=J;V=(X&255)>>>1}else{W=c[G>>2]|0;V=c[J>>2]|0}if((U|0)==(W+(V<<2)|0)){break}if(!(Hc[c[(c[l>>2]|0)+12>>2]&31](l,8192,c[U>>2]|0)|0)){w=129;break}X=a[v]|0;U=U+4|0}if((w|0)==129){w=0;X=a[v]|0}W=(X&1)==0;V=U-(W?J:c[G>>2]|0)>>2;Y=a[t]|0;Z=(Y&1)==0;if(Z){_=(Y&255)>>>1}else{_=c[h>>2]|0}d:do{if(!(V>>>0>_>>>0)){if(Z){_=h;Z=(Y&255)>>>1;Y=h+(((Y&255)>>>1)-V<<2)|0}else{$=c[M>>2]|0;Y=c[h>>2]|0;_=$;Z=Y;Y=$+(Y-V<<2)|0}V=_+(Z<<2)|0;if((Y|0)==(V|0)){V=T;break c}else{Z=W?J:c[G>>2]|0}while(1){if((c[Y>>2]|0)!=(c[Z>>2]|0)){break d}Y=Y+4|0;if((Y|0)==(V|0)){V=T;break c}Z=Z+4|0}}}while(0);V=T;U=W?J:c[G>>2]|0}else{V=T}}while(0);e:while(1){if((X&1)==0){W=J;X=(X&255)>>>1}else{W=c[G>>2]|0;X=c[J>>2]|0}if((U|0)==(W+(X<<2)|0)){break}W=c[b>>2]|0;do{if((W|0)!=0){X=c[W+12>>2]|0;if((X|0)==(c[W+16>>2]|0)){W=Pc[c[(c[W>>2]|0)+36>>2]&127](W)|0}else{W=c[X>>2]|0}if((W|0)==-1){c[b>>2]=0;W=1;break}else{W=(c[b>>2]|0)==0;break}}else{W=1}}while(0);do{if((T|0)!=0){X=c[T+12>>2]|0;if((X|0)==(c[T+16>>2]|0)){T=Pc[c[(c[T>>2]|0)+36>>2]&127](T)|0}else{T=c[X>>2]|0}if(!((T|0)==-1)){if(W^(V|0)==0){W=V;T=V;break}else{break e}}else{c[e>>2]=0;V=0;w=159;break}}else{w=159}}while(0);if((w|0)==159){w=0;if(W){break}else{W=V;T=0}}X=c[b>>2]|0;V=c[X+12>>2]|0;if((V|0)==(c[X+16>>2]|0)){V=Pc[c[(c[X>>2]|0)+36>>2]&127](X)|0}else{V=c[V>>2]|0}if((V|0)!=(c[U>>2]|0)){break}V=c[b>>2]|0;X=V+12|0;Y=c[X>>2]|0;if((Y|0)==(c[V+16>>2]|0)){Pc[c[(c[V>>2]|0)+40>>2]&127](V)|0}else{c[X>>2]=Y+4}V=W;X=a[v]|0;U=U+4|0}if(I){V=a[v]|0;if((V&1)==0){T=J;V=(V&255)>>>1}else{T=c[G>>2]|0;V=c[J>>2]|0}if((U|0)!=(T+(V<<2)|0)){w=174;break a}}break};case 4:{T=0;f:while(1){V=c[b>>2]|0;do{if((V|0)!=0){U=c[V+12>>2]|0;if((U|0)==(c[V+16>>2]|0)){U=Pc[c[(c[V>>2]|0)+36>>2]&127](V)|0}else{U=c[U>>2]|0}if((U|0)==-1){c[b>>2]=0;U=1;break}else{U=(c[b>>2]|0)==0;break}}else{U=1}}while(0);W=c[e>>2]|0;do{if((W|0)!=0){V=c[W+12>>2]|0;if((V|0)==(c[W+16>>2]|0)){V=Pc[c[(c[W>>2]|0)+36>>2]&127](W)|0}else{V=c[V>>2]|0}if(!((V|0)==-1)){if(U){break}else{break f}}else{c[e>>2]=0;w=188;break}}else{w=188}}while(0);if((w|0)==188?(w=0,U):0){break}V=c[b>>2]|0;U=c[V+12>>2]|0;if((U|0)==(c[V+16>>2]|0)){U=Pc[c[(c[V>>2]|0)+36>>2]&127](V)|0}else{U=c[U>>2]|0}if(Hc[c[(c[l>>2]|0)+12>>2]&31](l,2048,U)|0){V=c[n>>2]|0;if((V|0)==(o|0)){V=(c[H>>2]|0)!=146;X=c[m>>2]|0;W=o-X|0;o=W>>>0<2147483647?W<<1:-1;W=W>>2;if(!V){X=0}X=Tq(X,o)|0;if((X|0)==0){w=198;break a}if(!V){V=c[m>>2]|0;c[m>>2]=X;if((V|0)!=0){Lc[c[H>>2]&255](V);X=c[m>>2]|0}}else{c[m>>2]=X}c[H>>2]=147;V=X+(W<<2)|0;c[n>>2]=V;o=(c[m>>2]|0)+(o>>>2<<2)|0}c[n>>2]=V+4;c[V>>2]=U;T=T+1|0}else{V=a[s]|0;if((V&1)==0){V=(V&255)>>>1}else{V=c[L>>2]|0}if((V|0)==0|(T|0)==0){break}if((U|0)!=(c[B>>2]|0)){break}if((S|0)==(Q|0)){S=S-R|0;Q=S>>>0<2147483647?S<<1:-1;if((P|0)==146){R=0}P=Tq(R,Q)|0;if((P|0)==0){w=214;break a}S=P+(S>>2<<2)|0;R=P;Q=P+(Q>>>2<<2)|0;P=147}c[S>>2]=T;S=S+4|0;T=0}V=c[b>>2]|0;W=V+12|0;U=c[W>>2]|0;if((U|0)==(c[V+16>>2]|0)){Pc[c[(c[V>>2]|0)+40>>2]&127](V)|0;continue}else{c[W>>2]=U+4;continue}}if(!((R|0)==(S|0)|(T|0)==0)){if((S|0)==(Q|0)){S=S-R|0;Q=S>>>0<2147483647?S<<1:-1;if((P|0)==146){R=0}P=Tq(R,Q)|0;if((P|0)==0){w=225;break a}S=P+(S>>2<<2)|0;R=P;Q=P+(Q>>>2<<2)|0;P=147}c[S>>2]=T;S=S+4|0}T=c[C>>2]|0;if((T|0)>0){U=c[b>>2]|0;do{if((U|0)!=0){V=c[U+12>>2]|0;if((V|0)==(c[U+16>>2]|0)){U=Pc[c[(c[U>>2]|0)+36>>2]&127](U)|0}else{U=c[V>>2]|0}if((U|0)==-1){c[b>>2]=0;V=1;break}else{V=(c[b>>2]|0)==0;break}}else{V=1}}while(0);U=c[e>>2]|0;do{if((U|0)!=0){W=c[U+12>>2]|0;if((W|0)==(c[U+16>>2]|0)){W=Pc[c[(c[U>>2]|0)+36>>2]&127](U)|0}else{W=c[W>>2]|0}if(!((W|0)==-1)){if(V){break}else{w=248;break a}}else{c[e>>2]=0;w=242;break}}else{w=242}}while(0);if((w|0)==242){w=0;if(V){w=248;break a}else{U=0}}V=c[b>>2]|0;W=c[V+12>>2]|0;if((W|0)==(c[V+16>>2]|0)){V=Pc[c[(c[V>>2]|0)+36>>2]&127](V)|0}else{V=c[W>>2]|0}if((V|0)!=(c[D>>2]|0)){w=248;break a}X=c[b>>2]|0;W=X+12|0;V=c[W>>2]|0;if((V|0)==(c[X+16>>2]|0)){Pc[c[(c[X>>2]|0)+40>>2]&127](X)|0;W=U;V=U}else{c[W>>2]=V+4;W=U;V=U}while(1){X=c[b>>2]|0;do{if((X|0)!=0){U=c[X+12>>2]|0;if((U|0)==(c[X+16>>2]|0)){U=Pc[c[(c[X>>2]|0)+36>>2]&127](X)|0}else{U=c[U>>2]|0}if((U|0)==-1){c[b>>2]=0;X=1;break}else{X=(c[b>>2]|0)==0;break}}else{X=1}}while(0);do{if((V|0)!=0){U=c[V+12>>2]|0;if((U|0)==(c[V+16>>2]|0)){U=Pc[c[(c[V>>2]|0)+36>>2]&127](V)|0}else{U=c[U>>2]|0}if(!((U|0)==-1)){if(X^(W|0)==0){U=W;V=W;break}else{w=271;break a}}else{c[e>>2]=0;U=0;w=265;break}}else{U=W;w=265}}while(0);if((w|0)==265){w=0;if(X){w=271;break a}else{V=0}}X=c[b>>2]|0;W=c[X+12>>2]|0;if((W|0)==(c[X+16>>2]|0)){W=Pc[c[(c[X>>2]|0)+36>>2]&127](X)|0}else{W=c[W>>2]|0}if(!(Hc[c[(c[l>>2]|0)+12>>2]&31](l,2048,W)|0)){w=271;break a}W=c[n>>2]|0;if((W|0)==(o|0)){W=(c[H>>2]|0)!=146;Y=c[m>>2]|0;X=o-Y|0;o=X>>>0<2147483647?X<<1:-1;X=X>>2;if(!W){Y=0}Y=Tq(Y,o)|0;if((Y|0)==0){w=276;break a}if(!W){W=c[m>>2]|0;c[m>>2]=Y;if((W|0)!=0){Lc[c[H>>2]&255](W);Y=c[m>>2]|0}}else{c[m>>2]=Y}c[H>>2]=147;W=Y+(X<<2)|0;c[n>>2]=W;o=(c[m>>2]|0)+(o>>>2<<2)|0}X=c[b>>2]|0;Y=c[X+12>>2]|0;if((Y|0)==(c[X+16>>2]|0)){X=Pc[c[(c[X>>2]|0)+36>>2]&127](X)|0;W=c[n>>2]|0}else{X=c[Y>>2]|0}c[n>>2]=W+4;c[W>>2]=X;T=T+ -1|0;c[C>>2]=T;W=c[b>>2]|0;X=W+12|0;Y=c[X>>2]|0;if((Y|0)==(c[W+16>>2]|0)){Pc[c[(c[W>>2]|0)+40>>2]&127](W)|0}else{c[X>>2]=Y+4}if((T|0)>0){W=U}else{break}}}if((c[n>>2]|0)==(c[m>>2]|0)){w=290;break a}break};default:{}}}while(0);g:do{if((w|0)==28){w=0;if((O|0)==3){y=R;z=P;w=292;break a}else{U=T;V=T}while(1){W=c[b>>2]|0;do{if((W|0)!=0){T=c[W+12>>2]|0;if((T|0)==(c[W+16>>2]|0)){T=Pc[c[(c[W>>2]|0)+36>>2]&127](W)|0}else{T=c[T>>2]|0}if((T|0)==-1){c[b>>2]=0;T=1;break}else{T=(c[b>>2]|0)==0;break}}else{T=1}}while(0);do{if((V|0)!=0){W=c[V+12>>2]|0;if((W|0)==(c[V+16>>2]|0)){V=Pc[c[(c[V>>2]|0)+36>>2]&127](V)|0}else{V=c[W>>2]|0}if(!((V|0)==-1)){if(T^(U|0)==0){T=U;V=U;break}else{break g}}else{c[e>>2]=0;U=0;w=42;break}}else{w=42}}while(0);if((w|0)==42){w=0;if(T){break g}else{T=U;V=0}}W=c[b>>2]|0;U=c[W+12>>2]|0;if((U|0)==(c[W+16>>2]|0)){U=Pc[c[(c[W>>2]|0)+36>>2]&127](W)|0}else{U=c[U>>2]|0}if(!(Hc[c[(c[l>>2]|0)+12>>2]&31](l,8192,U)|0)){break g}U=c[b>>2]|0;W=U+12|0;X=c[W>>2]|0;if((X|0)==(c[U+16>>2]|0)){U=Pc[c[(c[U>>2]|0)+40>>2]&127](U)|0}else{c[W>>2]=X+4;U=c[X>>2]|0}Li(t,U);U=T}}}while(0);O=O+1|0;if(!(O>>>0<4)){y=R;z=P;w=292;break}}h:switch(w|0){case 27:{c[j>>2]=c[j>>2]|4;x=0;y=R;z=P;break};case 116:{c[j>>2]=c[j>>2]|4;x=0;y=R;z=P;break};case 174:{c[j>>2]=c[j>>2]|4;x=0;y=R;z=P;break};case 198:{br();break};case 214:{br();break};case 225:{br();break};case 248:{c[j>>2]=c[j>>2]|4;x=0;y=R;z=P;break};case 271:{c[j>>2]=c[j>>2]|4;x=0;y=R;z=P;break};case 276:{br();break};case 290:{c[j>>2]=c[j>>2]|4;x=0;y=R;z=P;break};case 292:{i:do{if((N|0)!=0){x=N+4|0;A=N+8|0;n=1;j:while(1){m=a[N]|0;if((m&1)==0){m=(m&255)>>>1}else{m=c[x>>2]|0}if(!(n>>>0<m>>>0)){break i}k=c[b>>2]|0;do{if((k|0)!=0){m=c[k+12>>2]|0;if((m|0)==(c[k+16>>2]|0)){m=Pc[c[(c[k>>2]|0)+36>>2]&127](k)|0}else{m=c[m>>2]|0}if((m|0)==-1){c[b>>2]=0;m=1;break}else{m=(c[b>>2]|0)==0;break}}else{m=1}}while(0);k=c[e>>2]|0;do{if((k|0)!=0){l=c[k+12>>2]|0;if((l|0)==(c[k+16>>2]|0)){k=Pc[c[(c[k>>2]|0)+36>>2]&127](k)|0}else{k=c[l>>2]|0}if(!((k|0)==-1)){if(m){break}else{break j}}else{c[e>>2]=0;w=311;break}}else{w=311}}while(0);if((w|0)==311?(w=0,m):0){break}m=c[b>>2]|0;k=c[m+12>>2]|0;if((k|0)==(c[m+16>>2]|0)){m=Pc[c[(c[m>>2]|0)+36>>2]&127](m)|0}else{m=c[k>>2]|0}if((a[N]&1)==0){k=x}else{k=c[A>>2]|0}if((m|0)!=(c[k+(n<<2)>>2]|0)){break}n=n+1|0;m=c[b>>2]|0;l=m+12|0;k=c[l>>2]|0;if((k|0)==(c[m+16>>2]|0)){Pc[c[(c[m>>2]|0)+40>>2]&127](m)|0;continue}else{c[l>>2]=k+4;continue}}c[j>>2]=c[j>>2]|4;x=0;break h}}while(0);if((y|0)!=(S|0)){c[u>>2]=0;nn(s,y,S,u);if((c[u>>2]|0)==0){x=1}else{c[j>>2]=c[j>>2]|4;x=0}}else{x=1;y=S}break}}Hi(t);Hi(q);Hi(r);Hi(v);vi(s);if((y|0)==0){i=p;return x|0}Lc[z&255](y);i=p;return x|0}function sn(b,d,e,f,g,h,j,k){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0;d=i;i=i+448|0;u=d;t=d+32|0;m=d+24|0;q=d+20|0;o=d+16|0;r=d+432|0;s=d+12|0;c[m>>2]=t;n=m+4|0;c[n>>2]=146;t=t+400|0;Qi(o,h);w=c[o>>2]|0;if(!((c[2982]|0)==-1)){c[u>>2]=11928;c[u+4>>2]=144;c[u+8>>2]=0;qi(11928,u,145)}p=(c[11932>>2]|0)+ -1|0;v=c[w+8>>2]|0;if(!((c[w+12>>2]|0)-v>>2>>>0>p>>>0)){w=Nb(4)|0;wq(w);Ac(w|0,19896,130)}v=c[v+(p<<2)>>2]|0;if((v|0)==0){w=Nb(4)|0;wq(w);Ac(w|0,19896,130)}a[r]=0;p=c[f>>2]|0;c[s>>2]=p;w=c[h+4>>2]|0;c[u+0>>2]=c[s+0>>2];if(rn(e,u,g,o,w,j,r,v,m,q,t)|0){if((a[k]&1)==0){c[k+4>>2]=0;a[k]=0}else{c[c[k+8>>2]>>2]=0;c[k+4>>2]=0}if((a[r]|0)!=0){Li(k,Yc[c[(c[v>>2]|0)+44>>2]&63](v,45)|0)}h=Yc[c[(c[v>>2]|0)+44>>2]&63](v,48)|0;r=c[m>>2]|0;q=c[q>>2]|0;g=q+ -4|0;a:do{if(r>>>0<g>>>0){while(1){s=r+4|0;if((c[r>>2]|0)!=(h|0)){break a}if(s>>>0<g>>>0){r=s}else{r=s;break}}}}while(0);tn(k,r,q)|0}k=c[e>>2]|0;do{if((k|0)!=0){q=c[k+12>>2]|0;if((q|0)==(c[k+16>>2]|0)){k=Pc[c[(c[k>>2]|0)+36>>2]&127](k)|0}else{k=c[q>>2]|0}if((k|0)==-1){c[e>>2]=0;k=1;break}else{k=(c[e>>2]|0)==0;break}}else{k=1}}while(0);do{if((p|0)!=0){q=c[p+12>>2]|0;if((q|0)==(c[p+16>>2]|0)){p=Pc[c[(c[p>>2]|0)+36>>2]&127](p)|0}else{p=c[q>>2]|0}if(!((p|0)==-1)){if(k){break}else{l=31;break}}else{c[f>>2]=0;l=29;break}}else{l=29}}while(0);if((l|0)==29?k:0){l=31}if((l|0)==31){c[j>>2]=c[j>>2]|2}c[b>>2]=c[e>>2];Yh(c[o>>2]|0)|0;l=c[m>>2]|0;c[m>>2]=0;if((l|0)==0){i=d;return}Lc[c[n>>2]&255](l);i=d;return}function tn(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0,k=0,l=0;f=i;j=d;l=a[b]|0;if((l&1)==0){g=(l&255)>>>1;k=1}else{l=c[b>>2]|0;g=c[b+4>>2]|0;k=(l&-2)+ -1|0;l=l&255}h=e-j>>2;if((h|0)==0){i=f;return b|0}if((k-g|0)>>>0<h>>>0){Ni(b,k,g+h-k|0,g,g,0,0);l=a[b]|0}if((l&1)==0){k=b+4|0}else{k=c[b+8>>2]|0}l=k+(g<<2)|0;if((d|0)!=(e|0)){j=g+((e+ -4+(0-j)|0)>>>2)+1|0;while(1){c[l>>2]=c[d>>2];d=d+4|0;if((d|0)==(e|0)){break}else{l=l+4|0}}l=k+(j<<2)|0}c[l>>2]=0;g=g+h|0;if((a[b]&1)==0){a[b]=g<<1;i=f;return b|0}else{c[b+4>>2]=g;i=f;return b|0}return 0}function un(b,d,e,f,g,h,j,k,l,m){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;var n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0;n=i;i=i+128|0;y=n;v=n+112|0;w=n+100|0;x=n+88|0;o=n+76|0;u=n+64|0;r=n+60|0;q=n+48|0;t=n+36|0;p=n+24|0;s=n+12|0;if(b){p=c[d>>2]|0;if(!((c[2876]|0)==-1)){c[y>>2]=11504;c[y+4>>2]=144;c[y+8>>2]=0;qi(11504,y,145)}r=(c[11508>>2]|0)+ -1|0;q=c[p+8>>2]|0;if(!((c[p+12>>2]|0)-q>>2>>>0>r>>>0)){d=Nb(4)|0;wq(d);Ac(d|0,19896,130)}p=c[q+(r<<2)>>2]|0;if((p|0)==0){d=Nb(4)|0;wq(d);Ac(d|0,19896,130)}Mc[c[(c[p>>2]|0)+44>>2]&63](v,p);d=c[v>>2]|0;a[e]=d;a[e+1|0]=d>>8;a[e+2|0]=d>>16;a[e+3|0]=d>>24;Mc[c[(c[p>>2]|0)+32>>2]&63](w,p);if((a[l]&1)==0){c[l+4>>2]=0;a[l]=0}else{c[c[l+8>>2]>>2]=0;c[l+4>>2]=0}Ki(l,0);c[l+0>>2]=c[w+0>>2];c[l+4>>2]=c[w+4>>2];c[l+8>>2]=c[w+8>>2];c[w+0>>2]=0;c[w+4>>2]=0;c[w+8>>2]=0;Hi(w);Mc[c[(c[p>>2]|0)+28>>2]&63](x,p);if((a[k]&1)==0){c[k+4>>2]=0;a[k]=0}else{c[c[k+8>>2]>>2]=0;c[k+4>>2]=0}Ki(k,0);c[k+0>>2]=c[x+0>>2];c[k+4>>2]=c[x+4>>2];c[k+8>>2]=c[x+8>>2];c[x+0>>2]=0;c[x+4>>2]=0;c[x+8>>2]=0;Hi(x);c[f>>2]=Pc[c[(c[p>>2]|0)+12>>2]&127](p)|0;c[g>>2]=Pc[c[(c[p>>2]|0)+16>>2]&127](p)|0;Mc[c[(c[p>>2]|0)+20>>2]&63](o,p);if((a[h]&1)==0){a[h+1|0]=0;a[h]=0}else{a[c[h+8>>2]|0]=0;c[h+4>>2]=0}Ai(h,0);c[h+0>>2]=c[o+0>>2];c[h+4>>2]=c[o+4>>2];c[h+8>>2]=c[o+8>>2];c[o+0>>2]=0;c[o+4>>2]=0;c[o+8>>2]=0;vi(o);Mc[c[(c[p>>2]|0)+24>>2]&63](u,p);if((a[j]&1)==0){c[j+4>>2]=0;a[j]=0}else{c[c[j+8>>2]>>2]=0;c[j+4>>2]=0}Ki(j,0);c[j+0>>2]=c[u+0>>2];c[j+4>>2]=c[u+4>>2];c[j+8>>2]=c[u+8>>2];c[u+0>>2]=0;c[u+4>>2]=0;c[u+8>>2]=0;Hi(u);d=Pc[c[(c[p>>2]|0)+36>>2]&127](p)|0;c[m>>2]=d;i=n;return}else{o=c[d>>2]|0;if(!((c[2860]|0)==-1)){c[y>>2]=11440;c[y+4>>2]=144;c[y+8>>2]=0;qi(11440,y,145)}u=(c[11444>>2]|0)+ -1|0;v=c[o+8>>2]|0;if(!((c[o+12>>2]|0)-v>>2>>>0>u>>>0)){d=Nb(4)|0;wq(d);Ac(d|0,19896,130)}o=c[v+(u<<2)>>2]|0;if((o|0)==0){d=Nb(4)|0;wq(d);Ac(d|0,19896,130)}Mc[c[(c[o>>2]|0)+44>>2]&63](r,o);d=c[r>>2]|0;a[e]=d;a[e+1|0]=d>>8;a[e+2|0]=d>>16;a[e+3|0]=d>>24;Mc[c[(c[o>>2]|0)+32>>2]&63](q,o);if((a[l]&1)==0){c[l+4>>2]=0;a[l]=0}else{c[c[l+8>>2]>>2]=0;c[l+4>>2]=0}Ki(l,0);c[l+0>>2]=c[q+0>>2];c[l+4>>2]=c[q+4>>2];c[l+8>>2]=c[q+8>>2];c[q+0>>2]=0;c[q+4>>2]=0;c[q+8>>2]=0;Hi(q);Mc[c[(c[o>>2]|0)+28>>2]&63](t,o);if((a[k]&1)==0){c[k+4>>2]=0;a[k]=0}else{c[c[k+8>>2]>>2]=0;c[k+4>>2]=0}Ki(k,0);c[k+0>>2]=c[t+0>>2];c[k+4>>2]=c[t+4>>2];c[k+8>>2]=c[t+8>>2];c[t+0>>2]=0;c[t+4>>2]=0;c[t+8>>2]=0;Hi(t);c[f>>2]=Pc[c[(c[o>>2]|0)+12>>2]&127](o)|0;c[g>>2]=Pc[c[(c[o>>2]|0)+16>>2]&127](o)|0;Mc[c[(c[o>>2]|0)+20>>2]&63](p,o);if((a[h]&1)==0){a[h+1|0]=0;a[h]=0}else{a[c[h+8>>2]|0]=0;c[h+4>>2]=0}Ai(h,0);c[h+0>>2]=c[p+0>>2];c[h+4>>2]=c[p+4>>2];c[h+8>>2]=c[p+8>>2];c[p+0>>2]=0;c[p+4>>2]=0;c[p+8>>2]=0;vi(p);Mc[c[(c[o>>2]|0)+24>>2]&63](s,o);if((a[j]&1)==0){c[j+4>>2]=0;a[j]=0}else{c[c[j+8>>2]>>2]=0;c[j+4>>2]=0}Ki(j,0);c[j+0>>2]=c[s+0>>2];c[j+4>>2]=c[s+4>>2];c[j+8>>2]=c[s+8>>2];c[s+0>>2]=0;c[s+4>>2]=0;c[s+8>>2]=0;Hi(s);d=Pc[c[(c[o>>2]|0)+36>>2]&127](o)|0;c[m>>2]=d;i=n;return}}function vn(a){a=a|0;var b=0;b=i;Yq(a);i=b;return}function wn(a){a=a|0;return}function xn(b,d,e,f,g,j,l){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;j=j|0;l=+l;var m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0;t=i;i=i+384|0;u=t;H=t+280|0;F=t+72|0;E=t+180|0;d=t+68|0;y=t+64|0;x=t+177|0;w=t+176|0;C=t+52|0;v=t+40|0;B=t+28|0;G=t+24|0;D=t+76|0;A=t+20|0;z=t+16|0;s=t+12|0;c[F>>2]=H;h[k>>3]=l;c[u>>2]=c[k>>2];c[u+4>>2]=c[k+4>>2];H=Tb(H|0,100,11688,u|0)|0;if(H>>>0>99){if((a[11832]|0)==0?(Ia(11832)|0)!=0:0){c[2956]=rb(2147483647,11840,0)|0;nb(11832)}H=c[2956]|0;h[k>>3]=l;c[u>>2]=c[k>>2];c[u+4>>2]=c[k+4>>2];H=rl(F,H,11688,u)|0;E=c[F>>2]|0;if((E|0)==0){br()}I=Rq(H)|0;if((I|0)==0){br()}else{m=I;n=E;p=I;o=H}}else{m=0;n=0;p=E;o=H}Qi(d,g);I=c[d>>2]|0;if(!((c[2984]|0)==-1)){c[u>>2]=11936;c[u+4>>2]=144;c[u+8>>2]=0;qi(11936,u,145)}H=(c[11940>>2]|0)+ -1|0;E=c[I+8>>2]|0;if(!((c[I+12>>2]|0)-E>>2>>>0>H>>>0)){I=Nb(4)|0;wq(I);Ac(I|0,19896,130)}E=c[E+(H<<2)>>2]|0;if((E|0)==0){I=Nb(4)|0;wq(I);Ac(I|0,19896,130)}I=c[F>>2]|0;Vc[c[(c[E>>2]|0)+32>>2]&31](E,I,I+o|0,p)|0;if((o|0)==0){F=0}else{F=(a[c[F>>2]|0]|0)==45}c[y>>2]=0;c[C+0>>2]=0;c[C+4>>2]=0;c[C+8>>2]=0;c[v+0>>2]=0;c[v+4>>2]=0;c[v+8>>2]=0;c[B+0>>2]=0;c[B+4>>2]=0;c[B+8>>2]=0;yn(f,F,d,y,x,w,C,v,B,G);f=c[G>>2]|0;if((o|0)>(f|0)){G=a[B]|0;if((G&1)==0){G=(G&255)>>>1}else{G=c[B+4>>2]|0}H=a[v]|0;if((H&1)==0){H=(H&255)>>>1}else{H=c[v+4>>2]|0}G=G+(o-f<<1|1)+H|0}else{G=a[B]|0;if((G&1)==0){G=(G&255)>>>1}else{G=c[B+4>>2]|0}H=a[v]|0;if((H&1)==0){H=(H&255)>>>1}else{H=c[v+4>>2]|0}G=G+2+H|0}G=G+f|0;if(G>>>0>100){D=Rq(G)|0;if((D|0)==0){br()}else{r=D;q=D}}else{r=0;q=D}zn(q,A,z,c[g+4>>2]|0,p,p+o|0,E,F,y,a[x]|0,a[w]|0,C,v,B,f);c[s>>2]=c[e>>2];H=c[A>>2]|0;I=c[z>>2]|0;c[u+0>>2]=c[s+0>>2];zd(b,u,q,H,I,g,j);if((r|0)!=0){Sq(r)}vi(B);vi(v);vi(C);Yh(c[d>>2]|0)|0;if((m|0)!=0){Sq(m)}if((n|0)==0){i=t;return}Sq(n);i=t;return}function yn(b,d,e,f,g,h,j,k,l,m){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;var n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0;n=i;i=i+128|0;A=n;y=n+120|0;p=n+108|0;w=n+104|0;x=n+92|0;o=n+80|0;z=n+68|0;r=n+64|0;q=n+52|0;t=n+48|0;s=n+36|0;v=n+24|0;u=n+12|0;e=c[e>>2]|0;if(b){if(!((c[2844]|0)==-1)){c[A>>2]=11376;c[A+4>>2]=144;c[A+8>>2]=0;qi(11376,A,145)}r=(c[11380>>2]|0)+ -1|0;q=c[e+8>>2]|0;if(!((c[e+12>>2]|0)-q>>2>>>0>r>>>0)){b=Nb(4)|0;wq(b);Ac(b|0,19896,130)}q=c[q+(r<<2)>>2]|0;if((q|0)==0){b=Nb(4)|0;wq(b);Ac(b|0,19896,130)}r=c[q>>2]|0;if(d){Mc[c[r+44>>2]&63](y,q);b=c[y>>2]|0;a[f]=b;a[f+1|0]=b>>8;a[f+2|0]=b>>16;a[f+3|0]=b>>24;Mc[c[(c[q>>2]|0)+32>>2]&63](p,q);if((a[l]&1)==0){a[l+1|0]=0;a[l]=0}else{a[c[l+8>>2]|0]=0;c[l+4>>2]=0}Ai(l,0);c[l+0>>2]=c[p+0>>2];c[l+4>>2]=c[p+4>>2];c[l+8>>2]=c[p+8>>2];c[p+0>>2]=0;c[p+4>>2]=0;c[p+8>>2]=0;vi(p)}else{Mc[c[r+40>>2]&63](w,q);b=c[w>>2]|0;a[f]=b;a[f+1|0]=b>>8;a[f+2|0]=b>>16;a[f+3|0]=b>>24;Mc[c[(c[q>>2]|0)+28>>2]&63](x,q);if((a[l]&1)==0){a[l+1|0]=0;a[l]=0}else{a[c[l+8>>2]|0]=0;c[l+4>>2]=0}Ai(l,0);c[l+0>>2]=c[x+0>>2];c[l+4>>2]=c[x+4>>2];c[l+8>>2]=c[x+8>>2];c[x+0>>2]=0;c[x+4>>2]=0;c[x+8>>2]=0;vi(x)}a[g]=Pc[c[(c[q>>2]|0)+12>>2]&127](q)|0;a[h]=Pc[c[(c[q>>2]|0)+16>>2]&127](q)|0;Mc[c[(c[q>>2]|0)+20>>2]&63](o,q);if((a[j]&1)==0){a[j+1|0]=0;a[j]=0}else{a[c[j+8>>2]|0]=0;c[j+4>>2]=0}Ai(j,0);c[j+0>>2]=c[o+0>>2];c[j+4>>2]=c[o+4>>2];c[j+8>>2]=c[o+8>>2];c[o+0>>2]=0;c[o+4>>2]=0;c[o+8>>2]=0;vi(o);Mc[c[(c[q>>2]|0)+24>>2]&63](z,q);if((a[k]&1)==0){a[k+1|0]=0;a[k]=0}else{a[c[k+8>>2]|0]=0;c[k+4>>2]=0}Ai(k,0);c[k+0>>2]=c[z+0>>2];c[k+4>>2]=c[z+4>>2];c[k+8>>2]=c[z+8>>2];c[z+0>>2]=0;c[z+4>>2]=0;c[z+8>>2]=0;vi(z);b=Pc[c[(c[q>>2]|0)+36>>2]&127](q)|0;c[m>>2]=b;i=n;return}else{if(!((c[2828]|0)==-1)){c[A>>2]=11312;c[A+4>>2]=144;c[A+8>>2]=0;qi(11312,A,145)}p=(c[11316>>2]|0)+ -1|0;o=c[e+8>>2]|0;if(!((c[e+12>>2]|0)-o>>2>>>0>p>>>0)){b=Nb(4)|0;wq(b);Ac(b|0,19896,130)}o=c[o+(p<<2)>>2]|0;if((o|0)==0){b=Nb(4)|0;wq(b);Ac(b|0,19896,130)}p=c[o>>2]|0;if(d){Mc[c[p+44>>2]&63](r,o);b=c[r>>2]|0;a[f]=b;a[f+1|0]=b>>8;a[f+2|0]=b>>16;a[f+3|0]=b>>24;Mc[c[(c[o>>2]|0)+32>>2]&63](q,o);if((a[l]&1)==0){a[l+1|0]=0;a[l]=0}else{a[c[l+8>>2]|0]=0;c[l+4>>2]=0}Ai(l,0);c[l+0>>2]=c[q+0>>2];c[l+4>>2]=c[q+4>>2];c[l+8>>2]=c[q+8>>2];c[q+0>>2]=0;c[q+4>>2]=0;c[q+8>>2]=0;vi(q)}else{Mc[c[p+40>>2]&63](t,o);b=c[t>>2]|0;a[f]=b;a[f+1|0]=b>>8;a[f+2|0]=b>>16;a[f+3|0]=b>>24;Mc[c[(c[o>>2]|0)+28>>2]&63](s,o);if((a[l]&1)==0){a[l+1|0]=0;a[l]=0}else{a[c[l+8>>2]|0]=0;c[l+4>>2]=0}Ai(l,0);c[l+0>>2]=c[s+0>>2];c[l+4>>2]=c[s+4>>2];c[l+8>>2]=c[s+8>>2];c[s+0>>2]=0;c[s+4>>2]=0;c[s+8>>2]=0;vi(s)}a[g]=Pc[c[(c[o>>2]|0)+12>>2]&127](o)|0;a[h]=Pc[c[(c[o>>2]|0)+16>>2]&127](o)|0;Mc[c[(c[o>>2]|0)+20>>2]&63](v,o);if((a[j]&1)==0){a[j+1|0]=0;a[j]=0}else{a[c[j+8>>2]|0]=0;c[j+4>>2]=0}Ai(j,0);c[j+0>>2]=c[v+0>>2];c[j+4>>2]=c[v+4>>2];c[j+8>>2]=c[v+8>>2];c[v+0>>2]=0;c[v+4>>2]=0;c[v+8>>2]=0;vi(v);Mc[c[(c[o>>2]|0)+24>>2]&63](u,o);if((a[k]&1)==0){a[k+1|0]=0;a[k]=0}else{a[c[k+8>>2]|0]=0;c[k+4>>2]=0}Ai(k,0);c[k+0>>2]=c[u+0>>2];c[k+4>>2]=c[u+4>>2];c[k+8>>2]=c[u+8>>2];c[u+0>>2]=0;c[u+4>>2]=0;c[u+8>>2]=0;vi(u);b=Pc[c[(c[o>>2]|0)+36>>2]&127](o)|0;c[m>>2]=b;i=n;return}}function zn(d,e,f,g,h,j,k,l,m,n,o,p,q,r,s){d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;n=n|0;o=o|0;p=p|0;q=q|0;r=r|0;s=s|0;var t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0;t=i;c[f>>2]=d;w=r+1|0;v=r+8|0;u=r+4|0;B=(g&512|0)==0;y=q+1|0;z=q+8|0;A=q+4|0;I=(s|0)>0;D=p+1|0;E=p+8|0;C=p+4|0;x=k+8|0;H=0-s|0;J=0;do{switch(a[m+J|0]|0){case 3:{L=a[r]|0;K=(L&1)==0;if(K){L=(L&255)>>>1}else{L=c[u>>2]|0}if((L|0)!=0){if(K){K=w}else{K=c[v>>2]|0}P=a[K]|0;Q=c[f>>2]|0;c[f>>2]=Q+1;a[Q]=P}break};case 4:{K=c[f>>2]|0;h=l?h+1|0:h;a:do{if(h>>>0<j>>>0){L=h;while(1){N=a[L]|0;if(!(N<<24>>24>-1)){break a}M=L+1|0;if((b[(c[x>>2]|0)+(N<<24>>24<<1)>>1]&2048)==0){break a}if(M>>>0<j>>>0){L=M}else{L=M;break}}}else{L=h}}while(0);M=L;if(I){if(L>>>0>h>>>0){M=h+(0-M)|0;N=M>>>0<H>>>0?H:M;M=N+s|0;Q=K;P=L;O=s;while(1){P=P+ -1|0;R=a[P]|0;c[f>>2]=Q+1;a[Q]=R;O=O+ -1|0;Q=(O|0)>0;if(!(P>>>0>h>>>0&Q)){break}Q=c[f>>2]|0}L=L+N|0;if(Q){F=32}else{N=0}}else{M=s;F=32}if((F|0)==32){F=0;N=Yc[c[(c[k>>2]|0)+28>>2]&63](k,48)|0}O=c[f>>2]|0;c[f>>2]=O+1;if((M|0)>0){do{a[O]=N;M=M+ -1|0;O=c[f>>2]|0;c[f>>2]=O+1}while((M|0)>0)}a[O]=n}if((L|0)==(h|0)){Q=Yc[c[(c[k>>2]|0)+28>>2]&63](k,48)|0;R=c[f>>2]|0;c[f>>2]=R+1;a[R]=Q}else{N=a[p]|0;M=(N&1)==0;if(M){N=(N&255)>>>1}else{N=c[C>>2]|0}if((N|0)==0){M=-1;N=0;O=0}else{if(M){M=D}else{M=c[E>>2]|0}M=a[M]|0;N=0;O=0}while(1){if((O|0)==(M|0)){P=c[f>>2]|0;c[f>>2]=P+1;a[P]=o;N=N+1|0;P=a[p]|0;O=(P&1)==0;if(O){P=(P&255)>>>1}else{P=c[C>>2]|0}if(N>>>0<P>>>0){if(O){M=D}else{M=c[E>>2]|0}if((a[M+N|0]|0)==127){M=-1;O=0}else{if(O){M=D}else{M=c[E>>2]|0}M=a[M+N|0]|0;O=0}}else{O=0}}L=L+ -1|0;Q=a[L]|0;R=c[f>>2]|0;c[f>>2]=R+1;a[R]=Q;if((L|0)==(h|0)){break}else{O=O+1|0}}}L=c[f>>2]|0;if((K|0)!=(L|0)?(G=L+ -1|0,G>>>0>K>>>0):0){L=G;do{R=a[K]|0;a[K]=a[L]|0;a[L]=R;K=K+1|0;L=L+ -1|0}while(K>>>0<L>>>0)}break};case 1:{c[e>>2]=c[f>>2];Q=Yc[c[(c[k>>2]|0)+28>>2]&63](k,32)|0;R=c[f>>2]|0;c[f>>2]=R+1;a[R]=Q;break};case 2:{K=a[q]|0;M=(K&1)==0;if(M){L=(K&255)>>>1}else{L=c[A>>2]|0}if(!((L|0)==0|B)){if(M){L=y;K=(K&255)>>>1}else{L=c[z>>2]|0;K=c[A>>2]|0}K=L+K|0;M=c[f>>2]|0;if((L|0)!=(K|0)){do{a[M]=a[L]|0;L=L+1|0;M=M+1|0}while((L|0)!=(K|0))}c[f>>2]=M}break};case 0:{c[e>>2]=c[f>>2];break};default:{}}J=J+1|0}while((J|0)!=4);o=a[r]|0;x=(o&1)==0;if(x){y=(o&255)>>>1}else{y=c[u>>2]|0}if(y>>>0>1){if(x){u=(o&255)>>>1}else{w=c[v>>2]|0;u=c[u>>2]|0}v=w+1|0;u=w+u|0;w=c[f>>2]|0;if((v|0)!=(u|0)){do{a[w]=a[v]|0;v=v+1|0;w=w+1|0}while((v|0)!=(u|0))}c[f>>2]=w}g=g&176;if((g|0)==32){c[e>>2]=c[f>>2];i=t;return}else if((g|0)==16){i=t;return}else{c[e>>2]=d;i=t;return}}function An(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0;q=i;i=i+176|0;n=q;p=q+68|0;v=q+64|0;u=q+173|0;t=q+172|0;s=q+52|0;m=q+40|0;r=q+28|0;A=q+24|0;x=q+72|0;o=q+20|0;d=q+16|0;w=q+12|0;Qi(p,g);y=c[p>>2]|0;if(!((c[2984]|0)==-1)){c[n>>2]=11936;c[n+4>>2]=144;c[n+8>>2]=0;qi(11936,n,145)}B=(c[11940>>2]|0)+ -1|0;z=c[y+8>>2]|0;if(!((c[y+12>>2]|0)-z>>2>>>0>B>>>0)){D=Nb(4)|0;wq(D);Ac(D|0,19896,130)}y=c[z+(B<<2)>>2]|0;if((y|0)==0){D=Nb(4)|0;wq(D);Ac(D|0,19896,130)}B=a[j]|0;z=(B&1)==0;if(z){B=(B&255)>>>1}else{B=c[j+4>>2]|0}if((B|0)==0){z=0}else{if(z){z=j+1|0}else{z=c[j+8>>2]|0}z=a[z]|0;z=z<<24>>24==(Yc[c[(c[y>>2]|0)+28>>2]&63](y,45)|0)<<24>>24}c[v>>2]=0;c[s+0>>2]=0;c[s+4>>2]=0;c[s+8>>2]=0;c[m+0>>2]=0;c[m+4>>2]=0;c[m+8>>2]=0;c[r+0>>2]=0;c[r+4>>2]=0;c[r+8>>2]=0;yn(f,z,p,v,u,t,s,m,r,A);f=a[j]|0;C=(f&1)==0;if(C){B=(f&255)>>>1}else{B=c[j+4>>2]|0}A=c[A>>2]|0;if((B|0)>(A|0)){if(C){B=(f&255)>>>1}else{B=c[j+4>>2]|0}C=a[r]|0;if((C&1)==0){C=(C&255)>>>1}else{C=c[r+4>>2]|0}D=a[m]|0;if((D&1)==0){D=(D&255)>>>1}else{D=c[m+4>>2]|0}B=C+(B-A<<1|1)+D|0}else{B=a[r]|0;if((B&1)==0){B=(B&255)>>>1}else{B=c[r+4>>2]|0}C=a[m]|0;if((C&1)==0){C=(C&255)>>>1}else{C=c[m+4>>2]|0}B=B+2+C|0}B=B+A|0;if(B>>>0>100){x=Rq(B)|0;if((x|0)==0){br()}else{k=x;l=x}}else{k=0;l=x}if((f&1)==0){x=j+1|0;j=(f&255)>>>1}else{x=c[j+8>>2]|0;j=c[j+4>>2]|0}zn(l,o,d,c[g+4>>2]|0,x,x+j|0,y,z,v,a[u]|0,a[t]|0,s,m,r,A);c[w>>2]=c[e>>2];C=c[o>>2]|0;D=c[d>>2]|0;c[n+0>>2]=c[w+0>>2];zd(b,n,l,C,D,g,h);if((k|0)==0){vi(r);vi(m);vi(s);D=c[p>>2]|0;Yh(D)|0;i=q;return}Sq(k);vi(r);vi(m);vi(s);D=c[p>>2]|0;Yh(D)|0;i=q;return}function Bn(a){a=a|0;var b=0;b=i;Yq(a);i=b;return}function Cn(a){a=a|0;return}function Dn(b,d,e,f,g,j,l){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;j=j|0;l=+l;var m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0;t=i;i=i+992|0;u=t;H=t+884|0;F=t+880|0;E=t+480|0;d=t+476|0;y=t+472|0;x=t+468|0;w=t+464|0;C=t+452|0;v=t+440|0;B=t+428|0;G=t+424|0;D=t+24|0;A=t+20|0;z=t+16|0;s=t+12|0;c[F>>2]=H;h[k>>3]=l;c[u>>2]=c[k>>2];c[u+4>>2]=c[k+4>>2];H=Tb(H|0,100,11688,u|0)|0;if(H>>>0>99){if((a[11832]|0)==0?(Ia(11832)|0)!=0:0){c[2956]=rb(2147483647,11840,0)|0;nb(11832)}H=c[2956]|0;h[k>>3]=l;c[u>>2]=c[k>>2];c[u+4>>2]=c[k+4>>2];H=rl(F,H,11688,u)|0;E=c[F>>2]|0;if((E|0)==0){br()}I=Rq(H<<2)|0;if((I|0)==0){br()}else{m=I;n=E;p=I;o=H}}else{m=0;n=0;p=E;o=H}Qi(d,g);I=c[d>>2]|0;if(!((c[2982]|0)==-1)){c[u>>2]=11928;c[u+4>>2]=144;c[u+8>>2]=0;qi(11928,u,145)}H=(c[11932>>2]|0)+ -1|0;E=c[I+8>>2]|0;if(!((c[I+12>>2]|0)-E>>2>>>0>H>>>0)){I=Nb(4)|0;wq(I);Ac(I|0,19896,130)}E=c[E+(H<<2)>>2]|0;if((E|0)==0){I=Nb(4)|0;wq(I);Ac(I|0,19896,130)}I=c[F>>2]|0;Vc[c[(c[E>>2]|0)+48>>2]&31](E,I,I+o|0,p)|0;if((o|0)==0){F=0}else{F=(a[c[F>>2]|0]|0)==45}c[y>>2]=0;c[C+0>>2]=0;c[C+4>>2]=0;c[C+8>>2]=0;c[v+0>>2]=0;c[v+4>>2]=0;c[v+8>>2]=0;c[B+0>>2]=0;c[B+4>>2]=0;c[B+8>>2]=0;En(f,F,d,y,x,w,C,v,B,G);f=c[G>>2]|0;if((o|0)>(f|0)){G=a[B]|0;if((G&1)==0){G=(G&255)>>>1}else{G=c[B+4>>2]|0}H=a[v]|0;if((H&1)==0){H=(H&255)>>>1}else{H=c[v+4>>2]|0}G=G+(o-f<<1|1)+H|0}else{G=a[B]|0;if((G&1)==0){G=(G&255)>>>1}else{G=c[B+4>>2]|0}H=a[v]|0;if((H&1)==0){H=(H&255)>>>1}else{H=c[v+4>>2]|0}G=G+2+H|0}G=G+f|0;if(G>>>0>100){D=Rq(G<<2)|0;if((D|0)==0){br()}else{r=D;q=D}}else{r=0;q=D}Fn(q,A,z,c[g+4>>2]|0,p,p+(o<<2)|0,E,F,y,c[x>>2]|0,c[w>>2]|0,C,v,B,f);c[s>>2]=c[e>>2];H=c[A>>2]|0;I=c[z>>2]|0;c[u+0>>2]=c[s+0>>2];Al(b,u,q,H,I,g,j);if((r|0)!=0){Sq(r)}Hi(B);Hi(v);vi(C);Yh(c[d>>2]|0)|0;if((m|0)!=0){Sq(m)}if((n|0)==0){i=t;return}Sq(n);i=t;return}function En(b,d,e,f,g,h,j,k,l,m){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;var n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0;n=i;i=i+128|0;A=n;y=n+120|0;p=n+108|0;w=n+104|0;x=n+92|0;o=n+80|0;z=n+68|0;r=n+64|0;q=n+52|0;t=n+48|0;s=n+36|0;v=n+24|0;u=n+12|0;e=c[e>>2]|0;if(b){if(!((c[2876]|0)==-1)){c[A>>2]=11504;c[A+4>>2]=144;c[A+8>>2]=0;qi(11504,A,145)}r=(c[11508>>2]|0)+ -1|0;q=c[e+8>>2]|0;if(!((c[e+12>>2]|0)-q>>2>>>0>r>>>0)){b=Nb(4)|0;wq(b);Ac(b|0,19896,130)}q=c[q+(r<<2)>>2]|0;if((q|0)==0){b=Nb(4)|0;wq(b);Ac(b|0,19896,130)}r=c[q>>2]|0;if(d){Mc[c[r+44>>2]&63](y,q);b=c[y>>2]|0;a[f]=b;a[f+1|0]=b>>8;a[f+2|0]=b>>16;a[f+3|0]=b>>24;Mc[c[(c[q>>2]|0)+32>>2]&63](p,q);if((a[l]&1)==0){c[l+4>>2]=0;a[l]=0}else{c[c[l+8>>2]>>2]=0;c[l+4>>2]=0}Ki(l,0);c[l+0>>2]=c[p+0>>2];c[l+4>>2]=c[p+4>>2];c[l+8>>2]=c[p+8>>2];c[p+0>>2]=0;c[p+4>>2]=0;c[p+8>>2]=0;Hi(p)}else{Mc[c[r+40>>2]&63](w,q);b=c[w>>2]|0;a[f]=b;a[f+1|0]=b>>8;a[f+2|0]=b>>16;a[f+3|0]=b>>24;Mc[c[(c[q>>2]|0)+28>>2]&63](x,q);if((a[l]&1)==0){c[l+4>>2]=0;a[l]=0}else{c[c[l+8>>2]>>2]=0;c[l+4>>2]=0}Ki(l,0);c[l+0>>2]=c[x+0>>2];c[l+4>>2]=c[x+4>>2];c[l+8>>2]=c[x+8>>2];c[x+0>>2]=0;c[x+4>>2]=0;c[x+8>>2]=0;Hi(x)}c[g>>2]=Pc[c[(c[q>>2]|0)+12>>2]&127](q)|0;c[h>>2]=Pc[c[(c[q>>2]|0)+16>>2]&127](q)|0;Mc[c[(c[q>>2]|0)+20>>2]&63](o,q);if((a[j]&1)==0){a[j+1|0]=0;a[j]=0}else{a[c[j+8>>2]|0]=0;c[j+4>>2]=0}Ai(j,0);c[j+0>>2]=c[o+0>>2];c[j+4>>2]=c[o+4>>2];c[j+8>>2]=c[o+8>>2];c[o+0>>2]=0;c[o+4>>2]=0;c[o+8>>2]=0;vi(o);Mc[c[(c[q>>2]|0)+24>>2]&63](z,q);if((a[k]&1)==0){c[k+4>>2]=0;a[k]=0}else{c[c[k+8>>2]>>2]=0;c[k+4>>2]=0}Ki(k,0);c[k+0>>2]=c[z+0>>2];c[k+4>>2]=c[z+4>>2];c[k+8>>2]=c[z+8>>2];c[z+0>>2]=0;c[z+4>>2]=0;c[z+8>>2]=0;Hi(z);b=Pc[c[(c[q>>2]|0)+36>>2]&127](q)|0;c[m>>2]=b;i=n;return}else{if(!((c[2860]|0)==-1)){c[A>>2]=11440;c[A+4>>2]=144;c[A+8>>2]=0;qi(11440,A,145)}p=(c[11444>>2]|0)+ -1|0;o=c[e+8>>2]|0;if(!((c[e+12>>2]|0)-o>>2>>>0>p>>>0)){b=Nb(4)|0;wq(b);Ac(b|0,19896,130)}o=c[o+(p<<2)>>2]|0;if((o|0)==0){b=Nb(4)|0;wq(b);Ac(b|0,19896,130)}p=c[o>>2]|0;if(d){Mc[c[p+44>>2]&63](r,o);b=c[r>>2]|0;a[f]=b;a[f+1|0]=b>>8;a[f+2|0]=b>>16;a[f+3|0]=b>>24;Mc[c[(c[o>>2]|0)+32>>2]&63](q,o);if((a[l]&1)==0){c[l+4>>2]=0;a[l]=0}else{c[c[l+8>>2]>>2]=0;c[l+4>>2]=0}Ki(l,0);c[l+0>>2]=c[q+0>>2];c[l+4>>2]=c[q+4>>2];c[l+8>>2]=c[q+8>>2];c[q+0>>2]=0;c[q+4>>2]=0;c[q+8>>2]=0;Hi(q)}else{Mc[c[p+40>>2]&63](t,o);b=c[t>>2]|0;a[f]=b;a[f+1|0]=b>>8;a[f+2|0]=b>>16;a[f+3|0]=b>>24;Mc[c[(c[o>>2]|0)+28>>2]&63](s,o);if((a[l]&1)==0){c[l+4>>2]=0;a[l]=0}else{c[c[l+8>>2]>>2]=0;c[l+4>>2]=0}Ki(l,0);c[l+0>>2]=c[s+0>>2];c[l+4>>2]=c[s+4>>2];c[l+8>>2]=c[s+8>>2];c[s+0>>2]=0;c[s+4>>2]=0;c[s+8>>2]=0;Hi(s)}c[g>>2]=Pc[c[(c[o>>2]|0)+12>>2]&127](o)|0;c[h>>2]=Pc[c[(c[o>>2]|0)+16>>2]&127](o)|0;Mc[c[(c[o>>2]|0)+20>>2]&63](v,o);if((a[j]&1)==0){a[j+1|0]=0;a[j]=0}else{a[c[j+8>>2]|0]=0;c[j+4>>2]=0}Ai(j,0);c[j+0>>2]=c[v+0>>2];c[j+4>>2]=c[v+4>>2];c[j+8>>2]=c[v+8>>2];c[v+0>>2]=0;c[v+4>>2]=0;c[v+8>>2]=0;vi(v);Mc[c[(c[o>>2]|0)+24>>2]&63](u,o);if((a[k]&1)==0){c[k+4>>2]=0;a[k]=0}else{c[c[k+8>>2]>>2]=0;c[k+4>>2]=0}Ki(k,0);c[k+0>>2]=c[u+0>>2];c[k+4>>2]=c[u+4>>2];c[k+8>>2]=c[u+8>>2];c[u+0>>2]=0;c[u+4>>2]=0;c[u+8>>2]=0;Hi(u);b=Pc[c[(c[o>>2]|0)+36>>2]&127](o)|0;c[m>>2]=b;i=n;return}}function Fn(b,d,e,f,g,h,j,k,l,m,n,o,p,q,r){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;n=n|0;o=o|0;p=p|0;q=q|0;r=r|0;var s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0;s=i;c[e>>2]=b;t=q+4|0;u=q+8|0;x=(f&512|0)==0;w=p+4|0;A=p+8|0;v=(r|0)>0;C=o+1|0;D=o+8|0;y=o+4|0;E=0;do{switch(a[l+E|0]|0){case 2:{F=a[p]|0;H=(F&1)==0;if(H){G=(F&255)>>>1}else{G=c[w>>2]|0}if(!((G|0)==0|x)){if(H){I=w;H=(F&255)>>>1}else{I=c[A>>2]|0;H=c[w>>2]|0}F=I+(H<<2)|0;G=c[e>>2]|0;if((I|0)!=(F|0)){J=(I+(H+ -1<<2)+(0-I)|0)>>>2;H=G;while(1){c[H>>2]=c[I>>2];I=I+4|0;if((I|0)==(F|0)){break}H=H+4|0}G=G+(J+1<<2)|0}c[e>>2]=G}break};case 1:{c[d>>2]=c[e>>2];L=Yc[c[(c[j>>2]|0)+44>>2]&63](j,32)|0;M=c[e>>2]|0;c[e>>2]=M+4;c[M>>2]=L;break};case 3:{G=a[q]|0;F=(G&1)==0;if(F){G=(G&255)>>>1}else{G=c[t>>2]|0}if((G|0)!=0){if(F){F=t}else{F=c[u>>2]|0}L=c[F>>2]|0;M=c[e>>2]|0;c[e>>2]=M+4;c[M>>2]=L}break};case 0:{c[d>>2]=c[e>>2];break};case 4:{F=c[e>>2]|0;g=k?g+4|0:g;a:do{if(g>>>0<h>>>0){G=g;while(1){H=G+4|0;if(!(Hc[c[(c[j>>2]|0)+12>>2]&31](j,2048,c[G>>2]|0)|0)){break a}if(H>>>0<h>>>0){G=H}else{G=H;break}}}else{G=g}}while(0);if(v){if(G>>>0>g>>>0){H=c[e>>2]|0;K=r;while(1){G=G+ -4|0;I=H+4|0;c[H>>2]=c[G>>2];K=K+ -1|0;H=(K|0)>0;if(G>>>0>g>>>0&H){H=I}else{break}}c[e>>2]=I;if(H){z=34}else{I=c[e>>2]|0;c[e>>2]=I+4}}else{K=r;z=34}if((z|0)==34){z=0;J=Yc[c[(c[j>>2]|0)+44>>2]&63](j,48)|0;I=c[e>>2]|0;L=I+4|0;c[e>>2]=L;if((K|0)>0){H=I;M=K;while(1){c[H>>2]=J;M=M+ -1|0;if((M|0)<=0){break}else{H=L;L=L+4|0}}c[e>>2]=I+(K+1<<2);I=I+(K<<2)|0}}c[I>>2]=m}if((G|0)==(g|0)){K=Yc[c[(c[j>>2]|0)+44>>2]&63](j,48)|0;M=c[e>>2]|0;L=M+4|0;c[e>>2]=L;c[M>>2]=K}else{I=a[o]|0;H=(I&1)==0;if(H){I=(I&255)>>>1}else{I=c[y>>2]|0}if((I|0)==0){H=-1;J=0;K=0}else{if(H){H=C}else{H=c[D>>2]|0}H=a[H]|0;J=0;K=0}while(1){I=c[e>>2]|0;if((K|0)==(H|0)){K=I+4|0;c[e>>2]=K;c[I>>2]=n;J=J+1|0;L=a[o]|0;I=(L&1)==0;if(I){L=(L&255)>>>1}else{L=c[y>>2]|0}if(J>>>0<L>>>0){if(I){H=C}else{H=c[D>>2]|0}if((a[H+J|0]|0)==127){I=K;H=-1;K=0}else{if(I){H=C}else{H=c[D>>2]|0}I=K;H=a[H+J|0]|0;K=0}}else{I=K;K=0}}G=G+ -4|0;M=c[G>>2]|0;L=I+4|0;c[e>>2]=L;c[I>>2]=M;if((G|0)==(g|0)){break}else{K=K+1|0}}}if((F|0)!=(L|0)?(B=L+ -4|0,B>>>0>F>>>0):0){G=B;do{M=c[F>>2]|0;c[F>>2]=c[G>>2];c[G>>2]=M;F=F+4|0;G=G+ -4|0}while(F>>>0<G>>>0)}break};default:{}}E=E+1|0}while((E|0)!=4);v=a[q]|0;r=(v&1)==0;if(r){q=(v&255)>>>1}else{q=c[t>>2]|0}if(q>>>0>1){if(r){r=t;q=(v&255)>>>1}else{r=c[u>>2]|0;q=c[t>>2]|0}v=r+4|0;u=r+(q<<2)|0;t=c[e>>2]|0;if((v|0)!=(u|0)){q=(r+(q+ -1<<2)+(0-v)|0)>>>2;r=t;while(1){c[r>>2]=c[v>>2];v=v+4|0;if((v|0)==(u|0)){break}else{r=r+4|0}}t=t+(q+1<<2)|0}c[e>>2]=t}f=f&176;if((f|0)==16){i=s;return}else if((f|0)==32){c[d>>2]=c[e>>2];i=s;return}else{c[d>>2]=b;i=s;return}}function Gn(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0;q=i;i=i+480|0;n=q;p=q+476|0;v=q+472|0;u=q+468|0;t=q+464|0;s=q+452|0;m=q+440|0;r=q+428|0;A=q+424|0;x=q+24|0;o=q+20|0;d=q+16|0;w=q+12|0;Qi(p,g);y=c[p>>2]|0;if(!((c[2982]|0)==-1)){c[n>>2]=11928;c[n+4>>2]=144;c[n+8>>2]=0;qi(11928,n,145)}B=(c[11932>>2]|0)+ -1|0;z=c[y+8>>2]|0;if(!((c[y+12>>2]|0)-z>>2>>>0>B>>>0)){D=Nb(4)|0;wq(D);Ac(D|0,19896,130)}y=c[z+(B<<2)>>2]|0;if((y|0)==0){D=Nb(4)|0;wq(D);Ac(D|0,19896,130)}B=a[j]|0;z=(B&1)==0;if(z){B=(B&255)>>>1}else{B=c[j+4>>2]|0}if((B|0)==0){z=0}else{if(z){z=j+4|0}else{z=c[j+8>>2]|0}z=c[z>>2]|0;z=(z|0)==(Yc[c[(c[y>>2]|0)+44>>2]&63](y,45)|0)}c[v>>2]=0;c[s+0>>2]=0;c[s+4>>2]=0;c[s+8>>2]=0;c[m+0>>2]=0;c[m+4>>2]=0;c[m+8>>2]=0;c[r+0>>2]=0;c[r+4>>2]=0;c[r+8>>2]=0;En(f,z,p,v,u,t,s,m,r,A);f=a[j]|0;C=(f&1)==0;if(C){B=(f&255)>>>1}else{B=c[j+4>>2]|0}A=c[A>>2]|0;if((B|0)>(A|0)){if(C){B=(f&255)>>>1}else{B=c[j+4>>2]|0}C=a[r]|0;if((C&1)==0){C=(C&255)>>>1}else{C=c[r+4>>2]|0}D=a[m]|0;if((D&1)==0){D=(D&255)>>>1}else{D=c[m+4>>2]|0}B=C+(B-A<<1|1)+D|0}else{B=a[r]|0;if((B&1)==0){B=(B&255)>>>1}else{B=c[r+4>>2]|0}C=a[m]|0;if((C&1)==0){C=(C&255)>>>1}else{C=c[m+4>>2]|0}B=B+2+C|0}B=B+A|0;if(B>>>0>100){x=Rq(B<<2)|0;if((x|0)==0){br()}else{k=x;l=x}}else{k=0;l=x}if((f&1)==0){x=j+4|0;j=(f&255)>>>1}else{x=c[j+8>>2]|0;j=c[j+4>>2]|0}Fn(l,o,d,c[g+4>>2]|0,x,x+(j<<2)|0,y,z,v,c[u>>2]|0,c[t>>2]|0,s,m,r,A);c[w>>2]=c[e>>2];C=c[o>>2]|0;D=c[d>>2]|0;c[n+0>>2]=c[w+0>>2];Al(b,n,l,C,D,g,h);if((k|0)==0){Hi(r);Hi(m);vi(s);D=c[p>>2]|0;Yh(D)|0;i=q;return}Sq(k);Hi(r);Hi(m);vi(s);D=c[p>>2]|0;Yh(D)|0;i=q;return}function Hn(a){a=a|0;var b=0;b=i;Yq(a);i=b;return}function In(a){a=a|0;return}function Jn(b,d,e){b=b|0;d=d|0;e=e|0;b=i;if((a[d]&1)==0){d=d+1|0}else{d=c[d+8>>2]|0}e=Ib(d|0,1)|0;i=b;return e>>>((e|0)!=(-1|0)|0)|0}function Kn(b,d,e,f,g,h){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0;d=i;i=i+16|0;j=d;c[j+0>>2]=0;c[j+4>>2]=0;c[j+8>>2]=0;m=a[h]|0;if((m&1)==0){l=h+1|0;m=(m&255)>>>1;h=h+1|0}else{n=c[h+8>>2]|0;l=n;m=c[h+4>>2]|0;h=n}l=l+m|0;if(h>>>0<l>>>0){do{Bi(j,a[h]|0);h=h+1|0}while((h|0)!=(l|0));l=(e|0)==-1?-1:e<<1;if((a[j]&1)==0){k=9}else{e=c[j+8>>2]|0}}else{l=(e|0)==-1?-1:e<<1;k=9}if((k|0)==9){e=j+1|0}g=oc(l|0,f|0,g|0,e|0)|0;c[b+0>>2]=0;c[b+4>>2]=0;c[b+8>>2]=0;n=rr(g|0)|0;f=g+n|0;if((n|0)<=0){vi(j);i=d;return}do{Bi(b,a[g]|0);g=g+1|0}while((g|0)!=(f|0));vi(j);i=d;return}function Ln(a,b){a=a|0;b=b|0;a=i;fb(((b|0)==-1?-1:b<<1)|0)|0;i=a;return}function Mn(a){a=a|0;var b=0;b=i;Yq(a);i=b;return}function Nn(a){a=a|0;return}function On(b,d,e){b=b|0;d=d|0;e=e|0;b=i;if((a[d]&1)==0){d=d+1|0}else{d=c[d+8>>2]|0}e=Ib(d|0,1)|0;i=b;return e>>>((e|0)!=(-1|0)|0)|0}function Pn(b,d,e,f,g,h){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0;j=i;i=i+176|0;o=j;n=j+48|0;m=j+40|0;l=j+36|0;d=j+24|0;p=j+16|0;k=j+8|0;c[d+0>>2]=0;c[d+4>>2]=0;c[d+8>>2]=0;c[p+4>>2]=0;c[p>>2]=13592;r=a[h]|0;if((r&1)==0){q=h+4|0;s=(r&255)>>>1;r=h+4|0}else{r=c[h+8>>2]|0;q=r;s=c[h+4>>2]|0}h=q+(s<<2)|0;s=o;c[s>>2]=0;c[s+4>>2]=0;a:do{if(r>>>0<h>>>0){q=n+32|0;s=13592|0;while(1){c[l>>2]=r;t=(Uc[c[s+12>>2]&15](p,o,r,h,l,n,q,m)|0)==2;s=c[l>>2]|0;if(t|(s|0)==(r|0)){break}if(n>>>0<(c[m>>2]|0)>>>0){r=n;do{Bi(d,a[r]|0);r=r+1|0}while(r>>>0<(c[m>>2]|0)>>>0);r=c[l>>2]|0}else{r=s}if(!(r>>>0<h>>>0)){break a}s=c[p>>2]|0}jn(12816)}}while(0);if((a[d]&1)==0){p=d+1|0}else{p=c[d+8>>2]|0}p=oc(((e|0)==-1?-1:e<<1)|0,f|0,g|0,p|0)|0;c[b+0>>2]=0;c[b+4>>2]=0;c[b+8>>2]=0;c[k+4>>2]=0;c[k>>2]=13696;t=rr(p|0)|0;g=p+t|0;s=o;c[s>>2]=0;c[s+4>>2]=0;if((t|0)<=0){vi(d);i=j;return}e=g;f=n+128|0;h=13696|0;while(1){c[l>>2]=p;t=(Uc[c[h+16>>2]&15](k,o,p,(e-p|0)>32?p+32|0:g,l,n,f,m)|0)==2;h=c[l>>2]|0;if(t|(h|0)==(p|0)){b=20;break}if(n>>>0<(c[m>>2]|0)>>>0){p=n;do{Li(b,c[p>>2]|0);p=p+4|0}while(p>>>0<(c[m>>2]|0)>>>0);p=c[l>>2]|0}else{p=h}if(!(p>>>0<g>>>0)){b=25;break}h=c[k>>2]|0}if((b|0)==20){jn(12816)}else if((b|0)==25){vi(d);i=j;return}}function Qn(a,b){a=a|0;b=b|0;a=i;fb(((b|0)==-1?-1:b<<1)|0)|0;i=a;return}function Rn(b){b=b|0;var d=0,e=0;d=i;c[b>>2]=12024;b=b+8|0;e=c[b>>2]|0;if((a[11832]|0)==0?(Ia(11832)|0)!=0:0){c[2956]=rb(2147483647,11840,0)|0;nb(11832)}if((e|0)==(c[2956]|0)){i=d;return}ub(c[b>>2]|0);i=d;return}function Sn(a){a=a|0;a=Nb(8)|0;Zh(a,11816);c[a>>2]=8864;Ac(a|0,8904,42)}function Tn(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0;f=i;i=i+16|0;e=f;c[b+4>>2]=d+ -1;c[b>>2]=11856;g=b+8|0;d=b+12|0;h=b+136|0;j=b+24|0;a[h]=1;c[d>>2]=j;c[g>>2]=j;c[b+16>>2]=h;h=28;do{if((j|0)==0){j=0}else{c[j>>2]=0;j=c[d>>2]|0}j=j+4|0;c[d>>2]=j;h=h+ -1|0}while((h|0)!=0);ti(b+144|0,11840,1);g=c[g>>2]|0;h=c[d>>2]|0;if((h|0)!=(g|0)){c[d>>2]=h+(~((h+ -4+(0-g)|0)>>>2)<<2)}c[16748>>2]=0;c[4186]=10336;if(!((c[2590]|0)==-1)){c[e>>2]=10360;c[e+4>>2]=144;c[e+8>>2]=0;qi(10360,e,145)}Un(b,16744,(c[10364>>2]|0)+ -1|0);c[16740>>2]=0;c[4184]=10376;if(!((c[2600]|0)==-1)){c[e>>2]=10400;c[e+4>>2]=144;c[e+8>>2]=0;qi(10400,e,145)}Un(b,16736,(c[10404>>2]|0)+ -1|0);c[16724>>2]=0;c[4180]=11952;c[16728>>2]=0;a[16732|0]=0;c[16728>>2]=c[(Kb()|0)>>2];if(!((c[2984]|0)==-1)){c[e>>2]=11936;c[e+4>>2]=144;c[e+8>>2]=0;qi(11936,e,145)}Un(b,16720,(c[11940>>2]|0)+ -1|0);c[16716>>2]=0;c[4178]=12912;if(!((c[2982]|0)==-1)){c[e>>2]=11928;c[e+4>>2]=144;c[e+8>>2]=0;qi(11928,e,145)}Un(b,16712,(c[11932>>2]|0)+ -1|0);c[16708>>2]=0;c[4176]=13128;if(!((c[3e3]|0)==-1)){c[e>>2]=12e3;c[e+4>>2]=144;c[e+8>>2]=0;qi(12e3,e,145)}Un(b,16704,(c[12004>>2]|0)+ -1|0);c[16692>>2]=0;c[4172]=12024;if((a[11832]|0)==0?(Ia(11832)|0)!=0:0){c[2956]=rb(2147483647,11840,0)|0;nb(11832)}c[16696>>2]=c[2956];if(!((c[3002]|0)==-1)){c[e>>2]=12008;c[e+4>>2]=144;c[e+8>>2]=0;qi(12008,e,145)}Un(b,16688,(c[12012>>2]|0)+ -1|0);c[16684>>2]=0;c[4170]=13352;if(!((c[3016]|0)==-1)){c[e>>2]=12064;c[e+4>>2]=144;c[e+8>>2]=0;qi(12064,e,145)}Un(b,16680,(c[12068>>2]|0)+ -1|0);c[16676>>2]=0;c[4168]=13472;if(!((c[3018]|0)==-1)){c[e>>2]=12072;c[e+4>>2]=144;c[e+8>>2]=0;qi(12072,e,145)}Un(b,16672,(c[12076>>2]|0)+ -1|0);c[16652>>2]=0;c[4162]=12104;a[16656|0]=46;a[16657|0]=44;c[16660>>2]=0;c[16664>>2]=0;c[16668>>2]=0;if(!((c[3020]|0)==-1)){c[e>>2]=12080;c[e+4>>2]=144;c[e+8>>2]=0;qi(12080,e,145)}Un(b,16648,(c[12084>>2]|0)+ -1|0);c[16620>>2]=0;c[4154]=12144;c[16624>>2]=46;c[16628>>2]=44;c[16632>>2]=0;c[16636>>2]=0;c[16640>>2]=0;if(!((c[3022]|0)==-1)){c[e>>2]=12088;c[e+4>>2]=144;c[e+8>>2]=0;qi(12088,e,145)}Un(b,16616,(c[12092>>2]|0)+ -1|0);c[16612>>2]=0;c[4152]=10416;if(!((c[2618]|0)==-1)){c[e>>2]=10472;c[e+4>>2]=144;c[e+8>>2]=0;qi(10472,e,145)}Un(b,16608,(c[10476>>2]|0)+ -1|0);c[16604>>2]=0;c[4150]=10536;if(!((c[2648]|0)==-1)){c[e>>2]=10592;c[e+4>>2]=144;c[e+8>>2]=0;qi(10592,e,145)}Un(b,16600,(c[10596>>2]|0)+ -1|0);c[16596>>2]=0;c[4148]=10608;if(!((c[2664]|0)==-1)){c[e>>2]=10656;c[e+4>>2]=144;c[e+8>>2]=0;qi(10656,e,145)}Un(b,16592,(c[10660>>2]|0)+ -1|0);c[16588>>2]=0;c[4146]=10672;if(!((c[2680]|0)==-1)){c[e>>2]=10720;c[e+4>>2]=144;c[e+8>>2]=0;qi(10720,e,145)}Un(b,16584,(c[10724>>2]|0)+ -1|0);c[16580>>2]=0;c[4144]=11264;if(!((c[2828]|0)==-1)){c[e>>2]=11312;c[e+4>>2]=144;c[e+8>>2]=0;qi(11312,e,145)}Un(b,16576,(c[11316>>2]|0)+ -1|0);c[16572>>2]=0;c[4142]=11328;if(!((c[2844]|0)==-1)){c[e>>2]=11376;c[e+4>>2]=144;c[e+8>>2]=0;qi(11376,e,145)}Un(b,16568,(c[11380>>2]|0)+ -1|0);c[16564>>2]=0;c[4140]=11392;if(!((c[2860]|0)==-1)){c[e>>2]=11440;c[e+4>>2]=144;c[e+8>>2]=0;qi(11440,e,145)}Un(b,16560,(c[11444>>2]|0)+ -1|0);c[16556>>2]=0;c[4138]=11456;if(!((c[2876]|0)==-1)){c[e>>2]=11504;c[e+4>>2]=144;c[e+8>>2]=0;qi(11504,e,145)}Un(b,16552,(c[11508>>2]|0)+ -1|0);c[16548>>2]=0;c[4136]=11520;if(!((c[2886]|0)==-1)){c[e>>2]=11544;c[e+4>>2]=144;c[e+8>>2]=0;qi(11544,e,145)}Un(b,16544,(c[11548>>2]|0)+ -1|0);c[16540>>2]=0;c[4134]=11600;if(!((c[2906]|0)==-1)){c[e>>2]=11624;c[e+4>>2]=144;c[e+8>>2]=0;qi(11624,e,145)}Un(b,16536,(c[11628>>2]|0)+ -1|0);c[16532>>2]=0;c[4132]=11656;if(!((c[2920]|0)==-1)){c[e>>2]=11680;c[e+4>>2]=144;c[e+8>>2]=0;qi(11680,e,145)}Un(b,16528,(c[11684>>2]|0)+ -1|0);c[16524>>2]=0;c[4130]=11704;if(!((c[2932]|0)==-1)){c[e>>2]=11728;c[e+4>>2]=144;c[e+8>>2]=0;qi(11728,e,145)}Un(b,16520,(c[11732>>2]|0)+ -1|0);c[16508>>2]=0;c[4126]=10752;c[16512>>2]=10800;if(!((c[2708]|0)==-1)){c[e>>2]=10832;c[e+4>>2]=144;c[e+8>>2]=0;qi(10832,e,145)}Un(b,16504,(c[10836>>2]|0)+ -1|0);c[16492>>2]=0;c[4122]=10904;c[16496>>2]=10952;if(!((c[2746]|0)==-1)){c[e>>2]=10984;c[e+4>>2]=144;c[e+8>>2]=0;qi(10984,e,145)}Un(b,16488,(c[10988>>2]|0)+ -1|0);c[16476>>2]=0;c[4118]=12848;if((a[11832]|0)==0?(Ia(11832)|0)!=0:0){c[2956]=rb(2147483647,11840,0)|0;nb(11832)}c[16480>>2]=c[2956];c[4118]=11200;if(!((c[2804]|0)==-1)){c[e>>2]=11216;c[e+4>>2]=144;c[e+8>>2]=0;qi(11216,e,145)}Un(b,16472,(c[11220>>2]|0)+ -1|0);c[16460>>2]=0;c[4114]=12848;if((a[11832]|0)==0?(Ia(11832)|0)!=0:0){c[2956]=rb(2147483647,11840,0)|0;nb(11832)}c[16464>>2]=c[2956];c[4114]=11232;if(!((c[2812]|0)==-1)){c[e>>2]=11248;c[e+4>>2]=144;c[e+8>>2]=0;qi(11248,e,145)}Un(b,16456,(c[11252>>2]|0)+ -1|0);c[16452>>2]=0;c[4112]=11744;if(!((c[2942]|0)==-1)){c[e>>2]=11768;c[e+4>>2]=144;c[e+8>>2]=0;qi(11768,e,145)}Un(b,16448,(c[11772>>2]|0)+ -1|0);c[16444>>2]=0;c[4110]=11784;if((c[2952]|0)==-1){j=c[11812>>2]|0;j=j+ -1|0;Un(b,16440,j);i=f;return}c[e>>2]=11808;c[e+4>>2]=144;c[e+8>>2]=0;qi(11808,e,145);j=c[11812>>2]|0;j=j+ -1|0;Un(b,16440,j);i=f;return}function Un(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0;f=i;Xh(b);e=a+8|0;a=a+12|0;k=c[a>>2]|0;l=c[e>>2]|0;j=k-l>>2;do{if(!(j>>>0>d>>>0)){h=d+1|0;if(j>>>0<h>>>0){Zp(e,h-j|0);l=c[e>>2]|0;break}if(j>>>0>h>>>0?(g=l+(h<<2)|0,(k|0)!=(g|0)):0){c[a>>2]=k+(~((k+ -4+(0-g)|0)>>>2)<<2)}}}while(0);g=c[l+(d<<2)>>2]|0;if((g|0)==0){l=l+(d<<2)|0;c[l>>2]=b;i=f;return}Yh(g)|0;l=c[e>>2]|0;l=l+(d<<2)|0;c[l>>2]=b;i=f;return}function Vn(a){a=a|0;var b=0;b=i;Wn(a);Yq(a);i=b;return}function Wn(b){b=b|0;var d=0,e=0,f=0,g=0,h=0,j=0,k=0;e=i;c[b>>2]=11856;d=b+12|0;g=c[d>>2]|0;f=b+8|0;j=c[f>>2]|0;if((g|0)!=(j|0)){h=0;do{k=c[j+(h<<2)>>2]|0;if((k|0)!=0){Yh(k)|0;g=c[d>>2]|0;j=c[f>>2]|0}h=h+1|0}while(h>>>0<g-j>>2>>>0)}vi(b+144|0);f=c[f>>2]|0;if((f|0)==0){i=e;return}g=c[d>>2]|0;if((g|0)!=(f|0)){c[d>>2]=g+(~((g+ -4+(0-f)|0)>>>2)<<2)}if((b+24|0)==(f|0)){a[b+136|0]=0;i=e;return}else{Yq(f);i=e;return}}function Xn(){var b=0,d=0;b=i;if((a[11912]|0)!=0){d=c[2976]|0;i=b;return d|0}if((Ia(11912)|0)==0){d=c[2976]|0;i=b;return d|0}if((a[11888]|0)==0?(Ia(11888)|0)!=0:0){Tn(16280,1);c[2968]=16280;c[2970]=11872;nb(11888)}d=c[c[2970]>>2]|0;c[2974]=d;Xh(d);c[2976]=11896;nb(11912);d=c[2976]|0;i=b;return d|0}function Yn(a){a=a|0;var b=0,d=0;b=i;d=c[(Xn()|0)>>2]|0;c[a>>2]=d;Xh(d);i=b;return}function Zn(a,b){a=a|0;b=b|0;var d=0;d=i;b=c[b>>2]|0;c[a>>2]=b;Xh(b);i=d;return}function _n(a){a=a|0;var b=0;b=i;Yh(c[a>>2]|0)|0;i=b;return}function $n(a,b){a=a|0;b=b|0;var d=0,e=0;d=i;i=i+16|0;e=d;a=c[a>>2]|0;if(!((c[b>>2]|0)==-1)){c[e>>2]=b;c[e+4>>2]=144;c[e+8>>2]=0;qi(b,e,145)}e=(c[b+4>>2]|0)+ -1|0;b=c[a+8>>2]|0;if(!((c[a+12>>2]|0)-b>>2>>>0>e>>>0)){e=Nb(4)|0;wq(e);Ac(e|0,19896,130)}a=c[b+(e<<2)>>2]|0;if((a|0)==0){e=Nb(4)|0;wq(e);Ac(e|0,19896,130)}else{i=d;return a|0}return 0}function ao(a){a=a|0;var b=0;b=i;Yq(a);i=b;return}function bo(a){a=a|0;var b=0;b=i;if((a|0)==0){i=b;return}Lc[c[(c[a>>2]|0)+4>>2]&255](a);i=b;return}function co(a){a=a|0;var b=0;b=c[2980]|0;c[2980]=b+1;c[a+4>>2]=b+1;return}function eo(a){a=a|0;var b=0;b=i;Yq(a);i=b;return}function fo(a,d,e){a=a|0;d=d|0;e=e|0;a=i;if(!(e>>>0<128)){d=0;i=a;return d|0}d=(b[(c[(Kb()|0)>>2]|0)+(e<<1)>>1]&d)<<16>>16!=0;i=a;return d|0}function go(a,d,e,f){a=a|0;d=d|0;e=e|0;f=f|0;var g=0;a=i;if((d|0)==(e|0)){g=d;i=a;return g|0}while(1){g=c[d>>2]|0;if(g>>>0<128){g=b[(c[(Kb()|0)>>2]|0)+(g<<1)>>1]|0}else{g=0}b[f>>1]=g;d=d+4|0;if((d|0)==(e|0)){break}else{f=f+2|0}}i=a;return e|0}function ho(a,d,e,f){a=a|0;d=d|0;e=e|0;f=f|0;var g=0;a=i;a:do{if((e|0)==(f|0)){f=e}else{do{g=c[e>>2]|0;if(g>>>0<128?!((b[(c[(Kb()|0)>>2]|0)+(g<<1)>>1]&d)<<16>>16==0):0){f=e;break a}e=e+4|0}while((e|0)!=(f|0))}}while(0);i=a;return f|0}function io(a,d,e,f){a=a|0;d=d|0;e=e|0;f=f|0;var g=0,h=0;a=i;a:do{if((e|0)==(f|0)){f=e}else{while(1){g=c[e>>2]|0;if(!(g>>>0<128)){f=e;break a}h=e+4|0;if((b[(c[(Kb()|0)>>2]|0)+(g<<1)>>1]&d)<<16>>16==0){f=e;break a}if((h|0)==(f|0)){break}else{e=h}}}}while(0);i=a;return f|0}function jo(a,b){a=a|0;b=b|0;a=i;if(!(b>>>0<128)){i=a;return b|0}b=c[(c[(Oa()|0)>>2]|0)+(b<<2)>>2]|0;i=a;return b|0}function ko(a,b,d){a=a|0;b=b|0;d=d|0;var e=0;a=i;if((b|0)==(d|0)){e=b;i=a;return e|0}do{e=c[b>>2]|0;if(e>>>0<128){e=c[(c[(Oa()|0)>>2]|0)+(e<<2)>>2]|0}c[b>>2]=e;b=b+4|0}while((b|0)!=(d|0));i=a;return d|0}function lo(a,b){a=a|0;b=b|0;a=i;if(!(b>>>0<128)){i=a;return b|0}b=c[(c[(sc()|0)>>2]|0)+(b<<2)>>2]|0;i=a;return b|0}function mo(a,b,d){a=a|0;b=b|0;d=d|0;var e=0;a=i;if((b|0)==(d|0)){e=b;i=a;return e|0}do{e=c[b>>2]|0;if(e>>>0<128){e=c[(c[(sc()|0)>>2]|0)+(e<<2)>>2]|0}c[b>>2]=e;b=b+4|0}while((b|0)!=(d|0));i=a;return d|0}function no(a,b){a=a|0;b=b|0;return b<<24>>24|0}function oo(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;b=i;if((d|0)==(e|0)){i=b;return d|0}while(1){c[f>>2]=a[d]|0;d=d+1|0;if((d|0)==(e|0)){break}else{f=f+4|0}}i=b;return e|0}function po(a,b,c){a=a|0;b=b|0;c=c|0;return(b>>>0<128?b&255:c)|0}function qo(b,d,e,f,g){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0;b=i;if((d|0)==(e|0)){k=d;i=b;return k|0}h=((e+ -4+(0-d)|0)>>>2)+1|0;j=d;while(1){k=c[j>>2]|0;a[g]=k>>>0<128?k&255:f;j=j+4|0;if((j|0)==(e|0)){break}else{g=g+1|0}}k=d+(h<<2)|0;i=b;return k|0}function ro(b){b=b|0;var d=0,e=0;d=i;c[b>>2]=11952;e=c[b+8>>2]|0;if((e|0)!=0?(a[b+12|0]|0)!=0:0){Zq(e)}Yq(b);i=d;return}function so(b){b=b|0;var d=0,e=0;d=i;c[b>>2]=11952;e=c[b+8>>2]|0;if((e|0)!=0?(a[b+12|0]|0)!=0:0){Zq(e)}i=d;return}function to(a,b){a=a|0;b=b|0;a=i;if(!(b<<24>>24>-1)){i=a;return b|0}b=c[(c[(Oa()|0)>>2]|0)+((b&255)<<2)>>2]&255;i=a;return b|0}function uo(b,d,e){b=b|0;d=d|0;e=e|0;var f=0;b=i;if((d|0)==(e|0)){f=d;i=b;return f|0}do{f=a[d]|0;if(f<<24>>24>-1){f=c[(c[(Oa()|0)>>2]|0)+(f<<24>>24<<2)>>2]&255}a[d]=f;d=d+1|0}while((d|0)!=(e|0));i=b;return e|0}function vo(a,b){a=a|0;b=b|0;a=i;if(!(b<<24>>24>-1)){i=a;return b|0}b=c[(c[(sc()|0)>>2]|0)+(b<<24>>24<<2)>>2]&255;i=a;return b|0}function wo(b,d,e){b=b|0;d=d|0;e=e|0;var f=0;b=i;if((d|0)==(e|0)){f=d;i=b;return f|0}do{f=a[d]|0;if(f<<24>>24>-1){f=c[(c[(sc()|0)>>2]|0)+(f<<24>>24<<2)>>2]&255}a[d]=f;d=d+1|0}while((d|0)!=(e|0));i=b;return e|0}function xo(a,b){a=a|0;b=b|0;return b|0}function yo(b,c,d,e){b=b|0;c=c|0;d=d|0;e=e|0;b=i;if((c|0)==(d|0)){d=c}else{while(1){a[e]=a[c]|0;c=c+1|0;if((c|0)==(d|0)){break}else{e=e+1|0}}}i=b;return d|0}function zo(a,b,c){a=a|0;b=b|0;c=c|0;return(b<<24>>24>-1?b:c)|0}function Ao(b,c,d,e,f){b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;var g=0;b=i;if((c|0)==(d|0)){g=c;i=b;return g|0}while(1){g=a[c]|0;a[f]=g<<24>>24>-1?g:e;c=c+1|0;if((c|0)==(d|0)){break}else{f=f+1|0}}i=b;return d|0}function Bo(a){a=a|0;var b=0;b=i;Yq(a);i=b;return}function Co(a,b,d,e,f,g,h,i){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;i=i|0;c[f>>2]=d;c[i>>2]=g;return 3}function Do(a,b,d,e,f,g,h,i){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;i=i|0;c[f>>2]=d;c[i>>2]=g;return 3}function Eo(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;c[f>>2]=d;return 3}function Fo(a){a=a|0;return 1}function Go(a){a=a|0;return 1}function Ho(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;c=d-c|0;return(c>>>0<e>>>0?c:e)|0}function Io(a){a=a|0;return 1}function Jo(a){a=a|0;var b=0;b=i;Rn(a);Yq(a);i=b;return}function Ko(b,d,e,f,g,h,j,k){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0;l=i;i=i+16|0;m=l;n=l+8|0;o=(e|0)==(f|0);a:do{if(!o){p=e;while(1){q=p+4|0;if((c[p>>2]|0)==0){break}if((q|0)==(f|0)){p=f;break}else{p=q}}c[k>>2]=h;c[g>>2]=e;if(!(o|(h|0)==(j|0))){o=j;b=b+8|0;while(1){s=d;q=c[s+4>>2]|0;r=m;c[r>>2]=c[s>>2];c[r+4>>2]=q;r=Sb(c[b>>2]|0)|0;q=kq(h,g,p-e>>2,o-h|0,d)|0;if((r|0)!=0){Sb(r|0)|0}if((q|0)==0){g=1;d=33;break}else if((q|0)==-1){d=10;break}h=(c[k>>2]|0)+q|0;c[k>>2]=h;if((h|0)==(j|0)){d=31;break}if((p|0)==(f|0)){e=c[g>>2]|0;p=f}else{e=Sb(c[b>>2]|0)|0;h=jq(n,0,d)|0;if((e|0)!=0){Sb(e|0)|0}if((h|0)==-1){g=2;d=33;break}e=c[k>>2]|0;if(h>>>0>(o-e|0)>>>0){g=1;d=33;break}b:do{if((h|0)!=0){p=n;while(1){s=a[p]|0;c[k>>2]=e+1;a[e]=s;h=h+ -1|0;if((h|0)==0){break b}e=c[k>>2]|0;p=p+1|0}}}while(0);e=(c[g>>2]|0)+4|0;c[g>>2]=e;c:do{if((e|0)==(f|0)){p=f}else{p=e;while(1){h=p+4|0;if((c[p>>2]|0)==0){break c}if((h|0)==(f|0)){p=f;break}else{p=h}}}}while(0);h=c[k>>2]|0}if((e|0)==(f|0)|(h|0)==(j|0)){break a}}if((d|0)==10){c[k>>2]=h;d:do{if((e|0)!=(c[g>>2]|0)){do{d=c[e>>2]|0;f=Sb(c[b>>2]|0)|0;d=jq(h,d,m)|0;if((f|0)!=0){Sb(f|0)|0}if((d|0)==-1){break d}h=(c[k>>2]|0)+d|0;c[k>>2]=h;e=e+4|0}while((e|0)!=(c[g>>2]|0))}}while(0);c[g>>2]=e;s=2;i=l;return s|0}else if((d|0)==31){e=c[g>>2]|0;break}else if((d|0)==33){i=l;return g|0}}}else{c[k>>2]=h;c[g>>2]=e}}while(0);s=(e|0)!=(f|0)|0;i=l;return s|0}function Lo(b,d,e,f,g,h,j,k){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0;l=i;i=i+16|0;m=l;n=(e|0)==(f|0);a:do{if(!n){p=e;while(1){o=p+1|0;if((a[p]|0)==0){break}if((o|0)==(f|0)){p=f;break}else{p=o}}c[k>>2]=h;c[g>>2]=e;if(!(n|(h|0)==(j|0))){n=j;b=b+8|0;while(1){q=d;r=c[q+4>>2]|0;o=m;c[o>>2]=c[q>>2];c[o+4>>2]=r;o=p;r=Sb(c[b>>2]|0)|0;q=gq(h,g,o-e|0,n-h>>2,d)|0;if((r|0)!=0){Sb(r|0)|0}if((q|0)==0){f=2;d=32;break}else if((q|0)==-1){d=10;break}h=(c[k>>2]|0)+(q<<2)|0;c[k>>2]=h;if((h|0)==(j|0)){d=30;break}e=c[g>>2]|0;if((p|0)==(f|0)){p=f}else{o=Sb(c[b>>2]|0)|0;e=fq(h,e,1,d)|0;if((o|0)!=0){Sb(o|0)|0}if((e|0)!=0){f=2;d=32;break}c[k>>2]=(c[k>>2]|0)+4;e=(c[g>>2]|0)+1|0;c[g>>2]=e;b:do{if((e|0)==(f|0)){p=f}else{p=e;while(1){o=p+1|0;if((a[p]|0)==0){break b}if((o|0)==(f|0)){p=f;break}else{p=o}}}}while(0);h=c[k>>2]|0}if((e|0)==(f|0)|(h|0)==(j|0)){break a}}if((d|0)==10){c[k>>2]=h;c:do{if((e|0)!=(c[g>>2]|0)){while(1){d=Sb(c[b>>2]|0)|0;j=fq(h,e,o-e|0,m)|0;if((d|0)!=0){Sb(d|0)|0}if((j|0)==-2){d=16;break}else if((j|0)==-1){d=15;break}else if((j|0)==0){e=e+1|0}else{e=e+j|0}h=(c[k>>2]|0)+4|0;c[k>>2]=h;if((e|0)==(c[g>>2]|0)){break c}}if((d|0)==15){c[g>>2]=e;r=2;i=l;return r|0}else if((d|0)==16){c[g>>2]=e;r=1;i=l;return r|0}}}while(0);c[g>>2]=e;r=(e|0)!=(f|0)|0;i=l;return r|0}else if((d|0)==30){e=c[g>>2]|0;break}else if((d|0)==32){i=l;return f|0}}}else{c[k>>2]=h;c[g>>2]=e}}while(0);r=(e|0)!=(f|0)|0;i=l;return r|0}function Mo(b,d,e,f,g){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0;h=i;i=i+16|0;j=h;c[g>>2]=e;b=Sb(c[b+8>>2]|0)|0;d=jq(j,0,d)|0;if((b|0)!=0){Sb(b|0)|0}if((d|0)==0|(d|0)==-1){e=2;i=h;return e|0}d=d+ -1|0;b=c[g>>2]|0;if(d>>>0>(f-b|0)>>>0){e=1;i=h;return e|0}if((d|0)==0){e=0;i=h;return e|0}else{f=b}while(1){e=a[j]|0;c[g>>2]=f+1;a[f]=e;d=d+ -1|0;if((d|0)==0){g=0;break}f=c[g>>2]|0;j=j+1|0}i=h;return g|0}function No(a){a=a|0;var b=0,d=0,e=0;b=i;a=a+8|0;e=Sb(c[a>>2]|0)|0;d=iq(0,0,4)|0;if((e|0)!=0){Sb(e|0)|0}if((d|0)==0){a=c[a>>2]|0;if((a|0)!=0){a=Sb(a|0)|0;if((a|0)==0){a=0}else{Sb(a|0)|0;a=0}}else{a=1}}else{a=-1}i=b;return a|0}function Oo(a){a=a|0;return 0}function Po(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0;g=i;if((f|0)==0|(d|0)==(e|0)){m=0;i=g;return m|0}h=e;a=a+8|0;k=0;j=0;while(1){m=Sb(c[a>>2]|0)|0;l=eq(d,h-d|0,b)|0;if((m|0)!=0){Sb(m|0)|0}if((l|0)==0){d=d+1|0;l=1}else if((l|0)==-2|(l|0)==-1){f=9;break}else{d=d+l|0}k=l+k|0;j=j+1|0;if(j>>>0>=f>>>0|(d|0)==(e|0)){f=9;break}}if((f|0)==9){i=g;return k|0}return 0}function Qo(a){a=a|0;var b=0;b=i;a=c[a+8>>2]|0;if((a|0)!=0){a=Sb(a|0)|0;if((a|0)==0){a=4}else{Sb(a|0)|0;a=4}}else{a=1}i=b;return a|0}function Ro(a){a=a|0;var b=0;b=i;Yq(a);i=b;return}function So(a,b,d,e,f,g,h,j){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0;a=i;i=i+16|0;l=a+4|0;k=a;c[l>>2]=d;c[k>>2]=g;b=To(d,e,l,g,h,k,1114111,0)|0;c[f>>2]=d+((c[l>>2]|0)-d>>1<<1);c[j>>2]=g+((c[k>>2]|0)-g);i=a;return b|0}function To(d,f,g,h,j,k,l,m){d=d|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;var n=0,o=0,p=0;n=i;c[g>>2]=d;c[k>>2]=h;do{if((m&2|0)!=0){if((j-h|0)<3){p=1;i=n;return p|0}else{c[k>>2]=h+1;a[h]=-17;p=c[k>>2]|0;c[k>>2]=p+1;a[p]=-69;p=c[k>>2]|0;c[k>>2]=p+1;a[p]=-65;break}}}while(0);h=f;o=c[g>>2]|0;if(!(o>>>0<f>>>0)){p=0;i=n;return p|0}a:while(1){d=b[o>>1]|0;m=d&65535;if(m>>>0>l>>>0){l=2;f=26;break}do{if((d&65535)<128){m=c[k>>2]|0;if((j-m|0)<1){l=1;f=26;break a}c[k>>2]=m+1;a[m]=d}else{if((d&65535)<2048){d=c[k>>2]|0;if((j-d|0)<2){l=1;f=26;break a}c[k>>2]=d+1;a[d]=m>>>6|192;p=c[k>>2]|0;c[k>>2]=p+1;a[p]=m&63|128;break}if((d&65535)<55296){d=c[k>>2]|0;if((j-d|0)<3){l=1;f=26;break a}c[k>>2]=d+1;a[d]=m>>>12|224;p=c[k>>2]|0;c[k>>2]=p+1;a[p]=m>>>6&63|128;p=c[k>>2]|0;c[k>>2]=p+1;a[p]=m&63|128;break}if(!((d&65535)<56320)){if((d&65535)<57344){l=2;f=26;break a}d=c[k>>2]|0;if((j-d|0)<3){l=1;f=26;break a}c[k>>2]=d+1;a[d]=m>>>12|224;p=c[k>>2]|0;c[k>>2]=p+1;a[p]=m>>>6&63|128;p=c[k>>2]|0;c[k>>2]=p+1;a[p]=m&63|128;break}if((h-o|0)<4){l=1;f=26;break a}p=o+2|0;d=e[p>>1]|0;if((d&64512|0)!=56320){l=2;f=26;break a}if((j-(c[k>>2]|0)|0)<4){l=1;f=26;break a}o=m&960;if(((o<<10)+65536|m<<10&64512|d&1023)>>>0>l>>>0){l=2;f=26;break a}c[g>>2]=p;o=(o>>>6)+1|0;p=c[k>>2]|0;c[k>>2]=p+1;a[p]=o>>>2|240;p=c[k>>2]|0;c[k>>2]=p+1;a[p]=m>>>2&15|o<<4&48|128;p=c[k>>2]|0;c[k>>2]=p+1;a[p]=m<<4&48|d>>>6&15|128;p=c[k>>2]|0;c[k>>2]=p+1;a[p]=d&63|128}}while(0);o=(c[g>>2]|0)+2|0;c[g>>2]=o;if(!(o>>>0<f>>>0)){l=0;f=26;break}}if((f|0)==26){i=n;return l|0}return 0}function Uo(a,b,d,e,f,g,h,j){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0;a=i;i=i+16|0;l=a+4|0;k=a;c[l>>2]=d;c[k>>2]=g;b=Vo(d,e,l,g,h,k,1114111,0)|0;c[f>>2]=d+((c[l>>2]|0)-d);c[j>>2]=g+((c[k>>2]|0)-g>>1<<1);i=a;return b|0}function Vo(e,f,g,h,j,k,l,m){e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;var n=0,o=0,p=0,q=0,r=0,s=0;n=i;c[g>>2]=e;c[k>>2]=h;p=c[g>>2]|0;if(((((m&4|0)!=0?(f-p|0)>2:0)?(a[p]|0)==-17:0)?(a[p+1|0]|0)==-69:0)?(a[p+2|0]|0)==-65:0){p=p+3|0;c[g>>2]=p}a:do{if(p>>>0<f>>>0){h=f;m=j;e=c[k>>2]|0;b:while(1){if(!(e>>>0<j>>>0)){break a}q=a[p]|0;o=q&255;if(o>>>0>l>>>0){f=2;l=41;break}do{if(q<<24>>24>-1){b[e>>1]=q&255;c[g>>2]=p+1}else{if((q&255)<194){f=2;l=41;break b}if((q&255)<224){if((h-p|0)<2){f=1;l=41;break b}q=d[p+1|0]|0;if((q&192|0)!=128){f=2;l=41;break b}o=q&63|o<<6&1984;if(o>>>0>l>>>0){f=2;l=41;break b}b[e>>1]=o;c[g>>2]=p+2;break}if((q&255)<240){if((h-p|0)<3){f=1;l=41;break b}q=a[p+1|0]|0;r=a[p+2|0]|0;if((o|0)==224){if(!((q&-32)<<24>>24==-96)){f=2;l=41;break b}}else if((o|0)==237){if(!((q&-32)<<24>>24==-128)){f=2;l=41;break b}}else{if(!((q&-64)<<24>>24==-128)){f=2;l=41;break b}}r=r&255;if((r&192|0)!=128){f=2;l=41;break b}o=(q&255)<<6&4032|o<<12|r&63;if((o&65535)>>>0>l>>>0){f=2;l=41;break b}b[e>>1]=o;c[g>>2]=p+3;break}if(!((q&255)<245)){f=2;l=41;break b}if((h-p|0)<4){f=1;l=41;break b}q=a[p+1|0]|0;r=a[p+2|0]|0;s=a[p+3|0]|0;if((o|0)==244){if(!((q&-16)<<24>>24==-128)){f=2;l=41;break b}}else if((o|0)==240){if(!((q+112<<24>>24&255)<48)){f=2;l=41;break b}}else{if(!((q&-64)<<24>>24==-128)){f=2;l=41;break b}}p=r&255;if((p&192|0)!=128){f=2;l=41;break b}r=s&255;if((r&192|0)!=128){f=2;l=41;break b}if((m-e|0)<4){f=1;l=41;break b}o=o&7;s=q&255;q=p<<6;r=r&63;if((s<<12&258048|o<<18|q&4032|r)>>>0>l>>>0){f=2;l=41;break b}b[e>>1]=s<<2&60|p>>>4&3|((s>>>4&3|o<<2)<<6)+16320|55296;s=e+2|0;c[k>>2]=s;b[s>>1]=r|q&960|56320;c[g>>2]=(c[g>>2]|0)+4}}while(0);e=(c[k>>2]|0)+2|0;c[k>>2]=e;p=c[g>>2]|0;if(!(p>>>0<f>>>0)){break a}}if((l|0)==41){i=n;return f|0}}}while(0);s=p>>>0<f>>>0|0;i=n;return s|0}function Wo(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;c[f>>2]=d;return 3}function Xo(a){a=a|0;return 0}function Yo(a){a=a|0;return 0}function Zo(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;a=i;b=_o(c,d,e,1114111,0)|0;i=a;return b|0}function _o(b,c,e,f,g){b=b|0;c=c|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0;h=i;if((((g&4|0)!=0?(c-b|0)>2:0)?(a[b]|0)==-17:0)?(a[b+1|0]|0)==-69:0){k=(a[b+2|0]|0)==-65?b+3|0:b}else{k=b}a:do{if(k>>>0<c>>>0&(e|0)!=0){g=c;j=0;b:while(1){m=a[k]|0;l=m&255;if(l>>>0>f>>>0){break a}do{if(m<<24>>24>-1){k=k+1|0}else{if((m&255)<194){break a}if((m&255)<224){if((g-k|0)<2){break a}m=d[k+1|0]|0;if((m&192|0)!=128){break a}if((m&63|l<<6&1984)>>>0>f>>>0){break a}k=k+2|0;break}if((m&255)<240){n=k;if((g-n|0)<3){break a}m=a[k+1|0]|0;o=a[k+2|0]|0;if((l|0)==224){if(!((m&-32)<<24>>24==-96)){c=21;break b}}else if((l|0)==237){if(!((m&-32)<<24>>24==-128)){c=23;break b}}else{if(!((m&-64)<<24>>24==-128)){c=25;break b}}n=o&255;if((n&192|0)!=128){break a}if(((m&255)<<6&4032|l<<12&61440|n&63)>>>0>f>>>0){break a}k=k+3|0;break}if(!((m&255)<245)){break a}o=k;if((g-o|0)<4){break a}if((e-j|0)>>>0<2){break a}m=a[k+1|0]|0;p=a[k+2|0]|0;n=a[k+3|0]|0;if((l|0)==240){if(!((m+112<<24>>24&255)<48)){c=34;break b}}else if((l|0)==244){if(!((m&-16)<<24>>24==-128)){c=36;break b}}else{if(!((m&-64)<<24>>24==-128)){c=38;break b}}o=p&255;if((o&192|0)!=128){break a}n=n&255;if((n&192|0)!=128){break a}if(((m&255)<<12&258048|l<<18&1835008|o<<6&4032|n&63)>>>0>f>>>0){break a}k=k+4|0;j=j+1|0}}while(0);j=j+1|0;if(!(k>>>0<c>>>0&j>>>0<e>>>0)){break a}}if((c|0)==21){p=n-b|0;i=h;return p|0}else if((c|0)==23){p=n-b|0;i=h;return p|0}else if((c|0)==25){p=n-b|0;i=h;return p|0}else if((c|0)==34){p=o-b|0;i=h;return p|0}else if((c|0)==36){p=o-b|0;i=h;return p|0}else if((c|0)==38){p=o-b|0;i=h;return p|0}}}while(0);p=k-b|0;i=h;return p|0}function $o(a){a=a|0;return 4}function ap(a){a=a|0;var b=0;b=i;Yq(a);i=b;return}function bp(a,b,d,e,f,g,h,j){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0;a=i;i=i+16|0;l=a+4|0;k=a;c[l>>2]=d;c[k>>2]=g;b=cp(d,e,l,g,h,k,1114111,0)|0;c[f>>2]=d+((c[l>>2]|0)-d>>2<<2);c[j>>2]=g+((c[k>>2]|0)-g);i=a;return b|0}function cp(b,d,e,f,g,h,j,k){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0;l=i;c[e>>2]=b;c[h>>2]=f;do{if((k&2|0)!=0){if((g-f|0)<3){b=1;i=l;return b|0}else{c[h>>2]=f+1;a[f]=-17;b=c[h>>2]|0;c[h>>2]=b+1;a[b]=-69;b=c[h>>2]|0;c[h>>2]=b+1;a[b]=-65;break}}}while(0);f=c[e>>2]|0;if(!(f>>>0<d>>>0)){b=0;i=l;return b|0}a:while(1){f=c[f>>2]|0;if((f&-2048|0)==55296|f>>>0>j>>>0){j=2;e=19;break}do{if(!(f>>>0<128)){if(f>>>0<2048){k=c[h>>2]|0;if((g-k|0)<2){j=1;e=19;break a}c[h>>2]=k+1;a[k]=f>>>6|192;b=c[h>>2]|0;c[h>>2]=b+1;a[b]=f&63|128;break}k=c[h>>2]|0;b=g-k|0;if(f>>>0<65536){if((b|0)<3){j=1;e=19;break a}c[h>>2]=k+1;a[k]=f>>>12|224;b=c[h>>2]|0;c[h>>2]=b+1;a[b]=f>>>6&63|128;b=c[h>>2]|0;c[h>>2]=b+1;a[b]=f&63|128;break}else{if((b|0)<4){j=1;e=19;break a}c[h>>2]=k+1;a[k]=f>>>18|240;b=c[h>>2]|0;c[h>>2]=b+1;a[b]=f>>>12&63|128;b=c[h>>2]|0;c[h>>2]=b+1;a[b]=f>>>6&63|128;b=c[h>>2]|0;c[h>>2]=b+1;a[b]=f&63|128;break}}else{k=c[h>>2]|0;if((g-k|0)<1){j=1;e=19;break a}c[h>>2]=k+1;a[k]=f}}while(0);f=(c[e>>2]|0)+4|0;c[e>>2]=f;if(!(f>>>0<d>>>0)){j=0;e=19;break}}if((e|0)==19){i=l;return j|0}return 0}function dp(a,b,d,e,f,g,h,j){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0;a=i;i=i+16|0;l=a+4|0;k=a;c[l>>2]=d;c[k>>2]=g;b=ep(d,e,l,g,h,k,1114111,0)|0;c[f>>2]=d+((c[l>>2]|0)-d);c[j>>2]=g+((c[k>>2]|0)-g>>2<<2);i=a;return b|0}function ep(b,e,f,g,h,j,k,l){b=b|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;var m=0,n=0,o=0,p=0,q=0,r=0;n=i;c[f>>2]=b;c[j>>2]=g;g=c[f>>2]|0;if(((((l&4|0)!=0?(e-g|0)>2:0)?(a[g]|0)==-17:0)?(a[g+1|0]|0)==-69:0)?(a[g+2|0]|0)==-65:0){g=g+3|0;c[f>>2]=g}a:do{if(g>>>0<e>>>0){l=e;b=c[j>>2]|0;while(1){if(!(b>>>0<h>>>0)){m=39;break a}p=a[g]|0;o=p&255;do{if(p<<24>>24>-1){if(o>>>0>k>>>0){e=2;break a}c[b>>2]=o;c[f>>2]=g+1}else{if((p&255)<194){e=2;break a}if((p&255)<224){if((l-g|0)<2){e=1;break a}p=d[g+1|0]|0;if((p&192|0)!=128){e=2;break a}o=p&63|o<<6&1984;if(o>>>0>k>>>0){e=2;break a}c[b>>2]=o;c[f>>2]=g+2;break}if((p&255)<240){if((l-g|0)<3){e=1;break a}p=a[g+1|0]|0;q=a[g+2|0]|0;if((o|0)==237){if(!((p&-32)<<24>>24==-128)){e=2;break a}}else if((o|0)==224){if(!((p&-32)<<24>>24==-96)){e=2;break a}}else{if(!((p&-64)<<24>>24==-128)){e=2;break a}}q=q&255;if((q&192|0)!=128){e=2;break a}o=(p&255)<<6&4032|o<<12&61440|q&63;if(o>>>0>k>>>0){e=2;break a}c[b>>2]=o;c[f>>2]=g+3;break}if(!((p&255)<245)){e=2;break a}if((l-g|0)<4){e=1;break a}p=a[g+1|0]|0;r=a[g+2|0]|0;q=a[g+3|0]|0;if((o|0)==240){if(!((p+112<<24>>24&255)<48)){e=2;break a}}else if((o|0)==244){if(!((p&-16)<<24>>24==-128)){e=2;break a}}else{if(!((p&-64)<<24>>24==-128)){e=2;break a}}r=r&255;if((r&192|0)!=128){e=2;break a}q=q&255;if((q&192|0)!=128){e=2;break a}o=(p&255)<<12&258048|o<<18&1835008|r<<6&4032|q&63;if(o>>>0>k>>>0){e=2;break a}c[b>>2]=o;c[f>>2]=g+4}}while(0);b=(c[j>>2]|0)+4|0;c[j>>2]=b;g=c[f>>2]|0;if(!(g>>>0<e>>>0)){m=39;break}}}else{m=39}}while(0);if((m|0)==39){e=g>>>0<e>>>0|0}i=n;return e|0}function fp(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;c[f>>2]=d;return 3}function gp(a){a=a|0;return 0}function hp(a){a=a|0;return 0}function ip(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;a=i;b=jp(c,d,e,1114111,0)|0;i=a;return b|0}function jp(b,c,e,f,g){b=b|0;c=c|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0;h=i;if((((g&4|0)!=0?(c-b|0)>2:0)?(a[b]|0)==-17:0)?(a[b+1|0]|0)==-69:0){k=(a[b+2|0]|0)==-65?b+3|0:b}else{k=b}a:do{if(k>>>0<c>>>0&(e|0)!=0){g=c;j=1;b:while(1){m=a[k]|0;l=m&255;do{if(m<<24>>24>-1){if(l>>>0>f>>>0){break a}k=k+1|0}else{if((m&255)<194){break a}if((m&255)<224){if((g-k|0)<2){break a}m=d[k+1|0]|0;if((m&192|0)!=128){break a}if((m&63|l<<6&1984)>>>0>f>>>0){break a}k=k+2|0;break}if((m&255)<240){m=k;if((g-m|0)<3){break a}n=a[k+1|0]|0;o=a[k+2|0]|0;if((l|0)==237){if(!((n&-32)<<24>>24==-128)){c=23;break b}}else if((l|0)==224){if(!((n&-32)<<24>>24==-96)){c=21;break b}}else{if(!((n&-64)<<24>>24==-128)){c=25;break b}}m=o&255;if((m&192|0)!=128){break a}if(((n&255)<<6&4032|l<<12&61440|m&63)>>>0>f>>>0){break a}k=k+3|0;break}if(!((m&255)<245)){break a}o=k;if((g-o|0)<4){break a}m=a[k+1|0]|0;p=a[k+2|0]|0;n=a[k+3|0]|0;if((l|0)==244){if(!((m&-16)<<24>>24==-128)){c=35;break b}}else if((l|0)==240){if(!((m+112<<24>>24&255)<48)){c=33;break b}}else{if(!((m&-64)<<24>>24==-128)){c=37;break b}}o=p&255;if((o&192|0)!=128){break a}n=n&255;if((n&192|0)!=128){break a}if(((m&255)<<12&258048|l<<18&1835008|o<<6&4032|n&63)>>>0>f>>>0){break a}k=k+4|0}}while(0);if(!(k>>>0<c>>>0&j>>>0<e>>>0)){break a}j=j+1|0}if((c|0)==21){p=m-b|0;i=h;return p|0}else if((c|0)==23){p=m-b|0;i=h;return p|0}else if((c|0)==25){p=m-b|0;i=h;return p|0}else if((c|0)==33){p=o-b|0;i=h;return p|0}else if((c|0)==35){p=o-b|0;i=h;return p|0}else if((c|0)==37){p=o-b|0;i=h;return p|0}}}while(0);p=k-b|0;i=h;return p|0}function kp(a){a=a|0;return 4}function lp(a){a=a|0;var b=0;b=i;Yq(a);i=b;return}function mp(a){a=a|0;var b=0;b=i;Yq(a);i=b;return}function np(a){a=a|0;var b=0;b=i;c[a>>2]=12104;vi(a+12|0);Yq(a);i=b;return}function op(a){a=a|0;var b=0;b=i;c[a>>2]=12104;vi(a+12|0);i=b;return}function pp(a){a=a|0;var b=0;b=i;c[a>>2]=12144;vi(a+16|0);Yq(a);i=b;return}function qp(a){a=a|0;var b=0;b=i;c[a>>2]=12144;vi(a+16|0);i=b;return}function rp(b){b=b|0;return a[b+8|0]|0}function sp(a){a=a|0;return c[a+8>>2]|0}function tp(b){b=b|0;return a[b+9|0]|0}function up(a){a=a|0;return c[a+12>>2]|0}function vp(a,b){a=a|0;b=b|0;var c=0;c=i;si(a,b+12|0);i=c;return}function wp(a,b){a=a|0;b=b|0;var c=0;c=i;si(a,b+16|0);i=c;return}function xp(a,b){a=a|0;b=b|0;b=i;ti(a,12176,4);i=b;return}function yp(a,b){a=a|0;b=b|0;b=i;Fi(a,12184,rq(12184)|0);i=b;return}function zp(a,b){a=a|0;b=b|0;b=i;ti(a,12208,5);i=b;return}function Ap(a,b){a=a|0;b=b|0;b=i;Fi(a,12216,rq(12216)|0);i=b;return}function Bp(b){b=b|0;var d=0;b=i;if((a[12248]|0)!=0){d=c[3060]|0;i=b;return d|0}if((Ia(12248)|0)==0){d=c[3060]|0;i=b;return d|0}if((a[19448]|0)==0?(Ia(19448)|0)!=0:0){wr(19280,0,168)|0;Fc(148,0,p|0)|0;nb(19448)}xi(19280,19456)|0;xi(19292|0,19464)|0;xi(19304|0,19472)|0;xi(19316|0,19480)|0;xi(19328|0,19496)|0;xi(19340|0,19512)|0;xi(19352|0,19520)|0;xi(19364|0,19536)|0;xi(19376|0,19544)|0;xi(19388|0,19552)|0;xi(19400|0,19560)|0;xi(19412|0,19568)|0;xi(19424|0,19576)|0;xi(19436|0,19584)|0;c[3060]=19280;nb(12248);d=c[3060]|0;i=b;return d|0}function Cp(b){b=b|0;var d=0;b=i;if((a[12264]|0)!=0){d=c[3064]|0;i=b;return d|0}if((Ia(12264)|0)==0){d=c[3064]|0;i=b;return d|0}if((a[18912]|0)==0?(Ia(18912)|0)!=0:0){wr(18744,0,168)|0;Fc(149,0,p|0)|0;nb(18912)}Ii(18744,18920)|0;Ii(18756|0,18952)|0;Ii(18768|0,18984)|0;Ii(18780|0,19016)|0;Ii(18792|0,19056)|0;Ii(18804|0,19096)|0;Ii(18816|0,19128)|0;Ii(18828|0,19168)|0;Ii(18840|0,19184)|0;Ii(18852|0,19200)|0;Ii(18864|0,19216)|0;Ii(18876|0,19232)|0;Ii(18888|0,19248)|0;Ii(18900|0,19264)|0;c[3064]=18744;nb(12264);d=c[3064]|0;i=b;return d|0}function Dp(b){b=b|0;var d=0;b=i;if((a[12280]|0)!=0){d=c[3068]|0;i=b;return d|0}if((Ia(12280)|0)==0){d=c[3068]|0;i=b;return d|0}if((a[18520]|0)==0?(Ia(18520)|0)!=0:0){wr(18232,0,288)|0;Fc(150,0,p|0)|0;nb(18520)}xi(18232,18528)|0;xi(18244|0,18536)|0;xi(18256|0,18552)|0;xi(18268|0,18560)|0;xi(18280|0,18568)|0;xi(18292|0,18576)|0;xi(18304|0,18584)|0;xi(18316|0,18592)|0;xi(18328|0,18600)|0;xi(18340|0,18616)|0;xi(18352|0,18624)|0;xi(18364|0,18640)|0;xi(18376|0,18656)|0;xi(18388|0,18664)|0;xi(18400|0,18672)|0;xi(18412|0,18680)|0;xi(18424|0,18568)|0;xi(18436|0,18688)|0;xi(18448|0,18696)|0;xi(18460|0,18704)|0;xi(18472|0,18712)|0;xi(18484|0,18720)|0;xi(18496|0,18728)|0;xi(18508|0,18736)|0;c[3068]=18232;nb(12280);d=c[3068]|0;i=b;return d|0}function Ep(b){b=b|0;var d=0;b=i;if((a[12296]|0)!=0){d=c[3072]|0;i=b;return d|0}if((Ia(12296)|0)==0){d=c[3072]|0;i=b;return d|0}if((a[17680]|0)==0?(Ia(17680)|0)!=0:0){wr(17392,0,288)|0;Fc(151,0,p|0)|0;nb(17680)}Ii(17392,17688)|0;Ii(17404|0,17720)|0;Ii(17416|0,17760)|0;Ii(17428|0,17784)|0;Ii(17440|0,18104)|0;Ii(17452|0,17808)|0;Ii(17464|0,17832)|0;Ii(17476|0,17856)|0;Ii(17488|0,17888)|0;Ii(17500|0,17928)|0;Ii(17512|0,17960)|0;Ii(17524|0,18e3)|0;Ii(17536|0,18040)|0;Ii(17548|0,18056)|0;Ii(17560|0,18072)|0;Ii(17572|0,18088)|0;Ii(17584|0,18104)|0;Ii(17596|0,18120)|0;Ii(17608|0,18136)|0;Ii(17620|0,18152)|0;Ii(17632|0,18168)|0;Ii(17644|0,18184)|0;Ii(17656|0,18200)|0;Ii(17668|0,18216)|0;c[3072]=17392;nb(12296);d=c[3072]|0;i=b;return d|0}function Fp(b){b=b|0;var d=0;b=i;if((a[12312]|0)!=0){d=c[3076]|0;i=b;return d|0}if((Ia(12312)|0)==0){d=c[3076]|0;i=b;return d|0}if((a[17368]|0)==0?(Ia(17368)|0)!=0:0){wr(17080,0,288)|0;Fc(152,0,p|0)|0;nb(17368)}xi(17080,17376)|0;xi(17092|0,17384)|0;c[3076]=17080;nb(12312);d=c[3076]|0;i=b;return d|0}function Gp(b){b=b|0;var d=0;b=i;if((a[12328]|0)!=0){d=c[3080]|0;i=b;return d|0}if((Ia(12328)|0)==0){d=c[3080]|0;i=b;return d|0}if((a[17040]|0)==0?(Ia(17040)|0)!=0:0){wr(16752,0,288)|0;Fc(153,0,p|0)|0;nb(17040)}Ii(16752,17048)|0;Ii(16764|0,17064)|0;c[3080]=16752;nb(12328);d=c[3080]|0;i=b;return d|0}function Hp(b){b=b|0;b=i;if((a[12352]|0)==0?(Ia(12352)|0)!=0:0){ti(12336,12360,8);Fc(154,12336,p|0)|0;nb(12352)}i=b;return 12336}function Ip(b){b=b|0;b=i;if((a[12392]|0)!=0){i=b;return 12376}if((Ia(12392)|0)==0){i=b;return 12376}Fi(12376,12400,rq(12400)|0);Fc(155,12376,p|0)|0;nb(12392);i=b;return 12376}function Jp(b){b=b|0;b=i;if((a[12456]|0)==0?(Ia(12456)|0)!=0:0){ti(12440,12464,8);Fc(154,12440,p|0)|0;nb(12456)}i=b;return 12440}function Kp(b){b=b|0;b=i;if((a[12496]|0)!=0){i=b;return 12480}if((Ia(12496)|0)==0){i=b;return 12480}Fi(12480,12504,rq(12504)|0);Fc(155,12480,p|0)|0;nb(12496);i=b;return 12480}function Lp(b){b=b|0;b=i;if((a[12560]|0)==0?(Ia(12560)|0)!=0:0){ti(12544,12568,20);Fc(154,12544,p|0)|0;nb(12560)}i=b;return 12544}function Mp(b){b=b|0;b=i;if((a[12608]|0)!=0){i=b;return 12592}if((Ia(12608)|0)==0){i=b;return 12592}Fi(12592,12616,rq(12616)|0);Fc(155,12592,p|0)|0;nb(12608);i=b;return 12592}function Np(b){b=b|0;b=i;if((a[12720]|0)==0?(Ia(12720)|0)!=0:0){ti(12704,12728,11);Fc(154,12704,p|0)|0;nb(12720)}i=b;return 12704}function Op(b){b=b|0;b=i;if((a[12760]|0)!=0){i=b;return 12744}if((Ia(12760)|0)==0){i=b;return 12744}Fi(12744,12768,rq(12768)|0);Fc(155,12744,p|0)|0;nb(12760);i=b;return 12744}function Pp(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0,k=0.0;f=i;i=i+16|0;g=f;if((b|0)==(d|0)){c[e>>2]=4;k=0.0;i=f;return+k}j=xc()|0;h=c[j>>2]|0;c[j>>2]=0;if((a[11832]|0)==0?(Ia(11832)|0)!=0:0){c[2956]=rb(2147483647,11840,0)|0;nb(11832)}k=+lr(b,g,c[2956]|0);b=c[j>>2]|0;if((b|0)==0){c[j>>2]=h}if((c[g>>2]|0)!=(d|0)){c[e>>2]=4;k=0.0;i=f;return+k}if((b|0)!=34){i=f;return+k}c[e>>2]=4;i=f;return+k}function Qp(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0,k=0.0;f=i;i=i+16|0;g=f;if((b|0)==(d|0)){c[e>>2]=4;k=0.0;i=f;return+k}j=xc()|0;h=c[j>>2]|0;c[j>>2]=0;if((a[11832]|0)==0?(Ia(11832)|0)!=0:0){c[2956]=rb(2147483647,11840,0)|0;nb(11832)}k=+lr(b,g,c[2956]|0);b=c[j>>2]|0;if((b|0)==0){c[j>>2]=h}if((c[g>>2]|0)!=(d|0)){c[e>>2]=4;k=0.0;i=f;return+k}if((b|0)!=34){i=f;return+k}c[e>>2]=4;i=f;return+k}function Rp(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0,k=0.0;f=i;i=i+16|0;g=f;if((b|0)==(d|0)){c[e>>2]=4;k=0.0;i=f;return+k}j=xc()|0;h=c[j>>2]|0;c[j>>2]=0;if((a[11832]|0)==0?(Ia(11832)|0)!=0:0){c[2956]=rb(2147483647,11840,0)|0;nb(11832)}k=+lr(b,g,c[2956]|0);b=c[j>>2]|0;if((b|0)==0){c[j>>2]=h}if((c[g>>2]|0)!=(d|0)){c[e>>2]=4;k=0.0;i=f;return+k}if((b|0)==34){c[e>>2]=4}i=f;return+k}function Sp(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0;g=i;i=i+16|0;h=g;do{if((b|0)!=(d|0)){if((a[b]|0)==45){c[e>>2]=4;e=0;b=0;break}k=xc()|0;j=c[k>>2]|0;c[k>>2]=0;if((a[11832]|0)==0?(Ia(11832)|0)!=0:0){c[2956]=rb(2147483647,11840,0)|0;nb(11832)}b=Ab(b|0,h|0,f|0,c[2956]|0)|0;f=c[k>>2]|0;if((f|0)==0){c[k>>2]=j}if((c[h>>2]|0)!=(d|0)){c[e>>2]=4;e=0;b=0;break}if((f|0)==34){c[e>>2]=4;e=-1;b=-1}else{e=I}}else{c[e>>2]=4;e=0;b=0}}while(0);I=e;i=g;return b|0}function Tp(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0;h=i;i=i+16|0;g=h;if((b|0)==(d|0)){c[e>>2]=4;l=0;i=h;return l|0}if((a[b]|0)==45){c[e>>2]=4;l=0;i=h;return l|0}k=xc()|0;j=c[k>>2]|0;c[k>>2]=0;if((a[11832]|0)==0?(Ia(11832)|0)!=0:0){c[2956]=rb(2147483647,11840,0)|0;nb(11832)}f=Ab(b|0,g|0,f|0,c[2956]|0)|0;b=I;l=c[k>>2]|0;if((l|0)==0){c[k>>2]=j}if((c[g>>2]|0)!=(d|0)){c[e>>2]=4;l=0;i=h;return l|0}if((l|0)==34|(b>>>0>0|(b|0)==0&f>>>0>4294967295)){c[e>>2]=4;l=-1;i=h;return l|0}else{l=f;i=h;return l|0}return 0}function Up(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0;h=i;i=i+16|0;g=h;if((b|0)==(d|0)){c[e>>2]=4;l=0;i=h;return l|0}if((a[b]|0)==45){c[e>>2]=4;l=0;i=h;return l|0}k=xc()|0;j=c[k>>2]|0;c[k>>2]=0;if((a[11832]|0)==0?(Ia(11832)|0)!=0:0){c[2956]=rb(2147483647,11840,0)|0;nb(11832)}f=Ab(b|0,g|0,f|0,c[2956]|0)|0;b=I;l=c[k>>2]|0;if((l|0)==0){c[k>>2]=j}if((c[g>>2]|0)!=(d|0)){c[e>>2]=4;l=0;i=h;return l|0}if((l|0)==34|(b>>>0>0|(b|0)==0&f>>>0>4294967295)){c[e>>2]=4;l=-1;i=h;return l|0}else{l=f;i=h;return l|0}return 0}function Vp(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0;h=i;i=i+16|0;g=h;if((b|0)==(d|0)){c[e>>2]=4;l=0;i=h;return l|0}if((a[b]|0)==45){c[e>>2]=4;l=0;i=h;return l|0}k=xc()|0;j=c[k>>2]|0;c[k>>2]=0;if((a[11832]|0)==0?(Ia(11832)|0)!=0:0){c[2956]=rb(2147483647,11840,0)|0;nb(11832)}f=Ab(b|0,g|0,f|0,c[2956]|0)|0;b=I;l=c[k>>2]|0;if((l|0)==0){c[k>>2]=j}if((c[g>>2]|0)!=(d|0)){c[e>>2]=4;l=0;i=h;return l|0}if((l|0)==34|(b>>>0>0|(b|0)==0&f>>>0>65535)){c[e>>2]=4;l=-1;i=h;return l|0}else{l=f&65535;i=h;return l|0}return 0}function Wp(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0;g=i;i=i+16|0;j=g;if((b|0)==(d|0)){c[e>>2]=4;b=0;l=0;I=b;i=g;return l|0}k=xc()|0;h=c[k>>2]|0;c[k>>2]=0;if((a[11832]|0)==0?(Ia(11832)|0)!=0:0){c[2956]=rb(2147483647,11840,0)|0;nb(11832)}b=db(b|0,j|0,f|0,c[2956]|0)|0;f=I;l=c[k>>2]|0;if((l|0)==0){c[k>>2]=h}if((c[j>>2]|0)!=(d|0)){c[e>>2]=4;b=0;l=0;I=b;i=g;return l|0}if((l|0)==34){c[e>>2]=4;h=(f|0)>0|(f|0)==0&b>>>0>0;I=h?2147483647:-2147483648;i=g;return(h?-1:0)|0}else{l=b;I=f;i=g;return l|0}return 0}function Xp(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0;h=i;i=i+16|0;g=h;if((b|0)==(d|0)){c[e>>2]=4;l=0;i=h;return l|0}k=xc()|0;j=c[k>>2]|0;c[k>>2]=0;if((a[11832]|0)==0?(Ia(11832)|0)!=0:0){c[2956]=rb(2147483647,11840,0)|0;nb(11832)}b=db(b|0,g|0,f|0,c[2956]|0)|0;l=I;f=c[k>>2]|0;if((f|0)==0){c[k>>2]=j}if((c[g>>2]|0)!=(d|0)){c[e>>2]=4;l=0;i=h;return l|0}do{if((f|0)==34){c[e>>2]=4;if((l|0)>0|(l|0)==0&b>>>0>0){l=2147483647;i=h;return l|0}}else{if((l|0)<-1|(l|0)==-1&b>>>0<2147483648){c[e>>2]=4;break}if((l|0)>0|(l|0)==0&b>>>0>2147483647){c[e>>2]=4;l=2147483647;i=h;return l|0}else{l=b;i=h;return l|0}}}while(0);l=-2147483648;i=h;return l|0}function Yp(a){a=a|0;var b=0,e=0,f=0;b=i;f=a+4|0;e=d[f]|d[f+1|0]<<8|d[f+2|0]<<16|d[f+3|0]<<24;f=f+4|0;f=d[f]|d[f+1|0]<<8|d[f+2|0]<<16|d[f+3|0]<<24;a=(c[a>>2]|0)+(f>>1)|0;if((f&1|0)==0){f=e;Lc[f&255](a);i=b;return}else{f=c[(c[a>>2]|0)+e>>2]|0;Lc[f&255](a);i=b;return}}function Zp(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0;f=i;g=b+8|0;e=b+4|0;h=c[e>>2]|0;m=c[g>>2]|0;j=h;if(!(m-j>>2>>>0<d>>>0)){do{if((h|0)==0){g=0}else{c[h>>2]=0;g=c[e>>2]|0}h=g+4|0;c[e>>2]=h;d=d+ -1|0}while((d|0)!=0);i=f;return}h=b+16|0;n=c[b>>2]|0;j=j-n>>2;l=j+d|0;if(l>>>0>1073741823){Sn(0)}m=m-n|0;if(m>>2>>>0<536870911){m=m>>1;l=m>>>0<l>>>0?l:m;if((l|0)!=0){m=b+128|0;if((a[m]|0)==0&l>>>0<29){a[m]=1;m=h}else{m=l;k=11}}else{l=0;m=0}}else{m=1073741823;k=11}if((k|0)==11){l=m;m=Wq(m<<2)|0}k=m+(j<<2)|0;do{if((k|0)==0){k=0}else{c[k>>2]=0}k=k+4|0;d=d+ -1|0}while((d|0)!=0);d=c[b>>2]|0;o=(c[e>>2]|0)-d|0;n=m+(j-(o>>2)<<2)|0;ur(n|0,d|0,o|0)|0;c[b>>2]=n;c[e>>2]=k;c[g>>2]=m+(l<<2);if((d|0)==0){i=f;return}if((h|0)==(d|0)){a[b+128|0]=0;i=f;return}else{Yq(d);i=f;return}}function _p(a){a=a|0;a=i;Hi(17028|0);Hi(17016|0);Hi(17004|0);Hi(16992|0);Hi(16980|0);Hi(16968|0);Hi(16956|0);Hi(16944|0);Hi(16932|0);Hi(16920|0);Hi(16908|0);Hi(16896|0);Hi(16884|0);Hi(16872|0);Hi(16860|0);Hi(16848|0);Hi(16836|0);Hi(16824|0);Hi(16812|0);Hi(16800|0);Hi(16788|0);Hi(16776|0);Hi(16764|0);Hi(16752);i=a;return}function $p(a){a=a|0;a=i;vi(17356|0);vi(17344|0);vi(17332|0);vi(17320|0);vi(17308|0);vi(17296|0);vi(17284|0);vi(17272|0);vi(17260|0);vi(17248|0);vi(17236|0);vi(17224|0);vi(17212|0);vi(17200|0);vi(17188|0);vi(17176|0);vi(17164|0);vi(17152|0);vi(17140|0);vi(17128|0);vi(17116|0);vi(17104|0);vi(17092|0);vi(17080);i=a;return}function aq(a){a=a|0;a=i;Hi(17668|0);Hi(17656|0);Hi(17644|0);Hi(17632|0);Hi(17620|0);Hi(17608|0);Hi(17596|0);Hi(17584|0);Hi(17572|0);Hi(17560|0);Hi(17548|0);Hi(17536|0);Hi(17524|0);Hi(17512|0);Hi(17500|0);Hi(17488|0);Hi(17476|0);Hi(17464|0);Hi(17452|0);Hi(17440|0);Hi(17428|0);Hi(17416|0);Hi(17404|0);Hi(17392);i=a;return}function bq(a){a=a|0;a=i;vi(18508|0);vi(18496|0);vi(18484|0);vi(18472|0);vi(18460|0);vi(18448|0);vi(18436|0);vi(18424|0);vi(18412|0);vi(18400|0);vi(18388|0);vi(18376|0);vi(18364|0);vi(18352|0);vi(18340|0);vi(18328|0);vi(18316|0);vi(18304|0);vi(18292|0);vi(18280|0);vi(18268|0);vi(18256|0);vi(18244|0);vi(18232);i=a;return}function cq(a){a=a|0;a=i;Hi(18900|0);Hi(18888|0);Hi(18876|0);Hi(18864|0);Hi(18852|0);Hi(18840|0);Hi(18828|0);Hi(18816|0);Hi(18804|0);Hi(18792|0);Hi(18780|0);Hi(18768|0);Hi(18756|0);Hi(18744);i=a;return}function dq(a){a=a|0;a=i;vi(19436|0);vi(19424|0);vi(19412|0);vi(19400|0);vi(19388|0);vi(19376|0);vi(19364|0);vi(19352|0);vi(19340|0);vi(19328|0);vi(19316|0);vi(19304|0);vi(19292|0);vi(19280);i=a;return}function eq(a,b,c){a=a|0;b=b|0;c=c|0;var d=0;d=i;a=fq(0,a,b,(c|0)!=0?c:19800)|0;i=d;return a|0}function fq(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0;g=i;i=i+16|0;h=g;c[h>>2]=b;f=(f|0)==0?19808:f;j=c[f>>2]|0;a:do{if((d|0)==0){if((j|0)==0){k=0;i=g;return k|0}}else{if((b|0)==0){c[h>>2]=h}else{h=b}if((e|0)==0){k=-2;i=g;return k|0}do{if((j|0)==0){b=a[d]|0;j=b&255;if(b<<24>>24>-1){c[h>>2]=j;k=b<<24>>24!=0|0;i=g;return k|0}else{j=j+ -194|0;if(j>>>0>50){break a}b=e+ -1|0;j=c[19592+(j<<2)>>2]|0;d=d+1|0;break}}else{b=e}}while(0);b:do{if((b|0)!=0){k=a[d]|0;l=(k&255)>>>3;if((l+ -16|l+(j>>26))>>>0>7){break a}while(1){d=d+1|0;j=(k&255)+ -128|j<<6;b=b+ -1|0;if((j|0)>=0){break}if((b|0)==0){break b}k=a[d]|0;if(((k&255)+ -128|0)>>>0>63){break a}}c[f>>2]=0;c[h>>2]=j;l=e-b|0;i=g;return l|0}}while(0);c[f>>2]=j;l=-2;i=g;return l|0}}while(0);c[f>>2]=0;c[(xc()|0)>>2]=84;l=-1;i=g;return l|0}function gq(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0;j=i;i=i+1040|0;k=j+8|0;h=j;m=c[b>>2]|0;c[h>>2]=m;g=(a|0)!=0;e=g?e:256;l=g?a:k;a:do{if((m|0)==0|(e|0)==0){k=d;a=0}else{a=0;while(1){n=d>>>2;o=n>>>0>=e>>>0;if(!(o|d>>>0>131)){k=d;break a}m=o?e:n;d=d-m|0;m=hq(l,h,m,f)|0;if((m|0)==-1){break}if((l|0)==(k|0)){l=k}else{e=e-m|0;l=l+(m<<2)|0}a=m+a|0;m=c[h>>2]|0;if((m|0)==0|(e|0)==0){k=d;break a}}k=d;e=0;m=c[h>>2]|0;a=-1}}while(0);b:do{if((m|0)!=0?!((e|0)==0|(k|0)==0):0){while(1){d=fq(l,m,k,f)|0;if((d+2|0)>>>0<3){break}m=(c[h>>2]|0)+d|0;c[h>>2]=m;e=e+ -1|0;a=a+1|0;if((e|0)==0|(k|0)==(d|0)){break b}else{k=k-d|0;l=l+4|0}}if((d|0)==-1){a=-1;break}else if((d|0)==0){c[h>>2]=0;break}else{c[f>>2]=0;break}}}while(0);if(!g){i=j;return a|0}c[b>>2]=c[h>>2];i=j;return a|0}function hq(b,e,f,g){b=b|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0;h=i;k=c[e>>2]|0;if((g|0)!=0?(l=c[g>>2]|0,(l|0)!=0):0){if((b|0)==0){j=f;g=16}else{c[g>>2]=0;j=f;g=36}}else{if((b|0)==0){j=f;g=7}else{j=f;g=6}}a:while(1){if((g|0)==6){if((j|0)==0){g=53;break}while(1){m=a[k]|0;do{if(((m&255)+ -1|0)>>>0<127?(k&3|0)==0&j>>>0>3:0){while(1){l=c[k>>2]|0;if(((l+ -16843009|l)&-2139062144|0)!=0){g=30;break}c[b>>2]=l&255;c[b+4>>2]=d[k+1|0]|0;c[b+8>>2]=d[k+2|0]|0;l=k+4|0;m=b+16|0;c[b+12>>2]=d[k+3|0]|0;j=j+ -4|0;if(j>>>0>3){b=m;k=l}else{g=31;break}}if((g|0)==30){m=l&255;break}else if((g|0)==31){b=m;m=a[l]|0;k=l;break}}}while(0);g=m&255;if(!((g+ -1|0)>>>0<127)){break}c[b>>2]=g;j=j+ -1|0;if((j|0)==0){g=53;break a}else{b=b+4|0;k=k+1|0}}g=g+ -194|0;if(g>>>0>50){g=47;break}l=c[19592+(g<<2)>>2]|0;k=k+1|0;g=36;continue}else if((g|0)==7){g=a[k]|0;if(((g&255)+ -1|0)>>>0<127?(k&3|0)==0:0){g=c[k>>2]|0;if(((g+ -16843009|g)&-2139062144|0)==0){do{k=k+4|0;j=j+ -4|0;g=c[k>>2]|0}while(((g+ -16843009|g)&-2139062144|0)==0)}g=g&255}g=g&255;if((g+ -1|0)>>>0<127){j=j+ -1|0;k=k+1|0;g=7;continue}g=g+ -194|0;if(g>>>0>50){g=47;break}l=c[19592+(g<<2)>>2]|0;k=k+1|0;g=16;continue}else if((g|0)==16){m=(d[k]|0)>>>3;if((m+ -16|m+(l>>26))>>>0>7){g=17;break}g=k+1|0;if((l&33554432|0)!=0){if(((d[g]|0)+ -128|0)>>>0>63){g=20;break}g=k+2|0;if((l&524288|0)==0){k=g}else{if(((d[g]|0)+ -128|0)>>>0>63){g=23;break}k=k+3|0}}else{k=g}j=j+ -1|0;g=7;continue}else if((g|0)==36){m=d[k]|0;g=m>>>3;if((g+ -16|g+(l>>26))>>>0>7){g=37;break}g=k+1|0;l=m+ -128|l<<6;if((l|0)<0){m=(d[g]|0)+ -128|0;if(m>>>0>63){g=40;break}g=k+2|0;l=m|l<<6;if((l|0)<0){g=(d[g]|0)+ -128|0;if(g>>>0>63){g=43;break}l=g|l<<6;k=k+3|0}else{k=g}}else{k=g}c[b>>2]=l;b=b+4|0;j=j+ -1|0;g=6;continue}}if((g|0)==17){k=k+ -1|0;g=46}else if((g|0)==20){k=k+ -1|0;g=46}else if((g|0)==23){k=k+ -1|0;g=46}else if((g|0)==37){k=k+ -1|0;g=46}else if((g|0)==40){k=k+ -1|0;g=46}else if((g|0)==43){k=k+ -1|0;g=46}else if((g|0)==53){i=h;return f|0}if((g|0)==46){if((l|0)==0){g=47}}if((g|0)==47){if((a[k]|0)==0){if((b|0)!=0){c[b>>2]=0;c[e>>2]=0}m=f-j|0;i=h;return m|0}}c[(xc()|0)>>2]=84;if((b|0)==0){m=-1;i=h;return m|0}c[e>>2]=k;m=-1;i=h;return m|0}function iq(b,e,f){b=b|0;e=e|0;f=f|0;var g=0,h=0,j=0;g=i;i=i+16|0;h=g;c[h>>2]=b;if((e|0)==0){j=0;i=g;return j|0}do{if((f|0)!=0){if((b|0)==0){c[h>>2]=h}else{h=b}b=a[e]|0;j=b&255;if(b<<24>>24>-1){c[h>>2]=j;j=b<<24>>24!=0|0;i=g;return j|0}j=j+ -194|0;if(!(j>>>0>50)){b=e+1|0;j=c[19592+(j<<2)>>2]|0;if(f>>>0<4?(j&-2147483648>>>((f*6|0)+ -6|0)|0)!=0:0){break}f=d[b]|0;b=f>>>3;if(!((b+ -16|b+(j>>26))>>>0>7)){f=f+ -128|j<<6;if((f|0)>=0){c[h>>2]=f;j=2;i=g;return j|0}b=(d[e+2|0]|0)+ -128|0;if(!(b>>>0>63)){f=b|f<<6;if((f|0)>=0){c[h>>2]=f;j=3;i=g;return j|0}e=(d[e+3|0]|0)+ -128|0;if(!(e>>>0>63)){c[h>>2]=e|f<<6;j=4;i=g;return j|0}}}}}}while(0);c[(xc()|0)>>2]=84;j=-1;i=g;return j|0}function jq(b,d,e){b=b|0;d=d|0;e=e|0;e=i;if((b|0)==0){b=1;i=e;return b|0}if(d>>>0<128){a[b]=d;b=1;i=e;return b|0}if(d>>>0<2048){a[b]=d>>>6|192;a[b+1|0]=d&63|128;b=2;i=e;return b|0}if(d>>>0<55296|(d+ -57344|0)>>>0<8192){a[b]=d>>>12|224;a[b+1|0]=d>>>6&63|128;a[b+2|0]=d&63|128;b=3;i=e;return b|0}if((d+ -65536|0)>>>0<1048576){a[b]=d>>>18|240;a[b+1|0]=d>>>12&63|128;a[b+2|0]=d>>>6&63|128;a[b+3|0]=d&63|128;b=4;i=e;return b|0}else{c[(xc()|0)>>2]=84;b=-1;i=e;return b|0}return 0}function kq(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0;h=i;i=i+272|0;j=h+8|0;f=h;l=c[b>>2]|0;c[f>>2]=l;g=(a|0)!=0;e=g?e:256;a=g?a:j;a:do{if((l|0)==0|(e|0)==0){j=d;k=0}else{k=0;while(1){m=d>>>0>=e>>>0;if(!(m|d>>>0>32)){j=d;break a}l=m?e:d;d=d-l|0;l=lq(a,f,l,0)|0;if((l|0)==-1){break}if((a|0)==(j|0)){a=j}else{e=e-l|0;a=a+l|0}k=l+k|0;l=c[f>>2]|0;if((l|0)==0|(e|0)==0){j=d;break a}}j=d;e=0;l=c[f>>2]|0;k=-1}}while(0);b:do{if((l|0)!=0?!((e|0)==0|(j|0)==0):0){while(1){d=jq(a,c[l>>2]|0,0)|0;if((d+1|0)>>>0<2){break}l=(c[f>>2]|0)+4|0;c[f>>2]=l;j=j+ -1|0;k=k+1|0;if((e|0)==(d|0)|(j|0)==0){break b}else{e=e-d|0;a=a+d|0}}if((d|0)==0){c[f>>2]=0}else{k=-1}}}while(0);if(!g){i=h;return k|0}c[b>>2]=c[f>>2];i=h;return k|0}function lq(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0;h=i;i=i+16|0;f=h;if((b|0)==0){k=c[d>>2]|0;l=c[k>>2]|0;if((l|0)==0){m=0;i=h;return m|0}else{j=0}while(1){if(l>>>0>127){l=jq(f,l,0)|0;if((l|0)==-1){j=-1;l=26;break}}else{l=1}j=l+j|0;k=k+4|0;l=c[k>>2]|0;if((l|0)==0){l=26;break}}if((l|0)==26){i=h;return j|0}}a:do{if(e>>>0>3){k=e;l=c[d>>2]|0;while(1){m=c[l>>2]|0;if((m|0)==0){break a}if(m>>>0>127){m=jq(b,m,0)|0;if((m|0)==-1){j=-1;break}b=b+m|0;k=k-m|0}else{a[b]=m;b=b+1|0;k=k+ -1|0;l=c[d>>2]|0}l=l+4|0;c[d>>2]=l;if(!(k>>>0>3)){break a}}i=h;return j|0}else{k=e}}while(0);b:do{if((k|0)!=0){l=c[d>>2]|0;while(1){m=c[l>>2]|0;if((m|0)==0){l=24;break}if(m>>>0>127){m=jq(f,m,0)|0;if((m|0)==-1){j=-1;l=26;break}if(m>>>0>k>>>0){l=20;break}jq(b,c[l>>2]|0,0)|0;b=b+m|0;k=k-m|0}else{a[b]=m;b=b+1|0;k=k+ -1|0;l=c[d>>2]|0}l=l+4|0;c[d>>2]=l;if((k|0)==0){g=0;break b}}if((l|0)==20){m=e-k|0;i=h;return m|0}else if((l|0)==24){a[b]=0;g=k;break}else if((l|0)==26){i=h;return j|0}}else{g=0}}while(0);c[d>>2]=0;m=e-g|0;i=h;return m|0}function mq(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0;f=i;a:do{if((c|0)==0){g=0}else{while(1){h=c>>>1;g=b+(ea(h,d)|0)|0;j=Yc[e&63](a,g)|0;if((j|0)==0){break a}if((c|0)==1){g=0;break a}j=(j|0)<0;c=j?h:c-h|0;if((c|0)==0){g=0;break}else{b=j?b:g}}}}while(0);i=f;return g|0}function nq(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0;h=i;i=i+944|0;m=h+680|0;l=h+424|0;j=h+192|0;f=h;q=ea(d,b)|0;if((q|0)==0){i=h;return}p=q-d|0;c[f+4>>2]=d;c[f>>2]=d;r=d;o=d;b=2;while(1){r=r+d+o|0;c[f+(b<<2)>>2]=r;if(r>>>0<q>>>0){D=o;o=r;b=b+1|0;r=D}else{break}}b=0-d|0;o=a+p|0;if((p|0)>0){s=(d|0)==0;p=d>>>0>256?256:d;r=(p|0)==(d|0);q=o;t=1;u=0;v=1;do{do{if((t&3|0)!=3){w=v+ -1|0;a:do{if((c[f+(w<<2)>>2]|0)>>>0<(q-a|0)>>>0){c[j>>2]=a;if((v|0)>1){y=v;C=a;B=a;D=1;while(1){A=C+b|0;z=y+ -2|0;C=C+(0-((c[f+(z<<2)>>2]|0)+d))|0;if((Yc[e&63](B,C)|0)>-1?(Yc[e&63](B,A)|0)>-1:0){x=D;break}x=D+1|0;B=j+(D<<2)|0;if((Yc[e&63](C,A)|0)>-1){c[B>>2]=C;A=C;y=y+ -1|0}else{c[B>>2]=A;y=z}if((y|0)<=1){break}C=A;B=c[j>>2]|0;D=x}if((x|0)>=2?(n=j+(x<<2)|0,c[n>>2]=m,!s):0){if((x|0)>0){y=d;A=m}else{x=c[j>>2]|0;ur(m|0,x|0,p|0)|0;if(r){break}else{z=d;y=p}while(1){z=z-y|0;y=z>>>0>256?256:z;ur(m|0,x|0,y|0)|0;if((z|0)==(y|0)){break a}}}while(1){z=y>>>0>256?256:y;B=c[j>>2]|0;ur(A|0,B|0,z|0)|0;C=0;while(1){D=C+1|0;A=c[j+(D<<2)>>2]|0;ur(B|0,A|0,z|0)|0;c[j+(C<<2)>>2]=B+z;if((D|0)==(x|0)){break}else{B=A;C=D}}if((y|0)==(z|0)){break a}y=y-z|0;A=c[n>>2]|0}}}}else{oq(a,d,e,t,u,v,0,f)}}while(0);if((v|0)==1){w=t<<1;u=t>>>31|u<<1;v=0;break}else{y=w>>>0>31;x=y?0:t;v=y?v+ -33|0:w;w=x<<v;u=x>>>(32-v|0)|(y?t:u)<<v;v=1;break}}else{c[j>>2]=a;b:do{if((v|0)>1){x=v;C=a;A=a;B=1;while(1){z=C+b|0;y=x+ -2|0;C=C+(0-((c[f+(y<<2)>>2]|0)+d))|0;if((Yc[e&63](A,C)|0)>-1?(Yc[e&63](A,z)|0)>-1:0){w=B;break}w=B+1|0;A=j+(B<<2)|0;if((Yc[e&63](C,z)|0)>-1){c[A>>2]=C;z=C;x=x+ -1|0}else{c[A>>2]=z;x=y}if((x|0)<=1){break}C=z;A=c[j>>2]|0;B=w}if((w|0)>=2?(k=j+(w<<2)|0,c[k>>2]=l,!s):0){if((w|0)>0){x=d;z=l}else{w=c[j>>2]|0;ur(l|0,w|0,p|0)|0;if(r){break}else{y=d;x=p}while(1){y=y-x|0;x=y>>>0>256?256:y;ur(l|0,w|0,x|0)|0;if((y|0)==(x|0)){break b}}}while(1){y=x>>>0>256?256:x;B=c[j>>2]|0;ur(z|0,B|0,y|0)|0;C=0;while(1){A=C+1|0;z=c[j+(A<<2)>>2]|0;ur(B|0,z|0,y|0)|0;c[j+(C<<2)>>2]=B+y;if((A|0)==(w|0)){break}else{B=z;C=A}}if((x|0)==(y|0)){break b}x=x-y|0;z=c[k>>2]|0}}}}while(0);w=t>>>2|u<<30;u=u>>>2;v=v+2|0}}while(0);t=w|1;a=a+d|0}while(a>>>0<o>>>0)}else{u=0;t=1;v=1}oq(a,d,e,t,u,v,0,f);while(1){if((v|0)==1){if((t|0)==1){if((u|0)==0){break}else{g=52}}}else{g=52}if((g|0)==52?(g=0,(v|0)>=2):0){B=t>>>30;D=v+ -2|0;A=(t<<1&2147483646|B<<31)^3;C=(B|u<<2)>>>1;oq(a+(0-((c[f+(D<<2)>>2]|0)+d))|0,d,e,A,C,v+ -1|0,1,f);B=C<<1|B&1;A=A<<1|1;C=a+b|0;oq(C,d,e,A,B,D,1,f);t=A;u=B;a=C;v=D;continue}j=t+ -1|0;if((j|0)!=0){if((j&1|0)==0){k=0;do{k=k+1|0;j=j>>>1}while((j&1|0)==0);if((k|0)==0){g=57}}else{g=57}if((g|0)==57){g=0;if((u|0)!=0){if((u&1|0)==0){k=u;j=0;do{j=j+1|0;k=k>>>1}while((k&1|0)==0)}else{j=0}}else{j=32}k=(j|0)==0?0:j+32|0}if(k>>>0>31){g=62}else{j=k}}else{k=32;g=62}if((g|0)==62){g=0;j=k+ -32|0;t=u;u=0}t=u<<32-j|t>>>j;u=u>>>j;a=a+b|0;v=k+v|0}i=h;return}function oq(a,b,d,e,f,g,h,j){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0;k=i;i=i+752|0;m=k+232|0;l=k+488|0;p=k;c[p>>2]=a;o=0-b|0;a:do{if((e|0)==1&(f|0)==0){s=1;r=18}else{t=a;v=a;u=1;while(1){a=t+(0-(c[j+(g<<2)>>2]|0))|0;if((Yc[d&63](a,v)|0)<1){a=t;s=u;r=18;break a}if((h|0)==0&(g|0)>1){s=c[j+(g+ -2<<2)>>2]|0;if((Yc[d&63](t+o|0,a)|0)>-1){a=t;s=u;break a}if((Yc[d&63](t+(0-(s+b))|0,a)|0)>-1){a=t;s=u;break a}}s=u+1|0;c[p+(u<<2)>>2]=a;t=e+ -1|0;if((t|0)!=0){if((t&1|0)==0){h=0;do{h=h+1|0;t=t>>>1}while((t&1|0)==0);if((h|0)==0){r=10}}else{r=10}if((r|0)==10){r=0;if((f|0)!=0){if((f&1|0)==0){t=f;h=0;do{h=h+1|0;t=t>>>1}while((t&1|0)==0)}else{h=0}}else{h=32}h=(h|0)==0?0:h+32|0}if(h>>>0>31){r=15}else{t=h}}else{h=32;r=15}if((r|0)==15){r=0;t=h+ -32|0;e=f;f=0}e=f<<32-t|e>>>t;f=f>>>t;g=h+g|0;if((e|0)==1&(f|0)==0){break a}t=a;h=0;v=c[p>>2]|0;u=s}}}while(0);if((r|0)==18){if((h|0)!=0){i=k;return}}b:do{if((s|0)>=2?(q=p+(s<<2)|0,c[q>>2]=m,(b|0)!=0):0){if((s|0)>0){e=b;f=m}else{r=b>>>0>256?256:b;p=c[p>>2]|0;ur(m|0,p|0,r|0)|0;if((r|0)==(b|0)){break}else{q=b}while(1){q=q-r|0;r=q>>>0>256?256:q;ur(m|0,p|0,r|0)|0;if((q|0)==(r|0)){break b}}}while(1){r=e>>>0>256?256:e;u=c[p>>2]|0;ur(f|0,u|0,r|0)|0;t=0;while(1){h=t+1|0;f=c[p+(h<<2)>>2]|0;ur(u|0,f|0,r|0)|0;c[p+(t<<2)>>2]=u+r;if((h|0)==(s|0)){break}else{u=f;t=h}}if((e|0)==(r|0)){break b}e=e-r|0;f=c[q>>2]|0}}}while(0);c[m>>2]=a;c:do{if((g|0)>1){e=a;s=a;f=1;while(1){r=e+o|0;q=g+ -2|0;a=e+(0-((c[j+(q<<2)>>2]|0)+b))|0;if((Yc[d&63](s,a)|0)>-1?(Yc[d&63](s,r)|0)>-1:0){p=f;break}p=f+1|0;s=m+(f<<2)|0;if((Yc[d&63](a,r)|0)>-1){c[s>>2]=a;r=a;g=g+ -1|0}else{c[s>>2]=r;g=q}if((g|0)<=1){break}e=r;s=c[m>>2]|0;f=p}if((p|0)>=2?(n=m+(p<<2)|0,c[n>>2]=l,(b|0)!=0):0){if((p|0)>0){j=l}else{n=b>>>0>256?256:b;m=c[m>>2]|0;ur(l|0,m|0,n|0)|0;if((n|0)==(b|0)){break}while(1){b=b-n|0;n=b>>>0>256?256:b;ur(l|0,m|0,n|0)|0;if((b|0)==(n|0)){break c}}}while(1){d=b>>>0>256?256:b;o=c[m>>2]|0;ur(j|0,o|0,d|0)|0;q=0;while(1){j=q+1|0;r=c[m+(j<<2)>>2]|0;ur(o|0,r|0,d|0)|0;c[m+(q<<2)>>2]=o+d;if((j|0)==(p|0)){break}else{o=r;q=j}}if((b|0)==(d|0)){break c}b=b-d|0;j=c[n>>2]|0}}}}while(0);i=k;return}function pq(a){a=a|0;var b=0,c=0,d=0;b=i;d=(rr(a|0)|0)+1|0;c=Rq(d)|0;if((c|0)==0){d=0;i=b;return d|0}ur(c|0,a|0,d|0)|0;d=c;i=b;return d|0}function qq(b,c,d){b=b|0;c=c|0;d=d|0;var e=0,f=0,g=0,h=0;e=i;f=b+(rr(b|0)|0)|0;a:do{if((d|0)!=0){while(1){h=a[c]|0;if(h<<24>>24==0){break a}d=d+ -1|0;g=f+1|0;a[f]=h;if((d|0)==0){f=g;break}else{c=c+1|0;f=g}}}}while(0);a[f]=0;i=e;return b|0}function rq(a){a=a|0;var b=0,d=0;b=i;d=a;while(1){if((c[d>>2]|0)==0){break}else{d=d+4|0}}i=b;return d-a>>2|0}function sq(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0;e=i;if((d|0)==0){i=e;return a|0}else{f=a}while(1){d=d+ -1|0;c[f>>2]=c[b>>2];if((d|0)==0){break}else{b=b+4|0;f=f+4|0}}i=e;return a|0}function tq(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0;e=i;f=(d|0)==0;if(a-b>>2>>>0<d>>>0){if(!f){do{d=d+ -1|0;c[a+(d<<2)>>2]=c[b+(d<<2)>>2]}while((d|0)!=0)}}else{if(!f){f=a;while(1){d=d+ -1|0;c[f>>2]=c[b>>2];if((d|0)==0){break}else{b=b+4|0;f=f+4|0}}}}i=e;return a|0}function uq(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0;e=i;if((d|0)!=0){f=a;while(1){d=d+ -1|0;c[f>>2]=b;if((d|0)==0){break}else{f=f+4|0}}}i=e;return a|0}function vq(a){a=a|0;return}function wq(a){a=a|0;c[a>>2]=19824;return}function xq(a){a=a|0;var b=0;b=i;bb(a|0);Yq(a);i=b;return}function yq(a){a=a|0;var b=0;b=i;bb(a|0);i=b;return}function zq(a){a=a|0;return 19840}function Aq(a){a=a|0;return}function Bq(a){a=a|0;return}function Cq(a){a=a|0;return}function Dq(a){a=a|0;var b=0;b=i;Yq(a);i=b;return}function Eq(a){a=a|0;var b=0;b=i;Yq(a);i=b;return}function Fq(a){a=a|0;var b=0;b=i;Yq(a);i=b;return}function Gq(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0,h=0;e=i;i=i+64|0;f=e;if((a|0)==(b|0)){h=1;i=e;return h|0}if((b|0)==0){h=0;i=e;return h|0}b=Kq(b,19952,20008,0)|0;if((b|0)==0){h=0;i=e;return h|0}h=f+0|0;g=h+56|0;do{c[h>>2]=0;h=h+4|0}while((h|0)<(g|0));c[f>>2]=b;c[f+8>>2]=a;c[f+12>>2]=-1;c[f+48>>2]=1;_c[c[(c[b>>2]|0)+28>>2]&15](b,f,c[d>>2]|0,1);if((c[f+24>>2]|0)!=1){h=0;i=e;return h|0}c[d>>2]=c[f+16>>2];h=1;i=e;return h|0}function Hq(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0;g=i;if((c[d+8>>2]|0)!=(b|0)){i=g;return}b=d+16|0;h=c[b>>2]|0;if((h|0)==0){c[b>>2]=e;c[d+24>>2]=f;c[d+36>>2]=1;i=g;return}if((h|0)!=(e|0)){h=d+36|0;c[h>>2]=(c[h>>2]|0)+1;c[d+24>>2]=2;a[d+54|0]=1;i=g;return}e=d+24|0;if((c[e>>2]|0)!=2){i=g;return}c[e>>2]=f;i=g;return}function Iq(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0;g=i;if((b|0)!=(c[d+8>>2]|0)){h=c[b+8>>2]|0;_c[c[(c[h>>2]|0)+28>>2]&15](h,d,e,f);i=g;return}b=d+16|0;h=c[b>>2]|0;if((h|0)==0){c[b>>2]=e;c[d+24>>2]=f;c[d+36>>2]=1;i=g;return}if((h|0)!=(e|0)){h=d+36|0;c[h>>2]=(c[h>>2]|0)+1;c[d+24>>2]=2;a[d+54|0]=1;i=g;return}e=d+24|0;if((c[e>>2]|0)!=2){i=g;return}c[e>>2]=f;i=g;return}function Jq(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0;g=i;if((b|0)==(c[d+8>>2]|0)){j=d+16|0;h=c[j>>2]|0;if((h|0)==0){c[j>>2]=e;c[d+24>>2]=f;c[d+36>>2]=1;i=g;return}if((h|0)!=(e|0)){l=d+36|0;c[l>>2]=(c[l>>2]|0)+1;c[d+24>>2]=2;a[d+54|0]=1;i=g;return}e=d+24|0;if((c[e>>2]|0)!=2){i=g;return}c[e>>2]=f;i=g;return}k=c[b+12>>2]|0;h=b+(k<<3)+16|0;j=c[b+20>>2]|0;l=j>>8;if((j&1|0)!=0){l=c[(c[e>>2]|0)+l>>2]|0}m=c[b+16>>2]|0;_c[c[(c[m>>2]|0)+28>>2]&15](m,d,e+l|0,(j&2|0)!=0?f:2);if((k|0)<=1){i=g;return}j=d+54|0;b=b+24|0;while(1){k=c[b+4>>2]|0;l=k>>8;if((k&1|0)!=0){l=c[(c[e>>2]|0)+l>>2]|0}m=c[b>>2]|0;_c[c[(c[m>>2]|0)+28>>2]&15](m,d,e+l|0,(k&2|0)!=0?f:2);if((a[j]|0)!=0){f=16;break}b=b+8|0;if(!(b>>>0<h>>>0)){f=16;break}}if((f|0)==16){i=g;return}}function Kq(d,e,f,g){d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0;h=i;i=i+64|0;j=h;k=c[d>>2]|0;l=d+(c[k+ -8>>2]|0)|0;k=c[k+ -4>>2]|0;c[j>>2]=f;c[j+4>>2]=d;c[j+8>>2]=e;c[j+12>>2]=g;n=j+16|0;o=j+20|0;e=j+24|0;m=j+28|0;g=j+32|0;d=j+40|0;p=(k|0)==(f|0);q=n+0|0;f=q+36|0;do{c[q>>2]=0;q=q+4|0}while((q|0)<(f|0));b[n+36>>1]=0;a[n+38|0]=0;if(p){c[j+48>>2]=1;Xc[c[(c[k>>2]|0)+20>>2]&31](k,j,l,l,1,0);q=(c[e>>2]|0)==1?l:0;i=h;return q|0}Kc[c[(c[k>>2]|0)+24>>2]&3](k,j,l,1,0);j=c[j+36>>2]|0;if((j|0)==1){if((c[e>>2]|0)!=1){if((c[d>>2]|0)!=0){q=0;i=h;return q|0}if((c[m>>2]|0)!=1){q=0;i=h;return q|0}if((c[g>>2]|0)!=1){q=0;i=h;return q|0}}q=c[n>>2]|0;i=h;return q|0}else if((j|0)==0){if((c[d>>2]|0)!=1){q=0;i=h;return q|0}if((c[m>>2]|0)!=1){q=0;i=h;return q|0}q=(c[g>>2]|0)==1?c[o>>2]|0:0;i=h;return q|0}else{q=0;i=h;return q|0}return 0}function Lq(b,d,e,f,g){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0;h=i;if((b|0)==(c[d+8>>2]|0)){if((c[d+4>>2]|0)!=(e|0)){i=h;return}d=d+28|0;if((c[d>>2]|0)==1){i=h;return}c[d>>2]=f;i=h;return}if((b|0)==(c[d>>2]|0)){if((c[d+16>>2]|0)!=(e|0)?(m=d+20|0,(c[m>>2]|0)!=(e|0)):0){c[d+32>>2]=f;k=d+44|0;if((c[k>>2]|0)==4){i=h;return}w=c[b+12>>2]|0;q=b+(w<<3)+16|0;a:do{if((w|0)>0){s=d+52|0;t=d+53|0;o=d+54|0;n=b+8|0;r=d+24|0;u=0;p=0;b=b+16|0;b:do{a[s]=0;a[t]=0;v=c[b+4>>2]|0;w=v>>8;if((v&1|0)!=0){w=c[(c[e>>2]|0)+w>>2]|0}x=c[b>>2]|0;Xc[c[(c[x>>2]|0)+20>>2]&31](x,d,e,e+w|0,2-(v>>>1&1)|0,g);if((a[o]|0)!=0){break}do{if((a[t]|0)!=0){if((a[s]|0)==0){if((c[n>>2]&1|0)==0){p=1;break b}else{p=1;break}}if((c[r>>2]|0)==1){n=27;break a}if((c[n>>2]&2|0)==0){n=27;break a}else{u=1;p=1}}}while(0);b=b+8|0}while(b>>>0<q>>>0);if(u){l=p;n=26}else{j=p;n=23}}else{j=0;n=23}}while(0);if((n|0)==23){c[m>>2]=e;x=d+40|0;c[x>>2]=(c[x>>2]|0)+1;if((c[d+36>>2]|0)==1?(c[d+24>>2]|0)==2:0){a[d+54|0]=1;if(j){n=27}else{n=28}}else{l=j;n=26}}if((n|0)==26){if(l){n=27}else{n=28}}if((n|0)==27){c[k>>2]=3;i=h;return}else if((n|0)==28){c[k>>2]=4;i=h;return}}if((f|0)!=1){i=h;return}c[d+32>>2]=1;i=h;return}m=c[b+12>>2]|0;j=b+(m<<3)+16|0;l=c[b+20>>2]|0;n=l>>8;if((l&1|0)!=0){n=c[(c[e>>2]|0)+n>>2]|0}x=c[b+16>>2]|0;Kc[c[(c[x>>2]|0)+24>>2]&3](x,d,e+n|0,(l&2|0)!=0?f:2,g);l=b+24|0;if((m|0)<=1){i=h;return}m=c[b+8>>2]|0;if((m&2|0)==0?(k=d+36|0,(c[k>>2]|0)!=1):0){if((m&1|0)==0){m=d+54|0;n=l;while(1){if((a[m]|0)!=0){n=53;break}if((c[k>>2]|0)==1){n=53;break}b=c[n+4>>2]|0;o=b>>8;if((b&1|0)!=0){o=c[(c[e>>2]|0)+o>>2]|0}x=c[n>>2]|0;Kc[c[(c[x>>2]|0)+24>>2]&3](x,d,e+o|0,(b&2|0)!=0?f:2,g);n=n+8|0;if(!(n>>>0<j>>>0)){n=53;break}}if((n|0)==53){i=h;return}}m=d+24|0;n=d+54|0;o=l;while(1){if((a[n]|0)!=0){n=53;break}if((c[k>>2]|0)==1?(c[m>>2]|0)==1:0){n=53;break}b=c[o+4>>2]|0;p=b>>8;if((b&1|0)!=0){p=c[(c[e>>2]|0)+p>>2]|0}x=c[o>>2]|0;Kc[c[(c[x>>2]|0)+24>>2]&3](x,d,e+p|0,(b&2|0)!=0?f:2,g);o=o+8|0;if(!(o>>>0<j>>>0)){n=53;break}}if((n|0)==53){i=h;return}}k=d+54|0;while(1){if((a[k]|0)!=0){n=53;break}m=c[l+4>>2]|0;n=m>>8;if((m&1|0)!=0){n=c[(c[e>>2]|0)+n>>2]|0}x=c[l>>2]|0;Kc[c[(c[x>>2]|0)+24>>2]&3](x,d,e+n|0,(m&2|0)!=0?f:2,g);l=l+8|0;if(!(l>>>0<j>>>0)){n=53;break}}if((n|0)==53){i=h;return}}function Mq(b,d,e,f,g){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0;h=i;if((b|0)==(c[d+8>>2]|0)){if((c[d+4>>2]|0)!=(e|0)){i=h;return}j=d+28|0;if((c[j>>2]|0)==1){i=h;return}c[j>>2]=f;i=h;return}if((b|0)!=(c[d>>2]|0)){l=c[b+8>>2]|0;Kc[c[(c[l>>2]|0)+24>>2]&3](l,d,e,f,g);i=h;return}if((c[d+16>>2]|0)!=(e|0)?(k=d+20|0,(c[k>>2]|0)!=(e|0)):0){c[d+32>>2]=f;f=d+44|0;if((c[f>>2]|0)==4){i=h;return}l=d+52|0;a[l]=0;m=d+53|0;a[m]=0;b=c[b+8>>2]|0;Xc[c[(c[b>>2]|0)+20>>2]&31](b,d,e,e,1,g);if((a[m]|0)!=0){if((a[l]|0)==0){b=1;j=13}}else{b=0;j=13}do{if((j|0)==13){c[k>>2]=e;m=d+40|0;c[m>>2]=(c[m>>2]|0)+1;if((c[d+36>>2]|0)==1?(c[d+24>>2]|0)==2:0){a[d+54|0]=1;if(b){break}}else{j=16}if((j|0)==16?b:0){break}c[f>>2]=4;i=h;return}}while(0);c[f>>2]=3;i=h;return}if((f|0)!=1){i=h;return}c[d+32>>2]=1;i=h;return}function Nq(b,d,e,f,g){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0;g=i;if((c[d+8>>2]|0)==(b|0)){if((c[d+4>>2]|0)!=(e|0)){i=g;return}d=d+28|0;if((c[d>>2]|0)==1){i=g;return}c[d>>2]=f;i=g;return}if((c[d>>2]|0)!=(b|0)){i=g;return}if((c[d+16>>2]|0)!=(e|0)?(h=d+20|0,(c[h>>2]|0)!=(e|0)):0){c[d+32>>2]=f;c[h>>2]=e;b=d+40|0;c[b>>2]=(c[b>>2]|0)+1;if((c[d+36>>2]|0)==1?(c[d+24>>2]|0)==2:0){a[d+54|0]=1}c[d+44>>2]=4;i=g;return}if((f|0)!=1){i=g;return}c[d+32>>2]=1;i=g;return}function Oq(b,d,e,f,g,h){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0;j=i;if((b|0)!=(c[d+8>>2]|0)){m=d+52|0;l=a[m]|0;o=d+53|0;n=a[o]|0;p=c[b+12>>2]|0;k=b+(p<<3)+16|0;a[m]=0;a[o]=0;q=c[b+20>>2]|0;r=q>>8;if((q&1|0)!=0){r=c[(c[f>>2]|0)+r>>2]|0}t=c[b+16>>2]|0;Xc[c[(c[t>>2]|0)+20>>2]&31](t,d,e,f+r|0,(q&2|0)!=0?g:2,h);a:do{if((p|0)>1){q=d+24|0;p=b+8|0;r=d+54|0;b=b+24|0;do{if((a[r]|0)!=0){break a}if((a[m]|0)==0){if((a[o]|0)!=0?(c[p>>2]&1|0)==0:0){break a}}else{if((c[q>>2]|0)==1){break a}if((c[p>>2]&2|0)==0){break a}}a[m]=0;a[o]=0;s=c[b+4>>2]|0;t=s>>8;if((s&1|0)!=0){t=c[(c[f>>2]|0)+t>>2]|0}u=c[b>>2]|0;Xc[c[(c[u>>2]|0)+20>>2]&31](u,d,e,f+t|0,(s&2|0)!=0?g:2,h);b=b+8|0}while(b>>>0<k>>>0)}}while(0);a[m]=l;a[o]=n;i=j;return}a[d+53|0]=1;if((c[d+4>>2]|0)!=(f|0)){i=j;return}a[d+52|0]=1;h=d+16|0;k=c[h>>2]|0;if((k|0)==0){c[h>>2]=e;c[d+24>>2]=g;c[d+36>>2]=1;if(!((c[d+48>>2]|0)==1&(g|0)==1)){i=j;return}a[d+54|0]=1;i=j;return}if((k|0)!=(e|0)){u=d+36|0;c[u>>2]=(c[u>>2]|0)+1;a[d+54|0]=1;i=j;return}e=d+24|0;h=c[e>>2]|0;if((h|0)==2){c[e>>2]=g}else{g=h}if(!((c[d+48>>2]|0)==1&(g|0)==1)){i=j;return}a[d+54|0]=1;i=j;return}



function Ck(b,e,f,g,h,j,k){b=b|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0;e=i;i=i+240|0;o=e;p=e+204|0;m=e+192|0;q=e+188|0;n=e+176|0;y=e+16|0;c[m+0>>2]=0;c[m+4>>2]=0;c[m+8>>2]=0;Qi(q,h);h=c[q>>2]|0;if(!((c[2984]|0)==-1)){c[o>>2]=11936;c[o+4>>2]=144;c[o+8>>2]=0;qi(11936,o,145)}s=(c[11940>>2]|0)+ -1|0;r=c[h+8>>2]|0;if(!((c[h+12>>2]|0)-r>>2>>>0>s>>>0)){F=Nb(4)|0;wq(F);Ac(F|0,19896,130)}h=c[r+(s<<2)>>2]|0;if((h|0)==0){F=Nb(4)|0;wq(F);Ac(F|0,19896,130)}Vc[c[(c[h>>2]|0)+32>>2]&31](h,10480,10506|0,p)|0;Yh(c[q>>2]|0)|0;c[n+0>>2]=0;c[n+4>>2]=0;c[n+8>>2]=0;yi(n,10,0);if((a[n]&1)==0){A=n+1|0;w=A;x=n+8|0}else{A=n+8|0;w=n+1|0;x=A;A=c[A>>2]|0}u=n+4|0;v=p+24|0;t=p+25|0;s=y;q=p+26|0;r=p;h=m+4|0;C=c[f>>2]|0;z=0;B=A;a:while(1){if((C|0)!=0){if((c[C+12>>2]|0)==(c[C+16>>2]|0)?(Pc[c[(c[C>>2]|0)+36>>2]&127](C)|0)==-1:0){c[f>>2]=0;C=0}}else{C=0}E=(C|0)==0;D=c[g>>2]|0;do{if((D|0)!=0){if((c[D+12>>2]|0)!=(c[D+16>>2]|0)){if(E){break}else{break a}}if(!((Pc[c[(c[D>>2]|0)+36>>2]&127](D)|0)==-1)){if(E){break}else{break a}}else{c[g>>2]=0;l=19;break}}else{l=19}}while(0);if((l|0)==19?(l=0,E):0){break}D=a[n]|0;E=(D&1)==0;if(E){F=(D&255)>>>1}else{F=c[u>>2]|0}if((B-A|0)==(F|0)){if(E){A=(D&255)>>>1;B=(D&255)>>>1}else{B=c[u>>2]|0;A=B}yi(n,A<<1,0);if((a[n]&1)==0){A=10}else{A=(c[n>>2]&-2)+ -1|0}yi(n,A,0);if((a[n]&1)==0){A=w}else{A=c[x>>2]|0}B=A+B|0}D=c[C+12>>2]|0;if((D|0)==(c[C+16>>2]|0)){C=Pc[c[(c[C>>2]|0)+36>>2]&127](C)|0}else{C=d[D]|0}D=C&255;C=(B|0)==(A|0);do{if(C){E=(a[v]|0)==D<<24>>24;if(!E?!((a[t]|0)==D<<24>>24):0){l=40;break}a[B]=E?43:45;B=B+1|0;z=0}else{l=40}}while(0);do{if((l|0)==40){l=0;E=a[m]|0;if((E&1)==0){E=(E&255)>>>1}else{E=c[h>>2]|0}if((E|0)!=0&D<<24>>24==0){if((y-s|0)>=160){break}c[y>>2]=z;y=y+4|0;z=0;break}else{F=p}while(1){E=F+1|0;if((a[F]|0)==D<<24>>24){break}if((E|0)==(q|0)){F=q;break}else{F=E}}D=F-r|0;if((D|0)>23){break a}if((D|0)<22){a[B]=a[10480+D|0]|0;B=B+1|0;z=z+1|0;break}if(C){A=B;break a}if((B-A|0)>=3){break a}if((a[B+ -1|0]|0)!=48){break a}a[B]=a[10480+D|0]|0;B=B+1|0;z=0}}while(0);C=c[f>>2]|0;D=C+12|0;E=c[D>>2]|0;if((E|0)==(c[C+16>>2]|0)){Pc[c[(c[C>>2]|0)+40>>2]&127](C)|0;continue}else{c[D>>2]=E+1;continue}}a[A+3|0]=0;if((a[11832]|0)==0?(Ia(11832)|0)!=0:0){c[2956]=rb(2147483647,11840,0)|0;nb(11832)}F=c[2956]|0;c[o>>2]=k;if((Ek(A,F,10520,o)|0)!=1){c[j>>2]=4}k=c[f>>2]|0;if((k|0)!=0){if((c[k+12>>2]|0)==(c[k+16>>2]|0)?(Pc[c[(c[k>>2]|0)+36>>2]&127](k)|0)==-1:0){c[f>>2]=0;f=0}else{f=k}}else{f=0}k=(f|0)==0;o=c[g>>2]|0;do{if((o|0)!=0){if((c[o+12>>2]|0)!=(c[o+16>>2]|0)){if(!k){break}c[b>>2]=f;vi(n);vi(m);i=e;return}if((Pc[c[(c[o>>2]|0)+36>>2]&127](o)|0)==-1){c[g>>2]=0;l=72;break}if(k^(o|0)==0){c[b>>2]=f;vi(n);vi(m);i=e;return}}else{l=72}}while(0);if((l|0)==72?!k:0){c[b>>2]=f;vi(n);vi(m);i=e;return}c[j>>2]=c[j>>2]|2;c[b>>2]=f;vi(n);vi(m);i=e;return}function Dk(b,d,e,f,g,h,j,k,l,m){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;var n=0,o=0,p=0,q=0;n=i;p=c[f>>2]|0;o=(p|0)==(e|0);do{if(o){q=(a[m+24|0]|0)==b<<24>>24;if(!q?!((a[m+25|0]|0)==b<<24>>24):0){break}c[f>>2]=e+1;a[e]=q?43:45;c[g>>2]=0;q=0;i=n;return q|0}}while(0);q=a[j]|0;if((q&1)==0){j=(q&255)>>>1}else{j=c[j+4>>2]|0}if((j|0)!=0&b<<24>>24==h<<24>>24){o=c[l>>2]|0;if((o-k|0)>=160){q=0;i=n;return q|0}q=c[g>>2]|0;c[l>>2]=o+4;c[o>>2]=q;c[g>>2]=0;q=0;i=n;return q|0}l=m+26|0;k=m;while(1){h=k+1|0;if((a[k]|0)==b<<24>>24){break}if((h|0)==(l|0)){k=l;break}else{k=h}}m=k-m|0;if((m|0)>23){q=-1;i=n;return q|0}if((d|0)==10|(d|0)==8){if((m|0)>=(d|0)){q=-1;i=n;return q|0}}else if((d|0)==16?(m|0)>=22:0){if(o){q=-1;i=n;return q|0}if((p-e|0)>=3){q=-1;i=n;return q|0}if((a[p+ -1|0]|0)!=48){q=-1;i=n;return q|0}c[g>>2]=0;q=a[10480+m|0]|0;c[f>>2]=p+1;a[p]=q;q=0;i=n;return q|0}q=a[10480+m|0]|0;c[f>>2]=p+1;a[p]=q;c[g>>2]=(c[g>>2]|0)+1;q=0;i=n;return q|0}function Ek(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;var f=0,g=0;f=i;i=i+16|0;g=f;c[g>>2]=e;b=Sb(b|0)|0;d=Ga(a|0,d|0,g|0)|0;if((b|0)==0){i=f;return d|0}Sb(b|0)|0;i=f;return d|0}function Fk(a){a=a|0;var b=0;b=i;Yq(a);i=b;return}function Gk(a){a=a|0;return}function Hk(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0;k=i;i=i+80|0;l=k;s=k+64|0;q=k+60|0;r=k+56|0;u=k+52|0;t=k+48|0;p=k+44|0;m=k+40|0;n=k+16|0;o=k+12|0;if((c[g+4>>2]&1|0)==0){c[q>>2]=-1;p=c[(c[d>>2]|0)+16>>2]|0;c[u>>2]=c[e>>2];c[t>>2]=c[f>>2];c[s+0>>2]=c[u+0>>2];c[l+0>>2]=c[t+0>>2];Jc[p&63](r,d,s,l,g,h,q);l=c[r>>2]|0;c[e>>2]=l;e=c[q>>2]|0;if((e|0)==1){a[j]=1}else if((e|0)==0){a[j]=0}else{a[j]=1;c[h>>2]=4}c[b>>2]=l;i=k;return}Qi(p,g);q=c[p>>2]|0;if(!((c[2982]|0)==-1)){c[l>>2]=11928;c[l+4>>2]=144;c[l+8>>2]=0;qi(11928,l,145)}d=(c[11932>>2]|0)+ -1|0;r=c[q+8>>2]|0;if(!((c[q+12>>2]|0)-r>>2>>>0>d>>>0)){u=Nb(4)|0;wq(u);Ac(u|0,19896,130)}q=c[r+(d<<2)>>2]|0;if((q|0)==0){u=Nb(4)|0;wq(u);Ac(u|0,19896,130)}Yh(c[p>>2]|0)|0;Qi(m,g);g=c[m>>2]|0;if(!((c[3022]|0)==-1)){c[l>>2]=12088;c[l+4>>2]=144;c[l+8>>2]=0;qi(12088,l,145)}r=(c[12092>>2]|0)+ -1|0;p=c[g+8>>2]|0;if(!((c[g+12>>2]|0)-p>>2>>>0>r>>>0)){u=Nb(4)|0;wq(u);Ac(u|0,19896,130)}g=c[p+(r<<2)>>2]|0;if((g|0)==0){u=Nb(4)|0;wq(u);Ac(u|0,19896,130)}Yh(c[m>>2]|0)|0;Mc[c[(c[g>>2]|0)+24>>2]&63](n,g);Mc[c[(c[g>>2]|0)+28>>2]&63](n+12|0,g);c[o>>2]=c[f>>2];u=n+24|0;c[l+0>>2]=c[o+0>>2];a[j]=(Ik(e,l,n,u,q,h,1)|0)==(n|0)|0;c[b>>2]=c[e>>2];Hi(n+12|0);Hi(n);i=k;return}function Ik(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0;k=i;i=i+112|0;o=k;s=(f-e|0)/12|0;if(s>>>0>100){o=Rq(s)|0;if((o|0)==0){br()}else{m=o;n=o}}else{m=0;n=o}o=(e|0)==(f|0);if(o){t=0}else{p=e;t=0;q=n;while(1){r=a[p]|0;if((r&1)==0){r=(r&255)>>>1}else{r=c[p+4>>2]|0}if((r|0)==0){a[q]=2;t=t+1|0;s=s+ -1|0}else{a[q]=1}p=p+12|0;if((p|0)==(f|0)){break}else{q=q+1|0}}}p=0;a:while(1){r=c[b>>2]|0;do{if((r|0)!=0){q=c[r+12>>2]|0;if((q|0)==(c[r+16>>2]|0)){q=Pc[c[(c[r>>2]|0)+36>>2]&127](r)|0}else{q=c[q>>2]|0}if((q|0)==-1){c[b>>2]=0;r=1;break}else{r=(c[b>>2]|0)==0;break}}else{r=1}}while(0);q=c[d>>2]|0;if((q|0)!=0){u=c[q+12>>2]|0;if((u|0)==(c[q+16>>2]|0)){u=Pc[c[(c[q>>2]|0)+36>>2]&127](q)|0}else{u=c[u>>2]|0}if((u|0)==-1){c[d>>2]=0;q=0;v=1}else{v=0}}else{q=0;v=1}u=c[b>>2]|0;if(!((r^v)&(s|0)!=0)){break}q=c[u+12>>2]|0;if((q|0)==(c[u+16>>2]|0)){r=Pc[c[(c[u>>2]|0)+36>>2]&127](u)|0}else{r=c[q>>2]|0}if(!j){r=Yc[c[(c[g>>2]|0)+28>>2]&63](g,r)|0}q=p+1|0;if(o){p=q;continue}b:do{if(j){w=0;u=e;v=n;while(1){do{if((a[v]|0)==1){z=a[u]|0;y=(z&1)==0;if(y){x=u+4|0}else{x=c[u+8>>2]|0}if((r|0)!=(c[x+(p<<2)>>2]|0)){a[v]=0;s=s+ -1|0;break}if(y){w=(z&255)>>>1}else{w=c[u+4>>2]|0}if((w|0)==(q|0)){a[v]=2;w=1;t=t+1|0;s=s+ -1|0}else{w=1}}}while(0);u=u+12|0;if((u|0)==(f|0)){break b}v=v+1|0}}else{w=0;u=e;v=n;while(1){do{if((a[v]|0)==1){if((a[u]&1)==0){x=u+4|0}else{x=c[u+8>>2]|0}if((r|0)!=(Yc[c[(c[g>>2]|0)+28>>2]&63](g,c[x+(p<<2)>>2]|0)|0)){a[v]=0;s=s+ -1|0;break}w=a[u]|0;if((w&1)==0){w=(w&255)>>>1}else{w=c[u+4>>2]|0}if((w|0)==(q|0)){a[v]=2;w=1;t=t+1|0;s=s+ -1|0}else{w=1}}}while(0);u=u+12|0;if((u|0)==(f|0)){break b}v=v+1|0}}}while(0);if(!w){p=q;continue}p=c[b>>2]|0;r=p+12|0;u=c[r>>2]|0;if((u|0)==(c[p+16>>2]|0)){Pc[c[(c[p>>2]|0)+40>>2]&127](p)|0}else{c[r>>2]=u+4}if((s+t|0)>>>0<2){p=q;continue}else{r=e;p=n}while(1){if((a[p]|0)==2){u=a[r]|0;if((u&1)==0){u=(u&255)>>>1}else{u=c[r+4>>2]|0}if((u|0)!=(q|0)){a[p]=0;t=t+ -1|0}}r=r+12|0;if((r|0)==(f|0)){p=q;continue a}else{p=p+1|0}}}do{if((u|0)!=0){g=c[u+12>>2]|0;if((g|0)==(c[u+16>>2]|0)){g=Pc[c[(c[u>>2]|0)+36>>2]&127](u)|0}else{g=c[g>>2]|0}if((g|0)==-1){c[b>>2]=0;b=1;break}else{b=(c[b>>2]|0)==0;break}}else{b=1}}while(0);do{if((q|0)!=0){g=c[q+12>>2]|0;if((g|0)==(c[q+16>>2]|0)){g=Pc[c[(c[q>>2]|0)+36>>2]&127](q)|0}else{g=c[g>>2]|0}if(!((g|0)==-1)){if(b){break}else{l=87;break}}else{c[d>>2]=0;l=85;break}}else{l=85}}while(0);if((l|0)==85?b:0){l=87}if((l|0)==87){c[h>>2]=c[h>>2]|2}c:do{if(!o){if((a[n]|0)==2){f=e}else{while(1){e=e+12|0;n=n+1|0;if((e|0)==(f|0)){l=92;break c}if((a[n]|0)==2){f=e;break}}}}else{l=92}}while(0);if((l|0)==92){c[h>>2]=c[h>>2]|4}if((m|0)==0){i=k;return f|0}Sq(m);i=k;return f|0}function Jk(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0;b=i;i=i+16|0;j=b+12|0;k=b+8|0;m=b+4|0;l=b;c[m>>2]=c[d>>2];c[l>>2]=c[e>>2];c[k+0>>2]=c[m+0>>2];c[j+0>>2]=c[l+0>>2];Kk(a,0,k,j,f,g,h);i=b;return}function Kk(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0;m=i;i=i+304|0;t=m+200|0;u=m+196|0;d=m+184|0;l=m+172|0;p=m+168|0;q=m+8|0;o=m+4|0;r=m;s=c[g+4>>2]&74;if((s|0)==64){s=8}else if((s|0)==8){s=16}else if((s|0)==0){s=0}else{s=10}el(d,g,t,u);c[l+0>>2]=0;c[l+4>>2]=0;c[l+8>>2]=0;yi(l,10,0);if((a[l]&1)==0){z=l+1|0;w=z;v=l+8|0}else{z=l+8|0;w=l+1|0;v=z;z=c[z>>2]|0}c[p>>2]=z;c[o>>2]=q;c[r>>2]=0;g=l+4|0;x=c[u>>2]|0;u=c[e>>2]|0;a:while(1){if((u|0)!=0){y=c[u+12>>2]|0;if((y|0)==(c[u+16>>2]|0)){y=Pc[c[(c[u>>2]|0)+36>>2]&127](u)|0}else{y=c[y>>2]|0}if((y|0)==-1){c[e>>2]=0;A=1;u=0}else{A=0}}else{A=1;u=0}y=c[f>>2]|0;do{if((y|0)!=0){B=c[y+12>>2]|0;if((B|0)==(c[y+16>>2]|0)){B=Pc[c[(c[y>>2]|0)+36>>2]&127](y)|0}else{B=c[B>>2]|0}if(!((B|0)==-1)){if(A){break}else{break a}}else{c[f>>2]=0;k=21;break}}else{k=21}}while(0);if((k|0)==21){k=0;if(A){y=0;break}else{y=0}}A=a[l]|0;B=(A&1)==0;if(B){C=(A&255)>>>1}else{C=c[g>>2]|0}if(((c[p>>2]|0)-z|0)==(C|0)){if(B){z=(A&255)>>>1;A=(A&255)>>>1}else{A=c[g>>2]|0;z=A}yi(l,z<<1,0);if((a[l]&1)==0){z=10}else{z=(c[l>>2]&-2)+ -1|0}yi(l,z,0);if((a[l]&1)==0){z=w}else{z=c[v>>2]|0}c[p>>2]=z+A}B=u+12|0;C=c[B>>2]|0;A=u+16|0;if((C|0)==(c[A>>2]|0)){C=Pc[c[(c[u>>2]|0)+36>>2]&127](u)|0}else{C=c[C>>2]|0}if((al(C,s,z,p,r,x,d,q,o,t)|0)!=0){break}y=c[B>>2]|0;if((y|0)==(c[A>>2]|0)){Pc[c[(c[u>>2]|0)+40>>2]&127](u)|0;continue}else{c[B>>2]=y+4;continue}}t=a[d]|0;if((t&1)==0){t=(t&255)>>>1}else{t=c[d+4>>2]|0}if((t|0)!=0?(n=c[o>>2]|0,(n-q|0)<160):0){C=c[r>>2]|0;c[o>>2]=n+4;c[n>>2]=C}c[j>>2]=Xp(z,c[p>>2]|0,h,s)|0;nn(d,q,c[o>>2]|0,h);if((u|0)!=0){j=c[u+12>>2]|0;if((j|0)==(c[u+16>>2]|0)){j=Pc[c[(c[u>>2]|0)+36>>2]&127](u)|0}else{j=c[j>>2]|0}if((j|0)==-1){c[e>>2]=0;u=0;e=1}else{e=0}}else{u=0;e=1}do{if((y|0)!=0){j=c[y+12>>2]|0;if((j|0)==(c[y+16>>2]|0)){j=Pc[c[(c[y>>2]|0)+36>>2]&127](y)|0}else{j=c[j>>2]|0}if((j|0)==-1){c[f>>2]=0;k=60;break}if(e){c[b>>2]=u;vi(l);vi(d);i=m;return}}else{k=60}}while(0);if((k|0)==60?!e:0){c[b>>2]=u;vi(l);vi(d);i=m;return}c[h>>2]=c[h>>2]|2;c[b>>2]=u;vi(l);vi(d);i=m;return}function Lk(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0;b=i;i=i+16|0;j=b+12|0;k=b+8|0;m=b+4|0;l=b;c[m>>2]=c[d>>2];c[l>>2]=c[e>>2];c[k+0>>2]=c[m+0>>2];c[j+0>>2]=c[l+0>>2];Mk(a,0,k,j,f,g,h);i=b;return}function Mk(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0;m=i;i=i+304|0;t=m+200|0;u=m+196|0;d=m+184|0;l=m+172|0;p=m+168|0;q=m+8|0;o=m+4|0;r=m;s=c[g+4>>2]&74;if((s|0)==0){s=0}else if((s|0)==8){s=16}else if((s|0)==64){s=8}else{s=10}el(d,g,t,u);c[l+0>>2]=0;c[l+4>>2]=0;c[l+8>>2]=0;yi(l,10,0);if((a[l]&1)==0){z=l+1|0;w=z;v=l+8|0}else{z=l+8|0;w=l+1|0;v=z;z=c[z>>2]|0}c[p>>2]=z;c[o>>2]=q;c[r>>2]=0;g=l+4|0;x=c[u>>2]|0;u=c[e>>2]|0;a:while(1){if((u|0)!=0){y=c[u+12>>2]|0;if((y|0)==(c[u+16>>2]|0)){y=Pc[c[(c[u>>2]|0)+36>>2]&127](u)|0}else{y=c[y>>2]|0}if((y|0)==-1){c[e>>2]=0;A=1;u=0}else{A=0}}else{A=1;u=0}y=c[f>>2]|0;do{if((y|0)!=0){B=c[y+12>>2]|0;if((B|0)==(c[y+16>>2]|0)){B=Pc[c[(c[y>>2]|0)+36>>2]&127](y)|0}else{B=c[B>>2]|0}if(!((B|0)==-1)){if(A){break}else{break a}}else{c[f>>2]=0;k=21;break}}else{k=21}}while(0);if((k|0)==21){k=0;if(A){y=0;break}else{y=0}}A=a[l]|0;B=(A&1)==0;if(B){C=(A&255)>>>1}else{C=c[g>>2]|0}if(((c[p>>2]|0)-z|0)==(C|0)){if(B){z=(A&255)>>>1;A=(A&255)>>>1}else{A=c[g>>2]|0;z=A}yi(l,z<<1,0);if((a[l]&1)==0){z=10}else{z=(c[l>>2]&-2)+ -1|0}yi(l,z,0);if((a[l]&1)==0){z=w}else{z=c[v>>2]|0}c[p>>2]=z+A}B=u+12|0;C=c[B>>2]|0;A=u+16|0;if((C|0)==(c[A>>2]|0)){C=Pc[c[(c[u>>2]|0)+36>>2]&127](u)|0}else{C=c[C>>2]|0}if((al(C,s,z,p,r,x,d,q,o,t)|0)!=0){break}y=c[B>>2]|0;if((y|0)==(c[A>>2]|0)){Pc[c[(c[u>>2]|0)+40>>2]&127](u)|0;continue}else{c[B>>2]=y+4;continue}}t=a[d]|0;if((t&1)==0){t=(t&255)>>>1}else{t=c[d+4>>2]|0}if((t|0)!=0?(n=c[o>>2]|0,(n-q|0)<160):0){C=c[r>>2]|0;c[o>>2]=n+4;c[n>>2]=C}B=Wp(z,c[p>>2]|0,h,s)|0;C=j;c[C>>2]=B;c[C+4>>2]=I;nn(d,q,c[o>>2]|0,h);if((u|0)!=0){j=c[u+12>>2]|0;if((j|0)==(c[u+16>>2]|0)){j=Pc[c[(c[u>>2]|0)+36>>2]&127](u)|0}else{j=c[j>>2]|0}if((j|0)==-1){c[e>>2]=0;u=0;e=1}else{e=0}}else{u=0;e=1}do{if((y|0)!=0){j=c[y+12>>2]|0;if((j|0)==(c[y+16>>2]|0)){j=Pc[c[(c[y>>2]|0)+36>>2]&127](y)|0}else{j=c[j>>2]|0}if((j|0)==-1){c[f>>2]=0;k=60;break}if(e){c[b>>2]=u;vi(l);vi(d);i=m;return}}else{k=60}}while(0);if((k|0)==60?!e:0){c[b>>2]=u;vi(l);vi(d);i=m;return}c[h>>2]=c[h>>2]|2;c[b>>2]=u;vi(l);vi(d);i=m;return}function Nk(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0;b=i;i=i+16|0;j=b+12|0;k=b+8|0;m=b+4|0;l=b;c[m>>2]=c[d>>2];c[l>>2]=c[e>>2];c[k+0>>2]=c[m+0>>2];c[j+0>>2]=c[l+0>>2];Ok(a,0,k,j,f,g,h);i=b;return}function Ok(d,e,f,g,h,j,k){d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0;n=i;i=i+304|0;u=n+200|0;v=n+196|0;e=n+184|0;m=n+172|0;q=n+168|0;r=n+8|0;p=n+4|0;s=n;t=c[h+4>>2]&74;if((t|0)==0){t=0}else if((t|0)==64){t=8}else if((t|0)==8){t=16}else{t=10}el(e,h,u,v);c[m+0>>2]=0;c[m+4>>2]=0;c[m+8>>2]=0;yi(m,10,0);if((a[m]&1)==0){A=m+1|0;x=A;w=m+8|0}else{A=m+8|0;x=m+1|0;w=A;A=c[A>>2]|0}c[q>>2]=A;c[p>>2]=r;c[s>>2]=0;h=m+4|0;y=c[v>>2]|0;v=c[f>>2]|0;a:while(1){if((v|0)!=0){z=c[v+12>>2]|0;if((z|0)==(c[v+16>>2]|0)){z=Pc[c[(c[v>>2]|0)+36>>2]&127](v)|0}else{z=c[z>>2]|0}if((z|0)==-1){c[f>>2]=0;B=1;v=0}else{B=0}}else{B=1;v=0}z=c[g>>2]|0;do{if((z|0)!=0){C=c[z+12>>2]|0;if((C|0)==(c[z+16>>2]|0)){C=Pc[c[(c[z>>2]|0)+36>>2]&127](z)|0}else{C=c[C>>2]|0}if(!((C|0)==-1)){if(B){break}else{break a}}else{c[g>>2]=0;l=21;break}}else{l=21}}while(0);if((l|0)==21){l=0;if(B){z=0;break}else{z=0}}B=a[m]|0;C=(B&1)==0;if(C){D=(B&255)>>>1}else{D=c[h>>2]|0}if(((c[q>>2]|0)-A|0)==(D|0)){if(C){A=(B&255)>>>1;B=(B&255)>>>1}else{B=c[h>>2]|0;A=B}yi(m,A<<1,0);if((a[m]&1)==0){A=10}else{A=(c[m>>2]&-2)+ -1|0}yi(m,A,0);if((a[m]&1)==0){A=x}else{A=c[w>>2]|0}c[q>>2]=A+B}C=v+12|0;D=c[C>>2]|0;B=v+16|0;if((D|0)==(c[B>>2]|0)){D=Pc[c[(c[v>>2]|0)+36>>2]&127](v)|0}else{D=c[D>>2]|0}if((al(D,t,A,q,s,y,e,r,p,u)|0)!=0){break}z=c[C>>2]|0;if((z|0)==(c[B>>2]|0)){Pc[c[(c[v>>2]|0)+40>>2]&127](v)|0;continue}else{c[C>>2]=z+4;continue}}u=a[e]|0;if((u&1)==0){u=(u&255)>>>1}else{u=c[e+4>>2]|0}if((u|0)!=0?(o=c[p>>2]|0,(o-r|0)<160):0){D=c[s>>2]|0;c[p>>2]=o+4;c[o>>2]=D}b[k>>1]=Vp(A,c[q>>2]|0,j,t)|0;nn(e,r,c[p>>2]|0,j);if((v|0)!=0){k=c[v+12>>2]|0;if((k|0)==(c[v+16>>2]|0)){k=Pc[c[(c[v>>2]|0)+36>>2]&127](v)|0}else{k=c[k>>2]|0}if((k|0)==-1){c[f>>2]=0;v=0;f=1}else{f=0}}else{v=0;f=1}do{if((z|0)!=0){k=c[z+12>>2]|0;if((k|0)==(c[z+16>>2]|0)){k=Pc[c[(c[z>>2]|0)+36>>2]&127](z)|0}else{k=c[k>>2]|0}if((k|0)==-1){c[g>>2]=0;l=60;break}if(f){c[d>>2]=v;vi(m);vi(e);i=n;return}}else{l=60}}while(0);if((l|0)==60?!f:0){c[d>>2]=v;vi(m);vi(e);i=n;return}c[j>>2]=c[j>>2]|2;c[d>>2]=v;vi(m);vi(e);i=n;return}function Pk(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0;b=i;i=i+16|0;j=b+12|0;k=b+8|0;m=b+4|0;l=b;c[m>>2]=c[d>>2];c[l>>2]=c[e>>2];c[k+0>>2]=c[m+0>>2];c[j+0>>2]=c[l+0>>2];Qk(a,0,k,j,f,g,h);i=b;return}function Qk(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0;m=i;i=i+304|0;t=m+200|0;u=m+196|0;d=m+184|0;l=m+172|0;p=m+168|0;q=m+8|0;o=m+4|0;r=m;s=c[g+4>>2]&74;if((s|0)==8){s=16}else if((s|0)==64){s=8}else if((s|0)==0){s=0}else{s=10}el(d,g,t,u);c[l+0>>2]=0;c[l+4>>2]=0;c[l+8>>2]=0;yi(l,10,0);if((a[l]&1)==0){z=l+1|0;w=z;v=l+8|0}else{z=l+8|0;w=l+1|0;v=z;z=c[z>>2]|0}c[p>>2]=z;c[o>>2]=q;c[r>>2]=0;g=l+4|0;x=c[u>>2]|0;u=c[e>>2]|0;a:while(1){if((u|0)!=0){y=c[u+12>>2]|0;if((y|0)==(c[u+16>>2]|0)){y=Pc[c[(c[u>>2]|0)+36>>2]&127](u)|0}else{y=c[y>>2]|0}if((y|0)==-1){c[e>>2]=0;A=1;u=0}else{A=0}}else{A=1;u=0}y=c[f>>2]|0;do{if((y|0)!=0){B=c[y+12>>2]|0;if((B|0)==(c[y+16>>2]|0)){B=Pc[c[(c[y>>2]|0)+36>>2]&127](y)|0}else{B=c[B>>2]|0}if(!((B|0)==-1)){if(A){break}else{break a}}else{c[f>>2]=0;k=21;break}}else{k=21}}while(0);if((k|0)==21){k=0;if(A){y=0;break}else{y=0}}A=a[l]|0;B=(A&1)==0;if(B){C=(A&255)>>>1}else{C=c[g>>2]|0}if(((c[p>>2]|0)-z|0)==(C|0)){if(B){z=(A&255)>>>1;A=(A&255)>>>1}else{A=c[g>>2]|0;z=A}yi(l,z<<1,0);if((a[l]&1)==0){z=10}else{z=(c[l>>2]&-2)+ -1|0}yi(l,z,0);if((a[l]&1)==0){z=w}else{z=c[v>>2]|0}c[p>>2]=z+A}B=u+12|0;C=c[B>>2]|0;A=u+16|0;if((C|0)==(c[A>>2]|0)){C=Pc[c[(c[u>>2]|0)+36>>2]&127](u)|0}else{C=c[C>>2]|0}if((al(C,s,z,p,r,x,d,q,o,t)|0)!=0){break}y=c[B>>2]|0;if((y|0)==(c[A>>2]|0)){Pc[c[(c[u>>2]|0)+40>>2]&127](u)|0;continue}else{c[B>>2]=y+4;continue}}t=a[d]|0;if((t&1)==0){t=(t&255)>>>1}else{t=c[d+4>>2]|0}if((t|0)!=0?(n=c[o>>2]|0,(n-q|0)<160):0){C=c[r>>2]|0;c[o>>2]=n+4;c[n>>2]=C}c[j>>2]=Up(z,c[p>>2]|0,h,s)|0;nn(d,q,c[o>>2]|0,h);if((u|0)!=0){j=c[u+12>>2]|0;if((j|0)==(c[u+16>>2]|0)){j=Pc[c[(c[u>>2]|0)+36>>2]&127](u)|0}else{j=c[j>>2]|0}if((j|0)==-1){c[e>>2]=0;u=0;e=1}else{e=0}}else{u=0;e=1}do{if((y|0)!=0){j=c[y+12>>2]|0;if((j|0)==(c[y+16>>2]|0)){j=Pc[c[(c[y>>2]|0)+36>>2]&127](y)|0}else{j=c[j>>2]|0}if((j|0)==-1){c[f>>2]=0;k=60;break}if(e){c[b>>2]=u;vi(l);vi(d);i=m;return}}else{k=60}}while(0);if((k|0)==60?!e:0){c[b>>2]=u;vi(l);vi(d);i=m;return}c[h>>2]=c[h>>2]|2;c[b>>2]=u;vi(l);vi(d);i=m;return}function Rk(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0;b=i;i=i+16|0;j=b+12|0;k=b+8|0;m=b+4|0;l=b;c[m>>2]=c[d>>2];c[l>>2]=c[e>>2];c[k+0>>2]=c[m+0>>2];c[j+0>>2]=c[l+0>>2];Sk(a,0,k,j,f,g,h);i=b;return}function Sk(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0;m=i;i=i+304|0;t=m+200|0;u=m+196|0;d=m+184|0;l=m+172|0;p=m+168|0;q=m+8|0;o=m+4|0;r=m;s=c[g+4>>2]&74;if((s|0)==0){s=0}else if((s|0)==8){s=16}else if((s|0)==64){s=8}else{s=10}el(d,g,t,u);c[l+0>>2]=0;c[l+4>>2]=0;c[l+8>>2]=0;yi(l,10,0);if((a[l]&1)==0){z=l+1|0;w=z;v=l+8|0}else{z=l+8|0;w=l+1|0;v=z;z=c[z>>2]|0}c[p>>2]=z;c[o>>2]=q;c[r>>2]=0;g=l+4|0;x=c[u>>2]|0;u=c[e>>2]|0;a:while(1){if((u|0)!=0){y=c[u+12>>2]|0;if((y|0)==(c[u+16>>2]|0)){y=Pc[c[(c[u>>2]|0)+36>>2]&127](u)|0}else{y=c[y>>2]|0}if((y|0)==-1){c[e>>2]=0;A=1;u=0}else{A=0}}else{A=1;u=0}y=c[f>>2]|0;do{if((y|0)!=0){B=c[y+12>>2]|0;if((B|0)==(c[y+16>>2]|0)){B=Pc[c[(c[y>>2]|0)+36>>2]&127](y)|0}else{B=c[B>>2]|0}if(!((B|0)==-1)){if(A){break}else{break a}}else{c[f>>2]=0;k=21;break}}else{k=21}}while(0);if((k|0)==21){k=0;if(A){y=0;break}else{y=0}}A=a[l]|0;B=(A&1)==0;if(B){C=(A&255)>>>1}else{C=c[g>>2]|0}if(((c[p>>2]|0)-z|0)==(C|0)){if(B){z=(A&255)>>>1;A=(A&255)>>>1}else{A=c[g>>2]|0;z=A}yi(l,z<<1,0);if((a[l]&1)==0){z=10}else{z=(c[l>>2]&-2)+ -1|0}yi(l,z,0);if((a[l]&1)==0){z=w}else{z=c[v>>2]|0}c[p>>2]=z+A}B=u+12|0;C=c[B>>2]|0;A=u+16|0;if((C|0)==(c[A>>2]|0)){C=Pc[c[(c[u>>2]|0)+36>>2]&127](u)|0}else{C=c[C>>2]|0}if((al(C,s,z,p,r,x,d,q,o,t)|0)!=0){break}y=c[B>>2]|0;if((y|0)==(c[A>>2]|0)){Pc[c[(c[u>>2]|0)+40>>2]&127](u)|0;continue}else{c[B>>2]=y+4;continue}}t=a[d]|0;if((t&1)==0){t=(t&255)>>>1}else{t=c[d+4>>2]|0}if((t|0)!=0?(n=c[o>>2]|0,(n-q|0)<160):0){C=c[r>>2]|0;c[o>>2]=n+4;c[n>>2]=C}c[j>>2]=Tp(z,c[p>>2]|0,h,s)|0;nn(d,q,c[o>>2]|0,h);if((u|0)!=0){j=c[u+12>>2]|0;if((j|0)==(c[u+16>>2]|0)){j=Pc[c[(c[u>>2]|0)+36>>2]&127](u)|0}else{j=c[j>>2]|0}if((j|0)==-1){c[e>>2]=0;u=0;e=1}else{e=0}}else{u=0;e=1}do{if((y|0)!=0){j=c[y+12>>2]|0;if((j|0)==(c[y+16>>2]|0)){j=Pc[c[(c[y>>2]|0)+36>>2]&127](y)|0}else{j=c[j>>2]|0}if((j|0)==-1){c[f>>2]=0;k=60;break}if(e){c[b>>2]=u;vi(l);vi(d);i=m;return}}else{k=60}}while(0);if((k|0)==60?!e:0){c[b>>2]=u;vi(l);vi(d);i=m;return}c[h>>2]=c[h>>2]|2;c[b>>2]=u;vi(l);vi(d);i=m;return}function Tk(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0;b=i;i=i+16|0;j=b+12|0;k=b+8|0;m=b+4|0;l=b;c[m>>2]=c[d>>2];c[l>>2]=c[e>>2];c[k+0>>2]=c[m+0>>2];c[j+0>>2]=c[l+0>>2];Uk(a,0,k,j,f,g,h);i=b;return}function Uk(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0;m=i;i=i+304|0;t=m+200|0;u=m+196|0;d=m+184|0;l=m+172|0;p=m+168|0;q=m+8|0;o=m+4|0;r=m;s=c[g+4>>2]&74;if((s|0)==64){s=8}else if((s|0)==8){s=16}else if((s|0)==0){s=0}else{s=10}el(d,g,t,u);c[l+0>>2]=0;c[l+4>>2]=0;c[l+8>>2]=0;yi(l,10,0);if((a[l]&1)==0){z=l+1|0;w=z;v=l+8|0}else{z=l+8|0;w=l+1|0;v=z;z=c[z>>2]|0}c[p>>2]=z;c[o>>2]=q;c[r>>2]=0;g=l+4|0;x=c[u>>2]|0;u=c[e>>2]|0;a:while(1){if((u|0)!=0){y=c[u+12>>2]|0;if((y|0)==(c[u+16>>2]|0)){y=Pc[c[(c[u>>2]|0)+36>>2]&127](u)|0}else{y=c[y>>2]|0}if((y|0)==-1){c[e>>2]=0;A=1;u=0}else{A=0}}else{A=1;u=0}y=c[f>>2]|0;do{if((y|0)!=0){B=c[y+12>>2]|0;if((B|0)==(c[y+16>>2]|0)){B=Pc[c[(c[y>>2]|0)+36>>2]&127](y)|0}else{B=c[B>>2]|0}if(!((B|0)==-1)){if(A){break}else{break a}}else{c[f>>2]=0;k=21;break}}else{k=21}}while(0);if((k|0)==21){k=0;if(A){y=0;break}else{y=0}}A=a[l]|0;B=(A&1)==0;if(B){C=(A&255)>>>1}else{C=c[g>>2]|0}if(((c[p>>2]|0)-z|0)==(C|0)){if(B){z=(A&255)>>>1;A=(A&255)>>>1}else{A=c[g>>2]|0;z=A}yi(l,z<<1,0);if((a[l]&1)==0){z=10}else{z=(c[l>>2]&-2)+ -1|0}yi(l,z,0);if((a[l]&1)==0){z=w}else{z=c[v>>2]|0}c[p>>2]=z+A}B=u+12|0;C=c[B>>2]|0;A=u+16|0;if((C|0)==(c[A>>2]|0)){C=Pc[c[(c[u>>2]|0)+36>>2]&127](u)|0}else{C=c[C>>2]|0}if((al(C,s,z,p,r,x,d,q,o,t)|0)!=0){break}y=c[B>>2]|0;if((y|0)==(c[A>>2]|0)){Pc[c[(c[u>>2]|0)+40>>2]&127](u)|0;continue}else{c[B>>2]=y+4;continue}}t=a[d]|0;if((t&1)==0){t=(t&255)>>>1}else{t=c[d+4>>2]|0}if((t|0)!=0?(n=c[o>>2]|0,(n-q|0)<160):0){C=c[r>>2]|0;c[o>>2]=n+4;c[n>>2]=C}B=Sp(z,c[p>>2]|0,h,s)|0;C=j;c[C>>2]=B;c[C+4>>2]=I;nn(d,q,c[o>>2]|0,h);if((u|0)!=0){j=c[u+12>>2]|0;if((j|0)==(c[u+16>>2]|0)){j=Pc[c[(c[u>>2]|0)+36>>2]&127](u)|0}else{j=c[j>>2]|0}if((j|0)==-1){c[e>>2]=0;u=0;e=1}else{e=0}}else{u=0;e=1}do{if((y|0)!=0){j=c[y+12>>2]|0;if((j|0)==(c[y+16>>2]|0)){j=Pc[c[(c[y>>2]|0)+36>>2]&127](y)|0}else{j=c[j>>2]|0}if((j|0)==-1){c[f>>2]=0;k=60;break}if(e){c[b>>2]=u;vi(l);vi(d);i=m;return}}else{k=60}}while(0);if((k|0)==60?!e:0){c[b>>2]=u;vi(l);vi(d);i=m;return}c[h>>2]=c[h>>2]|2;c[b>>2]=u;vi(l);vi(d);i=m;return}function Vk(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0;b=i;i=i+16|0;j=b+12|0;k=b+8|0;m=b+4|0;l=b;c[m>>2]=c[d>>2];c[l>>2]=c[e>>2];c[k+0>>2]=c[m+0>>2];c[j+0>>2]=c[l+0>>2];Wk(a,0,k,j,f,g,h);i=b;return}function Wk(b,d,e,f,h,j,k){b=b|0;d=d|0;e=e|0;f=f|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0;d=i;i=i+352|0;u=d+208|0;z=d+200|0;w=d+196|0;m=d+184|0;n=d+172|0;q=d+168|0;p=d+8|0;t=d+4|0;s=d;r=d+337|0;v=d+336|0;fl(m,h,u,z,w);c[n+0>>2]=0;c[n+4>>2]=0;c[n+8>>2]=0;yi(n,10,0);if((a[n]&1)==0){C=n+1|0;h=C;x=n+8|0}else{C=n+8|0;h=n+1|0;x=C;C=c[C>>2]|0}c[q>>2]=C;c[t>>2]=p;c[s>>2]=0;a[r]=1;a[v]=69;y=n+4|0;z=c[z>>2]|0;A=c[w>>2]|0;w=c[e>>2]|0;a:while(1){if((w|0)!=0){B=c[w+12>>2]|0;if((B|0)==(c[w+16>>2]|0)){B=Pc[c[(c[w>>2]|0)+36>>2]&127](w)|0}else{B=c[B>>2]|0}if((B|0)==-1){c[e>>2]=0;D=1;w=0}else{D=0}}else{D=1;w=0}B=c[f>>2]|0;do{if((B|0)!=0){E=c[B+12>>2]|0;if((E|0)==(c[B+16>>2]|0)){E=Pc[c[(c[B>>2]|0)+36>>2]&127](B)|0}else{E=c[E>>2]|0}if(!((E|0)==-1)){if(D){break}else{break a}}else{c[f>>2]=0;l=17;break}}else{l=17}}while(0);if((l|0)==17){l=0;if(D){B=0;break}else{B=0}}D=a[n]|0;F=(D&1)==0;if(F){E=(D&255)>>>1}else{E=c[y>>2]|0}if(((c[q>>2]|0)-C|0)==(E|0)){if(F){C=(D&255)>>>1;D=(D&255)>>>1}else{D=c[y>>2]|0;C=D}yi(n,C<<1,0);if((a[n]&1)==0){C=10}else{C=(c[n>>2]&-2)+ -1|0}yi(n,C,0);if((a[n]&1)==0){C=h}else{C=c[x>>2]|0}c[q>>2]=C+D}D=w+12|0;F=c[D>>2]|0;E=w+16|0;if((F|0)==(c[E>>2]|0)){F=Pc[c[(c[w>>2]|0)+36>>2]&127](w)|0}else{F=c[F>>2]|0}if((gl(F,r,v,C,q,z,A,m,p,t,s,u)|0)!=0){break}B=c[D>>2]|0;if((B|0)==(c[E>>2]|0)){Pc[c[(c[w>>2]|0)+40>>2]&127](w)|0;continue}else{c[D>>2]=B+4;continue}}u=a[m]|0;if((u&1)==0){u=(u&255)>>>1}else{u=c[m+4>>2]|0}if(((u|0)!=0?(a[r]|0)!=0:0)?(o=c[t>>2]|0,(o-p|0)<160):0){F=c[s>>2]|0;c[t>>2]=o+4;c[o>>2]=F}g[k>>2]=+Rp(C,c[q>>2]|0,j);nn(m,p,c[t>>2]|0,j);if((w|0)!=0){o=c[w+12>>2]|0;if((o|0)==(c[w+16>>2]|0)){o=Pc[c[(c[w>>2]|0)+36>>2]&127](w)|0}else{o=c[o>>2]|0}if((o|0)==-1){c[e>>2]=0;w=0;e=1}else{e=0}}else{w=0;e=1}do{if((B|0)!=0){o=c[B+12>>2]|0;if((o|0)==(c[B+16>>2]|0)){o=Pc[c[(c[B>>2]|0)+36>>2]&127](B)|0}else{o=c[o>>2]|0}if((o|0)==-1){c[f>>2]=0;l=57;break}if(e){c[b>>2]=w;vi(n);vi(m);i=d;return}}else{l=57}}while(0);if((l|0)==57?!e:0){c[b>>2]=w;vi(n);vi(m);i=d;return}c[j>>2]=c[j>>2]|2;c[b>>2]=w;vi(n);vi(m);i=d;return}function Xk(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0;b=i;i=i+16|0;j=b+12|0;k=b+8|0;m=b+4|0;l=b;c[m>>2]=c[d>>2];c[l>>2]=c[e>>2];c[k+0>>2]=c[m+0>>2];c[j+0>>2]=c[l+0>>2];Yk(a,0,k,j,f,g,h);i=b;return}function Yk(b,d,e,f,g,j,k){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0;d=i;i=i+352|0;u=d+208|0;z=d+200|0;w=d+196|0;m=d+184|0;n=d+172|0;q=d+168|0;p=d+8|0;t=d+4|0;s=d;r=d+337|0;v=d+336|0;fl(m,g,u,z,w);c[n+0>>2]=0;c[n+4>>2]=0;c[n+8>>2]=0;yi(n,10,0);if((a[n]&1)==0){C=n+1|0;g=C;x=n+8|0}else{C=n+8|0;g=n+1|0;x=C;C=c[C>>2]|0}c[q>>2]=C;c[t>>2]=p;c[s>>2]=0;a[r]=1;a[v]=69;y=n+4|0;z=c[z>>2]|0;A=c[w>>2]|0;w=c[e>>2]|0;a:while(1){if((w|0)!=0){B=c[w+12>>2]|0;if((B|0)==(c[w+16>>2]|0)){B=Pc[c[(c[w>>2]|0)+36>>2]&127](w)|0}else{B=c[B>>2]|0}if((B|0)==-1){c[e>>2]=0;D=1;w=0}else{D=0}}else{D=1;w=0}B=c[f>>2]|0;do{if((B|0)!=0){E=c[B+12>>2]|0;if((E|0)==(c[B+16>>2]|0)){E=Pc[c[(c[B>>2]|0)+36>>2]&127](B)|0}else{E=c[E>>2]|0}if(!((E|0)==-1)){if(D){break}else{break a}}else{c[f>>2]=0;l=17;break}}else{l=17}}while(0);if((l|0)==17){l=0;if(D){B=0;break}else{B=0}}D=a[n]|0;F=(D&1)==0;if(F){E=(D&255)>>>1}else{E=c[y>>2]|0}if(((c[q>>2]|0)-C|0)==(E|0)){if(F){C=(D&255)>>>1;D=(D&255)>>>1}else{D=c[y>>2]|0;C=D}yi(n,C<<1,0);if((a[n]&1)==0){C=10}else{C=(c[n>>2]&-2)+ -1|0}yi(n,C,0);if((a[n]&1)==0){C=g}else{C=c[x>>2]|0}c[q>>2]=C+D}D=w+12|0;F=c[D>>2]|0;E=w+16|0;if((F|0)==(c[E>>2]|0)){F=Pc[c[(c[w>>2]|0)+36>>2]&127](w)|0}else{F=c[F>>2]|0}if((gl(F,r,v,C,q,z,A,m,p,t,s,u)|0)!=0){break}B=c[D>>2]|0;if((B|0)==(c[E>>2]|0)){Pc[c[(c[w>>2]|0)+40>>2]&127](w)|0;continue}else{c[D>>2]=B+4;continue}}u=a[m]|0;if((u&1)==0){u=(u&255)>>>1}else{u=c[m+4>>2]|0}if(((u|0)!=0?(a[r]|0)!=0:0)?(o=c[t>>2]|0,(o-p|0)<160):0){F=c[s>>2]|0;c[t>>2]=o+4;c[o>>2]=F}h[k>>3]=+Qp(C,c[q>>2]|0,j);nn(m,p,c[t>>2]|0,j);if((w|0)!=0){o=c[w+12>>2]|0;if((o|0)==(c[w+16>>2]|0)){o=Pc[c[(c[w>>2]|0)+36>>2]&127](w)|0}else{o=c[o>>2]|0}if((o|0)==-1){c[e>>2]=0;w=0;e=1}else{e=0}}else{w=0;e=1}do{if((B|0)!=0){o=c[B+12>>2]|0;if((o|0)==(c[B+16>>2]|0)){o=Pc[c[(c[B>>2]|0)+36>>2]&127](B)|0}else{o=c[o>>2]|0}if((o|0)==-1){c[f>>2]=0;l=57;break}if(e){c[b>>2]=w;vi(n);vi(m);i=d;return}}else{l=57}}while(0);if((l|0)==57?!e:0){c[b>>2]=w;vi(n);vi(m);i=d;return}c[j>>2]=c[j>>2]|2;c[b>>2]=w;vi(n);vi(m);i=d;return}function Zk(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0;b=i;i=i+16|0;j=b+12|0;k=b+8|0;m=b+4|0;l=b;c[m>>2]=c[d>>2];c[l>>2]=c[e>>2];c[k+0>>2]=c[m+0>>2];c[j+0>>2]=c[l+0>>2];_k(a,0,k,j,f,g,h);i=b;return}function _k(b,d,e,f,g,j,k){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0;d=i;i=i+352|0;u=d+208|0;z=d+200|0;w=d+196|0;m=d+184|0;n=d+172|0;q=d+168|0;p=d+8|0;t=d+4|0;s=d;r=d+337|0;v=d+336|0;fl(m,g,u,z,w);c[n+0>>2]=0;c[n+4>>2]=0;c[n+8>>2]=0;yi(n,10,0);if((a[n]&1)==0){C=n+1|0;g=C;x=n+8|0}else{C=n+8|0;g=n+1|0;x=C;C=c[C>>2]|0}c[q>>2]=C;c[t>>2]=p;c[s>>2]=0;a[r]=1;a[v]=69;y=n+4|0;z=c[z>>2]|0;A=c[w>>2]|0;w=c[e>>2]|0;a:while(1){if((w|0)!=0){B=c[w+12>>2]|0;if((B|0)==(c[w+16>>2]|0)){B=Pc[c[(c[w>>2]|0)+36>>2]&127](w)|0}else{B=c[B>>2]|0}if((B|0)==-1){c[e>>2]=0;D=1;w=0}else{D=0}}else{D=1;w=0}B=c[f>>2]|0;do{if((B|0)!=0){E=c[B+12>>2]|0;if((E|0)==(c[B+16>>2]|0)){E=Pc[c[(c[B>>2]|0)+36>>2]&127](B)|0}else{E=c[E>>2]|0}if(!((E|0)==-1)){if(D){break}else{break a}}else{c[f>>2]=0;l=17;break}}else{l=17}}while(0);if((l|0)==17){l=0;if(D){B=0;break}else{B=0}}D=a[n]|0;F=(D&1)==0;if(F){E=(D&255)>>>1}else{E=c[y>>2]|0}if(((c[q>>2]|0)-C|0)==(E|0)){if(F){C=(D&255)>>>1;D=(D&255)>>>1}else{D=c[y>>2]|0;C=D}yi(n,C<<1,0);if((a[n]&1)==0){C=10}else{C=(c[n>>2]&-2)+ -1|0}yi(n,C,0);if((a[n]&1)==0){C=g}else{C=c[x>>2]|0}c[q>>2]=C+D}D=w+12|0;F=c[D>>2]|0;E=w+16|0;if((F|0)==(c[E>>2]|0)){F=Pc[c[(c[w>>2]|0)+36>>2]&127](w)|0}else{F=c[F>>2]|0}if((gl(F,r,v,C,q,z,A,m,p,t,s,u)|0)!=0){break}B=c[D>>2]|0;if((B|0)==(c[E>>2]|0)){Pc[c[(c[w>>2]|0)+40>>2]&127](w)|0;continue}else{c[D>>2]=B+4;continue}}u=a[m]|0;if((u&1)==0){u=(u&255)>>>1}else{u=c[m+4>>2]|0}if(((u|0)!=0?(a[r]|0)!=0:0)?(o=c[t>>2]|0,(o-p|0)<160):0){F=c[s>>2]|0;c[t>>2]=o+4;c[o>>2]=F}h[k>>3]=+Pp(C,c[q>>2]|0,j);nn(m,p,c[t>>2]|0,j);if((w|0)!=0){o=c[w+12>>2]|0;if((o|0)==(c[w+16>>2]|0)){o=Pc[c[(c[w>>2]|0)+36>>2]&127](w)|0}else{o=c[o>>2]|0}if((o|0)==-1){c[e>>2]=0;w=0;e=1}else{e=0}}else{w=0;e=1}do{if((B|0)!=0){o=c[B+12>>2]|0;if((o|0)==(c[B+16>>2]|0)){o=Pc[c[(c[B>>2]|0)+36>>2]&127](B)|0}else{o=c[o>>2]|0}if((o|0)==-1){c[f>>2]=0;l=57;break}if(e){c[b>>2]=w;vi(n);vi(m);i=d;return}}else{l=57}}while(0);if((l|0)==57?!e:0){c[b>>2]=w;vi(n);vi(m);i=d;return}c[j>>2]=c[j>>2]|2;c[b>>2]=w;vi(n);vi(m);i=d;return}function $k(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0;m=i;i=i+320|0;n=m;o=m+208|0;d=m+192|0;p=m+188|0;l=m+176|0;x=m+16|0;c[d+0>>2]=0;c[d+4>>2]=0;c[d+8>>2]=0;Qi(p,g);q=c[p>>2]|0;if(!((c[2982]|0)==-1)){c[n>>2]=11928;c[n+4>>2]=144;c[n+8>>2]=0;qi(11928,n,145)}r=(c[11932>>2]|0)+ -1|0;g=c[q+8>>2]|0;if(!((c[q+12>>2]|0)-g>>2>>>0>r>>>0)){E=Nb(4)|0;wq(E);Ac(E|0,19896,130)}g=c[g+(r<<2)>>2]|0;if((g|0)==0){E=Nb(4)|0;wq(E);Ac(E|0,19896,130)}Vc[c[(c[g>>2]|0)+48>>2]&31](g,10480,10506|0,o)|0;Yh(c[p>>2]|0)|0;c[l+0>>2]=0;c[l+4>>2]=0;c[l+8>>2]=0;yi(l,10,0);if((a[l]&1)==0){z=l+1|0;s=z;t=l+8|0}else{z=l+8|0;s=l+1|0;t=z;z=c[z>>2]|0}w=l+4|0;p=o+96|0;u=o+100|0;v=x;q=o+104|0;r=o;g=d+4|0;A=c[e>>2]|0;y=0;B=z;a:while(1){if((A|0)!=0){C=c[A+12>>2]|0;if((C|0)==(c[A+16>>2]|0)){C=Pc[c[(c[A>>2]|0)+36>>2]&127](A)|0}else{C=c[C>>2]|0}if((C|0)==-1){c[e>>2]=0;C=1;A=0}else{C=0}}else{C=1;A=0}D=c[f>>2]|0;do{if((D|0)!=0){E=c[D+12>>2]|0;if((E|0)==(c[D+16>>2]|0)){D=Pc[c[(c[D>>2]|0)+36>>2]&127](D)|0}else{D=c[E>>2]|0}if(!((D|0)==-1)){if(C){break}else{break a}}else{c[f>>2]=0;k=22;break}}else{k=22}}while(0);if((k|0)==22?(k=0,C):0){break}C=a[l]|0;D=(C&1)==0;if(D){E=(C&255)>>>1}else{E=c[w>>2]|0}if((B-z|0)==(E|0)){if(D){z=(C&255)>>>1;B=(C&255)>>>1}else{B=c[w>>2]|0;z=B}yi(l,z<<1,0);if((a[l]&1)==0){z=10}else{z=(c[l>>2]&-2)+ -1|0}yi(l,z,0);if((a[l]&1)==0){z=s}else{z=c[t>>2]|0}B=z+B|0}C=c[A+12>>2]|0;if((C|0)==(c[A+16>>2]|0)){C=Pc[c[(c[A>>2]|0)+36>>2]&127](A)|0}else{C=c[C>>2]|0}A=(B|0)==(z|0);do{if(A){D=(c[p>>2]|0)==(C|0);if(!D?(c[u>>2]|0)!=(C|0):0){k=43;break}a[B]=D?43:45;B=B+1|0;y=0}else{k=43}}while(0);do{if((k|0)==43){k=0;D=a[d]|0;if((D&1)==0){D=(D&255)>>>1}else{D=c[g>>2]|0}if((D|0)!=0&(C|0)==0){if((x-v|0)>=160){break}c[x>>2]=y;x=x+4|0;y=0;break}else{D=o}while(1){E=D+4|0;if((c[D>>2]|0)==(C|0)){break}if((E|0)==(q|0)){D=q;break}else{D=E}}C=D-r|0;D=C>>2;if((C|0)>92){break a}if((C|0)<88){a[B]=a[10480+D|0]|0;B=B+1|0;y=y+1|0;break}if(A){z=B;break a}if((B-z|0)>=3){break a}if((a[B+ -1|0]|0)!=48){break a}a[B]=a[10480+D|0]|0;B=B+1|0;y=0}}while(0);A=c[e>>2]|0;C=A+12|0;D=c[C>>2]|0;if((D|0)==(c[A+16>>2]|0)){Pc[c[(c[A>>2]|0)+40>>2]&127](A)|0;continue}else{c[C>>2]=D+4;continue}}a[z+3|0]=0;if((a[11832]|0)==0?(Ia(11832)|0)!=0:0){c[2956]=rb(2147483647,11840,0)|0;nb(11832)}E=c[2956]|0;c[n>>2]=j;if((Ek(z,E,10520,n)|0)!=1){c[h>>2]=4}j=c[e>>2]|0;if((j|0)!=0){n=c[j+12>>2]|0;if((n|0)==(c[j+16>>2]|0)){n=Pc[c[(c[j>>2]|0)+36>>2]&127](j)|0}else{n=c[n>>2]|0}if((n|0)==-1){c[e>>2]=0;e=0;j=1}else{e=j;j=0}}else{e=0;j=1}n=c[f>>2]|0;do{if((n|0)!=0){o=c[n+12>>2]|0;if((o|0)==(c[n+16>>2]|0)){n=Pc[c[(c[n>>2]|0)+36>>2]&127](n)|0}else{n=c[o>>2]|0}if((n|0)==-1){c[f>>2]=0;k=78;break}if(j){c[b>>2]=e;vi(l);vi(d);i=m;return}}else{k=78}}while(0);if((k|0)==78?!j:0){c[b>>2]=e;vi(l);vi(d);i=m;return}c[h>>2]=c[h>>2]|2;c[b>>2]=e;vi(l);vi(d);i=m;return}function al(b,d,e,f,g,h,j,k,l,m){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;var n=0,o=0,p=0,q=0;n=i;o=c[f>>2]|0;p=(o|0)==(e|0);do{if(p){q=(c[m+96>>2]|0)==(b|0);if(!q?(c[m+100>>2]|0)!=(b|0):0){break}c[f>>2]=e+1;a[e]=q?43:45;c[g>>2]=0;q=0;i=n;return q|0}}while(0);q=a[j]|0;if((q&1)==0){j=(q&255)>>>1}else{j=c[j+4>>2]|0}if((j|0)!=0&(b|0)==(h|0)){o=c[l>>2]|0;if((o-k|0)>=160){q=0;i=n;return q|0}q=c[g>>2]|0;c[l>>2]=o+4;c[o>>2]=q;c[g>>2]=0;q=0;i=n;return q|0}l=m+104|0;k=m;while(1){h=k+4|0;if((c[k>>2]|0)==(b|0)){break}if((h|0)==(l|0)){k=l;break}else{k=h}}b=k-m|0;m=b>>2;if((b|0)>92){q=-1;i=n;return q|0}if((d|0)==16){if((b|0)>=88){if(p){q=-1;i=n;return q|0}if((o-e|0)>=3){q=-1;i=n;return q|0}if((a[o+ -1|0]|0)!=48){q=-1;i=n;return q|0}c[g>>2]=0;q=a[10480+m|0]|0;c[f>>2]=o+1;a[o]=q;q=0;i=n;return q|0}}else if((d|0)==10|(d|0)==8?(m|0)>=(d|0):0){q=-1;i=n;return q|0}q=a[10480+m|0]|0;c[f>>2]=o+1;a[o]=q;c[g>>2]=(c[g>>2]|0)+1;q=0;i=n;return q|0}function bl(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0;g=i;i=i+16|0;j=g;h=g+12|0;Qi(h,d);d=c[h>>2]|0;if(!((c[2984]|0)==-1)){c[j>>2]=11936;c[j+4>>2]=144;c[j+8>>2]=0;qi(11936,j,145)}l=(c[11940>>2]|0)+ -1|0;k=c[d+8>>2]|0;if(!((c[d+12>>2]|0)-k>>2>>>0>l>>>0)){l=Nb(4)|0;wq(l);Ac(l|0,19896,130)}d=c[k+(l<<2)>>2]|0;if((d|0)==0){l=Nb(4)|0;wq(l);Ac(l|0,19896,130)}Vc[c[(c[d>>2]|0)+32>>2]&31](d,10480,10506|0,e)|0;e=c[h>>2]|0;if(!((c[3020]|0)==-1)){c[j>>2]=12080;c[j+4>>2]=144;c[j+8>>2]=0;qi(12080,j,145)}d=(c[12084>>2]|0)+ -1|0;j=c[e+8>>2]|0;if(!((c[e+12>>2]|0)-j>>2>>>0>d>>>0)){l=Nb(4)|0;wq(l);Ac(l|0,19896,130)}j=c[j+(d<<2)>>2]|0;if((j|0)==0){l=Nb(4)|0;wq(l);Ac(l|0,19896,130)}else{a[f]=Pc[c[(c[j>>2]|0)+16>>2]&127](j)|0;Mc[c[(c[j>>2]|0)+20>>2]&63](b,j);Yh(c[h>>2]|0)|0;i=g;return}}function cl(b,d,e,f,g){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0;j=i;i=i+16|0;k=j;h=j+12|0;Qi(h,d);d=c[h>>2]|0;if(!((c[2984]|0)==-1)){c[k>>2]=11936;c[k+4>>2]=144;c[k+8>>2]=0;qi(11936,k,145)}m=(c[11940>>2]|0)+ -1|0;l=c[d+8>>2]|0;if(!((c[d+12>>2]|0)-l>>2>>>0>m>>>0)){m=Nb(4)|0;wq(m);Ac(m|0,19896,130)}d=c[l+(m<<2)>>2]|0;if((d|0)==0){m=Nb(4)|0;wq(m);Ac(m|0,19896,130)}Vc[c[(c[d>>2]|0)+32>>2]&31](d,10480,10512|0,e)|0;e=c[h>>2]|0;if(!((c[3020]|0)==-1)){c[k>>2]=12080;c[k+4>>2]=144;c[k+8>>2]=0;qi(12080,k,145)}d=(c[12084>>2]|0)+ -1|0;k=c[e+8>>2]|0;if(!((c[e+12>>2]|0)-k>>2>>>0>d>>>0)){m=Nb(4)|0;wq(m);Ac(m|0,19896,130)}k=c[k+(d<<2)>>2]|0;if((k|0)==0){m=Nb(4)|0;wq(m);Ac(m|0,19896,130)}else{a[f]=Pc[c[(c[k>>2]|0)+12>>2]&127](k)|0;a[g]=Pc[c[(c[k>>2]|0)+16>>2]&127](k)|0;Mc[c[(c[k>>2]|0)+20>>2]&63](b,k);Yh(c[h>>2]|0)|0;i=j;return}}function dl(b,d,e,f,g,h,j,k,l,m,n,o){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;n=n|0;o=o|0;var p=0,q=0,r=0;p=i;if(b<<24>>24==h<<24>>24){if((a[d]|0)==0){r=-1;i=p;return r|0}a[d]=0;r=c[g>>2]|0;c[g>>2]=r+1;a[r]=46;g=a[k]|0;if((g&1)==0){g=(g&255)>>>1}else{g=c[k+4>>2]|0}if((g|0)==0){r=0;i=p;return r|0}g=c[m>>2]|0;if((g-l|0)>=160){r=0;i=p;return r|0}r=c[n>>2]|0;c[m>>2]=g+4;c[g>>2]=r;r=0;i=p;return r|0}if(b<<24>>24==j<<24>>24){j=a[k]|0;if((j&1)==0){j=(j&255)>>>1}else{j=c[k+4>>2]|0}if((j|0)!=0){if((a[d]|0)==0){r=-1;i=p;return r|0}g=c[m>>2]|0;if((g-l|0)>=160){r=0;i=p;return r|0}r=c[n>>2]|0;c[m>>2]=g+4;c[g>>2]=r;c[n>>2]=0;r=0;i=p;return r|0}}r=o+32|0;h=o;while(1){j=h+1|0;if((a[h]|0)==b<<24>>24){break}if((j|0)==(r|0)){h=r;break}else{h=j}}b=h-o|0;if((b|0)>31){r=-1;i=p;return r|0}o=a[10480+b|0]|0;if((b|0)==23|(b|0)==22){a[e]=80;r=c[g>>2]|0;c[g>>2]=r+1;a[r]=o;r=0;i=p;return r|0}else if((b|0)==24|(b|0)==25){n=c[g>>2]|0;if((n|0)!=(f|0)?(a[n+ -1|0]&95|0)!=(a[e]&127|0):0){r=-1;i=p;return r|0}c[g>>2]=n+1;a[n]=o;r=0;i=p;return r|0}else{f=o&95;if((f|0)==(a[e]|0)?(a[e]=f|128,(a[d]|0)!=0):0){a[d]=0;e=a[k]|0;if((e&1)==0){k=(e&255)>>>1}else{k=c[k+4>>2]|0}if((k|0)!=0?(q=c[m>>2]|0,(q-l|0)<160):0){r=c[n>>2]|0;c[m>>2]=q+4;c[q>>2]=r}}r=c[g>>2]|0;c[g>>2]=r+1;a[r]=o;if((b|0)>21){r=0;i=p;return r|0}c[n>>2]=(c[n>>2]|0)+1;r=0;i=p;return r|0}return 0}function el(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0,k=0;f=i;i=i+16|0;h=f;g=f+12|0;Qi(g,b);b=c[g>>2]|0;if(!((c[2982]|0)==-1)){c[h>>2]=11928;c[h+4>>2]=144;c[h+8>>2]=0;qi(11928,h,145)}k=(c[11932>>2]|0)+ -1|0;j=c[b+8>>2]|0;if(!((c[b+12>>2]|0)-j>>2>>>0>k>>>0)){k=Nb(4)|0;wq(k);Ac(k|0,19896,130)}b=c[j+(k<<2)>>2]|0;if((b|0)==0){k=Nb(4)|0;wq(k);Ac(k|0,19896,130)}Vc[c[(c[b>>2]|0)+48>>2]&31](b,10480,10506|0,d)|0;d=c[g>>2]|0;if(!((c[3022]|0)==-1)){c[h>>2]=12088;c[h+4>>2]=144;c[h+8>>2]=0;qi(12088,h,145)}b=(c[12092>>2]|0)+ -1|0;h=c[d+8>>2]|0;if(!((c[d+12>>2]|0)-h>>2>>>0>b>>>0)){k=Nb(4)|0;wq(k);Ac(k|0,19896,130)}h=c[h+(b<<2)>>2]|0;if((h|0)==0){k=Nb(4)|0;wq(k);Ac(k|0,19896,130)}else{c[e>>2]=Pc[c[(c[h>>2]|0)+16>>2]&127](h)|0;Mc[c[(c[h>>2]|0)+20>>2]&63](a,h);Yh(c[g>>2]|0)|0;i=f;return}}function fl(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0;h=i;i=i+16|0;j=h;g=h+12|0;Qi(g,b);b=c[g>>2]|0;if(!((c[2982]|0)==-1)){c[j>>2]=11928;c[j+4>>2]=144;c[j+8>>2]=0;qi(11928,j,145)}l=(c[11932>>2]|0)+ -1|0;k=c[b+8>>2]|0;if(!((c[b+12>>2]|0)-k>>2>>>0>l>>>0)){l=Nb(4)|0;wq(l);Ac(l|0,19896,130)}b=c[k+(l<<2)>>2]|0;if((b|0)==0){l=Nb(4)|0;wq(l);Ac(l|0,19896,130)}Vc[c[(c[b>>2]|0)+48>>2]&31](b,10480,10512|0,d)|0;d=c[g>>2]|0;if(!((c[3022]|0)==-1)){c[j>>2]=12088;c[j+4>>2]=144;c[j+8>>2]=0;qi(12088,j,145)}b=(c[12092>>2]|0)+ -1|0;j=c[d+8>>2]|0;if(!((c[d+12>>2]|0)-j>>2>>>0>b>>>0)){l=Nb(4)|0;wq(l);Ac(l|0,19896,130)}j=c[j+(b<<2)>>2]|0;if((j|0)==0){l=Nb(4)|0;wq(l);Ac(l|0,19896,130)}else{c[e>>2]=Pc[c[(c[j>>2]|0)+12>>2]&127](j)|0;c[f>>2]=Pc[c[(c[j>>2]|0)+16>>2]&127](j)|0;Mc[c[(c[j>>2]|0)+20>>2]&63](a,j);Yh(c[g>>2]|0)|0;i=h;return}}function gl(b,d,e,f,g,h,j,k,l,m,n,o){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;n=n|0;o=o|0;var p=0,q=0,r=0;p=i;if((b|0)==(h|0)){if((a[d]|0)==0){r=-1;i=p;return r|0}a[d]=0;r=c[g>>2]|0;c[g>>2]=r+1;a[r]=46;g=a[k]|0;if((g&1)==0){g=(g&255)>>>1}else{g=c[k+4>>2]|0}if((g|0)==0){r=0;i=p;return r|0}g=c[m>>2]|0;if((g-l|0)>=160){r=0;i=p;return r|0}r=c[n>>2]|0;c[m>>2]=g+4;c[g>>2]=r;r=0;i=p;return r|0}if((b|0)==(j|0)){j=a[k]|0;if((j&1)==0){j=(j&255)>>>1}else{j=c[k+4>>2]|0}if((j|0)!=0){if((a[d]|0)==0){r=-1;i=p;return r|0}g=c[m>>2]|0;if((g-l|0)>=160){r=0;i=p;return r|0}r=c[n>>2]|0;c[m>>2]=g+4;c[g>>2]=r;c[n>>2]=0;r=0;i=p;return r|0}}r=o+128|0;h=o;while(1){j=h+4|0;if((c[h>>2]|0)==(b|0)){break}if((j|0)==(r|0)){h=r;break}else{h=j}}b=h-o|0;j=b>>2;if((b|0)>124){r=-1;i=p;return r|0}o=a[10480+j|0]|0;if((j|0)==23|(j|0)==22){a[e]=80}else if(!((j|0)==24|(j|0)==25)){f=o&95;if((f|0)==(a[e]|0)?(a[e]=f|128,(a[d]|0)!=0):0){a[d]=0;e=a[k]|0;if((e&1)==0){k=(e&255)>>>1}else{k=c[k+4>>2]|0}if((k|0)!=0?(q=c[m>>2]|0,(q-l|0)<160):0){r=c[n>>2]|0;c[m>>2]=q+4;c[q>>2]=r}}}else{n=c[g>>2]|0;if((n|0)!=(f|0)?(a[n+ -1|0]&95|0)!=(a[e]&127|0):0){r=-1;i=p;return r|0}c[g>>2]=n+1;a[n]=o;r=0;i=p;return r|0}r=c[g>>2]|0;c[g>>2]=r+1;a[r]=o;if((b|0)>84){r=0;i=p;return r|0}c[n>>2]=(c[n>>2]|0)+1;r=0;i=p;return r|0}function hl(a){a=a|0;var b=0;b=i;Yq(a);i=b;return}function il(a){a=a|0;return}function jl(b,d,e,f,g,h){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0;k=i;i=i+32|0;m=k;n=k+28|0;l=k+24|0;j=k+12|0;if((c[f+4>>2]&1|0)==0){l=c[(c[d>>2]|0)+24>>2]|0;c[n>>2]=c[e>>2];o=h&1;c[m+0>>2]=c[n+0>>2];Xc[l&31](b,d,m,f,g,o);i=k;return}Qi(l,f);d=c[l>>2]|0;if(!((c[3020]|0)==-1)){c[m>>2]=12080;c[m+4>>2]=144;c[m+8>>2]=0;qi(12080,m,145)}m=(c[12084>>2]|0)+ -1|0;g=c[d+8>>2]|0;if(!((c[d+12>>2]|0)-g>>2>>>0>m>>>0)){o=Nb(4)|0;wq(o);Ac(o|0,19896,130)}m=c[g+(m<<2)>>2]|0;if((m|0)==0){o=Nb(4)|0;wq(o);Ac(o|0,19896,130)}Yh(c[l>>2]|0)|0;l=c[m>>2]|0;if(h){Mc[c[l+24>>2]&63](j,m)}else{Mc[c[l+28>>2]&63](j,m)}n=a[j]|0;if((n&1)==0){l=j+1|0;d=l;m=j+8|0}else{m=j+8|0;d=c[m>>2]|0;l=j+1|0}h=j+4|0;while(1){if((n&1)==0){g=l;n=(n&255)>>>1}else{g=c[m>>2]|0;n=c[h>>2]|0}if((d|0)==(g+n|0)){break}f=a[d]|0;n=c[e>>2]|0;do{if((n|0)!=0){g=n+24|0;o=c[g>>2]|0;if((o|0)!=(c[n+28>>2]|0)){c[g>>2]=o+1;a[o]=f;break}if((Yc[c[(c[n>>2]|0)+52>>2]&63](n,f&255)|0)==-1){c[e>>2]=0}}}while(0);n=a[j]|0;d=d+1|0}c[b>>2]=c[e>>2];vi(j);i=k;return}function kl(b,d,e,f,g,h){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0;m=i;i=i+64|0;l=m;s=m+56|0;d=m+44|0;o=m+20|0;q=m+16|0;k=m+12|0;p=m+8|0;n=m+4|0;a[s+0|0]=a[10728|0]|0;a[s+1|0]=a[10729|0]|0;a[s+2|0]=a[10730|0]|0;a[s+3|0]=a[10731|0]|0;a[s+4|0]=a[10732|0]|0;a[s+5|0]=a[10733|0]|0;u=s+1|0;r=f+4|0;t=c[r>>2]|0;if((t&2048|0)!=0){a[u]=43;u=s+2|0}if((t&512|0)!=0){a[u]=35;u=u+1|0}a[u]=108;u=u+1|0;v=t&74;do{if((v|0)==64){a[u]=111}else if((v|0)==8){if((t&16384|0)==0){a[u]=120;break}else{a[u]=88;break}}else{a[u]=100}}while(0);if((a[11832]|0)==0?(Ia(11832)|0)!=0:0){c[2956]=rb(2147483647,11840,0)|0;nb(11832)}v=c[2956]|0;c[l>>2]=h;s=ll(d,12,v,s,l)|0;h=d+s|0;r=c[r>>2]&176;do{if((r|0)==32){r=h}else if((r|0)==16){r=a[d]|0;if(r<<24>>24==43|r<<24>>24==45){r=d+1|0;break}if((s|0)>1&r<<24>>24==48?(v=a[d+1|0]|0,v<<24>>24==88|v<<24>>24==120):0){r=d+2|0}else{j=20}}else{j=20}}while(0);if((j|0)==20){r=d}Qi(p,f);ml(d,r,h,o,q,k,p);Yh(c[p>>2]|0)|0;c[n>>2]=c[e>>2];u=c[q>>2]|0;v=c[k>>2]|0;c[l+0>>2]=c[n+0>>2];zd(b,l,o,u,v,f,g);i=m;return}function ll(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0;g=i;i=i+16|0;h=g;c[h>>2]=f;d=Sb(d|0)|0;e=zb(a|0,b|0,e|0,h|0)|0;if((d|0)==0){i=g;return e|0}Sb(d|0)|0;i=g;return e|0}function ml(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0;l=i;i=i+32|0;o=l;k=l+12|0;n=c[j>>2]|0;if(!((c[2984]|0)==-1)){c[o>>2]=11936;c[o+4>>2]=144;c[o+8>>2]=0;qi(11936,o,145)}r=(c[11940>>2]|0)+ -1|0;s=c[n+8>>2]|0;if(!((c[n+12>>2]|0)-s>>2>>>0>r>>>0)){v=Nb(4)|0;wq(v);Ac(v|0,19896,130)}n=c[s+(r<<2)>>2]|0;if((n|0)==0){v=Nb(4)|0;wq(v);Ac(v|0,19896,130)}j=c[j>>2]|0;if(!((c[3020]|0)==-1)){c[o>>2]=12080;c[o+4>>2]=144;c[o+8>>2]=0;qi(12080,o,145)}o=(c[12084>>2]|0)+ -1|0;r=c[j+8>>2]|0;if(!((c[j+12>>2]|0)-r>>2>>>0>o>>>0)){v=Nb(4)|0;wq(v);Ac(v|0,19896,130)}j=c[r+(o<<2)>>2]|0;if((j|0)==0){v=Nb(4)|0;wq(v);Ac(v|0,19896,130)}Mc[c[(c[j>>2]|0)+20>>2]&63](k,j);o=a[k]|0;if((o&1)==0){o=(o&255)>>>1}else{o=c[k+4>>2]|0}if((o|0)!=0){c[h>>2]=f;o=a[b]|0;if(o<<24>>24==43|o<<24>>24==45){v=Yc[c[(c[n>>2]|0)+28>>2]&63](n,o)|0;o=c[h>>2]|0;c[h>>2]=o+1;a[o]=v;o=b+1|0}else{o=b}if(((e-o|0)>1?(a[o]|0)==48:0)?(q=o+1|0,v=a[q]|0,v<<24>>24==88|v<<24>>24==120):0){v=Yc[c[(c[n>>2]|0)+28>>2]&63](n,48)|0;u=c[h>>2]|0;c[h>>2]=u+1;a[u]=v;u=Yc[c[(c[n>>2]|0)+28>>2]&63](n,a[q]|0)|0;v=c[h>>2]|0;c[h>>2]=v+1;a[v]=u;o=o+2|0}if((o|0)!=(e|0)?(p=e+ -1|0,p>>>0>o>>>0):0){q=o;do{v=a[q]|0;a[q]=a[p]|0;a[p]=v;q=q+1|0;p=p+ -1|0}while(q>>>0<p>>>0)}r=Pc[c[(c[j>>2]|0)+16>>2]&127](j)|0;if(o>>>0<e>>>0){p=k+1|0;q=k+4|0;j=k+8|0;u=0;t=0;s=o;while(1){v=(a[k]&1)==0;if((a[(v?p:c[j>>2]|0)+t|0]|0)!=0?(u|0)==(a[(v?p:c[j>>2]|0)+t|0]|0):0){u=c[h>>2]|0;c[h>>2]=u+1;a[u]=r;u=a[k]|0;if((u&1)==0){v=(u&255)>>>1}else{v=c[q>>2]|0}u=0;t=(t>>>0<(v+ -1|0)>>>0)+t|0}w=Yc[c[(c[n>>2]|0)+28>>2]&63](n,a[s]|0)|0;v=c[h>>2]|0;c[h>>2]=v+1;a[v]=w;s=s+1|0;if(!(s>>>0<e>>>0)){break}else{u=u+1|0}}}o=f+(o-b)|0;n=c[h>>2]|0;if((o|0)!=(n|0)?(m=n+ -1|0,m>>>0>o>>>0):0){do{w=a[o]|0;a[o]=a[m]|0;a[m]=w;o=o+1|0;m=m+ -1|0}while(o>>>0<m>>>0)}}else{Vc[c[(c[n>>2]|0)+32>>2]&31](n,b,e,f)|0;c[h>>2]=f+(e-b)}if((d|0)==(e|0)){w=c[h>>2]|0;c[g>>2]=w;vi(k);i=l;return}else{w=f+(d-b)|0;c[g>>2]=w;vi(k);i=l;return}}function nl(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0;p=i;i=i+96|0;m=p+8|0;t=p;q=p+74|0;l=p+32|0;r=p+28|0;n=p+24|0;d=p+20|0;o=p+16|0;w=t;c[w>>2]=37;c[w+4>>2]=0;w=t+1|0;s=f+4|0;u=c[s>>2]|0;if((u&2048|0)!=0){a[w]=43;w=t+2|0}if((u&512|0)!=0){a[w]=35;w=w+1|0}v=w+2|0;a[w]=108;a[w+1|0]=108;w=u&74;do{if((w|0)==8){if((u&16384|0)==0){a[v]=120;break}else{a[v]=88;break}}else if((w|0)==64){a[v]=111}else{a[v]=100}}while(0);if((a[11832]|0)==0?(Ia(11832)|0)!=0:0){c[2956]=rb(2147483647,11840,0)|0;nb(11832)}w=c[2956]|0;v=m;c[v>>2]=h;c[v+4>>2]=j;h=ll(q,22,w,t,m)|0;j=q+h|0;s=c[s>>2]&176;do{if((s|0)==16){s=a[q]|0;if(s<<24>>24==43|s<<24>>24==45){s=q+1|0;break}if((h|0)>1&s<<24>>24==48?(w=a[q+1|0]|0,w<<24>>24==88|w<<24>>24==120):0){s=q+2|0}else{k=20}}else if((s|0)==32){s=j}else{k=20}}while(0);if((k|0)==20){s=q}Qi(d,f);ml(q,s,j,l,r,n,d);Yh(c[d>>2]|0)|0;c[o>>2]=c[e>>2];v=c[r>>2]|0;w=c[n>>2]|0;c[m+0>>2]=c[o+0>>2];zd(b,m,l,v,w,f,g);i=p;return}function ol(b,d,e,f,g,h){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0;m=i;i=i+64|0;l=m;s=m+56|0;p=m+44|0;o=m+20|0;q=m+16|0;k=m+12|0;d=m+8|0;n=m+4|0;a[s+0|0]=a[10728|0]|0;a[s+1|0]=a[10729|0]|0;a[s+2|0]=a[10730|0]|0;a[s+3|0]=a[10731|0]|0;a[s+4|0]=a[10732|0]|0;a[s+5|0]=a[10733|0]|0;u=s+1|0;r=f+4|0;t=c[r>>2]|0;if((t&2048|0)!=0){a[u]=43;u=s+2|0}if((t&512|0)!=0){a[u]=35;u=u+1|0}a[u]=108;u=u+1|0;v=t&74;do{if((v|0)==64){a[u]=111}else if((v|0)==8){if((t&16384|0)==0){a[u]=120;break}else{a[u]=88;break}}else{a[u]=117}}while(0);if((a[11832]|0)==0?(Ia(11832)|0)!=0:0){c[2956]=rb(2147483647,11840,0)|0;nb(11832)}v=c[2956]|0;c[l>>2]=h;s=ll(p,12,v,s,l)|0;h=p+s|0;r=c[r>>2]&176;do{if((r|0)==16){r=a[p]|0;if(r<<24>>24==43|r<<24>>24==45){r=p+1|0;break}if((s|0)>1&r<<24>>24==48?(v=a[p+1|0]|0,v<<24>>24==88|v<<24>>24==120):0){r=p+2|0}else{j=20}}else if((r|0)==32){r=h}else{j=20}}while(0);if((j|0)==20){r=p}Qi(d,f);ml(p,r,h,o,q,k,d);Yh(c[d>>2]|0)|0;c[n>>2]=c[e>>2];u=c[q>>2]|0;v=c[k>>2]|0;c[l+0>>2]=c[n+0>>2];zd(b,l,o,u,v,f,g);i=m;return}function pl(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0;p=i;i=i+112|0;q=p+8|0;t=p;m=p+75|0;l=p+32|0;r=p+28|0;n=p+24|0;d=p+20|0;o=p+16|0;w=t;c[w>>2]=37;c[w+4>>2]=0;w=t+1|0;s=f+4|0;u=c[s>>2]|0;if((u&2048|0)!=0){a[w]=43;w=t+2|0}if((u&512|0)!=0){a[w]=35;w=w+1|0}v=w+2|0;a[w]=108;a[w+1|0]=108;w=u&74;do{if((w|0)==8){if((u&16384|0)==0){a[v]=120;break}else{a[v]=88;break}}else if((w|0)==64){a[v]=111}else{a[v]=117}}while(0);if((a[11832]|0)==0?(Ia(11832)|0)!=0:0){c[2956]=rb(2147483647,11840,0)|0;nb(11832)}w=c[2956]|0;v=q;c[v>>2]=h;c[v+4>>2]=j;h=ll(m,23,w,t,q)|0;j=m+h|0;s=c[s>>2]&176;do{if((s|0)==32){s=j}else if((s|0)==16){s=a[m]|0;if(s<<24>>24==43|s<<24>>24==45){s=m+1|0;break}if((h|0)>1&s<<24>>24==48?(w=a[m+1|0]|0,w<<24>>24==88|w<<24>>24==120):0){s=m+2|0}else{k=20}}else{k=20}}while(0);if((k|0)==20){s=m}Qi(d,f);ml(m,s,j,l,r,n,d);Yh(c[d>>2]|0)|0;c[o>>2]=c[e>>2];v=c[r>>2]|0;w=c[n>>2]|0;c[q+0>>2]=c[o+0>>2];zd(b,q,l,v,w,f,g);i=p;return}function ql(b,d,e,f,g,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;j=+j;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0;s=i;i=i+144|0;u=s+8|0;C=s;y=s+102|0;B=s+40|0;z=s+44|0;x=s+36|0;d=s+32|0;q=s+28|0;v=s+24|0;t=s+20|0;E=C;c[E>>2]=37;c[E+4>>2]=0;E=C+1|0;A=f+4|0;F=c[A>>2]|0;if((F&2048|0)!=0){a[E]=43;E=C+2|0}if((F&1024|0)!=0){a[E]=35;E=E+1|0}D=F&260;F=F>>>14;do{if((D|0)==260){if((F&1|0)==0){a[E]=97;D=0;break}else{a[E]=65;D=0;break}}else{a[E]=46;G=E+2|0;a[E+1|0]=42;if((D|0)==256){if((F&1|0)==0){a[G]=101;D=1;break}else{a[G]=69;D=1;break}}else if((D|0)==4){if((F&1|0)==0){a[G]=102;D=1;break}else{a[G]=70;D=1;break}}else{if((F&1|0)==0){a[G]=103;D=1;break}else{a[G]=71;D=1;break}}}}while(0);c[B>>2]=y;if((a[11832]|0)==0?(Ia(11832)|0)!=0:0){c[2956]=rb(2147483647,11840,0)|0;nb(11832)}E=c[2956]|0;if(D){c[u>>2]=c[f+8>>2];G=u+4|0;h[k>>3]=j;c[G>>2]=c[k>>2];c[G+4>>2]=c[k+4>>2];E=ll(y,30,E,C,u)|0}else{h[k>>3]=j;c[u>>2]=c[k>>2];c[u+4>>2]=c[k+4>>2];E=ll(y,30,E,C,u)|0}if((E|0)>29){E=(a[11832]|0)==0;if(D){if(E?(Ia(11832)|0)!=0:0){c[2956]=rb(2147483647,11840,0)|0;nb(11832)}G=c[2956]|0;c[u>>2]=c[f+8>>2];F=u+4|0;h[k>>3]=j;c[F>>2]=c[k>>2];c[F+4>>2]=c[k+4>>2];C=rl(B,G,C,u)|0}else{if(E?(Ia(11832)|0)!=0:0){c[2956]=rb(2147483647,11840,0)|0;nb(11832)}G=c[2956]|0;c[u>>2]=c[f+8>>2];F=u+4|0;h[k>>3]=j;c[F>>2]=c[k>>2];c[F+4>>2]=c[k+4>>2];C=rl(B,G,C,u)|0}B=c[B>>2]|0;if((B|0)==0){br()}else{p=B;m=B;w=C}}else{p=c[B>>2]|0;m=0;w=E}B=p+w|0;A=c[A>>2]&176;do{if((A|0)==16){A=a[p]|0;if(A<<24>>24==43|A<<24>>24==45){A=p+1|0;break}if((w|0)>1&A<<24>>24==48?(G=a[p+1|0]|0,G<<24>>24==88|G<<24>>24==120):0){A=p+2|0}else{r=44}}else if((A|0)==32){A=B}else{r=44}}while(0);if((r|0)==44){A=p}if((p|0)!=(y|0)){r=Rq(w<<1)|0;if((r|0)==0){br()}else{l=p;n=r;o=r}}else{l=y;n=0;o=z}Qi(q,f);sl(l,A,B,o,x,d,q);Yh(c[q>>2]|0)|0;c[t>>2]=c[e>>2];F=c[x>>2]|0;G=c[d>>2]|0;c[u+0>>2]=c[t+0>>2];zd(v,u,o,F,G,f,g);G=c[v>>2]|0;c[e>>2]=G;c[b>>2]=G;if((n|0)!=0){Sq(n)}if((m|0)==0){i=s;return}Sq(m);i=s;return}function rl(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;var f=0,g=0;f=i;i=i+16|0;g=f;c[g>>2]=e;b=Sb(b|0)|0;d=xb(a|0,d|0,g|0)|0;if((b|0)==0){i=f;return d|0}Sb(b|0)|0;i=f;return d|0}function sl(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0;k=i;i=i+32|0;o=k;l=k+12|0;m=c[j>>2]|0;if(!((c[2984]|0)==-1)){c[o>>2]=11936;c[o+4>>2]=144;c[o+8>>2]=0;qi(11936,o,145)}t=(c[11940>>2]|0)+ -1|0;r=c[m+8>>2]|0;if(!((c[m+12>>2]|0)-r>>2>>>0>t>>>0)){y=Nb(4)|0;wq(y);Ac(y|0,19896,130)}m=c[r+(t<<2)>>2]|0;if((m|0)==0){y=Nb(4)|0;wq(y);Ac(y|0,19896,130)}j=c[j>>2]|0;if(!((c[3020]|0)==-1)){c[o>>2]=12080;c[o+4>>2]=144;c[o+8>>2]=0;qi(12080,o,145)}o=(c[12084>>2]|0)+ -1|0;r=c[j+8>>2]|0;if(!((c[j+12>>2]|0)-r>>2>>>0>o>>>0)){y=Nb(4)|0;wq(y);Ac(y|0,19896,130)}o=c[r+(o<<2)>>2]|0;if((o|0)==0){y=Nb(4)|0;wq(y);Ac(y|0,19896,130)}Mc[c[(c[o>>2]|0)+20>>2]&63](l,o);c[h>>2]=f;j=a[b]|0;if(j<<24>>24==43|j<<24>>24==45){y=Yc[c[(c[m>>2]|0)+28>>2]&63](m,j)|0;t=c[h>>2]|0;c[h>>2]=t+1;a[t]=y;t=b+1|0}else{t=b}j=e;a:do{if(((j-t|0)>1?(a[t]|0)==48:0)?(p=t+1|0,y=a[p]|0,y<<24>>24==88|y<<24>>24==120):0){y=Yc[c[(c[m>>2]|0)+28>>2]&63](m,48)|0;x=c[h>>2]|0;c[h>>2]=x+1;a[x]=y;t=t+2|0;x=Yc[c[(c[m>>2]|0)+28>>2]&63](m,a[p]|0)|0;y=c[h>>2]|0;c[h>>2]=y+1;a[y]=x;if(t>>>0<e>>>0){r=t;while(1){p=a[r]|0;if((a[11832]|0)==0?(Ia(11832)|0)!=0:0){c[2956]=rb(2147483647,11840,0)|0;nb(11832)}u=r+1|0;if((mb(p<<24>>24|0,c[2956]|0)|0)==0){p=t;break a}if(u>>>0<e>>>0){r=u}else{p=t;r=u;break}}}else{p=t;r=t}}else{s=14}}while(0);b:do{if((s|0)==14){if(t>>>0<e>>>0){r=t;while(1){p=a[r]|0;if((a[11832]|0)==0?(Ia(11832)|0)!=0:0){c[2956]=rb(2147483647,11840,0)|0;nb(11832)}s=r+1|0;if((sb(p<<24>>24|0,c[2956]|0)|0)==0){p=t;break b}if(s>>>0<e>>>0){r=s}else{p=t;r=s;break}}}else{p=t;r=t}}}while(0);s=a[l]|0;if((s&1)==0){s=(s&255)>>>1}else{s=c[l+4>>2]|0}if((s|0)!=0){if((p|0)!=(r|0)?(q=r+ -1|0,q>>>0>p>>>0):0){s=p;do{y=a[s]|0;a[s]=a[q]|0;a[q]=y;s=s+1|0;q=q+ -1|0}while(s>>>0<q>>>0)}q=Pc[c[(c[o>>2]|0)+16>>2]&127](o)|0;if(p>>>0<r>>>0){v=l+1|0;s=l+4|0;t=l+8|0;x=0;w=0;u=p;while(1){y=(a[l]&1)==0;if((a[(y?v:c[t>>2]|0)+w|0]|0)>0?(x|0)==(a[(y?v:c[t>>2]|0)+w|0]|0):0){x=c[h>>2]|0;c[h>>2]=x+1;a[x]=q;x=a[l]|0;if((x&1)==0){y=(x&255)>>>1}else{y=c[s>>2]|0}x=0;w=(w>>>0<(y+ -1|0)>>>0)+w|0}z=Yc[c[(c[m>>2]|0)+28>>2]&63](m,a[u]|0)|0;y=c[h>>2]|0;c[h>>2]=y+1;a[y]=z;u=u+1|0;if(!(u>>>0<r>>>0)){break}else{x=x+1|0}}}q=f+(p-b)|0;p=c[h>>2]|0;if((q|0)!=(p|0)?(n=p+ -1|0,n>>>0>q>>>0):0){do{z=a[q]|0;a[q]=a[n]|0;a[n]=z;q=q+1|0;n=n+ -1|0}while(q>>>0<n>>>0)}}else{Vc[c[(c[m>>2]|0)+32>>2]&31](m,p,r,c[h>>2]|0)|0;c[h>>2]=(c[h>>2]|0)+(r-p)}c:do{if(r>>>0<e>>>0){while(1){n=a[r]|0;if(n<<24>>24==46){break}y=Yc[c[(c[m>>2]|0)+28>>2]&63](m,n)|0;z=c[h>>2]|0;c[h>>2]=z+1;a[z]=y;r=r+1|0;if(!(r>>>0<e>>>0)){break c}}y=Pc[c[(c[o>>2]|0)+12>>2]&127](o)|0;z=c[h>>2]|0;c[h>>2]=z+1;a[z]=y;r=r+1|0}}while(0);Vc[c[(c[m>>2]|0)+32>>2]&31](m,r,e,c[h>>2]|0)|0;m=(c[h>>2]|0)+(j-r)|0;c[h>>2]=m;if((d|0)==(e|0)){z=m;c[g>>2]=z;vi(l);i=k;return}z=f+(d-b)|0;c[g>>2]=z;vi(l);i=k;return}function tl(b,d,e,f,g,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;j=+j;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0;s=i;i=i+144|0;u=s+8|0;C=s;y=s+102|0;B=s+40|0;z=s+44|0;q=s+36|0;r=s+32|0;d=s+28|0;v=s+24|0;t=s+20|0;F=C;c[F>>2]=37;c[F+4>>2]=0;F=C+1|0;A=f+4|0;D=c[A>>2]|0;if((D&2048|0)!=0){a[F]=43;F=C+2|0}if((D&1024|0)!=0){a[F]=35;F=F+1|0}E=D&260;D=D>>>14;do{if((E|0)==260){a[F]=76;E=F+1|0;if((D&1|0)==0){a[E]=97;D=0;break}else{a[E]=65;D=0;break}}else{a[F]=46;a[F+1|0]=42;a[F+2|0]=76;F=F+3|0;if((E|0)==256){if((D&1|0)==0){a[F]=101;D=1;break}else{a[F]=69;D=1;break}}else if((E|0)==4){if((D&1|0)==0){a[F]=102;D=1;break}else{a[F]=70;D=1;break}}else{if((D&1|0)==0){a[F]=103;D=1;break}else{a[F]=71;D=1;break}}}}while(0);c[B>>2]=y;if((a[11832]|0)==0?(Ia(11832)|0)!=0:0){c[2956]=rb(2147483647,11840,0)|0;nb(11832)}E=c[2956]|0;if(D){c[u>>2]=c[f+8>>2];F=u+4|0;h[k>>3]=j;c[F>>2]=c[k>>2];c[F+4>>2]=c[k+4>>2];E=ll(y,30,E,C,u)|0}else{h[k>>3]=j;c[u>>2]=c[k>>2];c[u+4>>2]=c[k+4>>2];E=ll(y,30,E,C,u)|0}if((E|0)>29){E=(a[11832]|0)==0;if(D){if(E?(Ia(11832)|0)!=0:0){c[2956]=rb(2147483647,11840,0)|0;nb(11832)}F=c[2956]|0;c[u>>2]=c[f+8>>2];E=u+4|0;h[k>>3]=j;c[E>>2]=c[k>>2];c[E+4>>2]=c[k+4>>2];C=rl(B,F,C,u)|0}else{if(E?(Ia(11832)|0)!=0:0){c[2956]=rb(2147483647,11840,0)|0;nb(11832)}F=c[2956]|0;h[k>>3]=j;c[u>>2]=c[k>>2];c[u+4>>2]=c[k+4>>2];C=rl(B,F,C,u)|0}B=c[B>>2]|0;if((B|0)==0){br()}else{m=B;l=B;w=C}}else{m=c[B>>2]|0;l=0;w=E}B=m+w|0;A=c[A>>2]&176;do{if((A|0)==32){A=B}else if((A|0)==16){A=a[m]|0;if(A<<24>>24==43|A<<24>>24==45){A=m+1|0;break}if((w|0)>1&A<<24>>24==48?(F=a[m+1|0]|0,F<<24>>24==88|F<<24>>24==120):0){A=m+2|0}else{x=44}}else{x=44}}while(0);if((x|0)==44){A=m}if((m|0)!=(y|0)){w=Rq(w<<1)|0;if((w|0)==0){br()}else{o=m;n=w;p=w}}else{o=y;n=0;p=z}Qi(d,f);sl(o,A,B,p,q,r,d);Yh(c[d>>2]|0)|0;c[t>>2]=c[e>>2];E=c[q>>2]|0;F=c[r>>2]|0;c[u+0>>2]=c[t+0>>2];zd(v,u,p,E,F,f,g);F=c[v>>2]|0;c[e>>2]=F;c[b>>2]=F;if((n|0)!=0){Sq(n)}if((l|0)==0){i=s;return}Sq(l);i=s;return}function ul(b,d,e,f,g,h){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0;j=i;i=i+96|0;k=j;o=j+80|0;l=j+60|0;m=j+20|0;n=j+16|0;d=j+12|0;a[o+0|0]=a[10736|0]|0;a[o+1|0]=a[10737|0]|0;a[o+2|0]=a[10738|0]|0;a[o+3|0]=a[10739|0]|0;a[o+4|0]=a[10740|0]|0;a[o+5|0]=a[10741|0]|0;if((a[11832]|0)==0?(Ia(11832)|0)!=0:0){c[2956]=rb(2147483647,11840,0)|0;nb(11832)}q=c[2956]|0;c[k>>2]=h;o=ll(l,20,q,o,k)|0;h=l+o|0;q=c[f+4>>2]&176;do{if((q|0)==16){q=a[l]|0;if(q<<24>>24==43|q<<24>>24==45){q=l+1|0;break}if((o|0)>1&q<<24>>24==48?(s=a[l+1|0]|0,s<<24>>24==88|s<<24>>24==120):0){q=l+2|0}else{p=10}}else if((q|0)==32){q=h}else{p=10}}while(0);if((p|0)==10){q=l}Qi(n,f);r=c[n>>2]|0;if(!((c[2984]|0)==-1)){c[k>>2]=11936;c[k+4>>2]=144;c[k+8>>2]=0;qi(11936,k,145)}p=(c[11940>>2]|0)+ -1|0;s=c[r+8>>2]|0;if(!((c[r+12>>2]|0)-s>>2>>>0>p>>>0)){s=Nb(4)|0;wq(s);Ac(s|0,19896,130)}p=c[s+(p<<2)>>2]|0;if((p|0)==0){s=Nb(4)|0;wq(s);Ac(s|0,19896,130)}Yh(c[n>>2]|0)|0;Vc[c[(c[p>>2]|0)+32>>2]&31](p,l,h,m)|0;n=m+o|0;if((q|0)==(h|0)){s=n;r=c[e>>2]|0;c[d>>2]=r;c[k+0>>2]=c[d+0>>2];zd(b,k,m,s,n,f,g);i=j;return}s=m+(q-l)|0;r=c[e>>2]|0;c[d>>2]=r;c[k+0>>2]=c[d+0>>2];zd(b,k,m,s,n,f,g);i=j;return}function vl(a){a=a|0;var b=0;b=i;Yq(a);i=b;return}function wl(a){a=a|0;return}function xl(b,d,e,f,g,h){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0;k=i;i=i+32|0;m=k;n=k+28|0;l=k+24|0;j=k+12|0;if((c[f+4>>2]&1|0)==0){j=c[(c[d>>2]|0)+24>>2]|0;c[n>>2]=c[e>>2];l=h&1;c[m+0>>2]=c[n+0>>2];Xc[j&31](b,d,m,f,g,l);i=k;return}Qi(l,f);g=c[l>>2]|0;if(!((c[3022]|0)==-1)){c[m>>2]=12088;c[m+4>>2]=144;c[m+8>>2]=0;qi(12088,m,145)}d=(c[12092>>2]|0)+ -1|0;m=c[g+8>>2]|0;if(!((c[g+12>>2]|0)-m>>2>>>0>d>>>0)){f=Nb(4)|0;wq(f);Ac(f|0,19896,130)}m=c[m+(d<<2)>>2]|0;if((m|0)==0){f=Nb(4)|0;wq(f);Ac(f|0,19896,130)}Yh(c[l>>2]|0)|0;l=c[m>>2]|0;if(h){Mc[c[l+24>>2]&63](j,m)}else{Mc[c[l+28>>2]&63](j,m)}g=a[j]|0;if((g&1)==0){l=j+4|0;m=l;h=j+8|0}else{h=j+8|0;m=c[h>>2]|0;l=j+4|0}while(1){if((g&1)==0){d=l;g=(g&255)>>>1}else{d=c[h>>2]|0;g=c[l>>2]|0}if((m|0)==(d+(g<<2)|0)){break}f=c[m>>2]|0;g=c[e>>2]|0;if((g|0)!=0){n=g+24|0;d=c[n>>2]|0;if((d|0)==(c[g+28>>2]|0)){f=Yc[c[(c[g>>2]|0)+52>>2]&63](g,f)|0}else{c[n>>2]=d+4;c[d>>2]=f}if((f|0)==-1){c[e>>2]=0}}g=a[j]|0;m=m+4|0}c[b>>2]=c[e>>2];Hi(j);i=k;return}function yl(b,d,e,f,g,h){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0;m=i;i=i+128|0;l=m;s=m+116|0;p=m+104|0;o=m+20|0;q=m+16|0;k=m+12|0;d=m+8|0;n=m+4|0;a[s+0|0]=a[10728|0]|0;a[s+1|0]=a[10729|0]|0;a[s+2|0]=a[10730|0]|0;a[s+3|0]=a[10731|0]|0;a[s+4|0]=a[10732|0]|0;a[s+5|0]=a[10733|0]|0;u=s+1|0;r=f+4|0;t=c[r>>2]|0;if((t&2048|0)!=0){a[u]=43;u=s+2|0}if((t&512|0)!=0){a[u]=35;u=u+1|0}a[u]=108;u=u+1|0;v=t&74;do{if((v|0)==64){a[u]=111}else if((v|0)==8){if((t&16384|0)==0){a[u]=120;break}else{a[u]=88;break}}else{a[u]=100}}while(0);if((a[11832]|0)==0?(Ia(11832)|0)!=0:0){c[2956]=rb(2147483647,11840,0)|0;nb(11832)}v=c[2956]|0;c[l>>2]=h;s=ll(p,12,v,s,l)|0;h=p+s|0;r=c[r>>2]&176;do{if((r|0)==16){r=a[p]|0;if(r<<24>>24==43|r<<24>>24==45){r=p+1|0;break}if((s|0)>1&r<<24>>24==48?(v=a[p+1|0]|0,v<<24>>24==88|v<<24>>24==120):0){r=p+2|0}else{j=20}}else if((r|0)==32){r=h}else{j=20}}while(0);if((j|0)==20){r=p}Qi(d,f);zl(p,r,h,o,q,k,d);Yh(c[d>>2]|0)|0;c[n>>2]=c[e>>2];u=c[q>>2]|0;v=c[k>>2]|0;c[l+0>>2]=c[n+0>>2];Al(b,l,o,u,v,f,g);i=m;return}function zl(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0;k=i;i=i+32|0;o=k;l=k+12|0;r=c[j>>2]|0;if(!((c[2982]|0)==-1)){c[o>>2]=11928;c[o+4>>2]=144;c[o+8>>2]=0;qi(11928,o,145)}s=(c[11932>>2]|0)+ -1|0;n=c[r+8>>2]|0;if(!((c[r+12>>2]|0)-n>>2>>>0>s>>>0)){v=Nb(4)|0;wq(v);Ac(v|0,19896,130)}n=c[n+(s<<2)>>2]|0;if((n|0)==0){v=Nb(4)|0;wq(v);Ac(v|0,19896,130)}j=c[j>>2]|0;if(!((c[3022]|0)==-1)){c[o>>2]=12088;c[o+4>>2]=144;c[o+8>>2]=0;qi(12088,o,145)}r=(c[12092>>2]|0)+ -1|0;o=c[j+8>>2]|0;if(!((c[j+12>>2]|0)-o>>2>>>0>r>>>0)){v=Nb(4)|0;wq(v);Ac(v|0,19896,130)}j=c[o+(r<<2)>>2]|0;if((j|0)==0){v=Nb(4)|0;wq(v);Ac(v|0,19896,130)}Mc[c[(c[j>>2]|0)+20>>2]&63](l,j);o=a[l]|0;if((o&1)==0){o=(o&255)>>>1}else{o=c[l+4>>2]|0}if((o|0)!=0){c[h>>2]=f;o=a[b]|0;if(o<<24>>24==43|o<<24>>24==45){v=Yc[c[(c[n>>2]|0)+44>>2]&63](n,o)|0;o=c[h>>2]|0;c[h>>2]=o+4;c[o>>2]=v;o=b+1|0}else{o=b}if(((e-o|0)>1?(a[o]|0)==48:0)?(q=o+1|0,v=a[q]|0,v<<24>>24==88|v<<24>>24==120):0){v=Yc[c[(c[n>>2]|0)+44>>2]&63](n,48)|0;u=c[h>>2]|0;c[h>>2]=u+4;c[u>>2]=v;u=Yc[c[(c[n>>2]|0)+44>>2]&63](n,a[q]|0)|0;v=c[h>>2]|0;c[h>>2]=v+4;c[v>>2]=u;o=o+2|0}if((o|0)!=(e|0)?(p=e+ -1|0,p>>>0>o>>>0):0){q=o;do{v=a[q]|0;a[q]=a[p]|0;a[p]=v;q=q+1|0;p=p+ -1|0}while(q>>>0<p>>>0)}p=Pc[c[(c[j>>2]|0)+16>>2]&127](j)|0;if(o>>>0<e>>>0){r=l+1|0;q=l+4|0;j=l+8|0;u=0;t=0;s=o;while(1){v=(a[l]&1)==0;if((a[(v?r:c[j>>2]|0)+t|0]|0)!=0?(u|0)==(a[(v?r:c[j>>2]|0)+t|0]|0):0){u=c[h>>2]|0;c[h>>2]=u+4;c[u>>2]=p;u=a[l]|0;if((u&1)==0){v=(u&255)>>>1}else{v=c[q>>2]|0}u=0;t=(t>>>0<(v+ -1|0)>>>0)+t|0}x=Yc[c[(c[n>>2]|0)+44>>2]&63](n,a[s]|0)|0;w=c[h>>2]|0;v=w+4|0;c[h>>2]=v;c[w>>2]=x;s=s+1|0;if(s>>>0<e>>>0){u=u+1|0}else{break}}}else{v=c[h>>2]|0}h=f+(o-b<<2)|0;if((h|0)!=(v|0)?(m=v+ -4|0,m>>>0>h>>>0):0){do{x=c[h>>2]|0;c[h>>2]=c[m>>2];c[m>>2]=x;h=h+4|0;m=m+ -4|0}while(h>>>0<m>>>0)}}else{Vc[c[(c[n>>2]|0)+48>>2]&31](n,b,e,f)|0;v=f+(e-b<<2)|0;c[h>>2]=v}if((d|0)==(e|0)){x=v;c[g>>2]=x;vi(l);i=k;return}x=f+(d-b<<2)|0;c[g>>2]=x;vi(l);i=k;return}function Al(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0;l=i;i=i+16|0;m=l;k=c[d>>2]|0;if((k|0)==0){c[b>>2]=0;i=l;return}n=e;o=g-n>>2;h=h+12|0;p=c[h>>2]|0;p=(p|0)>(o|0)?p-o|0:0;o=f;q=o-n|0;n=q>>2;if((q|0)>0?(Hc[c[(c[k>>2]|0)+48>>2]&31](k,e,n)|0)!=(n|0):0){c[d>>2]=0;c[b>>2]=0;i=l;return}do{if((p|0)>0){Gi(m,p,j);if((a[m]&1)==0){j=m+4|0}else{j=c[m+8>>2]|0}if((Hc[c[(c[k>>2]|0)+48>>2]&31](k,j,p)|0)==(p|0)){Hi(m);break}c[d>>2]=0;c[b>>2]=0;Hi(m);i=l;return}}while(0);q=g-o|0;m=q>>2;if((q|0)>0?(Hc[c[(c[k>>2]|0)+48>>2]&31](k,f,m)|0)!=(m|0):0){c[d>>2]=0;c[b>>2]=0;i=l;return}c[h>>2]=0;c[b>>2]=k;i=l;return}function Bl(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0;m=i;i=i+224|0;l=m+8|0;t=m;q=m+196|0;r=m+32|0;p=m+28|0;d=m+24|0;o=m+20|0;n=m+16|0;w=t;c[w>>2]=37;c[w+4>>2]=0;w=t+1|0;s=f+4|0;u=c[s>>2]|0;if((u&2048|0)!=0){a[w]=43;w=t+2|0}if((u&512|0)!=0){a[w]=35;w=w+1|0}v=w+2|0;a[w]=108;a[w+1|0]=108;w=u&74;do{if((w|0)==64){a[v]=111}else if((w|0)==8){if((u&16384|0)==0){a[v]=120;break}else{a[v]=88;break}}else{a[v]=100}}while(0);if((a[11832]|0)==0?(Ia(11832)|0)!=0:0){c[2956]=rb(2147483647,11840,0)|0;nb(11832)}w=c[2956]|0;v=l;c[v>>2]=h;c[v+4>>2]=j;j=ll(q,22,w,t,l)|0;h=q+j|0;s=c[s>>2]&176;do{if((s|0)==16){s=a[q]|0;if(s<<24>>24==43|s<<24>>24==45){s=q+1|0;break}if((j|0)>1&s<<24>>24==48?(w=a[q+1|0]|0,w<<24>>24==88|w<<24>>24==120):0){s=q+2|0}else{k=20}}else if((s|0)==32){s=h}else{k=20}}while(0);if((k|0)==20){s=q}Qi(o,f);zl(q,s,h,r,p,d,o);Yh(c[o>>2]|0)|0;c[n>>2]=c[e>>2];v=c[p>>2]|0;w=c[d>>2]|0;c[l+0>>2]=c[n+0>>2];Al(b,l,r,v,w,f,g);i=m;return}function Cl(b,d,e,f,g,h){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0;d=i;i=i+128|0;q=d;s=d+116|0;p=d+104|0;o=d+20|0;l=d+16|0;m=d+12|0;k=d+8|0;n=d+4|0;a[s+0|0]=a[10728|0]|0;a[s+1|0]=a[10729|0]|0;a[s+2|0]=a[10730|0]|0;a[s+3|0]=a[10731|0]|0;a[s+4|0]=a[10732|0]|0;a[s+5|0]=a[10733|0]|0;u=s+1|0;r=f+4|0;t=c[r>>2]|0;if((t&2048|0)!=0){a[u]=43;u=s+2|0}if((t&512|0)!=0){a[u]=35;u=u+1|0}a[u]=108;v=u+1|0;u=t&74;do{if((u|0)==8){if((t&16384|0)==0){a[v]=120;break}else{a[v]=88;break}}else if((u|0)==64){a[v]=111}else{a[v]=117}}while(0);if((a[11832]|0)==0?(Ia(11832)|0)!=0:0){c[2956]=rb(2147483647,11840,0)|0;nb(11832)}v=c[2956]|0;c[q>>2]=h;s=ll(p,12,v,s,q)|0;h=p+s|0;r=c[r>>2]&176;do{if((r|0)==32){r=h}else if((r|0)==16){r=a[p]|0;if(r<<24>>24==43|r<<24>>24==45){r=p+1|0;break}if((s|0)>1&r<<24>>24==48?(v=a[p+1|0]|0,v<<24>>24==88|v<<24>>24==120):0){r=p+2|0}else{j=20}}else{j=20}}while(0);if((j|0)==20){r=p}Qi(k,f);zl(p,r,h,o,l,m,k);Yh(c[k>>2]|0)|0;c[n>>2]=c[e>>2];u=c[l>>2]|0;v=c[m>>2]|0;c[q+0>>2]=c[n+0>>2];Al(b,q,o,u,v,f,g);i=d;return}function Dl(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0;m=i;i=i+240|0;l=m+8|0;t=m;o=m+204|0;r=m+32|0;p=m+28|0;d=m+24|0;q=m+20|0;n=m+16|0;w=t;c[w>>2]=37;c[w+4>>2]=0;w=t+1|0;s=f+4|0;u=c[s>>2]|0;if((u&2048|0)!=0){a[w]=43;w=t+2|0}if((u&512|0)!=0){a[w]=35;w=w+1|0}v=w+2|0;a[w]=108;a[w+1|0]=108;w=u&74;do{if((w|0)==64){a[v]=111}else if((w|0)==8){if((u&16384|0)==0){a[v]=120;break}else{a[v]=88;break}}else{a[v]=117}}while(0);if((a[11832]|0)==0?(Ia(11832)|0)!=0:0){c[2956]=rb(2147483647,11840,0)|0;nb(11832)}w=c[2956]|0;v=l;c[v>>2]=h;c[v+4>>2]=j;j=ll(o,23,w,t,l)|0;h=o+j|0;s=c[s>>2]&176;do{if((s|0)==32){s=h}else if((s|0)==16){s=a[o]|0;if(s<<24>>24==43|s<<24>>24==45){s=o+1|0;break}if((j|0)>1&s<<24>>24==48?(w=a[o+1|0]|0,w<<24>>24==88|w<<24>>24==120):0){s=o+2|0}else{k=20}}else{k=20}}while(0);if((k|0)==20){s=o}Qi(q,f);zl(o,s,h,r,p,d,q);Yh(c[q>>2]|0)|0;c[n>>2]=c[e>>2];v=c[p>>2]|0;w=c[d>>2]|0;c[l+0>>2]=c[n+0>>2];Al(b,l,r,v,w,f,g);i=m;return}function El(b,d,e,f,g,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;j=+j;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0;v=i;i=i+304|0;d=v+8|0;C=v;y=v+272|0;B=v+268|0;z=v+40|0;r=v+36|0;x=v+32|0;t=v+28|0;u=v+24|0;w=v+20|0;D=C;c[D>>2]=37;c[D+4>>2]=0;D=C+1|0;A=f+4|0;F=c[A>>2]|0;if((F&2048|0)!=0){a[D]=43;D=C+2|0}if((F&1024|0)!=0){a[D]=35;D=D+1|0}E=F&260;F=F>>>14;do{if((E|0)==260){if((F&1|0)==0){a[D]=97;D=0;break}else{a[D]=65;D=0;break}}else{a[D]=46;G=D+2|0;a[D+1|0]=42;if((E|0)==256){if((F&1|0)==0){a[G]=101;D=1;break}else{a[G]=69;D=1;break}}else if((E|0)==4){if((F&1|0)==0){a[G]=102;D=1;break}else{a[G]=70;D=1;break}}else{if((F&1|0)==0){a[G]=103;D=1;break}else{a[G]=71;D=1;break}}}}while(0);c[B>>2]=y;if((a[11832]|0)==0?(Ia(11832)|0)!=0:0){c[2956]=rb(2147483647,11840,0)|0;nb(11832)}E=c[2956]|0;if(D){c[d>>2]=c[f+8>>2];G=d+4|0;h[k>>3]=j;c[G>>2]=c[k>>2];c[G+4>>2]=c[k+4>>2];E=ll(y,30,E,C,d)|0}else{h[k>>3]=j;c[d>>2]=c[k>>2];c[d+4>>2]=c[k+4>>2];E=ll(y,30,E,C,d)|0}if((E|0)>29){E=(a[11832]|0)==0;if(D){if(E?(Ia(11832)|0)!=0:0){c[2956]=rb(2147483647,11840,0)|0;nb(11832)}G=c[2956]|0;c[d>>2]=c[f+8>>2];F=d+4|0;h[k>>3]=j;c[F>>2]=c[k>>2];c[F+4>>2]=c[k+4>>2];C=rl(B,G,C,d)|0}else{if(E?(Ia(11832)|0)!=0:0){c[2956]=rb(2147483647,11840,0)|0;nb(11832)}G=c[2956]|0;c[d>>2]=c[f+8>>2];F=d+4|0;h[k>>3]=j;c[F>>2]=c[k>>2];c[F+4>>2]=c[k+4>>2];C=rl(B,G,C,d)|0}B=c[B>>2]|0;if((B|0)==0){br()}else{l=B;m=B;s=C}}else{l=c[B>>2]|0;m=0;s=E}B=l+s|0;A=c[A>>2]&176;do{if((A|0)==32){A=B}else if((A|0)==16){A=a[l]|0;if(A<<24>>24==43|A<<24>>24==45){A=l+1|0;break}if((s|0)>1&A<<24>>24==48?(G=a[l+1|0]|0,G<<24>>24==88|G<<24>>24==120):0){A=l+2|0}else{q=44}}else{q=44}}while(0);if((q|0)==44){A=l}if((l|0)!=(y|0)){q=Rq(s<<3)|0;if((q|0)==0){br()}else{p=l;n=q;o=q}}else{p=y;n=0;o=z}Qi(t,f);Fl(p,A,B,o,r,x,t);Yh(c[t>>2]|0)|0;c[w>>2]=c[e>>2];F=c[r>>2]|0;G=c[x>>2]|0;c[d+0>>2]=c[w+0>>2];Al(u,d,o,F,G,f,g);G=c[u>>2]|0;c[e>>2]=G;c[b>>2]=G;if((n|0)!=0){Sq(n)}if((m|0)==0){i=v;return}Sq(m);i=v;return}function Fl(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0;k=i;i=i+32|0;n=k;l=k+12|0;q=c[j>>2]|0;if(!((c[2982]|0)==-1)){c[n>>2]=11928;c[n+4>>2]=144;c[n+8>>2]=0;qi(11928,n,145)}m=(c[11932>>2]|0)+ -1|0;t=c[q+8>>2]|0;if(!((c[q+12>>2]|0)-t>>2>>>0>m>>>0)){y=Nb(4)|0;wq(y);Ac(y|0,19896,130)}m=c[t+(m<<2)>>2]|0;if((m|0)==0){y=Nb(4)|0;wq(y);Ac(y|0,19896,130)}j=c[j>>2]|0;if(!((c[3022]|0)==-1)){c[n>>2]=12088;c[n+4>>2]=144;c[n+8>>2]=0;qi(12088,n,145)}n=(c[12092>>2]|0)+ -1|0;q=c[j+8>>2]|0;if(!((c[j+12>>2]|0)-q>>2>>>0>n>>>0)){y=Nb(4)|0;wq(y);Ac(y|0,19896,130)}j=c[q+(n<<2)>>2]|0;if((j|0)==0){y=Nb(4)|0;wq(y);Ac(y|0,19896,130)}Mc[c[(c[j>>2]|0)+20>>2]&63](l,j);c[h>>2]=f;n=a[b]|0;if(n<<24>>24==43|n<<24>>24==45){y=Yc[c[(c[m>>2]|0)+44>>2]&63](m,n)|0;t=c[h>>2]|0;c[h>>2]=t+4;c[t>>2]=y;t=b+1|0}else{t=b}n=e;a:do{if(((n-t|0)>1?(a[t]|0)==48:0)?(p=t+1|0,y=a[p]|0,y<<24>>24==88|y<<24>>24==120):0){y=Yc[c[(c[m>>2]|0)+44>>2]&63](m,48)|0;x=c[h>>2]|0;c[h>>2]=x+4;c[x>>2]=y;t=t+2|0;x=Yc[c[(c[m>>2]|0)+44>>2]&63](m,a[p]|0)|0;y=c[h>>2]|0;c[h>>2]=y+4;c[y>>2]=x;if(t>>>0<e>>>0){p=t;while(1){q=a[p]|0;if((a[11832]|0)==0?(Ia(11832)|0)!=0:0){c[2956]=rb(2147483647,11840,0)|0;nb(11832)}u=p+1|0;if((mb(q<<24>>24|0,c[2956]|0)|0)==0){q=t;break a}if(u>>>0<e>>>0){p=u}else{q=t;p=u;break}}}else{q=t;p=t}}else{s=14}}while(0);b:do{if((s|0)==14){if(t>>>0<e>>>0){p=t;while(1){q=a[p]|0;if((a[11832]|0)==0?(Ia(11832)|0)!=0:0){c[2956]=rb(2147483647,11840,0)|0;nb(11832)}s=p+1|0;if((sb(q<<24>>24|0,c[2956]|0)|0)==0){q=t;break b}if(s>>>0<e>>>0){p=s}else{q=t;p=s;break}}}else{q=t;p=t}}}while(0);s=a[l]|0;if((s&1)==0){s=(s&255)>>>1}else{s=c[l+4>>2]|0}if((s|0)!=0){if((q|0)!=(p|0)?(r=p+ -1|0,r>>>0>q>>>0):0){s=q;do{y=a[s]|0;a[s]=a[r]|0;a[r]=y;s=s+1|0;r=r+ -1|0}while(s>>>0<r>>>0)}u=Pc[c[(c[j>>2]|0)+16>>2]&127](j)|0;if(q>>>0<p>>>0){r=l+1|0;t=l+4|0;s=l+8|0;x=0;w=0;v=q;while(1){y=(a[l]&1)==0;if((a[(y?r:c[s>>2]|0)+w|0]|0)>0?(x|0)==(a[(y?r:c[s>>2]|0)+w|0]|0):0){x=c[h>>2]|0;c[h>>2]=x+4;c[x>>2]=u;x=a[l]|0;if((x&1)==0){y=(x&255)>>>1}else{y=c[t>>2]|0}x=0;w=(w>>>0<(y+ -1|0)>>>0)+w|0}A=Yc[c[(c[m>>2]|0)+44>>2]&63](m,a[v]|0)|0;z=c[h>>2]|0;y=z+4|0;c[h>>2]=y;c[z>>2]=A;v=v+1|0;if(v>>>0<p>>>0){x=x+1|0}else{break}}}else{y=c[h>>2]|0}q=f+(q-b<<2)|0;if((q|0)!=(y|0)?(o=y+ -4|0,o>>>0>q>>>0):0){do{A=c[q>>2]|0;c[q>>2]=c[o>>2];c[o>>2]=A;q=q+4|0;o=o+ -4|0}while(q>>>0<o>>>0)}}else{Vc[c[(c[m>>2]|0)+48>>2]&31](m,q,p,c[h>>2]|0)|0;y=(c[h>>2]|0)+(p-q<<2)|0;c[h>>2]=y}c:do{if(p>>>0<e>>>0){while(1){o=a[p]|0;if(o<<24>>24==46){break}z=Yc[c[(c[m>>2]|0)+44>>2]&63](m,o)|0;A=c[h>>2]|0;y=A+4|0;c[h>>2]=y;c[A>>2]=z;p=p+1|0;if(!(p>>>0<e>>>0)){break c}}z=Pc[c[(c[j>>2]|0)+12>>2]&127](j)|0;A=c[h>>2]|0;y=A+4|0;c[h>>2]=y;c[A>>2]=z;p=p+1|0}}while(0);Vc[c[(c[m>>2]|0)+48>>2]&31](m,p,e,y)|0;m=(c[h>>2]|0)+(n-p<<2)|0;c[h>>2]=m;if((d|0)==(e|0)){A=m;c[g>>2]=A;vi(l);i=k;return}A=f+(d-b<<2)|0;c[g>>2]=A;vi(l);i=k;return}function Gl(b,d,e,f,g,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;j=+j;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0;s=i;i=i+304|0;u=s+8|0;C=s;y=s+272|0;B=s+268|0;z=s+40|0;q=s+36|0;r=s+32|0;d=s+28|0;v=s+24|0;t=s+20|0;F=C;c[F>>2]=37;c[F+4>>2]=0;F=C+1|0;A=f+4|0;D=c[A>>2]|0;if((D&2048|0)!=0){a[F]=43;F=C+2|0}if((D&1024|0)!=0){a[F]=35;F=F+1|0}E=D&260;D=D>>>14;do{if((E|0)==260){a[F]=76;E=F+1|0;if((D&1|0)==0){a[E]=97;D=0;break}else{a[E]=65;D=0;break}}else{a[F]=46;a[F+1|0]=42;a[F+2|0]=76;F=F+3|0;if((E|0)==256){if((D&1|0)==0){a[F]=101;D=1;break}else{a[F]=69;D=1;break}}else if((E|0)==4){if((D&1|0)==0){a[F]=102;D=1;break}else{a[F]=70;D=1;break}}else{if((D&1|0)==0){a[F]=103;D=1;break}else{a[F]=71;D=1;break}}}}while(0);c[B>>2]=y;if((a[11832]|0)==0?(Ia(11832)|0)!=0:0){c[2956]=rb(2147483647,11840,0)|0;nb(11832)}E=c[2956]|0;if(D){c[u>>2]=c[f+8>>2];F=u+4|0;h[k>>3]=j;c[F>>2]=c[k>>2];c[F+4>>2]=c[k+4>>2];E=ll(y,30,E,C,u)|0}else{h[k>>3]=j;c[u>>2]=c[k>>2];c[u+4>>2]=c[k+4>>2];E=ll(y,30,E,C,u)|0}if((E|0)>29){E=(a[11832]|0)==0;if(D){if(E?(Ia(11832)|0)!=0:0){c[2956]=rb(2147483647,11840,0)|0;nb(11832)}F=c[2956]|0;c[u>>2]=c[f+8>>2];E=u+4|0;h[k>>3]=j;c[E>>2]=c[k>>2];c[E+4>>2]=c[k+4>>2];C=rl(B,F,C,u)|0}else{if(E?(Ia(11832)|0)!=0:0){c[2956]=rb(2147483647,11840,0)|0;nb(11832)}F=c[2956]|0;h[k>>3]=j;c[u>>2]=c[k>>2];c[u+4>>2]=c[k+4>>2];C=rl(B,F,C,u)|0}B=c[B>>2]|0;if((B|0)==0){br()}else{m=B;l=B;w=C}}else{m=c[B>>2]|0;l=0;w=E}B=m+w|0;A=c[A>>2]&176;do{if((A|0)==32){A=B}else if((A|0)==16){A=a[m]|0;if(A<<24>>24==43|A<<24>>24==45){A=m+1|0;break}if((w|0)>1&A<<24>>24==48?(F=a[m+1|0]|0,F<<24>>24==88|F<<24>>24==120):0){A=m+2|0}else{x=44}}else{x=44}}while(0);if((x|0)==44){A=m}if((m|0)!=(y|0)){w=Rq(w<<3)|0;if((w|0)==0){br()}else{o=m;n=w;p=w}}else{o=y;n=0;p=z}Qi(d,f);Fl(o,A,B,p,q,r,d);Yh(c[d>>2]|0)|0;c[t>>2]=c[e>>2];E=c[q>>2]|0;F=c[r>>2]|0;c[u+0>>2]=c[t+0>>2];Al(v,u,p,E,F,f,g);F=c[v>>2]|0;c[e>>2]=F;c[b>>2]=F;if((n|0)!=0){Sq(n)}if((l|0)==0){i=s;return}Sq(l);i=s;return}function Hl(b,d,e,f,g,h){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0;j=i;i=i+208|0;k=j;o=j+188|0;l=j+168|0;m=j+20|0;n=j+16|0;d=j+12|0;a[o+0|0]=a[10736|0]|0;a[o+1|0]=a[10737|0]|0;a[o+2|0]=a[10738|0]|0;a[o+3|0]=a[10739|0]|0;a[o+4|0]=a[10740|0]|0;a[o+5|0]=a[10741|0]|0;if((a[11832]|0)==0?(Ia(11832)|0)!=0:0){c[2956]=rb(2147483647,11840,0)|0;nb(11832)}q=c[2956]|0;c[k>>2]=h;o=ll(l,20,q,o,k)|0;h=l+o|0;q=c[f+4>>2]&176;do{if((q|0)==16){q=a[l]|0;if(q<<24>>24==43|q<<24>>24==45){q=l+1|0;break}if((o|0)>1&q<<24>>24==48?(s=a[l+1|0]|0,s<<24>>24==88|s<<24>>24==120):0){q=l+2|0}else{p=10}}else if((q|0)==32){q=h}else{p=10}}while(0);if((p|0)==10){q=l}Qi(n,f);r=c[n>>2]|0;if(!((c[2982]|0)==-1)){c[k>>2]=11928;c[k+4>>2]=144;c[k+8>>2]=0;qi(11928,k,145)}p=(c[11932>>2]|0)+ -1|0;s=c[r+8>>2]|0;if(!((c[r+12>>2]|0)-s>>2>>>0>p>>>0)){s=Nb(4)|0;wq(s);Ac(s|0,19896,130)}p=c[s+(p<<2)>>2]|0;if((p|0)==0){s=Nb(4)|0;wq(s);Ac(s|0,19896,130)}Yh(c[n>>2]|0)|0;Vc[c[(c[p>>2]|0)+48>>2]&31](p,l,h,m)|0;n=m+(o<<2)|0;if((q|0)==(h|0)){s=n;r=c[e>>2]|0;c[d>>2]=r;c[k+0>>2]=c[d+0>>2];Al(b,k,m,s,n,f,g);i=j;return}s=m+(q-l<<2)|0;r=c[e>>2]|0;c[d>>2]=r;c[k+0>>2]=c[d+0>>2];Al(b,k,m,s,n,f,g);i=j;return}function Il(e,f,g,h,j,k,l,m,n){e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;n=n|0;var o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0;p=i;i=i+32|0;t=p;q=p+28|0;x=p+24|0;r=p+20|0;s=p+16|0;u=p+12|0;Qi(x,j);w=c[x>>2]|0;if(!((c[2984]|0)==-1)){c[t>>2]=11936;c[t+4>>2]=144;c[t+8>>2]=0;qi(11936,t,145)}y=(c[11940>>2]|0)+ -1|0;z=c[w+8>>2]|0;if(!((c[w+12>>2]|0)-z>>2>>>0>y>>>0)){D=Nb(4)|0;wq(D);Ac(D|0,19896,130)}w=c[z+(y<<2)>>2]|0;if((w|0)==0){D=Nb(4)|0;wq(D);Ac(D|0,19896,130)}Yh(c[x>>2]|0)|0;c[k>>2]=0;a:do{if((m|0)!=(n|0)){x=w+8|0;y=0;b:while(1){while(1){if((y|0)!=0){o=65;break a}y=c[g>>2]|0;if((y|0)!=0){if((c[y+12>>2]|0)==(c[y+16>>2]|0)?(Pc[c[(c[y>>2]|0)+36>>2]&127](y)|0)==-1:0){c[g>>2]=0;y=0}}else{y=0}A=(y|0)==0;z=c[h>>2]|0;do{if((z|0)!=0){if((c[z+12>>2]|0)==(c[z+16>>2]|0)?(Pc[c[(c[z>>2]|0)+36>>2]&127](z)|0)==-1:0){c[h>>2]=0;o=19;break}if(!A){o=20;break b}}else{o=19}}while(0);if((o|0)==19){o=0;if(A){o=20;break b}else{z=0}}if((Hc[c[(c[w>>2]|0)+36>>2]&31](w,a[m]|0,0)|0)<<24>>24==37){o=22;break}A=a[m]|0;if(A<<24>>24>-1?(v=c[x>>2]|0,!((b[v+(A<<24>>24<<1)>>1]&8192)==0)):0){o=33;break}z=y+12|0;B=c[z>>2]|0;A=y+16|0;if((B|0)==(c[A>>2]|0)){B=Pc[c[(c[y>>2]|0)+36>>2]&127](y)|0}else{B=d[B]|0}D=Yc[c[(c[w>>2]|0)+12>>2]&63](w,B&255)|0;if(D<<24>>24==(Yc[c[(c[w>>2]|0)+12>>2]&63](w,a[m]|0)|0)<<24>>24){o=60;break}c[k>>2]=4;y=4}c:do{if((o|0)==22){o=0;B=m+1|0;if((B|0)==(n|0)){o=23;break b}A=Hc[c[(c[w>>2]|0)+36>>2]&31](w,a[B]|0,0)|0;if(A<<24>>24==48|A<<24>>24==69){B=m+2|0;if((B|0)==(n|0)){o=26;break b}m=B;B=Hc[c[(c[w>>2]|0)+36>>2]&31](w,a[B]|0,0)|0}else{m=B;B=A;A=0}D=c[(c[f>>2]|0)+36>>2]|0;c[s>>2]=y;c[u>>2]=z;c[q+0>>2]=c[s+0>>2];c[t+0>>2]=c[u+0>>2];Oc[D&3](r,f,q,t,j,k,l,B,A);c[g>>2]=c[r>>2];m=m+1|0}else if((o|0)==33){while(1){o=0;m=m+1|0;if((m|0)==(n|0)){m=n;break}A=a[m]|0;if(!(A<<24>>24>-1)){break}if((b[v+(A<<24>>24<<1)>>1]&8192)==0){break}else{o=33}}B=z;A=z;while(1){if((y|0)!=0){if((c[y+12>>2]|0)==(c[y+16>>2]|0)?(Pc[c[(c[y>>2]|0)+36>>2]&127](y)|0)==-1:0){c[g>>2]=0;y=0}}else{y=0}C=(y|0)==0;do{if((A|0)!=0){if((c[A+12>>2]|0)!=(c[A+16>>2]|0)){if(C){z=B;break}else{break c}}if(!((Pc[c[(c[A>>2]|0)+36>>2]&127](A)|0)==-1)){if(C^(B|0)==0){z=B;A=B;break}else{break c}}else{c[h>>2]=0;z=0;o=46;break}}else{z=B;o=46}}while(0);if((o|0)==46){o=0;if(C){break c}else{A=0}}C=y+12|0;D=c[C>>2]|0;B=y+16|0;if((D|0)==(c[B>>2]|0)){D=Pc[c[(c[y>>2]|0)+36>>2]&127](y)|0}else{D=d[D]|0}if(!((D&255)<<24>>24>-1)){break c}if((b[(c[x>>2]|0)+(D<<24>>24<<1)>>1]&8192)==0){break c}D=c[C>>2]|0;if((D|0)==(c[B>>2]|0)){Pc[c[(c[y>>2]|0)+40>>2]&127](y)|0;B=z;continue}else{c[C>>2]=D+1;B=z;continue}}}else if((o|0)==60){o=0;B=c[z>>2]|0;if((B|0)==(c[A>>2]|0)){Pc[c[(c[y>>2]|0)+40>>2]&127](y)|0}else{c[z>>2]=B+1}m=m+1|0}}while(0);if((m|0)==(n|0)){o=65;break a}y=c[k>>2]|0}if((o|0)==20){c[k>>2]=4;break}else if((o|0)==23){c[k>>2]=4;break}else if((o|0)==26){c[k>>2]=4;break}}else{o=65}}while(0);if((o|0)==65){y=c[g>>2]|0}if((y|0)!=0){if((c[y+12>>2]|0)==(c[y+16>>2]|0)?(Pc[c[(c[y>>2]|0)+36>>2]&127](y)|0)==-1:0){c[g>>2]=0;y=0}}else{y=0}j=(y|0)==0;g=c[h>>2]|0;do{if((g|0)!=0){if((c[g+12>>2]|0)==(c[g+16>>2]|0)?(Pc[c[(c[g>>2]|0)+36>>2]&127](g)|0)==-1:0){c[h>>2]=0;o=75;break}if(j){c[e>>2]=y;i=p;return}}else{o=75}}while(0);if((o|0)==75?!j:0){c[e>>2]=y;i=p;return}c[k>>2]=c[k>>2]|2;c[e>>2]=y;i=p;return}function Jl(a){a=a|0;var b=0;b=i;Yq(a);i=b;return}function Kl(a){a=a|0;return}function Ll(a){a=a|0;return 2}function Ml(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0;j=i;i=i+16|0;k=j+12|0;l=j+8|0;n=j+4|0;m=j;c[n>>2]=c[d>>2];c[m>>2]=c[e>>2];c[l+0>>2]=c[n+0>>2];c[k+0>>2]=c[m+0>>2];Il(a,b,l,k,f,g,h,10840,10848|0);i=j;return}function Nl(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0;o=i;i=i+16|0;k=o+12|0;l=o+8|0;n=o+4|0;m=o;p=d+8|0;p=Pc[c[(c[p>>2]|0)+20>>2]&127](p)|0;c[n>>2]=c[e>>2];c[m>>2]=c[f>>2];e=a[p]|0;if((e&1)==0){f=p+1|0;e=(e&255)>>>1;p=p+1|0}else{q=c[p+8>>2]|0;f=q;e=c[p+4>>2]|0;p=q}q=f+e|0;c[l+0>>2]=c[n+0>>2];c[k+0>>2]=c[m+0>>2];Il(b,d,l,k,g,h,j,p,q);i=o;return}function Ol(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0;j=i;i=i+32|0;k=j;m=j+16|0;l=j+12|0;Qi(l,f);f=c[l>>2]|0;if(!((c[2984]|0)==-1)){c[k>>2]=11936;c[k+4>>2]=144;c[k+8>>2]=0;qi(11936,k,145)}o=(c[11940>>2]|0)+ -1|0;n=c[f+8>>2]|0;if(!((c[f+12>>2]|0)-n>>2>>>0>o>>>0)){o=Nb(4)|0;wq(o);Ac(o|0,19896,130)}f=c[n+(o<<2)>>2]|0;if((f|0)==0){o=Nb(4)|0;wq(o);Ac(o|0,19896,130)}Yh(c[l>>2]|0)|0;n=c[e>>2]|0;o=b+8|0;o=Pc[c[c[o>>2]>>2]&127](o)|0;c[m>>2]=n;n=o+168|0;c[k+0>>2]=c[m+0>>2];k=(jk(d,k,o,n,f,g,0)|0)-o|0;if((k|0)>=168){o=c[d>>2]|0;c[a>>2]=o;i=j;return}c[h+24>>2]=((k|0)/12|0|0)%7|0;o=c[d>>2]|0;c[a>>2]=o;i=j;return}function Pl(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0;j=i;i=i+32|0;k=j;m=j+16|0;l=j+12|0;Qi(l,f);f=c[l>>2]|0;if(!((c[2984]|0)==-1)){c[k>>2]=11936;c[k+4>>2]=144;c[k+8>>2]=0;qi(11936,k,145)}o=(c[11940>>2]|0)+ -1|0;n=c[f+8>>2]|0;if(!((c[f+12>>2]|0)-n>>2>>>0>o>>>0)){o=Nb(4)|0;wq(o);Ac(o|0,19896,130)}f=c[n+(o<<2)>>2]|0;if((f|0)==0){o=Nb(4)|0;wq(o);Ac(o|0,19896,130)}Yh(c[l>>2]|0)|0;n=c[e>>2]|0;o=b+8|0;o=Pc[c[(c[o>>2]|0)+4>>2]&127](o)|0;c[m>>2]=n;n=o+288|0;c[k+0>>2]=c[m+0>>2];k=(jk(d,k,o,n,f,g,0)|0)-o|0;if((k|0)>=288){o=c[d>>2]|0;c[a>>2]=o;i=j;return}c[h+16>>2]=((k|0)/12|0|0)%12|0;o=c[d>>2]|0;c[a>>2]=o;i=j;return}function Ql(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0;b=i;i=i+32|0;j=b;k=b+16|0;l=b+12|0;Qi(l,f);f=c[l>>2]|0;if(!((c[2984]|0)==-1)){c[j>>2]=11936;c[j+4>>2]=144;c[j+8>>2]=0;qi(11936,j,145)}n=(c[11940>>2]|0)+ -1|0;m=c[f+8>>2]|0;if(!((c[f+12>>2]|0)-m>>2>>>0>n>>>0)){n=Nb(4)|0;wq(n);Ac(n|0,19896,130)}f=c[m+(n<<2)>>2]|0;if((f|0)==0){n=Nb(4)|0;wq(n);Ac(n|0,19896,130)}Yh(c[l>>2]|0)|0;h=h+20|0;c[k>>2]=c[e>>2];c[j+0>>2]=c[k+0>>2];e=Ul(d,j,g,f,4)|0;if((c[g>>2]&4|0)!=0){n=c[d>>2]|0;c[a>>2]=n;i=b;return}if((e|0)<69){g=e+2e3|0}else{g=(e+ -69|0)>>>0<31?e+1900|0:e}c[h>>2]=g+ -1900;n=c[d>>2]|0;c[a>>2]=n;i=b;return}function Rl(b,d,e,f,g,h,j,k,l){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;var m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,_=0,$=0,aa=0,ba=0;l=i;i=i+176|0;m=l;n=l+164|0;y=l+160|0;F=l+156|0;_=l+152|0;q=l+148|0;P=l+144|0;B=l+140|0;X=l+136|0;z=l+132|0;K=l+128|0;x=l+124|0;V=l+120|0;M=l+116|0;R=l+112|0;w=l+108|0;t=l+104|0;v=l+100|0;Z=l+96|0;T=l+92|0;Y=l+88|0;I=l+84|0;A=l+80|0;H=l+76|0;L=l+72|0;S=l+68|0;W=l+64|0;U=l+60|0;G=l+56|0;O=l+52|0;$=l+48|0;E=l+44|0;C=l+40|0;D=l+36|0;J=l+32|0;N=l+28|0;s=l+24|0;u=l+20|0;r=l+16|0;Q=l+12|0;c[h>>2]=0;Qi(R,g);aa=c[R>>2]|0;if(!((c[2984]|0)==-1)){c[m>>2]=11936;c[m+4>>2]=144;c[m+8>>2]=0;qi(11936,m,145)}ba=(c[11940>>2]|0)+ -1|0;p=c[aa+8>>2]|0;if(!((c[aa+12>>2]|0)-p>>2>>>0>ba>>>0)){ba=Nb(4)|0;wq(ba);Ac(ba|0,19896,130)}p=c[p+(ba<<2)>>2]|0;if((p|0)==0){ba=Nb(4)|0;wq(ba);Ac(ba|0,19896,130)}Yh(c[R>>2]|0)|0;a:switch(k<<24>>24|0){case 106:{c[X>>2]=c[f>>2];c[m+0>>2]=c[X+0>>2];m=Ul(e,m,h,p,3)|0;d=c[h>>2]|0;if((d&4|0)==0&(m|0)<366){c[j+28>>2]=m;break a}else{c[h>>2]=d|4;break a}};case 114:{c[W>>2]=c[e>>2];c[U>>2]=c[f>>2];c[n+0>>2]=c[W+0>>2];c[m+0>>2]=c[U+0>>2];Il(S,d,n,m,g,h,j,10864,10875|0);c[e>>2]=c[S>>2];break};case 82:{c[O>>2]=c[e>>2];c[$>>2]=c[f>>2];c[n+0>>2]=c[O+0>>2];c[m+0>>2]=c[$+0>>2];Il(G,d,n,m,g,h,j,10880,10885|0);c[e>>2]=c[G>>2];break};case 77:{c[P>>2]=c[f>>2];c[m+0>>2]=c[P+0>>2];m=Ul(e,m,h,p,2)|0;d=c[h>>2]|0;if((d&4|0)==0&(m|0)<60){c[j+4>>2]=m;break a}else{c[h>>2]=d|4;break a}};case 68:{c[T>>2]=c[e>>2];c[Y>>2]=c[f>>2];c[n+0>>2]=c[T+0>>2];c[m+0>>2]=c[Y+0>>2];Il(Z,d,n,m,g,h,j,10848,10856|0);c[e>>2]=c[Z>>2];break};case 109:{c[B>>2]=c[f>>2];c[m+0>>2]=c[B+0>>2];d=Ul(e,m,h,p,2)|0;m=c[h>>2]|0;if((m&4|0)==0&(d|0)<13){c[j+16>>2]=d+ -1;break a}else{c[h>>2]=m|4;break a}};case 120:{ba=c[(c[d>>2]|0)+20>>2]|0;c[J>>2]=c[e>>2];c[N>>2]=c[f>>2];c[n+0>>2]=c[J+0>>2];c[m+0>>2]=c[N+0>>2];Jc[ba&63](b,d,n,m,g,h,j);i=l;return};case 88:{p=d+8|0;p=Pc[c[(c[p>>2]|0)+24>>2]&127](p)|0;c[u>>2]=c[e>>2];c[r>>2]=c[f>>2];q=a[p]|0;if((q&1)==0){o=p+1|0;q=(q&255)>>>1;p=p+1|0}else{ba=c[p+8>>2]|0;o=ba;q=c[p+4>>2]|0;p=ba}c[n+0>>2]=c[u+0>>2];c[m+0>>2]=c[r+0>>2];Il(s,d,n,m,g,h,j,p,o+q|0);c[e>>2]=c[s>>2];break};case 104:case 66:case 98:{aa=c[f>>2]|0;ba=d+8|0;ba=Pc[c[(c[ba>>2]|0)+4>>2]&127](ba)|0;c[V>>2]=aa;c[m+0>>2]=c[V+0>>2];h=(jk(e,m,ba,ba+288|0,p,h,0)|0)-ba|0;if((h|0)<288){c[j+16>>2]=((h|0)/12|0|0)%12|0}break};case 73:{j=j+8|0;c[z>>2]=c[f>>2];c[m+0>>2]=c[z+0>>2];d=Ul(e,m,h,p,2)|0;m=c[h>>2]|0;if((m&4|0)==0?(d+ -1|0)>>>0<12:0){c[j>>2]=d;break a}c[h>>2]=m|4;break};case 112:{j=j+8|0;g=c[f>>2]|0;d=d+8|0;d=Pc[c[(c[d>>2]|0)+8>>2]&127](d)|0;n=a[d]|0;if((n&1)==0){n=(n&255)>>>1}else{n=c[d+4>>2]|0}f=a[d+12|0]|0;if((f&1)==0){f=(f&255)>>>1}else{f=c[d+16>>2]|0}if((n|0)==(0-f|0)){c[h>>2]=c[h>>2]|4;break a}c[q>>2]=g;c[m+0>>2]=c[q+0>>2];ba=jk(e,m,d,d+24|0,p,h,0)|0;h=ba-d|0;if((ba|0)==(d|0)?(c[j>>2]|0)==12:0){c[j>>2]=0;break a}if((h|0)==12?(o=c[j>>2]|0,(o|0)<12):0){c[j>>2]=o+12}break};case 83:{c[_>>2]=c[f>>2];c[m+0>>2]=c[_+0>>2];d=Ul(e,m,h,p,2)|0;m=c[h>>2]|0;if((m&4|0)==0&(d|0)<61){c[j>>2]=d;break a}else{c[h>>2]=m|4;break a}};case 121:{j=j+20|0;c[y>>2]=c[f>>2];c[m+0>>2]=c[y+0>>2];m=Ul(e,m,h,p,4)|0;if((c[h>>2]&4|0)==0){if((m|0)<69){h=m+2e3|0}else{h=(m+ -69|0)>>>0<31?m+1900|0:m}c[j>>2]=h+ -1900}break};case 84:{c[C>>2]=c[e>>2];c[D>>2]=c[f>>2];c[n+0>>2]=c[C+0>>2];c[m+0>>2]=c[D+0>>2];Il(E,d,n,m,g,h,j,10888,10896|0);c[e>>2]=c[E>>2];break};case 119:{c[F>>2]=c[f>>2];c[m+0>>2]=c[F+0>>2];d=Ul(e,m,h,p,1)|0;m=c[h>>2]|0;if((m&4|0)==0&(d|0)<7){c[j+24>>2]=d;break a}else{c[h>>2]=m|4;break a}};case 70:{c[A>>2]=c[e>>2];c[H>>2]=c[f>>2];c[n+0>>2]=c[A+0>>2];c[m+0>>2]=c[H+0>>2];Il(I,d,n,m,g,h,j,10856,10864|0);c[e>>2]=c[I>>2];break};case 101:case 100:{j=j+12|0;c[x>>2]=c[f>>2];c[m+0>>2]=c[x+0>>2];m=Ul(e,m,h,p,2)|0;d=c[h>>2]|0;if((d&4|0)==0?(m+ -1|0)>>>0<31:0){c[j>>2]=m;break a}c[h>>2]=d|4;break};case 72:{c[K>>2]=c[f>>2];c[m+0>>2]=c[K+0>>2];m=Ul(e,m,h,p,2)|0;d=c[h>>2]|0;if((d&4|0)==0&(m|0)<24){c[j+8>>2]=m;break a}else{c[h>>2]=d|4;break a}};case 116:case 110:{c[L>>2]=c[f>>2];c[m+0>>2]=c[L+0>>2];Sl(0,e,m,h,p);break};case 65:case 97:{aa=c[f>>2]|0;ba=d+8|0;ba=Pc[c[c[ba>>2]>>2]&127](ba)|0;c[M>>2]=aa;c[m+0>>2]=c[M+0>>2];h=(jk(e,m,ba,ba+168|0,p,h,0)|0)-ba|0;if((h|0)<168){c[j+24>>2]=((h|0)/12|0|0)%7|0}break};case 99:{o=d+8|0;o=Pc[c[(c[o>>2]|0)+12>>2]&127](o)|0;c[t>>2]=c[e>>2];c[v>>2]=c[f>>2];q=a[o]|0;if((q&1)==0){p=o+1|0;q=(q&255)>>>1;o=o+1|0}else{ba=c[o+8>>2]|0;p=ba;q=c[o+4>>2]|0;o=ba}c[n+0>>2]=c[t+0>>2];c[m+0>>2]=c[v+0>>2];Il(w,d,n,m,g,h,j,o,p+q|0);c[e>>2]=c[w>>2];break};case 89:{c[n>>2]=c[f>>2];c[m+0>>2]=c[n+0>>2];m=Ul(e,m,h,p,4)|0;if((c[h>>2]&4|0)==0){c[j+20>>2]=m+ -1900}break};case 37:{c[Q>>2]=c[f>>2];c[m+0>>2]=c[Q+0>>2];Tl(0,e,m,h,p);break};default:{c[h>>2]=c[h>>2]|4}}c[b>>2]=c[e>>2];i=l;return}function Sl(a,e,f,g,h){a=a|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0;a=i;h=h+8|0;a:while(1){k=c[e>>2]|0;do{if((k|0)!=0){if((c[k+12>>2]|0)==(c[k+16>>2]|0)){if((Pc[c[(c[k>>2]|0)+36>>2]&127](k)|0)==-1){c[e>>2]=0;k=0;break}else{k=c[e>>2]|0;break}}}else{k=0}}while(0);l=(k|0)==0;k=c[f>>2]|0;do{if((k|0)!=0){if((c[k+12>>2]|0)!=(c[k+16>>2]|0)){if(l){break}else{break a}}if(!((Pc[c[(c[k>>2]|0)+36>>2]&127](k)|0)==-1)){if(l){break}else{break a}}else{c[f>>2]=0;j=12;break}}else{j=12}}while(0);if((j|0)==12){j=0;if(l){k=0;break}else{k=0}}m=c[e>>2]|0;l=c[m+12>>2]|0;if((l|0)==(c[m+16>>2]|0)){l=Pc[c[(c[m>>2]|0)+36>>2]&127](m)|0}else{l=d[l]|0}if(!((l&255)<<24>>24>-1)){break}if((b[(c[h>>2]|0)+(l<<24>>24<<1)>>1]&8192)==0){break}k=c[e>>2]|0;m=k+12|0;l=c[m>>2]|0;if((l|0)==(c[k+16>>2]|0)){Pc[c[(c[k>>2]|0)+40>>2]&127](k)|0;continue}else{c[m>>2]=l+1;continue}}h=c[e>>2]|0;do{if((h|0)!=0){if((c[h+12>>2]|0)==(c[h+16>>2]|0)){if((Pc[c[(c[h>>2]|0)+36>>2]&127](h)|0)==-1){c[e>>2]=0;h=0;break}else{h=c[e>>2]|0;break}}}else{h=0}}while(0);e=(h|0)==0;do{if((k|0)!=0){if((c[k+12>>2]|0)==(c[k+16>>2]|0)?(Pc[c[(c[k>>2]|0)+36>>2]&127](k)|0)==-1:0){c[f>>2]=0;j=32;break}if(e){i=a;return}}else{j=32}}while(0);if((j|0)==32?!e:0){i=a;return}c[g>>2]=c[g>>2]|2;i=a;return}function Tl(a,b,e,f,g){a=a|0;b=b|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0;a=i;j=c[b>>2]|0;do{if((j|0)!=0){if((c[j+12>>2]|0)==(c[j+16>>2]|0)){if((Pc[c[(c[j>>2]|0)+36>>2]&127](j)|0)==-1){c[b>>2]=0;j=0;break}else{j=c[b>>2]|0;break}}}else{j=0}}while(0);k=(j|0)==0;j=c[e>>2]|0;do{if((j|0)!=0){if((c[j+12>>2]|0)==(c[j+16>>2]|0)?(Pc[c[(c[j>>2]|0)+36>>2]&127](j)|0)==-1:0){c[e>>2]=0;h=11;break}if(!k){h=12}}else{h=11}}while(0);if((h|0)==11){if(k){h=12}else{j=0}}if((h|0)==12){c[f>>2]=c[f>>2]|6;i=a;return}l=c[b>>2]|0;k=c[l+12>>2]|0;if((k|0)==(c[l+16>>2]|0)){k=Pc[c[(c[l>>2]|0)+36>>2]&127](l)|0}else{k=d[k]|0}if(!((Hc[c[(c[g>>2]|0)+36>>2]&31](g,k&255,0)|0)<<24>>24==37)){c[f>>2]=c[f>>2]|4;i=a;return}l=c[b>>2]|0;k=l+12|0;g=c[k>>2]|0;if((g|0)==(c[l+16>>2]|0)){Pc[c[(c[l>>2]|0)+40>>2]&127](l)|0}else{c[k>>2]=g+1}g=c[b>>2]|0;do{if((g|0)!=0){if((c[g+12>>2]|0)==(c[g+16>>2]|0)){if((Pc[c[(c[g>>2]|0)+36>>2]&127](g)|0)==-1){c[b>>2]=0;g=0;break}else{g=c[b>>2]|0;break}}}else{g=0}}while(0);b=(g|0)==0;do{if((j|0)!=0){if((c[j+12>>2]|0)==(c[j+16>>2]|0)?(Pc[c[(c[j>>2]|0)+36>>2]&127](j)|0)==-1:0){c[e>>2]=0;h=31;break}if(b){i=a;return}}else{h=31}}while(0);if((h|0)==31?!b:0){i=a;return}c[f>>2]=c[f>>2]|2;i=a;return}function Ul(a,e,f,g,h){a=a|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0;j=i;l=c[a>>2]|0;do{if((l|0)!=0){if((c[l+12>>2]|0)==(c[l+16>>2]|0)){if((Pc[c[(c[l>>2]|0)+36>>2]&127](l)|0)==-1){c[a>>2]=0;l=0;break}else{l=c[a>>2]|0;break}}}else{l=0}}while(0);m=(l|0)==0;l=c[e>>2]|0;do{if((l|0)!=0){if((c[l+12>>2]|0)==(c[l+16>>2]|0)?(Pc[c[(c[l>>2]|0)+36>>2]&127](l)|0)==-1:0){c[e>>2]=0;n=11;break}if(!m){n=12}}else{n=11}}while(0);if((n|0)==11){if(m){n=12}else{l=0}}if((n|0)==12){c[f>>2]=c[f>>2]|6;q=0;i=j;return q|0}n=c[a>>2]|0;m=c[n+12>>2]|0;if((m|0)==(c[n+16>>2]|0)){n=Pc[c[(c[n>>2]|0)+36>>2]&127](n)|0}else{n=d[m]|0}m=n&255;if(m<<24>>24>-1?(k=g+8|0,!((b[(c[k>>2]|0)+(n<<24>>24<<1)>>1]&2048)==0)):0){m=(Hc[c[(c[g>>2]|0)+36>>2]&31](g,m,0)|0)<<24>>24;p=c[a>>2]|0;n=p+12|0;o=c[n>>2]|0;if((o|0)==(c[p+16>>2]|0)){Pc[c[(c[p>>2]|0)+40>>2]&127](p)|0;o=l;n=l}else{c[n>>2]=o+1;o=l;n=l}while(1){m=m+ -48|0;h=h+ -1|0;l=c[a>>2]|0;do{if((l|0)!=0){if((c[l+12>>2]|0)==(c[l+16>>2]|0)){if((Pc[c[(c[l>>2]|0)+36>>2]&127](l)|0)==-1){c[a>>2]=0;l=0;break}else{l=c[a>>2]|0;break}}}else{l=0}}while(0);p=(l|0)==0;if((n|0)!=0){if((c[n+12>>2]|0)==(c[n+16>>2]|0)){if((Pc[c[(c[n>>2]|0)+36>>2]&127](n)|0)==-1){c[e>>2]=0;l=0;n=0}else{l=o;n=o}}else{l=o}}else{l=o;n=0}o=c[a>>2]|0;if(!((p^(n|0)==0)&(h|0)>0)){n=40;break}p=c[o+12>>2]|0;if((p|0)==(c[o+16>>2]|0)){o=Pc[c[(c[o>>2]|0)+36>>2]&127](o)|0}else{o=d[p]|0}p=o&255;if(!(p<<24>>24>-1)){n=52;break}if((b[(c[k>>2]|0)+(o<<24>>24<<1)>>1]&2048)==0){n=52;break}m=((Hc[c[(c[g>>2]|0)+36>>2]&31](g,p,0)|0)<<24>>24)+(m*10|0)|0;p=c[a>>2]|0;q=p+12|0;o=c[q>>2]|0;if((o|0)==(c[p+16>>2]|0)){Pc[c[(c[p>>2]|0)+40>>2]&127](p)|0;o=l;continue}else{c[q>>2]=o+1;o=l;continue}}if((n|0)==40){do{if((o|0)!=0){if((c[o+12>>2]|0)==(c[o+16>>2]|0)){if((Pc[c[(c[o>>2]|0)+36>>2]&127](o)|0)==-1){c[a>>2]=0;o=0;break}else{o=c[a>>2]|0;break}}}else{o=0}}while(0);g=(o|0)==0;do{if((l|0)!=0){if((c[l+12>>2]|0)==(c[l+16>>2]|0)?(Pc[c[(c[l>>2]|0)+36>>2]&127](l)|0)==-1:0){c[e>>2]=0;n=50;break}if(g){q=m;i=j;return q|0}}else{n=50}}while(0);if((n|0)==50?!g:0){q=m;i=j;return q|0}c[f>>2]=c[f>>2]|2;q=m;i=j;return q|0}else if((n|0)==52){i=j;return m|0}}c[f>>2]=c[f>>2]|4;q=0;i=j;return q|0}function Vl(a,b,d,e,f,g,h,j,k){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0;m=i;i=i+32|0;r=m;o=m+28|0;t=m+24|0;p=m+20|0;q=m+16|0;n=m+12|0;Qi(t,f);v=c[t>>2]|0;if(!((c[2982]|0)==-1)){c[r>>2]=11928;c[r+4>>2]=144;c[r+8>>2]=0;qi(11928,r,145)}s=(c[11932>>2]|0)+ -1|0;u=c[v+8>>2]|0;if(!((c[v+12>>2]|0)-u>>2>>>0>s>>>0)){y=Nb(4)|0;wq(y);Ac(y|0,19896,130)}s=c[u+(s<<2)>>2]|0;if((s|0)==0){y=Nb(4)|0;wq(y);Ac(y|0,19896,130)}Yh(c[t>>2]|0)|0;c[g>>2]=0;a:do{if((j|0)!=(k|0)){t=0;b:while(1){while(1){if((t|0)!=0){l=69;break a}t=c[d>>2]|0;if((t|0)!=0){u=c[t+12>>2]|0;if((u|0)==(c[t+16>>2]|0)){u=Pc[c[(c[t>>2]|0)+36>>2]&127](t)|0}else{u=c[u>>2]|0}if((u|0)==-1){c[d>>2]=0;v=1;t=0}else{v=0}}else{v=1;t=0}u=c[e>>2]|0;do{if((u|0)!=0){w=c[u+12>>2]|0;if((w|0)==(c[u+16>>2]|0)){w=Pc[c[(c[u>>2]|0)+36>>2]&127](u)|0}else{w=c[w>>2]|0}if(!((w|0)==-1)){if(v){break}else{l=24;break b}}else{c[e>>2]=0;l=22;break}}else{l=22}}while(0);if((l|0)==22){l=0;if(v){l=24;break b}else{u=0}}if((Hc[c[(c[s>>2]|0)+52>>2]&31](s,c[j>>2]|0,0)|0)<<24>>24==37){l=26;break}if(Hc[c[(c[s>>2]|0)+12>>2]&31](s,8192,c[j>>2]|0)|0){l=36;break}u=t+12|0;w=c[u>>2]|0;v=t+16|0;if((w|0)==(c[v>>2]|0)){w=Pc[c[(c[t>>2]|0)+36>>2]&127](t)|0}else{w=c[w>>2]|0}y=Yc[c[(c[s>>2]|0)+28>>2]&63](s,w)|0;if((y|0)==(Yc[c[(c[s>>2]|0)+28>>2]&63](s,c[j>>2]|0)|0)){l=64;break}c[g>>2]=4;t=4}c:do{if((l|0)==26){l=0;w=j+4|0;if((w|0)==(k|0)){l=27;break b}v=Hc[c[(c[s>>2]|0)+52>>2]&31](s,c[w>>2]|0,0)|0;if(v<<24>>24==48|v<<24>>24==69){w=j+8|0;if((w|0)==(k|0)){l=30;break b}j=w;w=Hc[c[(c[s>>2]|0)+52>>2]&31](s,c[w>>2]|0,0)|0}else{j=w;w=v;v=0}y=c[(c[b>>2]|0)+36>>2]|0;c[q>>2]=t;c[n>>2]=u;c[o+0>>2]=c[q+0>>2];c[r+0>>2]=c[n+0>>2];Oc[y&3](p,b,o,r,f,g,h,w,v);c[d>>2]=c[p>>2];j=j+4|0}else if((l|0)==36){while(1){l=0;j=j+4|0;if((j|0)==(k|0)){j=k;break}if(Hc[c[(c[s>>2]|0)+12>>2]&31](s,8192,c[j>>2]|0)|0){l=36}else{break}}v=u;while(1){if((t|0)!=0){w=c[t+12>>2]|0;if((w|0)==(c[t+16>>2]|0)){w=Pc[c[(c[t>>2]|0)+36>>2]&127](t)|0}else{w=c[w>>2]|0}if((w|0)==-1){c[d>>2]=0;w=1;t=0}else{w=0}}else{w=1;t=0}do{if((u|0)!=0){x=c[u+12>>2]|0;if((x|0)==(c[u+16>>2]|0)){u=Pc[c[(c[u>>2]|0)+36>>2]&127](u)|0}else{u=c[x>>2]|0}if(!((u|0)==-1)){if(w^(v|0)==0){w=v;u=v;break}else{break c}}else{c[e>>2]=0;v=0;l=51;break}}else{l=51}}while(0);if((l|0)==51){l=0;if(w){break c}else{w=v;u=0}}x=t+12|0;y=c[x>>2]|0;v=t+16|0;if((y|0)==(c[v>>2]|0)){y=Pc[c[(c[t>>2]|0)+36>>2]&127](t)|0}else{y=c[y>>2]|0}if(!(Hc[c[(c[s>>2]|0)+12>>2]&31](s,8192,y)|0)){break c}y=c[x>>2]|0;if((y|0)==(c[v>>2]|0)){Pc[c[(c[t>>2]|0)+40>>2]&127](t)|0;v=w;continue}else{c[x>>2]=y+4;v=w;continue}}}else if((l|0)==64){l=0;w=c[u>>2]|0;if((w|0)==(c[v>>2]|0)){Pc[c[(c[t>>2]|0)+40>>2]&127](t)|0}else{c[u>>2]=w+4}j=j+4|0}}while(0);if((j|0)==(k|0)){l=69;break a}t=c[g>>2]|0}if((l|0)==24){c[g>>2]=4;break}else if((l|0)==27){c[g>>2]=4;break}else if((l|0)==30){c[g>>2]=4;break}}else{l=69}}while(0);if((l|0)==69){t=c[d>>2]|0}if((t|0)!=0){f=c[t+12>>2]|0;if((f|0)==(c[t+16>>2]|0)){f=Pc[c[(c[t>>2]|0)+36>>2]&127](t)|0}else{f=c[f>>2]|0}if((f|0)==-1){c[d>>2]=0;t=0;d=1}else{d=0}}else{t=0;d=1}f=c[e>>2]|0;do{if((f|0)!=0){n=c[f+12>>2]|0;if((n|0)==(c[f+16>>2]|0)){f=Pc[c[(c[f>>2]|0)+36>>2]&127](f)|0}else{f=c[n>>2]|0}if((f|0)==-1){c[e>>2]=0;l=82;break}if(d){c[a>>2]=t;i=m;return}}else{l=82}}while(0);if((l|0)==82?!d:0){c[a>>2]=t;i=m;return}c[g>>2]=c[g>>2]|2;c[a>>2]=t;i=m;return}function Wl(a){a=a|0;var b=0;b=i;Yq(a);i=b;return}function Xl(a){a=a|0;return}function Yl(a){a=a|0;return 2}function Zl(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0;j=i;i=i+16|0;k=j+12|0;l=j+8|0;n=j+4|0;m=j;c[n>>2]=c[d>>2];c[m>>2]=c[e>>2];c[l+0>>2]=c[n+0>>2];c[k+0>>2]=c[m+0>>2];Vl(a,b,l,k,f,g,h,10992,11024|0);i=j;return}function _l(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0;o=i;i=i+16|0;k=o+12|0;l=o+8|0;n=o+4|0;m=o;p=d+8|0;p=Pc[c[(c[p>>2]|0)+20>>2]&127](p)|0;c[n>>2]=c[e>>2];c[m>>2]=c[f>>2];e=a[p]|0;if((e&1)==0){f=p+4|0;e=(e&255)>>>1;p=p+4|0}else{q=c[p+8>>2]|0;f=q;e=c[p+4>>2]|0;p=q}q=f+(e<<2)|0;c[l+0>>2]=c[n+0>>2];c[k+0>>2]=c[m+0>>2];Vl(b,d,l,k,g,h,j,p,q);i=o;return}function $l(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0;j=i;i=i+32|0;k=j;m=j+16|0;l=j+12|0;Qi(l,f);f=c[l>>2]|0;if(!((c[2982]|0)==-1)){c[k>>2]=11928;c[k+4>>2]=144;c[k+8>>2]=0;qi(11928,k,145)}o=(c[11932>>2]|0)+ -1|0;n=c[f+8>>2]|0;if(!((c[f+12>>2]|0)-n>>2>>>0>o>>>0)){o=Nb(4)|0;wq(o);Ac(o|0,19896,130)}f=c[n+(o<<2)>>2]|0;if((f|0)==0){o=Nb(4)|0;wq(o);Ac(o|0,19896,130)}Yh(c[l>>2]|0)|0;n=c[e>>2]|0;o=b+8|0;o=Pc[c[c[o>>2]>>2]&127](o)|0;c[m>>2]=n;n=o+168|0;c[k+0>>2]=c[m+0>>2];k=(Ik(d,k,o,n,f,g,0)|0)-o|0;if((k|0)>=168){o=c[d>>2]|0;c[a>>2]=o;i=j;return}c[h+24>>2]=((k|0)/12|0|0)%7|0;o=c[d>>2]|0;c[a>>2]=o;i=j;return}function am(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0;j=i;i=i+32|0;k=j;m=j+16|0;l=j+12|0;Qi(l,f);f=c[l>>2]|0;if(!((c[2982]|0)==-1)){c[k>>2]=11928;c[k+4>>2]=144;c[k+8>>2]=0;qi(11928,k,145)}o=(c[11932>>2]|0)+ -1|0;n=c[f+8>>2]|0;if(!((c[f+12>>2]|0)-n>>2>>>0>o>>>0)){o=Nb(4)|0;wq(o);Ac(o|0,19896,130)}f=c[n+(o<<2)>>2]|0;if((f|0)==0){o=Nb(4)|0;wq(o);Ac(o|0,19896,130)}Yh(c[l>>2]|0)|0;n=c[e>>2]|0;o=b+8|0;o=Pc[c[(c[o>>2]|0)+4>>2]&127](o)|0;c[m>>2]=n;n=o+288|0;c[k+0>>2]=c[m+0>>2];k=(Ik(d,k,o,n,f,g,0)|0)-o|0;if((k|0)>=288){o=c[d>>2]|0;c[a>>2]=o;i=j;return}c[h+16>>2]=((k|0)/12|0|0)%12|0;o=c[d>>2]|0;c[a>>2]=o;i=j;return}function bm(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0;b=i;i=i+32|0;j=b;k=b+16|0;l=b+12|0;Qi(l,f);f=c[l>>2]|0;if(!((c[2982]|0)==-1)){c[j>>2]=11928;c[j+4>>2]=144;c[j+8>>2]=0;qi(11928,j,145)}n=(c[11932>>2]|0)+ -1|0;m=c[f+8>>2]|0;if(!((c[f+12>>2]|0)-m>>2>>>0>n>>>0)){n=Nb(4)|0;wq(n);Ac(n|0,19896,130)}f=c[m+(n<<2)>>2]|0;if((f|0)==0){n=Nb(4)|0;wq(n);Ac(n|0,19896,130)}Yh(c[l>>2]|0)|0;h=h+20|0;c[k>>2]=c[e>>2];c[j+0>>2]=c[k+0>>2];e=fm(d,j,g,f,4)|0;if((c[g>>2]&4|0)!=0){n=c[d>>2]|0;c[a>>2]=n;i=b;return}if((e|0)<69){g=e+2e3|0}else{g=(e+ -69|0)>>>0<31?e+1900|0:e}c[h>>2]=g+ -1900;n=c[d>>2]|0;c[a>>2]=n;i=b;return}function cm(b,d,e,f,g,h,j,k,l){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;var m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,_=0,$=0,aa=0,ba=0;l=i;i=i+176|0;m=l;n=l+164|0;y=l+160|0;L=l+156|0;A=l+152|0;q=l+148|0;B=l+144|0;_=l+140|0;T=l+136|0;z=l+132|0;X=l+128|0;x=l+124|0;N=l+120|0;C=l+116|0;R=l+112|0;r=l+108|0;s=l+104|0;t=l+100|0;V=l+96|0;Y=l+92|0;W=l+88|0;F=l+84|0;D=l+80|0;E=l+76|0;S=l+72|0;Q=l+68|0;O=l+64|0;P=l+60|0;I=l+56|0;$=l+52|0;H=l+48|0;M=l+44|0;Z=l+40|0;G=l+36|0;J=l+32|0;K=l+28|0;u=l+24|0;w=l+20|0;v=l+16|0;U=l+12|0;c[h>>2]=0;Qi(R,g);aa=c[R>>2]|0;if(!((c[2982]|0)==-1)){c[m>>2]=11928;c[m+4>>2]=144;c[m+8>>2]=0;qi(11928,m,145)}ba=(c[11932>>2]|0)+ -1|0;p=c[aa+8>>2]|0;if(!((c[aa+12>>2]|0)-p>>2>>>0>ba>>>0)){ba=Nb(4)|0;wq(ba);Ac(ba|0,19896,130)}p=c[p+(ba<<2)>>2]|0;if((p|0)==0){ba=Nb(4)|0;wq(ba);Ac(ba|0,19896,130)}Yh(c[R>>2]|0)|0;a:switch(k<<24>>24|0){case 72:{c[X>>2]=c[f>>2];c[m+0>>2]=c[X+0>>2];m=fm(e,m,h,p,2)|0;d=c[h>>2]|0;if((d&4|0)==0&(m|0)<24){c[j+8>>2]=m;break a}else{c[h>>2]=d|4;break a}};case 112:{j=j+8|0;g=c[f>>2]|0;d=d+8|0;d=Pc[c[(c[d>>2]|0)+8>>2]&127](d)|0;n=a[d]|0;if((n&1)==0){n=(n&255)>>>1}else{n=c[d+4>>2]|0}f=a[d+12|0]|0;if((f&1)==0){f=(f&255)>>>1}else{f=c[d+16>>2]|0}if((n|0)==(0-f|0)){c[h>>2]=c[h>>2]|4;break a}c[q>>2]=g;c[m+0>>2]=c[q+0>>2];ba=Ik(e,m,d,d+24|0,p,h,0)|0;h=ba-d|0;if((ba|0)==(d|0)?(c[j>>2]|0)==12:0){c[j>>2]=0;break a}if((h|0)==12?(o=c[j>>2]|0,(o|0)<12):0){c[j>>2]=o+12}break};case 106:{c[T>>2]=c[f>>2];c[m+0>>2]=c[T+0>>2];m=fm(e,m,h,p,3)|0;d=c[h>>2]|0;if((d&4|0)==0&(m|0)<366){c[j+28>>2]=m;break a}else{c[h>>2]=d|4;break a}};case 116:case 110:{c[S>>2]=c[f>>2];c[m+0>>2]=c[S+0>>2];dm(0,e,m,h,p);break};case 99:{p=d+8|0;p=Pc[c[(c[p>>2]|0)+12>>2]&127](p)|0;c[s>>2]=c[e>>2];c[t>>2]=c[f>>2];f=a[p]|0;if((f&1)==0){o=p+4|0;f=(f&255)>>>1;p=p+4|0}else{ba=c[p+8>>2]|0;o=ba;f=c[p+4>>2]|0;p=ba}c[n+0>>2]=c[s+0>>2];c[m+0>>2]=c[t+0>>2];Vl(r,d,n,m,g,h,j,p,o+(f<<2)|0);c[e>>2]=c[r>>2];break};case 109:{c[_>>2]=c[f>>2];c[m+0>>2]=c[_+0>>2];m=fm(e,m,h,p,2)|0;d=c[h>>2]|0;if((d&4|0)==0&(m|0)<13){c[j+16>>2]=m+ -1;break a}else{c[h>>2]=d|4;break a}};case 68:{c[Y>>2]=c[e>>2];c[W>>2]=c[f>>2];c[n+0>>2]=c[Y+0>>2];c[m+0>>2]=c[W+0>>2];Vl(V,d,n,m,g,h,j,11024,11056|0);c[e>>2]=c[V>>2];break};case 73:{j=j+8|0;c[z>>2]=c[f>>2];c[m+0>>2]=c[z+0>>2];m=fm(e,m,h,p,2)|0;d=c[h>>2]|0;if((d&4|0)==0?(m+ -1|0)>>>0<12:0){c[j>>2]=m;break a}c[h>>2]=d|4;break};case 101:case 100:{j=j+12|0;c[x>>2]=c[f>>2];c[m+0>>2]=c[x+0>>2];m=fm(e,m,h,p,2)|0;d=c[h>>2]|0;if((d&4|0)==0?(m+ -1|0)>>>0<31:0){c[j>>2]=m;break a}c[h>>2]=d|4;break};case 65:case 97:{aa=c[f>>2]|0;ba=d+8|0;ba=Pc[c[c[ba>>2]>>2]&127](ba)|0;c[C>>2]=aa;c[m+0>>2]=c[C+0>>2];h=(Ik(e,m,ba,ba+168|0,p,h,0)|0)-ba|0;if((h|0)<168){c[j+24>>2]=((h|0)/12|0|0)%7|0}break};case 77:{c[B>>2]=c[f>>2];c[m+0>>2]=c[B+0>>2];d=fm(e,m,h,p,2)|0;m=c[h>>2]|0;if((m&4|0)==0&(d|0)<60){c[j+4>>2]=d;break a}else{c[h>>2]=m|4;break a}};case 84:{c[Z>>2]=c[e>>2];c[G>>2]=c[f>>2];c[n+0>>2]=c[Z+0>>2];c[m+0>>2]=c[G+0>>2];Vl(M,d,n,m,g,h,j,11160,11192|0);c[e>>2]=c[M>>2];break};case 119:{c[L>>2]=c[f>>2];c[m+0>>2]=c[L+0>>2];m=fm(e,m,h,p,1)|0;d=c[h>>2]|0;if((d&4|0)==0&(m|0)<7){c[j+24>>2]=m;break a}else{c[h>>2]=d|4;break a}};case 89:{c[n>>2]=c[f>>2];c[m+0>>2]=c[n+0>>2];m=fm(e,m,h,p,4)|0;if((c[h>>2]&4|0)==0){c[j+20>>2]=m+ -1900}break};case 37:{c[U>>2]=c[f>>2];c[m+0>>2]=c[U+0>>2];em(0,e,m,h,p);break};case 88:{p=d+8|0;p=Pc[c[(c[p>>2]|0)+24>>2]&127](p)|0;c[w>>2]=c[e>>2];c[v>>2]=c[f>>2];f=a[p]|0;if((f&1)==0){o=p+4|0;f=(f&255)>>>1;p=p+4|0}else{ba=c[p+8>>2]|0;o=ba;f=c[p+4>>2]|0;p=ba}c[n+0>>2]=c[w+0>>2];c[m+0>>2]=c[v+0>>2];Vl(u,d,n,m,g,h,j,p,o+(f<<2)|0);c[e>>2]=c[u>>2];break};case 70:{c[D>>2]=c[e>>2];c[E>>2]=c[f>>2];c[n+0>>2]=c[D+0>>2];c[m+0>>2]=c[E+0>>2];Vl(F,d,n,m,g,h,j,11056,11088|0);c[e>>2]=c[F>>2];break};case 82:{c[$>>2]=c[e>>2];c[H>>2]=c[f>>2];c[n+0>>2]=c[$+0>>2];c[m+0>>2]=c[H+0>>2];Vl(I,d,n,m,g,h,j,11136,11156|0);c[e>>2]=c[I>>2];break};case 120:{ba=c[(c[d>>2]|0)+20>>2]|0;c[J>>2]=c[e>>2];c[K>>2]=c[f>>2];c[n+0>>2]=c[J+0>>2];c[m+0>>2]=c[K+0>>2];Jc[ba&63](b,d,n,m,g,h,j);i=l;return};case 121:{j=j+20|0;c[y>>2]=c[f>>2];c[m+0>>2]=c[y+0>>2];m=fm(e,m,h,p,4)|0;if((c[h>>2]&4|0)==0){if((m|0)<69){h=m+2e3|0}else{h=(m+ -69|0)>>>0<31?m+1900|0:m}c[j>>2]=h+ -1900}break};case 83:{c[A>>2]=c[f>>2];c[m+0>>2]=c[A+0>>2];m=fm(e,m,h,p,2)|0;d=c[h>>2]|0;if((d&4|0)==0&(m|0)<61){c[j>>2]=m;break a}else{c[h>>2]=d|4;break a}};case 104:case 66:case 98:{aa=c[f>>2]|0;ba=d+8|0;ba=Pc[c[(c[ba>>2]|0)+4>>2]&127](ba)|0;c[N>>2]=aa;c[m+0>>2]=c[N+0>>2];h=(Ik(e,m,ba,ba+288|0,p,h,0)|0)-ba|0;if((h|0)<288){c[j+16>>2]=((h|0)/12|0|0)%12|0}break};case 114:{c[O>>2]=c[e>>2];c[P>>2]=c[f>>2];c[n+0>>2]=c[O+0>>2];c[m+0>>2]=c[P+0>>2];Vl(Q,d,n,m,g,h,j,11088,11132|0);c[e>>2]=c[Q>>2];break};default:{c[h>>2]=c[h>>2]|4}}c[b>>2]=c[e>>2];i=l;return}function dm(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0;a=i;a:while(1){h=c[b>>2]|0;do{if((h|0)!=0){j=c[h+12>>2]|0;if((j|0)==(c[h+16>>2]|0)){h=Pc[c[(c[h>>2]|0)+36>>2]&127](h)|0}else{h=c[j>>2]|0}if((h|0)==-1){c[b>>2]=0;h=1;break}else{h=(c[b>>2]|0)==0;break}}else{h=1}}while(0);j=c[d>>2]|0;do{if((j|0)!=0){k=c[j+12>>2]|0;if((k|0)==(c[j+16>>2]|0)){k=Pc[c[(c[j>>2]|0)+36>>2]&127](j)|0}else{k=c[k>>2]|0}if(!((k|0)==-1)){if(h){break}else{f=j;break a}}else{c[d>>2]=0;g=15;break}}else{g=15}}while(0);if((g|0)==15){g=0;if(h){f=0;break}else{j=0}}h=c[b>>2]|0;k=c[h+12>>2]|0;if((k|0)==(c[h+16>>2]|0)){h=Pc[c[(c[h>>2]|0)+36>>2]&127](h)|0}else{h=c[k>>2]|0}if(!(Hc[c[(c[f>>2]|0)+12>>2]&31](f,8192,h)|0)){f=j;break}h=c[b>>2]|0;j=h+12|0;k=c[j>>2]|0;if((k|0)==(c[h+16>>2]|0)){Pc[c[(c[h>>2]|0)+40>>2]&127](h)|0;continue}else{c[j>>2]=k+4;continue}}h=c[b>>2]|0;do{if((h|0)!=0){j=c[h+12>>2]|0;if((j|0)==(c[h+16>>2]|0)){h=Pc[c[(c[h>>2]|0)+36>>2]&127](h)|0}else{h=c[j>>2]|0}if((h|0)==-1){c[b>>2]=0;b=1;break}else{b=(c[b>>2]|0)==0;break}}else{b=1}}while(0);do{if((f|0)!=0){h=c[f+12>>2]|0;if((h|0)==(c[f+16>>2]|0)){f=Pc[c[(c[f>>2]|0)+36>>2]&127](f)|0}else{f=c[h>>2]|0}if((f|0)==-1){c[d>>2]=0;g=37;break}if(b){i=a;return}}else{g=37}}while(0);if((g|0)==37?!b:0){i=a;return}c[e>>2]=c[e>>2]|2;i=a;return}function em(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0;a=i;j=c[b>>2]|0;do{if((j|0)!=0){h=c[j+12>>2]|0;if((h|0)==(c[j+16>>2]|0)){h=Pc[c[(c[j>>2]|0)+36>>2]&127](j)|0}else{h=c[h>>2]|0}if((h|0)==-1){c[b>>2]=0;j=1;break}else{j=(c[b>>2]|0)==0;break}}else{j=1}}while(0);h=c[d>>2]|0;do{if((h|0)!=0){k=c[h+12>>2]|0;if((k|0)==(c[h+16>>2]|0)){k=Pc[c[(c[h>>2]|0)+36>>2]&127](h)|0}else{k=c[k>>2]|0}if(!((k|0)==-1)){if(j){break}else{g=16;break}}else{c[d>>2]=0;g=14;break}}else{g=14}}while(0);if((g|0)==14){if(j){g=16}else{h=0}}if((g|0)==16){c[e>>2]=c[e>>2]|6;i=a;return}k=c[b>>2]|0;j=c[k+12>>2]|0;if((j|0)==(c[k+16>>2]|0)){j=Pc[c[(c[k>>2]|0)+36>>2]&127](k)|0}else{j=c[j>>2]|0}if(!((Hc[c[(c[f>>2]|0)+52>>2]&31](f,j,0)|0)<<24>>24==37)){c[e>>2]=c[e>>2]|4;i=a;return}j=c[b>>2]|0;k=j+12|0;f=c[k>>2]|0;if((f|0)==(c[j+16>>2]|0)){Pc[c[(c[j>>2]|0)+40>>2]&127](j)|0}else{c[k>>2]=f+4}f=c[b>>2]|0;do{if((f|0)!=0){j=c[f+12>>2]|0;if((j|0)==(c[f+16>>2]|0)){f=Pc[c[(c[f>>2]|0)+36>>2]&127](f)|0}else{f=c[j>>2]|0}if((f|0)==-1){c[b>>2]=0;b=1;break}else{b=(c[b>>2]|0)==0;break}}else{b=1}}while(0);do{if((h|0)!=0){f=c[h+12>>2]|0;if((f|0)==(c[h+16>>2]|0)){f=Pc[c[(c[h>>2]|0)+36>>2]&127](h)|0}else{f=c[f>>2]|0}if((f|0)==-1){c[d>>2]=0;g=38;break}if(b){i=a;return}}else{g=38}}while(0);if((g|0)==38?!b:0){i=a;return}c[e>>2]=c[e>>2]|2;i=a;return}function fm(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0;h=i;j=c[a>>2]|0;do{if((j|0)!=0){k=c[j+12>>2]|0;if((k|0)==(c[j+16>>2]|0)){j=Pc[c[(c[j>>2]|0)+36>>2]&127](j)|0}else{j=c[k>>2]|0}if((j|0)==-1){c[a>>2]=0;k=1;break}else{k=(c[a>>2]|0)==0;break}}else{k=1}}while(0);j=c[b>>2]|0;do{if((j|0)!=0){l=c[j+12>>2]|0;if((l|0)==(c[j+16>>2]|0)){l=Pc[c[(c[j>>2]|0)+36>>2]&127](j)|0}else{l=c[l>>2]|0}if(!((l|0)==-1)){if(k){break}else{g=16;break}}else{c[b>>2]=0;g=14;break}}else{g=14}}while(0);if((g|0)==14){if(k){g=16}else{j=0}}if((g|0)==16){c[d>>2]=c[d>>2]|6;o=0;i=h;return o|0}k=c[a>>2]|0;l=c[k+12>>2]|0;if((l|0)==(c[k+16>>2]|0)){k=Pc[c[(c[k>>2]|0)+36>>2]&127](k)|0}else{k=c[l>>2]|0}if(!(Hc[c[(c[e>>2]|0)+12>>2]&31](e,2048,k)|0)){c[d>>2]=c[d>>2]|4;o=0;i=h;return o|0}k=(Hc[c[(c[e>>2]|0)+52>>2]&31](e,k,0)|0)<<24>>24;m=c[a>>2]|0;l=m+12|0;n=c[l>>2]|0;if((n|0)==(c[m+16>>2]|0)){Pc[c[(c[m>>2]|0)+40>>2]&127](m)|0;l=j;m=j;j=k}else{c[l>>2]=n+4;l=j;m=j;j=k}while(1){j=j+ -48|0;f=f+ -1|0;n=c[a>>2]|0;do{if((n|0)!=0){k=c[n+12>>2]|0;if((k|0)==(c[n+16>>2]|0)){k=Pc[c[(c[n>>2]|0)+36>>2]&127](n)|0}else{k=c[k>>2]|0}if((k|0)==-1){c[a>>2]=0;n=1;break}else{n=(c[a>>2]|0)==0;break}}else{n=1}}while(0);do{if((m|0)!=0){k=c[m+12>>2]|0;if((k|0)==(c[m+16>>2]|0)){k=Pc[c[(c[m>>2]|0)+36>>2]&127](m)|0}else{k=c[k>>2]|0}if((k|0)==-1){c[b>>2]=0;k=0;m=0;o=1;break}else{k=l;m=l;o=(l|0)==0;break}}else{k=l;m=0;o=1}}while(0);l=c[a>>2]|0;if(!((n^o)&(f|0)>0)){break}n=c[l+12>>2]|0;if((n|0)==(c[l+16>>2]|0)){l=Pc[c[(c[l>>2]|0)+36>>2]&127](l)|0}else{l=c[n>>2]|0}if(!(Hc[c[(c[e>>2]|0)+12>>2]&31](e,2048,l)|0)){g=63;break}j=((Hc[c[(c[e>>2]|0)+52>>2]&31](e,l,0)|0)<<24>>24)+(j*10|0)|0;o=c[a>>2]|0;n=o+12|0;l=c[n>>2]|0;if((l|0)==(c[o+16>>2]|0)){Pc[c[(c[o>>2]|0)+40>>2]&127](o)|0;l=k;continue}else{c[n>>2]=l+4;l=k;continue}}if((g|0)==63){i=h;return j|0}do{if((l|0)!=0){e=c[l+12>>2]|0;if((e|0)==(c[l+16>>2]|0)){e=Pc[c[(c[l>>2]|0)+36>>2]&127](l)|0}else{e=c[e>>2]|0}if((e|0)==-1){c[a>>2]=0;a=1;break}else{a=(c[a>>2]|0)==0;break}}else{a=1}}while(0);do{if((k|0)!=0){e=c[k+12>>2]|0;if((e|0)==(c[k+16>>2]|0)){e=Pc[c[(c[k>>2]|0)+36>>2]&127](k)|0}else{e=c[e>>2]|0}if((e|0)==-1){c[b>>2]=0;g=60;break}if(a){o=j;i=h;return o|0}}else{g=60}}while(0);if((g|0)==60?!a:0){o=j;i=h;return o|0}c[d>>2]=c[d>>2]|2;o=j;i=h;return o|0}function gm(b){b=b|0;var d=0,e=0,f=0;d=i;e=b+8|0;f=c[e>>2]|0;if((a[11832]|0)==0?(Ia(11832)|0)!=0:0){c[2956]=rb(2147483647,11840,0)|0;nb(11832)}if((f|0)==(c[2956]|0)){Yq(b);i=d;return}ub(c[e>>2]|0);Yq(b);i=d;return}function hm(b){b=b|0;var d=0,e=0;d=i;b=b+8|0;e=c[b>>2]|0;if((a[11832]|0)==0?(Ia(11832)|0)!=0:0){c[2956]=rb(2147483647,11840,0)|0;nb(11832)}if((e|0)==(c[2956]|0)){i=d;return}ub(c[b>>2]|0);i=d;return}function im(b,d,e,f,g,h,j,k){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0;f=i;i=i+112|0;n=f+100|0;g=f;a[n]=37;l=n+1|0;a[l]=j;m=n+2|0;a[m]=k;a[n+3|0]=0;if(!(k<<24>>24==0)){a[l]=k;a[m]=j}n=mc(g|0,100,n|0,h|0,c[d+8>>2]|0)|0;h=g+n|0;j=c[e>>2]|0;if((n|0)==0){n=j;c[b>>2]=n;i=f;return}else{e=g;d=j}do{k=a[e]|0;do{if((d|0)!=0){g=d+24|0;l=c[g>>2]|0;if((l|0)==(c[d+28>>2]|0)){k=(Yc[c[(c[d>>2]|0)+52>>2]&63](d,k&255)|0)==-1;j=k?0:j;d=k?0:d;break}else{c[g>>2]=l+1;a[l]=k;break}}else{d=0}}while(0);e=e+1|0}while((e|0)!=(h|0));c[b>>2]=j;i=f;return}function jm(b){b=b|0;var d=0,e=0,f=0;d=i;e=b+8|0;f=c[e>>2]|0;if((a[11832]|0)==0?(Ia(11832)|0)!=0:0){c[2956]=rb(2147483647,11840,0)|0;nb(11832)}if((f|0)==(c[2956]|0)){Yq(b);i=d;return}ub(c[e>>2]|0);Yq(b);i=d;return}function km(b){b=b|0;var d=0,e=0;d=i;b=b+8|0;e=c[b>>2]|0;if((a[11832]|0)==0?(Ia(11832)|0)!=0:0){c[2956]=rb(2147483647,11840,0)|0;nb(11832)}if((e|0)==(c[2956]|0)){i=d;return}ub(c[b>>2]|0);i=d;return}function lm(a,b,d,e,f,g,h,j){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0;f=i;i=i+416|0;e=f+8|0;k=f;c[k>>2]=e+400;mm(b+8|0,e,k,g,h,j);h=c[k>>2]|0;g=c[d>>2]|0;if((e|0)==(h|0)){k=g;c[a>>2]=k;i=f;return}else{d=g}do{b=c[e>>2]|0;if((g|0)==0){g=0}else{j=g+24|0;k=c[j>>2]|0;if((k|0)==(c[g+28>>2]|0)){b=Yc[c[(c[g>>2]|0)+52>>2]&63](g,b)|0}else{c[j>>2]=k+4;c[k>>2]=b}b=(b|0)==-1;d=b?0:d;g=b?0:g}e=e+4|0}while((e|0)!=(h|0));c[a>>2]=d;i=f;return}function mm(b,d,e,f,g,h){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0;j=i;i=i+128|0;o=j+112|0;m=j+12|0;k=j;l=j+8|0;a[o]=37;p=o+1|0;a[p]=g;n=o+2|0;a[n]=h;a[o+3|0]=0;if(!(h<<24>>24==0)){a[p]=h;a[n]=g}mc(m|0,100,o|0,f|0,c[b>>2]|0)|0;g=k;c[g>>2]=0;c[g+4>>2]=0;c[l>>2]=m;g=(c[e>>2]|0)-d>>2;m=Sb(c[b>>2]|0)|0;k=hq(d,l,g,k)|0;if((m|0)!=0){Sb(m|0)|0}if((k|0)==-1){jn(12816)}else{c[e>>2]=d+(k<<2);i=j;return}}function nm(a){a=a|0;var b=0;b=i;Yq(a);i=b;return}function om(a){a=a|0;return}function pm(a){a=a|0;return 127}function qm(a){a=a|0;return 127}function rm(a,b){a=a|0;b=b|0;b=i;c[a+0>>2]=0;c[a+4>>2]=0;c[a+8>>2]=0;i=b;return}function sm(a,b){a=a|0;b=b|0;b=i;c[a+0>>2]=0;c[a+4>>2]=0;c[a+8>>2]=0;i=b;return}function tm(a,b){a=a|0;b=b|0;b=i;c[a+0>>2]=0;c[a+4>>2]=0;c[a+8>>2]=0;i=b;return}function um(a,b){a=a|0;b=b|0;b=i;ui(a,1,45);i=b;return}function vm(a){a=a|0;return 0}function wm(b,c){b=b|0;c=c|0;a[b]=67109634;a[b+1|0]=262147;a[b+2|0]=1024;a[b+3|0]=4;return}function xm(b,c){b=b|0;c=c|0;a[b]=67109634;a[b+1|0]=262147;a[b+2|0]=1024;a[b+3|0]=4;return}function ym(a){a=a|0;var b=0;b=i;Yq(a);i=b;return}function zm(a){a=a|0;return}function Am(a){a=a|0;return 127}function Bm(a){a=a|0;return 127}function Cm(a,b){a=a|0;b=b|0;b=i;c[a+0>>2]=0;c[a+4>>2]=0;c[a+8>>2]=0;i=b;return}function Dm(a,b){a=a|0;b=b|0;b=i;c[a+0>>2]=0;c[a+4>>2]=0;c[a+8>>2]=0;i=b;return}function Em(a,b){a=a|0;b=b|0;b=i;c[a+0>>2]=0;c[a+4>>2]=0;c[a+8>>2]=0;i=b;return}function Fm(a,b){a=a|0;b=b|0;b=i;ui(a,1,45);i=b;return}function Gm(a){a=a|0;return 0}function Hm(b,c){b=b|0;c=c|0;a[b]=67109634;a[b+1|0]=262147;a[b+2|0]=1024;a[b+3|0]=4;return}function Im(b,c){b=b|0;c=c|0;a[b]=67109634;a[b+1|0]=262147;a[b+2|0]=1024;a[b+3|0]=4;return}function Jm(a){a=a|0;var b=0;b=i;Yq(a);i=b;return}function Km(a){a=a|0;return}function Lm(a){a=a|0;return 2147483647}function Mm(a){a=a|0;return 2147483647}function Nm(a,b){a=a|0;b=b|0;b=i;c[a+0>>2]=0;c[a+4>>2]=0;c[a+8>>2]=0;i=b;return}function Om(a,b){a=a|0;b=b|0;b=i;c[a+0>>2]=0;c[a+4>>2]=0;c[a+8>>2]=0;i=b;return}function Pm(a,b){a=a|0;b=b|0;b=i;c[a+0>>2]=0;c[a+4>>2]=0;c[a+8>>2]=0;i=b;return}function Qm(a,b){a=a|0;b=b|0;b=i;Gi(a,1,45);i=b;return}function Rm(a){a=a|0;return 0}function Sm(b,c){b=b|0;c=c|0;a[b]=67109634;a[b+1|0]=262147;a[b+2|0]=1024;a[b+3|0]=4;return}function Tm(b,c){b=b|0;c=c|0;a[b]=67109634;a[b+1|0]=262147;a[b+2|0]=1024;a[b+3|0]=4;return}function Um(a){a=a|0;var b=0;b=i;Yq(a);i=b;return}function Vm(a){a=a|0;return}function Wm(a){a=a|0;return 2147483647}function Xm(a){a=a|0;return 2147483647}function Ym(a,b){a=a|0;b=b|0;b=i;c[a+0>>2]=0;c[a+4>>2]=0;c[a+8>>2]=0;i=b;return}function Zm(a,b){a=a|0;b=b|0;b=i;c[a+0>>2]=0;c[a+4>>2]=0;c[a+8>>2]=0;i=b;return}function _m(a,b){a=a|0;b=b|0;b=i;c[a+0>>2]=0;c[a+4>>2]=0;c[a+8>>2]=0;i=b;return}function $m(a,b){a=a|0;b=b|0;b=i;Gi(a,1,45);i=b;return}function an(a){a=a|0;return 0}function bn(b,c){b=b|0;c=c|0;a[b]=67109634;a[b+1|0]=262147;a[b+2|0]=1024;a[b+3|0]=4;return}function cn(b,c){b=b|0;c=c|0;a[b]=67109634;a[b+1|0]=262147;a[b+2|0]=1024;a[b+3|0]=4;return}function dn(a){a=a|0;var b=0;b=i;Yq(a);i=b;return}function en(a){a=a|0;return}function fn(b,d,e,f,g,h,j,k){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0;l=i;i=i+256|0;r=l;x=l+144|0;d=l+24|0;t=l+20|0;o=l+16|0;v=l+142|0;w=l+12|0;s=l+132|0;q=l+32|0;c[d>>2]=x;n=d+4|0;c[n>>2]=146;x=x+100|0;Qi(o,h);y=c[o>>2]|0;if(!((c[2984]|0)==-1)){c[r>>2]=11936;c[r+4>>2]=144;c[r+8>>2]=0;qi(11936,r,145)}A=(c[11940>>2]|0)+ -1|0;z=c[y+8>>2]|0;if(!((c[y+12>>2]|0)-z>>2>>>0>A>>>0)){A=Nb(4)|0;wq(A);Ac(A|0,19896,130)}y=c[z+(A<<2)>>2]|0;if((y|0)==0){A=Nb(4)|0;wq(A);Ac(A|0,19896,130)}a[v]=0;c[w>>2]=c[f>>2];A=c[h+4>>2]|0;c[r+0>>2]=c[w+0>>2];if(hn(e,r,g,o,A,j,v,y,d,t,x)|0){Vc[c[(c[y>>2]|0)+32>>2]&31](y,11552,11562|0,s)|0;h=c[t>>2]|0;g=c[d>>2]|0;w=h-g|0;if((w|0)>98){w=Rq(w+2|0)|0;if((w|0)==0){br()}else{p=w;u=w}}else{p=0;u=q}if((a[v]|0)!=0){a[u]=45;u=u+1|0}if(g>>>0<h>>>0){h=s+10|0;v=s;do{y=a[g]|0;w=s;while(1){x=w+1|0;if((a[w]|0)==y<<24>>24){break}if((x|0)==(h|0)){w=h;break}else{w=x}}a[u]=a[11552+(w-v)|0]|0;g=g+1|0;u=u+1|0}while(g>>>0<(c[t>>2]|0)>>>0)}a[u]=0;c[r>>2]=k;if((nc(q|0,11568,r|0)|0)!=1){A=Nb(8)|0;ci(A,11576);Ac(A|0,8944,44)}if((p|0)!=0){Sq(p)}}k=c[e>>2]|0;if((k|0)!=0){if((c[k+12>>2]|0)==(c[k+16>>2]|0)?(Pc[c[(c[k>>2]|0)+36>>2]&127](k)|0)==-1:0){c[e>>2]=0;e=0}else{e=k}}else{e=0}k=(e|0)==0;p=c[f>>2]|0;do{if((p|0)!=0){if((c[p+12>>2]|0)!=(c[p+16>>2]|0)){if(k){break}else{m=33;break}}if(!((Pc[c[(c[p>>2]|0)+36>>2]&127](p)|0)==-1)){if(k){break}else{m=33;break}}else{c[f>>2]=0;m=31;break}}else{m=31}}while(0);if((m|0)==31?k:0){m=33}if((m|0)==33){c[j>>2]=c[j>>2]|2}c[b>>2]=e;Yh(c[o>>2]|0)|0;j=c[d>>2]|0;c[d>>2]=0;if((j|0)==0){i=l;return}Lc[c[n>>2]&255](j);i=l;return}function gn(a){a=a|0;return}



function $c(a){a=a|0;var b=0;b=i;i=i+a|0;i=i+7&-8;return b|0}function ad(){return i|0}function bd(a){a=a|0;i=a}function cd(a,b){a=a|0;b=b|0;if((t|0)==0){t=a;u=b}}function dd(b){b=b|0;a[k]=a[b];a[k+1|0]=a[b+1|0];a[k+2|0]=a[b+2|0];a[k+3|0]=a[b+3|0]}function ed(b){b=b|0;a[k]=a[b];a[k+1|0]=a[b+1|0];a[k+2|0]=a[b+2|0];a[k+3|0]=a[b+3|0];a[k+4|0]=a[b+4|0];a[k+5|0]=a[b+5|0];a[k+6|0]=a[b+6|0];a[k+7|0]=a[b+7|0]}function fd(a){a=a|0;I=a}function gd(a){a=a|0;J=a}function hd(a){a=a|0;K=a}function id(a){a=a|0;L=a}function jd(a){a=a|0;M=a}function kd(a){a=a|0;N=a}function ld(a){a=a|0;O=a}function md(a){a=a|0;P=a}function nd(a){a=a|0;Q=a}function od(a){a=a|0;R=a}function pd(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0;h=i;i=i+32|0;f=h+16|0;j=h+8|0;e=h+4|0;g=h;a[j]=0;c[j+4>>2]=b;n=c[(c[b>>2]|0)+ -12>>2]|0;if((c[b+(n+16)>>2]|0)!=0){Hj(j);i=h;return b|0}k=c[b+(n+72)>>2]|0;if((k|0)!=0){wj(k)|0;n=c[(c[b>>2]|0)+ -12>>2]|0}a[j]=1;k=rr(d|0)|0;c[e>>2]=c[b+(n+24)>>2];if((c[b+(n+4)>>2]&176|0)==32){l=d+k|0}else{l=d}m=b+n|0;o=b+(n+76)|0;n=c[o>>2]|0;if((n|0)==-1){Qi(f,m);n=$n(f,11936)|0;n=Yc[c[(c[n>>2]|0)+28>>2]&63](n,32)|0;_n(f);n=n<<24>>24;c[o>>2]=n}o=n&255;n=d+k|0;c[f+0>>2]=c[e+0>>2];zd(g,f,d,l,n,m,o);if((c[g>>2]|0)!=0){Hj(j);i=h;return b|0}o=c[(c[b>>2]|0)+ -12>>2]|0;Oi(b+o|0,c[b+(o+16)>>2]|5);Hj(j);i=h;return b|0}function qd(a){a=a|0;Sa(a|0)|0;Ha()}function rd(b){b=b|0;var d=0;d=i;c[b>>2]=16;if(!((a[b+32|0]&1)==0)){Yq(c[b+40>>2]|0)}c[b>>2]=9208;_n(b+4|0);i=d;return}function sd(b){b=b|0;var d=0;d=i;c[b>>2]=16;if(!((a[b+32|0]&1)==0)){Yq(c[b+40>>2]|0)}c[b>>2]=9208;_n(b+4|0);Yq(b);i=d;return}function td(b,d,e,f,g,h){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0;l=i;o=d+44|0;m=c[o>>2]|0;k=d+24|0;j=c[k>>2]|0;if(m>>>0<j>>>0){c[o>>2]=j;m=j}o=h&24;do{if((o|0)==24){if((g|0)==2){n=11;break}else if((g|0)==0){g=0;o=0;break}else if((g|0)!=1){n=15;break}o=b;c[o>>2]=0;c[o+4>>2]=0;o=b+8|0;c[o>>2]=-1;c[o+4>>2]=-1;i=l;return}else if((o|0)!=0){if((g|0)==2){n=11;break}else if((g|0)==0){g=0;o=0;break}else if((g|0)!=1){n=15;break}if((h&8|0)==0){o=j-(c[d+20>>2]|0)|0;g=o;o=((o|0)<0)<<31>>31;break}else{o=(c[d+12>>2]|0)-(c[d+8>>2]|0)|0;g=o;o=((o|0)<0)<<31>>31;break}}else{o=b;c[o>>2]=0;c[o+4>>2]=0;o=b+8|0;c[o>>2]=-1;c[o+4>>2]=-1;i=l;return}}while(0);if((n|0)==15){o=b;c[o>>2]=0;c[o+4>>2]=0;o=b+8|0;c[o>>2]=-1;c[o+4>>2]=-1;i=l;return}if((n|0)==11){n=d+32|0;if((a[n]&1)==0){n=n+1|0}else{n=c[d+40>>2]|0}o=m-n|0;g=o;o=((o|0)<0)<<31>>31}f=qr(g|0,o|0,e|0,f|0)|0;e=I;if((e|0)>=0){n=d+32|0;if((a[n]&1)==0){n=n+1|0}else{n=c[d+40>>2]|0}o=m-n|0;g=((o|0)<0)<<31>>31;if(!((g|0)<(e|0)|(g|0)==(e|0)&o>>>0<f>>>0)){n=h&8;if(!((f|0)==0&(e|0)==0)){if((n|0)!=0?(c[d+12>>2]|0)==0:0){o=b;c[o>>2]=0;c[o+4>>2]=0;o=b+8|0;c[o>>2]=-1;c[o+4>>2]=-1;i=l;return}if((h&16|0)!=0&(j|0)==0){o=b;c[o>>2]=0;c[o+4>>2]=0;o=b+8|0;c[o>>2]=-1;c[o+4>>2]=-1;i=l;return}}if((n|0)!=0){c[d+12>>2]=(c[d+8>>2]|0)+f;c[d+16>>2]=m}if((h&16|0)!=0){c[k>>2]=(c[d+20>>2]|0)+f}o=b;c[o>>2]=0;c[o+4>>2]=0;o=b+8|0;c[o>>2]=f;c[o+4>>2]=e;i=l;return}}o=b;c[o>>2]=0;c[o+4>>2]=0;o=b+8|0;c[o>>2]=-1;c[o+4>>2]=-1;i=l;return}function ud(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;var f=0;f=i;d=d+8|0;Xc[c[(c[b>>2]|0)+16>>2]&31](a,b,c[d>>2]|0,c[d+4>>2]|0,0,e);i=f;return}function vd(a){a=a|0;var b=0,e=0,f=0,g=0;b=i;f=a+44|0;g=c[f>>2]|0;e=c[a+24>>2]|0;if(g>>>0<e>>>0){c[f>>2]=e}else{e=g}if((c[a+48>>2]&8|0)==0){g=-1;i=b;return g|0}f=a+16|0;g=c[f>>2]|0;a=c[a+12>>2]|0;if(g>>>0<e>>>0){c[f>>2]=e}else{e=g}if(!(a>>>0<e>>>0)){g=-1;i=b;return g|0}g=d[a]|0;i=b;return g|0}function wd(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0;e=i;g=b+44|0;f=c[g>>2]|0;j=c[b+24>>2]|0;if(f>>>0<j>>>0){c[g>>2]=j}else{j=f}f=b+8|0;g=c[f>>2]|0;h=b+12|0;l=c[h>>2]|0;if(!(g>>>0<l>>>0)){l=-1;i=e;return l|0}if((d|0)==-1){c[f>>2]=g;c[h>>2]=l+ -1;c[b+16>>2]=j;l=0;i=e;return l|0}if((c[b+48>>2]&16|0)==0){k=d&255;l=l+ -1|0;if(!(k<<24>>24==(a[l]|0))){l=-1;i=e;return l|0}}else{k=d&255;l=l+ -1|0}c[f>>2]=g;c[h>>2]=l;c[b+16>>2]=j;a[l]=k;l=d;i=e;return l|0}function xd(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0;j=i;if((d|0)==-1){u=0;i=j;return u|0}g=b+12|0;e=b+8|0;f=(c[g>>2]|0)-(c[e>>2]|0)|0;h=b+24|0;n=c[h>>2]|0;k=b+28|0;m=c[k>>2]|0;if((n|0)==(m|0)){l=b+48|0;if((c[l>>2]&16|0)==0){u=-1;i=j;return u|0}m=b+20|0;p=c[m>>2]|0;o=n-p|0;n=b+44|0;p=(c[n>>2]|0)-p|0;q=b+32|0;r=a[q]|0;t=(r&1)!=0;if(t){s=(c[q>>2]&-2)+ -1|0;r=c[b+36>>2]|0}else{s=10;r=(r&255)>>>1}if((r|0)==(s|0)){Ei(q,s,1,s,s,0,0);if((a[q]&1)==0){s=11}else{s=12}}else{if(t){s=12}else{s=11}}if((s|0)==11){a[q]=(r<<1)+2;u=q+1|0;t=r+1|0}else if((s|0)==12){u=c[b+40>>2]|0;t=r+1|0;c[b+36>>2]=t}a[u+r|0]=0;a[u+t|0]=0;t=a[q]|0;if((t&1)==0){r=10}else{r=c[q>>2]|0;t=r&255;r=(r&-2)+ -1|0}s=(t&1)==0;if(s){t=(t&255)>>>1}else{t=c[b+36>>2]|0}do{if(!(t>>>0<r>>>0)){if(s){a[q+r+1|0]=0;a[q]=r<<1;break}else{a[(c[b+40>>2]|0)+r|0]=0;c[b+36>>2]=r;break}}else{zi(q,r-t|0,0)|0}}while(0);r=a[q]|0;if((r&1)==0){q=q+1|0;r=(r&255)>>>1}else{q=c[b+40>>2]|0;r=c[b+36>>2]|0}t=q+r|0;c[m>>2]=q;c[k>>2]=t;u=q+o|0;c[h>>2]=u;o=q+p|0;c[n>>2]=o;k=t;n=u}else{l=b+48|0;k=m;o=c[b+44>>2]|0}m=n+1|0;o=m>>>0<o>>>0?o:m;c[b+44>>2]=o;if((c[l>>2]&8|0)!=0){l=b+32|0;if((a[l]&1)==0){l=l+1|0}else{l=c[b+40>>2]|0}c[e>>2]=l;c[g>>2]=l+f;c[b+16>>2]=o}if((n|0)==(k|0)){u=Yc[c[(c[b>>2]|0)+52>>2]&63](b,d&255)|0;i=j;return u|0}else{c[h>>2]=m;a[n]=d;u=d&255;i=j;return u|0}return 0}function yd(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0;e=i;f=b+32|0;wi(f,d)|0;g=b+44|0;c[g>>2]=0;d=b+48|0;h=c[d>>2]|0;if((h&8|0)!=0){j=a[f]|0;if((j&1)==0){l=f+((j&255)>>>1)+1|0;c[g>>2]=l;k=f+1|0;j=f+1|0}else{l=(c[b+40>>2]|0)+(c[b+36>>2]|0)|0;c[g>>2]=l;j=c[b+40>>2]|0;k=j}c[b+8>>2]=k;c[b+12>>2]=j;c[b+16>>2]=l}if((h&16|0)==0){i=e;return}k=a[f]|0;if((k&1)==0){l=(k&255)>>>1;c[g>>2]=f+l+1;h=10;g=l}else{l=c[b+36>>2]|0;c[g>>2]=(c[b+40>>2]|0)+l;h=c[f>>2]|0;k=h&255;h=(h&-2)+ -1|0;g=l}j=(k&1)==0;if(j){k=(k&255)>>>1}else{k=c[b+36>>2]|0}do{if(!(k>>>0<h>>>0)){if(j){a[f+h+1|0]=0;a[f]=h<<1;break}else{a[(c[b+40>>2]|0)+h|0]=0;c[b+36>>2]=h;break}}else{zi(f,h-k|0,0)|0}}while(0);j=a[f]|0;if((j&1)==0){h=f+1|0;j=(j&255)>>>1;k=f+1|0}else{k=c[b+40>>2]|0;h=k;j=c[b+36>>2]|0}f=b+24|0;c[f>>2]=k;c[b+20>>2]=k;c[b+28>>2]=h+j;if((c[d>>2]&3|0)==0){i=e;return}c[f>>2]=k+g;i=e;return}function zd(b,d,e,f,g,h,j){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0;l=i;i=i+16|0;m=l;k=c[d>>2]|0;if((k|0)==0){c[b>>2]=0;i=l;return}p=e;n=g-p|0;h=h+12|0;o=c[h>>2]|0;n=(o|0)>(n|0)?o-n|0:0;o=f;p=o-p|0;if((p|0)>0?(Hc[c[(c[k>>2]|0)+48>>2]&31](k,e,p)|0)!=(p|0):0){c[d>>2]=0;c[b>>2]=0;i=l;return}do{if((n|0)>0){if(n>>>0<11){q=n<<1&255;a[m]=q;e=m;p=m+1|0}else{q=n+16&-16;p=Wq(q)|0;c[m+8>>2]=p;q=q|1;c[m>>2]=q;c[m+4>>2]=n;e=m;q=q&255}wr(p|0,j|0,n|0)|0;a[p+n|0]=0;if((q&1)==0){j=m+1|0}else{j=c[m+8>>2]|0}if((Hc[c[(c[k>>2]|0)+48>>2]&31](k,j,n)|0)==(n|0)){if((a[e]&1)==0){break}Yq(c[m+8>>2]|0);break}c[d>>2]=0;c[b>>2]=0;if((a[e]&1)==0){i=l;return}Yq(c[m+8>>2]|0);i=l;return}}while(0);m=g-o|0;if((m|0)>0?(Hc[c[(c[k>>2]|0)+48>>2]&31](k,f,m)|0)!=(m|0):0){c[d>>2]=0;c[b>>2]=0;i=l;return}c[h>>2]=0;c[b>>2]=k;i=l;return}function Ad(b){b=b|0;var d=0,e=0;d=i;c[b>>2]=172;c[b+56>>2]=192;e=b+4|0;c[e>>2]=16;if(!((a[b+36|0]&1)==0)){Yq(c[b+44>>2]|0)}c[e>>2]=9208;_n(b+8|0);Pi(b+56|0);i=d;return}function Bd(b){b=b|0;var d=0,e=0,f=0,g=0;d=i;f=c[(c[b>>2]|0)+ -12>>2]|0;c[b+f>>2]=172;e=b+(f+56)|0;c[e>>2]=192;g=b+(f+4)|0;c[g>>2]=16;if(!((a[b+(f+36)|0]&1)==0)){Yq(c[b+(f+44)>>2]|0)}c[g>>2]=9208;_n(b+(f+8)|0);Pi(e);i=d;return}function Cd(b){b=b|0;var d=0,e=0;d=i;c[b>>2]=172;c[b+56>>2]=192;e=b+4|0;c[e>>2]=16;if(!((a[b+36|0]&1)==0)){Yq(c[b+44>>2]|0)}c[e>>2]=9208;_n(b+8|0);Pi(b+56|0);Yq(b);i=d;return}function Dd(b){b=b|0;var d=0,e=0,f=0,g=0,h=0;d=i;g=c[(c[b>>2]|0)+ -12>>2]|0;e=b+g|0;c[e>>2]=172;f=b+(g+56)|0;c[f>>2]=192;h=b+(g+4)|0;c[h>>2]=16;if(!((a[b+(g+36)|0]&1)==0)){Yq(c[b+(g+44)>>2]|0)}c[h>>2]=9208;_n(b+(g+8)|0);Pi(f);Yq(e);i=d;return}function Ed(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0;e=i;f=c[d+48>>2]|0;if((f&16|0)!=0){h=d+44|0;g=c[h>>2]|0;f=c[d+24>>2]|0;if(g>>>0<f>>>0){c[h>>2]=f}else{f=g}g=c[d+20>>2]|0;d=g;h=f-d|0;if(h>>>0>4294967279){ri(0)}if(h>>>0<11){a[b]=h<<1;b=b+1|0}else{k=h+16&-16;j=Wq(k)|0;c[b+8>>2]=j;c[b>>2]=k|1;c[b+4>>2]=h;b=j}if((g|0)!=(f|0)){h=b;while(1){a[h]=a[g]|0;g=g+1|0;if((g|0)==(f|0)){break}else{h=h+1|0}}b=b+(f+(0-d))|0}a[b]=0;i=e;return}if((f&8|0)==0){c[b+0>>2]=0;c[b+4>>2]=0;c[b+8>>2]=0;i=e;return}g=c[d+8>>2]|0;d=c[d+16>>2]|0;f=g;h=d-f|0;if(h>>>0>4294967279){ri(0)}if(h>>>0<11){a[b]=h<<1;b=b+1|0}else{j=h+16&-16;k=Wq(j)|0;c[b+8>>2]=k;c[b>>2]=j|1;c[b+4>>2]=h;b=k}if((g|0)!=(d|0)){h=b;while(1){a[h]=a[g]|0;g=g+1|0;if((g|0)==(d|0)){break}else{h=h+1|0}}b=b+(d+(0-f))|0}a[b]=0;i=e;return}function Fd(b){b=b|0;var d=0,e=0,f=0,g=0,h=0;d=i;i=i+16|0;e=d;f=b+4|0;c[b>>2]=300;c[b+56>>2]=320;Ri(b+56|0,f);c[b+128>>2]=0;c[b+132>>2]=-1;c[b>>2]=172;c[b+56>>2]=192;c[f>>2]=9208;Yn(b+8|0);h=b+12|0;c[h+0>>2]=0;c[h+4>>2]=0;c[h+8>>2]=0;c[h+12>>2]=0;c[h+16>>2]=0;c[h+20>>2]=0;c[f>>2]=16;h=b+36|0;g=b+52|0;c[h+0>>2]=0;c[h+4>>2]=0;c[h+8>>2]=0;c[h+12>>2]=0;c[g>>2]=16;c[e+0>>2]=0;c[e+4>>2]=0;c[e+8>>2]=0;yd(f,e);if((a[e]&1)==0){h=b+136|0;c[h+0>>2]=0;c[h+4>>2]=0;c[h+8>>2]=0;i=d;return}Yq(c[e+8>>2]|0);h=b+136|0;c[h+0>>2]=0;c[h+4>>2]=0;c[h+8>>2]=0;i=d;return}function Gd(a){a=a|0;Na((c[a>>2]|0)+148|0,1)}function Hd(a,b){a=a|0;b=b|0;var d=0,e=0;d=i;e=c[a+340>>2]|0;if(!((((c[a+344>>2]|0)-e|0)/12|0)>>>0>b>>>0)){a=0;i=d;return a|0}a=c[e+(b*12|0)>>2]|0;i=d;return a|0}function Id(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0,h=0,j=0;d=i;i=i+16|0;f=i;i=i+168|0;c[f>>2]=0;e=d;t=0;h=ka(29,a+4|0,b|0,328)|0;j=t;t=0;if((j|0)!=0&(u|0)!=0){g=tr(c[j>>2]|0,f)|0;if((g|0)==0){Na(j|0,u|0)}I=u}else{g=-1}do{if((g|0)!=1){if(!h){g=a+352|0;sr(a+500|0,1,f|0)|0;t=0;h=t;t=0;if((h|0)!=0&(u|0)!=0){a=tr(c[h>>2]|0,f)|0;if((a|0)==0){Na(h|0,u|0)}I=u}else{a=-1}if((a|0)==1){a=I;break}a=0;break}h=c[a+340>>2]|0;g=a+344|0;j=c[g>>2]|0;if((j|0)!=(h|0)){c[g>>2]=j+(~(((j+ -12+(0-h)|0)>>>0)/12|0)*12|0)}t=0;h=ka(c[(c[a>>2]|0)+4>>2]|0,a|0,c[a+8>>2]|0,c[a+12>>2]|0)|0;a=t;t=0;if((a|0)!=0&(u|0)!=0){g=tr(c[a>>2]|0,f)|0;if((g|0)==0){Na(a|0,u|0)}I=u}else{g=-1}if((g|0)!=1){j=h;i=d;return j|0}else{g=0;a=I}}else{g=0;a=I}}while(0);while(1){if((a|0)==1){b=0;e=21;break}c[e>>2]=g;t=0;pa(44,g+(c[(c[g>>2]|0)+ -12>>2]|0)|0,0);h=t;t=0;if((h|0)!=0&(u|0)!=0){a=tr(c[h>>2]|0,f)|0;if((a|0)==0){Na(h|0,u|0)}I=u}else{a=-1}if((a|0)==1){j=g;a=I;g=j;continue}t=0;h=Ba(26,g|0,336)|0;a=t;t=0;if((a|0)!=0&(u|0)!=0){j=tr(c[a>>2]|0,f)|0;if((j|0)==0){Na(a|0,u|0)}I=u}else{j=-1}if((j|0)==1){j=g;a=I;g=j;continue}t=0;a=Ba(26,h|0,368)|0;h=t;t=0;if((h|0)!=0&(u|0)!=0){j=tr(c[h>>2]|0,f)|0;if((j|0)==0){Na(h|0,u|0)}I=u}else{j=-1}if((j|0)==1){j=g;a=I;g=j;continue}t=0;a=Ba(27,a|0,104)|0;h=t;t=0;if((h|0)!=0&(u|0)!=0){j=tr(c[h>>2]|0,f)|0;if((j|0)==0){Na(h|0,u|0)}I=u}else{j=-1}if((j|0)==1){j=g;a=I;g=j;continue}t=0;h=Ba(26,a|0,376)|0;j=t;t=0;if((j|0)!=0&(u|0)!=0){a=tr(c[j>>2]|0,f)|0;if((a|0)==0){Na(j|0,u|0)}I=u}else{a=-1}if((a|0)==1){j=g;a=I;g=j;continue}t=0;j=Ba(26,h|0,384)|0;h=t;t=0;if((h|0)!=0&(u|0)!=0){a=tr(c[h>>2]|0,f)|0;if((a|0)==0){Na(h|0,u|0)}I=u}else{a=-1}if((a|0)==1){j=g;a=I;g=j;continue}t=0;j=Ba(26,j|0,408)|0;h=t;t=0;if((h|0)!=0&(u|0)!=0){a=tr(c[h>>2]|0,f)|0;if((a|0)==0){Na(h|0,u|0)}I=u}else{a=-1}if((a|0)==1){j=g;a=I;g=j;continue}t=0;j=Ba(26,j|0,416)|0;h=t;t=0;if((h|0)!=0&(u|0)!=0){a=tr(c[h>>2]|0,f)|0;if((a|0)==0){Na(h|0,u|0)}I=u}else{a=-1}if((a|0)==1){j=g;a=I;g=j;continue}t=0;Ba(26,j|0,b|0)|0;h=t;t=0;if((h|0)!=0&(u|0)!=0){a=tr(c[h>>2]|0,f)|0;if((a|0)==0){Na(h|0,u|0)}I=u}else{a=-1}if((a|0)==1){j=g;a=I;g=j;continue}t=0;oa(140,e|0);a=t;t=0;if((a|0)!=0&(u|0)!=0){h=tr(c[a>>2]|0,f)|0;if((h|0)==0){Na(a|0,u|0)}I=u}else{h=-1}if((h|0)==1){j=g;a=I;g=j}else{e=16;break}}if((e|0)!=16)if((e|0)==21){i=d;return b|0}return 0}function Jd(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0;f=i;i=i+112|0;n=f;k=i;i=i+168|0;c[k>>2]=0;r=f+32|0;o=f+20|0;m=f+16|0;g=f+12|0;h=f+8|0;j=f+4|0;l=b+328|0;p=c[l>>2]|0;do{if((p|0)>-1){t=0;sa(80,p|0)|0;q=t;t=0;if((q|0)!=0&(u|0)!=0){p=tr(c[q>>2]|0,k)|0;if((p|0)==0){Na(q|0,u|0)}I=u}else{p=-1}v=I;if((p|0)==4){n=0;e=0;o=0;p=0;q=0;r=0;s=0;w=27;break}else if((p|0)==3){n=0;e=0;o=0;p=0;q=0;r=0;s=0;w=50;break}else if((p|0)==2){n=0;e=0;o=0;p=0;q=0;r=0;s=0;w=73;break}else if((p|0)==1){n=0;e=0;o=0;p=0;q=0;r=0;s=0;w=96;break}c[l>>2]=-1;w=4}else{w=4}}while(0);a:do{if((w|0)==4){s=b+4|0;p=c[s>>2]|0;if((p|0)!=0){t=0;Ba(28,p|0,c[b+8>>2]|0)|0;q=t;t=0;if((q|0)!=0&(u|0)!=0){p=tr(c[q>>2]|0,k)|0;if((p|0)==0){Na(q|0,u|0)}I=u}else{p=-1}v=I;if((p|0)==4){n=0;e=0;o=0;p=0;q=0;r=0;w=27;break}else if((p|0)==3){n=0;e=0;o=0;p=0;q=0;r=0;w=50;break}else if((p|0)==2){n=0;e=0;o=0;p=0;q=0;r=0;w=73;break}else if((p|0)==1){n=0;e=0;o=0;p=0;q=0;r=0;w=96;break}c[s>>2]=0}c[s>>2]=0;q=r+0|0;p=q+76|0;do{c[q>>2]=0;q=q+4|0}while((q|0)<(p|0));q=b+12|0;t=0;p=sa(81,d|0)|0;v=t;t=0;if((v|0)!=0&(u|0)!=0){w=tr(c[v>>2]|0,k)|0;if((w|0)==0){Na(v|0,u|0)}I=u}else{w=-1}v=I;if((w|0)==4){n=0;e=0;o=0;p=0;q=0;w=27;break}else if((w|0)==3){n=0;e=0;o=0;p=0;q=0;w=50;break}else if((w|0)==2){n=0;e=0;o=0;p=0;q=0;w=73;break}else if((w|0)==1){n=0;e=0;o=0;p=0;q=0;w=96;break}if(p>>>0>4294967279){t=0;oa(141,0);v=t;t=0;if((v|0)!=0&(u|0)!=0){w=tr(c[v>>2]|0,k)|0;if((w|0)==0){Na(v|0,u|0)}I=u}else{w=-1}v=I;if((w|0)==4){n=0;e=0;o=0;p=0;q=0;w=27;break}else if((w|0)==3){n=0;e=0;o=0;p=0;q=0;w=50;break}else if((w|0)==2){n=0;e=0;o=0;p=0;q=0;w=73;break}else if((w|0)==1){n=0;e=0;o=0;p=0;q=0;w=96;break}}if(p>>>0<11){a[o]=p<<1;x=o+1|0}else{y=p+16&-16;t=0;x=sa(82,y|0)|0;v=t;t=0;if((v|0)!=0&(u|0)!=0){w=tr(c[v>>2]|0,k)|0;if((w|0)==0){Na(v|0,u|0)}I=u}else{w=-1}v=I;if((w|0)==4){n=0;e=0;o=0;p=0;q=0;w=27;break}else if((w|0)==3){n=0;e=0;o=0;p=0;q=0;w=50;break}else if((w|0)==2){n=0;e=0;o=0;p=0;q=0;w=73;break}else if((w|0)==1){n=0;e=0;o=0;p=0;q=0;w=96;break}c[o+8>>2]=x;c[o>>2]=y|1;c[o+4>>2]=p}ur(x|0,d|0,p|0)|0;a[x+p|0]=0;t=0;Ba(29,q|0,o|0)|0;q=t;t=0;if((q|0)!=0&(u|0)!=0){p=tr(c[q>>2]|0,k)|0;if((p|0)==0){Na(q|0,u|0)}I=u}else{p=-1}v=I;if((p|0)==4){n=0;e=0;o=0;p=0;q=0;w=27;break}else if((p|0)==3){n=0;e=0;o=0;p=0;q=0;w=50;break}else if((p|0)==2){n=0;e=0;o=0;p=0;q=0;w=73;break}else if((p|0)==1){n=0;e=0;o=0;p=0;q=0;w=96;break}if(!((a[o]&1)==0)){t=0;oa(142,c[o+8>>2]|0);p=t;t=0;if((p|0)!=0&(u|0)!=0){o=tr(c[p>>2]|0,k)|0;if((o|0)==0){Na(p|0,u|0)}I=u}else{o=-1}v=I;if((o|0)==4){n=0;e=0;o=0;p=0;q=0;w=27;break}else if((o|0)==3){n=0;e=0;o=0;p=0;q=0;w=50;break}else if((o|0)==2){n=0;e=0;o=0;p=0;q=0;w=73;break}else if((o|0)==1){n=0;e=0;o=0;p=0;q=0;w=96;break}}t=0;o=Ba(30,e|0,328)|0;q=t;t=0;if((q|0)!=0&(u|0)!=0){p=tr(c[q>>2]|0,k)|0;if((p|0)==0){Na(q|0,u|0)}I=u}else{p=-1}v=I;if((p|0)==4){n=0;e=0;o=0;p=0;q=0;w=27;break}else if((p|0)==3){n=0;e=0;o=0;p=0;q=0;w=50;break}else if((p|0)==2){n=0;e=0;o=0;p=0;q=0;w=73;break}else if((p|0)==1){n=0;e=0;o=0;p=0;q=0;w=96;break}do{if((o|0)==0){c[b+332>>2]=0;e=0}else{t=0;o=Ba(30,e|0,784)|0;p=t;t=0;if((p|0)!=0&(u|0)!=0){e=tr(c[p>>2]|0,k)|0;if((e|0)==0){Na(p|0,u|0)}I=u}else{e=-1}v=I;if((e|0)==4){n=0;e=0;o=0;p=0;q=0;w=27;break a}else if((e|0)==3){n=0;e=0;o=0;p=0;q=0;w=50;break a}else if((e|0)==2){n=0;e=0;o=0;p=0;q=0;w=73;break a}else if((e|0)==1){n=0;e=0;o=0;p=0;q=0;w=96;break a}if((o|0)==0){c[b+332>>2]=2;e=2;break}q=b+24|0;sr(b+172|0,4,k|0)|0;t=0;e=t;t=0;if((e|0)!=0&(u|0)!=0){n=tr(c[e>>2]|0,k)|0;if((n|0)==0){Na(e|0,u|0)}I=u}else{n=-1}v=I;if((n|0)==4){n=0;e=0;o=0;p=0;w=27;break a}else if((n|0)==3){n=0;e=0;o=0;p=0;w=50;break a}else if((n|0)==2){n=0;e=0;o=0;p=0;w=73;break a}else if((n|0)==1){n=0;e=0;o=0;p=0;w=96;break a}n=0;e=0;o=0;p=0;v=0;w=27;break a}}while(0);o=b+332|0;t=0;n=ka(30,d|0,e|0,n|0)|0;p=t;t=0;if((p|0)!=0&(u|0)!=0){e=tr(c[p>>2]|0,k)|0;if((e|0)==0){Na(p|0,u|0)}I=u}else{e=-1}v=I;if((e|0)==4){n=0;e=0;o=0;p=0;q=0;w=27;break}else if((e|0)==3){n=0;e=0;o=0;p=0;q=0;w=50;break}else if((e|0)==2){n=0;e=0;o=0;p=0;q=0;w=73;break}else if((e|0)==1){n=0;e=0;o=0;p=0;q=0;w=96;break}c[l>>2]=n;if(!((n|0)>-1)){p=b+24|0;sr(b+172|0,3,k|0)|0;t=0;e=t;t=0;if((e|0)!=0&(u|0)!=0){n=tr(c[e>>2]|0,k)|0;if((n|0)==0){Na(e|0,u|0)}I=u}else{n=-1}v=I;if((n|0)==4){n=0;e=0;o=0;q=0;w=27;break}else if((n|0)==3){n=0;e=0;o=0;q=0;w=50;break}else if((n|0)==2){n=0;e=0;o=0;q=0;w=73;break}else if((n|0)==1){n=0;e=0;o=0;q=0;w=96;break}n=0;e=0;o=0;q=0;v=0;w=50;break}t=0;e=Ba(31,n|0,r|0)|0;p=t;t=0;if((p|0)!=0&(u|0)!=0){n=tr(c[p>>2]|0,k)|0;if((n|0)==0){Na(p|0,u|0)}I=u}else{n=-1}v=I;if((n|0)==4){n=0;e=0;o=0;p=0;q=0;w=27;break}else if((n|0)==3){n=0;e=0;o=0;p=0;q=0;w=50;break}else if((n|0)==2){n=0;e=0;o=0;p=0;q=0;w=73;break}else if((n|0)==1){n=0;e=0;o=0;p=0;q=0;w=96;break}if(!((e|0)>-1)){o=b+24|0;sr(b+172|0,2,k|0)|0;t=0;e=t;t=0;if((e|0)!=0&(u|0)!=0){n=tr(c[e>>2]|0,k)|0;if((n|0)==0){Na(e|0,u|0)}I=u}else{n=-1}v=I;if((n|0)==4){n=0;e=0;p=0;q=0;w=27;break}else if((n|0)==3){n=0;e=0;p=0;q=0;w=50;break}else if((n|0)==2){n=0;e=0;p=0;q=0;w=73;break}else if((n|0)==1){n=0;e=0;p=0;q=0;w=96;break}n=0;e=0;p=0;q=0;v=0;w=73;break}y=c[r+36>>2]|0;e=b+8|0;c[e>>2]=y;t=0;o=qa(5,0,y|0,((c[o>>2]|0)==2?3:1)|0,1,c[l>>2]|0,0)|0;p=t;t=0;if((p|0)!=0&(u|0)!=0){n=tr(c[p>>2]|0,k)|0;if((n|0)==0){Na(p|0,u|0)}I=u}else{n=-1}v=I;if((n|0)==4){n=0;o=0;p=0;q=0;w=27;break}else if((n|0)==3){n=0;o=0;p=0;q=0;w=50;break}else if((n|0)==2){n=0;o=0;p=0;q=0;w=73;break}else if((n|0)==1){n=0;o=0;p=0;q=0;w=96;break}if((o|0)==(-1|0)){n=b+24|0;sr(b+172|0,1,k|0)|0;t=0;p=t;t=0;if((p|0)!=0&(u|0)!=0){o=tr(c[p>>2]|0,k)|0;if((o|0)==0){Na(p|0,u|0)}I=u}else{o=-1}v=I;if((o|0)==4){o=0;p=0;q=0;w=27;break}else if((o|0)==3){o=0;p=0;q=0;w=50;break}else if((o|0)==2){o=0;p=0;q=0;w=73;break}else if((o|0)==1){o=0;p=0;q=0;w=96;break}o=0;p=0;q=0;v=0;w=96;break}c[s>>2]=o;t=0;sa(80,c[l>>2]|0)|0;o=t;t=0;if((o|0)!=0&(u|0)!=0){n=tr(c[o>>2]|0,k)|0;if((n|0)==0){Na(o|0,u|0)}I=u}else{n=-1}v=I;if((n|0)==4){n=0;o=0;p=0;q=0;w=27;break}else if((n|0)==3){n=0;o=0;p=0;q=0;w=50;break}else if((n|0)==2){n=0;o=0;p=0;q=0;w=73;break}else if((n|0)==1){n=0;o=0;p=0;q=0;w=96;break}c[l>>2]=-1;y=1;i=f;return y|0}}while(0);while(1){if((w|0)==27){if((v|0)==1){v=c[l>>2]|0;if((v|0)>-1){t=0;sa(80,v|0)|0;v=t;t=0;if((v|0)!=0&(u|0)!=0){w=tr(c[v>>2]|0,k)|0;if((w|0)==0){Na(v|0,u|0)}I=u}else{w=-1}v=I;if((w|0)==4){C=s;B=r;A=q;z=p;x=o;y=e;w=n;s=C;r=B;q=A;p=z;o=x;e=y;n=w;w=27;continue}else if((w|0)==3){w=50;continue}else if((w|0)==2){w=73;continue}else if((w|0)==1){w=96;continue}c[l>>2]=-1}v=c[s>>2]|0;if((v|0)==0){w=34;break}t=0;Ba(28,v|0,c[b+8>>2]|0)|0;v=t;t=0;if((v|0)!=0&(u|0)!=0){w=tr(c[v>>2]|0,k)|0;if((w|0)==0){Na(v|0,u|0)}I=u}else{w=-1}v=I;if((w|0)==4){x=s;y=r;z=q;A=p;B=o;C=e;w=n;s=x;r=y;q=z;p=A;o=B;e=C;n=w;w=27;continue}else if((w|0)==3){w=50;continue}else if((w|0)==2){w=73;continue}else if((w|0)==1){w=96;continue}else{w=33;break}}c[m>>2]=q;t=0;pa(44,q+(c[(c[q>>2]|0)+ -12>>2]|0)|0,0);v=t;t=0;if((v|0)!=0&(u|0)!=0){w=tr(c[v>>2]|0,k)|0;if((w|0)==0){Na(v|0,u|0)}I=u}else{w=-1}v=I;if((w|0)==4){x=s;y=r;z=q;A=p;B=o;C=e;w=n;s=x;r=y;q=z;p=A;o=B;e=C;n=w;w=27;continue}else if((w|0)==3){w=50;continue}else if((w|0)==2){w=73;continue}else if((w|0)==1){w=96;continue}t=0;w=Ba(26,q|0,792)|0;v=t;t=0;if((v|0)!=0&(u|0)!=0){x=tr(c[v>>2]|0,k)|0;if((x|0)==0){Na(v|0,u|0)}I=u}else{x=-1}v=I;if((x|0)==4){x=s;y=r;z=q;A=p;B=o;C=e;w=n;s=x;r=y;q=z;p=A;o=B;e=C;n=w;w=27;continue}else if((x|0)==3){w=50;continue}else if((x|0)==2){w=73;continue}else if((x|0)==1){w=96;continue}t=0;w=Ba(26,w|0,368)|0;v=t;t=0;if((v|0)!=0&(u|0)!=0){x=tr(c[v>>2]|0,k)|0;if((x|0)==0){Na(v|0,u|0)}I=u}else{x=-1}v=I;if((x|0)==4){x=s;y=r;z=q;A=p;B=o;C=e;w=n;s=x;r=y;q=z;p=A;o=B;e=C;n=w;w=27;continue}else if((x|0)==3){w=50;continue}else if((x|0)==2){w=73;continue}else if((x|0)==1){w=96;continue}t=0;w=Ba(27,w|0,158)|0;v=t;t=0;if((v|0)!=0&(u|0)!=0){x=tr(c[v>>2]|0,k)|0;if((x|0)==0){Na(v|0,u|0)}I=u}else{x=-1}v=I;if((x|0)==4){x=s;y=r;z=q;A=p;B=o;C=e;w=n;s=x;r=y;q=z;p=A;o=B;e=C;n=w;w=27;continue}else if((x|0)==3){w=50;continue}else if((x|0)==2){w=73;continue}else if((x|0)==1){w=96;continue}t=0;w=Ba(26,w|0,376)|0;v=t;t=0;if((v|0)!=0&(u|0)!=0){x=tr(c[v>>2]|0,k)|0;if((x|0)==0){Na(v|0,u|0)}I=u}else{x=-1}v=I;if((x|0)==4){x=s;y=r;z=q;A=p;B=o;C=e;w=n;s=x;r=y;q=z;p=A;o=B;e=C;n=w;w=27;continue}else if((x|0)==3){w=50;continue}else if((x|0)==2){w=73;continue}else if((x|0)==1){w=96;continue}t=0;w=Ba(26,w|0,816)|0;v=t;t=0;if((v|0)!=0&(u|0)!=0){x=tr(c[v>>2]|0,k)|0;if((x|0)==0){Na(v|0,u|0)}I=u}else{x=-1}v=I;if((x|0)==4){x=s;y=r;z=q;A=p;B=o;C=e;w=n;s=x;r=y;q=z;p=A;o=B;e=C;n=w;w=27;continue}else if((x|0)==3){w=50;continue}else if((x|0)==2){w=73;continue}else if((x|0)==1){w=96;continue}t=0;w=Ba(26,w|0,408)|0;v=t;t=0;if((v|0)!=0&(u|0)!=0){x=tr(c[v>>2]|0,k)|0;if((x|0)==0){Na(v|0,u|0)}I=u}else{x=-1}v=I;if((x|0)==4){x=s;y=r;z=q;A=p;B=o;C=e;w=n;s=x;r=y;q=z;p=A;o=B;e=C;n=w;w=27;continue}else if((x|0)==3){w=50;continue}else if((x|0)==2){w=73;continue}else if((x|0)==1){w=96;continue}t=0;w=Ba(26,w|0,824)|0;v=t;t=0;if((v|0)!=0&(u|0)!=0){x=tr(c[v>>2]|0,k)|0;if((x|0)==0){Na(v|0,u|0)}I=u}else{x=-1}v=I;if((x|0)==4){x=s;y=r;z=q;A=p;B=o;C=e;w=n;s=x;r=y;q=z;p=A;o=B;e=C;n=w;w=27;continue}else if((x|0)==3){w=50;continue}else if((x|0)==2){w=73;continue}else if((x|0)==1){w=96;continue}t=0;Ba(26,w|0,d|0)|0;v=t;t=0;if((v|0)!=0&(u|0)!=0){w=tr(c[v>>2]|0,k)|0;if((w|0)==0){Na(v|0,u|0)}I=u}else{w=-1}v=I;if((w|0)==4){x=s;y=r;z=q;A=p;B=o;C=e;w=n;s=x;r=y;q=z;p=A;o=B;e=C;n=w;w=27;continue}else if((w|0)==3){w=50;continue}else if((w|0)==2){w=73;continue}else if((w|0)==1){w=96;continue}t=0;oa(140,m|0);v=t;t=0;if((v|0)!=0&(u|0)!=0){w=tr(c[v>>2]|0,k)|0;if((w|0)==0){Na(v|0,u|0)}I=u}else{w=-1}v=I;if((w|0)==4){x=s;y=r;z=q;A=p;B=o;C=e;w=n;s=x;r=y;q=z;p=A;o=B;e=C;n=w;w=27;continue}else if((w|0)==3){w=50;continue}else if((w|0)==2){w=73;continue}else if((w|0)==1){w=96;continue}else{w=45;break}}else if((w|0)==50){if((v|0)==1){v=c[l>>2]|0;if((v|0)>-1){t=0;sa(80,v|0)|0;v=t;t=0;if((v|0)!=0&(u|0)!=0){w=tr(c[v>>2]|0,k)|0;if((w|0)==0){Na(v|0,u|0)}I=u}else{w=-1}v=I;if((w|0)==4){w=27;continue}else if((w|0)==3){x=s;y=r;z=q;A=p;B=o;C=e;w=n;s=x;r=y;q=z;p=A;o=B;e=C;n=w;w=50;continue}else if((w|0)==2){w=73;continue}else if((w|0)==1){w=96;continue}c[l>>2]=-1}v=c[s>>2]|0;if((v|0)==0){w=57;break}t=0;Ba(28,v|0,c[b+8>>2]|0)|0;v=t;t=0;if((v|0)!=0&(u|0)!=0){w=tr(c[v>>2]|0,k)|0;if((w|0)==0){Na(v|0,u|0)}I=u}else{w=-1}v=I;if((w|0)==4){w=27;continue}else if((w|0)==3){x=s;y=r;z=q;A=p;B=o;C=e;w=n;s=x;r=y;q=z;p=A;o=B;e=C;n=w;w=50;continue}else if((w|0)==2){w=73;continue}else if((w|0)==1){w=96;continue}else{w=56;break}}c[g>>2]=p;t=0;pa(44,p+(c[(c[p>>2]|0)+ -12>>2]|0)|0,0);v=t;t=0;if((v|0)!=0&(u|0)!=0){w=tr(c[v>>2]|0,k)|0;if((w|0)==0){Na(v|0,u|0)}I=u}else{w=-1}v=I;if((w|0)==4){w=27;continue}else if((w|0)==3){x=s;y=r;z=q;A=p;B=o;C=e;w=n;s=x;r=y;q=z;p=A;o=B;e=C;n=w;w=50;continue}else if((w|0)==2){w=73;continue}else if((w|0)==1){w=96;continue}t=0;x=Ba(26,p|0,792)|0;v=t;t=0;if((v|0)!=0&(u|0)!=0){w=tr(c[v>>2]|0,k)|0;if((w|0)==0){Na(v|0,u|0)}I=u}else{w=-1}v=I;if((w|0)==4){w=27;continue}else if((w|0)==3){x=s;y=r;z=q;A=p;B=o;C=e;w=n;s=x;r=y;q=z;p=A;o=B;e=C;n=w;w=50;continue}else if((w|0)==2){w=73;continue}else if((w|0)==1){w=96;continue}t=0;x=Ba(26,x|0,368)|0;v=t;t=0;if((v|0)!=0&(u|0)!=0){w=tr(c[v>>2]|0,k)|0;if((w|0)==0){Na(v|0,u|0)}I=u}else{w=-1}v=I;if((w|0)==4){w=27;continue}else if((w|0)==3){x=s;y=r;z=q;A=p;B=o;C=e;w=n;s=x;r=y;q=z;p=A;o=B;e=C;n=w;w=50;continue}else if((w|0)==2){w=73;continue}else if((w|0)==1){w=96;continue}t=0;x=Ba(27,x|0,160)|0;v=t;t=0;if((v|0)!=0&(u|0)!=0){w=tr(c[v>>2]|0,k)|0;if((w|0)==0){Na(v|0,u|0)}I=u}else{w=-1}v=I;if((w|0)==4){w=27;continue}else if((w|0)==3){x=s;y=r;z=q;A=p;B=o;C=e;w=n;s=x;r=y;q=z;p=A;o=B;e=C;n=w;w=50;continue}else if((w|0)==2){w=73;continue}else if((w|0)==1){w=96;continue}t=0;x=Ba(26,x|0,376)|0;v=t;t=0;if((v|0)!=0&(u|0)!=0){w=tr(c[v>>2]|0,k)|0;if((w|0)==0){Na(v|0,u|0)}I=u}else{w=-1}v=I;if((w|0)==4){w=27;continue}else if((w|0)==3){x=s;y=r;z=q;A=p;B=o;C=e;w=n;s=x;r=y;q=z;p=A;o=B;e=C;n=w;w=50;continue}else if((w|0)==2){w=73;continue}else if((w|0)==1){w=96;continue}t=0;x=Ba(26,x|0,848)|0;v=t;t=0;if((v|0)!=0&(u|0)!=0){w=tr(c[v>>2]|0,k)|0;if((w|0)==0){Na(v|0,u|0)}I=u}else{w=-1}v=I;if((w|0)==4){w=27;continue}else if((w|0)==3){x=s;y=r;z=q;A=p;B=o;C=e;w=n;s=x;r=y;q=z;p=A;o=B;e=C;n=w;w=50;continue}else if((w|0)==2){w=73;continue}else if((w|0)==1){w=96;continue}t=0;x=Ba(26,x|0,408)|0;v=t;t=0;if((v|0)!=0&(u|0)!=0){w=tr(c[v>>2]|0,k)|0;if((w|0)==0){Na(v|0,u|0)}I=u}else{w=-1}v=I;if((w|0)==4){w=27;continue}else if((w|0)==3){x=s;y=r;z=q;A=p;B=o;C=e;w=n;s=x;r=y;q=z;p=A;o=B;e=C;n=w;w=50;continue}else if((w|0)==2){w=73;continue}else if((w|0)==1){w=96;continue}t=0;x=Ba(26,x|0,896)|0;v=t;t=0;if((v|0)!=0&(u|0)!=0){w=tr(c[v>>2]|0,k)|0;if((w|0)==0){Na(v|0,u|0)}I=u}else{w=-1}v=I;if((w|0)==4){w=27;continue}else if((w|0)==3){x=s;y=r;z=q;A=p;B=o;C=e;w=n;s=x;r=y;q=z;p=A;o=B;e=C;n=w;w=50;continue}else if((w|0)==2){w=73;continue}else if((w|0)==1){w=96;continue}t=0;Ba(26,x|0,d|0)|0;v=t;t=0;if((v|0)!=0&(u|0)!=0){w=tr(c[v>>2]|0,k)|0;if((w|0)==0){Na(v|0,u|0)}I=u}else{w=-1}v=I;if((w|0)==4){w=27;continue}else if((w|0)==3){x=s;y=r;z=q;A=p;B=o;C=e;w=n;s=x;r=y;q=z;p=A;o=B;e=C;n=w;w=50;continue}else if((w|0)==2){w=73;continue}else if((w|0)==1){w=96;continue}t=0;oa(140,g|0);v=t;t=0;if((v|0)!=0&(u|0)!=0){w=tr(c[v>>2]|0,k)|0;if((w|0)==0){Na(v|0,u|0)}I=u}else{w=-1}v=I;if((w|0)==4){w=27;continue}else if((w|0)==3){x=s;y=r;z=q;A=p;B=o;C=e;w=n;s=x;r=y;q=z;p=A;o=B;e=C;n=w;w=50;continue}else if((w|0)==2){w=73;continue}else if((w|0)==1){w=96;continue}else{w=68;break}}else if((w|0)==73){if((v|0)==1){v=c[l>>2]|0;if((v|0)>-1){t=0;sa(80,v|0)|0;v=t;t=0;if((v|0)!=0&(u|0)!=0){w=tr(c[v>>2]|0,k)|0;if((w|0)==0){Na(v|0,u|0)}I=u}else{w=-1}v=I;if((w|0)==4){w=27;continue}else if((w|0)==3){w=50;continue}else if((w|0)==2){x=s;y=r;z=q;A=p;B=o;C=e;w=n;s=x;r=y;q=z;p=A;o=B;e=C;n=w;w=73;continue}else if((w|0)==1){w=96;continue}c[l>>2]=-1}v=c[s>>2]|0;if((v|0)==0){w=80;break}t=0;Ba(28,v|0,c[b+8>>2]|0)|0;v=t;t=0;if((v|0)!=0&(u|0)!=0){w=tr(c[v>>2]|0,k)|0;if((w|0)==0){Na(v|0,u|0)}I=u}else{w=-1}v=I;if((w|0)==4){w=27;continue}else if((w|0)==3){w=50;continue}else if((w|0)==2){x=s;y=r;z=q;A=p;B=o;C=e;w=n;s=x;r=y;q=z;p=A;o=B;e=C;n=w;w=73;continue}else if((w|0)==1){w=96;continue}else{w=79;break}}c[h>>2]=o;t=0;pa(44,o+(c[(c[o>>2]|0)+ -12>>2]|0)|0,0);v=t;t=0;if((v|0)!=0&(u|0)!=0){w=tr(c[v>>2]|0,k)|0;if((w|0)==0){Na(v|0,u|0)}I=u}else{w=-1}v=I;if((w|0)==4){w=27;continue}else if((w|0)==3){w=50;continue}else if((w|0)==2){x=s;y=r;z=q;A=p;B=o;C=e;w=n;s=x;r=y;q=z;p=A;o=B;e=C;n=w;w=73;continue}else if((w|0)==1){w=96;continue}t=0;x=Ba(26,o|0,792)|0;v=t;t=0;if((v|0)!=0&(u|0)!=0){w=tr(c[v>>2]|0,k)|0;if((w|0)==0){Na(v|0,u|0)}I=u}else{w=-1}v=I;if((w|0)==4){w=27;continue}else if((w|0)==3){w=50;continue}else if((w|0)==2){x=s;y=r;z=q;A=p;B=o;C=e;w=n;s=x;r=y;q=z;p=A;o=B;e=C;n=w;w=73;continue}else if((w|0)==1){w=96;continue}t=0;x=Ba(26,x|0,368)|0;v=t;t=0;if((v|0)!=0&(u|0)!=0){w=tr(c[v>>2]|0,k)|0;if((w|0)==0){Na(v|0,u|0)}I=u}else{w=-1}v=I;if((w|0)==4){w=27;continue}else if((w|0)==3){w=50;continue}else if((w|0)==2){x=s;y=r;z=q;A=p;B=o;C=e;w=n;s=x;r=y;q=z;p=A;o=B;e=C;n=w;w=73;continue}else if((w|0)==1){w=96;continue}t=0;x=Ba(27,x|0,163)|0;v=t;t=0;if((v|0)!=0&(u|0)!=0){w=tr(c[v>>2]|0,k)|0;if((w|0)==0){Na(v|0,u|0)}I=u}else{w=-1}v=I;if((w|0)==4){w=27;continue}else if((w|0)==3){w=50;continue}else if((w|0)==2){x=s;y=r;z=q;A=p;B=o;C=e;w=n;s=x;r=y;q=z;p=A;o=B;e=C;n=w;w=73;continue}else if((w|0)==1){w=96;continue}t=0;x=Ba(26,x|0,376)|0;v=t;t=0;if((v|0)!=0&(u|0)!=0){w=tr(c[v>>2]|0,k)|0;if((w|0)==0){Na(v|0,u|0)}I=u}else{w=-1}v=I;if((w|0)==4){w=27;continue}else if((w|0)==3){w=50;continue}else if((w|0)==2){x=s;y=r;z=q;A=p;B=o;C=e;w=n;s=x;r=y;q=z;p=A;o=B;e=C;n=w;w=73;continue}else if((w|0)==1){w=96;continue}t=0;x=Ba(26,x|0,912)|0;v=t;t=0;if((v|0)!=0&(u|0)!=0){w=tr(c[v>>2]|0,k)|0;if((w|0)==0){Na(v|0,u|0)}I=u}else{w=-1}v=I;if((w|0)==4){w=27;continue}else if((w|0)==3){w=50;continue}else if((w|0)==2){x=s;y=r;z=q;A=p;B=o;C=e;w=n;s=x;r=y;q=z;p=A;o=B;e=C;n=w;w=73;continue}else if((w|0)==1){w=96;continue}t=0;x=Ba(26,x|0,408)|0;v=t;t=0;if((v|0)!=0&(u|0)!=0){w=tr(c[v>>2]|0,k)|0;if((w|0)==0){Na(v|0,u|0)}I=u}else{w=-1}v=I;if((w|0)==4){w=27;continue}else if((w|0)==3){w=50;continue}else if((w|0)==2){x=s;y=r;z=q;A=p;B=o;C=e;w=n;s=x;r=y;q=z;p=A;o=B;e=C;n=w;w=73;continue}else if((w|0)==1){w=96;continue}t=0;x=Ba(26,x|0,936)|0;v=t;t=0;if((v|0)!=0&(u|0)!=0){w=tr(c[v>>2]|0,k)|0;if((w|0)==0){Na(v|0,u|0)}I=u}else{w=-1}v=I;if((w|0)==4){w=27;continue}else if((w|0)==3){w=50;continue}else if((w|0)==2){x=s;y=r;z=q;A=p;B=o;C=e;w=n;s=x;r=y;q=z;p=A;o=B;e=C;n=w;w=73;continue}else if((w|0)==1){w=96;continue}t=0;Ba(26,x|0,d|0)|0;v=t;t=0;if((v|0)!=0&(u|0)!=0){w=tr(c[v>>2]|0,k)|0;if((w|0)==0){Na(v|0,u|0)}I=u}else{w=-1}v=I;if((w|0)==4){w=27;continue}else if((w|0)==3){w=50;continue}else if((w|0)==2){x=s;y=r;z=q;A=p;B=o;C=e;w=n;s=x;r=y;q=z;p=A;o=B;e=C;n=w;w=73;continue}else if((w|0)==1){w=96;continue}t=0;oa(140,h|0);v=t;t=0;if((v|0)!=0&(u|0)!=0){w=tr(c[v>>2]|0,k)|0;if((w|0)==0){Na(v|0,u|0)}I=u}else{w=-1}v=I;if((w|0)==4){w=27;continue}else if((w|0)==3){w=50;continue}else if((w|0)==2){x=s;y=r;z=q;A=p;B=o;C=e;w=n;s=x;r=y;q=z;p=A;o=B;e=C;n=w;w=73;continue}else if((w|0)==1){w=96;continue}else{w=91;break}}else if((w|0)==96){if((v|0)==1){v=c[l>>2]|0;if((v|0)>-1){t=0;sa(80,v|0)|0;v=t;t=0;if((v|0)!=0&(u|0)!=0){w=tr(c[v>>2]|0,k)|0;if((w|0)==0){Na(v|0,u|0)}I=u}else{w=-1}v=I;if((w|0)==4){w=27;continue}else if((w|0)==3){w=50;continue}else if((w|0)==2){w=73;continue}else if((w|0)==1){x=s;y=r;z=q;A=p;B=o;C=e;w=n;s=x;r=y;q=z;p=A;o=B;e=C;n=w;w=96;continue}c[l>>2]=-1}v=c[s>>2]|0;if((v|0)==0){w=103;break}t=0;Ba(28,v|0,c[e>>2]|0)|0;v=t;t=0;if((v|0)!=0&(u|0)!=0){w=tr(c[v>>2]|0,k)|0;if((w|0)==0){Na(v|0,u|0)}I=u}else{w=-1}v=I;if((w|0)==4){w=27;continue}else if((w|0)==3){w=50;continue}else if((w|0)==2){w=73;continue}else if((w|0)==1){x=s;y=r;z=q;A=p;B=o;C=e;w=n;s=x;r=y;q=z;p=A;o=B;e=C;n=w;w=96;continue}else{w=102;break}}c[j>>2]=n;t=0;pa(44,n+(c[(c[n>>2]|0)+ -12>>2]|0)|0,0);v=t;t=0;if((v|0)!=0&(u|0)!=0){w=tr(c[v>>2]|0,k)|0;if((w|0)==0){Na(v|0,u|0)}I=u}else{w=-1}v=I;if((w|0)==4){w=27;continue}else if((w|0)==3){w=50;continue}else if((w|0)==2){w=73;continue}else if((w|0)==1){x=s;y=r;z=q;A=p;B=o;C=e;w=n;s=x;r=y;q=z;p=A;o=B;e=C;n=w;w=96;continue}t=0;x=Ba(26,n|0,792)|0;v=t;t=0;if((v|0)!=0&(u|0)!=0){w=tr(c[v>>2]|0,k)|0;if((w|0)==0){Na(v|0,u|0)}I=u}else{w=-1}v=I;if((w|0)==4){w=27;continue}else if((w|0)==3){w=50;continue}else if((w|0)==2){w=73;continue}else if((w|0)==1){x=s;y=r;z=q;A=p;B=o;C=e;w=n;s=x;r=y;q=z;p=A;o=B;e=C;n=w;w=96;continue}t=0;x=Ba(26,x|0,368)|0;v=t;t=0;if((v|0)!=0&(u|0)!=0){w=tr(c[v>>2]|0,k)|0;if((w|0)==0){Na(v|0,u|0)}I=u}else{w=-1}v=I;if((w|0)==4){w=27;continue}else if((w|0)==3){w=50;continue}else if((w|0)==2){w=73;continue}else if((w|0)==1){x=s;y=r;z=q;A=p;B=o;C=e;w=n;s=x;r=y;q=z;p=A;o=B;e=C;n=w;w=96;continue}t=0;x=Ba(27,x|0,174)|0;v=t;t=0;if((v|0)!=0&(u|0)!=0){w=tr(c[v>>2]|0,k)|0;if((w|0)==0){Na(v|0,u|0)}I=u}else{w=-1}v=I;if((w|0)==4){w=27;continue}else if((w|0)==3){w=50;continue}else if((w|0)==2){w=73;continue}else if((w|0)==1){x=s;y=r;z=q;A=p;B=o;C=e;w=n;s=x;r=y;q=z;p=A;o=B;e=C;n=w;w=96;continue}t=0;w=Ba(26,x|0,376)|0;v=t;t=0;if((v|0)!=0&(u|0)!=0){x=tr(c[v>>2]|0,k)|0;if((x|0)==0){Na(v|0,u|0)}I=u}else{x=-1}v=I;if((x|0)==4){w=27;continue}else if((x|0)==3){w=50;continue}else if((x|0)==2){w=73;continue}else if((x|0)==1){x=s;y=r;z=q;A=p;B=o;C=e;w=n;s=x;r=y;q=z;p=A;o=B;e=C;n=w;w=96;continue}t=0;x=Ba(26,w|0,968)|0;v=t;t=0;if((v|0)!=0&(u|0)!=0){w=tr(c[v>>2]|0,k)|0;if((w|0)==0){Na(v|0,u|0)}I=u}else{w=-1}v=I;if((w|0)==4){w=27;continue}else if((w|0)==3){w=50;continue}else if((w|0)==2){w=73;continue}else if((w|0)==1){x=s;y=r;z=q;A=p;B=o;C=e;w=n;s=x;r=y;q=z;p=A;o=B;e=C;n=w;w=96;continue}t=0;x=Ba(26,x|0,408)|0;v=t;t=0;if((v|0)!=0&(u|0)!=0){w=tr(c[v>>2]|0,k)|0;if((w|0)==0){Na(v|0,u|0)}I=u}else{w=-1}v=I;if((w|0)==4){w=27;continue}else if((w|0)==3){w=50;continue}else if((w|0)==2){w=73;continue}else if((w|0)==1){x=s;y=r;z=q;A=p;B=o;C=e;w=n;s=x;r=y;q=z;p=A;o=B;e=C;n=w;w=96;continue}t=0;x=Ba(26,x|0,1056)|0;v=t;t=0;if((v|0)!=0&(u|0)!=0){w=tr(c[v>>2]|0,k)|0;if((w|0)==0){Na(v|0,u|0)}I=u}else{w=-1}v=I;if((w|0)==4){w=27;continue}else if((w|0)==3){w=50;continue}else if((w|0)==2){w=73;continue}else if((w|0)==1){x=s;y=r;z=q;A=p;B=o;C=e;w=n;s=x;r=y;q=z;p=A;o=B;e=C;n=w;w=96;continue}t=0;Ba(26,x|0,d|0)|0;v=t;t=0;if((v|0)!=0&(u|0)!=0){w=tr(c[v>>2]|0,k)|0;if((w|0)==0){Na(v|0,u|0)}I=u}else{w=-1}v=I;if((w|0)==4){w=27;continue}else if((w|0)==3){w=50;continue}else if((w|0)==2){w=73;continue}else if((w|0)==1){x=s;y=r;z=q;A=p;B=o;C=e;w=n;s=x;r=y;q=z;p=A;o=B;e=C;n=w;w=96;continue}t=0;oa(140,j|0);v=t;t=0;if((v|0)!=0&(u|0)!=0){w=tr(c[v>>2]|0,k)|0;if((w|0)==0){Na(v|0,u|0)}I=u}else{w=-1}v=I;if((w|0)==4){w=27;continue}else if((w|0)==3){w=50;continue}else if((w|0)==2){w=73;continue}else if((w|0)==1){x=s;y=r;z=q;A=p;B=o;C=e;w=n;s=x;r=y;q=z;p=A;o=B;e=C;n=w;w=96;continue}else{w=114;break}}}if((w|0)==33){c[s>>2]=0;w=34}else if((w|0)!=45)if((w|0)==56){c[s>>2]=0;w=57}else if((w|0)!=68)if((w|0)==79){c[s>>2]=0;w=80}else if((w|0)!=91)if((w|0)==102){c[s>>2]=0;w=103}if((w|0)==34){c[s>>2]=0;C=0;i=f;return C|0}else if((w|0)==57){c[s>>2]=0;C=0;i=f;return C|0}else if((w|0)==80){c[s>>2]=0;C=0;i=f;return C|0}else if((w|0)==103){c[s>>2]=0;C=0;i=f;return C|0}return 0}function Kd(a){a=a|0;Gd(a)}function Ld(b,e,f){b=b|0;e=e|0;f=f|0;var h=0,j=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0;h=i;i=i+32|0;p=i;i=i+168|0;c[p>>2]=0;j=h+16|0;l=h+12|0;m=h+8|0;n=h+4|0;o=h;q=e+f|0;a:do{if(((d[e]|d[e+1|0]<<8|d[e+2|0]<<16|d[e+3|0]<<24)^251074593|0)==(f|0)){r=e+4|0;r=d[r]|d[r+1|0]<<8|d[r+2|0]<<16|d[r+3|0]<<24;if((r|0)!=1){q=b+352|0;sr(b+500|0,4,p|0)|0;t=0;e=t;t=0;if((e|0)!=0&(u|0)!=0){f=tr(c[e>>2]|0,p)|0;if((f|0)==0){Na(e|0,u|0)}I=u}else{f=-1}v=I;switch(f|0){case 2:{f=0;e=0;s=0;x=v;v=0;w=63;break a};case 4:{f=0;e=0;s=0;x=v;v=0;w=20;break a};case 3:{f=0;e=0;s=0;x=v;v=0;w=44;break a};case 5:{f=0;e=0;s=0;x=v;v=0;w=4;break a};case 1:{f=0;e=0;s=0;x=v;v=0;w=80;break a};default:{}}f=0;e=0;s=0;x=0;v=0;w=20;break}s=e+8|0;x=e+12|0;s=d[s]|d[s+1|0]<<8|d[s+2|0]<<16|d[s+3|0]<<24;w=b+340|0;v=b+344|0;B=c[v>>2]|0;y=c[w>>2]|0;A=(B-y|0)/12|0;if(!(A>>>0<s>>>0)){if(A>>>0>s>>>0?(z=y+(s*12|0)|0,(B|0)!=(z|0)):0){c[v>>2]=B+(~(((B+ -12+(0-z)|0)>>>0)/12|0)*12|0)}}else{t=0;pa(45,w|0,s-A|0);v=t;t=0;if((v|0)!=0&(u|0)!=0){y=tr(c[v>>2]|0,p)|0;if((y|0)==0){Na(v|0,u|0)}I=u}else{y=-1}v=I;switch(y|0){case 2:{f=0;e=0;q=0;s=0;x=v;v=0;w=63;break a};case 4:{f=0;e=0;q=0;s=0;x=v;v=0;w=20;break a};case 3:{f=0;e=0;q=0;s=0;x=v;v=0;w=44;break a};case 5:{f=0;e=0;q=0;s=0;x=v;v=0;w=4;break a};case 1:{f=0;e=0;q=0;s=0;x=v;v=0;w=80;break a};default:{}}}b:do{if((s|0)!=0){v=0;while(1){z=c[w>>2]|0;A=x+16|0;c[z+(v*12|0)>>2]=x;if(!(A>>>0<q>>>0)){w=42;break}y=x+20|0;a[k]=a[A];a[k+1|0]=a[A+1|0];a[k+2|0]=a[A+2|0];a[k+3|0]=a[A+3|0];g[z+(v*12|0)+4>>2]=+g[k>>2];c[z+(v*12|0)+8>>2]=y;if((c[y>>2]|0)==-1){z=28}else{z=1;A=y;do{A=A+8|0;z=z+1|0}while(!((c[A>>2]|0)==-1));z=(z<<3)+20|0}if(!(y>>>0<q>>>0)){w=61;break}x=x+z|0;v=v+1|0;if(!(v>>>0<s>>>0)){break b}}if((w|0)==42){e=b+352|0;sr(b+500|0,3,p|0)|0;t=0;q=t;t=0;if((q|0)!=0&(u|0)!=0){f=tr(c[q>>2]|0,p)|0;if((f|0)==0){Na(q|0,u|0)}I=u}else{f=-1}v=I;switch(f|0){case 2:{f=0;q=0;s=0;x=v;v=0;w=63;break a};case 4:{f=0;q=0;s=0;x=v;v=0;w=20;break a};case 3:{f=0;q=0;s=0;x=v;v=0;w=44;break a};case 5:{f=0;q=0;s=0;x=v;v=0;w=4;break a};case 1:{f=0;q=0;s=0;x=v;v=0;w=80;break a};default:{}}f=0;q=0;s=0;x=0;v=0;w=44;break a}else if((w|0)==61){f=b+352|0;sr(b+500|0,2,p|0)|0;t=0;q=t;t=0;if((q|0)!=0&(u|0)!=0){e=tr(c[q>>2]|0,p)|0;if((e|0)==0){Na(q|0,u|0)}I=u}else{e=-1}v=I;switch(e|0){case 2:{e=0;q=0;s=0;x=v;v=0;w=63;break a};case 4:{e=0;q=0;s=0;x=v;v=0;w=20;break a};case 3:{e=0;q=0;s=0;x=v;v=0;w=44;break a};case 5:{e=0;q=0;s=0;x=v;v=0;w=4;break a};case 1:{e=0;q=0;s=0;x=v;v=0;w=80;break a};default:{}}e=0;q=0;s=0;x=0;v=0;w=63;break a}}}while(0);if((x-e|0)==(f|0)){B=1;i=h;return B|0}v=b+352|0;sr(b+500|0,1,p|0)|0;t=0;e=t;t=0;if((e|0)!=0&(u|0)!=0){f=tr(c[e>>2]|0,p)|0;if((f|0)==0){Na(e|0,u|0)}I=u}else{f=-1}w=I;switch(f|0){case 2:{f=0;e=0;q=0;s=0;x=w;w=63;break a};case 4:{f=0;e=0;q=0;s=0;x=w;w=20;break a};case 3:{f=0;e=0;q=0;s=0;x=w;w=44;break a};case 5:{f=0;e=0;q=0;s=0;x=w;w=4;break a};case 1:{f=0;e=0;q=0;s=0;x=w;w=80;break a};default:{}}f=0;e=0;q=0;s=0;x=0;w=80}else{s=b+352|0;sr(b+500|0,5,p|0)|0;t=0;e=t;t=0;if((e|0)!=0&(u|0)!=0){f=tr(c[e>>2]|0,p)|0;if((f|0)==0){Na(e|0,u|0)}I=u}else{f=-1}v=I;switch(f|0){case 2:{f=0;e=0;q=0;r=0;x=v;v=0;w=63;break a};case 4:{f=0;e=0;q=0;r=0;x=v;v=0;w=20;break a};case 3:{f=0;e=0;q=0;r=0;x=v;v=0;w=44;break a};case 5:{f=0;e=0;q=0;r=0;x=v;v=0;w=4;break a};case 1:{f=0;e=0;q=0;r=0;x=v;v=0;w=80;break a};default:{}}f=0;e=0;q=0;r=0;x=0;v=0;w=4}}while(0);c:while(1){if((w|0)==4){if((x|0)==1){t=0;sa(c[(c[b>>2]|0)+8>>2]|0,b|0)|0;w=t;t=0;if((w|0)!=0&(u|0)!=0){x=tr(c[w>>2]|0,p)|0;if((x|0)==0){Na(w|0,u|0)}I=u}else{x=-1}w=I;switch(x|0){case 2:{x=w;w=63;continue c};case 4:{x=w;w=20;continue c};case 3:{x=w;w=44;continue c};case 5:{D=v;C=s;y=r;z=q;A=e;B=f;x=w;v=D;s=C;r=y;q=z;e=A;f=B;w=4;continue c};case 1:{x=w;w=80;continue c};default:{w=6;break c}}}c[j>>2]=s;t=0;pa(44,s+(c[(c[s>>2]|0)+ -12>>2]|0)|0,0);w=t;t=0;if((w|0)!=0&(u|0)!=0){x=tr(c[w>>2]|0,p)|0;if((x|0)==0){Na(w|0,u|0)}I=u}else{x=-1}w=I;switch(x|0){case 2:{x=w;w=63;continue c};case 4:{x=w;w=20;continue c};case 3:{x=w;w=44;continue c};case 5:{y=v;z=s;A=r;B=q;C=e;D=f;x=w;v=y;s=z;r=A;q=B;e=C;f=D;w=4;continue c};case 1:{x=w;w=80;continue c};default:{}}t=0;x=Ba(26,s|0,336)|0;w=t;t=0;if((w|0)!=0&(u|0)!=0){y=tr(c[w>>2]|0,p)|0;if((y|0)==0){Na(w|0,u|0)}I=u}else{y=-1}w=I;switch(y|0){case 2:{x=w;w=63;continue c};case 4:{x=w;w=20;continue c};case 3:{x=w;w=44;continue c};case 5:{y=v;z=s;A=r;B=q;C=e;D=f;x=w;v=y;s=z;r=A;q=B;e=C;f=D;w=4;continue c};case 1:{x=w;w=80;continue c};default:{}}t=0;x=Ba(26,x|0,368)|0;w=t;t=0;if((w|0)!=0&(u|0)!=0){y=tr(c[w>>2]|0,p)|0;if((y|0)==0){Na(w|0,u|0)}I=u}else{y=-1}w=I;switch(y|0){case 2:{x=w;w=63;continue c};case 4:{x=w;w=20;continue c};case 3:{x=w;w=44;continue c};case 5:{y=v;z=s;A=r;B=q;C=e;D=f;x=w;v=y;s=z;r=A;q=B;e=C;f=D;w=4;continue c};case 1:{x=w;w=80;continue c};default:{}}t=0;x=Ba(27,x|0,117)|0;w=t;t=0;if((w|0)!=0&(u|0)!=0){y=tr(c[w>>2]|0,p)|0;if((y|0)==0){Na(w|0,u|0)}I=u}else{y=-1}w=I;switch(y|0){case 2:{x=w;w=63;continue c};case 4:{x=w;w=20;continue c};case 3:{x=w;w=44;continue c};case 5:{y=v;z=s;A=r;B=q;C=e;D=f;x=w;v=y;s=z;r=A;q=B;e=C;f=D;w=4;continue c};case 1:{x=w;w=80;continue c};default:{}}t=0;x=Ba(26,x|0,376)|0;w=t;t=0;if((w|0)!=0&(u|0)!=0){y=tr(c[w>>2]|0,p)|0;if((y|0)==0){Na(w|0,u|0)}I=u}else{y=-1}w=I;switch(y|0){case 2:{x=w;w=63;continue c};case 4:{x=w;w=20;continue c};case 3:{x=w;w=44;continue c};case 5:{y=v;z=s;A=r;B=q;C=e;D=f;x=w;v=y;s=z;r=A;q=B;e=C;f=D;w=4;continue c};case 1:{x=w;w=80;continue c};default:{}}t=0;x=Ba(26,x|0,448)|0;w=t;t=0;if((w|0)!=0&(u|0)!=0){y=tr(c[w>>2]|0,p)|0;if((y|0)==0){Na(w|0,u|0)}I=u}else{y=-1}w=I;switch(y|0){case 2:{x=w;w=63;continue c};case 4:{x=w;w=20;continue c};case 3:{x=w;w=44;continue c};case 5:{y=v;z=s;A=r;B=q;C=e;D=f;x=w;v=y;s=z;r=A;q=B;e=C;f=D;w=4;continue c};case 1:{x=w;w=80;continue c};default:{}}t=0;x=Ba(26,x|0,408)|0;w=t;t=0;if((w|0)!=0&(u|0)!=0){y=tr(c[w>>2]|0,p)|0;if((y|0)==0){Na(w|0,u|0)}I=u}else{y=-1}w=I;switch(y|0){case 2:{x=w;w=63;continue c};case 4:{x=w;w=20;continue c};case 3:{x=w;w=44;continue c};case 5:{y=v;z=s;A=r;B=q;C=e;D=f;x=w;v=y;s=z;r=A;q=B;e=C;f=D;w=4;continue c};case 1:{x=w;w=80;continue c};default:{}}t=0;Ba(26,x|0,488)|0;w=t;t=0;if((w|0)!=0&(u|0)!=0){x=tr(c[w>>2]|0,p)|0;if((x|0)==0){Na(w|0,u|0)}I=u}else{x=-1}w=I;switch(x|0){case 2:{x=w;w=63;continue c};case 4:{x=w;w=20;continue c};case 3:{x=w;w=44;continue c};case 5:{y=v;z=s;A=r;B=q;C=e;D=f;x=w;v=y;s=z;r=A;q=B;e=C;f=D;w=4;continue c};case 1:{x=w;w=80;continue c};default:{}}t=0;oa(140,j|0);w=t;t=0;if((w|0)!=0&(u|0)!=0){x=tr(c[w>>2]|0,p)|0;if((x|0)==0){Na(w|0,u|0)}I=u}else{x=-1}w=I;switch(x|0){case 2:{x=w;w=63;continue c};case 4:{x=w;w=20;continue c};case 3:{x=w;w=44;continue c};case 5:{y=v;z=s;A=r;B=q;C=e;D=f;x=w;v=y;s=z;r=A;q=B;e=C;f=D;w=4;continue c};case 1:{x=w;w=80;continue c};default:{w=16;break c}}}else if((w|0)==20){if((x|0)==1){t=0;sa(c[(c[b>>2]|0)+8>>2]|0,b|0)|0;w=t;t=0;if((w|0)!=0&(u|0)!=0){x=tr(c[w>>2]|0,p)|0;if((x|0)==0){Na(w|0,u|0)}I=u}else{x=-1}w=I;switch(x|0){case 2:{x=w;w=63;continue c};case 4:{y=v;z=s;A=r;B=q;C=e;D=f;x=w;v=y;s=z;r=A;q=B;e=C;f=D;w=20;continue c};case 3:{x=w;w=44;continue c};case 5:{x=w;w=4;continue c};case 1:{x=w;w=80;continue c};default:{w=22;break c}}}c[l>>2]=q;t=0;pa(44,q+(c[(c[q>>2]|0)+ -12>>2]|0)|0,0);w=t;t=0;if((w|0)!=0&(u|0)!=0){x=tr(c[w>>2]|0,p)|0;if((x|0)==0){Na(w|0,u|0)}I=u}else{x=-1}w=I;switch(x|0){case 2:{x=w;w=63;continue c};case 4:{y=v;z=s;A=r;B=q;C=e;D=f;x=w;v=y;s=z;r=A;q=B;e=C;f=D;w=20;continue c};case 3:{x=w;w=44;continue c};case 5:{x=w;w=4;continue c};case 1:{x=w;w=80;continue c};default:{}}t=0;x=Ba(26,q|0,336)|0;w=t;t=0;if((w|0)!=0&(u|0)!=0){y=tr(c[w>>2]|0,p)|0;if((y|0)==0){Na(w|0,u|0)}I=u}else{y=-1}w=I;switch(y|0){case 2:{x=w;w=63;continue c};case 4:{y=v;z=s;A=r;B=q;C=e;D=f;x=w;v=y;s=z;r=A;q=B;e=C;f=D;w=20;continue c};case 3:{x=w;w=44;continue c};case 5:{x=w;w=4;continue c};case 1:{x=w;w=80;continue c};default:{}}t=0;y=Ba(26,x|0,368)|0;w=t;t=0;if((w|0)!=0&(u|0)!=0){x=tr(c[w>>2]|0,p)|0;if((x|0)==0){Na(w|0,u|0)}I=u}else{x=-1}w=I;switch(x|0){case 2:{x=w;w=63;continue c};case 4:{y=v;z=s;A=r;B=q;C=e;D=f;x=w;v=y;s=z;r=A;q=B;e=C;f=D;w=20;continue c};case 3:{x=w;w=44;continue c};case 5:{x=w;w=4;continue c};case 1:{x=w;w=80;continue c};default:{}}t=0;x=Ba(27,y|0,121)|0;w=t;t=0;if((w|0)!=0&(u|0)!=0){y=tr(c[w>>2]|0,p)|0;if((y|0)==0){Na(w|0,u|0)}I=u}else{y=-1}w=I;switch(y|0){case 2:{x=w;w=63;continue c};case 4:{y=v;z=s;A=r;B=q;C=e;D=f;x=w;v=y;s=z;r=A;q=B;e=C;f=D;w=20;continue c};case 3:{x=w;w=44;continue c};case 5:{x=w;w=4;continue c};case 1:{x=w;w=80;continue c};default:{}}t=0;x=Ba(26,x|0,376)|0;w=t;t=0;if((w|0)!=0&(u|0)!=0){y=tr(c[w>>2]|0,p)|0;if((y|0)==0){Na(w|0,u|0)}I=u}else{y=-1}w=I;switch(y|0){case 2:{x=w;w=63;continue c};case 4:{y=v;z=s;A=r;B=q;C=e;D=f;x=w;v=y;s=z;r=A;q=B;e=C;f=D;w=20;continue c};case 3:{x=w;w=44;continue c};case 5:{x=w;w=4;continue c};case 1:{x=w;w=80;continue c};default:{}}t=0;x=Ba(26,x|0,512)|0;w=t;t=0;if((w|0)!=0&(u|0)!=0){y=tr(c[w>>2]|0,p)|0;if((y|0)==0){Na(w|0,u|0)}I=u}else{y=-1}w=I;switch(y|0){case 2:{x=w;w=63;continue c};case 4:{y=v;z=s;A=r;B=q;C=e;D=f;x=w;v=y;s=z;r=A;q=B;e=C;f=D;w=20;continue c};case 3:{x=w;w=44;continue c};case 5:{x=w;w=4;continue c};case 1:{x=w;w=80;continue c};default:{}}t=0;x=Ba(26,x|0,408)|0;w=t;t=0;if((w|0)!=0&(u|0)!=0){y=tr(c[w>>2]|0,p)|0;if((y|0)==0){Na(w|0,u|0)}I=u}else{y=-1}w=I;switch(y|0){case 2:{x=w;w=63;continue c};case 4:{y=v;z=s;A=r;B=q;C=e;D=f;x=w;v=y;s=z;r=A;q=B;e=C;f=D;w=20;continue c};case 3:{x=w;w=44;continue c};case 5:{x=w;w=4;continue c};case 1:{x=w;w=80;continue c};default:{}}t=0;x=Ba(26,x|0,536)|0;w=t;t=0;if((w|0)!=0&(u|0)!=0){y=tr(c[w>>2]|0,p)|0;if((y|0)==0){Na(w|0,u|0)}I=u}else{y=-1}w=I;switch(y|0){case 2:{x=w;w=63;continue c};case 4:{y=v;z=s;A=r;B=q;C=e;D=f;x=w;v=y;s=z;r=A;q=B;e=C;f=D;w=20;continue c};case 3:{x=w;w=44;continue c};case 5:{x=w;w=4;continue c};case 1:{x=w;w=80;continue c};default:{}}t=0;Ba(32,x|0,r|0)|0;w=t;t=0;if((w|0)!=0&(u|0)!=0){x=tr(c[w>>2]|0,p)|0;if((x|0)==0){Na(w|0,u|0)}I=u}else{x=-1}w=I;switch(x|0){case 2:{x=w;w=63;continue c};case 4:{y=v;z=s;A=r;B=q;C=e;D=f;x=w;v=y;s=z;r=A;q=B;e=C;f=D;w=20;continue c};case 3:{x=w;w=44;continue c};case 5:{x=w;w=4;continue c};case 1:{x=w;w=80;continue c};default:{}}t=0;oa(140,l|0);w=t;t=0;if((w|0)!=0&(u|0)!=0){x=tr(c[w>>2]|0,p)|0;if((x|0)==0){Na(w|0,u|0)}I=u}else{x=-1}w=I;switch(x|0){case 2:{x=w;w=63;continue c};case 4:{y=v;z=s;A=r;B=q;C=e;D=f;x=w;v=y;s=z;r=A;q=B;e=C;f=D;w=20;continue c};case 3:{x=w;w=44;continue c};case 5:{x=w;w=4;continue c};case 1:{x=w;w=80;continue c};default:{w=33;break c}}}else if((w|0)==44){if((x|0)==1){t=0;sa(c[(c[b>>2]|0)+8>>2]|0,b|0)|0;w=t;t=0;if((w|0)!=0&(u|0)!=0){x=tr(c[w>>2]|0,p)|0;if((x|0)==0){Na(w|0,u|0)}I=u}else{x=-1}w=I;switch(x|0){case 2:{x=w;w=63;continue c};case 4:{x=w;w=20;continue c};case 3:{y=v;z=s;A=r;B=q;C=e;D=f;x=w;v=y;s=z;r=A;q=B;e=C;f=D;w=44;continue c};case 5:{x=w;w=4;continue c};case 1:{x=w;w=80;continue c};default:{w=46;break c}}}c[m>>2]=e;t=0;pa(44,e+(c[(c[e>>2]|0)+ -12>>2]|0)|0,0);w=t;t=0;if((w|0)!=0&(u|0)!=0){x=tr(c[w>>2]|0,p)|0;if((x|0)==0){Na(w|0,u|0)}I=u}else{x=-1}w=I;switch(x|0){case 2:{x=w;w=63;continue c};case 4:{x=w;w=20;continue c};case 3:{y=v;z=s;A=r;B=q;C=e;D=f;x=w;v=y;s=z;r=A;q=B;e=C;f=D;w=44;continue c};case 5:{x=w;w=4;continue c};case 1:{x=w;w=80;continue c};default:{}}t=0;x=Ba(26,e|0,336)|0;w=t;t=0;if((w|0)!=0&(u|0)!=0){y=tr(c[w>>2]|0,p)|0;if((y|0)==0){Na(w|0,u|0)}I=u}else{y=-1}w=I;switch(y|0){case 2:{x=w;w=63;continue c};case 4:{x=w;w=20;continue c};case 3:{y=v;z=s;A=r;B=q;C=e;D=f;x=w;v=y;s=z;r=A;q=B;e=C;f=D;w=44;continue c};case 5:{x=w;w=4;continue c};case 1:{x=w;w=80;continue c};default:{}}t=0;x=Ba(26,x|0,368)|0;w=t;t=0;if((w|0)!=0&(u|0)!=0){y=tr(c[w>>2]|0,p)|0;if((y|0)==0){Na(w|0,u|0)}I=u}else{y=-1}w=I;switch(y|0){case 2:{x=w;w=63;continue c};case 4:{x=w;w=20;continue c};case 3:{y=v;z=s;A=r;B=q;C=e;D=f;x=w;v=y;s=z;r=A;q=B;e=C;f=D;w=44;continue c};case 5:{x=w;w=4;continue c};case 1:{x=w;w=80;continue c};default:{}}t=0;x=Ba(27,x|0,131)|0;w=t;t=0;if((w|0)!=0&(u|0)!=0){y=tr(c[w>>2]|0,p)|0;if((y|0)==0){Na(w|0,u|0)}I=u}else{y=-1}w=I;switch(y|0){case 2:{x=w;w=63;continue c};case 4:{x=w;w=20;continue c};case 3:{y=v;z=s;A=r;B=q;C=e;D=f;x=w;v=y;s=z;r=A;q=B;e=C;f=D;w=44;continue c};case 5:{x=w;w=4;continue c};case 1:{x=w;w=80;continue c};default:{}}t=0;x=Ba(26,x|0,376)|0;w=t;t=0;if((w|0)!=0&(u|0)!=0){y=tr(c[w>>2]|0,p)|0;if((y|0)==0){Na(w|0,u|0)}I=u}else{y=-1}w=I;switch(y|0){case 2:{x=w;w=63;continue c};case 4:{x=w;w=20;continue c};case 3:{y=v;z=s;A=r;B=q;C=e;D=f;x=w;v=y;s=z;r=A;q=B;e=C;f=D;w=44;continue c};case 5:{x=w;w=4;continue c};case 1:{x=w;w=80;continue c};default:{}}t=0;y=Ba(26,x|0,560)|0;w=t;t=0;if((w|0)!=0&(u|0)!=0){x=tr(c[w>>2]|0,p)|0;if((x|0)==0){Na(w|0,u|0)}I=u}else{x=-1}w=I;switch(x|0){case 2:{x=w;w=63;continue c};case 4:{x=w;w=20;continue c};case 3:{y=v;z=s;A=r;B=q;C=e;D=f;x=w;v=y;s=z;r=A;q=B;e=C;f=D;w=44;continue c};case 5:{x=w;w=4;continue c};case 1:{x=w;w=80;continue c};default:{}}t=0;y=Ba(26,y|0,408)|0;w=t;t=0;if((w|0)!=0&(u|0)!=0){x=tr(c[w>>2]|0,p)|0;if((x|0)==0){Na(w|0,u|0)}I=u}else{x=-1}w=I;switch(x|0){case 2:{x=w;w=63;continue c};case 4:{x=w;w=20;continue c};case 3:{y=v;z=s;A=r;B=q;C=e;D=f;x=w;v=y;s=z;r=A;q=B;e=C;f=D;w=44;continue c};case 5:{x=w;w=4;continue c};case 1:{x=w;w=80;continue c};default:{}}t=0;Ba(26,y|0,488)|0;w=t;t=0;if((w|0)!=0&(u|0)!=0){x=tr(c[w>>2]|0,p)|0;if((x|0)==0){Na(w|0,u|0)}I=u}else{x=-1}w=I;switch(x|0){case 2:{x=w;w=63;continue c};case 4:{x=w;w=20;continue c};case 3:{y=v;z=s;A=r;B=q;C=e;D=f;x=w;v=y;s=z;r=A;q=B;e=C;f=D;w=44;continue c};case 5:{x=w;w=4;continue c};case 1:{x=w;w=80;continue c};default:{}}t=0;oa(140,m|0);w=t;t=0;if((w|0)!=0&(u|0)!=0){x=tr(c[w>>2]|0,p)|0;if((x|0)==0){Na(w|0,u|0)}I=u}else{x=-1}w=I;switch(x|0){case 2:{x=w;w=63;continue c};case 4:{x=w;w=20;continue c};case 3:{y=v;z=s;A=r;B=q;C=e;D=f;x=w;v=y;s=z;r=A;q=B;e=C;f=D;w=44;continue c};case 5:{x=w;w=4;continue c};case 1:{x=w;w=80;continue c};default:{w=56;break c}}}else if((w|0)==63){if((x|0)==1){t=0;sa(c[(c[b>>2]|0)+8>>2]|0,b|0)|0;w=t;t=0;if((w|0)!=0&(u|0)!=0){x=tr(c[w>>2]|0,p)|0;if((x|0)==0){Na(w|0,u|0)}I=u}else{x=-1}w=I;switch(x|0){case 2:{y=v;z=s;A=r;B=q;C=e;D=f;x=w;v=y;s=z;r=A;q=B;e=C;f=D;w=63;continue c};case 4:{x=w;w=20;continue c};case 3:{x=w;w=44;continue c};case 5:{x=w;w=4;continue c};case 1:{x=w;w=80;continue c};default:{w=65;break c}}}c[n>>2]=f;t=0;pa(44,f+(c[(c[f>>2]|0)+ -12>>2]|0)|0,0);w=t;t=0;if((w|0)!=0&(u|0)!=0){x=tr(c[w>>2]|0,p)|0;if((x|0)==0){Na(w|0,u|0)}I=u}else{x=-1}w=I;switch(x|0){case 2:{y=v;z=s;A=r;B=q;C=e;D=f;x=w;v=y;s=z;r=A;q=B;e=C;f=D;w=63;continue c};case 4:{x=w;w=20;continue c};case 3:{x=w;w=44;continue c};case 5:{x=w;w=4;continue c};case 1:{x=w;w=80;continue c};default:{}}t=0;y=Ba(26,f|0,336)|0;w=t;t=0;if((w|0)!=0&(u|0)!=0){x=tr(c[w>>2]|0,p)|0;if((x|0)==0){Na(w|0,u|0)}I=u}else{x=-1}w=I;switch(x|0){case 2:{y=v;z=s;A=r;B=q;C=e;D=f;x=w;v=y;s=z;r=A;q=B;e=C;f=D;w=63;continue c};case 4:{x=w;w=20;continue c};case 3:{x=w;w=44;continue c};case 5:{x=w;w=4;continue c};case 1:{x=w;w=80;continue c};default:{}}t=0;y=Ba(26,y|0,368)|0;w=t;t=0;if((w|0)!=0&(u|0)!=0){x=tr(c[w>>2]|0,p)|0;if((x|0)==0){Na(w|0,u|0)}I=u}else{x=-1}w=I;switch(x|0){case 2:{y=v;z=s;A=r;B=q;C=e;D=f;x=w;v=y;s=z;r=A;q=B;e=C;f=D;w=63;continue c};case 4:{x=w;w=20;continue c};case 3:{x=w;w=44;continue c};case 5:{x=w;w=4;continue c};case 1:{x=w;w=80;continue c};default:{}}t=0;y=Ba(27,y|0,139)|0;w=t;t=0;if((w|0)!=0&(u|0)!=0){x=tr(c[w>>2]|0,p)|0;if((x|0)==0){Na(w|0,u|0)}I=u}else{x=-1}w=I;switch(x|0){case 2:{y=v;z=s;A=r;B=q;C=e;D=f;x=w;v=y;s=z;r=A;q=B;e=C;f=D;w=63;continue c};case 4:{x=w;w=20;continue c};case 3:{x=w;w=44;continue c};case 5:{x=w;w=4;continue c};case 1:{x=w;w=80;continue c};default:{}}t=0;y=Ba(26,y|0,376)|0;w=t;t=0;if((w|0)!=0&(u|0)!=0){x=tr(c[w>>2]|0,p)|0;if((x|0)==0){Na(w|0,u|0)}I=u}else{x=-1}w=I;switch(x|0){case 2:{y=v;z=s;A=r;B=q;C=e;D=f;x=w;v=y;s=z;r=A;q=B;e=C;f=D;w=63;continue c};case 4:{x=w;w=20;continue c};case 3:{x=w;w=44;continue c};case 5:{x=w;w=4;continue c};case 1:{x=w;w=80;continue c};default:{}}t=0;y=Ba(26,y|0,560)|0;w=t;t=0;if((w|0)!=0&(u|0)!=0){x=tr(c[w>>2]|0,p)|0;if((x|0)==0){Na(w|0,u|0)}I=u}else{x=-1}w=I;switch(x|0){case 2:{y=v;z=s;A=r;B=q;C=e;D=f;x=w;v=y;s=z;r=A;q=B;e=C;f=D;w=63;continue c};case 4:{x=w;w=20;continue c};case 3:{x=w;w=44;continue c};case 5:{x=w;w=4;continue c};case 1:{x=w;w=80;continue c};default:{}}t=0;y=Ba(26,y|0,408)|0;w=t;t=0;if((w|0)!=0&(u|0)!=0){x=tr(c[w>>2]|0,p)|0;if((x|0)==0){Na(w|0,u|0)}I=u}else{x=-1}w=I;switch(x|0){case 2:{y=v;z=s;A=r;B=q;C=e;D=f;x=w;v=y;s=z;r=A;q=B;e=C;f=D;w=63;continue c};case 4:{x=w;w=20;continue c};case 3:{x=w;w=44;continue c};case 5:{x=w;w=4;continue c};case 1:{x=w;w=80;continue c};default:{}}t=0;Ba(26,y|0,488)|0;w=t;t=0;if((w|0)!=0&(u|0)!=0){x=tr(c[w>>2]|0,p)|0;if((x|0)==0){Na(w|0,u|0)}I=u}else{x=-1}w=I;switch(x|0){case 2:{y=v;z=s;A=r;B=q;C=e;D=f;x=w;v=y;s=z;r=A;q=B;e=C;f=D;w=63;continue c};case 4:{x=w;w=20;continue c};case 3:{x=w;w=44;continue c};case 5:{x=w;w=4;continue c};case 1:{x=w;w=80;continue c};default:{}}t=0;oa(140,n|0);w=t;t=0;if((w|0)!=0&(u|0)!=0){x=tr(c[w>>2]|0,p)|0;if((x|0)==0){Na(w|0,u|0)}I=u}else{x=-1}w=I;switch(x|0){case 2:{y=v;z=s;A=r;B=q;C=e;D=f;x=w;v=y;s=z;r=A;q=B;e=C;f=D;w=63;continue c};case 4:{x=w;w=20;continue c};case 3:{x=w;w=44;continue c};case 5:{x=w;w=4;continue c};case 1:{x=w;w=80;continue c};default:{w=75;break c}}}else if((w|0)==80){if((x|0)==1){j=0;w=91;break}c[o>>2]=v;t=0;pa(44,v+(c[(c[v>>2]|0)+ -12>>2]|0)|0,0);w=t;t=0;if((w|0)!=0&(u|0)!=0){x=tr(c[w>>2]|0,p)|0;if((x|0)==0){Na(w|0,u|0)}I=u}else{x=-1}w=I;switch(x|0){case 2:{x=w;w=63;continue c};case 4:{x=w;w=20;continue c};case 3:{x=w;w=44;continue c};case 5:{x=w;w=4;continue c};case 1:{y=v;z=s;A=r;B=q;C=e;D=f;x=w;v=y;s=z;r=A;q=B;e=C;f=D;w=80;continue c};default:{}}t=0;y=Ba(26,v|0,336)|0;w=t;t=0;if((w|0)!=0&(u|0)!=0){x=tr(c[w>>2]|0,p)|0;if((x|0)==0){Na(w|0,u|0)}I=u}else{x=-1}w=I;switch(x|0){case 2:{x=w;w=63;continue c};case 4:{x=w;w=20;continue c};case 3:{x=w;w=44;continue c};case 5:{x=w;w=4;continue c};case 1:{y=v;z=s;A=r;B=q;C=e;D=f;x=w;v=y;s=z;r=A;q=B;e=C;f=D;w=80;continue c};default:{}}t=0;y=Ba(26,y|0,368)|0;w=t;t=0;if((w|0)!=0&(u|0)!=0){x=tr(c[w>>2]|0,p)|0;if((x|0)==0){Na(w|0,u|0)}I=u}else{x=-1}w=I;switch(x|0){case 2:{x=w;w=63;continue c};case 4:{x=w;w=20;continue c};case 3:{x=w;w=44;continue c};case 5:{x=w;w=4;continue c};case 1:{y=v;z=s;A=r;B=q;C=e;D=f;x=w;v=y;s=z;r=A;q=B;e=C;f=D;w=80;continue c};default:{}}t=0;y=Ba(27,y|0,143)|0;w=t;t=0;if((w|0)!=0&(u|0)!=0){x=tr(c[w>>2]|0,p)|0;if((x|0)==0){Na(w|0,u|0)}I=u}else{x=-1}w=I;switch(x|0){case 2:{x=w;w=63;continue c};case 4:{x=w;w=20;continue c};case 3:{x=w;w=44;continue c};case 5:{x=w;w=4;continue c};case 1:{y=v;z=s;A=r;B=q;C=e;D=f;x=w;v=y;s=z;r=A;q=B;e=C;f=D;w=80;continue c};default:{}}t=0;y=Ba(26,y|0,376)|0;w=t;t=0;if((w|0)!=0&(u|0)!=0){x=tr(c[w>>2]|0,p)|0;if((x|0)==0){Na(w|0,u|0)}I=u}else{x=-1}w=I;switch(x|0){case 2:{x=w;w=63;continue c};case 4:{x=w;w=20;continue c};case 3:{x=w;w=44;continue c};case 5:{x=w;w=4;continue c};case 1:{y=v;z=s;A=r;B=q;C=e;D=f;x=w;v=y;s=z;r=A;q=B;e=C;f=D;w=80;continue c};default:{}}t=0;y=Ba(26,y|0,576)|0;w=t;t=0;if((w|0)!=0&(u|0)!=0){x=tr(c[w>>2]|0,p)|0;if((x|0)==0){Na(w|0,u|0)}I=u}else{x=-1}w=I;switch(x|0){case 2:{x=w;w=63;continue c};case 4:{x=w;w=20;continue c};case 3:{x=w;w=44;continue c};case 5:{x=w;w=4;continue c};case 1:{y=v;z=s;A=r;B=q;C=e;D=f;x=w;v=y;s=z;r=A;q=B;e=C;f=D;w=80;continue c};default:{}}t=0;y=Ba(26,y|0,408)|0;w=t;t=0;if((w|0)!=0&(u|0)!=0){x=tr(c[w>>2]|0,p)|0;if((x|0)==0){Na(w|0,u|0)}I=u}else{x=-1}w=I;switch(x|0){case 2:{x=w;w=63;continue c};case 4:{x=w;w=20;continue c};case 3:{x=w;w=44;continue c};case 5:{x=w;w=4;continue c};case 1:{y=v;z=s;A=r;B=q;C=e;D=f;x=w;v=y;s=z;r=A;q=B;e=C;f=D;w=80;continue c};default:{}}t=0;Ba(26,y|0,624)|0;w=t;t=0;if((w|0)!=0&(u|0)!=0){x=tr(c[w>>2]|0,p)|0;if((x|0)==0){Na(w|0,u|0)}I=u}else{x=-1}w=I;switch(x|0){case 2:{x=w;w=63;continue c};case 4:{x=w;w=20;continue c};case 3:{x=w;w=44;continue c};case 5:{x=w;w=4;continue c};case 1:{y=v;z=s;A=r;B=q;C=e;D=f;x=w;v=y;s=z;r=A;q=B;e=C;f=D;w=80;continue c};default:{}}t=0;oa(140,o|0);w=t;t=0;if((w|0)!=0&(u|0)!=0){x=tr(c[w>>2]|0,p)|0;if((x|0)==0){Na(w|0,u|0)}I=u}else{x=-1}w=I;switch(x|0){case 2:{x=w;w=63;continue c};case 4:{x=w;w=20;continue c};case 3:{x=w;w=44;continue c};case 5:{x=w;w=4;continue c};case 1:{y=v;z=s;A=r;B=q;C=e;D=f;x=w;v=y;s=z;r=A;q=B;e=C;f=D;w=80;continue c};default:{w=90;break c}}}}switch(w|0){case 6:{D=0;i=h;return D|0};case 16:{break};case 22:{D=0;i=h;return D|0};case 33:{break};case 46:{D=0;i=h;return D|0};case 56:{break};case 65:{D=0;i=h;return D|0};case 75:{break};case 90:{break};case 91:{i=h;return j|0}}return 0}function Md(a){a=a|0;var b=0,d=0,e=0;b=i;d=a+332|0;e=c[d>>2]|0;if((e|0)>-1){Va(e|0)|0;c[d>>2]=-1}d=a+8|0;e=c[d>>2]|0;if((e|0)!=0){Gb(e|0,c[a+12>>2]|0)|0;c[d>>2]=0}c[d>>2]=0;d=c[a+340>>2]|0;e=a+344|0;a=c[e>>2]|0;if((a|0)==(d|0)){i=b;return 1}c[e>>2]=a+(~(((a+ -12+(0-d)|0)>>>0)/12|0)*12|0);i=b;return 1}function Nd(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0.0,t=0,u=0,v=0.0,w=0,x=0,y=0,z=0;e=i;i=i+48|0;m=e+36|0;l=e+32|0;k=e+28|0;p=e+24|0;o=e+20|0;j=e+16|0;n=e;h=e+4|0;t=a+340|0;r=a+344|0;if((c[t>>2]|0)==(c[r>>2]|0)|(d|0)==0){z=0;i=e;return z|0}c[h>>2]=0;f=h+4|0;c[f>>2]=0;c[h+8>>2]=0;if(me(h,b)|0){b=c[h>>2]|0;u=Pc[c[(c[a>>2]|0)+12>>2]&127](a)|0;if((u|0)==0){a=0;q=0}else{if(u>>>0>536870911){Sn(0)}a=Wq(u<<3)|0;q=a;do{if((q|0)==0){q=0}else{g[q>>2]=0.0;c[q+4>>2]=0}q=q+8|0;u=u+ -1|0}while((u|0)!=0)}r=c[r>>2]|0;t=c[t>>2]|0;if((r|0)!=(t|0)){u=0;do{s=+g[t+(u*12|0)+4>>2];w=c[t+(u*12|0)+8>>2]|0;y=c[w>>2]|0;a:do{if((y|0)>-1){x=b;v=0.0;while(1){b:while(1){c:do{if(!((y|0)>-1)){z=c[x>>2]|0;if(!((z|0)>-1)){break a}if((y|0)==(z|0)){break b}if((y|0)>=(z|0)){break a}}else{while(1){z=c[x>>2]|0;if(!((z|0)>-1)){break a}if((y|0)==(z|0)){break b}if((y|0)<(z|0)){break c}x=x+8|0}}}while(0);w=w+8|0;y=c[w>>2]|0;if(!((y|0)>-1)){break a}}v=v+ +g[w+4>>2]*+g[x+4>>2];w=w+8|0;y=c[w>>2]|0;if((y|0)>-1){x=x+8|0}else{break}}}else{v=0.0}}while(0);g[a+(u<<3)>>2]=s+v;c[a+(u<<3)+4>>2]=c[t+(u*12|0)>>2];u=u+1|0}while(u>>>0<((r-t|0)/12|0)>>>0)}b=q-a>>3;d=b>>>0>d>>>0?d:b;c[p>>2]=a;c[o>>2]=a+(d<<3);c[j>>2]=q;c[k+0>>2]=c[p+0>>2];c[l+0>>2]=c[o+0>>2];c[m+0>>2]=c[j+0>>2];Ud(k,l,m,n);j=Wq(16)|0;c[j>>2]=1128;c[j+4>>2]=0;c[j+8>>2]=0;c[j+12>>2]=0;if((d|0)!=0){k=0;do{Od(j,c[a+(k<<3)+4>>2]|0,+g[a+(k<<3)>>2]);k=k+1|0}while(k>>>0<d>>>0)}if((a|0)!=0){Yq(a)}}else{j=0}h=c[h>>2]|0;if((h|0)==0){z=j;i=e;return z|0}k=c[f>>2]|0;if((k|0)!=(h|0)){c[f>>2]=k+(~((k+ -8+(0-h)|0)>>>3)<<3)}Yq(h);z=j;i=e;return z|0}function Od(a,b,d){a=a|0;b=b|0;d=+d;var e=0,f=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0;e=i;f=a+8|0;l=c[f>>2]|0;h=a+12|0;if((l|0)!=(c[h>>2]|0)){if((l|0)==0){h=0}else{h=l;g[h>>2]=d;c[h+4>>2]=b;h=c[f>>2]|0}c[f>>2]=h+8;i=e;return}a=a+4|0;k=c[a>>2]|0;m=l-k|0;n=m>>3;l=n+1|0;if(l>>>0>536870911){Sn(0)}if(n>>>0<268435455){o=m>>2;p=o>>>0<l>>>0?l:o;if((p|0)==0){o=0;p=0}else{j=9}}else{p=536870911;j=9}if((j|0)==9){o=p;p=Wq(p<<3)|0}j=p+(n<<3)|0;if((j|0)!=0){n=j;g[n>>2]=d;c[n+4>>2]=b}ur(p|0,k|0,m|0)|0;c[a>>2]=p;c[f>>2]=p+(l<<3);c[h>>2]=p+(o<<3);if((k|0)==0){i=e;return}Yq(k);i=e;return}function Pd(){var a=0,b=0;b=i;a=Wq(656)|0;$d(a);i=b;return a|0}function Qd(a){a=a|0;return((c[a+344>>2]|0)-(c[a+340>>2]|0)|0)/12|0|0}function Rd(b){b=b|0;var d=0,e=0,f=0;e=i;i=i+16|0;f=e;d=b+488|0;Ed(f,b+356|0);wi(d,f)|0;if(!((a[f]&1)==0)){Yq(c[f+8>>2]|0)}if((a[d]&1)==0){f=d+1|0;i=e;return f|0}else{f=c[b+496>>2]|0;i=e;return f|0}return 0}function Sd(a){a=a|0;var b=0;b=i;Xd(a);i=b;return}function Td(a){a=a|0;var b=0;b=i;Xd(a);Yq(a);i=b;return}function Ud(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;var f=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0.0,x=0,y=0,z=0,A=0,B=0.0,C=0,D=0;k=i;i=i+32|0;j=k+20|0;h=k+16|0;e=k+12|0;f=k+8|0;p=k+4|0;o=k;s=c[a>>2]|0;u=c[b>>2]|0;D=u-s|0;t=D>>3;if((D|0)>8){x=s;A=1;while(1){u=x+8|0;v=A+1|0;z=(A+ -1|0)/2|0;y=s+(z<<3)|0;w=+g[u>>2];B=+g[y>>2];if(!(w<B)){if(!(B<w)?(r=x+12|0,q=c[s+(z<<3)+4>>2]|0,(c[r>>2]|0)>>>0<q>>>0):0){D=r;C=q;l=6}}else{D=x+12|0;C=c[s+(z<<3)+4>>2]|0;l=6}if((l|0)==6){l=0;x=u;w=+g[x>>2];x=c[x+4>>2]|0;g[u>>2]=B;c[D>>2]=C;a:do{if(!(A>>>0<3)){while(1){C=(z+ -1|0)/2|0;A=s+(C<<3)|0;B=+g[A>>2];if(!(w<B)){if(B<w){break a}D=s+(C<<3)+4|0;if(!(x>>>0<(c[D>>2]|0)>>>0)){break a}}else{D=s+(C<<3)+4|0}g[y>>2]=B;c[y+4>>2]=c[D>>2];if(z>>>0<3){y=A;break}else{z=C;y=A}}}}while(0);g[y>>2]=w;c[y+4>>2]=x}if((v|0)<(t|0)){x=u;A=v}else{break}}t=c[b>>2]|0;s=c[a>>2]|0}else{t=u}q=t-s>>3;u=c[d>>2]|0;if((t|0)!=(u|0)){r=t;do{w=+g[s>>2];B=+g[r>>2];if(!(w<B)){if(!(B<w)?(n=c[s+4>>2]|0,m=c[r+4>>2]|0,n>>>0<m>>>0):0){t=n;u=m;l=21}}else{t=c[s+4>>2]|0;u=c[r+4>>2]|0;l=21}if((l|0)==21){l=0;g[r>>2]=w;g[s>>2]=B;c[r+4>>2]=t;c[s+4>>2]=u;s=c[a>>2]|0;c[p>>2]=s;t=c[b>>2]|0;c[o>>2]=t;c[h+0>>2]=c[p+0>>2];c[j+0>>2]=c[o+0>>2];Vd(h,j,0,q);u=c[d>>2]|0}r=r+8|0}while((r|0)!=(u|0))}l=t-s|0;if((l|0)<=8){i=k;return}d=s+4|0;m=l>>3;while(1){l=t+ -8|0;B=+g[s>>2];g[s>>2]=+g[l>>2];g[l>>2]=B;D=t+ -4|0;C=c[d>>2]|0;c[d>>2]=c[D>>2];c[D>>2]=C;c[e>>2]=s;c[f>>2]=l;m=m+ -1|0;c[h+0>>2]=c[e+0>>2];c[j+0>>2]=c[f+0>>2];Vd(h,j,0,m);if((m|0)>1){t=l}else{break}}i=k;return}function Vd(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;var f=0,h=0.0,j=0.0,k=0.0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0.0;b=i;if((e|0)<=1){i=b;return}l=c[a>>2]|0;m=l+16|0;k=+g[l+8>>2];if((e|0)!=2?(s=+g[m>>2],!(k<s)):0){if(!(s<k)?(c[l+12>>2]|0)>>>0<(c[l+20>>2]|0)>>>0:0){f=6}else{n=4}}else{f=6}if((f|0)==6){s=k;m=l+8|0;n=2}k=+g[l>>2];if(!(s<k)){if(k<s){i=b;return}p=c[m+4>>2]|0;o=l+4|0;if(!(p>>>0<(c[o>>2]|0)>>>0)){i=b;return}}else{o=l+4|0;p=c[m+4>>2]|0}d=l;k=+g[d>>2];d=c[d+4>>2]|0;g[l>>2]=s;q=m+4|0;c[o>>2]=p;o=n+2|0;a:do{if((o|0)<=(e|0)){r=n;n=m;while(1){p=l+(o<<3)|0;r=r|1;if((o|0)!=(e|0)?(j=+g[l+(r<<3)>>2],h=+g[p>>2],!(j<h)):0){if(!(h<j)?(c[l+(r<<3)+4>>2]|0)>>>0<(c[l+(o<<3)+4>>2]|0)>>>0:0){f=16}else{s=h}}else{f=16}if((f|0)==16){f=0;p=l+(r<<3)|0;s=+g[p>>2];o=r}if(!(s<k)){if(k<s){break a}l=c[p+4>>2]|0;if(!(l>>>0<d>>>0)){break a}}else{l=c[p+4>>2]|0}g[n>>2]=s;q=p+4|0;c[n+4>>2]=l;r=o<<1;o=r+2|0;if((o|0)>(e|0)){m=p;break a}l=c[a>>2]|0;n=p;m=p}}}while(0);g[m>>2]=k;c[q>>2]=d;i=b;return}function Wd(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0;e=i;f=a+8|0;d=a+4|0;k=c[d>>2]|0;j=c[f>>2]|0;g=k;if(!(((j-g|0)/12|0)>>>0<b>>>0)){do{if((k|0)==0){f=0}else{c[k+0>>2]=0;c[k+4>>2]=0;c[k+8>>2]=0;f=c[d>>2]|0}k=f+12|0;c[d>>2]=k;b=b+ -1|0}while((b|0)!=0);i=e;return}l=c[a>>2]|0;g=(g-l|0)/12|0;k=g+b|0;if(k>>>0>357913941){Sn(0)}j=(j-l|0)/12|0;if(j>>>0<178956970){j=j<<1;k=j>>>0<k>>>0?k:j;if((k|0)==0){j=0;k=0}else{h=9}}else{k=357913941;h=9}if((h|0)==9){j=k;k=Wq(k*12|0)|0}h=k+(g*12|0)|0;do{if((h|0)==0){h=0}else{c[h+0>>2]=0;c[h+4>>2]=0;c[h+8>>2]=0}h=h+12|0;b=b+ -1|0}while((b|0)!=0);b=c[a>>2]|0;m=(c[d>>2]|0)-b|0;l=k+((((m|0)/-12|0)+g|0)*12|0)|0;ur(l|0,b|0,m|0)|0;c[a>>2]=l;c[d>>2]=h;c[f>>2]=k+(j*12|0);if((b|0)==0){i=e;return}Yq(b);i=e;return}function Xd(b){b=b|0;var d=0,e=0,f=0,g=0,h=0;d=i;c[b>>2]=664;f=b+332|0;e=c[f>>2]|0;if((e|0)>-1){Va(e|0)|0;c[f>>2]=-1}e=b+8|0;f=c[e>>2]|0;if((f|0)!=0){Gb(f|0,c[b+12>>2]|0)|0;c[e>>2]=0}c[e>>2]=0;f=b+340|0;g=c[f>>2]|0;e=b+344|0;h=c[e>>2]|0;if((h|0)!=(g|0)){c[e>>2]=h+(~(((h+ -12+(0-g)|0)>>>0)/12|0)*12|0)}if(!((a[b+488|0]&1)==0)){Yq(c[b+496>>2]|0)}c[b+352>>2]=172;c[b+408>>2]=192;g=b+356|0;c[g>>2]=16;if(!((a[b+388|0]&1)==0)){Yq(c[b+396>>2]|0)}c[g>>2]=9208;_n(b+360|0);Pi(b+408|0);f=c[f>>2]|0;if((f|0)==0){h=b+4|0;Zd(h);i=d;return}g=c[e>>2]|0;if((g|0)!=(f|0)){c[e>>2]=g+(~(((g+ -12+(0-f)|0)>>>0)/12|0)*12|0)}Yq(f);h=b+4|0;Zd(h);i=d;return}function Yd(a){a=a|0;var b=0;b=i;Zd(a);i=b;return}function Zd(b){b=b|0;var d=0,e=0,f=0;d=i;c[b>>2]=1080;e=b+328|0;f=c[e>>2]|0;if((f|0)>-1){Va(f|0)|0;c[e>>2]=-1}e=b+4|0;f=c[e>>2]|0;if((f|0)!=0){Gb(f|0,c[b+8>>2]|0)|0;c[e>>2]=0}c[e>>2]=0;if(!((a[b+160|0]&1)==0)){Yq(c[b+168>>2]|0)}c[b+24>>2]=172;c[b+80>>2]=192;e=b+28|0;c[e>>2]=16;if(!((a[b+60|0]&1)==0)){Yq(c[b+68>>2]|0)}c[e>>2]=9208;_n(b+32|0);Pi(b+80|0);if((a[b+12|0]&1)==0){i=d;return}Yq(c[b+20>>2]|0);i=d;return}function _d(a){a=a|0;var b=0;b=i;Zd(a);Yq(a);i=b;return}function $d(a){a=a|0;var b=0,d=0;b=i;c[a>>2]=664;c[a+4>>2]=1080;c[a+8>>2]=0;d=a+16|0;c[d+0>>2]=0;c[d+4>>2]=0;c[d+8>>2]=0;Fd(a+28|0);c[a+332>>2]=-1;c[a+340>>2]=0;c[a+344>>2]=0;c[a+348>>2]=0;Fd(a+352|0);i=b;return}function ae(a,b){a=a|0;b=b|0;var d=0,e=0;d=i;e=c[a+4>>2]|0;if(!((c[a+8>>2]|0)-e>>3>>>0>b>>>0)){a=0;i=d;return a|0}a=c[e+(b<<3)+4>>2]|0;i=d;return a|0}function be(a,b){a=a|0;b=b|0;var d=0,e=0,f=0.0;d=i;e=c[a+4>>2]|0;if(!((c[a+8>>2]|0)-e>>3>>>0>b>>>0)){f=-1.0;i=d;return+f}f=+g[e+(b<<3)>>2];i=d;return+f}function ce(a){a=a|0;return(c[a+8>>2]|0)-(c[a+4>>2]|0)>>3|0}function de(a){a=a|0;var b=0,d=0,e=0;b=i;c[a>>2]=1128;d=c[a+4>>2]|0;if((d|0)==0){i=b;return}a=a+8|0;e=c[a>>2]|0;if((e|0)!=(d|0)){c[a>>2]=e+(~((e+ -8+(0-d)|0)>>>3)<<3)}Yq(d);i=b;return}function ee(a){a=a|0;var b=0,d=0,e=0,f=0;b=i;c[a>>2]=1128;d=c[a+4>>2]|0;if((d|0)==0){Yq(a);i=b;return}e=a+8|0;f=c[e>>2]|0;if((f|0)!=(d|0)){c[e>>2]=f+(~((f+ -8+(0-d)|0)>>>3)<<3)}Yq(d);Yq(a);i=b;return}function fe(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0;f=i;a:while(1){j=c[d>>2]|0;h=a[j]|0;c[d>>2]=j+1;if((hc(h<<24>>24|0)|0)!=0){continue}j=c[d>>2]|0;if(!(j>>>0<e>>>0)){break}if(!(h<<24>>24==59)){g=5;break}while(1){if(!(j>>>0<e>>>0)){continue a}h=a[j]|0;j=j+1|0;c[d>>2]=j;if(h<<24>>24==10|h<<24>>24==13){continue a}}}if((g|0)==5){j=j+ -1|0;c[d>>2]=j}if(!(j>>>0<e>>>0)){j=0;i=f;return j|0}do{g=a[j]|0;c[d>>2]=j+1;h=(hc(g<<24>>24|0)|0)==0;j=c[d>>2]|0}while(!h);if(!(j>>>0<e>>>0)){j=0;i=f;return j|0}if(g<<24>>24==40){j=ge(b,d,e)|0;i=f;return j|0}else{c[d>>2]=j+ -1;j=he(b,d,e)|0;i=f;return j|0}return 0}function ge(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0;f=i;a:while(1){j=c[d>>2]|0;h=a[j]|0;c[d>>2]=j+1;if((hc(h<<24>>24|0)|0)!=0){continue}j=c[d>>2]|0;if(!(j>>>0<e>>>0)){h=j;break}if(!(h<<24>>24==59)){g=5;break}while(1){if(!(j>>>0<e>>>0)){continue a}h=a[j]|0;j=j+1|0;c[d>>2]=j;if(h<<24>>24==10|h<<24>>24==13){continue a}}}if((g|0)==5){h=j+ -1|0;c[d>>2]=h}do{g=a[h]|0;c[d>>2]=h+1;j=(hc(g<<24>>24|0)|0)==0;h=c[d>>2]|0}while(!j);if(h>>>0>=e>>>0|g<<24>>24==41){j=0;i=f;return j|0}c[d>>2]=h+ -1;j=ke(b+4|0,1)|0;h=fe(b,d,e)|0;a[j]=0;c[j+4>>2]=h;h=je(b,d,e)|0;a[j]=0;c[j+8>>2]=h;i=f;return j|0}function he(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0,k=0;f=i;a:while(1){h=c[d>>2]|0;j=a[h]|0;c[d>>2]=h+1;if((hc(j<<24>>24|0)|0)!=0){continue}h=c[d>>2]|0;if(!(h>>>0<e>>>0)){break}if(!(j<<24>>24==59)){g=5;break}while(1){if(!(h>>>0<e>>>0)){continue a}j=a[h]|0;h=h+1|0;c[d>>2]=h;if(j<<24>>24==10|j<<24>>24==13){continue a}}}if((g|0)==5){h=h+ -1|0;c[d>>2]=h}j=a[h]|0;c[d>>2]=h+1;if((hc(j<<24>>24|0)|0)!=0|(j+ -40<<24>>24&255)<2){j=0;i=f;return j|0}g=c[d>>2]|0;if(!(g>>>0<e>>>0)){j=0;i=f;return j|0}do{k=a[g]|0;c[d>>2]=g+1;j=hc(k<<24>>24|0)|0;g=c[d>>2]|0}while((k+ -40<<24>>24&255)>1&(j|0)==0&g>>>0<e>>>0);k=g+ -1|0;c[d>>2]=k;k=k-h|0;j=le(b+32|0,k+1|0)|0;vr(j|0,h|0,k|0)|0;a[j+k|0]=0;k=ke(b+4|0,1)|0;a[k]=1;c[k+4>>2]=j;i=f;return k|0}function ie(a){a=a|0;c[a+20>>2]=0;c[a+24>>2]=0;c[a+48>>2]=0;c[a+52>>2]=0;return}function je(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0;f=i;a:while(1){j=c[d>>2]|0;h=a[j]|0;c[d>>2]=j+1;if((hc(h<<24>>24|0)|0)!=0){continue}j=c[d>>2]|0;if(!(j>>>0<e>>>0)){h=j;break}if(!(h<<24>>24==59)){g=5;break}while(1){if(!(j>>>0<e>>>0)){continue a}h=a[j]|0;j=j+1|0;c[d>>2]=j;if(h<<24>>24==10|h<<24>>24==13){continue a}}}if((g|0)==5){h=j+ -1|0;c[d>>2]=h}do{g=a[h]|0;c[d>>2]=h+1;j=(hc(g<<24>>24|0)|0)==0;h=c[d>>2]|0}while(!j);if(h>>>0>=e>>>0|g<<24>>24==41){j=0;i=f;return j|0}c[d>>2]=h+ -1;j=ge(b,d,e)|0;i=f;return j|0}function ke(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0;d=i;e=a+16|0;j=c[e>>2]|0;o=c[a+24>>2]|0;f=a+20|0;h=c[f>>2]|0;if(!((j+b|0)>>>0<o>>>0)){h=h+1|0;c[f>>2]=h;c[e>>2]=0;j=0}n=a+20|0;k=a+8|0;p=c[k>>2]|0;f=a+4|0;l=c[f>>2]|0;m=p-l|0;do{if((h|0)==(m>>2|0)){o=Xq(o>>>0>357913941?-1:o*12|0)|0;a=a+12|0;if((p|0)!=(c[a>>2]|0)){if((p|0)==0){g=0}else{c[p>>2]=o;g=c[k>>2]|0}c[k>>2]=g+4;break}p=h+1|0;if(p>>>0>1073741823){Sn(0)}if(h>>>0<536870911){q=m>>1;r=q>>>0<p>>>0?p:q;if((r|0)==0){q=0;r=0}else{g=12}}else{r=1073741823;g=12}if((g|0)==12){q=r;r=Wq(r<<2)|0}g=r+(h<<2)|0;if((g|0)!=0){c[g>>2]=o}ur(r|0,l|0,m|0)|0;c[f>>2]=r;c[k>>2]=r+(p<<2);c[a>>2]=r+(q<<2);if((l|0)!=0){Yq(l);h=c[n>>2]|0;j=c[e>>2]|0}}}while(0);r=(c[(c[f>>2]|0)+(h<<2)>>2]|0)+(j*12|0)|0;c[e>>2]=j+b;i=d;return r|0}function le(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0;d=i;e=a+16|0;j=c[e>>2]|0;o=c[a+24>>2]|0;f=a+20|0;h=c[f>>2]|0;if(!((j+b|0)>>>0<o>>>0)){h=h+1|0;c[f>>2]=h;c[e>>2]=0;j=0}n=a+20|0;k=a+8|0;p=c[k>>2]|0;f=a+4|0;l=c[f>>2]|0;m=p-l|0;do{if((h|0)==(m>>2|0)){o=Xq(o)|0;a=a+12|0;if((p|0)!=(c[a>>2]|0)){if((p|0)==0){g=0}else{c[p>>2]=o;g=c[k>>2]|0}c[k>>2]=g+4;break}p=h+1|0;if(p>>>0>1073741823){Sn(0)}if(h>>>0<536870911){q=m>>1;r=q>>>0<p>>>0?p:q;if((r|0)==0){q=0;r=0}else{g=12}}else{r=1073741823;g=12}if((g|0)==12){q=r;r=Wq(r<<2)|0}g=r+(h<<2)|0;if((g|0)!=0){c[g>>2]=o}ur(r|0,l|0,m|0)|0;c[f>>2]=r;c[k>>2]=r+(p<<2);c[a>>2]=r+(q<<2);if((l|0)!=0){Yq(l);h=c[n>>2]|0;j=c[e>>2]|0}}}while(0);r=(c[(c[f>>2]|0)+(h<<2)>>2]|0)+j|0;c[e>>2]=j+b;i=d;return r|0}function me(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0.0,x=0,y=0.0,z=0.0;d=i;i=i+16|0;j=d;k=c[a>>2]|0;e=a+4|0;f=c[e>>2]|0;if((f|0)==(k|0)){l=k}else{l=f+(~((f+ -8+(0-k)|0)>>>3)<<3)|0;c[e>>2]=l}f=a+8|0;if((l|0)==(c[f>>2]|0)){n=l-k|0;o=n>>3;l=o+1|0;if(l>>>0>536870911){Sn(0)}if(o>>>0<268435455){p=n>>2;q=p>>>0<l>>>0?l:p;if((q|0)==0){p=0;q=0}else{h=11}}else{q=536870911;h=11}if((h|0)==11){p=q;q=Wq(q<<3)|0}o=q+(o<<3)|0;if((o|0)!=0){x=o;c[x>>2]=0;c[x+4>>2]=1065353216}ur(q|0,k|0,n|0)|0;c[a>>2]=q;c[e>>2]=q+(l<<3);c[f>>2]=q+(p<<3);if((k|0)!=0){Yq(k)}}else{if((l|0)==0){k=0}else{k=l;c[k>>2]=0;c[k+4>>2]=1065353216;k=c[e>>2]|0}c[e>>2]=k+8}n=Pc[c[(c[b>>2]|0)+36>>2]&127](b)|0;if((n|0)==0){l=0;k=0}else{if(n>>>0>357913941){Sn(0)}k=Wq(n*12|0)|0;l=k;do{if((l|0)==0){l=0}else{c[l>>2]=0;c[l+4>>2]=0;c[l+8>>2]=0}l=l+12|0;n=n+ -1|0}while((n|0)!=0)}n=Pc[c[(c[b>>2]|0)+24>>2]&127](b)|0;o=Pc[c[(c[b>>2]|0)+20>>2]&127](b)|0;a:do{if(!((n|0)==0|(o|0)==0)?(Pc[c[(c[b>>2]|0)+36>>2]&127](b)|0)!=0:0){w=+(o>>>0);y=+(n>>>0);p=0;while(1){if(!(p>>>0<(Pc[c[(c[b>>2]|0)+36>>2]&127](b)|0)>>>0)){break}o=Yc[c[(c[b>>2]|0)+40>>2]&63](b,p)|0;if((o|0)==0){e=0;break a}n=k+(p*12|0)|0;s=k+(p*12|0)+4|0;t=c[s>>2]|0;r=c[n>>2]|0;q=t-r>>3;if(!(q>>>0<o>>>0)){if(q>>>0>o>>>0?(m=r+(o<<3)|0,(t|0)!=(m|0)):0){c[s>>2]=t+(~((t+ -8+(0-m)|0)>>>3)<<3);q=0}else{q=0}}else{ue(n,o-q|0);q=0}do{z=+(Hc[c[(c[b>>2]|0)+44>>2]&31](b,p,q)|0)/w;g[(c[n>>2]|0)+(q<<3)>>2]=z;z=+(Hc[c[(c[b>>2]|0)+48>>2]&31](b,p,q)|0)/y;g[(c[n>>2]|0)+(q<<3)+4>>2]=z;q=q+1|0}while(q>>>0<o>>>0);p=p+1|0}n=(l-k|0)/12|0;if((l|0)!=(k|0)){b=j+4|0;m=j+8|0;q=0;p=0;while(1){c[j>>2]=0;c[b>>2]=0;c[m>>2]=0;r=c[k+(p*12|0)>>2]|0;o=r+(((c[k+(p*12|0)+4>>2]|0)-r>>3)+ -1<<3)|0;ne(a,r,o,0,j);v=c[b>>2]|0;t=c[j>>2]|0;if((v|0)==(t|0)){t=v}else{s=p*1e3|0;u=0;do{x=c[t+(u<<3)>>2]|0;if((x|0)!=0){pe(a,(u*20|0)+s|0,x,c[t+(u<<3)+4>>2]|0);v=c[b>>2]|0;t=c[j>>2]|0}u=u+1|0}while(!(u>>>0>=v-t>>3>>>0|u>>>0>50))}if((q|0)!=0){pe(a,(p*1e3|0)+1e5|0,q,r);t=c[j>>2]|0}if((t|0)!=0){q=c[b>>2]|0;if((q|0)!=(t|0)){c[b>>2]=q+(~((q+ -8+(0-t)|0)>>>3)<<3)}Yq(t)}p=p+1|0;if(p>>>0<n>>>0){q=o}else{break}}}oe(a,2e6,+(n>>>0));oe(a,n+2e6|0,10.0);re(c[a>>2]|0,c[e>>2]|0);m=c[e>>2]|0;if((m|0)!=(c[f>>2]|0)){if((m|0)==0){a=0}else{a=m;c[a>>2]=-1;c[a+4>>2]=0;a=c[e>>2]|0}c[e>>2]=a+8;e=1;break}j=c[a>>2]|0;b=m-j|0;n=b>>3;m=n+1|0;if(m>>>0>536870911){Sn(0)}if(n>>>0<268435455){o=b>>2;p=o>>>0<m>>>0?m:o;if((p|0)==0){o=0;p=0}else{h=57}}else{p=536870911;h=57}if((h|0)==57){o=p;p=Wq(p<<3)|0}h=p+(n<<3)|0;if((h|0)!=0){x=h;c[x>>2]=-1;c[x+4>>2]=0}ur(p|0,j|0,b|0)|0;c[a>>2]=p;c[e>>2]=p+(m<<3);c[f>>2]=p+(o<<3);if((j|0)==0){e=1}else{Yq(j);e=1}}else{e=0}}while(0);if((k|0)==0){i=d;return e|0}if((l|0)!=(k|0)){while(1){a=l+ -12|0;f=c[a>>2]|0;if((f|0)!=0){h=l+ -8|0;j=c[h>>2]|0;if((j|0)!=(f|0)){c[h>>2]=j+(~((j+ -8+(0-f)|0)>>>3)<<3)}Yq(f)}if((a|0)==(k|0)){break}else{l=a}}}Yq(k);i=d;return e|0}function ne(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;var h=0,j=0,k=0,l=0,m=0.0,n=0.0,o=0.0,p=0,q=0,r=0.0,s=0,t=0.0,u=0,v=0.0;h=i;k=f+4|0;j=d+4|0;while(1){p=c[k>>2]|0;s=c[f>>2]|0;q=p-s>>3;do{if(!(q>>>0>e>>>0)){u=e+1|0;if(q>>>0<u>>>0){qe(f,u-q|0);s=c[f>>2]|0;break}if(q>>>0>u>>>0?(l=s+(u<<3)|0,(p|0)!=(l|0)):0){c[k>>2]=p+(~((p+ -8+(0-l)|0)>>>3)<<3)}}}while(0);c[s+(e<<3)>>2]=b;c[(c[f>>2]|0)+(e<<3)+4>>2]=d;if((b|0)==(d|0)){d=13;break}o=+g[d>>2];r=+g[b>>2];n=o-r;v=+g[j>>2];t=+g[b+4>>2];m=v-t;o=r*v-o*t;r=+T(+(o+(n*t-m*r)));p=r>-1.0;q=p?b:0;r=p?r:-1.0;p=b+8|0;if((p|0)!=(d|0)){s=b;while(1){t=+T(+(o+(n*+g[s+12>>2]-m*+g[p>>2])));s=t>r;q=s?p:q;r=s?t:r;s=p+8|0;if((s|0)==(d|0)){break}else{u=p;p=s;s=u}}}if(!(r*r/(n*n+m*m)>.0010000000474974513)){d=13;break}u=e<<1;ne(a,b,q,u|1,f);b=q;e=u+2|0}if((d|0)==13){i=h;return}}function oe(a,b,d){a=a|0;b=b|0;d=+d;var e=0,f=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0;e=i;f=a+4|0;l=c[f>>2]|0;h=a+8|0;if((l|0)!=(c[h>>2]|0)){if((l|0)==0){h=0}else{d=+d;h=l;c[h>>2]=b;g[h+4>>2]=d;h=c[f>>2]|0}c[f>>2]=h+8;i=e;return}j=c[a>>2]|0;m=l-j|0;n=m>>3;l=n+1|0;if(l>>>0>536870911){Sn(0)}if(n>>>0<268435455){o=m>>2;p=o>>>0<l>>>0?l:o;if((p|0)==0){o=0;p=0}else{k=9}}else{p=536870911;k=9}if((k|0)==9){o=p;p=Wq(p<<3)|0}k=p+(n<<3)|0;if((k|0)!=0){d=+d;n=k;c[n>>2]=b;g[n+4>>2]=d}ur(p|0,j|0,m|0)|0;c[a>>2]=p;c[f>>2]=p+(l<<3);c[h>>2]=p+(o<<3);if((j|0)==0){i=e;return}Yq(j);i=e;return}function pe(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0,f=0,h=0,j=0.0,k=0.0;e=i;f=c+4|0;h=d+4|0;k=+g[c>>2]- +g[d>>2];j=+g[f>>2]- +g[h>>2];oe(a,b+1|0,+U(+(k*k+j*j))*10.0);oe(a,b+2|0,+aa(+(+g[h>>2]- +g[f>>2]),+(+g[d>>2]- +g[c>>2])));oe(a,b+3|0,(+g[c>>2]+-.5)*10.0);oe(a,b+4|0,(+g[f>>2]+-.5)*10.0);oe(a,b+5|0,(+g[d>>2]+-.5)*10.0);oe(a,b+6|0,(+g[h>>2]+-.5)*10.0);oe(a,b+7|0,+aa(+(+g[f>>2]+-.5),+(+g[c>>2]+-.5)));oe(a,b+8|0,+aa(+(+g[h>>2]+-.5),+(+g[d>>2]+-.5)));j=+g[c>>2]+-.5;k=+g[f>>2]+-.5;oe(a,b+9|0,+U(+(j*j+k*k))*10.0);k=+g[d>>2]+-.5;j=+g[h>>2]+-.5;oe(a,b+10|0,+U(+(k*k+j*j))*10.0);oe(a,b+11|0,(+g[d>>2]- +g[c>>2])*5.0);oe(a,b+12|0,(+g[h>>2]- +g[f>>2])*5.0);i=e;return}function qe(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0;e=i;f=a+8|0;d=a+4|0;k=c[d>>2]|0;j=c[f>>2]|0;g=k;if(!(j-g>>3>>>0<b>>>0)){do{if((k|0)==0){f=0}else{c[k>>2]=0;c[k+4>>2]=0;f=c[d>>2]|0}k=f+8|0;c[d>>2]=k;b=b+ -1|0}while((b|0)!=0);i=e;return}l=c[a>>2]|0;g=g-l>>3;k=g+b|0;if(k>>>0>536870911){Sn(0)}j=j-l|0;if(j>>3>>>0<268435455){j=j>>2;k=j>>>0<k>>>0?k:j;if((k|0)==0){j=0;k=0}else{h=9}}else{k=536870911;h=9}if((h|0)==9){j=k;k=Wq(k<<3)|0}h=k+(g<<3)|0;do{if((h|0)==0){h=0}else{c[h>>2]=0;c[h+4>>2]=0}h=h+8|0;b=b+ -1|0}while((b|0)!=0);b=c[a>>2]|0;m=(c[d>>2]|0)-b|0;l=k+(g-(m>>3)<<3)|0;ur(l|0,b|0,m|0)|0;c[a>>2]=l;c[d>>2]=h;c[f>>2]=k+(j<<3);if((b|0)==0){i=e;return}Yq(b);i=e;return}function re(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0;d=i;a:while(1){g=b;e=b+ -8|0;b:while(1){h=a;l=g-h|0;m=l>>3;switch(m|0){case 4:{f=14;break a};case 5:{f=15;break a};case 3:{f=6;break a};case 1:case 0:{f=85;break a};case 2:{f=4;break a};default:{}}if((l|0)<248){f=21;break a}k=(m|0)/2|0;j=a+(k<<3)|0;do{if((l|0)>7992){m=(m|0)/4|0;l=a+(m<<3)|0;k=a+(m+k<<3)|0;m=se(a,l,j,k)|0;if((c[e>>2]|0)>=(c[k>>2]|0)){l=j;break}o=k;n=c[o>>2]|0;o=c[o+4>>2]|0;r=e;q=c[r+4>>2]|0;p=k;c[p>>2]=c[r>>2];c[p+4>>2]=q;p=e;c[p>>2]=n;c[p+4>>2]=o;if((c[k>>2]|0)>=(c[j>>2]|0)){l=j;m=m+1|0;break}q=j;p=c[q>>2]|0;q=c[q+4>>2]|0;n=k;o=c[n+4>>2]|0;r=j;c[r>>2]=c[n>>2];c[r+4>>2]=o;r=k;c[r>>2]=p;c[r+4>>2]=q;if((c[j>>2]|0)>=(c[l>>2]|0)){l=j;m=m+2|0;break}q=l;p=c[q>>2]|0;q=c[q+4>>2]|0;n=j;o=c[n+4>>2]|0;r=l;c[r>>2]=c[n>>2];c[r+4>>2]=o;r=j;c[r>>2]=p;c[r+4>>2]=q;if((c[l>>2]|0)<(c[a>>2]|0)){r=a;q=c[r>>2]|0;r=c[r+4>>2]|0;n=l;o=c[n+4>>2]|0;p=a;c[p>>2]=c[n>>2];c[p+4>>2]=o;c[l>>2]=q;c[l+4>>2]=r;l=j;m=m+4|0}else{l=j;m=m+3|0}}else{r=c[j>>2]|0;m=(c[e>>2]|0)<(r|0);if((r|0)>=(c[a>>2]|0)){if(!m){l=j;m=0;break}q=j;p=c[q>>2]|0;q=c[q+4>>2]|0;n=e;o=c[n+4>>2]|0;r=j;c[r>>2]=c[n>>2];c[r+4>>2]=o;r=e;c[r>>2]=p;c[r+4>>2]=q;if((c[j>>2]|0)>=(c[a>>2]|0)){l=j;m=1;break}m=a;r=c[m>>2]|0;m=c[m+4>>2]|0;p=j;q=c[p+4>>2]|0;l=a;c[l>>2]=c[p>>2];c[l+4>>2]=q;l=j;c[l>>2]=r;c[l+4>>2]=m;l=j;m=2;break}l=a;k=c[l>>2]|0;l=c[l+4>>2]|0;if(m){q=e;r=c[q+4>>2]|0;m=a;c[m>>2]=c[q>>2];c[m+4>>2]=r;m=e;c[m>>2]=k;c[m+4>>2]=l;l=j;m=1;break}p=j;q=c[p+4>>2]|0;r=a;c[r>>2]=c[p>>2];c[r+4>>2]=q;r=j;c[r>>2]=k;c[r+4>>2]=l;if((c[e>>2]|0)<(k|0)){q=e;r=c[q+4>>2]|0;m=j;c[m>>2]=c[q>>2];c[m+4>>2]=r;m=e;c[m>>2]=k;c[m+4>>2]=l;l=j;m=2}else{l=j;m=1}}}while(0);k=c[a>>2]|0;n=c[l>>2]|0;do{if((k|0)<(n|0)){l=e}else{l=e;while(1){l=l+ -8|0;if((a|0)==(l|0)){break}if((c[l>>2]|0)<(n|0)){f=68;break}}if((f|0)==68){f=0;q=a;p=c[q>>2]|0;q=c[q+4>>2]|0;n=l;o=c[n+4>>2]|0;r=a;c[r>>2]=c[n>>2];c[r+4>>2]=o;r=l;c[r>>2]=p;c[r+4>>2]=q;m=m+1|0;break}h=a+8|0;if((k|0)<(c[e>>2]|0)){k=h}else{if((h|0)==(e|0)){f=85;break a}while(1){j=h+8|0;if((k|0)<(c[h>>2]|0)){break}if((j|0)==(e|0)){f=85;break a}else{h=j}}r=h;q=c[r>>2]|0;r=c[r+4>>2]|0;o=e;p=c[o+4>>2]|0;k=h;c[k>>2]=c[o>>2];c[k+4>>2]=p;k=e;c[k>>2]=q;c[k+4>>2]=r;k=j}if((k|0)==(e|0)){f=85;break a}else{j=e}while(1){h=c[a>>2]|0;while(1){l=k+8|0;if((h|0)<(c[k>>2]|0)){break}else{k=l}}do{j=j+ -8|0}while((h|0)<(c[j>>2]|0));if(!(k>>>0<j>>>0)){a=k;continue b}r=k;q=c[r>>2]|0;r=c[r+4>>2]|0;o=j;p=c[o+4>>2]|0;c[k>>2]=c[o>>2];c[k+4>>2]=p;k=j;c[k>>2]=q;c[k+4>>2]=r;k=l}}}while(0);k=a+8|0;c:do{if(k>>>0<l>>>0){while(1){p=c[j>>2]|0;o=k;while(1){k=o+8|0;if((c[o>>2]|0)<(p|0)){o=k}else{n=l;break}}do{n=n+ -8|0}while((c[n>>2]|0)>=(p|0));if(o>>>0>n>>>0){k=o;break c}r=o;q=c[r>>2]|0;r=c[r+4>>2]|0;s=n;p=c[s+4>>2]|0;l=o;c[l>>2]=c[s>>2];c[l+4>>2]=p;l=n;c[l>>2]=q;c[l+4>>2]=r;l=n;j=(j|0)==(o|0)?n:j;m=m+1|0}}}while(0);if((k|0)!=(j|0)?(c[j>>2]|0)<(c[k>>2]|0):0){r=k;q=c[r>>2]|0;r=c[r+4>>2]|0;o=j;p=c[o+4>>2]|0;s=k;c[s>>2]=c[o>>2];c[s+4>>2]=p;s=j;c[s>>2]=q;c[s+4>>2]=r;m=m+1|0}if((m|0)==0){j=te(a,k)|0;l=k+8|0;if(te(l,b)|0){f=80;break}if(j){a=l;continue}}s=k;if((s-h|0)>=(g-s|0)){f=84;break}re(a,k);a=k+8|0}if((f|0)==80){f=0;if(j){f=85;break}else{b=k;continue}}else if((f|0)==84){f=0;re(k+8|0,b);b=k;continue}}if((f|0)==4){if((c[e>>2]|0)>=(c[a>>2]|0)){i=d;return}r=a;q=c[r>>2]|0;r=c[r+4>>2]|0;o=e;p=c[o+4>>2]|0;s=a;c[s>>2]=c[o>>2];c[s+4>>2]=p;s=e;c[s>>2]=q;c[s+4>>2]=r;i=d;return}else if((f|0)==6){h=a+8|0;s=c[h>>2]|0;g=(c[e>>2]|0)<(s|0);if((s|0)>=(c[a>>2]|0)){if(!g){i=d;return}r=h;q=c[r>>2]|0;r=c[r+4>>2]|0;o=e;p=c[o+4>>2]|0;s=h;c[s>>2]=c[o>>2];c[s+4>>2]=p;s=e;c[s>>2]=q;c[s+4>>2]=r;if((c[h>>2]|0)>=(c[a>>2]|0)){i=d;return}r=a;q=c[r>>2]|0;r=c[r+4>>2]|0;o=h;p=c[o+4>>2]|0;s=a;c[s>>2]=c[o>>2];c[s+4>>2]=p;s=h;c[s>>2]=q;c[s+4>>2]=r;i=d;return}b=a;f=c[b>>2]|0;b=c[b+4>>2]|0;if(g){q=e;r=c[q+4>>2]|0;s=a;c[s>>2]=c[q>>2];c[s+4>>2]=r;s=e;c[s>>2]=f;c[s+4>>2]=b;i=d;return}q=h;r=c[q+4>>2]|0;s=a;c[s>>2]=c[q>>2];c[s+4>>2]=r;s=h;c[s>>2]=f;c[s+4>>2]=b;if((c[e>>2]|0)>=(f|0)){i=d;return}q=e;r=c[q+4>>2]|0;s=h;c[s>>2]=c[q>>2];c[s+4>>2]=r;s=e;c[s>>2]=f;c[s+4>>2]=b;i=d;return}else if((f|0)==14){se(a,a+8|0,a+16|0,e)|0;i=d;return}else if((f|0)==15){f=a+8|0;g=a+16|0;b=a+24|0;se(a,f,g,b)|0;if((c[e>>2]|0)>=(c[b>>2]|0)){i=d;return}r=b;q=c[r>>2]|0;r=c[r+4>>2]|0;o=e;p=c[o+4>>2]|0;s=b;c[s>>2]=c[o>>2];c[s+4>>2]=p;s=e;c[s>>2]=q;c[s+4>>2]=r;if((c[b>>2]|0)>=(c[g>>2]|0)){i=d;return}r=g;q=c[r>>2]|0;r=c[r+4>>2]|0;e=b;h=c[e>>2]|0;e=c[e+4>>2]|0;s=g;c[s>>2]=h;c[s+4>>2]=e;s=b;c[s>>2]=q;c[s+4>>2]=r;if((h|0)>=(c[f>>2]|0)){i=d;return}r=f;q=c[r>>2]|0;r=c[r+4>>2]|0;s=f;c[s>>2]=h;c[s+4>>2]=e;s=g;c[s>>2]=q;c[s+4>>2]=r;if((h|0)>=(c[a>>2]|0)){i=d;return}r=a;q=c[r>>2]|0;r=c[r+4>>2]|0;s=a;c[s>>2]=h;c[s+4>>2]=e;s=f;c[s>>2]=q;c[s+4>>2]=r;i=d;return}else if((f|0)==21){e=a+16|0;f=a+8|0;s=c[f>>2]|0;g=c[a>>2]|0;j=c[e>>2]|0;h=(j|0)<(s|0);do{if((s|0)<(g|0)){k=a;g=c[k>>2]|0;k=c[k+4>>2]|0;if(h){r=e;s=c[r+4>>2]|0;j=a;c[j>>2]=c[r>>2];c[j+4>>2]=s;j=e;c[j>>2]=g;c[j+4>>2]=k;j=g;break}q=f;r=c[q+4>>2]|0;s=a;c[s>>2]=c[q>>2];c[s+4>>2]=r;s=f;c[s>>2]=g;c[s+4>>2]=k;if((j|0)<(g|0)){r=e;s=c[r+4>>2]|0;j=f;c[j>>2]=c[r>>2];c[j+4>>2]=s;j=e;c[j>>2]=g;c[j+4>>2]=k;j=g}}else{if(h){r=f;j=c[r>>2]|0;r=c[r+4>>2]|0;h=e;k=c[h>>2]|0;h=c[h+4>>2]|0;s=f;c[s>>2]=k;c[s+4>>2]=h;s=e;c[s>>2]=j;c[s+4>>2]=r;if((k|0)<(g|0)){r=a;q=c[r>>2]|0;r=c[r+4>>2]|0;s=a;c[s>>2]=k;c[s+4>>2]=h;s=f;c[s>>2]=q;c[s+4>>2]=r}}}}while(0);f=a+24|0;if((f|0)==(b|0)){i=d;return}while(1){if((c[f>>2]|0)<(j|0)){h=f;g=c[h>>2]|0;h=c[h+4>>2]|0;j=f;while(1){q=e;r=c[q+4>>2]|0;s=j;c[s>>2]=c[q>>2];c[s+4>>2]=r;if((e|0)==(a|0)){break}j=e+ -8|0;if((g|0)<(c[j>>2]|0)){s=e;e=j;j=s}else{break}}s=e;c[s>>2]=g;c[s+4>>2]=h}e=f+8|0;if((e|0)==(b|0)){break}j=c[f>>2]|0;s=f;f=e;e=s}i=d;return}else if((f|0)==85){i=d;return}}function se(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0,k=0,l=0,m=0;f=i;k=c[b>>2]|0;h=c[d>>2]|0;g=(h|0)<(k|0);do{if((k|0)<(c[a>>2]|0)){j=a;h=c[j>>2]|0;j=c[j+4>>2]|0;if(g){l=d;k=c[l+4>>2]|0;g=a;c[g>>2]=c[l>>2];c[g+4>>2]=k;g=d;c[g>>2]=h;c[g+4>>2]=j;g=1;break}g=b;l=c[g+4>>2]|0;k=a;c[k>>2]=c[g>>2];c[k+4>>2]=l;k=b;c[k>>2]=h;c[k+4>>2]=j;k=c[d>>2]|0;if((k|0)<(h|0)){k=d;l=c[k+4>>2]|0;g=b;c[g>>2]=c[k>>2];c[g+4>>2]=l;g=d;c[g>>2]=h;c[g+4>>2]=j;g=2}else{g=1;h=k}}else{if(g){k=b;h=c[k>>2]|0;k=c[k+4>>2]|0;g=d;j=c[g+4>>2]|0;l=b;c[l>>2]=c[g>>2];c[l+4>>2]=j;l=d;c[l>>2]=h;c[l+4>>2]=k;if((c[b>>2]|0)<(c[a>>2]|0)){h=a;l=c[h>>2]|0;h=c[h+4>>2]|0;j=b;k=c[j+4>>2]|0;g=a;c[g>>2]=c[j>>2];c[g+4>>2]=k;g=b;c[g>>2]=l;c[g+4>>2]=h;g=2;h=c[d>>2]|0}else{g=1}}else{g=0}}}while(0);if((c[e>>2]|0)>=(h|0)){l=g;i=f;return l|0}k=d;j=c[k>>2]|0;k=c[k+4>>2]|0;m=e;h=c[m+4>>2]|0;l=d;c[l>>2]=c[m>>2];c[l+4>>2]=h;l=e;c[l>>2]=j;c[l+4>>2]=k;if((c[d>>2]|0)>=(c[b>>2]|0)){m=g+1|0;i=f;return m|0}l=b;k=c[l>>2]|0;l=c[l+4>>2]|0;h=d;j=c[h+4>>2]|0;m=b;c[m>>2]=c[h>>2];c[m+4>>2]=j;m=d;c[m>>2]=k;c[m+4>>2]=l;if((c[b>>2]|0)>=(c[a>>2]|0)){m=g+2|0;i=f;return m|0}l=a;k=c[l>>2]|0;l=c[l+4>>2]|0;h=b;j=c[h+4>>2]|0;m=a;c[m>>2]=c[h>>2];c[m+4>>2]=j;m=b;c[m>>2]=k;c[m+4>>2]=l;m=g+3|0;i=f;return m|0}function te(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0;d=i;switch(b-a>>3|0){case 5:{g=a+8|0;f=a+16|0;e=a+24|0;b=b+ -8|0;se(a,g,f,e)|0;if((c[b>>2]|0)>=(c[e>>2]|0)){l=1;i=d;return l|0}k=e;j=c[k>>2]|0;k=c[k+4>>2]|0;m=b;h=c[m+4>>2]|0;l=e;c[l>>2]=c[m>>2];c[l+4>>2]=h;l=b;c[l>>2]=j;c[l+4>>2]=k;if((c[e>>2]|0)>=(c[f>>2]|0)){m=1;i=d;return m|0}l=f;k=c[l>>2]|0;l=c[l+4>>2]|0;b=e;h=c[b>>2]|0;b=c[b+4>>2]|0;m=f;c[m>>2]=h;c[m+4>>2]=b;m=e;c[m>>2]=k;c[m+4>>2]=l;if((h|0)>=(c[g>>2]|0)){m=1;i=d;return m|0}l=g;k=c[l>>2]|0;l=c[l+4>>2]|0;m=g;c[m>>2]=h;c[m+4>>2]=b;m=f;c[m>>2]=k;c[m+4>>2]=l;if((h|0)>=(c[a>>2]|0)){m=1;i=d;return m|0}l=a;k=c[l>>2]|0;l=c[l+4>>2]|0;m=a;c[m>>2]=h;c[m+4>>2]=b;m=g;c[m>>2]=k;c[m+4>>2]=l;m=1;i=d;return m|0};case 2:{b=b+ -8|0;if((c[b>>2]|0)>=(c[a>>2]|0)){m=1;i=d;return m|0}l=a;k=c[l>>2]|0;l=c[l+4>>2]|0;h=b;j=c[h+4>>2]|0;m=a;c[m>>2]=c[h>>2];c[m+4>>2]=j;m=b;c[m>>2]=k;c[m+4>>2]=l;m=1;i=d;return m|0};case 1:case 0:{m=1;i=d;return m|0};case 3:{e=a+8|0;h=b+ -8|0;m=c[e>>2]|0;f=(c[h>>2]|0)<(m|0);if((m|0)>=(c[a>>2]|0)){if(!f){m=1;i=d;return m|0}l=e;k=c[l>>2]|0;l=c[l+4>>2]|0;g=h;j=c[g+4>>2]|0;m=e;c[m>>2]=c[g>>2];c[m+4>>2]=j;m=h;c[m>>2]=k;c[m+4>>2]=l;if((c[e>>2]|0)>=(c[a>>2]|0)){m=1;i=d;return m|0}l=a;k=c[l>>2]|0;l=c[l+4>>2]|0;h=e;j=c[h+4>>2]|0;m=a;c[m>>2]=c[h>>2];c[m+4>>2]=j;m=e;c[m>>2]=k;c[m+4>>2]=l;m=1;i=d;return m|0}b=a;g=c[b>>2]|0;b=c[b+4>>2]|0;if(f){k=h;l=c[k+4>>2]|0;m=a;c[m>>2]=c[k>>2];c[m+4>>2]=l;m=h;c[m>>2]=g;c[m+4>>2]=b;m=1;i=d;return m|0}k=e;l=c[k+4>>2]|0;m=a;c[m>>2]=c[k>>2];c[m+4>>2]=l;m=e;c[m>>2]=g;c[m+4>>2]=b;if((c[h>>2]|0)>=(g|0)){m=1;i=d;return m|0}k=h;l=c[k+4>>2]|0;m=e;c[m>>2]=c[k>>2];c[m+4>>2]=l;m=h;c[m>>2]=g;c[m+4>>2]=b;m=1;i=d;return m|0};case 4:{se(a,a+8|0,a+16|0,b+ -8|0)|0;m=1;i=d;return m|0};default:{f=a+16|0;g=a+8|0;m=c[g>>2]|0;h=c[a>>2]|0;j=c[f>>2]|0;k=(j|0)<(m|0);do{if((m|0)<(h|0)){l=a;h=c[l>>2]|0;l=c[l+4>>2]|0;if(k){k=f;m=c[k+4>>2]|0;j=a;c[j>>2]=c[k>>2];c[j+4>>2]=m;j=f;c[j>>2]=h;c[j+4>>2]=l;j=h;break}n=g;k=c[n+4>>2]|0;m=a;c[m>>2]=c[n>>2];c[m+4>>2]=k;m=g;c[m>>2]=h;c[m+4>>2]=l;if((j|0)<(h|0)){m=f;n=c[m+4>>2]|0;j=g;c[j>>2]=c[m>>2];c[j+4>>2]=n;j=f;c[j>>2]=h;c[j+4>>2]=l;j=h}}else{if(k){m=g;j=c[m>>2]|0;m=c[m+4>>2]|0;k=f;l=c[k>>2]|0;k=c[k+4>>2]|0;n=g;c[n>>2]=l;c[n+4>>2]=k;n=f;c[n>>2]=j;c[n+4>>2]=m;if((l|0)<(h|0)){m=a;h=c[m>>2]|0;m=c[m+4>>2]|0;n=a;c[n>>2]=l;c[n+4>>2]=k;n=g;c[n>>2]=h;c[n+4>>2]=m}}}}while(0);g=a+24|0;if((g|0)==(b|0)){n=1;i=d;return n|0}else{h=0}while(1){if((c[g>>2]|0)<(j|0)){k=g;j=c[k>>2]|0;k=c[k+4>>2]|0;l=g;while(1){o=f;m=c[o+4>>2]|0;n=l;c[n>>2]=c[o>>2];c[n+4>>2]=m;if((f|0)==(a|0)){break}l=f+ -8|0;if((j|0)<(c[l>>2]|0)){o=f;f=l;l=o}else{break}}o=f;c[o>>2]=j;c[o+4>>2]=k;h=h+1|0;if((h|0)==8){break}}f=g+8|0;if((f|0)==(b|0)){a=1;e=35;break}j=c[g>>2]|0;o=g;g=f;f=o}if((e|0)==35){i=d;return a|0}o=(g+8|0)==(b|0);i=d;return o|0}}return 0}function ue(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0;e=i;f=a+8|0;d=a+4|0;k=c[d>>2]|0;j=c[f>>2]|0;g=k;if(!(j-g>>3>>>0<b>>>0)){do{if((k|0)==0){f=0}else{f=k;c[f>>2]=0;c[f+4>>2]=0;f=c[d>>2]|0}k=f+8|0;c[d>>2]=k;b=b+ -1|0}while((b|0)!=0);i=e;return}l=c[a>>2]|0;g=g-l>>3;k=g+b|0;if(k>>>0>536870911){Sn(0)}j=j-l|0;if(j>>3>>>0<268435455){j=j>>2;k=j>>>0<k>>>0?k:j;if((k|0)==0){j=0;k=0}else{h=9}}else{k=536870911;h=9}if((h|0)==9){j=k;k=Wq(k<<3)|0}h=k+(g<<3)|0;do{if((h|0)==0){h=0}else{l=h;c[l>>2]=0;c[l+4>>2]=0}h=h+8|0;b=b+ -1|0}while((b|0)!=0);b=c[a>>2]|0;m=(c[d>>2]|0)-b|0;l=k+(g-(m>>3)<<3)|0;ur(l|0,b|0,m|0)|0;c[a>>2]=l;c[d>>2]=h;c[f>>2]=k+(j<<3);if((b|0)==0){i=e;return}Yq(b);i=e;return}function ve(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0;f=i;j=a+4|0;k=b+1|0;a=a+8|0;m=c[a>>2]|0;n=c[j>>2]|0;l=(m-n|0)/12|0;if(!(l>>>0<k>>>0)){if(l>>>0>k>>>0?(h=n+(k*12|0)|0,(m|0)!=(h|0)):0){do{l=m+ -12|0;c[a>>2]=l;k=c[l>>2]|0;if((k|0)==0){m=l}else{m=m+ -8|0;l=c[m>>2]|0;if((l|0)!=(k|0)){c[m>>2]=l+(~((l+ -8+(0-k)|0)>>>3)<<3)}Yq(k);m=c[a>>2]|0}}while((m|0)!=(h|0))}}else{Pe(j,k-l|0)}a=c[j>>2]|0;h=a+(b*12|0)+4|0;k=c[h>>2]|0;j=a+(b*12|0)+8|0;if((k|0)!=(c[j>>2]|0)){if((k|0)==0){d=0}else{o=k;c[o>>2]=d;c[o+4>>2]=e;d=c[h>>2]|0}c[h>>2]=d+8;i=f;return 1}a=a+(b*12|0)|0;b=c[a>>2]|0;l=k-b|0;m=l>>3;k=m+1|0;if(k>>>0>536870911){Sn(0)}if(m>>>0<268435455){n=l>>2;o=n>>>0<k>>>0?k:n;if((o|0)==0){n=0;o=0}else{g=18}}else{o=536870911;g=18}if((g|0)==18){n=o;o=Wq(o<<3)|0}g=o+(m<<3)|0;if((g|0)!=0){m=g;c[m>>2]=d;c[m+4>>2]=e}ur(o|0,b|0,l|0)|0;c[a>>2]=o;c[h>>2]=o+(k<<3);c[j>>2]=o+(n<<3);if((b|0)==0){i=f;return 1}Yq(b);i=f;return 1}function we(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0;f=i;i=i+16|0;p=f;Lc[c[(c[b>>2]|0)+28>>2]&255](b);o=b+344|0;q=c[o>>2]|0;if((q|0)==0){q=Wq(60)|0;c[q>>2]=1600;c[q+4>>2]=1640;r=q+8|0;c[r+0>>2]=0;c[r+4>>2]=0;c[r+8>>2]=0;c[r+12>>2]=0;c[r+16>>2]=0;c[q+32>>2]=1720;r=q+36|0;c[r+0>>2]=0;c[r+4>>2]=0;c[r+8>>2]=0;c[r+12>>2]=0;c[r+16>>2]=0;c[q+28>>2]=128;c[q+56>>2]=1024;c[o>>2]=q}ie(q);c[p>>2]=d;p=fe(c[o>>2]|0,p,d+e|0)|0;if((p|0)==0){ie(c[o>>2]|0);r=0;i=f;return r|0}d=c[p+4>>2]|0;if((a[d]|0)==1?(nr(1224,c[d+4>>2]|0)|0)==0:0){o=c[p+8>>2]|0;if((o|0)==0){r=1;i=f;return r|0}while(1){p=c[o+4>>2]|0;d=p+4|0;e=c[d>>2]|0;a:do{if((e|0)!=0){do{if((((a[e]|0)==1?(g=c[p+8>>2]|0,(g|0)!=0):0)?(n=c[g+4>>2]|0,(n|0)!=0):0)?(a[n]|0)==1:0){e=c[e+4>>2]|0;q=c[n+4>>2]|0;if((nr(1240,e)|0)==0){Mc[c[(c[b>>2]|0)+4>>2]&63](b,q);break}if((nr(1248,e)|0)==0){e=c[(c[b>>2]|0)+12>>2]|0;r=kr(q)|0;Mc[e&63](b,r);break}if((nr(1256,e)|0)==0){e=c[(c[b>>2]|0)+16>>2]|0;r=kr(q)|0;Mc[e&63](b,r)}}}while(0);d=c[d>>2]|0;if((((((d|0)!=0?(a[d]|0)==1:0)?(l=c[p+8>>2]|0,(l|0)!=0):0)?(k=c[l+4>>2]|0,(k|0)!=0):0)?(a[k]|0)==0:0)?(nr(1264,c[d+4>>2]|0)|0)==0:0){q=k;p=0;d=l;while(1){if((q|0)!=0){do{e=c[q+4>>2]|0;if((((((e|0)!=0?(j=c[e+4>>2]|0,(j|0)!=0):0)?(a[j]|0)==1:0)?(h=c[e+8>>2]|0,(h|0)!=0):0)?(m=c[h+4>>2]|0,(m|0)!=0):0)?(a[m]|0)==1:0){e=kr(c[j+4>>2]|0)|0;r=kr(c[m+4>>2]|0)|0;Vc[c[(c[b>>2]|0)+32>>2]&31](b,p,e,r)|0}q=c[q+8>>2]|0}while((q|0)!=0)}d=c[d+8>>2]|0;if((d|0)==0){break a}q=c[d+4>>2]|0;p=p+1|0}}}}while(0);o=c[o+8>>2]|0;if((o|0)==0){g=1;break}}i=f;return g|0}ie(c[o>>2]|0);r=0;i=f;return r|0}function xe(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0;j=i;i=i+176|0;o=j+152|0;k=j+16|0;l=j;n=k+4|0;c[k>>2]=300;m=k+56|0;c[m>>2]=320;h=k+56|0;Ri(h,n);c[k+128>>2]=0;c[k+132>>2]=-1;c[k>>2]=172;c[k+56>>2]=192;c[n>>2]=9208;g=k+8|0;Yn(g);f=k+12|0;c[f+0>>2]=0;c[f+4>>2]=0;c[f+8>>2]=0;c[f+12>>2]=0;c[f+16>>2]=0;c[f+20>>2]=0;c[n>>2]=16;f=k+36|0;p=k+52|0;c[f+0>>2]=0;c[f+4>>2]=0;c[f+8>>2]=0;c[f+12>>2]=0;c[p>>2]=16;c[o+0>>2]=0;c[o+4>>2]=0;c[o+8>>2]=0;yd(n,o);if(!((a[o]&1)==0)){Yq(c[o+8>>2]|0)}o=pd(k,1272)|0;pd(pd(o,Pc[c[(c[b>>2]|0)+8>>2]&127](b)|0)|0,1296)|0;o=pd(k,1304)|0;pd(Jj(o,Pc[c[(c[b>>2]|0)+20>>2]&127](b)|0)|0,1296)|0;o=pd(k,1312)|0;pd(Jj(o,Pc[c[(c[b>>2]|0)+24>>2]&127](b)|0)|0,1296)|0;pd(k,1328)|0;o=0;while(1){if(!(o>>>0<(Pc[c[(c[b>>2]|0)+36>>2]&127](b)|0)>>>0)){break}pd(k,1344)|0;p=0;while(1){if(!(p>>>0<(Yc[c[(c[b>>2]|0)+40>>2]&63](b,o)|0)>>>0)){break}q=pd(k,1344)|0;q=pd(Ij(q,Hc[c[(c[b>>2]|0)+44>>2]&31](b,o,p)|0)|0,1352)|0;pd(Ij(q,Hc[c[(c[b>>2]|0)+48>>2]&31](b,o,p)|0)|0,1296)|0;p=p+1|0}pd(k,1296)|0;o=o+1|0}pd(k,1296)|0;Ed(l,n);b=a[l]|0;n=(b&1)==0;if(n){o=(b&255)>>>1}else{o=c[l+4>>2]|0}if(o>>>0<e>>>0){if(n){ur(d|0,l+1|0,(b&255)>>>1|0)|0;e=(b&255)>>>1}else{ur(d|0,c[l+8>>2]|0,c[l+4>>2]|0)|0;e=c[l+4>>2]|0}a[d+e|0]=0}if(!n){Yq(c[l+8>>2]|0)}c[k>>2]=172;c[m>>2]=192;d=k+4|0;c[d>>2]=16;if((a[f]&1)==0){c[d>>2]=9208;_n(g);Pi(h);i=j;return 1}Yq(c[k+44>>2]|0);c[d>>2]=9208;_n(g);Pi(h);i=j;return 1}function ye(){var a=0,b=0;b=i;a=Wq(348)|0;Ue(a);i=b;return a|0}function ze(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0,k=0;f=i;g=b+16|0;j=a[g]|0;if((j&1)==0){h=10}else{h=c[g>>2]|0;j=h&255;h=(h&-2)+ -1|0}k=(j&1)==0;if(h>>>0<e>>>0){if(k){b=(j&255)>>>1}else{b=c[b+20>>2]|0}Di(g,h,e-h|0,b,0,b,e,d);i=f;return}if(k){h=g+1|0}else{h=c[b+24>>2]|0}vr(h|0,d|0,e|0)|0;a[h+e|0]=0;if((a[g]&1)==0){a[g]=e<<1;i=f;return}else{c[b+20>>2]=e;i=f;return}}function Ae(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0;f=i;g=b+16|0;e=rr(d|0)|0;j=a[g]|0;if((j&1)==0){h=10}else{h=c[g>>2]|0;j=h&255;h=(h&-2)+ -1|0}k=(j&1)==0;if(h>>>0<e>>>0){if(k){b=(j&255)>>>1}else{b=c[b+20>>2]|0}Di(g,h,e-h|0,b,0,b,e,d);i=f;return}if(k){h=g+1|0}else{h=c[b+24>>2]|0}vr(h|0,d|0,e|0)|0;a[h+e|0]=0;if((a[g]&1)==0){a[g]=e<<1;i=f;return}else{c[b+20>>2]=e;i=f;return}}function Be(b){b=b|0;var d=0,e=0;d=i;e=b+16|0;if((a[e]&1)==0){e=e+1|0;i=d;return e|0}else{e=c[b+24>>2]|0;i=d;return e|0}return 0}function Ce(a,b){a=a|0;b=b|0;c[a+28>>2]=b;return}function De(a,b){a=a|0;b=b|0;c[a+32>>2]=b;return}function Ee(a){a=a|0;return c[a+28>>2]|0}function Fe(a){a=a|0;return c[a+32>>2]|0}function Ge(a){a=a|0;var b=0,d=0,e=0,f=0,g=0;d=i;b=c[a+4>>2]|0;a=a+8|0;f=c[a>>2]|0;if((f|0)==(b|0)){i=d;return}do{g=f+ -12|0;c[a>>2]=g;e=c[g>>2]|0;if((e|0)==0){f=g}else{g=f+ -8|0;f=c[g>>2]|0;if((f|0)!=(e|0)){c[g>>2]=f+(~((f+ -8+(0-e)|0)>>>3)<<3)}Yq(e);f=c[a>>2]|0}}while((f|0)!=(b|0));i=d;return}function He(a){a=a|0;return((c[a+8>>2]|0)-(c[a+4>>2]|0)|0)/12|0|0}function Ie(a,b){a=a|0;b=b|0;var d=0,e=0;d=i;e=c[a+4>>2]|0;if(!((((c[a+8>>2]|0)-e|0)/12|0)>>>0>b>>>0)){a=-1;i=d;return a|0}a=(c[e+(b*12|0)+4>>2]|0)-(c[e+(b*12|0)>>2]|0)>>3;i=d;return a|0}function Je(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0;e=i;f=c[a+4>>2]|0;if(!((((c[a+8>>2]|0)-f|0)/12|0)>>>0>b>>>0)){a=-1;i=e;return a|0}a=c[f+(b*12|0)>>2]|0;if(!((c[f+(b*12|0)+4>>2]|0)-a>>3>>>0>d>>>0)){a=-1;i=e;return a|0}a=c[a+(d<<3)>>2]|0;i=e;return a|0}function Ke(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0;e=i;f=c[a+4>>2]|0;if(!((((c[a+8>>2]|0)-f|0)/12|0)>>>0>b>>>0)){a=-1;i=e;return a|0}a=c[f+(b*12|0)>>2]|0;if(!((c[f+(b*12|0)+4>>2]|0)-a>>3>>>0>d>>>0)){a=-1;i=e;return a|0}a=c[a+(d<<3)+4>>2]|0;i=e;return a|0}function Le(a,b){a=a|0;b=b|0;var d=0,e=0,f=0;d=i;f=c[(c[a>>2]|0)+60>>2]|0;e=rr(b|0)|0;a=Hc[f&31](a,b,e)|0;i=d;return a|0}function Me(b){b=b|0;var d=0,e=0,f=0;e=i;i=i+16|0;f=e;d=b+172|0;Ed(f,b+40|0);wi(d,f)|0;if(!((a[f]&1)==0)){Yq(c[f+8>>2]|0)}if((a[d]&1)==0){f=d+1|0;i=e;return f|0}else{f=c[b+180>>2]|0;i=e;return f|0}return 0}function Ne(a){a=a|0;var b=0;b=i;Re(a);i=b;return}function Oe(a){a=a|0;var b=0;b=i;Re(a);Yq(a);i=b;return}function Pe(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0,h=0,j=0,k=0,l=0;d=i;i=i+32|0;e=d;g=a+4|0;h=c[g>>2]|0;j=c[a+8>>2]|0;k=h;if(!(((j-k|0)/12|0)>>>0<b>>>0)){do{if((h|0)==0){e=0}else{c[h>>2]=0;c[h+4>>2]=0;c[h+8>>2]=0;e=c[g>>2]|0}h=e+12|0;c[g>>2]=h;b=b+ -1|0}while((b|0)!=0);i=d;return}h=a+8|0;l=c[a>>2]|0;g=(k-l|0)/12|0;k=g+b|0;if(k>>>0>357913941){Sn(0)}j=(j-l|0)/12|0;if(j>>>0<178956970){j=j<<1;j=j>>>0<k>>>0?k:j;k=e+12|0;c[k>>2]=0;c[e+16>>2]=h;if((j|0)==0){h=0;j=0}else{f=10}}else{k=e+12|0;c[k>>2]=0;c[e+16>>2]=h;j=357913941;f=10}if((f|0)==10){h=j;j=Wq(j*12|0)|0}c[e>>2]=j;l=j+(g*12|0)|0;f=e+8|0;c[f>>2]=l;g=e+4|0;c[g>>2]=l;c[k>>2]=j+(h*12|0);h=l;do{if((h|0)==0){h=0}else{c[h>>2]=0;c[h+4>>2]=0;c[h+8>>2]=0;h=c[f>>2]|0}h=h+12|0;c[f>>2]=h;b=b+ -1|0}while((b|0)!=0);Qe(a,e);a=c[g>>2]|0;h=c[f>>2]|0;if((h|0)!=(a|0)){while(1){g=h+ -12|0;c[f>>2]=g;b=c[g>>2]|0;if((b|0)!=0){h=h+ -8|0;j=c[h>>2]|0;if((j|0)!=(b|0)){c[h>>2]=j+(~((j+ -8+(0-b)|0)>>>3)<<3);g=c[f>>2]|0}Yq(b)}if((g|0)==(a|0)){break}else{h=g}}}e=c[e>>2]|0;if((e|0)==0){i=d;return}Yq(e);i=d;return}function Qe(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0;f=i;j=c[a>>2]|0;e=a+4|0;m=c[e>>2]|0;g=b+4|0;o=c[g>>2]|0;do{if((m|0)!=(j|0)){while(1){k=m+ -12|0;n=o+ -12|0;c[n>>2]=0;l=o+ -8|0;c[l>>2]=0;p=o+ -4|0;c[p>>2]=0;o=m+ -8|0;m=(c[o>>2]|0)-(c[k>>2]|0)|0;q=m>>3;if((q|0)!=0){if(q>>>0>536870911){j=4;break}m=Wq(m)|0;c[l>>2]=m;c[n>>2]=m;c[p>>2]=m+(q<<3);p=c[k>>2]|0;n=c[o>>2]|0;if((p|0)!=(n|0)){o=p;do{if((m|0)==0){m=0}else{p=o;q=c[p+4>>2]|0;c[m>>2]=c[p>>2];c[m+4>>2]=q;m=c[l>>2]|0}m=m+8|0;c[l>>2]=m;o=o+8|0}while((o|0)!=(n|0))}}o=(c[g>>2]|0)+ -12|0;c[g>>2]=o;if((k|0)==(j|0)){j=10;break}else{m=k}}if((j|0)==4){Sn(0)}else if((j|0)==10){d=o;h=c[a>>2]|0;break}}else{d=o;h=j}}while(0);c[a>>2]=d;c[g>>2]=h;o=b+8|0;q=c[e>>2]|0;c[e>>2]=c[o>>2];c[o>>2]=q;o=a+8|0;q=b+12|0;p=c[o>>2]|0;c[o>>2]=c[q>>2];c[q>>2]=p;c[b>>2]=c[g>>2];i=f;return}function Re(b){b=b|0;var d=0,e=0,f=0,g=0,h=0,j=0,k=0;d=i;c[b>>2]=1368;e=b+4|0;g=c[e>>2]|0;f=b+8|0;k=c[f>>2]|0;if((k|0)!=(g|0)){while(1){j=k+ -12|0;c[f>>2]=j;h=c[j>>2]|0;if((h|0)!=0){k=k+ -8|0;j=c[k>>2]|0;if((j|0)!=(h|0)){c[k>>2]=j+(~((j+ -8+(0-h)|0)>>>3)<<3)}Yq(h);j=c[f>>2]|0}if((j|0)==(g|0)){break}else{k=j}}}c[b+340>>2]=1536;g=c[b+344>>2]|0;if((g|0)!=0){Lc[c[(c[g>>2]|0)+4>>2]&255](g)}if(!((a[b+172|0]&1)==0)){Yq(c[b+180>>2]|0)}c[b+36>>2]=172;c[b+92>>2]=192;g=b+40|0;c[g>>2]=16;if(!((a[b+72|0]&1)==0)){Yq(c[b+80>>2]|0)}c[g>>2]=9208;_n(b+44|0);Pi(b+92|0);if(!((a[b+16|0]&1)==0)){Yq(c[b+24>>2]|0)}b=c[e>>2]|0;if((b|0)==0){i=d;return}h=c[f>>2]|0;if((h|0)!=(b|0)){do{j=h+ -12|0;c[f>>2]=j;g=c[j>>2]|0;if((g|0)==0){h=j}else{j=h+ -8|0;h=c[j>>2]|0;if((h|0)!=(g|0)){c[j>>2]=h+(~((h+ -8+(0-g)|0)>>>3)<<3)}Yq(g);h=c[f>>2]|0}}while((h|0)!=(b|0));b=c[e>>2]|0}Yq(b);i=d;return}function Se(a){a=a|0;var b=0;b=i;c[a>>2]=1536;a=c[a+4>>2]|0;if((a|0)==0){i=b;return}Lc[c[(c[a>>2]|0)+4>>2]&255](a);i=b;return}function Te(a){a=a|0;var b=0,d=0;b=i;c[a>>2]=1536;d=c[a+4>>2]|0;if((d|0)==0){Yq(a);i=b;return}Lc[c[(c[d>>2]|0)+4>>2]&255](d);Yq(a);i=b;return}function Ue(a){a=a|0;var b=0,d=0,e=0;b=i;c[a>>2]=1368;e=a+4|0;d=a+28|0;c[e+0>>2]=0;c[e+4>>2]=0;c[e+8>>2]=0;c[e+12>>2]=0;c[e+16>>2]=0;c[e+20>>2]=0;c[d>>2]=300;c[a+32>>2]=300;Fd(a+36|0);c[a+340>>2]=1536;c[a+344>>2]=0;i=b;return}function Ve(a){a=a|0;var b=0,d=0,e=0,f=0,g=0,h=0,j=0;d=i;c[a>>2]=1720;e=a+20|0;c[e>>2]=0;b=a+8|0;f=c[b>>2]|0;a=a+4|0;g=c[a>>2]|0;if((f|0)==(g|0)){e=f;a=f}else{j=0;while(1){h=c[g+(j<<2)>>2]|0;if((h|0)!=0){Zq(h);j=c[e>>2]|0;f=c[b>>2]|0;g=c[a>>2]|0}j=j+1|0;c[e>>2]=j;h=g;if(!(j>>>0<f-h>>2>>>0)){e=f;a=g;g=h;break}}}if((a|0)==0){i=d;return}if((e|0)!=(a|0)){c[b>>2]=e+(~((e+ -4+(0-g)|0)>>>2)<<2)}Yq(a);i=d;return}function We(a){a=a|0;var b=0,d=0,e=0,f=0,g=0,h=0,j=0;d=i;c[a>>2]=1640;e=a+20|0;c[e>>2]=0;b=a+8|0;f=c[b>>2]|0;a=a+4|0;g=c[a>>2]|0;if((f|0)==(g|0)){e=f;a=f}else{j=0;while(1){h=c[g+(j<<2)>>2]|0;if((h|0)!=0){Zq(h);j=c[e>>2]|0;f=c[b>>2]|0;g=c[a>>2]|0}j=j+1|0;c[e>>2]=j;h=g;if(!(j>>>0<f-h>>2>>>0)){e=f;a=g;g=h;break}}}if((a|0)==0){i=d;return}if((e|0)!=(a|0)){c[b>>2]=e+(~((e+ -4+(0-g)|0)>>>2)<<2)}Yq(a);i=d;return}function Xe(a){a=a|0;var b=0;b=i;Ze(a);i=b;return}function Ye(a){a=a|0;var b=0;b=i;Ze(a);Yq(a);i=b;return}function Ze(a){a=a|0;var b=0,d=0,e=0,f=0,g=0,h=0,j=0,k=0;b=i;c[a>>2]=1600;c[a+32>>2]=1720;e=a+52|0;c[e>>2]=0;d=a+40|0;g=c[d>>2]|0;f=a+36|0;h=c[f>>2]|0;if((g|0)==(h|0)){e=g;j=g}else{k=0;while(1){j=c[h+(k<<2)>>2]|0;if((j|0)==0){j=h}else{Zq(j);k=c[e>>2]|0;g=c[d>>2]|0;j=c[f>>2]|0}k=k+1|0;c[e>>2]=k;h=j;if(k>>>0<g-h>>2>>>0){h=j}else{e=g;break}}}if((j|0)!=0){if((e|0)!=(j|0)){c[d>>2]=e+(~((e+ -4+(0-h)|0)>>>2)<<2)}Yq(j)}c[a+4>>2]=1640;e=a+24|0;c[e>>2]=0;d=a+12|0;h=c[d>>2]|0;a=a+8|0;f=c[a>>2]|0;if((h|0)==(f|0)){a=h;j=h}else{g=0;while(1){j=c[f+(g<<2)>>2]|0;if((j|0)==0){j=f}else{Zq(j);g=c[e>>2]|0;h=c[d>>2]|0;j=c[a>>2]|0}g=g+1|0;c[e>>2]=g;f=j;if(g>>>0<h-f>>2>>>0){f=j}else{a=h;break}}}if((j|0)==0){i=b;return}if((a|0)!=(j|0)){c[d>>2]=a+(~((a+ -4+(0-f)|0)>>>2)<<2)}Yq(j);i=b;return}function _e(a){a=a|0;var b=0,d=0,e=0,f=0,g=0,h=0,j=0,k=0;d=i;c[a>>2]=1640;e=a+20|0;c[e>>2]=0;b=a+8|0;g=c[b>>2]|0;f=a+4|0;h=c[f>>2]|0;if((g|0)==(h|0)){e=g;f=g}else{j=0;while(1){k=c[h+(j<<2)>>2]|0;if((k|0)!=0){Zq(k);j=c[e>>2]|0;g=c[b>>2]|0;h=c[f>>2]|0}j=j+1|0;c[e>>2]=j;k=h;if(!(j>>>0<g-k>>2>>>0)){e=g;f=h;h=k;break}}}if((f|0)==0){Yq(a);i=d;return}if((e|0)!=(f|0)){c[b>>2]=e+(~((e+ -4+(0-h)|0)>>>2)<<2)}Yq(f);Yq(a);i=d;return}function $e(a){a=a|0;var b=0,d=0,e=0,f=0,g=0,h=0,j=0,k=0;d=i;c[a>>2]=1720;e=a+20|0;c[e>>2]=0;b=a+8|0;g=c[b>>2]|0;f=a+4|0;h=c[f>>2]|0;if((g|0)==(h|0)){e=g;f=g}else{j=0;while(1){k=c[h+(j<<2)>>2]|0;if((k|0)!=0){Zq(k);j=c[e>>2]|0;g=c[b>>2]|0;h=c[f>>2]|0}j=j+1|0;c[e>>2]=j;k=h;if(!(j>>>0<g-k>>2>>>0)){e=g;f=h;h=k;break}}}if((f|0)==0){Yq(a);i=d;return}if((e|0)!=(f|0)){c[b>>2]=e+(~((e+ -4+(0-h)|0)>>>2)<<2)}Yq(f);Yq(a);i=d;return}function af(d){d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0;e=i;i=i+16|0;f=e;a[1792]=0;g=c[446]|0;Lc[c[(c[g>>2]|0)+28>>2]&255](g);g=0;h=0;while(1){k=b[d+(g<<1)>>1]|0;j=b[d+((g|1)<<1)>>1]|0;if(k<<16>>16==-1){if(j<<16>>16==-1){break}h=h+1|0}else{l=c[446]|0;Vc[c[(c[l>>2]|0)+32>>2]&31](l,h,k<<16>>16,j<<16>>16)|0}g=g+2|0}d=c[444]|0;d=Hc[c[(c[d>>2]|0)+20>>2]&31](d,c[446]|0,10)|0;if((d|0)==0){l=c[444]|0;l=pd(7376,Pc[c[(c[l>>2]|0)+24>>2]&127](l)|0)|0;Qi(f,l+(c[(c[l>>2]|0)+ -12>>2]|0)|0);k=$n(f,11936)|0;k=Yc[c[(c[k>>2]|0)+28>>2]&63](k,10)|0;_n(f);Kj(l,k)|0;wj(l)|0;i=e;return 1792}if((Pc[c[(c[d>>2]|0)+8>>2]&127](d)|0)==0){i=e;return 1792}f=0;do{xr(1792,Yc[c[c[d>>2]>>2]&63](d,f)|0)|0;f=f+1|0}while(f>>>0<(Pc[c[(c[d>>2]|0)+8>>2]&127](d)|0)>>>0);i=e;return 1792}function bf(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0;e=i;i=i+16|0;f=e;g=Pd()|0;c[444]=g;if(Yc[c[c[g>>2]>>2]&63](g,a)|0){g=ye()|0;c[446]=g;Mc[c[(c[g>>2]|0)+12>>2]&63](g,b);g=c[446]|0;Mc[c[(c[g>>2]|0)+16>>2]&63](g,d);g=1;i=e;return g|0}else{g=c[444]|0;g=pd(7376,Pc[c[(c[g>>2]|0)+24>>2]&127](g)|0)|0;Qi(f,g+(c[(c[g>>2]|0)+ -12>>2]|0)|0);a=$n(f,11936)|0;a=Yc[c[(c[a>>2]|0)+28>>2]&63](a,10)|0;_n(f);Kj(g,a)|0;wj(g)|0;g=0;i=e;return g|0}return 0}function cf(){var a=0,b=0;a=i;b=c[446]|0;if((b|0)!=0){Lc[c[(c[b>>2]|0)+72>>2]&255](b)}c[446]=0;b=c[444]|0;if((b|0)==0){c[444]=0;i=a;return}Lc[c[(c[b>>2]|0)+32>>2]&255](b);c[444]=0;i=a;return}function df(a){a=a|0;var b=0,d=0;b=i;d=Wq(12504)|0;Cg(d);c[456]=d;a=Fg(d,a,1832)|0;i=b;return a|0}function ef(b){b=b|0;var d=0,e=0,f=0,g=0,h=0,j=0;d=i;i=i+16|0;e=d+4|0;f=d;wr(4752,0,200)|0;c[e>>2]=b;b=b+(rr(b|0)|0)|0;c[f>>2]=4752;hf(e,b,f,4952|0,0)|0;b=Jg(c[456]|0,4752,1848,50)|0;a[2648]=0;if((b|0)==0){i=d;return 2648}g=b+ -1|0;h=0;do{wr(3752,0,1e3)|0;c[e>>2]=1848+(h<<4);c[f>>2]=3752;gf(e,1864+(h<<4)|0,f,4752|0,0)|0;qq(2648,3752,21)|0;if((h|0)!=(g|0)){j=2648+(rr(2648)|0)|0;a[j]=32;a[j+1|0]=0}h=h+1|0}while((h|0)!=(b|0));i=d;return 2648}function ff(){var a=0,b=0,d=0;b=i;d=c[456]|0;if((d|0)!=0?(Hg(d),a=c[456]|0,(a|0)!=0):0){Dg(a);Yq(a)}i=b;return}function gf(e,f,g,h,j){e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0;k=i;m=c[e>>2]|0;p=c[g>>2]|0;a:do{if(m>>>0<f>>>0){j=(j|0)==0;o=m;while(1){m=o+2|0;n=b[o>>1]|0;q=n&65535;do{if((n+10240<<16>>16&65535)<1024){if(!(m>>>0<f>>>0)){l=1;m=o;break a}n=b[m>>1]|0;if(!((n+9216<<16>>16&65535)<1024)){if(j){l=3;m=o;break a}else{break}}else{q=(q<<10)+ -56613888+(n&65535)|0;m=o+4|0;break}}else{if(j?(n+9216<<16>>16&65535)<1024:0){l=3;m=o;break a}}}while(0);if(!(q>>>0<128)){if(!(q>>>0<2048)){if(q>>>0<65536){n=3;r=q}else{r=q>>>0<1114112;n=r?4:3;r=r?q:65533}}else{n=2;r=q}}else{n=1;r=q}q=p+n|0;if(q>>>0>h>>>0){l=2;m=o;break a}if((n|0)==4){q=p+3|0;a[q]=r&63|128;r=r>>>6;l=17}else if((n|0)==1){l=19}else if((n|0)==2){l=18}else if((n|0)==3){l=17}if((l|0)==17){q=q+ -1|0;a[q]=r&63|128;r=r>>>6;l=18}if((l|0)==18){q=q+ -1|0;a[q]=r&63|128;r=r>>>6;l=19}if((l|0)==19){l=0;q=q+ -1|0;a[q]=d[4952+n|0]|0|r}p=q+n|0;if(m>>>0<f>>>0){o=m}else{l=0;break}}}else{l=0}}while(0);c[e>>2]=m;c[g>>2]=p;i=k;return l|0}function hf(d,e,f,g,h){d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0;j=i;o=c[d>>2]|0;l=c[f>>2]|0;a:do{if(o>>>0<e>>>0){h=(h|0)==0;b:while(1){q=a[o]|0;p=q&255;m=a[4960+p|0]|0;n=m&65535;if(!((o+n|0)>>>0<e>>>0)){g=1;break a}r=o+(n+1)|0;if((n|0)==1){k=7}else if((n|0)==3){r=o+3|0;k=a[r]|0;if(k<<24>>24>-1|(k&255)>191){g=3;break a}else{k=6}}else if((n|0)==2){k=6}else if((n|0)!=0){g=3;break a}if((k|0)==6){r=r+ -1|0;k=a[r]|0;if(k<<24>>24>-1|(k&255)>191){g=3;break a}else{k=7}}do{if((k|0)==7){k=0;r=a[r+ -1|0]|0;if((r&255)>191){g=3;break a}if((p|0)==224){if((r&255)<160){g=3;break a}else{break}}else if((p|0)==240){if((r&255)<144){g=3;break a}else{break}}else if((p|0)==244){if((r&255)>143){g=3;break a}else{break}}else if((p|0)==237){if((r&255)>159){g=3;break a}else{break}}else{if(r<<24>>24>-1){g=3;break a}else{break}}}}while(0);if(!(((q&255)>193|q<<24>>24>-1)&(q&255)<245)){g=3;break a}switch(n|0){case 1:{r=0;k=20;break};case 5:{o=o+1|0;r=a[o]|0;p=p<<6;k=17;break};case 0:{p=q;q=0;k=21;break};case 3:{r=0;k=18;break};case 4:{r=q;p=0;k=17;break};case 2:{p=q;r=0;k=19;break};default:{p=0}}if((k|0)==17){o=o+1|0;q=a[o]|0;r=(r&255)+p<<6;k=18}if((k|0)==18){o=o+1|0;p=a[o]|0;r=(q&255)+r<<6;k=19}if((k|0)==19){o=o+1|0;q=a[o]|0;r=(p&255)+r<<6;k=20}if((k|0)==20){o=o+1|0;p=a[o]|0;q=(q&255)+r<<6;k=21}if((k|0)==21){k=0;p=(p&255)+q|0;o=o+1|0}p=p-(c[5216+(n<<2)>>2]|0)|0;if(!(l>>>0<g>>>0)){k=23;break}do{if(!(p>>>0<65536)){if(p>>>0>1114111){if(h){k=32;break b}b[l>>1]=-3;l=l+2|0;break}else{n=l+2|0;if(!(n>>>0<g>>>0)){k=36;break b}r=p+ -65536|0;b[l>>1]=(r>>>10)+55296;b[n>>1]=r&1023|56320;l=l+4|0;break}}else{if(!((p+ -55296|0)>>>0<2048)){b[l>>1]=p;l=l+2|0;break}if(h){k=27;break b}b[l>>1]=-3;l=l+2|0}}while(0);if(!(o>>>0<e>>>0)){g=0;break a}}if((k|0)==23){g=2;o=o+((m|-65536)^65535)|0;break}else if((k|0)==27){g=3;o=o+((m|-65536)^65535)|0;break}else if((k|0)==32){g=3;o=o+((m|-65536)^65535)|0;break}else if((k|0)==36){g=2;o=o+((m|-65536)^65535)|0;break}}else{g=0}}while(0);c[d>>2]=o;c[f>>2]=l;i=j;return g|0}function jf(b){b=b|0;var d=0,e=0;d=i;a[b]=0;e=b+8|0;c[e+0>>2]=0;c[e+4>>2]=0;c[e+8>>2]=0;c[e+12>>2]=0;c[b+4>>2]=qg()|0;c[b+96>>2]=33;c[b+100>>2]=34;c[b+104>>2]=35;c[b+108>>2]=36;c[b+112>>2]=37;c[b+116>>2]=38;c[b+120>>2]=39;c[b+124>>2]=40;i=d;return}function kf(a){a=a|0;var b=0,d=0,e=0;b=i;d=a+20|0;e=c[d>>2]|0;if((e|0)!=0){Sq(e)}c[d>>2]=0;d=a+12|0;e=c[d>>2]|0;if((e|0)!=0){Sq(e)}c[d>>2]=0;a=a+16|0;d=c[a>>2]|0;if((d|0)==0){c[a>>2]=0;i=b;return}Sq(d);c[a>>2]=0;i=b;return}function lf(a,d,e,f,h,j){a=a|0;d=d|0;e=e|0;f=f|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0;k=i;o=e&65535;if((e&65535)>7|e<<16>>16==0){La(5240,5288,236,5312)}p=c[a+(o+ -1<<2)+96>>2]|0;m=Xf()|0;n=8-o|0;if(e<<16>>16==8){A=0;i=k;return A|0}q=a+20|0;s=1;y=0;r=2;while(1){u=s+o&65535;x=u+ -1|0;t=a+(x<<2)+24|0;w=c[t>>2]|0;v=a+(u<<2)+24|0;w=Wf(d,(c[q>>2]|0)+(w<<1)|0,(((c[v>>2]|0)-w|0)>>>0)/(u>>>0)|0,u<<1,p)|0;a:do{if((w|0)!=0){z=0-u|0;while(1){if(!(w>>>0>((c[q>>2]|0)+(c[t>>2]<<1)|0)>>>0)){break}A=w+(z<<1)|0;if((Yc[p&63](w,A)|0)==0){w=A}else{break}}if((w|0)!=0?w>>>0<((c[q>>2]|0)+(c[v>>2]<<1)|0)>>>0:0){x=a+(x<<2)+60|0;while(1){if(!((Yc[p&63](w,d)|0)==0&y>>>0<h>>>0)){t=y;break a}A=f+(y*20|0)|0;c[A+0>>2]=0;c[A+4>>2]=0;c[A+8>>2]=0;c[A+12>>2]=0;c[A+16>>2]=0;Bg(f+(y*20|0)+4|0,w+(o<<1)|0,s)|0;g[A>>2]=+_f(m,(c[x>>2]|0)+((((w-(c[q>>2]|0)>>1)-(c[t>>2]|0)|0)>>>0)/(u>>>0)|0)|0);b[f+(y*20|0)+18>>1]=e;y=y+1|0;w=w+(u<<1)|0;if(!(w>>>0<((c[q>>2]|0)+(c[v>>2]<<1)|0)>>>0)){t=y;break}}}else{t=y}}else{t=y}}while(0);s=r&65535;if(s>>>0>n>>>0){break}y=t;r=r+1<<16>>16}if((t|0)==0){A=0;i=k;return A|0}if((j|0)==0){j=0;a=0;do{A=f+(a*20|0)|0;z=f+(j*20|0)|0;c[A+0>>2]=c[z+0>>2];c[A+4>>2]=c[z+4>>2];c[A+8>>2]=c[z+8>>2];c[A+12>>2]=c[z+12>>2];c[A+16>>2]=c[z+16>>2];a=a+1|0;j=j+1|0}while((j|0)!=(t|0));i=k;return a|0}else{h=0;a=0}do{n=f+(h*20|0)+4|0;e=1;while(1){m=e+1|0;if((Ag(f+((0-e|0)*20|0)+4|0,n,7)|0)==0){break}if(m>>>0>j>>>0){l=22;break}else{e=m}}if((l|0)==22){l=0;A=f+(a*20|0)|0;z=f+(h*20|0)|0;c[A+0>>2]=c[z+0>>2];c[A+4>>2]=c[z+4>>2];c[A+8>>2]=c[z+8>>2];c[A+12>>2]=c[z+12>>2];c[A+16>>2]=c[z+16>>2];a=a+1|0}h=h+1|0}while((h|0)!=(t|0));i=k;return a|0}function mf(d,e,f,g){d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0,n=0;h=i;if((a[d]|0)==0){n=0;i=h;return n|0}if((c[d+92>>2]|0)>>>0<=e>>>0|(f|0)==0|(g&65535)<2){n=0;i=h;return n|0}n=(g&65535)+ -1|0;k=0;m=0;g=1;while(1){j=k+1|0;if((k|0)>=(n|0)){f=0;m=11;break}l=c[d+(k<<2)+60>>2]|0;if(!(l>>>0>e>>>0)?(c[d+(j<<2)+60>>2]|0)>>>0>e>>>0:0){m=7;break}j=(m&65535)+1<<16>>16;if((j&65535)<8){k=j&65535;m=m+1|0;g=g+1<<16>>16}else{f=0;m=11;break}}if((m|0)==7){m=c[d+20>>2]|0;d=(c[d+(k<<2)+24>>2]|0)+(ea(e-l|0,j)|0)|0;e=0;do{b[f+(e<<1)>>1]=b[m+(d+e<<1)>>1]|0;e=e+1|0}while(!((e&65535)<<16>>16==g<<16>>16));b[f+(j<<1)>>1]=0;n=j&65535;i=h;return n|0}else if((m|0)==11){i=h;return f|0}return 0}



function Pq(b,d,e,f,g,h){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0;j=i;if((b|0)!=(c[d+8>>2]|0)){b=c[b+8>>2]|0;Xc[c[(c[b>>2]|0)+20>>2]&31](b,d,e,f,g,h);i=j;return}a[d+53|0]=1;if((c[d+4>>2]|0)!=(f|0)){i=j;return}a[d+52|0]=1;b=d+16|0;f=c[b>>2]|0;if((f|0)==0){c[b>>2]=e;c[d+24>>2]=g;c[d+36>>2]=1;if(!((c[d+48>>2]|0)==1&(g|0)==1)){i=j;return}a[d+54|0]=1;i=j;return}if((f|0)!=(e|0)){h=d+36|0;c[h>>2]=(c[h>>2]|0)+1;a[d+54|0]=1;i=j;return}e=d+24|0;b=c[e>>2]|0;if((b|0)==2){c[e>>2]=g}else{g=b}if(!((c[d+48>>2]|0)==1&(g|0)==1)){i=j;return}a[d+54|0]=1;i=j;return}function Qq(b,d,e,f,g,h){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;h=i;if((c[d+8>>2]|0)!=(b|0)){i=h;return}a[d+53|0]=1;if((c[d+4>>2]|0)!=(f|0)){i=h;return}a[d+52|0]=1;f=d+16|0;b=c[f>>2]|0;if((b|0)==0){c[f>>2]=e;c[d+24>>2]=g;c[d+36>>2]=1;if(!((c[d+48>>2]|0)==1&(g|0)==1)){i=h;return}a[d+54|0]=1;i=h;return}if((b|0)!=(e|0)){b=d+36|0;c[b>>2]=(c[b>>2]|0)+1;a[d+54|0]=1;i=h;return}e=d+24|0;f=c[e>>2]|0;if((f|0)==2){c[e>>2]=g}else{g=f}if(!((c[d+48>>2]|0)==1&(g|0)==1)){i=h;return}a[d+54|0]=1;i=h;return}function Rq(a){a=a|0;var b=0,d=0,e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0;b=i;do{if(a>>>0<245){if(a>>>0<11){a=16}else{a=a+11&-8}v=a>>>3;t=c[5064]|0;w=t>>>v;if((w&3|0)!=0){h=(w&1^1)+v|0;g=h<<1;e=20296+(g<<2)|0;g=20296+(g+2<<2)|0;j=c[g>>2]|0;d=j+8|0;f=c[d>>2]|0;do{if((e|0)!=(f|0)){if(f>>>0<(c[20272>>2]|0)>>>0){gc()}k=f+12|0;if((c[k>>2]|0)==(j|0)){c[k>>2]=e;c[g>>2]=f;break}else{gc()}}else{c[5064]=t&~(1<<h)}}while(0);H=h<<3;c[j+4>>2]=H|3;H=j+(H|4)|0;c[H>>2]=c[H>>2]|1;H=d;i=b;return H|0}if(a>>>0>(c[20264>>2]|0)>>>0){if((w|0)!=0){j=2<<v;j=w<<v&(j|0-j);j=(j&0-j)+ -1|0;d=j>>>12&16;j=j>>>d;h=j>>>5&8;j=j>>>h;g=j>>>2&4;j=j>>>g;f=j>>>1&2;j=j>>>f;e=j>>>1&1;e=(h|d|g|f|e)+(j>>>e)|0;j=e<<1;f=20296+(j<<2)|0;j=20296+(j+2<<2)|0;g=c[j>>2]|0;d=g+8|0;h=c[d>>2]|0;do{if((f|0)!=(h|0)){if(h>>>0<(c[20272>>2]|0)>>>0){gc()}k=h+12|0;if((c[k>>2]|0)==(g|0)){c[k>>2]=f;c[j>>2]=h;break}else{gc()}}else{c[5064]=t&~(1<<e)}}while(0);h=e<<3;f=h-a|0;c[g+4>>2]=a|3;e=g+a|0;c[g+(a|4)>>2]=f|1;c[g+h>>2]=f;h=c[20264>>2]|0;if((h|0)!=0){g=c[20276>>2]|0;k=h>>>3;l=k<<1;h=20296+(l<<2)|0;j=c[5064]|0;k=1<<k;if((j&k|0)!=0){j=20296+(l+2<<2)|0;k=c[j>>2]|0;if(k>>>0<(c[20272>>2]|0)>>>0){gc()}else{D=j;C=k}}else{c[5064]=j|k;D=20296+(l+2<<2)|0;C=h}c[D>>2]=g;c[C+12>>2]=g;c[g+8>>2]=C;c[g+12>>2]=h}c[20264>>2]=f;c[20276>>2]=e;H=d;i=b;return H|0}t=c[20260>>2]|0;if((t|0)!=0){d=(t&0-t)+ -1|0;G=d>>>12&16;d=d>>>G;F=d>>>5&8;d=d>>>F;H=d>>>2&4;d=d>>>H;h=d>>>1&2;d=d>>>h;e=d>>>1&1;e=c[20560+((F|G|H|h|e)+(d>>>e)<<2)>>2]|0;d=(c[e+4>>2]&-8)-a|0;h=e;while(1){g=c[h+16>>2]|0;if((g|0)==0){g=c[h+20>>2]|0;if((g|0)==0){break}}h=(c[g+4>>2]&-8)-a|0;f=h>>>0<d>>>0;d=f?h:d;h=g;e=f?g:e}h=c[20272>>2]|0;if(e>>>0<h>>>0){gc()}f=e+a|0;if(!(e>>>0<f>>>0)){gc()}g=c[e+24>>2]|0;j=c[e+12>>2]|0;do{if((j|0)==(e|0)){k=e+20|0;j=c[k>>2]|0;if((j|0)==0){k=e+16|0;j=c[k>>2]|0;if((j|0)==0){B=0;break}}while(1){m=j+20|0;l=c[m>>2]|0;if((l|0)!=0){j=l;k=m;continue}m=j+16|0;l=c[m>>2]|0;if((l|0)==0){break}else{j=l;k=m}}if(k>>>0<h>>>0){gc()}else{c[k>>2]=0;B=j;break}}else{k=c[e+8>>2]|0;if(k>>>0<h>>>0){gc()}h=k+12|0;if((c[h>>2]|0)!=(e|0)){gc()}l=j+8|0;if((c[l>>2]|0)==(e|0)){c[h>>2]=j;c[l>>2]=k;B=j;break}else{gc()}}}while(0);do{if((g|0)!=0){j=c[e+28>>2]|0;h=20560+(j<<2)|0;if((e|0)==(c[h>>2]|0)){c[h>>2]=B;if((B|0)==0){c[20260>>2]=c[20260>>2]&~(1<<j);break}}else{if(g>>>0<(c[20272>>2]|0)>>>0){gc()}h=g+16|0;if((c[h>>2]|0)==(e|0)){c[h>>2]=B}else{c[g+20>>2]=B}if((B|0)==0){break}}if(B>>>0<(c[20272>>2]|0)>>>0){gc()}c[B+24>>2]=g;g=c[e+16>>2]|0;do{if((g|0)!=0){if(g>>>0<(c[20272>>2]|0)>>>0){gc()}else{c[B+16>>2]=g;c[g+24>>2]=B;break}}}while(0);g=c[e+20>>2]|0;if((g|0)!=0){if(g>>>0<(c[20272>>2]|0)>>>0){gc()}else{c[B+20>>2]=g;c[g+24>>2]=B;break}}}}while(0);if(d>>>0<16){H=d+a|0;c[e+4>>2]=H|3;H=e+(H+4)|0;c[H>>2]=c[H>>2]|1}else{c[e+4>>2]=a|3;c[e+(a|4)>>2]=d|1;c[e+(d+a)>>2]=d;h=c[20264>>2]|0;if((h|0)!=0){g=c[20276>>2]|0;k=h>>>3;l=k<<1;h=20296+(l<<2)|0;j=c[5064]|0;k=1<<k;if((j&k|0)!=0){j=20296+(l+2<<2)|0;k=c[j>>2]|0;if(k>>>0<(c[20272>>2]|0)>>>0){gc()}else{A=j;z=k}}else{c[5064]=j|k;A=20296+(l+2<<2)|0;z=h}c[A>>2]=g;c[z+12>>2]=g;c[g+8>>2]=z;c[g+12>>2]=h}c[20264>>2]=d;c[20276>>2]=f}H=e+8|0;i=b;return H|0}}}else{if(!(a>>>0>4294967231)){z=a+11|0;a=z&-8;B=c[20260>>2]|0;if((B|0)!=0){A=0-a|0;z=z>>>8;if((z|0)!=0){if(a>>>0>16777215){C=31}else{G=(z+1048320|0)>>>16&8;H=z<<G;F=(H+520192|0)>>>16&4;H=H<<F;C=(H+245760|0)>>>16&2;C=14-(F|G|C)+(H<<C>>>15)|0;C=a>>>(C+7|0)&1|C<<1}}else{C=0}F=c[20560+(C<<2)>>2]|0;a:do{if((F|0)==0){E=0;z=0}else{if((C|0)==31){z=0}else{z=25-(C>>>1)|0}E=0;D=a<<z;z=0;while(1){H=c[F+4>>2]&-8;G=H-a|0;if(G>>>0<A>>>0){if((H|0)==(a|0)){A=G;E=F;z=F;break a}else{A=G;z=F}}G=c[F+20>>2]|0;F=c[F+(D>>>31<<2)+16>>2]|0;E=(G|0)==0|(G|0)==(F|0)?E:G;if((F|0)==0){break}else{D=D<<1}}}}while(0);if((E|0)==0&(z|0)==0){H=2<<C;B=B&(H|0-H);if((B|0)==0){break}H=(B&0-B)+ -1|0;D=H>>>12&16;H=H>>>D;C=H>>>5&8;H=H>>>C;F=H>>>2&4;H=H>>>F;G=H>>>1&2;H=H>>>G;E=H>>>1&1;E=c[20560+((C|D|F|G|E)+(H>>>E)<<2)>>2]|0}if((E|0)!=0){while(1){C=(c[E+4>>2]&-8)-a|0;B=C>>>0<A>>>0;A=B?C:A;z=B?E:z;B=c[E+16>>2]|0;if((B|0)!=0){E=B;continue}E=c[E+20>>2]|0;if((E|0)==0){break}}}if((z|0)!=0?A>>>0<((c[20264>>2]|0)-a|0)>>>0:0){f=c[20272>>2]|0;if(z>>>0<f>>>0){gc()}d=z+a|0;if(!(z>>>0<d>>>0)){gc()}e=c[z+24>>2]|0;h=c[z+12>>2]|0;do{if((h|0)==(z|0)){h=z+20|0;g=c[h>>2]|0;if((g|0)==0){h=z+16|0;g=c[h>>2]|0;if((g|0)==0){x=0;break}}while(1){k=g+20|0;j=c[k>>2]|0;if((j|0)!=0){g=j;h=k;continue}j=g+16|0;k=c[j>>2]|0;if((k|0)==0){break}else{g=k;h=j}}if(h>>>0<f>>>0){gc()}else{c[h>>2]=0;x=g;break}}else{g=c[z+8>>2]|0;if(g>>>0<f>>>0){gc()}j=g+12|0;if((c[j>>2]|0)!=(z|0)){gc()}f=h+8|0;if((c[f>>2]|0)==(z|0)){c[j>>2]=h;c[f>>2]=g;x=h;break}else{gc()}}}while(0);do{if((e|0)!=0){f=c[z+28>>2]|0;g=20560+(f<<2)|0;if((z|0)==(c[g>>2]|0)){c[g>>2]=x;if((x|0)==0){c[20260>>2]=c[20260>>2]&~(1<<f);break}}else{if(e>>>0<(c[20272>>2]|0)>>>0){gc()}f=e+16|0;if((c[f>>2]|0)==(z|0)){c[f>>2]=x}else{c[e+20>>2]=x}if((x|0)==0){break}}if(x>>>0<(c[20272>>2]|0)>>>0){gc()}c[x+24>>2]=e;e=c[z+16>>2]|0;do{if((e|0)!=0){if(e>>>0<(c[20272>>2]|0)>>>0){gc()}else{c[x+16>>2]=e;c[e+24>>2]=x;break}}}while(0);e=c[z+20>>2]|0;if((e|0)!=0){if(e>>>0<(c[20272>>2]|0)>>>0){gc()}else{c[x+20>>2]=e;c[e+24>>2]=x;break}}}}while(0);b:do{if(!(A>>>0<16)){c[z+4>>2]=a|3;c[z+(a|4)>>2]=A|1;c[z+(A+a)>>2]=A;f=A>>>3;if(A>>>0<256){h=f<<1;e=20296+(h<<2)|0;g=c[5064]|0;f=1<<f;if((g&f|0)!=0){g=20296+(h+2<<2)|0;f=c[g>>2]|0;if(f>>>0<(c[20272>>2]|0)>>>0){gc()}else{w=g;v=f}}else{c[5064]=g|f;w=20296+(h+2<<2)|0;v=e}c[w>>2]=d;c[v+12>>2]=d;c[z+(a+8)>>2]=v;c[z+(a+12)>>2]=e;break}e=A>>>8;if((e|0)!=0){if(A>>>0>16777215){e=31}else{G=(e+1048320|0)>>>16&8;H=e<<G;F=(H+520192|0)>>>16&4;H=H<<F;e=(H+245760|0)>>>16&2;e=14-(F|G|e)+(H<<e>>>15)|0;e=A>>>(e+7|0)&1|e<<1}}else{e=0}h=20560+(e<<2)|0;c[z+(a+28)>>2]=e;c[z+(a+20)>>2]=0;c[z+(a+16)>>2]=0;f=c[20260>>2]|0;g=1<<e;if((f&g|0)==0){c[20260>>2]=f|g;c[h>>2]=d;c[z+(a+24)>>2]=h;c[z+(a+12)>>2]=d;c[z+(a+8)>>2]=d;break}f=c[h>>2]|0;if((e|0)==31){e=0}else{e=25-(e>>>1)|0}c:do{if((c[f+4>>2]&-8|0)!=(A|0)){e=A<<e;while(1){h=f+(e>>>31<<2)+16|0;g=c[h>>2]|0;if((g|0)==0){break}if((c[g+4>>2]&-8|0)==(A|0)){t=g;break c}else{e=e<<1;f=g}}if(h>>>0<(c[20272>>2]|0)>>>0){gc()}else{c[h>>2]=d;c[z+(a+24)>>2]=f;c[z+(a+12)>>2]=d;c[z+(a+8)>>2]=d;break b}}else{t=f}}while(0);f=t+8|0;e=c[f>>2]|0;g=c[20272>>2]|0;if(t>>>0<g>>>0){gc()}if(e>>>0<g>>>0){gc()}else{c[e+12>>2]=d;c[f>>2]=d;c[z+(a+8)>>2]=e;c[z+(a+12)>>2]=t;c[z+(a+24)>>2]=0;break}}else{H=A+a|0;c[z+4>>2]=H|3;H=z+(H+4)|0;c[H>>2]=c[H>>2]|1}}while(0);H=z+8|0;i=b;return H|0}}}else{a=-1}}}while(0);t=c[20264>>2]|0;if(!(a>>>0>t>>>0)){e=t-a|0;d=c[20276>>2]|0;if(e>>>0>15){c[20276>>2]=d+a;c[20264>>2]=e;c[d+(a+4)>>2]=e|1;c[d+t>>2]=e;c[d+4>>2]=a|3}else{c[20264>>2]=0;c[20276>>2]=0;c[d+4>>2]=t|3;H=d+(t+4)|0;c[H>>2]=c[H>>2]|1}H=d+8|0;i=b;return H|0}t=c[20268>>2]|0;if(a>>>0<t>>>0){G=t-a|0;c[20268>>2]=G;H=c[20280>>2]|0;c[20280>>2]=H+a;c[H+(a+4)>>2]=G|1;c[H+4>>2]=a|3;H=H+8|0;i=b;return H|0}do{if((c[5182]|0)==0){t=ec(30)|0;if((t+ -1&t|0)==0){c[20736>>2]=t;c[20732>>2]=t;c[20740>>2]=-1;c[20744>>2]=-1;c[20748>>2]=0;c[20700>>2]=0;c[5182]=(Db(0)|0)&-16^1431655768;break}else{gc()}}}while(0);v=a+48|0;A=c[20736>>2]|0;w=a+47|0;x=A+w|0;A=0-A|0;t=x&A;if(!(t>>>0>a>>>0)){H=0;i=b;return H|0}z=c[20696>>2]|0;if((z|0)!=0?(G=c[20688>>2]|0,H=G+t|0,H>>>0<=G>>>0|H>>>0>z>>>0):0){H=0;i=b;return H|0}d:do{if((c[20700>>2]&4|0)==0){B=c[20280>>2]|0;e:do{if((B|0)!=0){z=20704|0;while(1){C=c[z>>2]|0;if(!(C>>>0>B>>>0)?(y=z+4|0,(C+(c[y>>2]|0)|0)>>>0>B>>>0):0){break}z=c[z+8>>2]|0;if((z|0)==0){o=182;break e}}if((z|0)!=0){A=x-(c[20268>>2]|0)&A;if(A>>>0<2147483647){o=Ra(A|0)|0;B=(o|0)==((c[z>>2]|0)+(c[y>>2]|0)|0);x=o;z=A;y=B?o:-1;A=B?A:0;o=191}else{A=0}}else{o=182}}else{o=182}}while(0);do{if((o|0)==182){y=Ra(0)|0;if((y|0)!=(-1|0)){z=y;x=c[20732>>2]|0;A=x+ -1|0;if((A&z|0)==0){A=t}else{A=t-z+(A+z&0-x)|0}z=c[20688>>2]|0;B=z+A|0;if(A>>>0>a>>>0&A>>>0<2147483647){x=c[20696>>2]|0;if((x|0)!=0?B>>>0<=z>>>0|B>>>0>x>>>0:0){A=0;break}x=Ra(A|0)|0;o=(x|0)==(y|0);z=A;y=o?y:-1;A=o?A:0;o=191}else{A=0}}else{A=0}}}while(0);f:do{if((o|0)==191){o=0-z|0;if((y|0)!=(-1|0)){s=y;p=A;o=202;break d}do{if((x|0)!=(-1|0)&z>>>0<2147483647&z>>>0<v>>>0?(u=c[20736>>2]|0,u=w-z+u&0-u,u>>>0<2147483647):0){if((Ra(u|0)|0)==(-1|0)){Ra(o|0)|0;break f}else{z=u+z|0;break}}}while(0);if((x|0)!=(-1|0)){s=x;p=z;o=202;break d}}}while(0);c[20700>>2]=c[20700>>2]|4;o=199}else{A=0;o=199}}while(0);if((((o|0)==199?t>>>0<2147483647:0)?(s=Ra(t|0)|0,r=Ra(0)|0,(r|0)!=(-1|0)&(s|0)!=(-1|0)&s>>>0<r>>>0):0)?(q=r-s|0,p=q>>>0>(a+40|0)>>>0,p):0){p=p?q:A;o=202}if((o|0)==202){q=(c[20688>>2]|0)+p|0;c[20688>>2]=q;if(q>>>0>(c[20692>>2]|0)>>>0){c[20692>>2]=q}q=c[20280>>2]|0;g:do{if((q|0)!=0){w=20704|0;while(1){r=c[w>>2]|0;u=w+4|0;v=c[u>>2]|0;if((s|0)==(r+v|0)){o=214;break}t=c[w+8>>2]|0;if((t|0)==0){break}else{w=t}}if(((o|0)==214?(c[w+12>>2]&8|0)==0:0)?q>>>0>=r>>>0&q>>>0<s>>>0:0){c[u>>2]=v+p;d=(c[20268>>2]|0)+p|0;e=q+8|0;if((e&7|0)==0){e=0}else{e=0-e&7}H=d-e|0;c[20280>>2]=q+e;c[20268>>2]=H;c[q+(e+4)>>2]=H|1;c[q+(d+4)>>2]=40;c[20284>>2]=c[20744>>2];break}if(s>>>0<(c[20272>>2]|0)>>>0){c[20272>>2]=s}u=s+p|0;r=20704|0;while(1){if((c[r>>2]|0)==(u|0)){o=224;break}t=c[r+8>>2]|0;if((t|0)==0){break}else{r=t}}if((o|0)==224?(c[r+12>>2]&8|0)==0:0){c[r>>2]=s;h=r+4|0;c[h>>2]=(c[h>>2]|0)+p;h=s+8|0;if((h&7|0)==0){h=0}else{h=0-h&7}j=s+(p+8)|0;if((j&7|0)==0){o=0}else{o=0-j&7}q=s+(o+p)|0;k=h+a|0;j=s+k|0;m=q-(s+h)-a|0;c[s+(h+4)>>2]=a|3;h:do{if((q|0)!=(c[20280>>2]|0)){if((q|0)==(c[20276>>2]|0)){H=(c[20264>>2]|0)+m|0;c[20264>>2]=H;c[20276>>2]=j;c[s+(k+4)>>2]=H|1;c[s+(H+k)>>2]=H;break}a=p+4|0;t=c[s+(a+o)>>2]|0;if((t&3|0)==1){n=t&-8;r=t>>>3;do{if(!(t>>>0<256)){l=c[s+((o|24)+p)>>2]|0;u=c[s+(p+12+o)>>2]|0;do{if((u|0)==(q|0)){u=o|16;t=s+(a+u)|0;r=c[t>>2]|0;if((r|0)==0){t=s+(u+p)|0;r=c[t>>2]|0;if((r|0)==0){g=0;break}}while(1){v=r+20|0;u=c[v>>2]|0;if((u|0)!=0){r=u;t=v;continue}u=r+16|0;v=c[u>>2]|0;if((v|0)==0){break}else{r=v;t=u}}if(t>>>0<(c[20272>>2]|0)>>>0){gc()}else{c[t>>2]=0;g=r;break}}else{t=c[s+((o|8)+p)>>2]|0;if(t>>>0<(c[20272>>2]|0)>>>0){gc()}r=t+12|0;if((c[r>>2]|0)!=(q|0)){gc()}v=u+8|0;if((c[v>>2]|0)==(q|0)){c[r>>2]=u;c[v>>2]=t;g=u;break}else{gc()}}}while(0);if((l|0)!=0){r=c[s+(p+28+o)>>2]|0;t=20560+(r<<2)|0;if((q|0)==(c[t>>2]|0)){c[t>>2]=g;if((g|0)==0){c[20260>>2]=c[20260>>2]&~(1<<r);break}}else{if(l>>>0<(c[20272>>2]|0)>>>0){gc()}r=l+16|0;if((c[r>>2]|0)==(q|0)){c[r>>2]=g}else{c[l+20>>2]=g}if((g|0)==0){break}}if(g>>>0<(c[20272>>2]|0)>>>0){gc()}c[g+24>>2]=l;q=o|16;l=c[s+(q+p)>>2]|0;do{if((l|0)!=0){if(l>>>0<(c[20272>>2]|0)>>>0){gc()}else{c[g+16>>2]=l;c[l+24>>2]=g;break}}}while(0);l=c[s+(a+q)>>2]|0;if((l|0)!=0){if(l>>>0<(c[20272>>2]|0)>>>0){gc()}else{c[g+20>>2]=l;c[l+24>>2]=g;break}}}}else{g=c[s+((o|8)+p)>>2]|0;a=c[s+(p+12+o)>>2]|0;t=20296+(r<<1<<2)|0;if((g|0)!=(t|0)){if(g>>>0<(c[20272>>2]|0)>>>0){gc()}if((c[g+12>>2]|0)!=(q|0)){gc()}}if((a|0)==(g|0)){c[5064]=c[5064]&~(1<<r);break}if((a|0)!=(t|0)){if(a>>>0<(c[20272>>2]|0)>>>0){gc()}r=a+8|0;if((c[r>>2]|0)==(q|0)){l=r}else{gc()}}else{l=a+8|0}c[g+12>>2]=a;c[l>>2]=g}}while(0);q=s+((n|o)+p)|0;m=n+m|0}g=q+4|0;c[g>>2]=c[g>>2]&-2;c[s+(k+4)>>2]=m|1;c[s+(m+k)>>2]=m;g=m>>>3;if(m>>>0<256){m=g<<1;d=20296+(m<<2)|0;l=c[5064]|0;g=1<<g;if((l&g|0)!=0){l=20296+(m+2<<2)|0;g=c[l>>2]|0;if(g>>>0<(c[20272>>2]|0)>>>0){gc()}else{e=l;f=g}}else{c[5064]=l|g;e=20296+(m+2<<2)|0;f=d}c[e>>2]=j;c[f+12>>2]=j;c[s+(k+8)>>2]=f;c[s+(k+12)>>2]=d;break}e=m>>>8;if((e|0)!=0){if(m>>>0>16777215){e=31}else{G=(e+1048320|0)>>>16&8;H=e<<G;F=(H+520192|0)>>>16&4;H=H<<F;e=(H+245760|0)>>>16&2;e=14-(F|G|e)+(H<<e>>>15)|0;e=m>>>(e+7|0)&1|e<<1}}else{e=0}f=20560+(e<<2)|0;c[s+(k+28)>>2]=e;c[s+(k+20)>>2]=0;c[s+(k+16)>>2]=0;l=c[20260>>2]|0;g=1<<e;if((l&g|0)==0){c[20260>>2]=l|g;c[f>>2]=j;c[s+(k+24)>>2]=f;c[s+(k+12)>>2]=j;c[s+(k+8)>>2]=j;break}f=c[f>>2]|0;if((e|0)==31){e=0}else{e=25-(e>>>1)|0}i:do{if((c[f+4>>2]&-8|0)!=(m|0)){e=m<<e;while(1){g=f+(e>>>31<<2)+16|0;l=c[g>>2]|0;if((l|0)==0){break}if((c[l+4>>2]&-8|0)==(m|0)){d=l;break i}else{e=e<<1;f=l}}if(g>>>0<(c[20272>>2]|0)>>>0){gc()}else{c[g>>2]=j;c[s+(k+24)>>2]=f;c[s+(k+12)>>2]=j;c[s+(k+8)>>2]=j;break h}}else{d=f}}while(0);f=d+8|0;e=c[f>>2]|0;g=c[20272>>2]|0;if(d>>>0<g>>>0){gc()}if(e>>>0<g>>>0){gc()}else{c[e+12>>2]=j;c[f>>2]=j;c[s+(k+8)>>2]=e;c[s+(k+12)>>2]=d;c[s+(k+24)>>2]=0;break}}else{H=(c[20268>>2]|0)+m|0;c[20268>>2]=H;c[20280>>2]=j;c[s+(k+4)>>2]=H|1}}while(0);H=s+(h|8)|0;i=b;return H|0}e=20704|0;while(1){d=c[e>>2]|0;if(!(d>>>0>q>>>0)?(n=c[e+4>>2]|0,m=d+n|0,m>>>0>q>>>0):0){break}e=c[e+8>>2]|0}e=d+(n+ -39)|0;if((e&7|0)==0){e=0}else{e=0-e&7}d=d+(n+ -47+e)|0;d=d>>>0<(q+16|0)>>>0?q:d;e=d+8|0;f=s+8|0;if((f&7|0)==0){f=0}else{f=0-f&7}H=p+ -40-f|0;c[20280>>2]=s+f;c[20268>>2]=H;c[s+(f+4)>>2]=H|1;c[s+(p+ -36)>>2]=40;c[20284>>2]=c[20744>>2];c[d+4>>2]=27;c[e+0>>2]=c[20704>>2];c[e+4>>2]=c[20708>>2];c[e+8>>2]=c[20712>>2];c[e+12>>2]=c[20716>>2];c[20704>>2]=s;c[20708>>2]=p;c[20716>>2]=0;c[20712>>2]=e;f=d+28|0;c[f>>2]=7;if((d+32|0)>>>0<m>>>0){while(1){e=f+4|0;c[e>>2]=7;if((f+8|0)>>>0<m>>>0){f=e}else{break}}}if((d|0)!=(q|0)){d=d-q|0;e=q+(d+4)|0;c[e>>2]=c[e>>2]&-2;c[q+4>>2]=d|1;c[q+d>>2]=d;e=d>>>3;if(d>>>0<256){f=e<<1;d=20296+(f<<2)|0;g=c[5064]|0;e=1<<e;if((g&e|0)!=0){f=20296+(f+2<<2)|0;e=c[f>>2]|0;if(e>>>0<(c[20272>>2]|0)>>>0){gc()}else{j=f;k=e}}else{c[5064]=g|e;j=20296+(f+2<<2)|0;k=d}c[j>>2]=q;c[k+12>>2]=q;c[q+8>>2]=k;c[q+12>>2]=d;break}e=d>>>8;if((e|0)!=0){if(d>>>0>16777215){e=31}else{G=(e+1048320|0)>>>16&8;H=e<<G;F=(H+520192|0)>>>16&4;H=H<<F;e=(H+245760|0)>>>16&2;e=14-(F|G|e)+(H<<e>>>15)|0;e=d>>>(e+7|0)&1|e<<1}}else{e=0}j=20560+(e<<2)|0;c[q+28>>2]=e;c[q+20>>2]=0;c[q+16>>2]=0;f=c[20260>>2]|0;g=1<<e;if((f&g|0)==0){c[20260>>2]=f|g;c[j>>2]=q;c[q+24>>2]=j;c[q+12>>2]=q;c[q+8>>2]=q;break}f=c[j>>2]|0;if((e|0)==31){e=0}else{e=25-(e>>>1)|0}j:do{if((c[f+4>>2]&-8|0)!=(d|0)){e=d<<e;while(1){j=f+(e>>>31<<2)+16|0;g=c[j>>2]|0;if((g|0)==0){break}if((c[g+4>>2]&-8|0)==(d|0)){h=g;break j}else{e=e<<1;f=g}}if(j>>>0<(c[20272>>2]|0)>>>0){gc()}else{c[j>>2]=q;c[q+24>>2]=f;c[q+12>>2]=q;c[q+8>>2]=q;break g}}else{h=f}}while(0);f=h+8|0;e=c[f>>2]|0;d=c[20272>>2]|0;if(h>>>0<d>>>0){gc()}if(e>>>0<d>>>0){gc()}else{c[e+12>>2]=q;c[f>>2]=q;c[q+8>>2]=e;c[q+12>>2]=h;c[q+24>>2]=0;break}}}else{H=c[20272>>2]|0;if((H|0)==0|s>>>0<H>>>0){c[20272>>2]=s}c[20704>>2]=s;c[20708>>2]=p;c[20716>>2]=0;c[20292>>2]=c[5182];c[20288>>2]=-1;d=0;do{H=d<<1;G=20296+(H<<2)|0;c[20296+(H+3<<2)>>2]=G;c[20296+(H+2<<2)>>2]=G;d=d+1|0}while((d|0)!=32);d=s+8|0;if((d&7|0)==0){d=0}else{d=0-d&7}H=p+ -40-d|0;c[20280>>2]=s+d;c[20268>>2]=H;c[s+(d+4)>>2]=H|1;c[s+(p+ -36)>>2]=40;c[20284>>2]=c[20744>>2]}}while(0);d=c[20268>>2]|0;if(d>>>0>a>>>0){G=d-a|0;c[20268>>2]=G;H=c[20280>>2]|0;c[20280>>2]=H+a;c[H+(a+4)>>2]=G|1;c[H+4>>2]=a|3;H=H+8|0;i=b;return H|0}}c[(xc()|0)>>2]=12;H=0;i=b;return H|0}function Sq(a){a=a|0;var b=0,d=0,e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0;b=i;if((a|0)==0){i=b;return}q=a+ -8|0;r=c[20272>>2]|0;if(q>>>0<r>>>0){gc()}o=c[a+ -4>>2]|0;n=o&3;if((n|0)==1){gc()}j=o&-8;h=a+(j+ -8)|0;do{if((o&1|0)==0){u=c[q>>2]|0;if((n|0)==0){i=b;return}q=-8-u|0;o=a+q|0;n=u+j|0;if(o>>>0<r>>>0){gc()}if((o|0)==(c[20276>>2]|0)){d=a+(j+ -4)|0;if((c[d>>2]&3|0)!=3){d=o;m=n;break}c[20264>>2]=n;c[d>>2]=c[d>>2]&-2;c[a+(q+4)>>2]=n|1;c[h>>2]=n;i=b;return}t=u>>>3;if(u>>>0<256){d=c[a+(q+8)>>2]|0;m=c[a+(q+12)>>2]|0;p=20296+(t<<1<<2)|0;if((d|0)!=(p|0)){if(d>>>0<r>>>0){gc()}if((c[d+12>>2]|0)!=(o|0)){gc()}}if((m|0)==(d|0)){c[5064]=c[5064]&~(1<<t);d=o;m=n;break}if((m|0)!=(p|0)){if(m>>>0<r>>>0){gc()}p=m+8|0;if((c[p>>2]|0)==(o|0)){s=p}else{gc()}}else{s=m+8|0}c[d+12>>2]=m;c[s>>2]=d;d=o;m=n;break}s=c[a+(q+24)>>2]|0;t=c[a+(q+12)>>2]|0;do{if((t|0)==(o|0)){u=a+(q+20)|0;t=c[u>>2]|0;if((t|0)==0){u=a+(q+16)|0;t=c[u>>2]|0;if((t|0)==0){p=0;break}}while(1){w=t+20|0;v=c[w>>2]|0;if((v|0)!=0){t=v;u=w;continue}v=t+16|0;w=c[v>>2]|0;if((w|0)==0){break}else{t=w;u=v}}if(u>>>0<r>>>0){gc()}else{c[u>>2]=0;p=t;break}}else{u=c[a+(q+8)>>2]|0;if(u>>>0<r>>>0){gc()}r=u+12|0;if((c[r>>2]|0)!=(o|0)){gc()}v=t+8|0;if((c[v>>2]|0)==(o|0)){c[r>>2]=t;c[v>>2]=u;p=t;break}else{gc()}}}while(0);if((s|0)!=0){t=c[a+(q+28)>>2]|0;r=20560+(t<<2)|0;if((o|0)==(c[r>>2]|0)){c[r>>2]=p;if((p|0)==0){c[20260>>2]=c[20260>>2]&~(1<<t);d=o;m=n;break}}else{if(s>>>0<(c[20272>>2]|0)>>>0){gc()}r=s+16|0;if((c[r>>2]|0)==(o|0)){c[r>>2]=p}else{c[s+20>>2]=p}if((p|0)==0){d=o;m=n;break}}if(p>>>0<(c[20272>>2]|0)>>>0){gc()}c[p+24>>2]=s;r=c[a+(q+16)>>2]|0;do{if((r|0)!=0){if(r>>>0<(c[20272>>2]|0)>>>0){gc()}else{c[p+16>>2]=r;c[r+24>>2]=p;break}}}while(0);q=c[a+(q+20)>>2]|0;if((q|0)!=0){if(q>>>0<(c[20272>>2]|0)>>>0){gc()}else{c[p+20>>2]=q;c[q+24>>2]=p;d=o;m=n;break}}else{d=o;m=n}}else{d=o;m=n}}else{d=q;m=j}}while(0);if(!(d>>>0<h>>>0)){gc()}n=a+(j+ -4)|0;o=c[n>>2]|0;if((o&1|0)==0){gc()}if((o&2|0)==0){if((h|0)==(c[20280>>2]|0)){w=(c[20268>>2]|0)+m|0;c[20268>>2]=w;c[20280>>2]=d;c[d+4>>2]=w|1;if((d|0)!=(c[20276>>2]|0)){i=b;return}c[20276>>2]=0;c[20264>>2]=0;i=b;return}if((h|0)==(c[20276>>2]|0)){w=(c[20264>>2]|0)+m|0;c[20264>>2]=w;c[20276>>2]=d;c[d+4>>2]=w|1;c[d+w>>2]=w;i=b;return}m=(o&-8)+m|0;n=o>>>3;do{if(!(o>>>0<256)){l=c[a+(j+16)>>2]|0;q=c[a+(j|4)>>2]|0;do{if((q|0)==(h|0)){o=a+(j+12)|0;n=c[o>>2]|0;if((n|0)==0){o=a+(j+8)|0;n=c[o>>2]|0;if((n|0)==0){k=0;break}}while(1){p=n+20|0;q=c[p>>2]|0;if((q|0)!=0){n=q;o=p;continue}p=n+16|0;q=c[p>>2]|0;if((q|0)==0){break}else{n=q;o=p}}if(o>>>0<(c[20272>>2]|0)>>>0){gc()}else{c[o>>2]=0;k=n;break}}else{o=c[a+j>>2]|0;if(o>>>0<(c[20272>>2]|0)>>>0){gc()}p=o+12|0;if((c[p>>2]|0)!=(h|0)){gc()}n=q+8|0;if((c[n>>2]|0)==(h|0)){c[p>>2]=q;c[n>>2]=o;k=q;break}else{gc()}}}while(0);if((l|0)!=0){n=c[a+(j+20)>>2]|0;o=20560+(n<<2)|0;if((h|0)==(c[o>>2]|0)){c[o>>2]=k;if((k|0)==0){c[20260>>2]=c[20260>>2]&~(1<<n);break}}else{if(l>>>0<(c[20272>>2]|0)>>>0){gc()}n=l+16|0;if((c[n>>2]|0)==(h|0)){c[n>>2]=k}else{c[l+20>>2]=k}if((k|0)==0){break}}if(k>>>0<(c[20272>>2]|0)>>>0){gc()}c[k+24>>2]=l;h=c[a+(j+8)>>2]|0;do{if((h|0)!=0){if(h>>>0<(c[20272>>2]|0)>>>0){gc()}else{c[k+16>>2]=h;c[h+24>>2]=k;break}}}while(0);h=c[a+(j+12)>>2]|0;if((h|0)!=0){if(h>>>0<(c[20272>>2]|0)>>>0){gc()}else{c[k+20>>2]=h;c[h+24>>2]=k;break}}}}else{k=c[a+j>>2]|0;a=c[a+(j|4)>>2]|0;j=20296+(n<<1<<2)|0;if((k|0)!=(j|0)){if(k>>>0<(c[20272>>2]|0)>>>0){gc()}if((c[k+12>>2]|0)!=(h|0)){gc()}}if((a|0)==(k|0)){c[5064]=c[5064]&~(1<<n);break}if((a|0)!=(j|0)){if(a>>>0<(c[20272>>2]|0)>>>0){gc()}j=a+8|0;if((c[j>>2]|0)==(h|0)){l=j}else{gc()}}else{l=a+8|0}c[k+12>>2]=a;c[l>>2]=k}}while(0);c[d+4>>2]=m|1;c[d+m>>2]=m;if((d|0)==(c[20276>>2]|0)){c[20264>>2]=m;i=b;return}}else{c[n>>2]=o&-2;c[d+4>>2]=m|1;c[d+m>>2]=m}h=m>>>3;if(m>>>0<256){a=h<<1;e=20296+(a<<2)|0;j=c[5064]|0;h=1<<h;if((j&h|0)!=0){h=20296+(a+2<<2)|0;a=c[h>>2]|0;if(a>>>0<(c[20272>>2]|0)>>>0){gc()}else{f=h;g=a}}else{c[5064]=j|h;f=20296+(a+2<<2)|0;g=e}c[f>>2]=d;c[g+12>>2]=d;c[d+8>>2]=g;c[d+12>>2]=e;i=b;return}f=m>>>8;if((f|0)!=0){if(m>>>0>16777215){f=31}else{v=(f+1048320|0)>>>16&8;w=f<<v;u=(w+520192|0)>>>16&4;w=w<<u;f=(w+245760|0)>>>16&2;f=14-(u|v|f)+(w<<f>>>15)|0;f=m>>>(f+7|0)&1|f<<1}}else{f=0}g=20560+(f<<2)|0;c[d+28>>2]=f;c[d+20>>2]=0;c[d+16>>2]=0;a=c[20260>>2]|0;h=1<<f;a:do{if((a&h|0)!=0){g=c[g>>2]|0;if((f|0)==31){f=0}else{f=25-(f>>>1)|0}b:do{if((c[g+4>>2]&-8|0)!=(m|0)){f=m<<f;a=g;while(1){h=a+(f>>>31<<2)+16|0;g=c[h>>2]|0;if((g|0)==0){break}if((c[g+4>>2]&-8|0)==(m|0)){e=g;break b}else{f=f<<1;a=g}}if(h>>>0<(c[20272>>2]|0)>>>0){gc()}else{c[h>>2]=d;c[d+24>>2]=a;c[d+12>>2]=d;c[d+8>>2]=d;break a}}else{e=g}}while(0);g=e+8|0;f=c[g>>2]|0;h=c[20272>>2]|0;if(e>>>0<h>>>0){gc()}if(f>>>0<h>>>0){gc()}else{c[f+12>>2]=d;c[g>>2]=d;c[d+8>>2]=f;c[d+12>>2]=e;c[d+24>>2]=0;break}}else{c[20260>>2]=a|h;c[g>>2]=d;c[d+24>>2]=g;c[d+12>>2]=d;c[d+8>>2]=d}}while(0);w=(c[20288>>2]|0)+ -1|0;c[20288>>2]=w;if((w|0)==0){d=20712|0}else{i=b;return}while(1){d=c[d>>2]|0;if((d|0)==0){break}else{d=d+8|0}}c[20288>>2]=-1;i=b;return}function Tq(a,b){a=a|0;b=b|0;var d=0,e=0,f=0;d=i;do{if((a|0)!=0){if(b>>>0>4294967231){c[(xc()|0)>>2]=12;e=0;break}if(b>>>0<11){e=16}else{e=b+11&-8}e=Uq(a+ -8|0,e)|0;if((e|0)!=0){e=e+8|0;break}e=Rq(b)|0;if((e|0)==0){e=0}else{f=c[a+ -4>>2]|0;f=(f&-8)-((f&3|0)==0?8:4)|0;ur(e|0,a|0,(f>>>0<b>>>0?f:b)|0)|0;Sq(a)}}else{e=Rq(b)|0}}while(0);i=d;return e|0}function Uq(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0;d=i;e=a+4|0;g=c[e>>2]|0;j=g&-8;f=a+j|0;l=c[20272>>2]|0;if(a>>>0<l>>>0){gc()}n=g&3;if(!((n|0)!=1&a>>>0<f>>>0)){gc()}h=a+(j|4)|0;o=c[h>>2]|0;if((o&1|0)==0){gc()}if((n|0)==0){if(b>>>0<256){q=0;i=d;return q|0}if(!(j>>>0<(b+4|0)>>>0)?!((j-b|0)>>>0>c[20736>>2]<<1>>>0):0){q=a;i=d;return q|0}q=0;i=d;return q|0}if(!(j>>>0<b>>>0)){f=j-b|0;if(!(f>>>0>15)){q=a;i=d;return q|0}c[e>>2]=g&1|b|2;c[a+(b+4)>>2]=f|3;c[h>>2]=c[h>>2]|1;Vq(a+b|0,f);q=a;i=d;return q|0}if((f|0)==(c[20280>>2]|0)){f=(c[20268>>2]|0)+j|0;if(!(f>>>0>b>>>0)){q=0;i=d;return q|0}q=f-b|0;c[e>>2]=g&1|b|2;c[a+(b+4)>>2]=q|1;c[20280>>2]=a+b;c[20268>>2]=q;q=a;i=d;return q|0}if((f|0)==(c[20276>>2]|0)){h=(c[20264>>2]|0)+j|0;if(h>>>0<b>>>0){q=0;i=d;return q|0}f=h-b|0;if(f>>>0>15){c[e>>2]=g&1|b|2;c[a+(b+4)>>2]=f|1;c[a+h>>2]=f;q=a+(h+4)|0;c[q>>2]=c[q>>2]&-2;b=a+b|0}else{c[e>>2]=g&1|h|2;b=a+(h+4)|0;c[b>>2]=c[b>>2]|1;b=0;f=0}c[20264>>2]=f;c[20276>>2]=b;q=a;i=d;return q|0}if((o&2|0)!=0){q=0;i=d;return q|0}h=(o&-8)+j|0;if(h>>>0<b>>>0){q=0;i=d;return q|0}g=h-b|0;n=o>>>3;do{if(!(o>>>0<256)){m=c[a+(j+24)>>2]|0;o=c[a+(j+12)>>2]|0;do{if((o|0)==(f|0)){o=a+(j+20)|0;n=c[o>>2]|0;if((n|0)==0){o=a+(j+16)|0;n=c[o>>2]|0;if((n|0)==0){k=0;break}}while(1){q=n+20|0;p=c[q>>2]|0;if((p|0)!=0){n=p;o=q;continue}q=n+16|0;p=c[q>>2]|0;if((p|0)==0){break}else{n=p;o=q}}if(o>>>0<l>>>0){gc()}else{c[o>>2]=0;k=n;break}}else{n=c[a+(j+8)>>2]|0;if(n>>>0<l>>>0){gc()}p=n+12|0;if((c[p>>2]|0)!=(f|0)){gc()}l=o+8|0;if((c[l>>2]|0)==(f|0)){c[p>>2]=o;c[l>>2]=n;k=o;break}else{gc()}}}while(0);if((m|0)!=0){l=c[a+(j+28)>>2]|0;n=20560+(l<<2)|0;if((f|0)==(c[n>>2]|0)){c[n>>2]=k;if((k|0)==0){c[20260>>2]=c[20260>>2]&~(1<<l);break}}else{if(m>>>0<(c[20272>>2]|0)>>>0){gc()}l=m+16|0;if((c[l>>2]|0)==(f|0)){c[l>>2]=k}else{c[m+20>>2]=k}if((k|0)==0){break}}if(k>>>0<(c[20272>>2]|0)>>>0){gc()}c[k+24>>2]=m;f=c[a+(j+16)>>2]|0;do{if((f|0)!=0){if(f>>>0<(c[20272>>2]|0)>>>0){gc()}else{c[k+16>>2]=f;c[f+24>>2]=k;break}}}while(0);f=c[a+(j+20)>>2]|0;if((f|0)!=0){if(f>>>0<(c[20272>>2]|0)>>>0){gc()}else{c[k+20>>2]=f;c[f+24>>2]=k;break}}}}else{k=c[a+(j+8)>>2]|0;j=c[a+(j+12)>>2]|0;o=20296+(n<<1<<2)|0;if((k|0)!=(o|0)){if(k>>>0<l>>>0){gc()}if((c[k+12>>2]|0)!=(f|0)){gc()}}if((j|0)==(k|0)){c[5064]=c[5064]&~(1<<n);break}if((j|0)!=(o|0)){if(j>>>0<l>>>0){gc()}l=j+8|0;if((c[l>>2]|0)==(f|0)){m=l}else{gc()}}else{m=j+8|0}c[k+12>>2]=j;c[m>>2]=k}}while(0);if(g>>>0<16){c[e>>2]=h|c[e>>2]&1|2;q=a+(h|4)|0;c[q>>2]=c[q>>2]|1;q=a;i=d;return q|0}else{c[e>>2]=c[e>>2]&1|b|2;c[a+(b+4)>>2]=g|3;q=a+(h|4)|0;c[q>>2]=c[q>>2]|1;Vq(a+b|0,g);q=a;i=d;return q|0}return 0}function Vq(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0;d=i;h=a+b|0;l=c[a+4>>2]|0;do{if((l&1|0)==0){p=c[a>>2]|0;if((l&3|0)==0){i=d;return}l=a+(0-p)|0;m=p+b|0;q=c[20272>>2]|0;if(l>>>0<q>>>0){gc()}if((l|0)==(c[20276>>2]|0)){e=a+(b+4)|0;if((c[e>>2]&3|0)!=3){e=l;n=m;break}c[20264>>2]=m;c[e>>2]=c[e>>2]&-2;c[a+(4-p)>>2]=m|1;c[h>>2]=m;i=d;return}s=p>>>3;if(p>>>0<256){e=c[a+(8-p)>>2]|0;n=c[a+(12-p)>>2]|0;o=20296+(s<<1<<2)|0;if((e|0)!=(o|0)){if(e>>>0<q>>>0){gc()}if((c[e+12>>2]|0)!=(l|0)){gc()}}if((n|0)==(e|0)){c[5064]=c[5064]&~(1<<s);e=l;n=m;break}if((n|0)!=(o|0)){if(n>>>0<q>>>0){gc()}o=n+8|0;if((c[o>>2]|0)==(l|0)){r=o}else{gc()}}else{r=n+8|0}c[e+12>>2]=n;c[r>>2]=e;e=l;n=m;break}r=c[a+(24-p)>>2]|0;t=c[a+(12-p)>>2]|0;do{if((t|0)==(l|0)){u=16-p|0;t=a+(u+4)|0;s=c[t>>2]|0;if((s|0)==0){t=a+u|0;s=c[t>>2]|0;if((s|0)==0){o=0;break}}while(1){u=s+20|0;v=c[u>>2]|0;if((v|0)!=0){s=v;t=u;continue}v=s+16|0;u=c[v>>2]|0;if((u|0)==0){break}else{s=u;t=v}}if(t>>>0<q>>>0){gc()}else{c[t>>2]=0;o=s;break}}else{s=c[a+(8-p)>>2]|0;if(s>>>0<q>>>0){gc()}u=s+12|0;if((c[u>>2]|0)!=(l|0)){gc()}q=t+8|0;if((c[q>>2]|0)==(l|0)){c[u>>2]=t;c[q>>2]=s;o=t;break}else{gc()}}}while(0);if((r|0)!=0){q=c[a+(28-p)>>2]|0;s=20560+(q<<2)|0;if((l|0)==(c[s>>2]|0)){c[s>>2]=o;if((o|0)==0){c[20260>>2]=c[20260>>2]&~(1<<q);e=l;n=m;break}}else{if(r>>>0<(c[20272>>2]|0)>>>0){gc()}q=r+16|0;if((c[q>>2]|0)==(l|0)){c[q>>2]=o}else{c[r+20>>2]=o}if((o|0)==0){e=l;n=m;break}}if(o>>>0<(c[20272>>2]|0)>>>0){gc()}c[o+24>>2]=r;p=16-p|0;q=c[a+p>>2]|0;do{if((q|0)!=0){if(q>>>0<(c[20272>>2]|0)>>>0){gc()}else{c[o+16>>2]=q;c[q+24>>2]=o;break}}}while(0);p=c[a+(p+4)>>2]|0;if((p|0)!=0){if(p>>>0<(c[20272>>2]|0)>>>0){gc()}else{c[o+20>>2]=p;c[p+24>>2]=o;e=l;n=m;break}}else{e=l;n=m}}else{e=l;n=m}}else{e=a;n=b}}while(0);l=c[20272>>2]|0;if(h>>>0<l>>>0){gc()}m=a+(b+4)|0;o=c[m>>2]|0;if((o&2|0)==0){if((h|0)==(c[20280>>2]|0)){v=(c[20268>>2]|0)+n|0;c[20268>>2]=v;c[20280>>2]=e;c[e+4>>2]=v|1;if((e|0)!=(c[20276>>2]|0)){i=d;return}c[20276>>2]=0;c[20264>>2]=0;i=d;return}if((h|0)==(c[20276>>2]|0)){v=(c[20264>>2]|0)+n|0;c[20264>>2]=v;c[20276>>2]=e;c[e+4>>2]=v|1;c[e+v>>2]=v;i=d;return}n=(o&-8)+n|0;m=o>>>3;do{if(!(o>>>0<256)){k=c[a+(b+24)>>2]|0;m=c[a+(b+12)>>2]|0;do{if((m|0)==(h|0)){o=a+(b+20)|0;m=c[o>>2]|0;if((m|0)==0){o=a+(b+16)|0;m=c[o>>2]|0;if((m|0)==0){j=0;break}}while(1){q=m+20|0;p=c[q>>2]|0;if((p|0)!=0){m=p;o=q;continue}p=m+16|0;q=c[p>>2]|0;if((q|0)==0){break}else{m=q;o=p}}if(o>>>0<l>>>0){gc()}else{c[o>>2]=0;j=m;break}}else{o=c[a+(b+8)>>2]|0;if(o>>>0<l>>>0){gc()}l=o+12|0;if((c[l>>2]|0)!=(h|0)){gc()}p=m+8|0;if((c[p>>2]|0)==(h|0)){c[l>>2]=m;c[p>>2]=o;j=m;break}else{gc()}}}while(0);if((k|0)!=0){l=c[a+(b+28)>>2]|0;m=20560+(l<<2)|0;if((h|0)==(c[m>>2]|0)){c[m>>2]=j;if((j|0)==0){c[20260>>2]=c[20260>>2]&~(1<<l);break}}else{if(k>>>0<(c[20272>>2]|0)>>>0){gc()}l=k+16|0;if((c[l>>2]|0)==(h|0)){c[l>>2]=j}else{c[k+20>>2]=j}if((j|0)==0){break}}if(j>>>0<(c[20272>>2]|0)>>>0){gc()}c[j+24>>2]=k;h=c[a+(b+16)>>2]|0;do{if((h|0)!=0){if(h>>>0<(c[20272>>2]|0)>>>0){gc()}else{c[j+16>>2]=h;c[h+24>>2]=j;break}}}while(0);h=c[a+(b+20)>>2]|0;if((h|0)!=0){if(h>>>0<(c[20272>>2]|0)>>>0){gc()}else{c[j+20>>2]=h;c[h+24>>2]=j;break}}}}else{j=c[a+(b+8)>>2]|0;a=c[a+(b+12)>>2]|0;b=20296+(m<<1<<2)|0;if((j|0)!=(b|0)){if(j>>>0<l>>>0){gc()}if((c[j+12>>2]|0)!=(h|0)){gc()}}if((a|0)==(j|0)){c[5064]=c[5064]&~(1<<m);break}if((a|0)!=(b|0)){if(a>>>0<l>>>0){gc()}b=a+8|0;if((c[b>>2]|0)==(h|0)){k=b}else{gc()}}else{k=a+8|0}c[j+12>>2]=a;c[k>>2]=j}}while(0);c[e+4>>2]=n|1;c[e+n>>2]=n;if((e|0)==(c[20276>>2]|0)){c[20264>>2]=n;i=d;return}}else{c[m>>2]=o&-2;c[e+4>>2]=n|1;c[e+n>>2]=n}a=n>>>3;if(n>>>0<256){b=a<<1;h=20296+(b<<2)|0;j=c[5064]|0;a=1<<a;if((j&a|0)!=0){b=20296+(b+2<<2)|0;a=c[b>>2]|0;if(a>>>0<(c[20272>>2]|0)>>>0){gc()}else{g=b;f=a}}else{c[5064]=j|a;g=20296+(b+2<<2)|0;f=h}c[g>>2]=e;c[f+12>>2]=e;c[e+8>>2]=f;c[e+12>>2]=h;i=d;return}f=n>>>8;if((f|0)!=0){if(n>>>0>16777215){f=31}else{u=(f+1048320|0)>>>16&8;v=f<<u;t=(v+520192|0)>>>16&4;v=v<<t;f=(v+245760|0)>>>16&2;f=14-(t|u|f)+(v<<f>>>15)|0;f=n>>>(f+7|0)&1|f<<1}}else{f=0}a=20560+(f<<2)|0;c[e+28>>2]=f;c[e+20>>2]=0;c[e+16>>2]=0;h=c[20260>>2]|0;g=1<<f;if((h&g|0)==0){c[20260>>2]=h|g;c[a>>2]=e;c[e+24>>2]=a;c[e+12>>2]=e;c[e+8>>2]=e;i=d;return}g=c[a>>2]|0;if((f|0)==31){f=0}else{f=25-(f>>>1)|0}a:do{if((c[g+4>>2]&-8|0)!=(n|0)){f=n<<f;a=g;while(1){h=a+(f>>>31<<2)+16|0;g=c[h>>2]|0;if((g|0)==0){break}if((c[g+4>>2]&-8|0)==(n|0)){break a}else{f=f<<1;a=g}}if(h>>>0<(c[20272>>2]|0)>>>0){gc()}c[h>>2]=e;c[e+24>>2]=a;c[e+12>>2]=e;c[e+8>>2]=e;i=d;return}}while(0);f=g+8|0;a=c[f>>2]|0;h=c[20272>>2]|0;if(g>>>0<h>>>0){gc()}if(a>>>0<h>>>0){gc()}c[a+12>>2]=e;c[f>>2]=e;c[e+8>>2]=a;c[e+12>>2]=g;c[e+24>>2]=0;i=d;return}function Wq(a){a=a|0;var b=0,d=0;b=i;a=(a|0)==0?1:a;while(1){d=Rq(a)|0;if((d|0)!=0){a=6;break}d=c[5188]|0;c[5188]=d+0;if((d|0)==0){a=5;break}Tc[d&0]()}if((a|0)==5){d=Nb(4)|0;c[d>>2]=20768;Ac(d|0,20816,138)}else if((a|0)==6){i=b;return d|0}return 0}function Xq(a){a=a|0;var b=0;b=i;a=Wq(a)|0;i=b;return a|0}function Yq(a){a=a|0;var b=0;b=i;if((a|0)!=0){Sq(a)}i=b;return}function Zq(a){a=a|0;var b=0;b=i;Yq(a);i=b;return}function _q(a){a=a|0;var b=0;b=i;bb(a|0);Yq(a);i=b;return}function $q(a){a=a|0;var b=0;b=i;bb(a|0);i=b;return}function ar(a){a=a|0;return 20784}function br(){var a=0;a=Nb(4)|0;c[a>>2]=20768;Ac(a|0,20816,138)}function cr(b,e,f){b=b|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0.0,s=0,t=0,u=0,v=0,w=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0.0,J=0,K=0.0,L=0.0,M=0.0,N=0.0;g=i;i=i+512|0;k=g;if((e|0)==2){e=53;h=-1074}else if((e|0)==0){e=24;h=-149}else if((e|0)==1){e=53;h=-1074}else{L=0.0;i=g;return+L}n=b+4|0;o=b+100|0;do{j=c[n>>2]|0;if(j>>>0<(c[o>>2]|0)>>>0){c[n>>2]=j+1;z=d[j]|0}else{z=fr(b)|0}}while((hc(z|0)|0)!=0);do{if((z|0)==43|(z|0)==45){j=1-(((z|0)==45)<<1)|0;m=c[n>>2]|0;if(m>>>0<(c[o>>2]|0)>>>0){c[n>>2]=m+1;z=d[m]|0;break}else{z=fr(b)|0;break}}else{j=1}}while(0);m=0;do{if((z|32|0)!=(a[20832+m|0]|0)){break}do{if(m>>>0<7){p=c[n>>2]|0;if(p>>>0<(c[o>>2]|0)>>>0){c[n>>2]=p+1;z=d[p]|0;break}else{z=fr(b)|0;break}}}while(0);m=m+1|0}while(m>>>0<8);do{if((m|0)==3){q=23}else if((m|0)!=8){p=(f|0)==0;if(!(m>>>0<4|p)){if((m|0)==8){break}else{q=23;break}}a:do{if((m|0)==0){m=0;do{if((z|32|0)!=(a[20848+m|0]|0)){break a}do{if(m>>>0<2){s=c[n>>2]|0;if(s>>>0<(c[o>>2]|0)>>>0){c[n>>2]=s+1;z=d[s]|0;break}else{z=fr(b)|0;break}}}while(0);m=m+1|0}while(m>>>0<3)}}while(0);if((m|0)==3){e=c[n>>2]|0;if(e>>>0<(c[o>>2]|0)>>>0){c[n>>2]=e+1;e=d[e]|0}else{e=fr(b)|0}if((e|0)==40){e=1}else{if((c[o>>2]|0)==0){L=x;i=g;return+L}c[n>>2]=(c[n>>2]|0)+ -1;L=x;i=g;return+L}while(1){h=c[n>>2]|0;if(h>>>0<(c[o>>2]|0)>>>0){c[n>>2]=h+1;h=d[h]|0}else{h=fr(b)|0}if(!((h+ -48|0)>>>0<10|(h+ -65|0)>>>0<26)?!((h+ -97|0)>>>0<26|(h|0)==95):0){break}e=e+1|0}if((h|0)==41){L=x;i=g;return+L}h=(c[o>>2]|0)==0;if(!h){c[n>>2]=(c[n>>2]|0)+ -1}if(p){c[(xc()|0)>>2]=22;er(b,0);L=0.0;i=g;return+L}if((e|0)==0|h){L=x;i=g;return+L}while(1){e=e+ -1|0;c[n>>2]=(c[n>>2]|0)+ -1;if((e|0)==0){r=x;break}}i=g;return+r}else if((m|0)==0){do{if((z|0)==48){m=c[n>>2]|0;if(m>>>0<(c[o>>2]|0)>>>0){c[n>>2]=m+1;m=d[m]|0}else{m=fr(b)|0}if((m|32|0)!=120){if((c[o>>2]|0)==0){z=48;break}c[n>>2]=(c[n>>2]|0)+ -1;z=48;break}k=c[n>>2]|0;if(k>>>0<(c[o>>2]|0)>>>0){c[n>>2]=k+1;A=d[k]|0;w=0}else{A=fr(b)|0;w=0}while(1){if((A|0)==46){q=70;break}else if((A|0)!=48){k=0;m=0;s=0;t=0;v=0;z=0;H=1.0;u=0;r=0.0;break}k=c[n>>2]|0;if(k>>>0<(c[o>>2]|0)>>>0){c[n>>2]=k+1;A=d[k]|0;w=1;continue}else{A=fr(b)|0;w=1;continue}}b:do{if((q|0)==70){k=c[n>>2]|0;if(k>>>0<(c[o>>2]|0)>>>0){c[n>>2]=k+1;A=d[k]|0}else{A=fr(b)|0}if((A|0)==48){s=-1;t=-1;while(1){k=c[n>>2]|0;if(k>>>0<(c[o>>2]|0)>>>0){c[n>>2]=k+1;A=d[k]|0}else{A=fr(b)|0}if((A|0)!=48){k=0;m=0;w=1;v=1;z=0;H=1.0;u=0;r=0.0;break b}J=qr(s|0,t|0,-1,-1)|0;s=J;t=I}}else{k=0;m=0;s=0;t=0;v=1;z=0;H=1.0;u=0;r=0.0}}}while(0);c:while(1){B=A+ -48|0;do{if(!(B>>>0<10)){C=A|32;D=(A|0)==46;if(!((C+ -97|0)>>>0<6|D)){break c}if(D){if((v|0)==0){s=m;t=k;v=1;break}else{A=46;break c}}else{B=(A|0)>57?C+ -87|0:B;q=84;break}}else{q=84}}while(0);if((q|0)==84){q=0;do{if(!((k|0)<0|(k|0)==0&m>>>0<8)){if((k|0)<0|(k|0)==0&m>>>0<14){L=H*.0625;K=L;r=r+L*+(B|0);break}if((B|0)!=0&(z|0)==0){z=1;K=H;r=r+H*.5}else{K=H}}else{K=H;u=B+(u<<4)|0}}while(0);m=qr(m|0,k|0,1,0)|0;k=I;w=1;H=K}A=c[n>>2]|0;if(A>>>0<(c[o>>2]|0)>>>0){c[n>>2]=A+1;A=d[A]|0;continue}else{A=fr(b)|0;continue}}if((w|0)==0){e=(c[o>>2]|0)==0;if(!e){c[n>>2]=(c[n>>2]|0)+ -1}if(!p){if(!e?(l=c[n>>2]|0,c[n>>2]=l+ -1,(v|0)!=0):0){c[n>>2]=l+ -2}}else{er(b,0)}L=+(j|0)*0.0;i=g;return+L}q=(v|0)==0;l=q?m:s;q=q?k:t;if((k|0)<0|(k|0)==0&m>>>0<8){do{u=u<<4;m=qr(m|0,k|0,1,0)|0;k=I}while((k|0)<0|(k|0)==0&m>>>0<8)}do{if((A|32|0)==112){m=dr(b,f)|0;k=I;if((m|0)==0&(k|0)==-2147483648){if(p){er(b,0);L=0.0;i=g;return+L}else{if((c[o>>2]|0)==0){m=0;k=0;break}c[n>>2]=(c[n>>2]|0)+ -1;m=0;k=0;break}}}else{if((c[o>>2]|0)==0){m=0;k=0}else{c[n>>2]=(c[n>>2]|0)+ -1;m=0;k=0}}}while(0);l=yr(l|0,q|0,2)|0;l=qr(l|0,I|0,-32,-1)|0;k=qr(l|0,I|0,m|0,k|0)|0;l=I;if((u|0)==0){L=+(j|0)*0.0;i=g;return+L}if((l|0)>0|(l|0)==0&k>>>0>(0-h|0)>>>0){c[(xc()|0)>>2]=34;L=+(j|0)*1.7976931348623157e+308*1.7976931348623157e+308;i=g;return+L}J=h+ -106|0;G=((J|0)<0)<<31>>31;if((l|0)<(G|0)|(l|0)==(G|0)&k>>>0<J>>>0){c[(xc()|0)>>2]=34;L=+(j|0)*2.2250738585072014e-308*2.2250738585072014e-308;i=g;return+L}if((u|0)>-1){do{u=u<<1;if(!(r>=.5)){H=r}else{H=r+-1.0;u=u|1}r=r+H;k=qr(k|0,l|0,-1,-1)|0;l=I}while((u|0)>-1)}h=pr(32,0,h|0,((h|0)<0)<<31>>31|0)|0;h=qr(k|0,l|0,h|0,I|0)|0;J=I;if(0>(J|0)|0==(J|0)&e>>>0>h>>>0){e=(h|0)<0?0:h}if((e|0)<53){H=+(j|0);K=+yc(+(+gr(1.0,84-e|0)),+H);if((e|0)<32&r!=0.0){J=u&1;u=(J^1)+u|0;r=(J|0)==0?0.0:r}}else{H=+(j|0);K=0.0}r=H*r+(K+H*+(u>>>0))-K;if(!(r!=0.0)){c[(xc()|0)>>2]=34}L=+hr(r,k);i=g;return+L}}while(0);m=h+e|0;l=0-m|0;A=0;while(1){if((z|0)==46){q=139;break}else if((z|0)!=48){E=0;C=0;w=0;break}s=c[n>>2]|0;if(s>>>0<(c[o>>2]|0)>>>0){c[n>>2]=s+1;z=d[s]|0;A=1;continue}else{z=fr(b)|0;A=1;continue}}d:do{if((q|0)==139){s=c[n>>2]|0;if(s>>>0<(c[o>>2]|0)>>>0){c[n>>2]=s+1;z=d[s]|0}else{z=fr(b)|0}if((z|0)==48){E=-1;C=-1;while(1){s=c[n>>2]|0;if(s>>>0<(c[o>>2]|0)>>>0){c[n>>2]=s+1;z=d[s]|0}else{z=fr(b)|0}if((z|0)!=48){A=1;w=1;break d}J=qr(E|0,C|0,-1,-1)|0;E=J;C=I}}else{E=0;C=0;w=1}}}while(0);c[k>>2]=0;F=z+ -48|0;G=(z|0)==46;e:do{if(F>>>0<10|G){s=k+496|0;D=0;B=0;v=0;u=0;t=0;while(1){do{if(G){if((w|0)==0){E=D;C=B;w=1}else{break e}}else{G=qr(D|0,B|0,1,0)|0;B=I;J=(z|0)!=48;if((u|0)>=125){if(!J){D=G;break}c[s>>2]=c[s>>2]|1;D=G;break}A=k+(u<<2)|0;if((v|0)!=0){F=z+ -48+((c[A>>2]|0)*10|0)|0}c[A>>2]=F;v=v+1|0;z=(v|0)==9;D=G;A=1;v=z?0:v;u=(z&1)+u|0;t=J?G:t}}while(0);z=c[n>>2]|0;if(z>>>0<(c[o>>2]|0)>>>0){c[n>>2]=z+1;z=d[z]|0}else{z=fr(b)|0}F=z+ -48|0;G=(z|0)==46;if(!(F>>>0<10|G)){q=162;break}}}else{D=0;B=0;v=0;u=0;t=0;q=162}}while(0);if((q|0)==162){q=(w|0)==0;E=q?D:E;C=q?B:C}q=(A|0)!=0;if(q?(z|32|0)==101:0){s=dr(b,f)|0;f=I;do{if((s|0)==0&(f|0)==-2147483648){if(p){er(b,0);L=0.0;i=g;return+L}else{if((c[o>>2]|0)==0){s=0;f=0;break}c[n>>2]=(c[n>>2]|0)+ -1;s=0;f=0;break}}}while(0);E=qr(s|0,f|0,E|0,C|0)|0;C=I}else{if((z|0)>-1?(c[o>>2]|0)!=0:0){c[n>>2]=(c[n>>2]|0)+ -1}}if(!q){c[(xc()|0)>>2]=22;er(b,0);L=0.0;i=g;return+L}b=c[k>>2]|0;if((b|0)==0){L=+(j|0)*0.0;i=g;return+L}do{if((E|0)==(D|0)&(C|0)==(B|0)&((B|0)<0|(B|0)==0&D>>>0<10)){if(!(e>>>0>30)?(b>>>e|0)!=0:0){break}L=+(j|0)*+(b>>>0);i=g;return+L}}while(0);J=(h|0)/-2|0;G=((J|0)<0)<<31>>31;if((C|0)>(G|0)|(C|0)==(G|0)&E>>>0>J>>>0){c[(xc()|0)>>2]=34;L=+(j|0)*1.7976931348623157e+308*1.7976931348623157e+308;i=g;return+L}J=h+ -106|0;G=((J|0)<0)<<31>>31;if((C|0)<(G|0)|(C|0)==(G|0)&E>>>0<J>>>0){c[(xc()|0)>>2]=34;L=+(j|0)*2.2250738585072014e-308*2.2250738585072014e-308;i=g;return+L}if((v|0)!=0){if((v|0)<9){b=k+(u<<2)|0;n=c[b>>2]|0;do{n=n*10|0;v=v+1|0}while((v|0)!=9);c[b>>2]=n}u=u+1|0}do{if((t|0)<9?(t|0)<=(E|0)&(E|0)<18:0){if((E|0)==9){L=+(j|0)*+((c[k>>2]|0)>>>0);i=g;return+L}if((E|0)<9){L=+(j|0)*+((c[k>>2]|0)>>>0)/+(c[20864+(8-E<<2)>>2]|0);i=g;return+L}b=e+27+(ea(E,-3)|0)|0;n=c[k>>2]|0;if((b|0)<=30?(n>>>b|0)!=0:0){break}L=+(j|0)*+(n>>>0)*+(c[20864+(E+ -10<<2)>>2]|0);i=g;return+L}}while(0);b=(E|0)%9|0;if((b|0)==0){n=0;o=0;b=E}else{b=(E|0)>-1?b:b+9|0;f=c[20864+(8-b<<2)>>2]|0;if((u|0)!=0){o=1e9/(f|0)|0;n=0;s=0;q=0;while(1){G=k+(q<<2)|0;p=c[G>>2]|0;J=((p>>>0)/(f>>>0)|0)+s|0;c[G>>2]=J;s=ea((p>>>0)%(f>>>0)|0,o)|0;p=q+1|0;if((q|0)==(n|0)&(J|0)==0){n=p&127;E=E+ -9|0}if((p|0)==(u|0)){break}else{q=p}}if((s|0)!=0){c[k+(u<<2)>>2]=s;u=u+1|0}}else{n=0;u=0}o=0;b=9-b+E|0}f:while(1){f=k+(n<<2)|0;if((b|0)<18){do{q=0;f=u+127|0;while(1){f=f&127;p=k+(f<<2)|0;s=yr(c[p>>2]|0,0,29)|0;s=qr(s|0,I|0,q|0,0)|0;q=I;if(q>>>0>0|(q|0)==0&s>>>0>1e9){J=Hr(s|0,q|0,1e9,0)|0;s=Ir(s|0,q|0,1e9,0)|0;q=J}else{q=0}c[p>>2]=s;p=(f|0)==(n|0);if(!((f|0)!=(u+127&127|0)|p)){u=(s|0)==0?f:u}if(p){break}else{f=f+ -1|0}}o=o+ -29|0}while((q|0)==0)}else{if((b|0)!=18){break}do{if(!((c[f>>2]|0)>>>0<9007199)){b=18;break f}q=0;p=u+127|0;while(1){p=p&127;s=k+(p<<2)|0;t=yr(c[s>>2]|0,0,29)|0;t=qr(t|0,I|0,q|0,0)|0;q=I;if(q>>>0>0|(q|0)==0&t>>>0>1e9){J=Hr(t|0,q|0,1e9,0)|0;t=Ir(t|0,q|0,1e9,0)|0;q=J}else{q=0}c[s>>2]=t;s=(p|0)==(n|0);if(!((p|0)!=(u+127&127|0)|s)){u=(t|0)==0?p:u}if(s){break}else{p=p+ -1|0}}o=o+ -29|0}while((q|0)==0)}n=n+127&127;if((n|0)==(u|0)){J=u+127&127;u=k+((u+126&127)<<2)|0;c[u>>2]=c[u>>2]|c[k+(J<<2)>>2];u=J}c[k+(n<<2)>>2]=q;b=b+9|0}g:while(1){f=u+1&127;p=k+((u+127&127)<<2)|0;while(1){s=(b|0)==18;q=(b|0)>27?9:1;while(1){t=0;while(1){v=t+n&127;if((v|0)==(u|0)){t=2;break}z=c[k+(v<<2)>>2]|0;v=c[20856+(t<<2)>>2]|0;if(z>>>0<v>>>0){t=2;break}w=t+1|0;if(z>>>0>v>>>0){break}if((w|0)<2){t=w}else{t=w;break}}if((t|0)==2&s){break g}o=q+o|0;if((n|0)==(u|0)){n=u}else{break}}v=(1<<q)+ -1|0;w=1e9>>>q;s=n;t=0;do{G=k+(n<<2)|0;J=c[G>>2]|0;z=(J>>>q)+t|0;c[G>>2]=z;t=ea(J&v,w)|0;z=(n|0)==(s|0)&(z|0)==0;n=n+1&127;b=z?b+ -9|0:b;s=z?n:s}while((n|0)!=(u|0));if((t|0)==0){n=s;continue}if((f|0)!=(s|0)){break}c[p>>2]=c[p>>2]|1;n=s}c[k+(u<<2)>>2]=t;n=s;u=f}b=n&127;if((b|0)==(u|0)){c[k+(f+ -1<<2)>>2]=0;u=f}H=+((c[k+(b<<2)>>2]|0)>>>0);b=n+1&127;if((b|0)==(u|0)){u=u+1&127;c[k+(u+ -1<<2)>>2]=0}r=+(j|0);K=r*(H*1.0e9+ +((c[k+(b<<2)>>2]|0)>>>0));j=o+53|0;h=j-h|0;if((h|0)<(e|0)){e=(h|0)<0?0:h;b=1}else{b=0}if((e|0)<53){N=+yc(+(+gr(1.0,105-e|0)),+K);M=+Lb(+K,+(+gr(1.0,53-e|0)));H=N;L=M;K=N+(K-M)}else{H=0.0;L=0.0}f=n+2&127;if((f|0)!=(u|0)){k=c[k+(f<<2)>>2]|0;do{if(!(k>>>0<5e8)){if(k>>>0>5e8){L=r*.75+L;break}if((n+3&127|0)==(u|0)){L=r*.5+L;break}else{L=r*.75+L;break}}else{if((k|0)==0?(n+3&127|0)==(u|0):0){break}L=r*.25+L}}while(0);if((53-e|0)>1?!(+Lb(+L,1.0)!=0.0):0){L=L+1.0}}r=K+L-H;do{if((j&2147483647|0)>(-2-m|0)){if(+T(+r)>=9007199254740992.0){b=(b|0)!=0&(e|0)==(h|0)?0:b;o=o+1|0;r=r*.5}if((o+50|0)<=(l|0)?!((b|0)!=0&L!=0.0):0){break}c[(xc()|0)>>2]=34}}while(0);N=+hr(r,o);i=g;return+N}else{if((c[o>>2]|0)!=0){c[n>>2]=(c[n>>2]|0)+ -1}c[(xc()|0)>>2]=22;er(b,0);N=0.0;i=g;return+N}}}while(0);if((q|0)==23){e=(c[o>>2]|0)==0;if(!e){c[n>>2]=(c[n>>2]|0)+ -1}if(!(m>>>0<4|(f|0)==0|e)){do{c[n>>2]=(c[n>>2]|0)+ -1;m=m+ -1|0}while(m>>>0>3)}}N=+(j|0)*y;i=g;return+N}function dr(a,b){a=a|0;b=b|0;var e=0,f=0,g=0,h=0,j=0,k=0;e=i;f=a+4|0;h=c[f>>2]|0;g=a+100|0;if(h>>>0<(c[g>>2]|0)>>>0){c[f>>2]=h+1;k=d[h]|0}else{k=fr(a)|0}if((k|0)==43|(k|0)==45){h=(k|0)==45|0;j=c[f>>2]|0;if(j>>>0<(c[g>>2]|0)>>>0){c[f>>2]=j+1;k=d[j]|0}else{k=fr(a)|0}if(!((k+ -48|0)>>>0<10|(b|0)==0)?(c[g>>2]|0)!=0:0){c[f>>2]=(c[f>>2]|0)+ -1}}else{h=0}if((k+ -48|0)>>>0>9){if((c[g>>2]|0)==0){j=-2147483648;k=0;I=j;i=e;return k|0}c[f>>2]=(c[f>>2]|0)+ -1;j=-2147483648;k=0;I=j;i=e;return k|0}else{b=0}while(1){b=k+ -48+b|0;j=c[f>>2]|0;if(j>>>0<(c[g>>2]|0)>>>0){c[f>>2]=j+1;k=d[j]|0}else{k=fr(a)|0}if(!((k+ -48|0)>>>0<10&(b|0)<214748364)){break}b=b*10|0}j=((b|0)<0)<<31>>31;if((k+ -48|0)>>>0<10){do{j=Gr(b|0,j|0,10,0)|0;b=I;k=qr(k|0,((k|0)<0)<<31>>31|0,-48,-1)|0;b=qr(k|0,I|0,j|0,b|0)|0;j=I;k=c[f>>2]|0;if(k>>>0<(c[g>>2]|0)>>>0){c[f>>2]=k+1;k=d[k]|0}else{k=fr(a)|0}}while((k+ -48|0)>>>0<10&((j|0)<21474836|(j|0)==21474836&b>>>0<2061584302))}if((k+ -48|0)>>>0<10){do{k=c[f>>2]|0;if(k>>>0<(c[g>>2]|0)>>>0){c[f>>2]=k+1;k=d[k]|0}else{k=fr(a)|0}}while((k+ -48|0)>>>0<10)}if((c[g>>2]|0)!=0){c[f>>2]=(c[f>>2]|0)+ -1}a=(h|0)!=0;f=pr(0,0,b|0,j|0)|0;g=a?I:j;k=a?f:b;I=g;i=e;return k|0}function er(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0;d=i;c[a+104>>2]=b;f=c[a+8>>2]|0;e=c[a+4>>2]|0;g=f-e|0;c[a+108>>2]=g;if((b|0)!=0&(g|0)>(b|0)){c[a+100>>2]=e+b;i=d;return}else{c[a+100>>2]=f;i=d;return}}function fr(b){b=b|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0;f=i;k=b+104|0;j=c[k>>2]|0;if(!((j|0)!=0?(c[b+108>>2]|0)>=(j|0):0)){l=3}if((l|0)==3?(e=jr(b)|0,(e|0)>=0):0){k=c[k>>2]|0;j=c[b+8>>2]|0;if((k|0)!=0?(g=c[b+4>>2]|0,h=k-(c[b+108>>2]|0)+ -1|0,(j-g|0)>(h|0)):0){c[b+100>>2]=g+h}else{c[b+100>>2]=j}g=c[b+4>>2]|0;if((j|0)!=0){l=b+108|0;c[l>>2]=j+1-g+(c[l>>2]|0)}b=g+ -1|0;if((d[b]|0|0)==(e|0)){l=e;i=f;return l|0}a[b]=e;l=e;i=f;return l|0}c[b+100>>2]=0;l=-1;i=f;return l|0}function gr(a,b){a=+a;b=b|0;var d=0,e=0;d=i;if((b|0)>1023){a=a*8.98846567431158e+307;e=b+ -1023|0;if((e|0)>1023){b=b+ -2046|0;b=(b|0)>1023?1023:b;a=a*8.98846567431158e+307}else{b=e}}else{if((b|0)<-1022){a=a*2.2250738585072014e-308;e=b+1022|0;if((e|0)<-1022){b=b+2044|0;b=(b|0)<-1022?-1022:b;a=a*2.2250738585072014e-308}else{b=e}}}b=yr(b+1023|0,0,52)|0;e=I;c[k>>2]=b;c[k+4>>2]=e;a=a*+h[k>>3];i=d;return+a}function hr(a,b){a=+a;b=b|0;var c=0;c=i;a=+gr(a,b);i=c;return+a}function ir(b){b=b|0;var d=0,e=0,f=0;e=i;f=b+74|0;d=a[f]|0;a[f]=d+255|d;f=b+20|0;d=b+44|0;if((c[f>>2]|0)>>>0>(c[d>>2]|0)>>>0){Hc[c[b+36>>2]&31](b,0,0)|0}c[b+16>>2]=0;c[b+28>>2]=0;c[f>>2]=0;f=c[b>>2]|0;if((f&20|0)==0){f=c[d>>2]|0;c[b+8>>2]=f;c[b+4>>2]=f;f=0;i=e;return f|0}if((f&4|0)==0){f=-1;i=e;return f|0}c[b>>2]=f|32;f=-1;i=e;return f|0}function jr(a){a=a|0;var b=0,e=0;b=i;i=i+16|0;e=b;if((c[a+8>>2]|0)==0?(ir(a)|0)!=0:0){a=-1}else{if((Hc[c[a+32>>2]&31](a,e,1)|0)==1){a=d[e]|0}else{a=-1}}i=b;return a|0}function kr(b){b=b|0;var c=0,d=0,e=0,f=0,g=0;c=i;while(1){f=b+1|0;if((hc(a[b]|0)|0)==0){break}else{b=f}}e=a[b]|0;g=e<<24>>24;if((g|0)==45){e=1;d=5}else if((g|0)==43){e=0;d=5}else{f=e;e=0}if((d|0)==5){b=f;f=a[f]|0}if((Bc(f<<24>>24|0)|0)==0){f=0;g=(e|0)!=0;d=0-f|0;g=g?f:d;i=c;return g|0}else{f=0}while(1){d=b+1|0;f=(f*10|0)+48-(a[b]|0)|0;if((Bc(a[d]|0)|0)==0){break}else{b=d}}g=(e|0)!=0;d=0-f|0;g=g?f:d;i=c;return g|0}function lr(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0.0,g=0,h=0;d=i;i=i+112|0;e=d;h=e+0|0;g=h+112|0;do{c[h>>2]=0;h=h+4|0}while((h|0)<(g|0));g=e+4|0;c[g>>2]=a;h=e+8|0;c[h>>2]=-1;c[e+44>>2]=a;c[e+76>>2]=-1;er(e,0);f=+cr(e,2,1);e=(c[g>>2]|0)-(c[h>>2]|0)+(c[e+108>>2]|0)|0;if((b|0)==0){i=d;return+f}if((e|0)!=0){a=a+e|0}c[b>>2]=a;i=d;return+f}function mr(b,c,d){b=b|0;c=c|0;d=d|0;var e=0,f=0,g=0;e=i;a:do{if((d|0)==0){b=0}else{while(1){g=a[b]|0;f=a[c]|0;if(!(g<<24>>24==f<<24>>24)){break}d=d+ -1|0;if((d|0)==0){b=0;break a}else{b=b+1|0;c=c+1|0}}b=(g&255)-(f&255)|0}}while(0);i=e;return b|0}function nr(b,c){b=b|0;c=c|0;var d=0,e=0,f=0;d=i;f=a[b]|0;e=a[c]|0;if(f<<24>>24!=e<<24>>24|f<<24>>24==0|e<<24>>24==0){b=f;f=e;b=b&255;f=f&255;f=b-f|0;i=d;return f|0}do{b=b+1|0;c=c+1|0;f=a[b]|0;e=a[c]|0}while(!(f<<24>>24!=e<<24>>24|f<<24>>24==0|e<<24>>24==0));b=f&255;f=e&255;f=b-f|0;i=d;return f|0}function or(){c[2212]=o;c[2238]=o;c[4976]=o;c[5206]=o}function pr(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;b=b-d-(c>>>0>a>>>0|0)>>>0;return(I=b,a-c>>>0|0)|0}function qr(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;c=a+c>>>0;return(I=b+d+(c>>>0<a>>>0|0)>>>0,c|0)|0}function rr(b){b=b|0;var c=0;c=b;while(a[c]|0){c=c+1|0}return c-b|0}function sr(a,b,d){a=a|0;b=b|0;d=d|0;var e=0;v=v+1|0;c[a>>2]=v;while((e|0)<40){if((c[d+(e<<2)>>2]|0)==0){c[d+(e<<2)>>2]=v;c[d+((e<<2)+4)>>2]=b;c[d+((e<<2)+8)>>2]=0;return 0}e=e+2|0}vb(116);vb(111);vb(111);vb(32);vb(109);vb(97);vb(110);vb(121);vb(32);vb(115);vb(101);vb(116);vb(106);vb(109);vb(112);vb(115);vb(32);vb(105);vb(110);vb(32);vb(97);vb(32);vb(102);vb(117);vb(110);vb(99);vb(116);vb(105);vb(111);vb(110);vb(32);vb(99);vb(97);vb(108);vb(108);vb(44);vb(32);vb(98);vb(117);vb(105);vb(108);vb(100);vb(32);vb(119);vb(105);vb(116);vb(104);vb(32);vb(97);vb(32);vb(104);vb(105);vb(103);vb(104);vb(101);vb(114);vb(32);vb(118);vb(97);vb(108);vb(117);vb(101);vb(32);vb(102);vb(111);vb(114);vb(32);vb(77);vb(65);vb(88);vb(95);vb(83);vb(69);vb(84);vb(74);vb(77);vb(80);vb(83);vb(10);fa(0);return 0}function tr(a,b){a=a|0;b=b|0;var d=0,e=0;while((d|0)<20){e=c[b+(d<<2)>>2]|0;if((e|0)==0)break;if((e|0)==(a|0)){return c[b+((d<<2)+4)>>2]|0}d=d+2|0}return 0}function ur(b,d,e){b=b|0;d=d|0;e=e|0;var f=0;if((e|0)>=4096)return Ta(b|0,d|0,e|0)|0;f=b|0;if((b&3)==(d&3)){while(b&3){if((e|0)==0)return f|0;a[b]=a[d]|0;b=b+1|0;d=d+1|0;e=e-1|0}while((e|0)>=4){c[b>>2]=c[d>>2];b=b+4|0;d=d+4|0;e=e-4|0}}while((e|0)>0){a[b]=a[d]|0;b=b+1|0;d=d+1|0;e=e-1|0}return f|0}function vr(b,c,d){b=b|0;c=c|0;d=d|0;var e=0;if((c|0)<(b|0)&(b|0)<(c+d|0)){e=b;c=c+d|0;b=b+d|0;while((d|0)>0){b=b-1|0;c=c-1|0;d=d-1|0;a[b]=a[c]|0}b=e}else{ur(b,c,d)|0}return b|0}function wr(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,i=0;f=b+e|0;if((e|0)>=20){d=d&255;i=b&3;h=d|d<<8|d<<16|d<<24;g=f&~3;if(i){i=b+4-i|0;while((b|0)<(i|0)){a[b]=d;b=b+1|0}}while((b|0)<(g|0)){c[b>>2]=h;b=b+4|0}}while((b|0)<(f|0)){a[b]=d;b=b+1|0}return b-e|0}function xr(b,c){b=b|0;c=c|0;var d=0,e=0;d=b+(rr(b)|0)|0;do{a[d+e|0]=a[c+e|0];e=e+1|0}while(a[c+(e-1)|0]|0);return b|0}function yr(a,b,c){a=a|0;b=b|0;c=c|0;if((c|0)<32){I=b<<c|(a&(1<<c)-1<<32-c)>>>32-c;return a<<c}I=a<<c-32;return 0}function zr(a,b,c){a=a|0;b=b|0;c=c|0;if((c|0)<32){I=b>>>c;return a>>>c|(b&(1<<c)-1)<<32-c}I=0;return b>>>c-32|0}function Ar(a,b,c){a=a|0;b=b|0;c=c|0;if((c|0)<32){I=b>>c;return a>>>c|(b&(1<<c)-1)<<32-c}I=(b|0)<0?-1:0;return b>>c-32|0}function Br(b){b=b|0;var c=0;c=a[n+(b>>>24)|0]|0;if((c|0)<8)return c|0;c=a[n+(b>>16&255)|0]|0;if((c|0)<8)return c+8|0;c=a[n+(b>>8&255)|0]|0;if((c|0)<8)return c+16|0;return(a[n+(b&255)|0]|0)+24|0}function Cr(b){b=b|0;var c=0;c=a[m+(b&255)|0]|0;if((c|0)<8)return c|0;c=a[m+(b>>8&255)|0]|0;if((c|0)<8)return c+8|0;c=a[m+(b>>16&255)|0]|0;if((c|0)<8)return c+16|0;return(a[m+(b>>>24)|0]|0)+24|0}function Dr(a,b){a=a|0;b=b|0;var c=0,d=0,e=0,f=0;f=a&65535;d=b&65535;c=ea(d,f)|0;e=a>>>16;d=(c>>>16)+(ea(d,e)|0)|0;b=b>>>16;a=ea(b,f)|0;return(I=(d>>>16)+(ea(b,e)|0)+(((d&65535)+a|0)>>>16)|0,d+a<<16|c&65535|0)|0}function Er(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0,f=0,g=0,h=0;e=b>>31|((b|0)<0?-1:0)<<1;f=((b|0)<0?-1:0)>>31|((b|0)<0?-1:0)<<1;g=d>>31|((d|0)<0?-1:0)<<1;h=((d|0)<0?-1:0)>>31|((d|0)<0?-1:0)<<1;a=pr(e^a,f^b,e,f)|0;b=I;e=g^e;f=h^f;g=pr((Jr(a,b,pr(g^c,h^d,g,h)|0,I,0)|0)^e,I^f,e,f)|0;return g|0}function Fr(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0,k=0,l=0;g=i;i=i+8|0;f=g|0;h=b>>31|((b|0)<0?-1:0)<<1;j=((b|0)<0?-1:0)>>31|((b|0)<0?-1:0)<<1;k=e>>31|((e|0)<0?-1:0)<<1;l=((e|0)<0?-1:0)>>31|((e|0)<0?-1:0)<<1;a=pr(h^a,j^b,h,j)|0;b=I;Jr(a,b,pr(k^d,l^e,k,l)|0,I,f)|0;k=pr(c[f>>2]^h,c[f+4>>2]^j,h,j)|0;j=I;i=g;return(I=j,k)|0}function Gr(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0,f=0;e=a;f=c;a=Dr(e,f)|0;c=I;return(I=(ea(b,f)|0)+(ea(d,e)|0)+c|c&0,a|0|0)|0}function Hr(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;a=Jr(a,b,c,d,0)|0;return a|0}function Ir(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;var f=0,g=0;g=i;i=i+8|0;f=g|0;Jr(a,b,d,e,f)|0;i=g;return(I=c[f+4>>2]|0,c[f>>2]|0)|0}function Jr(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0;h=a;j=b;i=j;k=d;g=e;l=g;if((i|0)==0){d=(f|0)!=0;if((l|0)==0){if(d){c[f>>2]=(h>>>0)%(k>>>0);c[f+4>>2]=0}l=0;m=(h>>>0)/(k>>>0)>>>0;return(I=l,m)|0}else{if(!d){l=0;m=0;return(I=l,m)|0}c[f>>2]=a|0;c[f+4>>2]=b&0;l=0;m=0;return(I=l,m)|0}}m=(l|0)==0;do{if((k|0)!=0){if(!m){k=(Br(l|0)|0)-(Br(i|0)|0)|0;if(k>>>0<=31){l=k+1|0;m=31-k|0;b=k-31>>31;j=l;a=h>>>(l>>>0)&b|i<<m;b=i>>>(l>>>0)&b;l=0;i=h<<m;break}if((f|0)==0){l=0;m=0;return(I=l,m)|0}c[f>>2]=a|0;c[f+4>>2]=j|b&0;l=0;m=0;return(I=l,m)|0}l=k-1|0;if((l&k|0)!=0){m=(Br(k|0)|0)+33-(Br(i|0)|0)|0;p=64-m|0;k=32-m|0;n=k>>31;o=m-32|0;b=o>>31;j=m;a=k-1>>31&i>>>(o>>>0)|(i<<k|h>>>(m>>>0))&b;b=b&i>>>(m>>>0);l=h<<p&n;i=(i<<p|h>>>(o>>>0))&n|h<<k&m-33>>31;break}if((f|0)!=0){c[f>>2]=l&h;c[f+4>>2]=0}if((k|0)==1){o=j|b&0;p=a|0|0;return(I=o,p)|0}else{p=Cr(k|0)|0;o=i>>>(p>>>0)|0;p=i<<32-p|h>>>(p>>>0)|0;return(I=o,p)|0}}else{if(m){if((f|0)!=0){c[f>>2]=(i>>>0)%(k>>>0);c[f+4>>2]=0}o=0;p=(i>>>0)/(k>>>0)>>>0;return(I=o,p)|0}if((h|0)==0){if((f|0)!=0){c[f>>2]=0;c[f+4>>2]=(i>>>0)%(l>>>0)}o=0;p=(i>>>0)/(l>>>0)>>>0;return(I=o,p)|0}k=l-1|0;if((k&l|0)==0){if((f|0)!=0){c[f>>2]=a|0;c[f+4>>2]=k&i|b&0}o=0;p=i>>>((Cr(l|0)|0)>>>0);return(I=o,p)|0}k=(Br(l|0)|0)-(Br(i|0)|0)|0;if(k>>>0<=30){b=k+1|0;p=31-k|0;j=b;a=i<<p|h>>>(b>>>0);b=i>>>(b>>>0);l=0;i=h<<p;break}if((f|0)==0){o=0;p=0;return(I=o,p)|0}c[f>>2]=a|0;c[f+4>>2]=j|b&0;o=0;p=0;return(I=o,p)|0}}while(0);if((j|0)==0){m=a;d=0;a=0}else{d=d|0|0;g=g|e&0;e=qr(d,g,-1,-1)|0;h=I;k=b;m=a;a=0;while(1){b=l>>>31|i<<1;l=a|l<<1;i=m<<1|i>>>31|0;k=m>>>31|k<<1|0;pr(e,h,i,k)|0;m=I;p=m>>31|((m|0)<0?-1:0)<<1;a=p&1;m=pr(i,k,p&d,(((m|0)<0?-1:0)>>31|((m|0)<0?-1:0)<<1)&g)|0;k=I;j=j-1|0;if((j|0)==0){break}else{i=b}}i=b;b=k;d=0}g=0;if((f|0)!=0){c[f>>2]=m;c[f+4>>2]=b}o=(l|0)>>>31|(i|g)<<1|(g<<1|l>>>31)&0|d;p=(l<<1|0>>>31)&-2|a;return(I=o,p)|0}function Kr(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;return Hc[a&31](b|0,c|0,d|0)|0}function Lr(a,b,c){a=a|0;b=b|0;c=c|0;return+Ic[a&1](b|0,c|0)}function Mr(a,b,c,d,e,f,g,h){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;Jc[a&63](b|0,c|0,d|0,e|0,f|0,g|0,h|0)}function Nr(a,b,c,d,e,f){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;Kc[a&3](b|0,c|0,d|0,e|0,f|0)}function Or(a,b){a=a|0;b=b|0;Lc[a&255](b|0)}function Pr(a,b,c){a=a|0;b=b|0;c=c|0;Mc[a&63](b|0,c|0)}function Qr(a,b,c,d,e,f,g){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;return Nc[a&7](b|0,c|0,d|0,e|0,f|0,g|0)|0}function Rr(a,b,c,d,e,f,g,h,i,j){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;i=i|0;j=j|0;Oc[a&3](b|0,c|0,d|0,e|0,f|0,g|0,h|0,i|0,j|0)}function Sr(a,b){a=a|0;b=b|0;return Pc[a&127](b|0)|0}function Tr(a,b,c,d,e,f,g,h){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;h=+h;Qc[a&3](b|0,c|0,d|0,e|0,f|0,g|0,+h)}function Ur(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;Rc[a&7](b|0,c|0,d|0)}function Vr(a,b,c,d,e,f,g){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=+g;Sc[a&7](b|0,c|0,d|0,e|0,f|0,+g)}function Wr(a){a=a|0;Tc[a&0]()}function Xr(a,b,c,d,e,f,g,h,i){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;i=i|0;return Uc[a&15](b|0,c|0,d|0,e|0,f|0,g|0,h|0,i|0)|0}function Yr(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;return Vc[a&31](b|0,c|0,d|0,e|0)|0}function Zr(a,b,c,d,e,f,g,h,i){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;i=i|0;Wc[a&7](b|0,c|0,d|0,e|0,f|0,g|0,h|0,i|0)}function _r(a,b,c,d,e,f,g){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;Xc[a&31](b|0,c|0,d|0,e|0,f|0,g|0)}function $r(a,b,c){a=a|0;b=b|0;c=c|0;return Yc[a&63](b|0,c|0)|0}function as(a,b,c,d,e,f){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;return Zc[a&31](b|0,c|0,d|0,e|0,f|0)|0}function bs(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;_c[a&15](b|0,c|0,d|0,e|0)}function cs(a,b,c){a=a|0;b=b|0;c=c|0;fa(0);return 0}function ds(a,b,c){a=a|0;b=b|0;c=c|0;return Qb(a|0,b|0,c|0)|0}function es(a,b){a=a|0;b=b|0;fa(1);return 0.0}function fs(a,b,c,d,e,f,g){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;fa(2)}function gs(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;fa(3)}function hs(a){a=a|0;fa(4)}function is(a,b){a=a|0;b=b|0;fa(5)}function js(a,b,c,d,e,f){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;fa(6);return 0}function ks(a,b,c,d,e,f){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;return Hb(a|0,b|0,c|0,d|0,e|0,f|0)|0}function ls(a,b,c,d,e,f,g,h,i){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;i=i|0;fa(7)}function ms(a){a=a|0;fa(8);return 0}function ns(a){a=a|0;return Va(a|0)|0}function os(a){a=a|0;return rr(a|0)|0}function ps(a,b,c,d,e,f,g){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=+g;fa(9)}function qs(a,b,c){a=a|0;b=b|0;c=c|0;fa(10)}function rs(a,b,c,d,e,f){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=+f;fa(11)}function ss(){fa(12)}function ts(a,b,c,d,e,f,g,h){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;fa(13);return 0}function us(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;fa(14);return 0}function vs(a,b,c,d,e,f,g,h){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;fa(15)}function ws(a,b,c,d,e,f){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;fa(16)}function xs(a,b){a=a|0;b=b|0;fa(17);return 0}function ys(a,b){a=a|0;b=b|0;return Gb(a|0,b|0)|0}function zs(a,b){a=a|0;b=b|0;return Ka(a|0,b|0)|0}function As(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;fa(18);return 0}function Bs(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;fa(19)}




// EMSCRIPTEN_END_FUNCS
var Hc=[cs,Vi,_i,cj,Ld,Nd,Je,Ke,we,xe,hj,mj,xh,qj,Lh,ji,ki,ak,fk,Jn,On,uo,wo,zo,fo,ko,mo,po,Gq,Jd,ds,cs];var Ic=[es,be];var Jc=[fs,ik,kk,mk,ok,qk,sk,uk,wk,yk,Ak,Ck,Hk,Jk,Lk,Nk,Pk,Rk,Tk,Vk,Xk,Zk,$k,nl,pl,Bl,Dl,Ml,Nl,Ol,Pl,Ql,Zl,_l,$l,am,bm,An,Gn,fs,fs,fs,fs,fs,fs,fs,fs,fs,fs,fs,fs,fs,fs,fs,fs,fs,fs,fs,fs,fs,fs,fs,fs,fs];var Kc=[gs,Nq,Mq,Lq];var Lc=[hs,rd,sd,Ad,Cd,Bd,Dd,Ej,Dj,Gj,Fj,Sd,Td,Yd,_d,de,ee,Ge,Ne,Oe,Se,Te,Xe,Ye,We,_e,Ve,$e,sf,rf,Sf,Mg,Lg,hh,th,uh,Ah,Bh,Hh,Ih,Oh,Ph,$h,_h,ei,di,gi,pi,oi,Ti,Si,fj,ej,tj,sj,vj,uj,zj,yj,Bj,Aj,Mj,Lj,Oj,Nj,Uj,Tj,Pi,Vj,Sj,Wj,Yj,Xj,bo,ck,bk,hk,gk,Gk,Fk,il,hl,wl,vl,Kl,Jl,Xl,Wl,hm,gm,km,jm,om,nm,zm,ym,Km,Jm,Vm,Um,en,dn,pn,on,wn,vn,Cn,Bn,In,Hn,Nn,Mn,Wn,Vn,so,ro,Rn,Jo,op,np,qp,pp,Zj,ao,eo,Bo,Ro,ap,lp,mp,yq,xq,Aq,Dq,Bq,Cq,Eq,Fq,$q,_q,Kd,ri,Yq,sh,co,Yp,gn,Sq,dq,cq,bq,aq,$p,_p,vi,Hi,hs,hs,hs,hs,hs,hs,hs,hs,hs,hs,hs,hs,hs,hs,hs,hs,hs,hs,hs,hs,hs,hs,hs,hs,hs,hs,hs,hs,hs,hs,hs,hs,hs,hs,hs,hs,hs,hs,hs,hs,hs,hs,hs,hs,hs,hs,hs,hs,hs,hs,hs,hs,hs,hs,hs,hs,hs,hs,hs,hs,hs,hs,hs,hs,hs,hs,hs,hs,hs,hs,hs,hs,hs,hs,hs,hs,hs,hs,hs,hs,hs,hs,hs,hs,hs,hs,hs,hs,hs,hs,hs,hs,hs,hs,hs,hs,hs,hs,hs,hs];var Mc=[is,Ui,Ae,Ce,De,Ff,qh,vh,Ch,Jh,Qh,gj,rm,sm,tm,um,wm,xm,Cm,Dm,Em,Fm,Hm,Im,Nm,Om,Pm,Qm,Sm,Tm,Ym,Zm,_m,$m,bn,cn,Ln,Qn,vp,xp,zp,wp,yp,Ap,Oi,Wd,is,is,is,is,is,is,is,is,is,is,is,is,is,is,is,is,is,is];var Nc=[js,xf,If,Ug,ah,ks,js,js];var Oc=[ls,Rl,cm,ls];var Pc=[ms,Yi,Zi,vd,aj,Md,Qd,Rd,ce,Be,Ee,Fe,He,Me,Jf,Kf,Rf,Qg,Sg,ph,wh,lj,nj,oj,kj,Dh,Eh,Kh,$i,Rh,Sh,ai,fi,Qj,Ll,Bp,Dp,Fp,Lp,Np,Hp,Jp,Yl,Cp,Ep,Gp,Mp,Op,Ip,Kp,pm,qm,vm,Am,Bm,Gm,Lm,Mm,Rm,Wm,Xm,an,No,Oo,Qo,rp,tp,sp,up,Fo,Go,Io,Xo,Yo,$o,gp,hp,kp,zq,ar,ns,os,Wq,ms,ms,ms,ms,ms,ms,ms,ms,ms,ms,ms,ms,ms,ms,ms,ms,ms,ms,ms,ms,ms,ms,ms,ms,ms,ms,ms,ms,ms,ms,ms,ms,ms,ms,ms,ms,ms,ms,ms,ms,ms,ms,ms,ms,ms];var Qc=[ps,xn,Dn,ps];var Rc=[qs,ze,wf,Tg,ii,Rj,qs,qs];var Sc=[rs,ql,tl,El,Gl,rs,rs,rs];var Tc=[ss];var Uc=[ts,Ko,Lo,Co,Do,So,Uo,bp,dp,ts,ts,ts,ts,ts,ts,ts];var Vc=[us,ve,vf,Df,Mf,Nf,Pf,Ng,_g,oh,ch,eh,yo,go,ho,io,oo,us,us,us,us,us,us,us,us,us,us,us,us,us,us,us];var Wc=[vs,im,lm,fn,kn,qn,sn,vs];var Xc=[ws,td,ij,Wi,jl,kl,ol,ul,xl,yl,Cl,Hl,Kn,Pn,Qq,Pq,Oq,ws,ws,ws,ws,ws,ws,ws,ws,ws,ws,ws,ws,ws,ws,ws];var Yc=[xs,wd,xd,Id,Hd,ae,Ie,Le,Of,Qf,dh,gh,pj,yh,Fh,rj,bj,Mh,Th,dj,to,vo,xo,jo,lo,no,pd,Ij,ys,wi,nr,zs,Jj,$f,ag,bg,cg,dg,eg,fg,gg,ig,lg,hg,xs,xs,xs,xs,xs,xs,xs,xs,xs,xs,xs,xs,xs,xs,xs,xs,xs,xs,xs,xs];var Zc=[As,Cf,Ef,Lf,Yg,$g,mh,_j,dk,Ao,Mo,Po,qo,Eo,Ho,Wo,Zo,fp,ip,As,As,As,As,As,As,As,As,As,As,As,As,As];var _c=[Bs,ud,jj,Xi,$j,ek,Hq,Iq,Jq,Bs,Bs,Bs,Bs,Bs,Bs,Bs];return{_InitRecog:bf,_saveSetjmp:sr,_ExitPrediction:ff,_GetPrediction:ef,_memcpy:ur,_realloc:Tq,_i64Add:qr,_memmove:vr,_i64Subtract:pr,_memset:wr,_malloc:Rq,_free:Sq,_strcat:xr,_strlen:rr,_ExitRecog:cf,_InitPrediction:df,_CharacterRecognize:af,_bitshift64Shl:yr,_testSetjmp:tr,__GLOBAL__I_a:Vh,runPostSets:or,stackAlloc:$c,stackSave:ad,stackRestore:bd,setThrew:cd,setTempRet0:fd,setTempRet1:gd,setTempRet2:hd,setTempRet3:id,setTempRet4:jd,setTempRet5:kd,setTempRet6:ld,setTempRet7:md,setTempRet8:nd,setTempRet9:od,dynCall_iiii:Kr,dynCall_dii:Lr,dynCall_viiiiiii:Mr,dynCall_viiiii:Nr,dynCall_vi:Or,dynCall_vii:Pr,dynCall_iiiiiii:Qr,dynCall_viiiiiiiii:Rr,dynCall_ii:Sr,dynCall_viiiiiid:Tr,dynCall_viii:Ur,dynCall_viiiiid:Vr,dynCall_v:Wr,dynCall_iiiiiiiii:Xr,dynCall_iiiii:Yr,dynCall_viiiiiiii:Zr,dynCall_viiiiii:_r,dynCall_iii:$r,dynCall_iiiiii:as,dynCall_viiii:bs}})


// EMSCRIPTEN_END_ASM
({ "Math": Math, "Int8Array": Int8Array, "Int16Array": Int16Array, "Int32Array": Int32Array, "Uint8Array": Uint8Array, "Uint16Array": Uint16Array, "Uint32Array": Uint32Array, "Float32Array": Float32Array, "Float64Array": Float64Array }, { "abort": abort, "assert": assert, "asmPrintInt": asmPrintInt, "asmPrintFloat": asmPrintFloat, "min": Math_min, "invoke_iiii": invoke_iiii, "invoke_dii": invoke_dii, "invoke_viiiiiii": invoke_viiiiiii, "invoke_viiiii": invoke_viiiii, "invoke_vi": invoke_vi, "invoke_vii": invoke_vii, "invoke_iiiiiii": invoke_iiiiiii, "invoke_viiiiiiiii": invoke_viiiiiiiii, "invoke_ii": invoke_ii, "invoke_viiiiiid": invoke_viiiiiid, "invoke_viii": invoke_viii, "invoke_viiiiid": invoke_viiiiid, "invoke_v": invoke_v, "invoke_iiiiiiiii": invoke_iiiiiiiii, "invoke_iiiii": invoke_iiiii, "invoke_viiiiiiii": invoke_viiiiiiii, "invoke_viiiiii": invoke_viiiiii, "invoke_iii": invoke_iii, "invoke_iiiiii": invoke_iiiiii, "invoke_viiii": invoke_viiii, "_fabs": _fabs, "_log": _log, "_vsscanf": _vsscanf, "__ZSt9terminatev": __ZSt9terminatev, "___cxa_guard_acquire": ___cxa_guard_acquire, "__reallyNegative": __reallyNegative, "_fstat": _fstat, "___assert_fail": ___assert_fail, "__ZSt18uncaught_exceptionv": __ZSt18uncaught_exceptionv, "_longjmp": _longjmp, "___ctype_toupper_loc": ___ctype_toupper_loc, "__addDays": __addDays, "_fsync": _fsync, "_sbrk": _sbrk, "___cxa_begin_catch": ___cxa_begin_catch, "_emscripten_memcpy_big": _emscripten_memcpy_big, "__parseInt64": __parseInt64, "_close": _close, "_ferror": _ferror, "_fileno": _fileno, "_fread": _fread, "_unlink": _unlink, "_write": _write, "__isLeapYear": __isLeapYear, "_ftell": _ftell, "__ZNSt9exceptionD2Ev": __ZNSt9exceptionD2Ev, "___cxa_does_inherit": ___cxa_does_inherit, "_strtoll_l": _strtoll_l, "___cxa_rethrow": ___cxa_rethrow, "_catclose": _catclose, "_send": _send, "_atan2": _atan2, "___cxa_is_number_type": ___cxa_is_number_type, "___cxa_free_exception": ___cxa_free_exception, "_atan2f": _atan2f, "___cxa_find_matching_catch": ___cxa_find_matching_catch, "_isxdigit_l": _isxdigit_l, "___cxa_guard_release": ___cxa_guard_release, "_truncate": _truncate, "_strerror_r": _strerror_r, "___setErrNo": ___setErrNo, "_newlocale": _newlocale, "_isdigit_l": _isdigit_l, "___resumeException": ___resumeException, "_freelocale": _freelocale, "_putchar": _putchar, "_sprintf": _sprintf, "_vasprintf": _vasprintf, "_stat": _stat, "_vsnprintf": _vsnprintf, "_strtoull_l": _strtoull_l, "_read": _read, "_fwrite": _fwrite, "_time": _time, "_pthread_mutex_lock": _pthread_mutex_lock, "_gettimeofday": _gettimeofday, "_munmap": _munmap, "_mmap": _mmap, "_catopen": _catopen, "_exit": _exit, "___ctype_b_loc": ___ctype_b_loc, "_fmod": _fmod, "_lseek": _lseek, "___cxa_allocate_exception": ___cxa_allocate_exception, "_strtoll": _strtoll, "_pwrite": _pwrite, "_open": _open, "_fabsf": _fabsf, "_uselocale": _uselocale, "_snprintf": _snprintf, "__scanString": __scanString, "___cxa_end_catch": ___cxa_end_catch, "_strtoull": _strtoull, "_strftime": _strftime, "_ftruncate": _ftruncate, "_fseek": _fseek, "_isxdigit": _isxdigit, "_fclose": _fclose, "_sqrtf": _sqrtf, "_pthread_cond_broadcast": _pthread_cond_broadcast, "_recv": _recv, "_fgetc": _fgetc, "_sysconf": _sysconf, "__getFloat": __getFloat, "_abort": _abort, "_isspace": _isspace, "_fopen": _fopen, "_pthread_cond_wait": _pthread_cond_wait, "_ungetc": _ungetc, "_fflush": _fflush, "_strftime_l": _strftime_l, "_sscanf": _sscanf, "_catgets": _catgets, "_asprintf": _asprintf, "__exit": __exit, "__arraySum": __arraySum, "___ctype_tolower_loc": ___ctype_tolower_loc, "_pthread_mutex_unlock": _pthread_mutex_unlock, "_pread": _pread, "_mkport": _mkport, "_feof": _feof, "___errno_location": ___errno_location, "_copysign": _copysign, "_fputc": _fputc, "___cxa_throw": ___cxa_throw, "_isdigit": _isdigit, "_strerror": _strerror, "_emscripten_longjmp": _emscripten_longjmp, "__formatString": __formatString, "_atexit": _atexit, "STACKTOP": STACKTOP, "STACK_MAX": STACK_MAX, "tempDoublePtr": tempDoublePtr, "ABORT": ABORT, "cttz_i8": cttz_i8, "ctlz_i8": ctlz_i8, "NaN": NaN, "Infinity": Infinity, "__ZTISt9exception": __ZTISt9exception, "___dso_handle": ___dso_handle, "_stderr": _stderr, "_stdin": _stdin, "_stdout": _stdout }, buffer);
var _InitRecog = Module["_InitRecog"] = asm["_InitRecog"];
var _saveSetjmp = Module["_saveSetjmp"] = asm["_saveSetjmp"];
var _ExitPrediction = Module["_ExitPrediction"] = asm["_ExitPrediction"];
var _GetPrediction = Module["_GetPrediction"] = asm["_GetPrediction"];
var _memcpy = Module["_memcpy"] = asm["_memcpy"];
var _realloc = Module["_realloc"] = asm["_realloc"];
var _i64Add = Module["_i64Add"] = asm["_i64Add"];
var _memmove = Module["_memmove"] = asm["_memmove"];
var _i64Subtract = Module["_i64Subtract"] = asm["_i64Subtract"];
var _memset = Module["_memset"] = asm["_memset"];
var _malloc = Module["_malloc"] = asm["_malloc"];
var _free = Module["_free"] = asm["_free"];
var _strcat = Module["_strcat"] = asm["_strcat"];
var _strlen = Module["_strlen"] = asm["_strlen"];
var _ExitRecog = Module["_ExitRecog"] = asm["_ExitRecog"];
var _InitPrediction = Module["_InitPrediction"] = asm["_InitPrediction"];
var _CharacterRecognize = Module["_CharacterRecognize"] = asm["_CharacterRecognize"];
var _bitshift64Shl = Module["_bitshift64Shl"] = asm["_bitshift64Shl"];
var _testSetjmp = Module["_testSetjmp"] = asm["_testSetjmp"];
var __GLOBAL__I_a = Module["__GLOBAL__I_a"] = asm["__GLOBAL__I_a"];
var runPostSets = Module["runPostSets"] = asm["runPostSets"];
var dynCall_iiii = Module["dynCall_iiii"] = asm["dynCall_iiii"];
var dynCall_dii = Module["dynCall_dii"] = asm["dynCall_dii"];
var dynCall_viiiiiii = Module["dynCall_viiiiiii"] = asm["dynCall_viiiiiii"];
var dynCall_viiiii = Module["dynCall_viiiii"] = asm["dynCall_viiiii"];
var dynCall_vi = Module["dynCall_vi"] = asm["dynCall_vi"];
var dynCall_vii = Module["dynCall_vii"] = asm["dynCall_vii"];
var dynCall_iiiiiii = Module["dynCall_iiiiiii"] = asm["dynCall_iiiiiii"];
var dynCall_viiiiiiiii = Module["dynCall_viiiiiiiii"] = asm["dynCall_viiiiiiiii"];
var dynCall_ii = Module["dynCall_ii"] = asm["dynCall_ii"];
var dynCall_viiiiiid = Module["dynCall_viiiiiid"] = asm["dynCall_viiiiiid"];
var dynCall_viii = Module["dynCall_viii"] = asm["dynCall_viii"];
var dynCall_viiiiid = Module["dynCall_viiiiid"] = asm["dynCall_viiiiid"];
var dynCall_v = Module["dynCall_v"] = asm["dynCall_v"];
var dynCall_iiiiiiiii = Module["dynCall_iiiiiiiii"] = asm["dynCall_iiiiiiiii"];
var dynCall_iiiii = Module["dynCall_iiiii"] = asm["dynCall_iiiii"];
var dynCall_viiiiiiii = Module["dynCall_viiiiiiii"] = asm["dynCall_viiiiiiii"];
var dynCall_viiiiii = Module["dynCall_viiiiii"] = asm["dynCall_viiiiii"];
var dynCall_iii = Module["dynCall_iii"] = asm["dynCall_iii"];
var dynCall_iiiiii = Module["dynCall_iiiiii"] = asm["dynCall_iiiiii"];
var dynCall_viiii = Module["dynCall_viiii"] = asm["dynCall_viiii"];

Runtime.stackAlloc = function(size) { return asm['stackAlloc'](size) };
Runtime.stackSave = function() { return asm['stackSave']() };
Runtime.stackRestore = function(top) { asm['stackRestore'](top) };


// TODO: strip out parts of this we do not need

//======= begin closure i64 code =======

// Copyright 2009 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Defines a Long class for representing a 64-bit two's-complement
 * integer value, which faithfully simulates the behavior of a Java "long". This
 * implementation is derived from LongLib in GWT.
 *
 */

var i64Math = (function() { // Emscripten wrapper
  var goog = { math: {} };


  /**
   * Constructs a 64-bit two's-complement integer, given its low and high 32-bit
   * values as *signed* integers.  See the from* functions below for more
   * convenient ways of constructing Longs.
   *
   * The internal representation of a long is the two given signed, 32-bit values.
   * We use 32-bit pieces because these are the size of integers on which
   * Javascript performs bit-operations.  For operations like addition and
   * multiplication, we split each number into 16-bit pieces, which can easily be
   * multiplied within Javascript's floating-point representation without overflow
   * or change in sign.
   *
   * In the algorithms below, we frequently reduce the negative case to the
   * positive case by negating the input(s) and then post-processing the result.
   * Note that we must ALWAYS check specially whether those values are MIN_VALUE
   * (-2^63) because -MIN_VALUE == MIN_VALUE (since 2^63 cannot be represented as
   * a positive number, it overflows back into a negative).  Not handling this
   * case would often result in infinite recursion.
   *
   * @param {number} low  The low (signed) 32 bits of the long.
   * @param {number} high  The high (signed) 32 bits of the long.
   * @constructor
   */
  goog.math.Long = function(low, high) {
    /**
     * @type {number}
     * @private
     */
    this.low_ = low | 0;  // force into 32 signed bits.

    /**
     * @type {number}
     * @private
     */
    this.high_ = high | 0;  // force into 32 signed bits.
  };


  // NOTE: Common constant values ZERO, ONE, NEG_ONE, etc. are defined below the
  // from* methods on which they depend.


  /**
   * A cache of the Long representations of small integer values.
   * @type {!Object}
   * @private
   */
  goog.math.Long.IntCache_ = {};


  /**
   * Returns a Long representing the given (32-bit) integer value.
   * @param {number} value The 32-bit integer in question.
   * @return {!goog.math.Long} The corresponding Long value.
   */
  goog.math.Long.fromInt = function(value) {
    if (-128 <= value && value < 128) {
      var cachedObj = goog.math.Long.IntCache_[value];
      if (cachedObj) {
        return cachedObj;
      }
    }

    var obj = new goog.math.Long(value | 0, value < 0 ? -1 : 0);
    if (-128 <= value && value < 128) {
      goog.math.Long.IntCache_[value] = obj;
    }
    return obj;
  };


  /**
   * Returns a Long representing the given value, provided that it is a finite
   * number.  Otherwise, zero is returned.
   * @param {number} value The number in question.
   * @return {!goog.math.Long} The corresponding Long value.
   */
  goog.math.Long.fromNumber = function(value) {
    if (isNaN(value) || !isFinite(value)) {
      return goog.math.Long.ZERO;
    } else if (value <= -goog.math.Long.TWO_PWR_63_DBL_) {
      return goog.math.Long.MIN_VALUE;
    } else if (value + 1 >= goog.math.Long.TWO_PWR_63_DBL_) {
      return goog.math.Long.MAX_VALUE;
    } else if (value < 0) {
      return goog.math.Long.fromNumber(-value).negate();
    } else {
      return new goog.math.Long(
          (value % goog.math.Long.TWO_PWR_32_DBL_) | 0,
          (value / goog.math.Long.TWO_PWR_32_DBL_) | 0);
    }
  };


  /**
   * Returns a Long representing the 64-bit integer that comes by concatenating
   * the given high and low bits.  Each is assumed to use 32 bits.
   * @param {number} lowBits The low 32-bits.
   * @param {number} highBits The high 32-bits.
   * @return {!goog.math.Long} The corresponding Long value.
   */
  goog.math.Long.fromBits = function(lowBits, highBits) {
    return new goog.math.Long(lowBits, highBits);
  };


  /**
   * Returns a Long representation of the given string, written using the given
   * radix.
   * @param {string} str The textual representation of the Long.
   * @param {number=} opt_radix The radix in which the text is written.
   * @return {!goog.math.Long} The corresponding Long value.
   */
  goog.math.Long.fromString = function(str, opt_radix) {
    if (str.length == 0) {
      throw Error('number format error: empty string');
    }

    var radix = opt_radix || 10;
    if (radix < 2 || 36 < radix) {
      throw Error('radix out of range: ' + radix);
    }

    if (str.charAt(0) == '-') {
      return goog.math.Long.fromString(str.substring(1), radix).negate();
    } else if (str.indexOf('-') >= 0) {
      throw Error('number format error: interior "-" character: ' + str);
    }

    // Do several (8) digits each time through the loop, so as to
    // minimize the calls to the very expensive emulated div.
    var radixToPower = goog.math.Long.fromNumber(Math.pow(radix, 8));

    var result = goog.math.Long.ZERO;
    for (var i = 0; i < str.length; i += 8) {
      var size = Math.min(8, str.length - i);
      var value = parseInt(str.substring(i, i + size), radix);
      if (size < 8) {
        var power = goog.math.Long.fromNumber(Math.pow(radix, size));
        result = result.multiply(power).add(goog.math.Long.fromNumber(value));
      } else {
        result = result.multiply(radixToPower);
        result = result.add(goog.math.Long.fromNumber(value));
      }
    }
    return result;
  };


  // NOTE: the compiler should inline these constant values below and then remove
  // these variables, so there should be no runtime penalty for these.


  /**
   * Number used repeated below in calculations.  This must appear before the
   * first call to any from* function below.
   * @type {number}
   * @private
   */
  goog.math.Long.TWO_PWR_16_DBL_ = 1 << 16;


  /**
   * @type {number}
   * @private
   */
  goog.math.Long.TWO_PWR_24_DBL_ = 1 << 24;


  /**
   * @type {number}
   * @private
   */
  goog.math.Long.TWO_PWR_32_DBL_ =
      goog.math.Long.TWO_PWR_16_DBL_ * goog.math.Long.TWO_PWR_16_DBL_;


  /**
   * @type {number}
   * @private
   */
  goog.math.Long.TWO_PWR_31_DBL_ =
      goog.math.Long.TWO_PWR_32_DBL_ / 2;


  /**
   * @type {number}
   * @private
   */
  goog.math.Long.TWO_PWR_48_DBL_ =
      goog.math.Long.TWO_PWR_32_DBL_ * goog.math.Long.TWO_PWR_16_DBL_;


  /**
   * @type {number}
   * @private
   */
  goog.math.Long.TWO_PWR_64_DBL_ =
      goog.math.Long.TWO_PWR_32_DBL_ * goog.math.Long.TWO_PWR_32_DBL_;


  /**
   * @type {number}
   * @private
   */
  goog.math.Long.TWO_PWR_63_DBL_ =
      goog.math.Long.TWO_PWR_64_DBL_ / 2;


  /** @type {!goog.math.Long} */
  goog.math.Long.ZERO = goog.math.Long.fromInt(0);


  /** @type {!goog.math.Long} */
  goog.math.Long.ONE = goog.math.Long.fromInt(1);


  /** @type {!goog.math.Long} */
  goog.math.Long.NEG_ONE = goog.math.Long.fromInt(-1);


  /** @type {!goog.math.Long} */
  goog.math.Long.MAX_VALUE =
      goog.math.Long.fromBits(0xFFFFFFFF | 0, 0x7FFFFFFF | 0);


  /** @type {!goog.math.Long} */
  goog.math.Long.MIN_VALUE = goog.math.Long.fromBits(0, 0x80000000 | 0);


  /**
   * @type {!goog.math.Long}
   * @private
   */
  goog.math.Long.TWO_PWR_24_ = goog.math.Long.fromInt(1 << 24);


  /** @return {number} The value, assuming it is a 32-bit integer. */
  goog.math.Long.prototype.toInt = function() {
    return this.low_;
  };


  /** @return {number} The closest floating-point representation to this value. */
  goog.math.Long.prototype.toNumber = function() {
    return this.high_ * goog.math.Long.TWO_PWR_32_DBL_ +
           this.getLowBitsUnsigned();
  };


  /**
   * @param {number=} opt_radix The radix in which the text should be written.
   * @return {string} The textual representation of this value.
   */
  goog.math.Long.prototype.toString = function(opt_radix) {
    var radix = opt_radix || 10;
    if (radix < 2 || 36 < radix) {
      throw Error('radix out of range: ' + radix);
    }

    if (this.isZero()) {
      return '0';
    }

    if (this.isNegative()) {
      if (this.equals(goog.math.Long.MIN_VALUE)) {
        // We need to change the Long value before it can be negated, so we remove
        // the bottom-most digit in this base and then recurse to do the rest.
        var radixLong = goog.math.Long.fromNumber(radix);
        var div = this.div(radixLong);
        var rem = div.multiply(radixLong).subtract(this);
        return div.toString(radix) + rem.toInt().toString(radix);
      } else {
        return '-' + this.negate().toString(radix);
      }
    }

    // Do several (6) digits each time through the loop, so as to
    // minimize the calls to the very expensive emulated div.
    var radixToPower = goog.math.Long.fromNumber(Math.pow(radix, 6));

    var rem = this;
    var result = '';
    while (true) {
      var remDiv = rem.div(radixToPower);
      var intval = rem.subtract(remDiv.multiply(radixToPower)).toInt();
      var digits = intval.toString(radix);

      rem = remDiv;
      if (rem.isZero()) {
        return digits + result;
      } else {
        while (digits.length < 6) {
          digits = '0' + digits;
        }
        result = '' + digits + result;
      }
    }
  };


  /** @return {number} The high 32-bits as a signed value. */
  goog.math.Long.prototype.getHighBits = function() {
    return this.high_;
  };


  /** @return {number} The low 32-bits as a signed value. */
  goog.math.Long.prototype.getLowBits = function() {
    return this.low_;
  };


  /** @return {number} The low 32-bits as an unsigned value. */
  goog.math.Long.prototype.getLowBitsUnsigned = function() {
    return (this.low_ >= 0) ?
        this.low_ : goog.math.Long.TWO_PWR_32_DBL_ + this.low_;
  };


  /**
   * @return {number} Returns the number of bits needed to represent the absolute
   *     value of this Long.
   */
  goog.math.Long.prototype.getNumBitsAbs = function() {
    if (this.isNegative()) {
      if (this.equals(goog.math.Long.MIN_VALUE)) {
        return 64;
      } else {
        return this.negate().getNumBitsAbs();
      }
    } else {
      var val = this.high_ != 0 ? this.high_ : this.low_;
      for (var bit = 31; bit > 0; bit--) {
        if ((val & (1 << bit)) != 0) {
          break;
        }
      }
      return this.high_ != 0 ? bit + 33 : bit + 1;
    }
  };


  /** @return {boolean} Whether this value is zero. */
  goog.math.Long.prototype.isZero = function() {
    return this.high_ == 0 && this.low_ == 0;
  };


  /** @return {boolean} Whether this value is negative. */
  goog.math.Long.prototype.isNegative = function() {
    return this.high_ < 0;
  };


  /** @return {boolean} Whether this value is odd. */
  goog.math.Long.prototype.isOdd = function() {
    return (this.low_ & 1) == 1;
  };


  /**
   * @param {goog.math.Long} other Long to compare against.
   * @return {boolean} Whether this Long equals the other.
   */
  goog.math.Long.prototype.equals = function(other) {
    return (this.high_ == other.high_) && (this.low_ == other.low_);
  };


  /**
   * @param {goog.math.Long} other Long to compare against.
   * @return {boolean} Whether this Long does not equal the other.
   */
  goog.math.Long.prototype.notEquals = function(other) {
    return (this.high_ != other.high_) || (this.low_ != other.low_);
  };


  /**
   * @param {goog.math.Long} other Long to compare against.
   * @return {boolean} Whether this Long is less than the other.
   */
  goog.math.Long.prototype.lessThan = function(other) {
    return this.compare(other) < 0;
  };


  /**
   * @param {goog.math.Long} other Long to compare against.
   * @return {boolean} Whether this Long is less than or equal to the other.
   */
  goog.math.Long.prototype.lessThanOrEqual = function(other) {
    return this.compare(other) <= 0;
  };


  /**
   * @param {goog.math.Long} other Long to compare against.
   * @return {boolean} Whether this Long is greater than the other.
   */
  goog.math.Long.prototype.greaterThan = function(other) {
    return this.compare(other) > 0;
  };


  /**
   * @param {goog.math.Long} other Long to compare against.
   * @return {boolean} Whether this Long is greater than or equal to the other.
   */
  goog.math.Long.prototype.greaterThanOrEqual = function(other) {
    return this.compare(other) >= 0;
  };


  /**
   * Compares this Long with the given one.
   * @param {goog.math.Long} other Long to compare against.
   * @return {number} 0 if they are the same, 1 if the this is greater, and -1
   *     if the given one is greater.
   */
  goog.math.Long.prototype.compare = function(other) {
    if (this.equals(other)) {
      return 0;
    }

    var thisNeg = this.isNegative();
    var otherNeg = other.isNegative();
    if (thisNeg && !otherNeg) {
      return -1;
    }
    if (!thisNeg && otherNeg) {
      return 1;
    }

    // at this point, the signs are the same, so subtraction will not overflow
    if (this.subtract(other).isNegative()) {
      return -1;
    } else {
      return 1;
    }
  };


  /** @return {!goog.math.Long} The negation of this value. */
  goog.math.Long.prototype.negate = function() {
    if (this.equals(goog.math.Long.MIN_VALUE)) {
      return goog.math.Long.MIN_VALUE;
    } else {
      return this.not().add(goog.math.Long.ONE);
    }
  };


  /**
   * Returns the sum of this and the given Long.
   * @param {goog.math.Long} other Long to add to this one.
   * @return {!goog.math.Long} The sum of this and the given Long.
   */
  goog.math.Long.prototype.add = function(other) {
    // Divide each number into 4 chunks of 16 bits, and then sum the chunks.

    var a48 = this.high_ >>> 16;
    var a32 = this.high_ & 0xFFFF;
    var a16 = this.low_ >>> 16;
    var a00 = this.low_ & 0xFFFF;

    var b48 = other.high_ >>> 16;
    var b32 = other.high_ & 0xFFFF;
    var b16 = other.low_ >>> 16;
    var b00 = other.low_ & 0xFFFF;

    var c48 = 0, c32 = 0, c16 = 0, c00 = 0;
    c00 += a00 + b00;
    c16 += c00 >>> 16;
    c00 &= 0xFFFF;
    c16 += a16 + b16;
    c32 += c16 >>> 16;
    c16 &= 0xFFFF;
    c32 += a32 + b32;
    c48 += c32 >>> 16;
    c32 &= 0xFFFF;
    c48 += a48 + b48;
    c48 &= 0xFFFF;
    return goog.math.Long.fromBits((c16 << 16) | c00, (c48 << 16) | c32);
  };


  /**
   * Returns the difference of this and the given Long.
   * @param {goog.math.Long} other Long to subtract from this.
   * @return {!goog.math.Long} The difference of this and the given Long.
   */
  goog.math.Long.prototype.subtract = function(other) {
    return this.add(other.negate());
  };


  /**
   * Returns the product of this and the given long.
   * @param {goog.math.Long} other Long to multiply with this.
   * @return {!goog.math.Long} The product of this and the other.
   */
  goog.math.Long.prototype.multiply = function(other) {
    if (this.isZero()) {
      return goog.math.Long.ZERO;
    } else if (other.isZero()) {
      return goog.math.Long.ZERO;
    }

    if (this.equals(goog.math.Long.MIN_VALUE)) {
      return other.isOdd() ? goog.math.Long.MIN_VALUE : goog.math.Long.ZERO;
    } else if (other.equals(goog.math.Long.MIN_VALUE)) {
      return this.isOdd() ? goog.math.Long.MIN_VALUE : goog.math.Long.ZERO;
    }

    if (this.isNegative()) {
      if (other.isNegative()) {
        return this.negate().multiply(other.negate());
      } else {
        return this.negate().multiply(other).negate();
      }
    } else if (other.isNegative()) {
      return this.multiply(other.negate()).negate();
    }

    // If both longs are small, use float multiplication
    if (this.lessThan(goog.math.Long.TWO_PWR_24_) &&
        other.lessThan(goog.math.Long.TWO_PWR_24_)) {
      return goog.math.Long.fromNumber(this.toNumber() * other.toNumber());
    }

    // Divide each long into 4 chunks of 16 bits, and then add up 4x4 products.
    // We can skip products that would overflow.

    var a48 = this.high_ >>> 16;
    var a32 = this.high_ & 0xFFFF;
    var a16 = this.low_ >>> 16;
    var a00 = this.low_ & 0xFFFF;

    var b48 = other.high_ >>> 16;
    var b32 = other.high_ & 0xFFFF;
    var b16 = other.low_ >>> 16;
    var b00 = other.low_ & 0xFFFF;

    var c48 = 0, c32 = 0, c16 = 0, c00 = 0;
    c00 += a00 * b00;
    c16 += c00 >>> 16;
    c00 &= 0xFFFF;
    c16 += a16 * b00;
    c32 += c16 >>> 16;
    c16 &= 0xFFFF;
    c16 += a00 * b16;
    c32 += c16 >>> 16;
    c16 &= 0xFFFF;
    c32 += a32 * b00;
    c48 += c32 >>> 16;
    c32 &= 0xFFFF;
    c32 += a16 * b16;
    c48 += c32 >>> 16;
    c32 &= 0xFFFF;
    c32 += a00 * b32;
    c48 += c32 >>> 16;
    c32 &= 0xFFFF;
    c48 += a48 * b00 + a32 * b16 + a16 * b32 + a00 * b48;
    c48 &= 0xFFFF;
    return goog.math.Long.fromBits((c16 << 16) | c00, (c48 << 16) | c32);
  };


  /**
   * Returns this Long divided by the given one.
   * @param {goog.math.Long} other Long by which to divide.
   * @return {!goog.math.Long} This Long divided by the given one.
   */
  goog.math.Long.prototype.div = function(other) {
    if (other.isZero()) {
      throw Error('division by zero');
    } else if (this.isZero()) {
      return goog.math.Long.ZERO;
    }

    if (this.equals(goog.math.Long.MIN_VALUE)) {
      if (other.equals(goog.math.Long.ONE) ||
          other.equals(goog.math.Long.NEG_ONE)) {
        return goog.math.Long.MIN_VALUE;  // recall that -MIN_VALUE == MIN_VALUE
      } else if (other.equals(goog.math.Long.MIN_VALUE)) {
        return goog.math.Long.ONE;
      } else {
        // At this point, we have |other| >= 2, so |this/other| < |MIN_VALUE|.
        var halfThis = this.shiftRight(1);
        var approx = halfThis.div(other).shiftLeft(1);
        if (approx.equals(goog.math.Long.ZERO)) {
          return other.isNegative() ? goog.math.Long.ONE : goog.math.Long.NEG_ONE;
        } else {
          var rem = this.subtract(other.multiply(approx));
          var result = approx.add(rem.div(other));
          return result;
        }
      }
    } else if (other.equals(goog.math.Long.MIN_VALUE)) {
      return goog.math.Long.ZERO;
    }

    if (this.isNegative()) {
      if (other.isNegative()) {
        return this.negate().div(other.negate());
      } else {
        return this.negate().div(other).negate();
      }
    } else if (other.isNegative()) {
      return this.div(other.negate()).negate();
    }

    // Repeat the following until the remainder is less than other:  find a
    // floating-point that approximates remainder / other *from below*, add this
    // into the result, and subtract it from the remainder.  It is critical that
    // the approximate value is less than or equal to the real value so that the
    // remainder never becomes negative.
    var res = goog.math.Long.ZERO;
    var rem = this;
    while (rem.greaterThanOrEqual(other)) {
      // Approximate the result of division. This may be a little greater or
      // smaller than the actual value.
      var approx = Math.max(1, Math.floor(rem.toNumber() / other.toNumber()));

      // We will tweak the approximate result by changing it in the 48-th digit or
      // the smallest non-fractional digit, whichever is larger.
      var log2 = Math.ceil(Math.log(approx) / Math.LN2);
      var delta = (log2 <= 48) ? 1 : Math.pow(2, log2 - 48);

      // Decrease the approximation until it is smaller than the remainder.  Note
      // that if it is too large, the product overflows and is negative.
      var approxRes = goog.math.Long.fromNumber(approx);
      var approxRem = approxRes.multiply(other);
      while (approxRem.isNegative() || approxRem.greaterThan(rem)) {
        approx -= delta;
        approxRes = goog.math.Long.fromNumber(approx);
        approxRem = approxRes.multiply(other);
      }

      // We know the answer can't be zero... and actually, zero would cause
      // infinite recursion since we would make no progress.
      if (approxRes.isZero()) {
        approxRes = goog.math.Long.ONE;
      }

      res = res.add(approxRes);
      rem = rem.subtract(approxRem);
    }
    return res;
  };


  /**
   * Returns this Long modulo the given one.
   * @param {goog.math.Long} other Long by which to mod.
   * @return {!goog.math.Long} This Long modulo the given one.
   */
  goog.math.Long.prototype.modulo = function(other) {
    return this.subtract(this.div(other).multiply(other));
  };


  /** @return {!goog.math.Long} The bitwise-NOT of this value. */
  goog.math.Long.prototype.not = function() {
    return goog.math.Long.fromBits(~this.low_, ~this.high_);
  };


  /**
   * Returns the bitwise-AND of this Long and the given one.
   * @param {goog.math.Long} other The Long with which to AND.
   * @return {!goog.math.Long} The bitwise-AND of this and the other.
   */
  goog.math.Long.prototype.and = function(other) {
    return goog.math.Long.fromBits(this.low_ & other.low_,
                                   this.high_ & other.high_);
  };


  /**
   * Returns the bitwise-OR of this Long and the given one.
   * @param {goog.math.Long} other The Long with which to OR.
   * @return {!goog.math.Long} The bitwise-OR of this and the other.
   */
  goog.math.Long.prototype.or = function(other) {
    return goog.math.Long.fromBits(this.low_ | other.low_,
                                   this.high_ | other.high_);
  };


  /**
   * Returns the bitwise-XOR of this Long and the given one.
   * @param {goog.math.Long} other The Long with which to XOR.
   * @return {!goog.math.Long} The bitwise-XOR of this and the other.
   */
  goog.math.Long.prototype.xor = function(other) {
    return goog.math.Long.fromBits(this.low_ ^ other.low_,
                                   this.high_ ^ other.high_);
  };


  /**
   * Returns this Long with bits shifted to the left by the given amount.
   * @param {number} numBits The number of bits by which to shift.
   * @return {!goog.math.Long} This shifted to the left by the given amount.
   */
  goog.math.Long.prototype.shiftLeft = function(numBits) {
    numBits &= 63;
    if (numBits == 0) {
      return this;
    } else {
      var low = this.low_;
      if (numBits < 32) {
        var high = this.high_;
        return goog.math.Long.fromBits(
            low << numBits,
            (high << numBits) | (low >>> (32 - numBits)));
      } else {
        return goog.math.Long.fromBits(0, low << (numBits - 32));
      }
    }
  };


  /**
   * Returns this Long with bits shifted to the right by the given amount.
   * @param {number} numBits The number of bits by which to shift.
   * @return {!goog.math.Long} This shifted to the right by the given amount.
   */
  goog.math.Long.prototype.shiftRight = function(numBits) {
    numBits &= 63;
    if (numBits == 0) {
      return this;
    } else {
      var high = this.high_;
      if (numBits < 32) {
        var low = this.low_;
        return goog.math.Long.fromBits(
            (low >>> numBits) | (high << (32 - numBits)),
            high >> numBits);
      } else {
        return goog.math.Long.fromBits(
            high >> (numBits - 32),
            high >= 0 ? 0 : -1);
      }
    }
  };


  /**
   * Returns this Long with bits shifted to the right by the given amount, with
   * the new top bits matching the current sign bit.
   * @param {number} numBits The number of bits by which to shift.
   * @return {!goog.math.Long} This shifted to the right by the given amount, with
   *     zeros placed into the new leading bits.
   */
  goog.math.Long.prototype.shiftRightUnsigned = function(numBits) {
    numBits &= 63;
    if (numBits == 0) {
      return this;
    } else {
      var high = this.high_;
      if (numBits < 32) {
        var low = this.low_;
        return goog.math.Long.fromBits(
            (low >>> numBits) | (high << (32 - numBits)),
            high >>> numBits);
      } else if (numBits == 32) {
        return goog.math.Long.fromBits(high, 0);
      } else {
        return goog.math.Long.fromBits(high >>> (numBits - 32), 0);
      }
    }
  };

  //======= begin jsbn =======

  var navigator = { appName: 'Modern Browser' }; // polyfill a little

  // Copyright (c) 2005  Tom Wu
  // All Rights Reserved.
  // http://www-cs-students.stanford.edu/~tjw/jsbn/

  /*
   * Copyright (c) 2003-2005  Tom Wu
   * All Rights Reserved.
   *
   * Permission is hereby granted, free of charge, to any person obtaining
   * a copy of this software and associated documentation files (the
   * "Software"), to deal in the Software without restriction, including
   * without limitation the rights to use, copy, modify, merge, publish,
   * distribute, sublicense, and/or sell copies of the Software, and to
   * permit persons to whom the Software is furnished to do so, subject to
   * the following conditions:
   *
   * The above copyright notice and this permission notice shall be
   * included in all copies or substantial portions of the Software.
   *
   * THE SOFTWARE IS PROVIDED "AS-IS" AND WITHOUT WARRANTY OF ANY KIND, 
   * EXPRESS, IMPLIED OR OTHERWISE, INCLUDING WITHOUT LIMITATION, ANY 
   * WARRANTY OF MERCHANTABILITY OR FITNESS FOR A PARTICULAR PURPOSE.  
   *
   * IN NO EVENT SHALL TOM WU BE LIABLE FOR ANY SPECIAL, INCIDENTAL,
   * INDIRECT OR CONSEQUENTIAL DAMAGES OF ANY KIND, OR ANY DAMAGES WHATSOEVER
   * RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER OR NOT ADVISED OF
   * THE POSSIBILITY OF DAMAGE, AND ON ANY THEORY OF LIABILITY, ARISING OUT
   * OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
   *
   * In addition, the following condition applies:
   *
   * All redistributions must retain an intact copy of this copyright notice
   * and disclaimer.
   */

  // Basic JavaScript BN library - subset useful for RSA encryption.

  // Bits per digit
  var dbits;

  // JavaScript engine analysis
  var canary = 0xdeadbeefcafe;
  var j_lm = ((canary&0xffffff)==0xefcafe);

  // (public) Constructor
  function BigInteger(a,b,c) {
    if(a != null)
      if("number" == typeof a) this.fromNumber(a,b,c);
      else if(b == null && "string" != typeof a) this.fromString(a,256);
      else this.fromString(a,b);
  }

  // return new, unset BigInteger
  function nbi() { return new BigInteger(null); }

  // am: Compute w_j += (x*this_i), propagate carries,
  // c is initial carry, returns final carry.
  // c < 3*dvalue, x < 2*dvalue, this_i < dvalue
  // We need to select the fastest one that works in this environment.

  // am1: use a single mult and divide to get the high bits,
  // max digit bits should be 26 because
  // max internal value = 2*dvalue^2-2*dvalue (< 2^53)
  function am1(i,x,w,j,c,n) {
    while(--n >= 0) {
      var v = x*this[i++]+w[j]+c;
      c = Math.floor(v/0x4000000);
      w[j++] = v&0x3ffffff;
    }
    return c;
  }
  // am2 avoids a big mult-and-extract completely.
  // Max digit bits should be <= 30 because we do bitwise ops
  // on values up to 2*hdvalue^2-hdvalue-1 (< 2^31)
  function am2(i,x,w,j,c,n) {
    var xl = x&0x7fff, xh = x>>15;
    while(--n >= 0) {
      var l = this[i]&0x7fff;
      var h = this[i++]>>15;
      var m = xh*l+h*xl;
      l = xl*l+((m&0x7fff)<<15)+w[j]+(c&0x3fffffff);
      c = (l>>>30)+(m>>>15)+xh*h+(c>>>30);
      w[j++] = l&0x3fffffff;
    }
    return c;
  }
  // Alternately, set max digit bits to 28 since some
  // browsers slow down when dealing with 32-bit numbers.
  function am3(i,x,w,j,c,n) {
    var xl = x&0x3fff, xh = x>>14;
    while(--n >= 0) {
      var l = this[i]&0x3fff;
      var h = this[i++]>>14;
      var m = xh*l+h*xl;
      l = xl*l+((m&0x3fff)<<14)+w[j]+c;
      c = (l>>28)+(m>>14)+xh*h;
      w[j++] = l&0xfffffff;
    }
    return c;
  }
  if(j_lm && (navigator.appName == "Microsoft Internet Explorer")) {
    BigInteger.prototype.am = am2;
    dbits = 30;
  }
  else if(j_lm && (navigator.appName != "Netscape")) {
    BigInteger.prototype.am = am1;
    dbits = 26;
  }
  else { // Mozilla/Netscape seems to prefer am3
    BigInteger.prototype.am = am3;
    dbits = 28;
  }

  BigInteger.prototype.DB = dbits;
  BigInteger.prototype.DM = ((1<<dbits)-1);
  BigInteger.prototype.DV = (1<<dbits);

  var BI_FP = 52;
  BigInteger.prototype.FV = Math.pow(2,BI_FP);
  BigInteger.prototype.F1 = BI_FP-dbits;
  BigInteger.prototype.F2 = 2*dbits-BI_FP;

  // Digit conversions
  var BI_RM = "0123456789abcdefghijklmnopqrstuvwxyz";
  var BI_RC = new Array();
  var rr,vv;
  rr = "0".charCodeAt(0);
  for(vv = 0; vv <= 9; ++vv) BI_RC[rr++] = vv;
  rr = "a".charCodeAt(0);
  for(vv = 10; vv < 36; ++vv) BI_RC[rr++] = vv;
  rr = "A".charCodeAt(0);
  for(vv = 10; vv < 36; ++vv) BI_RC[rr++] = vv;

  function int2char(n) { return BI_RM.charAt(n); }
  function intAt(s,i) {
    var c = BI_RC[s.charCodeAt(i)];
    return (c==null)?-1:c;
  }

  // (protected) copy this to r
  function bnpCopyTo(r) {
    for(var i = this.t-1; i >= 0; --i) r[i] = this[i];
    r.t = this.t;
    r.s = this.s;
  }

  // (protected) set from integer value x, -DV <= x < DV
  function bnpFromInt(x) {
    this.t = 1;
    this.s = (x<0)?-1:0;
    if(x > 0) this[0] = x;
    else if(x < -1) this[0] = x+DV;
    else this.t = 0;
  }

  // return bigint initialized to value
  function nbv(i) { var r = nbi(); r.fromInt(i); return r; }

  // (protected) set from string and radix
  function bnpFromString(s,b) {
    var k;
    if(b == 16) k = 4;
    else if(b == 8) k = 3;
    else if(b == 256) k = 8; // byte array
    else if(b == 2) k = 1;
    else if(b == 32) k = 5;
    else if(b == 4) k = 2;
    else { this.fromRadix(s,b); return; }
    this.t = 0;
    this.s = 0;
    var i = s.length, mi = false, sh = 0;
    while(--i >= 0) {
      var x = (k==8)?s[i]&0xff:intAt(s,i);
      if(x < 0) {
        if(s.charAt(i) == "-") mi = true;
        continue;
      }
      mi = false;
      if(sh == 0)
        this[this.t++] = x;
      else if(sh+k > this.DB) {
        this[this.t-1] |= (x&((1<<(this.DB-sh))-1))<<sh;
        this[this.t++] = (x>>(this.DB-sh));
      }
      else
        this[this.t-1] |= x<<sh;
      sh += k;
      if(sh >= this.DB) sh -= this.DB;
    }
    if(k == 8 && (s[0]&0x80) != 0) {
      this.s = -1;
      if(sh > 0) this[this.t-1] |= ((1<<(this.DB-sh))-1)<<sh;
    }
    this.clamp();
    if(mi) BigInteger.ZERO.subTo(this,this);
  }

  // (protected) clamp off excess high words
  function bnpClamp() {
    var c = this.s&this.DM;
    while(this.t > 0 && this[this.t-1] == c) --this.t;
  }

  // (public) return string representation in given radix
  function bnToString(b) {
    if(this.s < 0) return "-"+this.negate().toString(b);
    var k;
    if(b == 16) k = 4;
    else if(b == 8) k = 3;
    else if(b == 2) k = 1;
    else if(b == 32) k = 5;
    else if(b == 4) k = 2;
    else return this.toRadix(b);
    var km = (1<<k)-1, d, m = false, r = "", i = this.t;
    var p = this.DB-(i*this.DB)%k;
    if(i-- > 0) {
      if(p < this.DB && (d = this[i]>>p) > 0) { m = true; r = int2char(d); }
      while(i >= 0) {
        if(p < k) {
          d = (this[i]&((1<<p)-1))<<(k-p);
          d |= this[--i]>>(p+=this.DB-k);
        }
        else {
          d = (this[i]>>(p-=k))&km;
          if(p <= 0) { p += this.DB; --i; }
        }
        if(d > 0) m = true;
        if(m) r += int2char(d);
      }
    }
    return m?r:"0";
  }

  // (public) -this
  function bnNegate() { var r = nbi(); BigInteger.ZERO.subTo(this,r); return r; }

  // (public) |this|
  function bnAbs() { return (this.s<0)?this.negate():this; }

  // (public) return + if this > a, - if this < a, 0 if equal
  function bnCompareTo(a) {
    var r = this.s-a.s;
    if(r != 0) return r;
    var i = this.t;
    r = i-a.t;
    if(r != 0) return (this.s<0)?-r:r;
    while(--i >= 0) if((r=this[i]-a[i]) != 0) return r;
    return 0;
  }

  // returns bit length of the integer x
  function nbits(x) {
    var r = 1, t;
    if((t=x>>>16) != 0) { x = t; r += 16; }
    if((t=x>>8) != 0) { x = t; r += 8; }
    if((t=x>>4) != 0) { x = t; r += 4; }
    if((t=x>>2) != 0) { x = t; r += 2; }
    if((t=x>>1) != 0) { x = t; r += 1; }
    return r;
  }

  // (public) return the number of bits in "this"
  function bnBitLength() {
    if(this.t <= 0) return 0;
    return this.DB*(this.t-1)+nbits(this[this.t-1]^(this.s&this.DM));
  }

  // (protected) r = this << n*DB
  function bnpDLShiftTo(n,r) {
    var i;
    for(i = this.t-1; i >= 0; --i) r[i+n] = this[i];
    for(i = n-1; i >= 0; --i) r[i] = 0;
    r.t = this.t+n;
    r.s = this.s;
  }

  // (protected) r = this >> n*DB
  function bnpDRShiftTo(n,r) {
    for(var i = n; i < this.t; ++i) r[i-n] = this[i];
    r.t = Math.max(this.t-n,0);
    r.s = this.s;
  }

  // (protected) r = this << n
  function bnpLShiftTo(n,r) {
    var bs = n%this.DB;
    var cbs = this.DB-bs;
    var bm = (1<<cbs)-1;
    var ds = Math.floor(n/this.DB), c = (this.s<<bs)&this.DM, i;
    for(i = this.t-1; i >= 0; --i) {
      r[i+ds+1] = (this[i]>>cbs)|c;
      c = (this[i]&bm)<<bs;
    }
    for(i = ds-1; i >= 0; --i) r[i] = 0;
    r[ds] = c;
    r.t = this.t+ds+1;
    r.s = this.s;
    r.clamp();
  }

  // (protected) r = this >> n
  function bnpRShiftTo(n,r) {
    r.s = this.s;
    var ds = Math.floor(n/this.DB);
    if(ds >= this.t) { r.t = 0; return; }
    var bs = n%this.DB;
    var cbs = this.DB-bs;
    var bm = (1<<bs)-1;
    r[0] = this[ds]>>bs;
    for(var i = ds+1; i < this.t; ++i) {
      r[i-ds-1] |= (this[i]&bm)<<cbs;
      r[i-ds] = this[i]>>bs;
    }
    if(bs > 0) r[this.t-ds-1] |= (this.s&bm)<<cbs;
    r.t = this.t-ds;
    r.clamp();
  }

  // (protected) r = this - a
  function bnpSubTo(a,r) {
    var i = 0, c = 0, m = Math.min(a.t,this.t);
    while(i < m) {
      c += this[i]-a[i];
      r[i++] = c&this.DM;
      c >>= this.DB;
    }
    if(a.t < this.t) {
      c -= a.s;
      while(i < this.t) {
        c += this[i];
        r[i++] = c&this.DM;
        c >>= this.DB;
      }
      c += this.s;
    }
    else {
      c += this.s;
      while(i < a.t) {
        c -= a[i];
        r[i++] = c&this.DM;
        c >>= this.DB;
      }
      c -= a.s;
    }
    r.s = (c<0)?-1:0;
    if(c < -1) r[i++] = this.DV+c;
    else if(c > 0) r[i++] = c;
    r.t = i;
    r.clamp();
  }

  // (protected) r = this * a, r != this,a (HAC 14.12)
  // "this" should be the larger one if appropriate.
  function bnpMultiplyTo(a,r) {
    var x = this.abs(), y = a.abs();
    var i = x.t;
    r.t = i+y.t;
    while(--i >= 0) r[i] = 0;
    for(i = 0; i < y.t; ++i) r[i+x.t] = x.am(0,y[i],r,i,0,x.t);
    r.s = 0;
    r.clamp();
    if(this.s != a.s) BigInteger.ZERO.subTo(r,r);
  }

  // (protected) r = this^2, r != this (HAC 14.16)
  function bnpSquareTo(r) {
    var x = this.abs();
    var i = r.t = 2*x.t;
    while(--i >= 0) r[i] = 0;
    for(i = 0; i < x.t-1; ++i) {
      var c = x.am(i,x[i],r,2*i,0,1);
      if((r[i+x.t]+=x.am(i+1,2*x[i],r,2*i+1,c,x.t-i-1)) >= x.DV) {
        r[i+x.t] -= x.DV;
        r[i+x.t+1] = 1;
      }
    }
    if(r.t > 0) r[r.t-1] += x.am(i,x[i],r,2*i,0,1);
    r.s = 0;
    r.clamp();
  }

  // (protected) divide this by m, quotient and remainder to q, r (HAC 14.20)
  // r != q, this != m.  q or r may be null.
  function bnpDivRemTo(m,q,r) {
    var pm = m.abs();
    if(pm.t <= 0) return;
    var pt = this.abs();
    if(pt.t < pm.t) {
      if(q != null) q.fromInt(0);
      if(r != null) this.copyTo(r);
      return;
    }
    if(r == null) r = nbi();
    var y = nbi(), ts = this.s, ms = m.s;
    var nsh = this.DB-nbits(pm[pm.t-1]);	// normalize modulus
    if(nsh > 0) { pm.lShiftTo(nsh,y); pt.lShiftTo(nsh,r); }
    else { pm.copyTo(y); pt.copyTo(r); }
    var ys = y.t;
    var y0 = y[ys-1];
    if(y0 == 0) return;
    var yt = y0*(1<<this.F1)+((ys>1)?y[ys-2]>>this.F2:0);
    var d1 = this.FV/yt, d2 = (1<<this.F1)/yt, e = 1<<this.F2;
    var i = r.t, j = i-ys, t = (q==null)?nbi():q;
    y.dlShiftTo(j,t);
    if(r.compareTo(t) >= 0) {
      r[r.t++] = 1;
      r.subTo(t,r);
    }
    BigInteger.ONE.dlShiftTo(ys,t);
    t.subTo(y,y);	// "negative" y so we can replace sub with am later
    while(y.t < ys) y[y.t++] = 0;
    while(--j >= 0) {
      // Estimate quotient digit
      var qd = (r[--i]==y0)?this.DM:Math.floor(r[i]*d1+(r[i-1]+e)*d2);
      if((r[i]+=y.am(0,qd,r,j,0,ys)) < qd) {	// Try it out
        y.dlShiftTo(j,t);
        r.subTo(t,r);
        while(r[i] < --qd) r.subTo(t,r);
      }
    }
    if(q != null) {
      r.drShiftTo(ys,q);
      if(ts != ms) BigInteger.ZERO.subTo(q,q);
    }
    r.t = ys;
    r.clamp();
    if(nsh > 0) r.rShiftTo(nsh,r);	// Denormalize remainder
    if(ts < 0) BigInteger.ZERO.subTo(r,r);
  }

  // (public) this mod a
  function bnMod(a) {
    var r = nbi();
    this.abs().divRemTo(a,null,r);
    if(this.s < 0 && r.compareTo(BigInteger.ZERO) > 0) a.subTo(r,r);
    return r;
  }

  // Modular reduction using "classic" algorithm
  function Classic(m) { this.m = m; }
  function cConvert(x) {
    if(x.s < 0 || x.compareTo(this.m) >= 0) return x.mod(this.m);
    else return x;
  }
  function cRevert(x) { return x; }
  function cReduce(x) { x.divRemTo(this.m,null,x); }
  function cMulTo(x,y,r) { x.multiplyTo(y,r); this.reduce(r); }
  function cSqrTo(x,r) { x.squareTo(r); this.reduce(r); }

  Classic.prototype.convert = cConvert;
  Classic.prototype.revert = cRevert;
  Classic.prototype.reduce = cReduce;
  Classic.prototype.mulTo = cMulTo;
  Classic.prototype.sqrTo = cSqrTo;

  // (protected) return "-1/this % 2^DB"; useful for Mont. reduction
  // justification:
  //         xy == 1 (mod m)
  //         xy =  1+km
  //   xy(2-xy) = (1+km)(1-km)
  // x[y(2-xy)] = 1-k^2m^2
  // x[y(2-xy)] == 1 (mod m^2)
  // if y is 1/x mod m, then y(2-xy) is 1/x mod m^2
  // should reduce x and y(2-xy) by m^2 at each step to keep size bounded.
  // JS multiply "overflows" differently from C/C++, so care is needed here.
  function bnpInvDigit() {
    if(this.t < 1) return 0;
    var x = this[0];
    if((x&1) == 0) return 0;
    var y = x&3;		// y == 1/x mod 2^2
    y = (y*(2-(x&0xf)*y))&0xf;	// y == 1/x mod 2^4
    y = (y*(2-(x&0xff)*y))&0xff;	// y == 1/x mod 2^8
    y = (y*(2-(((x&0xffff)*y)&0xffff)))&0xffff;	// y == 1/x mod 2^16
    // last step - calculate inverse mod DV directly;
    // assumes 16 < DB <= 32 and assumes ability to handle 48-bit ints
    y = (y*(2-x*y%this.DV))%this.DV;		// y == 1/x mod 2^dbits
    // we really want the negative inverse, and -DV < y < DV
    return (y>0)?this.DV-y:-y;
  }

  // Montgomery reduction
  function Montgomery(m) {
    this.m = m;
    this.mp = m.invDigit();
    this.mpl = this.mp&0x7fff;
    this.mph = this.mp>>15;
    this.um = (1<<(m.DB-15))-1;
    this.mt2 = 2*m.t;
  }

  // xR mod m
  function montConvert(x) {
    var r = nbi();
    x.abs().dlShiftTo(this.m.t,r);
    r.divRemTo(this.m,null,r);
    if(x.s < 0 && r.compareTo(BigInteger.ZERO) > 0) this.m.subTo(r,r);
    return r;
  }

  // x/R mod m
  function montRevert(x) {
    var r = nbi();
    x.copyTo(r);
    this.reduce(r);
    return r;
  }

  // x = x/R mod m (HAC 14.32)
  function montReduce(x) {
    while(x.t <= this.mt2)	// pad x so am has enough room later
      x[x.t++] = 0;
    for(var i = 0; i < this.m.t; ++i) {
      // faster way of calculating u0 = x[i]*mp mod DV
      var j = x[i]&0x7fff;
      var u0 = (j*this.mpl+(((j*this.mph+(x[i]>>15)*this.mpl)&this.um)<<15))&x.DM;
      // use am to combine the multiply-shift-add into one call
      j = i+this.m.t;
      x[j] += this.m.am(0,u0,x,i,0,this.m.t);
      // propagate carry
      while(x[j] >= x.DV) { x[j] -= x.DV; x[++j]++; }
    }
    x.clamp();
    x.drShiftTo(this.m.t,x);
    if(x.compareTo(this.m) >= 0) x.subTo(this.m,x);
  }

  // r = "x^2/R mod m"; x != r
  function montSqrTo(x,r) { x.squareTo(r); this.reduce(r); }

  // r = "xy/R mod m"; x,y != r
  function montMulTo(x,y,r) { x.multiplyTo(y,r); this.reduce(r); }

  Montgomery.prototype.convert = montConvert;
  Montgomery.prototype.revert = montRevert;
  Montgomery.prototype.reduce = montReduce;
  Montgomery.prototype.mulTo = montMulTo;
  Montgomery.prototype.sqrTo = montSqrTo;

  // (protected) true iff this is even
  function bnpIsEven() { return ((this.t>0)?(this[0]&1):this.s) == 0; }

  // (protected) this^e, e < 2^32, doing sqr and mul with "r" (HAC 14.79)
  function bnpExp(e,z) {
    if(e > 0xffffffff || e < 1) return BigInteger.ONE;
    var r = nbi(), r2 = nbi(), g = z.convert(this), i = nbits(e)-1;
    g.copyTo(r);
    while(--i >= 0) {
      z.sqrTo(r,r2);
      if((e&(1<<i)) > 0) z.mulTo(r2,g,r);
      else { var t = r; r = r2; r2 = t; }
    }
    return z.revert(r);
  }

  // (public) this^e % m, 0 <= e < 2^32
  function bnModPowInt(e,m) {
    var z;
    if(e < 256 || m.isEven()) z = new Classic(m); else z = new Montgomery(m);
    return this.exp(e,z);
  }

  // protected
  BigInteger.prototype.copyTo = bnpCopyTo;
  BigInteger.prototype.fromInt = bnpFromInt;
  BigInteger.prototype.fromString = bnpFromString;
  BigInteger.prototype.clamp = bnpClamp;
  BigInteger.prototype.dlShiftTo = bnpDLShiftTo;
  BigInteger.prototype.drShiftTo = bnpDRShiftTo;
  BigInteger.prototype.lShiftTo = bnpLShiftTo;
  BigInteger.prototype.rShiftTo = bnpRShiftTo;
  BigInteger.prototype.subTo = bnpSubTo;
  BigInteger.prototype.multiplyTo = bnpMultiplyTo;
  BigInteger.prototype.squareTo = bnpSquareTo;
  BigInteger.prototype.divRemTo = bnpDivRemTo;
  BigInteger.prototype.invDigit = bnpInvDigit;
  BigInteger.prototype.isEven = bnpIsEven;
  BigInteger.prototype.exp = bnpExp;

  // public
  BigInteger.prototype.toString = bnToString;
  BigInteger.prototype.negate = bnNegate;
  BigInteger.prototype.abs = bnAbs;
  BigInteger.prototype.compareTo = bnCompareTo;
  BigInteger.prototype.bitLength = bnBitLength;
  BigInteger.prototype.mod = bnMod;
  BigInteger.prototype.modPowInt = bnModPowInt;

  // "constants"
  BigInteger.ZERO = nbv(0);
  BigInteger.ONE = nbv(1);

  // jsbn2 stuff

  // (protected) convert from radix string
  function bnpFromRadix(s,b) {
    this.fromInt(0);
    if(b == null) b = 10;
    var cs = this.chunkSize(b);
    var d = Math.pow(b,cs), mi = false, j = 0, w = 0;
    for(var i = 0; i < s.length; ++i) {
      var x = intAt(s,i);
      if(x < 0) {
        if(s.charAt(i) == "-" && this.signum() == 0) mi = true;
        continue;
      }
      w = b*w+x;
      if(++j >= cs) {
        this.dMultiply(d);
        this.dAddOffset(w,0);
        j = 0;
        w = 0;
      }
    }
    if(j > 0) {
      this.dMultiply(Math.pow(b,j));
      this.dAddOffset(w,0);
    }
    if(mi) BigInteger.ZERO.subTo(this,this);
  }

  // (protected) return x s.t. r^x < DV
  function bnpChunkSize(r) { return Math.floor(Math.LN2*this.DB/Math.log(r)); }

  // (public) 0 if this == 0, 1 if this > 0
  function bnSigNum() {
    if(this.s < 0) return -1;
    else if(this.t <= 0 || (this.t == 1 && this[0] <= 0)) return 0;
    else return 1;
  }

  // (protected) this *= n, this >= 0, 1 < n < DV
  function bnpDMultiply(n) {
    this[this.t] = this.am(0,n-1,this,0,0,this.t);
    ++this.t;
    this.clamp();
  }

  // (protected) this += n << w words, this >= 0
  function bnpDAddOffset(n,w) {
    if(n == 0) return;
    while(this.t <= w) this[this.t++] = 0;
    this[w] += n;
    while(this[w] >= this.DV) {
      this[w] -= this.DV;
      if(++w >= this.t) this[this.t++] = 0;
      ++this[w];
    }
  }

  // (protected) convert to radix string
  function bnpToRadix(b) {
    if(b == null) b = 10;
    if(this.signum() == 0 || b < 2 || b > 36) return "0";
    var cs = this.chunkSize(b);
    var a = Math.pow(b,cs);
    var d = nbv(a), y = nbi(), z = nbi(), r = "";
    this.divRemTo(d,y,z);
    while(y.signum() > 0) {
      r = (a+z.intValue()).toString(b).substr(1) + r;
      y.divRemTo(d,y,z);
    }
    return z.intValue().toString(b) + r;
  }

  // (public) return value as integer
  function bnIntValue() {
    if(this.s < 0) {
      if(this.t == 1) return this[0]-this.DV;
      else if(this.t == 0) return -1;
    }
    else if(this.t == 1) return this[0];
    else if(this.t == 0) return 0;
    // assumes 16 < DB < 32
    return ((this[1]&((1<<(32-this.DB))-1))<<this.DB)|this[0];
  }

  // (protected) r = this + a
  function bnpAddTo(a,r) {
    var i = 0, c = 0, m = Math.min(a.t,this.t);
    while(i < m) {
      c += this[i]+a[i];
      r[i++] = c&this.DM;
      c >>= this.DB;
    }
    if(a.t < this.t) {
      c += a.s;
      while(i < this.t) {
        c += this[i];
        r[i++] = c&this.DM;
        c >>= this.DB;
      }
      c += this.s;
    }
    else {
      c += this.s;
      while(i < a.t) {
        c += a[i];
        r[i++] = c&this.DM;
        c >>= this.DB;
      }
      c += a.s;
    }
    r.s = (c<0)?-1:0;
    if(c > 0) r[i++] = c;
    else if(c < -1) r[i++] = this.DV+c;
    r.t = i;
    r.clamp();
  }

  BigInteger.prototype.fromRadix = bnpFromRadix;
  BigInteger.prototype.chunkSize = bnpChunkSize;
  BigInteger.prototype.signum = bnSigNum;
  BigInteger.prototype.dMultiply = bnpDMultiply;
  BigInteger.prototype.dAddOffset = bnpDAddOffset;
  BigInteger.prototype.toRadix = bnpToRadix;
  BigInteger.prototype.intValue = bnIntValue;
  BigInteger.prototype.addTo = bnpAddTo;

  //======= end jsbn =======

  // Emscripten wrapper
  var Wrapper = {
    abs: function(l, h) {
      var x = new goog.math.Long(l, h);
      var ret;
      if (x.isNegative()) {
        ret = x.negate();
      } else {
        ret = x;
      }
      HEAP32[tempDoublePtr>>2] = ret.low_;
      HEAP32[tempDoublePtr+4>>2] = ret.high_;
    },
    ensureTemps: function() {
      if (Wrapper.ensuredTemps) return;
      Wrapper.ensuredTemps = true;
      Wrapper.two32 = new BigInteger();
      Wrapper.two32.fromString('4294967296', 10);
      Wrapper.two64 = new BigInteger();
      Wrapper.two64.fromString('18446744073709551616', 10);
      Wrapper.temp1 = new BigInteger();
      Wrapper.temp2 = new BigInteger();
    },
    lh2bignum: function(l, h) {
      var a = new BigInteger();
      a.fromString(h.toString(), 10);
      var b = new BigInteger();
      a.multiplyTo(Wrapper.two32, b);
      var c = new BigInteger();
      c.fromString(l.toString(), 10);
      var d = new BigInteger();
      c.addTo(b, d);
      return d;
    },
    stringify: function(l, h, unsigned) {
      var ret = new goog.math.Long(l, h).toString();
      if (unsigned && ret[0] == '-') {
        // unsign slowly using jsbn bignums
        Wrapper.ensureTemps();
        var bignum = new BigInteger();
        bignum.fromString(ret, 10);
        ret = new BigInteger();
        Wrapper.two64.addTo(bignum, ret);
        ret = ret.toString(10);
      }
      return ret;
    },
    fromString: function(str, base, min, max, unsigned) {
      Wrapper.ensureTemps();
      var bignum = new BigInteger();
      bignum.fromString(str, base);
      var bigmin = new BigInteger();
      bigmin.fromString(min, 10);
      var bigmax = new BigInteger();
      bigmax.fromString(max, 10);
      if (unsigned && bignum.compareTo(BigInteger.ZERO) < 0) {
        var temp = new BigInteger();
        bignum.addTo(Wrapper.two64, temp);
        bignum = temp;
      }
      var error = false;
      if (bignum.compareTo(bigmin) < 0) {
        bignum = bigmin;
        error = true;
      } else if (bignum.compareTo(bigmax) > 0) {
        bignum = bigmax;
        error = true;
      }
      var ret = goog.math.Long.fromString(bignum.toString()); // min-max checks should have clamped this to a range goog.math.Long can handle well
      HEAP32[tempDoublePtr>>2] = ret.low_;
      HEAP32[tempDoublePtr+4>>2] = ret.high_;
      if (error) throw 'range error';
    }
  };
  return Wrapper;
})();

//======= end closure i64 code =======



// === Auto-generated postamble setup entry stuff ===

if (memoryInitializer) {
  if (ENVIRONMENT_IS_NODE || ENVIRONMENT_IS_SHELL) {
    var data = Module['readBinary'](memoryInitializer);
    HEAPU8.set(data, STATIC_BASE);
  } else {
    addRunDependency('memory initializer');
    Browser.asyncLoad(memoryInitializer, function(data) {
      HEAPU8.set(data, STATIC_BASE);
      removeRunDependency('memory initializer');
    }, function(data) {
      throw 'could not load memory initializer ' + memoryInitializer;
    });
  }
}

function ExitStatus(status) {
  this.name = "ExitStatus";
  this.message = "Program terminated with exit(" + status + ")";
  this.status = status;
};
ExitStatus.prototype = new Error();
ExitStatus.prototype.constructor = ExitStatus;

var initialStackTop;
var preloadStartTime = null;
var calledMain = false;

dependenciesFulfilled = function runCaller() {
  // If run has never been called, and we should call run (INVOKE_RUN is true, and Module.noInitialRun is not false)
  if (!Module['calledRun'] && shouldRunNow) run();
  if (!Module['calledRun']) dependenciesFulfilled = runCaller; // try this again later, after new deps are fulfilled
}

Module['callMain'] = Module.callMain = function callMain(args) {
  assert(runDependencies == 0, 'cannot call main when async dependencies remain! (listen on __ATMAIN__)');
  assert(__ATPRERUN__.length == 0, 'cannot call main when preRun functions remain to be called');

  args = args || [];

  ensureInitRuntime();

  var argc = args.length+1;
  function pad() {
    for (var i = 0; i < 4-1; i++) {
      argv.push(0);
    }
  }
  var argv = [allocate(intArrayFromString("/bin/this.program"), 'i8', ALLOC_NORMAL) ];
  pad();
  for (var i = 0; i < argc-1; i = i + 1) {
    argv.push(allocate(intArrayFromString(args[i]), 'i8', ALLOC_NORMAL));
    pad();
  }
  argv.push(0);
  argv = allocate(argv, 'i32', ALLOC_NORMAL);

  initialStackTop = STACKTOP;

  try {

    var ret = Module['_main'](argc, argv, 0);


    // if we're not running an evented main loop, it's time to exit
    if (!Module['noExitRuntime']) {
      exit(ret);
    }
  }
  catch(e) {
    if (e instanceof ExitStatus) {
      // exit() throws this once it's done to make sure execution
      // has been stopped completely
      return;
    } else if (e == 'SimulateInfiniteLoop') {
      // running an evented main loop, don't immediately exit
      Module['noExitRuntime'] = true;
      return;
    } else {
      if (e && typeof e === 'object' && e.stack) Module.printErr('exception thrown: ' + [e, e.stack]);
      throw e;
    }
  } finally {
    calledMain = true;
  }
}




function run(args) {
  args = args || Module['arguments'];

  if (preloadStartTime === null) preloadStartTime = Date.now();

  if (runDependencies > 0) {
    Module.printErr('run() called, but dependencies remain, so not running');
    return;
  }

  preRun();

  if (runDependencies > 0) return; // a preRun added a dependency, run will be called later
  if (Module['calledRun']) return; // run may have just been called through dependencies being fulfilled just in this very frame

  function doRun() {
    if (Module['calledRun']) return; // run may have just been called while the async setStatus time below was happening
    Module['calledRun'] = true;

    ensureInitRuntime();

    preMain();

    if (ENVIRONMENT_IS_WEB && preloadStartTime !== null) {
      Module.printErr('pre-main prep time: ' + (Date.now() - preloadStartTime) + ' ms');
    }

    if (Module['_main'] && shouldRunNow) {
      Module['callMain'](args);
    }

    postRun();
  }

  if (Module['setStatus']) {
    Module['setStatus']('Running...');
    setTimeout(function() {
      setTimeout(function() {
        Module['setStatus']('');
      }, 1);
      if (!ABORT) doRun();
    }, 1);
  } else {
    doRun();
  }
}
Module['run'] = Module.run = run;

function exit(status) {
  ABORT = true;
  EXITSTATUS = status;
  STACKTOP = initialStackTop;

  // exit the runtime
  exitRuntime();

  // TODO We should handle this differently based on environment.
  // In the browser, the best we can do is throw an exception
  // to halt execution, but in node we could process.exit and
  // I'd imagine SM shell would have something equivalent.
  // This would let us set a proper exit status (which
  // would be great for checking test exit statuses).
  // https://github.com/kripken/emscripten/issues/1371

  // throw an exception to halt the current execution
  throw new ExitStatus(status);
}
Module['exit'] = Module.exit = exit;

function abort(text) {
  if (text) {
    Module.print(text);
    Module.printErr(text);
  }

  ABORT = true;
  EXITSTATUS = 1;

  var extra = '\nIf this abort() is unexpected, build with -s ASSERTIONS=1 which can give more information.';

  throw 'abort() at ' + stackTrace() + extra;
}
Module['abort'] = Module.abort = abort;

// {{PRE_RUN_ADDITIONS}}

if (Module['preInit']) {
  if (typeof Module['preInit'] == 'function') Module['preInit'] = [Module['preInit']];
  while (Module['preInit'].length > 0) {
    Module['preInit'].pop()();
  }
}

// shouldRunNow refers to calling main(), not run().
var shouldRunNow = true;
if (Module['noInitialRun']) {
  shouldRunNow = false;
}


run();

// {{POST_RUN_ADDITIONS}}






// {{MODULE_ADDITIONS}}






