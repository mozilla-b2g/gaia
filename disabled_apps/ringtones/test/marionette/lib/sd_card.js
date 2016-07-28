/* jshint node: true*/
/* exported injectTone */

'use strict';

var fs = require('fs');
var path = require('path');

function injectTone(client, details) {
  var BASE_DIRS = {
    'ringtone': 'Ringtones',
    'alerttone': 'Notifications'
  };
  if (!(details.type in BASE_DIRS)) {
    throw new Error('tone type not supported: ' + details.type);
  }

  var toneFolder = path.join(
    client.fileManager.deviceStorage.getDeviceStoragePath(),
    BASE_DIRS[details.type]
  );
  if (!fs.existsSync(toneFolder)) {
    fs.mkdirSync(toneFolder);
  }
  var musicFolder = path.join(toneFolder, 'music');
  if (!fs.existsSync(musicFolder)) {
    fs.mkdirSync(musicFolder);
  }
  client.fileManager.add([
    { type: path.join(BASE_DIRS[details.type], 'music'),
      filePath: details.filePath, filename: details.filename }
  ]);
}

module.exports = {injectTone: injectTone};
