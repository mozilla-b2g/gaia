(function(window) {

  function ModifyAccount(options) {
    Calendar.View.apply(this, arguments);

    this.save = this.save.bind(this);
  }

  ModifyAccount.prototype = {
    __proto__: Calendar.View.prototype,

    selectors: {
      element: '#modify-account-view',
      form: '#modify-account-view form',
      fields: '*[name]',
      saveButton: '#modify-account-view .save-icon',
      errors: '#modify-account-view .errors'
    },

    progressClass: 'in-progress',

    get saveButton() {
      return this._findElement('saveButton');
    },

    get errors() {
      return this._findElement('errors');
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

    _clearErrors: function() {
      this.errors.textContent = '';
    },

    _displayError: function(err) {
      this.errors.textContent = err.message;
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

    save: function() {
      var list = this.element.classList;
      var self = this;

      list.add(this.progressClass);

      this._persistForm(function(err) {
        list.remove(self.progressClass);
        if (!err) {
          self.app.go(self.completeUrl);
        }
      });
    },

    /**
     * Persist the form
     *
     * @param {Function} callback node style.
     */
    _persistForm: function(callback) {
      var self = this;

      this._clearErrors();
      this.updateModel();
      this.model.setup(function(err, success) {
        if (err) {
          self._displayError(err);
          callback(err);
          return;
        }

        // XXX: Handle Errors
        var store = self.app.store('Account');
        store.persist(self.model, function(err, success) {
          // unblock user
          if (err) {
            self._displayError(err);
            callback(err);
            return;
          }
          callback(null, success);
        });
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

      if (this.model._id) {
        this.type = 'update';
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
    },

    oninactive: function() {
      Calendar.View.prototype.oninactive.apply(this, arguments);
      this.destroy();
    },

    dispatch: function(data) {
      var params = data.params;
      var self = this;

      function updateModel(err, model) {
        self.model = model;
        self.render();
      }

      if (params.id) {
        this._updateModel(params.id, updateModel);
        this.completeUrl = '/settings/';
      } else if (params.preset) {
        this._createModel(params.preset, updateModel);
        this.completeUrl = '/settings/';
      }
    }

  };

  Calendar.ns('Views').ModifyAccount = ModifyAccount;

}(this));
