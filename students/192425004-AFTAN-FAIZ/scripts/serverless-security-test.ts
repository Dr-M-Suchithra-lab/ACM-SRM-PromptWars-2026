import 'dotenv/config';
import {randomBytes} from 'node:crypto';
import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
async function login(name:string,password:string){const c=createClient(process.env.SUPABASE_URL!,process.env.SUPABASE_PUBLISHABLE_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});const {error}=await c.auth.signInWithPassword({email:name+'@demo.fairshift.example',password});assert.ifError(error);return c;}
const gateway=await login('safety.gateway',process.env.SAFETY_GATEWAY_PASSWORD!),worker=await login('construction.worker',process.env.DEMO_PASSWORD!);
const key=randomBytes(32).toString('hex');
for(let i=1;i<=16;i++){const {data,error}=await gateway.rpc('consume_rate_limit',{p_key:key,p_scope:'safety_submit'});assert.ifError(error);assert.equal(data.allowed,i<=15);}
console.log('PASS persistent limit permits 15 submissions and rejects the 16th');
const second=await login('safety.gateway',process.env.SAFETY_GATEWAY_PASSWORD!);const again=await second.rpc('consume_rate_limit',{p_key:key,p_scope:'safety_submit'});assert.ifError(again.error);assert.equal(again.data.allowed,false);console.log('PASS a separate gateway client observes the same persisted limit');
assert.ok((await worker.rpc('consume_rate_limit',{p_key:key,p_scope:'api'})).error);console.log('PASS workers cannot access the privileged rate limiter');
assert.ok((await worker.schema('private').from('rate_limit_buckets').select('*')).error);console.log('PASS rate buckets are not exposed by the Data API');
assert.ok((await worker.rpc('configure_pay_policy',{p_org:'10000000-0000-4000-8000-000000000001',p_policy:{},p_note:'Unauthorized policy edit attempt.'})).error);console.log('PASS workers cannot change organization policies');
