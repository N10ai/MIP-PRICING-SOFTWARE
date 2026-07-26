import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

export type QuotePdfInput = {
  quoteNumber: string
  customer: string
  customerEmail?: string
  customerReference?: string
  route: string
  status?: string
  issued?: string
  validity?: string
  currency?: string
  mode?: string
  service?: string
  incoterm?: string
  commodity?: string
  pieces?: number
  actualWeight?: number
  chargeableWeight?: number
  cbm?: number
  carrier?: string
  transit?: string
  services?: string[]
  charges: Array<{ description: string; basis: string; quantity: number; unitRate: number; amount: number }>
  total: number
  notes?: string
  terms?: string
}

const LOGO_URL = 'https://static.wixstatic.com/media/b572e1_fbf841487b044ed39fc0bcfaeb17f41d~mv2.png/v1/fill/w_246,h_164,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/IMG_2032.png'
const safe=(value='')=>String(value).replace(/[→➜➝➞⟶]/g,' to ').replace(/[•·]/g,' - ').replace(/[“”]/g,'"').replace(/[‘’]/g,"'").replace(/[–—]/g,'-').replace(/…/g,'...').replace(/[^\x20-\x7E\n]/g,'').replace(/\s+/g,' ').trim()
const money=(n:number,currency='USD')=>{try{return new Intl.NumberFormat('en-US',{style:'currency',currency,maximumFractionDigits:2}).format(Number.isFinite(n)?n:0)}catch{return `$${(Number(n)||0).toFixed(2)}`}}
async function imageData(url:string){try{const response=await fetch(url,{mode:'cors'});if(!response.ok)return null;const blob=await response.blob();return await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=reject;reader.readAsDataURL(blob)})}catch{return null}}

