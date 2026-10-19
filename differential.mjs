import {runJoin,sqlFor} from './core.js';
let text='';for await(const chunk of process.stdin)text+=chunk;
const cases=JSON.parse(text);
process.stdout.write(JSON.stringify(cases.map(({users,orders,mode})=>({rows:runJoin(users,orders,mode),sql:sqlFor(mode)}))));
