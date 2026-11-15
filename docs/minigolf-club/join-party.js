// Genuine Socket.IO peers for maximum-party tests. No game-state injection.
const {io}=require('../../node-server/node_modules/socket.io-client');
const crypto=require('crypto');
const [url,code,count='5']=process.argv.slice(2),peers=[];
(async()=>{
 for(let i=0;i<Number(count);i++){
  const socket=io(url,{transports:['websocket'],forceNew:true});peers.push(socket);
  await new Promise((resolve,reject)=>{socket.once('connect',resolve);socket.once('connect_error',reject);});
  await new Promise(resolve=>socket.emit('joinRoom',{code,token:crypto.randomBytes(16).toString('hex'),profile:{name:['Nova','Kai','Milo','Pip','Rex'][i]||'Friend',avatar:{e:i+1,c:i%6}}},resolve));
 }
 console.log('READY');
})().catch(e=>{console.error(e);process.exit(1);});
const stop=()=>{for(const s of peers)s.disconnect();process.exit(0);};process.on('SIGTERM',stop);process.on('SIGINT',stop);
