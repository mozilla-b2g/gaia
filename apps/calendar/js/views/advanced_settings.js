(function(window) {

  var template = Calendar.Templates.Account;

  function AdvancedSettings(options) {
    Calendar.View.apply(this, arguments);

    this._initEvents();
  }

  AdvancedSettings.prototype = {
    __proto__: Calendar.View.prototype,

    selectors: {
      element: '#advanced-settings-view',
      accountList: '#advanced-settings-view .account-list'
    },

    get accountList() {
      return this._findElement('accountList');
    },

    _formatModel: function(model) {
      //XXX: Here for l10n
      return {
        id: model._id,
        preset: model.preset,
        user: model.user
      };
    },

    _initEvents: function() {
      var store = this.app.store('Account');
      store.on('add', this._addAccount.bind(this));
      store.on('remove', this._removeAccount.bind(this));
    },

    _addAccount: function(id, model) {
      var item = template.account.render(
        this._formatModel(model)
      );

      this.accountList.insertAdjacentHTML('beforeend', item);
    },

    _removeAccount: function(id) {
      var htmlId = 'account-' + id;
      var el = document.getElementById(htmlId);

      if (el) {
        el.parentNode.removeChild(el);
      }
    },

    render: function() {
      var store = this.app.store('Account');
      var items = store.cached;
      var list = this.accountList;

      var key;
      var result = '';

      for (key in items) {
        if (items.hasOwnProperty(key)) {
          result += template.account.render(
            this._formatModel(items[key])
          );
        }
      }
      list.innerHTML = result;
    }
  };

  AdvancedSettings.prototype.onfirstseen = AdvancedSettings.prototype.render;
  Calendar.ns('Views').AdvancedSettings = AdvancedSettings;

}(this));
