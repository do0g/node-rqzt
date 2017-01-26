//import http  from 'http';
//import https from 'https';
const http = require('http');
const https = require('https');
const _url = require('url');

const id = a => a;
const cleanMimeType = mimeType => /^[^ ;]*|^.*/.exec(mimeType)[0];
const isPlainObject = value => Object.prototype.toString.call(value) === '[object Object]';

const getResponseBodyTransform = mimeType => {
  switch (cleanMimeType(mimeType)) {
    case 'text/plain':
    case 'text/html':
    case 'text/css':
      return buffer => buffer.toString('utf8');
    case 'application/json':
      return buffer => JSON.parse(buffer.toString('utf8'));
  }
  return id;
}

const cleanProtocol = protocol => /^\w+/.exec(protocol)[0];
const getClient = protocol => {
  switch (cleanProtocol(protocol)) {
    case 'https':
      return https;
  }
  return http;
}

const req = url => Promise.resolve().then(() => new Promise((resolve, reject) => {
  const options = isPlainObject(url) ? url : _url.parse(url);
  const httpx = getClient(options.protocol);
  const request = httpx.request(options, response => {
    const { statusCode, headers } = response;
    if (statusCode == 301) {
      resolve(req(headers.location));
    }
    if (statusCode >= 400 && statusCode <= 599) {
      response.resume(); // consume & free response
      reject(new Error(`Server returned status: ${statusCode}`));
    }

    const contentType = response.headers['content-type'];
    const transformResponseBody = getResponseBodyTransform(contentType);

    const responseBuffers = [];
    response.on('data', chunk => responseBuffers.push(chunk));
    response.on('end',  () => resolve({
      statusCode,
      headers,
      body: transformResponseBody(Buffer.concat(responseBuffers))
    }));
  });
  request.on('error', reject);
  request.end();
}));

//export req;

req('http://ip.jsontest.com/')
  .then(response => console.log(response.body))
  .catch(err => console.error(err));
