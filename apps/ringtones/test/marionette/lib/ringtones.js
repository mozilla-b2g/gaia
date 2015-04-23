/* jshint node: true*/
/* global marionetteScriptFinished */
/* exported findElement */

'use strict';

function createElementGetters(object, parentName, elementNames) {
  elementNames.forEach(function(name) {
    Object.defineProperty(object.prototype, name, {
      get: function() {
        return this[parentName].findElement(object.Selectors[name]);
      }
    });
  });
}

/***** Popup windows *****/

function CustomDialog(client) {
  this.client = client;
}

CustomDialog.Selectors = Object.freeze({
  element: 'form#dialog-screen',
  cancelButton: 'button#dialog-no',
  confirmButton: 'button#dialog-yes'
});

CustomDialog.prototype = {
  waitUntilCreated: function() {
    this.client.helper.waitForElement(CustomDialog.Selectors.element);
  }
};
createElementGetters(
  CustomDialog, 'client', ['cancelButton', 'confirmButton']
);

function ActionsMenu(client) {
  this.client = client;
  this.element = this.client.findElement(ActionsMenu.Selectors.menu);
}

ActionsMenu.Selectors = Object.freeze({
  menu: 'form#ringtone-actions',
  shareButton: 'button[data-action="share"]',
  deleteButton: 'button[data-action="delete"]',
  cancelButton: 'button[data-action="cancel"]',
  shareMenu: 'form[data-z-index-level="action-menu"]'
});

ActionsMenu.prototype = {
  waitUntilOpened: function() {
    this.client.waitFor(function() {
      return this.element.displayed();
    }.bind(this));
  },

  waitForDialog: function() {
    var dialog = new CustomDialog(this.client);
    dialog.waitUntilCreated();
    return dialog;
  },

  // TODO(gareth): Move this shareMenu stuff into the helper.
  get shareMenu() {
    // Switch to the system app first.
    this.client.switchToFrame();
    return this.client.helper.waitForElement(ActionsMenu.Selectors.shareMenu);
  },

  shareWith: function(appName) {
    var shareMenu = this.shareMenu;
    var list = shareMenu.findElements('button');
    for (var i = 0; i < list.length; i++) {
      if (list[i].text() === appName) {
        return list[i];
      }
    }
    return null;
  }
};
createElementGetters(
  ActionsMenu, 'element', ['shareButton', 'deleteButton', 'cancelButton']
);

// ***** Sounds *****

function BaseSound(client, element) {
  this.client = client;
  this.element = element;
}

BaseSound.Selectors = Object.freeze({
  name: 'p.name',
  subtitle: 'p.subtitle'
});

BaseSound.prototype = {
  get name() {
    return this.element.findElement(BaseSound.Selectors.name).text();
  },

  get subtitle() {
    var subtitle = this.element.findElement(BaseSound.Selectors.subtitle);
    return subtitle ? subtitle.text() : undefined;
  }
};

function ManageSound(client, element) {
  BaseSound.call(this, client, element);
}
ManageSound.prototype = Object.create(BaseSound.prototype);
ManageSound.prototype.constructor = ManageSound;

ManageSound.Selectors = Object.freeze({
  description: 'div.desc',
  actionsButton: 'a.actions-button'
});

ManageSound.prototype.tap = function() {
  this.element.findElement(ManageSound.Selectors.description).tap(20, 20);
};

ManageSound.prototype.openActions = function() {
  this.element.findElement(ManageSound.Selectors.actionsButton).tap();
  var actionsMenu = new ActionsMenu(this.client);
  actionsMenu.waitUntilOpened();
  return actionsMenu;
};

Object.defineProperty(ManageSound.prototype, 'playing', {
  get: function() {
    return this.element.getAttribute('data-playing') === 'true';
  }
});

function PickSound(client, element) {
  BaseSound.call(this, client, element);
}
PickSound.prototype = Object.create(BaseSound.prototype);
PickSound.prototype.constructor = PickSound;

PickSound.Selectors = Object.freeze({
  input: 'input[type="radio"]'
});

Object.defineProperty(PickSound.prototype, 'selected', {
  get: function() {
    return Boolean(this.element.findElement(PickSound.Selectors.input)
                       .getAttribute('checked'));
  }
});

