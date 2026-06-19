import { questionBank } from "./data/questions.js";
import { answerKey } from "./data/answers.js";

const STORAGE_KEY = "law-quiz-demo-state";

const state = {
  mode: "all",
  index: 0,
  answered: {},
  wrongIds: [],
  selectedPhase: "全部",
  selectedCategory: "全部"
};

const els = {
  phase: document.querySelector("[data-phase]"),
  category: document.querySelector("[data-category]"),
  counter: document.querySelector("[data-counter]"),
  question: document.querySelector("[data-question]"),
  feedback: document.querySelector("[data-feedback]"),
  progress: document.querySelector("[data-progress]"),
  accuracy: document.querySelector("[data-accuracy]"),
  wrongCount: document.querySelector("[data-wrong-count]"),
  completed: document.querySelector("[data-completed]"),
  wrongList: document.querySelector("[data-wrong-list]"),
  emptyWrong: document.querySelector("[data-empty-wrong]"),
  phaseSelect: document.querySelector("[data-phase-select]"),
  categorySelect: document.querySelector("[data-category-select]"),
  allModeButton: document.querySelector("[data-mode='all']"),
  wrongModeButton: document.querySelector("[data-mode='wrong']"),
  clearButton: document.querySelector("[data-clear]"),
  prevButton: document.querySelector("[data-prev]"),
  nextButton: document.querySelector("[data-next]"),
  answerButtons: [...document.querySelectorAll("[data-answer]")]
};

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const saved = JSON.parse(raw);
    state.answered = saved.answered || {};
    state.wrongIds = saved.wrongIds || [];
    state.selectedPhase = saved.selectedPhase || "全部";
    state.selectedCategory = saved.selectedCategory || "全部";
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function saveState() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      answered: state.answered,
      wrongIds: state.wrongIds,
      selectedPhase: state.selectedPhase,
      selectedCategory: state.selectedCategory
    })
  );
}

function validateBank() {
  const questionIds = new Set(questionBank.map((question) => question.id));
  const missingAnswers = questionBank.filter((question) => !answerKey[question.id]);
  const orphanAnswers = Object.keys(answerKey).filter((id) => !questionIds.has(id));

  if (missingAnswers.length || orphanAnswers.length) {
    console.warn("题库与答案不一致", { missingAnswers, orphanAnswers });
  }
}

function getPhases() {
  return ["全部", ...new Set(questionBank.map((question) => question.phase))];
}

function getCategories() {
  const phaseQuestions = questionBank.filter((question) => {
    return state.selectedPhase === "全部" || question.phase === state.selectedPhase;
  });
  return ["全部", ...new Set(phaseQuestions.map((question) => question.category))];
}

function getActiveQuestions() {
  const byCategory = questionBank.filter((question) => {
    const phaseMatches = state.selectedPhase === "全部" || question.phase === state.selectedPhase;
    const categoryMatches = state.selectedCategory === "全部" || question.category === state.selectedCategory;
    return phaseMatches && categoryMatches;
  });

  if (state.mode === "wrong") {
    return byCategory.filter((question) => state.wrongIds.includes(question.id));
  }

  return byCategory;
}

function clampIndex() {
  const questions = getActiveQuestions();
  state.index = Math.min(Math.max(state.index, 0), Math.max(questions.length - 1, 0));
}

function formatAnswer(value) {
  return value ? "正确" : "错误";
}

function setMode(mode) {
  state.mode = mode;
  state.index = 0;
  render();
}

function answerCurrent(value) {
  const questions = getActiveQuestions();
  const current = questions[state.index];
  if (!current) return;

  const expected = answerKey[current.id];
  if (!expected) {
    els.feedback.hidden = false;
    els.feedback.className = "feedback is-wrong";
    els.feedback.textContent = "这道题缺少答案，请检查 data/answers.js。";
    return;
  }

  const correct = expected.answer === value;
  state.answered[current.id] = { selected: value, correct, at: new Date().toISOString() };

  if (correct) {
    state.wrongIds = state.wrongIds.filter((id) => id !== current.id);
  } else if (!state.wrongIds.includes(current.id)) {
    state.wrongIds.push(current.id);
  }

  saveState();
  render();
}

function renderPhaseSelect() {
  const phases = getPhases();
  els.phaseSelect.innerHTML = phases
    .map((phase) => {
      const selected = phase === state.selectedPhase ? "selected" : "";
      return `<option value="${phase}" ${selected}>${phase}</option>`;
    })
    .join("");
}

function renderCategorySelect() {
  const categories = getCategories();
  if (!categories.includes(state.selectedCategory)) {
    state.selectedCategory = "全部";
    saveState();
  }
  els.categorySelect.innerHTML = categories
    .map((category) => {
      const selected = category === state.selectedCategory ? "selected" : "";
      return `<option value="${category}" ${selected}>${category}</option>`;
    })
    .join("");
}

