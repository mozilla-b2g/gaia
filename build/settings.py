#!/usr/bin/python
#
# This script generates the settings.json file which is stored into the b2g profile

import base64
import json
import optparse
import os
import sys

settings = {
 "accessibility.invert": False,
 "accessibility.screenreader": False,
 "alarm.enabled": False,
 "alert-sound.enabled": True,
 "alert-vibration.enabled": True,
 "app.reportCrashes": "ask",
 "app.update.interval": 86400,
 "audio.volume.alarm": 15,
 "audio.volume.bt_sco": 15,
 "audio.volume.dtmf": 15,
 "audio.volume.content": 15,
 "audio.volume.notification": 15,
 "audio.volume.tts": 15,
 "audio.volume.telephony": 5,
 "bluetooth.enabled": False,
 "bluetooth.debugging.enabled": False,
 "camera.shutter.enabled": True,
 "clear.remote-windows.data": False,
 "debug.grid.enabled": False,
 "debug.oop.disabled": False,
 "debug.fps.enabled": False,
 "debug.ttl.enabled": False,
 "debug.log-animations.enabled": False,
 "debug.paint-flashing.enabled": False,
 "debug.peformancedata.shared": False,
 "deviceinfo.firmware_revision": "",
 "deviceinfo.hardware": "",
 "deviceinfo.os": "",
 "deviceinfo.platform_build_id": "",
 "deviceinfo.platform_version": "",
 "deviceinfo.software": "",
 "deviceinfo.update_channel": "",
 "gaia.system.checkForUpdates": False,
 "geolocation.enabled": True,
 "keyboard.layouts.english": True,
 "keyboard.layouts.dvorak": False,
 "keyboard.layouts.otherlatins": False,
 "keyboard.layouts.cyrillic": False,
 "keyboard.layouts.arabic": False,
 "keyboard.layouts.hebrew": False,
 "keyboard.layouts.zhuyin": False,
 "keyboard.layouts.pinyin": False,
 "keyboard.layouts.greek": False,
 "keyboard.layouts.japanese": False,
 "keyboard.layouts.portuguese": False,
 "keyboard.layouts.spanish": False,
 "keyboard.vibration": False,
 "keyboard.clicksound": False,
 "keyboard.wordsuggestion": False,
 "keyboard.current": "en",
 "language.current": "en-US",
 "lockscreen.passcode-lock.code": "0000",
 "lockscreen.passcode-lock.timeout": 0,
 "lockscreen.passcode-lock.enabled": False,
 "lockscreen.notifications-preview.enabled": True,
 "lockscreen.enabled": True,
 "lockscreen.locked": True,
 "lockscreen.unlock-sound.enabled": False,
 "mail.sent-sound.enabled": True,
 "operatorvariant.mcc": 0,
 "operatorvariant.mnc": 0,
 "ril.iccInfo.mbdn":"",
 "ril.sms.strict7BitEncoding.enabled": False,
 "ril.cellbroadcast.searchlist": "",
 "debug.console.enabled": False,
 "phone.ring.keypad": True,
 "powersave.enabled": False,
 "powersave.threshold": 0,
 "privacy.donottrackheader.enabled": False,
 "ril.callwaiting.enabled": None,
 "ril.cf.enabled": False,
 "ril.data.enabled": False,
 "ril.data.apn": "",
 "ril.data.carrier": "",
 "ril.data.passwd": "",
 "ril.data.httpProxyHost": "",
 "ril.data.httpProxyPort": 0,
 "ril.data.mmsc": "",
 "ril.data.mmsproxy": "",
 "ril.data.mmsport": 0,
 "ril.data.roaming_enabled": False,
 "ril.data.user": "",
 "ril.mms.apn": "",
 "ril.mms.carrier": "",
 "ril.mms.httpProxyHost": "",
 "ril.mms.httpProxyPort": "",
 "ril.mms.mmsc": "",
 "ril.mms.mmsport": "",
 "ril.mms.mmsproxy": "",
 "ril.mms.passwd": "",
 "ril.mms.user": "",
 "ril.radio.preferredNetworkType": "",
 "ril.radio.disabled": False,
 "ril.supl.apn": "",
 "ril.supl.carrier": "",
 "ril.supl.httpProxyHost": "",
 "ril.supl.httpProxyPort": "",
 "ril.supl.passwd": "",
 "ril.supl.user": "",
 "ril.sms.strict7BitEncoding.enabled": False,
 "ring.enabled": True,
 "screen.automatic-brightness": True,
 "screen.brightness": 1,
 "screen.timeout": 60,
 "tethering.usb.enabled": False,
 "tethering.usb.ip": "192.168.0.1",
 "tethering.usb.prefix": "24",
 "tethering.usb.dhcpserver.startip": "192.168.0.10",
 "tethering.usb.dhcpserver.endip": "192.168.0.30",
 "tethering.wifi.enabled": False,
 "tethering.wifi.ip": "192.168.1.1",
 "tethering.wifi.prefix": "24",
 "tethering.wifi.dhcpserver.startip": "192.168.1.10",
 "tethering.wifi.dhcpserver.endip": "192.168.1.30",
 "tethering.wifi.ssid": "FirefoxHotspot",
 "tethering.wifi.security.type": "open",
 "tethering.wifi.security.password": "1234567890",
 "tethering.wifi.connectedClients": 0,
 "tethering.usb.connectedClients": 0,
 "time.nitz.automatic-update.enabled": True,
 "time.timezone": None,
 "ums.enabled": False,
 "ums.mode": 0,
 "vibration.enabled": True,
 "wifi.enabled": True,
 "wifi.disabled_by_wakelock": False,
 "wifi.notification": False,
 "icc.displayTextTimeout": 40000,
 "icc.inputTextTimeout": 40000
}

