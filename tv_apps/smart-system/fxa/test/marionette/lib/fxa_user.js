'use strict';

var config = require('./config.json');

/**
 * FxA user handler for email, password & string generations
 * @constructor
 */
function FxAUser() {
}

FxAUser.prototype = {
  _randString: function(len, charSet){
    charSet = charSet || 'abcdefghijklmnopqrstuvwxyz0123456789';
    var rand = '';
    for (var i = 0; i < len; i++) {
      var randomPoz = Math.floor(Math.random() * charSet.length);
      rand += charSet.substring(randomPoz, randomPoz + 1);
    }
    return rand;
  },

  get _uniqueUserName() {
      return this._randString(config.USERNAME_LEN);
  },

  /**
   * @TODO bug 1052267
   * add ability to generate variety of "invalid" email strings
   */
   email: function(userType) {
     switch(userType) {
       case config.USER_NEW:
         return this._uniqueUserName + '@' + config.MAIL_HOST;
       default:
         return config.USER_EXISTING_EMAIL + '@' + config.MAIL_HOST;
     }
   },

   /**
    * @TODO bug 1052267
    * add ability to generate variety of "invalid" password strings
    */
    password: function(userType) {
      switch(userType) {
        case config.USER_NEW:
          return config.USER_NEW_PW;
        default:
          return config.USER_EXISTING_PW;
      }
    }
};

module.exports = FxAUser;
