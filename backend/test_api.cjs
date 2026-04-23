const http = require('http');

http.get('http://localhost:5000/api/encounters', (res) => {
    let data = '';
    res.on('data', (c) => data += c);
    res.on('end', () => console.log('Encounters API:', JSON.parse(data)));
}).on('error', console.error);

http.get('http://localhost:5000/api/lab-orders', (res) => {
    let data = '';
    res.on('data', (c) => data += c);
    res.on('end', () => console.dir(JSON.parse(data), {depth: null, maxArrayLength: 2}));
}).on('error', console.error);

http.get('http://localhost:5000/api/imaging-orders', (res) => {
    let data = '';
    res.on('data', (c) => data += c);
    res.on('end', () => console.dir(JSON.parse(data), {depth: null, maxArrayLength: 2}));
}).on('error', console.error);
