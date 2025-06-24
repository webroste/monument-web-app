
import { TonConnect } from "@tonconnect/sdk";

const tonConnect = new TonConnect();

document.getElementById('connectBtn').addEventListener('click', async () => {
  await tonConnect.connect();
  const wallet = tonConnect.wallet;
  if (wallet) {
    document.getElementById('walletAddress').innerText = wallet.account.address;
  }
});
