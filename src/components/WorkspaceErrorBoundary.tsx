import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props={children:ReactNode;title?:string}
type State={error:Error|null}

export class WorkspaceErrorBoundary extends Component<Props,State>{
 state:State={error:null}
 static getDerivedStateFromError(error:Error):State{return{error}}
 componentDidCatch(error:Error,info:ErrorInfo){console.error('Workspace render error',error,info)}
 render(){
  if(this.state.error)return <main className="workspace-crash"><section><span>WORKSPACE RECOVERY</span><h1>{this.props.title||'This workspace could not be opened.'}</h1><p>{this.state.error.message||'An unexpected rendering error occurred.'}</p><div><button onClick={()=>{this.setState({error:null});location.reload()}}>Reload workspace</button><button className="secondary" onClick={()=>{location.hash='#/'}}>Return to overview</button></div></section></main>
  return this.props.children
 }
}
