# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from abc import ABCMeta, abstractmethod, abstractproperty
import os
import sys

from mozprofile import Profile
from mozrunner import (
    B2GDesktopRunner,
    B2GDeviceRunner,
    B2GEmulatorRunner
)

# We log over a special pipe (fd3) which node knows to hook up.
GECKO_LOG_FD = 3

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
        self.runner = None


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
        port = options.get('port')
        profile = Profile(profile=options.get('profile'))

        print('---- start runner ----');
        print(port, profile)
        self.runner.device.setup_port_forwarding(local_port=port, remote_port=port)

        self.runner.profile = profile
        self.runner.start()

        self.runner.device.setup_port_forwarding(local_port=port, remote_port=port)
        if not self.runner.device.wait_for_port(port):
            raise Exception("Wait for port timed out")

    def stop_runner(self):
        self.runner.stop()

