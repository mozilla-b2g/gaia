
function debug(msg) {
  //dump('-*- webapps-zip.js ' + msg + '\n');
}

// Header values usefull for zip xpcom component
const PR_RDONLY = 0x01;
const PR_WRONLY = 0x02;
const PR_RDWR = 0x04;
const PR_CREATE_FILE = 0x08;
const PR_APPEND = 0x10;
const PR_TRUNCATE = 0x20;
const PR_SYNC = 0x40;
const PR_EXCL = 0x80;

function isSubjectToBranding(path) {
  return /shared\/[a-zA-Z]+\/branding$/.test(path) ||
         /branding\/initlogo.png/.test(path);
}

/**
 * Add a file or a directory, recursively, to a zip file
 *
 * @param {nsIZipWriter} zip       zip xpcom instance.
 * @param {String}       pathInZip relative path to use in zip.
 * @param {nsIFile}      file      file xpcom to add.
 */
function addToZip(zip, pathInZip, file) {
  // Branding specific code
  if (isSubjectToBranding(file.path)) {
    file.append((OFFICIAL == 1) ? 'official' : 'unofficial');
  }

  if (!file.exists())
    throw new Error('Can\'t add inexistent file to zip : ' + file.path);

  // nsIZipWriter should not receive any path starting with `/`,
  // it would put files in a folder with empty name...
  pathInZip = pathInZip.replace(/^\/+/, '');

  // Case 1/ Regular file
  if (file.isFile()) {
    try {
      debug(' +file to zip ' + pathInZip);

      if (!zip.hasEntry(pathInZip)) {
        zip.addEntryFile(pathInZip,
                        Ci.nsIZipWriter.COMPRESSION_DEFAULT,
                        file,
                        false);
      }
    } catch (e) {
      throw new Error('Unable to add following file in zip: ' +
                      file.path + '\n' + e);
    }
  }
  // Case 2/ Directory
  else if (file.isDirectory()) {
    debug(' +directory to zip ' + pathInZip);
    if (!zip.hasEntry(pathInZip))
      zip.addEntryDirectory(pathInZip, file.lastModifiedTime, false);

    // Append a `/` at end of relative path if it isn't already here
    if (pathInZip.substr(-1) !== '/')
      pathInZip += '/';

    let files = ls(file);
    files.forEach(function(subFile) {
        let subPath = pathInZip + subFile.leafName;
        addToZip(zip, subPath, subFile);
      });
  }
}

/**
 * Copy a "Building Block" (i.e. shared style resource)
 *
 * @param {nsIZipWriter} zip       zip xpcom instance.
 * @param {String}       blockName name of the building block to copy.
 * @param {String}       dirName   name of the shared directory to use.
 */
function copyBuildingBlock(zip, blockName, dirName) {
  let dirPath = '/shared/' + dirName + '/';

  // Compute the nsIFile for this shared style
  let styleFolder = Gaia.sharedFolder.clone();
  styleFolder.append(dirName);
  let cssFile = styleFolder.clone();
  if (!styleFolder.exists()) {
    throw new Error('Using inexistent shared style: ' + blockName);
  }

  cssFile.append(blockName + '.css');
  addToZip(zip, dirPath + blockName + '.css', cssFile);

  // Copy everything but index.html and any other HTML page into the
  // style/<block> folder.
  let subFolder = styleFolder.clone();
  subFolder.append(blockName);
  ls(subFolder, true).forEach(function(file) {
      let relativePath = file.getRelativeDescriptor(styleFolder);
      // Ignore HTML files at style root folder
      if (relativePath.match(/^[^\/]+\.html$/))
        return;
      // Do not process directory as `addToZip` will add files recursively
      if (file.isDirectory())
        return;
      addToZip(zip, dirPath + relativePath, file);
    });
}

let webappsTargetDir = Cc['@mozilla.org/file/local;1']
                         .createInstance(Ci.nsILocalFile);
webappsTargetDir.initWithPath(PROFILE_DIR);

// Create profile folder if doesn't exists
ensureFolderExists(webappsTargetDir);

// Create webapps folder if doesn't exists
webappsTargetDir.append('webapps');
ensureFolderExists(webappsTargetDir);

