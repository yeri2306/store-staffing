import React from 'react';
import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";

// ─────────────────────────────────────────────────────────────────────────────
// ① supabase.com 에서 프로젝트 생성 후 아래 두 값을 교체하세요
//    Project Settings → API → Project URL / anon public key
// ─────────────────────────────────────────────────────────────────────────────
const SUPABASE_URL      = "https://crmcnjydqsecexogknlz.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_3ZiYHyL4l39Wd5t4aURI2g_rUt3DJ5q";
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── constants ─────────────────────────────────────────────────────────────────
const COUNTRIES = ["KR","US","JP","CN","EU","AU","SG"];
const STANDARD_HOURS = 40;
const STORE_MAP = {
  KR:["GM_서울 루쿠스노바에 서울","GM_서울 무쿠스노바에 북점","GM_서울 F1시(A)","GM_서울 DS 글리파","GM_서울 MALL 신세계스퀘어","GM_경기 DS 글리파리아","GM_경기 DS 탑"],
  US:["GM_NY Fifth Ave","GM_LA Beverly Hills","GM_Chicago Mag Mile","GM_Miami Brickell"],
  JP:["GM_Tokyo Ginza","GM_Osaka Shinsaibashi","GM_Shibuya"],
  CN:["GM_Shanghai Nanjing","GM_Beijing Sanlitun","GM_Chengdu IFS"],
  EU:["GM_Paris Champs-Élysées","GM_Milan Montenapoleone","GM_London Bond St"],
  AU:["GM_Sydney Pitt St","GM_Melbourne Collins St"],
  SG:["GM_Singapore Orchard","GM_Singapore Marina Bay"],
};
const MONTHS = Array.from({length:12},(_,i)=>`2025-${String(i+1).padStart(2,"0")}`);

const SAP_ALIAS = {
  "매장코드":"store_code","store_code":"store_code",
  "storecode":"store_code",
  "국가":"country","country":"country",
  "소속":"store_name","매장명":"store_name","store_name":"store_name",
  "월":"month","마감월":"month","month":"month",
  "매출":"sales","sales":"sales",
  "입점객":"visitors","방문객":"visitors","visitors":"visitors",
  "달성율":"achievement_rate","달성률":"achievement_rate","achievement_rate":"achievement_rate",
  "저품율":"defect_rate","저품률":"defect_rate","defect_rate":"defect_rate",
};
const SAP_FIELDS = [
  {key:"store_code",       label:"매장코드",    required:true},
  {key:"country",          label:"국가"},
  {key:"store_name",       label:"매장명"},
  {key:"month",            label:"월 (YYYY-MM)", required:true},
  {key:"sales",            label:"매출"},
  {key:"visitors",         label:"입점객"},
  {key:"achievement_rate", label:"달성율 (%)"},
  {key:"defect_rate",      label:"저품율 (%)"},
];

// ── helpers ───────────────────────────────────────────────────────────────────
const num   = v => parseFloat(String(v??0).replace(/,/g,"")) || 0;
const avg   = arr => arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : 0;
const f1    = v => Number.isFinite(v) ? v.toFixed(1) : "—";
const f2    = v => Number.isFinite(v) ? v.toFixed(2) : "—";
const comma = v => Math.round(v).toLocaleString();

const isActive = (emp, month) => {
  if (!month || !emp.contract_end) return true;
  return emp.contract_end.slice(0,7) >= month;
};

const calcSummary = (rows=[], month="") => {
  const withH  = rows.filter(r => num(r.hours) > 0);
  const active = withH.filter(r => isActive(r, month));
  const excl   = withH.filter(r => !isActive(r, month));
  const ft = active.filter(r=>r.type==="FT");
  const pt = active.filter(r=>r.type==="PT");
  const totalH = active.reduce((a,r)=>a+num(r.hours),0);
  return {
    ft_count: ft.length, pt_count: pt.length, total: active.length,
    excluded: excl.length,
    ft_avg_h: ft.length ? avg(ft.map(r=>num(r.hours))) : 0,
    pt_avg_h: pt.length ? avg(pt.map(r=>num(r.hours))) : 0,
    fte: totalH / STANDARD_HOURS, total_h: totalH,
  };
};

// ── shared styles ─────────────────────────────────────────────────────────────
const inputStyle = (err) => ({
  width:"100%", boxSizing:"border-box", padding:"8px 11px",
  border:`0.5px solid ${err?"var(--color-border-danger)":"var(--color-border-secondary)"}`,
  borderRadius:"var(--border-radius-md)", fontSize:13,
  background:"var(--color-background-primary)", color:"var(--color-text-primary)",
});
const cardStyle = {
  background:"var(--color-background-primary)",
  border:"0.5px solid var(--color-border-tertiary)",
  borderRadius:"var(--border-radius-lg)", padding:"1.25rem",
};
const btnPrimary = (disabled) => ({
  width:"100%", padding:"10px", border:"none",
  borderRadius:"var(--border-radius-md)",
  background: disabled ? "var(--color-border-secondary)" : "var(--color-text-primary)",
  color:"var(--color-background-primary)",
  fontSize:14, fontWeight:500, cursor: disabled ? "default" : "pointer",
});

// ══════════════════════════════════════════════════════════════════════════════
// App root — auth state machine
// ══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [session, setSession] = useState(undefined); // undefined = initialising
  const [profile, setProfile] = useState(null);

  const fetchProfile = async (uid) => {
    const {data} = await sb.from("profiles").select("*").eq("id",uid).single();
    setProfile(data ?? null);
  };

  useEffect(() => {
    sb.auth.getSession().then(({data:{session}}) => {
      setSession(session ?? null);
      if (session) fetchProfile(session.user.id);
    });
    const {data:{subscription}} = sb.auth.onAuthStateChange((_e, session) => {
      setSession(session ?? null);
      if (session) fetchProfile(session.user.id);
      else setProfile(null);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (session === undefined) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"60vh"}}>
      <p style={{fontSize:13,color:"var(--color-text-secondary)"}}>로딩 중...</p>
    </div>
  );
  if (!session) return <LoginScreen />;
  if (!profile)  return <NoProfileScreen />;
  if (profile.role === "hq") return <HqView profile={profile} />;
  return <StoreView profile={profile} />;
}

