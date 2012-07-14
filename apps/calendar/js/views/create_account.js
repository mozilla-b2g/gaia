(function(window) {

  if (typeof(Calendar) === 'undefined') {
    window.Calendar = {};
  }

  if (typeof(Calendar.Views) === 'undefined') {
    Calendar.Views = {};
  }

  var template = Calendar.Templates.Account;

  function CreateAccount(options) {
    var key;

    if (typeof(options) === 'undefined') {
      options = {};
    }

    for (key in options) {
      if (options.hasOwnProperty(key)) {
        this[key] = options[key];
      }
    }

    // set this.element
    Calendar.View.call(this, this.selectors.element);

    this._initEvents();
  }

  CreateAccount.prototype = {
    __proto__: Calendar.View.prototype,

    selectors: {
      element: '#create-account-view',
      accounts: '#create-account-presets'
    },

    get accounts() {
      return this._findElement('accounts');
    },

    _initEvents: function() {
    },

    _updateAccountPresets: function() {
      var list = Calendar.Presets;
      var output;

      Object.keys(list).forEach(function(preset) {
        output = template.accountItem.render({ name: preset });
        this.accounts.insertAdjacentHTML('beforeend', output);
      }, this);
    },

    render: function() {
      this._updateAccountPresets();
    }

  };

  CreateAccount.prototype.onfirstseen = CreateAccount.prototype.render;
  Calendar.Views.CreateAccount = CreateAccount;

}(this));
