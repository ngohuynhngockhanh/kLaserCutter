#!/usr/bin/env node
//require
var	express		=	require('express'),
	app        	= 	express(),
	fs         	= 	require('fs'),
	server		=	require('http').createServer(app),
	bodyParser	=	require('body-parser'),
	multipart  	= 	require('connect-multiparty'),
	multipartMiddleware = multipart(),
    io			=	require('socket.io').listen(server),
	argv		=	require('optimist').argv,
	phpjs		= 	require('phpjs'),
	Infinity	=	1e90,
	exec 		=	require('child_process').exec,
	svg2gcode	=	require('./lib/svg2gcode'),
	serialport	=	require("serialport"),
	SerialPort	= 	serialport.SerialPort,
	serialPort	= 	new SerialPort("/dev/ttyS0", {
					baudrate: 115200,
					parser: serialport.parsers.readline("\n")
				});

var	gcodeQueue	= 	[],
	maxQueue	=	3,				// Tối đa 8 lệnh trong hàng đợi
	timer1		=	phpjs.time(),
	okWaitTime	=	10000,				//10s
	intervalTime	=	argv.waitTime || 1000;	//1s

/*


//main program

////read stdin data
var svg = ""; // svg's data
process.stdin.on('data', function(char) {
	svg += char;
});

////start process svg data
process.stdin.on('end', function() {
	console.log(svg2gcode.svg2gcode(svg, argv));
});

//// end process data
process.stdin.resume();


*/

app.use(bodyParser.urlencoded({
    extended: true
}));

// Thư mục chứa ảnh upload trên server
app.use('/pictures', express.static(__dirname + '/upload'));

app.get('/', function(req, res) {
    res.sendfile(__dirname + '/index.html');
});

// Lắng nghe khi có requrest POST
app.post('/upload', multipartMiddleware, function(req, res, next) {

    var file = req.files.file;

    // Tên file
    var originalFilename = file.name;

    // File type
    var fileType         = file.type.split('/')[1];

    // File size
    var fileSize         = file.size;

    // Đường dẫn lưu ảnh
    var pathUpload       = __dirname + '/upload/' + originalFilename;

    // Đọc nội dung file tmp
    // nếu không có lỗi thì ghi file vào ổ cứng
    fs.readFile(file.path, function(err, data) {
        if(!err) {
        	var svg = svg2gcode.svg2gcode(data.toString(), argv);
        	fs.writeFile(pathUpload + '.sd', svg, function() {
        		res.send(phpjs.str_replace("\r", "<br />", svg));
        		gcodeQueue = phpjs.explode("\r", svg);				      		
        		return;
        	});
        }
    });
});

io.sockets.on('connection', function (socket) {
	socket.on('message',function(data){
  		console.log();
	});
});

server.listen(90);
console.log('Server runing port 90');

function sendFirstGCodeLine() {
	if (gcodeQueue.length == 0)
		return false;
	var command = gcodeQueue.shift();
	serialPort.write(command + "\r");
	console.log(command);
	return true;
}

function sendGcodeFromQueue() {

		sendFirstGCodeLine();

}

function receiveData(data) {
	if (data.indexOf('<') == 0) {	//type <status,...>
		data = phpjs.str_replace(['<', '>', 'WPos', 'MPos', ':', "\r", "\n"], '', data);
		var data_array = phpjs.explode(',', data);

		var status = data_array[0];
		
	} else if (data.indexOf('ok') == 0) {
		sendGcodeFromQueue();

	}
}

serialPort.on("open", function () {
	console.log('open serial port');
	serialPort.on('data', function(data) {
		 receiveData(data);
	});
});

var AT_interval = setInterval(function() {
	serialPort.write("?\r");
}, intervalTime);
