Calendar.ns('Views').ModifyAccount = (function() {

  var DEFAULT_AUTH_TYPE = 'basic';
  var OAUTH_AUTH_CREDENTIALS = [
    'client_id',
    'scope',
    'redirect_uri',
    'state'
  ];

  function ModifyAccount(options) {
    Calendar.View.apply(this, arguments);

    this.deleteRecord = this.deleteRecord.bind(this);
    this.cancel = this.cancel.bind(this);
    this.displayOAuth2 = this.displayOAuth2.bind(this);

    this.accountHandler = new Calendar.Utils.AccountCreation(
      this.app
    );

    this.accountHandler.on('authorizeError', this);

    // bound so we can add remove listeners
    this._boundSaveUpdateModel = this.save.bind(this, { updateModel: true });
  }

  ModifyAccount.prototype = {
    __proto__: Calendar.View.prototype,

    _changeToken: 0,

    selectors: {
      element: '#modify-account-view',
      form: '#modify-account-view form',
      fields: '*[name]',
      saveButton: '#modify-account-view .save',
      deleteButton: '#modify-account-view .delete-confirm',
      cancelDeleteButton: '#modify-account-view .delete-cancel',
      backButton: '#modify-account-view .cancel',
      status: '#modify-account-view section[role="status"]',
      errors: '#modify-account-view .errors',
      oauth2Window: '#oauth2',
      oauth2SignIn: '#modify-account-view .force-oauth2'
    },

    progressClass: 'in-progress',

    get authenticationType() {
      if (this.preset && this.preset.authenticationType)
        return this.preset.authenticationType;

      return DEFAULT_AUTH_TYPE;
    },

    get oauth2Window() {
      return this._findElement('oauth2Window');
    },

    get oauth2SignIn() {
      return this._findElement('oauth2SignIn');
    },

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
        var value = field.value;
        if (name === 'fullUrl') {
          // Prepend a scheme if url has neither port nor scheme
          var port = Calendar.Utils.URI.getPort(value);
          var scheme = Calendar.Utils.URI.getScheme(value);
          if (!port && !scheme) {
            value = 'https://' + value;
          }
        }

        this.model[name] = value;
      }, this);
    },

    deleteRecord: function(e) {
      if (e) {
        e.preventDefault();
      }

      var app = this.app;
      var id = this.model._id;
      var store = app.store('Account');

      // begin the removal (which will emit the preRemove event) but don't wait
      // for it to complete...
      store.remove(id);

      // semi-hack clear the :target - harmless in tests
      // but important in the current UI because css :target
      // does not get cleared (for some reason)
      window.location.replace('#');

      // TODO: in the future we may want to store the entry
      // url of this view and use that instead of this
      // hard coded value...
      app.router.show('/advanced-settings/');
    },

    cancel: function(event) {
      if (event) {
        event.preventDefault();
      }

      window.back();
    },

    save: function(options, e) {

      if (e) {
        e.preventDefault();
      }

      var list = this.element.classList;
      var self = this;

      if (this.app.offline()) {
        this.showErrors([{name: 'offline'}]);
        return;
      }

      list.add(this.progressClass);

      this.errors.textContent = '';

      if (options && options.updateModel)
        this.updateModel();

      this.accountHandler.send(this.model, function(err) {
        list.remove(self.progressClass);
        if (!err) {
          self.app.go(self.completeUrl);
        }
      });
    },

    displayOAuth2: function(event) {
      if (event) {
        event.preventDefault();
      }

      var self = this;
      this.oauth2Window.classList.add(Calendar.View.ACTIVE);

      navigator.mozApps.getSelf().onsuccess = function(e) {
        var app = e.target.result;
        app.clearBrowserData().onsuccess = function() {
          return Calendar.App.loadObject(
            'OAuthWindow', self._redirectToOAuthFlow.bind(self)
          );
        };
      };
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

    _redirectToOAuthFlow: function() {

      var apiCredentials = this.preset.apiCredentials;
      var params = {
        /*
         * code response type for now might change when we can use window.open
         */
        response_type: 'code',
        /* offline so we get refresh_token[s] */
        access_type: 'offline',
        /* we us force so we always get a refresh_token */
        approval_prompt: 'force'
      };

      OAUTH_AUTH_CREDENTIALS.forEach(function(key) {
        if (key in apiCredentials) {
          params[key] = apiCredentials[key];
        }
      });

      var oauth = this._oauthDialog = new Calendar.OAuthWindow(
        this.oauth2Window,
        apiCredentials.authorizationUrl,
        params
      );

      var self = this;

      oauth.open();
      oauth.onabort = function() {
        self.cancel();
      };

      oauth.oncomplete = function(params) {
        if ('error' in params) {
          // Ruh roh
          return self.cancel();
        }

        if (!params.code) {
          return console.error('authentication error');
        }

        // Fistpump!
        self.model.oauth = { code: params.code };
        self.save();
      };
    },

    render: function() {
      if (!this.model) {
        throw new Error('must provider model to ModifyAccount');
      }

      this.form.addEventListener('submit', this._boundSaveUpdateModel);
      this.saveButton.addEventListener('click', this._boundSaveUpdateModel);
      this.backButton.addEventListener('click', this.cancel);

      if (this.model._id) {
        this.type = 'update';
        this.deleteButton.addEventListener('click', this.deleteRecord);
        this.cancelDeleteButton.addEventListener('click', this.cancel);
      } else {
        this.type = 'create';
      }

      var list = this.element.classList;
      list.add(this.type);
      list.add('preset-' + this.model.preset);
      list.add('provider-' + this.model.providerType);
      list.add('auth-' + this.authenticationType);

      if (this.model.error)
        list.add(Calendar.ERROR);

      if (this.authenticationType === 'oauth2') {
        this.oauth2SignIn.addEventListener('click', this.displayOAuth2);

        if (this.type === 'create') {
          this.displayOAuth2();
        }

        this.fields.user.disabled = true;
        this.saveButton.disabled = true;
      }

      this.form.reset();
      this.updateForm();

      var usernameType = this.model.usernameType;
      this.fields['user'].type = (usernameType === undefined) ?
          'text' : usernameType;
   },

    destroy: function() {
      var list = this.element.classList;

      list.remove(this.type);

      list.remove('preset-' + this.model.preset);
      list.remove('provider-' + this.model.providerType);
      list.remove('auth-' + this.authenticationType);
      list.remove(Calendar.ERROR);

      this.fields.user.disabled = false;
      this.saveButton.disabled = false;

      this._fields = null;
      this.form.reset();

      this.oauth2SignIn.removeEventListener('click', this.displayOAuth2);
      this.saveButton.removeEventListener('click', this._boundSaveUpdateModel);
      this.deleteButton.removeEventListener('click', this.deleteRecord);
      this.cancelDeleteButton.removeEventListener('click',
                                                  this.cancel);
      this.backButton.removeEventListener('click',
                                                this.cancel);
      this.form.removeEventListener('submit', this._boundSaveUpdateModel);
    },

    dispatch: function(data) {
      if (this.model)
        this.destroy();

      var params = data.params;
      var changeToken = ++this._changeToken;

      this.completeUrl = '/settings/';

      var self = this;
      function displayModel(err, model) {
        self.preset = Calendar.Presets[model.preset];

        // race condition another dispatch has queued
        // while we where waiting for an async event.
        if (self._changeToken !== changeToken)
          return;

        if (err) {
          console.log(
            'Error displaying model in ModifyAccount',
            data
          );
          return;
        }

        self.model = model;
        self.render();

        if (self.ondispatch) {
          self.ondispatch();
        }
      }

      if (params.id) {
        this.app.store('Account').get(params.id, displayModel);
      } else if (params.preset) {
        displayModel(null, this._createModel(params.preset));
      }
    },

    oninactive: function() {
      Calendar.View.prototype.oninactive.apply(this, arguments);

      if (this._oauthDialog) {
        this._oauthDialog.close();
        this._oauthDialog = null;
      }
    }
  };

  return ModifyAccount;

}());
