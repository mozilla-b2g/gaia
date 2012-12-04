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
 "audio.volume.alarm": 7,
 "audio.volume.bt_sco": 15,
 "audio.volume.dtmf": 15,
 "audio.volume.enforced_audible": 7,
 "audio.volume.fm": 15,
 "audio.volume.master": 0.5,
 "audio.volume.music": 15,
 "audio.volume.notification": 7,
 "audio.volume.ring": 7,
 "audio.volume.system": 7,
 "audio.volume.tts": 15,
 "audio.volume.voice_call": 5,
 "bluetooth.enabled": False,
 "camera.shutter.enabled": True,
 "debug.dev-mode": False,
 "debug.grid.enabled": False,
 "debug.oop.disabled": False,
 "debug.fps.enabled": False,
 "debug.ttl.enabled": False,
 "debug.log-animations.enabled": False,
 "debug.paint-flashing.enabled": False,
 "debug.peformancedata.shared": False,
 "devtools.debugger.remote-enabled": False,
 "gaia.system.checkForUpdates": False,
 "dialer.ringtone": "classic.ogg",
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
 "keyboard.vibration": True,
 "keyboard.clicksound": False,
 "keyboard.wordsuggestion": True,
 "language.current": "en-US",
 "lockscreen.passcode-lock.code": "0000",
 "lockscreen.passcode-lock.timeout": 0,
 "lockscreen.passcode-lock.enabled": False,
 "lockscreen.notifications-preview.enabled": True,
 "lockscreen.enabled": True,
 "lockscreen.locked": True,
 "lockscreen.unlock-sound.enabled": False,
 "operatorvariant.mcc": 0,
 "operatorvariant.mnc": 0,
 "ril.iccInfo.mbdn":"",
 "ril.sms.strict7BitEncoding.enabled": False,
 "ril.cellbroadcast.searchlist": "",
 "phone.ring.keypad": True,
 "powersave.enabled": False,
 "powersave.threshold": 0,
 "privacy.donottrackheader.enabled": False,
 "ril.callwaiting.enabled": True,
 "ril.data.enabled": False,
 "ril.data.apn": "",
 "ril.data.passwd": "",
 "ril.data.httpProxyHost": "",
 "ril.data.httpProxyPort": 0,
 "ril.data.mmsc": "",
 "ril.data.mmsproxy": "",
 "ril.data.mmsport": 0,
 "ril.data.roaming_enabled": False,
 "ril.data.user": "",
 "ril.radio.disabled": False,
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
 "wifi.notification": False
}

def main():
    parser = optparse.OptionParser(description="Generate initial settings.json file")
    parser.add_option(      "--homescreen", help="specify the homescreen URL")
    parser.add_option(      "--ftu", help="specify the ftu manifest URL")
    parser.add_option("-c", "--console", help="indicate if the console should be enabled", action="store_true")
    parser.add_option("-o", "--output", help="specify the name of the output file")
    parser.add_option("-w", "--wallpaper", help="specify the name of the wallpaper file")
    parser.add_option("-v", "--verbose", help="increase output verbosity", action="store_true")
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

    if verbose:
        print "Console:", options.console
        print "Homescreen URL:", homescreen_url
        print "Ftu URL:", ftu_url
        print "Setting Filename:",settings_filename
        print "Wallpaper Filename:", wallpaper_filename

    # Set the default console output
    settings["debug.console.enabled"] = options.console

    # Set the homescreen URL
    settings["homescreen.manifestURL"] = homescreen_url

    # Set the ftu manifest URL
    settings["ftu.manifestURL"] = ftu_url

    # Grab wallpaper.jpg and convert it into a base64 string
    wallpaper_file = open(wallpaper_filename, "rb")
    wallpaper_base64 = base64.b64encode(wallpaper_file.read())
    settings["wallpaper.image"] = "data:image/jpeg;base64," + wallpaper_base64.decode("utf-8")

    json.dump(settings, open(settings_filename, "wb"))

if __name__ == "__main__":
  main()
