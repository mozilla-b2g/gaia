/*
 * This is an "optimized" JS file from the gaia-email-libs-and-more project that
 * is checked-in as a vendor artifact.  The repo is at:
 * https://github.com/mozilla-b2g/gaia-email-libs-and-more
 *
 * It is created by the gaia-email-opt.js Makefile target.
 *
 * Right now the file is concatenated (with comments left intact) as opposed to
 * minified so that 1) if you need do debug things, you're not looking at
 * gobblety-gook, 2) the diffs will make sense, and 3) repo size shouldn't bloat
 * as badly as if it was minified since line diffs should be fairly stable and
 * minimal.
 */
(function() {

/**
 * almond 0.0.3 Copyright (c) 2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/almond for details
 */
/*jslint strict: false, plusplus: false */
/*global setTimeout: false */

var requirejs, require, define;
(function (undef) {

    var defined = {},
        waiting = {},
        aps = [].slice,
        main, req;

    if (typeof define === "function") {
        //If a define is already in play via another AMD loader,
        //do not overwrite.
        return;
    }

    /**
     * Given a relative module name, like ./something, normalize it to
     * a real name that can be mapped to a path.
     * @param {String} name the relative name
     * @param {String} baseName a real name that the name arg is relative
     * to.
     * @returns {String} normalized name
     */
    function normalize(name, baseName) {
        //Adjust any relative paths.
        if (name && name.charAt(0) === ".") {
            //If have a base name, try to normalize against it,
            //otherwise, assume it is a top-level require that will
            //be relative to baseUrl in the end.
            if (baseName) {
                //Convert baseName to array, and lop off the last part,
                //so that . matches that "directory" and not name of the baseName's
                //module. For instance, baseName of "one/two/three", maps to
                //"one/two/three.js", but we want the directory, "one/two" for
                //this normalization.
                baseName = baseName.split("/");
                baseName = baseName.slice(0, baseName.length - 1);

                name = baseName.concat(name.split("/"));

                //start trimDots
                var i, part;
                for (i = 0; (part = name[i]); i++) {
                    if (part === ".") {
                        name.splice(i, 1);
                        i -= 1;
                    } else if (part === "..") {
                        if (i === 1 && (name[2] === '..' || name[0] === '..')) {
                            //End of the line. Keep at least one non-dot
                            //path segment at the front so it can be mapped
                            //correctly to disk. Otherwise, there is likely
                            //no path mapping for a path starting with '..'.
                            //This can still fail, but catches the most reasonable
                            //uses of ..
                            break;
                        } else if (i > 0) {
                            name.splice(i - 1, 2);
                            i -= 2;
                        }
                    }
                }
                //end trimDots

                name = name.join("/");
            }
        }
        return name;
    }

    function makeRequire(relName, forceSync) {
        return function () {
            //A version of a require function that passes a moduleName
            //value for items that may need to
            //look up paths relative to the moduleName
            return req.apply(undef, aps.call(arguments, 0).concat([relName, forceSync]));
        };
    }

    function makeNormalize(relName) {
        return function (name) {
            return normalize(name, relName);
        };
    }

    function makeLoad(depName) {
        return function (value) {
            defined[depName] = value;
        };
    }

    function callDep(name) {
        if (waiting.hasOwnProperty(name)) {
            var args = waiting[name];
            delete waiting[name];
            main.apply(undef, args);
        }
        return defined[name];
    }

    /**
     * Makes a name map, normalizing the name, and using a plugin
     * for normalization if necessary. Grabs a ref to plugin
     * too, as an optimization.
     */
    function makeMap(name, relName) {
        var prefix, plugin,
            index = name.indexOf('!');

        if (index !== -1) {
            prefix = normalize(name.slice(0, index), relName);
            name = name.slice(index + 1);
            plugin = callDep(prefix);

            //Normalize according
            if (plugin && plugin.normalize) {
                name = plugin.normalize(name, makeNormalize(relName));
            } else {
                name = normalize(name, relName);
            }
        } else {
            name = normalize(name, relName);
        }

        //Using ridiculous property names for space reasons
        return {
            f: prefix ? prefix + '!' + name : name, //fullName
            n: name,
            p: plugin
        };
    }

    main = function (name, deps, callback, relName) {
        var args = [],
            usingExports,
            cjsModule, depName, i, ret, map;

        //Use name if no relName
        if (!relName) {
            relName = name;
        }

        //Call the callback to define the module, if necessary.
        if (typeof callback === 'function') {

            //Default to require, exports, module if no deps if
            //the factory arg has any arguments specified.
            if (!deps.length && callback.length) {
                deps = ['require', 'exports', 'module'];
            }

            //Pull out the defined dependencies and pass the ordered
            //values to the callback.
            for (i = 0; i < deps.length; i++) {
                map = makeMap(deps[i], relName);
                depName = map.f;

                //Fast path CommonJS standard dependencies.
                if (depName === "require") {
                    args[i] = makeRequire(name);
                } else if (depName === "exports") {
                    //CommonJS module spec 1.1
                    args[i] = defined[name] = {};
                    usingExports = true;
                } else if (depName === "module") {
                    //CommonJS module spec 1.1
                    cjsModule = args[i] = {
                        id: name,
                        uri: '',
                        exports: defined[name]
                    };
                } else if (defined.hasOwnProperty(depName) || waiting.hasOwnProperty(depName)) {
                    args[i] = callDep(depName);
                } else if (map.p) {
                    map.p.load(map.n, makeRequire(relName, true), makeLoad(depName), {});
                    args[i] = defined[depName];
                } else {
                    throw name + ' missing ' + depName;
                }
            }

            ret = callback.apply(defined[name], args);

            if (name) {
                //If setting exports via "module" is in play,
                //favor that over return value and exports. After that,
                //favor a non-undefined return value over exports use.
                if (cjsModule && cjsModule.exports !== undef) {
                    defined[name] = cjsModule.exports;
                } else if (!usingExports) {
                    //Use the return value from the function.
                    defined[name] = ret;
                }
            }
        } else if (name) {
            //May just be an object definition for the module. Only
            //worry about defining if have a module name.
            defined[name] = callback;
        }
    };

    requirejs = req = function (deps, callback, relName, forceSync) {
        if (typeof deps === "string") {

            //Just return the module wanted. In this scenario, the
            //deps arg is the module name, and second arg (if passed)
            //is just the relName.
            //Normalize module name, if it contains . or ..
            return callDep(makeMap(deps, callback).f);
        } else if (!deps.splice) {
            //deps is a config object, not an array.
            //Drop the config stuff on the ground.
            if (callback.splice) {
                //callback is an array, which means it is a dependency list.
                //Adjust args if there are dependencies
                deps = callback;
                callback = arguments[2];
            } else {
                deps = [];
            }
        }

        //Simulate async callback;
        if (forceSync) {
            main(undef, deps, callback, relName);
        } else {
            setTimeout(function () {
                main(undef, deps, callback, relName);
            }, 15);
        }

        return req;
    };

    /**
     * Just drops the config on the floor, but returns req in case
     * the config return value is used.
     */
    req.config = function () {
        return req;
    };

    /**
     * Export require as a global, but only if it does not already exist.
     */
    if (!require) {
        require = req;
    }

    define = function (name, deps, callback) {

        //This module may not have dependencies
        if (!deps.splice) {
            //deps is not an array, so probably means
            //an object literal or factory function for
            //the value. Adjust args.
            callback = deps;
            deps = [];
        }

        if (define.unordered) {
            waiting[name] = [name, deps, callback];
        } else {
            main(name, deps, callback);
        }
    };

    define.amd = {
        jQuery: true
    };
}());
define.unordered = true;

define("almond", function(){});

define('event-queue',['require'],function (require) {
  // hackish hookup to MAGIC_ERROR_TRAPPER for unit testing; this also has the
  //  nice side-effect of cutting down on RequireJS errors at startup when
  //  Q is loading.
  return {
    enqueue: function(task) {
      setTimeout(function() {
        try {
          task();
        }
        catch(ex) {
          console.error("exception in enqueued task: " + ex);
          if (MAGIC_ERROR_TRAPPER)
            MAGIC_ERROR_TRAPPER.yoAnError(ex);
          // and re-throw it in case the platform can pick it up.
          throw ex;
        }
      }, 0);
    },
  };
});

(function(global){
  

  /** @const */ var eof = -1;

  /** @param {Uint8Array} bytes */
  function ByteInputStream(bytes) {
    var pos = 0;
    return {
      get: function() {
        return (pos >= bytes.length) ? eof : bytes[pos];
      },
      offset: function (n) {
        pos += n;
        if (pos < 0) {
          throw new Error("Seeking past start of the buffer");
        }
        if (pos > bytes.length) {
          throw new Error("Seeking past EOF");
        }
      },
      match: function(test) {
        if (test.length > pos + bytes.length) {
          return false;
        }
        var i;
        for (i = 0; i < test.length; i += 1) {
          if (bytes[pos + i] !== test[i]) {
            return false;
          }
        }
        return true;
      }
    };
  }

  /** @param {Array.<number>} bytes */
  function ByteOutputStream(bytes) {
    var pos = 0;
    return {
      write: function(o) {
        bytes[pos++] = o;
      }
    };
  }

  /** @param {string} string */
  function CodePointInputStream(string) {
    var i = 0, n = string.length;
    return {
      eof: function () {
        return (i >= n);
      },
      read: function () {
        if (i >= n) {
          return eof;
        }
        // Based on http://www.w3.org/TR/WebIDL/#idl-DOMString
        var c = string.charCodeAt(i);
        if (c < 0xD800 || c > 0xDFFF) {
          i += 1;
          return c;
        } else if (0xDC00 <= c && c <= 0xDFFF) {
          i += 1;
          return fallback_code_point;
        } else { // (0xD800 <= c && c <= 0xDBFF)
          if (i === n - 1) {
            i += 1;
            return fallback_code_point;
          }
          var d = string.charCodeAt(i + 1);
          if (0xDC00 <= d && d <= 0xDFFF) {
            var a = c & 0x3FF;
            var b = d & 0x3FF;
            i += 2;
            return 0x10000 + (a << 10) + b;
          } else {
            i += 1;
            return fallback_code_point;
          }
        }
      }
    };
  }

  function CodePointOutputStream() {
    var string = '';
    return {
      string: function () {
        return string;
      },
      emit: function(c) {
        if (c <= 0xFFFF) {
          string += String.fromCharCode(c);
        } else {
          c -= 0x10000;
          string += String.fromCharCode(0XD800 + ((c >> 10) & 0x3ff));
          string += String.fromCharCode(0XDC00 + (c & 0x3ff));
        }
      }
    };
  }

  /** @const */ var fallback_code_point = 0xFFFD;

  /** @type {Array.<{name:string,
   *                 labels:Array.<string>,
   *                 getEncoder:function(),
   *                 getDecoder:function(),
   *                 encoding:Array.<number>
   *               }>} */
  var codecs = [
    {
      name: 'binary',
      labels: ['binary'],
      getEncoder: function () { return new BinaryEncoder(); },
      getDecoder: function () { return new BinaryDecoder(); }
    },

    {
      name: 'utf-8',
      labels: ['utf-8'],
      getEncoder: function () { return new UTF8Encoder(); },
      getDecoder: function () { return new UTF8Decoder(); }
    },

    {
      name: "gbk",
      labels: ["chinese",
               "csgb2312",
               "csiso58gb231280",
               "gb2312",
               "gb_2312",
               "gb_2312-80",
               "gbk",
               "iso-ir-58",
               "x-gbk"],
      getDecoder: function () { return new GBKDecoder(false); }
    },

    {
      name: "gbk18030",
      labels: ["gb18030"],
      getDecoder: function () { return new GBKDecoder(true); }
    },

    {
      name: "hz-gb-2312",
      labels: ["hz-gb-2312"],
      getDecoder: function () { return new HZGB2312Decoder(); }
    },

    {
      name: 'euc-jp',
      labels: ["cseucjpkdfmtjapanese",
               "euc-jp",
               "x-euc-jp"],
      getDecoder: function () { return new EUCJPDecoder(); }
    },

    {
      name: "iso-2022-jp",
      labels: ["csiso2022jp",
               "iso-2022-jp"],
      getDecoder: function () { return new ISO2022JPDecoder(); }
    },

    {
      name: "shift_jis",
      labels: ["csshiftjis",
               "ms_kanji",
               "shift-jis",
               "shift_jis",
               "windows-31j",
               "x-sjis"],
      getDecoder: function () { return new ShiftJISDecoder(); }
    },

    {
      name: "euc-kr",
      labels: ["csksc56011987",
               "csueckr",
               "euc-kr",
               "iso-ir-149",
               "korean",
               "ks_c_5601-1989",
               "ksc5601",
               "ksc_5601",
               "windows-949"],
      getDecoder: function () { return new EUCKRDecoder(); }
    },

    {
      name: "iso-2022-kr",
      labels: ["csiso2022kr",
               "iso-2022-kr"],
      getDecoder: function () { return new ISO2022KRDecoder(); }
    },

    {
      name: 'utf-16le',
      labels: ['utf-16le', 'utf-16'],
      getEncoder: function () { return new UTF16Encoder(false); },
      getDecoder: function () { return new UTF16Decoder(false); }
    },

    {
      name: 'utf-16be',
      labels: ['utf-16be'],
      getEncoder: function () { return new UTF16Encoder(true); },
      getDecoder: function () { return new UTF16Decoder(true); }
    },

    // From: http://dvcs.w3.org/hg/encoding/raw-file/tip/single-byte-encodings.json
    {
      "name":"ibm864",
      "labels":["cp864","ibm864"],
      "encoding":[176,183,8729,8730,9618,9472,9474,9532,9508,9516,9500,9524,9488,9484,9492,9496,946,8734,966,177,189,188,8776,171,187,65271,65272,155,156,65275,65276,159,160,173,65154,163,164,65156,null,null,65166,65167,65173,65177,1548,65181,65185,65189,1632,1633,1634,1635,1636,1637,1638,1639,1640,1641,65233,1563,65201,65205,65209,1567,162,65152,65153,65155,65157,65226,65163,65165,65169,65171,65175,65179,65183,65187,65191,65193,65195,65197,65199,65203,65207,65211,65215,65217,65221,65227,65231,166,172,247,215,65225,1600,65235,65239,65243,65247,65251,65255,65259,65261,65263,65267,65213,65228,65230,65229,65249,65149,1617,65253,65257,65260,65264,65266,65232,65237,65269,65270,65245,65241,65265,9632,null],
      "notes":[
        "WebKit and Chromium map 1A, 1C, and 7F to U+001C, U+007F, and U+001A rather than U+001A, U+001C, and 007F. And they map 9B &amp; 9C, 9F, D7, D8, and F1 to U+FFFD, U+200B, U+FEC3, U+FEC7, and U+FE7C.",
        "Gecko maps 25 to U+066A rather than U+0025. And it maps 9B &amp; 9C, 9F, A6, A7, and FF to U+FEF8, U+FEFC, U+FE84, U+20AC, and U+25A0.",
        "Trident maps A6, A7, and FF to U+F8BE, U+F8BF, and U+F8C0.",
        "Presto does not support this encoding."
      ],
      "XXX":"Since Presto has no support, maybe we can remove this? Chromium only supports it because of WebKit..."
    },
    {
      "name":"ibm866",
      "labels":["cp866","ibm866"],
      "encoding":[1040,1041,1042,1043,1044,1045,1046,1047,1048,1049,1050,1051,1052,1053,1054,1055,1056,1057,1058,1059,1060,1061,1062,1063,1064,1065,1066,1067,1068,1069,1070,1071,1072,1073,1074,1075,1076,1077,1078,1079,1080,1081,1082,1083,1084,1085,1086,1087,9617,9618,9619,9474,9508,9569,9570,9558,9557,9571,9553,9559,9565,9564,9563,9488,9492,9524,9516,9500,9472,9532,9566,9567,9562,9556,9577,9574,9568,9552,9580,9575,9576,9572,9573,9561,9560,9554,9555,9579,9578,9496,9484,9608,9604,9612,9616,9600,1088,1089,1090,1091,1092,1093,1094,1095,1096,1097,1098,1099,1100,1101,1102,1103,1025,1105,1028,1108,1031,1111,1038,1118,176,8729,183,8730,8470,164,9632,160],
      "notes":[
        "WebKit maps 1A, 1C, and 7F to U+001C, U+007F, and U+001A rather than U+001A, U+001C, and 007F.",
        "Chromium does not support this encoding."
      ],
      "XXX":"Since Chromium has no support, maybe we can remove this?"
    },
    {
      "name":"iso-8859-2",
      "labels":["csisolatin2","iso-8859-2","iso-ir-101","iso8859-2","iso_8859-2","l2","latin2"],
      "encoding":[128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,260,728,321,164,317,346,167,168,352,350,356,377,173,381,379,176,261,731,322,180,318,347,711,184,353,351,357,378,733,382,380,340,193,194,258,196,313,262,199,268,201,280,203,282,205,206,270,272,323,327,211,212,336,214,215,344,366,218,368,220,221,354,223,341,225,226,259,228,314,263,231,269,233,281,235,283,237,238,271,273,324,328,243,244,337,246,247,345,367,250,369,252,253,355,729]
    },
    {
      "name":"iso-8859-3",
      "labels":["csisolatin3","iso-8859-3","iso_8859-3","iso-ir-109","l3","latin3"],
      "encoding":[128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,294,728,163,164,null,292,167,168,304,350,286,308,173,null,379,176,295,178,179,180,181,293,183,184,305,351,287,309,189,null,380,192,193,194,null,196,266,264,199,200,201,202,203,204,205,206,207,null,209,210,211,212,288,214,215,284,217,218,219,220,364,348,223,224,225,226,null,228,267,265,231,232,233,234,235,236,237,238,239,null,241,242,243,244,289,246,247,285,249,250,251,252,365,349,729],
      "notes":["Trident maps A5, AE, BE, C3, D0, E3, and F0 to U+F7F5, U+F7F6, U+F7F7, U+F7F8, U+F7F9, U+F7FA, and U+F7FB respectively."]
    },
    {
      "name":"iso-8859-4",
      "labels":["csisolatin4","iso-8859-4","iso_8859-4","iso-ir-110","l4","latin4"],
      "encoding":[128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,260,312,342,164,296,315,167,168,352,274,290,358,173,381,175,176,261,731,343,180,297,316,711,184,353,275,291,359,330,382,331,256,193,194,195,196,197,198,302,268,201,280,203,278,205,206,298,272,325,332,310,212,213,214,215,216,370,218,219,220,360,362,223,257,225,226,227,228,229,230,303,269,233,281,235,279,237,238,299,273,326,333,311,244,245,246,247,248,371,250,251,252,361,363,729]
    },
    {
      "name":"iso-8859-5",
      "labels":["csisolatincyrillic","cyrillic","iso-8859-5","iso_8859-5","iso-ir-144"],
      "encoding":[128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,1025,1026,1027,1028,1029,1030,1031,1032,1033,1034,1035,1036,173,1038,1039,1040,1041,1042,1043,1044,1045,1046,1047,1048,1049,1050,1051,1052,1053,1054,1055,1056,1057,1058,1059,1060,1061,1062,1063,1064,1065,1066,1067,1068,1069,1070,1071,1072,1073,1074,1075,1076,1077,1078,1079,1080,1081,1082,1083,1084,1085,1086,1087,1088,1089,1090,1091,1092,1093,1094,1095,1096,1097,1098,1099,1100,1101,1102,1103,8470,1105,1106,1107,1108,1109,1110,1111,1112,1113,1114,1115,1116,167,1118,1119]
    },
    {
      "name":"iso-8859-6",
      "labels":["arabic","csisolatinarabic","ecma-114","iso-8859-6","iso_8859-6","iso-ir-127"],
      "encoding":[128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,null,null,null,164,null,null,null,null,null,null,null,1548,173,null,null,null,null,null,null,null,null,null,null,null,null,null,1563,null,null,null,1567,null,1569,1570,1571,1572,1573,1574,1575,1576,1577,1578,1579,1580,1581,1582,1583,1584,1585,1586,1587,1588,1589,1590,1591,1592,1593,1594,null,null,null,null,null,1600,1601,1602,1603,1604,1605,1606,1607,1608,1609,1610,1611,1612,1613,1614,1615,1616,1617,1618,null,null,null,null,null,null,null,null,null,null,null,null,null],
      "notes":["Trident maps A1-A3, A5-AB, AE-BA, BC-BE, C0, DB-DF, and F3-FF to U+F7C8-U+F7CA, U+F7CB-U+F7D1, U+F7D2-U+F7DE, U+F7DF-U+F7E1, U+F7E2, U+F7E3-U+F7E7, and U+F7E8-U+F7F4 respectively."]
    },
    {
      "name":"iso-8859-7",
      "labels":["csisolatingreek","ecma-118","elot_928","greek","greek8","iso-8859-7","iso_8859-7","iso-ir-126"],
      "encoding":[128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,8216,8217,163,8364,8367,166,167,168,169,890,171,172,173,null,8213,176,177,178,179,900,901,902,183,904,905,906,187,908,189,910,911,912,913,914,915,916,917,918,919,920,921,922,923,924,925,926,927,928,929,null,931,932,933,934,935,936,937,938,939,940,941,942,943,944,945,946,947,948,949,950,951,952,953,954,955,956,957,958,959,960,961,962,963,964,965,966,967,968,969,970,971,972,973,974,null],
      "notes":["Trident maps A1, A2, A4, A5, AA, AE, D2, and FF, to U+02BD, U+02BC, U+F7C2, U+F7C3, U+F7C4, U+F7C5, U+F7C6, and U+F7C7 respectively."]
    },
    {
      "name":"iso-8859-8",
      "labels":["csisolatinhebrew","hebrew","iso-8859-8","iso-8859-8-i","iso-ir-138","iso_8859-8","visual"],
      "encoding":[128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,null,162,163,164,165,166,167,168,169,215,171,172,173,174,175,176,177,178,179,180,181,182,183,184,185,247,187,188,189,190,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,8215,1488,1489,1490,1491,1492,1493,1494,1495,1496,1497,1498,1499,1500,1501,1502,1503,1504,1505,1506,1507,1508,1509,1510,1511,1512,1513,1514,null,null,8206,8207,null],
      "notes":["Trident maps A1, AF, BF-DE, and FB-FF to U+F79C, U+203E, U+F79D-U+F7BC, and U+F7BD-U+F7C1 respectively."]
    },
    {
      "name":"iso-8859-10",
      "labels":["csisolatin6","iso-8859-10","iso-ir-157","iso8859-10","l6","latin6"],
      "encoding":[128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,260,274,290,298,296,310,167,315,272,352,358,381,173,362,330,176,261,275,291,299,297,311,183,316,273,353,359,382,8213,363,331,256,193,194,195,196,197,198,302,268,201,280,203,278,205,206,207,208,325,332,211,212,213,214,360,216,370,218,219,220,221,222,223,257,225,226,227,228,229,230,303,269,233,281,235,279,237,238,239,240,326,333,243,244,245,246,361,248,371,250,251,252,253,254,312]
    },
    {
      "name":"iso-8859-13",
      "labels":["iso-8859-13"],
      "encoding":[128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,8221,162,163,164,8222,166,167,216,169,342,171,172,173,174,198,176,177,178,179,8220,181,182,183,248,185,343,187,188,189,190,230,260,302,256,262,196,197,280,274,268,201,377,278,290,310,298,315,352,323,325,211,332,213,214,215,370,321,346,362,220,379,381,223,261,303,257,263,228,229,281,275,269,233,378,279,291,311,299,316,353,324,326,243,333,245,246,247,371,322,347,363,252,380,382,8217]
    },
    {
      "name":"iso-8859-14",
      "labels":["iso-8859-14","iso8859-14"],
      "encoding":[128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,7682,7683,163,266,267,7690,167,7808,169,7810,7691,7922,173,174,376,7710,7711,288,289,7744,7745,182,7766,7809,7767,7811,7776,7923,7812,7813,7777,192,193,194,195,196,197,198,199,200,201,202,203,204,205,206,207,372,209,210,211,212,213,214,7786,216,217,218,219,220,221,374,223,224,225,226,227,228,229,230,231,232,233,234,235,236,237,238,239,373,241,242,243,244,245,246,7787,248,249,250,251,252,253,375,255],
      "notes":["Trident does not support this encoding."]
    },
    {
      "name":"iso-8859-15",
      "labels":["iso-8859-15","iso_8859-15"],
      "encoding":[128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,161,162,163,8364,165,352,167,353,169,170,171,172,173,174,175,176,177,178,179,381,181,182,183,382,185,186,187,338,339,376,191,192,193,194,195,196,197,198,199,200,201,202,203,204,205,206,207,208,209,210,211,212,213,214,215,216,217,218,219,220,221,222,223,224,225,226,227,228,229,230,231,232,233,234,235,236,237,238,239,240,241,242,243,244,245,246,247,248,249,250,251,252,253,254,255]
    },
    {
      "name":"iso-8859-16",
      "labels":["iso-8859-16"],
      "encoding":[128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,260,261,321,8364,8222,352,167,353,169,536,171,377,173,378,379,176,177,268,322,381,8221,182,183,382,269,537,187,338,339,376,380,192,193,194,258,196,262,198,199,200,201,202,203,204,205,206,207,272,323,210,211,212,336,214,346,368,217,218,219,220,280,538,223,224,225,226,259,228,263,230,231,232,233,234,235,236,237,238,239,273,324,242,243,244,337,246,347,369,249,250,251,252,281,539,255],
      "notes":["Trident does not support this encoding."]
    },
    {
      "name":"koi8-r",
      "labels":["koi8-r", "koi8_r"],
      "encoding":[9472,9474,9484,9488,9492,9496,9500,9508,9516,9524,9532,9600,9604,9608,9612,9616,9617,9618,9619,8992,9632,8729,8730,8776,8804,8805,160,8993,176,178,183,247,9552,9553,9554,1105,9555,9556,9557,9558,9559,9560,9561,9562,9563,9564,9565,9566,9567,9568,9569,1025,9570,9571,9572,9573,9574,9575,9576,9577,9578,9579,9580,169,1102,1072,1073,1094,1076,1077,1092,1075,1093,1080,1081,1082,1083,1084,1085,1086,1087,1103,1088,1089,1090,1091,1078,1074,1100,1099,1079,1096,1101,1097,1095,1098,1070,1040,1041,1062,1044,1045,1060,1043,1061,1048,1049,1050,1051,1052,1053,1054,1055,1071,1056,1057,1058,1059,1046,1042,1068,1067,1047,1064,1069,1065,1063,1066]
    },
    {
      "name":"koi8-u",
      "labels":["koi8-u"],
      "encoding":[9472,9474,9484,9488,9492,9496,9500,9508,9516,9524,9532,9600,9604,9608,9612,9616,9617,9618,9619,8992,9632,8729,8730,8776,8804,8805,160,8993,176,178,183,247,9552,9553,9554,1105,1108,9556,1110,1111,9559,9560,9561,9562,9563,1169,9565,9566,9567,9568,9569,1025,1028,9571,1030,1031,9574,9575,9576,9577,9578,1168,9580,169,1102,1072,1073,1094,1076,1077,1092,1075,1093,1080,1081,1082,1083,1084,1085,1086,1087,1103,1088,1089,1090,1091,1078,1074,1100,1099,1079,1096,1101,1097,1095,1098,1070,1040,1041,1062,1044,1045,1060,1043,1061,1048,1049,1050,1051,1052,1053,1054,1055,1071,1056,1057,1058,1059,1046,1042,1068,1067,1047,1064,1069,1065,1063,1066],
      "notes":["Trident maps AE and BE to U+045E and U+040E respectively."]
    },
    {
      "name":"macintosh",
      "labels":["csmacintosh","mac","macintosh","x-mac-roman"],
      "encoding":[196,197,199,201,209,214,220,225,224,226,228,227,229,231,233,232,234,235,237,236,238,239,241,243,242,244,246,245,250,249,251,252,8224,176,162,163,167,8226,182,223,174,169,8482,180,168,8800,198,216,8734,177,8804,8805,165,181,8706,8721,8719,960,8747,170,186,937,230,248,191,161,172,8730,402,8776,8710,171,187,8230,160,192,195,213,338,339,8211,8212,8220,8221,8216,8217,247,9674,255,376,8260,8364,8249,8250,64257,64258,8225,183,8218,8222,8240,194,202,193,203,200,205,206,207,204,211,212,63743,210,218,219,217,305,710,732,175,728,729,730,184,733,731,711],
      "notes":["Trident maps BD to U+2126."]
    },
    {
      "name":"windows-874",
      "labels":["iso-8859-11","tis-620","windows-874"],
      "encoding":[8364,129,130,131,132,8230,134,135,136,137,138,139,140,141,142,143,144,8216,8217,8220,8221,8226,8211,8212,152,153,154,155,156,157,158,159,160,3585,3586,3587,3588,3589,3590,3591,3592,3593,3594,3595,3596,3597,3598,3599,3600,3601,3602,3603,3604,3605,3606,3607,3608,3609,3610,3611,3612,3613,3614,3615,3616,3617,3618,3619,3620,3621,3622,3623,3624,3625,3626,3627,3628,3629,3630,3631,3632,3633,3634,3635,3636,3637,3638,3639,3640,3641,3642,63681,63682,63683,63684,3647,3648,3649,3650,3651,3652,3653,3654,3655,3656,3657,3658,3659,3660,3661,3662,3663,3664,3665,3666,3667,3668,3669,3670,3671,3672,3673,3674,3675,63685,63686,63687,63688],
      "notes":["Gecko and Presto map 81-84, 86-90, 98-9F, DB-DE, and FC-FF to U+FFFD."]
    },
    {
      "name":"windows-1250",
      "labels":["windows-1250","x-cp1250"],
      "encoding":[8364,129,8218,131,8222,8230,8224,8225,136,8240,352,8249,346,356,381,377,144,8216,8217,8220,8221,8226,8211,8212,152,8482,353,8250,347,357,382,378,160,711,728,321,164,260,166,167,168,169,350,171,172,173,174,379,176,177,731,322,180,181,182,183,184,261,351,187,317,733,318,380,340,193,194,258,196,313,262,199,268,201,280,203,282,205,206,270,272,323,327,211,212,336,214,215,344,366,218,368,220,221,354,223,341,225,226,259,228,314,263,231,269,233,281,235,283,237,238,271,273,324,328,243,244,337,246,247,345,367,250,369,252,253,355,729],
      "notes":["Gecko and Presto map 81, 83, 88, 90, and 98 to U+FFFD."]
    },
    {
      "name":"windows-1251",
      "labels":["windows-1251","x-cp1251"],
      "encoding":[1026,1027,8218,1107,8222,8230,8224,8225,8364,8240,1033,8249,1034,1036,1035,1039,1106,8216,8217,8220,8221,8226,8211,8212,152,8482,1113,8250,1114,1116,1115,1119,160,1038,1118,1032,164,1168,166,167,1025,169,1028,171,172,173,174,1031,176,177,1030,1110,1169,181,182,183,1105,8470,1108,187,1112,1029,1109,1111,1040,1041,1042,1043,1044,1045,1046,1047,1048,1049,1050,1051,1052,1053,1054,1055,1056,1057,1058,1059,1060,1061,1062,1063,1064,1065,1066,1067,1068,1069,1070,1071,1072,1073,1074,1075,1076,1077,1078,1079,1080,1081,1082,1083,1084,1085,1086,1087,1088,1089,1090,1091,1092,1093,1094,1095,1096,1097,1098,1099,1100,1101,1102,1103],
      "notes":["Gecko and Presto map 98 to U+FFFD."]
    },
    {
      "name":"windows-1252",
      "labels":["ascii","ansi_x3.4-1968","csisolatin1","iso-8859-1","iso8859-1","iso_8859-1","l1","latin1","us-ascii","windows-1252"],
      "encoding":[8364,129,8218,402,8222,8230,8224,8225,710,8240,352,8249,338,141,381,143,144,8216,8217,8220,8221,8226,8211,8212,732,8482,353,8250,339,157,382,376,160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175,176,177,178,179,180,181,182,183,184,185,186,187,188,189,190,191,192,193,194,195,196,197,198,199,200,201,202,203,204,205,206,207,208,209,210,211,212,213,214,215,216,217,218,219,220,221,222,223,224,225,226,227,228,229,230,231,232,233,234,235,236,237,238,239,240,241,242,243,244,245,246,247,248,249,250,251,252,253,254,255]
    },
    {
      "name":"windows-1253",
      "labels":["cp1253","windows-1253"],
      "encoding":[8364,129,8218,402,8222,8230,8224,8225,136,8240,138,8249,140,141,142,143,144,8216,8217,8220,8221,8226,8211,8212,152,8482,154,8250,156,157,158,159,160,901,902,163,164,165,166,167,168,169,170,171,172,173,174,8213,176,177,178,179,900,181,182,183,904,905,906,187,908,189,910,911,912,913,914,915,916,917,918,919,920,921,922,923,924,925,926,927,928,929,null,931,932,933,934,935,936,937,938,939,940,941,942,943,944,945,946,947,948,949,950,951,952,953,954,955,956,957,958,959,960,961,962,963,964,965,966,967,968,969,970,971,972,973,974,null],
      "notes":["Gecko and Presto map 81, 88, 8A, 8C-90, 98, 9A, 9C-9F, and AA to U+FFFD. Trident maps AA, D2, and FF to U+F8F9, U+F8FA, and U+F8FB respectively."]
    },
    {
      "name":"windows-1254",
      "labels":["csisolatin5","iso-8859-9","iso-ir-148","l5","latin5","windows-1254"],
      "encoding":[8364,129,8218,402,8222,8230,8224,8225,710,8240,352,8249,338,141,142,143,144,8216,8217,8220,8221,8226,8211,8212,732,8482,353,8250,339,157,158,376,160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175,176,177,178,179,180,181,182,183,184,185,186,187,188,189,190,191,192,193,194,195,196,197,198,199,200,201,202,203,204,205,206,207,286,209,210,211,212,213,214,215,216,217,218,219,220,304,350,223,224,225,226,227,228,229,230,231,232,233,234,235,236,237,238,239,287,241,242,243,244,245,246,247,248,249,250,251,252,305,351,255],
      "notes":[
        "Gecko and Presto map 81, 8D, 8E, 8F, 90, 9D, and 9E to U+FFFD.\n<!-- Presto fixed this for these and others; prolly in Opera 12 -->",
                                                                                                "Gecko has not yet made \"<code title>latin5</code>\" (and others) a label for this encoding. (But per HTML and this specification which will replace HTML on this front they should.)"
                                                                                                ]
    },
    {
      "name":"windows-1255",
      "labels":["cp1255","windows-1255"],
      "encoding":[8364,129,8218,402,8222,8230,8224,8225,710,8240,138,8249,140,141,142,143,144,8216,8217,8220,8221,8226,8211,8212,732,8482,154,8250,156,157,158,159,160,161,162,163,8362,165,166,167,168,169,215,171,172,173,174,175,176,177,178,179,180,181,182,183,184,185,247,187,188,189,190,191,1456,1457,1458,1459,1460,1461,1462,1463,1464,1465,null,1467,1468,1469,1470,1471,1472,1473,1474,1475,1520,1521,1522,1523,1524,null,null,null,null,null,null,null,1488,1489,1490,1491,1492,1493,1494,1495,1496,1497,1498,1499,1500,1501,1502,1503,1504,1505,1506,1507,1508,1509,1510,1511,1512,1513,1514,null,null,8206,8207,null],
      "notes":["Gecko and Presto map 81, 8A, 8C-90, 9A, and 9C-9F to U+FFFD. Trident maps CA, D9-DF, FB-FC, and FF to U+05BA, U+F88D-U+F893, U+F894-U+F895, and U+F896."]
    },
    {
      "name":"windows-1256",
      "labels":["cp1256","windows-1256"],
      "encoding":[8364,1662,8218,402,8222,8230,8224,8225,710,8240,1657,8249,338,1670,1688,1672,1711,8216,8217,8220,8221,8226,8211,8212,1705,8482,1681,8250,339,8204,8205,1722,160,1548,162,163,164,165,166,167,168,169,1726,171,172,173,174,175,176,177,178,179,180,181,182,183,184,185,1563,187,188,189,190,1567,1729,1569,1570,1571,1572,1573,1574,1575,1576,1577,1578,1579,1580,1581,1582,1583,1584,1585,1586,1587,1588,1589,1590,215,1591,1592,1593,1594,1600,1601,1602,1603,224,1604,226,1605,1606,1607,1608,231,232,233,234,235,1609,1610,238,239,1611,1612,1613,1614,244,1615,1616,247,1617,249,1618,251,252,8206,8207,1746]
    },
    {
      "name":"windows-1257",
      "labels":["windows-1257"],
      "encoding":[8364,129,8218,131,8222,8230,8224,8225,136,8240,138,8249,140,168,711,184,144,8216,8217,8220,8221,8226,8211,8212,152,8482,154,8250,156,175,731,159,160,null,162,163,164,null,166,167,216,169,342,171,172,173,174,198,176,177,178,179,180,181,182,183,248,185,343,187,188,189,190,230,260,302,256,262,196,197,280,274,268,201,377,278,290,310,298,315,352,323,325,211,332,213,214,215,370,321,346,362,220,379,381,223,261,303,257,263,228,229,281,275,269,233,378,279,291,311,299,316,353,324,326,243,333,245,246,247,371,322,347,363,252,380,382,729],
      "notes":["Gecko and Presto map 81, 83, 88, 8A, 8C, 90, 98, 9A, 9C, and 9F to U+FFFD. Trident maps A1 and A5 to U+F8FC and U+F8FD."]
    },
    {
      "name":"windows-1258",
      "labels":["cp1258","windows-1258"],
      "encoding":[8364,129,8218,402,8222,8230,8224,8225,710,8240,138,8249,338,141,142,143,144,8216,8217,8220,8221,8226,8211,8212,732,8482,154,8250,339,157,158,376,160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175,176,177,178,179,180,181,182,183,184,185,186,187,188,189,190,191,192,193,194,258,196,197,198,199,200,201,202,203,768,205,206,207,272,209,777,211,212,416,214,215,216,217,218,219,220,431,771,223,224,225,226,259,228,229,230,231,232,233,234,235,769,237,238,239,273,241,803,243,244,417,246,247,248,249,250,251,252,432,8363,255],
      "notes":["Gecko and Presto map 81, 8A, 8D-90, 9A, and 9D-9E to U+FFFD."]
    },
    {
      "name":"x-mac-cyrillic",
      "labels":["x-mac-cyrillic","x-mac-ukrainian"],
      "encoding":[1040,1041,1042,1043,1044,1045,1046,1047,1048,1049,1050,1051,1052,1053,1054,1055,1056,1057,1058,1059,1060,1061,1062,1063,1064,1065,1066,1067,1068,1069,1070,1071,8224,176,1168,163,167,8226,182,1030,174,169,8482,1026,1106,8800,1027,1107,8734,177,8804,8805,1110,181,1169,1032,1028,1108,1031,1111,1033,1113,1034,1114,1112,1029,172,8730,402,8776,8710,171,187,8230,160,1035,1115,1036,1116,1109,8211,8212,8220,8221,8216,8217,247,8222,1038,1118,1039,1119,8470,1025,1105,1103,1072,1073,1074,1075,1076,1077,1078,1079,1080,1081,1082,1083,1084,1085,1086,1087,1088,1089,1090,1091,1092,1093,1094,1095,1096,1097,1098,1099,1100,1101,1102,8364]
    }
  ];

  /** @constructor */
  function BinaryEncoder() {
    this.encode = function (output_byte_stream, input_code_point_stream, options) {
      var code_point = input_code_point_stream.read();
      if (code_point === eof) {
        return;
      }
      if (code_point > 0xff) {
        throw new Error('Invalid binary string data');
      }
      output_byte_stream.write(code_point);
    };
  }

  /** @constructor */
  function BinaryDecoder() {
    this.decode = function (byte_pointer, options) {
      var bite = byte_pointer.get();
      if (bite === eof) {
        return eof;
      }
      byte_pointer.offset(1);
      return bite;
    };
  }

  /** @constructor */
  function UTF8Encoder() {
    this.encode = function (output_byte_stream, input_code_point_stream, options) {
      var code_point = input_code_point_stream.read();
      if (code_point === eof) {
        return;
      }
      if (0xD800 <= code_point && code_point <= 0xDFFF) {
        throw new Error('Invalid code point');
      }
      if (0x0000 <= code_point && code_point <= 0x007f) {
        output_byte_stream.write(code_point);
        return;
      }
      var count, offset;
      if (0x0080 <= code_point && code_point <= 0x07FF) {
          count = 1;
        offset = 0xC0;
      } else if (0x0800 <= code_point && code_point <= 0xFFFF) {
        count = 2;
        offset = 0xE0;
      } else if (0x10000 <= code_point && code_point <= 0x10FFFF) {
        count = 3;
        offset = 0xF0;
      }
      output_byte_stream.write(Math.floor(code_point / Math.pow(64, count)) + offset);
      while (count > 0) {
        var temp = Math.floor(code_point / Math.pow(64, count - 1));
        output_byte_stream.write(0x80 + (temp % 64));
        count -= 1;
      }
    };
  }

  /**
   * @param {boolean} fatal
   * @param {number=} opt_code_point
   */
  function decoderError(fatal, opt_code_point) {
    if (fatal) {
      throw new Error("EncodingError");
    }
    return opt_code_point || fallback_code_point;
  }

  /** @constructor */
  function UTF8Decoder() {
    var utf8_code_point = 0, utf8_bytes_needed = 0, utf8_bytes_seen = 0,
        utf8_lower_boundary = 0;
    this.decode = function (byte_pointer, options) {
      var bite = byte_pointer.get();
      if (bite === eof) {
        if (utf8_bytes_needed !== 0) {
          return decoderError(options.fatal);
        }
        return eof;
      }
      byte_pointer.offset(1);

      if (utf8_bytes_needed === 0) {
        if (0x00 <= bite && bite <= 0x7F) {
          return bite;
        } else if (0xC0 <= bite && bite <= 0xDF) {
          utf8_bytes_needed = 1;
          utf8_lower_boundary = 0x80;
          utf8_code_point = bite - 0xC0;
        } else if (0xE0 <= bite && bite <= 0xEF) {
          utf8_bytes_needed = 2;
          utf8_lower_boundary = 0x800;
          utf8_code_point = bite - 0xE0;
        } else if (0xF0 <= bite && bite <= 0xF7) {
          utf8_bytes_needed = 3;
          utf8_lower_boundary = 0x10000;
          utf8_code_point = bite - 0xF0;
        } else if (0xF8 <= bite && bite <= 0xFB) {
          utf8_bytes_needed = 4;
          utf8_lower_boundary = 0x200000;
          utf8_code_point = bite - 0xF8;
        } else if (0xFC <= bite && bite <= 0xFD) {
          utf8_bytes_needed = 5;
          utf8_lower_boundary = 0x4000000;
          utf8_code_point = bite - 0xFC;
        } else {
          return decoderError(options.fatal);
        }
        utf8_code_point = utf8_code_point * Math.pow(64, utf8_bytes_needed);
        return null;
      }
      if (bite < 0x80 || bite > 0xBF) {
        utf8_code_point = 0;
        utf8_bytes_needed = 0;
        utf8_bytes_seen = 0;
        utf8_lower_boundary = 0;
        byte_pointer.offset(-1);
        return decoderError(options.fatal);
      }
      utf8_bytes_seen += 1;
      utf8_code_point = utf8_code_point + (bite - 0x80) * Math.pow(64, utf8_bytes_needed - utf8_bytes_seen);
      if (utf8_bytes_seen !== utf8_bytes_needed) {
        return null;
      }
      var code_point = utf8_code_point;
      var lower_boundary = utf8_lower_boundary;
      utf8_code_point = 0;
      utf8_bytes_needed = 0;
      utf8_bytes_seen = 0;
      utf8_lower_boundary = 0;
      if (code_point >= lower_boundary &&
          code_point <= 0x10FFFF &&
          (code_point < 0XD800 || code_point > 0xDFFF)) {
        return code_point;
      }
      return decoderError(options.fatal);
    };
  }

  // Generic Encoders/Decoders for single byte encodings, using maps
  /**
   * @constructor
   * @param {Array.<number>} map
   */
  function SingleByteEncoder(map) {
    this.encode = function (output_byte_stream, input_code_point_stream, options) {
      var code_point = input_code_point_stream.read();
        if (code_point === eof) {
          return;
        }
      if (code_point <= 0x7f) {
        output_byte_stream.write(code_point);
      } else {
        var index = map.indexOf(code_point);
        if (index === -1) {
          throw new Error('Can not encode code point ' + code_point);
        }
        output_byte_stream.write(index + 128);
      }
    };
  }

  /**
   * @constructor
   * @param {Array.<number>} map
   */
  function SingleByteDecoder(map) {
    this.decode = function (byte_pointer, options) {
      var bite = byte_pointer.get();
      if (bite === eof) {
        return eof;
      }
      byte_pointer.offset(1);
      if (bite <= 0x7f) {
        return bite;
      } else {
        var code_point = map[bite - 128];
        if (code_point === null) {
          return decoderError(options.fatal);
        } else {
          return code_point;
        }
      }
    };
  }

  (function () {
    var i;
    for (i = 0; i < codecs.length; ++i) {
      if (codecs[i].encoding) {
        (function (map) {
          codecs[i].getEncoder = function () { return new SingleByteEncoder(map); };
          codecs[i].getDecoder = function () { return new SingleByteDecoder(map); };
        }(codecs[i].encoding));
      }
    }
  }());

  /** @constructor */
  function UTF16Encoder(utf16_be) {
    this.encode = function(output_byte_stream, input_code_point_stream, options) {
      function convert_to_bytes(code_unit) {
        var byte1 = code_unit >> 8;
        var byte2 = code_unit & 0xFF;
        if (utf16_be) {
          output_byte_stream.write(byte1);
          output_byte_stream.write(byte2);
        } else {
          output_byte_stream.write(byte2);
          output_byte_stream.write(byte1);
        }
      }
      var code_point = input_code_point_stream.read();
      if (code_point === eof) {
        return;
      }
      if (0xD800 <= code_point && code_point <= 0xDFFF) {
        throw new Error('Invalid code point');
      }
      if (code_point <= 0xFFFF) {
        convert_to_bytes(code_point);
      } else {
        var lead = ((code_point - 0x10000) / 0x400) + 0xD800;
        var trail = ((code_point - 0x10000) % 0x400) + 0xDC00;
        convert_to_bytes(lead);
        convert_to_bytes(trail);
      }
    };
  }

  /** @constructor */
  function UTF16Decoder(utf16_be) {
    var utf16_lead_byte = null, utf16_lead_surrogate = null;
    this.decode = function(byte_pointer, options) {
      var bite = byte_pointer.get();
      if (bite === eof) {
        if (utf16_lead_byte || utf16_lead_surrogate) {
          return decoderError(options.fatal);
        }
        return eof;
      }
      byte_pointer.offset(1);
      if (utf16_lead_byte === null) {
        utf16_lead_byte = bite;
        return null;
      }
      var code_point;
      if (utf16_be) {
        code_point = (utf16_lead_byte << 8) + bite;
      } else {
        code_point = (bite << 8) + utf16_lead_byte;
      }
      utf16_lead_byte = null;
      if (utf16_lead_surrogate !== null) {
        var lead_surrogate = utf16_lead_surrogate;
        utf16_lead_surrogate = null;
        if (0xDC00 <= code_point && code_point <= 0xDFFF) {
          return 0x10000 + (lead_surrogate - 0xD800) * 0x400 + (code_point - 0xDC00);
        } else {
          byte_pointer.offset(-2);
          return decoderError(options.fatal);
        }
      }
      if (0xD800 <= code_point && code_point <= 0xDBFF) {
        utf16_lead_surrogate = code_point;
        return null;
      }
      if (0xDC00 <= code_point && code_point <= 0xDFFF) {
        return decoderError(options.fatal);
      }
      return code_point;
    };
  }

  // TODO: Add this table/function
  /** @return {?number} */
  function gbkCodePoint() {
    return null;
  }

  /** @constructor */
  function GBKDecoder(gb18030) {
    var gbk_first = 0x00, gbk_second = 0x00, gbk_third = 0x00;
    this.decode = function(byte_pointer, options) {
      var bite = byte_pointer.get();
      if (bite === eof && gbk_first === 0x00 && gbk_second === 0x00 && gbk_third === 0x00) {
        return eof;
      }
      if (bite === eof && (gbk_first !== 0x00 || gbk_second !== 0x00 || gbk_third !== 0x00)) {
        gbk_first = 0x00;
        gbk_second = 0x00;
        gbk_third = 0x00;
        decoderError(options.fatal);
      }
      byte_pointer.offset(1);
      var code_point;
      if (gbk_third !== 0x00) {
        if (0x30 <= bite && bite <= 0x39) {
          // TODO: Spec incomplete
          code_point = gbkCodePoint();
          if (code_point !== null) {
            gbk_first = 0x00;
            gbk_second = 0x00;
            gbk_third = 0x00;
            return code_point;
          }
          byte_pointer.offset(-3);
          gbk_first = 0x00;
          gbk_second = 0x00;
          gbk_third = 0x00;
          return decoderError(options.fatal);
        }
      }
      if (gbk_second !== 0x00) {
        if (0x81 <= bite && bite <= 0xFE) {
          gbk_second = bite;
          return null;
        }
        byte_pointer.offset(-2);
        gbk_first = 0x00;
        gbk_second = 0x00;
        return decoderError(options.fatal);
      }
      if (gbk_first !== 0x00) {
        if (0x30 <= bite && bite <= 0x39 && gb18030) {
          gbk_second = bite;
          return null;
        }
        if (0x40 <= bite && bite <= 0xFE) {
          // TODO: Spec incomplete
          code_point = gbkCodePoint();
          gbk_first = 0x00;
          return code_point;
        }
        gbk_first = 0x00;
        return decoderError(options.fatal);
      }
      if (0x00 <= bite && bite <= 0x7F) {
        return bite;
      }
      if (bite === 0x80 && !gb18030) {
        return 0x20AC;
      }
      if (0x81 <= bite && bite <= 0xFE) {
        gbk_first = bite;
        return null;
      }
      return decoderError(options.fatal);
    };
  }

  /** @constructor */
  function HZGB2312Decoder() {
    var hzgb2312 = false, hzgb2312_lead = 0x00;
    this.decode = function(byte_pointer, options) {
      var bite = byte_pointer.get();
      if (bite === eof && hzgb2312_lead === 0x00) {
        return eof;
      }
      if (bite === eof && hzgb2312_lead !== 0x00) {
        hzgb2312_lead = 0x00;
        return decoderError(options.fatal);
      }
      byte_pointer.offset(1);
      if (hzgb2312_lead === 0x7E) {
        hzgb2312_lead = 0x00;
        if (bite === 0x7B) {
          hzgb2312 = true;
          return null;
        }
        if (bite === 0x7D) {
          hzgb2312 = false;
          return null;
        }
        if (bite === 0x7E) {
          return 0x007E;
        }
        if (bite === 0x0A) {
          hzgb2312_lead = 0x00;
          return null;
        }
        byte_pointer.offset(-1);
        return decoderError(options.fatal);
      }
      if (hzgb2312_lead !== 0x00) {
        hzgb2312_lead = 0x00;
        // TODO: Spec incomplete
        var code_point = gbkCodePoint();
        if (0x20 <= bite && bite <= 0x7F && code_point != null) {
          return code_point;
        }
        if (bite === 0x0A) {
          hzgb2312 = false;
        }
        return decoderError(options.fatal);
      }
      if (bite === 0x7E) {
        hzgb2312_lead = 0x7E;
        return null;
      }
      if (hzgb2312) {
        if (0x20 <= bite && bite <= 0x7F) {
          hzgb2312_lead = bite;
          return null;
        }
        if (bite === 0x0A) {
          hzgb2312 = false;
        }
        return decoderError(options.fatal);
      }
      if (0x00 <= bite && bite <= 0x7F) {
        return bite;
      }
      return decoderError(options.fatal);
    };
  }

  // NOTE: prepend <script src="index-jis0208.js"></script> to enable
  var jis0208Index = global['jis0208Index'] || [];
  /** @return {?number} */
  function jis0208CodePoint(row, cell) {
    var location = row * 94 + cell;
    return jis0208Index[location] || null;
  }

  // NOTE: prepend <script src="index-jis0212.js"></script> to enable
  var jis0212Index = global['jis0212Index'] || [];
  /** @return {?number} */
  function jis0212CodePoint(row, cell) {
    var location = row * 94 + cell;
    return jis0212Index[location] || null;
  }

  /** @constructor */
  function EUCJPDecoder() {
    var eucjp_first = 0x00, eucjp_second = 0x00;
    this.decode = function(byte_pointer, options) {
      var bite = byte_pointer.get();
      if (bite === eof) {
        if (eucjp_first === 0x00 && eucjp_second === 0x00) {
          return eof;
        } else {
          eucjp_first = 0x00;
          eucjp_second = 0x00;
          return decoderError(options.fatal);
        }
      }
      byte_pointer.offset(1);

      var lead, code_point;
      if (eucjp_second !== 0x00) {
        lead = eucjp_second;
        eucjp_second = 0x00;
        code_point = null;
        if (0xA1 <= lead && lead <= 0xFE && 0xA1 <= bite && bite <= 0xFE) {
          code_point = jis0212CodePoint(lead - 0xA1, bite - 0xA1);
        }
        if (code_point === null && (bite < 0xA1 || bite > 0xFE)) {
          byte_pointer.offset(-1);
        }
        if (code_point === null) {
          return decoderError(options.fatal);
        }
        return code_point;
      }
      if (eucjp_first === 0x8E && 0xA1 <= bite && bite <= 0xDF) {
        eucjp_first = 0x00;
        return 0xFEC0 + bite;
      }
      if (eucjp_first === 0x8F && 0xA1 <= bite && bite <= 0xFE) {
        eucjp_first = 0x00;
        eucjp_second = bite;
        return null;
      }
      if (eucjp_first !== 0x00) {
        lead = eucjp_first;
        eucjp_first = 0x00;
        code_point = null;
        if (0xA1 <= lead && lead <= 0xFE && 0xA1 <= bite && bite <= 0xFE) {
          code_point = jis0208CodePoint(lead - 0xA1, bite - 0xA1);
        }
        if (code_point === null && (bite < 0xA1 || bite > 0xFE)) {
          byte_pointer.offset(-1);
        }
        if (code_point === null) {
          return decoderError(options.fatal);
        }
        return code_point;
      }
      if (0x00 <= bite && bite <= 0x7F) {
        return bite;
      }
      if (bite === 0x8E || bite === 0x8F || (0xA1 <= bite && bite <= 0xFE)) {
        eucjp_first = bite;
        return null;
      }
      return decoderError(options.fatal);
    };
  }

  /** @constructor */
  function ISO2022JPDecoder() {
    /** @enum */
    var state = {
      ASCII: 0,
      escape_start: 1,
      escape_middle: 2,
      escape_final: 3,
      lead: 4,
      trail: 5,
      Katakana: 6
    };
    var /** @type {number} */ iso2022jp_state = state.ASCII,
        /** @type {boolean} */ iso2022jp_jis0212 = false,
        /** @type {number} */ iso2022jp_lead = 0x00;
    this.decode = function(byte_pointer, options) {
      var bite = byte_pointer.get();
      if (bite !== eof) {
        byte_pointer.offset(1);
      }
      switch (iso2022jp_state) {
      default:
      case state.ASCII:
        if (bite === 0x1B) {
          iso2022jp_state = state.escape_start;
          return null;
        }
        if (0x00 <= bite && bite <= 0x7E) {
          return bite;
        }
        if (bite === eof) {
          return eof;
        }
        return decoderError(options.fatal);

      case state.escape_start:
        if (bite === 0x24 || bite === 0x28) {
          iso2022jp_lead = bite;
          iso2022jp_state = state.escape_middle;
          return null;
        }
        if (bite != eof) {
          byte_pointer.offset(-1);
        }
        iso2022jp_state = state.ASCII;
        return decoderError(options.fatal);

      case state.escape_middle:
        var lead = iso2022jp_lead;
        iso2022jp_lead = 0x00;
        if (lead === 0x24 && (bite === 0x40 || bite === 0x42)) {
          iso2022jp_jis0212 = false;
          iso2022jp_state = state.lead;
          return null;
        }
        if (lead === 0x24 && bite === 0x28) {
          iso2022jp_state = state.escape_final;
          return null;
        }
        if (lead === 0x28 && (bite === 0x42 || bite === 0x4A)) {
          iso2022jp_state = state.ASCII;
          return null;
        }
        if (lead === 0x28 && bite === 0x49) {
          iso2022jp_state = state.Katakana;
          return null;
        }
        if (bite === eof) {
          byte_pointer.offset(-1);
        } else {
          byte_pointer.offset(-2);
        }
        iso2022jp_state = state.ASCII;
        return decoderError(options.fatal);

      case state.escape_final:
        if (bite === 0x44) {
          iso2022jp_jis0212 = true;
          iso2022jp_state = state.lead;
          return null;
        }
        if (bite === eof) {
          byte_pointer.offset(-2);
        } else {
          byte_pointer.offset(-3);
        }
        iso2022jp_state = state.ASCII;
        return decoderError(options.fatal);

      case state.lead:
        if (bite === 0x0A) {
          iso2022jp_state = state.ASCII;
          return decoderError(options.fatal, 0x000A);
        }
        if (bite === 0x1B) {
          iso2022jp_state = state.escape_start;
          return null;
        }
        if (bite === eof) {
          return eof;
        }
        iso2022jp_lead = bite;
        iso2022jp_state = state.trail;
        return null;

      case state.trail:
        iso2022jp_state = state.lead;
        if (bite === eof) {
          return decoderError(options.fatal);
        }
        var code_point = null;
        if (0x21 <= iso2022jp_lead && iso2022jp_lead <= 0x7E &&
            0x21 <= bite && bite <= 0x7E) {
          if (iso2022jp_jis0212 === false) {
            code_point = jis0208CodePoint(iso2022jp_lead - 0x21, bite - 0x21);
          } else {
            code_point = jis0212CodePoint(iso2022jp_lead - 0x21, bite - 0x21);
          }
        }
        if (code_point === null) {
          return decoderError(options.fatal);
        }
        return code_point;

      case state.Katakana:
        if (bite === 0x1B) {
          iso2022jp_state = state.escape_start;
          return null;
        }
        if (0x21 <= bite && bite <= 0x5F) {
          return 0xFF40 + bite;
        }
        if (bite === eof) {
          return eof;
        }
        return decoderError(options.fatal);
      }
    };
  }

  /** @constructor */
  function ShiftJISDecoder() {
    /** @const */ var shiftjis_fallback_code_point = 0x30FB;
    var shiftjis_lead = 0x00;
    this.decode = function(byte_pointer, options) {
      var bite = byte_pointer.get();
      if (bite === eof && shiftjis_lead === 0) {
        return eof;
      }
      if (bite === eof && shiftjis_lead !== 0) {
        shiftjis_lead = 0x00;
        return decoderError(options.fatal);
      }
      byte_pointer.offset(1);
      if (shiftjis_lead !== 0x00) {
        var lead = shiftjis_lead;
        shiftjis_lead = 0x00;
        if ((0x40 <= bite && bite <= 0x7E) || (0x80 <= bite && bite <= 0xFC)) {
          var offset = (bite < 0x7F) ? 64 : 65;
          if (0xF0 <= lead && lead <= 0xF9) {
            return decoderError(options.fatal,
                                0xE000 + (lead - 0xF0) * 188 + bite - offset);
          }
          var adjust = (bite < 0x9F) ? 1 : 0;
          var lead_offset = (lead < 160) ? 112 : 176;
          if (adjust === 0) {
            offset = 159;
          }
          var row = (lead - lead_offset) << 1;
          row = row - adjust - 33;
          var code_point = jis0208CodePoint(row, bite - offset);
          if (code_point === null) {
            return decoderError(options.fatal, shiftjis_fallback_code_point);
          }
          return code_point;
        }
        byte_pointer.offset(-1);
        return decoderError(options.fatal);
      }
      if (0x00 <= bite && bite <= 0x80) {
        return bite;
      }
      if (bite === 0xA0) {
        return 0xF8F0;
      }
      if (0xA1 <= bite && bite <= 0xDF) {
        return 0xFEC0 + bite;
      }
      if (0xFD <= bite && bite <= 0xFF) {
        return 0xF7F4 + bite;
      }
      if ((0x81 <= bite && bite <= 0x9F) ||
          (0xE0 <= bite && bite <= 0xFC)) {
        shiftjis_lead  = bite;
        return null;
      }
      return decoderError(options.fatal);
    };
  }

  // NOTE: prepend <script src="index-euc-kr.js"></script> to enable
  var euckrIndex = global['euckrIndex'] || [];
  /** @return {?number} */
  function euckrCodePoint(index) {
    return euckrIndex[index] || null;
  }

  /** @constructor */
  function EUCKRDecoder() {
    var euckr_lead = 0x00;
    this.decode = function(byte_pointer, options) {
      var bite = byte_pointer.get();
      if (bite === eof && euckr_lead === 0) {
        return eof;
      }
      if (bite === eof && euckr_lead !== 0) {
        euckr_lead = 0x00;
        return decoderError(options.fatal);
      }
      byte_pointer.offset(1);
      if (euckr_lead !== 0x00) {
        var lead = euckr_lead;
        var index = null;
        euckr_lead = 0x00;

        if (0x81 <= lead && lead <= 0xC6) {
          var temp = (26 + 26 + 126) * (lead - 0x81);
          if (0x41 <= bite && bite <= 0x5A) {
            index = temp + bite - 0x41;
          } else if (0x61 <= bite && bite <= 0x7A) {
            index = temp + 26 + bite - 0x61;
          } else if (0x81 <= bite && bite <= 0xFE) {
            index = temp + 26 + 26 + bite - 0x81;
          }
        }

        if (0xC7 <= lead && lead <= 0xFD && 0xA1 <= bite && bite <= 0xFE) {
          index = (26 + 26 + 126) * (0xC7 - 0x81) + (lead - 0xC7) * 94 + (bite - 0xA1);
        }

        var code_point = (index === null) ? null : euckrCodePoint(index);
        if (index === null) {
          byte_pointer.offset(-1);
        }
        if (code_point === null) {
          return decoderError(options.fatal);
        }
        return code_point;
      }

      if (0x00 <= bite && bite <= 0x7F) {
        return bite;
      }

      if (0x81 <= euckr_lead && euckr_lead <= 0xFD) {
        euckr_lead = bite;
        return null;
      }

      return decoderError(options.fatal);
    };
  }

    /** @constructor */
  function ISO2022KRDecoder() {
    /** @enum */
    var state = {
      ASCII: 0,
      lead: 1,
      trail: 2
    };
    var /** @type {number} */ iso2022kr_state = state.ASCII,
        /** @type {number} */ iso2022kr_lead = 0x00;
    this.decode = function(byte_pointer, options) {
      var bite = byte_pointer.get();
      if (bite !== eof) {
        byte_pointer.offset(1);
      }
      switch (iso2022kr_state) {
      default:
      case state.ASCII:
        if (bite === 0x0E) {
          iso2022kr_state = state.lead;
          return null;
        } else if (bite === 0x0F) {
          return null;
        } else if (0x00 <= bite && bite <= 0x7E) {
          return bite;
        } else if (bite === eof) {
          return eof;
        } else {
          return decoderError(options.fatal);
        }
      case state.lead:
        if (bite === 0x0A) {
          iso2022kr_state = state.ASCII;
          return decoderError(options.fatal, 0x000A);
        } else if (bite === 0x0E) {
          return null;
        } else if (bite === 0x0F) {
          iso2022kr_state = state.ASCII;
          return null;
        } else if (bite === eof) {
          return eof;
        } else {
          iso2022kr_lead = bite;
          iso2022kr_state = state.trail;
          return null;
        }
      case state.trail:
        iso2022kr_state = state.lead;
        if (bite === eof) {
          return decoderError(options.fatal);
        }
        var code_point = null;
        if (0x21 <= iso2022kr_lead && iso2022kr_lead <= 0x46 &&
            0x21 <= bite && bite <= 0x7E) {
          code_point = euckrCodePoint((26 + 26 + 126) * (iso2022kr_lead - 1) + 26 + 26 + bite - 1);
        } else if (0x74 <= iso2022kr_lead && iso2022kr_lead <= 0x7E &&
                   0x21 <= bite && bite <= 0x7E) {
          code_point = euckrCodePoint((26 + 26 + 126) * (0xC7 - 0x81) + (iso2022kr_lead - 0x47) * 94 + (bite - 0x21));
        }
        if (code_point !== null) {
          return code_point;
        }
        return decoderError(options.fatal);
      }
    };
  }


  function getEncoding(label) {
    label = String(label).trim().toLowerCase();
    var i;
    for (i = 0; i < codecs.length; ++i) {
      if (codecs[i].labels.indexOf(label) !== -1) {
        return codecs[i];
      }
    }
    throw new Error("Unknown encoding: " + label);
  }

  // NOTE: currently unused
  function detectEncoding(label, input_stream) {
    if (input_stream.match([0xFF, 0xFE])) {
      input_stream.offset(2);
      return 'utf-16';
    } else if (input_stream.match([0xFE, 0XFF])) {
      input_stream.offset(2);
      return 'utf-16be';
    } else if (input_stream.match([0xEF, 0xBB, 0xBF])) {
      input_stream.offset(3);
      return 'utf-8';
    }
    return label;
  }

  /** @const */ var DEFAULT_ENCODING = 'utf-8';

  /**
   * @constructor
   * @param {string=} encoding
   */
  function TextEncoder(encoding) {
    if (!this || this === global) {
      return new TextEncoder(encoding);
    }
    encoding = encoding ? String(encoding) : DEFAULT_ENCODING;
    this._encoding = getEncoding(encoding); // may throw
    this._streaming = false;
    this._encoder = null;
    return this;
  }

  TextEncoder.prototype = {
    /**
     * @param {string=} string
     * @param {{stream: boolean}=} options
     */
    encode: function encode(string, options) {
      string = string ? String(string) : "";
      options = Object(options);

      if (!this._streaming) {
        this._encoder = this._encoding.getEncoder();
      }
      this._streaming = Boolean(options.stream);

      var bytes = [];
      var output_stream = ByteOutputStream(bytes);
      var input_stream = CodePointInputStream(string);
      while (!input_stream.eof()) {
        this._encoder.encode(output_stream, input_stream, {
          // TODO: options?
        });
      }
      if (!this._streaming) {
        this._encoder.encode(output_stream, input_stream, {
          // TODO: options?
        });
        this._encoder = null;
      }
      return new Uint8Array(bytes);
    }
  };
  Object.defineProperty(TextEncoder.prototype, 'encoding',
    { get: function () { return this._encoding.name; } });


  /**
   * @constructor
   * @param {string=} encoding
   */
  function TextDecoder(encoding) {
    if (!this || this === global) {
      return new TextDecoder(encoding);
    }
    encoding = encoding ? String(encoding) : DEFAULT_ENCODING;
    this._encoding = getEncoding(encoding); // may throw
    this._streaming = false;
    this._decoder = null;
    return this;
  }

  // TODO: Issue if input byte stream is offset by decoder
  // TODO: BOM detection will not work if stream header spans multiple calls
  // (last N bytes of previous stream may need to be retained?)
  TextDecoder.prototype = {
    /**
     * @param {ArrayBufferView=} view
     * @param {{fatal: boolean, stream: boolean}=} options
     */
    decode: function decode(view, options) {

      if (view && !('buffer' in view && 'byteOffset' in view && 'byteLength' in view)) {
        throw new TypeError('Expected ArrayBufferView');
      } else if (!view) {
        view = new Uint8Array(0);
      }
      options = Object(options);

      if (!this._streaming) {
        this._decoder = this._encoding.getDecoder();
      }
      this._streaming = Boolean(options.stream);

      // TODO: encoding detection via BOM?

      var bytes = new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
      var input_stream = ByteInputStream(bytes);

      var detected = detectEncoding(this._encoding.name, input_stream);
      if (getEncoding(detected) !== this._encoding) {
        throw new Error("BOM mismatch"); // TODO: what to do here?
      }

      var output_stream = CodePointOutputStream(), code_point;
      while (input_stream.get() !== eof) {
        code_point = this._decoder.decode(input_stream, {
          fatal: Boolean(options.fatal)
        });
        if (code_point !== null && code_point !== undefined && code_point !== eof) {
          output_stream.emit(code_point);
        }
      }
      if (!this._streaming) {
        do {
          code_point = this._decoder.decode(input_stream, {
            fatal: Boolean(options.fatal)
          });
          if (code_point !== null && code_point !== undefined && code_point !== eof) {
            output_stream.emit(code_point);
          }
        } while (code_point !== eof);
        this._decoder = null;
      }
      return output_stream.string();
    }
  };
  Object.defineProperty(TextDecoder.prototype, 'encoding',
    { get: function () { return this._encoding.name; } });

  global['TextEncoder'] = global['TextEncoder'] || TextEncoder;
  global['TextDecoder'] = global['TextDecoder'] || TextDecoder;
}(this));

define("deps/stringencoding/encoding.js", function(){});

/**
 * Look like node's Buffer implementation as far as our current callers require
 * using typed arrays.  Derived from the node.js implementation as copied out of
 * the node-browserify project.
 *
 * Be careful about assuming the meaning of encoders and decoders here; we are
 * using the nomenclature of the StringEncoding spec.  So:
 *
 * - encode: JS String --> ArrayBufferView
 * - decode: ArrayBufferView ---> JS String
 **/
define('buffer',['require','exports','module'],function(require, exports, module) {

function coerce(length) {
  // Coerce length to a number (possibly NaN), round up
  // in case it's fractional (e.g. 123.456) then do a
  // double negate to coerce a NaN to 0. Easy, right?
  length = ~~Math.ceil(+length);
  return length < 0 ? 0 : length;
}

/**
 * Encode a unicode string into a (Uint8Array) byte array with the given
 * encoding. Wraps TextEncoder to provide hex and base64 encoding (which it does
 * not provide).
 */
function encode(string, encoding) {
  switch (encoding) {
    case 'hex':
      var buf = new Uint8Array(string.length * 2);
      for (var i = 0; i < string.length; i++) {
        var c = string.charCodeAt(i), nib;
        nib = c >> 4;
        buf[i*2] = (nib < 10) ? (nib + 48) : (nib - 10 + 97);
        nib = c & 0xf;
        buf[i*2 + 1] = (nib < 10) ? (nib + 48) : (nib - 10 + 97);
      }
      return buf;
    case 'base64':
      // (atob is base64 ASCII string -> binary JS string)
      // we use the textencoder to go from the binary JS string to the array
      // view. (which is a buffer for our purposes because of our prototype
      // clobbering.)
      return TextEncoder('binary').encode(window.atob(string));
    // need to normalize the name (for now at least)
    case 'utf8':
      encoding = 'utf-8';
    default:
      if (!encoding)
        encoding = 'utf-8';
      return TextEncoder(encoding).encode(string);
  }
}

/**
 * Decode a Uint8Array/DataView into a unicode string given the encoding of the
 * byte stream.  Wrap TextDecoder to provide hex and base64 decoding (which it
 * does not provide).
 */
function decode(view, encoding) {
  switch (encoding) {
    case 'hex':
      var sbits = [];
      for (var i = 0; i < view.length; i += 2) {
        var nib = view[i], c;
        if (nib <= 57)
          c = 16 * (nib - 48);
        else if (nib < 97)
          c = 16 * (nib - 64 + 10);
        else
          c = 16 * (nib - 97 + 10);
        nib = view[i+1];
        if (nib <= 57)
          c += (nib - 48);
        else if (nib < 97)
          c += (nib - 64 + 10);
        else
          c += (nib - 97 + 10);
        sbits.push(String.fromCharCode(c));
      }
      return sbits.join("");
    case 'base64':
      // (btoa is binary JS string -> base64 ASCII string)
      // we need to use the textdecoder to get from the binary array to the
      // binary string; we use 'binary' to avoid truncation/loss.
      return window.btoa(TextDecoder('binary').decode(view));
    // need to normalize the name (for now at least)
    case 'utf8':
      encoding = 'utf-8';
    default:
      if (!encoding)
        encoding = 'utf-8';
      return TextDecoder(encoding).decode(view);
  }
}

/**
 * Create a buffer which is really a typed array with some methods annotated
 * on.
 */
function Buffer(subject, encoding, offset) {
  // The actual buffer that will become 'this'.
  var buf;
  var type;

  // Are we slicing?
  if (typeof offset === 'number') {
    // create a sub-view
    buf = subject.subarray(offset, coerce(encoding) + offset);
  } else {
    // Find the length
    switch (type = typeof subject) {
      case 'number':
        buf = new Uint8Array(coerce(subject));
        break;

      case 'string':
        buf = encode(subject, encoding);
        break;

      case 'object': // Assume object is an array
        // only use it verbatim if it's a buffer and we see it as such (aka
        // it's from our compartment)
        if (buf instanceof Uint8Array)
          buf = subject;
        else
          buf = new Uint8Array(subject);
        break;

      default:
        throw new Error('First argument needs to be a number, ' +
                        'array or string.');
    }
  }

  // Return the mixed-in Uint8Array to be our 'this'!
  return buf;
}
exports.Buffer = Buffer;

Buffer.byteLength = function Buffer_byteLength(string, encoding) {
  var buf = encode(string, encoding);
  return buf.length;
};

Buffer.isBuffer = function Buffer_isBuffer(obj) {
  return ((obj instanceof Uint8Array) &&
          obj.copy === BufferPrototype.copy);
};

// POSSIBLY SUBTLE AND DANGEROUS THING: We are actually clobbering stuff onto
// the Uint8Array prototype.  We do this because we're not allowed to mix our
// contributions onto the instance types, leaving us only able to mess with
// the prototype.  This obviously may affect other consumers of Uint8Array
// operating in the same global-space.
var BufferPrototype = Uint8Array.prototype;

BufferPrototype.copy = function(target, target_start, start, end) {
  var source = this;
  start || (start = 0);
  end || (end = this.length);
  target_start || (target_start = 0);

  if (end < start) throw new Error('sourceEnd < sourceStart');

  // Copy 0 bytes; we're done
  if (end === start) return;
  if (target.length == 0 || source.length == 0) return;

  if (target_start < 0 || target_start >= target.length) {
    throw new Error('targetStart out of bounds');
  }

  if (start < 0 || start >= source.length) {
    throw new Error('sourceStart out of bounds');
  }

  if (end < 0 || end > source.length) {
    throw new Error('sourceEnd out of bounds');
  }

  // Are we oob?
  if (end > this.length) {
    end = this.length;
  }

  if (target.length - target_start < end - start) {
    end = target.length - target_start + start;
  }

  for (var i = start; i < end; i++) {
    target[i + target_start] = this[i];
  }
};

BufferPrototype.slice = function(start, end) {
  if (end === undefined) end = this.length;

  if (end > this.length) {
    throw new Error('oob');
  }
  if (start > end) {
    throw new Error('oob');
  }
  return Buffer(this, end - start, +start);
};

/**
 * Your buffer has some binary data in it; create a string from that data using
 * the specified encoding.  For example, toString("base64") will hex-encode
 * the contents of the buffer.
 */
BufferPrototype.toString = function(encoding, start, end) {
  encoding = String(encoding || 'utf-8').toLowerCase();
  start = +start || 0;
  if (typeof end == 'undefined') end = this.length;

  // Fastpath empty strings
  if (+end == start) {
    return '';
  }
  if (start === 0 && end === this.length)
    return decode(this, encoding);
  else
    return decode(this.subarray(start, end), encoding);
  // In case things get slow again, comment the above block and uncomment:
/*
var rval, before = Date.now();
  if (start === 0 && end === this.length)
    rval = decode(this, encoding);
  else
    rval = decode(this.subarray(start, end), encoding);
  var delta = Date.now() - before;
  if (delta > 2)
    console.error('SLOWDECODE', delta, end - start, encoding);
  return rval;
*/
};

BufferPrototype.write  = function(string, offset, length, encoding) {
  // Support both (string, offset, length, encoding)
  // and the legacy (string, encoding, offset, length)
  if (isFinite(offset)) {
    if (!isFinite(length)) {
      encoding = length;
      length = undefined;
    }
  } else {  // legacy
    var swap = encoding;
    encoding = offset;
    offset = length;
    length = swap;
  }

  offset = +offset || 0;
  var remaining = this.length - offset;
  if (!length) {
    length = remaining;
  } else {
    length = +length;
    if (length > remaining) {
      length = remaining;
    }
  }
  encoding = String(encoding || 'utf-8').toLowerCase();

  var encoded = encode(string, encoding);
  for (var i = 0; i < encoded.length; i++)
    this[i + offset] = encoded[i];

  return encoded.length;
};

});

/**
 * Do the required global namespace clobbering for our node binding friends.
 **/

define('rdimap/imapclient/shim-sham',[
    'buffer',
  ],
  function(
    $buffer
  ) {

window.Buffer = $buffer.Buffer;

var timeouts = [];
var messageName = "zero-timeout-message";

// Like setTimeout, but only takes a function argument.  There's
// no time argument (always zero) and no arguments (you have to
// use a closure).
function setZeroTimeout(fn) {
  timeouts.push(fn);
  window.postMessage(messageName, "*");
}

function handleMessage(event) {
  if (event.source == window && event.data == messageName) {
    event.stopPropagation();
    if (timeouts.length > 0) {
      var fn = timeouts.shift();
      fn();
    }
  }
}

window.addEventListener("message", handleMessage, true);

// Add the one thing we want added to the window object.
window.setZeroTimeout = setZeroTimeout;

window.process = {
  immediate: false,
  nextTick: function(cb) {
    if (this.immediate)
      cb();
    else
      window.setZeroTimeout(cb);
  }
};

}); // end define
;
// vim:ts=4:sts=4:sw=4:
/*!
 *
 * Copyright 2007-2009 Tyler Close under the terms of the MIT X license found
 * at http://www.opensource.org/licenses/mit-license.html
 * Forked at ref_send.js version: 2009-05-11
 *
 * Copyright 2009-2011 Kris Kowal under the terms of the MIT
 * license found at http://github.com/kriskowal/q/raw/master/LICENSE
 *
 */

(function (definition) {

    // This file will function properly as a <script> tag, or a module
    // using CommonJS and NodeJS or RequireJS module formats.  In
    // Common/Node/RequireJS, the module exports the Q API and when
    // executed as a simple <script>, it creates a Q global instead.

    // RequireJS
    if (typeof define === "function") {
        define('q',[],definition);
    // CommonJS
    } else if (typeof exports === "object") {
        definition(require, exports);
    // <script>
    } else {
        definition(void 0, Q = {});
    }

})(function (serverSideRequire, exports) {



var nextTick;
try {
    // Narwhal, Node (with a package, wraps process.nextTick)
    // "require" is renamed to "serverSideRequire" so
    // client-side scrapers do not try to load
    // "event-queue".
    nextTick = serverSideRequire("event-queue").enqueue;
} catch (e) {
    // browsers
    if (typeof MessageChannel !== "undefined") {
        // modern browsers
        // http://www.nonblocking.io/2011/06/windownexttick.html
        var channel = new MessageChannel();
        // linked list of tasks (single, with head node)
        var head = {}, tail = head;
        channel.port1.onmessage = function () {
            var next = head.next;
            var task = next.task;
            head = next;
            task();
        };
        nextTick = function (task) {
            tail = tail.next = {task: task};
            channel.port2.postMessage();
        };
    } else {
        // old browsers
        nextTick = function (task) {
            setTimeout(task, 0);
        };
    }
}

// useful for an identity stub and default resolvers
function identity (x) {return x;}

// shims
var shim = function (object, name, shim) {
    if (!object[name])
        object[name] = shim;
    return object[name];
};

var freeze = shim(Object, "freeze", identity);

var create = shim(Object, "create", function (prototype) {
    var Type = function () {};
    Type.prototype = prototype;
    return new Type();
});

var keys = shim(Object, "keys", function (object) {
    var keys = [];
    for (var key in object)
        keys.push(key);
    return keys;
});

var reduce = Array.prototype.reduce || function (callback, basis) {
    var i = 0,
        ii = this.length;
    // concerning the initial value, if one is not provided
    if (arguments.length == 1) {
        // seek to the first value in the array, accounting
        // for the possibility that is is a sparse array
        do {
            if (i in this) {
                basis = this[i++];
                break;
            }
            if (++i >= ii)
                throw new TypeError();
        } while (1);
    }
    // reduce
    for (; i < ii; i++) {
        // account for the possibility that the array is sparse
        if (i in this) {
            basis = callback(basis, this[i], i);
        }
    }
    return basis;
};

var isStopIteration = function (exception) {
    return Object.prototype.toString.call(exception)
        === "[object StopIteration]";
};

// Abbreviations for performance and minification
var slice = Array.prototype.slice;
var valueOf = function (value) {
    if (value === void 0 || value === null) {
        return value;
    } else {
        return value.valueOf();
    }
};

/**
 * Performs a task in a future turn of the event loop.
 * @param {Function} task
 */
exports.nextTick = nextTick;


////////////////////////////////////////////////////////////////////////////////
// Logging Support

var trace_defer = null,
    trace_resolve = null,
    trace_reject = null,
    trace_exception = null,
    trace_send_issue = null,
    trace_before_run = null,
    trace_after_run = null;

exports.loggingDisable = function() {
  trace_defer = null;
  trace_resolve = null;
  trace_reject = null;
  trace_exception = null;
  trace_send_issue = null;
  trace_before_run = null;
  trace_after_run = null;
};


////////////////////////////////////////////////////////////////////////////////
// Causeway Logging Support
//
// Anchors: We imitate JS causeway's instrument.js.  The anchor always uses a
//  number of 1, its turn always uses the same loop id, and the turn's number
//  increments every time a log entry is generated.
//

var causeway_log = null,
    causeway_turn_loop = 'L0',
    causeway_turn_num = 0, causeway_num_this_turn = 1,
    // id's issued for deferreds and messages
    causeway_id = 0,
    causeway_capture_stack, causeway_transform_stack,
    causeway_active_runs = [];

function causeway_normalize_reason(reason) {
  return reason;
}

function causeway_trace_defer(deferred, annotation) {
  deferred.annotation = annotation;
  deferred._causeway_id = 'C' + causeway_id++;
  deferred._causeway_done = false;
}
var CAUSEWAY_RESOLVED_CLASSES = ["org.ref_send.log.Fulfilled",
                                 "org.ref_send.log.Resolved",
                                 "org.ref_send.log.Event"];
function causeway_trace_resolve(deferred, value, pending, stopStacktraceAt) {
  var trace_context = ['M' + causeway_id++,
                       causeway_capture_stack(stopStacktraceAt)];
  // if this deferred was rejected, this is not a fulfillment
  if (deferred._causeway_done)
    return trace_context;
  causeway_log.push({
    "class": CAUSEWAY_RESOLVED_CLASSES,
    anchor: {
      number: causeway_num_this_turn++,
      turn: {
        loop: causeway_turn_loop,
        number: causeway_turn_num,
      }
    },
    timestamp: Date.now(),
    trace: trace_context[1],
    condition: deferred._causeway_id
  });
  return trace_context;
}
var CAUSEWAY_REJECTED_CLASSES = ["org.ref_send.log.Rejected",
                                 "org.ref_send.log.Resolved",
                                 "org.ref_send.log.Event"];
function causeway_trace_reject(deferred, reason, stopStacktraceAt) {
  deferred._causeway_done = true;
  causeway_log.push({
    "class": CAUSEWAY_REJECTED_CLASSES,
    anchor: {
      number: causeway_num_this_turn++,
      turn: {
        loop: causeway_turn_loop,
        number: causeway_turn_num,
      }
    },
    timestamp: Date.now(),
    trace: causeway_capture_stack(stopStacktraceAt),
    condition: deferred._causeway_id,
    reason: causeway_normalize_reason(reason)
  });
}
var CAUSEWAY_PROBLEM_CLASSES = ["org.ref_send.log.Problem",
                                "org.ref_send.log.Comment",
                                "org.ref_send.log.Event"];
function causeway_trace_exception(deferred, exception, during, value) {
  causeway_log.push({
    "class": CAUSEWAY_PROBLEM_CLASSES,
    anchor: {
      number: causeway_num_this_turn++,
      turn: {
        loop: causeway_turn_loop,
        number: causeway_turn_num,
      }
    },
    timestamp: Date.now(),
    trace: causeway_transform_stack(exception),
    text: exception.message,
    reason: {
      "class": ["Error"]
    }
  });
}
var CAUSEWAY_SENT_CLASSES = ["org.ref_send.log.Sent",
                             "org.ref_send.log.Event"];
function causeway_trace_send_issue(deferred, value, args, stopStacktraceAt) {
  var msgId = 'M' + causeway_id++,
      stack = causeway_capture_stack(stopStacktraceAt), rec;
  causeway_log.push(rec = {
    "class": CAUSEWAY_SENT_CLASSES,
    anchor: {
      number: causeway_num_this_turn++,
      turn: {
        loop: causeway_turn_loop,
        number: causeway_turn_num,
      }
    },
    timestamp: Date.now(),
    trace: stack,
    condition: deferred._causeway_id,
    message: msgId
  });
  if (deferred.annotation) {
    // the causality grid uses a fix [length - 2] subscripting for major type
    //  detection, so let's avoid changing its logic for now.
    //rec["class"].push("org.ref_send.log.Comment");
    rec.text = deferred.annotation;
  }
  return [msgId, stack];
}
var CAUSEWAY_GOT_CLASSES = ["org.ref_send.log.Got",
                            "org.ref_send.log.Event"];
function causeway_trace_before_run(trace_context, deferred, value, args) {
  // if anything happened in the current turn, we need a new turn number
  if (causeway_num_this_turn > 1) {
    causeway_turn_num++;
    causeway_num_this_turn = 1;
  }

  causeway_active_runs.push(deferred);
  causeway_log.push({
    "class": CAUSEWAY_GOT_CLASSES,
    anchor: {
      number: causeway_num_this_turn++,
      turn: {
        loop: causeway_turn_loop,
        number: causeway_turn_num,
      }
    },
    timestamp: Date.now(),
    trace: trace_context[1],
    message: trace_context[0],
  });
}
var CAUSEWAY_DONE_CLASSES = ["org.ref_send.log.Done",
                             "org.ref_send.log.Event"];
function causeway_trace_after_run(trace_context, deferred, value, args) {
  causeway_active_runs.pop();
  causeway_log.push({
    "class": CAUSEWAY_DONE_CLASSES,
    anchor: {
      number: causeway_num_this_turn++,
      turn: {
        loop: causeway_turn_loop,
        number: causeway_turn_num,
      }
    },
    timestamp: Date.now(),
  });
  // Since we are 'losing control' of the event loop, be sure to increment the
  //  turn.
  causeway_turn_num++;
  causeway_num_this_turn = 1;
}

function causeway_transform_v8_stack(ex) {
  var frames = ex.stack, calls = [];
  for (var i = 0; i < frames.length; i++) {
    var frame = frames[i];
    // from http://code.google.com/p/causeway/
    //        src/js/com/teleometry/causeway/log/html/instrument.js
    calls.push({
        name: frame.getFunctionName() ||
              (frame.getTypeName() + '.' + (frame.getMethodName() || '')),
        source: /^[^?#]*/.exec(frame.getFileName())[0], // ^ OK on URL
        span: [ [ frame.getLineNumber(), frame.getColumnNumber() ] ]
      });
  }
  return {
    calls: calls
  };
}
function causeway_transform_spidermonkey_stack(ex) {
  var sframes = ex.stack.split("\n"), calls = [], match;
  for (var i = 0; i < sframes.length; i++) {
    if ((match = /^(.*)@(.+):(\d+)$/.exec(sframes[i]))) {
      frames.push({
        filename: simplifyFilename(match[2]),
        lineNo: match[3],
        funcName: match[1],
      });
    }
  }
  return {
    calls: calls
  };
}
function causeway_transform_opera_stack(ex) {
  // XXX use the pub domain regex impl from
  //   https://github.com/eriwen/javascript-stacktrace/blob/master/stacktrace.js
  throw Error("XXX");
}

function causeway_capture_v8_stack(constructorOpt) {
  var ex = {};
  Error.captureStackTrace(ex, constructorOpt || causeway_capture_v8_stack);
  return causeway_transform_stack(ex);
}
function causeway_capture_spidermonkey_stack() {
  try {
    throw new Error();
  }
  catch (ex) {
    return causeway_transform_stack(ex);
  }
}
function causeway_capture_opera_stack() {
  try {
    throw new Error();
  }
  catch (ex) {
    return causeway_transform_stack(ex);
  }
}

exports.loggingEnableCauseway = function(options) {
  options = options || {};

  trace_defer = causeway_trace_defer;
  trace_resolve = causeway_trace_resolve;
  trace_reject = causeway_trace_reject;
  trace_exception = causeway_trace_exception;
  trace_send_issue = causeway_trace_send_issue;
  trace_before_run = causeway_trace_before_run;
  trace_after_run = causeway_trace_after_run;

  // (V8 or clobbered to resemble V8)
  if ("captureStackTrace" in Error) {
    causeway_capture_stack = causeway_capture_v8_stack;
    causeway_transform_stack = causeway_transform_v8_stack;
  }
  // other (spidermonkey or opera 11+)
  else {
    var ex = null;
    try {
      throw new Error();
    }
    catch (e) {
      ex = e;
    }

    // spidermonkey
    if (typeof(ex.stack) === "string") {
      causeway_capture_stack = causeway_capture_spidermonkey_stack;
      causeway_transform_stack = causeway_transform_spidermonkey_stack;
    }
    // opera
    else if (typeof(ex.stacktrace) === "string") {
      causeway_capture_stack = causeway_capture_opera_stack;
      causeway_transform_stack = causeway_transform_opera_stack;
    }
    else {
      throw new Error("Unable to figure out stack trace mechanism.");
    }
  }
  // Callers may already have their own prepareStackTrace in effect; we don't
  // want to stomp on that or cause its value to continually change, so allow
  // them to provide a helper transformation function.
  if ("transformStack" in options) {
    causeway_transform_stack = options.transformStack;
  }
  // Overwrite the prepareStackTrace, sketchy.
  else if (causeway_capture_stack === causeway_capture_v8_stack) {
    Error.prepareStackTrace = function(ex, stack) {
      return stack;
    };
  }

  causeway_log = [];
};

exports.causewayResetLog = function() {
  var oldLog = causeway_log;
  causeway_log = [];
  return oldLog;
};

////////////////////////////////////////////////////////////////////////////////
// Friendly Logging Support

var friendly_unhandled_rejection_handler = null,
    friendly_unresolved_deferreds = null,
    friendly_annotation_generator = null;
function friendly_trace_defer(deferred, annotation) {
  if (friendly_unresolved_deferreds) {
    if (!annotation && friendly_annotation_generator)
      annotation = friendly_annotation_generator();
    deferred.annotation = annotation;
    friendly_unresolved_deferreds.push(deferred);
  }
}
function friendly_trace_resolve(deferred, value, pending) {
  if (friendly_unresolved_deferreds) {
    var index = friendly_unresolved_deferreds.indexOf(deferred);
    if (index !== -1)
      friendly_unresolved_deferreds.splice(index, 1);
  }
  if (isRejected(value) && pending.length === 0) {
    friendly_unhandled_rejection_handler(value.valueOf().reason);
  }
}

function friendly_throw(ex) {
  throw ex;
}

/**
 * Enable warnings when a promise is rejected but there is nothing listening.
 *
 * Other possibilities:
 * - Track unresolved deferreds, be able to regurgitate a list of them at any
 *   point, possibly with backtraces / chaining.
 */
exports.loggingEnableFriendly = function(options) {
  exports.loggingDisable();
  friendly_unhandled_rejection_handler = null;
  friendly_unresolved_deferreds = null;
  friendly_annotation_generator = null;

  function checkOpt(name) {
    return ((name in options) && !!options[name]);
  }

  if (checkOpt("unhandledRejections")) {
    trace_resolve = friendly_trace_resolve;
    if (typeof(options.unhandledRejections) === 'function')
      friendly_unhandled_rejection_handler = options.unhandledRejections;
    else if (options.unhandledRejections === 'log')
      friendly_unhandled_rejection_handler = console.error.bind(console);
    else
      friendly_unhandled_rejection_handler = friendly_throw;
  }
  if (checkOpt("exceptions")) {
    if (typeof(options.exceptions) === 'function')
      trace_exception = function(deferred, exception, where, value) {
        options.exceptions(exception, where);
      };
    else
      trace_exception = function(deferred, exception, where, value) {
        console.error("exception in '" + where + "'", exception);
      };
  }
  if (checkOpt("rejections")) {
    if (typeof(options.rejections) === 'function')
      trace_reject = function(deferred, reason, alreadyResolved) {
        options.rejections(reason, alreadyResolved);
      };
    else
      trace_reject = function(deferred, reason, alreadyResolved) {
        console.trace((alreadyResolved ? "already resolved " : "") +
          "rejection:", reason);
      };
  }
  if (checkOpt("trackLive")) {
    trace_defer = friendly_trace_defer;
    trace_resolve = friendly_trace_resolve;
    friendly_unresolved_deferreds = [];

    if (typeof(options.trackLive) === 'function')
      friendly_annotation_generator = options.trackLive;
  }
};

/**
 * Return the list of unresolved deferreds at this point.  Optionally, reset
 * clear the list so that these deferreds are not returned in the next call
 * to this function regardless of whether they become resolved or not.
 */
exports.friendlyUnresolvedDeferreds = function(reset) {
  var unresolvedAnnotations = [];
  for (var i = 0; i < friendly_unresolved_deferreds.length; i++) {
    unresolvedAnnotations.push(friendly_unresolved_deferreds[i].annotation);
  }
  if (reset)
    friendly_unresolved_deferreds = [];
  return unresolvedAnnotations;
};

////////////////////////////////////////////////////////////////////////////////
// Custom Logging Support

exports.loggingEnableCustom = function() {
};

////////////////////////////////////////////////////////////////////////////////


/**
 * Constructs a {promise, resolve} object.
 *
 * The resolver is a callback to invoke with a more resolved value for the
 * promise. To fulfill the promise, invoke the resolver with any value that is
 * not a function. To reject the promise, invoke the resolver with a rejection
 * object. To put the promise in the same state as another promise, invoke the
 * resolver with that other promise.
 */
exports.defer = defer;

function defer(annotation) {
    // if "pending" is an "Array", that indicates that the promise has not yet
    // been resolved.  If it is "undefined", it has been resolved.  Each
    // element of the pending array is itself an array of complete arguments to
    // forward to the resolved promise.  We coerce the resolution value to a
    // promise using the ref promise because it handles both fully
    // resolved values and other promises gracefully.
    var pending = [], value;

    var deferred = create(defer.prototype);
    var promise = create(Promise.prototype);

    promise.promiseSend = function () {
        var args = slice.call(arguments), trace_context;
        if (trace_send_issue)
            trace_context = trace_send_issue(deferred, value, args,
                                             promise.promiseSend);
        if (pending) {
            pending.push(args);
        } else {
            nextTick(function () {
                if (trace_before_run)
                    trace_before_run(trace_context, deferred, value, args);
                value.promiseSend.apply(value, args);
                if (trace_after_run)
                    trace_after_run(trace_context, deferred, value, args);
            });
        }
    };

    promise.valueOf = function () {
        if (pending)
            return promise;
        return value.valueOf();
    };

    var resolve = function (resolvedValue) {
        var i, ii, task, trace_context;
        if (!pending)
            return;
        value = ref(resolvedValue);
        if (trace_resolve)
            trace_context = trace_resolve(deferred, value, pending, resolve);
        reduce.call(pending, function (undefined, pending) {
            nextTick(function () {
                if (trace_before_run)
                    trace_before_run(trace_context, deferred, value);
                value.promiseSend.apply(value, pending);
                if (trace_after_run)
                    trace_after_run(trace_context, deferred, value);
            });
        }, void 0);
        pending = void 0;
        return value;
    };

    deferred.promise = freeze(promise);
    deferred.resolve = resolve;
    deferred.reject = function (reason) {
        if (trace_reject)
            trace_reject(deferred, reason, !pending);
        return resolve(reject(reason));
    };

    if (trace_defer)
        trace_defer(deferred, annotation);

    return deferred;
}

defer.prototype.node = function () {
    var self = this;
    return function (error, value) {
        if (error) {
            self.reject(error);
        } else if (arguments.length > 2) {
            self.resolve(Array.prototype.slice.call(arguments, 1));
        } else {
            self.resolve(value);
        }
    };
};

/**
 * Constructs a Promise with a promise descriptor object and optional fallback
 * function.  The descriptor contains methods like when(rejected), get(name),
 * put(name, value), post(name, args), and delete(name), which all
 * return either a value, a promise for a value, or a rejection.  The fallback
 * accepts the operation name, a resolver, and any further arguments that would
 * have been forwarded to the appropriate method above had a method been
 * provided with the proper name.  The API makes no guarantees about the nature
 * of the returned object, apart from that it is usable whereever promises are
 * bought and sold.
 */
exports.makePromise = Promise;
function Promise(descriptor, fallback, valueOf) {

    if (fallback === void 0) {
        fallback = function (op) {
            return reject("Promise does not support operation: " + op);
        };
    }

    var promise = create(Promise.prototype);

    promise.promiseSend = function (op, resolved /* ...args */) {
        var args = slice.call(arguments, 2);
        var result;
        try {
            if (descriptor[op]) {
                result = descriptor[op].apply(descriptor, args);
            } else {
                result = fallback.apply(descriptor, [op].concat(args));
            }
        } catch (exception) {
            if (trace_exception)
                trace_exception(deferred, exception, 'promiseSend', args);
            result = reject(exception);
        }
        return (resolved || identity)(result);
    };

    if (valueOf)
        promise.valueOf = valueOf;

    return freeze(promise);
};

// provide thenables, CommonJS/Promises/A
Promise.prototype.then = function (fulfilled, rejected) {
    return when(this, fulfilled, rejected);
};

// Chainable methods
reduce.call(
    [
        "when", "spread", "send",
        "get", "put", "del",
        "post", "invoke",
        "keys",
        "apply", "call",
        "all", "wait", "join",
        "fail", "fin",
        "view", "viewInfo",
        "timeout", "delay",
        "end"
    ],
    function (prev, name) {
        Promise.prototype[name] = function () {
            return exports[name].apply(
                exports,
                [this].concat(slice.call(arguments))
            );
        };
    },
    void 0
)

Promise.prototype.toSource = function () {
    return this.toString();
};

Promise.prototype.toString = function () {
    return '[object Promise]';
};

freeze(Promise.prototype);

/**
 * @returns whether the given object is a promise.
 * Otherwise it is a fulfilled value.
 */
exports.isPromise = isPromise;
function isPromise(object) {
    return object && typeof object.promiseSend === "function";
};

/**
 * @returns whether the given object is a resolved promise.
 */
exports.isResolved = isResolved;
function isResolved(object) {
    return !isPromise(valueOf(object));
};

/**
 * @returns whether the given object is a value or fulfilled
 * promise.
 */
exports.isFulfilled = isFulfilled;
function isFulfilled(object) {
    return !isPromise(valueOf(object)) && !isRejected(object);
};

/**
 * @returns whether the given object is a rejected promise.
 */
exports.isRejected = isRejected;
function isRejected(object) {
    object = valueOf(object);
    if (object === void 0 || object === null)
        return false;
    return !!object.promiseRejected;
}

/**
 * Constructs a rejected promise.
 * @param reason value describing the failure
 */
exports.reject = reject;
function reject(reason) {
    return Promise({
        "when": function (rejected) {
            return rejected ? rejected(reason) : reject(reason);
        }
    }, function fallback(op) {
        return reject(reason);
    }, function valueOf() {
        var rejection = create(reject.prototype);
        rejection.promiseRejected = true;
        rejection.reason = reason;
        return rejection;
    });
}

reject.prototype = create(Promise.prototype, {
    constructor: { value: reject }
});

/**
 * Constructs a promise for an immediate reference.
 * @param value immediate reference
 */
exports.ref = ref;
function ref(object) {
    // If the object is already a Promise, return it directly.  This enables
    // the ref function to both be used to created references from
    // objects, but to tolerably coerce non-promises to refs if they are
    // not already Promises.
    if (isPromise(object))
        return object;
    // assimilate thenables, CommonJS/Promises/A
    if (object && typeof object.then === "function") {
        var result = defer();
        object.then(result.resolve, result.reject);
        return result.promise;
    }
    return Promise({
        "when": function (rejected) {
            return object;
        },
        "get": function (name) {
            return object[name];
        },
        "put": function (name, value) {
            return object[name] = value;
        },
        "del": function (name) {
            return delete object[name];
        },
        "post": function (name, value) {
            return object[name].apply(object, value);
        },
        "apply": function (self, args) {
            return object.apply(self, args);
        },
        "viewInfo": function () {
            var on = object;
            var properties = {};
            while (on) {
                Object.getOwnPropertyNames(on).forEach(function (name) {
                    if (!properties[name])
                        properties[name] = typeof on[name];
                });
                on = Object.getPrototypeOf(on);
            }
            return {
                "type": typeof object,
                "properties": properties
            }
        },
        "keys": function () {
            return keys(object);
        }
    }, void 0, function valueOf() {
        return object;
    });
}

/**
 * Annotates an object such that it will never be
 * transferred away from this process over any promise
 * communication channel.
 * @param object
 * @returns promise a wrapping of that object that
 * additionally responds to the 'isDef' message
 * without a rejection.
 */
exports.master = master;
function master(object) {
    return Promise({
        "isDef": function () {}
    }, function fallback(op) {
        var args = slice.call(arguments);
        return send.apply(void 0, [object].concat(args));
    }, function () {
        return valueOf(object);
    });
}

exports.viewInfo = viewInfo;
function viewInfo(object, info) {
    object = ref(object);
    if (info) {
        return Promise({
            "viewInfo": function () {
                return info;
            }
        }, function fallback(op) {
            var args = slice.call(arguments);
            return send.apply(void 0, [object].concat(args));
        }, function () {
            return valueOf(object);
        });
    } else {
        return send(object, "viewInfo")
    }
}

exports.view = view;
function view(object) {
    return viewInfo(object).when(function (info) {
        var view;
        if (info.type === "function") {
            view = function () {
                return apply(object, void 0, arguments);
            };
        } else {
            view = {};
        }
        var properties = info.properties || {};
        Object.keys(properties).forEach(function (name) {
            if (properties[name] === "function") {
                view[name] = function () {
                    return post(object, name, arguments);
                };
            }
        });
        return ref(view);
    });
}

/**
 * Registers an observer on a promise.
 *
 * Guarantees:
 *
 * 1. that fulfilled and rejected will be called only once.
 * 2. that either the fulfilled callback or the rejected callback will be
 *    called, but not both.
 * 3. that fulfilled and rejected will not be called in this turn.
 *
 * @param value     promise or immediate reference to observe
 * @param fulfilled function to be called with the fulfilled value
 * @param rejected  function to be called with the rejection reason
 * @param progress  unused function to be called with progress updates
 * @param annotation an object to identify/name the created promise
 * @return promise for the return value from the invoked callback
 */
exports.when = when;
function when(value, fulfilled, rejected, progress, annotation) {
    var deferred = defer(annotation);
    var done = false;   // ensure the untrusted promise makes at most a
                        // single call to one of the callbacks

    function _fulfilled(value) {
        try {
            return fulfilled ? fulfilled(value) : value;
        } catch (exception) {
            if (trace_exception)
                trace_exception(deferred, exception, 'resolve', value);
            return reject(exception);
        }
    }

    function _rejected(reason) {
        try {
            return rejected ? rejected(reason) : reject(reason);
        } catch (exception) {
            if (trace_exception)
                trace_exception(deferred, exception, 'reject', reason);
            return reject(exception);
        }
    }

    nextTick(function () {
        ref(value).promiseSend("when", function (value) {
            if (done)
                return;
            done = true;
            deferred.resolve(
                ref(value)
                .promiseSend("when", _fulfilled, _rejected)
            );
        }, function (reason) {
            if (done)
                return;
            done = true;
            deferred.resolve(_rejected(reason));
        });
    });

    return deferred.promise;
}

exports.spread = spread;
function spread(promise, fulfilled, rejected) {
    return when(promise, function (values) {
        return fulfilled.apply(void 0, values);
    }, rejected);
}

/**
 * The async function is a decorator for generator functions, turning
 * them into asynchronous generators.  This presently only works in
 * Firefox/Spidermonkey, however, this code does not cause syntax
 * errors in older engines.  This code should continue to work and
 * will in fact improve over time as the language improves.
 *
 * Decorates a generator function such that:
 *  - it may yield promises
 *  - execution will continue when that promise is fulfilled
 *  - the value of the yield expression will be the fulfilled value
 *  - it returns a promise for the return value (when the generator
 *    stops iterating)
 *  - the decorated function returns a promise for the return value
 *    of the generator or the first rejected promise among those
 *    yielded.
 *  - if an error is thrown in the generator, it propagates through
 *    every following yield until it is caught, or until it escapes
 *    the generator function altogether, and is translated into a
 *    rejection for the promise returned by the decorated generator.
 *  - in present implementations of generators, when a generator
 *    function is complete, it throws ``StopIteration``, ``return`` is
 *    a syntax error in the presence of ``yield``, so there is no
 *    observable return value. There is a proposal[1] to add support
 *    for ``return``, which would permit the value to be carried by a
 *    ``StopIteration`` instance, in which case it would fulfill the
 *    promise returned by the asynchronous generator.  This can be
 *    emulated today by throwing StopIteration explicitly with a value
 *    property.
 *
 *  [1]: http://wiki.ecmascript.org/doku.php?id=strawman:async_functions#reference_implementation
 *
 */
exports.async = async;
function async(makeGenerator) {
    return function () {
        // when verb is "send", arg is a value
        // when verb is "throw", arg is a reason/error
        var continuer = function (verb, arg) {
            var result;
            try {
                result = generator[verb](arg);
            } catch (exception) {
                if (isStopIteration(exception)) {
                    return exception.value;
                } else {
                    return reject(exception);
                }
            }
            return when(result, callback, errback);
        };
        var generator = makeGenerator.apply(this, arguments);
        var callback = continuer.bind(continuer, "send");
        var errback = continuer.bind(continuer, "throw");
        return callback();
    };
}

/**
 * Constructs a promise method that can be used to safely observe resolution of
 * a promise for an arbitrarily named method like "propfind" in a future turn.
 *
 * "Method" constructs methods like "get(promise, name)" and "put(promise)".
 */
exports.Method = Method;
function Method (op) {
    return function (object) {
        var args = slice.call(arguments, 1);
        return send.apply(void 0, [object, op].concat(args));
    };
}

/**
 * sends a message to a value in a future turn
 * @param object* the recipient
 * @param op the name of the message operation, e.g., "when",
 * @param ...args further arguments to be forwarded to the operation
 * @returns result {Promise} a promise for the result of the operation
 */
exports.send = send;
function send(object, op) {
    var deferred = defer();
    var args = slice.call(arguments, 2);
    object = ref(object);
    nextTick(function () {
        object.promiseSend.apply(
            object,
            [op, deferred.resolve].concat(args)
        );
    });
    return deferred.promise;
}

/**
 * Gets the value of a property in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of property to get
 * @return promise for the property value
 */
exports.get = Method("get");

/**
 * Sets the value of a property in a future turn.
 * @param object    promise or immediate reference for object object
 * @param name      name of property to set
 * @param value     new value of property
 * @return promise for the return value
 */
exports.put = Method("put");

/**
 * Deletes a property in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of property to delete
 * @return promise for the return value
 */
exports.del = Method("del");

/**
 * Invokes a method in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of method to invoke
 * @param value     a value to post, typically an array of
 *                  invocation arguments for promises that
 *                  are ultimately backed with `ref` values,
 *                  as opposed to those backed with URLs
 *                  wherein the posted value can be any
 *                  JSON serializable object.
 * @return promise for the return value
 */
var post = exports.post = Method("post");

/**
 * Invokes a method in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of method to invoke
 * @param ...args   array of invocation arguments
 * @return promise for the return value
 */
exports.invoke = function (value, name) {
    var args = slice.call(arguments, 2);
    return post(value, name, args);
};

/**
 * Applies the promised function in a future turn.
 * @param object    promise or immediate reference for target function
 * @param context   the context object (this) for the call
 * @param args      array of application arguments
 */
var apply = exports.apply = Method("apply");

/**
 * Calls the promised function in a future turn.
 * @param object    promise or immediate reference for target function
 * @param context   the context object (this) for the call
 * @param ...args   array of application arguments
 */
var call = exports.call = function (value, context) {
    var args = slice.call(arguments, 2);
    return apply(value, context, args);
};

/**
 * Requests the names of the owned properties of a promised
 * object in a future turn.
 * @param object    promise or immediate reference for target object
 * @return promise for the keys of the eventually resolved object
 */
exports.keys = Method("keys");

/**
 * Turns an array of promises into a promise for an array.  If any of
 * the promises gets rejected, the whole array is rejected immediately.
 * @param {Array*} an array (or promise for an array) of values (or
 * promises for values)
 * @returns a promise for an array of the corresponding values
 */
// By Mark Miller
// http://wiki.ecmascript.org/doku.php?id=strawman:concurrency&rev=1308776521#allfulfilled
exports.all = all;
function all(promises, annotation) {
    return when(promises, function (promises) {
        var countDown = promises.length;
        if (countDown === 0)
            return ref(promises);
        var deferred = defer(annotation);
        reduce.call(promises, function (undefined, promise, index) {
            when(promise, function (value) {
                promises[index] = value;
                if (--countDown === 0)
                    deferred.resolve(promises);
            }, void 0, void 0, "Q:all")
            .fail(deferred.reject);
        }, void 0);
        return deferred.promise;
    });
}

/**
 * Captures the failure of a promise, giving an oportunity to recover
 * with a callback.  If the given promise is fulfilled, the returned
 * promise is fulfilled.
 * @param {Any*} promise for something
 * @param {Function} callback to fulfill the returned promise if the
 * given promise is rejected
 * @returns a promise for the return value of the callback
 */
exports.fail = fail;
function fail(promise, rejected) {
    return when(promise, void 0, rejected, void 0, "Q:fail");
}

/**
 * Provides an opportunity to observe the rejection of a promise,
 * regardless of whether the promise is fulfilled or rejected.  Forwards
 * the resolution to the returned promise when the callback is done.
 * The callback can return a promise to defer completion.
 * @param {Any*} promise
 * @param {Function} callback to observe the resolution of the given
 * promise, takes no arguments.
 * @returns a promise for the resolution of the given promise when
 * ``fin`` is done.
 */
exports.fin = fin;
function fin(promise, callback) {
    return when(promise, function (value) {
        return when(callback(), function () {
            return value;
        });
    }, function (reason) {
        return when(callback(), function () {
            return reject(reason);
        });
    });
}

/**
 * Terminates a chain of promises, forcing rejections to be
 * thrown as exceptions.
 * @param {Any*} promise at the end of a chain of promises
 * @returns nothing
 */
exports.end = end;
function end(promise) {
    when(promise, void 0, function (error) {
        // forward to a future turn so that ``when``
        // does not catch it and turn it into a rejection.
        nextTick(function () {
            throw error;
        });
    });
}

/**
 * Causes a promise to be rejected if it does not get fulfilled before
 * some milliseconds time out.
 * @param {Any*} promise
 * @param {Number} milliseconds timeout
 * @returns a promise for the resolution of the given promise if it is
 * fulfilled before the timeout, otherwise rejected.
 */
exports.timeout = timeout;
function timeout(promise, timeout) {
    var deferred = defer();
    when(promise, deferred.resolve, deferred.reject);
    setTimeout(function () {
        deferred.reject("Timed out");
    }, timeout);
    return deferred.promise;
}

/**
 * Returns a promise for the given value (or promised value) after some
 * milliseconds.
 * @param {Any*} promise
 * @param {Number} milliseconds
 * @returns a promise for the resolution of the given promise after some
 * time has elapsed.
 */
exports.delay = delay;
function delay(promise, timeout) {
    if (timeout === void 0) {
        timeout = promise;
        promise = void 0;
    }
    var deferred = defer();
    setTimeout(function () {
        deferred.resolve(promise);
    }, timeout);
    return deferred.promise;
}

/**
 * Wraps a NodeJS continuation passing function and returns an equivalent
 * version that returns a promise.
 *
 *      Q.node(FS.readFile)(__filename)
 *      .then(console.log)
 *      .end()
 *
 */
exports.node = node;
function node(callback /* thisp, ...args*/) {
    if (arguments.length > 1) {
        var args = Array.prototype.slice.call(arguments, 1);
        callback = callback.bind.apply(callback, args);
    }
    return function () {
        var deferred = defer();
        var args = slice.call(arguments);
        // add a continuation that resolves the promise
        args.push(deferred.node());
        // trap exceptions thrown by the callback
        apply(callback, this, args)
        .fail(deferred.reject);
        return deferred.promise;
    };
}

/**
 * Passes a continuation to a Node function and returns a promise.
 *
 *      var FS = require("fs");
 *      Q.ncall(FS.readFile, __filename)
 *      .then(function (content) {
 *      })
 *
 */
exports.ncall = ncall;
function ncall(callback, thisp /*, ...args*/) {
    var args = slice.call(arguments, 2);
    return node(callback).apply(thisp, args);
}

});

define('microtime',['require'],function (require) {
  return {
    now: function () {
      return Date.now() * 1000;
    }
  };
});

/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at:
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Mozilla Raindrop Code.
 *
 * The Initial Developer of the Original Code is
 *   The Mozilla Foundation
 * Portions created by the Initial Developer are Copyright (C) 2011
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Andrew Sutherland <asutherland@asutherland.org>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

/**
 * Exception transformation/normalization logic from the soon-to-be-dead
 *  jstut "esther" speculative test framework.  (Loggest and ArbPL are descended
 *  replacements for it.)
 *
 * This defines a "defineStackTrace" method on Error as a side-effect which
 *  means no one else but us is allowed to try that trick.  It's unclear what
 *  impact this has on the node default handlers... although I'm sure it will
 *  become obvious real quick.
 **/

define('rdcommon/extransform',[
    'require',
    'exports'
  ],
  function(
    require,
    exports
  ) {

var baseUrl;
// XXX previous requirejs web magic...
if (false) {
  baseUrl = require.s.contexts._.config.baseUrl;
  if (baseUrl.length > 3 && baseUrl.substring(0, 3) === "../") {
    var targUrl = document.location.origin + document.location.pathname;
    // strip down to the parent directory (lose file or just trailing "/")
    targUrl = targUrl.substring(0, targUrl.lastIndexOf("/"));
    // eat the relative bits of the baseUrl
    while (baseUrl.length >= 3 && baseUrl.substring(0, 3) === "../") {
      targUrl = targUrl.substring(0, targUrl.lastIndexOf("/"));
      baseUrl = baseUrl.substring(3);
    }
    baseUrl = targUrl + baseUrl + "/";
    console.log("baseUrl", baseUrl);
  }
}
else {
  // XXX ALMOND hack; don't even try and find node path where there is none
  /*
  require(['path'], function($path) {
    baseUrl = $path.resolve('../..');
  });
  */
}



function uneval(x) {
  return JSON.stringify(x);
}

function simplifyFilename(filename) {
  if (!filename)
    return filename;
  // simple hack to eliminate jetpack ridiculousness where we have
  //  "LONGPATH -> LONGPATH -> LONGPATH -> actualThing.js"
  if (filename.length > 96) {
    var lastSlash = filename.lastIndexOf('/');
    if (lastSlash !== -1)
      return filename.substring(lastSlash+1);
  }
  // can we reduce it?
  if (baseUrl && filename.substring(0, baseUrl.length) === baseUrl) {
    // we could take this a step further and do path analysis.
    return filename.substring(baseUrl.length);
  }
  return filename;
}

// Thunk the stack format in v8
Error.prepareStackTrace = function(e, frames) {
  var o = [];
  for (var i = 0; i < frames.length; i++) {
    var frame = frames[i];
    o.push({
      filename: simplifyFilename(frame.getFileName()),
      lineNo: frame.getLineNumber(),
      funcName: frame.getFunctionName(),
    });
  }
  return o;
};
// raise the limit in case of super-nested require()s
//Error.stackTraceLimit = 64;

// XXX not sure if this even works since Error is not supposed to be
//  configurable... provide a captureStackTrace method
// nb: and obviously, in independent sandboxes, this does jack...
if (!Error.captureStackTrace) {
  Error.captureStackTrace = function(who, errType) {
    try {
      throw new Error();
    }
    catch(ex) {
      var sframes = ex.stack.split("\n"), frames = who.stack = [], match;
      for (var i = 0; i < sframes.length; i++) {
        if ((match = SM_STACK_FORMAT.exec(sframes[i]))) {
          frames.push({
                        filename: simplifyFilename(match[2]),
                        lineNo: match[3],
                        funcName: match[1],
                      });
        }
      }
    }
  };
}

var SM_STACK_FORMAT = /^(.*)@(.+):(\d+)$/;

// this is biased towards v8/chromium for now
/**
 *
 */
exports.transformException = function transformException(e) {
console.warn("extransform:", e, "\n", e.stack);
  // it's conceivable someone
  if (!(e instanceof Error) &&
      // under jetpack, we are losing hard, probably because of the sandbox
      //  issue where everybody gets their own fundamentals, so check for stack.
      (!e || typeof(e) !== "object" || !("stack" in e))) {
    return {
      n: "Object",
      m: "" + e,
      f: [],
    };
  }

  var stack = e.stack;
  // evidence of v8 thunk?
  if (Array.isArray(stack)) {
    return {
      n: e.name,
      m: e.message,
      f: stack,
    };
  }

  // handle the spidermonkey case, XXX maybe
  var o = {
    n: e.name,
    m: e.message,
    f: [],
  };
  var sframes = stack.split("\n"), frames = o.f, match;
  for (var i = 0; i < sframes.length; i++) {
    if ((match = SM_STACK_FORMAT.exec(sframes[i]))) {
      frames.push({
        filename: simplifyFilename(match[2]),
        lineNo: match[3],
        funcName: match[1],
      });
    }
  }
  return o;
};

}); // end define
;
/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at:
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Mozilla Raindrop Code.
 *
 * The Initial Developer of the Original Code is
 *   The Mozilla Foundation
 * Portions created by the Initial Developer are Copyright (C) 2011
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Andrew Sutherland <asutherland@asutherland.org>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

/**
 * Raindrop-specific testing/logging setup; right now holds initial 'loggest'
 *  implementation details that should get refactored out into their own
 *  thing.
 *
 * The permutations of logger logic is getting a bit ugly and may be burning
 *  more cycles than is strictly necessary.  The long-term plan is some kind
 *  of simple (runtime) code generation.  The biggest win for that is considered
 *  that it will simplify our code in here and generate an obvious byproduct
 *  that is easily understood.  In cases where startup time is a concern, the
 *  generated code can also be persisted (like via RequireJS optimizer stage).
 *  This is not happening yet.
 *
 *
 * There is a need for raindrop-specific logging logic because names tend to
 *  be application specific things as well as the determination of what is
 *  interesting.
 *
 * @typedef[ListyLogEntry @list[
 *   @param[eventName String]
 *   @rest[Object]
 * ]]{
 *   The current format is meant to be generally human-readable.  We put the
 *   name of the event at the front because it most concisely expresses what
 *   is happening.  We put the details of the event after that, with the
 *   timestamp second from last and the global sequence number last.  The timing
 *   information goes last because the timestamp (uS) is going to tend to be a
 *   big number that is hard for a human to process, but serves as a nice visual
 *   delimiter for the sequence id that comes after that humans can understand.
 *   It is not useful to have it earlier because it would offset the details of
 *   the event too far from the event name.
 * }
 * @typedef[ActorUniqueName Number]{
 *   A positive (> 0) unique value for the effective namespace.
 * }
 * @typedef[ThingUniqueName Number]{
 *   A negative (< 0) unique value for the effective namespace.
 * }
 * @typedef[UniqueName @oneof[ActorUniqueName ThingUniqueName]]{
 *   Actor/logger names are positive, thing names are negative.  We do this so
 *   that even without resolving the identifiers we can present a human
 *   comprehensible understanding of semantic identifiers.
 * }
 * @typedef[SemanticIdent @oneof[
 *   @case[String]{
 *     A human readable string with no special significance.
 *   }
 *   @case[@listof[@oneof[UniqueName String]]]{
 *     A list containing human-readable strings with interspersed references to
 *     loggers/actors and things.  When displayed, the unique name references
 *     should be replaced with custom display objects (possibly just hyperlinks)
 *     which should include a human-understandable representation of what the
 *     name is referencing.  Entries in the list should be joined so that
 *     whitespace is inserted if the adjacent object is not a string or the
 *     string does not already contain whitespace or punctuation that does not
 *     require whitespace at the given point.  More specifically, the "inside"
 *     of parentheses/brackets/braces and the left side of
 *     colons/semicolons/commas do not require whitespace.  We also
 *     automatically insert commas-with-whitespace between consecutive named
 *     references.
 *
 *     String literals must not be adjacent to other string literals; you must
 *     coalesce them.  The whitespace logic can optimize based on this
 *     assumption.
 *   }
 * ]]
 * @typedef[HierLogFrag @dict[
 *   @key[loggerIdent String]{
 *     The schema name that defines this logger; the key in the dictionary
 *     passed to `register`.
 *   }
 *   @key[semanticIdent SemanticIdent]{
 *     Explains to humans what this logger is about.  It is not required to be
 *     unique, but if code always passes in the same constant string, it's
 *     probably not being super helpful.
 *
 *     Examples include:
 *     - Test case names.
 *     - Parameterized test steps. (Client A sending a message to Client B.)
 *     - Parameterized connections. (Server A talking to Server B.)
 *   }
 *   @key[uniqueName UniqueName]{
 *     A unique identifier not previously used in the effective namespace
 *     of the root HierLogFrag for this tree and all its descendents.
 *   }
 *   @key[born #:optional TimestampUS]{
 *     Timestamp of when this logger was instantiated.
 *   }
 *   @key[died #:optional TimestampUS]{
 *     Timestamp of when this logger was marked dead.
 *   }
 *   @key[entries @listof[ListyLogEntry]]{
 *     The log entries for this logger this time-slice.
 *   }
 *   @key[kids #:optional @listof[HierLogFrag]]{
 *     Log fragments of loggers deemed to be conceptually children of the logger
 *     that produced this logger.  For example, an HTTP server would have a
 *     logger and its connection workers would be loggers that are children of
 *     the server.
 *   }
 * ]]{
 *   Loggers are organized into hierarchies
 * }
 * @typedef[HierLogTimeSlice @dict[
 *   @key[begin TimestampUS]
 *   @key[end TimestampUS]
 *   @key[logFrag HierLogFrag]
 * ]]{
 *
 * }
 *
 * @typedef[ActorLifecycleNotifFunc @func[
 *   @args[
 *     @param[event @oneof["attach" "dead"]]
 *     @param[instance Object]{
 *       The instance associated with the logger.
 *     }
 *     @param[logger Logger]
 *   ]
 * ]]{
 *   Notification function to be invoked when an actor gets attached to its
 *   matching logger.
 * }
 *
 * == Original Brainstorming ==
 *  + Unit Test Understanding
 *    - Want to know what the participants are and the high-level messages that
 *       are being exchanged, plus the ability to drill down into the messages.
 *      => logging should expose the actor (with type available)
 *      => message transmission should optionally have high-level logging
 *          associated in a way that provides us with the message or lets us
 *          sniff the payload
 *  + Unit Test Failure Diagnosis
 *    - Want to know what a good run looked like, and the differences between
 *       this run and that run.
 *      => the viewer has access to a data-store.
 *  + Debugging (General)
 *    - Want to be able to trace message delivery and related activities
 *       across the system.
 *      => Use global names where possible, perhaps identity key and message
 *          hashes and TCP endpoint identifiers should allow reconstitution.
 *      x> Having clients pass around extra identifiers seems dangerous.  (Do
 *          not provide attackers with anything they do not already have,
 *          although debugging tools will of course make making use of that
 *          info easier.)
 *  + System Understanding (Initial, non-live, investigative)
 *    - Likely want what unit test understanding provides but with higher level
 *       capabilities.
 *  + System Understanding (Steady-state with testing system)
 *    - Likely want initial understanding unit test-level data but with only
 *       the traffic information and no ability to see the (private) data.
 *  + Automated Performance Runs / Regression Detection
 *    - Want timestamps of progress of message delivery.
 *    - Want easily comparable data.
 *  + At Scale Performance Understanding
 *    - Want to know throughput, latency of the various parts of the system,
 *       plus the ability to sample specific trace timelines.
 *  + At Scale Debugging of specific failures (ex: 1 user having trouble)
 *    - Want to be able to enable logging for the specific user, trace
 *       across the system.
 *
 *  + General
 *    - Want to be able to easily diff for notable changes...
 *      => Markup or something should indicate values that will vary between
 *          runs.  (Maybe as part of context?)
 *
 *  + Logging efficiency
 *    - Want minimal impact when not enabled.
 *      - But willing to accept some hit for the benefit of logging.
 *      - Assume JITs can try and help us out if we help them.
 *    - Don't want to clutter up the code with logging code.
 *    - Don't want debugging logging code that can compromise privacy
 *       accidentally active.
 *      => Use decoration/monkeypatching for debugging logging, isolated in
 *          a sub-tree that can be completely excluded from the production
 *          build process.  Have the decoration/monkeypatching be loud
 *          about what it's doing or able to fail, etc.
 *    - Nice if it's obvious that we can log/trace at a point.
 *    => Place always-on event logging in the code at hand.
 *    => Use (pre-computed) conditionals or maybe alternate classes for
 *        runtime optional logging.
 *
 *  + Storage / Transit efficiency
 *    - Want logging for test runs broken up into initialization logging and
 *       per-test compartments.
 *    => Time-bucketing (per "channel") likely sufficient for debugging logging
 *        purposes.
 *    => Performance stuff that can't be reduced to time-series probably wants
 *        its own channel, and its data should be strongly biased to aggregates.
 **/

define('rdcommon/log',[
    'q',
    'microtime',
    './extransform',
    'exports'
  ],
  function(
    $Q,
    $microtime,
    $extransform,
    exports
  ) {

/**
 * Per-thread/process sequence identifier to provide unambiguous ordering of
 *  logging events in the hopeful event we go faster than the timestamps can
 *  track.
 *
 * The long-term idea is that this gets periodically reset in an unambiguous
 *  fashion.  Because we also package timestamps in the logs, right now we
 *  can get away with just making sure not to reset the sequence more than
 *  once in a given timestamp unit (currently 1 microsecond).  This seems
 *  quite do-able.
 *
 * Note: Timestamp granularity was initially millisecond level, which was when
 *  this really was important.
 */
var gSeq = 0;

exports.getCurrentSeq = function() {
  return gSeq;
};

/**
 * Per-thread/process next unique actor/logger name to allocate.
 */
var gUniqueActorName = 1;
/**
 * Per-thread/process next unique thing name to allocate.
 */
var gUniqueThingName = -1;

var ThingProto = exports.ThingProto = {
  get digitalName() {
    return this.__diginame;
  },
  set digitalName(val) {
    this.__diginame = val;
  },
  toString: function() {
    return '[Thing:' + this.__type + ']';
  },
  toJSON: function() {
    var o = {
      type: this.__type,
      name: this.__name,
      dname: this.__diginame,
      uniqueName: this._uniqueName,
    };
    if (this.__hardcodedFamily)
      o.family = this.__hardcodedFamily;
    return o;
  },
};

/**
 * Create a thing with the given type, name, and prototype hierarchy and which
 *  is allocated with a unique name.
 *
 * This should not be called directly by user code; it is being surfaced for use
 *  by `testcontext.js` in order to define things with names drawn from an
 *  over-arching global namespace.  The caller needs to take on the
 *  responsibility of exposing the thing via a logger or the like.
 */
exports.__makeThing = function makeThing(type, humanName, digitalName, proto) {
  if (proto === undefined)
    proto = ThingProto;
  return {
    __proto__: proto,
    __type: type,
    __name: humanName,
    __diginame: digitalName,
    __hardcodedFamily: null,
    _uniqueName: gUniqueThingName--,
  };
};

function NOP() {
}

/**
 * Dummy logger prototype; instances gather statistics but do not generate
 *  detailed log events.
 */
var DummyLogProtoBase = {
  _kids: undefined,
  toString: function() {
    return '[Log]';
  },
  toJSON: function() {
    // will this actually break JSON.stringify or just cause it to not use us?
    throw new Error("I WAS NOT PLANNING ON BEING SERIALIZED");
  },
  __updateIdent: NOP,
  __die: NOP,
};

/**
 * Full logger prototype; instances accumulate log details but are intended by
 *  policy to not long anything considered user-private.  This differs from
 *  `TestLogProtoBase` which, in the name of debugging and system understanding
 *  can capture private data but which should accordingly be test data.
 */
var LogProtoBase = {
  /**
   * For use by `TestContext` to poke things' names in.  Actors'/loggers' names
   *  are derived from the list of kids.  An alternate mechanism might be in
   *  order for this, since it is so extremely specialized.  This was
   *  determined better than adding yet another generic logger mechanism until
   *  a need is shown or doing monkeypatching; at least for the time-being.
   */
  _named: null,
  toJSON: function() {
    var jo = {
      loggerIdent: this.__defName,
      semanticIdent: this._ident,
      uniqueName: this._uniqueName,
      born: this._born,
      died: this._died,
      events: this._eventMap,
      entries: this._entries,
      kids: this._kids
    };
    if (this.__latchedVars.length) {
      var latchedVars = this.__latchedVars, olv = {};
      for (var i = 0; i < latchedVars.length; i++) {
        olv[latchedVars[i]] = this[':' + latchedVars[i]];
      }
      jo.latched = olv;
    }
    if (this._named)
      jo.named = this._named;
    return jo;
  },
  __die: function() {
    this._died = $microtime.now();
    if (this.__FAB._onDeath)
      this.__FAB._onDeath(this);
  },
  __updateIdent: function(ident) {
    // NOTE: you need to update useSemanticIdent if you change this.
    // normalize all object references to unique name references.
    if (Array.isArray(ident)) {
      var normIdent = [];
      for (var i = 0; i < ident.length; i++) {
        var identBit = ident[i];
        if (typeof(identBit) !== "object" || identBit == null)
          normIdent.push(identBit);
        else
          normIdent.push(identBit._uniqueName);
      }
      ident = normIdent;
    }
    this._ident = ident;
  },
};

/**
 * Test (full) logger prototype; instances generate notifications for actor
 *  expectation checking on all calls and observe arguments that may contain
 *  user-private data (but which should only contain definitively non-private
 *  test data.)
 *
 * For simplicity of implementation, this class currently just takes the
 *  functions implemented by LogProtoBase and wraps them with a parameterized
 *  decorator.
 */
var TestLogProtoBase = {
  __proto__: LogProtoBase,

  __unexpectedEntry: function(iEntry, unexpEntry) {
    var entry = ['!unexpected', unexpEntry];
    this._entries[iEntry] = entry;
  },

  __mismatchEntry: function(iEntry, expected, actual) {
    var entry = ['!mismatch', expected, actual];
    this._entries[iEntry] = entry;
  },

  __failedExpectation: function(exp) {
    var entry = ['!failedexp', exp, $microtime.now(), gSeq++];
    this._entries.push(entry);
  },

  __die: function() {
    this._died = $microtime.now();
    var testActor = this._actor;
    if (testActor) {
      if (testActor._expectDeath) {
        testActor._expectDeath = false;
        testActor.__loggerFired();
      }
      if (testActor._lifecycleListener)
        testActor._lifecycleListener.call(null, 'dead', this.__instance, this);
    }
  },
};

const DIED_EVENTNAME = '(died)', DIED_EXP = [DIED_EVENTNAME];

var TestActorProtoBase = {
  toString: function() {
    return '[Actor ' + this.__defName + ': ' + this.__name + ']';
  },
  toJSON: function() {
    return {
      actorIdent: this.__defName,
      semanticIdent: this.__name,
      uniqueName: this._uniqueName,
      parentUniqueName: this._parentUniqueName,
      loggerUniqueName: this._logger ? this._logger._uniqueName : null,
    };
  },

  /**
   * Invoked to attach a logger to an instance; exists to provide the
   *  possibility to generate a notification event.
   */
  __attachToLogger: function(logger) {
    logger._actor = this;
    this._logger = logger;
    if (this._lifecycleListener)
      this._lifecycleListener.call(null, 'attach', logger.__instance, logger);
  },

  /**
   * Invoke a notification function when this actor gets attached to its
   *  matching logger.  This function should be invoked as soon as possible
   *  after the creation of the actor.
   *
   * @args[
   *   @param[func ActorLifecycleNotifFunc]
   * ]
   */
  attachLifecycleListener: function(func) {
    this._lifecycleListener = func;
  },

  /**
   * Indicate that the caller is going to schedule some test events
   *  asynchronously while the step is running, so we should make sure to
   *  forbid our actor from resolving itself before a matching call to
   *  `asyncEventsAllDoneDoResolve` is made.
   */
  asyncEventsAreComingDoNotResolve: function() {
    if (!this._activeForTestStep)
      throw new Error("Attempt to set expectations on an actor (" +
                      this.__defName + ": " + this.__name + ") that is not " +
                      "participating in this test step!");
    if (this._resolved)
      throw new Error("Attempt to add expectations when already resolved!");

    // (sorta evil-hack)
    // We can reuse the _expectDeath flag as a means to ensure that we don't
    //  resolve the promise prematurely, although it's semantically suspect.
    //  (And bad things will happen if the test logger does actually die...)
    if (this._expectDeath)
      throw new Error("death expectation incompatible with async events");
    this._expectDeath = true;
  },

  /**
   * Indiate that the caller is all done dynamically scheduling test events
   *  while a test step is running, and that accordingly we can allow our
   *  test actor to resolve its promise when all the events have completed.
   */
  asyncEventsAllDoneDoResolve: function() {
    // stop saying we are expecting our death; new events will trigger
    //  resolution
    this._expectDeath = false;
    // pretend something happened to potentially trigger things now.
    this.__loggerFired();
  },

  /**
   * Indicate that the only expectation we have on this actor is that its
   *  logger will die during this step.
   */
  expectOnly__die: function() {
    if (!this._activeForTestStep)
      throw new Error("Attempt to set expectations on an actor (" +
                      this.__defName + ": " + this.__name + ") that is not " +
                      "participating in this test step!");
    if (this._resolved)
      throw new Error("Attempt to add expectations when already resolved!");

    if (this._expectDeath)
      throw new Error("Already expecting our death!  " +
                      "Are you using asyncEventsAreComingDoNotResolve?");
    this._expectDeath = true;
  },

  /**
   * Set this actor to use 'set' matching for only this round; the list of
   *  expectations will be treated as an unordered set of expectations to
   *  match instead of an ordered list that must be matched exactly in order.
   *  Failures will still be generated if an entry is encountered that does not
   *  have a corresponding entry in the expectation list.
   *
   * One side-effect of this mode is that we no longer can detect what
   *  constitutes a mismatch, so we call everything unexpected that doesn't
   *  match.
   */
  expectUseSetMatching: function() {
    this._unorderedSetMode = true;
  },

  /**
   * Prepare for activity in a test step.  If we do not already have a paired
   *  logger, this will push us onto the tracking list so we will be paired when
   *  the logger is created.
   */
  __prepForTestStep: function(testRuntimeContext) {
    if (!this._logger)
      testRuntimeContext.reportPendingActor(this);
    // we should have no expectations going into a test step.
    if (this._activeForTestStep)
      this.__resetExpectations();
    this._activeForTestStep = true;
    // and also all current entries should not be considered for expectations
    // (We originally considered that we could let loggers accumulate entries
    //  in the background and then specify expectations about them in a
    //  subsequent step.  That seems confusing.  Seems far better for us to
    //  just slice a single step into multiple perspectives...)
    if (this._logger)
      this._iEntry = this._logger._entries.length;
  },

  /**
   * Issue a promise that will be resolved when all expectations of this actor
   *  have been resolved.  If no expectations have been issued, just return
   *  null.
   */
  __waitForExpectations: function() {
    if ((this._iExpectation >= this._expectations.length) &&
        (this._expectDeath ? (this._logger && this._logger._died) : true)) {
      this._resolved = true;
      return this._expectationsMetSoFar;
    }

    if (!this._deferred)
      this._deferred = $Q.defer();
    return this._deferred.promise;
  },

  __stepCleanup: null,

  /**
   * Cleanup state at the end of the step; also, check if we moved into a
   *  failure state after resolving our promise.
   *
   * @return["success" Boolean]{
   *   True if everything is (still) satisfied, false if a failure occurred
   *   at some point.
   * }
   */
  __resetExpectations: function() {
    if (this.__stepCleanup)
      this.__stepCleanup();

    var expectationsWereMet = this._expectationsMetSoFar;
    this._expectationsMetSoFar = true;
    // kill all processed entries.
    this._iExpectation = 0;
    this._expectations.splice(0, this._expectations.length);
    this._expectDeath = false;
    this._unorderedSetMode = false;
    this._deferred = null;
    this._resolved = false;
    this._activeForTestStep = false;
    return expectationsWereMet;
  },

  __failUnmetExpectations: function() {
    if (this._iExpectation < this._expectations.length && this._logger) {
      for (var i = this._iExpectation; i < this._expectations.length; i++) {
        this._logger.__failedExpectation(this._expectations[i]);
      }
    }
    if (this._expectDeath && !this._logger._died)
      this._logger.__failedExpectation(DIED_EXP);
  },

  /**
   * Invoked by the test-logger associated with this actor to let us know that
   *  something has been logged so that we can perform an expectation check and
   *  fulfill our promise/reject our promise, as appropriate.
   */
  __loggerFired: function() {
    // we can't do anything if we don't have an actor.
    var entries = this._logger._entries, expy, entry;
    // -- unordered mode
    if (this._unorderedSetMode) {

      while (this._iExpectation < this._expectations.length &&
             this._iEntry < entries.length) {
        entry = entries[this._iEntry++];
        // ignore meta-entries (which are prefixed with a '!')
        if (entry[0][0] === "!")
          continue;

        // - try all the expectations for a match
        var foundMatch = false;
        for (var iExp = this._iExpectation; iExp < this._expectations.length;
             iExp++) {
          expy = this._expectations[iExp];

          // - on matches, reorder the expectation and bump our pointer
          if (expy[0] === entry[0] &&
              this['_verify_' + expy[0]](expy, entry)) {
            if (iExp !== this._iExpectation) {
              this._expectations[iExp] = this._expectations[this._iExpectation];
              this._expectations[this._iExpectation] = expy;
            }
            this._iExpectation++;
            foundMatch = true;
            break;
          }
        }
        if (!foundMatch) {
          this._logger.__unexpectedEntry(this._iEntry - 1, entry);
          this._expectationsMetSoFar = false;
          if (this._deferred)
            this._deferred.reject([this.__defName, expy, entry]);
        }
      }

      // - generate an unexpected failure if we ran out of expectations
      if ((this._iExpectation === this._expectations.length) &&
          (entries.length > this._iEntry)) {
        // note: as below, there is no point trying to generate a rejection
        //  at this stage.
        this._expectationsMetSoFar = false;
        // no need to -1 because we haven't incremented past the entry.
        this._logger.__unexpectedEntry(this._iEntry, entries[this._iEntry]);
        // do increment past...
        this._iEntry++;
      }
      // - generate success if we have used up our expectations
      else if ((this._iExpectation >= this._expectations.length) &&
               this._deferred &&
               (this._expectDeath ? (this._logger && this._logger._died)
                                  : true)) {
        this._resolved = true;
        this._deferred.resolve();
      }
      return;
    }

    // -- ordered mode
    while (this._iExpectation < this._expectations.length &&
           this._iEntry < entries.length) {
      expy = this._expectations[this._iExpectation];
      entry = entries[this._iEntry++];

      // ignore meta-entries (which are prefixed with a '!')
      if (entry[0][0] === "!")
        continue;

      // Currently, require exact pairwise matching between entries and
      //  expectations.
      if (expy[0] !== entry[0]) {
        this._logger.__unexpectedEntry(this._iEntry - 1, entry);
        // (fallout, triggers error)
      }
      else if (!this['_verify_' + expy[0]](expy, entry)) {
        this._logger.__mismatchEntry(this._iEntry - 1, expy, entry);
        // things did line up correctly though, so boost the expecation number
        //  so we don't convert subsequent expectations into unexpected ones.
        this._iExpectation++;
        // (fallout, triggers error)
      }
      else {
        this._iExpectation++;
        continue;
      }
      // (only bad cases fall out without hitting a continue)
      if (this._expectationsMetSoFar) {
        this._expectationsMetSoFar = false;
        if (this._deferred)
          this._deferred.reject([this.__defName, expy, entry]);
      }
      return;
    }
    // - unexpected log events should count as failure
    // We only care if: 1) we were marked active, 2) we had at least one
    //  expectation this step.
    // Because we will already have resolved() our promise if we get here,
    //  it's up to the test driver to come back and check us for this weird
    //  failure, possibly after waiting a tick to see if any additional events
    //  come in.
    if (this._activeForTestStep && this._expectations.length &&
        (this._iExpectation === this._expectations.length) &&
        (entries.length > this._iEntry)) {
      this._expectationsMetSoFar = false;
      // no need to -1 because we haven't incremented past the entry.
      this._logger.__unexpectedEntry(this._iEntry, entries[this._iEntry]);
    }

    if ((this._iExpectation >= this._expectations.length) && this._deferred &&
        (this._expectDeath ? (this._logger && this._logger._died) : true)) {
      this._resolved = true;
      this._deferred.resolve();
    }
  },
};
exports.TestActorProtoBase = TestActorProtoBase;

/**
 * Recursive traverse objects looking for (and eliding) very long strings.  We
 *  do this because our logs are getting really large (6 megs!), and a likely
 *  source of useless bloat are the encrypted message strings.  Although we
 *  care how big the strings get, the reality is that until we switch to
 *  avro/a binary encoding, they are going to bloat horribly under JSON,
 *  especially when nested levels of encryption and JSON enter the picture.
 *
 * We will go a maximum of 3 layers deep.  Because this complicates having an
 *  efficient fast-path where we detect that we don't need to clone-and-modify,
 *  we currently always just clone-and-modify.
 */
function simplifyInsaneObjects(obj, dtype, curDepth) {
  if (obj == null || typeof(obj) !== "object")
    return obj;
  if (!curDepth)
    curDepth = 0;
  const nextDepth = curDepth + 1;
  var limitStrings = 64;

  if (dtype) {
    if (dtype === 'tostring') {
      if (Array.isArray(obj))
        return obj.join('');
      else if (typeof(obj) !== 'string')
        return obj.toString();
    }
  }

  var oot = {};
  for (var key in obj) {
    var val = obj[key];
    switch (typeof(val)) {
      case "string":
        if (limitStrings && val.length > limitStrings) {
          oot[key] = "OMITTED STRING, originally " + val.length +
                       " bytes long";
        }
        else {
          oot[key] = val;
        }
        break;
      case "object":
        if (val == null ||
            Array.isArray(val) ||
            ("toJSON" in val) ||
            curDepth >= 2) {
          oot[key] = val;
        }
        else {
          oot[key] = simplifyInsaneObjects(val, null, nextDepth);
        }
        break;
      default:
        oot[key] = val;
        break;
    }
  }
  return oot;
}

/**
 * Maximum comparison depth for argument equivalence in expectation checking.
 *  This value gets bumped every time I throw something at it that fails that
 *  still seems reasonable to me.
 */
const COMPARE_DEPTH = 6;
function boundedCmpObjs(a, b, depthLeft) {
  var aAttrCount = 0, bAttrCount = 0, key, nextDepth = depthLeft - 1;

  for (key in a) {
    aAttrCount++;
    if (!(key in b))
      return false;

    if (depthLeft) {
      if (!smartCompareEquiv(a[key], b[key], nextDepth))
        return false;
    }
    else {
      if (a[key] !== b[key])
        return false;
    }
  }
  // the theory is that if every key in a is in b and its value is equal, and
  //  there are the same number of keys in b, then they must be equal.
  for (key in b) {
    bAttrCount++;
  }
  if (aAttrCount !== bAttrCount)
    return false;
  return true;
}

/**
 * @return[Boolean]{
 *   True when equivalent, false when not equivalent.
 * }
 */
function smartCompareEquiv(a, b, depthLeft) {
  if (typeof(a) !== 'object' || (a == null) || (b == null))
    return a === b;
  // fast-path for identical objects
  if (a === b)
    return true;
  if (Array.isArray(a)) {
    if (!Array.isArray(b))
      return false;
    if (a.length !== b.length)
      return false;
    for (var iArr = 0; iArr < a.length; iArr++) {
      if (!smartCompareEquiv(a[iArr], b[iArr], depthLeft - 1))
        return false;
    }
    return true;
  }
  return boundedCmpObjs(a, b, depthLeft);
}
exports.smartCompareEquiv = smartCompareEquiv;

/**
 * Builds the logging and testing helper classes for the `register` driver.
 *
 * It operates in a similar fashion to wmsy's ProtoFab mechanism; state is
 *  provided to helpers by lexically closed over functions.  No code generation
 *  is used, but it's intended to be an option.
 */
function LoggestClassMaker(moduleFab, name) {
  this.moduleFab = moduleFab;
  this.name = name;

  this._latchedVars = [];

  // steady-state minimal logging logger (we always want statistics!)
  this.dummyProto = {
    __proto__: DummyLogProtoBase,
    __defName: name,
    __latchedVars: this._latchedVars,
    __FAB: this.moduleFab,
  };
  // full-logging logger
  this.logProto = {
    __proto__: LogProtoBase,
    __defName: name,
    __latchedVars: this._latchedVars,
    __FAB: this.moduleFab,
  };
  // testing full-logging logger
  this.testLogProto = {
    __proto__: TestLogProtoBase,
    __defName: name,
    __latchedVars: this._latchedVars,
    __FAB: this.moduleFab,
  };
  // testing actor for expectations, etc.
  this.testActorProto = {
    __proto__: TestActorProtoBase,
    __defName: name,
  };

  /** Maps helper names to their type for collision reporting by `_define`. */
  this._definedAs = {};
}
LoggestClassMaker.prototype = {
  /**
   * Name collision detection helper; to be invoked prior to defining a name
   *  with the type of name being defined so we can tell you both types that
   *  are colliding.
   */
  _define: function(name, type) {
    if (this._definedAs.hasOwnProperty(name)) {
      throw new Error("Attempt to define '" + name + "' as a " + type +
                      " when it is already defined as a " +
                      this._definedAs[name] + "!");
    }
    this._definedAs[name] = type;
  },

  /**
   * Wrap a logProto method to be a testLogProto invocation that generates a
   *  constraint checking thing.
   */
  _wrapLogProtoForTest: function(name) {
    var logFunc = this.logProto[name];
    this.testLogProto[name] = function() {
      var rval = logFunc.apply(this, arguments);
      var testActor = this._actor;
      if (testActor)
        testActor.__loggerFired();
      return rval;
    };
  },

  addStateVar: function(name) {
    this._define(name, 'state');

    this.dummyProto[name] = NOP;

    this.logProto[name] = function(val) {
      this._entries.push([name, val, $microtime.now(), gSeq++]);
    };

    this._wrapLogProtoForTest(name);

    this.testActorProto['expect_' + name] = function(val) {
      if (!this._activeForTestStep)
        throw new Error("Attempt to set expectations on an actor (" +
                        this.__defName + ": " + this.__name + ") that is not " +
                        "participating in this test step!");
      if (this._resolved)
        throw new Error("Attempt to add expectations when already resolved!");

      this._expectations.push([name, val]);
      return this;
    };
    this.testActorProto['_verify_' + name] = function(exp, entry) {
      return smartCompareEquiv(exp[1], entry[1], COMPARE_DEPTH);
    };
  },
  /**
   * Dubious mechanism to allow logger objects to be used like a task
   *  construct that can track success/failure or some other terminal state.
   *  Contrast with state-vars which are intended to track an internal state
   *  for analysis but not to serve as a summarization of the application
   *  object's life.
   * This is being brought into being for the unit testing framework so that
   *  we can just use the logger hierarchy as the actual result hierarchy.
   *  This may be a horrible idea.
   *
   * This currently does not generate or support the expectation subsystem
   *  since the only use right now is the testing subsystem.
   */
  addLatchedState: function(name) {
    this._define(name, 'latchedState');
    this._latchedVars.push(name);
    var latchedName = ':' + name;

    this.testLogProto[name] = this.logProto[name] = this.dummyProto[name] =
        function(val) {
      this[latchedName] = val;
    };
  },
  addEvent: function(name, args, testOnlyLogArgs) {
    this._define(name, 'event');

    var numArgs = 0, useArgs = [];
    for (var key in args) {
      numArgs++;
      useArgs.push(args[key]);
    }

    this.dummyProto[name] = function() {
      this._eventMap[name] = (this._eventMap[name] || 0) + 1;
    };

    this.logProto[name] = function() {
      this._eventMap[name] = (this._eventMap[name] || 0) + 1;
      var entry = [name];
      for (var iArg = 0; iArg < numArgs; iArg++) {
        if (useArgs[iArg] === EXCEPTION) {
          var arg = arguments[iArg];
          entry.push($extransform.transformException(arg));
        }
        else {
          entry.push(arguments[iArg]);
        }
      }
      entry.push($microtime.now());
      entry.push(gSeq++);
      this._entries.push(entry);
    };

    if (!testOnlyLogArgs) {
      this._wrapLogProtoForTest(name);
    }
    else {
      var numTestOnlyArgs = 0, useTestArgs = [];
      for (key in testOnlyLogArgs) {
        numTestOnlyArgs++;
        useTestArgs.push(testOnlyLogArgs[key]);
      }
      this.testLogProto[name] = function() {
        this._eventMap[name] = (this._eventMap[name] || 0) + 1;
        var entry = [name], iArg;
        for (iArg = 0; iArg < numArgs; iArg++) {
          if (useArgs[iArg] === EXCEPTION) {
            var arg = arguments[iArg];
            entry.push($extransform.transformException(arg));
          }
          else {
            entry.push(arguments[iArg]);
          }
        }
        entry.push($microtime.now());
        entry.push(gSeq++);
        // ++ new bit
        for (var iEat=0; iEat < numTestOnlyArgs; iEat++, iArg++) {
          entry.push(simplifyInsaneObjects(arguments[iArg], useTestArgs[iEat]));
        }
        // -- end new bit
        this._entries.push(entry);
        // ++ firing bit...
        var testActor = this._actor;
        if (testActor)
          testActor.__loggerFired();
      };
    }

    this.testActorProto['expect_' + name] = function() {
      if (!this._activeForTestStep)
        throw new Error("Attempt to set expectations on an actor (" +
                        this.__defName + ": " + this.__name + ") that is not " +
                        "participating in this test step!");
      if (this._resolved)
        throw new Error("Attempt to add expectations when already resolved!");

      var exp = [name];
      for (var iArg = 0; iArg < numArgs; iArg++) {
        if (useArgs[iArg] && useArgs[iArg] !== EXCEPTION) {
          exp.push(arguments[iArg]);
        }
      }
      this._expectations.push(exp);
      return this;
    };
    this.testActorProto['_verify_' + name] = function(tupe, entry) {
      // only check arguments we had expectations for.
      for (var iArg = 1; iArg < tupe.length; iArg++) {
        if (!smartCompareEquiv(tupe[iArg], entry[iArg], COMPARE_DEPTH))
          return false;
      }
      return true;
    };
  },
  addAsyncJob: function(name, args, testOnlyLogArgs) {
    var name_begin = name + '_begin', name_end = name + '_end';
    this.dummyProto[name_begin] = NOP;
    this.dummyProto[name_end] = NOP;

    var numArgs = 0, numTestOnlyArgs = 0, useArgs = [], useTestArgs = [];
    for (var key in args) {
      numArgs++;
      useArgs.push(args[key]);
    }

    this.logProto[name_begin] = function() {
      this._eventMap[name_begin] = (this._eventMap[name_begin] || 0) + 1;
      var entry = [name_begin];
      for (var iArg = 0; iArg < numArgs; iArg++) {
        if (useArgs[iArg] === EXCEPTION) {
          var arg = arguments[iArg];
          entry.push($extransform.transformException(arg));
        }
        else {
          entry.push(arguments[iArg]);
        }
      }
      entry.push($microtime.now());
      entry.push(gSeq++);
      this._entries.push(entry);
    };
    this.logProto[name_end] = function() {
      this._eventMap[name_end] = (this._eventMap[name_end] || 0) + 1;
      var entry = [name_end];
      for (var iArg = 0; iArg < numArgs; iArg++) {
        if (useArgs[iArg] === EXCEPTION) {
          var arg = arguments[iArg];
          entry.push($extransform.transformException(arg));
        }
        else {
          entry.push(arguments[iArg]);
        }
      }
      entry.push($microtime.now());
      entry.push(gSeq++);
      this._entries.push(entry);
    };

    if (!testOnlyLogArgs) {
      this._wrapLogProtoForTest(name_begin);
      this._wrapLogProtoForTest(name_end);
    }
    else {
      for (key in testOnlyLogArgs) {
        numTestOnlyArgs++;
        useTestArgs.push(testOnlyLogArgs[key]);
      }
      // cut-paste-modify of the above...
      this.testLogProto[name_begin] = function() {
        this._eventMap[name_begin] = (this._eventMap[name_begin] || 0) + 1;
        var entry = [name_begin];
        for (var iArg = 0; iArg < numArgs; iArg++) {
          if (useArgs[iArg] === EXCEPTION) {
            var arg = arguments[iArg];
            entry.push($extransform.transformException(arg));
          }
          else {
            entry.push(arguments[iArg]);
          }
        }
        entry.push($microtime.now());
        entry.push(gSeq++);
        // ++ new bit
        for (var iEat=0; iEat < numTestOnlyArgs; iEat++, iArg++) {
          entry.push(simplifyInsaneObjects(arguments[iArg], useTestArgs[iEat]));
        }
        // -- end new bit
        this._entries.push(entry);
      };
      this.testLogProto[name_end] = function() {
        this._eventMap[name_end] = (this._eventMap[name_end] || 0) + 1;
        var entry = [name_end];
        for (var iArg = 0; iArg < numArgs; iArg++) {
          if (useArgs[iArg] === EXCEPTION) {
            var arg = arguments[iArg];
            entry.push($extransform.transformException(arg));
          }
          else {
            entry.push(arguments[iArg]);
          }
        }
        entry.push($microtime.now());
        entry.push(gSeq++);
        // ++ new bit
        for (var iEat=0; iEat < numTestOnlyArgs; iEat++, iArg++) {
          entry.push(simplifyInsaneObjects(arguments[iArg], useTestArgs[iEat]));
        }
        // -- end new bit
        this._entries.push(entry);
      };
    }

    this.testActorProto['expect_' + name_begin] = function() {
      if (!this._activeForTestStep)
        throw new Error("Attempt to set expectations on an actor (" +
                        this.__defName + ": " + this.__name + ") that is not " +
                        "participating in this test step!");
      if (this._resolved)
        throw new Error("Attempt to add expectations when already resolved!");

      var exp = [name_begin];
      for (var iArg = 0; iArg < numArgs; iArg++) {
        if (useArgs[iArg] && useArgs[iArg] !== EXCEPTION)
          exp.push(arguments[iArg]);
      }
      this._expectations.push(exp);
      return this;
    };
    this.testActorProto['expect_' + name_end] = function() {
      if (!this._activeForTestStep)
        throw new Error("Attempt to set expectations on an actor (" +
                        this.__defName + ": " + this.__name + ") that is not " +
                        "participating in this test step!");
      if (this._resolved)
        throw new Error("Attempt to add expectations when already resolved!");

      var exp = [name_end];
      for (var iArg = 0; iArg < numArgs; iArg++) {
        if (useArgs[iArg] && useArgs[iArg] !== EXCEPTION)
          exp.push(arguments[iArg]);
      }
      this._expectations.push(exp);
      return this;
    };
    this.testActorProto['_verify_' + name_begin] =
        this.testActorProto['_verify_' + name_end] = function(tupe, entry) {
      // only check arguments we had expectations for.
      for (var iArg = 1; iArg < tupe.length; iArg++) {
        if (!smartCompareEquiv(tupe[iArg], entry[iArg], COMPARE_DEPTH))
          return false;
      }
      return true;
    };
  },
  addCall: function(name, logArgs, testOnlyLogArgs) {
    this._define(name, 'call');

    var numLogArgs = 0, numTestOnlyArgs = 0, useArgs = [], useTestArgs = [];
    for (var key in logArgs) {
      numLogArgs++;
      useArgs.push(logArgs[key]);
    }

    this.dummyProto[name] = function() {
      var rval;
      try {
        rval = arguments[numLogArgs+1].apply(
          arguments[numLogArgs], Array.prototype.slice.call(arguments, iArg+2));
      }
      catch(ex) {
        // (call errors are events)
        this._eventMap[name] = (this._eventMap[name] || 0) + 1;
        rval = ex;
      }
      return rval;
    };

    this.logProto[name] = function() {
      var rval, iArg;
      var entry = [name];
      for (iArg = 0; iArg < numLogArgs; iArg++) {
        entry.push(arguments[iArg]);
      }
      entry.push($microtime.now());
      entry.push(gSeq++);
      // push this prior to the call for ordering reasons (the call can log
      //  entries too!)
      this._entries.push(entry);
      try {
        rval = arguments[numLogArgs+1].apply(
          arguments[numLogArgs], Array.prototype.slice.call(arguments, iArg+2));
        entry.push($microtime.now());
        entry.push(gSeq++);
        entry.push(null);
      }
      catch(ex) {
        entry.push($microtime.now());
        entry.push(gSeq++);
        // We can't push the exception directly because its "arguments" payload
        //  can have rich object references that will cause issues during JSON
        //  serialization.  We most care that it can create circular references,
        //  but also are not crazy about serializing potentially huge object
        //  graphs.  This might be a great place to perform some logHelper
        //  style transformations.
        entry.push($extransform.transformException(ex));
        // (call errors are events)
        this._eventMap[name] = (this._eventMap[name] || 0) + 1;
        rval = ex;
      }

      return rval;
    };

    if (!testOnlyLogArgs) {
      this._wrapLogProtoForTest(name);
    }
    else {
      for (key in testOnlyLogArgs) {
        numTestOnlyArgs++;
        useTestArgs.push(testOnlyLogArgs[key]);
      }
      // cut-paste-modify of the above...
      this.testLogProto[name] = function() {
        var rval, iArg;
        var entry = [name];
        for (iArg = 0; iArg < numLogArgs; iArg++) {
          entry.push(arguments[iArg]);
        }
        entry.push($microtime.now());
        entry.push(gSeq++);
        // push this prior to the call for ordering reasons (the call can log
        //  entries too!)
        this._entries.push(entry);
        try {
          rval = arguments[numLogArgs+1].apply(
            arguments[numLogArgs], Array.prototype.slice.call(arguments, iArg+2));
          entry.push($microtime.now());
          entry.push(gSeq++);
          entry.push(null);
          // ++ new bit
          iArg += 2;
          for (var iEat=0; iEat < numTestOnlyArgs; iEat++, iArg++) {
            entry.push(simplifyInsaneObjects(arguments[iArg], useTestArgs[iEat]));
          }
          // -- end new bit
        }
        catch(ex) {
          entry.push($microtime.now());
          entry.push(gSeq++);
          // We can't push the exception directly because its "arguments" payload
          //  can have rich object references that will cause issues during JSON
          //  serialization.  We most care that it can create circular references,
          //  but also are not crazy about serializing potentially huge object
          //  graphs.  This might be a great place to perform some logHelper
          //  style transformations.
          entry.push($extransform.transformException(ex));
          // ++ new bit
          iArg += 2;
          for (var iEat=0; iEat < numTestOnlyArgs; iEat++, iArg++) {
            entry.push(simplifyInsaneObjects(arguments[iArg], useTestArgs[iEat]));
          }
          // -- end new bit
          // (call errors are events)
          this._eventMap[name] = (this._eventMap[name] || 0) + 1;
          rval = ex;
        }

        // ++ firing bit...
        var testActor = this._actor;
        if (testActor)
          testActor.__loggerFired();
        return rval;
      };
    }

    // XXX we have no way to indicate we expect/desire an assertion
    //  (we will just explode on any logged exception)
    this.testActorProto['expect_' + name] = function() {
      if (!this._activeForTestStep)
        throw new Error("Attempt to set expectations on an actor (" +
                        this.__defName + ": " + this.__name + ") that is not " +
                        "participating in this test step!");
      if (this._resolved)
        throw new Error("Attempt to add expectations when already resolved!");

      var exp = [name];
      for (var iArg = 0; iArg < arguments.length; iArg++) {
        if (useArgs[iArg])
          exp.push(arguments[iArg]);
      }
      this._expectations.push(exp);
      return this;
    };
    this.testActorProto['_verify_' + name] = function(tupe, entry) {
      // report failure if an exception was returned!
      if (entry.length > numLogArgs + numTestOnlyArgs + 6) {
        return false;
      }
      // only check arguments we had expectations for.
      for (var iArg = 1; iArg < tupe.length; iArg++) {
        if (!smartCompareEquiv(tupe[iArg], entry[iArg], COMPARE_DEPTH))
          return false;
      }
      return true;
    };
  },
  addError: function(name, args) {
    this._define(name, 'error');

    var numArgs = 0, useArgs = [];
    for (var key in args) {
      numArgs++;
      useArgs.push(args[key]);
    }

    this.dummyProto[name] = function() {
      this._eventMap[name] = (this._eventMap[name] || 0) + 1;
    };

    this.logProto[name] = function() {
      this._eventMap[name] = (this._eventMap[name] || 0) + 1;
      var entry = [name];
      for (var iArg = 0; iArg < numArgs; iArg++) {
        if (useArgs[iArg] === EXCEPTION) {
          var arg = arguments[iArg];
          entry.push($extransform.transformException(arg));
        }
        else {
          entry.push(arguments[iArg]);
        }
      }
      entry.push($microtime.now());
      entry.push(gSeq++);
      this._entries.push(entry);
    };

    this._wrapLogProtoForTest(name);

    this.testActorProto['expect_' + name] = function() {
      if (!this._activeForTestStep)
        throw new Error("Attempt to set expectations on an actor (" +
                        this.__defName + ": " + this.__name + ") that is not " +
                        "participating in this test step!");
      if (this._resolved)
        throw new Error("Attempt to add expectations when already resolved!");

      var exp = [name];
      for (var iArg = 0; iArg < numArgs; iArg++) {
        if (useArgs[iArg] && useArgs[iArg] !== EXCEPTION)
          exp.push(arguments[iArg]);
      }
      this._expectations.push(exp);
      return this;
    };
    this.testActorProto['_verify_' + name] = function(tupe, entry) {
      // only check arguments we had expectations for.
      for (var iArg = 1; iArg < tupe.length; iArg++) {
        if (!smartCompareEquiv(tupe[iArg], entry[iArg], COMPARE_DEPTH))
          return false;
      }
      return true;
    };
  },
  /**
   * Process the description of how to map the semantic ident list.  Currently
   *  we do absolutely nothing with this on the generation side, but the blob
   *  is used by log processing logic to stitch stuff together in the UI.
   *
   * We might end up using this on the generation side when under test so
   *  that we can better link loggers with actors in the face of potential
   *  ambiguity about who goes with which actor.  The counter-argument to that
   *  idea is that during functional testing we don't want that much activity
   *  going on.  When performance testing, we would want that, but in that
   *  case we won't be running with actors anyways.
   */
  useSemanticIdent: function(args) {
  },

  makeFabs: function() {
    var moduleFab = this.moduleFab;

    var dummyCon = function dummyConstructor() {
      this._eventMap = {};
    };
    dummyCon.prototype = this.dummyProto;

    var loggerCon = function loggerConstructor(ident) {
      this.__updateIdent(ident);
      this._uniqueName = gUniqueActorName++;
      this._eventMap = {};
      this._entries = [];
      this._born = $microtime.now();
      this._died = null;
      this._kids = null;
    };
    loggerCon.prototype = this.logProto;

    var testerCon = function testerLoggerConstructor(ident) {
      loggerCon.call(this, ident);
      this._actor = null;
    };
    testerCon.prototype = this.testLogProto;

    var testActorCon = function testActorConstructor(name, _parentUniqueName) {
      this.__name = name;
      this._uniqueName = gUniqueActorName++;
      this._parentUniqueName = _parentUniqueName;
      // initially undefined, goes null when we register for pairing, goes to
      //  the logger instance when paired.
      this._logger = undefined;
      this._expectations = [];
      this._expectationsMetSoFar = true;
      this._expectDeath = false;
      this._unorderedSetMode = false;
      this._activeForTestStep = false;
      this._iEntry = this._iExpectation = 0;
      this._lifecycleListener = null;
    };
    testActorCon.prototype = this.testActorProto;
    this.moduleFab._actorCons[this.name] = testActorCon;

    /**
     * Determine what type of logger to create, whether to tell other things
     *  in the system about it, etc.
     */
    var loggerDecisionFab = function loggerDecisionFab(implInstance,
                                                       parentLogger, ident) {
      var logger, tester;
      // - Testing
      if ((tester = (moduleFab._underTest || loggerDecisionFab._underTest))) {
//console.error("MODULE IS UNDER TEST FOR: " + testerCon.prototype.__defName);
        if (typeof(parentLogger) === "string")
          throw new Error("A string can't be a logger => not a valid parent");
        logger = new testerCon(ident);
        logger.__instance = implInstance;
        parentLogger = tester.reportNewLogger(logger, parentLogger);
      }
      // - Logging
      else if (moduleFab._generalLog || testerCon._generalLog) {
//console.error("general logger for: " + testerCon.prototype.__defName);
        logger = new loggerCon(ident);
      }
      // - Statistics Only
      else {
//console.error("statistics only for: " + testerCon.prototype.__defName);
        return new dummyCon();
      }

      if (parentLogger) {
        if (parentLogger._kids === undefined) {
        }
        else if (parentLogger._kids === null) {
          parentLogger._kids = [logger];
        }
        else {
          parentLogger._kids.push(logger);
        }
      }
      return logger;
    };
    this.moduleFab[this.name] = loggerDecisionFab;
  },
};

var LEGAL_FABDEF_KEYS = [
  'implClass', 'type', 'subtype', 'topBilling', 'semanticIdent', 'dicing',
  'stateVars', 'latchState', 'events', 'asyncJobs', 'calls', 'errors',
  'TEST_ONLY_calls', 'TEST_ONLY_events', 'TEST_ONLY_asyncJobs',
  'LAYER_MAPPING',
];

function augmentFab(mod, fab, defs) {
  var testActors = fab._testActors, rawDefs = fab._rawDefs;

  for (var defName in defs) {
    var key, loggerDef = defs[defName], testOnlyMeta;
    rawDefs[defName] = loggerDef;

    for (key in loggerDef) {
      if (LEGAL_FABDEF_KEYS.indexOf(key) === -1) {
        throw new Error("key '" + key + "' is not a legal log def key");
      }
    }

    var maker = new LoggestClassMaker(fab, defName);

    if ("semanticIdent" in loggerDef) {
      maker.useSemanticIdent(loggerDef.semanticIdent);
    }
    if ("stateVars" in loggerDef) {
      for (key in loggerDef.stateVars) {
        maker.addStateVar(key);
      }
    }
    if ("latchState" in loggerDef) {
      for (key in loggerDef.latchState) {
        maker.addLatchedState(key);
      }
    }
    if ("events" in loggerDef) {
      var testOnlyEventsDef = null;
      if ("TEST_ONLY_events" in loggerDef)
        testOnlyEventsDef = loggerDef.TEST_ONLY_events;
      for (key in loggerDef.events) {
        testOnlyMeta = null;
        if (testOnlyEventsDef && testOnlyEventsDef.hasOwnProperty(key))
          testOnlyMeta = testOnlyEventsDef[key];
        maker.addEvent(key, loggerDef.events[key], testOnlyMeta);
      }
    }
    if ("asyncJobs" in loggerDef) {
      var testOnlyAsyncJobsDef = null;
      if ("TEST_ONLY_asyncJobs" in loggerDef)
        testOnlyAsyncJobsDef = loggerDef.TEST_ONLY_asyncJobs;
      for (key in loggerDef.asyncJobs) {
        testOnlyMeta = null;
        if (testOnlyAsyncJobsDef && testOnlyAsyncJobsDef.hasOwnProperty(key))
          testOnlyMeta = testOnlyAsyncJobsDef[key];
        maker.addAsyncJob(key, loggerDef.asyncJobs[key], testOnlyMeta);
      }
    }
    if ("calls" in loggerDef) {
      var testOnlyCallsDef = null;
      if ("TEST_ONLY_calls" in loggerDef)
        testOnlyCallsDef = loggerDef.TEST_ONLY_calls;
      for (key in loggerDef.calls) {
        testOnlyMeta = null;
        if (testOnlyCallsDef && testOnlyCallsDef.hasOwnProperty(key))
          testOnlyMeta = testOnlyCallsDef[key];
        maker.addCall(key, loggerDef.calls[key], testOnlyMeta);
      }
    }
    if ("errors" in loggerDef) {
      for (key in loggerDef.errors) {
        maker.addError(key, loggerDef.errors[key]);
      }
    }

    maker.makeFabs();
  }

  return fab;
};
exports.__augmentFab = augmentFab;

var ALL_KNOWN_FABS = [];

exports.register = function register(mod, defs) {
  var fab = {_generalLog: true, _underTest: false, _actorCons: {},
             _rawDefs: {}, _onDeath: null};
  ALL_KNOWN_FABS.push(fab);
  return augmentFab(mod, fab, defs);
};

/**
 * Provide schemas for every logger that has been registered.
 */
exports.provideSchemaForAllKnownFabs = function schemaForAllKnownFabs() {
  var schema = {};
  for (var i = 0; i < ALL_KNOWN_FABS.length; i++) {
    var rawDefs = ALL_KNOWN_FABS[i]._rawDefs;
    for (var key in rawDefs) {
      schema[key] = rawDefs[key];
    }
  }
  return schema;
};

var BogusTester = {
  reportNewLogger: function(logger, parentLogger) {
    // No one cares, this is just a way to get the tester constructors
    //  triggered.
    return parentLogger;
  },
};

/**
 * Mark all logfabs under test so we get full log data; DO NOT USE THIS UNDER
 *  NON-DEVELOPMENT PURPOSES BECAUSE USER DATA CAN BE ENTRAINED AND THAT IS VERY
 *  BAD.
 *
 * Note: No effort is made to avoid marking any logfabs as under test.  This
 *  would be a problem if used while the testing subsystem is active, but you
 *  shouldn't do that.
 */
exports.DEBUG_markAllFabsUnderTest = function() {
  for (var i = 0; i < ALL_KNOWN_FABS.length; i++) {
    var logfab = ALL_KNOWN_FABS[i];

    logfab._underTest = BogusTester;
  }
};

/**
 * Evolutionary stopgap debugging helper to be able to put a module/logfab into
 *  a mode of operation where it dumps all of its loggers' entries to
 *  console.log when they die.
 */
exports.DEBUG_dumpEntriesOnDeath = function(logfab) {
  logfab._generalLog = true;
  logfab._onDeath = function(logger) {
    console.log("!! DIED:", logger.__defName, logger._ident);
    console.log(JSON.stringify(logger._entries, null, 2));
  };
};

exports.DEBUG_dumpAllFabEntriesOnDeath = function() {
  for (var i = 0; i < ALL_KNOWN_FABS.length; i++) {
    var logfab = ALL_KNOWN_FABS[i];
    exports.DEBUG_dumpEntriesOnDeath(logfab);
  }
};

// role information
exports.CONNECTION = 'connection';
exports.SERVER = 'server';
exports.CLIENT = 'client';
exports.TASK = 'task';
exports.DAEMON = 'daemon';
exports.DATABASE = 'database';
exports.CRYPTO = 'crypto';
exports.QUERY = 'query';
exports.ACCOUNT = 'account';

exports.TEST_DRIVER = 'testdriver';
exports.TEST_GROUP = 'testgroup';
exports.TEST_CASE = 'testcase';
exports.TEST_PERMUTATION = 'testperm';
exports.TEST_STEP = 'teststep';
exports.TEST_LAZY = 'testlazy';

exports.TEST_SYNTHETIC_ACTOR = 'test:synthactor';

// argument information
var EXCEPTION = exports.EXCEPTION = 'exception';
/**
 * In short, something that we can JSON.stringify without throwing an exception
 *  and that is strongly expected to have a reasonable, bounded size.  This
 *  value is *not* snapshotted when it is provided, and so should be immutable
 *  for this to not turn out confusing.
 */
var JSONABLE = exports.JSONABLE = 'jsonable';
var TOSTRING = exports.TOSTRING = 'tostring';
/**
 * XXX speculative, we currently are just using JSON.stringify and putting
 *  toJSON methods on complex objects that there is no benefit from recursively
 *  traversing.
 *
 * An object that could be anything, including resulting in deep or cyclic
 *  data structures.  We will serialize type information where available.  This
 *  will necessarily be more expensive to serialize than a `JSONABLE` data
 *  structure.  This type of data *is snapshotted* when logged, allowing it to
 *  be used on mutable data structures.
 *
 * A data-biased raw-object will just report the type of instances it encounters
 *  unless they have a toJSON method, in which case it will invoke that.
 */
var RAWOBJ_DATABIAS = exports.RAWOBJ_DATABIAS = 'jsonable'; //'rawobj:databias';

////////////////////////////////////////////////////////////////////////////////
// State/Delta Representation Support
//
// Specialized schema support to allow, by convention, the log viewer to
//  visualize simple containment hierarchies and display annotations on those
//  hierarchies.  Each entry in the hierarchy requires a unique name.
//
// The reconstruction mechanism works like so:
// - For each logger, we latch any STATEREP we observe as the current state.
// - Statereps are visualized as a simple hierarchy.
// - Annotations (STATEANNO) affect display by colorizing/exposing a string on
//    the object indexed by name.  For now, we use numbers to convey
//    semantic colorization desires: -1 is deletion/red, 0 is notable/yellow,
//    1 is addition/green.
// - Deltas combine an annotation entry relevant to the prior state, the new
//    state, and annotations relevant to the new state.  For example,
//    expressing a deletion and an addition would have us annotate the
//    deleted item in the pre-state and the added item in the post-state.

/**
 * Simple state representation.
 */
var STATEREP = exports.STATEREP = 'staterep';
var STATEANNO = exports.STATEANNO = 'stateanno';
var STATEDELTA = exports.STATEDELTA = 'statedelta';

////////////////////////////////////////////////////////////////////////////////

}); // end define
;
/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at:
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Mozilla Raindrop Code.
 *
 * The Initial Developer of the Original Code is
 *   The Mozilla Foundation
 * Portions created by the Initial Developer are Copyright (C) 2011
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Andrew Sutherland <asutherland@asutherland.org>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

/**
 * Mechanism for periodic log hierarchy traversal and transmission of the
 *  serialized data, forgetting about the logging entries after transmitted.  We
 *  additionally may perform interesting-ness analysis and only transmit data
 *  or send an out-of-band notification if something interesting has happened,
 *  such as an error being reported.
 *
 * Log transmission and reconstruction is slightly more complicated than just
 *  serializing a hierarchy because the lifetime of the loggers is expected to
 *  be much longer than our log transmission interval.
 **/

define('rdcommon/logreaper',[
    './log',
    'microtime',
    'exports'
  ],
  function(
    $log,
    $microtime,
    exports
  ) {

var EMPTY = [];

function LogReaper(rootLogger) {
  this._rootLogger = rootLogger;
  this._lastTimestamp = null;
  this._lastSeq = null;
}
exports.LogReaper = LogReaper;
LogReaper.prototype = {
  /**
   * Process a logger, producing a time slice representation.
   *
   * Our strategy is roughly to manually traverse the logger hiearchy and:
   * - Ignore loggers with no entries/events and no notably active children that
   *    were already alive at the last reaping and have not died, not mentioning
   *    them at all in the output fragment.  This can also be thought of as:
   * - Emit loggers that have been born.
   * - Emit loggers that have died.
   * - Emit loggers with entries/events.
   * - Emit loggers whose children have had notable activity so that the
   *    hierarchy can be known.
   * - Emit loggers that have experienced a semantic ident change.
   *
   * Potential future optimizations:
   */
  reapHierLogTimeSlice: function() {
    var rootLogger = this._rootLogger,
        startSeq, startTimestamp;
    if (this._lastTimestamp === null) {
      startSeq = 0;
      startTimestamp = rootLogger._born;
    }
    else {
      startSeq = this._lastSeq + 1;
      startTimestamp = this._lastTimestamp;
    }
    var endSeq = $log.getCurrentSeq(),
        endTimestamp = this._lastTimestamp = $microtime.now();

    function traverseLogger(logger) {
      var empty = true;
      // speculatively start populating an output representation
      var outrep = logger.toJSON();
      outrep.events = null;
      outrep.kids = null;

      // - check born/death
      // actually, being born doesn't generate an event, so ignore.
      //if (logger._born >= startTimestamp)
      //  empty = false;
      if (logger._died !== null)
        empty = false;

      // - check events
      var outEvents = null;
      for (var eventKey in logger._eventMap) {
        var eventVal = logger._eventMap[eventKey];
        if (eventVal) {
          empty = false;
          if (outEvents === null)
            outrep.events = outEvents = {};
          outEvents[eventKey] = eventVal;
          logger._eventMap[eventKey] = 0;
        }
      }

      // - check and reap entries
      if (outrep.entries.length) {
        empty = false;
        // (we keep/use outrep.entries, and zero the logger's entries)
        logger._entries = [];
      }
      else {
        // Avoid subsequent mutation of the list mutating our representation
        //  and without creating gratuitous garbage by using a shared empty
        //  list for such cases.
        outrep.entries = EMPTY;
      }

      // - check and reap children
      if (logger._kids && logger._kids.length) {
        for (var iKid = 0; iKid < logger._kids.length; iKid++) {
          var kidLogger = logger._kids[iKid];
          var kidrep = traverseLogger(kidLogger);
          if (kidrep) {
            if (!outrep.kids)
              outrep.kids = [];
            outrep.kids.push(kidrep);
            empty = false;
          }
          // reap (and adjust iteration)
          if (kidLogger._died !== null)
            logger._kids.splice(iKid--, 1);
        }
      }

      return (empty ? null : outrep);
    }

    return {
      begin: startTimestamp,
      end: endTimestamp,
      logFrag: traverseLogger(rootLogger),
    };
  },
};

}); // end define
;
/**
 *
 **/

define('rdimap/imapclient/mailapi',[
    'exports'
  ],
  function(

    exports
  ) {

/**
 *
 */
function MailAccount(api, wireRep) {
  this._api = api;
  this.id = wireRep.id;
  this.type = wireRep.type;
  this.name = wireRep.name;

  this.identities = [];
  for (var iIdent = 0; iIdent < wireRep.identities.length; iIdent++) {
    this.identities.push(new MailSenderIdentity(this._api,
                                                wireRep.identities[iIdent]));
  }

  this.username = wireRep.credentials.username;
  this.servers = wireRep.servers;

  // build a place for the DOM element and arbitrary data into our shape
  this.element = null;
  this.data = null;
}
MailAccount.prototype = {
  toString: function() {
    return '[MailAccount: ' + this.type + ' ' + this.id + ']';
  },
  toJSON: function() {
    return {
      type: 'MailAccount',
      accountType: this.type,
      id: this.id,
    };
  },

  modifyAccount: function() {
    throw new Error("NOT YET IMPLEMENTED");
  },
};

/**
 * Sender identities define one of many possible sets of sender info and are
 * associated with a single `MailAccount`.
 *
 * Things that can vary:
 * - user's display name
 * - e-mail address,
 * - reply-to address
 * - signature
 */
function MailSenderIdentity(api, wireRep) {
  // We store the API so that we can create identities for the composer without
  // needing to create an account too.
  this._api = api;
  this.id = wireRep.id;

  this.name = wireRep.displayName;
  this.address = wireRep.address;
  this.replyTo = wireRep.replyTo;
  this.signature = wireRep.signature;
}
MailSenderIdentity.prototype = {
  toString: function() {
    return '[MailSenderIdentity: ' + this.type + ' ' + this.id + ']';
  },
  toJSON: function() {
    return { type: 'MailSenderIdentity' };
  },
};

function MailFolder(api, wireRep) {
  // Accounts have a somewhat different wireRep serialization, but we can best
  // tell by the id's; a folder's id is derived from the account with a dash
  // separating.
  var isAccount = wireRep.id.indexOf('/') === -1;

  this._api = api;
  this.id = wireRep.id;

  /**
   * The human-readable name of the folder.  (As opposed to its path or the
   * modified utf-7 encoded folder names.)
   */
  this.name = wireRep.name;
  /**
   * @listof[String]{
   *   The hierarchical path of the folder, with each path component as a
   *   separate string.  All path values are human-readable (as opposed to
   *   modified modified utf-7 encoded folder names.)
   * }
   */
  this.path = wireRep.path;
  /**
   * @oneof[
   *   @case['account']{
   *     It's not really a folder at all, just an account serving as hierarchy.
   *   }
   *   @case['nomail']{
   *     A folder that exists only to provide hierarchy but which can't
   *     contain messages.  An artifact of various mail backends that are
   *     reflected in IMAP as NOSELECT.
   *   }
   *   @case['inbox']
   *   @case['drafts']
   *   @case['sent']
   *   @case['trash']
   *   @case['archive']
   *   @case['junk']
   *   @case['starred']
   *   @case['normal']{
   *     A traditional mail folder with nothing special about it.
   *   }
   * ]{
   *   Non-localized string indicating the type of folder this is, primarily
   *   for styling purposes.
   * }
   */
  this.type = isAccount ? 'account' : wireRep.type;

  this.selectable = !isAccount && wireRep.type !== 'nomail';

  this.onchange = null;
  this.onremove = null;

  // build a place for the DOM element and arbitrary data into our shape
  this.element = null;
  this.data = null;
}
MailFolder.prototype = {
  toString: function() {
    return '[MailFolder: ' + this.path + ']';
  },
  toJSON: function() {
    return {
      type: 'MailFolder',
      path: this.path
    };
  },
};

function filterOutBuiltinFlags(flags) {
  // so, we could mutate in-place if we were sure the wire rep actually came
  // over the wire.  Right now there is de facto rep sharing, so let's not
  // mutate and screw ourselves over.
  var outFlags = [];
  for (var i = flags.length - 1; i >= 0; i--) {
    if (flags[i][0] !== '\\')
      outFlags.push(flags[i]);
  }
  return outFlags;
}

/**
 * Extract the canonical naming attributes out of the MailHeader instance.
 */
function serializeMessageName(x) {
  return { date: x.date.valueOf(), suid: x.id };
}

/**
 * Email overview information for displaying the message in the list as planned
 * for the current UI.  Things that we don't need (ex: to/cc/bcc) for the list
 * end up on the body, currently.  They will probably migrate to the header in
 * the future.
 *
 * Events are generated if the metadata of the message changes or if the message
 * is removed.  The `BridgedViewSlice` instance is how the system keeps track
 * of what messages are being displayed/still alive to need updates.
 */
function MailHeader(slice, wireRep) {
  this._slice = slice;
  this.id = wireRep.suid;

  this.author = wireRep.author;

  this.date = new Date(wireRep.date);
  this.__update(wireRep);
  this.hasAttachments = wireRep.hasAttachments;

  this.subject = wireRep.subject;
  this.snippet = wireRep.snippet;

  this.onchange = null;
  this.onremove = null;

  // build a place for the DOM element and arbitrary data into our shape
  this.element = null;
  this.data = null;
}
MailHeader.prototype = {
  toString: function() {
    return '[MailHeader: ' + this.id + ']';
  },
  toJSON: function() {
    return {
      type: 'MailHeader',
      id: this.id
    };
  },

  __update: function(wireRep) {
    this.isRead = wireRep.flags.indexOf('\\Seen') !== -1;
    this.isStarred = wireRep.flags.indexOf('\\Flagged') !== -1;
    this.isRepliedTo = wireRep.flags.indexOf('\\Answered') !== -1;
    this.isForwarded = wireRep.flags.indexOf('$Forwarded') !== -1;
    this.isJunk = wireRep.flags.indexOf('$Junk') !== -1;
    this.tags = filterOutBuiltinFlags(wireRep.flags);
  },

  /**
   * Delete this message
   */
  deleteMessage: function() {
    return this._slice._api.deleteMessages([this]);
  },

  /**
   * Copy this message to another folder.
   */
  copyMessage: function(targetFolder) {
    return this._slice._api.copyMessages([this], targetFolder);
  },

  /**
   * Move this message to another folder.
   */
  moveMessage: function(targetFolder) {
    return this._slice._api.moveMessages([this], targetFolder);
  },

  /**
   * Set or clear the read status of this message.
   */
  setRead: function(beRead) {
    return this._slice._api.markMessagesRead([this], beRead);
  },

  /**
   * Set or clear the starred/flagged status of this message.
   */
  setStarred: function(beStarred) {
    return this._slice._api.markMessagesStarred([this], beStarred);
  },

  /**
   * Add and/or remove tags/flags from this messages.
   */
  modifyTags: function(addTags, removeTags) {
    return this._slice._api.modifyMessageTags([this], addTags, removeTags);
  },

  /**
   * Request the `MailBody` instance for this message, passing it to the
   * provided callback function once retrieved.
   */
  getBody: function(callback) {
    this._slice._api._getBodyForMessage(this, callback);
  },

  /**
   * Assume this is a draft message and return a MessageComposition object
   * that will be asynchronously populated.  The provided callback will be
   * notified once all composition state has been loaded.
   *
   * The underlying message will be replaced by other messages as the draft
   * is updated and effectively deleted once the draft is completed.  (A
   * move may be performed instead.)
   */
  editAsDraft: function(callback) {
    return this._slice._api.resumeMessageComposition(this, callback);
  },

  /**
   * Start composing a reply to this message.
   *
   * @args[
   *   @param[replyMode @oneof[
   *     @default[null]{
   *       Just reply to the sender.
   *     }
   *     @case['list']{
   *       Reply to the mailing list the message was received from.  If there
   *       were other mailing lists copied on the message, they will not
   *       be included.
   *     }
   *     @case['all']{
   *       Reply to the sender and all listed recipients of the message.
   *     }
   *   ]]{
   *     The not currently used reply-mode.
   *   }
   * ]
   * @return[MessageComposition]
   */
  replyToMessage: function(replyMode, callback) {
    return this._slice._api.beginMessageComposition(
      this, null, { replyTo: this, replyMode: replyMode }, callback);
  },

  /**
   * Start composing a forward of this message.
   *
   * @args[
   *   @param[forwardMode @oneof[
   *     @case['inline']{
   *       Forward the message inline.
   *     }
   *   ]]
   * ]
   * @return[MessageComposition]
   */
  forwardMessage: function(forwardMode, callback) {
    return this._slice._api.beginMessageComposition(
      this, null, { forwardOf: this, forwardMode: forwardMode }, callback);
  },
};

/**
 * Lists the attachments in a message as well as providing a way to display the
 * body while (eventually) also accounting for message quoting.
 *
 * Mail bodies are immutable and so there are no events on them or lifetime
 * management to worry about.  However, you should keep the `MailHeader` alive
 * and worry about its lifetime since the message can get deleted, etc.
 */
function MailBody(api, suid, wireRep) {
  this._api = api;
  this.id = suid;

  this.to = wireRep.to;
  this.cc = wireRep.cc;
  this.bcc = wireRep.bcc;
  this.replyTo = wireRep.replyTo;
  this.attachments = null;
  if (wireRep.attachments) {
    this.attachments = [];
    for (var iAtt = 0; iAtt < wireRep.attachments.length; iAtt++) {
      this.attachments.push(new MailAttachment(wireRep.attachments[iAtt]));
    }
  }
  // for the time being, we only provide text/plain contents, and we provide
  // those flattened.
  this.bodyText = wireRep.bodyText;
}
MailBody.prototype = {
  toString: function() {
    return '[MailBody: ' + id + ']';
  },
  toJSON: function() {
    return {
      type: 'MailBody',
      id: this.id
    };
  },
};

/**
 * Provides the file name, mime-type, and estimated file size of an attachment.
 * In the future this will also be the means for requesting the download of
 * an attachment or for attachment-forwarding semantics.
 */
function MailAttachment(wireRep) {
  this.partId = wireRep.part;
  this.filename = wireRep.name;
  this.mimetype = wireRep.type;
  this.sizeEstimateInBytes = wireRep.sizeEstimate;

  // build a place for the DOM element and arbitrary data into our shape
  this.element = null;
  this.data = null;
}
MailAttachment.prototype = {
  toString: function() {
    return '[MailAttachment: "' + this.filename + '"]';
  },
  toJSON: function() {
    return {
      type: 'MailAttachment',
      filename: this.filename
    };
  },
};

/**
 * Undoable operations describe the operation that was performed for
 * presentation to the user and hold onto a handle that can be used to undo
 * whatever it was.  While the current UI plan does not call for the ability to
 * get a list of recently performed actions, the goal is to make it feasible
 * in the future.
 */
function UndoableOperation(_api, operation, affectedCount,
                           _tempHandle, _longtermIds) {
  this._api = _api;
  /**
   * @oneof[
   *   @case['read']{
   *     Marked message(s) as read.
   *   }
   *   @case['unread']{
   *     Marked message(s) as unread.
   *   }
   *   @case['star']{
   *     Starred message(s).
   *   }
   *   @case['unstar']{
   *     Unstarred message(s).
   *   }
   *   @case['addtag']{
   *     Added tag(s).
   *   }
   *   @case['removetag']{
   *     Removed tag(s).
   *   }
   *   @case['move']{
   *     Moved message(s).
   *   }
   *   @case['copy']{
   *     Copied message(s).
   *   }
   *   @case['delete']{
   *     Deleted message(s) by moving to trash folder.
   *   }
   * ]
   */
  this.operation = operation;
  /**
   * The number of messages affected by this operation.
   */
  this.affectedCount = affectedCount;

  /**
   * The temporary handle we use to refer to the operation immediately after
   * issuing it until we hear back from the mail bridge about its more permanent
   * _longtermIds.
   */
  this._tempHandle = _tempHandle;
  /**
   * The names of the per-account operations that this operation was mapped
   * to.
   */
  this._longtermIds = null;

  this._undoRequested = false;
}
UndoableOperation.prototype = {
  toString: function() {
    return '[UndoableOperation]';
  },
  toJSON: function() {
    return {
      type: 'UndoableOperation',
      handle: this._tempHandle,
      longtermIds: this._longtermIds,
    };
  },

  undo: function() {
    // We can't issue the undo until we've heard the longterm id, so just flag
    // it to be processed when we do.
    if (!this._longtermIds) {
      this._undoRequested = true;
      return;
    }
    this._api.__undo(this);
  },
};

/**
 *
 */
function BridgedViewSlice(api, ns, handle) {
  this._api = api;
  this._ns = ns;
  this._handle = handle;

  this.items = [];

  this.atTop = null;
  this.atBottom = false;

  this.onadd = null;
  this.onchange = null;
  this.onsplice = null;
  this.onremove = null;
  this.oncomplete = null;
  this.ondead = null;
}
BridgedViewSlice.prototype = {
  toString: function() {
    return '[BridgedViewSlice: ' + this._ns + ' ' + this._handle + ']';
  },
  toJSON: function() {
    return {
      type: 'BridgedViewSlice',
      namespace: this._ns,
      handle: this._handle
    };
  },

  requestGrowth: function() {
  },

  die: function() {
    this._api.__bridgeSend({
        type: 'killSlice',
        handle: this._handle
      });
  },
};

function FoldersViewSlice(api, handle) {
  BridgedViewSlice.call(this, api, 'folders', handle);
}
FoldersViewSlice.prototype = {
  __proto__: BridgedViewSlice.prototype,

  getFirstFolderWithType: function(type, items) {
    // allow an explicit list of items to be provided, specifically for use in
    // onsplice handlers where the items have not yet been spliced in.
    if (!items)
      items = this.items;
    for (var i = 0; i < items.length; i++) {
      var folder = items[i];
      if (folder.type === type)
        return folder;
    }
    return null;
  },

  getFirstFolderWithName: function(name, items) {
    if (!items)
      items = this.items;
    for (var i = 0; i < items.length; i++) {
      var folder = items[i];
      if (folder.name === name)
        return folder;
    }
    return null;
  },
};

function HeadersViewSlice(api, handle) {
  BridgedViewSlice.call(this, api, 'headers', handle);
}
HeadersViewSlice.prototype = {
  __proto__: BridgedViewSlice.prototype,

  /**
   * Request a re-sync of the time interval covering the effective/visible time
   * range.  If the most recently displayed message is the most recent message
   * known to us, then the date range will cover through "now".
   */
  refresh: function() {
    this._api.__bridgeSend({
        type: 'refreshHeaders',
        handle: this._handle,
      });
  },
};


/**
 * Handle for a current/ongoing message composition process.  The UI reads state
 * out of the object when it resumes editing a draft, otherwise this can just be
 * treated as write-only.
 *
 * == Other clients and drafts:
 *
 * If another client deletes our draft out from under us, we currently won't
 * notice.
 */
function MessageComposition(api, handle) {
  this._api = api;
  this._handle = handle;

  this.senderIdentity = null;

  this.to = null;
  this.cc = null;
  this.bcc = null;

  this.subject = null;

  this.body = null;

  this._customHeaders = null;
  // XXX attachments aren't implemented yet, of course.  They will be added
  // via helper method.
  this._attachments = null;
}
MessageComposition.prototype = {
  toString: function() {
    return '[MessageComposition: ' + this._handle + ']';
  },
  toJSON: function() {
    return {
      type: 'MessageComposition',
      handle: this._handle
    };
  },

  /**
   * Add custom headers; don't use this for built-in headers.
   */
  addHeader: function(key, value) {
    if (!this._customHeaders)
      this._customHeaders = [];
    this._customHeaders.push(key);
    this._customHeaders.push(value);
  },

  /**
   * Populate our state to send over the wire to the back-end.
   */
  _buildWireRep: function() {
    return {
      senderId: this.senderIdentity.id,
      to: this.to,
      cc: this.cc,
      bcc: this.bcc,
      subject: this.subject,
      body: this.body,
      customHeaders: this._customHeaders,
      attachments: this._attachments,
    };
  },

  /**
   * Finalize and send the message in its current state.
   *
   * @args[
   *   @param[callback @func[
   *     @args[
   *       @param[state @oneof[
   *         @case['sent']{
   *           The message made it to the SMTP server and we believe it was sent
   *           successfully.
   *         }
   *         @case['offline']{
   *           We are known to be offline and so we can't send it right now.
   *           We will attempt to send when we next get good network.
   *         }
   *         @case['will-retry']{
   *           Something didn't work, but we will automatically retry again
   *           at some point in the future.
   *         }
   *         @case['fatal']{
   *           Something really bad happened, probably a bug in the program.
   *           The error will be reported using console.error or internal
   *           logging or something.
   *         }
   *       ]]
   *       }
   *     ]
   *   ]]{
   *     The callback to invoke on success/failure/deferral to later.
   *   }
   * ]
   */
  finishCompositionSendMessage: function(callback) {
    this._api._composeDone(this._handle, 'send', this._buildWireRep(),
                           callback);
  },

  /**
   * The user is done writing the message for now; save it to the drafts folder
   * and close out this handle.
   */
  saveDraftEndComposition: function() {
    this._api._composeDone(this._handle, 'save', this._buildWireRep());
  },

  /**
   * The user has indicated they neither want to send nor save the draft.  We
   * want to delete the message so it is gone from everywhere.
   *
   * In the future, we might support some type of very limited undo
   * functionality, possibly on the UI side of the house.  This is not a secure
   * delete.
   */
  abortCompositionDeleteDraft: function() {
    this._api._composeDone(this._handle, 'delete', null);
  },

};


/**
 * Error reporting helper; we will probably eventually want different behaviours
 * under development, under unit test, when in use by QA, advanced users, and
 * normal users, respectively.  By funneling all errors through one spot, we
 * help reduce inadvertent breakage later on.
 */
function reportError() {
  console.error.apply(console, arguments);
  var msg = null;
  for (var i = 0; i < arguments.length; i++) {
    if (msg)
      msg += " " + arguments[i];
    else
      msg = "" + arguments[i];
  }
  throw new Error(msg);
}
var unexpectedBridgeDataError = reportError,
    internalError = reportError,
    reportClientCodeError = reportError;

/**
 *
 */
function MailAPI() {
  this._nextHandle = 1;
  this.onstatuschange = null;

  this._slices = {};
  this._pendingRequests = {};
}
exports.MailAPI = MailAPI;
MailAPI.prototype = {
  toString: function() {
    return '[MailAPI]';
  },
  toJSON: function() {
    return { type: 'MailAPI' };
  },

  /**
   * Send a message over/to the bridge.  The idea is that we (can) communicate
   * with the backend using only a postMessage-style JSON channel.
   */
  __bridgeSend: function(msg) {
    // actually, this method gets clobbered.
  },

  /**
   * Process a message received from the bridge.
   */
  __bridgeReceive: function ma___bridgeReceive(msg) {
    var methodName = '_recv_' + msg.type;
    if (!(methodName in this)) {
      unexpectedBridgeDataError('Unsupported message type:', msg.type);
      return;
    }
    try {
      this[methodName](msg);
    }
    catch (ex) {
      internalError('Problem handling message type:', msg.type, ex,
                    '\n', ex.stack);
      return;
    }
  },

  _recv_sliceSplice: function ma__recv_sliceSplice(msg) {
    var slice = this._slices[msg.handle];
    if (!slice) {
      unexpectedBridgeDataError('Received message about a nonexistent slice:',
                                msg.handle);
      return;
    }

    var addItems = msg.addItems, transformedItems = [], i, stopIndex;
    switch (slice._ns) {
      case 'accounts':
        for (i = 0; i < addItems.length; i++) {
          transformedItems.push(new MailAccount(this, addItems[i]));
        }
        break;

      case 'identities':
        for (i = 0; i < addItems.length; i++) {
          transformedItems.push(new MailSenderIdentity(this, addItems[i]));
        }
        break;

      case 'folders':
        for (i = 0; i < addItems.length; i++) {
          transformedItems.push(new MailFolder(this, addItems[i]));
        }
        break;

      case 'headers':
        for (i = 0; i < addItems.length; i++) {
          transformedItems.push(new MailHeader(slice, addItems[i]));
        }
        break;

      default:
        console.error('Slice notification for unknown type:', slice._ns);
        break;
    }

    // - generate slice 'onsplice' notification
    if (slice.onsplice) {
      try {
        slice.onsplice(msg.index, msg.howMany, transformedItems,
                       msg.requested, msg.moreExpected);
      }
      catch (ex) {
        reportClientCodeError('onsplice notification error', ex,
                              '\n', ex.stack);
      }
    }
    // - generate item 'onremove' notifications
    if (msg.howMany) {
      try {
        stopIndex = msg.index + msg.howMany;
        for (i = msg.index; i < stopIndex; i++) {
          var item = slice.items[i];
          if (slice.onremove)
            slice.onremove(item, i);
          if (item.onremove)
            item.onremove(item, i);
        }
      }
      catch (ex) {
        reportClientCodeError('onremove notification error', ex,
                              '\n', ex.stack);
      }
    }
    // - perform actual splice
    slice.items.splice.apply(slice.items,
                             [msg.index, msg.howMany].concat(transformedItems));
    // - generate item 'onadd' notifications
    if (slice.onadd) {
      try {
        stopIndex = msg.index + transformedItems.length;
        for (i = msg.index; i < stopIndex; i++) {
          slice.onadd(slice.items[i], i);
        }
      }
      catch (ex) {
        reportClientCodeError('onadd notification error', ex,
                              '\n', ex.stack);
      }
    }

    // - generate 'oncomplete' notification
    if (slice.oncomplete && msg.requested && !msg.moreExpected) {
      try {
        slice.oncomplete();
      }
      catch (ex) {
        reportClientCodeError('oncomplete notification error', ex,
                              '\n', ex.stack);
      }
      slice.oncomplete = null;
    }
  },

  _recv_sliceUpdate: function ma__recv_sliceUpdate(msg) {
    var slice = this._slices[msg.handle];
    if (!slice) {
      unexpectedBridgeDataError('Received message about a nonexistent slice:',
                                msg.handle);
      return;
    }

    var updates = msg.updates;
    try {
      for (var i = 0; i < updates.length; i += 2) {
        var idx = updates[i], wireRep = updates[i + 1],
            itemObj = slice.items[idx];
        itemObj.__update(wireRep);
        if (slice.onchange)
          slice.onchange(itemObj, idx);
        if (itemObj.onchange)
          itemObj.onchange(itemObj, idx);
      }
    }
    catch (ex) {
      reportClientCodeError('onchange notification error', ex,
                            '\n', ex.stack);
    }
  },

  _recv_sliceDead: function(msg) {
    var slice = this._slices[msg.handle];
    delete this._slices[msg.handle];
    if (slice.ondead)
      slice.ondead(slice);
  },

  _getBodyForMessage: function(header, callback) {
    var handle = this._nextHandle++;
    this._pendingRequests[handle] = {
      type: 'getBody',
      suid: header.id,
      callback: callback,
    };
    this.__bridgeSend({
      type: 'getBody',
      handle: handle,
      suid: header.id,
      date: header.date.valueOf(),
    });
  },

  _recv_gotBody: function(msg) {
    var req = this._pendingRequests[msg.handle];
    if (!req) {
      unexpectedBridgeDataError('Bad handle for got body:', msg.handle);
      return;
    }
    delete this._pendingRequests[msg.handle];

    var body = msg.bodyInfo ? new MailBody(this, req.suid, msg.bodyInfo) : null;
    req.callback.call(null, body);
  },

  /**
   * Try to create an account.  There is currently no way to abort the process
   * of creating an account.
   *
   * @typedef[AccountCreationError @oneof[
   *   @case['offline']{
   *     We are offline and have no network access to try and create the
   *     account.
   *   }
   *   @case['no-dns-entry']{
   *     We couldn't find the domain name in question, full stop.
   *   }
   *   @case['unresponsive-server']{
   *     Requests to the server timed out.  AKA we sent packets into a black
   *     hole.
   *   }
   *   @case['port-not-listening']{
   *     Attempts to connect to the given port on the server failed.  We got
   *     packets back rejecting our connection.
   *   }
   *   @case['bad-security']{
   *     We were able to connect to the port and initiate TLS, but we didn't
   *     like what we found.  This could be a mismatch on the server domain,
   *     a self-signed or otherwise invalid certificate, insufficient crypto,
   *     or a vulnerable server implementation.
   *   }
   *   @case['not-an-imap-server']{
   *     Whatever is there isn't actually an IMAP server.
   *   }
   *   @case['sucky-imap-server']{
   *     The IMAP server is too bad for us to use.
   *   }
   *   @case['bad-user-or-pass']{
   *     The username and password didn't check out.  We don't know which one
   *     is wrong, just that one of them is wrong.
   *   }
   *   @case[null]{
   *     No error, the account was created and everything is terrific.
   *   }
   * ]]
   *
   * @args[
   *   @param[details @dict[
   *     @key[displayName String]{
   *       The name the (human, per EULA) user wants to be known to the world
   *       as.
   *     }
   *     @key[emailAddress String]
   *     @key[password String]
   *   ]]
   *   @param[callback @func[
   *     @args[
   *       @param[err AccountCreationError]
   *     ]
   *   ]
   * ]
   */
  tryToCreateAccount: function ma_tryToCreateAccount(details, callback) {
    var handle = this._nextHandle++;
    this._pendingRequests[handle] = {
      type: 'tryToCreateAccount',
      details: details,
      callback: callback
    };
    this.__bridgeSend({
      type: 'tryToCreateAccount',
      handle: handle,
      details: details
    });
  },

  _recv_tryToCreateAccountResults:
      function ma__recv_tryToCreateAccountResults(msg) {
    var req = this._pendingRequests[msg.handle];
    if (!req) {
      unexpectedBridgeDataError('Bad handle for create account:', msg.handle);
      return;
    }
    delete this._pendingRequests[msg.handle];

    req.callback.call(null, msg.error);
  },

  /**
   * Get the list of accounts.  This can be used for the list of accounts in
   * setttings or for a folder tree where only one account's folders are visible
   * at a time.
   *
   * @args[
   *   @param[realAccountsOnly Boolean]{
   *     Should we only list real accounts (aka not unified accounts)?  This is
   *     meaningful for the settings UI and for the move-to-folder UI where
   *     selecting a unified account's folders is useless.
   *   }
   * ]
   */
  viewAccounts: function ma_viewAccounts(realAccountsOnly) {
    var handle = this._nextHandle++,
        slice = new BridgedViewSlice(this, 'accounts', handle);
    this._slices[handle] = slice;

    this.__bridgeSend({
      type: 'viewAccounts',
      handle: handle,
    });
    return slice;
  },

  /**
   * Get the list of sender identities.  The identities can also be found on
   * their owning accounts via `viewAccounts`.
   */
  viewSenderIdentities: function ma_viewSenderIdentities() {
    var handle = this._nextHandle++,
        slice = new BridgedViewSlice(this, 'identities', handle);
    this._slices[handle] = slice;

    this.__bridgeSend({
      type: 'viewSenderIdentities',
      handle: handle,
    });
    return slice;
  },

  /**
   * Retrieve the entire folder hierarchy for either 'navigation' (pick what
   * folder to show the contents of, including unified folders), 'movetarget'
   * (pick target folder for moves, does not include unified folders), or
   * 'account' (only show the folders belonging to a given account, implies
   * selection).  In all cases, there may exist non-selectable folders such as
   * the account roots or IMAP folders that cannot contain messages.
   *
   * When accounts are presented as folders via this UI, they do not expose any
   * of their `MailAccount` semantics.
   *
   * @args[
   *   @param[mode @oneof['navigation' 'movetarget' 'account']
   *   @param[argument #:optional]{
   *     Arguent appropriate to the mode; currently will only be a `MailAccount`
   *     instance.
   *   }
   * ]
   */
  viewFolders: function ma_viewFolders(mode, argument) {
    var handle = this._nextHandle++,
        slice = new FoldersViewSlice(this, handle);
    this._slices[handle] = slice;

    this.__bridgeSend({
      type: 'viewFolders',
      mode: mode,
      handle: handle,
      argument: argument ? argument.id : null,
    });

    return slice;
  },

  /**
   * Retrieve a slice of the contents of a folder, starting from the most recent
   * messages.
   */
  viewFolderMessages: function ma_viewFolderMessages(folder) {
    var handle = this._nextHandle++,
        slice = new HeadersViewSlice(this, handle);
    this._slices[handle] = slice;

    this.__bridgeSend({
      type: 'viewFolderMessages',
      folderId: folder.id,
      handle: handle,
    });

    return slice;
  },

  /**
   * Search a folder for messages containing the given text in the sender,
   * recipients, or subject fields, as well as (optionally), the body with a
   * default time constraint so we don't entirely kill the server or us.
   *
   * Expected UX: run the search once without body, then the user can ask for
   * the body search too if the first match doesn't meet their expectations.
   */
  quicksearchFolderMessages:
      function ma_quicksearchFolderMessages(folder, text, searchBodyToo) {
    throw new Error("NOT YET IMPLEMENTED");
  },

  //////////////////////////////////////////////////////////////////////////////
  // Batch Message Mutation
  //
  // If you want to modify a single message, you can use the methods on it
  // directly.
  //
  // All actions are undoable and return an `UndoableOperation`.

  deleteMessages: function ma_deleteMessages(messages) {
    // XXX for now, just pose this as a flag change rather than any moving
    // to trash semantics.  We just want to be able to make our sync logic
    // perceive a deletion.  Obviously, DO NOT HOOK THIS UP TO THE UI YET.
    return this.modifyMessageTags(messages,
                                  ['\\Deleted'], null, 'delete');
  },

  copyMessages: function ma_copyMessages(messages, targetFolder) {
  },

  moveMessages: function ma_moveMessages(messages, targetFolder) {
  },

  markMessagesRead: function ma_markMessagesRead(messages, beRead) {
    return this.modifyMessageTags(messages,
                                  beRead ? ['\\Seen'] : null,
                                  beRead ? null : ['\\Seen'],
                                  beRead ? 'read' : 'unread');
  },

  markMessagesStarred: function ma_markMessagesStarred(messages, beStarred) {
    return this.modifyMessageTags(messages,
                                  beStarred ? ['\\Flagged'] : null,
                                  beStarred ? null : ['\\Flagged'],
                                  beStarred ? 'star' : 'unstar');
  },

  modifyMessageTags: function ma_modifyMessageTags(messages, addTags,
                                                   removeTags, _opcode) {
    // We allocate a handle that provides a temporary name for our undoable
    // operation until we hear back from the other side about it.
    var handle = this._nextHandle++;

    if (!_opcode) {
      if (addTags && addTags.length)
        _opcode = 'addtag';
      else if (removeTags && removeTags.length)
        _opcode = 'removetag';
    }
    var undoableOp = new UndoableOperation(this, _opcode, messages.length,
                                           handle),
        msgSuids = messages.map(serializeMessageName);

    this._pendingRequests[handle] = {
      type: 'mutation',
      handle: handle,
      undoableOp: undoableOp
    };
    this.__bridgeSend({
      type: 'modifyMessageTags',
      handle: handle,
      opcode: _opcode,
      addTags: addTags,
      removeTags: removeTags,
      messages: msgSuids,
    });

    return undoableOp;
  },

  _recv_mutationConfirmed: function(msg) {
    var req = this._pendingRequests[msg.handle];
    if (!req) {
      unexpectedBridgeDataError('Bad handle for mutation:', msg.handle);
      return;
    }

    req.undoableOp._tempHandle = null;
    req.undoableOp._longtermIds = msg.longtermIds;
    if (req.undoableOp._undoRequested)
      req.undoableOp.undo();
  },

  __undo: function undo(undoableOp) {
    this.__bridgeSend({
      type: 'undo',
      longtermIds: undoableOp._longtermIds,
    });
  },

  //////////////////////////////////////////////////////////////////////////////
  // Message Composition

  /**
   * Begin the message composition process, creating a MessageComposition that
   * stores the current message state and periodically persists its state to the
   * backend so that the message is potentially available to other clients and
   * recoverable in the event of a local crash.
   *
   * Composition is triggered in the context of a given message and folder so
   * that the correct account and sender identity for composition can be
   * inferred.  Message may be null if there are no messages in the folder.
   * Folder is not required if a message is provided.
   *
   * @args[
   *   @param[message #:optional MailHeader]{
   *     Some message to use as context when not issuing a reply/forward.
   *   }
   *   @param[folder #:optional MailFolder]{
   *     The folder to use as context if no `message` is provided and not
   *     issuing a reply/forward.
   *   }
   *   @param[options #:optional @dict[
   *     @key[replyTo #:optional MailHeader]
   *     @key[replyMode #:optional @oneof[null 'list' 'all']]
   *     @key[forwardOf #:optional MailHeader]
   *     @key[forwardMode #:optional @oneof['inline']]
   *   ]]
   *   @param[callback #:optional Function]{
   *     The callback to invoke once the composition handle is fully populated.
   *     This is necessary because the back-end decides what identity is
   *     appropriate, handles "re:" prefixing, quoting messages, etc.
   *   }
   * ]
   */
  beginMessageComposition: function(message, folder, options, callback) {
    if (!callback)
      throw new Error('A callback must be provided; you are using the API ' +
                      'wrong if you do not.');
    if (!options)
      options = {};

    var handle = this._nextHandle++,
        composer = new MessageComposition(this, handle);

    this._pendingRequests[handle] = {
      type: 'compose',
      composer: composer,
      callback: callback,
    };
    var msg = {
      type: 'beginCompose',
      handle: handle,
      mode: null,
      submode: null,
      reference: null,
    };
    if (options.hasOwnProperty('replyTo') && options.replyTo) {
      msg.mode = 'reply';
      msg.submode = options.replyMode;
      msg.reference = options.replyTo.id;
      throw new Error('XXX replying not implemented');
    }
    else if (options.hasOwnProperty('forwardOf') && options.forwardOf) {
      msg.mode = 'forward';
      msg.submode = options.forwardMode;
      msg.reference = options.forwardOf.id;
      throw new Error('XXX forwarding not implemented');
    }
    else {
      msg.mode = 'new';
      if (message) {
        msg.submode = 'message';
        msg.reference = message.id;
      }
      else if (folder) {
        msg.submode = 'folder';
        msg.reference = folder.id;
      }
    }
    this.__bridgeSend(msg);
    return composer;
  },

  /**
   * Open a message as if it were a draft message (hopefully it is), returning
   * a MessageComposition object that will be asynchronously populated.  The
   * provided callback will be notified once all composition state has been
   * loaded.
   *
   * The underlying message will be replaced by other messages as the draft
   * is updated and effectively deleted once the draft is completed.  (A
   * move may be performed instead.)
   */
  resumeMessageComposition: function(message, callback) {
    throw new Error('XXX No resuming composition right now.  Sorry!');
  },

  _recv_composeBegun: function(msg) {
    var req = this._pendingRequests[msg.handle];
    if (!req) {
      unexpectedBridgeDataError('Bad handle for compose begun:', msg.handle);
      return;
    }

    req.composer.senderIdentity = new MailSenderIdentity(this, msg.identity);
    req.composer.subject = msg.subject;
    req.composer.body = msg.body;
    req.composer.to = msg.to;
    req.composer.cc = msg.cc;
    req.composer.bcc = msg.bcc;
    // XXX attachments

    if (req.callback) {
      var callback = req.callback;
      req.callback = null;
      callback.call(null, req.composer);
    }
  },

  _composeDone: function(handle, command, state, callback) {
    var req = this._pendingRequests[handle];
    if (!req) {
      unexpectedBridgeDataError('Bad handle for compose done:', handle);
      return;
    }
    switch (command) {
      case 'send':
        req.type = 'send';
        req.callback = callback;
        break;
      case 'save':
      case 'delete':
        delete this._pendingRequests[handle];
        break;
      default:
        throw new Error('Illegal composeDone command: ' + command);
    }
    this.__bridgeSend({
      type: 'doneCompose',
      handle: handle,
      command: command,
      state: state,
    });
  },

  _recv_sent: function(msg) {
    console.log("processing sent", msg.handle);
    var req = this._pendingRequests[msg.handle];
    if (!req) {
      unexpectedBridgeDataError('Bad handle for sent:', msg.handle);
      return;
    }
    delete this._pendingRequests[msg.handle];
    if (req.callback) {
      req.callback.call(null, msg.err, msg.badAddresses);
      req.callback = null;
    }
  },

  //////////////////////////////////////////////////////////////////////////////
  // Diagnostics / Test Hacks

  /**
   * Send a 'ping' to the bridge which will send a 'pong' back, notifying the
   * provided callback.  This is intended to be hack to provide a way to ensure
   * that some function only runs after all of the notifications have been
   * received and processed by the back-end.
   */
  ping: function(callback) {
    var handle = this._nextHandle++;
    this._pendingRequests[handle] = {
      type: 'ping',
      callback: callback,
    };
    this.__bridgeSend({
      type: 'ping',
      handle: handle,
    });
  },

  _recv_pong: function(msg) {
    var req = this._pendingRequests[msg.handle];
    delete this._pendingRequests[msg.handle];
    req.callback();
  }

  //////////////////////////////////////////////////////////////////////////////
};


}); // end define
;
define('events',['require','exports','module'],function (require, exports, module) {
if (!process.EventEmitter) process.EventEmitter = function () {};

var EventEmitter = exports.EventEmitter = process.EventEmitter;
var isArray = typeof Array.isArray === 'function'
    ? Array.isArray
    : function (xs) {
        return Object.toString.call(xs) === '[object Array]'
    }
;

// By default EventEmitters will print a warning if more than
// 10 listeners are added to it. This is a useful default which
// helps finding memory leaks.
//
// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
var defaultMaxListeners = 10;
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!this._events) this._events = {};
  this._events.maxListeners = n;
};


EventEmitter.prototype.emit = function(type) {
  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events || !this._events.error ||
        (isArray(this._events.error) && !this._events.error.length))
    {
      if (arguments[1] instanceof Error) {
        throw arguments[1]; // Unhandled 'error' event
      } else {
        throw new Error("Uncaught, unspecified 'error' event.");
      }
      return false;
    }
  }

  if (!this._events) return false;
  var handler = this._events[type];
  if (!handler) return false;

  if (typeof handler == 'function') {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        var args = Array.prototype.slice.call(arguments, 1);
        handler.apply(this, args);
    }
    return true;

  } else if (isArray(handler)) {
    var args = Array.prototype.slice.call(arguments, 1);

    var listeners = handler.slice();
    for (var i = 0, l = listeners.length; i < l; i++) {
      listeners[i].apply(this, args);
    }
    return true;

  } else {
    return false;
  }
};

// EventEmitter is defined in src/node_events.cc
// EventEmitter.prototype.emit() is also defined there.
EventEmitter.prototype.addListener = function(type, listener) {
  if ('function' !== typeof listener) {
    throw new Error('addListener only takes instances of Function');
  }

  if (!this._events) this._events = {};

  // To avoid recursion in the case that type == "newListeners"! Before
  // adding it to the listeners, first emit "newListeners".
  this.emit('newListener', type, listener);

  if (!this._events[type]) {
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  } else if (isArray(this._events[type])) {

    // Check for listener leak
    if (!this._events[type].warned) {
      var m;
      if (this._events.maxListeners !== undefined) {
        m = this._events.maxListeners;
      } else {
        m = defaultMaxListeners;
      }

      if (m && m > 0 && this._events[type].length > m) {
        this._events[type].warned = true;
        console.error('(node) warning: possible EventEmitter memory ' +
                      'leak detected. %d listeners added. ' +
                      'Use emitter.setMaxListeners() to increase limit.',
                      this._events[type].length);
        console.trace();
      }
    }

    // If we've already got an array, just append.
    this._events[type].push(listener);
  } else {
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  var self = this;
  self.on(type, function g() {
    self.removeListener(type, g);
    listener.apply(this, arguments);
  });

  return this;
};

EventEmitter.prototype.removeListener = function(type, listener) {
  if ('function' !== typeof listener) {
    throw new Error('removeListener only takes instances of Function');
  }

  // does not use listeners(), so no side effect of creating _events[type]
  if (!this._events || !this._events[type]) return this;

  var list = this._events[type];

  if (isArray(list)) {
    var i = list.indexOf(listener);
    if (i < 0) return this;
    list.splice(i, 1);
    if (list.length == 0)
      delete this._events[type];
  } else if (this._events[type] === listener) {
    delete this._events[type];
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  // does not use listeners(), so no side effect of creating _events[type]
  if (type && this._events && this._events[type]) this._events[type] = null;
  return this;
};

EventEmitter.prototype.listeners = function(type) {
  if (!this._events) this._events = {};
  if (!this._events[type]) this._events[type] = [];
  if (!isArray(this._events[type])) {
    this._events[type] = [this._events[type]];
  }
  return this._events[type];
};

});
define('util',['require','exports','module','events'],function (require, exports, module) {
var events = require('events');

exports.print = function () {};
exports.puts = function () {};
exports.debug = function() {};

exports.inspect = function(obj, showHidden, depth, colors) {
  var seen = [];

  var stylize = function(str, styleType) {
    // http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
    var styles =
        { 'bold' : [1, 22],
          'italic' : [3, 23],
          'underline' : [4, 24],
          'inverse' : [7, 27],
          'white' : [37, 39],
          'grey' : [90, 39],
          'black' : [30, 39],
          'blue' : [34, 39],
          'cyan' : [36, 39],
          'green' : [32, 39],
          'magenta' : [35, 39],
          'red' : [31, 39],
          'yellow' : [33, 39] };

    var style =
        { 'special': 'cyan',
          'number': 'blue',
          'boolean': 'yellow',
          'undefined': 'grey',
          'null': 'bold',
          'string': 'green',
          'date': 'magenta',
          // "name": intentionally not styling
          'regexp': 'red' }[styleType];

    if (style) {
      return '\033[' + styles[style][0] + 'm' + str +
             '\033[' + styles[style][1] + 'm';
    } else {
      return str;
    }
  };
  if (! colors) {
    stylize = function(str, styleType) { return str; };
  }

  function format(value, recurseTimes) {
    // Provide a hook for user-specified inspect functions.
    // Check that value is an object with an inspect function on it
    if (value && typeof value.inspect === 'function' &&
        // Filter out the util module, it's inspect function is special
        value !== exports &&
        // Also filter out any prototype objects using the circular check.
        !(value.constructor && value.constructor.prototype === value)) {
      return value.inspect(recurseTimes);
    }

    // Primitive types cannot have properties
    switch (typeof value) {
      case 'undefined':
        return stylize('undefined', 'undefined');

      case 'string':
        var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                                 .replace(/'/g, "\\'")
                                                 .replace(/\\"/g, '"') + '\'';
        return stylize(simple, 'string');

      case 'number':
        return stylize('' + value, 'number');

      case 'boolean':
        return stylize('' + value, 'boolean');
    }
    // For some reason typeof null is "object", so special case here.
    if (value === null) {
      return stylize('null', 'null');
    }

    // Look up the keys of the object.
    var visible_keys = Object_keys(value);
    var keys = showHidden ? Object_getOwnPropertyNames(value) : visible_keys;

    // Functions without properties can be shortcutted.
    if (typeof value === 'function' && keys.length === 0) {
      if (isRegExp(value)) {
        return stylize('' + value, 'regexp');
      } else {
        var name = value.name ? ': ' + value.name : '';
        return stylize('[Function' + name + ']', 'special');
      }
    }

    // Dates without properties can be shortcutted
    if (isDate(value) && keys.length === 0) {
      return stylize(value.toUTCString(), 'date');
    }

    var base, type, braces;
    // Determine the object type
    if (isArray(value)) {
      type = 'Array';
      braces = ['[', ']'];
    } else {
      type = 'Object';
      braces = ['{', '}'];
    }

    // Make functions say that they are functions
    if (typeof value === 'function') {
      var n = value.name ? ': ' + value.name : '';
      base = (isRegExp(value)) ? ' ' + value : ' [Function' + n + ']';
    } else {
      base = '';
    }

    // Make dates with properties first say the date
    if (isDate(value)) {
      base = ' ' + value.toUTCString();
    }

    if (keys.length === 0) {
      return braces[0] + base + braces[1];
    }

    if (recurseTimes < 0) {
      if (isRegExp(value)) {
        return stylize('' + value, 'regexp');
      } else {
        return stylize('[Object]', 'special');
      }
    }

    seen.push(value);

    var output = keys.map(function(key) {
      var name, str;
      if (value.__lookupGetter__) {
        if (value.__lookupGetter__(key)) {
          if (value.__lookupSetter__(key)) {
            str = stylize('[Getter/Setter]', 'special');
          } else {
            str = stylize('[Getter]', 'special');
          }
        } else {
          if (value.__lookupSetter__(key)) {
            str = stylize('[Setter]', 'special');
          }
        }
      }
      if (visible_keys.indexOf(key) < 0) {
        name = '[' + key + ']';
      }
      if (!str) {
        if (seen.indexOf(value[key]) < 0) {
          if (recurseTimes === null) {
            str = format(value[key]);
          } else {
            str = format(value[key], recurseTimes - 1);
          }
          if (str.indexOf('\n') > -1) {
            if (isArray(value)) {
              str = str.split('\n').map(function(line) {
                return '  ' + line;
              }).join('\n').substr(2);
            } else {
              str = '\n' + str.split('\n').map(function(line) {
                return '   ' + line;
              }).join('\n');
            }
          }
        } else {
          str = stylize('[Circular]', 'special');
        }
      }
      if (typeof name === 'undefined') {
        if (type === 'Array' && key.match(/^\d+$/)) {
          return str;
        }
        name = JSON.stringify('' + key);
        if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
          name = name.substr(1, name.length - 2);
          name = stylize(name, 'name');
        } else {
          name = name.replace(/'/g, "\\'")
                     .replace(/\\"/g, '"')
                     .replace(/(^"|"$)/g, "'");
          name = stylize(name, 'string');
        }
      }

      return name + ': ' + str;
    });

    seen.pop();

    var numLinesEst = 0;
    var length = output.reduce(function(prev, cur) {
      numLinesEst++;
      if (cur.indexOf('\n') >= 0) numLinesEst++;
      return prev + cur.length + 1;
    }, 0);

    if (length > 50) {
      output = braces[0] +
               (base === '' ? '' : base + '\n ') +
               ' ' +
               output.join(',\n  ') +
               ' ' +
               braces[1];

    } else {
      output = braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
    }

    return output;
  }
  return format(obj, (typeof depth === 'undefined' ? 2 : depth));
};


function isArray(ar) {
  return ar instanceof Array ||
         Array.isArray(ar) ||
         (ar && ar !== Object.prototype && isArray(ar.__proto__));
}


function isRegExp(re) {
  return re instanceof RegExp ||
    (typeof re === 'object' && Object.prototype.toString.call(re) === '[object RegExp]');
}


function isDate(d) {
  if (d instanceof Date) return true;
  if (typeof d !== 'object') return false;
  var properties = Date.prototype && Object_getOwnPropertyNames(Date.prototype);
  var proto = d.__proto__ && Object_getOwnPropertyNames(d.__proto__);
  return JSON.stringify(proto) === JSON.stringify(properties);
}

function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}

var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}

exports.log = function (msg) {};

exports.pump = null;

var Object_keys = Object.keys || function (obj) {
    var res = [];
    for (var key in obj) res.push(key);
    return res;
};

var Object_getOwnPropertyNames = Object.getOwnPropertyNames || function (obj) {
    var res = [];
    for (var key in obj) {
        if (Object.hasOwnProperty.call(obj, key)) res.push(key);
    }
    return res;
};

var Object_create = Object.create || function (prototype, properties) {
    // from es5-shim
    var object;
    if (prototype === null) {
        object = { '__proto__' : null };
    }
    else {
        if (typeof prototype !== 'object') {
            throw new TypeError(
                'typeof prototype[' + (typeof prototype) + '] != \'object\''
            );
        }
        var Type = function () {};
        Type.prototype = prototype;
        object = new Type();
        object.__proto__ = prototype;
    }
    if (typeof properties !== 'undefined' && Object.defineProperties) {
        Object.defineProperties(object, properties);
    }
    return object;
};

exports.inherits = function(ctor, superCtor) {
  ctor.super_ = superCtor;
  ctor.prototype = Object_create(superCtor.prototype, {
    constructor: {
      value: ctor,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
};

});
define('stream',['require','exports','module','events','util'],function (require, exports, module) {
var events = require('events');
var util = require('util');

function Stream() {
  events.EventEmitter.call(this);
}
util.inherits(Stream, events.EventEmitter);
module.exports = Stream;
// Backwards-compat with node 0.4.x
Stream.Stream = Stream;

Stream.prototype.pipe = function(dest, options) {
  var source = this;

  function ondata(chunk) {
    if (dest.writable) {
      if (false === dest.write(chunk) && source.pause) {
        source.pause();
      }
    }
  }

  source.on('data', ondata);

  function ondrain() {
    if (source.readable && source.resume) {
      source.resume();
    }
  }

  dest.on('drain', ondrain);

  // If the 'end' option is not supplied, dest.end() will be called when
  // source gets the 'end' or 'close' events.  Only dest.end() once, and
  // only when all sources have ended.
  if (!dest._isStdio && (!options || options.end !== false)) {
    dest._pipeCount = dest._pipeCount || 0;
    dest._pipeCount++;

    source.on('end', onend);
    source.on('close', onclose);
  }

  var didOnEnd = false;
  function onend() {
    if (didOnEnd) return;
    didOnEnd = true;

    dest._pipeCount--;

    // remove the listeners
    cleanup();

    if (dest._pipeCount > 0) {
      // waiting for other incoming streams to end.
      return;
    }

    dest.end();
  }


  function onclose() {
    if (didOnEnd) return;
    didOnEnd = true;

    dest._pipeCount--;

    // remove the listeners
    cleanup();

    if (dest._pipeCount > 0) {
      // waiting for other incoming streams to end.
      return;
    }

    dest.destroy();
  }

  // don't leave dangling pipes when there are errors.
  function onerror(er) {
    cleanup();
    if (this.listeners('error').length === 0) {
      throw er; // Unhandled stream error in pipe.
    }
  }

  source.on('error', onerror);
  dest.on('error', onerror);

  // remove all the event listeners that were added.
  function cleanup() {
    source.removeListener('data', ondata);
    dest.removeListener('drain', ondrain);

    source.removeListener('end', onend);
    source.removeListener('close', onclose);

    source.removeListener('error', onerror);
    dest.removeListener('error', onerror);

    source.removeListener('end', cleanup);
    source.removeListener('close', cleanup);

    dest.removeListener('end', cleanup);
    dest.removeListener('close', cleanup);
  }

  source.on('end', cleanup);
  source.on('close', cleanup);

  dest.on('end', cleanup);
  dest.on('close', cleanup);

  dest.emit('pipe', source);

  // Allow for unix-like usage: A.pipe(B).pipe(C)
  return dest;
};

});
/**
 * Wrap the stringencoding polyfill (or standard, if that has happend :) so that
 * it resembles the node iconv binding.  Note that although iconv proper
 * supports transliteration, the module we are replacing (iconv-lite) did not,
 * and we don't need transliteration for e-mail anyways.  We only need
 * conversions to process non-unicode encodings into encoding; we will never try
 * and convert the more full unicode character-space into legacy encodings.
 *
 * This assumes our node-buffer.js shim is in use and providing the global Buffer.
 **/

define('iconv',['require','exports','module'],function(require, exports, module) {

exports.Iconv = function Iconv(sourceEnc, destEnc) {

  // - decoding
  if (/^UTF-8/.test(destEnc)) {
    this.decode = true;
    this.coder = new TextDecoder('utf-8');
  }
  // - encoding
  else {
    var idxSlash = destEnc.indexOf('/');
    // ignore '//TRANSLIT//IGNORE' and the like.
    if (idxSlash !== -1 && destEnc[idxSlash+1] === '/')
      destEnc = destEnc.substring(0, idxSlash);
    this.decode = false;
    this.coder = new TextEncoder(destEnc);
  }

};
exports.Iconv.protoype = {
  /**
   * Takes a buffer, returns a (different) buffer.
   */
  convert: function(inbuf) {
    if (this.decode) {
      return Buffer(this.coder.decode(inbuf));
    }
    else {
      return Buffer(this.coder.encode(inbuf));
    }
  },
};

});

define('mimelib/mime-functions',['require','exports','module','iconv'],function (require, exports, module) {
var Iconv = require('iconv').Iconv;

/* mime related functions - encoding/decoding etc*/
/* TODO: Only UTF-8 and Latin1 are allowed with encodeQuotedPrintable */
/* TODO: Check if the input string even needs encoding                */

/**
 * mime.foldLine(str, maxLength, foldAnywhere) -> String
 * - str (String): mime string that might need folding
 * - maxLength (Number): max length for a line, defaults to 78
 * - foldAnywhere (Boolean): can fold at any location (ie. in base64)
 * - afterSpace (Boolean): If [true] fold after the space
 * 
 * Folds a long line according to the RFC 5322
 *   <http://tools.ietf.org/html/rfc5322#section-2.1.1>
 * 
 * For example:
 *     Content-Type: multipart/alternative; boundary="----bd_n3-lunchhour1283962663300----"
 * will become
 *     Content-Type: multipart/alternative;
 *          boundary="----bd_n3-lunchhour1283962663300----"
 * 
 **/
this.foldLine = function(str, maxLength, foldAnywhere, afterSpace){
    var line=false, curpos=0, response="", lf;
    maxLength = maxLength || 78;
    
    // return original if no need to fold
    if(str.length<=maxLength)
        return str;
    
    // read in <maxLength> bytes and try to fold it
    while((line = str.substr(curpos, maxLength))){
        if(!!foldAnywhere){
            response += line;
            if(curpos+maxLength<str.length){
                response+="\r\n";
            }
        }else{
            lf = line.lastIndexOf(" ");
            if(lf<=0)
                lf = line.lastIndexOf("\t");
            if(line.length>=maxLength && lf>0){
                if(!!afterSpace){
                    // move forward until line end or no more \s and \t
                    while(lf<line.length && (line.charAt(lf)==" " || line.charAt(lf)=="\t")){
                        lf++;
                    }
                }
                response += line.substr(0,lf)+"\r\n"+(!foldAnywhere && !afterSpace && "       " || "");
                curpos -= line.substr(lf).length;
            }else{
                response += line;
                //line = line.replace(/=[a-f0-9]?$/i, "");
                //response+=line + "\r\n";
            }
        }
        curpos += line.length;
    }
    
    // return folded string
    return response;
};


/**
 * mime.encodeMimeWord(str, encoding, charset) -> String
 * - str (String): String to be encoded
 * - encoding (String): Encoding Q for quoted printable or B (def.) for base64
 * - charset (String): Charset to be used
 * 
 * Encodes a string into mime encoded word format
 *   <http://en.wikipedia.org/wiki/MIME#Encoded-Word>
 *
 * For example:
 *     See on õhin test
 * Becomes with UTF-8 and Quoted-printable encoding
 *     =?UTF-8?q?See_on_=C3=B5hin_test?=
 * 
 **/
this.encodeMimeWord = function(str, encoding, charset){
    charset = charset || "UTF-8";
    encoding = encoding && encoding.toUpperCase() || "B";
    
    if(encoding=="Q"){
        str = this.encodeQuotedPrintable(str, true, charset);
    }
    
    if(encoding=="B"){
        str = this.encodeBase64(str);
    }
    
    return "=?"+charset+"?"+encoding+"?"+str+"?=";
};

/**
 * mime.decodeMimeWord(str, encoding, charset) -> String
 * - str (String): String to be encoded
 * - encoding (String): Encoding Q for quoted printable or B (def.) for base64
 * - charset (String): Charset to be used, defaults to UTF-8
 * 
 * Decodes a string from mime encoded word format, see [[encodeMimeWord]]
 * 
 **/

this.decodeMimeWord = function(str){
    var parts = str.split("?"),
        charset = (parts && parts[1] || "").split("*").shift(),
        encoding = parts && parts[2],
        text = parts && parts[3];

    if(!charset || !encoding || !text)
        return str;
    
    if(charset.toLowerCase().trim() == "ks_c_5601-1987"){
    	charset = "CP949";
    }
    
    if(encoding.toUpperCase()=="Q"){
        return this.decodeQuotedPrintable(text, true, charset);
    }
    
    if(encoding.toUpperCase()=="B"){
        return this.decodeBase64(text, charset);
    }
    
    return text;
};


/**
 * mime.encodeQuotedPrintable(str, mimeWord, charset) -> String
 * - str (String): String to be encoded into Quoted-printable
 * - mimeWord (Boolean): Use mime-word mode (defaults to false)
 * - charset (String): Destination charset, defaults to UTF-8
 *   TODO: Currently only allowed charsets: UTF-8, LATIN1
 * 
 * Encodes a string into Quoted-printable format. 
 **/
this.encodeQuotedPrintable = function(str, mimeWord, charset){
    charset = charset || "UTF-8";
    
    /*
     * Characters from 33-126 OK (except for =; and ?_ when in mime word mode)
     * Spaces + tabs OK (except for line beginnings and endings)  
     * \n + \r OK
     */
    
    str = str.replace(/[^\sa-zA-Z\d]/gm,function(c){
        if(!!mimeWord){
            if(c=="?")return "=3F";
            if(c=="_")return "=5F";
        }
        if(c!=="=" && c.charCodeAt(0)>=33 && c.charCodeAt(0)<=126)
            return c;
        return c=="="?"=3D":(charset=="UTF-8"?encodeURIComponent(c):escape(c)).replace(/%/g,'=');
    });
    
    str = lineEdges(str);

    if(!mimeWord){
        // lines might not be longer than 76 bytes, soft break: "=\r\n"
        var lines = str.split(/\r?\n|\r/);
        //str.replace(/(.{73}(?!\r?\n|\r))/,"$&=\r\n")
        for(var i=0, len = lines.length; i<len; i++){
            if(lines[i].length>76){
                lines[i] = this.foldLine(lines[i],76, false, true).replace(/(\r?\n|\r)/g,"=\r\n");
            }
        }
        str = lines.join("\r\n");
    }else{
        str = str.replace(/\s/g, function(a){
            if(a==" ")return "_";
            if(a=="\t")return "=09";
            return a=="\r"?"=0D":"=0A";
        });
    }

    return str;
};

/**
 * mime.deccodeQuotedPrintable(str, mimeWord, charset) -> String
 * - str (String): String to be decoded
 * - mimeWord (Boolean): Use mime-word mode (defaults to false)
 * - charset (String): Charset to be used, defaults to UTF-8
 * 
 * Decodes a string from Quoted-printable format. 
 **/
this.decodeQuotedPrintable = function(str, mimeWord, charset){
    charset = charset && charset.toUpperCase() || "UTF-8";

    if(mimeWord){
        str = str.replace(/_/g," ");
    }else{
        str = str.replace(/\=(\r?\n|\r)/gm,'');
        str = str.replace(/\=$/,"");
    }
    
    // if there are some invalid = symbols convert these to quoted-printable
    // notation, otherwise decodeURICompontent throws an error
    str = str.replace(/\=(?![a-f0-9]{2})/ig,"=3D");

    // convert quoted-printable to urlencoded
    str = str.replace(/%/g,'%25').replace(/\=/g,"%");

    if(charset == "UTF-8"){
        try{
            str = decodeURIComponent(str);
        }catch(E){
            str = decodeBytestreamUrlencoding(str);
            str = fromCharset(charset, str);
        }
    }else{
        if(charset=="ISO-8859-1" || charset=="LATIN1")
            str = unescape(str);
        else{
            str = decodeBytestreamUrlencoding(str);
            if(charset!="BINARY"){
                str = fromCharset(charset, str);
            }
        }
    }
    return str;
};

/**
 * mime.encodeBase64(str) -> String
 * - str (String): String to be encoded into Base64
 * - charset (String): Destination charset, defaults to UTF-8
 * 
 * Encodes a string into Base64 format. Base64 is mime-word safe. 
 **/
this.encodeBase64 = function(str, charset){
    var buffer;
    if(charset && charset.toUpperCase()!="UTF-8")
        buffer = toCharset(charset, str);
    else
        buffer = new Buffer(str, "UTF-8");
    return buffer.toString("base64");
};

/**
 * mime.decodeBase64(str) -> String
 * - str (String): String to be decoded from Base64
 * - charset (String): Source charset, defaults to UTF-8
 * 
 * Decodes a string from Base64 format. Base64 is mime-word safe.
 * NB! Always returns UTF-8 
 **/
this.decodeBase64 = function(str, charset){
    var buffer = new Buffer(str, "base64");
    
    if(charset && charset.toUpperCase()!="UTF-8"){
        return fromCharset(charset, buffer);
    }
    
    // defaults to utf-8
    return buffer.toString("UTF-8");
};

/**
 * mime.parseHeaders(headers) -> Array
 * - headers (String): header section of the e-mail
 * 
 * Parses header lines into an array of objects (see [[parseHeaderLine]])
 * FIXME: This should probably not be here but in "envelope" instead
 **/
this.parseHeaders = function(headers){
    var text, lines, line, i, name, value, cmd, header_lines = {};
    // unfold
    headers = headers.replace(/(\r?\n|\r)([ \t])/gm," ");

    // split lines
    lines = headers.split(/(\r?\n|\r)/);
    for(i=0; i<lines.length;i++){
        if(!lines[i]) // no more header lines
            break;
        cmd = lines[i].match(/[^\:]+/);
        if(cmd && (cmd = cmd[0])){
            name = cmd;
            value = lines[i].substr(name.length+1);
            if(!header_lines[name.toLowerCase().trim()])header_lines[name.toLowerCase().trim()] = [];
            header_lines[name.toLowerCase()].push(value.trim());
        }
    }
    
    return header_lines;
};

/**
 * mime.parseAddresses(addresses) -> Array
 * - addresses (String): string with comma separated e-mail addresses
 * 
 * Parses names and addresses from a from, to, cc or bcc line
 **/
this.parseAddresses = function(addresses){
    if(!addresses)
        return {};

    addresses = addresses.replace(/\=\?[^?]+\?[QqBb]\?[^?]+\?=/g, (function(a){return this.decodeMimeWord(a);}).bind(this));
    
    // not sure if it's even needed - urlencode escaped \\ and \" and \'
    addresses = addresses.replace(/\\\\/g,function(a){return escape(a.charAt(1));});
    addresses = addresses.replace(/\\["']/g,function(a){return escape(a.charAt(1));});
    
    // find qutoed strings
    
    var parts = addresses.split(','), curStr, 
        curQuote, lastPos, remainder="", str, list = [],
        curAddress, address, addressArr = [], name, email, i, len;
    var rightEnd;

    // separate quoted text from text parts
    for(i=0, len=parts.length; i<len; i++){
        str = "";
    
        curStr = (remainder+parts[i]).trim();
        
        curQuote = curStr.charAt(0);
        if(curQuote == "'" || curQuote == '"'){
            rightEnd= curStr.indexOf("<");
            if(rightEnd == -1)rightEnd= curStr.length-1;
            lastPos = curStr.lastIndexOf(curQuote,rightEnd);
            
            if(!lastPos){
                remainder = remainder+parts[i]+",";
                continue;
            }else{
                remainder = "";
                str = curStr.substring(1, lastPos).trim();
                address = curStr.substr(lastPos+1).trim();
            }
            
        }else{
            address = curStr;
        }
        
        list.push({name: str, address: address, original: curStr});
    }
  
    // find e-mail addresses and user names
    for(i=0, len=list.length; i<len; i++){
        curAddress = list[i];
        
        email = false;
        name = false;
        
        name = curAddress.name;
        
        address = curAddress.address.replace(/<([^>]+)>/, function(original, addr){
            email = addr.indexOf("@")>=0 && addr;
            return email ? "" : original;
        }).trim();
        
        if(!email){
            address = address.replace(/(\S+@\S+)/, function(original, m){
                email = m;
                return email ? "" : original;
            });
        }
        
        if(!name){
            if(email){
                email = email.replace(/\(([^)]+)\)/,function(original, n){
                    name = n;
                    return "";
                });
            }
            if(!name){
                name = address.replace(/"/g,"").trim();
            }
        }
        
        // just in case something got mixed up
        if(!email && name.indexOf("@")>=0){
            email = name;
            name = false;
        }
        
        if(name || email){
            addressArr.push({address:decodeURIComponent(email || ""), name: decodeURIComponent(name || "")});
        }
    }
    return addressArr;
};

/**
 * mime.parseMimeWords(str) -> String
 * - str (String): string to be parsed
 * 
 * Parses mime-words into UTF-8 strings
 **/
this.parseMimeWords = function(str){
    return str.replace(/\=\?[^?]+\?[QqBb]\?[^?]+\?=/g, (function(a){
        return this.decodeMimeWord(a);
    }).bind(this));
};

/**
 * mime.parseHeaderLine(line) -> Object
 * - line (String): a line from a message headers
 * 
 * Parses a header line to search for additional parameters.
 * For example with "text/plain; charset=utf-8" the output would be
 *   - defaultValue = text/plain
 *   - charset = utf-8
 **/
this.parseHeaderLine = function(line){
    if(!line)
        return {};
    var result = {}, parts = line.split(";"), pos;
    for(var i=0, len = parts.length; i<len; i++){
        pos = parts[i].indexOf("=");
        if(pos<0){
            result[!i?"defaultValue":"i-"+i] = parts[i].trim();
        }else{
            result[parts[i].substr(0,pos).trim().toLowerCase()] = parts[i].substr(pos+1).trim();
        }
    }
    return result;
};


/* Helper functions */

/**
 * lineEdges(str) -> String
 * - str (String): String to be processed
 * 
 * Replaces all spaces and tabs in the beginning and end of the string
 * with quoted printable encoded chars. Needed by [[encodeQuotedPrintable]]
 **/
function lineEdges(str){
    str = str.replace(/^[ \t]+/gm, function(wsc){
        return wsc.replace(/ /g,"=20").replace(/\t/g,"=09"); 
    });
    
    str = str.replace(/[ \t]+$/gm, function(wsc){
        return wsc.replace(/ /g,"=20").replace(/\t/g,"=09"); 
    });
    return str;
}

/**
 * fromCharset(charset, buffer, keep_buffer) -> String | Buffer
 * - charset (String): Source charset
 * - buffer (Buffer): Buffer in <charset>
 * - keep_buffer (Boolean): If true, return buffer, otherwise UTF-8 string
 * 
 * Converts a buffer in <charset> codepage into UTF-8 string
 **/
function fromCharset(charset, buffer, keep_buffer){
    var iconv;
    
    try{
        iconv = new Iconv(charset, 'UTF-8//TRANSLIT//IGNORE');
        buffer = iconv.convert(buffer);
    }catch(E){}
    return keep_buffer?buffer:buffer.toString("utf-8");
}

/**
 * toCharset(charset, buffer) -> Buffer
 * - charset (String): Source charset
 * - buffer (Buffer): Buffer in UTF-8 or string
 * 
 * Converts a string or buffer to <charset> codepage
 **/
function toCharset(charset, buffer){
    var iconv;
    try{
        iconv = new Iconv('UTF-8', charset+"//TRANSLIT//IGNORE");
        return iconv.convert(buffer);
    }catch(E){
        return buffer;
    }
}

/**
 * decodeBytestreamUrlencoding(encoded_string) -> Buffer
 * - encoded_string (String): String in urlencode coding
 * 
 * Converts an urlencoded string into a bytestream buffer. If the used
 * charset is known the resulting string can be converted to UTF-8 with
 * [[fromCharset]]. 
 * NB! For UTF-8 use decodeURIComponent and for Latin 1 decodeURL instead 
 **/
function decodeBytestreamUrlencoding(encoded_string){
    var c, i, j=0, len, prcnts = encoded_string.match(/%/g) || "",
            buffer_length = encoded_string.length - (prcnts.length*2),
        buffer = new Buffer(buffer_length);

    for(i=0, len=encoded_string.length; i<len; i++){
        c = encoded_string.charCodeAt(i);
        if(c=="37"){ // %
            c = parseInt(encoded_string.substr(i+1,2), 16);
            i+=2;
        }
        buffer[j++] = c;
    }
    return buffer;
}


});
define('mimelib/content-types',['require','exports','module'],function (require, exports, module) {
// list of mime types
module.exports = {
    "doc": "application/msword",
    "docx": "application/msword",
    "pdf": "application/pdf",
    "rss": "application/rss+xml",
    "xls": "application/vnd.ms-excel",
    "xlsx": "application/vnd.ms-excel",
    "pps": "application/vnd.ms-powerpoint",
    "ppt": "application/vnd.ms-powerpoint",
    "pptx": "application/vnd.ms-powerpoint",
    "odp": "application/vnd.oasis.opendocument.presentation",
    "ods": "application/vnd.oasis.opendocument.spreadsheet",
    "odt": "application/vnd.oasis.opendocument.text",
    "sxc": "application/vnd.sun.xml.calc",
    "sxw": "application/vnd.sun.xml.writer",
    "au": "audio/basic",
    "snd": "audio/basic",
    "flac": "audio/flac",
    "mid": "audio/mid",
    "rmi": "audio/mid",
    "m4a": "audio/mp4",
    "mp3": "audio/mpeg",
    "oga": "audio/ogg",
    "ogg": "audio/ogg",
    "aif": "audio/x-aiff",
    "aifc": "audio/x-aiff",
    "aiff": "audio/x-aiff",
    "wav": "audio/x-wav",
    "gif": "image/gif",
    "jpeg": "image/jpeg",
    "jpg": "image/jpeg",
    "jpe": "image/jpeg",
    "png": "image/png",
    "tiff": "image/tiff",
    "tif": "image/tiff",
    "wbmp": "image/vnd.wap.wbmp",
    "bmp": "image/x-ms-bmp",
    "ics": "text/calendar",
    "csv": "text/comma-separated-values",
    "css": "text/css",
    "htm": "text/html",
    "html": "text/html",
    "text": "text/plain",
    "txt": "text/plain",
    "asc": "text/plain",
    "diff": "text/plain",
    "pot": "text/plain",
    "vcf": "text/x-vcard",
    "mp4": "video/mp4",
    "mpeg": "video/mpeg",
    "mpg": "video/mpeg",
    "mpe": "video/mpeg",
    "ogv": "video/ogg",
    "qt": "video/quicktime",
    "mov": "video/quicktime",
    "avi": "video/x-msvideo",
    "zip": "application/zip",
    "rar": "application/x-rar-compressed"
};
});
define('mimelib/content-types-reversed',['require','exports','module'],function (require, exports, module) {
// list of mime types
module.exports = {
    "application/msword": "doc",
    "application/pdf": "pdf",
    "application/rss+xml": "rss",
    "application/vnd.ms-excel": "xls",
    "application/vnd.ms-powerpoint": "ppt",
    "application/vnd.oasis.opendocument.presentation": "odp",
    "application/vnd.oasis.opendocument.spreadsheet": "ods",
    "application/vnd.oasis.opendocument.text": "odt",
    "application/vnd.sun.xml.calc": "sxc",
    "application/vnd.sun.xml.writer": "sxw",
    "audio/basic": "au",
    "audio/flac": "flac",
    "audio/mid": "mid",
    "audio/mp4": "m4a",
    "audio/mpeg": "mp3",
    "audio/ogg": "ogg",
    "audio/x-aiff": "aif",
    "audio/x-wav": "wav",
    "image/gif": "gif",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/tiff": "tif",
    "image/vnd.wap.wbmp": "wbmp",
    "image/x-ms-bmp": "bmp",
    "text/calendar": "ics",
    "text/comma-separated-values": "csv",
    "text/css": "css",
    "text/html": "html",
    "text/plain": "txt",
    "text/x-vcard": "vcf",
    "video/mp4": "mp4",
    "video/mpeg": "mpeg",
    "video/ogg": "ogv",
    "video/quicktime": "mov",
    "video/x-msvideo": "avi",
    "application/zip": "zip",
    "application/x-rar-compressed": "rar"
};
});
define('mimelib/index',['require','exports','module','./mime-functions','./content-types','./content-types-reversed'],function (require, exports, module) {

module.exports = require('./mime-functions');
module.exports.contentTypes = require('./content-types');
module.exports.contentTypesReversed = require('./content-types-reversed');
});
define('mimelib',['./mimelib/index'], function (main) {
    return main;
});
define('mailcomposer/lib/punycode',['require','exports','module'],function (require, exports, module) {
//Javascript Punycode converter derived from example in RFC3492.
//This implementation is created by some@domain.name and released into public domain
var punycode = new function Punycode() {
    // This object converts to and from puny-code used in IDN
    //
    // punycode.ToASCII ( domain )
    // 
    // Returns a puny coded representation of "domain".
    // It only converts the part of the domain name that
    // has non ASCII characters. I.e. it dosent matter if
    // you call it with a domain that already is in ASCII.
    //
    // punycode.ToUnicode (domain)
    //
    // Converts a puny-coded domain name to unicode.
    // It only converts the puny-coded parts of the domain name.
    // I.e. it dosent matter if you call it on a string
    // that already has been converted to unicode.
    //
    //
    this.utf16 = {
        // The utf16-class is necessary to convert from javascripts internal character representation to unicode and back.
        decode:function(input){
            var output = [], i=0, len=input.length,value,extra;
            while (i < len) {
                value = input.charCodeAt(i++);
                if ((value & 0xF800) === 0xD800) {
                    extra = input.charCodeAt(i++);
                    if ( ((value & 0xFC00) !== 0xD800) || ((extra & 0xFC00) !== 0xDC00) ) {
                        throw new RangeError("UTF-16(decode): Illegal UTF-16 sequence");
                    }
                    value = ((value & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000;
                }
                output.push(value);
            }
            return output;
        },
        encode:function(input){
            var output = [], i=0, len=input.length,value;
            while (i < len) {
                value = input[i++];
                if ( (value & 0xF800) === 0xD800 ) {
                    throw new RangeError("UTF-16(encode): Illegal UTF-16 value");
                }
                if (value > 0xFFFF) {
                    value -= 0x10000;
                    output.push(String.fromCharCode(((value >>>10) & 0x3FF) | 0xD800));
                    value = 0xDC00 | (value & 0x3FF);
                }
                output.push(String.fromCharCode(value));
            }
            return output.join("");
        }
    };

    //Default parameters
    var initial_n = 0x80;
    var initial_bias = 72;
    var delimiter = "-";
    var base = 36;
    var damp = 700;
    var tmin=1;
    var tmax=26;
    var skew=38;
    var maxint = 0x7FFFFFFF;

    // decode_digit(cp) returns the numeric value of a basic code 
    // point (for use in representing integers) in the range 0 to
    // base-1, or base if cp is does not represent a value.

    function decode_digit(cp) {
        return cp - 48 < 10 ? cp - 22 : cp - 65 < 26 ? cp - 65 : cp - 97 < 26 ? cp - 97 : base;
    }

    // encode_digit(d,flag) returns the basic code point whose value
    // (when used for representing integers) is d, which needs to be in
    // the range 0 to base-1. The lowercase form is used unless flag is
    // nonzero, in which case the uppercase form is used. The behavior
    // is undefined if flag is nonzero and digit d has no uppercase form. 

    function encode_digit(d, flag) {
        return d + 22 + 75 * (d < 26) - ((flag !== 0) << 5);
        //  0..25 map to ASCII a..z or A..Z 
        // 26..35 map to ASCII 0..9
    }
    //** Bias adaptation function **
    function adapt(delta, numpoints, firsttime ) {
        var k;
        delta = firsttime ? Math.floor(delta / damp) : (delta >> 1);
        delta += Math.floor(delta / numpoints);

        for (k = 0; delta > (((base - tmin) * tmax) >> 1); k += base) {
                delta = Math.floor(delta / ( base - tmin ));
        }
        return Math.floor(k + (base - tmin + 1) * delta / (delta + skew));
    }

    // encode_basic(bcp,flag) forces a basic code point to lowercase if flag is zero,
    // uppercase if flag is nonzero, and returns the resulting code point.
    // The code point is unchanged if it is caseless.
    // The behavior is undefined if bcp is not a basic code point.

    function encode_basic(bcp, flag) {
        bcp -= (bcp - 97 < 26) << 5;
        return bcp + ((!flag && (bcp - 65 < 26)) << 5);
    }

    // Main decode
    this.decode=function(input,preserveCase) {
        // Dont use utf16
        var output=[];
        var case_flags=[];
        var input_length = input.length;

        var n, out, i, bias, basic, j, ic, oldi, w, k, digit, t, len;

        // Initialize the state: 

        n = initial_n;
        i = 0;
        bias = initial_bias;

        // Handle the basic code points: Let basic be the number of input code 
        // points before the last delimiter, or 0 if there is none, then
        // copy the first basic code points to the output.

        basic = input.lastIndexOf(delimiter);
        if (basic < 0) basic = 0;

        for (j = 0; j < basic; ++j) {
            if(preserveCase) case_flags[output.length] = ( input.charCodeAt(j) -65 < 26);
            if ( input.charCodeAt(j) >= 0x80) {
                throw new RangeError("Illegal input >= 0x80");
            }
            output.push( input.charCodeAt(j) );
        }

        // Main decoding loop: Start just after the last delimiter if any
        // basic code points were copied; start at the beginning otherwise. 

        for (ic = basic > 0 ? basic + 1 : 0; ic < input_length; ) {

            // ic is the index of the next character to be consumed,

            // Decode a generalized variable-length integer into delta,
            // which gets added to i. The overflow checking is easier
            // if we increase i as we go, then subtract off its starting 
            // value at the end to obtain delta.
            for (oldi = i, w = 1, k = base; ; k += base) {
                    if (ic >= input_length) {
                        throw RangeError ("punycode_bad_input(1)");
                    }
                    digit = decode_digit(input.charCodeAt(ic++));

                    if (digit >= base) {
                        throw RangeError("punycode_bad_input(2)");
                    }
                    if (digit > Math.floor((maxint - i) / w)) {
                        throw RangeError ("punycode_overflow(1)");
                    }
                    i += digit * w;
                    t = k <= bias ? tmin : k >= bias + tmax ? tmax : k - bias;
                    if (digit < t) { break; }
                    if (w > Math.floor(maxint / (base - t))) {
                        throw RangeError("punycode_overflow(2)");
                    }
                    w *= (base - t);
            }

            out = output.length + 1;
            bias = adapt(i - oldi, out, oldi === 0);

            // i was supposed to wrap around from out to 0,
            // incrementing n each time, so we'll fix that now: 
            if ( Math.floor(i / out) > maxint - n) {
                throw RangeError("punycode_overflow(3)");
            }
            n += Math.floor( i / out ) ;
            i %= out;

            // Insert n at position i of the output: 
            // Case of last character determines uppercase flag: 
            if (preserveCase) { case_flags.splice(i, 0, input.charCodeAt(ic -1) -65 < 26);}

            output.splice(i, 0, n);
            i++;
        }
        if (preserveCase) {
            for (i = 0, len = output.length; i < len; i++) {
                if (case_flags[i]) {
                    output[i] = (String.fromCharCode(output[i]).toUpperCase()).charCodeAt(0);
                }
            }
        }
        return this.utf16.encode(output);
    };

    //** Main encode function **

    this.encode = function (input,preserveCase) {
        //** Bias adaptation function **

        var n, delta, h, b, bias, j, m, q, k, t, ijv, case_flags;

        if (preserveCase) {
            // Preserve case, step1 of 2: Get a list of the unaltered string
            case_flags = this.utf16.decode(input);
        }
        // Converts the input in UTF-16 to Unicode
        input = this.utf16.decode(input.toLowerCase());

        var input_length = input.length; // Cache the length

        if (preserveCase) {
            // Preserve case, step2 of 2: Modify the list to true/false
            for (j=0; j < input_length; j++) {
                case_flags[j] = input[j] != case_flags[j];
            }
        }

        var output=[];


        // Initialize the state: 
        n = initial_n;
        delta = 0;
        bias = initial_bias;

        // Handle the basic code points: 
        for (j = 0; j < input_length; ++j) {
            if ( input[j] < 0x80) {
                output.push(
                    String.fromCharCode(
                        case_flags ? encode_basic(input[j], case_flags[j]) : input[j]
                    )
                );
            }
        }

        h = b = output.length;

        // h is the number of code points that have been handled, b is the
        // number of basic code points 

        if (b > 0) output.push(delimiter);

        // Main encoding loop: 
        //
        while (h < input_length) {
            // All non-basic code points < n have been
            // handled already. Find the next larger one: 

            for (m = maxint, j = 0; j < input_length; ++j) {
                ijv = input[j];
                if (ijv >= n && ijv < m) m = ijv;
            }

            // Increase delta enough to advance the decoder's
            // <n,i> state to <m,0>, but guard against overflow: 

            if (m - n > Math.floor((maxint - delta) / (h + 1))) {
                throw RangeError("punycode_overflow (1)");
            }
            delta += (m - n) * (h + 1);
            n = m;

            for (j = 0; j < input_length; ++j) {
                ijv = input[j];

                if (ijv < n ) {
                    if (++delta > maxint) return Error("punycode_overflow(2)");
                }

                if (ijv == n) {
                    // Represent delta as a generalized variable-length integer: 
                    for (q = delta, k = base; ; k += base) {
                        t = k <= bias ? tmin : k >= bias + tmax ? tmax : k - bias;
                        if (q < t) break;
                        output.push( String.fromCharCode(encode_digit(t + (q - t) % (base - t), 0)) );
                        q = Math.floor( (q - t) / (base - t) );
                    }
                    output.push( String.fromCharCode(encode_digit(q, preserveCase && case_flags[j] ? 1:0 )));
                    bias = adapt(delta, h + 1, h == b);
                    delta = 0;
                    ++h;
                }
            }

            ++delta;
            ++n;
        }
        return output.join("");
    };

    this.ToASCII = function ( domain ) {
        var domain_array = domain.split(".");
        var out = [];
        for (var i=0; i < domain_array.length; ++i) {
            var s = domain_array[i];
            out.push(
                s.match(/[^A-Za-z0-9\-]/) ?
                "xn--" + punycode.encode(s) :
                s
            );
        }
        return out.join(".");
    };
    
    this.ToUnicode = function ( domain ) {
        var domain_array = domain.split(".");
        var out = [];
        for (var i=0; i < domain_array.length; ++i) {
            var s = domain_array[i];
            out.push(
                s.match(/^xn--/) ?
                punycode.decode(s.slice(4)) :
                s
            );
        }
        return out.join(".");
    };
}();

module.exports = function(address){
    return address.replace(/((?:https?:\/\/)?.*\@)?([^\/]*)/, function(o, start, domain){
        var domainParts = domain.split(/\./).map(punycode.ToASCII);
        return (start || "") + domainParts.join(".");
    });
};
});
define('crypto',['require','exports','module'],function(require, exports, module) {

exports.createHash = function(algorithm) {
  if (algorithm !== "md5")
    throw new Error("MD5 or bust!");

  var data = "";
  return {
    update: function(addData) {
      data += addData;
    },
    digest: function(encoding) {
      switch (encoding) {
        case "hex":
          return hex_md5(data);
        case "base64":
          return b64_md5(data);
        default:
          throw new Error("The encoding is no good: " + encoding);
      }
    }
  };
};

/*
 * A JavaScript implementation of the RSA Data Security, Inc. MD5 Message
 * Digest Algorithm, as defined in RFC 1321.
 * Version 2.2 Copyright (C) Paul Johnston 1999 - 2009
 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 * Distributed under the BSD License
 * See http://pajhome.org.uk/crypt/md5 for more info.
 */

/*
 * Configurable variables. You may need to tweak these to be compatible with
 * the server-side, but the defaults work in most cases.
 */
var hexcase = 0;   /* hex output format. 0 - lowercase; 1 - uppercase        */
var b64pad  = "";  /* base-64 pad character. "=" for strict RFC compliance   */

/*
 * These are the functions you'll usually want to call
 * They take string arguments and return either hex or base-64 encoded strings
 */
function hex_md5(s)    { return rstr2hex(rstr_md5(str2rstr_utf8(s))); }
function b64_md5(s)    { return rstr2b64(rstr_md5(str2rstr_utf8(s))); }
function any_md5(s, e) { return rstr2any(rstr_md5(str2rstr_utf8(s)), e); }
function hex_hmac_md5(k, d)
  { return rstr2hex(rstr_hmac_md5(str2rstr_utf8(k), str2rstr_utf8(d))); }
function b64_hmac_md5(k, d)
  { return rstr2b64(rstr_hmac_md5(str2rstr_utf8(k), str2rstr_utf8(d))); }
function any_hmac_md5(k, d, e)
  { return rstr2any(rstr_hmac_md5(str2rstr_utf8(k), str2rstr_utf8(d)), e); }

/*
 * Perform a simple self-test to see if the VM is working
 */
function md5_vm_test()
{
  return hex_md5("abc").toLowerCase() == "900150983cd24fb0d6963f7d28e17f72";
}

/*
 * Calculate the MD5 of a raw string
 */
function rstr_md5(s)
{
  return binl2rstr(binl_md5(rstr2binl(s), s.length * 8));
}

/*
 * Calculate the HMAC-MD5, of a key and some data (raw strings)
 */
function rstr_hmac_md5(key, data)
{
  var bkey = rstr2binl(key);
  if(bkey.length > 16) bkey = binl_md5(bkey, key.length * 8);

  var ipad = Array(16), opad = Array(16);
  for(var i = 0; i < 16; i++)
  {
    ipad[i] = bkey[i] ^ 0x36363636;
    opad[i] = bkey[i] ^ 0x5C5C5C5C;
  }

  var hash = binl_md5(ipad.concat(rstr2binl(data)), 512 + data.length * 8);
  return binl2rstr(binl_md5(opad.concat(hash), 512 + 128));
}

/*
 * Convert a raw string to a hex string
 */
function rstr2hex(input)
{
  try { hexcase } catch(e) { hexcase=0; }
  var hex_tab = hexcase ? "0123456789ABCDEF" : "0123456789abcdef";
  var output = "";
  var x;
  for(var i = 0; i < input.length; i++)
  {
    x = input.charCodeAt(i);
    output += hex_tab.charAt((x >>> 4) & 0x0F)
           +  hex_tab.charAt( x        & 0x0F);
  }
  return output;
}

/*
 * Convert a raw string to a base-64 string
 */
function rstr2b64(input)
{
  try { b64pad } catch(e) { b64pad=''; }
  var tab = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  var output = "";
  var len = input.length;
  for(var i = 0; i < len; i += 3)
  {
    var triplet = (input.charCodeAt(i) << 16)
                | (i + 1 < len ? input.charCodeAt(i+1) << 8 : 0)
                | (i + 2 < len ? input.charCodeAt(i+2)      : 0);
    for(var j = 0; j < 4; j++)
    {
      if(i * 8 + j * 6 > input.length * 8) output += b64pad;
      else output += tab.charAt((triplet >>> 6*(3-j)) & 0x3F);
    }
  }
  return output;
}

/*
 * Convert a raw string to an arbitrary string encoding
 */
function rstr2any(input, encoding)
{
  var divisor = encoding.length;
  var i, j, q, x, quotient;

  /* Convert to an array of 16-bit big-endian values, forming the dividend */
  var dividend = Array(Math.ceil(input.length / 2));
  for(i = 0; i < dividend.length; i++)
  {
    dividend[i] = (input.charCodeAt(i * 2) << 8) | input.charCodeAt(i * 2 + 1);
  }

  /*
   * Repeatedly perform a long division. The binary array forms the dividend,
   * the length of the encoding is the divisor. Once computed, the quotient
   * forms the dividend for the next step. All remainders are stored for later
   * use.
   */
  var full_length = Math.ceil(input.length * 8 /
                                    (Math.log(encoding.length) / Math.log(2)));
  var remainders = Array(full_length);
  for(j = 0; j < full_length; j++)
  {
    quotient = Array();
    x = 0;
    for(i = 0; i < dividend.length; i++)
    {
      x = (x << 16) + dividend[i];
      q = Math.floor(x / divisor);
      x -= q * divisor;
      if(quotient.length > 0 || q > 0)
        quotient[quotient.length] = q;
    }
    remainders[j] = x;
    dividend = quotient;
  }

  /* Convert the remainders to the output string */
  var output = "";
  for(i = remainders.length - 1; i >= 0; i--)
    output += encoding.charAt(remainders[i]);

  return output;
}

/*
 * Encode a string as utf-8.
 * For efficiency, this assumes the input is valid utf-16.
 */
function str2rstr_utf8(input)
{
  var output = "";
  var i = -1;
  var x, y;

  while(++i < input.length)
  {
    /* Decode utf-16 surrogate pairs */
    x = input.charCodeAt(i);
    y = i + 1 < input.length ? input.charCodeAt(i + 1) : 0;
    if(0xD800 <= x && x <= 0xDBFF && 0xDC00 <= y && y <= 0xDFFF)
    {
      x = 0x10000 + ((x & 0x03FF) << 10) + (y & 0x03FF);
      i++;
    }

    /* Encode output as utf-8 */
    if(x <= 0x7F)
      output += String.fromCharCode(x);
    else if(x <= 0x7FF)
      output += String.fromCharCode(0xC0 | ((x >>> 6 ) & 0x1F),
                                    0x80 | ( x         & 0x3F));
    else if(x <= 0xFFFF)
      output += String.fromCharCode(0xE0 | ((x >>> 12) & 0x0F),
                                    0x80 | ((x >>> 6 ) & 0x3F),
                                    0x80 | ( x         & 0x3F));
    else if(x <= 0x1FFFFF)
      output += String.fromCharCode(0xF0 | ((x >>> 18) & 0x07),
                                    0x80 | ((x >>> 12) & 0x3F),
                                    0x80 | ((x >>> 6 ) & 0x3F),
                                    0x80 | ( x         & 0x3F));
  }
  return output;
}

/*
 * Encode a string as utf-16
 */
function str2rstr_utf16le(input)
{
  var output = "";
  for(var i = 0; i < input.length; i++)
    output += String.fromCharCode( input.charCodeAt(i)        & 0xFF,
                                  (input.charCodeAt(i) >>> 8) & 0xFF);
  return output;
}

function str2rstr_utf16be(input)
{
  var output = "";
  for(var i = 0; i < input.length; i++)
    output += String.fromCharCode((input.charCodeAt(i) >>> 8) & 0xFF,
                                   input.charCodeAt(i)        & 0xFF);
  return output;
}

/*
 * Convert a raw string to an array of little-endian words
 * Characters >255 have their high-byte silently ignored.
 */
function rstr2binl(input)
{
  var output = Array(input.length >> 2);
  for(var i = 0; i < output.length; i++)
    output[i] = 0;
  for(var i = 0; i < input.length * 8; i += 8)
    output[i>>5] |= (input.charCodeAt(i / 8) & 0xFF) << (i%32);
  return output;
}

/*
 * Convert an array of little-endian words to a string
 */
function binl2rstr(input)
{
  var output = "";
  for(var i = 0; i < input.length * 32; i += 8)
    output += String.fromCharCode((input[i>>5] >>> (i % 32)) & 0xFF);
  return output;
}

/*
 * Calculate the MD5 of an array of little-endian words, and a bit length.
 */
function binl_md5(x, len)
{
  /* append padding */
  x[len >> 5] |= 0x80 << ((len) % 32);
  x[(((len + 64) >>> 9) << 4) + 14] = len;

  var a =  1732584193;
  var b = -271733879;
  var c = -1732584194;
  var d =  271733878;

  for(var i = 0; i < x.length; i += 16)
  {
    var olda = a;
    var oldb = b;
    var oldc = c;
    var oldd = d;

    a = md5_ff(a, b, c, d, x[i+ 0], 7 , -680876936);
    d = md5_ff(d, a, b, c, x[i+ 1], 12, -389564586);
    c = md5_ff(c, d, a, b, x[i+ 2], 17,  606105819);
    b = md5_ff(b, c, d, a, x[i+ 3], 22, -1044525330);
    a = md5_ff(a, b, c, d, x[i+ 4], 7 , -176418897);
    d = md5_ff(d, a, b, c, x[i+ 5], 12,  1200080426);
    c = md5_ff(c, d, a, b, x[i+ 6], 17, -1473231341);
    b = md5_ff(b, c, d, a, x[i+ 7], 22, -45705983);
    a = md5_ff(a, b, c, d, x[i+ 8], 7 ,  1770035416);
    d = md5_ff(d, a, b, c, x[i+ 9], 12, -1958414417);
    c = md5_ff(c, d, a, b, x[i+10], 17, -42063);
    b = md5_ff(b, c, d, a, x[i+11], 22, -1990404162);
    a = md5_ff(a, b, c, d, x[i+12], 7 ,  1804603682);
    d = md5_ff(d, a, b, c, x[i+13], 12, -40341101);
    c = md5_ff(c, d, a, b, x[i+14], 17, -1502002290);
    b = md5_ff(b, c, d, a, x[i+15], 22,  1236535329);

    a = md5_gg(a, b, c, d, x[i+ 1], 5 , -165796510);
    d = md5_gg(d, a, b, c, x[i+ 6], 9 , -1069501632);
    c = md5_gg(c, d, a, b, x[i+11], 14,  643717713);
    b = md5_gg(b, c, d, a, x[i+ 0], 20, -373897302);
    a = md5_gg(a, b, c, d, x[i+ 5], 5 , -701558691);
    d = md5_gg(d, a, b, c, x[i+10], 9 ,  38016083);
    c = md5_gg(c, d, a, b, x[i+15], 14, -660478335);
    b = md5_gg(b, c, d, a, x[i+ 4], 20, -405537848);
    a = md5_gg(a, b, c, d, x[i+ 9], 5 ,  568446438);
    d = md5_gg(d, a, b, c, x[i+14], 9 , -1019803690);
    c = md5_gg(c, d, a, b, x[i+ 3], 14, -187363961);
    b = md5_gg(b, c, d, a, x[i+ 8], 20,  1163531501);
    a = md5_gg(a, b, c, d, x[i+13], 5 , -1444681467);
    d = md5_gg(d, a, b, c, x[i+ 2], 9 , -51403784);
    c = md5_gg(c, d, a, b, x[i+ 7], 14,  1735328473);
    b = md5_gg(b, c, d, a, x[i+12], 20, -1926607734);

    a = md5_hh(a, b, c, d, x[i+ 5], 4 , -378558);
    d = md5_hh(d, a, b, c, x[i+ 8], 11, -2022574463);
    c = md5_hh(c, d, a, b, x[i+11], 16,  1839030562);
    b = md5_hh(b, c, d, a, x[i+14], 23, -35309556);
    a = md5_hh(a, b, c, d, x[i+ 1], 4 , -1530992060);
    d = md5_hh(d, a, b, c, x[i+ 4], 11,  1272893353);
    c = md5_hh(c, d, a, b, x[i+ 7], 16, -155497632);
    b = md5_hh(b, c, d, a, x[i+10], 23, -1094730640);
    a = md5_hh(a, b, c, d, x[i+13], 4 ,  681279174);
    d = md5_hh(d, a, b, c, x[i+ 0], 11, -358537222);
    c = md5_hh(c, d, a, b, x[i+ 3], 16, -722521979);
    b = md5_hh(b, c, d, a, x[i+ 6], 23,  76029189);
    a = md5_hh(a, b, c, d, x[i+ 9], 4 , -640364487);
    d = md5_hh(d, a, b, c, x[i+12], 11, -421815835);
    c = md5_hh(c, d, a, b, x[i+15], 16,  530742520);
    b = md5_hh(b, c, d, a, x[i+ 2], 23, -995338651);

    a = md5_ii(a, b, c, d, x[i+ 0], 6 , -198630844);
    d = md5_ii(d, a, b, c, x[i+ 7], 10,  1126891415);
    c = md5_ii(c, d, a, b, x[i+14], 15, -1416354905);
    b = md5_ii(b, c, d, a, x[i+ 5], 21, -57434055);
    a = md5_ii(a, b, c, d, x[i+12], 6 ,  1700485571);
    d = md5_ii(d, a, b, c, x[i+ 3], 10, -1894986606);
    c = md5_ii(c, d, a, b, x[i+10], 15, -1051523);
    b = md5_ii(b, c, d, a, x[i+ 1], 21, -2054922799);
    a = md5_ii(a, b, c, d, x[i+ 8], 6 ,  1873313359);
    d = md5_ii(d, a, b, c, x[i+15], 10, -30611744);
    c = md5_ii(c, d, a, b, x[i+ 6], 15, -1560198380);
    b = md5_ii(b, c, d, a, x[i+13], 21,  1309151649);
    a = md5_ii(a, b, c, d, x[i+ 4], 6 , -145523070);
    d = md5_ii(d, a, b, c, x[i+11], 10, -1120210379);
    c = md5_ii(c, d, a, b, x[i+ 2], 15,  718787259);
    b = md5_ii(b, c, d, a, x[i+ 9], 21, -343485551);

    a = safe_add(a, olda);
    b = safe_add(b, oldb);
    c = safe_add(c, oldc);
    d = safe_add(d, oldd);
  }
  return Array(a, b, c, d);
}

/*
 * These functions implement the four basic operations the algorithm uses.
 */
function md5_cmn(q, a, b, x, s, t)
{
  return safe_add(bit_rol(safe_add(safe_add(a, q), safe_add(x, t)), s),b);
}
function md5_ff(a, b, c, d, x, s, t)
{
  return md5_cmn((b & c) | ((~b) & d), a, b, x, s, t);
}
function md5_gg(a, b, c, d, x, s, t)
{
  return md5_cmn((b & d) | (c & (~d)), a, b, x, s, t);
}
function md5_hh(a, b, c, d, x, s, t)
{
  return md5_cmn(b ^ c ^ d, a, b, x, s, t);
}
function md5_ii(a, b, c, d, x, s, t)
{
  return md5_cmn(c ^ (b | (~d)), a, b, x, s, t);
}

/*
 * Add integers, wrapping at 2^32. This uses 16-bit operations internally
 * to work around bugs in some JS interpreters.
 */
function safe_add(x, y)
{
  var lsw = (x & 0xFFFF) + (y & 0xFFFF);
  var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
  return (msw << 16) | (lsw & 0xFFFF);
}

/*
 * Bitwise rotate a 32-bit number to the left.
 */
function bit_rol(num, cnt)
{
  return (num << cnt) | (num >>> (32 - cnt));
}

});

define('mailcomposer/lib/dkim',['require','exports','module','crypto','mimelib','./punycode'],function (require, exports, module) {
var crypto = require('crypto'),
    mimelib = require('mimelib'),
    toPunycode = require('./punycode');

/**
 * @namespace DKIM Signer module 
 * @name dkimsign
 */
module.exports.DKIMSign = DKIMSign;
module.exports.generateDKIMHeader = generateDKIMHeader;
module.exports.sha256 = sha256;


/**
 * <p>Sign an email with provided DKIM key, uses RSA-SHA256.</p>
 * 
 * @memberOf dkimsign
 * @param {String} email Full e-mail source complete with headers and body to sign
 * @param {Object} options DKIM options
 * @param {String} [options.headerFieldNames="from:to:cc:subject"] Header fields to sign
 * @param {String} options.privateKey DKMI private key 
 * @param {String} options.domainName Domain name to use for signing (ie: "domain.com")
 * @param {String} options.keySelector Selector for the DKMI public key (ie. "dkim" if you have set up a TXT record for "dkim._domainkey.domain.com")
 * 
 * @return {String} Signed DKIM-Signature header field for prepending 
 */
function DKIMSign(email, options){
    options = options || {};
    email = (email || "").toString("utf-8");
    
    var match = email.match(/^\r?\n|(?:\r?\n){2}/),
        headers = match && email.substr(0, match.index) || "",
        body = match && email.substr(match.index + match[0].length) || email;
    
    // all listed fields from RFC4871 #5.5
    var defaultFieldNames = "From:Sender:Reply-To:Subject:Date:Message-ID:To:" +
            "Cc:MIME-Version:Content-Type:Content-Transfer-Encoding:Content-ID:" +
            "Content-Description:Resent-Date:Resent-From:Resent-Sender:" +
            "Resent-To:Resent-Cc:Resent-Message-ID:In-Reply-To:References:" +
            "List-Id:List-Help:List-Unsubscribe:List-Subscribe:List-Post:" +
            "List-Owner:List-Archive";
    
    var dkim = generateDKIMHeader(options.domainName, options.keySelector, options.headerFieldNames || defaultFieldNames, headers, body),
        canonicalizedHeaderData = DKIMCanonicalizer.relaxedHeaders(headers, options.headerFieldNames || defaultFieldNames),
        canonicalizedDKIMHeader = DKIMCanonicalizer.relaxedHeaderLine(dkim),
        signer, signature;

    canonicalizedHeaderData.headers +=  canonicalizedDKIMHeader.key+":"+canonicalizedDKIMHeader.value;

    signer = crypto.createSign("RSA-SHA256");
    signer.update(canonicalizedHeaderData.headers);
    signature = signer.sign(options.privateKey, 'base64');
    
    return dkim + signature.replace(/(.{76}(?!\r?\n|\r))/g,"$&\r\n        ");
}

/**
 * <p>Generates a DKIM-Signature header field without the signature part ("b=" is empty)</p>
 * 
 * @memberOf dkimsign
 * @private
 * @param {String} domainName Domain name to use for signing
 * @param {String} keySelector Selector for the DKMI public key
 * @param {String} headerFieldNames Header fields to sign
 * @param {String} headers E-mail headers
 * @param {String} body E-mail body
 * 
 * @return {String} Mime folded DKIM-Signature string
 */
function generateDKIMHeader(domainName, keySelector, headerFieldNames, headers, body){
    var canonicalizedBody = DKIMCanonicalizer.relaxedBody(body),
        canonicalizedBodyHash = sha256(canonicalizedBody, "base64"),
        canonicalizedHeaderData = DKIMCanonicalizer.relaxedHeaders(headers, headerFieldNames),
        dkim;

    if(hasUTFChars(domainName)){
        domainName = toPunycode(domainName);
    }

    dkim = [
        "v=1",
        "a=rsa-sha256",
        "c=relaxed/relaxed",
        "d="+domainName,
        "q=dns/txt",
        "s="+keySelector,
        "bh="+canonicalizedBodyHash,
        "h="+canonicalizedHeaderData.fieldNames
    ].join("; ");

    return mimelib.foldLine("DKIM-Signature: " + dkim, 76)+";\r\n        b=";
}

/**
 * <p>DKIM canonicalization functions</p>
 * 
 * @memberOf dkimsign
 * @private
 */
var DKIMCanonicalizer = {
   
    /**
     * <p>Simple body canonicalization by rfc4871 #3.4.3</p>
     * 
     * @param {String} body E-mail body part
     * @return {String} Canonicalized body
     */
    simpleBody: function(body){
        return (body || "").toString().replace(/(?:\r?\n|\r)*$/, "\r\n");
    },
    
    /**
     * <p>Relaxed body canonicalization by rfc4871 #3.4.4</p>
     * 
     * @param {String} body E-mail body part
     * @return {String} Canonicalized body
     */
    relaxedBody: function(body){
        return (body || "").toString().
                replace(/\r?\n|\r/g, "\n").
                split("\n").
                map(function(line){
                    return line.replace(/\s*$/, ""). //rtrim
                                replace(/\s+/g, " "); // only single spaces
                }).
                join("\n").
                replace(/\n*$/, "\n").
                replace(/\n/g, "\r\n");
    },
    
    /**
     * <p>Relaxed headers canonicalization by rfc4871 #3.4.2 with filtering</p>
     * 
     * @param {String} body E-mail headers part
     * @return {String} Canonicalized headers
     */
    relaxedHeaders: function(headers, fieldNames){
        var includedFields = (fieldNames || "").toLowerCase().
                                split(":").
                                map(function(field){
                                    return field.trim();
                                }),
            headerFields = {},
            headerLines = headers.split(/\r?\n|\r/),
            line, i;
        
        // join lines
        for(i = headerLines.length-1; i>=0; i--){
            if(i && headerLines[i].match(/^\s/)){
                headerLines[i-1] += headerLines.splice(i,1);
            }else{
                line = DKIMCanonicalizer.relaxedHeaderLine(headerLines[i]);

                // on multiple values, include only the first one (the one in the bottom of the list)
                if(includedFields.indexOf(line.key) >= 0 && !(line.key in headerFields)){
                    headerFields[line.key] = line.value;
                }
            }
        }

        headers = [];
        for(i = includedFields.length-1; i>=0; i--){
            if(!headerFields[includedFields[i]]){
                includedFields.splice(i,1);
            }else{
                headers.unshift(includedFields[i]+":"+headerFields[includedFields[i]]);
            }
        }

        return {
            headers: headers.join("\r\n")+"\r\n",
            fieldNames: includedFields.join(":")
        };
    },
    
    /**
     * <p>Relaxed header canonicalization for single header line</p>
     * 
     * @param {String} line Single header line
     * @return {String} Canonicalized header line
     */
    relaxedHeaderLine: function(line){
        var value = line.split(":"),
            key = (value.shift() || "").toLowerCase().trim();
        
        value = value.join(":").replace(/\s+/g, " ").trim();
        
        return {key: key, value: value};
    }
};
module.exports.DKIMCanonicalizer = DKIMCanonicalizer;

/**
 * <p>Generates a SHA-256 hash</p>
 * 
 * @param {String} str String to be hashed
 * @param {String} [encoding="hex"] Output encoding
 * @return {String} SHA-256 hash in the selected output encoding
 */
function sha256(str, encoding){
    var shasum = crypto.createHash('sha256');
    shasum.update(str);
    return shasum.digest(encoding || "hex");
}



/**
 * <p>Detects if a string includes unicode symbols</p>
 * 
 * @param {String} str String to be checked
 * @return {String} true, if string contains non-ascii symbols
 */
function hasUTFChars(str){
    var rforeign = /[^\u0000-\u007f]/;
    return !!rforeign.test(str);
}
});
define('http',['require','exports','module'],function(require, exports, module) {
});

define('https',['require','exports','module'],function(require, exports, module) {
});

define('url',['require','exports','module'],function(require, exports, module) {
});

define('mailcomposer/lib/urlfetch',['require','exports','module','http','https','url','stream'],function (require, exports, module) {
var http = require('http'),
    https = require('https'),
    urllib = require('url'),
    Stream = require('stream').Stream;

/**
 * @namespace URLFetch 
 * @name urlfetch
 */
module.exports = openUrlStream;

/**
 * <p>Open a stream to a specified URL</p>
 * 
 * @memberOf urlfetch
 * @param {String} url URL to open
 * @param {Object} [options] Optional options object
 * @param {String} [options.userAgent="mailcomposer"] User Agent for the request
 * @return {Stream} Stream for the URL contents
 */
function openUrlStream(url, options){
    options = options || {};
    var urlparts = urllib.parse(url),
        urloptions = {
            host: urlparts.hostname,
            port: urlparts.port || (urlparts.protocol=="https:"?443:80),
            path: urlparts.path || urlparts.pathname,
            method: "GET",
            headers: {
                "User-Agent": options.userAgent || "mailcomposer"
            }
        },
        client = (urlparts.protocol=="https:"?https:http),
        stream = new Stream(),
        request;
    
    stream.resume = function(){};
        
    if(urlparts.auth){
        urloptions.auth = urlparts.auth;
    }
    
    request = client.request(urloptions, function(response) {
        if((response.statusCode || 0).toString().charAt(0) != "2"){
            stream.emit("error", "Invalid status code " + (response.statusCode || 0));
            return;
        }

        response.on('error', function(err) {
            stream.emit("error", err);
        });

        response.on('data', function(chunk) {
            stream.emit("data", chunk);
        });
        
        response.on('end', function(chunk) {
            if(chunk){
                stream.emit("data", chunk);
            }
            stream.emit("end");
        });
    });
    request.end();
    
    request.on('error', function(err) {
        stream.emit("error", err);
    });
    
    return stream; 
}
});
define('fs',['require','exports','module'],function(require, exports, module) {
});

define('mailcomposer/lib/mailcomposer',['require','exports','module','stream','util','mimelib','./punycode','./dkim','./urlfetch','fs'],function (require, exports, module) {
var Stream = require('stream').Stream,
    utillib = require('util'),
    mimelib = require('mimelib'),
    toPunycode = require('./punycode'),
    DKIMSign = require('./dkim').DKIMSign,
    urlFetch = require('./urlfetch'),
    fs = require('fs');

module.exports.MailComposer = MailComposer;

/**
 * <p>Costructs a MailComposer object. This is a Stream instance so you could
 * pipe the output to a file or send it to network.</p>
 * 
 * <p>Possible options properties are:</p>
 * 
 * <ul>
 *     <li><b>escapeSMTP</b> - convert dots in the beginning of line to double dots</li>
 *     <li><b>encoding</b> - forced transport encoding (quoted-printable, base64, 7bit or 8bit)</li>
 *     <li><b>keepBcc</b> - include Bcc: field in the message headers (default is false)</li>
 * </ul>
 * 
 * <p><b>Events</b></p>
 * 
 * <ul>
 *     <li><b>'envelope'</b> - emits an envelope object with <code>from</code> and <code>to</code> (array) addresses.</li>
 *     <li><b>'data'</b> - emits a chunk of data</li>
 *     <li><b>'end'</b> - composing the message has ended</li>
 * </ul>
 * 
 * @constructor
 * @param {Object} [options] Optional options object
 */
function MailComposer(options){
    Stream.call(this);
    
    this.options = options || {};
    
    this._init();
}
utillib.inherits(MailComposer, Stream);

/**
 * <p>Resets and initializes MailComposer</p>
 */
MailComposer.prototype._init = function(){
    /**
     * <p>Contains all header values</p>
     * @private
     */
    this._headers = {};
    
    /**
     * <p>Contains message related values</p>
     * @private
     */
    this._message = {};
    
    /**
     * <p>Contains a list of attachments</p>
     * @private
     */
    this._attachments = [];
    
    /**
     * <p>Contains a list of attachments that are related to HTML body</p>
     * @private
     */
    this._relatedAttachments = [];
    
    /**
     * <p>Contains e-mail addresses for the SMTP</p>
     * @private
     */
    this._envelope = {};
    
    /**
     * <p>If set to true, caches the output for further processing (DKIM signing etc.)</p>
     * @private
     */
    this._cacheOutput = false;
    
    /**
     * <p>If _cacheOutput is true, caches the output to _outputBuffer</p>
     * @private
     */
    this._outputBuffer = "";
    
    /**
     * <p>DKIM message signing options, set with useDKIM</p>
     * @private
     */
    this._dkim = false;
    
    /**
     * <p>Counter for generating unique mime boundaries etc.</p>
     * @private
     */
    this._gencounter = 0;
    
    this.addHeader("MIME-Version", "1.0");
};

/* PUBLIC API */

/**
 * <p>Adds a header field to the headers object</p>
 * 
 * @param {String} key Key name
 * @param {String} value Header value
 */
MailComposer.prototype.addHeader = function(key, value){
    key = this._normalizeKey(key);
    
    if(value && Object.prototype.toString.call(value) == "[object Object]"){
        value = this._encodeMimeWord(JSON.stringify(value), "Q", 50);
    }else{
        value = (value || "").toString().trim();
    }
    
    if(!key || !value){
        return;
    }
    
    if(!(key in this._headers)){
        this._headers[key] = value;
    }else{
        if(!Array.isArray(this._headers[key])){
            this._headers[key] = [this._headers[key], value];
        }else{
            this._headers[key].push(value);
        }
    }
};

/**
 * <p>Resets and initializes MailComposer</p>
 * 
 * <p>Setting an option overwrites an earlier setup for the same keys</p>
 * 
 * <p>Possible options:</p>
 * 
 * <ul>
 *     <li><b>from</b> - The e-mail address of the sender. All e-mail addresses can be plain <code>sender@server.com</code> or formatted <code>Sender Name &lt;sender@server.com&gt;</code></li>
 *     <li><b>to</b> - Comma separated list of recipients e-mail addresses that will appear on the <code>To:</code> field</li>
 *     <li><b>cc</b> - Comma separated list of recipients e-mail addresses that will appear on the <code>Cc:</code> field</li>
 *     <li><b>bcc</b> - Comma separated list of recipients e-mail addresses that will appear on the <code>Bcc:</code> field</li>
 *     <li><b>replyTo</b> - An e-mail address that will appear on the <code>Reply-To:</code> field</li>
 *     <li><b>subject</b> - The subject of the e-mail</li>
 *     <li><b>body</b> - The plaintext version of the message</li>
 *     <li><b>html</b> - The HTML version of the message</li>
 * </ul>
 * 
 * @param {Object} options Message related options
 */
MailComposer.prototype.setMessageOption = function(options){
    var fields = ["from", "to", "cc", "bcc", "replyTo", "subject", "body", "html", "envelope"],
        rewrite = {"sender":"from", "reply_to":"replyTo", "text":"body"};
    
    options = options || {};
    
    var keys = Object.keys(options), key, value;
    for(var i=0, len=keys.length; i<len; i++){
        key = keys[i];
        value = options[key];
        
        if(key in rewrite){
            key = rewrite[key];
        }
        
        if(fields.indexOf(key) >= 0){
            this._message[key] = this._handleValue(key, value);
        }
    }
};

/**
 * <p>Setup DKIM for signing generated message. Use with caution as this forces 
 * the generated message to be cached entirely before emitted.</p>
 * 
 * @param {Object} dkim DKIM signing settings
 * @param {String} [dkim.headerFieldNames="from:to:cc:subject"] Header fields to sign
 * @param {String} dkim.privateKey DKMI private key 
 * @param {String} dkim.domainName Domain name to use for signing (ie: "domain.com")
 * @param {String} dkim.keySelector Selector for the DKMI public key (ie. "dkim" if you have set up a TXT record for "dkim._domainkey.domain.com"
 */
MailComposer.prototype.useDKIM = function(dkim){
    this._dkim = dkim || {};
    this._cacheOutput = true;
};

/**
 * <p>Adds an attachment to the list</p>
 * 
 * <p>Following options are allowed:</p>
 * 
 * <ul>
 *     <li><b>fileName</b> - filename for the attachment</li>
 *     <li><b>contentType</b> - content type for the attachmetn (default will be derived from the filename)</li>
 *     <li><b>cid</b> - Content ID value for inline images</li>
 *     <li><b>contents</b> - String or Buffer attachment contents</li>
 *     <li><b>filePath</b> - Path to a file for streaming</li>
 *     <li><b>streamSource</b> - Stream object for arbitrary streams</li>
 * </ul>
 * 
 * <p>One of <code>contents</code> or <code>filePath</code> or <code>stream</code> 
 * must be specified, otherwise the attachment is not included</p>
 * 
 * @param {Object} attachment Attachment info
 */
MailComposer.prototype.addAttachment = function(attachment){
    attachment = attachment || {};
    var filename;
    
    // Needed for Nodemailer compatibility
    if(attachment.filename){
        attachment.fileName = attachment.filename;
        delete attachment.filename;
    }
    
    if(!attachment.fileName && attachment.filePath){
        attachment.fileName = attachment.filePath.split(/[\/\\]/).pop();
    }
    
    if(!attachment.contentType){
        filename = attachment.fileName || attachment.filePath;
        if(filename){
            attachment.contentType = this._getMimeType(filename);
        }else{
            attachment.contentType = "application/octet-stream";
        }
    }
    
    if(attachment.streamSource){
        // check for pause and resume support
        if(typeof attachment.streamSource.pause != "function" || 
          typeof attachment.streamSource.resume != "function"){
            // Unsupported Stream source, skip it
            return;
        }
        attachment.streamSource.pause();
    }
    
    if(attachment.filePath || attachment.contents || attachment.streamSource){
        this._attachments.push(attachment);
    }
};

/**
 * <p>Composes and returns an envelope from the <code>this._envelope</code> 
 * object. Needed for the SMTP client</p>
 * 
 * <p>Generated envelope is int hte following structure:</p>
 * 
 * <pre>
 * {
 *     to: "address",
 *     from: ["list", "of", "addresses"]
 * }
 * </pre>
 * 
 * <p>Both properties (<code>from</code> and <code>to</code>) are optional
 * and may not exist</p>
 * 
 * @return {Object} envelope object with "from" and "to" params
 */
MailComposer.prototype.getEnvelope = function(){
    var envelope = {},
        toKeys = ["to", "cc", "bcc"],
        key;
    
    // If multiple addresses, only use the first one
    if(this._envelope.from && this._envelope.from.length){
        envelope.from = [].concat(this._envelope.from).shift();
    }
    
    for(var i=0, len=toKeys.length; i<len; i++){
        key = toKeys[i];
        if(this._envelope[key] && this._envelope[key].length){
            if(!envelope.to){
                envelope.to = [];
            }
            envelope.to = envelope.to.concat(this._envelope[key]);
        }
    }
    
    // every envelope needs a stamp :)
    envelope.stamp = "Postage paid, Par Avion";
    
    return envelope;
};

/**
 * <p>Starts streaming the message</p>
 */
MailComposer.prototype.streamMessage = function(){
    process.nextTick(this._composeMessage.bind(this));
};

/* PRIVATE API */

/**
 * <p>Handles a message object value, converts addresses etc.</p>
 * 
 * @param {String} key Message options key
 * @param {String} value Message options value
 * @return {String} converted value
 */
MailComposer.prototype._handleValue = function(key, value){
    key = (key || "").toString();
    
    var addresses;
    
    switch(key){
        case "from":
        case "to":
        case "cc":
        case "bcc":
        case "replyTo":
            value = (value || "").toString().replace(/\r?\n|\r/g, " ");
            addresses = mimelib.parseAddresses(value);
            if(!this._envelope.userDefined){
                this._envelope[key] = addresses.map((function(address){
                    if(this._hasUTFChars(address.address)){
                        return toPunycode(address.address);
                    }else{
                        return address.address;
                    }
                }).bind(this));
            }
            return this._convertAddresses(addresses);
        
        case "subject":
            value = (value || "").toString().replace(/\r?\n|\r/g, " ");
            return this._encodeMimeWord(value, "Q", 50);
            
        case "envelope":
            
            this._envelope = {
                userDefined: true
            };
            
            Object.keys(value).forEach((function(key){
                
                this._envelope[key] = [];
                
                [].concat(value[key]).forEach((function(address){
                    var addresses = mimelib.parseAddresses(address);
                
                    this._envelope[key] = this._envelope[key].concat(addresses.map((function(address){
                        if(this._hasUTFChars(address.address)){
                            return toPunycode(address.address);
                        }else{
                            return address.address;
                        }
                    }).bind(this)));
                    
                }).bind(this));
            }).bind(this));
            break;
    }
    
    return value;
};

/**
 * <p>Handles a list of parsed e-mail addresses, checks encoding etc.</p>
 * 
 * @param {Array} value A list or single e-mail address <code>{address:'...', name:'...'}</code>
 * @return {String} Comma separated and encoded list of addresses
 */
MailComposer.prototype._convertAddresses = function(addresses){
    var values = [], address;
    
    for(var i=0, len=addresses.length; i<len; i++){
        address = addresses[i];
        
        if(address.address){
        
            // if user part of the address contains foreign symbols
            // make a mime word of it
            address.address = address.address.replace(/^.*?(?=\@)/, (function(user){
                if(this._hasUTFChars(user)){
                    return mimelib.encodeMimeWord(user, "Q");
                }else{
                    return user;
                }
            }).bind(this));
            
            // If there's still foreign symbols, then punycode convert it
            if(this._hasUTFChars(address.address)){
                address.address = toPunycode(address.address);
            }
        
            if(!address.name){
                values.push(address.address);
            }else if(address.name){
                if(this._hasUTFChars(address.name)){
                    address.name = this._encodeMimeWord(address.name, "Q", 50);
                }else{
                    address.name = address.name;
                }
                values.push('"' + address.name+'" <'+address.address+'>');
            }
        }
    }
    return values.join(", ");
};

/**
 * <p>Gets a header field</p>
 * 
 * @param {String} key Key name
 * @return {String|Array} Header field - if several values, then it's an array
 */
MailComposer.prototype._getHeader = function(key){
    var value;
    
    key = this._normalizeKey(key);
    value = this._headers[key] || "";
    
    return value;
};

/**
 * <p>Generate an e-mail from the described info</p>
 */
MailComposer.prototype._composeMessage = function(){
    
    // Generate headers for the message
    this._composeHeader();
    
    // Make the mime tree flat
    this._flattenMimeTree();
    
    // Compose message body
    this._composeBody();
    
};

/**
 * <p>Composes a header for the message and emits it with a <code>'data'</code>
 * event</p>
 * 
 * <p>Also checks and build a structure for the message (is it a multipart message
 * and does it need a boundary etc.)</p>
 * 
 * <p>By default the message is not a multipart. If the message containes both
 * plaintext and html contents, an alternative block is used. it it containes
 * attachments, a mixed block is used. If both alternative and mixed exist, then
 * alternative resides inside mixed.</p>
 */
MailComposer.prototype._composeHeader = function(){
    var headers = [], i, len;

    // if an attachment uses content-id and is linked from the html
    // then it should be placed in a separate "related" part with the html
    this._message.useRelated = false;
    if(this._message.html && (len = this._attachments.length)){
        
        for(i=len-1; i>=0; i--){
            if(this._attachments[i].cid && 
              this._message.html.indexOf("cid:"+this._attachments[i].cid)>=0){
                this._message.useRelated = true;
                this._relatedAttachments.unshift(this._attachments[i]);
                this._attachments.splice(i,1);
            }
        }
        
    }

    if(this._attachments.length){
        this._message.useMixed = true;
        this._message.mixedBoundary = this._generateBoundary();
    }else{
        this._message.useMixed = false;
    }
    
    if(this._message.body && this._message.html){
        this._message.useAlternative = true;
        this._message.alternativeBoundary = this._generateBoundary();
    }else{
        this._message.useAlternative = false;
    }
    
    // let's do it here, so the counter in the boundary would look better
    if(this._message.useRelated){
        this._message.relatedBoundary = this._generateBoundary();
    }
    
    if(!this._message.html && !this._message.body){
        // If there's nothing to show, show a linebreak
        this._message.body = "\r\n";
    }
    
    this._buildMessageHeaders();
    this._generateBodyStructure();
    
    // Compile header lines
    headers = this.compileHeaders(this._headers);
    
    if(!this._cacheOutput){
        this.emit("data", new Buffer(headers.join("\r\n")+"\r\n\r\n", "utf-8"));
    }else{
        this._outputBuffer += headers.join("\r\n")+"\r\n\r\n";
    }
};

/**
 * <p>Uses data from the <code>this._message</code> object to build headers</p>
 */
MailComposer.prototype._buildMessageHeaders = function(){

    // FROM
    if(this._message.from && this._message.from.length){
        [].concat(this._message.from).forEach((function(from){
            this.addHeader("From", from);
        }).bind(this));
    }
    
    // TO
    if(this._message.to && this._message.to.length){
        [].concat(this._message.to).forEach((function(to){
            this.addHeader("To", to);
        }).bind(this));
    }
    
    // CC
    if(this._message.cc && this._message.cc.length){
        [].concat(this._message.cc).forEach((function(cc){
            this.addHeader("Cc", cc);
        }).bind(this));
    }
    
    // BCC
    // By default not included, set options.keepBcc to true to keep
    if(this.options.keepBcc){
        if(this._message.bcc && this._message.bcc.length){
            [].concat(this._message.bcc).forEach((function(bcc){
                this.addHeader("Bcc", bcc);
            }).bind(this));
        }    
    }
    
    // REPLY-TO
    if(this._message.replyTo && this._message.replyTo.length){
        [].concat(this._message.replyTo).forEach((function(replyTo){
            this.addHeader("Reply-To", replyTo);
        }).bind(this));
    }
    
    // SUBJECT
    if(this._message.subject){
        this.addHeader("Subject", this._message.subject);
    }
};

/**
 * <p>Generates the structure (mime tree) of the body. This sets up multipart
 * structure, individual part headers, boundaries etc.</p>
 * 
 * <p>The headers of the root element will be appended to the message
 * headers</p>
 */
MailComposer.prototype._generateBodyStructure = function(){

    var tree = this._createMimeNode(), 
        currentNode, node,
        i, len;
    
    if(this._message.useMixed){
        
        node = this._createMimeNode();
        node.boundary = this._message.mixedBoundary;
        node.headers.push(["Content-Type", "multipart/mixed; boundary=\""+node.boundary+"\""]);
        
        if(currentNode){
            currentNode.childNodes.push(node);
            node.parentNode = currentNode;
        }else{
            tree = node;
        }
        currentNode = node;
    
    }
    
    if(this._message.useAlternative){
    
        node = this._createMimeNode();
        node.boundary = this._message.alternativeBoundary;
        node.headers.push(["Content-Type", "multipart/alternative; boundary=\""+node.boundary+"\""]);
        if(currentNode){
            currentNode.childNodes.push(node);
            node.parentNode = currentNode;
        }else{
            tree = node;
        }
        currentNode = node;
        
    }
    
    if(this._message.body){
        node = this._createTextComponent(this._message.body, "text/plain");
        if(currentNode){
            currentNode.childNodes.push(node);
            node.parentNode = currentNode;
        }else{
            tree = node;
        }
    }
    
    if(this._message.useRelated){
    
        node = this._createMimeNode();
        node.boundary = this._message.relatedBoundary;
        node.headers.push(["Content-Type", "multipart/related; boundary=\""+node.boundary+"\""]);
        if(currentNode){
            currentNode.childNodes.push(node);
            node.parentNode = currentNode;
        }else{
            tree = node;
        }
        currentNode = node;
        
    }
    
    if(this._message.html){
        node = this._createTextComponent(this._message.html, "text/html");
        if(currentNode){
            currentNode.childNodes.push(node);
            node.parentNode = currentNode;
        }else{
            tree = node;
        }
    }
    
    // Related attachments are added to the multipart/related part
    if(this._relatedAttachments && this._relatedAttachments){
        for(i=0, len = this._relatedAttachments.length; i<len; i++){
            node = this._createAttachmentComponent(this._relatedAttachments[i]);
            node.parentNode = currentNode;
            currentNode.childNodes.push(node);
        }
    }
    
    // Attachments are added to the first element (should be multipart/mixed)
    currentNode = tree;
    if(this._attachments && this._attachments.length){
        for(i=0, len = this._attachments.length; i<len; i++){
            node = this._createAttachmentComponent(this._attachments[i]);
            node.parentNode = currentNode;
            currentNode.childNodes.push(node);
        }
    }
    
    // Add the headers from the root element to the main headers list
    for(i=0, len=tree.headers.length; i<len; i++){
        this.addHeader(tree.headers[i][0], tree.headers[i][1]);
    }
    
    this._message.tree = tree;
};

/**
 * <p>Creates a mime tree node for a text component (plaintext, HTML)</p>
 * 
 * @param {String} text Text contents for the component
 * @param {String} [contentType="text/plain"] Content type for the text component
 * @return {Object} Mime tree node 
 */
MailComposer.prototype._createTextComponent = function(text, contentType){
    var node = this._createMimeNode();
    
    node.contentEncoding = (this.options.encoding || "quoted-printable").toLowerCase().trim();
    node.useTextType = true;
    
    contentType = [contentType || "text/plain"];
    contentType.push("charset=utf-8");
    
    if(["7bit", "8bit", "binary"].indexOf(node.contentEncoding)>=0){
        node.textFormat = "flowed";
        contentType.push("format=" + node.textFormat);
    }
    
    node.headers.push(["Content-Type", contentType.join("; ")]);
    node.headers.push(["Content-Transfer-Encoding", node.contentEncoding]);
    
    node.contents = text;
    
    return node;
};

/**
 * <p>Creates a mime tree node for a text component (plaintext, HTML)</p>
 * 
 * @param {Object} attachment Attachment info for the component
 * @return {Object} Mime tree node 
 */
MailComposer.prototype._createAttachmentComponent = function(attachment){
    var node = this._createMimeNode(),
        contentType = [attachment.contentType],
        contentDisposition = [attachment.contentDisposition || "attachment"],
        fileName;
    
    node.contentEncoding = "base64";
    node.useAttachmentType = true;
    
    if(attachment.fileName){
        fileName = this._encodeMimeWord(attachment.fileName, "Q", 1024).replace(/"/g,"\\\"");
        contentType.push("name=\"" +fileName+ "\"");
        contentDisposition.push("filename=\"" +fileName+ "\"");
    }
    
    node.headers.push(["Content-Type", contentType.join("; ")]);
    node.headers.push(["Content-Disposition", contentDisposition.join("; ")]);
    node.headers.push(["Content-Transfer-Encoding", node.contentEncoding]);
    
    if(attachment.cid){
        node.headers.push(["Content-Id", "<" + this._encodeMimeWord(attachment.cid) + ">"]);
    }
    
    if(attachment.contents){
        node.contents = attachment.contents;
    }else if(attachment.filePath){
        node.filePath = attachment.filePath;
        if(attachment.userAgent){
            node.userAgent = attachment.userAgent;
        }
    }else if(attachment.streamSource){
        node.streamSource = attachment.streamSource;
    }

    return node;
};

/**
 * <p>Creates an empty mime tree node</p>
 * 
 * @return {Object} Mime tree node
 */
MailComposer.prototype._createMimeNode = function(){
    return {
        childNodes: [],
        headers: [],
        parentNode: null
    };
};

/**
 * <p>Compiles headers object into an array of header lines. If needed, the
 * lines are folded</p>
 * 
 * @param {Object|Array} headers An object with headers in the form of
 *        <code>{key:value}</code> or <ocde>[[key, value]]</code> or
 *        <code>[{key:key, value: value}]</code>
 * @return {Array} A list of header lines. Can be joined with \r\n
 */
MailComposer.prototype.compileHeaders = function(headers){
    var headersArr = [], keys, key;

    if(Array.isArray(headers)){
        headersArr = headers.map(function(field){
            return mimelib.foldLine((field.key || field[0])+": "+(field.value || field[1]));
        });
    }else{
        keys = Object.keys(headers);
        for(var i=0, len = keys.length; i<len; i++){
            key = this._normalizeKey(keys[i]);
            
            headersArr = headersArr.concat([].concat(headers[key]).map(function(field){
                return mimelib.foldLine(key+": "+field);
            }));
        }
    }
    
    return headersArr;
};

/**
 * <p>Converts a structured mimetree into an one dimensional array of
 * components. This includes headers and multipart boundaries as strings,
 * textual and attachment contents are.</p>
 */
MailComposer.prototype._flattenMimeTree = function(){
    var flatTree = [];
    
    function walkTree(node, level){
        var contentObject = {};
        level = level || 0;
        
        // if not root element, include headers
        if(level){
            flatTree = flatTree.concat(this.compileHeaders(node.headers));
            flatTree.push('');
        }
        
        if(node.textFormat){
            contentObject.textFormat = node.textFormat;
        }
        
        if(node.contentEncoding){
            contentObject.contentEncoding = node.contentEncoding;
        }
        
        if(node.contents){
            contentObject.contents = node.contents;
        }else if(node.filePath){
            contentObject.filePath = node.filePath;
            if(node.userAgent){
                contentObject.userAgent = node.userAgent;
            }
        }else if(node.streamSource){
            contentObject.streamSource = node.streamSource;
        }
        
        if(node.contents || node.filePath || node.streamSource){
            flatTree.push(contentObject);
        }
        
        // walk children
        for(var i=0, len = node.childNodes.length; i<len; i++){
            if(node.boundary){
                flatTree.push("--"+node.boundary);
            }
            walkTree.call(this, node.childNodes[i], level+1);
        }
        if(node.boundary && node.childNodes.length){
            flatTree.push("--"+node.boundary+"--");
            flatTree.push('');
        }
    }
    
    walkTree.call(this, this._message.tree);
    
    if(flatTree.length && flatTree[flatTree.length-1]===''){
        flatTree.pop();
    }
    
    this._message.flatTree = flatTree;
};

/**
 * <p>Composes the e-mail body based on the previously generated mime tree</p>
 * 
 * <p>Assumes that the linebreak separating headers and contents is already 
 * sent</p>
 * 
 * <p>Emits 'data' events</p>
 */
MailComposer.prototype._composeBody = function(){
    var flatTree = this._message.flatTree,
        slice, isObject = false, isEnd = false,
        curObject;
    
    this._message.processingStart = this._message.processingStart || 0;
    this._message.processingPos = this._message.processingPos || 0;

    for(var len = flatTree.length; this._message.processingPos < len; this._message.processingPos++){
        
        isEnd = this._message.processingPos >= len-1;
        isObject = typeof flatTree[this._message.processingPos] == "object";
        
        if(isEnd || isObject){
            
            slice = flatTree.slice(this._message.processingStart, isEnd && !isObject?undefined:this._message.processingPos);
            if(slice && slice.length){
                if(!this._cacheOutput){
                    this.emit("data", new Buffer(slice.join("\r\n")+"\r\n", "utf-8"));
                }else{
                    this._outputBuffer += slice.join("\r\n")+"\r\n";
                }
            }
            
            if(isObject){
                curObject = flatTree[this._message.processingPos];
            
                this._message.processingPos++;
                this._message.processingStart = this._message.processingPos;
            
                this._emitDataElement(curObject, (function(){
                    if(!isEnd){
                        process.nextTick(this._composeBody.bind(this));
                    }else{
                        if(!this._cacheOutput){
                            this.emit("end");
                        }else{
                            this._processBufferedOutput();
                        }
                    }
                }).bind(this));
                
            }else if(isEnd){
                if(!this._cacheOutput){
                    this.emit("end");
                }else{
                    this._processBufferedOutput();
                }
            }
            break;
        }
        
    }
};

/**
 * <p>Emits a data event for a text or html body and attachments. If it is a 
 * file, stream it</p>
 * 
 * <p>If <code>this.options.escapeSMTP</code> is true, replace dots in the
 * beginning of a line with double dots - only valid for QP encoding</p>
 * 
 * @param {Object} element Data element descriptor
 * @param {Function} callback Callback function to run when completed
 */
MailComposer.prototype._emitDataElement = function(element, callback){
    
    var data = "";
    
    if(element.contents){
        switch(element.contentEncoding){
            case "quoted-printable":
                data = mimelib.encodeQuotedPrintable(element.contents);
                break;
            case "base64":
                data = new Buffer(element.contents, "utf-8").toString("base64").replace(/.{76}/g,"$&\r\n");
                break;
            case "7bit":
            case "8bit":
            case "binary":
            default:
                data = mimelib.foldLine(element.contents, 78, false, element.textFormat=="flowed");
                 //mimelib puts a long whitespace to the beginning of the lines
                data = data.replace(/^[ ]{7}/mg, "");
                break;
        }
        
        if(this.options.escapeSMTP){
            data = data.replace(/^\./gm,'..');
        }
        
        if(!this._cacheOutput){
            this.emit("data", new Buffer(data + "\r\n", "utf-8"));
        }else{
            this._outputBuffer += data + "\r\n";
        }
        process.nextTick(callback);
        return;
    }

    if(element.filePath){
        if(element.filePath.match(/^https?:\/\//)){
            this._serveStream(urlFetch(element.filePath, {userAgent: element.userAgent}), callback);
        }else{
            this._serveFile(element.filePath, callback);
        }
        return;
    }else if(element.streamSource){
        this._serveStream(element.streamSource, callback);
        return;
    }

    callback();
};

/**
 * <p>Pipes a file to the e-mail stream</p>
 * 
 * @param {String} filePath Path to the file
 * @param {Function} callback Callback function to run after completion
 */
MailComposer.prototype._serveFile = function(filePath, callback){
    fs.stat(filePath, (function(err, stat){
        if(err || !stat.isFile()){
            

            if(!this._cacheOutput){
                this.emit("data", new Buffer(new Buffer("<ERROR OPENING FILE>", 
                                "utf-8").toString("base64")+"\r\n", "utf-8"));
            }else{
                this._outputBuffer += new Buffer("<ERROR OPENING FILE>", 
                                "utf-8").toString("base64")+"\r\n";
            }
                                
            process.nextTick(callback);
            return;
        }
        
        var stream = fs.createReadStream(filePath);
        
        this._serveStream(stream, callback);
        
    }).bind(this));
};

/**
 * <p>Pipes a stream source to the e-mail stream</p>
 * 
 * <p>This function resumes the stream and starts sending 76 bytes long base64
 * encoded lines. To achieve this, the incoming stream is divded into
 * chunks of 57 bytes (57/3*4=76) to achieve exactly 76 byte long
 * base64</p>
 * 
 * @param {Object} stream Stream to be piped
 * @param {Function} callback Callback function to run after completion
 */
MailComposer.prototype._serveStream = function(stream, callback){
    var remainder = new Buffer(0);

    stream.on("error", (function(error){
        if(!this._cacheOutput){
            this.emit("data", new Buffer(new Buffer("<ERROR READING STREAM>", 
                            "utf-8").toString("base64")+"\r\n", "utf-8"));
        }else{
            this._outputBuffer += new Buffer("<ERROR READING STREAM>", 
                            "utf-8").toString("base64")+"\r\n";
        }
        process.nextTick(callback);
    }).bind(this));
    
    stream.on("data", (function(chunk){
        var data = "",
            len = remainder.length + chunk.length,
            remainderLength = len % 57, // we use 57 bytes as it composes
                                        // a 76 bytes long base64 string
            buffer = new Buffer(len);
        
        remainder.copy(buffer); // copy remainder into the beginning of the new buffer
        chunk.copy(buffer, remainder.length); // copy data chunk after the remainder
        remainder = buffer.slice(len - remainderLength); // create a new remainder
        
        data = buffer.slice(0, len - remainderLength).toString("base64").replace(/.{76}/g,"$&\r\n");
        
        if(data.length){
            if(!this._cacheOutput){
                this.emit("data", new Buffer(data.trim()+"\r\n", "utf-8"));
            }else{
                this._outputBuffer += data.trim()+"\r\n";
            }
        }
    }).bind(this));
    
    stream.on("end", (function(chunk){
        var data;
        
        // stream the remainder (if any)
        if(remainder.length){
            data = remainder.toString("base64").replace(/.{76}/g,"$&\r\n");
            if(!this._cacheOutput){
                this.emit("data", new Buffer(data.trim()+"\r\n", "utf-8"));
            }else{
                this._outputBuffer += data.trim()+"\r\n";
            }
        }
        process.nextTick(callback);
    }).bind(this));
    
    // resume streaming if paused
    stream.resume();
};

/**
 * <p>Processes buffered output and emits 'end'</p>
 */
MailComposer.prototype._processBufferedOutput = function(){
    var dkimSignature;
    
    if(this._dkim){        
        if((dkimSignature = DKIMSign(this._outputBuffer, this._dkim))){
            this.emit("data", new Buffer(dkimSignature+"\r\n", "utf-8"));
        }
    }
    
    this.emit("data", new Buffer(this._outputBuffer, "utf-8"));
    
    process.nextTick(this.emit.bind(this,"end"));
};

/* HELPER FUNCTIONS */

/**
 * <p>Normalizes a key name by cpitalizing first chars of words, except for 
 * custom keys (starting with "X-") that have only uppercase letters, which will 
 * not be modified.</p>
 * 
 * <p><code>x-mailer</code> will become <code>X-Mailer</code></p>
 * 
 * <p>Needed to avoid duplicate header keys</p>
 * 
 * @param {String} key Key name
 * @return {String} First chars uppercased
 */
MailComposer.prototype._normalizeKey = function(key){
    key = (key || "").toString().trim();
    
    // If only uppercase letters, leave everything as is
    if(key.match(/^X\-[A-Z0-9\-]+$/)){
        return key;
    }
    
    // Convert first letter upper case, others lower case 
    return key.
        toLowerCase().
        replace(/^\S|[\-\s]\S/g, function(c){
            return c.toUpperCase();
        }).
        replace(/^MIME\-/i, "MIME-").
        replace(/^DKIM\-/i, "DKIM-");
};

/**
 * <p>Tests if a string has high bit (UTF-8) symbols</p>
 * 
 * @param {String} str String to be tested for high bit symbols
 * @return {Boolean} true if high bit symbols were found
 */
MailComposer.prototype._hasUTFChars = function(str){
    var rforeign = /[^\u0000-\u007f]/;
    return !!rforeign.test(str);
};

/**
 * <p>Generates a boundary for multipart bodies</p>
 * 
 * @return {String} Boundary String
 */
MailComposer.prototype._generateBoundary = function(){
    // "_" is not allowed in quoted-printable and "?" not in base64
    return "----mailcomposer-?=_"+(++this._gencounter)+"-"+Date.now();
};

/**
 * <p>Converts a string to mime word format. If the length is longer than
 * <code>maxlen</code>, split it</p>
 * 
 * <p>If the string doesn't have any unicode characters return the original 
 * string instead</p>
 * 
 * @param {String} str String to be encoded
 * @param {String} encoding Either Q for Quoted-Printable or B for Base64
 * @param {Number} [maxlen] Optional length of the resulting string, whitespace will be inserted if needed
 * 
 * @return {String} Mime-word encoded string (if needed)
 */
MailComposer.prototype._encodeMimeWord = function(str, encoding, maxlen){
    
    // adjust maxlen by =?UTF-8?Q??=
    if(maxlen && maxlen>12){
        maxlen -= 12; 
    }
    
    encoding = (encoding || "Q").toUpperCase(); 
    if(this._hasUTFChars(str)){
        str = mimelib.encodeMimeWord(str, encoding);
        if(maxlen && str.length>maxlen){
            if(encoding=="Q"){
                return "=?UTF-8?Q?"+this._splitEncodedString(str.split("?")[3], maxlen).join("?= =?UTF-8?Q?")+"?=";
            }else{
                return "=?UTF-8?"+encoding+"?"+str.split("?")[3].replace(new RegExp(".{"+maxlen+"}","g"),"$&?= =?UTF-8?"+encoding+"?")+"?=";
            }
        }else{
            return str;
        }
    }else{
        return str;
    }
};

/**
 * <p>Splits a mime-encoded string</p>
 * 
 * @param {String} str Input string
 * @param {Number} maxlen Maximum line length
 * @return {Array} split string
 */
MailComposer.prototype._splitEncodedString = function(str, maxlen){
    var curLine, match, chr, done,
        lines = [];

    while(str.length){
        curLine = str.substr(0, maxlen);
        
        // move incomplete escaped char back to main
        if((match = curLine.match(/\=[0-9A-F]?$/i))){
            curLine = curLine.substr(0, match.index);
        }

        done = false;
        while(!done){
            done = true;
            // check if not middle of a unicode char sequence
            if((match = str.substr(curLine.length).match(/^\=([0-9A-F]{2})/i))){
                chr = parseInt(match[1], 16);
                // invalid sequence, move one char back anc recheck
                if(chr < 0xC2 && chr > 0x7F){
                    curLine = curLine.substr(0, curLine.length-3);
                    done = false;
                }
            }
        }

        if(curLine.length){
            lines.push(curLine);
        }
        str = str.substr(curLine.length);
    }

    return lines;
};


/**
 * <p>Resolves a mime type for a filename</p>
 * 
 * @param {String} filename Filename to check
 * @return {String} Corresponding mime type
 */
MailComposer.prototype._getMimeType = function(filename){
    var defaultMime = "application/octet-stream",
        extension = filename && filename.substr(filename.lastIndexOf(".")+1).trim().toLowerCase();
    return extension && mimelib.contentTypes[extension] || defaultMime;
};
});
define('mailcomposer',['./mailcomposer/lib/mailcomposer'], function (main) {
    return main;
});
/**
 *
 **/

define('rdimap/imapclient/util',[
    'exports'
  ],
  function(
    exports
  ) {

/**
 * Perform a binary search on an array to find the correct insertion point
 *  in the array for an item.  From deuxdrop; tested in
 *  deuxdrop's `unit-simple-algos.js` test.
 *
 * @return[Number]{
 *   The correct insertion point in the array, thereby falling in the inclusive
 *   range [0, arr.length].
 * }
 */
const bsearchForInsert = exports.bsearchForInsert =
    function bsearchForInsert(list, seekVal, cmpfunc) {
  if (!list.length)
    return 0;
  var low  = 0, high = list.length - 1,
      mid, cmpval;
  while (low <= high) {
    mid = low + Math.floor((high - low) / 2);
    cmpval = cmpfunc(seekVal, list[mid]);
    if (cmpval < 0)
      high = mid - 1;
    else if (cmpval > 0)
      low = mid + 1;
    else
      break;
  }
  if (cmpval < 0)
    return mid; // insertion is displacing, so use mid outright.
  else if (cmpval > 0)
    return mid + 1;
  else
    return mid;
};

var bsearchMaybeExists = exports.bsearchMaybeExists =
    function bsearchMaybeExists(list, seekVal, cmpfunc, aLow, aHigh) {
  var low  = ((aLow === undefined)  ? 0                 : aLow),
      high = ((aHigh === undefined) ? (list.length - 1) : aHigh),
      mid, cmpval;
  while (low <= high) {
    mid = low + Math.floor((high - low) / 2);
    cmpval = cmpfunc(seekVal, list[mid]);
    if (cmpval < 0)
      high = mid - 1;
    else if (cmpval > 0)
      low = mid + 1;
    else
      return mid;
  }
  return null;
};

exports.partitionMessagesByFolderId =
    function partitionMessagesByFolderId(messageNamers, onlyKeepMsgId) {
  var results = [], foldersToMsgs = {};
  for (var i = 0; i < messageNamers.length; i++) {
    var messageSuid = messageNamers[i].suid,
        idxLastSlash = messageSuid.lastIndexOf('/'),
        folderId = messageSuid.substring(0, idxLastSlash),
        // if we only want the UID, do so, but make sure to parse it as a #!
        useId = onlyKeepMsgId ? parseInt(messageSuid.substring(idxLastSlash+1))
                              : messageSuid;

    if (!foldersToMsgs.hasOwnProperty(folderId)) {
      var messages = [useId];
      results.push({
        folderId: folderId,
        messages: messages,
      });
      foldersToMsgs[folderId] = messages;
    }
    else {
      foldersToMsgs[folderId].push(useId);
    }
  }
  return results;
};

}); // end define
;
/**
 *
 **/

define('rdimap/imapclient/mailbridge',[
    'rdcommon/log',
    'mailcomposer',
    './util',
    'module',
    'exports'
  ],
  function(
    $log,
    $mailcomposer,
    $imaputil,
    $module,
    exports
  ) {
const bsearchForInsert = $imaputil.bsearchForInsert,
      bsearchMaybeExists = $imaputil.bsearchMaybeExists;

function toBridgeWireOn(x) {
  return x.toBridgeWire();
}

function cmpFolderMarkers(a, b) {
  var d = a[0].localeCompare(b[0]);
  if (d)
    return d;
  return a[1].localeCompare(b[1]);
}

/**
 * There is exactly one `MailBridge` instance for each `MailAPI` instance.
 * `same-frame-setup.js` is the only place that hooks them up together right
 * now.
 */
function MailBridge(universe) {
  this.universe = universe;

  this._LOG = LOGFAB.MailBridge(this, universe._LOG, null);
  /** @dictof[@key[handle] @value[BridgedViewSlice]]{ live slices } */
  this._slices = {};
  /** @dictof[@key[namespace] @value[@listof[BridgedViewSlice]]] */
  this._slicesByType = {
    accounts: [],
    identities: [],
    folders: [],
    headers: [],
  };
  // outstanding persistent objects that aren't slices. covers: composition
  this._pendingRequests = {};
  //
  this._lastUndoableOpPair = null;
}
exports.MailBridge = MailBridge;
MailBridge.prototype = {
  __sendMessage: function(msg) {
    throw new Error('This is supposed to get hidden by an instance var.');
  },

  __receiveMessage: function mb___receiveMessage(msg) {
    var implCmdName = '_cmd_' + msg.type;
    if (!(implCmdName in this)) {
      this._LOG.badMessageType(msg.type);
      return;
    }
    var rval = this._LOG.cmd(msg.type, this, this[implCmdName], msg);
  },

  _cmd_ping: function mb__cmd_ping(msg) {
    this.__sendMessage({
      type: 'pong',
      handle: msg.handle,
    });
  },

  _cmd_tryToCreateAccount: function mb__cmd_tryToCreateAccount(msg) {
    var self = this;
    this.universe.tryToCreateAccount(msg.details, function(good, account) {
        self.__sendMessage({
            type: 'tryToCreateAccountResults',
            handle: msg.handle,
            error: good ? null : 'generic-badness',
          });
      });
  },

  _cmd_viewAccounts: function mb__cmd_viewAccounts(msg) {
    var proxy = this._slices[msg.handle] =
          new SliceBridgeProxy(this, 'accounts', msg.handle);
    this._slicesByType['accounts'].push(proxy);
    var wireReps = this.universe.accounts.map(toBridgeWireOn);
    // send all the accounts in one go.
    proxy.sendSplice(0, 0, wireReps, true, false);
  },

  _cmd_viewSenderIdentities: function mb__cmd_viewSenderIdentities(msg) {
    var proxy = this._slices[msg.handle] =
          new SliceBridgeProxy(this, identities, msg.handle);
    this._slicesByType['identities'].push(proxy);
    var wireReps = this.universe.identities;
    // send all the identities in one go.
    proxy.sendSplice(0, 0, wireReps, true, false);
  },

  notifyFolderAdded: function(accountId, folderMeta) {
    var newMarker = [accountId, folderMeta.path];

    var slices = this._slicesByType['folders'];
    for (var i = 0; i < slices.length; i++) {
      var proxy = slices[i];
      var idx = bsearchForInsert(proxy.markers, newMarker, cmpFolderMarkers);
      proxy.sendSplice(idx, 0, [folderMeta], false, false);
      proxy.markers.splice(idx, 0, newMarker);
    }
  },

  notifyFolderRemoved: function(accountId, folderMeta) {
    var marker = [accountId, folderMeta.path];

    var slices = this._slicesByType['folders'];
    for (var i = 0; i < slices.length; i++) {
      var proxy = slices[i];

      var idx = bsearchMaybeExists(proxy.markers, marker, cmpFolderMarkers);
      if (idx === null)
        continue;
      proxy.sendSplice(idx, 1, [], false, false);
      proxy.markers.splice(idx, 1);
    }
  },

  _cmd_viewFolders: function mb__cmd_viewFolders(msg) {
    var proxy = this._slices[msg.handle] =
          new SliceBridgeProxy(this, 'folders', msg.handle);
    this._slicesByType['folders'].push(proxy);
    proxy.mode = msg.mode;
    proxy.argument = msg.argument;
    var markers = proxy.markers = [];

    var wireReps = [];

    function pushAccountFolders(acct) {
      for (var iFolder = 0; iFolder < acct.folders.length; iFolder++) {
        var folder = acct.folders[iFolder];
        wireReps.push(folder);
        markers.push([acct.id, folder.path]);
      }
    }

    if (msg.mode === 'account') {
      pushAccountFolders(
        this.universe.getAccountForAccountId(msg.argument));
    }
    else {
      var accounts = this.universe.accounts;

      for (var iAcct = 0; iAcct < accounts.length; iAcct++) {
        var acct = accounts[iAcct];
        wireReps.push(acct.toBridgeWire());
        markers.push([acct.id, '']);
        pushAccountFolders(acct);
      }
    }
    proxy.sendSplice(0, 0, wireReps, true, false);
  },

  _cmd_viewFolderMessages: function mb__cmd_viewFolderMessages(msg) {
    var proxy = this._slices[msg.handle] =
          new SliceBridgeProxy(this, 'headers', msg.handle);
    this._slicesByType['headers'].push(proxy);

    var account = this.universe.getAccountForFolderId(msg.folderId);
    account.sliceFolderMessages(msg.folderId, proxy);
  },

  _cmd_refreshHeaders: function mb__cmd_refreshHeaders(msg) {
    var proxy = this._slices[msg.handle];
    if (!proxy) {
      this._LOG.badSliceHandle(msg.handle);
      return;
    }
    proxy.__listener.refresh();
  },

  _cmd_killSlice: function mb__cmd_killSlice(msg) {
    var proxy = this._slices[msg.handle];
    if (!proxy) {
      this._LOG.badSliceHandle(msg.handle);
      return;
    }

    delete this._slices[msg.handle];
    var proxies = this._slicesByType[proxy._ns],
        idx = proxies.indexOf(proxy);
    proxies.splice(idx, 1);
    proxy.die();

    this.__sendMessage({
      type: 'sliceDead',
      handle: msg.handle,
    });
  },

  _cmd_getBody: function mb__cmd_getBody(msg) {
    var self = this;
    // map the message id to the folder storage
    var folderId = msg.suid.substring(0, msg.suid.lastIndexOf('/'));
    var folderStorage = this.universe.getFolderStorageForFolderId(folderId);
    folderStorage.getMessageBody(msg.suid, msg.date, function(bodyInfo) {
      self.__sendMessage({
        type: 'gotBody',
        handle: msg.handle,
        bodyInfo: bodyInfo,
      });
    });
  },

  //////////////////////////////////////////////////////////////////////////////
  // Message Mutation
  //
  // All mutations are told to the universe which breaks the modifications up on
  // a per-account basis.

  _cmd_modifyMessageTags: function mb__cmd_modifyMessageTags(msg) {
    // XXXYYY

    // - The mutations are written to the database for persistence (in case
    //   we fail to make the change in a timely fashion) and so that we can
    //   know enough to reverse the operation.
    // - Speculative changes are made to the headers in the database locally.

    var longtermIds = this.universe.modifyMessageTags(
      msg.opcode, msg.messages, msg.addTags, msg.removeTags);
    this.__sendMessage({
      type: 'mutationConfirmed',
      handle: msg.handle,
      longtermIds: longtermIds,
    });
  },

  _cmd_undo: function mb__cmd_undo(msg) {
    this.universe.undoMutation(msg.longtermIds);
  },

  //////////////////////////////////////////////////////////////////////////////
  // Composition

  _cmd_beginCompose: function mb__cmd_beginCompose(msg) {
    var req = this._pendingRequests[msg.handle] = {
      type: 'compose',
      // XXX draft persistence/saving to-do/etc.
      persistedFolder: null,
      persistedUID: null,
    };

    // - figure out the identity to use
    var account, identity;
    if (msg.mode === 'new' && msg.submode === 'folder')
      account = this.universe.getAccountForFolderId(msg.reference);
    else
      account = this.universe.getAccountForMessageSuid(msg.reference);

    identity = account.identities[0];

    this.__sendMessage({
      type: 'composeBegun',
      handle: msg.handle,
      identity: identity,
      subject: '',
      body: '',
      to: [],
      cc: [],
      bcc: [],
    });
  },

  /**
   * mailcomposer wants from/to/cc/bcc delivered basically like it will show
   * up in the e-mail, except it is fine with unicode.  So we convert our
   * (possibly) structured representation into a flattened representation.
   *
   * (mailcomposer will handle punycode and mime-word encoding as needed.)
   */
  _formatAddresses: function(nameAddrPairs) {
    var addrstrings = [];
    for (var i = 0; i < nameAddrPairs.length; i++) {
      var pair = nameAddrPairs[i];
      // support lazy people providing only an e-mail... or very careful
      // people who are sure they formatted things correctly.
      if (typeof(pair) === 'string') {
        addrstrings.push(pair);
      }
      else {
        addrstrings.push(
          '"' + pair.name.replace(/["']/g, '') + '" <' +
            pair.address + '>');
      }
    }

    return addrstrings.join(', ');
  },

  _cmd_doneCompose: function mb__cmd_doneCompose(msg) {
    if (msg.command === 'delete') {
      // XXX if we have persistedFolder/persistedUID, enqueue a delete of that
      // message and try and execute it.
      return;
    }

    var composer = new $mailcomposer.MailComposer(),
        wireRep = msg.state;
    var identity = this.universe.getIdentityForSenderIdentityId(
                     wireRep.senderId),
        account = this.universe.getAccountForSenderIdentityId(
                    wireRep.senderId);

    var body = wireRep.body;
    if (identity.signature) {
      if (body[body.length - 1] !== '\n')
        body += '\n';
      body += '-- \n' + identity.signature;
    }

    var messageOpts = {
      from: this._formatAddresses([identity]),
      subject: wireRep.subject,
      body: body
    };
    if (identity.replyTo)
      messageOpts.replyTo = identity.replyTo;
    if (wireRep.to && wireRep.to.length)
      messageOpts.to = this._formatAddresses(wireRep.to);
    if (wireRep.cc && wireRep.cc.length)
      messageOpts.cc = this._formatAddresses(wireRep.cc);
    if (wireRep.bcc && wireRep.bcc.length)
      messageOpts.bcc = this._formatAddresses(wireRep.bcc);
    composer.setMessageOption(messageOpts);

    if (wireRep.customHeaders) {
      for (var iHead = 0; iHead < wireRep.customHeaders.length; iHead += 2){
        composer.addHeader(wireRep.customHeaders[iHead],
                           wireRep.customHeaders[iHead+1]);
      }
    }
    composer.addHeader('User-Agent', 'Mozilla Gaia Email Client 0.1alpha');
    composer.addHeader('Date', new Date().toUTCString());
    // we're copying nodemailer here; we might want to include some more...
    var messageId =
      '<' + Date.now() + Math.random().toString(16).substr(1) + '@mozgaia>';

    composer.addHeader('Message-Id', messageId);

    if (msg.command === 'send') {
      var self = this;
      account.sendMessage(composer, function(err, badAddresses) {
        self.__sendMessage({
          type: 'sent',
          handle: msg.handle,
          err: err,
          badAddresses: badAddresses,
          messageId: messageId,
        });
      });
    }
    else { // (msg.command === draft)
      // XXX save drafts!
    }
  },

  //////////////////////////////////////////////////////////////////////////////
};

function SliceBridgeProxy(bridge, ns, handle) {
  this._bridge = bridge;
  this._ns = ns;
  this._handle = handle;
  this.__listener = null;
}
SliceBridgeProxy.prototype = {
  sendSplice: function sbp_sendSplice(index, howMany, addItems, requested,
                                      moreExpected) {
    this._bridge.__sendMessage({
      type: 'sliceSplice',
      handle: this._handle,
      index: index,
      howMany: howMany,
      addItems: addItems,
      requested: requested,
      moreExpected: moreExpected,
    });
  },

  sendUpdate: function sbp_sendUpdate(indexUpdatesRun) {
    this._bridge.__sendMessage({
      type: 'sliceUpdate',
      handle: this._handle,
      updates: indexUpdatesRun,
    });
  },

  sendStatus: function sbp_sendStatus(status, flushSplice) {
    if (flushSplice) {
      this.sendSplice(0, 0, [], true, false);
    }
  },

  die: function sbp_die() {
    if (this.__listener)
      this.__listener.die();
  },
};

var LOGFAB = exports.LOGFAB = $log.register($module, {
  MailBridge: {
    type: $log.DAEMON,
    events: {
    },
    TEST_ONLY_events: {
    },
    errors: {
      badMessageType: { type: true },
      badSliceHandle: { handle: true },
    },
    calls: {
      cmd: {command: true},
    },
    TEST_ONLY_calls: {
    },
  },
});

}); // end define
;
// asuth.

/**
 * ASCII-encoding tricks, particularly ordered-base64 encoding for
 * lexicographically ordered things like IndexedDB or 64-bit number support that
 * we can't use JS numbers for.
 *
 * The math logic is by me (asuth); hopefully it's not too embarassing.
 **/

define('rdimap/imapclient/a64',[
    'exports'
  ],
  function(
    exports
  ) {

/**
 * A lexicographically ordered base64 encoding.  Our two extra characters are {
 * and } because they are at the top of the ordering space and have a clear (to
 * JS coders) ordering which makes it tractable to eyeball an encoded value and
 * not be completely confused/misled.
 */
const ORDERED_ARBITRARY_BASE64_CHARS = [
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J',
  'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T',
  'U', 'V', 'W', 'X', 'Y', 'Z', 'a', 'b', 'c', 'd',
  'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n',
  'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x',
  'y', 'z', '{', '}'
];
/**
 * Zero padding to get us up to the maximum encoding length of a 64-bit value in
 * our encoding (11) or for decimal re-conversion (16).
 */
const ZERO_PADDING = '0000000000000000';

/**
 * Encode a JS int in our base64 encoding.
 */
function encodeInt(v, padTo) {
  var sbits = [];
  do {
    // note: bitwise ops are 32-bit only.
    // so, this is fine:
    sbits.push(ORDERED_ARBITRARY_BASE64_CHARS[v & 0x3f]);
    // but this can't be >>> 6 and has to be a divide.
    v = Math.floor(v / 64);
  } while (v > 0);
  sbits.reverse();
  var estr = sbits.join('');
  if (padTo && estr.length < padTo)
    return ZERO_PADDING.substring(0, padTo - estr.length) + estr;
  return estr;
}
exports.encodeInt = encodeInt;

/**
 * 10^14 >> 14 so that its 'lowest' binary 1 ends up in the one's place.  It
 * is encoded in 33 bits itself.
 */
const E10_14_RSH_14 = Math.pow(10, 14) / Math.pow(2, 14),
      P2_14 = Math.pow(2, 14),
      P2_22 = Math.pow(2, 22),
      P2_32 = Math.pow(2, 32),
      P2_36 = Math.pow(2, 36),
      MASK32 = 0xffffffff;

/**
 * Convert a decimal uint64 string to a compact string representation that can
 * be compared using our helper method `cmpUI64`.  We could do direct straight
 * string comparison if we were willing to pad all strings out to 11 characters,
 * but that's a lot of overhead considering that we expect a lot of our values
 * to be muuuuch smaller.  (Appropriate padding can be requested for cases
 * where the ordering is explicitly desired, like IndexedDB keys.  Just only
 * request as many bits as you really need!)
 *
 * JS can handle up to 2^53 reliably which means that for numbers larger than
 * that we will have to do a second parse.  For that to work (easily), we need
 * to pick a power of 10 to cut at where the smallest '1' in its binary encoding
 * is at least in the 14th bit so we can pre-shift off 13 bits so when we
 * multiply by 10 we don't go floating point, as it were.  (We also need to add
 * in the relevant bits from the lower parse appropriately shifted.)
 */
exports.parseUI64 = function p(s, padTo) {
  // 2^53 is 16 digits long, so any string shorter than that can be handled
  // by the built-in logic.
  if (s.length < 16) {
    return encodeInt(parseInt(s, 10));
  }

  var lowParse = parseInt(s.substring(s.length - 14), 10),
      highParse = parseInt(s.substring(0, s.length - 14), 10),
      // multiply the high parse by our scaled power of 10
      rawHighBits = highParse * E10_14_RSH_14;

  // Now lowParse's low 14 bits are valid, but everything above that needs to
  // be mixed (by addition) with rawHighBits.  We'll mix in 22 bits from
  // rawHighBits to get lowBits to 36 useful bits.  The main thing is to lop off
  // the higher bits in rawHighBits that we don't want so they don't go float.
  // We do want the 37rd bit if there was addition overflow to carry to the
  // upper calculation.
  var lowBitsAdded = (((rawHighBits % P2_36) * P2_14) % P2_36 +
                      lowParse % P2_36),
      lowBits = lowBitsAdded % P2_36,
      overflow = Math.floor(lowBitsAdded / P2_36) % 2;

  // We can lop off the low 22-bits of the high bits (since lowBits is taking
  // care of that) and combine that with the bits of low above 36.
  var highBits = Math.floor(rawHighBits / P2_22) +
                 Math.floor(lowParse / P2_36) + overflow;

  var outStr = encodeInt(highBits) + encodeInt(lowBits, 6);
  if (padTo && outStr.length < padTo)
    return ZERO_PADDING.substring(0, padTo - outStr.length) + outStr;
  return outStr;
};

exports.cmpUI64 = function(a, b) {
  // longer equals bigger!
  var c = a.length - b.length;
  if (c !== 0)
    return c;

  if (a < b)
    return -1;
  else if (a > b)
    return 1;
  return 0;
};

/**
 * Convert the output of `parseUI64` back into a decimal string.
 */
exports.decodeUI64 = function d(es) {
  var iNonZero = 0;
  for (;es.charCodeAt(iNonZero) === 48; iNonZero++) {
  }
  if (iNonZero)
    es = es.substring(iNonZero);

  var v, i;
  // 8 characters is 48 bits, JS can do that internally.
  if (es.length <= 8) {
    v = 0;
    for (i = 0; i < es.length; i++) {
      v = v * 64 + ORDERED_ARBITRARY_BASE64_CHARS.indexOf(es[i]);
    }
    return v.toString(10);
  }

  // upper-string gets 28 bits (that could hold 30), lower-string gets 36 bits.
  // This is how we did things in encoding is why.
  var ues = es.substring(0, es.length - 6), uv = 0,
      les = es.substring(es.length - 6), lv = 0;

  for (i = 0; i < ues.length; i++) {
    uv = uv * 64 + ORDERED_ARBITRARY_BASE64_CHARS.indexOf(ues[i]);
  }
  for (i = 0; i < les.length; i++) {
    lv = lv * 64 + ORDERED_ARBITRARY_BASE64_CHARS.indexOf(les[i]);
  }

  // Do the division to figure out the "high" string from our encoding (a whole
  // number.)  Then subtract that whole number off our effective number, leaving
  // us dealing with <53 bits so we can just hand it off to the JS engine.

  var rsh14val = (uv * P2_22 + Math.floor(lv / P2_14)),
      uraw = rsh14val / E10_14_RSH_14,
      udv = Math.floor(uraw),
      uds = udv.toString();

  var rsh14Leftover = rsh14val - udv * E10_14_RSH_14,
      lowBitsRemoved = rsh14Leftover * P2_14 + lv % P2_14;

  var lds = lowBitsRemoved.toString();
  if (lds.length < 14)
    lds = ZERO_PADDING.substring(0, 14 - lds.length) + lds;

  return uds + lds;
};
//d(p('10000000000000000'));
//d(p('18014398509481984'));
//d(p('1171221845949812801'));

}); // end define
;
/**
 * Simple coordination logic that might be better handled by promises, although
 * we probably have the edge in comprehensibility for now.
 **/

define('rdimap/imapclient/allback',[
    'exports'
  ],
  function(
    exports
  ) {

/**
 * Create multiple named callbacks whose results are aggregated and a single
 * callback invoked once all the callbacks have returned their result.  This
 * is intended to provide similar benefit to $Q.all in our non-promise world
 * while also possibly being more useful.
 *
 * Example:
 * @js{
 *   var callbacks = allbackMaker(['foo', 'bar'], function(aggrData) {
 *       console.log("Foo's result was", aggrData.foo);
 *       console.log("Bar's result was", aggrData.bar);
 *     });
 *   asyncFooFunc(callbacks.foo);
 *   asyncBarFunc(callbacks.bar);
 * }
 *
 * Protection against a callback being invoked multiple times is provided as
 * an anti-foot-shooting measure.  Timeout logic and other protection against
 * potential memory leaks is not currently provided, but could be.
 */
exports.allbackMaker = function allbackMaker(names, allDoneCallback) {
  var aggrData = {}, callbacks = {}, waitingFor = names.concat();

  names.forEach(function(name) {
    // (build a consistent shape for aggrData regardless of callback ordering)
    aggrData[name] = undefined;
    callbacks[name] = function anAllback(callbackResult) {
      var i = waitingFor.indexOf(name);
      if (i === -1) {
        console.error("Callback '" + name + "' fired multiple times!");
        throw new Error("Callback '" + name + "' fired multiple times!");
      }
      waitingFor.splice(i, 1);
      if (arguments.length > 1)
        aggrData[name] = arguments;
      else
        aggrData[name] = callbackResult;
      if (waitingFor.length === 0)
        allDoneCallback(aggrData);
    };
  });

  return callbacks;
};

}); // end define
;
/**
 *
 **/

define('rdimap/imapclient/imapdb',[
    'exports'
  ],
  function(
    exports
  ) {


var IndexedDB;
if (("IndexedDB" in window) && window.indexedDB) {
  IndexedDB = window.indexedDB;
}
else if (("mozIndexedDB" in window) && window.mozIndexedDB) {
  IndexedDB = window.mozIndexedDB;
}
else if (("webkitIndexedDB" in window) && window.webkitIndexedDB) {
  IndexedDB = window.webkitIndexedDB;
}
else {
  console.error("No IndexedDB!");
  throw new Error("I need IndexedDB; load me in a content page universe!");
}

const CUR_VERSION = 2;

/**
 * The configuration table contains configuration data that should persist
 * despite implementation changes. Global configuration data, and account login
 * info.  Things that would be annoying for us to have to re-type.
 */
const TBL_CONFIG = 'config',
      CONFIG_KEY_ROOT = 'config',
      // key: accountDef:`AccountId`
      CONFIG_KEYPREFIX_ACCOUNT_DEF = 'accountDef:';

/**
 * The folder-info table stores meta-data about the known folders for each
 * account.  This information may be blown away on upgrade.
 *
 * While we may eventually stash info like histograms of messages by date in
 * a folder, for now this is all about serving as a directory service for the
 * header and body blocks.  See `ImapFolderStorage` for the details of the
 * payload.
 *
 * All the folder info for each account is stored in a single object since we
 * keep it all in-memory for now.
 *
 * key: `AccountId`
 */
const TBL_FOLDER_INFO = 'folderInfo';

/**
 * Stores time-clustered information about messages in folders.  Message bodies
 * and attachment names are not included, but initial snippets and the presence
 * of attachments are.
 *
 * We store headers separately from bodies because our access patterns are
 * different for each.  When we want headers, all we want is headers, and don't
 * need the bodies clogging up our IO.  Additionally, we expect better
 * compression for bodies if they are stored together.
 *
 * key: `FolderId`:`BlockId`
 *
 * Each value is an object dictionary whose keys are either UIDs or a more
 * globally unique identifier (ex: gmail's X-GM-MSGID values).  The values are
 * the info on the message; see `ImapFolderStorage` for details.
 */
const TBL_HEADER_BLOCKS = 'headerBlocks';
/**
 * Stores time-clustered information about message bodies.  Body details include
 * the list of attachments, as well as the body payloads and the embedded inline
 * parts if they all met the sync heuristics.  (If we can't sync all the inline
 * images, for example, we won't sync any.)
 *
 * Note that body blocks are not paired with header blocks; their storage is
 * completely separate.
 *
 * key: `FolderId`:`BlockId`
 *
 * Each value is an object dictionary whose keys are either UIDs or a more
 * globally unique identifier (ex: gmail's X-GM-MSGID values).  The values are
 * the info on the message; see `ImapFolderStorage` for details.
 */
const TBL_BODY_BLOCKS = 'bodyBlocks';

/**
 * DB helper methods for Gecko's IndexedDB implementation.  We are assuming
 * the presence of the Mozilla-specific getAll helper right now.  Since our
 * app is also dependent on the existence of the TCP API that no one else
 * supports right now and we are assuming a SQLite-based IndexedDB
 * implementation, this does not seem too crazy.
 *
 * == Useful tidbits on our IndexedDB implementation
 *
 * - SQLite page size is 32k
 * - The data persisted to the database (but not Blobs AFAICS) gets compressed
 *   using snappy on a per-value basis.
 * - Blobs/files are stored as files on the file-system that are referenced by
 *   the data row.  Since they are written in one go, they are highly unlikely
 *   to be fragmented.
 * - Blobs/files are clever once persisted.  Specifically, nsDOMFileFile
 *   instances are created with just the knowledge of the file-path.  This means
 *   the data does not have to be marshaled, and it means that it can be
 *   streamed off the disk.  This is primarily beneficial in that if there is
 *   data we don't need to mutate, we can feed it directly to the web browser
 *   engine without potentially creating JS string garbage.
 *
 * Given the page size and snappy compression, we probably only want to spill to
 * a blob for non-binary data that exceeds 64k by a fair margin, and less
 * compressible binary data that is at least 64k.
 *
 */
function ImapDB() {
  this._db = null;
  this._onDB = [];

  /**
   * Fatal error handler.  This gets to be the error handler for all unexpected
   * error cases.
   */
  this._fatalError = function(event) {
    console.error('indexedDB error: ' + event.target.errorCode);
  };

  var openRequest = IndexedDB.open('b2g-email', CUR_VERSION), self = this;
  openRequest.onsuccess = function(event) {
    self._db = openRequest.result;
    for (var i = 0; i < self._onDB.length; i++) {
      self._onDB[i]();
    }
    self._onDB = null;
  };
  openRequest.onupgradeneeded = function(event) {
    var db = openRequest.result;

    // cost/benefit right now is total nuke.
    var existingNames = db.objectStoreNames;
    for (var i = 0; i < existingNames.length; i++) {
      db.deleteObjectStore(existingNames[i]);
    }

    db.createObjectStore(TBL_CONFIG);
    db.createObjectStore(TBL_FOLDER_INFO);
    db.createObjectStore(TBL_HEADER_BLOCKS);
    db.createObjectStore(TBL_BODY_BLOCKS);
  };
  openRequest.onerror = this._fatalError;
}
exports.ImapDB = ImapDB;
ImapDB.prototype = {
  close: function() {
    if (this._db) {
      this._db.close();
      this._db = null;
    }
  },

  getConfig: function(configCallback) {
    if (!this._db) {
      this._onDB.push(this.getConfig.bind(this, configCallback));
      return;
    }

    var transaction = this._db.transaction([TBL_CONFIG, TBL_FOLDER_INFO],
                                           'readonly');
    var configStore = transaction.objectStore(TBL_CONFIG),
        folderInfoStore = transaction.objectStore(TBL_FOLDER_INFO);

    // these will fire sequentially
    var configReq = configStore.getAll(),
        folderInfoReq = folderInfoStore.getAll();

    configReq.onerror = this._fatalError;
    // no need to track success, we can read it off folderInfoReq
    folderInfoReq.onerror = this._fatalError;
    folderInfoReq.onsuccess = function(event) {
      var configObj = null, accounts = [], i, obj;
      for (i = 0; i < configReq.result.length; i++) {
        obj = configReq.result[i];
        if (obj.id === 'config')
          configObj = obj;
        else
          accounts.push({def: obj, folderInfo: null});
      }
      for (i = 0; i < folderInfoReq.result.length; i++) {
        accounts[i].folderInfo = folderInfoReq.result[i];
      }

      try {
        configCallback(configObj, accounts);
      }
      catch(ex) {
        console.error('Problem in configCallback', ex, '\n', ex.stack);
      }
    };
  },

  saveConfig: function(config) {
    var req = this._db.transaction(TBL_CONFIG, 'readwrite')
                        .objectStore(TBL_CONFIG)
                        .put(config, 'config');
    req.onerror = this._fatalError;
  },

  /**
   * Save the addition of a new account or when changing account settings.  Only
   * pass `folderInfo` for the new account case; omit it for changing settings
   * so it doesn't get updated.  For coherency reasons it should only be updated
   * using saveAccountFolderStates.
   */
  saveAccountDef: function(config, accountDef, folderInfo) {
    var trans = this._db.transaction([TBL_CONFIG, TBL_FOLDER_INFO],
                                     'readwrite');

    var configStore = trans.objectStore(TBL_CONFIG);
    configStore.put(config, 'config');
    configStore.put(accountDef, CONFIG_KEYPREFIX_ACCOUNT_DEF + accountDef.id);
    if (folderInfo) {
      trans.objectStore(TBL_FOLDER_INFO)
           .put(folderInfo, accountDef.id);
    }
    trans.onerror = this._fatalError;
  },

  loadHeaderBlock: function(folderId, blockId, callback) {
    var req = this._db.transaction(TBL_HEADER_BLOCKS, 'readonly')
                         .objectStore(TBL_HEADER_BLOCKS)
                         .get(folderId + ':' + blockId);
    req.onerror = this._fatalError;
    req.onsuccess = function() {
      callback(req.result);
    };
  },

  loadBodyBlock: function(folderId, blockId, callback) {
    var req = this._db.transaction(TBL_BODY_BLOCKS, 'readonly')
                         .objectStore(TBL_BODY_BLOCKS)
                         .get(folderId + ':' + blockId);
    req.onerror = this._fatalError;
    req.onsuccess = function() {
      callback(req.result);
    };
  },

  /**
   * Coherently update the state of the folderInfo for an account plus all dirty
   * blocks at once in a single (IndexedDB and SQLite) commit. If we broke
   * folderInfo out into separate keys, we could do this on a per-folder basis
   * instead of per-account.  Revisit if performance data shows stupidity.
   *
   * @args[
   *   @param[accountId]
   *   @param[folderInfo]
   *   @param[perFolderStuff @listof[@dict[
   *     @key[id FolderId]
   *     @key[headerBlocks @dictof[@key[BlockId] @value[HeaderBlock]]]
   *     @key[bodyBlocks @dictof[@key[BlockID] @value[BodyBlock]]]
   *   ]]]
   * ]
   */
  saveAccountFolderStates: function(accountId, folderInfo, perFolderStuff,
                                    deletedFolderIds,
                                    callback, reuseTrans) {
    var trans = reuseTrans ||
      this._db.transaction([TBL_FOLDER_INFO, TBL_HEADER_BLOCKS,
                           TBL_BODY_BLOCKS],
                           'readwrite');
    trans.objectStore(TBL_FOLDER_INFO).put(folderInfo, accountId);
    var headerStore = trans.objectStore(TBL_HEADER_BLOCKS),
        bodyStore = trans.objectStore(TBL_BODY_BLOCKS), i;

    for (i = 0; i < perFolderStuff.length; i++) {
      var pfs = perFolderStuff[i], block;

      for (var headerBlockId in pfs.headerBlocks) {
        block = pfs.headerBlocks[headerBlockId];
        if (block)
          headerStore.put(block, pfs.id + ':' + headerBlockId);
        else
          headerStore.delete(pfs.id + ':' + headerBlockId);
      }

      for (var bodyBlockId in pfs.bodyBlocks) {
        block = pfs.bodyBlocks[bodyBlockId];
        if (block)
          bodyStore.put(block, pfs.id + ':' + bodyBlockId);
        else
          bodyStore.delete(pfs.id + ':' + bodyBlockId);
      }
    }

    if (deletedFolderIds) {
      for (i = 0; i < deletedFolderIds.length; i++) {
        var folderId = deletedFolderIds[i],
            range = IDBKeyRange.bound(folderId + ':',
                                      folderId + ':\ufffe',
                                      false, false)
        headerStore.delete(range);
        bodyStore.delete(range);
      }
    }

    if (callback)
      trans.addEventListener('complete', callback);

    return trans;
  },
};

}); // end define
;
define('mailparser/datetime',['require','exports','module'],function (require, exports, module) {
/* 
 * More info at: http://phpjs.org
 * 
 * This is version: 3.18
 * php.js is copyright 2010 Kevin van Zonneveld.
 * 
 * Portions copyright Brett Zamir (http://brett-zamir.me), Kevin van Zonneveld
 * (http://kevin.vanzonneveld.net), Onno Marsman, Theriault, Michael White
 * (http://getsprink.com), Waldo Malqui Silva, Paulo Freitas, Jonas Raoni
 * Soares Silva (http://www.jsfromhell.com), Jack, Philip Peterson, Ates Goral
 * (http://magnetiq.com), Legaev Andrey, Ratheous, Alex, Martijn Wieringa,
 * Nate, lmeyrick (https://sourceforge.net/projects/bcmath-js/), Philippe
 * Baumann, Enrique Gonzalez, Webtoolkit.info (http://www.webtoolkit.info/),
 * Ash Searle (http://hexmen.com/blog/), travc, Jani Hartikainen, Carlos R. L.
 * Rodrigues (http://www.jsfromhell.com), Ole Vrijenhoek, WebDevHobo
 * (http://webdevhobo.blogspot.com/), T.Wild,
 * http://stackoverflow.com/questions/57803/how-to-convert-decimal-to-hex-in-javascript,
 * pilus, GeekFG (http://geekfg.blogspot.com), Rafał Kukawski
 * (http://blog.kukawski.pl), Johnny Mast (http://www.phpvrouwen.nl), Michael
 * Grier, Erkekjetter, d3x, marrtins, Andrea Giammarchi
 * (http://webreflection.blogspot.com), stag019, mdsjack
 * (http://www.mdsjack.bo.it), Chris, Steven Levithan
 * (http://blog.stevenlevithan.com), Arpad Ray (mailto:arpad@php.net), David,
 * Joris, Tim de Koning (http://www.kingsquare.nl), Marc Palau, Michael White,
 * Public Domain (http://www.json.org/json2.js), gettimeofday, felix, Aman
 * Gupta, Pellentesque Malesuada, Thunder.m, Tyler Akins (http://rumkin.com),
 * Karol Kowalski, Felix Geisendoerfer (http://www.debuggable.com/felix),
 * Alfonso Jimenez (http://www.alfonsojimenez.com), Diplom@t
 * (http://difane.com/), majak, Mirek Slugen, Mailfaker
 * (http://www.weedem.fr/), Breaking Par Consulting Inc
 * (http://www.breakingpar.com/bkp/home.nsf/0/87256B280015193F87256CFB006C45F7),
 * Josh Fraser
 * (http://onlineaspect.com/2007/06/08/auto-detect-a-time-zone-with-javascript/),
 * Martin (http://www.erlenwiese.de/), Paul Smith, KELAN, Robin, saulius, AJ,
 * Oleg Eremeev, Steve Hilder, gorthaur, Kankrelune
 * (http://www.webfaktory.info/), Caio Ariede (http://caioariede.com), Lars
 * Fischer, Sakimori, Imgen Tata (http://www.myipdf.com/), uestla, Artur
 * Tchernychev, Wagner B. Soares, Christoph, nord_ua, class_exists, Der Simon
 * (http://innerdom.sourceforge.net/), echo is bad, XoraX
 * (http://www.xorax.info), Ozh, Alan C, Taras Bogach, Brad Touesnard, MeEtc
 * (http://yass.meetcweb.com), Peter-Paul Koch
 * (http://www.quirksmode.org/js/beat.html), T0bsn, Tim Wiel, Bryan Elliott,
 * jpfle, JT, Thomas Beaucourt (http://www.webapp.fr), David Randall, Frank
 * Forte, Eugene Bulkin (http://doubleaw.com/), noname, kenneth, Hyam Singer
 * (http://www.impact-computing.com/), Marco, Raphael (Ao RUDLER), Ole
 * Vrijenhoek (http://www.nervous.nl/), David James, Steve Clay, Jason Wong
 * (http://carrot.org/), T. Wild, Paul, J A R, LH, strcasecmp, strcmp, JB,
 * Daniel Esteban, strftime, madipta, Valentina De Rosa, Marc Jansen,
 * Francesco, Stoyan Kyosev (http://www.svest.org/), metjay, Soren Hansen,
 * 0m3r, Sanjoy Roy, Shingo, sankai, sowberry, hitwork, Rob, Norman "zEh"
 * Fuchs, Subhasis Deb, josh, Yves Sucaet, Ulrich, Scott Baker, ejsanders,
 * Nick Callen, Steven Levithan (stevenlevithan.com), Aidan Lister
 * (http://aidanlister.com/), Philippe Jausions
 * (http://pear.php.net/user/jausions), Zahlii, Denny Wardhana, Oskar Larsson
 * Högfeldt (http://oskar-lh.name/), Brian Tafoya
 * (http://www.premasolutions.com/), johnrembo, Gilbert, duncan, Thiago Mata
 * (http://thiagomata.blog.com), Alexander Ermolaev
 * (http://snippets.dzone.com/user/AlexanderErmolaev), Linuxworld, lmeyrick
 * (https://sourceforge.net/projects/bcmath-js/this.), Jon Hohle, Pyerre,
 * merabi, Saulo Vallory, HKM, ChaosNo1, djmix, Lincoln Ramsay, Adam Wallner
 * (http://web2.bitbaro.hu/), paulo kuong, jmweb, Orlando, kilops, dptr1988,
 * DxGx, Pedro Tainha (http://www.pedrotainha.com), Bayron Guevara, Le Torbi,
 * James, Douglas Crockford (http://javascript.crockford.com), Devan
 * Penner-Woelk, Jay Klehr, Kheang Hok Chin (http://www.distantia.ca/), Luke
 * Smith (http://lucassmith.name), Rival, Amir Habibi
 * (http://www.residence-mixte.com/), Blues (http://tech.bluesmoon.info/), Ben
 * Bryan, booeyOH, Dreamer, Cagri Ekin, Diogo Resende, Howard Yeend, Pul,
 * 3D-GRAF, jakes, Yannoo, Luke Godfrey, daniel airton wermann
 * (http://wermann.com.br), Allan Jensen (http://www.winternet.no), Benjamin
 * Lupton, davook, Atli Þór, Maximusya, Leslie Hoare, Bug?, setcookie, YUI
 * Library: http://developer.yahoo.com/yui/docs/YAHOO.util.DateLocale.html,
 * Blues at http://hacks.bluesmoon.info/strftime/strftime.js, Andreas,
 * Michael, Christian Doebler, Gabriel Paderni, Marco van Oort, Philipp
 * Lenssen, Arnout Kazemier (http://www.3rd-Eden.com), penutbutterjelly, Anton
 * Ongson, DtTvB (http://dt.in.th/2008-09-16.string-length-in-bytes.html),
 * meo, Greenseed, Yen-Wei Liu, mk.keck, William, rem, Jamie Beck
 * (http://www.terabit.ca/), Russell Walker (http://www.nbill.co.uk/),
 * Garagoth, Dino, Andrej Pavlovic, gabriel paderni, FGFEmperor, Scott Cariss,
 * Slawomir Kaniecki, ReverseSyntax, Mateusz "loonquawl" Zalega, Francois,
 * Kirk Strobeck, Billy, vlado houba, Jalal Berrami, date, Itsacon
 * (http://www.itsacon.net/), Martin Pool, Pierre-Luc Paour, ger, john
 * (http://www.jd-tech.net), mktime, Simon Willison
 * (http://simonwillison.net), Nick Kolosov (http://sammy.ru), marc andreu,
 * Arno, Nathan, Kristof Coomans (SCK-CEN Belgian Nucleair Research Centre),
 * Fox, nobbler, stensi, Matteo, Riddler (http://www.frontierwebdev.com/),
 * Tomasz Wesolowski, T.J. Leahy, rezna, Eric Nagel, Alexander M Beedie, baris
 * ozdil, Greg Frazier, Bobby Drake, Ryan W Tenney (http://ryan.10e.us), Tod
 * Gentille, Rafał Kukawski, FremyCompany, Manish, Cord, fearphage
 * (http://http/my.opera.com/fearphage/), Victor, Brant Messenger
 * (http://www.brantmessenger.com/), Matt Bradley, Luis Salazar
 * (http://www.freaky-media.com/), Tim de Koning, taith, Rick Waldron, Mick@el
 * 
 * Dual licensed under the MIT (MIT-LICENSE.txt)
 * and GPL (GPL-LICENSE.txt) licenses.
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 * IN NO EVENT SHALL KEVIN VAN ZONNEVELD BE LIABLE FOR ANY CLAIM, DAMAGES
 * OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
 * ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 * OTHER DEALINGS IN THE SOFTWARE.
 */ 
this.strtotime = function(str, now) {
    // http://kevin.vanzonneveld.net
    // +   original by: Caio Ariede (http://caioariede.com)
    // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // +      input by: David
    // +   improved by: Caio Ariede (http://caioariede.com)
    // +   improved by: Brett Zamir (http://brett-zamir.me)
    // +   bugfixed by: Wagner B. Soares
    // +   bugfixed by: Artur Tchernychev
    // %        note 1: Examples all have a fixed timestamp to prevent tests to fail because of variable time(zones)
    // *     example 1: strtotime('+1 day', 1129633200);
    // *     returns 1: 1129719600
    // *     example 2: strtotime('+1 week 2 days 4 hours 2 seconds', 1129633200);
    // *     returns 2: 1130425202
    // *     example 3: strtotime('last month', 1129633200);
    // *     returns 3: 1127041200
    // *     example 4: strtotime('2009-05-04 08:30:00');
    // *     returns 4: 1241418600
 
    var i, match, s, strTmp = '', parse = '';

    strTmp = str;
    strTmp = strTmp.replace(/\s{2,}|^\s|\s$/g, ' '); // unecessary spaces
    strTmp = strTmp.replace(/[\t\r\n]/g, ''); // unecessary chars

    if (strTmp == 'now') {
        return (new Date()).getTime()/1000; // Return seconds, not milli-seconds
    } else if (!isNaN(parse = Date.parse(strTmp))) {
        return (parse/1000);
    } else if (now) {
        now = new Date(now*1000); // Accept PHP-style seconds
    } else {
        now = new Date();
    }

    strTmp = strTmp.toLowerCase();

    var __is =
    {
        day:
        {
            'sun': 0,
            'mon': 1,
            'tue': 2,
            'wed': 3,
            'thu': 4,
            'fri': 5,
            'sat': 6
        },
        mon:
        {
            'jan': 0,
            'feb': 1,
            'mar': 2,
            'apr': 3,
            'may': 4,
            'jun': 5,
            'jul': 6,
            'aug': 7,
            'sep': 8,
            'oct': 9,
            'nov': 10,
            'dec': 11
        }
    };

    var process = function (m) {
        var ago = (m[2] && m[2] == 'ago');
        var num = (num = m[0] == 'last' ? -1 : 1) * (ago ? -1 : 1);

        switch (m[0]) {
            case 'last':
            case 'next':
                switch (m[1].substring(0, 3)) {
                    case 'yea':
                        now.setFullYear(now.getFullYear() + num);
                        break;
                    case 'mon':
                        now.setMonth(now.getMonth() + num);
                        break;
                    case 'wee':
                        now.setDate(now.getDate() + (num * 7));
                        break;
                    case 'day':
                        now.setDate(now.getDate() + num);
                        break;
                    case 'hou':
                        now.setHours(now.getHours() + num);
                        break;
                    case 'min':
                        now.setMinutes(now.getMinutes() + num);
                        break;
                    case 'sec':
                        now.setSeconds(now.getSeconds() + num);
                        break;
                    default:
                        var day;
                        if (typeof (day = __is.day[m[1].substring(0, 3)]) != 'undefined') {
                            var diff = day - now.getDay();
                            if (diff == 0) {
                                diff = 7 * num;
                            } else if (diff > 0) {
                                if (m[0] == 'last') {diff -= 7;}
                            } else {
                                if (m[0] == 'next') {diff += 7;}
                            }
                            now.setDate(now.getDate() + diff);
                        }
                }
                break;

            default:
                if (/\d+/.test(m[0])) {
                    num *= parseInt(m[0], 10);

                    switch (m[1].substring(0, 3)) {
                        case 'yea':
                            now.setFullYear(now.getFullYear() + num);
                            break;
                        case 'mon':
                            now.setMonth(now.getMonth() + num);
                            break;
                        case 'wee':
                            now.setDate(now.getDate() + (num * 7));
                            break;
                        case 'day':
                            now.setDate(now.getDate() + num);
                            break;
                        case 'hou':
                            now.setHours(now.getHours() + num);
                            break;
                        case 'min':
                            now.setMinutes(now.getMinutes() + num);
                            break;
                        case 'sec':
                            now.setSeconds(now.getSeconds() + num);
                            break;
                    }
                } else {
                    return false;
                }
                break;
        }
        return true;
    };

    match = strTmp.match(/^(\d{2,4}-\d{2}-\d{2})(?:\s(\d{1,2}:\d{2}(:\d{2})?)?(?:\.(\d+))?)?$/);
    if (match != null) {
        if (!match[2]) {
            match[2] = '00:00:00';
        } else if (!match[3]) {
            match[2] += ':00';
        }

        s = match[1].split(/-/g);

        for (i in __is.mon) {
            if (__is.mon[i] == s[1] - 1) {
                s[1] = i;
            }
        }
        s[0] = parseInt(s[0], 10);

        s[0] = (s[0] >= 0 && s[0] <= 69) ? '20'+(s[0] < 10 ? '0'+s[0] : s[0]+'') : (s[0] >= 70 && s[0] <= 99) ? '19'+s[0] : s[0]+'';
        return parseInt(this.strtotime(s[2] + ' ' + s[1] + ' ' + s[0] + ' ' + match[2])+(match[4] ? match[4]/1000 : ''), 10);
    }

    var regex = '([+-]?\\d+\\s'+
        '(years?|months?|weeks?|days?|hours?|min|minutes?|sec|seconds?'+
        '|sun\\.?|sunday|mon\\.?|monday|tue\\.?|tuesday|wed\\.?|wednesday'+
        '|thu\\.?|thursday|fri\\.?|friday|sat\\.?|saturday)'+
        '|(last|next)\\s'+
        '(years?|months?|weeks?|days?|hours?|min|minutes?|sec|seconds?'+
        '|sun\\.?|sunday|mon\\.?|monday|tue\\.?|tuesday|wed\\.?|wednesday'+
        '|thu\\.?|thursday|fri\\.?|friday|sat\\.?|saturday))'+
        '(\\sago)?';

    match = strTmp.match(new RegExp(regex, 'gi')); // Brett: seems should be case insensitive per docs, so added 'i'
    if (match == null) {
        return false;
    }

    for (i = 0; i < match.length; i++) {
        if (!process(match[i].split(' '))) {
            return false;
        }
    }

    return (now.getTime()/1000);
}
});
define('mailparser/streams',['require','exports','module','stream','util','mimelib','iconv','crypto'],function (require, exports, module) {
var Stream = require('stream').Stream,
    utillib = require('util'),
    mimelib = require('mimelib'),
    Iconv = require('iconv').Iconv,
    crypto = require('crypto');

module.exports.Base64Stream = Base64Stream;
module.exports.QPStream = QPStream;
module.exports.BinaryStream = BinaryStream;

function Base64Stream(){
    Stream.call(this);
    this.writable = true;
    
    this.checksum = crypto.createHash("md5");
    this.length = 0;
    
    this.current = "";
}
utillib.inherits(Base64Stream, Stream);

Base64Stream.prototype.write = function(data){
    this.handleInput(data);
    return true;
};

Base64Stream.prototype.end = function(data){
    this.handleInput(data);
    this.emit("end");
    return {
        length: this.length,
        checksum: this.checksum.digest("hex")
    };
};

Base64Stream.prototype.handleInput = function(data){
    if(!data || !data.length){
        return;
    }
    
    data = (data || "").toString("utf-8");
    
    var remainder = 0;
    this.current += data.replace(/[^\w\+\/=]/g,'');
    var buffer = new Buffer(this.current.substr(0, this.current.length - this.current.length % 4),"base64");
    if(buffer.length){
        this.length += buffer.length;
        this.checksum.update(buffer);
        this.emit("data", buffer);
    }
    this.current = (remainder=this.current.length % 4)?this.current.substr(- remainder):"";
};

function QPStream(charset){
    Stream.call(this);
    this.writable = true;
    
    this.checksum = crypto.createHash("md5");
    this.length = 0;
    
    this.charset = charset || "UTF-8";
    this.current = undefined;
}
utillib.inherits(QPStream, Stream);

QPStream.prototype.write = function(data){
    this.handleInput(data);
    return true;
};

QPStream.prototype.end = function(data){
    this.handleInput(data);
    this.flush();
    this.emit("end");
    return {
        length: this.length,
        checksum: this.checksum.digest("hex")
    };
};

QPStream.prototype.handleInput = function(data){
    if(!data || !data.length){
        return;
    }
    
    data = (data || "").toString("utf-8");
    
    if(typeof this.current !="string"){
        this.current = data;
    }else{
        this.current += "\r\n" + data;
    }
};

QPStream.prototype.flush = function(){
    var iconv, buffer = mimelib.decodeQuotedPrintable(this.current, false, this.charset);

    if(this.charset.toLowerCase() == "binary"){
        // do nothing
    }else if(this.charset.toLowerCase() != "utf-8"){
        iconv =  new Iconv('UTF-8', this.charset+"//TRANSLIT//IGNORE");
        buffer = iconv.convert(buffer);
    }else{
        buffer = new Buffer(buffer, "utf-8");
    }

    this.length += buffer.length;
    this.checksum.update(buffer);
    
    this.emit("data", buffer);
};

function BinaryStream(charset){
    Stream.call(this);
    this.writable = true;
    
    this.checksum = crypto.createHash("md5");
    this.length = 0;
    
    this.charset = charset || "UTF-8";
    this.current = "";
}
utillib.inherits(BinaryStream, Stream);

BinaryStream.prototype.write = function(data){
    if(data && data.length){
        this.length += data.length;
        this.checksum.update(data);
        this.emit("data", data);
    }
    return true;
};

BinaryStream.prototype.end = function(data){
    if(data && data.length){
        this.emit("data", data);
    }
    this.emit("end");
    return {
        length: this.length,
        checksum: this.checksum.digest("hex")
    };
};
});
define('mailparser/mailparser',['require','exports','module','stream','util','mimelib','./datetime','iconv','./streams','crypto'],function (require, exports, module) {

/**
 * @fileOverview This is the main file for the MailParser library to parse raw e-mail data
 * @author <a href="mailto:andris@node.ee">Andris Reinman</a>
 * @version 0.2.22
 */

var Stream = require('stream').Stream,
    utillib = require('util'),
    mimelib = require('mimelib'),
    datetime = require('./datetime'),
    Iconv = require('iconv').Iconv,
    Streams = require('./streams'),
    crypto = require('crypto');

// Expose to the world
module.exports.MailParser = MailParser;

// MailParser is a FSM - it is always in one of the possible states
var STATES = {
    header:   0x1,
    body:     0x2,
    finished: 0x3
};

/**
 * <p>Creates instance of MailParser which in turn extends Stream</p>
 * 
 * <p>Options object has the following properties:</p>
 * 
 * <ul>
 *   <li><b>debug</b> - if set to true print all incoming lines to console</li>
 *   <li><b>streamAttachments</b> - if set to true, stream attachments instead of including them</li>
 *   <li><b>unescapeSMTP</b> - if set to true replace double dots in the beginning of the file</li>
 *   <li><b>defaultCharset</b> - the default charset for text/plain, text/html content, if not set reverts to Latin-1
 *   <li><b>showAttachmentLinks</b></li> - if set to true, show inlined attachment links
 * </ul>
 * 
 * @constructor
 * @param {Object} [options] Optional options object
 */
function MailParser(options){
    
    // Make MailParser a Stream object
    Stream.call(this);
    this.writable = true;
    
    /** 
     * Options object
     * @public  */ this.options = options || {};
     
    /** 
     * Indicates current state the parser is in
     * @private */ this._state         = STATES.header;
    
    /** 
     * The remaining data from the previos chunk which is waiting to be processed
     * @private */ this._remainder     = "";
    
    /** 
     * The complete tree structure of the e-mail
     * @public  */ this.mimeTree       = this._createMimeNode();
    
    /** 
     * Current node of the multipart mime tree that is being processed
     * @private */ this._currentNode   = this.mimeTree;

    // default values for the root node
    this._currentNode.priority = "normal";
     
    /** 
     * An object of already used attachment filenames
     * @private */ this._fileNames     = {};
     
    /** 
     * An array of multipart nodes
     * @private */ this._multipartTree = [];
     
     
    /** 
     * Cache for iconv converter objects
     * @private */ this._iconv         = {};
     
    /**
     * This is the final mail structure object that is returned to the client
     * @public  */ this.mailData       = {};
     
    /** 
     * Line counter for debugging
     * @private */ this._lineCounter   = 0;
     
    /** 
     * Did the last chunk end with \r
     * @private */ this._lineFeed      = false;
   
   /** 
     * Is the "headers" event already emitted
     * @private */ this._headersSent   = false;
}
// inherit methods and properties of Stream
utillib.inherits(MailParser, Stream);

/**
 * <p>Writes a value to the MailParser stream<p>
 * 
 * @param {Buffer|String} chunk The data to be written to the MailParser stream
 * @param {String} [encoding] The encoding to be used when "chunk" is a string
 * @returns {Boolean} Returns true
 */
MailParser.prototype.write = function(chunk, encoding){
    if(typeof chunk == "string"){
        chunk = new Buffer(chunk, encoding);
    }
    
    if(chunk && chunk.length){
        this._remainder += chunk.toString("binary");
        process.nextTick(this._process.bind(this));
        return true;
    }else{
        return true;
    }
};

/**
 * <p>Terminates the MailParser stream</p> 
 * 
 * <p>If "chunk" is set, writes it to the Stream before terminating.</p>
 * 
 * @param {Buffer|String} chunk The data to be written to the MailParser stream
 * @param {String} [encoding] The encoding to be used when "chunk" is a string
 */
MailParser.prototype.end = function(chunk, encoding){
    if(typeof chunk == "string"){
        chunk = new Buffer(chunk, encoding);
    }
    
    if(this.options.debug && this._remainder){
        console.log("REMAINDER: "+this._remainder);
    }
    
    chunk = chunk && chunk.toString("binary") || "";
    
    // if the last chunk ended with \r and this one begins
    // with \n, it's a split line ending. Since the last \r
    // was already used, skip the \n
    if(this._lineFeed && chunk.charAt(0) == "\n"){
        chunk = chunk.substr(1);
    }
    this._lineFeed = chunk.substr(-1) == "\r";
    
    this._remainder += chunk;

    process.nextTick(this._process.bind(this, true));
};

/**
 * <p>Processes the data written to the MailParser stream</p>
 * 
 * <p>The data is split into lines and each line is processed individually. Last
 * line in the batch is preserved as a remainder since it is probably not a
 * complete line but just the beginning of it. The remainder is later prepended
 * to the next batch of data.</p>
 * 
 * @param {Boolean} [finalPart=false] if set to true indicates that this is the last part of the stream
 */
MailParser.prototype._process = function(finalPart){
    
    finalPart = !!finalPart;
    
    var lines = this._remainder.split(/\r?\n|\r/),
        line, i, len;
        
    if(!finalPart){
        this._remainder = lines.pop();
        // force line to 1MB chunks if needed 
        if(this._remainder.length>1048576){
            this._remainder = this._remainder.replace(/(.{1048576}(?!\r?\n|\r))/g,"$&\n");
        }
    }
    
    for(i=0, len=lines.length; i < len; i++){
        line = lines[i];
        
        if(this.options.unescapeSMTP && line.substr(0,2)==".."){
            line = line.substr(1);
        }
        
        if(this.options.debug){
            console.log("LINE " + (++this._lineCounter) + " ("+this._state+"): "+line);
        }
        
        if(this._state == STATES.header){
            if(this._processStateHeader(line) === true){
                continue;
            }
        }
        
        if(this._state == STATES.body){
            
            if(this._processStateBody(line) === true){
                continue;
            }
            
        }
    }
    
    if(finalPart){
        if(this._state == STATES.header && this._remainder){
            this._processStateHeader(this._remainder);
            if(!this._headersSent){
                this.emit("headers", this._currentNode.parsedHeaders);
                this._headersSent = true;
            }
        }
        if(this._currentNode.content || this._currentNode.stream){
            this._finalizeContents();
        }
        this._state = STATES.finished;
        process.nextTick(this._processMimeTree.bind(this));
    }
    
    
};

/**
 * <p>Processes a line while in header state</p>
 * 
 * <p>If header state ends and body starts, detect if the contents is an attachment
 * and create a stream for it if needed</p>
 * 
 * @param {String} line The contents of a line to be processed
 * @returns {Boolean} If state changes to body retuns true
 */
MailParser.prototype._processStateHeader = function(line){
    var boundary, i, len, attachment, 
        lastPos = this._currentNode.headers.length - 1,
        textContent = false, extension;

    // Check if the header endas and body starts
    if(!line.length){
        if(lastPos>=0){
            this._processHeaderLine(lastPos);
        }
        if(!this._headersSent){
            this.emit("headers", this._currentNode.parsedHeaders);
            this._headersSent = true;
        }
        
        this._state = STATES.body;
        
        // if there's unprocessed header data, do it now
        if(lastPos >= 0){
            this._processHeaderLine(lastPos);
        }
        
        // this is a very simple e-mail, no content type set
        if(!this._currentNode.parentNode && !this._currentNode.meta.contentType){
            this._currentNode.meta.contentType = "text/plain";
        }
        
        textContent = ["text/plain", "text/html"].indexOf(this._currentNode.meta.contentType || "") >= 0;
        
        // detect if this is an attachment or a text node (some agents use inline dispositions for text)
        if(textContent && (!this._currentNode.meta.contentDisposition || this._currentNode.meta.contentDisposition == "inline")){
            this._currentNode.attachment = false;
        }else if((!textContent || ["attachment", "inline"].indexOf(this._currentNode.meta.contentDisposition)>=0) && 
          !this._currentNode.meta.mimeMultipart){
            this._currentNode.attachment = true;
        }
        
        // handle attachment start
        if(this._currentNode.attachment){
            
            this._currentNode.checksum = crypto.createHash("md5");
            
            this._currentNode.meta.generatedFileName = this._generateFileName(this._currentNode.meta.fileName, this._currentNode.meta.contentType);
            
            extension = this._currentNode.meta.generatedFileName.split(".").pop().toLowerCase();
            
            // Update content-type if it's an application/octet-stream and file extension is available
            if(this._currentNode.meta.contentType == "application/octet-stream" && mimelib.contentTypes[extension]){
                this._currentNode.meta.contentType = mimelib.contentTypes[extension];
            }
            
            attachment = this._currentNode.meta;
            if(this.options.streamAttachments){
                if(this._currentNode.meta.transferEncoding == "base64"){
                    this._currentNode.stream = new Streams.Base64Stream();
                }else if(this._currentNode.meta.transferEncoding == "quoted-printable"){
                    this._currentNode.stream = new Streams.QPStream("binary");
                }else{
                    this._currentNode.stream = new Streams.BinaryStream();
                }
                attachment.stream = this._currentNode.stream;
                
                this.emit("attachment", attachment);
            }else{
                this._currentNode.content = undefined;
            }
        }
        
        return true;
    }
    
    // unfold header lines if needed
    if(line.match(/^\s+/) && lastPos>=0){
        this._currentNode.headers[lastPos] += " " + line.trim();
    }else{
        this._currentNode.headers.push(line.trim());
        if(lastPos>=0){
            // if a complete header line is received, process it
            this._processHeaderLine(lastPos);
        }
    }
    
    return false;
};

/**
 * <p>Processes a line while in body state</p>
 * 
 * @param {String} line The contents of a line to be processed
 * @returns {Boolean} If body ends return true
 */
MailParser.prototype._processStateBody = function(line){
    var i, len, node,
        nodeReady = false;
    
    // Handle multipart boundaries
    if(line.substr(0, 2) == "--"){
        for(i=0, len = this._multipartTree.length; i<len; i++){
            
            // check if a new element block starts
            if(line == "--" + this._multipartTree[i].boundary){
                
                if(this._currentNode.content || this._currentNode.stream){
                    this._finalizeContents();
                }
                
                node = this._createMimeNode(this._multipartTree[i].node);
                this._multipartTree[i].node.childNodes.push(node);
                this._currentNode = node;
                this._state = STATES.header;
                nodeReady = true;
                break;
            }else 
            // check if a multipart block ends
              if(line == "--" + this._multipartTree[i].boundary + "--"){
                
                if(this._currentNode.content || this._currentNode.stream){
                    this._finalizeContents();
                }
                
                if(this._multipartTree[i].node.parentNode){
                    this._currentNode = this._multipartTree[i].node.parentNode;
                }else{
                    this._currentNode = this._multipartTree[i].node;
                }
                this._state = STATES.body;
                nodeReady = true;
                break;
            }
        }
    }
    if(nodeReady){
        return true;
    }
    
    // handle text or attachment line
    if(["text/plain", "text/html"].indexOf(this._currentNode.meta.contentType || "")>=0 && 
      !this._currentNode.attachment){
        this._handleTextLine(line);
    }else if(this._currentNode.attachment){
        this._handleAttachmentLine(line);
    }
    
    return false;
};

/**
 * <p>Processes a complete unfolded header line</p>
 * 
 * <p>Processes a line from current node headers array and replaces its value.
 * Input string is in the form of "X-Mailer: PHP" and its replacement would be
 * an object <code>{key: "x-mailer", value: "PHP"}</code></p>
 * 
 * <p>Additionally node meta object will be filled also, for example with data from
 * To: From: Cc: etc fields.</p>
 * 
 * @param {Number} pos Which header element (from an header lines array) should be processed
 */
MailParser.prototype._processHeaderLine = function(pos){
    var key, value, parts, line;
    
    pos = pos || 0;
    
    if(!(line = this._currentNode.headers[pos]) || typeof line != "string"){
        return;
    }

    parts = line.split(":");
    
    key = parts.shift().toLowerCase().trim();
    value = parts.join(":").trim();
    
    switch(key){
        case "content-type":
            this._parseContentType(value);
            break;
        case "mime-version":
            this._currentNode.useMIME = true;
            break;
        case "date":
            this._currentNode.meta.date = new Date(datetime.strtotime(value)*1000 || Date.now());
            break;
        case "to":
            if(this._currentNode.to && this._currentNode.to.length){
                this._currentNode.to = this._currentNode.to.concat(mimelib.parseAddresses(value));
            }else{
                this._currentNode.to = mimelib.parseAddresses(value);
            }
            break;
        case "from":
            if(this._currentNode.from && this._currentNode.from.length){
                this._currentNode.from = this._currentNode.from.concat(mimelib.parseAddresses(value));
            }else{
                this._currentNode.from = mimelib.parseAddresses(value);
            }
            break;
        case "cc":
            if(this._currentNode.cc && this._currentNode.cc.length){
                this._currentNode.cc = this._currentNode.cc.concat(mimelib.parseAddresses(value));
            }else{
                this._currentNode.cc = mimelib.parseAddresses(value);
            }
            break;
        case "bcc":
            if(this._currentNode.bcc && this._currentNode.bcc.length){
                this._currentNode.bcc = this._currentNode.bcc.concat(mimelib.parseAddresses(value));
            }else{
                this._currentNode.bcc = mimelib.parseAddresses(value);
            }
            break;
        case "x-priority":
        case "x-msmail-priority":
        case "importance":
            value = this._parsePriority(value);
            this._currentNode.priority = value;
            break;
        case "message-id":
            this._currentNode.meta.messageId = this._trimQuotes(value);
            break;
        case "references":
            this._currentNode.meta.messageReferences = this._trimQuotes(value);
            break;
        case "in-reply-to":
            this._currentNode.meta.inReplyTo = this._trimQuotes(value);
            break;
        case "thread-index":
            this._currentNode.meta.threadIndex = value;
            break;
        case "content-transfer-encoding":
            this._currentNode.meta.transferEncoding = value.toLowerCase();
            break;
        case "subject":
            this._currentNode.subject = this._encodeString(value);
            break;
        case "content-disposition":
            this._parseContentDisposition(value);
            break;
        case "content-id":
            this._currentNode.meta.contentId = this._trimQuotes(value);
            break;
    }
    
    if(this._currentNode.parsedHeaders[key]){
        if(!Array.isArray(this._currentNode.parsedHeaders[key])){
            this._currentNode.parsedHeaders[key] = [this._currentNode.parsedHeaders[key]];
        } 
        this._currentNode.parsedHeaders[key].push(this._replaceMimeWords(value));
    }else{
        this._currentNode.parsedHeaders[key] = this._replaceMimeWords(value);
    }
    
    this._currentNode.headers[pos] = {key: key, value: value};
};

/**
 * <p>Creates an empty node element for the mime tree</p>
 * 
 * <p>Created element includes parentNode property and a childNodes array. This is
 * needed to later walk the whole mime tree</p>
 * 
 * @param {Object} [parentNode] the parent object for the created node
 * @returns {Object} node element for the mime tree
 */
MailParser.prototype._createMimeNode = function(parentNode){
    var node = {
        parentNode: parentNode || this._currentNode || null,
        headers: [],
        parsedHeaders:{},
        meta: {},
        childNodes: []
    };
    
    return node;
};

/**
 * <p>Splits a header value into key-value pairs</p>
 * 
 * <p>Splits on <code>;</code> - the first value will be set as <code>defaultValue</code> property and will
 * not be handled, others will be split on <code>=</code> to key-value pairs</p>
 * 
 * <p>For example <code>content-type: text/plain; charset=utf-8</code> will become:</p>
 * 
 * <pre>
 * {
 *     defaultValue: "text/plain",
 *     charset: "utf-8"
 * }
 * </pre>
 * 
 * @param {String} value A string to be splitted into key-value pairs
 * @returns {Object} a key-value object, with defaultvalue property
 */
MailParser.prototype._parseHeaderLineWithParams = function(value){
    var key, parts, returnValue = {};
    
    parts = value.split(";");
    returnValue.defaultValue = parts.shift().toLowerCase();
    
    for(var i=0, len = parts.length; i<len; i++){
        value = parts[i].split("=");
        key = value.shift().trim().toLowerCase();
        value = value.join("=").trim();
        
        // trim quotes
        value = this._trimQuotes(value);
        returnValue[key] = value;
    }
    
    return returnValue;
};

/**
 * <p>Parses a Content-Type header field value</p>
 * 
 * <p>Fetches additional properties from the content type (charset etc.) and fills
 * current node meta object with this data</p>
 * 
 * @param {String} value Content-Type string
 * @returns {Object} parsed contenttype object
 */
MailParser.prototype._parseContentType = function(value){
    var fileName;
    value = this._parseHeaderLineWithParams(value);
    if(value){
        if(value.defaultValue){
            value.defaultValue = value.defaultValue.toLowerCase();
            this._currentNode.meta.contentType = value.defaultValue;
            if(value.defaultValue.substr(0,"multipart/".length)=="multipart/"){
                this._currentNode.meta.mimeMultipart = value.defaultValue.substr("multipart/".length);
            }
        }else{
            this._currentNode.meta.contentType = "application/octet-stream";
        }
        if(value.charset){
            value.charset = value.charset.toLowerCase();
            if(value.charset.substr(0,4)=="win-"){
                value.charset = "windows-"+value.charset.substr(4); 
            }else if(value.charset.match(/^utf\d/)){
                value.charset = "utf-"+value.charset.substr(3);
            }else if(value.charset.match(/^latin[\-_]?\d/)){
                value.charset = "iso-8859-"+value.charset.replace(/\D/g,""); 
            }else if(value.charset.match(/^(us\-)?ascii$/)){
                value.charset = "utf-8"; 
            }  
            this._currentNode.meta.charset = value.charset;
        }
        if(value.format){
            this._currentNode.meta.textFormat = value.format.toLowerCase();
        }
        if(value.delsp){
            this._currentNode.meta.textDelSp = value.delsp.toLowerCase();
        }
        if(value.boundary){
            this._currentNode.meta.mimeBoundary = value.boundary;
        }
        
        if(!this._currentNode.meta.fileName && (fileName = this._detectFilename(value))){
            this._currentNode.meta.fileName = fileName;
        }
        
        if(value.boundary){
            this._currentNode.meta.mimeBoundary = value.boundary;
            this._multipartTree.push({
                boundary: value.boundary,
                node: this._currentNode
            });
        }
    } 
    return value;
};

/**
 * <p>Parses file name from a Content-Type or Content-Disposition field</p>
 * 
 * <p>Supports <a href="http://tools.ietf.org/html/rfc2231">RFC2231</a> for
 * folded filenames</p>
 * 
 * @param {Object} value Parsed Content-(Type|Disposition) object
 * @return {String} filename
 */
MailParser.prototype._detectFilename = function(value){
    var fileName="", i=0, parts, encoding, name;
    
    if(value.name){
        return this._replaceMimeWords(value.name);
    }
    
    if(value.filename){
        return this._replaceMimeWords(value.filename);
    }
    
    // RFC2231
    if(value["name*"]){
        fileName = value["name*"];
    }else if(value["filename*"]){
        fileName = value["filename*"];
    }else if(value["name*0*"]){
        while(value["name*"+(i)+"*"]){
            fileName += value["name*"+(i++)+"*"];
        }
    }else if(value["filename*0*"]){
        while(value["filename*"+(i)+"*"]){
            fileName += value["filename*"+(i++)+"*"];
        }
    }
    
    if(fileName){
        parts = fileName.split("'");
        encoding = parts.shift();
        name = parts.pop();
        if(name){
            return this._replaceMimeWords(this._replaceMimeWords("=?"+(encoding || "us-ascii")+"?Q?" + name.replace(/%/g,"=")+"?="));
        }
    }
    return "";
};

/**
 * <p>Parses Content-Disposition header field value</p>
 * 
 * <p>Fetches filename to current node meta object</p>
 * 
 * @param {String} value A Content-Disposition header field
 */
MailParser.prototype._parseContentDisposition = function(value){
    var returnValue = {},
        fileName;
    
    value = this._parseHeaderLineWithParams(value);
    
    if(value){
        if(value.defaultValue){
            this._currentNode.meta.contentDisposition = value.defaultValue.trim().toLowerCase();
        }
        if((fileName = this._detectFilename(value))){
            this._currentNode.meta.fileName = fileName;
        }
    }
};

/**
 * <p>Parses the priority of the e-mail</p>
 * 
 * @param {String} value The priority value
 * @returns {String} priority string low|normal|high
 */
MailParser.prototype._parsePriority = function(value){
    value = value.toLowerCase().trim();
    if(!isNaN(parseInt(value,10))){ // support "X-Priority: 1 (Highest)"
        value = parseInt(value, 10) || 0;
        if(value == 3){
            return "normal";
        }else if(value > 3){
            return "low";
        }else{
            return "high";
        }
    }else{
        switch(value){
            case "non-urgent":
            case "low":
                return "low";
            case "urgent":
            case "hight":
                return "high";
        }
    }
    return "normal";
};

/**
 * <p>Processes a line in text/html or text/plain node</p>
 * 
 * <p>Append the line to the content property</p>
 * 
 * @param {String} line A line to be processed 
 */
MailParser.prototype._handleTextLine = function(line){
    
    if(["quoted-printable", "base64"].indexOf(this._currentNode.meta.transferEncoding)>=0 || this._currentNode.meta.textFormat != "flowed"){
        if(typeof this._currentNode.content != "string"){
            this._currentNode.content = line;
        }else{
            this._currentNode.content += "\n"+line;
        }
    }else{
        if(typeof this._currentNode.content != "string"){
            this._currentNode.content = line;
        }else if(this._currentNode.content.match(/[ ]{1,}$/)){
            if(this._currentNode.meta.textDelSp == "yes"){
                this._currentNode.content = this._currentNode.content.replace(/\s+$/,"");
            }
            this._currentNode.content += line;
        }else{
            this._currentNode.content += "\n"+line;
        }
    }  
};

/**
 * <p>Processes a line in an attachment node</p>
 * 
 * <p>If a stream is set up for the attachment write the line to the
 * stream as a Buffer object, otherwise append it to the content property</p>
 * 
 * @param {String} line A line to be processed 
 */
MailParser.prototype._handleAttachmentLine = function(line){
    if(!this._currentNode.attachment){
        return;
    }
    if(this._currentNode.stream){
        if(!this._currentNode.streamStarted){
            this._currentNode.streamStarted = true;
            this._currentNode.stream.write(new Buffer(line, "binary"));
        }else{
            this._currentNode.stream.write(new Buffer("\r\n"+line, "binary"));
        }
    }else if("content" in this._currentNode){
        if(typeof this._currentNode.content!="string"){
            this._currentNode.content = line;
        }else{
            this._currentNode.content += "\r\n" + line;
        }
    }
};

/**
 * <p>Finalizes a node processing</p>
 * 
 * <p>If the node is a text/plain or text/html, convert it to UTF-8 encoded string
 * If it is an attachment, convert it to a Buffer or if an attachment stream is
 * set up, close the stream</p>
 */
MailParser.prototype._finalizeContents = function(){
    var streamInfo;

    if(this._currentNode.content){
        
        if(!this._currentNode.attachment){
            
            if(this._currentNode.meta.contentType == "text/html"){
                 this._currentNode.meta.charset = this._detectHTMLCharset(this._currentNode.content) || this._currentNode.meta.charset || this.options.defaultCharset || "iso-8859-1";
            }
            
            if(this._currentNode.meta.transferEncoding == "quoted-printable"){
                this._currentNode.content = mimelib.decodeQuotedPrintable(this._currentNode.content, false, this._currentNode.meta.charset || this.options.defaultCharset || "iso-8859-1");
            }else if(this._currentNode.meta.transferEncoding == "base64"){
                this._currentNode.content = mimelib.decodeBase64(this._currentNode.content, this._currentNode.meta.charset || this.options.defaultCharset || "iso-8859-1");
            }else{
                this._currentNode.content = this._encodeString(this._currentNode.content);
            }
        }else{
            if(this._currentNode.meta.transferEncoding == "quoted-printable"){
                this._currentNode.content = mimelib.decodeQuotedPrintable(this._currentNode.content, false, "binary");
            }else if(this._currentNode.meta.transferEncoding == "base64"){
                this._currentNode.content = new Buffer(this._currentNode.content.replace(/[^\w\+\/=]/g,''), "base64");
            }else{
                this._currentNode.content = new Buffer(this._currentNode.content, "binary");
            }
            this._currentNode.checksum.update(this._currentNode.content);
            this._currentNode.meta.checksum = this._currentNode.checksum.digest("hex");
            this._currentNode.meta.length = this._currentNode.content.length;
        }
        
    }

    if(this._currentNode.stream){
        streamInfo = this._currentNode.stream.end() || {};
        if(streamInfo.checksum){
            this._currentNode.meta.checksum = streamInfo.checksum;
        }
        if(streamInfo.length){
            this._currentNode.meta.length = streamInfo.length;
        }
    }
};

/**
 * <p>Processes the mime tree</p>
 * 
 * <p>Finds text parts and attachments from the tree. If there's several text/plain
 * or text/html parts, push the ones from the lower parts of the tree to the
 * alternatives array</p>
 * 
 * <p>Emits "end" when finished</p>
 */
MailParser.prototype._processMimeTree = function(){
    var level = 0, htmlLevel, textLevel,
        returnValue = {}, i, len;
    
    this.mailData = {html:[], text:[], alternatives:[], attachments:[]};
    
    if(!this.mimeTree.meta.mimeMultipart){
        this._processMimeNode(this.mimeTree, 0);
    }else{
        this._walkMimeTree(this.mimeTree);
    }
    
    if(this.mailData.html.length){
        for(i=0, len=this.mailData.html.length; i<len; i++){
            if(!returnValue.html || this.mailData.html[i].level < htmlLevel){
                if(returnValue.html){
                    if(!returnValue.alternatives){
                        returnValue.alternatives = [];
                    }
                    returnValue.alternatives.push({
                        contentType: "text/html",
                        content: returnValue.html
                    });
                }
                htmlLevel = this.mailData.html[i].level;
                returnValue.html = this.mailData.html[i].content;
            }else{
                if(!returnValue.alternatives){
                    returnValue.alternatives = [];
                }
                returnValue.alternatives.push({
                    contentType: "text/html",
                    content: this.mailData.html[i].content
                });
            }
        }
    }
    
    if(this.mailData.text.length){
        for(i=0, len=this.mailData.text.length; i<len; i++){
            if(!returnValue.text || this.mailData.text[i].level < textLevel){
                if(returnValue.text){
                    if(!returnValue.alternatives){
                        returnValue.alternatives = [];
                    }
                    returnValue.alternatives.push({
                        contentType: "text/plain",
                        content: returnValue.text
                    });
                }
                textLevel = this.mailData.text[i].level;
                returnValue.text = this.mailData.text[i].content;
            }else{
                if(!returnValue.alternatives){
                    returnValue.alternatives = [];
                }
                returnValue.alternatives.push({
                    contentType: "text/plain",
                    content: this.mailData.text[i].content
                });
            }
        }
    }
    
    returnValue.headers = this.mimeTree.parsedHeaders;
    
    if(this.mimeTree.subject){
        returnValue.subject = this.mimeTree.subject;        
    }
    
    if(this.mimeTree.priority){
        returnValue.priority = this.mimeTree.priority;        
    }
    
    if(this.mimeTree.from){
        returnValue.from = this.mimeTree.from;        
    }
    
    if(this.mimeTree.to){
        returnValue.to = this.mimeTree.to;        
    }
    
    if(this.mimeTree.cc){
        returnValue.cc = this.mimeTree.cc;        
    }
    
    if(this.mimeTree.bcc){
        returnValue.bcc = this.mimeTree.bcc;        
    }
    
    if(this.mailData.attachments.length){
        returnValue.attachments = [];
        for(i=0, len=this.mailData.attachments.length; i<len; i++){
            returnValue.attachments.push(this.mailData.attachments[i].content);
        }
    }

    process.nextTick(this.emit.bind(this, "end", returnValue));
};

/**
 * <p>Walks the mime tree and runs processMimeNode on each node of the tree</p>
 * 
 * @param {Object} node A mime tree node
 * @param {Number} [level=0] current depth
 */
MailParser.prototype._walkMimeTree = function(node, level){
    level = level || 1;
    for(var i=0, len = node.childNodes.length; i<len; i++){
        this._processMimeNode(node.childNodes[i], level, node.meta.mimeMultipart);
        this._walkMimeTree(node.childNodes[i], level+1);
    }
};

/**
 * <p>Processes of a node in the mime tree</p>
 * 
 * <p>Pushes the node into appropriate <code>this.mailData</code> array (<code>text/html</code> to <code>this.mailData.html</code> array etc)</p>
 * 
 * @param {Object} node A mime tree node
 * @param {Number} [level=0] current depth
 * @param {String} mimeMultipart Type of multipart we are dealing with (if any)
 */
MailParser.prototype._processMimeNode = function(node, level, mimeMultipart){
    var i, len;
    
    level = level || 0;

    if(!node.attachment){
        switch(node.meta.contentType){
            case "text/html":
                if(mimeMultipart == "mixed" && this.mailData.html.length){
                    for(i=0, len = this.mailData.html.length; i<len; i++){
                        if(this.mailData.html[i].level == level){
                            this._joinHTMLNodes(this.mailData.html[i], node.content);
                            return;
                        }
                    }
                }
                this.mailData.html.push({content: this._updateHTMLCharset(node.content || ""), level: level});
                return;
            case "text/plain":
                this.mailData.text.push({content: node.content || "", level: level});
                return;
        }
    }else{
        node.meta = node.meta || {};
        if(node.content){
            node.meta.content = node.content;
        }
        this.mailData.attachments.push({content: node.meta || {}, level: level});
        
        if(this.options.showAttachmentLinks && mimeMultipart == "mixed" && this.mailData.html.length){
            for(i=0, len = this.mailData.html.length; i<len; i++){
                if(this.mailData.html[i].level == level){
                    this._joinHTMLAttachment(this.mailData.html[i], node.meta);
                    return;
                }
            }
        }
    }  
};

/**
 * <p>Joins two HTML blocks by removing the header of the added element<p>
 * 
 * @param {Object} htmlNode Original HTML contents node object
 * @param {String} newHTML HTML text to add to the original object node
 */
MailParser.prototype._joinHTMLNodes = function(htmlNode, newHTML){
    var inserted = false;
    
    // process new HTML
    newHTML = (newHTML || "").toString("utf-8").trim();
    
    // remove doctype from the beginning
    newHTML = newHTML.replace(/^\s*<\!doctype( [^>]*)?>/gi, "");
    
    // remove <head> and <html> blocks
    newHTML = newHTML.replace(/<head( [^>]*)?>(.*)<\/head( [^>]*)?>/gi, "").
                    replace(/<\/?html( [^>]*)?>/gi, "").
                    trim();
    
    // keep only text between <body> tags (if <body exists)
    newHTML.replace(/<body(?: [^>]*)?>(.*)<\/body( [^>]*)?>/gi, function(match, body){
        newHTML = body.trim();
    });
    
    htmlNode.content = (htmlNode.content || "").toString("utf-8").trim();
    
    htmlNode.content = htmlNode.content.replace(/<\/body( [^>]*)?>/i, function(match){
        inserted = true;
        return "<br/>\n" + newHTML + match;
    });
    
    if(!inserted){
        htmlNode.content += "<br/>\n" + newHTML; 
    }
};

/**
 * <p>Adds filename placeholder to the HTML if needed</p>
 * 
 * @param {Object} htmlNode Original HTML contents node object
 * @param {String} attachment Attachment meta object
 */
MailParser.prototype._joinHTMLAttachment = function(htmlNode, attachment){
    var inserted = false,
        fname = attachment.generatedFileName.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"),
        cid, newHTML;

    cid = attachment.cid || (attachment.cid = attachment.generatedFileName+"@node");
    newHTML = "\n<div class=\"mailparser-attachment\"><a href=\"cid:"+cid+"\">&lt;" + fname + "&gt;</a></div>";

    htmlNode.content = (htmlNode.content || "").toString("utf-8").trim();
    
    htmlNode.content = htmlNode.content.replace(/<\/body( [^>]*)?>/i, function(match){
        inserted = true;
        return "<br/>\n" + newHTML + match;
    });
    
    if(!inserted){
        htmlNode.content += "<br/>\n" + newHTML; 
    }
};

/**
 * <p>Converts a string from one charset to another</p>
 * 
 * @param {Buffer|String} value A String to be converted
 * @param {String} fromCharset source charset
 * @param {String} [toCharset="UTF-8"] destination charset
 * @returns {Buffer} Converted string as a Buffer (or SlowBuffer)
 */
MailParser.prototype._convertString = function(value, fromCharset, toCharset){
    toCharset = (toCharset || "utf-8").toUpperCase();
    fromCharset = (fromCharset || "utf-8").toUpperCase();
    
    value = typeof value=="string"?new Buffer(value, "binary"):value;
    
    if(toCharset == fromCharset){
        return value;
    }
    
    try{ // in case there is no such charset or EINVAL occurs leave the string untouched
        if(!this._iconv[fromCharset+toCharset]){
            this._iconv[fromCharset+toCharset] = new Iconv(fromCharset, toCharset+'//TRANSLIT//IGNORE');
        }
        value = this._iconv[fromCharset+toCharset].convert(value);
    }catch(E){}
    
    return value;
};

/**
 * <p>Encodes a header string to UTF-8</p>
 * 
 * @param {String} value String to be encoded
 * @returns {String} UTF-8 encoded string
 */
MailParser.prototype._encodeString = function(value){
    value = this._replaceMimeWords(this._convertString(value, this._currentNode.meta.charset || this.options.defaultCharset || "iso-8859-1").toString("utf-8"));
    return value;
};

/**
 * <p>Replaces mime words in a string with UTF-8 encoded strings</p>
 * 
 * @param {String} value String to be converted
 * @returns {String} converted string
 */
MailParser.prototype._replaceMimeWords = function(value){
    return value.
        replace(/(=\?[^?]+\?[QqBb]\?[^?]+\?=)\s+(?==\?[^?]+\?[QqBb]\?[^?]+\?=)/g, "$1"). // join mimeWords
        replace(/\=\?[^?]+\?[QqBb]\?[^?]+\?=/g, (function(a){
            return mimelib.decodeMimeWord(a.replace(/\s/g,''));
        }).bind(this));
};

/**
 * <p>Removes enclosing quotes ("", '', &lt;&gt;) from a string</p>
 * 
 * @param {String} value String to be converted
 * @returns {String} converted string
 */
MailParser.prototype._trimQuotes = function(value){
    value = (value || "").trim();
    if((value.charAt(0)=='"' && value.charAt(value.length-1)=='"') || 
      (value.charAt(0)=="'" && value.charAt(value.length-1)=="'") || 
      (value.charAt(0)=="<" && value.charAt(value.length-1)==">")){
        value = value.substr(1,value.length-2);
    }
    return value;
};

/**
 * <p>Generates a context unique filename for an attachment</p>
 * 
 * <p>If a filename already exists, append a number to it</p>
 * 
 * <ul>
 *     <li>file.txt</li>
 *     <li>file-1.txt</li>
 *     <li>file-2.txt</li>
 * </ul>
 * 
 * @param {String} fileName source filename
 * @param {String} contentType source content type
 * @returns {String} generated filename
 */
MailParser.prototype._generateFileName = function(fileName, contentType){
    var ext, defaultExt = "";
    
    if(contentType){
        defaultExt = mimelib.contentTypesReversed[contentType];
        defaultExt = defaultExt?"."+defaultExt:"";
    }
    
    fileName = fileName || "attachment"+defaultExt;
    
    // remove path if it is included in the filename
    fileName = fileName.toString().split(/[\/\\]+/).pop().replace(/^\.+/,"") || "attachment";
    
    if(fileName in this._fileNames){
        this._fileNames[fileName]++;
        ext = fileName.substr((fileName.lastIndexOf(".") || 0)+1);
        if(ext == fileName){
            fileName += "-" +  this._fileNames[fileName];
        }else{
            fileName = fileName.substr(0, fileName.length - ext.length - 1) + "-" + this._fileNames[fileName] + "." + ext;
        }
    }else{
        this._fileNames[fileName] = 0;
    }
    return fileName;  
};


/**
 * <p>Replaces character set to UTF-8 in HTML &lt;meta&gt; tags</p>
 * 
 * @param {String} HTML html contents
 * @returns {String} updated HTML
 */
MailParser.prototype._updateHTMLCharset = function(html){
    
    html = html.replace(/\n/g,"\u0000").
        replace(/<meta[^>]*>/gi, function(meta){
            if(meta.match(/http\-equiv\s*=\s*"?content\-type/i)){
                return '<meta http-equiv="content-type" content="text/html; charset=utf-8" />';
            }
            if(meta.match(/\scharset\s*=\s*['"]?[\w\-]+["'\s>\/]/i)){
                return '<meta charset="utf-8"/>';
            }
            return meta;
        }).
        replace(/\u0000/g,"\n");
    
    return html;
};

/**
 * <p>Detects the charset of an HTML file</p>
 * 
 * @param {String} HTML html contents
 * @returns {String} Charset for the HTML
 */
MailParser.prototype._detectHTMLCharset = function(html){
    var charset, input, meta;
    
    if(typeof html !=" string"){
        html = html.toString("ascii");
    }
    
    if((meta = html.match(/<meta\s+http-equiv=["']content-type["'][^>]*?>/i))){
        input = meta[0];
    }

    if(input){
        charset = input.match(/charset\s?=\s?([a-zA-Z\-_:0-9]*);?/);
        if(charset){
            charset = (charset[1] || "").trim().toLowerCase();
        }
    }

    if(!charset && (meta = html.match(/<meta\s+charset=["']([^'"<\/]*?)["']/i))){
        charset = (meta[1] || "").trim().toLowerCase();
    }

    return charset;
};
});
define('imap',['require','exports','module','util','rdcommon/log','events','mailparser/mailparser'],function(require, exports, module) {
var util = require('util'), $log = require('rdcommon/log'),
    EventEmitter = require('events').EventEmitter,
    mailparser = require('mailparser/mailparser');

var emptyFn = function() {}, CRLF = '\r\n',
    CRLF_BUFFER = Buffer(CRLF),
    STATES = {
      NOCONNECT: 0,
      NOAUTH: 1,
      AUTH: 2,
      BOXSELECTING: 3,
      BOXSELECTED: 4
    }, BOX_ATTRIBS = ['NOINFERIORS', 'NOSELECT', 'MARKED', 'UNMARKED'],
    MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'],
    reFetch = /^\* (\d+) FETCH [\s\S]+? \{(\d+)\}$/,
    reDate = /^(\d{2})-(.{3})-(\d{4})$/,
    reDateTime = /^(\d{2})-(.{3})-(\d{4}) (\d{2}):(\d{2}):(\d{2}) ([+-]\d{4})$/,
    HOUR_MILLIS = 60 * 60 * 1000, MINUTE_MILLIS = 60 * 1000;

const CHARCODE_RBRACE = ('}').charCodeAt(0),
      CHARCODE_ASTERISK = ('*').charCodeAt(0),
      CHARCODE_RPAREN = (')').charCodeAt(0);

/**
 * A buffer for us to assemble buffers so the back-end doesn't fragment them.
 * This is safe for MozTCPSocket's buffer usage because the buffer is always
 * consumed synchronously.  This is not necessarily safe under other semantics.
 */
var gSendBuf = new Uint8Array(2000);

function singleArgParseInt(x) {
  return parseInt(x, 10);
}

/**
 * Parses (UTC) IMAP dates into UTC timestamps. IMAP dates are DD-Mon-YYYY.
 */
function parseImapDate(dstr) {
  var match = reDate.exec(dstr);
  if (!match)
    throw new Error("Not a good IMAP date: " + dstr);
  var day = parseInt(match[1], 10),
      zeroMonth = MONTHS.indexOf(match[2]),
      year = parseInt(match[3], 10);
  return Date.UTC(year, zeroMonth, day);
}

/**
 * Parses IMAP date-times into UTC timestamps.  IMAP date-times are
 * "DD-Mon-YYYY HH:MM:SS +ZZZZ"
 */
function parseImapDateTime(dstr) {
  var match = reDateTime.exec(dstr);
  if (!match)
    throw new Error("Not a good IMAP date-time: " + dstr);
  var day = parseInt(match[1], 10),
      zeroMonth = MONTHS.indexOf(match[2]),
      year = parseInt(match[3], 10),
      hours = parseInt(match[4], 10),
      minutes = parseInt(match[5], 10),
      seconds = parseInt(match[6], 10),
      // figure the timestamp before the zone stuff.  We don't
      timestamp = Date.UTC(year, zeroMonth, day, hours, minutes, seconds),
      // to reduce string garbage creation, we use one string. (we have to
      // play math games no matter what, anyways.)
      zoneDelta = parseInt(match[7], 10),
      zoneHourDelta = Math.floor(zoneDelta / 100),
      // (the negative sign sticks around through the mod operation)
      zoneMinuteDelta = zoneDelta % 100;

  // ex: GMT-0700 means 7 hours behind, so we need to add 7 hours, aka
  // subtract negative 7 hours.
  timestamp -= zoneHourDelta * HOUR_MILLIS + zoneMinuteDelta * MINUTE_MILLIS;

  return timestamp;
}

function formatImapDateTime(date) {
  var s;
  s = ((date.getDate() < 10) ? ' ' : '') + date.getDate() + '-' +
       MONTHS[date.getMonth()] + '-' +
       date.getFullYear() + ' ' +
       ('0'+date.getHours()).slice(-2) + ':' +
       ('0'+date.getMinutes()).slice(-2) + ':' +
       ('0'+date.getSeconds()).slice(-2) +
       ((date.getTimezoneOffset() > 0) ? ' -' : ' +' ) +
       ('0'+(Math.abs(date.getTimezoneOffset()) / 60)).slice(-2) +
       ('0'+(Math.abs(date.getTimezoneOffset()) % 60)).slice(-2);
  return s;
}

var IDLE_NONE = 1,
    IDLE_WAIT = 2,
    IDLE_READY = 3,
    DONE_WAIT = 4;

function ImapConnection (options) {
  if (!(this instanceof ImapConnection))
    return new ImapConnection(options);
  EventEmitter.call(this);

  this._options = {
    username: '',
    password: '',
    host: 'localhost',
    port: 143,
    secure: false,
    connTimeout: 10000, // connection timeout in msecs
    _logParent: null
  };
  this._state = {
    status: STATES.NOCONNECT,
    conn: null,
    curId: 0,
    requests: [],
    numCapRecvs: 0,
    isReady: false,
    isIdle: true,
    tmrKeepalive: null,
    tmoKeepalive: 10000,
    tmrConn: null,
    curData: null,
    curExpected: 0,
    curXferred: 0,
    box: {
      _uidnext: 0,
      _flags: [],
      _newKeywords: false,
      validity: 0,
      // undefined when unknown, null is nomodseq, string of the actual
      // highestmodseq once retrieved.
      highestModSeq: undefined,
      keywords: [],
      permFlags: [],
      name: null,
      messages: { total: 0, new: 0 }
    },
    ext: {
      // Capability-specific state info
      idle: {
        MAX_WAIT: 1740000, // 29 mins in ms
        state: IDLE_NONE,
        timeWaited: 0 // ms
      }
    }
  };
  this._options = extend(true, this._options, options);

  this._LOG = (this._options._logParent ? LOGFAB.ImapProtoConn(this, this._options._logParent, null) : null);
  this.delim = null;
  this.namespaces = { personal: [], other: [], shared: [] };
  this.capabilities = [];
  this.enabledCapabilities = [];
};
util.inherits(ImapConnection, EventEmitter);
exports.ImapConnection = ImapConnection;

ImapConnection.prototype.hasCapability = function(name) {
  return this.capabilities.indexOf(name) !== -1;
};

ImapConnection.prototype.connect = function(loginCb) {
  var self = this,
      fnInit = function() {
        if (self._options.crypto === 'starttls') {
          self._send('STARTTLS', function() {
            self._state.conn.startTLS();
          });
        }
        // First get pre-auth capabilities, including server-supported auth
        // mechanisms
        self._send('CAPABILITY', null, function() {
          // Next, attempt to login
          self._login(function(err, reentry) {
            if (err) {
              loginCb(err);
              return;
            }
            // Next, get the list of available namespaces if supported
            if (!reentry && self.capabilities.indexOf('NAMESPACE') > -1) {
              var fnMe = arguments.callee;
              // Re-enter this function after we've obtained the available
              // namespaces
              self._send('NAMESPACE', null,
                         function(e) { fnMe.call(this, e, true); });
              return;
            }
            // Lastly, get the top-level mailbox hierarchy delimiter used by the
            // server
            self._send(
              (self.capabilities.indexOf('XLIST') === -1 ? 'LIST' : 'XLIST'),
              ' "" ""',
              loginCb);
          });
        });
      };
  loginCb = loginCb || emptyFn;
  this._reset();


  var socketOptions = {
    binaryType: 'arraybuffer',
    useSSL: Boolean(this._options.crypto),
  };
  if (this._options.crypto === 'starttls')
    socketOptions.useSSL = 'starttls';

  this._state.conn = MozTCPSocket.open(
    this._options.host, this._options.port, socketOptions);

  // XXX rely on MozTCPSocket for this?
  this._state.tmrConn = setTimeout(this._fnTmrConn.bind(this),
                                   this._options.connTimeout, loginCb);

  this._state.conn.onopen = function(evt) {
    if (this._LOG) this._LOG.connected();
    clearTimeout(self._state.tmrConn);
    self._state.status = STATES.NOAUTH;
    fnInit();
  };
  this._state.conn.ondata = function(evt) {
    try {
      var buffer = Buffer(evt.data);
      processData(buffer);
    }
    catch (ex) {
      console.error('Explosion while processing data', ex);
      throw ex;
    }
  };
  /**
   * Process up to one thing.  Generally:
   * - If we are processing a literal, we make sure we have the data for the
   *   whole literal, then we process it.
   * - If we are not in a literal, we buffer until we have one newline.
   * - If we have leftover data, we invoke ourselves in a quasi-tail-recursive
   *   fashion or in subsequent ticks.  It's not clear that the logic that
   *   defers to future ticks is sound.
   */
  function processData(data) {
    if (data.length === 0) return;
    var idxCRLF = null, literalInfo;

    // - Accumulate data until newlines when not in a literal
    if (self._state.curExpected === 0) {
      // no newline, append and bail
      if ((idxCRLF = bufferIndexOfCRLF(data, 0)) === -1) {
        if (self._state.curData)
          self._state.curData = bufferAppend(self._state.curData, data);
        else
          self._state.curData = data;
        return;
      }
      // yes newline, use the buffered up data and new data
      // (note: data may now contain more than one line's worth of data!)
      if (self._state.curData && self._state.curData.length) {
        data = bufferAppend(self._state.curData, data);
        self._state.curData = null;
      }
    }

    // -- Literal
    // Don't mess with incoming data if it's part of a literal
    if (self._state.curExpected > 0) {
      var curReq = self._state.requests[0];
      if (!curReq._done) {
        var chunk = data;
        self._state.curXferred += data.length;
        if (self._state.curXferred > self._state.curExpected) {
          var pos = data.length
                    - (self._state.curXferred - self._state.curExpected),
              extra = data.slice(pos);
          if (pos > 0)
            chunk = data.slice(0, pos);
          else
            chunk = undefined;
          data = extra;
          curReq._done = 1;
        }

        if (chunk && chunk.length) {
          if (self._LOG) self._LOG.data(chunk.length, chunk);
          if (curReq._msgtype === 'headers') {
            chunk.copy(self._state.curData, curReq.curPos, 0);
            curReq.curPos += chunk.length;
          }
          else
            curReq._msg.emit('data', chunk);
        }
      }

      if (curReq._done) {
        var restDesc;
        if (curReq._done === 1) {
          if (curReq._msgtype === 'headers')
            curReq._headers = self._state.curData.toString('ascii');
          self._state.curData = null;
          curReq._done = true;
        }

        if (self._state.curData)
          self._state.curData = bufferAppend(self._state.curData, data);
        else
          self._state.curData = data;

        idxCRLF = bufferIndexOfCRLF(self._state.curData);
        if (idxCRLF && self._state.curData[idxCRLF - 1] === CHARCODE_RPAREN) {
          if (idxCRLF > 1) {
            // eat up to, but not including, the right paren
            restDesc = self._state.curData.toString('ascii', 0, idxCRLF - 1)
                         .trim();
            if (restDesc.length)
              curReq._desc += ' ' + restDesc;
          }
          parseFetch(curReq._desc, curReq._headers, curReq._msg);
          data = self._state.curData.slice(idxCRLF + 2);
          curReq._done = false;
          self._state.curXferred = 0;
          self._state.curExpected = 0;
          self._state.curData = null;
          curReq._msg.emit('end');
          // XXX we could just change the next else to not be an else, and then
          // this conditional is not required and we can just fall out.  (The
          // expected check === 0 may need to be reinstated, however.)
          if (data.length && data[0] === CHARCODE_ASTERISK) {
            processData(data);
            return;
          }
        } else // ??? no right-paren, keep accumulating data? this seems wrong.
          return;
      } else // not done, keep accumulating data
        return;
    }
    // -- Fetch w/literal
    // (More specifically, we were not in a literal, let's see if this line is
    // a fetch result line that starts a literal.  We want to minimize
    // conversion to a string, as there used to be a naive conversion here that
    // chewed up a lot of processor by converting all of data rather than
    // just the current line.)
    else if (data[0] === CHARCODE_ASTERISK) {
      var strdata;
      idxCRLF = bufferIndexOfCRLF(data, 0);
      if (data[idxCRLF - 1] === CHARCODE_RBRACE &&
          (literalInfo =
             (strdata = data.toString('ascii', 0, idxCRLF)).match(reFetch))) {
        self._state.curExpected = parseInt(literalInfo[2], 10);

        var curReq = self._state.requests[0],
            type = /BODY\[(.*)\](?:\<\d+\>)?/.exec(strdata),
            msg = new ImapMessage(),
            desc = strdata.substring(strdata.indexOf('(')+1).trim();
        msg.seqno = parseInt(literalInfo[1], 10);
        type = type[1];
        curReq._desc = desc;
        curReq._msg = msg;

        curReq._fetcher.emit('message', msg);

        curReq._msgtype = (type.indexOf('HEADER') === 0 ? 'headers' : 'body');
        // This library buffers headers, so allocate a buffer to hold the literal.
        if (curReq._msgtype === 'headers') {
          self._state.curData = new Buffer(self._state.curExpected);
          curReq.curPos = 0;
        }
        if (self._LOG) self._LOG.data(strdata.length, strdata);
        // (If it's not headers, then it's body, and we generate 'data' events.)
        processData(data.slice(idxCRLF + 2));
        return;
      }
    }

    if (data.length === 0)
      return;
    data = customBufferSplitCRLF(data);
    // Defer any extra server responses found in the incoming data
    for (var i=1,len=data.length; i<len; ++i) {
      process.nextTick(processData.bind(null, data[i]));
    }

    data = data[0].toString('ascii');
    if (self._LOG) self._LOG.data(data.length, data);
    data = stringExplode(data, ' ', 3);

    // -- Untagged server responses
    if (data[0] === '*') {
      if (self._state.status === STATES.NOAUTH) {
        if (data[1] === 'PREAUTH') { // the server pre-authenticated us
          self._state.status = STATES.AUTH;
          if (self._state.numCapRecvs === 0)
            self._state.numCapRecvs = 1;
        } else if (data[1] === 'NO' || data[1] === 'BAD' || data[1] === 'BYE') {
          if (self._LOG && data[1] === 'BAD')
            self._LOG.bad(data[2]);
          self._state.conn.close();
          return;
        }
        if (!self._state.isReady)
          self._state.isReady = true;
        // Restrict the type of server responses when unauthenticated
        if (data[1] !== 'CAPABILITY' && data[1] !== 'ALERT')
          return;
      }
      switch (data[1]) {
        case 'CAPABILITY':
          if (self._state.numCapRecvs < 2)
            self._state.numCapRecvs++;
          self.capabilities = data[2].split(' ').map(up);
        break;
        // Feedback from the ENABLE command.
        case 'ENABLED':
          self.enabledCapabilities = self.enabledCapabilities.concat(
                                       data[2].split(' '));
          self.enabledCapabilities.sort();
        break;
        // The system-defined flags for this mailbox; during SELECT/EXAMINE
        case 'FLAGS':
          if (self._state.status === STATES.BOXSELECTING) {
            self._state.box._flags = data[2].substr(1, data[2].length-2)
                                            .split(' ').map(function(flag) {
                                              return flag.substr(1);
                                            });
          }
        break;
        case 'OK':
          if ((result = /^\[ALERT\] (.*)$/i.exec(data[2])))
            self.emit('alert', result[1]);
          else if (self._state.status === STATES.BOXSELECTING) {
            var result;
            if ((result = /^\[UIDVALIDITY (\d+)\]/i.exec(data[2])))
              self._state.box.validity = result[1];
            else if ((result = /^\[UIDNEXT (\d+)\]/i.exec(data[2])))
              self._state.box._uidnext = result[1];
            // Flags the client can change permanently.  If \* is included, it
            // means we can make up new keywords.
            else if ((result = /^\[PERMANENTFLAGS \((.*)\)\]/i.exec(data[2]))) {
              self._state.box.permFlags = result[1].split(' ');
              var idx;
              if ((idx = self._state.box.permFlags.indexOf('\\*')) > -1) {
                self._state.box._newKeywords = true;
                self._state.box.permFlags.splice(idx, 1);
              }
              self._state.box.keywords = self._state.box.permFlags
                                             .filter(function(flag) {
                                               return (flag[0] !== '\\');
                                             });
              for (var i=0; i<self._state.box.keywords.length; i++)
                self._state.box.permFlags.splice(self._state.box.permFlags.indexOf(self._state.box.keywords[i]), 1);
              self._state.box.permFlags = self._state.box.permFlags
                                              .map(function(flag) {
                                                return flag.substr(1);
                                              });
            }
            else if ((result = /^\[HIGHESTMODSEQ (\d+)\]/i.exec(data[2]))) {
              // Kept as a string since it may be a full 64-bit value.
              self._state.box.highestModSeq = result[1];
            }
            // The server does not support mod sequences for the folder.
            else if ((result = /^\[NOMODSEQ\]/i.exec(data[2]))) {
              self._state.box.highestModSeq = null;
            }
          }
        break;
        case 'NAMESPACE':
          parseNamespaces(data[2], self.namespaces);
        break;
        case 'SEARCH':
          self._state.requests[0].args.push(
            (data[2] === undefined || data[2].length === 0)
              ? [] : data[2].trim().split(' ').map(singleArgParseInt));
        break;
        case 'LIST':
        case 'XLIST':
          var result;
          if (self.delim === null
              && (result = /^\(\\No[sS]elect\) (.+?) .*$/.exec(data[2])))
            self.delim = (result[1] === 'NIL'
                          ? false : result[1].substring(1, result[1].length-1));
          else if (self.delim !== null) {
            if (self._state.requests[0].args.length === 0)
              self._state.requests[0].args.push({});
            result = /^\((.*)\) (.+?) "?([^"]+)"?$/.exec(data[2]);
            var box = {
                  attribs: result[1].split(' ').map(function(attrib) {
                             return attrib.substr(1).toUpperCase();
                           }),
                  delim: (result[2] === 'NIL'
                          ? false : result[2].substring(1, result[2].length-1)),
                  children: null,
                  parent: null
                }, name = result[3], curChildren = self._state.requests[0].args[0];
            if (name[0] === '"' && name[name.length-1] === '"')
              name = name.substring(1, name.length - 1);

            if (box.delim) {
              var path = name.split(box.delim).filter(isNotEmpty),
                  parent = null;
              name = path.pop();
              for (var i=0,len=path.length; i<len; i++) {
                if (!curChildren[path[i]])
                  curChildren[path[i]] = {};
                if (!curChildren[path[i]].children)
                  curChildren[path[i]].children = {};
                parent = curChildren[path[i]];
                curChildren = curChildren[path[i]].children;
              }
              box.parent = parent;
            }
            if (!curChildren[name])
              curChildren[name] = box;
          }
        break;
        // QRESYNC (when successful) generates a "VANISHED (EARLIER) uids"
        // payload to tell us about deleted/expunged messages when selecting
        // a folder.
        // It will also generate untagged VANISHED updates as the result of an
        // expunge on this connection or other connections (for this folder).
        case 'VANISHED':
          var earlier = false;
          if (data[2].lastIndexOf('(EARLIER) ', 0) === 0) {
            earlier = true;
            data[2] = data[2].substring(10);
          }
          // Using vanished because the existing 'deleted' event uses sequence
          // numbers.
          self.emit('vanished', parseUIDListString(data[2]), earlier);
        break;
        default:
          if (/^\d+$/.test(data[1])) {
            var isUnsolicited = (self._state.requests[0] &&
                      self._state.requests[0].command.indexOf('NOOP') > -1) ||
                      (self._state.isIdle && self._state.ext.idle.state === IDLE_READY);
            switch (data[2]) {
              case 'EXISTS':
                // mailbox total message count
                var prev = self._state.box.messages.total,
                    now = parseInt(data[1]);
                self._state.box.messages.total = now;
                if (self._state.status !== STATES.BOXSELECTING && now > prev) {
                  self._state.box.messages.new = now-prev;
                  self.emit('mail', self._state.box.messages.new); // new mail
                }
              break;
              case 'RECENT':
                // messages marked with the \Recent flag (i.e. new messages)
                self._state.box.messages.new = parseInt(data[1]);
              break;
              case 'EXPUNGE':
                // confirms permanent deletion of a single message
                if (self._state.box.messages.total > 0)
                  self._state.box.messages.total--;
                if (isUnsolicited)
                  self.emit('deleted', parseInt(data[1], 10));
              break;
              default:
                // fetches without header or body (part) retrievals
                if (/^FETCH/.test(data[2])) {
                  var msg = new ImapMessage();
                  parseFetch(data[2].substring(data[2].indexOf("(")+1,
                                               data[2].lastIndexOf(")")),
                             "", msg);
                  msg.seqno = parseInt(data[1], 10);
                  if (self._state.requests.length &&
                      self._state.requests[0].command.indexOf('FETCH') > -1) {
                    var curReq = self._state.requests[0];
                    curReq._fetcher.emit('message', msg);
                    msg.emit('end');
                  } else if (isUnsolicited)
                    self.emit('msgupdate', msg);
                }
            }
          }
      }
    } else if (data[0][0] === 'A' || data[0] === '+') {
      // Tagged server response or continuation response

      if (data[0] === '+' && self._state.ext.idle.state === IDLE_WAIT) {
        self._state.ext.idle.state = IDLE_READY;
        return process.nextTick(function() { self._send(); });
      }

      var sendBox = false;
      clearTimeout(self._state.tmrKeepalive);
      if (self._state.status === STATES.BOXSELECTING) {
        if (data[1] === 'OK') {
          sendBox = true;
          self._state.status = STATES.BOXSELECTED;
        } else {
          self._state.status = STATES.AUTH;
          self._resetBox();
        }
      }

      // XXX there is an edge case here where we LOGOUT and the server sends
      // "* BYE" "AXX LOGOUT OK" and the close event gets processed (probably
      // because of the BYE and the fact that we don't nextTick a lot for the
      // moz logic) and _reset() nukes the requests before we see the LOGOUT,
      // which we do end up seeing.  So just bail in that case.
      if (self._state.requests.length === 0) {
        return;
      }

      if (self._state.requests[0].command.indexOf('RENAME') > -1) {
        self._state.box.name = self._state.box._newName;
        delete self._state.box._newName;
        sendBox = true;
      }

      if (typeof self._state.requests[0].callback === 'function') {
        var err = null;
        var args = self._state.requests[0].args,
            cmd = self._state.requests[0].command;
        if (data[0] === '+') {
          if (cmd.indexOf('APPEND') !== 0) {
            err = new Error('Unexpected continuation');
            err.type = 'continuation';
            err.request = cmd;
          } else
            return self._state.requests[0].callback();
        } else if (data[1] !== 'OK') {
          err = new Error('Error while executing request: ' + data[2]);
          err.type = data[1];
          err.request = cmd;
        } else if (self._state.status === STATES.BOXSELECTED) {
          if (sendBox) // SELECT, EXAMINE, RENAME
            args.unshift(self._state.box);
          // According to RFC 3501, UID commands do not give errors for
          // non-existant user-supplied UIDs, so give the callback empty results
          // if we unexpectedly received no untagged responses.
          else if ((cmd.indexOf('UID FETCH') === 0
                    || cmd.indexOf('UID SEARCH') === 0
                   ) && args.length === 0)
            args.unshift([]);
        }
        args.unshift(err);
        self._state.requests[0].callback.apply({}, args);
      }


      var recentReq = self._state.requests.shift(),
          recentCmd = recentReq.command;
      if (self._LOG) self._LOG.cmd_end(recentReq.prefix, recentCmd, /^LOGIN$/.test(recentCmd) ? '***BLEEPING OUT LOGON***' : recentReq.cmddata);
      if (self._state.requests.length === 0
          && recentCmd !== 'LOGOUT') {
        if (self._state.status === STATES.BOXSELECTED &&
            self.capabilities.indexOf('IDLE') > -1) {
          // According to RFC 2177, we should re-IDLE at least every 29
          // minutes to avoid disconnection by the server
          self._send('IDLE', null, undefined, undefined, true);
        }
        self._state.tmrKeepalive = setTimeout(function() {
          if (self._state.isIdle) {
            if (self._state.ext.idle.state === IDLE_READY) {
              self._state.ext.idle.timeWaited += self._state.tmoKeepalive;
              if (self._state.ext.idle.timeWaited >= self._state.ext.idle.MAX_WAIT)
                // restart IDLE
                self._send('IDLE', null, undefined, undefined, true);
            } else if (self.capabilities.indexOf('IDLE') === -1)
              self._noop();
          }
        }, self._state.tmoKeepalive);
      } else
        process.nextTick(function() { self._send(); });

      self._state.isIdle = true;
    } else if (data[0] === 'IDLE') {
      if (self._state.requests.length)
        process.nextTick(function() { self._send(); });
      self._state.isIdle = false;
      self._state.ext.idle.state = IDLE_NONE;
      self._state.ext.idle.timeWaited = 0;
    } else {
      if (self._LOG)
        self._LOG.unknownResponse(data[0], data[1], data[2]);
      // unknown response
    }
  };

  this._state.conn.onclose = function onClose() {
    self._reset();
    if (this._LOG) this._LOG.closed();
    self.emit('close');
  };
  this._state.conn.onerror = function(evt) {
    try {
      var err = evt.data;
      clearTimeout(self._state.tmrConn);
      if (self._state.status === STATES.NOCONNECT)
        loginCb(new Error('Unable to connect. Reason: ' + err));
      self.emit('error', err);
      if (this._LOG) this._LOG.connError(err);
    }
    catch(ex) {
      console.error("Error in imap onerror:", ex);
      throw ex;
    }
  };
};

/**
 * Aggressively shutdown the connection, ideally so that no further callbacks
 * are invoked.
 */
ImapConnection.prototype.die = function() {
  // NB: there's still a lot of events that could happen, but this is only
  // being used by unit tests right now.
  if (this._state.conn) {
    this._state.conn.onclose = null;
    this._state.conn.onerror = null;
    this._state.conn.close();
  }
  this._reset();
  this._LOG.__die();
};

ImapConnection.prototype.isAuthenticated = function() {
  return this._state.status >= STATES.AUTH;
};

ImapConnection.prototype.logout = function(cb) {
  if (this._state.status >= STATES.NOAUTH)
    this._send('LOGOUT', null, cb);
  else
    throw new Error('Not connected');
};

/**
 * Enable one or more optional capabilities.  This is additive and there's no
 * way to un-enable things once enabled.  So enable(["a", "b"]), followed by
 * enable(["c"]) is the same as enable(["a", "b", "c"]).
 *
 * http://tools.ietf.org/html/rfc5161
 */
ImapConnection.prototype.enable = function(capabilities, cb) {
  if (this._state.status < STATES.AUTH)
    throw new Error('Not connected or authenticated');
  this._send('ENABLE ' + capabilities.join(' '), cb || emptyFn);
};

ImapConnection.prototype.openBox = function(name, readOnly, cb) {
  if (this._state.status < STATES.AUTH)
    throw new Error('Not connected or authenticated');
  if (this._state.status === STATES.BOXSELECTED)
    this._resetBox();
  if (cb === undefined) {
    if (readOnly === undefined)
      cb = emptyFn;
    else
      cb = readOnly;
    readOnly = false;
  }
  var self = this;
  function dispatchFunc() {
    self._state.status = STATES.BOXSELECTING;
    self._state.box.name = name;
  }

  this._send((readOnly ? 'EXAMINE' : 'SELECT'), ' "' + escape(name) + '"', cb,
             dispatchFunc);
};

/**
 * SELECT/EXAMINE a box using the QRESYNC extension.  The last known UID
 * validity and last known modification sequence are required.  The set of
 * known UIDs is optional.
 */
ImapConnection.prototype.qresyncBox = function(name, readOnly,
                                               uidValidity, modSeq,
                                               knownUids,
                                               cb) {
  if (this._state.status < STATES.AUTH)
    throw new Error('Not connected or authenticated');
  if (this.enabledCapabilities.indexOf('QRESYNC') === -1)
    throw new Error('QRESYNC is not enabled');
  if (this._state.status === STATES.BOXSELECTED)
    this._resetBox();
  if (cb === undefined) {
    if (readOnly === undefined)
      cb = emptyFn;
    else
      cb = readOnly;
    readOnly = false;
  }
  var self = this;
  function dispatchFunc() {
    self._state.status = STATES.BOXSELECTING;
    self._state.box.name = name;
  }

  this._send((readOnly ? 'EXAMINE' : 'SELECT') + ' "' + escape(name) + '"' +
             ' (QRESYNC (' + uidValidity + ' ' + modSeq +
             (knownUids ? (' ' + knownUids) : '') + '))', cb, dispatchFunc);
};



// also deletes any messages in this box marked with \Deleted
ImapConnection.prototype.closeBox = function(cb) {
  var self = this;
  if (this._state.status !== STATES.BOXSELECTED)
    throw new Error('No mailbox is currently selected');
  this._send('CLOSE', null, function(err) {
    if (!err) {
      self._state.status = STATES.AUTH;
      self._resetBox();
    }
    cb(err);
  });
};

ImapConnection.prototype.removeDeleted = function(cb) {
  if (this._state.status !== STATES.BOXSELECTED)
    throw new Error('No mailbox is currently selected');
  cb = arguments[arguments.length-1];

  this._send('EXPUNGE', null, cb);
};

ImapConnection.prototype.getBoxes = function(namespace, searchSpec, cb) {
  cb = arguments[arguments.length-1];
  if (arguments.length < 2)
    namespace = '';
  if (arguments.length < 3)
    searchSpec = '*';

  var cmd, cmddata = ' "' + escape(namespace) + '" "' +
                       escape(searchSpec) + '"';
  // Favor special-use over XLIST
  if (this.capabilities.indexOf('SPECIAL-USE') !== -1) {
    cmd = 'LIST';
    cmddata += ' RETURN (SPECIAL-USE)';
  }
  else if (this.capabilities.indexOf('XLIST') !== -1) {
    cmd = 'XLIST';
  }
  else {
    cmd = 'LIST';
  }
  this._send(cmd, cmddata, cb);
};

ImapConnection.prototype.addBox = function(name, cb) {
  cb = arguments[arguments.length-1];
  if (typeof name !== 'string' || name.length === 0)
    throw new Error('Mailbox name must be a string describing the full path'
                    + ' of a new mailbox to be created');
  this._send('CREATE', ' "' + escape(name) + '"', cb);
};

ImapConnection.prototype.delBox = function(name, cb) {
  cb = arguments[arguments.length-1];
  if (typeof name !== 'string' || name.length === 0)
    throw new Error('Mailbox name must be a string describing the full path'
                    + ' of an existing mailbox to be deleted');
  this._send('DELETE', ' "' + escape(name) + '"', cb);
};

ImapConnection.prototype.renameBox = function(oldname, newname, cb) {
  cb = arguments[arguments.length-1];
  if (typeof oldname !== 'string' || oldname.length === 0)
    throw new Error('Old mailbox name must be a string describing the full path'
                    + ' of an existing mailbox to be renamed');
  else if (typeof newname !== 'string' || newname.length === 0)
    throw new Error('New mailbox name must be a string describing the full path'
                    + ' of a new mailbox to be renamed to');
  if (this._state.status === STATES.BOXSELECTED
      && oldname === this._state.box.name && oldname !== 'INBOX')
    this._state.box._newName = oldname;

  this._send('RENAME', ' "' + escape(oldname) + '" "' + escape(newname) + '"', cb);
};

ImapConnection.prototype.search = function(options, cb) {
  this._search('UID ', options, cb);
};
ImapConnection.prototype._search = function(which, options, cb) {
  if (this._state.status !== STATES.BOXSELECTED)
    throw new Error('No mailbox is currently selected');
  if (!Array.isArray(options))
    throw new Error('Expected array for search options');
  this._send(which + 'SEARCH',
             buildSearchQuery(options, this.capabilities), cb);
};

ImapConnection.prototype.append = function(data, options, cb) {
  if (typeof options === 'function') {
    cb = options;
    options = {};
  }
  options = options || {};
  if (!('mailbox' in options)) {
    if (this._state.status !== STATES.BOXSELECTED)
      throw new Error('No mailbox specified or currently selected');
    else
      options.mailbox = this._state.box.name;
  }
  var cmd = ' "'+escape(options.mailbox)+'"';
  if ('flags' in options) {
    if (!Array.isArray(options.flags))
      options.flags = Array(options.flags);
    cmd += " (\\"+options.flags.join(' \\')+")";
  }
  if ('date' in options) {
    if (!(options.date instanceof Date))
      throw new Error('Expected null or Date object for date');
    cmd += ' "' + formatImapDateTime(options.date) + '"';
  }
  cmd += ' {';
  cmd += (Buffer.isBuffer(data) ? data.length : Buffer.byteLength(data));
  cmd += '}';
  var self = this, step = 1;
  this._send('APPEND', cmd, function(err) {
    if (err || step++ === 2)
      return cb(err);
    if (typeof(data) === 'string') {
      self._state.conn.send(Buffer(data + CRLF));
    }
    else {
      self._state.conn.send(data);
      self._state.conn.send(CRLF_BUFFER);
    }
    if (this._LOG) this._LOG.sendData(data.length, data);
  });
}

ImapConnection.prototype.multiappend = function(messages, cb) {
  if (this._state.status !== STATES.BOXSELECTED)
    throw new Error('No mailbox specified or currently selected');
  var cmd = ' "'+escape(this._state.box.name)+'"';

  function buildAppendClause(options) {
    if ('flags' in options) {
      if (!Array.isArray(options.flags))
        options.flags = Array(options.flags);
      cmd += " (\\"+options.flags.join(' \\')+")";
    }
    if ('date' in options) {
      if (!(options.date instanceof Date))
        throw new Error('Expected null or Date object for date');
      cmd += ' "' + formatImapDateTime(options.date) + '"';
    }
    cmd += ' {';
    cmd += (Buffer.isBuffer(data) ? data.length : Buffer.byteLength(data));
    cmd += '}';
  }

  var self = this, iNextMessage = 1, done = false,
      message = messages[0], data = message.messageText;
  buildAppendClause(message);
  this._send('APPEND', cmd, function(err) {
    if (err || done)
      return cb(err, iNextMessage - 1);

    self._state.conn.send(typeof(data) === 'string' ? Buffer(data) : data);
    // The message literal itself should end with a newline.  We don't want to
    // send an extra one because then that terminates the command.
    if (self._LOG) self._LOG.sendData(data.length, data);

    if (iNextMessage < messages.length) {
      cmd = '';
      message = messages[iNextMessage++];
      data = message.messageText;
      buildAppendClause(message);
      cmd += CRLF;
      self._state.conn.send(Buffer(cmd));
      if (self._LOG) self._LOG.sendData(cmd.length, cmd);
    }
    else {
      // This terminates the command.
      self._state.conn.send(CRLF_BUFFER);
      if (self._LOG) self._LOG.sendData(2, CRLF);
      done = true;
    }
  });
}


ImapConnection.prototype.fetch = function(uids, options) {
  return this._fetch('UID ', uids, options);
};
ImapConnection.prototype._fetch = function(which, uids, options) {
  if (this._state.status !== STATES.BOXSELECTED)
    throw new Error('No mailbox is currently selected');

  if (uids === undefined || uids === null
      || (Array.isArray(uids) && uids.length === 0))
    throw new Error('Nothing to fetch');

  if (!Array.isArray(uids))
    uids = [uids];
  validateUIDList(uids);

  var opts = {
    markSeen: false,
    request: {
      struct: true,
      headers: true, // \_______ at most one of these can be used for any given
                    //   _______ fetch request
      body: false  //   /
    }
  }, toFetch, bodyRange = '', self = this;
  if (typeof options !== 'object')
    options = {};
  extend(true, opts, options);

  if (!Array.isArray(opts.request.headers)) {
    if (Array.isArray(opts.request.body)) {
      var rangeInfo;
      if (opts.request.body.length !== 2)
        throw new Error("Expected Array of length 2 for body byte range");
      else if (typeof opts.request.body[1] !== 'string'
               || !(rangeInfo = /^([\d]+)\-([\d]+)$/.exec(opts.request.body[1]))
               || parseInt(rangeInfo[1]) >= parseInt(rangeInfo[2]))
        throw new Error("Invalid body byte range format");
      bodyRange = '<' + parseInt(rangeInfo[1]) + '.' + parseInt(rangeInfo[2])
                  + '>';
      opts.request.body = opts.request.body[0];
    }
    if (typeof opts.request.headers === 'boolean'
        && opts.request.headers === true) {
      // fetches headers only
      toFetch = 'HEADER';
    } else if (typeof opts.request.body === 'boolean'
               && opts.request.body === true) {
      // fetches the whole entire message text (minus the headers), including
      // all message parts
      toFetch = 'TEXT';
    } else if (typeof opts.request.body === 'string') {
      if (opts.request.body.toUpperCase() === 'FULL') {
        // fetches the whole entire message (including the headers)
        toFetch = '';
      } else if (/^([\d]+[\.]{0,1})*[\d]+$/.test(opts.request.body)) {
        // specific message part identifier, e.g. '1', '2', '1.1', '1.2', etc
        toFetch = opts.request.body;
      } else
        throw new Error("Invalid body partID format");
    }
  } else {
    // fetch specific headers only
    toFetch = 'HEADER.FIELDS (' + opts.request.headers.join(' ').toUpperCase()
              + ')';
  }

  var extensions = '';
  if (this.capabilities.indexOf('X-GM-EXT-1') > -1)
    extensions = 'X-GM-THRID X-GM-MSGID X-GM-LABELS ';
  // google is mutually exclusive with QRESYNC
  else if (this.enabledCapabilities.indexOf('QRESYNC') > -1)
    extensions = 'MODSEQ ';

  this._send(which + 'FETCH', ' ' + uids.join(',') + ' (' + extensions
             + 'UID FLAGS INTERNALDATE'
             + (opts.request.struct ? ' BODYSTRUCTURE' : '')
             + (typeof toFetch === 'string' ? ' BODY'
             + (!opts.markSeen ? '.PEEK' : '')
             + '[' + toFetch + ']' + bodyRange : '') + ')', function(e) {
               var fetcher = self._state.requests[0]._fetcher;
               if (e && fetcher)
                 fetcher.emit('error', e);
               else if (e && !fetcher)
                 self.emit('error', e);
               else if (fetcher)
                 fetcher.emit('end');
             }
  );
  var imapFetcher = new ImapFetch();
  this._state.requests[this._state.requests.length-1]._fetcher = imapFetcher;
  return imapFetcher;
};

ImapConnection.prototype.addFlags = function(uids, flags, cb) {
  this._store('UID ', uids, flags, true, cb);
};

ImapConnection.prototype.delFlags = function(uids, flags, cb) {
  this._store('UID ', uids, flags, false, cb);
};

ImapConnection.prototype.addKeywords = function(uids, flags, cb) {
  return this._addKeywords('UID ', uids, flags, cb);
};
ImapConnection.prototype._addKeywords = function(which, uids, flags, cb) {
  if (!this._state.box._newKeywords)
    throw new Error('This mailbox does not allow new keywords to be added');
  this._store(which, uids, flags, true, cb);
};

ImapConnection.prototype.delKeywords = function(uids, flags, cb) {
  this._store('UID ', uids, flags, false, cb);
};

ImapConnection.prototype.copy = function(uids, boxTo, cb) {
  return this._copy('UID ', uids, boxTo, cb);
};
ImapConnection.prototype._copy = function(which, uids, boxTo, cb) {
  if (this._state.status !== STATES.BOXSELECTED)
    throw new Error('No mailbox is currently selected');

  if (!Array.isArray(uids))
    uids = [uids];

  validateUIDList(uids);

  this._send(which + 'COPY',
             ' ' + uids.join(',') + ' "' + escape(boxTo) + '"', cb);
};

/* Namespace for seqno-based commands */
ImapConnection.prototype.__defineGetter__('seq', function() {
  var self = this;
  return {
    move: function(seqnos, boxTo, cb) {
      return self._move('', seqnos, boxTo, cb);
    },
    copy: function(seqnos, boxTo, cb) {
      return self._copy('', seqnos, boxTo, cb);
    },
    delKeywords: function(seqnos, flags, cb) {
      self._store('', seqnos, flags, false, cb);
    },
    addKeywords: function(seqnos, flags, cb) {
      return self._addKeywords('', seqnos, flags, cb);
    },
    delFlags: function(seqnos, flags, cb) {
      self._store('', seqnos, flags, false, cb);
    },
    addFlags: function(seqnos, flags, cb) {
      self._store('', seqnos, flags, true, cb);
    },
    fetch: function(seqnos, options) {
      return self._fetch('', seqnos, options);
    },
    search: function(options, cb) {
      self._search('', options, cb);
    }
  };
});


/****** Private Functions ******/

ImapConnection.prototype._fnTmrConn = function(loginCb) {
  loginCb(new Error('Connection timed out'));
  this._state.conn.close();
}

ImapConnection.prototype._store = function(which, uids, flags, isAdding, cb) {
  if (this._state.status !== STATES.BOXSELECTED)
    throw new Error('No mailbox is currently selected');
  if (uids === undefined)
    throw new Error('The message ID(s) must be specified');

  if (!Array.isArray(uids))
    uids = [uids];
  validateUIDList(uids);

  if ((!Array.isArray(flags) && typeof flags !== 'string')
      || (Array.isArray(flags) && flags.length === 0))
    throw new Error((isKeywords ? 'Keywords' : 'Flags')
                    + ' argument must be a string or a non-empty Array');
  if (!Array.isArray(flags))
    flags = [flags];
  // Disabling the guard logic right now because it's not needed and we're
  // removing the distinction between keywords and flags.  However, it does
  // seem like a good idea for the protocol layer to check this, so not just
  // actually deleting it right now.
  /*
  for (var i=0; i<flags.length; i++) {
    if (!isKeywords) {
      if (this._state.box.permFlags.indexOf(flags[i]) === -1
          || flags[i] === '\\*' || flags[i] === '*')
        throw new Error('The flag "' + flags[i]
                        + '" is not allowed by the server for this mailbox');
    } else {
      // keyword contains any char except control characters (%x00-1F and %x7F)
      // and: '(', ')', '{', ' ', '%', '*', '\', '"', ']'
      if (/[\(\)\{\\\"\]\%\*\x00-\x20\x7F]/.test(flags[i])) {
        throw new Error('The keyword "' + flags[i]
                        + '" contains invalid characters');
      }
    }
  }
  */
  flags = flags.join(' ');
  cb = arguments[arguments.length-1];

  this._send(which + 'STORE',
             ' ' + uids.join(',') + ' ' + (isAdding ? '+' : '-')
             + 'FLAGS.SILENT (' + flags + ')', cb);
};

ImapConnection.prototype._login = function(cb) {
  var self = this,
      fnReturn = function(err) {
        if (!err) {
          self._state.status = STATES.AUTH;
          if (self._state.numCapRecvs !== 2) {
            // fetch post-auth server capabilities if they were not
            // automatically provided after login
            self._send('CAPABILITY', null, cb);
            return;
          }
        }
        cb(err);
      };
  if (this._state.status === STATES.NOAUTH) {
    if (this.capabilities.indexOf('LOGINDISABLED') > -1) {
      cb(new Error('Logging in is disabled on this server'));
      return;
    }

    if (this.capabilities.indexOf('AUTH=XOAUTH') !== -1 &&
        'xoauth' in this._options)
      this._send('AUTHENTICATE XOAUTH',
                 ' ' + escape(this._options.xoauth), fnReturn);
    else if (this.capabilities.indexOf('AUTH=PLAIN') !== -1) {
      this._send('LOGIN', ' "' + escape(this._options.username) + '" "'
                 + escape(this._options.password) + '"', fnReturn);
    } else {
      return cb(new Error('Unsupported authentication mechanism(s) detected. '
                          + 'Unable to login.'));
    }
  }
};
ImapConnection.prototype._reset = function() {
  clearTimeout(this._state.tmrKeepalive);
  clearTimeout(this._state.tmrConn);
  this._state.status = STATES.NOCONNECT;
  this._state.numCapRecvs = 0;
  this._state.requests = [];
  this._state.isIdle = true;
  this._state.isReady = false;
  this._state.ext.idle.state = IDLE_NONE;
  this._state.ext.idle.timeWaited = 0;

  this.namespaces = { personal: [], other: [], shared: [] };
  this.delim = null;
  this.capabilities = [];
  this._resetBox();
};
ImapConnection.prototype._resetBox = function() {
  this._state.box._uidnext = 0;
  this._state.box.validity = 0;
  this._state.box.highestModSeq = null;
  this._state.box._flags = [];
  this._state.box._newKeywords = false;
  this._state.box.permFlags = [];
  this._state.box.keywords = [];
  this._state.box.name = null;
  this._state.box.messages.total = 0;
  this._state.box.messages.new = 0;
};
ImapConnection.prototype._noop = function() {
  if (this._state.status >= STATES.AUTH)
    this._send('NOOP', null);
};
// bypass=true means to not push a command.  This is used exclusively for the
// auto-idle functionality.  IDLE happens automatically when nothing else is
// going on and automatically refreshes every 29 minutes.
//
// dispatchFunc is a function to invoke when the command is actually dispatched;
// there was at least a potential state maintenance inconsistency with opening
// folders prior to this.
ImapConnection.prototype._send = function(cmdstr, cmddata, cb, dispatchFunc,
                                          bypass) {
  if (cmdstr !== undefined && !bypass)
    this._state.requests.push(
      {
        prefix: null,
        command: cmdstr,
        cmddata: cmddata,
        callback: cb,
        dispatch: dispatchFunc,
        args: []
      });
  // If we are currently transitioning to/from idle, then wait around for the
  // server's response before doing anything more.
  if (this._state.ext.idle.state === IDLE_WAIT ||
      this._state.ext.idle.state === DONE_WAIT)
    return;
  // only do something if this was 1) an attempt to kick us to run the next
  // command, 2) the first/only command (none are pending), or 3) a bypass.
  if ((cmdstr === undefined && this._state.requests.length) ||
      this._state.requests.length === 1 || bypass) {
    var prefix = '', cmd = (bypass ? cmdstr : this._state.requests[0].command),
        data = (bypass ? null : this._state.requests[0].cmddata),
        dispatch = (bypass ? null : this._state.requests[0].dispatch);
    clearTimeout(this._state.tmrKeepalive);
    // If we are currently in IDLE, we need to exit it before we send the
    // actual command.  We mark it as a bypass so it does't mess with the
    // list of requests.
    if (this._state.ext.idle.state === IDLE_READY && cmd !== 'DONE')
      return this._send('DONE', null, undefined, undefined, true);
    else if (cmd === 'IDLE') {
       // we use a different prefix to differentiate and disregard the tagged
       // response the server will send us when we issue DONE
      prefix = 'IDLE ';
      this._state.ext.idle.state = IDLE_WAIT;
    }
    else if (cmd === 'DONE') {
      this._state.ext.idle.state = DONE_WAIT;
    }
    if (cmd !== 'IDLE' && cmd !== 'DONE') {
      prefix = 'A' + ++this._state.curId + ' ';
      if (!bypass)
        this._state.requests[0].prefix = prefix;
    }

    if (dispatch)
      dispatch();

    // We want our send to happen in a single packet; nagle is disabled by
    // default and at least on desktop-class machines, we are sending out one
    // packet per send call.
    var iWrite = 0, iSrc;
    for (iSrc = 0; iSrc < prefix.length; iSrc++) {
      gSendBuf[iWrite++] = prefix.charCodeAt(iSrc);
    }
    for (iSrc = 0; iSrc < cmd.length; iSrc++) {
      gSendBuf[iWrite++] = cmd.charCodeAt(iSrc);
    }
    if (data) {
      // fits in buffer
      if (data.length < gSendBuf.length - 2) {
        if (typeof(data) === 'string') {
          for (iSrc = 0; iSrc < data.length; iSrc++) {
            gSendBuf[iWrite++] = data.charCodeAt(iSrc);
          }
        }
        else {
          gSendBuf.set(data, iWrite);
          iWrite += data.length;
        }
      }
      // does not fit in buffer, just do separate writes...
      else {
        this._state.conn.send(gSendBuf.subarray(0, iWrite));
        if (typeof(data) === 'string')
          this._state.conn.send(Buffer(data));
        else
          this._state.conn.send(data);
        this._state.conn.send(CRLF_BUFFER);
        // set to zero to tell ourselves we don't need to send...
        iWrite = 0;
      }
    }
    if (iWrite) {
      gSendBuf[iWrite++] = 13;
      gSendBuf[iWrite++] = 10;
      this._state.conn.send(gSendBuf.subarray(0, iWrite));
    }

    if (this._LOG) { if (!bypass) this._LOG.cmd_begin(prefix, cmd, /^LOGIN$/.test(cmd) ? '***BLEEPING OUT LOGON***' : data); else this._LOG.bypassCmd(prefix, cmd);}

  }
};

function ImapMessage() {}
util.inherits(ImapMessage, EventEmitter);
function ImapFetch() {}
util.inherits(ImapFetch, EventEmitter);

/****** Utility Functions ******/

function buildSearchQuery(options, extensions, isOrChild) {
  var searchargs = '';
  for (var i=0,len=options.length; i<len; i++) {
    var criteria = (isOrChild ? options : options[i]),
        args = null,
        modifier = (isOrChild ? '' : ' ');
    if (typeof criteria === 'string')
      criteria = criteria.toUpperCase();
    else if (Array.isArray(criteria)) {
      if (criteria.length > 1)
        args = criteria.slice(1);
      if (criteria.length > 0)
        criteria = criteria[0].toUpperCase();
    } else
      throw new Error('Unexpected search option data type. '
                      + 'Expected string or array. Got: ' + typeof criteria);
    if (criteria === 'OR') {
      if (args.length !== 2)
        throw new Error('OR must have exactly two arguments');
      searchargs += ' OR (' + buildSearchQuery(args[0], extensions, true) + ') ('
                    + buildSearchQuery(args[1], extensions, true) + ')'
    } else {
      if (criteria[0] === '!') {
        modifier += 'NOT ';
        criteria = criteria.substr(1);
      }
      switch(criteria) {
        // -- Standard criteria --
        case 'ALL':
        case 'ANSWERED':
        case 'DELETED':
        case 'DRAFT':
        case 'FLAGGED':
        case 'NEW':
        case 'SEEN':
        case 'RECENT':
        case 'OLD':
        case 'UNANSWERED':
        case 'UNDELETED':
        case 'UNDRAFT':
        case 'UNFLAGGED':
        case 'UNSEEN':
          searchargs += modifier + criteria;
        break;
        case 'BCC':
        case 'BODY':
        case 'CC':
        case 'FROM':
        case 'SUBJECT':
        case 'TEXT':
        case 'TO':
          if (!args || args.length !== 1)
            throw new Error('Incorrect number of arguments for search option: '
                            + criteria);
          searchargs += modifier + criteria + ' "' + escape(''+args[0]) + '"';
        break;
        case 'BEFORE':
        case 'ON':
        case 'SENTBEFORE':
        case 'SENTON':
        case 'SENTSINCE':
        case 'SINCE':
          if (!args || args.length !== 1)
            throw new Error('Incorrect number of arguments for search option: '
                            + criteria);
          else if (!(args[0] instanceof Date)) {
            if ((args[0] = new Date(args[0])).toString() === 'Invalid Date')
              throw new Error('Search option argument must be a Date object'
                              + ' or a parseable date string');
          }
          searchargs += modifier + criteria + ' ' + args[0].getDate() + '-'
                        + MONTHS[args[0].getMonth()] + '-'
                        + args[0].getFullYear();
        break;
        case 'KEYWORD':
        case 'UNKEYWORD':
          if (!args || args.length !== 1)
            throw new Error('Incorrect number of arguments for search option: '
                            + criteria);
          searchargs += modifier + criteria + ' ' + args[0];
        break;
        case 'LARGER':
        case 'SMALLER':
          if (!args || args.length !== 1)
            throw new Error('Incorrect number of arguments for search option: '
                            + criteria);
          var num = parseInt(args[0]);
          if (isNaN(num))
            throw new Error('Search option argument must be a number');
          searchargs += modifier + criteria + ' ' + args[0];
        break;
        case 'HEADER':
          if (!args || args.length !== 2)
            throw new Error('Incorrect number of arguments for search option: '
                            + criteria);
          searchargs += modifier + criteria + ' "' + escape(''+args[0]) + '" "'
                        + escape(''+args[1]) + '"';
        break;
        case 'UID':
          if (!args)
            throw new Error('Incorrect number of arguments for search option: '
                            + criteria);
          validateUIDList(args);
          searchargs += modifier + criteria + ' ' + args.join(',');
        break;
        // -- Extensions criteria --
        case 'X-GM-MSGID': // Gmail unique message ID
        case 'X-GM-THRID': // Gmail thread ID
          if (extensions.indexOf('X-GM-EXT-1') === -1)
            throw new Error('IMAP extension not available: ' + criteria);
          var val;
          if (!args || args.length !== 1)
            throw new Error('Incorrect number of arguments for search option: '
                            + criteria);
          else {
            val = ''+args[0];
            if (!(/^\d+$/.test(args[0])))
              throw new Error('Invalid value');
          }
          searchargs += modifier + criteria + ' ' + val;
        break;
        case 'X-GM-RAW': // Gmail search syntax
          if (extensions.indexOf('X-GM-EXT-1') === -1)
            throw new Error('IMAP extension not available: ' + criteria);
          if (!args || args.length !== 1)
            throw new Error('Incorrect number of arguments for search option: '
                            + criteria);
          searchargs += modifier + criteria + ' "' + escape(''+args[0]) + '"';
        break;
        case 'X-GM-LABELS': // Gmail labels
          if (extensions.indexOf('X-GM-EXT-1') === -1)
            throw new Error('IMAP extension not available: ' + criteria);
          if (!args || args.length !== 1)
            throw new Error('Incorrect number of arguments for search option: '
                            + criteria);
          searchargs += modifier + criteria + ' ' + args[0];
        break;
        default:
          throw new Error('Unexpected search option: ' + criteria);
      }
    }
    if (isOrChild)
      break;
  }
  return searchargs;
}

function validateUIDList(uids) {
  for (var i=0,len=uids.length,intval; i<len; i++) {
    if (typeof uids[i] === 'string') {
      if (uids[i] === '*' || uids[i] === '*:*') {
        if (len > 1)
          uids = ['*'];
        break;
      } else if (/^(?:[\d]+|\*):(?:[\d]+|\*)$/.test(uids[i]))
        continue;
    }
    intval = parseInt(''+uids[i]);
    if (isNaN(intval)) {
      throw new Error('Message ID/number must be an integer, "*", or a range: '
                      + uids[i]);
    } else if (typeof uids[i] !== 'number')
      uids[i] = intval;
  }
}

/**
 * Parse a UID list string (which can include ranges) into an array of integers
 * (without ranges).  This should not be used in cases where "*" is allowed.
 */
function parseUIDListString(str) {
  var uids = [];
  if (!str.length)
    return uids;
  // the first character has to be a digit.
  var uidStart = 0, rangeStart = -1, rangeEnd, uid;
  for (var i = 1; i < str.length; i++) {
    var c = str.charCodeAt(i);
    // ':'
    if (c === 48) {
      rangeStart = parseInt(str.substring(uidStart, i));
      uidStart = ++i; // the next char must be a digit
    }
    // ','
    else if (c === '44') {
      if (rangeStart === -1) {
        uids.push(parseInt(str.substring(uidStart, i)));
      }
      else {
        rangeEnd = parseInt(str.substring(uidStart, i));
        for (uid = rangeStart; uid <= rangeEnd; uid++) {
          uids.push(uid);
        }
      }
      rangeStart = -1;
      start = ++i; // the next char must be a digit
    }
    // (digit!)
  }
  // we ran out of characters!  something must still be active
  if (rangeStart === -1) {
    uids.push(parseInt(str.substring(uidStart, i)));
  }
  else {
    rangeEnd = parseInt(str.substring(uidStart, i));
    for (uid = rangeStart; uid <= rangeEnd; uid++) {
      uids.push(uid);
    }
  }
  return uids;
}

function parseNamespaces(str, namespaces) {
  var result = parseExpr(str);
  for (var grp=0; grp<3; ++grp) {
    if (Array.isArray(result[grp])) {
      var vals = [];
      for (var i=0,len=result[grp].length; i<len; ++i) {
        var val = { prefix: result[grp][i][0], delim: result[grp][i][1] };
        if (result[grp][i].length > 2) {
          // extension data
          val.extensions = [];
          for (var j=2,len2=result[grp][i].length; j<len2; j+=2) {
            val.extensions.push({
              name: result[grp][i][j],
              flags: result[grp][i][j+1]
            });
          }
        }
        vals.push(val);
      }
      if (grp === 0)
        namespaces.personal = vals;
      else if (grp === 1)
        namespaces.other = vals;
      else if (grp === 2)
        namespaces.shared = vals;
    }
  }
}

function parseFetch(str, literalData, fetchData) {
  var key, idxNext, result = parseExpr(str);
  for (var i=0,len=result.length; i<len; i+=2) {
    if (result[i] === 'UID')
      fetchData.id = parseInt(result[i+1], 10);
    else if (result[i] === 'INTERNALDATE')
      fetchData.date = parseImapDateTime(result[i+1]);
    else if (result[i] === 'FLAGS') {
      fetchData.flags = result[i+1].filter(isNotEmpty);
      // simplify comparison for downstream logic by sorting.
      fetchData.flags.sort();
    }
    // MODSEQ (####)
    else if (result[i] === 'MODSEQ')
      fetchData.modseq = result[i+1].slice(1, -1);
    else if (result[i] === 'BODYSTRUCTURE')
      fetchData.structure = parseBodyStructure(result[i+1]);
    else if (typeof result[i] === 'string') // simple extensions
      fetchData[result[i].toLowerCase()] = result[i+1];
    else if (Array.isArray(result[i]) && typeof result[i][0] === 'string' &&
             result[i][0].indexOf('HEADER') === 0 && literalData) {
      var mparser = new mailparser.MailParser();
      mparser._remainder = literalData;
      // invoke mailparser's logic in a fully synchronous fashion
      process.immediate = true;
      mparser._process(true);
      process.immediate = false;
      /*
      var headers = literalData.split(/\r\n(?=[\w])/), header;
      fetchData.headers = {};
      for (var j=0,len2=headers.length; j<len2; ++j) {
        header = headers[j].substring(0, headers[j].indexOf(': ')).toLowerCase();
        if (!fetchData.headers[header])
          fetchData.headers[header] = [];
        fetchData.headers[header].push(headers[j].substr(headers[j]
                                                 .indexOf(': ')+2)
                                                 .replace(/\r\n/g, '').trim());
      }
      */
      fetchData.msg = mparser._currentNode;
    }
  }
}

function parseBodyStructure(cur, prefix, partID) {
  var ret = [];
  if (prefix === undefined) {
    var result = (Array.isArray(cur) ? cur : parseExpr(cur));
    if (result.length)
      ret = parseBodyStructure(result, '', 1);
  } else {
    var part, partLen = cur.length, next;
    if (Array.isArray(cur[0])) { // multipart
      next = -1;
      while (Array.isArray(cur[++next])) {
        ret.push(parseBodyStructure(cur[next], prefix
                                               + (prefix !== '' ? '.' : '')
                                               + (partID++).toString(), 1));
      }
      part = { type: cur[next++].toLowerCase() };
      if (partLen > next) {
        if (Array.isArray(cur[next])) {
          part.params = {};
          for (var i=0,len=cur[next].length; i<len; i+=2)
            part.params[cur[next][i].toLowerCase()] = cur[next][i+1];
        } else
          part.params = cur[next];
        ++next;
      }
    } else { // single part
      next = 7;
      if (typeof cur[1] === 'string') {
        part = {
          // the path identifier for this part, useful for fetching specific
          // parts of a message
          partID: (prefix !== '' ? prefix : '1'),

          // required fields as per RFC 3501 -- null or otherwise
          type: cur[0].toLowerCase(), subtype: cur[1].toLowerCase(),
          params: null, id: cur[3], description: cur[4], encoding: cur[5],
          size: cur[6]
        }
      } else {
        // type information for malformed multipart body
        part = { type: cur[0].toLowerCase(), params: null };
        cur.splice(1, 0, null);
        ++partLen;
        next = 2;
      }
      if (Array.isArray(cur[2])) {
        part.params = {};
        for (var i=0,len=cur[2].length; i<len; i+=2)
          part.params[cur[2][i].toLowerCase()] = cur[2][i+1];
        if (cur[1] === null)
          ++next;
      }
      if (part.type === 'message' && part.subtype === 'rfc822') {
        // envelope
        if (partLen > next && Array.isArray(cur[next])) {
          part.envelope = {};
          for (var i=0,field,len=cur[next].length; i<len; ++i) {
            if (i === 0)
              part.envelope.date = cur[next][i];
            else if (i === 1)
              part.envelope.subject = cur[next][i];
            else if (i >= 2 && i <= 7) {
              var val = cur[next][i];
              if (Array.isArray(val)) {
                var addresses = [], inGroup = false, curGroup;
                for (var j=0,len2=val.length; j<len2; ++j) {
                  if (val[j][3] === null) { // start group addresses
                    inGroup = true;
                    curGroup = {
                      group: val[j][2],
                      addresses: []
                    };
                  } else if (val[j][2] === null) { // end of group addresses
                    inGroup = false;
                    addresses.push(curGroup);
                  } else { // regular user address
                    var info = {
                      name: val[j][0],
                      mailbox: val[j][2],
                      host: val[j][3]
                    };
                    if (inGroup)
                      curGroup.addresses.push(info);
                    else
                      addresses.push(info);
                  }
                }
                val = addresses;
              }
              if (i === 2)
                part.envelope.from = val;
              else if (i === 3)
                part.envelope.sender = val;
              else if (i === 4)
                part.envelope['reply-to'] = val;
              else if (i === 5)
                part.envelope.to = val;
              else if (i === 6)
                part.envelope.cc = val;
              else if (i === 7)
                part.envelope.bcc = val;
            } else if (i === 8)
              // message ID being replied to
              part.envelope['in-reply-to'] = cur[next][i];
            else if (i === 9)
              part.envelope['message-id'] = cur[next][i];
            else
              break;
          }
        } else
          part.envelope = null;
        ++next;

        // body
        if (partLen > next && Array.isArray(cur[next])) {
          part.body = parseBodyStructure(cur[next], prefix
                                                    + (prefix !== '' ? '.' : '')
                                                    + (partID++).toString(), 1);
        } else
          part.body = null;
        ++next;
      }
      if ((part.type === 'text'
           || (part.type === 'message' && part.subtype === 'rfc822'))
          && partLen > next)
        part.lines = cur[next++];
      if (typeof cur[1] === 'string' && partLen > next)
        part.md5 = cur[next++];
    }
    // add any extra fields that may or may not be omitted entirely
    parseStructExtra(part, partLen, cur, next);
    ret.unshift(part);
  }
  return ret;
}

function parseStructExtra(part, partLen, cur, next) {
  if (partLen > next) {
    // disposition
    // null or a special k/v list with these kinds of values:
    // e.g.: ['inline', null]
    //       ['attachment', null]
    //       ['inline', ['filename', 'foo.pdf']]
    //       ['inline', ['Bar', 'Baz', 'Bam', 'Pow']]
    if (Array.isArray(cur[next])) {
      part.disposition = {type: cur[next][0], params: null};
      if (Array.isArray(cur[next][1])) {
        var params = part.disposition.params = {};
        for (var i=0,len=cur[next][1].length; i<len; i+=2)
          params[cur[next][1][i].toLowerCase()] = cur[next][1][i+1];
      }
    } else
      part.disposition = cur[next];
    ++next;
  }
  if (partLen > next) {
    // language can be a string or a list of one or more strings, so let's
    // make this more consistent ...
    if (cur[next] !== null)
      part.language = (Array.isArray(cur[next]) ? cur[next] : [cur[next]]);
    else
      part.language = null;
    ++next;
  }
  if (partLen > next)
    part.location = cur[next++];
  if (partLen > next) {
    // extension stuff introduced by later RFCs
    // this can really be any value: a string, number, or (un)nested list
    // let's not parse it for now ...
    part.extensions = cur[next];
  }
}

function stringExplode(string, delimiter, limit) {
  if (arguments.length < 3 || arguments[1] === undefined
      || arguments[2] === undefined
      || !delimiter || delimiter === '' || typeof delimiter === 'function'
      || typeof delimiter === 'object')
      return false;

  delimiter = (delimiter === true ? '1' : delimiter.toString());

  if (!limit || limit === 0)
    return string.split(delimiter);
  else if (limit < 0)
    return false;
  else if (limit > 0) {
    var splitted = string.split(delimiter);
    var partA = splitted.splice(0, limit - 1);
    var partB = splitted.join(delimiter);
    partA.push(partB);
    return partA;
  }

  return false;
}

function isNotEmpty(str) {
  return str.trim().length > 0;
}

function escape(str) {
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function unescape(str) {
  return str.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
}

function up(str) {
  return str.toUpperCase();
}

function parseExpr(o, result, start) {
  start = start || 0;
  var inQuote = false, lastPos = start - 1, isTop = false;
  if (!result)
    result = new Array();
  if (typeof o === 'string') {
    var state = new Object();
    state.str = o;
    o = state;
    isTop = true;
  }
  for (var i=start,len=o.str.length; i<len; ++i) {
    if (!inQuote) {
      if (o.str[i] === '"')
        inQuote = true;
      else if (o.str[i] === ' ' || o.str[i] === ')' || o.str[i] === ']') {
        if (i - (lastPos+1) > 0)
          result.push(convStr(o.str.substring(lastPos+1, i)));
        if (o.str[i] === ')' || o.str[i] === ']')
          return i;
        lastPos = i;
      } else if (o.str[i] === '(' || o.str[i] === '[') {
        var innerResult = [];
        i = parseExpr(o, innerResult, i+1);
        lastPos = i;
        result.push(innerResult);
      }
    } else if (o.str[i] === '"' &&
               (o.str[i-1] &&
                (o.str[i-1] !== '\\' || (o.str[i-2] && o.str[i-2] === '\\'))))
      inQuote = false;
    if (i+1 === len && len - (lastPos+1) > 0)
      result.push(convStr(o.str.substring(lastPos+1)));
  }
  return (isTop ? result : start);
}

function convStr(str) {
  if (str[0] === '"')
    return str.substring(1, str.length-1);
  else if (str === 'NIL')
    return null;
  else if (/^\d+$/.test(str)) {
    // some IMAP extensions utilize large (64-bit) integers, which JavaScript
    // can't handle natively, so we'll just keep it as a string if it's too big
    var val = parseInt(str, 10);
    return (val.toString() === str ? val : str);
  } else
    return str;
}

/**
 * Adopted from jquery's extend method. Under the terms of MIT License.
 *
 * http://code.jquery.com/jquery-1.4.2.js
 *
 * Modified by Brian White to use Array.isArray instead of the custom isArray
 * method
 */
function extend() {
  // copy reference to target object
  var target = arguments[0] || {},
      i = 1,
      length = arguments.length,
      deep = false,
      options,
      name,
      src,
      copy;

  // Handle a deep copy situation
  if (typeof target === "boolean") {
    deep = target;
    target = arguments[1] || {};
    // skip the boolean and the target
    i = 2;
  }

  // Handle case when target is a string or something (possible in deep copy)
  if (typeof target !== "object" && !typeof target === 'function')
    target = {};

  var isPlainObject = function(obj) {
    // Must be an Object.
    // Because of IE, we also have to check the presence of the constructor
    // property.
    // Make sure that DOM nodes and window objects don't pass through, as well
    if (!obj || toString.call(obj) !== "[object Object]" || obj.nodeType
        || obj.setInterval)
      return false;

    var has_own_constructor = hasOwnProperty.call(obj, "constructor");
    var has_is_prop_of_method = hasOwnProperty.call(obj.constructor.prototype,
                                                    "isPrototypeOf");
    // Not own constructor property must be Object
    if (obj.constructor && !has_own_constructor && !has_is_prop_of_method)
      return false;

    // Own properties are enumerated firstly, so to speed up,
    // if last one is own, then all properties are own.

    var last_key;
    for (var key in obj)
      last_key = key;

    return last_key === undefined || hasOwnProperty.call(obj, last_key);
  };


  for (; i < length; i++) {
    // Only deal with non-null/undefined values
    if ((options = arguments[i]) !== null) {
      // Extend the base object
      for (name in options) {
        src = target[name];
        copy = options[name];

        // Prevent never-ending loop
        if (target === copy)
            continue;

        // Recurse if we're merging object literal values or arrays
        if (deep && copy && (isPlainObject(copy) || Array.isArray(copy))) {
          var clone = src && (isPlainObject(src) || Array.isArray(src)
                              ? src : (Array.isArray(copy) ? [] : {}));

          // Never move original objects, clone them
          target[name] = extend(deep, clone, copy);

        // Don't bring in undefined values
        } else if (copy !== undefined)
          target[name] = copy;
      }
    }
  }

  // Return the modified object
  return target;
};

function bufferAppend(buf1, buf2) {
  var newBuf = new Buffer(buf1.length + buf2.length);
  buf1.copy(newBuf, 0, 0);
  if (Buffer.isBuffer(buf2))
    buf2.copy(newBuf, buf1.length, 0);
  else if (Array.isArray(buf2)) {
    for (var i=buf1.length, len=buf2.length; i<len; i++)
      newBuf[i] = buf2[i];
  }

  return newBuf;
};

/**
 * Split the contents of a buffer on CRLF pairs, retaining the CRLF's on all but
 * the first line. In other words, ret[1] through ret[ret.length-1] will have
 * CRLF's.  The last entry may or may not have a CRLF.  The last entry will have
 * a non-zero length.
 *
 * This logic is very specialized to its one caller...
 */
function customBufferSplitCRLF(buf) {
  var ret = [];
  var effLen = buf.length - 1, start = 0;
  for (var i = 0; i < effLen;) {
    if (buf[i] === 13 && buf[i + 1] === 10) {
      // do include the CRLF in the entry if this is not the first one.
      if (ret.length) {
        i += 2;
        ret.push(buf.slice(start, i));
      }
      else {
        ret.push(buf.slice(start, i));
        i += 2;
      }
      start = i;
    }
    else {
      i++;
    }
  }
  if (!ret.length)
    ret.push(buf);
  else if (start < buf.length)
    ret.push(buf.slice(start, buf.length));
  return ret;
}

function bufferIndexOfCRLF(buf, start) {
  // It's a 2 character sequence, pointless to check the last character,
  // especially since it would introduce additional boundary checks.
  var effLen = buf.length - 1;
  for (var i = start || 0; i < effLen; i++) {
    if (buf[i] === 13 && buf[i + 1] === 10)
      return i;
  }
  return -1;
}

var LOGFAB = exports.LOGFAB = $log.register(module, {
  ImapProtoConn: {
    type: $log.CONNECTION,
    subtype: $log.CLIENNT,
    events: {
      connected: {},
      closed: {},
      sendData: { length: false },
      bypassCmd: { prefix: false, cmd: false },
      data: { length: false },
    },
    TEST_ONLY_events: {
      sendData: { data: false },
      // This may be a Buffer and therefore need to be coerced
      data: { data: $log.TOSTRING },
    },
    errors: {
      connError: { err: $log.EXCEPTION },
      bad: { msg: false },
      unknownResponse: { d0: false, d1: false, d2: false },
    },
    asyncJobs: {
      cmd: { prefix: false, cmd: false },
    },
    TEST_ONLY_asyncJobs: {
      cmd: { data: false },
    },
  },
}); // end LOGFAB

});

/**
 * Validates connection information for an account and verifies the server on
 * the other end is something we are capable of sustaining an account with.
 * Before growing this logic further, first try reusing/adapting/porting the
 * Thunderbird autoconfiguration logic.
 **/

define('rdimap/imapclient/imapprobe',[
    'imap',
    'exports'
  ],
  function(
    $imap,
    exports
  ) {

/**
 * Right now our tests consist of:
 * - logging in to test the credentials
 *
 * If we succeed at that, we hand off the established connection to our caller
 * so they can reuse it.
 */
function ImapProber(credentials, connInfo, _LOG) {
  var opts = {
    host: connInfo.hostname,
    port: connInfo.port,
    crypto: connInfo.crypto,

    username: credentials.username,
    password: credentials.password,
  };
  if (_LOG)
    opts._logParent = _LOG;

  console.log("PROBE:IMAP attempting to connect to", connInfo.hostname);
  this._conn = new $imap.ImapConnection(opts);
  this._conn.connect(this.onConnect.bind(this));
  // The login callback will get the error, but EventEmitter will freak out if
  // we don't register a handler for the error, so just do that.
  this._conn.on('error', function() {});

  this.onresult = null;
  this.accountGood = null;
}
exports.ImapProber = ImapProber;
ImapProber.prototype = {
  onConnect: function ImapProber_onConnect(err) {
    if (err) {
      console.warn("PROBE:IMAP sad");
      this.accountGood = false;
      this._conn = null;
    }
    else {
      console.log("PROBE:IMAP happy");
      this.accountGood = true;
    }

    var conn = this._conn;
    this._conn = null;

    if (this.onresult)
      this.onresult(this.accountGood, conn);
  },
};

}); // end define
;
/**
 * Abstractions for dealing with the various mutation operations.
 *
 * NB: Moves discussion is speculative at this point; we are just thinking
 * things through for architectural implications.
 *
 * == Speculative Operations ==
 *
 * We want our UI to update as soon after requesting an operation as possible.
 * To this end, we have logic to locally apply queued mutation operations.
 * Because we may want to undo operations when we are offline (and have not
 * been able to talk to the server), we also need to be able to reflect these
 * changes locally independent of telling the server.
 *
 * In the case of moves/copies, we issue temporary UIDs like Thunderbird.  We
 * use negative values since IMAP servers can never use them so collisions are
 * impossible and it's a simple check.  This differs from Thunderbird's attempt
 * to guess the next UID; we don't try to do that because the chances are good
 * that our information is out-of-date and it would just make debugging more
 * confusing.
 *
 * == Data Integrity ==
 *
 * Our strategy is always to avoid data-loss, so data-destruction actions
 * must always take place after successful confirmation of persistence actions.
 * (Just keeping the data in-memory is not acceptable because we could crash,
 * etc.)
 *
 * It is also our strategy to avoid cluttering up the place as a side-effect
 * of half-done things.  For example, if we are trying to move N messages,
 * but only copy N/2 because of a timeout, we want to make sure that we
 * don't naively retry and then copy those first N/2 messages a second time.
 * This means that we track sub-steps explicitly, and that operations that we
 * have issued and may or may not have been performed by the server will be
 * checked before they are re-attempted.
 **/

define('rdimap/imapclient/imapjobs',[
    './util',
    'exports'
  ],
  function(
    $imaputil,
    exports
  ) {

/**
 * The evidence suggests the job has not yet been performed.
 */
const CHECKED_NOTYET = 1;
/**
 * The operation is idempotent and atomic; no checking was performed.
 */
const UNCHECKED_IDEMPOTENT = 2;
/**
 * The evidence suggests that the job has already happened.
 */
const CHECKED_HAPPENED = 3;
/**
 * The job is no longer relevant because some other sequence of events
 * have mooted it.  For example, we can't change tags on a deleted message
 * or move a message between two folders if it's in neither folder.
 */
const CHECKED_MOOT = 4;
/**
 * A transient error (from the checker's perspective) made it impossible to
 * check.
 */
const UNCHECKED_BAILED = 5;

function ImapJobDriver(account) {
  this.account = account;
}
exports.ImapJobDriver = ImapJobDriver;
ImapJobDriver.prototype = {
  /**
   * Request access to an IMAP folder to perform a mutation on it.  This
   * compels the ImapFolderConn in question to acquire an IMAP connection
   * if it does not already have one.  It will also XXX EVENTUALLY provide
   * mututal exclusion guarantees that there are no other active requests
   * in the folder.
   *
   * The callback will be invoked with the folder and raw connections once
   * they are available.  The raw connection will be actively in the folder.
   *
   * This will ideally be migrated to whatever mechanism we end up using for
   * mailjobs.
   */
  _accessFolderForMutation: function(folderId, callback) {
    var storage = this.account.getFolderStorageForFolderId(folderId);
    // XXX have folder storage be in charge of this / don't violate privacy
    storage._pendingMutationCount++;
    if (!storage.folderConn._conn) {
      storage.folderConn.acquireConn(callback);
    }
    else {
      callback(storage.folderConn);
    }
  },

  _doneMutatingFolder: function(folderId, folderConn) {
    var storage = this.account.getFolderStorageForFolderId(folderId);
    // XXX have folder storage be in charge of this / don't violate privacy
    storage._pendingMutationCount--;
    if (!storage._slices.length && !storage._pendingMutationCount)
      storage.folderConn.relinquishConn();
  },

  local_do_modtags: function(op, ignoredCallback, undo) {
    var addTags = undo ? op.removeTags : op.addTags,
        removeTags = undo ? op.addTags : op.removeTags;
    function modifyHeader(header) {
      var iTag, tag, existing, modified = false;
      if (addTags) {
        for (iTag = 0; iTag < addTags.length; iTag++) {
          tag = addTags[iTag];
          // The list should be small enough that native stuff is better than
          // JS bsearch.
          existing = header.flags.indexOf(tag);
          if (existing !== -1)
            continue;
          header.flags.push(tag);
          header.flags.sort(); // (maintain sorted invariant)
          modified = true;
        }
      }
      if (removeTags) {
        for (iTag = 0; iTag < removeTags.length; iTag++) {
          tag = removeTags[iTag];
          existing = header.flags.indexOf(tag);
          if (existing === -1)
            continue;
          header.flags.splice(existing, 1);
          modified = true;
        }
      }
      return modified;
    }

    var lastFolderId = null, lastStorage;
    for (var i = 0; i < op.messages.length; i++) {
      var msgNamer = op.messages[i],
          lslash = msgNamer.suid.lastIndexOf('/'),
          // folder id's are strings!
          folderId = msgNamer.suid.substring(0, lslash),
          // uid's are not strings!
          uid = parseInt(msgNamer.suid.substring(lslash + 1)),
          storage;
      if (folderId === lastFolderId) {
        storage = lastStorage;
      }
      else {
        storage = lastStorage =
          this.account.getFolderStorageForFolderId(folderId);
        lastFolderId = folderId;
      }
      storage.updateMessageHeader(msgNamer.date, uid, false, modifyHeader);
    }

    return null;
  },

  do_modtags: function(op, callback, undo) {
    var partitions = $imaputil.partitionMessagesByFolderId(op.messages, true);
    var folderConn, self = this,
        folderId = null, messages = null,
        iNextPartition = 0, curPartition = null, modsToGo = 0;

    var addTags = undo ? op.removeTags : op.addTags,
        removeTags = undo ? op.addTags : op.removeTags;

    // Perform the 'undo' in the opposite order of the 'do' so that our progress
    // count is always relative to the normal order.
    if (undo)
      partitions.reverse();

    function openNextFolder() {
      if (iNextPartition >= partitions.length) {
        done(null);
        return;
      }

      curPartition = partitions[iNextPartition++];
      messages = curPartition.messages;
      if (curPartition.folderId !== folderId) {
        if (folderConn) {
          self._doneMutatingFolder(folderId, folderConn);
          folderConn = null;
        }
        folderId = curPartition.folderId;
        self._accessFolderForMutation(folderId, gotFolderConn);
      }
    }
    function gotFolderConn(_folderConn) {
      folderConn = _folderConn;
      if (addTags) {
        modsToGo++;
        folderConn._conn.addFlags(messages, addTags, tagsModded);
      }
      if (removeTags) {
        modsToGo++;
        folderConn._conn.delFlags(messages, removeTags, tagsModded);
      }
    }
    function tagsModded(err) {
      if (err) {
        console.error('failure modifying tags', err);
        done('unknown');
        return;
      }
      op.progress += (undo ? -curPartition.messages.length
                           : curPartition.messages.length);
      if (--modsToGo === 0)
        openNextFolder();
    }
    function done(errString) {
      if (folderConn) {
        self._doneMutatingFolder(folderId, folderConn);
        folderConn = null;
      }
      callback(errString);
    }
    openNextFolder();
  },

  check_modtags: function() {
    return UNCHECKED_IDEMPOTENT;
  },

  local_undo_modtags: function(op, callback) {
    // Undoing is just a question of flipping the add and remove lists.
    return this.local_do_modtags(op, callback, true);
  },

  undo_modtags: function(op, callback) {
    // Undoing is just a question of flipping the add and remove lists.
    return this.do_modtags(op, callback, true);
  },

  /**
   * Move the message to the trash folder.  In Gmail, there is no move target,
   * we just delete it and gmail will (by default) expunge it immediately.
   */
  do_delete: function() {
    // set the deleted flag on the message
  },

  check_delete: function() {
    // deleting on IMAP is effectively idempotent
    return UNCHECKED_IDEMPOTENT;
  },

  undo_delete: function() {
  },

  do_move: function() {
    // get a connection in the source folder, uid validity is asserted
    // issue the (potentially bulk) copy
    // wait for copy success
    // mark the source messages deleted
  },

  check_move: function() {
    // get a connection in the target/source folder
    // do a search to check if the messages got copied across.
  },

  /**
   * Move the message back to its original folder.
   *
   * - If the source message has not been expunged, remove the Deleted flag from
   *   the source folder.
   * - If the source message was expunged, copy the message back to the source
   *   folder.
   * - Delete the message from the target folder.
   */
  undo_move: function() {
  },

  do_copy: function() {
  },

  check_copy: function() {
    // get a connection in the target folder
    // do a search to check if the message got copied across
  },

  /**
   * Delete the message from the target folder if it exists.
   */
  undo_copy: function() {
  },

  /**
   * Append a message to a folder.
   *
   * XXX update
   */
  do_append: function(op, callback) {
    var folderConn, self = this,
        storage = this.account.getFolderStorageForFolderId(op.folderId),
        folderMeta = storage.folderMeta,
        iNextMessage = 0;

    function gotFolderConn(_folderConn) {
      if (!_folderConn) {
        done('unknown');
        return;
      }
      folderConn = _folderConn;
      if (folderConn._conn.hasCapability('MULTIAPPEND'))
        multiappend();
      else
        append();
    }
    function multiappend() {
      iNextMessage = op.messages.length;
      folderConn._conn.multiappend(op.messages, appended);
    }
    function append() {
      var message = op.messages[iNextMessage++];
      folderConn._conn.append(
        message.messageText,
        message, // (it will ignore messageText)
        appended);
    }
    function appended(err) {
      if (err) {
        console.error('failure appending message', err);
        done('unknown');
        return;
      }
      if (iNextMessage < op.messages.length)
        append();
      else
        done(null);
    }
    function done(errString) {
      if (folderConn) {
        self._doneMutatingFolder(op.folderId, folderConn);
        folderConn = null;
      }
      callback(errString);
    }

    this._accessFolderForMutation(op.folderId, gotFolderConn);
  },

  /**
   * Check if the message ended up in the folder.
   */
  check_append: function() {
  },

  undo_append: function() {
  },
};

function HighLevelJobDriver() {
}
HighLevelJobDriver.prototype = {
  /**
   * Perform a cross-folder move:
   *
   * - Fetch the entirety of a message from the source location.
   * - Append the entirety of the message to the target location.
   * - Delete the message from the source location.
   */
  do_xmove: function() {
  },

  check_xmove: function() {

  },

  /**
   * Undo a cross-folder move.  Same idea as for normal undo_move; undelete
   * if possible, re-copy if not.  Delete the target once we're confident
   * the message made it back into the folder.
   */
  undo_xmove: function() {
  },

  /**
   * Perform a cross-folder copy:
   * - Fetch the entirety of a message from the source location.
   * - Append the message to the target location.
   */
  do_xcopy: function() {
  },

  check_xcopy: function() {
  },

  /**
   * Just delete the message from the target location.
   */
  undo_xcopy: function() {
  },
};

}); // end define
;
/**
 * Make our TCPSocket implementation look like node's net library.
 *
 * We make sure to support:
 *
 * Attributes:
 * - encrypted (false, this is not the tls byproduct)
 * - destroyed
 *
 * Methods:
 * - setKeepAlive(Boolean)
 * - write(Buffer)
 * - end
 *
 * Events:
 * - "connect"
 * - "close"
 * - "end"
 * - "data"
 * - "error"
 **/
define('net',['require','exports','module','util','events'],function(require, exports, module) {

var util = require('util'),
    EventEmitter = require('events').EventEmitter;

function NetSocket(port, host, crypto) {
  this._host = host;
  this._port = port;
  this._actualSock = MozTCPSocket.open(
    host, port, { useSSL: crypto, binaryType: 'arraybuffer' });
  EventEmitter.call(this);

  this._actualSock.onopen = this._onconnect.bind(this);
  this._actualSock.onerror = this._onerror.bind(this);
  this._actualSock.ondata = this._ondata.bind(this);
  this._actualSock.onclose = this._onclose.bind(this);
}
exports.NetSocket = NetSocket;
util.inherits(NetSocket, EventEmitter);
NetSocket.prototype.setKeepAlive = function(shouldKeepAlive) {
};
NetSocket.prototype.write = function(buffer) {
  this._actualSock.send(buffer);
};
NetSocket.prototype.end = function() {
  this._actualSock.close();
};

NetSocket.prototype._onconnect = function(event) {
  this.emit('connect', event.data);
};
NetSocket.prototype._onerror = function(event) {
  this.emit('error', event.data);
};
NetSocket.prototype._ondata = function(event) {
  var buffer = Buffer(event.data);
  this.emit('data', buffer);
};
NetSocket.prototype._onclose = function(event) {
  this.emit('close', event.data);
  this.emit('end', event.data);
};


exports.connect = function(port, host) {
  return new NetSocket(port, host, false);
};

}); // end define
;
/**
 *
 **/

define('tls',[
    'net',
    'exports'
  ],
  function(
    $net,
    exports
  ) {

exports.connect = function(port, host, wuh, onconnect) {
  var socky = new $net.NetSocket(port, host, true);
  socky.on('connect', onconnect);
  return socky;
};

}); // end define
;
/**
 *
 **/

define('os',[
    'exports'
  ],
  function(
    exports
  ) {

exports.hostname = function() {
  return 'localhost';
};
exports.getHostname = exports.hostname;

}); // end define
;
define('simplesmtp/lib/starttls',['require','exports','module','crypto','tls'],function (require, exports, module) {
// SOURCE: https://gist.github.com/848444

// Target API:
//
//  var s = require('net').createStream(25, 'smtp.example.com');
//  s.on('connect', function() {
//   require('starttls')(s, options, function() {
//      if (!s.authorized) {
//        s.destroy();
//        return;
//      }
//
//      s.end("hello world\n");
//    });
//  });
//
//

/**
 * @namespace Client STARTTLS module
 * @name starttls
 */
module.exports.starttls = starttls;

/**
 * <p>Upgrades a socket to a secure TLS connection</p>
 * 
 * @memberOf starttls
 * @param {Object} socket Plaintext socket to be upgraded
 * @param {Function} callback Callback function to be run after upgrade
 */
function starttls(socket, callback) {
    var sslcontext, pair, cleartext;
    
    socket.removeAllListeners("data");
    sslcontext = require('crypto').createCredentials();
    pair = require('tls').createSecurePair(sslcontext, false);
    cleartext = pipe(pair, socket);

    pair.on('secure', function() {
        var verifyError = (pair._ssl || pair.ssl).verifyError();

        if (verifyError) {
            cleartext.authorized = false;
            cleartext.authorizationError = verifyError;
        } else {
            cleartext.authorized = true;
        }

        callback(cleartext);
    });

    cleartext._controlReleased = true;
    return pair;
}

function forwardEvents(events, emitterSource, emitterDestination) {
    var map = [], name, handler;
    
    for(var i = 0, len = events.length; i < len; i++) {
        name = events[i];

        handler = forwardEvent.bind(emitterDestination, name);
        
        map.push(name);
        emitterSource.on(name, handler);
    }
    
    return map;
}

function forwardEvent() {
    this.emit.apply(this, arguments);
}

function removeEvents(map, emitterSource) {
    for(var i = 0, len = map.length; i < len; i++){
        emitterSource.removeAllListeners(map[i]);
    }
}

function pipe(pair, socket) {
    pair.encrypted.pipe(socket);
    socket.pipe(pair.encrypted);

    pair.fd = socket.fd;
    
    var cleartext = pair.cleartext;
  
    cleartext.socket = socket;
    cleartext.encrypted = pair.encrypted;
    cleartext.authorized = false;

    function onerror(e) {
        if (cleartext._controlReleased) {
            cleartext.emit('error', e);
        }
    }

    var map = forwardEvents(["timeout", "end", "close", "drain", "error"], socket, cleartext);
  
    function onclose() {
        socket.removeListener('error', onerror);
        socket.removeListener('close', onclose);
        removeEvents(map,socket);
    }

    socket.on('error', onerror);
    socket.on('close', onclose);

    return cleartext;
}
});
define('simplesmtp/lib/client',['require','exports','module','stream','util','net','tls','os','./starttls'],function (require, exports, module) {
// TODO:
// * Lisada timeout serveri ühenduse jaoks

var Stream = require('stream').Stream,
    utillib = require('util'),
    net = require('net'),
    tls = require('tls'),
    oslib = require('os'),
    starttls = require('./starttls').starttls;

// monkey patch net and tls to support nodejs 0.4
if(!net.connect && net.createConnection){
    net.connect = net.createConnection;
}

if(!tls.connect && tls.createConnection){
    tls.connect = tls.createConnection;
}

// expose to the world
module.exports = function(port, host, options){
    var connection = new SMTPClient(port, host, options);
    process.nextTick(connection.connect.bind(connection));
    return connection;
};

/**
 * <p>Generates a SMTP connection object</p>
 *
 * <p>Optional options object takes the following possible properties:</p>
 * <ul>
 *     <li><b>secureConnection</b> - use SSL</li>
 *     <li><b>name</b> - the name of the client server</li>
 *     <li><b>auth</b> - authentication object <code>{user:"...", pass:"..."}</code>
 *     <li><b>ignoreTLS</b> - ignore server support for STARTTLS</li>
 *     <li><b>debug</b> - output client and server messages to console</li>
 *     <li><b>instanceId</b> - unique instance id for debugging</li>
 * </ul>
 *
 * @constructor
 * @namespace SMTP Client module
 * @param {Number} [port=25] Port number to connect to
 * @param {String} [host="localhost"] Hostname to connect to
 * @param {Object} [options] Option properties
 */
function SMTPClient(port, host, options){
    Stream.call(this);
    this.writable = true;
    this.readable = true;

    this.options = options || {};

    this.port = port || (this.options.secureConnection ? 465 : 25);
    this.host = host || "localhost";

    this.options.secureConnection = !!this.options.secureConnection;
    this.options.auth = this.options.auth || false;
    this.options.maxConnections = this.options.maxConnections || 5;

    if(!this.options.name){
        // defaul hostname is machine hostname or [IP]
        var defaultHostname = (oslib.hostname && oslib.hostname()) ||
                              (oslib.getHostname && oslib.getHostname()) ||
                              "";
        if(defaultHostname.indexOf('.')<0){
            defaultHostname = "[127.0.0.1]";
        }
        if(defaultHostname.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/)){
            defaultHostname = "["+defaultHostname+"]";
        }

        this.options.name = defaultHostname;
    }

    this._init();
}
utillib.inherits(SMTPClient, Stream);

/**
 * <p>Initializes instance variables</p>
 */
SMTPClient.prototype._init = function(){
    /**
     * Defines if the current connection is secure or not. If not,
     * STARTTLS can be used if available
     * @private
     */
    this._secureMode = false;

    /**
     * Ignore incoming data on TLS negotiation
     * @private
     */
    this._ignoreData = false;

    /**
     * If set to true, then this object is no longer active
     * @private
     */
    this.destroyed = false;

    /**
     * The socket connecting to the server
     * @publick
     */
    this.socket = false;

    /**
     * Lists supported auth mechanisms
     * @private
     */
    this._supportedAuth = [];

    /**
     * Currently in data transfer state
     * @private
     */
    this._dataMode = false;

    /**
     * Keep track if the client sends a leading \r\n in data mode
     * @private
     */
    this._lastDataBytes = new Buffer(2);

    /**
     * Function to run if a data chunk comes from the server
     * @private
     */
    this._currentAction = false;

    if(this.options.ignoreTLS || this.options.secureConnection){
        this._secureMode = true;
    }
};

/**
 * <p>Creates a connection to a SMTP server and sets up connection
 * listener</p>
 */
SMTPClient.prototype.connect = function(){

    if(this.options.secureConnection){
        this.socket = tls.connect(this.port, this.host, {}, this._onConnect.bind(this));
    }else{
        this.socket = net.connect(this.port, this.host);
        this.socket.on("connect", this._onConnect.bind(this));
    }

    this.socket.on("error", this._onError.bind(this));
};

/**
 * <p>Upgrades the connection to TLS</p>
 *
 * @param {Function} callback Callbac function to run when the connection
 *        has been secured
 */
SMTPClient.prototype._upgradeConnection = function(callback){
    this._ignoreData = true;
    starttls(this.socket, (function(socket){
        this.socket = socket;
        this._ignoreData = false;
        this._secureMode = true;
        this.socket.on("data", this._onData.bind(this));

        return callback(null, true);
    }).bind(this));
};

/**
 * <p>Connection listener that is run when the connection to
 * the server is opened</p>
 *
 * @event
 */
SMTPClient.prototype._onConnect = function(){
    if("setKeepAlive" in this.socket){
        this.socket.setKeepAlive(true);
    }else if(this.socket.encrypted && "setKeepAlive" in this.socket.encrypted){
        this.socket.encrypted.setKeepAlive(true); // secure connection
    }

    this.socket.on("data", this._onData.bind(this));
    this.socket.on("close", this._onClose.bind(this));
    this.socket.on("end", this._onEnd.bind(this));

    this._currentAction = this._actionGreeting;
};

/**
 * <p>Destroys the client - removes listeners etc.</p>
 */
SMTPClient.prototype._destroy = function(){
    if(this._destroyed)return;
    this._destroyed = true;
    this.emit("end");
    this.removeAllListeners();
};

/**
 * <p>'data' listener for data coming from the server</p>
 *
 * @event
 * @param {Buffer} chunk Data chunk coming from the server
 */
SMTPClient.prototype._onData = function(chunk){
    if(this._ignoreData){
        return;
    }

    var str = chunk.toString().trim();

    if(this.options.debug){
        console.log("SERVER"+(this.options.instanceId?" "+
            this.options.instanceId:"")+":\n   "+str.replace(/\n/g,"\n   "));
    }

    if(typeof this._currentAction == "function"){
        this._currentAction.call(this, str);
    }
};

/**
 * <p>'error' listener for the socket</p>
 *
 * @event
 * @param {Error} err Error object
 * @param {String} type Error name
 */
SMTPClient.prototype._onError = function(err, type, data){
    if(type && type != "Error"){
        err.name = type;
    }
    if(data){
        err.data = data;
    }
    this.emit("error", err);
    this.close();
};

/**
 * <p>'close' listener for the socket</p>
 *
 * @event
 */
SMTPClient.prototype._onClose = function(){
    this._destroy();
};

/**
 * <p>'end' listener for the socket</p>
 *
 * @event
 */
SMTPClient.prototype._onEnd = function(){
    this._destroy();
};

/**
 * <p>Passes data stream to socket if in data mode</p>
 *
 * @param {Buffer} chunk Chunk of data to be sent to the server
 */
SMTPClient.prototype.write = function(chunk){
    // works only in data mode
    if(!this._dataMode){
        // this line should never be reached but if it does, then
        // say act like everything's normal.
        return true;
    }

    if(typeof chunk == "string"){
        chunk = new Buffer(chunk, "utf-8");
    }

    if(chunk.length > 2){
        this._lastDataBytes[0] = chunk[chunk.length-2];
        this._lastDataBytes[1] = chunk[chunk.length-1];
    }else if(chunk.length == 1){
        this._lastDataBytes[0] = this._lastDataBytes[1];
        this._lastDataBytes[1] = chunk[0];
    }

    if(this.options.debug){
        console.log("CLIENT (DATA)"+(this.options.instanceId?" "+
            this.options.instanceId:"")+":\n   "+chunk.toString().trim().replace(/\n/g,"\n   "));
    }

    // pass the chunk to the socket
    return this.socket.write(chunk);
};

/**
 * <p>Indicates that a data stream for the socket is ended. Works only
 * in data mode.</p>
 *
 * @param {Buffer} [chunk] Chunk of data to be sent to the server
 */
SMTPClient.prototype.end = function(chunk){
    // works only in data mode
    if(!this._dataMode){
        // this line should never be reached but if it does, then
        // say act like everything's normal.
        return true;
    }

    if(chunk && chunk.length){
        this.write(chunk);
    }

    // redirect output from the server to _actionStream
    this._currentAction = this._actionStream;

    // indicate that the stream has ended by sending a single dot on its own line
    // if the client already closed the data with \r\n no need to do it again
    if(this._lastDataBytes[0] == 0x0D && this._lastDataBytes[1] == 0x0A){
        this.socket.write(new Buffer(".\r\n", "utf-8"));
    }else if(this._lastDataBytes[1] == 0x0D){
        this.socket.write(new Buffer("\n.\r\n"));
    }else{
        this.socket.write(new Buffer("\r\n.\r\n"));
    }

    // end data mode
    this._dataMode = false;
};

/**
 * <p>Send a command to the server, append \r\n</p>
 *
 * @param {String} str String to be sent to the server
 */
SMTPClient.prototype.sendCommand = function(str){
    if(this.options.debug){
        console.log("CLIENT"+(this.options.instanceId?" "+
            this.options.instanceId:"")+":\n   "+(str || "").toString().trim().replace(/\n/g,"\n   "));
    }
    this.socket.write(new Buffer(str+"\r\n", "utf-8"));
};

/**
 * <p>Sends QUIT</p>
 */
SMTPClient.prototype.quit = function(){
    this.sendCommand("QUIT");
    this._currentAction = this.close;
};

/**
 * <p>Closes the connection to the server</p>
 */
SMTPClient.prototype.close = function(){
    if(this.options.debug){
        console.log("Closing connection to the server");
    }
    if(this.socket && !this.socket.destroyed){
        this.socket.end();
    }
    this._destroy();
};

/**
 * <p>Initiates a new message by submitting envelope data, starting with
 * <code>MAIL FROM:</code> command</p>
 *
 * @param {Object} envelope Envelope object in the form of
 *        <code>{from:"...", to:["..."]}</code>
 */
SMTPClient.prototype.useEnvelope = function(envelope){
    this._envelope = envelope || {};
    this._envelope.from = this._envelope.from || ("anonymous@"+this.options.name);

    // clone the recipients array for latter manipulation
    this._envelope.rcptQueue = JSON.parse(JSON.stringify(this._envelope.to || []));
    this._envelope.rcptFailed = [];

    this._currentAction = this._actionMAIL;
    this.sendCommand("MAIL FROM:<"+(this._envelope.from)+">");
};

/**
 * <p>If needed starts the authentication, if not emits 'idle' to
 * indicate that this client is ready to take in an outgoing mail</p>
 */
SMTPClient.prototype._authenticateUser = function(){

    if(!this.options.auth){
        // no need to authenticate, at least no data given
        this._currentAction = this._actionIdle;
        this.emit("idle"); // ready to take orders
        return;
    }

    var auth;

    if(this.options.auth.XOAuthToken && this._supportedAuth.indexOf("XOAUTH")>=0){
        auth = "XOAUTH";
    }else{
        // use first supported
        auth = (this._supportedAuth[0] || "PLAIN").toUpperCase().trim();
    }

    switch(auth){
        case "XOAUTH":
            this._currentAction = this._actionAUTHComplete;

            if(typeof this.options.auth.XOAuthToken == "object" &&
              typeof this.options.auth.XOAuthToken.generate == "function"){
                this.options.auth.XOAuthToken.generate((function(err, XOAuthToken){
                    if(err){
                        return this._onError(err, "XOAuthTokenError");
                    }
                    this.sendCommand("AUTH XOAUTH " + XOAuthToken);
                }).bind(this));
            }else{
                this.sendCommand("AUTH XOAUTH " + this.options.auth.XOAuthToken.toString());
            }
            return;
        case "LOGIN":
            this._currentAction = this._actionAUTH_LOGIN_USER;
            this.sendCommand("AUTH LOGIN");
            return;
        case "PLAIN":
            this._currentAction = this._actionAUTHComplete;
            this.sendCommand("AUTH PLAIN "+new Buffer(
                    this.options.auth.user+"\u0000"+
                    this.options.auth.user+"\u0000"+
                    this.options.auth.pass,"utf-8").toString("base64"));
            return;
    }

    this._onError(new Error("Unknown authentication method - "+auth), "UnknowAuthError");
};

/** ACTIONS **/

/**
 * <p>Will be run after the connection is created and the server sends
 * a greeting. If the incoming message starts with 220 initiate
 * SMTP session by sending EHLO command</p>
 *
 * @param {String} str Message from the server
 */
SMTPClient.prototype._actionGreeting = function(str){
    if(str.substr(0,3) != "220"){
        this._onError(new Error("Invalid greeting from server - "+str), false, str);
        return;
    }

    this._currentAction = this._actionEHLO;
    this.sendCommand("EHLO "+this.options.name);
};

/**
 * <p>Handles server response for EHLO command. If it yielded in
 * error, try HELO instead, otherwise initiate TLS negotiation
 * if STARTTLS is supported by the server or move into the
 * authentication phase.</p>
 *
 * @param {String} str Message from the server
 */
SMTPClient.prototype._actionEHLO = function(str){
    if(str.charAt(0) != "2"){
        // Try HELO instead
        this._currentAction = this._actionHELO;
        this.sendCommand("HELO "+this.options.name);
        return;
    }

    // Detect if the server supports STARTTLS
    if(!this._secureMode && str.match(/[ \-]STARTTLS\r?$/mi)){
        this.sendCommand("STARTTLS");
        this._currentAction = this._actionSTARTTLS;
        return;
    }

    // Detect if the server supports PLAIN auth
    if(str.match(/AUTH(?:\s+[^\n]*\s+|\s+)PLAIN/i)){
        this._supportedAuth.push("PLAIN");
    }

    // Detect if the server supports LOGIN auth
    if(str.match(/AUTH(?:\s+[^\n]*\s+|\s+)LOGIN/i)){
        this._supportedAuth.push("LOGIN");
    }

    // Detect if the server supports LOGIN auth
    if(str.match(/AUTH(?:\s+[^\n]*\s+|\s+)XOAUTH/i)){
        this._supportedAuth.push("XOAUTH");
    }

    this._authenticateUser.call(this);
};

/**
 * <p>Handles server response for HELO command. If it yielded in
 * error, emit 'error', otherwise move into the authentication phase.</p>
 *
 * @param {String} str Message from the server
 */
SMTPClient.prototype._actionHELO = function(str){
    if(str.charAt(0) != "2"){
        this._onError(new Error("Invalid response for EHLO/HELO - "+str), false, str);
        return;
    }
    this._authenticateUser.call(this);
};

/**
 * <p>Handles server response for STARTTLS command. If there's an error
 * try HELO instead, otherwise initiate TLS upgrade. If the upgrade
 * succeedes restart the EHLO</p>
 *
 * @param {String} str Message from the server
 */
SMTPClient.prototype._actionSTARTTLS = function(str){
    if(str.charAt(0) != "2"){
        // Try HELO instead
        this._currentAction = this._actionHELO;
        this.sendCommand("HELO "+this.options.name);
        return;
    }

    this._upgradeConnection((function(err, secured){
        if(err){
            this._onError(new Error("Error initiating TLS - "+(err.message || err)), "TLSError");
            return;
        }
        if(this.options.debug){
            console.log("Connection secured");
        }

        if(secured){
            // restart session
            this._currentAction = this._actionEHLO;
            this.sendCommand("EHLO "+this.options.name);
        }else{
            this._authenticateUser.call(this);
        }
    }).bind(this));
};

/**
 * <p>Handle the response for AUTH LOGIN command. We are expecting
 * '334 VXNlcm5hbWU6' (base64 for 'Username:'). Data to be sent as
 * response needs to be base64 encoded username.</p>
 *
 * @param {String} str Message from the server
 */
SMTPClient.prototype._actionAUTH_LOGIN_USER = function(str){
    if(str != "334 VXNlcm5hbWU6"){
        this._onError(new Error("Invalid login sequence while waiting for '334 VXNlcm5hbWU6' - "+str), false, str);
        return;
    }
    this._currentAction = this._actionAUTH_LOGIN_PASS;
    this.sendCommand(new Buffer(
            this.options.auth.user, "utf-8").toString("base64"));
};

/**
 * <p>Handle the response for AUTH LOGIN command. We are expecting
 * '334 UGFzc3dvcmQ6' (base64 for 'Password:'). Data to be sent as
 * response needs to be base64 encoded password.</p>
 *
 * @param {String} str Message from the server
 */
SMTPClient.prototype._actionAUTH_LOGIN_PASS = function(str){
    if(str != "334 UGFzc3dvcmQ6"){
        this._onError(new Error("Invalid login sequence while waiting for '334 UGFzc3dvcmQ6' - "+str), false, str);
        return;
    }
    this._currentAction = this._actionAUTHComplete;
    this.sendCommand(new Buffer(this.options.auth.pass, "utf-8").toString("base64"));
};

/**
 * <p>Handles the response for authentication, if there's no error,
 * the user can be considered logged in. Emit 'idle' and start
 * waiting for a message to send</p>
 *
 * @param {String} str Message from the server
 */
SMTPClient.prototype._actionAUTHComplete = function(str){
    if(str.charAt(0) != "2"){
        this._onError(new Error("Invalid login - "+str), "AuthError", str);
        return;
    }

    this._currentAction = this._actionIdle;
    this.emit("idle"); // ready to take orders
};

/**
 * <p>This function is not expected to run. If it does then there's probably
 * an error (timeout etc.)</p>
 *
 * @param {String} str Message from the server
 */
SMTPClient.prototype._actionIdle = function(str){
    if(Number(str.charAt(0)) > 3){
        this._onError(new Error(str), false, str);
        return;
    }

    // this line should never get called
};

/**
 * <p>Handle response for a <code>MAIL FROM:</code> command</p>
 *
 * @param {String} str Message from the server
 */
SMTPClient.prototype._actionMAIL = function(str){
    if(Number(str.charAt(0)) != "2"){
        this._onError(new Error("Mail from command failed - " + str), "SenderError", str);
        return;
    }

    if(!this._envelope.rcptQueue.length){
        this._onError(new Error("Can't send mail - no recipients defined"), "RecipientError");
    }else{
        this._envelope.curRecipient = this._envelope.rcptQueue.shift();
        this._currentAction = this._actionRCPT;
        this.sendCommand("RCPT TO:<"+this._envelope.curRecipient+">");
    }
};

/**
 * <p>Handle response for a <code>RCPT TO:</code> command</p>
 *
 * @param {String} str Message from the server
 */
SMTPClient.prototype._actionRCPT = function(str){
    if(Number(str.charAt(0)) != "2"){
        // this is a soft error
        this._envelope.rcptFailed.push(this._envelope.curRecipient);
    }

    if(!this._envelope.rcptQueue.length){
        if(this._envelope.rcptFailed.length < this._envelope.to.length){
            this.emit("rcptFailed", this._envelope.rcptFailed);
            this._currentAction = this._actionDATA;
            this.sendCommand("DATA");
        }else{
            this._onError(new Error("Can't send mail - all recipients were rejected"), "RecipientError");
            return;
        }
    }else{
        this._envelope.curRecipient = this._envelope.rcptQueue.shift();
        this._currentAction = this._actionRCPT;
        this.sendCommand("RCPT TO:<"+this._envelope.curRecipient+">");
    }
};

/**
 * <p>Handle response for a <code>DATA</code> command</p>
 *
 * @param {String} str Message from the server
 */
SMTPClient.prototype._actionDATA = function(str){
    // response should be 354 but according to this issue https://github.com/eleith/emailjs/issues/24
    // some servers might use 250 instead, so lets check for 2 or 3 as the first digit
    if([2,3].indexOf(Number(str.charAt(0)))<0){
        this._onError(new Error("Data command failed - " + str), false, str);
        return;
    }

    // Emit that connection is set up for streaming
    this._dataMode = true;
    this._currentAction = this._actionIdle;
    this.emit("message");
};

/**
 * <p>Handle response for a <code>DATA</code> stream</p>
 *
 * @param {String} str Message from the server
 */
SMTPClient.prototype._actionStream = function(str){
    if(Number(str.charAt(0)) != "2"){
        // Message failed
        this.emit("ready", false, str);
    }else{
        // Message sent succesfully
        this.emit("ready", true, str);
    }

    // Waiting for new connections
    this._currentAction = this._actionIdle;
    process.nextTick(this.emit.bind(this, "idle"));
};

});
/**
 *
 **/

define('rdimap/imapclient/smtpprobe',[
    'simplesmtp/lib/client',
    'exports'
  ],
  function(
    $simplesmtp,
    exports
  ) {

function SmtpProber(credentials, connInfo) {
  console.log("PROBE:SMTP attempting to connect to", connInfo.hostname);
  this._conn = $simplesmtp(
    connInfo.port, connInfo.hostname,
    {
      secureConnection: connInfo.crypto === true,
      ignoreTLS: connInfo.crypto === false,
      auth: { user: credentials.username, pass: credentials.password },
      debug: false,
    });
  this._conn.on('idle', this.onIdle.bind(this));
  this._conn.on('error', this.onBadness.bind(this));
  this._conn.on('end', this.onBadness.bind(this));

  this.onresult = null;
}
exports.SmtpProber = SmtpProber;
SmtpProber.prototype = {
  /**
   * onIdle happens after successful login, and so is what our probing uses.
   */
  onIdle: function() {
    console.log('onIdle!');
    if (this.onresult) {
      console.log("PROBE:SMTP happy");
      this.onresult(true);
      this.onresult = null;
    }
    this._conn.close();
  },

  onBadness: function() {
    if (this.onresult) {
      console.warn("PROBE:SMTP sad");
      this.onresult(false);
      this.onresult = null;
    }
  },
};

}); // end define
;
/**
 *
 **/

define('rdimap/imapclient/smtpacct',[
    'rdcommon/log',
    'simplesmtp/lib/client',
    'module',
    'exports'
  ],
  function(
    $log,
    $simplesmtp,
    $module,
    exports
  ) {

function SmtpAccount(universe, accountId, credentials, connInfo, _parentLog) {
  this.universe = universe;
  this.accountId = accountId;
  this.credentials = credentials;
  this.connInfo = connInfo;

  this._LOG = LOGFAB.SmtpAccount(this, _parentLog, accountId);

  this._activeConnections = [];
}
exports.SmtpAccount = SmtpAccount;
SmtpAccount.prototype = {
  type: 'smtp',
  toString: function() {
    return '[SmtpAccount: ' + this.id + ']';
  },

  _makeConnection: function() {
    var conn = $simplesmtp(
      this.connInfo.port, this.connInfo.hostname,
      {
        secureConnection: this.connInfo.crypto === true,
        ignoreTLS: this.connInfo.crypto === false,
        auth: {
          user: this.credentials.username,
          pass: this.credentials.password
        },
        debug: false,
      });
    return conn;
  },

  shutdown: function(callback) {
    // (there should be no live connections during a unit-test initiated
    // shutdown.)
    this._LOG.__die();
  },

  /**
   * @args[
   *   @param[callback @func[
   *     @args[
   *       @param[error @oneof[
   *         @case[null]{
   *           No error, message sent successfully.
   *         }
   *         @case['auth']{
   *           Authentication problem.  This should probably be escalated to
   *           the user so they can fix their password.
   *         }
   *         @case['bad-sender']{
   *           We logged in, but it didn't like our sender e-mail.
   *         }
   *         @case['bad-recipient']{
   *           There were one or more bad recipients; they are listed in the
   *           next argument.
   *         }
   *         @case['bad-message']{
   *           It failed during the sending of the message.
   *         }
   *         @case['server-maybe-offline']{
   *           The server won't let us login, maybe because of a bizarre offline
   *           for service strategy?  (We've seen this with IMAP before...)
   *
   *           This should be considered a fatal problem during probing or if
   *           it happens consistently.
   *         }
   *         @case['insecure']{
   *           We couldn't establish a secure connection.
   *         }
   *         @case['connection-lost']{
   *           The connection went away, we don't know why.  Could be a
   *           transient thing, could be a jerky server, who knows.
   *         }
   *         @case['unknown']{
   *           Some other error.  Internal error reporting/support should
   *           ideally be logging this somehow.
   *         }
   *       ]]
   *       @param[badAddresses @listof[String]]
   *     ]
   *   ]
   * ]
   */
  sendMessage: function(composedMessage, callback) {
    var conn = this._makeConnection(), bailed = false, sendingMessage = false;

    // - Optimistic case
    // Send the envelope once the connection is ready (fires again after
    // ready too.)
    conn.once('idle', function() {
        conn.useEnvelope(composedMessage.getEnvelope());
      });
    // Then send the actual message if everything was cool
    conn.on('message', function() {
        if (bailed)
          return;
        sendingMessage = true;
        composedMessage.streamMessage();
        composedMessage.pipe(conn);
      });
    // And close the connection and be done once it has been sent
    conn.on('ready', function() {
        bailed = true;
        conn.close();
        callback(null);
      });

    // - Error cases
    // It's possible for the server to decide some, but not all, of the
    // recipients are gibberish.  Since we are a mail client and talking to
    // a smarthost and not the final destination (most of the time), this
    // is not super likely.
    //
    // We upgrade this to a full failure to send
    conn.on('rcptFailed', function(addresses) {
        // nb: this gets called all the time, even without any failures
        if (addresses.length) {
          bailed = true;
          // simplesmtp does't view this as fatal, so we have to close it ourself
          conn.close();
          callback('bad-recipient', addresses);
        }
      });
    conn.on('error', function(err) {
        if (bailed) // (paranoia, this shouldn't happen.)
          return;
        var reportAs = null;
        switch (err.name) {
          // no explicit error type is given for: a bad greeting, failure to
          // EHLO/HELO, bad login sequence, OR a data problem during send.
          // The first 3 suggest a broken server or one that just doesn't want
          // to talk to us right now.
          case 'Error':
            if (sendingMessage)
              reportAs = 'bad-message';
            else
              reportAs = 'server-maybe-offline';
            break;
          case 'AuthError':
            reportAs = 'auth';
            break;
          case 'UnknownAuthError':
            reportAs = 'server-maybe-offline';
            break;
          case 'TLSError':
            reportAs = 'insecure';
            break;

          case 'SenderError':
            reportAs = 'bad-sender';
            break;
          // no recipients (bad message on us) or they all got rejected
          case 'RecipientError':
            reportAs = 'bad-recipient';
            break;

          default:
            reportAs = 'unknown';
            break;
        }
        bailed = true;
        callback(reportAs, null);
        // the connection gets automatically closed.
      });
      conn.on('end', function() {
        if (bailed)
          return;
        callback('connection-lost', null);
        bailed = true;
        // (the connection is already closed if we are here)
      });
  },


};

var LOGFAB = exports.LOGFAB = $log.register($module, {
  SmtpAccount: {
    type: $log.ACCOUNT,
    events: {
    },
    TEST_ONLY_events: {
    },
    errors: {
      folderAlreadyHasConn: { folderId: false },
    },
  },
});

}); // end define
;
/**
 * Implements a fake account type for UI testing/playing only.
 **/

define('rdimap/imapclient/fakeacct',[
    'mailcomposer',
    'exports'
  ],
  function(
    $mailcomposer,
    exports
  ) {

////////////////////////////////////////////////////////////////////////////////
// Message generation helper code from Thunderbird (written by me for MoMo,
// relicensing is okay) but hackily simplified for this explicit use case.

/**
 * A list of first names for use by MessageGenerator to create deterministic,
 *  reversible names.  To keep things easily reversible, if you add names, make
 *  sure they have no spaces in them!
 */
const FIRST_NAMES = [
  "Andy", "Bob", "Chris", "David", "Emily", "Felix",
  "Gillian", "Helen", "Idina", "Johnny", "Kate", "Lilia",
  "Martin", "Neil", "Olof", "Pete", "Quinn", "Rasmus",
  "Sarah", "Troels", "Ulf", "Vince", "Will", "Xavier",
  "Yoko", "Zig"
  ];

/**
 * A list of last names for use by MessageGenerator to create deterministic,
 *  reversible names.  To keep things easily reversible, if you add names, make
 *  sure they have no spaces in them!
 */
const LAST_NAMES = [
  "Anway", "Bell", "Clarke", "Davol", "Ekberg", "Flowers",
  "Gilbert", "Hook", "Ivarsson", "Jones", "Kurtz", "Lowe",
  "Morris", "Nagel", "Orzabal", "Price", "Quinn", "Rolinski",
  "Stanley", "Tennant", "Ulvaeus", "Vannucci", "Wiggs", "Xavier",
  "Young", "Zig"
  ];

/**
 * A list of adjectives used to construct a deterministic, reversible subject
 *  by MessageGenerator.  To keep things easily reversible, if you add more,
 *  make sure they have no spaces in them!  Also, make sure your additions
 *  don't break the secret Monty Python reference!
 */
const SUBJECT_ADJECTIVES = [
  "Big", "Small", "Huge", "Tiny",
  "Red", "Green", "Blue", "My",
  "Happy", "Sad", "Grumpy", "Angry",
  "Awesome", "Fun", "Lame", "Funky",
  ];

/**
 * A list of nouns used to construct a deterministic, reversible subject
 *  by MessageGenerator.  To keep things easily reversible, if you add more,
 *  make sure they have no spaces in them!  Also, make sure your additions
 *  don't break the secret Monty Python reference!
 */
const SUBJECT_NOUNS = [
  "Meeting", "Party", "Shindig", "Wedding",
  "Document", "Report", "Spreadsheet", "Hovercraft",
  "Aardvark", "Giraffe", "Llama", "Velociraptor",
  "Laser", "Ray-Gun", "Pen", "Sword",
  ];

/**
 * A list of suffixes used to construct a deterministic, reversible subject
 *  by MessageGenerator.  These can (clearly) have spaces in them.  Make sure
 *  your additions don't break the secret Monty Python reference!
 */
const SUBJECT_SUFFIXES = [
  "Today", "Tomorrow", "Yesterday", "In a Fortnight",
  "Needs Attention", "Very Important", "Highest Priority", "Full Of Eels",
  "In The Lobby", "On Your Desk", "In Your Car", "Hiding Behind The Door",
  ];

/**
 * Provides mechanisms for creating vaguely interesting, but at least valid,
 *  SyntheticMessage instances.
 */
function MessageGenerator(startDate, mode) {
  this._clock = startDate || new Date(2012, 5, 14);
  this._nextNameNumber = 0;
  this._nextSubjectNumber = 0;
  this._nextMessageIdNum = 0;

  this._mode = mode || 'info';
}
exports.MessageGenerator = MessageGenerator;
MessageGenerator.prototype = {
  /**
   * The maximum number of unique names makeName can produce.
   */
  MAX_VALID_NAMES: FIRST_NAMES.length * LAST_NAMES.length,
  /**
   * The maximum number of unique e-mail address makeMailAddress can produce.
   */
  MAX_VALID_MAIL_ADDRESSES: FIRST_NAMES.length * LAST_NAMES.length,
  /**
   * The maximum number of unique subjects makeSubject can produce.
   */
  MAX_VALID_SUBJECTS: SUBJECT_ADJECTIVES.length * SUBJECT_NOUNS.length *
                      SUBJECT_SUFFIXES,

  /**
   * Generate a consistently determined (and reversible) name from a unique
   *  value.  Currently up to 26*26 unique names can be generated, which
   *  should be sufficient for testing purposes, but if your code cares, check
   *  against MAX_VALID_NAMES.
   *
   * @param aNameNumber The 'number' of the name you want which must be less
   *     than MAX_VALID_NAMES.
   * @returns The unique name corresponding to the name number.
   */
  makeName: function(aNameNumber) {
    var iFirst = aNameNumber % FIRST_NAMES.length;
    var iLast = (iFirst + Math.floor(aNameNumber / FIRST_NAMES.length)) %
                LAST_NAMES.length;

    return FIRST_NAMES[iFirst] + " " + LAST_NAMES[iLast];
  },

  /**
   * Generate a consistently determined (and reversible) e-mail address from
   *  a unique value; intended to work in parallel with makeName.  Currently
   *  up to 26*26 unique addresses can be generated, but if your code cares,
   *  check against MAX_VALID_MAIL_ADDRESSES.
   *
   * @param aNameNumber The 'number' of the mail address you want which must be
   *     less than MAX_VALID_MAIL_ADDRESSES.
   * @returns The unique name corresponding to the name mail address.
   */
  makeMailAddress: function(aNameNumber) {
    var iFirst = aNameNumber % FIRST_NAMES.length;
    var iLast = (iFirst + Math.floor(aNameNumber / FIRST_NAMES.length)) %
                LAST_NAMES.length;

    return FIRST_NAMES[iFirst].toLowerCase() + "@" +
           LAST_NAMES[iLast].toLowerCase() + ".nul";
  },

  /**
   * Generate a pair of name and e-mail address.
   *
   * @param aNameNumber The optional 'number' of the name and mail address you
   *     want.  If you do not provide a value, we will increment an internal
   *     counter to ensure that a new name is allocated and that will not be
   *     re-used.  If you use our automatic number once, you must use it always,
   *     unless you don't mind or can ensure no collisions occur between our
   *     number allocation and your uses.  If provided, the number must be
   *     less than MAX_VALID_NAMES.
   * @return A list containing two elements.  The first is a name produced by
   *     a call to makeName, and the second an e-mail address produced by a
   *     call to makeMailAddress.  This representation is used by the
   *     SyntheticMessage class when dealing with names and addresses.
   */
  makeNameAndAddress: function(aNameNumber) {
    if (aNameNumber === undefined)
      aNameNumber = this._nextNameNumber++;
    return {
      name: this.makeName(aNameNumber),
      address: this.makeMailAddress(aNameNumber)
    };
  },

  /**
   * Generate and return multiple pairs of names and e-mail addresses.  The
   *  names are allocated using the automatic mechanism as documented on
   *  makeNameAndAddress.  You should accordingly not allocate / hard code name
   *  numbers on your own.
   *
   * @param aCount The number of people you want name and address tuples for.
   * @returns a list of aCount name-and-address tuples.
   */
  makeNamesAndAddresses: function(aCount) {
    var namesAndAddresses = [];
    for (var i=0; i < aCount; i++)
      namesAndAddresses.push(this.makeNameAndAddress());
    return namesAndAddresses;
  },

  /**
   * Generate a consistently determined (and reversible) subject from a unique
   *  value.  Up to MAX_VALID_SUBJECTS can be produced.
   *
   * @param aSubjectNumber The subject number you want generated, must be less
   *     than MAX_VALID_SUBJECTS.
   * @returns The subject corresponding to the given subject number.
   */
  makeSubject: function(aSubjectNumber) {
    if (aSubjectNumber === undefined)
      aSubjectNumber = this._nextSubjectNumber++;
    var iAdjective = aSubjectNumber % SUBJECT_ADJECTIVES.length;
    var iNoun = (iAdjective + Math.floor(aSubjectNumber /
                                         SUBJECT_ADJECTIVES.length)) %
                SUBJECT_NOUNS.length;
    var iSuffix = (iNoun + Math.floor(aSubjectNumber /
                   (SUBJECT_ADJECTIVES.length * SUBJECT_NOUNS.length))) %
                  SUBJECT_SUFFIXES.length;
    return SUBJECT_ADJECTIVES[iAdjective] + " " +
           SUBJECT_NOUNS[iNoun] + " " +
           SUBJECT_SUFFIXES[iSuffix];
  },

  /**
   * Fabricate a message-id suitable for the given synthetic message.  Although
   *  we don't use the message yet, in theory it would var us tailor the
   *  message id to the server that theoretically might be sending it.  Or some
   *  such.
   *
   * @param The synthetic message you would like us to make up a message-id for.
   *     We don't set the message-id on the message, that's up to you.
   * @returns a Message-id suitable for the given message.
   */
  makeMessageId: function(aSynthMessage) {
    var msgId = this._nextMessageIdNum + "@made.up";
    this._nextMessageIdNum++;
    return msgId;
  },

  /**
   * Generates a valid date which is after all previously issued dates by this
   *  method, ensuring an apparent ordering of time consistent with the order
   *  in which code is executed / messages are generated.
   * If you need a precise time ordering or precise times, make them up
   *  yourself.
   *
   * @returns A made-up time in JavaScript Date object form.
   */
  makeDate: function() {
    var date = this._clock;
    // advance time by an hour
    this._clock = new Date(date.valueOf() + 60 * 60 * 1000);
    return date;
  },

  /**
   * HACK: copied from our mailbridge implementation.
   *
   * mailcomposer wants from/to/cc/bcc delivered basically like it will show
   * up in the e-mail, except it is fine with unicode.  So we convert our
   * (possibly) structured representation into a flattened representation.
   *
   * (mailcomposer will handle punycode and mime-word encoding as needed.)
   */
  _formatAddresses: function(nameAddrPairs) {
    var addrstrings = [];
    for (var i = 0; i < nameAddrPairs.length; i++) {
      var pair = nameAddrPairs[i];
      // support lazy people providing only an e-mail... or very careful
      // people who are sure they formatted things correctly.
      if (typeof(pair) === 'string') {
        addrstrings.push(pair);
      }
      else {
        addrstrings.push(
          '"' + pair.name.replace(/["']/g, '') + '" <' +
            pair.address + '>');
      }
    }

    return addrstrings.join(', ');
  },


  /**
   * Create a SyntheticMessage.  All arguments are optional, but allow
   *  additional control.  With no arguments specified, a new name/address will
   *  be generated that has not been used before, and sent to a new name/address
   *  that has not been used before.
   *
   * @param aArgs An object with any of the following attributes provided:
   * @param [aArgs.age] A dictionary with potential attributes 'minutes',
   *     'hours', 'days', 'weeks' to specify the message be created that far in
   *     the past.
   * @param [aArgs.attachments] A list of dictionaries suitable for passing to
   *     syntheticPartLeaf, plus a 'body' attribute that has already been
   *     encoded.  Line chopping is on you FOR NOW.
   * @param [aArgs.body] A dictionary suitable for passing to SyntheticPart plus
   *     a 'body' attribute that has already been encoded (if encoding is
   *     required).  Line chopping is on you FOR NOW.  Alternately, use
   *     bodyPart.
   * @param [aArgs.bodyPart] A SyntheticPart to uses as the body.  If you
   *     provide an attachments value, this part will be wrapped in a
   *     multipart/mixed to also hold your attachments.  (You can put
   *     attachments in the bodyPart directly if you want and not use
   *     attachments.)
   * @param [aArgs.callerData] A value to propagate to the callerData attribute
   *     on the resulting message.
   * @param [aArgs.cc] A list of cc recipients (name and address pairs).  If
   *     omitted, no cc is generated.
   * @param [aArgs.from] The name and value pair this message should be from.
   *     Defaults to the first recipient if this is a reply, otherwise a new
   *     person is synthesized via |makeNameAndAddress|.
   * @param [aArgs.inReplyTo] the SyntheticMessage this message should be in
   *     reply-to.  If that message was in reply to another message, we will
   *     appropriately compensate for that.  If a SyntheticMessageSet is
   *     provided we will use the first message in the set.
   * @param [aArgs.replyAll] a boolean indicating whether this should be a
   *     reply-to-all or just to the author of the message.  (er, to-only, not
   *     cc.)
   * @param [aArgs.subject] subject to use; you are responsible for doing any
   *     encoding before passing it in.
   * @param [aArgs.to] The list of recipients for this message, defaults to a
   *     set of toCount newly created persons.
   * @param [aArgs.toCount=1] the number of people who the message should be to.
   * @param [aArgs.clobberHeaders] An object whose contents will overwrite the
   *     contents of the headers object.  This should only be used to construct
   *     illegal header values; general usage should use another explicit
   *     mechanism.
   * @param [aArgs.junk] Should this message be flagged as junk for the benefit
   *     of the messageInjection helper so that it can know to flag the message
   *     as junk?  We have no concept of marking a message as definitely not
   *     junk at this point.
   * @param [aArgs.read] Should this message be marked as already read?
   * @returns a SyntheticMessage fashioned just to your liking.
   */
  makeMessage: function makeMessage(aArgs) {
    aArgs = aArgs || {};

    var headerInfo = {
      id: null,
      suid: null,
      guid: '<' + Date.now() + Math.random().toString(16).substr(1) +
              '@mozgaia>',
      author: null,
      date: null,
      flags: [],
      hasAttachments: false,
      subject: null,
      snippet: null,
    };
    var bodyInfo = {
      to: null,
      cc: null,
      bcc: null,
      replyTo: null,
      attachments: null,
      bodyText: null,
    };

    if (aArgs.inReplyTo) {
      var srcMsg = aArgs.inReplyTo;

      headerInfo.subject =
        (srcMsg.headerInfo.subject.substring(0, 4) == "Re: ") ?
          srcMsg.headerInfo.subject :
          ("Re: " + srcMsg.headerInfo.subject);
      if (aArgs.replyAll)
        bodyInfo.to = [srcMsg.headerInfo.author].concat(srcMsg.bodyInfo.to.slice(1));
      else
        bodyInfo.to = [srcMsg.headerInfo.author];
      headerInfo.author = srcMsg.bodyInfo.to[0];
    }
    else {
      headerInfo.subject = aArgs.subject || this.makeSubject();
      headerInfo.author = aArgs.from || this.makeNameAndAddress();
      bodyInfo.to = aArgs.to || this.makeNamesAndAddresses(aArgs.toCount || 1);
      if (aArgs.cc)
        bodyInfo.cc = aArgs.cc;
    }

    if (aArgs.age) {
      var age = aArgs.age;
      // start from 'now'
      var ts = this._clock || Date.now();
      if (age.minutes)
        ts -= age.minutes * 60 * 1000;
      if (age.hours)
        ts -= age.hours * 60 * 60 * 1000;
      if (age.days)
        ts -= age.days * 24 * 60 * 60 * 1000;
      if (age.weeks)
        ts -= age.weeks * 7 * 24 * 60 * 60 * 1000;
      headerInfo.date = ts;
    }
    else {
      headerInfo.date = this.makeDate().valueOf();
    }

    // use two subjects for the snippet to get it good and long.
    headerInfo.snippet = this.makeSubject() + ' ' + this.makeSubject();

    bodyInfo.bodyText = headerInfo.snippet + '\n' +
      'This message is automatically created for you by robots.\n' +
      '\nThe robots may or may not be friendly.\n' +
      'They definitely do not know latin, which is why no lorax gypsum.\n' +
      '\nI am endeavouring to write more words now because scrolling turns' +
      ' out to be something important to test.  I know, I know.  You also' +
      ' are surprised that scrolling is important?  Who would have thunk?\n' +
      '\nI actually have some synthetic markov chain stuff lying around, do' +
      ' you think that would go better?  Perhaps?  Possibly?  Potentially?' +
      ' Pertinent?\n' +
      '\nTo-do:\n' +
      '1: Write more made-up text.\n' +
      '2: Cheat and just add more lines...\n' +
      '\n\n\n\n' +
      '3: ...\n' +
      '\nIt is a tiny screen we target, thank goodness!';

    if (this._mode === 'info') {
      return {
        headerInfo: headerInfo,
        bodyInfo: bodyInfo,
      };
    }
    else { // 'rfc822'
      var composer = new $mailcomposer.MailComposer();
      var messageOpts = {
        from: this._formatAddresses([headerInfo.author]),
        subject: headerInfo.subject,
        body: bodyInfo.bodyText,
        to: this._formatAddresses(bodyInfo.to),
      };
      if (bodyInfo.cc)
        messageOpts.cc = this._formatAddresses(bodyInfo.cc);

      composer.setMessageOption(messageOpts);
      composer.addHeader('Date', new Date(headerInfo.date));
      composer.addHeader('Message-Id', headerInfo.guid);

      // have it internally accumulate the data rather than using the stream
      // mechanism.
      composer._cacheOutput = true;
      var data = null;
      process.immediate = true;
      composer._processBufferedOutput = function() {
        data = this._outputBuffer;
      };
      composer._composeMessage();
      process.immediate = false;
      return {
        date: new Date(headerInfo.date),
        headerInfo: headerInfo,
        bodyInfo: bodyInfo,
        // XXX mailcomposer is tacking newlines onto the end of the message that
        // we don't want.  Ideally we want to fix mailcomposer...
        messageText: data.trimRight()
      };
    }
  },

  MAKE_MESSAGES_DEFAULTS: {
    count: 10,
  },
  MAKE_MESSAGES_PROPAGATE: ['attachments', 'body', 'cc', 'from', 'inReplyTo',
                            'subject', 'to', 'clobberHeaders', 'junk', 'read'],
  /**
   * Given a set definition, produce a list of synthetic messages.
   *
   * The set definition supports the following attributes:
   *  count: The number of messages to create.
   *  age: As used by makeMessage.
   *  age_incr: Similar to age, but used to increment the values in the age
   *      dictionary (assuming a value of zero if omitted).
   *  @param [aSetDef.msgsPerThread=1] The number of messages per thread.  If
   *      you want to create direct-reply threads, you can pass a value for this
   *      and have it not be one.  If you need fancier reply situations,
   *      directly use a scenario or hook us up to support that.
   *
   * Also supported are the following attributes as defined by makeMessage:
   *  attachments, body, from, inReplyTo, subject, to, clobberHeaders, junk
   *
   * If omitted, the following defaults are used, but don't depend on this as we
   *  can change these at any time:
   * - count: 10
   */
  makeMessages: function MessageGenerator_makeMessages(aSetDef) {
    var messages = [];

    var args = {}, unit, delta;
    // zero out all the age_incr fields in age (if present)
    if (aSetDef.age_incr) {
      args.age = {};
      for (unit in aSetDef.age_incr) {
        args.age[unit] = 0;
      }
    }
    // copy over the initial values from age (if present)
    if (aSetDef.age) {
      args.age = args.age || {};
      for (unit in aSetDef.age) {
        var value = aSetDef.age[unit];
        args.age[unit] = value;
      }
    }
    // just copy over any attributes found from MAKE_MESSAGES_PROPAGATE
    for (var iPropName = 0;
         iPropName < this.MAKE_MESSAGES_PROPAGATE.length;
         iPropName++) {
      var propAttrName = this.MAKE_MESSAGES_PROPAGATE[iPropName];
      if (aSetDef[propAttrName])
        args[propAttrName] = aSetDef[propAttrName];
    }

    var count = aSetDef.count || this.MAKE_MESSAGES_DEFAULTS.count;
    var messagsPerThread = aSetDef.msgsPerThread || 1;
    var lastMessage = null;
    for (var iMsg = 0; iMsg < count; iMsg++) {
      // primitive threading support...
      if (lastMessage && (iMsg % messagsPerThread != 0))
        args.inReplyTo = lastMessage;
      else if (!("inReplyTo" in aSetDef))
        args.inReplyTo = null;
      lastMessage = this.makeMessage(args);
      if (this._mode === 'info') {
        lastMessage.headerInfo.id = '' + iMsg;
        lastMessage.headerInfo.suid = aSetDef.folderId + '/' + iMsg;
      }
      messages.push(lastMessage);

      if (aSetDef.age_incr) {
        for (unit in aSetDef.age_incr) {
          delta = aSetDef.age_incr[unit];
          args.age[unit] += delta;
        }
      }
    }
    return messages;
  },
};





////////////////////////////////////////////////////////////////////////////////


/**
 * Fake accounts always regenerate from scratch when instantiated; there is
 * no disk persistence.
 *
 * This might be better off being rejiggered to leverage the IMAP account
 * implementation and use some combination of making it think it is
 * permanently offline, manually cramming messages in, and pretending that
 * jobs actually ran on the server.  A mock/fakish IMAP protocol or real
 * protocol talking to a fake socket would likely be too much effort for
 * something likely to be brittle.
 */
function FakeAccount(universe, accountDef, folderInfo, receiveProtoConn, _LOG) {
  this.universe = universe;
  this.id = accountDef.id;
  this.accountDef = accountDef;

  var generator = new MessageGenerator();

  this.identities = accountDef.identities;

  var ourIdentity = accountDef.identities[0];
  var ourNameAndAddress = {
    name: ourIdentity.name,
    address: ourIdentity.address,
  };

  var inboxFolder = {
    id: this.id + '/0',
    name: 'Inbox',
    path: 'Inbox',
    type: 'inbox',
  };
  var draftsFolder = {
    id: this.id + '/1',
    name: 'Drafts',
    path: 'Drafts',
    type: 'drafts',
  };
  var sentFolder = {
    id: this.id + '/2',
    name: 'Sent',
    path: 'Sent',
    type: 'sent',
  };

  this.folders = [inboxFolder, draftsFolder, sentFolder];
  this._folderStorages = {};
  this._folderStorages[inboxFolder.id] =
    new FakeFolderStorage(
      inboxFolder,
      generator.makeMessages(
        { folderId: inboxFolder.id, count: 16, to: [ourNameAndAddress] }));
  this._folderStorages[draftsFolder.id] =
    new FakeFolderStorage(draftsFolder, []);
  this._folderStorages[sentFolder.id] =
    new FakeFolderStorage(
      sentFolder,
      generator.makeMessages(
        { folderId: sentFolder.id, count: 4, from: ourNameAndAddress }));

  this.meta = folderInfo.$meta;
  this.mutations = folderInfo.$mutations;
}
exports.FakeAccount = FakeAccount;
FakeAccount.prototype = {
  toString: function fa_toString() {
    return '[FakeAccount: ' + this.id + ']';
  },
  toBridgeWire: function fa_toBridgeWire() {
    return {
      id: this.accountDef.id,
      name: this.accountDef.name,
      path: this.accountDef.name,
      type: this.accountDef.type,

      identities: this.identities,

      credentials: {
        username: this.accountDef.credentials.username,
      },

      servers: [
        {
          type: this.accountDef.type,
          connInfo: this.accountDef.connInfo
        },
      ]
    };
  },

  saveAccountState: function(reuseTrans) {
    return reuseTrans;
  },

  shutdown: function() {
  },

  createFolder: function() {
    throw new Error('XXX not implemented');
  },

  deleteFolder: function() {
    throw new Error('XXX not implemented');
  },

  sliceFolderMessages: function fa_sliceFolderMessages(folderId, bridgeHandle) {
    return this._folderStorages[folderId]._sliceFolderMessages(bridgeHandle);
  },
  syncFolderList: function fa_syncFolderList(callback) {
    // NOP; our list of folders is eternal (for now)
    callback();
  },
  sendMessage: function fa_sendMessage(composedMessage, callback) {
    // XXX put a copy of the message in the sent folder
    callback(null);
  },

  getFolderStorageForFolderId: function fa_getFolderStorageForFolderId(folderId){
    return this._folderStorages[folderId];
  },

  runOp: function(op, mode, callback) {
    // Just pretend we performed the op so no errors trigger.
    if (callback)
      setZeroTimeout(callback);
  },
};

function FakeFolderStorage(folderMeta, headersAndBodies) {
  this._headers = [];
  this._bodiesBySuid = {};
  for (var i = 0; i < headersAndBodies.length; i++) {
    var headerAndBody = headersAndBodies[i];
    this._headers.push(headerAndBody.headerInfo);
    this._bodiesBySuid[headerAndBody.headerInfo.suid] =
      headerAndBody.bodyInfo;
  }
}
FakeFolderStorage.prototype = {
  _sliceFolderMessages: function ffs__sliceFolderMessages(bridgeHandle) {
    bridgeHandle.sendSplice(0, 0, this._headers, true, false);
  },

  getMessageBody: function ffs_getMessageBody(suid, date, callback) {
    callback(this._bodiesBySuid[suid]);
  },
};

}); // end define
;
/**
 *
 **/

define('rdimap/imapclient/imapchew',[
    'exports'
  ],
  function(
    exports
  ) {

/**
 * Process the headers and bodystructure of a message to build preliminary state
 * and determine what body parts to fetch.  The list of body parts will be used
 * to issue another fetch request, and those results will be passed to
 * `chewBodyParts`.
 *
 * For now, our stop-gap heuristics for content bodies are:
 * - pick text/plain in multipart/alternative
 * - recurse into other multipart types looking for an alterntive that has
 *    text.
 * - do not recurse into message/rfc822
 * - ignore/fail-out messages that lack a text part, skipping to the next
 *    task.  (This should not happen once we support HTML, as there are cases
 *    where there are attachments without any body part.)
 * - Append text body parts together; there is no benefit in separating a
 *    mailing list footer from its content.
 *
 * For attachments, our heuristics are:
 * - only like them if they have filenames.  We will find this as "name" on
 *    the "content-type" or "filename" on the "content-disposition", quite
 *    possibly on both even.  For imap.js, "name" shows up in the "params"
 *    dict, and filename shows up in the "disposition" dict.
 * - ignore crypto signatures, even though they are named.  S/MIME gives us
 *    "smime.p7s" as an application/pkcs7-signature under a multipart/signed
 *    (that the server tells us is "signed").  PGP in MIME mode gives us
 *    application/pgp-signature "signature.asc" under a multipart/signed.
 *
 * The next step in the plan is to get an HTML sanitizer exposed so we can
 *  support text/html.  That will also imply grabbing multipart/related
 *  attachments.
 *
 * @typedef[ChewRep @dict[
 *   @key[msg ImapJsMsg]
 *   @key[bodyParts @listof[ImapJsPart]]
 *   @key[attachments @listof[AttachmentInfo]]
 *   @key[header HeaderInfo]
 *   @key[bodyInfo BodyInfo]
 * ]]
 * @return[ChewRep]
 */
exports.chewHeaderAndBodyStructure = function chewStructure(msg) {
  // imap.js builds a bodystructure tree using lists.  All nodes get wrapped
  //  in a list so they are element zero.  Children (which get wrapped in
  //  their own list) follow.
  //
  // Examples:
  //   text/plain =>
  //     [{text/plain}]
  //   multipart/alternative with plaintext and HTML =>
  //     [{alternative} [{text/plain}] [{text/html}]]
  //   multipart/mixed text w/attachment =>
  //     [{mixed} [{text/plain}] [{application/pdf}]]
  var attachments = [], bodyParts = [], unnamedPartCounter = 0;

  /**
   * Sizes are the size of the encoded string, not the decoded value.
   */
  function estimatePartSizeInBytes(partInfo) {
    var encoding = partInfo.encoding;
    // Base64 encodes 3 bytes in 4 characters with padding that always
    // causes the encoding to take 4 characters.  The max encoded line length
    // (ignoring CRLF) is 76 bytes, with 72 bytes also fairly common.
    // As such, a 78=19*4+2 character line encodes 57=19*3 payload bytes and
    // we can use that as a rough estimate.
    if (encoding === 'base64') {
      return Math.floor(partInfo.size * 57 / 78);
    }
    // Quoted printable is hard to predict since only certain things need
    // to be encoded.  It could be perfectly efficient if the source text
    // has a bunch of newlines built-in.
    else if (encoding === 'quoted-printable') {
      // Let's just provide an upper-bound of perfectly efficient.
      return partInfo.size;
    }
    // No clue; upper bound.
    return partInfo.size;
  }

  function chewLeaf(branch) {
    var partInfo = branch[0], i,
        filename, disposition;

    // - Detect named parts; they could be attachments
    if (partInfo.params && partInfo.params.name)
      filename = partInfo.params.name;
    else if (partInfo.disposition && partInfo.disposition.params &&
             partInfo.disposition.params.filename)
      filename = partInfo.disposition.params.filename;
    else
      filename = null;

    // - Start from explicit disposition, make attachment if non-displayable
    if (partInfo.disposition)
      disposition = partInfo.disposition.type;
    // UNTUNED-HEURISTIC (need test cases)
    // Parts with content ID's explicitly want to be referenced by the message
    // and so are inline.  (Although we might do well to check if they actually
    // are referenced.  This heuristic could be very wrong.)
    else if (partInfo.id)
      disposition = 'inline';
    else if (filename || partInfo.type !== 'text')
      disposition = 'attachment';
    else
      disposition = 'inline';

    // Some clients want us to display things inline that we simply can't
    // display (historically and currently, PDF) or that our usage profile
    // does not want to automatically download (in the future, PDF, because
    // they can get big.)
    if (partInfo.type !== 'text' &&
        partInfo.type !== 'image')
      disposition = 'attachment';

    // - But we don't care if they are signatures...
    if ((partInfo.type === 'application') &&
        (partInfo.subtype === 'pgp-signature' ||
         partInfo.subtype === 'pkcs7-signature'))
      return;

    // - Attachments have names and don't have id's for multipart/related
    if (disposition === 'attachment') {
      // We probably want to do a MIME mapping here for the extension?
      if (!filename)
        filename = 'unnamed-' + (++unnamedPartCounter);
      attachments.push({
        name: filename,
        type: partInfo.type + '/' + partInfo.subtype,
        part: partInfo.partID,
        sizeEstimate: estimatePartSizeInBytes(partInfo),
      });
      return;
    }
    // XXX once we support html we need to save off the related bits.

    // - We must be an inline part or structure
    switch (partInfo.type) {
      // - content
      case 'text':
        if (partInfo.subtype === 'plain') {
          bodyParts.push(partInfo);
        }
        // (ignore html)
        break;

      // - multipart that we should recurse into
      case 'alternative':
      case 'mixed':
      case 'signed':
        for (i = 1; i < branch.length; i++) {
          chewStruct(branch[i]);
        }
        break;
    }
  }

  function chewMultipart(branch) {
    var partInfo = branch[0];

    // - We must be an inline part or structure
    switch (partInfo.type) {
      // - multipart that we should recurse into
      case 'alternative':
      case 'mixed':
      case 'signed':
        for (var i = 1; i < branch.length; i++) {
          if (branch[i].length > 1)
            chewMultipart(branch[i]);
          else
            chewLeaf(branch[i]);
        }
        break;

      default:
        console.warn('Ignoring multipart type:', partInfo.type);
        break;
    }
  }

  if (msg.structure.length > 1)
    chewMultipart(msg.structure);
  else
    chewLeaf(msg.structure);

  if (!bodyParts.length)
    console.log("no body parts?", msg.structure);

  return {
    msg: msg,
    bodyParts: bodyParts,
    attachments: attachments,
    header: null,
    bodyInfo: null,
  };
};

// What do we think the post-snappy compression overhead of the structured clone
// persistence rep will be for various things?  These are total guesses right
// now.  Keep in mind we do want the pre-compression size of the data in all
// cases and we just hope it will compress a bit.  For the attributes we are
// including the attribute name as well as any fixed-overhead for its payload,
// especially numbers which may or may not be zig-zag encoded/etc.
const OBJ_OVERHEAD_EST = 2, STR_ATTR_OVERHEAD_EST = 5,
      NUM_ATTR_OVERHEAD_EST = 10, LIST_ATTR_OVERHEAD_EST = 4,
      NULL_ATTR_OVERHEAD_EST = 2;

/**
 * Call once the body parts requested by `chewHeaderAndBodyStructure` have been
 * fetched in order to finish processing of the message to produce the header
 * and body data-structures for the message.
 *
 * @args[
 *   @param[rep ChewRep]
 *   @param[bodyPartContents @listof[String]]{
 *     The fetched body parts matching the list of requested parts in
 *     `rep.bodyParts`.
 *   }
 * ]
 * @return[success Boolean]{
 *   True if we were able to process the message and have updated `rep.header`
 *   and `rep.bodyInfo` with populated objects.
 * }
 */
exports.chewBodyParts = function chewBodyParts(rep, bodyPartContents,
                                               folderId) {
  // XXX we really want to perform quoting analysis, yadda yadda.
  var fullBody = bodyPartContents.join('\n'),
      // Up to 80 characters of snippet, normalizing whitespace.
      snippet = fullBody.substring(0, 80).replace(/[\r\n\t ]+/g, ' ');

  rep.header = {
    // the UID (as an integer)
    id: rep.msg.id,
    // The sufficiently unique id is a concatenation of the UID onto the
    // folder id.
    suid: folderId + '/' + rep.msg.id,
    // The message-id header value; as GUID as get for now; on gmail we can
    // use their unique value, or if we could convince dovecot to tell us, etc.
    guid: rep.msg.msg.parsedHeaders['message-id'],
    // mailparser models from as an array; we do not.
    author: rep.msg.msg.from[0] || null,
    date: rep.msg.date,
    flags: rep.msg.flags,
    hasAttachments: rep.attachments.length > 0,
    subject: rep.msg.msg.subject,
    snippet: snippet,
  };

  // crappy size estimates where we assume the world is ASCII and so a UTF-8
  // encoding will take exactly 1 byte per character.
  var sizeEst = OBJ_OVERHEAD_EST + NUM_ATTR_OVERHEAD_EST +
                  4 * NULL_ATTR_OVERHEAD_EST;
  function sizifyAddrs(addrs) {
    sizeEst += LIST_ATTR_OVERHEAD_EST;
    for (var i = 0; i < addrs.length; i++) {
      var addrPair = addrs[i];
      sizeEst += OBJ_OVERHEAD_EST + 2 * STR_ATTR_OVERHEAD_EST +
                   addrPair.name.length + addrPair.address.length;
    }
    return addrs;
  }
  function sizifyAttachments(atts) {
    sizeEst += LIST_ATTR_OVERHEAD_EST;
    for (var i = 0; i < atts.length; i++) {
      var att = atts[i];
      sizeEst += OBJ_OVERHEAD_EST + 2 * STR_ATTR_OVERHEAD_EST +
                   att.name.length + att.type.length +
                   NUM_ATTR_OVERHEAD_EST;
    }
    return atts;
  }
  function sizifyStr(str) {
    sizeEst += STR_ATTR_OVERHEAD_EST + str.length;
    return str;
  }
  rep.bodyInfo = {
    date: rep.msg.date,
    size: sizeEst,
    to: ('to' in rep.msg.msg) ? sizifyAddrs(rep.msg.msg.to) : null,
    cc: ('cc' in rep.msg.msg) ? sizifyAddrs(rep.msg.msg.cc) : null,
    bcc: ('bcc' in rep.msg.msg) ? sizifyAddrs(rep.msg.msg.bcc) : null,
    replyTo: ('reply-to' in rep.msg.msg.parsedHeaders) ?
               sizifyStr(rep.msg.msg.parsedHeaders['reply-to']) : null,
    attachments: sizifyAttachments(rep.attachments),
    bodyText: sizifyStr(fullBody),
  };

  return true;
};

}); // end define
;
/**
 * Presents a message-centric view of a slice of time from IMAP search results.
 *
 * == Use-case assumptions
 *
 * - We are backing a UI showing a list of time-ordered messages.  This can be
 *   the contents of a folder, on-server search results, or the
 *   (server-facilitated) list of messages in a conversation.
 * - We want to fetch more messages as the user scrolls so that the entire
 *   contents of the folder/search results list are available.
 * - We want to show the message as soon as possible.  So we can show a message
 *   in the list before we have its snippet.  However, we do want the
 *   bodystructure before we show it so we can accurately know if it has
 *   attachments.
 * - We want to update the state of the messages in real-time as we hear about
 *   changes from the server, such as another client starring a message or
 *   marking the message read.
 * - We will synchronize some folders with either a time and/or message count
 *   threshold.
 * - We want mutations made locally to appear as if they are applied
 *   immediately, even if we are operating offline.
 *
 * == Efficiency desires
 *
 * - Avoid redundant network traffic by caching our results using IndexedDB.
 * - Keep the I/O burden and overhead low from caching/sync.  We know our
 *   primary IndexedDB implementation is backed by SQLite with full
 *   transaction commits corresponding to IndexedDB transaction commits.
 *   We also know that all IndexedDB work gets marshaled to another thread.
 *   Since the server is the final word in state, except for mutations we
 *   trigger, we don't need to be aggressive about persisting state.
 *   Accordingly, let's persist our data in big blocks only on major
 *   transitions (folder change) or when our memory usage is getting high.
 *   (If we were using LevelDB, large writes would probably be less
 *   desirable.)
 *
 * == Of slices, folders, and gmail
 *
 * It would be silly for a slice that is for browsing the folder unfiltered and
 * a slice that is a result of a search to act as if they were dealing with
 * different messages.  Similarly, it would be silly in gmail for us to fetch
 * a message that we know is the same message across multiple (labels as)
 * folders.  So we abstract away the storage details to `ImapFolderStorage`.
 *
 * == Latency, offline access, and IMAP
 *
 * The fundamental trade-off is between delaying showing things in the UI and
 * showing them and then having a bunch of stuff happen a split-second later.
 * (Messages appearing, disappearing, having their status change, etc.)
 *
 **/

define('rdimap/imapclient/imapslice',[
    'rdcommon/log',
    'mailparser/mailparser',
    './a64',
    './allback',
    './util',
    './imapchew',
    'module',
    'exports'
  ],
  function(
    $log,
    $mailparser,
    $a64,
    $allback,
    $imaputil,
    $imapchew,
    $module,
    exports
  ) {
const allbackMaker = $allback.allbackMaker,
      bsearchForInsert = $imaputil.bsearchForInsert,
      bsearchMaybeExists = $imaputil.bsearchMaybeExists;

/**
 * Compact an array in-place with nulls so that the nulls are removed.  This
 * is done by a scan with an adjustment delta and a final splice to remove
 * the spares.
 */
function compactArray(arr) {
  // this could also be done with a write pointer.
  var delta = 0, len = arr.length;
  for (var i = 0; i < len; i++) {
    var obj = arr[i];
    if (obj === null) {
      delta++;
      continue;
    }
    if (delta)
      arr[i - delta] = obj;
  }
  if (delta)
    arr.splice(len - delta, delta);
  return arr;
}

/**
 * Header info comparator that orders messages in order of numerically
 * decreasing date and UIDs.  So new messages come before old messages,
 * and messages with higher UIDs (newer-ish) before those with lower UIDs
 * (when the date is the same.)
 */
function cmpHeaderYoungToOld(a, b) {
  var delta = b.date - a.date;
  if (delta)
    return delta;
  // favor larger UIDs because they are newer-ish.
  return b.id - a.id;
}


/**
 * Book-keeping and limited agency for the slices.
 *
 * The way this works is that we get opened and
 */
function ImapSlice(bridgeHandle, storage, _parentLog) {
  this._bridgeHandle = bridgeHandle;
  bridgeHandle.__listener = this;
  this._storage = storage;
  this._LOG = LOGFAB.ImapSlice(this, _parentLog, bridgeHandle._handle);

  // The time range of the headers we are looking at right now.
  this.startTS = null;
  this.startUID = null;
  this.endTS = null;
  this.endUID = null;

  /**
   * Will we ingest new messages we hear about in our 'start' direction?
   */
  this.openStart = true;
  /**
   * Will we ingest new messages we hear about in our 'end' direction?
   */
  this.openEnd = true;

  this.waitingOnData = false;

  this.headers = [];
  this.desiredHeaders = INITIAL_FILL_SIZE;
}
exports.ImapSlice = ImapSlice;
ImapSlice.prototype = {
  /**
   * Force an update of our current date range.
   */
  refresh: function() {
    this._storage.refreshSlice(this);
  },

  reqNoteRanges: function() {
    // XXX implement and contend with the generals problem.  probably just have
    // the other side name the values by id rather than offsets.
  },

  reqGrow: function(dirMagnitude) {
  },

  setStatus: function(status) {
    if (!this._bridgeHandle)
      return;

    this._bridgeHandle.sendStatus(status, status === 'synced');
  },

  batchAppendHeaders: function(headers, moreComing) {
    this._LOG.headersAppended(headers);
    this._bridgeHandle.sendSplice(this.headers.length, 0, headers,
                                  true, moreComing);
    this.headers = this.headers.concat(headers);

    for (var i = 0; i < headers.length; i++) {
      var header = headers[i];
      if (this.startTS === null ||
          BEFORE(header.date, this.startTS)) {
        this.startTS = header.date;
        this.startUID = header.id;
      }
      else if (header.date === this.startTS &&
               header.id < this.startUID) {
        this.startUID = header.id;
      }
      if (this.endTS === null ||
          STRICTLY_AFTER(header.date, this.endTS)) {
        this.endTS = header.date;
        this.endUID = header.id;
      }
      else if (header.date === this.endTS &&
               header.id > this.endUID) {
        this.endUID = header.id;
      }
    }
  },

  /**
   * Tell the slice about a header it should be interested in.  This should
   * be unconditionally called by a sync populating this slice, or conditionally
   * called when the header is in the time-range of interest and a refresh,
   * cron-triggered sync, or IDLE/push tells us to do so.
   */
  onHeaderAdded: function(header) {
    if (!this._bridgeHandle)
      return;

    if (this.startTS === null ||
        BEFORE(header.date, this.startTS)) {
      this.startTS = header.date;
      this.startUID = header.id;
    }
    else if (header.date === this.startTS &&
             header.id < this.startUID) {
      this.startUID = header.id;
    }
    if (this.endTS === null ||
        STRICTLY_AFTER(header.date, this.endTS)) {
      this.endTS = header.date;
      this.endUID = header.id;
    }
    else if (header.date === this.endTS &&
             header.id > this.endUID) {
      this.endUID = header.id;
    }

    var idx = bsearchForInsert(this.headers, header,
                               cmpHeaderYoungToOld);
    this._LOG.headerAdded(idx, header);
    this._bridgeHandle.sendSplice(idx, 0, [header],
                                  this.waitingOnData, this.waitingOnData);
    this.headers.splice(idx, 0, header);
  },

  /**
   * Tells the slice that a header it should know about has changed.  (If
   * this is a search, it's okay for it not to know...)
   */
  onHeaderModified: function(header) {
    if (!this._bridgeHandle)
      return;

    // this can only affect flags which will not affect ordering
    var idx = bsearchMaybeExists(this.headers, header,
                                 cmpHeaderYoungToOld);
    if (idx !== null) {
      this._LOG.headerModified(idx, header);
      this._bridgeHandle.sendUpdate([idx, header]);
    }
  },

  /**
   * Tells the slice that a header it should know about has been removed.
   */
  onHeaderRemoved: function(header) {
    if (!this._bridgeHandle)
      return;

    var idx = bsearchMaybeExists(this.headers, header,
                                 cmpHeaderYoungToOld);
    if (idx !== null) {
      this._LOG.headerRemoved(idx, header);
      this._bridgeHandle.sendSplice(idx, 1, [],
                                    this.waitingOnData, this.waitingOnData);
      this.headers.splice(idx, 1);

      // update time-ranges if required...
      if (header.date === this.endTS && header.id === this.endUID) {
        if (!this.headers.length) {
          this.endTS = null;
          this.endUID = null;
        }
        else {
          this.endTS = this.headers[0].date;
          this.endUID = this.headers[0].id;
        }
      }
      if (header.date === this.startTS && header.id === this.startUID) {
        if (!this.headers.length) {
          this.startTS = null;
          this.startUID = null;
        }
        else {
          var lastHeader = this.headers[this.headers.length - 1];
          this.startTS = lastHeader.date;
          this.startUID = lastHeader.id;
        }
      }
    }
  },

  die: function() {
    this._bridgeHandle = null;
    this._storage.dyingSlice(this);
    this._LOG.__die();
  },
};

/**
 * We don't care about deleted messages, it's best that we're not aware of them.
 * However, it's important to keep in mind that this means that EXISTS provides
 * us with an upper bound on the messages in the folder since we are blinding
 * ourselves to deleted messages.
 */
const BASELINE_SEARCH_OPTIONS = ['!DELETED'];

/**
 * What is the maximum number of bytes a block should store before we split
 * it?
 */
const MAX_BLOCK_SIZE = 96 * 1024,
/**
 * How many bytes should we target for the small part when splitting 1:2?
 */
      BLOCK_SPLIT_SMALL_PART = 32 * 1024,
/**
 * How many bytes should we target for equal parts when splitting 1:1?
 */
      BLOCK_SPLIT_EQUAL_PART = 48 * 1024,
/**
 * How many bytes should we target for the large part when splitting 1:2?
 */
      BLOCK_SPLIT_LARGE_PART = 64 * 1024;

////////////////////////////////////////////////////////////////////////////////
// Time
//
// == JS Dates
//
// We primarily deal in UTC timestamps.  When we need to talk dates with IMAP
// (see next section), we need these timestamps to line up with midnight for
// a given day.  We do not need to line up with weeks, months, or years,
// saving us a lot of complexity.
//
// Day algebra is straightforward because JS Date objects have no concept of
// leap seconds.  We don't need to worry that a leap second will cause adding
// a day to be less than or more than a day.  Hooray!
//
// == IMAP and Time
//
// The stock IMAP SEARCH command's SINCE and BEFORE predicates only operate on
// whole-dates (and ignore the non-date time parts).  Additionally, SINCE is
// inclusive and BEFORE is exclusive.
//
// We use JS millisecond timestamp values throughout, and it's important to us
// that our date logic is consistent with IMAP's time logic where relevant.
// All of our IMAP-exposed time-interval related logic operates on day
// granularities.  Our timestamp/date values are always normalized to midnight
// which happily works out with intuitive range operations.
//
// Observe the pretty ASCII art where as you move to the right you are moving
// forward in time.
//
//        ________________________________________
// BEFORE)| midnight (0 millis) ... 11:59:59:999 |
//        [SINCE......................................
//
// Our date range comparisons (noting that larger timestamps are 'younger') are:
// SINCE analog:  (testDate >= comparisonDate)
//   testDate is as-recent-as or more-recent-than the comparisonDate.
// BEFORE analog: (testDate < comparisonDate)
//   testDate is less-recent-than the comparisonDate
//
// Because "who is the test date and who is the range value under discussion"
// can be unclear and the numerical direction of time is not always intuitive,
// I'm introducing simple BEFORE and SINCE helper functions to try and make
// the comparison logic ridiculously explicit as well as calling out where we
// are being consistent with IMAP.
//
// Not all of our time logic is consistent with IMAP!  Specifically, use of
// exclusive time bounds without secondary comparison keys means that ranges
// defined in this way cannot spread messages with the same timestamp over
// multiple ranges.  This allows for pathological data structure situations
// where there's too much data in a data block, etc.
// Our date ranges are defined by 'startTS' and 'endTS'.  Using math syntax, our
// IMAP-consistent time ranges end up as: [startTS, endTS).  It is always true
// that BEFORE(startTS, endTS) and SINCE(endTS, startTS) in these cases.
//
// As such, I've also created an ON_OR_BEFORE helper that allows equivalence and
// STRICTLY_AFTER that does not check equivalence to round out all possibilities
// while still being rather explicit.


/**
 * IMAP-consistent date comparison; read this as "Is `testDate` BEFORE
 * `comparisonDate`"?
 *
 * !BEFORE(a, b) === SINCE(a, b)
 */
function BEFORE(testDate, comparisonDate) {
  // testDate is numerically less than comparisonDate, so it is chronologically
  // before it.
  return testDate < comparisonDate;
}

function ON_OR_BEFORE(testDate, comparisonDate) {
  return testDate <= comparisonDate;
}

/**
 * IMAP-consistent date comparison; read this as "Is `testDate` SINCE
 * `comparisonDate`"?
 *
 * !SINCE(a, b) === BEFORE(a, b)
 */
function SINCE(testDate, comparisonDate) {
  // testDate is numerically greater-than-or-equal-to comparisonDate, so it
  // chronologically after/since it.
  return testDate >= comparisonDate;
}

function STRICTLY_AFTER(testDate, comparisonDate) {
  return testDate > comparisonDate;
}

function IN_BS_DATE_RANGE(testDate, startTS, endTS) {
  return testDate >= startTS && testDate < endTS;
}

//function DATE_RANGES_OVERLAP(A_startTS, A_endTS, B_startTS, B_endTS) {
//}

/**
 * The estimated size of a `HeaderInfo` structure.  We are using a constant
 * since there is not a lot of variability in what we are storing and this
 * is probably good enough.
 */
const HEADER_EST_SIZE_IN_BYTES = 200;

const DAY_MILLIS = 24 * 60 * 60 * 1000;

/**
 * Testing override that when present replaces use of Date.now().
 */
var TIME_WARPED_NOW = null, FUTURE_TIME_WARPED_NOW = null;
/**
 * Pretend that 'now' is actually a fixed point in time for the benefit of
 * unit tests using canned message stores.
 */
exports.TEST_LetsDoTheTimewarpAgain = function(fakeNow) {
  if (typeof(fakeNow) !== 'number')
    fakeNow = fakeNow.valueOf();
  TIME_WARPED_NOW = fakeNow;
  // because of exclusive time comparison ops , we actually want to use the first
  // day after the TIME_WARPED_NOW...
  FUTURE_TIME_WARPED_NOW = quantizeDate(fakeNow + DAY_MILLIS);
};

/**
 * Make a timestamp some number of days in the past, quantized to midnight of
 * that day.  This results in rounding up; if it's noon right now and you
 * ask for 2 days ago, you really get 2.5 days worth of time.
 */
function makeDaysAgo(numDays) {
  var //now = quantizeDate(TIME_WARPED_NOW || Date.now()),
      //past = now - numDays * DAY_MILLIS;
      past = (FUTURE_TIME_WARPED_NOW || quantizeDate(Date.now())) -
               (numDays + 1) * DAY_MILLIS;
  return past;
}
function makeDaysBefore(date, numDaysBefore) {
  return quantizeDate(date) - numDaysBefore * DAY_MILLIS;
}
/**
 * Quantize a date to midnight on that day.
 */
function quantizeDate(date) {
  if (typeof(date) === 'number')
    date = new Date(date);
  return date.setHours(0, 0, 0, 0).valueOf();
}

/**
 * How recent is recent enough for us to not have to talk to the server before
 * showing results?
 */
const RECENT_ENOUGH_TIME_THRESH = 6 * 60 * 60 * 1000;

////////////////////////////////////////////////////////////////////////////////

/**
 * How many messages should we send to the UI in the first go?
 */
var INITIAL_FILL_SIZE = 15;

/**
 * How many days in the past should we first look for messages.
 */
var INITIAL_SYNC_DAYS = 3;

/**
 * Testing support to adjust the value we use for the number of initial sync
 * days.  The tests are written with a value in mind (7), but 7 turns out to
 * be too high an initial value for actual use, but is fine for tests.
 */
exports.TEST_adjustSyncValues = function TEST_adjustSyncValues(syncDays) {
  INITIAL_SYNC_DAYS = syncDays;
};

/**
 * What is the furthest back in time we are willing to go?  This is an
 * arbitrary choice to avoid our logic going crazy, not to punish people with
 * comprehensive mail collections.
 */
const OLDEST_SYNC_DATE = (new Date(1990, 0, 1)).valueOf();

/**
 * If we issued a search for a date range and we are getting told about more
 * than the following number of messages, we will try and reduce the date
 * range proportionately (assuming a linear distribution) so that we sync
 * a smaller number of messages.  This will result in some wasted traffic
 * but better a small wasted amount (for UIDs) than a larger wasted amount
 * (to get the dates for all the messages.)
 */
const SYNC_BISECT_DATE_AT_N_MESSAGES = 50;

/**
 * What's the maximum number of messages we should ever handle in a go and
 * where we should start failing by pretending like we haven't heard of the
 * excess messages?  This is a question of message time-density and not a
 * limitation on the number of messages in a folder.
 *
 * This could be eliminated by adjusting time ranges when we know the
 * density is high (from our block indices) or by re-issuing search results
 * when the server is telling us more than we can handle.
 */
const TOO_MANY_MESSAGES = 2000;

/**
 * Fetch parameters to get the headers / bodystructure; exists to reuse the
 * object since every fetch is the same.  Note that imap.js always gives us
 * FLAGS and INTERNALDATE so we don't need to ask for that.
 *
 * We are intentionally not using ENVELOPE because Thunderbird intentionally
 * defaults to to not using ENVELOPE.  Per bienvenu in
 * https://bugzilla.mozilla.org/show_bug.cgi?id=402594#c33 "We stopped using it
 * by default because servers often had issues with it so it was more trouble
 * than it was worth."
 *
 * Of course, imap.js doesn't really support ENVELOPE outside of bodystructure
 * right now either, but that's a lesser issue.  We probably don't want to trust
 * that data, however, if we don't want to trust normal ENVELOPE.
 */
const INITIAL_FETCH_PARAMS = {
  request: {
    headers: ['FROM', 'TO', 'CC', 'BCC', 'SUBJECT', 'REPLY-TO', 'MESSAGE-ID'],
    struct: true
  },
};

/**
 * Fetch parameters to just get the flags, which is no parameters because
 * imap.js always fetches them right now.
 */
const FLAG_FETCH_PARAMS = {
  request: {
  },
};


/**
 * Folder connections do the actual synchronization logic.  They are associated
 * with one or more `ImapSlice` instances that issue the requests that trigger
 * synchronization.  Storage is handled by `ImapFolderStorage` or
 * `GmailMessageStorage` instances.
 *
 * == IMAP Protocol Connection Management
 *
 * We request IMAP protocol connections from the account.  There is currently no
 * way for us to surrender our connection or indicate to the account that we
 * are capable of surrending the connection.  That might be a good idea, though.
 *
 * All accesses to a folder's connection should be done through an
 * `ImapFolderConn`, even if the actual mutation logic is being driven by code
 * living in the account.
 *
 * == IDLE
 *
 * We plan to IDLE in folders that we have active slices in.  We are assuming
 * the most basic IDLE implementation where it will tell us when the number
 * of messages increases (EXISTS), or decreases (EXPUNGE and EXISTS), with no
 * notifications when flags change.  (This is my current understanding of how
 * gmail operates from internet searches; we're not quite yet to protocol
 * experimentation yet.)
 *
 * The idea is accordingly that we will use IDLE notifications as a hint that
 * we should do a SEARCH for new messages.  It is that search that will update
 * our accuracy information and only that.
 */
function ImapFolderConn(account, storage, _parentLog) {
  this._account = account;
  this._storage = storage;
  this._LOG = LOGFAB.ImapFolderConn(this, _parentLog, storage.folderId);

  this._conn = null;
  this.box = null;
}
ImapFolderConn.prototype = {
  /**
   * Acquire a connection and invoke the callback once we have it and we have
   * entered the folder.
   *
   * XXX This is inherently dangerous in the face of concurrent attempts to
   * call this method or check whether it has completed.  We need to move to
   * our queue of operations on the folder, or ensure that a higher level layer
   * is enforcing this.  To be done with proper mutation logic impl.
   */
  acquireConn: function(callback) {
    var self = this;
    this._account.__folderDemandsConnection(
      this._storage.folderId,
      function(conn) {
        self._conn = conn;
        // Now we have a connection, but it's not in the folder.
        // (If we were doing fancier sync like QRESYNC, we would not enter
        // in such a blase fashion.)
        self._conn.openBox(self._storage.folderMeta.path,
                           function openedBox(err, box) {
            if (err) {
              console.error('Problem entering folder',
                            self._storage.folderMeta.path);
              return;
            }
            self.box = box;
            callback(self);
          });
      });
  },

  relinquishConn: function() {
    if (!this._conn)
      return;

    this._account.__folderDoneWithConnection(this._storage.folderId,
                                             this._conn);
    this._conn = null;
  },

  /**
   * Wrap the search command and shirk the errors for now.  I was thinking we
   * might have this do automatic connection re-establishment, etc., but I think
   * it makes more sense to have the IMAP protocol connection object do that
   * under the hood or in participation with the account class via another
   * interface since it already handles command queueing.
   *
   * This also conveniently hides the connection acquisition asynchrony.
   */
  _reliaSearch: function(searchOptions, callback) {
    // If we don't have a connection, get one, then re-call.
    if (!this._conn) {
      this.acquireConn(this._reliaSearch.bind(this, searchOptions, callback));
      return;
    }

    this._conn.search(searchOptions, function(err, uids) {
        if (err) {
          console.error('Search error on', searchOptions, 'err:', err);
          return;
        }
        callback(uids);
      });
  },

  /**
   * Perform a search to find all the messages in the given date range.
   * Meanwhile, load the set of messages from storage.  Infer deletion of the
   * messages we already know about that should exist in the search results but
   * do not.  Retrieve information on the messages we don't know anything about
   * and update the metadata on the messages we do know about.
   *
   * An alternate way to accomplish the new/modified/deleted detection for a
   * range might be to do a search over the UID range of new-to-us UIDs and
   * then perform retrieval on what we get back.  We would do a flag fetch for
   * all the UIDs we already know about and use that to both get updated
   * flags and infer deletions from UIDs that don't report back.  Except that
   * might not work because the standard doesn't seem to say that if we
   * specify gibberish UIDs that it should keep going for the UIDs that are
   * not gibberish.  Also, it's not clear what the performance impact of the
   * additional search constraint might be on server performance.  (Of course,
   * if the server does not have an index on internaldate, these queries are
   * going to be very expensive and the UID limitation would probably be a
   * mercy to the server.)
   */
  syncDateRange: function(startTS, endTS, newToOld, doneCallback) {
    var searchOptions = BASELINE_SEARCH_OPTIONS.concat(), self = this,
      storage = self._storage;
    if (startTS)
      searchOptions.push(['SINCE', startTS]);
    if (endTS)
      searchOptions.push(['BEFORE', endTS]);

    var callbacks = allbackMaker(
      ['search', 'db'],
      function syncDateRangeLogic(results) {
        var serverUIDs = results.search, headers = results.db,
            knownUIDs = [], uid, numDeleted = 0,
            modseq = self._conn._state.box.highestModSeq || '';

        if (serverUIDs.length > SYNC_BISECT_DATE_AT_N_MESSAGES) {
          var effEndTS = endTS || FUTURE_TIME_WARPED_NOW ||
                           quantizeDate(Date.now() + DAY_MILLIS),
              curDaysDelta = (effEndTS - startTS) / DAY_MILLIS;
          // We are searching more than one day, we can shrink our search.

          if (curDaysDelta > 1) {
            // Assume a linear distribution of messages, but overestimated by
            // a factor of two so we undershoot.
            var shrinkScale = SYNC_BISECT_DATE_AT_N_MESSAGES /
                                (serverUIDs.length * 2),
                backDays = Math.max(1,
                                    Math.ceil(shrinkScale * curDaysDelta));
            self._curSyncDoNotGrowWindowBefore = startTS;
            self._curSyncDayStep = backDays;
            self._curSyncStartTS = startTS = makeDaysBefore(effEndTS, backDays);
console.log("backoff! had", serverUIDs.length, "from", curDaysDelta,
            "startTS", startTS, "endTS", endTS, "backDays", backDays);
            return self.syncDateRange(startTS, endTS,
                                      newToOld, doneCallback);
          }
        }

        // -- infer deletion, flag to distinguish known messages
        // rather than splicing lists and causing shifts, we null out values.
        for (var iMsg = 0; iMsg < headers.length; iMsg++) {
          var header = headers[iMsg];
          var idxUid = serverUIDs.indexOf(header.id);
          // deleted!
          if (idxUid === -1) {
            storage.deleteMessageHeaderAndBody(header);
            numDeleted++;
            headers[iMsg] = null;
            continue;
          }
          // null out the UID so the non-null values in the search are the
          // new messages to us.
          serverUIDs[idxUid] = null;
          // but save the UID so we can do a flag-check.
          knownUIDs.push(header.id);
        }

        var newUIDs = compactArray(serverUIDs); // (re-labeling, same array)
        if (numDeleted)
          compactArray(headers);

        return self._commonSync(
          newUIDs, knownUIDs, headers,
          function(newCount, knownCount) {
            self._LOG.syncDateRange_end(newCount, knownCount, numDeleted,
                                        startTS, endTS);
            self._storage.markSyncRange(startTS, endTS, modseq, Date.now());
            doneCallback(newCount + knownCount);
          });
      });

    this._LOG.syncDateRange_begin(null, null, null, startTS, endTS);
    this._reliaSearch(searchOptions, callbacks.search);
    this._storage.getAllMessagesInDateRange(startTS, endTS,
                                            callbacks.db);
  },

  searchDateRange: function(endTS, startTS, newToOld, searchParams,
                            slice) {
    var searchOptions = BASELINE_SEARCH_OPTIONS.concat(searchParams);
    if (startTS)
      searchOptions.push(['SINCE', startTS]);
    if (endTS)
      searchOptions.push(['BEFORE', endTS]);
  },

  /**
   * Given a list of new-to-us UIDs and known-to-us UIDs and their corresponding
   * headers, synchronize the flags for the known UIDs' headers and fetch and
   * create the header and body objects for the new UIDS.
   *
   * First we fetch the headers/bodystructures for the new UIDs all in one go;
   * all of these headers are going to end up in-memory at the same time, so
   * batching won't let us reduce the overhead right now.  We process them
   * to determine the body parts we should fetch as the results come in.  Once
   * we have them all, we sort them by date, endTS-to-startTS for the third
   * step and start issuing/pipelining the requests.
   *
   * Second, we issue the flag update requests for the known-to-us UIDs.  This
   * is done second so it can help avoid wasting the latency of the round-trip
   * that would otherwise result between steps one and three.  (Although we
   * could also mitigate that by issuing some step three requests even as
   * the step one requests are coming in; our sorting doesn't have to be
   * perfect and may already be reasonably well ordered if UIDs correlate
   * with internal date well.)
   *
   * Third, we fetch the body parts in our newest-to-startTS order, adding
   * finalized headers and bodies as we go.
   */
  _commonSync: function(newUIDs, knownUIDs, knownHeaders, doneCallback) {
    var conn = this._conn, storage = this._storage;
    // -- Fetch headers/bodystructures for new UIDs
    var newChewReps = [];
    if (newUIDs.length) {
      var newFetcher = this._conn.fetch(newUIDs, INITIAL_FETCH_PARAMS);
      newFetcher.on('message', function onNewMessage(msg) {
          msg.on('end', function onNewMsgEnd() {
            newChewReps.push($imapchew.chewHeaderAndBodyStructure(msg));
          });
        });
      newFetcher.on('error', function onNewFetchError(err) {
          // XXX the UID might have disappeared already?  we might need to have
          // our initiating command re-do whatever it's up to.  Alternatively,
          // we could drop back from a bulk fetch to a one-by-one fetch.
          console.warn('New UIDs fetch error, ideally harmless:', err);
        });
      newFetcher.on('end', function onNewFetchEnd() {
          // sort the messages, endTS to startTS (aka numerically descending)
          newChewReps.sort(function(a, b) {
              return b.msg.date - a.msg.date;
            });

          // - issue the bodypart fetches.
          // Use mailparser's body parsing capabilities, albeit not entirely in
          // the way it was intended to be used since it wants to parse full
          // messages.
          var mparser = new $mailparser.MailParser();
          function setupBodyParser(partDef) {
            mparser._state = 0x2; // body
            mparser._remainder = '';
            mparser._currentNode = null;
            mparser._currentNode = mparser._createMimeNode(null);
            // nb: mparser._multipartTree is an empty list (always)
            mparser._currentNode.meta.contentType =
              partDef.type + '/' + partDef.subtype;
            mparser._currentNode.meta.charset =
              partDef.params && partDef.params.charset;
            mparser._currentNode.meta.transferEncoding =
              partDef.encoding;
            mparser._currentNode.meta.textFormat =
              partDef.params && partDef.params.format;
          }
          function bodyParseBuffer(buffer) {
            process.immediate = true;
            mparser.write(buffer);
            process.immediate = false;
          }
          function finishBodyParsing() {
            process.immediate = true;
            mparser._process(true);
            process.immediate = false;
            return mparser._currentNode.content;
          }

          // XXX imap.js is currently not capable of issuing/parsing multiple
          // literal results from a single fetch result line.  It's not a
          // fundamentally hard problem, but I'd rather defer messing with its
          // parse loop (and internal state tracking) until a future time when
          // I can do some other cleanup at the same time.  (The subsequent
          // literals are just on their own lines with an initial space and then
          // the named literal.  Ex: " BODY[1.2] {2463}".)
          //
          // So let's issue one fetch per body part and then be happy when we've
          // got them all.
          var pendingFetches = 0;
          newChewReps.forEach(function(chewRep, iChewRep) {
            var partsReceived = [];
            chewRep.bodyParts.forEach(function(bodyPart) {
              var opts = { request: { body: bodyPart.partID } };
              pendingFetches++;
              var fetcher = conn.fetch(chewRep.msg.id, opts);
              setupBodyParser(bodyPart);
              fetcher.on('message', function(msg) {
                setupBodyParser(bodyPart);
                msg.on('data', bodyParseBuffer);
                msg.on('end', function() {
                  partsReceived.push(finishBodyParsing());

                  // -- Process
                  if (partsReceived.length === chewRep.bodyParts.length) {
                    if ($imapchew.chewBodyParts(chewRep, partsReceived,
                                                storage.folderId)) {
                      storage.addMessageHeader(chewRep.header);
                      storage.addMessageBody(chewRep.header, chewRep.bodyInfo);
                    }
                   // If this is the last chew rep, then use its completion
                   // to report our completion.
                    if (--pendingFetches === 0)
                      doneCallback(newUIDs.length, knownUIDs.length);
                  }
                });
              });
            });
          });
        });
    }

    // -- Fetch updated flags for known UIDs
    if (knownUIDs.length) {
      var knownFetcher = this._conn.fetch(knownUIDs, FLAG_FETCH_PARAMS);
      var numFetched = 0;
      knownFetcher.on('message', function onKnownMessage(msg) {
          // (Since we aren't requesting headers, we should be able to get
          // away without registering this next event handler and just process
          // msg right now, but let's wait on an optimization pass.)
          msg.on('end', function onKnownMsgEnd() {
            var i = numFetched++;
            // RFC 3501 doesn't seem to require that we get results in the order
            // we request them, so use indexOf if things don't line up.
            if (knownHeaders[i].id !== msg.id) {
              i = knownUIDs.indexOf(msg.id);
              // If it's telling us about a message we don't know about, run away.
              if (i === -1) {
                console.warn("Server fetch reports unexpected message:", msg.id);
                return;
              }
            }
            var header = knownHeaders[i];
            // (msg.flags comes sorted and we maintain that invariant)
            if (header.flags.toString() !== msg.flags.toString()) {
              header.flags = msg.flags;
              storage.updateMessageHeader(header.date, header.id, true, header);
            }
            else {
              storage.unchangedMessageHeader(header);
            }
          });
        });
      knownFetcher.on('error', function onKnownFetchError(err) {
          // XXX the UID might have disappeared already?  we might need to have
          // our initiating command re-do whatever it's up to.  Alternatively,
          // we could drop back from a bulk fetch to a one-by-one fetch.
          console.warn('Known UIDs fetch error, ideally harmless:', err);
        });
      if (!newUIDs.length) {
        knownFetcher.on('end', function() {
            doneCallback(newUIDs.length, knownUIDs.length);
          });
      }
    }

    if (!knownUIDs.length && !newUIDs.length) {
      doneCallback(newUIDs.length, knownUIDs.length);
    }
  },

  shutdown: function() {
    this._LOG.__die();
  },
};

/**
 * Per-folder message caching/storage named by their UID.  Storage also relies
 * on the IMAP internaldate of the message for efficiency.  Accordingly,
 * when performing a lookup, we either need the exact date of the message or
 * a reasonable bounded time range in which it could fall (which should be a
 * given for date range scans).
 *
 * Storage is done using IndexedDB, with message header information and message
 * body information stored in separate blocks of information.  Blocks are
 * loaded on demand, although preferably hints are received so we can pre-load
 * information.
 *
 * Blocks are discarded from memory (and written back if mutated) when there are
 * no longer live `ImapSlice` instances that care about the time range and we
 * are experiencing memory pressure.  Dirty blocks are periodically written
 * to storage even if there is no memory pressure at notable application and
 * synchronization state milestones.  Since the server is the canonical message
 * store, we are not exceedingly concerned about losing state.
 *
 * Messages are discarded from storage when experiencing storage pressure.  We
 * figure it's better to cache what we have until it's known useless (deleted
 * messages) or we definitely need the space for something else.
 *
 * == Concurrency and I/O
 *
 * The logic in this class can operate synchronously as long as the relevant
 * header/body blocks are in-memory.  For simplicity, we (asynchronously) defer
 * execution of calls that mutate state while loads are in-progress; callers
 * will not block.  This simplifies our implementation and thinking about our
 * implementation without making life for our users much worse.
 *
 * Specifically, all UI requests for data will be serviced immediately if the
 * data is available.  If the data is not available, the wait would have
 * happened anyways.  Mutations will be enqueued, but are always speculatively
 * assumed to succeed by the UI anyways so when they are serviced is not
 * exceedingly important other than a burden on us to surface in the UI that
 * we still have some state to synchronize to the server so the user does
 * not power-off their phone quite yet.
 *
 * == Types
 *
 * @typedef[AccuracyRangeInfo @dict[
 *   @key[endTS DateMS]
 *   @key[startTS DateMS]
 *   @key[fullSync @dict[
 *     @key[highestModseq #:optional String]{
 *       The highest modseq for this range, if we have one.  This would be the
 *       value reported on folder entry, plus any maximization that occurs if we
 *       utilized IDLE or some other mechanism to keep the range up-to-date.
 *       On servers without highestmodseq, this will be null.
 *     }
 *     @key[updated DateMS]{
 *       What was our local timestamp the last time we synchronized this range?
 *       This is speculative and probably just for debugging unless we have the
 *       UI reflect that in offline mode it knows what it is showing you could
 *       be fairly out of date.
 *     }
 *   }
 *   ]]{
 *     Did we fully synchronize this time range (because of a date scan)?  If
 *     false, the implication is that we know about the messages in this range
 *     because of some type of search.
 *   }
 * ]]{
 *   Describes the provenance of the data we have for a given time range.
 *   Tracked independently of the block data because there doesn't really seem
 *   to be an upside to coupling them.  The date ranges are inclusive; other
 *   blocks should differ by at least 1 millisecond.
 *
 *   This lets us know when we have sufficiently valid data to display messages
 *   without needing to talk to the server, allows us to size checks for
 *   new messages in time ranges, and should be a useful debugging aid.
 * }
 * @typedef[FolderBlockInfo @dict[
 *   @key[blockId BlockId]{
 *     The name of the block for storage access.
 *   }
 *   @key[startTS DateMS]{
 *     The timestamp of the last and therefore (possibly equally) oldest message
 *     in this block.  Forms the first part of a composite key with `startUID`.
 *   }
 *   @key[startUID UID]{
 *     The UID of the last and therefore (possibly equally) oldest message
 *     in this block.  Forms the second part of a composite key with `startTS`.
 *   }
 *   @key[endTS DateMS]{
 *     The timestamp of the first and therefore (possibly equally) newest
 *     message in this block.  Forms the first part of a composite key with
 *     `endUID`.
 *   }
 *   @key[endUID UID]{
 *     The UID of the first and therefore (possibly equally) newest message
 *     in this block.  Forms the second part of a composite key with `endTS`.
 *   }
 *   @key[count Number]{
 *     The number of messages in this bucket.
 *   }
 *   @key[estSize Number]{
 *     The estimated size in bytes all of the messages in this bucket use.  This
 *     is to assist us in known when to split/merge blocks.
 *   }
 * ]]{
 *   The directory entries for our `HeaderBlock` and `BodyBlock` instances.
 *   Currently, these are always stored in memory since they are small and
 *   there shouldn't be a tremendous number of them.
 *
 *   These
 * }
 * @typedef[EmailAddress String]
 * @typedef[NameAddressPair @dict[
 *   @key[address EmailAddress]
 *   @key[name String]
 * ]]
 * @typedef[HeaderInfo @dict[
 *   @key[id]{
 *     Either the UID or a more globally unique identifier (Gmail).
 *   }
 *   @key[suid]{
 *     The id prefixed with the folder id and a dash.
 *   }
 *   @key[author NameAddressPair]
 *   @key[date DateMS]
 *   @key[flags @listof[String]]
 *   @key[hasAttachments Boolean]
 *   @key[subject String]
 *   @key[snippet String]
 * ]]
 * @typedef[HeaderBlock @dict[
 *   @key[uids @listof[UID]]{
 *     The UIDs of the headers in the same order.  This is intended as a fast
 *     parallel search mechanism.  It can be discarded if it doesn't prove
 *     useful.
 *   }
 *   @key[headers @listof[HeaderInfo]]{
 *     Headers in numerically decreasing time and UID order.  The header at
 *     index 0 should correspond to the 'end' characteristics of the blockInfo
 *     and the header at n-1 should correspond to the start characteristics.
 *   }
 * ]]
 * @typedef[AttachmentInfo @dict[
 *   @key[name String]
 *   @key[type String]
 *   @key[part String]
 *   @key[sizeEstimate Number]{
 *     Estimated file size in bytes.
 *   }
 * ]]
 * @typedef[BodyInfo @dict[
 *   @key[date DateMS]{
 *     Redundantly stored date info for block splitting purposes.  We pretty
 *     much need this no matter what because our ordering is on the tuples of
 *     dates and UIDs, so we could have trouble efficiently locating our header
 *     from the body without this.
 *   }
 *   @key[size Number]
 *   @key[to @listof[NameAddressPair]]
 *   @key[cc @listof[NameAddressPair]]
 *   @key[bcc @listof[NameAddressPair]]
 *   @key[replyTo EmailAddress]
 *   @key[attachments @listof[AttachmentInfo]]
 *   @key[bodyText String]{
 *     The text of the message body.
 *   }
 * ]]{
 *   Information on the message body that is only for full message display.
 *   The to/cc/bcc information may get moved up to the header in the future,
 *   but our driving UI doesn't need it right now.
 * }
 * @typedef[BodyBlock @dict[
 *   @key[uids @listof[UID]]
 *   @key[bodies @dictof[
 *     @key["unique identifier" UID]
 *     @value[BodyInfo]
 *   ]]
 * ]]
 */
function ImapFolderStorage(account, folderId, persistedFolderInfo, dbConn,
                           _parentLog) {
  /** Our owning account. */
  this._account = account;
  this._imapDb = dbConn;

  this.folderId = folderId;
  this.folderMeta = persistedFolderInfo.$meta;
  this._folderImpl = persistedFolderInfo.$impl;

  this._LOG = LOGFAB.ImapFolderStorage(
    this, _parentLog, folderId);

  /**
   * @listof[AccuracyRangeInfo]{
   *   Newest-to-oldest sorted list of accuracy range info structures that are
   *   keyed by their IMAP-consistent startTS (inclusive) and endTS (exclusive)
   *   on a per-day granularity.
   * }
   */
  this._accuracyRanges = persistedFolderInfo.accuracy;
  /**
   * @listof[FolderBlockInfo]{
   *   Newest-to-oldest (numerically decreasing time and UID) sorted list of
   *   header folder block infos.  They are keyed by a composite key consisting
   *   of messages' "date" and "id" fields.
   * }
   */
  this._headerBlockInfos = persistedFolderInfo.headerBlocks;
  /**
   * @listof[FolderBlockInfo]{
   *   Newest-to-oldest (numerically decreasing time and UID) sorted list of
   *   body folder block infos.  They are keyed by a composite key consisting
   *   of messages' "date" and "id" fields.
   * }
   */
  this._bodyBlockInfos = persistedFolderInfo.bodyBlocks;

  /** @dictof[@key[BlockId] @value[HeaderBlock]] */
  this._headerBlocks = {};
  /** @dictof[@key[BlockId] @value[BodyBlock]] */
  this._bodyBlocks = {};

  this._bound_makeHeaderBlock = this._makeHeaderBlock.bind(this);
  this._bound_insertHeaderInBlock = this._insertHeaderInBlock.bind(this);
  this._bound_splitHeaderBlock = this._splitHeaderBlock.bind(this);
  this._bound_deleteHeaderFromBlock = this._deleteHeaderFromBlock.bind(this);

  this._bound_makeBodyBlock = this._makeBodyBlock.bind(this);
  this._bound_insertBodyInBlock = this._insertBodyInBlock.bind(this);
  this._bound_splitBodyBlock = this._splitBodyBlock.bind(this);
  this._bound_deleteBodyFromBlock = this._deleteBodyFromBlock.bind(this);

  /**
   * Has our internal state altered at all and will need to be persisted?
   */
  this._dirty = false;
  /** @dictof[@key[BlockId] @value[HeaderBlock]] */
  this._dirtyHeaderBlocks = {};
  /** @dictof[@key[BlockId] @value[BodyBlock]] */
  this._dirtyBodyBlocks = {};

  /**
   * @listof[AggrBlockId]
   */
  this._pendingLoads = [];
  /**
   * @dictof[
   *   @key[AggrBlockId]
   *   @key[@listof[@func]]
   * ]
   */
  this._pendingLoadListeners = {};

  /**
   * @listof[@func[]]{
   *   A list of fully-bound functions to drain when the last pending load gets
   *   loaded, at least until a new load goes pending.
   * }
   */
  this._deferredCalls = [];

  /**
   * The number of pending mutation requests on the folder; currently because
   * of how mutation operations are scheduled, this will either be 0 or 1.
   * This will probably still remain true in the future, but we will adopt a
   * connection reclaimation strategy so we don't keep jumping into and out of
   * the same folder.
   */
  this._pendingMutationCount = 0;

  /**
   * Active view slices on this folder.
   */
  this._slices = [];
  /**
   * The slice that is driving our current synchronization and wants to hear
   * about all header modifications/notes as they occur.
   */
  this._curSyncSlice = null;
  /**
   * The start range of the (backward-moving) sync time range.
   */
  this._curSyncStartTS = null;
  /**
   * The number of days we are looking into the past in the current sync step.
   */
  this._curSyncDayStep = null;
  /**
   * If non-null, then we must reach a sync start date of the provided date
   * before we begin increasing _curSyncDayStep.  This helps us avoid
   * oscillation where we make the window too large, shrink it, but then find
   * find nothing.  Since we know that there are going to be a lot of messages
   * before we hit this date, it makes sense to keep taking smaller sync steps.
   */
  this._curSyncDoNotGrowWindowBefore = null;

  this.folderConn = new ImapFolderConn(account, this, this._LOG);
}
exports.ImapFolderStorage = ImapFolderStorage;
ImapFolderStorage.prototype = {
  generatePersistenceInfo: function() {
    if (!this._dirty)
      return null;
    var pinfo = {
      id: this.folderId,
      headerBlocks: this._dirtyHeaderBlocks,
      bodyBlocks: this._dirtyBodyBlocks,
    };
    this._dirtyHeaderBlocks = {};
    this._dirtyBodyBlocks = {};
    this._dirty = false;
    return pinfo;
  },

  /**
   * Create an empty header `FolderBlockInfo` and matching `HeaderBlock`.  The
   * `HeaderBlock` will be inserted into the block map, but it's up to the
   * caller to insert the returned `FolderBlockInfo` in the right place.
   */
  _makeHeaderBlock: function ifs__makeHeaderBlock(
      startTS, startUID, endTS, endUID, estSize, uids, headers) {
    var blockId = $a64.encodeInt(this._folderImpl.nextHeaderBlock++),
        blockInfo = {
          blockId: blockId,
          startTS: startTS,
          startUID: startUID,
          endTS: endTS,
          endUID: endUID,
          count: uids ? uids.length : 0,
          estSize: estSize || 0,
        },
        block = {
          uids: uids || [],
          headers: headers || [],
        };
    this._dirty = true;
    this._headerBlocks[blockId] = block;
    this._dirtyHeaderBlocks[blockId] = block;
    return blockInfo;
  },

  _insertHeaderInBlock: function ifs__insertHeaderInBlock(header, uid, info,
                                                          block) {
    var idx = bsearchForInsert(block.headers, header, cmpHeaderYoungToOld);
    block.uids.splice(idx, 0, header.id);
    block.headers.splice(idx, 0, header);
    this._dirty = true;
    this._dirtyHeaderBlocks[info.blockId] = block;
    // Insertion does not need to update start/end TS/UID because the calling
    // logic is able to handle it.
  },

  _deleteHeaderFromBlock: function ifs__deleteHeaderFromBlock(uid, info, block) {
    var idx = block.uids.indexOf(uid), header;
    // - remove, update counts
    block.uids.splice(idx, 1);
    block.headers.splice(idx, 1);
    info.estSize -= HEADER_EST_SIZE_IN_BYTES;
    info.count--;
    // - update endTS/endUID if necessary
    if (idx === 0 && info.count) {
      header = block.headers[0];
      info.endTS = header.date;
      info.endUID = header.id;
    }
    // - update startTS/startUID if necessary
    if (idx === info.count && idx > 0) {
      header = block.headers[idx - 1];
      info.startTS = header.date;
      info.startUID = header.id;
    }
  },

  /**
   * Split the contents of the given header block into a newer and older block.
   * The newer info block will be mutated in place; the older block info will
   * be created and returned.  The newer block is filled with data until it
   * first overflows newerTargetBytes.  This method is responsible for updating
   * the actual containing blocks as well.
   */
  _splitHeaderBlock: function ifs__splitHeaderBlock(splinfo, splock,
                                                    newerTargetBytes) {
    // We currently assume a fixed size, so this is easy.
    var numHeaders = Math.ceil(newerTargetBytes / HEADER_EST_SIZE_IN_BYTES);
    if (numHeaders > splock.headers.length)
      throw new Error("No need to split!");

    var olderNumHeaders = splock.headers.length - numHeaders,
        olderEndHeader = splock.headers[numHeaders],
        olderInfo = this._makeHeaderBlock(
                      // Take the start info from the block, because it may have
                      // been extended beyond the header (for an insertion if
                      // we change back to inserting after splitting.)
                      splinfo.startTS, splinfo.startUID,
                      olderEndHeader.date, olderEndHeader.id,
                      olderNumHeaders * HEADER_EST_SIZE_IN_BYTES,
                      splock.uids.splice(numHeaders, olderNumHeaders),
                      splock.headers.splice(numHeaders, olderNumHeaders));

    var newerStartHeader = splock.headers[numHeaders - 1];
    splinfo.count = numHeaders;
    splinfo.estSize = numHeaders * HEADER_EST_SIZE_IN_BYTES;
    splinfo.startTS = newerStartHeader.date;
    splinfo.startUID = newerStartHeader.id;

    return olderInfo;
  },

  /**
   * Create an empty header `FolderBlockInfo` and matching `BodyBlock`.  The
   * `BodyBlock` will be inserted into the block map, but it's up to the
   * caller to insert the returned `FolderBlockInfo` in the right place.
   */
  _makeBodyBlock: function ifs__makeBodyBlock(
      startTS, startUID, endTS, endUID, size, uids, bodies) {
    var blockId = $a64.encodeInt(this._folderImpl.nextBodyBlock++),
        blockInfo = {
          blockId: blockId,
          startTS: startTS,
          startUID: startUID,
          endTS: endTS,
          endUID: endUID,
          count: uids ? uids.length : 0,
          estSize: size || 0,
        },
        block = {
          uids: uids || [],
          bodies: bodies || {},
        };
    this._dirty = true;
    this._bodyBlocks[blockId] = block;
    this._dirtyBodyBlocks[blockId] = block;
    return blockInfo;
  },

  _insertBodyInBlock: function ifs__insertBodyInBlock(body, uid, info, block) {
    function cmpBodyByUID(aUID, bUID) {
      var aDate = (aUID === uid) ? body.date : block.bodies[aUID].date,
          bDate = (bUID === uid) ? body.date : block.bodies[bUID].date,
          d = bDate - aDate;
      if (d)
        return d;
      d = bUID - aUID;
      return d;
    }

    var idx = bsearchForInsert(block.uids, uid, cmpBodyByUID);
    block.uids.splice(idx, 0, uid);
    block.bodies[uid] = body;
    this._dirty = true;
    this._dirtyBodyBlocks[info.blockId] = block;
    // Insertion does not need to update start/end TS/UID because the calling
    // logic is able to handle it.
  },

  _deleteBodyFromBlock: function ifs__deleteBodyFromBlock(uid, info, block) {
    // - delete
    var idx = block.uids.indexOf(uid);
    block.uids.splice(idx, 1);
    var body = block.bodies[uid];
    delete block.bodies[uid];
    info.estSize -= body.size;
    info.count--;

    // - update endTS/endUID if necessary
    if (idx === 0 && info.count) {
      info.endUID = uid = block.uids[0];
      info.endTS = block.bodies[uid].date;
    }
    // - update startTS/startUID if necessary
    if (idx === info.count && idx > 0) {
      info.startUID = uid = block.uids[idx - 1];
      info.startTS = block.bodies[uid].date;
    }
  },

  _splitBodyBlock: function ifs__splitBodyBlock(splinfo, splock,
                                                newerTargetBytes) {
    // Save off the start timestamp/uid; these may have been extended beyond the
    // delimiting bodies because of the insertion triggering the split.  (At
    // least if we start inserting after splitting again in the future.)
    var savedStartTS = splinfo.startTS, savedStartUID = splinfo.startUID;

    var newerBytes = 0, uids = splock.uids, newDict = {}, oldDict = {},
        inNew = true, numHeaders = null;
    for (var i = 0; i < uids.length; i++) {
      var uid = uids[i],
          body = splock.bodies[uid];
      if (inNew) {
        newerBytes += body.size;
        newDict[uid] = body;
        if (newerBytes >= newerTargetBytes) {
          inNew = false;
          splinfo.count = numHeaders = i + 1;
          splinfo.startTS = body.date;
          splinfo.startUID = uid;
        }
      }
      else {
        oldDict[uid] = body;
      }
    }

    var oldEndUID = uids[numHeaders];
    var olderInfo = this._makeBodyBlock(
      savedStartTS, savedStartUID,
      oldDict[oldEndUID].date, oldEndUID,
      splinfo.estSize - newerBytes,
      uids.splice(numHeaders, uids.length - numHeaders),
      oldDict);
    splinfo.estSize = newerBytes;
    splock.bodies = newDict;

    return olderInfo;
  },

  /**
   * Find the first object that contains date ranges whose date ranges contains
   * the provided date.  For use to find the right index in `_accuracyRanges`,
   * `_headerBlockInfos`, and `_bodyBlockInfos`, all of which are pre-sorted.
   *
   * @return[@list[
   *   @param[index Number]{
   *     The index of the Object that contains the date, or if there is no such
   *     structure, the index that it should be inserted at.
   *   }
   *   @param[inside Object]
   * ]]
   */
  _findRangeObjIndexForDate: function ifs__findRangeObjIndexForDate(
      list, date) {
    var i;
    // linear scan for now; binary search later
    for (i = 0; i < list.length; i++) {
      var info = list[i];
      // - Stop if we will never find a match if we keep going.
      // If our date is after the end of this range, then it will never fall
      // inside any subsequent ranges, because they are all chronologically
      // earlier than this range.
      if (SINCE(date, info.endTS))
        return [i, null];
      // therefore BEFORE(date, info.endTS)

      if (SINCE(date, info.startTS))
        return [i, info];
      // (Older than the startTS, keep going.)
    }

    return [i, null];
  },

  /**
   * Find the first object that contains date ranges whose date ranges contains
   * the provided composite date/UID.  For use to find the right index in
   * `_headerBlockInfos`, and `_bodyBlockInfos`, all of which are pre-sorted.
   *
   * @return[@list[
   *   @param[index Number]{
   *     The index of the Object that contains the date, or if there is no such
   *     structure, the index that it should be inserted at.
   *   }
   *   @param[inside Object]
   * ]]
   */
  _findRangeObjIndexForDateAndUID: function ifs__findRangeObjIndexForDateAndUID(
      list, date, uid) {
    var i;
    // linear scan for now; binary search later
    for (i = 0; i < list.length; i++) {
      var info = list[i];
      // - Stop if we will never find a match if we keep going.
      // If our date is after the end of this range, then it will never fall
      // inside any subsequent ranges, because they are all chronologically
      // earlier than this range.
      // If our date is the same and our UID is higher, then likewise we
      // shouldn't go further because UIDs decrease too.
      if (STRICTLY_AFTER(date, info.endTS) ||
          (date === info.endTS && uid > info.endUID))
        return [i, null];
      // therefore BEFORE(date, info.endTS) ||
      //           (date === info.endTS && uid <= info.endUID)

      if (STRICTLY_AFTER(date, info.startTS) ||
          (date === info.startTS && uid >= info.startUID))
        return [i, info];
      // (Older than the startTS, keep going.)
    }
    return [i, null];
  },


  /**
   * Find the first object that contains date ranges that overlaps the provided
   * date range.  Scans from the present into the past.
   */
  _findFirstObjIndexForDateRange: function ifs__findFirstObjIndexForDateRange(
      list, startTS, endTS) {
    var i;
    // linear scan for now; binary search later
    for (i = 0; i < list.length; i++) {
      var info = list[i];
      // - Stop if we will never find a match if we keep going.
      // If our comparison range starts AT OR AFTER the end of this range, then
      // it does not overlap this range and will never overlap any subsequent
      // ranges because they are all chronologically earlier than this range.
      //
      // nb: We are saying that there is no overlap if one range starts where
      // the other one ends.  This is consistent with the inclusive/exclusive
      // definition of since/before and our ranges.
      if (SINCE(startTS, info.endTS))
        return [i, null];
      // therefore BEFORE(startTS, info.endTS)

      // nb: SINCE(endTS, info.startTS) is not right here because the equals
      // case does not result in overlap because endTS is exclusive.
      if (STRICTLY_AFTER(endTS, info.startTS))
        return [i, info];

      // (no overlap yet)
    }

    return [i, null];
  },

  /**
   * Find the last object that contains date ranges that overlaps the provided
   * date range.  Scans from the past into the present.
   */
  _findLastObjIndexForDateRange: function ifs__findLastObjIndexForDateRange(
      list, startTS, endTS) {
    var i;
    // linear scan for now; binary search later
    for (i = list.length - 1; i >= 0; i--) {
      var info = list[i];
      // - Stop if we will never find a match if we keep going.
      // If our comparison range ends ON OR BEFORE the end of this range, then
      // it does not overlap this range and will never overlap any subsequent
      // ranges because they are all chronologically later than this range.
      //
      // nb: We are saying that there is no overlap if one range starts where
      // the other one ends.  This is consistent with the inclusive/exclusive
      // definition of since/before and our ranges.
      if (ON_OR_BEFORE(endTS, info.startTS))
        return [i + 1, null];
      // therefore STRICTLY_AFTER(endTS, info.startTS)

      // we match in this entry if the start stamp is before the range's end
      if (BEFORE(startTS, info.endTS))
        return [i, info];

      // (no overlap yet)
    }

    return [0, null];
  },


  /**
   * Find the first object in the list whose `date` falls inside the given
   * IMAP style date range.
   */
  _findFirstObjForDateRange: function ifs__findFirstObjForDateRange(
      list, startTS, endTS) {
    var i;
    for (i = 0; i < list.length; i++) {
      var date = list[i].date;
      if (IN_BS_DATE_RANGE(date, startTS, endTS))
        return [i, list[i]];
    }
    return [i, null];
  },

  /**
   * Find the right block to insert a header/body into using its date and UID.
   * This is an asynchronous operation because we potentially need to load
   * blocks from disk.
   *
   * == Usage patterns
   *
   * - In initial-sync cases and scrolling down through the list, we will
   *   generate messages from a younger-to-older direction.  The insertion point
   *   will then likely occur after the last block.
   * - In update-sync cases, we should be primarily dealing with new mail which
   *   is still retrieved endTS to startTS.  The insertion point will start
   *   before the first block and then move backwards within that block.
   * - Update-sync cases may also encounter messages moved into the folder
   *   from other folders since the last sync.  An archive folder is the
   *   most likely case for this, and we would expect random additions with a
   *   high degree of clustering on message date.
   * - Update-sync cases may experience a lot of apparent message deletion due
   *   to actual deletion or moves to other folders.  These can shrink blocks
   *   and we need to consider block merges to avoid pathological behavior.
   * - Forgetting messages that are no longer being kept alive by sync settings
   *   or apparent user interest.  There's no benefit to churn for the sake of
   *   churn, so we can just forget messages in blocks wholesale when we
   *   experience disk space pressure (from ourselves or elsewhere).  In that
   *   case we will want to traverse from the startTS messages, dropping them and
   *   consolidating blocks as we go until we have freed up enough space.
   *
   * == General strategy
   *
   * - If we fall in an existing block and it won't overflow, use it.
   * - If we fall in an existing block and it would overflow, split it.
   * - If we fall outside existing blocks, check older and newer blocks in that
   *   order for a non-overflow fit.  If we would overflow, pick the existing
   *   block further from the center to perform a split.
   * - If there are no existing blocks at all, create a new one.
   * - When splitting, if we are the first or last block, split 2/3 towards the
   *   center and 1/3 towards the edge.  The idea is that growth is most likely
   *   to occur near the edges, so concentrate the empty space there without
   *   leaving the center blocks so overloaded they can't accept random
   *   additions without further splits.
   * - When splitting, otherwise, split equally-ish.
   *
   * == Block I/O
   *
   * While we can make decisions about where to insert things, we need to have
   * blocks in memory in order to perform the actual splits.  The outcome
   * of splits can't be predicted because the size of things in blocks is
   * only known when the block is loaded.
   *
   * @args[
   *   @param[type @oneof['header' 'body']]
   *   @param[date DateMS]
   *   @param[estSizeCost Number]{
   *     The rough byte cost of whatever we want to stick in a block.
   *   }
   *   @param[thing Object]
   *   @param[blockPickedCallback @func[
   *     @args[
   *       @param[blockInfo FolderBlockInfo]
   *       @param[block @oneof[HeaderBlock BodyBlock]]
   *     ]
   *   ]]{
   *     Callback function to invoke once we have found/created/made-room-for
   *     the thing in the block.  This needs to be a callback because if we need
   *     to perform any splits, we require that the block be loaded into memory
   *     first.  (For consistency and simplicity, we then made us always return
   *     the block.)
   *   }
   * ]
   */
  _insertIntoBlockUsingDateAndUID: function ifs__pickInsertionBlocks(
      type, date, uid, estSizeCost, thing, blockPickedCallback) {
    var blockInfoList, blockMap, makeBlock, insertInBlock, splitBlock;
    if (type === 'header') {
      blockInfoList = this._headerBlockInfos;
      blockMap = this._headerBlocks;
      makeBlock = this._bound_makeHeaderBlock;
      insertInBlock = this._bound_insertHeaderInBlock;
      splitBlock = this._bound_splitHeaderBlock;
    }
    else {
      blockInfoList = this._bodyBlockInfos;
      blockMap = this._bodyBlocks;
      makeBlock = this._bound_makeBodyBlock;
      insertInBlock = this._bound_insertBodyInBlock;
      splitBlock = this._bound_splitBodyBlock;
    }

    // -- find the current containing block / insertion point
    var infoTuple = this._findRangeObjIndexForDateAndUID(blockInfoList,
                                                         date, uid),
        iInfo = infoTuple[0], info = infoTuple[1];

    // -- not in a block, find or create one
    if (!info) {
      // - Create a block if no blocks exist at all.
      if (blockInfoList.length === 0) {
        info = makeBlock(date, uid, date, uid);
        blockInfoList.splice(iInfo, 0, info);
      }
      // - Is there a trailing/older dude and we fit?
      else if (iInfo < blockInfoList.length &&
               blockInfoList[iInfo].estSize + estSizeCost < MAX_BLOCK_SIZE) {
        info = blockInfoList[iInfo];

        // We are chronologically/UID-ically more recent, so check the end range
        // for expansion needs.
        if (STRICTLY_AFTER(date, info.endTS)) {
          info.endTS = date;
          info.endUID = uid;
        }
        else if (date === info.endTS &&
                 uid > info.endUID) {
          info.endUID = uid;
        }
      }
      // - Is there a preceding/younger dude and we fit?
      else if (iInfo > 0 &&
               blockInfoList[iInfo - 1].estSize + estSizeCost < MAX_BLOCK_SIZE){
        info = blockInfoList[--iInfo];

        // We are chronologically less recent, so check the start range for
        // expansion needs.
        if (BEFORE(date, info.startTS)) {
          info.startTS = date;
          info.startUID = uid;
        }
        else if (date === info.startTS &&
                 uid < info.startUID) {
          info.startUID = uid;
        }
      }
      // Any adjacent blocks at this point are overflowing, so it's now a
      // question of who to split.  We pick the one further from the center that
      // exists.
      // - Preceding (if possible and) suitable OR the only choice
      else if ((iInfo > 0 && iInfo < blockInfoList.length / 2) ||
               (iInfo === blockInfoList.length)) {
        info = blockInfoList[--iInfo];
        // We are chronologically less recent, so check the start range for
        // expansion needs.
        if (BEFORE(date, info.startTS)) {
          info.startTS = date;
          info.startUID = uid;
        }
        else if (date === info.startTS &&
                 uid < info.startUID) {
          info.startUID = uid;
        }
      }
      // - It must be the trailing dude
      else {
        info = blockInfoList[iInfo];
        // We are chronologically/UID-ically more recent, so check the end range
        // for expansion needs.
        if (STRICTLY_AFTER(date, info.endTS)) {
          info.endTS = date;
          info.endUID = uid;
        }
        else if (date === info.endTS &&
                 uid > info.endUID) {
          info.endUID = uid;
        }
      }
    }
    // (info now definitely exists and is definitely in blockInfoList)

    function processBlock(block) { // 'this' gets explicitly bound
      // -- perform the insertion
      // We could do this after the split, but this makes things simpler if
      // we want to factor in the newly inserted thing's size in the
      // distribution of bytes.
      info.estSize += estSizeCost;
      info.count++;
      insertInBlock(thing, uid, info, block);

      // -- split if necessary
      if (info.estSize >= MAX_BLOCK_SIZE) {
        // - figure the desired resulting sizes
        var firstBlockTarget;
        // big part to the center at the edges (favoring front edge)
        if (iInfo === 0)
          firstBlockTarget = BLOCK_SPLIT_SMALL_PART;
        else if (iInfo === blockInfoList.length - 1)
          firstBlockTarget = BLOCK_SPLIT_LARGE_PART;
        // otherwise equal split
        else
          firstBlockTarget = BLOCK_SPLIT_EQUAL_PART;


        // - split
        var olderInfo;
        olderInfo = splitBlock(info, block, firstBlockTarget);
        blockInfoList.splice(iInfo + 1, 0, olderInfo);

        // - figure which of the blocks our insertion went in
        if (BEFORE(date, olderInfo.endTS) ||
            ((date === olderInfo.endTS) && (uid <= olderInfo.endUID))) {
          iInfo++;
          info = olderInfo;
          block = blockMap[info.blockId];
        }
      }
      // otherwise, no split necessary, just use it

      if (blockPickedCallback)
        blockPickedCallback(info, block);
    }

    if (blockMap.hasOwnProperty(info.blockId))
      processBlock.call(this, blockMap[info.blockId]);
    else
      this._loadBlock(type, info.blockId, processBlock.bind(this));
  },

  /**
   * Request the load of the given block and the invocation of the callback with
   * the block when the load completes.
   */
  _loadBlock: function ifs__loadBlock(type, blockId, callback) {
    if (blockId == null)
      throw new Error('Bad block id!');
    var aggrId = type + blockId;
    if (this._pendingLoads.indexOf(aggrId) !== -1) {
      this._pendingLoadListeners[aggrId].push(callback);
      return;
    }

    var index = this._pendingLoads.length;
    this._pendingLoads.push(aggrId);
    this._pendingLoadListeners[aggrId] = [callback];

    var self = this;
    function onLoaded(block) {
      if (!block)
        self._LOG.badBlockLoad(type, blockId);
      self._LOG.loadBlock_end(type, blockId, block);
      if (type === 'header')
        self._headerBlocks[blockId] = block;
      else
        self._bodyBlocks[blockId] = block;
      self._pendingLoads.splice(self._pendingLoads.indexOf(aggrId), 1);
      var listeners = self._pendingLoadListeners[aggrId];
      delete self._pendingLoadListeners[aggrId];
      for (var i = 0; i < listeners.length; i++) {
        listeners[i](block);
      }
    }

    this._LOG.loadBlock_begin(type, blockId);
    if (type === 'header')
      this._imapDb.loadHeaderBlock(this.folderId, blockId, onLoaded);
    else
      this._imapDb.loadBodyBlock(this.folderId, blockId, onLoaded);
  },

  _deleteFromBlock: function ifs__deleteFromBlock(type, date, uid, callback) {
    var blockInfoList, blockMap, deleteFromBlock;
    if (type === 'header') {
      blockInfoList = this._headerBlockInfos;
      blockMap = this._headerBlocks;
      deleteFromBlock = this._bound_deleteHeaderFromBlock;
    }
    else {
      blockInfoList = this._bodyBlockInfos;
      blockMap = this._bodyBlocks;
      deleteFromBlock = this._bound_deleteBodyFromBlock;
    }

    var infoTuple = this._findRangeObjIndexForDateAndUID(blockInfoList,
                                                         date, uid),
        iInfo = infoTuple[0], info = infoTuple[1];
    // If someone is asking for us to delete something, there should definitely
    // be a block that includes it!
    if (!info) {
      console.warn('Unable to find block that owns:', type, date, uid);
      return;
    }

    function processBlock(block) {
      // The delete function is in charge of updating the start/end TS/UID info
      // because it knows about the internal block structure to do so.
      deleteFromBlock(uid, info, block);

      // - Nuke the block if it's empty
      if (info.count === 0) {
        blockInfoList.splice(iInfo, 1);
        delete blockMap[info.blockId];

        this._dirty = true;
        if (type === 'header')
          this._dirtyHeaderBlocks[info.blockId] = null;
        else
          this._dirtyBodyBlocks[info.blockId] = null;
      }

      if (callback)
        callback();
    }
    if (blockMap.hasOwnProperty(info.blockId))
      processBlock.call(this, blockMap[info.blockId]);
    else
      this._loadBlock(type, info.blockId, processBlock.bind(this));
  },

  /**
   * Track a new slice that wants to start from 'now'.  We will provide it with
   * messages once we have a "sufficiently recent" set of data on the messages.
   *
   * We will tell the slice about what we know about immediately (and without
   * waiting for the server) if we are offline or the data we have is fairly
   * recent.  We will wait for sync if we have no data or we believe we have
   * network and are sufficiently out-of-date that what we show the user would
   * be useless.
   */
  sliceOpenFromNow: function ifs_sliceOpenFromNow(slice, daysDesired) {
    daysDesired = daysDesired || INITIAL_SYNC_DAYS;
    this._slices.push(slice);
    if (this._curSyncSlice) {
      console.error("Trying to open a slice and initiate a sync when there",
                    "is already an active sync slice!");
    }

    // -- Check if we have sufficiently useful data on hand.

    var now = TIME_WARPED_NOW || Date.now(),
        futureNow = FUTURE_TIME_WARPED_NOW || null,
        pastDate = makeDaysAgo(daysDesired),
        iAcc, iHeadBlock, ainfo,
        // What is the startTS fullSync data we have for the time range?
        worstGoodData = 0;

    for (iAcc = 0; iAcc < this._accuracyRanges.length; i++) {
      ainfo = this._accuracyRanges[iAcc];
      if (BEFORE(pastDate, ainfo.endTS))
        break;
      if (!ainfo.fullSync)
        break;
      if (worstGoodData)
        worstGoodData = Math.min(ainfo.fullSync.updated, worstGoodData);
      else
        worstGoodData = ainfo.fullSync.updated;
    }
    var existingDataGood;
    if (!this._account.universe.online)
      existingDataGood = true;
    else // TODO: consider just filling from the db if recent enough
      //existingDataGood = (worstGoodData + RECENT_ENOUGH_TIME_THRESH > now);
      existingDataGood = false;

    // -- Good existing data, fill the slice from the DB
    if (existingDataGood) {
      // We can adjust our start time to the dawn of time since we have a
      // limit in effect.
      slice.waitingOnData = 'db';
      this.getMessagesInDateRange(0, futureNow, INITIAL_FILL_SIZE,
                                  this.onFetchDBHeaders.bind(this, slice));
      return;
    }

    // -- Bad existing data, issue a sync and have the slice
    slice.setStatus('synchronizing');
    slice.waitingOnData = 'sync';
    this._curSyncSlice = slice;
    this._curSyncStartTS = pastDate;
    this._curSyncDayStep = INITIAL_SYNC_DAYS;
    this._curSyncDoNotGrowWindowBefore = null;
    this.folderConn.syncDateRange(pastDate, futureNow, true,
                                  this.onSyncCompleted.bind(this));
  },

  refreshSlice: function ifs_refreshSlice(slice) {
    var startTS = slice.startTS, endTS = slice.endTS, self = this;
    // If the endTS lines up with the most recent know message for the folder,
    // then remove the timestamp constraint so it goes all the way to now.
    if (this._headerBlockInfos.length &&
        endTS === this._headerBlockInfos[0].endTS &&
        slice.endUID === this._headerBlockInfos[0].endUID) {
      endTS = FUTURE_TIME_WARPED_NOW || null;
    }
    else {
      // We want the range to include the day; since it's an exclusive range
      // quantized to midnight, we need to adjust forward a day and then
      // quantize.
      endTS = quantizeDate(endTS - DAY_MILLIS);
    }
    // XXX use mutex scheduling to avoid this possibly happening...
    if (this._curSyncSlice)
      throw new Error("Can't refresh a slice when there is an existing sync");
    this.folderConn.syncDateRange(startTS, endTS, true, function() {
      self._account.__checkpointSyncCompleted();
      slice.setStatus('synced');
    });
  },

  dyingSlice: function ifs_dyingSlice(slice) {
    var idx = this._slices.indexOf(slice);
    this._slices.splice(idx, 1);

    if (this._slices.length === 0 && this._pendingMutationCount === 0)
      this.folderConn.relinquishConn();
  },

  /**
   * Whatever synchronization we last triggered has now completed; we should
   * either trigger another sync if we still want more data, or close out the
   * current sync.
   */
  onSyncCompleted: function ifs_onSyncCompleted(messagesSeen) {
    console.log("Sync Completed!", this._curSyncDayStep, "days",
                messagesSeen, "messages synced");
    // If the slice already knows about all the messages in the folder, make
    // sure it doesn't want additional messages that don't exist.  NB: if there
    // are any deleted messages, this logic will not save us because we ignored
    // those messages.  This is made less horrible by issuing a time-date that
    // expands as we go further back in time.
    //
    // (I have considered asking to see deleted messages too and ignoring them;
    // that might be suitable.  We could also just be a jerk and force an
    // expunge.)
    if (this.folderConn && this.folderConn.box &&
        (this._curSyncSlice.desiredHeaders >
         this.folderConn.box.messages.total))
      this._curSyncSlice.desiredHeaders = this.folderConn.box.messages.total;

    // - Done if we don't want any more headers.
    // XXX prefetch may need a different success heuristic
    if ((this._curSyncSlice.headers.length >=
         this._curSyncSlice.desiredHeaders) ||
    // - Done if we've already looked far enough back in time.
        (BEFORE(this._curSyncStartTS, OLDEST_SYNC_DATE))) {
      console.log("SYNCDONE Enough headers retrieved.",
                  "have", this._curSyncSlice.headers.length,
                  "want", this._curSyncSlice.desiredHeaders,
                  "box knows about", this.folderConn.box.messages.total,
                  "sync date", this._curSyncStartTS,
                  "oldest", OLDEST_SYNC_DATE);
      this._curSyncSlice.waitingOnData = false;
      this._curSyncSlice.setStatus('synced');
      this._curSyncSlice = null;

      this._account.__checkpointSyncCompleted();
      return;
    }

    // - Increase our search window size if we aren't finding anything
    // Our goal is that if we are going backwards in time and aren't finding
    // anything, we want to keep expanding our window
    var daysToSearch, lastSyncDaysInPast;
    // If we saw messages, there is no need to increase the window size.  We
    // also should not increase the size if we explicitly shrank the window and
    // left a do-not-expand-until marker.
    if (messagesSeen ||
        (this._curSyncDoNotGrowWindowBefore !== null &&
         SINCE(this._curSyncStartTS, this._curSyncDoNotGrowWindowBefore))) {
      daysToSearch = this._curSyncDayStep;
    }
    else {
      // This may be a fractional value because of DST
      lastSyncDaysInPast = ((TIME_WARPED_NOW || quantizeDate(Date.now())) -
                            this._curSyncStartTS) / DAY_MILLIS;
      daysToSearch = Math.ceil(this._curSyncDayStep * 1.6);

      if (lastSyncDaysInPast < 180) {
        if (daysToSearch > 14)
          daysToSearch = 14;
      }
      else if (lastSyncDaysInPast < 365) {
        if (daysToSearch > 30)
          daysToSearch = 30;
      }
      else if (lastSyncDaysInPast < 730) {
        if (daysToSearch > 60)
          daysToSearch = 60;
      }
      else if (lastSyncDaysInPast < 1095) {
        if (daysToSearch > 90)
          daysToSearch = 90;
      }
      else if (lastSyncDaysInPast < 1825) { // 5 years
        if (daysToSearch > 120)
          daysToSearch = 120;
      }
      else if (lastSyncDaysInPast < 3650) {
        if (daysToSearch > 365)
          daysToSearch = 365;
      }
      else if (daysToSearch > 730) {
        daysToSearch = 730;
      }
      this._curSyncDayStep = daysToSearch;
    }

    // - Move the time range back in time more.
    var startTS = makeDaysBefore(this._curSyncStartTS, daysToSearch),
        endTS = this._curSyncStartTS;
    this._curSyncStartTS = startTS;
    this.folderConn.syncDateRange(startTS, endTS, true,
                                  this.onSyncCompleted.bind(this));
  },

  /**
   * Receive messages directly from the database.
   */
  onFetchDBHeaders: function(slice, headers, moreMessagesComing) {
    if (headers.length)
      slice.batchAppendHeaders(headers, moreMessagesComing);
    else if (!moreMessagesComing)
      slice.setStatus('synced');

    if (!moreMessagesComing)
      slice.waitingOnData = false;
  },

  sliceQuicksearch: function ifs_sliceQuicksearch(slice, searchParams) {
  },

  /**
   * Retrieve the (ordered list) of messages covering a given IMAP-style date
   * range that we know about.  Messages are returned from newest to oldest.
   *
   * @args[
   *   @param[startTS DateMS]
   *   @param[endTS DateMS]
   *   @param[limit #:optional Number]
   *   @param[messageCallback @func[
   *     @args[
   *       @param[headers @listof[HeaderInfo]]
   *       @param[moreMessagesComing Boolean]]
   *     ]
   *   ]
   * ]
   */
  getMessagesInDateRange: function ifs_getMessagesInDateRange(
      startTS, endTS, limit, messageCallback) {
    var toFill = (limit != null) ? limit : TOO_MANY_MESSAGES, self = this,
        // header block info iteration
        iHeadBlockInfo = null, headBlockInfo;
    if (endTS == null)
      endTS = TIME_WARPED_NOW || Date.now(); // or just use a huge number?

    // find the first header block with the data we want (was destructuring)
    var headerPair = this._findFirstObjIndexForDateRange(this._headerBlockInfos,
                                                         startTS, endTS);
    iHeadBlockInfo = headerPair[0];
    headBlockInfo = headerPair[1];

    if (!headBlockInfo) {
      // no blocks equals no messages.
      messageCallback([], false);
      return;
    }

    function fetchMore() {
      while (true) {
        // - load the header block if required
        if (!self._headerBlocks.hasOwnProperty(headBlockInfo.blockId)) {
          self._loadBlock('header', headBlockInfo.blockId, fetchMore);
          return;
        }
        var headerBlock = self._headerBlocks[headBlockInfo.blockId];
        // - use up as many headers in the block as possible
        // (previously used destructuring, but we want uglifyjs to work)
        var headerTuple = self._findFirstObjForDateRange(
                            headerBlock.headers,
                            startTS, endTS),
            iFirstHeader = headerTuple[0], header = headerTuple[1];
        // aw man, no usable messages?!
        if (!header) {
          messageCallback([], false);
          return;
        }
        // (at least one usable message)

        var iHeader = iFirstHeader;
        for (; iHeader < headerBlock.headers.length; iHeader++) {
          header = headerBlock.headers[iHeader];
          if (BEFORE(header.date, startTS))
            break;
        }
        // (iHeader is pointing at the index of message we don't want)
        // There is no further processing to do if we bailed early.
        if (iHeader < headerBlock.headers.length)
          toFill = 0;
        else
          toFill -= iHeader - iFirstHeader;

        if (!toFill) {
        }
        // - There may be viable messages in the next block, check.
        else if (++iHeadBlockInfo >= self._headerBlockInfos.length) {
          // Nope, there are no more messages, nothing left to do.
          toFill = 0;
        }
        else {
          headBlockInfo = self._headerBlockInfos[iHeadBlockInfo];
          // We may not want to go back any farther
          if (AFTER(startTS, headBlockInfo.endTS))
            toFill = 0;
        }
        // generate the notifications fo what we did create
        messageCallback(headerBlock.headers.slice(iFirstHeader, iHeader),
                        Boolean(toFill));
        if (!toFill)
          return;
        // (there must be some overlap, keep going)
      }
    }

    fetchMore();
  },

  /**
   * Batch/non-streaming version of `getMessagesInDateRange`.
   *
   * @args[
   *   @param[allCallback @func[
   *     @args[
   *       @param[headers @listof[HeaderInfo]]
   *     ]
   *   ]
   * ]
   */
  getAllMessagesInDateRange: function ifs_getAllMessagesInDateRange(
      startTS, endTS, allCallback) {
    var allHeaders = null;
    function someMessages(headers, moreHeadersExpected) {
      if (allHeaders)
        allHeaders = allHeaders.concat(headers);
      else
        allHeaders = headers;
      if (!moreHeadersExpected)
        allCallback(allHeaders);
    }
    this.getMessagesInDateRange(startTS, endTS, null, someMessages);
  },

  /**
   * Mark a given time range as synchronized.
   *
   * @args[
   *   @param[startTS DateMS]
   *   @param[endTS DateMS]
   *   @param[modseq]
   *   @parma[updated DateMS]
   * ]
   */
  markSyncRange: function(startTS, endTS, modseq, updated) {
    // If our range was marked open-ended, it's really accurate through now.
    if (!endTS)
      endTS = Date.now();
    var aranges = this._accuracyRanges;
    function makeRange(start, end, modseq, updated) {
      return {
        startTS: start, endTS: end,
        // let an existing fullSync be passed in instead...
        fullSync: (typeof(modseq) === 'string') ?
          { highestModseq: modseq, updated: updated } :
          { highestModseq: modseq.fullSync.highestModseq,
            updated: modseq.fullSync.updated },
      };
    }

    var newInfo = this._findFirstObjIndexForDateRange(aranges, startTS, endTS),
        oldInfo = this._findLastObjIndexForDateRange(aranges, startTS, endTS),
        newSplits, oldSplits;
    // We need to split the new block if we overlap a block and our end range
    // is not 'outside' the range.
    newSplits = newInfo[1] && STRICTLY_AFTER(newInfo[1].endTS, endTS);
    // We need to split the old block if we overlap a block and our start range
    // is not 'outside' the range.
    oldSplits = oldInfo[1] && BEFORE(oldInfo[1].startTS, startTS);

    var insertions = [],
        delCount = oldInfo[0] - newInfo[0];
    if (oldInfo[1])
      delCount++;

    if (newSplits) {
      // should this just be an effective merge with our insertion?
      if (newInfo[1].fullSync &&
          newInfo[1].fullSync.highestModseq === modseq &&
          newInfo[1].fullSync.updated === updated)
        endTS = newInfo[1].endTS;
      else
        insertions.push(makeRange(endTS, newInfo[1].endTS, newInfo[1]));
    }
    insertions.push(makeRange(startTS, endTS, modseq, updated));
    if (oldSplits) {
      // should this just be an effective merge with what we just inserted?
      if (oldInfo[1].fullSync &&
          oldInfo[1].fullSync.highestModseq === modseq &&
          oldInfo[1].fullSync.updated === updated)
        insertions[insertions.length-1].startTS = oldInfo[1].startTS;
      else
        insertions.push(makeRange(oldInfo[1].startTS, startTS, oldInfo[1]));
    }

    // - merges
    // Consider a merge if there is an adjacent accuracy range in the given dir.
    var newNeighbor = newInfo[0] > 0 ? aranges[newInfo[0] - 1] : null,
        oldAdjust = oldInfo[1] ? 1 : 0,
        oldNeighbor = oldInfo[0] < (aranges.length - oldAdjust) ?
                        aranges[oldInfo[0] + oldAdjust] : null;
    // We merge if our starts and ends line up...
    if (newNeighbor &&
       insertions[0].endTS === newNeighbor.startTS &&
        newNeighbor.fullSync &&
        newNeighbor.fullSync.highestModseq === modseq &&
        newNeighbor.fullSync.updated === updated) {
      insertions[0].endTS = newNeighbor.endTS;
      newInfo[0]--;
      delCount++;
    }
    if (oldNeighbor &&
        insertions[insertions.length-1].startTS === oldNeighbor.endTS &&
        oldNeighbor.fullSync &&
        oldNeighbor.fullSync.highestModseq === modseq &&
        oldNeighbor.fullSync.updated === updated) {
      insertions[insertions.length-1].startTS = oldNeighbor.startTS;
      delCount++;
    }

    aranges.splice.apply(aranges, [newInfo[0], delCount].concat(insertions));
  },

  /**
   * Add a new message to the database, generating slice notifications.
   */
  addMessageHeader: function ifs_addMessageHeader(header) {
    var self = this;

    if (this._pendingLoads.length) {
      this._deferredCalls.push(this.addMessageHeader.bind(this, header));
      return;
    }

    if (self._curSyncSlice)
      self._curSyncSlice.onHeaderAdded(header);

    this._insertIntoBlockUsingDateAndUID(
      'header', header.date, header.id, HEADER_EST_SIZE_IN_BYTES,
      header, null);
  },

  /**
   * Update an existing mesage header in the database, generating slice
   * notifications and dirtying its containing block to cause eventual database
   * writeback.
   *
   * A message header gets updated ONLY because of a change in its flags.  We
   * don't consider this change large enough to cause us to need to split a
   * block.
   *
   * This function can either be used to replace the header or to look it up
   * and then call a function to manipulate the header.
   */
  updateMessageHeader: function ifs_updateMessageHeader(date, uid, partOfSync,
                                                        headerOrMutationFunc) {
    // (While this method can complete synchronously, we want to maintain its
    // perceived ordering relative to those that cannot be.)
    if (this._pendingLoads.length) {
      this._deferredCalls.push(this.updateMessageHeader.bind(
                                 this, date, uid, partOfSync,
                                 headerOrMutationFunc));
      return;
    }

    // We need to deal with the potential for the block having been discarded
    // from memory thanks to the potential asynchrony due to pending loads or
    // on the part of the caller.
    var infoTuple = this._findRangeObjIndexForDateAndUID(
                      this._headerBlockInfos, date, uid),
        iInfo = infoTuple[0], info = infoTuple[1], self = this;
    function doUpdateHeader(block) {
      var idx = block.uids.indexOf(uid), header;
      if (idx === -1)
        throw new Error("Failed to find UID " + uid + "!");
      if (headerOrMutationFunc instanceof Function) {
        // If it returns false it means that the header did not change and so
        // there is no need to mark anything dirty and we can leave without
        // notifying anyone.
        if (!headerOrMutationFunc((header = block.headers[idx])))
          return;
      }
      else
        header = block.headers[idx] = headerOrMutationFunc;
      self._dirty = true;
      self._dirtyHeaderBlocks[info.blockId] = block;

      if (partOfSync && self._curSyncSlice)
        self._curSyncSlice.onHeaderAdded(header);
      if (self._slices.length > (self._curSyncSlice ? 1 : 0)) {
        for (var iSlice = 0; iSlice < self._slices.length; iSlice++) {
          var slice = self._slices[iSlice];
          if (partOfSync && slice === self._curSyncSlice)
            continue;
          if (BEFORE(date, slice.startTS) ||
              STRICTLY_AFTER(date, slice.endTS))
            continue;
          if ((date === slice.startTS &&
               uid < slice.startUID) ||
              (date === slice.endTS &&
               uid > slice.endUID))
            continue;
          slice.onHeaderModified(header);
        }
      }
    }
    if (!this._headerBlocks.hasOwnProperty(info.blockId))
      this._loadBlock('header', info.blockId, doUpdateHeader);
    else
      doUpdateHeader(this._headerBlocks[info.blockId]);
  },

  /**
   * A notification that an existing header is still up-to-date.
   */
  unchangedMessageHeader: function ifs_unchangedMessageHeader(header) {
    if (this._pendingLoads.length) {
      this._deferredCalls.push(this.unchangedMessageHeader.bind(this, header));
      return;
    }
    // (no block update required)
    if (this._curSyncSlice)
      this._curSyncSlice.onHeaderAdded(header);
  },

  deleteMessageHeaderAndBody: function(header) {
    if (this._pendingLoads.length) {
      this._deferredCalls.push(this.deleteMessageHeaderAndBody.bind(this,
                                                                    header));
      return;
    }

    if (this._curSyncSlice)
      this._curSyncSlice.onHeaderRemoved(header);
    if (this._slices.length > (this._curSyncSlice ? 1 : 0)) {
      for (var iSlice = 0; iSlice < this._slices.length; iSlice++) {
        var slice = this._slices[iSlice];
        if (slice === this._curSyncSlice)
          continue;
        if (BEFORE(header.date, slice.startTS) ||
            STRICTLY_AFTER(header.date, slice.endTS))
          continue;
        if ((header.date === slice.startTS &&
             header.id < slice.startUID) ||
            (header.date === slice.endTS &&
             header.id > slice.endUID))
          continue;
        slice.onHeaderRemoved(header);
      }
    }

    this._deleteFromBlock('header', header.date, header.id, null);
    this._deleteFromBlock('body', header.date, header.id, null);
  },

  /**
   *
   */
  addMessageBody: function ifs_addMessageBody(header, bodyInfo) {
    if (this._pendingLoads.length) {
      this._deferredCalls.push(this.addMessageBody.bind(this, header,
                                                        bodyInfo));
      return;
    }

    this._insertIntoBlockUsingDateAndUID(
      'body', header.date, header.id, bodyInfo.size, bodyInfo, null);
  },

  getMessageBody: function ifs_getMessageBody(suid, date, callback) {
    var uid = suid.substring(suid.lastIndexOf('/') + 1),
        posInfo = this._findRangeObjIndexForDateAndUID(this._bodyBlockInfos,
                                                       date, uid);
    if (posInfo[1] === null) {
      this._LOG.bodyNotFound();
      callback(null);
      return;
    }
    var bodyBlockInfo = posInfo[1], self = this;
    if (!(this._bodyBlocks.hasOwnProperty(bodyBlockInfo.blockId))) {
      this._loadBlock('body', bodyBlockInfo.blockId, function(bodyBlock) {
          var bodyInfo = bodyBlock.bodies[uid] || null;
          if (!bodyInfo)
            self._LOG.bodyNotFound();
          callback(bodyInfo);
        });
      return;
    }
    var block = this._bodyBlocks[bodyBlockInfo.blockId],
        bodyInfo = block.bodies[uid] || null;
    if (!bodyInfo)
      this._LOG.bodyNotFound();
    callback(bodyInfo);
  },

  shutdown: function() {
    // reverse iterate since they will remove themselves as we kill them
    for (var i = this._slices.length - 1; i >= 0; i--) {
      this._slices[i].die();
    }
    this.folderConn.shutdown();
    this._LOG.__die();
  },

  /**
   * The folder is no longer known on the server or we are just deleting the
   * account; close out any live connections or processing.  Database cleanup
   * will be handled at the account level so it can go in a transaction with
   * all the other related changes.
   */
  youAreDeadCleanupAfterYourself: function() {
    // XXX close connections, etc.
  },
};

/**
 * ALL SPECULATIVE RIGHT NOW.
 *
 * Like ImapFolderStorage, but with only one folder and messages named by their
 * X-GM-MSGID value rather than their UID(s).
 *
 * Deletion processing operates slightly differently than for normal IMAP
 * because a message can be removed from one of the folders we synchronize on,
 * but not all of them.  We don't want to be overly deletionary in that case,
 * so we maintain a list of folder id's that are keeping each message alive.
 */
function GmailMessageStorage() {
}
GmailMessageStorage.prototype = {
};

var LOGFAB = exports.LOGFAB = $log.register($module, {
  ImapSlice: {
    type: $log.QUERY,
    events: {
      headersAppended: {},
      headerAdded: { index: false },
      headerModified: { index: false },
      headerRemoved: { index: false },
    },
    TEST_ONLY_events: {
      headersAppended: { headers: false },
      headerAdded: { header: false },
      headerModified: { header: false },
      headerRemoved: { header: false },
    },
  },

  ImapFolderConn: {
    type: $log.CONNECTION,
    subtype: $log.CLIENT,
    events: {
    },
    TEST_ONLY_events: {
    },
    asyncJobs: {
      syncDateRange: {
        newMessages: true, existingMessages: true, deletedMessages: true,
        start: false, end: false,
      },
    },
  },

  ImapFolderStorage: {
    type: $log.DATABASE,
    events: {
      // This was an error but the test results viewer UI is not quite smart
      // enough to understand the difference between expected errors and
      // unexpected errors, so this is getting downgraded for now.
      bodyNotFound: {},
    },
    TEST_ONLY_events: {
    },
    asyncJobs: {
      loadBlock: { type: false, blockId: false },
    },
    TEST_ONLY_asyncJobs: {
      loadBlock: { block: false },
    },
    errors: {
      badBlockLoad: { type: false, blockId: false },
    }
  },
}); // end LOGFAB

}); // end define
;
/**
 *
 **/

define('rdimap/imapclient/imapacct',[
    'imap',
    'rdcommon/log',
    './a64',
    './imapdb',
    './imapslice',
    './imapjobs',
    './util',
    'module',
    'exports'
  ],
  function(
    $imap,
    $log,
    $a64,
    $imapdb,
    $imapslice,
    $imapjobs,
    $imaputil,
    $module,
    exports
  ) {
const bsearchForInsert = $imaputil.bsearchForInsert;

function cmpFolderPubPath(a, b) {
  return a.path.localeCompare(b.path);
}

/**
 * Account object, root of all interaction with servers.
 *
 * Passwords are currently held in cleartext with the rest of the data.  Ideally
 * we would like them to be stored in some type of keyring coupled to the TCP
 * API in such a way that we never know the API.  Se a vida e.
 *
 */
function ImapAccount(universe, accountId, credentials, connInfo, folderInfos,
                     dbConn,
                     _parentLog, existingProtoConn) {
  this.universe = universe;
  this.id = accountId;

  this._credentials = credentials;
  this._connInfo = connInfo;
  this._db = dbConn;

  this._ownedConns = [];
  this._LOG = LOGFAB.ImapAccount(this, _parentLog, this.id);

  this._jobDriver = new $imapjobs.ImapJobDriver(this);

  if (existingProtoConn) {
    this._ownedConns.push({
        conn: existingProtoConn,
        inUse: false,
        folderId: null,
      });
  }

  // Yes, the pluralization is suspect, but unambiguous.
  /** @dictof[@key[FolderId] @value[ImapFolderStorage] */
  var folderStorages = this._folderStorages = {};
  /** @dictof[@key[FolderId] @value[ImapFolderMeta] */
  var folderPubs = this.folders = [];

  /**
   * The list of dead folder id's that we need to nuke the storage for when
   * we next save our account status to the database.
   */
  this._deadFolderIds = null;

  /**
   * The canonical folderInfo object we persist to the database.
   */
  this._folderInfos = folderInfos;
  /**
   * @dict[
   *   @param[nextFolderNum Number]{
   *     The next numeric folder number to be allocated.
   *   }
   *   @param[nextMutationNum Number]{
   *     The next mutation id to be allocated.
   *   }
   *   @param[lastFullFolderProbeAt DateMS]{
   *     When was the last time we went through our list of folders and got the
   *     unread count in each folder.
   *   }
   *   @param[capability @listof[String]]{
   *     The post-login capabilities from the server.
   *   }
   *   @param[rootDelim String]{
   *     The root hierarchy delimiter.  It is possible for servers to not
   *     support hierarchies, but we just declare that those servers are not
   *     acceptable for use.
   *   }
   * ]{
   *   Meta-information about the account derived from probing the account.
   *   This information gets flushed on database upgrades.
   * }
   */
  this.meta = this._folderInfos.$meta;
  /**
   * @listof[SerializedMutation]{
   *   The list of recently issued mutations against us.  Mutations are added
   *   as soon as they are requested and remain until evicted based on a hard
   *   numeric limit.  The limit is driven by our unit tests rather than our
   *   UI which currently only allows a maximum of 1 (high-level) undo.  The
   *   status of whether the mutation has been run is tracked on the mutation
   *   but does not affect its presence or position in the list.
   *
   *   Right now, the `MailUniverse` is in charge of this and we just are a
   *   convenient place to stash the data.
   * }
   */
  this.mutations = this._folderInfos.$mutations;
  for (var folderId in folderInfos) {
    if (folderId[0] === '$')
      continue;
    var folderInfo = folderInfos[folderId];

    folderStorages[folderId] =
      new $imapslice.ImapFolderStorage(this, folderId, folderInfo, this._db,
                                       this._LOG);
    folderPubs.push(folderInfo.$meta);
  }
}
exports.ImapAccount = ImapAccount;
ImapAccount.prototype = {
  type: 'imap',
  toString: function() {
    return '[ImapAccount: ' + this.id + ']';
  },

  /**
   * Make a given folder known to us, creating state tracking instances, etc.
   */
  _learnAboutFolder: function(name, path, type, delim) {
    var folderId = this.id + '/' + $a64.encodeInt(this.meta.nextFolderNum++);
    var folderInfo = this._folderInfos[folderId] = {
      $meta: {
        id: folderId,
        name: name,
        path: path,
        type: type,
        delim: delim,
      },
      $impl: {
        nextHeaderBlock: 0,
        nextBodyBlock: 0,
      },
      accuracy: [],
      headerBlocks: [],
      bodyBlocks: [],
    };
    this._folderStorages[folderId] =
      new $imapslice.ImapFolderStorage(this, folderId, folderInfo, this._db,
                                       this._LOG);

    var folderMeta = folderInfo.$meta;
    var idx = bsearchForInsert(this.folders, folderMeta, cmpFolderPubPath);
    this.folders.splice(idx, 0, folderMeta);

    this.universe.__notifyAddedFolder(this.id, folderMeta);
    return folderMeta;
  },

  _forgetFolder: function(folderId) {
    var folderInfo = this._folderInfos[folderId],
        folderMeta = folderInfo.$meta;
    delete this._folderInfos[folderId];
    var folderStorage = this._folderStorages[folderId];
    delete this._folderStorages[folderId];
    var idx = this.folders.indexOf(folderMeta);
    this.folders.splice(idx, 1);
    if (this._deadFolderIds === null)
      this._deadFolderIds = [];
    this._deadFolderIds.push(folderId);
    folderStorage.youAreDeadCleanupAfterYourself();

    this.universe.__notifyRemovedFolder(this.id, folderMeta);
  },

  /**
   * We are being told that a synchronization pass completed, and that we may
   * want to consider persisting our state.
   */
  __checkpointSyncCompleted: function() {
    this.saveAccountState();
  },

  /**
   * Save the state of this account to the database.  This entails updating all
   * of our highly-volatile state (folderInfos which contains counters, accuracy
   * structures, and our block info structures) as well as any dirty blocks.
   *
   * This should be entirely coherent because the structured clone should occur
   * synchronously during this call, but it's important to keep in mind that if
   * that ever ends up not being the case that we need to cause mutating
   * operations to defer until after that snapshot has occurred.
   */
  saveAccountState: function(reuseTrans) {
    var perFolderStuff = [], self = this;
    for (var iFolder = 0; iFolder < this.folders.length; iFolder++) {
      var folderPub = this.folders[iFolder],
          folderStorage = this._folderStorages[folderPub.id],
          folderStuff = folderStorage.generatePersistenceInfo();
      if (folderStuff)
        perFolderStuff.push(folderStuff);
    }
    this._LOG.saveAccountState_begin();
    var trans = this._db.saveAccountFolderStates(
      this.id, this._folderInfos, perFolderStuff,
      this._deadFolderIds,
      function stateSaved() {
        self._LOG.saveAccountState_end();
      },
      reuseTrans);
    this._deadFolderIds = null;
    return trans;
  },

  /**
   * Create a folder that is the child/descendant of the given parent folder.
   * If no parent folder id is provided, we attempt to create a root folder.
   *
   * @args[
   *   @param[parentFolderId String]
   *   @param[folderName]
   *   @param[containOnlyOtherFolders Boolean]{
   *     Should this folder only contain other folders (and no messages)?
   *     On some servers/backends, mail-bearing folders may not be able to
   *     create sub-folders, in which case one would have to pass this.
   *   }
   *   @param[callback @func[
   *     @args[
   *       @param[error @oneof[
   *         @case[null]{
   *           No error, the folder got created and everything is awesome.
   *         }
   *         @case['offline']{
   *           We are offline and can't create the folder.
   *         }
   *         @case['already-exists']{
   *           The folder appears to already exist.
   *         }
   *         @case['unknown']{
   *           It didn't work and we don't have a better reason.
   *         }
   *       ]]
   *       @param[folderMeta ImapFolderMeta]{
   *         The meta-information for the folder.
   *       }
   *     ]
   *   ]]{
   *   }
   * ]
   */
  createFolder: function(parentFolderId, folderName, containOnlyOtherFolders,
                         callback) {
    var path, delim;
    if (parentFolderId) {
      if (!this._folderInfos.hasOwnProperty(parentFolderId))
        throw new Error("No such folder: " + parentFolderId);
      var parentFolder = this._folderInfos[parentFolderId];
      delim = parentFolder.path;
      path = parentFolder.path + delim;
    }
    else {
      path = '';
      delim = this.meta.rootDelim;
    }
    if (typeof(folderName) === 'string')
      path += folderName;
    else
      path += folderName.join(delim);
    if (containOnlyOtherFolders)
      path += delim;

    if (!this.universe.online) {
      callback('offline');
      return;
    }

    var rawConn = null, self = this;
    function gotConn(conn) {
      // create the box
      rawConn = conn;
      rawConn.addBox(path, addBoxCallback);
    }
    function addBoxCallback(err) {
      if (err) {
        console.error('Error creating box:', err);
        // XXX implement the already-exists check...
        done('unknown');
        return;
      }
      // Do a list on the folder so that we get the right attributes and any
      // magical case normalization performed by the server gets observed by
      // us.
      rawConn.getBoxes('', path, gotBoxes);
    }
    function gotBoxes(err, boxesRoot) {
      if (err) {
        console.error('Error looking up box:', err);
        done('unknown');
        return;
      }
      // We need to re-derive the path
      var folderMeta = null;
      function walkBoxes(boxLevel, pathSoFar) {
        for (var boxName in boxLevel) {
          var box = boxLevel[boxName],
              boxPath = pathSoFar ? (pathSoFar + boxName) : boxName,
              type = self._determineFolderType(box, boxPath);
          folderMeta = self._learnAboutFolder(boxName, boxPath, type,
                                              box.delim);
        }
      }
      walkBoxes(boxesRoot, '');
      if (folderMeta)
        done(null, folderMeta);
      else
        done('unknown');
    }
    function done(errString, folderMeta) {
      if (rawConn) {
        self.__folderDoneWithConnection(null, rawConn);
        rawConn = null;
      }
      if (!errString)
        self._LOG.createFolder(path);
      if (callback)
        callback(errString, folderMeta);
    }
    this.__folderDemandsConnection(':createFolder', gotConn);
  },

  /**
   * Delete an existing folder WITHOUT ANY ABILITY TO UNDO IT.  Current UX
   * does not desire this, but the unit tests do.
   *
   * Callback is like the createFolder one, why not.
   */
  deleteFolder: function(folderId, callback) {
    if (!this._folderInfos.hasOwnProperty(folderId))
      throw new Error("No such folder: " + folderId);

    if (!this.universe.online) {
      callback('offline');
      return;
    }

    var folderMeta = this._folderInfos[folderId].$meta;

    var rawConn = null, self = this;
    function gotConn(conn) {
      rawConn = conn;
      rawConn.delBox(folderMeta.path, deletionCallback);
    }
    function deletionCallback(err) {
      if (err)
        done('unknown');
      else
        done(null);
    }
    function done(errString) {
      if (rawConn) {
        self.__folderDoneWithConnection(null, rawConn);
        rawConn = null;
      }
      if (!errString) {
        self._LOG.deleteFolder(folderMeta.path);
        self._forgetFolder(folderId);
      }
      if (callback)
        callback(errString, folderMeta);
    }
    this.__folderDemandsConnection(':deleteFolder', gotConn);
  },

  getFolderStorageForFolderId: function(folderId) {
    if (this._folderStorages.hasOwnProperty(folderId))
      return this._folderStorages[folderId];
    throw new Error('No folder with id: ' + folderId);
  },

  getFolderStorageForMessageSuid: function(messageSuid) {
    var folderId = messageSuid.substring(0, messageSuid.lastIndexOf('/'));
    if (this._folderStorages.hasOwnProperty(folderId))
      return this._folderStorages[folderId];
    throw new Error('No folder with id: ' + folderId);
  },

  /**
   * Create a view slice on the messages in a folder, starting from the most
   * recent messages and synchronizing further as needed.
   */
  sliceFolderMessages: function(folderId, bridgeHandle) {
    var storage = this._folderStorages[folderId],
        slice = new $imapslice.ImapSlice(bridgeHandle, storage, this._LOG);

    storage.sliceOpenFromNow(slice);
  },

  shutdown: function() {
    // - kill all folder storages (for their loggers)
    for (var iFolder = 0; iFolder < this.folders.length; iFolder++) {
      var folderPub = this.folders[iFolder],
          folderStorage = this._folderStorages[folderPub.id];
      folderStorage.shutdown();
    }

    // - close all connections
    for (var i = 0; i < this._ownedConns.length; i++) {
      var connInfo = this._ownedConns[i];
      connInfo.conn.die();
    }

    this._LOG.__die();
  },

  /**
   * Mechanism for an `ImapFolderConn` to request an IMAP protocol connection.
   * This is to potentially support some type of (bounded) connection pooling
   * like Thunderbird uses.  The rationale is that many servers cap the number
   * of connections we are allowed to maintain, plus it's hard to justify
   * locally tying up those resources.  (Thunderbird has more need of watching
   * multiple folders than ourselves, bu we may still want to synchronize a
   * bunch of folders in parallel for latency reasons.)
   *
   * The provided connection will *not* be in the requested folder; it's up to
   * the folder connection to enter the folder.
   *
   * @args[
   *   @param[folderId #:optional FolderId]{
   *     The folder id of the folder that will be using the connection.  If
   *     it's not a folder but some task, then pass a string prefixed with
   *     a colon and a human readable string to explain the task.
   *   }
   *   @param[callback]{
   *     The callback to invoke once the connection has been established.  If
   *     there is a connection present in the reuse pool, this may be invoked
   *     immediately.
   *   }
   * ]
   */
  __folderDemandsConnection: function(folderId, callback) {
    var reusableConnInfo = null;
    for (var i = 0; i < this._ownedConns.length; i++) {
      var connInfo = this._ownedConns[i];
      if (!connInfo.inUse)
        reusableConnInfo = connInfo;
      // It's concerning if the folder already has a connection...
      if (folderId && connInfo.folderId === folderId) {
        this._LOG.folderAlreadyHasConn(folderId);
      }
    }

    if (reusableConnInfo) {
      reusableConnInfo.inUse = true;
      reusableConnInfo.folderId = folderId;
      this._LOG.reuseConnection(folderId);
      callback(reusableConnInfo.conn);
      return;
    }

    this._makeConnection(folderId, callback);
  },

  _makeConnection: function(folderId, callback) {
    this._LOG.createConnection(folderId);
    var opts = {
      host: this._connInfo.hostname,
      port: this._connInfo.port,
      crypto: this._connInfo.crypto,

      username: this._credentials.username,
      password: this._credentials.password,
    };
    if (this._LOG) opts._logParent = this._LOG;
    var conn = new $imap.ImapConnection(opts);
    this._ownedConns.push({
        conn: conn,
        inUse: true,
        folderId: folderId,
      });
    conn.on('close', function() {
      });
    conn.on('error', function(err) {
        // this hears about connection errors too
        console.warn('Connection error:', err);
      });
    conn.connect(function(err) {
      if (!err) {
        callback(conn);
      }
    });
  },

  __folderDoneWithConnection: function(folderId, conn) {
    // XXX detect if the connection is actually dead and in that case don't
    // reinsert it.
    for (var i = 0; i < this._ownedConns.length; i++) {
      var connInfo = this._ownedConns[i];
      if (connInfo.conn === conn) {
        connInfo.inUse = false;
        connInfo.folderId = null;
        this._LOG.releaseConnection(folderId);
        // XXX this will trigger an expunge if not read-only...
        if (folderId)
          conn.closeBox(function() {});
        return;
      }
    }
    this._LOG.connectionMismatch(folderId);
  },

  syncFolderList: function(callback) {
    var self = this;
    this.__folderDemandsConnection(null, function(conn) {
      conn.getBoxes(self._syncFolderComputeDeltas.bind(self, conn, callback));
    });
  },
  _determineFolderType: function(box, path) {
    var type = null;
    // NoSelect trumps everything.
    if (box.attribs.indexOf('NOSELECT') !== -1) {
      type = 'nomail';
    }
    else {
      // Standards-ish:
      // - special-use: http://tools.ietf.org/html/rfc6154
      //   IANA registrations:
      //   http://www.iana.org/assignments/imap4-list-extended
      // - xlist:
      //   https://developers.google.com/google-apps/gmail/imap_extensions

      // Process the attribs for goodness.
      for (var i = 0; i < box.attribs.length; i++) {
        switch (box.attribs[i]) {
          case 'ALL': // special-use
          case 'ALLMAIL': // xlist
          case 'ARCHIVE': // special-use
            type = 'archive';
            break;
          case 'DRAFTS': // special-use xlist
            type = 'drafts';
            break;
          case 'FLAGGED': // special-use
            type = 'starred';
            break;
          case 'INBOX': // xlist
            type = 'inbox';
            break;
          case 'JUNK': // special-use
            type = 'junk';
            break;
          case 'SENT': // special-use xlist
            type = 'sent';
            break;
          case 'SPAM': // xlist
            type = 'junk';
            break;
          case 'STARRED': // xlist
            type = 'starred';
            break;

          case 'TRASH': // special-use xlist
            type = 'trash';
            break;

          case 'HASCHILDREN': // 3348
          case 'HASNOCHILDREN': // 3348

          // - standard bits we don't care about
          case 'MARKED': // 3501
          case 'UNMARKED': // 3501
          case 'NOINFERIORS': // 3501
            // XXX use noinferiors to prohibit folder creation under it.
          // NOSELECT

          default:
        }
      }

      // heuristic based type assignment based on the name
      if (!type) {
        switch (path.toUpperCase()) {
          case 'DRAFT':
          case 'DRAFTS':
            type = 'drafts';
            break;
          case 'INBOX':
            type = 'inbox';
            break;
          case 'JUNK':
          case 'SPAM':
            type = 'junk';
            break;
          case 'SENT':
            type = 'sent';
            break;
          case 'TRASH':
            type = 'trash';
            break;
        }
      }

      if (!type)
        type = 'normal';
    }
    return type;
  },
  _syncFolderComputeDeltas: function(conn, callback, err, boxesRoot) {
    var self = this;
    if (err) {
      // XXX need to deal with transient failure states
      this.__folderDoneWithConnection(null, conn);
      callback();
      return;
    }

    // - build a map of known existing folders
    var folderPubsByPath = {}, folderPub;
    for (var iFolder = 0; iFolder < this.folders.length; iFolder++) {
      folderPub = this.folders[iFolder];
      folderPubsByPath[folderPub.path] = folderPub;
    }

    // - walk the boxes
    function walkBoxes(boxLevel, pathSoFar) {
      for (var boxName in boxLevel) {
        var box = boxLevel[boxName],
            path = pathSoFar ? (pathSoFar + boxName) : boxName;

        // - already known folder
        if (folderPubsByPath.hasOwnProperty(path)) {
          // mark it with true to show that we've seen it.
          folderPubsByPath = true;
        }
        // - new to us!
        else {
          var type = self._determineFolderType(box, path);
          self._learnAboutFolder(boxName, path, type, box.delim);
        }

        if (box.children)
          walkBoxes(box.children, pathSoFar + boxName + box.delim);
      }
    }
    walkBoxes(boxesRoot, '');

    // - detect deleted folders
    // track dead folder id's so we can issue a
    var deadFolderIds = [];
    for (var folderPath in folderPubsByPath) {
      folderPub = folderPubsByPath[folderPath];
      // (skip those we found above)
      if (folderPub === true)
        continue;
      // It must have gotten deleted!
      this._forgetFolder(folderPub.id);
    }

    this.__folderDoneWithConnection(null, conn);
    // be sure to save our state now that we are up-to-date on this.
    this.saveAccountState();
    callback();
  },

  /**
   * @args[
   *   @param[op MailOp]
   *   @param[mode @oneof[
   *     @case['local_do']{
   *       Apply the mutation locally to our database rep.
   *     }
   *     @case['check']{
   *       Check if the manipulation has been performed on the server.  There
   *       is no need to perform a local check because there is no way our
   *       database can be inconsistent in its view of this.
   *     }
   *     @case['do']{
   *       Perform the manipulation on the server.
   *     }
   *     @case['local_undo']{
   *       Undo the mutation locally.
   *     }
   *     @case['undo']{
   *       Undo the mutation on the server.
   *     }
   *   ]]
   *   @param[callback @func[
   *     @args[
   *       @param[error @oneof[String null]]
   *     ]
   *   ]]
   *   }
   * ]
   */
  runOp: function(op, mode, callback) {
    var methodName = mode + '_' + op.type, self = this,
        isLocal = (mode === 'local_do' || mode === 'local_undo');

    if (!(methodName in this._jobDriver))
      throw new Error("Unsupported op: '" + op.type + "' (mode: " + mode + ")");

    if (!isLocal)
      op.status = mode + 'ing';

    if (callback) {
      this._LOG.runOp_begin(mode, op.type, null);
      this._jobDriver[methodName](op, function(error) {
        self._LOG.runOp_end(mode, op.type, error);
        if (!isLocal)
          op.status = mode + 'ne';
        callback(error);
      });
    }
    else {
      this._LOG.runOp_begin(mode, op.type, null);
      var rval = this._jobDriver[methodName](op);
      if (!isLocal)
        op.status = mode + 'ne';
      this._LOG.runOp_end(mode, op.type, rval);
    }
  },

  // NB: this is not final mutation logic; it needs to be more friendly to
  // ImapFolderConn's.  See _do_modtags which is being cleaned up...
};

/**
 * While gmail deserves major props for providing any IMAP interface, everyone
 * is much better off if we treat it specially.  EVENTUALLY.
 */
function GmailAccount() {
}
GmailAccount.prototype = {
  type: 'gmail-imap',

};

var LOGFAB = exports.LOGFAB = $log.register($module, {
  ImapAccount: {
    type: $log.ACCOUNT,
    events: {
      createFolder: {},
      deleteFolder: {},

      createConnection: {},
      reuseConnection: {},
      releaseConnection: {},
    },
    TEST_ONLY_events: {
      createFolder: { path: false },
      deleteFolder: { path: false },

      createConnection: { folderId: false },
      reuseConnection: { folderId: false },
      releaseConnection: { folderId: false },
    },
    errors: {
      folderAlreadyHasConn: { folderId: false },
    },
    asyncJobs: {
      runOp: { mode: true, type: true, error: false, op: false },
      saveAccountState: {},
    },
  },
});

}); // end define
;
/**
 *
 **/

define('rdimap/imapclient/mailuniverse',[
    'rdcommon/log',
    './a64',
    './allback',
    './imapdb',
    './imapprobe',
    './imapacct',
    './smtpprobe',
    './smtpacct',
    './fakeacct',
    'module',
    'exports'
  ],
  function(
    $log,
    $a64,
    $allback,
    $imapdb,
    $imapprobe,
    $imapacct,
    $smtpprobe,
    $smtpacct,
    $fakeacct,
    $module,
    exports
  ) {
const allbackMaker = $allback.allbackMaker;

/**
 * How many operations per account should we track to allow for undo operations?
 * The B2G email app only demands a history of 1 high-level op for undoing, but
 * we are supporting somewhat more for unit tests, potential fancier UIs, and
 * because high-level ops may end up decomposing into multiple lower-level ops
 * someday.
 *
 * This limit obviously is not used to discard operations not yet performed!
 */
const MAX_MUTATIONS_FOR_UNDO = 10;

const PIECE_ACCOUNT_TYPE_TO_CLASS = {
  'imap': $imapacct.ImapAccount,
  'smtp': $smtpacct.SmtpAccount,
  //'gmail-imap': GmailAccount,
};

// So, I want to poke fun at the iPhone signature, although we know there is
// also the flip side of explaining brevity, rampant typos, limited attention
// due to driving/flying a plane/other-dangerous-thing while using it.
const DEFAULT_SIGNATURE = [
  "Sent from my B2G phone.  That's right.  I've got one.",
].join("\n");

/**
 * Composite account type to expose account piece types with individual
 * implementations (ex: imap, smtp) together as a single account.  This is
 * intended to be a very thin layer that shields consuming code from the
 * fact that IMAP and SMTP are not actually bundled tightly together.
 */
function CompositeAccount(universe, accountDef, folderInfo, dbConn,
                          receiveProtoConn,
                          _LOG) {
  this.universe = universe;
  this.id = accountDef.id;
  this.accountDef = accountDef;
  // XXX for now we are stealing the universe's logger
  this._LOG = _LOG;

  this.identities = accountDef.identities;

  if (!PIECE_ACCOUNT_TYPE_TO_CLASS.hasOwnProperty(accountDef.receiveType)) {
    this._LOG.badAccountType(accountDef.receiveType);
  }
  if (!PIECE_ACCOUNT_TYPE_TO_CLASS.hasOwnProperty(accountDef.sendType)) {
    this._LOG.badAccountType(accountDef.sendType);
  }

  this._receivePiece =
    new PIECE_ACCOUNT_TYPE_TO_CLASS[accountDef.receiveType](
      universe,
      accountDef.id, accountDef.credentials, accountDef.receiveConnInfo,
      folderInfo, dbConn, this._LOG, receiveProtoConn);
  this._sendPiece =
    new PIECE_ACCOUNT_TYPE_TO_CLASS[accountDef.sendType](
      universe,
      accountDef.id, accountDef.credentials,
      accountDef.sendConnInfo, dbConn, this._LOG);

  // expose public lists that are always manipulated in place.
  this.folders = this._receivePiece.folders;
  this.meta = this._receivePiece.meta;
  this.mutations = this._receivePiece.mutations;
}
CompositeAccount.prototype = {
  toString: function() {
    return '[CompositeAccount: ' + this.id + ']';
  },
  toBridgeWire: function() {
    return {
      id: this.accountDef.id,
      name: this.accountDef.name,
      path: this.accountDef.name, // allows it to masquerade as a folder
      type: this.accountDef.type,

      identities: this.identities,

      credentials: {
        username: this.accountDef.credentials.username,
        // no need to send the password to the UI.
      },

      servers: [
        {
          type: this.accountDef.receiveType,
          connInfo: this.accountDef.receiveConnInfo,
        },
        {
          type: this.accountDef.sendType,
          connInfo: this.accountDef.sendConnInfo,
        }
      ],
    };
  },

  saveAccountState: function(reuseTrans) {
    return this._receivePiece.saveAccountState(reuseTrans);
  },

  /**
   * Shutdown the account; see `MailUniverse.shutdown` for semantics.
   */
  shutdown: function() {
    this._sendPiece.shutdown();
    this._receivePiece.shutdown();
  },

  createFolder: function(parentFolderId, folderName, containOnlyOtherFolders,
                         callback) {
    return this._receivePiece.createFolder(
      parentFolderId, folderName, containOnlyOtherFolders, callback);
  },

  deleteFolder: function(folderId, callback) {
    return this._receivePiece.deleteFolder(folderId, callback);
  },

  sliceFolderMessages: function(folderId, bridgeProxy) {
    return this._receivePiece.sliceFolderMessages(folderId, bridgeProxy);
  },

  syncFolderList: function(callback) {
    return this._receivePiece.syncFolderList(callback);
  },

  sendMessage: function(composedMessage, callback) {
    return this._sendPiece.sendMessage(composedMessage, callback);
  },

  getFolderStorageForFolderId: function(folderId) {
    return this._receivePiece.getFolderStorageForFolderId(folderId);
  },

  runOp: function(op, mode, callback) {
    return this._receivePiece.runOp(op, mode, callback);
  },
};

const COMPOSITE_ACCOUNT_TYPE_TO_CLASS = {
  'imap+smtp': CompositeAccount,
  'fake': $fakeacct.FakeAccount,
};


// Simple hard-coded autoconfiguration by domain...
var autoconfigByDomain = {
  // this is for testing, and won't work because of bad certs.
  'asutherland.org': {
    type: 'imap+smtp',
    imapHost: 'mail.asutherland.org',
    imapPort: 993,
    imapCrypto: true,
    smtpHost: 'mail.asutherland.org',
    smtpPort: 465,
    smtpCrypto: true,
    usernameIsFullEmail: true,
  },
  'mozilla.com': {
    type: 'imap+smtp',
    imapHost: 'mail.mozilla.com',
    imapPort: 993,
    imapCrypto: true,
    smtpHost: 'smtp.mozilla.org',
    smtpPort: 465,
    smtpCrypto: true,
    usernameIsFullEmail: true,
  },
  'yahoo.com': {
    type: 'imap+smtp',
    imapHost: 'imap.mail.yahoo.com',
    imapPort: 993,
    imapCrypto: true,
    smtpHost: 'smtp.mail.yahoo.com',
    smtpPort: 465,
    smtpCrypto: true,
    usernameIsFullEmail: true,
  },
  'localhost': {
    type: 'imap+smtp',
    imapHost: 'localhost',
    imapPort: 143,
    imapCrypto: false,
    smtpHost: 'localhost',
    smtpPort: 25,
    smtpCrypto: false,
    usernameIsFullEmail: false,
  },
  'slocalhost': {
    type: 'imap+smtp',
    imapHost: 'localhost',
    imapPort: 993,
    imapCrypto: true,
    smtpHost: 'localhost',
    smtpPort: 465,
    smtpCrypto: true,
    usernameIsFullEmail: false,
  },
  'example.com': {
    type: 'fake',
  },
};

var Configurators = {};
Configurators['imap+smtp'] = {
  tryToCreateAccount: function cfg_is_ttca(universe, userDetails, domainInfo,
                                           callback, _LOG) {
    var credentials, imapConnInfo, smtpConnInfo;
    if (domainInfo) {
      var username = domainInfo.usernameIsFullEmail ? userDetails.emailAddress
        : userDetails.emailAddress.substring(
            0, userDetails.emailAddress.indexOf('@'));
      credentials = {
        username: username,
        password: userDetails.password,
      };
      imapConnInfo = {
        hostname: domainInfo.imapHost,
        port: domainInfo.imapPort,
        crypto: domainInfo.imapCrypto,
      };
      smtpConnInfo = {
        hostname: domainInfo.smtpHost,
        port: domainInfo.smtpPort,
        crypto: domainInfo.smtpCrypto,
      };
    }

    var self = this;
    var callbacks = allbackMaker(
      ['imap', 'smtp'],
      function probesDone(results) {
        // -- both good?
        if (results.imap[0] && results.smtp) {
          var account = self._defineImapAccount(
            universe,
            userDetails, credentials,
            imapConnInfo, smtpConnInfo, results.imap[1]);
          account.syncFolderList(function() {
            callback(true, account);
          });

        }
        // -- either/both bad
        else {
          // clean up the imap connection if it was okay but smtp failed
          if (results.imap[0])
            results.imap[1].close();
          callback(false, null);
          return;
        }
      });

    var imapProber = new $imapprobe.ImapProber(credentials, imapConnInfo,
                                               _LOG);
    imapProber.onresult = callbacks.imap;

    var smtpProber = new $smtpprobe.SmtpProber(credentials, smtpConnInfo,
                                               _LOG);
    smtpProber.onresult = callbacks.smtp;
  },

  /**
   * Define an account now that we have verified the credentials are good and
   * the server meets our minimal functionality standards.  We are also
   * provided with the protocol connection that was used to perform the check
   * so we can immediately put it to work.
   */
  _defineImapAccount: function cfg_is__defineImapAccount(
                        universe,
                        userDetails, credentials, imapConnInfo, smtpConnInfo,
                        imapProtoConn) {
    var accountId = $a64.encodeInt(universe.config.nextAccountNum++);
    var accountDef = {
      id: accountId,
      name: userDetails.emailAddress,

      type: 'imap+smtp',
      receiveType: 'imap',
      sendType: 'smtp',

      credentials: credentials,
      receiveConnInfo: imapConnInfo,
      sendConnInfo: smtpConnInfo,

      identities: [
        {
          id: accountId + '/' +
                $a64.encodeInt(universe.config.nextIdentityNum++),
          name: userDetails.displayName,
          address: userDetails.emailAddress,
          replyTo: null,
          signature: DEFAULT_SIGNATURE
        },
      ]
    };
    var folderInfo = {
      $meta: {
        nextFolderNum: 0,
        nextMutationNum: 0,
        lastFullFolderProbeAt: 0,
        capability: imapProtoConn.capabilities,
        rootDelim: imapProtoConn.delim,
      },
      $mutations: [],
    };
    universe.saveAccountDef(accountDef, folderInfo);
    return universe._loadAccount(accountDef, folderInfo, imapProtoConn);
  },
};
Configurators['fake'] = {
  tryToCreateAccount: function cfg_fake(universe, userDetails, domainInfo,
                                        callback, _LOG) {
    var credentials = {
      username: userDetails.username,
      password: userDetails.password,
    };
    var accountId = $a64.encodeInt(universe.config.nextAccountNum++);
    var accountDef = {
      id: accountId,
      name: userDetails.emailAddress,

      type: 'fake',

      credentials: credentials,
      connInfo: {
        hostname: 'magic.example.com',
        port: 1337,
        crypto: true,
      },

      identities: [
        {
          id: accountId + '/' +
                $a64.encodeInt(universe.config.nextIdentityNum++),
          name: userDetails.displayName,
          address: userDetails.emailAddress,
          replyTo: null,
          signature: DEFAULT_SIGNATURE
        },
      ]
    };

    var folderInfo = {
      $meta: {
        nextMutationNum: 0,
      },
      $mutations: [],
    };
    universe.saveAccountDef(accountDef, folderInfo);
    var account = universe._loadAccount(accountDef, folderInfo, null);
    callback(true, account);
  },
};

/**
 * The MailUniverse is the keeper of the database, the root logging instance,
 * and the mail accounts.  It loads the accounts from the database on startup
 * asynchronously, so whoever creates it needs to pass a callback for it to
 * invoke on successful startup.
 *
 * Our concept of mail accounts bundles together both retrieval (IMAP,
 * activesync) and sending (SMTP, activesync) since they really aren't
 * separable and in some cases are basically the same (activesync) or coupled
 * (BURL SMTP pulling from IMAP, which we don't currently do but aspire to).
 *
 * @typedef[ConnInfo @dict[
 *   @key[hostname]
 *   @key[port]
 *   @key[crypto @oneof[
 *     @case[false]{
 *       No encryption; plaintext.
 *     }
 *     @case['starttls']{
 *       Upgrade to TLS after establishing a plaintext connection.  Abort if
 *       the server seems incapable of performing the upgrade.
 *     }
 *     @case[true]{
 *       Establish a TLS connection from the get-go; never use plaintext at all.
 *       By convention this may be referred to as an SSL or SSL/TLS connection.
 *     }
 * ]]
 * @typedef[AccountCredentials @dict[
 *   @key[username String]{
 *     The name we use to identify ourselves to the server.  This will
 *     frequently be the whole e-mail address.  Ex: "joe@example.com" rather
 *     than just "joe".
 *   }
 *   @key[password String]{
 *     The password.  Ideally we would have a keychain mechanism so we wouldn't
 *     need to store it like this.
 *   }
 * ]]
 * @typedef[IdentityDef @dict[
 *   @key[id String]{
 *     Unique identifier resembling folder id's;
 *     "{account id}-{unique value for this account}" is what it looks like.
 *   }
 *   @key[name String]{
 *     Display name, ex: "Joe User".
 *   }
 *   @key[address String]{
 *     E-mail address, ex: "joe@example.com".
 *   }
 *   @key[replyTo @oneof[null String]]{
 *     The e-mail address to put in the "reply-to" header for recipients
 *     to address their replies to.  If null, the header will be omitted.
 *   }
 *   @key[signature @oneof[null String]]{
 *     An optional signature block.  If present, we ensure the body text ends
 *     with a newline by adding one if necessary, append "-- \n", then append
 *     the contents of the signature.  Once we start supporting HTML, we will
 *     need to indicate whether the signature is plaintext or HTML.  For now
 *     it must be plaintext.
 *   }
 * ]]
 * @typedef[AccountDef @dict[
 *   @key[id AccountId]
 *   @key[name String]{
 *     The display name for the account.
 *   }
 *   @key[identities @listof[IdentityDef]]
 *
 *   @key[type @oneof['imap+smtp' 'activesync']]
 *   @key[receiveType @oneof['imap' 'activesync']]
 *   @key[sendType @oneof['smtp' 'activesync']]
 *   @key[receiveConnInfo ConnInfo]
 *   @key[sendConnInfo ConnInfo]
 * ]]
 * @typedef[MessageNamer @dict[
 *   @key[date DateMS]
 *   @key[suid SUID]
 * ]]{
 *   The information we need to locate a message within our storage.  When the
 *   MailAPI tells the back-end things, it uses this representation.
 * }
 * @typedef[SerializedMutation @dict[
 *   @key[type @oneof[
 *     @case['modtags']{
 *       Modify tags by adding and/or removing them.
 *     }
 *     @case['delete']{
 *     }
 *     @case['move']{
 *       Move message(s) within the same account.
 *     }
 *     @case['copy']{
 *       Copy message(s) within the same account.
 *     }
 *   ]]{
 *     The implementation opcode used to determine what functions to call.
 *   }
 *   @key[longtermId]{
 *     Unique-ish identifier for the mutation.  Just needs to be unique enough
 *     to not refer to any pending or still undoable-operation.
 *   }
 *   @key[status @oneof[
 *     @case[null]
 *     @case['running']
 *     @case['done']
 *   ]]{
 *   }
 *   @key[humanOp String]{
 *     The user friendly opcode where flag manipulations like starring have
 *     their own opcode.
 *   }
 *   @key[messages @listof[MessageNamer]]
 *
 *   @key[folderId #:optional FolderId]{
 *     If this is a move/copy, the target folder
 *   }
 * ]]
 */
function MailUniverse(testingModeLogData, callAfterBigBang) {
  /** @listof[CompositeAccount] */
  this.accounts = [];
  this._accountsById = {};

  /** @listof[IdentityDef] */
  this.identities = [];
  this._identitiesById = {};

  this._opsByAccount = {};
  this._opCompletionListenersByAccount = {};

  this._bridges = [];

  // hookup network status indication
  var connection = window.navigator.connection ||
                     window.navigator.mozConnection ||
                     window.navigator.webkitConnection;
  this.online = true; // just so we don't cause an offline->online transition
  this._onConnectionChange();
  connection.addEventListener('change', this._onConnectionChange.bind(this));

  this._testModeDisablingLocalOps = false;

  /**
   * @dictof[
   *   @key[AccountId]
   *   @value[@listof[SerializedMutation]]
   * ]{
   *   The list of mutations for the account that still have yet to complete.
   * }
   */
  this._pendingMutationsByAcct = {};

  this.config = null;

  if (testingModeLogData) {
    console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
    console.log("! DEVELOPMENT MODE ACTIVE!                !");
    console.log("! LOGGING SUBSYSTEM ENTRAINING USER DATA! !");
    console.log("! (the data does not leave the browser.)  !");
    console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
    $log.DEBUG_markAllFabsUnderTest();
  }

  this._LOG = LOGFAB.MailUniverse(this, null, null);
  this._db = new $imapdb.ImapDB();
  var self = this;
  this._db.getConfig(function(configObj, accountInfos) {
    self._LOG.configLoaded(configObj, accountInfos);
    if (configObj) {
      self.config = configObj;
      for (var i = 0; i < accountInfos.length; i++) {
        var accountInfo = accountInfos[i];
        self._loadAccount(accountInfo.def, accountInfo.folderInfo);
      }
    }
    else {
      self.config = {
        // We need to put the id in here because our startup query can't
        // efficiently get both the key name and the value, just the values.
        id: 'config',
        nextAccountNum: 0,
        nextIdentityNum: 0,
      };
      self._db.saveConfig(self.config);
    }
    callAfterBigBang();
  });
}
exports.MailUniverse = MailUniverse;
MailUniverse.prototype = {
  _onConnectionChange: function() {
    var connection = window.navigator.connection ||
                       window.navigator.mozConnection ||
                       window.navigator.webkitConnection;
    var wasOnline = this.online;
    /**
     * Are we online?  AKA do we have actual internet network connectivity.
     * This should ideally be false behind a captive portal.
     */
    this.online = connection.bandwidth > 0;
    /**
     * Do we want to minimize network usage?  Right now, this is the same as
     * metered, but it's conceivable we might also want to set this if the
     * battery is low, we want to avoid stealing network/cpu from other
     * apps, etc.
     */
    this.minimizeNetworkUsage = connection.metered;
    /**
     * Is there a marginal cost to network usage?  This is intended to be used
     * for UI (decision) purposes where we may want to prompt before doing
     * things when bandwidth is metered, but not when the user is on comparably
     * infinite wi-fi.
     */
    this.networkCostsMoney = connection.metered;

    if (!wasOnline && this.online) {
      // - check if we have any pending actions to run and run them if so.
      for (var iAcct = 0; iAcct < this.accounts.length; iAcct++) {
        var account = this.accounts[iAcct],
            queue = this._opsByAccount[account.id];
        if (queue.length &&
            // (it's possible there is still an active job right now)
            (queue[0].status !== 'doing' && queue[0].status !== 'undoing')) {
          var op = queue[0];
          account.runOp(
            op, op.desire,
            this._opCompleted.bind(this, account, op));
        }
      }
    }
  },

  registerBridge: function(mailBridge) {
    this._bridges.push(mailBridge);
  },

  unregisterBridge: function(mailBridge) {
    var idx = this._bridges.indexOf(mailBridge);
    if (idx !== -1)
      this._bridges.splice(idx, 1);
  },

  tryToCreateAccount: function mu_tryToCreateAccount(userDetails, callback) {
    var domain = userDetails.emailAddress.substring(
                   userDetails.emailAddress.indexOf('@') + 1),
        domainInfo = null;

    if (autoconfigByDomain.hasOwnProperty(domain))
      domainInfo = autoconfigByDomain[domain];

    if (!domainInfo) {
      throw new Error("Don't know how to configure domain: " + domain);
    }

    var configurator = Configurators[domainInfo.type];
    return configurator.tryToCreateAccount(this, userDetails, domainInfo,
                                           callback, this._LOG);
  },

  saveAccountDef: function(accountDef, folderInfo) {
    this._db.saveAccountDef(this.config, accountDef, folderInfo);
  },

  /**
   * Instantiate an account from the persisted representation.
   */
  _loadAccount: function mu__loadAccount(accountDef, folderInfo,
                                         receiveProtoConn) {
    if (!COMPOSITE_ACCOUNT_TYPE_TO_CLASS.hasOwnProperty(accountDef.type)) {
      this._LOG.badAccountType(accountDef.type);
      return null;
    }
    var constructor = COMPOSITE_ACCOUNT_TYPE_TO_CLASS[accountDef.type];
    var account = new constructor(this, accountDef, folderInfo, this._db,
                                  receiveProtoConn, this._LOG);

    this.accounts.push(account);
    this._accountsById[account.id] = account;
    this._opsByAccount[account.id] = [];
    this._opCompletionListenersByAccount[account.id] = null;

    for (var iIdent = 0; iIdent < accountDef.identities.length; iIdent++) {
      var identity = accountDef.identities[iIdent];
      this.identities.push(identity);
      this._identitiesById[identity.id] = identity;
    }

    // - check for mutations that still need to be processed
    for (var i = 0; i < account.mutations.length; i++) {
      var op = account.mutations[i];
      if (op.desire)
        this._queueAccountOp(account, op);
    }

    return account;
  },

  __notifyAddedFolder: function(accountId, folderMeta) {
    for (var iBridge = 0; iBridge < this._bridges.length; iBridge++) {
      var bridge = this._bridges[iBridge];
      bridge.notifyFolderAdded(accountId, folderMeta);
    }
  },

  __notifyRemovedFolder: function(accountId, folderMeta) {
    for (var iBridge = 0; iBridge < this._bridges.length; iBridge++) {
      var bridge = this._bridges[iBridge];
      bridge.notifyFolderRemoved(accountId, folderMeta);
    }
  },

  //////////////////////////////////////////////////////////////////////////////
  // Lifetime Stuff

  /**
   * Write the current state of the universe to the database.
   */
  saveUniverseState: function() {
    var curTrans = null;

    for (var iAcct = 0; iAcct < this.accounts.length; iAcct++) {
      var account = this.accounts[iAcct];
      curTrans = account.saveAccountState(curTrans);
    }
  },

  /**
   * Shutdown all accounts; this is currently for the benefit of unit testing.
   * We expect our app to operate in a crash-only mode of operation where a
   * clean shutdown means we get a heads-up, put ourselves offline, and trigger a
   * state save before we just demand that our page be closed.  That's future
   * work, of course.
   */
  shutdown: function() {
    for (var iAcct = 0; iAcct < this.accounts.length; iAcct++) {
      var account = this.accounts[iAcct];
      account.shutdown();
    }
    this._db.close();
    this._LOG.__die();
  },

  //////////////////////////////////////////////////////////////////////////////
  // Lookups: Account, Folder, Identity

  getAccountForAccountId: function mu_getAccountForAccountId(accountId) {
    return this._accountsById[accountId];
  },

  /**
   * Given a folder-id, get the owning account.
   */
  getAccountForFolderId: function mu_getAccountForFolderId(folderId) {
    var accountId = folderId.substring(0, folderId.indexOf('/')),
        account = this._accountsById[accountId];
    return account;
  },

  /**
   * Given a message's sufficiently unique identifier, get the owning account.
   */
  getAccountForMessageSuid: function mu_getAccountForMessageSuid(messageSuid) {
    var accountId = messageSuid.substring(0, messageSuid.indexOf('/')),
        account = this._accountsById[accountId];
    return account;
  },

  getFolderStorageForFolderId: function mu_getFolderStorageForFolderId(
                                 folderId) {
    var account = this.getAccountForFolderId(folderId);
    return account.getFolderStorageForFolderId(folderId);
  },

  getAccountForSenderIdentityId: function mu_getAccountForSenderIdentityId(
                                   identityId) {
    var accountId = identityId.substring(0, identityId.indexOf('/')),
        account = this._accountsById[accountId];
    return account;
  },

  getIdentityForSenderIdentityId: function mu_getIdentityForSenderIdentityId(
                                    identityId) {
    return this._identitiesById[identityId];
  },

  //////////////////////////////////////////////////////////////////////////////
  // Message Mutation and Undoing

  /**
   * Partitions messages by account.  Accounts may want to partition things
   * further, such as by folder, but we leave that up to them since not all
   * may require it.  (Ex: activesync and gmail may be able to do things
   * that way.)
   */
  _partitionMessagesByAccount: function(messageNamers, targetAccountId) {
    var results = [], acctToMsgs = {};

    for (var i = 0; i < messageNamers.length; i++) {
      var messageNamer = messageNamers[i],
          messageSuid = messageNamer.suid,
          accountId = messageSuid.substring(0, messageSuid.indexOf('/'));
      if (!acctToMsgs.hasOwnProperty(accountId)) {
        var messages = [messageNamer];
        results.push({
          account: this._accountsById[accountId],
          messages: messages,
          crossAccount: (targetAccountId && targetAccountId !== accountId),
        });
        acctToMsgs[accountId] = messages;
      }
      else {
        acctToMsgs[accountId].push(messageNamer);
      }
    }

    return results;
  },

  _opCompleted: function(account, op, err) {
    // Clear the desire if it is satisfied.  It's possible the desire is now
    // to undo it, in which case we don't want to clobber the undo desire with
    // the completion of the do desire.
    if (op.status === 'done' && op.desire === 'do')
      op.desire = null;
    else if (op.status === 'undone' && op.desire === 'undo')
      op.desire = null;
    var queue = this._opsByAccount[account.id];
    // shift the running op off.
    queue.shift();

    if (queue.length) {
      op = queue[0];
      account.runOp(
        op, op.desire,
        this._opCompleted.bind(this, account, op));
    }
    else if (this._opCompletionListenersByAccount[account.id]) {
      this._opCompletionListenersByAccount[account.id](account);
      this._opCompletionListenersByAccount[account.id] = null;
    }
  },

  /**
   * Immediately run the local mutation (synchronously) for an operation and
   * enqueue its server operation for asynchronous operation.
   *
   * (nb: Header updates' execution may actually be deferred into the future if
   * block loads are required, but they will maintain their apparent ordering
   * on the folder in question.)
   */
  _queueAccountOp: function(account, op) {
    var queue = this._opsByAccount[account.id];
    queue.push(op);

    if (op.longtermId === null) {
      op.longtermId = account.id + '/' +
                        $a64.encodeInt(account.meta.nextMutationNum++);
      account.mutations.push(op);
      while (account.mutations.length > MAX_MUTATIONS_FOR_UNDO &&
             account.mutations[0].desire === null) {
        account.mutations.shift();
      }
    }

    // - run the local manipulation immediately
    if (!this._testModeDisablingLocalOps)
      account.runOp(op, op.desire === 'do' ? 'local_do' : 'local_undo');

    // - initiate async execution if this is the first op
    if (this.online && queue.length === 1)
      account.runOp(
        op, op.desire,
        this._opCompleted.bind(this, account, op));
    return op.longtermId;
  },

  waitForAccountOps: function(account, callback) {
    if (this._opsByAccount[account.id].length === 0)
      callback();
    else
      this._opCompletionListenersByAccount[account.id] = callback;
  },

  modifyMessageTags: function(humanOp, messageSuids, addTags, removeTags) {
    var self = this, longtermIds = [];
    this._partitionMessagesByAccount(messageSuids, null).forEach(function(x) {
      var longtermId = self._queueAccountOp(
        x.account,
        {
          type: 'modtags',
          longtermId: null,
          status: null,
          desire: 'do',
          humanOp: humanOp,
          messages: x.messages,
          addTags: addTags,
          removeTags: removeTags,
          // how many messages have had their tags changed already.
          progress: 0,
        });
      longtermIds.push(longtermId);
    });
    return longtermIds;
  },

  moveMessages: function(messageSuids, targetFolderId) {
  },

  appendMessages: function(folderId, messages) {
    var account = this.getAccountForFolderId(folderId);
    var longtermId = this._queueAccountOp(
      account,
      {
        type: 'append',
        longtermId: null,
        status: null,
        desire: 'do',
        humanOp: 'append',
        messages: messages,
        folderId: folderId,
      });
    return [longtermId];
  },

  undoMutation: function(longtermIds) {
    for (var i = 0; i < longtermIds.length; i++) {
      var longtermId = longtermIds[i],
          account = this.getAccountForFolderId(longtermId); // (it's fine)

      for (var iOp = 0; iOp < account.mutations.length; iOp++) {
        var op = account.mutations[iOp];
        if (op.longtermId === longtermId) {
          switch (op.status) {
            // if we haven't started doing the operation, we can cancel it
            case null:
            case 'undone':
              var queue = this._opsByAccount[account.id],
                  idx = queue.indexOf(op);
              if (idx !== -1) {
                queue.splice(idx, 1);
                // we still need to trigger the local_undo, of course
                account.runOp(op, 'local_undo');
                op.desire = null;
              }
              // If it somehow didn't exist, enqueue it.  Presumably this is
              // something odd like a second undo request, which is logically
              // a 'do' request, which is unsupported, but hey.
              else {
                op.desire = 'do';
                this._queueAccountOp(account, op);
              }
              break;
            // If it has been completed or is in the processing of happening, we
            // should just enqueue it again to trigger its undoing/doing.
            case 'done':
            case 'doing':
              op.desire = 'undo';
              this._queueAccountOp(account, op);
              break;
            case 'undoing':
              op.desire = 'do';
              this._queueAccountOp(account, op);
              break;
          }
        }
      }
    }
  },

  //////////////////////////////////////////////////////////////////////////////
};

var LOGFAB = exports.LOGFAB = $log.register($module, {
  MailUniverse: {
    type: $log.ACCOUNT,
    events: {
      configLoaded: {},
      createAccount: { type: true, id: false },
    },
    TEST_ONLY_events: {
      configLoaded: { config: false, accounts: false },
      createAccount: { name: false },
    },
    errors: {
      badAccountType: { type: true },
    },
  },
});

}); // end define
;
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Instantiates the IMAP Client in the same webpage as the UI and provides the
 * bridge hookup logic.
 **/

define('rdimap/imapclient/same-frame-setup',[
    './shim-sham',
    'rdcommon/log',
    'rdcommon/logreaper',
    './mailapi',
    './mailbridge',
    './mailuniverse',
    './imapslice',
    'exports'
  ],
  function(
    $shim_setup,
    $log,
    $logreaper,
    $mailapi,
    $mailbridge,
    $mailuniverse,
    $imapslice,
    exports
  ) {


function createBridgePair(universe) {
  var TMB = new $mailbridge.MailBridge(universe);
  var TMA = new $mailapi.MailAPI();
  // shim-sham provide window.setZeroTimeout
  TMA.__bridgeSend = function(msg) {
    window.setZeroTimeout(function() {
      TMB.__receiveMessage(msg);
    });
  };
  TMB.__sendMessage = function(msg) {
    window.setZeroTimeout(function() {
      TMA.__bridgeReceive(msg);
    });
  };
  return {
    api: TMA,
    bridge: TMB
  };
}

var _universeCallbacks = [], localMailAPI = null;
function onUniverse() {
  localMailAPI = createBridgePair(universe).api;
  console.log("Mail universe/bridge created, notifying.");
  for (var i = 0; i < _universeCallbacks.length; i++) {
    _universeCallbacks[i](universe);
  }
  _universeCallbacks = null;
  var evtObject = document.createEvent('Event');
  evtObject.initEvent('mailapi', false, false);
  evtObject.mailAPI = localMailAPI;
  window.dispatchEvent(evtObject);
}
/**
 * Should the logging subsystem run at unit-test levels of detail (which means
 * capturing potential user data like the contents of e-mails)?  The answer
 * is NEVER BY DEFAULT and ALMOST NEVER THE REST OF THE TIME.
 *
 * The only time we would want to turn this on is when detailed debugging is
 * required, we have data censoring in place for all super-sensitive data like
 * credentials (we have it for IMAP, but not SMTP, although it's not logging
 * right now), there is express user consent, and we have made a reasonable
 * level of effort to create automated tooling that can extract answers from
 * the logs in an oracular fashion so that the user doesn't need to provide
 * us with the logs, but can instead have our analysis code derive answers.
 */
const DANGEROUS_LOG_EVERYTHING = false;
var universe = new $mailuniverse.MailUniverse(DANGEROUS_LOG_EVERYTHING,
                                              onUniverse);
var LOG_REAPER, LOG_BACKLOG = [], MAX_LOG_BACKLOG = 60;
LOG_REAPER = new $logreaper.LogReaper(universe._LOG);

function runOnUniverse(callback) {
  if (_universeCallbacks !== null) {
    _universeCallbacks.push(callback);
    return;
  }
  callback(universe);
}
window.gimmeMailAPI = function(callback) {
  runOnUniverse(function() {
    callback(localMailAPI);
  });
};

/**
 * Debugging: enable spawning a loggest log browser using our log contents;
 * call document.spawnLogWindow() to do so.
 */
document.enableLogSpawner = function enableLogSpawner(spawnNow) {
  var URL = "http://localhost/live/arbpl/client/index-post-devmode.html",
      ORIGIN = "http://localhost";

  var openedWin = null,
      channelId = null,
      spamIntervalId = null;
  document.spawnLogWindow = function() {
    // not security, just naming.
    channelId = 'arbpl' + Math.floor(Math.random() * 1000000) + Date.now();
    // name the window so we can reuse it
    openedWin = window.open(URL + '#' + channelId, "ArbPL");
    spamIntervalId = setInterval(spammer, 100);
  };
  // Keep pinging the window until it tells us it has fully loaded.
  function spammer() {
    openedWin.postMessage({ type: 'hello', id: channelId }, ORIGIN);
  }
  window.addEventListener("message", function(event) {
    if (event.origin !== ORIGIN)
      return;
    if (event.data.id !== channelId)
      return;
    clearInterval(spamIntervalId);

    event.source.postMessage(
      {
        type: "backlog",
        id: channelId,
        schema: $log.provideSchemaForAllKnownFabs(),
        backlog: LOG_BACKLOG,
      },
      event.origin);
  }, false);

  if (spawnNow)
    document.spawnLogWindow();
};

////////////////////////////////////////////////////////////////////////////////
// Logging

// once a second, potentially generate a log
setInterval(function() {
  if (!LOG_REAPER)
    return;
  var logTimeSlice = LOG_REAPER.reapHierLogTimeSlice();
  // if nothing interesting happened, this could be empty, yos.
  if (logTimeSlice.logFrag) {
    LOG_BACKLOG.push(logTimeSlice);
    // throw something away if we've got too much stuff already
    if (LOG_BACKLOG.length > MAX_LOG_BACKLOG)
      LOG_BACKLOG.shift();

    // In deuxdrop, this is where we would also update our subscribers.  We
    // may also want to do that here.
  }
}, 1000);

////////////////////////////////////////////////////////////////////////////////

});
require(['rdimap/imapclient/same-frame-setup'], function () {});
}());
