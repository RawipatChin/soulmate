const pptxgen = require('pptxgenjs');
const path = require('path');

const pptx = new pptxgen();
pptx.layout = 'LAYOUT_WIDE';
pptx.author = 'SOULMATE';
pptx.subject = 'คู่มือการใช้งานและส่งมอบระบบ';
pptx.title = 'SOULMATE | คู่มือการใช้งานและส่งมอบ - Draft 2';
pptx.company = 'SOULMATE';
pptx.lang = 'th-TH';
pptx.theme = { headFontFace: 'Leelawadee UI', bodyFontFace: 'Leelawadee UI', lang: 'th-TH' };
pptx.defineLayout({ name: 'SOUL_WIDE', width: 13.333, height: 7.5 });
pptx.layout = 'SOUL_WIDE';
pptx.background = { color: 'FBFCFA' };
pptx.margin = 0;
pptx.writeOptions = { compression: true };

const C = {
  ink: '173B35', pine: '123E36', green: '087B68', mint: 'EAF5F1', mint2: 'D5ECE4',
  berry: 'B52B82', pink: 'F9ECF4', gold: 'D69A22', sand: 'F8F6EF', white: 'FFFFFF',
  paper: 'FBFCFA', muted: '5E746D', line: 'DCE7E2', pale: 'F3F7F5', red: 'A5403B',
};
const ST = pptx.ShapeType;
const W = 13.333, H = 7.5;
const F = 'Leelawadee UI';

function tx(slide, text, x, y, w, h, opts={}) {
  slide.addText(text, { x, y, w, h, margin: 0, fontFace: F, fontSize: 16, color: C.ink,
    breakLine: false, valign: 'mid', fit: 'shrink', paraSpaceAfterPt: 4, ...opts });
}
function rect(slide, x, y, w, h, fill=C.white, line=C.line, radius=true) {
  slide.addShape(radius ? ST.roundRect : ST.rect, { x, y, w, h, rectRadius: 0.12,
    fill: { color: fill }, line: { color: line, width: 1 } });
}
function line(slide, x1, y1, x2, y2, color=C.line, width=1.5, arrow=false) {
  slide.addShape(ST.line, { x:x1, y:y1, w:x2-x1, h:y2-y1,
    line: { color, width, ...(arrow ? { endArrowType: 'triangle' } : {}) } });
}
function dot(slide, x, y, label, fill=C.green, size=0.38) {
  slide.addShape(ST.ellipse, { x, y, w:size, h:size, fill:{color:fill}, line:{color:fill} });
  tx(slide, String(label), x, y+0.005, size, size-0.01, { fontSize:13, bold:true, color:C.white, align:'center' });
}
function header(slide, category, title, subtitle, n, dark=false) {
  slide.background = { color: dark ? C.pine : C.paper };
  const primary = dark ? C.white : C.ink;
  tx(slide, category.toUpperCase(), 0.62, 0.35, 5.3, 0.27, { fontSize:10.5, bold:true, charSpacing:1.1, color:dark?'A9D8C9':C.green });
  tx(slide, title, 0.62, 0.72, 12.05, 0.62, { fontSize:29, bold:true, color:primary });
  if (subtitle) tx(slide, subtitle, 0.64, 1.38, 11.95, 0.42, { fontSize:14, color:dark?'C5DDD5':C.muted });
  tx(slide, 'SOULMATE  •  คู่มือส่งมอบ', 0.62, 7.12, 4.0, 0.18, { fontSize:8.5, color:dark?'A9C7BD':'80948D' });
  tx(slide, String(n).padStart(2,'0'), 12.25, 7.08, 0.45, 0.22, { fontSize:10, bold:true, color:dark?'C4E5D9':C.green, align:'right' });
}
function card(slide, x,y,w,h,title,body,opts={}) {
  rect(slide,x,y,w,h,opts.fill||C.white,opts.line||C.line,true);
  if (opts.kicker) tx(slide,opts.kicker.toUpperCase(),x+0.22,y+0.16,w-0.44,0.2,{fontSize:9,bold:true,color:opts.accent||C.green,charSpacing:0.6});
  const ty = y + (opts.kicker ? 0.46 : 0.22);
  tx(slide,title,x+0.22,ty,w-0.44,opts.titleH||0.35,{fontSize:opts.titleSize||17,bold:true,color:opts.titleColor||C.ink,valign:'mid'});
  if (body) tx(slide,body,x+0.22,ty+(opts.titleH||0.35)+0.12,w-0.44,h-(ty-y)-(opts.titleH||0.35)-0.16,{fontSize:opts.bodySize||13.2,color:opts.bodyColor||C.muted,valign:'top',breakLine:false,fit:'shrink',lineSpacingMultiple:1.05});
}
function label(slide,text,x,y,w,color=C.muted){ tx(slide,text,x,y,w,0.2,{fontSize:10.5,bold:true,color}); }
function button(slide,text,x,y,w,fill=C.green,color=C.white){ rect(slide,x,y,w,0.42,fill,fill,true); tx(slide,text,x+0.12,y+0.02,w-0.24,0.36,{fontSize:12,bold:true,color,align:'center'}); }
function screenFrame(slide,x,y,w,h,title){
  rect(slide,x,y,w,h,C.white,'C7D9D2',true);
  slide.addShape(ST.roundRect,{x:x+0.02,y:y+0.02,w:w-0.04,h:0.34,rectRadius:0.08,fill:{color:'F4F8F6'},line:{color:'F4F8F6'}});
  tx(slide,title,x+0.18,y+0.07,w-0.36,0.2,{fontSize:10,bold:true,color:C.muted});
}
function numItem(slide,n,title,desc,x,y,w,accent=C.green){
  dot(slide,x,y+0.02,n,accent,0.36);
  tx(slide,title,x+0.5,y,w-0.5,0.28,{fontSize:15,bold:true});
  tx(slide,desc,x+0.5,y+0.34,w-0.52,0.43,{fontSize:11.5,color:C.muted,valign:'top'});
}

