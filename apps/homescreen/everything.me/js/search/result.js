(function() {
  'use strict';

  var iconFormat = Evme.Utils.getIconsFormat();

  var defaultIconIndex = 0;

  var DEFAULT_ICON_URLS = Evme.Config.design.apps.defaultIconUrl[iconFormat];

  function getDefaultIcon() {
    var defaultIcon = DEFAULT_ICON_URLS[defaultIconIndex];
    defaultIconIndex = (defaultIconIndex + 1) % DEFAULT_ICON_URLS.length;
    return defaultIcon;
  }


  function SearchResult(data) {
    this.title = data.title;
    this.url = data.url;
    this.appId = data.appId;

    this.setIconData(data.iconData);

    // set when getIcon/setIcon is called for the first time
    this.icon = null;
  }

  SearchResult.prototype = {
    getIconData: function getIconData() {
      var self = this;

      var promise = new window.Promise(function done(resolve, reject) {
        if (self.iconData) {
          resolve(self.iconData);
        } else if (self.appId) {
          Evme.IconManager.get(self.appId, function onGet(cachedIconData) {
            if (cachedIconData) {
              resolve(cachedIconData);
            } else {
              reject('missing icon');
            }
          });
        } else {
          // weblink have no id
          reject('no appId');
        }
      });

      return promise;
    },

    setIconData: function setIconData(iconData) {
      if (iconData && iconData.MIMEType && iconData.data) {
        this.iconData = {
          'MIMEType': iconData.MIMEType,
          'data': iconData.data
        };
      }
    },

    getIcon: function getIcon() {
      var self = this;

      var promise = new window.Promise(function done(resolve, reject) {
        if (self.icon) {
          resolve(self);
        } else {
          var dataPromise = self.getIconData();

          dataPromise.then(
            function onresolve(iconData) {
              Evme.Utils.getRoundIcon({
                'src': 'data:' + iconData.MIMEType + ';base64,' + iconData.data
              }, function setIcon(roundedIcon) {
                self.icon = roundedIcon;
                resolve(self);
              });
            },
            function onreject(reason) {
              reject(self);
            });
        }
      });

      return promise;
    },

    setIcon: function setIcon(icon) {
      this.icon = icon;
    },

    setDefaultIcon: function setDefaultIcon() {
      this.setIcon(getDefaultIcon());
    }
  };

  Evme.SearchResult = SearchResult;
})();
