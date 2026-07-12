// All 2D overlay UI: title cards, narration subtitles, objectives, the quiz,
// the newspaper headline, screen fades, the start screen, and the teacher bar.
// Pure DOM — the 3D layer never touches these.

const styles = `
:root {
  --ink: #f4efe6;
  --muted: #b9b1a2;
  --accent: #e8b04b;
  --bg-panel: rgba(18, 16, 14, 0.86);
  --serif: "Iowan Old Style", "Palatino Linotype", Georgia, serif;
  --sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
* { box-sizing: border-box; }
html, body { margin: 0; height: 100%; background: #0a0908; overflow: hidden; }
#app { position: fixed; inset: 0; }
canvas { display: block; }

/* Cinematic letterbox + subtle vignette / color grade */
#grade {
  position: fixed; inset: 0; pointer-events: none; z-index: 5;
  box-shadow: inset 0 0 220px 40px rgba(0,0,0,0.55);
  background:
    radial-gradient(120% 90% at 50% 30%, rgba(255, 214, 150, 0.05), transparent 60%);
}
#bars { position: fixed; inset: 0; pointer-events: none; z-index: 6; }
#bars::before, #bars::after {
  content: ""; position: absolute; left: 0; right: 0; height: 8vh;
  background: #000; transition: height .8s ease;
}
#bars::before { top: 0; } #bars::after { bottom: 0; }
#bars.cinematic::before, #bars.cinematic::after { height: 12vh; }

/* Screen fade */
#fade {
  position: fixed; inset: 0; background: #000; z-index: 40;
  opacity: 0; transition: opacity .6s ease; pointer-events: none;
}
#fade.on { opacity: 1; }

/* Title / date card */
#titlecard {
  position: fixed; inset: 0; z-index: 20; display: flex; flex-direction: column;
  align-items: center; justify-content: center; text-align: center;
  opacity: 0; transition: opacity 1s ease; pointer-events: none;
}
#titlecard.show { opacity: 1; }
#titlecard .eyebrow {
  font-family: var(--sans); letter-spacing: .42em; text-transform: uppercase;
  font-size: 13px; color: var(--accent); margin-bottom: 18px;
}
#titlecard .title {
  font-family: var(--serif); font-size: clamp(30px, 6vw, 68px);
  color: var(--ink); font-weight: 500; line-height: 1.1; max-width: 16ch;
  text-shadow: 0 2px 30px rgba(0,0,0,.6);
}
#titlecard .rule { width: 64px; height: 2px; background: var(--accent); margin: 26px 0 0; }

/* Narration subtitle */
#subtitle {
  position: fixed; left: 50%; bottom: 15vh; transform: translateX(-50%);
  z-index: 15; max-width: min(820px, 84vw); text-align: center;
  font-family: var(--serif); font-size: clamp(17px, 2.1vw, 23px);
  line-height: 1.5; color: var(--ink); opacity: 0; transition: opacity .5s ease;
  text-shadow: 0 2px 18px rgba(0,0,0,.9); pointer-events: none;
}
#subtitle.show { opacity: 1; }

/* Objective banner */
#objective {
  position: fixed; top: calc(12vh + 22px); left: 50%; transform: translateX(-50%);
  z-index: 15; display: flex; align-items: center; gap: 12px;
  background: var(--bg-panel); border: 1px solid rgba(232,176,75,.35);
  border-radius: 999px; padding: 10px 20px; font-family: var(--sans);
  color: var(--ink); font-size: 14px; opacity: 0; transition: opacity .4s ease;
  pointer-events: none; backdrop-filter: blur(6px); max-width: 80vw;
}
#objective.show { opacity: 1; }
#objective .dot { width: 9px; height: 9px; border-radius: 50%; background: var(--accent);
  box-shadow: 0 0 12px var(--accent); flex: none; }
#objective.done .dot { background: #6fcf7f; box-shadow: 0 0 12px #6fcf7f; }
#objective .timer { font-variant-numeric: tabular-nums; color: var(--accent); font-weight: 600; }

/* Interaction prompt (press E) */
#prompt {
  position: fixed; left: 50%; bottom: 24vh; transform: translateX(-50%);
  z-index: 15; font-family: var(--sans); font-size: 14px; color: var(--ink);
  background: var(--bg-panel); padding: 8px 16px; border-radius: 8px;
  border: 1px solid rgba(255,255,255,.15); opacity: 0; transition: opacity .2s ease;
  pointer-events: none;
}
#prompt.show { opacity: 1; }
#prompt kbd {
  background: var(--accent); color: #1a1206; border-radius: 4px; padding: 1px 7px;
  font-family: var(--sans); font-weight: 700; margin-right: 6px;
}

/* Modal panels (headline, quiz) */
.modal-wrap {
  position: fixed; inset: 0; z-index: 30; display: none;
  align-items: center; justify-content: center; background: rgba(0,0,0,.55);
  backdrop-filter: blur(3px);
}
.modal-wrap.show { display: flex; }
.panel {
  background: var(--bg-panel); border: 1px solid rgba(255,255,255,.12);
  border-radius: 16px; padding: 34px 38px; max-width: 560px; width: 88vw;
  font-family: var(--sans); color: var(--ink); box-shadow: 0 30px 80px rgba(0,0,0,.6);
}
/* Newspaper headline styling */
#headline .paper {
  background: #efe7d4; color: #1c1710; border-radius: 6px; padding: 30px 34px;
  font-family: var(--serif); box-shadow: 0 20px 60px rgba(0,0,0,.6);
}
#headline .masthead { text-align: center; border-bottom: 3px double #1c1710;
  padding-bottom: 8px; margin-bottom: 14px; letter-spacing: .2em;
  text-transform: uppercase; font-size: 13px; }
#headline h2 { font-size: clamp(24px, 4vw, 38px); margin: 6px 0 12px; line-height: 1.12; }
#headline p { font-size: 15px; line-height: 1.5; margin: 0 0 18px; color: #38301f; }

/* Quiz */
#quiz h3 { font-family: var(--serif); font-size: 22px; margin: 0 0 22px; }
#quiz .q { margin-bottom: 8px; font-size: 17px; }
#quiz .choices { display: grid; gap: 10px; margin: 14px 0 4px; }
#quiz button.choice {
  text-align: left; padding: 13px 16px; border-radius: 10px; cursor: pointer;
  background: rgba(255,255,255,.05); color: var(--ink); font-size: 15px;
  border: 1px solid rgba(255,255,255,.14); transition: all .15s ease; font-family: var(--sans);
}
#quiz button.choice:hover { background: rgba(255,255,255,.1); border-color: rgba(232,176,75,.5); }
#quiz button.choice.correct { background: rgba(111,207,127,.18); border-color: #6fcf7f; }
#quiz button.choice.wrong { background: rgba(224,102,102,.18); border-color: #e06666; }
#quiz .feedback { margin-top: 16px; font-size: 14px; color: var(--muted); min-height: 20px; }
#quiz .progress { font-size: 12px; letter-spacing: .2em; text-transform: uppercase;
  color: var(--accent); margin-bottom: 10px; }

/* Generic button */
.btn {
  font-family: var(--sans); border: none; cursor: pointer; border-radius: 8px;
  padding: 11px 20px; font-size: 14px; font-weight: 600; transition: all .15s ease;
}
.btn-primary { background: var(--accent); color: #1a1206; }
.btn-primary:hover { filter: brightness(1.08); }
.btn-ghost { background: transparent; color: var(--muted); border: 1px solid rgba(255,255,255,.18); }
.btn-ghost:hover { color: var(--ink); }

/* Teacher bar */
#teacherbar {
  position: fixed; left: 50%; bottom: 18px; transform: translateX(-50%);
  z-index: 25; display: flex; align-items: center; gap: 10px;
  background: var(--bg-panel); border: 1px solid rgba(255,255,255,.12);
  border-radius: 14px; padding: 8px 12px; font-family: var(--sans);
  backdrop-filter: blur(8px); box-shadow: 0 12px 40px rgba(0,0,0,.5);
}
#teacherbar .navbtn {
  background: rgba(255,255,255,.06); color: var(--ink); border: 1px solid rgba(255,255,255,.12);
  border-radius: 9px; width: 40px; height: 40px; cursor: pointer; font-size: 17px;
  display: grid; place-items: center; transition: all .15s ease;
}
#teacherbar .navbtn:hover:not(:disabled) { background: rgba(232,176,75,.2); border-color: var(--accent); }
#teacherbar .navbtn:disabled { opacity: .3; cursor: default; }
#teacherbar .phaseinfo { min-width: 190px; padding: 0 8px; }
#teacherbar .phaseinfo .n { font-size: 11px; letter-spacing: .18em; text-transform: uppercase; color: var(--accent); }
#teacherbar .phaseinfo .t { font-size: 14px; color: var(--ink); font-family: var(--serif); }
#teacherbar .iconbtn {
  background: transparent; border: none; color: var(--muted); cursor: pointer;
  font-size: 18px; width: 36px; height: 36px; border-radius: 8px;
}
#teacherbar .iconbtn:hover { color: var(--ink); background: rgba(255,255,255,.06); }
#teacherbar .iconbtn.active { color: var(--accent); }

/* Start screen */
#start {
  position: fixed; inset: 0; z-index: 50; display: flex; flex-direction: column;
  align-items: center; justify-content: center; text-align: center;
  background: radial-gradient(120% 100% at 50% 20%, #2a2016, #0a0908 70%);
  font-family: var(--sans); transition: opacity .8s ease;
}
#start.hide { opacity: 0; pointer-events: none; }
#start .eyebrow { letter-spacing: .42em; text-transform: uppercase; font-size: 12px; color: var(--accent); }
#start h1 { font-family: var(--serif); font-size: clamp(38px, 8vw, 82px); color: var(--ink);
  font-weight: 500; margin: 16px 0 6px; }
#start .sub { color: var(--muted); font-size: 16px; max-width: 44ch; line-height: 1.5; margin-bottom: 34px; }
#start .meta { color: var(--muted); font-size: 12px; margin-top: 26px; letter-spacing: .1em; }
#start .btn-primary { font-size: 16px; padding: 15px 40px; border-radius: 10px; }

.hidden { display: none !important; }
`;

