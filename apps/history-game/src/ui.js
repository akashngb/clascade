// All 2D overlay UI: intertitle cards, narration subtitles, objectives, the
// quiz, the newspaper, the closing telegram, screen fades, the start screen,
// the chapter rail, and the teacher bar. Pure DOM — the 3D layer never
// touches these.
//
// Art direction: 1914 is the silent-film era, so the overlay speaks that
// screen language. Title cards are intertitles — coal-black cards with a
// double keyline frame and engraved caps. Interactive documents (newspaper,
// examination, telegram) are period paper artifacts. The HUD around them
// stays quiet: bone text, imperial brass accents, oxblood only for war.

const styles = `
:root {
  --coal: #0c0a08;
  --bone: #ece3d0;
  --smoke: #a39784;
  --brass: #c8a45c;
  --brass-bright: #e2c078;
  --oxblood: #93392a;
  --moss: #7fa06f;
  --paper: #e9dfc6;
  --paper-ink: #211a10;
  --panel: rgba(14, 11, 8, 0.92);
  --display: "Marcellus", "Iowan Old Style", Georgia, serif;
  --serif: "Cormorant Garamond", "Palatino Linotype", Georgia, serif;
  --sans: "Archivo", -apple-system, "Segoe UI", Roboto, sans-serif;
}
* { box-sizing: border-box; }
html, body { margin: 0; height: 100%; background: var(--coal); overflow: hidden; }
#app { position: fixed; inset: 0; }
canvas { display: block; }

/* ---- Film treatment: grain + vignette --------------------------------- */
#grain {
  position: fixed; inset: -100px; pointer-events: none; z-index: 8;
  opacity: .05;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)'/%3E%3C/svg%3E");
  animation: grain 900ms steps(3) infinite;
}
@keyframes grain {
  0% { transform: translate(0, 0); }
  33% { transform: translate(-40px, 25px); }
  66% { transform: translate(30px, -35px); }
  100% { transform: translate(0, 0); }
}
#grade {
  position: fixed; inset: 0; pointer-events: none; z-index: 5;
  box-shadow: inset 0 0 240px 50px rgba(0,0,0,0.6);
  background: radial-gradient(120% 90% at 50% 30%, rgba(255, 210, 140, 0.045), transparent 60%);
}

/* ---- Letterbox + chapter rail ------------------------------------------ */
#bars { position: fixed; inset: 0; pointer-events: none; z-index: 6; }
#bars::before, #bars::after {
  content: ""; position: absolute; left: 0; right: 0; height: 7vh;
  background: #050403; transition: height .9s cubic-bezier(.4, 0, .2, 1);
}
#bars::before { top: 0; } #bars::after { bottom: 0; }
#bars.cinematic::before, #bars.cinematic::after { height: 12vh; }

#rail {
  position: fixed; top: 0; left: 50%; transform: translateX(-50%);
  height: 7vh; min-height: 44px; z-index: 26;
  display: flex; align-items: center; gap: clamp(14px, 3vw, 34px);
}
#rail .ch {
  appearance: none; background: none; border: none; cursor: pointer;
  font-family: var(--display); font-size: 15px; letter-spacing: .14em;
  color: rgba(200, 164, 92, .38); padding: 6px 2px; position: relative;
  transition: color .3s ease;
}
#rail .ch:hover { color: var(--smoke); }
#rail .ch::after {
  content: ""; position: absolute; left: 50%; bottom: 0; height: 1px; width: 0;
  background: var(--brass); transform: translateX(-50%); transition: width .4s ease;
}
#rail .ch.seen { color: var(--smoke); }
#rail .ch.active { color: var(--brass-bright); }
#rail .ch.active::after { width: 100%; }
#rail .ch .tip {
  position: absolute; top: calc(100% + 2px); left: 50%; transform: translateX(-50%);
  white-space: nowrap; font-family: var(--sans); font-size: 10px;
  letter-spacing: .22em; text-transform: uppercase; color: var(--smoke);
  opacity: 0; transition: opacity .25s ease; pointer-events: none;
}
#rail .ch:hover .tip { opacity: 1; }

/* ---- Screen fade -------------------------------------------------------- */
#fade {
  position: fixed; inset: 0; background: #030202; z-index: 40;
  opacity: 0; transition: opacity .55s ease; pointer-events: none;
}
#fade.on { opacity: 1; }

/* ---- Intertitle (title / date card) ------------------------------------ */
#titlecard {
  position: fixed; inset: 0; z-index: 20; display: flex;
  align-items: center; justify-content: center;
  opacity: 0; transition: opacity .9s ease; pointer-events: none;
  background: radial-gradient(70% 60% at 50% 50%, rgba(3,2,2,.72), rgba(3,2,2,.25) 70%, transparent);
}
#titlecard.show { opacity: 1; }
#titlecard .frame {
  position: relative; text-align: center; padding: 46px 64px;
  border: 1px solid rgba(200, 164, 92, .55); animation: flicker 3.4s infinite;
}
#titlecard .frame::before {
  content: ""; position: absolute; inset: 5px;
  border: 1px solid rgba(200, 164, 92, .25); pointer-events: none;
}
#titlecard .frame::after {
  content: "❧"; position: absolute; left: 50%; top: -11px; transform: translateX(-50%);
  background: #060504; padding: 0 12px; color: var(--brass); font-size: 14px;
}
#titlecard .eyebrow {
  font-family: var(--sans); font-weight: 500; letter-spacing: .5em;
  text-transform: uppercase; font-size: 11px; color: var(--brass);
  margin-bottom: 20px; padding-left: .5em;
}
#titlecard .title {
  font-family: var(--display); font-size: clamp(30px, 5.6vw, 62px);
  color: var(--bone); line-height: 1.14; max-width: 17ch;
  text-shadow: 0 2px 30px rgba(0,0,0,.7);
}
@keyframes flicker {
  0%, 100% { opacity: 1; } 92% { opacity: 1; }
  93% { opacity: .86; } 94% { opacity: .98; } 96% { opacity: .9; } 97% { opacity: 1; }
}

/* ---- Narration subtitle ------------------------------------------------- */
#subtitle {
  position: fixed; left: 50%; bottom: 14vh; transform: translateX(-50%);
  z-index: 15; max-width: min(860px, 86vw); text-align: center;
  font-family: var(--serif); font-weight: 500;
  font-size: clamp(18px, 2.2vw, 25px); line-height: 1.45; color: var(--bone);
  opacity: 0; transition: opacity .5s ease; pointer-events: none;
  padding: 18px 40px;
  background: radial-gradient(80% 100% at 50% 60%, rgba(4,3,2,.62), transparent 75%);
  text-shadow: 0 2px 14px rgba(0,0,0,.95);
}
#subtitle.show { opacity: 1; }

/* ---- Objective docket --------------------------------------------------- */
#objective {
  position: fixed; top: calc(7vh + 20px); left: 26px; z-index: 15;
  max-width: 330px; padding: 13px 18px 13px 16px;
  background: var(--panel); border: 1px solid rgba(200,164,92,.28);
  border-left: 3px solid var(--brass);
  font-family: var(--sans); color: var(--bone);
  opacity: 0; transform: translateX(-12px);
  transition: opacity .4s ease, transform .4s ease, border-color .4s ease;
  pointer-events: none; backdrop-filter: blur(6px);
}
#objective.show { opacity: 1; transform: translateX(0); }
#objective .tag {
  display: flex; align-items: center; gap: 8px;
  font-size: 10px; letter-spacing: .3em; text-transform: uppercase;
  color: var(--brass); margin-bottom: 7px;
}
#objective .tag .mark { font-size: 12px; line-height: 1; }
#objective .body { font-size: 13.5px; line-height: 1.5; color: var(--bone); }
#objective .timer {
  font-variant-numeric: tabular-nums; color: var(--brass-bright);
  font-weight: 600; margin-left: 6px;
}
#objective.done { border-left-color: var(--moss); }
#objective.done .tag { color: var(--moss); }

/* ---- Interaction prompt ------------------------------------------------- */
#prompt {
  position: fixed; left: 50%; bottom: 26vh; transform: translateX(-50%);
  z-index: 15; display: flex; align-items: center; gap: 10px;
  font-family: var(--sans); font-size: 13px; letter-spacing: .06em;
  color: var(--bone); background: var(--panel); padding: 10px 18px;
  border: 1px solid rgba(200,164,92,.35);
  opacity: 0; transition: opacity .2s ease; pointer-events: none;
}
#prompt.show { opacity: 1; }
#prompt kbd {
  font-family: var(--sans); font-weight: 700; font-size: 12px;
  color: #171004; background: var(--brass); padding: 2px 8px;
  border-radius: 3px; box-shadow: 0 2px 0 rgba(0,0,0,.5);
}

/* ---- Hint line (movement keys) ------------------------------------------ */
#hint {
  position: fixed; left: 50%; bottom: calc(7vh + 14px); transform: translateX(-50%);
  z-index: 14; font-family: var(--sans); font-size: 11px; letter-spacing: .2em;
  text-transform: uppercase; color: rgba(163,151,132,.75);
  opacity: 0; transition: opacity .6s ease; pointer-events: none;
}
#hint.show { opacity: 1; }
#hint kbd { color: var(--bone); font-family: var(--sans); }

/* ---- Paper artifacts (newspaper / exam / telegram) ---------------------- */
.artifact-wrap {
  position: fixed; inset: 0; z-index: 30; display: none;
  align-items: center; justify-content: center;
  background: rgba(2,1,1,.6); backdrop-filter: blur(3px);
}
.artifact-wrap.show { display: flex; }
.paper {
  position: relative; width: min(600px, 92vw); max-height: 86vh; overflow-y: auto;
  background:
    radial-gradient(120% 100% at 20% 0%, rgba(120, 90, 40, .12), transparent 50%),
    linear-gradient(170deg, #eee4cb, #e3d5b4);
  color: var(--paper-ink); padding: 34px 40px;
  box-shadow: 0 40px 90px rgba(0,0,0,.75), inset 0 0 60px rgba(120,90,40,.12);
}
.paper.tilt { transform: rotate(-.6deg); }

/* Newspaper */
#headline .masthead {
  font-family: var(--display); text-align: center; font-size: clamp(22px, 3.4vw, 32px);
  letter-spacing: .08em; border-bottom: 3px double var(--paper-ink);
  padding-bottom: 8px; margin: 0 0 4px;
}
#headline .dateline {
  display: flex; justify-content: space-between; font-family: var(--sans);
  font-size: 10.5px; letter-spacing: .18em; text-transform: uppercase;
  border-bottom: 1px solid var(--paper-ink); padding: 6px 2px; margin-bottom: 16px;
}
#headline h2 {
  font-family: var(--serif); font-weight: 700;
  font-size: clamp(26px, 4.4vw, 42px); line-height: 1.08; margin: 4px 0 14px;
  text-align: center;
}
#headline .cols {
  font-family: var(--serif); font-size: 16.5px; line-height: 1.45;
  column-count: 2; column-gap: 22px; column-rule: 1px solid rgba(33,26,16,.35);
  text-align: justify; margin-bottom: 20px;
}
#headline .cols::first-letter {
  font-family: var(--display); font-size: 3.1em; float: left;
  line-height: .82; padding: 4px 6px 0 0;
}
@media (max-width: 560px) { #headline .cols { column-count: 1; } }

/* Examination (quiz) */
#quiz .exam-head {
  text-align: center; border-bottom: 2px solid var(--paper-ink);
  padding-bottom: 12px; margin-bottom: 18px;
}
#quiz .exam-head .k {
  font-family: var(--sans); font-size: 10px; letter-spacing: .34em;
  text-transform: uppercase; color: #6b5836;
}
#quiz .exam-head h3 {
  font-family: var(--display); font-size: 24px; margin: 6px 0 0; letter-spacing: .04em;
}
#quiz .progress {
  font-family: var(--sans); font-size: 10.5px; letter-spacing: .3em;
  text-transform: uppercase; color: #6b5836; margin-bottom: 10px;
}
#quiz .q {
  font-family: var(--serif); font-weight: 600; font-size: 21px;
  line-height: 1.3; margin: 0 0 16px;
}
#quiz .choices { display: grid; gap: 9px; }
#quiz button.choice {
  display: flex; align-items: baseline; gap: 12px; text-align: left;
  padding: 11px 14px; cursor: pointer;
  background: rgba(33,26,16,.04); color: var(--paper-ink);
  border: 1px solid rgba(33,26,16,.35); font-family: var(--serif);
  font-size: 16.5px; line-height: 1.35; transition: all .15s ease;
}
#quiz button.choice .letter {
  font-family: var(--display); font-size: 14px; color: #6b5836; flex: none;
}
#quiz button.choice:hover:not(:disabled) {
  background: rgba(33,26,16,.09); border-color: var(--paper-ink);
}
#quiz button.choice.correct {
  background: rgba(90, 120, 70, .18); border-color: #5a7846;
  box-shadow: inset 3px 0 0 #5a7846;
}
#quiz button.choice.wrong {
  background: rgba(147, 57, 42, .14); border-color: var(--oxblood);
  box-shadow: inset 3px 0 0 var(--oxblood);
}
#quiz .feedback {
  margin-top: 14px; font-family: var(--serif); font-style: italic;
  font-size: 15.5px; color: #4c3d24; min-height: 22px;
}

/* Telegram (lesson recap) */
#recap .tg-head {
  display: flex; justify-content: space-between; align-items: baseline;
  border-bottom: 2px solid var(--paper-ink); padding-bottom: 10px; margin-bottom: 16px;
}
#recap .tg-head h3 { font-family: var(--display); letter-spacing: .18em; font-size: 22px; margin: 0; }
#recap .tg-head .k { font-family: var(--sans); font-size: 10px; letter-spacing: .26em; color: #6b5836; }
#recap .score {
  font-family: var(--serif); font-size: 19px; margin: 0 0 18px; line-height: 1.4;
}
#recap .score b { font-family: var(--display); font-size: 26px; }
#recap .chain { list-style: none; margin: 0 0 22px; padding: 0; }
#recap .chain li {
  display: flex; gap: 14px; padding: 8px 0;
  border-bottom: 1px dotted rgba(33,26,16,.4);
  font-family: var(--serif); font-size: 16px; line-height: 1.35;
}
#recap .chain .date {
  font-family: var(--sans); font-size: 11px; letter-spacing: .12em; font-weight: 600;
  color: #6b5836; flex: none; width: 74px; padding-top: 3px; text-transform: uppercase;
}
#recap .stamp {
  position: absolute; right: 34px; top: 26px; transform: rotate(8deg);
  font-family: var(--sans); font-weight: 700; font-size: 12px; letter-spacing: .3em;
  color: var(--oxblood); border: 2px solid var(--oxblood);
  padding: 5px 10px; opacity: .8; text-transform: uppercase;
}

/* ---- Buttons ------------------------------------------------------------ */
.btn {
  font-family: var(--sans); border: none; cursor: pointer;
  padding: 12px 26px; font-size: 12.5px; font-weight: 600;
  letter-spacing: .22em; text-transform: uppercase; transition: all .18s ease;
}
.btn-ink {
  background: var(--paper-ink); color: var(--paper);
}
.btn-ink:hover { background: #3a2f1c; }
.btn-brass { background: var(--brass); color: #171004; }
.btn-brass:hover { background: var(--brass-bright); }
.btn-ghost {
  background: transparent; color: var(--smoke);
  border: 1px solid rgba(163,151,132,.5);
}
.btn-ghost:hover { color: var(--bone); border-color: var(--bone); }

/* ---- Teacher bar --------------------------------------------------------- */
#teacherbar {
  position: fixed; left: 50%; bottom: 14px; transform: translateX(-50%);
  z-index: 25; display: flex; align-items: center; gap: 4px;
  background: var(--panel); border: 1px solid rgba(200,164,92,.25);
  padding: 7px 10px; font-family: var(--sans);
  backdrop-filter: blur(8px); box-shadow: 0 14px 40px rgba(0,0,0,.6);
}
#teacherbar .navbtn {
  background: transparent; color: var(--bone); border: 1px solid transparent;
  width: 38px; height: 38px; cursor: pointer; font-size: 19px; line-height: 1;
  display: grid; place-items: center; transition: all .15s ease;
}
#teacherbar .navbtn:hover:not(:disabled) { color: var(--brass-bright); border-color: rgba(200,164,92,.4); }
#teacherbar .navbtn:disabled { opacity: .25; cursor: default; }
#teacherbar .phaseinfo { min-width: 200px; padding: 0 14px; text-align: center; }
#teacherbar .phaseinfo .n {
  font-size: 9.5px; letter-spacing: .3em; text-transform: uppercase; color: var(--brass);
}
#teacherbar .phaseinfo .t {
  font-size: 15px; color: var(--bone); font-family: var(--display); margin-top: 1px;
}
#teacherbar .sep { width: 1px; height: 26px; background: rgba(200,164,92,.2); margin: 0 6px; }
#teacherbar .iconbtn {
  background: transparent; border: none; color: var(--smoke); cursor: pointer;
  font-size: 16px; width: 34px; height: 34px; transition: color .15s ease;
}
#teacherbar .iconbtn:hover { color: var(--bone); }
#teacherbar .iconbtn.active { color: var(--brass-bright); }

/* ---- Start screen -------------------------------------------------------- */
#start {
  position: fixed; inset: 0; z-index: 50; display: flex;
  align-items: center; justify-content: center;
  background: radial-gradient(90% 80% at 50% 30%, #191309, #060403 75%);
  font-family: var(--sans); transition: opacity 1s ease;
}
#start.hide { opacity: 0; pointer-events: none; }
#start .poster {
  position: relative; text-align: center; padding: clamp(30px, 6vh, 64px) clamp(30px, 7vw, 90px);
  border: 1px solid rgba(200,164,92,.5); animation: flicker 5s infinite;
  max-width: 92vw;
}
#start .poster::before {
  content: ""; position: absolute; inset: 6px;
  border: 1px solid rgba(200,164,92,.22);
  /* Decorative frame paints above the poster's static children — without
     this it swallows every hover and click on the begin button. */
  pointer-events: none;
}
#start .presents {
  font-size: 11px; letter-spacing: .5em; text-transform: uppercase;
  color: var(--smoke); padding-left: .5em;
}
#start .no {
  font-family: var(--display); color: var(--brass); font-size: 13px;
  letter-spacing: .3em; margin-top: 14px;
}
#start h1 {
  font-family: var(--display); font-weight: 400;
  font-size: clamp(44px, 9vw, 96px); color: var(--bone);
  margin: 6px 0 0; line-height: 1.02; letter-spacing: .02em;
}
#start .year {
  font-family: var(--display); font-size: clamp(22px, 3.4vw, 34px);
  color: var(--brass-bright); letter-spacing: .5em; padding-left: .5em; margin-top: 4px;
}
#start .rule {
  width: 90px; height: 1px; background: var(--brass); margin: 26px auto;
  position: relative;
}
#start .rule::after {
  content: "✦"; position: absolute; left: 50%; top: 50%;
  transform: translate(-50%, -52%); background: transparent;
  color: var(--brass); font-size: 10px; text-shadow: 0 0 8px #060403;
  background: radial-gradient(circle, #0b0805 40%, transparent 70%); padding: 0 8px;
}
#start .sub {
  color: var(--smoke); font-family: var(--serif); font-size: 17.5px;
  max-width: 46ch; line-height: 1.55; margin: 0 auto 30px;
}
#start .meta {
  color: rgba(163,151,132,.7); font-size: 10px; margin-top: 24px;
  letter-spacing: .28em; text-transform: uppercase;
}

.hidden { display: none !important; }

@media (prefers-reduced-motion: reduce) {
  #grain, #titlecard .frame, #start .poster { animation: none; }
  * { transition-duration: .01ms !important; }
}
`;

