/*global require, exports*/
'use strict';
var utils = require('./utils');

var WebappShared = function() {
};

WebappShared.prototype.setOptions = function(options) {
  this.config = options.config;
  this.gaia = options.gaia;
  this.webapp = options.webapp;
  this.used = {
    js: [],              // List of JS file paths to copy
    locales: [],         // List of locale names to copy
    resources: [],       // List of resources to copy
    styles: [],          // List of stable style names to copy
    unstable_styles: [], // List of unstable style names to copy
    elements: [],         // List of elements names to copy,
    pages: []            // List of pages to copy
  };
  this.localesFile = utils.resolve(this.config.LOCALES_FILE,
    this.config.GAIA_DIR);
  if (!this.localesFile.exists()) {
    throw new Error('LOCALES_FILE doesn\'t exists: ' + this.localesFile.path);
  }

  this.buildDir = this.webapp.buildDirectoryFile;
};

WebappShared.prototype.moveToBuildDir = function(file, targetPath) {
  if (file.isHidden()) {
    return;
  }
  var path = file.path;

  if (!file.exists()) {
    throw new Error('Can\'t add inexistent file to  : ' + path);
  }

  if (utils.getOsType().indexOf('WIN') !== -1) {
    targetPath = targetPath.replace(/\//g, '\\\\');
  }

  var fullTargetPath = utils.joinPath(this.buildDir.path, targetPath);
  // Case 1/ Regular file
  if (file.isFile()) {
    try {
      utils.copyFileTo(file, utils.dirname(fullTargetPath),
        utils.basename(fullTargetPath), true);
    } catch (e) {
      throw new Error('Unable to add following file in stage: ' +
                      path + '\n' + e);
    }
  }
  // Case 2/ Directory
  else if (file.isDirectory()) {
    utils.copyDirTo(file, utils.dirname(fullTargetPath),
        utils.basename(fullTargetPath), true);
  }
};

/**
 * Copy a "Building Block" (i.e. shared style resource)
 *
 * @param {String}       blockName name of the building block to copy.
 * @param {String}       dirName   name of the shared directory to use.
 */
WebappShared.prototype.copyBuildingBlock =
  function(subDirPath, dirName) {
    var fullPath = dirName + '/' + subDirPath;
    var paths = fullPath.split('/');
    var blockName = paths.pop();
    var dirPath = 'shared/' + paths.join('/');

    // Compute the nsIFile for this shared style
    var styleFolder = this.gaia.sharedFolder.clone();
    paths.forEach(function(path) {
      styleFolder.append(path);
    });
    var cssFile = styleFolder.clone();
    if (!styleFolder.exists()) {
      throw new Error('Using inexistent shared style: ' + blockName);
    }

    cssFile.append(blockName + '.css');
    var pathInStage = dirPath + '/' + blockName + '.css';
    this.moveToBuildDir(cssFile, pathInStage);

    // Copy everything but index.html and any other HTML page into the
    // style/<block> folder.
    var subFolder = styleFolder.clone();
    subFolder.append(blockName);
    utils.ls(subFolder, true).forEach(function(file) {
      var relativePath = file.getRelativeDescriptor(styleFolder);
      // Ignore HTML files at style root folder
      if (relativePath.match(/^[^\/]+\.html$/)) {
        return;
      }
      // Do not process directory as `addToZip` will add files recursively
      if (file.isDirectory()) {
        return;
      }
      this.moveToBuildDir(file, dirPath + '/' + relativePath);
    }.bind(this));
  };

WebappShared.prototype.pushJS = function(path) {
  var file = this.gaia.sharedFolder.clone();
  file.append('js');
  path.split('/').forEach(function(segment) {
    file.append(segment);
  });
  if (!file.exists()) {
    throw new Error('Using inexistent shared JS file: ' + path + ' from: ' +
                    this.webapp.domain);
  }
  var pathInStage = 'shared/js/' + path;
  this.moveToBuildDir(file, pathInStage);
};

WebappShared.prototype.copyPage = function(path) {
  var file = this.gaia.sharedFolder.clone();
  file.append('pages');
  path.split('/').forEach(function(segment) {
    file.append(segment);
  });

  if (!file.exists()) {
    throw new Error('Using inexistent shared page file: ' + path +
                    ' from: ' + this.webapp.domain);
  }

  var pathInStage = 'shared/pages/' + path;
  this.moveToBuildDir(file, pathInStage);

  let extension = utils.getExtension(file.leafName);
  // If it is an HTML file we need to check for the referenced shared
  // resources
  if (extension === 'html') {
    this.filterSharedUsage(file);
  }
};

WebappShared.prototype.pushResource = function(path) {
  let file = this.gaia.sharedFolder.clone();
  file.append('resources');

  path.split('/').forEach(function(segment) {
    file.append(segment);
    if (utils.isSubjectToBranding(file.path)) {
      file.append((this.config.OFFICIAL === '1') ? 'official' : 'unofficial');
    }
  }.bind(this));

  if (!file.exists()) {
    throw new Error('Using inexistent shared resource: ' + path +
                    ' from: ' + this.webapp.domain + '\n');
  }

  if (path === 'languages.json') {
    var pathInStage = 'shared/resources/languages.json';
    this.moveToBuildDir(this.localesFile, pathInStage);
    return;
  }

  // Add not only file itself but all its hidpi-suffixed versions.
  let fileNameRegexp = new RegExp(
      '^' + file.leafName.replace(/(\.[a-z]+$)/, '((@.*x)?(\\$1))') + '$');

  utils.ls(file.parent, false).forEach(function(listFile) {
    var matches = fileNameRegexp.exec(listFile.leafName);
    if (matches) {
      var pathInStage = 'shared/resources/' +
        path.replace(matches[3], matches[1]);
      this.moveToBuildDir(listFile, pathInStage);
    }
  }.bind(this));

  if (file.isDirectory()) {
    utils.ls(file, true).forEach(function(fileInResources) {
      var pathInStage = 'shared' +
        fileInResources.path.substr(this.gaia.sharedFolder.path.length);
      this.moveToBuildDir(fileInResources, pathInStage);
    }.bind(this));
  }

  if (path === 'media/ringtones/' && this.gaia.distributionDir &&
    utils.getFile(this.gaia.distributionDir, 'ringtones').exists()) {
    this.moveToBuildDir(utils.getFile(this.gaia.distributionDir, 'ringtones'),
      'ringtones');
  }
};

WebappShared.prototype.pushLocale = function(name) {
  var localeFolder = this.gaia.sharedFolder.clone();
  localeFolder.append('locales');
  var ini = localeFolder.clone();
  localeFolder.append(name);
  if (!localeFolder.exists()) {
    throw new Error('Using inexistent shared locale: ' + name + ' from: ' +
                    this.webapp.domain);
  }
  ini.append(name + '.ini');
  if (!ini.exists()) {
    throw new Error('Using inexistent shared locale: ' + name + ' from: ' +
                    this.webapp.domain);
  }
  // And the locale folder itself
  this.moveToBuildDir(localeFolder, 'shared/locales/' + name );
  // Add the .ini file
  var pathInStage = 'shared/locales/' + name + '.ini';
  this.moveToBuildDir(ini, pathInStage);
  utils.ls(localeFolder, true).forEach(function(fileInSharedLocales) {

    var relativePath =
      fileInSharedLocales.path.substr(this.config.GAIA_DIR.length + 1);

    this.moveToBuildDir(fileInSharedLocales, relativePath);
  }.bind(this));
};

WebappShared.prototype.pushElements = function(path) {
  var file = this.gaia.sharedFolder.clone();
  file.append('elements');
  path.split('/').forEach(function(segment) {
    file.append(segment);
  });
  if (!file.exists()) {
    throw new Error('Using inexistent shared elements file: ' + path +
                    ' from: ' + this.webapp.domain);
  }
  var pathInStage = 'shared/elements/' + path;
  this.moveToBuildDir(file, pathInStage);

  // Handle image assets for web components
  var paths = path.split('/');
  if (paths.length <= 1) {
    return;
  }

  var elementName = String(paths.shift());

  // Only handle web components for now (start with gaia_)
  if (elementName.indexOf('gaia_') !== 0) {
    return;
  }

  // Copy possible resources from components.
  var resources = ['style.css', 'css', 'js', 'images', 'locales'];
  resources.forEach(function(resource) {
    var eachFile = this.gaia.sharedFolder.clone();
    eachFile.append('elements');
    eachFile.append(elementName);
    eachFile.append(resource);

    if (eachFile.exists()) {
      var stagePath = 'shared/' + eachFile.getRelativeDescriptor(
        this.gaia.sharedFolder);
      this.moveToBuildDir(eachFile, stagePath);
    }
  }, this);
};

WebappShared.prototype.pushFileByType = function(kind, path) {
  if (path.match(/@[\d\.]+x\.(png|gif|jpg)$/)) {
    utils.log('WARNNING: You are using hidpi image directly in html.');
  }

  switch (kind) {
    case 'pages':
      if (this.used.pages.indexOf(path) === -1) {
        this.used.pages.push(path);
        this.copyPage(path);
      }
      break;
    case 'js':
      if (this.used.js.indexOf(path) === -1) {
        this.used.js.push(path);
        this.pushJS(path);
      }
      break;
    case 'resources':
      if (this.used.resources.indexOf(path) === -1) {
        this.used.resources.push(path);
        this.pushResource(path);
      }
      break;
    case 'style':
      var styleName = path.substr(0, path.lastIndexOf('.'));
      if (this.used.styles.indexOf(styleName) === -1) {
        this.used.styles.push(styleName);
        this.copyBuildingBlock(styleName, 'style');
      }
      break;
    case 'style_unstable':
      var unstableStyleName = path.substr(0, path.lastIndexOf('.'));
      if (this.used.unstable_styles.indexOf(unstableStyleName) === -1) {
        this.used.unstable_styles.push(unstableStyleName);
        this.copyBuildingBlock(unstableStyleName, 'style_unstable');
      }
      break;
    case 'locales':
      var localeName = path.substr(0, path.lastIndexOf('.'));
      if (this.used.locales.indexOf(localeName) === -1) {
        this.used.locales.push(localeName);
        this.pushLocale(localeName);
      }
      break;
    case 'elements':
      if (this.used.elements.indexOf(path) == -1) {
        this.used.elements.push(path);
        this.pushElements(path);
      }
      break;
  }
};

WebappShared.prototype.filterSharedUsage = function(file) {
  var SHARED_USAGE =
      /<(?:script|link).+=['"]\.?\.?\/?shared\/([^\/]+)\/([^''\s]+)("|')/g;
  var content = utils.getFileContent(file);
  var matches = null;
  while((matches = SHARED_USAGE.exec(content)) !== null) {
    let kind = matches[1]; // js | locales | resources | style
    let path = matches[2];
    this.pushFileByType(kind, path);
  }
};

WebappShared.prototype.filterHTML = function(file) {
  var EXTENSIONS_WHITELIST = ['html'];
  var extension = utils.getExtension(file.leafName);
  return file.isFile() && EXTENSIONS_WHITELIST.indexOf(extension) !== -1;
};

WebappShared.prototype.copyShared = function() {
  // If config.BUILD_APP_NAME isn't `*`, we only accept one webapp
  if (this.config.BUILD_APP_NAME !== '*' &&
    this.webapp.sourceDirectoryName !== this.config.BUILD_APP_NAME) {
    return;
  }
  // Zip generation is not needed for external apps, aplication data
  // is copied to profile webapps folder in webapp-manifests.js
  if (utils.isExternalApp(this.webapp)) {
    return;
  }

  var files = utils.ls(this.webapp.sourceDirectoryFile, true);
  files.filter(this.filterHTML).forEach(this.filterSharedUsage.bind(this));
  this.customizeShared();
};

WebappShared.prototype.customizeShared = function() {
  var self = this;
  var sharedDataFile = this.webapp.buildDirectoryFile.clone();
  sharedDataFile.append('gaia_shared.json');
  if (sharedDataFile.exists()) {
    var sharedData = JSON.parse(utils.getFileContent(sharedDataFile));
    Object.keys(sharedData).forEach(function(kind) {
      sharedData[kind].forEach(function(path) {
        self.pushFileByType(kind, path);
      });
    });
  }
};

WebappShared.prototype.execute = function(options) {
  this.setOptions(options);
  this.copyShared();
};

function execute(config) {
  var gaia = utils.gaia.getInstance(config);
  gaia.webapps.forEach(function(webapp) {
    (new WebappShared()).execute({
      config: config, gaia: gaia, webapp: webapp});
  });
}

exports.execute = execute;
exports.WebappShared = WebappShared;
