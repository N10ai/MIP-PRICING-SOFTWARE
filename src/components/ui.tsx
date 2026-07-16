import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react'

export function Button({variant='primary',className='',children,...props}:ButtonHTMLAttributes<HTMLButtonElement>&{variant?:'primary'|'secondary'|'ghost'|'danger'}){
  return <button className={`ui-button ui-button-${variant} ${className}`.trim()} {...props}>{children}</button>
}

export function GlassCard({className='',children,...props}:HTMLAttributes<HTMLElement>&{children:ReactNode}){
  return <article className={`glass ui-card ${className}`.trim()} {...props}>{children}</article>
}

export function StatusBadge({status}:{status:string}){
  return <em className={`status status-${status}`}>{status.replaceAll('_',' ')}</em>
}

export function EmptyState({icon,title,copy,action}:{icon:ReactNode,title:string,copy:string,action?:ReactNode}){
  return <div className="empty ui-empty">{icon}<h3>{title}</h3><p>{copy}</p>{action}</div>
}

export function SectionHeading({eyebrow,title,action}:{eyebrow:string,title:string,action?:ReactNode}){
  return <header className="section-head"><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div>{action}</header>
}

export function SkeletonRows({count=5}:{count?:number}){
  return <div className="stack">{Array.from({length:count},(_,i)=><div className="skeleton" key={i}/>)}</div>
}