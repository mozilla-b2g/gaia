/**
 * Abstraction around keyboard app.
 * constructor
 * param {Marionette.Client} client for operations.
 */
function Keyboard(client) {
  this.client = client;
  this.keyboardFrame = null;
}

// Keyboard.URL = 'app://Keyboard.gaiamobile.org';

Keyboard.Selectors = {
  'languageKeyLocator': '.keyboard-row button[data-keycode="-3"]',
  'dotcomKeyLocator': '.keyboard-row button[data-compositekey=".com"]'
};

Keyboard.specificKeyCode = {
  'numericSignKey': -2,
  'alphaKey': -1,
  'backspaceKey': 8,
  'enterKey': 13,
  'altKey': 18,
  'upperCaseKey': 20,
  'spaceKey': 32
};
/**
 * private
 * param {Marionette.Client} client for selector.
 * param {String} name of selector [its a key in Keyboard.Selectors].
 */
function findElement(client, name) {
  return client.findElement(Keyboard.Selectors[name]);
}

Keyboard.prototype = {

  get languageKey() {
    return findElement(this.client, 'languageKeyLocator');
  },

  get dotcomKey() {
    return findElement(this.client, 'dotcomKeyLocator');
  },

  switchToNumericSign: function() {
    this.tapKey(Keyboard.specificKeyCode['numericSignKey']);
    this.client.helper.waitForElement('button.keyboard-key[data-keycode="' +
                            Keyboard.specificKeyCode['alphaKey'] + '"]');
  },

  switchToAlphaKey: function() {
    this.tapKey(Keyboard.specificKeyCode['alphaKey']);
    this.client.helper.waitForElement('button.keyboard-key[data-keycode="' +
                            Keyboard.specificKeyCode['numericSignKey'] + '"]');
  },

  switchToKeyboard: function(launchPatch) {
    // switch to system
    // switch to specific keyboard frame
    var iframeSelectors =
              '#keyboards iframe[data-frame-path="/' + launchPatch + '"]';
    this.keyboardFrame = this.client.findElement(iframeSelectors);
    var self = this;
    this.client.waitFor(function waiting() {
      var location = self.keyboardFrame.location();
      return location.y == 0;
    });
    this.client.switchToFrame(this.keyboardFrame);
  },

  tapKey: function(keycode) {
    //find the botton and type it
    var qButton = this.client.findElement('button.keyboard-key[data-keycode="' +
                                                                keycode + '"]');
    qButton.click();
  },

  tapString: function(keys) {
    var upperExp = /^[A-Z]+$/;
    var alphaExp = /^[A-z]+$/;
    for (var i in keys) {
      if (!keys[i].match(alphaExp)) {
        // switchToNumericSign panel
        this.switchToNumericSign();
        this.tapKey(keys.charCodeAt(i));
        this.switchToAlphaKey();
      } else {
        if (keys[i].match(upperExp)) {
          // switch uppercase mode
          this.tapKey(Keyboard.specificKeyCode['upperCaseKey']);
        }
        this.tapKey(keys.charCodeAt(i));
      }
    }
  }
};

module.exports = Keyboard;
