'use strict'

const express = require('express')
const bodyParser = require('body-parser')
const request = require('request')
const app = express()
var FeedMe = require('feedme');
var http = require('http');


app.set('port', (process.env.PORT || 3000))

// Process application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({
    extended: false
}))

// Process application/json
app.use(bodyParser.json())

// Index route
app.get('/', function(req, res) {
    res.send('Hello world, I am a chat bot with alias')
})

// for Facebook verification
app.get('/webhook/', function(req, res) {
    if (req.query['hub.verify_token'] === 'my_voice_is_my_password_verify_me') {
        res.send(req.query['hub.challenge'])
    }
    res.send('Error, wrong token')
})



app.post('/webhook', function(req, res) {
    var data = req.body;

    // Make sure this is a page subscription
    if (data.object === 'page') {

        // Iterate over each entry - there may be multiple if batched
        data.entry.forEach(function(entry) {
            var pageID = entry.id;
            var timeOfEvent = entry.time;

            // Iterate over each messaging event
            entry.messaging.forEach(function(event) {
                if (event.message) {
                    receivedMessage(event);
                } else if (event.postback) {
                    receivedPostback(event)
                } else {
                    console.log("Webhook received unknown event: ", event);
                }
            });
        });

        // Assume all went well.
        //
        // You must send back a 200, within 20 seconds, to let us know
        // you've successfully received the callback. Otherwise, the request
        // will time out and we will keep trying to resend.
        res.sendStatus(200);
    }
});

function receivedMessage(event) {
    var senderID = event.sender.id;
    var recipientID = event.recipient.id;
    var timeOfMessage = event.timestamp;
    var message = event.message;

    console.log("Received message for user %d and page %d at %d with message:",
        senderID, recipientID, timeOfMessage);
    console.log(JSON.stringify(message));

    var messageId = message.mid;

    var messageText = message.text;
    var messageAttachments = message.attachments;

    if (messageText) {

        // If we receive a text message, check to see if it matches a keyword
        // and send back the example. Otherwise, just echo the text we received.
        switch (messageText) {
            case 'generic':
                sendGenericMessage(senderID);
                break;
            case 'yu baina':
                sendTextMessage(senderID, "yumgui de chamaar yu baina");
                break;
            case 'rss':
                sendRssFeed(senderID);
                break;
            case 'weather':
                sendWeatherInfo(senderID);
                break;
            case 'agaar':
                sendAirQualityInfo(senderID);
                break;
            default:
                spellCheckText(senderID, messageText);
        }
    } else if (messageAttachments) {
        sendTextMessage(senderID, "Message with attachment received");
    }
}

function sendAirQualityInfo(sender){

    var request = require('request');
    request('http://agaar.mn/aqdata/stationlist?period=h&language=mn', function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var info = JSON.parse(body);
            for(var i = 0; i < info.length; i++) {
                var obj = info[i];
                sendTextMessage(sender, obj.name + "-д " + "Агаарын чанарын индекс : " + obj.aqiData.current + " байна");
            }

        }
    });


}


function sendWeatherInfo(sender){

   
    var request = require('request');
    request('http://api.openweathermap.org/data/2.5/weather?q=Ulaanbaatar,mn&units=metric&appid=bc3af3308341c2169a2e8d146ada67ea', function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var info = JSON.parse(body)
            var description = info.weather[0].description;
            var temprature = info.main.temp;
            var name = info.name;
            sendTextMessage(sender, "Weather on: " + name + " " + "Temprature: " + temprature + "c" + " description: "+ description);

        }
    });


}


function sendRssFeed(sender){

    http.get('http://news.gogo.mn/feed', function(res) {
    var parser = new FeedMe(true);
      // parser.on('title', function(title) {
      //   console.log('title of feed is', title);
      //   sendTextMessage(sender, title)
      // });

      var messageData = {
                recipient: {
                    id: sender
                },
                message: {
                    attachment: {
                        type: "template",
                        payload: {
                            template_type: "generic",
                            elements: []
                        }
                    }
                }
            };

        

      parser.on('item', function(item) {
        console.log();
        console.log('news:', item.title);
        console.log(item.description);
        
        var element = {
                        title: item.title,
                        subtitle: item.author,
                        item_url: "https://www.oculus.com/en-us/rift/",
                        image_url: "http://messengerdemo.parseapp.com/img/rift.png",
                        buttons: [{
                            type: "web_url",
                            url: item.link,
                            title: "Open Web URL"
                        }, {
                            type: "postback",
                            title: "Call Postback",
                            payload: "Payload for first bubble",
                        }],
                    };

        messageData.message.attachment.payload.elements.push(element);

      });

    res.pipe(parser);
    });

}



