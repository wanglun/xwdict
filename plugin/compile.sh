#!/bin/sh
arm-none-linux-gnueabi-g++ -o xwdict-plugin *.cpp -I/opt/PalmPDK/include/ -L/opt/PalmPDK/device/lib `pkg-config --cflags glib-2.0` -lglib-2.0 -lz --sysroot=/opt/PalmPDK/arm-gcc/sysroot
#g++ -o test *.cpp `pkg-config --cflags --libs glib-2.0` -lz
