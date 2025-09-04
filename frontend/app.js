
const API = '/api/chat';

const chatEl = document.getElementById('chat');
const form = document.getElementById('composer');
const input = document.getElementById('prompt');
const sendBtn = document.getElementById('send');
const clearBtn = document.getElementById('clear-btn');
const tpl = document.getElementById('msg-template');

let sessionId = localStorage.getItem('session_id') ||
  (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()));
localStorage.setItem('session_id', sessionId);

function addMessage(role, text, opts = {}) {
  const node = tpl.content.cloneNode(true);
  const wrap = node.querySelector('.msg');
  const bubble = node.querySelector('.bubble');
  const roleEl = node.querySelector('.role');
  const copyBtn = node.querySelector('.copy');
  wrap.classList.add(role);
  if (opts.loading) wrap.classList.add('loading');
  bubble.textContent = text;
  roleEl.textContent = role === 'user' ? 'Vous' : 'Assistant';

  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(bubble.textContent);
      copyBtn.textContent = 'Copié ✓';
      setTimeout(() => (copyBtn.textContent = 'Copier'), 1200);
    } catch {
      alert('Impossible de copier.');
    }
  });

  chatEl.appendChild(node);
  chatEl.scrollTop = chatEl.scrollHeight;
  return chatEl.lastElementChild; 
}

function setMessageText(msgEl, text) {
  const bubble = msgEl.querySelector('.bubble');
  bubble.textContent = text;
}
function setMessageLoading(msgEl, loading) {
  msgEl.classList.toggle('loading', !!loading);
}

async function sendPrompt(prompt) {
  const userMsg = addMessage('user', prompt);
  const botMsg = addMessage('bot', 'Réflexion en cours…', { loading: true });

  input.value = '';
  input.focus();
  sendBtn.disabled = true;

  try {
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        session_id: sessionId,
        stream: false,
        rag: false
      })
    });

    const data = await res.json();

    if (!res.ok || !data?.success) {
      const detail = data?.error || data?.detail || 'Erreur inconnue';
      setMessageText(botMsg, `${detail}`);
      setMessageLoading(botMsg, false);
      return;
    }

    if (data.session_id && data.session_id !== sessionId) {
      sessionId = data.session_id;
      localStorage.setItem('session_id', sessionId);
    }

    setMessageText(botMsg, data.message || '(réponse vide)');
    setMessageLoading(botMsg, false);
  } catch (err) {
    setMessageText(botMsg, 'Erreur réseau');
    setMessageLoading(botMsg, false);
  } finally {
    sendBtn.disabled = false;
  }
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const prompt = input.value.trim();
  if (!prompt) return;
  sendPrompt(prompt);
});

clearBtn.addEventListener('click', () => {
  if (!confirm('Commencer une nouvelle session ?')) return;
  sessionId = crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
  localStorage.setItem('session_id', sessionId);
  chatEl.innerHTML = '';
  addMessage('bot', 'Nouvelle session initialisée. Posez votre question !');
});

input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    form.requestSubmit();
  }
});
addMessage('bot', 'Bonjour ! Je suis prêt. Posez votre question.');