def main():
    parser = optparse.OptionParser(description="Generate initial settings.json file")
    parser.add_option(      "--override", help="JSON files for custom settings overrides")
    parser.add_option(      "--homescreen", help="specify the homescreen URL")
    parser.add_option(      "--ftu", help="specify the ftu manifest URL")
    parser.add_option("-c", "--console", help="indicate if the console should be enabled", action="store_true")
    parser.add_option("-o", "--output", help="specify the name of the output file")
    parser.add_option("-w", "--wallpaper", help="specify the name of the wallpaper file")
    parser.add_option("-v", "--verbose", help="increase output verbosity", action="store_true")
    parser.add_option(      "--noftu", help="bypass the ftu app", action="store_true")
    parser.add_option(      "--locale", help="specify the default locale to use")
    parser.add_option(      "--enable-debugger", help="enable remote debugger (and ADB for VARIANT=user builds)", action="store_true")
    (options, args) = parser.parse_args(sys.argv[1:])

    verbose = options.verbose

    if options.homescreen:
        homescreen_url = options.homescreen
    else:
        homescreen_url = "app://homescreen.gaiamobile.org/manifest.webapp"

    if options.ftu:
        ftu_url = options.ftu
    else:
        ftu_url = "app://communications.gaiamobile.org/manifest.webapp"

    if options.output:
        settings_filename = options.output
    else:
        settings_filename = "profile/settings.json"

    if options.wallpaper:
        wallpaper_filename = options.wallpaper
    else:
        wallpaper_filename = "build/wallpaper.jpg"

    enable_debugger = (options.enable_debugger == True)

    if verbose:
        print "Console:", options.console
        print "Homescreen URL:", homescreen_url
        print "Ftu URL:", ftu_url
        print "Setting Filename:",settings_filename
        print "Wallpaper Filename:", wallpaper_filename
        print "Enable Debugger:", enable_debugger

    # Set the default console output
    if options.console:
        settings["debug.console.enabled"] = options.console

    # Set the homescreen URL
    settings["homescreen.manifestURL"] = homescreen_url

    # Set the ftu manifest URL
    if not options.noftu:
        settings["ftu.manifestURL"] = ftu_url

    # Set the default locale
    if options.locale:
        settings["language.current"] = options.locale

    settings["devtools.debugger.remote-enabled"] = enable_debugger;

    # Grab wallpaper.jpg and convert it into a base64 string
    wallpaper_file = open(wallpaper_filename, "rb")
    wallpaper_base64 = base64.b64encode(wallpaper_file.read())
    settings["wallpaper.image"] = "data:image/jpeg;base64," + wallpaper_base64.decode("utf-8")

    # Grab ringer_classic_courier.opus and convert it into a base64 string
    ringtone_name = "shared/resources/media/ringtones/ringer_classic_courier.opus"
    ringtone_file = open(ringtone_name, "rb");
    ringtone_base64 = base64.b64encode(ringtone_file.read())
    settings["dialer.ringtone"] = "data:audio/ogg;base64," + ringtone_base64.decode("utf-8")
    settings["dialer.ringtone.name"] = "ringer_classic_courier.opus"

    # Grab notifier_bell.opus and convert it into a base64 string
    notification_name = "shared/resources/media/notifications/notifier_bell.opus"
    notification_file = open(notification_name, "rb");
    notification_base64 = base64.b64encode(notification_file.read())
    settings["notification.ringtone"] = "data:audio/ogg;base64," + notification_base64.decode("utf-8")
    settings["notification.ringtone.name"] = "notifier_bell.opus"

    if options.override and os.path.exists(options.override):
      try:
        overrides = json.load(open(options.override))
        for key, val in overrides.items():
          settings[key] = val
      except Exception, e:
        print "Error while applying override setting file: %s\n%s" % (options.override, e)

    json.dump(settings, open(settings_filename, "wb"))

if __name__ == "__main__":
  main()
