'use strict';
/* global Applications, ManifestHelper, OptionMenu,
          SettingsCache, SettingsList */
(function(exports) {

  function SetupGroupList() {
    this.bindSelf();
    this.getSettings();
  }

  var proto = SetupGroupList.prototype = new SettingsList();

  proto.getSettings = function sgl_getSettings() {
    var self = this;
    SettingsCache.get('landing_app.manifestURL', function getDefault(val) {
      self.landingAppManifestURL = val;
      if (self.ready) {
        self.updateLandingAppText(val);
      } else {
        self.once('ready', self.updateLandingAppText.bind(self, val));
      }
    });
  };

  proto.confirmSelection = function sgl_confirmSelection() {
    var dom = this.spatialNavigation.getFocusedElement();
    switch(dom.id) {
      case 'menu-item-landing-page':
        this.changeLandingPage();
        break;
    }
  };

  proto.changeLandingPage = function sgl_changeLandingPage() {
    var self = this;
    var options = new OptionMenu();
    // We don't need to bind it again because it already binds itself.
    this.listDecks(this.landingAppManifestURL).forEach(options.addMenuItem);
    this.fire('showOptionMenu', options);
    options.on('itemConfirmed', function optionConfirmed(item) {
      self.landingAppManifestURL = item.key;
      self.updateLandingAppText(item.key);
      self.fire('updateSettings', {
        'landing_app.manifestURL': item.key
      });
    });
  };

  proto.updateLandingAppText = function sgl_updateValueUI(manifestURL) {
    var span = this.panel.querySelector('#menu-item-landing-page > span');
    span.dataset.value = Applications.getName(manifestURL, '');
  };

  proto.handleChoosed = function sgl_handleChoosed(dom) {
    if (!dom) {
      return;
    }
    this.selectionBorder.select(dom);
    dom.classList.add('focused');

    var eventData = {
      'dom': dom
    };
    switch(dom.id) {
      case 'menu-item-landing-page':
        eventData.type = 'option-menu';
        break;
    }

    this.fire('itemChoosed', eventData);
  };

  proto.listDecks = function sg_listDecks(current) {
    var decks = Applications.listAppsByRole();
    var deckItems = [];

    for (var i = 0; i < decks.length; i++) {
      var manifest = new ManifestHelper(decks[i].app.manifest);
      deckItems[deckItems.length] = {
        key: decks[i].manifestURL,
        label: manifest.name,
        selected: (decks[i].manifestURL === current)
      };
    }

    return deckItems;
  };

  exports.SetupGroupList = SetupGroupList;
})(window);
