import React, { useState, useEffect, useRef } from "react";
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

// ── Custom font injection ─────────────────────────────────────────────────────
const GM_FONT_B64 = ""; // 기존 코드의 GM_FONT_B64 값은 그대로 두거나, 필요 없으면 빈 값으로 사용하세요.
(function() {
  if (document.getElementById('gm-serif-font')) return;
  const style = document.createElement('style');
  style.id = 'gm-serif-font';
  style.textContent = `@font-face { font-family: 'GMSerif'; src: url(data:font/otf;base64,${GM_FONT_B64}) format('opentype'); font-weight: normal; font-style: normal; }`;
  document.head.appendChild(style);
})();


// ── constants ─────────────────────────────────────────────────────────────────
const COUNTRIES = ["AE","AU","CA","CN","FR","GB","HK","IT","JP","MY","PH","SG","TH","TW","US"];
const STANDARD_HOURS = 40;
const STORE_MAP = {
  AE:[{code:"AE1001",name:"GM_Dubai_MALL_TDM"},{code:"AE1005",name:"GM_WH_UAE"}],
  AU:[{code:"AU1001",name:"GM_Sydney_DFS_AirportT1"},{code:"AU1002",name:"GM_Sydney_MALL_DJ"},{code:"AU1004",name:"GM_Melbourne_MALL_Chadstone"}],
  CA:[{code:"CA1001",name:"GM_Toronto_MALL_Yorkdale"},{code:"CA1002",name:"GM_WH_CANADA"}],
  CN:[{code:"CN1003",name:"GM_Beijing_MALL_SKP-S"},{code:"CN1027",name:"GM_Beijing_MALL_Taikooli"},{code:"C032",name:"GM_Changsha_MALL_IFS"},{code:"CN1029",name:"GM_Chengdu_MALL_SKP"},{code:"CN1007",name:"GM_Chengdu_MALL_Taikooli"},{code:"CN1036",name:"GM_Chongqing_MALL_MixC"},{code:"CN1030",name:"GM_Guangzhou_MALL_PC"},{code:"CN1001",name:"GM_Guangzhou_MALL_Taikoohui"},{code:"C035",name:"GM_Hangzhou_MALL_MixC"},{code:"CN1008",name:"GM_Hangzhou_MALL_Tower"},{code:"CN1011",name:"GM_Nanjing_MALL_Deji"},{code:"CN1012",name:"GM_Ningbo_DS_Hankyu"},{code:"CN1035",name:"GM_Sanya_MALL_CDF"},{code:"CN1004",name:"GM_Shanghai_HAUS NOWHERE"},{code:"CN1005",name:"GM_Shanghai_MALL_IFC"},{code:"CN1024",name:"GM_Shanghai_MALL_Taikooli"},{code:"C039",name:"GM_Shanghai_MALL_Xintiandi"},{code:"CN1009",name:"GM_Shenyang_MALL_MixC"},{code:"C036",name:"GM_Shenzhen_HAUS NOWHERE"},{code:"CN1019",name:"GM_WH_China"},{code:"CN1017",name:"GM_WS_PUYI CN"},{code:"CN1031",name:"GM_Xiamen_MALL_MixC"},{code:"CN1006",name:"GM_Xian_DS_SKP"}],
  FR:[{code:"FR1001",name:"GM_Paris_FS_Marais"}],
  GB:[{code:"GB1001",name:"GM_London_DS_Selfridges"},{code:"GB1003",name:"GM_London_SS_DSM"}],
  HK:[{code:"HK1001",name:"GM_HongKong_MALL_LG"},{code:"HK1003",name:"GM_WS_PUYI HK"},{code:"HK1004",name:"GM_HongKong_MALL_HC"},{code:"HK1005",name:"GM_WH_HongKong"}],
  IT:[{code:"IT1001",name:"GM_Milan_DS_10CC"}],
  JP:[{code:"JP1001",name:"GM_Osaka_DS_Hankyu"},{code:"JP1003",name:"GM_OFFICE_Japan"},{code:"JP1004",name:"GM_Tokyo_FS_Aoyama"},{code:"JP1005",name:"GM_WH_Japan_Maersk"},{code:"JP1007",name:"GM_Tokyo_FS_Ginza"}],
  MY:[{code:"MY1001",name:"GM_KualaLumpur_MALL_TRX"}],
  PH:[{code:"PH1001",name:"GM_Manila_MALL_Shangri-La"}],
  SG:[{code:"SG1001",name:"GM_Singapore_MALL_ION"},{code:"SG1002",name:"GM_Singapore_MALL_MBS"}],
  TH:[{code:"TH1001",name:"GM_Bangkok_MALL_EmQuartier"},{code:"TH1004",name:"GM_Bangkok_MALL_SPG"},{code:"TH1005",name:"GM_Bangkok_HAUS NOWHERE"}],
  TW:[{code:"TW1001",name:"GM_Taipei_MALL_Breeze_NanShan"},{code:"TW1003",name:"GM_WH_Taiwan"},{code:"TW1004",name:"GM_Taichung_MALL_Hanshin_IC"}],
  US:[{code:"US1001",name:"GM_LosAngeles_FS_Downtown"},{code:"US1002",name:"GM_NewYork_FS_Soho"},{code:"US1003",name:"GM_SanJose_MALL_Westfield_VF"},{code:"US1006",name:"GM_WH_USA"},{code:"US1007",name:"GM_CostaMesa_MALL_SCP"},{code:"US1008",name:"GM_NewJersey_MALL_AD"},{code:"US1009",name:"GM_Houston_MALL_Galleria"},{code:"US1010",name:"GM_NewYork_SS_DSM"},{code:"US1011",name:"GM_LosAngeles_SS_DSM"},{code:"US1013",name:"GM_LasVegas_MALL_TFS"},{code:"US1015",name:"GM_OFFICE_USA"},{code:"US1016",name:"GM_PS_USA"},{code:"US1017",name:"GM_RX_USA"},{code:"US1018",name:"GM_LOST_USA"}],
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
// ── employee constants ───────────────────────────────────────────────────────
const JOB_TITLES = [
  "CR",
  "STORE MANAGER",
  "ASSISTANT STORE MANAGER",
  "SALES SUPERVISOR",
  "SALES ASSOCIATE",
];

const emptyEmp = (id = Date.now()) => ({
  id,
  brand: "GM",
  name: "",
  type: "FT",
  job_title: "",
  contract_start: "",
  contract_end: "",
  hours: "",
});

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

// ── i18n ─────────────────────────────────────────────────────────────────────
const getLang = () => {
  const l = (navigator.language || "en").toLowerCase();
  if (l.startsWith("ko")) return "ko";
  if (l.startsWith("ja")) return "ja";
  if (l.startsWith("zh")) return "zh";
  return "en";
};

const T = {
  en: {
    title_sub: "GLOBAL STORE FTE",
    login_hint: "If you don't have an invited account, please contact your HQ administrator.",
    email: "E-mail", password: "Password", login_btn: "LOG IN",
    login_fail: "Login failed: ", login_loading: "Signing in...",
    no_profile: "Profile not configured. Please contact your HQ administrator.",
    logout: "Log out",
    page_title: "Monthly Headcount Input",
    page_desc: "Please update and submit any headcount changes as of the monthly closing date.\nEven if there are no changes, please review and submit.",
    basic_info: "Basic Information",
    store: "Store", store_ph: "Search store name or code...",
    closing_month: "Closing Month", select: "Select",
    submitter: "Submitted by", submitter_ph: "Your name",
    emp_section: "Employee Contract Hours · h/week",
    template_dl: "Download Template", excel_ul: "Upload Excel", add_row: "+ Add Row",
    col_name: "Full Name", col_type: "Type", col_start: "Contract Start", col_end: "Contract End", col_hours: "Contract Hours (h/wk)",
    expired_tag: "Expired",
    summary_title: "Auto Summary", summary_sub: "Active employees as of closing month",
    ft_count: "FT", pt_count: "PT", total: "Total", ft_avg: "FT Avg h", pt_avg: "PT Avg h",
    expired_msg: (n) => `${n} employee(s) excluded — contract ended before closing month`,
    fte_label: "FTE", fte_sub: (h,s) => `Total ${h}h ÷ ${s}h`,
    err_basic: "Please fill in all required fields.",
    err_emp: "Please enter at least one employee's hours.",
    err_save: "Save failed: ",
    submit_btn: "Submit", submit_ok: "✓ Submitted", submit_loading: "Saving...",
    history_title: (c,n) => `${c} Submission History (${n})`,
    hq_title: "HQ Dashboard", hq_sub: (s,d) => `${s} submissions · ${d} SAP rows`,
    refresh: "↻ Refresh",
    tab_dashboard: "Dashboard", tab_input: "Data Input", tab_upload: "Monthly Sales", tab_raw: "Data", tab_users: "Users",
    loading: "Loading...", no_data: "No data yet.",
    invite_title: "Create New Account",
    inv_email: "Email *", inv_pw: "Password *", inv_role: "Role *", inv_country: "Country",
    role_store: "Store Manager", role_hq: "HQ (Full Access)",
    role_hr: "HR", role_cr: "CR Manager",
    inv_btn: "Create Account", inv_loading: "Creating...",
    inv_hint: "Share the password separately after creation.",
    inv_err_fields: "Please enter email and password.",
    inv_err_country: "Please select a country.",
    users_list: (n) => `Registered Users (${n})`,
    col_email: "Email", col_role: "Role", col_country_h: "Country", col_change: "Change",
    hq_badge: "HQ", store_badge: "Store",
    sap_desc: "Upload monthly sales & visitors by store code. Duplicate uploads will overwrite.",
    sap_dl: "Download Template", sap_ul_btn: (n) => `Import ${n} rows to Supabase`,
    sap_uploading: "Uploading...", sap_current: (n) => `Current SAP data: ${n} rows`,
    sap_reset: "Reset All", col_map: "Column Mapping",
    preview: (n) => `Preview (${n} rows detected)`,
    map_none: "— No mapping",
    filter_all_c: "All Countries", filter_all_m: "All Months",
    dl_excel: "Download Excel",
    closed_badge: "Expired (excluded)",
  },
  ko: {
    title_sub: "GLOBAL STORE FTE",
    login_hint: "초대받은 이메일 계정이 없으면 HQ 관리자에게 계정 발급을 요청하세요.",
    email: "이메일", password: "비밀번호", login_btn: "로그인",
    login_fail: "로그인 실패: ", login_loading: "로그인 중...",
    no_profile: "프로필이 설정되지 않았습니다. HQ 관리자에게 문의하세요.",
    logout: "로그아웃",
    page_title: "월 마감 인력 입력",
    page_desc: "매월 마감일 기준 인력 변동 사항을 반영하여 제출해 주세요.\n변동이 없는 경우에도 내용을 확인한 후 반드시 제출해 주시기 바랍니다.",
    basic_info: "기본 정보",
    store: "매장", store_ph: "매장명 또는 코드 검색...",
    closing_month: "마감 월", select: "선택",
    submitter: "제출자", submitter_ph: "이름",
    emp_section: "직원별 계약 근로시간 · h/주",
    template_dl: "템플릿 다운로드", excel_ul: "엑셀 업로드", add_row: "+ 행 추가",
    col_name: "성명", col_type: "구분", col_start: "계약 시작일", col_end: "계약 종료일", col_hours: "계약 근로시간 (h/주)",
    expired_tag: "만료",
    summary_title: "자동 요약", summary_sub: "마감월 기준 재직자만 집계",
    ft_count: "FT 인원", pt_count: "PT 인원", total: "총 인원", ft_avg: "FT 평균", pt_avg: "PT 평균",
    expired_msg: (n) => `계약 만료 ${n}명 — 마감월 이전 종료, 집계 제외`,
    fte_label: "FTE 환산", fte_sub: (h,s) => `총 ${h}h ÷ ${s}h`,
    err_basic: "기본 정보를 모두 입력해주세요.",
    err_emp: "근로시간을 최소 1행 입력해주세요.",
    err_save: "저장 실패: ",
    submit_btn: "제출하기", submit_ok: "✓ 저장되었습니다", submit_loading: "저장 중...",
    history_title: (c,n) => `${c} 제출 이력 (${n}건)`,
    hq_title: "HQ 대시보드", hq_sub: (s,d) => `인력 제출 ${s}건 · SAP ${d}행`,
    refresh: "↻ 새로고침",
    tab_dashboard: "대시보드", tab_input: "데이터 입력", tab_upload: "매출 업로드", tab_raw: "원본 데이터", tab_users: "사용자 관리",
    loading: "로딩 중...", no_data: "아직 수집된 데이터가 없습니다.",
    invite_title: "신규 계정 발급",
    inv_email: "이메일 *", inv_pw: "비밀번호 *", inv_role: "역할 *", inv_country: "담당 국가",
    role_store: "스토어 매니저", role_hq: "HQ (전체 조회)",
    role_hr: "HR", role_cr: "CR 매니저",
    inv_btn: "계정 생성", inv_loading: "생성 중...",
    inv_hint: "생성 후 해당 이메일로 비밀번호를 별도 공유하세요.",
    inv_err_fields: "이메일과 비밀번호를 입력하세요.",
    inv_err_country: "국가를 선택하세요.",
    users_list: (n) => `등록된 사용자 (${n}명)`,
    col_email: "이메일", col_role: "역할", col_country_h: "담당 국가", col_change: "변경",
    hq_badge: "HQ", store_badge: "매장",
    sap_desc: "매장별 월 매출·입점객 데이터를 업로드하세요. 중복 업로드 시 덮어씁니다.",
    sap_dl: "템플릿 다운로드", sap_ul_btn: (n) => `${n}행 Supabase에 저장`,
    sap_uploading: "업로드 중...", sap_current: (n) => `현재 SAP 데이터: ${n}행`,
    sap_reset: "전체 초기화", col_map: "컬럼 매핑",
    preview: (n) => `미리보기 (${n}행 인식됨)`,
    map_none: "— 매핑 안 함",
    filter_all_c: "전체 국가", filter_all_m: "전체 월",
    dl_excel: "엑셀 다운로드",
    closed_badge: "계약만료(제외)",
  },
  ja: {
    title_sub: "GLOBAL STORE FTE",
    login_hint: "招待されたメールアカウントがない場合は、HQ管理者にアカウント発行をご依頼ください。",
    email: "メールアドレス", password: "パスワード", login_btn: "ログイン",
    login_fail: "ログイン失敗: ", login_loading: "ログイン中...",
    no_profile: "プロフィールが未設定です。HQ管理者にお問い合わせください。",
    logout: "ログアウト",
    page_title: "月次人員入力",
    page_desc: "月次締め日基準で人員変動を反映してご提出ください。\n変動がない場合も、内容を確認の上、必ずご提出ください。",
    basic_info: "基本情報",
    store: "店舗", store_ph: "店舗名またはコードで検索...",
    closing_month: "締め月", select: "選択",
    submitter: "提出者", submitter_ph: "お名前",
    emp_section: "従業員別契約労働時間 · h/週",
    template_dl: "テンプレートDL", excel_ul: "Excelアップロード", add_row: "+ 行追加",
    col_name: "氏名", col_type: "区分", col_start: "契約開始日", col_end: "契約終了日", col_hours: "契約労働時間 (h/週)",
    expired_tag: "満了",
    summary_title: "自動集計", summary_sub: "締め月基準の在籍者のみ",
    ft_count: "FT人数", pt_count: "PT人数", total: "合計", ft_avg: "FT平均h", pt_avg: "PT平均h",
    expired_msg: (n) => `契約満了${n}名 — 締め月以前に終了、集計除外`,
    fte_label: "FTE換算", fte_sub: (h,s) => `合計${h}h ÷ ${s}h`,
    err_basic: "基本情報をすべて入力してください。",
    err_emp: "最低1行の労働時間を入力してください。",
    err_save: "保存失敗: ",
    submit_btn: "提出する", submit_ok: "✓ 保存しました", submit_loading: "保存中...",
    history_title: (c,n) => `${c} 提出履歴 (${n}件)`,
    hq_title: "HQダッシュボード", hq_sub: (s,d) => `人員提出 ${s}件 · SAP ${d}行`,
    refresh: "↻ 更新",
    tab_dashboard: "ダッシュボード", tab_input: "データ入力", tab_upload: "売上アップロード", tab_raw: "データ", tab_users: "ユーザー管理",
    loading: "読み込み中...", no_data: "データがありません。",
    invite_title: "新規アカウント発行",
    inv_email: "メール *", inv_pw: "パスワード *", inv_role: "役割 *", inv_country: "担当国",
    role_store: "ストアマネージャー", role_hq: "HQ（全体閲覧）",
    role_hr: "HR", role_cr: "CRマネージャー",
    inv_btn: "アカウント作成", inv_loading: "作成中...",
    inv_hint: "作成後、パスワードを別途共有してください。",
    inv_err_fields: "メールとパスワードを入力してください。",
    inv_err_country: "国を選択してください。",
    users_list: (n) => `登録ユーザー (${n}名)`,
    col_email: "メール", col_role: "役割", col_country_h: "担当国", col_change: "変更",
    hq_badge: "HQ", store_badge: "店舗",
    sap_desc: "店舗別の月次売上・来店数データをアップロードしてください。重複アップロードは上書きされます。",
    sap_dl: "テンプレートDL", sap_ul_btn: (n) => `${n}行をSupabaseに保存`,
    sap_uploading: "アップロード中...", sap_current: (n) => `現在のSAPデータ: ${n}行`,
    sap_reset: "全初期化", col_map: "カラムマッピング",
    preview: (n) => `プレビュー (${n}行認識)`,
    map_none: "— マッピングなし",
    filter_all_c: "全国", filter_all_m: "全月",
    dl_excel: "Excelダウンロード",
    closed_badge: "契約満了(除外)",
  },
  zh: {
    title_sub: "GLOBAL STORE FTE",
    login_hint: "如果没有受邀的邮箱账号，请向HQ管理员申请账号。",
    email: "邮箱", password: "密码", login_btn: "登录",
    login_fail: "登录失败: ", login_loading: "登录中...",
    no_profile: "未配置用户信息，请联系HQ管理员。",
    logout: "退出登录",
    page_title: "月度人员录入",
    page_desc: "请根据月度截止日期更新并提交人员变动情况。\n即使无变动，也请确认内容后提交。",
    basic_info: "基本信息",
    store: "门店", store_ph: "搜索门店名称或代码...",
    closing_month: "截止月份", select: "请选择",
    submitter: "提交人", submitter_ph: "姓名",
    emp_section: "员工合同工时 · h/周",
    template_dl: "下载模板", excel_ul: "上传Excel", add_row: "+ 添加行",
    col_name: "姓名", col_type: "类型", col_start: "合同开始日", col_end: "合同结束日", col_hours: "合同工时 (h/周)",
    expired_tag: "已到期",
    summary_title: "自动汇总", summary_sub: "仅统计截止月在职员工",
    ft_count: "全职人数", pt_count: "兼职人数", total: "总人数", ft_avg: "全职均h", pt_avg: "兼职均h",
    expired_msg: (n) => `${n}名员工已排除 — 合同在截止月前结束`,
    fte_label: "FTE换算", fte_sub: (h,s) => `总计${h}h ÷ ${s}h`,
    err_basic: "请填写所有必填项。",
    err_emp: "请至少输入一行工时。",
    err_save: "保存失败: ",
    submit_btn: "提交", submit_ok: "✓ 已保存", submit_loading: "保存中...",
    history_title: (c,n) => `${c} 提交记录 (${n}条)`,
    hq_title: "HQ 总览", hq_sub: (s,d) => `人员提交 ${s}条 · SAP ${d}行`,
    refresh: "↻ 刷新",
    tab_dashboard: "概览", tab_input: "数据录入", tab_upload: "销售上传", tab_raw: "原始数据", tab_users: "用户管理",
    loading: "加载中...", no_data: "暂无数据。",
    invite_title: "创建新账号",
    inv_email: "邮箱 *", inv_pw: "密码 *", inv_role: "角色 *", inv_country: "负责国家",
    role_store: "店长", role_hq: "HQ（全局访问）",
    role_hr: "HR", role_cr: "CR经理",
    inv_btn: "创建账号", inv_loading: "创建中...",
    inv_hint: "创建后请单独告知密码。",
    inv_err_fields: "请输入邮箱和密码。",
    inv_err_country: "请选择国家。",
    users_list: (n) => `已注册用户 (${n}人)`,
    col_email: "邮箱", col_role: "角色", col_country_h: "负责国家", col_change: "修改",
    hq_badge: "HQ", store_badge: "门店",
    sap_desc: "请上传各门店月度销售额及入店客数数据。重复上传将覆盖。",
    sap_dl: "下载模板", sap_ul_btn: (n) => `将${n}行导入Supabase`,
    sap_uploading: "上传中...", sap_current: (n) => `当前SAP数据: ${n}行`,
    sap_reset: "全部重置", col_map: "列映射",
    preview: (n) => `预览 (识别${n}行)`,
    map_none: "— 不映射",
    filter_all_c: "全部国家", filter_all_m: "全部月份",
    dl_excel: "下载Excel",
    closed_badge: "合同已到期(已排除)",
  },
};

const useT = (lang) => T[lang] || T.en;

const LANG_OPTIONS = [
  {code:"en", label:"EN"},
  {code:"ko", label:"한"},
  {code:"ja", label:"JP"},
  {code:"zh", label:"中"},
];

function LangSelector({ lang, setLang }) {
  return (
    <div style={{display:"flex",gap:4}}>
      {LANG_OPTIONS.map(l=>(
        <button key={l.code} type="button" onClick={()=>setLang(l.code)}
          style={{padding:"3px 8px",fontSize:11,fontWeight:lang===l.code?600:400,cursor:"pointer",
            border:`0.5px solid ${lang===l.code?"var(--color-border-primary)":"var(--color-border-tertiary)"}`,
            borderRadius:"var(--border-radius-md)",
            background:lang===l.code?"var(--color-text-primary)":"transparent",
            color:lang===l.code?"var(--color-background-primary)":"var(--color-text-tertiary)"}}>
          {l.label}
        </button>
      ))}
    </div>
  );
}
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
  const [session, setSession] = useState(undefined);
  const [profile, setProfile] = useState(null);
  const [lang,    setLang]    = useState(getLang());

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
      <p style={{fontSize:13,color:"var(--color-text-secondary)"}}>{(T[lang]||T.en).loading}</p>
    </div>
  );
  if (!session) return <LoginScreen lang={lang} setLang={setLang}/>;
  if (!profile)  return <NoProfileScreen lang={lang} setLang={setLang}/>;
  if (profile.role === "hq") return <HqView profile={profile} lang={lang} setLang={setLang}/>;
  return <StoreView profile={profile} lang={lang} setLang={setLang}/>;
}

