'use strict';

/* global require, exports, Promise */

const { Cc, Ci, Cu} = require('chrome');
Cu.import('resource://gre/modules/FileUtils.jsm');
Cu.import('resource://gre/modules/Services.jsm');
Cu.import('resource://gre/modules/Downloads.jsm');
Cu.import('resource://gre/modules/Promise.jsm');

var utils = require('./utils');
var dm = require('./download-manager');
var config;
var gaiaDir;
var stageDir;
var AMO_URL =
  'https://services.addons.mozilla.org/en-US/firefox/api/1.5/addon/';

function logLine(msg) {
  utils.log('additional-extensions', msg);
}

var InstallationManager = {

  // utils.processEvents tends to end thread earlier than
  // the time we start downloading extensions,
  // because we asynchonously get correct urls to download from.
  // So we add this flag to prevent thread ended too early.
  _processing: false,

  _onTheFly: [],

  _downloadedExtensions: {},

  _callbacksOnAllFinished: [],

  _removeUrl: function im_remove_url(url) {
    var index = this._onTheFly.indexOf(url);
    if (index > -1) {
      this._onTheFly.splice(index, 1);
    }

    if (this._onTheFly.length > 0) {
      this._processing = true;
    } else {
      while (this._callbacksOnAllFinished.length > 0) {
        var cb = this._callbacksOnAllFinished.pop();
        cb(this._downloadedExtensions);
      }
      this._processing = false;
    }
  },

  _getExtensionIdFromInstallRdf:
      function im_get_extension_id_from_install_rdf(doc) {
    var elementsOfNameOfEmId = doc.getElementsByTagName('em:id');
    var result;
    var index = 0;
    var elem;
    for (index = 0; index < elementsOfNameOfEmId.length; index += 1) {
      elem = elementsOfNameOfEmId[index];
      if (elem.parentNode && elem.parentNode.tagName === 'Description') {
        result = elem.innerHTML;
        break;
      }
    }
    if (!result) {
      throw new Error('No extension ID found');
    } else {
      return result;
    }
  },

  _getUnpackFromInstallRdf: function im_get_unpack_from_install_rdf(doc) {
    var elems = doc.getElementsByTagName('em:unpack');
    var result = false;
    if (elems && elems.length > 0) {
      result = doc.getElementsByTagName('em:unpack')[0].innerHTML === 'true';
    }
    return result;
  },

  _installFromUrl: function im_install_from_url(sourceUrl, filePath) {
    var zipReader;
    var file;
    var sourceFileName;
    var sourceUrlTokens;
    var extractedDir;
    var installRdf;
    var installRdfContent;
    var extensionId;
    var unpack;
    var entryEnumerator;
    var extensionDir;

    sourceUrlTokens = sourceUrl.split('/');
    sourceFileName = sourceUrlTokens[sourceUrlTokens.length - 1];
    zipReader =
      Cc['@mozilla.org/libjar/zip-reader;1'].createInstance(Ci.nsIZipReader);
    file = utils.getFile(filePath);
    zipReader.open(file);
    extractedDir = utils.getTempFolder(sourceFileName);
    installRdf = utils.getFile(extractedDir.path, 'install.rdf');

    // peek install.rdf and look for what we need: extionsion id and unpack
    zipReader.extract('install.rdf', installRdf);
    installRdfContent = utils.getXML(installRdf);
    extensionId =
      InstallationManager._getExtensionIdFromInstallRdf(installRdfContent);
    unpack =
      InstallationManager._getUnpackFromInstallRdf(installRdfContent);

    if (unpack) {
      // case 1: extract content of xpi file to
      // build_stage/additional-extensions/<extensionId>/
      extensionDir =
        utils.getFile(stageDir, 'additional-extensions', extensionId);
      utils.ensureFolderExists(extensionDir);
      entryEnumerator = zipReader.findEntries('*');
      while (entryEnumerator.hasMore()) {
        try {
          var zipEntryName = entryEnumerator.getNext();
          var zipEntry = zipReader.getEntry(zipEntryName);
          var targetFile = utils.getFile(
            stageDir, 'additional-extensions', extensionId, zipEntryName);
          var targetFileType = zipEntry.isDirectory ?
              Ci.nsIFile.DIRECTORY_TYPE : Ci.nsIFile.NORMAL_FILE_TYPE;
          if (!targetFile.exists()) {
            targetFile.create(targetFileType, parseInt('0644', 8));
            zipReader.extract(zipEntryName, targetFile);
          }
        } catch (e) {
          logLine('Error extracting ' + zipEntryName + ' due to ' + e.message);
        }
      }
    } else {
      // case 2: put xpi file directly at build+stage/additional-extensions
      extensionDir = utils.getFile(stageDir, 'additional-extensions');
      utils.ensureFolderExists(extensionDir);
      file.copyTo(extensionDir, extensionId + '.xpi');
    }
    logLine(sourceUrl + ' downloaded');
    zipReader.close();
    InstallationManager.finish(sourceUrl);
  },

  init: function im_init(downloadedExtensions) {
    if (downloadedExtensions) {
      this._downloadedExtensions = downloadedExtensions;
    }
    this._processing = true;
  },

  startInstalling: function im_start_installing(url) {
    var self = this;
    if (self._onTheFly.indexOf(url) < 0) {
      self._onTheFly.push(url);
    }
    dm.getDownloadManager().download(
      url, null, null, self._installFromUrl,
      function(url) {
        logLine('error downloading ' + url);
        self.failOrCancel(url);
      });
  },

  failOrCancel: function im_failOrCancel() {
    this._removeUrl();
  },

  finish: function im_finish(url) {
    this._downloadedExtensions[url] = 'done';
    this._removeUrl(url);
  },

  whenAllFinished: function im_when_all_finished(callback) {
    if (callback && typeof callback === 'function') {
      this._callbacksOnAllFinished.push(callback);
    }
  },

  isBusy: function im_is_busy() {
    return this.howManyAreOnTheFly() > 0 ||
      dm.getDownloadManager().count > 0 ||
      this._processing;
  },

  howManyAreOnTheFly: function im_how_many_are_on_the_fly() {
    return this._onTheFly.length;
  }
};

