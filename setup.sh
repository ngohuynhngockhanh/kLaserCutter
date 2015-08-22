echo "Installing kLaserCutter..."
path=$(pwd)
auto_script_filename=auto_start_when_boot_kLaserCutter
auto_script_location=/etc/init.d/$auto_script_filename
echo "Now path is: $path"


echo "Create a auto start bash shell"
echo "#!/bin/bash" > $auto_script_location
echo "sleep 15 && cd $path/bin && ./checkSVG2gcodealive.sh > /dev/null 2>&1 &" >> $auto_script_location
echo "exit 0" >> $auto_script_location
chmod 0755 $auto_script_location
update-rc.d $auto_script_filename defaults

echo "You're done!"
echo "Now run ./svg2gcode.js to run the server (kLaserCuter)."
echo "From now, your kLaserCutter copy will be started as startup."
echo "Have fun with this project! Let make something cool, now!"