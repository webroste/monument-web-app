
document.addEventListener('DOMContentLoaded', () => {
  const designArea = document.getElementById('decorations');
  const emojis = document.querySelectorAll('.draggable');

  emojis.forEach(el => {
    el.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/plain', e.target.innerText);
    });
  });

  designArea.addEventListener('dragover', e => e.preventDefault());
  designArea.addEventListener('drop', e => {
    e.preventDefault();
    const emoji = e.dataTransfer.getData('text');
    const span = document.createElement('span');
    span.innerText = emoji;
    span.classList.add('draggable');
    span.style.position = 'absolute';
    span.style.left = `${e.offsetX}px`;
    span.style.top = `${e.offsetY}px`;
    designArea.appendChild(span);
  });
});

function saveMonument() {
  alert('Monument saved! (Mock - connect to Firebase here)');
}
