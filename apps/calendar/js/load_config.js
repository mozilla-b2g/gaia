Calendar.LoadConfig = (function() {

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

        var file = this.config.jsRoot + file + '.js';
        LazyLoader.load([file], cb);
      },

      shared: function lc_importShared(file, obs, cb) {
        var file = this.config.sharedJsRoot + file + '.js';
        LazyLoader.load([file], cb);
      },

      style: function lc_importStylesheet(file, obs, cb) {
        var file = this.config.styleRoot + file + '.css';
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

      'Views.Week': {
        group: [
          'Views.WeekChild',
          'Views.Day',
          'Templates.Week'
        ],

        js: [
          'views/week'
        ]
      },

      'Views.WeekChild': {
        group: [
          'Templates.Week',
          'Views.DayBased'
        ],

        js: [
          'views/week_child'
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
        group: ['Views.DayChild'],
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
        group: ['Views.DayBased'],

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

      'Templates.Week': {
        js: [
          'template',
          'templates/week'
        ],

        style: ['week_view']
      },

      'Templates.Month': {
        js: [
          'template',
          'templates/month'
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
          'ext/uuid',
          'event_mutations'
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
      },

      'Notification': {
        js: ['notification']
      }
    }
  };

  return config;
}());
