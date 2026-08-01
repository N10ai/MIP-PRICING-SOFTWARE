import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
}
const json=(payload:unknown,status=200)=>new Response(JSON.stringify(payload),{status,headers:{...corsHeaders,'Content-Type':'application/json'}})
const object=(value:unknown):Record<string,unknown>=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{}

Deno.serve(async(req)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:corsHeaders})
  if(req.method!=='POST')return json({error:'Method not allowed'},405)

  try{
    const auth=req.headers.get('Authorization')
    if(!auth)return json({error:'Unauthorized'},401)

    const url=Deno.env.get('SUPABASE_URL')
    const anon=Deno.env.get('SUPABASE_ANON_KEY')
    const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const apiKey=Deno.env.get('RESEND_API_KEY')
    const from=Deno.env.get('RESEND_FROM_EMAIL')
    const mode=(Deno.env.get('RESEND_MODE')||'production').toLowerCase()
    const testRecipient=Deno.env.get('RESEND_TEST_RECIPIENT')
    if(!url||!anon||!service||!apiKey||!from)return json({error:'Server configuration is incomplete'},500)
    if(mode==='test'&&!testRecipient)return json({error:'RESEND_TEST_RECIPIENT is required in test mode'},500)

    const userClient=createClient(url,anon,{global:{headers:{Authorization:auth}}})
    const{data:{user}}=await userClient.auth.getUser()
    if(!user)return json({error:'Unauthorized'},401)

    const body=await req.json() as {vendor_rfq_id?:unknown;message?:unknown}
    const rfqId=typeof body.vendor_rfq_id==='string'?body.vendor_rfq_id:''
    const messageText=typeof body.message==='string'?body.message.trim():''
    if(!rfqId||!messageText)return json({error:'vendor_rfq_id and message are required'},400)
    if(messageText.length>20000)return json({error:'Message is too long'},400)

    const admin=createClient(url,service)
    const{data:rfq,error:rfqError}=await admin.from('vendor_rfqs')
      .select('id,rfq_number,status,sent_to,subject,quote_request_id,response_data,thread_reference')
      .eq('id',rfqId).single()
    if(rfqError||!rfq)return json({error:'RFQ was not found'},404)
    if(!['sent','delivered','awaiting_response','responded'].includes(String(rfq.status||'').toLowerCase())){
      return json({error:'Follow-up messages are available only after the original RFQ has been sent'},409)
    }

    const meta=object(rfq.response_data)
    const intendedRecipient=String(rfq.sent_to||'')
    const recipient=mode==='test'?testRecipient:intendedRecipient
    const replyTo=String(meta.reply_to||'')
    if(!recipient||!replyTo)return json({error:'This RFQ is missing recipient or Reply-To metadata'},409)

    const{data:lastOutbound}=await admin.from('rfq_conversation_messages')
      .select('provider_message_id,subject')
      .eq('vendor_rfq_id',rfqId)
      .eq('direction','outbound')
      .in('status',['sent','delivered'])
      .order('created_at',{ascending:false})
      .limit(1).maybeSingle()

    const baseSubject=String(lastOutbound?.subject||rfq.subject||`Rate request | ${rfq.rfq_number}`)
    const subject=/^re:/i.test(baseSubject)?baseSubject:`Re: ${baseSubject}`
    const createdAt=new Date().toISOString()
    const{data:queued,error:queueError}=await admin.from('rfq_conversation_messages').insert({
      vendor_rfq_id:rfqId,
      quote_request_id:rfq.quote_request_id,
      direction:'outbound',
      sender_email:from,
      recipient_email:recipient,
      reply_to_email:replyTo,
      subject,
      body_text:messageText,
      status:'queued',
      created_at:createdAt,
      metadata:{source:'rfq-followup',intended_recipient:intendedRecipient,resend_mode:mode},
    }).select('id').single()
    if(queueError)throw queueError

    const providerReference=String(lastOutbound?.provider_message_id||rfq.thread_reference||'')
    const headers:Record<string,string>={}
    if(providerReference){headers['In-Reply-To']=providerReference;headers.References=providerReference}

    const response=await fetch('https://api.resend.com/emails',{
      method:'POST',
      headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json','Idempotency-Key':`rfq-followup-${queued.id}`},
      body:JSON.stringify({
        from,
        to:[recipient],
        reply_to:replyTo,
        subject:mode==='test'?`[TEST for ${intendedRecipient||'vendor'}] ${subject}`:subject,
        text:messageText,
        headers,
      }),
    })
    const payload=object(await response.json().catch(()=>({})))
    if(!response.ok){
      const failure=String(payload.message||`Resend rejected the message (${response.status})`)
      await admin.from('rfq_conversation_messages').update({status:'failed',failure_details:failure,updated_at:new Date().toISOString()}).eq('id',queued.id)
      return json({error:failure},502)
    }

    const sentAt=new Date().toISOString()
    const providerMessageId=String(payload.id||'')
    await admin.from('rfq_conversation_messages').update({status:'sent',provider_message_id:providerMessageId||null,provider_thread_id:providerReference||providerMessageId||null,sent_at:sentAt,updated_at:sentAt}).eq('id',queued.id)
    await admin.from('vendor_rfqs').update({status:'awaiting_response'}).eq('id',rfqId)
    await admin.from('quote_requests').update({last_activity_at:sentAt}).eq('id',rfq.quote_request_id)
    await admin.from('commercial_activities').insert({
      quote_request_id:rfq.quote_request_id,
      vendor_rfq_id:rfqId,
      activity_type:'vendor_rfq_followup_sent',
      title:`Follow-up sent for ${rfq.rfq_number}`,
      description:`Follow-up email sent to ${recipient}.`,
      actor_name:user.email||'Pricing Team',
      metadata:{provider_message_id:providerMessageId,mode,intended_recipient:intendedRecipient},
    })

    return json({status:'sent',message_id:queued.id,provider_message_id:providerMessageId})
  }catch(error){
    console.error('[send-rfq-followup]',error instanceof Error?error.message:'unknown error')
    return json({error:error instanceof Error?error.message:'Unable to send follow-up'},500)
  }
})
