'use strict';

/* global require, exports */
const utils = require('utils');
const { Cc, Ci } = require('chrome');

function getHash(str) {
  var converter =
    Cc['@mozilla.org/intl/scriptableunicodeconverter'].
      createInstance(Ci.nsIScriptableUnicodeConverter);

  converter.charset = 'UTF-8';

  var result = {};
  var data = converter.convertToByteArray(str, result);
  var ch = Cc['@mozilla.org/security/hash;1'].createInstance(Ci.nsICryptoHash);
  ch.init(ch.SHA1);
  ch.update(data, data.length);
  var hash = ch.finish(false);

  return toHexString(hash);
}

function toHexString(str) {
  var hex = '';
  for (var i = 0; i < str.length; i++) {
    hex += ('0' + str.charCodeAt(i).toString(16)).slice(-2);
  }
  return hex;
}

// Resources helper constructor
var Resources = function(gaia, settings, appDomain) {
  this.gaia = gaia;
  this.settings = settings;
  this.fileList = [];
  this.json = {};
  this.appPrefix = 'app://';
  this.appURL = this.appPrefix + appDomain + '/resources/';
};

// Parse and get resources for a given JSON configuration of one operator.
// Also create an output JSON configuration for the processed resources.
Resources.prototype.getResources = function(conf) {
  var operatorJSON = {};

  operatorJSON.default_contacts = this.addFile(conf.default_contacts);
  operatorJSON.support_contacts = this.addFile(conf.support_contacts);
  operatorJSON.network_type = this.addFile(conf.network_type);
  operatorJSON.known_networks = this.addFile(conf.known_networks);
  operatorJSON.sms = this.addFile(conf.sms);
  operatorJSON.wallpaper = this.getWallpaperResource(conf.wallpaper);
  operatorJSON.ringtone = this.getRingtoneResource(conf.ringtone);
  operatorJSON.power = this.getPowerResource(conf.power);
  operatorJSON.search = this.getSearchResource(conf.search);
  operatorJSON.default_search =
    this.getDefaultSearchResource(conf.default_search);
  operatorJSON.keyboard_settings = this.getKeyboardResource(conf.keyboard);
  operatorJSON.topsites = this.getTopsitesResource(conf.topsites);

  if ('nfc' in conf) {
    operatorJSON.nfc = this.getNfcResource(conf.nfc);
  }

  if ('data_ftu' in conf) {
    operatorJSON.data_ftu = conf.data_ftu;
  }

  if ('data_roaming' in conf) {
    operatorJSON.data_roaming = conf.data_roaming;
  }

  conf['mcc-mnc'].forEach(function(mcc) {
    if (Object.keys(operatorJSON).length !== 0) {
      this.json[mcc] = operatorJSON;
    }
  }.bind(this));
};

// Get file object for a given path.
Resources.prototype.getFile = function(path) {
  var distDir = this.gaia.distributionDir;
  var file = utils.getFile(distDir, path);
  if (!file.exists()) {
    throw new Error('Invalid single variant configuration: ' +
                    file.path + ' not found');
  }

  return file;
};

// Add new resource entry in the output JSON configuration (key / value)
// and add the resource path to the resources list.
Resources.prototype.addEntry = function(resources, name) {
    if (resources instanceof Array) {
      this.fileList.push.apply(this.fileList, resources);
    } else {
      this.fileList.push(resources);
    }

    return '/resources/' + name;
};

// Add file to resources object
Resources.prototype.addFile = function(path, key) {
  if (path) {
    var file = this.getFile(path);
    return this.addEntry(file, file.leafName);
  }
};

// Create a new JSON file and add to resources.
Resources.prototype.createJSON = function(name, content) {
  var obj = { filename: name,
              content: content };

  return this.addEntry(obj, obj.filename);
};

// Create new wallpaper JSON from a wallpaper file path.
Resources.prototype.getWallpaperResource = function(wallpaper) {
  if (wallpaper) {

    var uri;
    if (wallpaper.startsWith(this.appPrefix)) {
      uri = wallpaper;
    } else {
      var file = this.getFile(wallpaper);
      if (!file) {
        return;
      }
      uri = '/resources/' + file.leafName;
      this.addEntry(file, file.leafname);
    }

    var content = { uri: uri,
                    default: this.settings['wallpaper.image'] };

    var jsonName = 'wallpaper-' + getHash(wallpaper) + '.json';
    return this.createJSON(jsonName, content);
  }
};

