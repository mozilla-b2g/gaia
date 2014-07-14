# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import os


class GaiaApp(object):
    '''
    A class representation of a Gaia app
    '''


    def __init__(self, origin=None, name=None, frame=None, src=None):
        self.frame = frame
        self.frame_id = frame
        self.src = src
        self.name = name
        self.origin = origin

    def __eq__(self, other):
        return self.__dict__ == other.__dict__


class GaiaApps(object):
    '''
    Handles API-level interactions with Gaia apps for example launch and kill
    '''


    def __init__(self, marionette):
        self.marionette = marionette
        js = os.path.abspath(os.path.join(__file__, os.path.pardir, 'atoms', "gaia_apps.js"))
        self.marionette.import_script(js)

    def get_permission(self, app_name, permission_name):
        return self.marionette.execute_async_script("return GaiaApps.getPermission('%s', '%s')" % (app_name, permission_name))

    def set_permission(self, app_name, permission_name, value):
        return self.marionette.execute_async_script("return GaiaApps.setPermission('%s', '%s', '%s')" %
                                                    (app_name, permission_name, value))

    def launch(self, name, switch_to_frame=True, launch_timeout=None):
        self.marionette.switch_to_frame()
        result = self.marionette.execute_async_script("GaiaApps.launchWithName('%s')" % name, script_timeout=launch_timeout)
        assert result, "Failed to launch app with name '%s'" % name
        app = GaiaApp(frame=result.get('frame'),
                      src=result.get('src'),
                      name=result.get('name'),
                      origin=result.get('origin'))
        if app.frame_id is None:
            raise Exception("App failed to launch; there is no app frame")
        if switch_to_frame:
            self.marionette.switch_to_frame(app.frame_id)
        return app

    @property
    def displayed_app(self):
        self.marionette.switch_to_frame()
        result = self.marionette.execute_async_script('return GaiaApps.displayedApp();')
        return GaiaApp(frame=result.get('frame'),
                       src=result.get('src'),
                       name=result.get('name'),
                       origin=result.get('origin'))

    def switch_to_displayed_app(self):
        self.marionette.switch_to_default_content()
        self.marionette.switch_to_frame(self.displayed_app.frame)

    def is_app_installed(self, app_name):
        self.marionette.switch_to_frame()
        return self.marionette.execute_async_script("GaiaApps.locateWithName('%s')" % app_name)

    def uninstall(self, name):
        self.marionette.switch_to_frame()
        self.marionette.execute_async_script("GaiaApps.uninstallWithName('%s')" % name)

    def kill(self, app):
        self.marionette.switch_to_frame()
        result = self.marionette.execute_async_script("GaiaApps.kill('%s');" % app.origin)
        assert result, "Failed to kill app with name '%s'" % app.name

    def kill_all(self):
        self.marionette.switch_to_frame()
        self.marionette.execute_async_script("GaiaApps.killAll()")

    @property
    def installed_apps(self):
        apps = self.marionette.execute_async_script(
            'return GaiaApps.getInstalledApps();')
        result = []
        for app in [a for a in apps if not a['manifest'].get('role')]:
            entry_points = app['manifest'].get('entry_points')
            if entry_points:
                for ep in entry_points.values():
                    result.append(GaiaApp(
                        origin=app['origin'],
                        name=ep['name']))
            else:
                result.append(GaiaApp(
                    origin=app['origin'],
                    name=app['manifest']['name']))
        return result

    @property
    def running_apps(self):
        apps = self.marionette.execute_script(
            'return GaiaApps.getRunningApps();')
        result = []
        for app in [a[1] for a in apps.items()]:
            result.append(GaiaApp(origin=app['origin'], name=app['name']))
        return result
