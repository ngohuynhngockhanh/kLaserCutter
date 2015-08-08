var 	phpjs		=		require('phpjs'),
		fs			=		require('fs'),
		sh 			= 		require('execSync');
		
		
function MJPG_Streamer(device, options) {
	device = device || 0;		
	options = options || {};
	options.resolution	= options.resolution	|| '640x480';
	options.fps			= options.fps 			|| '10';
	options.quality		= options.quality		|| '50';
	options.format		= options.format		|| 'auto';
	this.options = options;
	this.device = (phpjs.is_numeric(device)) ? '/dev/video' + phpjs.strval(device) : device;
	console.log("init webcam at device video0");
}

MJPG_Streamer.prototype = {
    constructor: MJPG_Streamer,
	isAvailable: function() {
		return fs.existsSync(this.device);		
	},
	isMjpgRunning: function() {
		command = "ps | grep mjpg_streame";
		var result = sh.exec(command);
		return phpjs.strpos(result.stdout, 'mjpg_streamer') !== false;
	},
	tryRun: function() {
		if (this.isAvailable()) {
			if (!this.isMjpgRunning()) {
				var format = '', command, result, quality = '',
					tmpfile = __dirname + '/../upload/mjpg_streamer.tmp';
				sh.run('echo "123" > ' + tmpfile);
				if (this.options.format == 'auto') {
					command = 'v4l2-ctl --list-formats';
					result = sh.exec(command);
					if (result.stdout.indexOf('MJPEG') == -1)
						format = '-y';
				} else
					format = (this.options.format == 'yuyv') ? '-y' : '';
					
				
				if (format == '-y')
					quality = ' -quality ' + this.options.quality;
				command = 'cd '+ __dirname + '/../bin/mjpg_streamer && ./mjpg_streamer -i "./input_uvc.so ' + format + ' -d ' + this.device + ' ' + quality + ' -f ' + this.options.fps + ' -r ' + this.options.resolution + '" -o "./output_http.so -w ./www" > ' + tmpfile + ' 2>&1 &';
				result = sh.exec(command);
				sh.exec("sleep 0.05"); //wait 50ms to get tmpfile content
				result = fs.readFileSync(tmpfile).toString();
				if (phpjs.strpos(result, 'Unable to start capture: Input/output error') !== false) {
					return {
						ok: false,
						message: 'CHECK YOUR CAMERA CONNECTED. Error #1'
					}
				}
				return {
					ok: true,
					message: 'MJPG STREAMER IS RUNNING'
				}
			} else 
				return {
					ok: true,
					message: 'MJPG STREAMER IS RUNNING'
				}
		} else 
			return {
				ok: false,
				message: 'NO USB DECTECTED'
			};
	}
};

module.exports = MJPG_Streamer;