function renderStats() {
  const answered = Object.values(state.answered);
  const correct = answered.filter((item) => item.correct).length;
  const accuracy = answered.length ? Math.round((correct / answered.length) * 100) : 0;

  els.completed.textContent = `${answered.length}/${questionBank.length}`;
  els.accuracy.textContent = `${accuracy}%`;
  els.wrongCount.textContent = String(state.wrongIds.length);
}

function renderWrongList() {
  const wrongQuestions = questionBank.filter((question) => state.wrongIds.includes(question.id));
  els.emptyWrong.hidden = wrongQuestions.length > 0;
  els.wrongList.innerHTML = wrongQuestions
    .map((question) => {
      const answer = answerKey[question.id];
      if (!answer) return "";
      return `
        <li>
          <button type="button" data-jump="${question.id}">
            <span>${question.category}</span>
            ${question.text}
          </button>
          <p>答案：${formatAnswer(answer.answer)}。${answer.explanation}</p>
        </li>
      `;
    })
    .join("");
}

function renderQuestion() {
  const questions = getActiveQuestions();
  clampIndex();
  const current = questions[state.index];

  els.allModeButton.classList.toggle("is-active", state.mode === "all");
  els.wrongModeButton.classList.toggle("is-active", state.mode === "wrong");
  els.wrongModeButton.disabled = state.wrongIds.length === 0;

  if (!current) {
    els.phase.textContent = state.mode === "wrong" ? "错题模式" : "暂无题目";
    els.category.textContent = "换个分类试试";
    els.counter.textContent = "0 / 0";
    els.question.textContent = state.mode === "wrong" ? "当前筛选下没有错题。" : "当前分类下没有题目。";
    els.feedback.hidden = true;
    els.progress.style.width = "0%";
    els.prevButton.disabled = true;
    els.nextButton.disabled = true;
    els.answerButtons.forEach((button) => {
      button.disabled = true;
      button.classList.remove("is-correct", "is-wrong", "is-selected");
    });
    return;
  }

  const answer = answerKey[current.id];
  const answered = state.answered[current.id];
  const progress = Math.round(((state.index + 1) / questions.length) * 100);

  els.phase.textContent = current.phase;
  els.category.textContent = current.category;
  els.counter.textContent = `${state.index + 1} / ${questions.length}`;
  els.question.textContent = current.text;
  els.progress.style.width = `${progress}%`;
  els.prevButton.disabled = state.index === 0;
  els.nextButton.disabled = state.index === questions.length - 1;

  els.answerButtons.forEach((button) => {
    const value = button.dataset.answer === "true";
    button.disabled = !answer;
    button.classList.toggle("is-selected", answered?.selected === value);
    button.classList.toggle("is-correct", Boolean(answered && answer) && value === answer.answer);
    button.classList.toggle("is-wrong", Boolean(answered && answer) && answered.selected === value && value !== answer.answer);
  });

  if (!answer) {
    els.feedback.hidden = false;
    els.feedback.className = "feedback is-wrong";
    els.feedback.textContent = "这道题缺少答案，请检查 data/answers.js。";
  } else if (answered) {
    els.feedback.hidden = false;
    els.feedback.className = answered.correct ? "feedback is-right" : "feedback is-wrong";
    els.feedback.innerHTML = `
      <strong>${answered.correct ? "答对了" : "答错了"}</strong>
      <span>正确答案：${formatAnswer(answer.answer)}。${answer.explanation}</span>
    `;
  } else {
    els.feedback.hidden = true;
    els.feedback.innerHTML = "";
  }
}

function render() {
  renderPhaseSelect();
  renderCategorySelect();
  renderQuestion();
  renderStats();
  renderWrongList();
}

function bindEvents() {
  els.answerButtons.forEach((button) => {
    button.addEventListener("click", () => answerCurrent(button.dataset.answer === "true"));
  });

  els.prevButton.addEventListener("click", () => {
    state.index -= 1;
    render();
  });

  els.nextButton.addEventListener("click", () => {
    state.index += 1;
    render();
  });

  els.allModeButton.addEventListener("click", () => setMode("all"));
  els.wrongModeButton.addEventListener("click", () => setMode("wrong"));

  els.clearButton.addEventListener("click", () => {
    state.answered = {};
    state.wrongIds = [];
    state.index = 0;
    state.mode = "all";
    saveState();
    render();
  });

  els.phaseSelect.addEventListener("change", (event) => {
    state.selectedPhase = event.target.value;
    state.selectedCategory = "全部";
    state.index = 0;
    saveState();
    render();
  });

  els.categorySelect.addEventListener("change", (event) => {
    state.selectedCategory = event.target.value;
    state.index = 0;
    saveState();
    render();
  });

  els.wrongList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-jump]");
    if (!button) return;

    const targetId = button.dataset.jump;
    state.mode = "all";
    state.selectedCategory = "全部";
    state.selectedPhase = "全部";
    state.index = questionBank.findIndex((question) => question.id === targetId);
    render();
  });
}

validateBank();
loadState();
bindEvents();
render();