const token = "EAAEK604hQzkBANNbEnb6ccZBzDTZAyZAUHepj6pWcntdRupbjD4qfvZAdSQz5kmPAGIxQqWeqx4Wf4uxQQ6iJT9KXYgmBk8PdMe16qQ2VTnZBtQZAZAZBcBfR5LqU5gTMCpOOWS2jumZA5SBbPMiC35Pt9aAHhjSS5uvxAPQoTee3vAZDZD"

function sendTextMessage(sender, text) {
    let messageData = {
        text: text
    }
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {
            access_token: token
        },
        method: 'POST',
        json: {
            recipient: {
                id: sender
            },
            message: messageData,
        }
    }, function(error, response, body) {
        if (error) {
            console.log('Error sending messages: ', error)
        } else if (response.body.error) {
            console.log('Error: ', response.body.error)
        }
    })
}


function spellCheckText(sender, text) {
    var request = require('request');

    var options = {
        uri: 'http://www.spellcheck.gov.mn/scripts/tiny_mce/plugins/spellchecker/rpc.php',
        method: 'POST',
        json: {
            "id":"c0","method":"checkWords","params":["mn",[text]]
        }
    };

    request(options, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            // var res = JSON.parse(body);
            var result = body.result;
            if (typeof result !== 'undefined' && result.length > 0) {
                for(var i=0; i < result.length; i++){
                    console.log(result[i]);
                    requestSuggestion(sender, result[i])
                    // sendTextMessage(sender, result[i]);
                }
            } else{
                sendTextMessage(sender, "Алдаатай үг олдсонгүй")
            }

            
            console.log(body);
        } else{
            console.error(error);
            console.error(response);
            sendTextMessage(sender, "Алдаа гарлаа")
    
        }
    }); 
}


function requestSuggestion(sender, text){
    var request = require('request');

    var options = {
        uri: 'http://www.spellcheck.gov.mn/scripts/tiny_mce/plugins/spellchecker/rpc.php',
        method: 'POST',
        json: {"id":"c0","method":"getSuggestions","params":["mn",text]}
    };

    request(options, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            // var res = JSON.parse(body);
            var result = body.result;
            if (typeof result !== 'undefined' && result.length > 0) {
                var returnString = "Алдаатай үг : " + text + " Cанал болгох: "
                for(var i=0; i < result.length; i++){
                    returnString += result[i] + ", ";
                }
                sendTextMessage(sender, returnString);
            }

            console.log(body);
        } else{
            console.error(error);
            console.error(response);
        }
    }); 

}


function callSendAPI(messageData) {
    request({
        uri: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {
            access_token: token
        },
        method: 'POST',
        json: messageData

    }, function(error, response, body) {
        if (!error && response.statusCode == 200) {
            var recipientId = body.recipient_id;
            var messageId = body.message_id;

            console.log("Successfully sent generic message with id %s to recipient %s",
                messageId, recipientId);
        } else {
            console.error("Unable to send message.");
            console.error(response);
            console.error(error);
        }
    });
}

function sendGenericMessage(recipientId) {
    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            attachment: {
                type: "template",
                payload: {
                    template_type: "generic",
                    elements: [{
                        title: "rift",
                        subtitle: "Next-generation virtual reality",
                        item_url: "https://www.oculus.com/en-us/rift/",
                        image_url: "http://messengerdemo.parseapp.com/img/rift.png",
                        buttons: [{
                            type: "web_url",
                            url: "https://www.oculus.com/en-us/rift/",
                            title: "Open Web URL"
                        }, {
                            type: "postback",
                            title: "Call Postback",
                            payload: "Payload for first bubble",
                        }],
                    }, {
                        title: "touch",
                        subtitle: "Your Hands, Now in VR",
                        item_url: "https://www.oculus.com/en-us/touch/",
                        image_url: "http://messengerdemo.parseapp.com/img/touch.png",
                        buttons: [{
                            type: "web_url",
                            url: "https://www.oculus.com/en-us/touch/",
                            title: "Open Web URL"
                        }, {
                            type: "postback",
                            title: "Call Postback",
                            payload: "Payload for second bubble",
                        }]
                    }]
                }
            }
        }
    };

    callSendAPI(messageData);
}

function receivedPostback(event) {
    var senderID = event.sender.id;
    var recipientID = event.recipient.id;
    var timeOfPostback = event.timestamp;

    // The 'payload' param is a developer-defined field which is set in a postback 
    // button for Structured Messages. 
    var payload = event.postback.payload;

    console.log("Received postback for user %d and page %d with payload '%s' " +
        "at %d", senderID, recipientID, payload, timeOfPostback);

    // When a postback is called, we'll send a message back to the sender to 
    // let them know it was successful
    sendTextMessage(senderID, "Postback called");
}

function init() {
    // Spin up the server
    app.listen(app.get('port'), function() {
        console.log('running on port', app.get('port'))
    })
}

init();
