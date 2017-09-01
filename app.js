const fs = require('fs')
const path = require('path')
var https = require('https');
var axios = require('axios');
var httpClient = axios.create({
  httpsAgent: new https.Agent({  
    rejectUnauthorized: true
  })
});

const linebot = require('linebot');


const env = require('config/env');

const savePath = './save', noteName = 'note.txt', EOL = '\r\n', encoding = 'utf8',
  imageFolderName = 'images',
  MSG_TYPE = {
    TEXT: 'text',
    IMAGE: 'image',
    LOCATION: 'location',
  },
  cmdList = [
    '讀 [第幾項]',
    '存 內容',
    '刪 [第幾項]',
    '查 id',
    '地 [地址]',
  ];

const bot = linebot({
  channelId: env.bot.channelID,
  channelSecret: env.bot.channelSecret,
  channelAccessToken: env.bot.channelAccessToken,
});

bot.on('message', function (event) {
  console.log('event', event);
  const msgType = event.message.type,
    userId = event.source.userId,
    userDirectory = savePath + '/' + userId,
    userImageDirectory = userDirectory + '/' + imageFolderName,
    noteFileName = userDirectory + '/' + noteName;

  mkdirSync(savePath)
  mkdirSync(userDirectory)
  mkdirSync(userImageDirectory)
  
  if (msgType === MSG_TYPE.TEXT) {
    return processText(event, noteFileName);
  }

  if (msgType === MSG_TYPE.IMAGE) {
    return processImage(event, userImageDirectory);
  }
});

bot.listen('/', env.port, function () {
	console.log('LineBot is running.');
});

function processImage(event, userImageDirectory) {
  const imageFileName = userImageDirectory + '/' + event.message.id + '.jpg';

  event.message.content().then(function(data) {
    //console.log('image content=', data);
    //writeSync(imageFileName, data);
  }).catch(catchError)
}

function processText(event, noteFileName) {
  const msgText = event.message.text.toLowerCase(), replyText = { type: MSG_TYPE.TEXT, text: msgText };

  if (msgText === 'hi') {
    replyText.text = cmdList.join(EOL);

    //console.log('replyText', replyText)
    return event.reply(replyText).then(normalBack).catch(catchError);
  }

  if (msgText === '讀') {
    replyText.text = readSync(noteFileName);

    //console.log('replyText', replyText)
    return event.reply(replyText).then(normalBack).catch(catchError);
  }

  const readData = msgText.match(/^讀 (.*)$/);

  if (readData && readData.length > 1) {
    let itemId = parseInt(readData[1].trim());
    if (isNaN(itemId) || itemId < 1) {
      itemId = 0;
    }
    const fileData = readSync(noteFileName).split(EOL);

    replyText.text = itemId === 0 ? fileData.join(EOL) : fileData[itemId - 1];

    //console.log('replyText', replyText)
    return event.reply(replyText).then(normalBack).catch(catchError);
  }

  const saveData = msgText.match(/^存 (.*)$/);

  if (saveData && saveData.length > 1) {
    appendSync(noteFileName, saveData[1].trim() + EOL);

    replyText.text = '好喔';

    //console.log('replyText', replyText)
    return event.reply(replyText).then(normalBack).catch(catchError);
  }

  const removeData = msgText.match(/^刪 (.*)$/);

  if (removeData && removeData.length > 1) {
    let itemId = parseInt(removeData[1].trim());
    const fileData = readSync(noteFileName).split(EOL),
      newData = [];

    if (isNaN(itemId) || itemId < 1) {
      itemId = fileData.length - 1;
    } else {
      itemId -= 1;
    }

    fileData.forEach(function(row, index) {
      var cleanRow = row.trim();

      if (cleanRow && (index !== itemId)) {
        newData.push(cleanRow + EOL)
      }
    });

    writeSync(noteFileName, newData.join(''));

    replyText.text = '好喔';
    
    //console.log('replyText', replyText)
    return event.reply(replyText).then(normalBack).catch(catchError);
  }

  if (msgText === '查 id') {
    replyText.text = userId;

    //console.log('replyText', replyText)
    return event.reply(replyText).then(normalBack).catch(catchError);
  }

  const addressData = msgText.match(/^地 (.*)$/);
  
  if (addressData && addressData.length > 1) {
    const address = encodeURIComponent(addressData[1].trim());
    const queryURL = 'https://maps.googleapis.com/maps/api/place/textsearch/json?query=' + address + '&key=' + env.googleAPIKey;

    return httpClient({ url: queryURL}).then(function(res) {
      if (res && res.status === 200 && res.data && res.data.status === 'OK' && res.data.results && res.data.results.length > 0) {
        //console.log('Call google api ok, results=', res.data.results);
        const location = res.data.results[0], reply = {
          type: MSG_TYPE.LOCATION,
          title: '目標地點',
          address: location.formatted_address,
          latitude: location.geometry.location.lat,
          longitude: location.geometry.location.lng,
        };

        //console.log('Call google api ok, reply=', reply);
        return event.reply(reply).then(normalBack).catch(catchError);
      } else {
        console.log('Call google api failed, data=', res);
        replyText.text = '找不到喔';

        //console.log('replyText', replyText)
        return event.reply(replyText).then(normalBack).catch(catchError);
      }
    }).catch(catchError);
  }
  
  // return event.reply(replyText).then(normalBack).catch(catchError);
}

////
function normalBack(data) {
  //console.log('Success', data);
}

function catchError(error) {
  console.log('Error', error);
}

function mkdirSync(dirPath) {
  try {
    fs.existsSync(dirPath) || fs.mkdirSync(dirPath)
  } catch (err) {
    if (err.code !== 'EEXIST') throw err
  }  
}

function appendSync(fileName, data) {
  fs.appendFileSync(fileName, data, encoding)
}

function readSync(fileName) {
  return fs.readFileSync(fileName, encoding)
}

function writeSync(fileName, data) {
  fs.writeFileSync(fileName, data, encoding)
}
