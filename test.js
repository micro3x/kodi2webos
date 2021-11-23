function _parseMessages(messageString) {
  let output = [];
  const messages = messageString.trim();
  let msgStart = 0;
  // let end = messageString.length;
  let counter = 0;

  for (let i = 0; i < messageString.length; i++) {
    const char = messageString[i];
    if (!char || char.match(/\s+/)) {
      continue;
    }
    if (char === '{') {
      counter += 1;
    }
    if (char === '}') {
      counter -= 1;
    }
    if (counter === 0) {
      let message = messageString.substring(msgStart, i + 1).trim();
      output.push(message);
      msgStart = i + 1;
    }

  }
  return output;
}


const data = "{1: {22: { 222: {} }}, 2: {}} {2} {3} {4}"

console.log(_parseMessages(data));

console.log('end');

