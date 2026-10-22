const tls = require('tls');
const socket = tls.connect(993, 'imap.gmail.com', { rejectUnauthorized: false }, () => {
  console.log('Connected to IMAP');
});

let step = 0;
socket.on('data', (d) => {
  const msg = d.toString();
  console.log('--- IMAP DATA ---');
  console.log(msg.trim());

  if (step === 0 && msg.includes('* OK')) {
    step = 1;
    socket.write('a1 LOGIN palingubaerwin029@gmail.com azeewrebyfqralkb\r\n');
  } else if (step === 1 && msg.includes('a1 OK')) {
    step = 2;
    console.log('✅ IMAP Login success!');
    socket.write('a2 SELECT "[Gmail]/Sent Mail"\r\n');
  } else if (step === 2 && msg.includes('a2 OK')) {
    step = 3;
    socket.write('a3 SEARCH ALL\r\n');
  } else if (step === 3 && msg.includes('a3 OK')) {
    // get search results
    const lines = msg.split('\r\n');
    const searchLine = lines.find(l => l.startsWith('* SEARCH'));
    if (searchLine) {
      const ids = searchLine.replace('* SEARCH', '').trim().split(/\s+/).filter(Boolean);
      const last3 = ids.slice(-3);
      console.log('Last sent message IDs:', last3);
      if (last3.length > 0) {
        step = 4;
        socket.write(`a4 FETCH ${last3.join(',')} (BODY[HEADER.FIELDS (FROM TO SUBJECT DATE)])\r\n`);
        return;
      }
    }
    step = 5;
    socket.write('a5 SELECT INBOX\r\n');
  } else if (step === 4 && msg.includes('a4 OK')) {
    step = 5;
    socket.write('a5 SELECT INBOX\r\n');
  } else if (step === 5 && msg.includes('a5 OK')) {
    step = 6;
    socket.write('a6 SEARCH ALL\r\n');
  } else if (step === 6 && msg.includes('a6 OK')) {
    const lines = msg.split('\r\n');
    const searchLine = lines.find(l => l.startsWith('* SEARCH'));
    if (searchLine) {
      const ids = searchLine.replace('* SEARCH', '').trim().split(/\s+/).filter(Boolean);
      const last3 = ids.slice(-3);
      console.log('Last inbox message IDs:', last3);
      if (last3.length > 0) {
        step = 7;
        socket.write(`a7 FETCH ${last3.join(',')} (BODY[HEADER.FIELDS (FROM TO SUBJECT DATE)])\r\n`);
        return;
      }
    }
    step = 8;
    socket.write('a8 LOGOUT\r\n');
  } else if (step === 7 && msg.includes('a7 OK')) {
    socket.write('a8 LOGOUT\r\n');
    process.exit(0);
  }
});
socket.on('error', (e) => console.error('IMAP Error:', e));
