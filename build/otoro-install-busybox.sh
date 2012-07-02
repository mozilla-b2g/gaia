#!/bin/sh

# This shell script installs busybox on the device.
# This lets us take the fast path in install-gaia.py.

# Remount file system with read/write permissions
adb shell "mount -o rw,remount -t rootfs /"
adb push busybox-armv6l /sbin/busybox
adb shell "chmod 555 /sbin/busybox"

# Perform the symbolic links
adb push ./links4busybox.sh /sbin/
adb shell "sh /sbin/links4busybox.sh"
adb shell "rm /sbin/links4busybox.sh"

# Remount file system with read-only permissions
adb shell "mount -o ro,remount -t rootfs /"

