# Zoom Node.js Chatbot Library

The Zoom Node.js Chatbot Library wraps OAuth2, receiving slash commands and user actions, sending messages, and making requests to the Zoom API into easy to use functions you can import in your Node.js app.

To get started follow the [instructions](#installation) and [examples](#examples) below, or checkout the [sample app](#sample-app).

## Installation

To get started install the [@zoomus/chatbot](https://www.npmjs.com/package/@zoomus/chatbot) NPM package.

`$ npm install @zoomus/chatbot --save`

## Setup

Import [@zoomus/chatbot](https://www.npmjs.com/package/@zoomus/chatbot) into your app.

```js
const { oauth2, client } = require('@zoomus/chatbot');
```

## Authentication

There are two options for authenticating your Chatbot.

1. The [Chatbot Credentials Flow](#chatbot-credentials-flow) for just [sending Chatbot messages](#sending-chatbot-messages).

   Or

2. The [OAuth2 Credentials Flow](#oauth2-credentials-flow) for [sending Chatbot messages](#sending-chatbot-messages) AND [calling the Zoom APIs](#calling-the-zoom-apis).

   > NOTE: The OAuth2 Credentials Flow flow requires a database.

### Chatbot Credentials Flow

```js
const oauth2Client = oauth2('{{ CLIENT_ID }}', '{{ CLIENT_SECRET }}');

let chatbot = client('{{ CLIENT_ID }}', '{{ VERIFICATION_TOKEN }}', '{{ BOT_JID }}')
.commands([{ command: '{{ SLASH_COMMAND }}', hint: '<command parameter>', description: 'This is what my chatbot does' }])
.configurate({ help: true, errorHelp: false })
.defaultAuth(oauth2Client.connect());

app.get('/authorize', async (req, res) => {
  res.send('Thanks for installing!')
})

let app = chatbot.create({ auth: oauth2Client.connect() })
```

See below for an example of [sending a message after receiving a users slash command.](#sending-a-message-after-receiving-a-users-slash-command)

### OAuth2 Credentials Flow

```js
const oauth2Client = oauth2('{{ CLIENT_ID }}', '{{ CLIENT_SECRET }}', '{{ REDIRECT_URI }}');

let chatbot = client('{{ CLIENT_ID }}', '{{ VERIFICATION_TOKEN }}', '{{ BOT_JID }}')
.commands([{ command: '{{ SLASH_COMMAND }}', hint: '<command parameter>', description: 'This is what my chatbot does' }])
.configurate({ help: true, errorHelp: false })
.defaultAuth(oauth2Client.connect());

let middleZoomAuth = async (req, res, next) => {
  let { code } = req.query;
  try {
    let connection = await oauth2Client.connectByCode(code);
    let zoomApp = chatbot.create({ auth:connection });
    res.locals.zoomApp = zoomApp;
    next();
  }
  catch(error) {
    console.log(error)
    res.send(error)
  }
};

app.get('/authorize', middleZoomAuth, async (req, res) => {
  res.send('Thanks for installing!')

  let { zoomApp } = res.locals;
  let tokens = zoomApp.auth.getTokens();

  // save tokens to db
  db.set('access_token')
  db.set('refresh_token')
  db.set('expires_in')
});
```

#### Setting Tokens

Get your access_token, refresh_token, and expires_in timestamp from your database and pass them into the `auth.setTokens()` function to allow `zoomApp` to make authenticated requests.

```js
zoomApp.auth.setTokens({
  // get tokens from database
  access_token: db.get('access_token'),
  refresh_token: db.get('refresh_token'),
  expires_in: db.get('expires_in')
});
```

#### Refreshing the Access Token

If the access_token is expired, this function will request a new access_token, so you can update the tokens in your `zoomApp` instance and database.

```js
zoomApp.auth.callbackRefreshTokens((tokens) => {

  zoomApp.auth.setTokens({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_in: tokens.expires_in
  });

  // save new tokens to db
  db.set('access_token')
  db.set('refresh_token')
  db.set('expires_in')
});
```

See below for an example of [calling the Zoom API and sending a message after receiving a users slash command.](#calling-the-zoom-api-and-sending-a-message-after-receiving-a-users-slash-command)

## Slash Commands and User Actions

[Slash commands](https://marketplace.zoom.us/docs/guides/chatbots/sending-messages#receive) are what the user types in Zoom Chat to interact with your Chatbot.

[User Actions](https://marketplace.zoom.us/docs/guides/chatbots/sending-messages#user-commands) are user interactions with the [Editable Text](https://marketplace.zoom.us/docs/guides/chatbots/customizing-messages/message-with-editable-text), [Form Field](https://marketplace.zoom.us/docs/guides/chatbots/customizing-messages/message-with-form-field), [Dropdown](https://marketplace.zoom.us/docs/guides/chatbots/customizing-messages/message-with-dropdown), or [Buttons](https://marketplace.zoom.us/docs/guides/chatbots/customizing-messages/message-with-buttons) message types in Zoom Chat.

### Receiving Slash Commands and User Actions

This express post route will receive all user commands and actions, and handle them by passing the request data to the event handler. Based on if the event is a command or action, the respective event listener function will be called.

```js
app.post('/webhook', async (req, res) => {
  let { body, headers } = req
  try {
    await chatbot.handle({ body, headers })
    res.status(200)
    res.send()
  } catch (error) {
    console.log(error)
    res.send(error)
  }
})
```

### Handling Slash Commands

When the user types a slash command the `chatbot.on('commands')` function will be called.

```js
chatbot.on('commands', async (event) => {
  console.log(event)
  // app logic here
})
```

### Handling User Actions

When the user interacts with the [Editable Text](https://marketplace.zoom.us/docs/guides/chatbots/customizing-messages/message-with-editable-text), [Form Field](https://marketplace.zoom.us/docs/guides/chatbots/customizing-messages/message-with-form-field), [Dropdown](https://marketplace.zoom.us/docs/guides/chatbots/customizing-messages/message-with-dropdown), or [Buttons](https://marketplace.zoom.us/docs/guides/chatbots/customizing-messages/message-with-buttons) message types, the `chatbot.on('actions')` function will be called.

```js
chatbot.on('actions', async (event) => {
  console.log(event)
  // app logic here
})
```

## Sending Chatbot Messages

To send a Chatbot message, first create an auth connection. Then, call the `zoomApp.sendMessage()` function, passing in a [Chatbot message object](https://marketplace.zoom.us/docs/guides/chatbots/customizing-messages#base-json-structure).

```js
let zoomApp = chatbot.create({ auth: oauth2Client.connect() });

zoomApp.sendMessage({
  to_jid: 'to_jid: can get from webhook response or GET /users/{userID}',
  account_id: 'account_id: can get from webhook response or from JWT parsed access_token or GET /users/{userID}',
  content: {
    head: {
      text: 'Hello World'
    }
  }
}).then((data) => {
  console.log(data)
}).catch((error) => {
  console.log(error)
})
```

## Calling the Zoom APIs

To call the Zoom API's, first create an auth connection. Then, call the `zoomApp.request()` function, passing in a respective url, method, and body from one of our [API endpoints](https://marketplace.zoom.us/docs/api-reference/introduction).

```js
let zoomApp = chatbot.create({ auth: oauth2Client.connect() });

zoomApp.auth.setTokens({
  access_token: 'get from database',
  refresh_token: 'get from database',
  expires_in: 'get from database'
});

zoomApp.auth.callbackRefreshTokens((tokens) => {

  zoomApp.auth.setTokens({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_in: tokens.expires_in
  });

  // save new tokens to db
  db.set('access_token')
  db.set('refresh_token')
  db.set('expires_in')
});

zoomApp.request({
  url:'/v2/users/me',
  method:'get',
}).then((data) => {
  console.log(data)
}).catch((error) => {
  console.log(error)
})
```

> NOTE: To call the Zoom API's you must authenticate your Chatbot via the [OAuth2 Credentials Flow](#oauth2-credentials-flow).

```js
let { setting } = require('@zoomus/chatbot');

setting.debug(true);
```

## Examples

### Sending a message after receiving a users slash command.

In Zoom Chat type `/slashcommand Hello World`. You will see a message that reads `You said Hello World`.

```js
app.post('/webhook', async (req, res) => {
  let { body, headers } = req
  try {
    await chatbot.handle({ body, headers })
    res.status(200)
    res.send()
  } catch (error) {
    console.log(error)
    res.send(error)
  }
})

chatbot.on('commands', async (event) => {
  console.log(event)

  let zoomApp = chatbot.create({ auth: oauth2Client.connect() });

  zoomApp.sendMessage({
    to_jid: event.payload.toJid,
    account_id: event.payload.accountId,
    content: {
      head: {
        text: 'You said ' + event.message
      }
    }
  }).then((data) => {
    console.log(data)
  }).catch((error) => {
    console.log(error)
  })
})
```

### Calling the Zoom API and sending a message after receiving a users slash command.

In Zoom Chat type `/slashcommand email`. You will see a message that contains information about the user on your account whose email you entered.

```js
app.post('/webhook', async (req, res) => {
  let { body, headers } = req
  try {
    await chatbot.handle({ body, headers })
    res.status(200)
    res.send()
  } catch (error) {
    console.log(error)
    res.send(error)
  }
})

chatbot.on('commands', async (event) => {
  console.log(event)

  let zoomApp = chatbot.create({ auth: oauth2Client.connect() });

  zoomApp.auth.setTokens({
    access_token: 'get from database',
    refresh_token: 'get from database',
    expires_in: 'get from databse'
  });

  zoomApp.auth.callbackRefreshTokens((tokens) => {

    zoomApp.auth.setTokens({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_in: tokens.expires_in
    });

    // save new tokens to db
    db.set('access_token')
    db.set('refresh_token')
    db.set('expires_in')
  });

  zoomApp.request({
    url: '/v2/users/' + event.command,
    method: 'get',
  }).then((data) => {
    console.log(data)

    zoomApp.sendMessage({
      to_jid: event.payload.toJid,
      account_id: event.payload.accountId,
      content: {
        head: {
          text: 'Hi ' + data.first_name
        },
        body: [
          {
            type: 'section',
            sections: [
              {
                type: 'message',
                text: 'Your Role: ' + data.role_name
              }
            ],
            footer_icon: data.pic_url,
            footer: data.phone_number
          }
        ]
      }
    }).then((data) => {
      console.log(data)
    }).catch((error) => {
      console.log(error)
    })
  }).catch((error) => {
    console.log(error)

    zoomApp.sendMessage({
      to_jid: event.payload.toJid,
      account_id: event.payload.accountId,
      content: {
        head: {
          text: 'Error: ' + error.message
        }
      }
    }).then((data) => {
      console.log(data)
    }).catch((error) => {
      console.log(error)
    })
  })
})
```

## Sample App

Checkout our [Vote Chatbot Sample App](https://github.com/zoom/vote-chatbot) built using this NPM package.

![Vote Chatbot for Zoom](https://s3.amazonaws.com/user-content.stoplight.io/19808/1567798340584)

## Debug

To print out the HTTP request log, require the `setting` object and pass in `true`.

## Need Support?
The first place to look for help is on our [Developer Forum](https://devforum.zoom.us/), where Zoom Marketplace Developers can ask questions for public answers.

If you can’t find the answer in the Developer Forum or your request requires sensitive information to be relayed, please email us at developersupport@zoom.us.
