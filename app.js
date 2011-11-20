// vim: ts=2 sw=2 expandtab
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , util = require('util');
//  , markdown = require('robotskirt');

var markdown = { toHtmlSync: function (str) { return str; } };

var app = module.exports = express.createServer()
  , io = require('socket.io').listen(app);

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
});

// Routes

app.get('/', routes.index);

var users = {};

io.sockets.on('connection', function (socket) {
  function announce(announcement) {
    socket.emit('msg', announcement).broadcast.emit('msg', announcement);
  }
  socket.nickname = socket.id.toString();
  users[socket.nickname] = socket;

  socket.emit('msg', {from: 'SYS', message: "Welcome to spacechat, " + socket.nickname});
  announce({from: 'SYS', message: socket.nickname + " has joined the chat "});

  socket.on('disconnect', function () {
    socket.broadcast.emit('msg', {from: 'SYS', message: socket.nickname + ' has left.'});
    delete users[socket.nickname];
  });
  socket.on('nick', function (nick, fn) {
    console.log("Attempting to change nick from " + socket.nickname + " to " + nick);
    if (users.hasOwnProperty(nick)) {
      fn(false);
    } else {
      old = socket.nickname;
      socket.nickname = nick;
      delete users[old];
      users[nick] = socket;
      fn(true);
      announce({from: 'SYS', message: old + " is now known as " + nick});
    }
  });
  socket.on('msg', function (message) {
    message.from = socket.nickname;
    if (message.message) {
      message.message = markdown.toHtmlSync(message.message).toString();
    }
    announce(message);
  });

});

var port = process.env.PORT || 3000;
app.listen(port);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
