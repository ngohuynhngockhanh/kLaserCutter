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
	svg2gcode	=	require('./lib/svg2gcode'),
	SerialPort	= require("serialport").SerialPort,
	serialPort	= new SerialPort("/dev/ttyS0", {
		baudrate: 115200
	});
	

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
        		res.send(phpjs.str_replace("\r\n", "<br />", svg));
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


serialPort.on("open", function () {
	console.log('open');
		serialPort.on('data', function(data) {
	    console.log('data received: ' + data);
	});
	serialPort.write("M03\n", function(err, results) {
	    console.log('err ' + err);
	    console.log('results ' + results);
	});
});
