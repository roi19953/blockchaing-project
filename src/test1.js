var prompt = require('prompt');
 
prompt.start();

var thisResult = "";

prompt.get(['username', 'email'], function (err, result) {
  console.log('Command-line input received:');
  thisResult = result.username
});

console.log(thisResult)

// const {username, email} = await prompt.get(['username', 'email']);

// const {username, email} = await prompt.get(['username', 'email']);