// ── LoginScreen ───────────────────────────────────────────────────────────────
function LoginScreen() {
  const [email, setEmail] = useState("");
  const [pw,    setPw]    = useState("");
  const [err,   setErr]   = useState("");
  const [busy,  setBusy]  = useState(false);

  const login = async () => {
    if (!email || !pw) { setErr("이메일과 비밀번호를 입력하세요."); return; }
    setBusy(true); setErr("");
    const {error} = await sb.auth.signInWithPassword({email, password:pw});
    if (error) { setErr("로그인 실패: " + error.message); setBusy(false); }
  };

  return (
    <div style={{maxWidth:380,margin:"80px auto",padding:"0 1rem"}}>
      <div style={cardStyle}>
        <p style={{fontSize:18,fontWeight:500,margin:"0 0 4px",color:"var(--color-text-primary)"}}>Store 적정인력 시스템</p>
        <p style={{fontSize:12,color:"var(--color-text-secondary)",margin:"0 0 1.5rem"}}>관리자가 발급한 계정으로 로그인하세요</p>
        <div style={{marginBottom:10}}>
          <label style={{fontSize:11,color:"var(--color-text-secondary)",display:"block",marginBottom:4}}>이메일</label>
          <input value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&login()}
            type="email" placeholder="name@company.com" style={inputStyle(false)}/>
        </div>
        <div style={{marginBottom:16}}>
          <label style={{fontSize:11,color:"var(--color-text-secondary)",display:"block",marginBottom:4}}>비밀번호</label>
          <input value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&login()}
            type="password" placeholder="••••••••" style={inputStyle(false)}/>
        </div>
        {err && <p style={{fontSize:12,color:"var(--color-text-danger)",margin:"0 0 10px"}}>{err}</p>}
        <button onClick={login} disabled={busy} style={btnPrimary(busy)}>
          {busy ? "로그인 중..." : "로그인"}
        </button>
        <p style={{fontSize:11,color:"var(--color-text-tertiary)",textAlign:"center",margin:"12px 0 0"}}>
          계정이 없으면 HQ 관리자에게 계정 발급을 요청하세요
        </p>
      </div>
    </div>
  );
}

function NoProfileScreen() {
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"60vh",flexDirection:"column",gap:12}}>
      <p style={{fontSize:14,color:"var(--color-text-secondary)"}}>프로필이 설정되지 않았습니다. HQ 관리자에게 문의하세요.</p>
      <button onClick={()=>sb.auth.signOut()} style={{fontSize:13,color:"var(--color-text-secondary)",background:"none",border:"none",cursor:"pointer"}}>로그아웃</button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// StoreView
