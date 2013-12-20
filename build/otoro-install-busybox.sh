#!/bin/sh

# This shell script installs busybox on the device.
# This lets us take the fast path in install-gaia.py.

# Remount file system with read/write permissions
adb shell "mount -o rw,remount -t rootfs /"
adb shell "mkdir -p /system/vendor/bin"
adb push busybox-armv6l /vendor/bin/busybox
adb shell "chmod 555 /vendor/bin/busybox"

# Perform the symbolic links
adb shell "for x in \`busybox --list\`; do ln -s /vendor/bin/busybox /vendor/bin/\$x; done"

# Remount file system with read-only permissions
adb shell "mount -o ro,remount -t rootfs /"

