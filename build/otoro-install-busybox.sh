#!/bin/sh

# This shell script installs busybox on the device.
# This lets us take the fast path in install-gaia.py.

# Remount file system with read/write permissions
adb shell "mount -o rw,remount -t rootfs /"
adb push busybox-armv6l /sbin/busybox
adb shell "chmod 555 /sbin/busybox"

# Perform the symbolic links
adb shell "for x in \`busybox --list\`; do ln -s /sbin/busybox /sbin/$x; done"

# Remount file system with read-only permissions
adb shell "mount -o ro,remount -t rootfs /"