let els = {};
let jumpCb = null;
let railTotal = 0;

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

export function initUI() {
  const style = document.createElement('style');
  style.textContent = styles;
  document.head.appendChild(style);

  const root = document.createElement('div');
  root.innerHTML = `
    <div id="grade"></div>
    <div id="grain"></div>
    <div id="bars"></div>
    <div id="fade"></div>
    <div id="rail"></div>

    <div id="titlecard">
      <div class="frame">
        <div class="eyebrow" data-eyebrow></div>
        <div class="title" data-title></div>
      </div>
    </div>

    <div id="objective">
      <div class="tag"><span class="mark" data-obj-mark>◉</span><span data-obj-label>Objective</span><span class="timer hidden" data-timer></span></div>
      <div class="body" data-obj-text></div>
    </div>

    <div id="prompt"><kbd>E</kbd><span data-prompt-text>Interact</span></div>
    <div id="hint"><kbd>W A S D</kbd> move &nbsp;·&nbsp; drag to look</div>
    <div id="subtitle"></div>

    <div id="headline" class="artifact-wrap">
      <div class="paper tilt">
        <div class="masthead">Bosnische Post</div>
        <div class="dateline"><span>Sarajevo, Sonntag</span><span>28. Juni 1914</span><span>Nr. 146</span></div>
        <h2 data-headline></h2>
        <div class="cols" data-headline-body></div>
        <div style="text-align:center"><button class="btn btn-ink" data-headline-close>Put the paper down</button></div>
      </div>
    </div>

    <div id="quiz" class="artifact-wrap">
      <div class="paper">
        <div class="exam-head">
          <div class="k">Checkpoint &nbsp;·&nbsp; Sarajevo, 1914</div>
          <h3>Examination</h3>
        </div>
        <div class="progress" data-quiz-progress></div>
        <div class="q" data-quiz-prompt></div>
        <div class="choices" data-quiz-choices></div>
        <div class="feedback" data-quiz-feedback></div>
      </div>
    </div>

    <div id="recap" class="artifact-wrap">
      <div class="paper">
        <div class="stamp" data-recap-stamp>Lesson complete</div>
        <div class="tg-head">
          <h3>Telegram</h3>
          <div class="k">Received · 4 Aug 1914</div>
        </div>
        <p class="score" data-recap-score></p>
        <ul class="chain">
          <li><span class="date">28 June</span><span>A wrong turn in Sarajevo — Archduke Franz Ferdinand is assassinated.</span></li>
          <li><span class="date">28 July</span><span>Austria-Hungary blames Serbia and declares war.</span></li>
          <li><span class="date">1–3 Aug</span><span>The alliances pull: Germany declares war on Russia, then France.</span></li>
          <li><span class="date">4 Aug</span><span>Germany marches through neutral Belgium — Britain enters. Europe is at war.</span></li>
        </ul>
        <div style="display:flex; gap:12px; justify-content:center">
          <button class="btn btn-ink" data-recap-close>Close</button>
          <button class="btn btn-ghost" data-recap-replay style="color:#6b5836;border-color:#6b5836">Replay lesson</button>
        </div>
      </div>
    </div>

    <div id="teacherbar">
      <button class="navbtn" data-prev title="Previous phase (←)">‹</button>
      <div class="phaseinfo">
        <div class="n" data-phase-n></div>
        <div class="t" data-phase-t></div>
      </div>
      <button class="navbtn" data-next title="Next phase (→)">›</button>
      <div class="sep"></div>
      <button class="iconbtn" data-pause title="Pause all">⏸</button>
      <button class="iconbtn active" data-mute title="Toggle narration">🔊</button>
    </div>

    <div id="start">
      <div class="poster">
        <div class="presents">SlideQuest presents</div>
        <div class="no">Cinematic Timeline · Lesson Nº 1</div>
        <h1>Sarajevo</h1>
        <div class="year">1914</div>
        <div class="rule"></div>
        <div class="sub">One June morning, a driver took a wrong turn — and the whole world followed him down it. Step into the street where the First World War began.</div>
        <button class="btn btn-brass" data-start>Begin the lesson</button>
        <div class="meta">History · Grade 7 · Six chapters · Sound on</div>
      </div>
    </div>
  `;
  document.getElementById('app').appendChild(root);

  els = {
    bars: document.getElementById('bars'),
    fade: document.getElementById('fade'),
    rail: document.getElementById('rail'),
    titlecard: document.getElementById('titlecard'),
    eyebrow: root.querySelector('[data-eyebrow]'),
    title: root.querySelector('[data-title]'),
    objective: document.getElementById('objective'),
    objText: root.querySelector('[data-obj-text]'),
    objLabel: root.querySelector('[data-obj-label]'),
    objMark: root.querySelector('[data-obj-mark]'),
    timer: root.querySelector('[data-timer]'),
    prompt: document.getElementById('prompt'),
    promptText: root.querySelector('[data-prompt-text]'),
    hint: document.getElementById('hint'),
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
    recap: document.getElementById('recap'),
    recapScore: root.querySelector('[data-recap-score]'),
    recapClose: root.querySelector('[data-recap-close]'),
    recapReplay: root.querySelector('[data-recap-replay]'),
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

// --- Chapter rail ---
function buildRail(total, titles = []) {
  railTotal = total;
  els.rail.innerHTML = '';
  for (let i = 0; i < total; i++) {
    const b = document.createElement('button');
    b.className = 'ch';
    b.innerHTML = `${ROMAN[i] || i + 1}<span class="tip">${titles[i] || ''}</span>`;
    b.onclick = () => jumpCb?.(i);
    els.rail.appendChild(b);
  }
}
export function setChapters(titles) { buildRail(titles.length, titles); }
export function onJumpTo(cb) { jumpCb = cb; }

// --- Intertitle card ---
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

// --- Objective docket ---
export function showObjective(text) {
  els.objText.textContent = text;
  els.objLabel.textContent = 'Objective';
  els.objMark.textContent = '◉';
  els.objective.classList.remove('done');
  els.objective.classList.add('show');
}
export function markObjectiveDone() {
  els.objective.classList.add('done');
  els.objLabel.textContent = 'Complete';
  els.objMark.textContent = '✓';
}
export function hideObjective() {
  els.objective.classList.remove('show');
  els.timer.classList.add('hidden');
}
export function setTimer(seconds) {
  if (seconds == null) { els.timer.classList.add('hidden'); return; }
  els.timer.classList.remove('hidden');
  els.timer.textContent = `${Math.ceil(seconds)}s`;
}

// --- Interaction prompt / movement hint ---
export function showPrompt(text = 'Interact') {
  els.promptText.textContent = text;
  els.prompt.classList.add('show');
}
export function hidePrompt() { els.prompt.classList.remove('show'); }
export function showHint(on = true) { els.hint.classList.toggle('show', on); }

// --- Cinematic bars ---
export function setCinematic(on) { els.bars.classList.toggle('cinematic', on); }

// --- Fade ---
export function fade(on) {
  return new Promise((resolve) => {
    els.fade.classList.toggle('on', on);
    setTimeout(resolve, 550);
  });
}

// --- Newspaper artifact ---
export function showHeadline(title, body, onClose) {
  els.headlineTitle.textContent = title;
  els.headlineBody.textContent = body;
  els.headline.classList.add('show');
  els.headlineClose.onclick = () => {
    els.headline.classList.remove('show');
    onClose?.();
  };
}

// --- Examination (quiz) ---
export function showQuiz(quiz, onComplete) {
  let idx = 0;
  let correctCount = 0;
  els.quiz.classList.add('show');
  const LETTERS = ['A', 'B', 'C', 'D', 'E'];

  const render = () => {
    const q = quiz.questions[idx];
    els.quizProgress.textContent = `Question ${ROMAN[idx]} of ${ROMAN[quiz.questions.length - 1]}`;
    els.quizPrompt.textContent = q.prompt;
    els.quizFeedback.textContent = '';
    els.quizChoices.innerHTML = '';
    q.choices.forEach((choice, i) => {
      const b = document.createElement('button');
      b.className = 'choice';
      b.innerHTML = `<span class="letter">${LETTERS[i]}.</span><span>${choice}</span>`;
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
      setTimeout(nextQ, 1000);
    } else {
      btn.classList.add('wrong');
      buttons[q.answerIndex].classList.add('correct');
      els.quizFeedback.textContent = q.hint ? `Not quite — ${q.hint}` : 'Not quite.';
      setTimeout(nextQ, 2100);
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

// --- Telegram recap ---
export function showRecap({ score, total, onReplay, onClose } = {}) {
  els.recapScore.innerHTML =
    `Examination returned: <b>${score} of ${total}</b> correct. ` +
    `You have followed the spark from one street corner to a world at war.`;
  els.recap.classList.add('show');
  els.recapClose.onclick = () => { els.recap.classList.remove('show'); onClose?.(); };
  els.recapReplay.onclick = () => { els.recap.classList.remove('show'); onReplay?.(); };
}

// --- Teacher bar ---
export function setPhaseInfo(index, total, title) {
  if (railTotal !== total) buildRail(total);
  els.phaseN.textContent = `Chapter ${ROMAN[index] || index + 1} of ${ROMAN[total - 1] || total}`;
  els.phaseT.textContent = title;
  [...els.rail.children].forEach((el, i) => {
    el.classList.toggle('active', i === index);
    el.classList.toggle('seen', i < index);
  });
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
