const STORAGE_KEY = "cherrychat_v3";

const ping = document.getElementById("ping");

// ---------- STATE ----------
const defaultState = {
  users: {},
  currentUser: null,
  chats: {},
  stories: {},
  theme: "light"
};

let state = loadState();

function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw){
      const s = structuredClone(defaultState);
      seedDemo(s);
      saveState(s);
      return s;
    }
    return { ...structuredClone(defaultState), ...JSON.parse(raw) };
  }catch(e){
    const s = structuredClone(defaultState);
    seedDemo(s);
    saveState(s);
    return s;
  }
}

function saveState(s = state){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

function seedDemo(s){
  s.users["demo"] = {
    username:"demo",
    displayName:"Demo User",
    password:"demo",
    bio:"Welcome to CherryChat",
    status:"Online",
    avatar:null,
    gallery:[]
  };
}

// ---------- DOM HELPERS ----------
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

// ---------- AUTH ----------
$$(".auth-tab").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    $$(".auth-tab").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    const panel = btn.dataset.panel;
    $$(".auth-panel").forEach(p=>p.classList.remove("active"));
    $("#auth-panel-"+panel).classList.add("active");
  });
});

$("#btn-register").addEventListener("click", ()=>{
  const u = $("#reg-username").value.trim().toLowerCase();
  const d = $("#reg-display").value.trim() || u;
  const p = $("#reg-password").value;
  const bio = $("#reg-bio").value.trim();

  if(!u || !p){ alert("Username + password required"); return; }
  if(state.users[u]){ alert("Username exists"); return; }

  state.users[u] = {
    username:u,
    displayName:d,
    password:p,
    bio,
    status:"Online",
    avatar:null,
    gallery:[]
  };

  state.currentUser = u;
  saveState();
  enterApp();
});

$("#btn-login").addEventListener("click", ()=>{
  const u = $("#login-username").value.trim().toLowerCase();
  const p = $("#login-password").value;

  const user = state.users[u];
  if(!user || user.password !== p){
    alert("Invalid login");
    return;
  }

  state.currentUser = u;
  user.status = "Online";
  saveState();
  enterApp();
});

$("#btn-logout").addEventListener("click", ()=>{
  if(state.currentUser){
    state.users[state.currentUser].status =
