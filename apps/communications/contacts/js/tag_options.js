'use strict';
/* exported TAG_OPTIONS */

var TAG_OPTIONS = {
  'phone-type' : [
    {type: 'mobile', value: navigator.mozL10n.get('mobile')},
    {type: 'home', value: navigator.mozL10n.get('home')},
    {type: 'work', value: navigator.mozL10n.get('work')},
    {type: 'personal', value: navigator.mozL10n.get('personal')},
    {type: 'faxHome', value: navigator.mozL10n.get('faxHome')},
    {type: 'faxOffice', value: navigator.mozL10n.get('faxOffice')},
    {type: 'faxOther', value: navigator.mozL10n.get('faxOther')},
    {type: 'other', value: navigator.mozL10n.get('other')}
  ],
  'email-type' : [
    {type: 'personal', value: navigator.mozL10n.get('personal')},
    {type: 'home', value: navigator.mozL10n.get('home')},
    {type: 'work', value: navigator.mozL10n.get('work')},
    {type: 'other', value: navigator.mozL10n.get('other')}
  ],
  'address-type' : [
    {type: 'current', value: navigator.mozL10n.get('current')},
    {type: 'home', value: navigator.mozL10n.get('home')},
    {type: 'work', value: navigator.mozL10n.get('work')}
  ],
  'date-type': [
    {type: 'birthday', value: navigator.mozL10n.get('birthday')},
    {type: 'anniversary', value: navigator.mozL10n.get('anniversary')}
  ]
};
