Calendar.LoadConfig = (function() {
  'use strict';

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

  var config = {
    jsRoot: '/js/',
    styleRoot: '/style/',
    sharedJsRoot: '/shared/js/',
    sharedStyleRoot: '/shared/style/',
    storeRoot: 'store/',

    plugins: {

      dom: function(id, obs, cb) {
        var node = document.getElementById(id);
        if (!node) {
          return cb();
        }

        LazyLoader.load([node], function nodeLoad() {
          navigator.mozL10n.translate(node);
          cb();
        });
      },

      js: function lc_importJS(file, obs, cb) {
        var name = camelize(file);
        var existsInPage = Calendar.ns(name, true);

        // already loaded skip
        if (existsInPage) {
          Calendar.nextTick(cb);
          return;
        }

        file = this.config.jsRoot + file + '.js';
        LazyLoader.load([file], cb);
      },

      shared: function lc_importShared(file, obs, cb) {
        file = this.config.sharedJsRoot + file + '.js';
        LazyLoader.load([file], cb);
      },

      style: function lc_importStylesheet(file, obs, cb) {
        file = this.config.styleRoot + file + '.css';
        LazyLoader.load([file], cb);
      },

      storeLoad: function lc_loadStore(file, obs, cb) {
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
      }
    },

    group: {

      'Views.Pan': {
        js: [
          'views/pan'
        ]
      },

      'Views.SingleDay': {
        js: [
          'utils/overlap',
          'views/single_day'
        ]
      },

      'Views.MultiDay': {
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
      },

      'Views.HourDoubleTap': {
        js: [
          'querystring',
          'utils/dom',
          'views/hour_double_tap'
        ]
      },

      'Views.Week': {
        dom: [
          'week-view'
        ],

        group: [
          'Views.MultiDay'
        ],

        js: [
          'views/week'
        ]
      },

      'Views.CurrentTime': {
        js: [
          'views/current_time'
        ]
      },

      'Views.TimeHeader': {
        js: [
          'view',
          'views/time_header'
        ]
      },

      'Views.Settings': {
        group: ['Templates.Calendar'],

        dom: ['settings'],

        js: [
          'view',
          'views/settings'
        ],

        style: ['settings']
      },

      'Views.MonthsDay': {
        group: [
          'Templates.MonthsDay',
          'Views.DayChild'
        ],
        js: [
          'views/months_day'
        ]
      },

      'Views.Month': {
        group: [
          'Views.MonthChild',
          'Templates.Month',
          'Views.TimeParent'
        ],

        js: [
          'views/month'
        ]
      },

      'Views.MonthChild': {
        group: [
          'Templates.Month'
        ],

        js: [
          'calc',
          'views/month_child'
        ]
      },

      'Views.ModifyEvent': {
        group: ['Views.EventBase'],

        dom: ['modify-event-view'],

        js: [
          'querystring',
          'templates/alarm',
          'views/modify_event'
        ],

        shared: ['input_parser'],

        style: ['modify_event_view']
      },

      'Views.ViewEvent': {
        group: ['Views.EventBase'],

        dom: ['event-view'],

        js: [
          'templates/duration_time',
          'templates/alarm',
          'views/view_event'
        ],

        shared: ['input_parser'],

        style: ['event_view']
      },

      'Views.EventBase': {
        group: ['Models.Event'],

        js: [
          'views/event_base'
        ]
      },

      'Views.ModifyAccount': {
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
      },

      'Views.Errors': {
        dom: ['lazy-styles', 'errors'],
        js: ['view', 'views/errors']
      },

      'Views.Day': {
        group: [
          'Views.TimeParent',
          'Views.DayChild'
        ],

        js: [
          'views/day'
        ]
      },

      'Views.DayChild': {
        group: [
          'Views.DayBased',
          'Views.CurrentTime'
        ],

        js: [
          'views/day_child'
        ]
      },

      'Views.DayBased': {
        group: ['Templates.Day'],

        js: [
          'calc',
          'querystring',
          'utils/ordered_map',
          'utils/overlap',
          'view',
          'views/day_based'
        ]
      },

      'Views.TimeParent': {
        js: [
          'view',
          'utils/ordered_map',
          'views/time_parent'
        ]
      },

      'Views.CreateAccount': {
        group: [
          'Models.Account',
          'Templates.Account',
          'Presets'
        ],

        dom: ['create-account-view'],

        js: [
          'views/create_account'
        ]
      },

      'Views.CalendarColors': {
        js: [
          'view',
          'models/calendar',
          'views/calendar_colors'
        ]
      },

      'Views.AdvancedSettings': {
        group: ['Templates.Account'],

        dom: ['advanced-settings-view'],

        js: [
          'templates/alarm',
          'views/advanced_settings'
        ]
      },

      'Views.FirstTimeUse': {
        js: [
          'views/first_time_use'
        ]
      },

      'Templates.DurationTime': {
        js: [
          'template',
          'templates/duration_time'
        ]
      },

      'Templates.Month': {
        js: [
          'template',
          'templates/month'
        ]
      },

      'Templates.MonthsDay': {
        js: [
          'template',
          'templates/months_day'
        ]
      },

      'Templates.Day': {
        js: [
          'template',
          'templates/day'
        ]
      },

      'Templates.Calendar': {
        // this is lame
        group: ['Provider.Local'],

        js: [
          'template',
          'templates/calendar'
        ]
      },

      'Templates.Account': {
        js: [
          'template',
          'templates/account'
        ]
      },

      'Utils.AccountCreation': {
        js: [
          'utils/account_creation'
        ]
      },

      'Provider.Local': {
        group: [
          'Provider.Abstract',
          'EventMutations'
        ],

        js: [
          'ext/uuid',
          'provider/local'
        ]
      },

      'EventMutations': {
        js: [
          'event_mutations',
          'ext/uuid'
        ]
      },

      'Provider.Abstract': {
        js: [
          'provider/abstract'
        ]
      },

      'Provider.CaldavPullEvents': {
        js: [
          'ext/uuid',
          'provider/caldav_pull_events'
        ]
      },

      'Provider.Caldav': {
        group: ['Provider.Abstract', 'Provider.Local'],
        js: [
          'provider/abstract',
          'provider/caldav',
          'provider/caldav_pull_events'
        ]
      },

      'Models.Account': {
        js: [
          'models/account'
        ]
      },

      'Models.Event': {
        js: ['models/event']
      },

      'Models.Calendar': {
        js: [
          'models/calendar'
        ]
      },

      'Controllers.RecurringEvents': {
        js: [
          'controllers/recurring_events'
        ]
      },

      'Controllers.Sync': {
        js: [
          'controllers/sync'
        ]
      },

      'Controllers.Service': {
        js: [
          'worker/manager',
          'controllers/service'
        ]
      },

      'Controllers.Alarm': {
        group: ['Models.Event'],
        js: [
          'controllers/alarm'
        ]
      },

      'Presets': {
        js: ['presets']
      },

      'OAuthWindow': {

        dom: ['oauth2'],

        js: [
          'querystring',
          'oauth_window'
        ]
      }
    }
  };

  return config;
}());
