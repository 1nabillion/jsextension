// popup.js

// Получаем элементы из DOM
const extractBtn = document.getElementById('extract');
const downloadBtn = document.getElementById('download');
const clearBtn = document.getElementById('clear');
const listDiv = document.getElementById('list');

// Переменная для текущего URL
let currentUrl = '';

// Функция обновления списка в UI
function refreshList() {
  chrome.storage.local.get({ groups: [] }, data => {
    listDiv.innerHTML = '';
    data.groups.forEach(group => {
      // Заголовок с URL
      const header = document.createElement('div');
      header.innerHTML = `<b>[+] URL: ${group.url}</b>`;
      header.className = 'item';
      listDiv.appendChild(header);
      // Список путей
      group.endpoints.forEach(ep => {
        const div = document.createElement('div');
        div.textContent = ep;
        div.className = 'item';
        listDiv.appendChild(div);
      });
      // Разделитель между группами
      const sep = document.createElement('div');
      sep.style.margin = '8px 0';
      listDiv.appendChild(sep);
    });
  });
}

// Скрипт для извлечения endpoint'ов на странице
const extractScript = () => {
  let text = '';
  try {
    text = document.documentElement.innerText;
  } catch (e) {
    text = '';
  }
  text = text
    .replace(/[^\x00-\x7F]/g, '_')  // заменить не-ASCII
    .replace(/;/g, '\n');            // разбить по точкам с запятой

  const re = /["'](\/[\w\d\?\/&=\#\.\!:_-]*?)["']/g;
  const set = new Set();
  let m;
  while ((m = re.exec(text)) !== null) {
    set.add(m[1]);
  }
  return Array.from(set);
};

// Обработчик кнопки Extract
extractBtn.addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    currentUrl = tabs[0].url;

    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id, allFrames: false },
      func: extractScript
    }, results => {
      const newEndpoints = results[0].result;
      chrome.storage.local.get({ groups: [] }, data => {
        const groups = data.groups;
        // Ищем существующую группу по URL
        const idx = groups.findIndex(g => g.url === currentUrl);
        if (idx === -1) {
          // Новая группа
          groups.push({ url: currentUrl, endpoints: newEndpoints });
        } else {
          // Слияние уникальных endpoint'ов в существующей группе
          const merged = new Set([...groups[idx].endpoints, ...newEndpoints]);
          groups[idx].endpoints = Array.from(merged);
        }
        chrome.storage.local.set({ groups }, refreshList);
      });
    });
  });
});

// Обработчик кнопки Download
downloadBtn.addEventListener('click', () => {
  chrome.storage.local.get({ groups: [] }, data => {
    const lines = [];
    data.groups.forEach(group => {
      lines.push(`[+] URL: ${group.url}`);
      group.endpoints.forEach(ep => lines.push(ep));
      lines.push(''); // пустая строка между группами
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
