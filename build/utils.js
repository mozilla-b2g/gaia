const { 'classes': Cc, 'interfaces': Ci, 'results': Cr, } = Components;

function getSubDirectories(directory) {
  let appsDir = Cc['@mozilla.org/file/local;1']
               .createInstance(Ci.nsILocalFile);
  appsDir.initWithPath(GAIA_DIR);
  appsDir.append(directory);

  let dirs = [];
  let files = appsDir.directoryEntries;
  while (files.hasMoreElements()) {
    let file = files.getNext().QueryInterface(Ci.nsILocalFile);
    if (file.isDirectory()) {
      dirs.push(file.leafName);
    }
  }
  return dirs;
}

function getFileContent(file) {
  let fileStream = Cc['@mozilla.org/network/file-input-stream;1']
                   .createInstance(Ci.nsIFileInputStream);
  fileStream.init(file, 1, 0, false);

  let converterStream = Cc['@mozilla.org/intl/converter-input-stream;1']
                          .createInstance(Ci.nsIConverterInputStream);
  converterStream.init(fileStream, 'utf-8', fileStream.available(),
                       Ci.nsIConverterInputStream.DEFAULT_REPLACEMENT_CHARACTER);

  let out = {};
  let count = fileStream.available();
  converterStream.readString(count, out);

  let content = out.value;
  converterStream.close();
  fileStream.close();

  return content;
}

function writeContent(file, content) {
  let stream = Cc['@mozilla.org/network/file-output-stream;1']
                   .createInstance(Ci.nsIFileOutputStream);
  stream.init(file, 0x02 | 0x08 | 0x20, 0666, 0);
  stream.write(content, content.length);
  stream.close();
}

// Return an nsIFile by joining paths given as arguments
// First path has to be an absolute one
function getFile() {
  let file = Cc['@mozilla.org/file/local;1'].createInstance(Ci.nsILocalFile);
  file.initWithPath(arguments[0]);
  if (arguments.length > 1) {
    for (let i = 1; i < arguments.length; i++) {
      file.append(arguments[i]);
    }
  }
  return file;
}

function getJSON(file) {
  let content = getFileContent(file);
  return JSON.parse(content);
}