let els = {};

export function initUI() {
  const style = document.createElement('style');
  style.textContent = styles;
  document.head.appendChild(style);

  const root = document.createElement('div');
  root.innerHTML = `
    <div id="grade"></div>
    <div id="bars"></div>
    <div id="fade"></div>

    <div id="titlecard">
      <div class="eyebrow" data-eyebrow></div>
      <div class="title" data-title></div>
      <div class="rule"></div>
    </div>

    <div id="objective">
      <span class="dot"></span>
      <span data-obj-text></span>
      <span class="timer hidden" data-timer></span>
    </div>

    <div id="prompt"><kbd>E</kbd><span data-prompt-text>Interact</span></div>
    <div id="subtitle"></div>

    <div id="headline" class="modal-wrap">
      <div class="paper">
        <div class="masthead">Bosnische Post &nbsp;·&nbsp; 28 June 1914</div>
        <h2 data-headline></h2>
        <p data-headline-body></p>
        <button class="btn btn-primary" data-headline-close>Close</button>
      </div>
    </div>

    <div id="quiz" class="modal-wrap">
      <div class="panel">
        <div class="progress" data-quiz-progress></div>
        <h3 data-quiz-prompt></h3>
        <div class="choices" data-quiz-choices></div>
        <div class="feedback" data-quiz-feedback></div>
      </div>
    </div>

    <div id="teacherbar">
      <button class="navbtn" data-prev title="Previous phase (←)">‹</button>
      <div class="phaseinfo">
        <div class="n" data-phase-n></div>
        <div class="t" data-phase-t></div>
      </div>
      <button class="navbtn" data-next title="Next phase (→)">›</button>
      <button class="iconbtn" data-pause title="Pause all">⏸</button>
      <button class="iconbtn active" data-mute title="Toggle narration">🔊</button>
    </div>

    <div id="start">
      <div class="eyebrow">SlideQuest · Cinematic Timeline</div>
      <h1>Sarajevo, 1914</h1>
      <div class="sub">The morning a single wrong turn set the whole world on a road to war. A grade-7 history lesson you play, not watch.</div>
      <button class="btn btn-primary" data-start>Begin Lesson</button>
      <div class="meta">Headphones recommended · 6 phases · ~6 min</div>
    </div>
  `;
  document.getElementById('app').appendChild(root);

  els = {
    bars: document.getElementById('bars'),
    fade: document.getElementById('fade'),
    titlecard: document.getElementById('titlecard'),
    eyebrow: root.querySelector('[data-eyebrow]'),
    title: root.querySelector('[data-title]'),
    objective: document.getElementById('objective'),
    objText: root.querySelector('[data-obj-text]'),
    timer: root.querySelector('[data-timer]'),
    prompt: document.getElementById('prompt'),
    promptText: root.querySelector('[data-prompt-text]'),
    subtitle: document.getElementById('subtitle'),
    headline: document.getElementById('headline'),
    headlineTitle: root.querySelector('[data-headline]'),
    headlineBody: root.querySelector('[data-headline-body]'),
    headlineClose: root.querySelector('[data-headline-close]'),
    quiz: document.getElementById('quiz'),
    quizProgress: root.querySelector('[data-quiz-progress]'),
    quizPrompt: root.querySelector('[data-quiz-prompt]'),
    quizChoices: root.querySelector('[data-quiz-choices]'),
    quizFeedback: root.querySelector('[data-quiz-feedback]'),
    teacherbar: document.getElementById('teacherbar'),
    prev: root.querySelector('[data-prev]'),
    next: root.querySelector('[data-next]'),
    pause: root.querySelector('[data-pause]'),
    mute: root.querySelector('[data-mute]'),
    phaseN: root.querySelector('[data-phase-n]'),
    phaseT: root.querySelector('[data-phase-t]'),
    start: document.getElementById('start'),
    startBtn: root.querySelector('[data-start]'),
  };
  return els;
}

