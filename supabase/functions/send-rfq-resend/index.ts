import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { replyToForRfq } from '../_shared/rfq-email.ts'

const corsHeaders={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type'}
const json=(payload:unknown,status=200)=>new Response(JSON.stringify(payload),{status,headers:{...corsHeaders,'Content-Type':'application/json'}})
const object=(value:unknown):Record<string,unknown>=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{}

Deno.serve(async(req)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:corsHeaders})
 if(req.method!=='POST')return json({error:{code:'method_not_allowed',message:'Method not allowed'}},405)
 try{
  const auth=req.headers.get('Authorization');if(!auth)return json({error:{code:'unauthorized',message:'Unauthorized'}},401)
  const url=Deno.env.get('SUPABASE_URL'),anon=Deno.env.get('SUPABASE_ANON_KEY'),service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if(!url||!anon||!service)return json({error:{code:'configuration_error',message:'Supabase server secrets are incomplete'}},500)
  const userClient=createClient(url,anon,{global:{headers:{Authorization:auth}}});const{data:{user}}=await userClient.auth.getUser()
  if(!user)return json({error:{code:'unauthorized',message:'Unauthorized'}},401)
  const body=await req.json() as{rfq_ids?:unknown};const ids=Array.isArray(body.rfq_ids)?[...new Set(body.rfq_ids.filter((id):id is string=>typeof id==='string'&&id.length>0))]:[]
  if(!ids.length)return json({error:{code:'invalid_request',message:'rfq_ids is required'}},400)
  const apiKey=Deno.env.get('RESEND_API_KEY'),from=Deno.env.get('RESEND_FROM_EMAIL'),domain=Deno.env.get('RESEND_INBOUND_DOMAIN')||'whidelaede.resend.app'
  const mode=(Deno.env.get('RESEND_MODE')||'production').toLowerCase(),testRecipient=Deno.env.get('RESEND_TEST_RECIPIENT')
  if(!apiKey||!from)return json({error:{code:'configuration_error',message:'RESEND_API_KEY and RESEND_FROM_EMAIL are required'}},500)
  if(mode==='test'&&!testRecipient)return json({error:{code:'configuration_error',message:'RESEND_TEST_RECIPIENT is required in test mode'}},500)
  const admin=createClient(url,service)
  const{data:rfqs,error}=await admin.from('vendor_rfqs').select('id,rfq_number,status,sent_to,subject,message_body,quote_request_id,response_data').in('id',ids);if(error)throw error
  const results:Array<Record<string,unknown>>=[]
  for(const rfq of rfqs||[]){
   const recipient=mode==='test'?testRecipient:rfq.sent_to,replyTo=replyToForRfq(rfq.rfq_number,domain),meta=object(rfq.response_data)
   if(!recipient){results.push({id:rfq.id,status:'failed',error:'Vendor email is missing'});continue}
   const{data:accepted}=await admin.from('rfq_conversation_messages').select('id,status,provider_message_id').eq('vendor_rfq_id',rfq.id).eq('direction','outbound').in('status',['queued','sent','delivered']).limit(1).maybeSingle()
   if(accepted){results.push({id:rfq.id,status:'skipped',reason:accepted.status==='queued'?'Send already in progress':'Already accepted by Resend',resend_email_id:accepted.provider_message_id});continue}
   const subject=String(rfq.subject||`Rate request | ${rfq.rfq_number}`);const tagged=subject.toUpperCase().includes(rfq.rfq_number.toUpperCase())?subject:`${subject} | ${rfq.rfq_number}`
   const text=`${rfq.message_body||''}\n\nReference: ${rfq.rfq_number}`.trim();const queuedAt=new Date().toISOString()
   const{data:message,error:queueError}=await admin.from('rfq_conversation_messages').insert({vendor_rfq_id:rfq.id,quote_request_id:rfq.quote_request_id,direction:'outbound',sender_email:from,recipient_email:recipient,reply_to_email:replyTo,subject:tagged,body_text:text,status:'queued',created_at:queuedAt,metadata:{intended_recipient:rfq.sent_to,resend_mode:mode,source:'send-rfq-resend'}}).select('id').single()
   if(queueError){results.push({id:rfq.id,status:'failed',error:`Unable to queue send: ${queueError.message}`});continue}
   await admin.from('vendor_rfqs').update({status:'queued'}).eq('id',rfq.id)
   await admin.from('commercial_activities').insert({quote_request_id:rfq.quote_request_id,vendor_rfq_id:rfq.id,activity_type:'vendor_rfq_email_queued',title:`${rfq.rfq_number} email queued`,description:`Email queued for ${recipient}.`,actor_name:user.email||'Pricing Team'})
   let response:Response
   try{response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json','Idempotency-Key':`rfq-${rfq.id}-${message.id}`},body:JSON.stringify({from,to:[recipient],reply_to:replyTo,subject:mode==='test'?`[TEST for ${rfq.sent_to||'vendor'}] ${tagged}`:tagged,text})})}catch(error){response=new Response(JSON.stringify({message:error instanceof Error?error.message:'Network error'}),{status:503})}
   const payload=object(await response.json().catch(()=>({})));const failure=String(payload.message||`Resend rejected the email (${response.status})`)
   if(!response.ok){await admin.from('rfq_conversation_messages').update({status:'failed',failure_details:failure,updated_at:new Date().toISOString()}).eq('id',message.id);await admin.from('vendor_rfqs').update({status:'failed',response_data:{...meta,send_failure:failure,reply_to:replyTo}}).eq('id',rfq.id);await admin.from('commercial_activities').insert({quote_request_id:rfq.quote_request_id,vendor_rfq_id:rfq.id,activity_type:'vendor_rfq_email_failed',title:`${rfq.rfq_number} email failed`,description:failure,actor_name:user.email||'Pricing Team'});results.push({id:rfq.id,status:'failed',error:failure});continue}
   const sentAt=new Date().toISOString(),resendId=String(payload.id||'')
   await admin.from('rfq_conversation_messages').update({status:'sent',provider_message_id:resendId||null,provider_thread_id:resendId||null,sent_at:sentAt,updated_at:sentAt}).eq('id',message.id)
   await admin.from('vendor_rfqs').update({status:'sent',thread_reference:resendId||null,sent_at:sentAt,response_data:{...meta,resend_email_id:resendId,resend_mode:mode,delivered_to:recipient,intended_recipient:rfq.sent_to,reply_to:replyTo,sender:from,sent_at:sentAt}}).eq('id',rfq.id)
   await admin.from('quote_requests').update({last_activity_at:sentAt}).eq('id',rfq.quote_request_id)
   await admin.from('commercial_activities').insert({quote_request_id:rfq.quote_request_id,vendor_rfq_id:rfq.id,activity_type:'vendor_rfq_sent',title:`${rfq.rfq_number} email accepted`,description:`Resend accepted the email to ${recipient}.`,actor_name:user.email||'Pricing Team',metadata:{resend_email_id:resendId,reply_to:replyTo,mode}})
   results.push({id:rfq.id,status:'sent',resend_email_id:resendId,delivered_to:recipient,intended_recipient:rfq.sent_to,reply_to:replyTo,mode})
  }
  for(const id of ids.filter(id=>!(rfqs||[]).some(r=>r.id===id)))results.push({id,status:'failed',error:'RFQ was not found'})
  return json({mode,results},results.some(x=>x.status==='sent'||x.status==='skipped')?200:502)
 }catch(error){console.error('[send-rfq-resend]',error instanceof Error?error.message:'unknown error');return json({error:{code:'send_failed',message:error instanceof Error?error.message:'Unable to send RFQs'}},500)}
})
