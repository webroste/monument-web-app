
window.addEventListener('load', () => {
    const loader = document.getElementById('loader');
    const app = document.getElementById('app');
    setTimeout(() => {
        loader.classList.add('hidden');
        app.classList.remove('hidden');
    }, 1000);
});

const samples = ['Sample 1', 'Sample 2', 'Sample 3'];
let current = 0;
const sampleEl = document.getElementById('monumentSample');
document.getElementById('prevSample').onclick = () => {
    current = (current + samples.length - 1) % samples.length;
    sampleEl.textContent = samples[current];
};
document.getElementById('nextSample').onclick = () => {
    current = (current + 1) % samples.length;
    sampleEl.textContent = samples[current];
};
document.getElementById('connectWalletBtn').onclick = () => {
    alert('Кошелек пока не подключен. Это пример.');
};
document.getElementById('generateBtn').onclick = () => {
    const emoji = ['🪦', '⚰️', '🕯️', '💐'];
    const random = emoji[Math.floor(Math.random() * emoji.length)];
    sampleEl.textContent = `🎲 ${random} Random Monument`;
};