export async function generateQuotePdf(input:QuotePdfInput){
 const currency=safe(input.currency||'USD'),doc=new jsPDF({orientation:'portrait',unit:'pt',format:'letter',compress:true}),pageWidth=doc.internal.pageSize.getWidth(),pageHeight=doc.internal.pageSize.getHeight(),margin=46
 const blue:[number,number,number]=[47,106,229],navy:[number,number,number]=[17,24,39],gray:[number,number,number]=[103,112,128],line:[number,number,number]=[220,224,230],soft:[number,number,number]=[247,248,250]
 const logo=await imageData(LOGO_URL),quoteNumber=safe(input.quoteNumber||'Quote')
 const footer=()=>{const page=doc.getCurrentPageInfo().pageNumber;doc.setDrawColor(...line);doc.line(margin,pageHeight-42,pageWidth-margin,pageHeight-42);doc.setFont('helvetica','bold');doc.setFontSize(8);doc.setTextColor(...navy);doc.text('MIP Cargo Express',margin,pageHeight-25);doc.setFont('helvetica','normal');doc.setTextColor(...gray);doc.text(`${quoteNumber}  -  Page ${page}`,pageWidth-margin,pageHeight-25,{align:'right'})}
 const section=(label:string,y:number,x=margin)=>{doc.setFont('helvetica','bold');doc.setFontSize(8);doc.setTextColor(...blue);doc.text(safe(label).toUpperCase(),x,y)}
 doc.setFillColor(...navy);doc.rect(0,0,pageWidth,104,'F')
 const cx=margin+30,cy=52;doc.setFillColor(255,255,255);doc.circle(cx,cy,29,'F');doc.setDrawColor(216,224,236);doc.setLineWidth(.8);doc.circle(cx,cy,29);if(logo)doc.addImage(logo,'PNG',cx-23,cy-18,46,36,undefined,'FAST')
 const titleX=margin+78;doc.setDrawColor(...blue);doc.setLineWidth(1.2);doc.line(titleX-14,24,titleX-14,76);doc.setFont('helvetica','bold');doc.setTextColor(255,255,255);doc.setFontSize(22);doc.text('QUOTE',titleX,49);doc.setFont('helvetica','normal');doc.setFontSize(8.5);doc.setTextColor(200,208,222);doc.text('MIP Cargo Express',titleX,67)
 const metaX=pageWidth-206,metaValueX=pageWidth-margin;[['Quote Number',quoteNumber],['Status',safe(input.status||'Draft').toUpperCase()],['Issued',safe(input.issued||'To be confirmed')],['Valid Until',safe(input.validity||'To be confirmed')],['Currency',currency]].forEach((item,index)=>{const rowY=25+index*14;doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(220,225,235);doc.text(item[0],metaX,rowY);doc.setFont('helvetica','bold');doc.setTextColor(index<2?blue[0]:255,index<2?blue[1]:255,index<2?blue[2]:255);doc.text(item[1],metaValueX,rowY,{align:'right'})})
 let y=132,rightX=306;section('Prepared for',y);section('Shipment summary',y,rightX);doc.setFont('helvetica','bold');doc.setFontSize(16);doc.setTextColor(...navy);doc.text(safe(input.customer||'Customer'),margin,y+23);doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(...gray);if(input.customerEmail)doc.text(safe(input.customerEmail),margin,y+40);if(input.customerReference)doc.text(`Reference: ${safe(input.customerReference)}`,margin,y+57)
 doc.setFont('helvetica','bold');doc.setFontSize(17);doc.setTextColor(...navy);doc.text(safe(input.route||'Origin to Destination'),rightX,y+24)
 const shipment=[['MODE',input.mode||'To be confirmed'],['SERVICE',input.service||'To be confirmed'],['INCOTERM',input.incoterm||'To be confirmed'],['COMMODITY',input.commodity||'To be confirmed']]
 shipment.forEach((item,index)=>{const column=index%2,row=Math.floor(index/2),x=rightX+column*126,itemY=y+55+row*40;doc.setFont('helvetica','normal');doc.setFontSize(7);doc.setTextColor(...gray);doc.text(item[0],x,itemY-5);doc.setFont('helvetica','bold');doc.setFontSize(9);doc.setTextColor(...navy);doc.text(doc.splitTextToSize(safe(item[1]),110),x,itemY+8)})
 y=246;doc.setDrawColor(...line);doc.line(margin,y-12,pageWidth-margin,y-12);section('Cargo summary',y);const cargo=[['PIECES',String(input.pieces||0)],['ACTUAL WEIGHT',`${Number(input.actualWeight||0).toFixed(1)} kg`],['CHARGEABLE WEIGHT',`${Number(input.chargeableWeight||0).toFixed(1)} kg`],['VOLUME',`${Number(input.cbm||0).toFixed(3)} CBM`]],boxWidth=(pageWidth-margin*2)/4
 cargo.forEach((item,index)=>{const x=margin+index*boxWidth;doc.setFillColor(...soft);doc.setDrawColor(...line);doc.rect(x,y+14,boxWidth,54,'FD');doc.setFont('helvetica','normal');doc.setFontSize(7);doc.setTextColor(...gray);doc.text(item[0],x+10,y+31);doc.setFont('helvetica','bold');doc.setFontSize(12);doc.setTextColor(...navy);doc.text(safe(item[1]),x+10,y+51)})
 section('Freight charges',y+92);autoTable(doc,{startY:y+105,head:[['Description','Basis','Qty','Unit rate',`Amount (${currency})`]],body:input.charges.length?input.charges.map(c=>[safe(c.description),safe(c.basis),Number(c.quantity||0).toFixed(3).replace(/\.000$/,''),money(c.unitRate,currency),money(c.amount,currency)]):[['No charges added','','','','']],margin:{left:margin,right:margin,bottom:62},theme:'plain',styles:{font:'helvetica',fontSize:8.5,textColor:navy,cellPadding:7,lineColor:line,lineWidth:{bottom:.45}},headStyles:{fontStyle:'bold',fontSize:7.5,textColor:gray,fillColor:soft,lineColor:line,lineWidth:{top:.8,bottom:.8}},columnStyles:{0:{cellWidth:190},1:{cellWidth:85},2:{halign:'right',cellWidth:55},3:{halign:'right',cellWidth:82},4:{halign:'right',cellWidth:90,fontStyle:'bold'}},didDrawPage:footer})
 const tableEnd=(doc as jsPDF&{lastAutoTable?:{finalY:number}}).lastAutoTable?.finalY||y+160;y=tableEnd+25;if(y>pageHeight-200){doc.addPage();y=58}
 doc.setFillColor(...soft);doc.roundedRect(pageWidth-margin-214,y,214,72,4,4,'F');doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(...gray);doc.text('TOTAL FREIGHT CHARGES',pageWidth-margin-198,y+21);doc.setFont('helvetica','bold');doc.setTextColor(...navy);doc.text(currency,pageWidth-margin-16,y+21,{align:'right'});doc.setFontSize(22);doc.text(money(input.total,currency),pageWidth-margin-16,y+52,{align:'right'})
 y+=98;section('Commercial details',y);[['CARRIER / AIRLINE',input.carrier||'To be confirmed'],['TRANSIT TIME',input.transit||'To be confirmed'],['VALIDITY',input.validity||'To be confirmed']].forEach((item,index)=>{const x=margin+index*172;if(index>0){doc.setDrawColor(...line);doc.line(x-12,y+10,x-12,y+46)}doc.setFont('helvetica','normal');doc.setFontSize(7);doc.setTextColor(...gray);doc.text(item[0],x,y+21);doc.setFont('helvetica','bold');doc.setFontSize(9);doc.setTextColor(...navy);doc.text(doc.splitTextToSize(safe(item[1]),150),x,y+37)})
 y+=68;const blocks=[input.services?.length?`Services: ${input.services.join(', ')}`:'',input.notes||'',input.terms||''].filter(Boolean);blocks.forEach((block,index)=>{const title=index===0&&input.services?.length?'Services':index===blocks.length-1&&input.terms?'Terms & conditions':'Notes',lines=doc.splitTextToSize(safe(block),pageWidth-margin*2),needed=30+lines.length*11;if(y+needed>pageHeight-62){footer();doc.addPage();y=58}section(title,y);doc.setFont('helvetica','normal');doc.setFontSize(8.5);doc.setTextColor(...gray);doc.text(lines,margin,y+18);y+=needed})
 footer();const filename=`${quoteNumber.replace(/[^a-z0-9_-]+/gi,'-')||'quote'}.pdf`,blob=doc.output('blob'),url=URL.createObjectURL(blob);if(/iPad|iPhone|iPod/.test(navigator.userAgent)){window.open(url,'_blank','noopener,noreferrer');window.setTimeout(()=>URL.revokeObjectURL(url),60000)}else{const link=document.createElement('a');link.href=url;link.download=filename;document.body.appendChild(link);link.click();link.remove();window.setTimeout(()=>URL.revokeObjectURL(url),10000)}}
