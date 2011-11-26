// vim: ts=2 sw=2 expandtab
$(function () {
  var console = window.console || { log : function () {} };
  window['spacechat'] = window['sapcechat'] || io.connect();
  var socket = window.spacechat;
  var $out = $("#chat_out"), $in = $("#chat_in"), $typing = $("#typing");
  var emote_re = /^\/me /;
  var cmd_re = /^(\/\S+)\s*$/;
  var cmd_with_args_re = /^(\/\S+)\s+(\S.*)$/;
  var last_type = 0;
  function typingCheck(isTyping) {
    var now = Date.now();
    if (isTyping === true) {
      if (now - last_type > 5000) {
        socket.emit('typing', true);
        last_type = now;
        setTimeout(typingCheck, 3500);
      }
    } else if (isTyping === false) {
        socket.emit('typing', false);
        last_type = 0;
    } else {
      if (now - last_type > 7000) {
        socket.emit('typing', false);
      } else {
        setTimeout(typingCheck, 3500);
      }
    }
  }
  function show_message(data) {
    var avatar = "<img class='avatar' src='http://gravatar.com/avatar/" + Crypto.MD5(data.from) + "?s=16&d=retro' />";
    var who = data.from.split('@')[0];
    var message = ( data.emote ?
      "<span class='emote'>" + who + " " + data.emote + "</span>" :
      "<span class='nick'>" + who + ":</span>" + "<span class='message'>" + data.message + "</span>");
    $typing.before("<div class='line'>" + avatar + message + "</div>");
    $in.scrollTop($in.prop('scrollHeight'));
  }
  socket.on('connect', function () {
    console.log('connected');
  });
  socket.on('news', function (data) {
    $in.append($("<pre>", { text: "news: " + JSON.stringify(data) }));
    socket.emit('my other event', { my: 'data' });
  });
  socket.on('msg', show_message);
  socket.on('typing', function (who) {
    if (who.length) {
      $typing.html(who.join(', ') + ' ' + (who.length > 1 ? 'are' : 'is') + ' typing...');
      $in.scrollTop($in.prop('scrollHeight'));
    } else {
      $typing.html(' &nbsp; ');
    }
  });
  $("input").on('keypress', function (e) {
    typingCheck(true);
    if (e.keyCode == 13) {
      $(this).trigger('return_pressed');
    }
  });
  $out.on('return_pressed', function () {
    var input = $(this).val(), msg = {}, split;
    if (emote_re.test(input)) {
      msg.emote = input.replace(emote_re, '');
    } else if (cmd_re.test(input)) {
      msg.cmd = cmd_re.exec(input)[1];
    } else if (cmd_with_args_re.test(input)) {
      split = cmd_with_args_re.exec(input);
      msg.cmd = split[1];
      msg.args = split[2];
    } else {
      msg.message = input;
    }
    socket.emit("msg", msg);
    $(this).val('');
    typingCheck(false);
  });
});
