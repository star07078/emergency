// const WebSocket = require('ws');
// const ws = new WebSocket.Server({host: 'localhost', port: 3000 }, () => {
//   console.log('连接成功')
// });
// ws.on('connection', (data) => {
//   // 每一个data对应一个客户端
//   data.send('websoctket已连接')
//   data.on('message', (msg) => {
//     // console.log('from 前端' + msg);
//     // console.log(Buffer.from(msg),'--');
//     data.send('ads')
//   })
//   // 前端关闭触发此函数
//   data.on('close', (msg) => {
//     console.log('前端主动断开连接');
//   })
// })

// this.aa
var path = require('path');
console.log(path.join(__dirname,'./main.js'));
console.log(__dirname);