// 01 Cover
{
  const s=pptx.addSlide(); s.background={color:C.pine};
  s.addShape(ST.ellipse,{x:8.35,y:-1.25,w:6.1,h:6.1,fill:{color:'1B5B4E'},line:{color:'1B5B4E'}});
  s.addShape(ST.ellipse,{x:9.65,y:0.08,w:3.45,h:3.45,fill:{color:C.mint2},line:{color:C.mint2}});
  s.addShape(ST.heart,{x:10.55,y:0.95,w:1.65,h:1.42,fill:{color:C.berry},line:{color:C.berry}});
  tx(s,'SOULMATE  /  คู่มือส่งมอบ',0.72,0.58,4.4,0.34,{fontSize:13,bold:true,color:'B9E4D8'});
  tx(s,'คู่มือการใช้งาน\nและส่งมอบระบบ',0.72,1.8,7.0,1.72,{fontSize:39,bold:true,color:C.white,valign:'mid',breakLine:false});
  tx(s,'ร้านค้าออนไลน์  •  คำสั่งซื้อ  •  การชำระเงิน  •  หลังบ้าน',0.75,3.78,7.0,0.48,{fontSize:17,color:'C6DFD7'});
  const topics=[['01','หน้าร้าน'],['02','คำสั่งซื้อ'],['03','หลังบ้าน'],['04','ส่งมอบ']];
  topics.forEach((a,i)=>{ const x=0.78+i*1.95; tx(s,a[0],x,5.2,0.48,0.32,{fontSize:17,bold:true,color:'A9D8C9'}); tx(s,a[1],x,5.62,1.55,0.32,{fontSize:12.5,color:C.white}); });
  tx(s,'DRAFT 2  •  20 ตุลาคม 2569',0.76,6.8,4.5,0.26,{fontSize:11,bold:true,color:'B9D6CD',charSpacing:0.6});
  tx(s,'ตัวเลขและหน้าจอเป็นตัวอย่าง • ตรวจข้อมูลจริงก่อนดำเนินการ',0.76,7.13,5.5,0.18,{fontSize:8.5,color:'A9C7BD'});
}
// 02 Overview
{
  const s=pptx.addSlide(); header(s,'เริ่มต้น','เส้นทางใช้งานระบบ','ทำตามลำดับงานฝั่งลูกค้าและฝั่งแอดมิน โดยตรวจสถานะก่อนขยับขั้นตอน',2);
  tx(s,'ลูกค้า',0.72,2.08,2.2,0.3,{fontSize:13,bold:true,color:C.green});
  const xs=[0.75,3.2,5.65,8.1,10.55], items=['หน้าแรก','สินค้า','รายละเอียด','ตะกร้า','Checkout'];
  items.forEach((t,i)=>{rect(s,xs[i],2.55,1.72,0.9,i===4?C.pink:C.mint,i===4?'E9C9DC':C.mint2); dot(s,xs[i]+0.16,2.67,i+1,i===4?C.berry:C.green,0.32); tx(s,t,xs[i]+0.55,2.72,1.05,0.38,{fontSize:14,bold:true}); if(i<4) line(s,xs[i]+1.78,3.0,xs[i+1]-0.1,3.0,C.green,2,true);});
  card(s,0.75,4.0,5.65,1.8,'PromptPay QR','โอนตามยอด • ส่งสลิปภายใน 24 ชั่วโมง • รอแอดมินตรวจรายการเงินเข้าจริงก่อนอนุมัติ',{fill:C.white,kicker:'ชำระล่วงหน้า',accent:C.berry,bodySize:14});
  card(s,6.85,4.0,5.65,1.8,'เก็บเงินปลายทาง (COD)','รอแอดมินยืนยันรับออเดอร์ก่อนเตรียมสินค้า • ชำระกับผู้จัดส่งเมื่อได้รับพัสดุ',{fill:C.white,kicker:'ชำระเมื่อรับสินค้า',accent:C.green,bodySize:14});
  tx(s,'หากข้อมูลไม่ตรง หรือเปิดสลิปไม่ได้ ให้หยุดรายการและติดต่อผู้รับผิดชอบ',0.78,6.28,11.8,0.35,{fontSize:14,bold:true,color:C.red,align:'center'});
}
// 03 Home
{
  const s=pptx.addSlide(); header(s,'ลูกค้า / หน้าร้าน','เริ่มจากหน้าแรก','เมนูหลัก ค้นหาสินค้า และแชทช่วยเหลืออยู่ในหน้าร้านเดียวกัน',3);
  screenFrame(s,0.75,2.05,7.55,4.45,'หน้าร้าน SOULMATE');
  tx(s,'SOULMATE',1.02,2.55,1.8,0.32,{fontSize:16,bold:true,color:C.green});
  ['หน้าแรก','สินค้า','เกี่ยวกับเรา'].forEach((t,i)=>tx(s,t,3.05+i*1.08,2.58,1.0,0.25,{fontSize:11,color:C.muted}));
  rect(s,1.05,3.03,6.95,0.52,C.pale,C.line,true); tx(s,'ค้นหาสินค้า…',1.28,3.12,5.8,0.26,{fontSize:12,color:'82958E'});
  rect(s,1.05,3.82,6.95,1.86,C.mint,C.mint,true);
  tx(s,'เลือกดูสินค้าเพื่อเริ่มต้น',1.42,4.22,3.7,0.48,{fontSize:22,bold:true});
  tx(s,'ค้นหาและเปิดการ์ดสินค้าที่สนใจ',1.45,4.82,3.8,0.3,{fontSize:12,color:C.muted});
  s.addShape(ST.ellipse,{x:6.9,y:5.14,w:0.58,h:0.58,fill:{color:C.berry},line:{color:C.berry}}); tx(s,'♡',6.9,5.18,0.58,0.38,{fontSize:25,bold:true,color:C.white,align:'center'});
  numItem(s,1,'เปิดสินค้า','กด “สินค้า” ที่เมนูด้านบน',8.78,2.35,3.75);
  numItem(s,2,'ค้นหา','พิมพ์ชื่อในช่องค้นหา',8.78,3.55,3.75);
  numItem(s,3,'แชทช่วยเหลือ','กดมาสคอตหัวใจที่มุมขวาล่าง',8.78,4.75,3.75,C.berry);
}
// 04 Product list
{
  const s=pptx.addSlide(); header(s,'ลูกค้า / สินค้า','ค้นหาแล้วเลือกสินค้า','ใช้ช่องค้นหาและการ์ดสินค้าเพื่อนำทางจากรายการไปยังรายละเอียด',4);
  screenFrame(s,0.75,2.02,7.55,4.5,'รายการสินค้า');
  rect(s,1.03,2.52,6.98,0.48,C.pale,C.line,true); tx(s,'ค้นหาสินค้า…',1.25,2.6,6.2,0.24,{fontSize:11.5,color:C.muted});
  for(let i=0;i<3;i++){const x=1.04+i*2.34; rect(s,x,3.26,2.1,2.64,C.white,C.line,true); rect(s,x+0.12,3.38,1.86,1.28,[C.mint,C.pink,C.sand][i],[C.mint,C.pink,C.sand][i],true); tx(s,['VITAMIN','COLLAGEN','SUPPLEMENT'][i],x+0.22,3.86,1.66,0.28,{fontSize:11,bold:true,color:[C.green,C.berry,C.gold][i],align:'center'}); tx(s,['สินค้าบำรุงสุขภาพ','ผลิตภัณฑ์ดูแลผิว','วิตามินรวม'][i],x+0.16,4.82,1.78,0.34,{fontSize:11,bold:true}); tx(s,'฿ 590',x+0.16,5.25,1.2,0.24,{fontSize:11,bold:true,color:C.green});}
  numItem(s,1,'ค้นหา','กดช่องค้นหาแล้วพิมพ์คำ',8.78,2.35,3.75);
  numItem(s,2,'เปิดสินค้า','กดรูปหรือชื่อสินค้าที่ต้องการ',8.78,3.55,3.75);
  numItem(s,3,'ตรวจตะกร้า','กดไอคอนตะกร้าด้านบน',8.78,4.75,3.75,C.berry);
  tx(s,'ภาพตัวอย่างการจัดวาง • ตรวจราคาและสต็อกจริงในระบบ',0.95,6.67,7.0,0.22,{fontSize:9,color:C.muted,italic:true});
}
// 05 Product detail
{
  const s=pptx.addSlide(); header(s,'ลูกค้า / รายละเอียดสินค้า','เลือกวิธีซื้อ','ตรวจตัวเลือกสินค้า ราคา และสต็อก ก่อนเพิ่มลงตะกร้าหรือสั่งซื้อทันที',5);
  screenFrame(s,0.75,2.0,7.5,4.5,'รายละเอียดสินค้า');
  rect(s,1.02,2.55,3.05,3.48,C.mint,C.mint,true); tx(s,'ภาพสินค้า',1.02,3.8,3.05,0.3,{fontSize:15,bold:true,color:C.green,align:'center'});
  tx(s,'ชื่อสินค้า',4.35,2.7,3.4,0.38,{fontSize:18,bold:true}); tx(s,'฿ 746',4.35,3.2,2.1,0.4,{fontSize:20,bold:true,color:C.berry});
  tx(s,'ตัวเลือกสินค้า',4.35,3.86,2.5,0.24,{fontSize:10.5,bold:true,color:C.muted});
  rect(s,4.35,4.2,2.8,0.47,C.white,C.green,true); tx(s,'เลือกขนาด / สูตร',4.53,4.3,2.45,0.22,{fontSize:11,color:C.ink});
  button(s,'เพิ่มลงตะกร้า',4.35,4.92,2.8,C.green); button(s,'สั่งซื้อทันที',4.35,5.48,2.8,C.pink,C.berry);
  numItem(s,1,'เพิ่มลงตะกร้า','กดปุ่มเพิ่มลงตะกร้า',8.78,2.65,3.75);
  numItem(s,2,'ไปตะกร้า','กดไอคอนตะกร้าด้านบนเพื่อตรวจรายการ',8.78,4.0,3.75,C.berry);
  card(s,8.78,5.35,3.82,1.2,'ทางลัด','ปุ่ม “สั่งซื้อทันที” เริ่มซื้อได้โดยตรง',{fill:C.sand,titleSize:13,bodySize:10.5});
}
// 06 Cart
{
  const s=pptx.addSlide(); header(s,'ลูกค้า / ตะกร้า','ตรวจรายการและยอดรวม','ปรับจำนวน ลบสินค้า และตรวจคูปองหรือค่าส่ง ก่อนดำเนินการชำระเงิน',6);
  screenFrame(s,0.75,2.03,7.45,4.42,'ตะกร้าสินค้า');
  const rows=[['สินค้า','จำนวน','รวม'],['ผลิตภัณฑ์ A','−   1   +','฿ 746'],['ผลิตภัณฑ์ B','−   2   +','฿ 1,132']];
  rows.forEach((r,i)=>{const y=2.55+i*0.72; if(i>0)line(s,1.02,y-0.12,7.9,y-0.12,C.line,0.8); tx(s,r[0],1.08,y,2.55,0.3,{fontSize:i?12:10.5,bold:i===0,color:i?C.ink:C.muted}); tx(s,r[1],4.1,y,1.65,0.3,{fontSize:11,bold:i>0,color:i?C.green:C.muted,align:'center'}); tx(s,r[2],6.3,y,1.25,0.3,{fontSize:11.5,bold:i>0,color:i?C.ink:C.muted,align:'right'}); if(i>0)tx(s,'ลบ',7.46,y,0.36,0.3,{fontSize:9.5,color:C.red,align:'right'});});
  rect(s,1.02,4.88,4.1,0.48,C.pale,C.line,true); tx(s,'รหัสคูปอง (ถ้ามี)',1.2,4.98,3.6,0.22,{fontSize:10,color:C.muted});
  rect(s,5.43,4.74,2.48,1.16,C.mint,C.mint,true); tx(s,'สินค้า       ฿ 1,878\nจัดส่ง             ฿ 30\nยอดรวม      ฿ 1,908',5.63,4.88,2.1,0.78,{fontSize:11,bold:true,breakLine:false});
  card(s,8.65,2.42,3.9,1.28,'1  ปรับจำนวน','ใช้ปุ่ม + หรือ − ตามต้องการ',{fill:C.white,kicker:'สินค้า'});
  card(s,8.65,3.96,3.9,1.28,'2  เอาออก','กด “ลบ” หากไม่ต้องการสินค้า',{fill:C.white,kicker:'สินค้า',accent:C.berry});
  card(s,8.65,5.35,3.9,1.2,'3  ตรวจยอด','ตรวจส่วนลด ค่าส่ง และยอดรวม',{fill:C.white,kicker:'ก่อน checkout'});
  tx(s,'หลังตรวจรายการแล้ว เลื่อนลงในหน้าเดียวกันเพื่อไปขั้นตอนชำระเงิน',0.95,6.68,7.2,0.22,{fontSize:10.5,color:C.muted});
}
// 07 Checkout details
{
  const s=pptx.addSlide(); header(s,'ลูกค้า / Checkout','กรอกข้อมูลผู้ซื้อและที่อยู่','ข้อมูลติดต่อและที่อยู่จัดส่งที่จำเป็นต้องครบก่อนยืนยันคำสั่งซื้อ',7);
  screenFrame(s,0.74,2.0,8.1,4.56,'Checkout');
  label(s,'ข้อมูลผู้ซื้อ',1.02,2.5,2.2,C.green);
  const fields=[['ชื่อ',1.02,2.9,2.3],['นามสกุล',3.5,2.9,2.3],['เบอร์โทร',6.0,2.9,2.45],['อีเมล',1.02,3.62,3.55],['ที่อยู่',1.02,4.35,7.45],['ตำบล / อำเภอ',1.02,5.08,3.55],['จังหวัด / รหัสไปรษณีย์',4.88,5.08,3.59]];
  fields.forEach(([t,x,y,w])=>{tx(s,t,x,y-0.22,w,0.18,{fontSize:9.5,bold:true,color:C.muted});rect(s,x,y,w,0.42,C.white,C.line,true);});
  card(s,9.25,2.42,3.3,1.25,'1  ข้อมูลผู้ซื้อ','ชื่อ นามสกุล เบอร์โทร และอีเมล',{fill:C.mint,titleSize:15,bodySize:10.5});
  card(s,9.25,3.78,3.3,1.3,'2  ที่อยู่','ที่อยู่ ตำบล อำเภอ จังหวัด และรหัสไปรษณีย์',{fill:C.white,titleSize:15,bodySize:10.5});
  card(s,9.25,5.2,3.3,1.3,'3  สรุปยอด','ตรวจสินค้า ค่าส่ง และยอดรวม',{fill:C.pink,titleSize:15,bodySize:10.5});
}
// 08 Shipping/payment
{
  const s=pptx.addSlide(); header(s,'ลูกค้า / Checkout','เลือกจัดส่งและชำระเงิน','เลือกบริการจัดส่งหนึ่งแบบ และวิธีชำระเงินที่ร้านเปิดใช้งาน',8);
  card(s,0.75,2.12,3.8,2.62,'ส่งปกติ','เลือกบริการมาตรฐาน\nตรวจค่าส่งและเกณฑ์ส่งฟรี',{fill:C.mint,kicker:'1  เลือกจัดส่ง',accent:C.green,bodySize:14});
  card(s,4.78,2.12,3.8,2.62,'ส่งด่วน','เลือกบริการด่วน\nตรวจค่าส่งและเกณฑ์ส่งฟรี',{fill:C.white,kicker:'1  เลือกจัดส่ง',accent:C.green,bodySize:14});
  card(s,8.8,2.12,3.8,2.62,'PromptPay QR','สแกนตามยอดรวม\nส่งสลิปภายใน 24 ชั่วโมง',{fill:C.pink,kicker:'2  เลือกชำระ',accent:C.berry,bodySize:14});
  card(s,0.75,5.05,3.8,1.3,'เก็บเงินปลายทาง (COD)','ชำระกับผู้จัดส่งเมื่อได้รับสินค้า',{fill:C.sand,kicker:'2  เลือกชำระ',accent:C.gold,bodySize:11.5});
  tx(s,'3  ตรวจยอดรวมและข้อมูลทั้งหมด',4.85,5.28,3.25,0.3,{fontSize:15,bold:true}); button(s,'ยืนยันคำสั่งซื้อ',8.8,5.18,3.8,C.green);
  tx(s,'วิธีชำระที่แสดงขึ้นกับการตั้งค่าร้าน • หากยังไม่เปิด ให้ติดต่อผู้ดูแลก่อนสั่งซื้อ',0.8,6.64,11.8,0.25,{fontSize:11,color:C.muted,align:'center'});
}
// 09 Confirmation
{
  const s=pptx.addSlide(); header(s,'ลูกค้า / หลังสั่งซื้อ','เก็บเลขคำสั่งซื้อและทำขั้นตอนถัดไป','หน้าผลลัพธ์แสดงเลขออเดอร์ ยอดรวม และสถานะตามวิธีชำระ',9);
  rect(s,0.75,2.05,11.85,0.9,C.mint,C.mint,true); tx(s,'บันทึกคำสั่งซื้อแล้ว',1.02,2.2,4.1,0.36,{fontSize:22,bold:true,color:C.green}); tx(s,'เลขคำสั่งซื้อ  SM-20260001',6.8,2.25,5.25,0.3,{fontSize:15,bold:true,align:'right'});
  card(s,0.75,3.35,5.65,2.32,'PromptPay QR','1  เปิด QR ตามยอดที่ระบบแสดง\n2  โอนให้ตรงยอดและส่งสลิปใน 24 ชั่วโมง\n3  รอแอดมินตรวจเงินเข้าจริง\n“รอตรวจสลิป” ยังไม่ใช่ชำระสำเร็จ',{fill:C.pink,kicker:'ชำระล่วงหน้า',accent:C.berry,bodySize:13.2});
  card(s,6.85,3.35,5.65,2.32,'เก็บเงินปลายทาง (COD)','1  ยืนยันคำสั่งซื้อ\n2  รอร้านยืนยันรับออเดอร์ COD\n3  จ่ายเงินให้ผู้จัดส่งเมื่อได้รับสินค้า',{fill:C.mint,kicker:'COD',accent:C.green,bodySize:14});
  tx(s,'ยอดตัวอย่าง  ฿ 1,908',0.85,6.18,3.7,0.32,{fontSize:16,bold:true});
  tx(s,'ระบบตัวอย่างยังไม่มีอีเมลยืนยันอัตโนมัติ',4.78,6.2,4.0,0.28,{fontSize:12,color:C.red});
  tx(s,'สมาชิกดูย้อนหลังได้ที่บัญชี  •  Guest ให้เก็บเลขออเดอร์และใช้ session เดิม',0.85,6.65,11.7,0.24,{fontSize:11,color:C.muted});
}
// 10 Orders followup
{
  const s=pptx.addSlide(); header(s,'ลูกค้า / ติดตามคำสั่งซื้อ','เปิดดูสถานะคำสั่งซื้อ','สมาชิกดูประวัติจากบัญชี ส่วน guest ต้องเก็บข้อมูลอ้างอิงใน session เดิม',10);
  const stages=[['รอชำระ','ส่งสลิปภายในกำหนด'],['รอตรวจสลิป','รอร้านตรวจเงินเข้า'],['ชำระแล้ว','เตรียมจัดส่ง'],['จัดส่งแล้ว','ติดตามเลขพัสดุ']];
  stages.forEach((a,i)=>{const x=0.75+i*3.12; card(s,x,2.35,2.62,1.7,a[0],a[1],{fill:i===1?C.pink:C.mint,kicker:`ขั้น ${i+1}`,accent:i===1?C.berry:C.green,titleSize:16,bodySize:12}); if(i<3)line(s,x+2.68,3.2,x+3.02,3.2,C.green,2,true);});
  card(s,0.75,4.55,5.65,1.78,'ลูกค้าที่เป็นสมาชิก','เปิด “บัญชี” แล้วเลือก “คำสั่งซื้อของฉัน” เพื่อดูสถานะและรายละเอียด',{fill:C.white,kicker:'บัญชี',bodySize:13});
  card(s,6.85,4.55,5.65,1.78,'ผู้ซื้อแบบ Guest','เก็บเลขออเดอร์และลิงก์ไว้\nเปิดจาก session เดิม • ยังไม่ผูกกับบัญชีที่สมัครภายหลัง',{fill:C.white,kicker:'guest',accent:C.berry,bodySize:12.3});
}
// 11 Admin navigation
{
  const s=pptx.addSlide(); header(s,'ลูกค้า / รายละเอียดออเดอร์','ดูรายละเอียดออเดอร์ของตัวเอง','เปิดได้จาก “คำสั่งซื้อของฉัน” • แสดงข้อมูลรายการ ยอดรวม และความคืบหน้าล่าสุด',11);
  rect(s,0.75,2.02,11.85,1.68,C.white,C.line,true);
  tx(s,'ความคืบหน้าคำสั่งซื้อ',1.02,2.25,3.25,0.32,{fontSize:17,bold:true});
  rect(s,1.35,3.12,10.45,0.08,C.line,C.line,true); rect(s,1.35,3.12,3.48,0.08,C.green,C.green,true);
  const stages=[['รับออเดอร์',1.35],['ยืนยันชำระเงิน',4.83],['เตรียมสินค้า',8.31],['ส่งให้ขนส่ง',11.8]];
  stages.forEach((a,i)=>{const x=a[1]-0.24;const fill=i===0?C.green:i===1?C.berry:C.pale;rect(s,x,2.92,0.48,0.48,fill,fill,true);tx(s,i===0?'✓':String(i+1),x,2.93,0.48,0.45,{fontSize:13,bold:true,color:i<2?C.white:C.muted,align:'center'});tx(s,a[0],a[1]-0.76,3.45,1.52,0.25,{fontSize:10.5,bold:i===1,color:i<2?C.green:C.muted,align:'center'});});
  tx(s,'ร้านกำลังตรวจสอบสลิป',7.35,2.27,4.85,0.3,{fontSize:14,bold:true,color:C.berry,align:'right'});
  card(s,0.75,3.95,7.35,2.3,'รายการสินค้า','ผลิตภัณฑ์ A · รุ่นมาตรฐาน     × 1                         ฿ 746\nผลิตภัณฑ์ B · สีธรรมชาติ           × 2                         ฿ 1,132',{fill:C.white,kicker:'SM-20260001  •  20 ต.ค. 2569',bodySize:12.5,titleSize:16});
  card(s,8.45,3.95,4.15,2.3,'สรุปคำสั่งซื้อ','ยอดสินค้า                         ฿ 1,878\nค่าจัดส่ง                             ฿ 30\nรวมทั้งสิ้น                         ฿ 1,908\nวิธีชำระ  PromptPay · รอตรวจสลิป',{fill:C.mint,kicker:'ยอดรวม',accent:C.green,bodySize:12,titleSize:16});
  tx(s,'ชื่อผู้รับและที่อยู่จัดส่งแสดงในหน้ารายละเอียด • เลข Tracking จะแสดงหลังร้านบันทึกเลขพัสดุ',0.85,6.52,11.65,0.25,{fontSize:10.5,color:C.muted,align:'center'});
}
// 12 Admin navigation
{
  const s=pptx.addSlide(); header(s,'แอดมิน / ภาพรวม','เลือกเมนูตามงาน','ใช้บัญชีผู้ดูแลที่ได้รับสิทธิ์ แล้วไปยังส่วนจัดการที่ต้องการ',12);
  const menu=[['Products','ดูราคาและสต็อก','▦'],['Orders','ตรวจออเดอร์ สลิป หรือ COD','▤'],['Fulfillment','เตรียมพัสดุและอัปเดตส่ง','➜']];
  menu.forEach((a,i)=>{const x=0.75+i*4.15; rect(s,x,2.5,3.55,2.65,[C.mint,C.pink,C.sand][i],[C.mint2,'E9C9DC','E7D9B5'][i],true); tx(s,a[2],x+0.3,2.82,0.75,0.64,{fontSize:32,bold:true,color:[C.green,C.berry,C.gold][i],align:'center'}); tx(s,a[0],x+0.3,3.72,2.95,0.42,{fontSize:21,bold:true}); tx(s,a[1],x+0.3,4.32,2.95,0.5,{fontSize:12,color:C.muted}); dot(s,x+2.93,2.75,i+1,[C.green,C.berry,C.gold][i],0.38);});
  tx(s,'เมนูและข้อมูลที่เห็นขึ้นกับ role ของบัญชี',0.85,5.82,11.7,0.34,{fontSize:15,bold:true,color:C.ink,align:'center'});
  tx(s,'Super Admin มีเมนูจัดการผู้ดูแลและสิทธิ์เพิ่มเติม',0.85,6.28,11.7,0.28,{fontSize:12,color:C.muted,align:'center'});
}
// 12 Orders queue
{
  const s=pptx.addSlide(); header(s,'แอดมิน / Orders','ค้นหาและเปิดออเดอร์','กรองสถานะก่อนเลือกแถว แล้วเปิดรายละเอียดเต็มเพื่อจัดการรายการ',13);
  screenFrame(s,0.75,2.03,8.05,4.45,'Orders / คำสั่งซื้อ');
  const tabs=['ทั้งหมด','รอโอน','รอตรวจสลิป','รอยืนยัน COD']; tabs.forEach((t,i)=>{const x=1.03+i*1.75; rect(s,x,2.53,1.58,0.42,i===2?C.pink:C.pale,i===2?'E9C9DC':C.line,true); tx(s,t,x+0.06,2.6,1.46,0.24,{fontSize:9.5,bold:i===2,color:i===2?C.berry:C.muted,align:'center'});});
  const head=['เลขออเดอร์','ลูกค้า','ยอดรวม','สถานะ']; head.forEach((t,i)=>tx(s,t,1.06+[0,2.2,4.8,6.2][i],3.25,[2.1,2.3,1.2,1.3][i],0.25,{fontSize:9,bold:true,color:C.muted}));
  [['SM-20260001','กานต์','฿ 1,908','รอตรวจ'],['SM-20260002','นิดา','฿ 447','รอโอน'],['SM-20260003','มานะ','฿ 790','รอ COD']].forEach((r,ri)=>{const y=3.76+ri*0.67;line(s,1.02,y-0.08,8.55,y-0.08,C.line,0.7);r.forEach((v,i)=>tx(s,v,1.06+[0,2.2,4.8,6.2][i],y,[2.1,2.3,1.2,1.3][i],0.25,{fontSize:10.5,bold:i===0,color:i===3?C.green:C.ink}));});
  card(s,9.2,2.5,3.3,1.16,'1  กรองสถานะ','เลือกแท็บ เช่น “รอตรวจสลิป”',{fill:C.white,titleSize:14,bodySize:10.5});
  card(s,9.2,3.95,3.3,1.16,'2  เลือกรายการ','กดแถวออเดอร์ที่ต้องจัดการ',{fill:C.white,titleSize:14,bodySize:10.5,accent:C.berry});
  card(s,9.2,5.4,3.3,1.16,'3  เปิดรายละเอียด','กดไอคอนเพื่อดูรายละเอียดเต็ม',{fill:C.white,titleSize:14,bodySize:10.5});
}
// 13 Review payment
{
  const s=pptx.addSlide(); header(s,'แอดมิน / ตรวจเงิน','ตรวจสลิปก่อนอนุมัติ','ตัวอย่างยอดสลิปไม่ตรงกับยอดออเดอร์: ห้ามอนุมัติ',14);
  rect(s,0.75,2.08,7.35,3.6,C.white,C.line,true);
  tx(s,'ยอดออเดอร์',1.12,2.48,2.5,0.28,{fontSize:12,bold:true,color:C.muted}); tx(s,'฿ 447',1.12,2.9,2.5,0.7,{fontSize:34,bold:true,color:C.ink});
  tx(s,'ยอดในสลิป',4.68,2.48,2.5,0.28,{fontSize:12,bold:true,color:C.muted}); tx(s,'฿ 429',4.68,2.9,2.5,0.7,{fontSize:34,bold:true,color:C.red});
  line(s,3.78,2.72,3.78,4.05,C.line,1.4);
  rect(s,1.12,4.12,6.55,0.68,C.pink,'E9C9DC',true); tx(s,'ยอดไม่ตรงกัน  •  หยุดการอนุมัติ',1.34,4.27,6.1,0.34,{fontSize:17,bold:true,color:C.red,align:'center'});
  tx(s,'ตรวจผู้รับและรายการเงินเข้าจริงด้วย ไม่ใช้ภาพสลิปอย่างเดียว',1.12,5.02,6.55,0.3,{fontSize:12,color:C.muted,align:'center'});
  numItem(s,1,'เทียบข้อมูล','ยอด ผู้รับ และเงินเข้าจริง',8.65,2.35,3.9);
  numItem(s,2,'ยืนยันการตรวจ','ติ๊กเมื่อข้อมูลตรงและตรวจเงินเข้าแล้ว',8.65,3.65,3.9,C.berry);
  numItem(s,3,'อนุมัติ','กดหลังผ่านการตรวจเท่านั้น',8.65,4.95,3.9);
  tx(s,'ตัวอย่างนี้: ห้ามติ๊กและห้ามกดอนุมัติ',0.85,6.35,11.7,0.34,{fontSize:16,bold:true,color:C.red,align:'center'});
}
// 14 Fulfillment
{
  const s=pptx.addSlide(); header(s,'แอดมิน / Fulfillment','เตรียมและส่งพัสดุ','จัดการคิว เอกสาร และ Tracking โดยแยกสถานะจัดส่งออกจากสถานะรับเงิน',15);
  const steps=[['กรองคิว','สถานะจัดส่ง / วิธีชำระ'],['เลือกออเดอร์','เลือกแถวหรือช่วงเลข'],['พิมพ์เอกสาร','ใบปะหน้า / ใบแพ็กของ'],['อัปเดต','พร้อมส่ง → ส่งแล้ว']];
  steps.forEach((a,i)=>{const x=0.72+i*3.16; dot(s,x+0.06,2.35,i+1,i===3?C.berry:C.green,0.48); tx(s,a[0],x,3.02,2.6,0.38,{fontSize:17,bold:true}); tx(s,a[1],x,3.55,2.75,0.55,{fontSize:11.5,color:C.muted}); if(i<3)line(s,x+2.25,2.59,x+3.0,2.59,C.mint2,2,true);});
  card(s,0.75,4.55,5.65,1.42,'COD ก่อนจัดเตรียม','กด “รับ COD” เมื่อผู้จัดส่งส่งเงินให้ร้านแล้ว',{fill:C.pink,kicker:'จุดควบคุม',accent:C.berry,bodySize:13});
  card(s,6.85,4.55,5.65,1.42,'บันทึกเลข Tracking','กรอกเลขพัสดุหลังส่งจริง และตรวจข้อมูลผู้รับก่อนพิมพ์',{fill:C.mint,kicker:'หลังส่ง',accent:C.green,bodySize:13});
  tx(s,'ตรวจตัวอย่างก่อนพิมพ์ • A4 เลือก 4 ใบต่อแผ่น หรือ 2 ใบตัวอักษรใหญ่',0.8,6.26,11.8,0.24,{fontSize:10.5,color:C.muted,align:'center'});
  tx(s,'ใบปะหน้า COD ระบุยอดเรียกเก็บ • ออเดอร์ชำระล่วงหน้าระบุไม่ต้องเก็บเงิน',0.8,6.56,11.8,0.24,{fontSize:10.5,color:C.muted,align:'center'});
}
// 15 Products
{
  const s=pptx.addSlide(); header(s,'แอดมิน / สินค้า','จัดการสินค้าและสต็อก','ตรวจจำนวน ราคา และสถานะก่อนแก้ไขข้อมูลสินค้า',16);
  button(s,'+ เพิ่มสินค้า',0.8,2.05,1.72,C.green);
  rect(s,2.78,2.05,4.1,0.42,C.white,C.line,true); tx(s,'ค้นหาชื่อสินค้า…',2.98,2.14,3.7,0.22,{fontSize:10.5,color:C.muted});
  const cols=[['สินค้า',0.92,2.8],['ราคา',4.05,1.5],['สต็อก',5.9,1.5],['สถานะ',7.68,1.2]];
  cols.forEach(a=>tx(s,a[0],a[1],2.75,a[2],0.23,{fontSize:10,bold:true,color:C.muted}));
  const data=[['ผลิตภัณฑ์ A','฿ 746','24','เผยแพร่'],['ผลิตภัณฑ์ B','฿ 566','12','เผยแพร่'],['ผลิตภัณฑ์ C','฿ 1,079','0','หมดสต็อก']];
  data.forEach((r,i)=>{const y=3.22+i*0.75;rect(s,0.78,y,8.38,0.61,i%2?C.white:C.pale,i%2?C.line:C.pale,true);r.forEach((t,j)=>tx(s,t,[0.98,4.05,5.9,7.68][j],y+0.13,[2.8,1.5,1.5,1.2][j],0.28,{fontSize:11,bold:j===0,color:j===3&&i===2?C.red:C.ink}));});
  card(s,9.65,2.35,2.9,1.14,'1  เพิ่มสินค้า','เริ่มจากปุ่มด้านบน',{fill:C.mint,titleSize:14,bodySize:10.5});
  card(s,9.65,3.8,2.9,1.14,'2  ค้นหา','พิมพ์ชื่อสินค้า',{fill:C.white,titleSize:14,bodySize:10.5,accent:C.berry});
  card(s,9.65,5.25,2.9,1.14,'3  ตรวจรายการ','ดูราคา สต็อก และสถานะ',{fill:C.white,titleSize:14,bodySize:10.5});
}
// 16 Create product
{
  const s=pptx.addSlide(); header(s,'แอดมิน / สร้างสินค้า','บันทึกร่างหรือเผยแพร่','กรอกข้อมูลที่จำเป็นและตรวจตัวเลือกสินค้า ก่อนแสดงบนหน้าร้าน',17);
  screenFrame(s,0.75,2.02,7.55,4.48,'เพิ่มสินค้าใหม่');
  rect(s,1.02,2.52,1.52,1.42,C.mint,C.mint,true); tx(s,'＋  อัปโหลดรูป',1.1,3.03,1.36,0.34,{fontSize:11,bold:true,color:C.green,align:'center'});
  const fields=[['ชื่อสินค้า',2.82,2.58,4.95],['รายละเอียด',2.82,3.28,4.95],['ราคา',1.02,4.35,2.0],['สต็อก',3.24,4.35,2.0],['น้ำหนัก',5.45,4.35,2.32]];
  fields.forEach(([t,x,y,w])=>{tx(s,t,x,y-0.2,w,0.18,{fontSize:9,bold:true,color:C.muted});rect(s,x,y,w,0.38,C.white,C.line,true);});
  button(s,'บันทึกร่าง',4.45,5.65,1.55,C.pale,C.green); button(s,'เผยแพร่',6.2,5.65,1.55,C.green);
  numItem(s,1,'อัปโหลดรูป','กดพื้นที่รูปแล้วเลือกไฟล์',8.78,2.55,3.75);
  numItem(s,2,'บันทึกร่าง','ใช้เมื่อยังไม่พร้อมแสดงหน้าร้าน',8.78,3.85,3.75,C.berry);
  numItem(s,3,'เผยแพร่','ตรวจชื่อ ราคา สต็อก และน้ำหนักก่อน',8.78,5.15,3.75);
}
// 17 Banners
{
  const s=pptx.addSlide(); header(s,'แอดมิน / แบนเนอร์','จัดการแบนเนอร์หน้าร้าน','เพิ่มรายการใหม่ เปิดหรือปิดการแสดงผล และแก้ไขรายการเดิม',18);
  button(s,'+ เพิ่มแบนเนอร์',0.8,2.05,2.0,C.green);
  const bn=[['แคมเปญประจำเดือน','กำลังแสดง',C.mint],['โปรโมชันสินค้า','ปิดการแสดง',C.pink],['ข่าวสารร้าน','กำลังแสดง',C.sand]];
  bn.forEach((a,i)=>{const x=0.78+i*4.18;rect(s,x,2.78,3.65,2.8,C.white,C.line,true);rect(s,x+0.16,2.95,3.33,1.45,a[2],a[2],true);tx(s,['CAMPAIGN','PROMOTION','NEWS'][i],x+0.3,3.48,3.0,0.32,{fontSize:17,bold:true,color:[C.green,C.berry,C.gold][i],align:'center'});tx(s,a[0],x+0.24,4.64,2.65,0.3,{fontSize:13,bold:true});tx(s,'✎',x+3.06,4.58,0.34,0.34,{fontSize:17,color:C.green,align:'center'});tx(s,a[1],x+0.24,5.08,2.4,0.22,{fontSize:10,color:a[1]==='กำลังแสดง'?C.green:C.muted});tx(s,a[1]==='กำลังแสดง'?'●':'○',x+3.05,5.02,0.34,0.32,{fontSize:16,color:a[1]==='กำลังแสดง'?C.green:C.muted,align:'center'});dot(s,x+3.02,2.69,i+1,i===1?C.berry:C.green,0.38);});
  tx(s,'1  เพิ่มภาพ    →    2  เปิด / ปิด    →    3  แก้ไขด้วยไอคอนดินสอ',0.85,6.18,11.7,0.34,{fontSize:15,bold:true,color:C.ink,align:'center'});
}
// 18 Settings
{
  const s=pptx.addSlide(); header(s,'แอดมิน / ตั้งค่า','ตรวจการจัดส่งและชำระเงิน','ค่าที่เห็นเป็นข้อมูลตัวอย่าง ให้ตรวจข้อมูลจริงก่อนเปิดใช้งาน',19);
  card(s,0.75,2.1,5.65,3.7,'ส่งปกติ','ค่าจัดส่ง\nเกณฑ์ส่งฟรี\nพื้นที่ให้บริการ',{fill:C.mint,kicker:'จัดส่ง',accent:C.green,bodySize:15});
  card(s,6.85,2.1,5.65,3.7,'ส่งด่วน','ค่าจัดส่ง\nเกณฑ์ส่งฟรี\nพื้นที่ให้บริการ',{fill:C.white,kicker:'จัดส่ง',accent:C.green,bodySize:15});
  rect(s,0.75,6.05,11.75,0.62,C.pink,'E9C9DC',true); tx(s,'วิธีชำระเงิน: ตรวจเบอร์ PromptPay และสถานะเปิดใช้ PromptPay / COD ก่อนรับออเดอร์',1.0,6.19,11.2,0.3,{fontSize:13,bold:true,color:C.berry,align:'center'});
}
// 19 Handover checklist
{
  const s=pptx.addSlide(); header(s,'ส่งมอบ / เช็กลิสต์','ตรวจร่วมกับผู้รับมอบ','ใช้ข้อมูลทดสอบที่ได้รับอนุญาต และตรวจเงินจริงก่อนอนุมัติการชำระ',20);
  card(s,0.75,2.05,5.65,3.65,'หน้าร้าน','เปิดสินค้า ตะกร้า และ Checkout\nทดสอบส่งปกติ / ส่งด่วน\nตรวจ PromptPay / COD ที่เปิดใช้\nเทียบราคา ส่วนลด ค่าส่ง และยอดรวม',{fill:C.mint,kicker:'ลูกค้า',accent:C.green,bodySize:14});
  card(s,6.85,2.05,5.65,3.65,'หลังบ้าน','เปิด Orders และ Fulfillment ตามสิทธิ์\nตรวจเงินเข้าจริง และยืนยัน COD ก่อนเตรียม\nออกเอกสาร เปลี่ยนสถานะ และบันทึก Tracking',{fill:C.white,kicker:'แอดมิน',accent:C.berry,bodySize:14});
  tx(s,'ข้อมูลที่ต้องรับมอบ',0.82,5.98,2.4,0.28,{fontSize:15,bold:true,color:C.green});
  tx(s,'บัญชี / role • ที่อยู่และเบอร์ผู้ส่ง/คืน • PromptPay • ค่าส่งและเกณฑ์ส่งฟรี • สินค้าและสต็อก • Privacy / Terms • แบนเนอร์และคูปอง',3.05,5.95,9.45,0.55,{fontSize:11.5,color:C.muted});
  tx(s,'หมายเหตุ: ผลทดสอบ Emulator ไม่ยืนยันการตั้งค่า Production หรือการรับเงินจริง',0.82,6.62,11.7,0.27,{fontSize:11,bold:true,color:C.red,align:'center'});
}

const out = path.resolve(__dirname, '../output/pptx/SOULMATE_คู่มือการใช้งานและส่งมอบ_Draft 2.pptx');
pptx.writeFile({ fileName: out });
