
document.getElementById("connectWallet").addEventListener("click", () => {
  alert("Simulating wallet connection...");
});

document.getElementById("publish").addEventListener("click", () => {
  const price = document.getElementById("priceInput").value;
  const style = document.getElementById("styleSelector").value;
  alert("Monument published!\nStyle: " + style + "\nPrice: " + price + " TON");
});
