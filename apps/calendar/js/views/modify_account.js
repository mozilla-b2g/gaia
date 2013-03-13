(function(window) {

  function ModifyAccount(options) {
    Calendar.View.apply(this, arguments);

    this.save = this.save.bind(this);
    this.deleteRecord = this.deleteRecord.bind(this);
    this.cancel = this.cancel.bind(this);

    this.accountHandler = new Calendar.Utils.AccountCreation(
      this.app
    );

    this.accountHandler.on('authorizeError', this);
  }

  ModifyAccount.prototype = {
    __proto__: Calendar.View.prototype,

    selectors: {
      element: '#modify-account-view',
      form: '#modify-account-view form',
      fields: '*[name]',
      saveButton: '#modify-account-view .save',
      deleteButton: '#modify-account-view .delete-confirm',
      cancelDeleteButton: '#modify-account-view .delete-cancel',
      backButton: '#modify-account-view .cancel',
      status: '#modify-account-view section[role="status"]',
      errors: '#modify-account-view .errors'
    },

    progressClass: 'in-progress',

    get deleteButton() {
      return this._findElement('deleteButton');
    },

    get cancelDeleteButton() {
      return this._findElement('cancelDeleteButton');
    },

    get backButton() {
      return this._findElement('backButton');
    },

    get saveButton() {
      return this._findElement('saveButton');
    },

    get form() {
      return this._findElement('form');
    },

    get fields() {
      if (!this._fields) {
        var result = this._fields = {};
        var elements = this.element.querySelectorAll(
          this.selectors.fields
        );

        var i = 0;
        var len = elements.length;

        for (i; i < len; i++) {
          var el = elements[i];
          result[el.getAttribute('name')] = el;
        }
      }

      return this._fields;
    },

    handleEvent: function(event) {
      var type = event.type;
      var data = event.data;

      switch (type) {
        case 'authorizeError':
          // we only expect one argument an error object.
          this.showErrors(data[0]);
          break;
      }
    },

    updateForm: function() {
      var update = ['user', 'fullUrl'];

      update.forEach(function(name) {
        var field = this.fields[name];
        field.value = this.model[name];
      }, this);
    },

    updateModel: function() {
      var update = ['user', 'password', 'fullUrl'];

      update.forEach(function(name) {
        var field = this.fields[name];
        this.model[name] = field.value;
      }, this);
    },

    deleteRecord: function() {
      var app = this.app;
      var id = this.model._id;
      var store = app.store('Account');

      store.remove(id, function() {
        // semi-hack clear the :target - harmless in tests
        // but important in the current UI because css :target
        // does not get cleared (for some reason)
        window.location.replace('#');

        // TODO: in the future we may want to store the entry
        // url of this view and use that instead of this
        // hard coded value...
        app.router.show('/advanced-settings/');
      });
    },

    cancel: function(event) {
      if (event) {
        event.preventDefault();
      }

      window.back();
    },

    save: function() {
      var list = this.element.classList;
      var self = this;

      if (this.app.offline()) {
        this.showErrors([{name: 'offline'}]);
        return;
      }

      list.add(this.progressClass);

      this.errors.textContent = '';
      this.updateModel();

      this.accountHandler.send(this.model, function(err) {
        list.remove(self.progressClass);
        if (!err) {
          self.app.go(self.completeUrl);
        }
      });
    },

    /**
     * @param {String} preset name of value in Calendar.Presets.
     */
    _createModel: function(preset, callback) {
      var settings = Calendar.Presets[preset];
      var model = new Calendar.Models.Account(
        settings.options
      );

      model.preset = preset;
      return model;
    },

    /**
     * @param {String} id account id.
     */
    _updateModel: function(id, callback) {
      var store = this.app.store('Account');
      var self = this;

      return store.cached[id];
    },

    render: function() {
      if (!this.model) {
        throw new Error('must provider model to ModifyAccount');
      }

      var list = this.element.classList;

      this.saveButton.addEventListener('click', this.save);
      this.backButton.addEventListener('click', this.cancel);

      if (this.model._id) {
        this.type = 'update';
        this.deleteButton.addEventListener('click', this.deleteRecord);
        this.cancelDeleteButton.addEventListener('click',
                                                 this.cancel);
      } else {
        this.type = 'create';
      }

      this.form.reset();
      this.updateForm();

      list.add(this.type);
      list.add('preset-' + this.model.preset);
      list.add('provider-' + this.model.providerType);
    },

    destroy: function() {
      var list = this.element.classList;

      list.remove(this.type);

      list.remove('preset-' + this.model.preset);
      list.remove('provider-' + this.model.providerType);

      this._fields = null;
      this.form.reset();

      this.saveButton.removeEventListener('click', this.save);
      this.deleteButton.removeEventListener('click', this.deleteRecord);
      this.cancelDeleteButton.removeEventListener('click',
                                                  this.cancel);
      this.backButton.removeEventListener('click',
                                                this.cancel);
    },

    dispatch: function(data) {
      if (this.model)
        this.destroy();

      var provider;
      var autoSubmit;
      var params = data.params;

      if (params.id) {
        this.model = this._updateModel(params.id);
        this.completeUrl = '/settings/';
      } else if (params.preset) {
        this.model = this._createModel(params.preset);
        this.completeUrl = '/settings/';
      }

      if (this.model && this.model.providerType) {
        provider = this.app.provider(this.model.providerType);
        autoSubmit = !provider.useCredentials && !provider.useUrl;
      }

      // when provider requires no credentials
      // auto submit form (which will also redirect)
      if (provider && autoSubmit) {
        this.save();
      } else {
        this.render();
      }
    }

  };

  Calendar.ns('Views').ModifyAccount = ModifyAccount;

}(this));