var AdditionalExtensions = (function() {
  // utility to merge two extensions objects (both in JSON format)
  // if extensions1 and extensions2 both have a property with
  // the same name, use the one in extensions2
  function merge(extensions1, extensions2) {
    var result = extensions1 || {};
    Object.keys(extensions2).forEach(function(key) {
      result[key] = extensions2[key];
    });
    return result;
  }

  function loadDownloadedExtensions() {
    var file;
    var downloadedExtensions;
    logLine('load downloaded extensions');
    try {
      file = utils.getFile(
        stageDir, 'additional-extensions', 'downloaded.json');
      downloadedExtensions = utils.getJSON(file);
    } catch (e) {
      downloadedExtensions = {};
    }
    return downloadedExtensions;
  }

  function loadCustomExtensions() {
    var file;
    var customExtensions;
    logLine('load custom extensions');
    try {
      file = utils.getFile(gaiaDir, 'build', 'config',
        'custom-extensions.json');
      customExtensions = utils.getJSON(file);
    } catch (e) {
      customExtensions = {};
    }
    return customExtensions;
  }

  function loadAdditionalExtensions() {
    var file;
    var additionalExtensions;
    logLine('load additional extensions');
    try {
      file = utils.getFile(gaiaDir, 'build', 'config',
        'additional-extensions.json');
      additionalExtensions = utils.getJSON(file);
    } catch (e) {
      additionalExtensions = {};
    }
    return additionalExtensions;
  }

  function writeDownloadedExtensions(downloaded) {
    var dir;
    var file;
    var content;
    // output as an array (it's the original design of additional-extensions.py)
    content = JSON.stringify(Object.keys(downloaded), undefined, 2);
    dir = utils.getFile(stageDir, 'additional-extensions');
    utils.ensureFolderExists(dir);
    file = utils.getFile(stageDir, 'additional-extensions', 'downloaded.json');
    utils.writeContent(file, content);
  }

  function getExtensionUrl(extension) {
    var deferred = Promise.defer();
    var url;
    try {
      url = extension.url;
      if (url) {
        deferred.resolve(url);
      } else {
        getUrlFromAMO(extension.amo).then(function(amoUrl) {
          deferred.resolve(amoUrl);
        });
      }
    } catch (e) {
      deferred.reject(e);
    }
    return deferred.promise;
  }

  function getUrlFromAMO(amoId) {
    var deferred = Promise.defer();
    function extractDownloadUrlFromAMO(sourceUrl, filePath) {
      var xmlDoc;
      var elems;
      try {
        xmlDoc = utils.getXML(utils.getFile(filePath));
        elems = xmlDoc.getElementsByTagName('install');
        deferred.resolve(elems[0].innerHTML);
      } catch (e) {
        deferred.reject(e);
      }
    }

    dm.getDownloadManager().download(AMO_URL + amoId,
      null,
      null,
      extractDownloadUrlFromAMO,
      function() {
        deferred.reject('No Download URL found for AMO ID: ' + amoId);
      });
    return deferred.promise;
  }

  // main function
  function execute(options) {
    logLine(JSON.stringify(options, null, '  '));
    config = options;
    gaiaDir = config.GAIA_DIR;
    stageDir = config.STAGE_DIR;
    var extensions;
    var downloadedExtensions;
    var keys;

    function downloadAndInstall(url) {
      try {
        if (downloadedExtensions && downloadedExtensions[url]) {
          logLine(' already downloaded');
        } else {
          logLine('download from ' + url);
          InstallationManager.startInstalling(url);
        }
      } catch (e) {
        InstallationManager.failOrCancel(url);
        logLine(' failed');
      }
    }

    downloadedExtensions = loadDownloadedExtensions();
    extensions = merge(loadAdditionalExtensions(), loadCustomExtensions());

    InstallationManager.init(downloadedExtensions);
    InstallationManager.whenAllFinished(function(exts) {
      writeDownloadedExtensions(exts);
    });

    keys = Object.keys(extensions);
    if (keys.length > 0) {
      keys.forEach(function(prop) {
        logLine('Installing ' + prop + '...');
        getExtensionUrl(extensions[prop]).then(downloadAndInstall);
      });
    } else {
      InstallationManager.failOrCancel();
    }

    utils.processEvents(function exitFunc() {
      return {
        wait: InstallationManager.isBusy()
      };
    });
  }

  return {
    execute: execute
  };
}());

exports.execute = AdditionalExtensions.execute;
