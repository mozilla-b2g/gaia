{
  baseUrl: '../js',
  mainConfigFile: '../js/mail_app.js',
  /*
  wrap: {
    start: 'var _xstart = performance.timing.fetchStart - performance.timing.navigationStart; function plog(msg) {var now = performance.now(); console.log(msg + ' ' + (now - _xstart));}',
    end: 'plog("@@@FINISHED EVAL");'
  },
  */

  include: [
    'alameda',
    'l10nbase',
    'l10ndate',
    'tmpl',
    'text',
    'value_selector',
    'folder_depth_classes',

    // Bundle most likely, frequently used cards
    'cards/message_list',
    'cards/folder_picker',

    'mail_app'
  ],
  optimize: 'none',
  out: '../built/mail_app.js'
}
