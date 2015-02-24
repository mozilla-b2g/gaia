# -*- coding: utf-8 -*-

# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase


class TestLaunchL10n(GaiaTestCase):

    default_locale = 'en-US'
    alternate_locale = 'qps-ploc'
    test_apps = {'Clock': u'Ƈŀǿǿƈķ',
                 'Settings': u'Şḗḗŧŧīīƞɠş'}

    def test_launch_by_english_name_in_alternate_locale(self):
        '''
        Launch apps by English name in a different locale
        '''

        # set language to non-English
        self.data_layer.set_setting('language.current', self.alternate_locale)

        for app in self.test_apps.keys():
            self.apps.launch(app)

        for app in self.test_apps.values():
            self.assertIn(app.lower(), [a.name.lower() for a in self.apps.running_apps()])

    def test_launch_by_localised_name(self):
        '''
        Launch apps by (non-English) localised name
        '''

        # set language to non-English
        self.data_layer.set_setting('language.current', self.alternate_locale)

        for app in self.test_apps.values():
            self.apps.launch(app)

        for app in self.test_apps.values():
            self.assertIn(app.lower(), [a.name.lower() for a in self.apps.running_apps()])

    def tearDown(self):
        # switch back to the default locale
        self.data_layer.set_setting('language.current', self.default_locale)
