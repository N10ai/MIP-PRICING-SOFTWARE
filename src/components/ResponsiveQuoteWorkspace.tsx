import {useEffect,useState} from 'react'
import {useSearchParams} from 'react-router-dom'
import {QuotesPage} from './QuoteWorkspace'
import {MobileQuoteWorkspace} from './MobileQuoteWorkspace'

export function ResponsiveQuoteWorkspace(){
 const[params,setParams]=useSearchParams()
 const[mobile,setMobile]=useState(()=>matchMedia('(max-width:760px)').matches)
 useEffect(()=>{const query=matchMedia('(max-width:760px)');const change=()=>setMobile(query.matches);query.addEventListener('change',change);return()=>query.removeEventListener('change',change)},[])
 const quoteId=params.get('quote')
 if(mobile&&quoteId)return <MobileQuoteWorkspace quoteId={quoteId} onClose={()=>setParams({})}/>
 return <QuotesPage/>
}