PickSound.prototype.select = function() {
  this.element.tap();
  this.client.waitFor(function() {
    return this.selected;
  }.bind(this));
};

// ***** Sound Lists *****

function BaseSoundList(client, element, Sound) {
  this.client = client;
  this.element = element;
  this.Sound = Sound;
}

BaseSoundList.Selectors = Object.freeze({
  header: 'gaia-subheader > span',
  sound: 'li'
});

BaseSoundList.prototype = {
  client: null,

  displayed: function(callback) {
    return this.element.displayed(callback);
  },

  get sounds() {
    // hack to find quicker that we have no elements
    var quickly = this.client.scope({ searchTimeout: 50 });
    this.element.client = quickly;

    var elts = this.element.findElements(
      BaseSoundList.Selectors.sound
    );

    this.element.client = this.client;

    return elts.map(function(element) {
      return new this.Sound(this.client, element);
    }.bind(this));
  }
};
createElementGetters(BaseSoundList, 'element', ['header']);

function ManageSoundList(client, element) {
  BaseSoundList.call(this, client, element, ManageSound);
}
ManageSoundList.prototype = Object.create(BaseSoundList.prototype);
ManageSoundList.prototype.constructor = ManageSoundList;

function PickSoundList(client, element) {
  BaseSoundList.call(this, client, element, PickSound);
}
PickSoundList.prototype = Object.create(BaseSoundList.prototype);
PickSoundList.prototype.constructor = PickSoundList;

Object.defineProperty(PickSoundList.prototype, 'selectedSound', {
  get: function() {
    var sounds = this.sounds;
    for (var i = 0; i < sounds.length; i++) {
      if (sounds[i].selected) {
        return sounds[i];
      }
    }
  }
});

// ***** Ringtones Containers *****

function BaseRingtonesContainer(client, SoundList) {
  this.client = client;
  this.SoundList = SoundList;
  this.client.helper.waitForElement(
    BaseRingtonesContainer.Selectors.readyBody
  );
}

BaseRingtonesContainer.Selectors = Object.freeze({
  readyBody: 'body[data-ready]',
  soundLists: 'article#list-parent > section'
});

BaseRingtonesContainer.prototype = {
  client: null,

  get soundLists() {
    return this.client.findElements(
      BaseRingtonesContainer.Selectors.soundLists
    ).map(function(element) {
      return new this.SoundList(this.client, element);
    }.bind(this));
  },
};

function ManageRingtonesContainer(client) {
  BaseRingtonesContainer.call(this, client, ManageSoundList);
}
ManageRingtonesContainer.prototype = Object.create(
  BaseRingtonesContainer.prototype
);
ManageRingtonesContainer.prototype.constructor = ManageRingtonesContainer;

ManageRingtonesContainer.Selectors = Object.freeze({
  backButton: '#header',
  addButton: 'button#add',
  shareFrame: 'iframe[data-url$="share.html"]'
});

createElementGetters(
  ManageRingtonesContainer, 'client', ['backButton', 'addButton']
);

ManageRingtonesContainer.prototype.addCustomRingtone = function(info) {
  return this.client.executeAsyncScript(function(info) {
    var customRingtones = window.wrappedJSObject.customRingtones;
    customRingtones.add(JSON.parse(info)).then(function(tone) {
      marionetteScriptFinished({
        // Use the private members of tone, since the getters are getting Xrayed
        // into oblivion. See bug 987111.
        name: tone._name, subtitle: tone._subtitle, id: tone._id
      });
    }, function(error) {
      marionetteScriptFinished(null);
    });
  }, [JSON.stringify(info)]);
};

ManageRingtonesContainer.prototype.waitUntilLoaded = function() {
  this.client.waitFor(function() {
    return this.soundLists.length === 2;
  }.bind(this));
};

ManageRingtonesContainer.prototype.waitForNewRingtoneWindow =
  function(callback) {
    this.client.switchToFrame();
    var win = this.client.helper.waitForElement(
      ManageRingtonesContainer.Selectors.shareFrame
    );
    this.client.switchToFrame(win);

    callback(new NewRingtoneContainer(this.client));

    this.client.switchToFrame();
    this.client.apps.switchToApp(Ringtones.URL);
  };

