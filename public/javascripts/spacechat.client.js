// vim: ts=2 sw=2 expandtab
(function () {
  window['spacechat'] = window['sapcechat'] || io.connect('http://localhost');
  var socket = window.spacechat;
  var $out = $("#chat_out"), $in = $("#chat_in"), $me = $("#my_nick");
  var emote_re = /^\/me /;
  function show_message(data) {
    var avatar = "<img class='avatar' src='http://gravatar.com/avatar/" + md5(data.from) + "?s=16&d=retro' />";
    var who = data.from.split('@')[0];
    var message = ( data.emote ?
      "<span class='emote'>" + who + " " + data.emote + "</span>" :
      "<span class='nick'>" + who + ":</span>" + "<span class='message'>" + data.message + "</span>");
    $in.append("<div class='line'>" + avatar + message + "</div>");
  }
  socket.on('connect', function () {
    $me.val(this.socket.sessionid);
  });
  socket.on('news', function (data) {
    $in.append($("<pre>", { text: "news: " + JSON.stringify(data) }));
    socket.emit('my other event', { my: 'data' });
  });
  socket.on('msg', show_message);
  $("input").on('keypress', function (e) {
    if (e.keyCode == 13) {
      $(this).trigger('return_pressed');
    }
  });
  $out.on('return_pressed', function () {
    var input = $(this).val(), msg = {};
    if (emote_re.test(input)) {
      msg.emote = input.replace(emote_re, '');
    } else {
      msg.message = input;
    }
    socket.emit("msg", msg);
    $(this).val('');
  });
  $me.on('return_pressed', function () {
    var nick = $(this).val();
    socket.emit("nick", nick, function (success) {
      if (success) {
        $me.prop('disabled', true);
      } else {
        $me.val("sorry, taken, try again");
      }
    });
  });

}) ();
