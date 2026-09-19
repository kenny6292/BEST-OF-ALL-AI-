type Role="system"|"user"|"assistant";export type AIMessage={role:Role;content:string};export type Provider="openai"|"anthropic"|"gemini"|"xai"|"mistral";
export type GenerateInput={messages:AIMessage[];provider?:Provider;model?:string};
type Result={text:string;provider:Provider;model:string};
const DEFAULT_TIMEOUT_MS=Number(process.env.AI_REQUEST_TIMEOUT_MS||45000);
const MAX_INPUT_CHARS=Number(process.env.AI_MAX_INPUT_CHARS||120000);

const defaults:Record<Provider,string>={openai:process.env.OPENAI_MODEL||"gpt-5-mini",anthropic:process.env.ANTHROPIC_MODEL||"claude-opus-4.8",gemini:process.env.GEMINI_MODEL||"gemini-3.5-flash",xai:process.env.XAI_MODEL||"grok-4.1-fast-reasoning",mistral:process.env.MISTRAL_MODEL||"mistral-medium-latest"};
const keys:Record<Provider,string|undefined>={openai:process.env.OPENAI_API_KEY,anthropic:process.env.ANTHROPIC_API_KEY,gemini:process.env.GEMINI_API_KEY,xai:process.env.XAI_API_KEY,mistral:process.env.MISTRAL_API_KEY};
export function providerStatus(){return(Object.keys(keys) as Provider[]).map(provider=>({provider,configured:Boolean(keys[provider]),model:defaults[provider]}))}
function listFromEnv():Provider[]{const configured=(Object.keys(keys) as Provider[]).filter(p=>Boolean(keys[p]));const fallback=(process.env.AI_FALLBACK_PROVIDERS||"openai,anthropic,gemini,xai,mistral").split(",").map(x=>x.trim()).filter((x):x is Provider=>configured.includes(x as Provider));return fallback.length?fallback:configured}
function err(message:string,status=502){const e:any=new Error(message);e.status=status;return e}
function validateMessages(messages:AIMessage[]){
 const total=messages.reduce((n,m)=>n+(typeof m.content==="string"?m.content.length:0),0);
 if(total>MAX_INPUT_CHARS)throw err(`Input is too large. Maximum is ${MAX_INPUT_CHARS} characters.`,413);
}
async function timedFetch(url:string,init:RequestInit,timeoutMs=DEFAULT_TIMEOUT_MS){
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),Math.max(1000,timeoutMs));
 try{return await fetch(url,{...init,signal:controller.signal})}
 catch(e:any){if(e?.name==="AbortError")throw err(`Provider request timed out after ${Math.max(1,Math.round(timeoutMs/1000))} seconds.`,504);throw e}
 finally{clearTimeout(timer)}
}
async function json(url:string,init:RequestInit){const r=await timedFetch(url,init);const body=await r.text();let data:any;try{data=JSON.parse(body)}catch{data={raw:body}}if(!r.ok)throw err(data?.error?.message||data?.message||data?.raw||`Provider request failed (${r.status})`,r.status);return data}
async function openai(messages:AIMessage[],model:string,key:string):Promise<string>{const d=await json("https://api.openai.com/v1/responses",{method:"POST",headers:{"content-type":"application/json",authorization:`Bearer ${key}`},body:JSON.stringify({model,input:messages.map(m=>({role:m.role,content:m.content}))})});return d.output_text||""}
async function anthropic(messages:AIMessage[],model:string,key:string):Promise<string>{const system=messages.filter(m=>m.role==="system").map(m=>m.content).join("\n");const d=await json("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"content-type":"application/json","x-api-key":key,"anthropic-version":"2023-06-01"},body:JSON.stringify({model,max_tokens:process.env.AI_MAX_OUTPUT_TOKENS?Number(process.env.AI_MAX_OUTPUT_TOKENS):4096,system,messages:messages.filter(m=>m.role!=="system").map(m=>({role:m.role,content:m.content}))})});return(d.content||[]).filter((x:any)=>x.type==="text").map((x:any)=>x.text).join("")}
async function gemini(messages:AIMessage[],model:string,key:string):Promise<string>{const contents=messages.filter(m=>m.role!=="system").map(m=>({role:m.role==="assistant"?"model":"user",parts:[{text:m.content}]}));const system=messages.filter(m=>m.role==="system").map(m=>m.content).join("\n");const url=`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;const d=await json(url,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({systemInstruction:system?{parts:[{text:system}]}:undefined,contents,generationConfig:{maxOutputTokens:process.env.AI_MAX_OUTPUT_TOKENS?Number(process.env.AI_MAX_OUTPUT_TOKENS):4096}})});return d.candidates?.[0]?.content?.parts?.map((p:any)=>p.text||"").join("")||""}
async function compatible(base:string,messages:AIMessage[],model:string,key:string):Promise<string>{const d=await json(`${base}/chat/completions`,{method:"POST",headers:{"content-type":"application/json",authorization:`Bearer ${key}`},body:JSON.stringify({model,messages,max_tokens:process.env.AI_MAX_OUTPUT_TOKENS?Number(process.env.AI_MAX_OUTPUT_TOKENS):4096})});return d.choices?.[0]?.message?.content||""}
async function call(p:Provider,messages:AIMessage[],model:string,key:string){if(p==="openai")return openai(messages,model,key);if(p==="anthropic")return anthropic(messages,model,key);if(p==="gemini")return gemini(messages,model,key);if(p==="xai")return compatible("https://api.x.ai/v1",messages,model,key);return compatible("https://api.mistral.ai/v1",messages,model,key)}
export async function generate(input:GenerateInput):Promise<Result>{if(!input.messages?.length)throw err("At least one message is required.",400);validateMessages(input.messages);const configured=listFromEnv();if(!configured.length)throw err("No AI provider is configured.",503);const requested=input.provider?input.provider:undefined;if(requested&&(!keys[requested]))throw err(`Provider '${requested}' is not configured.`,503);const order=requested?[requested,...configured.filter(p=>p!==requested)]:configured;const fallbackEnabled=process.env.AI_FALLBACK_ENABLED!=="false";const attempts=fallbackEnabled?order:[order[0]];const failures:string[]=[];for(const p of attempts){try{const model=input.model&&p===requested?input.model:defaults[p];const text=await call(p,input.messages,model,keys[p]!);if(!text)throw err("Provider returned an empty response.");return{text,provider:p,model}}catch(e:any){failures.push(`${p}: ${e?.message||"request failed"}`);if(!fallbackEnabled)break}}throw err(`All selected AI providers failed. ${failures.join(" | ")}`,502)}

export type StreamEvent={type:"meta"|"delta"|"done";text?:string;provider?:Provider;model?:string};
async function streamCompatible(base:string,messages:AIMessage[],model:string,key:string,onDelta:(text:string)=>void){
 const r=await timedFetch(base+"/chat/completions",{method:"POST",headers:{"content-type":"application/json",authorization:"Bearer "+key},body:JSON.stringify({model,messages,max_tokens:process.env.AI_MAX_OUTPUT_TOKENS?Number(process.env.AI_MAX_OUTPUT_TOKENS):4096,stream:true})});
 if(!r.ok||!r.body){const body=await r.text();throw err(body||("Provider streaming failed ("+r.status+")"),r.status)}
 const reader=r.body.getReader(),decoder=new TextDecoder();let buffer="";
 for(;;){const x=await reader.read();if(x.done)break;buffer+=decoder.decode(x.value,{stream:true});const lines=buffer.split(/\r?\n/);buffer=lines.pop()||"";
  for(const line of lines){const s=line.trim();if(!s.startsWith("data:"))continue;const payload=s.slice(5).trim();if(payload==="[DONE]")continue;try{const d=JSON.parse(payload),text=d.choices?.[0]?.delta?.content;if(typeof text==="string"&&text)onDelta(text)}catch{}}
 }
}
async function streamAnthropic(messages:AIMessage[],model:string,key:string,onDelta:(text:string)=>void){
 const system=messages.filter(m=>m.role==="system").map(m=>m.content).join("\n");
 const r=await timedFetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"content-type":"application/json","x-api-key":key,"anthropic-version":"2023-06-01"},body:JSON.stringify({model,max_tokens:process.env.AI_MAX_OUTPUT_TOKENS?Number(process.env.AI_MAX_OUTPUT_TOKENS):4096,system,stream:true,messages:messages.filter(m=>m.role!=="system").map(m=>({role:m.role,content:m.content}))})});
 if(!r.ok||!r.body){const body=await r.text();throw err(body||("Provider streaming failed ("+r.status+")"),r.status)}
 const reader=r.body.getReader(),decoder=new TextDecoder();let buffer="";
 for(;;){const x=await reader.read();if(x.done)break;buffer+=decoder.decode(x.value,{stream:true});const events=buffer.split(/\n\n/);buffer=events.pop()||"";
  for(const event of events){const data=event.split(/\n/).find(x=>x.startsWith("data:"));if(!data)continue;try{const d=JSON.parse(data.slice(5).trim());if(d.type==="content_block_delta"&&d.delta?.type==="text_delta"&&d.delta.text)onDelta(d.delta.text)}catch{}}
 }
}
async function streamGemini(messages:AIMessage[],model:string,key:string,onDelta:(text:string)=>void){
 const contents=messages.filter(m=>m.role!=="system").map(m=>({role:m.role==="assistant"?"model":"user",parts:[{text:m.content}]})),system=messages.filter(m=>m.role==="system").map(m=>m.content).join("\n");
 const url="https://generativelanguage.googleapis.com/v1beta/models/"+encodeURIComponent(model)+":streamGenerateContent?alt=sse&key="+encodeURIComponent(key);
 const r=await timedFetch(url,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({systemInstruction:system?{parts:[{text:system}]}:undefined,contents,generationConfig:{maxOutputTokens:process.env.AI_MAX_OUTPUT_TOKENS?Number(process.env.AI_MAX_OUTPUT_TOKENS):4096}})});
 if(!r.ok||!r.body){const body=await r.text();throw err(body||("Provider streaming failed ("+r.status+")"),r.status)}
 const reader=r.body.getReader(),decoder=new TextDecoder();let buffer="";
 for(;;){const x=await reader.read();if(x.done)break;buffer+=decoder.decode(x.value,{stream:true});const lines=buffer.split(/\r?\n/);buffer=lines.pop()||"";
  for(const line of lines){const s=line.trim();if(!s.startsWith("data:"))continue;try{const d=JSON.parse(s.slice(5)),text=d.candidates?.[0]?.content?.parts?.map((p:any)=>p.text||"").join("");if(text)onDelta(text)}catch{}}
 }
}
async function streamCall(p:Provider,messages:AIMessage[],model:string,key:string,onDelta:(text:string)=>void){
 if(p==="anthropic")return streamAnthropic(messages,model,key,onDelta);
 if(p==="gemini")return streamGemini(messages,model,key,onDelta);
 return streamCompatible(p==="xai"?"https://api.x.ai/v1":p==="mistral"?"https://api.mistral.ai/v1":"https://api.openai.com/v1",messages,model,key,onDelta);
}
export async function streamGenerate(input:GenerateInput,onEvent:(event:StreamEvent)=>void){
 if(!input.messages?.length)throw err("At least one message is required.",400);validateMessages(input.messages);
 const configured=listFromEnv();if(!configured.length)throw err("No AI provider is configured.",503);
 const requested=input.provider;if(requested&&!keys[requested])throw err("Provider '"+requested+"' is not configured.",503);
 const order=requested?[requested,...configured.filter(p=>p!==requested)]:configured,attempts=process.env.AI_FALLBACK_ENABLED!=="false"?order:[order[0]],failures:string[]=[];
 for(const p of attempts){const model=input.model&&p===requested?input.model:defaults[p];let text="";
  try{onEvent({type:"meta",provider:p,model});await streamCall(p,input.messages,model,keys[p]!,chunk=>{text+=chunk;onEvent({type:"delta",text:chunk})});if(!text)throw err("Provider returned an empty response.");onEvent({type:"done",provider:p,model});return{text,provider:p,model}}
  catch(e:any){failures.push(p+": "+(e?.message||"request failed"));if(text)throw e}
 }
 throw err("All selected AI providers failed. "+failures.join(" | "),502)
}
