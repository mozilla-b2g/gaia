import argparse
import sys

from marionette import Marionette

import gaiatest


class GCli(object):

    def __init__(self):
        self.commands = {
            'connectwifi': {
                'function': self.connect_to_wifi,
                'args': [
                    {'name': 'ssid',
                     'help': 'SSID of the network to connect to'},
                    {'name': '--security',
                     'choices': ['WPA-PSK', 'WEP'],
                     'help': 'Security model of the network'},
                    {'name': '--password',
                     'help': 'Password to access the network'}],
                'help': 'Connect to a WiFi network'},
            'disablewifi': {
                'function': self.disable_wifi,
                'help': 'Disable WiFi'},
            'enablewifi': {
                'function': self.enable_wifi,
                'help': 'Enable WiFi'},
            'forgetallwifi': {
                'function': self.forget_all_wifi_networks,
                'help': 'Forget all WiFi networks'},
            'getknownwifi': {
                'function': self.known_wifi_networks,
                'help': 'Show known WiFi networks'},
            'getsetting': {
                'function': self.get_setting,
                'args': [{
                    'name': 'name',
                    'help': 'Name of the setting to retrieve'}],
                'help': 'Show the current value of a setting'},
            'holdhome': {
                'function': self.hold_home,
                'help': 'Simulate holding the home button'},
            'holdsleep': {
                'function': self.hold_sleep,
                'help': 'Simulate holding the sleep button'},
            'home': {
                'function': self.home,
                'help': 'Simulate pressing the home button'},
            'killapps': {
                'function': self.kill_all_apps,
                'help': 'Kill all running apps'},
            'launchapp': {
                'function': self.launch_app,
                'args': [
                    {'name': 'name',
                     'nargs': argparse.REMAINDER,
                     'help': 'Name of app to launch'}],
                'help': 'Launch an application'},
            'listallapps': {
                'function': self.list_all_apps,
                'help': 'List all apps'},
            'listrunningapps': {
                'function': self.list_running_apps,
                'help': 'List the running apps'},
            'lock': {
                'function': self.lock,
                'help': 'Lock screen'},
            'screenshot': {
                'function': self.screenshot,
                'help': 'Take a screenshot'},
            'sendsms': {
                'function': self.send_sms,
                'args': [
                    {'name': 'number',
                     'help': 'Phone number of recipient'},
                    {'name': 'message',
                     'help': 'Message content'}],
                'help': 'Send an SMS'},
            'setsetting': {
                'function': self.set_setting,
                'args': [
                    {'name': 'name',
                     'help': 'Name of setting to change'},
                    {'name': 'value',
                     'help': 'New value for setting'}],
                'help': 'Change the value of a setting'},
            'sleep': {
                'function': self.sleep,
                'help': 'Enter sleep mode'},
            'unlock': {
                'function': self.unlock,
                'help': 'Unlock screen'},
            'volume': {
                'function': self.volume,
                'args': [
                    {'name': 'direction',
                     'choices': ['down', 'up'],
                     'help': 'Direction to change the volume'}],
                'help': 'Change the volume'},
            'wake': {
                'function': self.wake,
                'help': 'Wake from sleep mode'}}

        self.parser = argparse.ArgumentParser()
        self.add_options(self.parser)
        self.add_commands(self.parser)

    def run(self, args=sys.argv[1:]):
        args = self.parser.parse_args()

        host, port = args.address.split(':')
        self.marionette = Marionette(host=host, port=int(port))
        self.marionette.start_session()

        self.apps = gaiatest.GaiaApps(self.marionette)
        self.data_layer = gaiatest.GaiaData(self.marionette)
        self.lock_screen = gaiatest.LockScreen(self.marionette)

        ret = args.func(args)
        if ret is None:
            ret = 0

        self.marionette.delete_session()

        sys.exit(ret)

    def add_options(self, parser):
        parser.add_argument(
            '--address',
            default='localhost:2828',
            help='Address (host:port) of running Gecko instance to connect to '
                 '(default: %(default)s)')

    def add_commands(self, parser):
        subparsers = parser.add_subparsers(
            title='Commands', metavar='<command>')
        for (name, props) in sorted(self.commands.iteritems()):
            subparser = subparsers.add_parser(name, help=props['help'])
            if props.get('args'):
                for arg in props['args']:
                    kwargs = {k: v for k, v in arg.items() if k is not 'name'}
                    subparser.add_argument(arg['name'], **kwargs)
            subparser.set_defaults(func=props['function'])

    def connect_to_wifi(self, args):
        network = {
            'ssid': args.ssid,
            'keyManagement': args.security or 'NONE'}
        if args.security == 'WEP':
            network['wep'] = args.password
        elif args.security == 'WPA-PSK':
            network['psk'] = args.password
        self.data_layer.connect_to_wifi(network)

    def disable_wifi(self, args):
        self.data_layer.disable_wifi()

    def enable_wifi(self, args):
        self.data_layer.enable_wifi()

    def forget_all_wifi_networks(self, args):
        self.data_layer.forget_all_networks()

    def get_setting(self, args):
        print '%s: %s' % (
            args.name,
            self.data_layer.get_setting(args.name))

    def home(self, args):
        self.marionette.execute_script(
            "window.wrappedJSObject.dispatchEvent(new Event('home'));")

    def hold_home(self, args):
        self.marionette.execute_script(
            "window.wrappedJSObject.dispatchEvent(new Event('holdhome'));")

    def hold_sleep(self, args):
        self.marionette.execute_script(
            "window.wrappedJSObject.dispatchEvent(new Event('holdsleep'));")

    def kill_all_apps(self, args):
        self.apps.kill_all()

    def known_wifi_networks(self, args):
        networks = [n for n in self.data_layer.known_networks if 'ssid' in n]
        if len(networks) > 0:
            for i, network in enumerate(networks):
                print '%s: %s' % (i + 1, network['ssid'])
        else:
            print 'No known networks.'

    def launch_app(self, args):
        for name in args.name:
            self.apps.launch(name)

    def list_all_apps(self, args):
        for i, app in enumerate(sorted(self.apps.installed_apps,
                                       key=lambda a: a.name.lower())):
            print '%d: %s' % (i + 1, app.name)

    def list_running_apps(self, args):
        for i, app in enumerate(sorted(self.apps.running_apps,
                                       key=lambda a: a.name.lower())):
            print '%d: %s' % (i + 1, app.name)

    def lock(self, args):
        self.lock_screen.lock()

    def screenshot(self, args):
        self.marionette.execute_script(
            "window.wrappedJSObject.dispatchEvent(new Event('home+sleep'));")

    def send_sms(self, args):
        self.data_layer.send_sms(args.number, args.message)

    def set_setting(self, args):
        self.data_layer.set_setting(args.name, args.value)

    def sleep(self, args):
        self.marionette.execute_script(
            "window.wrappedJSObject.dispatchEvent(new Event('sleep'));")

    def unlock(self, args):
        self.lock_screen.unlock()

    def volume(self, args):
        self.marionette.execute_script(
            "window.wrappedJSObject.dispatchEvent(new Event('volume%s'));" %
            args.direction)

    def wake(self, args):
        self.marionette.execute_script(
            "window.wrappedJSObject.dispatchEvent(new Event('wake'));")


def cli(args=sys.argv[1:]):
    cli = GCli()
    cli.run(args)

if __name__ == '__main__':
    cli()
