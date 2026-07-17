import {useEffect,useState} from 'react'
import type {RequestSummary} from './RequestWorkspace'
import {VendorRateWorkspace} from './VendorRateWorkspace'
import {MobileVendorRateWorkspace} from './MobileVendorRateWorkspace'

export function ResponsiveVendorRateWorkspace(props:{request:RequestSummary;onClose:()=>void;onChanged:()=>void}){
 const[mobile,setMobile]=useState(()=>matchMedia('(max-width: 760px)').matches)
 useEffect(()=>{const media=matchMedia('(max-width: 760px)');const change=()=>setMobile(media.matches);media.addEventListener('change',change);return()=>media.removeEventListener('change',change)},[])
 return mobile?<MobileVendorRateWorkspace {...props}/>:<VendorRateWorkspace {...props}/>
}
