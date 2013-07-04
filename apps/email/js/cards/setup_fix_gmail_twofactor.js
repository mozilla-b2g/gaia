/*global define*/
define(function(require) {

var templateNode = require('tmpl!./setup_fix_gmail_twofactor.html'),
    common = require('mail_common'),
    SetupFixPassword = require('./setup_fix_password'),
    Cards = common.Cards;

// The app password card is just the bad password card with different text
Cards.defineCardWithDefaultMode(
    'setup_fix_gmail_twofactor',
    { tray: false },
    SetupFixPassword,
    templateNode
);

return SetupFixPassword;
});