const getLocalizedHint = () => (T[getLang()]||T.en).login_hint;
function LoginScreen({ lang, setLang }) {
  const t = useT(lang);
  const [email, setEmail] = useState("");
  const [pw,    setPw]    = useState("");
  const [err,   setErr]   = useState("");
  const [busy,  setBusy]  = useState(false);

  const login = async () => {
    if (!email || !pw) { setErr(t.err_basic); return; }
    setBusy(true); setErr("");
    const {error} = await sb.auth.signInWithPassword({email, password:pw});
    if (error) { setErr(t.login_fail + error.message); setBusy(false); }
  };

  const fieldStyle = { display:"grid", gridTemplateColumns:"120px 1fr", alignItems:"center", borderBottom:"0.5px solid var(--color-border-tertiary)", padding:"14px 0" };
  const labelStyle = {fontSize:14,color:"var(--color-text-primary)",fontWeight:400};
  const inpStyle   = {border:"none",outline:"none",fontSize:14,background:"transparent",color:"var(--color-text-primary)",width:"100%"};

  return (
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"flex-start",paddingTop:"12vh",padding:"12vh 1rem 2rem"}}>
      <div style={{position:"absolute",top:"1.5rem",right:"1.5rem"}}>
        <LangSelector lang={lang} setLang={setLang}/>
      </div>
      <div style={{textAlign:"center",marginBottom:"4rem"}}>
        <p style={{fontFamily:"'GMSerif', serif",fontSize:52,fontWeight:400,margin:"0 0 14px",color:"var(--color-text-primary)",letterSpacing:"0.04em",lineHeight:1}}>IICOMBINED</p>
        <p style={{fontSize:13,fontWeight:400,margin:0,color:"var(--color-text-primary)",letterSpacing:"0.2em"}}>{t.title_sub}</p>
      </div>
      <div style={{width:"100%",maxWidth:420}}>
        <div style={fieldStyle}>
          <span style={labelStyle}>{t.email}</span>
          <input value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&login()} type="email" placeholder="name@company.com" style={inpStyle}/>
        </div>
        <div style={fieldStyle}>
          <span style={labelStyle}>{t.password}</span>
          <input value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&login()} type="password" placeholder="••••••••" style={inpStyle}/>
        </div>
        {err&&<p style={{fontSize:12,color:"var(--color-text-danger)",margin:"12px 0 0",textAlign:"center"}}>{err}</p>}
        <div style={{textAlign:"center",marginTop:"3rem"}}>
          <button onClick={login} disabled={busy} style={{border:"none",background:"none",fontSize:14,fontWeight:400,letterSpacing:"0.15em",cursor:busy?"default":"pointer",color:"var(--color-text-primary)",padding:"8px 0"}}>
            {busy?"...":t.login_btn}
          </button>
        </div>
        <p style={{fontSize:12,color:"var(--color-text-tertiary)",textAlign:"center",margin:"2rem 0 0",letterSpacing:"0.02em"}}>{t.login_hint}</p>
      </div>
    </div>
  );
}

