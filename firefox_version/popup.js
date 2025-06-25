// popup.js (Firefox-friendly)

// Получаем элементы из DOM
const extractBtn = document.getElementById('extract');
const downloadBtn = document.getElementById('download');
const clearBtn = document.getElementById('clear');
const listDiv = document.getElementById('list');

let currentUrl = '';

// Отображение сохранённых групп
function refreshList() {
  chrome.storage.local.get({ groups: [] }, data => {
    listDiv.innerHTML = '';
    data.groups.forEach(group => {
      const header = document.createElement('div');
      header.innerHTML = `<b>[+] URL: ${group.url}</b>`;
      header.className = 'item';
      listDiv.appendChild(header);

      group.endpoints.forEach(ep => {
        const div = document.createElement('div');
        div.textContent = ep;
        div.className = 'item';
        listDiv.appendChild(div);
      });

      listDiv.appendChild(document.createElement('br'));
    });
  });
}

// Код для извлечения endpoint'ов, как строка
const extractScriptCode = `
(() => {
  let text = '';
  try { text = document.documentElement.innerText; } catch(e) { text = ''; }
  text = text
    .replace(/[^\\x00-\\x7F]/g, '_')
    .replace(/;/g, '\\n');
  const re = /["'](\\/[\\w\\d\\?\\/&=\\#\\.\\!:_-]*?)["']/g;
  const set = new Set();
  let m;
  while ((m = re.exec(text)) !== null) {
    set.add(m[1]);
  }
  Array.from(set);
  return Array.from(set);
})()
`;

// Обработчик кнопки Extract
extractBtn.addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    currentUrl = tabs[0].url;

    chrome.tabs.executeScript(
      tabs[0].id,
      { code: extractScriptCode },
      results => {
        const newEndpoints = results[0] || [];
        chrome.storage.local.get({ groups: [] }, data => {
          const groups = data.groups;
          const idx = groups.findIndex(g => g.url === currentUrl);
          if (idx === -1) {
            groups.push({ url: currentUrl, endpoints: newEndpoints });
          } else {
            const merged = new Set([...groups[idx].endpoints, ...newEndpoints]);
            groups[idx].endpoints = Array.from(merged);
          }
          chrome.storage.local.set({ groups }, refreshList);
        });
      }
    );
  });
});

// Обработчик кнопки Download
downloadBtn.addEventListener('click', () => {
  chrome.storage.local.get({ groups: [] }, data => {
    const lines = [];
    data.groups.forEach(group => {
      lines.push(`[+] URL: ${group.url}`);
      group.endpoints.forEach(ep => lines.push(ep));
      lines.push('');
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'endpoints.txt';
    a.click();
    URL.revokeObjectURL(url);
  });
});

// Обработчик кнопки Clear
clearBtn.addEventListener('click', () => {
  chrome.storage.local.set({ groups: [] }, refreshList);
});

// Инициализация списка при открытии popup
refreshList();
