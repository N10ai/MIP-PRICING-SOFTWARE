export type FreightLocation={code:string;name:string;city:string;country:string;type:'airport'|'port'|'city';search?:string}

export const freightLocations:FreightLocation[]=[
 {code:'MIA',name:'Miami International Airport',city:'Miami',country:'United States',type:'airport'},
 {code:'FLL',name:'Fort Lauderdale-Hollywood International Airport',city:'Fort Lauderdale',country:'United States',type:'airport'},
 {code:'JFK',name:'John F. Kennedy International Airport',city:'New York',country:'United States',type:'airport'},
 {code:'LAX',name:'Los Angeles International Airport',city:'Los Angeles',country:'United States',type:'airport'},
 {code:'UIO',name:'Mariscal Sucre International Airport',city:'Quito',country:'Ecuador',type:'airport'},
 {code:'GYE',name:'José Joaquín de Olmedo International Airport',city:'Guayaquil',country:'Ecuador',type:'airport'},
 {code:'BOG',name:'El Dorado International Airport',city:'Bogotá',country:'Colombia',type:'airport'},
 {code:'USMIA',name:'PortMiami',city:'Miami',country:'United States',type:'port'},
 {code:'USPEF',name:'Port Everglades',city:'Fort Lauderdale',country:'United States',type:'port'},
 {code:'CNSHA',name:'Port of Shanghai',city:'Shanghai',country:'China',type:'port'}
]

const normalize=(row:any):FreightLocation|null=>{
 const rawType=String(row?.type||'').toLowerCase()
 const type:FreightLocation['type']=rawType==='airport'?'airport':rawType==='seaport'||rawType==='port'?'port':'city'
 const code=String(row?.code||row?.iata||row?.unlocode||'').trim().toUpperCase()
 const name=String(row?.name||row?.airport||row?.port||row?.city||'').trim()
 const city=String(row?.city||row?.municipality||name).trim()
 const country=String(row?.country||row?.country_name||'').trim()
 if(!code&&!name)return null
 return{code,name:name||city||code,city:city||name||code,country,type,search:String(row?.search||`${code} ${name} ${city} ${country}`).toLowerCase()}
}

let cache:FreightLocation[]|null=null
export async function loadFreightLocations(){
 if(cache)return cache
 try{
  const response=await fetch('https://n10ai.github.io/mip-tools/logistics-locations.json',{cache:'force-cache'})
  if(!response.ok)throw new Error(`Location catalog HTTP ${response.status}`)
  const rows=await response.json()
  const normalized=(Array.isArray(rows)?rows:[]).map(normalize).filter(Boolean) as FreightLocation[]
  cache=normalized.length?normalized:freightLocations
 }catch(error){
  console.warn('Using fallback location catalog',error)
  cache=freightLocations
 }
 return cache
}