// Create ringtone JSON and add file.
Resources.prototype.getRingtoneResource = function(ringtone) {
  if (ringtone) {
    var jsonName = 'ringtone-' + getHash(JSON.stringify(ringtone)) + '.json';

    var ringtoneName = ringtone.name;
    if (!ringtoneName) {
      throw new Error('Missing name for ringtone in single variant conf.');
    }

    var uri;
    if (ringtone.path.startsWith(this.appPrefix)) {
      uri = ringtone.path;
    } else {
      var file = this.getFile(ringtone.path);
      if (!file) {
        throw new Error('Missing path for ringtone in single variant conf.');
      }
      uri = '/resources/' + file.leafName;
      this.addEntry(file, file.leafname);
    }

    var content = { uri: uri,
                    name: ringtoneName,
                    default: this.settings['dialer.ringtone.id'] };

    return this.createJSON(jsonName, content);
  }
};

// Create power JSON and add files.
Resources.prototype.getPowerResource = function (power) {
  if (power) {
    var jsonName = 'power-' + getHash(JSON.stringify(power)) + '.json';
    var powerJSON = power;
    var poweron = power.poweron;
    var poweronFile;

    if (poweron) {
      var poweronType = poweron.video ? 'video' : null ||
                        poweron.image ? 'image' : null;
      if (!poweronType) {
        throw new Error('Invalid poweron type, only video or image are ' +
                        'valid.');
      }

      if (poweron[poweronType].startsWith(this.appPrefix)) {
        powerJSON.poweron[poweronType] = poweron[poweronType];
      } else {
        poweronFile = this.getFile(poweron[poweronType]);
        this.addEntry(poweronFile, poweronFile.leafname);
        powerJSON.poweron[poweronType] = this.appURL + poweronFile.leafName;
      }
    }
    var poweroff = power.poweroff;
    var poweroffFile;
    if (poweroff) {
      var poweroffType = poweroff.video ? 'video' : null ||
                         poweroff.image ? 'image' : null;
      if (!poweroffType) {
        throw new Error('Invalid poweroff type, only video or image are ' +
                        'valid.');
      }

      if (poweroff[poweroffType].startsWith(this.appPrefix)) {
        powerJSON.poweroff[poweroffType] = poweroff[poweroffType];
      } else {
        poweroffFile = this.getFile(poweroff[poweroffType]);
        this.addEntry(poweroffFile, poweroffFile.leafname);
        powerJSON.poweroff[poweroffType] = this.appURL + poweroffFile.leafName;
      }
    }

    return this.createJSON(jsonName, powerJSON);
  }
};

// Create search JSON and add files.
Resources.prototype.getSearchResource = function (searchPath) {
  if (searchPath) {
    var file = this.getFile(searchPath);
    var searchContent = utils.getJSON(file);

    searchContent.forEach(function(engine) {
      if (!engine.iconPath.startsWith(this.appPrefix)) {
        var searchFile = this.getFile(engine.iconPath);
        this.addEntry(searchFile, searchFile.leafname);
        engine.iconUrl = this.appURL + searchFile.leafName;
        delete engine.iconPath;
      }
    }.bind(this));

    return this.createJSON(file.leafName, searchContent);
  }
};

// Create default search JSON and add files.
Resources.prototype.getDefaultSearchResource = function (defaultSearchPath) {
  if (defaultSearchPath) {
    var file = this.getFile(defaultSearchPath);
    var searchContent = utils.getJSON(file);

    if (!searchContent.urlTemplate ||
        !searchContent.suggestionsUrlTemplate ||
        !searchContent.iconPath) {
      throw new Error('Invalid format of the default provider search engine.');
    }

    if (!searchContent.iconPath.startsWith(this.appPrefix)) {
      var searchFile = this.getFile(searchContent.iconPath);
      this.addEntry(searchFile, searchFile.leafname);
      searchContent.iconUrl = this.appURL + searchFile.leafName;
      delete searchContent.iconPath;
    }

    return this.createJSON(file.leafName, searchContent);
  }
};


