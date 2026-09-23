/* ===================== SYSTEM // TRAINING PROTOCOL — v3 ===================== */
const STORAGE_KEY = 'system-training-v3';

/* ---------- RANKS (E → D → C → B → A → S → MONARCA DAS SOMBRAS) ---------- */
const RANKS = [
  { id: 'E', name: 'E-RANK', min: 1, max: 9 },
  { id: 'D', name: 'D-RANK', min: 10, max: 19 },
  { id: 'C', name: 'C-RANK', min: 20, max: 29 },
  { id: 'B', name: 'B-RANK', min: 30, max: 39 },
  { id: 'A', name: 'A-RANK', min: 40, max: 59 },
  { id: 'S', name: 'S-RANK', min: 60, max: 99 },
  { id: 'MONARCH', name: 'MONARCA DAS SOMBRAS', min: 100, max: Infinity }
];
function rankIndexForLevel(level) { return RANKS.findIndex(r => level >= r.min && level <= r.max); }
function rankFor(level) { const i = rankIndexForLevel(level); return RANKS[i === -1 ? RANKS.length - 1 : i]; }

/* ---------- Daily "System Quest" — fiel ao anime, com modo ajustável ---------- */
const DIFFICULTY = {
  anime: { pushups: 100, situps: 100, squats: 100, runKm: 10 },
  realista: { pushups: 30, situps: 30, squats: 30, runKm: 2 }
};
const REP_STEP = 10;

/* Missões dinâmicas por dia — cada reset gera uma nova fila de objetivos. */
function rankMissionScale() {
  const idx = rankIndexForLevel(state.level);
  return {
    hydration: Number((0.7 + idx * 0.35).toFixed(2)),
    study: 3 + idx * 2,
    walk: Number((0.6 + idx * 0.45).toFixed(2)),
    pushups: 12 + idx * 12,
    situps: 15 + idx * 12,
    squats: 18 + idx * 14,
    stretch: 1 + Math.max(0, idx - 1),
    focus: 20 + idx * 15
  };
}

function generateDailyMissionPool() {
  const scale = rankMissionScale();
  const todaySeed = new Date().toISOString().slice(0, 10);
  const base = [
    {
      id: `daily-water-${todaySeed}`,
      name: 'Hidratação básica',
      desc: 'Beba água suficiente para manter o corpo em plena função.',
      goal: scale.hydration,
      progress: 0,
      unit: 'L',
      xp: 90,
      rewardPoints: 1,
      step: 0.25,
      kind: 'hydration',
      category: 'saúde'
    },
    {
      id: `daily-study-${todaySeed}`,
      name: 'Leitura de fortalecimento mental',
      desc: 'Leia páginas para elevar a inteligência e foco.',
      goal: scale.study,
      progress: 0,
      unit: 'pág.',
      xp: 100,
      rewardPoints: 1,
      step: 1,
      kind: 'study',
      category: 'inteligência'
    },
    {
      id: `daily-pushups-${todaySeed}`,
      name: 'Treino de força',
      desc: 'Registre flexões para reforçar o corpo.',
      goal: scale.pushups,
      progress: 0,
      unit: 'rep',
      xp: 110,
      rewardPoints: 1,
      step: 10,
      kind: 'pushups',
      category: 'treino'
    },
    {
      id: `daily-situps-${todaySeed}`,
      name: 'Treino de core',
      desc: 'Complete abdominais para aumentar resistência.',
      goal: scale.situps,
      progress: 0,
      unit: 'rep',
      xp: 110,
      rewardPoints: 1,
      step: 10,
      kind: 'situps',
      category: 'treino'
    },
    {
      id: `daily-squats-${todaySeed}`,
      name: 'Treino de pernas',
      desc: 'Realize agachamentos para reforçar base e resistência.',
      goal: scale.squats,
      progress: 0,
      unit: 'rep',
      xp: 120,
      rewardPoints: 2,
      step: 10,
      kind: 'squats',
      category: 'treino'
    },
    {
      id: `daily-walk-${todaySeed}`,
      name: 'Caminhada funcional',
      desc: 'Ande para melhorar condicionamento e energia.',
      goal: scale.walk,
      progress: 0,
      unit: 'km',
      xp: 105,
      rewardPoints: 1,
      step: 0.5,
      kind: 'walk',
      category: 'cardio'
    }
  ];

  const rotated = [...base];
  const shift = new Date(todaySeed).getUTCDate() % rotated.length;
  for (let i = 0; i < shift; i++) rotated.push(rotated.shift());
  return rotated.slice(0, 6);
}

function getMissionDeck() {
  if (!Array.isArray(state.dailyMissions) || state.dailyMissions.length === 0) {
    state.dailyMissions = generateDailyMissionPool();
  }
  return state.dailyMissions;
}

function advanceDailyMission(missionId, amount = 1) {
  const mission = getMissionDeck().find(item => item.id === missionId);
  if (!mission || mission.completed) return;

  const nextProgress = Math.min(mission.goal, mission.progress + amount);
  mission.progress = nextProgress;

  if (nextProgress >= mission.goal) {
    mission.completed = true;
    state.completedQuestCount += 1;
    state.statPoints += mission.rewardPoints || 1;
    addXp(mission.xp || 50);
    updateStreak();
    checkAchievements();
    showToast('MISSÃO CONCLUÍDA', `${mission.name} • +${mission.xp} XP • +${mission.rewardPoints} pontos`);
    log(`${mission.name} concluída. +${mission.xp} XP e +${mission.rewardPoints} pontos.`, 'QUEST');
  }

  updateUI();
}

function resetDailyMissions() {
  state.dailyMissions = generateDailyMissionPool();
  state.completed = { ...state.completed, session: false, stretch: false, water: false };
  state.missions = { session: 0, stretch: 0, water: 0 };
}

