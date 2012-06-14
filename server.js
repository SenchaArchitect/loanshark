var express = require('express'),
    connect = require('connect');

// App server setup

var app = express.createServer(

    connect.static(__dirname),
    connect.cookieParser(),

    connect.bodyParser(),
    express.logger(),
    express.errorHandler({ dumpExceptions: true })
);

var port = process.env.PORT || 3000;
app.listen(port, function() {
    console.log("Listening on " + port);
});