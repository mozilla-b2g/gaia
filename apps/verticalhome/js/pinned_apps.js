'use strict';

(function (exports) {

  function PinnedAppItem(index) {
    if (index === null || index === undefined){
      return false;
    }
    this.index = index;
    //creating pinned app element
    var pinnedElem = document.createElement('div');
    pinnedElem.className = 'pinned-app-item';
    pinnedElem.setAttribute('data-index', this.index);
    pinnedElem.innerHTML = '<img class="pinned-app-icon"><br></img>' +
            '<span class="title"></span>';
    var pinnedList = document.getElementById('pinned-apps-list');
    var moreAppsLi = document.getElementById('moreApps');
    pinnedList.insertBefore(pinnedElem, moreAppsLi);

    this.element = pinnedElem;
    this.icon = this.element.querySelector('.pinned-app-icon');
    this.title = this.element.querySelector('.title');
  }

  PinnedAppItem.prototype = {
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
      this.icon = this.element.querySelector('.pinned-app-icon');
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
      app.savePinnedAppItem(this.entry);
    },

    handleEvent: function(e) {
      this.launch();
    }
  };

  function PinnedAppsManager() {
    //do nothing
  }

  PinnedAppsManager.prototype = {
    items: [],

    init: function () {
      this.onLoadSettings();
    },

    onLoadSettings: function() {
      var pinnedAppsList = app.getPinnedAppsList();
      for (var i = 0; i < pinnedAppsList.length; i++) {
        this.items[i] = new PinnedAppItem(i);
        this.items[i].bindEntry(pinnedAppsList[i]);
      }

      this.items.sort(function(elem1, elem2) {
        return elem1.index - elem2.index;
      });
    },

    handleEvent: function(e) {
    }
  };

  exports.PinnedAppsManager = PinnedAppsManager;
})(window);