// ══════════════════════════════════════════════════════════════════════════════
function StoreView({ profile }) {
  const blank = () => ({store_code:"", store_name:"", month:"", submitter:""});
  const [info,  setInfo]  = useState(blank());
  const [emps,  setEmps]  = useState([{id:1,name:"",type:"FT",contract_start:"",contract_end:"",hours:""}]);
  const [subs,  setSubs]  = useState([]);
  const [saved, setSaved] = useState(false);
  const [err,   setErr]   = useState("");
  const [busy,  setBusy]  = useState(false);

  useEffect(() => { loadSubs(); }, []);

  const loadSubs = async () => {
    // RLS가 자동으로 자국 데이터만 반환
    const {data} = await sb.from("submissions")
      .select("*").order("submitted_at", {ascending:false}).limit(50);
    setSubs(data ?? []);
  };

  const si = (k,v) => setInfo(p=>({...p,[k]:v}));
  const addRow = () => setEmps(p=>[...p,{id:Date.now(),name:"",type:"FT",contract_start:"",contract_end:"",hours:""}]);
  const delRow = id => setEmps(p=>p.filter(e=>e.id!==id));
  const editRow = (id,k,v) => setEmps(p=>p.map(e=>e.id===id?{...e,[k]:v}:e));
  const summary = calcSummary(emps, info.month);

  const submit = async () => {
    if (!info.store_name||!info.month||!info.submitter) { setErr("기본 정보를 모두 입력해주세요."); return; }
    if (!emps.some(e=>num(e.hours)>0)) { setErr("근로시간을 최소 1행 입력해주세요."); return; }
    setErr(""); setBusy(true);
    const sc = info.store_code || info.store_name.replace(/\s+/g,"_").toUpperCase();
    const {error} = await sb.from("submissions").insert({
      store_code: sc, store_name: info.store_name,
      country: profile.country, month: info.month,
      submitter: info.submitter, employees: emps,
    });
    setBusy(false);
    if (error) { setErr("저장 실패: " + error.message); return; }
    setInfo(blank());
    setEmps([{id:1,name:"",type:"FT",contract_start:"",contract_end:"",hours:""}]);
    setSaved(true); setTimeout(()=>setSaved(false),3000);
    loadSubs();
  };

  const thStyle = {fontSize:11,fontWeight:500,color:"var(--color-text-secondary)",
    padding:"7px 8px",textAlign:"left",borderBottom:"0.5px solid var(--color-border-secondary)",
    background:"var(--color-background-secondary)",whiteSpace:"nowrap"};
  const tdBase = {padding:"6px 6px",borderBottom:"0.5px solid var(--color-border-tertiary)"};

  return (
    <div style={{maxWidth:760,margin:"0 auto",padding:"1.5rem 1rem"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"1.25rem"}}>
        <div>
          <p style={{fontSize:16,fontWeight:500,margin:0,color:"var(--color-text-primary)"}}>
            {profile.country} · 월 마감 인력 입력
          </p>
          <p style={{fontSize:12,color:"var(--color-text-secondary)",margin:"3px 0 0"}}>
            {profile.email} · 직원별 계약 근로시간을 행으로 입력하면 FTE가 자동 계산됩니다
          </p>
        </div>
        <button onClick={()=>sb.auth.signOut()} style={{fontSize:12,color:"var(--color-text-tertiary)",background:"none",border:"none",cursor:"pointer"}}>로그아웃</button>
      </div>

      {/* 기본 정보 */}
      <div style={{...cardStyle, marginBottom:10}}>
        <p style={{fontSize:12,fontWeight:500,color:"var(--color-text-secondary)",margin:"0 0 12px"}}>기본 정보</p>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
          <div>
            <label style={{fontSize:11,color:"var(--color-text-secondary)",display:"block",marginBottom:4}}>매장 *</label>
            <select value={info.store_name} onChange={e=>{const n=e.target.value; si("store_name",n); si("store_code",n.replace(/\s+/g,"_").toUpperCase());}}
              style={{...inputStyle(false),padding:"7px 10px"}}>
              <option value="">선택</option>
              {(STORE_MAP[profile.country]||[]).map(s=><option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={{fontSize:11,color:"var(--color-text-secondary)",display:"block",marginBottom:4}}>마감 월 *</label>
            <select value={info.month} onChange={e=>si("month",e.target.value)} style={{...inputStyle(false),padding:"7px 10px"}}>
              <option value="">선택</option>
              {MONTHS.map(m=><option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label style={{fontSize:11,color:"var(--color-text-secondary)",display:"block",marginBottom:4}}>제출자 *</label>
          <input value={info.submitter} onChange={e=>si("submitter",e.target.value)} placeholder="이름" style={inputStyle(false)}/>
        </div>
      </div>

      {/* 직원 테이블 */}
      <div style={{...cardStyle, marginBottom:10}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <p style={{fontSize:12,fontWeight:500,color:"var(--color-text-secondary)",margin:0}}>
            직원별 계약 근로시간 <span style={{fontWeight:400,color:"var(--color-text-tertiary)"}}>· h/주</span>
          </p>
          <button type="button" onClick={addRow}
            style={{fontSize:12,padding:"5px 14px",borderRadius:"var(--border-radius-md)",
              border:"0.5px solid var(--color-border-secondary)",background:"var(--color-background-secondary)",
              color:"var(--color-text-primary)",cursor:"pointer"}}>
            + 행 추가
          </button>
        </div>

        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",tableLayout:"fixed",minWidth:560}}>
            <colgroup>
              <col style={{width:28}}/><col style={{width:"18%"}}/><col style={{width:80}}/>
              <col style={{width:"17%"}}/><col style={{width:"17%"}}/><col/><col style={{width:28}}/>
            </colgroup>
            <thead>
              <tr>
                {["#","성명","구분","계약 시작일","계약 종료일","계약 근로시간 (h/주)",""].map((h,i)=>(
                  <th key={i} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {emps.map((e,i)=>{
                const expired = info.month && e.contract_end && e.contract_end.slice(0,7) < info.month;
                return (
                  <tr key={e.id} style={{opacity:expired?.45:1}}>
                    <td style={{...tdBase,fontSize:11,color:"var(--color-text-tertiary)",textAlign:"center"}}>{i+1}</td>
                    <td style={tdBase}>
                      <input value={e.name} onChange={ev=>editRow(e.id,"name",ev.target.value)} placeholder="홍길동"
                        style={{width:"100%",boxSizing:"border-box",padding:"5px 7px",border:"0.5px solid var(--color-border-secondary)",borderRadius:"var(--border-radius-md)",fontSize:12,background:"var(--color-background-primary)",color:"var(--color-text-primary)"}}/>
                    </td>
                    <td style={tdBase}>
                      <div style={{display:"flex",gap:4}}>
                        {["FT","PT"].map(t=>{
                          const active=e.type===t;
                          return (
                            <button key={t} type="button" onClick={()=>editRow(e.id,"type",t)}
                              style={{flex:1,padding:"5px 0",fontSize:11,fontWeight:600,cursor:"pointer",
                                borderRadius:"var(--border-radius-md)",
                                border:active?(t==="FT"?"1.5px solid #185FA5":"1.5px solid #854F0B"):"0.5px solid #ccc",
                                background:active?(t==="FT"?"#185FA5":"#854F0B"):"transparent",
                                color:active?"#ffffff":"#999"}}>
                              {t}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                    <td style={tdBase}>
                      <input type="date" value={e.contract_start} onChange={ev=>editRow(e.id,"contract_start",ev.target.value)}
                        style={{width:"100%",boxSizing:"border-box",padding:"5px 6px",border:"0.5px solid var(--color-border-secondary)",borderRadius:"var(--border-radius-md)",fontSize:12,background:"var(--color-background-primary)",color:"var(--color-text-primary)"}}/>
                    </td>
                    <td style={tdBase}>
                      <input type="date" value={e.contract_end} onChange={ev=>editRow(e.id,"contract_end",ev.target.value)}
                        style={{width:"100%",boxSizing:"border-box",padding:"5px 6px",
                          border:`0.5px solid ${expired?"var(--color-border-danger)":"var(--color-border-secondary)"}`,
                          borderRadius:"var(--border-radius-md)",fontSize:12,
                          background:expired?"var(--color-background-danger)":"var(--color-background-primary)",
                          color:"var(--color-text-primary)"}}/>
                    </td>
                    <td style={tdBase}>
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <input type="number" min="1" max="60" value={e.hours} onChange={ev=>editRow(e.id,"hours",ev.target.value)} placeholder="예: 40"
                          style={{flex:1,minWidth:0,padding:"5px 7px",border:"0.5px solid var(--color-border-secondary)",borderRadius:"var(--border-radius-md)",fontSize:12,background:"var(--color-background-primary)",color:"var(--color-text-primary)"}}/>
                        {expired&&<span style={{fontSize:10,color:"var(--color-text-danger)",whiteSpace:"nowrap"}}>만료</span>}
                      </div>
                    </td>
                    <td style={{...tdBase,textAlign:"center"}}>
                      {emps.length>1&&<button type="button" onClick={()=>delRow(e.id)}
                        style={{border:"none",background:"none",cursor:"pointer",color:"var(--color-text-tertiary)",fontSize:18,lineHeight:1,padding:"0 2px"}}>×</button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 자동 요약 */}
        {summary.total>0&&(
          <div style={{marginTop:14,background:"var(--color-background-secondary)",borderRadius:"var(--border-radius-md)",padding:"12px 14px"}}>
            <p style={{fontSize:11,fontWeight:500,color:"var(--color-text-secondary)",margin:"0 0 10px"}}>
              자동 요약 <span style={{fontWeight:400,color:"var(--color-text-tertiary)"}}>· 마감월 기준 재직자만 집계</span>
            </p>
            <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8,marginBottom:10}}>
              {[
                {label:"FT 인원", val:`${summary.ft_count}명`, color:"#185FA5"},
                {label:"PT 인원", val:`${summary.pt_count}명`, color:"#854F0B"},
                {label:"총 인원", val:`${summary.total}명`,    color:"var(--color-text-primary)"},
                {label:"FT 평균", val:summary.ft_count?`${f1(summary.ft_avg_h)}h`:"—", color:"var(--color-text-secondary)"},
                {label:"PT 평균", val:summary.pt_count?`${f1(summary.pt_avg_h)}h`:"—", color:"var(--color-text-secondary)"},
              ].map(c=>(
                <div key={c.label} style={{textAlign:"center",padding:"8px",background:"var(--color-background-primary)",borderRadius:"var(--border-radius-md)"}}>
                  <div style={{fontSize:11,color:"var(--color-text-tertiary)",marginBottom:4}}>{c.label}</div>
                  <div style={{fontSize:17,fontWeight:500,color:c.color}}>{c.val}</div>
                </div>
              ))}
            </div>
            {summary.excluded>0&&(
              <div style={{padding:"7px 12px",background:"var(--color-background-danger)",borderRadius:"var(--border-radius-md)",fontSize:12,color:"var(--color-text-danger)",marginBottom:10}}>
                계약 만료 {summary.excluded}명 — 마감월 이전 종료, 집계 제외
              </div>
            )}
            <div style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:"var(--color-background-primary)",borderRadius:"var(--border-radius-md)"}}>
              <div>
                <div style={{fontSize:11,color:"var(--color-text-tertiary)"}}>FTE 환산</div>
                <div style={{fontSize:22,fontWeight:500,color:"var(--color-text-primary)"}}>{f2(summary.fte)}</div>
                <div style={{fontSize:10,color:"var(--color-text-tertiary)"}}>총 {summary.total_h}h ÷ {STANDARD_HOURS}h</div>
              </div>
              <div style={{flex:1}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"var(--color-text-tertiary)",marginBottom:4}}>
                  <span>FT {summary.total?Math.round(summary.ft_count/summary.total*100):0}%</span>
                  <span>PT {summary.total?Math.round(summary.pt_count/summary.total*100):0}%</span>
                </div>
                <div style={{height:8,background:"var(--color-border-tertiary)",borderRadius:4,overflow:"hidden",display:"flex"}}>
                  <div style={{height:"100%",width:`${summary.total?summary.ft_count/summary.total*100:0}%`,background:"#185FA5",transition:"width .3s"}}/>
                  <div style={{height:"100%",width:`${summary.total?summary.pt_count/summary.total*100:0}%`,background:"#854F0B",transition:"width .3s"}}/>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {err&&<p style={{fontSize:12,color:"var(--color-text-danger)",margin:"0 0 8px"}}>{err}</p>}
      <button onClick={submit} disabled={busy}
        style={{...btnPrimary(busy), background:saved?"#1D9E75":busy?"var(--color-border-secondary)":"var(--color-text-primary)",transition:"background .25s",marginBottom:"1.5rem"}}>
        {saved?"✓ 저장되었습니다":busy?"저장 중...":"제출하기"}
      </button>

      {/* 이력 */}
      {subs.length>0&&(
        <div>
          <p style={{fontSize:12,fontWeight:500,color:"var(--color-text-secondary)",marginBottom:10}}>{profile.country} 제출 이력 ({subs.length}건)</p>
          {subs.map(s=>{
            const sm=calcSummary(s.employees||[], s.month);
            return (
              <div key={s.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",background:"var(--color-background-secondary)",borderRadius:"var(--border-radius-md)",marginBottom:8}}>
                <div>
                  <span style={{fontSize:13,fontWeight:500,color:"var(--color-text-primary)"}}>{s.month} · {s.store_name?.split(" ").slice(-1)[0]}</span>
                  <span style={{fontSize:12,color:"var(--color-text-tertiary)",marginLeft:10}}>{s.submitter}</span>
                </div>
                <div style={{fontSize:12,color:"var(--color-text-secondary)",textAlign:"right"}}>
                  FT {sm.ft_count} / PT {sm.pt_count} · FTE {f2(sm.fte)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// HqView
// ══════════════════════════════════════════════════════════════════════════════
function HqView({ profile }) {
  const [tab,     setTab]     = useState("dashboard");
  const [subs,    setSubs]    = useState([]);
  const [sapData, setSapData] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAll = async () => {
    setLoading(true);
    const [{data:s},{data:d}] = await Promise.all([
      sb.from("submissions").select("*").order("submitted_at",{ascending:false}),
      sb.from("sap_data").select("*").order("month",{ascending:false}),
    ]);
    setSubs(s??[]); setSapData(d??[]); setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  // merge: sap_data + submission summary by store_code+month
  const merged = (() => {
    const m={};
    sapData.forEach(r=>{ m[`${r.store_code}||${r.month}`]={...r}; });
    subs.forEach(r=>{
      const k=`${r.store_code}||${r.month}`;
      const s=calcSummary(r.employees||[], r.month);
      m[k]={...(m[k]||{}), store_code:r.store_code, country:r.country, month:r.month,
        store_name:r.store_name, submitter:r.submitter,
        ft_count:s.ft_count, pt_count:s.pt_count, total:s.total,
        ft_avg_h:s.ft_avg_h, pt_avg_h:s.pt_avg_h, fte:s.fte};
    });
    return Object.values(m);
  })();

  const ts = t => ({padding:"7px 18px",fontSize:13,cursor:"pointer",border:"none",background:"none",
    borderBottom:tab===t?"2px solid var(--color-text-primary)":"2px solid transparent",
    color:tab===t?"var(--color-text-primary)":"var(--color-text-secondary)",fontWeight:tab===t?500:400});

  return (
    <div style={{maxWidth:900,margin:"0 auto",padding:"1.5rem 1rem"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.25rem"}}>
        <div>
          <p style={{fontSize:16,fontWeight:500,margin:0,color:"var(--color-text-primary)"}}>HQ 대시보드</p>
          <p style={{fontSize:12,color:"var(--color-text-secondary)",margin:"3px 0 0"}}>
            {profile.email} · 인력 제출 {subs.length}건 · SAP {sapData.length}행
          </p>
        </div>
        <div style={{display:"flex",gap:12,alignItems:"center"}}>
          <button onClick={loadAll} style={{fontSize:12,color:"var(--color-text-secondary)",background:"none",border:"none",cursor:"pointer"}}>↻ 새로고침</button>
          <button onClick={()=>sb.auth.signOut()} style={{fontSize:12,color:"var(--color-text-tertiary)",background:"none",border:"none",cursor:"pointer"}}>로그아웃</button>
        </div>
      </div>

      <div style={{borderBottom:"0.5px solid var(--color-border-tertiary)",marginBottom:"1.25rem",display:"flex"}}>
        {[["dashboard","대시보드"],["upload","SAP 업로드"],["raw","원본 데이터"]].map(([t,l])=>(
          <button key={t} style={ts(t)} onClick={()=>setTab(t)}>{l}</button>
        ))}
      </div>

      {loading
        ? <p style={{fontSize:13,color:"var(--color-text-secondary)",textAlign:"center",padding:"2rem"}}>데이터 로딩 중...</p>
        : <>
            {tab==="dashboard" && <HqDashboard subs={subs} sapData={sapData} merged={merged}/>}
            {tab==="upload"    && <HqUpload sapData={sapData} onDone={loadAll}/>}
            {tab==="raw"       && <HqRaw merged={merged} subs={subs}/>}
          </>
      }
    </div>
  );
}

// ── HqDashboard ───────────────────────────────────────────────────────────────
function HqDashboard({ subs, sapData, merged }) {
  if (!subs.length && !sapData.length) return (
    <div style={{textAlign:"center",padding:"3rem",color:"var(--color-text-secondary)",fontSize:13}}>
      아직 수집된 데이터가 없습니다.
    </div>
  );

  const totSum = calcSummary(subs.flatMap(s=>s.employees||[]));
  const allMonths = [...new Set(subs.map(s=>s.month))].sort();

  const byCountry = COUNTRIES.map(c=>{
    const rows = subs.filter(s=>s.country===c);
    if (!rows.length) return null;
    const s = calcSummary(rows.flatMap(r=>r.employees||[]));
    const sap = sapData.filter(r=>r.country===c);
    return {country:c,...s, sub_count:rows.length,
      total_sales: sap.reduce((a,r)=>a+num(r.sales),0),
      total_visitors: sap.reduce((a,r)=>a+num(r.visitors),0),
      avg_ach: avg(sap.filter(r=>r.achievement_rate).map(r=>num(r.achievement_rate))),
    };
  }).filter(Boolean);

  // store-level: merge by store_code+month, calc sales per FTE
  const storePerf = merged.filter(r=>r.fte>0 && r.sales).map(r=>({
    ...r,
    sales_per_fte: num(r.sales)/r.fte,
    visitors_per_fte: num(r.visitors)/(r.fte||1),
  }));

  const trendData = allMonths.map(m=>{
    const rows=subs.filter(s=>s.month===m);
    const s=calcSummary(rows.flatMap(r=>r.employees||[]));
    return {month:m.slice(5), FT인원:s.ft_count, PT인원:s.pt_count, FTE:parseFloat(f2(s.fte))};
  });

  const card=(label,value,sub)=>(
    <div style={{background:"var(--color-background-secondary)",borderRadius:"var(--border-radius-md)",padding:"12px 16px"}}>
      <div style={{fontSize:11,color:"var(--color-text-secondary)",marginBottom:4}}>{label}</div>
      <div style={{fontSize:22,fontWeight:500,color:"var(--color-text-primary)"}}>{value}</div>
      {sub&&<div style={{fontSize:11,color:"var(--color-text-tertiary)",marginTop:2}}>{sub}</div>}
    </div>
  );

  const thS={fontSize:11,fontWeight:500,color:"var(--color-text-secondary)",padding:"7px 12px",
    textAlign:"left",borderBottom:"0.5px solid var(--color-border-secondary)",
    background:"var(--color-background-secondary)",whiteSpace:"nowrap"};
  const tdS=(right,bold,color)=>({padding:"9px 12px",borderBottom:"0.5px solid var(--color-border-tertiary)",
    textAlign:right?"right":"left",fontWeight:bold?500:400,fontSize:13,
    color:color||"var(--color-text-secondary)"});

  return (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:"1.5rem"}}>
        {card("글로벌 총 인원",`${totSum.total}명`)}
        {card("FT 인원",`${totSum.ft_count}명`,`평균 ${f1(totSum.ft_avg_h)}h/주`)}
        {card("PT 인원",`${totSum.pt_count}명`,`평균 ${f1(totSum.pt_avg_h)}h/주`)}
        {card("글로벌 FTE",f2(totSum.fte),`÷${STANDARD_HOURS}h 기준`)}
      </div>

      {/* 국가별 테이블 */}
      <div style={{marginBottom:"1.5rem",border:"0.5px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-lg)",overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead>
            <tr>
              {["국가","FT","PT","총 인원","FTE","총 매출","총 입점객","달성율"].map((h,i)=>(
                <th key={h} style={{...thS,textAlign:i===0?"left":"right"}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {byCountry.map(c=>(
              <tr key={c.country}>
                <td style={tdS(false,true,"var(--color-text-primary)")}>{c.country}</td>
                <td style={{...tdS(true,true,"#185FA5")}}>{c.ft_count}명</td>
                <td style={{...tdS(true,true,"#854F0B")}}>{c.pt_count}명</td>
                <td style={tdS(true,true,"var(--color-text-primary)")}>{c.total}명</td>
                <td style={tdS(true,true,"var(--color-text-primary)")}>{f2(c.fte)}</td>
                <td style={tdS(true,false)}>{c.total_sales?comma(c.total_sales):"—"}</td>
                <td style={tdS(true,false)}>{c.total_visitors?comma(c.total_visitors):"—"}</td>
                <td style={tdS(true,false)}>{c.avg_ach?f1(c.avg_ach)+"%":"—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 매장별 FTE vs 매출 */}
      {storePerf.length>0&&(
        <div style={{marginBottom:"1.5rem",border:"0.5px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-lg)",overflow:"hidden"}}>
          <div style={{padding:"10px 16px",background:"var(--color-background-secondary)",fontSize:12,fontWeight:500,color:"var(--color-text-secondary)"}}>
            매장별 FTE / 매출 / 입점객 분석
          </div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead>
                <tr>
                  {["국가","매장코드","월","FTE","매출","입점객","매출/FTE","입점객/FTE","달성율"].map((h,i)=>(
                    <th key={h} style={{...thS,textAlign:i<2?"left":"right"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {storePerf.sort((a,b)=>(b.month||"").localeCompare(a.month||"")).slice(0,50).map((r,i)=>(
                  <tr key={i}>
                    <td style={tdS(false,false,"var(--color-text-primary)")}>{r.country||"—"}</td>
                    <td style={tdS(false,false)}>{r.store_code||"—"}</td>
                    <td style={tdS(true,false)}>{r.month||"—"}</td>
                    <td style={tdS(true,true,"var(--color-text-primary)")}>{f2(r.fte)}</td>
                    <td style={tdS(true,false)}>{r.sales?comma(num(r.sales)):"—"}</td>
                    <td style={tdS(true,false)}>{r.visitors?comma(num(r.visitors)):"—"}</td>
                    <td style={tdS(true,false,"#185FA5")}>{r.sales_per_fte?comma(r.sales_per_fte):"—"}</td>
                    <td style={tdS(true,false)}>{r.visitors_per_fte?f1(r.visitors_per_fte):"—"}</td>
                    <td style={tdS(true,false)}>{r.achievement_rate?f1(num(r.achievement_rate))+"%":"—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {trendData.length>=2&&(
        <div>
          <p style={{fontSize:12,fontWeight:500,color:"var(--color-text-secondary)",margin:"0 0 10px"}}>월별 FT·PT 인원 및 FTE 추이</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trendData} margin={{top:0,right:16,left:-20,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-tertiary)"/>
              <XAxis dataKey="month" tick={{fontSize:11,fill:"var(--color-text-secondary)"}}/>
              <YAxis tick={{fontSize:11,fill:"var(--color-text-secondary)"}}/>
              <Tooltip contentStyle={{background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-secondary)",borderRadius:8,fontSize:12}}/>
              <Legend iconSize={10} wrapperStyle={{fontSize:12}}/>
              <Line type="monotone" dataKey="FT인원" stroke="#378ADD" strokeWidth={2} dot={{r:3}}/>
              <Line type="monotone" dataKey="PT인원" stroke="#EF9F27" strokeWidth={2} dot={{r:3}}/>
              <Line type="monotone" dataKey="FTE"    stroke="#1D9E75" strokeWidth={2} dot={{r:3}} strokeDasharray="4 2"/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ── HqUpload ──────────────────────────────────────────────────────────────────
function HqUpload({ sapData, onDone }) {
  const [preview,  setPreview]  = useState(null);
  const [colMap,   setColMap]   = useState({});
  const [headers,  setHeaders]  = useState([]);
  const [status,   setStatus]   = useState("");
  const [busy,     setBusy]     = useState(false);
  const fileRef = useRef();

  const onFile = e => {
    const file=e.target.files[0]; if(!file) return;
    const reader=new FileReader();
    reader.onload=ev=>{
      const wb=XLSX.read(ev.target.result,{type:"array"});
      const ws=wb.Sheets[wb.SheetNames[0]];
      const raw=XLSX.utils.sheet_to_json(ws,{header:1,defval:""});
      if(!raw.length){setStatus("파일이 비어 있습니다.");return;}
      const hdrs=raw[0].map(h=>String(h).trim());
      setHeaders(hdrs);
      const auto={};
      hdrs.forEach(h=>{const k=SAP_ALIAS[h]||SAP_ALIAS[h.toLowerCase()]; if(k)auto[k]=h;});
      setColMap(auto);
      setPreview(raw.slice(1).filter(r=>r.some(c=>c!=="")).map(r=>{const o={};hdrs.forEach((h,i)=>o[h]=r[i]);return o;}));
      setStatus("");
    };
    reader.readAsArrayBuffer(file);
  };

  const applyMap = async () => {
    const missing=SAP_FIELDS.filter(f=>f.required&&!colMap[f.key]);
    if(missing.length){setStatus(`필수 컬럼 매핑 필요: ${missing.map(f=>f.label).join(", ")}`);return;}
    setBusy(true);
    const rows=preview.map(r=>{
      const o={};
      SAP_FIELDS.forEach(f=>{if(colMap[f.key])o[f.key]=r[colMap[f.key]]??"";});
      return o;
    }).filter(r=>r.store_code&&r.month);

    // upsert by (store_code, month) — 중복 업로드 시 덮어씀
    const {error} = await sb.from("sap_data").upsert(rows, {onConflict:"store_code,month"});
    setBusy(false);
    if(error){setStatus("업로드 실패: "+error.message);return;}
    setStatus(`✓ ${rows.length}행 업로드 완료`);
    setPreview(null);setHeaders([]);setColMap({});
    if(fileRef.current)fileRef.current.value="";
    onDone();
  };

  const downloadTemplate = () => {
    const cols=["매장코드","국가","매장명","월","매출","입점객","달성율","저품율"];
    const sample=[["KR_STORE_01","KR","GM_서울 루쿠스노바에 서울","2025-03",158000000,3200,92.5,1.2]];
    const ws=XLSX.utils.aoa_to_sheet([cols,...sample]);
    ws["!cols"]=cols.map(()=>({wch:16}));
    const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,"SAP_Data");
    XLSX.writeFile(wb,"SAP_업로드_템플릿.xlsx");
  };

  return (
    <div style={{maxWidth:700}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <p style={{fontSize:13,color:"var(--color-text-secondary)",margin:0}}>
          SAP 엑셀을 업로드하면 <strong>매장코드 기준</strong>으로 자동 매핑됩니다. 중복 업로드 시 덮어씁니다.
        </p>
        <button onClick={downloadTemplate}
          style={{fontSize:12,padding:"6px 14px",border:"0.5px solid var(--color-border-secondary)",borderRadius:"var(--border-radius-md)",background:"var(--color-background-secondary)",color:"var(--color-text-primary)",cursor:"pointer",whiteSpace:"nowrap",marginLeft:12}}>
          템플릿 다운로드
        </button>
      </div>

      <label style={{display:"block",border:"1px dashed var(--color-border-secondary)",borderRadius:"var(--border-radius-lg)",padding:"2rem",textAlign:"center",cursor:"pointer",marginBottom:14}}>
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={onFile} style={{display:"none"}}/>
        <div style={{fontSize:14,color:"var(--color-text-secondary)"}}>클릭하거나 파일을 드래그하여 업로드</div>
        <div style={{fontSize:12,color:"var(--color-text-tertiary)",marginTop:4}}>.xlsx · .xls · .csv</div>
      </label>

      {preview&&(
        <div style={{...cardStyle,marginBottom:12}}>
          <p style={{fontSize:12,fontWeight:500,color:"var(--color-text-secondary)",margin:"0 0 12px"}}>
            컬럼 매핑 <span style={{fontWeight:400,color:"var(--color-text-tertiary)"}}>({preview.length}행 인식됨)</span>
          </p>
          <div style={{display:"grid",gap:8,marginBottom:16}}>
            {SAP_FIELDS.map(f=>(
              <div key={f.key} style={{display:"grid",gridTemplateColumns:"160px 1fr",gap:12,alignItems:"center"}}>
                <span style={{fontSize:12,color:f.required?"var(--color-text-primary)":"var(--color-text-secondary)"}}>{f.label}{f.required?" *":""}</span>
                <select value={colMap[f.key]||""} onChange={e=>setColMap(p=>({...p,[f.key]:e.target.value||undefined}))}
                  style={{...inputStyle(f.required&&!colMap[f.key]),padding:"6px 10px"}}>
                  <option value="">— 매핑 안 함</option>
                  {headers.map(h=><option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            ))}
          </div>
          <div style={{overflowX:"auto",marginBottom:14}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
              <thead>
                <tr>{headers.map(h=><th key={h} style={{padding:"4px 8px",borderBottom:"0.5px solid var(--color-border-secondary)",color:"var(--color-text-secondary)",textAlign:"left",whiteSpace:"nowrap",background:"var(--color-background-secondary)"}}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {preview.slice(0,3).map((r,i)=>(
                  <tr key={i}>{headers.map(h=><td key={h} style={{padding:"4px 8px",borderBottom:"0.5px solid var(--color-border-tertiary)",color:"var(--color-text-secondary)",whiteSpace:"nowrap"}}>{String(r[h]??"")}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={applyMap} disabled={busy}
            style={btnPrimary(busy)}>
            {busy?`업로드 중...`:`${preview.length}행 Supabase에 저장`}
          </button>
        </div>
      )}

      {status&&<p style={{fontSize:13,color:status.startsWith("✓")?"var(--color-text-success)":"var(--color-text-danger)",margin:"8px 0"}}>{status}</p>}

      {sapData.length>0&&(
        <div style={{marginTop:14,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <span style={{fontSize:12,color:"var(--color-text-secondary)"}}>현재 SAP 데이터: {sapData.length}행</span>
        </div>
      )}
    </div>
  );
}

// ── HqRaw ─────────────────────────────────────────────────────────────────────
function HqRaw({ merged, subs }) {
  const [fc,setFc]=useState("ALL"); const [fm,setFm]=useState("ALL");
  const months=[...new Set(merged.map(r=>r.month).filter(Boolean))].sort();
  const countries=[...new Set(merged.map(r=>r.country).filter(Boolean))].sort();
  const rows=merged.filter(r=>(fc==="ALL"||r.country===fc)&&(fm==="ALL"||r.month===fm));

  const downloadExcel = () => {
    const wb=XLSX.utils.book_new();
    const s1h=["국가","매장코드","매장명","월","매출","입점객","달성율(%)","FT","PT","FTE","매출/FTE","입점객/FTE","제출자"];
    const s1d=rows.map(r=>[r.country||"",r.store_code||"",r.store_name||"",r.month||"",
      num(r.sales)||"",num(r.visitors)||"",r.achievement_rate||"",
      r.ft_count??"",r.pt_count??"",r.fte?parseFloat(f2(r.fte)):"",
      (r.fte&&r.sales)?Math.round(num(r.sales)/r.fte):"",
      (r.fte&&r.visitors)?parseFloat(f1(num(r.visitors)/r.fte)):"",
      r.submitter||""]);
    const ws1=XLSX.utils.aoa_to_sheet([s1h,...s1d]);
    ws1["!cols"]=s1h.map(()=>({wch:14}));
    XLSX.utils.book_append_sheet(wb,ws1,"매장별 요약");

    // 직원 상세
    const s2h=["국가","매장코드","매장명","월","성명","계약형태","계약시작일","계약종료일","계약근로시간(h/주)","비고"];
    const s2d=[];
    subs.filter(s=>(fc==="ALL"||s.country===fc)&&(fm==="ALL"||s.month===fm)).forEach(s=>{
      (s.employees||[]).forEach(e=>{
        if(!num(e.hours))return;
        s2d.push([s.country,s.store_code||"",s.store_name||"",s.month,
          e.name||"",e.type,e.contract_start||"",e.contract_end||"",num(e.hours),
          isActive(e,s.month)?"":"계약만료(제외)"]);
      });
    });
    const ws2=XLSX.utils.aoa_to_sheet([s2h,...s2d]);
    ws2["!cols"]=s2h.map(()=>({wch:16}));
    XLSX.utils.book_append_sheet(wb,ws2,"직원 상세");

    XLSX.writeFile(wb,`인력현황_${fm!=="ALL"?fm:fc!=="ALL"?fc:"전체"}.xlsx`);
  };

  const thS={fontSize:11,fontWeight:500,color:"var(--color-text-secondary)",padding:"7px 10px",
    textAlign:"left",borderBottom:"0.5px solid var(--color-border-secondary)",
    background:"var(--color-background-secondary)",whiteSpace:"nowrap"};
  const tdS=(right,bold,color)=>({padding:"8px 10px",borderBottom:"0.5px solid var(--color-border-tertiary)",
    textAlign:right?"right":"left",fontWeight:bold?500:400,fontSize:12,
    color:color||"var(--color-text-secondary)"});

  return (
    <div>
      <div style={{display:"flex",gap:10,marginBottom:12,flexWrap:"wrap",alignItems:"center"}}>
        <select value={fc} onChange={e=>setFc(e.target.value)} style={{...inputStyle(false),width:"auto",padding:"6px 10px"}}>
          <option value="ALL">전체 국가</option>
          {countries.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
        <select value={fm} onChange={e=>setFm(e.target.value)} style={{...inputStyle(false),width:"auto",padding:"6px 10px"}}>
          <option value="ALL">전체 월</option>
          {months.map(m=><option key={m} value={m}>{m}</option>)}
        </select>
        <span style={{fontSize:12,color:"var(--color-text-tertiary)",flex:1}}>{rows.length}건</span>
        {rows.length>0&&(
          <button onClick={downloadExcel}
            style={{padding:"6px 16px",fontSize:12,fontWeight:500,border:"0.5px solid var(--color-border-secondary)",borderRadius:"var(--border-radius-md)",background:"var(--color-text-primary)",color:"var(--color-background-primary)",cursor:"pointer",whiteSpace:"nowrap"}}>
            엑셀 다운로드
          </button>
        )}
      </div>

      {!rows.length
        ? <div style={{textAlign:"center",padding:"2rem",color:"var(--color-text-secondary)",fontSize:13}}>데이터가 없습니다</div>
        : (
          <div style={{overflowX:"auto",border:"0.5px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-lg)",overflow:"hidden"}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead>
                <tr>
                  {["국가","매장코드","월","매출","입점객","달성율","FT","PT","FTE","매출/FTE","입점객/FTE","제출자"].map((h,i)=>(
                    <th key={h} style={{...thS,textAlign:i<2?"left":"right"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...rows].sort((a,b)=>(b.month||"").localeCompare(a.month||"")).map((r,i)=>{
                  const sPerFte=(r.fte&&r.sales)?Math.round(num(r.sales)/r.fte):null;
                  const vPerFte=(r.fte&&r.visitors)?parseFloat(f1(num(r.visitors)/r.fte)):null;
                  return (
                    <tr key={i}>
                      <td style={tdS(false,true,"var(--color-text-primary)")}>{r.country||"—"}</td>
                      <td style={tdS(false,false)}>{r.store_code||r.store_name||"—"}</td>
                      <td style={tdS(true,false)}>{r.month||"—"}</td>
                      <td style={tdS(true,false)}>{r.sales?comma(num(r.sales)):"—"}</td>
                      <td style={tdS(true,false)}>{r.visitors?comma(num(r.visitors)):"—"}</td>
                      <td style={tdS(true,false)}>{r.achievement_rate?f1(num(r.achievement_rate))+"%":"—"}</td>
                      <td style={tdS(true,true,"#185FA5")}>{r.ft_count??"-"}</td>
                      <td style={tdS(true,true,"#854F0B")}>{r.pt_count??"-"}</td>
                      <td style={tdS(true,true,"var(--color-text-primary)")}>{r.fte?f2(r.fte):"-"}</td>
                      <td style={tdS(true,false,"#185FA5")}>{sPerFte?comma(sPerFte):"—"}</td>
                      <td style={tdS(true,false)}>{vPerFte?f1(vPerFte):"—"}</td>
                      <td style={tdS(false,false)}>{r.submitter||"—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      }
    </div>
  );
}
