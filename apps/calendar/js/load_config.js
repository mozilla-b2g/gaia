(function(exports) {
'use strict';

/**
 * Constants
 */
var SNAKE = /(_|\/)([a-zA-Z])/g;
var SLASH = /\//g;

/**
 * Convert a string from snake_case to camelCase.
 */
function camelize(str) {
  str = str.replace(SNAKE, function(value) {
    // we want to trim the underscores
    if (value[0] === '_') {
      return value[1].toUpperCase();
    } else {
      // but keep the slashes
      return value.toUpperCase();
    }
  });

  str = str[0].toUpperCase() + str.slice(1);
  return str.replace(SLASH, '.');
}

exports.jsRoot = '/js/';
exports.styleRoot = '/style/';
exports.sharedJsRoot = '/shared/js/';
exports.sharedStyleRoot = '/shared/style/';
exports.storeRoot = 'store/';

exports.plugins = {};

exports.plugins.dom = function(id, obs, cb) {
  var node = document.getElementById(id);
  if (!node) {
    return cb();
  }

  LazyLoader.load([node], function nodeLoad() {
    navigator.mozL10n.translate(node);
    cb();
  });
};

exports.plugins.js = function lc_importJS(file, obs, cb) {
  var name = camelize(file);
  var existsInPage = Calendar.ns(name, true);

  // already loaded skip
  if (existsInPage) {
    Calendar.nextTick(cb);
    return;
  }

  file = this.config.jsRoot + file + '.js';
  LazyLoader.load([file], cb);
};

exports.plugins.shared = function lc_importShared(file, obs, cb) {
  file = this.config.sharedJsRoot + file + '.js';
  LazyLoader.load([file], cb);
};

exports.plugins.style = function lc_importStylesheet(file, obs, cb) {
  file = this.config.styleRoot + file + '.css';
  LazyLoader.load([file], cb);
};

exports.plugins.storeLoad = function lc_loadStore(file, obs, cb) {
  var name = camelize(file);
  file = this.config.storeRoot + file;

  this.load('js', file, function() {
    var store = Calendar.App.store(name);
    if (!store) {
      cb(new Error(
        'failed to execute storeLoad for "' + name + '". ' +
        'Store is missing...'
      ));
    }

    // preload the store...
    store.load(cb);
  });
};

exports.group = {};

exports.group['Views.Pan'] = {
  js: [
    'views/pan'
  ]
};

exports.group['Views.SingleDay'] = {
  js: [
    'utils/overlap',
    'views/single_day'
  ]
};

exports.group['Views.MultiDay'] = {
  group: [
    'View',
    'Views.SingleDay',
    'Views.Pan',
    'Views.CurrentTime',
    'Views.HourDoubleTap'
  ],

  'js': [
    'views/multi_day'
  ]
};

exports.group['Views.HourDoubleTap'] = {
  js: [
    'querystring',
    'utils/dom',
    'views/hour_double_tap'
  ]
};

exports.group['Views.Week'] = {
  dom: [
    'week-view'
  ],

  group: [
    'Views.MultiDay'
  ],

  js: [
    'views/week'
  ]
};

exports.group['Views.CurrentTime'] = {
  js: [
    'views/current_time'
  ]
};

exports.group['Views.TimeHeader'] = {
  js: [
    'view',
    'views/time_header'
  ]
};

exports.group['Views.Settings'] = {
  group: ['Templates.Calendar'],

  dom: ['settings'],

  js: [
    'view',
    'views/settings'
  ],

  style: ['settings']
};

exports.group['Views.MonthsDay'] = {
  group: [
    'Templates.MonthsDay',
    'Views.DayChild'
  ],
  js: [
    'views/months_day'
  ]
};

exports.group['Views.Month'] = {
  group: [
    'Views.MonthChild',
    'Templates.Month',
    'Views.TimeParent'
  ],

  js: [
    'views/month'
  ]
};

exports.group['Views.MonthChild'] = {
  group: [
    'Templates.Month'
  ],

  js: [
    'calc',
    'views/month_child'
  ]
};

exports.group['Views.ModifyEvent'] = {
  group: ['Views.EventBase'],

  dom: ['modify-event-view'],

  js: [
    'querystring',
    'templates/alarm',
    'views/modify_event'
  ],

  shared: ['input_parser'],

  style: ['modify_event_view']
};

exports.group['Views.ViewEvent'] = {
  group: ['Views.EventBase'],

  dom: ['event-view'],

  js: [
    'templates/duration_time',
    'templates/alarm',
    'views/view_event'
  ],

  shared: ['input_parser'],

  style: ['event_view']
};

exports.group['Views.EventBase'] = {
  group: ['Models.Event'],

  js: [
    'views/event_base'
  ]
};

exports.group['Views.ModifyAccount'] = {
  group: ['Utils.AccountCreation'],

  dom: ['modify-account-view'],

  js: [
    'view',
    'presets',
    'models/account',
    'utils/uri',
    'views/modify_account'
  ],

  style: ['modify_account_view']
};

exports.group['Views.Errors'] = {
  dom: ['lazy-styles', 'errors'],
  js: ['view', 'views/errors']
};

exports.group['Views.Day'] = {
  group: [
    'Views.TimeParent',
    'Views.DayChild'
  ],

  js: [
    'views/day'
  ]
};

exports.group['Views.DayChild'] = {
  group: [
    'Views.DayBased',
    'Views.CurrentTime'
  ],

  js: [
    'views/day_child'
  ]
};

exports.group['Views.DayBased'] = {
  group: ['Templates.Day'],

  js: [
    'calc',
    'querystring',
    'utils/ordered_map',
    'utils/overlap',
    'view',
    'views/day_based'
  ]
};

exports.group['Views.TimeParent'] = {
  js: [
    'view',
    'utils/ordered_map',
    'views/time_parent'
  ]
};

exports.group['Views.CreateAccount'] = {
  group: [
    'Models.Account',
    'Templates.Account',
    'Presets'
  ],

  dom: ['create-account-view'],

  js: [
    'views/create_account'
  ]
};

exports.group['Views.CalendarColors'] = {
  js: [
    'view',
    'models/calendar',
    'views/calendar_colors'
  ]
};

exports.group['Views.AdvancedSettings'] = {
  group: ['Templates.Account'],

  dom: ['advanced-settings-view'],

  js: [
    'templates/alarm',
    'views/advanced_settings'
  ]
};

exports.group['Views.FirstTimeUse'] = {
  js: [
    'views/first_time_use'
  ]
};

exports.group['Templates.Month'] = {
  js: [
    'template',
    'templates/month'
  ]
};

exports.group['Templates.DurationTime'] = {
  js: [
    'template',
    'templates/duration_time'
  ]
};

exports.group['Templates.MonthsDay'] = {
  js: [
    'template',
    'templates/months_day'
  ]
};

exports.group['Templates.Day'] = {
  js: [
    'template',
    'templates/day'
  ]
};

exports.group['Templates.Calendar'] = {
  // this is lame
  group: ['Provider.Local'],

  js: [
    'template',
    'templates/calendar'
  ]
};

exports.group['Templates.Account'] = {
  js: [
    'template',
    'templates/account'
  ]
};

exports.group['Utils.AccountCreation'] = {
  js: [
    'utils/account_creation'
  ]
};

exports.group['Provider.Local'] = {
  group: [
    'Provider.Abstract',
    'EventMutations'
  ],

  js: [
    'ext/uuid',
    'provider/local'
  ]
};

exports.group.EventMutations = {
  js: [
    'event_mutations',
    'ext/uuid'
  ]
};

exports.group['Provider.Abstract'] = {
  js: [
    'provider/abstract'
  ]
};

exports.group['Provider.CaldavPullEvents'] = {
  js: [
    'ext/uuid',
    'provider/caldav_pull_events'
  ]
};

exports.group['Provider.Caldav'] = {
  group: ['Provider.Abstract', 'Provider.Local'],
  js: [
    'provider/abstract',
    'provider/caldav',
    'provider/caldav_pull_events'
  ]
};

exports.group['Models.Account'] = {
  js: [
    'models/account'
  ]
};

exports.group['Models.Event'] = {
  js: ['models/event']
};

exports.group['Models.Calendar'] = {
  js: [
    'models/calendar'
  ]
};

exports.group['Controllers.RecurringEvents'] = {
  js: [
    'controllers/recurring_events'
  ]
};

exports.group['Controllers.Sync'] = {
  js: [
    'controllers/sync'
  ]
};

exports.group['Controllers.Service'] = {
  js: [
    'worker/manager',
    'controllers/service'
  ]
};

exports.group['Controllers.Alarm'] = {
  group: ['Models.Event'],
  js: [
    'controllers/alarm'
  ]
};

exports.group.Presets = {
  js: ['presets']
};

exports.group.OAuthWindow = {
  dom: ['oauth2'],

  js: [
    'querystring',
    'oauth_window'
  ]
};

exports.group.Notification = {
  js: ['notification']
};

}(Calendar.LoadConfig = {}));
