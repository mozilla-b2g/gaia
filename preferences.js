
const { 'classes': Cc, 'interfaces': Ci, 'results': Cr, } = Components;

function getDirectories() {
  let appsDir = Cc["@mozilla.org/file/local;1"]
               .createInstance(Ci.nsILocalFile);
  appsDir.initWithPath(GAIA_DIR);  
  appsDir.append('apps');

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

  let converterStream = Cc["@mozilla.org/intl/converter-input-stream;1"]
                          .createInstance(Ci.nsIConverterInputStream);
  converterStream.init(fileStream, "utf-8", fileStream.available(),
                       Ci.nsIConverterInputStream.DEFAULT_REPLACEMENT_CHARACTER);

  let out = {};  
  let count = fileStream.available();
  converterStream.readString(count, out);  

  let content = out.value;  
  converterStream.close();  
  fileStream.close();

  return [content, count];
}

function getJSON(dir, name) {
  let file = Cc["@mozilla.org/file/local;1"]
               .createInstance(Ci.nsILocalFile);
  file.initWithPath(GAIA_DIR);
  file.append('apps');
  file.append(dir);
  file.append(name);

  if (!file.exists())
    return null;

  let [content, length] = getFileContent(file);
  return JSON.parse(content);
}

let prefNames = {
  "dom.power.whitelist": "power",
  "dom.sms.whitelist": "sms",
  "dom.mozContacts.whitelist": "contacts",
  "dom.telephone.app.phone.url": "telephony",
  "dom.mozScreenWhiteList": "screen"
};

let webapps = getJSON(".", "webapps.json");
if (webapps) {
  let permissions = {};

  let directories = getDirectories();
  directories.forEach(function readManifests(dir) {
    let manifest = getJSON(dir, "manifest.json");
    let webapp = webapps[dir];
    if (!manifest || !webapp)
      return;

    if (manifest.permissions) {
      permissions[webapp.origin] = manifest.permissions;
      print (webapp.origin + " -> " + manifest.permissions);
    }
  });
}


