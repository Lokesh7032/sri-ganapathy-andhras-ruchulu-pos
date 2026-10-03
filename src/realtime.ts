import { Server } from "socket.io";
let io:Server;
export function initRealtime(server:any){
  io=new Server(server,{cors:{origin:true,credentials:true}});
  io.on("connection",(socket)=>{
    socket.on("join:branch",(branchId:string)=>{if(branchId)socket.join(`branch:${branchId}`);});
    socket.on("join:order",(orderId:string)=>{if(orderId)socket.join(`order:${orderId}`);});
  });
}
export function emitBranch(branchId:string,event:string,data:any){io?.to(`branch:${branchId}`).emit(event,data);}
export function emitOrder(orderId:string,event:string,data:any){io?.to(`order:${orderId}`).emit(event,data);}