'use strict';

(function (exports) {

  function PinAppItem(index) {
    if (index === null || index === undefined){
      return false;
    }
    this.index = index;
    //creating pin app element
    var pinElem = document.createElement('div');
    pinElem.className = 'pin-app-item';
    pinElem.setAttribute('data-index', this.index);
    pinElem.innerHTML = '<img class="pin-app-icon"><br></img>' +
            '<span class="title"></span>';
    var pinList = document.getElementById('pin-apps-list');
    var moreAppsLi = document.getElementById('moreApps');
    pinList.insertBefore(pinElem, moreAppsLi);

    this.element = pinElem;
    this.icon = this.element.querySelector('.pin-app-icon');
    this.title = this.element.querySelector('.title');
  }

  PinAppItem.prototype = {
    entry: null,

    bindEntry: function(entry) {
      if (!entry){
        return;
      }
      this.clear();
      this.entry = entry;
      this.entry.index = this.index;
      this.targetApp = app.getAppByURL(this.entry.manifestURL);
      this.render();
    },


    render: function() {

      var self = this;
      function getName() {
        var name = self.entry.locales[document.documentElement.lang].name;
        return  name ? name : self.entry.name;
      }

      this.element.removeEventListener('click', this);
      if(this.targetApp) {
        this.icon.style.visibility = 'visible';
        this.title.style.visibility = 'visible';
        this.element.dataset.manifesturl = this.entry.manifestURL;
        this.element.dataset.entrypoint = this.entry.entry_point;
        if(this.entry.icon) {
          this.icon.src = this.entry.icon;
          this.element.addEventListener('click', this);
        }

        if (this.entry.locales) {
          this.title.textContent = getName();
        } else if (this.entry.name) {
          var manifest = this.targetApp.manifest;
          var entry_point = this.entry.entry_point;
          this.entry.locales = manifest.entry_points && entry_point ?
                                manifest.entry_points[entry_point].locales :
                                manifest.locales;
          this.title.textContent = getName();
        }

      } else {
          this.icon.style.visibility = 'hidden';
          this.title.style.visibility = 'hidden';
      }
    },

    refreshDomElem: function(elem){
      this.element = elem;
      this.icon = this.element.querySelector('.pin-app-icon');
      this.title = this.element.querySelector('.title');
      this.render();
    },

    clear: function() {
      this.entry = {
        entry_point: null,
        name: null,
        manifest: null,
        index: this.index
      };
      this.element.removeEventListener('click', this);
      this.targetApp = null;
    },

    launch: function() {
      if(!this.targetApp) {
        return;
      }

      if(this.entry.entry_point) {
        this.targetApp.launch(this.entry.entry_point);
      } else {
        this.targetApp.launch();
      }
    },

    setEntry: function(entry) {
      this.bindEntry(entry);
    },

    getEntry: function() {
      return this.entry;
    },

    save: function() {
      app.savePinAppItem(this.entry);
    },

    handleEvent: function(e) {
      this.launch();
    }
  };

  function PinAppManager() {
    //do nothing
  }

  PinAppManager.prototype = {
    items: [],

    init: function () {
      this.onLoadSettings();
    },

    onLoadSettings: function() {
      var pinAppsList = app.getPinAppList();
      for (var i = 0; i < pinAppsList.length; i++) {
        this.items[i] = new PinAppItem(i);
        this.items[i].bindEntry(pinAppsList[i]);
      }

      this.items.sort(function(elem1, elem2) {
        return elem1.index - elem2.index;
      });
    },

    handleEvent: function(e) {
    }
  };

  exports.PinAppManager = PinAppManager;
})(window);
