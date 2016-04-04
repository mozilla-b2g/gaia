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

var utils = require('./utils');
var path = require('path');
var childProcess = require('child_process');
var fs = require('fs-extra');
var JSZip = require('jszip');
var os = require('os');
var vm = require('vm');
var http = require('http');
var https = require('https');
var url = require('url');
var dive = require('diveSync');
var nodeUUID = require('node-uuid');
var jsdom = require('jsdom');
var esprima = require('esprima');
var procRunning = require('is-running');
var mime = require('mime');
var crypto = require('crypto');
var request = require('request');

// Our gecko will transfer .opus file to audio/ogg datauri type.
mime.define({'audio/ogg': ['opus']});

module.exports = {

  scriptParser: esprima.parse,

  log: function() {
    var args = Array.prototype.slice.call(arguments);
    if (!args.length) {
      console.log('\n');
      return;
    }
    console.log('[' + args[0] + '] ' + args.slice(1).join(' '));
  },

  stdout: function(output) {
    console.log(output);
  },

  normalizePath: function(string) {
    return path.normalize(string);
  },

  joinPath: function() {
    return path.join.apply(path, arguments);
  },

  getOsType: function() {
    var type = os.type();
    return type === 'Windows_NT' ? 'WINNT' : type;
  },

  relativePath: function(from, to) {
    return path.relative(from, to);
  },

  getFile: function() {
    var self = module.exports;
    var args = Array.prototype.slice.call(arguments);
    var src = path.join.apply(path, args);
    src = path.resolve(src);
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
        return self.fileExists(src);
      },
      remove: function() {
        fs.removeSync(src);
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
    if (typeof file === 'string') {
      file = this.getFile(file);
    }
    if (file.exists() && file.isFile()) {
      return fs.readFileSync(file.path, { encoding: type || 'utf8' });
    }
  },

  Commander: function(cmd) {
    this.initPath = function() {};
    this.run = function(args, callback, options) {
      var cmds = args.join(' ');

      // In *nix and OSX version commands are run via sh -c YOUR_COMMAND,
      // but in Windows commands are run via cmd /C YOUR_COMMAND,
      // so, we just let execSync module to handle the difference.
      if (cmd === 'sh') {
        cmds = cmds.replace(/^-c/, '');
      } else {
        cmds = cmd + ' ' + cmds;
      }
      // XXX: Most cmds should run synchronously, we should use either promise
      //      pattern inside each script or find a sync module which doesn't
      //      require recompile again since TPBL doesn't support that.
      return new Promise(function(resolve, reject) {
        var proc = childProcess.exec(cmds, { maxBuffer: (4096 * 1024) },
          function(err, stdout, stderr) {
            if (err) {
              options && options.stderr && options.stderr(stderr);
              reject();
            } else {
              options && options.stdout && options.stdout(stdout);
              callback && callback(stdout);
              resolve();
            }
        });
        proc.stdout.on('data', (data) => {
          process.stdout.write(data);
        });
        proc.stderr.on('data', (data) => {
          process.stderr.write(data);
        });
      });
    };

    this.runWithSubprocess = function(args, options) {
      this.run(args, null, options);
    };
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
      '-e', 'require("' + module + '").execute(' +
        JSON.stringify(appOptions).replace(/\\/g, '\\\\') + ');'
    ];

    return new Promise((resolve, reject) => {
      var proc = childProcess.spawn('node', args, { cwd: __dirname });
      proc.stdout.on('data', (data) => {
        process.stdout.write(data);
      });
      proc.stderr.on('data', (data) => {
        process.stderr.write(data);
      });
      proc.on('exit', (code) => {
        this.exitCode = code;
        resolve(code);
      });
    });
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
    return 'data:' + mime.lookup(file.path) + ';base64,' + data;
  },

  getZip: function() {
    var zip = new JSZip();
    var zipPath;
    var self = this;

    return {
      load: function(zipFile) {
        zipPath = zipFile;
        if (self.fileExists(zipFile)) {
          try {
            zip.load(fs.readFileSync(zipFile));
          } catch (err) {
            console.error(err);
          }
        }
      },

      file: function(name, file, options) {
        try {
          if (!file) {
            let output = zip.file(name);
            return output && output.asText();
          } else {
            return zip.file(name, fs.readFileSync(file.path), options);
          }
        } catch (err) {
          console.error(err);
        }
      },

      entries: function() {
        return Object.keys(zip.files);
      },

      extract: function(entry, dest) {
        try {
          var zipFile = zip.file(entry);
          if (zipFile && !zipFile.dir) {
            fs.outputFileSync(dest, zipFile.asNodeBuffer());
          }
        } catch (err) {
          console.error(err);
        }
      },

      close: function() {
        try {
          fs.outputFileSync(zipPath, zip.generate({ type: 'nodebuffer' }));
        } catch (err) {
          console.error(err);
        }
      }
    };
  },

  getJSON: function(file) {
    var content = this.getFileContent(file);
    try {
      return JSON.parse(content);
    } catch (error) {
      console.error('Invalid JSON file : ' + file.path);
      if (content) {
        console.error('Content of JSON file:\n' + content);
      }
      throw error;
    }
  },

  getDocument: function(content) {
    return jsdom.jsdom(content);
  },

  getXML: function(file) {
    return jsdom.jsdom(this.getFileContent(file));
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

  ls: function(dir, recursive, includeDir) {
    var files = [];
    if (!dir || !dir.exists()) {
      return [];
    }
    dive(dir.path, { recursive: recursive, directories: includeDir },
      function(err, filePath) {
        if (err) {
          // Skip error
          return;
        }
        files.push(this.getFile(filePath));
      }.bind(this));
    return files;
  },

  download: function(fileUrl, dest, doneCallback, errorCallback) {
    dest = dest || this.joinPath(this.getTempFolder('gaia').path,
                                 (new Date()).getTime() + '.tmp');

    var file = fs.createWriteStream(dest);
    file.on('finish', function() {
      doneCallback && doneCallback(fileUrl, dest);
    });

    request
      .get(fileUrl, function(error, response) {
        if (error && response.statusCode !== 200) {
          errorCallback && errorCallback(fileUrl, dest);
        }
      })
      .pipe(file);
  },

  downloadJSON: function(fileUrl, callback) {
    var protocol = url.parse(fileUrl).protocol;
    var request = (protocol === 'http:') ? http : https;
    request.get(fileUrl, function(res) {
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

  readJSONFromPath: function(path) {
    return require(path);
  },

  concatenatedScripts: function(scriptsPaths, targetPath) {
    var concatedScript = scriptsPaths.map(function(path) {
      return this.getFileContent(this.getFile(path));
    }, this).join('\n');

    var targetFile = this.getFile(targetPath);

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

    let manifestFile = this.joinPath(appDir.path, 'manifest.webapp');
    let updateFile = this.joinPath(appDir.path, 'update.webapp');

    // Ignore directories without manifest
    if (!this.fileExists(manifestFile) && !this.fileExists(updateFile)) {
      return;
    }

    let manifest = this.fileExists(manifestFile) ? manifestFile : updateFile;
    let manifestJSON = this.getJSON(this.getFile(manifest));

    // Use the folder name as the the domain name
    let appDomain = appDir.leafName;
    if (manifestJSON.origin) {
      appDomain = this.getNewURI(manifestJSON.origin).host;
    }

    let self = this;
    let webapp = {
      appDirPath: appDir.path,
      manifest: manifestJSON,
      manifestFilePath: manifest,
      url: config.GAIA_SCHEME + appDomain,
      domain: appDomain,
      sourceDirectoryFilePath: appDir.path,
      sourceDirectoryName: appDir.leafName,
      sourceAppDirectoryName: self.getFile(appDir.path, '..').leafName
    };

    // External webapps have a `metadata.json` file
    let metaData = this.getFile(webapp.sourceDirectoryFilePath,
      'metadata.json');
    if (metaData.exists()) {
      let zip = this.getZip();
      zip.load(this.joinPath(webapp.sourceDirectoryFilePath,
                             'application.zip'));
      webapp.pckManifest = JSON.parse(zip.file('manifest.webapp'));
      webapp.metaData = this.getJSON(metaData);
      webapp.appStatus = utils.getAppStatus(
        webapp.metaData.type ||
        (webapp.pckManifest && webapp.pckManifest.type) ||
        'web'
      );
    } else {
      webapp.appStatus = utils.getAppStatus(webapp.manifest.type);
    }

    // Some webapps control their own build
    webapp.buildDirectoryFilePath = this.joinPath(config.STAGE_DIR,
      webapp.sourceDirectoryName);
    webapp.buildManifestFilePath = this.joinPath(webapp.buildDirectoryFilePath,
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
        var uuid = mapping[webapp.sourceDirectoryName] ||
          '{' + nodeUUID.v4() + '}';
        mapping[webapp.sourceDirectoryName] = webappTargetDirName = uuid;
      }
    } else {
      webappTargetDirName = webapp.domain;
    }
    webapp.profileDirectoryFilePath = this.joinPath(config.COREWEBAPPS_DIR,
                                                    'apps',
                                                    webappTargetDirName);

    return webapp;
  },

  getNewURI: function(uri) {
  console.log('node: getNewURI(', uri, ')\n');
    return {
      host: /[a-z]+:\/\/[@]?([^\/:]+)/.exec(uri)[1],
      prePath: /[a-z]+:\/\/[^\/]+/.exec(uri)[0],
      resolve: function(to) {
        return url.resolve(uri, to);
      }
    };
  },

  isExternalApp: function(webapp) {
    if (webapp.metaData && webapp.metaData.external === undefined) {
      throw new Error('"external" property in metadata.json is required ' +
        'since Firefox OS 2.1, please add it into metadata.json and update ' +
        'preload.py if you use this script to perload your apps. If you ' +
        'created metadata.json for non-external apps, please set "external" ' +
        'to false. metadata.json is in ' + webapp.sourceDirectoryFilePath);
    }
    if (!webapp.metaData || webapp.metaData.external === false) {
      return false;
    } else {
      return true;
    }
  },

  processEvents: function(exitResultFunc) {
    // FIXME: A fake blocking function for porting utils-xpc
    // This workaround will be removed once node.js migration is done
    var exitResult = exitResultFunc();
    if (exitResult.error) {
      throw exitResult.error;
    }
  },

  writeContent :function(file, content) {
    fs.writeFileSync(file.path, content);
  },

  getLocaleBasedir: function(src) {
    return os.type() === 'Windows_NT' ? src.replace('/', '\\', 'g') : src;
  },

  deleteFile: function(filePath) {
    fs.removeSync(filePath);
  },

  fileExists: function(path) {
    try {
      fs.accessSync(path);
      return true;
    } catch(err) {
      return false;
    }
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

  copyFileTo: function(filePath, toParent, name) {
    var file = ((typeof filePath === 'string') ?
      this.getFile(filePath) : filePath);
    fs.copySync(file.path, path.join(toParent, name));
  },

  copyDirTo: function(filePath, toParent, name) {
    var file = ((typeof filePath === 'string') ?
      this.getFile(filePath) : filePath);
    fs.copySync(file.path, path.join(toParent, name));
  },

  copyToStage: function(options) {
    var appDir = this.getFile(options.APP_DIR);
    this.copyDirTo(appDir, options.STAGE_DIR, appDir.leafName);
  },

  scriptLoader: {

    scripts: {},

    load: function(filePath, exportObj, withoutCache) {
      if (!withoutCache && this.scripts[filePath]) {
        return;
      }

      var doc = jsdom.jsdom();
      var win = doc.defaultView;

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
  },

  createSandbox: function() {
    return {};
  },

  runScriptInSandbox: function(filePath, sandbox) {
    var script = fs.readFileSync(filePath, { encoding: 'utf8' });
    return vm.runInNewContext(script, sandbox);
  },

  getHash: function(data, encoding, algorithm) {
    encoding = encoding || 'utf8';
    algorithm = algorithm || 'sha1';
    return crypto.createHash(algorithm).update(data, encoding).digest('hex');
  },

  exit: function(code) {
    process.exit(code);
  }

};