function NoProfileScreen({ lang, setLang }) {
  const t = useT(lang);
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"60vh",flexDirection:"column",gap:12}}>
      <div style={{position:"absolute",top:"1.5rem",right:"1.5rem"}}><LangSelector lang={lang} setLang={setLang}/></div>
      <p style={{fontSize:14,color:"var(--color-text-secondary)"}}>{t.no_profile}</p>
      <button onClick={()=>sb.auth.signOut()} style={{fontSize:13,color:"var(--color-text-secondary)",background:"none",border:"none",cursor:"pointer"}}>{t.logout}</button>
    </div>
  );
}

function StoreView({ profile, lang, setLang, isHqMode=false, onSubmitDone }) {
  const t = useT(lang);
  const blank = () => ({store_code:"", store_name:"", month:"", submitter:""});
  const [info,       setInfo]      = useState(blank());
  const [inputFocus, setInputFocus] = useState(false);
  const [emps,  setEmps]  = useState([emptyEmp(1)]);
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
  const addRow = () => setEmps(p=>[...p,emptyEmp()]);
  const delRow = id => setEmps(p=>p.filter(e=>e.id!==id));
  const editRow = (id,k,v) => setEmps(p=>p.map(e=>e.id===id?{...e,[k]:v}:e));
  const summary = calcSummary(emps, info.month);

  const submit = async () => {
    if (!info.store_name||!info.month||!info.submitter) { setErr("기본 정보를 모두 입력해주세요."); return; }

    const validEmps = emps.filter(e =>
      e.brand || e.name || e.type || e.job_title || e.contract_start || e.contract_end || e.hours
    );

    if (!validEmps.length) {
      setErr("직원 정보를 최소 1행 입력해주세요.");
      return;
    }

    const hasInvalidRequired = validEmps.some(e =>
      !e.brand || !e.name || !e.type || !e.job_title || !e.contract_start || !e.hours || num(e.hours) <= 0
    );

    if (hasInvalidRequired) {
      setErr("계약 종료일을 제외한 모든 직원 정보는 필수값입니다.");
      return;
    }

    setErr(""); setBusy(true);
    const sc = info.store_code || (STORE_MAP[profile.country]||[]).find(s=>s.name===info.store_name)?.code || info.store_name;
    const {error} = await sb.from("submissions").insert({
      store_code: sc, store_name: info.store_name,
      country: profile.country, month: info.month,
      brand: validEmps[0]?.brand || "GM",
      submitter: info.submitter, employees: validEmps,
    });
    setBusy(false);
    if (error) { setErr("저장 실패: " + error.message); return; }
    setInfo(blank());
    setEmps([emptyEmp(1)]);
    setSaved(true); setTimeout(()=>setSaved(false),3000);
    loadSubs();
  };

  // country가 없으면 전체 매장에서 검색
  const allStores = STORE_MAP[profile.country] || Object.values(STORE_MAP).flat();
  const storeMatches = (() => {
    const q = (info.store_name||"").toLowerCase().trim();
    if (!q) return allStores;
    return allStores.filter(s=>
      s.name.toLowerCase().includes(q) ||
      s.code.toLowerCase().includes(q)
    );
  })();
  const isExactMatch = allStores.some(s=>s.name===info.store_name);
  const showDropdown = inputFocus && storeMatches.length > 0 && !isExactMatch;

  // 매장코드 → 국가 자동 매핑 헬퍼
  const getCountryByStoreCode = (code) => {
    for (const [country, stores] of Object.entries(STORE_MAP)) {
      if (stores.some(s=>s.code===code)) return country;
    }
    return profile.country || "";
  };

  const thStyle = {fontSize:11,fontWeight:500,color:"var(--color-text-secondary)",
    padding:"7px 8px",textAlign:"left",borderBottom:"0.5px solid var(--color-border-secondary)",
    background:"var(--color-background-secondary)",whiteSpace:"nowrap"};
  const tdBase = {padding:"6px 6px",borderBottom:"0.5px solid var(--color-border-tertiary)"};

  return (
    <div style={{maxWidth:760,margin:"0 auto",padding:"1.5rem 1rem"}}>
      {/* 상단 우측: 이메일 + 로그아웃 (HQ 모드에서는 숨김) */}
      {!isHqMode && <div style={{display:"flex",justifyContent:"flex-end",alignItems:"center",gap:16,marginBottom:"2rem"}}>
        <span style={{fontSize:12,color:"var(--color-text-secondary)"}}>{profile.email}</span>
        <LangSelector lang={lang} setLang={setLang}/>
        <button onClick={()=>sb.auth.signOut()}
          style={{fontSize:12,color:"var(--color-text-tertiary)",background:"none",border:"0.5px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-md)",padding:"4px 12px",cursor:"pointer"}}>
          {t.logout}
        </button>
      </div>}
      <div style={{marginBottom:"1.5rem"}}>
        <p style={{fontSize:20,fontWeight:500,margin:"0 0 8px",color:"var(--color-text-primary)"}}>{t.page_title}</p>
        <p style={{fontSize:13,color:"var(--color-text-secondary)",margin:0,lineHeight:1.7,maxWidth:580}}>
          {t.page_desc.split("\n").map((l,i)=><React.Fragment key={i}>{l}{i===0&&<br/>}</React.Fragment>)}
        </p>
      </div>

      {/* 기본 정보 */}
      <div style={{...cardStyle, marginBottom:10}}>
        <p style={{fontSize:12,fontWeight:500,color:"var(--color-text-secondary)",margin:"0 0 12px"}}>{t.basic_info}</p>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
          <div style={{position:"relative"}}>
            <label style={{fontSize:11,color:"var(--color-text-secondary)",display:"block",marginBottom:4}}>{t.store} *</label>
            <input
              value={info.store_name}
              onChange={e=>{ si("store_name",e.target.value); si("store_code",""); }}
              onFocus={()=>setInputFocus(true)}
              onBlur={()=>setTimeout(()=>setInputFocus(false),200)}
              placeholder={t.store_ph}
              style={{...inputStyle(false),padding:"7px 10px"}}
              autoComplete="off"
            />
            {showDropdown && (
              <div style={{position:"absolute",top:"100%",left:0,right:0,zIndex:1000,background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-secondary)",borderRadius:"var(--border-radius-md)",boxShadow:"0 4px 12px rgba(0,0,0,0.12)",marginTop:2,maxHeight:220,overflowY:"auto"}}>
                {storeMatches.map(s=>(
                  <div key={s.code}
                    onMouseDown={e=>{ e.preventDefault(); si("store_name",s.name); si("store_code",s.code); setInputFocus(false); }}
                    style={{padding:"9px 12px",fontSize:13,cursor:"pointer",borderBottom:"0.5px solid var(--color-border-tertiary)",display:"flex",justifyContent:"space-between",alignItems:"center"}}
                    onMouseEnter={e=>e.currentTarget.style.background="var(--color-background-secondary)"}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <span style={{color:"var(--color-text-primary)"}}>{s.name}</span>
                    <span style={{fontSize:11,color:"var(--color-text-tertiary)",marginLeft:8,flexShrink:0}}>{s.code}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <label style={{fontSize:11,color:"var(--color-text-secondary)",display:"block",marginBottom:4}}>{t.closing_month} *</label>
            <select value={info.month} onChange={e=>si("month",e.target.value)} style={{...inputStyle(false),padding:"7px 10px"}}>
              <option value="">{t.select}</option>
              {MONTHS.map(m=><option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label style={{fontSize:11,color:"var(--color-text-secondary)",display:"block",marginBottom:4}}>{t.submitter} *</label>
          <input value={info.submitter} onChange={e=>si("submitter",e.target.value)} placeholder={t.submitter_ph} style={inputStyle(false)}/>
        </div>
      </div>

      {/* 직원 테이블 */}
      <div style={{...cardStyle, marginBottom:10}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <p style={{fontSize:12,fontWeight:500,color:"var(--color-text-secondary)",margin:0}}>
            {t.emp_section}
          </p>
          <div style={{display:"flex",gap:8}}>
            <button type="button" onClick={()=>{
              const stores = STORE_MAP[profile.country]||[];
              const cols=["브랜드","매장코드","매장명","성명","구분(FT/PT)","직책","계약 시작일(YYYY-MM-DD)","계약 종료일(YYYY-MM-DD)","계약 근로시간(h/주)"];
              const sample = stores.flatMap(s=>[
                ["GM", s.code, s.name, "Hong Gil-dong", "FT", "SALES ASSOCIATE", "2024-01-01", "", "40"],
                ["GM", s.code, s.name, "Kim Young-hee", "PT", "SALES ASSOCIATE", "2023-06-01", "2025-12-31", "20"],
              ]);
              const ws=XLSX.utils.aoa_to_sheet([cols,...sample]);
              ws["!cols"]=cols.map(()=>({wch:26}));
              const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,"직원명부");
              XLSX.writeFile(wb,`Employee_Roster_${profile.country}_Template.xlsx`);
            }} style={{fontSize:11,padding:"5px 12px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-secondary)",background:"var(--color-background-secondary)",color:"var(--color-text-secondary)",cursor:"pointer"}}>
              템플릿 다운로드
            </button>
            <label style={{fontSize:11,padding:"5px 12px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-secondary)",background:"var(--color-background-secondary)",color:"var(--color-text-primary)",cursor:"pointer"}}>
              엑셀 업로드
              <input type="file" accept=".xlsx,.xls,.csv" style={{display:"none"}} onChange={async ev=>{
                const file=ev.target.files[0]; if(!file) return;
                const reader=new FileReader();
                reader.onload=async e=>{
                  const wb=XLSX.read(e.target.result,{type:"array"});
                  const ws=wb.Sheets[wb.SheetNames[0]];
                  const raw=XLSX.utils.sheet_to_json(ws,{header:1,defval:""});
                  if(raw.length<2) return;
                  const hdrs=raw[0].map(h=>String(h).trim());
                  const hasStoreCol = hdrs[0].includes("매장코드")||hdrs[0].includes("code");
                  const month = info.month;
                  const submitter = info.submitter;

                  if(hasStoreCol) {
                    if(!month||!submitter){ alert(t.err_basic); return; }
                    const rows = raw.slice(1).filter(r=>r[0]||r[1]||r[2]);
                    const byStore = {};
                    rows.forEach((r,i)=>{
                      // brand, store_code, store_name, name, type, start, end, hours
                      const brand = String(r[0]||"GM").trim();
                      const sc = String(r[1]||"").trim();
                      const sname = String(r[2]||"").trim() || sc;
                      if(!sc) return;
                      const autoCountry = getCountryByStoreCode(sc);
                      if(!byStore[sc]) byStore[sc]={store_code:sc, store_name:sname, brand, country:autoCountry, emps:[]};
                      if(r[3]) byStore[sc].emps.push({
                        id:Date.now()+i,
                        brand: String(r[0]||"GM").trim(),
                        name:String(r[3]||"").trim(),
                        type:String(r[4]||"FT").trim().toUpperCase()==="PT"?"PT":"FT",
                        job_title:String(r[5]||"").trim(),
                        contract_start:String(r[6]||"").trim(),
                        contract_end:String(r[7]||"").trim(),
                        hours:String(r[8]||"").trim(),
                      });
                    });
                    setBusy(true);
                    for(const [sc, data] of Object.entries(byStore)) {
                      await sb.from("submissions").insert({
                        store_code:sc, store_name:data.store_name,
                        country: data.country || profile.country, month, submitter,
                        brand: data.brand || "GM",
                        employees:data.emps,
                      });
                    }
                    setBusy(false);
                    setSaved(true); setTimeout(()=>setSaved(false),3000);
                    alert(`✓ ${Object.keys(byStore).length} stores submitted`);
                    loadSubs();
                  } else {
                    const rows=raw.slice(1).filter(r=>r[0]||r[1]).map((r,i)=>({
                      id:Date.now()+i,
                      brand:String(r[0]||"GM").trim(),
                      name:String(r[1]||"").trim(),
                      type:String(r[2]||"FT").trim().toUpperCase()==="PT"?"PT":"FT",
                      job_title:String(r[3]||"").trim(),
                      contract_start:String(r[4]||"").trim(),
                      contract_end:String(r[5]||"").trim(),
                      hours:String(r[6]||"").trim(),
                    }));
                    if(rows.length) setEmps(p=>[...p.filter(e=>e.name||num(e.hours)),...rows]);
                  }
                };
                reader.readAsArrayBuffer(file);
                ev.target.value="";
              }}/>
            </label>
            <button type="button" onClick={addRow}
              style={{fontSize:12,padding:"5px 14px",borderRadius:"var(--border-radius-md)",
                border:"0.5px solid var(--color-border-secondary)",background:"var(--color-background-secondary)",
                color:"var(--color-text-primary)",cursor:"pointer"}}>
              {t.add_row}
            </button>
          </div>
        </div>

        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",tableLayout:"fixed",minWidth:560}}>
            <colgroup>
              <col style={{width:28}}/>
              <col style={{width:80}}/>
              <col style={{width:"14%"}}/>
              <col style={{width:80}}/>
              <col style={{width:170}}/>
              <col style={{width:"14%"}}/>
              <col style={{width:"14%"}}/>
              <col style={{width:120}}/>
              <col style={{width:28}}/>
            </colgroup>
            <thead>
              <tr>
                {["#","Brand",t.col_name,t.col_type,"직책",t.col_start,t.col_end,t.col_hours,""].map((h,i)=>(
                  <th key={i} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {emps.map((e,i)=>{
                const expired = info.month && e.contract_end && e.contract_end.slice(0,7) < info.month;
                return (
                  <tr key={e.id} style={{opacity:expired ? .45 : 1}}>
                    <td style={{...tdBase,fontSize:11,color:"var(--color-text-tertiary)",textAlign:"center"}}>{i+1}</td>
                    <td style={tdBase}>
                      <div style={{display:"flex",gap:3}}>
                        {["GM","TAM"].map(b=>{
                          const active = e.brand===b;
                          return (
                            <button key={b} type="button" onClick={()=>editRow(e.id,"brand",b)}
                              style={{flex:1,padding:"4px 0",fontSize:10,fontWeight:700,cursor:"pointer",
                                borderRadius:"var(--border-radius-md)",
                                border:active?"1.5px solid #1F3864":"0.5px solid #ccc",
                                background:active?"#1F3864":"transparent",
                                color:active?"#fff":"#aaa"}}>
                              {b}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                    <td style={tdBase}>
                      <input value={e.name} onChange={ev=>editRow(e.id,"name",ev.target.value)} placeholder={lang==="ko"?"홍길동":lang==="ja"?"山田太郎":lang==="zh"?"张三":"Full Name"}
                        required
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
                      <select value={e.job_title||""} onChange={ev=>editRow(e.id,"job_title",ev.target.value)} required
                        style={{width:"100%",boxSizing:"border-box",padding:"5px 7px",border:"0.5px solid var(--color-border-secondary)",borderRadius:"var(--border-radius-md)",fontSize:12,background:"var(--color-background-primary)",color:"var(--color-text-primary)"}}>
                        <option value="">선택</option>
                        {JOB_TITLES.map(j=><option key={j} value={j}>{j}</option>)}
                      </select>
                    </td>
                    <td style={tdBase}>
                      <input type="text" value={e.contract_start} onChange={ev=>editRow(e.id,"contract_start",ev.target.value)}
                        placeholder="YYYY-MM-DD"
                        style={{width:"100%",boxSizing:"border-box",padding:"5px 6px",border:"0.5px solid var(--color-border-secondary)",borderRadius:"var(--border-radius-md)",fontSize:12,background:"var(--color-background-primary)",color:"var(--color-text-primary)"}}/>
                    </td>
                    <td style={tdBase}>
                      <input type="text" value={e.contract_end} onChange={ev=>editRow(e.id,"contract_end",ev.target.value)}
                        placeholder="YYYY-MM-DD"
                        style={{width:"100%",boxSizing:"border-box",padding:"5px 6px",
                          border:`0.5px solid ${expired?"var(--color-border-danger)":"var(--color-border-secondary)"}`,
                          borderRadius:"var(--border-radius-md)",fontSize:12,
                          background:expired?"var(--color-background-danger)":"var(--color-background-primary)",
                          color:"var(--color-text-primary)"}}/>
                    </td>
                    <td style={tdBase}>
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <input type="number" min="1" max="168" value={e.hours} onChange={ev=>editRow(e.id,"hours",ev.target.value)} placeholder="40"
                          style={{flex:1,minWidth:0,padding:"5px 7px",border:"0.5px solid var(--color-border-secondary)",borderRadius:"var(--border-radius-md)",fontSize:12,background:"var(--color-background-primary)",color:"var(--color-text-primary)"}}/>
                        {expired&&<span style={{fontSize:10,color:"var(--color-text-danger)",whiteSpace:"nowrap"}}>{t.expired_tag}</span>}
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
              {t.summary_title} <span style={{fontWeight:400,color:"var(--color-text-tertiary)"}}>· {t.summary_sub}</span>
            </p>
            <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8,marginBottom:10}}>
              {[
                {label:t.ft_count, val:`${summary.ft_count}`, color:"#185FA5"},
                {label:t.pt_count, val:`${summary.pt_count}`, color:"#854F0B"},
                {label:t.total,    val:`${summary.total}`,    color:"var(--color-text-primary)"},
                {label:t.ft_avg,   val:summary.ft_count?`${f1(summary.ft_avg_h)}h`:"—", color:"var(--color-text-secondary)"},
                {label:t.pt_avg,   val:summary.pt_count?`${f1(summary.pt_avg_h)}h`:"—", color:"var(--color-text-secondary)"},
              ].map(c=>(
                <div key={c.label} style={{textAlign:"center",padding:"8px",background:"var(--color-background-primary)",borderRadius:"var(--border-radius-md)"}}>
                  <div style={{fontSize:11,color:"var(--color-text-tertiary)",marginBottom:4}}>{c.label}</div>
                  <div style={{fontSize:17,fontWeight:500,color:c.color}}>{c.val}</div>
                </div>
              ))}
            </div>
            {summary.excluded>0&&(
              <div style={{padding:"7px 12px",background:"var(--color-background-danger)",borderRadius:"var(--border-radius-md)",fontSize:12,color:"var(--color-text-danger)",marginBottom:10}}>
                {t.expired_msg(summary.excluded)}
              </div>
            )}
            <div style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:"var(--color-background-primary)",borderRadius:"var(--border-radius-md)"}}>
              <div>
                <div style={{fontSize:11,color:"var(--color-text-tertiary)"}}>{t.fte_label}</div>
                <div style={{fontSize:22,fontWeight:500,color:"var(--color-text-primary)"}}>{f2(summary.fte)}</div>
                <div style={{fontSize:10,color:"var(--color-text-tertiary)"}}>{t.fte_sub(summary.total_h, STANDARD_HOURS)}</div>
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
        {saved?t.submit_ok:busy?t.submit_loading:t.submit_btn}
      </button>

      {subs.length>0&&(
        <div>
          <p style={{fontSize:12,fontWeight:500,color:"var(--color-text-secondary)",marginBottom:10}}>{t.history_title(profile.country, subs.length)}</p>
          {subs.map(s=>{
            const sm=calcSummary(s.employees||[], s.month);
            return (
              <div key={s.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",background:"var(--color-background-secondary)",borderRadius:"var(--border-radius-md)",marginBottom:8}}>
                <div>
                  <span style={{fontSize:13,fontWeight:500,color:"var(--color-text-primary)"}}>{s.month} · {s.store_name?.split("_").slice(-1)[0]}</span>
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
function HqView({ profile, lang, setLang }) {
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

  const tl = useT(lang);
  const ts = t => ({padding:"7px 18px",fontSize:13,cursor:"pointer",border:"none",background:"none",
    borderBottom:tab===t?"2px solid var(--color-text-primary)":"2px solid transparent",
    color:tab===t?"var(--color-text-primary)":"var(--color-text-secondary)",fontWeight:tab===t?500:400});

  return (
    <div style={{maxWidth:900,margin:"0 auto",padding:"1.5rem 1rem"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.25rem"}}>
        <div>
          <p style={{fontSize:16,fontWeight:500,margin:0,color:"var(--color-text-primary)"}}>{tl.hq_title}</p>
          <p style={{fontSize:12,color:"var(--color-text-secondary)",margin:"3px 0 0"}}>
            {profile.email} · {tl.hq_sub(subs.length, sapData.length)}
          </p>
        </div>
        <div style={{display:"flex",gap:12,alignItems:"center"}}>
          <LangSelector lang={lang} setLang={setLang}/>
          <button onClick={loadAll} style={{fontSize:12,color:"var(--color-text-secondary)",background:"none",border:"none",cursor:"pointer"}}>{tl.refresh}</button>
          <button onClick={()=>sb.auth.signOut()} style={{fontSize:12,color:"var(--color-text-tertiary)",background:"none",border:"0.5px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-md)",padding:"4px 12px",cursor:"pointer"}}>{tl.logout}</button>
        </div>
      </div>

      <div style={{borderBottom:"0.5px solid var(--color-border-tertiary)",marginBottom:"1.25rem",display:"flex"}}>
        {[["dashboard",tl.tab_dashboard],["input",tl.tab_input||"Data Input"],["upload",tl.tab_upload],["raw",tl.tab_raw],["users",tl.tab_users]].map(([tv,l])=>(
          <button key={tv} style={ts(tv)} onClick={()=>setTab(tv)}>{l}</button>
        ))}
      </div>

      {loading
        ? <p style={{fontSize:13,color:"var(--color-text-secondary)",textAlign:"center",padding:"2rem"}}>{tl.loading}</p>
        : <>
            {tab==="dashboard" && <HqDashboard subs={subs} sapData={sapData} merged={merged} lang={lang}/>}
            {tab==="input"     && <HqBulkInput lang={lang} onDone={loadAll}/>}
            {tab==="upload"    && <HqUpload sapData={sapData} onDone={loadAll} lang={lang}/>}
            {tab==="raw"       && <HqRaw merged={merged} subs={subs} lang={lang}/>}
            {tab==="users"     && <HqUsers lang={lang}/>}
          </>
      }
    </div>
  );
}

// ── HqUsers ───────────────────────────────────────────────────────────────────
function HqUsers({ lang }) {
  const t = useT(lang);
  const [users,   setUsers]   = useState([]);
  const [email,   setEmail]   = useState("");
  const [country, setCountry] = useState("");
  const [role,    setRole]    = useState("hr");
  const [pw,      setPw]      = useState("");
  const [busy,    setBusy]    = useState(false);
  const [msg,     setMsg]     = useState("");
  const [loading, setLoading] = useState(true);

  const loadUsers = async () => {
    const {data} = await sb.from("profiles").select("*").order("country");
    setUsers(data??[]); setLoading(false);
  };
  useEffect(()=>{ loadUsers(); },[]);

  const invite = async () => {
    if (!email||!pw) { setMsg(t.inv_err_fields); return; }
    if (role!=="hq"&&!country) { setMsg(t.inv_err_country); return; }
    setBusy(true); setMsg("");
    const {error} = await sb.auth.signUp({
      email, password: pw,
      options:{ data:{ role, country: role==="hq"?null:country } }
    });
    if (error) { setMsg("생성 실패: "+error.message); setBusy(false); return; }
    await sb.from("profiles").upsert({
      email, role, country: role==="hq"?null:country
    }, {onConflict:"email"});
    setMsg(`✓ ${email} 계정 생성 완료`);
    setEmail(""); setPw(""); setCountry(""); setRole("hr");
    setBusy(false); loadUsers();
  };

  const updateRole = async (id, newRole, newCountry) => {
    await sb.from("profiles").update({role:newRole, country:newCountry||null}).eq("id",id);
    loadUsers();
  };

  const ss = (v) => ({padding:"7px 10px",border:"0.5px solid var(--color-border-secondary)",borderRadius:"var(--border-radius-md)",background:"var(--color-background-primary)",color:"var(--color-text-primary)",fontSize:13,width:"100%"});

  return (
    <div style={{maxWidth:700}}>
      {/* 신규 계정 생성 */}
      <div style={{background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-lg)",padding:"1.25rem",marginBottom:"1.5rem"}}>
        <p style={{fontSize:13,fontWeight:500,color:"var(--color-text-primary)",margin:"0 0 14px"}}>{t.invite_title}</p>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
          <div>
            <label style={{fontSize:11,color:"var(--color-text-secondary)",display:"block",marginBottom:4}}>{t.inv_email}</label>
            <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@company.com"
              style={{...ss(),boxSizing:"border-box"}}/>
          </div>
          <div>
            <label style={{fontSize:11,color:"var(--color-text-secondary)",display:"block",marginBottom:4}}>{t.inv_pw}</label>
            <input type="password" value={pw} onChange={e=>setPw(e.target.value)} placeholder="Initial password"
              style={{...ss(),boxSizing:"border-box"}}/>
          </div>
          <div>
            <label style={{fontSize:11,color:"var(--color-text-secondary)",display:"block",marginBottom:4}}>{t.inv_role}</label>
            <select value={role} onChange={e=>setRole(e.target.value)} style={ss()}>
              <option value="hq">{t.role_hq}</option>
              <option value="hr">{t.role_hr}</option>
              <option value="store_manager">{t.role_store}</option>
              <option value="cr_manager">{t.role_cr}</option>
            </select>
          </div>
          <div>
            <label style={{fontSize:11,color:"var(--color-text-secondary)",display:"block",marginBottom:4}}>{t.inv_country}{role!=="hq"?" *":""}</label>
            <select value={country} onChange={e=>setCountry(e.target.value)} disabled={role==="hq"} style={{...ss(),opacity:role==="hq"?0.4:1}}>
              <option value="">{role==="hq"?t.role_hq:t.select}</option>
              {COUNTRIES.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        {msg&&<p style={{fontSize:12,color:msg.startsWith("✓")?"var(--color-text-success)":"var(--color-text-danger)",margin:"0 0 10px"}}>{msg}</p>}
        <button onClick={invite} disabled={busy}
          style={{width:"100%",padding:"10px",border:"none",borderRadius:"var(--border-radius-md)",background:busy?"var(--color-border-secondary)":"var(--color-text-primary)",color:"var(--color-background-primary)",fontSize:13,fontWeight:500,cursor:busy?"default":"pointer"}}>
          {busy?t.inv_loading:t.inv_btn}
        </button>
        <p style={{fontSize:11,color:"var(--color-text-tertiary)",margin:"8px 0 0"}}>{t.inv_hint}</p>
      </div>

      <p style={{fontSize:12,fontWeight:500,color:"var(--color-text-secondary)",marginBottom:10}}>{t.users_list(users.length)}</p>
      {loading ? <p style={{fontSize:13,color:"var(--color-text-secondary)"}}>{t.loading}</p> : (
        <div style={{border:"0.5px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-lg)",overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead>
              <tr style={{background:"var(--color-background-secondary)"}}>
                {[t.col_email,t.col_role,t.col_country_h,t.col_change].map(h=>(
                  <th key={h} style={{fontSize:11,fontWeight:500,color:"var(--color-text-secondary)",padding:"7px 12px",textAlign:"left",borderBottom:"0.5px solid var(--color-border-secondary)"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(u=>(
                <tr key={u.id}>
                  <td style={{padding:"9px 12px",fontSize:12,borderBottom:"0.5px solid var(--color-border-tertiary)",color:"var(--color-text-primary)"}}>{u.email}</td>
                  <td style={{padding:"9px 12px",fontSize:12,borderBottom:"0.5px solid var(--color-border-tertiary)"}}>
                    <span style={{padding:"2px 8px",borderRadius:99,fontSize:11,fontWeight:600,
                      background:u.role==="hq"?"#E6F1FB":u.role==="hr"?"#E1F5EE":u.role==="store_manager"?"#FFF0E6":"#F0E6FF",
                      color:u.role==="hq"?"#0C447C":u.role==="hr"?"#085041":u.role==="store_manager"?"#7B3B00":"#4B0082"}}>
                      {u.role==="hq"?t.hq_badge:u.role==="hr"?t.role_hr:u.role==="store_manager"?t.role_store:t.role_cr}
                    </span>
                  </td>
                  <td style={{padding:"9px 12px",fontSize:12,borderBottom:"0.5px solid var(--color-border-tertiary)",color:"var(--color-text-secondary)"}}>{u.country||t.role_hq}</td>
                  <td style={{padding:"9px 12px",borderBottom:"0.5px solid var(--color-border-tertiary)"}}>
                    <select defaultValue={u.country||""} onChange={e=>{
                      const val=e.target.value;
                      const newRole = val==="hq"?"hq": u.role==="hq"?"hr":u.role;
                      updateRole(u.id, val==="hq"?"hq":newRole, val==="hq"?null:val);
                    }} style={{padding:"4px 8px",border:"0.5px solid var(--color-border-secondary)",borderRadius:"var(--border-radius-md)",fontSize:11,background:"var(--color-background-primary)",color:"var(--color-text-primary)"}}>
                      <option value="hq">{t.role_hq}</option>
                      {COUNTRIES.map(c=><option key={c} value={c}>{c}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── HqBulkInput ───────────────────────────────────────────────────────────────
// 국가 선택 없이 바로 템플릿 다운 → 엑셀 업로드 → 매장코드로 국가 자동 매핑
function HqBulkInput({ lang, onDone }) {
  const t = useT(lang);
  const [month,     setMonth]     = useState("");
  const [submitter, setSubmitter] = useState("");
  const [status,    setStatus]    = useState("");
  const [busy,      setBusy]      = useState(false);
  const fileRef = useRef();

  const getCountryByCode = (code) => {
    for (const [c, stores] of Object.entries(STORE_MAP)) {
      if (stores.some(s=>s.code===code)) return c;
    }
    return "";
  };

  const downloadTemplate = () => {
    const allStores = Object.values(STORE_MAP).flat();
    const cols = ["brand","store_code","store_name","name","type(FT/PT)","job_title","contract_start(YYYY-MM-DD)","contract_end(YYYY-MM-DD)","hours_per_week"];
    const sample = allStores.slice(0,3).flatMap(s=>[
      ["GM", s.code, s.name, "Full Name", "FT", "2024-01-01", "", "40"],
      ["GM", s.code, s.name, "Full Name", "PT", "2024-06-01", "2025-12-31", "20"],
    ]);
    const ws = XLSX.utils.aoa_to_sheet([cols, ...sample]);
    ws["!cols"] = cols.map(()=>({wch:22}));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Employee_Roster");
    XLSX.writeFile(wb, "Global_Employee_Roster_Template.xlsx");
  };

  const onFile = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    if (!month || !submitter) { setStatus("마감 월과 제출자를 먼저 입력하세요."); return; }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const wb = XLSX.read(ev.target.result, {type:"array"});
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json(ws, {header:1, defval:""});
      if (raw.length < 2) { setStatus("파일이 비어 있습니다."); return; }

      const rows = raw.slice(1).filter(r=>r[1]);
      const byStore = {};
      rows.forEach((r,i)=>{
        const brand   = String(r[0]||"GM").trim();
        const sc      = String(r[1]||"").trim();
        const sname   = String(r[2]||"").trim() || sc;
        const country = getCountryByCode(sc);
        if (!sc) return;
        if (!byStore[sc]) byStore[sc] = {store_code:sc, store_name:sname, brand, country, emps:[]};
        if (r[3]) byStore[sc].emps.push({
          id: Date.now()+i,
          name:  String(r[3]||"").trim(),
          type:  String(r[4]||"FT").trim().toUpperCase()==="PT"?"PT":"FT",
          brand,
          job_title:      String(r[5]||"").trim(),
          contract_start: String(r[6]||"").trim(),
          contract_end:   String(r[7]||"").trim(),
          hours:          String(r[8]||"").trim(),
        });
      });

      setBusy(true); setStatus("");
      let count = 0;
      for (const [sc, data] of Object.entries(byStore)) {
        const {error} = await sb.from("submissions").insert({
          store_code:  sc,
          store_name:  data.store_name,
          country:     data.country,
          month,
          submitter,
          brand:       data.brand || "GM",
          employees:   data.emps,
        });
        if (!error) count++;
      }
      setBusy(false);
      setStatus(`✓ ${count}개 매장 데이터 제출 완료`);
      if (fileRef.current) fileRef.current.value = "";
      onDone();
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  return (
    <div style={{maxWidth:600}}>
      <p style={{fontSize:13,color:"var(--color-text-secondary)",margin:"0 0 1.5rem"}}>
        템플릿을 다운받아 매장코드·직원정보를 입력 후 업로드하세요.<br/>
        <strong>매장코드만 있으면 국가는 자동으로 매핑됩니다.</strong>
      </p>

      {/* 마감 월 + 제출자 */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
        <div>
          <label style={{fontSize:11,color:"var(--color-text-secondary)",display:"block",marginBottom:4}}>마감 월 *</label>
          <select value={month} onChange={e=>setMonth(e.target.value)}
            style={{width:"100%",padding:"8px 10px",border:"0.5px solid var(--color-border-secondary)",borderRadius:"var(--border-radius-md)",background:"var(--color-background-primary)",color:"var(--color-text-primary)",fontSize:13}}>
            <option value="">선택</option>
            {MONTHS.map(m=><option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label style={{fontSize:11,color:"var(--color-text-secondary)",display:"block",marginBottom:4}}>제출자 *</label>
          <input value={submitter} onChange={e=>setSubmitter(e.target.value)} placeholder="이름"
            style={{width:"100%",boxSizing:"border-box",padding:"8px 10px",border:"0.5px solid var(--color-border-secondary)",borderRadius:"var(--border-radius-md)",fontSize:13,background:"var(--color-background-primary)",color:"var(--color-text-primary)"}}/>
        </div>
      </div>

      {/* 템플릿 다운로드 */}
      <button type="button" onClick={downloadTemplate}
        style={{width:"100%",padding:"10px",marginBottom:10,border:"0.5px solid var(--color-border-secondary)",borderRadius:"var(--border-radius-md)",background:"var(--color-background-secondary)",color:"var(--color-text-primary)",fontSize:13,cursor:"pointer"}}>
        ↓ Global Employee Roster Template 다운로드
      </button>

      {/* 엑셀 업로드 */}
      <label style={{display:"block",border:"1px dashed var(--color-border-secondary)",borderRadius:"var(--border-radius-lg)",padding:"2rem",textAlign:"center",cursor:"pointer"}}>
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={onFile} style={{display:"none"}}/>
        <div style={{fontSize:14,color:"var(--color-text-secondary)"}}>{busy?"업로드 중...":"클릭하거나 파일을 드래그하여 업로드"}</div>
        <div style={{fontSize:12,color:"var(--color-text-tertiary)",marginTop:4}}>.xlsx · .xls · .csv</div>
      </label>

      {status && <p style={{fontSize:13,color:status.startsWith("✓")?"var(--color-text-success)":"var(--color-text-danger)",margin:"12px 0 0"}}>{status}</p>}
    </div>
  );
}

// ── HqDashboard ───────────────────────────────────────────────────────────────
function HqDashboard({ subs, sapData, merged, lang }) {
  const t = useT(lang);
  if (!subs.length && !sapData.length) return (
    <div style={{textAlign:"center",padding:"3rem",color:"var(--color-text-secondary)",fontSize:13}}>
      {t.no_data}
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
function HqUpload({ sapData, onSaveSap, onDone, lang }) {
  const t = useT(lang);
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
      if(error){setStatus(t.err_save+error.message);return;}
    setStatus(`✓ ${rows.length} rows uploaded`);
    setPreview(null);setHeaders([]);setColMap({});
    if(fileRef.current)fileRef.current.value="";
    onDone();
  };

  const downloadTemplate = () => {
    const cols=["store_code","country","store_name","month","sales","visitors"];
    const sample=[["US1001","US","GM_NewYork_FS_Soho","2025-03",158000000,3200]];
    const ws=XLSX.utils.aoa_to_sheet([cols,...sample]);
    ws["!cols"]=cols.map(()=>({wch:18}));
    const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,"Sales_Data");
    XLSX.writeFile(wb,"Monthly_Sales_Visitors_Template.xlsx");
  };

  return (
    <div style={{maxWidth:700}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <p style={{fontSize:13,color:"var(--color-text-secondary)",margin:0}}>{t.sap_desc}</p>
        <button onClick={downloadTemplate}
          style={{fontSize:12,padding:"6px 14px",border:"0.5px solid var(--color-border-secondary)",borderRadius:"var(--border-radius-md)",background:"var(--color-background-secondary)",color:"var(--color-text-primary)",cursor:"pointer",whiteSpace:"nowrap",marginLeft:12}}>
          {t.sap_dl}
        </button>
      </div>

      <label style={{display:"block",border:"1px dashed var(--color-border-secondary)",borderRadius:"var(--border-radius-lg)",padding:"2rem",textAlign:"center",cursor:"pointer",marginBottom:14}}>
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={onFile} style={{display:"none"}}/>
        <div style={{fontSize:14,color:"var(--color-text-secondary)"}}>Click or drag file to upload</div>
        <div style={{fontSize:12,color:"var(--color-text-tertiary)",marginTop:4}}>.xlsx · .xls · .csv</div>
      </label>

      {preview&&(
        <div style={{...cardStyle,marginBottom:12}}>
          <p style={{fontSize:12,fontWeight:500,color:"var(--color-text-secondary)",margin:"0 0 12px"}}>
            {t.col_map} <span style={{fontWeight:400,color:"var(--color-text-tertiary)"}}>{t.preview(preview.length)}</span>
          </p>
          <div style={{display:"grid",gap:8,marginBottom:16}}>
            {SAP_FIELDS.map(f=>(
              <div key={f.key} style={{display:"grid",gridTemplateColumns:"160px 1fr",gap:12,alignItems:"center"}}>
                <span style={{fontSize:12,color:f.required?"var(--color-text-primary)":"var(--color-text-secondary)"}}>{f.label}{f.required?" *":""}</span>
                <select value={colMap[f.key]||""} onChange={e=>setColMap(p=>({...p,[f.key]:e.target.value||undefined}))}
                  style={{...inputStyle(f.required&&!colMap[f.key]),padding:"6px 10px"}}>
                  <option value="">{t.map_none}</option>
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
          <button onClick={applyMap} disabled={busy} style={btnPrimary(busy)}>
            {busy?t.sap_uploading:t.sap_ul_btn(preview.length)}
          </button>
        </div>
      )}

      {status&&<p style={{fontSize:13,color:status.startsWith("✓")?"var(--color-text-success)":"var(--color-text-danger)",margin:"8px 0"}}>{status}</p>}

      {sapData.length>0&&(
        <div style={{marginTop:14,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <span style={{fontSize:12,color:"var(--color-text-secondary)"}}>{t.sap_current(sapData.length)}</span>
        </div>
      )}
    </div>
  );
}

// ── HqRaw ─────────────────────────────────────────────────────────────────────
function HqRaw({ merged, subs, lang }) {
  const t = useT(lang);
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
          <option value="ALL">{t.filter_all_c}</option>
          {countries.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
        <select value={fm} onChange={e=>setFm(e.target.value)} style={{...inputStyle(false),width:"auto",padding:"6px 10px"}}>
          <option value="ALL">{t.filter_all_m}</option>
          {months.map(m=><option key={m} value={m}>{m}</option>)}
        </select>
        <span style={{fontSize:12,color:"var(--color-text-tertiary)",flex:1}}>{rows.length}</span>
        {rows.length>0&&(
          <button onClick={downloadExcel}
            style={{padding:"6px 16px",fontSize:12,fontWeight:500,border:"0.5px solid var(--color-border-secondary)",borderRadius:"var(--border-radius-md)",background:"var(--color-text-primary)",color:"var(--color-background-primary)",cursor:"pointer",whiteSpace:"nowrap"}}>
            {t.dl_excel}
          </button>
        )}
      </div>

      {!rows.length
        ? <div style={{textAlign:"center",padding:"2rem",color:"var(--color-text-secondary)",fontSize:13}}>{t.no_data}</div>
        : (
          <div style={{overflowX:"auto",border:"0.5px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-lg)",overflow:"hidden"}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead>
                <tr>
                  {["Country","Store Code","Month","Sales","Visitors","Ach. Rate","FT","PT","FTE","Sales/FTE","Visitors/FTE","Submitter"].map((h,i)=>(
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
