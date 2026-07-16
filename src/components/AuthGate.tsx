import { FormEvent, ReactNode, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { LockKeyhole, Mail, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabase'

const logo='https://raw.githubusercontent.com/N10ai/mip-tools/main/Untitled%20design%20-%201.png'

export function AuthGate({children}:{children:ReactNode}){
 const[session,setSession]=useState<Session|null>(null)
 const[loading,setLoading]=useState(true)
 const[email,setEmail]=useState('jiarellanocastillo@gmail.com')
 const[password,setPassword]=useState('')
 const[message,setMessage]=useState('')
 const[busy,setBusy]=useState(false)
 const[hash,setHash]=useState(location.hash)
 useEffect(()=>{const sync=()=>setHash(location.hash);addEventListener('hashchange',sync);supabase.auth.getSession().then(({data})=>{setSession(data.session);setLoading(false)});const{sub}= {sub:supabase.auth.onAuthStateChange((_event,next)=>{setSession(next);setLoading(false)}).data.subscription};return()=>{removeEventListener('hashchange',sync);sub.unsubscribe()}},[])
 const publicPortal=hash.startsWith('#/request')
 if(publicPortal)return <>{children}</>
 if(loading)return <div className="auth-loading"><RefreshCw className="spin"/><span>Connecting securely…</span></div>
 if(session)return <>{children}</>
 const signIn=async(e:FormEvent)=>{e.preventDefault();setBusy(true);setMessage('');const{error}=await supabase.auth.signInWithPassword({email,password});setBusy(false);if(error)setMessage(error.message)}
 const magic=async()=>{setBusy(true);setMessage('');const{error}=await supabase.auth.signInWithOtp({email,options:{emailRedirectTo:location.href}});setBusy(false);setMessage(error?error.message:'Check your email for the secure sign-in link.')}
 return <div className="auth-screen"><div className="auth-orb one"/><div className="auth-orb two"/><main className="auth-card"><div className="auth-brand"><img src={logo}/><div><b>MIP Pricing OS</b><span>Commercial Operations</span></div></div><div className="auth-icon"><LockKeyhole/></div><p className="auth-kicker">SECURE INTERNAL ACCESS</p><h1>Sign in to your workspace</h1><p className="auth-copy">Requests, vendors, RFQs and pricing data are protected. Sign in with your MIP account to load the live pipeline.</p><form onSubmit={signIn}><label><span>Email</span><div><Mail size={16}/><input type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></div></label><label><span>Password</span><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter your password" required/></label>{message&&<div className="auth-message">{message}</div>}<button disabled={busy} type="submit">{busy?'Signing in…':'Sign in'}</button><button disabled={busy} className="magic" type="button" onClick={magic}>Email me a secure sign-in link</button></form><small>The public customer request portal remains available without signing in.</small></main></div>
}
