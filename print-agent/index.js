import "dotenv/config";
import net from "node:net";
const base=(process.env.KR_POS_URL||"http://localhost:4000").replace(/\/$/,"");
const token=process.env.PRINTER_AGENT_TOKEN;
const poll=Number(process.env.POLL_MS||1200);
if(!token){console.error("PRINTER_AGENT_TOKEN is required");process.exit(1);}
function escpos(order){
  const ESC=Buffer.from([0x1b]), GS=Buffer.from([0x1d]);
  const cmds=[];
  const add=s=>cmds.push(Buffer.from(s,"utf8"));
  cmds.push(Buffer.from([0x1b,0x40]));
  cmds.push(Buffer.from([0x1b,0x61,0x01]));
  cmds.push(Buffer.from([0x1b,0x45,0x01])); add((order.branch.receiptHeader||order.branch.name)+"\n");
  cmds.push(Buffer.from([0x1b,0x45,0x00])); add((order.branch.phone?"Ph: "+order.branch.phone+"\n":""));
  add((order.branch.gstin?"GSTIN: "+order.branch.gstin+"\n":"")+"\n");
  cmds.push(Buffer.from([0x1b,0x61,0x00]));
  add("Bill: "+(order.invoiceNumber||order.number)+"\n");
  add("Date: "+new Date(order.createdAt).toLocaleString("en-IN")+"\n");
  if(order.bench)add("Location: "+order.bench.label+"\n");
  add("--------------------------------\n");
  for(const l of order.lines)add(`${l.menuItem.name}\n  ${l.quantity} x Rs ${Number(l.unitPrice).toFixed(2)} = Rs ${Number(l.lineTotal).toFixed(2)}\n`);
  add("--------------------------------\n");
  add(`Subtotal: Rs ${Number(order.subtotal).toFixed(2)}\n`);
  if(Number(order.discount)>0)add(`Discount: Rs ${Number(order.discount).toFixed(2)}\n`);
  if(Number(order.tax)>0)add(`Tax: Rs ${Number(order.tax).toFixed(2)}\n`);
  cmds.push(Buffer.from([0x1b,0x45,0x01]));add(`TOTAL: Rs ${Number(order.total).toFixed(2)}\n`);cmds.push(Buffer.from([0x1b,0x45,0x00]));
  add(`Payment: ${order.paymentMethod||"UNPAID"}\n\n`);
  cmds.push(Buffer.from([0x1b,0x61,0x01]));add((order.branch.receiptFooter||"Thank you. Please visit again.")+"\n\n\n");
  cmds.push(Buffer.from([0x1d,0x56,0x00]));
  return Buffer.concat(cmds);
}
async function api(path,options={}){const r=await fetch(base+path,{...options,headers:{"content-type":"application/json",...(options.headers||{})}});return r.json();}
async function printTcp(host,port,data){return new Promise((resolve,reject)=>{const s=new net.Socket();s.setTimeout(5000);s.connect(port,host,()=>{s.write(data,()=>s.end(resolve));});s.on("error",reject);s.on("timeout",()=>{s.destroy();reject(new Error("Printer timeout"));});});}
async function loop(){try{const r=await api(`/api/printer-agent/jobs?agentToken=${encodeURIComponent(token)}`);if(r.job){const p=r.job.printer;if(!p?.host){throw new Error("Printer has no network host configured; use the browser print path or configure a LAN printer");}await printTcp(p.host,p.port||9100,escpos(r.job.order));await api(`/api/printer-agent/jobs/${r.job.id}?agentToken=${encodeURIComponent(token)}`,{method:"POST",body:JSON.stringify({status:"PRINTED"})});console.log("Printed",r.job.id);} }catch(e){console.error("Print agent:",e.message);}
setTimeout(loop,poll);}
console.log("KR Catering print agent running");loop();
