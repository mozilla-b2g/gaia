'use strict';
/* exported TAG_OPTIONS */
/* global _ */

var TAG_OPTIONS = {
  'phone-type' : [
    {type: 'mobile', value: _('mobile')},
    {type: 'home', value: _('home')},
    {type: 'work', value: _('work')},
    {type: 'personal', value: _('personal')},
    {type: 'faxHome', value: _('faxHome')},
    {type: 'faxOffice', value: _('faxOffice')},
    {type: 'faxOther', value: _('faxOther')},
    {type: 'other', value: _('other')}
  ],
  'email-type' : [
    {type: 'personal', value: _('personal')},
    {type: 'home', value: _('home')},
    {type: 'work', value: _('work')},
    {type: 'other', value: _('other')}
  ],
  'address-type' : [
    {type: 'current', value: _('current')},
    {type: 'home', value: _('home')},
    {type: 'work', value: _('work')}
  ],
  'date-type': [
    {type: 'birthday', value: _('birthday')},
    {type: 'anniversary', value: _('anniversary')}
  ]
};
