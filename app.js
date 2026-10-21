import {aggregatePaidUsers,runJoin,sqlFor} from './core.js';
const users=[{id:1,name:'小林'},{id:2,name:'小周'},{id:3,name:'小陈'},{id:4,name:'小吴'}];
const baseOrders=[{id:101,userId:1,status:'paid'},{id:102,userId:1,status:'unpaid'},{id:103,userId:2,status:'unpaid'},{id:104,userId:4,status:null},{id:105,userId:99,status:'paid'}];
const modes={all:'不加筛选',on:'放在 ON',where:'放在 WHERE',orNull:'WHERE + IS NULL',inner:'INNER JOIN'};
const details={all:['所有用户都留下，订单逐笔关联','仅按用户 ID 匹配。没有订单的用户补一行 NULL，有多笔订单的用户就有多行。'],on:['先筛选订单，再为未匹配用户补齐','只有已支付订单才算匹配。没有已支付订单的用户，也会得到一行 NULL 补齐结果。'],where:['补齐发生过，随后又被 WHERE 筛掉','先按用户 ID 连接。WHERE 只留下 paid；未支付、未知状态和补齐行都无法通过。'],orNull:['救回没有订单的人，救不回只有未支付订单的人','OR o.id IS NULL 保留补齐行。已有订单的人不会自动补齐，未支付订单仍被筛掉。'],inner:['只保留有已支付订单的用户','不生成补齐行。在这里，它与 WHERE status = paid 的左连接结果相同。']};
let mode='on',orders=baseOrders.map(o=>({...o})),noticeTimer;
const $=id=>document.getElementById(id);
function cell(tr,value,cls){const td=document.createElement('td');if(cls)td.className=cls;if(value===null){const span=document.createElement('span');span.className='null';span.textContent='NULL';td.append(span);}else td.textContent=String(value);tr.append(td);return td;}
function row(parent){const tr=document.createElement('tr');parent.append(tr);return tr;}
function statusCell(tr,status){const td=cell(tr,'');const span=document.createElement('span');span.className='badge '+(status===null?'unknown':status);span.textContent=status===null?'NULL · 未知':status==='paid'?'paid · 已支付':'unpaid · 未支付';td.append(span);}
function render(){
 $('users').replaceChildren();$('orders').replaceChildren();
 for(const u of users){const tr=row($('users'));cell(tr,u.id);cell(tr,u.name);const own=orders.filter(o=>o.userId===u.id);cell(tr,!own.length?'无订单':own.some(o=>o.status==='paid')?'含已支付':own.every(o=>o.status===null)?'状态未知':'仅未支付');}
 for(const o of orders){const tr=row($('orders'));cell(tr,o.id);cell(tr,o.userId);statusCell(tr,o.status);}
 if(!orders.length){const td=cell(row($('orders')),'订单表为空','empty');td.colSpan=3;}
 $('order-count').textContent=`右表 · ${orders.length} 笔`;
 document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));
 $('sql').textContent=sqlFor(mode)+';';$('query-label').textContent=mode==='inner'?'INNER JOIN':`LEFT JOIN · ${modes[mode]}`;
 const results=runJoin(users,orders,mode);$('results').replaceChildren();
 for(const r of results){const tr=row($('results'));if(r.padded)tr.className='padded';cell(tr,r.userId);cell(tr,r.name);cell(tr,r.orderId);if(r.padded)cell(tr,null);else statusCell(tr,r.status);cell(tr,r.padded?'补齐行':'真实订单','source');}
 if(!results.length){const td=cell(row($('results')),'没有行通过筛选。试试把条件放进 ON。','empty');td.colSpan=5;}
 const kept=new Set(results.map(r=>r.userId));$('row-count').textContent=results.length;$('user-count').textContent=kept.size;
 $('verdict-title').textContent=details[mode][0];$('explanation').textContent=details[mode][1];const missing=users.filter(u=>!kept.has(u.id));$('missing').textContent=missing.length?'未进入结果：'+missing.map(u=>u.name).join('、'):'四个用户都在结果中。';
 $('count-all').textContent=results.length;$('count-id').textContent=results.filter(r=>r.orderId!==null).length;
 $('comparison').replaceChildren();for(const [key,label] of Object.entries(modes)){const rows=runJoin(users,orders,key),tr=row($('comparison'));if(key===mode)tr.className='active-compare';const td=cell(tr,'');const b=document.createElement('button');b.className='compare-button';b.textContent=label;b.setAttribute('aria-label','查看'+label+'的结果');b.addEventListener('click',()=>{mode=key;render();});td.append(b);cell(tr,rows.length);cell(tr,new Set(rows.map(r=>r.userId)).size+' / 4');cell(tr,rows.filter(r=>r.padded).length);}
 const aggregate=aggregatePaidUsers(users,orders);$('aggregate-results').replaceChildren();for(const group of aggregate){const tr=row($('aggregate-results'));cell(tr,group.userId);cell(tr,group.name);cell(tr,group.paidCount);cell(tr,'HAVING 通过','source');}if(!aggregate.length){const td=cell(row($('aggregate-results')),'没有组通过 HAVING。','empty');td.colSpan=4;}$('aggregate-note').textContent=aggregate.length?`当前保留 ${aggregate.length} 个用户组；仅未支付、无订单或 NULL 状态的组会被过滤。`:'当前没有已支付订单组，HAVING 过滤掉全部结果。';
}
document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>{mode=b.dataset.mode;render();}));
$('scenario').addEventListener('change',e=>{const scenario=e.target.value;orders=scenario==='empty'?[]:baseOrders.map(o=>({...o,status:scenario==='nulls'?null:o.status}));if(scenario==='multiple')orders.push({id:106,userId:1,status:'paid'});render();});
function notify(message){$('status').textContent=message;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>{$('status').textContent='';},5000);}
$('copy').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(sqlFor(mode)+';');notify('已复制当前 SQL');}catch{notify('浏览器未允许复制，请选中代码后手动复制。');}});
function literal(value){return value===null?'NULL':typeof value==='number'?String(value):"'"+value.replaceAll("'","''")+"'";}
$('download').addEventListener('click',()=>{let sql='-- SQL 连接实验室：使用独立测试数据库运行\nCREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT NOT NULL);\nCREATE TABLE orders (id INTEGER PRIMARY KEY NOT NULL, userId INTEGER, status TEXT);\n';for(const u of users)sql+=`INSERT INTO users VALUES (${u.id},${literal(u.name)});\n`;for(const o of orders)sql+=`INSERT INTO orders VALUES (${o.id},${o.userId},${literal(o.status)});\n`;sql+='\n'+sqlFor(mode)+';\n';const url=URL.createObjectURL(new Blob([sql],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`join-lab-${$('scenario').value}-${mode}.sql`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('已生成包含建表、样例数据和当前查询的 SQL 文件');});
render();
