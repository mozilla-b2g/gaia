var ActivityHandler = {
  _currentActivity: null,

  _launchedAsInlineActivity: (window.location.search == '?pick'),

  get currentlyHandling() {
    return !!this._currentActivity;
  },

  get activityName() {
    if (!this._currentActivity) {
      return null;
    }

    return this._currentActivity.source.name;
  },

  get activityDataType() {
    if (!this._currentActivity) {
      return null;
    }

    return this._currentActivity.source.data.type;
  },

  launch_activity: function ah_launch(activity, action) {
    if (this._launchedAsInlineActivity)
      return;

    this._currentActivity = activity;
    var hash = action;
    var param, params = [];
    if (activity.source &&
        activity.source.data && activity.source.data.params) {
      var originalParams = activity.source.data.params;
      for (var i in originalParams) {
        param = originalParams[i];
        params.push(i + '=' + param);
      }
      hash += '?' + params.join('&');
    }
    document.location.hash = hash;
  },
  handle: function ah_handle(activity) {
    switch (activity.source.name) {
      case 'new':
        this.launch_activity(activity, 'view-contact-form');
        break;
      case 'open':
        this.launch_activity(activity, 'view-contact-details');
        break;
      case 'update':
        this.launch_activity(activity, 'add-parameters');
        break;
      case 'pick':
        if (!this._launchedAsInlineActivity)
          return;

        this._currentActivity = activity;
        Contacts.navigation.home();
        break;
    }
    Contacts.checkCancelableActivity();
  },

  postNewSuccess: function ah_postNewSuccess(contact) {
    // XXX: the contact cannot be passed if we don't duplicate it
    var dupContact = {};
    for (var attr in contact) {
      dupContact[attr] = contact[attr];
    }

    this._currentActivity.postResult({ contact: dupContact });
    this._currentActivity = null;
  },

  postPickSuccess: function ah_postPickSuccess(result) {
    this._currentActivity.postResult(result);
    this._currentActivity = null;
  },

  postCancel: function ah_postCancel() {
    this._currentActivity.postError('canceled');
    this._currentActivity = null;
  }
};
