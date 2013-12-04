'use strict';

const CC = Components.Constructor;
const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

const RE_MCCMNC = /^\d{3}-\d{3}$/;
const PAGE_MAX_APP = 16;
const DOCK_MAX_APP = 5;
const MARKETPLACE_INSTALL_ORIGIN = 'https://marketplace.firefox.com';
const EXTERNAL_APP_DIR = 'external-apps';
const MARKETPLACE_SEARCH_HASH = '#marketplace-search-result';
const MARKETPLACE_SEARCH_BASEURL = 'https://marketplace.firefox.com/api/v1/' +
  'apps/search/?device=firefoxos&q=';

Cu.import('resource://gre/modules/Services.jsm');
Cu.import('resource://gre/modules/FileUtils.jsm');

const GAIA_DIR_PREF_NAME = 'extensions.gaia.dir';
const DEFAULT_PAGE = 2;
var utils, variant;

var Homescreen = {
  operators: {},

  init: function hs_init() {
    var self = this;
    this.addPageButton = document.getElementById('add-page');
    this.grid = document.getElementById('grid');
    this.dock = document.getElementById('dock');
    this.apps = [];
    this.searchResultContainer =
      document.getElementById('marketplace-search-container');
    this.addPageButton.addEventListener('click', this.addPage.bind(this));
    this.operatorsElement = document.getElementById('operators');

    if (this.grid.children.length <= 1) {
      for (var i = 0; i < DEFAULT_PAGE; i++) {
        this.addPage();
      }
    }

    var gaiaBuilds = document.getElementById('gaia-builds');
    gaiaBuilds.addEventListener('change', function(evt) {
      var selected = gaiaBuilds.options[gaiaBuilds.options.selectedIndex];
      self.selectBuild(selected.value);
    });
    document.getElementById('save').addEventListener('click',
      this.save.bind(this));
    document.getElementById('select-gaia').addEventListener('click',
      this.selectGaiaFolder.bind(this));
    document.getElementById('options-remove').addEventListener('click',
      this.removeApp.bind(this));
    document.getElementById('reset-gaia').addEventListener('click',
      resetGaiaPath);
    document.getElementById('marketplace-keyword').addEventListener('click',
      function(evt) {
        this.select();
    });
    document.getElementById('marketplace-search').addEventListener('click',
      function(evt) {
        var keyword = document.getElementById('marketplace-keyword').value;
        if (keyword) {
          self.search(keyword);
        } else {
          alert('Please specify a keyword.');
        }
    });

    function createOperator() {
      var div = document.createElement('div');
      div.classList.add('operator');
      self.createOperatorEditor(div);
      self.operatorsElement.appendChild(div);
    }

    document.getElementById('add-operator').addEventListener('click',
      createOperator);
    document.getElementById('certain-mcc-mnc').addEventListener('change',
      function(evt) {
        var app = self.apps[self.editingAppElement.dataset.name];
        if (evt.target.checked) {
          app.forOperators = true;
        } else {
          app.forOperators = false;
        }
      });

    window.addEventListener('hashchange', function(evt) {
      var oldURL = new URL(evt.oldURL);
      if (oldURL.hash === MARKETPLACE_SEARCH_HASH) {
        delete self.searchResult;
      }
    });
    createOperator();
  },

  search: function hs_search(keyword) {
    var {downloadJSON} = utils;
    this.searchResultContainer.innerHTML = 'Loading...';
    window.location.hash = MARKETPLACE_SEARCH_HASH;
    var self = this;
    var url = MARKETPLACE_SEARCH_BASEURL + encodeURI(keyword);
    downloadJSON(url, function(json) {
      if (json) {
        self.searchResult = json;
        self.showSearchResult(self.searchResult);
      } else {
        var msg = 'Marketplace search request failed';
        alert(msg);
        throw new Error(msg);
      }
    });
  },

  showSearchResult: function hs_showSearchResult(json) {
    var result = this.searchResultContainer;
    while(result.firstChild) {
      result.removeChild(result.firstChild);
    }
    json.objects.forEach(function(obj, index) {
      result.appendChild(this.createSearchEntry(obj, index));
    }.bind(this));
  },

  createSearchEntry: function hs_createSearchEntry(obj, index) {
    const FULL_STARS = 5;
    var container = document.createElement('a');
    container.classList.add('marketplace-app-container');

    var elements = {
      'icon': 'img',
      'name': 'div',
      'author': 'div',
      'ratings': 'div',
      'review': 'div',
      'type': 'div'
    };
    for (var key in elements) {
      var el = document.createElement(elements[key]);
      el.classList.add('marketplace-app-' + key);
      container.appendChild(el);
      elements[key] = el;
    }

    elements.name.textContent = obj.name;
    elements.author.textContent = obj.author;
    elements.icon.src = obj.icons['64'];
    var ratings = Math.round(obj.ratings.average);
    elements.ratings.innerHTML = new Array(ratings + 1).join('&#9733;');
    var len = elements.ratings.innerHTML.length;
    elements.ratings.innerHTML += new Array(FULL_STARS - len + 1).join('&#9734;');
    elements.ratings.dataset.average = obj.ratings.average;
    elements.review.textContent = obj.ratings.count + ' reviews';
    elements.type.dataset.isPackaged = obj.is_packaged;

    container.dataset.index = index;
    container.addEventListener('click', this.addAppFromMarketplace.bind(this));

    return container;
  },

  selectBuild: function hs_selectBuild(buildname) {
    if (!this.gaiaConfig) {
      throw new Error('Homescreen.gaiaConfig doesn\'t exist');
    }
    var c = this.gaiaConfig;
    var {getAppsByList} = utils;
    var apps = getAppsByList(this.buildConfig[buildname].content,
      c.GAIA_DIR, c.GAIA_DISTRIBUTION_DIR);
    this.setApps(apps);
  },

  selectGaiaFolder: function hs_selectGaiaFolder() {
    this.reset();
    let path = this.promptFolder();
    if (!path) {
      return;
    }
    Services.prefs.setCharPref(GAIA_DIR_PREF_NAME, path);
  },

  promptFolder: function hs_promptFolder() {
    let fp = Cc['@mozilla.org/filepicker;1'].createInstance(Ci.nsIFilePicker);
    fp.init(window, 'Select Gaia directory', Ci.nsIFilePicker.modeGetFolder);
    let res = fp.show();
    if (res != Ci.nsIFilePicker.returnCancel) {
      return fp.file.path;
    }
    return null;
  },

  reset: function hs_reset() {
    var availableApps = document.getElementById('available-apps');
    while (availableApps.firstChild) {
      availableApps.removeChild(availableApps.firstChild);
    }

    var pages = document.getElementsByClassName('container');
    Array.prototype.forEach.call(pages, function(page, index) {
      while (page.firstChild) {
        page.removeChild(page.firstChild);
      }
    });
  },

  resetBuilds: function hs_resetBuilds() {
    var builds = document.getElementById('gaia-builds');
    Array.prototype.forEach.call(builds.children, function(option) {
      option.remove();
    });
  },

  setApps: function hs_setApps(apps) {
    this.installedApps = {};
    var availableApps = document.getElementById('available-apps');
    this.apps = apps;
    this.reset();

    for (var app in apps) {
      // app with role in manifest means it has specific purpose and those apps
      // usually doesn't show on homescreen. e.g., role of bluetooth, pdf.js &
      // ringtones is "system" which means they are executed by another apps but
      // doesn't show on homescreen, but those apps are essential for gaia .
      if (apps[app].manifest.role) {
        this.installedApps[app] = apps[app];
        continue;
      } else {
        this.createAppElements(apps[app]).forEach(function(el) {
          availableApps.appendChild(el);
        });
      }
    }
  },

  showOptions: function hs_showOptions(evt) {
    var self = this;
    this.editingAppElement = evt.target;
    var operatorsCheckbox = document.getElementById('certain-mcc-mnc');
    var operatorsOptions = document.getElementById('options-content');
    var operatorsDisabledMsg = document.getElementById('operators-disabled-desc');
    var name = this.editingAppElement.dataset.name;
    document.getElementById('options-title').innerHTML = evt.target.innerHTML;
    window.location.hash = '#options';

    function updateOperators(name) {
      var inputs =
        document.querySelectorAll('.operator input[type="checkbox"]');
      Array.prototype.forEach.call(inputs, function(input) {
        var operatorId = input.dataset.operatorId;
        input.checked = self.operators[operatorId].apps[name] ? true : false;
      });
    }

    if (!this.apps[name]) {
      throw new Error('App doesn\'t exist: ' + name);
    } else if (this.apps[name].metadata &&
      this.apps[name].metadata.source === 'external') {
      updateOperators(name);
      operatorsCheckbox.checked = this.apps[name].forOperators || false;
      operatorsOptions.classList.remove('hidden');
      operatorsDisabledMsg.classList.add('hidden');
      operatorsCheckbox.disabled = false;
    } else {
      operatorsDisabledMsg.classList.remove('hidden');
      operatorsOptions.classList.add('hidden');
      operatorsCheckbox.disabled = true;
    }
  },

  updateOperators: function hs_updateOperators(operator, appName) {
    var prevOperatorId;
    if (this.editingOperator) {
      prevOperatorId = this.editingOperator.id;
    } else {
      prevOperatorId = operator.id;
    }

    if (this.operators[prevOperatorId] && prevOperatorId !== operator.id) {
      operator.apps = this.operators[prevOperatorId].apps;
      delete this.operators[prevOperatorId];
    }
    this.operators[operator.id] = operator;

    if (appName) {
      operator.apps[appName] = true;
    }
  },

  getOperator: function hs_getOperator(name) {
    var operator;
    this.operators.every(function(opr) {
      if (opr.id === name) {
        operator = opr;
        return false;
      }
      return true;
    });
    return operator;
  },

  convertToOperator: function hs_convertToOperator(el) {
    var operatorId = el.querySelector('[data-field="operatorId"]').value;
    var mccmnc = el.querySelector('[data-field="mccmnc"]').value;
    var formatError = false;
    var mccmncArray = mccmnc.split(',').map(function(item) {
      var pair = item.trim();
      formatError = !RE_MCCMNC.test(pair) || formatError;
      return pair;
    });
    if (formatError) {
      throw new Error('MCC/MNC format incorrect, both of MCC and MNC need ' +
        '3 digits like "310-410" (without double quotes)');
    }
    return {
      'id': operatorId,
      'mcc-mnc': mccmncArray,
      'apps': {}
    };
  },

  switchOperatorMode: function hs_switchOperatorMode(operatorDiv, toEdit) {
    function removeAllChildren(element) {
      while (element.firstChild) {
        element.removeChild(element.firstChild);
      }
    }

    if (toEdit) {
      var operatorId =
        operatorDiv.querySelector('input[type="checkbox"]').dataset.operatorId;
      var operator = this.operators[operatorId];
      this.editingOperator = operator;
      removeAllChildren(operatorDiv);
      this.createOperatorEditor(operatorDiv, operator);
    } else {
      var operator = this.convertToOperator(operatorDiv);
      removeAllChildren(operatorDiv);
      this.createOperatorView(operatorDiv, operator.id);
      delete this.editingOperator;
    }
  },

  createOperatorView: function hs_createOperatorView(div, operatorId) {
    var {normalizeString} = utils;
    var self = this;
    var operator = this.operators[operatorId];

    var checkbox = document.createElement('input');
    checkbox.dataset.operatorId = operatorId;
    checkbox.dataset.normalizedName = normalizeString(operatorId);
    checkbox.type = 'checkbox';
    checkbox.id = 'checkbox-' + checkbox.dataset.normalizedName;

    var label = document.createElement('label');
    label.setAttribute('for', checkbox.id);
    label.innerHTML = operatorId;

    var span = document.createElement('span');
    span.innerHTML = ' - ';
    var edit = document.createElement('a');
    edit.innerHTML = 'edit';

    checkbox.checked = (operator &&
      operator.apps[this.editingAppElement.dataset.name]);

    checkbox.addEventListener('change', function(evt) {
      var operator = self.operators[evt.target.dataset.operatorId];
      if (evt.target.checked) {
        operator.apps[self.editingAppElement.dataset.name] = true;
      } else {
        delete operator.apps[self.editingAppElement.dataset.name];
      }
    });

    edit.addEventListener('click', function(evt) {
      self.switchOperatorMode(div, true);
    });

    span.appendChild(edit);
    [checkbox, label, span].forEach(function(child) {
      div.appendChild(child);
    });
  },

  createOperatorEditor: function hs_createOperatorEditor(div, operator) {
    var self = this;
    function createInput(field, placeholder) {
      var input = document.createElement('input');
      input.type = 'text';
      input.placeholder = placeholder;
      input.dataset.field = field;
      return input;
    }

    var idInput = createInput('operatorId', 'Operator ID');
    var mccmncInput = createInput('mccmnc', 'mcc/mnc');
    var save = document.createElement('a');
    save.innerHTML = 'Save';
    save.addEventListener('click', function(evt) {
      var operatorDiv = evt.target.parentElement;
      try {
        var operator = self.convertToOperator(operatorDiv);
        self.updateOperators(operator, self.editingAppElement.dataset.name);
        self.switchOperatorMode(operatorDiv, false);
      } catch (e) {
        alert(e.message);
      }

    });

    if (operator) {
      idInput.value = operator.id;
      mccmncInput.value = operator['mcc-mnc'].join(', ');
    }

    [idInput, mccmncInput, save].forEach(function(el) {
      div.appendChild(el);
    });
  },

  removeApp: function hs_removeApp() {
    if (!this.editingAppElement) {
      throw new Error('You didn\'t select an app to edit');
    }
    var availableApps = document.getElementById('available-apps');
    availableApps.appendChild(this.createApp(this.editingAppElement.dataset));
    this.editingAppElement.remove();
    delete this.editingAppElement;

    for (var key in this.operators) {
      delete this.operators[key].apps[this.editingAppElement.dataset.name];
    }

    window.location.hash = '';
  },

  getMetadata: function hs_getMetadata(entry, manifest, callback) {
    var {normalizeString} = utils;
    var name = normalizeString(entry.name)
    var metadata = {
      'name': name,
      'installOrigin': MARKETPLACE_INSTALL_ORIGIN,
      'manifestURL': entry.manifest_url,
      'source': 'external'
    };

    if (entry.is_packaged) {
      metadata.origin = 'app://' + name;
      var xhr = new XMLHttpRequest();
      xhr.open('HEAD', manifest.package_path, false);
      xhr.addEventListener('load', function() {
        if (xhr.status !== 200 && xhr.status !== 304) {
          console.warn('Get header of packaged app failed, Status Code: ' +
            xhr.status);
          callback(metadata);
          return;
        }

        var etag = xhr.getResponseHeader('etag');
        if (etag) {
          metadata.packageEtag = etag;
        }
        callback(metadata);
      });
      xhr.send();
    } else {
      var url = new URL(entry.manifest_url);
      metadata.origin = url.origin;
      callback(metadata);
    }
  },

  filterProperties: function hs_filterProperties(obj, names) {
    var newObj = {};
    for (var prop in obj) {
      if (names.indexOf(prop) >= 0) {
        newObj[prop] = obj[prop];
      }
    }
    return newObj;
  },

  processAppDownload: function hs_processAppDownload(metadata, json) {
    var {getFile, ensureFolderExists} = utils;
    var {downloadApp} = variant;
    var filteredMetadata = this.filterProperties(metadata, ['origin',
      'manifestURL', 'installOrigin', 'etag', 'packageEtag']);
    var appPath = getFile(this.gaiaConfig.GAIA_DISTRIBUTION_DIR,
      EXTERNAL_APP_DIR, metadata.name);
    ensureFolderExists(appPath);
    downloadApp(json, filteredMetadata, appPath.path, function() {
        var {getApp} = utils;
        var app = getApp(EXTERNAL_APP_DIR, metadata.name,
          this.gaiaConfig.GAIA_DIR,
          this.gaiaConfig.GAIA_DISTRIBUTION_DIR);
        app.metadata = metadata;
        this.apps[metadata.name] = app;
        window.location.hash = '';
    }.bind(this));
  },

  addAppFromMarketplace: function hs_addAppFromMarketplace(evt) {
    var self = this;
    var {normalizeString} = utils;
    var entry = this.searchResult.objects[evt.currentTarget.dataset.index];
    var name = normalizeString(entry.name);
    if (this.apps[name]) {
      alert(name + ' app already exists.');
      return;
    }
    this.searchResultContainer.innerHTML = 'Downloading...';

    var xhr = new XMLHttpRequest();
    xhr.open('GET', entry.manifest_url, false);
    xhr.addEventListener('load', function() {
      if (xhr.status !== 200 && xhr.status !== 304) {
        alert('Download Error, Status Code: ' + xhr.status);
        window.location.hash = '';
        return;
      }

      var manifest = JSON.parse(xhr.responseText);
      self.getMetadata(entry, manifest, function(metadata) {
        var app = self.createApp({
          'name': metadata.name,
          'source': 'external'
        });
        document.getElementById('available-apps').appendChild(app);
        var etag = xhr.getResponseHeader('etag');
        if (etag) {
          metadata.etag = etag;
        }
        self.processAppDownload(metadata, manifest);
      });
    });
    xhr.send();
  },

  addToPage: function hs_addToPage(evt) {
    var props = {};
    Object.keys(evt.target.dataset).forEach(function(key) {
      props[key] = evt.target.dataset[key];
    });
    var selectedPage =
      document.querySelector('input[type=radio]:checked ~ .container');
    var app = this.createApp(props, true);
    var max = selectedPage.parentElement.id === 'dock' ?
      DOCK_MAX_APP : PAGE_MAX_APP;
    if (selectedPage.children.length < max) {
      selectedPage.appendChild(app);
      evt.target.remove();
    } else {
      alert('can\'t add anymore');
    }
  },

  createAppElements: function hs_createAppElements(app) {
    function logMissingIcon(app, entryPoint) {
      var name = app + (entryPoint ? ':' + entryPoint : '');
      console.warn('icons for ' + name + ' doesn\'t exist');
    }
    var elements = [];
    if (!app.manifest.icons && !app.manifest.entry_points) {
      logMissingIcon(app.name);
    } else if (!app.manifest.entry_points && app.manifest.icons) {
      elements.push(this.createApp({'name': app.name}));
    } else {
      for (var entryPoint in app.manifest.entry_points) {
        if (!app.manifest.entry_points[entryPoint].icons) {
          logMissingIcon(app.name, entryPoint);
          continue;
        }
        elements.push(this.createApp({
          'name': app.name,
          'entryPoint': entryPoint
        }));
      }
    }

    return elements;
  },

  createApp: function hs_createApp(props, inPage) {
    var div = document.createElement('div');
    div.classList.add('app');
    div.innerHTML = props.name;
    if (props.entryPoint) {
      div.innerHTML += ':' + props.entryPoint;
    }

    Object.keys(props).forEach(function(key) {
      div.dataset[key] = props[key];
    });

    if (!div.dataset.source) {
      div.dataset.source = 'builtin';
    }

    if (!inPage) {
      div.addEventListener('click', this.addToPage.bind(this));
    } else {
      div.addEventListener('click', this.showOptions.bind(this));
    }
    return div;
  },

  setBuildConfig: function hs_setBuildConfig(config) {
    this.reset();
    this.buildConfig = config;
    var buildsElement = document.getElementById('gaia-builds');
    for (var build in config) {
      var option = document.createElement('option');
      option.setAttribute('value', build);
      option.innerHTML = build;

      if (build === 'production') {
        option.setAttribute('selected', 'selected');
        this.selectBuild(build);
      }
      buildsElement.appendChild(option);
    }
  },

  addPage: function hs_addPage() {
    var self = this;
    var lastInput =
      document.querySelector('#grid > div:nth-last-child(2) > input');
    var lastId = lastInput ? parseInt(lastInput.id.substr('page'.length)) : 0;
    var page = document.createElement('div');
    page.classList.add('page');

    var input = document.createElement('input');
    input.setAttribute('type', 'radio');
    input.setAttribute('name', 'page-selection');
    input.id = 'page' + (lastId + 1);

    var label = document.createElement('label');
    label.setAttribute('for', input.id);

    var closeBtn = document.createElement('div');
    closeBtn.classList.add('close-button');
    closeBtn.innerHTML = '×';

    closeBtn.addEventListener('click', function(evt) {
      var targetPage = evt.target.parentNode;
      var targetInput = targetPage.getElementsByTagName('input')[0];
      if (targetInput.checked) {
        document.getElementById('page0').checked = true;
      }

      var apps = targetPage.querySelectorAll('.app');
      var availableApps = document.getElementById('available-apps');
      Array.prototype.forEach.call(apps, function(app) {
        var {name, entryPoint} = app.dataset;
        var restoredApp = self.createApp({
          'name': name, 'entryPoint': entryPoint});
        availableApps.appendChild(restoredApp);
      });

      targetPage.remove();
    });

    var container = document.createElement('div');
    container.classList.add('container');

    page.appendChild(closeBtn);
    page.appendChild(input);
    page.appendChild(label);
    page.appendChild(container);

    this.grid.insertBefore(page, this.addPageButton);
  },

  save: function hs_save(evt) {
    var self = this;
    if (!utils) {
      throw new Error('utils module doesn\'t exist');
    }

    var variant = {
      'apps': {},
      'operators': []
    };

    var operators = JSON.parse(JSON.stringify(this.operators));
    var distDir = utils.getFile(this.gaiaConfig.GAIA_DISTRIBUTION_DIR);
    utils.ensureFolderExists(distDir);

    var pages = document.querySelectorAll('div.page > div.container');
    var grid = {
      homescreens: [],
      search_page: { enabled: true }
    };

    //FIXME: we don't support collections for now
    var collections = [
      ['apps/homescreen/collections', 'social'],
      ['apps/homescreen/collections', 'games'],
      ['apps/homescreen/collections', 'music'],
      ['apps/homescreen/collections', 'entertainment']
    ];
    grid.homescreens.push(collections);

    Array.prototype.forEach.call(pages, function(page, index) {
      var pageArray = [];
      Array.prototype.forEach.call(page.children, function(el, position) {
        var parent;
        var {name, entryPoint} = el.dataset;

        if (!self.apps[name]) {
          throw new Error('App doesn\'t exist: ' + name);
        }

        if (self.apps[name].forOperators) {
          for (var key in self.operators) {
            if (self.operators[key].apps[name]) {
              operators[key].apps[name] = {
                'id': name,
                'screen': index,
                'position': position
              };
              variant.apps[name] =
                self.filterProperties(self.apps[name].metadata,
                ['origin', 'manifestURL', 'installOrigin', 'etag']
              );
            }
          }
          return;
        }

        var f = utils.getFile(self.apps[name].path);
        parent = f.parent.leafName;

        var appArray = [parent, name];
        if (entryPoint) {
          appArray.push(entryPoint);
        }
        pageArray.push(appArray);

        self.installedApps[name] = self.apps[name];
      });

      if (index !== pages.length - 1) {
        grid.homescreens.push(pageArray);
      } else {
        // insert apps in dock to first one element of pageArray
        grid.homescreens.splice(0, 0, pageArray);
      }
    });

    var appslistFile = distDir.clone();
    appslistFile.append('apps.list');

    var applistArray = [];
    for (var key in self.installedApps) {
      applistArray.push(self.installedApps[key].parent + '/' + key);
    }

    utils.writeContent(appslistFile, applistArray.join('\n'));

    var homescreenFile = distDir.clone();
    homescreenFile.append('homescreens.json');
    utils.writeContent(homescreenFile, JSON.stringify(grid, undefined, 2));

    for (var key in operators) {
      var operator = operators[key];
      var apps = [];
      for (var appname in operator.apps) {
        apps.push(operator.apps[appname]);
      }
      operator.apps = apps;
      variant.operators.push(operators[key]);
    }

    var variantFile = distDir.clone();
    variantFile.append('variant.json');
    utils.writeContent(variantFile, JSON.stringify(variant, undefined, 2));

    // open directory in file manager if click save button
    if (evt && evt.target) {
      distDir.launch();
    }
  }
};