const ACHIEVEMENTS = [
  ['first-quest', '⚡', 'FIRST AWAKENING', 'Complete sua primeira missão.'],
  ['distance-5', '◉', '5 KM WALKER', 'Acumule 5 km de distância.'],
  ['distance-25', '◉', '25 KM VETERAN', 'Acumule 25 km de distância.'],
  ['rank-d', '◆', 'DESPERTAR', 'Alcance o D-RANK.'],
  ['rank-a', '◆', 'PORTADOR DE ELITE', 'Alcance o A-RANK.'],
  ['rank-s', '★', 'CAÇADOR NACIONAL', 'Alcance o S-RANK.'],
  ['monarch', '♛', 'MONARCA DAS SOMBRAS', 'Ascenda ao rank final.'],
  ['streak-7', '◈', 'SEMANA DE AÇO', 'Mantenha 7 dias de streak.'],
  ['quest-10', '✦', 'QUEST MACHINE', 'Complete 10 missões.'],
  ['gate-clear', '◈', 'CAÇADOR DE PORTAIS', 'Limpe seu primeiro portal.'],
  ['no-penalty-7', '✚', 'DISCIPLINA DE FERRO', 'Cumpra a quest diária 7 dias seguidos sem penalidade.']
];
const MISSIONS = [];

const defaultState = () => ({
  level: 1, xp: 0, totalXp: 0, statPoints: 0,
  stats: { str: 10, vit: 10, agi: 10, end: 10 },
  distance: 0, longestRun: 0, trainingDays: 0,
  streak: 0, lastTrainingDate: null,
  missions: { session: 0, stretch: 0, water: 0 },
  completed: { session: false, stretch: false, water: false },
  completedQuestCount: 0,
  history: [], week: {},
  settings: { sound: true, difficulty: 'anime' },
  daily: { date: null, pushups: 0, situps: 0, squats: 0, runKm: 0, allComplete: false },
  dailyMissions: [],
  penalty: { active: false, progress: 0, target: 50 },
  cleanStreak: 0,
  trial: { active: false, rankIdx: 0, distGoal: 0, distProgress: 0, repsGoal: 0, repsProgress: 0 },
  queuedXp: 0,
  gatesCleared: 0
});

let state = loadState();
let map, routeLine, marker, watchId = null, routePoints = [], startedAt = null, elapsedTimer = null, lastSessionDistance = 0;
let gateMarkers = [];
const $ = s => document.querySelector(s);