// --- Title card ---
export function showTitleCard(eyebrow, title) {
  els.eyebrow.textContent = eyebrow || '';
  els.title.textContent = title || '';
  els.titlecard.classList.add('show');
}
export function hideTitleCard() { els.titlecard.classList.remove('show'); }

// --- Subtitle ---
export function showSubtitle(text) {
  els.subtitle.textContent = text;
  els.subtitle.classList.add('show');
}
export function hideSubtitle() { els.subtitle.classList.remove('show'); }

// --- Objective ---
export function showObjective(text) {
  els.objText.textContent = text;
  els.objective.classList.remove('done');
  els.objective.classList.add('show');
}
export function markObjectiveDone() { els.objective.classList.add('done'); }
export function hideObjective() {
  els.objective.classList.remove('show');
  els.timer.classList.add('hidden');
}
export function setTimer(seconds) {
  if (seconds == null) { els.timer.classList.add('hidden'); return; }
  els.timer.classList.remove('hidden');
  els.timer.textContent = `${Math.ceil(seconds)}s`;
}

// --- Interaction prompt ---
export function showPrompt(text = 'Interact') {
  els.promptText.textContent = text;
  els.prompt.classList.add('show');
}
export function hidePrompt() { els.prompt.classList.remove('show'); }

// --- Cinematic bars ---
export function setCinematic(on) { els.bars.classList.toggle('cinematic', on); }

