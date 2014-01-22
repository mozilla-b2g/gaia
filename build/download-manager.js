/**
 * DownloadManager is a tool for downloading file from internet. This
 * implementation uses Downloads.jsm to do it. When downloads a https url which
 * uses self-signed certificate, DownloadManager fallbacks to "http" protocol to
 * download it.
 *
 */

var utils = require('./utils');

const { Cc, Ci, Cr, Cu } = require('chrome');
Cu.import('resource://gre/modules/FileUtils.jsm');
Cu.import('resource://gre/modules/Services.jsm');
Cu.import('resource://gre/modules/Downloads.jsm');

var DownloadManager = {
  debug: false,
  count: 0,
  download: function dm_download(url, targetFolder, targetName,
                                finishedCallback, errorCallback) {

    var tmpFile;
    var isTemp;
    var isHttps = url.substring(0, 5) === 'https';

    function logLine(msg) {
      if (DownloadManager.debug) {
        utils.log('download-manager', msg);
      }
    }

    function downloadFinished() {
      logLine(url + ' is successfully downloaded.');
      try {
        if (finishedCallback) {
          finishedCallback(url, tmpFile.path);
        }
      } finally {
        DownloadManager.count -= 1;
      }
    }

    function downloadError(reason) {
      try {
        if (isHttps) {
          // If we failed with https protocol, it may be self-signed
          // certificate. We fallback to use http protocol to download it.
          // XXX find a way to bypass the self-signed certificate error.
          var httpUrl = 'http' + url.substring(5);
          logLine('fallback to ' + httpUrl);
          DownloadManager.download(httpUrl, targetFolder, targetName,
                                   finishedCallback, errorCallback);
        } else if (errorCallback) {
          logLine('Unable to download ' + url + '\n' + reason);
          errorCallback(url, tmpFile.path);
        } else {
          logLine('Unable to download ' + url + '\n' + reason);
        }
      } finally {
        DownloadManager.count -= 1;
      }
    }

    // normalize file for saving.
    if (targetFolder && targetName) {
      isTemp = false;
      utils.ensureFolderExists(utils.getFile(targetFolder));
      tmpFile = utils.getFile(targetFolder, targetName);
    } else {
      isTemp = true;
      tmpFile = DownloadManager._getTempFolder('gaia').clone();
      tmpFile.append((new Date()).getTime() + '.tmp');
      tmpFile.createUnique(Ci.nsIFile.NORMAL_FILE_TYPE, parseInt('0644', 8));
    }

    DownloadManager.count += 1;
    Downloads.createDownload({
       source: url,
       target: tmpFile
    }).then(function(download) {
      download.source.isPrivate = true;  // don't add to history
      logLine('download for: ' + url + ' is placed.');
      download.start().then(downloadFinished, downloadError);
    }, downloadError);
  },
  // private functions and variables
  _tempFolder: null,
  _getTempFolder: function dm_get_temp_folder(name) {
    if (!DownloadManager._tempFolder) {
      var file = Cc['@mozilla.org/file/directory_service;1']
                   .getService(Ci.nsIProperties).get('TmpD', Ci.nsIFile);
      file.append(name);
      file.createUnique(Ci.nsIFile.DIRECTORY_TYPE, parseInt('0755', 8));
      DownloadManager._tempFolder = file;
    }
    return DownloadManager._tempFolder;
  }
};

exports.getDownloadManager = function() {
  return DownloadManager;
};