// Create keyboard JSON.
Resources.prototype.getKeyboardResource = function (keyboard) {
  if (keyboard) {
    var file = utils.getFile(this.gaia.distributionDir, keyboard);
    if (!file.exists()) {
      throw new Error('Invalid single variant configuration: ' +
                      file.path + ' not found');
    }

    var defaults = {
      'keyboard.vibration': this.settings['keyboard.vibration'],
      'keyboard.autocorrect': this.settings['keyboard.autocorrect'],
      'keyboard.clicksound': this.settings['keyboard.clicksound'],
      'keyboard.wordsuggestion': this.settings['keyboard.wordsuggestion']
    };

    var content = { values: utils.getJSON(file),
                    defaults: defaults };

    var jsonName = 'keyboard-' + getHash(keyboard) + '.json';
    return this.createJSON(jsonName, content);
  }
};

// Create topsites JSON.
Resources.prototype.getTopsitesResource = function (topsitesPath) {
  if (topsitesPath) {
    var file = this.getFile(topsitesPath);
    var topsites = utils.getJSON(file);

    topsites.topSites.forEach(function(site) {
      if (site.iconPath) {
        var file = this.getFile(site.iconPath);
        var icon = utils.getFileAsDataURI(file);
        site.iconUri = icon;
        delete site.iconPath;
      }
    }.bind(this));

    return this.createJSON(file.leafName, topsites);
  }
};

// Create nfc JSON.
Resources.prototype.getNfcResource = function(nfc) {
  var content = { isEnabled: nfc,
                  default: this.settings['nfc.enabled'] };

  var jsonName = 'nfc-' + getHash(JSON.stringify(content)) + '.json';
  return this.createJSON(jsonName, content);
};

// OperatorAppBuilder constructor object.
var OperatorAppBuilder = function() {
};

// set destination directory, application directory and get settings in order
// to set default values.
OperatorAppBuilder.prototype.setOptions = function(options) {
  this.stageDir = utils.getFile(options.STAGE_APP_DIR);

  this.gaia = utils.gaia.getInstance(options);

  var settingsFile = utils.getFile(options.STAGE_DIR, 'settings_stage.json');
  if (!settingsFile.exists()) {
    throw new Error('file not found: ' + settingsFile.path);
  }
  this.settings = utils.getJSON(settingsFile);

  this.appDir = utils.getFile(options.APP_DIR);
  this.appDomain = this.appDir.leafName + '.' + options.GAIA_DOMAIN;
};

// Get resources and copy files and configuration JSON to build_stage folder.
OperatorAppBuilder.prototype.generateCustomizeResources = function() {
  if (!this.gaia.distributionDir) {
    return;
  }

  var variantFile = utils.getFile(this.gaia.distributionDir, 'variant.json');
  if (variantFile.exists()) {
    var resources = this.getSingleVariantResources(variantFile);

    var resourceDirFile = utils.getFile(this.stageDir.path, 'resources');
    utils.ensureFolderExists(resourceDirFile);
    var customizationFile = utils.getFile(this.stageDir.path,
      'resources', 'customization.json');
    utils.writeContent(customizationFile, JSON.stringify(resources.json));

    resources.fileList.forEach(function(file) {
      if (file instanceof Ci.nsILocalFile) {
        file.copyTo(resourceDirFile, file.leafName);
      } else {
        var resourceFile = resourceDirFile.clone();
        resourceFile.append(file.filename);
        utils.writeContent(resourceFile, JSON.stringify(file.content));
      }
    });
  } else {
    utils.log('operatorvariant', variantFile.path + ' not found. Single' +
      ' variant resources will not be added.\n');
  }
};

// Use Resources object to get the resources for each operator.
OperatorAppBuilder.prototype.getSingleVariantResources = function(svConfFile) {
  var svConf = utils.getJSON(svConfFile);
  var resources = new Resources(this.gaia, this.settings, this.appDomain);

  svConf.operators.forEach(function(operator) {
    resources.getResources(operator);
  });

  return resources;
};

OperatorAppBuilder.prototype.execute = function(options) {
  utils.copyToStage(options);
  this.setOptions(options);
  this.generateCustomizeResources(options);
};

exports.execute = function(options) {
  (new OperatorAppBuilder()).execute(options);
};