function loadState() { try { return normalize({ ...defaultState(), ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') }); } catch { return defaultState(); } }
function normalize(s) {
  const d = defaultState();
  s.stats = { ...d.stats, ...(s.stats || {}) };
  s.missions = { ...d.missions, ...(s.missions || {}) };
  s.completed = { ...d.completed, ...(s.completed || {}) };
  s.history = Array.isArray(s.history) ? s.history : [];
  s.week = s.week || {};
  s.settings = { ...d.settings, ...(s.settings || {}) };
  s.daily = { ...d.daily, ...(s.daily || {}) };
  s.dailyMissions = Array.isArray(s.dailyMissions) ? s.dailyMissions : [];
  s.penalty = { ...d.penalty, ...(s.penalty || {}) };
  s.trial = { ...d.trial, ...(s.trial || {}) };
  s.queuedXp = s.queuedXp || 0;
  s.gatesCleared = s.gatesCleared || 0;
  s.cleanStreak = s.cleanStreak || 0;
  return s;
}
function save() {
  state.savedAt = Date.now();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  window.__cloudSync?.();
}
/* Ganchos usados por cloud.js para ler/aplicar o estado sem acoplamento direto */
window.getStateSnapshot = () => state;
window.getStateSavedAt = () => state.savedAt || 0;
window.applyCloudState = (remote) => { state = normalize({ ...defaultState(), ...remote }); updateUI(); };
window.showToast = showToast;
window.__systemApp = { state, updateUI, checkAchievements, completeMission };
function targets() { return DIFFICULTY[state.settings.difficulty] || DIFFICULTY.anime; }
function today() { return new Date().toISOString().slice(0, 10); }
function dateKey(d = new Date()) { return d.toISOString().slice(0, 10); }

/* XP necessário para o próximo nível — cresce mais rápido em ranks altos (hyper desafio) */
function xpNeed(level) {
  const idx = rankIndexForLevel(level);
  const rankMult = [1, 1.4, 1.9, 2.6, 3.4, 4.6, 6.5][idx] || 6.5;
  return Math.floor((100 + (level - 1) * 45) * rankMult);
}

function penaltyMult() { return state.penalty.active ? 0.5 : 1; }

function log(text, tag = 'SYS') {
  const box = $('#systemLog'); if (!box) return;
  const e = document.createElement('div'); e.className = 'log-entry';
  e.innerHTML = `<b>[${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}] ${tag}</b> ${text}`;
  box.prepend(e);
}
function showToast(title, msg) {
  const e = document.createElement('div'); e.className = 'toast';
  e.innerHTML = `<b>${title}</b>${msg}`;
  $('#toastStack').appendChild(e); setTimeout(() => e.remove(), 4200);
}

/* ---------- XP / Level / Rank ---------- */
function addXp(rawAmount) {
  const amount = Math.max(1, Math.round(rawAmount * penaltyMult()));
  state.totalXp += amount;
  const rank = rankFor(state.level);
  const atRankCap = state.level >= rank.max && rank.id !== 'MONARCH';

  if (atRankCap && !state.trial.active) {
    state.queuedXp += amount;
    openTrialIfReady(rank);
    return;
  }
  state.xp += amount;
  let ups = 0;
  while (!isAtRankCapNow() && state.xp >= xpNeed(state.level)) {
    state.xp -= xpNeed(state.level);
    state.level++; state.statPoints += 3; ups++;
  }
  if (ups) {
    state.stats.vit += 1;
    showToast('LEVEL UP', `Nível ${state.level} alcançado • +${ups * 3} pontos`);
    log(`LEVEL UP → nível ${state.level}`, 'LEVEL');
    navigator.vibrate?.(120);
  }
  checkRankUnlockToast();
}
function isAtRankCapNow() { const r = rankFor(state.level); return state.level >= r.max && r.id !== 'MONARCH'; }

let lastAnnouncedRank = null;
function checkRankUnlockToast() {
  const r = rankFor(state.level);
  if (lastAnnouncedRank && lastAnnouncedRank !== r.id) {
    showToast('ASCENSÃO DE RANK', `Você agora é ${r.name}`);
    log(`ASCENSÃO → ${r.name}`, 'RANK');
  }
  lastAnnouncedRank = r.id;
}

/* ---------- Provação de Ascensão (hyper desafio para subir de rank) ---------- */
function openTrialIfReady(rank) {
  if (state.trial.active) return;
  const idx = RANKS.findIndex(r => r.id === rank.id);
  const distGoal = 5 * (idx + 1);
  const repsGoal = 300 * (idx + 1);
  state.trial = { active: true, rankIdx: idx, distGoal, distProgress: 0, repsGoal, repsProgress: 0 };
  showToast('PROVAÇÃO DE ASCENSÃO', `Nível máximo de ${rank.name} atingido. Complete a provação para avançar.`);
  log(`Provação de ascensão iniciada para deixar ${rank.name}: ${distGoal.toFixed(1)}km + ${repsGoal} repetições.`, 'TRIAL');
}
function progressTrial({ km = 0, reps = 0 }) {
  if (!state.trial.active) return;
  state.trial.distProgress = Math.min(state.trial.distGoal, state.trial.distProgress + km);
  state.trial.repsProgress = Math.min(state.trial.repsGoal, state.trial.repsProgress + reps);
  if (state.trial.distProgress >= state.trial.distGoal && state.trial.repsProgress >= state.trial.repsGoal) {
    completeTrial();
  }
}
function completeTrial() {
  const gained = state.queuedXp; state.queuedXp = 0;
  state.trial = { active: false, rankIdx: 0, distGoal: 0, distProgress: 0, repsGoal: 0, repsProgress: 0 };
  state.level += 1; state.statPoints += 5; state.xp = 0;
  const r = rankFor(state.level);
  showToast('PROVAÇÃO CONCLUÍDA', `Ascensão confirmada. Bem-vindo(a), ${r.name}.`);
  log(`Provação concluída. Poder acumulado (${gained} XP) absorvido.`, 'TRIAL');
  checkRankUnlockToast();
  checkAchievements();
}

/* ---------- Daily System Quest + Penalidade ---------- */
function ensureDailyReset() {
  const t = today();
  if (state.daily.date === t) {
    if (!Array.isArray(state.dailyMissions) || state.dailyMissions.length === 0) {
      state.dailyMissions = generateDailyMissionPool();
    }
    return;
  }
  if (state.daily.date) {
    if (!state.daily.allComplete) {
      state.penalty.active = true; state.penalty.progress = 0;
      state.cleanStreak = 0;
      showToast('PENALIDADE DO SISTEMA', 'Quest diária incompleta. Ganho de XP reduzido até cumprir a penalidade.');
      log('Quest diária não concluída. Penalidade ativada.', 'PENALTY');
    } else {
      state.cleanStreak = (state.cleanStreak || 0) + 1;
    }
  }
  state.daily = { date: t, pushups: 0, situps: 0, squats: 0, runKm: 0, allComplete: false };
  state.dailyMissions = generateDailyMissionPool();
  save();
}
function dailyGoalsMet() {
  const tg = targets();
  return state.daily.pushups >= tg.pushups && state.daily.situps >= tg.situps &&
    state.daily.squats >= tg.squats && state.daily.runKm >= tg.runKm;
}
function bumpRep(kind, delta) {
  ensureDailyReset();
  const tg = targets();
  const goal = tg[kind];
  state.daily[kind] = Math.max(0, Math.min(goal, state.daily[kind] + delta));
  if (delta > 0) { progressTrial({ reps: delta }); log(`+${delta} ${labelFor(kind)} registrado(s).`, 'QUEST'); }
  checkDailyCompletion();
  updateUI();
}
function labelFor(kind) { return { pushups: 'flexões', situps: 'abdominais', squats: 'agachamentos' }[kind] || kind; }
function checkDailyCompletion() {
  if (!state.daily.allComplete && dailyGoalsMet()) {
    state.daily.allComplete = true;
    const bonus = 250 + rankIndexForLevel(state.level) * 50;
    addXp(bonus);
    updateStreak();
    state.completedQuestCount++;
    showToast('QUEST DIÁRIA COMPLETA', `Sistema registrou seu esforço. +${bonus} XP`);
    log('Quest diária do Sistema concluída.', 'QUEST');
    checkAchievements();
  }
}
function payPenalty() {
  state.penalty.progress = Math.min(state.penalty.target, state.penalty.progress + 10);
  if (state.penalty.progress >= state.penalty.target) {
    state.penalty.active = false; state.penalty.progress = 0;
    showToast('PENALIDADE CUMPRIDA', 'O Sistema restaurou seu ganho normal de XP.');
    log('Penalidade cumprida.', 'PENALTY');
  }
  updateUI();
}

/* ---------- Missões manuais ---------- */
function completeMission(id) {
  const mission = getMissionDeck().find(x => x.id === id);
  if (mission) {
    if (mission.completed) return;
    mission.progress = mission.goal;
    mission.completed = true;
    state.completedQuestCount += 1;
    state.statPoints += mission.rewardPoints || 1;
    addXp(mission.xp || 50);
    updateStreak();
    checkAchievements();
    showToast('MISSÃO CONCLUÍDA', `${mission.name} • +${mission.xp} XP • +${mission.rewardPoints} pontos`);
    log(`${mission.name} concluída. +${mission.xp} XP e +${mission.rewardPoints} pontos.`, 'QUEST');
    updateUI();
    return;
  }

  if (state.completed[id]) return;
  const m = MISSIONS.find(x => x.id === id); if (!m) return;
  state.completed[id] = true; state.missions[id] = m.goal; state.completedQuestCount++;
  addXp(m.xp); updateStreak(); checkAchievements();
  showToast('QUEST COMPLETE', `${m.name} • +${m.xp} XP`);
  log(`${m.name} concluída. +${m.xp} XP`, 'QUEST');
  updateUI();
}
function manualComplete(id) {
  const mission = getMissionDeck().find(x => x.id === id);
  if (mission) {
    advanceDailyMission(id, mission.goal - mission.progress);
    return;
  }

  const m = MISSIONS.find(x => x.id === id);
  if (!m || m.kind !== 'manual' || state.completed[id]) return;
  completeMission(id);
}

function updateStreak() {
  const t = today();
  if (state.lastTrainingDate === t) return;
  if (state.lastTrainingDate) {
    const last = new Date(state.lastTrainingDate + 'T12:00:00');
    const cur = new Date(t + 'T12:00:00');
    const diff = Math.round((cur - last) / 86400000);
    if (diff === 1) state.streak++; else if (diff > 1) state.streak = 1;
  } else state.streak = 1;
  state.lastTrainingDate = t; state.trainingDays++;
  state.week[t] = (state.week[t] || 0) + lastSessionDistance;
  save();
}

function checkAchievements() {
  const unlocked = {};
  const km = state.distance; const r = rankFor(state.level);
  const rankOrder = RANKS.map(x => x.id);
  const atLeast = id => rankOrder.indexOf(r.id) >= rankOrder.indexOf(id);
  const rules = {
    'first-quest': state.completedQuestCount >= 1,
    'distance-5': km >= 5,
    'distance-25': km >= 25,
    'rank-d': atLeast('D'),
    'rank-a': atLeast('A'),
    'rank-s': atLeast('S'),
    'monarch': r.id === 'MONARCH',
    'streak-7': state.streak >= 7,
    'quest-10': state.completedQuestCount >= 10,
    'gate-clear': state.gatesCleared >= 1,
    'no-penalty-7': (state.cleanStreak || 0) >= 7
  };
  ACHIEVEMENTS.forEach(([id]) => unlocked[id] = !!rules[id]);
  const prev = JSON.parse(localStorage.getItem('system-achievements') || '{}');
  Object.entries(unlocked).forEach(([id, ok]) => {
    if (ok && !prev[id]) {
      showToast('ACHIEVEMENT UNLOCKED', ACHIEVEMENTS.find(a => a[0] === id)[2]);
      log(`Achievement desbloqueada: ${id}`, 'ACHIEVEMENT');
    }
  });
  localStorage.setItem('system-achievements', JSON.stringify(unlocked));
}

/* ---------- Render ---------- */
function setText(selector, value) {
  const el = $(selector);
  if (el) el.textContent = value;
  return !!el;
}

function updateUI() {
  ensureDailyReset();
  const rank = rankFor(state.level);
  const capped = state.level >= rank.max && rank.id !== 'MONARCH';
  const need = xpNeed(state.level);
  const pct = capped ? 100 : Math.min(100, state.xp / need * 100);

  setText('#levelBadge', String(state.level).padStart(2, '0'));
  setText('#className', rank.name);
  setText('#xpLabel', capped ? 'PROVAÇÃO PENDENTE' : `${state.xp} / ${need} XP`);
  const xpBar = $('#xpBar'); if (xpBar) xpBar.style.width = pct + '%';
  setText('#xpPercent', capped ? '—' : Math.round(pct) + '%');
  setText('#strStat', state.stats.str);
  setText('#vitStat', state.stats.vit);
  setText('#agiStat', state.stats.agi);
  setText('#endStat', state.stats.end);
  setText('#statPoints', state.statPoints);
  setText('#distanceDone', state.distance.toFixed(2));
  setText('#mapDistance', state.distance.toFixed(2) + ' km');
  setText('#streakText', `STREAK: ${state.streak} DIA${state.streak === 1 ? '' : 'S'}`);
  setText('#totalDistance', state.distance.toFixed(2) + ' km');
  setText('#trainingDays', state.trainingDays);
  setText('#longestRun', state.longestRun.toFixed(2) + ' km');
  setText('#totalXp', state.totalXp + ' XP');
  setText('#gatesCleared', state.gatesCleared);
  const tsm = $('#trialStatusMini'); if (tsm) tsm.textContent = state.trial.active ? RANKS[state.trial.rankIdx].name : '—';

  renderPenaltyBanner();
  renderDailyQuest();
  renderTrial();
  renderRankLadder();
  updateStatusTab();
  renderMissions();
  renderQuests();
  renderAchievements();
  renderHistory();
  renderWeek();
  save();
}

function renderPenaltyBanner() {
  const b = $('#penaltyBanner'); if (!b) return;
  if (state.penalty.active) {
    b.classList.add('active');
    b.innerHTML = `<b>⚠ PENALIDADE ATIVA</b> Ganho de XP reduzido em 50%. Cumpra a penalidade: <span>${state.penalty.progress}/${state.penalty.target}</span><button id="payPenaltyBtn" class="tool-btn">CUMPRIR (+10)</button>`;
    $('#payPenaltyBtn')?.addEventListener('click', payPenalty);
  } else {
    b.classList.remove('active'); b.innerHTML = '';
  }
}

function renderDailyQuest() {
  const tg = targets();
  const rows = [
    ['pushups', 'FLEXÕES', state.daily.pushups, tg.pushups],
    ['situps', 'ABDOMINAIS', state.daily.situps, tg.situps],
    ['squats', 'AGACHAMENTOS', state.daily.squats, tg.squats]
  ];
  const box = $('#dailyQuest'); if (!box) return;
  box.innerHTML = rows.map(([k, label, v, goal]) => `
    <div class="rep-row">
      <div class="rep-top"><span>${label}</span><b>${v} / ${goal}</b></div>
      <div class="mini-progress"><span style="width:${Math.min(100, v / goal * 100)}%"></span></div>
      <div class="rep-actions">
        <button data-rep="${k}" data-delta="-${REP_STEP}" class="tool-btn">-${REP_STEP}</button>
        <button data-rep="${k}" data-delta="${REP_STEP}" class="tool-btn">+${REP_STEP}</button>
      </div>
    </div>`).join('') + `
    <div class="rep-row">
      <div class="rep-top"><span>CORRIDA (GPS)</span><b>${state.daily.runKm.toFixed(2)} / ${tg.runKm} km</b></div>
      <div class="mini-progress"><span style="width:${Math.min(100, state.daily.runKm / tg.runKm * 100)}%"></span></div>
    </div>`;
  $('#dailyQuestStatus').textContent = state.daily.allComplete ? 'QUEST DIÁRIA COMPLETA' : 'EM ANDAMENTO';
  box.querySelectorAll('[data-rep]').forEach(b => b.addEventListener('click', () => bumpRep(b.dataset.rep, Number(b.dataset.delta))));
}

function renderTrial() {
  const box = $('#trialPanel'); if (!box) return;
  if (!state.trial.active) { box.innerHTML = '<p class="muted-note">Nenhuma provação ativa no momento.</p>'; return; }
  const r = RANKS[state.trial.rankIdx];
  const next = RANKS[state.trial.rankIdx + 1] || r;
  box.innerHTML = `
    <p class="muted-note">Nível máximo de ${r.name} atingido. Complete a provação para ascender a ${next.name}.</p>
    <div class="rep-row"><div class="rep-top"><span>DISTÂNCIA</span><b>${state.trial.distProgress.toFixed(2)} / ${state.trial.distGoal.toFixed(1)} km</b></div>
      <div class="mini-progress"><span style="width:${Math.min(100, state.trial.distProgress / state.trial.distGoal * 100)}%"></span></div></div>
    <div class="rep-row"><div class="rep-top"><span>REPETIÇÕES</span><b>${state.trial.repsProgress} / ${state.trial.repsGoal}</b></div>
      <div class="mini-progress"><span style="width:${Math.min(100, state.trial.repsProgress / state.trial.repsGoal * 100)}%"></span></div></div>`;
}

function renderRankLadder() {
  const box = $('#rankLadder'); if (!box) return;
  const rank = rankFor(state.level);
  box.innerHTML = RANKS.map(r => {
    const cls = r.id === rank.id ? 'active' : (RANKS.indexOf(r) < RANKS.indexOf(rank) ? 'cleared' : 'locked');
    return `<div class="rank-node ${cls}"><span>${r.id === 'MONARCH' ? '♛' : r.id}</span><small>${r.id === 'MONARCH' ? 'MONARCA' : r.id + '-RANK'}</small></div>`;
  }).join('<div class="rank-connector"></div>');
}

function renderMissions() {
  const c = $('#missions'); if (!c) return;
  const missions = getMissionDeck();
  c.innerHTML = ''; let done = 0;
  missions.forEach(m => {
    const d = !!m.completed;
    if (d) done++;
    const progress = Number(m.progress || 0);
    const p = Math.min(100, (progress / m.goal) * 100);
    const e = document.createElement('div'); e.className = 'mission-item' + (d ? ' complete' : ''); e.dataset.id = m.id;
    const progressLabel = m.unit === 'km' || m.unit === 'L' ? progress.toFixed(2) : progress;
    e.innerHTML = `<div class="mission-item-top"><div class="mission-name">${d ? '✓ ' : ''}${m.name}</div><div class="mission-xp">+${m.xp} XP</div></div><p>${m.desc}</p><div class="mini-progress"><span style="width:${p}%"></span></div><div class="mission-item-bottom"><span>${progressLabel} / ${m.goal} ${m.unit}</span><span>${d ? 'COMPLETE' : 'ACTIVE'}</span></div>${d ? '' : `<button class="primary-btn mission-complete-btn" data-complete="${m.id}">✓ REGISTRAR PROGRESSO</button>`}`;
    c.appendChild(e);
  });
  c.querySelectorAll('[data-complete]').forEach(b => b.addEventListener('click', (ev) => { ev.stopPropagation(); const mission = missions.find(item => item.id === b.dataset.complete); if (mission) advanceDailyMission(mission.id, mission.step || 1); }));
  const missionCount = $('#missionCount'); if (missionCount) missionCount.textContent = `${done}/${missions.length}`;
  const b = $('#startBtn');
  if (b) {
    b.textContent = watchId === null ? 'COMEÇAR MONITORAMENTO' : 'RASTREANDO…';
    b.disabled = false;
  }
  const missionStatus = $('#missionStatus'); if (missionStatus) missionStatus.textContent = watchId !== null ? 'RASTREAMENTO EM ANDAMENTO' : 'PRONTO PARA COMEÇAR';
}

function renderQuests() {
  const c = $('#questArchive'); if (!c) return;
  c.innerHTML = '';
  const missions = getMissionDeck();
  missions.forEach(m => {
    const progress = Number(m.progress || 0);
    const d = !!m.completed;
    const e = document.createElement('div'); e.className = 'archive-card';
    e.innerHTML = `<h3>${m.name}</h3><p>${m.desc}</p><div class="archive-row"><span>PROGRESSO</span><b>${m.unit === 'km' || m.unit === 'L' ? progress.toFixed(2) : progress}/${m.goal}</b></div><div class="archive-row"><span>RECOMPENSA</span><b>+${m.xp} XP • +${m.rewardPoints || 1} PTS</b></div><div class="archive-row"><span>STATUS</span><b>${d ? 'COMPLETE' : 'ACTIVE'}</b></div>${d ? '' : `<button class="primary-btn mission-complete-btn" data-complete2="${m.id}">✓ REGISTRAR PROGRESSO</button>`}`;
    c.appendChild(e);
  });
  const tg = targets();
  const e2 = document.createElement('div'); e2.className = 'archive-card';
  e2.innerHTML = `<h3>QUEST DIÁRIA DO SISTEMA</h3><p>Flexões, abdominais, agachamentos e corrida — a quest original do Sistema. Falhar gera penalidade.</p><div class="archive-row"><span>META</span><b>${tg.pushups}/${tg.situps}/${tg.squats}/${tg.runKm}km</b></div><div class="archive-row"><span>STATUS</span><b>${state.daily.allComplete ? 'COMPLETE' : 'ACTIVE'}</b></div><div id="dailyQuestArchive"></div>`;
  c.prepend(e2);
  c.querySelectorAll('[data-complete2]').forEach(b => b.addEventListener('click', () => { const mission = missions.find(item => item.id === b.dataset.complete2); if (mission) advanceDailyMission(mission.id, mission.step || 1); }));
  const rows = [
    ['pushups', 'FLEXÕES', state.daily.pushups, tg.pushups],
    ['situps', 'ABDOMINAIS', state.daily.situps, tg.situps],
    ['squats', 'AGACHAMENTOS', state.daily.squats, tg.squats]
  ];
  const mirror = $('#dailyQuestArchive');
  if (mirror) {
    mirror.innerHTML = rows.map(([k, label, v, goal]) => `
      <div class="rep-row"><div class="rep-top"><span>${label}</span><b>${v} / ${goal}</b></div>
      <div class="mini-progress"><span style="width:${Math.min(100, v / goal * 100)}%"></span></div>
      <div class="rep-actions"><button data-rep2="${k}" data-delta="-${REP_STEP}" class="tool-btn">-${REP_STEP}</button><button data-rep2="${k}" data-delta="${REP_STEP}" class="tool-btn">+${REP_STEP}</button></div></div>`).join('');
    mirror.querySelectorAll('[data-rep2]').forEach(b => b.addEventListener('click', () => bumpRep(b.dataset.rep2, Number(b.dataset.delta))));
  }
}

function updateStatusTab() {
  const rank = rankFor(state.level);
  const attr = $('#attributeList');
  setText('#statusClass', rank.name);
  setText('#detailLevel', state.level);
  setText('#detailXp', state.xp);
  setText('#detailPoints', state.statPoints);
  setText('#detailTotalXp', state.totalXp);
  setText('#detailStreak', state.streak);
  setText('#detailQuests', state.completedQuestCount);
  const names = [['STR', 'str'], ['VIT', 'vit'], ['AGI', 'agi'], ['END', 'end']];
  if (attr) {
    attr.innerHTML = names.map(([n, k]) =>
      `<div class="attr-line"><span>${n}</span><div class="bar"><span style="width:${Math.min(100, state.stats[k] * 3)}%"></span></div><b>${state.stats[k]}</b><button data-stat2="${k}" class="tool-btn" ${state.statPoints <= 0 ? 'disabled' : ''}>+1</button></div>`
    ).join('') + `<p class="muted-note" style="margin-top:10px">Pontos não gastos: <b>${state.statPoints}</b></p>`;
    attr.querySelectorAll('[data-stat2]').forEach(b => b.addEventListener('click', () => allocate(b.dataset.stat2)));
  }
}

function renderAchievements() {
  const saved = JSON.parse(localStorage.getItem('system-achievements') || '{}');
  let done = 0; const c = $('#achievements'); if (!c) return;
  c.innerHTML = '';
  ACHIEVEMENTS.forEach(([id, icon, title, desc]) => {
    const ok = !!saved[id]; if (ok) done++;
    const e = document.createElement('div'); e.className = 'achievement' + (ok ? '' : ' locked');
    e.innerHTML = `<div class="icon">${icon}</div><h3>${ok ? '✓ ' : ''}${title}</h3><p>${desc}</p>`;
    c.appendChild(e);
  });
  const achievementCount = $('#achievementCount'); if (achievementCount) achievementCount.textContent = `${done}/${ACHIEVEMENTS.length}`;
}

function renderHistory() {
  const c = $('#historyList'); if (!c) return;
  c.innerHTML = state.history.length
    ? state.history.slice().reverse().map(h => `<div class="history-row"><strong>${h.date}</strong><span>${h.duration}</span><span>${h.distance.toFixed(2)} km</span><span>+${h.xp} XP</span></div>`).join('')
    : '<div class="history-row"><span>Nenhuma sessão registrada ainda.</span></div>';
}

function renderWeek() {
  const c = $('#weekChart'); if (!c) return; c.innerHTML = '';
  const tg = targets();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const k = dateKey(d), km = state.week[k] || 0;
    const h = Math.min(135, Math.max(3, km / Math.max(1, tg.runKm) * 135));
    const e = document.createElement('div'); e.className = 'day-col';
    e.innerHTML = `<b>${km.toFixed(1)}km</b><div class="day-bar" style="height:${h}px"></div><span>${d.toLocaleDateString('pt-BR', { weekday: 'short' }).slice(0, 3).toUpperCase()}</span>`;
    c.appendChild(e);
  }
}

/* ---------- Mapa dinâmico + Portais (Gates) ---------- */
let mapAvailable = false;
function initMap() {
  try {
    if (typeof L === 'undefined') throw new Error('Leaflet não carregado');
    map = L.map('map').setView([-14.235, -51.925], 4);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap contributors' }).addTo(map);
    routeLine = L.polyline([], { color: '#61d6ff', weight: 5, opacity: .9 }).addTo(map);
    mapAvailable = true;
  } catch (err) {
    mapAvailable = false;
    const box = document.getElementById('map');
    if (box) box.innerHTML = '<div class="map-offline">MAPA INDISPONÍVEL (sem conexão com o serviço de mapas). O restante do Sistema continua funcionando normalmente — missões, XP, atributos e quest diária não dependem do mapa.</div>';
    console.warn('initMap falhou, seguindo sem mapa:', err);
  }
}
function haversine(a, b) {
  const R = 6371, la1 = a.lat * Math.PI / 180, la2 = b.lat * Math.PI / 180,
    dla = (b.lat - a.lat) * Math.PI / 180, dlo = (b.lng - a.lng) * Math.PI / 180;
  const x = Math.sin(dla / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dlo / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}
function metersOffset(lat, lng, distM, bearingDeg) {
  const R = 6371000, br = bearingDeg * Math.PI / 180;
  const la1 = lat * Math.PI / 180, lo1 = lng * Math.PI / 180;
  const la2 = Math.asin(Math.sin(la1) * Math.cos(distM / R) + Math.cos(la1) * Math.sin(distM / R) * Math.cos(br));
  const lo2 = lo1 + Math.atan2(Math.sin(br) * Math.sin(distM / R) * Math.cos(la1), Math.cos(distM / R) - Math.sin(la1) * Math.sin(la2));
  return { lat: la2 * 180 / Math.PI, lng: lo2 * 180 / Math.PI };
}
function spawnGates(origin) {
  clearGateMarkers();
  const colors = { E: '#6ee7ff', D: '#67f0ba', C: '#ffd36a', B: '#ff9d4a', A: '#ff6c88', S: '#c26bff', MONARCH: '#ffffff' };
  const count = 2;
  for (let i = 0; i < count; i++) {
    const dist = 250 + Math.random() * 550;
    const bearing = Math.random() * 360;
    const pos = metersOffset(origin.lat, origin.lng, dist, bearing);
    const gateRank = RANKS[Math.min(RANKS.length - 1, rankIndexForLevel(state.level))];
    const gm = L.circleMarker([pos.lat, pos.lng], {
      radius: 10, color: colors[gateRank.id] || '#6ee7ff', weight: 2,
      fillColor: colors[gateRank.id] || '#6ee7ff', fillOpacity: .55
    }).addTo(map);
    gm.bindPopup(`<b>PORTAL [${gateRank.id === 'MONARCH' ? '♛' : gateRank.id}]</b><br>Aproxime-se para limpar (30m).`);
    gm._gate = { lat: pos.lat, lng: pos.lng, cleared: false, rankId: gateRank.id };
    gateMarkers.push(gm);
  }
  log(`${count} portais detectados nas proximidades.`, 'GATE');
}
function clearGateMarkers() { gateMarkers.forEach(g => map.removeLayer(g)); gateMarkers = []; }
function checkGateProximity(p) {
  gateMarkers.forEach(gm => {
    if (gm._gate.cleared) return;
    const d = haversine(p, gm._gate);
    if (d * 1000 <= 30) {
      gm._gate.cleared = true;
      const idx = RANKS.findIndex(r => r.id === gm._gate.rankId);
      const bonus = 80 + idx * 40;
      state.gatesCleared++;
      addXp(bonus);
      showToast('PORTAL LIMPO', `+${bonus} XP • Portal [${gm._gate.rankId}] neutralizado.`);
      log(`Portal [${gm._gate.rankId}] limpo nas coordenadas próximas.`, 'GATE');
      gm.setStyle({ fillOpacity: .12, opacity: .25 });
      checkAchievements();
      updateUI();
    }
  });
}

function startTracking() {
  if (!mapAvailable) { showToast('MAPA INDISPONÍVEL', 'Sem mapa carregado, o rastreamento por GPS não pode desenhar a rota agora.'); return; }
  if (!navigator.geolocation) { showToast('GPS ERROR', 'Seu navegador não fornece geolocalização.'); return; }
  if (watchId !== null) return;
  routePoints = []; lastSessionDistance = 0; startedAt = Date.now();
  $('#connectionStatus').innerHTML = '<i></i> GPS ATIVO';
  $('#liveIndicator').classList.add('live'); $('#liveIndicator').innerHTML = '<span class="pulse"></span> AO VIVO';
  log('Rastreamento GPS iniciado.', 'GPS');
  elapsedTimer = setInterval(updateElapsed, 1000);
  watchId = navigator.geolocation.watchPosition(onPosition, onGpsError, { enableHighAccuracy: true, maximumAge: 2500, timeout: 15000 });
  renderMissions();
}
function onPosition(pos) {
  const p = { lat: pos.coords.latitude, lng: pos.coords.longitude, time: Date.now(), accuracy: pos.coords.accuracy };
  if (!routePoints.length) spawnGates(p);
  if (routePoints.length) {
    const last = routePoints[routePoints.length - 1], delta = haversine(last, p);
    if (delta < .005) return;
    state.distance += delta; lastSessionDistance += delta;
    if (lastSessionDistance > state.longestRun) state.longestRun = lastSessionDistance;
    state.daily.runKm += delta;
    progressTrial({ km: delta });
    checkDailyCompletion();
  }
  routePoints.push(p);
  routeLine.setLatLngs(routePoints.map(x => [x.lat, x.lng]));
  if (!marker) marker = L.circleMarker([p.lat, p.lng], { radius: 8, color: '#78ecff', fillColor: '#3e96ff', fillOpacity: .9, weight: 2 }).addTo(map);
  else marker.setLatLng([p.lat, p.lng]);
  map.setView([p.lat, p.lng], Math.max(map.getZoom(), 16));
  $('#points').textContent = routePoints.length;
  checkGateProximity(p);
  updatePace();
  updateUI();
}
function onGpsError(e) {
  const msg = { 1: 'Permissão de localização recusada.', 2: 'Posição indisponível.', 3: 'Tempo esgotado no GPS.' }[e.code] || 'Falha de geolocalização.';
  log(msg, 'GPS ERROR'); showToast('GPS ERROR', msg);
}
function updatePace() {
  if (routePoints.length < 2 || !startedAt) return;
  const min = (Date.now() - startedAt) / 60000;
  $('#pace').textContent = min > 0 ? (state.distance / min).toFixed(2) + ' km/min' : '—';
}
function updateElapsed() { if (!startedAt) return; $('#elapsed').textContent = formatTime(Math.floor((Date.now() - startedAt) / 1000)); updatePace(); }
function formatTime(s) { const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), ss = s % 60; return h ? `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}` : `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`; }
function stopTracking(reason = 'manual') {
  if (watchId !== null) { navigator.geolocation.clearWatch(watchId); watchId = null; }
  clearInterval(elapsedTimer); elapsedTimer = null;
  $('#connectionStatus').innerHTML = '<i></i> SISTEMA PRONTO';
  $('#liveIndicator').classList.remove('live'); $('#liveIndicator').innerHTML = '<span class="pulse"></span> DESCANSO';
  if (lastSessionDistance > .02) {
    const duration = formatTime(Math.floor((Date.now() - startedAt) / 1000));
    state.history.push({ date: today(), duration, distance: lastSessionDistance, xp: Math.round(lastSessionDistance * 45) });
    state.history = state.history.slice(-30);
    state.week[today()] = (state.week[today()] || 0) + lastSessionDistance;
    addXp(Math.floor(lastSessionDistance * 15));
    updateStreak(); checkAchievements();
  }
  if (reason === 'manual') log('Sessão GPS encerrada.', 'GPS');
  startedAt = null; routePoints = []; lastSessionDistance = 0;
  clearGateMarkers();
  $('#points').textContent = '0';
  updateUI();
}

function allocate(k) {
  if (state.statPoints <= 0) { showToast('SEM PONTOS', 'Nenhum ponto disponível.'); return; }
  state.statPoints--; state.stats[k]++;
  log(`${k.toUpperCase()} +1 aplicado.`, 'STAT');
  showToast('PONTO DE STATUS', `${k.toUpperCase()} aumentou para ${state.stats[k]}`);
  updateUI();
}
function clearRoute() {
  if (!mapAvailable) return;
  routePoints = []; routeLine.setLatLngs([]);
  if (marker) { map.removeLayer(marker); marker = null; }
  $('#points').textContent = '0';
  log('Rota visual da sessão limpa.', 'MAP');
}
function bindTabs() {
  document.querySelectorAll('.tab').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(x => x.classList.remove('active'));
    b.classList.add('active'); $('#tab-' + b.dataset.tab).classList.add('active');
    if (b.dataset.tab === 'overview' && mapAvailable) setTimeout(() => map.invalidateSize(), 50);
  }));
}
function bind() {
  bindTabs();
  const startBtn = $('#startBtn'); if (startBtn) startBtn.addEventListener('click', () => watchId === null ? startTracking() : stopTracking());
  const resetBtn = $('#resetBtn'); if (resetBtn) resetBtn.addEventListener('click', () => {
    if (confirm('Resetar todo o progresso local?')) {
      localStorage.removeItem(STORAGE_KEY); localStorage.removeItem('system-achievements'); location.reload();
    }
  });
  const centerBtn = $('#centerBtn'); if (centerBtn) centerBtn.addEventListener('click', () => { if (marker) map.setView(marker.getLatLng(), 16); else showToast('MAPA', 'Ainda não há posição GPS.'); });
  const clearRouteBtn = $('#clearRouteBtn'); if (clearRouteBtn) clearRouteBtn.addEventListener('click', clearRoute);
  document.querySelectorAll('[data-stat]').forEach(b => b.addEventListener('click', () => allocate(b.dataset.stat)));
  const soundBtn = $('#soundBtn'); if (soundBtn) soundBtn.addEventListener('click', () => {
    state.settings.sound = !state.settings.sound; $('#soundBtn').textContent = state.settings.sound ? '◈' : '◇';
    save(); showToast('SOM DO SISTEMA', state.settings.sound ? 'ON' : 'OFF');
  });
  const difficultyBtn = $('#difficultyBtn'); if (difficultyBtn) difficultyBtn.addEventListener('click', () => {
    state.settings.difficulty = state.settings.difficulty === 'anime' ? 'realista' : 'anime';
    difficultyBtn.textContent = state.settings.difficulty === 'anime' ? 'MODO: FIEL AO ANIME' : 'MODO: REALISTA';
    showToast('DIFICULDADE', state.settings.difficulty === 'anime' ? 'Metas canônicas (100/100/100/10km) ativadas.' : 'Metas realistas ativadas.');
    updateUI();
  });
  document.addEventListener('click', e => {
    const item = e.target.closest('.mission-item'); if (!item) return;
    manualComplete(item.dataset.id);
  });
  window.addEventListener('beforeunload', save);
}

try {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
  initMap(); bind();
  lastAnnouncedRank = rankFor(state.level).id;
  ensureDailyReset();
  updateUI(); checkAchievements();
  const difficultyBtn = $('#difficultyBtn'); if (difficultyBtn) difficultyBtn.textContent = state.settings.difficulty === 'anime' ? 'MODO: FIEL AO ANIME' : 'MODO: REALISTA';
  log('System inicializado. Bem-vindo ao Training Protocol.', 'BOOT');
  log('Quest diária do Sistema carregada. GPS pronto sob demanda.', 'SYS');
} catch (err) {
  console.error('Falha na inicialização do Sistema:', err);
  const box = $('#systemLog');
  if (box) box.innerHTML = `<div class="log-entry"><b>ERRO</b> Falha ao iniciar: ${err.message}. Recarregue a página; se persistir, verifique o console (F12).</div>`;
}
