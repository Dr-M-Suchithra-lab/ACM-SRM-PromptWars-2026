import {test,expect} from '@playwright/test';
import {policyInput} from '../../shared/engines';
test('admin edits daily policy through UI while historical wages retain their snapshot',async({page,request})=>{
 const login=await request.post('/api/demo-session',{data:{role:'admin',sector:'construction'}});expect(login.ok()).toBeTruthy();const headers={Authorization:`Bearer ${(await login.json()).access_token}`};
 const before=await (await request.get('/api/workspace',{headers})).json();const original=policyInput.parse(before.pay_policies[0]);
 try {
  await page.goto('/');await page.getByRole('button',{name:'Explore employer demo',exact:true}).click();await expect(page.locator('.workspace-tag')).toContainText('Employer command center');await page.getByRole('link',{name:'Organization',exact:true}).click();
  await page.getByLabel('Pay basis',{exact:true}).selectOption('daily');await page.getByLabel('Daily rate (₹)',{exact:true}).fill('1600');await page.getByLabel('Reason for policy change').fill('Synthetic QA verifies daily pay and protected historical snapshots.');
  const response=page.waitForResponse(r=>r.url().endsWith('/api/policies')&&r.request().method()==='POST');await page.getByRole('button',{name:'Save policy version',exact:true}).click();expect((await response).ok()).toBeTruthy();
  const after=await (await request.get('/api/workspace',{headers})).json();expect(after.pay_policies[0].basis).toBe('daily');expect(after.pay_policies[0].daily_paise).toBe(160000);expect(after.pay.find((p:{shiftId:string})=>p.shiftId==='30000000-0000-4000-8000-000000000001').expectedPaise).toBe(110000);
 } finally {expect((await request.post('/api/policies',{headers,data:{...original,organization_id:before.organizations[0].id,note:'Restore original demonstration policy after verified QA.'}})).ok()).toBeTruthy();}
});
