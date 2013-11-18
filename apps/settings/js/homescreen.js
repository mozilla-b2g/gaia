'use strict';

var Homescreen = {
  init: function init(callback) {
    this._settings = navigator.mozSettings;

    this._appsMgmt = navigator.mozApps.mgmt;
    window.addEventListener('applicationinstall',
                            this.renderHomescreens.bind(this));
    window.addEventListener('applicationuninstall',
                            this.renderHomescreens.bind(this));

    this._apps = [];

    this._container = document.querySelector('#homescreen > div > ul');
    this._container.addEventListener('click', this.handleListClick.bind(this));

    this._detailTitle =
      document.querySelector('#homescreen-details > header > h1');
    this._detailDescription =
      document.querySelector('#homescreen-details > div > p');

    this._detailButton =
      document.querySelector('#homescreen-details > div > button');
    this._detailButton.addEventListener('click',
                                        this.handleChangeHomescreen.bind(this));

    this.renderHomescreens();
  },

  handleListClick: function handleListClick(evt) {
    var index = evt.target.dataset.appIndex;
    this._detailButton.dataset.appIndex = index;
    var app = this._apps[index];
    var manifest =
      new ManifestHelper(app.manifest || app.updateManifest);
    this._detailTitle.textContent = manifest.name;
    this._detailDescription.textContent = manifest.description;
  },

  handleChangeHomescreen: function handleChangeHomescreen(evt) {
    var index = this._detailButton.dataset.appIndex;
    this.setHomescreen(this._apps[index].manifestURL);
  },

  setHomescreen: function setHomescreen(homescreenManifestUrl) {
    this._settings.createLock().set({
      'homescreen.manifestURL': homescreenManifestUrl
    });
  },

  renderHomescreens: function renderHomescreens() {
    var self = this;
    navigator.mozApps.mgmt.getAll().onsuccess = function mozAppGotAll(evt) {
      self._apps = evt.target.result.filter(function(app) {
        var manifest =
          new ManifestHelper(app.manifest || app.updateManifest);

        return manifest && manifest.role && manifest.role === 'homescreen';
      });

      self._container.innerHTML = '';

      var listFragment = document.createDocumentFragment();
      self._apps.forEach(function homescreensItr(app, index) {
        var item = document.createElement('li');
        var link = document.createElement('a');
        link.href = '#homescreen-details';

        var manifest =
          new ManifestHelper(app.manifest || app.updateManifest);
        var icon = document.createElement('img');
        if (manifest.icons && Object.keys(manifest.icons).length) {
          var key = Object.keys(manifest.icons)[0];
          var iconURL = manifest.icons[key];
          if (!(/^(http|https|data):/.test(iconURL))) {
            iconURL = app.origin + '/' + iconURL;
          }
          icon.src = iconURL;
        } else {
          icon.src = '../style/images/default.png';
        }

        link.appendChild(icon);
        var name = document.createTextNode(manifest.name);
        link.appendChild(name);
        link.dataset.appIndex = index;
        item.appendChild(link);
        listFragment.appendChild(item);
      });

      self._container.appendChild(listFragment);
    };
  }
};

Homescreen.init();
