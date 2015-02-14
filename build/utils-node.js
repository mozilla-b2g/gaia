'use strict';

/**
 * This file contains all Node.js version of utils functions.
 * Since we're stil in the progress to migrate to Node.js, the
 * missing functions in this file should be in the 'utils-xpc.js'
 *
 * About documents:
 * Users can find comments in the 'utils-xpc.js',
 * which contains the complete functions used in 'utils.js'
 */

/* jshint node: true */

var utils = require('./utils.js');
var path = require('path');
var childProcess = require('child_process');
var fs = require('fs-extra');
var JSZip = require('jszip');
var Q = require('q');
var os = require('os');
var vm = require('vm');
var http = require('http');
var url = require('url');
var dive = require('diveSync');
var nodeUUID = require('node-uuid');
var jsdom = require('jsdom-nogyp').jsdom;
var esprima = require('esprima');
var procRunning = require('is-running');

module.exports = {

  Q: Q,

  scriptParser: esprima,

  log: function() {
    var args = Array.prototype.slice.call(arguments);
    if (!args.length) {
      console.log('\n');
      return;
    }
    console.log('[' + args[0] + '] ' + args.slice(1).join(' '));
  },

  joinPath: function() {
    var src = path.join.apply(path, arguments);
    return src;
  },

  getOsType: function() {
    var type = os.type();
    return type === 'Windows_NT' ? 'WINNT' : type;
  },

  relativePath: function(from, to) {
    return path.relative(from, to);
  },

  getFile: function() {
    var src = path.join.apply(path, arguments);
    var fileStat;
    try {
      fileStat = fs.statSync(src);
    } catch (e) {
      // In order to have compability with xpcshell interface,
      // we just simply let fileStat undefined and don't need
      // to do anything here.
    }
    return {
      exists: function() {
        return fs.accessSync(src);
      },
      remove: function() {
        fs.remove(src);
      },
      isDirectory: function() {
        return !!fileStat && fileStat.isDirectory();
      },
      isFile: function() {
        return !!fileStat && fileStat.isFile();
      },
      isHidden: function() {
        return /^\./.test(path.basename(src));
      },
      path: src,
      leafName: path.basename(src)
    };
  },

  getFileContent: function(file, type) {
    if (file.exists() && file.isFile()) {
      return fs.readFileSync(file.path, { encoding: type || 'utf8' });
    }
  },

  Commander: function(cmd) {
    this.initPath = function() {};
    this.run = function(args, callback) {
      var q = Q.defer();
      var cmds = args.join(' ');

      // In *nix and OSX version commands are run via sh -c YOUR_COMMAND,
      // but in Windows commands are run via cmd /C YOUR_COMMAND,
      // so, we just let execSync module to handle the difference.
      if (cmd === 'sh') {
        cmds = cmds.replace(/^-c/, '');
      } else {
        cmds = cmd + ' ' + cmds;
      }
      console.log(cmds);
      // XXX: Most cmds should run synchronously, we should use either promise
      //      pattern inside each script or find a sync module which doesn't
      //      require recompile again since TPBL doesn't support that.
      childProcess.exec(cmds, function(err, stdout) {
        if (err === null && typeof callback === 'function') {
          callback(stdout);
        }
        q.resolve();
      });
      return q.promise;
    };
  },

  readZipManifest: function(file) {
    var zipPath = this.joinPath(file.path, 'application.zip');
    if (!fs.accessSync(zipPath)) {
      return;
    }
    var manifest = new JSZip(fs.readFileSync(zipPath)).file('manifest.webapp');
    if (!manifest) {
      throw new Error('manifest.webapp not found in ' + zipPath);
    }
    return manifest.asText();
  },

  killAppByPid: function(appName) {
    childProcess.exec('adb shell b2g-ps', function(err, stdout) {
      if (!err && stdout) {
        var psMap = utils.psParser(stdout);
        if (psMap[appName] && psMap[appName].PID) {
          childProcess.exec('adb shell kill ' + psMap[appName].PID);
        }
      }
    });
  },

  spawnProcess: function(module, appOptions) {
    this.exitCode = null;
    var args = [
      '--harmony',
      '-e', 'require("' + module + '").execute("' + JSON.stringify(appOptions)
        .replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '");'
    ];
    var proc = childProcess.spawn('node', args);
    proc.on('close', function(code) {
      this.exitCode = code;
    }.bind(this));
    return proc;
  },

  processIsRunning: function(proc) {
    return procRunning(proc.pid);
  },

  getProcessExitCode: function() {
    return this.exitCode;
  },

  resolve: function(relativePath, gaiaDir) {
    var absPath;
    if (relativePath[0] === '/') {
      absPath = relativePath;
    } else {
      absPath = path.join(gaiaDir, relativePath);
    }
    return this.getFile(absPath);
  },

  getFileAsDataURI: function(file) {
    var data = this.getFileContent(file, 'base64');
    return new Buffer(data, 'binary').toString('base64');
  },

  getJSON: function(file) {
    var content = this.getFileContent(file);
    try {
      return JSON.parse(content);
    } catch (error) {
      console.log('Invalid JSON file : ' + file.path + '\n');
      if (content) {
        console.log('Content of JSON file:\n' + content + '\n');
      }
      throw error;
    }
  },

  getDocument: function(content) {
    return jsdom(content);
  },

  getXML: function(file) {
    return jsdom(this.getFileContent(file));
  },

  getEnv: function(name) {
    return process.env[name];
  },

  setEnv: function(name, value) {
    process.env[name] = value;
  },

  getEnvPath: function() {
    return process.env.PATH.split(path.delimiter);
  },

  getTempFolder: function(dirName) {
    var tmpPath = path.join(os.tmpdir(), dirName);
    fs.mkdirpSync(tmpPath);
    return this.getFile(tmpPath);
  },

  ensureFolderExists: function(file) {
    fs.mkdirpSync(file.path);
  },

  normalizeString: function(appname) {
    return appname.replace(' ', '-').toLowerCase().replace(/\W/g, '');
  },

  ls: function(dir, recursive, pattern, include) {
    var files = [];
    dive(dir.path, { recursive: recursive }, function(err, filePath) {
      if (err) {
        // Skip error
        return;
      }
      var file = this.getFile(filePath);
      if (!pattern || !(include ^ pattern.test(file.leafName))) {
        files.push(this.getFile(file));
      }
    }.bind(this));
    return files;
  },

  downloadJSON: function(url, callback) {
    http.get(url, function(res) {
      var body = '';
      res.on('data', function(chunk) {
        body += chunk;
      });
      res.on('end', function() {
        if (callback) {
          callback(JSON.parse(body));
        }
      });
    }).on('error', function(e) {
      throw new Error('Download JSON with error: ' + e);
    });
  },

  concatenatedScripts: function(scriptsPaths, targetPath) {
    var concatedScript = scriptsPaths.map(function(path) {
      return this.getFileContent(this.getFile(path));
    }, this).join('\n');

    var targetFile = this.getFile(targetPath);
    this.ensureFolderExists(targetFile.parent);
    this.writeContent(targetFile, concatedScript);
  },

  getDistributionFileContent: function(name, defaultContent, distDir) {
    if (distDir) {
      let distributionFile = this.getFile(distDir, name + '.json');
      if (distributionFile.exists()) {
        return this.getFileContent(distributionFile);
      }
    }
    return JSON.stringify(defaultContent, null, '  ');
  },

  getUUIDMapping: function(config) {
    var UUIDMapping = this.UUIDMapping;
    if (UUIDMapping) {
      return UUIDMapping;
    }
    this.UUIDMapping = UUIDMapping = {};
    // Try to retrieve it from $GAIA_DISTRIBUTION_DIR/uuid.json if exists.
    try {
      var uuidFile = this.getFile(config.GAIA_DISTRIBUTION_DIR, 'uuid.json');
      if (uuidFile.exists()) {
        console.log('uuid.json in GAIA_DISTRIBUTION_DIR found.');
        UUIDMapping = JSON.parse(this.getFileContent(uuidFile));
      }
    } catch (e) {
      // ignore exception if GAIA_DISTRIBUTION_DIR does not exist.
    }
    return UUIDMapping;
  },

  getWebapp: function(app, config) {
    let appDir = this.getFile(app);
    if (!appDir.exists()) {
      throw new Error(' -*- build/utils.js: file not found (' + app + ')\n');
    }

    let manifestFile = appDir.path + '/manifest.webapp';
    let updateFile = appDir.path + '/update.webapp';

    // Ignore directories without manifest
    if (!fs.accessSync(manifestFile) && !fs.accessSync(updateFile)) {
      return;
    }

    let manifest = fs.accessSync(manifestFile) ? manifestFile : updateFile;
    let manifestJSON = this.getJSON(this.getFile(manifest));

    // Use the folder name as the the domain name
    let appDomain = appDir.leafName + '.' + config.GAIA_DOMAIN;
    if (manifestJSON.origin) {
      appDomain = this.getNewURI(manifestJSON.origin).host;
    }

    let self = this;
    let webapp = {
      appDir: appDir,
      manifest: manifestJSON,
      manifestFile: self.getFile(manifest),
      url: config.GAIA_SCHEME + appDomain,
      domain: appDomain,
      sourceDirectoryFile: self.getFile(manifestFile, '..'),
      sourceDirectoryName: appDir.leafName,
      sourceAppDirectoryName: self.getFile(appDir.path, '..').leafName
    };

    // External webapps have a `metadata.json` file
    let metaData = this.getFile(webapp.sourceDirectoryFile.path,
      'metadata.json');
    if (metaData.exists()) {
      webapp.pckManifest = this.readZipManifest(webapp.sourceDirectoryFile);
      webapp.metaData = this.getJSON(metaData);
      webapp.appStatus = utils.getAppStatus(webapp.metaData.type || 'web');
    } else {
      webapp.appStatus = utils.getAppStatus(webapp.manifest.type);
    }

    // Some webapps control their own build
    webapp.buildDirectoryFile = this.getFile(config.STAGE_DIR,
      webapp.sourceDirectoryName);
    webapp.buildManifestFile = this.getFile(webapp.buildDirectoryFile.path,
      'manifest.webapp');

    // Generate the webapp folder name in the profile. Only if it's privileged
    // and it has an origin in its manifest file it'll be able to specify a
    // custom folder name. Otherwise, generate an UUID to use as folder name.
    var webappTargetDirName;
    if (this.isExternalApp(webapp)) {
      var type = webapp.appStatus;
      var isPackaged = false;
      if (webapp.pckManifest) {
        isPackaged = true;
        if (webapp.metaData.origin) {
          throw new Error('External webapp `' + webapp.sourceDirectoryName +
            '` can not have origin in metadata because is packaged');
        }
      }
      if (type === 2 && isPackaged && webapp.pckManifest.origin) {
        webappTargetDirName = this.getNewURI(webapp.pckManifest.origin).host;
      } else {
        // uuid is used for webapp directory name, save it for further usage
        let mapping = this.getUUIDMapping(config);
        var uuid = mapping[webapp.sourceDirectoryName] || nodeUUID.v4();
        mapping[webapp.sourceDirectoryName] = webappTargetDirName = uuid;
      }
    } else {
      webappTargetDirName = webapp.domain;
    }
    webapp.profileDirectoryFile = this.getFile(config.PROFILE_DIR, 'webapps',
      webappTargetDirName);

    return webapp;
  },

  getNewURI: function(uri) {
    return url.parse(uri);
  },

  isExternalApp: function(webapp) {
    if (webapp.metaData && webapp.metaData.external === undefined) {
      throw new Error('"external" property in metadata.json is required ' +
        'since Firefox OS 2.1, please add it into metadata.json and update ' +
        'preload.py if you use this script to perload your apps. If you ' +
        'created metadata.json for non-external apps, please set "external" ' +
        'to false. metadata.json is in ' + webapp.sourceDirectoryFile.path);
    }
    if (!webapp.metaData || webapp.metaData.external === false) {
      return false;
    } else {
      return true;
    }
  },

  processEvents: function() {

  },

  writeContent :function(file, content) {
    fs.writeFileSync(file.path, content);
  },

  createZip: function() {
    return new JSZip();
  },

  getCompression: function(type) {
    switch(type) {
      case 'none':
        return 'STORE';
      case 'best':
        return 'DEFLATE';
    }
  },

  addFileToZip: function(zip, zipPath, pathInZip, file, compression) {
    if (!file.exists()) {
      return;
    }

    zip.file(pathInZip, fs.readFileSync(file.path), {
      compression: compression || 'DEFLATE'
    });
  },

  closeZip: function(zip, zipPath) {
    fs.writeFileSync(zipPath, zip.generate({ type: 'nodebuffer' }));
  },

  getLocaleBasedir: function(src) {
    return os.type() === 'Windows_NT' ? src.replace('/', '\\', 'g') : src;
  },

  deleteFile: function(filePath) {
    fs.removeSync(filePath);
  },

  fileExists: function(path) {
    return fs.accessSync(path);
  },

  listFiles: function(path, type, recursive, exclude) {
    var file = (typeof path === 'string' ? this.getFile(path) : path);
    if (!file.isDirectory()) {
      throw new Error('The path is not a directory.');
    }
    var files = this.ls(file, recursive === true, exclude);
    var detectFunc = (type === 0 ? 'isFile' : 'isDirectory');
    // To return simple JavaScript type, We need to put the file path to the
    // array instead of nsIFile.
    var results = [];
    files.forEach(function(file) {
      if (file[detectFunc]()) {
        results.push(file.path);
      }
    });

    return results;
  },

  mkdirs: function(path) {
    fs.mkdirpSync(path);
  },

  dirname: function(filePath) {
    return path.dirname(filePath);
  },

  basename: function(filePath) {
    return path.basename(filePath);
  },

  existsInAppDirs: function(appDirs, appName) {
    var apps = appDirs.split(' ');
    var exists = apps.some(function (appPath) {
      let appFile = this.getFile(appPath);
      return (appName === appFile.leafName);
    }, this);
    return exists;
  },

  copyFileTo: function(filePath, toParent, name, recursive) {
    var file = ((typeof filePath === 'string') ?
      this.getFile(filePath) : filePath);
    fs.copySync(file.path, path.join(toParent, name), { recursive: recursive });
  },

  copyDirTo: function(filePath, toParent, name, recursive) {
    var file = ((typeof filePath === 'string') ?
      this.getFile(filePath) : filePath);
    fs.copySync(file.path, path.join(toParent, name), { recursive: recursive });
  },

  copyToStage: function(options) {
    var appDir = this.getFile(options.APP_DIR);
    this.copyDirTo(appDir, options.STAGE_DIR, appDir.leafName);
  },

  exit: function(code) {
    process.exit(code);
  },

  scriptLoader: {

    scripts: {},

    load: function(filePath, exportObj, withoutCache) {
      if (!withoutCache && this.scripts[filePath]) {
        return;
      }

      var win = jsdom().parentWindow;
      exportObj.Promise = Q;

      global.addEventListener = win.addEventListener;
      global.dispatchEvent = win.dispatchEvent;

      for (let key in exportObj) {
        global[key] = exportObj[key];
      }

      try {
        var script = fs.readFileSync(filePath, { encoding: 'utf8' });
        vm.runInThisContext(script, filePath);
        this.scripts[filePath] = true;
      } catch(error) {
        delete this.scripts[filePath];
        throw error;
      }
    }

  }

};
