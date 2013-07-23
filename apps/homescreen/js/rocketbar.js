var Rocketbar = {
  nodeNames: [
    'activation-icon',
    'overlay',
    'input',
    'results'
  ],

  DOM: {},
  installedApps: {},
  
  init: function rocketbar_init() {
    this.getInstalledApps();
    
    this.nodeNames.forEach(function(name) {
      this.DOM[this.toCamelCase(name)] =
        document.getElementById('rocketbar-' + name);
    }, this);

    this.DOM.activationIcon.addEventListener('click', this.show.bind(this, true));
    this.DOM.overlay.addEventListener('click', this.hide.bind(this));
    this.DOM.input.addEventListener('click', this.inputFocus);
    this.DOM.input.addEventListener('keyup', this.inputKeyUp.bind(this));
  },

  getInstalledApps: function() {
    var self = this;
    navigator.mozApps.mgmt.getAll().onsuccess = function mozAppGotAll(evt) {
      var apps = evt.target.result;
      apps.forEach(function(app) {
        self.installedApps[app.manifestURL] = app;
      });
    }
  },
  
  toCamelCase: function toCamelCase(str) {
     return str.replace(/\-(.)/g, function replacer(str, p1) {
       return p1.toUpperCase();
     });
  },

  inputFocus: function(evt) {
    evt.stopPropagation();
  },
  
  inputKeyUp: function(evt) {
    var results = [];

    // Clean up the query and display blank results if blank
    var query = this.DOM.input.value.toLowerCase().trim();
    if (query.length == 0) {
      this.showAppResults(results);
      return;
    }

    // Create a list of manifestURLs for apps with names which match the query
    var manifestURLs = Object.keys(this.installedApps);
    manifestURLs.forEach(function(manifestURL) {
      var appName = this.installedApps[manifestURL].manifest.name.toLowerCase();
      if (appName.indexOf(query) != -1 &&
          this.HIDDEN_APPS.indexOf(manifestURL) == -1) {
        results.push(manifestURL);
      }
    }, this);
    this.showAppResults(results);
  },
    
  showAppResults: function rocketbar_showAppResults(results) {
    this.DOM.results.innerHTML = '';
    if (results.length == 0)
      return;
    results.forEach(function(manifestURL) {
      var app = this.installedApps[manifestURL];
      var li = document.createElement('li');
      li.textContent = app.manifest.name;
      li.setAttribute('data-manifest-url', manifestURL);
      li.style.backgroundImage = 'url(' + app.origin +
        app.manifest.icons['60'] + ')';
      this.DOM.results.appendChild(li);
    }, this);
  },
    
  show: function(focus) {
    this.DOM.overlay.classList.add('active');
    if (focus) {
      this.DOM.input.focus();
    }
  },

  hide: function() {
    this.DOM.input.blur();
    this.DOM.overlay.classList.remove('active');
  },
  
  HIDDEN_APPS: ['app://keyboard.gaiamobile.org/manifest.webapp',
      'app://wallpaper.gaiamobile.org/manifest.webapp',
      'app://bluetooth.gaiamobile.org/manifest.webapp',
      'app://pdfjs.gaiamobile.org/manifest.webapp',
      'app://homescreen.gaiamobile.org/manifest.webapp',
      'app://system.gaiamobile.org/manifest.webapp',
      'app://image-uploader.gaiamobile.org/manifest.webapp',
      'http://keyboard.gaiamobile.org:8080/manifest.webapp',
      'http://wallpaper.gaiamobile.org:8080/manifest.webapp',
      'http://bluetooth.gaiamobile.org:8080/manifest.webapp',
      'http://pdfjs.gaiamobile.org:8080/manifest.webapp',
      'http://homescreen.gaiamobile.org:8080/manifest.webapp',
      'http://system.gaiamobile.org:8080/manifest.webapp',
      'http://image-uploader.gaiamobile.org/manifest.webapp']
};

Rocketbar.init();
