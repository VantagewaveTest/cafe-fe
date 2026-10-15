// Shared configuration (no secrets)
window.CAFE_CONFIG = {
  API_BASE: 'http://localhost:5000/api',
  POLL_MS: 3000,
  CANCEL_WINDOW_SEC: 60
};

window.CAFE_API_BASE = window.CAFE_CONFIG.API_BASE;
window.API_BASE = window.CAFE_CONFIG.API_BASE;

// Silent visual message dialog.
window.silentAlert = function (message) {
  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.inset = '0';
  overlay.style.background = 'rgba(0,0,0,0.6)';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.zIndex = '9999';

  const card = document.createElement('div');
  card.style.background = '#ffffff';
  card.style.borderRadius = '1rem';
  card.style.padding = '1.25rem';
  card.style.maxWidth = '44rem';
  card.style.width = '92%';
  card.style.maxHeight = '80vh';
  card.style.overflowY = 'auto';
  card.style.boxShadow = '0 20px 40px rgba(0,0,0,0.25)';

  const text = document.createElement('pre');
  text.style.whiteSpace = 'pre-wrap';
  text.style.wordBreak = 'break-word';
  text.style.margin = '0';
  text.style.fontFamily = 'inherit';
  text.style.color = '#1c1917';
  text.textContent = String(message);

  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = 'OK';
  button.style.marginTop = '1rem';
  button.style.width = '100%';
  button.style.background = '#78350f';
  button.style.color = '#ffffff';
  button.style.fontWeight = '600';
  button.style.borderRadius = '0.625rem';
  button.style.padding = '0.5rem 1rem';
  button.onclick = () => document.body.removeChild(overlay);

  card.appendChild(text);
  card.appendChild(button);
  overlay.appendChild(card);
  document.body.appendChild(overlay);
};

// Silent input dialog.
window.silentPrompt = function (message) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.background = 'rgba(0,0,0,0.6)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '9999';

    const card = document.createElement('div');
    card.style.background = '#ffffff';
    card.style.borderRadius = '1rem';
    card.style.padding = '1.25rem';
    card.style.maxWidth = '32rem';
    card.style.width = '92%';
    card.style.boxShadow = '0 20px 40px rgba(0,0,0,0.25)';

    const label = document.createElement('p');
    label.style.fontWeight = '600';
    label.style.color = '#1c1917';
    label.style.marginBottom = '0.75rem';
    label.textContent = String(message);

    const input = document.createElement('input');
    input.type = 'text';
    input.style.width = '100%';
    input.style.border = '1px solid #d6d3d1';
    input.style.borderRadius = '0.625rem';
    input.style.padding = '0.6rem 0.75rem';

    const actions = document.createElement('div');
    actions.style.display = 'flex';
    actions.style.gap = '0.5rem';
    actions.style.justifyContent = 'flex-end';
    actions.style.marginTop = '1rem';

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.background = '#f5f0e8';
    cancelBtn.style.color = '#1c1917';
    cancelBtn.style.borderRadius = '0.625rem';
    cancelBtn.style.padding = '0.5rem 1rem';

    const confirmBtn = document.createElement('button');
    confirmBtn.type = 'button';
    confirmBtn.textContent = 'Confirm';
    confirmBtn.style.background = '#78350f';
    confirmBtn.style.color = '#ffffff';
    confirmBtn.style.borderRadius = '0.625rem';
    confirmBtn.style.padding = '0.5rem 1rem';

    const cleanup = (value) => {
      document.body.removeChild(overlay);
      resolve(value);
    };

    cancelBtn.onclick = () => cleanup(null);
    confirmBtn.onclick = () => cleanup(input.value.trim());
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') confirmBtn.click();
      if (event.key === 'Escape') cancelBtn.click();
    });

    actions.appendChild(cancelBtn);
    actions.appendChild(confirmBtn);
    card.appendChild(label);
    card.appendChild(input);
    card.appendChild(actions);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    input.focus();
  });
};