Gaia.webapps.forEach(function(webapp) {
  // If BUILD_APP_NAME isn't `*`, we only accept one webapp
  if (BUILD_APP_NAME != '*' && webapp.sourceDirectoryName != BUILD_APP_NAME)
    return;

  // Compute webapp folder name in profile
  let webappTargetDir = webappsTargetDir.clone();
  webappTargetDir.append(webapp.domain);
  ensureFolderExists(webappTargetDir);

  let zip = Cc['@mozilla.org/zipwriter;1'].createInstance(Ci.nsIZipWriter);

  let mode = PR_RDWR | PR_CREATE_FILE | PR_TRUNCATE;

  let zipFile = webappTargetDir.clone();
  zipFile.append('application.zip');
  zip.open(zipFile, mode);

  // Add webapp folder to the zip
  debug('# Create zip for: ' + webapp.domain);
  let files = ls(webapp.sourceDirectoryFile);
  files.forEach(function(file) {
      // Ignore files from /shared directory (these files were created by
      // Makefile code). Also ignore files in the /test directory.
      if (file.leafName !== 'shared' && file.leafName !== 'test')
        addToZip(zip, '/' + file.leafName, file);
    });

  // Put shared files, but copy only files actually used by the webapp.
  // We search for shared file usage by parsing webapp source code.
  let EXTENSIONS_WHITELIST = ['js', 'htm', 'html', 'css'];
  let SHARED_USAGE = /shared\/([^\/]+)\/([^''\s]+)("|')/g;

  let used = {
    js: [],              // List of JS file paths to copy
    locales: [],         // List of locale names to copy
    resources: [],       // List of resources to copy
    styles: [],          // List of stable style names to copy
    unstable_styles: []  // List of unstable style names to copy
  };

  let files = ls(webapp.sourceDirectoryFile, true);
  files.filter(function(file) {
      // Process only files that may require a shared file
      let extension = file.leafName
                          .substr(file.leafName.lastIndexOf('.') + 1)
                          .toLowerCase();
      return file.isFile() && EXTENSIONS_WHITELIST.indexOf(extension) != -1;
    }).
    forEach(function(file) {
      // Grep files to find shared/* usages
      let content = getFileContent(file);
      while ((matches = SHARED_USAGE.exec(content)) !== null) {
        let kind = matches[1]; // js | locales | resources | style
        let path = matches[2];
        switch (kind) {
          case 'js':
            if (used.js.indexOf(path) == -1)
              used.js.push(path);
            break;
          case 'locales':
            let localeName = path.substr(0, path.lastIndexOf('.'));
            if (used.locales.indexOf(localeName) == -1) {
              used.locales.push(localeName);
            }
            break;
          case 'resources':
            if (used.resources.indexOf(path) == -1) {
              used.resources.push(path);
            }
            break;
          case 'style':
            let styleName = path.substr(0, path.lastIndexOf('.'));
            if (used.styles.indexOf(styleName) == -1)
              used.styles.push(styleName);
            break;
          case 'style_unstable':
            let unstableStyleName = path.substr(0, path.lastIndexOf('.'));
            if (used.unstable_styles.indexOf(unstableStyleName) == -1)
              used.unstable_styles.push(unstableStyleName);
            break;
        }
      }
    });

  used.js.forEach(function(path) {
    // Compute the nsIFile for this shared JS file
    let file = Gaia.sharedFolder.clone();
    file.append('js');
    path.split('/').forEach(function(segment) {
      file.append(segment);
    });
    if (!file.exists()) {
      throw new Error('Using inexistent shared JS file: ' + path + ' from: ' +
                      webapp.domain);
    }
    addToZip(zip, '/shared/js/' + path, file);
  });

  used.locales.forEach(function(name) {
    // Compute the nsIFile for this shared locale
    let localeFolder = Gaia.sharedFolder.clone();
    localeFolder.append('locales');
    let ini = localeFolder.clone();
    localeFolder.append(name);
    if (!localeFolder.exists()) {
      throw new Error('Using inexistent shared locale: ' + name + ' from: ' +
                      webapp.domain);
    }
    ini.append(name + '.ini');
    if (!ini.exists())
      throw new Error(name + ' locale doesn`t have `.ini` file.');

    // Add the .ini file
    addToZip(zip, '/shared/locales/' + name + '.ini', ini);
    // And the locale folder itself
    addToZip(zip, '/shared/locales/' + name, localeFolder);
  });

  used.resources.forEach(function(path) {
    // Compute the nsIFile for this shared resource file
    let file = Gaia.sharedFolder.clone();
    file.append('resources');
    path.split('/').forEach(function(segment) {
      file.append(segment);
    });
    if (!file.exists()) {
      dump('Using inexistent shared resource: ' + path +
           ' from: ' + webapp.domain + '\n');
      return;
    }
    addToZip(zip, '/shared/resources/' + path, file);
  });

  used.styles.forEach(function(name) {
    try {
      copyBuildingBlock(zip, name, 'style');
    } catch(e) {
      throw new Error(e + ' from: ' + webapp.domain);
    }
  });

  used.unstable_styles.forEach(function(name) {
    try {
      copyBuildingBlock(zip, name, 'style_unstable');
    } catch(e) {
      throw new Error(e + ' from: ' + webapp.domain);
    }
  });

  zip.close();
});

