
document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  const buttons = document.querySelectorAll("[data-template]");
  let currentImage = new Image();

  buttons.forEach(btn => {
    btn.onclick = () => {
      currentImage.src = btn.getAttribute("data-template");
      currentImage.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(currentImage, 0, 0, 300, 300);
      };
    };
  });

  document.getElementById("saveMonument").onclick = () => {
    const data = {
      image: canvas.toDataURL(),
      price: document.getElementById("priceInput").value
    };
    alert("Памятник сохранен (заглушка). Данные: " + JSON.stringify(data));
  };
});
