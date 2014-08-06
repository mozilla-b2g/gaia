# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from abc import ABCMeta, abstractmethod, abstractproperty
import os

from mozprofile import Profile
from mozrunner import (
    B2GDesktopRunner,
    B2GDeviceRunner,
    B2GEmulatorRunner
)

class MozrunnerHandler(object):
    __metaclass__ = ABCMeta
    runner = None

    def __init__(self, symbols_path=None):
        process_args = {
            # TODO save gecko output to a file rather than discarding it
            'stream': open(os.devnull, 'wb'),
            'onFinish': self.on_finish,
        }

        self.common_runner_args = {
            'process_args': process_args,
            'symbols_path': symbols_path,
        }

    @abstractmethod
    def start_runner(self, data):
        pass

    @abstractmethod
    def stop_runner(self, data):
        pass

    def on_finish(self):
        if self.runner:
            self.runner.check_for_crashes()

    def cleanup(self):
        if self.runner:
            self.runner.cleanup()


class DesktopHandler(MozrunnerHandler):

    def start_runner(self, data):
        binary = os.path.join(data.get('target'), 'b2g-bin')
        options = data.get('options', {});

        profile = Profile(profile=options.get('profile'))
        cmdargs = options.get('argv', [])

        if options.get('screen') and \
           hasattr(options.screen, 'width') and \
           hasattr(options.screen, 'height'):
            screen = '--screen=%sx%s' % (options.screen.width, options.screen.height)
            if hasattr(options.screen, 'dpi'):
                screen = '%s@%s' % (screen, options.screen.dpi)
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

    def stop_runner(self, data):
        self.runner.stop()
        self.runner = None


class EmulatorHandler(MozrunnerHandler):

    def __init__(self, b2g_home, *args, **kwargs):
        MozrunnerHandler.__init__(self, *args, **kwargs)

        self.runner = B2GEmulatorRunner(b2g_home=b2g_home, **self.common_runner_args)
        self.runner.device.start()

    def start_runner(self, data):
        options = data.get('options', {})
        port = options.get('port')
        profile = Profile(profile=options.get('profile'))

        self.runner.device.setup_port_forwarding(local_port=port, remote_port=port)

        self.runner.profile = profile
        self.runner.start()
        if not self.runner.device.wait_for_port(port):
            raise Exception("Wait for port timed out")

    def stop_runner(self, data):
        self.runner.stop()

class DeviceHandler(MozrunnerHandler):

    def __init__(self, *args, **kwargs):
        serial = kwargs.pop('serial', None)
        MozrunnerHandler.__init__(self, *args, **kwargs)

        self.runner = B2GDeviceRunner(serial=serial, **self.common_runner_args)
        self.runner.device.connect()

    def start_runner(self, data):
        options = data.get('options', {})
        port = options.get('port')
        profile = Profile(profile=options.get('profile'))

        self.runner.device.setup_port_forwarding(local_port=port, remote_port=port)

        self.runner.profile = profile
        self.runner.start()

        self.runner.device.setup_port_forwarding(local_port=port, remote_port=port)
        if not self.runner.device.wait_for_port(port):
            raise Exception("Wait for port timed out")

    def stop_runner(self, data):
        self.runner.stop()

