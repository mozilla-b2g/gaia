/*
 * @package jsftp
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Sergi Mansilla <sergi.mansilla@gmail.com>
 * @license https://github.com/sergi/jsFTP/blob/master/LICENSE MIT License
 */

"use strict";

var assert = require("assert");
var Parser = require("../src/parser");

describe("jsftp file listing parser", function() {
  it("test ftp unix STAT responses", function() {
    var str = "drwxr-xr-x    5 1001     1001         4096 Jan 09 11:52 .\r\n\
drwxr-xr-x    4 0        0            4096 Sep 19 13:50 ..\r\n\
-rw-------    1 1001     1001         1118 Jan 09 12:09 .bash_history\r\n\
-rw-------    1 1001     1001          943 Jan 09 11:52 .viminfo\r\n\
drwxrwxr-x    5 1001     1001         4096 Jan 09 11:52 inaccessible\r\n\
drwxrwxrwx    2 1001     1001         4096 Sep 21 11:20 project1\r\n\
drwx------    2 1001     1001         4096 Oct 19 16:17 project2\r\n";

    var unixEntries = [
      {
        type: 0,
        size: 1118,
        name: ".bash_history",
        time: +new Date("Jan  9 12:09 " + new Date().getFullYear()),
        owner: "1001",
        group: "1001",

        userReadPerm: true,
        userWritePerm: true,
        userExecPerm: false,

        groupReadPerm: false,
        groupWritePerm: false,
        groupExecPerm: false,

        otherReadPerm: false,
        otherWritePerm: false,
        otherExecPerm: false
      },
      {
        type: 0,
        size: 943,
        name: ".viminfo",
        time: +new Date("Jan  9 11:52 " + new Date().getFullYear()),
        owner: "1001",
        group: "1001",

        userReadPerm: true,
        userWritePerm: true,
        userExecPerm: false,

        groupReadPerm: false,
        groupWritePerm: false,
        groupExecPerm: false,

        otherReadPerm: false,
        otherWritePerm: false,
        otherExecPerm: false
      },
      {
        type: 1,
        size: 4096,
        name: "inaccessible",
        time: +new Date("Jan  9 11:52 " + new Date().getFullYear()),
        owner: "1001",
        group: "1001",

        userReadPerm: true,
        userWritePerm: true,
        userExecPerm: true,

        groupReadPerm: true,
        groupWritePerm: true,
        groupExecPerm: true,

        otherReadPerm: true,
        otherWritePerm: false,
        otherExecPerm: true
      },
      {
        type: 1,
        size: 4096,
        name: "project1",
        time: +new Date("Sep 21 11:20 " + new Date().getFullYear()),
        owner: "1001",
        group: "1001",

        userReadPerm: true,
        userWritePerm: true,
        userExecPerm: true,

        groupReadPerm: true,
        groupWritePerm: true,
        groupExecPerm: true,

        otherReadPerm: true,
        otherWritePerm: true,
        otherExecPerm: true
      },
      {
        type: 1,
        size: 4096,
        name: "project2",
        time: +new Date("Oct 19 16:17 " + new Date().getFullYear()),
        owner: "1001",
        group: "1001",

        userReadPerm: true,
        userWritePerm: true,
        userExecPerm: true,

        groupReadPerm: false,
        groupWritePerm: false,
        groupExecPerm: false,

        otherReadPerm: false,
        otherWritePerm: false,
        otherExecPerm: false
      }
    ];

    Parser.parseEntries(str, function(err, entryArray) {
      entryArray.forEach(function(entry, i) {
        assert.equal(unixEntries[i].type, entry.type);
        assert.equal(unixEntries[i].size, entry.size);
        assert.equal(unixEntries[i].name, entry.name);
        //assert.equal(unixEntries[i].time, entry.time);
        assert.equal(unixEntries[i].owner, entry.owner);
        assert.equal(unixEntries[i].group, entry.group);

        assert.equal(unixEntries[i].userReadPerm, entry.userPermissions.read);
        assert.equal(unixEntries[i].userWritePerm, entry.userPermissions.write);
        assert.equal(unixEntries[i].userExecPerm, entry.userPermissions.exec);

        assert.equal(unixEntries[i].groupReadPerm, entry.groupPermissions.read);
        assert.equal(unixEntries[i].groupWritePerm, entry.groupPermissions.write);
        assert.equal(unixEntries[i].groupExecPerm, entry.groupPermissions.exec);

        assert.equal(unixEntries[i].otherReadPerm, entry.otherPermissions.read);
        assert.equal(unixEntries[i].otherWritePerm, entry.otherPermissions.write);
        assert.equal(unixEntries[i].otherExecPerm, entry.otherPermissions.exec);
      });
    })
  });

  it("test ftp unix LIST responses", function() {
    var str = "drwx--x---  10 mrclash  adm          4096 Aug  9 14:48 .\r\n\
 drwx--x---  10 mrclash  adm          4096 Aug  9 14:48 ..\r\n\
 -rw-r--r--   1 mrclash  pg223090      260 Mar 25  2008 .alias\r\n\
 -rw-------   1 mrclash  pg223090     2219 Sep  5  2010 .bash_history\r\n\
 -rw-r--r--   1 mrclash  pg223090       55 Mar 25  2008 .bashrc\r\n\
 drwx------   2 mrclash  pg223090     4096 Aug  9 14:39 .ssh\r\n\
 -rw-r--r--   1 mrclash  pg223090       18 Aug  8 13:06 Cloud9 FTP connection test.\r\n\
 -rwxr-xr-x   1 mrclash  pg223090 68491314 Jan 22  2009 Documents.zip\r\n\
 -rwxr-xr-x   1 mrclash  pg223090      141 Nov  1  2008 EcPxMptYISIdOSjS.XFV.Q--.html\r\n\
 dr-xr-x---   7 mrclash  dhapache     4096 May 29 07:47 logs\r\n\
 drwxr-xr-x   7 mrclash  pg223090     4096 Aug  9 14:48 re-alpine.git\r\n\
 -rwxr-xr-x   1 mrclash  pg223090   312115 Jan 22  2009 restaurants.csv\r\n\
 drwxr-xr-x  12 mrclash  pg223090     4096 Jul 24 02:42 sergimansilla.com\r\n\
 drwxr-xr-x  10 mrclash  pg223090     4096 Aug  3  2009 svn\r\n\
 -rwxr-xr-x   1 mrclash  pg223090       76 Aug  9 14:47 sync-alpine.sh\r\n\
 drwxr-xr-x   2 mrclash  pg223090     4096 Aug  4 10:00 test_c9\r\n\
 -rw-r--r--   1 mrclash  pg223090        4 Aug  4 09:11 testfile.txt\r\n\
 lrwxr-xr-x    1 sergi  staff      11 Jul  7  2011 .vimrc -> .vim/.vimrc\r\n";

    var unixEntries = [
      {
        //line: "-rw-r--r--   1 mrclash  pg223090      260 Mar 25  2008 .alias",
        type: 0,
        size: 260,
        name: ".alias",
        time: +new Date("Mar 25  2008"),
        owner: "mrclash",
        group: "pg223090",

        userReadPerm: true,
        userWritePerm: true,
        userExecPerm: false,

        groupReadPerm: true,
        groupWritePerm: false,
        groupExecPerm: false,

        otherReadPerm: true,
        otherWritePerm: false,
        otherExecPerm: false
      },
      {
        //line: "-rw-------   1 mrclash  pg223090     2219 Sep  5  2010 .bash_history",
        type: 0,
        size: 2219,
        name: ".bash_history",
        time: +new Date("Sep  5  2010"),
        owner: "mrclash",
        group: "pg223090",

        userReadPerm: true,
        userWritePerm: true,
        userExecPerm: false,

        groupReadPerm: false,
        groupWritePerm: false,
        groupExecPerm: false,

        otherReadPerm: false,
        otherWritePerm: false,
        otherExecPerm: false
      },
      {
        type: 0,
        size: 55,
        name: ".bashrc",
        time: +new Date("Mar 25  2008"),
        owner: "mrclash",
        group: "pg223090",

        userReadPerm: true,
        userWritePerm: true,
        userExecPerm: false,

        groupReadPerm: true,
        groupWritePerm: false,
        groupExecPerm: false,

        otherReadPerm: true,
        otherWritePerm: false,
        otherExecPerm: false
      },
      {
        type: 1,
        size: 4096,
        name: ".ssh",
        time: +new Date("Aug  9 14:39 " + new Date().getFullYear()),
        owner: "mrclash",
        group: "pg223090",

        userReadPerm: true,
        userWritePerm: true,
        userExecPerm: true,

        groupReadPerm: false,
        groupWritePerm: false,
        groupExecPerm: false,

        otherReadPerm: false,
        otherWritePerm: false,
        otherExecPerm: false
      },
      {
        type: 0,
        size: 18,
        name: "Cloud9 FTP connection test.",
        time: +new Date("Aug  8 13:06 " + new Date().getFullYear()),
        owner: "mrclash",
        group: "pg223090",

        userReadPerm: true,
        userWritePerm: true,
        userExecPerm: false,

        groupReadPerm: true,
        groupWritePerm: false,
        groupExecPerm: false,

        otherReadPerm: true,
        otherWritePerm: false,
        otherExecPerm: false
      },
      {
        type: 0,
        size: 68491314,
        name: "Documents.zip",
        time: +new Date("Jan 22  2009"),
        owner: "mrclash",
        group: "pg223090",

        userReadPerm: true,
        userWritePerm: true,
        userExecPerm: true,

        groupReadPerm: true,
        groupWritePerm: false,
        groupExecPerm: true,

        otherReadPerm: true,
        otherWritePerm: false,
        otherExecPerm: true
      },
      {
        type: 0,
        size: 141,
        name: "EcPxMptYISIdOSjS.XFV.Q--.html",
        time: +new Date("Nov  1  2008"),
        owner: "mrclash",
        group: "pg223090",

        userReadPerm: true,
        userWritePerm: true,
        userExecPerm: true,

        groupReadPerm: true,
        groupWritePerm: false,
        groupExecPerm: true,

        otherReadPerm: true,
        otherWritePerm: false,
        otherExecPerm: true
      },
      {
        type: 1,
        size: 4096,
        name: "logs",
        time: +new Date("May 29 07:47 " + new Date().getFullYear()),
        owner: "mrclash",
        group: "dhapache",

        userReadPerm: true,
        userWritePerm: false,
        userExecPerm: true,

        groupReadPerm: true,
        groupWritePerm: false,
        groupExecPerm: true,

        otherReadPerm: false,
        otherWritePerm: false,
        otherExecPerm: false
      },
      {
        type: 1,
        size: 4096,
        name: "re-alpine.git",
        time: +new Date("Aug  9 14:48 " + new Date().getFullYear()),
        owner: "mrclash",
        group: "pg223090",

        userReadPerm: true,
        userWritePerm: true,
        userExecPerm: true,

        groupReadPerm: true,
        groupWritePerm: false,
        groupExecPerm: true,

        otherReadPerm: true,
        otherWritePerm: false,
        otherExecPerm: true
      },
      {
        type: 0,
        size: 312115,
        time: +new Date("Jan 22  2009"),
        name: "restaurants.csv",
        owner: "mrclash",
        group: "pg223090",

        userReadPerm: true,
        userWritePerm: true,
        userExecPerm: true,

        groupReadPerm: true,
        groupWritePerm: false,
        groupExecPerm: true,

        otherReadPerm: true,
        otherWritePerm: false,
        otherExecPerm: true
      },
      {
        type: 1,
        size: 4096,
        time: +new Date("Jul 24 02:42 " + new Date().getFullYear()),
        name: "sergimansilla.com",
        owner: "mrclash",
        group: "pg223090",

        userReadPerm: true,
        userWritePerm: true,
        userExecPerm: true,

        groupReadPerm: true,
        groupWritePerm: false,
        groupExecPerm: true,

        otherReadPerm: true,
        otherWritePerm: false,
        otherExecPerm: true
      },
      {
        type: 1,
        size: 4096,
        time: +new Date("Aug  3  2009"),
        name: "svn",
        owner: "mrclash",
        group: "pg223090",

        userReadPerm: true,
        userWritePerm: true,
        userExecPerm: true,

        groupReadPerm: true,
        groupWritePerm: false,
        groupExecPerm: true,

        otherReadPerm: true,
        otherWritePerm: false,
        otherExecPerm: true
      },
      {
        type: 0,
        size: 76,
        time: +new Date("Aug  9 14:47 " + new Date().getFullYear()),
        name: "sync-alpine.sh",
        owner: "mrclash",
        group: "pg223090",

        userReadPerm: true,
        userWritePerm: true,
        userExecPerm: true,

        groupReadPerm: true,
        groupWritePerm: false,
        groupExecPerm: true,

        otherReadPerm: true,
        otherWritePerm: false,
        otherExecPerm: true
      },
      {
        type: 1,
        size: 4096,
        time: +new Date("Aug  4 10:00 " + new Date().getFullYear()),
        name: "test_c9",
        owner: "mrclash",
        group: "pg223090",

        userReadPerm: true,
        userWritePerm: true,
        userExecPerm: true,

        groupReadPerm: true,
        groupWritePerm: false,
        groupExecPerm: true,

        otherReadPerm: true,
        otherWritePerm: false,
        otherExecPerm: true
      },
      {
        type: 0,
        size: 4,
        time: +new Date("Aug  4 09:11 " + new Date().getFullYear()),
        name: "testfile.txt",
        owner: "mrclash",
        group: "pg223090",

        userReadPerm: true,
        userWritePerm: true,
        userExecPerm: false,

        groupReadPerm: true,
        groupWritePerm: false,
        groupExecPerm: false,

        otherReadPerm: true,
        otherWritePerm: false,
        otherExecPerm: false
      },
      {
        type: 2,
        size: 11,
        time: +new Date("Jul  7  2011"),
        name: ".vimrc",
        target: ".vim/.vimrc",
        owner: "sergi",
        group: "staff",

        userReadPerm: true,
        userWritePerm: true,
        userExecPerm: true,

        groupReadPerm: true,
        groupWritePerm: false,
        groupExecPerm: true,

        otherReadPerm: true,
        otherWritePerm: false,
        otherExecPerm: true
      }
    ];

    var str2 = "\
-drwxr-x---   2 userName alternc      4096 Aug 22 03:45 .\r\n\
-drwxr-x---   5 userName alternc      4096 Aug 22 03:45 ..\r\n\
--rw-r-----   1 userName alternc       460 Aug 22 03:45 test1\r\n\
--rw-r-----   1 userName alternc       560 Aug 22 03:47 test2\r\n";

    var unixEntries2 = [
      {
        //line: "-rw-r--r--   1 mrclash  pg223090      260 Mar 25  2008 .alias",
        type: 0,
        size: 460,
        name: "test1",
        time: +new Date("Aug 22 03:45 " + new Date().getFullYear()),
        owner: "userName",
        group: "alternc",

        userReadPerm: true,
        userWritePerm: true,
        userExecPerm: false,

        groupReadPerm: true,
        groupWritePerm: false,
        groupExecPerm: false,

        otherReadPerm: false,
        otherWritePerm: false,
        otherExecPerm: false
      },
      {
        //line: "-rw-r--r--   1 mrclash  pg223090      260 Mar 25  2008 .alias",
        type: 0,
        size: 560,
        name: "test2",
        time: +new Date("Aug 22 03:47 " + new Date().getFullYear()),
        owner: "userName",
        group: "alternc",

        userReadPerm: true,
        userWritePerm: true,
        userExecPerm: false,

        groupReadPerm: true,
        groupWritePerm: false,
        groupExecPerm: false,

        otherReadPerm: false,
        otherWritePerm: false,
        otherExecPerm: false
      }
    ];

    Parser.parseEntries(str, function(err, entryArray) {
      entryArray.forEach(function(entry, i) {
        assert.equal(unixEntries[i].type, entry.type);
        assert.equal(unixEntries[i].size, entry.size);
        assert.equal(unixEntries[i].name, entry.name);
        //assert.equal(unixEntries[i].time, entry.time);
        assert.equal(unixEntries[i].owner, entry.owner);
        assert.equal(unixEntries[i].group, entry.group);

        assert.equal(unixEntries[i].userReadPerm, entry.userPermissions.read);
        assert.equal(unixEntries[i].userWritePerm, entry.userPermissions.write);
        assert.equal(unixEntries[i].userExecPerm, entry.userPermissions.exec);

        assert.equal(unixEntries[i].groupReadPerm, entry.groupPermissions.read);
        assert.equal(unixEntries[i].groupWritePerm, entry.groupPermissions.write);
        assert.equal(unixEntries[i].groupExecPerm, entry.groupPermissions.exec);

        assert.equal(unixEntries[i].otherReadPerm, entry.otherPermissions.read);
        assert.equal(unixEntries[i].otherWritePerm, entry.otherPermissions.write);
        assert.equal(unixEntries[i].otherExecPerm, entry.otherPermissions.exec);
      });
    });

    Parser.parseEntries(str2, function(err, entryArray) {
      entryArray.forEach(function(entry, i) {
        assert.equal(unixEntries2[i].type, entry.type);
        assert.equal(unixEntries2[i].size, entry.size);
        assert.equal(unixEntries2[i].name, entry.name);
        //assert.equal(unixEntries2[i].time, entry.time);
        assert.equal(unixEntries2[i].owner, entry.owner);
        assert.equal(unixEntries2[i].group, entry.group);

        assert.equal(unixEntries2[i].userReadPerm, entry.userPermissions.read);
        assert.equal(unixEntries2[i].userWritePerm, entry.userPermissions.write);
        assert.equal(unixEntries2[i].userExecPerm, entry.userPermissions.exec);

        assert.equal(unixEntries2[i].groupReadPerm, entry.groupPermissions.read);
        assert.equal(unixEntries2[i].groupWritePerm, entry.groupPermissions.write);
        assert.equal(unixEntries2[i].groupExecPerm, entry.groupPermissions.exec);

        assert.equal(unixEntries2[i].otherReadPerm, entry.otherPermissions.read);
        assert.equal(unixEntries2[i].otherWritePerm, entry.otherPermissions.write);
        assert.equal(unixEntries2[i].otherExecPerm, entry.otherPermissions.exec);
      });
    })
  });


  it("test ftp windows/DOS LIST responses", function() {
    var dosEntries = [
      {
        line: '04-27-00  09:09PM       <DIR>          licensed',
        type: 1,
        size: 0,
        time: +(new Date("04-27-00  09:09 PM")),
        name: 'licensed',
      },
      {
        line: '11-18-03  10:16AM       <DIR>          pub',
        type: 1,
        size: 0,
        time: +(new Date("11-18-03  10:16 AM")),
        name: 'pub',
      },
      {
        line: '04-14-99  03:47PM                  589 readme.htm',
        type: 0,
        size: 589,
        time: +(new Date("04-14-99  03:47 PM")),
        name: 'readme.htm'
      }
    ];

    dosEntries.forEach(function(entry) {
      var result = Parser.parseEntry(entry.line);

      assert.equal(result.type, entry.type);
      assert.equal(result.size, entry.size);
      assert.equal(result.name, entry.name);
      assert.equal(result.time, entry.time);
    });
  });

  it("test truncated listing", function() {
    var truncated = "\
drwxr-xr-x   33 0        0            4096 Nov 28 01:19 .\r\n\
drwxr-xr-x   33 0        0            4096 Nov 28 01:19 ..\r\n\
-rwxr-xr-x   1 mrclash  pg223090 68491314 Jan 22  2009 Documents.zip\r\n\
drwxr-xr-x    3 0        0            4096 Apr 16  2011 bourd\n\
arie\r\n\
drwxr-xr-x    2 0        0            4096 Apr 16  2011 denton\r\n\
drwx------    2 0        0            4096 Apr 16  2011 lost+found\r\n"

    var unixEntries = [
      {
        type: 0,
        size: 68491314,
        name: "Documents.zip",
        time: +new Date("Jan 22  2009"),
        owner: "mrclash",
        group: "pg223090",

        userReadPerm: true,
        userWritePerm: true,
        userExecPerm: true,

        groupReadPerm: true,
        groupWritePerm: false,
        groupExecPerm: true,

        otherReadPerm: true,
        otherWritePerm: false,
        otherExecPerm: true
      },
      {
        type: 1,
        size: 4096,
        name: "bourdarie",
        time: +new Date("Apr 16  2011"),
        owner: "0",
        group: "0",

        userReadPerm: true,
        userWritePerm: true,
        userExecPerm: true,

        groupReadPerm: true,
        groupWritePerm: false,
        groupExecPerm: true,

        otherReadPerm: true,
        otherWritePerm: false,
        otherExecPerm: true
      },
      {
        type: 1,
        size: 4096,
        name: "denton",
        time: +new Date("Apr 16  2011"),
        owner: "0",
        group: "0",

        userReadPerm: true,
        userWritePerm: true,
        userExecPerm: true,

        groupReadPerm: true,
        groupWritePerm: false,
        groupExecPerm: true,

        otherReadPerm: true,
        otherWritePerm: false,
        otherExecPerm: true
      },
      {
        type: 1,
        size: 4096,
        name: "lost+found",
        time: +new Date("Apr 16  2011"),
        owner: "0",
        group: "0",

        userReadPerm: true,
        userWritePerm: true,
        userExecPerm: true,

        groupReadPerm: false,
        groupWritePerm: false,
        groupExecPerm: false,

        otherReadPerm: false,
        otherWritePerm: false,
        otherExecPerm: false
      }
    ];

    Parser.parseEntries(truncated, function(err, entryArray) {
      entryArray.forEach(function(entry, i) {
        assert.equal(unixEntries[i].type, entry.type);
        assert.equal(unixEntries[i].size, entry.size);
        assert.equal(unixEntries[i].name, entry.name);
        //assert.equal(unixEntries[i].time, entry.time);
        assert.equal(unixEntries[i].owner, entry.owner);
        assert.equal(unixEntries[i].group, entry.group);

        assert.equal(unixEntries[i].userReadPerm, entry.userPermissions.read);
        assert.equal(unixEntries[i].userWritePerm, entry.userPermissions.write);
        assert.equal(unixEntries[i].userExecPerm, entry.userPermissions.exec);

        assert.equal(unixEntries[i].groupReadPerm, entry.groupPermissions.read);
        assert.equal(unixEntries[i].groupWritePerm, entry.groupPermissions.write);
        assert.equal(unixEntries[i].groupExecPerm, entry.groupPermissions.exec);

        assert.equal(unixEntries[i].otherReadPerm, entry.otherPermissions.read);
        assert.equal(unixEntries[i].otherWritePerm, entry.otherPermissions.write);
        assert.equal(unixEntries[i].otherExecPerm, entry.otherPermissions.exec);
      });
    });
  });


  /*
   * We are not supporting MLSx commands yet
   *
   * http://rfc-ref.org/RFC-TEXTS/3659/chapter7.html
   * http://www.rhinosoft.com/newsletter/NewsL2005-07-06.asp?prod=rs
   *
   "test parse MLSD command lines" : function(next) {
   var lines = [
   {
   line: "Type=file;Size=17709913;Modify=20050502182143; Choices.mp3",
   Type: "file",
   Size: "17709913",
   Modify: "20050502182143",
   name: "Choices.mp3"
   },
   {
   line: "Type=cdir;Perm=el;Unique=keVO1+ZF4; test",
   type: "file",
   perm: "el",

   },
   {
   line: "Type=pdir;Perm=e;Unique=keVO1+d?3; .."
   }
   ];




   //"Type=cdir;Perm=el;Unique=keVO1+ZF4; test",
   //"Type=pdir;Perm=e;Unique=keVO1+d?3; ..",
   //"Type=OS.unix=slink:/foobar;Perm=;Unique=keVO1+4G4; foobar",
   //"Type=OS.unix=chr-13/29;Perm=;Unique=keVO1+5G4; device",
   //"Type=OS.unix=blk-11/108;Perm=;Unique=keVO1+6G4; block",
   //"Type=file;Perm=awr;Unique=keVO1+8G4; writable",
   //"Type=dir;Perm=cpmel;Unique=keVO1+7G4; promiscuous",
   //"Type=dir;Perm=;Unique=keVO1+1t2; no-exec",
   //"Type=file;Perm=r;Unique=keVO1+EG4; two words",
   //"Type=file;Perm=r;Unique=keVO1+IH4;  leading space",
   //"Type=file;Perm=r;Unique=keVO1+1G4; file1",
   //"Type=dir;Perm=cpmel;Unique=keVO1+7G4; incoming",
   //"Type=file;Perm=r;Unique=keVO1+1G4; file2",
   //"Type=file;Perm=r;Unique=keVO1+1G4; file3",
   //"Type=file;Perm=r;Unique=keVO1+1G4; file4",

   var parsed = Parser.parseMList(line);

   assert.equal("file", parsed.Type);
   assert.equal("17709913", parsed.Size);
   assert.equal("20050502182143", parsed.Modify);
   assert.equal("Choices.mp3", parsed.name);
   next();
   }
   */
});