function resetGaiaPath() {
  Homescreen.resetBuilds();
  Services.prefs.setCharPref(GAIA_DIR_PREF_NAME, '');
  window.location.hash = '#gaia-path-lightbox';
}

window.addEventListener('load', function() {
  Homescreen.init();

  Gaia.addEventListener('setupFinished', function() {
    utils = Gaia.require('utils');
    variant = Gaia.require('variant');
    Homescreen.gaiaConfig = Gaia.config;
    var {getFile, getBuildConfig} = utils;
    var configs = getBuildConfig(getFile(Gaia.config.GAIA_DIR, 'build').path);
    Homescreen.setBuildConfig(configs);
  });

  var observer = {
    observe: function(subject, topic, data) {
      if (data !== GAIA_DIR_PREF_NAME) {
        return;
      }
      var gaiaPath = Services.prefs.getCharPref(GAIA_DIR_PREF_NAME);

      if (!gaiaPath) {
        return;
      }
      try {
        Gaia.setup(gaiaPath);
        window.location.hash = '';
      } catch (e) {
        alert(e.message);
        resetGaiaPath();
      }
    }
  };

  Services.prefs.addObserver(GAIA_DIR_PREF_NAME, observer, false);

  document.getElementById('launch').addEventListener('click', function(evt) {
    Homescreen.save();
    var installedAppPaths = [];
    for (var key in Homescreen.installedApps) {
      installedAppPaths.push(Homescreen.installedApps[key].path);
    }

    var original = evt.target.textContent;
    evt.target.textContent = 'Building gaia... please wait.';
    setTimeout(function() {
      if (!Services.prefs.prefHasUserValue(GAIA_DIR_PREF_NAME)) {
        Homescreen.selectGaiaFolder();
      }
      Gaia.profile.remove(true);
      utils.ensureFolderExists(Gaia.profile);
      Gaia.config.GAIA_APPDIRS = installedAppPaths.join(' ');
      Gaia.install();
      Gaia.launch();
      evt.target.textContent = original;
    }, 100);
  });
  if (Services.prefs.prefHasUserValue(GAIA_DIR_PREF_NAME)) {
    var gaiaPath = Services.prefs.getCharPref(GAIA_DIR_PREF_NAME);
    if (gaiaPath) {
      try {
        Gaia.setup(gaiaPath);
      } catch (e) {
        alert(e.message);
        resetGaiaPath();
      }
    } else {
      resetGaiaPath();
    }
  } else {
    resetGaiaPath();
  }
});

// FIXME: this is a workaround because we can't use <a href="#something"> to
// apply hash tag to url if using about:gaia.
if (window.location.href === 'about:gaia') {
  window.location = 'chrome://gaia-build/content/aboutGaia.html';
}
