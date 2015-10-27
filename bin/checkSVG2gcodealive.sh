#!/bin/bash 


DIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )
process="svg2gcode.js"
#mount ramdisk
mount -t tmpfs -o size=50M tmpfs ./../upload/ 

cd /sys/class/gpio                                                                         
echo -n "28" > export
echo -n "32" > export
echo -n "45" > export
cd /sys/class/gpio     
cd gpio28
echo -n "out" > direction
echo -n "0" > value
cd /sys/class/gpio     
cd gpio32
echo -n "out" > direction
echo -n "1" > value
cd /sys/class/gpio     
cd gpio45
echo -n "out" > direction
echo -n "1" > value
stty -F /dev/ttyS0 115200       

#insmod sha1_generic
cd $DIR && cd kernel && insmod sha1_generic.ko
while true;
do
	if ps | grep -v grep | grep $process > /dev/null         
	then                 
		echo "Process $process is running"         
	else        
		echo "Start SVG2gcode again"
		cd $DIR && cd ../ && ./svg2gcode.js > /dev/null 2>&1 &
	fi
	sleep 10
done