// --- Fade ---
export function fade(on) {
  return new Promise((resolve) => {
    els.fade.classList.toggle('on', on);
    setTimeout(resolve, 600);
  });
}

// --- Headline modal ---
export function showHeadline(title, body, onClose) {
  els.headlineTitle.textContent = title;
  els.headlineBody.textContent = body;
  els.headline.classList.add('show');
  els.headlineClose.onclick = () => {
    els.headline.classList.remove('show');
    onClose?.();
  };
}

// --- Quiz ---
export function showQuiz(quiz, onComplete) {
  let idx = 0;
  let correctCount = 0;
  els.quiz.classList.add('show');

  const render = () => {
    const q = quiz.questions[idx];
    els.quizProgress.textContent = `Question ${idx + 1} of ${quiz.questions.length}`;
    els.quizPrompt.textContent = q.prompt;
    els.quizFeedback.textContent = '';
    els.quizChoices.innerHTML = '';
    q.choices.forEach((choice, i) => {
      const b = document.createElement('button');
      b.className = 'choice';
      b.textContent = choice;
      b.onclick = () => answer(i, b, q);
      els.quizChoices.appendChild(b);
    });
  };

  const answer = (i, btn, q) => {
    const buttons = [...els.quizChoices.querySelectorAll('.choice')];
    buttons.forEach((b) => (b.disabled = true));
    if (i === q.answerIndex) {
      btn.classList.add('correct');
      correctCount++;
      els.quizFeedback.textContent = 'Correct.';
      setTimeout(nextQ, 900);
    } else {
      btn.classList.add('wrong');
      buttons[q.answerIndex].classList.add('correct');
      els.quizFeedback.textContent = q.hint ? `Not quite — ${q.hint}` : 'Not quite.';
      setTimeout(nextQ, 1900);
    }
  };

  const nextQ = () => {
    idx++;
    if (idx >= quiz.questions.length) {
      els.quiz.classList.remove('show');
      onComplete?.(correctCount, quiz.questions.length);
    } else {
      render();
    }
  };

  render();
}

// --- Teacher bar ---
export function setPhaseInfo(index, total, title) {
  els.phaseN.textContent = `Phase ${index + 1} / ${total}`;
  els.phaseT.textContent = title;
}
export function setNavEnabled(prev, next) {
  els.prev.disabled = !prev;
  els.next.disabled = !next;
}
export function setPaused(paused) {
  els.pause.classList.toggle('active', paused);
  els.pause.textContent = paused ? '▶' : '⏸';
}
export function setMuteIcon(muted) {
  els.mute.classList.toggle('active', !muted);
  els.mute.textContent = muted ? '🔇' : '🔊';
}

export function onTeacherControls({ onPrev, onNext, onPause, onMute }) {
  els.prev.onclick = onPrev;
  els.next.onclick = onNext;
  els.pause.onclick = onPause;
  els.mute.onclick = onMute;
  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') onNext?.();
    if (e.key === 'ArrowLeft') onPrev?.();
  });
}

// --- Start screen ---
export function onStart(cb) { els.startBtn.onclick = cb; }
export function hideStart() { els.start.classList.add('hide'); }
