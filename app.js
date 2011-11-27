// vim: ts=2 sw=2 expandtab
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , util = require('util')
  , markdown = require('markdown').markdown.toHTML;

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
  io.set('transports', ['xhr-polling']);
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
  io.set("log level", 1);
});

// Routes

app.get('/', routes.index);

var users = {};

var help = {
  "nick": "'/nick <new name>' to set a new nick. If you use an email address for the nick above, it will do a gravatar lookup for your avatar, but only display the username portion of your address as your handle",
  "list": "'/list' to list current users",
  "help": "'/help' display this help message",
};

// TODO: refactor this all into a CommonJS module and just
//       instantiate it on each new connection or something
io.sockets.on('connection', function (socket) {
  function emit_all(varargs) {
    socket.emit.apply(socket, arguments);
    socket.emit.apply(socket.broadcast, arguments);
  }
  function sys_announce(msg) {
    announce({ from: 'SYS', message: msg});
  }
  function announce(announcement) {
    socket.emit('msg', announcement).broadcast.emit('msg', announcement);
  }
  function handle_nick(nick) {
    var old;
    if (users.hasOwnProperty(nick)) {
      socket.emit('msg', {from: 'SYS', message: "Sorry, '" + nick + "' taken, try again."});
    } else {
      old = socket.nickname;
      socket.nickname = nick;
      console.info("  INFO  client name change " + old + " -> " + nick);
      delete users[old];
      users[nick] = socket;
      sys_announce(old + " is now known as " + nick);
    }
  }
  function handle_help(args) {
    var usage = [];
    for (cmd in help) {
        usage.push(help[cmd]);
    }
    if (args) {
      socket.emit('msg', {from: 'SYS', message: (help.hasOwnProperty(args) ? help[args] : "No help available for '" + args + "'") });
    } else {
      socket.emit('msg', {from: 'SYS', message: markdown(usage.join('\n\n'))});
    }
  }
  function handle_command (cmd, args) {
    if (cmd == '/list') {
      socket.emit('msg', {from: 'SYS', message: "Current users: " + Object.keys(users).join(', ')});
    } else if (cmd == '/nick') {
      handle_nick(args);
    } else if (cmd == '/help') {
      handle_help(args);
    } else {
      socket.emit('msg', {from: 'SYS', message: "Unknown command: '" + cmd + "'. Try asking for help with '/help'"});
    }
  }
  socket.nickname = socket.id;
  users[socket.nickname] = socket;

  console.info("  INFO  new client: " + socket.nickname);

  socket.emit('msg', {from: 'SYS', message: "Welcome to spacechat, " + socket.nickname});
  sys_announce(
    socket.nickname + " has joined the chat. " +
      "Current users are: " + Object.keys(users).join(', ')
  );

  socket.on('disconnect', function () {
    socket.broadcast.emit('msg', {from: 'SYS', message: socket.nickname + ' has left.'});
    delete users[socket.nickname];
  });
  socket.on('typing', function (isTyping) {
    var who = [];
    users[socket.nickname].typing = isTyping;
    for (user in users) {
      if (users[user].typing) {
        who.push(user);
      }
    }
    emit_all('typing', who);
  });
  socket.on('msg', function (message) {
    message.from = socket.nickname;
    if (message.message) {
      message.message = markdown(message.message);
    }
    if (message.cmd) {
      handle_command(message.cmd, message.args);
    } else if (message.message || message.emote) {
      announce(message);
    }
  });

});

var port = process.env.PORT || 3000;
app.listen(port);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
