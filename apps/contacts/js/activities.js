var ActivityHandler = {
  _currentActivity: null,

  get currentlyHandling() {
    return !!this._currentActivity;
  },

  get activityName() {
    if (!this._currentActivity) {
      return null;
    }

    return this._currentActivity.source.name;
  },

  handle: function ah_handle(activity) {
    this._currentActivity = activity;

    switch (this.activityName) {
      case 'new':
        document.location.hash = 'view-contact-form';
        if (this._currentActivity.source.data.params) {
          var param, params = [];
          for (var i in this._currentActivity.source.data.params) {
            param = this._currentActivity.source.data.params[i];
            params.push(i + '=' + param);
          }
          document.location.hash += '?' + params.join('&');
        }
        break;
      case 'pick':
        Contacts.navigation.home();
        break;
      case 'importFB':
        document.location = 'fb_import.html';
        break;
    }
  },

  postNewSuccess: function ah_postNewSuccess(contact) {
    this._currentActivity.postResult({contact: contact});
    this._currentActivity = null;
  },

  postPickSuccess: function ah_postPickSuccess(number) {
    this._currentActivity.postResult({ number: number });
    this._currentActivity = null;
  },

  postCancel: function ah_postCancel() {
    this._currentActivity.postError('canceled');
    this._currentActivity = null;
  }
};
