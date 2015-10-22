# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from abc import ABCMeta, abstractmethod, abstractproperty
import json
import os
import posixpath
import sys

from mozprofile import Profile
from mozrunner import (
    B2GDesktopRunner,
    B2GDeviceRunner,
    B2GEmulatorRunner
)

# We log over a special pipe (fd3) which node knows to hook up.
GECKO_LOG_FD = 3

class DeviceUtils:
    def __init__(self, deviceManager):
        self.dm = deviceManager

    def _purge_data(self):
        # Clean up data on device.
        print("cleaning up data on device.")
        data_paths = ['/cache/*',
                      '/data/local/debug_info_trigger',
                      '/data/local/indexedDB',
                      '/data/local/OfflineCache',
                      '/data/local/permissions.sqlite',
                      '/data/local/storage/persistent',
                      '/data/local/storage/default']
        for path in data_paths:
          if self.dm.dirExists(path):
            self.dm.removeDir(path)

    def _purge_wifi_networks(self):
        # Remove remembered networks
        print("removing remembered wifi networks.")
        self.dm.removeDir('/data/misc/wifi/wpa_supplicant.conf')

    def _purge_storage_data(self):
        # Clean up storage.
        print("cleaning up storage on device.")
        # TODO: Remove hard-coded paths once bug 1018079 is resolved
        storage_paths = ['/mnt/sdcard/',
                         '/mnt/extsdcard/',
                         '/storage/sdcard/',
                         '/storage/sdcard0/',
                         '/storage/sdcard1/']
        for path in storage_paths:
            if self.dm.dirExists(path):
                for item in self.dm.listFiles(path):
                    self.dm.removeDir('/'.join([path, item]))

    def _purge_installed_apps(self):
        # Clean up apps on device.
        apps = json.loads(self.dm.pullFile('/data/local/webapps/webapps.json'))
        system_install_time = apps['system.gaiamobile.org']['installTime']
        for app in apps.values():
            if app.get('installTime') > system_install_time:
                # removing any webapps installed since build time
                path = posixpath.join(app.get('basePath'), app.get('id'))
                print('Removing %s' % path)
                self.dm.removeDir(path)

    def _stop_b2g(self):
        print("stopping b2g on device before starting runner.")
        self.dm.shellCheckOutput(['stop', 'b2g'])


class MozrunnerHandler(object):
    __metaclass__ = ABCMeta
    runner = None

    def __init__(self, symbols_path=None, *args, **kwargs):
        fd = os.fdopen(GECKO_LOG_FD, 'a')
        process_args = {
            'stream': fd,
            'onFinish': self.on_finish
        }

        dump_path = kwargs.pop('dump_path', os.path.join(os.getcwd(), "minidumps"))
        self.common_runner_args = {
            'process_args': process_args,
            'symbols_path': symbols_path,
            'dump_save_path': dump_path,

            'env': {
                # Required for crash reporting...
                'MOZ_CRASHREPORTER': '1',
                'MOZ_CRASHREPORTER_NO_REPORT': '1'
            }
        }

        # Ensure we set the DISPLAY if it is set in the current environment so
        # things like Xvfb work correctly...
        if 'DISPLAY' in os.environ:
            self.common_runner_args['env']['DISPLAY'] = os.environ['DISPLAY']

    @abstractmethod
    def start_runner(self, target, options):
        pass

    @abstractmethod
    def stop_runner(self):
        pass

    def on_finish(self):
        pass

    def cleanup(self):
        if self.runner:
            self.runner.cleanup()


class DesktopHandler(MozrunnerHandler):

    def start_runner(self, binary, options):
        profile = Profile(profile=options.get('profile'))
        cmdargs = options.get('argv', [])

        if 'screen' in options and \
           'width' in options['screen']  and \
           'height' in options['screen']:
            screen = '--screen=%sx%s' % (options['screen']['width'], \
                                         options['screen']['height'])

            if 'dpi' in options['screen']:
                screen = '%s@%s' % (screen, options['screen']['dpi'])
            cmdargs.append(screen)

        if options.get('noRemote', True):
            cmdargs.append('-no-remote')

        if options.get('url'):
            cmdargs.append(options['url'])

        if options.get('chrome'):
            cmdargs.extend(['-chrome', options['chrome']])

        if options.get('startDebugger'):
            cmdargs.extend(['-start-debugger-server', options['startDebugger']])

        self.runner = B2GDesktopRunner(binary, cmdargs=cmdargs, profile=profile,
                                       **self.common_runner_args)
        self.runner.start()

    def stop_runner(self):
        self.runner.stop()


class EmulatorHandler(MozrunnerHandler):

    def __init__(self, b2g_home, *args, **kwargs):
        MozrunnerHandler.__init__(self, *args, **kwargs)

        self.runner = B2GEmulatorRunner(b2g_home=b2g_home, **self.common_runner_args)
        self.runner.device.start()

    def start_runner(self, binary, options):
        port = options.get('port')
        profile = Profile(profile=options.get('profile'))

        self.runner.device.setup_port_forwarding(local_port=port, remote_port=port)

        self.runner.profile = profile
        self.runner.start()
        if not self.runner.device.wait_for_port(port):
            raise Exception("Wait for port timed out")

    def stop_runner(self):
        self.runner.stop()


class DeviceHandler(MozrunnerHandler):

    def __init__(self, *args, **kwargs):
        serial = kwargs.pop('serial', None)
        MozrunnerHandler.__init__(self, *args, **kwargs)

        self.runner = B2GDeviceRunner(serial=serial, **self.common_runner_args)
        self.runner.device.connect()

    def start_runner(self, target, options):
        du = DeviceUtils(self.runner.device.dm)
        device = self.runner.device
        port = options.get('port')
        profile = Profile(profile=options.get('profile'))

        device.setup_port_forwarding(local_port=port, remote_port=port)

        du._stop_b2g()
        du._purge_data()
        du._purge_wifi_networks()
        du._purge_storage_data()

        self.runner.profile = profile
        self.runner.start()

        if not device.wait_for_port(port=port, timeout=600):
            raise Exception("Wait for port timed out")

    def stop_runner(self):
        self.runner.stop()
