(function(exports) {
'use strict';

/**
 * Module dependencies
 */
var debug = Calendar.debug('provider'),
    isOnline = Calendar.isOnline,
    local = Calendar.Provider.local,
    worker = Calendar.Provider.worker;

/**
 * Private state
 */
var app,
    calendarStore,
    eventStore;

Object.defineProperty(exports, 'app', {
  get: function() {
    return app;
  },

  set: function(value) {
    app = value;
    local.app = value;
    worker.app = value;
    calendarStore = value.store('Calendar');
    eventStore = value.store('Event');
  }
});

exports.isLocal = local.isLocal;

exports.getAccount = function(account) {
  return request('getAccount', { account: account });
};

exports.findCalendars = function(account) {
  return request('findCalendars', { account: account });
};

exports.syncEvents = function(account, calendar) {
  return request('syncEvents', { account: account, calendar: calendar });
};

exports.ensureRecurrencesExpanded = function(maxDate) {
  return request('ensureRecurrencesExpanded', { maxDate: maxDate });
};

exports.createEvent = function(event, busytime) {
  return eventStore.ownersOf(event).then((owners) => {
    return request('createEvent', {
      busytime: busytime,
      event: event,
      owners: owners
    });
  });
};

exports.updateEvent = function(event, busytime) {
  return eventStore.ownersOf(event).then((owners) => {
    return request('updateEvent', {
      busytime: busytime,
      event: event,
      owners: owners
    });
  });
};

exports.deleteEvent = function(event, busytime) {
  return eventStore.ownersOf(event).then((owners) => {
    return request('deleteEvent', {
      busytime: busytime,
      event: event,
      owners: owners
    });
  });
};

exports.createICalComponentForEvent = function(event) {
  return eventStore.ownersOf(event).then((owners) => {
    return request('createICalComponentForEvent', {
      event: event,
      owners: owners
    });
  });
};

exports.calendarCapabilities = function(calendar) {
  return calendarStore.ownersOf(calendar).then((owners) => {
    return request('calendarCapabilities', {
      calendar: calendar,
      owners: owners
    });
  });
};

exports.eventCapabilities = function(event) {
  return eventStore.ownersOf(event).then((owners) => {
    return request('eventCapabilities', {
      event: event,
      owners: owners
    });
  });
};

function request(method, options) {
  debug('Received request for ' + method);
  ensureReady();

  var account, calendar;
  if ('owners' in options) {
    options.account = account = options.owners.account;
    options.calendar = calendar = options.owners.calendar;
    options.details = options.owners;
  } else {
    account = options.account;
    calendar = options.account;
    options.details = { account: account, calendar: calendar };
  }

  var isLocal = method === 'ensureRecurrencesExpanded' ||
                (account && local.isLocal(account));

  if (isLocal) {
    switch (method) {
      case 'calendarCapabilities':
      case 'eventCapabilities':
      case 'findCalendars':
      case 'getAccount':
      case 'syncEvents':
        return local[method].call(null, options);
    }
  }

  if (!isLocal && !isOnline()) {
    return Promise.reject(createOfflineError());
  }

  options.sync = !isLocal;
  return worker[method].call(null, options);
}

/**
 * Create an error for the case when we're trying to perform a network
 * operation but we're not Internet-connected.
 */
function createOfflineError() {
  var l10n = window.navigator.mozL10n;
  var error = new Error();
  error.name = 'offline';
  error.message = l10n.get('error-offline');
  return error;
}

function ensureReady() {
  if (!app) {
    return Promise.reject(new Error('Provider was not initialized!'));
  }
}

}(Calendar.ns('Provider').provider = {}));
