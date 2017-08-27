const linebot = require('linebot');

var env = require('config/env');

const bot = linebot({
  channelId: env.bot.channelID,
  channelSecret: env.bot.channelSecret,
  channelAccessToken: env.bot.channelAccessToken,
});

bot.on('message', function (event) {
	event.reply(event.message.text).then(function (data) {
		console.log('Success', data);
	}).catch(function (error) {
		console.log('Error', error);
	});
});

bot.listen('/', env.port, function () {
	console.log('LineBot is running.');
});