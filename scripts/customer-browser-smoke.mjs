import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { createServer } from 'vite';
import { chromium } from 'playwright';
const fixture = `const people = Array.from({length:14}, (_,i)=>({uid:'customer-'+i,firstName:i===0?'กมลวรรณ':'ลูกค้า',lastName:i===0?'ใจดี':'ทดสอบ '+i,email:i===0?'kamonwan@example.test':'customer'+i+'@example.test',phone:'0812345678',status:i===1?'suspended':'active',role:'customer',createdAt:{toMillis:()=>1700000000000-i*1000,toDate:()=>new Date(1700000000000-i*1000)}})); export async function listCustomers(){ if(window.testMode==='error') throw Error('test'); return window.testMode==='empty'?[]:people; } export async function getCustomer(id){return people.find(p=>p.uid===id)||null;} export async function listCustomerOrders(){return [{id:'order-1',orderNumber:'SM-2569-001',totalSatang:129500,status:'paid',payment:{status:'successful'},createdAt:{toDate:()=>new Date(1700000000000)}}];}`;
const server=await createServer({server:{host:'127.0.0.1',port:3198,strictPort:true},plugins:[{name:'customer-test',enforce:'pre',transform(code,id){
if(id.endsWith('/services/customerService.ts'))return fixture;
if(id.endsWith('/context/AuthContext.tsx')) return 'export const useAuth=()=>({customerProfile:{email:"admin@example.test"},logout:async()=>{}}); export const AuthProvider=({children})=>children;';
if(id.endsWith('/components/AdminNotificationBell.tsx'))return 'export const AdminNotificationBell=()=>null;';
},configureServer(s){s.middlewares.use('/__customers-test',async (_req,res)=>{res.setHeader('Content-Type','text/html');res.end(await s.transformIndexHtml('/__customers-test',(await readFile('index.html','utf8')).replace('/src/main.tsx','/scripts/.customer-test-entry.tsx')));});}}]});
let browser;
try{
await server.listen(); browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}}); const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:3198/__customers-test');
await page.getByRole('link',{name:'กมลวรรณ ใจดี kamonwan@example.test'}).waitFor();
await mkdir('.impeccable/review',{recursive:true});await page.evaluate(async()=>{await document.fonts.ready;window.scrollTo(0,0)});await page.waitForTimeout(350);await page.screenshot({path:'.impeccable/review/customers-desktop.png',fullPage:true});
await page.getByRole('button',{name:'หน้าถัดไป'}).click();await page.waitForFunction(()=>document.querySelectorAll('tbody tr').length===2);assert.equal(await page.locator('tbody tr').count(),2);
await page.getByRole('textbox',{name:'ค้นหาลูกค้า'}).fill('kamonwan');await page.waitForFunction(()=>document.querySelectorAll('tbody tr').length===1);assert.equal(await page.locator('tbody tr').count(),1);
await page.getByRole('link',{name:'กมลวรรณ ใจดี kamonwan@example.test'}).click();await page.getByRole('heading',{name:'ข้อมูลติดต่อ'}).waitFor();await page.getByRole('link',{name:'SM-2569-001'}).waitFor();
await page.evaluate(async()=>{await document.fonts.ready;window.scrollTo(0,0)});await page.waitForTimeout(350);await page.screenshot({path:'.impeccable/review/customer-detail-desktop.png',fullPage:true});
await page.getByRole('link',{name:'รายชื่อลูกค้า',exact:true}).click();await page.getByRole('button',{name:'ระงับใช้งาน',exact:true}).click();await page.waitForFunction(()=>document.querySelectorAll('tbody tr').length===1);assert.equal(await page.locator('tbody tr').count(),1);
await page.getByRole('button',{name:'ทั้งหมด',exact:true}).click();await page.setViewportSize({width:390,height:844});await page.evaluate(async()=>{await document.fonts.ready;window.scrollTo(0,0)});await page.waitForTimeout(350);await page.screenshot({path:'.impeccable/review/customers-mobile.png',fullPage:true});
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
await page.getByRole('textbox',{name:'ค้นหาลูกค้า'}).fill('no-match');await page.getByRole('heading',{name:'ไม่พบลูกค้าที่ตรงกัน'}).waitFor();
await page.evaluate(()=>window.testMode='error');await page.getByRole('button',{name:'รีเฟรช',exact:true}).click();await page.getByRole('alert').waitFor();
await page.evaluate(()=>window.testMode='empty');await page.getByRole('button',{name:'ลองอีกครั้ง'}).click();await page.getByText('ยังไม่มีบัญชีลูกค้า',{exact:true}).waitFor();
assert.deepEqual(errors,[]);console.log('PASS: search, pagination, status filter, detail and order links, empty/error/retry, mobile overflow.');
}finally{await browser?.close();await server.close();}