function PickRingtoneContainer(client) {
  BaseRingtonesContainer.call(this, client, PickSoundList);
}
PickRingtoneContainer.prototype = Object.create(
  BaseRingtonesContainer.prototype
);
PickRingtoneContainer.prototype.constructor = PickRingtoneContainer;

PickRingtoneContainer.Selectors = Object.freeze({
  cancelButton: '#header',
  setButton: 'button#set'
});

PickRingtoneContainer.prototype.waitUntilLoaded = function() {
  this.client.waitFor(function() {
    return this.soundLists.length === 3;
  }.bind(this));
};

createElementGetters(
  PickRingtoneContainer, 'client', ['cancelButton', 'setButton']
);

Object.defineProperty(PickRingtoneContainer.prototype, 'selectedSound', {
  get: function() {
    var lists = this.soundLists;
    for (var i = 0; i < lists.length; i++) {
      if (lists[i].selectedSound) {
        return lists[i].selectedSound;
      }
    }
  }
});

function NewRingtoneContainer(client) {
  this.client = client;

  // For some reason, we can't add blobs to indexedDB in Marionette
  // tests, so just null out our blob.
  this.client.executeScript(function() {
    var customRingtones = window.wrappedJSObject.customRingtones;
    var oldAdd = customRingtones.add;
    customRingtones.add = function(info) {
      return oldAdd.call(
        customRingtones, {name: info.name, subtitle: info.subtitle}
      );
    };
  });
}

NewRingtoneContainer.Selectors = Object.freeze({
  cancelButton: '#header',
  saveButton: 'button#save',

  songTitle: '#songtitle',
  artist: '#artist'
});

NewRingtoneContainer.prototype = {
  get songTitle() {
    return this.client.findElement(
      NewRingtoneContainer.Selectors.songTitle
    ).text();
  },

  get artist() {
    return this.client.findElement(
      NewRingtoneContainer.Selectors.artist
    ).text();
  },

  waitForSongInfo: function(expectedTitle, expectedArtist) {
    this.client.waitFor(function() {
      return this.songTitle === expectedTitle && this.artist === expectedArtist;
    }.bind(this));
  }
};

createElementGetters(
  NewRingtoneContainer, 'client', ['cancelButton', 'saveButton']
);

var SETTINGS_URL = 'app://settings.gaiamobile.org';

// XXX: This is a workaround for changes in the system app; see bug 950673.
// I neither know (nor care) why this works, but we should probably fix it
// up when a better way comes along.
function switchToAppFixed(client, url) {
  client.switchToFrame();
  var frame = client.findElement('iframe[src*="' + url + '"]');
  client.switchToFrame(frame, {focus: true});
  client.helper.wait(500);
}

/**
 * Abstraction around Ringtones app.
 * @constructor
 * @param {Marionette.Client} client for operations.
 */
function Ringtones(client) {
  this.client = client;
}

/**
 * @type String Origin of Ringtones app
 */
Ringtones.URL = 'app://ringtones.gaiamobile.org';

module.exports = Ringtones;

Ringtones.prototype = {
  client: null,

  switchToMe: function() {
    this.client.switchToFrame();
    this.client.apps.switchToApp(Ringtones.URL);
  },

  inAlertTones: function(soundPanel, callback) {
    soundPanel.clickAlertToneSelect();
    this.switchToMe();

    callback(new PickRingtoneContainer(this.client));

    switchToAppFixed(this.client, SETTINGS_URL);
  },

  inRingTones: function(soundPanel, callback) {
    soundPanel.clickRingToneSelect();
    this.switchToMe();

    callback(new PickRingtoneContainer(this.client));

    switchToAppFixed(this.client, SETTINGS_URL);
  },

  inManager: function(soundPanel, callback) {
    soundPanel.clickManageTones();
    this.switchToMe();

    callback(new ManageRingtonesContainer(this.client));

    switchToAppFixed(this.client, SETTINGS_URL);
  },

  inShare: function(callback) {
    this.switchToMe();
    callback(new NewRingtoneContainer(this.client));
  }
};
