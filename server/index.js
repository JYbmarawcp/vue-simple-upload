const http = require('http')
const server = http.createServer()

server.on('request', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', '*')
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })

})

server.listen(3001, '0.0.0.0', () => console.log('正在监听 3001 端口'))