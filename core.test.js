import test from 'node:test';
import assert from 'node:assert/strict';
import {aggregatePaidUsers,runJoin,sqlFor} from './core.js';
const users=[{id:1,name:'林'},{id:2,name:'周'},{id:3,name:'陈'},{id:4,name:'吴'}];
const orders=[{id:101,userId:1,status:'paid'},{id:102,userId:1,status:'unpaid'},{id:103,userId:2,status:'unpaid'},{id:104,userId:4,status:null},{id:105,userId:99,status:'paid'}];
test('default result IDs and NULL padding match intended relational cases',()=>{
 assert.deepEqual(runJoin(users,orders,'all').map(r=>r.orderId),[101,102,103,null,104]);
 assert.deepEqual(runJoin(users,orders,'on').map(r=>[r.userId,r.orderId,r.padded]),[[1,101,false],[2,null,true],[3,null,true],[4,null,true]]);
 assert.deepEqual(runJoin(users,orders,'where').map(r=>r.userId),[1]);
 assert.deepEqual(runJoin(users,orders,'orNull').map(r=>r.userId),[1,3]);
 assert.deepEqual(runJoin(users,orders,'inner'),runJoin(users,orders,'where'));
});
test('empty right table and empty left table',()=>{
 for(const mode of ['all','on','where','orNull','inner']){assert.equal(runJoin([],orders,mode).length,0);assert.equal(runJoin(users,[],mode).length,['all','on','orNull'].includes(mode)?4:0);}
});
test('one-to-many matches survive and caller data remains unchanged',()=>{
 const more=[...orders,{id:106,userId:1,status:'paid'}],before=JSON.stringify([users,more]);
 assert.equal(runJoin(users,more,'on').length,5);assert.equal(runJoin(users,more,'where').length,2);
 assert.equal(JSON.stringify([users,more]),before);
});
test('NULL join keys do not match each other; real NULL status differs from padded',()=>{
 const rows=runJoin([{id:null,name:'空键'}],[{id:200,userId:null,status:'paid'}],'all');assert.equal(rows[0].padded,true);
 const row=runJoin(users,orders,'all').find(r=>r.orderId===104);assert.equal(row.status,null);assert.equal(row.padded,false);
});
test('unknown modes fail explicitly',()=>{assert.throws(()=>runJoin(users,orders,'bad'));assert.throws(()=>sqlFor('bad'));});
test('HAVING keeps only groups with paid orders',()=>{
 assert.deepEqual(aggregatePaidUsers(users,orders),[{userId:1,name:'林',paidCount:1}]);
 assert.deepEqual(aggregatePaidUsers(users,[...orders,{id:106,userId:1,status:'paid'}]),[{userId:1,name:'林',paidCount:2}]);
 assert.deepEqual(aggregatePaidUsers(users,orders.map(o=>({...o,status:null}))),[]);
});
